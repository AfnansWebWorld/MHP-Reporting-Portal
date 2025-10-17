import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { toast } from 'react-hot-toast'

interface OutStationExpense {
  id: number
  user_id: number
  user_name: string
  day: string
  day_of_month: number
  month: string
  station: string
  travelling: string
  km_travelled: number
  csr_verified: string
  summary_of_activity: string
  created_at: string
  pdf_report_id: number | null
}

interface User {
  id: number
  email: string
  full_name: string
  has_outstation_access: boolean
}

const TRAVEL_ALLOWANCE_RATE = 8

const AdminOutStationPage = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<OutStationExpense[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [expandedAccessUserId, setExpandedAccessUserId] = useState<number | null>(null)
  const [expandedExpenseUserId, setExpandedExpenseUserId] = useState<number | null>(null)

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: 'PKR',
        maximumFractionDigits: 0
      }),
    []
  )

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await api.get('/auth/me')
        if (response.data.role !== 'admin') {
          router.push('/dashboard')
          return
        }
        setIsAdmin(true)
        fetchData()
      } catch (error) {
        console.error('Failed to check admin status:', error)
        router.push('/login')
      }
    }

    checkAdmin()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch users
      const usersResponse = await api.get('/admin/users')
      setUsers(usersResponse.data)

      // Fetch available months
      const monthsResponse = await api.get('/admin/outstation-months')
      setMonths(monthsResponse.data)

      // Fetch expenses
      await fetchExpenses()
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchExpenses = async () => {
    try {
      let url = '/admin/outstation-expenses'
      const params: Record<string, any> = {}
      
      if (selectedUser) params.user_id = selectedUser
      if (selectedMonth) params.month = selectedMonth
      
      const response = await api.get(url, { params })
      setExpenses(response.data)
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
      toast.error('Failed to load expenses')
    }
  }

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value ? parseInt(e.target.value) : null
    setSelectedUser(value)
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value || null
    setSelectedMonth(value)
  }

  const applyFilters = () => {
    fetchExpenses()
  }

  const resetFilters = () => {
    setSelectedUser(null)
    setSelectedMonth(null)
    setTimeout(() => {
      fetchExpenses()
    }, 0)
  }

  const downloadPdf = async (pdfId: number) => {
    try {
      const response = await api.get(`/pdf/outstation/${pdfId}`, {
        responseType: 'blob'
      })
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `outstation-expense-${pdfId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Failed to download PDF:', error)
      toast.error('Failed to download PDF')
    }
  }

  const updateUserAccess = async (userId: number, hasAccess: boolean) => {
    try {
      await api.put(`/admin/users/${userId}/outstation-access`, {
        user_id: userId,
        has_outstation_access: hasAccess
      })
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, has_outstation_access: hasAccess } : user
      ))
      
      toast.success(`User access ${hasAccess ? 'granted' : 'revoked'} successfully`)
    } catch (error) {
      console.error('Failed to update user access:', error)
      toast.error('Failed to update user access')
    }
  }

  const generateMonthlyPdf = async (month: string, userId?: number) => {
    try {
      const params: Record<string, any> = { month }
      if (userId) params.user_id = userId
      
      console.log('Generating PDF for month:', month, 'user:', userId || 'all users')
      const response = await api.get('/pdf/outstation/generate_monthly/', { params })
      
      if (response.data.pdf_id) {
        console.log('PDF generated successfully, downloading PDF ID:', response.data.pdf_id)
        downloadPdf(response.data.pdf_id)
      } else {
        toast.error('No PDF was generated')
      }
    } catch (error) {
      console.error('Failed to generate monthly PDF:', error)
      toast.error('Failed to generate monthly PDF')
    }
  }

  const enabledUsersCount = useMemo(
    () => users.filter(user => user.has_outstation_access).length,
    [users]
  )

  const disabledUsersCount = users.length - enabledUsersCount

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => {
      const nameA = a.full_name || a.email
      const nameB = b.full_name || b.email
      return nameA.localeCompare(nameB)
    }),
    [users]
  )

  const getUserDisplayName = (user: User) => user.full_name || user.email

  const expensesByUser = useMemo(() => {
    const groups = new Map<
      number,
      {
        userId: number
        userName: string
        expenses: OutStationExpense[]
        totalKm: number
        totalAmount: number
      }
    >()

    expenses.forEach(expense => {
      const kmTravelled = expense.km_travelled || 0
      const amount = kmTravelled * TRAVEL_ALLOWANCE_RATE

      const existing = groups.get(expense.user_id)
      if (existing) {
        existing.expenses.push(expense)
        existing.totalKm += kmTravelled
        existing.totalAmount += amount
      } else {
        groups.set(expense.user_id, {
          userId: expense.user_id,
          userName: expense.user_name,
          expenses: [expense],
          totalKm: kmTravelled,
          totalAmount: amount
        })
      }
    })

    return Array.from(groups.values()).sort((a, b) => a.userName.localeCompare(b.userName))
  }, [expenses])

  const totalKmTravelled = useMemo(
    () => expenses.reduce((sum, expense) => sum + (expense.km_travelled || 0), 0),
    [expenses]
  )

  const totalAmountReimbursed = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) => sum + ((expense.km_travelled || 0) * TRAVEL_ALLOWANCE_RATE),
        0
      ),
    [expenses]
  )

  useEffect(() => {
    if (
      expandedAccessUserId !== null &&
      !users.some(user => user.id === expandedAccessUserId)
    ) {
      setExpandedAccessUserId(null)
    }
  }, [users, expandedAccessUserId])

  useEffect(() => {
    if (
      expandedExpenseUserId !== null &&
      !expensesByUser.some(group => group.userId === expandedExpenseUserId)
    ) {
      setExpandedExpenseUserId(null)
    }
  }, [expensesByUser, expandedExpenseUserId])

  const toggleAccessRow = (userId: number) => {
    setExpandedAccessUserId(prev => (prev === userId ? null : userId))
  }

  const toggleExpenseRow = (userId: number) => {
    setExpandedExpenseUserId(prev => (prev === userId ? null : userId))
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    )
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-red-500 mb-2">Admin access required</div>
          <div className="text-gray-500">You don't have permission to view this page.</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">TADA Expense Management</h1>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by User
              </label>
              <select
                id="user"
                value={selectedUser || ''}
                onChange={handleUserChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Month
              </label>
              <select
                id="month"
                value={selectedMonth || ''}
                onChange={handleMonthChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              >
                <option value="">All Months</option>
                {months.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end space-x-2">
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Reset
              </button>
            </div>
          </div>
          
          {/* Generate Monthly PDF */}
          {selectedMonth && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Generate Monthly Report</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => generateMonthlyPdf(selectedMonth, selectedUser || undefined)}
                  className="px-4 py-2 bg-green-600 text-white font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Generate PDF for {selectedMonth} {selectedUser ? '(Selected User)' : '(All Users)'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* User Access Management */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">User Access Management</h2>
              <p className="text-sm text-gray-500">Click a team member to view their TADA access and update permissions.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                Enabled: {enabledUsersCount}
              </span>
              <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full font-medium">
                Disabled: {disabledUsersCount}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                Total: {users.length}
              </span>
            </div>
          </div>

          {sortedUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No users found.</p>
          ) : (
            <div className="space-y-3">
              {sortedUsers.map(user => {
                const isExpanded = expandedAccessUserId === user.id

                return (
                  <div key={user.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => toggleAccessRow(user.id)}
                      className="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-600 font-semibold flex items-center justify-center">
                          {getUserDisplayName(user).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{getUserDisplayName(user)}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.has_outstation_access ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.has_outstation_access ? 'Access enabled' : 'Access disabled'}
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-200 px-4 sm:px-6 py-4 bg-gray-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1 text-sm text-gray-600">
                            <p>
                              <span className="font-medium text-gray-700">Email:</span> {user.email}
                            </p>
                            <p>
                              <span className="font-medium text-gray-700">Current status:</span>{' '}
                              <span className={user.has_outstation_access ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                {user.has_outstation_access ? 'Enabled' : 'Disabled'}
                              </span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateUserAccess(user.id, !user.has_outstation_access)}
                              className={`px-4 py-2 rounded-md text-white text-sm font-medium shadow-sm ${user.has_outstation_access ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                            >
                              {user.has_outstation_access ? 'Revoke access' : 'Grant access'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">TADA Expenses</h2>
              <p className="text-sm text-gray-500">Expand a user to review their submitted expense entries.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                Users: {expensesByUser.length}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                Records: {expenses.length}
              </span>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                Total KM: {totalKmTravelled}
              </span>
              <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                Total Amount: {currencyFormatter.format(totalAmountReimbursed)}
              </span>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No expenses found for the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              {expensesByUser.map(group => {
                const isExpanded = expandedExpenseUserId === group.userId
                const totalRecords = group.expenses.length

                return (
                  <div key={group.userId} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <button
                      type="button"
                      onClick={() => toggleExpenseRow(group.userId)}
                      className="w-full px-4 sm:px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-gray-900">{group.userName}</div>
                        <div className="text-xs text-gray-500">
                          {totalRecords} record{totalRecords !== 1 ? 's' : ''} · {group.totalKm} km travelled · {currencyFormatter.format(group.totalAmount)}
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 px-4 sm:px-6 py-4">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Travelling</th>
                                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KM Travelled</th>
                                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (PKR)</th>
                                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CSR Verified</th>
                                <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {group.expenses.map(expense => (
                                <tr key={expense.id}>
                                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {new Date(expense.day).toLocaleDateString()} (Day {expense.day_of_month})
                                  </td>
                                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-500">{expense.month}</td>
                                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-500">{expense.station}</td>
                                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-500">{expense.travelling}</td>
                                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-500">{expense.km_travelled}</td>
                                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                    {currencyFormatter.format((expense.km_travelled || 0) * TRAVEL_ALLOWANCE_RATE)}
                                  </td>
                                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-500">{expense.csr_verified}</td>
                                  <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm font-medium">
                                    {expense.pdf_report_id ? (
                                      <button
                                        onClick={() => downloadPdf(expense.pdf_report_id!)}
                                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                                      >
                                        Download PDF
                                      </button>
                                    ) : (
                                      <span className="text-xs text-gray-500">No PDF</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default AdminOutStationPage