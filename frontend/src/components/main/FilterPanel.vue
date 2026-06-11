<template>
  <!-- ListView: раскрываемая панель -->
  <template v-if="isListLayout">
    <div v-if="!isMobile" class="filter-panel layout-horizontal filter-panel--list">
      <div class="filter-panel-list__toolbar">
        <button
          :aria-expanded="listExpanded"
          :class="{ 'filter-trigger-btn--active': activeFiltersCount > 0 }"
          class="filter-trigger-btn"
          type="button"
          @click="listExpanded = !listExpanded"
        >
          <i aria-hidden="true" class="bi bi-funnel filter-trigger-btn__icon"></i>
          <span class="filter-trigger-btn__label">Фильтры</span>
          <span v-if="activeFiltersCount" class="filter-trigger-btn__badge">{{
            activeFiltersCount
          }}</span>
          <span
            :class="{ 'filter-trigger-btn__chevron--up': listExpanded }"
            aria-hidden="true"
            class="filter-trigger-btn__chevron"
            >▾</span
          >
        </button>

        <div class="filter-panel-list__chips">
          <FilterFields
            :districts="districts"
            :filters="store.filters"
            :region-district-pairs="regionDistrictPairs"
            :regions="regions"
            :types="types"
            chips-only
            @update:filters="store.setFilters"
          />
        </div>

        <button
          v-if="activeFiltersCount"
          class="filter-panel__reset filter-panel-list__reset"
          type="button"
          @click="resetAll"
        >
          Сбросить все
        </button>

        <ListSortSelect
          v-if="sortValue != null"
          :model-value="sortValue"
          class="filter-panel-list__sort"
          @update:model-value="$emit('sort-change', $event)"
        />
      </div>

      <div v-show="listExpanded" class="filter-panel__scroll filter-panel-list__body">
        <FilterFields
          :districts="districts"
          :filters="store.filters"
          :region-district-pairs="regionDistrictPairs"
          :regions="regions"
          :types="types"
          hide-chips
          layout="list"
          @update:filters="store.setFilters"
        />
      </div>
    </div>

    <div v-if="isMobile" class="filter-panel-list__mobile-bar">
      <button
        class="mobile-trigger-btn mobile-trigger-btn--list-inline app-btn app-btn--primary"
        type="button"
        @click="mobileOpen = true"
      >
        <i aria-hidden="true" class="bi bi-funnel mobile-trigger-btn__icon"></i>
        Фильтры
        <span v-if="activeFiltersCount" class="badge">{{ activeFiltersCount }}</span>
      </button>

      <ListSortSelect
        v-if="sortValue != null"
        :model-value="sortValue"
        class="filter-panel-list__sort filter-panel-list__sort--page"
        show-label
        @update:model-value="$emit('sort-change', $event)"
      />
    </div>

    <div
      v-if="isMobile && activeFiltersCount"
      class="filter-panel-list__chips filter-panel-list__chips--page"
    >
      <FilterFields
        :districts="districts"
        :filters="store.filters"
        :region-district-pairs="regionDistrictPairs"
        :regions="regions"
        :types="types"
        chips-only
        @update:filters="store.setFilters"
      />
    </div>

    <Teleport to="body">
      <div v-if="isMobile && mobileOpen" class="mobile-filters-overlay" @click.self="closeMobile">
        <div class="mobile-filters-content card-surface" @click.stop>
          <div class="filter-panel__header filter-panel__header--mobile">
            <h3 class="filter-panel__title">Фильтры</h3>
            <button
              v-if="activeFiltersCount"
              class="filter-panel__reset"
              type="button"
              @click="resetAll"
            >
              Сбросить все
            </button>
            <button class="close-btn app-btn app-btn--ghost" type="button" @click="closeMobile">
              <i aria-hidden="true" class="bi bi-x-lg"></i>
            </button>
          </div>

          <div
            v-if="activeFiltersCount"
            class="filter-panel-list__chips filter-panel-list__chips--sheet"
          >
            <FilterFields
              :districts="districts"
              :filters="store.filters"
              :region-district-pairs="regionDistrictPairs"
              :regions="regions"
              :types="types"
              chips-only
              @update:filters="store.setFilters"
            />
          </div>

          <div class="filter-panel__scroll filter-panel__scroll--sheet">
            <FilterFields
              :districts="districts"
              :filters="store.filters"
              :region-district-pairs="regionDistrictPairs"
              :regions="regions"
              :types="types"
              hide-chips
              layout="sidebar"
              @update:filters="store.setFilters"
            />
          </div>

          <footer class="filter-panel__footer filter-panel__footer--sheet">
            <button
              class="filter-panel__apply app-btn app-btn--primary"
              type="button"
              @click="closeMobile"
            >
              Показать результаты
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </template>

  <!-- Карта: боковая панель -->
  <template v-else>
    <!-- MOBILE BUTTON -->
    <button
      v-if="isMobile"
      class="mobile-trigger-btn app-btn app-btn--primary"
      type="button"
      @click="mobileOpen = true"
    >
      Фильтры
      <span v-if="activeFiltersCount" class="badge">{{ activeFiltersCount }}</span>
    </button>

    <!-- DESKTOP: toggle when collapsed -->
    <button
      v-if="!isMobile && !panelVisible && layout === 'sidebar'"
      :class="{ 'filter-trigger-btn--active': activeFiltersCount > 0 }"
      aria-label="Открыть фильтры"
      class="filter-trigger-btn filter-trigger-btn--map"
      type="button"
      @click="panelVisible = true"
    >
      <i aria-hidden="true" class="bi bi-funnel filter-trigger-btn__icon"></i>
      <span class="filter-trigger-btn__label">Фильтры</span>
      <span v-if="activeFiltersCount" class="filter-trigger-btn__badge">{{
        activeFiltersCount
      }}</span>
    </button>

    <!-- DESKTOP -->
    <aside
      v-show="!isMobile && (layout !== 'sidebar' || panelVisible)"
      :class="['filter-panel', 'card-surface', layoutClass]"
    >
      <div v-if="layout === 'sidebar'" class="filter-panel__header">
        <h3 class="filter-panel__title">Фильтры</h3>
        <button
          v-if="activeFiltersCount"
          class="filter-panel__reset"
          type="button"
          @click="resetAll"
        >
          Сбросить все
        </button>
        <button
          aria-label="Скрыть панель фильтров"
          class="filter-panel__collapse"
          type="button"
          @click="panelVisible = false"
        >
          ‹
        </button>
      </div>

      <div v-else class="filter-header">
        <h3 class="filter-panel__title filter-panel__title--plain">Фильтры</h3>
        <button
          v-if="activeFiltersCount"
          class="reset-btn app-btn app-btn--ghost"
          type="button"
          @click="resetAll"
        >
          Сбросить
        </button>
      </div>

      <div class="filter-panel__scroll">
        <FilterFields
          :districts="districts"
          :filters="store.filters"
          :layout="layout"
          :region-district-pairs="regionDistrictPairs"
          :regions="regions"
          :types="types"
          @update:filters="store.setFilters"
        />
      </div>

      <footer v-if="layout === 'sidebar'" class="filter-panel__footer">
        <p class="filter-panel__count">{{ objectsCountLabel }}</p>
      </footer>
    </aside>

    <!-- MOBILE -->
    <Teleport to="body">
      <div
        v-if="isMobile && mobileOpen"
        class="mobile-filters-overlay"
        @click.self="mobileOpen = false"
      >
        <div class="mobile-filters-content card-surface">
          <div class="filter-panel__header filter-panel__header--mobile">
            <h3 class="filter-panel__title">Фильтры</h3>
            <button
              v-if="activeFiltersCount"
              class="filter-panel__reset"
              type="button"
              @click="resetAll"
            >
              Сбросить все
            </button>
            <button
              class="close-btn app-btn app-btn--ghost"
              type="button"
              @click="mobileOpen = false"
            >
              <i aria-hidden="true" class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="filter-panel__scroll">
            <FilterFields
              :districts="districts"
              :filters="store.filters"
              :layout="layout"
              :region-district-pairs="regionDistrictPairs"
              :regions="regions"
              :types="types"
              @update:filters="store.setFilters"
            />
          </div>

          <footer class="filter-panel__footer">
            <button
              class="filter-panel__apply app-btn app-btn--primary"
              type="button"
              @click="onApply"
            >
              Применить фильтры
            </button>
            <p class="filter-panel__count">{{ objectsCountLabel }}</p>
          </footer>
        </div>
      </div>
    </Teleport>
  </template>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import FilterFields from './FilterFields.vue'
