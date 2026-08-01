function _settingsAssert(condition, message) {
  if (!condition) throw new Error(message);
}

function _settingsTestHarness(options = {}) {
  let sequence = 0;
  let physicalReads = 0;
  const headers = SETTINGS_SCHEMA.HEADERS.slice();
  const rows = (options.rows || []).map((row) => headers.map((header) => Object.prototype.hasOwnProperty.call(row, header) ? row[header] : ""));
  const cacheValues = {};
  const base = {
    headers: () => (options.headers || headers).slice(),
    rows: () => { physicalReads++; return rows.map((row) => row.slice()); },
    mapRows: (schema, values) => values.map((row) => {
      const result = {}; headers.forEach((header, index) => { result[header] = row[index]; }); return result;
    }),
  };
  function rowIndex(id) { return rows.findIndex((row) => row[headers.indexOf("ID")] === id); }
  const writer = {
    insert: (schema, object) => { rows.push(headers.map((header) => object[header] ?? "")); return true; },
    insertMany: (schema, objects) => { objects.forEach((object) => writer.insert(schema, object)); return true; },
    update: (schema, id, changes) => {
      const index = rowIndex(id); if (index < 0) return false;
      Object.keys(changes).forEach((key) => { const column = headers.indexOf(key); if (column >= 0) rows[index][column] = changes[key]; }); return true;
    },
  };
  const cache = {
    get: (key) => cacheValues[key] || null,
    put: (key, value) => { cacheValues[key] = value; },
    remove: (key) => { delete cacheValues[key]; },
    removeAll: (keys) => keys.forEach((key) => delete cacheValues[key]),
  };
  const service = SettingsService({ base, reader: {}, writer, cache, repositoryCache: { clear: () => {} }, generateId: () => `ST-TEST-${++sequence}`, now: () => new Date("2026-07-22T00:00:00Z"), currentUser: () => "SETTINGS_TEST", auditLog: options.auditLog });
  return { service, rows, headers, cacheValues, physicalReadCount: () => physicalReads };
}

function _settingsRow(key, value, type, overrides = {}) {
  return Object.assign({ ID: `ST-${key}`, Key: key, Value: value, Type: type, Group: "Test", Label: key, Description: "Test", IsEditable: true, Deleted: false, IsActive: true, CreatedAt: new Date(), CreatedBy: "TEST", UpdatedAt: new Date(), UpdatedBy: "TEST" }, overrides);
}

function testSettingsRegistryAndParsing() {
  const service = _settingsTestHarness().service;
  const definitions = service.definitions();
  const required = ["BUSINESS_NAME", "BUSINESS_TIMEZONE", "BUSINESS_LOCALE", "BUSINESS_CURRENCY", "DASHBOARD_DEFAULT_RANGE", "CACHE_ENABLED", "CACHE_TTL_SECONDS", "DEBUG_MODE", "LOG_LEVEL", "ROWS_PER_PAGE", "DEFAULT_PAGE_SIZE", "DATE_FORMAT", "NUMBER_FORMAT"];
  _settingsAssert(definitions.length === required.length, "Registry contains an unexpected number of definitions.");
  _settingsAssert(new Set(definitions.map((item) => item.key)).size === definitions.length, "Registry keys must be unique.");
  required.forEach((key) => _settingsAssert(definitions.some((item) => item.key === key), `Missing registry key ${key}.`));
  definitions.forEach((item) => service.parseValue(item.key, item.defaultValue));
  _settingsAssert(service.parseValue("CACHE_ENABLED", "TRUE") === true, "TRUE must parse as boolean true.");
  _settingsAssert(service.parseValue("ROWS_PER_PAGE", "20") === 20, "Integer parsing failed.");
  _settingsAssert(service.parseValue("DEFAULT_PAGE_SIZE", "15") === 15, "Default page-size parsing failed.");
  [10, 15, 25, 50, 100].forEach((value) => _settingsAssert(service.parseValue("DEFAULT_PAGE_SIZE", String(value)) === value, `Page size ${value} was rejected.`));
  [0, 20, 500].forEach((value) => { let failed = false; try { service.parseValue("DEFAULT_PAGE_SIZE", String(value)); } catch (error) { failed = true; } _settingsAssert(failed, `Invalid page size ${value} was accepted.`); });
  _settingsAssert(service.parseTypedValue("NUMBER", "2.5", {}) === 2.5, "Number parsing failed.");
  _settingsAssert(service.parseTypedValue("DATE", "2026-07-22", {}) === "2026-07-22", "Date parsing failed.");
  _settingsAssert(Array.isArray(service.parseTypedValue("JSON", "[1,2]", {})), "JSON array parsing failed.");
  ["yes", 1, ""].forEach((value) => { let failed = false; try { service.parseValue("CACHE_ENABLED", value); } catch (error) { failed = true; } _settingsAssert(failed, "Ambiguous boolean was accepted."); });
  ["20.5", "NaN", "4", "501"].forEach((value) => { let failed = false; try { service.parseValue("ROWS_PER_PAGE", value); } catch (error) { failed = true; } _settingsAssert(failed, `Invalid integer ${value} was accepted.`); });
  let enumFailed = false; try { service.parseValue("LOG_LEVEL", "TRACE"); } catch (error) { enumFailed = true; }
  _settingsAssert(enumFailed, "Invalid enum was accepted.");
  [
    ["NUMBER", "NaN"], ["DATE", "2026-02-30"], ["JSON", "{bad"], ["JSON", "null"],
  ].forEach(([type, value]) => { let failed = false; try { service.parseTypedValue(type, value, {}); } catch (error) { failed = true; } _settingsAssert(failed, `Invalid ${type} was accepted.`); });
}

