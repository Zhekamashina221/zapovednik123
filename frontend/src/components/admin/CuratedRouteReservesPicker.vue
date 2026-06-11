<template>
  <div class="route-picker">
    <div class="route-picker__header">
      <label class="field-label">Точки маршрута по порядку *</label>
      <p class="route-picker__hint">
        Выбрано {{ modelValue.length }} из {{ maxPoints }} · минимум {{ minPoints }}
        <span v-if="modelValue.length < minPoints" class="route-picker__hint-warn">
          (нужно ещё {{ minPoints - modelValue.length }})
        </span>
      </p>
    </div>

    <div class="route-picker__grid">
      <section class="route-picker__panel">
        <h3 class="route-picker__panel-title">Добавить объект</h3>
        <div class="route-picker__wrapper">
          <input
            v-model.trim="search"
            autocomplete="off"
            class="app-input route-picker__search"
            placeholder="Поиск по названию"
            type="search"
          />

          <div class="route-picker__filters">
            <AppRegionDistrictSelect
              v-model:district="filterDistrict"
              v-model:region="filterRegion"
              :districts="filterDistricts"
              :region-district-pairs="regionDistrictPairs"
              :regions="filterRegions"
            />
            <AppSelectDropdown
              v-model="filterType"
              :options="typeFilterOptions"
              empty-label="Все типы"
              placeholder="Все типы"
            />
          </div>
        </div>

        <div v-if="catalogLoading" class="route-picker__state">Загрузка объектов…</div>
        <p v-else-if="catalogError" class="route-picker__state route-picker__state--error">
          {{ catalogError }}
        </p>
        <p v-else-if="!filteredCatalog.length" class="route-picker__state">Ничего не найдено</p>

        <ul v-else class="route-picker__catalog" role="list">
          <li v-for="item in filteredCatalog" :key="item.id" class="route-picker__catalog-item">
            <button
              :disabled="!canAdd(item)"
              :title="addButtonTitle(item)"
              class="route-picker__catalog-btn"
              type="button"
              @click="addReserve(item.id)"
            >
              <span
                :style="{ backgroundColor: item.typeColor }"
                aria-hidden="true"
                class="route-picker__type-dot"
              />
              <span class="route-picker__catalog-text">
                <span class="route-picker__catalog-name">{{ item.name }}</span>
                <span class="route-picker__catalog-meta">
                  <template v-if="item.region">{{ item.region }}</template>
                  <template v-if="item.region"> · </template>
                  #{{ item.id }}
                  <span v-if="!item.hasCoords" class="route-picker__badge-warn">нет координат</span>
                </span>
              </span>
              <span aria-hidden="true" class="route-picker__add-icon">+</span>
            </button>
          </li>
        </ul>
      </section>

      <section class="route-picker__panel route-picker__panel--selected">
        <h3 class="route-picker__panel-title">Порядок маршрута</h3>

        <p v-if="!selectedItems.length" class="route-picker__state">
          Добавьте объекты — порядок определяет маршрут на карте.
        </p>

        <ol v-else class="route-picker__selected">
          <li
            v-for="(item, index) in selectedItems"
            :key="item.id"
            class="route-picker__selected-item"
          >
            <span class="route-picker__step">{{ index + 1 }}</span>
            <div class="route-picker__selected-body">
              <span class="route-picker__selected-name">{{ item.name }}</span>
              <span class="route-picker__selected-meta">
                {{ item.region || '—' }} · #{{ item.id }}
              </span>
            </div>
            <div class="route-picker__selected-actions">
              <button
                :disabled="index === 0"
                aria-label="Переместить выше"
                class="route-picker__move-btn"
                type="button"
                @click="moveUp(index)"
              >
                ↑
              </button>
              <button
                :disabled="index === selectedItems.length - 1"
                aria-label="Переместить ниже"
                class="route-picker__move-btn"
                type="button"
                @click="moveDown(index)"
              >
                ↓
              </button>
              <button
                aria-label="Удалить из маршрута"
                class="route-picker__remove-btn"
                type="button"
                @click="removeAt(index)"
              >
                ×
              </button>
            </div>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import api from '@/services/api'
