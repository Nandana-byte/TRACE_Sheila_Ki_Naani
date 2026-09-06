import json
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.models import (
    Case, Evidence, CaseStatus, VisibilityStatus, SourceType,
    VerificationStatus, User, UserRole, EvidenceRelationship,
    TrajectoryPoint, SearchZone, AnalysisRun
)
from app.services.evidence_fusion import evidence_fusion_engine
from app.services.trajectory import trajectory_engine
from app.services.search_optimizer import search_optimizer_engine
from app.services.information_gain import information_gain_engine

def seed_demo_data(db: Session) -> Case:
    """
    Seeds authoritative demonstration data:
    1. Demo Users (officer@trace.demo, citizen@trace.demo)
    2. Demonstration Case: Ananya Sharma (TRC-2026-001)
    3. Initial 5 Verified Clues
    4. Auto-calculates initial Trajectory, Search Priorities, and Analysis
    """
    # 1. Seed Demo Users
    police_user = db.query(User).filter(User.email == "officer@trace.demo").first()
    if not police_user:
        police_user = User(
            auth_user_id="00000000-0000-0000-0000-000000000001",
            email="officer@trace.demo",
            role=UserRole.POLICE
        )
        db.add(police_user)
        db.commit()
        db.refresh(police_user)

    civilian_user = db.query(User).filter(User.email == "citizen@trace.demo").first()
    if not civilian_user:
        civilian_user = User(
            auth_user_id="00000000-0000-0000-0000-000000000002",
            email="citizen@trace.demo",
            role=UserRole.CIVILIAN
        )
        db.add(civilian_user)
        db.commit()
        db.refresh(civilian_user)

    # 2. Check existing demo case
    existing_case = db.query(Case).filter(Case.case_number == "TRC-2026-001").first()
    if not existing_case:
        # Check legacy number if any
        existing_case = db.query(Case).filter(Case.case_number == "TRACE-2026-0891").first()
        if existing_case:
            existing_case.case_number = "TRC-2026-001"
            db.commit()

    if existing_case:
        return existing_case

    # 3. Create Demo Case: Ananya Sharma
    case_time = datetime(2026, 9, 5, 17, 45, 0)
    demo_case = Case(
        case_number="TRC-2026-001",
        missing_person_name="Ananya Sharma",
        age=14,
        gender="Female",
        description="Teenager, height 5'2\", brown hair, last seen at Vellore Bus Stand.",
        clothing_description="Blue shirt / school top, dark trousers, carrying black backpack.",
        photo_url="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
        last_seen_location="Vellore Bus Stand",
        last_seen_lat=12.9260,
        last_seen_lng=79.1340,
        last_seen_time=case_time,
        status=CaseStatus.ACTIVE,
        visibility_status=VisibilityStatus.PUBLIC,
        created_by=civilian_user.id
    )
    db.add(demo_case)
    db.commit()
    db.refresh(demo_case)

    # 4. Add Initial Verified Clues
    clues_data = [
        {
            "source_type": SourceType.POLICE_REPORT,
            "title": "Initial Family Report — Bus Stand",
            "raw_description": "Family reported Ananya missing at 17:45 from Vellore Bus Stand main waiting hall. Wearing blue school top and black trousers.",
            "timestamp": datetime(2026, 9, 5, 17, 45, 0),
            "latitude": 12.9260,
            "longitude": 79.1340,
            "direction": "Unknown",
            "source_reliability": 0.95,
            "timestamp_reliability": 0.95,
            "location_precision": 0.95,
            "visual_similarity": 0.90,
            "corroboration_score": 0.85,
            "verification_status": VerificationStatus.VERIFIED,
            "submitted_by": police_user.id,
            "extracted_features": {
                "person_description": "14-year-old female",
                "clothing": ["blue shirt", "black trousers"],
                "objects": ["black backpack"],
                "direction": "Unknown"
            }
        },
        {
            "source_type": SourceType.CCTV,
            "title": "CCTV Footage — Bus Stand Road",
            "raw_description": "CCTV camera #04 at Bus Stand Road captured subject matching description walking east toward Railway Road.",
            "timestamp": datetime(2026, 9, 5, 18, 3, 0),
            "latitude": 12.9252,
            "longitude": 79.1348,
            "direction": "heading east toward Railway Road",
            "source_reliability": 0.90,
            "timestamp_reliability": 0.90,
            "location_precision": 0.90,
            "visual_similarity": 0.85,
            "corroboration_score": 0.80,
            "verification_status": VerificationStatus.VERIFIED,
            "submitted_by": police_user.id,
            "extracted_features": {
                "person_description": "Female matching profile",
                "clothing": ["blue top"],
                "objects": ["black backpack"],
                "direction": "east toward Railway Road"
            }
        },
        {
            "source_type": SourceType.WITNESS,
            "title": "Witness Report — Railway Road",
            "raw_description": "Shopkeeper on Railway Road observed girl in blue shirt walking briskly toward Railway Station.",
            "timestamp": datetime(2026, 9, 5, 18, 8, 0),
            "latitude": 12.9250,
            "longitude": 79.1352,
            "direction": "moving toward Railway Station",
            "source_reliability": 0.75,
            "timestamp_reliability": 0.80,
            "location_precision": 0.85,
            "visual_similarity": 0.70,
            "corroboration_score": 0.85,
            "verification_status": VerificationStatus.VERIFIED,
            "submitted_by": police_user.id,
            "extracted_features": {
                "person_description": "Young girl brisk walking",
                "clothing": ["blue shirt"],
                "objects": [],
                "direction": "toward Railway Station"
            }
        },
        {
            "source_type": SourceType.PHOTO,
            "title": "Social Media Photo — Railway Road",
            "raw_description": "Public post showing crowd at Railway Road with girl in blue top visible in background.",
            "timestamp": datetime(2026, 9, 5, 18, 14, 0),
            "latitude": 12.9249,
            "longitude": 79.1354,
            "direction": "north-east along Railway Road",
            "source_reliability": 0.80,
            "timestamp_reliability": 0.85,
            "location_precision": 0.85,
            "visual_similarity": 0.88,
            "corroboration_score": 0.90,
            "verification_status": VerificationStatus.VERIFIED,
            "submitted_by": police_user.id,
            "extracted_features": {
                "person_description": "Background profile match",
                "clothing": ["blue top", "dark trousers"],
                "objects": ["black backpack"],
                "direction": "Railway Road"
            }
        },
        {
            "source_type": SourceType.WITNESS,
            "title": "Independent Witness — Railway Station",
            "raw_description": "Auto-rickshaw driver outside Railway Station saw girl in blue shirt enter platform entrance #1.",
            "timestamp": datetime(2026, 9, 5, 18, 19, 0),
            "latitude": 12.9248,
            "longitude": 79.1360,
            "direction": "entering Railway Station platform",
            "source_reliability": 0.80,
            "timestamp_reliability": 0.85,
            "location_precision": 0.90,
            "visual_similarity": 0.75,
            "corroboration_score": 0.92,
            "verification_status": VerificationStatus.VERIFIED,
            "submitted_by": police_user.id,
            "extracted_features": {
                "person_description": "Female entering station",
                "clothing": ["blue shirt"],
                "objects": ["backpack"],
                "direction": "entering station platform 1"
            }
        }
    ]

    ev_instances = []
    for c in clues_data:
        ev = Evidence(
            case_id=demo_case.id,
            source_type=c["source_type"],
            title=c["title"],
            raw_description=c["raw_description"],
            timestamp=c["timestamp"],
            latitude=c["latitude"],
            longitude=c["longitude"],
            direction=c["direction"],
            extracted_features=c["extracted_features"],
            source_reliability=c["source_reliability"],
            timestamp_reliability=c["timestamp_reliability"],
            location_precision=c["location_precision"],
            visual_similarity=c["visual_similarity"],
            corroboration_score=c["corroboration_score"],
            overall_confidence=85.0,
            verification_status=c["verification_status"],
            submitted_by=c["submitted_by"]
        )
        db.add(ev)
        ev_instances.append(ev)

    db.commit()

    # 5. Populate initial Trajectory & Search Zones
    trajectory_points = trajectory_engine.calculate_trajectory(
        origin_lat=demo_case.last_seen_lat,
        origin_lng=demo_case.last_seen_lng,
        origin_time=demo_case.last_seen_time,
        verified_evidences=ev_instances
    )

    for pt in trajectory_points:
        tp = TrajectoryPoint(
            case_id=demo_case.id,
            evidence_id=pt["evidence_id"],
            sequence_number=pt["sequence_number"],
            latitude=pt["latitude"],
            longitude=pt["longitude"],
            timestamp=pt["timestamp"],
            confidence=pt["confidence"],
            distance_from_prev_m=pt["distance_from_prev_m"],
            time_diff_prev_sec=pt["time_diff_prev_sec"],
            estimated_speed_m_s=pt["estimated_speed_m_s"],
            is_physically_plausible=pt["is_physically_plausible"],
            explanation=pt["explanation"]
        )
        db.add(tp)

    search_zones = search_optimizer_engine.calculate_search_zones(
        case=demo_case,
        verified_evidences=ev_instances,
        trajectory=trajectory_points
    )

    for z in search_zones:
        sz = SearchZone(
            case_id=demo_case.id,
            name=z["name"],
            latitude=z["latitude"],
            longitude=z["longitude"],
            radius=z["radius"],
            score=z["score"],
            rank=z["rank"],
            explanation=z["explanation"]
        )
        db.add(sz)

    db.commit()
    db.refresh(demo_case)

    return demo_case
