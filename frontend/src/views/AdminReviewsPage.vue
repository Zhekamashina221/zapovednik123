<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__heading">
        <h1>Модерация отзывов</h1>
        <p class="admin-subtitle">Проверка, одобрение и скрытие отзывов пользователей</p>
      </div>
    </header>

    <div class="admin-toolbar">
      <div class="admin-filters admin-filters--2">
        <input
          v-model.trim="filters.search"
          class="app-input"
          placeholder="Поиск по тексту, пользователю или заповеднику"
          type="search"
        />
        <AppSelectDropdown
          v-model="filters.status"
          :options="reviewStatusOptions"
          empty-label="Все статусы"
          placeholder="Все статусы"
          @change="loadReviews"
        />
      </div>
    </div>

    <div v-if="error" class="admin-error" role="alert">{{ error }}</div>

    <div class="admin-table-card">
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Заповедник</th>
              <th>Пользователь</th>
              <th>Рейтинг</th>
              <th>Статус</th>
              <th>Комментарий</th>
              <th>Создан</th>
              <th>Модерация</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in reviews" :key="item.id">
              <td class="admin-table__id">#{{ item.id }}</td>
              <td>{{ item.reserve_name }}</td>
              <td>
                <div class="admin-table__primary">{{ item.user_name || item.user_email }}</div>
                <div v-if="item.user_name && item.user_email" class="admin-table__secondary">
                  {{ item.user_email }}
                </div>
              </td>
              <td>{{ item.rating }}</td>
              <td>
                <span class="status-badge" :class="`status-${item.status}`">{{ reviewStatusLabel(item.status) }}</span>
              </td>
              <td class="comment-cell">{{ item.comment }}</td>
              <td class="admin-table__muted">{{ item.created_at }}</td>
              <td class="admin-cell-actions">
                <AdminActionMenu
                  :open="openRowMenuId === item.id"
                  aria-label="Действия модерации"
                  @close="closeRowMenu"
                  @toggle="toggleRowMenu(item.id)"
                >
                  <button
                    type="button"
                    class="action-menu__item"
                    role="menuitem"
                    @click="onSetStatus(item.id, 'approved')"
                  >
                    Одобрить
                  </button>
                  <button
                    type="button"
                    class="action-menu__item"
                    role="menuitem"
                    @click="onSetStatus(item.id, 'hidden')"
                  >
                    Скрыть
                  </button>
                  <button
                    type="button"
                    class="action-menu__item action-menu__item--danger"
                    role="menuitem"
                    @click="onSetStatus(item.id, 'rejected')"
                  >
                    Отклонить
                  </button>
                </AdminActionMenu>
              </td>
            </tr>
            <tr v-if="!reviews.length" class="admin-table__empty-row">
              <td colspan="8">Отзывы не найдены</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Pagination
      v-if="showPagination"
      :current="page"
      :limit="limit"
      :total="total"
      @change="(p) => onPageChange(p, loadReviews)"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import api from '@/services/api'
import AdminActionMenu from '@/components/admin/AdminActionMenu.vue'
import AppSelectDropdown from '@/components/ui/AppSelectDropdown.vue'
import Pagination from '@/components/main/Pagination.vue'
import { useOffsetPagination } from '@/composables/useAdminPagination'

const REVIEW_STATUS_LABELS = {
  pending: 'На модерации',
  approved: 'Одобрен',
  hidden: 'Скрыт',
  rejected: 'Отклонён',
}

const reviewStatusOptions = Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}))

function reviewStatusLabel(status) {
  return REVIEW_STATUS_LABELS[String(status || '').toLowerCase()] || status || '-'
}

const reviews = ref([])
const error = ref('')
const openRowMenuId = ref(null)
const filters = ref({
  search: '',
  status: 'pending',
})

const {
  page,
  limit,
  offset,
  total,
  showPagination,
  syncPageFromOffset,
  resetPage,
  onPageChange,
} = useOffsetPagination(25)

function toggleRowMenu(id) {
  openRowMenuId.value = openRowMenuId.value === id ? null : id
}

function closeRowMenu() {
  openRowMenuId.value = null
}

async function loadReviews() {
  error.value = ''
  try {
    const res = await api.get('/admin/reviews', {
      params: {
        search: filters.value.search || undefined,
        status: filters.value.status || undefined,
        limit: limit.value,
        offset: offset.value,
      },
    })
    reviews.value = res.data.data || []
    total.value = Number(res.data.total) || 0
    syncPageFromOffset()
  } catch {
    error.value = 'Не удалось загрузить отзывы'
  }
}

async function setStatus(id, status) {
  try {
    await api.put(`/admin/reviews/${id}/status`, { status })
    await loadReviews()
  } catch (e) {
    error.value = e.response?.data?.error || 'Не удалось обновить статус'
  }
}

async function onSetStatus(id, status) {
  closeRowMenu()
  await setStatus(id, status)
}

watch(
  () => [filters.value.search, filters.value.status],
  () => {
    resetPage()
    loadReviews()
  },
)

onMounted(() => {
  loadReviews()
})
</script>

<style scoped lang="scss">
.comment-cell {
  min-width: 220px;
  max-width: 360px;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #475467;
}
</style>
