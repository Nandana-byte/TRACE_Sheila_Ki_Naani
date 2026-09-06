import {
  Case,
  Evidence,
  AnalysisRunResult,
  IntelligenceGraph,
  TrajectoryPoint,
  SearchZone,
  SourceType,
  User
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

let memoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('trace_auth_token') || memoryToken;
  }
  return memoryToken;
}

export function setAuthToken(token: string | null) {
  memoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('trace_auth_token', token);
    } else {
      localStorage.removeItem('trace_auth_token');
    }
  }
}

async function fetcher<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      // fallback to status text
    }
    throw new Error(`API Error (${res.status}): ${errorDetail}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: async (email: string, password: string, role?: string) => {
    const res = await fetcher<{ user_id: string; email: string; role: string; token: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password, role }) }
    );
    setAuthToken(res.token);
    return res;
  },

  getMe: () => fetcher<User>('/me'),

  logout: () => {
    setAuthToken(null);
  },

  // Cases
  getCases: (statusFilter?: string) =>
    fetcher<Case[]>(`/cases${statusFilter ? `?status_filter=${statusFilter}` : ''}`),

  getCase: (id: string) => fetcher<Case>(`/cases/${id}`),

  createCase: (data: {
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
  }) => fetcher<Case>('/cases', { method: 'POST', body: JSON.stringify(data) }),

  markFound: (caseId: string) =>
    fetcher<Case>(`/cases/${caseId}/mark-found`, { method: 'POST' }),

  getMyCases: () => fetcher<Case[]>('/me/cases'),

  // Evidence
  getCaseEvidence: (caseId: string, statusFilter?: string) =>
    fetcher<Evidence[]>(`/cases/${caseId}/evidence${statusFilter ? `?status_filter=${statusFilter}` : ''}`),

  submitEvidence: (caseId: string, data: {
    source_type?: SourceType;
    title: string;
    raw_description: string;
    file_url?: string;
    timestamp: string;
    latitude: number;
    longitude: number;
    direction?: string;
  }) => fetcher<Evidence>(`/cases/${caseId}/evidence`, { method: 'POST', body: JSON.stringify(data) }),

  approveEvidence: (evidenceId: string) =>
    fetcher<Evidence>(`/evidence/${evidenceId}/approve`, { method: 'POST' }),

  rejectEvidence: (evidenceId: string) =>
    fetcher<Evidence>(`/evidence/${evidenceId}/reject`, { method: 'POST' }),

  getMyReports: () => fetcher<Evidence[]>('/me/reports'),

  // Public Report submission
  submitPublicReport: (caseId: string, data: {
    source_type?: SourceType;
    title: string;
    raw_description: string;
    file_url?: string;
    timestamp: string;
    latitude: number;
    longitude: number;
    direction?: string;
    contact_info?: string;
  }) => fetcher<Evidence>(`/public/cases/${caseId}/report`, { method: 'POST', body: JSON.stringify(data) }),

  // TRACE Intelligence
  runAnalysis: (caseId: string) =>
    fetcher<AnalysisRunResult>(`/cases/${caseId}/run-analysis`, { method: 'POST' }),

  getTrajectory: (caseId: string) =>
    fetcher<TrajectoryPoint[]>(`/cases/${caseId}/trajectory`),

  getSearchZones: (caseId: string) =>
    fetcher<SearchZone[]>(`/cases/${caseId}/search-zones`),

  getGraph: (caseId: string) =>
    fetcher<IntelligenceGraph>(`/cases/${caseId}/graph`),
};
