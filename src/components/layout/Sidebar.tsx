import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  PhoneCall,
  Users,
  FileSpreadsheet,
  CheckSquare,
  FileText,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useLeadonic } from '../../context/LeadonicContext'

export const Sidebar: React.FC<{ isOpen: boolean; onClose?: () => void }> = ({ isOpen, onClose }) => {
  const { stats, queueLeads } = useLeadonic()

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/queue',
      label: 'Call Queue',
      icon: PhoneCall,
      badge: queueLeads.length > 0 ? queueLeads.length : null,
      highlight: true,
    },
    {
      to: '/leads',
      label: 'Leads Directory',
      icon: Users,
      badge: stats.totalLeads > 0 ? stats.totalLeads : null,
    },
    {
      to: '/tasks',
      label: 'Follow-ups & Tasks',
      icon: CheckSquare,
      badge: stats.followupsDue > 0 ? stats.followupsDue : null,
      urgent: stats.followupsDue > 0,
    },
    {
      to: '/import',
      label: 'Import Excel / CSV',
      icon: FileSpreadsheet,
      badge: 'Wizard',
    },
    {
      to: '/templates',
      label: 'Scripts & Messages',
      icon: FileText,
      badge: null,
    },
    {
      to: '/settings',
      label: 'Rules & Settings',
      icon: Settings,
      badge: null,
    },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950/95 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Zap className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-white font-sans">
                Leadonic
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 rounded border border-emerald-500/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Smart Outbound CRM</p>
          </div>
        </div>

        {/* Quick Hero Calling Action */}
        <div className="p-3.5">
          <NavLink
            to="/queue"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md shadow-indigo-900/30 border border-indigo-400/20 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center group-hover:scale-105 transition-transform">
                <PhoneCall className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold">Start Power Calling</div>
                <div className="text-[10px] text-indigo-200">{queueLeads.length} leads in queue</div>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
          </NavLink>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Main Pipeline
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm shadow-indigo-950'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      item.urgent
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                        : item.highlight
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>

        {/* Live Daily Stats Card in Sidebar */}
        <div className="p-3 m-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="font-medium text-[11px]">Today's Activity</span>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live DB
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/50">
              <div className="text-base font-bold text-white">{stats.callsToday}</div>
              <div className="text-[10px] text-slate-400">Calls Done</div>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/50">
              <div className="text-base font-bold text-amber-400">{stats.followupsDue}</div>
              <div className="text-[10px] text-slate-400">Follow-ups</div>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-center text-slate-400">
            Browser Local Dexie DB · Safe on refresh
          </div>
        </div>
      </aside>
    </>
  )
}
