function _settingsDiagnosticLog(prefix, value) {
  Logger.log(`${prefix} ${typeof value === "string" ? value : JSON.stringify(value)}`);
}

function _settingsDiagnosticCellType(value) {
  if (value === null) return "null";
  if (value instanceof Date) return "date";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function _settingsDiagnosticSensitiveHeader(header) {
  return /(secret|token|password|credential|api[\s_-]*key|private[\s_-]*key)/i.test(String(header || ""));
}

function _settingsDiagnosticRedact(header, value) {
  return _settingsDiagnosticSensitiveHeader(header) && value !== "" ? "[REDACTED]" : value;
}

function _settingsDiagnosticHeaderAnalysis(physicalHeaders, expectedHeaders) {
  const positions = {};
  physicalHeaders.forEach((header, index) => {
    const text = String(header == null ? "" : header);
    if (!positions[text]) positions[text] = [];
    positions[text].push(index + 1);
  });
  const duplicateHeaders = Object.keys(positions)
    .filter((header) => header !== "" && positions[header].length > 1)
    .map((header) => ({ header, columns: positions[header] }));
  const blankHeaderCells = physicalHeaders
    .map((header, index) => String(header == null ? "" : header).trim() === "" ? index + 1 : null)
    .filter((column) => column !== null);
  const missingExpectedHeaders = expectedHeaders.filter((header) => physicalHeaders.indexOf(header) < 0);
  const unexpectedHeaders = physicalHeaders
    .filter((header) => String(header == null ? "" : header).trim() !== "" && expectedHeaders.indexOf(header) < 0);
  const caseOnlyMismatches = [];
  const whitespaceMismatches = [];
  physicalHeaders.forEach((header, index) => {
    const raw = String(header == null ? "" : header);
    expectedHeaders.forEach((expected) => {
      if (raw !== expected && raw.trim() === raw && raw.toLowerCase() === expected.toLowerCase()) {
        caseOnlyMismatches.push({ column: index + 1, physical: raw, expected });
      }
      if (raw !== expected && raw.trim() === expected) {
        whitespaceMismatches.push({ column: index + 1, physical: raw, expected });
      }
    });
  });
  return {
    duplicateHeaders,
    blankHeaderCells,
    missingExpectedHeaders,
    unexpectedHeaders,
    caseOnlyMismatches,
    whitespaceMismatches,
    exactOrderCompatible: JSON.stringify(physicalHeaders) === JSON.stringify(expectedHeaders),
  };
}

function _settingsDiagnosticMapping(physicalHeaders, expectedHeaders) {
  const normalizedTargets = {};
  expectedHeaders.forEach((header) => {
    const normalized = header.trim().toLowerCase();
    if (!normalizedTargets[normalized]) normalizedTargets[normalized] = [];
    normalizedTargets[normalized].push(header);
  });
  const normalizedSources = {};
  physicalHeaders.forEach((header, index) => {
    const normalized = String(header == null ? "" : header).trim().toLowerCase();
    if (!normalizedSources[normalized]) normalizedSources[normalized] = [];
    normalizedSources[normalized].push(index + 1);
  });
  const proposed = [];
  const unmappableColumns = [];
  const ambiguousColumns = [];
  physicalHeaders.forEach((header, index) => {
    const physical = String(header == null ? "" : header);
    const normalized = physical.trim().toLowerCase();
    const targets = normalizedTargets[normalized] || [];
    const sourceColumns = normalizedSources[normalized] || [];
    if (!normalized || targets.length === 0) {
      unmappableColumns.push({ column: index + 1, header: physical });
    } else if (targets.length !== 1 || sourceColumns.length !== 1) {
      ambiguousColumns.push({ column: index + 1, header: physical, candidateTargets: targets, sourceColumns });
    } else {
      proposed.push({ sourceColumn: index + 1, sourceHeader: physical, targetHeader: targets[0], match: physical === targets[0] ? "EXACT" : physical.trim() === targets[0] ? "WHITESPACE" : "CASE_INSENSITIVE" });
    }
  });
  return { proposed, unmappableColumns, ambiguousColumns };
}

function settingsSchemaCompatibilityDiagnostic() {
  const expectedHeaders = SETTINGS_SCHEMA.HEADERS.slice();
  const spreadsheet = Database.spreadsheet();
  const spreadsheetInfo = { id: spreadsheet.getId(), name: spreadsheet.getName() };
  const sheet = spreadsheet.getSheetByName(SETTINGS_SCHEMA.TABLE);
  _settingsDiagnosticLog("SETTINGS SCHEMA DIAGNOSTIC:", { spreadsheet: spreadsheetInfo, sheetName: SETTINGS_SCHEMA.TABLE, sheetExists: sheet ? "YES" : "NO" });

  if (!sheet) {
    const missingReport = {
      classification: "SHEET_MISSING", sheetExists: false, sheetName: SETTINGS_SCHEMA.TABLE,
      lastRow: 0, lastColumn: 0, physicalDataRows: 0, headerCompatible: false,
      safeAutomaticInitialization: true, safeAutomaticMigration: false,
      manualActionRequired: true, reasons: ["The physical Settings sheet does not exist."], result: "FAIL",
    };
    _settingsDiagnosticLog("SETTINGS PHYSICAL HEADERS:", []);
    _settingsDiagnosticLog("SETTINGS EXPECTED HEADERS:", expectedHeaders);
    _settingsDiagnosticLog("SETTINGS HEADER FINDING:", missingReport.reasons[0]);
    _settingsDiagnosticLog("SETTINGS MIGRATION ASSESSMENT:", { canonicalHeadersCanBeWrittenWithoutDataLoss: true, legacyRowsMapDeterministically: false, physicalBackupRequired: false, automatedMigrationSafe: false, manualCleanupRequired: false, proposedHeaderMapping: [], unmappableColumns: [], rowsWithAmbiguousMapping: [] });
    _settingsDiagnosticLog("SETTINGS SCHEMA DIAGNOSTIC SUMMARY:", missingReport);
    return missingReport;
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const physicalHeaders = lastRow > 0 && lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    : [];
  const dataValues = lastRow > 1 && lastColumn > 0
    ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
    : [];
  const dataFormulas = lastRow > 1 && lastColumn > 0
    ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getFormulas()
    : [];
  const headerAnalysis = _settingsDiagnosticHeaderAnalysis(physicalHeaders, expectedHeaders);
  const mapping = _settingsDiagnosticMapping(physicalHeaders, expectedHeaders);
  const rowDetails = dataValues.map((values, index) => {
    const formulas = dataFormulas[index] || [];
    const nonblank = values.some((value, column) => value !== "" || Boolean(formulas[column]));
    return { sheetRow: index + 2, values, formulas, nonblank };
  });
  const nonblankRows = rowDetails.filter((row) => row.nonblank);
  const blankRows = rowDetails.filter((row) => !row.nonblank);
  const ambiguousColumnNumbers = mapping.ambiguousColumns.concat(mapping.unmappableColumns).map((item) => item.column);
  const rowsWithAmbiguousMapping = nonblankRows
    .filter((row) => ambiguousColumnNumbers.some((column) => row.values[column - 1] !== "" || Boolean(row.formulas[column - 1])))
    .map((row) => row.sheetRow);
  const sheetCompletelyEmpty = lastRow === 0 && lastColumn === 0;
  const onlyHeadersExist = lastRow === 1 && lastColumn > 0;
  const hasMalformedHeaders = headerAnalysis.duplicateHeaders.length > 0 || headerAnalysis.blankHeaderCells.length > 0;
  const hasAmbiguousData = rowsWithAmbiguousMapping.length > 0;
  let classification;
  if (sheetCompletelyEmpty) classification = "EMPTY_SHEET_SAFE_TO_INITIALIZE";
  else if (headerAnalysis.exactOrderCompatible && nonblankRows.length === 0) classification = "HEADER_ONLY_COMPATIBLE";
  else if (headerAnalysis.exactOrderCompatible) classification = "COMPATIBLE_WITH_DATA";
  else if (hasAmbiguousData) classification = "AMBIGUOUS_DATA";
  else if (hasMalformedHeaders) classification = "MALFORMED_HEADERS";
  else classification = "LEGACY_SCHEMA_MIGRATION_REQUIRED";

  const reasons = [];
  if (sheetCompletelyEmpty) reasons.push("The sheet has no used cells and can receive canonical headers without overwriting data.");
  if (headerAnalysis.exactOrderCompatible) reasons.push("Physical headers exactly match canonical headers in name and order.");
  if (!headerAnalysis.exactOrderCompatible && !sheetCompletelyEmpty) reasons.push("Physical headers do not exactly match the canonical header sequence.");
  if (headerAnalysis.duplicateHeaders.length) reasons.push(`Duplicate physical headers exist: ${headerAnalysis.duplicateHeaders.map((item) => item.header).join(", ")}.`);
  if (headerAnalysis.blankHeaderCells.length) reasons.push(`Blank header cells exist at columns: ${headerAnalysis.blankHeaderCells.join(", ")}.`);
  if (headerAnalysis.missingExpectedHeaders.length) reasons.push(`Expected headers are missing: ${headerAnalysis.missingExpectedHeaders.join(", ")}.`);
  if (headerAnalysis.unexpectedHeaders.length) reasons.push(`Unexpected headers exist: ${headerAnalysis.unexpectedHeaders.join(", ")}.`);
  if (hasAmbiguousData) reasons.push(`Nonblank data uses unmappable or ambiguous columns in rows: ${rowsWithAmbiguousMapping.join(", ")}.`);

  const canonicalHeadersCanBeWrittenWithoutDataLoss = nonblankRows.length === 0;
  const legacyRowsMapDeterministically = mapping.ambiguousColumns.length === 0 && rowsWithAmbiguousMapping.length === 0;
  const physicalBackupRequired = nonblankRows.length > 0 && !headerAnalysis.exactOrderCompatible;
  const automatedMigrationSafe = headerAnalysis.exactOrderCompatible || (legacyRowsMapDeterministically && mapping.unmappableColumns.length === 0);
  const manualCleanupRequired = hasAmbiguousData || hasMalformedHeaders;
  const migrationAssessment = {
    canonicalHeadersCanBeWrittenWithoutDataLoss,
    legacyRowsMapDeterministically,
    physicalBackupRequired,
    automatedMigrationSafe,
    manualCleanupRequired,
    proposedHeaderMapping: mapping.proposed,
    unmappableColumns: mapping.unmappableColumns,
    ambiguousColumns: mapping.ambiguousColumns,
    rowsWithAmbiguousMapping,
  };

  _settingsDiagnosticLog("SETTINGS PHYSICAL HEADERS:", physicalHeaders);
  _settingsDiagnosticLog("SETTINGS EXPECTED HEADERS:", expectedHeaders);
  Object.keys(headerAnalysis).forEach((key) => _settingsDiagnosticLog("SETTINGS HEADER FINDING:", { finding: key, value: headerAnalysis[key] }));
  nonblankRows.slice(0, 10).forEach((row) => {
    const mapped = {};
    const raw = row.values.map((value, index) => _settingsDiagnosticRedact(physicalHeaders[index], value));
    const types = row.values.map(_settingsDiagnosticCellType);
    const formulaPresence = row.formulas.map(Boolean);
    physicalHeaders.forEach((header, index) => {
      const baseName = String(header == null ? "" : header).trim() || `[column ${index + 1}]`;
      const key = Object.prototype.hasOwnProperty.call(mapped, baseName) ? `${baseName} [column ${index + 1}]` : baseName;
      mapped[key] = _settingsDiagnosticRedact(header, row.values[index]);
    });
    _settingsDiagnosticLog("SETTINGS ROW PREVIEW:", { sheetRow: row.sheetRow, mappedValues: mapped, rawPositionalValues: raw, javascriptTypes: types, formulaPresence });
  });
  _settingsDiagnosticLog("SETTINGS MIGRATION ASSESSMENT:", migrationAssessment);

  const compatible = ["EMPTY_SHEET_SAFE_TO_INITIALIZE", "HEADER_ONLY_COMPATIBLE", "COMPATIBLE_WITH_DATA"].indexOf(classification) >= 0;
  const report = {
    classification,
    sheetExists: true,
    spreadsheet: spreadsheetInfo,
    sheetName: sheet.getName(),
    lastRow,
    lastColumn,
    physicalDataRows: Math.max(lastRow - 1, 0),
    sheetCompletelyEmpty,
    onlyHeadersExist,
    fullyBlankPhysicalRows: blankRows.length,
    nonblankRows: nonblankRows.length,
    headerCompatible: headerAnalysis.exactOrderCompatible,
    safeAutomaticInitialization: sheetCompletelyEmpty || (onlyHeadersExist && nonblankRows.length === 0),
    safeAutomaticMigration: automatedMigrationSafe,
    manualActionRequired: !compatible,
    reasons,
    result: compatible ? "PASS" : "FAIL",
  };
  _settingsDiagnosticLog("SETTINGS SCHEMA DIAGNOSTIC SUMMARY:", report);
  return report;
}

const SETTINGS_LEGACY_MIGRATION = Object.freeze({
  backupSheet: "Settings.Legacy.Backup",
  markerKey: "SETTINGS_LEGACY_SCHEMA_MIGRATION_V1",
  backupMarker: "IP-Starling Settings legacy migration backup v1",
  legacyHeaders: Object.freeze(["Key", "Value"]),
  expectedLegacyKeys: Object.freeze([
    "CompanyName", "Currency", "PickupPrefix", "ReturnPrefix",
    "PartnerPrefix", "ProductPrefix", "ExpensePrefix", "PurchasePrefix",
  ]),
  mapping: Object.freeze({
    CompanyName: "BUSINESS_NAME",
    Currency: "BUSINESS_CURRENCY",
  }),
  unsupported: Object.freeze([
    "PickupPrefix", "ReturnPrefix", "PartnerPrefix", "ProductPrefix",
    "ExpensePrefix", "PurchasePrefix",
  ]),
});

function _settingsMigrationLog(prefix, value) {
  Logger.log(`${prefix} ${typeof value === "string" ? value : JSON.stringify(value)}`);
}

function _settingsMigrationEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function _settingsMigrationSerialize(type, value) {
  if (type === "JSON") return JSON.stringify(value);
  if (type === "BOOLEAN") return value ? "true" : "false";
  return String(value);
}

function _settingsMigrationCanonicalRow(definition, value, timestamp, user) {
  const parsed = SettingsService().parseValue(definition.key, value);
  const object = {
    ID: IDGenerator.generate(SETTINGS_SCHEMA),
    Key: definition.key,
    Value: _settingsMigrationSerialize(definition.type, parsed),
    Type: definition.type,
    Group: definition.group,
    Label: definition.label,
    Description: definition.description,
    IsEditable: definition.editable,
    Deleted: false,
    IsActive: true,
    CreatedAt: timestamp,
    CreatedBy: user,
    UpdatedAt: timestamp,
    UpdatedBy: user,
  };
  return SETTINGS_SCHEMA.HEADERS.map((header) => object[header]);
}

function _settingsMigrationInspectCanonical(sheet) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getLastRow() > 0 && lastColumn > 0
    ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0]
    : [];
  return { headers, compatible: _settingsMigrationEqual(headers, SETTINGS_SCHEMA.HEADERS) };
}

