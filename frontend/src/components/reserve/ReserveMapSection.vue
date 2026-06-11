<template>
  <section v-if="hasCoordinates" class="reserve__map-section">
    <h2 class="section-title reserve__map-heading">Расположение и маршрут</h2>

    <div
      ref="mapShellRef"
      :class="{ 'reserve__map-shell--fullscreen': isFullscreen }"
      class="reserve__map-shell"
    >
      <div ref="mapEl" class="reserve__map-inner" role="presentation" />

      <div v-if="pickupHint" class="route-overlay-hint" role="status">{{ pickupHint }}</div>

      <div aria-label="Действия на карте" class="map-ctrl-stack" role="toolbar">
        <button
          aria-label="Показать моё местоположение на карте"
          class="map-ctrl-btn map-ctrl-btn--icon"
          title="Показать моё местоположение на карте"
          type="button"
          @click="$emit('locate-requested')"
        >
          <i aria-hidden="true" class="bi bi-cursor-fill map-ctrl-btn__icon"></i>
        </button>
        <button
          :aria-label="isFullscreen ? 'Выйти из полного экрана' : 'Открыть карту на весь экран'"
          :title="isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'"
          class="map-ctrl-btn map-ctrl-btn--icon"
          type="button"
          @click="toggleFullscreen"
        >
          <i
            v-if="isFullscreen"
            aria-hidden="true"
            class="bi bi-fullscreen-exit map-ctrl-btn__icon"
          ></i>
          <i v-else aria-hidden="true" class="bi bi-fullscreen map-ctrl-btn__icon"></i>
        </button>
      </div>

      <button
        v-if="!routeMenuOpen"
        ref="routeFabEl"
        :aria-expanded="routeMenuOpen ? 'true' : 'false'"
        aria-controls="route-setup-panel"
        class="route-fab"
        type="button"
        @click="$emit('open-route-menu')"
      >
        <span aria-hidden="true" class="route-fab__icon">≡</span>
        Маршрут
      </button>

      <div
        v-show="routeMenuOpen"
        id="route-setup-panel"
        ref="setupPanelEl"
        aria-label="Построение маршрута"
        aria-modal="false"
        class="route-panel route-panel--setup"
        role="dialog"
        tabindex="-1"
        @keydown.esc.prevent="$emit('close-route-menu')"
      >
        <div class="route-panel__header">
          <span class="route-panel__title">До объекта</span>
          <button
            aria-label="Закрыть панель"
            class="route-panel__close"
            type="button"
            @click="$emit('close-route-menu')"
          >
            ×
          </button>
        </div>

        <fieldset class="route-mini-fieldset">
          <legend>Старт</legend>
          <label class="route-mini-fieldset__opt">
            <input v-model="localStartSource" type="radio" value="geo" />
            Я здесь (геолокация)
          </label>
          <label class="route-mini-fieldset__opt">
            <input v-model="localStartSource" type="radio" value="map" />
            Точка на карте
          </label>
        </fieldset>

        <div aria-label="Способ передвижения" class="route-segments" role="group">
          <button
            :class="{ 'route-segments__btn--active': localProfile === 'driving-car' }"
            class="route-segments__btn"
            type="button"
            @click="localProfile = 'driving-car'"
          >
            Авто
          </button>
          <button
            :class="{ 'route-segments__btn--active': localProfile === 'foot-walking' }"
            class="route-segments__btn"
            type="button"
            @click="localProfile = 'foot-walking'"
          >
            Пешком
          </button>
        </div>

        <button
          :disabled="routeLoading"
          class="route-action-primary"
          type="button"
          @click="submitOrsBuild"
        >
          {{ routeLoading ? 'Строим…' : 'Построить' }}
        </button>

        <div v-if="routeActive" class="route-active-toolbar">
          <button
            class="route-toolbar-btn route-toolbar-btn--danger"
            type="button"
            @click="$emit('clear-route')"
          >
            Сбросить
          </button>
          <button
            v-if="isLoggedIn"
            :disabled="routeLoading || routeSaving"
            class="route-toolbar-btn route-toolbar-btn--save"
            type="button"
            @click="$emit('save-route')"
          >
            {{ routeSaving ? 'Сохранение…' : 'В профиль' }}
          </button>
          <button
            v-if="canAddVia"
            :disabled="routeLoading"
            class="route-toolbar-btn"
            type="button"
            @click="$emit('add-via')"
          >
            + Точка
          </button>
        </div>
      </div>

      <aside
        v-show="routeActive && routeSummary"
        :class="{ 'route-panel--directions-collapsed': !directionsVisible }"
        aria-label="Пошаговый маршрут"
        class="route-panel route-panel--directions"
      >
        <header class="route-dir__head">
          <p class="route-dir__summary">
            <strong>{{ routeSummary?.distance }}</strong>
            <span class="route-dir__dot">·</span>
            <strong>{{ routeSummary?.duration }}</strong>
          </p>
          <button
            :aria-expanded="directionsVisible ? 'true' : 'false'"
            :aria-label="
              directionsVisible ? 'Скрыть пошаговый маршрут' : 'Показать пошаговый маршрут'
            "
            :title="directionsVisible ? 'Скрыть пошаговый маршрут' : 'Показать пошаговый маршрут'"
            class="route-dir__toggle"
            type="button"
            @click="directionsVisible = !directionsVisible"
          >
            <i
              :class="[
                'bi',
                'bi-chevron-right',
                'route-dir__chevron',
                { 'route-dir__chevron--collapsed': !directionsVisible },
              ]"
              aria-hidden="true"
            ></i>
          </button>
        </header>
        <div v-if="directionsVisible" class="route-dir__scroll">
          <div v-if="routeSteps.length" class="route-dir__list-wrap">
            <ol class="route-dir__list" role="list">
              <li v-for="(step, idx) in routeSteps" :key="idx" class="route-dir__item">
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
                  <span v-if="formatLegDistance(step.distance)" class="route-dir__step-dist">{{
                    formatLegDistance(step.distance)
                  }}</span>
                </button>
              </li>
            </ol>
          </div>
          <p v-else class="route-dir__empty">Нет списка поворотов для этого профиля.</p>
        </div>

        <footer class="route-dir__footer">
          <div class="route-dir__footer-bar">
            <div ref="exportWrapRef" class="route-export-wrap">
              <button
                :aria-expanded="exportMenuOpen ? 'true' : 'false'"
                :disabled="!canExportRoute"
                aria-haspopup="menu"
                class="route-export-trigger"
                type="button"
                @click.stop="toggleExportMenu"
              >
                Экспорт
                <span aria-hidden="true" class="route-export-trigger__chev">▾</span>
              </button>
              <div v-if="exportMenuOpen" class="route-export-menu" role="menu" @click.stop>
                <button
                  class="route-export-menu__item"
                  role="menuitem"
                  type="button"
                  @click="pickExport('gpx')"
                >
                  GPX
                </button>
                <button
                  class="route-export-menu__item"
                  role="menuitem"
                  type="button"
                  @click="pickExport('geojson')"
                >
                  GeoJSON
                </button>
              </div>
            </div>
            <span class="route-dir__footer-label">или открыть в…</span>
          </div>
          <div aria-label="Открыть в картах" class="route-external-row" role="group">
            <button
              class="route-external-chip route-external-chip--compact"
              title="Яндекс Карты"
              type="button"
              @click="$emit('open-external-route', 'yandex')"
            >
              <img
                :src="yandexMapsIcon"
                alt=""
                class="route-external-chip__logo"
                height="18"
                width="18"
              />
              <span class="route-external-chip__label">Яндекс</span>
            </button>
            <button
              class="route-external-chip route-external-chip--compact"
              title="Google Карты"
              type="button"
              @click="$emit('open-external-route', 'google')"
            >
              <img
                :src="googleMapsIcon"
                alt=""
                class="route-external-chip__logo"
                height="18"
                width="18"
              />
              <span class="route-external-chip__label">Google</span>
            </button>
          </div>
        </footer>
      </aside>

      <p class="route-ors-mini">
        <a href="https://openrouteservice.org" rel="noopener noreferrer" target="_blank"
          >OpenRouteService</a
        >
      </p>
    </div>
  </section>
  <p v-else class="no-data">Координаты не указаны</p>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import googleMapsIcon from '@/assets/icons/google-maps.png'
