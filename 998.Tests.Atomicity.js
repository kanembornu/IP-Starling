/** Focused transaction atomicity and failure-recovery tests. */

function atomicAssert(condition, message) {
  if (!condition) throw new Error(message);
}

function atomicRows(schema) {
  return RepositoryBase.mapRows(schema, RepositoryReader.raw(schema));
}

function atomicSnapshot(schemas) {
  return JSON.stringify(schemas.map((schema) => atomicRows(schema)));
}

function atomicRequestKey() {
  return `ips_${Utilities.getUuid().toLowerCase()}`;
}

function idempotencyMemoryRepository(seed) {
  const records = (seed || []).map((row) => Object.assign({}, row));
  return {
    records,
    find(key) { return records.find((row) => row[IDEMPOTENCY_FIELDS.KEY] === key) || null; },
    insert(row) { records.push(Object.assign({}, row)); return true; },
    update(key, changes) { const row = this.find(key); if (!row) return false; Object.assign(row, changes); return true; },
    rows() { return records.slice(); },
    remove(key) { const index = records.findIndex((row) => row[IDEMPOTENCY_FIELDS.KEY] === key); if (index < 0) return true; records.splice(index, 1); return true; },
  };
}

function idempotencyControlled(options) {
  const repository = options.repository || idempotencyMemoryRepository();
  let executions = 0;
  const response = IdempotencyService.execute({
    key: options.key || "ips_123e4567-e89b-42d3-a456-426614174000",
    operation: options.operation || "TEST_CREATE",
    normalizedPayload: options.payload || { value: 1 },
    repository,
    now: options.now || (() => new Date("2026-07-25T00:00:00.000Z")),
    currentUser: () => "TEST",
    getMutationLock: () => ({ hasLock: () => false, tryLock: () => true, releaseLock: () => {} }),
    generateResourceId: () => options.resourceId || "RESOURCE-1",
    recover: options.recover || (() => null),
    execute: options.execute || ((resourceId) => { executions += 1; return Response.success({ ID: resourceId }); }),
  });
  return { response, repository, executions };
}

function testIdempotencyKeyGeneratorFormatAndOwnership() {
  const app = HtmlService.createHtmlOutputFromFile("970.View.App").getContent();
  const events = HtmlService.createHtmlOutputFromFile("980.View.Event").getContent();
  atomicAssert(/function createRequestKey\(\)/.test(app) && /crypto\.randomUUID/.test(app) && /ips_/.test(app), "App lacks a collision-resistant request-key generator.");
  atomicAssert(!/IdempotencyKey|createRequestKey|pickupCreateRequestKey|returnCreateRequestKey/.test(events), "Event owns idempotency identity.");
  atomicAssert(IdempotencyService.validateKey("ips_123e4567-e89b-42d3-a456-426614174000") === "ips_123e4567-e89b-42d3-a456-426614174000" && IdempotencyService.validateKey("bad-key").success === false, "Server idempotency-key validation is invalid.");
}

function testIdempotencyCanonicalPayloadNormalizationContracts() {
  const pickup = PickupService.toString(); const returns = ReturnService.toString();
  atomicAssert(/normalizeIdempotencyPayload/.test(pickup) && /Number\(detail\[PICKUP_DETAIL_FIELDS\.QTY\]\)/.test(pickup), "Pickup canonical normalization is missing.");
  atomicAssert(/normalizeReturnIdempotencyPayload/.test(returns) && /Number\(document && document\[RETURN_FIELDS\.QTY\]\)/.test(returns), "Return canonical normalization is missing.");
}

function testIdempotencyStableHashForEquivalentObjects() {
  atomicAssert(IdempotencyService.payloadHash({ b: 2, a: { d: 4, c: 3 } }) === IdempotencyService.payloadHash({ a: { c: 3, d: 4 }, b: 2 }), "Equivalent property order changed the payload hash.");
}

function testIdempotencyDifferentHashForSemanticChange() {
  atomicAssert(IdempotencyService.payloadHash({ Qty: 1 }) !== IdempotencyService.payloadHash({ Qty: 2 }), "Semantic payload change did not change the hash.");
}

function testIdempotencyCommittedReplaySkipsMutation() {
  const first = idempotencyControlled({});
  let replayExecutions = 0;
  const replay = idempotencyControlled({ repository: first.repository, execute() { replayExecutions += 1; return Response.success({ ID: "OTHER" }); } });
  atomicAssert(first.response.success && replay.response.success && replay.response.data.ID === first.response.data.ID && replay.response.meta.idempotentReplay === true && replayExecutions === 0, "Committed replay executed a second mutation.");
}

