import React, { useState } from 'react'
import {
  FileText,
  MessageCircle,
  Mail,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Sparkles,
  Copy,
} from 'lucide-react'
import { useLeadonic } from '../../context/LeadonicContext'
import { Template, TemplateType } from '../../types'
import { templatesRepo } from '../../repos/templatesRepo'
import { replacePlaceholders } from '../../lib/utils'

export const TemplatesView: React.FC = () => {
  const { templates, refreshData, showToast } = useLeadonic()

  const [activeType, setActiveType] = useState<TemplateType>('script')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [titleInput, setTitleInput] = useState<string>('')
  const [bodyInput, setBodyInput] = useState<string>('')
  const [previewBusiness, setPreviewBusiness] = useState<string>('Apex Dental Care')
  const [previewArea, setPreviewArea] = useState<string>('Indiranagar')

  const filteredTemplates = templates.filter((t) => t.type === activeType)

  const handleSelect = (tmpl: Template) => {
    setSelectedTemplate(tmpl)
    setTitleInput(tmpl.name)
    setBodyInput(tmpl.body)
    setIsEditing(false)
  }

  const handleNew = () => {
    setSelectedTemplate(null)
    setTitleInput('New ' + (activeType === 'script' ? 'Cold Script' : activeType === 'whatsapp' ? 'WhatsApp Message' : 'Email Pitch'))
    setBodyInput('Hi {business_name} team in {area}...')
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!titleInput.trim() || !bodyInput.trim()) {
      showToast('Title and body are required', 'warning')
      return
    }

    const saved = await templatesRepo.save({
      id: selectedTemplate?.id,
      name: titleInput.trim(),
      body: bodyInput.trim(),
      type: activeType,
    })

    setSelectedTemplate(saved)
    setIsEditing(false)
    showToast('Template saved', 'success')
    await refreshData()
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this template?')) return
    await templatesRepo.delete(id)
    setSelectedTemplate(null)
    showToast('Template deleted', 'info')
    await refreshData()
  }

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all templates to system defaults?')) return
    await templatesRepo.resetDefaults()
    setSelectedTemplate(null)
    showToast('Reset to default templates', 'success')
    await refreshData()
  }

  const currentPreviewText = replacePlaceholders(
    isEditing ? bodyInput : selectedTemplate?.body || filteredTemplates[0]?.body || '',
    { name: previewBusiness, area: previewArea }
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            <span>Templates & Outreach Scripts</span>
          </h1>
          <p className="text-xs text-slate-400">
            Define call scripts and messaging templates with dynamic placeholders
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs border border-slate-700 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-950 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-3">
        <button
          onClick={() => {
            setActiveType('script')
            setSelectedTemplate(null)
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeType === 'script'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Call Scripts</span>
        </button>

        <button
          onClick={() => {
            setActiveType('whatsapp')
            setSelectedTemplate(null)
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeType === 'whatsapp'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>WhatsApp Messages</span>
        </button>

        <button
          onClick={() => {
            setActiveType('email')
            setSelectedTemplate(null)
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeType === 'email'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mail className="w-4 h-4 text-sky-400" />
          <span>Email Pitches</span>
        </button>
      </div>

      {/* Main Grid: Template List + Editor + Live Preview */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Templates Sidebar List (4 cols) */}
        <div className="md:col-span-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Available Templates ({filteredTemplates.length})
          </div>

          <div className="space-y-2">
            {filteredTemplates.map((t) => {
              const isSelected = (selectedTemplate?.id || filteredTemplates[0]?.id) === t.id

              return (
                <div
                  key={t.id}
                  onClick={() => handleSelect(t)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500/40 text-white'
                      : 'glass-card border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{t.name}</span>
                    {t.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{t.body}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Editor & Live Preview Panel (8 cols) */}
        <div className="md:col-span-8 space-y-5">
          {/* Editor Card */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{isEditing ? 'Editing Template' : 'Template Details'}</span>
              </h3>

              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    {selectedTemplate && (
                      <button
                        onClick={() => handleDelete(selectedTemplate.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handleSave}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-indigo-950"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Template Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                  />
                ) : (
                  <div className="font-semibold text-slate-200">
                    {selectedTemplate?.name || filteredTemplates[0]?.name}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold">Message Body</label>
                  <div className="text-[10px] text-indigo-400 flex items-center gap-1">
                    <span>Supported tags:</span>
                    <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">
                      {'{business_name}'}
                    </code>
                    <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">
                      {'{area}'}
                    </code>
                  </div>
                </div>

                {isEditing ? (
                  <textarea
                    rows={6}
                    value={bodyInput}
                    onChange={(e) => setBodyInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white font-sans text-xs leading-relaxed"
                  />
                ) : (
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedTemplate?.body || filteredTemplates[0]?.body}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Live Dynamic Preview Card */}
          <div className="glass-card rounded-2xl p-5 border border-indigo-500/20 bg-slate-950/60 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Variable Preview
                </span>
              </div>

              {/* Live Test Inputs */}
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="text"
                  placeholder="Test name..."
                  value={previewBusiness}
                  onChange={(e) => setPreviewBusiness(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 w-36 text-xs"
                />
                <input
                  type="text"
                  placeholder="Test area..."
                  value={previewArea}
                  onChange={(e) => setPreviewArea(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 w-28 text-xs"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
              {currentPreviewText}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
