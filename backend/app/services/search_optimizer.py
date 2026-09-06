from typing import List, Dict, Any
from datetime import datetime
from app.models.models import Evidence, Case
from app.services.trajectory import haversine_distance_meters

class SearchOptimizerEngine:
    """
    Dynamically generates ranked Search Priority zones for ANY case.
    Zero hardcoded locations or coordinates.
    Advisory heuristic — not a guaranteed location.
    """
    def calculate_search_zones(
        self, case: Case, verified_evidences: List[Evidence], trajectory: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        base_lat = case.last_seen_lat
        base_lng = case.last_seen_lng
        origin_name = case.last_seen_location or "Last Seen Location"

        candidate_zones: List[Dict[str, Any]] = []

        if not verified_evidences:
            # Generate radial search zones centered around origin
            candidate_zones = [
                {
                    "name": f"{origin_name} — Immediate Perimeter",
                    "latitude": base_lat,
                    "longitude": base_lng,
                    "radius": 300.0,
                    "base_relevance": 0.80
                },
                {
                    "name": f"{origin_name} — North-East Sector",
                    "latitude": base_lat + 0.0025,
                    "longitude": base_lng + 0.0025,
                    "radius": 450.0,
                    "base_relevance": 0.50
                },
                {
                    "name": f"{origin_name} — South-West Sector",
                    "latitude": base_lat - 0.0025,
                    "longitude": base_lng - 0.0025,
                    "radius": 450.0,
                    "base_relevance": 0.40
                }
            ]
        else:
            # 1. Anchor zone: Last Seen Location
            candidate_zones.append({
                "name": f"{origin_name} (Origin)",
                "latitude": base_lat,
                "longitude": base_lng,
                "radius": 300.0,
                "base_relevance": 0.60
            })

            # 2. Cluster verified evidence by spatial proximity (~400m)
            sorted_ev = sorted(verified_evidences, key=lambda x: x.timestamp)
            clusters: List[List[Evidence]] = []

            for ev in sorted_ev:
                placed = False
                for cluster in clusters:
                    centroid_lat = sum(e.latitude for e in cluster) / len(cluster)
                    centroid_lng = sum(e.longitude for e in cluster) / len(cluster)
                    if haversine_distance_meters(centroid_lat, centroid_lng, ev.latitude, ev.longitude) <= 450.0:
                        cluster.append(ev)
                        placed = True
                        break
                if not placed:
                    clusters.append([ev])

            for idx, cluster in enumerate(clusters):
                c_lat = sum(e.latitude for e in cluster) / len(cluster)
                c_lng = sum(e.longitude for e in cluster) / len(cluster)
                
                # Derive meaningful zone name from evidence titles/locations
                primary_title = cluster[-1].title
                zone_name = primary_title.replace("Public Sighting:", "").replace("CCTV Footage —", "").strip()
                if not zone_name or len(zone_name) < 3:
                    zone_name = f"Convergence Sector #{idx + 1}"

                candidate_zones.append({
                    "name": zone_name,
                    "latitude": c_lat,
                    "longitude": c_lng,
                    "radius": 350.0,
                    "base_relevance": 0.70 + (len(cluster) * 0.05)
                })

            # 3. If there is a clear forward trajectory vector, project a forward search zone
            if len(sorted_ev) >= 2:
                first_ev = sorted_ev[0]
                last_ev = sorted_ev[-1]
                delta_lat = last_ev.latitude - first_ev.latitude
                delta_lng = last_ev.longitude - first_ev.longitude

                # Project forward by 30% of total span
                proj_lat = last_ev.latitude + delta_lat * 0.35
                proj_lng = last_ev.longitude + delta_lng * 0.35
                candidate_zones.append({
                    "name": f"Forward Vector Sector (Projected)",
                    "latitude": proj_lat,
                    "longitude": proj_lng,
                    "radius": 400.0,
                    "base_relevance": 0.65
                })

        # Deduplicate and calculate Search Priority scores
        scored_zones = []
        now = datetime.utcnow()

        for zone in candidate_zones:
            z_lat = zone["latitude"]
            z_lng = zone["longitude"]

            nearby_count = 0
            corrob_count = 0
            latest_time = None
            direction_boost = 0.0

            for ev in verified_evidences:
                dist = haversine_distance_meters(z_lat, z_lng, ev.latitude, ev.longitude)
                if dist <= zone["radius"] * 1.6:
                    nearby_count += 1
                    if ev.corroboration_score and ev.corroboration_score > 0.6:
                        corrob_count += 1
                    if not latest_time or ev.timestamp > latest_time:
                        latest_time = ev.timestamp

                if ev.direction and any(term in ev.direction.lower() for term in zone["name"].lower().split()):
                    direction_boost = min(0.20, direction_boost + 0.10)

            # Recency factor
            recency_factor = 0.75
            if latest_time:
                mins_ago = (now - latest_time).total_seconds() / 60.0
                recency_factor = max(0.50, 1.0 - (mins_ago / 2880.0))

            density_score = min(1.0, nearby_count * 0.30)
            corrob_score = min(1.0, corrob_count * 0.35)

            raw_score = (
                0.35 * density_score +
                0.25 * corrob_score +
                0.20 * zone.get("base_relevance", 0.50) +
                0.20 * recency_factor +
                direction_boost
            )

            final_score = round(min(99.0, max(15.0, raw_score * 100.0)), 0)

            # Advisory explanation
            if final_score >= 80:
                explanation = (
                    f"Highest Search Priority: {nearby_count} independent clues converge within this sector "
                    f"under a compatible movement window (Prototype heuristic)."
                )
            elif final_score >= 60:
                explanation = (
                    f"Secondary Search Priority: Spatially adjacent to primary movement trajectory; "
                    f"high tactical search value (Prototype heuristic)."
                )
            elif final_score >= 40:
                explanation = (
                    f"Moderate Search Priority: Plausible branch if subject deviated from projected heading "
                    f"(Prototype heuristic)."
                )
            else:
                explanation = (
                    f"Lower Search Priority: Outer perimeter or historical anchor; monitor for corroborating tips "
                    f"(Prototype heuristic)."
                )

            scored_zones.append({
                "name": zone["name"],
                "latitude": round(z_lat, 5),
                "longitude": round(z_lng, 5),
                "radius": zone["radius"],
                "score": final_score,
                "rank": 0,
                "explanation": explanation
            })

        # Sort descending by score
        scored_zones.sort(key=lambda x: x["score"], reverse=True)
        for i, z in enumerate(scored_zones, start=1):
            z["rank"] = i

        return scored_zones

search_optimizer_engine = SearchOptimizerEngine()
