<template>
  <component
    :is="variant === 'embedded' ? 'section' : 'aside'"
    :class="panelClasses"
    :aria-label="variant === 'overlay' ? 'Пошаговый маршрут' : undefined"
  >
    <header v-if="showHeader" class="route-dir__head">
      <p v-if="summary" class="route-dir__summary">
        <span v-if="summary.distance" class="route-dir__metric">
          <i aria-hidden="true" class="bi bi-signpost-split"></i>
          <strong>{{ summary.distance }}</strong>
        </span>
        <span v-if="summary.duration" class="route-dir__metric">
          <i aria-hidden="true" class="bi bi-clock"></i>
          <strong>{{ summary.duration }}</strong>
        </span>
      </p>
      <h2 v-else-if="embeddedTitle" class="route-dir__embedded-title">
        {{ embeddedTitle }}
        <span v-if="steps.length" class="route-dir__count">{{ steps.length }}</span>
      </h2>
      <button
        v-if="collapsible"
        :aria-expanded="listVisible ? 'true' : 'false'"
        :aria-label="listVisible ? 'Скрыть пошаговый маршрут' : 'Показать пошаговый маршрут'"
        :title="listVisible ? 'Скрыть пошаговый маршрут' : 'Показать пошаговый маршрут'"
        class="route-dir__toggle"
        type="button"
        @click="listVisible = !listVisible"
      >
        <i
          :class="[
            'bi',
            'bi-chevron-right',
            'route-dir__chevron',
            { 'route-dir__chevron--collapsed': !listVisible },
          ]"
          aria-hidden="true"
        ></i>
      </button>
    </header>

    <div v-if="listVisible" class="route-dir__scroll">
      <div v-if="steps.length" class="route-dir__list-wrap">
        <ol class="route-dir__list" role="list">
          <li v-for="(step, idx) in steps" :key="idx" class="route-dir__item">
            <button
              :disabled="!stepHasCoords(step)"
              :title="
                stepHasCoords(step)
                  ? 'Показать это место на карте'
                  : 'Координаты шага недоступны'
              "
              class="route-dir__step-btn"
              type="button"
              @click="onFocusStep(step)"
            >
              <span aria-hidden="true" class="route-dir__step-index">{{ idx + 1 }}</span>
              <span class="route-dir__step-text">{{ step.instruction }}</span>
              <span v-if="formatLegDistance(step.distance)" class="route-dir__step-dist">
                <i aria-hidden="true" class="bi bi-arrow-right-short"></i>
                {{ formatLegDistance(step.distance) }}
              </span>
            </button>
          </li>
        </ol>
      </div>
      <p v-else class="route-dir__empty">{{ emptyText }}</p>
    </div>

    <footer v-if="footerVisible" class="route-dir__footer">
      <div class="route-dir__footer-bar">
        <div ref="exportWrapRef" class="route-export-wrap">
          <button
            :aria-expanded="exportMenuOpen ? 'true' : 'false'"
            :disabled="!canExport"
            aria-haspopup="menu"
            class="route-export-trigger"
            type="button"
            @click.stop="toggleExportMenu"
          >
            <i aria-hidden="true" class="bi bi-download"></i>
            Экспорт
            <i aria-hidden="true" class="bi bi-chevron-down route-export-trigger__chev"></i>
          </button>
          <div v-if="exportMenuOpen" class="route-export-menu" role="menu" @click.stop>
            <button
              class="route-export-menu__item"
              role="menuitem"
              type="button"
              @click="pickExport('gpx')"
            >
              <i aria-hidden="true" class="bi bi-file-earmark-code"></i>
              GPX
            </button>
            <button
              class="route-export-menu__item"
              role="menuitem"
              type="button"
              @click="pickExport('geojson')"
            >
              <i aria-hidden="true" class="bi bi-braces"></i>
              GeoJSON
            </button>
          </div>
        </div>
        <span class="route-dir__footer-label">
          <i aria-hidden="true" class="bi bi-box-arrow-up-right"></i>
          Открыть в
        </span>
      </div>
      <div aria-label="Открыть в картах" class="route-external-row" role="group">
        <button
          class="route-external-chip route-external-chip--compact"
          title="Яндекс Карты"
          type="button"
          @click="$emit('open-external', 'yandex')"
        >
          <img :src="yandexMapsIcon" alt="" class="route-external-chip__logo" height="18" width="18" />
          <span class="route-external-chip__label">Яндекс</span>
        </button>
        <button
          class="route-external-chip route-external-chip--compact"
          title="Google Карты"
          type="button"
          @click="$emit('open-external', 'google')"
        >
          <img :src="googleMapsIcon" alt="" class="route-external-chip__logo" height="18" width="18" />
          <span class="route-external-chip__label">Google</span>
        </button>
      </div>
    </footer>
  </component>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import googleMapsIcon from '@/assets/icons/google-maps.png'
