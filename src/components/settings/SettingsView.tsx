import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { LeadStatus, LeadCategory, SchoolStage } from '../../types'
import { Plus, ArrowUp, ArrowDown, Edit2, Trash2, X, AlertCircle } from 'lucide-react'

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'statuses' | 'categories' | 'schoolStages'>('statuses')
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  // Editing state
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null)
  const [editingCategory, setEditingCategory] = useState<LeadCategory | null>(null)
  const [editingSchoolStage, setEditingSchoolStage] = useState<SchoolStage | null>(null)

  // Add inputs
  const [newStatusName, setNewStatusName] = useState('')
  const [newStatusColor, setNewStatusColor] = useState('#2563EB')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newSchoolStageName, setNewSchoolStageName] = useState('')
  const [newSchoolStageColor, setNewSchoolStageColor] = useState('#2563EB')

  // Inline error message for 409 conflicts
  const [conflictError, setConflictError] = useState<string | null>(null)

  // Fetch Statuses
  const { data: statuses = [], isLoading: loadingStatuses } = useQuery({
    queryKey: ['statuses'],
    queryFn: () => api.getStatuses(),
  })

  // Fetch Categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.getCategories(),
  })

  // Fetch School Stages
  const { data: schoolStages = [], isLoading: loadingSchoolStages } = useQuery({
    queryKey: ['schoolStages'],
    queryFn: () => api.getSchoolStages(),
  })

  // Mutations for Statuses
  const createStatusMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => api.createStatus(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setNewStatusName('')
      setNewStatusColor('#2563EB')
      setConflictError(null)
      success('Status created successfully')
    },
    onError: (err: any) => {
      setConflictError(err.message)
      toastError(err.message)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; color?: string } }) =>
      api.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setEditingStatus(null)
      setConflictError(null)
      success('Status updated successfully')
    },
    onError: (err: any) => {
      setConflictError(err.message)
      toastError(err.message)
    },
  })

  const deleteStatusMutation = useMutation({
    mutationFn: (id: number) => api.deleteStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setConflictError(null)
      success('Status deleted successfully')
    },
    onError: (err: any) => {
      setConflictError(err.message)
      toastError(err.message)
    },
  })

  const reorderStatusesMutation = useMutation({
    mutationFn: (ids: number[]) => api.reorderStatuses(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] })
    },
    onError: (err: any) => toastError(err.message),
  })

  // Mutations for Categories
  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string }) => api.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setNewCategoryName('')
      setConflictError(null)
      success('Category created successfully')
    },
    onError: (err: any) => {
      setConflictError(err.message)
      toastError(err.message)
    },
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string } }) =>
      api.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setEditingCategory(null)
      setConflictError(null)
      success('Category updated successfully')
    },
    onError: (err: any) => {
      setConflictError(err.message)
      toastError(err.message)
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setConflictError(null)
      success('Category deleted successfully')
    },
    onError: (err: any) => {
      setConflictError(err.message)
      toastError(err.message)
    },
  })

  const reorderCategoriesMutation = useMutation({
    mutationFn: (ids: number[]) => api.reorderCategories(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: (err: any) => toastError(err.message),
  })

  // Mutations for School Stages
  const createSchoolStageMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => api.createSchoolStage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schoolStages'] })
      setNewSchoolStageName('')
      setNewSchoolStageColor('#2563EB')
      setConflictError(null)
      success('School stage created successfully')
    },
    onError: (err: any) => {
      setConflictError(err.message)
      toastError(err.message)
    },
  })

  const updateSchoolStageMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; color?: string } }) =>
      api.updateSchoolStage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schoolStages'] })
      queryClient.invalidateQueries({ queryKey: ['schools'] })
      setEditingSchoolStage(null)
      setConflictError(null)
      success('School stage updated successfully')
    },
    onError: (err: any) => {
      setConflictError(err.message)
      toastError(err.message)
    },
  })

  const deleteSchoolStageMutation = useMutation({
    mutationFn: (id: number) => api.deleteSchoolStage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schoolStages'] })
      setConflictError(null)
      success('School stage deleted successfully')
    },
    onError: (err: any) => {
      setConflictError(err.message)
      toastError(err.message)
    },
  })

  const reorderSchoolStagesMutation = useMutation({
    mutationFn: (ids: number[]) => api.reorderSchoolStages(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schoolStages'] })
    },
    onError: (err: any) => toastError(err.message),
  })

  // Move status up or down
  const moveStatus = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= statuses.length) return
    const newItems = [...statuses]
    const moved = newItems[index]
    if (!moved) return
    newItems.splice(index, 1)
    newItems.splice(targetIndex, 0, moved)
    reorderStatusesMutation.mutate(newItems.map((s) => s.id))
  }

  // Move category up or down
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= categories.length) return
    const newItems = [...categories]
    const moved = newItems[index]
    if (!moved) return
    newItems.splice(index, 1)
    newItems.splice(targetIndex, 0, moved)
    reorderCategoriesMutation.mutate(newItems.map((c) => c.id))
  }

  // Move school stage up or down
  const moveSchoolStage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= schoolStages.length) return
    const newItems = [...schoolStages]
    const moved = newItems[index]
    if (!moved) return
    newItems.splice(index, 1)
    newItems.splice(targetIndex, 0, moved)
    reorderSchoolStagesMutation.mutate(newItems.map((s) => s.id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500">Manage pipeline lead statuses, categories, and school stages</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => {
              setActiveTab('statuses')
              setConflictError(null)
            }}
            className={`py-3 px-1 border-b-2 font-medium text-sm cursor-pointer ${
              activeTab === 'statuses'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Statuses ({statuses.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('categories')
              setConflictError(null)
            }}
            className={`py-3 px-1 border-b-2 font-medium text-sm cursor-pointer ${
              activeTab === 'categories'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('schoolStages')
              setConflictError(null)
            }}
            className={`py-3 px-1 border-b-2 font-medium text-sm cursor-pointer ${
              activeTab === 'schoolStages'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            School Stages ({schoolStages.length})
          </button>
        </nav>
      </div>

      {/* Conflict Error Notice */}
      {conflictError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start justify-between text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{conflictError}</span>
          </div>
          <button
            onClick={() => setConflictError(null)}
            className="text-rose-500 hover:text-rose-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Statuses Tab Content */}
      {activeTab === 'statuses' && (
        <div className="space-y-6">
          {/* Add Status Form */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Add New Status</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (newStatusName.trim()) {
                  createStatusMutation.mutate({
                    name: newStatusName.trim(),
                    color: newStatusColor,
                  })
                }
              }}
              className="flex flex-wrap items-center gap-3"
            >
              <input
                type="text"
                placeholder="Status name (max 24 chars, e.g. Qualified)"
                value={newStatusName}
                maxLength={24}
                onChange={(e) => setNewStatusName(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                required
              />
              <div className="flex items-center gap-2 border border-slate-300 rounded-md px-2.5 py-1.5 bg-white">
                <input
                  type="color"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-xs font-mono text-slate-600 uppercase">{newStatusColor}</span>
              </div>
              <button
                type="submit"
                disabled={createStatusMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Status</span>
              </button>
            </form>
          </div>

          {/* Statuses List */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            {loadingStatuses ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading statuses...</div>
            ) : statuses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No statuses configured.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {statuses.map((status, idx) => (
                  <div
                    key={status.id}
                    className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveStatus(idx, 'up')}
                          disabled={idx === 0}
                          title="Move up"
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveStatus(idx, 'down')}
                          disabled={idx === statuses.length - 1}
                          title="Move down"
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Color indicator & name */}
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="font-semibold text-slate-900 text-sm">{status.name}</span>

                      {/* Lead count */}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {status.leadCount} {status.leadCount === 1 ? 'lead' : 'leads'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingStatus(status)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit status"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete status "${status.name}"?`)) {
                            deleteStatusMutation.mutate(status.id)
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete status"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories Tab Content */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Add Category Form */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Add New Category</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (newCategoryName.trim()) {
                  createCategoryMutation.mutate({ name: newCategoryName.trim() })
                }
              }}
              className="flex flex-wrap items-center gap-3"
            >
              <input
                type="text"
                placeholder="Category name (e.g. Hospital)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                required
              />
              <button
                type="submit"
                disabled={createCategoryMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </form>
          </div>

          {/* Categories List */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            {loadingCategories ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading categories...</div>
            ) : categories.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No categories configured.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {categories.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveCategory(idx, 'up')}
                          disabled={idx === 0}
                          title="Move up"
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveCategory(idx, 'down')}
                          disabled={idx === categories.length - 1}
                          title="Move down"
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-semibold text-slate-900 text-sm">{cat.name}</span>

                      {/* Lead count */}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {cat.leadCount} {cat.leadCount === 1 ? 'lead' : 'leads'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingCategory(cat)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
                            deleteCategoryMutation.mutate(cat.id)
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* School Stages Tab Content */}
      {activeTab === 'schoolStages' && (
        <div className="space-y-6">
          {/* Add School Stage Form */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Add New School Stage</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (newSchoolStageName.trim()) {
                  createSchoolStageMutation.mutate({
                    name: newSchoolStageName.trim(),
                    color: newSchoolStageColor,
                  })
                }
              }}
              className="flex flex-wrap items-center gap-3"
            >
              <input
                type="text"
                placeholder="Stage name (e.g. Contacted)"
                value={newSchoolStageName}
                onChange={(e) => setNewSchoolStageName(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                required
              />
              <div className="flex items-center gap-2 border border-slate-300 rounded-md px-2.5 py-1.5 bg-white">
                <input
                  type="color"
                  value={newSchoolStageColor}
                  onChange={(e) => setNewSchoolStageColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                />
                <span className="text-xs font-mono text-slate-600 uppercase">{newSchoolStageColor}</span>
              </div>
              <button
                type="submit"
                disabled={createSchoolStageMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Stage</span>
              </button>
            </form>
          </div>

          {/* School Stages List */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
            {loadingSchoolStages ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading school stages...</div>
            ) : schoolStages.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">No school stages configured.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {schoolStages.map((stage, idx) => (
                  <div
                    key={stage.id}
                    className="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveSchoolStage(idx, 'up')}
                          disabled={idx === 0}
                          title="Move up"
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveSchoolStage(idx, 'down')}
                          disabled={idx === schoolStages.length - 1}
                          title="Move down"
                          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Color indicator & name */}
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="font-semibold text-slate-900 text-sm">{stage.name}</span>

                      {/* School count */}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {stage.schoolCount ?? 0} {(stage.schoolCount ?? 0) === 1 ? 'school' : 'schools'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingSchoolStage(stage)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit stage"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete stage "${stage.name}"?`)) {
                            deleteSchoolStageMutation.mutate(stage.id)
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete stage"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Status Modal */}
      {editingStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-sm w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Edit Status</h3>
              <button
                onClick={() => setEditingStatus(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
                const color = (form.elements.namedItem('color') as HTMLInputElement).value
                if (name) {
                  updateStatusMutation.mutate({
                    id: editingStatus.id,
                    data: { name, color },
                  })
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Name
                </label>
                <input
                  name="name"
                  defaultValue={editingStatus.name}
                  maxLength={24}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2 border border-slate-300 rounded-md px-2.5 py-1.5">
                  <input
                    name="color"
                    type="color"
                    defaultValue={editingStatus.color}
                    className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-xs font-mono text-slate-600 uppercase">
                    {editingStatus.color}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStatus(null)}
                  className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-60"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-sm w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Edit Category</h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
                if (name) {
                  updateCategoryMutation.mutate({
                    id: editingCategory.id,
                    data: { name },
                  })
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Name
                </label>
                <input
                  name="name"
                  defaultValue={editingCategory.name}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCategoryMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-60"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit School Stage Modal */}
      {editingSchoolStage && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-sm w-full shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Edit School Stage</h3>
              <button
                onClick={() => setEditingSchoolStage(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
                const color = (form.elements.namedItem('color') as HTMLInputElement).value
                if (name) {
                  updateSchoolStageMutation.mutate({
                    id: editingSchoolStage.id,
                    data: { name, color },
                  })
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Name
                </label>
                <input
                  name="name"
                  defaultValue={editingSchoolStage.name}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Color
                </label>
                <div className="flex items-center gap-2 border border-slate-300 rounded-md px-2.5 py-1.5">
                  <input
                    name="color"
                    type="color"
                    defaultValue={editingSchoolStage.color}
                    className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                  />
                  <span className="text-xs font-mono text-slate-600 uppercase">
                    {editingSchoolStage.color}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSchoolStage(null)}
                  className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSchoolStageMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-60"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
