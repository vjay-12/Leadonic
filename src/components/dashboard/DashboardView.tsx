import React, { useEffect, useState } from 'react'
import {
  PhoneCall,
  CalendarClock,
  UserPlus,
  Flame,
  TrendingUp,
  Clock,
  ArrowRight,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLeadonic } from '../../context/LeadonicContext'
import { callsRepo } from '../../repos/callsRepo'
import { formatShortDate } from '../../lib/utils'

export const DashboardView: React.FC = () => {
  const { stats, leads, queueLeads, activities, openLeadDetail } = useLeadonic()
  const [weeklyActivity, setWeeklyActivity] = useState<
    { date: string; label: string; count: number }[]
  >([])

  useEffect(() => {
    callsRepo.getCallsLast7Days().then(setWeeklyActivity)
  }, [activities])

  const maxWeeklyCalls = Math.max(...weeklyActivity.map((d) => d.count), 5)

  // Top urgent leads needing follow-up
  const urgentFollowups = leads
    .filter((l) => l.nextFollowup && !l.doNotCall && l.status !== 'Lost')
    .sort((a, b) => new Date(a.nextFollowup!).getTime() - new Date(b.nextFollowup!).getTime())
    .slice(0, 4)

  const conversionRate =
    stats.totalLeads > 0
      ? Math.round((stats.interestedLeads / (stats.totalLeads - stats.newLeads || 1)) * 100)
      : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Welcome / Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Phase 1 Browser Demo · Bangalore Focus</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome to Leadonic Outbound Engine
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Zero backend required. Import target lists, power-dial through sorted leads, log call
              outcomes with automated follow-up scheduling, and inspect live pipeline health.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/queue"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Start Calling Queue ({queueLeads.length})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/import"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold text-sm border border-slate-700 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Import Leads</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Core Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Calls Today */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Calls Today
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold text-white">{stats.callsToday}</div>
            <span className="text-xs text-emerald-400 font-medium">Logged today</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Target: 30 outbound calls/day</p>
        </div>

        {/* Follow-ups Due */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Follow-ups Due
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold text-amber-400">{stats.followupsDue}</div>
            <span className="text-xs text-amber-300 font-medium">Needs callback</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Prioritized at top of call queue</p>
        </div>

        {/* New Fresh Leads */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Fresh New Leads
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold text-sky-400">{stats.newLeads}</div>
            <span className="text-xs text-slate-400 font-medium">uncalled</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Ranked by smart lead score</p>
        </div>

        {/* Interested Opportunities */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Interested Leads
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold text-emerald-400">{stats.interestedLeads}</div>
            <span className="text-xs text-emerald-300 font-medium">Hot prospects</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{conversionRate}% active conversion rate</p>
        </div>
      </div>

      {/* Main Grid: Pipeline Funnel + Last 7 Days Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution Funnel (2 Cols) */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <span>Outbound Pipeline Funnel</span>
              </h2>
              <p className="text-xs text-slate-400">
                Live distribution across {stats.totalLeads} total leads in database
              </p>
            </div>
            <Link
              to="/leads"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <span>View Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/90 p-4 rounded-xl border border-sky-500/20">
              <div className="text-xs text-sky-400 font-medium mb-1">New Leads</div>
              <div className="text-2xl font-bold text-white">{stats.newLeads}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {stats.totalLeads > 0 ? Math.round((stats.newLeads / stats.totalLeads) * 100) : 0}% of list
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-amber-500/20">
              <div className="text-xs text-amber-400 font-medium mb-1">Contacted</div>
              <div className="text-2xl font-bold text-white">{stats.contactedLeads}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {stats.totalLeads > 0 ? Math.round((stats.contactedLeads / stats.totalLeads) * 100) : 0}% in progress
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-500/20">
              <div className="text-xs text-emerald-400 font-medium mb-1">Interested 🔥</div>
              <div className="text-2xl font-bold text-emerald-400">{stats.interestedLeads}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {stats.totalLeads > 0 ? Math.round((stats.interestedLeads / stats.totalLeads) * 100) : 0}% qualified
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700/40">
              <div className="text-xs text-slate-400 font-medium mb-1">Lost / DND</div>
              <div className="text-2xl font-bold text-slate-300">{stats.lostLeads}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {stats.totalLeads > 0 ? Math.round((stats.lostLeads / stats.totalLeads) * 100) : 0}% archived
              </div>
            </div>
          </div>

          {/* Funnel Visual Progress Bar */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Pipeline Stage Composition</span>
              <span>100% Normalized</span>
            </div>
            <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
              {stats.totalLeads > 0 ? (
                <>
                  <div
                    style={{ width: `${(stats.newLeads / stats.totalLeads) * 100}%` }}
                    className="bg-sky-500 h-full rounded-l-full transition-all"
                    title={`New: ${stats.newLeads}`}
                  />
                  <div
                    style={{ width: `${(stats.contactedLeads / stats.totalLeads) * 100}%` }}
                    className="bg-amber-500 h-full transition-all"
                    title={`Contacted: ${stats.contactedLeads}`}
                  />
                  <div
                    style={{ width: `${(stats.interestedLeads / stats.totalLeads) * 100}%` }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`Interested: ${stats.interestedLeads}`}
                  />
                  <div
                    style={{ width: `${(stats.lostLeads / stats.totalLeads) * 100}%` }}
                    className="bg-slate-600 h-full rounded-r-full transition-all"
                    title={`Lost: ${stats.lostLeads}`}
                  />
                </>
              ) : (
                <div className="w-full bg-slate-800 h-full rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* 7-Day Call Volume Chart */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Last 7 Days Calls</span>
                </h2>
                <p className="text-xs text-slate-400">Daily calling pace</p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {weeklyActivity.reduce((acc, d) => acc + d.count, 0)} calls
              </span>
            </div>

            {/* Bar Chart Graphic */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 px-1">
              {weeklyActivity.map((day) => {
                const heightPercent = Math.max((day.count / maxWeeklyCalls) * 100, 8)
                const isTodayBar = day.label === 'Today'

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
                    <span className="text-[10px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.count}
                    </span>
                    <div className="w-full bg-slate-900 rounded-t-lg h-32 flex items-end p-0.5 overflow-hidden">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-md transition-all duration-500 ${
                          isTodayBar
                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                            : 'bg-gradient-to-t from-indigo-700 to-indigo-500 group-hover:from-indigo-600 group-hover:to-indigo-400'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-medium truncate ${
                        isTodayBar ? 'text-emerald-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {day.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Power caller quota: 30 / day</span>
            <Link to="/queue" className="text-indigo-400 hover:underline">
              Resume calling →
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section: Urgent Follow-ups & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Follow-ups Due */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-400" />
                <span>Follow-ups Scheduled</span>
              </h2>
              <p className="text-xs text-slate-400">Callbacks scheduled from previous calls</p>
            </div>
            <Link to="/tasks" className="text-xs text-amber-400 hover:underline font-medium">
              View all tasks →
            </Link>
          </div>

          {urgentFollowups.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/60" />
              No pending follow-ups right now. Fresh leads are ready in the queue!
            </div>
          ) : (
            <div className="space-y-2.5">
              {urgentFollowups.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 transition-all"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openLeadDetail(lead.id)}
                        className="text-sm font-semibold text-white hover:text-indigo-400 truncate text-left"
                      >
                        {lead.name}
                      </button>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {lead.category}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                      <span>{lead.area}</span>
                      <span>·</span>
                      <span className="text-amber-400 font-medium">
                        Due: {formatShortDate(lead.nextFollowup)}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/queue"
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Timeline */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Live Activity Stream</span>
              </h2>
              <p className="text-xs text-slate-400">Real-time audit trail of all actions</p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Live Stream
            </span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {activities.slice(0, 7).map((act) => (
              <div key={act.id} className="flex items-start gap-3 text-xs">
                <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-slate-200 font-medium leading-snug">{act.text}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatShortDate(act.at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
