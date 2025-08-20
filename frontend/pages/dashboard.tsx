import React, { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { api } from '../lib/api'

interface Client { id: number; name: string; phone: string; address: string }
interface Report { id: number; client: Client; shift_timing: string; payment_received: boolean; created_at: string }

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [shift, setShift] = useState('Morning')
  const [payment, setPayment] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [c, r] = await Promise.all([
          api.get('/clients/'),
          api.get('/reports/me'),
        ])
        setClients(c.data)
        setReports(r.data)
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
      const res = await api.post('/reports/', {
        client_id: selectedClient.id,
        shift_timing: shift,
        payment_received: payment,
      })
      setReports([res.data, ...reports])
      setSelectedClient(null)
      setShift('Morning')
      setPayment(false)
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
      
      // Create blob URL and download
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'reports.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setMessage('PDF generated successfully!')
      
      // refresh form for new entries and reload reports
      setSelectedClient(null)
      setShift('Morning')
      setPayment(false)
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
    } catch (e: any) {
      setMessage(e.response?.data?.detail || 'Failed to send email')
    }
  }

  return (
    <Layout>
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 -z-10">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="w-full max-w-none md:max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 relative z-10">
          <div className="mb-6 md:mb-10">
            <div className="text-center mb-6 md:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl mb-4 md:mb-6 shadow-lg">
                <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 md:mb-3 tracking-tight">📊 Dashboard</h1>
              <p className="text-white/80 text-base md:text-lg">Welcome back! Here's your reporting overview</p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-10">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-6 text-white relative overflow-hidden hover:bg-white/15 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-purple-600/10 to-transparent rounded-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-semibold mb-2">Total Reports</p>
                    <p className="text-3xl font-bold">{reports.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl p-3 shadow-lg">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-6 text-white relative overflow-hidden hover:bg-white/15 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-pink-600/10 to-transparent rounded-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-semibold mb-2">This Month</p>
                    <p className="text-3xl font-bold">{reports.filter(r => new Date(r.created_at).getMonth() === new Date().getMonth()).length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl p-3 shadow-lg">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-6 text-white relative overflow-hidden hover:bg-white/15 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-orange-600/10 to-transparent rounded-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-semibold mb-2">Paid Reports</p>
                    <p className="text-3xl font-bold">{reports.filter(r => r.payment_received).length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl p-3 shadow-lg">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"></path>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-3xl p-6 text-white relative overflow-hidden hover:bg-white/15 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-green-600/10 to-transparent rounded-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm font-semibold mb-2">Active Clients</p>
                    <p className="text-3xl font-bold">{clients.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-2xl p-3 shadow-lg">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
            {/* Form Section */}
            <div className="xl:col-span-2">
              <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-2xl md:rounded-3xl p-4 md:p-8 mb-6 md:mb-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent rounded-3xl"></div>
                <div className="relative z-10">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-6 md:mb-8 flex items-center">
                    <svg className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd"></path>
                    </svg>
                    <span className="hidden sm:inline">Generate New Report</span>
                    <span className="sm:hidden">New Report</span>
                  </h2>
                  <div className="space-y-4 md:space-y-6">
          <div>
              <label className="block text-sm font-semibold text-white mb-2">👤 Client Name</label>
              <select className="w-full border border-white/30 bg-white/30 backdrop-blur-sm rounded-lg px-3 md:px-4 py-2 md:py-3 text-gray-800 font-medium shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm md:text-base" value={selectedClient?.id || ''} onChange={(e)=>{
                const id = parseInt(e.target.value)
                const c = clients.find(x=>x.id===id) || null
                setSelectedClient(c)
              }}>
                <option value="">Select a client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">📞 Phone Number</label>
                <input className="w-full border border-white/30 bg-white/30 backdrop-blur-sm rounded-lg px-3 md:px-4 py-2 md:py-3 text-gray-800 font-medium shadow-sm text-sm md:text-base" value={selectedClient?.phone || ''} readOnly />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">📍 Address</label>
                <input className="w-full border border-white/30 bg-white/30 backdrop-blur-sm rounded-lg px-3 md:px-4 py-2 md:py-3 text-gray-800 font-medium shadow-sm text-sm md:text-base" value={selectedClient?.address || ''} readOnly />
              </div>
            </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">⏰ Shift Timing</label>
                <select className="w-full border border-white/30 bg-white/30 backdrop-blur-sm rounded-lg px-3 md:px-4 py-2 md:py-3 text-gray-800 font-medium shadow-sm focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all text-sm md:text-base" value={shift} onChange={(e)=>setShift(e.target.value)}>
                  <option>Morning</option>
                  <option>Evening</option>
                </select>
              </div>
              <div className="flex items-center space-x-3 md:mt-8">
                <input id="pay" type="checkbox" className="w-4 h-4 md:w-5 md:h-5 text-blue-600 bg-white/30 border-white/30 rounded focus:ring-blue-500 focus:ring-2" checked={payment} onChange={(e)=>setPayment(e.target.checked)} />
                <label htmlFor="pay" className="text-sm font-semibold text-white">💰 Payment Received</label>
              </div>
            </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mt-4 md:mt-6 mb-6 md:mb-8">
            <button onClick={onSave} className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 backdrop-blur-sm border border-green-400/30 text-sm md:text-base">
              <span className="hidden sm:inline">💾 Save</span>
              <span className="sm:hidden">💾 Save Report</span>
            </button>
            <button onClick={onPDF} className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 backdrop-blur-sm border border-gray-400/30 text-sm md:text-base">
              <span className="hidden sm:inline">📄 Generate PDF</span>
              <span className="sm:hidden">📄 PDF</span>
            </button>
            <button onClick={onSend} className="flex-1 sm:flex-none px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 backdrop-blur-sm border border-blue-400/30 text-sm md:text-base">
              <span className="hidden sm:inline">📧 Send Report</span>
              <span className="sm:hidden">📧 Send</span>
            </button>
          </div>
          {message && <div className="text-sm text-white">{message}</div>}
        </div>
      </div>

      {/* My Records Section */}
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-2xl md:rounded-3xl p-4 md:p-8 mb-6 mt-6 md:mt-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-blue-500/5 to-transparent rounded-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6 md:mb-8 flex items-center">
            <svg className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
            </svg>
            <span className="hidden sm:inline">📋 My Records</span>
            <span className="sm:hidden">📋 Records</span>
          </h2>
          <div className="bg-white/15 backdrop-blur-md border border-white/25 shadow-xl rounded-xl md:rounded-2xl divide-y divide-white/20">
            {reports.map(r => (
              <div key={r.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-white/5 transition-all duration-200">
                <div className="flex-1">
                  <div className="font-bold text-base md:text-lg text-white mb-1">{r.client.name}</div>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
                    <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full font-medium bg-blue-100/50 text-blue-800 backdrop-blur-sm">
                      ⏰ {r.shift_timing}
                    </span>
                    <span className={`inline-flex items-center px-2 md:px-3 py-1 rounded-full font-medium backdrop-blur-sm ${
                      r.payment_received 
                        ? 'bg-green-100/50 text-green-800' 
                        : 'bg-red-100/50 text-red-800'
                    }`}>
                      {r.payment_received ? '💰 Paid' : '❌ Unpaid'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 md:mt-0 text-xs md:text-sm font-medium text-white bg-white/20 px-2 md:px-3 py-1 rounded-lg backdrop-blur-sm">
                  📅 {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {reports.length === 0 && <div className="p-4 text-white/70">No records yet.</div>}
          </div>
        </div>
      </div>
    </div>
    </div>
    
    {/* Right Sidebar */}
    <div className="space-y-4 md:space-y-6">
      {/* Quick Stats */}
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-2xl md:rounded-3xl p-4 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent rounded-3xl"></div>
        <div className="relative z-10">
          <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 flex items-center">
            <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path>
            </svg>
            <span className="hidden sm:inline">📊 Quick Stats</span>
            <span className="sm:hidden">📊 Stats</span>
          </h3>
          <div className="space-y-3 md:space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/80 text-sm md:text-base">Today's Reports</span>
              <span className="font-bold text-blue-400 text-sm md:text-base">{reports.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/80 text-sm md:text-base">Pending Payments</span>
              <span className="font-bold text-red-400 text-sm md:text-base">{reports.filter(r => !r.payment_received).length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/80 text-sm md:text-base">Completion Rate</span>
              <span className="font-bold text-green-400 text-sm md:text-base">{reports.length > 0 ? Math.round((reports.filter(r => r.payment_received).length / reports.length) * 100) : 0}%</span>
            </div>
          </div>
        </div>
      </div>
      

      
      {/* Payment Overview */}
      <div className="bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-2xl md:rounded-3xl p-4 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-purple-500/5 to-transparent rounded-3xl"></div>
        <div className="relative z-10">
          <h3 className="text-lg md:text-xl font-bold text-white mb-4 md:mb-6 flex items-center">
            <svg className="w-4 h-4 md:w-5 md:h-5 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"></path>
            </svg>
            <span className="hidden sm:inline">💰 Payment Overview</span>
            <span className="sm:hidden">💰 Payments</span>
          </h3>
          <div className="space-y-3 md:space-y-4">
            <div className="relative">
              <div className="flex justify-between text-xs md:text-sm mb-2">
                <span className="text-white/80">Paid</span>
                <span className="text-green-400 font-medium">{reports.filter(r => r.payment_received).length}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                  style={{width: `${reports.length > 0 ? (reports.filter(r => r.payment_received).length / reports.length) * 100 : 0}%`}}
                ></div>
              </div>
            </div>
            <div className="relative">
              <div className="flex justify-between text-xs md:text-sm mb-2">
                <span className="text-white/80">Pending</span>
                <span className="text-red-400 font-medium">{reports.filter(r => !r.payment_received).length}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all duration-300" 
                  style={{width: `${reports.length > 0 ? (reports.filter(r => !r.payment_received).length / reports.length) * 100 : 0}%`}}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
    </Layout>
  )
}