/** Logs persistence and physical-store diagnostics. */
const LogsRepository = (() => {
  function rows() {
    return RepositoryBase.mapRows(LOG_SCHEMA, RepositoryBase.rows(LOG_SCHEMA));
  }

  function append(record) {
    return RepositoryWriter.insert(LOG_SCHEMA, record);
  }

  function findById(logId) {
    return rows().find((row) => String(row.ID) === String(logId)) || null;
  }

  function inspectPhysicalStore() {
    let sheet;
    try {
      sheet = Database.sheet(LOG_SCHEMA.TABLE);
    } catch (error) {
      return Object.freeze({
        sheetExists: false,
        lastRow: 0,
        lastColumn: 0,
        headers: Object.freeze([]),
        rawRows: Object.freeze([]),
        rows: Object.freeze([]),
        formulas: Object.freeze([]),
      });
    }

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const headers = lastColumn
      ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
      : [];
    const rawRows = lastRow > 1
      ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
      : [];
    const formulas = rawRows.length
      ? sheet.getRange(2, 1, rawRows.length, lastColumn).getFormulas()
      : [];

    return Object.freeze({
      sheetExists: true,
      lastRow,
      lastColumn,
      headers: Object.freeze(headers),
      rawRows: Object.freeze(rawRows),
      rows: Object.freeze(RepositoryBase.mapRows(LOG_SCHEMA, rawRows)),
      formulas: Object.freeze(formulas),
    });
  }

  return Object.freeze({ rows, append, findById, inspectPhysicalStore });
})();

/** Read-only persisted log-level adapter. Deliberately independent of SettingsService and LogsService. */
const LogLevelProvider = (() => {
  const KEY = "LOG_LEVEL";
  const DEFAULT_LEVEL = "INFO";
  const LEVELS = Object.freeze(["ERROR", "WARN", "INFO", "DEBUG"]);
  const CACHE_KEY = "IPS:Settings:resolved:v1:key:LOG_LEVEL";

  function effectiveValue(row) {
    if (!row || row[SETTINGS_SCHEMA.SYSTEM.IS_DELETED] === true || row[SETTINGS_SCHEMA.SYSTEM.IS_ACTIVE] === false) return DEFAULT_LEVEL;
    const value = String(row[SETTINGS_FIELDS.VALUE] == null ? "" : row[SETTINGS_FIELDS.VALUE]);
    return LEVELS.indexOf(value) >= 0 ? value : DEFAULT_LEVEL;
  }

  function resolve(dependencies = {}) {
    const base = dependencies.base || RepositoryBase;
    const cache = dependencies.cache || CacheService.getScriptCache();
    let cached = null;
    try { cached = cache.get(CACHE_KEY); } catch (error) { cached = null; }
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && LEVELS.indexOf(parsed.value) >= 0) return parsed.value;
      } catch (error) { /* fall through to the authoritative persisted row */ }
    }
    const rows = base.mapRows(SETTINGS_SCHEMA, base.rows(SETTINGS_SCHEMA));
    const matches = rows.filter((row) => String(row[SETTINGS_FIELDS.KEY] || "").trim() === KEY);
    if (matches.length > 1) throw new Error(`Duplicate physical setting key: ${KEY}.`);
    return effectiveValue(matches[0] || null);
  }

  return Object.freeze({ KEY, DEFAULT_LEVEL, LEVELS, resolve });
})();
