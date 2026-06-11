import { defineStore } from 'pinia'
import api from '@/services/api'

export const useReservesStore = defineStore('reserves', {
  state: () => ({
    allReserves: [],
    paginatedReserves: [],
    regions: [],
    districts: [],
    regionDistrictPairs: [],
    types: [],
    total: 0,
    loading: false,
    filters: {
      search: '',
      type: [],
      region: '',
      district: '',
      status_text: '',
    },
    pagination: {
      page: 1,
      limit: 12,
    },
    sorting: {
      by: 'name',
      dir: 'asc',
    },
    metaLoaded: false,
    nearby: {
      enabled: false,
      userLocation: null,
      radiusKm: 10,
      customRadiusKm: '',
      useCustomRadius: false,
      error: '',
    },
  }),
  actions: {
    getActiveNearbyRadius() {
      if (this.nearby.useCustomRadius) {
        const value = Number(this.nearby.customRadiusKm)
        if (!Number.isNaN(value) && value > 0) {
          return Math.min(50, Math.max(0.5, value))
        }
      }
      return Math.min(50, Math.max(0.5, Number(this.nearby.radiusKm) || 10))
    },

    clampRadius(value) {
      const parsed = Number(value)
      if (Number.isNaN(parsed)) return null
      return Math.min(50, Math.max(0.5, parsed))
    },

    haversineDistanceKm(fromLat, fromLon, toLat, toLon) {
      const toRad = (deg) => (deg * Math.PI) / 180
      const earthRadiusKm = 6371
      const dLat = toRad(toLat - fromLat)
      const dLon = toRad(toLon - fromLon)
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(fromLat)) *
          Math.cos(toRad(toLat)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return earthRadiusKm * c
    },

    applyNearbyToItems(items) {
      if (!Array.isArray(items) || !items.length) return []
      if (!this.nearby.enabled || !this.nearby.userLocation) return items

      const radiusKm = this.getActiveNearbyRadius()
      const { lat, lon } = this.nearby.userLocation

      const withDistance = items
        .filter((item) => item.latitude !== null && item.longitude !== null)
        .map((item) => {
          const distanceKm = this.haversineDistanceKm(lat, lon, Number(item.latitude), Number(item.longitude))
          return {
            ...item,
            distance_km: Number(distanceKm.toFixed(2)),
          }
        })
        .filter((item) => item.distance_km <= radiusKm)

      return this.sortReservesClient(withDistance)
    },

    /**
     * Клиентская сортировка после фильтра «рядом» (совпадает с ORDER BY на /reserves).
     */
    sortReservesClient(items) {
      if (!Array.isArray(items) || !items.length) return items
      const { by, dir } = this.sorting
      const list = [...items]
      const desc = String(dir).toLowerCase() === 'desc'

      const nameCmp = (a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'ru', { sensitivity: 'base' })

      if (by === 'name') {
        list.sort((a, b) => (desc ? -1 : 1) * nameCmp(a, b))
        return list
      }

      if (by === 'has_review') {
        list.sort((a, b) => {
          const ac = Number(a.reviews_count) || 0
          const bc = Number(b.reviews_count) || 0
          const rankA = ac > 0 ? 0 : 1
          const rankB = bc > 0 ? 0 : 1
          if (rankA !== rankB) return rankA - rankB
          if (bc !== ac) return bc - ac
          return nameCmp(a, b)
        })
        return list
      }

      if (by === 'popularity') {
        list.sort((a, b) => {
          const av = Number(a.views_count) || 0
          const bv = Number(b.views_count) || 0
          if (bv !== av) return desc ? bv - av : av - bv
          return nameCmp(a, b)
        })
        return list
      }

      list.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
      return list
    },

    async requestUserLocation() {
      this.nearby.error = ''
      if (!('geolocation' in navigator)) {
        this.nearby.error = 'Геолокация не поддерживается браузером'
        this.nearby.enabled = false
        return false
      }

      const location = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              ok: true,
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            })
          },
          () => resolve({ ok: false }),
          { timeout: 10000, enableHighAccuracy: true },
        )
      })

      if (!location.ok) {
        this.nearby.error = 'Не удалось получить геолокацию'
        this.nearby.enabled = false
        return false
      }

      this.nearby.userLocation = { lat: location.lat, lon: location.lon }
      this.nearby.error = ''
      return true
    },

    async enableNearby() {
      this.nearby.enabled = true
      const ok = await this.requestUserLocation()
      if (!ok) {
        this.nearby.enabled = false
      }
      return ok
    },

    disableNearby() {
      this.nearby.enabled = false
      this.nearby.error = ''
    },

    setNearbyRadius(km) {
      const clamped = this.clampRadius(km)
      if (clamped === null) return
      this.nearby.radiusKm = clamped
      this.nearby.useCustomRadius = false
      this.pagination.page = 1
    },

    setCustomNearbyRadius(km) {
      this.nearby.customRadiusKm = km
      const clamped = this.clampRadius(km)
      if (clamped === null) return
      this.nearby.customRadiusKm = clamped
      this.nearby.useCustomRadius = true
      this.pagination.page = 1
    },

    serializeTypeFilter() {
      const value = this.filters.type
      if (!Array.isArray(value) || !value.length) return ''
      return value.join(',')
    },

    async fetchAllForMap() {
      this.loading = true
      try {
        const params = {
          ...this.filters,
          type: this.serializeTypeFilter(),
          limit: 0,
        }
        const res = await api.get('/reserves', { params })
        this.allReserves = this.applyNearbyToItems(res.data.data || [])
      } catch (err) {
        console.error('Ошибка загрузки карты:', err)
        this.allReserves = []
      } finally {
        this.loading = false
      }
    },

    async fetchPaginated() {
      this.loading = true
      try {
        const offset = (this.pagination.page - 1) * this.pagination.limit
        const useNearby = this.nearby.enabled && this.nearby.userLocation
        const params = {
          ...this.filters,
          type: this.serializeTypeFilter(),
          limit: useNearby ? 0 : this.pagination.limit,
          offset: useNearby ? 0 : offset,
          sort_by: this.sorting.by,
          sort_dir: this.sorting.dir,
        }
        const res = await api.get('/reserves', { params })
        const nearbyData = this.applyNearbyToItems(res.data.data || [])
        const start = (this.pagination.page - 1) * this.pagination.limit
        const end = start + this.pagination.limit
        if (useNearby) {
          this.total = nearbyData.length
          this.paginatedReserves = nearbyData.slice(start, end)
        } else {
          this.paginatedReserves = nearbyData
          this.total = res.data.total
        }
      } catch (err) {
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    async fetchTypes() {
      const res = await api.get('/types')
      this.types = res.data.data
    },

    async fetchFilters() {
      const res = await api.get('/filters')
      this.regions = res.data.regions
      this.districts = res.data.districts
      this.regionDistrictPairs = Array.isArray(res.data.regionDistrictPairs)
        ? res.data.regionDistrictPairs
        : []
    },

    async ensureMetaLoaded() {
      if (this.metaLoaded) return
      await Promise.all([this.fetchTypes(), this.fetchFilters()])
      this.metaLoaded = true
    },

    setFilters(newFilters) {
      const merged = { ...this.filters, ...newFilters }
      merged.type = Array.isArray(merged.type) ? merged.type : merged.type ? [merged.type] : []
      merged.status_text =
        merged.status_text == null || merged.status_text === undefined
          ? ''
          : String(merged.status_text).trim()
      this.filters = merged
      this.pagination.page = 1
    },

    setPage(page) {
      this.pagination.page = page
    },

    setSorting(by, dir = 'asc') {
      const allowedBy = ['name', 'has_review', 'popularity']
      const safeBy = allowedBy.includes(String(by)) ? String(by) : 'name'
      const safeDir = String(dir).toLowerCase() === 'desc' ? 'desc' : 'asc'
      this.sorting = { by: safeBy, dir: safeDir }
      this.pagination.page = 1
    },

    applyFavoriteState(id, isFavorite) {
      this.allReserves = this.allReserves.map((item) =>
        item.id === id ? { ...item, is_favorite: isFavorite } : item,
      )
      this.paginatedReserves = this.paginatedReserves.map((item) =>
        item.id === id ? { ...item, is_favorite: isFavorite } : item,
      )
    },

    async toggleFavorite(id, explicitState = null) {
      const reserve =
        this.paginatedReserves.find((item) => item.id === id) ||
        this.allReserves.find((item) => item.id === id)
      const isFavorite = explicitState ?? !!reserve?.is_favorite
      if (isFavorite) {
        await api.delete(`/favorites/${id}`)
        this.applyFavoriteState(id, false)
      } else {
        await api.post(`/favorites/${id}`)
        this.applyFavoriteState(id, true)
      }
    },
  },
})
