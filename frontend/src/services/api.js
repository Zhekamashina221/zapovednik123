import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let refreshSubscribers = []

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback)
}

function onRefreshed(newToken) {
  refreshSubscribers.forEach((callback) => callback(newToken))
  refreshSubscribers = []
}

function clearStoredSession() {
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/verify-email') ||
      originalRequest.url?.includes('/auth/resend-verification') ||
      originalRequest.url?.includes('/auth/forgot-password') ||
      originalRequest.url?.includes('/auth/reset-password') ||
      originalRequest.url?.includes('/auth/config') ||
      originalRequest.url?.includes('/auth/refresh')

    if (isAuthEndpoint) {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      clearStoredSession()
      import('@/stores/auth').then(({ useAuthStore }) => {
        try {
          useAuthStore().clearSession()
        } catch {
          // ignore
        }
      })
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          resolve(api(originalRequest))
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const response = await refreshClient.post('/auth/refresh', {
        refresh_token: refreshToken,
      })
      const nextToken = response.data?.data?.token
      const nextRefreshToken = response.data?.data?.refresh_token

      if (!nextToken || !nextRefreshToken) {
        throw new Error('Invalid refresh response')
      }

      localStorage.setItem('token', nextToken)
      localStorage.setItem('refresh_token', nextRefreshToken)
      onRefreshed(nextToken)

      try {
        const { useAuthStore } = await import('@/stores/auth')
        useAuthStore().setSession(nextToken, nextRefreshToken)
      } catch {
        // Pinia may not be ready during very early bootstrap; localStorage is source of truth for API.
      }

      originalRequest.headers.Authorization = `Bearer ${nextToken}`
      return api(originalRequest)
    } catch (refreshError) {
      clearStoredSession()
      try {
        const { useAuthStore } = await import('@/stores/auth')
        useAuthStore().clearSession()
      } catch {
        // ignore
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

api.getReserveReviews = (reserveId) => api.get(`/reviews/${reserveId}`)
api.createReserveReview = (reserveId, payload) => api.post(`/reviews/${reserveId}`, payload)
api.getMyReviews = () => api.get('/reviews/me')
api.deleteMyReview = (reviewId) => api.delete(`/reviews/${reviewId}`)
api.changePassword = (payload) => api.put('/profile/password', payload)
api.postRouteDirections = (payload) => api.post('/routes/directions', payload)
api.getProfileRoutes = () => api.get('/saved-routes')
api.saveProfileRoute = (payload) => api.post('/saved-routes', payload)
api.deleteProfileRoute = (routeId) => api.delete(`/saved-routes/${routeId}`)

api.getCuratedRoutes = () => api.get('/curated-routes')
api.getCuratedRouteBySlug = (slug) => api.get(`/curated-routes/slug/${encodeURIComponent(slug)}`)
api.getAdminCuratedRoutes = () => api.get('/admin/curated-routes')
api.postAdminCuratedRoute = (payload) => api.post('/admin/curated-routes', payload)
api.postAdminCuratedRoutePreview = (payload) =>
  api.post('/admin/curated-routes/preview-route', payload)
api.putAdminCuratedRoute = (id, payload) => api.put(`/admin/curated-routes/${id}`, payload)
api.deleteAdminCuratedRoute = (id) => api.delete(`/admin/curated-routes/${id}`)

api.getAdminReservePhotos = (reserveId) => api.get(`/admin/reserves/${reserveId}/photos`)
api.postAdminReservePhotos = (reserveId, formData) =>
  api.post(`/admin/reserves/${reserveId}/photos`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
api.deleteAdminReservePhoto = (reserveId, photoId) =>
  api.delete(`/admin/reserves/${reserveId}/photos/${photoId}`)

export default api