import ListSortSelect from './ListSortSelect.vue'
import { useReservesStore } from '@/stores/reserves'
import { storeToRefs } from 'pinia'

const props = defineProps({
  layout: { type: String, default: 'sidebar' },
  sortValue: { type: String, default: null },
})

defineEmits(['sort-change'])

const isListLayout = computed(() => props.layout === 'list' || props.layout === 'horizontal')

const store = useReservesStore()
const { types, regions, districts, regionDistrictPairs, allReserves } = storeToRefs(store)

const isMobile = ref(false)
const mobileOpen = ref(false)
const panelVisible = ref(true)
const listExpanded = ref(true)

const handleResize = () => {
  const w = window.innerWidth
  isMobile.value = isListLayout.value ? w < 768 : w < 992
  if (!isMobile.value) mobileOpen.value = false
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.body.style.overflow = ''
})

const layoutClass = computed(() =>
  props.layout === 'sidebar' ? 'layout-sidebar' : 'layout-horizontal',
)

const activeFiltersCount = computed(() => {
  const { type, region, district, search, status_text: statusText } = store.filters
  let count = 0
  if (typeof search === 'string' && search.trim()) count++
  if (Array.isArray(type) && type.length) count += type.length
  if (region) count++
  if (district) count++
  if (typeof statusText === 'string' && statusText.trim()) count++
  return count
})

