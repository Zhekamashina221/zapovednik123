const db = require('../../database');

function trackEvent({ userId = null, reserveId = null, eventType, payload = null }) {
  try {
    db.prepare(
      `INSERT INTO analytics_events (user_id, reserve_id, event_type, payload)
       VALUES (?, ?, ?, ?)`
    ).run(userId, reserveId, eventType, payload ? JSON.stringify(payload) : null);
  } catch (_error) {
    // Analytics must not break business flow.
  }
}

module.exports = {
  trackEvent,
};
