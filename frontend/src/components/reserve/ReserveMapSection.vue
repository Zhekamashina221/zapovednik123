<template>
  <section v-if="hasCoordinates" class="reserve__map-section">
    <header class="map-section__head">
      <div class="map-section__title-wrap">
        <h2 class="map-section__title">Расположение и маршрут</h2>
        <p class="map-section__lead">
          Постройте маршрут до объекта или откройте точку в навигаторе
        </p>
      </div>
    </header>

    <div ref="mapBlockRef" class="reserve__map-block">
      <div :class="mapShellClasses" class="reserve__map-shell">
        <div ref="mapEl" class="reserve__map-inner" role="presentation" />

        <div v-if="pickupHint" class="route-overlay-hint" role="status">
          <i aria-hidden="true" class="bi bi-hand-index-thumb route-overlay-hint__icon"></i>
          <span>{{ pickupHint }}</span>
        </div>

        <div
          v-show="!mapChromeHidden"
          aria-label="Действия на карте"
          class="map-ctrl-stack"
          role="toolbar"
        >
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

        <RouteSetupPanel
          v-show="!pickupHint"
          ref="setupPanelRef"
          v-model:profile="localProfile"
          v-model:start-source="localStartSource"
          :can-add-via="canAddVia"
          :loading="routeLoading"
          :mobile-compact="isMobileMap && routeActive"
          :menu-open="routeMenuOpen"
          :route-active="routeActive"
          :saving="routeSaving"
          :show-save="isLoggedIn"
          :build-start-source="routeBuildStartSource"
          :start-point="routeStartPoint"
          @add-via="$emit('add-via')"
          @build="submitOrsBuild"
          @clear="$emit('clear-route')"
          @close-menu="$emit('close-route-menu')"
          @open-menu="$emit('open-route-menu')"
          @save="$emit('save-route')"
        />

        <p v-show="!mapChromeHidden" class="route-ors-mini">
          <i aria-hidden="true" class="bi bi-info-circle"></i>
          Маршруты:
          <a href="https://openrouteservice.org" rel="noopener noreferrer" target="_blank">
            OpenRouteService
            <i aria-hidden="true" class="bi bi-box-arrow-up-right"></i>
          </a>
        </p>
      </div>

      <RouteDirectionsPanel
        v-if="routeActive && routeSummary && isMobileMap"
        :collapsed="directionsCollapsed"
        :export-name="exportName"
        :route-geojson="routeGeojson"
        :steps="routeSteps"
        :summary="routeSummary"
        class="route-directions--below-map"
        variant="overlay"
        @focus-step="onFocusStep"
        @open-external="(provider) => $emit('open-external-route', provider)"
      />

      <RouteDirectionsPanel
        v-if="routeActive && routeSummary && !isMobileMap"
        :export-name="exportName"
        :route-geojson="routeGeojson"
        :steps="routeSteps"
        :summary="routeSummary"
        class="route-directions--map-dock"
        variant="overlay"
        @focus-step="onFocusStep"
        @open-external="(provider) => $emit('open-external-route', provider)"
      />
    </div>
  </section>
  <p v-else class="no-data">
    <i aria-hidden="true" class="bi bi-geo-alt"></i>
    Координаты не указаны
  </p>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import RouteDirectionsPanel from '@/components/route/RouteDirectionsPanel.vue'
import RouteSetupPanel from '@/components/route/RouteSetupPanel.vue'
import { useMobileMapLayout } from '@/composables/useBreakpoint.js'

const props = defineProps({
  hasCoordinates: { type: Boolean, default: false },
  locationLabel: { type: String, default: '' },
  latitude: { type: [Number, String], default: null },
  longitude: { type: [Number, String], default: null },
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
  routeStartPoint: { type: Object, default: null },
  routeBuildStartSource: { type: String, default: 'geo' },
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
  'copy-coords',
])

