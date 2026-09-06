'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Radio, User, Plus, LogOut, LogIn, Eye } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

export default function Navbar() {
  const router = useRouter();
  const { user, role, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isPolice = role === 'POLICE';

  return (
    <header className="h-16 bg-[#0c1322] border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-50 shadow-lg">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/50 flex items-center justify-center group-hover:border-blue-400 transition-all">
            <Shield className="w-5 h-5 text-blue-400 group-hover:scale-105 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-wider text-white">TRACE</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {isPolice ? 'POLICE INTELLIGENCE' : 'CIVILIAN SEARCH PORTAL'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden md:block">
              Every sighting is a clue. Every clue makes the search smarter.
            </p>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link
              href="/cases/new"
              className={`flex items-center gap-2 px-3.5 py-1.5 text-white font-medium text-xs rounded-lg shadow-sm transition-all ${
                isPolice ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{isPolice ? 'Create Official Case' : 'Report Missing Person'}</span>
            </Link>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold ${
                isPolice ? 'bg-blue-950/80 border-blue-600 text-blue-300' : 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
              }`}>
                {isPolice ? 'POL' : 'CIV'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="font-semibold text-white truncate max-w-[180px]">
                  {user.email}
                </div>
                <div className="text-[10px] flex items-center gap-1 font-mono">
                  <span className={isPolice ? 'text-blue-400' : 'text-emerald-400'}>
                    {user.role}
                  </span>
                  <span className="text-slate-500">• Verified Identity</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Log out"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow-md transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>Login to TRACE</span>
          </Link>
        )}
      </div>
    </header>
  );
}