function testSettingsResolutionAndAudit() {
  const harness = _settingsTestHarness({ rows: [
    _settingsRow("BUSINESS_NAME", "Starling Test", "STRING"),
    _settingsRow("CACHE_ENABLED", "maybe", "BOOLEAN"),
    _settingsRow("DEBUG_MODE", "true", "BOOLEAN", { IsActive: false }),
  ] });
  let result = harness.service.getResolved("BUSINESS_NAME");
  _settingsAssert(result.success && result.data.source === "PERSISTED" && result.data.value === "Starling Test", "Valid persisted resolution failed.");
  result = harness.service.getResolved("DEBUG_MODE");
  _settingsAssert(result.success && result.data.source === "DEFAULT", "Inactive row must resolve to default.");
  result = harness.service.getResolved("CACHE_ENABLED");
  _settingsAssert(result.success && result.data.source === "INVALID_PERSISTED_FALLBACK" && result.data.valid === false, "Invalid persisted fallback is not diagnostic.");
  _settingsAssert(harness.service.getResolved("UNKNOWN").success === false, "Unknown key was not rejected.");
  const audit = harness.service.audit();
  _settingsAssert(audit.data.classification === "NEEDS_DATA_CLEANUP", "Invalid production shape was not classified for cleanup.");
  _settingsAssert(audit.data.findings.some((item) => item.code === "INVALID_BOOLEAN"), "Invalid boolean was not audited.");
  const duplicate = _settingsTestHarness({ rows: [_settingsRow("BUSINESS_NAME", "A", "STRING"), _settingsRow("BUSINESS_NAME", "B", "STRING", { ID: "ST-2" })] });
  _settingsAssert(duplicate.service.audit().data.findings.some((item) => item.code === "DUPLICATE_KEY"), "Duplicate key was not audited.");
}

