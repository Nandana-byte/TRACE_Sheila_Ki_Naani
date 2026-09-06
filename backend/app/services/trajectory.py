import math
from datetime import datetime
from typing import List, Dict, Any
from app.models.models import Evidence

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two coordinates in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class TrajectoryEngine:
    MIN_WALKING_SPEED_M_S = 0.4   # ~1.4 km/h
    MAX_WALKING_SPEED_M_S = 2.8   # ~10 km/h (brisk walk/run)
    TRANSIT_SPEED_MAX_M_S = 15.0  # ~54 km/h (urban bus/auto)

    def calculate_trajectory(
        self, origin_lat: float, origin_lng: float, origin_time: datetime, verified_evidences: List[Evidence]
    ) -> List[Dict[str, Any]]:
        """
        Reconstructs plausible movement trajectory hypothesis.
        Advisory heuristic — not guaranteed movement.
        """
        sorted_ev = sorted(verified_evidences, key=lambda x: x.timestamp)
        trajectory_points = []

        # Point 1: Origin (Last Known Location)
        trajectory_points.append({
            "sequence_number": 1,
            "evidence_id": None,
            "latitude": origin_lat,
            "longitude": origin_lng,
            "timestamp": origin_time,
            "confidence": 1.0,
            "distance_from_prev_m": 0.0,
            "time_diff_prev_sec": 0.0,
            "estimated_speed_m_s": 0.0,
            "is_physically_plausible": True,
            "explanation": "Initial last confirmed sighting (Origin) — Prototype spatio-temporal heuristic."
        })

        current_lat, current_lng, current_time = origin_lat, origin_lng, origin_time
        seq = 2

        for ev in sorted_ev:
            if ev.timestamp < current_time:
                time_diff_sec = 0.0
            else:
                time_diff_sec = (ev.timestamp - current_time).total_seconds()

            dist_m = haversine_distance_meters(current_lat, current_lng, ev.latitude, ev.longitude)
            speed_m_s = dist_m / time_diff_sec if time_diff_sec > 0 else 0.0

            is_plausible = (
                dist_m == 0.0 or
                (time_diff_sec > 0 and speed_m_s <= self.TRANSIT_SPEED_MAX_M_S)
            )

            time_mins = round(time_diff_sec / 60.0, 1)
            dist_km = round(dist_m / 1000.0, 2)
            speed_kmh = round(speed_m_s * 3.6, 1)

            if is_plausible:
                explanation = (
                    f"Transition to {ev.title} ({dist_km} km in {time_mins} min, ~{speed_kmh} km/h) "
                    f"is consistent with configured movement parameters (Prototype spatio-temporal heuristic)."
                )
            else:
                explanation = (
                    f"Speed anomaly: requires ~{speed_kmh} km/h ({dist_km} km in {time_mins} min). "
                    f"Investigate vehicle transport or misidentification (Prototype spatio-temporal heuristic)."
                )

            trajectory_points.append({
                "sequence_number": seq,
                "evidence_id": ev.id,
                "latitude": ev.latitude,
                "longitude": ev.longitude,
                "timestamp": ev.timestamp,
                "confidence": round((ev.overall_confidence or 80.0) / 100.0, 2),
                "distance_from_prev_m": round(dist_m, 1),
                "time_diff_prev_sec": round(time_diff_sec, 1),
                "estimated_speed_m_s": round(speed_m_s, 2),
                "is_physically_plausible": is_plausible,
                "explanation": explanation
            })

            current_lat, current_lng, current_time = ev.latitude, ev.longitude, ev.timestamp
            seq += 1

        return trajectory_points

trajectory_engine = TrajectoryEngine()
