<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__heading">
        <h1>Готовые маршруты</h1>
        <p class="admin-subtitle">Подборки маршрутов для публичного раздела сайта</p>
      </div>
      <button class="app-btn app-btn--primary" type="button" @click="startCreate">Добавить</button>
    </header>

    <div v-if="error" class="admin-error" role="alert">{{ error }}</div>

    <div class="admin-table-card">
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Порядок</th>
              <th>slug</th>
              <th>Название</th>
              <th>Объекты</th>
              <th>~км / время</th>
              <th>Публикация</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedItems" :key="item.id">
              <td class="admin-table__id">{{ item.sortOrder }}</td>
              <td>
                <code>{{ item.slug }}</code>
              </td>
              <td class="admin-table__primary">{{ item.title }}</td>
              <td class="admin-table__muted admin-table__objects">
                {{ formatRouteObjects(item.reserveIds) }}
              </td>
              <td class="admin-table__metrics">
                <template v-if="item.listDistance || item.listDuration">
                  <span v-if="item.listDistance">{{ item.listDistance }}</span>
                  <span v-if="item.listDistance && item.listDuration"> · </span>
                  <span v-if="item.listDuration">{{ item.listDuration }}</span>
                </template>
                <span v-else class="admin-table__muted">—</span>
              </td>
              <td>
                <span
                  :class="item.isPublished ? 'admin-badge--published' : 'admin-badge--draft'"
                  class="admin-badge"
                >
                  {{ item.isPublished ? 'Опубликован' : 'Черновик' }}
                </span>
              </td>
              <td class="admin-cell-actions">
                <AdminActionMenu
                  :open="openRowMenuId === item.id"
                  aria-label="Действия с маршрутом"
                  @close="closeRowMenu"
                  @toggle="toggleRowMenu(item.id)"
                >
                  <button class="action-menu__item" type="button" @click="onEditFromMenu(item)">
                    Изменить
                  </button>
                  <button
                    class="action-menu__item action-menu__item--danger"
                    type="button"
                    @click="onRemoveFromMenu(item.id)"
                  >
                    Удалить
                  </button>
                </AdminActionMenu>
              </td>
            </tr>
            <tr v-if="!routes.length && !loading" class="admin-table__empty-row">
              <td colspan="7">Нет маршрутов</td>
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

    <Teleport to="body">
      <div
        v-if="showForm"
        aria-modal="true"
        class="admin-form-modal"
        role="dialog"
        @click.self="closeForm"
      >
        <div class="admin-form admin-form--wide" @click.stop>
          <h2>{{ editingId ? 'Редактирование маршрута' : 'Новый маршрут' }}</h2>
          <form class="curated-admin-form" @submit.prevent="submitForm">
            <label class="field-label">slug (латиница, дефисы) *</label>
            <input
              v-model.trim="form.slug"
              class="app-input"
              placeholder="naprimer-sever-belarusi"
              required
            />

            <label class="field-label">Название *</label>
            <input v-model.trim="form.title" class="app-input" required />

            <label class="field-label">Кратко для списка</label>
            <input v-model.trim="form.teaser" class="app-input" />

            <label class="field-label">Регион (подпись) *</label>
            <input v-model.trim="form.regionLabel" class="app-input" required />

            <label class="field-label">Профиль ORS *</label>
            <AppSelectDropdown
              v-model="form.profile"
              :options="orsProfileOptions"
              :show-empty-option="false"
              placeholder="Профиль маршрута"
            />

            <CuratedRouteReservesPicker v-model="form.reserveIds" />

            <label class="field-label">Описание (абзацы через пустую строку) *</label>
            <textarea
              v-model.trim="form.descriptionText"
              class="app-input"
              required
              rows="6"
            ></textarea>

            <div class="curated-admin-form__metrics">
              <div class="curated-admin-form__metrics-row">
                <div>
                  <label class="field-label">Ориентир км (из ORS)</label>
                  <input
                    :value="form.listDistance || '—'"
                    class="app-input"
                    readonly
                    tabindex="-1"
                  />
                </div>
                <div>
                  <label class="field-label">Ориентир время (из ORS)</label>
                  <input
                    :value="form.listDuration || '—'"
                    class="app-input"
                    readonly
                    tabindex="-1"
                  />
                </div>
              </div>
              <button
                :disabled="previewLoading"
                class="app-btn app-btn--secondary"
                type="button"
                @click="recalculatePreview"
              >
                {{ previewLoading ? 'Расчёт…' : 'Пересчитать маршрут' }}
              </button>
              <p v-if="formWarning" class="curated-admin-form__warn">{{ formWarning }}</p>
            </div>

            <div class="admin-grid-2">
              <div>
                <label class="field-label">Порядок сортировки</label>
                <input v-model.number="form.sortOrder" class="app-input" step="1" type="number" />
              </div>
              <label class="admin-checkbox">
                <input v-model="form.isPublished" type="checkbox" />
                Опубликован (виден на сайте)
              </label>
            </div>

            <div class="curated-admin-form__actions">
              <button :disabled="saving" class="app-btn app-btn--primary" type="submit">
                {{ saving ? 'Сохранение…' : 'Сохранить' }}
              </button>
              <button class="app-btn app-btn--ghost" type="button" @click="closeForm">
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import api from '@/services/api'
import AdminActionMenu from '@/components/admin/AdminActionMenu.vue'
import AppSelectDropdown from '@/components/ui/AppSelectDropdown.vue'
import Pagination from '@/components/main/Pagination.vue'
import CuratedRouteReservesPicker from '@/components/admin/CuratedRouteReservesPicker.vue'
import { useClientPagination } from '@/composables/useAdminPagination'