function testIdempotencyPayloadConflictIsWriteFree() {
  const first = idempotencyControlled({}); const before = JSON.stringify(first.repository.records); let executions = 0;
  const conflict = idempotencyControlled({ repository: first.repository, payload: { value: 2 }, execute() { executions += 1; return Response.success(); } });
  atomicAssert(!conflict.response.success && /payload yang berbeda/.test(conflict.response.message) && executions === 0 && before === JSON.stringify(first.repository.records), "Idempotency conflict mutated state.");
}

function testIdempotencyFailureReleasesAndRetries() {
  const repository = idempotencyMemoryRepository();
  const failed = idempotencyControlled({ repository, execute: () => Response.error("INJECTED") });
  atomicAssert(!failed.response.success && repository.records[0][IDEMPOTENCY_FIELDS.STATUS] === IdempotencyService.STATUS.RELEASED, "Handled failure left a PENDING reservation.");
  const retried = idempotencyControlled({ repository });
  atomicAssert(retried.response.success && repository.records[0][IDEMPOTENCY_FIELDS.STATUS] === IdempotencyService.STATUS.COMMITTED, "Released reservation could not retry successfully.");
}

function testIdempotencyConcurrentLikeSameKeyCreatesOnce() {
  const repository = idempotencyMemoryRepository(); let executions = 0;
  const execute = (resourceId) => { executions += 1; return Response.success({ ID: resourceId }); };
  const first = idempotencyControlled({ repository, execute }); const second = idempotencyControlled({ repository, execute });
  atomicAssert(first.response.success && second.response.success && executions === 1, "Same-key sequential/concurrent-like delivery created twice.");
}

function testIdempotencySeparateKeysAllowIdenticalPayloads() {
  const repository = idempotencyMemoryRepository(); let executions = 0;
  const execute = (resourceId) => { executions += 1; return Response.success({ ID: resourceId }); };
  idempotencyControlled({ repository, key: "ips_123e4567-e89b-42d3-a456-426614174000", resourceId: "A", execute });
  idempotencyControlled({ repository, key: "ips_123e4567-e89b-42d3-a456-426614174001", resourceId: "B", execute });
  atomicAssert(executions === 2 && repository.records.length === 2, "Separate keys did not permit identical business payloads.");
}

function testIdempotencyPendingAndRetentionPolicy() {
  const key = "ips_123e4567-e89b-42d3-a456-426614174000";
  const recent = new Date("2026-07-25T00:00:00.000Z");
  const repository = idempotencyMemoryRepository([{ [IDEMPOTENCY_FIELDS.KEY]: key, [IDEMPOTENCY_FIELDS.OPERATION]: "TEST_CREATE", [IDEMPOTENCY_FIELDS.PAYLOAD_HASH]: IdempotencyService.payloadHash({ value: 1 }), [IDEMPOTENCY_FIELDS.STATUS]: IdempotencyService.STATUS.PENDING, [IDEMPOTENCY_FIELDS.RESOURCE_ID]: "RESOURCE-1", [IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_AT]: recent }]);
  const pending = idempotencyControlled({ repository, now: () => new Date("2026-07-25T00:01:00.000Z") });
  atomicAssert(!pending.response.success && /masih diproses/.test(pending.response.message), "Recent PENDING policy is invalid.");
  const recoveredRepository = idempotencyMemoryRepository([Object.assign({}, repository.records[0])]);
  let recoveredExecutions = 0;
  const recovered = idempotencyControlled({ repository: recoveredRepository, recover: (resourceId) => Response.success({ ID: resourceId }), execute() { recoveredExecutions += 1; return Response.success(); } });
  atomicAssert(recovered.response.success && recovered.response.meta.idempotentReplay === true && recoveredExecutions === 0 && recoveredRepository.records[0][IDEMPOTENCY_FIELDS.STATUS] === IdempotencyService.STATUS.COMMITTED, "PENDING committed-resource recovery reran the mutation.");
  repository.records[0][IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_AT] = new Date("2026-07-24T00:00:00.000Z");
  const recoveredStale = idempotencyControlled({ repository, now: () => new Date("2026-07-25T00:11:00.000Z") });
  atomicAssert(recoveredStale.response.success && repository.records[0][IDEMPOTENCY_FIELDS.STATUS] === IdempotencyService.STATUS.COMMITTED, "Stale PENDING reservation did not retry safely.");
  repository.records[0][IDEMPOTENCY_FIELDS.STATUS] = IdempotencyService.STATUS.RELEASED;
  repository.records[0][IDEMPOTENCY_FIELDS.EXPIRES_AT] = new Date("2026-07-24T00:00:00.000Z");
  atomicAssert(IdempotencyService.cleanupExpired({ repository, now: new Date("2026-07-25T00:00:00.000Z"), getMutationLock: () => ({ hasLock: () => false, tryLock: () => true, releaseLock: () => {} }) }) === 1 && repository.records.length === 0, "Independent retention cleanup failed.");
}