function _settingsMigrationPreflight(spreadsheet, sheet, properties) {
  if (!sheet) throw new Error("PREFLIGHT: Settings sheet does not exist.");
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) throw new Error("PREFLIGHT: Settings sheet is empty.");
  const range = sheet.getRange(1, 1, lastRow, lastColumn);
  const values = range.getValues();
  const formulas = range.getFormulas();
  const headers = values[0] || [];
  if (!_settingsMigrationEqual(headers, SETTINGS_LEGACY_MIGRATION.legacyHeaders)) {
    throw new Error(`PREFLIGHT: physical headers must be exactly ${JSON.stringify(SETTINGS_LEGACY_MIGRATION.legacyHeaders)}.`);
  }
  if (_settingsMigrationEqual(headers, SETTINGS_SCHEMA.HEADERS)) {
    throw new Error("PREFLIGHT: canonical Settings headers already exist.");
  }
  const nonblankRows = values.slice(1).filter((row) => row.some((value) => value !== ""));
  if (nonblankRows.length !== 8 || values.length !== 9) {
    throw new Error(`PREFLIGHT: expected exactly 8 physical legacy rows; found ${nonblankRows.length}.`);
  }
  if (formulas.some((row) => row.some((formula) => Boolean(formula)))) {
    throw new Error("PREFLIGHT: formulas exist in the used legacy range.");
  }
  const counts = {};
  const legacy = {};
  nonblankRows.forEach((row, index) => {
    const key = String(row[0] == null ? "" : row[0]).trim();
    if (!key) throw new Error(`PREFLIGHT: blank legacy key at physical row ${index + 2}.`);
    counts[key] = (counts[key] || 0) + 1;
    legacy[key] = row[1];
  });
  const duplicates = Object.keys(counts).filter((key) => counts[key] !== 1);
  if (duplicates.length) throw new Error(`PREFLIGHT: duplicate legacy keys: ${duplicates.join(", ")}.`);
  const actualKeys = Object.keys(counts).sort();
  const expectedKeys = SETTINGS_LEGACY_MIGRATION.expectedLegacyKeys.slice().sort();
  if (!_settingsMigrationEqual(actualKeys, expectedKeys)) {
    const missing = expectedKeys.filter((key) => actualKeys.indexOf(key) < 0);
    const additional = actualKeys.filter((key) => expectedKeys.indexOf(key) < 0);
    throw new Error(`PREFLIGHT: legacy key set differs; missing=${missing.join(",") || "none"}; additional=${additional.join(",") || "none"}.`);
  }
  const service = SettingsService();
  const companyName = service.parseValue("BUSINESS_NAME", legacy.CompanyName);
  const currency = service.parseValue("BUSINESS_CURRENCY", legacy.Currency);
  if (!String(companyName).trim()) throw new Error("PREFLIGHT: CompanyName must be a nonblank STRING.");
  if (companyName !== "IP-Starling") throw new Error(`PREFLIGHT: CompanyName must equal IP-Starling; found ${companyName}.`);
  if (currency !== "IDR") throw new Error(`PREFLIGHT: Currency must equal IDR; found ${currency}.`);
  if (properties.getProperty(SETTINGS_LEGACY_MIGRATION.markerKey)) {
    throw new Error("PREFLIGHT: prior successful migration marker exists while the legacy schema remains active.");
  }
  const backup = spreadsheet.getSheetByName(SETTINGS_LEGACY_MIGRATION.backupSheet);
  let backupVerified = false;
  if (backup) {
    const backupValues = backup.getRange(1, 1, lastRow, lastColumn).getValues();
    const backupFormulas = backup.getRange(1, 1, lastRow, lastColumn).getFormulas();
    const marker = backup.getRange(1, 4).getValue();
    backupVerified = _settingsMigrationEqual(backupValues, values)
      && _settingsMigrationEqual(backupFormulas, formulas)
      && marker === SETTINGS_LEGACY_MIGRATION.backupMarker;
    if (!backupVerified) throw new Error("PREFLIGHT: existing backup is not an exact verified backup for this migration.");
  }
  _settingsMigrationLog("SETTINGS MIGRATION PREFLIGHT:", {
    result: "PASS", headers, legacyRows: nonblankRows.length,
    keys: actualKeys, formulasPresent: false, priorMarker: false,
    existingBackup: Boolean(backup), existingBackupVerified: backupVerified,
  });
  return { values, formulas, legacy, nonblankRows, lastRow, lastColumn, backup, backupVerified };
}

