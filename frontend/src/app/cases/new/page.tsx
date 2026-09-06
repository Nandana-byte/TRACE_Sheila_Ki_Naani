'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import { api } from '@/lib/api';
import { Shield, MapPin, Clock, ArrowRight, Sparkles } from 'lucide-react';

export default function NewCasePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(14);
  const [gender, setGender] = useState('Female');
  const [description, setDescription] = useState('');
  const [clothing, setClothing] = useState('');
  const [lastSeenTime, setLastSeenTime] = useState('2026-09-05T17:45');
  const [lat, setLat] = useState<number>(12.9260);
  const [lng, setLng] = useState<number>(79.1340);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const created = await api.createCase({
        missing_person_name: name,
        age: Number(age),
        gender,
        description,
        clothing_description: clothing,
        last_seen_time: new Date(lastSeenTime).toISOString(),
        last_seen_lat: Number(lat),
        last_seen_lng: Number(lng),
      });

      router.push(`/cases/${created.id}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to create case');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto space-y-6 w-full">
          <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Create Official TRACE Case</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Police-authorized case activation. Initializes TRACE intelligence pipeline.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    Missing Person Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ananya Sharma"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value))}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Last Seen Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={lastSeenTime}
                    onChange={(e) => setLastSeenTime(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  General Profile & Physical Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Height, hair color, distinguishing marks, context..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Clothing Description at Disappearance
                </label>
                <textarea
                  rows={2}
                  value={clothing}
                  onChange={(e) => setClothing(e.target.value)}
                  placeholder="e.g. Blue school top, dark trousers, carrying black backpack..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white"
                />
              </div>

              <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <MapPin className="w-4 h-4 text-red-400" />
                  <span>Last Known General Location Coordinates</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value))}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value))}
                      required
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSubmitting ? 'Activating TRACE Case...' : 'Activate Case & Run Intelligence'}</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
