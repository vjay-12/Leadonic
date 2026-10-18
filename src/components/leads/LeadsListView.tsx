import React, { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  HeaderGroup,
  Header,
  Row,
  Cell,
} from '@tanstack/react-table'
import {
  Search,
  Download,
  Plus,
  Trash2,
  PhoneCall,
  Flame,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
} from 'lucide-react'
import { useLeadonic } from '../../context/LeadonicContext'
import { Lead, LeadStatus } from '../../types'
import { displayPhone } from '../../lib/phone'
import { exportLeadsToCsv } from '../../lib/excel'
import { formatShortDate } from '../../lib/utils'
import { leadsRepo } from '../../repos/leadsRepo'
import { AddLeadModal } from './AddLeadModal'

export const LeadsListView: React.FC = () => {
  const { leads, batches, openLeadDetail, refreshData, showToast } = useLeadonic()

  const [sorting, setSorting] = useState<SortingState>([{ id: 'score', desc: true }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [areaFilter, setAreaFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [batchFilter, setBatchFilter] = useState<string>('ALL')
  const [minScore, setMinScore] = useState<number>(0)
  const [doNotCallOnly, setDoNotCallOnly] = useState<boolean>(false)

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [showAddModal, setShowAddModal] = useState(false)

  // Unique filter values
  const uniqueAreas = useMemo(() => Array.from(new Set(leads.map((l) => l.area))).filter(Boolean), [leads])
  const uniqueCategories = useMemo(
    () => Array.from(new Set(leads.map((l) => l.category))).filter(Boolean),
    [leads]
  )

  // Filtered dataset
  const filteredData = useMemo(() => {
    return leads.filter((lead) => {
      if (statusFilter !== 'ALL' && lead.status !== statusFilter) return false
      if (areaFilter !== 'ALL' && lead.area !== areaFilter) return false
      if (categoryFilter !== 'ALL' && lead.category !== categoryFilter) return false
      if (batchFilter !== 'ALL' && lead.batchId !== batchFilter) return false
      if (minScore > 0 && lead.score < minScore) return false
      if (doNotCallOnly && !lead.doNotCall) return false

      if (globalFilter.trim()) {
        const q = globalFilter.toLowerCase()
        const match =
          lead.name.toLowerCase().includes(q) ||
          lead.phone.includes(q) ||
          lead.area.toLowerCase().includes(q) ||
          lead.category.toLowerCase().includes(q) ||
          lead.address.toLowerCase().includes(q)
        if (!match) return false
      }

      return true
    })
  }, [leads, statusFilter, areaFilter, categoryFilter, batchFilter, minScore, doNotCallOnly, globalFilter])

  // Bulk actions handlers
  const selectedLeadIds = Object.keys(rowSelection).filter((id) => rowSelection[id])

  const handleBulkStatusChange = async (newStatus: LeadStatus) => {
    if (selectedLeadIds.length === 0) return
    await leadsRepo.bulkUpdateStatus(selectedLeadIds, newStatus)
    showToast(`Updated ${selectedLeadIds.length} leads to ${newStatus}`, 'success')
    setRowSelection({})
    await refreshData()
  }

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return
    if (!window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} leads?`)) return
    await leadsRepo.bulkDelete(selectedLeadIds)
    showToast(`Deleted ${selectedLeadIds.length} leads`, 'info')
    setRowSelection({})
    await refreshData()
  }

  const handleExportSelected = () => {
    const toExport = leads.filter((l) => rowSelection[l.id])
    if (toExport.length === 0) {
      exportLeadsToCsv(filteredData, 'leadonic_filtered_leads.csv')
      showToast(`Exported ${filteredData.length} leads to CSV`, 'success')
    } else {
      exportLeadsToCsv(toExport, 'leadonic_selected_leads.csv')
      showToast(`Exported ${toExport.length} selected leads to CSV`, 'success')
    }
  }

  // TanStack Table columns
  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
          />
        ),
        cell: ({ row }: { row: Row<Lead> }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'name',
        header: 'Lead Name & Industry',
        cell: ({ row }: { row: Row<Lead> }) => {
          const lead = row.original
          return (
            <div className="min-w-[180px]">
              <button
                onClick={() => openLeadDetail(lead.id)}
                className="font-semibold text-white hover:text-indigo-400 text-left transition-colors flex items-center gap-1.5"
              >
                <span>{lead.name}</span>
                {lead.status === 'Interested' && (
                  <Flame className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
              </button>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>{lead.category}</span>
                <span>·</span>
                <span className="text-amber-400 font-medium">{lead.rating}★</span>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'phone',
        header: 'Contact',
        cell: ({ row }: { row: Row<Lead> }) => {
          const lead = row.original
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-300">{displayPhone(lead.phone)}</span>
              <a
                href={`tel:${lead.phone}`}
                className="p-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                title="Tap to call"
              >
                <PhoneCall className="w-3 h-3" />
              </a>
            </div>
          )
        },
      },
      {
        accessorKey: 'area',
        header: 'Location',
        cell: ({ row }: { row: Row<Lead> }) => {
          const lead = row.original
          return (
            <div className="text-xs">
              <div className="text-slate-200 font-medium">{lead.area}</div>
              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                {lead.address || '—'}
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'score',
        header: 'Score',
        cell: ({ row }: { row: Row<Lead> }) => {
          const score = row.original.score
          return (
            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              {score} pts
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Pipeline Status',
        cell: ({ row }: { row: Row<Lead> }) => {
          const status = row.original.status
          const dnd = row.original.doNotCall

          let color = 'bg-sky-500/15 text-sky-300 border-sky-500/30'
          if (status === 'Contacted') color = 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          if (status === 'Interested') color = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-bold'
          if (status === 'Lost') color = 'bg-slate-800 text-slate-400 border-slate-700'

          return (
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] px-2 py-0.5 rounded-full border ${color}`}>
                {status}
              </span>
              {dnd && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800">
                  DND
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'nextFollowup',
        header: 'Next Follow-up',
        cell: ({ row }: { row: Row<Lead> }) => {
          const followup = row.original.nextFollowup
          if (!followup) return <span className="text-slate-400 text-xs">—</span>
          return (
            <span className="text-xs text-amber-400 font-medium">
              {formatShortDate(followup)}
            </span>
          )
        },
      },
      {
        accessorKey: 'callCount',
        header: 'Calls',
        cell: ({ row }: { row: Row<Lead> }) => (
          <span className="font-mono text-xs text-slate-300">{row.original.callCount}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }: { row: Row<Lead> }) => (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => openLeadDetail(row.original.id)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
            >
              <Eye className="w-3 h-3 text-indigo-400" />
              <span>Detail</span>
            </button>
          </div>
        ),
      },
    ],
    [openLeadDetail]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 12,
      },
    },
  })

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Leads Directory</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
              {filteredData.length} records
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Multi-attribute lead database with inline filters, bulk updates, and CSV export
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportSelected}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Single Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by business name, phone, address, or category..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="Lost">Lost</option>
            </select>

            {/* Area dropdown */}
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Localities</option>
              {uniqueAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {/* Category dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Min Score filter */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300">
              <span className="text-[11px] text-slate-400">Min Score:</span>
              <input
                type="number"
                min="0"
                max="10"
                value={minScore}
                onChange={(e) => setMinScore(parseInt(e.target.value, 10) || 0)}
                className="w-10 bg-transparent text-center text-white focus:outline-none font-bold"
              />
            </div>

            {/* DND Only Toggle */}
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <input
                type="checkbox"
                checked={doNotCallOnly}
                onChange={(e) => setDoNotCallOnly(e.target.checked)}
                className="rounded border-slate-700 text-rose-500 focus:ring-0"
              />
              <span className="text-[11px]">DND Only</span>
            </label>
          </div>
        </div>

        {/* Bulk Actions Floating Bar */}
        {selectedLeadIds.length > 0 && (
          <div className="bg-indigo-950/80 border border-indigo-500/40 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in slide-in-from-top-1">
            <div className="flex items-center gap-2 text-indigo-200 font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{selectedLeadIds.length} leads selected</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px]">Bulk Status:</span>
              <button
                onClick={() => handleBulkStatusChange('Contacted')}
                className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-semibold"
              >
                Mark Contacted
              </button>
              <button
                onClick={() => handleBulkStatusChange('Interested')}
                className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 font-semibold"
              >
                Mark Interested
              </button>
              <button
                onClick={() => handleBulkStatusChange('Lost')}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 font-semibold"
              >
                Mark Lost
              </button>
              <button
                onClick={handleBulkDelete}
                className="p-1.5 rounded bg-rose-900/40 text-rose-300 border border-rose-700 hover:bg-rose-900/60 transition-colors ml-2"
                title="Delete selected"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TanStack Table Container */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              {table.getHeaderGroups().map((headerGroup: HeaderGroup<Lead>) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header: Header<Lead, unknown>) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className={`p-3.5 ${
                        header.column.getCanSort() ? 'cursor-pointer select-none hover:text-white' : ''
                      }`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="text-center py-12 text-slate-400 text-xs">
                    No leads match the selected filters.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row: Row<Lead>) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-850/60 transition-colors ${
                      row.getIsSelected() ? 'bg-indigo-950/30' : ''
                    }`}
                  >
                    {row.getVisibleCells().map((cell: Cell<Lead, unknown>) => (
                      <td key={cell.id} className="p-3.5 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredData.length
            )}{' '}
            of {filteredData.length} leads
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-200">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}
    </div>
  )
}
