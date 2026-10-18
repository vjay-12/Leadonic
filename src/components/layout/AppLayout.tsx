import React, { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, BarChart3, Settings, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Leads', to: '/leads', icon: Users },
    { label: 'Report', to: '/report', icon: BarChart3 },
    { label: 'Settings', to: '/settings', icon: Settings },
  ]

  const closeMobile = () => setMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            L
          </div>
          <span className="font-semibold text-slate-900 tracking-tight">Leadonic</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-60 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / App Name */}
        <div className="h-14 lg:h-16 flex items-center px-6 border-b border-slate-100 gap-3">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
            L
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-tight tracking-tight">Leadonic</h1>
            <p className="text-[11px] font-medium text-slate-400">Lead Tracker</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.to)

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={closeMobile}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Logout at bottom */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-60 min-w-0 flex flex-col pt-14 lg:pt-0">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