import { getTypeConfig } from '@/config/reserveTypes'
import AppRegionDistrictSelect from '@/components/ui/AppRegionDistrictSelect.vue'
import AppSelectDropdown from '@/components/ui/AppSelectDropdown.vue'

const MIN_POINTS = 2
const MAX_POINTS = 10

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  minPoints: {
    type: Number,
    default: MIN_POINTS,
  },
  maxPoints: {
    type: Number,
    default: MAX_POINTS,
  },
})

const emit = defineEmits(['update:modelValue'])

const catalog = ref([])
const catalogLoading = ref(false)
const catalogError = ref('')
const search = ref('')
const filterRegion = ref('')
const filterDistrict = ref('')
const filterType = ref('')
const filterRegions = ref([])
const filterDistricts = ref([])
const regionDistrictPairs = ref([])

const catalogById = computed(() => {
  const map = new Map()
  for (const row of catalog.value) {
    map.set(row.id, row)
  }
  return map
})

const typeFilterOptions = computed(() => {
  const set = new Set()
  for (const row of catalog.value) {
    if (row.type) set.add(row.type)
  }
  return [...set]
    .sort((a, b) => String(a).localeCompare(String(b), 'ru'))
    .map((t) => ({ value: t, label: t }))
})

const filteredCatalog = computed(() => {
  let list = catalog.value
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter((row) => {
      const hay = `${row.name} ${row.region} ${row.id}`.toLowerCase()
      return hay.includes(q)
    })
  }
  if (filterRegion.value) {
    list = list.filter((row) => row.region === filterRegion.value)
  }
  if (filterDistrict.value) {
    list = list.filter((row) => row.district === filterDistrict.value)
  }
  if (filterType.value) {
    list = list.filter((row) => row.type === filterType.value)
  }
  return list
})

const selectedSet = computed(() => new Set(props.modelValue))

const selectedItems = computed(() =>
  props.modelValue.map((id) => catalogById.value.get(id)).filter(Boolean),
)

function normalizeReserve(row) {
  const lat = Number(row.latitude)
  const lng = Number(row.longitude)
  const typeConfig = getTypeConfig(row.type || '')
  return {
    id: row.id,
    name: row.name || `Объект #${row.id}`,
    region: row.region || '',
    district: row.district || '',
    type: row.type || '',
    typeColor: typeConfig.color || '#757575',
    hasCoords: Number.isFinite(lat) && Number.isFinite(lng),
  }
}

function emitIds(ids) {
  emit('update:modelValue', ids)
}

function isSelected(id) {
  return selectedSet.value.has(id)
}

function canAdd(item) {
  if (isSelected(item.id)) return false
  if (!item.hasCoords) return false
  if (props.modelValue.length >= props.maxPoints) return false
  return true
}

function addButtonTitle(item) {
  if (isSelected(item.id)) return 'Уже в маршруте'
  if (!item.hasCoords) return 'Нет координат — маршрут не построить'
  if (props.modelValue.length >= props.maxPoints) return `Не более ${props.maxPoints} точек`
  return 'Добавить в маршрут'
}

function addReserve(id) {
  const item = catalogById.value.get(id)
  if (!item || !canAdd(item)) return
  emitIds([...props.modelValue, id])
}

function removeAt(index) {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emitIds(next)
}

function moveUp(index) {
  if (index <= 0) return
  const next = [...props.modelValue]
  ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
  emitIds(next)
}

function moveDown(index) {
  if (index >= props.modelValue.length - 1) return
  const next = [...props.modelValue]
  ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
  emitIds(next)
}

async function loadFilterMeta() {
  try {
    const res = await api.get('/filters')
    filterRegions.value = res.data?.regions || []
    filterDistricts.value = res.data?.districts || []
    regionDistrictPairs.value = res.data?.regionDistrictPairs || []
  } catch {
    filterRegions.value = []
    filterDistricts.value = []
    regionDistrictPairs.value = []
  }
}

