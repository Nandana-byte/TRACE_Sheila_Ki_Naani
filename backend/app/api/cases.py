from typing import List, Optional, Union
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, get_optional_user, require_police
from app.models.models import Case, CaseStatus, VisibilityStatus, User, UserRole
from app.schemas.schemas import CaseCreate, CaseOut, SanitizedCaseOut
from app.services.case_number_service import generate_next_case_number

router = APIRouter(tags=["Cases"])

@router.get("/cases", response_model=List[CaseOut])
def list_cases(
    status_filter: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Lists missing-person cases.
    - Police: Can access all cases across statuses.
    - Civilian / Public: Can ONLY access ACTIVE, PUBLIC cases.
    """
    query = db.query(Case)

    is_police = current_user is not None and current_user.role == UserRole.POLICE

    if not is_police:
        query = query.filter(
            Case.status == CaseStatus.ACTIVE,
            Case.visibility_status == VisibilityStatus.PUBLIC
        )
    elif status_filter:
        query = query.filter(Case.status == status_filter)

    return query.order_by(Case.created_at.desc()).all()

@router.post("/cases", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
def create_case(
    case_in: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new missing-person case.
    - Server-side collision-safe case number generation (TRC-YYYY-XXX).
    - created_by derived strictly from authenticated user.
    """
    case_number = generate_next_case_number(db)

    new_case = Case(
        case_number=case_number,
        missing_person_name=case_in.missing_person_name.strip(),
        age=case_in.age,
        gender=case_in.gender or "Unknown",
        description=case_in.description or "",
        clothing_description=case_in.clothing_description or "",
        photo_url=case_in.photo_url,
        last_seen_location=case_in.last_seen_location.strip(),
        last_seen_lat=case_in.last_seen_lat,
        last_seen_lng=case_in.last_seen_lng,
        last_seen_time=case_in.last_seen_time,
        status=CaseStatus.ACTIVE,
        visibility_status=VisibilityStatus.PUBLIC,
        created_by=current_user.id
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return new_case

@router.get("/cases/{case_id}", response_model=Union[CaseOut, SanitizedCaseOut])
def get_case(
    case_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Retrieves case details.
    Critical Security & Privacy Boundary:
    - If case is FOUND or HIDDEN and caller is NOT police, sensitive details are completely sanitized.
    """
    case = db.query(Case).filter(
        (Case.id == case_id) | (Case.case_number == case_id)
    ).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    is_police = current_user is not None and current_user.role == UserRole.POLICE

    # Check case privacy and status
    if (case.status == CaseStatus.FOUND or case.visibility_status == VisibilityStatus.HIDDEN):
        if not is_police:
            return SanitizedCaseOut(
                id=case.id,
                case_number=case.case_number,
                status=case.status,
                visibility_status=case.visibility_status,
                is_closed=True,
                message="This case has been closed. Sensitive case information is no longer publicly available.",
                found_at=case.found_at,
                closed_at=case.closed_at
            )

    return case

@router.post("/cases/{case_id}/mark-found", response_model=CaseOut)
def mark_person_found(
    case_id: str,
    current_user: User = Depends(require_police),
    db: Session = Depends(get_db)
):
    """
    Police authority action: Marks missing person as FOUND.
    Atomic transaction:
      - status = FOUND
      - visibility_status = HIDDEN
      - found_at = current timestamp
    Police retains full historical records; civilian public view is immediately revoked.
    """
    case = db.query(Case).filter(
        (Case.id == case_id) | (Case.case_number == case_id)
    ).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    case.status = CaseStatus.FOUND
    case.visibility_status = VisibilityStatus.HIDDEN
    case.found_at = datetime.utcnow()
    case.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(case)
    return case

@router.get("/me/cases", response_model=List[CaseOut])
def get_my_cases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns cases filed by the authenticated user.
    """
    cases = db.query(Case).filter(Case.created_by == current_user.id).order_by(Case.created_at.desc()).all()
    return cases
