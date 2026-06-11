<template>
  <div class="admin-page">
    <header class="admin-page__header">
      <div class="admin-page__heading">
        <h1>Объекты</h1>
        <p class="admin-subtitle">Создание, редактирование и публикация заповедников</p>
      </div>
      <button class="app-btn app-btn--primary" type="button" @click="startCreate">Добавить</button>
    </header>

    <div v-if="error" class="admin-error" role="alert">{{ error }}</div>

    <div class="admin-toolbar">
      <div class="admin-filters admin-filters--grid">
        <input
          v-model.trim="search"
          class="app-input"
          placeholder="Поиск по названию или описанию"
          @input="loadReserves"
        />
        <AppRegionDistrictSelect
          v-model:region="filterRegion"
          v-model:district="filterDistrict"
          :districts="districts"
          :region-district-pairs="regionDistrictPairs"
          :regions="regions"
          @change="loadReserves"
        />
        <AppSelectDropdown
          v-model="filterType"
          :options="typeFilterOptions"
          empty-label="Все типы"
          placeholder="Все типы"
          @change="loadReserves"
        />
        <AppSelectDropdown
          v-model="publicationFilter"
          :options="publicationOptions"
          empty-label="Все"
          placeholder="Публикация"
          @change="loadReserves"
        />
      </div>
    </div>

    <div class="admin-table-card">
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Название</th>
              <th>Регион</th>
              <th>Публикация</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedItems" :key="item.id">
              <td class="admin-table__id">#{{ item.id }}</td>
              <td class="admin-table__primary">{{ item.name }}</td>
              <td>{{ item.region || '—' }}</td>
              <td>
                <span
                  :class="item.is_published ? 'admin-badge--published' : 'admin-badge--draft'"
                  class="admin-badge"
                >
                  {{ item.is_published ? 'Опубликован' : 'Черновик' }}
                </span>
              </td>
              <td class="admin-cell-actions">
                <AdminActionMenu
                  :open="openRowMenuId === item.id"
                  aria-label="Действия с объектом"
                  @close="closeRowMenu"
                  @toggle="toggleRowMenu(item.id)"
                >
                  <button class="action-menu__item" type="button" @click="onEditFromMenu(item)">
                    Изменить
                  </button>
                  <button class="action-menu__item" type="button" @click="onQrFromMenu(item)">
                    QR для стенда
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
            <tr v-if="!reserves.length" class="admin-table__empty-row">
              <td colspan="5">Нет данных</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showForm"
        :aria-labelledby="formTitleId"
        aria-modal="true"
        class="admin-form-modal"
        role="dialog"
        @click.self="closeForm"
      >
        <div class="admin-form" @click.stop>
          <h2 :id="formTitleId">{{ editingId ? 'Редактирование' : 'Новый заповедник' }}</h2>
          <form @submit.prevent="submitForm">
            <section class="form-section">
              <h3 class="form-section__title">Основное</h3>
              <div class="admin-grid-2">
                <input
                  v-model.trim="form.name"
                  class="app-input"
                  placeholder="Название *"
                  required
                />
                <AppSelectDropdown
                  v-model="form.type"
                  :options="typeFilterOptions"
                  :show-empty-option="false"
                  placeholder="Тип *"
                />
              </div>
              <textarea
                v-model.trim="form.description"
                class="app-input"
                placeholder="Описание *"
                required
                rows="4"
              ></textarea>
            </section>

            <section class="form-section">
              <h3 class="form-section__title">Статус и даты</h3>
              <div class="admin-grid-2">
                <div>
                  <label class="field-label">Дата создания</label>
                  <input v-model="form.created" class="app-input" type="date" />
                </div>
                <div>
                  <label class="field-label">Статус объекта</label>
                  <AppSelectDropdown
                    v-model="form.status_text"
                    :options="statusFormOptions"
                    empty-label="Не указан"
                    placeholder="Не указан"
                    @update:model-value="onStatusFormChange"
                  />
                </div>
                <div>
                  <label class="field-label">Дата присвоения статуса</label>
                  <input v-model="form.status_date" class="app-input" type="date" />
                </div>
              </div>
            </section>

            <section class="form-section">
              <h3 class="form-section__title">Контакты</h3>
              <div class="admin-grid-2">
                <input
                  :value="form.phone"
                  class="app-input"
                  inputmode="tel"
                  placeholder="Мобильный телефон"
                  @input="onPhoneInput"
                />
                <input
                  v-model.trim="form.email"
                  class="app-input"
                  placeholder="Email"
                  type="email"
                />
                <input v-model.trim="form.website" class="app-input" placeholder="Website" />
                <input v-model.trim="form.postal_address" class="app-input" placeholder="Адрес" />
              </div>
            </section>

            <section class="form-section">
              <h3 class="form-section__title">Локация</h3>
              <div class="admin-grid-2">
                <input
                  v-model.trim="form.latitude"
                  class="app-input"
                  placeholder="Широта (latitude) *"
                  required
                  step="any"
                  type="number"
                />
                <input
                  v-model.trim="form.longitude"
                  class="app-input"
                  placeholder="Долгота (longitude) *"
                  required
                  step="any"
                  type="number"
                />
                <input
                  v-model.trim="form.area"
                  class="app-input"
                  placeholder="Площадь (га) *"
                  required
                  step="any"
                  type="number"
                />

                <AppRegionDistrictSelect
                  v-model:region="form.region"
                  v-model:district="form.district"
                  :districts="districts"
                  :region-district-pairs="regionDistrictPairs"
                  :regions="regions"
                  district-empty-label="Не выбран"
                  district-placeholder="Район"
                  region-empty-label="Не выбран"
                  region-placeholder="Регион"
                />
              </div>
            </section>

            <section class="form-section">
              <h3 class="form-section__title">Публикация</h3>
              <label class="admin-checkbox">
                <input v-model="form.is_published" type="checkbox" />
                Опубликован
              </label>
            </section>

            <section class="form-section">
              <ReservePhotosEditor
                ref="photosEditorRef"
                v-model:pending-files="pendingPhotoFiles"
                v-model:photos="formPhotos"
                :reserve-id="editingId"
              />
            </section>

            <div class="admin-form-actions">
              <button :disabled="!canSubmit" class="app-btn app-btn--primary" type="submit">
                Сохранить
              </button>
              <button class="app-btn app-btn--ghost" type="button" @click="closeForm">
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Pagination
      v-if="showPagination"
      :current="page"
      :limit="limit"
      :total="total"
      @change="onPageChange"
    />

    <ReserveQrModal
      :is-published="!!qrReserve?.is_published"
      :open="qrModalOpen"
      :reserve-id="qrReserve?.id ?? null"
      :reserve-name="qrReserve?.name ?? ''"
      @close="closeQrModal"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import api from '@/services/api'
