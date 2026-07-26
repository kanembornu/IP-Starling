/** Controlled one-time repair for the approved blank Return.PickupID rows. */
const ReturnPickupIdMaintenance = (() => {
  const TARGET_IDS = Object.freeze([
    "RT26072000003", "RT26072000010", "RT26072100003",
    "RT26072100018", "RT26072100027", "RT26072200011",
    "RT26072300007", "RT26072300016", "RT26072400013",
    "RT26072400020", "RT26072400027", "RT26072400034",
  ]);
  const LOCK_TIMEOUT_MS = 30000;

  function text(value) { return String(value == null ? "" : value).trim(); }

  function records(values) {
    if (!values || !values.length) return [];
    const headers = values[0];
    return values.slice(1).map((row, index) => {
      const data = {};
      headers.forEach((header, column) => { data[header] = row[column]; });
      return { rowNumber: index + 2, data, values: row.slice() };
    });
  }

  function readSchema(schema) {
    return records(RepositoryBase.sheet(schema).getDataRange().getValues());
  }

  function groupConsecutive(changes) {
    const sorted = changes.slice().sort((left, right) => left.rowNumber - right.rowNumber);
    return sorted.reduce((groups, change) => {
      const current = groups[groups.length - 1];
      if (!current || change.rowNumber !== current[current.length - 1].rowNumber + 1) groups.push([change]);
      else current.push(change);
      return groups;
    }, []);
  }

  function productionDependencies() {
    return {
      readSnapshot() {
        return {
          returns: readSchema(RETURN_SCHEMA),
          details: readSchema(PICKUP_DETAIL_SCHEMA),
          headers: readSchema(PICKUP_HEADER_SCHEMA),
        };
      },
      writePickupIds(changes) {
        if (!changes.length) return;
        const sheet = RepositoryBase.sheet(RETURN_SCHEMA);
        const column = RepositoryBase.headerMap(RETURN_SCHEMA)[RETURN_FIELDS.PICKUP_ID];
        if (column === undefined) throw new Error("Return.PickupID column is missing.");
        groupConsecutive(changes).forEach((group) => {
          sheet.getRange(group[0].rowNumber, column + 1, group.length, 1)
            .setValues(group.map((change) => [change.value]));
        });
      },
      clearReturnCache() { RepositoryCache.clear(RETURN_SCHEMA); },
      maintenanceLog(ids) {
        return LogsService.record({
          level: "INFO", category: "SYSTEM", action: "MIGRATION", status: "SUCCESS",
          module: "ReturnPickupIdMaintenance", entityType: "ReturnMaintenance",
          entityId: "BLANK_RETURN_PICKUP_ID_REPAIR",
          message: `Repaired blank PickupID for ${ids.length} approved Return rows.`,
          context: { maintenance: "BLANK_RETURN_PICKUP_ID_REPAIR", affectedIds: ids.slice(), count: ids.length },
          source: "MAINTENANCE",
        });
      },
      getLock() { return LockService.getScriptLock(); },
    };
  }

  function matches(rows, field, value) {
    return rows.filter((row) => text(row.data[field]) === value);
  }

  function result(id, status, message, returnRow, proposedPickupId) {
    return {
      id,
      rowNumber: returnRow ? returnRow.rowNumber : null,
      currentPickupId: returnRow ? text(returnRow.data[RETURN_FIELDS.PICKUP_ID]) : "",
      proposedPickupId: proposedPickupId || "",
      status,
      message,
    };
  }

  function analyze(snapshot) {
    const plans = [];
    const results = TARGET_IDS.map((id) => {
      const foundReturns = matches(snapshot.returns, RETURN_SCHEMA.PRIMARY_KEY, id);
      if (!foundReturns.length) return result(id, "MISSING_RETURN", "Return row was not found.", null, "");
      if (foundReturns.length !== 1) return result(id, "DUPLICATE_RETURN", "Return ID is not unique.", foundReturns[0], "");
      const returnRow = foundReturns[0];
      const detailId = text(returnRow.data[RETURN_FIELDS.PICKUP_DETAIL_ID]);
      if (!detailId) return result(id, "BLANK_PICKUP_DETAIL_ID", "PickupDetailID is blank.", returnRow, "");
      const foundDetails = matches(snapshot.details, PICKUP_DETAIL_SCHEMA.PRIMARY_KEY, detailId);
      if (!foundDetails.length) return result(id, "MISSING_PICKUP_DETAIL", "Pickup Detail was not found.", returnRow, "");
      if (foundDetails.length !== 1) return result(id, "DUPLICATE_PICKUP_DETAIL", "PickupDetailID is not unique.", returnRow, "");
      const detail = foundDetails[0];
      const proposedPickupId = text(detail.data[PICKUP_DETAIL_FIELDS.PICKUP_ID]);
      if (!proposedPickupId) return result(id, "MISSING_PICKUP_HEADER", "Pickup Detail has no owning PickupID.", returnRow, "");
      const foundHeaders = matches(snapshot.headers, PICKUP_HEADER_SCHEMA.PRIMARY_KEY, proposedPickupId);
      if (!foundHeaders.length) return result(id, "MISSING_PICKUP_HEADER", "Owning Pickup Header was not found.", returnRow, proposedPickupId);
      if (foundHeaders.length !== 1) return result(id, "DUPLICATE_PICKUP_HEADER", "Pickup Header ID is not unique.", returnRow, proposedPickupId);
      const header = foundHeaders[0];
      if (String(detail.data[PICKUP_DETAIL_FIELDS.PICKUP_ID] == null ? "" : detail.data[PICKUP_DETAIL_FIELDS.PICKUP_ID]) !== proposedPickupId ||
          String(header.data[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] == null ? "" : header.data[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]) !== proposedPickupId) {
        return result(id, "OWNERSHIP_MISMATCH", "Pickup Detail ownership does not exactly match Pickup Header ID.", returnRow, proposedPickupId);
      }
      const currentPickupId = text(returnRow.data[RETURN_FIELDS.PICKUP_ID]);
      if (currentPickupId && currentPickupId !== proposedPickupId) {
        return result(id, "CONFLICTING_PICKUP_ID", "Existing PickupID conflicts with derived ownership.", returnRow, proposedPickupId);
      }
      const status = currentPickupId === proposedPickupId ? "ALREADY_REPAIRED" : "READY";
      plans.push({ id, rowNumber: returnRow.rowNumber, proposedPickupId, original: Object.assign({}, returnRow.data) });
      return result(id, status, status === "READY" ? "Validated for repair." : "PickupID already matches derived ownership.", returnRow, proposedPickupId);
    });
    return { valid: results.every((item) => item.status === "READY" || item.status === "ALREADY_REPAIRED"), results, plans };
  }

  function preview(dependencies) {
    const checked = analyze(dependencies.readSnapshot());
    return { success: checked.valid, status: checked.valid ? "VALID" : "INVALID", targetCount: TARGET_IDS.length, results: checked.results };
  }

  function repair(dependencies) {
    const lock = dependencies.getLock();
    let locked = false;
    try {
      lock.waitLock(LOCK_TIMEOUT_MS);
      locked = true;
      const checked = analyze(dependencies.readSnapshot());
      if (!checked.valid) return { success: false, status: "PREVALIDATION_FAILED", targetCount: TARGET_IDS.length, results: checked.results };
      const pending = checked.plans.filter((plan) => !text(plan.original[RETURN_FIELDS.PICKUP_ID]));
      if (!pending.length) return { success: true, status: "ALREADY_REPAIRED", repairedCount: 0, results: checked.results };
      const apply = pending.map((plan) => ({ id: plan.id, rowNumber: plan.rowNumber, value: plan.proposedPickupId }));
      const restore = pending.map((plan) => ({ id: plan.id, rowNumber: plan.rowNumber, value: plan.original[RETURN_FIELDS.PICKUP_ID] }));
      try {
        dependencies.writePickupIds(apply, "APPLY");
        dependencies.clearReturnCache();
        dependencies.maintenanceLog(pending.map((plan) => plan.id));
        return { success: true, status: "REPAIRED", repairedCount: pending.length, results: checked.results };
      } catch (error) {
        let rollbackError = null;
        try { dependencies.writePickupIds(restore, "ROLLBACK"); dependencies.clearReturnCache(); }
        catch (restoreError) { rollbackError = restoreError; }
        return {
          success: false,
          status: rollbackError ? "ROLLBACK_FAILED" : "ROLLED_BACK",
          error: String(error && error.message || error),
          rollbackError: rollbackError ? String(rollbackError.message || rollbackError) : "",
          repairedCount: 0,
        };
      }
    } finally {
      if (locked) lock.releaseLock();
    }
  }

  function create(dependencies) {
    const resolved = dependencies || productionDependencies();
    return Object.freeze({ preview: () => preview(resolved), repair: () => repair(resolved) });
  }

  return Object.freeze({ TARGET_IDS, create, analyze });
})();

function previewRepairBlankReturnPickupIds() {
  const report = ReturnPickupIdMaintenance.create().preview();
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

function repairBlankReturnPickupIds() {
  const report = ReturnPickupIdMaintenance.create().repair();
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}