function atomicLock() {
  let owned = false;
  const state = { acquired: 0, released: 0 };
  return {
    state,
    hasLock() { return owned; },
    tryLock() { owned = true; state.acquired += 1; return true; },
    releaseLock() { owned = false; state.released += 1; },
  };
}

function atomicSchema(name, foreignKey) {
  const fields = foreignKey ? { ID: "ID", PARENT: foreignKey, NAME: "Name" } : { ID: "ID", NAME: "Name" };
  return {
    NAME: name, TABLE: name, PRIMARY_KEY: "ID", ID_PREFIX: name.slice(0, 1),
    FIELDS: fields,
    SYSTEM: { IS_DELETED: "Deleted", IS_ACTIVE: "IsActive", CREATED_AT: "CreatedAt", CREATED_BY: "CreatedBy", UPDATED_AT: "UpdatedAt", UPDATED_BY: "UpdatedBy" },
    HEADERS: Object.freeze(Object.values(fields).concat(["Deleted", "IsActive", "CreatedAt", "CreatedBy", "UpdatedAt", "UpdatedBy"])),
    DEFAULT: Object.freeze({ Deleted: false, IsActive: true }),
    VALIDATION: Object.freeze({ Name: { required: true } }),
    READONLY: Object.freeze({ ID: true, CreatedAt: true, CreatedBy: true }),
  };
}

function atomicHarness(settings) {
  const headerSchema = atomicSchema("Header");
  const detailSchema = atomicSchema("Detail", "HeaderID");
  const rows = new Map([[headerSchema, []], [detailSchema, []]]);
  const events = [];
  const audits = [];
  const caches = [];
  const lock = atomicLock();
  let sequence = 0;
  const list = (schema) => rows.get(schema);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const findAny = (schema, id) => list(schema).find((row) => row.ID === id) || null;
  const active = (row) => row && row.Deleted !== true;
  const writer = {
    insert(schema, row) { events.push(`insert:${row.ID}`); list(schema).push(clone(row)); return true; },
    insertMany(schema, values) { values.forEach((row) => writer.insert(schema, row)); return values.length > 0; },
    update(schema, id, changes) { events.push(`update:${id}`); const row = findAny(schema, id); if (!row) return false; Object.assign(row, clone(changes)); return true; },
    softDelete(schema, id) { events.push(`delete:${id}`); return writer.update(schema, id, { Deleted: true, IsActive: false }); },
    restore(schema, id) { events.push(`restore:${id}`); return writer.update(schema, id, { Deleted: false, IsActive: true }); },
    replace(schema, id, row) { events.push(`replace:${id}`); const index = list(schema).findIndex((item) => item.ID === id); if (index < 0) return false; list(schema)[index] = clone(row); return true; },
    rollbackInsert(schema, id) { events.push(`rollbackInsert:${id}`); const index = list(schema).findIndex((item) => item.ID === id); if (index >= 0) list(schema).splice(index, 1); return true; },
  };
  const reader = {
    raw(schema) { return clone(list(schema)); },
    findAll(schema) { return clone(list(schema).filter(active)); },
    findById(schema, id) { return clone(list(schema).find((row) => row.ID === id && active(row)) || null); },
    find(schema, criteria) { return clone(list(schema).filter((row) => active(row) && Object.keys(criteria).every((key) => row[key] === criteria[key]))); },
  };
  const service = TransactionService.create({
    headerSchema, detailSchema, detailForeignKey: "HeaderID", reader, writer,
    mapRows: (schema, values) => clone(values), clearCache: (schema) => caches.push(schema.NAME),
    getMutationLock: () => lock, generateId: (schema) => `${schema.NAME}-${++sequence}`,
    auditMutation: (schema, action, id) => audits.push(`${action}:${id}`),
    failureInjector: settings && settings.failureInjector,
  });
  return { service, rows, events, audits, caches, lock, headerSchema, detailSchema };
}

