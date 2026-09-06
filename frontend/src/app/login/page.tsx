'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, User, ArrowRight, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('officer@trace.demo');
  const [password, setPassword] = useState('police_demo_password');
  const [role, setRole] = useState<'POLICE' | 'CIVILIAN'>('POLICE');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await login(email, password, role);
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectDemoAccount = (demoRole: 'POLICE' | 'CIVILIAN') => {
    setRole(demoRole);
    if (demoRole === 'POLICE') {
      setEmail('officer@trace.demo');
      setPassword('police_demo_password');
    } else {
      setEmail('citizen@trace.demo');
      setPassword('civilian_demo_password');
    }
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/50 flex items-center justify-center mb-3">
            <Shield className="w-7 h-7 text-blue-400" />
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-wider">TRACE</h1>
          <p className="text-xs text-blue-400 font-mono mt-0.5">
            AI-POWERED MISSING-PERSONS SEARCH PLATFORM
          </p>

          <p className="text-xs text-slate-400 mt-2 leading-relaxed italic">
            "Every sighting is a clue. Every clue makes the search smarter."
          </p>
        </div>

        {/* Demo Account Quick Switcher */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider text-center">
            Demo Access Persona
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectDemoAccount('POLICE')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                role === 'POLICE'
                  ? 'bg-blue-600/30 border-blue-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Police Officer</span>
            </button>

            <button
              type="button"
              onClick={() => selectDemoAccount('CIVILIAN')}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                role === 'CIVILIAN'
                  ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-md'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Civilian / Public</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              {role === 'POLICE' ? 'Police Department Email' : 'Civilian User Email'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Security Credential / Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-[11px] text-slate-300 flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span>
              {role === 'POLICE'
                ? 'Authorized Police Access: Investigation command, evidence approval, trajectory & search priority controls.'
                : 'Civilian Access: Create missing person cases, submit sighting tips, and track report review status in real time.'}
            </span>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <span>{isLoading ? 'Authenticating...' : `Enter TRACE (${role === 'POLICE' ? 'Police Portal' : 'Civilian Portal'})`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
