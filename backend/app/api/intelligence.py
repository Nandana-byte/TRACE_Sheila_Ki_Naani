import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import require_police
from app.models.models import (
    Case, Evidence, VerificationStatus, TrajectoryPoint, SearchZone,
    EvidenceRelationship, AnalysisRun, User, generate_uuid
)
from app.schemas.schemas import (
    AnalysisRunResult, TrajectoryPointOut, SearchZoneOut,
    IntelligenceGraphOut, GraphNode, GraphEdge, RelationshipOut
)
from app.services.evidence_fusion import evidence_fusion_engine
from app.services.trajectory import trajectory_engine
from app.services.search_optimizer import search_optimizer_engine
from app.services.information_gain import information_gain_engine
from app.services.ai_service import ai_provider

router = APIRouter(prefix="/cases", tags=["TRACE Intelligence"])

@router.post("/{case_id}/run-analysis", response_model=AnalysisRunResult)
def run_trace_analysis(
    case_id: str,
    current_user: User = Depends(require_police),
    db: Session = Depends(get_db)
):
    """
    Police Intelligence Action: Triggers TRACE multi-evidence fusion and analysis.
    Executes in an atomic database transaction:
      1. Evidence Corroboration & Cross-Link Scoring
      2. Spatio-Temporal Trajectory Reconstruction
      3. Dynamic Search Priority Ranking
      4. High-Value Clue Identification
      5. Saves AnalysisRun record for reproducible audit
    """
    case = db.query(Case).filter(
        (Case.id == case_id) | (Case.case_number == case_id)
    ).first()

    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    verified_ev = db.query(Evidence).filter(
        Evidence.case_id == case.id,
        Evidence.verification_status == VerificationStatus.VERIFIED
    ).order_by(Evidence.timestamp.asc()).all()

    # 1. Evidence Fusion & Corroboration
    corroboration_map, raw_rel_list, overall_confidence = (
        evidence_fusion_engine.evaluate_corroboration_and_relationships(verified_ev)
    )

    # 2. Trajectory Calculation
    raw_trajectory = trajectory_engine.calculate_trajectory(
        origin_lat=case.last_seen_lat,
        origin_lng=case.last_seen_lng,
        origin_time=case.last_seen_time,
        verified_evidences=verified_ev
    )

    # 3. Dynamic Search Priority Zones
    raw_zones = search_optimizer_engine.calculate_search_zones(case, verified_ev, raw_trajectory)

    # 4. High-Value Information
    high_val_clue = information_gain_engine.identify_high_value_clue(case, verified_ev, raw_trajectory)

    # 5. AI Synthesis Insight
    ai_insight = ai_provider.analyze_evidence(verified_ev)

    # Atomic DB Transaction: Persist all updated intelligence artifacts
    try:
        # Clear previous relationships for this case's evidence
        ev_ids = [e.id for e in verified_ev]
        if ev_ids:
            db.query(EvidenceRelationship).filter(
                (EvidenceRelationship.source_evidence_id.in_(ev_ids)) |
                (EvidenceRelationship.target_evidence_id.in_(ev_ids))
            ).delete(synchronize_session=False)

        relationships_out = []
        for rel_dict in raw_rel_list:
            rel_id = generate_uuid()
            now_t = datetime.utcnow()
            rel_obj = EvidenceRelationship(
                id=rel_id,
                source_evidence_id=rel_dict["source_evidence_id"],
                target_evidence_id=rel_dict["target_evidence_id"],
                relationship_type=rel_dict["relationship_type"],
                confidence=rel_dict.get("confidence", 0.85),
                explanation=rel_dict["explanation"],
                created_at=now_t
            )
            db.add(rel_obj)
            relationships_out.append(RelationshipOut(
                id=rel_id,
                source_evidence_id=rel_dict["source_evidence_id"],
                target_evidence_id=rel_dict["target_evidence_id"],
                relationship_type=rel_dict["relationship_type"],
                confidence=rel_dict.get("confidence", 0.85),
                explanation=rel_dict["explanation"],
                created_at=now_t
            ))

        # Update evidence scores
        for ev in verified_ev:
            boost = corroboration_map.get(ev.id, 0.0)
            ev.corroboration_score = min(1.0, 0.50 + boost)
            ev.overall_confidence = evidence_fusion_engine.calculate_evidence_score(ev, boost)

        # Clear & replace trajectory points
        db.query(TrajectoryPoint).filter(TrajectoryPoint.case_id == case.id).delete()
        trajectory_out = []
        for pt in raw_trajectory:
            tp_id = generate_uuid()
            now_t = datetime.utcnow()
            tp = TrajectoryPoint(
                id=tp_id,
                case_id=case.id,
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
                explanation=pt["explanation"],
                created_at=now_t
            )
            db.add(tp)
            trajectory_out.append(TrajectoryPointOut(
                id=tp_id,
                case_id=case.id,
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
            ))

        # Clear & replace search zones
        db.query(SearchZone).filter(SearchZone.case_id == case.id).delete()
        search_zones_out = []
        for z in raw_zones:
            sz_id = generate_uuid()
            now_t = datetime.utcnow()
            sz = SearchZone(
                id=sz_id,
                case_id=case.id,
                name=z["name"],
                latitude=z["latitude"],
                longitude=z["longitude"],
                radius=z["radius"],
                score=z["score"],
                rank=z["rank"],
                explanation=z["explanation"],
                created_at=now_t
            )
            db.add(sz)
            search_zones_out.append(SearchZoneOut(
                id=sz_id,
                case_id=case.id,
                name=z["name"],
                latitude=z["latitude"],
                longitude=z["longitude"],
                radius=z["radius"],
                score=z["score"],
                rank=z["rank"],
                explanation=z["explanation"],
                created_at=now_t
            ))

        analysis_result = AnalysisRunResult(
            overall_trace_confidence=overall_confidence,
            evidence_analyzed_count=len(verified_ev),
            independent_sources_count=len(set(ev.source_type for ev in verified_ev)),
            trajectory_consistency="HIGH" if len(verified_ev) >= 3 else "MEDIUM",
            trajectory=trajectory_out,
            search_zones=search_zones_out,
            relationships=relationships_out,
            ai_insight=ai_insight,
            high_value_clue=high_val_clue,
            latest_analysis_timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        )

        ar = AnalysisRun(
            id=generate_uuid(),
            case_id=case.id,
            algorithm_version="TRACE-v1.2-Fusion",
            result=json.loads(analysis_result.model_dump_json()),
            created_at=datetime.utcnow()
        )
        db.add(ar)
        db.commit()

        return analysis_result
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis run failed during transaction: {str(e)}"
        )

