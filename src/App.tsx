import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { AppLayout } from './components/layout/AppLayout'
import { LoginView } from './components/auth/LoginView'
import { DashboardView } from './components/dashboard/DashboardView'
import { LeadsView } from './components/leads/LeadsView'
import { LeadDetailPage } from './components/leads/LeadDetailPage'
import { SchoolErpView } from './components/schoolErp/SchoolErpView'
import { SchoolDetailPage } from './components/schoolErp/SchoolDetailPage'
import { ReportView } from './components/report/ReportView'
import { SettingsView } from './components/settings/SettingsView'
import { RefreshCw } from 'lucide-react'

const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-500">
        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="text-sm font-medium">Checking session...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginView />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardView />} />
          <Route path="/leads" element={<LeadsView />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route path="/school-erp" element={<SchoolErpView />} />
          <Route path="/school-erp/:id" element={<SchoolDetailPage />} />
          <Route path="/report" element={<ReportView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthenticatedApp />
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
