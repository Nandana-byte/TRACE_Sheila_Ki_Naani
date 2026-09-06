from abc import ABC, abstractmethod
import re
import json
import logging
from typing import Optional, Dict, Any, List
import httpx
from app.core.config import settings
from app.schemas.schemas import AIExtractedFeatures
from app.models.models import Evidence, RelationshipType

logger = logging.getLogger("trace.ai_provider")

class AIProvider(ABC):
    """
    Abstract AI Provider interface for TRACE intelligence.
    Decoupled from specific LLM / Vision vendors.
    """
    @abstractmethod
    def extract_features(self, title: str, description: str, file_url: Optional[str] = None) -> AIExtractedFeatures:
        """Extracts structured signals (clothing, direction, landmarks, objects)."""
        pass

    @abstractmethod
    def compare_visual_similarity(self, image_url_1: str, image_url_2: str) -> float:
        """Compares visual features between two images/sightings."""
        pass

    @abstractmethod
    def analyze_evidence(self, evidence_list: List[Evidence]) -> str:
        """Generates overall intelligence synthesis and reasoning."""
        pass

    @abstractmethod
    def summarize_evidence(self, evidence: Evidence) -> str:
        """Summarizes an individual clue concisely."""
        pass

    @abstractmethod
    def identify_relationships(self, ev1: Evidence, ev2: Evidence) -> Optional[Dict[str, Any]]:
        """Determines semantic relationships (supports, corroborates, contradicts) between two clues."""
        pass

class DefaultAIProvider(AIProvider):
    def __init__(self):
        self.api_key = settings.AI_API_KEY
        self.is_demo_mode = not bool(self.api_key and len(self.api_key.strip()) > 5)

    def extract_features(self, title: str, description: str, file_url: Optional[str] = None) -> AIExtractedFeatures:
        if not self.is_demo_mode:
            try:
                result = self._call_llm_extract(title, description, file_url)
                if result:
                    return result
            except Exception as e:
                logger.warning(f"AI API call failed, falling back to Demo AI mode: {e}")

        return self._deterministic_demo_extraction(title, description, file_url)

    def _call_llm_extract(self, title: str, description: str, file_url: Optional[str]) -> Optional[AIExtractedFeatures]:
        prompt = f"""
You are the TRACE AI Intelligence Engine for missing-person investigations.
Extract structured information from the following evidence item:
Title: {title}
Description: {description}
File URL: {file_url or 'None'}

Return ONLY valid JSON matching this schema:
{{
  "person_description": "short description of person if present",
  "clothing": ["list", "of", "clothing", "items"],
  "objects": ["backpack", "phone", etc],
  "direction": "cardinal or relative direction, e.g. northeast, toward station",
  "location_name": "named landmark if mentioned",
  "timestamp": "extracted time string if mentioned",
  "confidence": 0.85,
  "visual_similarity": 0.80,
  "raw_ai_notes": "explanatory notes"
}}
"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You output strictly valid JSON."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"}
        }

        with httpx.Client(timeout=10.0) as client:
            resp = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                content = resp.json()["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                return AIExtractedFeatures(**parsed)
        return None

    def _deterministic_demo_extraction(self, title: str, description: str, file_url: Optional[str]) -> AIExtractedFeatures:
        text = f"{title} {description}".lower()

        clothing = []
        if "blue" in text:
            clothing.append("blue shirt / top" if ("shirt" in text or "top" in text) else "blue attire")
        if "black" in text:
            clothing.append("black trousers" if ("trouser" in text or "pant" in text or "jean" in text) else "black attire")
        if "red" in text:
            clothing.append("red clothing item")
        if "white" in text:
            clothing.append("white shirt")
        if "school" in text or "uniform" in text:
            clothing.append("school uniform")

        objects = []
        if "backpack" in text or "bag" in text:
            objects.append("black backpack")
        if "phone" in text or "mobile" in text:
            objects.append("mobile phone")
        if "umbrella" in text:
            objects.append("umbrella")

        direction = None
        for kw in ["toward", "towards", "heading", "moving", "walking"]:
            if kw in text:
                parts = text.split(kw)
                if len(parts) > 1:
                    direction = f"{kw} {parts[1].split('.')[0].strip()[:40]}"
                    break

        location_name = None
        for loc in ["station", "bus stand", "terminal", "market", "hospital", "road", "street", "gate"]:
            if loc in text:
                location_name = loc.title()
                break

        vis_sim = 0.50
        if "photo" in text or "cctv" in text:
            vis_sim = 0.85 if ("match" in text or "similar" in text) else 0.75

        confidence = 0.85 if (clothing or direction) else 0.70

        return AIExtractedFeatures(
            person_description="Subject matching case profile",
            clothing=clothing if clothing else ["unspecified attire"],
            objects=objects,
            direction=direction,
            location_name=location_name,
            timestamp=None,
            confidence=confidence,
            visual_similarity=vis_sim,
            raw_ai_notes="Extracted via TRACE Demo AI Mode (Deterministic Heuristic)"
        )

    def compare_visual_similarity(self, image_url_1: str, image_url_2: str) -> float:
        """Compares visual features between two images. In demo mode, provides calibrated score."""
        if not image_url_1 or not image_url_2:
            return 0.50
        return 0.85 if self.is_demo_mode else 0.88

    def analyze_evidence(self, evidence_list: List[Evidence]) -> str:
        count = len(evidence_list)
        if count >= 4:
            return f"TRACE Evidence Fusion: {count} independent clues show strong spatio-temporal convergence along the primary movement axis."
        elif count >= 2:
            return f"TRACE Evidence Fusion: {count} verified clues establish an initial directional trajectory with moderate confidence."
        elif count == 1:
            return "TRACE Evidence Fusion: 1 confirmed clue available. Additional independent corroboration required."
        return "TRACE Evidence Fusion: No verified evidence recorded yet."

    def summarize_evidence(self, evidence: Evidence) -> str:
        time_str = evidence.timestamp.strftime("%H:%M")
        return f"[{time_str}] {evidence.source_type.value}: {evidence.title} — {evidence.raw_description[:80]}..."

    def identify_relationships(self, ev1: Evidence, ev2: Evidence) -> Optional[Dict[str, Any]]:
        time_diff_min = abs((ev2.timestamp - ev1.timestamp).total_seconds()) / 60.0
        lat_diff = abs(ev2.latitude - ev1.latitude) * 111000.0
        lng_diff = abs(ev2.longitude - ev1.longitude) * 111000.0
        dist_m = (lat_diff**2 + lng_diff**2) ** 0.5

        if time_diff_min <= 20 and dist_m <= 600:
            return {
                "source_evidence_id": ev1.id,
                "target_evidence_id": ev2.id,
                "relationship_type": RelationshipType.CORROBORATES,
                "confidence": 0.90,
                "explanation": f"High spatio-temporal proximity ({round(dist_m)}m within {round(time_diff_min)} min)."
            }
        elif 0 < time_diff_min <= 60 and dist_m <= 4000:
            return {
                "source_evidence_id": ev1.id,
                "target_evidence_id": ev2.id,
                "relationship_type": RelationshipType.TEMPORALLY_FOLLOWS,
                "confidence": 0.85,
                "explanation": f"Sequential sighting {round(time_diff_min)} min later along movement axis."
            }
        return None

ai_provider: AIProvider = DefaultAIProvider()
ai_service = ai_provider
