/** Базовый публичный URL сайта (без завершающего слэша). */
export function getPublicSiteBase() {
  const fromEnv = String(import.meta.env.VITE_PUBLIC_SITE_URL || '').trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return ''
}

export function isPublicSiteUrlConfigured() {
  return Boolean(String(import.meta.env.VITE_PUBLIC_SITE_URL || '').trim())
}

/** Публичная ссылка на карточку объекта. */
export function buildReservePublicUrl(id, { fromQr = false } = {}) {
  const base = getPublicSiteBase()
  const path = `/reserve/${encodeURIComponent(String(id))}`
  const url = `${base}${path}`
  return fromQr ? `${url}?from=qr` : url
}
