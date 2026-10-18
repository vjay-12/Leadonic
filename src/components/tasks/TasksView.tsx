import React, { useState, useMemo } from 'react'
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertCircle,
  PhoneCall,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLeadonic } from '../../context/LeadonicContext'
import { Task } from '../../types'
import { tasksRepo } from '../../repos/tasksRepo'
import { formatShortDate, getFollowupStatus } from '../../lib/utils'
import { displayPhone } from '../../lib/phone'

export const TasksView: React.FC = () => {
  const { tasks, openLeadDetail, refreshData, showToast } = useLeadonic()
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming' | 'completed'>(
    'today'
  )
  const [quickTaskTitle, setQuickTaskTitle] = useState('')
  const [quickDueDate, setQuickDueDate] = useState('')

  // Categorize tasks
  const categorized = useMemo(() => {
    const overdue: Task[] = []
    const today: Task[] = []
    const upcoming: Task[] = []
    const completed: Task[] = []

    tasks.forEach((task) => {
      if (task.done) {
        completed.push(task)
        return
      }

      const status = getFollowupStatus(task.dueDate)
      if (status === 'overdue') overdue.push(task)
      else if (status === 'today') today.push(task)
      else upcoming.push(task)
    })

    return { overdue, today, upcoming, completed }
  }, [tasks])

  const currentList = categorized[activeTab]

  const handleToggle = async (taskId: string) => {
    await tasksRepo.toggleDone(taskId)
    await refreshData()
  }

  const handleDelete = async (taskId: string) => {
    await tasksRepo.delete(taskId)
    showToast('Task removed', 'info')
    await refreshData()
  }

  const handleCreateGeneralTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTaskTitle.trim()) return

    const dueDate = quickDueDate
      ? new Date(quickDueDate).toISOString()
      : new Date().toISOString()

    await tasksRepo.create({
      title: quickTaskTitle.trim(),
      dueDate,
    })

    setQuickTaskTitle('')
    setQuickDueDate('')
    showToast('Task scheduled', 'success')
    await refreshData()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-amber-400" />
            <span>Follow-up Tasks & Reminders</span>
          </h1>
          <p className="text-xs text-slate-400">
            Action items automatically triggered by call outcomes or set manually
          </p>
        </div>

        <Link
          to="/queue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950 transition-colors"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Call Queue</span>
        </Link>
      </div>

      {/* Quick Add Task Bar */}
      <form
        onSubmit={handleCreateGeneralTask}
        className="glass-card rounded-2xl p-4 border border-slate-800 flex flex-wrap gap-2 text-xs items-center"
      >
        <input
          type="text"
          placeholder="Quick add follow-up reminder..."
          value={quickTaskTitle}
          onChange={(e) => setQuickTaskTitle(e.target.value)}
          className="flex-1 min-w-[220px] bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white placeholder-slate-500"
        />
        <input
          type="datetime-local"
          value={quickDueDate}
          onChange={(e) => setQuickDueDate(e.target.value)}
          className="bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-white"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule</span>
        </button>
      </form>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'overdue'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Overdue</span>
          <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px]">
            {categorized.overdue.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'today'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Due Today</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
            {categorized.today.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'upcoming'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Upcoming</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px]">
            {categorized.upcoming.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'completed'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completed</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px]">
            {categorized.completed.length}
          </span>
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {currentList.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/60" />
            No tasks in this view. Everything is up to date!
          </div>
        ) : (
          currentList.map((task) => (
            <div
              key={task.id}
              className="glass-card rounded-xl p-4 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition-all text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => handleToggle(task.id)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <div className="min-w-0">
                  <div
                    className={`font-semibold ${
                      task.done ? 'line-through text-slate-500' : 'text-slate-200'
                    }`}
                  >
                    {task.title}
                  </div>
                  {task.leadName && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <button
                        onClick={() => task.leadId && openLeadDetail(task.leadId)}
                        className="text-indigo-400 hover:underline font-medium"
                      >
                        {task.leadName}
                      </button>
                      {task.leadPhone && (
                        <span>· {displayPhone(task.leadPhone)}</span>
                      )}
                      {task.leadArea && <span>· {task.leadArea}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`font-medium ${
                    task.done
                      ? 'text-slate-500'
                      : activeTab === 'overdue'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {formatShortDate(task.dueDate)}
                </span>

                {task.leadPhone && (
                  <a
                    href={`tel:${task.leadPhone}`}
                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                    title="Call now"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  onClick={() => handleDelete(task.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