function _settingsMigrationEnsureBackup(spreadsheet, sheet, preflight) {
  if (preflight.backup) {
    _settingsMigrationLog("SETTINGS MIGRATION BACKUP:", { sheet: SETTINGS_LEGACY_MIGRATION.backupSheet, reused: true, verified: true });
    return preflight.backup;
  }
  const backup = spreadsheet.insertSheet(SETTINGS_LEGACY_MIGRATION.backupSheet);
  sheet.getRange(1, 1, preflight.lastRow, preflight.lastColumn)
    .copyTo(backup.getRange(1, 1, preflight.lastRow, preflight.lastColumn));
  backup.getRange(1, 4).setValue(SETTINGS_LEGACY_MIGRATION.backupMarker);
  SpreadsheetApp.flush();
  const copiedValues = backup.getRange(1, 1, preflight.lastRow, preflight.lastColumn).getValues();
  const copiedFormulas = backup.getRange(1, 1, preflight.lastRow, preflight.lastColumn).getFormulas();
  const verified = _settingsMigrationEqual(copiedValues, preflight.values)
    && _settingsMigrationEqual(copiedFormulas, preflight.formulas)
    && backup.getRange(1, 4).getValue() === SETTINGS_LEGACY_MIGRATION.backupMarker;
  if (!verified) throw new Error("BACKUP: copied legacy range or migration marker failed verification.");
  _settingsMigrationLog("SETTINGS MIGRATION BACKUP:", { sheet: backup.getName(), reused: false, copiedRows: preflight.lastRow, copiedColumns: preflight.lastColumn, verified: true });
  return backup;
}

