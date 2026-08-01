/** Canonical, append-only Logs service. Browser code receives read methods only. */
const LogSanitizer = (() => {
  const REDACTED = "[REDACTED]";
  const OMIT = "[OMITTED]";
  const MAX_DEPTH = 6;
  const MAX_LENGTH = 30000;
  const secretPattern = /^(password|passwd|secret|token|api_?key|authorization|credential|private_?key|access_?key|refresh_?token|session|cookie)$/i;

  function formulaSafe(value) {
    const text = String(value == null ? "" : value);
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
  }

  function isSensitiveKey(key) { return secretPattern.test(String(key || "")); }

  function normalize(value, depth = 0, seen = []) {
    if (value === null) return null;
    if (typeof value === "undefined") return "[UNDEFINED]";
    if (typeof value === "function") return OMIT;
    if (typeof value === "string") return formulaSafe(value);
    if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
    if (typeof value === "boolean") return value;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
    if (value instanceof Error) return { name: formulaSafe(value.name), message: formulaSafe(value.message), stack: formulaSafe(value.stack || "") };
    if (depth >= MAX_DEPTH) return "[MAX_DEPTH]";
    if (seen.indexOf(value) >= 0) return "[CIRCULAR]";
    const nextSeen = seen.concat([value]);
    if (Array.isArray(value)) return value.map((item) => normalize(item, depth + 1, nextSeen));
    const result = {};
    Object.keys(value).sort().forEach((key) => {
      if (secretPattern.test(key)) result[key] = REDACTED;
      else if (typeof value[key] !== "function") result[key] = normalize(value[key], depth + 1, nextSeen);
    });
    return result;
  }

  function serialize(value) {
    if (value === null || typeof value === "undefined" || value === "") return "";
    let text = JSON.stringify(normalize(value));
    if (text.length > MAX_LENGTH) text = JSON.stringify({ truncated: true, originalLength: text.length, preview: text.slice(0, MAX_LENGTH - 100), marker: `[TRUNCATED:${text.length}]` });
    return formulaSafe(text);
  }

  return Object.freeze({ REDACTED, MAX_DEPTH, MAX_LENGTH, formulaSafe, isSensitiveKey, normalize, serialize });
})();

