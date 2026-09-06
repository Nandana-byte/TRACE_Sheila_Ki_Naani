from typing import List, Dict, Tuple
from datetime import datetime
from app.models.models import Evidence, RelationshipType, SourceType

SOURCE_RELIABILITY_WEIGHTS = {
    SourceType.POLICE_REPORT: 0.95,
    SourceType.CCTV: 0.90,
    SourceType.PHOTO: 0.85,
    SourceType.PHONE: 0.80,
    SourceType.HOSPITAL: 0.90,
    SourceType.PUBLIC_TRANSPORT: 0.85,
    SourceType.VOLUNTEER: 0.75,
    SourceType.WITNESS: 0.70,
    SourceType.CIVILIAN_REPORT: 0.65,
    SourceType.SOCIAL_MEDIA: 0.60
}

class EvidenceFusionEngine:
    """
    Computes advisory TRACE Confidence Scores and cross-evidence corroboration.
    Advisory heuristic — not guaranteed probability.
    """
    def calculate_evidence_score(self, evidence: Evidence, corroboration_boost: float = 0.0) -> float:
        source_rel = SOURCE_RELIABILITY_WEIGHTS.get(evidence.source_type, 0.70)
        time_rel = evidence.timestamp_reliability if evidence.timestamp_reliability is not None else 0.80
        loc_prec = evidence.location_precision if evidence.location_precision is not None else 0.80
        vis_sim = evidence.visual_similarity if evidence.visual_similarity is not None else 0.50
        corrob = min(1.0, (evidence.corroboration_score or 0.50) + corroboration_boost)

        raw_score = (
            0.20 * source_rel +
            0.15 * time_rel +
            0.20 * loc_prec +
            0.20 * vis_sim +
            0.25 * corrob
        )

        score_100 = round(raw_score * 100.0, 1)
        return min(99.9, max(10.0, score_100))

    def evaluate_corroboration_and_relationships(
        self, verified_evidences: List[Evidence]
    ) -> Tuple[Dict[str, float], List[Dict], float]:
        relationships = []
        corroboration_map = {ev.id: 0.0 for ev in verified_evidences}
        sorted_ev = sorted(verified_evidences, key=lambda x: x.timestamp)

        for i in range(len(sorted_ev)):
            for j in range(i + 1, len(sorted_ev)):
                ev1 = sorted_ev[i]
                ev2 = sorted_ev[j]

                time_diff_min = abs((ev2.timestamp - ev1.timestamp).total_seconds()) / 60.0
                lat_diff = abs(ev2.latitude - ev1.latitude) * 111000.0
                lng_diff = abs(ev2.longitude - ev1.longitude) * 111000.0
                spatial_dist_m = (lat_diff**2 + lng_diff**2) ** 0.5

                # 1. Temporal & Spatial Sequence
                if 0 < time_diff_min <= 90 and spatial_dist_m <= 4000:
                    relationships.append({
                        "source_evidence_id": ev1.id,
                        "target_evidence_id": ev2.id,
                        "relationship_type": RelationshipType.TEMPORALLY_FOLLOWS,
                        "confidence": 0.88,
                        "explanation": f"{ev2.title} occurred {round(time_diff_min)} min after {ev1.title} within plausible distance ({round(spatial_dist_m)}m)."
                    })

                # 2. Corroboration (matching clothing / close proximity)
                clothing_match = False
                if ev1.extracted_features and ev2.extracted_features:
                    c1 = set(ev1.extracted_features.get("clothing", []))
                    c2 = set(ev2.extracted_features.get("clothing", []))
                    if c1 and c2 and len(c1.intersection(c2)) > 0:
                        clothing_match = True

                if (time_diff_min <= 30 and spatial_dist_m <= 600) or clothing_match:
                    corroboration_map[ev1.id] += 0.15
                    corroboration_map[ev2.id] += 0.15
                    relationships.append({
                        "source_evidence_id": ev1.id,
                        "target_evidence_id": ev2.id,
                        "relationship_type": RelationshipType.CORROBORATES,
                        "confidence": 0.92 if clothing_match else 0.85,
                        "explanation": f"{ev2.title} corroborates {ev1.title} (Time gap: {round(time_diff_min)} min, distance: {round(spatial_dist_m)}m)."
                    })

                # 3. Contradiction (Speed anomaly in short time window)
                if time_diff_min > 0:
                    speed_m_s = spatial_dist_m / (time_diff_min * 60.0)
                    if speed_m_s > 18.0 and time_diff_min < 15:  # > 65 km/h in foot/urban search zone
                        relationships.append({
                            "source_evidence_id": ev1.id,
                            "target_evidence_id": ev2.id,
                            "relationship_type": RelationshipType.CONTRADICTS,
                            "confidence": 0.80,
                            "explanation": f"Speed contradiction: {round(speed_m_s, 1)} m/s required between {ev1.title} and {ev2.title} without transit."
                        })

        if not verified_evidences:
            overall_score = 30.0
        else:
            base_avg = sum(self.calculate_evidence_score(ev, corroboration_map.get(ev.id, 0.0)) for ev in verified_evidences) / len(verified_evidences)
            convergence_bonus = min(20.0, len(verified_evidences) * 3.5)
            overall_score = min(98.5, round(base_avg * 0.75 + convergence_bonus, 1))

        return corroboration_map, relationships, overall_score

evidence_fusion_engine = EvidenceFusionEngine()
