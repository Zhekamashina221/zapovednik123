/** Базовые тайловые слои Leaflet (без API-ключей). */
export const MAP_BASE_LAYERS = [
  {
    id: 'osm',
    label: 'Схема',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  {
    id: 'light',
    label: 'Светлая',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap, &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
    subdomains: 'abcd',
  },
  {
    id: 'satellite',
    label: 'Спутник',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
]

export const DEFAULT_MAP_LAYER_ID = 'osm'

const STORAGE_KEY = 'zapovednik.mapLayer'

export function loadSavedMapLayerId() {
  try {
    const id = localStorage.getItem(STORAGE_KEY)
    if (id && MAP_BASE_LAYERS.some((l) => l.id === id)) return id
  } catch {
    /* ignore */
  }
  return DEFAULT_MAP_LAYER_ID
}

export function saveMapLayerId(id) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

export function getMapLayerById(id) {
  return MAP_BASE_LAYERS.find((l) => l.id === id) || MAP_BASE_LAYERS[0]
}
