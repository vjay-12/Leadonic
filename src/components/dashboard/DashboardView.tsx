import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Users, Calendar, PhoneOff, ThumbsUp, RefreshCw, AlertCircle, PhoneCall } from 'lucide-react'
import { PageHeader } from '../common/PageHeader'

export const DashboardView: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
  })

  if (isLoading) {
    return (
      <div className="space-y-3.5">
        <PageHeader
          title="Dashboard"
          subtitle="Pipeline summary and key calling metrics"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-white border border-slate-200 rounded-[10px] p-3.5 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-white border border-slate-200 rounded-[10px] p-3.5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6 bg-white border border-rose-200 rounded-[10px] text-center max-w-lg mx-auto mt-10">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2.5" />
        <h2 className="text-[14px] font-semibold text-slate-900 mb-1">Failed to load dashboard</h2>
        <p className="text-[13px] text-slate-500 mb-3.5">{(error as any)?.message || 'Something went wrong.'}</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-blue-600 text-white rounded-lg text-[13px] font-medium hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  const stats = data!

  // Compute "Interested" count from byStatus
  const interestedCount = stats.byStatus
    .filter((s) => s.name.toLowerCase().includes('interested') && !s.name.toLowerCase().includes('not'))
    .reduce((acc, curr) => acc + curr.count, 0)

  const statCards = [
    {
      title: 'Total Leads',
      value: stats.total,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Contacted Today',
      value: stats.contactedToday ?? 0,
      icon: PhoneCall,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
    {
      title: 'New This Week',
      value: stats.newThisWeek,
      icon: Calendar,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Not Called',
      value: stats.notCalled,
      icon: PhoneOff,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      title: 'Interested',
      value: interestedCount,
      icon: ThumbsUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="space-y-3.5">
      {/* Standardized Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Pipeline summary and key calling metrics"
        actions={
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[13px] font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Top 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs flex items-center justify-between"
            >
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </p>
                <p className="text-[22px] font-bold text-slate-900 mt-0.5 leading-tight">{card.value}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${card.bg}`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 3 Simple Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* By Status */}
        <div className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs">
          <h2 className="text-[14px] font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">
            Leads by Status
          </h2>
          <div className="space-y-2.5">
            {stats.byStatus.map((s) => {
              const pct = stats.total > 0 ? Math.round((s.count / stats.total) * 100) : 0
              return (
                <div key={s.id} className="text-[13px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="font-medium text-slate-700">{s.name}</span>
                    </span>
                    <span className="text-slate-500 font-semibold text-[11px]">
                      {s.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              )
            })}
            {/* Not called row */}
            <div className="text-[13px] pt-0.5">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">Not called</span>
                </span>
                <span className="text-slate-500 font-semibold text-[11px]">
                  {stats.notCalled} ({stats.total > 0 ? Math.round((stats.notCalled / stats.total) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-slate-400"
                  style={{
                    width: `${stats.total > 0 ? Math.round((stats.notCalled / stats.total) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* By Category */}
        <div className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs">
          <h2 className="text-[14px] font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">
            Leads by Category
          </h2>
          {stats.byCategory.length === 0 ? (
            <p className="text-[11px] text-slate-400 py-3 text-center">No categories yet</p>
          ) : (
            <div className="space-y-2.5">
              {stats.byCategory.map((c) => {
                const pct = stats.total > 0 ? Math.round((c.count / stats.total) * 100) : 0
                return (
                  <div key={c.id} className="text-[13px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700">{c.name}</span>
                      <span className="text-slate-500 font-semibold text-[11px]">
                        {c.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* By Priority */}
        <div className="bg-white border border-slate-200 rounded-[10px] p-3.5 shadow-2xs">
          <h2 className="text-[14px] font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">
            Leads by Priority
          </h2>
          <div className="space-y-2.5">
            {stats.byPriority.map((p) => {
              const pct = stats.total > 0 ? Math.round((p.count / stats.total) * 100) : 0
              let barColor = 'bg-slate-400'
              if (p.priority.toLowerCase() === 'high') barColor = 'bg-rose-500'
              if (p.priority.toLowerCase() === 'medium') barColor = 'bg-amber-500'
              if (p.priority.toLowerCase() === 'low') barColor = 'bg-slate-400'

              return (
                <div key={p.priority} className="text-[13px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-700">{p.priority}</span>
                    <span className="text-slate-500 font-semibold text-[11px]">
                      {p.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${barColor} transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
