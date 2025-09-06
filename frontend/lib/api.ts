import axios from 'axios'
import Cookies from 'js-cookie'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'

export const api = axios.create({
  baseURL: API_BASE,
})

// Add request interceptor to attach token to all requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // If we're already on the login page, don't redirect again
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        console.error('Authentication error:', error)
        // Clear the invalid token
        Cookies.remove('token')
        
        // Redirect to login page
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)