function _settingsMigrationClearSettingsCache() {
  RepositoryBase.clearHeaderCache(SETTINGS_SCHEMA);
  SettingsService().clearCache();
}

function _settingsMigrationRestoreLegacy(sheet, preflight) {
  sheet.clear();
  sheet.getRange(1, 1, preflight.lastRow, preflight.lastColumn).setValues(preflight.values);
  SpreadsheetApp.flush();
  const restoredValues = sheet.getRange(1, 1, preflight.lastRow, preflight.lastColumn).getValues();
  const restoredHeaders = restoredValues[0] || [];
  const restored = sheet.getLastRow() === preflight.lastRow
    && sheet.getLastColumn() === preflight.lastColumn
    && _settingsMigrationEqual(restoredHeaders, SETTINGS_LEGACY_MIGRATION.legacyHeaders)
    && _settingsMigrationEqual(restoredValues, preflight.values);
  _settingsMigrationClearSettingsCache();
  return restored;
}

function _settingsMigrationVerify(spreadsheet, sheet, backup, preflight, expectedMigrated) {
  SpreadsheetApp.flush();
  _settingsMigrationClearSettingsCache();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (!_settingsMigrationEqual(headers, SETTINGS_SCHEMA.HEADERS)) throw new Error("VERIFICATION: canonical header order differs.");
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  const rows = values.map((row) => {
    const object = {}; headers.forEach((header, index) => { object[header] = row[index]; }); return object;
  });
  const definitions = SettingsService().definitions();
  const definitionByKey = {};
  definitions.forEach((definition) => { definitionByKey[definition.key] = definition; });
  const keys = {}; const ids = {};
  rows.forEach((row) => {
    const key = String(row.Key || "");
    const id = String(row.ID || "");
    keys[key] = (keys[key] || 0) + 1;
    ids[id] = (ids[id] || 0) + 1;
    const definition = definitionByKey[key];
    if (!definition) throw new Error(`VERIFICATION: unknown canonical key ${key}.`);
    if (row.Type !== definition.type || row.Group !== definition.group) throw new Error(`VERIFICATION: metadata mismatch for ${key}.`);
    SettingsService().parseValue(key, row.Value);
    if (row.Deleted !== false || row.IsActive !== true) throw new Error(`VERIFICATION: invalid active/deleted state for ${key}.`);
  });
  if (rows.length !== definitions.length) throw new Error(`VERIFICATION: expected ${definitions.length} canonical rows; found ${rows.length}.`);
  if (Object.keys(keys).some((key) => keys[key] !== 1)) throw new Error("VERIFICATION: duplicate canonical Key detected.");
  if (Object.keys(ids).some((id) => !id || ids[id] !== 1)) throw new Error("VERIFICATION: blank or duplicate canonical ID detected.");
  if (Object.keys(keys).some((key) => !definitionByKey[key])) throw new Error("VERIFICATION: unknown canonical key detected.");
  const service = SettingsService();
  const businessName = service.getResolved("BUSINESS_NAME");
  const currency = service.getResolved("BUSINESS_CURRENCY");
  if (!businessName.success || businessName.data.value !== expectedMigrated.BUSINESS_NAME) throw new Error("VERIFICATION: BUSINESS_NAME did not resolve to the migrated value.");
  if (!currency.success || currency.data.value !== expectedMigrated.BUSINESS_CURRENCY) throw new Error("VERIFICATION: BUSINESS_CURRENCY did not resolve to the migrated value.");
  const audit = service.audit();
  if (!audit.success || audit.data.classification !== "SAFE") throw new Error(`VERIFICATION: Settings audit is ${audit.data && audit.data.classification}.`);
  const resolved = service.listResolved();
  if (!resolved.success || resolved.data.length !== definitions.length || resolved.data.some((item) => item.valid !== true)) {
    throw new Error("VERIFICATION: resolved Settings list is incomplete or invalid.");
  }
  const backupValues = backup.getRange(1, 1, preflight.lastRow, preflight.lastColumn).getValues();
  if (!_settingsMigrationEqual(backupValues, preflight.values)) throw new Error("VERIFICATION: backup no longer matches the original legacy values.");
  SETTINGS_LEGACY_MIGRATION.unsupported.forEach((key) => {
    const found = backupValues.slice(1).some((row) => row[0] === key && row[1] === preflight.legacy[key]);
    if (!found) throw new Error(`VERIFICATION: unsupported legacy ${key} is missing from backup.`);
  });
  _settingsMigrationLog("SETTINGS MIGRATION VERIFICATION:", { headers: "CANONICAL", rows: rows.length, uniqueKeys: Object.keys(keys).length, uniqueIds: Object.keys(ids).length, audit: audit.data.classification, resolved: resolved.data.length, backupVerified: true });
  return { registryKeyCount: definitions.length, auditClassification: audit.data.classification };
}

