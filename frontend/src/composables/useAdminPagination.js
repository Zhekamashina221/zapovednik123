import { computed, ref } from 'vue'

/** Клиентская пагинация для уже загруженного списка. */
export function useClientPagination(itemsRef, pageSize = 20) {
  const page = ref(1)
  const limit = pageSize

  const total = computed(() => (Array.isArray(itemsRef.value) ? itemsRef.value.length : 0))

  const paginatedItems = computed(() => {
    const list = Array.isArray(itemsRef.value) ? itemsRef.value : []
    const start = (page.value - 1) * limit
    return list.slice(start, start + limit)
  })

  const showPagination = computed(() => total.value > limit)

  function resetPage() {
    page.value = 1
  }

  function onPageChange(next) {
    const max = Math.max(1, Math.ceil(total.value / limit) || 1)
    page.value = Math.min(Math.max(1, next), max)
  }

  return {
    page,
    limit,
    total,
    paginatedItems,
    showPagination,
    resetPage,
    onPageChange,
  }
}

/** Серверная пагинация (limit / offset в API). */
export function useOffsetPagination(pageSize = 25) {
  const page = ref(1)
  const limit = ref(pageSize)
  const offset = ref(0)
  const total = ref(0)

  const showPagination = computed(() => total.value > limit.value)

  function syncPageFromOffset() {
    page.value = Math.floor(offset.value / limit.value) + 1
  }

  function resetPage() {
    offset.value = 0
    page.value = 1
  }

  async function onPageChange(next, reload) {
    offset.value = (Math.max(1, next) - 1) * limit.value
    page.value = Math.max(1, next)
    if (typeof reload === 'function') await reload()
  }

  return {
    page,
    limit,
    offset,
    total,
    showPagination,
    syncPageFromOffset,
    resetPage,
    onPageChange,
  }
}
