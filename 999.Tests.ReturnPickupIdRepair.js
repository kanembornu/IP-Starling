/** In-memory contracts for dynamic Return.PickupID maintenance. */
function returnPickupRepairAssert(condition, message) {
  if (!condition) throw new Error(message);
}

function returnPickupRepairFixture(change, options = {}) {
  const state = {
    returns: [
      { rowNumber: 2, data: { ID: "RT26073100181", PickupID: "", PickupDetailID: "PD181", Qty: 2, Notes: "KEEP" }, values: [] },
      { rowNumber: 3, data: { ID: "RT-VALID", PickupID: "PH-VALID", PickupDetailID: "PD-VALID", Qty: 1, Notes: "UNCHANGED" }, values: [] },
    ],
    details: [
      { rowNumber: 2, data: { ID: "PD181", PickupID: "PH181" }, values: [] },
      { rowNumber: 3, data: { ID: "PD-VALID", PickupID: "PH-VALID" }, values: [] },
    ],
    headers: [
      { rowNumber: 2, data: { ID: "PH181" }, values: [] },
      { rowNumber: 3, data: { ID: "PH-VALID" }, values: [] },
    ],
    writes: [], backups: [], logs: [], cacheClears: 0,
    lock: { acquired: 0, released: 0 }, failApply: false,
  };
  if (change) change(state);
  const dependencies = {
    readSnapshot() { return { returns: state.returns, details: state.details, headers: state.headers }; },
    createBackup(plans) {
      const backup = { createdAt: "2026-08-01T00:00:00.000Z", rows: plans.map((item) => Object.assign({}, item)) };
      state.backups.push(backup);
      return backup;
    },
    writePickupIds(changes, phase) {
      state.writes.push({ phase, changes: changes.map((item) => Object.assign({}, item)) });
      changes.forEach((item, index) => {
        const row = state.returns.find((candidate) => candidate.rowNumber === item.rowNumber);
        if (row) row.data.PickupID = item.value;
        if (phase === "APPLY" && state.failApply && index === 0) throw new Error("INJECTED_WRITE_FAILURE");
      });
    },
    clearReturnCache() { state.cacheClears += 1; },
    maintenanceLog(affectedIds) { state.logs.push(affectedIds.slice()); },
    getLock() { return { waitLock() { state.lock.acquired += 1; }, releaseLock() { state.lock.released += 1; } }; },
  };
  return { state, maintenance: ReturnPickupIdMaintenance.create(dependencies, options) };
}

function testReturnPickupRepairDynamicDiscovery() {
  const fixture = returnPickupRepairFixture();
  const report = fixture.maintenance.preview();
  returnPickupRepairAssert(report.success && report.status === "VALID" && report.targetCount === 1 && report.eligibleCount === 1, "Dynamic discovery did not select exactly the invalid Return row.");
  returnPickupRepairAssert(report.results[0].id === "RT26073100181" && report.results[0].status === "ELIGIBLE" && report.results[0].proposedPickupId === "PH181", "Current-row equivalent was not derived dynamically.");
}

function testReturnPickupRepairPreviewReadOnly() {
  const fixture = returnPickupRepairFixture();
  const before = JSON.stringify({ returns: fixture.state.returns, details: fixture.state.details, headers: fixture.state.headers });
  fixture.maintenance.preview();
  returnPickupRepairAssert(before === JSON.stringify({ returns: fixture.state.returns, details: fixture.state.details, headers: fixture.state.headers }), "Preview mutated source records.");
  returnPickupRepairAssert(!fixture.state.writes.length && !fixture.state.backups.length && !fixture.state.logs.length && fixture.state.cacheClears === 0, "Preview caused a write-side effect.");
}

function testReturnPickupRepairInvalidNonblankDiscovery() {
  const fixture = returnPickupRepairFixture((state) => { state.returns[0].data.PickupID = "PH-WRONG"; });
  const row = fixture.maintenance.preview().results[0];
  returnPickupRepairAssert(row.status === "ELIGIBLE" && row.currentPickupId === "PH-WRONG" && row.proposedPickupId === "PH181", "Invalid nonblank PickupID was not dynamically discovered.");
}

function testReturnPickupRepairDuplicateDetailFailFast() {
  const fixture = returnPickupRepairFixture((state) => state.details.push({ rowNumber: 9, data: { ID: "PD181", PickupID: "PH181" }, values: [] }));
  const preview = fixture.maintenance.preview();
  const repair = fixture.maintenance.repair();
  returnPickupRepairAssert(!preview.success && preview.results[0].status === "DUPLICATE_DETAIL", "Ambiguous detail was not classified.");
  returnPickupRepairAssert(!repair.success && repair.status === "PREVALIDATION_FAILED" && !fixture.state.writes.length && !fixture.state.backups.length, "Ambiguous detail did not fail before backup/write.");
}

function testReturnPickupRepairMissingHeaderFailFast() {
  const fixture = returnPickupRepairFixture((state) => { state.headers = state.headers.filter((row) => row.data.ID !== "PH181"); });
  const preview = fixture.maintenance.preview();
  const repair = fixture.maintenance.repair();
  returnPickupRepairAssert(!preview.success && preview.results[0].status === "MISSING_HEADER", "Missing header was not classified.");
  returnPickupRepairAssert(!repair.success && !fixture.state.writes.length, "Missing header reached mutation.");
}