function atomicDocument(detailCount) {
  return { header: { Name: "Header" }, details: Array.from({ length: detailCount || 2 }, (_, index) => ({ Name: `Detail ${index + 1}` })) };
}

function testTransactionContractSuccessExecutesEachStepOnce() {
  const fixture = atomicHarness();
  const response = fixture.service.create(atomicDocument(2));
  atomicAssert(response.success && fixture.rows.get(fixture.headerSchema).length === 1 && fixture.rows.get(fixture.detailSchema).length === 2, "Successful transaction did not execute every write once.");
}

function testTransactionContractFailureStopsForwardActions() {
  const fixture = atomicHarness({ failureInjector(stage) { if (stage === "afterFirstDetailWrite") throw new Error("PRIMARY"); } });
  atomicAssert(!fixture.service.create(atomicDocument(3)).success && fixture.events.filter((item) => item.indexOf("insert:Detail") === 0).length === 1, "Failure did not stop remaining forward actions.");
}

function testTransactionContractRollbackIsReverseOrder() {
  const fixture = atomicHarness({ failureInjector(stage) { if (stage === "beforeAudit") throw new Error("PRIMARY"); } });
  fixture.service.create(atomicDocument(2));
  const rollback = fixture.events.filter((item) => item.indexOf("rollbackInsert") === 0);
  atomicAssert(JSON.stringify(rollback) === JSON.stringify(["rollbackInsert:Detail-3", "rollbackInsert:Detail-2", "rollbackInsert:Header-1"]), "Rollback order is not strict reverse order.");
}

function testTransactionContractAttemptsAllRollbacks() {
  let attempts = 0;
  const fixture = atomicHarness({ failureInjector(stage) { if (stage === "beforeAudit") throw new Error("PRIMARY"); if (stage === "duringRollback") { attempts += 1; throw new Error("ROLLBACK"); } } });
  fixture.service.create(atomicDocument(2));
  atomicAssert(attempts === 3, "Rollback stopped after a compensation failure.");
}

function testTransactionContractRollbackFailureLogging() {
  const source = TransactionService.create.toString();
  atomicAssert(/logRollbackFailure/.test(source) && /Transaction rollback action failed/.test(source), "Rollback failures lack actionable logging.");
}

function testTransactionContractOriginalFailureRemainsPrimary() {
  const fixture = atomicHarness({ failureInjector(stage) { if (stage === "beforeAudit" || stage === "duringRollback") throw new Error(stage === "beforeAudit" ? "PRIMARY" : "ROLLBACK"); } });
  const response = fixture.service.create(atomicDocument(1));
  atomicAssert(!response.success && /Gagal menyimpan transaksi/.test(response.message) && !/ROLLBACK$/.test(response.message), "Rollback failure replaced the primary transaction failure.");
}

function testTransactionContractContextIsRequestLocal() {
  const first = atomicHarness();
  const second = atomicHarness();
  first.service.create(atomicDocument(1));
  atomicAssert(second.rows.get(second.headerSchema).length === 0 && second.events.length === 0, "Transaction context leaked between service instances.");
}

function testTransactionContractLockReleasesAfterSuccess() {
  const fixture = atomicHarness(); fixture.service.create(atomicDocument(1));
  atomicAssert(fixture.lock.state.acquired === 1 && fixture.lock.state.released === 1, "Mutation lock leaked after success.");
}

function testTransactionContractLockReleasesAfterFailure() {
  const fixture = atomicHarness({ failureInjector(stage) { if (stage === "afterHeaderWrite") throw new Error("FAIL"); } }); fixture.service.create(atomicDocument(1));
  atomicAssert(fixture.lock.state.acquired === 1 && fixture.lock.state.released === 1, "Mutation lock leaked after failure.");
}

function testTransactionContractCompletionAuditOnce() {
  const fixture = atomicHarness(); fixture.service.create(atomicDocument(2));
  atomicAssert(fixture.audits.length === 1, "Successful completion callback or audit was duplicated.");
}

