const db = require('../../database');
const {
  formatRouteDistanceMeters,
  formatListDuration,
} = require('./routeFormat');

const ORS_BASE = 'https://api.openrouteservice.org/v2/directions';
const ALLOWED_PROFILES = new Set(['driving-car', 'foot-walking']);
const MAX_ROUTE_POINTS = 10;

const SNAP_RADIUS_MIN = 50;
const SNAP_RADIUS_MAX = 3000;
const SNAP_RADIUS_DEFAULT = 1000;

function resolveSnapRadiusMeters() {
  const raw = process.env.ORS_SNAP_RADIUS_METERS;
  if (raw === undefined || String(raw).trim() === '') return SNAP_RADIUS_DEFAULT;
  const n = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n)) return SNAP_RADIUS_DEFAULT;
  return Math.min(SNAP_RADIUS_MAX, Math.max(SNAP_RADIUS_MIN, n));
}

function parseCoordinateEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function lineStringCoordinateList(geometry) {
  if (!geometry?.coordinates) return [];
  if (geometry.type === 'LineString') return geometry.coordinates;
  if (geometry.type === 'MultiLineString') {
    const parts = geometry.coordinates;
    if (!Array.isArray(parts)) return [];
    return parts.reduce((acc, line) => acc.concat(line), []);
  }
  return [];
}

function pointAt(coordinates, idx) {
  if (!coordinates.length || !Number.isFinite(idx)) return null;
  const i = Math.max(0, Math.min(coordinates.length - 1, Math.floor(idx)));
  const c = coordinates[i];
  if (!Array.isArray(c) || c.length < 2) return null;
  const lng = Number(c[0]);
  const lat = Number(c[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function extractSteps(properties, geometry) {
  const coordinates = lineStringCoordinateList(geometry);
  const stepsOut = [];
  const segments = properties?.segments;
  if (!Array.isArray(segments)) return stepsOut;
  for (const seg of segments) {
    if (!Array.isArray(seg.steps)) continue;
    for (const step of seg.steps) {
      const instruction = typeof step.instruction === 'string' ? step.instruction.trim() : '';
      if (!instruction) continue;
      const wp = step.way_points;
      let idx = 0;
      if (Array.isArray(wp) && wp.length > 0 && Number.isFinite(Number(wp[0]))) {
        idx = Number(wp[0]);
      }
      const at = pointAt(coordinates, idx);
      stepsOut.push({
        instruction,
        distance: Number.isFinite(step.distance) ? step.distance : undefined,
        duration: Number.isFinite(step.duration) ? step.duration : undefined,
        ...(at ? { lat: at.lat, lng: at.lng } : {}),
      });
    }
  }
  return stepsOut;
}

function resolveCoordinatesForReserveIds(reserveIds) {
  const stmt = db.prepare('SELECT id, latitude, longitude FROM reserves WHERE id = ?');
  const coordinates = [];
  for (const id of reserveIds) {
    const row = stmt.get(id);
    if (!row) {
      return { ok: false, error: `Объект с id ${id} не найден` };
    }
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: `У объекта id ${id} нет координат на карте` };
    }
    coordinates.push({ lat, lng });
  }
  return { ok: true, coordinates };
}

/**
 * @param {Array<{lat:number,lng:number}>} coordinates
 * @param {string} profile
 */
async function fetchOrsDirections(coordinates, profile) {
  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'Сервис маршрутизации не настроен (ORS_API_KEY).' };
  }

  const prof = typeof profile === 'string' ? profile.trim() : '';
  if (!ALLOWED_PROFILES.has(prof)) {
    return { ok: false, error: 'profile: driving-car или foot-walking' };
  }

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return { ok: false, error: 'Нужно минимум 2 точки с координатами' };
  }
  if (coordinates.length > MAX_ROUTE_POINTS) {
    return { ok: false, error: `Не более ${MAX_ROUTE_POINTS} точек` };
  }

  const orsCoordinates = [];
  for (let i = 0; i < coordinates.length; i += 1) {
    const parsed = parseCoordinateEntry(coordinates[i]);
    if (!parsed) {
      return { ok: false, error: `Неверные координаты в точке ${i + 1}` };
    }
    orsCoordinates.push([parsed.lng, parsed.lat]);
  }

  const snapRadiusM = resolveSnapRadiusMeters();
  const radiuses = orsCoordinates.map(() => snapRadiusM);

  const body = JSON.stringify({
    coordinates: orsCoordinates,
    radiuses,
    language: 'ru',
    units: 'm',
    geometry: true,
  });

  const url = `${ORS_BASE}/${encodeURIComponent(prof)}/geojson`;

  try {
    const orsResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json, application/geo+json',
      },
      body,
    });

    const text = await orsResponse.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: 'Неожиданный ответ службы маршрутизации.' };
    }

    if (!orsResponse.ok) {
      const hint =
        typeof parsed?.error?.message === 'string'
          ? parsed.error.message
          : typeof parsed?.message === 'string'
            ? parsed.message
            : 'Не удалось построить маршрут.';
      return { ok: false, error: hint };
    }

    if (parsed?.type !== 'FeatureCollection' || !Array.isArray(parsed.features)) {
      return { ok: false, error: 'Неверный формат GeoJSON от ORS.' };
    }

    const routeFeature =
      parsed.features.find((f) => f.geometry?.type === 'LineString') ||
      parsed.features.find((f) => f.geometry?.type === 'MultiLineString');

    if (!routeFeature?.properties?.summary || !routeFeature.geometry) {
      return { ok: false, error: 'В ответе ORS нет геометрии или сводки.' };
    }

    const summary = routeFeature.properties.summary;
    const distanceM = summary.distance !== undefined ? Number(summary.distance) : NaN;
    const durationS = summary.duration !== undefined ? Number(summary.duration) : NaN;

    if (!Number.isFinite(distanceM) || !Number.isFinite(durationS)) {
      return { ok: false, error: 'ORS не вернул расстояние или время.' };
    }

    const geojson = {
      type: 'FeatureCollection',
      features: [routeFeature],
    };

    const steps = extractSteps(routeFeature.properties, routeFeature.geometry);

    return {
      ok: true,
      data: {
        geojson,
        distance: distanceM,
        duration: durationS,
        distanceM: Math.round(distanceM),
        durationS: Math.round(durationS),
        steps,
      },
    };
  } catch (err) {
    console.error('ORS directions error:', err);
    return { ok: false, error: 'Сервис маршрутизации временно недоступен.' };
  }
}

async function computeCuratedRouteMetrics(reserveIds, profile) {
  const coordResult = resolveCoordinatesForReserveIds(reserveIds);
  if (!coordResult.ok) {
    return { ok: false, error: coordResult.error };
  }

  const orsResult = await fetchOrsDirections(coordResult.coordinates, profile);
  if (!orsResult.ok) {
    return { ok: false, error: orsResult.error };
  }

  const { distanceM, durationS } = orsResult.data;
  return {
    ok: true,
    distanceM,
    durationS,
    listDistance: formatRouteDistanceMeters(distanceM),
    listDuration: formatListDuration(durationS, profile),
    geojson: orsResult.data.geojson,
  };
}

module.exports = {
  ALLOWED_PROFILES,
  MAX_ROUTE_POINTS,
  parseCoordinateEntry,
  extractSteps,
  resolveCoordinatesForReserveIds,
  fetchOrsDirections,
  computeCuratedRouteMetrics,
};