function settingsLegacySchemaMigration() {
  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  const summary = {
    initialSchema: "UNKNOWN", backupSheet: SETTINGS_LEGACY_MIGRATION.backupSheet,
    backupVerified: false, legacyRowsFound: 0, mappedLegacyRows: 0,
    unsupportedLegacyRowsPreserved: 0, canonicalRowsSeeded: 0,
    finalRegistryKeyCount: 0, auditClassification: "NOT_RUN",
    rollbackAttempted: false, rollbackSuccessful: false,
    idempotentNoOp: false, result: "FAIL",
  };
  let sheet;
  let preflight;
  let settingsMutated = false;
  let phase = "PREFLIGHT";
  try {
    if (!lock.tryLock(30000)) throw new Error("PREFLIGHT: migration lock could not be acquired.");
    lockAcquired = true;
    const spreadsheet = Database.spreadsheet();
    sheet = spreadsheet.getSheetByName(SETTINGS_SCHEMA.TABLE);
    if (!sheet) throw new Error("PREFLIGHT: Settings sheet does not exist.");
    const canonical = _settingsMigrationInspectCanonical(sheet);
    if (canonical.compatible) {
      summary.initialSchema = "CANONICAL";
      _settingsMigrationClearSettingsCache();
      const audit = SettingsService().audit();
      if (!audit.success || audit.data.classification !== "SAFE") {
        summary.auditClassification = audit.data && audit.data.classification;
        throw new Error(`ALREADY_CANONICAL_UNSAFE: audit is ${summary.auditClassification}.`);
      }
      summary.auditClassification = "SAFE";
      summary.finalRegistryKeyCount = SettingsService().definitions().length;
      summary.idempotentNoOp = true;
      summary.result = "PASS";
      _settingsMigrationLog("SETTINGS MIGRATION PREFLIGHT:", "ALREADY_MIGRATED");
      _settingsMigrationLog("SETTINGS LEGACY MIGRATION SUMMARY:", summary);
      return summary;
    }

    summary.initialSchema = "LEGACY_KEY_VALUE";
    const properties = PropertiesService.getScriptProperties();
    preflight = _settingsMigrationPreflight(spreadsheet, sheet, properties);
    summary.legacyRowsFound = preflight.nonblankRows.length;
    _settingsMigrationLog("SETTINGS MIGRATION MAPPING:", { supported: SETTINGS_LEGACY_MIGRATION.mapping, unsupportedPreservedInBackup: SETTINGS_LEGACY_MIGRATION.unsupported });
    phase = "BACKUP";
    const backup = _settingsMigrationEnsureBackup(spreadsheet, sheet, preflight);
    summary.backupVerified = true;

    const service = SettingsService();
    const definitions = service.definitions();
    const definitionByKey = {};
    definitions.forEach((definition) => { definitionByKey[definition.key] = definition; });
    const timestamp = Utils.now();
    const user = Utils.currentUser();
    const migratedValues = {
      BUSINESS_NAME: service.parseValue("BUSINESS_NAME", preflight.legacy.CompanyName),
      BUSINESS_CURRENCY: service.parseValue("BUSINESS_CURRENCY", preflight.legacy.Currency),
    };
    const migratedRows = Object.keys(SETTINGS_LEGACY_MIGRATION.mapping).map((legacyKey) => {
      const canonicalKey = SETTINGS_LEGACY_MIGRATION.mapping[legacyKey];
      return _settingsMigrationCanonicalRow(definitionByKey[canonicalKey], preflight.legacy[legacyKey], timestamp, user);
    });

    phase = "WRITE";
    settingsMutated = true;
    sheet.clear();
    sheet.getRange(1, 1, 1, SETTINGS_SCHEMA.HEADERS.length).setValues([SETTINGS_SCHEMA.HEADERS]);
    sheet.getRange(2, 1, migratedRows.length, SETTINGS_SCHEMA.HEADERS.length).setValues(migratedRows);
    SpreadsheetApp.flush();
    _settingsMigrationClearSettingsCache();
    summary.mappedLegacyRows = migratedRows.length;
    summary.unsupportedLegacyRowsPreserved = SETTINGS_LEGACY_MIGRATION.unsupported.length;
    _settingsMigrationLog("SETTINGS MIGRATION WRITE:", { canonicalHeaders: SETTINGS_SCHEMA.HEADERS.length, migratedRows: migratedRows.length });

    const interim = _settingsMigrationInspectCanonical(sheet);
    if (!interim.compatible || sheet.getLastRow() !== 3) throw new Error("WRITE: migrated canonical rows failed interim verification before seeding.");
    const seed = SettingsService().seedMissing();
    if (!seed.success) throw new Error(`WRITE: seedMissing failed: ${seed.message}.`);
    summary.canonicalRowsSeeded = seed.data.count;
    phase = "VERIFICATION";
    const verification = _settingsMigrationVerify(spreadsheet, sheet, backup, preflight, migratedValues);
    summary.finalRegistryKeyCount = verification.registryKeyCount;
    summary.auditClassification = verification.auditClassification;
    _settingsMigrationClearSettingsCache();
    properties.setProperty(SETTINGS_LEGACY_MIGRATION.markerKey, JSON.stringify({ completedAt: new Date().toISOString(), backupSheet: SETTINGS_LEGACY_MIGRATION.backupSheet, registryKeyCount: verification.registryKeyCount }));
    summary.result = "PASS";
    _settingsMigrationLog("SETTINGS LEGACY MIGRATION SUMMARY:", summary);
    return summary;
  } catch (error) {
    const failurePrefix = phase === "PREFLIGHT"
      ? "SETTINGS MIGRATION PREFLIGHT:"
      : phase === "BACKUP"
        ? "SETTINGS MIGRATION BACKUP:"
        : phase === "WRITE"
          ? "SETTINGS MIGRATION WRITE:"
          : "SETTINGS MIGRATION VERIFICATION:";
    _settingsMigrationLog(failurePrefix, { result: "FAIL", error: error.message });
    if (settingsMutated && sheet && preflight) {
      summary.rollbackAttempted = true;
      try {
        summary.rollbackSuccessful = _settingsMigrationRestoreLegacy(sheet, preflight);
        _settingsMigrationLog("SETTINGS MIGRATION ROLLBACK:", { attempted: true, successful: summary.rollbackSuccessful, backupPreserved: true });
      } catch (rollbackError) {
        summary.rollbackSuccessful = false;
        _settingsMigrationLog("SETTINGS MIGRATION ROLLBACK:", { attempted: true, successful: false, backupPreserved: true, error: rollbackError.message, warning: "ROLLBACK FAILED; migration was not atomic." });
      }
    } else {
      _settingsMigrationLog("SETTINGS MIGRATION ROLLBACK:", { attempted: false, successful: false, reason: "No Settings mutation occurred." });
    }
    summary.result = "FAIL";
    _settingsMigrationLog("SETTINGS LEGACY MIGRATION SUMMARY:", Object.assign({}, summary, { error: error.message }));
    throw error;
  } finally {
    if (lockAcquired) lock.releaseLock();
  }
}