import yandexMapsIcon from '@/assets/icons/yandex.png'
import {
  buildGpxTrack,
  downloadTextFile,
  extractRoutePointsFromGeoJson,
} from '@/lib/curatedRouteMapDraw.js'

const props = defineProps({
  hasCoordinates: { type: Boolean, default: false },
  isLoggedIn: { type: Boolean, default: false },
  routeMenuOpen: { type: Boolean, default: false },
  routeActive: { type: Boolean, default: false },
  routeLoading: { type: Boolean, default: false },
  routeSaving: { type: Boolean, default: false },
  routeSummary: { type: Object, default: null },
  routeSteps: { type: Array, default: () => [] },
  routeGeojson: { type: Object, default: null },
  exportName: { type: String, default: 'marshrut' },
  pickupHint: { type: String, default: '' },
  canAddVia: { type: Boolean, default: false },
})

const emit = defineEmits([
  'map-mounted',
  'open-route-menu',
  'close-route-menu',
  'open-external-route',
  'clear-route',
  'save-route',
  'build-route-requested',
  'add-via',
  'focus-route-step',
  'locate-requested',
  'invalidate-map',
])

const mapEl = ref(null)
const mapShellRef = ref(null)
const routeFabEl = ref(null)
const setupPanelEl = ref(null)
const isFullscreen = ref(false)
const directionsVisible = ref(true)
const exportMenuOpen = ref(false)
const exportWrapRef = ref(null)

