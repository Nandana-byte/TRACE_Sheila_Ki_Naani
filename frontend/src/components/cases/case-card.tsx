'use client';

import React from 'react';
import Link from 'next/link';
import { Case } from '@/lib/types';
import { MapPin, Clock, FileText, ArrowRight, UserCheck } from 'lucide-react';

interface CaseCardProps {
  caseData: Case;
}

export default function CaseCard({ caseData }: CaseCardProps) {
  const formattedTime = new Date(caseData.last_seen_time).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 hover:border-blue-500/50 transition-all group flex flex-col justify-between shadow-lg">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="font-mono text-xs text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900/60">
            {caseData.case_number}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            caseData.status === 'ACTIVE'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}>
            {caseData.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
            {caseData.status}
          </span>
        </div>

        <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
          {caseData.missing_person_name}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {caseData.age} years old • {caseData.gender || 'Female'}
        </p>

        <p className="text-xs text-slate-300 mt-3 line-clamp-2 leading-relaxed">
          {caseData.description}
        </p>

        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="truncate">
              {caseData.last_seen_lat && caseData.last_seen_lng
                ? `${caseData.last_seen_lat.toFixed(4)}, ${caseData.last_seen_lng.toFixed(4)}`
                : 'Coordinates pending'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <FileText className="w-3.5 h-3.5 text-blue-400" />
          <span>{caseData.evidences?.length ?? 0} Clues</span>
        </div>

        <Link
          href={`/cases/${caseData.id}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 group-hover:text-blue-300 hover:underline"
        >
          <span>Open TRACE Workspace</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
