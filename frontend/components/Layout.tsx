import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'
import { api } from '../lib/api'

interface User {
  id: number
  email: string
  full_name?: string
  role: string
  has_outstation_access?: boolean
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = Cookies.get('token')
        if (!token) {
          router.push('/login')
          return
        }
        const response = await api.get('/auth/me')
        setUser(response.data)
      } catch (error) {
        console.error('Failed to fetch user:', error)
        Cookies.remove('token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router])

  const handleLogout = () => {
    Cookies.remove('token')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-gray-900 text-white shadow-xl hidden md:flex md:flex-col">
        {/* Logo and Logout */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 flex items-center justify-center">
                <img src="/logo.png" alt="MHP Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold">MHP Portal</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-300 rounded-lg hover:bg-red-600 hover:text-white transition-colors duration-200"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* User Profile Section */}
        {user && (
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {(user.full_name || user.email).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                 <div className="text-sm font-medium text-white truncate">
                   {user.full_name || 'User'}
                 </div>
                 <div className="text-xs text-gray-400 truncate">{user.email}</div>
               </div>
            </div>
          </div>
        )}
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Navigation</div>
          
          {user?.role !== 'admin' && (
            <Link className="flex items-center px-3 py-2 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors duration-200" href="/dashboard">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
              </svg>
              Dashboard
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link className="flex items-center px-3 py-2 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors duration-200" href="/admin-outstation">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Out Station Management
            </Link>
          )}
          {user?.role !== 'admin' && (
            <Link className="flex items-center px-3 py-2 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors duration-200" href="/clients">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Clients
            </Link>
          )}
          {user?.has_outstation_access && (
            <Link className="flex items-center px-3 py-2 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors duration-200" href="/outstation-expense">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
              Out Station Expense
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link className="flex items-center px-3 py-2 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors duration-200" href="/admin">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link className="flex items-center px-3 py-2 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors duration-200" href="/monthly-report">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Monthly Activity Report
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link className="flex items-center px-3 py-2 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors duration-200" href="/pdf-reports">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF Reports
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link className="flex items-center px-3 py-2 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors duration-200" href="/giveaways">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
              Giveaways
            </Link>
          )}
        </nav>

      </aside>
        
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-700 shadow-xl z-50">
        <div className="flex items-center justify-between p-4">
          <div className="font-bold text-xl text-white flex items-center">
            <div className="w-8 h-8 mr-3 flex items-center justify-center">
              <img src="/logo.png" alt="MHP Logo" className="w-full h-full object-contain" />
            </div>
            <span className="hidden xs:inline">MHP Portal</span>
            <span className="xs:hidden">MHP</span>
          </div>
          <div className="flex items-center space-x-2">
            {user && (
              <div className="text-sm text-white hidden sm:block truncate max-w-32">
                {user.full_name || user.email}
              </div>
            )}
            {user && (
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:bg-gray-800 rounded-lg transition-colors duration-200"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
        
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed top-16 left-0 right-0 bg-white/10 backdrop-blur-2xl border-b border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 space-y-2">
              {/* User Profile in Mobile Menu */}
              {user && (
                <div className="p-4 border-b border-white/10 bg-white/5 backdrop-blur-sm rounded-xl mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {user.full_name || 'User'}
                      </div>
                      <div className="text-xs text-gray-300 truncate">{user.email}</div>
                      <div className="text-xs text-blue-300 capitalize font-medium bg-blue-500/20 px-2 py-1 rounded-full mt-1 inline-block">{user.role}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Mobile Navigation Links */}
              {user?.role !== 'admin' && (
                <Link 
                  href="/dashboard" 
                  className="group flex items-center px-4 py-3 rounded-xl text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">📊</span>
                  <span className="font-medium">Dashboard</span>
                </Link>
              )}
              
              {user?.role !== 'admin' && (
                <Link 
                  href="/clients" 
                  className="group flex items-center px-4 py-3 rounded-xl text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">👥</span>
                  <span className="font-medium">Clients</span>
                </Link>
              )}
              
              {user?.has_outstation_access && (
                <Link 
                  href="/outstation-expense" 
                  className="group flex items-center px-4 py-3 rounded-xl text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">🚗</span>
                  <span className="font-medium">Out Station Expense</span>
                </Link>
              )}
              
              {user?.role === 'admin' && (
                <Link 
                  href="/admin" 
                  className="group flex items-center px-4 py-3 rounded-xl text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">⚙️</span>
                  <span className="font-medium">Admin</span>
                </Link>
              )}
              
              {user?.role === 'admin' && (
                <Link 
                  href="/giveaways" 
                  className="group flex items-center px-4 py-3 rounded-xl text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">🎁</span>
                  <span className="font-medium">Giveaways</span>
                </Link>
              )}
              
              {user?.role === 'admin' && (
                <Link 
                  href="/monthly-report" 
                  className="group flex items-center px-4 py-3 rounded-xl text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">📊</span>
                  <span className="font-medium">Monthly Activity Report</span>
                </Link>
              )}
              
              {user?.role === 'admin' && (
                <Link 
                  href="/pdf-reports" 
                  className="group flex items-center px-4 py-3 rounded-xl text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">📄</span>
                  <span className="font-medium">PDF Reports</span>
                </Link>
              )}
              
              {user?.role === 'admin' && (
                <Link 
                  href="/admin-outstation" 
                  className="group flex items-center px-4 py-3 rounded-xl text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">🚗</span>
                  <span className="font-medium">Out Station Management</span>
                </Link>
              )}
              

            </div>
          </div>
        </div>
      )}
        
      {/* Main Content Area */}
      <main className="w-full md:flex-1 p-2 sm:p-4 pt-20 md:pt-4 bg-gray-100">
        {children}
      </main>
    </div>
  )
}