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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative">
      {/* Global Background Pattern */}
      <div className="fixed inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="md:flex relative z-10">
        {/* Desktop Sidebar - Only shown on md+ screens */}
        <aside className="w-64 bg-white/5 backdrop-blur-2xl border-r border-white/10 shadow-2xl hidden md:block relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/5 to-transparent"></div>
          <div className="relative z-10">
            <div className="p-6 font-bold text-2xl border-b border-white/10 text-white flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl mr-3 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
                </svg>
              </div>
              MHP Portal
            </div>
            
            {/* User Profile Section */}
            {user && (
              <div className="p-6 border-b border-white/10 bg-white/5 backdrop-blur-sm relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg"></div>
                <div className="flex items-center space-x-4 relative z-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg">
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
          </div>
          
          {/* Navigation */}
          <nav className="px-6 py-4 space-y-2">
            <Link className="group flex items-center px-4 py-3 rounded-xl text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20" href="/dashboard">
              <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">📊</span>
              <span className="font-medium">Dashboard</span>
            </Link>
            {user?.role === 'admin' && (
              <Link className="group flex items-center px-4 py-3 rounded-xl text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20" href="/admin">
                <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">⚙️</span>
                <span className="font-medium">Admin</span>
              </Link>
            )}
          </nav>
          
          {/* Logout Button */}
          <div className="absolute bottom-6 left-6 right-6">
            <button
              onClick={handleLogout}
              className="group w-full px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-xl shadow-lg hover:shadow-xl hover:shadow-red-500/25 transform hover:scale-105 transition-all duration-300 border border-red-400/30 hover:border-red-300/50 backdrop-blur-sm relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center justify-center">
                <span className="text-lg mr-2 group-hover:scale-110 transition-transform duration-300">🚪</span>
                Logout
              </div>
            </button>
          </div>
        </aside>
        
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-white/5 backdrop-blur-2xl border-b border-white/10 shadow-2xl z-50 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent"></div>
          <div className="flex items-center justify-between p-4 relative z-10">
            <div className="font-bold text-xl text-white flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl mr-3 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
                </svg>
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
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors duration-200"
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
                <Link 
                  href="/dashboard" 
                  className="group flex items-center px-4 py-3 rounded-xl text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-300">📊</span>
                  <span className="font-medium">Dashboard</span>
                </Link>
                
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
                
                {/* Mobile Logout Button */}
                <button
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                  className="group w-full flex items-center px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 rounded-xl shadow-lg hover:shadow-xl hover:shadow-red-500/25 transition-all duration-300 border border-red-400/30 hover:border-red-300/50 backdrop-blur-sm relative overflow-hidden mt-4"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 flex items-center">
                    <span className="text-lg mr-3 group-hover:scale-110 transition-transform duration-300">🚪</span>
                    <span>Logout</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Content Area */}
        <main className="w-full md:flex-1 p-2 sm:p-4 pt-20 md:pt-4">{children}</main>
      </div>
    </div>
  )
}