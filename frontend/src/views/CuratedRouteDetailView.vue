<template>
  <div class="cr-page">
    <div v-if="notFound" class="cr-state">
      <p>Маршрут не найден.</p>
      <RouterLink class="app-btn app-btn--primary" to="/marshruty">К списку</RouterLink>
    </div>

    <div v-else-if="!manifest" class="cr-state">
      <p v-if="bootError">{{ bootError }}</p>
      <p v-else class="cr-state__muted">Загрузка маршрута…</p>
    </div>

    <template v-else>
      <div class="cr-layout">
        <!-- Левая колонка: информация о маршруте -->
        <aside aria-label="О маршруте" class="cr-panel card-surface">
          <div class="cr-panel__scroll">
            <nav aria-label="Навигация" class="cr-panel__crumb">
              <RouterLink to="/">Главная</RouterLink>
              <span aria-hidden="true" class="cr-panel__sep">›</span>
              <RouterLink to="/marshruty">Маршруты</RouterLink>
              <span aria-hidden="true" class="cr-panel__sep">›</span>
              <span class="cr-panel__here">{{ manifest.title }}</span>
            </nav>

            <figure v-if="heroGalleryPhotos.length" class="cr-panel__hero">
              <div class="cr-hero-gallery">
                <img
                  :alt="manifest.title"
                  :src="heroGalleryPhotos[heroPhotoIdx]"
                  class="cr-hero-gallery__main"
                  loading="lazy"
                />
                <div
                  v-if="heroGalleryPhotos.length > 1"
                  :aria-label="`Фото маршрута, ${heroGalleryPhotos.length}`"
                  class="cr-hero-gallery__thumbs"
                  role="group"
                >
                  <button
                    v-for="(src, hi) in heroGalleryPhotos"
                    :key="`${src}-${hi}`"
                    :aria-label="`Фото ${hi + 1}`"
                    :aria-pressed="heroPhotoIdx === hi ? 'true' : 'false'"
                    :class="{ 'cr-hero-gallery__thumb--active': heroPhotoIdx === hi }"
                    class="cr-hero-gallery__thumb"
                    type="button"
                    @click="heroPhotoIdx = hi"
                  >
                    <img :src="src" alt="" loading="lazy" />
                  </button>
                </div>
              </div>
            </figure>

            <h1 class="cr-panel__title">{{ manifest.title }}</h1>
            <p class="cr-panel__teaser">{{ teaserForList }}</p>

            <div aria-label="Краткие теги" class="cr-tag-row">
              <span v-if="manifest.regionLabel" class="cr-chip cr-chip--soft">
                <i aria-hidden="true" class="bi bi-geo-alt-fill cr-chip__ic"></i>
                {{ manifest.regionLabel }}
              </span>
              <span class="cr-chip cr-chip--soft">
                <i :class="['bi', profileChipIconClass, 'cr-chip__ic']" aria-hidden="true"></i>
                {{ profileHint }}
              </span>
              <span class="cr-chip cr-chip--soft">
                <i aria-hidden="true" class="bi bi-clock cr-chip__ic"></i>
                {{ durationStat }}
              </span>
              <span class="cr-chip cr-chip--soft">
                <i aria-hidden="true" class="bi bi-rulers cr-chip__ic"></i>
                {{ distanceStat }}
              </span>
            </div>

            <p v-if="loadError" class="cr-alert">{{ loadError }}</p>
            <p v-else-if="loadingReserves" class="cr-muted">Загрузка объектов…</p>

            <template v-else>
              <section class="cr-block">
                <h2 class="cr-block__h">О маршруте</h2>
                <p v-for="(para, i) in manifest.description" :key="i" class="cr-block__p">
                  {{ para }}
                </p>
              </section>

              <p v-if="directionsError" class="cr-alert">{{ directionsError }}</p>
              <p v-else-if="buildingRoute" class="cr-muted">Построение линии маршрута…</p>
              <p v-if="mapHint" class="cr-hint">{{ mapHint }}</p>

              <section v-if="reservesOrdered.length" class="cr-block">
                <h2 class="cr-block__h">
                  Объекты на маршруте
                  <span class="cr-block__count">{{ reservesOrdered.length }}</span>
                </h2>
                <ul class="cr-stops">
                  <li v-for="(r, idx) in reservesOrdered" :key="r.id" class="cr-stop">
                    <RouterLink
                      :class="{ 'cr-stop__link--active': activeStopIdx === idx }"
                      :to="`/reserve/${r.id}`"
                      class="cr-stop__link"
                      @focusin="activeStopIdx = idx"
                      @focusout="activeStopIdx = -1"
                      @mouseenter="activeStopIdx = idx"
                      @mouseleave="activeStopIdx = -1"
                    >
                      <div class="cr-stop__rail">
                        <span class="cr-stop__badge">{{ idx + 1 }}</span>
                        <span
                          v-if="idx < reservesOrdered.length - 1"
                          aria-hidden="true"
                          class="cr-stop__connector"
                        />
                      </div>
                      <div class="cr-stop__body">
                        <span class="cr-stop__name">{{ r.name }}</span>
                        <span class="cr-stop__role">{{ stopRole(idx) }}</span>
                      </div>
                      <div class="cr-stop__aside">
                        <div class="cr-stop__thumb">
                          <img
                            v-if="stopPrimaryPhoto(r)"
                            :alt="r.name"
                            :src="stopPrimaryPhoto(r)"
                            class="cr-stop__thumb-img"
                            loading="lazy"
                          />
                          <div v-else aria-hidden="true" class="cr-stop__ph">
                            <i aria-hidden="true" class="bi bi-image cr-stop__ph-ic"></i>
                          </div>
                        </div>
                        <span aria-hidden="true" class="cr-stop__chev">›</span>
                      </div>
                    </RouterLink>
                  </li>
                </ul>
              </section>

              <RouteDirectionsPanel
                :collapsible="false"
                :export-name="manifest.title"
                :gpx-points="displayedGpxPoints"
                :route-geojson="displayedRouteGeojson"
                :steps="displayedSteps"
                :summary="displayedSummary"
                embedded-title="Повороты и указания"
                variant="embedded"
                @focus-step="focusMapOnStep"
                @open-external="openExternalRoute"
              />

              <p class="cr-ors">
                Маршрутизация:
                <a href="https://openrouteservice.org" rel="noopener noreferrer" target="_blank"
                  >OpenRouteService</a
                >
              </p>
            </template>
          </div>
        </aside>

        <!-- Правая колонка: основная карта -->
        <div class="cr-map-main">
          <div
            ref="mapHostRef"
            :class="crMapClasses"
            aria-label="Карта маршрута"
            class="cr-map"
            role="region"
          >
            <div ref="mapEl" class="cr-map__canvas"></div>

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
                @click="goToMyLocation"
              >
                <i aria-hidden="true" class="bi bi-cursor-fill map-ctrl-btn__icon"></i>
              </button>
              <button
                :aria-label="isMapFullscreen ? 'Выйти из полного экрана' : 'Открыть карту на весь экран'"
                :title="isMapFullscreen ? 'Выйти из полного экрана' : 'На весь экран'"
                class="map-ctrl-btn map-ctrl-btn--icon"
                type="button"
                @click="toggleFullscreen"
              >
                <i
                  v-if="isMapFullscreen"
                  aria-hidden="true"
                  class="bi bi-fullscreen-exit map-ctrl-btn__icon"
                ></i>
                <i v-else aria-hidden="true" class="bi bi-fullscreen map-ctrl-btn__icon"></i>
              </button>
            </div>

            <RouteSetupPanel
              v-if="reservesOrdered.length"
              v-show="!pickupHint"
              v-model:start-source="userStartSource"
              :loading="userRouteLoading"
              :mobile-compact="userRouteActive"
              :menu-open="userRouteMenuOpen"
              :profile-hint="profileHint"
              :route-active="userRouteActive"
              :show-profile-select="false"
              :start-point="userStartPoint"
              panel-title="До первого объекта"
              @build="onBuildUserRoute"
              @clear="onClearUserRoute"
              @close-menu="userRouteMenuOpen = false"
              @open-menu="userRouteMenuOpen = true"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import RouteDirectionsPanel from '@/components/route/RouteDirectionsPanel.vue'
