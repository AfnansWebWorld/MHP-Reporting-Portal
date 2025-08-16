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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>
        <div className="bg-white/20 backdrop-blur-md border border-white/30 shadow-xl rounded-xl p-6 mb-6">
          <h2 className="font-medium mb-2">Create User</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="border border-white/30 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 placeholder-gray-600" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <input className="border border-white/30 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 placeholder-gray-600" placeholder="Full Name" value={name} onChange={(e)=>setName(e.target.value)} />
            <input className="border border-white/30 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 placeholder-gray-600" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <button className="bg-blue-600/80 hover:bg-blue-700/90 backdrop-blur-sm text-white rounded-lg px-4 py-2 border border-blue-500/30 shadow-lg" onClick={createUser}>Create</button>
          </div>
          {message && <div className="text-sm text-gray-700 mt-2">{message}</div>}
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-xl rounded-xl">
          <div className="p-4 font-medium border-b border-white/20">Users</div>
          <div className="divide-y divide-white/20">
            {users.map(u => (
              <div key={u.id} className="p-3 flex justify-between">
                <div>
                  <div className="font-medium">{u.full_name || 'Unnamed'}</div>
                  <div className="text-sm text-gray-600">{u.email}</div>
                </div>
                <div className="text-sm">Forms: {u.count ?? '-'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}