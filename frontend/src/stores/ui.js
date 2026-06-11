import { defineStore } from 'pinia'

const DEFAULT_DURATION_MS = 2800

export const useUiStore = defineStore('ui', {
  state: () => ({
    toastMessage: '',
    toastTimerId: null,
  }),
  actions: {
    showToast(message, durationMs = DEFAULT_DURATION_MS) {
      const text = String(message ?? '').trim()
      if (!text) return
      if (this.toastTimerId) {
        clearTimeout(this.toastTimerId)
        this.toastTimerId = null
      }
      this.toastMessage = text
      this.toastTimerId = window.setTimeout(() => {
        if (this.toastMessage === text) this.toastMessage = ''
        this.toastTimerId = null
      }, durationMs)
    },
    clearToast() {
      if (this.toastTimerId) {
        clearTimeout(this.toastTimerId)
        this.toastTimerId = null
      }
      this.toastMessage = ''
    },
  },
})