import RouteSetupPanel from '@/components/route/RouteSetupPanel.vue'
import { useMobileMapLayout } from '@/composables/useBreakpoint.js'
import { useUserOrsRoute } from '@/composables/useUserOrsRoute'
import { getTypeConfig } from '@/config/reserveTypes.js'
import {
  attachReserveMapPopupHandlers,
  buildReserveMapPopupHtml,
  getReserveMapPopupOptions,
} from '@/lib/reserveMapPopup.js'
import L from 'leaflet'
import api from '@/services/api'
import { BELARUS_BOUNDS_LL } from '@/config/mapBounds.js'
import { profileLabel } from '@/data/curatedRoutes.js'
import {
  drawCuratedRouteOnMap,
  formatRouteDistanceMeters,
  formatRouteDurationSeconds,
  extractRoutePointsFromGeoJson,
  createNumberedReserveIcon,
} from '@/lib/curatedRouteMapDraw.js'

const route = useRoute()
const router = useRouter()
const mapHostRef = ref(null)
const mapEl = ref(null)
const manifest = ref(null)
const notFound = ref(false)
const bootError = ref('')
const reservesOrdered = ref([])
const loadingReserves = ref(true)
const loadError = ref('')
const buildingRoute = ref(false)
const directionsError = ref('')
const mapHint = ref('')
const routeGeoJson = ref(null)
const orsDistanceM = ref(null)
const orsDurationS = ref(null)
const activeStopIdx = ref(-1)
const routeSteps = ref([])
const heroPhotoIdx = ref(0)
const isMapFullscreen = ref(false)
const isMobileMap = useMobileMapLayout()

