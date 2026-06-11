import { ref } from 'vue'
import L from 'leaflet'
import api from '@/services/api'
import {
  formatRouteDistanceMeters,
  formatRouteDurationSeconds,
} from '@/utils/routeFormatters'

export function useUserOrsRoute() {
  const routeMenuOpen = ref(false)
  const routeActive = ref(false)
  const routeLoading = ref(false)
  const routeSummary = ref(null)
  const routeSteps = ref([])
  const pickupHint = ref('')
  const startSource = ref('geo')
  const routeProfile = ref('driving-car')
  const lastRouteGeojson = ref(null)
  const lastRouteDistanceM = ref(null)
  const lastRouteDurationS = ref(null)
  const startPoint = ref(null)

  let pickupRouteState = 'idle'
  let routeLayerGroup = null
  let mapClickHandler = null
  let notifyUser = () => {}
  let destinationResolver = () => null

  function attachMap(map) {
    if (!map) return
    if (mapClickHandler) {
      map.off('click', mapClickHandler)
    }
    mapClickHandler = (event) => {
      if (pickupRouteState !== 'picking_start') return
      startPoint.value = { lat: event.latlng.lat, lng: event.latlng.lng }
      pickupRouteState = 'idle'
      pickupHint.value = ''
      if (!routeLayerGroup) {
        routeLayerGroup = L.layerGroup().addTo(map)
      }
      routeLayerGroup.clearLayers()
      addStartMarkerToGroup(routeLayerGroup, startPoint.value)
      void executeDirections(notifyUser).then((result) => {
        if (result?.geojson) drawUserRoute(map, result.geojson)
      })
    }
    map.on('click', mapClickHandler)
  }

  function detachMap(map) {
    if (map && mapClickHandler) {
      map.off('click', mapClickHandler)
      mapClickHandler = null
    }
  }

  function clearRouteLayer(map) {
    if (routeLayerGroup && map) {
      map.removeLayer(routeLayerGroup)
      routeLayerGroup = null
    }
  }

  function addStartMarkerToGroup(group, point) {
    if (!group || !point) return
    L.circleMarker([point.lat, point.lng], {
      radius: 9,
      color: '#1d6b3a',
      fillColor: '#3cb371',
      fillOpacity: 1,
      weight: 2,
    })
      .addTo(group)
      .bindPopup('Старт маршрута')
  }

  function drawUserRoute(map, geojson) {
    if (!map || !geojson) return
    clearRouteLayer(map)
    routeLayerGroup = L.layerGroup()
    const svg = L.svg({ padding: 0.75 })
    L.geoJSON(geojson, {
      renderer: svg,
      style: {
        color: '#256f46',
        weight: 5,
        opacity: 0.9,
        dashArray: '8 6',
      },
    }).addTo(routeLayerGroup)
    if (startPoint.value) {
      addStartMarkerToGroup(routeLayerGroup, startPoint.value)
    }
    routeLayerGroup.addTo(map)
    try {
      const bounds = L.geoJSON(geojson).getBounds()
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
      }
    } catch {
      // ignore
    }
  }

  async function executeDirections(notify) {
    const dest = destinationResolver()
    if (!dest || !startPoint.value) return

    routeLoading.value = true
    try {
      const { data } = await api.postRouteDirections({
        coordinates: [
          { lat: startPoint.value.lat, lng: startPoint.value.lng },
          { lat: dest.lat, lng: dest.lng },
        ],
        profile: routeProfile.value,
      })

      if (!data?.success || !data.data?.geojson) {
        notify(data?.error || 'Не удалось построить маршрут.')
        return
      }

      routeSummary.value = {
        distance: formatRouteDistanceMeters(data.data.distance),
        duration: formatRouteDurationSeconds(data.data.duration),
      }
      routeSteps.value = Array.isArray(data.data.steps) ? data.data.steps : []
      lastRouteGeojson.value = data.data.geojson
      lastRouteDistanceM.value = Number.isFinite(Number(data.data.distance))
        ? Number(data.data.distance)
        : null
      lastRouteDurationS.value = Number.isFinite(Number(data.data.duration))
        ? Number(data.data.duration)
        : null
      routeActive.value = true
      routeMenuOpen.value = true
      return data.data
    } catch (err) {
      notify(err?.response?.data?.error || 'Не удалось построить маршрут.')
      return null
    } finally {
      routeLoading.value = false
    }
  }

  function requestBuild(map, { profile }, notify, getDestination) {
    notifyUser = typeof notify === 'function' ? notify : () => {}
    destinationResolver = typeof getDestination === 'function' ? getDestination : () => null
    routeProfile.value = profile === 'foot-walking' ? 'foot-walking' : 'driving-car'
    startPoint.value = null
    routeActive.value = false
    routeSummary.value = null
    routeSteps.value = []
    lastRouteGeojson.value = null
    lastRouteDistanceM.value = null
    lastRouteDurationS.value = null
    clearRouteLayer(map)

    if (startSource.value === 'geo') {
      if (!('geolocation' in navigator)) {
        notifyUser('Геолокация недоступна в этом браузере.')
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          startPoint.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          void executeDirections(notifyUser).then((result) => {
            if (result && map) drawUserRoute(map, result.geojson)
          })
        },
        () =>
          notifyUser('Не удалось получить геолокацию. Разрешите доступ или выберите точку на карте.'),
        { timeout: 15000, enableHighAccuracy: true },
      )
    } else {
      routeMenuOpen.value = false
      pickupRouteState = 'picking_start'
      pickupHint.value = 'Кликните на карте начальную точку маршрута.'
      notifyUser('Выберите точку отправления на карте.')
    }
  }

  function clearUserRoute(map) {
    pickupRouteState = 'idle'
    pickupHint.value = ''
    clearRouteLayer(map)
    routeActive.value = false
    routeLoading.value = false
    routeSummary.value = null
    routeSteps.value = []
    startPoint.value = null
    lastRouteGeojson.value = null
    lastRouteDistanceM.value = null
    lastRouteDurationS.value = null
  }

  function focusRouteStep(map, step) {
    if (!map || !step) return
    const lat = Number(step.lat)
    const lng = Number(step.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const targetZoom = Math.max(map.getZoom(), 15)
    if (typeof map.flyTo === 'function') {
      map.flyTo([lat, lng], targetZoom, { duration: 0.55 })
    } else {
      map.setView([lat, lng], targetZoom)
    }
  }

  return {
    routeMenuOpen,
    routeActive,
    routeLoading,
    routeSummary,
    routeSteps,
    pickupHint,
    startSource,
    startPoint,
    routeProfile,
    lastRouteGeojson,
    attachMap,
    detachMap,
    requestBuild,
    clearUserRoute,
    focusRouteStep,
    drawUserRoute,
  }
}