const objectsCountLabel = computed(() => {
  const n = Array.isArray(allReserves.value) ? allReserves.value.length : 0
  const mod10 = n % 10
  const mod100 = n % 100
  let word = 'объектов'
  if (mod10 === 1 && mod100 !== 11) word = 'объект'
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = 'объекта'
  return `${n} ${word} найдено`
})

const resetAll = () => {
  store.setFilters({
    search: '',
    type: [],
    region: '',
    district: '',
    status_text: '',
  })
}

const closeMobile = () => {
  mobileOpen.value = false
}

watch(mobileOpen, (open) => {
  if (!isMobile.value) return
  document.body.style.overflow = open ? 'hidden' : ''
})

const onApply = async () => {
  await store.fetchAllForMap()
  mobileOpen.value = false
}
</script>

<style lang="scss" scoped>
.mobile-trigger-btn {
  position: fixed;
  bottom: 14px;
  left: 14px;
  z-index: 998;
  display: flex;
  align-items: center;
  gap: 8px;

  &--list-inline {
    position: static;
    z-index: auto;
    flex: 1;
    width: auto;
    min-width: 0;
    margin: 0;
    justify-content: center;
    padding: 11px 12px;
    border-radius: 12px;
  }
}

.filter-panel-list__mobile-bar {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.mobile-trigger-btn__icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.badge {
  background: #ff4757;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.filter-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid #e6e7e9;
  border-radius: 10px;
  background: $color-surface;
  color: $color-primary-dark;
  font-weight: 600;
  font-size: 0.88rem;
  line-height: 1.2;
  cursor: pointer;
  box-shadow: $shadow;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: $color-light;
    border-color: rgba($color-primary, 0.35);
  }

  &--active {
    border-color: rgba($color-primary, 0.45);
    background: #f3fbf6;
    box-shadow:
      $shadow,
      0 0 0 1px rgba($color-primary, 0.12);
  }

  &--map {
    position: absolute;
    left: 12px;
    top: 12px;
    z-index: 600;
  }
}

.filter-trigger-btn__icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: $color-primary;
}

.filter-trigger-btn__label {
  white-space: nowrap;
}

.filter-trigger-btn__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 5px;
  border-radius: 999px;
  background: #ff4757;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
}

.filter-trigger-btn__chevron {
  font-size: 0.7rem;
  color: #667085;
  transition: transform 0.2s ease;
  line-height: 1;
}

.filter-trigger-btn__chevron--up {
  transform: rotate(180deg);
}

.filter-panel {
  display: flex;
  flex-direction: column;
  z-index: 600;
  overflow: hidden;

  &.layout-horizontal {
    overflow: visible;
    box-shadow: none;
    border: none;
    background: transparent;
    padding: 0;
  }
}