const coordinatesText = computed(() => {
  const lat = Number(props.latitude)
  const lng = Number(props.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
})

const mapEl = ref(null)
const mapBlockRef = ref(null)
const setupPanelRef = ref(null)
const isFullscreen = ref(false)

const localStartSource = ref('geo')
const localProfile = ref('driving-car')
const isMobileMap = useMobileMapLayout()
const directionsCollapsed = ref(false)

const mapChromeHidden = computed(
  () => Boolean(props.pickupHint) || (props.routeMenuOpen && !props.routeActive),
)

const mapShellClasses = computed(() => ({
  'reserve__map-shell--busy': mapChromeHidden.value,
  'reserve__map-shell--picking': Boolean(props.pickupHint),
  'reserve__map-shell--menu-open': props.routeMenuOpen && !props.routeActive,
  'reserve__map-shell--route-active': props.routeActive,
}))

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement
}

function syncFullscreenState() {
  const block = mapBlockRef.value
  isFullscreen.value = Boolean(block && fullscreenElement() === block)
}

async function toggleFullscreen() {
  const block = mapBlockRef.value
  if (!block) return
  try {
    if (!fullscreenElement()) {
      const req = block.requestFullscreen?.bind(block) || block.webkitRequestFullscreen?.bind(block)
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
  (opened) => {
    if (opened && !props.routeActive) {
      localStartSource.value = 'geo'
      localProfile.value = 'driving-car'
    }
  },
)

watch(
  () => props.routeActive,
  (active) => {
    if (!active) return
    localStartSource.value = props.routeBuildStartSource === 'map' ? 'map' : 'geo'
    if (isMobileMap.value) {
      directionsCollapsed.value = true
    }
  },
)

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('webkitfullscreenchange', onFullscreenChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', onFullscreenChange)
  if (fullscreenElement() === mapBlockRef.value) {
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

function onFocusStep(step) {
  emit('focus-route-step', step)
}
</script>

<style lang="scss" scoped>
.reserve__map-section {
  margin-bottom: 0;
}

.map-section__head {
  margin-bottom: 1rem;
}

.map-section__title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: $color-ink;
  line-height: 1.2;
}

.map-section__title-icon {
  color: $color-primary;
  font-size: 1.2rem;
}

.map-section__lead {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: $color-ink-muted;
  line-height: 1.45;
}

.map-location-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1rem;
  margin-bottom: 0.85rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid $color-border;
  border-radius: $radius;
  background: $color-light;
}

.map-location-bar__place {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  min-width: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: $color-darker;

  i {
    flex-shrink: 0;
    color: $color-primary;
  }

  span {
    overflow-wrap: anywhere;
  }
}

.map-location-bar__coords {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
  padding: 0.4rem 0.65rem;
  border: 1px solid rgba($color-primary, 0.22);
  border-radius: 999px;
  background: $color-surface;
  font-size: 0.8rem;
  font-weight: 600;
  color: $color-primary-dark;
  cursor: pointer;
  transition: $transition;

  &:hover {
    background: $color-surface;
    border-color: $color-primary;
    color: $color-darker;
  }
}

.map-location-bar__copy {
  font-size: 0.85rem;
  opacity: 0.75;
}

.reserve__map-block {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  position: relative;

  &:fullscreen {
    position: fixed;
    inset: 0;
    z-index: 3000;
    width: 100vw;
    height: 100vh;
    max-height: 100dvh;
    gap: 0;
    padding: 0;
    background: $color-gray-light;

    .reserve__map-shell {
      flex: 1;
      min-height: 0;
      height: auto;
      border-radius: 0;
      border: none;
      box-shadow: none;
    }

    .reserve__map-inner {
      border-radius: 0;
    }

    .route-overlay-hint {
      top: calc(10px + env(safe-area-inset-top, 0px));
      z-index: 10000;
    }

    :deep(.route-setup-root) {
      z-index: 10000;
    }

    :deep(.route-fab),
    :deep(.route-setup) {
      top: calc(12px + env(safe-area-inset-top, 0px));
      left: calc(12px + env(safe-area-inset-left, 0px));
    }

    :deep(.route-directions--map-dock) {
      top: calc(12px + env(safe-area-inset-top, 0px));
      bottom: calc(60px + env(safe-area-inset-bottom, 0px));
      right: calc(12px + env(safe-area-inset-right, 0px));
      z-index: 10000;

      &.route-directions--collapsed {
        bottom: auto;
      }
    }

    .route-directions--below-map {
      flex-shrink: 0;
      max-height: min(38vh, 320px);
      border-radius: 0;
      z-index: 10000;
    }

    .map-ctrl-stack {
      z-index: 10000;
      bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      right: calc(12px + env(safe-area-inset-right, 0px));
    }

    .route-ors-mini {
      bottom: calc(6px + env(safe-area-inset-bottom, 0px));
      z-index: 10000;
    }
  }
}

@media (min-width: #{$bp-md + 1}) {
  .reserve__map-block :deep(.route-directions--map-dock) {
    position: absolute;
    z-index: 650;
    top: 12px;
    bottom: 75px;
    right: 12px;
    width: min(34vw, 360px);
    min-width: 260px;

    &.route-directions--collapsed {
      bottom: auto;
      height: auto;
      max-height: none;
    }
  }
}

.reserve__map-shell {
  position: relative;
  height: clamp(320px, 58vh, 560px);
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow;
  background: $color-gray-light;
  border: 1px solid $color-border;

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

.map-ctrl-btn__icon {
  font-size: 1.15rem;
  line-height: 1;
  display: block;
  color: $color-primary-dark;
}

.map-ctrl-btn:hover .map-ctrl-btn__icon {
  color: $color-darker;
}

.route-overlay-hint {
  position: absolute;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 800;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: min(92%, 420px);
  padding: 0.55rem 0.95rem;
  border-radius: 999px;
  background: $color-surface;
  box-shadow: $shadow;
  border: 1px solid rgba($color-primary, 0.2);
  font-size: 0.86rem;
  color: $color-text;
  text-align: center;
  pointer-events: none;
}

.route-overlay-hint__icon {
  flex-shrink: 0;
  color: $color-primary;
  font-size: 1rem;
}

.route-ors-mini {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin: 0;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba($color-surface, 0.92);
  font-size: 0.68rem;
  color: $color-text-light;

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    color: $color-primary;
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
      text-underline-offset: 2px;
    }
  }
}

@media (max-width: $bp-md) {
  .map-section__title {
    font-size: 1.05rem;
  }

  .map-section__lead {
    font-size: 0.84rem;
  }

  .map-location-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .map-location-bar__coords {
    margin-left: 0;
    justify-content: center;
  }

  .reserve__map-shell {
    height: clamp(360px, 68vh, 620px);
  }

  .reserve__map-shell--menu-open {
    height: clamp(380px, 72vh, 640px);
  }

  .reserve__map-shell--route-active {
    height: clamp(340px, 62vh, 560px);
  }

  .reserve__map-shell--picking {
    height: clamp(380px, 74vh, 660px);
  }

  .map-ctrl-stack {
    bottom: 10px;
    right: 8px;
  }

  .route-overlay-hint {
    top: 10px;
    max-width: min(96%, 360px);
    font-size: 0.8rem;
    padding: 0.45rem 0.75rem;
  }

  .route-ors-mini {
    display: none;
  }

  :deep(.route-directions--below-map) {
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

  :deep(.route-directions--map-dock) {
    top: 12px;
    bottom: 12px;
    right: 12px;
    width: min(34vw, 360px);
  }

  :deep(.route-setup) {
    top: auto;
    bottom: 10px;
    left: 10px;
    right: 10px;
    width: auto;
    max-height: min(34vh, 240px);
    overflow-y: auto;
  }

  :deep(.route-setup--with-route),
  :deep(.route-setup--mobile-compact) {
    top: 8px;
    bottom: auto;
    max-height: min(28vh, 200px);
  }

  :deep(.route-fab) {
    top: 10px;
    left: 10px;
    padding: 0.55rem 0.8rem;
  }

  .reserve__map-shell--busy :deep(.route-fab) {
    opacity: 0;
    pointer-events: none;
  }

  .reserve__map-shell--picking :deep(.route-fab) {
    opacity: 1;
    pointer-events: auto;
  }

  .route-toolbar-btn span {
    display: none;
  }

  .route-toolbar-btn {
    padding: 0.5rem;
  }
}

@media (max-width: $bp-sm) {
  .route-fab__label {
    display: none;
  }

  .route-fab {
    width: 2.65rem;
    height: 2.65rem;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
  }
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  padding: 2.5rem 1.5rem;
  background: $color-gray-light;
  border-radius: $radius-lg;
  color: $color-text-light;
  font-style: italic;

  i {
    font-size: 1.5rem;
    color: $color-text-light;
  }
}
</style>
