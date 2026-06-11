<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__heading">
        <h1>Дашборд</h1>
        <p class="admin-subtitle">Ключевые показатели системы и контента</p>
      </div>
    </header>

    <div v-if="error" class="admin-error" role="alert">{{ error }}</div>

    <div class="kpi-grid">
      <article class="kpi-card">
        <h3>Пользователи</h3>
        <p>{{ dashboard.kpi.users_total }}</p>
        <small>Активные: {{ dashboard.kpi.users_active }}</small>
      </article>
      <article class="kpi-card">
        <h3>Заповедники</h3>
        <p>{{ dashboard.kpi.reserves_total }}</p>
        <small>Опубликовано: {{ dashboard.kpi.reserves_published }}</small>
      </article>
      <article class="kpi-card">
        <h3>Отзывы</h3>
        <p>{{ dashboard.kpi.reviews_total }}</p>
        <small>На модерации: {{ dashboard.kpi.reviews_pending }}</small>
      </article>
      <article class="kpi-card">
        <h3>События аналитики</h3>
        <p>{{ dashboard.kpi.events_total }}</p>
        <small>За всё время</small>
      </article>
    </div>

    <section class="admin-section two-col">
      <div>
        <h2 class="section-heading">
          <svg class="section-heading__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 5C7 5 2.73 8.11 1 12.5 2.73 16.89 7 20 12 20s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5Zm0 12.5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5Zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3Z"
              fill="currentColor"
            />
          </svg>
          Топ по просмотрам
        </h2>
        <div class="admin-table-card">
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Заповедник</th>
                  <th>Просмотры</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in dashboard.top_viewed_reserves" :key="item.id">
                  <td class="admin-table__id">#{{ item.id }}</td>
                  <td class="admin-table__primary">{{ item.name }}</td>
                  <td><strong>{{ item.views }}</strong></td>
                </tr>
                <tr v-if="!dashboard.top_viewed_reserves.length" class="admin-table__empty-row">
                  <td colspan="3">Нет данных</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div>
        <h2 class="section-heading">
          <svg class="section-heading__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27Z"
              fill="currentColor"
            />
          </svg>
          Топ по отзывам
        </h2>
        <div class="admin-table-card">
          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Заповедник</th>
                  <th>Отзывов</th>
                  <th>Средний рейтинг</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in dashboard.top_reviewed_reserves" :key="item.id">
                  <td class="admin-table__id">#{{ item.id }}</td>
                  <td class="admin-table__primary">{{ item.name }}</td>
                  <td>{{ item.reviews_count }}</td>
                  <td>{{ item.avg_rating }}</td>
                </tr>
                <tr v-if="!dashboard.top_reviewed_reserves.length" class="admin-table__empty-row">
                  <td colspan="4">Нет данных</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '@/services/api'

const error = ref('')
const dashboard = ref({
  kpi: {
    users_total: 0,
    users_active: 0,
    reserves_total: 0,
    reserves_published: 0,
    reviews_total: 0,
    reviews_pending: 0,
    events_total: 0,
  },
  top_viewed_reserves: [],
  top_reviewed_reserves: [],
})

async function loadDashboard() {
  error.value = ''
  try {
    const res = await api.get('/admin/dashboard')
    dashboard.value = res.data.data || dashboard.value
  } catch {
    error.value = 'Не удалось загрузить дашборд'
  }
}

onMounted(loadDashboard)
</script>
