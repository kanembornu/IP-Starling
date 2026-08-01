/** In-memory defect simulations for the canonical application health runner. */
function applicationHealthAssert(condition, message) {
  if (!condition) throw new Error(message);
}

function applicationHealthCheck(report, section, name) {
  const item = (report.sections[section] || []).find((entry) => entry.name === name);
  if (!item) throw new Error(`Health check not found: ${section}/${name}.`);
  return item;
}

function applicationHealthRow(schema, id, changes = {}) {
  const at = new Date("2026-07-26T03:00:00.000Z");
  const row = Object.assign({}, schema.DEFAULT || {}, changes);
  row[schema.PRIMARY_KEY] = id;
  if (schema.SYSTEM) {
    row[schema.SYSTEM.IS_DELETED] = Object.prototype.hasOwnProperty.call(changes, schema.SYSTEM.IS_DELETED) ? changes[schema.SYSTEM.IS_DELETED] : false;
    row[schema.SYSTEM.IS_ACTIVE] = Object.prototype.hasOwnProperty.call(changes, schema.SYSTEM.IS_ACTIVE) ? changes[schema.SYSTEM.IS_ACTIVE] : true;
    row[schema.SYSTEM.CREATED_AT] = Object.prototype.hasOwnProperty.call(changes, schema.SYSTEM.CREATED_AT) ? changes[schema.SYSTEM.CREATED_AT] : at;
    row[schema.SYSTEM.CREATED_BY] = Object.prototype.hasOwnProperty.call(changes, schema.SYSTEM.CREATED_BY) ? changes[schema.SYSTEM.CREATED_BY] : "health@test.local";
    row[schema.SYSTEM.UPDATED_AT] = Object.prototype.hasOwnProperty.call(changes, schema.SYSTEM.UPDATED_AT) ? changes[schema.SYSTEM.UPDATED_AT] : at;
    row[schema.SYSTEM.UPDATED_BY] = Object.prototype.hasOwnProperty.call(changes, schema.SYSTEM.UPDATED_BY) ? changes[schema.SYSTEM.UPDATED_BY] : "health@test.local";
  }
  return row;
}

function applicationHealthContractSources(overrides = {}) {
  const sources = {};
  Object.keys(ROUTES).forEach((key) => { sources[ROUTES[key]] = "<section></section>"; });
  Object.assign(sources, {
    "965.View.API": "<script>const Api = (() => { return Object.freeze({}); })();</script>",
    "970.View.App": "<script>const App = (() => { return Object.freeze({}); })();</script>",
    "980.View.Event": "<script>const Events = (() => { return Object.freeze({}); })();</script>",
  }, overrides);
  return sources;
}

function applicationHealthHealthyRows() {
  const rows = {};
  rows[PRODUCT_SCHEMA.TABLE] = [applicationHealthRow(PRODUCT_SCHEMA, "PR26072600001", { Nama: "Coffee", Kategori: "Drink", Satuan: "cup", Harga: 10000 })];
  rows[PARTNER_SCHEMA.TABLE] = [applicationHealthRow(PARTNER_SCHEMA, "PT26072600001", { Nama: "Supplier", Alamat: "", Telepon: "", Jenis: "Supplier" })];
  rows[PICKUP_HEADER_SCHEMA.TABLE] = [applicationHealthRow(PICKUP_HEADER_SCHEMA, "PH26072600001", { PickupNo: "PU-1", Tanggal: "2026-07-26", PartnerID: "PT26072600001", TotalItem: 1, TotalQty: 10, Status: "Posted", Notes: "" })];
  rows[PICKUP_DETAIL_SCHEMA.TABLE] = [applicationHealthRow(PICKUP_DETAIL_SCHEMA, "PD26072600001", { PickupID: "PH26072600001", ProductID: "PR26072600001", Qty: 10, Harga: 10000, Total: 100000, Notes: "" })];
  rows[RETURN_SCHEMA.TABLE] = [];
  rows[PURCHASING_SCHEMA.TABLE] = [applicationHealthRow(PURCHASING_SCHEMA, "PC26072600001", { Tanggal: "2026-07-26", SupplierID: "PT26072600001", ProductID: "PR26072600001", Qty: 2, Harga: 10000, Total: 20000 })];
  rows[EXPENSE_SCHEMA.TABLE] = [applicationHealthRow(EXPENSE_SCHEMA, "EX26072600001", { Tanggal: "2026-07-26", Kategori: "Ops", Keterangan: "Transport", Nominal: 5000 })];
  rows[SETTINGS_SCHEMA.TABLE] = [applicationHealthRow(SETTINGS_SCHEMA, "ST26072600001", { Key: "HEALTH_TEST", Value: "1", Type: "NUMBER", Group: "SYSTEM", Label: "Health", Description: "", IsEditable: false })];
  rows[IDEMPOTENCY_SCHEMA.TABLE] = [];
  rows[LOG_SCHEMA.TABLE] = [];
  return rows;
}

