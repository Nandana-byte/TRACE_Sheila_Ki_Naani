import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.models.models import UserRole, CaseStatus, VisibilityStatus, VerificationStatus

client = TestClient(app)

@pytest.fixture
def police_token():
    return create_access_token({
        "sub": "00000000-0000-0000-0000-000000000001",
        "email": "officer@trace.demo",
        "role": UserRole.POLICE.value
    })

@pytest.fixture
def civilian_token():
    return create_access_token({
        "sub": "00000000-0000-0000-0000-000000000002",
        "email": "citizen@trace.demo",
        "role": UserRole.CIVILIAN.value
    })

@pytest.fixture
def police_headers(police_token):
    return {"Authorization": f"Bearer {police_token}"}

@pytest.fixture
def civilian_headers(civilian_token):
    return {"Authorization": f"Bearer {civilian_token}"}

# ================= AUTHENTICATION TESTS =================

def test_unauthenticated_request_rejected():
    """Unauthenticated access to protected endpoints must return 401."""
    res = client.post("/api/cases", json={
        "missing_person_name": "Test Person",
        "age": 20,
        "last_seen_location": "Central Park",
        "last_seen_lat": 12.92,
        "last_seen_lng": 79.13,
        "last_seen_time": datetime.utcnow().isoformat()
    })
    assert res.status_code == 401
    assert "detail" in res.json()

def test_login_demo_users():
    """Valid credentials return server-signed JWT with role."""
    # Police Login
    res_p = client.post("/api/auth/login", json={
        "email": "officer@trace.demo",
        "password": "police_password"
    })
    assert res_p.status_code == 200
    data_p = res_p.json()
    assert data_p["role"] == "POLICE"
    assert "token" in data_p

    # Civilian Login
    res_c = client.post("/api/auth/login", json={
        "email": "citizen@trace.demo",
        "password": "citizen_password"
    })
    assert res_c.status_code == 200
    data_c = res_c.json()
    assert data_c["role"] == "CIVILIAN"
    assert "token" in data_c

def test_get_me(police_headers, civilian_headers):
    """GET /api/me correctly identifies authenticated user role server-side."""
    res_p = client.get("/api/me", headers=police_headers)
    assert res_p.status_code == 200
    assert res_p.json()["role"] == "POLICE"

    res_c = client.get("/api/me", headers=civilian_headers)
    assert res_c.status_code == 200
    assert res_c.json()["role"] == "CIVILIAN"

# ================= AUTHORIZATION & PRIVACY TESTS =================

def test_civilian_cannot_approve_or_reject_evidence(civilian_headers, police_headers):
    """Civilians MUST be rejected (403) when trying to approve or reject evidence."""
    # Create evidence as police first
    ev_res = client.post("/api/cases/TRC-2026-001/evidence", headers=police_headers, json={
        "source_type": "WITNESS",
        "title": "Auth test witness clue",
        "raw_description": "Seen near gate",
        "timestamp": datetime.utcnow().isoformat(),
        "latitude": 12.925,
        "longitude": 79.135
    })
    assert ev_res.status_code == 201
    ev_id = ev_res.json()["id"]

    # Civilian attempt to approve
    app_res = client.post(f"/api/evidence/{ev_id}/approve", headers=civilian_headers)
    assert app_res.status_code == 403

    # Civilian attempt to reject
    rej_res = client.post(f"/api/evidence/{ev_id}/reject", headers=civilian_headers)
    assert rej_res.status_code == 403

def test_civilian_cannot_run_police_analysis_or_view_graph(civilian_headers):
    """Civilian cannot trigger analysis, view trajectory, or view internal evidence graph."""
    res_analysis = client.post("/api/cases/TRC-2026-001/run-analysis", headers=civilian_headers)
    assert res_analysis.status_code == 403

    res_graph = client.get("/api/cases/TRC-2026-001/graph", headers=civilian_headers)
    assert res_graph.status_code == 403

    res_traj = client.get("/api/cases/TRC-2026-001/trajectory", headers=civilian_headers)
    assert res_traj.status_code == 403

def test_civilian_cannot_mark_case_found(civilian_headers):
    """Civilians cannot execute police-exclusive 'mark-found' lifecycle action."""
    res = client.post("/api/cases/TRC-2026-001/mark-found", headers=civilian_headers)
    assert res.status_code == 403

# ================= CASES & MULTI-CASE ISOLATION TESTS =================

def test_case_creation_and_numbering(civilian_headers, police_headers):
    """Verify server-side case numbering TRC-YYYY-XXX and multi-case isolation."""
    # Civilian creates Case 2 in Bangalore
    res2 = client.post("/api/cases", headers=civilian_headers, json={
        "missing_person_name": "Rohan Verma",
        "age": 16,
        "gender": "Male",
        "description": "Teenager missing from Majestic Metro",
        "clothing_description": "Green hoodie and blue jeans",
        "last_seen_location": "Majestic Metro Station, Bangalore",
        "last_seen_lat": 12.9767,
        "last_seen_lng": 77.5713,
        "last_seen_time": datetime.utcnow().isoformat()
    })
    assert res2.status_code == 201
    case2 = res2.json()
    assert case2["case_number"].startswith("TRC-")
    assert case2["missing_person_name"] == "Rohan Verma"

    # Evidence added to Case 2 is isolated from Case 1
    ev_res = client.post(f"/api/cases/{case2['id']}/evidence", headers=civilian_headers, json={
        "source_type": "CIVILIAN_REPORT",
        "title": "Sighting at Metro Exit 3",
        "raw_description": "Saw boy in green hoodie heading to bus terminal",
        "timestamp": datetime.utcnow().isoformat(),
        "latitude": 12.9770,
        "longitude": 77.5720
    })
    assert ev_res.status_code == 201
    assert ev_res.json()["verification_status"] == "PENDING"

    # Police views Case 2 evidence -> Case 1 evidence must not appear
    case2_evs = client.get(f"/api/cases/{case2['id']}/evidence", headers=police_headers).json()
    assert len(case2_evs) == 1
    assert case2_evs[0]["case_id"] == case2["id"]

    # Police views Case 1 evidence -> Case 2 evidence must not appear
    case1_evs = client.get("/api/cases/TRC-2026-001/evidence", headers=police_headers).json()
    assert all(e["case_id"] != case2["id"] for e in case1_evs)

