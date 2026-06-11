<template>
  <div :class="['filter-fields', layoutClass, { 'filter-fields--chips-only': chipsOnly }]">
    <template v-if="!chipsOnly">
      <section class="filter-section">
        <h4 class="filter-section__title">Тип объекта</h4>
        <div ref="typeDropdownRef" class="type-select-wrap">
          <button class="type-trigger app-input" type="button" @click="toggleTypeDropdown">
            <span class="type-trigger__label">
              {{ selectedTypes.length ? `Выбрано типов: ${selectedTypes.length}` : 'Все' }}
            </span>
            <span
              :class="{ 'type-trigger__arrow--open': typeDropdownOpen }"
              class="type-trigger__arrow"
              >▾</span
            >
          </button>

          <div v-if="typeDropdownOpen" class="type-dropdown type-dropdown--types card-surface">
            <label
              v-for="item in normalizedTypes"
              :key="item.raw"
              :class="{ 'type-option--active': selectedTypeValues.includes(item.raw) }"
              class="type-option"
            >
              <input
                :checked="selectedTypeValues.includes(item.raw)"
                type="checkbox"
                @change="toggleType(item.raw)"
              />
              <span :style="{ backgroundColor: item.color }" class="type-option__dot"></span>
              <span class="type-option__label">{{ item.label }}</span>
              <span
                v-if="selectedTypeValues.includes(item.raw)"
                aria-hidden="true"
                class="type-option__check"
              >
                ✓
              </span>
            </label>
          </div>
        </div>
      </section>

      <section class="filter-section">
        <h4 class="filter-section__title">Области</h4>
        <div ref="regionDropdownRef" class="type-select-wrap">
          <button class="type-trigger app-input" type="button" @click="toggleRegionDropdown">
            <span class="type-trigger__label">{{ filters.region || 'Все области' }}</span>
            <span :class="{ 'type-trigger__arrow--open': regionOpen }" class="type-trigger__arrow"
              >▾</span
            >
          </button>
          <div v-if="regionOpen" class="type-dropdown card-surface">
            <div
              :class="{ 'type-option--active': isRegionSelected('') }"
              class="type-option"
              @click="selectRegion('')"
            >
              <span class="type-option__label">Все области</span>
              <span v-if="isRegionSelected('')" aria-hidden="true" class="type-option__check"
                >✓</span
              >
            </div>
            <div
              v-for="r in regions"
              :key="r"
              :class="{ 'type-option--active': isRegionSelected(r) }"
              class="type-option"
              @click="selectRegion(r)"
            >
              <span class="type-option__label">{{ r }}</span>
              <span v-if="isRegionSelected(r)" aria-hidden="true" class="type-option__check"
                >✓</span
              >
            </div>
          </div>
        </div>
      </section>

      <section class="filter-section">
        <h4 class="filter-section__title">Район</h4>
        <div ref="districtDropdownRef" class="type-select-wrap">
          <button class="type-trigger app-input" type="button" @click="toggleDistrictDropdown">
            <span class="type-trigger__label">{{ filters.district || 'Все районы' }}</span>
            <span :class="{ 'type-trigger__arrow--open': districtOpen }" class="type-trigger__arrow"
              >▾</span
            >
          </button>
          <div v-if="districtOpen" class="type-dropdown card-surface">
            <div
              :class="{ 'type-option--active': isDistrictSelected('') }"
              class="type-option"
              @click="selectDistrict('')"
            >
              <span class="type-option__label">Все районы</span>
              <span v-if="isDistrictSelected('')" aria-hidden="true" class="type-option__check"
                >✓</span
              >
            </div>
            <template v-for="group in districtGroups" :key="group.regionKey">
              <div v-if="group.showHeader" class="district-group__header">
                {{ group.regionTitle }}
              </div>
              <div
                v-for="d in group.districts"
                :key="`${group.regionKey}::${d}`"
                :class="{ 'type-option--active': isDistrictSelected(d) }"
                class="type-option district-group__item"
                @click="selectDistrict(d)"
              >
                <span class="type-option__label">{{ d }}</span>
                <span v-if="isDistrictSelected(d)" aria-hidden="true" class="type-option__check"
                  >✓</span
                >
              </div>
            </template>
          </div>
        </div>
      </section>

      <section class="filter-section">
        <h4 class="filter-section__title">Статус объекта</h4>
        <div ref="statusDropdownRef" class="type-select-wrap">
          <button class="type-trigger app-input" type="button" @click="toggleStatusDropdown">
            <span class="type-trigger__label">{{ statusTriggerLabel }}</span>
            <span :class="{ 'type-trigger__arrow--open': statusOpen }" class="type-trigger__arrow"
              >▾</span
            >
          </button>
          <div v-if="statusOpen" class="type-dropdown card-surface">
            <div
              :class="{ 'type-option--active': isStatusSelected('') }"
              class="type-option"
              @click="selectStatus('')"
            >
              <span class="type-option__label">Все статусы</span>
              <span v-if="isStatusSelected('')" aria-hidden="true" class="type-option__check"
                >✓</span
              >
            </div>
            <div
              v-for="opt in statusFilterOptions"
              :key="opt.value"
              :class="{ 'type-option--active': isStatusSelected(opt.value) }"
              class="type-option"
              @click="selectStatus(opt.value)"
            >
              <span class="type-option__label">{{ opt.label }}</span>
              <span
                v-if="isStatusSelected(opt.value)"
                aria-hidden="true"
                class="type-option__check"
              >
                ✓
              </span>
            </div>
          </div>
        </div>
      </section>
    </template>

    <div v-if="(chipsOnly || !hideChips) && activeChips.length" class="type-chips">
      <button
        v-for="chip in activeChips"
        :key="chip.key"
        class="type-chip"
        @click="removeChip(chip)"
      >
        <span
          v-if="chip.kind === 'type'"
          :style="{ backgroundColor: chip.color }"
          aria-hidden="true"
          class="chip-dot"
        />
        <span
          v-else-if="chip.kind === 'region' || chip.kind === 'district'"
          aria-hidden="true"
          class="chip-marker"
        >
          <i class="bi bi-geo-alt-fill"></i>
        </span>
        <span v-else-if="chip.kind === 'search'" aria-hidden="true" class="chip-marker">
          <i class="bi bi-search"></i>
        </span>
        {{ chip.label }}
        <span aria-hidden="true" class="chip-remove">×</span>
      </button>
    </div>

    <section v-if="!chipsOnly" class="filter-section filter-section--nearby">
      <div
        ref="nearbyPanelRef"
        :class="{ 'nearby-wrap--dropdown-open': nearbyRadiusOpen && nearby.enabled }"
        class="nearby-wrap"
      >
        <div :class="{ 'nearby-bar--on': nearby.enabled }" class="nearby-bar">
          <span aria-hidden="true" class="nearby-bar__icon-wrap">
            <i aria-hidden="true" class="bi bi-person-raised-hand nearby-bar__icon"></i>
          </span>

          <div class="nearby-bar__center">
            <span class="nearby-bar__title">Рядом со мной</span>
            <button
              v-if="nearby.enabled"
              :aria-expanded="nearbyRadiusOpen"
              aria-haspopup="listbox"
              class="nearby-bar__radius"
              type="button"
              @click.stop="toggleNearbyRadiusDropdown"
            >
              <span class="nearby-bar__radius-value">{{ activeRadiusLabel }}</span>
              <span
                :class="{ 'nearby-bar__chevron--open': nearbyRadiusOpen }"
                aria-hidden="true"
                class="nearby-bar__chevron"
                >▾</span
              >
            </button>
          </div>

          <button
            :aria-checked="nearby.enabled"
            :aria-label="
              nearby.enabled ? 'Выключить фильтр рядом со мной' : 'Включить фильтр рядом со мной'
            "
            class="nearby-bar__toggle"
            role="switch"
            type="button"
            @click="toggleNearby"
          >
            <span class="nearby-bar__toggle-track">
              <span class="nearby-bar__toggle-thumb" />
            </span>
          </button>
        </div>

        <div
          v-if="nearby.enabled && nearbyRadiusOpen"
          aria-label="Пресеты радиуса"
          class="nearby-dropdown card-surface"
          role="listbox"
        >
          <div class="nearby-dropdown__head">
            <span class="nearby-dropdown__head-title">Выберите радиус</span>
            <button
              aria-label="Закрыть список радиусов"
              class="nearby-dropdown__close"
              type="button"
              @click="closeNearbyRadiusDropdown"
            >
              ×
            </button>
          </div>
          <ul class="nearby-dropdown__list">
            <li v-for="radius in radiusPresets" :key="radius">
              <button
                :aria-selected="isPresetSelected(radius)"
                :class="{ 'nearby-dropdown__option--active': isPresetSelected(radius) }"
                class="nearby-dropdown__option"
                role="option"
                type="button"
                @click="selectNearbyPreset(radius)"
              >
                <span>{{ radius }} км</span>
                <span
                  v-if="isPresetSelected(radius)"
                  aria-hidden="true"
                  class="nearby-dropdown__check"
                >
                  <svg
                    fill="none"
                    height="18"
                    viewBox="0 0 24 24"
                    width="18"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2.2"
                    />
                  </svg>
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { getTypeConfig } from '@/config/reserveTypes'
import { RESERVE_STATUS_OPTIONS } from '@/config/reserveStatuses'
import { useReservesStore } from '@/stores/reserves'
import { useUiStore } from '@/stores/ui'