function testTransactionContractRollbackInvalidatesCaches() {
  const fixture = atomicHarness({ failureInjector(stage) { if (stage === "afterHeaderWrite") throw new Error("FAIL"); } }); fixture.service.create(atomicDocument(1));
  atomicAssert(fixture.caches.indexOf("Header") >= 0 && fixture.caches.indexOf("Detail") >= 0, "Rollback did not invalidate all aggregate caches.");
}

function atomicPickupDocument(detailCount) {
  const partner = findActivePickupTestPartner();
  const products = findActivePickupTestProducts(detailCount || 1);
  if (!partner || !products) return null;
  return {
    header: { [PICKUP_HEADER_FIELDS.DATE]: new Date(), [PICKUP_HEADER_FIELDS.PARTNER_ID]: partner[PARTNER_SCHEMA.PRIMARY_KEY], [PICKUP_HEADER_FIELDS.NOTES]: "[ATOMICITY TEST]" },
    details: products.slice(0, detailCount || 1).map((product, index) => ({ [PICKUP_DETAIL_FIELDS.PRODUCT_ID]: product[PRODUCT_SCHEMA.PRIMARY_KEY], [PICKUP_DETAIL_FIELDS.QTY]: index + 1, [PICKUP_DETAIL_FIELDS.NOTES]: "[ATOMICITY TEST]" })),
  };
}

function atomicCleanupPickup(data) {
  if (!data) return;
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    atomicRows(PICKUP_DETAIL_SCHEMA).filter((row) => row[PICKUP_DETAIL_FIELDS.PICKUP_ID] === data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]).reverse().forEach((row) => RepositoryWriter.rollbackInsert(PICKUP_DETAIL_SCHEMA, row[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]));
    RepositoryWriter.rollbackInsert(PICKUP_HEADER_SCHEMA, data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]);
  } finally { lock.releaseLock(); }
}

function atomicPickupFailure(stage, operation) {
  const document = atomicPickupDocument(2); if (!document) return;
  let fixture = null;
  try {
    if (operation !== "CREATE") { const created = PickupService({ auditMutation() {} }).create(document); atomicAssert(created.success, "Pickup fixture creation failed."); fixture = created.data; }
    const before = atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]);
    const service = PickupService({ auditMutation() {}, failureInjector(current) { if (current === stage) throw new Error("INJECTED"); } });
    let response;
    if (operation === "CREATE") response = service.create(document);
    else if (operation === "UPDATE") response = service.update(fixture.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY], document);
    else if (operation === "DELETE") response = service.remove(fixture.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]);
    else { PickupService({ auditMutation() {} }).remove(fixture.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]); const deleted = atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]); response = service.restore(fixture.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]); atomicAssert(deleted === atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]), "Failed Pickup restore changed persisted state."); return; }
    atomicAssert(!response.success && before === atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]), `Failed Pickup ${operation} changed persisted state.`);
  } finally { atomicCleanupPickup(fixture); }
}

