from typing import List, Dict, Any
from datetime import datetime
from app.models.models import Evidence, Case
from app.schemas.schemas import HighValueInformation

class InformationGainEngine:
    """
    Identifies the single highest-value clue that would most reduce uncertainty.
    Dynamically analyzes trajectory gaps, directional branches, and temporal jumps.
    """
    def identify_high_value_clue(
        self, case: Case, verified_evidences: List[Evidence], trajectory: List[Dict[str, Any]]
    ) -> HighValueInformation:
        sorted_ev = sorted(verified_evidences, key=lambda x: x.timestamp) if verified_evidences else []

        # Case 0: No verified evidence yet
        if not sorted_ev:
            return HighValueInformation(
                gap_type="INITIAL_CORROBORATION",
                recommendation=f"Immediate priority: Obtain verified CCTV footage or independent eyewitness within 500m of {case.missing_person_name}'s last confirmed location ({case.last_seen_location}).",
                target_time_window=f"{case.last_seen_time.strftime('%H:%M')} – {(case.last_seen_time).strftime('%H:%M')}",
                target_spatial_segment=f"{case.last_seen_location} Perimeter",
                explanation="No verified evidence exists yet to establish directional movement. Initial sighting verification anchors the search boundary."
            )

        # Case 1: Detect largest temporal gap in trajectory (> 8 minutes)
        largest_gap_min = 0.0
        gap_start_ev = None
        gap_end_ev = None

        for i in range(len(sorted_ev) - 1):
            t1 = sorted_ev[i].timestamp
            t2 = sorted_ev[i + 1].timestamp
            gap_min = (t2 - t1).total_seconds() / 60.0
            if gap_min > largest_gap_min:
                largest_gap_min = gap_min
                gap_start_ev = sorted_ev[i]
                gap_end_ev = sorted_ev[i + 1]

        if largest_gap_min >= 8.0 and gap_start_ev and gap_end_ev:
            t_start = gap_start_ev.timestamp.strftime("%H:%M")
            t_end = gap_end_ev.timestamp.strftime("%H:%M")
            loc_a = gap_start_ev.title.replace("CCTV Footage —", "").strip()
            loc_b = gap_end_ev.title.replace("CCTV Footage —", "").strip()

            return HighValueInformation(
                gap_type="TRAJECTORY_INTERPOLATION_GAP",
                recommendation=f"High-value target: Retrieve commercial/traffic CCTV or canvass businesses between {loc_a} and {loc_b} during the {t_start}–{t_end} window.",
                target_time_window=f"{t_start} – {t_end}",
                target_spatial_segment=f"Transit corridor connecting {loc_a} and {loc_b}",
                explanation=f"A {round(largest_gap_min)} minute uncorroborated gap exists between sightings. Confirming transit eliminates alternate branch routes."
            )

        # Case 2: Extend the search beyond the latest sighting
        last_ev = sorted_ev[-1]
        last_time_str = last_ev.timestamp.strftime("%H:%M")
        last_loc = last_ev.title.replace("CCTV Footage —", "").strip()

        return HighValueInformation(
            gap_type="FORWARD_PERIMETER_CONFIRMATION",
            recommendation=f"High-value target: Canvass transit hubs, ticket counters, or entry gates along projected heading beyond {last_loc}.",
            target_time_window=f"{last_time_str} onward",
            target_spatial_segment=f"Terminal perimeter and transit exits past {last_loc}",
            explanation=f"Latest verified sighting ({last_time_str}) places subject near {last_loc}. Confirming onward boarding or departure narrows the active search perimeter."
        )

information_gain_engine = InformationGainEngine()