const props = defineProps({
  filters: Object,
  types: Array,
  regions: Array,
  districts: Array,
  regionDistrictPairs: { type: Array, default: () => [] },
  layout: { type: String, default: 'sidebar' },
  chipsOnly: { type: Boolean, default: false },
  hideChips: { type: Boolean, default: false },
})

const emit = defineEmits(['update:filters'])
const store = useReservesStore()
const ui = useUiStore()

const layoutClass = computed(() =>
  props.layout === 'horizontal' || props.layout === 'list'
    ? 'filter-fields--horizontal'
    : 'filter-fields--sidebar',
)
const radiusPresets = [1, 3, 5, 10, 25, 50]

const statusFilterOptions = RESERVE_STATUS_OPTIONS

const regionOpen = ref(false)
const districtOpen = ref(false)
const statusOpen = ref(false)
const regionDropdownRef = ref(null)
const districtDropdownRef = ref(null)
const statusDropdownRef = ref(null)
const typeDropdownRef = ref(null)
const typeDropdownOpen = ref(false)
const nearbyPanelRef = ref(null)
const nearbyRadiusOpen = ref(false)

watch(
  () => store.nearby.enabled,
  (enabled) => {
    if (!enabled) nearbyRadiusOpen.value = false
  },
)

/** Районы по областям (подзаголовок + список); при выбранной области — одна группа. */
const districtGroups = computed(() => {
  const pairs = props.regionDistrictPairs || []
  const apiSet = new Set(
    (props.districts || [])
      .filter((d) => d != null && String(d).trim() !== '')
      .map((d) => String(d)),
  )
  const sel = typeof props.filters?.region === 'string' ? props.filters.region.trim() : ''

  const districtsForRegion = (regionName) => {
    const out = []
    const seen = new Set()
    for (const p of pairs) {
      if (p.region !== regionName || !apiSet.has(p.district)) continue
      if (seen.has(p.district)) continue
      seen.add(p.district)
      out.push(p.district)
    }
    out.sort((a, b) => String(a).localeCompare(String(b), 'ru'))
    return out
  }

  const makeGroup = (regionKey, regionTitle, districts, showHeader) => ({
    regionKey,
    regionTitle,
    districts,
    showHeader,
  })

  if (!pairs.length) {
    const flat = [...apiSet].sort((a, b) => String(a).localeCompare(String(b), 'ru'))
    return flat.length ? [makeGroup('_flat', '', flat, false)] : []
  }

  if (sel) {
    const list = districtsForRegion(sel)
    return list.length ? [makeGroup(sel, sel, list, true)] : []
  }

  const regionsWithData = new Set()
  for (const p of pairs) {
    if (apiSet.has(p.district)) regionsWithData.add(p.region)
  }

  const ordered = [
    ...(props.regions || []).filter((r) => regionsWithData.has(r)),
    ...[...regionsWithData]
      .filter((r) => !(props.regions || []).includes(r))
      .sort((a, b) => String(a).localeCompare(String(b), 'ru')),
  ]

  return ordered
    .map((region) => {
      const districts = districtsForRegion(region)
      return makeGroup(region, region, districts, true)
    })
    .filter((g) => g.districts.length > 0)
})

