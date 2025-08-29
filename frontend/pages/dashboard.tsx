import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'

interface Client { id: number; name: string; phone: string; address: string; user_id: number; created_at: string }
interface Report { id: number; client: Client; shift_timing: string; payment_received: boolean; payment_amount: number; physician_sample: boolean; order_received: boolean; created_at: string }
interface VisitStats { daily_visits: number; monthly_visits: number; total_visits: number }
interface GiveawayAssignment {
  id: number
  user_id: number
  giveaway_id: number
  quantity: number
  assigned_by: number
  assigned_at: string
  is_active: boolean
  giveaway?: {
    id: number
    name: string
  }
}

// Helper function to format currency with commas
const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function Dashboard() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [shift, setShift] = useState('Morning')
  const [payment, setPayment] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [physicianSample, setPhysicianSample] = useState(false)
  const [orderReceived, setOrderReceived] = useState(false)
  const [giveawayEnabled, setGiveawayEnabled] = useState(false)
  const [selectedGiveaway, setSelectedGiveaway] = useState<GiveawayAssignment | null>(null)
  const [giveawayQuantity, setGiveawayQuantity] = useState('')
  const [reports, setReports] = useState<Report[]>([])
  const [visitStats, setVisitStats] = useState<VisitStats>({ daily_visits: 0, monthly_visits: 0, total_visits: 0 })
  const [giveawayAssignments, setGiveawayAssignments] = useState<GiveawayAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [c, r, v, g] = await Promise.all([
          api.get('/clients/'),
          api.get('/reports/me'),
          api.get('/visits/stats'),
          api.get('/giveaways/my-giveaways'),
        ])
        setClients(c.data)
        setReports(r.data)
        setVisitStats(v.data)
        setGiveawayAssignments(g.data)
      } catch (e: any) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const onSave = async () => {
    if (!selectedClient) return
    setMessage('')
    try {
      const reportData: any = {
        client_id: selectedClient.id,
        shift_timing: shift,
        payment_received: payment,
        payment_amount: payment ? parseFloat(paymentAmount) || 0 : 0,
        physician_sample: physicianSample,
        order_received: orderReceived,
      }
      
      // Add giveaway usage if enabled
      if (giveawayEnabled && selectedGiveaway && giveawayQuantity) {
        const quantity = parseInt(giveawayQuantity)
        if (quantity > 0 && quantity <= selectedGiveaway.quantity) {
          reportData.giveaway_usage = {
            giveaway_assignment_id: selectedGiveaway.id,
            quantity_used: quantity
          }
        }
      }
      
      const res = await api.post('/reports/', reportData)
      setReports([res.data, ...reports])
      
      // Refresh call stats to show updated daily calls
      const visitStatsRes = await api.get('/visits/stats')
      setVisitStats(visitStatsRes.data)
      
      setSelectedClient(null)
      setShift('Morning')
      setPayment(false)
      setPaymentAmount('')
      setPhysicianSample(false)
      setOrderReceived(false)
      setGiveawayEnabled(false)
      setSelectedGiveaway(null)
      setGiveawayQuantity('')
      setMessage('Saved!')
    } catch (e: any) {
      setMessage(e.response?.data?.detail || 'Failed to save')
    }
  }

  const onPDF = async () => {
    try {
      setMessage('Generating PDF...')
      // Fetch PDF as blob with authentication
      const response = await api.get('/pdf/me', {
        responseType: 'blob'
      })
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      console.log('Content-Disposition header:', contentDisposition)
      let filename = 'reports.pdf' // fallback filename
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=([^;]+)/)
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/"/g, '') // remove quotes if present
          console.log('Extracted filename:', filename)
        }
      }
      console.log('Final filename:', filename)
      
      // Create blob URL and download
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setMessage('PDF generated successfully!')
      
      // refresh form for new entries and reload reports
      setSelectedClient(null)
      setShift('Morning')
      setPayment(false)
      setPaymentAmount('')
      setPhysicianSample(false)
      setOrderReceived(false)
      setGiveawayEnabled(false)
      setSelectedGiveaway(null)
      setGiveawayQuantity('')
      const r = await api.get('/reports/me')
      setReports(r.data)
    } catch (e: any) {
      setMessage(e.response?.data?.detail || 'Failed to generate PDF')
    }
  }

  const onSend = async () => {
    setMessage('Sending...')
    try {
      await api.post('/pdf/me/send')
      setMessage('Email sent! All reports have been cleared.')
      // Refresh reports list to show cleared data
      const r = await api.get('/reports/me')
      setReports(r.data)
      
      // Refresh call stats to show reset daily calls (should be 0)
      const visitStatsRes = await api.get('/visits/stats')
      setVisitStats(visitStatsRes.data)
    } catch (e: any) {
      setMessage(e.response?.data?.detail || 'Failed to send email')
    }
  }

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your reporting overview</p>
        </div>
          
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Daily Calls</p>
                <p className="text-2xl font-bold text-gray-900">{visitStats.daily_visits}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Monthly Calls</p>
                <p className="text-2xl font-bold text-gray-900">{visitStats.monthly_visits}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Daily Recovery</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reports.reduce((sum, r) => sum + (r.payment_amount || 0), 0))}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"></path>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium mb-1">Active Clients</p>
                <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
          
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center mb-6">
                <div className="bg-blue-50 rounded-lg p-3 mr-4">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Generate Call</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
                  <select className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" value={selectedClient?.id || ''} onChange={(e)=>{
                    const id = parseInt(e.target.value)
                    const c = clients.find(x=>x.id===id) || null
                    setSelectedClient(c)
                  }}>
                    <option value="">Select a client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-gray-50" value={selectedClient?.phone || ''} readOnly />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <input className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 bg-gray-50" value={selectedClient?.address || ''} readOnly />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shift Timing</label>
                    <select className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" value={shift} onChange={(e)=>setShift(e.target.value)}>
                      <option>Morning</option>
                      <option>Evening</option>
                    </select>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input id="pay" type="checkbox" className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2" checked={payment} onChange={(e)=>setPayment(e.target.checked)} />
                      <label htmlFor="pay" className="text-sm font-medium text-gray-700">Payment Received</label>
                    </div>
                    {payment && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount</label>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="Enter amount received" 
                          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                          value={paymentAmount} 
                          onChange={(e)=>setPaymentAmount(e.target.value)} 
                        />
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <input id="physician-sample" type="checkbox" className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2" checked={physicianSample} onChange={(e)=>setPhysicianSample(e.target.checked)} />
                      <label htmlFor="physician-sample" className="text-sm font-medium text-gray-700">Physician Sample (p/s)</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input id="order-received" type="checkbox" className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2" checked={orderReceived} onChange={(e)=>setOrderReceived(e.target.checked)} />
                      <label htmlFor="order-received" className="text-sm font-medium text-gray-700">Order Received</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input id="giveaway" type="checkbox" className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2" checked={giveawayEnabled} onChange={(e)=>setGiveawayEnabled(e.target.checked)} />
                      <label htmlFor="giveaway" className="text-sm font-medium text-gray-700">Give away</label>
                    </div>
                    {giveawayEnabled && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Select Giveaway</label>
                          <select 
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                            value={selectedGiveaway?.id || ''} 
                            onChange={(e)=>{
                              const id = parseInt(e.target.value)
                              const giveaway = giveawayAssignments.find(x=>x.id===id) || null
                              setSelectedGiveaway(giveaway)
                            }}
                          >
                            <option value="">Select a giveaway</option>
                            {giveawayAssignments.filter(g => g.is_active).map(g => (
                              <option key={g.id} value={g.id}>
                                {g.giveaway?.name} (Available: {g.quantity})
                              </option>
                            ))}
                          </select>
                        </div>
                        {selectedGiveaway && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity Given</label>
                            <input 
                              type="number" 
                              min="1" 
                              max={selectedGiveaway.quantity}
                              placeholder="Enter quantity given" 
                              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                              value={giveawayQuantity} 
                              onChange={(e)=>setGiveawayQuantity(e.target.value)} 
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button onClick={onSave} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                    Save Call
                  </button>
                </div>
                
                {message && <div className="mt-4 text-sm text-gray-600">{message}</div>}
              </div>
            </div>

            {/* My Daily Calls Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <div className="bg-indigo-50 rounded-lg p-2 mr-3">
                  <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
                  </svg>
                </div>
                My Daily Calls
              </h2>
              <div className="space-y-3 max-h-80 overflow-y-auto mb-6">
                {reports.map(r => (
                  <div key={r.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{r.client.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded">
                            {r.shift_timing}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            r.payment_received 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {r.payment_received ? formatCurrency(r.payment_amount || 0) : 'Unpaid'}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && <div className="p-4 text-gray-500 text-center">No records yet.</div>}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={onPDF} className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                  Generate PDF
                </button>
                <button onClick={onSend} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                  Submit Report
                </button>
              </div>
            </div>
          </div>
          
          {/* Right Sidebar */}
          <div className="space-y-6">

            
            {/* My Giveaways */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <div className="bg-purple-50 rounded-lg p-2 mr-3">
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
                  </svg>
                </div>
                My Giveaways
              </h3>
              <div className="space-y-4">
                {giveawayAssignments.length > 0 ? (
                  giveawayAssignments.map(assignment => (
                    <div key={assignment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900">
                              {assignment.giveaway?.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              Qty: {assignment.quantity}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {new Date(assignment.assigned_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path>
                    </svg>
                    <p className="text-gray-500">No giveaways assigned yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}