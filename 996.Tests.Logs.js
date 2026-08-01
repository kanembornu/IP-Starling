function _logsAssert(condition, message) { if (!condition) throw new Error(message); }

function runLogsFocusedTests() {
  const required = ["ID", "Timestamp", "Level", "Category", "Module", "Action", "EntityType", "EntityID", "Actor", "Status", "Message", "BeforeData", "AfterData", "Context", "DurationMs", "CorrelationID", "Source", "ErrorName", "ErrorMessage", "ErrorStack", "CreatedAt"];
  _logsAssert(JSON.stringify(LOG_SCHEMA.HEADERS) === JSON.stringify(required), "Canonical Logs headers differ.");
  ["ERROR", "WARN", "INFO", "DEBUG"].forEach((value) => _logsAssert(LogsService.LEVELS.indexOf(value) >= 0, `Missing level ${value}.`));
  ["AUDIT", "APPLICATION", "VALIDATION", "ERROR", "SYSTEM"].forEach((value) => _logsAssert(LogsService.CATEGORIES.indexOf(value) >= 0, `Missing category ${value}.`));
  ["CREATE", "UPDATE", "DELETE", "RESTORE", "READ", "SETTINGS_UPDATE", "SETTINGS_RESET", "MIGRATION", "SYSTEM"].forEach((value) => _logsAssert(LogsService.ACTIONS.indexOf(value) >= 0, `Missing action ${value}.`));
  let invalidLevel = false; try { LogsService.record({ level: "TRACE", category: "SYSTEM" }); } catch (error) { invalidLevel = true; } _logsAssert(invalidLevel, "Invalid level was accepted.");
  let invalidCategory = false; try { LogsService.record({ level: "ERROR", category: "UNKNOWN" }); } catch (error) { invalidCategory = true; } _logsAssert(invalidCategory, "Invalid category was accepted.");
  const circular = { password: "bad", nested: { apiKey: "bad", value: "=SUM(1,1)" }, date: new Date("2026-07-22T00:00:00Z"), missing: undefined, fn: () => true }; circular.self = circular;
  const first = LogSanitizer.serialize(circular); const second = LogSanitizer.serialize(circular);
  _logsAssert(first === second, "Serialization is not deterministic.");
  _logsAssert(first.indexOf("[REDACTED]") >= 0 && first.indexOf("bad") < 0, "Nested secret redaction failed.");
  _logsAssert(first.indexOf("[CIRCULAR]") >= 0 && first.indexOf("[UNDEFINED]") >= 0, "Circular or undefined normalization failed.");
  _logsAssert(first.indexOf("fn") < 0 && first.indexOf("'=SUM") >= 0, "Function omission or formula safety failed.");
  const deep = { a: { b: { c: { d: { e: { f: { g: true } } } } } } }; _logsAssert(LogSanitizer.serialize(deep).indexOf("[MAX_DEPTH]") >= 0, "Maximum depth marker missing.");
  const long = LogSanitizer.serialize({ value: "x".repeat(LogSanitizer.MAX_LENGTH + 100) }); _logsAssert(long.indexOf("[TRUNCATED:") >= 0, "Truncation marker missing.");
  const app = HtmlService.createHtmlOutputFromFile("970.View.App").getContent();
  const api = HtmlService.createHtmlOutputFromFile("965.View.API").getContent();
  const loadStart = app.indexOf("async function loadLogs()");
  const loadEnd = app.indexOf("function bindLogsActions()", loadStart);
  const loadSource = app.slice(loadStart, loadEnd);
  _logsAssert((loadSource.match(/Api\.Logs\.page\(/g) || []).length === 1, "Logs load must issue one combined page request.");
  _logsAssert(!/Api\.Logs\.(?:list|summary)\(/.test(loadSource), "Logs load still issues duplicate list or summary requests.");
  _logsAssert(/request !== logsRequest \|\| state\.page !== "logs"/.test(loadSource), "Logs stale-response rejection is missing.");
  _logsAssert(/if \(incomplete \|\| invalid\) return;/.test(app), "Incomplete or invalid custom Logs range can dispatch.");
  _logsAssert((api.match(/page\(filters, pagination\) \{ return run\("listLogsPage"/g) || []).length === 1, "Logs browser API combined endpoint is missing or duplicated.");
}

function testLogsRepositoryOwnershipContract() {
  const repository = Object.keys(LogsRepository).map((key) => LogsRepository[key].toString()).join("\n");
  const service = Object.keys(LogsService).filter((key) => typeof LogsService[key] === "function").map((key) => LogsService[key].toString()).join("\n");
  _logsAssert(Object.isFrozen(LogsRepository), "LogsRepository must be frozen.");
  _logsAssert(JSON.stringify(Object.keys(LogsRepository)) === JSON.stringify(["rows", "append", "findById", "inspectPhysicalStore"]), "LogsRepository public surface differs.");
  ["RepositoryBase.rows", "RepositoryBase.mapRows", "RepositoryWriter.insert", "Database.sheet", "getRange", "getValues", "getFormulas"].forEach((token) => _logsAssert(repository.indexOf(token) >= 0, `LogsRepository missing physical ownership: ${token}.`));
  ["SpreadsheetApp", "Database.", "RepositoryBase.", "RepositoryWriter.", "getRange", "getValues", "getFormulas"].forEach((token) => _logsAssert(service.indexOf(token) < 0, `LogsService retains physical access: ${token}.`));
  _logsAssert(/LogsRepository\.append\(row\)/.test(service), "LogsService append does not use LogsRepository.");
  _logsAssert(/LogsRepository\.findById\(logId\)/.test(service), "LogsService lookup does not use LogsRepository.");
  _logsAssert(/LogsRepository\.inspectPhysicalStore\(\)/.test(service), "LogsService diagnostics do not use LogsRepository.");
  return true;
}

function testLogLevelProviderBehaviorContract() {
  const row = (value, overrides = {}) => Object.assign({ Key: "LOG_LEVEL", Value: value, Deleted: false, IsActive: true }, overrides);
  const resolve = (rows, cacheValue) => LogLevelProvider.resolve({
    base: { rows: () => rows, mapRows: (schema, values) => values },
    cache: { get: () => cacheValue || null },
  });
  _logsAssert(resolve([]) === "INFO", "Missing LOG_LEVEL did not use the canonical default.");
  _logsAssert(resolve([row("WARN")]) === "WARN", "Valid persisted LOG_LEVEL was not authoritative.");
  _logsAssert(resolve([row("TRACE")]) === "INFO", "Invalid persisted LOG_LEVEL did not use the canonical fallback.");
  _logsAssert(resolve([row("DEBUG", { IsActive: false })]) === "INFO", "Inactive LOG_LEVEL did not use the canonical default.");
  _logsAssert(resolve([], JSON.stringify({ value: "ERROR" })) === "ERROR", "Canonical Settings cache value was not reused.");
  _logsAssert(resolve([row("DEBUG")], "{bad") === "DEBUG", "Invalid cache blocked authoritative persisted resolution.");
  let unavailable = false;
  try { LogLevelProvider.resolve({ base: { rows: () => { throw new Error("Settings unavailable"); }, mapRows: () => [] }, cache: { get: () => null } }); } catch (error) { unavailable = true; }
  _logsAssert(unavailable, "Provider hid Settings unavailability from LogsService fallback handling.");
  let duplicate = false;
  try { resolve([row("INFO"), row("DEBUG")]); } catch (error) { duplicate = true; }
  _logsAssert(duplicate, "Duplicate LOG_LEVEL rows did not preserve Settings resolution failure behavior.");
  return true;
}

function testLogsSettingsCycleRemovalContract() {
  const logsSource = Object.keys(LogsService)
    .filter((key) => typeof LogsService[key] === "function")
    .map((key) => LogsService[key].toString())
    .join("\n");
  const providerSource = LogLevelProvider.resolve.toString();
  const settingsSource = SettingsService.toString();
  _logsAssert(logsSource.indexOf("SettingsService") < 0, "LogsService still references SettingsService.");
  _logsAssert(providerSource.indexOf("SettingsService") < 0 && providerSource.indexOf("LogsService") < 0 && providerSource.indexOf("AuditLogService") < 0, "LogLevelProvider has a service or audit dependency.");
  _logsAssert(/LogLevelProvider\.resolve\(\)/.test(logsSource), "LogsService does not lazily resolve its log level through the provider.");
  _logsAssert(/auditLog\.bestEffort/.test(settingsSource) && /SETTINGS_UPDATE/.test(settingsSource) && /SETTINGS_RESET/.test(settingsSource), "Settings mutation audit path differs.");
  _logsAssert((logsSource.match(/LogsRepository\.append\(row\)/g) || []).length === 1, "Logs write path can append more than once per record call.");
  return true;
}

function testLogsPublicContractAfterRepositoryExtraction() {
  _logsAssert(Object.isFrozen(LogsService) && Object.isFrozen(AuditLogService) && Object.isFrozen(AppLogService), "Logs compatibility facades must remain frozen.");
  _logsAssert(JSON.stringify(Object.keys(LogsService)) === JSON.stringify(["LEVELS", "CATEGORIES", "ACTIONS", "STATUSES", "record", "bestEffort", "list", "page", "getById", "summary", "audit"]), "LogsService public surface differs.");
  _logsAssert(LogsService.record.length === 0 && LogsService.bestEffort.length === 1 && LogsService.list.length === 0 && LogsService.page.length === 0 && LogsService.getById.length === 1 && LogsService.summary.length === 0 && LogsService.audit.length === 0, "LogsService method arity differs.");
  _logsAssert(JSON.stringify(Object.keys(AuditLogService)) === JSON.stringify(["record", "bestEffort"]), "AuditLogService public surface differs.");
  _logsAssert(JSON.stringify(Object.keys(AppLogService)) === JSON.stringify(["write", "bestEffort"]), "AppLogService public surface differs.");
  const controller = [listLogs, listLogsPage, getLogById, getLogsSummary].map((fn) => fn.toString()).join("\n");
  ["LogsService.list", "LogsService.page", "LogsService.getById", "LogsService.summary"].forEach((token) => _logsAssert(controller.indexOf(token) >= 0, `Logs controller contract missing ${token}.`));
  return true;
}

function testAcceptanceThreeLevelPublicContract() {
  _logsAssert(typeof runAcceptanceFast === "function" && typeof runAcceptanceStandard === "function" && typeof runAcceptanceRelease === "function", "Three-level acceptance entry points are incomplete.");
  _logsAssert(typeof runAcceptanceFrontend === "function" && typeof runAcceptanceHealth === "function", "Permanent Frontend or Health acceptance wrapper is missing.");
  _logsAssert(typeof runAcceptanceCurrentPhase === "undefined" && typeof runAcceptanceFull === "undefined" && typeof runAcceptanceBackend === "undefined", "Retired acceptance wrapper remains public.");
  const release = runAcceptanceRelease();
  _logsAssert(release.status === "MANUAL_SEQUENCE_REQUIRED" && release.status !== "PASS", "Release acceptance must return a manual plan, never PASS.");
  _logsAssert(JSON.stringify(release.orderedFunctions) === JSON.stringify(["runAcceptanceFast", "runAcceptanceStandard", "runAcceptanceFrontend", "runAcceptanceHealth"]), "Release acceptance order differs.");
  [runAcceptanceFast, runAcceptanceStandard, runAcceptanceFrontend, runAcceptanceHealth].forEach((runner) => {
    const source = runner.toString();
    _logsAssert(!/ScriptProperties|PropertiesService|SpreadsheetApp|Database\.|Repository|CacheService|SettingsService/.test(source), `${runner.name} contains persistent state or data access.`);
  });
  return true;
}

function runLogsRepositoryServiceContractTests() {
  runTestSuite("Logs repository/service contract tests", [
    testLogsRepositoryOwnershipContract,
    testLogLevelProviderBehaviorContract,
    testLogsSettingsCycleRemovalContract,
    testLogsPublicContractAfterRepositoryExtraction,
    testLogsSchemaDiagnosticReadOnlySourceContract,
    testAcceptanceThreeLevelPublicContract,
  ], { reportTiming: true });
}

function _logsInitializeEmptySheet(audit) {
  if (audit.classification !== "EMPTY_SAFE_TO_INITIALIZE") return;
  let sheet;
  if (audit.sheetExists) sheet = Database.sheet(LOG_SCHEMA.TABLE); else sheet = Database.createSheet(LOG_SCHEMA.TABLE);
  if (sheet.getLastRow() > 1 || sheet.getLastColumn() > 0 && sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].some(String)) throw new Error("Logs sheet is not empty; initialization refused.");
  sheet.getRange(1, 1, 1, LOG_SCHEMA.HEADERS.length).setValues([LOG_SCHEMA.HEADERS]);
  RepositoryBase.clearHeaderCache(LOG_SCHEMA);
}

function _logsPhysicalSignature(rows) { return JSON.stringify(rows); }

function _logsRemoveControlledFixture(id) {
  const sheet = RepositoryBase.sheet(LOG_SCHEMA); const headers = RepositoryBase.headers(LOG_SCHEMA); const idIndex = headers.indexOf(LOG_FIELDS.ID);
  const rows = RepositoryBase.rows(LOG_SCHEMA); const targets = [];
  rows.forEach((row, index) => { if (String(row[idIndex]) === String(id)) targets.push(index + 2); });
  if (targets.length !== 1) throw new Error(`Controlled fixture cleanup expected one row, found ${targets.length}.`);
  sheet.deleteRow(targets[0]); RepositoryBase.clearHeaderCache(LOG_SCHEMA);
}

function _runLogsControlledWriteTest() {
  const beforeRows = RepositoryBase.rows(LOG_SCHEMA); const beforeSignature = _logsPhysicalSignature(beforeRows);
  const marker = `LOGS_ACCEPTANCE_${Utilities.getUuid()}`; let fixtureId = "";
  try {
    const result = LogsService.record({ level: "ERROR", category: "SYSTEM", module: "LogsAcceptance", action: "SYSTEM", status: "SUCCESS", message: marker, context: { marker, token: "must-redact" }, source: "runLogsModuleAcceptance" });
    _logsAssert(result.recorded === true && result.id, "Controlled event was not recorded."); fixtureId = result.id;
    const matches = RepositoryBase.mapRows(LOG_SCHEMA, RepositoryBase.rows(LOG_SCHEMA)).filter((row) => row.ID === fixtureId);
    _logsAssert(matches.length === 1, "One event must write exactly one physical row.");
    _logsAssert(matches[0].Context.indexOf("[REDACTED]") >= 0, "Controlled fixture was not redacted.");
    const fetched = LogsService.getById(fixtureId); _logsAssert(fetched.success && fetched.data.ID === fixtureId, "getById failed.");
    const listed = LogsService.list({ module: "LogsAcceptance", search: marker }, { page: 1, pageSize: 10 }); _logsAssert(listed.success && listed.data.data.some((row) => row.ID === fixtureId), "Filtering or search failed.");
    const page = LogsService.page({ module: "LogsAcceptance", search: marker }, { page: 1, pageSize: 10 });
    _logsAssert(page.success && page.data.list.data.some((row) => row.ID === fixtureId), "Combined Logs page filtering failed.");
    _logsAssert(page.data.summary.total === page.data.list.total && page.data.summary.errors === 1, "Combined Logs page summary differs from its filtered dataset.");
    _logsAssert(listLogsPage({ module: "LogsAcceptance", search: marker }, { page: 1, pageSize: 10 }).success, "Combined Logs controller failed.");
  } finally { if (fixtureId) _logsRemoveControlledFixture(fixtureId); }
  _logsAssert(_logsPhysicalSignature(RepositoryBase.rows(LOG_SCHEMA)) === beforeSignature, "Pre-existing production rows changed or cleanup failed.");
}

function executeLogsModuleAcceptance() {
  const initial = LogsService.audit(); if (!initial.success) throw new Error(initial.message || "Logs audit failed.");
  const allowed = ["SAFE", "EMPTY_SAFE_TO_INITIALIZE"];
  if (allowed.indexOf(initial.data.classification) < 0) throw new Error(`Logs production audit blocked controlled writes: ${initial.data.classification}.`);
  _logsInitializeEmptySheet(initial.data);
  const verified = LogsService.audit(); if (!verified.success || verified.data.classification !== "SAFE") throw new Error(`Logs audit after initialization is ${verified.data && verified.data.classification}.`);
  runLogsFocusedTests();
  _runLogsControlledWriteTest();
  const finalAudit = LogsService.audit(); if (!finalAudit.success || finalAudit.data.classification !== "SAFE") throw new Error("Logs cleanup verification failed.");
  return { result: "PASS", productionAudit: verified.data, cleanupVerified: true };
}

function _logsDiagnosticSafeValue(value, header) {
  if (LogSanitizer.isSensitiveKey(header)) return LogSanitizer.REDACTED;
  if (value === null || typeof value === "undefined") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return value;
  let safe = value;
  try { safe = LogSanitizer.normalize(JSON.parse(value)); }
  catch (error) {
    safe = value
      .replace(/((?:password|passwd|secret|token|api_?key|authorization|credential|private_?key|access_?key|refresh_?token|session|cookie)\s*[:=]\s*)[^,;\s]+/gi, `$1${LogSanitizer.REDACTED}`)
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${LogSanitizer.REDACTED}`);
  }
  return safe;
}

function _logsDiagnosticHeaderAnalysis(physical, expected) {
  const counts = {}; physical.forEach((header) => { const key = String(header); counts[key] = (counts[key] || 0) + 1; });
  const duplicateHeaders = Object.keys(counts).filter((key) => counts[key] > 1).map((header) => ({ header, count: counts[header] }));
  const blankHeaders = physical.map((header, index) => ({ header, column: index + 1 })).filter((item) => String(item.header).trim() === "");
  const missingCanonicalHeaders = expected.filter((header) => physical.indexOf(header) < 0);
  const unexpectedHeaders = physical.filter((header) => expected.indexOf(header) < 0);
  const caseOnlyMismatch = []; const whitespaceMismatch = [];
  physical.forEach((header, index) => {
    const text = String(header); const trimmed = text.trim();
    const whitespaceTarget = expected.find((item) => item === trimmed);
    if (text !== trimmed && whitespaceTarget) whitespaceMismatch.push({ column: index + 1, physical: text, canonical: whitespaceTarget });
    const caseTarget = expected.find((item) => item.toLowerCase() === trimmed.toLowerCase());
    if (caseTarget && caseTarget !== trimmed) caseOnlyMismatch.push({ column: index + 1, physical: text, canonical: caseTarget });
  });
  return { duplicateHeaders, blankHeaders, missingCanonicalHeaders, unexpectedHeaders, caseOnlyMismatch, whitespaceMismatch, exactOrderCompatibility: JSON.stringify(physical) === JSON.stringify(expected) };
}

function _logsDiagnosticMapping(physical, expected) {
  const proposed = []; const unmappable = []; const targets = {};
  physical.forEach((header, index) => {
    const source = String(header); const normalized = source.trim().toLowerCase();
    const target = expected.find((item) => item.toLowerCase() === normalized) || null;
    if (!target) unmappable.push({ column: index + 1, source });
    else { proposed.push({ column: index + 1, source, target, exact: source === target }); targets[target] = (targets[target] || 0) + 1; }
  });
  const duplicateTargets = Object.keys(targets).filter((target) => targets[target] > 1);
  return { proposedSourceToTargetMapping: proposed, unmappableColumns: unmappable, duplicateTargets, deterministicMapping: unmappable.length === 0 && duplicateTargets.length === 0 && proposed.length === expected.length };
}

function logsSchemaCompatibilityDiagnostic() {
  const spreadsheet = Database.spreadsheet(); const spreadsheetName = spreadsheet.getName(); const spreadsheetId = spreadsheet.getId();
  const sheet = spreadsheet.getSheetByName(LOG_SCHEMA.TABLE); const expected = LOG_SCHEMA.HEADERS.slice();
  if (!sheet) {
    const missing = { classification: "SHEET_MISSING", reason: "The physical Logs sheet does not exist.", spreadsheetName, spreadsheetId, sheetExists: false, sheetName: LOG_SCHEMA.TABLE, lastRow: 0, lastColumn: 0, physicalHeaders: [], expectedHeaders: expected, duplicateHeaders: [], blankHeaders: [], missingCanonicalHeaders: expected, unexpectedHeaders: [], caseOnlyMismatch: [], whitespaceMismatch: [], exactOrderCompatibility: false, physicalRows: 0, onlyHeaders: false, emptySheet: false, blankRows: [], nonblankRows: 0, preview: [], canonicalHeadersWritableWithoutDataLoss: true, deterministicMapping: false, backupRequired: false, automaticMigrationSafe: false, manualCleanupRequired: false, proposedSourceToTargetMapping: [], unmappableColumns: [], ambiguousRows: [], headerCompatible: false, safeAutomaticInitialization: false, safeAutomaticMigration: false, manualActionRequired: true, result: "PASS" };
    Logger.log(`LOGS SCHEMA DIAGNOSTIC: ${JSON.stringify({ spreadsheetName, spreadsheetId, sheetExists: false, sheetName: LOG_SCHEMA.TABLE })}`);
    Logger.log(`LOGS EXPECTED HEADERS: ${JSON.stringify(expected)}`);
    Logger.log(`LOGS SCHEMA DIAGNOSTIC SUMMARY: ${JSON.stringify(missing)}`);
    return missing;
  }

  const lastRow = sheet.getLastRow(); const lastColumn = sheet.getLastColumn();
  const physical = lastColumn > 0 && lastRow > 0 ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0] : [];
  const header = _logsDiagnosticHeaderAnalysis(physical, expected); const mapping = _logsDiagnosticMapping(physical, expected);
  const rawRows = lastRow > 1 && lastColumn > 0 ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues() : [];
  const formulas = rawRows.length ? sheet.getRange(2, 1, rawRows.length, lastColumn).getFormulas() : [];
  const blankRows = []; const nonblank = []; const ambiguousRows = [];
  rawRows.forEach((row, index) => {
    const physicalRow = index + 2; const hasValue = row.some((value) => value !== "" && value !== null);
    if (!hasValue) blankRows.push(physicalRow); else nonblank.push({ row, physicalRow, formulas: formulas[index] });
    if (hasValue && mapping.unmappableColumns.some((column) => row[column.column - 1] !== "" && row[column.column - 1] !== null)) ambiguousRows.push(physicalRow);
  });
  const preview = nonblank.slice(0, 10).map((entry) => {
    const mappedValues = {}; const rawPositionalValues = []; const javascriptTypes = [];
    entry.row.forEach((value, index) => {
      const headerName = String(physical[index] || `COLUMN_${index + 1}`); const safe = _logsDiagnosticSafeValue(value, headerName);
      mappedValues[headerName] = safe; rawPositionalValues.push(safe);
      javascriptTypes.push(value instanceof Date ? "Date" : value === null ? "null" : Array.isArray(value) ? "array" : typeof value);
    });
    return { physicalRow: entry.physicalRow, mappedValues, rawPositionalValues, javascriptTypes, formulaPresence: entry.formulas.map((formula, index) => formula ? { column: index + 1, header: physical[index], present: true } : null).filter(Boolean) };
  });

  let classification; let reason;
  const emptySheet = lastRow === 0 && lastColumn === 0;
  if (emptySheet) { classification = "EMPTY_SHEET_SAFE_TO_INITIALIZE"; reason = "The sheet has no physical headers or data."; }
  else if (header.blankHeaders.length || header.duplicateHeaders.length || mapping.duplicateTargets.length) { classification = "MALFORMED_HEADERS"; reason = "Headers are blank, duplicated, or map more than once to one canonical target."; }
  else if (header.exactOrderCompatibility && nonblank.length === 0) { classification = "HEADER_ONLY_COMPATIBLE"; reason = "Canonical headers are present in exact order and there are no nonblank data rows."; }
  else if (header.exactOrderCompatibility) { classification = "COMPATIBLE_WITH_DATA"; reason = "Canonical headers are present in exact order and physical data exists."; }
  else if (ambiguousRows.length || !mapping.deterministicMapping && nonblank.length > 0) { classification = "AMBIGUOUS_DATA"; reason = "Existing data occupies columns that cannot be mapped deterministically."; }
  else { classification = "LEGACY_SCHEMA_MIGRATION_REQUIRED"; reason = "Headers differ from the canonical schema but the physical structure can be assessed deterministically."; }

  const headerCompatible = header.exactOrderCompatibility;
  const safeAutomaticInitialization = classification === "EMPTY_SHEET_SAFE_TO_INITIALIZE";
  const safeAutomaticMigration = classification === "HEADER_ONLY_COMPATIBLE" || classification === "COMPATIBLE_WITH_DATA";
  const manualActionRequired = ["LEGACY_SCHEMA_MIGRATION_REQUIRED", "MALFORMED_HEADERS", "AMBIGUOUS_DATA"].indexOf(classification) >= 0;
  const report = { classification, reason, spreadsheetName, spreadsheetId, sheetExists: true, sheetName: sheet.getName(), lastRow, lastColumn, physicalHeaders: physical, expectedHeaders: expected, duplicateHeaders: header.duplicateHeaders, blankHeaders: header.blankHeaders, missingCanonicalHeaders: header.missingCanonicalHeaders, unexpectedHeaders: header.unexpectedHeaders, caseOnlyMismatch: header.caseOnlyMismatch, whitespaceMismatch: header.whitespaceMismatch, exactOrderCompatibility: header.exactOrderCompatibility, physicalRows: rawRows.length, onlyHeaders: lastRow === 1 && physical.length > 0, emptySheet, blankRows, nonblankRows: nonblank.length, preview, canonicalHeadersWritableWithoutDataLoss: nonblank.length === 0, deterministicMapping: mapping.deterministicMapping, backupRequired: nonblank.length > 0, automaticMigrationSafe: safeAutomaticMigration, manualCleanupRequired: manualActionRequired, proposedSourceToTargetMapping: mapping.proposedSourceToTargetMapping, unmappableColumns: mapping.unmappableColumns, ambiguousRows, headerCompatible, safeAutomaticInitialization, safeAutomaticMigration, manualActionRequired, result: "PASS" };
  Logger.log(`LOGS SCHEMA DIAGNOSTIC: ${JSON.stringify({ spreadsheetName, spreadsheetId, sheetExists: true, sheetName: sheet.getName(), lastRow, lastColumn, physicalRows: rawRows.length, onlyHeaders: report.onlyHeaders, emptySheet, blankRows, nonblankRows: nonblank.length })}`);
  Logger.log(`LOGS PHYSICAL HEADERS: ${JSON.stringify(physical)}`); Logger.log(`LOGS EXPECTED HEADERS: ${JSON.stringify(expected)}`);
  Logger.log(`LOGS HEADER FINDING: ${JSON.stringify({ exactOrderCompatibility: header.exactOrderCompatibility })}`);
  [header.duplicateHeaders, header.blankHeaders, header.missingCanonicalHeaders, header.unexpectedHeaders, header.caseOnlyMismatch, header.whitespaceMismatch].forEach((finding) => { if (finding.length) Logger.log(`LOGS HEADER FINDING: ${JSON.stringify(finding)}`); });
  preview.forEach((row) => Logger.log(`LOGS ROW PREVIEW: ${JSON.stringify(row)}`));
  Logger.log(`LOGS MIGRATION ASSESSMENT: ${JSON.stringify({ canonicalHeadersWritableWithoutDataLoss: report.canonicalHeadersWritableWithoutDataLoss, deterministicMapping: report.deterministicMapping, backupRequired: report.backupRequired, automaticMigrationSafe: report.automaticMigrationSafe, manualCleanupRequired: report.manualCleanupRequired, proposedSourceToTargetMapping: report.proposedSourceToTargetMapping, unmappableColumns: report.unmappableColumns, ambiguousRows: report.ambiguousRows })}`);
  Logger.log(`LOGS SCHEMA DIAGNOSTIC SUMMARY: ${JSON.stringify({ classification, sheetExists: true, physicalRows: rawRows.length, headerCompatible, safeAutomaticInitialization, safeAutomaticMigration, manualActionRequired, result: report.result, reason })}`);
  return report;
}

function testLogsSchemaDiagnosticReadOnlySourceContract() {
  const source = [logsSchemaCompatibilityDiagnostic, _logsDiagnosticSafeValue, _logsDiagnosticHeaderAnalysis, _logsDiagnosticMapping].map((fn) => fn.toString()).join("\n");
  const forbidden = [/\.appendRow\s*\(/, /\.setValue\s*\(/, /\.setValues\s*\(/, /\.clear\s*\(/, /\.clearContent\s*\(/, /\.deleteRow\s*\(/, /\.deleteColumn\s*\(/, /\.insertColumn\w*\s*\(/, /\.insertRow\w*\s*\(/, /\bRepositoryWriter\b/, /\bDatabase\.createSheet\s*\(/, /\bseed\w*\s*\(/i, /\bmigrat\w*\s*\(/i];
  forbidden.forEach((pattern) => _logsAssert(!pattern.test(source), `Logs schema diagnostic write contract failed: ${pattern}.`));
  return true;
}

function _logsEmptyInitializationLegacyHeaders() {
  return ["Timestamp", "User", "Module", "Action", "ReferenceID", "Description"];
}

function _logsEmptyInitializationSheetState(sheet) {
  const lastRow = sheet.getLastRow(); const lastColumn = sheet.getLastColumn();
  const headers = lastRow > 0 && lastColumn > 0 ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0] : [];
  const headerFormulas = lastRow > 0 && lastColumn > 0 ? sheet.getRange(1, 1, 1, lastColumn).getFormulas()[0] : [];
  const physicalDataRows = Math.max(0, lastRow - 1);
  let nonblankBelowHeader = [];
  if (sheet.getMaxRows() > 1 && lastColumn > 0) {
    const below = sheet.getRange(2, 1, sheet.getMaxRows() - 1, lastColumn).getValues();
    below.forEach((row, index) => { if (row.some((value) => value !== "" && value !== null)) nonblankBelowHeader.push(index + 2); });
  }
  return { lastRow, lastColumn, headers, headerFormulas, physicalDataRows, nonblankBelowHeader, maxColumns: sheet.getMaxColumns(), maxRows: sheet.getMaxRows() };
}

function _logsEmptyInitializationOtherSheets(spreadsheet) {
  const result = {};
  spreadsheet.getSheets().forEach((sheet) => {
    if (sheet.getName() !== LOG_SCHEMA.TABLE) result[sheet.getName()] = { lastRow: sheet.getLastRow(), lastColumn: sheet.getLastColumn(), maxRows: sheet.getMaxRows(), maxColumns: sheet.getMaxColumns() };
  });
  return result;
}

function logsEmptyLegacySchemaInitialization() {
  const canonical = LOG_SCHEMA.HEADERS.slice();
  const expectedCanonical = ["ID", "Timestamp", "Level", "Category", "Module", "Action", "EntityType", "EntityID", "Actor", "Status", "Message", "BeforeData", "AfterData", "Context", "DurationMs", "CorrelationID", "Source", "ErrorName", "ErrorMessage", "ErrorStack", "CreatedAt"];
  const legacy = _logsEmptyInitializationLegacyHeaders();
  const summary = { initialHeaders: [], initialPhysicalDataRows: 0, canonicalHeaderCount: canonical.length, headerWritePerformed: false, finalPhysicalDataRows: 0, finalAuditClassification: "NOT_RUN", rollbackAttempted: false, rollbackSuccessful: false, idempotentNoOp: false, result: "FAIL" };
  let sheet = null; let original = null; let insertedColumns = 0; let writeStarted = false;

  function failPreflight(condition) {
    Logger.log(`LOGS INITIALIZATION PREFLIGHT: FAIL - ${condition}`);
    throw new Error(condition);
  }

  try {
    const spreadsheet = Database.spreadsheet();
    sheet = spreadsheet.getSheetByName(LOG_SCHEMA.TABLE);
    if (!sheet) failPreflight("Logs sheet does not exist.");
    if (sheet.getName() !== "Logs" || LOG_SCHEMA.TABLE !== "Logs") failPreflight("Sheet name is not exactly Logs.");
    if (JSON.stringify(canonical) !== JSON.stringify(expectedCanonical)) failPreflight("LOG_SCHEMA canonical header authority differs from the required order.");
    original = _logsEmptyInitializationSheetState(sheet);
    summary.initialHeaders = original.headers.slice(); summary.initialPhysicalDataRows = original.physicalDataRows;

    const exactCanonical = JSON.stringify(original.headers) === JSON.stringify(canonical);
    if (exactCanonical) {
      if (original.physicalDataRows !== 0 || original.nonblankBelowHeader.length !== 0) failPreflight("Canonical headers exist but physical data is not empty.");
      const alreadyAudit = LogsService.audit();
      if (!alreadyAudit.success || ["SAFE", "EMPTY_SAFE_TO_INITIALIZE"].indexOf(alreadyAudit.data.classification) < 0) failPreflight(`Canonical headers exist but Logs audit is unsafe: ${alreadyAudit.data && alreadyAudit.data.classification}.`);
      summary.finalPhysicalDataRows = 0; summary.finalAuditClassification = alreadyAudit.data.classification; summary.idempotentNoOp = true; summary.result = "PASS";
      Logger.log("LOGS INITIALIZATION PREFLIGHT: ALREADY_INITIALIZED");
      Logger.log(`LOGS EMPTY SCHEMA INITIALIZATION SUMMARY: ${JSON.stringify(summary)}`);
      return summary;
    }

    if (original.lastRow !== 1) failPreflight(`Expected last row 1, found ${original.lastRow}.`);
    if (original.physicalDataRows !== 0) failPreflight(`Expected zero physical data rows, found ${original.physicalDataRows}.`);
    if (original.lastColumn !== 6) failPreflight(`Expected exactly six used columns, found ${original.lastColumn}.`);
    if (JSON.stringify(original.headers) !== JSON.stringify(legacy)) failPreflight(`Legacy headers differ: ${JSON.stringify(original.headers)}.`);
    const headerCounts = {}; original.headers.forEach((header) => { headerCounts[header] = (headerCounts[header] || 0) + 1; });
    if (Object.keys(headerCounts).some((header) => headerCounts[header] > 1)) failPreflight("Duplicate legacy header exists.");
    if (original.headers.some((header) => String(header).trim() === "")) failPreflight("Blank legacy header exists.");
    if (original.headerFormulas.some(Boolean)) failPreflight("A formula exists in the legacy header row.");
    if (original.nonblankBelowHeader.length !== 0) failPreflight(`Nonblank cells exist below row 1: ${original.nonblankBelowHeader.join(", ")}.`);
    const preflightAudit = LogsService.audit();
    if (!preflightAudit.success || preflightAudit.data.classification !== "LEGACY_SCHEMA_MIGRATION_REQUIRED") failPreflight(`Logs audit is not compatible with the specific empty legacy-header initialization: ${preflightAudit.data && preflightAudit.data.classification}.`);
    Logger.log(`LOGS INITIALIZATION PREFLIGHT: PASS - ${JSON.stringify({ sheet: sheet.getName(), lastRow: original.lastRow, lastColumn: original.lastColumn, physicalDataRows: original.physicalDataRows, headers: original.headers, auditClassification: preflightAudit.data.classification })}`);

    const otherSheetsBefore = _logsEmptyInitializationOtherSheets(spreadsheet);
    if (original.maxColumns < canonical.length) {
      insertedColumns = canonical.length - original.maxColumns;
      sheet.insertColumnsAfter(original.maxColumns, insertedColumns);
    }
    writeStarted = true;
    sheet.getRange(1, 1, 1, legacy.length).clearContent();
    sheet.getRange(1, 1, 1, canonical.length).setValues([canonical]);
    summary.headerWritePerformed = true;
    Logger.log(`LOGS INITIALIZATION WRITE: canonical header row written; insertedColumns=${insertedColumns}.`);
    SpreadsheetApp.flush();

    const finalState = _logsEmptyInitializationSheetState(sheet); summary.finalPhysicalDataRows = finalState.physicalDataRows;
    const finalCounts = {}; finalState.headers.forEach((header) => { finalCounts[header] = (finalCounts[header] || 0) + 1; });
    if (finalState.lastRow !== 1) throw new Error(`Post-write last row is ${finalState.lastRow}, expected 1.`);
    if (finalState.physicalDataRows !== 0 || finalState.nonblankBelowHeader.length !== 0) throw new Error("Post-write physical data rows are not zero.");
    if (JSON.stringify(finalState.headers) !== JSON.stringify(canonical)) throw new Error("Post-write canonical header order differs.");
    if (Object.keys(finalCounts).some((header) => finalCounts[header] > 1)) throw new Error("Post-write duplicate header exists.");
    if (finalState.headers.some((header) => String(header).trim() === "")) throw new Error("Post-write blank header exists.");
    if (finalState.headers.some((header) => canonical.indexOf(header) < 0)) throw new Error("Post-write unexpected header exists.");
    if (finalState.headerFormulas.some(Boolean)) throw new Error("Post-write header formula exists.");
    if (JSON.stringify(_logsEmptyInitializationOtherSheets(spreadsheet)) !== JSON.stringify(otherSheetsBefore)) throw new Error("An unrelated sheet dimension changed.");
    RepositoryBase.clearHeaderCache(LOG_SCHEMA);
    const finalAudit = LogsService.audit(); summary.finalAuditClassification = finalAudit.success && finalAudit.data ? finalAudit.data.classification : "AUDIT_FAILED";
    if (!finalAudit.success || ["EMPTY_SAFE_TO_INITIALIZE", "SAFE"].indexOf(finalAudit.data.classification) < 0) throw new Error(`Post-write Logs audit is unsafe: ${summary.finalAuditClassification}.`);
    summary.result = "PASS";
    Logger.log(`LOGS INITIALIZATION VERIFICATION: PASS - ${JSON.stringify({ lastRow: finalState.lastRow, physicalDataRows: finalState.physicalDataRows, auditClassification: summary.finalAuditClassification })}`);
    Logger.log(`LOGS EMPTY SCHEMA INITIALIZATION SUMMARY: ${JSON.stringify(summary)}`);
    return summary;
  } catch (error) {
    if (writeStarted && sheet && original) {
      summary.rollbackAttempted = true;
      try {
        Logger.log(`LOGS INITIALIZATION ROLLBACK: START - ${error.message}`);
        const clearWidth = Math.min(canonical.length, sheet.getMaxColumns());
        sheet.getRange(1, 1, 1, clearWidth).clearContent();
        sheet.getRange(1, 1, 1, original.headers.length).setValues([original.headers]);
        if (insertedColumns > 0 && sheet.getMaxColumns() >= original.maxColumns + insertedColumns) sheet.deleteColumns(original.maxColumns + 1, insertedColumns);
        SpreadsheetApp.flush(); RepositoryBase.clearHeaderCache(LOG_SCHEMA);
        const restored = _logsEmptyInitializationSheetState(sheet);
        summary.rollbackSuccessful = JSON.stringify(restored.headers) === JSON.stringify(original.headers) && restored.lastRow === 1 && restored.physicalDataRows === 0 && restored.maxColumns === original.maxColumns;
        Logger.log(`LOGS INITIALIZATION ROLLBACK: ${summary.rollbackSuccessful ? "PASS" : "FAIL"} - ${JSON.stringify({ headers: restored.headers, lastRow: restored.lastRow, physicalDataRows: restored.physicalDataRows, maxColumns: restored.maxColumns })}`);
      } catch (rollbackError) {
        summary.rollbackSuccessful = false;
        Logger.log(`LOGS INITIALIZATION ROLLBACK: FAIL - ${rollbackError.message}`);
        error = new Error(`${error.message} Rollback also failed: ${rollbackError.message}`);
      }
    }
    Logger.log(`LOGS EMPTY SCHEMA INITIALIZATION SUMMARY: ${JSON.stringify(Object.assign(summary, { error: error.message }))}`);
    throw error;
  }
}

function testLogsEmptyLegacySchemaInitializationSourceContract() {
  const source = logsEmptyLegacySchemaInitialization.toString();
  const acceptanceSource = runLogsModuleAcceptance.toString();
  _logsAssert(typeof runLogsEmptyLegacySchemaInitialization === "function", "Independent Logs initialization runner is missing.");
  _logsAssert(acceptanceSource.indexOf("runLogsEmptyLegacySchemaInitialization") < 0 && acceptanceSource.indexOf("logsEmptyLegacySchemaInitialization") < 0, "Logs acceptance invokes schema initialization.");
  _logsAssert(source.indexOf('_logsEmptyInitializationLegacyHeaders') >= 0, "Exact legacy header precondition is missing.");
  _logsAssert(JSON.stringify(_logsEmptyInitializationLegacyHeaders()) === JSON.stringify(["Timestamp", "User", "Module", "Action", "ReferenceID", "Description"]), "Exact six-column legacy header contract differs.");
  _logsAssert(source.indexOf("LOG_SCHEMA.HEADERS.slice()") >= 0, "Canonical headers do not come from schema authority.");
  const zeroRows = source.indexOf("original.physicalDataRows !== 0"); const firstWrite = Math.min(source.indexOf(".clearContent()"), source.indexOf(".setValues("));
  _logsAssert(zeroRows >= 0 && firstWrite > zeroRows, "Zero-data-row precondition does not precede the first write.");
  _logsAssert(!/AuditLogService|AppLogService|RepositoryWriter/.test(source), "Initialization calls a prohibited log or repository writer.");
  _logsAssert(source.indexOf("LOGS INITIALIZATION ROLLBACK:") >= 0 && source.indexOf("original.headers") >= 0, "Rollback path is missing.");
  _logsAssert(source.indexOf("ALREADY_INITIALIZED") >= 0 && source.indexOf("idempotentNoOp = true") >= 0, "Idempotent no-op path is missing.");
  _logsAssert(source.indexOf("getSheetByName(LOG_SCHEMA.TABLE)") >= 0 && source.indexOf("_logsEmptyInitializationOtherSheets") >= 0, "Logs-only mutation guard is missing.");
  _logsAssert(!/DatabaseSetup|Database\.createSheet|\.appendRow\s*\(|\bseed\w*\s*\(/i.test(source), "Initialization invokes a prohibited setup, creation, append, or seed path.");
  _logsAssert(source.indexOf("PropertiesService") < 0, "Initialization incorrectly depends on a prior marker.");
  return true;
}
