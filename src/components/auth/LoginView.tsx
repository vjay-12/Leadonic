import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Lock, ArrowRight, AlertCircle } from 'lucide-react'

export const LoginView: React.FC = () => {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('Please enter the password')
      return
    }

    try {
      setLoading(true)
      setError('')
      await login(password)
    } catch (err: any) {
      setError(err.message || 'Incorrect password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-xs">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl mb-3 shadow-xs">
              L
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leadonic</h1>
            <p className="text-xs text-slate-500 mt-1">Cold Calling Lead Tracker</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs font-medium text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                App Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 pl-10"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer shadow-xs"
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