function testReturnPickupRepairDuplicateHeaderFailFast() {
  const fixture = returnPickupRepairFixture((state) => state.headers.push({ rowNumber: 9, data: { ID: "PH181" }, values: [] }));
  const preview = fixture.maintenance.preview();
  const repair = fixture.maintenance.repair();
  returnPickupRepairAssert(!preview.success && preview.results[0].status === "DUPLICATE_HEADER", "Ambiguous Pickup Header was not classified.");
  returnPickupRepairAssert(!repair.success && repair.status === "PREVALIDATION_FAILED" && !fixture.state.writes.length, "Ambiguous Pickup Header reached mutation.");
}

function testReturnPickupRepairOwnershipMismatchFailFast() {
  const fixture = returnPickupRepairFixture((state) => { state.details[0].data.PickupID = " PH181 "; });
  const report = fixture.maintenance.preview();
  returnPickupRepairAssert(!report.success && report.results[0].status === "OWNERSHIP_MISMATCH", "Non-exact ownership was not rejected.");
}

function testReturnPickupRepairUpdatesPickupIdOnly() {
  const fixture = returnPickupRepairFixture();
  const before = Object.assign({}, fixture.state.returns[0].data);
  const report = fixture.maintenance.repair();
  const after = fixture.state.returns[0].data;
  returnPickupRepairAssert(report.success && report.status === "REPAIRED" && report.repairedCount === 1, "Eligible repair failed.");
  returnPickupRepairAssert(after.PickupID === "PH181" && after.PickupDetailID === before.PickupDetailID && after.Qty === before.Qty && after.Notes === before.Notes, "Repair changed a business field other than PickupID.");
  returnPickupRepairAssert(fixture.state.writes[0].changes[0].value === "PH181" && fixture.state.backups.length === 1, "Repair did not create its pre-write snapshot or targeted value.");
}

function testReturnPickupRepairPersistedVerification() {
  const fixture = returnPickupRepairFixture();
  const report = fixture.maintenance.repair();
  returnPickupRepairAssert(report.success && report.results.every((item) => item.status === "ALREADY_VALID"), "Repair did not verify persisted PickupID values.");
  returnPickupRepairAssert(fixture.state.cacheClears === 1 && fixture.state.logs.length === 1, "Successful repair cache/log ordering is incomplete.");
}

function testReturnPickupRepairIdempotentSecondExecution() {
  const fixture = returnPickupRepairFixture();
  const first = fixture.maintenance.repair();
  const second = fixture.maintenance.repair();
  returnPickupRepairAssert(first.success && first.status === "REPAIRED" && second.success && second.status === "ALREADY_VALID", "Second dynamic repair was not idempotent.");
  returnPickupRepairAssert(fixture.state.writes.length === 1 && fixture.state.backups.length === 1 && fixture.state.logs.length === 1, "Idempotent execution duplicated side effects.");
}

function testReturnPickupRepairRollbackAfterWriteFailure() {
  const fixture = returnPickupRepairFixture((state) => { state.failApply = true; });
  const report = fixture.maintenance.repair();
  returnPickupRepairAssert(!report.success && report.status === "ROLLED_BACK" && fixture.state.returns[0].data.PickupID === "", "Injected failure did not restore the pre-write PickupID.");
  returnPickupRepairAssert(fixture.state.writes.map((item) => item.phase).join(",") === "APPLY,ROLLBACK" && fixture.state.backups.length === 1, "Rollback sequence or backup is missing.");
  returnPickupRepairAssert(fixture.state.lock.acquired === 1 && fixture.state.lock.released === 1, "Repair lock was not released after rollback.");
}

function testReturnPickupRepairFocusedTargetClassification() {
  const fixture = returnPickupRepairFixture(null, { targetIds: ["RT-VALID", "RT-MISSING"] });
  const report = fixture.maintenance.preview();
  const statuses = report.results.reduce((map, item) => { map[item.id] = item.status; return map; }, {});
  returnPickupRepairAssert(!report.success && statuses["RT-VALID"] === "ALREADY_VALID" && statuses["RT-MISSING"] === "INVALID_RETURN", "Focused target classification is not deterministic or fail-closed.");
}

function getReturnPickupIdMaintenanceTests() {
  return Object.freeze([
    testReturnPickupRepairDynamicDiscovery,
    testReturnPickupRepairPreviewReadOnly,
    testReturnPickupRepairInvalidNonblankDiscovery,
    testReturnPickupRepairDuplicateDetailFailFast,
    testReturnPickupRepairMissingHeaderFailFast,
    testReturnPickupRepairDuplicateHeaderFailFast,
    testReturnPickupRepairOwnershipMismatchFailFast,
    testReturnPickupRepairUpdatesPickupIdOnly,
    testReturnPickupRepairPersistedVerification,
    testReturnPickupRepairIdempotentSecondExecution,
    testReturnPickupRepairRollbackAfterWriteFailure,
    testReturnPickupRepairFocusedTargetClassification,
  ]);
}