async function loadCatalog() {
  if (catalog.value.length) return
  catalogLoading.value = true
  catalogError.value = ''
  try {
    const res = await api.get('/admin/reserves', { params: { is_published: 1 } })
    const rows = res.data?.data || []
    catalog.value = rows
      .map(normalizeReserve)
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ru'))
  } catch {
    catalogError.value = 'Не удалось загрузить список объектов'
    catalog.value = []
  } finally {
    catalogLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadFilterMeta(), loadCatalog()])
})

watch(
  () => props.modelValue,
  (ids) => {
    const missing = ids.filter((id) => !catalogById.value.has(id))
    if (missing.length && !catalogLoading.value && catalog.value.length) {
      for (const id of missing) {
        catalog.value.push({
          id,
          name: `Объект #${id}`,
          region: '',
          district: '',
          type: '',
          typeColor: '#757575',
          hasCoords: true,
        })
      }
    }
  },
  { immediate: true },
)

defineExpose({
  loadCatalog,
  catalogById,
})
</script>

<style lang="scss" scoped>
.route-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.route-picker__wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.route-picker__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.route-picker__hint {
  margin: 0;
  font-size: 0.82rem;
  color: #667085;
}

.route-picker__hint-warn {
  color: #b54708;
  font-weight: 600;
}

.route-picker__grid {
  display: grid;
  gap: 12px;
  align-items: stretch;
}

.route-picker__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 310px;
  max-height: 360px;
  padding: 10px;
  border: 1px solid #eaecf0;
  border-radius: 12px;
  background: #fafbfc;
}

.route-picker__panel--selected {
  background: #f3fbf6;
  border-color: rgba($color-primary, 0.22);
}

.route-picker__panel-title {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #667085;
}

.route-picker__search {
  font-size: 0.88rem;
  padding: 8px 10px;
}

.route-picker__filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;

  .app-input {
    font-size: 0.82rem;
    padding: 7px 8px;
  }
}

.route-picker__state {
  margin: auto 0;
  padding: 16px 8px;
  text-align: center;
  font-size: 0.84rem;
  color: #667085;

  &--error {
    color: #b42318;
  }
}

.route-picker__catalog,
.route-picker__selected {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.route-picker__catalog-item {
  margin: 0;
}

.route-picker__catalog-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-bottom: 1px solid #eef0f2;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: #eef8f2;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.route-picker__type-dot {
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.route-picker__catalog-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.route-picker__catalog-name {
  font-size: 0.86rem;
  font-weight: 600;
  color: #101828;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-picker__catalog-meta {
  font-size: 0.76rem;
  color: #667085;
}

.route-picker__badge-warn {
  margin-left: 4px;
  padding: 1px 5px;
  border-radius: 4px;
  background: #fff4d9;
  color: #b8860b;
  font-size: 0.7rem;
  font-weight: 600;
}

.route-picker__add-icon {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: rgba($color-primary, 0.12);
  color: $color-primary;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
}

.route-picker__selected-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 6px;
  border-bottom: 1px solid rgba($color-primary, 0.12);
}

.route-picker__step {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
}

.route-picker__selected-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.route-picker__selected-name {
  font-size: 0.86rem;
  font-weight: 600;
  color: #101828;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.route-picker__selected-meta {
  font-size: 0.76rem;
  color: #667085;
}

.route-picker__selected-actions {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
}

.route-picker__move-btn,
.route-picker__remove-btn {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  background: #fff;
  color: #475467;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover:not(:disabled) {
    background: #f6f8fa;
    border-color: #c4c9d1;
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.route-picker__remove-btn {
  color: #b42318;
  border-color: rgba(#b42318, 0.25);

  &:hover:not(:disabled) {
    background: #fef3f2;
  }
}

@media (max-width: 720px) {
  .route-picker__grid {
    grid-template-columns: 1fr;
  }

  .route-picker__panel {
    max-height: 240px;
  }
}
</style>