const localStartSource = ref('geo')
const localProfile = ref('driving-car')

const canExportRoute = computed(() => {
  if (!props.routeGeojson) return false
  return extractRoutePointsFromGeoJson(props.routeGeojson).length > 0
})

function safeExportBasename(name) {
  const base = String(name || 'marshrut')
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}\-_]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'marshrut'
}

function exportGpx() {
  if (!props.routeGeojson) return
  const pts = extractRoutePointsFromGeoJson(props.routeGeojson)
  if (!pts.length) return
  const xml = buildGpxTrack(props.exportName, pts)
  downloadTextFile(`${safeExportBasename(props.exportName)}.gpx`, xml)
}

function exportGeoJson() {
  if (!props.routeGeojson) return
  const json = JSON.stringify(props.routeGeojson, null, 2)
  downloadTextFile(`${safeExportBasename(props.exportName)}.geojson`, json, 'application/geo+json')
}

function toggleExportMenu() {
  if (!canExportRoute.value) return
  exportMenuOpen.value = !exportMenuOpen.value
}

function pickExport(format) {
  exportMenuOpen.value = false
  if (format === 'gpx') exportGpx()
  else exportGeoJson()
}

function onDocumentClick(event) {
  if (!exportMenuOpen.value) return
  const wrap = exportWrapRef.value
  if (wrap && !wrap.contains(event.target)) {
    exportMenuOpen.value = false
  }
}

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement
}

function syncFullscreenState() {
  const shell = mapShellRef.value
  isFullscreen.value = Boolean(shell && fullscreenElement() === shell)
}

async function toggleFullscreen() {
  const shell = mapShellRef.value
  if (!shell) return
  try {
    if (!fullscreenElement()) {
      const req = shell.requestFullscreen?.bind(shell) || shell.webkitRequestFullscreen?.bind(shell)
      if (req) await req()
    } else {
      const exit =
        document.exitFullscreen?.bind(document) || document.webkitExitFullscreen?.bind(document)
      if (exit) await exit()
    }
  } catch {
    /* user denied or unsupported */
  }
  await nextTick()
  syncFullscreenState()
  emit('invalidate-map')
  window.setTimeout(() => emit('invalidate-map'), 200)
}

function onFullscreenChange() {
  syncFullscreenState()
  emit('invalidate-map')
  window.setTimeout(() => emit('invalidate-map'), 120)
}

watch(
  () => mapEl.value,
  (value) => {
    if (value) emit('map-mounted', value)
  },
  { immediate: true },
)

watch(
  () => props.routeMenuOpen,
  async (opened) => {
    if (opened) {
      localStartSource.value = 'geo'
      localProfile.value = 'driving-car'
      await nextTick()
      setupPanelEl.value?.focus()
    } else {
      routeFabEl.value?.focus()
    }
  },
)

watch(
  () => props.routeActive,
  (active) => {
    if (active) directionsVisible.value = true
    else exportMenuOpen.value = false
  },
)

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onFullscreenChange)
  document.addEventListener('click', onDocumentClick, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
  document.removeEventListener('click', onDocumentClick, true)
  if (fullscreenElement() === mapShellRef.value) {
    const exit =
      document.exitFullscreen?.bind(document) || document.webkitExitFullscreen?.bind(document)
    void exit?.()
  }
})

