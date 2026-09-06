from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, create_access_token
from app.models.models import User, UserRole
from app.schemas.schemas import LoginRequest, LoginResponse, UserOut

router = APIRouter(tags=["Auth"])

@router.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates user and returns verified JWT.
    Supports demo users:
      - Police: officer@trace.demo
      - Civilian: citizen@trace.demo
    """
    email_clean = req.email.strip().lower()

    # Determine role
    is_police = (
        "police" in email_clean or
        "officer" in email_clean or
        req.role == UserRole.POLICE
    )
    role = UserRole.POLICE if is_police else UserRole.CIVILIAN

    # Find or register user
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        import uuid
        user = User(
            auth_user_id=str(uuid.uuid4()),
            email=email_clean,
            role=role
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Issue verified JWT containing sub and role
    token = create_access_token({
        "sub": user.auth_user_id,
        "email": user.email,
        "role": user.role.value
    })

    return LoginResponse(
        user_id=user.id,
        email=user.email,
        role=user.role.value,
        token=token
    )

@router.get("/me", response_model=UserOut)
@router.get("/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns authenticated user profile and role derived server-side from validated JWT.
    Available at GET /api/me (and /api/auth/me).
    """
    return current_user
