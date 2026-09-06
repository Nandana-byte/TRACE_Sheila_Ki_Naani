import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Enum, JSON, ForeignKey, Text, Boolean, Index
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class UserRole(str, enum.Enum):
    POLICE = "POLICE"
    CIVILIAN = "CIVILIAN"

class CaseStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    FOUND = "FOUND"
    CLOSED = "CLOSED"

class VisibilityStatus(str, enum.Enum):
    PUBLIC = "PUBLIC"
    RESTRICTED = "RESTRICTED"
    HIDDEN = "HIDDEN"

class SourceType(str, enum.Enum):
    CCTV = "CCTV"
    WITNESS = "WITNESS"
    PHOTO = "PHOTO"
    SOCIAL_MEDIA = "SOCIAL_MEDIA"
    PHONE = "PHONE"
    PUBLIC_TRANSPORT = "PUBLIC_TRANSPORT"
    POLICE_REPORT = "POLICE_REPORT"
    VOLUNTEER = "VOLUNTEER"
    HOSPITAL = "HOSPITAL"
    CIVILIAN_REPORT = "CIVILIAN_REPORT"

class VerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class RelationshipType(str, enum.Enum):
    SUPPORTS = "SUPPORTS"
    CORROBORATES = "CORROBORATES"
    CONTRADICTS = "CONTRADICTS"
    TEMPORALLY_FOLLOWS = "TEMPORALLY_FOLLOWS"
    SPATIALLY_FOLLOWS = "SPATIALLY_FOLLOWS"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    auth_user_id = Column(String(36), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CIVILIAN, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    cases_created = relationship("Case", back_populates="creator", foreign_keys="Case.created_by")
    evidences_submitted = relationship("Evidence", back_populates="submitter", foreign_keys="Evidence.submitted_by")

class Case(Base):
    __tablename__ = "cases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_number = Column(String(64), unique=True, index=True, nullable=False)
    missing_person_name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(32), nullable=True)
    description = Column(Text, nullable=True)
    clothing_description = Column(Text, nullable=True)
    photo_url = Column(String(1024), nullable=True)
    last_seen_location = Column(String(255), nullable=False)
    last_seen_lat = Column(Float, nullable=False)
    last_seen_lng = Column(Float, nullable=False)
    last_seen_time = Column(DateTime, nullable=False, index=True)
    status = Column(Enum(CaseStatus), default=CaseStatus.ACTIVE, nullable=False, index=True)
    visibility_status = Column(Enum(VisibilityStatus), default=VisibilityStatus.PUBLIC, nullable=False, index=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    found_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    creator = relationship("User", back_populates="cases_created", foreign_keys=[created_by])
    evidences = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    trajectory_points = relationship("TrajectoryPoint", back_populates="case", cascade="all, delete-orphan")
    search_zones = relationship("SearchZone", back_populates="case", cascade="all, delete-orphan")
    analysis_runs = relationship("AnalysisRun", back_populates="case", cascade="all, delete-orphan")

class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type = Column(Enum(SourceType), nullable=False)
    title = Column(String(255), nullable=False)
    raw_description = Column(Text, nullable=False)
    file_url = Column(String(1024), nullable=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    direction = Column(String(255), nullable=True)
    extracted_features = Column(JSON, nullable=True)
    source_reliability = Column(Float, default=0.70)
    timestamp_reliability = Column(Float, default=0.80)
    location_precision = Column(Float, default=0.80)
    visual_similarity = Column(Float, default=0.50)
    corroboration_score = Column(Float, default=0.50)
    overall_confidence = Column(Float, default=50.0)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING, nullable=False, index=True)
    submitted_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    case = relationship("Case", back_populates="evidences")
    submitter = relationship("User", back_populates="evidences_submitted", foreign_keys=[submitted_by])

class EvidenceRelationship(Base):
    __tablename__ = "evidence_relationships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False, index=True)
    target_evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False, index=True)
    relationship_type = Column(Enum(RelationshipType), nullable=False)
    confidence = Column(Float, default=0.80)
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class TrajectoryPoint(Base):
    __tablename__ = "trajectory_points"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_id = Column(String(36), ForeignKey("evidence.id", ondelete="SET NULL"), nullable=True)
    sequence_number = Column(Integer, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    confidence = Column(Float, default=0.80)
    distance_from_prev_m = Column(Float, nullable=True)
    time_diff_prev_sec = Column(Float, nullable=True)
    estimated_speed_m_s = Column(Float, nullable=True)
    is_physically_plausible = Column(Boolean, default=True)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("Case", back_populates="trajectory_points")

class SearchZone(Base):
    __tablename__ = "search_zones"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    radius = Column(Float, default=300.0)  # in meters
    score = Column(Float, nullable=False)   # 0 - 100 Search Priority
    rank = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("Case", back_populates="search_zones")

class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    algorithm_version = Column(String(64), default="1.2.0")
    result = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("Case", back_populates="analysis_runs")
