import React, { useEffect, useMemo, useState } from 'react'
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
  user?: {
    id: number
    email: string
    full_name?: string
    designation?: string
  }
}

interface CurrentUser {
  id: number
  email: string
  role: string
  full_name?: string
}

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)

  const router = useRouter()

  const formatOwnerName = (client: Client) =>
    client.user?.full_name || client.user?.email || `User #${client.user_id}`

  const refreshClients = async () => {
    const clientsRes = await api.get('/clients/admin/all')
    setClients(clientsRes.data)
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = Cookies.get('token')
        if (!token) {
          router.push('/login')
          return
        }

        const userRes = await api.get('/auth/me')
        const user = userRes.data
        setCurrentUser(user)

        if (user.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        await refreshClients()
      } catch (error) {
        console.error('Failed to load clients', error)
        Cookies.remove('token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const totalClients = useMemo(() => clients.length, [clients])
  const totalOwners = useMemo(() => new Set(clients.map(client => client.user_id)).size, [clients])
  const latestClientCreatedAt = useMemo(() => {
    if (!clients.length) return null
    const newest = clients.reduce((acc, client) => {
      const createdAt = new Date(client.created_at).getTime()
      return createdAt > acc ? createdAt : acc
    }, 0)
    return newest ? new Date(newest).toLocaleDateString() : null
  }, [clients])

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients
    const searchLower = searchTerm.toLowerCase()
    return clients.filter(client =>
      client.name.toLowerCase().includes(searchLower) ||
      (client.phone && client.phone.toLowerCase().includes(searchLower)) ||
      (client.address && client.address.toLowerCase().includes(searchLower)) ||
      (client.user?.full_name && client.user.full_name.toLowerCase().includes(searchLower)) ||
      (client.user?.email && client.user.email.toLowerCase().includes(searchLower))
    )
  }, [clients, searchTerm])

  const startEditClient = (client: Client) => {
    setEditingClient(client)
    setEditName(client.name)
    setEditPhone(client.phone)
    setEditAddress(client.address)
    setMessage('')
  }

  const cancelEditClient = () => {
    setEditingClient(null)
    setEditName('')
    setEditPhone('')
    setEditAddress('')
    setMessage('')
  }

  const updateClient = async () => {
    if (!editingClient) return

    try {
      await api.put(`/clients/${editingClient.id}` , {
        name: editName,
        phone: editPhone,
        address: editAddress
      })
      await refreshClients()
      setMessage('Client updated successfully!')
      cancelEditClient()
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Error updating client')
    }
  }

  const deleteClient = async (clientId: number, clientName: string) => {
    if (!confirm(`Are you sure you want to delete client "${clientName}"?`)) return

    try {
      await api.delete(`/clients/${clientId}`)
      await refreshClients()
      setMessage('Client deleted successfully!')
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Error deleting client')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-gray-500">Loading clients...</div>
        </div>
      </Layout>
    )
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-red-600">Access Denied</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="bg-orange-50 rounded-lg p-3 mr-4">
              <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
              <p className="text-gray-600">Maintain client records and their ownership details.</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">Total clients</div>
            <div className="text-2xl font-bold text-gray-900">{totalClients}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">Active owners</div>
            <div className="text-2xl font-bold text-gray-900">{totalOwners}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">Most recent client</div>
            <div className="text-2xl font-bold text-gray-900">{latestClientCreatedAt || '—'}</div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Client directory</h2>
              <p className="text-sm text-gray-500">Search, edit, or remove clients from the system.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-72 border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-sm text-gray-500">{filteredClients.length} of {totalClients} shown</span>
            </div>
          </div>

          {message && (
            <div
              className={`mx-6 mt-4 rounded-lg p-3 text-sm ${
                message.includes('successfully')
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}

          <div className="divide-y divide-gray-200">
            {filteredClients.map(client => (
              <div key={client.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-gray-900">{client.name}</div>
                      <dl className="mt-2 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                          </svg>
                          {client.phone || 'No phone on file'}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path>
                          </svg>
                          {client.address || 'No address on file'}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                          </svg>
                          Owner: {formatOwnerName(client)}
                          {client.user?.designation && (
                            <span className="ml-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              {client.user.designation}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                          </svg>
                          Created: {new Date(client.created_at).toLocaleDateString()}
                        </div>
                      </dl>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button
                      onClick={() => startEditClient(client)}
                      className="flex-1 md:flex-initial bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteClient(client.id, client.name)}
                      className="flex-1 md:flex-initial bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!filteredClients.length && (
              <div className="py-12 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"></path>
                </svg>
                <p className="text-lg">No clients match your search</p>
              </div>
            )}
          </div>
        </section>

        {editingClient && (
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="client-modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={cancelEditClient}></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="bg-yellow-50 rounded-lg p-3 mr-4">
                        <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900" id="client-modal-title">Edit Client</h2>
                    </div>
                    <button
                      onClick={cancelEditClient}
                      className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
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
                      onClick={updateClient}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg px-6 py-3 shadow-sm hover:shadow-md transition-all duration-150"
                    >
                      Update Client
                    </button>
                    <button
                      onClick={cancelEditClient}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg px-6 py-3 shadow-sm hover:shadow-md transition-all duration-150"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
