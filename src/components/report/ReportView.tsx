import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Download, RefreshCw, AlertCircle, Calendar } from 'lucide-react'

export const ReportView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  // Fetch categories for filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  })

  // Fetch Report Data
  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['report', { selectedCategory, fromDate, toDate }],
    queryFn: () =>
      api.getReport({
        categoryId: selectedCategory || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      }),
  })

  const handleDownloadCsv = () => {
    const q = new URLSearchParams()
    if (selectedCategory) q.set('categoryId', selectedCategory)
    if (fromDate) q.set('from', fromDate)
    if (toDate) q.set('to', toDate)
    window.location.href = `/api/report/csv?${q.toString()}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pipeline Report</h1>
          <p className="text-sm text-slate-500">Cross-tabulation matrix of categories and calling outcomes</p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold transition-colors cursor-pointer shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Download CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-2xs flex flex-wrap items-center gap-3">
        {/* Category filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-transparent text-xs text-slate-800 focus:outline-none"
          />
        </div>

        {/* Date To */}
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-transparent text-xs text-slate-800 focus:outline-none"
          />
        </div>

        {/* Reset button */}
        {(selectedCategory || fromDate || toDate) && (
          <button
            onClick={() => {
              setSelectedCategory('')
              setFromDate('')
              setToDate('')
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Calculating matrix report...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center max-w-sm mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900 mb-1">Failed to generate report</p>
            <p className="text-xs text-slate-500 mb-3">{(error as any)?.message}</p>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium"
            >
              Retry
            </button>
          </div>
        ) : !report || report.rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No leads or categories available for this report.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-700 uppercase tracking-wider sticky left-0 bg-slate-50">
                    Category
                  </th>
                  {report.statuses.map((s) => (
                    <th
                      key={s.id}
                      className="px-4 py-3 text-center font-semibold text-slate-700 uppercase tracking-wider"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span>{s.name}</span>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold text-slate-500 uppercase tracking-wider">
                    Not Called
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-slate-900 uppercase tracking-wider bg-slate-100">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {report.rows.map((row) => (
                  <tr key={row.categoryId ?? 'uncategorized'} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap sticky left-0 bg-white hover:bg-slate-50">
                      {row.categoryName}
                    </td>
                    {report.statuses.map((s) => {
                      const count = row.counts[String(s.id)] || 0
                      return (
                        <td
                          key={s.id}
                          className={`px-4 py-3 text-center font-mono ${
                            count > 0 ? 'text-slate-900 font-semibold' : 'text-slate-300'
                          }`}
                        >
                          {count}
                        </td>
                      )
                    })}
                    <td
                      className={`px-4 py-3 text-center font-mono ${
                        (row.counts.not_called || 0) > 0 ? 'text-slate-700 font-medium' : 'text-slate-300'
                      }`}
                    >
                      {row.counts.not_called || 0}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-900 font-mono bg-slate-50/50">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Grand Total Footer */}
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td className="px-4 py-3 font-bold sticky left-0 bg-slate-100 uppercase text-[11px] tracking-wider">
                    Total
                  </td>
                  {report.statuses.map((s) => (
                    <td key={s.id} className="px-4 py-3 text-center font-mono text-sm">
                      {report.totalCounts[String(s.id)] || 0}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center font-mono text-sm text-slate-700">
                    {report.totalCounts.not_called || 0}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-sm bg-blue-50 text-blue-900 font-extrabold">
                    {report.grandTotal}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
