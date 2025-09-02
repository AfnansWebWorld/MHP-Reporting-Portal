import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import Cookies from 'js-cookie'

interface User { id: number; email: string; full_name?: string; count?: number; visit_count?: number }
interface CurrentUser { id: number; email: string; full_name?: string; role: string }
interface Client {
  id: number
  name: string
  phone: string
  address: string
  user_id: number
  created_at: string
  user?: {
    id: number
    email: string
    full_name?: string
  }
}

interface PDFReport {
  id: number
  filename: string
  user_name: string
  user_email: string
  report_date: string
  created_at: string
  file_size: number
}




export default function Admin() {
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [pdfReports, setPdfReports] = useState<PDFReport[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [clientMessage, setClientMessage] = useState('')
  const [pdfMessage, setPdfMessage] = useState('')
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')


  const router = useRouter()
  // Trigger rebuild





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
        const statsRes = await api.get('/admin/stats')
        setUsers(statsRes.data.users)
        
        // Load all clients for admin (read-only)
        const clientsRes = await api.get('/clients/admin/all')
        setClients(clientsRes.data)
        
        // Load all PDF reports
        const pdfRes = await api.get('/pdf/admin/all')
        setPdfReports(pdfRes.data)

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
    if (!email || !name || !password) {
      setMessage('Please fill in all fields')
      return
    }

    try {
      await api.post('/auth/create-user', {
        email,
        full_name: name,
        password
      })
      setMessage('User created successfully!')
      setEmail('')
      setName('')
      setPassword('')
      
      // Reload users
      const res = await api.get('/admin/stats')
      setUsers(res.data.users)
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Failed to create user')
    }
  }

  const startEditClient = (client: Client) => {
    setEditingClient(client)
    setEditName(client.name)
    setEditPhone(client.phone)
    setEditAddress(client.address)
    setClientMessage('')
  }

  const cancelEditClient = () => {
    setEditingClient(null)
    setEditName('')
    setEditPhone('')
    setEditAddress('')
    setClientMessage('')
  }

  const updateClient = async () => {
    if (!editingClient) return
    try {
      await api.put(`/clients/${editingClient.id}`, {
        name: editName,
        phone: editPhone,
        address: editAddress
      })
      setClientMessage('Client updated successfully!')
      // Reload clients
      const clientsRes = await api.get('/clients/admin/all')
      setClients(clientsRes.data)
      cancelEditClient()
    } catch (e: any) {
      setClientMessage(e.response?.data?.detail || 'Error updating client')
    }
  }

  const deleteClient = async (clientId: number, clientName: string) => {
    if (!confirm(`Are you sure you want to delete client "${clientName}"?`)) return
    try {
      await api.delete(`/clients/${clientId}`)
      setClientMessage('Client deleted successfully!')
      // Reload clients
      const clientsRes = await api.get('/clients/admin/all')
      setClients(clientsRes.data)
    } catch (e: any) {
      setClientMessage(e.response?.data?.detail || 'Error deleting client')
    }
  }

  const viewPDF = async (pdfId: number) => {
    try {
      console.log('Fetching PDF with ID:', pdfId)
      const response = await api.get(`/pdf/admin/view/${pdfId}`, {
        responseType: 'blob'
      })
      
      console.log('Response received:', {
        status: response.status,
        contentType: response.headers['content-type'],
        dataSize: response.data.size,
        dataType: response.data.type
      })
      
      const blob = new Blob([response.data], { type: 'application/pdf' })
      console.log('Created blob:', {
        size: blob.size,
        type: blob.type
      })
      
      const url = window.URL.createObjectURL(blob)
      console.log('Created blob URL:', url)
      
      const newWindow = window.open(url, '_blank')
      if (!newWindow) {
        setPdfMessage('Popup blocked. Please allow popups for this site.')
        return
      }
      
      // Clean up the URL after a delay to allow the browser to load it
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 5000) // Increased timeout
      
    } catch (e: any) {
      console.error('Error viewing PDF:', e)
      setPdfMessage(e.response?.data?.detail || 'Error viewing PDF')
    }
  }

  const downloadPDF = async (pdfId: number, filename: string) => {
    try {
      const response = await api.get(`/pdf/admin/download/${pdfId}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      setPdfMessage('PDF downloaded successfully!')
    } catch (e: any) {
      setPdfMessage(e.response?.data?.detail || 'Error downloading PDF')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <div className="bg-blue-50 rounded-lg p-3 mr-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage users and system settings</p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-3">
            <button
              onClick={() => {
                Cookies.remove('token')
                router.push('/login')
              }}
              className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* Create User Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-6">
            <div className="bg-green-50 rounded-lg p-3 mr-4">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create New User</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                placeholder="Enter email address" 
                value={email} 
                onChange={(e)=>setEmail(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                placeholder="Enter full name" 
                value={name} 
                onChange={(e)=>setName(e.target.value)} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                placeholder="Enter password" 
                type="password" 
                value={password} 
                onChange={(e)=>setPassword(e.target.value)} 
              />
            </div>
            <div className="flex items-end">
              <button 
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg px-6 py-3 shadow-sm hover:shadow-md transition-all duration-200" 
                onClick={createUser}
              >
                Create User
              </button>
            </div>
          </div>
          {message && (
            <div className={`text-sm mt-4 p-3 rounded-lg ${
              message.includes('successfully') 
                ? 'text-green-700 bg-green-50 border border-green-200' 
                : 'text-red-700 bg-red-50 border border-red-200'
            }`}>
              {message}
            </div>
          )}
        </div>



        {/* User Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-6">
            <div className="bg-green-50 rounded-lg p-3 mr-4">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
              </svg>
            </div>
            <div className="flex items-center justify-between flex-1">
              <h2 className="text-2xl font-bold text-gray-900">System Users</h2>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {users.map(u => (
              <div key={u.id} className="py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 hover:bg-gray-50 transition-all duration-200">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-lg">
                      {u.full_name || u.email}
                    </div>
                    <div className="text-sm text-gray-600">
                      {u.email}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 flex-shrink-0">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 inline-block">
                    <div className="text-sm text-gray-600">Reports Created</div>
                    <div className="text-2xl font-bold text-gray-900">{u.count ?? '0'}</div>
                  </div>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                </svg>
                <p className="text-lg">No users found</p>
              </div>
            )}
          </div>
        </div>

        {/* Edit Client Form */}
        {editingClient && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="bg-yellow-50 rounded-lg p-3 mr-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Client</h2>
              </div>
              <button
                onClick={cancelEditClient}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Enter client name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Enter phone number"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Enter address"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg px-6 py-3 shadow-sm hover:shadow-md transition-all duration-200"
                onClick={updateClient}
              >
                Update Client
              </button>
              <button
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm hover:shadow-md transition-all duration-200"
                onClick={cancelEditClient}
              >
                Cancel
              </button>
            </div>

            {clientMessage && (
              <div className={`text-sm mt-4 p-3 rounded-lg ${
                clientMessage.includes('successfully') 
                  ? 'text-green-700 bg-green-50 border border-green-200' 
                  : 'text-red-700 bg-red-50 border border-red-200'
              }`}>
                {clientMessage}
              </div>
            )}
          </div>
        )}



        {/* Client Management List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-orange-50 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Client Management</h2>
            </div>
            <div className="text-sm text-gray-600">
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {clients.map(client => (
              <div key={client.id} className="p-6 hover:bg-gray-50 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 text-lg mb-2">
                        {client.name}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                          </svg>
                          {client.phone}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                          </svg>
                          {client.address}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                          </svg>
                          Owner: {client.user?.full_name || client.user?.email || 'Unknown'}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                          </svg>
                          Created: {new Date(client.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => startEditClient(client)}
                      className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-sm"
                      title="Edit Client"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteClient(client.id, client.name)}
                      className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-sm"
                      title="Delete Client"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {clients.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"></path>
                </svg>
                <p className="text-lg">No clients found</p>
              </div>
            )}
          </div>
        </div>

        {/* PDF Reports Management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-6">
            <div className="bg-red-50 rounded-lg p-3 mr-4">
              <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div className="flex items-center justify-between flex-1">
              <h2 className="text-2xl font-bold text-gray-900">PDF Reports</h2>
              <span className="text-sm text-gray-500">{pdfReports.length} reports</span>
            </div>
          </div>
          
          {pdfMessage && (
            <div className={`text-sm mb-4 p-3 rounded-lg ${
              pdfMessage.includes('successfully') 
                ? 'text-green-700 bg-green-50 border border-green-200' 
                : 'text-red-700 bg-red-50 border border-red-200'
            }`}>
              {pdfMessage}
            </div>
          )}
          
          <div className="space-y-4">
            {pdfReports.map(pdf => (
              <div key={pdf.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-all duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{pdf.filename}</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                          </svg>
                          {pdf.user_name} ({pdf.user_email})
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                          </svg>
                          Report Date: {new Date(pdf.report_date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                          </svg>
                          Size: {formatFileSize(pdf.file_size)}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                          </svg>
                          Created: {new Date(pdf.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => viewPDF(pdf.id)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-sm flex items-center"
                      title="View PDF"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <button
                      onClick={() => downloadPDF(pdf.id, pdf.filename)}
                      className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-sm flex items-center"
                      title="Download PDF"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pdfReports.length === 0 && (
              <div className="py-8 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"></path>
                </svg>
                <p className="text-lg">No PDF reports found</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  )
}