import yandexMapsIcon from '@/assets/icons/yandex.png'
import {
  buildGpxTrack,
  downloadTextFile,
  extractRoutePointsFromGeoJson,
} from '@/lib/curatedRouteMapDraw.js'
import { formatLegDistance, safeExportBasename, stepHasCoords } from '@/utils/routeFormatters'

const props = defineProps({
  steps: { type: Array, default: () => [] },
  summary: { type: Object, default: null },
  variant: {
    type: String,
    default: 'overlay',
    validator: (v) => ['overlay', 'embedded'].includes(v),
  },
  collapsible: { type: Boolean, default: true },
  collapsed: { type: Boolean, default: false },
  showFooter: { type: Boolean, default: true },
  embeddedTitle: { type: String, default: 'Повороты и указания' },
  emptyText: { type: String, default: 'Нет пошаговых указаний для этого профиля.' },
  routeGeojson: { type: Object, default: null },
  exportName: { type: String, default: 'marshrut' },
  gpxPoints: { type: Array, default: null },
})

const emit = defineEmits(['focus-step', 'open-external'])

const listVisible = ref(!props.collapsed)
const exportMenuOpen = ref(false)
const exportWrapRef = ref(null)

const panelClasses = computed(() => [
  'route-directions',
  `route-directions--${props.variant}`,
  {
    'route-directions--collapsed': props.collapsible && !listVisible.value && props.variant === 'overlay',
  },
])

const showHeader = computed(
  () => Boolean(props.summary) || props.embeddedTitle || props.collapsible,
)

const footerVisible = computed(() => {
  if (!props.showFooter) return false
  if (props.variant === 'embedded' || !props.collapsible) return true
  return listVisible.value
})

const canExport = computed(() => {
  if (Array.isArray(props.gpxPoints) && props.gpxPoints.length > 0) return true
  if (!props.routeGeojson) return false
  return extractRoutePointsFromGeoJson(props.routeGeojson).length > 0
})

watch(
  () => props.collapsed,
  (value) => {
    listVisible.value = !value
  },
)

function toggleExportMenu() {
  if (!canExport.value) return
  exportMenuOpen.value = !exportMenuOpen.value
}

function getExportPoints() {
  if (Array.isArray(props.gpxPoints) && props.gpxPoints.length) return props.gpxPoints
  if (!props.routeGeojson) return []
  return extractRoutePointsFromGeoJson(props.routeGeojson)
}

function exportGpx() {
  const pts = getExportPoints()
  if (!pts.length) return
  const xml = buildGpxTrack(props.exportName, pts)
  downloadTextFile(`${safeExportBasename(props.exportName)}.gpx`, xml)
}

function exportGeoJson() {
  if (!props.routeGeojson) return
  const json = JSON.stringify(props.routeGeojson, null, 2)
  downloadTextFile(`${safeExportBasename(props.exportName)}.geojson`, json, 'application/geo+json')
}

function pickExport(format) {
  exportMenuOpen.value = false
  if (format === 'gpx') exportGpx()
  else exportGeoJson()
}

function onFocusStep(step) {
  if (!stepHasCoords(step)) return
  emit('focus-step', step)
}

function onDocumentClick(event) {
  if (!exportMenuOpen.value) return
  const wrap = exportWrapRef.value
  if (wrap && !wrap.contains(event.target)) {
    exportMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
})
</script>