# ================= EVIDENCE & REVIEW TESTS =================

def test_civilian_sighting_review_flow(civilian_headers, police_headers):
    """Civilian submits sighting as PENDING; Police approves it to VERIFIED."""
    # 1. Civilian submits sighting
    submit_res = client.post("/api/cases/TRC-2026-001/evidence", headers=civilian_headers, json={
        "source_type": "CIVILIAN_REPORT",
        "title": "Civilian Witness Tip",
        "raw_description": "Observed person matching profile near station tea stall",
        "timestamp": datetime.utcnow().isoformat(),
        "latitude": 12.9254,
        "longitude": 79.1358
    })
    assert submit_res.status_code == 201
    ev = submit_res.json()
    assert ev["verification_status"] == "PENDING"
    ev_id = ev["id"]

    # 2. Civilian sees it in 'My Reports'
    my_reports = client.get("/api/me/reports", headers=civilian_headers).json()
    assert any(r["id"] == ev_id and r["verification_status"] == "PENDING" for r in my_reports)

    # 3. Police approves it
    appr_res = client.post(f"/api/evidence/{ev_id}/approve", headers=police_headers)
    assert appr_res.status_code == 200
    assert appr_res.json()["verification_status"] == "VERIFIED"

    # 4. Civilian checks 'My Reports' -> status is now VERIFIED
    my_reports_updated = client.get("/api/me/reports", headers=civilian_headers).json()
    matched = next(r for r in my_reports_updated if r["id"] == ev_id)
    assert matched["verification_status"] == "VERIFIED"

# ================= FOUND LIFECYCLE & PRIVACY TESTS =================

def test_found_lifecycle_and_civilian_privacy(police_headers, civilian_headers):
    """When Police marks case FOUND, civilians immediately receive sanitized neutral message."""
    # 1. Create a test case to mark found
    new_case = client.post("/api/cases", headers=police_headers, json={
        "missing_person_name": "Deepak Roy",
        "age": 28,
        "description": "Sensitive medical details: requires insulin",
        "clothing_description": "Yellow jacket",
        "photo_url": "https://example.com/sensitive_photo.jpg",
        "last_seen_location": "North Terminal",
        "last_seen_lat": 13.08,
        "last_seen_lng": 80.27,
        "last_seen_time": datetime.utcnow().isoformat()
    }).json()

    case_id = new_case["id"]

    # 2. Police marks case FOUND
    found_res = client.post(f"/api/cases/{case_id}/mark-found", headers=police_headers)
    assert found_res.status_code == 200
    assert found_res.json()["status"] == "FOUND"
    assert found_res.json()["visibility_status"] == "HIDDEN"
    assert found_res.json()["found_at"] is not None

    # 3. Civilian queries the case -> MUST receive sanitized response (no sensitive details!)
    civ_res = client.get(f"/api/cases/{case_id}", headers=civilian_headers).json()
    assert civ_res["status"] == "FOUND"
    assert civ_res["visibility_status"] == "HIDDEN"
    assert civ_res["is_closed"] is True
    assert "Sensitive case information is no longer publicly available" in civ_res["message"]
    # Verify sensitive fields are completely absent from civilian payload!
    assert "description" not in civ_res or civ_res.get("description") is None
    assert "clothing_description" not in civ_res or civ_res.get("clothing_description") is None
    assert "photo_url" not in civ_res or civ_res.get("photo_url") is None

    # 4. Police queries the same case -> Retains complete historical record
    pol_res = client.get(f"/api/cases/{case_id}", headers=police_headers).json()
    assert pol_res["status"] == "FOUND"
    assert pol_res["description"] == "Sensitive medical details: requires insulin"
    assert pol_res["clothing_description"] == "Yellow jacket"

# ================= TRACE INTELLIGENCE TESTS =================

def test_run_analysis_and_dynamic_zones(police_headers):
    """Police runs analysis: trajectory, search zones, and high-value clue generate dynamically."""
    res = client.post("/api/cases/TRC-2026-001/run-analysis", headers=police_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["overall_trace_confidence"] > 50.0
    assert data["evidence_analyzed_count"] >= 5
    assert len(data["trajectory"]) >= 5
    assert len(data["search_zones"]) >= 1
    assert data["search_zones"][0]["rank"] == 1
    assert "high_value_clue" in data
    assert len(data["high_value_clue"]["recommendation"]) > 10

    # Query individual endpoints
    traj_res = client.get("/api/cases/TRC-2026-001/trajectory", headers=police_headers)
    assert traj_res.status_code == 200
    assert len(traj_res.json()) >= 5

    zone_res = client.get("/api/cases/TRC-2026-001/search-zones", headers=police_headers)
    assert zone_res.status_code == 200
    assert len(zone_res.json()) >= 1

    graph_res = client.get("/api/cases/TRC-2026-001/graph", headers=police_headers)
    assert graph_res.status_code == 200
    assert len(graph_res.json()["nodes"]) >= 5
    assert len(graph_res.json()["edges"]) >= 4