function testPickupAtomicCreateSuccess() { const document = atomicPickupDocument(2); if (!document) return; let data; try { const response = PickupService({ auditMutation() {} }).create(document); atomicAssert(response.success, "Pickup create failed."); data = response.data; } finally { atomicCleanupPickup(data); } }
function testPickupAtomicCreateAfterHeaderFailure() { atomicPickupFailure("afterHeaderWrite", "CREATE"); }
function testPickupAtomicCreateDetailFailure() { atomicPickupFailure("afterFirstDetailWrite", "CREATE"); }
function testPickupAtomicUpdateRollback() { atomicPickupFailure("beforeAudit", "UPDATE"); }
function testPickupAtomicDeleteRollback() { atomicPickupFailure("beforeAudit", "DELETE"); }
function testPickupAtomicRestoreRollback() { atomicPickupFailure("beforeAudit", "RESTORE"); }
function testPickupAtomicRetryContract() {
  const document = atomicPickupDocument(2); if (!document) return; const key = atomicRequestKey(); const audits = []; let data = null;
  try {
    const request = Object.assign({}, document, { IdempotencyKey: key });
    const service = PickupService({ auditMutation(schema, action) { audits.push(action); } });
    const first = service.create(request); const afterFirst = atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]); const replay = service.create(request);
    data = first.data;
    atomicAssert(first.success && replay.success && replay.data.header.ID === first.data.header.ID && replay.meta.idempotentReplay === true && afterFirst === atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]) && audits.length === 1, "Pickup idempotent replay duplicated aggregate rows or audit.");
  } finally { atomicCleanupPickup(data); IdempotencyRepository.remove(key); }
}
function testPickupAtomicIdempotencyConflict() {
  const document = atomicPickupDocument(1); if (!document) return; const key = atomicRequestKey(); let data = null;
  try {
    const first = PickupService({ auditMutation() {} }).create(Object.assign({}, document, { IdempotencyKey: key })); data = first.data;
    const changed = JSON.parse(JSON.stringify(document)); changed.details[0][PICKUP_DETAIL_FIELDS.QTY] = Number(changed.details[0][PICKUP_DETAIL_FIELDS.QTY]) + 1;
    const before = atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]); const conflict = PickupService({ auditMutation() {} }).create(Object.assign({}, changed, { IdempotencyKey: key }));
    atomicAssert(!conflict.success && /payload yang berbeda/.test(conflict.message) && before === atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]), "Pickup idempotency conflict mutated data.");
  } finally { atomicCleanupPickup(data); IdempotencyRepository.remove(key); }
}
function testPickupAtomicIdempotencyRetryAfterRollback() {
  const document = atomicPickupDocument(1); if (!document) return; const key = atomicRequestKey(); const request = Object.assign({}, document, { IdempotencyKey: key }); let data = null;
  try {
    const failed = PickupService({ auditMutation() {}, failureInjector(stage) { if (stage === "beforeAudit") throw new Error("FAIL"); } }).create(request);
    atomicAssert(!failed.success && IdempotencyRepository.find(key)[IDEMPOTENCY_FIELDS.STATUS] === IdempotencyService.STATUS.RELEASED, "Pickup rollback left PENDING idempotency state.");
    const retried = PickupService({ auditMutation() {} }).create(request); data = retried.data;
    atomicAssert(retried.success, "Pickup could not retry with the same key after rollback.");
  } finally { atomicCleanupPickup(data); IdempotencyRepository.remove(key); }
}
function testPickupAtomicSingleSuccessAudit() { const document = atomicPickupDocument(1); if (!document) return; const audits = []; let data; try { const response = PickupService({ auditMutation(schema, action) { audits.push(action); } }).create(document); data = response.data; atomicAssert(response.success && audits.length === 1, "Pickup success audit count is not one."); } finally { atomicCleanupPickup(data); } }
function testPickupAtomicZeroAuditOnRollback() { const document = atomicPickupDocument(1); if (!document) return; const before = atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]); const audits = []; const response = PickupService({ auditMutation() { audits.push("audit"); }, failureInjector(stage) { if (stage === "beforeAudit") throw new Error("FAIL"); } }).create(document); atomicAssert(!response.success && audits.length === 0 && before === atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]), "Pickup rollback emitted a success audit or changed state."); }

function atomicReturnDocument(fixture, qty) { return { [RETURN_FIELDS.PICKUP_DETAIL_ID]: fixture.detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY], [RETURN_FIELDS.DATE]: "2026-07-25", [RETURN_FIELDS.QTY]: qty, [RETURN_FIELDS.NOTE]: "[ATOMICITY TEST]" }; }
function atomicCleanupReturn(row) { if (!row) return; const lock = LockService.getScriptLock(); lock.waitLock(10000); try { RepositoryWriter.rollbackInsert(RETURN_SCHEMA, row[RETURN_SCHEMA.PRIMARY_KEY]); } finally { lock.releaseLock(); } }
function atomicReturnFailure(operation) {
  const fixture = returnTestFixture(); if (!fixture) return; let row = null;
  try {
    if (operation !== "CREATE") { const created = ReturnService({ auditMutation() {} }).create(atomicReturnDocument(fixture, 1)); atomicAssert(created.success, "Return fixture creation failed."); row = created.data; }
    if (operation === "RESTORE") { atomicAssert(ReturnService({ auditMutation() {} }).remove(row[RETURN_SCHEMA.PRIMARY_KEY]).success, "Return fixture delete failed."); }
    const before = atomicSnapshot([RETURN_SCHEMA]);
    const service = ReturnService({ auditMutation() {}, failureInjector(stage) { if (stage === (operation === "CREATE" ? "afterReturnWrite" : "beforeAudit")) throw new Error("INJECTED"); } });
    const response = operation === "CREATE" ? service.create(atomicReturnDocument(fixture, 1)) : operation === "UPDATE" ? service.update(row[RETURN_SCHEMA.PRIMARY_KEY], { [RETURN_FIELDS.QTY]: 1 }) : operation === "DELETE" ? service.remove(row[RETURN_SCHEMA.PRIMARY_KEY]) : service.restore(row[RETURN_SCHEMA.PRIMARY_KEY]);
    atomicAssert(!response.success && before === atomicSnapshot([RETURN_SCHEMA]), `Failed Return ${operation} changed persisted state.`);
  } finally { atomicCleanupReturn(row); }
}