@router.get("/{case_id}/trajectory", response_model=List[TrajectoryPointOut])
def get_case_trajectory(
    case_id: str,
    current_user: User = Depends(require_police),
    db: Session = Depends(get_db)
):
    """Returns reconstructed trajectory points for the case."""
    case = db.query(Case).filter(
        (Case.id == case_id) | (Case.case_number == case_id)
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    points = db.query(TrajectoryPoint).filter(
        TrajectoryPoint.case_id == case.id
    ).order_by(TrajectoryPoint.sequence_number.asc()).all()

    return points

@router.get("/{case_id}/search-zones", response_model=List[SearchZoneOut])
def get_case_search_zones(
    case_id: str,
    current_user: User = Depends(require_police),
    db: Session = Depends(get_db)
):
    """Returns ranked search priority zones for the case."""
    case = db.query(Case).filter(
        (Case.id == case_id) | (Case.case_number == case_id)
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    zones = db.query(SearchZone).filter(
        SearchZone.case_id == case.id
    ).order_by(SearchZone.rank.asc()).all()

    return zones

@router.get("/{case_id}/graph", response_model=IntelligenceGraphOut)
def get_evidence_graph(
    case_id: str,
    current_user: User = Depends(require_police),
    db: Session = Depends(get_db)
):
    """
    Generates React Flow nodes & edges for the police evidence network graph.
    Strictly restricted to authorized police investigators.
    """
    case = db.query(Case).filter(
        (Case.id == case_id) | (Case.case_number == case_id)
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    evidences = db.query(Evidence).filter(
        Evidence.case_id == case.id,
        Evidence.verification_status == VerificationStatus.VERIFIED
    ).order_by(Evidence.timestamp.asc()).all()

    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []

    # Origin node
    origin_id = f"origin_{case.id}"
    nodes.append(GraphNode(
        id=origin_id,
        type="origin",
        label=f"Origin: {case.missing_person_name} ({case.last_seen_location})",
        data={
            "time": case.last_seen_time.strftime("%H:%M"),
            "lat": case.last_seen_lat,
            "lng": case.last_seen_lng
        }
    ))

    prev_id = origin_id
    for ev in evidences:
        ev_node_id = f"ev_{ev.id}"
        nodes.append(GraphNode(
            id=ev_node_id,
            type="evidence",
            label=f"{ev.source_type.value}: {ev.title}",
            data={
                "source_type": ev.source_type.value,
                "confidence": ev.overall_confidence,
                "time": ev.timestamp.strftime("%H:%M"),
                "description": ev.raw_description,
                "features": ev.extracted_features or {}
            }
        ))

        # Trajectory sequence edge
        edges.append(GraphEdge(
            id=f"edge_seq_{prev_id}_{ev_node_id}",
            source=prev_id,
            target=ev_node_id,
            label="SPATIALLY_FOLLOWS",
            type="SPATIALLY_FOLLOWS",
            confidence=0.88
        ))
        prev_id = ev_node_id

    # Evidence relationships
    ev_ids = [ev.id for ev in evidences]
    if ev_ids:
        relationships = db.query(EvidenceRelationship).filter(
            EvidenceRelationship.source_evidence_id.in_(ev_ids)
        ).all()

        for rel in relationships:
            edges.append(GraphEdge(
                id=f"edge_rel_{rel.id}",
                source=f"ev_{rel.source_evidence_id}",
                target=f"ev_{rel.target_evidence_id}",
                label=rel.relationship_type.value,
                type=rel.relationship_type.value,
                confidence=rel.confidence or 0.85
            ))

    return IntelligenceGraphOut(nodes=nodes, edges=edges)