<style lang="scss" scoped>
.route-directions {
  background: $color-surface;
  border-radius: $radius;
  box-shadow: $shadow;
  border: 1px solid rgba($color-primary, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.route-directions--overlay {
  position: absolute;
  z-index: 650;
  top: 12px;
  bottom: 75px;
  right: 12px;
  width: min(34vw, 360px);
  min-width: 260px;
  padding: 0;

  &.route-directions--collapsed {
    bottom: auto;
    height: auto;
    max-height: none;
  }
}

.route-directions--embedded {
  position: static;
  box-shadow: none;
  border: 1px solid $color-border;
  margin-top: 0.5rem;
  max-height: min(52vh, 420px);
}

.route-dir__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem 0.65rem;
  border-bottom: 1px solid rgba($color-primary, 0.12);
}

.route-dir__summary {
  flex: 1;
  min-width: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  font-size: 0.9rem;
  color: $color-darker;
  line-height: 1.35;
}

.route-dir__embedded-title {
  flex: 1;
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: $color-darker;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.route-dir__count {
  font-size: 0.72rem;
  font-weight: 700;
  color: $color-primary-dark;
  background: $color-light;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
}

.route-dir__metric {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;

  i {
    color: $color-primary;
    font-size: 0.9rem;
  }
}

.route-dir__toggle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: none;
  border-radius: $radius;
  background: $color-gray-light;
  color: $color-primary-dark;
  cursor: pointer;
  transition: $transition;

  &:hover {
    background: $color-light;
    color: $color-darker;
  }
}

.route-dir__chevron {
  width: 1.25rem;
  height: 1.25rem;
  display: block;
  transform: rotate(90deg);
  transition: transform 0.2s ease;
}

.route-dir__chevron--collapsed {
  transform: rotate(-90deg);
}

.route-dir__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.route-dir__list-wrap {
  padding: 0.35rem 0 0.5rem;
}

.route-dir__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.route-dir__item {
  margin: 0;
  padding: 0;
}

.route-dir__step-btn {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 0.35rem 0.5rem;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.85rem;
  border: none;
  border-bottom: 1px solid $color-gray-light;
  background: transparent;
  cursor: pointer;
  font: inherit;
  color: inherit;
  transition: background 0.12s ease;

  &:hover:not(:disabled) {
    background: rgba($color-secondary, 0.18);
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
}

.route-dir__step-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.35rem;
  height: 1.35rem;
  border-radius: 6px;
  background: $color-light;
  color: $color-primary-dark;
  font-weight: 800;
  font-size: 0.68rem;
}

.route-dir__step-text {
  font-size: 0.82rem;
  line-height: 1.45;
  color: $color-text;
}

.route-dir__step-dist {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  font-size: 0.72rem;
  color: $color-text-light;
  white-space: nowrap;

  i {
    font-size: 0.95rem;
  }
}

.route-dir__empty {
  margin: 0;
  padding: 0.75rem 1rem 1rem;
  font-size: 0.8rem;
  color: $color-text-light;
}

.route-dir__footer {
  flex-shrink: 0;
  margin-top: auto;
  padding: 0.45rem 0.55rem 0.5rem;
  border-top: 1px solid rgba($color-primary, 0.15);
  background: $color-surface;
  box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.06);
}

.route-dir__footer-bar {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.35rem;
}

.route-dir__footer-label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  font-size: 0.68rem;
  font-weight: 600;
  color: $color-text-light;
  white-space: nowrap;
}

.route-export-wrap {
  position: relative;
  flex-shrink: 0;
}

.route-export-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.28rem 0.5rem;
  border-radius: $radius;
  border: 1px solid rgba($color-primary, 0.28);
  background: $color-gray-light;
  font-size: 0.68rem;
  font-weight: 700;
  color: $color-primary-dark;
  cursor: pointer;
  transition: $transition;

  &:hover:not(:disabled) {
    background: $color-light;
    border-color: $color-primary;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.route-export-trigger__chev {
  font-size: 0.7rem;
  opacity: 0.75;
}

.route-export-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 4px);
  z-index: 20;
  min-width: 7.5rem;
  padding: 0.2rem;
  border-radius: $radius;
  border: 1px solid rgba($color-primary, 0.2);
  background: $color-surface;
  box-shadow: $shadow;
}

.route-export-menu__item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  width: 100%;
  padding: 0.38rem 0.55rem;
  border: none;
  border-radius: calc(#{$radius} - 2px);
  background: transparent;
  font-size: 0.72rem;
  font-weight: 600;
  color: $color-text;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;

  i {
    color: $color-primary;
  }

  &:hover {
    background: rgba($color-secondary, 0.2);
    color: $color-darker;
  }
}

.route-external-row {
  display: flex;
  gap: 0.5rem;
}

.route-dir__footer .route-external-row {
  gap: 0.35rem;
}

.route-external-chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 3.75rem;
  padding: 0.5rem 0.4rem;
  border-radius: $radius;
  border: 1px solid rgba($color-primary, 0.22);
  background: $color-surface;
  cursor: pointer;
  transition: $transition;

  &:hover {
    background: $color-light;
    border-color: $color-primary;
  }

  &:focus-visible {
    outline: 2px solid $color-secondary;
    outline-offset: 2px;
  }
}

.route-external-chip__logo {
  display: block;
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.route-external-chip__label {
  font-size: 0.78rem;
  font-weight: 600;
  color: $color-text;
}

.route-external-chip--compact {
  flex: 1;
  flex-direction: row;
  justify-content: center;
  gap: 0.3rem;
  min-height: 0;
  padding: 0.32rem 0.4rem;

  .route-external-chip__logo {
    width: 18px;
    height: 18px;
  }

  .route-external-chip__label {
    font-size: 0.72rem;
  }
}

@media (max-width: $bp-md) {
  .route-directions--overlay:not(.route-directions--below-map) {
    left: 10px;
    right: 10px;
    top: auto;
    bottom: 10px;
    width: auto;
    max-height: min(40vh, 320px);
    min-width: 0;
    border-radius: $radius-lg $radius-lg $radius $radius;

    &.route-directions--collapsed {
      max-height: none;
      border-radius: $radius;
    }
  }

  .route-directions--below-map {
    position: static;
    top: auto;
    right: auto;
    bottom: auto;
    left: auto;
    width: 100%;
    min-width: 0;
    max-height: min(42vh, 360px);
    border-radius: $radius-lg;
  }
}
</style>
