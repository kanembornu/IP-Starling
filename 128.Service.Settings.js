/** Canonical typed runtime configuration. Persisted values are overrides. */
function SettingsService(dependencies = {}) {
  const schema = dependencies.schema || SETTINGS_SCHEMA;
  const reader = dependencies.reader || RepositoryReader;
  const writer = dependencies.writer || RepositoryWriter;
  const base = dependencies.base || RepositoryBase;
  const cache = dependencies.cache || CacheService.getScriptCache();
  const repositoryCache = dependencies.repositoryCache || RepositoryCache;
  const generateId = dependencies.generateId || (() => IDGenerator.generate(schema));
  const now = dependencies.now || Utils.now;
  const currentUser = dependencies.currentUser || Utils.currentUser;
  const auditLog = dependencies.auditLog || (Object.keys(dependencies).length ? { bestEffort: () => ({ recorded: false, reason: "TEST_DEPENDENCY" }) } : AuditLogService);
  const cachePrefix = "IPS:Settings:resolved:v1";

  const canonicalRegistry = [
    definition("BUSINESS_NAME", "STRING", "Business", "Business name", "Name shown for this business.", "IP-Starling", true, { trim: true, required: true }),
    definition("BUSINESS_TIMEZONE", "ENUM", "Business", "Business timezone", "Calendar timezone for business configuration.", APP_CONFIG.TIMEZONE, true, { options: [APP_CONFIG.TIMEZONE, "Asia/Jakarta"].filter((value, index, values) => values.indexOf(value) === index), required: true }),
    definition("BUSINESS_LOCALE", "ENUM", "Business", "Business locale", "Locale used by business configuration.", "id_ID", true, { options: ["id_ID"], required: true }),
    definition("BUSINESS_CURRENCY", "ENUM", "Business", "Business currency", "Currency used by business configuration.", "IDR", true, { options: ["IDR"], required: true }),
    definition("DASHBOARD_DEFAULT_RANGE", "ENUM", "Dashboard", "Default dashboard range", "Initial Dashboard range when no range is selected.", "CURRENT_MONTH", true, { options: ["TODAY", "LAST_7_DAYS", "CURRENT_MONTH", "PREVIOUS_MONTH", "CURRENT_YEAR"], required: true }),
    definition("CACHE_ENABLED", "BOOLEAN", "System", "Cache enabled", "Canonical cache preference for future runtime migration.", CACHE_CONFIG.ENABLED, true, { required: true }),
    definition("CACHE_TTL_SECONDS", "INTEGER", "System", "Cache TTL", "Cache lifetime in seconds.", CACHE_CONFIG.EXPIRE_SECONDS, true, { min: 30, max: 3600, required: true }),
    definition("DEBUG_MODE", "BOOLEAN", "System", "Debug mode", "Canonical debug preference for future runtime migration.", false, true, { required: true }),
    definition("LOG_LEVEL", "ENUM", "System", "Log level", "Minimum canonical log level.", "INFO", true, { options: ["ERROR", "WARN", "INFO", "DEBUG"], required: true }),
    definition("ROWS_PER_PAGE", "INTEGER", "UI", "Legacy rows per page", "Retained only for legacy Settings schema compatibility; current pagination does not consume this value.", PAGINATION_CONFIG.DEFAULT_LIMIT, true, { min: 5, max: PAGINATION_CONFIG.MAX_LIMIT, required: true }),
    definition("DEFAULT_PAGE_SIZE", "INTEGER", "UI", "Default Baris per Halaman", "Jumlah awal baris yang ditampilkan pada tabel data dan Logs.", PAGINATION_CONFIG.DEFAULT_LIMIT, true, { options: PAGINATION_CONFIG.ALLOWED_LIMITS, required: true }),
    definition("DATE_FORMAT", "ENUM", "UI", "Date format", "Preferred display date format.", "DD/MM/YYYY", true, { options: ["DD/MM/YYYY", "YYYY-MM-DD"], required: true }),
    definition("NUMBER_FORMAT", "ENUM", "UI", "Number format", "Preferred number format.", "ID_ID", true, { options: ["ID_ID"], required: true }),
  ];
  const registry = Object.freeze(dependencies.registry || canonicalRegistry);

  function definition(key, type, group, label, description, defaultValue, editable, rules) {
    return Object.freeze({ key, type, group, label, description, defaultValue, editable, rules: Object.freeze(rules || {}) });
  }

  function definitions() {
    return registry.map(publicDefinition);
  }

  function publicDefinition(item) {
    return {
      key: item.key, type: item.type, group: item.group, label: item.label,
      description: item.description, defaultValue: item.defaultValue,
      editable: item.editable, options: (item.rules.options || []).slice(),
      constraints: constraints(item),
    };
  }

  function constraints(item) {
    const result = { required: item.rules.required === true };
    if (typeof item.rules.min === "number") result.min = item.rules.min;
    if (typeof item.rules.max === "number") result.max = item.rules.max;
    if (item.rules.trim === true) result.trim = true;
    return result;
  }

  function findDefinition(key) {
    const normalized = String(key || "").trim();
    return registry.find((item) => item.key === normalized) || null;
  }

  function dateValue(raw) {
    const text = String(raw == null ? "" : raw);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) throw new Error("Value must use YYYY-MM-DD.");
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() + 1 !== Number(match[2]) || date.getUTCDate() !== Number(match[3])) {
      throw new Error("Value must be a real calendar date.");
    }
    return text;
  }

  function parse(def, raw) {
    if (!def) throw new Error("Unknown setting key.");
    let value;
    if (def.type === "STRING") {
      if (raw === null || typeof raw === "undefined" || typeof raw === "object") throw new Error("Value must be text.");
      value = String(raw);
      if (def.rules.trim) value = value.trim();
    } else if (def.type === "NUMBER") {
      if (raw === "" || raw === null || typeof raw === "boolean") throw new Error("Value must be a finite number.");
      value = Number(raw);
      if (!Number.isFinite(value)) throw new Error("Value must be a finite number.");
    } else if (def.type === "INTEGER") {
      if (raw === "" || raw === null || typeof raw === "boolean") throw new Error("Value must be an integer.");
      value = Number(raw);
      if (!Number.isFinite(value) || !Number.isInteger(value)) throw new Error("Value must be an integer.");
    } else if (def.type === "BOOLEAN") {
      if (raw === true || raw === "true" || raw === "TRUE") value = true;
      else if (raw === false || raw === "false" || raw === "FALSE") value = false;
      else throw new Error("Value must be true or false.");
    } else if (def.type === "DATE") {
      value = dateValue(raw);
    } else if (def.type === "JSON") {
      if (typeof raw !== "string") value = raw;
      else {
        try { value = JSON.parse(raw); } catch (error) { throw new Error("Value must be valid JSON."); }
      }
      if (value === null || typeof value !== "object") throw new Error("JSON value must be an object or array.");
    } else if (def.type === "ENUM") {
      value = String(raw == null ? "" : raw);
      if ((def.rules.options || []).indexOf(value) < 0) throw new Error("Value is not an allowed option.");
    } else {
      throw new Error("Unsupported setting type.");
    }
    if (def.rules.required && (value === "" || value === null || typeof value === "undefined")) throw new Error("Value is required.");
    if (typeof def.rules.min === "number" && value < def.rules.min) throw new Error(`Value must be at least ${def.rules.min}.`);
    if (typeof def.rules.max === "number" && value > def.rules.max) throw new Error(`Value must be at most ${def.rules.max}.`);
    if (def.rules.options && def.rules.options.indexOf(value) < 0) throw new Error("Value is not an allowed option.");
    return value;
  }

  function serialize(def, value) {
    if (def.type === "JSON") return JSON.stringify(value);
    if (def.type === "BOOLEAN") return value ? "true" : "false";
    return String(value);
  }

  function physicalRows() {
    return base.mapRows(schema, base.rows(schema));
  }

  function rowsForKey(key, sourceRows) {
    const rows = Array.isArray(sourceRows) ? sourceRows : physicalRows();
    return rows.filter((row) => String(row[SETTINGS_FIELDS.KEY] || "").trim() === key);
  }

  function activeOverride(def, sourceRows) {
    const matches = rowsForKey(def.key, sourceRows);
    if (matches.length > 1) throw new Error(`Duplicate physical setting key: ${def.key}.`);
    const row = matches[0];
    if (!row || row[schema.SYSTEM.IS_DELETED] === true || row[schema.SYSTEM.IS_ACTIVE] === false) return null;
    return row;
  }

  function resolved(def, sourceRows) {
    const row = activeOverride(def, sourceRows);
    const result = publicDefinition(def);
    if (!row) return Object.assign(result, { value: parse(def, def.defaultValue), source: "DEFAULT", valid: true });
    try {
      return Object.assign(result, { value: parse(def, row[SETTINGS_FIELDS.VALUE]), source: "PERSISTED", valid: true });
    } catch (error) {
      return Object.assign(result, { value: parse(def, def.defaultValue), source: "INVALID_PERSISTED_FALLBACK", valid: false, diagnostic: error.message });
    }
  }

  function remember(key, callback) {
    let cached = null;
    try { cached = cache.get(key); } catch (error) { cached = null; }
    if (cached) {
      try { return JSON.parse(cached); }
      catch (error) {
        try { cache.remove(key); } catch (removeError) { /* cache remains best-effort */ }
      }
    }
    const value = callback();
    try { cache.put(key, JSON.stringify(value), CACHE_CONFIG.EXPIRE_SECONDS); }
    catch (error) { /* a valid Settings read must not fail with the cache */ }
    return value;
  }

  function listResolved() {
    try {
      return Response.success(remember(`${cachePrefix}:list`, () => {
        const rows = physicalRows();
        return registry.map((def) => resolved(def, rows));
      }));
    }
    catch (error) { return Response.error(error.message); }
  }

  function getResolved(key) {
    const def = findDefinition(key);
    if (!def) return Response.error("Unknown setting key.");
    try { return Response.success(remember(`${cachePrefix}:key:${def.key}`, () => resolved(def))); }
    catch (error) { return Response.error(error.message); }
  }

  function clearCache() {
    const keys = [`${cachePrefix}:list`].concat(registry.map((item) => `${cachePrefix}:key:${item.key}`));
    cache.removeAll(keys);
    repositoryCache.clear(schema);
  }

  function buildRow(def, value) {
    const timestamp = now();
    const user = currentUser();
    return {
      [SETTINGS_FIELDS.ID]: generateId(), [SETTINGS_FIELDS.KEY]: def.key,
      [SETTINGS_FIELDS.VALUE]: serialize(def, value), [SETTINGS_FIELDS.TYPE]: def.type,
      [SETTINGS_FIELDS.GROUP]: def.group, [SETTINGS_FIELDS.LABEL]: def.label,
      [SETTINGS_FIELDS.DESCRIPTION]: def.description, [SETTINGS_FIELDS.IS_EDITABLE]: def.editable,
      [schema.SYSTEM.IS_DELETED]: false, [schema.SYSTEM.IS_ACTIVE]: true,
      [schema.SYSTEM.CREATED_AT]: timestamp, [schema.SYSTEM.CREATED_BY]: user,
      [schema.SYSTEM.UPDATED_AT]: timestamp, [schema.SYSTEM.UPDATED_BY]: user,
    };
  }

  function updateValue(key, rawValue, auditAction = "SETTINGS_UPDATE") {
    const def = findDefinition(key);
    if (!def) return Response.error("Unknown setting key.");
    if (!def.editable) return Response.error("Setting is not editable.");
    let value;
    try { value = parse(def, rawValue); } catch (error) { return Response.error(error.message, [{ field: "value", message: error.message }]); }
    const matches = rowsForKey(def.key);
    if (matches.length > 1) return Response.error(`Duplicate physical setting key: ${def.key}.`);
    const row = matches[0];
    if (row && (row[schema.SYSTEM.IS_DELETED] === true || row[schema.SYSTEM.IS_ACTIVE] === false)) return Response.error("Inactive or deleted settings cannot be updated through the UI.");
    const ok = row
      ? writer.update(schema, row[SETTINGS_FIELDS.ID], { [SETTINGS_FIELDS.VALUE]: serialize(def, value), [schema.SYSTEM.UPDATED_AT]: now(), [schema.SYSTEM.UPDATED_BY]: currentUser() })
      : writer.insert(schema, buildRow(def, value));
    if (!ok) return Response.error("Setting could not be saved.");
    clearCache();
    const result = getResolved(def.key);
    if (result.success && auditAction) {
      const hidden = LogSanitizer.isSensitiveKey(def.key);
      auditLog.bestEffort({ level: "INFO", module: "Settings", action: auditAction, entityType: "Setting", entityId: def.key, status: "SUCCESS", beforeData: { key: def.key, value: hidden ? LogSanitizer.REDACTED : row ? row[SETTINGS_FIELDS.VALUE] : def.defaultValue, source: row ? "PERSISTED" : "DEFAULT" }, afterData: { key: def.key, value: hidden ? LogSanitizer.REDACTED : result.data.value, source: result.data.source }, message: `Setting ${def.key} ${auditAction === "SETTINGS_RESET" ? "reset" : "updated"}.`, source: "SettingsService" });
    }
    return result;
  }

  function resetToDefault(key) {
    const def = findDefinition(key);
    if (!def) return Response.error("Unknown setting key.");
    if (!def.editable) return Response.error("Setting is not editable.");
    return updateValue(def.key, def.defaultValue, "SETTINGS_RESET");
  }

  function seedMissing() {
    const report = audit();
    if (["NEEDS_DATA_CLEANUP", "BLOCKING_SCHEMA_DEFECT"].indexOf(report.data.classification) >= 0) return Response.error("Settings audit blocks seeding.", report.data.findings);
    const rows = physicalRows();
    const existing = {};
    rows.forEach((row) => { existing[String(row[SETTINGS_FIELDS.KEY] || "").trim()] = true; });
    const missing = registry.filter((def) => !existing[def.key]);
    if (missing.length) writer.insertMany(schema, missing.map((def) => buildRow(def, parse(def, def.defaultValue))));
    clearCache();
    return Response.success({ seeded: missing.map((def) => def.key), count: missing.length });
  }

  function audit() {
    const findings = [];
    let headers;
    try { headers = base.headers(schema); } catch (error) {
      return Response.success({ classification: "BLOCKING_SCHEMA_DEFECT", findings: [{ code: "SETTINGS_SHEET_UNAVAILABLE", severity: "BLOCKING_SCHEMA_DEFECT", message: error.message }] });
    }
    const missingHeaders = schema.HEADERS.filter((header) => headers.indexOf(header) < 0);
    missingHeaders.forEach((header) => findings.push({ code: "MISSING_REQUIRED_HEADER", severity: "BLOCKING_SCHEMA_DEFECT", key: header }));
    if (missingHeaders.length) return Response.success({ classification: "BLOCKING_SCHEMA_DEFECT", findings });
    const rows = physicalRows();
    const keys = {}; const ids = {};
    rows.forEach((row, index) => {
      const key = String(row[SETTINGS_FIELDS.KEY] || "").trim();
      const id = String(row[SETTINGS_FIELDS.ID] || "").trim();
      if (!key) findings.push({ code: "BLANK_KEY", severity: "NEEDS_DATA_CLEANUP", row: index + 2 });
      if (key) { keys[key] = (keys[key] || 0) + 1; }
      if (id) { ids[id] = (ids[id] || 0) + 1; }
      const def = findDefinition(key);
      if (key && !def) findings.push({ code: "UNKNOWN_KEY", severity: "NEEDS_DATA_CLEANUP", key });
      if (def && String(row[SETTINGS_FIELDS.TYPE] || "") !== def.type) findings.push({ code: "MISMATCHED_TYPE", severity: "NEEDS_DATA_CLEANUP", key });
      if (row[schema.SYSTEM.IS_DELETED] === true && row[schema.SYSTEM.IS_ACTIVE] === true) findings.push({ code: "DELETED_ACTIVE_CONFLICT", severity: "NEEDS_DATA_CLEANUP", key });
      if (def) { try { parse(def, row[SETTINGS_FIELDS.VALUE]); } catch (error) { findings.push({ code: `INVALID_${def.type}`, severity: "NEEDS_DATA_CLEANUP", key, message: error.message }); } }
    });
    Object.keys(keys).filter((key) => keys[key] > 1).forEach((key) => findings.push({ code: "DUPLICATE_KEY", severity: "NEEDS_DATA_CLEANUP", key, count: keys[key] }));
    Object.keys(keys).filter((key) => keys[key] > 1).forEach((key) => {
      const activeCount = rows.filter((row) => String(row[SETTINGS_FIELDS.KEY] || "").trim() === key && row[schema.SYSTEM.IS_DELETED] !== true && row[schema.SYSTEM.IS_ACTIVE] !== false).length;
      if (activeCount > 1) findings.push({ code: "MULTIPLE_ACTIVE_ROWS", severity: "NEEDS_DATA_CLEANUP", key, count: activeCount });
    });
    Object.keys(ids).filter((id) => ids[id] > 1).forEach((id) => findings.push({ code: "DUPLICATE_ID", severity: "NEEDS_DATA_CLEANUP", id, count: ids[id] }));
    registry.filter((def) => !keys[def.key]).forEach((def) => findings.push({ code: "MISSING_REGISTRY_KEY", severity: "NEEDS_SEED", key: def.key }));
    const classification = findings.some((item) => item.severity === "NEEDS_DATA_CLEANUP") ? "NEEDS_DATA_CLEANUP" : findings.some((item) => item.severity === "NEEDS_SEED") ? "NEEDS_SEED" : "SAFE";
    return Response.success({ classification, findings, rowCount: rows.length, registryCount: registry.length });
  }

  return Object.freeze({ definitions, listResolved, getResolved, updateValue, resetToDefault, seedMissing, audit, parseValue: (key, raw) => parse(findDefinition(key), raw), parseTypedValue: (type, raw, rules = {}) => parse({ type, rules }, raw), clearCache });
}
