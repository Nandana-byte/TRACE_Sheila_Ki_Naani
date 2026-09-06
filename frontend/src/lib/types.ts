export type UserRole = 'POLICE' | 'CIVILIAN';
export type CaseStatus = 'ACTIVE' | 'FOUND' | 'CLOSED';
export type VisibilityStatus = 'PUBLIC' | 'RESTRICTED' | 'HIDDEN';

export type SourceType =
  | 'CCTV'
  | 'WITNESS'
  | 'PHOTO'
  | 'SOCIAL_MEDIA'
  | 'PHONE'
  | 'PUBLIC_TRANSPORT'
  | 'POLICE_REPORT'
  | 'VOLUNTEER'
  | 'HOSPITAL'
  | 'CIVILIAN_REPORT';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export type RelationshipType =
  | 'SUPPORTS'
  | 'CORROBORATES'
  | 'CONTRADICTS'
  | 'TEMPORALLY_FOLLOWS'
  | 'SPATIALLY_FOLLOWS';

export interface User {
  id: string;
  auth_user_id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface AIExtractedFeatures {
  person_description?: string;
  clothing: string[];
  objects: string[];
  direction?: string;
  location_name?: string;
  timestamp?: string;
  confidence: number;
  visual_similarity?: number;
  raw_ai_notes?: string;
}

export interface Evidence {
  id: string;
  case_id: string;
  source_type: SourceType;
  title: string;
  raw_description: string;
  file_url?: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  direction?: string;
  extracted_features?: AIExtractedFeatures;
  source_reliability: number;
  timestamp_reliability: number;
  location_precision: number;
  visual_similarity: number;
  corroboration_score: number;
  overall_confidence: number;
  verification_status: VerificationStatus;
  submitted_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface Case {
  id: string;
  case_number: string;
  missing_person_name: string;
  age: number;
  gender?: string;
  description?: string;
  clothing_description?: string;
  photo_url?: string;
  last_seen_location: string;
  last_seen_lat: number;
  last_seen_lng: number;
  last_seen_time: string;
  status: CaseStatus;
  visibility_status: VisibilityStatus;
  created_by?: string;
  created_at: string;
  updated_at: string;
  found_at?: string;
  closed_at?: string;
  is_closed?: boolean;
  message?: string;
  evidences?: Evidence[];
}

export interface TrajectoryPoint {
  id: string;
  case_id: string;
  evidence_id?: string;
  sequence_number: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  confidence: number;
  distance_from_prev_m?: number;
  time_diff_prev_sec?: number;
  estimated_speed_m_s?: number;
  is_physically_plausible?: boolean;
  explanation?: string;
}

export interface SearchZone {
  id: string;
  case_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  score: number;
  rank: number;
  explanation: string;
  created_at: string;
}

export interface Relationship {
  id: string;
  source_evidence_id: string;
  target_evidence_id: string;
  relationship_type: RelationshipType;
  confidence: number;
  explanation: string;
  created_at: string;
}

export interface HighValueInformation {
  gap_type: string;
  recommendation: string;
  target_time_window?: string;
  target_spatial_segment?: string;
  explanation: string;
}

export interface AnalysisRunResult {
  overall_trace_confidence: number;
  evidence_analyzed_count: number;
  independent_sources_count: number;
  trajectory_consistency: string;
  trajectory: TrajectoryPoint[];
  search_zones: SearchZone[];
  relationships: Relationship[];
  ai_insight: string;
  high_value_clue: HighValueInformation;
  latest_analysis_timestamp: string;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  data: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: string;
  confidence: number;
}

export interface IntelligenceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
