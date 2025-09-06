import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import Cookies from 'js-cookie'

interface OutStationExpense {
  id?: number
  day: string
  station: string
  travelling: string
  km_travelled: number
  csr_verified: string
  summary_of_activity: string
  month?: string
  day_of_month?: number
  created_at?: string
  pdf_report_id?: number | null
}

const OutStationExpensePage = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [expenses, setExpenses] = useState<OutStationExpense[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [expense, setExpense] = useState<OutStationExpense>({
    day: new Date().toISOString().split('T')[0],
    station: 'Base Station',
    travelling: '1-way',
    km_travelled: 0,
    csr_verified: '',
    summary_of_activity: ''
  })

  // Check if user has access to outstation expense feature and load data
  useEffect(() => {
    const checkAccessAndLoadData = async () => {
      setLoading(true)
      try {
        await api.get('/outstation/check-access')
        setHasAccess(true)
        
        // Load available months
        const monthsResponse = await api.get('/outstation/months')
        setAvailableMonths(monthsResponse.data)
        
        // If months are available, select the first one and load expenses
        if (monthsResponse.data && monthsResponse.data.length > 0) {
          setSelectedMonth(monthsResponse.data[0])
        }
      } catch (error) {
        console.error('Access check failed:', error)
        setHasAccess(false)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    checkAccessAndLoadData()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setExpense(prev => ({
      ...prev,
      [name]: name === 'km_travelled' ? parseFloat(value) || 0 : value
    }))
  }

  // Load expenses when selected month changes
  useEffect(() => {
    fetchExpenses()
  }, [selectedMonth, hasAccess])

  const savePdf = async (month: string) => {
    try {
      await api.post('/pdf/outstation/save', { month })
      toast.success('PDF saved successfully!')
      // Refresh expenses to show updated PDF status
      fetchExpenses()
    } catch (error) {
      console.error('Failed to save PDF:', error)
      toast.error('Failed to save PDF')
    }
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

  const fetchExpenses = async (month = selectedMonth) => {
    if (!month || !hasAccess) return
    
    setLoadingExpenses(true)
    try {
      const response = await api.get('/outstation/expenses', {
        params: { month }
      })
      setExpenses(response.data)
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
      toast.error('Failed to load expenses')
    } finally {
      setLoadingExpenses(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Check if token exists before submitting
      const token = Cookies.get('token')
      if (!token) {
        toast.error('Authentication token missing. Please log in again.')
        router.push('/login')
        return
      }

      await api.post('/outstation/expenses', expense)
      toast.success('Out Station Expense report submitted successfully!')
      
      // Reset form
      setExpense({
        day: new Date().toISOString().split('T')[0],
        station: 'Base Station',
        travelling: '1-way',
        km_travelled: 0,
        csr_verified: '',
        summary_of_activity: ''
      })
      
      // Refresh expenses list
      const monthsResponse = await api.get('/outstation/months')
      setAvailableMonths(monthsResponse.data)
      
      // Get the month of the submitted expense
      const submittedMonth = format(new Date(expense.day), 'MMMM yyyy')
      if (monthsResponse.data.includes(submittedMonth)) {
        setSelectedMonth(submittedMonth)
        
        // Save PDF for the month after submitting expense
        await savePdf(submittedMonth)
      }
    } catch (error: any) {
      console.error('Failed to submit expense:', error)
      
      if (error.response && error.response.status === 401) {
        toast.error('Authentication failed. Please log in again.')
        Cookies.remove('token')
        router.push('/login')
      } else {
        toast.error('Failed to submit expense report. Please try again.')
      }
    } finally {
      setSubmitting(false)
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

  if (!hasAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-red-500 mb-2">You don't have access to this feature.</div>
          <div className="text-gray-500">Please contact your administrator.</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Expense List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-white">My Out Station Expenses</h1>
            <div className="flex items-center space-x-3">
              {availableMonths.length > 0 && (
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1 rounded-md text-sm bg-gray-700 text-white border border-gray-600"
                >
                  {availableMonths.map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              )}
              {selectedMonth && (
                <button
                  onClick={() => savePdf(selectedMonth)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                >
                  Generate PDF
                </button>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {loadingExpenses ? (
              <div className="text-center py-4 text-gray-500">Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No expenses found for {selectedMonth || 'the selected month'}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Travelling</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KM</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CSR Verified</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PDF Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(exp.day).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.station}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.travelling}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.km_travelled}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.csr_verified}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {exp.pdf_report_id ? (
                            <button
                              onClick={() => downloadPdf(exp.pdf_report_id!)}
                              className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs hover:bg-green-200"
                            >
                              Download PDF
                            </button>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">Not Generated</span>
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
        
        {/* Expense Form */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-800 px-6 py-4">
            <h1 className="text-xl font-bold text-white">Submit New Expense</h1>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Day */}
            <div>
              <label htmlFor="day" className="block text-sm font-medium text-gray-700 mb-1">
                Day
              </label>
              <input
                type="date"
                id="day"
                name="day"
                value={expense.day}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              />
            </div>
            
            {/* Station */}
            <div>
              <label htmlFor="station" className="block text-sm font-medium text-gray-700 mb-1">
                Station
              </label>
              <select
                id="station"
                name="station"
                value={expense.station}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              >
                <option value="Base Station">Base Station</option>
                <option value="Ex.">Ex.</option>
                <option value="Night Stay">Night Stay</option>
              </select>
            </div>
            
            {/* Travelling */}
            <div>
              <label htmlFor="travelling" className="block text-sm font-medium text-gray-700 mb-1">
                Travelling
              </label>
              <select
                id="travelling"
                name="travelling"
                value={expense.travelling}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              >
                <option value="1-way">1-way</option>
                <option value="2-way">2-way</option>
              </select>
            </div>
            
            {/* KM-Travelled */}
            <div>
              <label htmlFor="km_travelled" className="block text-sm font-medium text-gray-700 mb-1">
                KM-Travelled
              </label>
              <input
                type="number"
                id="km_travelled"
                name="km_travelled"
                value={expense.km_travelled}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                min="0"
                step="0.1"
                required
              />
            </div>
            
            {/* CSR Verified */}
            <div>
              <label htmlFor="csr_verified" className="block text-sm font-medium text-gray-700 mb-1">
                CSR Verified
              </label>
              <input
                type="text"
                id="csr_verified"
                name="csr_verified"
                value={expense.csr_verified}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              />
            </div>
          </div>
          
          {/* Summary Of Activity */}
          <div>
            <label htmlFor="summary_of_activity" className="block text-sm font-medium text-gray-700 mb-1">
              Summary Of Activity
            </label>
            <textarea
              id="summary_of_activity"
              name="summary_of_activity"
              value={expense.summary_of_activity}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              required
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </Layout>
  )
}

export default OutStationExpensePage