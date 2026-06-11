import { defineStore } from 'pinia'
import router from '@/router/index.js'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    refreshToken: null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    setSession(token, refreshToken) {
      this.token = token
      this.refreshToken = refreshToken || null
      localStorage.setItem('token', token)
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken)
      }
    },

    clearSession() {
      this.user = null
      this.token = null
      this.refreshToken = null
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
    },

    async login(credentials) {
      const res = await api.post('/auth/login', credentials)
      this.setSession(res.data.data.token, res.data.data.refresh_token)
      this.user = {
        id: res.data.data.user_id,
        name: res.data.data.name,
        email: res.data.data.email || credentials.email,
        role: res.data.data.role,
        email_verified: res.data.data.email_verified !== false,
      }
    },

    async register(data) {
      const res = await api.post('/auth/register', data)
      return res.data.data
    },

    async resendVerification(email) {
      const res = await api.post('/auth/resend-verification', { email })
      return res.data.data
    },

    async refreshSession() {
      if (!this.refreshToken) {
        throw new Error('No refresh token')
      }
      const res = await api.post('/auth/refresh', { refresh_token: this.refreshToken })
      this.setSession(res.data.data.token, res.data.data.refresh_token)
    },

    async loadProfile() {
      const res = await api.get('/profile')
      this.user = res.data.data
    },

    async updateProfile(data) {
      const res = await api.put('/profile', data)
      await this.loadProfile()
      return res
    },

    async loadFromStorage() {
      const token = localStorage.getItem('token')
      const refreshToken = localStorage.getItem('refresh_token')
      if (!token && !refreshToken) return

      this.token = token
      this.refreshToken = refreshToken

      const tryLoad = async () => {
        await this.loadProfile()
      }

      try {
        if (!this.token && this.refreshToken) {
          await this.refreshSession()
        }
        await tryLoad()
      } catch {
        if (!this.refreshToken) {
          this.clearSession()
          return
        }
        try {
          await this.refreshSession()
          await tryLoad()
        } catch {
          this.clearSession()
        }
      }
    },

    async logout() {
      try {
        if (this.refreshToken) {
          await api.post('/auth/logout', { refresh_token: this.refreshToken })
        }
      } catch {
        // Ignore network errors during logout.
      }
      this.clearSession()
      router.push('/login')
    },
  },
})
