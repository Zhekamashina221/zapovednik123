const express = require('express');
const db = require('../../database');

const router = express.Router();

router.get('/health', (_req, res) => {
  return res.json({ success: true, status: 'ok' });
});

router.get('/types', (_req, res) => {
  try {
    const rows = db
      .prepare('SELECT DISTINCT type FROM reserves WHERE type IS NOT NULL ORDER BY type')
      .all();
    return res.json({ success: true, data: rows.map((row) => row.type) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/regions', (_req, res) => {
  try {
    const rows = db
      .prepare('SELECT DISTINCT region FROM reserves WHERE region IS NOT NULL ORDER BY region')
      .all();
    return res.json({ success: true, data: rows.map((row) => row.region) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.get('/filters', (_req, res) => {
  try {
    const regions = db
      .prepare('SELECT DISTINCT region FROM reserves WHERE region IS NOT NULL ORDER BY region')
      .all()
      .map((row) => row.region);

    const districts = db
      .prepare('SELECT DISTINCT district FROM reserves WHERE district IS NOT NULL ORDER BY district')
      .all()
      .map((row) => row.district);

    const regionDistrictPairs = db
      .prepare(
        `SELECT DISTINCT region, district
         FROM reserves
         WHERE region IS NOT NULL AND TRIM(region) != ''
           AND district IS NOT NULL AND TRIM(district) != ''
         ORDER BY region, district`,
      )
      .all()
      .map((row) => ({ region: row.region, district: row.district }));

    return res.json({ success: true, regions, districts, regionDistrictPairs });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
