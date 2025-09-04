import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import Cookies from 'js-cookie'

interface User { id: number; email: string; full_name?: string; count?: number; visit_count?: number }
interface CurrentUser { id: number; email: string; full_name?: string; role: string }

interface Giveaway {
  id: number
  name: string
  created_at: string
  is_active: boolean
}

interface GiveawayAssignment {
  id: number
  user_id: number
  giveaway_id: number
  quantity: number
  assigned_by: number
  assigned_at: string
  is_active: boolean
  user?: {
    id: number
    email: string
    full_name?: string
  }
  giveaway?: {
    id: number
    name: string
  }
}

export default function Giveaways() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [giveaways, setGiveaways] = useState<Giveaway[]>([])
  const [giveawayAssignments, setGiveawayAssignments] = useState<GiveawayAssignment[]>([])
  const [selectedGiveaway, setSelectedGiveaway] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [quantity, setQuantity] = useState('')
  const [giveawayMessage, setGiveawayMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = Cookies.get('token')
        if (!token) {
          router.push('/login')
          return
        }

        // Fetch current user
        const userResponse = await api.get('/auth/me')
        setCurrentUser(userResponse.data)

        // Check if user is admin
        if (userResponse.data.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        // Fetch users, giveaways, and assignments
        const [usersResponse, giveawaysResponse, assignmentsResponse] = await Promise.all([
          api.get('/admin/users'),
          api.get('/giveaways/'),
          api.get('/giveaways/assignments')
        ])

        setUsers(usersResponse.data)
        setGiveaways(giveawaysResponse.data)
        setGiveawayAssignments(assignmentsResponse.data)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const assignGiveaway = async () => {
    if (!selectedGiveaway || !selectedUser || !quantity) {
      setGiveawayMessage('Please fill in all fields')
      return
    }

    try {
      await api.post('/giveaways/assign', {
        giveaway_id: parseInt(selectedGiveaway),
        user_id: parseInt(selectedUser),
        quantity: parseInt(quantity)
      })

      setGiveawayMessage('Giveaway assigned successfully!')
      setSelectedGiveaway('')
      setSelectedUser('')
      setQuantity('')

      // Refresh assignments
      const assignmentsResponse = await api.get('/giveaways/assignments')
      setGiveawayAssignments(assignmentsResponse.data)
    } catch (error: any) {
      console.error('Failed to assign giveaway:', error)
      setGiveawayMessage(error.response?.data?.detail || 'Failed to assign giveaway')
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

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white text-xl">Access Denied</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div className="flex items-center mb-4 sm:mb-0">
                <div className="bg-purple-50 rounded-lg p-3 mr-4">
                  <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    🎁 Giveaway Management
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Manage and assign giveaways to users
                  </p>
                </div>
              </div>
              {/* Logout button removed as it's already available in the navbar */}
            </div>
          </div>

          {/* Giveaway Assignment Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <div className="bg-green-50 rounded-lg p-2 mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
                  </svg>
                </div>
                🎁 Assign Giveaway
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Giveaway</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    value={selectedGiveaway}
                    onChange={(e) => setSelectedGiveaway(e.target.value)}
                  >
                    <option value="">Select Giveaway</option>
                    {giveaways.map(giveaway => (
                      <option key={giveaway.id} value={giveaway.id}>
                        {giveaway.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    <option value="">Select User</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                    placeholder="Enter quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg px-6 py-3 transition-colors duration-200"
                    onClick={assignGiveaway}
                  >
                    🎁 Assign Giveaway
                  </button>
                </div>
              </div>
              {giveawayMessage && (
                <div className={`text-sm mt-4 p-3 rounded-lg ${
                  giveawayMessage.includes('successfully') 
                    ? 'text-green-800 bg-green-50 border border-green-200' 
                    : 'text-red-800 bg-red-50 border border-red-200'
                }`}>
                  {giveawayMessage}
                </div>
              )}
            </div>
          </div>

          {/* Giveaway Assignments List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center">
                  <div className="bg-blue-50 rounded-lg p-2 mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    <span className="inline-block mr-2">📋</span>
                    <span>Giveaway Assignments</span>
                  </h3>
                </div>
                <div className="text-sm text-gray-600 ml-10 sm:ml-0">
                  {giveawayAssignments.length} assignment{giveawayAssignments.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {giveawayAssignments.length > 0 ? (
                giveawayAssignments.map(assignment => (
                  <div key={assignment.id} className="p-6 hover:bg-gray-50 transition-all duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-lg mb-2">
                          {assignment.giveaway?.name}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                            </svg>
                            {assignment.user?.full_name || assignment.user?.email}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd"></path>
                            </svg>
                            Quantity: {assignment.quantity}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                            </svg>
                            {new Date(assignment.assigned_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
                  </svg>
                  <p className="text-gray-500 text-lg">No giveaway assignments found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}