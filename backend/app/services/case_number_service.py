from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Case

def generate_next_case_number(db: Session) -> str:
    """
    Generates a collision-safe sequential case number format: TRC-YYYY-XXX (e.g. TRC-2026-001)
    Calculated server-side within the database transaction.
    """
    current_year = datetime.utcnow().year
    prefix = f"TRC-{current_year}-"

    # Count existing cases with this year's prefix
    existing_count = db.query(func.count(Case.id)).filter(
        Case.case_number.like(f"{prefix}%")
    ).scalar() or 0

    next_seq = existing_count + 1

    # Check for potential collision and increment if exists
    candidate = f"{prefix}{next_seq:03d}"
    while db.query(Case.id).filter(Case.case_number == candidate).first():
        next_seq += 1
        candidate = f"{prefix}{next_seq:03d}"

    return candidate