function emitFilters(next) {
  emit('update:filters', next)
}

const statusTriggerLabel = computed(() => {
  const v =
    typeof props.filters?.status_text === 'string'
      ? props.filters.status_text.trim().toLowerCase()
      : ''
  const found = RESERVE_STATUS_OPTIONS.find((o) => o.value === v)
  return found ? found.label : 'Все статусы'
})

function isRegionSelected(value) {
  const current = props.filters?.region ? String(props.filters.region).trim() : ''
  const target = value == null ? '' : String(value).trim()
  return current === target
}

function isDistrictSelected(value) {
  const current = props.filters?.district ? String(props.filters.district).trim() : ''
  const target = value == null ? '' : String(value).trim()
  return current === target
}

function isStatusSelected(value) {
  const current =
    typeof props.filters?.status_text === 'string'
      ? props.filters.status_text.trim().toLowerCase()
      : ''
  const target = value == null ? '' : String(value).trim().toLowerCase()
  return current === target
}

function selectStatus(value) {
  const status_text = value == null ? '' : String(value).trim().toLowerCase()
  emitFilters({ ...props.filters, status_text })
  statusOpen.value = false
  typeDropdownOpen.value = false
  regionOpen.value = false
  districtOpen.value = false
  nearbyRadiusOpen.value = false
}

