import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import Cookies from 'js-cookie'

interface User { id: number; email: string; full_name?: string; count?: number }
interface CurrentUser { id: number; email: string; full_name?: string; role: string }

export default function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const token = Cookies.get('token')
        if (!token) {
          router.push('/login')
          return
        }
        
        // Get current user info
        const userRes = await api.get('/auth/me')
        const user = userRes.data
        setCurrentUser(user)
        
        // Check if user is admin
        if (user.role !== 'admin') {
          router.push('/dashboard')
          return
        }
        
        // Load admin data
        const res = await api.get('/admin/stats')
        setUsers(res.data.users)
      } catch (e) {
        console.error(e)
        Cookies.remove('token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    checkAdminAccess()
  }, [router])

  const createUser = async () => {
    setMessage('')
    try {
      await api.post('/auth/users', { email, full_name: name, password, role: 'user' })
      setMessage('User created')
      setEmail(''); setName(''); setPassword('')
      const res = await api.get('/admin/stats')
      setUsers(res.data.users)
    } catch (e: any) { setMessage(e.response?.data?.detail || 'Failed') }
  }

  // Show loading state while checking access
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  // Only render admin content if user is admin (additional safety check)
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-red-600">Access Denied</div>
      </div>
    )
  }

  return (
    <Layout>
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 -z-10">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="w-full max-w-none md:max-w-4xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 relative z-10">
        <div className="mb-6 md:mb-10">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-red-400 to-purple-600 rounded-2xl mb-4 md:mb-6 shadow-lg">
              <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 md:mb-4">Admin Dashboard</h1>
            <p className="text-white/70 text-base md:text-lg">Manage users and system settings</p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-2xl md:rounded-3xl p-4 md:p-8 mb-6 md:mb-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent rounded-3xl"></div>
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6 flex items-center">
              <svg className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"></path>
              </svg>
              <span className="hidden sm:inline">Create New User</span>
              <span className="sm:hidden">New User</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <input 
                className="border border-white/30 bg-white/10 backdrop-blur-xl rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 text-white placeholder-white/60 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 shadow-lg text-sm md:text-base" 
                placeholder="📧 Email" 
                value={email} 
                onChange={(e)=>setEmail(e.target.value)} 
              />
              <input 
                className="border border-white/30 bg-white/10 backdrop-blur-xl rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 text-white placeholder-white/60 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 shadow-lg text-sm md:text-base" 
                placeholder="👤 Full Name" 
                value={name} 
                onChange={(e)=>setName(e.target.value)} 
              />
              <input 
                className="border border-white/30 bg-white/10 backdrop-blur-xl rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 text-white placeholder-white/60 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300 shadow-lg text-sm md:text-base" 
                placeholder="🔒 Password" 
                type="password" 
                value={password} 
                onChange={(e)=>setPassword(e.target.value)} 
              />
              <button 
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl md:rounded-2xl px-4 md:px-6 py-2 md:py-3 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 border border-blue-400/30 text-sm md:text-base sm:col-span-2 lg:col-span-1" 
                onClick={createUser}
              >
                <span className="hidden sm:inline">✨ Create User</span>
                <span className="sm:hidden">✨ Create</span>
              </button>
            </div>
            {message && <div className="text-xs md:text-sm text-white/80 mt-3 md:mt-4 p-2 md:p-3 bg-white/10 rounded-lg md:rounded-xl backdrop-blur-sm">{message}</div>}
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-2xl md:rounded-3xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-blue-500/5 to-transparent rounded-3xl"></div>
          <div className="relative z-10">
            <div className="p-4 md:p-6 font-bold text-lg md:text-xl text-white border-b border-white/20 flex items-center">
              <svg className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
              </svg>
              <span className="hidden sm:inline">👥 System Users</span>
              <span className="sm:hidden">👥 Users</span>
            </div>
            <div className="divide-y divide-white/10">
              {users.map(u => (
                <div key={u.id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 hover:bg-white/5 transition-all duration-300">
                  <div className="flex items-center space-x-3 md:space-x-4 flex-1">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white text-base md:text-lg truncate">{u.full_name || 'Unnamed User'}</div>
                      <div className="text-xs md:text-sm text-white/60 flex items-center">
                        <svg className="w-3 h-3 md:w-4 md:h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                        </svg>
                        <span className="truncate">{u.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl px-3 md:px-4 py-2 border border-white/20 inline-block">
                      <div className="text-xs md:text-sm text-white/60">Reports Created</div>
                      <div className="text-lg md:text-2xl font-bold text-white">{u.count ?? '0'}</div>
                    </div>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="p-6 md:p-8 text-center text-white/60">
                  <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-4 text-white/30" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                  </svg>
                  <p className="text-base md:text-lg">No users found</p>
                </div>
              )}
            </div>
          </div>
         </div>
       </div>
    </Layout>
  )
}