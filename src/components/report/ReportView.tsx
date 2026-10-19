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
    queryFn: () => {
      const params: { categoryId?: string; from?: string; to?: string } = {}
      if (selectedCategory) params.categoryId = selectedCategory
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      return api.getReport(params)
    },
  })

  const handleDownloadCsv = () => {
    const q = new URLSearchParams()
    if (selectedCategory) q.set('categoryId', selectedCategory)
    if (fromDate) q.set('from', fromDate)
    if (toDate) q.set('to', toDate)
    window.location.href = `/api/report/csv?${q.toString()}`
  }

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-slate-900 tracking-tight">Pipeline Report</h1>
          <p className="text-[13px] text-slate-500">Cross-tabulation matrix of categories and calling outcomes</p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-1.5 h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-medium transition-colors cursor-pointer shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-[10px] p-2.5 shadow-2xs flex flex-wrap items-center gap-2.5">
        {/* Category filter */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
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
        <div className="h-8 flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-300 rounded-lg px-2.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>From:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-transparent text-[12px] text-slate-800 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Date To */}
        <div className="h-8 flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-300 rounded-lg px-2.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>To:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-transparent text-[12px] text-slate-800 focus:outline-none cursor-pointer"
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
            className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-[10px] shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-[13px] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Calculating matrix report...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center max-w-sm mx-auto">
            <AlertCircle className="w-7 h-7 text-rose-500 mx-auto mb-2" />
            <p className="text-[14px] font-semibold text-slate-900 mb-1">Failed to generate report</p>
            <p className="text-[12px] text-slate-500 mb-3">{(error as any)?.message}</p>
            <button
              onClick={() => refetch()}
              className="h-8 px-3 bg-blue-600 text-white rounded-lg text-[13px] font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : !report || report.rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-[13px]">
            No leads or categories available for this report.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-[13px]">
              <thead className="bg-slate-50 h-9">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700 uppercase tracking-wider text-[11px] sticky left-0 bg-slate-50">
                    Category
                  </th>
                  {report.statuses.map((s) => (
                    <th
                      key={s.id}
                      className="px-3 py-2 text-center font-semibold text-slate-700 uppercase tracking-wider text-[11px]"
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
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Not Called
                  </th>
                  <th className="px-3 py-2 text-center font-bold text-slate-900 uppercase tracking-wider text-[11px] bg-slate-100">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {report.rows.map((row) => (
                  <tr key={row.categoryId ?? 'uncategorized'} className="h-[44px] hover:bg-slate-50/70">
                    <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap sticky left-0 bg-white hover:bg-slate-50">
                      {row.categoryName}
                    </td>
                    {report.statuses.map((s) => {
                      const count = row.counts[String(s.id)] || 0
                      return (
                        <td
                          key={s.id}
                          className={`px-3 py-2.5 text-center font-mono ${
                            count > 0 ? 'text-slate-900 font-semibold' : 'text-slate-300'
                          }`}
                        >
                          {count}
                        </td>
                      )
                    })}
                    <td
                      className={`px-3 py-2.5 text-center font-mono ${
                        (row.counts['not_called'] || 0) > 0 ? 'text-slate-700 font-medium' : 'text-slate-300'
                      }`}
                    >
                      {row.counts['not_called'] || 0}
                    </td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-900 font-mono bg-slate-50/50">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Grand Total Footer */}
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 h-9">
                <tr>
                  <td className="px-3 py-2 font-bold sticky left-0 bg-slate-100 uppercase text-[11px] tracking-wider">
                    Total
                  </td>
                  {report.statuses.map((s) => (
                    <td key={s.id} className="px-3 py-2 text-center font-mono text-[13px]">
                      {report.totalCounts[String(s.id)] || 0}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-mono text-[13px] text-slate-700">
                    {report.totalCounts['not_called'] || 0}
                  </td>
                  <td className="px-3 py-2 text-center font-mono text-[13px] bg-blue-50 text-blue-900 font-extrabold">
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
