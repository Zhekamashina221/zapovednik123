<template>
  <div ref="listRoot" class="list-page">
    <section :style="{ backgroundImage: `url(${listHeroUrl})` }" class="page-hero">
      <div class="page-hero__overlay" />
      <div class="container page-hero__inner">
        <h1 class="page-hero__title">
          Список объектов природного наследия
          <span class="page-hero__accent">Беларуси</span>
          <span aria-hidden="true" class="page-hero__leaf">🌿</span>
        </h1>
        <p class="page-hero__subtitle">Исследуйте уникальные природные объекты нашей страны</p>
      </div>
    </section>

    <div class="container list-page__body">
      <div class="list-panel">
        <div class="list-panel__intro">
        <div
          :aria-busy="loading ? 'true' : 'false'"
          :class="{ 'list-results-summary--loading': loading }"
          aria-live="polite"
          class="list-results-summary"
          role="status"
        >
          <div class="list-results-summary__body">
            <template v-if="loading">
              <span class="list-results-summary__skeleton list-results-summary__skeleton--value" />
              <span class="list-results-summary__skeleton list-results-summary__skeleton--hint" />
            </template>
            <template v-else>
              <p class="list-results-summary__headline">
                <span class="list-results-summary__value">{{ formattedTotal }}</span>
                <span class="list-results-summary__unit">{{ resultsObjectWord }}</span>
              </p>
            </template>
          </div>
        </div>
        <div class="list-panel__filters">
          <FilterPanel
            :sort-value="`${sorting.by}:${sorting.dir}`"
            layout="list"
            @sort-change="onSortChange"
          />
        </div>
        </div>

        <div v-if="loading" class="list-panel__loading">Загрузка…</div>

        <div v-else-if="showEmptyResults" class="list-panel__empty">
          <p class="list-panel__empty-title">
            {{ hasActiveFilters ? 'По выбранным фильтрам ничего не найдено' : 'Объекты не найдены' }}
          </p>
          <p v-if="hasActiveFilters" class="list-panel__empty-hint">
            Попробуйте ослабить условия или сбросить все фильтры.
          </p>
          <button
            v-if="hasActiveFilters"
            class="app-btn app-btn--primary list-panel__empty-btn"
            type="button"
            @click="resetFilters"
          >
            Сбросить фильтры
          </button>
        </div>

        <div v-else class="list-panel__grid">
          <ReserveCard
            v-for="reserve in paginatedReserves"
            :key="reserve.id"
            :reserve="reserve"
            @toggle-favorite="toggleFavorite"
          />
        </div>

        <div v-if="!loading && total > 0" class="list-panel__pagination">
          <Pagination
            :current="pagination.page"
            :limit="pagination.limit"
            :total="total"
            @change="
              (page) => {
                store.setPage(page)
                loadData()
                listRoot?.scrollIntoView({ behavior: 'smooth' })
              }
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useReservesStore } from '@/stores/reserves'
import { storeToRefs } from 'pinia'

import ReserveCard from '@/components/main/ReserveCard.vue'
import FilterPanel from '@/components/main/FilterPanel.vue'
import Pagination from '@/components/main/Pagination.vue'
import listHeroUrl from '@/assets/images/bg2.png'

const listRoot = ref(null)

const store = useReservesStore()
const { paginatedReserves, total, loading, pagination, sorting } = storeToRefs(store)
let searchDebounceTimer = null

const formattedTotal = computed(() =>
  new Intl.NumberFormat('ru-RU').format(Number(total.value) || 0),
)

const resultsObjectWord = computed(() => {
  const n = Number(total.value) || 0
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'объект найден'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'объекта найдено'
  return 'объектов найдено'
})

const showEmptyResults = computed(() => !loading.value && Number(total.value) === 0)

const hasActiveFilters = computed(() => {
  if (store.nearby.enabled) return true
  const { type, region, district, search, status_text: statusText } = store.filters
  if (typeof search === 'string' && search.trim()) return true
  if (Array.isArray(type) && type.length) return true
  if (region) return true
  if (district) return true
  if (typeof statusText === 'string' && statusText.trim()) return true
  return false
})

