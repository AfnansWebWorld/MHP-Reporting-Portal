import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import Cookies from 'js-cookie'

interface CurrentUser {
  id: number
  email: string
  full_name?: string
  role: string
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

interface UserWithReports {
  id: number
  email: string
  full_name?: string
  report_count: number
  total_size: number
  latest_report: string
}

export default function PDFReports() {
  const [pdfReports, setPdfReports] = useState<PDFReport[]>([])
  const [users, setUsers] = useState<UserWithReports[]>([])
  const [selectedUser, setSelectedUser] = useState<UserWithReports | null>(null)
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const router = useRouter()

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
        
        // Load all PDF reports
        const pdfRes = await api.get('/pdf/admin/all')
        setPdfReports(pdfRes.data)
        
        // Group reports by user
        const userMap = new Map<string, UserWithReports>()
        pdfRes.data.forEach((report: PDFReport) => {
          const key = report.user_email
          if (userMap.has(key)) {
            const user = userMap.get(key)!
            user.report_count += 1
            user.total_size += report.file_size
            if (new Date(report.created_at) > new Date(user.latest_report)) {
              user.latest_report = report.created_at
            }
          } else {
            userMap.set(key, {
              id: Math.random(), // temporary ID
              email: report.user_email,
              full_name: report.user_name,
              report_count: 1,
              total_size: report.file_size,
              latest_report: report.created_at
            })
          }
        })
        setUsers(Array.from(userMap.values()))

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
        setMessage('Popup blocked. Please allow popups for this site.')
        return
      }
      
      // Clean up the URL after a delay to allow the browser to load it
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
      }, 5000)
      
    } catch (e: any) {
      console.error('Error viewing PDF:', e)
      setMessage(e.response?.data?.detail || 'Error viewing PDF')
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
      
      setMessage('PDF downloaded successfully!')
    } catch (e: any) {
      setMessage(e.response?.data?.detail || 'Error downloading PDF')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get reports for selected user
  const userReports = selectedUser 
    ? pdfReports.filter(report => report.user_email === selectedUser.email)
    : []

  // Filter reports for selected user (sorted by date, newest first)
  const filteredAndSortedReports = userReports
    .filter(report => 
      report.filename.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Show loading state while checking access
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  // Only render content if user is admin
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
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <div className="bg-red-50 rounded-lg p-3 mr-4">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {selectedUser ? `${selectedUser.full_name || selectedUser.email}'s Reports` : 'PDF Reports'}
              </h1>
              <p className="text-gray-600">
                {selectedUser ? `View and manage reports for ${selectedUser.email}` : 'Select a user to view their PDF reports'}
              </p>
            </div>
            {selectedUser && (
              <button
                onClick={() => {
                  setSelectedUser(null)
                  setSearchTerm('')
                }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m0 0l7 7m-7-7H3" />
                </svg>
                Back to Users
              </button>
            )}
          </div>

          {/* Search and Filter Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Reports</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={selectedUser ? "Search by filename..." : "Search by user name or email..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 pl-10 text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-blue-50 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">{selectedUser ? 'User Reports' : 'Total Reports'}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedUser ? selectedUser.report_count : pdfReports.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-green-50 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedUser 
                    ? formatFileSize(selectedUser.total_size)
                    : formatFileSize(pdfReports.reduce((sum, report) => sum + report.file_size, 0))
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-purple-50 rounded-lg p-3 mr-4">
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600">{selectedUser ? 'Latest Report' : 'Total Users'}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedUser 
                    ? new Date(selectedUser.latest_report).toLocaleDateString()
                    : users.length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`text-sm mb-6 p-4 rounded-lg ${
            message.includes('successfully') 
              ? 'text-green-700 bg-green-50 border border-green-200' 
              : 'text-red-700 bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                {message.includes('successfully') ? (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                )}
              </svg>
              {message}
            </div>
          </div>
        )}

        {/* Users List or PDF Reports List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedUser ? 'Reports List' : 'Users List'}
              </h2>
              <span className="text-sm text-gray-500">
                {selectedUser 
                  ? `${filteredAndSortedReports.length} of ${userReports.length} reports`
                  : `${filteredUsers.length} of ${users.length} users`
                }
              </span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {!selectedUser ? (
              // Users List View
              filteredUsers.map(user => (
                <div key={user.email} className="p-6 hover:bg-gray-50 transition-all duration-200 cursor-pointer" onClick={() => setSelectedUser(user)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{user.full_name || 'Unknown User'}</h3>
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                            {user.report_count} reports
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                            </svg>
                            <span className="truncate">{user.email}</span>
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                            </svg>
                            Total: {formatFileSize(user.total_size)}
                          </div>
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
                            </svg>
                            Latest: {new Date(user.latest_report).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // PDF Reports List View for Selected User
              filteredAndSortedReports.map(pdf => (
                <div key={pdf.id} className="p-6 hover:bg-gray-50 transition-all duration-200">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"></path>
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg truncate">{pdf.filename}</h3>
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                            {formatFileSize(pdf.file_size)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                            </svg>
                            Report Date: {new Date(pdf.report_date).toLocaleDateString()}
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
                    <div className="flex gap-3 lg:ml-4">
                      <button
                        onClick={() => viewPDF(pdf.id)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-sm flex items-center"
                        title="View PDF"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* Empty States */}
            {!selectedUser && filteredUsers.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                </svg>
                <p className="text-lg font-medium mb-2">
                  {searchTerm ? 'No users match your search' : 'No users found'}
                </p>
                {searchTerm && (
                  <p className="text-sm text-gray-400">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            )}
            
            {selectedUser && filteredAndSortedReports.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd"></path>
                </svg>
                <p className="text-lg font-medium mb-2">
                  {searchTerm ? 'No reports match your search' : `No reports found for ${selectedUser.full_name || selectedUser.email}`}
                </p>
                {searchTerm && (
                  <p className="text-sm text-gray-400">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}