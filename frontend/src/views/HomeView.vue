<template>
  <div class="home-layout">
    <section class="map-section">
      <FilterPanel layout="sidebar" />

      <Map
        :nearby-enabled="nearby.enabled"
        :nearby-radius-km="store.getActiveNearbyRadius()"
        :reserves="allReserves"
        :user-location="nearby.userLocation"
        @select="goToReserve"
      />

      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>Загрузка карты...</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useReservesStore } from '@/stores/reserves'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'

import Map from '@/components/main/Map.vue'
import FilterPanel from '@/components/main/FilterPanel.vue'

const store = useReservesStore()
const router = useRouter()
const { allReserves, loading, nearby } = storeToRefs(store)
let searchDebounceTimer = null

onMounted(async () => {
  await Promise.all([store.ensureMetaLoaded(), store.fetchAllForMap()])
})

watch(
  () => [
    store.filters,
    nearby.value.enabled,
    nearby.value.radiusKm,
    nearby.value.customRadiusKm,
    nearby.value.useCustomRadius,
    nearby.value.userLocation?.lat,
    nearby.value.userLocation?.lon,
  ],
  async (nextFilters, prevFilters) => {
    const next = Array.isArray(nextFilters) ? nextFilters[0] : nextFilters
    const prev = Array.isArray(prevFilters) ? prevFilters[0] : prevFilters
    const searchChanged = (next?.search || '') !== (prev?.search || '')

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }

    if (searchChanged) {
      searchDebounceTimer = setTimeout(async () => {
        await store.fetchAllForMap()
        searchDebounceTimer = null
      }, 350)
      return
    }

    await store.fetchAllForMap()
  },
  { deep: true },
)

onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})

function goToReserve(id) {
  router.push(`/reserve/${id}`)
}
</script>

<style lang="scss" scoped>
.home-layout {
  position: relative;
  height: calc(var(--viewport-height) - var(--header-height));
  max-height: calc(var(--viewport-height) - var(--header-height));
  overflow: hidden;
}

.map-section {
  position: absolute;
  inset: 0;
  background: #e8eaed;
  overflow: hidden;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 800;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.72);
  pointer-events: none;

  p {
    margin: 0;
    color: $color-text-light;
    font-size: 0.9rem;
  }
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e5e7eb;
  border-top-color: $color-primary;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
