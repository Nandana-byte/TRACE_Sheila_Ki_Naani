'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import CaseHeader from '@/components/cases/case-header';
import { api } from '@/lib/api';
import { Case, Evidence } from '@/lib/types';
import { ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle, Eye } from 'lucide-react';

export default function EvidenceReviewPage() {
  const params = useParams();
  const caseId = (params?.id as string) || 'TRACE-2026-0891';

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const c = await api.getCase(caseId);
        setCaseData(c);
        const evs = await api.getCaseEvidence(c.id);
        setEvidences(evs);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [caseId]);

  const handleApprove = async (id: string) => {
    try {
      await api.approveEvidence(id);
      if (caseData) {
        await api.runAnalysis(caseData.id);
        const updated = await api.getCaseEvidence(caseData.id);
        setEvidences(updated);
      }
    } catch (e: any) {
      alert(e?.message || 'Error approving evidence');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectEvidence(id);
      if (caseData) {
        const updated = await api.getCaseEvidence(caseData.id);
        setEvidences(updated);
      }
    } catch (e: any) {
      alert(e?.message || 'Error rejecting evidence');
    }
  };

  const filtered = evidences.filter(e => {
    if (filter === 'PENDING') return e.verification_status === 'PENDING';
    if (filter === 'VERIFIED') return e.verification_status === 'VERIFIED';
    return true;
  });

  const pendingCount = evidences.filter(e => e.verification_status === 'PENDING').length;

  if (loading || !caseData) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-xs font-mono">
        Loading evidence review portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col">
      <Navbar />

      <CaseHeader caseData={caseData} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar caseId={caseData.id} />

        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f172a] border border-slate-800 p-6 rounded-2xl">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
                <span>Evidence Verification & Control Gate</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Police officers must verify all incoming public sightings before they enter the TRACE analysis pipeline.
              </p>
            </div>

            {pendingCount > 0 && (
              <div className="bg-amber-950/60 border border-amber-800 text-amber-300 px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>{pendingCount} Public Submission(s) Awaiting Review</span>
              </div>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 text-xs font-medium">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === 'ALL' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Evidence ({evidences.length})
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                filter === 'PENDING' ? 'bg-amber-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Pending Review</span>
              {pendingCount > 0 && (
                <span className="bg-slate-900 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('VERIFIED')}
              className={`px-4 py-2 rounded-lg transition-all ${
                filter === 'VERIFIED' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Verified Clues ({evidences.filter(e => e.verification_status === 'VERIFIED').length})
            </button>
          </div>

          {/* Evidence Table / Cards */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center py-12 bg-[#0f172a] border border-slate-800 rounded-xl text-slate-400 text-xs">
                No evidence items match current filter.
              </div>
            ) : (
              filtered.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-mono text-[10px] uppercase font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {ev.source_type}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        ev.verification_status === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : ev.verification_status === 'REJECTED'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {ev.verification_status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{ev.title}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                      {ev.raw_description}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
                      <span>Lat: {ev.latitude}, Lng: {ev.longitude}</span>
                      <span>Submitted By: <strong className="text-slate-200">{ev.submitted_by}</strong></span>
                      <span>TRACE Confidence: <strong className="text-emerald-400">{ev.overall_confidence}%</strong></span>
                    </div>
                  </div>

                  {ev.verification_status === 'PENDING' && (
                    <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-0 border-slate-800">
                      <button
                        onClick={() => handleReject(ev.id)}
                        className="px-3.5 py-2 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 font-semibold text-xs rounded-xl flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleApprove(ev.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-900/40 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve & Fuse Clue</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
