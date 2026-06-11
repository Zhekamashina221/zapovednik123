<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__heading">
        <h1>Пользователи и роли</h1>
        <p class="admin-subtitle">Управление доступом, ролями и блокировками учётных записей</p>
      </div>
    </header>

    <div class="admin-stats">
      <span class="admin-stat-pill"
        >Всего: <strong>{{ stats.total }}</strong></span
      >

      <span class="admin-stat-pill"
        >Админы: <strong>{{ stats.admins }}</strong></span
      >
      <span v-if="stats.blocked" class="admin-stat-pill admin-stat-pill--danger">
        Заблокированы: <strong>{{ stats.blocked }}</strong>
      </span>
    </div>

    <div class="admin-toolbar">
      <div class="admin-filters admin-filters--3">
        <input
          v-model.trim="filters.search"
          autocomplete="off"
          class="app-input"
          placeholder="Поиск по email, имени или ID"
          type="search"
        />
        <AppSelectDropdown
          v-model="filters.role"
          :options="roleFilterOptions"
          empty-label="Все роли"
          placeholder="Все роли"
        />
        <AppSelectDropdown
          v-model="filters.blocked"
          :options="blockedFilterOptions"
          empty-label="Все статусы"
          placeholder="Статус учётной записи"
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
              <th>Пользователь</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in paginatedItems" :key="user.id">
              <td class="admin-table__id">#{{ user.id }}</td>
              <td>
                <div class="admin-table__primary">{{ user.email }}</div>
                <div v-if="user.name" class="admin-table__secondary">{{ user.name }}</div>
                <div v-else class="admin-table__secondary admin-table__secondary--muted">
                  Имя не указано
                </div>
              </td>
              <td>
                <span
                  :class="user.role === 'admin' ? 'admin-badge--admin' : 'admin-badge--user'"
                  class="admin-badge"
                >
                  {{ roleLabel(user.role) }}
                </span>
              </td>
              <td>
                <span
                  :class="user.is_blocked ? 'admin-badge--blocked' : 'admin-badge--active'"
                  class="admin-badge"
                >
                  {{ user.is_blocked ? 'Заблокирован' : 'Активен' }}
                </span>
              </td>
              <td class="admin-cell-actions">
                <AdminActionMenu
                  :open="openRowMenuId === user.id"
                  :aria-label="`Действия для ${user.email}`"
                  @close="closeRowMenu"
                  @toggle="toggleRowMenu(user.id)"
                >
                  <button
                    class="action-menu__item"
                    role="menuitem"
                    type="button"
                    @click="onToggleRole(user)"
                  >
                    {{
                      user.role === 'admin' ? 'Сделать пользователем' : 'Сделать администратором'
                    }}
                  </button>
                  <button
                    class="action-menu__item action-menu__item--danger"
                    role="menuitem"
                    type="button"
                    @click="onToggleBlocked(user)"
                  >
                    {{ user.is_blocked ? 'Разблокировать' : 'Заблокировать' }}
                  </button>
                </AdminActionMenu>
              </td>
            </tr>
            <tr v-if="!filteredUsers.length" class="admin-table__empty-row">
              <td colspan="5">
                {{ users.length ? 'Ничего не найдено по фильтрам' : 'Пользователи отсутствуют' }}
              </td>
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
      @change="onPageChange"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import AdminActionMenu from '@/components/admin/AdminActionMenu.vue'
import AppSelectDropdown from '@/components/ui/AppSelectDropdown.vue'
import Pagination from '@/components/main/Pagination.vue'
import { useClientPagination } from '@/composables/useAdminPagination'

const auth = useAuthStore()
const users = ref([])
const error = ref('')
const openRowMenuId = ref(null)
const roleFilterOptions = [
  { value: 'admin', label: 'Администратор' },
  { value: 'user', label: 'Пользователь' },
]

const blockedFilterOptions = [
  { value: 'active', label: 'Активные' },
  { value: 'blocked', label: 'Заблокированные' },
]

const filters = ref({
  search: '',
  role: '',
  blocked: '',
})

function roleLabel(role) {
  if (role === 'admin') return 'Администратор'
  if (role === 'user') return 'Пользователь'
  return role || '-'
}

const filteredUsers = computed(() => {
  let list = users.value
  const q = filters.value.search.trim().toLowerCase()
  if (q) {
    list = list.filter((u) => {
      const hay = `${u.email || ''} ${u.name || ''} ${u.id}`.toLowerCase()
      return hay.includes(q)
    })
  }
  if (filters.value.role) {
    list = list.filter((u) => u.role === filters.value.role)
  }
  if (filters.value.blocked === 'blocked') {
    list = list.filter((u) => u.is_blocked)
  } else if (filters.value.blocked === 'active') {
    list = list.filter((u) => !u.is_blocked)
  }
  return list
})

const { page, limit, total, paginatedItems, showPagination, resetPage, onPageChange } =
  useClientPagination(filteredUsers, 20)

watch(
  () => [filters.value.search, filters.value.role, filters.value.blocked],
  () => resetPage(),
)

const stats = computed(() => ({
  total: users.value.length,
  shown: filteredUsers.value.length,
  admins: users.value.filter((u) => u.role === 'admin').length,
  blocked: users.value.filter((u) => u.is_blocked).length,
}))

function toggleRowMenu(id) {
  openRowMenuId.value = openRowMenuId.value === id ? null : id
}

function closeRowMenu() {
  openRowMenuId.value = null
}

async function loadUsers() {
  error.value = ''
  try {
    const res = await api.get('/admin/users')
    users.value = res.data.data || []
  } catch {
    error.value = 'Не удалось загрузить пользователей'
  }
}

async function toggleRole(user) {
  const role = user.role === 'admin' ? 'user' : 'admin'
  await api.put(`/admin/users/${user.id}/role`, { role })
  await loadUsers()
  if (auth.user?.id === user.id) {
    await auth.loadProfile()
  }
}

async function toggleBlocked(user) {
  await api.put(`/admin/users/${user.id}/block`, {
    is_blocked: !user.is_blocked,
  })
  await loadUsers()
}

async function onToggleRole(user) {
  closeRowMenu()
  await toggleRole(user)
}

async function onToggleBlocked(user) {
  closeRowMenu()
  await toggleBlocked(user)
}

onMounted(() => {
  loadUsers()
})
</script>