const orsProfileOptions = [
  { value: 'driving-car', label: 'На авто (driving-car)' },
  { value: 'foot-walking', label: 'Пешком (foot-walking)' },
]

const openRowMenuId = ref(null)
const routes = ref([])
const { page, limit, total, paginatedItems, showPagination, resetPage, onPageChange } =
  useClientPagination(routes, 15)
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const editingId = ref(null)
const saving = ref(false)
const previewLoading = ref(false)
const formWarning = ref('')
const reserveNameById = ref(new Map())

const form = reactive({
  slug: '',
  title: '',
  teaser: '',
  regionLabel: '',
  profile: 'driving-car',
  reserveIds: [],
  descriptionText: '',
  listDistance: '',
  listDuration: '',
  sortOrder: 0,
  isPublished: true,
})

function pluralObjects(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'объект'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'объекта'
  return 'объектов'
}

function formatRouteObjects(ids) {
  if (!ids?.length) return '—'
  const n = ids.length
  const map = reserveNameById.value
  if (!map.size) return `${n} ${pluralObjects(n)}`
  const names = ids.map((id) => map.get(id) || `#${id}`)
  if (n <= 2) return names.join(' → ')
  if (n <= 4) return `${n} ${pluralObjects(n)}: ${names.join(', ')}`
  return `${n} ${pluralObjects(n)}: ${names.slice(0, 2).join(', ')}…`
}

async function loadReserveNames() {
  try {
    const res = await api.get('/admin/reserves', { params: { is_published: 1 } })
    const map = new Map()
    for (const row of res.data?.data || []) {
      map.set(row.id, row.name || `Объект #${row.id}`)
    }
    reserveNameById.value = map
  } catch {
    reserveNameById.value = new Map()
  }
}

function resetForm() {
  formWarning.value = ''
  form.slug = ''
  form.title = ''
  form.teaser = ''
  form.regionLabel = ''
  form.profile = 'driving-car'
  form.reserveIds = []
  form.descriptionText = ''
  form.listDistance = ''
  form.listDuration = ''
  form.sortOrder = 0
  form.isPublished = true
}

