/** Fail-closed repair for Return rows whose PickupID is blank or invalid. */
const ReturnPickupIdMaintenance = (() => {
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
      createBackup(plans) {
        return {
          createdAt: new Date().toISOString(),
          rows: plans.map((plan) => ({
            id: plan.id,
            rowNumber: plan.rowNumber,
            pickupId: plan.currentPickupId,
          })),
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
          entityId: "RETURN_PICKUP_ID_REPAIR",
          message: `Repaired PickupID for ${ids.length} dynamically discovered Return rows.`,
          context: { maintenance: "RETURN_PICKUP_ID_REPAIR", affectedIds: ids.slice(), count: ids.length },
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
      changedFields: status === "ELIGIBLE" ? [RETURN_FIELDS.PICKUP_ID] : [],
      status,
      message,
    };
  }

  function classify(snapshot, returnRow) {
    if (!returnRow || !returnRow.data) return result("", "INVALID_RETURN", "Return row is invalid.", returnRow, "");
    const id = text(returnRow.data[RETURN_SCHEMA.PRIMARY_KEY]);
    if (!id || matches(snapshot.returns, RETURN_SCHEMA.PRIMARY_KEY, id).length !== 1) {
      return result(id, "INVALID_RETURN", "Return ID is blank or not unique.", returnRow, "");
    }
    const detailId = text(returnRow.data[RETURN_FIELDS.PICKUP_DETAIL_ID]);
    if (!detailId) return result(id, "MISSING_DETAIL", "PickupDetailID is blank.", returnRow, "");
    const details = matches(snapshot.details, PICKUP_DETAIL_SCHEMA.PRIMARY_KEY, detailId);
    if (!details.length) return result(id, "MISSING_DETAIL", "Pickup Detail was not found.", returnRow, "");
    if (details.length !== 1) return result(id, "DUPLICATE_DETAIL", "PickupDetailID is not unique.", returnRow, "");
    const detail = details[0];
    const proposedPickupId = text(detail.data[PICKUP_DETAIL_FIELDS.PICKUP_ID]);
    if (!proposedPickupId) return result(id, "MISSING_HEADER", "Pickup Detail has no owning PickupID.", returnRow, "");
    const headers = matches(snapshot.headers, PICKUP_HEADER_SCHEMA.PRIMARY_KEY, proposedPickupId);
    if (!headers.length) return result(id, "MISSING_HEADER", "Owning Pickup Header was not found.", returnRow, proposedPickupId);
    if (headers.length !== 1) return result(id, "DUPLICATE_HEADER", "Pickup Header ID is not unique.", returnRow, proposedPickupId);
    if (
      String(detail.data[PICKUP_DETAIL_FIELDS.PICKUP_ID] == null ? "" : detail.data[PICKUP_DETAIL_FIELDS.PICKUP_ID]) !== proposedPickupId ||
      String(headers[0].data[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] == null ? "" : headers[0].data[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]) !== proposedPickupId
    ) {
      return result(id, "OWNERSHIP_MISMATCH", "Pickup Detail ownership does not exactly match Pickup Header ID.", returnRow, proposedPickupId);
    }
    const currentPickupId = text(returnRow.data[RETURN_FIELDS.PICKUP_ID]);
    if (currentPickupId === proposedPickupId) {
      return result(id, "ALREADY_VALID", "PickupID already matches derived ownership.", returnRow, proposedPickupId);
    }
    return result(id, "ELIGIBLE", "Validated for PickupID-only repair.", returnRow, proposedPickupId);
  }

  function analyze(snapshot, targetIds) {
    const source = snapshot || { returns: [], details: [], headers: [] };
    const explicit = Array.isArray(targetIds);
    const ids = explicit
      ? Array.from(new Set(targetIds.map(text))).filter(Boolean).sort()
      : null;
    let results;
    if (explicit) {
      results = ids.map((id) => {
        const rows = matches(source.returns || [], RETURN_SCHEMA.PRIMARY_KEY, id);
        if (rows.length !== 1) return result(id, "INVALID_RETURN", rows.length ? "Return ID is not unique." : "Return row was not found.", rows[0] || null, "");
        return classify(source, rows[0]);
      });
    } else {
      results = (source.returns || []).map((row) => classify(source, row))
        .filter((item) => item.status !== "ALREADY_VALID")
        .sort((left, right) => left.id.localeCompare(right.id) || left.rowNumber - right.rowNumber);
    }
    const valid = results.every((item) => item.status === "ELIGIBLE" || item.status === "ALREADY_VALID");
    const plans = results.filter((item) => item.status === "ELIGIBLE").map((item) => ({
      id: item.id,
      rowNumber: item.rowNumber,
      currentPickupId: item.currentPickupId,
      proposedPickupId: item.proposedPickupId,
    }));
    return { valid, results, plans, targetCount: results.length, eligibleCount: plans.length };
  }

  function report(checked) {
    return {
      success: checked.valid,
      status: checked.valid ? "VALID" : "INVALID",
      targetCount: checked.targetCount,
      eligibleCount: checked.eligibleCount,
      results: checked.results,
    };
  }

  function preview(dependencies, targetIds) {
    return report(analyze(dependencies.readSnapshot(), targetIds));
  }

  function repair(dependencies, targetIds) {
    const lock = dependencies.getLock();
    let locked = false;
    try {
      lock.waitLock(LOCK_TIMEOUT_MS);
      locked = true;
      const checked = analyze(dependencies.readSnapshot(), targetIds);
      if (!checked.valid) return Object.assign(report(checked), { status: "PREVALIDATION_FAILED", repairedCount: 0 });
      if (!checked.plans.length) return Object.assign(report(checked), { status: "ALREADY_VALID", repairedCount: 0 });
      const pending = checked.plans.slice().sort((left, right) => left.id.localeCompare(right.id) || left.rowNumber - right.rowNumber);
      const backup = dependencies.createBackup(pending);
      const apply = pending.map((plan) => ({ id: plan.id, rowNumber: plan.rowNumber, value: plan.proposedPickupId }));
      const restore = pending.map((plan) => ({ id: plan.id, rowNumber: plan.rowNumber, value: plan.currentPickupId }));
      try {
        dependencies.writePickupIds(apply, "APPLY");
        dependencies.clearReturnCache();
        const verification = analyze(dependencies.readSnapshot(), pending.map((plan) => plan.id));
        if (!verification.valid || verification.results.some((item) => item.status !== "ALREADY_VALID")) {
          throw new Error("Persisted PickupID verification failed.");
        }
        dependencies.maintenanceLog(pending.map((plan) => plan.id));
        return {
          success: true,
          status: "REPAIRED",
          targetCount: checked.targetCount,
          eligibleCount: checked.eligibleCount,
          repairedCount: pending.length,
          affectedIds: pending.map((plan) => plan.id),
          backup: { created: true, rowCount: backup.rows.length, createdAt: backup.createdAt },
          results: verification.results,
        };
      } catch (error) {
        let rollbackError = null;
        try {
          dependencies.writePickupIds(restore, "ROLLBACK");
          dependencies.clearReturnCache();
        } catch (restoreError) { rollbackError = restoreError; }
        return {
          success: false,
          status: rollbackError ? "ROLLBACK_FAILED" : "ROLLED_BACK",
          error: String(error && error.message || error),
          rollbackError: rollbackError ? String(rollbackError.message || rollbackError) : "",
          repairedCount: 0,
          backup: { created: true, rowCount: backup.rows.length, createdAt: backup.createdAt },
        };
      }
    } finally {
      if (locked) lock.releaseLock();
    }
  }

  function create(dependencies, options = {}) {
    const resolved = dependencies || productionDependencies();
    const targetIds = Array.isArray(options.targetIds) ? options.targetIds.slice() : undefined;
    return Object.freeze({
      preview: () => preview(resolved, targetIds),
      repair: () => repair(resolved, targetIds),
    });
  }

  return Object.freeze({ create, analyze });
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
