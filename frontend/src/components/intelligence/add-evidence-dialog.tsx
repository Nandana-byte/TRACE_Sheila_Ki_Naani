'use client';

import React, { useState } from 'react';
import { SourceType } from '@/lib/types';
import { X, Upload, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface AddEvidenceDialogProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    source_type: SourceType;
    title: string;
    raw_description: string;
    file_url?: string;
    timestamp: string;
    latitude: number;
    longitude: number;
    direction?: string;
  }) => Promise<void>;
}

export default function AddEvidenceDialog({
  caseId,
  isOpen,
  onClose,
  onSubmit,
}: AddEvidenceDialogProps) {
  const [sourceType, setSourceType] = useState<SourceType>('WITNESS');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timestamp, setTimestamp] = useState('2026-09-05T18:12');
  const [latitude, setLatitude] = useState(12.9250);
  const [longitude, setLongitude] = useState(79.1353);
  const [direction, setDirection] = useState('moving toward Railway Station');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      setStatusMessage('1. Extracting metadata...');
      await new Promise(r => setTimeout(r, 400));

      setStatusMessage('2. AI Multimodal extraction running...');
      await new Promise(r => setTimeout(r, 400));

      setStatusMessage('3. Evidence Fusion & Trajectory recalculation...');
      await onSubmit({
        source_type: sourceType,
        title: title || `${sourceType} Observation`,
        raw_description: description,
        timestamp: new Date(timestamp).toISOString(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        direction,
      });

      setStatusMessage('TRACE Intelligence Updated!');
      await new Promise(r => setTimeout(r, 300));
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Error adding evidence');
    } finally {
      setIsSubmitting(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">Ingest New Evidence Clue</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Evidence Source Type</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="CCTV">CCTV Footage</option>
              <option value="WITNESS">Witness Sighting</option>
              <option value="PHOTO">Photograph / Upload</option>
              <option value="SOCIAL_MEDIA">Social Media Post</option>
              <option value="PHONE">Phone / Cell Tower</option>
              <option value="PUBLIC_TRANSPORT">Public Transport Record</option>
              <option value="POLICE_REPORT">Police Report</option>
              <option value="VOLUNTEER">Volunteer Search Team</option>
              <option value="HOSPITAL">Hospital Admission</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Clue Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Verified Witness Sighting — Railway Road"
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Raw Description / Observation</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe observation, clothing seen, direction of travel, carrying items..."
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Timestamp</label>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Direction</label>
              <input
                type="text"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                placeholder="e.g. Railway Station"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
          </div>

          {isSubmitting && (
            <div className="p-3 bg-blue-950/60 border border-blue-800 rounded-xl text-blue-300 flex items-center gap-2 font-mono text-[11px] animate-pulse">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-900/40 disabled:opacity-50"
            >
              {isSubmitting ? 'Analyzing...' : 'Run TRACE Analysis'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