function testReturnAtomicCreateSuccess() { const fixture = returnTestFixture(); if (!fixture) return; let row; try { const response = ReturnService({ auditMutation() {} }).create(atomicReturnDocument(fixture, 1)); row = response.data; atomicAssert(response.success, "Return create failed."); } finally { atomicCleanupReturn(row); } }
function testReturnAtomicCreateRollback() { atomicReturnFailure("CREATE"); }
function testReturnAtomicUpdateRollback() { atomicReturnFailure("UPDATE"); }
function testReturnAtomicDeleteRollback() { atomicReturnFailure("DELETE"); }
function testReturnAtomicRestoreRollback() { atomicReturnFailure("RESTORE"); }
function testReturnAtomicExactRemainingQty() { const fixture = returnTestFixture(); if (!fixture) return; let row; try { const response = ReturnService({ auditMutation() {} }).create(atomicReturnDocument(fixture, fixture.available)); row = response.data; atomicAssert(response.success, "Exact remaining Return quantity failed."); } finally { atomicCleanupReturn(row); } }
function testReturnAtomicOverLimitWriteFree() { const fixture = returnTestFixture(); if (!fixture) return; const before = atomicSnapshot([RETURN_SCHEMA]); const response = ReturnService({ auditMutation() {} }).create(atomicReturnDocument(fixture, fixture.available + 1)); atomicAssert(!response.success && before === atomicSnapshot([RETURN_SCHEMA]), "Over-limit Return wrote data."); }
function testReturnAtomicStaleEligibilityRevalidated() {
  const fixture = returnTestFixture(); if (!fixture) return; let first = null;
  try {
    const staleQty = fixture.available;
    const created = ReturnService({ auditMutation() {} }).create(atomicReturnDocument(fixture, 1));
    atomicAssert(created.success, "Stale-data fixture creation failed."); first = created.data;
    const retry = ReturnService({ auditMutation() {} }).create(atomicReturnDocument(fixture, staleQty));
    atomicAssert(!retry.success, "Stale Return eligibility was not revalidated server-side.");
  } finally { atomicCleanupReturn(first); }
}
function testReturnAtomicConcurrentLikeAllocation() {
  const fixture = returnTestFixture(); if (!fixture) return; let first = null;
  try {
    const created = ReturnService({ auditMutation() {} }).create(atomicReturnDocument(fixture, fixture.available));
    atomicAssert(created.success, "First allocation failed."); first = created.data;
    const second = ReturnService({ auditMutation() {} }).create(atomicReturnDocument(fixture, fixture.available));
    atomicAssert(!second.success, "Concurrent-like Return allocation exceeded available quantity.");
  } finally { atomicCleanupReturn(first); }
}
function testReturnAtomicSingleSuccessAudit() { const fixture = returnTestFixture(); if (!fixture) return; const audits = []; let row; try { const response = ReturnService({ auditMutation(schema, action) { audits.push(action); } }).create(atomicReturnDocument(fixture, 1)); row = response.data; atomicAssert(response.success && audits.length === 1, "Return success audit count is not one."); } finally { atomicCleanupReturn(row); } }
function testReturnAtomicZeroAuditOnRollback() { const fixture = returnTestFixture(); if (!fixture) return; const before = atomicSnapshot([RETURN_SCHEMA]); const audits = []; const response = ReturnService({ auditMutation() { audits.push("audit"); }, failureInjector(stage) { if (stage === "beforeAudit") throw new Error("FAIL"); } }).create(atomicReturnDocument(fixture, 1)); atomicAssert(!response.success && audits.length === 0 && before === atomicSnapshot([RETURN_SCHEMA]), "Return rollback emitted a success audit or changed state."); }
function testReturnAtomicIdempotencyReplay() {
  const fixture = returnTestFixture(); if (!fixture) return; const key = atomicRequestKey(); const audits = []; let row = null;
  try {
    const request = Object.assign({}, atomicReturnDocument(fixture, 1), { IdempotencyKey: key }); const service = ReturnService({ auditMutation(schema, action) { audits.push(action); } });
    const first = service.create(request); row = first.data; const afterFirst = atomicSnapshot([RETURN_SCHEMA]); const replay = service.create(request);
    atomicAssert(first.success && replay.success && replay.data.ID === first.data.ID && replay.meta.idempotentReplay === true && afterFirst === atomicSnapshot([RETURN_SCHEMA]) && audits.length === 1, "Return replay duplicated quantity, row, or audit.");
  } finally { atomicCleanupReturn(row); IdempotencyRepository.remove(key); }
}
function testReturnAtomicIdempotencyConflict() {
  const fixture = returnTestFixture(); if (!fixture) return; const key = atomicRequestKey(); let row = null;
  try {
    const request = Object.assign({}, atomicReturnDocument(fixture, 1), { IdempotencyKey: key }); const first = ReturnService({ auditMutation() {} }).create(request); row = first.data;
    const before = atomicSnapshot([RETURN_SCHEMA]); const conflict = ReturnService({ auditMutation() {} }).create(Object.assign({}, request, { [RETURN_FIELDS.NOTE]: "different" }));
    atomicAssert(!conflict.success && /payload yang berbeda/.test(conflict.message) && before === atomicSnapshot([RETURN_SCHEMA]), "Return idempotency conflict mutated data.");
  } finally { atomicCleanupReturn(row); IdempotencyRepository.remove(key); }
}
function testReturnAtomicIdempotencyRetryAfterRollback() {
  const fixture = returnTestFixture(); if (!fixture) return; const key = atomicRequestKey(); const request = Object.assign({}, atomicReturnDocument(fixture, 1), { IdempotencyKey: key }); let row = null;
  try {
    const failed = ReturnService({ auditMutation() {}, failureInjector(stage) { if (stage === "beforeAudit") throw new Error("FAIL"); } }).create(request);
    atomicAssert(!failed.success && IdempotencyRepository.find(key)[IDEMPOTENCY_FIELDS.STATUS] === IdempotencyService.STATUS.RELEASED, "Return rollback left PENDING idempotency state.");
    const retried = ReturnService({ auditMutation() {} }).create(request); row = retried.data; atomicAssert(retried.success, "Return could not retry after rollback.");
  } finally { atomicCleanupReturn(row); IdempotencyRepository.remove(key); }
}

