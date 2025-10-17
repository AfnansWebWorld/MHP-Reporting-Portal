import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import Cookies from 'js-cookie'

interface User {
  id: number
  email: string
  full_name?: string
  designation?: string
  active_clients_count?: number
}

interface Client {
  id: number
  name: string
  user_id: number
}

interface ClientAssignment {
  id: number
  client_id: number
  junior_id: number
  manager_id: number
  assigned_at: string
}

interface CurrentUser {
  id: number
  email: string
  role: string
  full_name?: string
}

export default function AdminClientAssignments() {
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [clientAssignments, setClientAssignments] = useState<ClientAssignment[]>([])

  const [selectedOwnerId, setSelectedOwnerId] = useState<number | ''>('')
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | ''>('')
  const [assignmentMessage, setAssignmentMessage] = useState('')
  const [expandedOwnerId, setExpandedOwnerId] = useState<number | null>(null)

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  const formatUserName = (user?: User, fallbackId?: number) =>
    user?.full_name || user?.email || (fallbackId ? `User #${fallbackId}` : 'Unknown user')

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

        const statsRes = await api.get('/admin/stats')
        setUsers(statsRes.data.users)

        const clientsRes = await api.get('/clients/admin/all')
        setClients(clientsRes.data)

        const assignmentsRes = await api.get('/admin/client-assignments')
        setClientAssignments(assignmentsRes.data)
      } catch (error) {
        console.error('Failed to load client assignments', error)
        Cookies.remove('token')
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const totalAssignedClients = useMemo(() => clientAssignments.length, [clientAssignments])
  const distinctManagers = useMemo(() => new Set(clientAssignments.map(a => a.manager_id)).size, [clientAssignments])
  const distinctAssignees = useMemo(() => new Set(clientAssignments.map(a => a.junior_id)).size, [clientAssignments])

  const assignmentsByOwner = useMemo(() => {
    const groups = new Map<number, {
      ownerId: number
      owner: User | undefined
      assigneeIds: Set<number>
      assignments: Array<{
        assignment: ClientAssignment
        client: Client | undefined
        assignee: User | undefined
      }>
    }>()

    clientAssignments.forEach(assignment => {
      const ownerId = assignment.manager_id
      const group = groups.get(ownerId)
      const owner = users.find(u => u.id === ownerId)
      const client = clients.find(c => c.id === assignment.client_id)
      const assignee = users.find(u => u.id === assignment.junior_id)

      const entry = {
        assignment,
        client,
        assignee
      }

      if (group) {
        group.assignments.push(entry)
        group.assigneeIds.add(assignment.junior_id)
      } else {
        groups.set(ownerId, {
          ownerId,
          owner,
          assigneeIds: new Set([assignment.junior_id]),
          assignments: [entry]
        })
      }
    })

    return Array.from(groups.values()).map(group => ({
      ownerId: group.ownerId,
      owner: group.owner,
      assignments: group.assignments,
      assigneesCount: group.assigneeIds.size
    })).sort((a, b) => {
      const nameA = a.owner?.full_name || a.owner?.email || `User #${a.ownerId}`
      const nameB = b.owner?.full_name || b.owner?.email || `User #${b.ownerId}`
      return nameA.localeCompare(nameB)
    })
  }, [clientAssignments, users, clients])

  useEffect(() => {
    if (expandedOwnerId !== null && !assignmentsByOwner.some(group => group.ownerId === expandedOwnerId)) {
      setExpandedOwnerId(null)
    }
  }, [assignmentsByOwner, expandedOwnerId])

  const createClientAssignment = async () => {
    if (!selectedAssigneeId || !selectedOwnerId) {
      setAssignmentMessage('Please select both source and target users')
      return
    }

    if (selectedAssigneeId === selectedOwnerId) {
      setAssignmentMessage('Error: Cannot assign clients to the same user')
      return
    }

    try {
      const response = await api.post('/admin/assign-user-clients', {
        source_user_id: selectedOwnerId,
        target_user_id: selectedAssigneeId
      })

      const { message: serverMessage, assignments_created } = response.data
      setAssignmentMessage(
        serverMessage || `Successfully assigned ${assignments_created ?? 0} clients from source user to target user`
      )
      setSelectedAssigneeId('')
      setSelectedOwnerId('')

      const assignmentsRes = await api.get('/admin/client-assignments')
      setClientAssignments(assignmentsRes.data)
    } catch (error: any) {
      setAssignmentMessage(error.response?.data?.detail || 'Failed to assign clients')
    }
  }

  const toggleOwnerAssignments = (ownerId: number) => {
    setAssignmentMessage('')
    setExpandedOwnerId((prev) => (prev === ownerId ? null : ownerId))
  }

  const deleteClientAssignment = async (assignmentId: number) => {
    try {
      await api.delete(`/admin/client-assignments/${assignmentId}`)

      const assignmentsRes = await api.get('/admin/client-assignments')
      setClientAssignments(assignmentsRes.data)
      setAssignmentMessage('Assignment removed successfully')
    } catch (error: any) {
      setAssignmentMessage(error.response?.data?.detail || 'Failed to remove assignment')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[70vh] flex items-center justify-center">
          <div className="text-gray-500">Loading assignments...</div>
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
            <div className="bg-indigo-50 rounded-lg p-3 mr-4">
              <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Client Assignments</h1>
              <p className="text-gray-600">Transfer clients between team members and review the assignment log.</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">Active assignments</div>
            <div className="text-2xl font-bold text-gray-900">{totalAssignedClients}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">Managers involved</div>
            <div className="text-2xl font-bold text-gray-900">{distinctManagers}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-sm text-gray-500">Assignees receiving clients</div>
            <div className="text-2xl font-bold text-gray-900">{distinctAssignees}</div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Assign all clients from one user to another</h2>
            <p className="text-sm text-gray-500 mt-1">
              Choose the current owner and the new assignee. All active clients will be transferred in a single action.
            </p>
          </div>
          <div className="p-6 border-b border-gray-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From user (current owner)</label>
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                >
                  <option value="">-- Select source user --</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email} ({user.active_clients_count || 0} clients)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To user (new owner)</label>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                >
                  <option value="">-- Select target user --</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={createClientAssignment}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Assign all clients
                </button>
              </div>
            </div>

            {assignmentMessage && (
              <div
                className={`text-sm mt-2 p-3 rounded-lg ${
                  assignmentMessage.includes('successfully')
                    ? 'text-green-700 bg-green-50 border border-green-200'
                    : 'text-red-700 bg-red-50 border border-red-200'
                }`}
              >
                {assignmentMessage}
              </div>
            )}
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-semibold text-gray-900">Active assignments</h2>
              {assignmentsByOwner.length > 0 && (
                <span className="text-sm text-gray-500">Grouped by current owner</span>
              )}
            </div>
            {assignmentsByOwner.length === 0 ? (
              <p className="text-gray-500 italic">No active client assignments</p>
            ) : (
              <div className="space-y-4">
                {assignmentsByOwner.map(group => {
                  const isExpanded = expandedOwnerId === group.ownerId
                  const totalAssignments = group.assignments.length

                  return (
                    <div key={group.ownerId} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => toggleOwnerAssignments(group.ownerId)}
                        className="w-full px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col gap-3 text-left md:flex-row md:items-center md:justify-between hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-600/10 text-indigo-600 font-semibold flex items-center justify-center">
                            {formatUserName(group.owner, group.ownerId).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {formatUserName(group.owner, group.ownerId)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {totalAssignments} assignment{totalAssignments !== 1 ? 's' : ''} · {group.assigneesCount} assignee{group.assigneesCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-auto">
                          {group.owner?.designation && (
                            <span className="text-xs font-medium uppercase tracking-wide text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                              {group.owner.designation}
                            </span>
                          )}
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-gray-200">
                          {group.assignments.map(({ assignment, client, assignee }) => (
                            <div
                              key={assignment.id}
                              className="px-6 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900">
                                  {client?.name || `Client #${assignment.client_id}`}
                                </div>
                                <div className="mt-1 text-sm text-gray-500 space-y-1">
                                  <p>
                                    <span className="font-medium text-gray-700">Assigned to:</span>{' '}
                                    {formatUserName(assignee, assignment.junior_id)}
                                  </p>
                                  <p>
                                    <span className="font-medium text-gray-700">Assigned at:</span>{' '}
                                    {new Date(assignment.assigned_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <button
                                  onClick={() => deleteClientAssignment(assignment.id)}
                                  className="text-sm font-medium text-red-600 hover:text-red-700"
                                >
                                  Remove assignment
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  )
}
