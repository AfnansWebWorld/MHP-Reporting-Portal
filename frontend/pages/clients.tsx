import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import Cookies from 'js-cookie'

interface Client {
  id: number
  name: string
  phone: string
  address: string
  user_id: number
  created_at: string
}

interface CurrentUser {
  id: number
  email: string
  full_name?: string
  role: string
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const router = useRouter()

  useEffect(() => {
    const token = Cookies.get('token')
    if (!token) {
      router.push('/login')
      return
    }

    const load = async () => {
      try {
        const userRes = await api.get('/auth/me')
        const user = userRes.data
        setCurrentUser(user)
        
        // Redirect admin users away from client management
        if (user.role === 'admin') {
          router.push('/admin')
          return
        }
        
        const clientsRes = await api.get('/clients/')
         setClients(clientsRes.data)
      } catch (e: any) {
        console.error(e)
        if (e.response?.status === 401) {
          Cookies.remove('token')
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const createClient = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setMessage('Please fill in all fields')
      return
    }

    try {
      const response = await api.post('/clients/', {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim()
      })
      
      setClients([...clients, response.data])
      setName('')
      setPhone('')
      setAddress('')
      setMessage('Client created successfully!')
      setShowForm(false)
      
      setTimeout(() => setMessage(''), 3000)
    } catch (e: any) {
      console.error(e)
      setMessage(e.response?.data?.detail || 'Failed to create client')
    }
  }

  const startEdit = (client: Client) => {
    setEditingClient(client)
    setEditName(client.name)
    setEditPhone(client.phone)
    setEditAddress(client.address)
    setShowForm(false)
  }

  const cancelEdit = () => {
    setEditingClient(null)
    setEditName('')
    setEditPhone('')
    setEditAddress('')
  }

  const updateClient = async () => {
    if (!editingClient || !editName.trim() || !editPhone.trim() || !editAddress.trim()) {
      setMessage('Please fill in all fields')
      return
    }

    try {
      const response = await api.put(`/clients/${editingClient.id}`, {
        name: editName.trim(),
        phone: editPhone.trim(),
        address: editAddress.trim()
      })
      
      setClients(clients.map(c => c.id === editingClient.id ? response.data : c))
      setMessage('Client updated successfully!')
      cancelEdit()
      
      setTimeout(() => setMessage(''), 3000)
    } catch (e: any) {
      console.error(e)
      setMessage(e.response?.data?.detail || 'Failed to update client')
    }
  }

  const deleteClient = async (clientId: number, clientName: string) => {
    if (!confirm(`Are you sure you want to delete client "${clientName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/clients/${clientId}`)
      setClients(clients.filter(c => c.id !== clientId))
      setMessage('Client deleted successfully!')
      
      setTimeout(() => setMessage(''), 3000)
    } catch (e: any) {
      console.error(e)
      setMessage(e.response?.data?.detail || 'Failed to delete client')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Management</h1>
            <p className="text-gray-600">Manage your clients and their information</p>
          </div>
          <div className="mt-4 sm:mt-0">
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

        {/* Add Client Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-blue-50 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentUser?.role === 'admin' ? 'Client Management' : 'Add New Client'}
              </h2>
            </div>
            {currentUser?.role !== 'admin' && (
              <button
                onClick={() => {
                  setShowForm(!showForm)
                  if (!showForm) {
                    cancelEdit()
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-6 py-3 shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200"
              >
                {showForm ? 'Cancel' : 'Add Client'}
              </button>
            )}
              </div>

          {showForm && currentUser?.role !== 'admin' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter client name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg px-6 py-3 shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={createClient}
                >
                  Save Client
                </button>
              </div>
            </div>
          )}
              
          {currentUser?.role === 'admin' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-lg mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Access</h3>
              <p className="text-gray-600">As an admin, you can edit and delete all clients below. Regular users can add new clients.</p>
            </div>
          )}

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

        {/* Edit Client Form */}
        {editingClient && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="bg-orange-50 rounded-lg p-3 mr-4">
                  <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Client: {editingClient.name}
                </h2>
              </div>
              <button
                onClick={cancelEdit}
                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm hover:shadow-md transition-all duration-200"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="Enter client name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="Enter phone number"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                    placeholder="Enter address"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  className="bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg px-6 py-3 shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={updateClient}
                >
                  Update Client
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clients List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-50 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">My Clients</h2>
            </div>
            <div className="text-sm text-gray-600">
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {clients.map(client => (
              <div key={client.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all duration-200">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 text-lg">{client.name}</div>
                    <div className="text-sm text-gray-600 flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                      </svg>
                      <span className="mr-4">{client.phone}</span>
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                      </svg>
                      <span>{client.address}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                    <div className="text-xs text-gray-500">Added</div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(client.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {/* Admin Actions */}
                  {currentUser?.role === 'admin' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(client)}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200 text-sm"
                        title="Edit Client"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteClient(client.id, client.name)}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200 text-sm"
                        title="Delete Client"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {clients.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                </svg>
                <p className="text-lg mb-2 text-gray-900">No clients found</p>
                <p className="text-sm">Add your first client to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}