/** Форматирование дистанции/времени (как frontend/src/lib/curatedRouteMapDraw.js). */

function formatRouteDistanceMeters(m) {
  if (!Number.isFinite(m)) return null;
  if (m >= 1000) return `~${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} км`;
  return `~${Math.round(m)} м`;
}

function formatRouteDurationSeconds(sec) {
  if (!Number.isFinite(sec)) return null;
  const minutes = Math.round(sec / 60);
  if (minutes < 60) return `~${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const mm = minutes % 60;
  if (mm) return `~${h} ч ${mm} мин`;
  return `~${h} ч`;
}

function formatRouteDurationForDriving(sec) {
  if (!Number.isFinite(sec)) return null;
  const base = formatRouteDurationSeconds(sec);
  if (!base) return null;
  if (base.includes('ч')) return `${base} за рулём`;
  return `${base} в пути`;
}

function formatListDuration(sec, profile) {
  if (!Number.isFinite(sec)) return null;
  if (profile === 'driving-car') return formatRouteDurationForDriving(sec);
  return formatRouteDurationSeconds(sec);
}

module.exports = {
  formatRouteDistanceMeters,
  formatRouteDurationSeconds,
  formatListDuration,
};