function selectRegion(value) {
  const region = value == null ? '' : String(value).trim()
  const next = { ...props.filters, region }
  if (region && props.filters?.district) {
    const ok = (props.regionDistrictPairs || []).some(
      (p) => p.region === region && p.district === props.filters.district,
    )
    if (!ok) next.district = ''
  }
  emitFilters(next)
  regionOpen.value = false
  districtOpen.value = false
  statusOpen.value = false
  nearbyRadiusOpen.value = false
}

function selectDistrict(district) {
  const d = district == null ? '' : String(district).trim()
  const next = { ...props.filters }
  if (!d) {
    next.district = ''
    emitFilters(next)
    districtOpen.value = false
    regionOpen.value = false
    statusOpen.value = false
    nearbyRadiusOpen.value = false
    return
  }
  const pairs = props.regionDistrictPairs || []
  const reg = typeof props.filters?.region === 'string' ? props.filters.region.trim() : ''
  const candidates = pairs.filter((p) => p.district === d && (!reg || p.region === reg))
  const pick = candidates[0] || pairs.find((p) => p.district === d)
  next.district = d
  if (pick) next.region = pick.region
  emitFilters(next)
  districtOpen.value = false
  regionOpen.value = false
  statusOpen.value = false
  nearbyRadiusOpen.value = false
}

const update = (key, value) => {
  emit('update:filters', {
    ...props.filters,
    [key]: value,
  })
}

const normalizedTypes = computed(() =>
  (props.types || []).map((type) => {
    const config = getTypeConfig(type)
    return {
      raw: type,
      label: config.label || type,
      color: config.color || '#757575',
    }
  }),
)