const {
  routeMenuOpen: userRouteMenuOpen,
  routeActive: userRouteActive,
  routeLoading: userRouteLoading,
  routeSummary: userRouteSummary,
  routeSteps: userRouteSteps,
  pickupHint,
  startSource: userStartSource,
  startPoint: userStartPoint,
  routeProfile: userRouteProfile,
  lastRouteGeojson: userRouteGeojson,
  attachMap: attachUserRouteMap,
  detachMap: detachUserRouteMap,
  requestBuild: requestUserRouteBuild,
  clearUserRoute,
  focusRouteStep,
} = useUserOrsRoute()

let mainMap = null
let mainRouteDraw = null
let mainMarkersLayer = null
let userLocationMarker = null

const teaserForList = computed(() => {
  const t = manifest.value?.teaser?.trim()
  if (t) return t
  return 'Маршрут по особо охраняемым природным территориям Беларуси.'
})

const profileHint = computed(() => profileLabel(manifest.value?.profile || 'driving-car'))

const mapChromeHidden = computed(
  () => Boolean(pickupHint.value) || (userRouteMenuOpen.value && !userRouteActive.value),
)

const crMapClasses = computed(() => ({
  'cr-map--busy': mapChromeHidden.value,
  'cr-map--picking': Boolean(pickupHint.value),
  'cr-map--menu-open': userRouteMenuOpen.value && !userRouteActive.value,
  'cr-map--route-active': userRouteActive.value,
}))

const profileChipIconClass = computed(() =>
  manifest.value?.profile === 'foot-walking' ? 'bi-person-walking' : 'bi-car-front-fill',
)

const distanceStat = computed(() => {
  if (orsDistanceM.value != null && Number.isFinite(orsDistanceM.value)) {
    return formatRouteDistanceMeters(orsDistanceM.value)
  }
  return manifest.value?.listDistance?.trim() || '—'
})

const durationStat = computed(() => {
  if (orsDurationS.value != null && Number.isFinite(orsDurationS.value)) {
    return formatRouteDurationSeconds(orsDurationS.value)
  }
  return manifest.value?.listDuration?.trim() || '—'
})

const routeHighlights = computed(() => {
  const m = manifest.value
  if (!m) return []
  const gear =
    m.profile === 'foot-walking'
      ? 'Удобная обувь, вода, головной убор; при желании — бинокль.'
      : 'Запас воды и навигатор; заранее уточняйте доступность подъездов к объектам.'
  return [
    {
      iconClass: 'bi-calendar3',
      text: 'Лучшее время для посещения: май – сентябрь.',
    },
    {
      iconClass: m.profile === 'foot-walking' ? 'bi-person-walking' : 'bi-car-front-fill',
      text: `Рекомендуемое снаряжение: ${gear}`,
    },
    {
      iconClass: 'bi-info-circle',
      text: 'Ограничения: находитесь на тропах и дорогах общего пользования, не оставляйте мусор, не беспокойте животных.',
    },
  ]
})

const highlightAccordions = computed(() => {
  const items = routeHighlights.value
  const titles = ['Когда лучше ехать', 'Что взять с собой', 'Правила и ограничения']
  return items.map((item, i) => ({
    iconClass: item.iconClass,
    title: titles[i] || 'Подробнее',
    text: item.text,
  }))
})

const HERO_GALLERY_MAX = 8

