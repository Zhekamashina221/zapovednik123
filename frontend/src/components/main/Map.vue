<script setup>
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet.markercluster'
import { getTypeConfig } from '@/config/reserveTypes.js'
import { BELARUS_BOUNDS_LL } from '@/config/mapBounds.js'
import {
  getMapLayerById,
  loadSavedMapLayerId,
  MAP_BASE_LAYERS,
  saveMapLayerId,
} from '@/config/mapLayers.js'
import { useReservesStore } from '@/stores/reserves'
import { useUiStore } from '@/stores/ui'
import {
  attachReserveMapPopupHandlers,
  buildReserveMapPopupHtml,
  getReserveMapPopupOptions,
} from '@/lib/reserveMapPopup.js'

/** Параметры маркера «вы здесь» — как в useReserveMap.goToMyLocation */
const USER_LOCATION_CIRCLE_MARKER = {
  radius: 8,
  color: '#256f46',
  fillColor: '#3cb371',
  fillOpacity: 1,
  weight: 2,
}

/** Визуальный размер кружка по числу точек (больше count → крупнее). Ключ = суффикс класса в cluster.css */
const CLUSTER_TIERS = [
  { min: 600, size: 92, key: 'b8' },
  { min: 400, size: 86, key: 'b7' },
  { min: 250, size: 80, key: 'b6' },
  { min: 150, size: 74, key: 'b5' },
  { min: 100, size: 68, key: 'b4' },
  { min: 75, size: 68, key: 'b3' },
  { min: 45, size: 65, key: 'b2' },
  { min: 25, size: 60, key: 'b1' },
  { min: 15, size: 50, key: 'b0' },
]
const CLUSTER_DEFAULT = { size: 38, key: 'bx' }

function clusterVisual(count) {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  for (const row of CLUSTER_TIERS) {
    if (n >= row.min) return row
  }
  return CLUSTER_DEFAULT
}

const props = defineProps({
  reserves: { type: Array, default: () => [] },
  nearbyEnabled: { type: Boolean, default: false },
  userLocation: { type: Object, default: null },
  nearbyRadiusKm: { type: Number, default: 10 },
})
const emit = defineEmits(['select'])
const mapEl = ref(null)
const layersWrapRef = ref(null)
const layersMenuOpen = ref(false)
const activeLayerId = ref(loadSavedMapLayerId())
const reservesStore = useReservesStore()
const ui = useUiStore()

let map = null
let clusterGroup = null
/** @type {import('leaflet').TileLayer | null} */
let baseTileLayer = null
/** Маркер и круг режима «рядом со мной» (из store) */
let nearbyUserMarker = null
let userRadiusCircle = null
/** Маркер после нажатия «моё местоположение», когда режим «рядом» выключен */
let browseUserMarker = null
const iconCache = new Map()


function clearBrowseUserMarker() {
  if (browseUserMarker && map) {
    map.removeLayer(browseUserMarker)
    browseUserMarker = null
  }
}

function createTileLayer(def) {
  const opts = {
    attribution: def.attribution,
    maxZoom: def.maxZoom ?? 19,
  }
  if (def.subdomains) opts.subdomains = def.subdomains
  return L.tileLayer(def.url, opts)
}

function applyBaseLayer(id) {
  if (!map) return
  const def = getMapLayerById(id)
  if (baseTileLayer) {
    map.removeLayer(baseTileLayer)
    baseTileLayer = null
  }
  baseTileLayer = createTileLayer(def)
  baseTileLayer.addTo(map)
  baseTileLayer.bringToBack()
  activeLayerId.value = def.id
  saveMapLayerId(def.id)
}

function toggleLayersMenu() {
  layersMenuOpen.value = !layersMenuOpen.value
}

function selectBaseLayer(id) {
  if (id !== activeLayerId.value) applyBaseLayer(id)
  layersMenuOpen.value = false
}

function onDocumentClick(event) {
  if (!layersMenuOpen.value) return
  const wrap = layersWrapRef.value
  if (wrap && !wrap.contains(event.target)) {
    layersMenuOpen.value = false
  }
}

function clearNearbyUserOverlay() {
  if (nearbyUserMarker && map) {
    map.removeLayer(nearbyUserMarker)
    nearbyUserMarker = null
  }
  if (userRadiusCircle && map) {
    map.removeLayer(userRadiusCircle)
    userRadiusCircle = null
  }
}