function submitOrsBuild() {
  emit('build-route-requested', {
    startSource: localStartSource.value,
    profile: localProfile.value,
  })
}

function stepHasCoords(step) {
  return Number.isFinite(Number(step?.lat)) && Number.isFinite(Number(step?.lng))
}

function onFocusStep(step) {
  if (!stepHasCoords(step)) return
  emit('focus-route-step', step)
}

function formatLegDistance(meters) {
  if (meters == null || !Number.isFinite(Number(meters))) return ''
  const m = Number(meters)
  if (m >= 1000) return `${(m / 1000).toFixed(1)} км`
  return `${Math.round(m)} м`
}
</script>

<style lang="scss" scoped>
.reserve__map-section {
  margin-bottom: 2.5rem;
}

.reserve__map-heading {
  margin-bottom: 0.85rem;
}

.reserve__map-shell {
  position: relative;
  height: clamp(360px, 70vh, 580px);
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow;
  background: $color-gray-light;

  &--fullscreen {
    position: fixed;
    inset: 0;
    z-index: 3000;
    width: 100vw !important;
    height: 100vh !important;
    max-height: 100dvh;
    border-radius: 0;
    box-shadow: none;

    .reserve__map-inner {
      border-radius: 0;
    }

    .route-fab {
      top: calc(12px + env(safe-area-inset-top, 0px));
      left: calc(12px + env(safe-area-inset-left, 0px));
    }

    .route-panel--setup {
      top: calc(12px + env(safe-area-inset-top, 0px));
      left: calc(12px + env(safe-area-inset-left, 0px));
    }

    .route-panel--directions {
      top: calc(12px + env(safe-area-inset-top, 0px));
      bottom: calc(60px + env(safe-area-inset-bottom, 0px));
      right: calc(12px + env(safe-area-inset-right, 0px));
    }

    .route-ors-mini {
      bottom: calc(6px + env(safe-area-inset-bottom, 0px));
    }
  }
}

.reserve__map-inner {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: $radius-lg;
}

.map-ctrl-stack {
  position: absolute;
  bottom: 12px;
  right: 12px;
  z-index: 700;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.35rem;
}

.map-ctrl-btn {
  padding: 0.45rem 0.55rem;
  border: 1px solid rgba($color-primary, 0.25);
  border-radius: $radius;
  background: $color-surface;
  color: $color-primary-dark;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: $shadow;
  transition: $transition;

  &:hover {
    background: $color-light;
    border-color: $color-primary;
    color: $color-darker;
  }

  &--icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
  }
}

.map-ctrl-btn__icon-svg,
.map-ctrl-btn__icon {
  font-size: 1.15rem;
  line-height: 1;
  display: block;
  color: $color-primary-dark;
}

.map-ctrl-btn:hover .map-ctrl-btn__icon-svg,
.map-ctrl-btn:hover .map-ctrl-btn__icon {
  color: $color-darker;
}

.route-overlay-hint {
  position: absolute;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  max-width: min(92%, 420px);
  padding: 0.55rem 0.95rem;
  border-radius: 999px;
  background: $color-surface;
  box-shadow: $shadow;
  border: 1px solid rgba($color-primary, 0.2);
  font-size: 0.88rem;
  color: $color-text;
  text-align: center;
  pointer-events: none;
}

.route-fab {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid rgba($color-primary, 0.3);
  border-radius: $radius;
  background: $color-surface;
  box-shadow: $shadow;
  font-weight: 700;
  font-size: 0.92rem;
  color: $color-primary-dark;
  cursor: pointer;
  transition: $transition;

  &:hover {
    background: $color-light;
    border-color: $color-primary;
  }
}

.route-fab__icon {
  font-size: 1.05rem;
  opacity: 0.75;
}

.route-panel {
  position: absolute;
  z-index: 650;
  background: $color-surface;
  border-radius: $radius;
  box-shadow: $shadow;
  border: 1px solid rgba($color-primary, 0.15);
}

.route-panel--setup {
  top: 12px;
  left: 12px;
  width: min(300px, calc(100vw - 2rem));
  padding: 0.85rem 0.95rem 0.95rem;
  text-align: left;
}

.route-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.route-panel__title {
  font-weight: 700;
  font-size: 0.98rem;
  color: $color-darker;
}

.route-panel__close {
  border: none;
  background: $color-gray-light;
  width: 2rem;
  height: 2rem;
  line-height: 1;
  border-radius: 999px;
  font-size: 1.35rem;
  cursor: pointer;
  color: $color-text-light;
  transition: $transition;

  &:hover {
    background: $color-gray;
    color: $color-text;
  }
}

