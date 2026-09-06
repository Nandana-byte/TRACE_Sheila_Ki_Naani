'use client';

import React from 'react';
import { AnalysisRunResult, SearchZone, HighValueInformation } from '@/lib/types';
import {
  Sparkles, TrendingUp, Target, AlertCircle, Compass, RefreshCw, PlusCircle, CheckCircle2, Shield
} from 'lucide-react';

interface IntelligencePanelProps {
  analysisResult: AnalysisRunResult | null;
  searchZones: SearchZone[];
  onTrigger6thClueDemo?: () => void;
  isRecalculating?: boolean;
}

export default function IntelligencePanel({
  analysisResult,
  searchZones,
  onTrigger6thClueDemo,
  isRecalculating = false,
}: IntelligencePanelProps) {
  const confidence = analysisResult?.overall_trace_confidence || 85.0;
  const aiInsight = analysisResult?.ai_insight || 'Reconstructing movement hypothesis from verified multi-channel observations.';

  const highValueClue: HighValueInformation = analysisResult?.high_value_clue || {
    gap_type: 'CONTINUING_SEARCH',
    recommendation: 'Canvass local transit connections and review public camera angles along the primary heading.',
    explanation: 'Independent corroboration helps eliminate alternate transit trajectories.'
  };

  const zones = searchZones.length > 0 ? searchZones : [];

  return (
    <div className="bg-[#0f172a] border-l border-slate-800 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-white">TRACE Intelligence</h2>
            <p className="text-[10px] text-slate-400 font-mono">Evidence Fusion & Decision Support</p>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-400">
          Updated: <span className="text-slate-300 font-semibold">{analysisResult?.latest_analysis_timestamp?.slice(11, 19) || 'Just now'}</span>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Hackathon Interactive Demo Button */}
        {onTrigger6thClueDemo && (
          <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/40 rounded-xl p-3.5 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono font-bold text-blue-300 tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-blue-400" /> Live Clue Ingestion
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                Interactive Demo
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-snug">
              Ingest 6th verified sighting (18:12 Railway Road Witness) to test real-time fusion recalculation.
            </p>

            <button
              onClick={onTrigger6thClueDemo}
              disabled={isRecalculating}
              className="w-full mt-3 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isRecalculating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>TRACE is recalculating intelligence...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add 6th Clue & Recalculate TRACE</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Overall TRACE Confidence Score Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px] font-mono text-slate-400">
              TRACE Confidence Score
            </span>
            <span className="font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 text-[10px] font-bold">
              Advisory Heuristic
            </span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
              {confidence}%
            </span>
            <div className="text-xs text-slate-300">
              Weighted fusion of <strong className="text-blue-400">{analysisResult?.evidence_analyzed_count || 5} clues</strong> across <strong className="text-blue-400">{analysisResult?.independent_sources_count || 4} channels</strong>.
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${confidence}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1.5 text-right">
            20% Source • 15% Time • 20% Loc • 20% Visual • 25% Corroboration
          </div>
        </div>

        {/* Search Priority Rankings */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-red-400" />
              <span>Search Priority</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Ranked by convergence</span>
          </div>

          {zones.length === 0 ? (
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
              Awaiting verified clues to construct prioritized search sectors.
            </div>
          ) : (
            <div className="space-y-2">
              {zones.map((zone, idx) => (
                <div
                  key={zone.id || idx}
                  className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3 hover:border-slate-700 transition-all text-xs"
                >
                  <div className="flex items-center justify-between font-medium">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold font-mono ${
                        idx === 0
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {zone.rank || idx + 1}
                      </span>
                      <span className="font-bold text-white">{zone.name}</span>
                    </div>

                    <span className="font-mono font-bold text-slate-200">
                      {zone.score}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0 ? 'bg-emerald-400' : idx === 1 ? 'bg-blue-400' : 'bg-slate-500'
                      }`}
                      style={{ width: `${zone.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 mt-2 leading-tight">
                    {zone.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Insight Box */}
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3.5 text-xs text-blue-200">
          <div className="flex items-center gap-1.5 font-semibold text-blue-400 text-[11px] uppercase font-mono mb-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>AI Evidence Synthesis</span>
          </div>
          <p className="text-xs leading-relaxed">
            "{aiInsight}"
          </p>
        </div>

        {/* High-Value Information Box */}
        <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3.5 text-xs text-emerald-200">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400 text-[11px] uppercase font-mono mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>High-Value Next Clue Target</span>
          </div>
          <p className="text-xs leading-relaxed text-emerald-100 font-medium">
            "{highValueClue.recommendation}"
          </p>
          <p className="text-[11px] text-emerald-300/80 mt-1.5 leading-tight">
            Reasoning: {highValueClue.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
