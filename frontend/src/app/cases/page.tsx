'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import CaseCard from '@/components/cases/case-card';
import { api } from '@/lib/api';
import { Case } from '@/lib/types';
import { FolderOpen, Plus } from 'lucide-react';
import Link from 'next/link';

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCases() {
      try {
        const data = await api.getCases();
        setCases(data);
      } catch (err) {
        console.error('Failed to load cases:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, []);

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between bg-[#0f172a] border border-slate-800 p-6 rounded-2xl">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <FolderOpen className="w-6 h-6 text-blue-400" />
                <span>All Missing Person Cases</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                View active and closed TRACE intelligence cases.
              </p>
            </div>

            <Link
              href="/cases/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-900/40"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Case</span>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs font-mono">
              Loading cases...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cases.map((c) => (
                <CaseCard key={c.id} caseData={c} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
