import { computed } from 'vue'
import { useReservesStore } from '@/stores/reserves'
import { RESERVE_TYPE_CONFIG } from '@/config/reserveTypes'

function countByTypes(reserves) {
  const result = {}
  Object.keys(RESERVE_TYPE_CONFIG).forEach((key) => {
    result[key] = 0
  })
  for (const reserve of reserves || []) {
    const type = reserve.type?.toLowerCase() || ''
    const matchedKey = Object.keys(RESERVE_TYPE_CONFIG).find((configKey) =>
      type.includes(configKey),
    )
    if (matchedKey) result[matchedKey]++
  }
  return result
}

/**
 * Числа для легенды: полный набор с карты (allReserves), иначе текущая страница списка.
 */
export function useReserveTypeCounts() {
  const store = useReservesStore()
  return computed(() => {
    const full = store.allReserves
    if (Array.isArray(full) && full.length > 0) {
      return { counts: countByTypes(full), scope: 'map' }
    }
    return { counts: countByTypes(store.paginatedReserves), scope: 'page' }
  })
}
