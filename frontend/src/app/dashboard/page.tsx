'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import CaseCard from '@/components/cases/case-card';
import { api } from '@/lib/api';
import { Case, Evidence, UserRole } from '@/lib/types';
import { useAuth } from '@/lib/useAuth';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  FolderOpen, AlertCircle, Plus, ShieldCheck, Cpu, User,
  CheckCircle2, Clock, XCircle, ArrowRight, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [myReports, setMyReports] = useState<Evidence[]>([]);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isPolice = role === 'POLICE';

  const loadDashboardData = useCallback(async () => {
    try {
      const casesData = await api.getCases();
      setCases(casesData);

      if (isPolice) {
        // Fetch pending count across active cases
        let pendingTotal = 0;
        for (const c of casesData) {
          if (c.status === 'ACTIVE') {
            const evs = await api.getCaseEvidence(c.id, 'PENDING');
            pendingTotal += evs.length;
          }
        }
        setPendingReviewCount(pendingTotal);
      } else if (user) {
        // Civilian: load my submitted reports
        const reports = await api.getMyReports();
        setMyReports(reports);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [isPolice, user]);

  useEffect(() => {
    if (!authLoading) {
      loadDashboardData();
    }
  }, [authLoading, loadDashboardData]);

  // Supabase Realtime synchronization (Postgres Changes)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('public:cases_and_evidence')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'evidence' },
        () => {
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDashboardData]);

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Top Welcome Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0f172a] border border-slate-800 p-6 rounded-2xl shadow-lg">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                  isPolice ? 'bg-blue-950 text-blue-400 border border-blue-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}>
                  {isPolice ? 'POLICE COMMAND AUTHORIZED' : 'PUBLIC CITIZEN SEARCH NETWORK'}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REALTIME SYNCHRONIZED
                </span>
              </div>

              <h1 className="text-2xl font-bold text-white">
                {isPolice ? 'Police Investigation Command Center' : 'Civilian Missing-Persons Search Portal'}
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {isPolice
                  ? 'TRACE connects fragmented multi-channel clues into movement hypotheses, prioritized search sectors, and high-value next clue guidance.'
                  : 'Report missing people, submit verified sighting clues, and view official police-verified case bulletins.'}
              </p>
            </div>

            <Link
              href="/cases/new"
              className={`flex items-center gap-2 px-4 py-2.5 text-white font-semibold text-xs rounded-xl shadow-lg shrink-0 transition-all ${
                isPolice
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{isPolice ? 'Create Official Case' : 'Report Missing Person'}</span>
            </Link>
          </div>

          {/* Metrics Overview Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                  {isPolice ? 'Active Police Inquiries' : 'Active Public Cases'}
                </div>
                <div className="text-2xl font-extrabold text-white font-mono">
                  {cases.filter(c => c.status === 'ACTIVE').length}
                </div>
              </div>
            </div>

            {isPolice ? (
              <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                    Civilian Reports Awaiting Review
                  </div>
                  <div className="text-2xl font-extrabold text-amber-400 font-mono">
                    {pendingReviewCount} Tips Pending
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                    My Submitted Sightings
                  </div>
                  <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {myReports.length} Submitted
                  </div>
                </div>
              </div>
            )}

            <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold">
                  TRACE Intelligence Engine
                </div>
                <div className="text-sm font-bold text-purple-300 font-mono">
                  v1.2 Active
                </div>
              </div>
            </div>
          </div>

          {/* Civilian Dedicated Section: My Submitted Sightings (Live Tracker) */}
          {!isPolice && user && myReports.length > 0 && (
            <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>My Submitted Sighting Reports (Live Review Status)</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">
                  Real-time updates as police review your reports
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myReports.map((report) => (
                  <div key={report.id} className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate max-w-[200px]">{report.title}</span>
                      <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                        report.verification_status === 'VERIFIED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : report.verification_status === 'REJECTED'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                      }`}>
                        {report.verification_status === 'VERIFIED' && <CheckCircle2 className="w-3 h-3" />}
                        {report.verification_status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {report.verification_status === 'PENDING' && <Clock className="w-3 h-3" />}
                        <span>{report.verification_status}</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 line-clamp-2">
                      {report.raw_description}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Submitted: {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-blue-400">TRACE Score: {report.overall_confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Cases Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>{isPolice ? 'Active Missing Person Investigations' : 'Active Public Search Bulletins'}</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Showing {cases.length} case(s)
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs font-mono">
                Loading TRACE workspace cases...
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-12 bg-[#0f172a] border border-slate-800 rounded-xl text-slate-400 text-xs">
                No active cases found. Click 'Report Missing Person' to create a new search bulletin.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {cases.map((c) => (
                  <CaseCard key={c.id} caseData={c} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
