import { ref, toValue } from 'vue'
import api from '@/services/api'

export function useReserveDetails(id, reservesStore) {
  const reserve = ref(null)
  const loading = ref(true)
  const isFavorite = ref(false)
  const favoriteLoading = ref(false)

  async function loadReserve(loadReviews) {
    const rid = toValue(id)
    loading.value = true
    try {
      const { data } = await api.get(`/reserves/${rid}`)
      reserve.value = data.data
      isFavorite.value = !!reserve.value.is_favorite
      await loadReviews()
    } catch (err) {
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  async function toggleFavorite(authToken, onAuthRequired) {
    if (!authToken) {
      onAuthRequired()
      return
    }

    favoriteLoading.value = true
    try {
      const rid = toValue(id)
      const resp = isFavorite.value
        ? await api.delete(`/favorites/${rid}`)
        : await api.post(`/favorites/${rid}`)
      const isNowFavorite = resp.data.data.is_favorite
      isFavorite.value = isNowFavorite
      if (reserve.value) reserve.value.is_favorite = isNowFavorite
      reservesStore.fetchAllForMap()
      return { ok: true, message: isNowFavorite ? 'Добавлено в избранное' : 'Удалено из избранного' }
    } catch (err) {
      return { ok: false, message: 'Ошибка при изменении избранного' }
    } finally {
      favoriteLoading.value = false
    }
  }

  return {
    reserve,
    loading,
    isFavorite,
    favoriteLoading,
    loadReserve,
    toggleFavorite,
  }
}
