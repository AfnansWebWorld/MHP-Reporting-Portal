import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Cookies from 'js-cookie'
import { useRouter } from 'next/router'
import { api } from '../lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'

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
          await api.get('/auth/me')
          router.push('/dashboard')
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
      const res = await axios.post(`${API_BASE}/auth/login`, form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      Cookies.set('token', res.data.access_token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-md bg-white/20 backdrop-blur-md border border-white/30 shadow-xl rounded-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">MHP Reporting Portal</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>
        
        {error && (
          <div className="bg-red-100/50 backdrop-blur-sm border border-red-300/50 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              className="w-full border border-white/30 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50" 
              type="email" 
              value={email} 
              onChange={(e)=>setEmail(e.target.value)} 
              required 
              disabled={loading}
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              className="w-full border border-white/30 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50" 
              type="password" 
              value={password} 
              onChange={(e)=>setPassword(e.target.value)} 
              required 
              disabled={loading}
              placeholder="Enter your password"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600/80 hover:bg-blue-700/90 disabled:bg-blue-400/60 backdrop-blur-sm text-white font-medium py-2 px-4 rounded-lg border border-blue-500/30 shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="font-medium mb-2">Demo Credentials:</p>
          <div className="space-y-1">
            <p className="font-mono text-xs">admin@mhp.com / admin123</p>
            <p className="font-mono text-xs">user@mhp.com / user123</p>
          </div>
        </div>
      </div>
    </div>
  )
}