function resetFilters() {
  store.setFilters({
    search: '',
    type: [],
    region: '',
    district: '',
    status_text: '',
  })
  if (store.nearby.enabled) {
    store.disableNearby()
  }
  store.setPage(1)
  loadData()
  listRoot.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function loadData() {
  store.fetchPaginated()
}

async function toggleFavorite(id) {
  await store.toggleFavorite(id)
}

function onSortChange(value) {
  const [by, dir] = String(value).split(':')
  store.setSorting(by, dir || 'asc')
  loadData()
}

onMounted(async () => {
  await store.ensureMetaLoaded()
  loadData()
})

watch(
  () => [
    store.filters,
    store.nearby.enabled,
    store.nearby.radiusKm,
    store.nearby.customRadiusKm,
    store.nearby.useCustomRadius,
    store.nearby.userLocation?.lat,
    store.nearby.userLocation?.lon,
  ],
  (nextFilters, prevFilters) => {
    const next = Array.isArray(nextFilters) ? nextFilters[0] : nextFilters
    const prev = Array.isArray(prevFilters) ? prevFilters[0] : prevFilters
    const searchChanged = (next?.search || '') !== (prev?.search || '')

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }

    if (searchChanged) {
      searchDebounceTimer = setTimeout(() => {
        loadData()
        searchDebounceTimer = null
      }, 350)
      return
    }

    loadData()
  },
  { deep: true },
)

onUnmounted(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})
</script>

<style lang="scss" scoped>
.list-page {
  background: $background;
}

.list-page__body {
  position: relative;
  z-index: 2;
  margin-top: -56px;
  padding-bottom: 32px;
}

.list-panel {
  background: $color-surface;
  border-radius: 22px;
  box-shadow: $shadow;
  padding: 20px 22px 24px;
  overflow: visible;
}

.list-panel__intro {
  margin-bottom: 12px;
  border-bottom: 1px solid #eef0f2;
  padding-bottom: 12px;
}

.list-panel__filters {
  margin: 0;
  overflow: visible;
}

.list-results-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 10px;
  padding-block: 3px;
  border-bottom: none;

  &--loading {
    .list-results-summary__icon-dot {
      animation: list-results-pulse 1.2s ease-in-out infinite;
    }
  }
}

.list-results-summary__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba($color-primary, 0.1);
  border: 1px solid rgba($color-primary, 0.16);
}

.list-results-summary__icon-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: $color-primary;
  box-shadow: 0 0 0 4px rgba($color-secondary, 0.35);
}

.list-results-summary__body {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 2px;
}

.list-results-summary__headline {
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.5rem;
  line-height: 1.2;
}

.list-results-summary__value {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: $color-primary-dark;
  font-variant-numeric: tabular-nums;
}

.list-results-summary__unit {
  font-size: 0.92rem;
  font-weight: 600;
  color: $color-darker;
}

.list-results-summary__hint {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 500;
  color: $color-text-light;
  letter-spacing: 0.01em;
}

.list-results-summary__skeleton {
  display: block;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    rgba($color-primary, 0.08) 0%,
    rgba($color-primary, 0.16) 50%,
    rgba($color-primary, 0.08) 100%
  );
  background-size: 200% 100%;
  animation: list-results-shimmer 1.4s ease-in-out infinite;

  &--value {
    width: 4.5rem;
    height: 1.35rem;
  }

  &--hint {
    width: 9rem;
    height: 0.72rem;
    margin-top: 4px;
    opacity: 0.85;
  }
}

@keyframes list-results-shimmer {
  0% {
    background-position: 100% 0;
  }
  100% {
    background-position: -100% 0;
  }
}

@keyframes list-results-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.92);
    opacity: 0.65;
  }
}

.list-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}

.list-panel__pagination {
  display: flex;
  justify-content: center;
  margin-top: 1.75rem;
  padding-top: 0.5rem;
}

.list-panel__loading {
  text-align: center;
  padding: 3rem 1rem;
  font-size: 1rem;
  color: $color-text-light;
}

.list-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 220px;
  padding: 2.5rem 1.25rem;
  text-align: center;
  border-radius: 14px;
  border: 1px dashed rgba($color-primary, 0.22);
  background: linear-gradient(180deg, rgba($color-secondary, 0.08) 0%, rgba($color-surface, 1) 100%);
}

.list-panel__empty-title {
  margin: 0;
  max-width: 28rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: $color-darker;
  line-height: 1.4;
}

.list-panel__empty-hint {
  margin: 0;
  max-width: 24rem;
  font-size: 0.88rem;
  color: $color-text-light;
  line-height: 1.45;
}

.list-panel__empty-btn {
  margin-top: 6px;
}

@media (max-width: 640px) {
  .list-page__body {
    margin-top: -44px;
    padding-bottom: 24px;
  }

  .list-panel {
    padding: 14px 12px 18px;
    border-radius: 16px;
  }

  .list-panel__intro {
    margin-bottom: 10px;
    padding-bottom: 10px;
  }

  .list-results-summary {
    margin-bottom: 8px;
  }

  .list-results-summary__value {
    font-size: 1.2rem;
  }

  .list-results-summary__unit {
    font-size: 0.85rem;
  }

  .list-panel__grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .list-panel__pagination {
    margin-top: 1.25rem;
  }
}
</style>