const selectedTypeValues = computed(() =>
  Array.isArray(props.filters?.type)
    ? props.filters.type
    : props.filters?.type
      ? [props.filters.type]
      : [],
)

const selectedTypes = computed(() =>
  normalizedTypes.value.filter((item) => selectedTypeValues.value.includes(item.raw)),
)

const activeChips = computed(() => {
  const chips = selectedTypes.value.map((item) => ({
    key: `type:${item.raw}`,
    kind: 'type',
    value: item.raw,
    label: item.label,
    color: item.color,
  }))

  const searchRaw = typeof props.filters?.search === 'string' ? props.filters.search.trim() : ''
  if (searchRaw) {
    const short = searchRaw.length > 44 ? `${searchRaw.slice(0, 42)}…` : searchRaw
    chips.unshift({
      key: 'search:active',
      kind: 'search',
      value: searchRaw,
      label: `Поиск: ${short}`,
    })
  }

  if (props.filters?.region) {
    chips.push({
      key: `region:${props.filters.region}`,
      kind: 'region',
      value: props.filters.region,
      label: `Область: ${props.filters.region}`,
    })
  }
  if (props.filters?.district) {
    const reg = props.filters?.region
    const pairs = props.regionDistrictPairs || []
    const pick =
      pairs.find((p) => p.district === props.filters.district && (!reg || p.region === reg)) ||
      pairs.find((p) => p.district === props.filters.district)
    const hint = pick?.region || ''
    const districtLabel = hint ? `${props.filters.district} (${hint})` : props.filters.district
    chips.push({
      key: `district:${props.filters.district}`,
      kind: 'district',
      value: props.filters.district,
      label: `Район: ${districtLabel}`,
    })
  }

  const stRaw =
    typeof props.filters?.status_text === 'string' ? props.filters.status_text.trim() : ''
  const st = stRaw.toLowerCase()
  if (st) {
    const opt = RESERVE_STATUS_OPTIONS.find((o) => o.value === st)
    chips.push({
      key: `status_text:${st}`,
      kind: 'status_text',
      value: st,
      label: `Статус: ${opt?.label || stRaw}`,
    })
  }
  return chips
})

const nearby = computed(() => store.nearby)

const activeRadiusLabel = computed(() => {
  const km = store.getActiveNearbyRadius()
  const rounded = Math.abs(km - Math.round(km)) < 0.001 ? Math.round(km) : Math.round(km * 10) / 10
  return `${rounded} км`
})

function isPresetSelected(radius) {
  const n = store.nearby
  return !!(n.enabled && !n.useCustomRadius && Number(n.radiusKm) === radius)
}

watch(
  () => store.nearby.error,
  (msg) => {
    if (msg) ui.showToast(msg)
  },
)

function toggleTypeDropdown() {
  nearbyRadiusOpen.value = false
  regionOpen.value = false
  districtOpen.value = false
  statusOpen.value = false
  typeDropdownOpen.value = !typeDropdownOpen.value
}

function toggleRegionDropdown() {
  nearbyRadiusOpen.value = false
  typeDropdownOpen.value = false
  statusOpen.value = false
  districtOpen.value = false
  regionOpen.value = !regionOpen.value
}

function toggleDistrictDropdown() {
  nearbyRadiusOpen.value = false
  typeDropdownOpen.value = false
  regionOpen.value = false
  statusOpen.value = false
  districtOpen.value = !districtOpen.value
}

function toggleStatusDropdown() {
  nearbyRadiusOpen.value = false
  typeDropdownOpen.value = false
  regionOpen.value = false
  districtOpen.value = false
  statusOpen.value = !statusOpen.value
}

function toggleNearbyRadiusDropdown() {
  if (!store.nearby.enabled) return
  typeDropdownOpen.value = false
  regionOpen.value = false
  districtOpen.value = false
  statusOpen.value = false
  nearbyRadiusOpen.value = !nearbyRadiusOpen.value
}

