'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Case, SourceType } from '@/lib/types';
import { Shield, MapPin, Clock, Camera, Send, CheckCircle2, AlertCircle, Lock } from 'lucide-react';

export default function PublicReportPage() {
  const params = useParams();
  const caseId = (params?.id as string) || 'TRACE-2026-0891';

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>('WITNESS');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timestamp, setTimestamp] = useState('2026-09-05T18:12');
  const [lat, setLat] = useState<number>(12.9250);
  const [lng, setLng] = useState<number>(79.1353);
  const [direction, setDirection] = useState('heading north towards Railway Station');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCase() {
      try {
        const c = await api.getCase(caseId);
        setCaseData(c);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadCase();
  }, [caseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.submitPublicReport(caseId, {
        source_type: sourceType,
        title: title || `Public Sighting at ${direction || 'Railway Road'}`,
        raw_description: description,
        timestamp: new Date(timestamp).toISOString(),
        latitude: Number(lat),
        longitude: Number(lng),
        direction,
        contact_info: contactInfo,
      });

      setIsSubmitted(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit sighting report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-xs font-mono">
        Loading public reporting portal...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/50 flex items-center justify-center text-blue-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TRACE Public Sighting Portal</h1>
              <p className="text-xs text-blue-400 font-mono">Official Police Missing Person Sighting Intake</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure & Encrypted</span>
          </div>
        </div>

        {/* Basic Missing Person Info (Public Safe) */}
        {caseData && (
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-base text-white">{caseData.missing_person_name}</span>
              <span className="font-mono text-[11px] text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-900">
                Case #{caseData.case_number}
              </span>
            </div>
            <p className="text-slate-300">
              Age: {caseData.age} yrs • Last Seen Area: <strong className="text-white">
                {caseData.last_seen_lat && caseData.last_seen_lng 
                  ? `${caseData.last_seen_lat.toFixed(4)}, ${caseData.last_seen_lng.toFixed(4)}`
                  : 'Coordinates recorded in case file'}
              </strong>
            </p>
            {caseData.clothing_description && (
              <p className="text-slate-400">
                Clothing: <span className="text-slate-200">{caseData.clothing_description}</span>
              </p>
            )}
            {caseData.status === 'FOUND' && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 font-semibold text-xs mt-2">
                ✓ Case Resolved: This individual has been safely located. Sighting intakes are closed.
              </div>
            )}
          </div>
        )}

        {isSubmitted ? (
          <div className="bg-emerald-950/40 border border-emerald-800 p-8 rounded-2xl text-center space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h2 className="text-lg font-bold text-white">Sighting Report Submitted Securely</h2>
            <p className="text-xs text-emerald-200 leading-relaxed max-w-md mx-auto">
              Thank you for helping. Your sighting report has been submitted to authorized police investigators. It will be reviewed by the lead officer before entering the TRACE intelligence layer.
            </p>

            <button
              onClick={() => setIsSubmitted(false)}
              className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl"
            >
              Submit Another Observation
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-xl text-[11px] text-blue-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Public submissions are reviewed by police investigators before official verification.</span>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Type of Observation</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              >
                <option value="WITNESS">Witness Sighting (Directly Seen)</option>
                <option value="PHOTO">Photograph Taken / Upload</option>
                <option value="SOCIAL_MEDIA">Social Media Observation</option>
                <option value="VOLUNTEER">Volunteer / Civilian Search Team</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Detailed Description of Sighting</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe where you saw the person, what they were wearing, who they were with..."
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Date & Time of Sighting</label>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observed Direction of Travel</label>
                <input
                  type="text"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  placeholder="e.g. Walking towards Railway Station"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <div>
                <label className="block text-slate-400 mb-1">Approx. Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Approx. Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value))}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Optional Contact Info (Phone / Email)</label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="Optional — kept strictly confidential for police follow-up"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting Sighting...' : 'Submit Sighting Report to Police'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