onMounted(async () => {
  await nextTick()
  if (!mapEl.value) return

  map = L.map(mapEl.value, {
    center: [53.9023, 27.5618],
    zoom: 7,
    minZoom: 7,
    maxZoom: 16,
    maxBounds: L.latLngBounds(BELARUS_BOUNDS_LL),
    maxBoundsViscosity: 1.0,
    zoomSnap: 1,
    wheelPxPerZoomLevel: 120,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    preferCanvas: true,
  })

  applyBaseLayer(activeLayerId.value)

  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 160,
    spiderfyOnMaxZoom: true,
    /** при наведении — контур области, которую объединяет кластер (география, не «радиус в настройках») */
    showCoverageOnHover: true,
    polygonOptions: {
      fillColor: '#006833',
      fillOpacity: 0.06,
      color: '#006833',
      weight: 1.5,
      opacity: 0.45,
    },
    removeOutsideVisibleBounds: true,
    chunkedLoading: true,
    chunkInterval: 100,

    iconCreateFunction: (cluster) => {
      const count = cluster.getChildCount()
      const { size, key } = clusterVisual(count)
      return L.divIcon({
        className: `custom-cluster cluster-${key}`,
        html: `<div class="cluster-inner"><span class="cluster-count">${count}</span></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
    },
  })

  map.addLayer(clusterGroup)

  attachReserveMapPopupHandlers(map, {
    onSelect: (id) => emit('select', id),
  })

  if (props.reserves?.length) updateMarkers(props.reserves)
  // immediate watcher on nearby props runs before map exists — draw overlay once map is ready
  updateUserOverlay()
  document.addEventListener('click', onDocumentClick, true)
})

const updateMarkers = (reserves) => {
  if (!clusterGroup || !reserves?.length) {
    clusterGroup?.clearLayers()
    return
  }

  clusterGroup.clearLayers()

  const markers = reserves
    .map((r) => {
      if (!r.id || r.latitude == null || r.longitude == null) return null

      const config = getTypeConfig(r.type)
      const color = config.color || '#757575'

      if (!iconCache.has(color)) {
        iconCache.set(
          color,
          L.icon({
            iconUrl: `data:image/svg+xml;base64,${btoa(`
            <svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22c0-6.6-5.4-12-12-12z"
                    fill="${color}" stroke="white" stroke-width="2"/>
              <circle cx="12" cy="12" r="5" fill="white"/>
            </svg>
          `)}`,
            iconSize: [24, 34],
            iconAnchor: [12, 34],
            popupAnchor: [0, -32],
          }),
        )
      }

      const icon = iconCache.get(color)

      const marker = L.marker([r.latitude, r.longitude], { icon })

      marker.bindPopup(
        buildReserveMapPopupHtml(r, config, {}),
        getReserveMapPopupOptions(),
      )

      return marker
    })
    .filter(Boolean)

  clusterGroup.addLayers(markers)

  if (map && markers.length) {
    const bounds = L.latLngBounds(markers.map((marker) => marker.getLatLng()))
    map.fitBounds(bounds, {
      paddingTopLeft: L.point(340, 34),
      paddingBottomRight: L.point(34, 34),
      maxZoom: markers.length === 1 ? 12 : 11,
      animate: true,
    })
  }
}

function updateUserOverlay() {
  if (!map) return

  clearNearbyUserOverlay()
  if (!props.nearbyEnabled || !props.userLocation) return

  clearBrowseUserMarker()

  const { lat, lon } = props.userLocation
  const radiusMeters = Math.max(0.5, Number(props.nearbyRadiusKm) || 10) * 1000

  nearbyUserMarker = L.circleMarker([lat, lon], {
    ...USER_LOCATION_CIRCLE_MARKER,
  })
    .addTo(map)
    .bindPopup('Вы здесь')

  userRadiusCircle = L.circle([lat, lon], {
    radius: radiusMeters,
    color: '#2e8b57',
    fillColor: '#3cb371',
    fillOpacity: 0.12,
    weight: 2,
  }).addTo(map)
}

/** Как ReserveMapSection + useReserveMap.goToMyLocation: всегда доступно, не зависит от «рядом со мной». */
function zoomIn() {
  map?.zoomIn()
}

function zoomOut() {
  map?.zoomOut()
}

function onLocateClicked() {
  if (!map) return
  if (!('geolocation' in navigator)) {
    ui.showToast('Геолокация недоступна в этом браузере.')
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      if (props.nearbyEnabled) {
        const la = Number(lat)
        const lo = Number(lng)
        if (Number.isFinite(la) && Number.isFinite(lo)) {
          reservesStore.$patch((s) => {
            s.nearby.userLocation = { lat: la, lon: lo }
          })
        }
        updateUserOverlay()
      } else {
        clearBrowseUserMarker()
        browseUserMarker = L.circleMarker([lat, lng], {
          ...USER_LOCATION_CIRCLE_MARKER,
        })
          .addTo(map)
          .bindPopup('Вы здесь')
      }
      const z = Math.max(map.getZoom(), 13)
      if (typeof map.flyTo === 'function') {
        map.flyTo([lat, lng], z, { duration: 0.45 })
      } else {
        map.setView([lat, lng], z)
      }
    },
    () => ui.showToast('Не удалось определить местоположение. Проверьте доступ к геолокации.'),
    { timeout: 12000, enableHighAccuracy: false },
  )
}

let timer = null
watch(
  () => props.reserves,
  (newVal) => {
    clearTimeout(timer)
    timer = setTimeout(() => updateMarkers(newVal || []), 80)
  },
  { immediate: true },
)

watch(
  () => [
    props.nearbyEnabled,
    props.userLocation?.lat,
    props.userLocation?.lon,
    props.nearbyRadiusKm,
  ],
  () => updateUserOverlay(),
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  if (clusterGroup) {
    clusterGroup.clearLayers()
  }
  clearBrowseUserMarker()
  clearNearbyUserOverlay()
  if (map) {
    map.remove()
  }
  map = null
  clusterGroup = null
  baseTileLayer = null
})
</script>

<template>
  <div class="map-wrap">
    <div
      aria-label="Масштаб и слои карты"
      class="map-ctrl-stack map-ctrl-stack--top"
      role="toolbar"
    >
      <div class="map-ctrl-group">
        <button aria-label="Увеличить" class="map-ctrl-btn" type="button" @click="zoomIn">+</button>
        <button aria-label="Уменьшить" class="map-ctrl-btn" type="button" @click="zoomOut">
          −
        </button>
      </div>
      <div ref="layersWrapRef" class="map-layers-wrap">
        <button
          :aria-expanded="layersMenuOpen ? 'true' : 'false'"
          :class="{ 'map-ctrl-btn--active': layersMenuOpen }"
          :title="`Слои карты: ${getMapLayerById(activeLayerId).label}`"
          aria-haspopup="menu"
          aria-label="Слои карты"
          class="map-ctrl-btn map-ctrl-btn--layers"
          type="button"
          @click.stop="toggleLayersMenu"
        >
          <i aria-hidden="true" class="bi bi-layers"></i>
        </button>
        <div v-if="layersMenuOpen" class="map-layers-menu" role="menu" @click.stop>
          <button
            v-for="layer in MAP_BASE_LAYERS"
            :key="layer.id"
            :class="{ 'map-layers-menu__item--active': activeLayerId === layer.id }"
            class="map-layers-menu__item"
            role="menuitemradio"
            :aria-checked="activeLayerId === layer.id ? 'true' : 'false'"
            type="button"
            @click="selectBaseLayer(layer.id)"
          >
            {{ layer.label }}
          </button>
        </div>
      </div>
    </div>

    <div
      aria-label="Моё местоположение"
      class="map-ctrl-stack map-ctrl-stack--locate"
      role="toolbar"
    >
      <button
        aria-label="Показать моё местоположение на карте"
        class="map-ctrl-btn map-ctrl-btn--icon"
        title="Показать моё местоположение на карте"
        type="button"
        @click="onLocateClicked"
      >
        <i aria-hidden="true" class="bi bi-cursor-fill map-ctrl-btn__icon"></i>
      </button>
    </div>

    <div ref="mapEl" class="map-container"></div>
  </div>
</template>

<style lang="scss" scoped>
.map-wrap {
  position: relative;
  height: 100%;
  width: 100%;
}

.map-container {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.map-ctrl-stack {
  position: absolute;
  z-index: 700;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.map-ctrl-stack--top {
  top: 12px;
  right: 12px;
}

.map-ctrl-stack--locate {
  bottom: 12px;
  right: 12px;
}

.map-ctrl-group {
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: $shadow;
  border: 1px solid #e6e7e9;
}

.map-ctrl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: none;
  border-bottom: 1px solid #eef0f2;
  background: $color-surface;
  color: $color-darker;
  font-size: 1.15rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: $transition;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: $color-light;
    color: $color-primary;
  }

  &--layers {
    border: 1px solid #e6e7e9;
    border-radius: 10px;
    box-shadow: $shadow;
  }

  &--active {
    background: $color-light;
    color: $color-primary;
    border-color: rgba($color-primary, 0.35);
  }

  &--icon {
    border: 1px solid #e6e7e9;
    border-radius: 10px;
    box-shadow: $shadow;
  }
}

.map-layers-wrap {
  position: relative;
}

.map-layers-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 800;
  min-width: 8.5rem;
  padding: 0.25rem;
  border-radius: 10px;
  border: 1px solid #e6e7e9;
  background: $color-surface;
  box-shadow: $shadow;
}

.map-layers-menu__item {
  display: block;
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 0.82rem;
  font-weight: 600;
  color: $color-darker;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;

  &:hover {
    background: $color-light;
  }

  &--active {
    background: rgba($color-secondary, 0.25);
    color: $color-primary-dark;
  }
}

.map-ctrl-btn__layers-icon {
  display: block;
  width: 1rem;
  height: 1rem;
  background:
    linear-gradient($color-darker, $color-darker) 0 0 / 100% 2px no-repeat,
    linear-gradient($color-darker, $color-darker) 0 50% / 72% 2px no-repeat,
    linear-gradient($color-darker, $color-darker) 0 100% / 44% 2px no-repeat;
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

@media (max-width: 768px) {
  .map-ctrl-stack--top {
    top: 8px;
    right: 8px;
  }

  .map-ctrl-stack--locate {
    bottom: 14px;
    right: 8px;
  }
}
</style>

<style lang="scss">
.leaflet-control-zoom {
  display: none !important;
}
</style>