function closeNearbyRadiusDropdown() {
  nearbyRadiusOpen.value = false
}

function selectNearbyPreset(radius) {
  setPresetRadius(radius)
  closeNearbyRadiusDropdown()
}

function toggleType(typeRaw) {
  if (selectedTypeValues.value.includes(typeRaw)) {
    update(
      'type',
      selectedTypeValues.value.filter((value) => value !== typeRaw),
    )
  } else {
    update('type', [...selectedTypeValues.value, typeRaw])
  }
}

function removeType(typeRaw) {
  const next = selectedTypeValues.value.filter((value) => value !== typeRaw)
  update('type', next)
}

function removeChip(chip) {
  if (chip.kind === 'type') {
    removeType(chip.value)
    return
  }
  if (chip.kind === 'search') {
    update('search', '')
    return
  }
  if (chip.kind === 'region') {
    update('region', '')
    return
  }
  if (chip.kind === 'district') {
    update('district', '')
    return
  }
  if (chip.kind === 'status_text') {
    update('status_text', '')
  }
}

function onOutsideClick(event) {
  if (!typeDropdownRef.value?.contains(event.target)) typeDropdownOpen.value = false
  if (!regionDropdownRef.value?.contains(event.target)) regionOpen.value = false
  if (!districtDropdownRef.value?.contains(event.target)) districtOpen.value = false
  if (!statusDropdownRef.value?.contains(event.target)) statusOpen.value = false
  if (!nearbyPanelRef.value?.contains(event.target)) nearbyRadiusOpen.value = false
}

async function toggleNearby() {
  if (store.nearby.enabled) {
    nearbyRadiusOpen.value = false
    store.disableNearby()
    return
  }
  await store.enableNearby()
}

function setPresetRadius(radius) {
  store.setNearbyRadius(radius)
}

onMounted(() => {
  document.addEventListener('click', onOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onOutsideClick)
})
</script>

<style scoped>
.filter-fields {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.type-select-wrap {
  position: relative;
  width: 100%;
}

.filter-section__title {
  margin: 0 0 8px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #667085;
}

.filter-select {
  margin: 0;
}

.type-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.type-trigger__label {
  color: #344054;
}

.type-trigger__arrow {
  color: #667085;
  transition: transform 0.2s ease;
}

.type-trigger__arrow--open {
  transform: rotate(180deg);
}

.type-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  width: 100%;
  max-height: 240px;
  overflow-y: auto;
  z-index: 50;
  padding: 6px;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
}

.filter-fields--horizontal {
  overflow: visible;
}

.filter-fields--horizontal .filter-section,
.filter-fields--horizontal .type-select-wrap {
  overflow: visible;
}

.filter-fields--horizontal .type-dropdown {
  z-index: 200;
}

.filter-fields--horizontal .nearby-dropdown {
  z-index: 200;
}

.type-dropdown--types {
  width: max(100%, 280px);
  max-width: min(360px, calc(100vw - 24px));
}

.type-option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #344054;
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.type-option:hover {
  background: #f6f8fa;
}

.type-option--active {
  background: #ecfdf3;
  color: #1f6b42;
  font-weight: 600;
}

.type-option__check {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 0.82rem;
  font-weight: 700;
  color: #2e8b57;
  line-height: 1;
}

.type-option input {
  flex-shrink: 0;
  margin-top: 2px;
  accent-color: #2e8b57;
}

