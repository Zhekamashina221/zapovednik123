<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__heading">
        <h1>Аудит-логи</h1>
        <p class="admin-subtitle">История действий администраторов в системе</p>
      </div>
    </header>

    <div class="admin-toolbar">
      <div class="admin-filters admin-filters--audit">
        <AppSelectDropdown
          v-model="filters.action"
          :options="AUDIT_ACTION_OPTIONS"
          empty-label="Все действия"
          placeholder="Все действия"
        />
        <AppSelectDropdown
          v-model="filters.target_type"
          :options="AUDIT_TARGET_TYPE_OPTIONS"
          empty-label="Все типы объекта"
          placeholder="Тип объекта"
        />
        <input v-model="filters.from" class="app-input" type="date" />
        <input v-model="filters.to" class="app-input" type="date" />
        <button class="app-btn app-btn--primary" type="button" @click="applyFilters">Применить</button>
      </div>
    </div>

    <div v-if="error" class="admin-error" role="alert">{{ error }}</div>

    <div class="admin-table-card">
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Администратор</th>
              <th>Действие</th>
              <th>Объект</th>
              <th>Данные</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in logs" :key="item.id">
              <td class="admin-table__muted">{{ item.created_at }}</td>
              <td>
                <div class="admin-table__primary">{{ item.admin_name || item.admin_email }}</div>
              </td>
              <td>{{ auditActionLabel(item.action) }}</td>
              <td>{{ auditTargetLabel(item.target_type) }} #{{ item.target_id ?? '-' }}</td>
              <td>
                <pre class="payload">{{ prettyPayload(item.payload) }}</pre>
              </td>
            </tr>
            <tr v-if="!logs.length" class="admin-table__empty-row">
              <td colspan="5">Нет записей</td>
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
      @change="(p) => onPageChange(p, loadLogs)"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import api from '@/services/api'
import AppSelectDropdown from '@/components/ui/AppSelectDropdown.vue'
import Pagination from '@/components/main/Pagination.vue'
import { useOffsetPagination } from '@/composables/useAdminPagination'

const AUDIT_ACTION_OPTIONS = [
  { value: 'reserve_create', label: 'Создание объекта (заповедника)' },
  { value: 'reserve_update', label: 'Изменение объекта' },
  { value: 'reserve_delete', label: 'Удаление объекта' },
  { value: 'user_role_change', label: 'Смена роли пользователя' },
  { value: 'user_block', label: 'Блокировка пользователя' },
  { value: 'user_unblock', label: 'Разблокировка пользователя' },
  { value: 'review_moderate', label: 'Модерация отзыва' },
  { value: 'curated_route_create', label: 'Создание готового маршрута' },
  { value: 'curated_route_update', label: 'Изменение готового маршрута' },
  { value: 'curated_route_delete', label: 'Удаление готового маршрута' },
]

const AUDIT_TARGET_TYPE_OPTIONS = [
  { value: 'reserve', label: 'Объект (заповедник)' },
  { value: 'user', label: 'Пользователь' },
  { value: 'review', label: 'Отзыв' },
  { value: 'curated_route', label: 'Готовый маршрут' },
]

const ACTION_LABEL_MAP = Object.fromEntries(AUDIT_ACTION_OPTIONS.map((o) => [o.value, o.label]))
const TARGET_LABEL_MAP = Object.fromEntries(AUDIT_TARGET_TYPE_OPTIONS.map((o) => [o.value, o.label]))

function auditActionLabel(action) {
  return ACTION_LABEL_MAP[action] || action || '-'
}

function auditTargetLabel(targetType) {
  return TARGET_LABEL_MAP[targetType] || targetType || '-'
}

const logs = ref([])
const error = ref('')
const filters = ref({
  action: '',
  target_type: '',
  from: '',
  to: '',
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
} = useOffsetPagination(50)

function prettyPayload(payload) {
  if (!payload) return '-'
  try {
    const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(payload)
  }
}

async function loadLogs() {
  error.value = ''
  try {
    const res = await api.get('/admin/audit-logs', {
      params: {
        action: filters.value.action || undefined,
        target_type: filters.value.target_type || undefined,
        from: filters.value.from || undefined,
        to: filters.value.to || undefined,
        limit: limit.value,
        offset: offset.value,
      },
    })
    logs.value = res.data.data || []
    total.value = Number(res.data.total) || 0
    syncPageFromOffset()
  } catch {
    error.value = 'Не удалось загрузить аудит-логи'
  }
}

async function applyFilters() {
  resetPage()
  await loadLogs()
}

watch(
  () => [filters.value.action, filters.value.target_type, filters.value.from, filters.value.to],
  () => {
    resetPage()
  },
)

onMounted(loadLogs)
</script>

<style scoped lang="scss">
.payload {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 420px;
  font-size: 0.76rem;
  line-height: 1.4;
  color: #475467;
  background: #f9fafb;
  border: 1px solid #f2f4f7;
  border-radius: 8px;
  padding: 8px 10px;
}
</style>
