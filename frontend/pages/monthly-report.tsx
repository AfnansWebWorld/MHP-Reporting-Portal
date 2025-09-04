import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { api } from '../lib/api'
import Cookies from 'js-cookie'
import MonthlyReport from '../components/MonthlyReport'

interface CurrentUser { id: number; email: string; full_name?: string; role: string }

export default function MonthlyReportPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
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
      } catch (error) {
        console.error('Failed to fetch data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

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
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path>
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    📊 Monthly Activity Report
                  </h1>
                  <p className="text-gray-600 mt-1">
                    View and analyze monthly activity metrics
                  </p>
                </div>
              </div>
              {/* Logout button removed as it's already available in the navbar */}
            </div>
          </div>

          {/* Monthly Report Component */}
          <MonthlyReport className="mb-6" />
        </div>
      </div>
    </Layout>
  )
}