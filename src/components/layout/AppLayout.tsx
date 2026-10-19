import React, { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, GraduationCap, BarChart3, Settings, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    { label: 'Leads', to: '/leads', icon: Users },
    { label: 'School ERP', to: '/school-erp', icon: GraduationCap },
    { label: 'Report', to: '/report', icon: BarChart3 },
    { label: 'Settings', to: '/settings', icon: Settings },
  ]

  const closeMobile = () => setMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-12 bg-white border-b border-slate-200 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            L
          </div>
          <span className="font-semibold text-slate-900 text-[14px] tracking-tight">Leadonic</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md cursor-pointer"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar: 220px wide, compact brand block, nav items 36px tall with 13.5px text */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-[220px] bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Compact Brand Block */}
        <div className="h-13 flex items-center px-4 border-b border-slate-100 gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            L
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-slate-900 text-[14px] leading-tight tracking-tight">Leadonic</h1>
            <p className="text-[10.5px] font-medium text-slate-400 leading-none mt-0.5">Lead Tracker</p>
          </div>
        </div>

        {/* Navigation Links: 36px tall, 13.5px text */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5">
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
                className={`h-9 flex items-center gap-2.5 px-3 text-[13.5px] rounded-lg transition-colors leading-none ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Logout at bottom */}
        <div className="p-2.5 border-t border-slate-100">
          <button
            onClick={() => logout()}
            className="w-full h-9 flex items-center gap-2.5 px-3 text-[13.5px] font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer leading-none"
          >
            <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area: 20px padding sides, 14px at top, no empty top gap */}
      <main className="flex-1 lg:pl-[220px] min-w-0 flex flex-col pt-12 lg:pt-0">
        <div className="flex-1 w-full min-w-0 px-5 pt-3.5 pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