.filter-panel.layout-sidebar {
  position: absolute;
  left: 12px;
  top: 12px;
  bottom: 12px;
  width: min(330px, calc(100% - 24px));
  max-height: calc(100% - 24px);
  border-radius: 14px;
  padding: 0;
}

.filter-panel.layout-horizontal {
  width: 100%;
  padding: 0;
  position: static;
}

.filter-panel.layout-horizontal .filter-panel__scroll {
  overflow: visible;
  padding: 0;
}

.filter-panel.layout-horizontal .filter-header {
  display: none;
}

.filter-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 14px 10px;
  flex-shrink: 0;
  border-bottom: 1px solid #eef0f2;

  &--mobile {
    flex-wrap: wrap;
  }
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.filter-panel__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: $color-darker;
  flex: 1;

  &--plain {
    padding-left: 0;

    &::before {
      display: none;
    }
  }
}

.filter-panel__reset {
  border: none;
  background: none;
  color: $color-primary;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 6px;
  white-space: nowrap;
  transition: $transition;

  &:hover {
    color: $color-primary-dark;
  }
}

.filter-panel__collapse {
  border: none;
  background: $color-gray-light;
  color: $color-text-light;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  flex-shrink: 0;
  transition: $transition;

  &:hover {
    background: #e8eaed;
    color: $color-darker;
  }
}

.filter-panel__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px;
}

.filter-panel__footer {
  flex-shrink: 0;
  padding: 12px 14px 14px;
  border-top: 1px solid #eef0f2;
}

.filter-panel__apply {
  width: 100%;
  border-radius: 10px;
  padding: 12px 16px;
}

.filter-panel__count {
  text-align: center;
  font-size: 0.95rem;
  color: $color-primary;
  font-weight: 700;
}

.reset-btn {
  padding: 6px 10px;
  font-size: 0.9rem;
}

/* MOBILE */
.mobile-filters-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  overscroll-behavior: none;
}

.mobile-filters-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: min(88vh, 100dvh);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px 20px 0 0;
  z-index: 10000;
}

.filter-panel__scroll--sheet {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

.filter-panel__footer--sheet {
  flex-shrink: 0;
  padding-top: 10px;
}

.filter-panel.layout-horizontal :deep(.filter-fields:not(.filter-fields--chips-only)) {
  margin-top: 15px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px 14px;
  align-items: start;
}

.filter-panel.layout-horizontal
  :deep(.filter-fields:not(.filter-fields--chips-only) .filter-section--nearby) {
  min-width: 0;
}

/* List layout: верхняя строка */
.filter-panel--list .filter-panel-list__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
}

.filter-panel-list__chips {
  flex: 1 1 160px;
  min-width: 0;

  &--page {
    margin: 0;
  }

  &--sheet {
    flex-shrink: 0;
    padding: 0 16px 4px;
    max-height: 108px;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}

.filter-panel-list__chips--page :deep(.type-chips),
.filter-panel-list__chips--sheet :deep(.type-chips) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.filter-panel--list .filter-panel-list__chips :deep(.filter-fields--chips-only) {
  display: block;
  width: 100%;
}

.filter-panel--list .filter-panel-list__chips :deep(.type-chips) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.filter-panel-list__reset {
  flex-shrink: 0;
  white-space: nowrap;
}

.filter-panel-list__sort {
  margin-left: auto;
  min-width: 200px;
  max-width: 240px;
  flex-shrink: 0;
}

.filter-panel-list__sort--page {
  flex: 1;
  min-width: 0;
  max-width: none;
  margin: 0;
}

@media (max-width: 420px) {
  .filter-panel-list__mobile-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .mobile-trigger-btn--list-inline,
  .filter-panel-list__sort--page {
    flex: none;
    width: 100%;
  }
}

.filter-panel-list__body {
  margin-top: 14px;
  padding-top: 16px;
  padding-left: 0;
  padding-right: 0;
  border-top: 1px solid #eef0f2;
}

.filter-panel--list.filter-panel.layout-horizontal .filter-panel-list__body.filter-panel__scroll {
  padding-left: 0;
  padding-right: 0;
}

@media (max-width: 1200px) {
  .filter-panel.layout-horizontal :deep(.filter-fields:not(.filter-fields--chips-only)) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .filter-panel.layout-horizontal :deep(.filter-fields:not(.filter-fields--chips-only)) {
    grid-template-columns: 1fr;
  }
}
</style>
