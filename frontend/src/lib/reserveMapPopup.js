/** HTML попапа маркера на карте + обработчики. */

const ICON_EYE = '<i class="bi bi-eye" aria-hidden="true"></i>'
const ICON_STAR = '<i class="bi bi-star-fill" aria-hidden="true"></i>'
const ICON_IMAGE = '<i class="bi bi-image" aria-hidden="true"></i>'
const ICON_GEO = '<i class="bi bi-geo-alt-fill" aria-hidden="true"></i>'

export const MOBILE_POPUP_MAX = 768

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildLocationLine(reserve) {
  const region = String(reserve?.region || '').trim()
  const district = String(reserve?.district || '').trim()
  if (region && district) return `${region}, ${district}`
  return region || district || ''
}

function formatRating(reserve) {
  const reviews = Number(reserve?.reviews_count) || 0
  const avg = Number(reserve?.avg_rating)
  if (reviews <= 0 || !Number.isFinite(avg) || avg <= 0) return null
  return avg.toFixed(1)
}

function buildStatsHtml(reserve) {
  const views = Number(reserve?.views_count) || 0
  const rating = formatRating(reserve)
  if (views <= 0 && !rating) {
    return '<div class="reserve-popup__stats reserve-popup__stats--empty"></div>'
  }
  const viewsHtml =
    views > 0
      ? `<span class="reserve-popup__stat">${ICON_EYE}<span>${views}</span></span>`
      : ''
  const ratingHtml = rating
    ? `<span class="reserve-popup__stat reserve-popup__stat--rating">${ICON_STAR}<span>${rating}</span></span>`
    : ''
  return `<div class="reserve-popup__stats">${viewsHtml}${ratingHtml}</div>`
}

function buildThumbHtml(photo) {
  if (photo) {
    return `<div class="reserve-popup__thumb"><img src="${photo}" alt="" class="reserve-popup__img" loading="lazy" /></div>`
  }
  return `<div class="reserve-popup__thumb reserve-popup__thumb--empty"><span class="reserve-popup__ph-ic" aria-hidden="true">${ICON_IMAGE}</span></div>`
}

/** Десктоп: прежняя карточка (фото сверху). */
export function buildReserveMapPopupHtmlDesktop(reserve, typeConfig, opts) {
  const { stopIndex } = opts
  const prefix = stopIndex != null ? `${stopIndex}. ` : ''
  const name = escapeHtml(reserve.name)
  const typeLabel = escapeHtml(typeConfig.label || reserve.type)
  const location = escapeHtml(buildLocationLine(reserve))
  const photo = reserve.photos?.[0] ? escapeHtml(reserve.photos[0]) : ''
  const color = escapeHtml(typeConfig.color || '#2e8b57')
  const id = Number(reserve.id) || 0

  const media = photo
    ? `<div class="reserve-popup__media"><img src="${photo}" alt="" class="reserve-popup__img" loading="lazy" /><button type="button" class="reserve-popup__close" aria-label="Закрыть">×</button><span class="reserve-popup__badge" style="background:${color}"></span></div>`
    : `<div class="reserve-popup__media reserve-popup__media--empty"><div class="reserve-popup__placeholder"><span class="reserve-popup__ph-ic" aria-hidden="true">${ICON_IMAGE}</span><span class="reserve-popup__ph-text">Нет фото</span></div><button type="button" class="reserve-popup__close" aria-label="Закрыть">×</button><span class="reserve-popup__badge" style="background:${color}"></span></div>`

  const locationHtml = location
    ? `<p class="reserve-popup__location"><span class="reserve-popup__pin" aria-hidden="true">${ICON_GEO}</span>${location}</p>`
    : ''

  return `
    <div class="reserve-popup reserve-popup--desktop">
      ${media}
      <div class="reserve-popup__body">
        <h3 class="reserve-popup__title">${prefix}${name}</h3>
        <p class="reserve-popup__type">${typeLabel}</p>
        ${locationHtml}
        <button type="button" class="reserve-popup__link popup-btn" data-id="${id}">Подробнее →</button>
      </div>
    </div>
  `
}

/** Мобилка: bottom sheet (фото слева, кнопка «Смотреть»). */
export function buildReserveMapPopupHtmlMobile(reserve, typeConfig, opts) {
  const { stopIndex } = opts
  const prefix = stopIndex != null ? `${stopIndex}. ` : ''
  const name = escapeHtml(reserve.name)
  const typeLabel = escapeHtml((typeConfig.label || reserve.type || 'Объект').toUpperCase())
  const region = escapeHtml(String(reserve?.region || '').trim())
  const district = escapeHtml(String(reserve?.district || '').trim())
  const photo = reserve.photos?.[0] ? escapeHtml(reserve.photos[0]) : ''
  const color = escapeHtml(typeConfig.color || '#2e8b57')
  const id = Number(reserve.id) || 0

  const regionHtml = region ? `<p class="reserve-popup__region">${region}</p>` : ''
  const districtHtml = district ? `<p class="reserve-popup__district">${district}</p>` : ''

  return `
    <div class="reserve-popup reserve-popup--mobile">
      <div class="reserve-popup__handle" aria-hidden="true"></div>
      <button type="button" class="reserve-popup__close" aria-label="Закрыть">×</button>
      <div class="reserve-popup__main">
        ${buildThumbHtml(photo)}
        <div class="reserve-popup__info">
          <span class="reserve-popup__type-pill" style="--type-color: ${color}">
            <span class="reserve-popup__type-dot" aria-hidden="true"></span>
            ${typeLabel}
          </span>
          <h3 class="reserve-popup__title">${prefix}${name}</h3>
          ${regionHtml}
          ${districtHtml}
        </div>
      </div>
      <div class="reserve-popup__footer">
        ${buildStatsHtml(reserve)}
        <button type="button" class="reserve-popup__cta popup-btn" data-id="${id}">Смотреть</button>
      </div>
    </div>
  `
}

