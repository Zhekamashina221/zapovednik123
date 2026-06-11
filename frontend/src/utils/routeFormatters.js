export function stepHasCoords(step) {
  return Number.isFinite(Number(step?.lat)) && Number.isFinite(Number(step?.lng))
}

export function formatLegDistance(meters) {
  if (meters == null || !Number.isFinite(Number(meters))) return ''
  const m = Number(meters)
  if (m >= 1000) return `${(m / 1000).toFixed(1)} км`
  return `${Math.round(m)} м`
}

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

export function safeExportBasename(name) {
  const base = String(name || 'marshrut')
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}\-_]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'marshrut'
}