function testAtomicPickupRollbackPreservesReturnEligibility() { const before = atomicSnapshot([RETURN_SCHEMA]); atomicPickupFailure("afterHeaderWrite", "CREATE"); atomicAssert(before === atomicSnapshot([RETURN_SCHEMA]), "Pickup rollback changed Return eligibility rows."); }
function testAtomicReturnRollbackPreservesPickupAvailability() { const before = atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]); atomicReturnFailure("CREATE"); atomicAssert(before === atomicSnapshot([PICKUP_HEADER_SCHEMA, PICKUP_DETAIL_SCHEMA]), "Return rollback changed Pickup rows."); }
function testAtomicCachesCorrectAfterSuccess() { atomicAssert(/RepositoryCache\.clear\(schema\)/.test(RepositoryWriter.insert.toString()) && /RepositoryCache\.clear\(RETURN_SCHEMA\)/.test(ReturnService.toString()), "Success cache invalidation contract is missing."); }
function testAtomicCachesCorrectAfterRollback() {
  const fixture = atomicHarness({ failureInjector(stage) { if (stage === "afterHeaderWrite") throw new Error("FAIL"); } });
  fixture.service.create(atomicDocument(1));
  atomicAssert(fixture.caches.indexOf("Header") >= 0 && fixture.caches.indexOf("Detail") >= 0, "Rollback cache invalidation failed.");
}
function testAtomicFixturesAndInjectionAreIsolated() {
  const controller = [createPickup, updatePickup, deletePickup, restorePickup, createReturn, updateReturn, deleteReturn, restoreReturn].map((fn) => fn.toString()).join("\n");
  atomicAssert(/typeof config\.failureInjector === "function"/.test(TransactionService.create.toString()) && /typeof options\.failureInjector === "function"/.test(ReturnService.toString()) && !/failureInjector/.test(controller), "Failure injection is not isolated from production entry points.");
}