const heroGalleryPhotos = computed(() => {
  const urls = []
  const seen = new Set()
  const push = (raw) => {
    const u = String(raw || '').trim()
    if (!u || seen.has(u)) return
    seen.add(u)
    urls.push(u)
  }
  push(manifest.value?.coverPhotoUrl)
  for (const r of reservesOrdered.value) {
    for (const p of r.photos || []) {
      push(p)
      if (urls.length >= HERO_GALLERY_MAX) return urls
    }
  }
  return urls
})

const gpxPoints = computed(() => {
  if (routeGeoJson.value) {
    const pts = extractRoutePointsFromGeoJson(routeGeoJson.value)
    if (pts.length) return pts
  }
  return reservesOrdered.value
    .map((r) => ({
      lat: Number(r.latitude),
      lng: Number(r.longitude),
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
})

const displayedSteps = computed(() =>
  userRouteActive.value ? userRouteSteps.value : routeSteps.value,
)

const displayedSummary = computed(() => {
  if (userRouteActive.value && userRouteSummary.value) return userRouteSummary.value
  if (orsDistanceM.value != null && orsDurationS.value != null) {
    return {
      distance: formatRouteDistanceMeters(orsDistanceM.value),
      duration: formatRouteDurationSeconds(orsDurationS.value),
    }
  }
  return null
})

const displayedRouteGeojson = computed(() =>
  userRouteActive.value ? userRouteGeojson.value : routeGeoJson.value,
)

const displayedGpxPoints = computed(() => {
  if (userRouteActive.value && userRouteGeojson.value) {
    const pts = extractRoutePointsFromGeoJson(userRouteGeojson.value)
    if (pts.length) return pts
  }
  return gpxPoints.value
})

function stopRole(idx) {
  const n = reservesOrdered.value.length
  if (n <= 1) return 'Единственная точка'
  if (idx === 0) return 'Начальная точка'
  if (idx === n - 1) return 'Конечная точка'
  return 'Промежуточная точка'
}

function stopPrimaryPhoto(r) {
  const first = Array.isArray(r?.photos) ? r.photos[0] : ''
  return String(first || '').trim()
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toggleFullscreen() {
  const el = mapHostRef.value
  if (!el) return
  if (!document.fullscreenElement) {
    void el.requestFullscreen?.()
  } else {
    void document.exitFullscreen?.()
  }
}

function invalidateMapSizeSoon() {
  if (!mainMap) return
  requestAnimationFrame(() => mainMap.invalidateSize())
  setTimeout(() => mainMap.invalidateSize(), 280)
}

function navigatorCoords() {
  if (userRouteActive.value && userStartPoint.value) {
    const first = reservesOrdered.value[0]
    if (!first) return []
    const start = {
      lat: Number(userStartPoint.value.lat),
      lng: Number(userStartPoint.value.lng),
    }
    const end = {
      lat: Number(first.latitude),
      lng: Number(first.longitude),
    }
    return [start, end].filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  }
  return reservesOrdered.value
    .map((r) => ({
      lat: Number(r.latitude),
      lng: Number(r.longitude),
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
}

function openExternalRoute(provider) {
  const c = navigatorCoords()
  if (!c.length) return
  if (provider === 'yandex') {
    const rtext = c.map((p) => `${p.lat},${p.lng}`).join('~')
    window.open(`https://yandex.ru/maps/?rtext=${rtext}`, '_blank', 'noopener,noreferrer')
    return
  }
  const path = c.map((p) => `${p.lat},${p.lng}`).join('/')
  window.open(`https://www.google.com/maps/dir/${path}/`, '_blank', 'noopener,noreferrer')
}

function focusMapOnStep(step) {
  focusRouteStep(mainMap, step)
}

function curatedRouteProfile() {
  return manifest.value?.profile === 'foot-walking' ? 'foot-walking' : 'driving-car'
}

function onBuildUserRoute() {
  if (!mainMap || !reservesOrdered.value.length) return
  const first = reservesOrdered.value[0]
  requestUserRouteBuild(
    mainMap,
    { profile: curatedRouteProfile() },
    (msg) => {
      mapHint.value = msg
    },
    () => ({
      lat: Number(first.latitude),
      lng: Number(first.longitude),
    }),
  )
}

function onClearUserRoute() {
  clearUserRoute(mainMap)
}

function removeUserLocationMarker() {
  if (userLocationMarker && mainMap) {
    mainMap.removeLayer(userLocationMarker)
    userLocationMarker = null
  }
}

function goToMyLocation() {
  if (!mainMap) return
  if (!('geolocation' in navigator)) {
    mapHint.value = 'Геолокация недоступна в этом браузере.'
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      removeUserLocationMarker()
      userLocationMarker = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#256f46',
        fillColor: '#3cb371',
        fillOpacity: 1,
        weight: 2,
      })
        .addTo(mainMap)
        .bindPopup('Вы здесь')
      const z = Math.max(mainMap.getZoom(), 13)
      if (typeof mainMap.flyTo === 'function') {
        mainMap.flyTo([lat, lng], z, { duration: 0.45 })
      } else {
        mainMap.setView([lat, lng], z)
      }
    },
    () => {
      mapHint.value = 'Не удалось определить местоположение. Проверьте доступ к геолокации.'
    },
    { timeout: 12000, enableHighAccuracy: false },
  )
}

function onFullscreenChange() {
  isMapFullscreen.value = document.fullscreenElement === mapHostRef.value
  invalidateMapSizeSoon()
}

function setupMapPopups(map) {
  attachReserveMapPopupHandlers(map, {
    onSelect: (id) => router.push(`/reserve/${id}`),
  })
}

async function loadAndBuild() {
  const slug = String(route.params.slug || '').trim()
  destroyMaps()
  manifest.value = null
  notFound.value = false
  bootError.value = ''
  reservesOrdered.value = []
  loadingReserves.value = true
  loadError.value = ''
  directionsError.value = ''
  mapHint.value = ''
  routeGeoJson.value = null
  routeSteps.value = []
  orsDistanceM.value = null
  orsDurationS.value = null
  activeStopIdx.value = -1
  heroPhotoIdx.value = 0
  clearUserRoute(mainMap)
  userRouteMenuOpen.value = false

  let m = null
  try {
    const { data } = await api.getCuratedRouteBySlug(slug)
    if (!data?.success || !data.data) {
      notFound.value = true
      loadingReserves.value = false
      return
    }
    m = data.data
  } catch (e) {
    if (e?.response?.status === 404) {
      notFound.value = true
      loadingReserves.value = false
      return
    }
    bootError.value = e?.response?.data?.error || e?.message || 'Не удалось загрузить маршрут'
    loadingReserves.value = false
    return
  }

  notFound.value = false
  manifest.value = m
  userRouteProfile.value = curatedRouteProfile()

  try {
    const results = await Promise.all(
      m.reserveIds.map((id) => api.get(`/reserves/${id}`).then((res) => res.data.data)),
    )
    for (const row of results) {
      const lat = Number(row?.latitude)
      const lng = Number(row?.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        loadError.value = `У объекта «${escapeHtml(row?.name || row?.id)}» нет координат на карте.`
        reservesOrdered.value = []
        loadingReserves.value = false
        return
      }
    }
    reservesOrdered.value = results
  } catch (e) {
    loadError.value =
      e?.response?.data?.error || e?.message || 'Не удалось загрузить данные объектов.'
    reservesOrdered.value = []
    loadingReserves.value = false
    return
  }

  loadingReserves.value = false

  await nextTick()
  if (!mapEl.value || !reservesOrdered.value.length) return

  initMainMap()
  attachUserRouteMap(mainMap)
  setupMapPopups(mainMap)
  mainMarkersLayer = addNumberedMarkers(mainMap)
  invalidateMapSizeSoon()

  buildingRoute.value = true
  routeSteps.value = []
  try {
    const coordinates = reservesOrdered.value.map((r) => ({
      lat: Number(r.latitude),
      lng: Number(r.longitude),
    }))
    const { data } = await api.postRouteDirections({
      coordinates,
      profile: m.profile,
    })
    if (!data?.success || !data.data?.geojson) {
      directionsError.value = data?.error || 'Не удалось построить маршрут.'
      mapHint.value = 'Показаны только точки объектов.'
      routeGeoJson.value = null
      orsDistanceM.value = null
      orsDurationS.value = null
      routeSteps.value = []
      fitMapToStops(mainMap)
      invalidateMapSizeSoon()
      return
    }
    routeGeoJson.value = data.data.geojson
    routeSteps.value = Array.isArray(data.data.steps) ? data.data.steps : []

    const last = reservesOrdered.value[reservesOrdered.value.length - 1]
    const finalDest = { lat: Number(last.latitude), lng: Number(last.longitude) }
    mainRouteDraw = drawCuratedRouteOnMap(mainMap, data.data.geojson, finalDest)
    const d = Number(data.data.distance)
    const t = Number(data.data.duration)
    if (Number.isFinite(d) && Number.isFinite(t)) {
      orsDistanceM.value = d
      orsDurationS.value = t
    } else {
      orsDistanceM.value = null
      orsDurationS.value = null
    }
    invalidateMapSizeSoon()
  } catch (e) {
    directionsError.value = e?.response?.data?.error || e?.message || 'Ошибка маршрутизации.'
    mapHint.value = 'Показаны только точки объектов.'
    routeGeoJson.value = null
    routeSteps.value = []
    orsDistanceM.value = null
    orsDurationS.value = null
    fitMapToStops(mainMap)
    invalidateMapSizeSoon()
  } finally {
    buildingRoute.value = false
  }
}

function belarusBounds() {
  return L.latLngBounds(BELARUS_BOUNDS_LL)
}

function createLeafletMap(el, { scrollWheel = true } = {}) {
  const first = reservesOrdered.value[0]
  return L.map(el, {
    center: [Number(first.latitude), Number(first.longitude)],
    zoom: 9,
    minZoom: 6,
    maxZoom: 16,
    maxBounds: belarusBounds(),
    maxBoundsViscosity: 1.0,
    zoomSnap: 1,
    wheelPxPerZoomLevel: 120,
    zoomAnimation: false,
    fadeAnimation: true,
    markerZoomAnimation: false,
    preferCanvas: false,
    zoomControl: false,
    scrollWheelZoom: scrollWheel,
  })
}

function initMainMap() {
  if (mainMap || !mapEl.value) return
  mainMap = createLeafletMap(mapEl.value, { scrollWheel: true })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(mainMap)
}

function fitMapToStops(map) {
  if (!map || !reservesOrdered.value.length) return
  const b = L.latLngBounds(
    reservesOrdered.value.map((r) => [Number(r.latitude), Number(r.longitude)]),
  )
  if (b.isValid())
    map.fitBounds(b, {
      padding: [48, 48],
      maxZoom: 12,
    })
}

function addNumberedMarkers(map) {
  if (!map) return null
  const group = L.layerGroup()
  reservesOrdered.value.forEach((r, i) => {
    const typeConfig = getTypeConfig(r.type)
    const color = typeConfig.color || '#757575'
    const icon = createNumberedReserveIcon(color, i + 1)
    const marker = L.marker([Number(r.latitude), Number(r.longitude)], { icon })
    marker.bindPopup(
      buildReserveMapPopupHtml(r, typeConfig, {
        stopIndex: i + 1,
      }),
      getReserveMapPopupOptions(),
    )
    marker.addTo(group)
  })
  group.addTo(map)
  return group
}

function destroyMaps() {
  clearUserRoute(mainMap)
  detachUserRouteMap(mainMap)
  removeUserLocationMarker()
  if (mainRouteDraw) {
    mainRouteDraw.remove()
    mainRouteDraw = null
  }
  if (mainMarkersLayer && mainMap) {
    mainMap.removeLayer(mainMarkersLayer)
    mainMarkersLayer = null
  }
  if (mainMap) {
    mainMap.remove()
    mainMap = null
  }
}

watch(
  () => route.params.slug,
  () => {
    void loadAndBuild()
  },
)

watch(heroGalleryPhotos, (photos) => {
  if (heroPhotoIdx.value >= photos.length) heroPhotoIdx.value = 0
})


onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  void loadAndBuild()
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  destroyMaps()
})
</script>

<style lang="scss" scoped>
$route-green: #1f7a4a;
$route-green-dark: #166534;
$header-h: $header-height;

.cr-page {
  width: 100%;
  box-sizing: border-box;
  background: #f1f5f9;
  display: flex;
  flex-direction: column;
  min-height: calc(100dvh - #{$header-h});

  @media (min-width: 961px) {
    height: calc(100dvh - #{$header-h});
    overflow: hidden;
  }
}

.cr-state {
  padding: 48px 24px;
  text-align: center;
  color: #0f172a;

  &__muted {
    margin: 0;
    color: #64748b;
  }
}

$cr-left-col: minmax(300px, min(420px, 38vw));

.cr-layout {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: grid;
  grid-template-columns: $cr-left-col 1fr;
  gap: 0;
  align-items: stretch;
  box-sizing: border-box;
}

@media (max-width: 960px) {
  .cr-page {
    overflow-y: auto;
    height: auto;
    min-height: calc(100dvh - #{$header-h});
  }

  .cr-layout {
    grid-template-columns: 1fr;
    flex: none;
    min-height: unset;
    overflow: visible;
  }
}

/* ——— Левая панель ——— */
.cr-panel {
  border-radius: 0;
  border: none;
  border-right: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: none;
  height: 100%;
  max-height: none;
  display: flex;
  flex-direction: column;
  background: #fff;
  min-width: 0;

  @media (max-width: 960px) {
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
    height: auto;
    max-height: none;
  }
}

@media (max-width: 640px) {
  .cr-state {
    padding: 32px 16px;
  }

  .cr-panel__scroll {
    padding: 12px 14px 16px;
  }

  .cr-panel__crumb {
    font-size: 0.68rem;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .cr-panel__here {
    display: inline;
  }

  .cr-panel__title {
    font-size: 1.25rem;
  }

  .cr-tag-row {
    gap: 5px;
  }

  .cr-chip {
    font-size: 0.7rem;
    padding: 4px 9px;
  }

  .cr-map {
    height: clamp(360px, 68vh, 620px);
  }

  .cr-map--menu-open {
    height: clamp(380px, 72vh, 640px);
  }

  .cr-map--route-active {
    height: clamp(340px, 62vh, 560px);
  }

  .cr-map--picking {
    height: clamp(400px, 76vh, 680px);
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

  .cr-map :deep(.route-fab) {
    top: 10px;
    left: 10px;
    padding: 0.55rem 0.8rem;
  }

  .cr-map :deep(.route-setup) {
    top: auto;
    bottom: 10px;
    left: 10px;
    right: 10px;
    width: auto;
    max-height: min(34vh, 240px);
    overflow-y: auto;
  }

  .cr-map :deep(.route-setup--with-route),
  .cr-map :deep(.route-setup--mobile-compact) {
    top: 8px;
    bottom: auto;
    max-height: min(28vh, 200px);
  }

  .cr-map--busy :deep(.route-fab) {
    opacity: 0;
    pointer-events: none;
  }

  .cr-map--picking :deep(.route-fab) {
    opacity: 1;
    pointer-events: auto;
  }
}

.cr-panel__scroll {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 16px 18px 20px;
}

.cr-panel__crumb {
  font-size: 0.72rem;
  margin: 0 0 12px;
  color: #64748b;

  a {
    color: $route-green-dark;
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.cr-panel__sep {
  margin: 0 5px;
  opacity: 0.55;
}

.cr-panel__here {
  color: #334155;
  font-weight: 600;
}

.cr-panel__hero {
  margin: 0 0 14px;
  border-radius: 12px;
  overflow: hidden;
  background: #e2e8f0;
}

.cr-hero-gallery {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cr-hero-gallery__main {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  display: block;
}

.cr-hero-gallery__thumbs {
  display: flex;
  gap: 6px;
  padding: 0 2px 2px;
  overflow-x: auto;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }
}

.cr-hero-gallery__thumb {
  flex-shrink: 0;
  width: 52px;
  height: 40px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: #e2e8f0;
  opacity: 0.72;
  transition:
    opacity 0.15s ease,
    border-color 0.15s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &--active,
  &:hover {
    opacity: 1;
    border-color: $route-green;
  }
}

.cr-panel__title {
  margin: 0;
  font-size: clamp(1.2rem, 2.4vw, 1.5rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
  line-height: 1.2;
}

.cr-panel__teaser {
  margin: 8px 0 0;
  font-size: 0.84rem;
  color: #64748b;
  line-height: 1.45;
}

.cr-tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.cr-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 600;
  color: $route-green-dark;
  background: #ecfdf3;
  border: 1px solid rgba(31, 122, 74, 0.18);

  &--soft {
    color: #475569;
    background: #f8fafc;
    border-color: #e2e8f0;
    font-weight: 500;
  }

  :deep(svg) {
    width: 14px;
    height: 14px;
    display: block;
    flex-shrink: 0;
  }
}

.cr-chip__ic {
  flex-shrink: 0;
  font-size: 0.9rem;
  line-height: 1;
  color: #64748b;
}

.cr-block {
  margin-top: 18px;
  padding-top: 4px;
}

.cr-block__h {
  margin: 0 0 10px;
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  &--accent {
    color: $route-green-dark;
  }
}

.cr-block__count {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 999px;
}

.cr-block__p {
  margin: 0 0 10px;
  font-size: 0.84rem;
  line-height: 1.55;
  color: #475569;

  &:last-child {
    margin-bottom: 0;
  }
}

.cr-acc {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  margin-bottom: 8px;
  background: #fafafa;
  overflow: hidden;

  &:last-child {
    margin-bottom: 0;
  }
}

.cr-acc__summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  font-size: 0.82rem;
  font-weight: 700;
  color: #0f172a;

  &::-webkit-details-marker {
    display: none;
  }
}

.cr-acc__icon {
  flex-shrink: 0;
  font-size: 1.05rem;
  line-height: 1;
  color: $route-green-dark;
}

.cr-acc__chev {
  margin-left: auto;
  font-size: 0.65rem;
  color: #94a3b8;
}

.cr-acc__body {
  margin: 0;
  padding: 0 12px 12px 40px;
  font-size: 0.8rem;
  line-height: 1.5;
  color: #475569;
}

/* ——— Правая колонка: основная карта ——— */
.cr-map-main {
  min-width: 0;
  min-height: 0;
  height: 100%;

  @media (max-width: 960px) {
    height: auto;
  }
}

.cr-map {
  position: relative;
  height: 100%;
  min-height: 280px;
  border-radius: 0;
  overflow: hidden;
  background: #cbd5e1;
  border: none;
  border-left: 1px solid #e2e8f0;
  box-shadow: none;

  &:fullscreen {
    height: 100%;
    border-left: none;
  }

  @media (max-width: 960px) {
    height: clamp(380px, 64vh, 600px);
    border-left: none;
    border-top: 1px solid #e2e8f0;
  }
}

.cr-map__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
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
  border: 1px solid rgba($route-green, 0.25);
  border-radius: 10px;
  background: #fff;
  color: $route-green-dark;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
  transition:
    background 0.15s ease,
    border-color 0.15s ease;

  &:hover {
    background: #f6fcf9;
    border-color: $route-green;
    color: #0f3d24;
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
  color: $route-green-dark;
}

.route-overlay-hint {
  position: absolute;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  max-width: min(92%, 420px);
  padding: 0.55rem 0.95rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba($route-green, 0.2);
  font-size: 0.86rem;
  color: #334155;
  text-align: center;
  pointer-events: none;
}

.route-overlay-hint__icon {
  flex-shrink: 0;
  color: $route-green;
  font-size: 1rem;
}

.cr-map:fullscreen {
  :deep(.route-fab),
  :deep(.route-setup),
  .map-ctrl-stack {
    z-index: 10000;
  }
}

.cr-muted {
  margin: 0 0 12px;
  font-size: 0.84rem;
  color: #64748b;

  &--pad {
    padding-top: 8px;
  }
}

.cr-hint {
  margin: 0 0 10px;
  font-size: 0.75rem;
  color: #94a3b8;
}

.cr-alert {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  font-size: 0.82rem;
}

.cr-stops {
  list-style: none;
  margin: 0;
  padding: 4px 0 0;
}

.cr-stop {
  margin: 0;
  padding: 0;
}

.cr-stop__link {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  column-gap: 10px;
  align-items: start;
  padding: 8px 8px 10px 0;
  margin-bottom: 2px;
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: background 0.12s ease;

  &:hover {
    background: rgba(31, 122, 74, 0.06);
  }

  &--active {
    background: rgba(31, 122, 74, 0.1);
  }
}

.cr-stop__rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 28px;
  flex-shrink: 0;
  align-self: stretch;
  min-height: 100%;
}

.cr-stop__connector {
  flex: 1 1 auto;
  width: 2px;
  min-height: 18px;
  margin-top: 6px;
  margin-left: auto;
  margin-right: auto;
  background: repeating-linear-gradient(
    to bottom,
    #cbd5e1 0,
    #cbd5e1 5px,
    transparent 5px,
    transparent 9px
  );
}

.cr-stop__badge {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(145deg, #22c55e, $route-green-dark);
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.35);
}

.cr-stop__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
}

.cr-stop__name {
  font-size: 0.84rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

.cr-stop__role {
  font-size: 0.72rem;
  color: #64748b;
}

.cr-stop__aside {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding-top: 0;
}

.cr-stop__thumb {
  flex-shrink: 0;
  width: 48px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  background: #e2e8f0;
}

.cr-stop__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cr-stop__ph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  color: #94a3b8;
}

.cr-stop__ph-ic {
  font-size: 1.1rem;
  line-height: 1;
  color: #94a3b8;
}

.cr-stop__chev {
  flex-shrink: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #cbd5e1;
}

.cr-ors {
  margin: 14px 0 0;
  font-size: 0.65rem;
  color: #94a3b8;
  text-align: center;

  a {
    color: $route-green-dark;
  }
}
</style>
