import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Users, Calendar, PhoneOff, ThumbsUp, RefreshCw, AlertCircle, PhoneCall } from 'lucide-react'

export const DashboardView: React.FC = () => {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboard(),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Pipeline summary and key metrics</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-lg p-5 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-white border border-slate-200 rounded-lg p-5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-8 bg-white border border-rose-200 rounded-lg text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-slate-900 mb-1">Failed to load dashboard</h2>
        <p className="text-sm text-slate-500 mb-4">{(error as any)?.message || 'Something went wrong.'}</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500">Pipeline summary and key calling metrics</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.bg}`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          )
        })}
      </div>

      {/* 3 Simple Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* By Status */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Leads by Status
          </h2>
          <div className="space-y-3">
            {stats.byStatus.map((s) => {
              const pct = stats.total > 0 ? Math.round((s.count / stats.total) * 100) : 0
              return (
                <div key={s.id} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="font-medium text-slate-700">{s.name}</span>
                    </span>
                    <span className="text-slate-500 font-semibold text-xs">
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
            <div className="text-sm pt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">Not called</span>
                </span>
                <span className="text-slate-500 font-semibold text-xs">
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
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Leads by Category
          </h2>
          {stats.byCategory.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No categories yet</p>
          ) : (
            <div className="space-y-3">
              {stats.byCategory.map((c) => {
                const pct = stats.total > 0 ? Math.round((c.count / stats.total) * 100) : 0
                return (
                  <div key={c.id} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700">{c.name}</span>
                      <span className="text-slate-500 font-semibold text-xs">
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
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs">
          <h2 className="text-sm font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
            Leads by Priority
          </h2>
          <div className="space-y-3">
            {stats.byPriority.map((p) => {
              const pct = stats.total > 0 ? Math.round((p.count / stats.total) * 100) : 0
              let barColor = 'bg-slate-400'
              if (p.priority.toLowerCase() === 'high') barColor = 'bg-rose-500'
              if (p.priority.toLowerCase() === 'medium') barColor = 'bg-amber-500'
              if (p.priority.toLowerCase() === 'low') barColor = 'bg-slate-400'

              return (
                <div key={p.priority} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-700">{p.priority}</span>
                    <span className="text-slate-500 font-semibold text-xs">
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
