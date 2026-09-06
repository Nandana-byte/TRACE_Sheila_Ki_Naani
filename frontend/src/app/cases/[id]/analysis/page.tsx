'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import CaseHeader from '@/components/cases/case-header';
import { api } from '@/lib/api';
import { Case, AnalysisRunResult } from '@/lib/types';
import { Cpu, Sparkles, TrendingUp, AlertCircle, Compass, ShieldCheck } from 'lucide-react';

export default function AnalysisPage() {
  const params = useParams();
  const caseId = (params?.id as string) || 'TRACE-2026-0891';

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisRunResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const c = await api.getCase(caseId);
        setCaseData(c);
        const res = await api.runAnalysis(c.id);
        setAnalysis(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [caseId]);

  if (loading || !caseData) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-xs font-mono">
        Loading TRACE intelligence engine breakdown...
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
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-3">
                  <span>TRACE Spatio-Temporal Intelligence Report</span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-800 font-semibold">
                    Algorithm v1.2-Fusion
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Full mathematical breakdown of evidence fusion, physical movement plausibility, and search priority optimization.
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                TRACE Confidence Score
              </div>
              <div className="text-3xl font-extrabold text-white font-mono mt-1">
                {analysis?.overall_trace_confidence || 86.5}%
              </div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                Verified Clues Fused
              </div>
              <div className="text-3xl font-extrabold text-blue-400 font-mono mt-1">
                {analysis?.evidence_analyzed_count || 5}
              </div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                Independent Channels
              </div>
              <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">
                {analysis?.independent_sources_count || 4}
              </div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl">
              <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                Trajectory Consistency
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                {analysis?.trajectory_consistency || 'HIGH'}
              </div>
            </div>
          </div>

          {/* Trajectory Plausibility Table */}
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Compass className="w-5 h-5 text-blue-400" />
              <span>Spatio-Temporal Sequence Breakdown</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3">Seq</th>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Coordinates</th>
                    <th className="p-3">Distance</th>
                    <th className="p-3">Time Delta</th>
                    <th className="p-3">Est. Speed</th>
                    <th className="p-3">Plausibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {analysis?.trajectory.map((pt) => (
                    <tr key={pt.id || pt.sequence_number} className="hover:bg-slate-900/50">
                      <td className="p-3 font-mono font-bold text-blue-400">{pt.sequence_number}</td>
                      <td className="p-3 font-mono">{new Date(pt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="p-3 font-mono text-[11px]">{pt.latitude.toFixed(4)}, {pt.longitude.toFixed(4)}</td>
                      <td className="p-3 font-mono">{pt.distance_from_prev_m || 0}m</td>
                      <td className="p-3 font-mono">{Math.round((pt.time_diff_prev_sec || 0) / 60)} min</td>
                      <td className="p-3 font-mono">{((pt.estimated_speed_m_s || 0) * 3.6).toFixed(1)} km/h</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {pt.is_physically_plausible ? 'Plausible Walking Speed' : 'Anomaly'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
