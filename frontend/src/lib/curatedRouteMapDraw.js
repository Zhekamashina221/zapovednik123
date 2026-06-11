/**
 * Отрисовка линии маршрута ORS на Leaflet для страницы «Готовые маршруты».
 * Логика согласована с useReserveMap.js, но файл независим — useReserveMap не трогаем.
 */
import L from 'leaflet'

const GAP_DRAW_MIN_M = 12

export function formatRouteDistanceMeters(m) {
  if (!Number.isFinite(m)) return '—'
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} км`
  return `${Math.round(m)} м`
}

export function formatRouteDurationSeconds(sec) {
  if (!Number.isFinite(sec)) return '—'
  const minutes = Math.round(sec / 60)
  if (minutes < 60) return `${minutes} мин`
  const h = Math.floor(minutes / 60)
  const mm = minutes % 60
  return mm ? `${h} ч ${mm} мин` : `${h} ч`
}

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

/**
 * @param {L.Map} map
 * @param {object} geojson FeatureCollection от ORS
 * @param {{ lat: number, lng: number } | null} finalDestination — последняя точка цепочки (для пунктирного хвоста)
 * @returns {{ layerGroup: L.LayerGroup, remove: () => void }}
 */
export function drawCuratedRouteOnMap(map, geojson, finalDestination) {
  const layerGroup = L.layerGroup()
  const routeRenderer = L.svg({ padding: 0.75 })
  const gj = L.geoJSON(geojson, {
    renderer: routeRenderer,
    style: { color: '#2e8b57', weight: 6, opacity: 0.85 },
  })
  gj.addTo(layerGroup)

  const dest =
    finalDestination &&
    Number.isFinite(Number(finalDestination.lat)) &&
    Number.isFinite(Number(finalDestination.lng))
      ? { lat: Number(finalDestination.lat), lng: Number(finalDestination.lng) }
      : null
  const routeEnd = lastRouteVertexLatLng(geojson)

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
      .addTo(layerGroup)
      .bindPopup('Участок до точки объекта (вне дорожной сети маршрутизатора)')
  }

  layerGroup.addTo(map)

  try {
    let b = gj.getBounds()
    if (dest && routeEnd && distanceMeters(routeEnd, dest) >= GAP_DRAW_MIN_M && b.isValid()) {
      b = b.extend(L.latLng(dest.lat, dest.lng))
    }
    if (b.isValid()) {
      map.fitBounds(b, { padding: [40, 40], maxZoom: 15 })
    }
  } catch {
    // ignore
  }

  return {
    layerGroup,
    remove() {
      if (map && layerGroup) map.removeLayer(layerGroup)
    },
  }
}

/** @returns {{ lat: number, lng: number }[]} */
export function extractRoutePointsFromGeoJson(geojson) {
  const out = []
  if (!geojson?.features?.length) return out
  for (const f of geojson.features) {
    const g = f.geometry
    if (!g) continue
    if (g.type === 'LineString' && Array.isArray(g.coordinates)) {
      for (const c of g.coordinates) {
        if (Array.isArray(c) && c.length >= 2) {
          const lng = Number(c[0])
          const lat = Number(c[1])
          if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng })
        }
      }
    }
    if (g.type === 'MultiLineString' && Array.isArray(g.coordinates)) {
      for (const line of g.coordinates) {
        if (!Array.isArray(line)) continue
        for (const c of line) {
          if (Array.isArray(c) && c.length >= 2) {
            const lng = Number(c[0])
            const lat = Number(c[1])
            if (Number.isFinite(lat) && Number.isFinite(lng)) out.push({ lat, lng })
          }
        }
      }
    }
  }
  return out
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** @param {{ lat: number, lng: number }[]} points */
export function buildGpxTrack(name, points) {
  const nm = escapeXml(name || 'Маршрут')
  const body = points
    .map((p) => `    <trkpt lat="${p.lat}" lon="${p.lng}"></trkpt>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Zapovednik" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${nm}</name>
    <trkseg>
${body}
    </trkseg>
  </trk>
</gpx>
`
}

const numberedMarkerCache = new Map()

/**
 * Pin-маркер как на главной карте, с номером остановки.
 * @param {string} color
 * @param {number} index 1-based
 */
export function createNumberedReserveIcon(color, index) {
  const c = color || '#757575'
  const n = Number(index) || 1
  const key = `${c}-${n}`
  if (numberedMarkerCache.has(key)) return numberedMarkerCache.get(key)
  const icon = L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z"
        fill="${c}" stroke="white" stroke-width="2"/>
  <circle cx="14" cy="13" r="9" fill="white"/>
  <text x="14" y="17" text-anchor="middle" font-size="11" font-weight="700" fill="${c}" font-family="system-ui,sans-serif">${n}</text>
</svg>`)}`,
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -36],
  })
  numberedMarkerCache.set(key, icon)
  return icon
}

export function downloadTextFile(filename, text, mime = 'application/gpx+xml') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