function testSettingsMutationAndSeeding() {
  const original = _settingsRow("ROWS_PER_PAGE", "20", "INTEGER", { Group: "UI", Label: "Rows", Description: "Rows", CreatedBy: "ORIGINAL" });
  const harness = _settingsTestHarness({ rows: [original] });
  harness.service.getResolved("ROWS_PER_PAGE");
  _settingsAssert(Object.keys(harness.cacheValues).length === 1, "Resolved setting was not cached.");
  let result = harness.service.updateValue("ROWS_PER_PAGE", "25");
  _settingsAssert(result.success && result.data.value === 25, "Valid update failed.");
  _settingsAssert(!harness.cacheValues["IPS:Settings:resolved:v1:list"], "List cache was not invalidated.");
  const mapped = harness.service.audit();
  _settingsAssert(harness.rows.length === 1, "Update created a duplicate row.");
  _settingsAssert(harness.rows[0][harness.headers.indexOf("Key")] === "ROWS_PER_PAGE" && harness.rows[0][harness.headers.indexOf("Type")] === "INTEGER", "Immutable metadata changed.");
  _settingsAssert(harness.rows[0][harness.headers.indexOf("CreatedBy")] === "ORIGINAL", "Create audit fields changed.");
  _settingsAssert(harness.service.updateValue("ROWS_PER_PAGE", "2").success === false, "Out-of-range update was accepted.");
  _settingsAssert(harness.service.updateValue("UNKNOWN", "x").success === false, "Unknown key update was accepted.");
  const lockedDefinition = { key: "LOCKED_TEST", type: "STRING", group: "System", label: "Locked", description: "Test", defaultValue: "fixed", editable: false, rules: { required: true } };
  const locked = _settingsTestHarness({ rows: [_settingsRow("LOCKED_TEST", "fixed", "STRING", { IsEditable: false })] });
  const lockedService = SettingsService({ base: { headers: () => locked.headers, rows: () => locked.rows, mapRows: (schema, rows) => rows.map((row) => { const item = {}; locked.headers.forEach((header, index) => { item[header] = row[index]; }); return item; }) }, writer: { update: () => true, insert: () => true, insertMany: () => true }, cache: { get: () => null, put: () => {}, remove: () => {}, removeAll: () => {} }, repositoryCache: { clear: () => {} }, registry: [lockedDefinition] });
  _settingsAssert(lockedService.updateValue("LOCKED_TEST", "changed").success === false, "Non-editable setting update was accepted.");
  result = harness.service.resetToDefault("ROWS_PER_PAGE");
  _settingsAssert(result.success && result.data.value === PAGINATION_CONFIG.DEFAULT_LIMIT, "Reset did not write the canonical default.");
  const seeded = harness.service.seedMissing();
  _settingsAssert(seeded.success && seeded.data.count === harness.service.definitions().length - 1, "Missing settings were not seeded.");
  _settingsAssert(harness.service.seedMissing().data.count === 0, "Seeding is not idempotent.");
  const deleted = _settingsTestHarness({ rows: [_settingsRow("BUSINESS_NAME", "Old", "STRING", { Deleted: true, IsActive: false })] });
  const deletedSeed = deleted.service.seedMissing();
  _settingsAssert(deletedSeed.success && deletedSeed.data.count === deleted.service.definitions().length - 1, "Deleted physical key was incorrectly reseeded.");
  _settingsAssert(deleted.rows.filter((row) => row[deleted.headers.indexOf("Key")] === "BUSINESS_NAME").length === 1, "Deleted physical key was duplicated.");
  _settingsAssert(mapped.success, "Audit response failed.");
}

function testSettingsMutationAuditContract() {
  const events = [];
  const harness = _settingsTestHarness({
    rows: [_settingsRow("LOG_LEVEL", "INFO", "ENUM")],
    auditLog: { bestEffort: (event) => { events.push(event); return { recorded: true, id: "LG-TEST" }; } },
  });
  _settingsAssert(harness.service.updateValue("LOG_LEVEL", "WARN").success, "Audited Settings update failed.");
  _settingsAssert(events.length === 1 && events[0].action === "SETTINGS_UPDATE" && events[0].entityType === "Setting" && events[0].entityId === "LOG_LEVEL", "Settings update audit contract differs.");
  _settingsAssert(events[0].module === "Settings" && events[0].source === "SettingsService" && events[0].status === "SUCCESS", "Settings update audit metadata differs.");
  _settingsAssert(harness.service.resetToDefault("LOG_LEVEL").success, "Audited Settings reset failed.");
  _settingsAssert(events.length === 2 && events[1].action === "SETTINGS_RESET" && events[1].entityId === "LOG_LEVEL", "Settings reset audit contract differs.");

  const tolerant = _settingsTestHarness({
    rows: [_settingsRow("LOG_LEVEL", "INFO", "ENUM")],
    auditLog: { bestEffort: () => ({ recorded: false, reason: "WRITE_FAILURE" }) },
  });
  _settingsAssert(tolerant.service.updateValue("LOG_LEVEL", "DEBUG").success, "Best-effort audit failure became destructive to Settings update.");
  return true;
}

function testSettingsSchemaAuditGuard() {
  const harness = _settingsTestHarness({ headers: ["ID", "Key"] });
  const audit = harness.service.audit();
  _settingsAssert(audit.data.classification === "BLOCKING_SCHEMA_DEFECT", "Missing headers must block writes.");
  _settingsAssert(harness.service.seedMissing().success === false, "Seeding proceeded despite a schema defect.");
}