.type-option__dot {
  flex-shrink: 0;
  width: 11px;
  height: 11px;
  min-width: 11px;
  min-height: 11px;
  margin-top: 3px;
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.type-option__label {
  flex: 1;
  min-width: 0;
  line-height: 1.35;
  word-break: break-word;
}

.district-group__header {
  padding: 8px 10px 4px;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #636363;
}

.district-group__item {
  padding-left: 14px;
}

.type-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.filter-section--nearby {
  margin-top: 2px;
}

.nearby-wrap {
  position: relative;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.nearby-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eaecf0;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.07);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.nearby-bar--on {
  border-color: #d0f1dc;
  box-shadow:
    0 4px 18px rgba(46, 139, 87, 0.1),
    0 1px 3px rgba(15, 23, 42, 0.06);
}

.nearby-wrap--dropdown-open .nearby-bar {
  border-bottom-left-radius: 14px;
  border-bottom-right-radius: 14px;
}

.nearby-bar__icon-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ecfdf3;
  color: #2e8b57;
}

.nearby-bar__icon {
  font-size: 20px;
  display: block;
}

.nearby-bar__center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.nearby-bar__title {
  font-size: 0.94rem;
  font-weight: 600;
  color: #101828;
  line-height: 1.2;
}

.nearby-bar__radius {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: #344054;
}

.nearby-bar__radius:hover .nearby-bar__radius-value {
  color: #1f6b42;
}

.nearby-bar__radius:focus-visible {
  outline: 2px solid #2e8b57;
  outline-offset: 2px;
  border-radius: 6px;
}

.nearby-bar__radius-value {
  font-size: 0.82rem;
  font-weight: 600;
  color: #2e8b57;
  transition: color 0.15s ease;
}

.nearby-bar__radius-muted {
  font-size: 0.8rem;
  color: #98a2b3;
  line-height: 1.3;
}

.nearby-bar__chevron {
  font-size: 0.65rem;
  color: #667085;
  transition: transform 0.2s ease;
  line-height: 1;
}

.nearby-bar__chevron--open {
  transform: rotate(-180deg);
}

.nearby-bar__toggle {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.nearby-bar__toggle:focus-visible {
  outline: 2px solid #2e8b57;
  outline-offset: 3px;
  border-radius: 999px;
}

.nearby-bar__toggle-track {
  width: 44px;
  height: 26px;
  border-radius: 999px;
  background: #e4e7ec;
  position: relative;
  transition: background 0.2s ease;
}

.nearby-bar--on .nearby-bar__toggle-track {
  background: #4caf7a;
}

.nearby-bar__toggle-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.18);
  transition: transform 0.2s ease;
}

.nearby-bar--on .nearby-bar__toggle-thumb {
  transform: translateX(18px);
}

.nearby-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 8px);
  z-index: 55;
  padding: 0 0 8px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #eaecf0;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  overflow: hidden;
}

.nearby-dropdown__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 10px;
  border-bottom: 1px solid #f2f4f7;
}

.nearby-dropdown__head-title {
  font-size: 0.84rem;
  font-weight: 600;
  color: #101828;
}

.nearby-dropdown__close {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #667085;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nearby-dropdown__close:hover {
  background: #f6f8fa;
  color: #344054;
}

.nearby-dropdown__list {
  list-style: none;
  margin: 0;
  padding: 6px 8px 4px;
}

.nearby-dropdown__option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  color: #344054;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;
}

.nearby-dropdown__option:hover {
  background: #f9fafb;
}

.nearby-dropdown__option--active {
  background: #ecfdf3;
  color: #1f6b42;
  font-weight: 600;
}

.nearby-dropdown__check {
  flex-shrink: 0;
  color: #2e8b57;
  display: flex;
}

.type-chip {
  border: 1px solid #d0d5dd;
  border-radius: 999px;
  background: #fff;
  color: #475467;
  padding: 6px 10px;
  font-size: 0.82rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.type-chip:hover {
  border-color: #2e8b57;
  background: #edf7f1;
}

.chip-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.chip-marker {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: #667085;
}

.chip-remove {
  margin-left: 2px;
  color: #667085;
  font-size: 0.95rem;
}

.filter-fields--horizontal .type-trigger.app-input {
  padding: 10px 12px;
  font-size: 0.88rem;
}

.filter-fields--chips-only {
  display: contents;
}
</style>