async function loadRoutes() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await api.getAdminCuratedRoutes()
    routes.value = Array.isArray(data.data) ? data.data : []
    resetPage()
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Ошибка загрузки'
    routes.value = []
  } finally {
    loading.value = false
  }
}

function toggleRowMenu(id) {
  openRowMenuId.value = openRowMenuId.value === id ? null : id
}

function closeRowMenu() {
  openRowMenuId.value = null
}

function onEditFromMenu(item) {
  closeRowMenu()
  startEdit(item)
}

function onRemoveFromMenu(id) {
  closeRowMenu()
  remove(id)
}

function startCreate() {
  editingId.value = null
  resetForm()
  formWarning.value = ''
  showForm.value = true
}

function startEdit(item) {
  editingId.value = item.id
  form.slug = item.slug
  form.title = item.title
  form.teaser = item.teaser || ''
  form.regionLabel = item.regionLabel
  form.profile = item.profile
  form.reserveIds = [...(item.reserveIds || [])]
  form.descriptionText = Array.isArray(item.description) ? item.description.join('\n\n') : ''
  form.listDistance = item.listDistance || ''
  form.listDuration = item.listDuration || ''
  form.sortOrder = item.sortOrder ?? 0
  form.isPublished = !!item.isPublished
  formWarning.value = ''
  showForm.value = true
}

async function recalculatePreview() {
  previewLoading.value = true
  formWarning.value = ''
  const reserveIds = [...form.reserveIds]
  if (reserveIds.length < 2) {
    formWarning.value = 'Выберите минимум 2 объекта для расчёта'
    previewLoading.value = false
    return
  }
  try {
    const { data } = await api.postAdminCuratedRoutePreview({
      profile: form.profile,
      reserveIds,
    })
    const row = data?.data
    form.listDistance = row?.listDistance || ''
    form.listDuration = row?.listDuration || ''
  } catch (e) {
    formWarning.value = e?.response?.data?.error || e?.message || 'Не удалось рассчитать маршрут'
  } finally {
    previewLoading.value = false
  }
}

function closeForm() {
  showForm.value = false
}

async function submitForm() {
  saving.value = true
  error.value = ''
  formWarning.value = ''
  const reserveIds = [...form.reserveIds]
  if (reserveIds.length < 2) {
    formWarning.value = 'Выберите минимум 2 объекта'
    saving.value = false
    return
  }
  if (reserveIds.length > 10) {
    formWarning.value = 'Не более 10 объектов в маршруте'
    saving.value = false
    return
  }
  const payload = {
    slug: form.slug.toLowerCase(),
    title: form.title,
    teaser: form.teaser,
    regionLabel: form.regionLabel,
    profile: form.profile,
    reserveIds,
    description: form.descriptionText,
    sortOrder: form.sortOrder,
    isPublished: form.isPublished,
  }
  try {
    let res
    if (editingId.value) {
      res = await api.putAdminCuratedRoute(editingId.value, payload)
    } else {
      res = await api.postAdminCuratedRoute(payload)
    }
    const saved = res?.data?.data
    if (saved) {
      form.listDistance = saved.listDistance || ''
      form.listDuration = saved.listDuration || ''
    }
    if (res?.data?.orsWarning) {
      formWarning.value = res.data.orsWarning
    } else {
      closeForm()
    }
    await loadRoutes()
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}

async function remove(id) {
  if (!window.confirm('Удалить маршрут?')) return
  error.value = ''
  try {
    await api.deleteAdminCuratedRoute(id)
    await loadRoutes()
  } catch (e) {
    error.value = e?.response?.data?.error || e?.message || 'Ошибка удаления'
  }
}

watch(showForm, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  loadRoutes()
  loadReserveNames()
})
onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style lang="scss" scoped>
.admin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.curated-admin-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.curated-admin-form__metrics {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.curated-admin-form__metrics-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.curated-admin-form__warn {
  margin: 0;
  font-size: 0.85rem;
  color: #b54708;
}

.curated-admin-form__actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}
</style>
