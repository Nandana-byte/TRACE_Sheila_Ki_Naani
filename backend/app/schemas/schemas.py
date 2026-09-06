from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, ConfigDict, Field
from app.models.models import (
    UserRole, CaseStatus, VisibilityStatus, SourceType,
    VerificationStatus, RelationshipType
)

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    auth_user_id: str
    email: str
    role: UserRole
    created_at: datetime

class LoginRequest(BaseModel):
    email: str
    password: str
    role: Optional[UserRole] = None

class LoginResponse(BaseModel):
    user_id: str
    email: str
    role: str
    token: str

class AIExtractedFeatures(BaseModel):
    person_description: Optional[str] = None
    clothing: List[str] = Field(default_factory=list)
    objects: List[str] = Field(default_factory=list)
    direction: Optional[str] = None
    location_name: Optional[str] = None
    timestamp: Optional[str] = None
    confidence: float = 0.80
    visual_similarity: Optional[float] = 0.75
    raw_ai_notes: Optional[str] = None

class CaseCreate(BaseModel):
    missing_person_name: str
    age: int
    gender: Optional[str] = "Unknown"
    description: Optional[str] = ""
    clothing_description: Optional[str] = ""
    photo_url: Optional[str] = None
    last_seen_location: str
    last_seen_lat: float
    last_seen_lng: float
    last_seen_time: datetime

class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    case_number: str
    missing_person_name: str
    age: int
    gender: Optional[str] = None
    description: Optional[str] = None
    clothing_description: Optional[str] = None
    photo_url: Optional[str] = None
    last_seen_location: str
    last_seen_lat: float
    last_seen_lng: float
    last_seen_time: datetime
    status: CaseStatus
    visibility_status: VisibilityStatus
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    found_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

class SanitizedCaseOut(BaseModel):
    """
    Sanitized civilian-facing response when a case is marked FOUND / HIDDEN.
    Strictly strips missing person's profile, clothing, photos, and evidence coordinates.
    """
    id: str
    case_number: str
    status: CaseStatus
    visibility_status: VisibilityStatus
    is_closed: bool = True
    message: str = "This case has been closed. Sensitive case information is no longer publicly available."
    found_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

class EvidenceCreate(BaseModel):
    source_type: SourceType = SourceType.POLICE_REPORT
    title: str
    raw_description: str
    file_url: Optional[str] = None
    timestamp: datetime
    latitude: float
    longitude: float
    direction: Optional[str] = None

class PublicSightingCreate(BaseModel):
    source_type: SourceType = SourceType.CIVILIAN_REPORT
    title: str
    raw_description: str
    file_url: Optional[str] = None
    timestamp: datetime
    latitude: float
    longitude: float
    direction: Optional[str] = None
    contact_info: Optional[str] = None

class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    case_id: str
    source_type: SourceType
    title: str
    raw_description: str
    file_url: Optional[str] = None
    timestamp: datetime
    latitude: float
    longitude: float
    direction: Optional[str] = None
    extracted_features: Optional[Dict[str, Any]] = None
    source_reliability: float
    timestamp_reliability: float
    location_precision: float
    visual_similarity: float
    corroboration_score: float
    overall_confidence: float
    verification_status: VerificationStatus
    submitted_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class RelationshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    source_evidence_id: str
    target_evidence_id: str
    relationship_type: RelationshipType
    confidence: float
    explanation: str
    created_at: datetime

class TrajectoryPointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    case_id: str
    evidence_id: Optional[str] = None
    sequence_number: int
    latitude: float
    longitude: float
    timestamp: datetime
    confidence: float
    distance_from_prev_m: Optional[float] = None
    time_diff_prev_sec: Optional[float] = None
    estimated_speed_m_s: Optional[float] = None
    is_physically_plausible: bool = True
    explanation: Optional[str] = None

class SearchZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    case_id: str
    name: str
    latitude: float
    longitude: float
    radius: float
    score: float
    rank: int
    explanation: str
    created_at: datetime

class HighValueInformation(BaseModel):
    gap_type: str
    recommendation: str
    target_time_window: Optional[str] = None
    target_spatial_segment: Optional[str] = None
    explanation: str

class AnalysisRunResult(BaseModel):
    overall_trace_confidence: float
    evidence_analyzed_count: int
    independent_sources_count: int
    trajectory_consistency: str
    trajectory: List[TrajectoryPointOut]
    search_zones: List[SearchZoneOut]
    relationships: List[RelationshipOut]
    ai_insight: str
    high_value_clue: HighValueInformation
    latest_analysis_timestamp: str

class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    data: Dict[str, Any]

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str
    type: str
    confidence: float

class IntelligenceGraphOut(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
