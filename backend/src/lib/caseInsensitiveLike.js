const LIKE_ESCAPE_CHAR = '!';

/**
 * Escape %, _, and the escape character for SQLite LIKE ... ESCAPE '!'
 */
function escapeSqliteLikePattern(value) {
  const esc = LIKE_ESCAPE_CHAR;
  return String(value)
    .replace(new RegExp(`\\${esc}`, 'g'), esc + esc)
    .replace(/%/g, esc + '%')
    .replace(/_/g, esc + '_');
}

/**
 * Requires custom SQL function unicode_lower (see database.js).
 * @param {string} nameColumn e.g. "reserves.name" or "name"
 * @param {string} descColumn e.g. "reserves.description" or "description"
 */
function reserveNameDescriptionSearchSql(nameColumn, descColumn) {
  const e = LIKE_ESCAPE_CHAR;
  return `(unicode_lower(${nameColumn}) LIKE ? ESCAPE '${e}' OR unicode_lower(COALESCE(${descColumn}, '')) LIKE ? ESCAPE '${e}')`;
}

/**
 * @param {string} search raw user search string
 * @returns {{ like: string } | null} two identical bind values for name and description
 */
function reserveSearchBindParams(search) {
  const trimmed = String(search || '').trim();
  if (!trimmed) return null;
  const like = `%${escapeSqliteLikePattern(trimmed.toLowerCase())}%`;
  return { like };
}

module.exports = {
  escapeSqliteLikePattern,
  reserveNameDescriptionSearchSql,
  reserveSearchBindParams,
};
