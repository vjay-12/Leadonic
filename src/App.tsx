import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LeadonicProvider, useLeadonic } from './context/LeadonicContext'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { ToastContainer } from './components/layout/ToastContainer'
import { LeadDetailModal } from './components/leads/LeadDetailModal'
import { DashboardView } from './components/dashboard/DashboardView'
import { CallQueueView } from './components/callQueue/CallQueueView'
import { LeadsListView } from './components/leads/LeadsListView'
import { ImportWizardView } from './components/import/ImportWizardView'
import { TasksView } from './components/tasks/TasksView'
import { TemplatesView } from './components/templates/TemplatesView'
import { SettingsView } from './components/settings/SettingsView'
import { RefreshCw } from 'lucide-react'

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { detailLeadId, openLeadDetail, loading } = useLeadonic()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <span className="text-sm font-semibold text-slate-300">
          Initializing Leadonic Database...
        </span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex">
      {/* Navigation Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/queue" element={<CallQueueView />} />
            <Route path="/leads" element={<LeadsListView />} />
            <Route path="/import" element={<ImportWizardView />} />
            <Route path="/tasks" element={<TasksView />} />
            <Route path="/templates" element={<TemplatesView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Active Lead Detail Modal (Globally reachable) */}
      {detailLeadId && (
        <LeadDetailModal leadId={detailLeadId} onClose={() => openLeadDetail(null)} />
      )}

      {/* Toast Alerts Container */}
      <ToastContainer />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <LeadonicProvider>
        <AppLayout />
      </LeadonicProvider>
    </BrowserRouter>
  )
}

export default App
