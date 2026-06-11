import { computed, nextTick, ref, shallowRef } from 'vue'
import L from 'leaflet'
import api from '@/services/api'
import { BELARUS_BOUNDS_LL } from '@/config/mapBounds.js'

const MAX_VIA = 7

function formatDistance(m) {
  if (!Number.isFinite(m)) return '—'
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} км`
  return `${Math.round(m)} м`
}

function formatDuration(sec) {
  if (!Number.isFinite(sec)) return '—'
  const minutes = Math.round(sec / 60)
  if (minutes < 60) return `${minutes} мин`
  const h = Math.floor(minutes / 60)
  const mm = minutes % 60
  return mm ? `${h} ч ${mm} мин` : `${h} ч`
}

/** Расстояние между точками на сфере, метры (для порога «дорисовать хвост»). */
function distanceMeters(a, b) {
  const R = 6371000
  const φ1 = (a.lat * Math.PI) / 180
  const φ2 = (b.lat * Math.PI) / 180
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180
  const x =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)))
}

/** Последняя вершина линии маршрута в ответе ORS (GeoJSON [lng, lat]). */
function lastRouteVertexLatLng(geojson) {
  if (!geojson?.features?.length) return null
  for (const f of geojson.features) {
    const g = f.geometry
    if (!g) continue
    if (g.type === 'LineString' && Array.isArray(g.coordinates) && g.coordinates.length) {
      const c = g.coordinates[g.coordinates.length - 1]
      if (Array.isArray(c) && c.length >= 2) {
        const lng = Number(c[0])
        const lat = Number(c[1])
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
      }
    }
    if (g.type === 'MultiLineString' && Array.isArray(g.coordinates) && g.coordinates.length) {
      const lastLine = g.coordinates[g.coordinates.length - 1]
      if (Array.isArray(lastLine) && lastLine.length) {
        const c = lastLine[lastLine.length - 1]
        if (Array.isArray(c) && c.length >= 2) {
          const lng = Number(c[0])
          const lat = Number(c[1])
          if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng }
        }
      }
    }
  }
  return null
}

export function useReserveMap() {
  const map = ref(null)
  const mapEl = ref(null)
  const routeMenuOpen = ref(false)
  const routeActive = ref(false)
  const routeLoading = ref(false)
  const routeSummary = ref(null)
  const routeSteps = ref([])
  const pickupRouteState = ref('idle')
  const pickupHint = ref('')
  const viaPoints = ref([])
  const startPoint = ref(null)
  const routeProfile = ref('driving-car')
  /** Последний успешно построенный маршрут (для сохранения в профиль). */
  const lastRouteGeojson = ref(null)
  const lastRouteDistanceM = ref(null)
  const lastRouteDurationS = ref(null)

  const currentReserve = shallowRef(null)
  let routeLayerGroup = null
  let notifyUser = (_msg) => {}
  let mapClickHandler = null
  let userLocationMarker = null

  const belarusBounds = L.latLngBounds(BELARUS_BOUNDS_LL)

  function removeUserLocationMarker() {
    if (userLocationMarker && map.value) {
      map.value.removeLayer(userLocationMarker)
      userLocationMarker = null
    }
  }

  function destroyMap() {
    pickupRouteState.value = 'idle'
    pickupHint.value = ''
    routeMenuOpen.value = false
    removeUserLocationMarker()
    if (routeLayerGroup && map.value) {
      map.value.removeLayer(routeLayerGroup)
      routeLayerGroup = null
    }
    if (map.value) {
      if (mapClickHandler) {
        map.value.off('click', mapClickHandler)
        mapClickHandler = null
      }
      map.value.remove()
      map.value = null
    }
    routeActive.value = false
    routeLoading.value = false
    routeSummary.value = null
    routeSteps.value = []
    startPoint.value = null
    viaPoints.value = []
    lastRouteGeojson.value = null
    lastRouteDistanceM.value = null
    lastRouteDurationS.value = null
    currentReserve.value = null
  }

  const canAddVia = computed(
    () =>
      routeActive.value &&
      viaPoints.value.length < MAX_VIA &&
      !routeLoading.value &&
      Boolean(startPoint.value),
  )

  async function initMap(reserve, typeColor, typeLabel) {
    if (!reserve?.latitude) return
    if (map.value) {
      if (currentReserve.value?.id === reserve.id) return
      destroyMap()
    }
    currentReserve.value = reserve
    await nextTick()
    if (!mapEl.value) return

    map.value = L.map(mapEl.value, {
      center: [reserve.latitude, reserve.longitude],
      zoom: 14,
      minZoom: 6,
      maxZoom: 16,
      maxBounds: belarusBounds,
      maxBoundsViscosity: 1.0,
      zoomSnap: 1,
      wheelPxPerZoomLevel: 120,
      // Avoid scaling the vector pane during wheel-zoom (otherwise stroke/length
      // look wrong until zoomend).
      zoomAnimation: false,
      fadeAnimation: true,
      markerZoomAnimation: false,
      // SVG paths pan with the map; Canvas partial redraws often show seams at edges.
      preferCanvas: false,
      zoomControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map.value)
    L.control.zoom({ position: 'bottomleft' }).addTo(map.value)

    const icon = L.divIcon({
      html: `<svg width="25" height="37" viewBox="0 0 25 41">
    <path d="M12.5 0.5C5.8 0.5 0.5 5.8 0.5 12.5C0.5 21.5 12.5 40.5 12.5 40.5C12.5 40.5 24.5 21.5 24.5 12.5C24.5 5.8 19.2 0.5 12.5 0.5Z"
    fill="${typeColor}" stroke="white" stroke-width="2"/>
    <circle cx="12.5" cy="12.5" r="5" fill="white"/>
  </svg>`,
      className: '',
      iconSize: [25, 37],
      iconAnchor: [12, 37],
      popupAnchor: [0, -37],
    })

    L.marker([reserve.latitude, reserve.longitude], { icon })
      .addTo(map.value)
      .bindPopup(`<b>${reserve.name}</b><br>${typeLabel}`)
      .openPopup()

    mapClickHandler = (e) => {
      if (pickupRouteState.value === 'idle') return
      const lat = e.latlng.lat
      const lng = e.latlng.lng
      if (pickupRouteState.value === 'picking_start') {
        startPoint.value = { lat, lng }
        pickupRouteState.value = 'idle'
        pickupHint.value = ''
        void executeDirections(currentReserve.value, notifyUser)
      } else if (pickupRouteState.value === 'picking_via') {
        if (viaPoints.value.length >= MAX_VIA) return
        viaPoints.value = [...viaPoints.value, { lat, lng }]
        pickupRouteState.value = 'idle'
        pickupHint.value = ''
        void executeDirections(currentReserve.value, notifyUser)
      }
    }
    map.value.on('click', mapClickHandler)
  }

  /** destination — маркер объекта; пунктир от конца полилинии ORS до маркера при зазоре. */
  function drawRouteLayers(geojson, destination) {
    if (!map.value) return

    if (routeLayerGroup) {
      map.value.removeLayer(routeLayerGroup)
      routeLayerGroup = null
    }

    routeLayerGroup = L.layerGroup()
    // One renderer for all route vectors: wider clip padding reduces empty strips
    // at the map edge while panning (Leaflet Renderer `padding` is relative to map size).
    const routeRenderer = L.svg({ padding: 0.75 })
    const gj = L.geoJSON(geojson, {
      renderer: routeRenderer,
      style: { color: '#2e8b57', weight: 6, opacity: 0.85 },
    })
    gj.addTo(routeLayerGroup)

    const dest =
      destination &&
      Number.isFinite(Number(destination.lat)) &&
      Number.isFinite(Number(destination.lng))
        ? { lat: Number(destination.lat), lng: Number(destination.lng) }
        : null
    const routeEnd = lastRouteVertexLatLng(geojson)
    const GAP_DRAW_MIN_M = 12
    if (dest && routeEnd && distanceMeters(routeEnd, dest) >= GAP_DRAW_MIN_M) {
      L.polyline(
        [
          [routeEnd.lat, routeEnd.lng],
          [dest.lat, dest.lng],
        ],
        {
          renderer: routeRenderer,
          color: '#2e8b57',
          weight: 5,
          opacity: 0.65,
          dashArray: '10 10',
          lineCap: 'round',
          lineJoin: 'round',
        },
      )
        .addTo(routeLayerGroup)
        .bindPopup('Участок до точки объекта (вне дорожной сети маршрутизатора)')
    }

    if (startPoint.value) {
      L.circleMarker([startPoint.value.lat, startPoint.value.lng], {
        renderer: routeRenderer,
        radius: 9,
        color: '#1d6b3a',
        fillColor: '#3cb371',
        fillOpacity: 1,
        weight: 2,
      })
        .addTo(routeLayerGroup)
        .bindPopup('Старт маршрута')
    }

    viaPoints.value.forEach((p, i) => {
      L.circleMarker([p.lat, p.lng], {
        renderer: routeRenderer,
        radius: 8,
        color: '#256f46',
        fillColor: '#eef8f2',
        fillOpacity: 1,
        weight: 2,
      })
        .addTo(routeLayerGroup)
        .bindPopup(`Промежуточная точка ${i + 1}`)
    })

    routeLayerGroup.addTo(map.value)

    try {
      let b = gj.getBounds()
      if (dest && routeEnd && distanceMeters(routeEnd, dest) >= GAP_DRAW_MIN_M && b.isValid()) {
        b = b.extend(L.latLng(dest.lat, dest.lng))
      }
      if (b.isValid()) {
        map.value.fitBounds(b, { padding: [40, 40], maxZoom: 15 })
      }
    } catch {
      // ignore
    }
  }

  async function executeDirections(reserve, notify) {
    if (!reserve?.latitude || !startPoint.value || !map.value) return

    routeLoading.value = true

    if (routeLayerGroup) {
      map.value.removeLayer(routeLayerGroup)
      routeLayerGroup = null
    }

    try {
      const coordinates = [
        { lat: startPoint.value.lat, lng: startPoint.value.lng },
        ...viaPoints.value.map((p) => ({ lat: p.lat, lng: p.lng })),
        { lat: reserve.latitude, lng: reserve.longitude },
      ]

      const { data } = await api.postRouteDirections({
        coordinates,
        profile: routeProfile.value,
        reserve_id: reserve.id,
      })

      if (!data?.success || !data.data?.geojson) {
        notify(data?.error || 'Не удалось построить маршрут.')
        return
      }

      routeSummary.value = {
        distance: formatDistance(data.data.distance),
        duration: formatDuration(data.data.duration),
      }
      routeSteps.value = Array.isArray(data.data.steps) ? data.data.steps : []

      drawRouteLayers(data.data.geojson, {
        lat: reserve.latitude,
        lng: reserve.longitude,
      })
      routeActive.value = true
      lastRouteGeojson.value = data.data.geojson
      const rawDist = Number(data.data.distance)
      const rawDur = Number(data.data.duration)
      lastRouteDistanceM.value = Number.isFinite(rawDist) ? rawDist : null
      lastRouteDurationS.value = Number.isFinite(rawDur) ? rawDur : null
    } catch (err) {
      notify(err?.response?.data?.error || 'Не удалось построить маршрут.')
    } finally {
      routeLoading.value = false
    }
  }

  function requestRouteFromModal(reserve, { startSource, profile }, notify) {
    notifyUser = typeof notify === 'function' ? notify : () => {}
    currentReserve.value = reserve
    routeProfile.value = profile === 'foot-walking' ? 'foot-walking' : 'driving-car'

    if (routeLayerGroup && map.value) {
      map.value.removeLayer(routeLayerGroup)
      routeLayerGroup = null
    }
    routeActive.value = false
    routeSummary.value = null
    routeSteps.value = []
    viaPoints.value = []
    startPoint.value = null
    lastRouteGeojson.value = null
    lastRouteDistanceM.value = null
    lastRouteDurationS.value = null

    if (startSource === 'geo') {
      if (!('geolocation' in navigator)) {
        notifyUser('Геолокация недоступна в этом браузере.')
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          startPoint.value = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }
          void executeDirections(reserve, notifyUser)
        },
        () => notifyUser('Не удалось получить геолокацию. Разрешите доступ или выберите точку на карте.'),
        { timeout: 15000, enableHighAccuracy: true },
      )
    } else {
      pickupRouteState.value = 'picking_start'
      pickupHint.value = 'Кликните на карте начальную точку маршрута.'
      notifyUser('Выберите точку отправления на карте.')
    }
  }

  function startPickingVia() {
    if (!map.value || !routeActive.value || !canAddVia.value) return
    pickupRouteState.value = 'picking_via'
    pickupHint.value =
      'Кликните на карте промежуточную точку. Маршрут до объекта будет пересчитан.'
  }

  function clearRoute() {
    pickupRouteState.value = 'idle'
    pickupHint.value = ''
    if (routeLayerGroup && map.value) {
      map.value.removeLayer(routeLayerGroup)
      routeLayerGroup = null
    }
    routeActive.value = false
    routeLoading.value = false
    routeSummary.value = null
    routeSteps.value = []
    startPoint.value = null
    viaPoints.value = []
    lastRouteGeojson.value = null
    lastRouteDistanceM.value = null
    lastRouteDurationS.value = null
  }

  function openExternalRoute(reserve, provider) {
    routeMenuOpen.value = false
    const lat = reserve.latitude
    const lon = reserve.longitude
    let url = ''
    if (provider === 'yandex') url = `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=auto`
    else if (provider === 'google')
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function focusRouteStep(step) {
    if (!map.value || !step) return
    const lat = Number(step.lat)
    const lng = Number(step.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const targetZoom = Math.max(map.value.getZoom(), 15)
    if (typeof map.value.flyTo === 'function') {
      map.value.flyTo([lat, lng], targetZoom, { duration: 0.55 })
    } else {
      map.value.setView([lat, lng], targetZoom)
    }
  }

  function setMapElement(el) {
    mapEl.value = el
  }

  function invalidateMapSize() {
    void nextTick(() => {
      requestAnimationFrame(() => {
        map.value?.invalidateSize({ animate: false })
      })
    })
  }

  function goToMyLocation(notify) {
    const cb = typeof notify === 'function' ? notify : () => {}
    if (!map.value) return
    if (!('geolocation' in navigator)) {
      cb('Геолокация недоступна в этом браузере.')
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
          .addTo(map.value)
          .bindPopup('Вы здесь')
        const z = Math.max(map.value.getZoom(), 13)
        if (typeof map.value.flyTo === 'function') {
          map.value.flyTo([lat, lng], z, { duration: 0.45 })
        } else {
          map.value.setView([lat, lng], z)
        }
      },
      () => cb('Не удалось определить местоположение. Проверьте доступ к геолокации.'),
      { timeout: 12000, enableHighAccuracy: false },
    )
  }

  return {
    map,
    mapEl,
    routeMenuOpen,
    routeActive,
    routeLoading,
    routeSummary,
    routeSteps,
    pickupHint,
    canAddVia,
    routeProfile,
    lastRouteGeojson,
    lastRouteDistanceM,
    lastRouteDurationS,
    initMap,
    destroyMap,
    requestRouteFromModal,
    startPickingVia,
    clearRoute,
    openExternalRoute,
    focusRouteStep,
    setMapElement,
    invalidateMapSize,
    goToMyLocation,
  }
}
