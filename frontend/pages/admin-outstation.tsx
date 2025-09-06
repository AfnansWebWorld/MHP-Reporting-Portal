import React, { useState, useEffect } from 'react'
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

const AdminOutStationPage = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [expenses, setExpenses] = useState<OutStationExpense[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

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
      
      const response = await api.get('/pdf/outstation/generate', { params })
      
      if (response.data.pdf_id) {
        downloadPdf(response.data.pdf_id)
      } else {
        toast.error('No PDF was generated')
      }
    } catch (error) {
      console.error('Failed to generate monthly PDF:', error)
      toast.error('Failed to generate monthly PDF')
    }
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
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Out Station Expense Management</h1>
          
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
          <h2 className="text-xl font-bold text-gray-800 mb-4">User Access Management</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Out Station Access
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.has_outstation_access ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.has_outstation_access ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => updateUserAccess(user.id, !user.has_outstation_access)}
                        className={`px-3 py-1 rounded-md text-white text-xs font-medium ${user.has_outstation_access ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                      >
                        {user.has_outstation_access ? 'Revoke Access' : 'Grant Access'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Out Station Expenses</h2>
          
          {expenses.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No expenses found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Month
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Station
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Travelling
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      KM
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CSR Verified
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {expenses.map(expense => (
                    <tr key={expense.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {expense.user_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(expense.day).toLocaleDateString()} (Day {expense.day_of_month})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.month}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.station}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.travelling}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.km_travelled}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {expense.csr_verified}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
          )}
        </div>
      </div>
    </Layout>
  )
}

export default AdminOutStationPage