export function buildReserveMapPopupHtml(reserve, typeConfig, opts) {
  if (isMobileMapPopup()) {
    return buildReserveMapPopupHtmlMobile(reserve, typeConfig, opts)
  }
  return buildReserveMapPopupHtmlDesktop(reserve, typeConfig, opts)
}

export function isMobileMapPopup() {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_POPUP_MAX
}

let sheetRepinHandler = null
let sheetRepinMap = null

function applyReservePopupBottomSheet(popup, map) {
  if (!popup || !map || !isMobileMapPopup()) return

  const el = popup.getElement?.()
  const container = map.getContainer()
  if (!el || !container) return

  if (el.parentElement !== container) {
    container.appendChild(el)
  }

  el.classList.add('reserve-popup-wrapper--sheet')

  const mapW = container.offsetWidth
  el.style.setProperty('position', 'absolute', 'important')
  el.style.setProperty('left', '0', 'important')
  el.style.setProperty('right', '0', 'important')
  el.style.setProperty('bottom', '0', 'important')
  el.style.setProperty('top', 'auto', 'important')
  el.style.setProperty('width', `${mapW}px`, 'important')
  el.style.setProperty('max-width', `${mapW}px`, 'important')
  el.style.setProperty('margin', '0', 'important')
  el.style.setProperty('margin-left', '0', 'important')
  el.style.setProperty('transform', 'none', 'important')
  el.style.setProperty('z-index', '1000', 'important')
}

function hookReservePopupBottomSheetPosition(popup, map) {
  if (!popup || popup._reserveSheetUpdate) return

  popup._reserveSheetUpdate = popup._updatePosition
  popup._updatePosition = function reserveSheetUpdatePosition() {
    if (isMobileMapPopup()) {
      applyReservePopupBottomSheet(this, map)
      return
    }
    popup._reserveSheetUpdate.call(this)
  }
}

function unhookReservePopupBottomSheetPosition(popup) {
  if (!popup?._reserveSheetUpdate) return
  popup._updatePosition = popup._reserveSheetUpdate
  delete popup._reserveSheetUpdate
}

export function pinReservePopupAsBottomSheet(popup, map) {
  if (!popup || !map || !isMobileMapPopup()) return

  hookReservePopupBottomSheetPosition(popup, map)
  applyReservePopupBottomSheet(popup, map)
  requestAnimationFrame(() => applyReservePopupBottomSheet(popup, map))

  if (sheetRepinHandler && sheetRepinMap && sheetRepinMap !== map) {
    sheetRepinMap.off('resize', sheetRepinHandler)
  }
  sheetRepinHandler = () => applyReservePopupBottomSheet(popup, map)
  sheetRepinMap = map
  map.off('resize', sheetRepinHandler)
  map.on('resize', sheetRepinHandler)
}

export function unpinReservePopupAsBottomSheet(map, popup) {
  if (popup) {
    unhookReservePopupBottomSheetPosition(popup)
    popup.getElement?.()?.classList.remove('reserve-popup-wrapper--sheet')
  }
  if (map && sheetRepinHandler) {
    map.off('resize', sheetRepinHandler)
  }
  sheetRepinHandler = null
  sheetRepinMap = null
}

/**
 * @param {import('leaflet').Map} map
 * @param {{ onSelect?: (id: number) => void }} handlers
 */
export function attachReserveMapPopupHandlers(map, handlers = {}) {
  if (!map) return
  map.off('popupopen')
  map.off('popupclose')
  map.on('popupopen', (e) => {
    if (isMobileMapPopup()) {
      e.popup.options.autoPan = false
      pinReservePopupAsBottomSheet(e.popup, map)
    }
    const el = e.popup.getElement()
    if (!el) return

    const btn = el.querySelector('.popup-btn')
    if (btn) {
      btn.onclick = () => {
        const id = +btn.dataset.id
        if (id) {
          handlers.onSelect?.(id)
          map.closePopup()
        }
      }
    }

    el.querySelector('.reserve-popup__close')?.addEventListener('click', () => {
      map.closePopup()
    })
  })
  map.on('popupclose', (e) => {
    unpinReservePopupAsBottomSheet(map, e.popup)
  })
}

export function getReserveMapPopupOptions() {
  const mobile = isMobileMapPopup()
  return {
    className: mobile ? 'reserve-popup-wrapper reserve-popup-wrapper--sheet' : 'reserve-popup-wrapper',
    maxWidth: mobile ? 480 : 300,
    minWidth: mobile ? 280 : 260,
    closeButton: false,
    autoPan: !mobile,
    autoPanPaddingTopLeft: [12, 12],
    autoPanPaddingBottomRight: mobile ? [12, 12] : [12, 12],
  }
}
