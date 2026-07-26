/** In-memory tests for the controlled blank Return.PickupID maintenance. */
function returnPickupRepairAssert(condition, message) {
  if (!condition) throw new Error(message);
}

function returnPickupRepairFixture(change) {
  const ids = ReturnPickupIdMaintenance.TARGET_IDS;
  const state = {
    returns: ids.map((id, index) => ({ rowNumber: index + 2, data: { ID: id, PickupID: "", PickupDetailID: `PD${index + 1}` }, values: [] })),
    details: ids.map((id, index) => ({ rowNumber: index + 2, data: { ID: `PD${index + 1}`, PickupID: `PH${index + 1}` }, values: [] })),
    headers: ids.map((id, index) => ({ rowNumber: index + 2, data: { ID: `PH${index + 1}` }, values: [] })),
    writes: [], logs: [], cacheClears: 0, lock: { acquired: 0, released: 0 }, failApply: false,
  };
  if (change) change(state);
  const dependencies = {
    readSnapshot() { return { returns: state.returns, details: state.details, headers: state.headers }; },
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
  return { state, maintenance: ReturnPickupIdMaintenance.create(dependencies) };
}

function returnPickupRepairStatus(fixture, id) {
  return fixture.maintenance.preview().results.find((item) => item.id === (id || ReturnPickupIdMaintenance.TARGET_IDS[0])).status;
}

function testReturnPickupRepairValidDerivation() {
  const fixture = returnPickupRepairFixture(); const report = fixture.maintenance.preview();
  returnPickupRepairAssert(report.success && report.results.every((item) => item.status === "READY" && item.proposedPickupId), "Valid ownership did not produce READY derivations.");
  returnPickupRepairAssert(fixture.state.writes.length === 0 && fixture.state.logs.length === 0 && fixture.state.cacheClears === 0, "Preview caused a write, log, or cache mutation.");
  returnPickupRepairAssert(ReturnPickupIdMaintenance.TARGET_IDS.length === 12 && new Set(ReturnPickupIdMaintenance.TARGET_IDS).size === 12, "Maintenance allowlist is not exactly 12 unique IDs.");
}
function testReturnPickupRepairMissingReturn() {
  const fixture = returnPickupRepairFixture((state) => state.returns.shift());
  returnPickupRepairAssert(returnPickupRepairStatus(fixture) === "MISSING_RETURN", "Missing Return was not rejected.");
}
function testReturnPickupRepairBlankPickupDetailId() {
  const fixture = returnPickupRepairFixture((state) => { state.returns[0].data.PickupDetailID = ""; });
  returnPickupRepairAssert(returnPickupRepairStatus(fixture) === "BLANK_PICKUP_DETAIL_ID", "Blank PickupDetailID was not rejected.");
}
function testReturnPickupRepairMissingDetail() {
  const fixture = returnPickupRepairFixture((state) => state.details.shift());
  returnPickupRepairAssert(returnPickupRepairStatus(fixture) === "MISSING_PICKUP_DETAIL", "Missing Pickup Detail was not rejected.");
}
function testReturnPickupRepairDuplicateDetail() {
  const fixture = returnPickupRepairFixture((state) => state.details.push({ rowNumber: 99, data: Object.assign({}, state.details[0].data), values: [] }));
  returnPickupRepairAssert(returnPickupRepairStatus(fixture) === "DUPLICATE_PICKUP_DETAIL", "Duplicate Pickup Detail was not rejected.");
}
function testReturnPickupRepairMissingHeader() {
  const fixture = returnPickupRepairFixture((state) => state.headers.shift());
  returnPickupRepairAssert(returnPickupRepairStatus(fixture) === "MISSING_PICKUP_HEADER", "Missing Pickup Header was not rejected.");
}
function testReturnPickupRepairOwnershipMismatch() {
  const fixture = returnPickupRepairFixture((state) => { state.details[0].data.PickupID = " PH1 "; });
  returnPickupRepairAssert(returnPickupRepairStatus(fixture) === "OWNERSHIP_MISMATCH", "Non-exact detail/header ownership was not rejected.");
}
function testReturnPickupRepairConflictingPickupId() {
  const fixture = returnPickupRepairFixture((state) => { state.returns[0].data.PickupID = "PH-CONFLICT"; });
  returnPickupRepairAssert(returnPickupRepairStatus(fixture) === "CONFLICTING_PICKUP_ID", "Conflicting nonblank PickupID was not rejected.");
}
function testReturnPickupRepairAlreadyRepairedRow() {
  const fixture = returnPickupRepairFixture((state) => { state.returns[0].data.PickupID = "PH1"; });
  returnPickupRepairAssert(returnPickupRepairStatus(fixture) === "ALREADY_REPAIRED", "Matching PickupID was not idempotently classified.");
}
function testReturnPickupRepairAllOrNothingPrevalidation() {
  const fixture = returnPickupRepairFixture((state) => { state.returns[0].data.PickupDetailID = ""; }); const report = fixture.maintenance.repair();
  returnPickupRepairAssert(!report.success && report.status === "PREVALIDATION_FAILED" && fixture.state.writes.length === 0 && fixture.state.logs.length === 0, "Invalid preview did not abort before every write.");
}
function testReturnPickupRepairRollbackAfterWriteFailure() {
  const fixture = returnPickupRepairFixture((state) => { state.failApply = true; }); const report = fixture.maintenance.repair();
  returnPickupRepairAssert(!report.success && report.status === "ROLLED_BACK" && fixture.state.returns.every((row) => row.data.PickupID === "") && fixture.state.writes.map((item) => item.phase).join(",") === "APPLY,ROLLBACK", "Injected failure did not restore every target.");
  returnPickupRepairAssert(fixture.state.lock.acquired === 1 && fixture.state.lock.released === 1, "Repair lock was not released after rollback.");
}
function testReturnPickupRepairIdempotentSecondExecution() {
  const fixture = returnPickupRepairFixture(); const first = fixture.maintenance.repair(); const second = fixture.maintenance.repair();
  returnPickupRepairAssert(first.success && first.status === "REPAIRED" && second.success && second.status === "ALREADY_REPAIRED", "Second repair execution was not idempotent.");
  returnPickupRepairAssert(fixture.state.writes.length === 1 && fixture.state.logs.length === 1, "Idempotent execution duplicated writes or maintenance logs.");
}

const RETURN_PICKUP_ID_MAINTENANCE_TESTS = Object.freeze([
  testReturnPickupRepairValidDerivation,
  testReturnPickupRepairMissingReturn,
  testReturnPickupRepairBlankPickupDetailId,
  testReturnPickupRepairMissingDetail,
  testReturnPickupRepairDuplicateDetail,
  testReturnPickupRepairMissingHeader,
  testReturnPickupRepairOwnershipMismatch,
  testReturnPickupRepairConflictingPickupId,
  testReturnPickupRepairAlreadyRepairedRow,
  testReturnPickupRepairAllOrNothingPrevalidation,
  testReturnPickupRepairRollbackAfterWriteFailure,
  testReturnPickupRepairIdempotentSecondExecution,
]);
