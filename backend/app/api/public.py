from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_optional_user
from app.models.models import Case, Evidence, CaseStatus, VisibilityStatus, VerificationStatus, SourceType, User
from app.schemas.schemas import PublicSightingCreate, EvidenceOut
from app.services.ai_service import ai_provider
from app.services.evidence_fusion import evidence_fusion_engine

router = APIRouter(prefix="/public", tags=["Public"])

@router.post("/cases/{case_id}/report", response_model=EvidenceOut, status_code=status.HTTP_201_CREATED)
def submit_public_sighting(
    case_id: str,
    sighting: PublicSightingCreate,
    current_user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Public sighting intake endpoint.
    Creates an unverified PENDING civilian report.
    """
    case = db.query(Case).filter(
        (Case.id == case_id) | (Case.case_number == case_id)
    ).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    if case.status in [CaseStatus.FOUND, CaseStatus.CLOSED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Public sighting reporting is closed for this resolved case."
        )

    features = ai_provider.extract_features(sighting.title, sighting.raw_description, sighting.file_url)

    # Resolve submitter id if authenticated
    submitter_id = current_user.id if current_user else None

    raw_desc = sighting.raw_description
    if sighting.contact_info:
        raw_desc = f"{raw_desc} [Contact: {sighting.contact_info}]"

    new_ev = Evidence(
        case_id=case.id,
        source_type=sighting.source_type or SourceType.CIVILIAN_REPORT,
        title=sighting.title.strip(),
        raw_description=raw_desc.strip(),
        file_url=sighting.file_url,
        timestamp=sighting.timestamp,
        latitude=sighting.latitude,
        longitude=sighting.longitude,
        direction=sighting.direction or features.direction,
        extracted_features=features.model_dump(),
        source_reliability=0.65,
        timestamp_reliability=0.75,
        location_precision=0.80,
        visual_similarity=features.visual_similarity or 0.50,
        corroboration_score=0.50,
        overall_confidence=50.0,
        verification_status=VerificationStatus.PENDING,
        submitted_by=submitter_id
    )

    new_ev.overall_confidence = evidence_fusion_engine.calculate_evidence_score(new_ev)

    db.add(new_ev)
    db.commit()
    db.refresh(new_ev)
    return new_ev
