const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { trackEvent } = require('../services/analytics');
const { fetchOrsDirections, parseCoordinateEntry } = require('../services/curatedRouteOrs');

const router = express.Router();

const MAX_ROUTE_POINTS = 10;

router.post('/directions', optionalAuth, async (req, res) => {
  const { coordinates: coordsIn, profile: profileRaw = 'driving-car' } = req.body || {};

  const profile = typeof profileRaw === 'string' ? profileRaw.trim() : '';

  if (!Array.isArray(coordsIn) || coordsIn.length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Передайте минимум две координаты: старт и финиш.',
    });
  }
  if (coordsIn.length > MAX_ROUTE_POINTS) {
    return res.status(400).json({
      success: false,
      error: `Не более ${MAX_ROUTE_POINTS} точек в маршруте.`,
    });
  }

  const coordinates = [];
  for (let i = 0; i < coordsIn.length; i += 1) {
    const parsed = parseCoordinateEntry(coordsIn[i]);
    if (!parsed) {
      return res.status(400).json({
        success: false,
        error: `Неверные координаты в элементе ${i + 1} (lat, lng в допустимых диапазонах).`,
      });
    }
    coordinates.push(parsed);
  }

  const result = await fetchOrsDirections(coordinates, profile);
  if (!result.ok) {
    const status = result.error?.includes('не настроен') ? 503 : 502;
    return res.status(status).json({ success: false, error: result.error });
  }

  if (req.body?.reserve_id != null && Number.isFinite(Number(req.body.reserve_id))) {
    trackEvent({
      userId: req.user?.userId ?? null,
      reserveId: Number(req.body.reserve_id),
      eventType: 'route_built_openrouteservice',
      payload: { profile, points_count: coordsIn.length },
    });
  }

  return res.json({
    success: true,
    data: {
      geojson: result.data.geojson,
      distance: result.data.distance,
      duration: result.data.duration,
      steps: result.data.steps,
    },
  });
});

module.exports = router;