const LogsService = (() => {
  const LEVELS = Object.freeze(["ERROR", "WARN", "INFO", "DEBUG"]);
  const CATEGORIES = Object.freeze(["AUDIT", "APPLICATION", "VALIDATION", "ERROR", "SYSTEM"]);
  const ACTIONS = Object.freeze(["CREATE", "UPDATE", "DELETE", "RESTORE", "READ", "SETTINGS_UPDATE", "SETTINGS_RESET", "MIGRATION", "SYSTEM"]);
  const STATUSES = Object.freeze(["SUCCESS", "FAILURE", "WARNING"]);
  function jsonFields() {
    return [LOG_FIELDS.BEFORE_DATA, LOG_FIELDS.AFTER_DATA, LOG_FIELDS.CONTEXT];
  }

  function timestamp(value) {
    const date = value instanceof Date ? value : new Date(value || new Date());
    if (Number.isNaN(date.getTime())) throw new Error("Invalid log timestamp.");
    return Utilities.formatDate(date, APP_CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
  }

  function levelEnabled(level) {
    let minimum = LogLevelProvider.DEFAULT_LEVEL;
    try {
      const resolved = LogLevelProvider.resolve();
      if (LEVELS.indexOf(resolved) >= 0) minimum = resolved;
    } catch (error) { /* default without recursive logging */ }
    return LEVELS.indexOf(level) <= LEVELS.indexOf(minimum);
  }

  function id() {
    return `LG-${Utilities.getUuid()}`;
  }

  function record(event = {}) {
    const level = String(event.level || "INFO").toUpperCase();
    const category = String(event.category || "APPLICATION").toUpperCase();
    const action = String(event.action || "SYSTEM").toUpperCase();
    const status = String(event.status || (level === "ERROR" ? "FAILURE" : "SUCCESS")).toUpperCase();
    if (LEVELS.indexOf(level) < 0) throw new Error("Unsupported log level.");
    if (CATEGORIES.indexOf(category) < 0) throw new Error("Unsupported log category.");
    if (ACTIONS.indexOf(action) < 0) throw new Error("Unsupported log action.");
    if (STATUSES.indexOf(status) < 0) throw new Error("Unsupported log status.");
    if (!levelEnabled(level)) return { recorded: false, reason: "LEVEL_FILTERED" };
    const at = timestamp(event.timestamp);
    const error = event.error instanceof Error ? event.error : null;
    const row = {
      ID: id(), Timestamp: at, Level: level, Category: category,
      Module: LogSanitizer.formulaSafe(event.module || "System"), Action: action,
      EntityType: LogSanitizer.formulaSafe(event.entityType || ""), EntityID: LogSanitizer.formulaSafe(event.entityId || ""),
      Actor: LogSanitizer.formulaSafe(event.actor || Utils.currentUser() || "SYSTEM"), Status: status,
      Message: LogSanitizer.formulaSafe(event.message || ""), BeforeData: LogSanitizer.serialize(event.beforeData),
      AfterData: LogSanitizer.serialize(event.afterData), Context: LogSanitizer.serialize(event.context),
      DurationMs: Number.isFinite(Number(event.durationMs)) ? Math.max(0, Number(event.durationMs)) : "",
      CorrelationID: LogSanitizer.formulaSafe(event.correlationId || ""), Source: LogSanitizer.formulaSafe(event.source || "SERVER"),
      ErrorName: LogSanitizer.formulaSafe(error ? error.name : event.errorName || ""),
      ErrorMessage: LogSanitizer.formulaSafe(error ? error.message : event.errorMessage || ""),
      ErrorStack: LogSanitizer.formulaSafe(error ? error.stack || "" : event.errorStack || ""), CreatedAt: at,
    };
    LogsRepository.append(row);
    return { recorded: true, id: row.ID };
  }

  function bestEffort(event) {
    try { return record(event); }
    catch (error) { Logger.log(`[LOG_WRITE_FAILURE] ${error.message}`); return { recorded: false, reason: "WRITE_FAILURE" }; }
  }

  function datePart(value) {
    if (value instanceof Date) return Utilities.formatDate(value, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
    return String(value || "").slice(0, 10);
  }

  function resolvedFilters(filters) {
    const result = Object.assign({}, filters || {}); const preset = String(result.preset || "CUSTOM").toUpperCase();
    const today = Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
    const parts = today.split("-").map(Number); const base = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const utcDate = (date) => Utilities.formatDate(date, "UTC", "yyyy-MM-dd");
    if (preset === "TODAY") result.dateFrom = result.dateTo = today;
    else if (preset === "LAST_7_DAYS") { const start = new Date(base.getTime()); start.setUTCDate(start.getUTCDate() - 6); result.dateFrom = utcDate(start); result.dateTo = today; }
    else if (preset === "CURRENT_MONTH") { result.dateFrom = `${parts[0]}-${String(parts[1]).padStart(2, "0")}-01`; result.dateTo = utcDate(new Date(Date.UTC(parts[0], parts[1], 0))); }
    else if (preset === "PREVIOUS_MONTH") { result.dateFrom = utcDate(new Date(Date.UTC(parts[0], parts[1] - 2, 1))); result.dateTo = utcDate(new Date(Date.UTC(parts[0], parts[1] - 1, 0))); }
    else if (preset === "CURRENT_YEAR") { result.dateFrom = `${parts[0]}-01-01`; result.dateTo = `${parts[0]}-12-31`; }
    if (result.dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(result.dateFrom)) throw new Error("Invalid dateFrom.");
    if (result.dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(result.dateTo)) throw new Error("Invalid dateTo.");
    if (result.dateFrom && result.dateTo && result.dateFrom > result.dateTo) throw new Error("dateFrom must not be after dateTo.");
    return result;
  }

  function filteredRows(filters = {}) {
      filters = resolvedFilters(filters);
      let rows = LogsRepository.rows();
      const exact = { level: "Level", category: "Category", module: "Module", action: "Action", status: "Status", entityType: "EntityType", entityId: "EntityID", actor: "Actor" };
      Object.keys(exact).forEach((key) => { if (filters[key]) rows = rows.filter((row) => String(row[exact[key]] || "").toLowerCase() === String(filters[key]).toLowerCase()); });
      if (filters.dateFrom) rows = rows.filter((row) => datePart(row.Timestamp) >= filters.dateFrom);
      if (filters.dateTo) rows = rows.filter((row) => datePart(row.Timestamp) <= filters.dateTo);
      if (filters.search) {
        const q = String(filters.search).toLowerCase();
        rows = rows.filter((row) => LOG_SCHEMA.HEADERS.some((field) => String(row[field] || "").toLowerCase().indexOf(q) >= 0));
      }
      rows.sort((a, b) => String(b.Timestamp).localeCompare(String(a.Timestamp)) || String(b.ID).localeCompare(String(a.ID)));
      return rows;
  }

  function list(filters = {}, pagination = {}) {
    const rows = filteredRows(filters);
    const requested = pagination.pageSize == null || pagination.pageSize === "" ? null : Number(pagination.pageSize);
    const pageSize = requested === null ? null : Math.max(1, Math.min(PAGINATION_CONFIG.MAX_LIMIT, Math.floor(requested) || PAGINATION_CONFIG.DEFAULT_LIMIT));
    return Response.success(RepositoryQuery.paginate(rows, Math.max(1, Number(pagination.page) || 1), pageSize));
  }

  function getById(logId) {
    const row = LogsRepository.findById(logId);
    return row ? Response.success(row) : Response.error("Log not found.");
  }

  function summary(filters = {}) {
    const rows = filteredRows(filters);
    return Response.success({ total: rows.length, errors: rows.filter((r) => r.Level === "ERROR").length, warnings: rows.filter((r) => r.Level === "WARN").length, audit: rows.filter((r) => r.Category === "AUDIT").length });
  }

  function page(filters = {}, pagination = {}) {
    const rows = filteredRows(filters);
    const requested = pagination.pageSize == null || pagination.pageSize === "" ? null : Number(pagination.pageSize);
    const pageSize = requested === null ? null : Math.max(1, Math.min(PAGINATION_CONFIG.MAX_LIMIT, Math.floor(requested) || PAGINATION_CONFIG.DEFAULT_LIMIT));
    return Response.success({
      list: RepositoryQuery.paginate(rows, Math.max(1, Number(pagination.page) || 1), pageSize),
      summary: {
        total: rows.length,
        errors: rows.filter((row) => row.Level === "ERROR").length,
        warnings: rows.filter((row) => row.Level === "WARN").length,
        audit: rows.filter((row) => row.Category === "AUDIT").length,
      },
    });
  }

  function audit() {
    const findings = [];
    const physical = LogsRepository.inspectPhysicalStore();
    if (!physical.sheetExists) return Response.success({ classification: "EMPTY_SAFE_TO_INITIALIZE", sheetExists: false, rowCount: 0, findings: [{ code: "SHEET_MISSING" }] });
    const headers = physical.headers;
    const nonBlank = headers.filter((value) => String(value).trim());
    if (!nonBlank.length && physical.lastRow <= 1) return Response.success({ classification: "EMPTY_SAFE_TO_INITIALIZE", sheetExists: true, rowCount: 0, findings });
    headers.forEach((header, index) => { if (!String(header).trim()) findings.push({ code: "BLANK_HEADER", column: index + 1 }); });
    const counts = {}; headers.forEach((header) => { counts[header] = (counts[header] || 0) + 1; });
    Object.keys(counts).filter((key) => counts[key] > 1).forEach((header) => findings.push({ code: "DUPLICATE_HEADER", header }));
    const missing = LOG_SCHEMA.HEADERS.filter((header) => headers.indexOf(header) < 0);
    const unexpected = headers.filter((header) => LOG_SCHEMA.HEADERS.indexOf(header) < 0);
    missing.forEach((header) => findings.push({ code: "MISSING_HEADER", header }));
    unexpected.forEach((header) => findings.push({ code: "UNEXPECTED_HEADER", header }));
    const blockingHeader = findings.some((item) => item.code === "BLANK_HEADER" || item.code === "DUPLICATE_HEADER");
    if (blockingHeader) return Response.success({ classification: "BLOCKING_SCHEMA_DEFECT", sheetExists: true, rowCount: Math.max(0, physical.lastRow - 1), headers, findings });
    if (missing.length || unexpected.length) return Response.success({ classification: "LEGACY_SCHEMA_MIGRATION_REQUIRED", sheetExists: true, rowCount: Math.max(0, physical.lastRow - 1), headers, findings });
    const raw = physical.rawRows; const rows = physical.rows; const ids = {};
    const formulas = physical.formulas;
    rows.forEach((row, index) => {
      const physicalRow = index + 2; const logId = String(row.ID || "").trim();
      if (raw[index].every((value) => value === "")) findings.push({ code: "BLANK_ROW", row: physicalRow });
      if (!logId) findings.push({ code: "BLANK_ID", row: physicalRow }); else ids[logId] = (ids[logId] || 0) + 1;
      if (Number.isNaN(new Date(row.Timestamp).getTime())) findings.push({ code: "INVALID_TIMESTAMP", row: physicalRow });
      if (LEVELS.indexOf(String(row.Level)) < 0) findings.push({ code: "INVALID_LEVEL", row: physicalRow });
      if (CATEGORIES.indexOf(String(row.Category)) < 0) findings.push({ code: "INVALID_CATEGORY", row: physicalRow });
      if (ACTIONS.indexOf(String(row.Action)) < 0) findings.push({ code: "INVALID_ACTION", row: physicalRow });
      if (STATUSES.indexOf(String(row.Status)) < 0) findings.push({ code: "INVALID_STATUS", row: physicalRow });
      jsonFields().forEach((field) => { const text = String(row[field] || ""); if (text.length > LogSanitizer.MAX_LENGTH) findings.push({ code: "OVERSIZED_JSON", row: physicalRow, field }); else if (text) { try { JSON.parse(text); } catch (error) { findings.push({ code: "MALFORMED_JSON", row: physicalRow, field }); } } });
      LOG_SCHEMA.HEADERS.forEach((field) => { if (/^[=+\-@]/.test(String(row[field] || ""))) findings.push({ code: "FORMULA_BEARING_TEXT", row: physicalRow, field }); });
      formulas[index].forEach((formula, column) => { if (formula) findings.push({ code: "FORMULA_CELL", row: physicalRow, field: headers[column] }); });
    });
    Object.keys(ids).filter((key) => ids[key] > 1).forEach((logId) => findings.push({ code: "DUPLICATE_ID", id: logId }));
    return Response.success({ classification: findings.length ? "NEEDS_DATA_CLEANUP" : "SAFE", sheetExists: true, rowCount: rows.length, headers, findings });
  }

  return Object.freeze({ LEVELS, CATEGORIES, ACTIONS, STATUSES, record, bestEffort, list, page, getById, summary, audit });
})();

const AuditLogService = Object.freeze({ record(event) { return LogsService.record(Object.assign({}, event, { category: "AUDIT" })); }, bestEffort(event) { return LogsService.bestEffort(Object.assign({}, event, { category: "AUDIT" })); } });
const AppLogService = Object.freeze({ write: LogsService.record, bestEffort: LogsService.bestEffort });
