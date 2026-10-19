import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { School } from '../../types'
import { formatDateShort } from '../../../lib/date'
import { RecordMeetingDialog } from './RecordMeetingDialog'
import { SegmentedTabs } from '../common/SegmentedTabs'
import { StatusPill, useStatusPillWidth } from '../common/StatusPill'
import {
  Search,
  Plus,
  RefreshCw,
  Phone,
  AlertCircle,
  X,
  PhoneCall,
  MapPin,
  User,
  GraduationCap,
} from 'lucide-react'

export const SchoolErpView: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  // Filters & Pagination
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [archivedFilter, setArchivedFilter] = useState<'active' | 'archived'>('active')
  const [page, setPage] = useState(1)
  const pageSize = 50

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [recordTargetSchool, setRecordTargetSchool] = useState<School | null>(null)

  // Add School form state
  const [newSchoolName, setNewSchoolName] = useState('')
  const [newSchoolArea, setNewSchoolArea] = useState('')
  const [newSchoolAddress, setNewSchoolAddress] = useState('')
  const [newSchoolPhone, setNewSchoolPhone] = useState('')
  const [newSchoolEmail, setNewSchoolEmail] = useState('')
  const [newSchoolWebsite, setNewSchoolWebsite] = useState('')
  const [newSchoolStrength, setNewSchoolStrength] = useState('')
  const [newSchoolNotes, setNewSchoolNotes] = useState('')

  // Optional primary contact on create
  const [hasPrimaryContact, setHasPrimaryContact] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactNotes, setContactNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Fetch Stages
  const { data: stages = [] } = useQuery({
    queryKey: ['schoolStages'],
    queryFn: () => api.getSchoolStages(),
  })

  // Synchronize stage pill widths
  useStatusPillWidth(stages)

  // Escape key handler for modals
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (recordTargetSchool) setRecordTargetSchool(null)
        else if (isAddModalOpen) setIsAddModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [recordTargetSchool, isAddModalOpen])

  // Fetch Areas
  const { data: areas = [] } = useQuery({
    queryKey: ['schoolAreas'],
    queryFn: () => api.getSchoolAreas(),
  })

  // Fetch Schools
  const {
    data: schoolsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['schools', { search, stageFilter, areaFilter, archivedFilter, page }],
    queryFn: () =>
      api.getSchools({
        search: search || undefined,
        stageId: stageFilter || undefined,
        area: areaFilter || undefined,
        archived: archivedFilter,
        page,
        pageSize,
      }),
  })

  // Add School mutation
  const createSchoolMutation = useMutation({
    mutationFn: (data: any) => api.createSchool(data),
    onSuccess: (newSchool) => {
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      queryClient.invalidateQueries({ queryKey: ['schoolAreas'] })
      success(`School "${newSchool.name}" added successfully`)
      resetAddForm()
      setIsAddModalOpen(false)
    },
    onError: (err: any) => {
      const msg = err.message || 'Failed to create school'
      setFormError(msg)
      toastError(msg)
    },
  })

  const resetAddForm = () => {
    setNewSchoolName('')
    setNewSchoolArea('')
    setNewSchoolAddress('')
    setNewSchoolPhone('')
    setNewSchoolEmail('')
    setNewSchoolWebsite('')
    setNewSchoolStrength('')
    setNewSchoolNotes('')
    setHasPrimaryContact(false)
    setContactName('')
    setContactRole('')
    setContactPhone('')
    setContactEmail('')
    setContactNotes('')
    setFormError(null)
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!newSchoolName.trim()) {
      setFormError('School name is required')
      return
    }

    if (hasPrimaryContact && !contactName.trim()) {
      setFormError('Primary contact name is required if contact section is enabled')
      return
    }

    createSchoolMutation.mutate({
      name: newSchoolName.trim(),
      area: newSchoolArea.trim() || null,
      address: newSchoolAddress.trim() || null,
      phone: newSchoolPhone.trim() || null,
      email: newSchoolEmail.trim() || null,
      website: newSchoolWebsite.trim() || null,
      studentStrength: newSchoolStrength ? Number(newSchoolStrength) : null,
      notes: newSchoolNotes.trim() || null,
      primaryContact:
        hasPrimaryContact && contactName.trim()
          ? {
              name: contactName.trim(),
              role: contactRole.trim() || null,
              phone: contactPhone.trim() || null,
              email: contactEmail.trim() || null,
              notes: contactNotes.trim() || null,
            }
          : null,
    })
  }

  const schools = schoolsData?.items || []
  const total = schoolsData?.total || 0
  const totalPages = Math.ceil(total / pageSize) || 1

  return (
    <div className="space-y-3">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h1 className="text-[20px] font-bold text-slate-900 tracking-tight leading-none">School ERP</h1>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Manage school prospects, campus contacts, and demo meetings
          </p>
        </div>
        <button
          onClick={() => {
            resetAddForm()
            setIsAddModalOpen(true)
          }}
          className="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-600 text-white rounded-lg text-[13px] font-semibold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add School</span>
        </button>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 border border-slate-200 rounded-[10px] shadow-2xs">
        {/* Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(searchInput)
            setPage(1)
          }}
          className="relative min-w-[220px] flex-1 max-w-sm"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search school, area, phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </form>

        {/* Stage Filter */}
        <select
          value={stageFilter}
          onChange={(e) => {
            setStageFilter(e.target.value)
            setPage(1)
          }}
          className="w-40 h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
        >
          <option value="">All Stages</option>
          <option value="none">Not started</option>
          {stages.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </select>

        {/* Area Filter */}
        <select
          value={areaFilter}
          onChange={(e) => {
            setAreaFilter(e.target.value)
            setPage(1)
          }}
          className="w-36 h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
        >
          <option value="">All Areas</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        {/* Active / Archived Tabs */}
        <SegmentedTabs
          value={archivedFilter}
          onChange={(val) => {
            setArchivedFilter(val as 'active' | 'archived')
            setPage(1)
          }}
        />

        {/* Reset Filters */}
        {(searchInput || search || stageFilter || areaFilter || archivedFilter !== 'active') && (
          <button
            onClick={() => {
              setSearchInput('')
              setSearch('')
              setStageFilter('')
              setAreaFilter('')
              setArchivedFilter('active')
              setPage(1)
            }}
            className="text-[12px] font-semibold text-blue-600 hover:text-blue-800 px-2 h-8 inline-flex items-center cursor-pointer ml-auto"
          >
            Reset
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-[10px] shadow-2xs overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
            <span>Loading schools...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center max-w-sm mx-auto">
            <p className="text-sm font-semibold text-rose-700 mb-2">Error loading schools</p>
            <p className="text-xs text-slate-500 mb-3">{(error as any)?.message}</p>
            <button
              onClick={() => refetch()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : schools.length === 0 ? (
          <div className="p-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-base font-semibold text-slate-900 mb-1">
              {archivedFilter === 'archived' ? 'No archived schools' : 'No schools found'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {search || stageFilter || areaFilter
                ? 'Try adjusting your search query or filters.'
                : archivedFilter === 'archived'
                ? 'Archived schools will appear here.'
                : 'Add your first school or move one from the Leads page.'}
            </p>
            {archivedFilter === 'active' && (
              <button
                onClick={() => {
                  resetAddForm()
                  setIsAddModalOpen(true)
                }}
                className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded cursor-pointer"
              >
                Add School
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table (>= 768px): fixed 8 columns, no horizontal scroll at >= 1280px */}
            <div className="hidden md:block w-full">
              <table className="w-full table-fixed divide-y divide-slate-200 text-xs">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[12%]" />
                  <col className="w-[21%]" />
                  <col className="w-[11%]" />
                  <col className="w-[11%]" />
                  <col className="w-[9%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                  <tr className="h-9">
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      School
                    </th>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      Area
                    </th>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      Primary contact
                    </th>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      Phone
                    </th>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      Stage
                    </th>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      Last meeting
                    </th>
                    <th className="px-3 text-left font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                      Record
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {schools.map((school) => {
                    const currentStage = school.stage
                    const contact = school.primaryContact

                    return (
                      <tr
                        key={school.id}
                        tabIndex={0}
                        onClick={() => navigate(`/school-erp/${school.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            navigate(`/school-erp/${school.id}`)
                          }
                        }}
                        className="h-[44px] hover:bg-blue-50/40 focus:bg-blue-50/50 cursor-pointer transition-colors outline-none text-[13px]"
                      >
                        {/* 1. School (24%): single line with ellipsis, full text on hover */}
                        <td className="px-3 font-semibold text-slate-900 truncate" title={school.name}>
                          <span className="truncate block">{school.name}</span>
                        </td>

                        {/* 2. Area (12%): single line with ellipsis */}
                        <td className="px-3 text-slate-600 truncate" title={school.area || ''}>
                          {school.area ? (
                            <span className="inline-flex items-center gap-1 truncate max-w-full">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{school.area}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 3. Primary contact (21%): name and role on one line */}
                        <td
                          className="px-3 text-slate-700 truncate"
                          title={contact ? `${contact.name}${contact.role ? ` (${contact.role})` : ''}` : ''}
                        >
                          {contact ? (
                            <div className="truncate inline-flex items-center gap-1.5 max-w-full">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="font-medium text-slate-900 truncate">{contact.name}</span>
                              {contact.role && (
                                <span className="text-slate-400 text-[11px] truncate shrink-0">
                                  ({contact.role})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 4. Phone (11%): does NOT trigger row click */}
                        <td
                          className="px-3 whitespace-nowrap text-slate-600 font-mono truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {school.phone ? (
                            <a
                              href={`tel:${school.phone}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline truncate max-w-full"
                              title={`Call ${school.phone}`}
                            >
                              <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                              <span className="truncate">{school.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 5. Stage: read-only uniform status pill */}
                        <td className="px-3 whitespace-nowrap">
                          <StatusPill status={currentStage} fallbackText="Not started" />
                        </td>

                        {/* 6. Last meeting (9%): like "18 Oct" or "-" */}
                        <td className="px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {formatDateShort(school.lastMeetingDate)}
                        </td>

                        {/* 7. Record (12%): compact button on active schools only, does NOT trigger row click */}
                        <td
                          className="px-3 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!school.archivedAt ? (
                            <button
                              type="button"
                              onClick={() => setRecordTargetSchool(school)}
                              className="inline-flex items-center gap-1 px-2 h-7 text-[12px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer shadow-2xs shrink-0"
                              title={`Record meeting for ${school.name}`}
                            >
                              <PhoneCall className="w-3 h-3 text-blue-600 shrink-0" />
                              <span>Record</span>
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (< 768px): School, Area, Primary contact, Phone, Stage, Last meeting, Record button */}
            <div className="md:hidden divide-y divide-slate-200">
              {schools.map((school) => {
                const currentStage = school.stage
                const contact = school.primaryContact

                return (
                  <div
                    key={school.id}
                    tabIndex={0}
                    onClick={() => navigate(`/school-erp/${school.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/school-erp/${school.id}`)
                      }
                    }}
                    className="p-4 space-y-3 hover:bg-slate-50 focus:bg-slate-50 cursor-pointer transition-colors outline-none"
                  >
                    {/* Header: Name and Stage */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm leading-snug truncate" title={school.name}>
                          {school.name}
                        </h3>
                        {school.area && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{school.area}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <StatusPill status={currentStage} fallbackText="Not started" />
                      </div>
                    </div>

                    {/* Primary contact & Phone */}
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="text-slate-700 truncate">
                        {contact ? (
                          <span className="inline-flex items-center gap-1 truncate">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="font-medium text-slate-900">{contact.name}</span>
                            {contact.role && <span className="text-slate-400">({contact.role})</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400">No contact</span>
                        )}
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        {school.phone ? (
                          <a
                            href={`tel:${school.phone}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-mono font-medium"
                          >
                            <Phone className="w-3 h-3 text-blue-500" />
                            <span>{school.phone}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400">No phone</span>
                        )}
                      </div>
                    </div>

                    {/* Last meeting & Record button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div className="text-xs text-slate-500 font-mono">
                        Last meeting: {formatDateShort(school.lastMeetingDate)}
                      </div>

                      {!school.archivedAt && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setRecordTargetSchool(school)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-md transition-colors cursor-pointer shadow-2xs"
                          >
                            <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                            <span>Record Meeting</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {total > pageSize && (
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} schools
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 cursor-pointer font-medium"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 cursor-pointer font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add School Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-[10px] max-w-xl w-full shadow-xl my-8 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h2 className="text-[15px] font-bold text-slate-900">Add School</h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mx-5 mt-3.5 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs font-medium text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5">
              {/* School Details */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1">
                  School Information
                </h3>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    School Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. St. Joseph Matriculation School"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Area / Locality
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Katpadi / Anna Nagar"
                      value={newSchoolArea}
                      onChange={(e) => setNewSchoolArea(e.target.value)}
                      className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0416 224466 or 9876543210"
                      value={newSchoolPhone}
                      onChange={(e) => setNewSchoolPhone(e.target.value)}
                      className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="school@domain.com"
                      value={newSchoolEmail}
                      onChange={(e) => setNewSchoolEmail(e.target.value)}
                      className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Student Strength
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 850"
                      value={newSchoolStrength}
                      onChange={(e) => setNewSchoolStrength(e.target.value)}
                      className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Website URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={newSchoolWebsite}
                      onChange={(e) => setNewSchoolWebsite(e.target.value)}
                      className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Campus Address
                    </label>
                    <input
                      type="text"
                      placeholder="Street, City, PIN"
                      value={newSchoolAddress}
                      onChange={(e) => setNewSchoolAddress(e.target.value)}
                      className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Initial remarks, board affiliation (CBSE / Matric), etc."
                    value={newSchoolNotes}
                    onChange={(e) => setNewSchoolNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Optional Primary Contact Block */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasPrimaryContact}
                      onChange={(e) => setHasPrimaryContact(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                      Add Primary Contact Now
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-400">Principal / Decision Maker</span>
                </div>

                {hasPrimaryContact && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Contact Name *
                        </label>
                        <input
                          type="text"
                          required={hasPrimaryContact}
                          placeholder="e.g. Dr. Rajesh Kumar"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Role / Title
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Principal / Correspondent"
                          value={contactRole}
                          onChange={(e) => setContactRole(e.target.value)}
                          className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Direct Phone
                        </label>
                        <input
                          type="text"
                          placeholder="Mobile / Ext."
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Direct Email
                        </label>
                        <input
                          type="email"
                          placeholder="personal.email@domain.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        Contact Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Best time to call, key influencer..."
                        value={contactNotes}
                        onChange={(e) => setContactNotes(e.target.value)}
                        className="w-full h-8 px-3 bg-white border border-slate-300 rounded-lg text-[13px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 h-8 text-[13px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSchoolMutation.isPending}
                  className="px-3.5 h-8 text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {createSchoolMutation.isPending ? 'Adding School...' : 'Save School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Meeting Dialog */}
      {recordTargetSchool && (
        <RecordMeetingDialog
          isOpen={Boolean(recordTargetSchool)}
          onClose={() => setRecordTargetSchool(null)}
          schoolId={recordTargetSchool.id}
          schoolName={recordTargetSchool.name}
          stages={stages}
          contacts={recordTargetSchool.contacts || []}
        />
      )}
    </div>
  )
}