function testSettingsListResolvedBoundedPhysicalRead() {
  const harness = _settingsTestHarness({ rows: [
    _settingsRow("DEFAULT_PAGE_SIZE", "25", "INTEGER"),
    _settingsRow("DASHBOARD_DEFAULT_RANGE", "LAST_7_DAYS", "ENUM"),
  ] });
  const first = harness.service.listResolved();
  _settingsAssert(first.success && first.data.length === harness.service.definitions().length, "Settings list resolution failed.");
  _settingsAssert(harness.physicalReadCount() === 1, "Cold Settings list resolution must physically read the Settings source once.");
  const second = harness.service.listResolved();
  _settingsAssert(second.success && JSON.stringify(second.data) === JSON.stringify(first.data), "Cached Settings list shape changed.");
  _settingsAssert(harness.physicalReadCount() === 1, "Cached Settings list resolution reread the Settings source.");
}

function testSettingsCacheFailureBypass() {
  let reads = 0;
  const headers = SETTINGS_SCHEMA.HEADERS.slice();
  const rows = [_settingsRow("DEFAULT_PAGE_SIZE", "25", "INTEGER")];
  const values = rows.map((row) => headers.map((header) => row[header] ?? ""));
  const service = SettingsService({
    base: {
      headers: () => headers.slice(),
      rows: () => { reads++; return values.map((row) => row.slice()); },
      mapRows: (schema, source) => source.map((row) => { const item = {}; headers.forEach((header, index) => { item[header] = row[index]; }); return item; }),
    },
    reader: {}, writer: {}, repositoryCache: { clear: () => {} },
    cache: {
      get: () => { throw new Error("Cache temporarily unavailable."); },
      put: () => { throw new Error("Cache quota exceeded."); },
      remove: () => { throw new Error("Cache temporarily unavailable."); },
      removeAll: () => {},
    },
  });
  const response = service.listResolved();
  _settingsAssert(response.success && response.data.find((item) => item.key === "DEFAULT_PAGE_SIZE").value === 25, "Settings cache failure blocked a valid source read.");
  _settingsAssert(reads === 1, "Settings cache bypass changed the one-read source contract.");
}