import AdminActionMenu from '@/components/admin/AdminActionMenu.vue'
import AppRegionDistrictSelect from '@/components/ui/AppRegionDistrictSelect.vue'
import AppSelectDropdown from '@/components/ui/AppSelectDropdown.vue'
import ReserveQrModal from '@/components/admin/ReserveQrModal.vue'
import ReservePhotosEditor from '@/components/admin/ReservePhotosEditor.vue'
import Pagination from '@/components/main/Pagination.vue'
import { useClientPagination } from '@/composables/useAdminPagination'
import { RESERVE_STATUS_OPTIONS, normalizeReserveStatus } from '@/config/reserveStatuses'

const reserves = ref([])
const { page, limit, total, paginatedItems, showPagination, resetPage, onPageChange } =
  useClientPagination(reserves, 20)
const error = ref('')
const search = ref('')
const filterRegion = ref('')
const filterDistrict = ref('')
const filterType = ref('')
const publicationFilter = ref('')
const openRowMenuId = ref(null)
const qrModalOpen = ref(false)
const qrReserve = ref(null)
const types = ref([])
const regions = ref([])
const districts = ref([])
const regionDistrictPairs = ref([])
const showForm = ref(false)
const editingId = ref(null)

const typeFilterOptions = computed(() => types.value.map((t) => ({ value: t, label: t })))

const publicationOptions = [
  { value: '', label: 'Все' },
  { value: '1', label: 'Только опубликованные' },
  { value: '0', label: 'Только черновики' },
]

const statusFormOptions = RESERVE_STATUS_OPTIONS
const formTitleId = 'admin-reserve-form-title'
const photosEditorRef = ref(null)
const formPhotos = ref([])
const pendingPhotoFiles = ref([])

const form = ref({
  name: '',
  type: '',
  created: '',
  status_text: '',
  status_date: '',
  phone: '',
  email: '',
  latitude: '',
  longitude: '',
  area: '',
  website: '',
  postal_address: '',
  region: '',
  district: '',
  description: '',
  is_published: true,
})