function applicationHealthFixture(changes = {}, missingTables = [], options = {}) {
  const rows = applicationHealthHealthyRows();
  Object.keys(changes).forEach((table) => { rows[table] = changes[table]; });
  const sequences = { PR: 1, PT: 1, PH: 1, PD: 1, RT: 0, PC: 1, EX: 1, ST: 1 };
  return ApplicationHealth.fixtureSnapshot(rows, missingTables, {
    nowMs: options.nowMs || new Date("2026-07-26T04:00:00.000Z").getTime(),
    todayCode: "260726",
    sequences,
    contractSources: applicationHealthContractSources(options.contractSources),
  });
}

function applicationHealthEvaluate(snapshot, nowMs) {
  return ApplicationHealth.evaluate(snapshot, { nowMs: nowMs || snapshot.capturedAt });
}

function testApplicationHealthRunnerReadOnly() {
  const source = ApplicationHealth.sourceForSafetyReview();
  applicationHealthAssert(!/\.(?:appendRow|setValue|setValues|deleteRow|clear|insertSheet|deleteSheet)\s*\(/.test(source), "Health runner contains a Spreadsheet mutation call.");
}

function testApplicationHealthMissingSheetDetection() {
  const report = applicationHealthEvaluate(applicationHealthFixture({}, [PRODUCT_SCHEMA.TABLE]));
  applicationHealthAssert(applicationHealthCheck(report, "Sheets", "Products: required sheet").status === "FAIL", "Missing Product sheet was not release-blocking.");
}

function testApplicationHealthHeaderMismatchDetection() {
  const snapshot = applicationHealthFixture();
  snapshot.sheets[PRODUCT_SCHEMA.TABLE].values[0][1] = "WrongHeader";
  const report = applicationHealthEvaluate(snapshot);
  applicationHealthAssert(applicationHealthCheck(report, "Sheets", "Products: canonical headers").status === "FAIL", "Header mismatch was not detected.");
}

function testApplicationHealthDuplicateIdDetection() {
  const row = applicationHealthHealthyRows()[PRODUCT_SCHEMA.TABLE][0];
  const report = applicationHealthEvaluate(applicationHealthFixture({ [PRODUCT_SCHEMA.TABLE]: [row, Object.assign({}, row)] }));
  applicationHealthAssert(applicationHealthCheck(report, "IDs", "PRODUCT: primary ID uniqueness").status === "FAIL", "Duplicate Product ID was not detected.");
}

function testApplicationHealthMalformedIdDetection() {
  const row = applicationHealthRow(EXPENSE_SCHEMA, "BAD-ID", { Tanggal: "2026-07-26", Kategori: "Ops", Keterangan: "Bad", Nominal: 1 });
  const report = applicationHealthEvaluate(applicationHealthFixture({ [EXPENSE_SCHEMA.TABLE]: [row] }));
  applicationHealthAssert(applicationHealthCheck(report, "IDs", "EXPENSE: ID format").status === "FAIL", "Malformed Expense ID was not detected.");
}

function testApplicationHealthOrphanPickupDetailDetection() {
  const detail = applicationHealthRow(PICKUP_DETAIL_SCHEMA, "PD26072600002", { PickupID: "PH26072699999", ProductID: "PR26072600001", Qty: 1, Notes: "" });
  const report = applicationHealthEvaluate(applicationHealthFixture({ [PICKUP_DETAIL_SCHEMA.TABLE]: [detail] }));
  applicationHealthAssert(applicationHealthCheck(report, "Relationships", "Pickup detail ownership").status === "FAIL", "Orphan Pickup detail was not detected.");
}

function testApplicationHealthBrokenMasterReferenceDetection() {
  const header = applicationHealthRow(PICKUP_HEADER_SCHEMA, "PH26072600001", { PickupNo: "PU-1", Tanggal: "2026-07-26", PartnerID: "PT26072699999", TotalItem: 1, TotalQty: 1, Status: "Posted", Notes: "" });
  const detail = applicationHealthRow(PICKUP_DETAIL_SCHEMA, "PD26072600001", { PickupID: "PH26072600001", ProductID: "PR26072699999", Qty: 1, Notes: "" });
  const report = applicationHealthEvaluate(applicationHealthFixture({ [PICKUP_HEADER_SCHEMA.TABLE]: [header], [PICKUP_DETAIL_SCHEMA.TABLE]: [detail] }));
  applicationHealthAssert(applicationHealthCheck(report, "Relationships", "Pickup Partner references").status === "FAIL", "Broken Partner reference was not detected.");
  applicationHealthAssert(applicationHealthCheck(report, "Relationships", "Pickup detail Product references").status === "FAIL", "Broken Product reference was not detected.");
}

function testApplicationHealthReturnOverAllocationDetection() {
  const returns = [
    applicationHealthRow(RETURN_SCHEMA, "RT26072600001", { PickupID: "PH26072600001", PickupDetailID: "PD26072600001", Tanggal: "2026-07-26", Qty: 6, Keterangan: "" }),
    applicationHealthRow(RETURN_SCHEMA, "RT26072600002", { PickupID: "PH26072600001", PickupDetailID: "PD26072600001", Tanggal: "2026-07-26", Qty: 5, Keterangan: "" }),
  ];
  const report = applicationHealthEvaluate(applicationHealthFixture({ [RETURN_SCHEMA.TABLE]: returns }));
  applicationHealthAssert(applicationHealthCheck(report, "Relationships", "Active Return quantity eligibility").status === "FAIL", "Return over-allocation was not detected.");
}

function testApplicationHealthPickupHistoricalValueDetection() {
  const detail = applicationHealthRow(PICKUP_DETAIL_SCHEMA, "PD26072600001", {
    PickupID: "PH26072600001", ProductID: "PR26072600001", Qty: 10,
    Harga: 10000, Total: 99999, Notes: "",
  });
  const report = applicationHealthEvaluate(applicationHealthFixture({ [PICKUP_DETAIL_SCHEMA.TABLE]: [detail] }));
  applicationHealthAssert(applicationHealthCheck(report, "Relationships", "Pickup detail historical value reconciliation").status === "FAIL", "Invalid Pickup Detail historical total was not detected.");
}

function testApplicationHealthSoftDeletedHistoricalReferenceClassification() {
  const partner = applicationHealthRow(PARTNER_SCHEMA, "PT26072600001", { Nama: "Old", Alamat: "", Telepon: "", Jenis: "Supplier", Deleted: true, IsActive: false });
  const report = applicationHealthEvaluate(applicationHealthFixture({ [PARTNER_SCHEMA.TABLE]: [partner] }));
  const item = applicationHealthCheck(report, "Relationships", "Pickup Partner references");
  applicationHealthAssert(item.status === "WARN" && /soft-deleted historical=1/.test(item.diagnostic), "Soft-deleted historical reference was not classified as WARN.");
}

function testApplicationHealthMalformedIdempotencyRowDetection() {
  const row = applicationHealthRow(IDEMPOTENCY_SCHEMA, "ips_12345678-1234-4123-8123-123456789abc", { Operation: "UNKNOWN", PayloadHash: "bad", Status: "BROKEN", ResourceID: "", ResponsePayload: "{", ExpiresAt: "not-a-date" });
  const report = applicationHealthEvaluate(applicationHealthFixture({ [IDEMPOTENCY_SCHEMA.TABLE]: [row] }));
  applicationHealthAssert(applicationHealthCheck(report, "Idempotency", "Idempotency row structure").status === "FAIL", "Malformed idempotency row was not detected.");
}

function testApplicationHealthCommittedMissingResourceDetection() {
  const row = applicationHealthRow(IDEMPOTENCY_SCHEMA, "ips_12345678-1234-4123-8123-123456789abc", { Operation: "PICKUP_CREATE", PayloadHash: "a".repeat(64), Status: "COMMITTED", ResourceID: "PH26072699999", ResponsePayload: JSON.stringify({ success: true }), ExpiresAt: "2026-08-26T00:00:00.000Z" });
  const report = applicationHealthEvaluate(applicationHealthFixture({ [IDEMPOTENCY_SCHEMA.TABLE]: [row] }));
  applicationHealthAssert(applicationHealthCheck(report, "Idempotency", "Committed resource resolution").status === "FAIL", "Missing committed resource was not detected.");
}

function testApplicationHealthStalePendingWarning() {
  const row = applicationHealthRow(IDEMPOTENCY_SCHEMA, "ips_12345678-1234-4123-8123-123456789abc", { Operation: "RETURN_CREATE", PayloadHash: "b".repeat(64), Status: "PENDING", ResourceID: "RT26072600009", ResponsePayload: "", ExpiresAt: "2026-08-26T00:00:00.000Z", UpdatedAt: "2026-07-26T02:00:00.000Z" });
  const snapshot = applicationHealthFixture({ [IDEMPOTENCY_SCHEMA.TABLE]: [row] });
  const report = applicationHealthEvaluate(snapshot, new Date("2026-07-26T04:00:00.000Z").getTime());
  applicationHealthAssert(applicationHealthCheck(report, "Idempotency", "Pending reservations").status === "WARN", "Stale PENDING reservation was not classified as WARN.");
}

function testApplicationHealthAuditReferenceValidation() {
  const log = {
    ID: "LG-12345678-1234-4123-8123-123456789abc", Timestamp: "2026-07-26T10:00:00+07:00", Level: "INFO", Category: "AUDIT",
    Module: "Product", Action: "CREATE", EntityType: "Product", EntityID: "PR26072699999", Actor: "health@test.local", Status: "SUCCESS",
    Message: "created", BeforeData: "", AfterData: "{}", Context: "", DurationMs: 1, CorrelationID: "", Source: "BaseService",
    ErrorName: "", ErrorMessage: "", ErrorStack: "", CreatedAt: "2026-07-26T10:00:00+07:00",
  };
  const report = applicationHealthEvaluate(applicationHealthFixture({ [LOG_SCHEMA.TABLE]: [log] }));
  applicationHealthAssert(applicationHealthCheck(report, "Audit", "Successful audit resource references").status === "FAIL", "Missing successful audit resource was not detected.");
}

function applicationHealthSettingsAudit(id, action, entityId) {
  return {
    ID: id, Timestamp: "2026-07-26T10:00:00+07:00", Level: "INFO", Category: "AUDIT",
    Module: "Settings", Action: action, EntityType: "Setting", EntityID: entityId, Actor: "health@test.local", Status: "SUCCESS",
    Message: `${entityId} changed`, BeforeData: "{}", AfterData: "{}", Context: "", DurationMs: 1, CorrelationID: "", Source: "SettingsService",
    ErrorName: "", ErrorMessage: "", ErrorStack: "", CreatedAt: "2026-07-26T10:00:00+07:00",
  };
}

function applicationHealthSetting(key) {
  return applicationHealthRow(SETTINGS_SCHEMA, "ST26072600001", {
    Key: key, Value: "value", Type: "STRING", Group: "SYSTEM", Label: key, Description: "", IsEditable: true,
  });
}

function testApplicationHealthSettingsUpdateResolvesLogicalKey() {
  const log = applicationHealthSettingsAudit("LG-12345678-1234-4123-8123-123456789abd", "SETTINGS_UPDATE", "BUSINESS_NAME");
  const report = applicationHealthEvaluate(applicationHealthFixture({ [SETTINGS_SCHEMA.TABLE]: [applicationHealthSetting("BUSINESS_NAME")], [LOG_SCHEMA.TABLE]: [log] }));
  applicationHealthAssert(applicationHealthCheck(report, "Audit", "Successful audit resource references").status === "PASS", "SETTINGS_UPDATE did not resolve through the logical setting key.");
}

function testApplicationHealthSettingsResetResolvesLogicalKey() {
  const log = applicationHealthSettingsAudit("LG-12345678-1234-4123-8123-123456789abe", "SETTINGS_RESET", "DEFAULT_PAGE_SIZE");
  const report = applicationHealthEvaluate(applicationHealthFixture({ [SETTINGS_SCHEMA.TABLE]: [applicationHealthSetting("DEFAULT_PAGE_SIZE")], [LOG_SCHEMA.TABLE]: [log] }));
  applicationHealthAssert(applicationHealthCheck(report, "Audit", "Successful audit resource references").status === "PASS", "SETTINGS_RESET did not resolve through the logical setting key.");
}

function testApplicationHealthMissingSettingLogicalKeyFails() {
  const log = applicationHealthSettingsAudit("LG-12345678-1234-4123-8123-123456789abf", "SETTINGS_UPDATE", "MISSING_SETTING");
  const report = applicationHealthEvaluate(applicationHealthFixture({ [LOG_SCHEMA.TABLE]: [log] }));
  applicationHealthAssert(applicationHealthCheck(report, "Audit", "Successful audit resource references").status === "FAIL", "Missing logical setting key was not rejected.");
}

function testApplicationHealthNormalAuditStillUsesPrimaryKey() {
  const product = applicationHealthHealthyRows()[PRODUCT_SCHEMA.TABLE][0];
  const validLog = Object.assign(applicationHealthSettingsAudit("LG-12345678-1234-4123-8123-123456789ac0", "UPDATE", product.ID), { Module: "Product", EntityType: "Product" });
  const validReport = applicationHealthEvaluate(applicationHealthFixture({ [LOG_SCHEMA.TABLE]: [validLog] }));
  applicationHealthAssert(applicationHealthCheck(validReport, "Audit", "Successful audit resource references").status === "PASS", "Normal audit primary-key lookup stopped resolving.");
  const invalidLog = Object.assign({}, validLog, { ID: "LG-12345678-1234-4123-8123-123456789ac1", EntityID: product.Nama });
  const invalidReport = applicationHealthEvaluate(applicationHealthFixture({ [LOG_SCHEMA.TABLE]: [invalidLog] }));
  applicationHealthAssert(applicationHealthCheck(invalidReport, "Audit", "Successful audit resource references").status === "FAIL", "Normal audit lookup incorrectly accepted a non-primary field.");
}

function testApplicationHealthRouteContractValidation() {
  const snapshot = applicationHealthFixture({}, [], { contractSources: { [ROUTES.PRODUCTS]: "" } });
  const report = applicationHealthEvaluate(snapshot);
  applicationHealthAssert(applicationHealthCheck(report, "Routes", "Registered route targets").status === "FAIL", "Missing route target was not detected.");
}

function testApplicationHealthFrontendBackendMethodResolution() {
  const snapshot = applicationHealthFixture({}, [], { contractSources: {
    "970.View.App": "<script>const App = (() => { return Object.freeze({}); })();</script>",
    "980.View.Event": "<script>function bind() { App.missing(); } const Events = (() => { return Object.freeze({ bind }); })();</script>",
  } });
  const report = applicationHealthEvaluate(snapshot);
  applicationHealthAssert(applicationHealthCheck(report, "Contracts", "Frontend/backend method resolution").status === "FAIL", "Missing Event-called App method was not detected.");
}

function testApplicationHealthNoDuplicateTestRegistration() {
  const tests = getApplicationHealthTests();
  const names = tests.map((test) => test.name);
  applicationHealthAssert(new Set(names).size === names.length, "Application health test registry contains duplicates.");
  applicationHealthAssert(tests.length === 42, "Application health test registry must contain all 42 registered tests.");
}

function testApplicationHealthSeverityAggregation() {
  const report = applicationHealthEvaluate(applicationHealthFixture({}, [PRODUCT_SCHEMA.TABLE]));
  applicationHealthAssert(report.status === "FAIL" && report.counts.FAIL > 0, "FAIL severity did not dominate aggregate health status.");
}

function testApplicationHealthBatchedReadContract() {
  const source = String(ApplicationHealth.capture);
  applicationHealthAssert((source.match(/getDataRange\(\)\.getValues\(\)/g) || []).length === 1, "Health capture must have one batched getValues call site.");
  applicationHealthAssert(!/getRange\(|RepositoryBase|RepositoryReader/.test(source), "Health capture contains duplicate/range/cache-backed read paths.");
}

function testApplicationHealthNoAuditWrites() {
  const source = ApplicationHealth.sourceForSafetyReview();
  applicationHealthAssert(!/(?:AuditLogService|AppLogService)\.(?:record|bestEffort)\s*\(|LogsService\.(?:record|bestEffort)\s*\(/.test(source), "Health runner writes an application or audit log.");
}

function testApplicationHealthNoProductionMutation() {
  const source = ApplicationHealth.sourceForSafetyReview();
  applicationHealthAssert(!/(?:RepositoryWriter\.|SpreadsheetApp\.|\.setValues?\s*\(|\.appendRow\s*\(|\.deleteRow\s*\(|\.clear\s*\()/.test(source), "Health runner contains a production mutation path.");
}

function testApplicationHealthSummaryIncludesEveryFail() {
  const snapshot = applicationHealthFixture({}, [PRODUCT_SCHEMA.TABLE]);
  const report = applicationHealthEvaluate(snapshot);
  const compact = ApplicationHealth.summary(report);
  const failures = Object.keys(report.sections).reduce((items, section) => items.concat(report.sections[section].filter((item) => item.status === "FAIL")), []);
  failures.forEach((item) => applicationHealthAssert(compact.text.indexOf(item.name) >= 0, `Summary omitted FAIL ${item.name}.`));
}

function testApplicationHealthSummaryIncludesEveryWarn() {
  const partner = applicationHealthRow(PARTNER_SCHEMA, "PT26072600001", { Nama: "Old", Alamat: "", Telepon: "", Jenis: "Supplier", Deleted: true, IsActive: false });
  const report = applicationHealthEvaluate(applicationHealthFixture({ [PARTNER_SCHEMA.TABLE]: [partner] }));
  const compact = ApplicationHealth.summary(report);
  const warnings = Object.keys(report.sections).reduce((items, section) => items.concat(report.sections[section].filter((item) => item.status === "WARN")), []);
  warnings.forEach((item) => applicationHealthAssert(compact.text.indexOf(item.name) >= 0, `Summary omitted WARN ${item.name}.`));
}

function testApplicationHealthSummaryExcludesPassDetails() {
  const report = applicationHealthEvaluate(applicationHealthFixture());
  const compact = ApplicationHealth.summary(report);
  applicationHealthAssert(!compact.text.includes("Canonical schema registry"), "Summary printed an individual PASS check.");
  applicationHealthAssert(/PASS:\s*\d+/.test(compact.text), "Summary omitted aggregate PASS count.");
}

function testApplicationHealthSummaryBounded() {
  const report = {
    status: "FAIL", counts: { PASS: 1, WARN: 1, FAIL: 1 }, durationMs: 1,
    sections: ApplicationHealth.SECTIONS.reduce((result, section) => { result[section] = []; return result; }, {}),
  };
  report.sections.Schemas.push({ name: "BOUND_FAIL", status: "FAIL", count: 1000, diagnostic: "x".repeat(10000), affectedIds: Array.from({ length: 1000 }, (_, index) => `ID${index}`) });
  report.sections.Audit.push({ name: "BOUND_WARN", status: "WARN", count: 1000, diagnostic: "y".repeat(10000), affectedIds: Array.from({ length: 1000 }, (_, index) => `WARN${index}`) });
  const text = ApplicationHealth.summary(report).text;
  applicationHealthAssert(text.length < 5000 && text.includes("BOUND_FAIL") && text.includes("BOUND_WARN") && text.includes("[TRUNCATED]"), "Summary output is unbounded or omitted findings.");
}

function testApplicationHealthFailureDetailsExactField() {
  const row = applicationHealthRow(RETURN_SCHEMA, "RT26072600001", { PickupID: "", PickupDetailID: "PD26072600001", Tanggal: "2026-07-26", Qty: 1, Keterangan: "" });
  const snapshot = applicationHealthFixture({ [RETURN_SCHEMA.TABLE]: [row] });
  const report = applicationHealthEvaluate(snapshot);
  const details = ApplicationHealth.failureDetails(snapshot, report);
  const issue = details.groups.flatMap((group) => group.issues).find((item) => item.recordId === row.ID && item.field === RETURN_FIELDS.PICKUP_ID);
  applicationHealthAssert(issue && issue.reason === "required blank" && issue.valueClassification === "BLANK", "Failure details did not identify the exact required field.");
}

function testApplicationHealthOptionalBlankReturnAllowed() {
  const row = applicationHealthRow(RETURN_SCHEMA, "RT26072600001", { PickupID: "PH26072600001", PickupDetailID: "PD26072600001", Tanggal: "2026-07-26", Qty: 1, Keterangan: "" });
  const snapshot = applicationHealthFixture({ [RETURN_SCHEMA.TABLE]: [row] });
  const report = applicationHealthEvaluate(snapshot);
  applicationHealthAssert(applicationHealthCheck(report, "Schemas", "RETURN: required and bounded fields").status === "PASS", "Optional blank Return Keterangan was rejected.");
  applicationHealthAssert(!ApplicationHealth.schemaFieldIssues(snapshot, "RETURN", RETURN_SCHEMA).some((issue) => issue.field === RETURN_FIELDS.NOTE), "Optional Return Keterangan produced field evidence.");
}

function testApplicationHealthRequiredBlankReturnFails() {
  const row = applicationHealthRow(RETURN_SCHEMA, "RT26072600001", { PickupID: "PH26072600001", PickupDetailID: "", Tanggal: "2026-07-26", Qty: 1, Keterangan: "" });
  const snapshot = applicationHealthFixture({ [RETURN_SCHEMA.TABLE]: [row] });
  const report = applicationHealthEvaluate(snapshot);
  applicationHealthAssert(applicationHealthCheck(report, "Schemas", "RETURN: required and bounded fields").status === "FAIL", "Required blank Return field did not fail.");
}

function testApplicationHealthCurrentAuditActorSeverity() {
  const row = applicationHealthRow(RETURN_SCHEMA, "RT26072600001", { PickupID: "PH26072600001", PickupDetailID: "PD26072600001", Tanggal: "2026-07-26", Qty: 1, Keterangan: "", CreatedBy: "", UpdatedBy: "" });
  const report = applicationHealthEvaluate(applicationHealthFixture({ [RETURN_SCHEMA.TABLE]: [row] }));
  applicationHealthAssert(applicationHealthCheck(report, "Schemas", "RETURN: audit actors").status === "FAIL", "Current missing audit actor was not release-blocking.");
}

function testApplicationHealthHistoricalAuditActorSeverity() {
  const legacyAt = new Date("2026-07-20T00:00:00.000Z");
  const row = applicationHealthRow(RETURN_SCHEMA, "RT26072000001", { PickupID: "PH26072600001", PickupDetailID: "PD26072600001", Tanggal: "2026-07-20", Qty: 1, Keterangan: "", CreatedAt: legacyAt, UpdatedAt: legacyAt, CreatedBy: "", UpdatedBy: "" });
  const report = applicationHealthEvaluate(applicationHealthFixture({ [RETURN_SCHEMA.TABLE]: [row] }));
  const item = applicationHealthCheck(report, "Schemas", "RETURN: audit actors");
  applicationHealthAssert(item.status === "WARN" && /legacy\/test=2/.test(item.diagnostic), "Historical missing audit actor did not use documented WARN severity.");
}

function testApplicationHealthMaximumLengthExactField() {
  const row = applicationHealthRow(RETURN_SCHEMA, "RT26072600001", { PickupID: "PH26072600001", PickupDetailID: "PD26072600001", Tanggal: "2026-07-26", Qty: 1, Keterangan: "x".repeat(256) });
  const snapshot = applicationHealthFixture({ [RETURN_SCHEMA.TABLE]: [row] });
  const issues = ApplicationHealth.schemaFieldIssues(snapshot, "RETURN", RETURN_SCHEMA);
  applicationHealthAssert(issues.some((issue) => issue.field === RETURN_FIELDS.NOTE && issue.reason === "exceeds max length" && issue.valueClassification === "TEXT_OVER_MAX_255"), "Maximum-length evidence did not identify Keterangan.");
}

function testApplicationHealthMatchesSchemaRequiredRules() {
  const optional = RETURN_SCHEMA.VALIDATION[RETURN_FIELDS.NOTE];
  const required = [RETURN_FIELDS.PICKUP_ID, RETURN_FIELDS.PICKUP_DETAIL_ID, RETURN_FIELDS.DATE, RETURN_FIELDS.QTY].filter((field) => RETURN_SCHEMA.VALIDATION[field].required === true);
  applicationHealthAssert(optional.required === false && optional.maxLength === 255 && required.length === 4, "Return schema required/optional contract changed.");
  const source = String(ApplicationHealth.schemaFieldIssues);
  applicationHealthAssert(/schema\.VALIDATION/.test(source) && /rule\.required/.test(source) && /rule\.maxLength/.test(source), "Health validation does not derive required/length rules from schema metadata.");
}

function testApplicationHealthMatchesReturnSanitization() {
  const source = String(ReturnService);
  applicationHealthAssert(/Utils\.pick\(document,\s*\[\s*RETURN_FIELDS\.DATE,\s*RETURN_FIELDS\.QTY,\s*RETURN_FIELDS\.NOTE/.test(source), "Return update sanitization contract changed.");
  applicationHealthAssert(/object\[RETURN_FIELDS\.PICKUP_ID\]\s*=\s*resolved\.pickupId/.test(source), "Return create no longer derives required PickupID.");
  applicationHealthAssert(/RETURN_SCHEMA\.SYSTEM\.CREATED_BY/.test(source) && /RETURN_SCHEMA\.SYSTEM\.UPDATED_BY/.test(source), "Return create does not populate audit actors.");
}

function testApplicationHealthDiagnosticRunnersNoProductionMutation() {
  const source = `${runApplicationHealthCheckSummary}\n${runApplicationHealthFailureDetails}\n${ApplicationHealth.sourceForSafetyReview()}`;
  applicationHealthAssert(!/(?:RepositoryWriter\.|SpreadsheetApp\.|\.setValues?\s*\(|\.appendRow\s*\(|\.deleteRow\s*\(|\.clear\s*\()/.test(source), "Diagnostic runner contains a production mutation.");
}

function testApplicationHealthDiagnosticRunnersNoAuditWrite() {
  const source = `${runApplicationHealthCheckSummary}\n${runApplicationHealthFailureDetails}\n${ApplicationHealth.sourceForSafetyReview()}`;
  applicationHealthAssert(!/(?:AuditLogService|AppLogService)\.(?:record|bestEffort)\s*\(|LogsService\.(?:record|bestEffort)\s*\(/.test(source), "Diagnostic runner contains an audit write.");
}

function testApplicationHealthDiagnosticRunnersNoCacheMutation() {
  const source = `${runApplicationHealthCheckSummary}\n${runApplicationHealthFailureDetails}\n${ApplicationHealth.sourceForSafetyReview()}`;
  applicationHealthAssert(!/RepositoryCache\.(?:clear|put|remove)\s*\(|CacheService\./.test(source), "Diagnostic runner mutates or populates cache.");
}

function testApplicationHealthDiagnosticRunnerRegistration() {
  applicationHealthAssert(typeof runApplicationHealthCheckSummary === "function" && typeof runApplicationHealthFailureDetails === "function", "Diagnostic runners are not registered.");
  applicationHealthAssert(ApplicationHealth.REQUIRED_RUNNERS.filter((name) => name === "runApplicationHealthCheckSummary").length === 1, "Summary runner registry is not exact.");
  applicationHealthAssert(ApplicationHealth.REQUIRED_RUNNERS.filter((name) => name === "runApplicationHealthFailureDetails").length === 1, "Failure-detail runner registry is not exact.");
  const registry = ApplicationHealth.runtimeFunctionRegistry();
  ApplicationHealth.CONTROLLER_ENDPOINTS.forEach((name) => applicationHealthAssert(typeof registry[name] === "function", `Explicit callable registry omitted Controller.${name}.`));
  ApplicationHealth.REQUIRED_RUNNERS.forEach((name) => applicationHealthAssert(typeof registry[name] === "function", `Explicit callable registry omitted ${name}.`));
  applicationHealthAssert(String(ApplicationHealth.runtimeFunctionRegistry).indexOf("globalThis") < 0, "Callable resolution still depends on globalThis.");
}

function testApplicationHealthCanonicalSequenceSourceContract() {
  const snapshot = applicationHealthFixture();
  const detail = snapshot.sheets[PICKUP_DETAIL_SCHEMA.TABLE].values[1];
  detail[PICKUP_DETAIL_SCHEMA.HEADERS.indexOf(PICKUP_DETAIL_SCHEMA.PRIMARY_KEY)] = "PD26072600003";
  snapshot.sequences.PD = 0;
  const report = applicationHealthEvaluate(snapshot);
  const check = applicationHealthCheck(report, "IDs", "PICKUP_DETAIL: current sequence collision safety");
  applicationHealthAssert(check.status === "FAIL" && /trails today's allocated maximum 3/.test(check.diagnostic), "Sequence collision was suppressed or downgraded.");
  const capture = String(ApplicationHealth.capture);
  applicationHealthAssert(/IDGenerator\.current/.test(capture) && !/SEQ_/.test(capture), "Application Health bypasses canonical IDGenerator sequence access.");
}

function getApplicationHealthTests() {
  return Object.freeze([
  testApplicationHealthRunnerReadOnly,
  testApplicationHealthMissingSheetDetection,
  testApplicationHealthHeaderMismatchDetection,
  testApplicationHealthDuplicateIdDetection,
  testApplicationHealthMalformedIdDetection,
  testApplicationHealthOrphanPickupDetailDetection,
  testApplicationHealthBrokenMasterReferenceDetection,
  testApplicationHealthReturnOverAllocationDetection,
  testApplicationHealthPickupHistoricalValueDetection,
  testApplicationHealthSoftDeletedHistoricalReferenceClassification,
  testApplicationHealthMalformedIdempotencyRowDetection,
  testApplicationHealthCommittedMissingResourceDetection,
  testApplicationHealthStalePendingWarning,
  testApplicationHealthAuditReferenceValidation,
  testApplicationHealthSettingsUpdateResolvesLogicalKey,
  testApplicationHealthSettingsResetResolvesLogicalKey,
  testApplicationHealthMissingSettingLogicalKeyFails,
  testApplicationHealthNormalAuditStillUsesPrimaryKey,
  testApplicationHealthRouteContractValidation,
  testApplicationHealthFrontendBackendMethodResolution,
  testApplicationHealthNoDuplicateTestRegistration,
  testApplicationHealthSeverityAggregation,
  testApplicationHealthBatchedReadContract,
  testApplicationHealthNoAuditWrites,
  testApplicationHealthNoProductionMutation,
  testApplicationHealthSummaryIncludesEveryFail,
  testApplicationHealthSummaryIncludesEveryWarn,
  testApplicationHealthSummaryExcludesPassDetails,
  testApplicationHealthSummaryBounded,
  testApplicationHealthFailureDetailsExactField,
  testApplicationHealthOptionalBlankReturnAllowed,
  testApplicationHealthRequiredBlankReturnFails,
  testApplicationHealthCurrentAuditActorSeverity,
  testApplicationHealthHistoricalAuditActorSeverity,
  testApplicationHealthMaximumLengthExactField,
  testApplicationHealthMatchesSchemaRequiredRules,
  testApplicationHealthMatchesReturnSanitization,
  testApplicationHealthDiagnosticRunnersNoProductionMutation,
  testApplicationHealthDiagnosticRunnersNoAuditWrite,
  testApplicationHealthDiagnosticRunnersNoCacheMutation,
  testApplicationHealthDiagnosticRunnerRegistration,
  testApplicationHealthCanonicalSequenceSourceContract,
  ]);
}
