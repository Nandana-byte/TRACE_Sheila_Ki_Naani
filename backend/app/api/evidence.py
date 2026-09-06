from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_police
from app.models.models import Case, Evidence, CaseStatus, VisibilityStatus, VerificationStatus, SourceType, User, UserRole
from app.schemas.schemas import EvidenceCreate, EvidenceOut
from app.services.ai_service import ai_provider
from app.services.evidence_fusion import evidence_fusion_engine

router = APIRouter(tags=["Evidence"])

@router.get("/cases/{case_id}/evidence", response_model=List[EvidenceOut])
def get_case_evidence(
    case_id: str,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves evidence items for a case.
    - Police: Can access all evidence across statuses (pending, verified, rejected).
    - Civilian: Can access verified evidence only, plus any reports they personally submitted.
    """
    case = db.query(Case).filter(
        (Case.id == case_id) | (Case.case_number == case_id)
    ).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    query = db.query(Evidence).filter(Evidence.case_id == case.id)

    if current_user.role != UserRole.POLICE:
        # Civilians cannot access rejected evidence or other civilians' pending reports
        query = query.filter(
            (Evidence.verification_status == VerificationStatus.VERIFIED) |
            (Evidence.submitted_by == current_user.id)
        )

    if status_filter:
        query = query.filter(Evidence.verification_status == status_filter)

    return query.order_by(Evidence.timestamp.asc()).all()

@router.post("/cases/{case_id}/evidence", response_model=EvidenceOut, status_code=status.HTTP_201_CREATED)
def submit_evidence(
    case_id: str,
    ev_in: EvidenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submits evidence clue.
    - Police submission: Defaults to VERIFIED status with high source reliability.
    - Civilian submission: Enforced as CIVILIAN_REPORT with PENDING status for police review.
    - submitted_by derived strictly from authenticated user.
    """
    case = db.query(Case).filter(
        (Case.id == case_id) | (Case.case_number == case_id)
    ).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.status in [CaseStatus.FOUND, CaseStatus.CLOSED] and current_user.role != UserRole.POLICE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Public sighting submissions are closed for this resolved case."
        )

    # Multimodal feature extraction via AIProvider
    features = ai_provider.extract_features(ev_in.title, ev_in.raw_description, ev_in.file_url)

    is_police = current_user.role == UserRole.POLICE

    source_type = ev_in.source_type if is_police else SourceType.CIVILIAN_REPORT
    initial_status = VerificationStatus.VERIFIED if is_police else VerificationStatus.PENDING

    source_rel = 0.85 if is_police else 0.65
    time_rel = 0.85 if is_police else 0.75
    loc_prec = 0.85 if is_police else 0.80

    new_ev = Evidence(
        case_id=case.id,
        source_type=source_type,
        title=ev_in.title.strip(),
        raw_description=ev_in.raw_description.strip(),
        file_url=ev_in.file_url,
        timestamp=ev_in.timestamp,
        latitude=ev_in.latitude,
        longitude=ev_in.longitude,
        direction=ev_in.direction or features.direction,
        extracted_features=features.model_dump(),
        source_reliability=source_rel,
        timestamp_reliability=time_rel,
        location_precision=loc_prec,
        visual_similarity=features.visual_similarity or 0.50,
        corroboration_score=0.50,
        overall_confidence=50.0,
        verification_status=initial_status,
        submitted_by=current_user.id
    )

    # Initial confidence calculation
    new_ev.overall_confidence = evidence_fusion_engine.calculate_evidence_score(new_ev)

    db.add(new_ev)
    db.commit()
    db.refresh(new_ev)
    return new_ev

@router.post("/evidence/{evidence_id}/approve", response_model=EvidenceOut)
def approve_evidence(
    evidence_id: str,
    current_user: User = Depends(require_police),
    db: Session = Depends(get_db)
):
    """
    Police authority action: Approves pending civilian report.
    Changes status to VERIFIED.
    """
    ev = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")

    ev.verification_status = VerificationStatus.VERIFIED
    ev.corroboration_score = max(ev.corroboration_score or 0.5, 0.75)
    ev.overall_confidence = evidence_fusion_engine.calculate_evidence_score(ev, 0.15)
    ev.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(ev)
    return ev

@router.post("/evidence/{evidence_id}/reject", response_model=EvidenceOut)
def reject_evidence(
    evidence_id: str,
    current_user: User = Depends(require_police),
    db: Session = Depends(get_db)
):
    """
    Police authority action: Rejects civilian report.
    Changes status to REJECTED.
    """
    ev = db.query(Evidence).filter(Evidence.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")

    ev.verification_status = VerificationStatus.REJECTED
    ev.overall_confidence = 10.0
    ev.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(ev)
    return ev

@router.get("/me/reports", response_model=List[EvidenceOut])
def get_my_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all sighting reports submitted by the authenticated civilian,
    allowing real-time verification status tracking (PENDING -> VERIFIED/REJECTED).
    """
    reports = db.query(Evidence).filter(
        Evidence.submitted_by == current_user.id
    ).order_by(Evidence.created_at.desc()).all()
    return reports
