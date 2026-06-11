<template>
  <section class="profile-panel">
    <h1 class="profile-panel__title">Сохранённые маршруты</h1>
    <p class="profile-muted">
      Маршруты, которые вы построили на странице заповедника и сохранили кнопкой «В профиль».
    </p>
    <p v-if="routesError" class="profile-error">{{ routesError }}</p>
    <p v-if="loadingRoutes" class="profile-muted">Загружаем маршруты...</p>
    <p v-else-if="!routes.length" class="profile-muted">У вас пока нет сохранённых маршрутов.</p>
    <ul v-else class="routes-list">
      <li v-for="item in routes" :key="item.id" class="route-card">
        <div class="route-card__head">
          <RouterLink class="route-card__reserve" :to="`/reserve/${item.reserve_id}`">
            {{ item.reserve_name }}
          </RouterLink>
          <span class="route-card__badge">{{ profileLabel(item.profile) }}</span>
        </div>
        <p class="route-card__meta">
          {{ formatMeta(item) }}
        </p>
        <div class="route-card__actions">
          <RouterLink class="app-btn app-btn--secondary" :to="`/reserve/${item.reserve_id}`">
            Открыть заповедник
          </RouterLink>
          <button
            :disabled="deleting"
            class="app-btn app-btn--danger"
            type="button"
            @click="$emit('delete-route', item.id)"
          >
            Удалить
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  routes: { type: Array, default: () => [] },
  loadingRoutes: { type: Boolean, default: false },
  routesError: { type: String, default: '' },
  deleting: { type: Boolean, default: false },
})

defineEmits(['delete-route'])

function profileLabel(profile) {
  if (profile === 'foot-walking') return 'Пешком'
  if (profile === 'driving-car') return 'Авто'
  return profile || '—'
}

function formatDistanceM(m) {
  if (m == null || !Number.isFinite(Number(m))) return null
  const n = Number(m)
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)} км`
  return `${Math.round(n)} м`
}

function formatDurationS(sec) {
  if (sec == null || !Number.isFinite(Number(sec))) return null
  const minutes = Math.round(Number(sec) / 60)
  if (minutes < 60) return `${minutes} мин`
  const h = Math.floor(minutes / 60)
  const mm = minutes % 60
  return mm ? `${h} ч ${mm} мин` : `${h} ч`
}

function formatMeta(item) {
  const parts = []
  const d = formatDistanceM(item.distance_m)
  const t = formatDurationS(item.duration_s)
  if (d) parts.push(d)
  if (t) parts.push(t)
  if (item.created_at) parts.push(new Date(item.created_at).toLocaleString('ru-BY'))
  return parts.length ? parts.join(' · ') : '—'
}
</script>

<style scoped lang="scss">
.routes-list {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.route-card {
  border: 1px solid #d0d5dd;
  border-radius: 12px;
  padding: 14px;
}

.route-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.route-card__reserve {
  font-weight: 700;
  color: #2e8b57;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.route-card__badge {
  font-size: 0.78rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f2f4f7;
  border: 1px solid #e4e7ec;
  color: #344054;
}

.route-card__meta {
  margin: 8px 0 0;
  font-size: 0.88rem;
  color: #667085;
}

.route-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
</style>
