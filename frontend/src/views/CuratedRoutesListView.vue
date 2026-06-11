<template>
  <div class="curated-routes-page">
    <section :style="{ backgroundImage: `url(${heroUrl})` }" class="page-hero">
      <div class="page-hero__overlay" />
      <div class="container page-hero__inner">
        <h1 class="page-hero__title">Готовые маршруты</h1>
        <p class="page-hero__subtitle">
          Подборки через несколько объектов природного наследия — с маршрутом по дорожной сети на
          карте
        </p>
      </div>
    </section>

    <div class="container curated-routes-page__body">
      <div class="curated-routes-panel">
        <p v-if="error" class="curated-routes-panel__error">{{ error }}</p>
        <p v-else-if="loading" class="curated-routes-panel__muted">Загрузка…</p>

        <template v-else>
          <div class="curated-routes-layout">
            <CuratedRoutesFilters v-model="filters" :region-options="regionOptions" />

            <div class="curated-routes-main">
              <p class="curated-routes-main__count">
                Найдено {{ filteredRoutes.length }}
                {{ routesCountLabel }}
              </p>

              <div v-if="!filteredRoutes.length" class="curated-routes-main__empty card-surface">
                <p v-if="!routes.length">Пока нет опубликованных маршрутов.</p>
                <p v-else>
                  По выбранным фильтрам маршрутов не найдено. Попробуйте сбросить фильтры.
                </p>
              </div>

              <div v-else class="curated-routes-grid">
                <CuratedRouteCard v-for="item in filteredRoutes" :key="item.slug" :route="item" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/services/api'
import CuratedRoutesFilters from '@/components/curated/CuratedRoutesFilters.vue'
import CuratedRouteCard from '@/components/curated/CuratedRouteCard.vue'
import heroUrl from '@/assets/images/bg2.png'

const routes = ref([])
const loading = ref(true)
const error = ref('')

const filters = ref({
  profile: 'all',
  region: 'all',
  duration: 'all',
})

const regionOptions = computed(() => {
  const set = new Set(routes.value.map((r) => r.regionLabel).filter((x) => String(x || '').trim()))
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'))
})

function matchesDuration(durationS, bucket) {
  if (bucket === 'all') return true
  if (durationS == null || !Number.isFinite(durationS)) return false
  const h3 = 3 * 3600
  const h6 = 6 * 3600
  if (bucket === 'under3') return durationS <= h3
  if (bucket === '3to6') return durationS > h3 && durationS <= h6
  if (bucket === 'over6') return durationS > h6
  return true
}

const filteredRoutes = computed(() => {
  const f = filters.value
  return routes.value.filter((item) => {
    if (f.profile !== 'all' && item.profile !== f.profile) return false
    if (f.region !== 'all' && item.regionLabel !== f.region) return false
    if (!matchesDuration(item.durationS, f.duration)) return false
    return true
  })
})

const routesCountLabel = computed(() => {
  const n = filteredRoutes.value.length
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'маршрут'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'маршрута'
  return 'маршрутов'
})

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.getCuratedRoutes()
    routes.value = Array.isArray(data.data) ? data.data : []
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Не удалось загрузить маршруты'
    routes.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.curated-routes-page {
  background: $background;
}

.curated-routes-page__body {
  position: relative;
  z-index: 2;
  margin-top: -56px;
  padding-bottom: 32px;
}

.curated-routes-panel {
  background: $color-surface;
  border-radius: 22px;
  box-shadow: $shadow;
  padding: 22px 24px 28px;
  overflow: visible;
}

.curated-routes-panel__error {
  color: #b42318;
  font-weight: 600;
}

.curated-routes-panel__muted {
  color: #667085;
  text-align: center;
  padding: 2rem 0;
}

.curated-routes-layout {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}

.curated-routes-main__count {
  margin: 0 0 16px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #344054;
}

.curated-routes-main__empty {
  padding: 24px;
  color: #475467;
}

.curated-routes-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

@media (max-width: 1100px) {
  .curated-routes-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .curated-routes-page__body {
    margin-top: -44px;
    padding-bottom: 24px;
  }

  .curated-routes-panel {
    padding: 16px 14px 20px;
    border-radius: 16px;
  }

  .curated-routes-layout {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .curated-routes-main__count {
    font-size: 0.9rem;
    margin-bottom: 12px;
  }

  .curated-routes-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