.route-mini-fieldset {
  margin: 0.65rem 0 0;
  padding: 0.5rem 0.65rem;
  border: 1px solid rgba($color-primary, 0.2);
  border-radius: $radius;

  legend {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $color-text-light;
    padding: 0 0.25rem;
  }
}

.route-mini-fieldset__opt {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.35rem;
  font-size: 0.84rem;
  cursor: pointer;
  color: $color-text;

  &:first-of-type {
    margin-top: 0.45rem;
  }
}

.route-segments {
  display: flex;
  margin-top: 0.65rem;
  border-radius: $radius;
  overflow: hidden;
  border: 1px solid rgba($color-primary, 0.2);
}

.route-segments__btn {
  flex: 1;
  padding: 0.45rem 0.5rem;
  border: none;
  background: $color-gray-light;
  font-size: 0.82rem;
  font-weight: 600;
  color: $color-text-light;
  cursor: pointer;
  transition: $transition;

  &:hover {
    background: $color-light;
    color: $color-text;
  }

  &--active {
    background: rgba($color-secondary, 0.35);
    color: $color-darker;
  }
}

.route-action-primary {
  width: 100%;
  margin-top: 0.7rem;
  padding: 0.55rem 0.65rem;
  border: none;
  border-radius: $radius;
  background: $color-secondary;
  color: $color-surface;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba($color-primary, 0.35);
  transition: $transition;

  &:hover:not(:disabled) {
    background: $color-primary;
  }

  &:disabled {
    opacity: 0.65;
    cursor: wait;
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

.route-active-toolbar {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.65rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba($color-primary, 0.15);
}

.route-toolbar-btn {
  flex: 1;
  padding: 0.4rem 0.35rem;
  border-radius: $radius;
  border: 1px solid rgba($color-primary, 0.25);
  background: $color-surface;
  font-size: 0.76rem;
  font-weight: 600;
  color: $color-text;
  cursor: pointer;
  transition: $transition;

  &:hover:not(:disabled) {
    background: $color-light;
  }

  &--danger {
    border-color: rgba($color-danger, 0.45);
    color: $color-danger-dark;
    background: rgba($color-danger, 0.06);

    &:hover {
      background: rgba($color-danger, 0.12);
    }
  }

  &--save {
    border-color: rgba($color-primary, 0.45);
    color: $color-primary;
    background: rgba($color-secondary, 0.12);

    &:hover:not(:disabled) {
      background: rgba($color-secondary, 0.22);
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.route-panel--directions {
  top: 12px;
  bottom: 75px;
  right: 12px;
  width: min(34vw, 360px);
  min-width: 260px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;

  &.route-panel--directions-collapsed {
    bottom: auto;
    max-height: none;
  }
}

.route-dir__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.65rem 0.65rem 1rem;
  border-bottom: 1px solid rgba($color-primary, 0.12);
}

.route-dir__summary {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 0.95rem;
  color: $color-darker;
  line-height: 1.35;
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

.route-dir__dot {
  margin: 0 0.35rem;
  color: $color-text-light;
  font-weight: 400;
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
  font-size: 0.72rem;
  color: $color-text-light;
  white-space: nowrap;
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
  font-size: 0.62rem;
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
  display: block;
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

  &:hover {
    background: rgba($color-secondary, 0.2);
    color: $color-darker;
  }
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

.route-ors-mini {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  margin: 0;
  font-size: 0.68rem;
  color: $color-text-light;

  a {
    color: $color-primary;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
}

@media (max-width: 768px) {
  .map-ctrl-stack {
    top: auto;
    bottom: 52px;
    right: 8px;
    left: auto;
    flex-direction: column;
    align-items: stretch;
  }

  .route-panel--directions {
    left: 10px;
    right: 10px;
    top: auto;
    bottom: 10px;
    width: auto;
    max-height: min(52vh, 380px);
    min-width: 0;

    &.route-panel--directions-collapsed {
      max-height: none;
    }
  }

  .route-panel--setup {
    width: min(292px, calc(100vw - 1.5rem));
  }
}

.no-data {
  text-align: center;
  padding: 3rem;
  background: $color-gray-light;
  border-radius: $radius-lg;
  color: $color-text-light;
  font-style: italic;
}
</style>
