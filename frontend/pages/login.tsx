import React, { useState, useEffect } from 'react'
import Cookies from 'js-cookie'
import { useRouter } from 'next/router'
import { api } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get('token')
      if (token) {
        try {
          const response = await api.get('/auth/me')
          const user = response.data
          if (user.role === 'admin') {
            router.push('/admin')
          } else {
            router.push('/dashboard')
          }
        } catch {
          // Token is invalid, remove it
          Cookies.remove('token')
        }
      }
    }
    checkAuth()
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const form = new URLSearchParams()
      form.append('username', email)
      form.append('password', password)
      const res = await api.post('/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      Cookies.set('token', res.data.access_token)
      
      // Get user info to determine redirect
      const userResponse = await api.get('/auth/me')
      const user = userResponse.data
      
      if (user.role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      {/* Login Card */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white shadow-lg rounded-2xl p-6 sm:p-8">
          {/* Content */}
          <div>
            <div className="text-center mb-8 sm:mb-10">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 rounded-2xl mb-4 sm:mb-6 shadow-lg">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 tracking-tight">MHP Reporting Portal</h1>
              <p className="text-gray-600 text-base sm:text-lg">Welcome back! Please sign in</p>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 rounded-xl mb-4 sm:mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}
            
            <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input 
                    className="w-full bg-white border border-gray-300 rounded-xl pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400" 
                    type="email" 
                    value={email} 
                    onChange={(e)=>setEmail(e.target.value)} 
                    required 
                    disabled={loading}
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input 
                    className="w-full bg-white border border-gray-300 rounded-xl pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-gray-400" 
                    type="password" 
                    value={password} 
                    onChange={(e)=>setPassword(e.target.value)} 
                    required 
                    disabled={loading}
                    placeholder="Enter your password"
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 text-sm sm:text-base rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span>Sign In</span>
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}