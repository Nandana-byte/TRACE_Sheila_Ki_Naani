'use client';

import React, { useState } from 'react';
import { Case } from '@/lib/types';
import { MapPin, Clock, User, CheckCircle2, Lock, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { api } from '@/lib/api';

interface CaseHeaderProps {
  caseData: Case;
  onCaseUpdated?: (updated: Case) => void;
}

export default function CaseHeader({ caseData, onCaseUpdated }: CaseHeaderProps) {
  const { role } = useAuth();
  const isPolice = role === 'POLICE';
  const [isMarkingFound, setIsMarkingFound] = useState(false);

  const formattedTime = new Date(caseData.last_seen_time).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const handleMarkFound = async () => {
    if (!confirm(`Are you sure you want to mark ${caseData.missing_person_name} as FOUND? This will close public sightings and immediately hide sensitive personal details from civilian viewers.`)) {
      return;
    }

    setIsMarkingFound(true);
    try {
      const updated = await api.markFound(caseData.id);
      onCaseUpdated?.(updated);
    } catch (err: any) {
      alert(err?.message || 'Failed to mark case as found.');
    } finally {
      setIsMarkingFound(false);
    }
  };

  const isFound = caseData.status === 'FOUND';
  const isClosed = caseData.status === 'CLOSED';

  return (
    <div className="bg-[#0f172a] border-b border-slate-800 p-6 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-blue-400 bg-blue-950/80 px-2.5 py-1 rounded border border-blue-800/60 font-semibold">
              {caseData.case_number}
            </span>

            {isFound ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PERSON FOUND & SECURED</span>
              </span>
            ) : isClosed ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700/40 text-slate-300 border border-slate-600">
                <Lock className="w-3 h-3" />
                <span>CASE CLOSED</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>ACTIVE INVESTIGATION</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mt-2 flex items-center gap-3">
            <span>{caseData.missing_person_name}</span>
            <span className="text-sm font-normal text-slate-400">
              ({caseData.age} yrs, {caseData.gender || 'Unknown'})
            </span>
          </h1>

          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            {caseData.description} {caseData.clothing_description && `• Attire: ${caseData.clothing_description}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-6 bg-slate-900/80 border border-slate-800 px-4 py-2.5 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-mono">Last Known Location</div>
                <div className="font-semibold text-white truncate max-w-[200px]">
                  {caseData.last_seen_location}
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-800" />

            <div className="flex items-center gap-2 text-slate-300">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-mono">Last Seen Time</div>
                <div className="font-semibold text-white">{formattedTime}</div>
              </div>
            </div>
          </div>

          {/* Police Exclusive Authority Action: Mark Person Found */}
          {isPolice && caseData.status === 'ACTIVE' && (
            <button
              onClick={handleMarkFound}
              disabled={isMarkingFound}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isMarkingFound ? 'Updating Lifecycle...' : 'Mark Person Found'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
