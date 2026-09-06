'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, FileSearch, Cpu, ExternalLink,
  ShieldCheck, UserCheck, PlusCircle, CheckSquare, FileText
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

interface SidebarProps {
  caseId?: string;
  caseName?: string;
  caseNumber?: string;
}

export default function Sidebar({ caseId, caseName, caseNumber }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const isPolice = role === 'POLICE';

  const policeNavItems = [
    {
      label: 'Command Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'All Active Cases',
      href: '/cases',
      icon: FolderOpen,
    },
    ...(caseId ? [
      {
        label: 'Case Workspace',
        href: `/cases/${caseId}`,
        icon: FileSearch,
      },
      {
        label: 'Evidence Review Queue',
        href: `/cases/${caseId}/evidence`,
        icon: ShieldCheck,
      },
      {
        label: 'TRACE Intelligence Engine',
        href: `/cases/${caseId}/analysis`,
        icon: Cpu,
      }
    ] : []),
  ];

  const civilianNavItems = [
    {
      label: 'Active Public Cases',
      href: '/dashboard',
      icon: FolderOpen,
    },
    {
      label: 'Report Missing Person',
      href: '/cases/new',
      icon: PlusCircle,
    },
    ...(caseId ? [
      {
        label: 'View Case Bulletin',
        href: `/cases/${caseId}`,
        icon: FileText,
      },
      {
        label: 'Submit Sighting Clue',
        href: `/public/cases/${caseId}/report`,
        icon: ExternalLink,
      }
    ] : []),
  ];

  const navItems = isPolice ? policeNavItems : civilianNavItems;

  return (
    <aside className="w-64 bg-[#0a0f1d] border-r border-slate-800/80 flex flex-col justify-between p-4 shrink-0 hidden md:flex">
      <div className="space-y-6">
        {caseName && caseNumber ? (
          <div className="px-3 py-2.5 bg-slate-900/80 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold tracking-wider flex items-center justify-between">
              <span>Active Case</span>
              <span className="text-blue-400 font-mono text-[9px]">{caseNumber}</span>
            </div>
            <div className="font-semibold text-sm text-white mt-1 truncate">
              {caseName}
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 bg-slate-900/40 rounded-xl border border-slate-800/60">
            <div className="text-[10px] uppercase font-mono text-slate-400 font-semibold tracking-wider">
              {isPolice ? 'Police Operations Portal' : 'Public Search Network'}
            </div>
          </div>
        )}

        <nav className="space-y-1">
          <div className="text-[10px] uppercase font-mono text-slate-400 px-3 pb-2 tracking-wider">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3 border-t border-slate-800/80 pt-4">
        {caseId && (
          <div className="px-3 py-2.5 bg-blue-950/30 border border-blue-900/40 rounded-xl text-xs">
            <div className="flex items-center justify-between text-blue-300 font-medium mb-1">
              <span>Public Sighting Intake</span>
              <ExternalLink className="w-3 h-3 text-blue-400" />
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Direct civilian reporting link for public tips.
            </p>
            <Link
              href={`/public/cases/${caseId}/report`}
              className="inline-block mt-2 text-[11px] text-blue-400 hover:underline font-mono truncate max-w-full"
            >
              /public/cases/{caseId}/report →
            </Link>
          </div>
        )}

        <div className="text-[11px] text-slate-400 px-3 flex items-center justify-between font-mono">
          <span>TRACE Platform</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
}
