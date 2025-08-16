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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="flex">
        <aside className="w-64 bg-white/10 backdrop-blur-md border-r border-white/20 shadow-xl hidden md:block">
          <div className="p-4 font-semibold text-lg border-b">MHP Portal</div>
          
          {/* User Profile Section */}
          {user && (
            <div className="p-4 border-b border-white/20 bg-white/5 backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {(user.full_name || user.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {user.full_name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  <div className="text-xs text-blue-600 capitalize">{user.role}</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation */}
          <nav className="px-4 py-2 space-y-1">
            <Link className="block px-3 py-2 rounded hover:bg-gray-100 text-gray-700" href="/dashboard">
              📊 Dashboard
            </Link>
            {user?.role === 'admin' && (
              <Link className="block px-3 py-2 rounded hover:bg-gray-100 text-gray-700" href="/admin">
                ⚙️ Admin
              </Link>
            )}
          </nav>
          
          {/* Logout Button */}
          <div className="absolute bottom-4 left-4 right-4">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-red-600 hover:border-red-700"
            >
              🚪 Logout
            </button>
          </div>
        </aside>
        
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-xl z-10">
          <div className="flex items-center justify-between p-4">
            <div className="font-semibold text-lg">MHP Portal</div>
            {user && (
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-600">{user.full_name || user.email}</div>
                <button
                  onClick={handleLogout}
                  className="text-white text-sm font-semibold px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 border border-red-600 hover:border-red-700"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
        
        <main className="flex-1 p-4 md:p-4 pt-20 md:pt-4">{children}</main>
      </div>
    </div>
  )
}