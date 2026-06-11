export function buildRouteToReserve(reserve) {
  if (!reserve?.latitude || !reserve?.longitude) {
    alert('Координаты объекта не указаны')
    return
  }

  const lat = reserve.latitude
  const lon = reserve.longitude

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        openRoute(latitude, longitude, lat, lon)
      },
      () => {
        openYandexFallback(lat, lon)
      },
      { timeout: 10000 },
    )
  } else {
    openYandexFallback(lat, lon)
  }
}

function openRoute(fromLat, fromLon, toLat, toLon) {
  const url = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${fromLat},${fromLon};${toLat},${toLon}`
  window.open(url, '_blank')
}

function openYandexFallback(lat, lon) {
  const url = `https://yandex.by/maps/?rtext=~${lat},${lon}&rtt=auto`
  window.open(url, '_blank')
}
