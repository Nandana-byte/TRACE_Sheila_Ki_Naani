'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import CaseHeader from '@/components/cases/case-header';
import EvidenceTimeline from '@/components/intelligence/evidence-timeline';
import TraceMap from '@/components/intelligence/trace-map';
import IntelligencePanel from '@/components/intelligence/intelligence-panel';
import EvidenceGraph from '@/components/intelligence/evidence-graph';
import AddEvidenceDialog from '@/components/intelligence/add-evidence-dialog';
import { api } from '@/lib/api';
import { Case, Evidence, AnalysisRunResult, IntelligenceGraph, SourceType } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Sparkles, AlertCircle, CheckCircle2, Lock, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CaseWorkspacePage() {
  const params = useParams();
  const rawId = (params?.id as string) || 'TRC-2026-001';
  const { role, user } = useAuth();
  const isPolice = role === 'POLICE';

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisRunResult | null>(null);
  const [graphData, setGraphData] = useState<IntelligenceGraph | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load authoritative data
  const loadWorkspaceData = useCallback(async () => {
    try {
      const c = await api.getCase(rawId);
      setCaseData(c);

      // If closed and sanitized, stop further police queries
      if (c.is_closed && !isPolice) {
        setLoading(false);
        return;
      }

      if (isPolice) {
        const [evs, runRes, gData] = await Promise.all([
          api.getCaseEvidence(c.id),
          api.runAnalysis(c.id).catch(() => null),
          api.getGraph(c.id).catch(() => null),
        ]);
        setEvidences(evs);
        setAnalysisResult(runRes);
        setGraphData(gData);
      } else {
        const evs = await api.getCaseEvidence(c.id).catch(() => []);
        setEvidences(evs);
      }
    } catch (err) {
      console.error('Error loading case workspace:', err);
    } finally {
      setLoading(false);
    }
  }, [rawId, isPolice]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Real-time synchronization
  useEffect(() => {
    if (!isSupabaseConfigured || !caseData) return;

    const channel = supabase
      .channel(`case:${caseData.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'evidence', filter: `case_id=eq.${caseData.id}` },
        () => {
          loadWorkspaceData();
          setToastMessage('Real-time sync: New evidence clue ingested/reviewed!');
          setTimeout(() => setToastMessage(null), 4000);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases', filter: `id=eq.${caseData.id}` },
        () => {
          loadWorkspaceData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseData?.id, loadWorkspaceData]);

  // Handle adding new evidence clue
  const handleAddEvidence = async (data: {
    source_type: SourceType;
    title: string;
    raw_description: string;
    file_url?: string;
    timestamp: string;
    latitude: number;
    longitude: number;
    direction?: string;
  }) => {
    if (!caseData) return;
    setIsRecalculating(true);

    try {
      await api.submitEvidence(caseData.id, data);
      await loadWorkspaceData();
      setToastMessage('TRACE intelligence recalculated with new observation!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Error submitting evidence');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Police Review: Approve Evidence
  const handleApproveEvidence = async (evId: string) => {
    try {
      await api.approveEvidence(evId);
      await loadWorkspaceData();
      setToastMessage('Clue approved & verified! Recalculating TRACE intelligence...');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to approve evidence');
    }
  };

  // Police Review: Reject Evidence
  const handleRejectEvidence = async (evId: string) => {
    try {
      await api.rejectEvidence(evId);
      await loadWorkspaceData();
      setToastMessage('Clue marked as rejected.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to reject evidence');
    }
  };

  // 6th Clue Demo Trigger (Railway Road Witness 18:12)
  const trigger6thClueDemo = async () => {
    if (!caseData) return;
    setIsRecalculating(true);

    try {
      await handleAddEvidence({
        source_type: 'WITNESS',
        title: 'Verified Witness — Railway Road (18:12)',
        raw_description: 'Independent witness observed teenager in blue top walking briskly northward toward Railway Station platform entrance #1.',
        timestamp: '2026-09-05T18:12:00Z',
        latitude: 12.9249,
        longitude: 79.1356,
        direction: 'moving toward Railway Station platform',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-xs font-mono">
        Loading TRACE Workspace for {rawId}...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4 text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-red-400" />
        <h2 className="text-lg font-bold text-white">Case Not Found</h2>
        <p className="text-xs text-slate-400 max-w-md">
          The requested case identifier does not exist or has been removed from the registry.
        </p>
        <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // CIVILIAN VIEW WHEN CASE IS FOUND OR CLOSED (Strict Privacy Enforcement)
  if (caseData.is_closed && !isPolice) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="inline-block font-mono text-xs text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
              Case {caseData.case_number} Resolved
            </div>

            <h1 className="text-2xl font-bold text-white">Person Found & Case Closed</h1>

            <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
              This case has been resolved and officially marked as FOUND by authorized police investigators. Sensitive personal details, photos, and sighting telemetry are no longer publicly available.
            </p>

            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center justify-center gap-2 font-mono">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Public Help. Police Control. Privacy Protected.</span>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Active Public Bulletins</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col overflow-hidden">
      <Navbar />

      {/* Case Header */}
      <CaseHeader
        caseData={caseData}
        onCaseUpdated={(updated) => setCaseData(updated)}
      />

      {/* Real-time Toast Banner */}
      {toastMessage && (
        <div className="bg-emerald-900/90 border-b border-emerald-700 text-white text-xs px-6 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300 z-50 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <span className="text-[10px] text-emerald-300">Live TRACE Recalculation Complete</span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          caseId={caseData.id}
          caseName={caseData.missing_person_name}
          caseNumber={caseData.case_number}
        />

        {/* Workspace Layout */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left: Evidence Timeline (3 cols) */}
            <div className="lg:col-span-3 h-full overflow-hidden border-r border-slate-800">
              <EvidenceTimeline
                evidences={evidences}
                selectedId={selectedEvidence?.id}
                onSelectEvidence={(ev) => setSelectedEvidence(ev)}
                onOpenAddDialog={() => setIsAddDialogOpen(true)}
                onApproveEvidence={handleApproveEvidence}
                onRejectEvidence={handleRejectEvidence}
              />
            </div>

            {/* Center: Map & Trajectory (6 cols) */}
            <div className="lg:col-span-6 h-full relative overflow-hidden bg-[#070b14]">
              <TraceMap
                caseData={caseData}
                evidences={evidences}
                trajectory={analysisResult?.trajectory || []}
                searchZones={analysisResult?.search_zones || []}
                selectedEvidence={selectedEvidence}
                onSelectEvidence={(ev) => setSelectedEvidence(ev)}
                isPoliceView={isPolice}
              />
            </div>

            {/* Right: TRACE Intelligence Panel (3 cols) */}
            <div className="lg:col-span-3 h-full overflow-hidden border-l border-slate-800">
              {isPolice ? (
                <IntelligencePanel
                  analysisResult={analysisResult}
                  searchZones={analysisResult?.search_zones || []}
                  onTrigger6thClueDemo={caseData.case_number === 'TRC-2026-001' ? trigger6thClueDemo : undefined}
                  isRecalculating={isRecalculating}
                />
              ) : (
                <div className="p-5 bg-[#0f172a] h-full flex flex-col justify-between text-xs space-y-4">
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-white">Public Search Bulletin</h3>
                    <p className="text-slate-300 leading-relaxed">
                      Have you seen <strong>{caseData.missing_person_name}</strong>? Every sighting tip submitted is reviewed by police investigators and strengthens the search intelligence.
                    </p>
                    <Link
                      href={`/public/cases/${caseData.id}/report`}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <span>Submit Sighting Report</span>
                    </Link>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] text-slate-400">
                    Internal movement trajectories and intelligence analysis are restricted to authorized police investigators.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Evidence Graph (React Flow) - POLICE ONLY */}
          {isPolice && (
            <EvidenceGraph
              graphData={graphData}
              onNodeClick={(id) => {
                const matched = evidences.find((e) => `ev_${e.id}` === id);
                if (matched) setSelectedEvidence(matched);
              }}
            />
          )}
        </div>
      </div>

      {/* Add Evidence Modal */}
      <AddEvidenceDialog
        caseId={caseData.id}
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSubmit={handleAddEvidence}
      />
    </div>
  );
}
