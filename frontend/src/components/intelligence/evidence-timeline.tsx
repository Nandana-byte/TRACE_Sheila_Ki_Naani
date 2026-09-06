'use client';

import React from 'react';
import { Evidence } from '@/lib/types';
import {
  Video, Eye, Camera, Share2, Phone, Bus, Shield, HeartHandshake, Hospital,
  CheckCircle2, Clock, XCircle, Plus, Check, X, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

interface EvidenceTimelineProps {
  evidences: Evidence[];
  selectedId?: string;
  onSelectEvidence?: (ev: Evidence) => void;
  onOpenAddDialog?: () => void;
  onApproveEvidence?: (evId: string) => void;
  onRejectEvidence?: (evId: string) => void;
}

const SOURCE_ICONS: Record<string, any> = {
  CCTV: Video,
  WITNESS: Eye,
  PHOTO: Camera,
  SOCIAL_MEDIA: Share2,
  PHONE: Phone,
  PUBLIC_TRANSPORT: Bus,
  POLICE_REPORT: Shield,
  VOLUNTEER: HeartHandshake,
  HOSPITAL: Hospital,
  CIVILIAN_REPORT: Eye,
};

export default function EvidenceTimeline({
  evidences,
  selectedId,
  onSelectEvidence,
  onOpenAddDialog,
  onApproveEvidence,
  onRejectEvidence,
}: EvidenceTimelineProps) {
  const { role } = useAuth();
  const isPolice = role === 'POLICE';

  const sorted = [...evidences].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const pendingCount = evidences.filter(e => e.verification_status === 'PENDING').length;

  return (
    <div className="bg-[#0f172a] border-r border-slate-800 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div>
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <span>Evidence Timeline</span>
            <span className="text-xs font-mono font-normal text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800/60">
              {evidences.length} Clues
            </span>
            {pendingCount > 0 && isPolice && (
              <span className="text-xs font-mono font-semibold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Chronological multi-source evidence sequence
          </p>
        </div>

        {onOpenAddDialog && (
          <button
            onClick={onOpenAddDialog}
            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs flex items-center gap-1 shadow transition-all"
            title="Ingest New Clue"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Clue</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No evidence clues recorded yet.
          </div>
        ) : (
          sorted.map((ev, index) => {
            const Icon = SOURCE_ICONS[ev.source_type] || Eye;
            const isSelected = selectedId === ev.id;
            const isPending = ev.verification_status === 'PENDING';
            const isVerified = ev.verification_status === 'VERIFIED';
            const isRejected = ev.verification_status === 'REJECTED';

            const timeStr = new Date(ev.timestamp).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });

            return (
              <div
                key={ev.id}
                onClick={() => onSelectEvidence?.(ev)}
                className={`relative pl-6 pb-2 cursor-pointer group transition-all ${
                  index !== sorted.length - 1 ? 'border-l-2 border-slate-800 ml-3' : 'ml-3'
                }`}
              >
                {/* Timeline Node Icon */}
                <div
                  className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    isVerified
                      ? 'bg-slate-900 border-emerald-400 text-emerald-400'
                      : isRejected
                      ? 'bg-slate-900 border-red-500 text-red-500'
                      : 'bg-slate-900 border-amber-400 text-amber-400 animate-pulse'
                  } ${isSelected ? 'scale-125 ring-2 ring-blue-500' : ''}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                </div>

                <div
                  className={`p-3.5 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500/60 shadow-lg'
                      : isPending
                      ? 'bg-amber-950/20 border-amber-800/60'
                      : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-blue-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {timeStr}
                      </span>
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {ev.title}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800/40">
                      {ev.source_type}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                    {ev.raw_description}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                      <span>TRACE Confidence:</span>
                      <strong className="text-emerald-400 font-semibold">
                        {ev.overall_confidence || 80}%
                      </strong>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400">
                      {isVerified && (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED
                        </span>
                      )}
                      {isPending && (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Clock className="w-3 h-3" /> PENDING
                        </span>
                      )}
                      {isRejected && (
                        <span className="flex items-center gap-1 text-red-400 font-semibold">
                          <XCircle className="w-3 h-3" /> REJECTED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Police Review Action Buttons for Pending Clues */}
                  {isPolice && isPending && (
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRejectEvidence?.(ev.id);
                        }}
                        className="px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-300 rounded border border-red-800/60 flex items-center gap-1 text-[11px] font-medium transition-all"
                      >
                        <X className="w-3 h-3" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onApproveEvidence?.(ev.id);
                        }}
                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded flex items-center gap-1 text-[11px] font-semibold shadow-sm transition-all"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve & Verify</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