function testSettingsFrontendSessionLoadContract() {
  const app = HtmlService.createHtmlOutputFromFile("970.View.App").getContent();
  const ensureStart = app.indexOf("function ensureSettingsLoaded");
  const ensureEnd = app.indexOf("function applyLogsFilterControls", ensureStart);
  const ensureSource = app.slice(ensureStart, ensureEnd);
  const loadStart = app.indexOf("async function loadSettings()");
  const loadEnd = app.indexOf("function settingInputValue", loadStart);
  const loadSource = app.slice(loadStart, loadEnd);
  _settingsAssert((ensureSource.match(/Api\.Settings\.list\(/g) || []).length === 1, "Settings session loader must own one canonical list request.");
  _settingsAssert(!/Api\.Settings\.list\(/.test(loadSource), "Settings page bypasses the session loader.");
  _settingsAssert(/settingsLoading/.test(ensureSource) && /settingsLoaded/.test(ensureSource), "Settings session load does not deduplicate cached and in-flight requests.");
  _settingsAssert(/applyDefaultPageSize\(15, true\)/.test(app), "Immediate Settings failure fallback 15 is missing.");
  const mutateStart = app.indexOf("async function mutateSetting");
  const mutateEnd = app.indexOf("function bindSettingsActions", mutateStart);
  const mutateSource = app.slice(mutateStart, mutateEnd);
  _settingsAssert(!/ensureSettingsLoaded\(true\)|Api\.Settings\.list\(/.test(mutateSource), "Settings mutation performs a redundant list reload.");
  _settingsAssert(/state\.settings = state\.settings\.map/.test(mutateSource), "Settings mutation does not update the session cache from its authoritative response.");
}

function runSettingsFocusedTests() {
  runTestSuite("Settings focused tests", [testSettingsRegistryAndParsing, testSettingsResolutionAndAudit, testSettingsMutationAndSeeding, testSettingsMutationAuditContract, testSettingsSchemaAuditGuard, testSettingsListResolvedBoundedPhysicalRead, testSettingsCacheFailureBypass, testSettingsFrontendSessionLoadContract, testSettingsMaintenanceOwnershipContract, testSettingsSchemaDiagnosticReadOnlyContract, testSettingsLegacyMigrationSourceContract]);
}

function testSettingsMaintenanceOwnershipContract() {
  const maintenance = [
    settingsSchemaCompatibilityDiagnostic,
    settingsLegacySchemaMigration,
  ].map((fn) => fn.toString()).join("\n");
  const tests = runSettingsFocusedTests.toString();
  ["settingsSchemaCompatibilityDiagnostic", "settingsLegacySchemaMigration"].forEach((name) => {
    _settingsAssert((maintenance.match(new RegExp(`function\\s+${name}\\s*\\(`, "g")) || []).length === 1, `${name} is missing or duplicated in Settings maintenance.`);
    _settingsAssert(!new RegExp(`function\\s+${name}\\s*\\(`).test(tests), `${name} remains implemented in the Settings test file.`);
  });
  _settingsAssert(typeof settingsSchemaCompatibilityDiagnostic === "function" && settingsSchemaCompatibilityDiagnostic.length === 0, "Settings diagnostic public symbol or arity changed.");
  _settingsAssert(typeof settingsLegacySchemaMigration === "function" && settingsLegacySchemaMigration.length === 0, "Settings migration public symbol or arity changed.");
}

function testSettingsSchemaDiagnosticReadOnlyContract() {
  const source = `${settingsSchemaCompatibilityDiagnostic.toString()}\n${runSettingsSchemaCompatibilityDiagnostic.toString()}`;
  const forbidden = [
    /seedMissing\s*\(/, /updateValue\s*\(/, /resetToDefault\s*\(/,
    /setupDatabase\s*\(/, /appendRow\s*\(/, /\.setValue\s*\(/,
    /\.setValues\s*\(/, /insertColumn\w*\s*\(/, /deleteColumn\w*\s*\(/,
    /\.clear\s*\(/, /clearContent\s*\(/, /RepositoryWriter/,
  ];
  forbidden.forEach((pattern) => _settingsAssert(!pattern.test(source), `Settings schema diagnostic contains forbidden write contract: ${pattern}.`));
}

function testSettingsLegacyMigrationSourceContract() {
  const source = settingsLegacySchemaMigration.toString();
  const preflightSource = _settingsMigrationPreflight.toString();
  const backupSource = _settingsMigrationEnsureBackup.toString();
  const verifySource = _settingsMigrationVerify.toString();
  const restoreSource = _settingsMigrationRestoreLegacy.toString();
  const runnerSource = runSettingsLegacySchemaMigration.toString();
  const acceptanceSource = runSettingsModuleAcceptance.toString();
  _settingsAssert(_settingsMigrationEqual(Object.keys(SETTINGS_LEGACY_MIGRATION.mapping).sort(), ["CompanyName", "Currency"]), "Legacy mapping must contain exactly CompanyName and Currency.");
  SETTINGS_LEGACY_MIGRATION.unsupported.forEach((key) => _settingsAssert(!Object.prototype.hasOwnProperty.call(SETTINGS_LEGACY_MIGRATION.mapping, key), `${key} must not be migrated.`));
  _settingsAssert(source.indexOf("_settingsMigrationPreflight") < source.indexOf("_settingsMigrationEnsureBackup"), "Preflight must occur before backup.");
  _settingsAssert(source.indexOf("_settingsMigrationEnsureBackup") < source.indexOf("sheet.clear()"), "Backup must occur before Settings mutation.");
  _settingsAssert(source.indexOf("_settingsMigrationPreflight") < source.indexOf("sheet.clear()"), "All preflight checks must occur before the first Settings write.");
  _settingsAssert(preflightSource.indexOf("setValue") < 0 && preflightSource.indexOf("setValues") < 0 && preflightSource.indexOf("clear()") < 0, "Preflight must remain read-only.");
  _settingsAssert(backupSource.indexOf("copyTo") >= 0 && backupSource.indexOf("verified") >= 0, "Backup creation and verification contract is missing.");
  _settingsAssert(source.indexOf("_settingsMigrationRestoreLegacy") >= 0 && restoreSource.indexOf("preflight.values") >= 0, "Rollback path is missing.");
  _settingsAssert(verifySource.indexOf('classification !== "SAFE"') >= 0, "SAFE audit verification is missing.");
  _settingsAssert(source.indexOf("ALREADY_MIGRATED") >= 0 && source.indexOf("idempotentNoOp = true") >= 0, "Safe canonical second execution must be a no-op.");
  _settingsAssert(acceptanceSource.indexOf("settingsLegacySchemaMigration") < 0 && acceptanceSource.indexOf("runSettingsLegacySchemaMigration") < 0, "Acceptance must not invoke migration.");
  _settingsAssert(runnerSource.indexOf("settingsLegacySchemaMigration") >= 0, "Independent migration runner is not wired.");
}