function normalizeDateForInput(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const dotMatch = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  if (dotMatch) {
    return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`
  }
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatPhoneInput(value) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11)
  if (!digits) return ''

  const country = digits[0]
  const code = digits.slice(1, 4)
  const part1 = digits.slice(4, 7)
  const part2 = digits.slice(7, 9)
  const part3 = digits.slice(9, 11)

  let result = `+${country}`
  if (code) result += ` (${code}`
  if (code.length === 3) result += ')'
  if (part1) result += ` ${part1}`
  if (part2) result += `-${part2}`
  if (part3) result += `-${part3}`
  return result
}

const canSubmit = computed(
  () =>
    !!form.value.name &&
    !!form.value.type &&
    !!form.value.description &&
    form.value.latitude !== '' &&
    form.value.longitude !== '' &&
    form.value.area !== '',
)

function resetPhotoState() {
  photosEditorRef.value?.revokePendingPreviews?.()
  formPhotos.value = []
  pendingPhotoFiles.value = []
}

function resetForm() {
  resetPhotoState()
  form.value = {
    name: '',
    type: '',
    created: '',
    status_text: '',
    status_date: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
    area: '',
    website: '',
    postal_address: '',
    region: '',
    district: '',
    description: '',
    is_published: true,
  }
}

watch([search, filterRegion, filterDistrict, filterType, publicationFilter], () => resetPage())

async function loadReserves() {
  error.value = ''
  try {
    const params = {
      search: search.value || undefined,
      region: filterRegion.value || undefined,
      district: filterDistrict.value || undefined,
      type: filterType.value || undefined,
    }
    if (publicationFilter.value === '') {
      params.include_unpublished = '1'
    } else {
      params.is_published = publicationFilter.value
    }
    const res = await api.get('/admin/reserves', { params })
    reserves.value = res.data.data || []
  } catch {
    error.value = 'Не удалось загрузить список заповедников'
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
  removeReserve(id)
}

function onQrFromMenu(item) {
  closeRowMenu()
  qrReserve.value = item
  qrModalOpen.value = true
}

function closeQrModal() {
  qrModalOpen.value = false
  qrReserve.value = null
}

async function loadMeta() {
  const [typesRes, filtersRes] = await Promise.all([api.get('/types'), api.get('/filters')])
  types.value = typesRes.data.data || []
  regions.value = filtersRes.data.regions || []
  districts.value = filtersRes.data.districts || []
  regionDistrictPairs.value = filtersRes.data.regionDistrictPairs || []
}

async function loadReservePhotos(reserveId) {
  try {
    const res = await api.getAdminReservePhotos(reserveId)
    formPhotos.value = res.data?.data || []
  } catch {
    formPhotos.value = []
    error.value = 'Не удалось загрузить фото объекта'
  }
}

function startCreate() {
  editingId.value = null
  resetForm()
  showForm.value = true
}

async function startEdit(item) {
  editingId.value = item.id
  resetPhotoState()
  form.value = {
    name: item.name || '',
    type: item.type || '',
    created: normalizeDateForInput(item.created),
    status_text: normalizeReserveStatus(item.status_text),
    status_date: normalizeDateForInput(item.status_date),
    phone: item.phone || '',
    email: item.email || '',
    latitude: item.latitude ?? '',
    longitude: item.longitude ?? '',
    area: item.area ?? '',
    website: item.website || '',
    postal_address: item.postal_address || '',
    region: item.region || '',
    district: item.district || '',
    description: item.description || '',
    is_published: !!item.is_published,
  }
  showForm.value = true
  await loadReservePhotos(item.id)
}

function closeForm() {
  showForm.value = false
  editingId.value = null
  resetForm()
}

function onStatusFormChange(value) {
  form.value.status_text = normalizeReserveStatus(value)
}

async function submitForm() {
  if (!canSubmit.value) {
    error.value = 'Заполните обязательные поля: название, тип, описание, координаты, площадь'
    return
  }

  error.value = ''
  const payload = { ...form.value }
  payload.status_text = normalizeReserveStatus(payload.status_text)
  payload.latitude = Number(payload.latitude)
  payload.longitude = Number(payload.longitude)
  payload.area = Number(payload.area)

  if (
    Number.isNaN(payload.latitude) ||
    Number.isNaN(payload.longitude) ||
    Number.isNaN(payload.area)
  ) {
    error.value = 'Координаты и площадь должны быть числами'
    return
  }

  try {
    if (editingId.value) {
      await api.put(`/admin/reserves/${editingId.value}`, payload)
    } else {
      const res = await api.post('/admin/reserves', payload)
      const newId = res.data?.data?.id
      if (newId && pendingPhotoFiles.value.length) {
        const uploadOk = await photosEditorRef.value?.uploadPending(newId)
        if (!uploadOk) {
          error.value =
            'Объект создан, но не все фото загрузились. Откройте редактирование и добавьте фото снова.'
          await loadReserves()
          return
        }
      }
    }
    closeForm()
    await loadReserves()
  } catch (err) {
    error.value = err.response?.data?.error || 'Не удалось сохранить объект'
  }
}

async function removeReserve(id) {
  if (!window.confirm('Удалить запись?')) return
  await api.delete(`/admin/reserves/${id}`)
  await loadReserves()
}

function onPhoneInput(event) {
  form.value.phone = formatPhoneInput(event.target.value)
}

watch(showForm, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(async () => {
  await Promise.all([loadReserves(), loadMeta()])
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped lang="scss">
.admin-form form {
  display: grid;
  gap: 10px;
}

.form-section {
  border: 1px solid #eaecf0;
  border-radius: 12px;
  padding: 12px;
  display: grid;
  gap: 10px;
}

.form-section__title {
  margin: 0;
  font-size: 1rem;
  color: #2e8b57;
}
</style>
