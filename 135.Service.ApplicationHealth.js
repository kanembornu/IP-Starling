/**
 * Canonical read-only operational health checks for release readiness.
 *
 * Physical sheets are read once each with getDataRange().getValues(). The
 * resulting in-memory snapshot is used by every data, relationship, ID, audit,
 * and idempotency check. This module never uses RepositoryReader so running it
 * cannot populate or invalidate application caches.
 */
const ApplicationHealth = (() => {
  const STATUS = Object.freeze({ PASS: "PASS", WARN: "WARN", FAIL: "FAIL" });
  const STATUS_WEIGHT = Object.freeze({ PASS: 0, WARN: 1, FAIL: 2 });
  const SECTIONS = Object.freeze([
    "Application",
    "Routes",
    "Schemas",
    "Sheets",
    "IDs",
    "Relationships",
    "Idempotency",
    "Audit",
    "Cache",
    "Contracts",
    "Tests",
    "Release",
  ]);
  const BUSINESS_SCHEMA_KEYS = ID_GENERATOR_SCHEMA_KEYS;
  const INTERNAL_SCHEMA_KEYS = Object.freeze(["IDEMPOTENCY", "LOGS"]);
  const SUPPORTED_IDEMPOTENCY_OPERATIONS = Object.freeze({
    PICKUP_CREATE: "PICKUP_HEADER",
    RETURN_CREATE: "RETURN",
  });
  // First deployed paths that guaranteed both actor columns for each schema.
  // Rows predating these boundaries are operationally incomplete but do not
  // violate business correctness; current-path omissions remain failures.
  const AUDIT_ACTOR_ENFORCEMENT_AT = Object.freeze({
    PRODUCT: "2026-07-09T22:35:02+07:00",
    PARTNER: "2026-07-09T22:35:02+07:00",
    PICKUP_HEADER: "2026-07-15T14:24:43+07:00",
    PICKUP_DETAIL: "2026-07-15T14:24:43+07:00",
    RETURN: "2026-07-21T10:43:40+07:00",
    PURCHASE: "2026-07-09T22:35:02+07:00",
    EXPENSE: "2026-07-09T22:35:02+07:00",
    SETTINGS: "2026-07-22T16:17:16+07:00",
    IDEMPOTENCY: "2026-07-26T19:34:31+07:00",
  });
  const SUMMARY_MAX_IDS = 12;
  const SUMMARY_MAX_DIAGNOSTIC = 600;
  const DETAIL_MAX_RECORDS_PER_CHECK = 20;
  const DETAIL_MAX_ISSUES_PER_RECORD = 8;
  const CONTROLLER_ENDPOINTS = Object.freeze([
    "getDashboard",
    "getSettings",
    "updateSettingValue",
    "resetSettingValue",
    "listLogs",
    "listLogsPage",
    "getLogById",
    "getLogsSummary",
    "getProducts",
    "getDeletedProducts",
    "getProduct",
    "createProduct",
    "updateProduct",
    "deleteProduct",
    "restoreProduct",
    "getPartners",
    "getDeletedPartners",
    "getPartner",
    "createPartner",
    "updatePartner",
    "deletePartner",
    "restorePartner",
    "getPickups",
    "getDeletedPickups",
    "getPickup",
    "createPickup",
    "updatePickup",
    "deletePickup",
    "restorePickup",
    "getReturns",
    "getDeletedReturns",
    "getReturn",
    "createReturn",
    "updateReturn",
    "deleteReturn",
    "restoreReturn",
    "getPurchasing",
    "getDeletedPurchasing",
    "getPurchasingById",
    "createPurchasing",
    "updatePurchasing",
    "deletePurchasing",
    "restorePurchasing",
    "getExpenses",
    "getExpense",
    "getDeletedExpenses",
    "createExpense",
    "updateExpense",
    "deleteExpense",
    "restoreExpense",
  ]);
  const REQUIRED_RUNNERS = Object.freeze([
    "runReleaseReadinessTests",
    "runApplicationHealthCheckTests",
    "runApplicationHealthCheckSummary",
    "runApplicationHealthFailureDetails",
    "runIdempotencyContractTests",
    "runTransactionServiceContractTests",
    "runPickupAtomicityTests",
    "runReturnAtomicityTests",
    "runReleaseFrontendIntegrationTests",
    "runReleaseBackendContractTests",
    "runReleaseMutationIntegrityTests",
  ]);

  function schemas() {
    return Object.keys(SCHEMA).map((key) => ({ key, schema: SCHEMA[key] }));
  }

  function elapsed(startedAt) {
    return Math.max(0, Date.now() - startedAt);
  }

  function unique(values) {
    return values.filter((value, index) => values.indexOf(value) === index);
  }

  function affected(values, limit = 25) {
    return unique(
      values.filter((value) => String(value || "").trim() !== "").map(String),
    )
      .sort()
      .slice(0, limit);
  }

  function check(name, status, count, diagnostic, affectedIds, startedAt) {
    const allAffectedIds = unique(
      (affectedIds || [])
        .filter((value) => String(value || "").trim() !== "")
        .map(String),
    ).sort();
    const result = {
      name,
      status,
      count: Math.max(0, Number(count) || 0),
      diagnostic: String(diagnostic || ""),
      durationMs: startedAt == null ? 0 : elapsed(startedAt),
    };
    const ids = allAffectedIds.slice(0, 25);
    if (allAffectedIds.length) result.affectedCount = allAffectedIds.length;
    if (ids.length) result.affectedIds = ids;
    return result;
  }

  function worst(statuses) {
    return statuses.reduce(
      (result, value) =>
        STATUS_WEIGHT[value] > STATUS_WEIGHT[result] ? value : result,
      STATUS.PASS,
    );
  }

  function isBlank(value) {
    return value === "" || value === null || typeof value === "undefined";
  }
  function isTrue(value) {
    return value === true;
  }
  function isFalse(value) {
    return value === false;
  }
  function parseTime(value) {
    if (isBlank(value)) return 0;
    const time =
      value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  }
  function validDateValue(value) {
    if (value instanceof Date) return Number.isFinite(value.getTime());
    const text = String(value || "").trim();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!dateOnly) return parseTime(text) > 0;
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]);
    const day = Number(dateOnly[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }
  function rowPopulated(row) {
    return row.some((value) => !isBlank(value));
  }

  function sheetData(snapshot, schema) {
    return snapshot.sheets[schema.TABLE] || { exists: false, values: [] };
  }

  function physicalHeaders(snapshot, schema) {
    const values = sheetData(snapshot, schema).values || [];
    return values.length ? values[0].map((value) => String(value)) : [];
  }

  function physicalRows(snapshot, schema) {
    const data = sheetData(snapshot, schema);
    if (!data.exists || !data.values || data.values.length < 2) return [];
    const headers = physicalHeaders(snapshot, schema);
    return data.values
      .slice(1)
      .filter(rowPopulated)
      .map((values, index) => {
        const row = { __row: index + 2, __width: values.length };
        headers.forEach((header, column) => {
          row[header] = values[column];
        });
        return row;
      });
  }

  function indexRows(rows, field) {
    return rows.reduce((result, row) => {
      const key = String(row[field] || "").trim();
      if (key && !Object.prototype.hasOwnProperty.call(result, key))
        result[key] = row;
      return result;
    }, {});
  }

  function relationState(row, schema) {
    if (!row) return "MISSING";
    if (schema.SYSTEM && isTrue(row[schema.SYSTEM.IS_DELETED]))
      return "SOFT_DELETED_HISTORICAL";
    if (schema.SYSTEM && isFalse(row[schema.SYSTEM.IS_ACTIVE]))
      return "INACTIVE";
    return "VALID_ACTIVE";
  }

  function statusForRelation(states) {
    if (states.MISSING) return STATUS.FAIL;
    if (states.SOFT_DELETED_HISTORICAL || states.INACTIVE) return STATUS.WARN;
    return STATUS.PASS;
  }

  function relationCheck(name, references, targetIndex, targetSchema) {
    const startedAt = Date.now();
    const states = {
      MISSING: 0,
      SOFT_DELETED_HISTORICAL: 0,
      INACTIVE: 0,
      VALID_ACTIVE: 0,
    };
    const ids = [];
    references.forEach((reference) => {
      const state = relationState(
        targetIndex[String(reference.targetId || "").trim()],
        targetSchema,
      );
      states[state] += 1;
      if (state !== "VALID_ACTIVE") ids.push(reference.ownerId);
    });
    return check(
      name,
      statusForRelation(states),
      references.length,
      `active=${states.VALID_ACTIVE}; soft-deleted historical=${states.SOFT_DELETED_HISTORICAL}; inactive=${states.INACTIVE}; missing=${states.MISSING}.`,
      ids,
      startedAt,
    );
  }

  function validCanonicalDateCode(value) {
    const match = /^(\d{2})(\d{2})(\d{2})$/.exec(value);
    if (!match) return false;
    const year = 2000 + Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  function idClassification(schema, value) {
    const id = String(value || "").trim();
    if (schema === IDEMPOTENCY_SCHEMA)
      return IdempotencyService.KEY_PATTERN.test(id)
        ? "CANONICAL"
        : "MALFORMED";
    if (schema === LOG_SCHEMA)
      return /^LG-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id,
      )
        ? "CANONICAL"
        : "MALFORMED";
    const escaped = String(schema.ID_PREFIX).replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const canonical = new RegExp(`^${escaped}(\\d{6})(\\d{5})$`).exec(id);
    if (canonical)
      return validCanonicalDateCode(canonical[1]) && Number(canonical[2]) > 0
        ? "CANONICAL"
        : "MALFORMED";
    if (
      new RegExp(`^${escaped}\\d{3,}$`).test(id) ||
      /(?:^|[-_])(TEST|FIXTURE|LEGACY)(?:[-_]|$)/i.test(id)
    )
      return "LEGACY_FIXTURE";
    return "MALFORMED";
  }

  function valueClassification(value, reason, rule) {
    if (isBlank(value)) return "BLANK";
    if (typeof value === "string" && !value.trim()) return "WHITESPACE_ONLY";
    if (reason === "exceeds max length")
      return `TEXT_OVER_MAX_${rule.maxLength}`;
    if (reason === "invalid type")
      return typeof value === "number"
        ? "NON_FINITE_NUMBER"
        : `TYPE_${typeof value}`.toUpperCase();
    if (reason === "invalid format") return "INVALID_FORMAT";
    if (reason === "below minimum") return `NUMBER_BELOW_MIN_${rule.min}`;
    return "INVALID_VALUE";
  }

  function fixtureMarker(row, schema) {
    return Object.values(schema.FIELDS || {}).some((field) =>
      /(?:test fixture|health test|atomic fixture)/i.test(
        String(row[field] || ""),
      ),
    );
  }

  function actorPolicy(key, schema, row) {
    if (fixtureMarker(row, schema))
      return { severity: STATUS.WARN, classification: "TEST_FIXTURE_RESIDUE" };
    const cutoff = parseTime(AUDIT_ACTOR_ENFORCEMENT_AT[key]);
    const createdAt = schema.SYSTEM
      ? parseTime(row[schema.SYSTEM.CREATED_AT])
      : 0;
    if (cutoff && createdAt && createdAt < cutoff)
      return { severity: STATUS.WARN, classification: "LEGACY_COMPATIBILITY" };
    return { severity: STATUS.FAIL, classification: "REAL_DATA_DEFECT" };
  }

  function fieldIssue(
    key,
    schema,
    row,
    field,
    reason,
    rule = {},
    policy = null,
  ) {
    const resolved = policy || {
      severity: STATUS.FAIL,
      classification: "REAL_DATA_DEFECT",
    };
    return {
      schema: key,
      table: schema.TABLE,
      recordId: String(
        row[schema.PRIMARY_KEY] || `${schema.TABLE}:${row.__row}`,
      ),
      rowNumber: row.__row,
      field,
      severity: resolved.severity,
      classification: resolved.classification,
      valueClassification: valueClassification(row[field], reason, rule),
      reason,
    };
  }

  function schemaFieldIssues(snapshot, key, schema) {
    const issues = [];
    physicalRows(snapshot, schema).forEach((row) => {
      if (schema.SYSTEM) {
        [schema.SYSTEM.IS_DELETED, schema.SYSTEM.IS_ACTIVE].forEach((field) => {
          if (!isTrue(row[field]) && !isFalse(row[field]))
            issues.push(fieldIssue(key, schema, row, field, "invalid type"));
        });
        [schema.SYSTEM.CREATED_AT, schema.SYSTEM.UPDATED_AT].forEach(
          (field) => {
            if (field && !parseTime(row[field]))
              issues.push(
                fieldIssue(key, schema, row, field, "invalid format"),
              );
          },
        );
        [schema.SYSTEM.CREATED_BY, schema.SYSTEM.UPDATED_BY].forEach(
          (field) => {
            if (field && !String(row[field] || "").trim())
              issues.push(
                fieldIssue(
                  key,
                  schema,
                  row,
                  field,
                  "actor blank",
                  {},
                  actorPolicy(key, schema, row),
                ),
              );
          },
        );
      }
      if (schema === LOG_SCHEMA) {
        [LOG_FIELDS.TIMESTAMP, LOG_FIELDS.CREATED_AT].forEach((field) => {
          if (!parseTime(row[field]))
            issues.push(fieldIssue(key, schema, row, field, "invalid format"));
        });
      }
      Object.keys(schema.VALIDATION || {}).forEach((field) => {
        const rule = schema.VALIDATION[field];
        const value = row[field];
        if (
          rule.required &&
          (isBlank(value) || (typeof value === "string" && !value.trim()))
        )
          issues.push(
            fieldIssue(key, schema, row, field, "required blank", rule),
          );
        if (
          rule.maxLength !== undefined &&
          !isBlank(value) &&
          String(value).length > rule.maxLength
        )
          issues.push(
            fieldIssue(key, schema, row, field, "exceeds max length", rule),
          );
        if (rule.numeric && !isBlank(value) && !Number.isFinite(Number(value)))
          issues.push(
            fieldIssue(key, schema, row, field, "invalid type", rule),
          );
        else if (
          rule.numeric &&
          !isBlank(value) &&
          rule.min !== undefined &&
          Number(value) < rule.min
        )
          issues.push(
            fieldIssue(key, schema, row, field, "below minimum", rule),
          );
      });
      const dateFields = unique([
        PICKUP_HEADER_FIELDS.DATE,
        RETURN_FIELDS.DATE,
        PURCHASING_FIELDS.DATE,
        EXPENSE_FIELDS.DATE,
      ]);
      dateFields
        .filter(
          (field) => Object.values(schema.FIELDS || {}).indexOf(field) >= 0,
        )
        .forEach((field) => {
          if (!validDateValue(row[field]))
            issues.push(fieldIssue(key, schema, row, field, "invalid format"));
        });
      if (schema === PICKUP_HEADER_SCHEMA) {
        [
          PICKUP_HEADER_FIELDS.TOTAL_ITEM,
          PICKUP_HEADER_FIELDS.TOTAL_QTY,
        ].forEach((field) => {
          if (!Number.isFinite(Number(row[field])))
            issues.push(fieldIssue(key, schema, row, field, "invalid type"));
          else if (Number(row[field]) < 0)
            issues.push(
              fieldIssue(key, schema, row, field, "below minimum", { min: 0 }),
            );
        });
      }
    });
    return issues;
  }

  function schemaHealth(snapshot, result) {
    const startedAt = Date.now();
    const definitions = schemas();
    const names = definitions.map((item) => item.schema.NAME);
    const tables = definitions.map((item) => item.schema.TABLE);
    const duplicateNames = names.filter(
      (name, index) => names.indexOf(name) !== index,
    );
    const duplicateTables = tables.filter(
      (name, index) => tables.indexOf(name) !== index,
    );
    result.Schemas.push(
      check(
        "Canonical schema registry",
        duplicateNames.length || duplicateTables.length
          ? STATUS.FAIL
          : STATUS.PASS,
        definitions.length,
        duplicateNames.length || duplicateTables.length
          ? "Duplicate schema names or tables are registered."
          : `${definitions.length} unique schemas are registered.`,
        duplicateNames.concat(duplicateTables),
        startedAt,
      ),
    );

    definitions.forEach(({ key, schema }) => {
      const sheet = sheetData(snapshot, schema);
      const headers = physicalHeaders(snapshot, schema);
      const expected = schema.HEADERS.slice();
      const headerCounts = headers.reduce((counts, header) => {
        counts[header] = (counts[header] || 0) + 1;
        return counts;
      }, {});
      const duplicateHeaders = Object.keys(headerCounts).filter(
        (header) => headerCounts[header] > 1,
      );
      const exact = JSON.stringify(headers) === JSON.stringify(expected);
      result.Sheets.push(
        check(
          `${schema.TABLE}: required sheet`,
          sheet.exists ? STATUS.PASS : STATUS.FAIL,
          sheet.exists ? 1 : 0,
          sheet.exists ? "Sheet exists." : "Required sheet is missing.",
          [sheet.exists ? "" : schema.TABLE],
          startedAt,
        ),
      );
      if (!sheet.exists) return;
      result.Sheets.push(
        check(
          `${schema.TABLE}: canonical headers`,
          exact ? STATUS.PASS : STATUS.FAIL,
          headers.length,
          exact
            ? "Headers exactly match the canonical schema."
            : `Header mismatch. expected=${JSON.stringify(expected)} actual=${JSON.stringify(headers)}.`,
          [schema.TABLE],
          startedAt,
        ),
      );
      result.Sheets.push(
        check(
          `${schema.TABLE}: unique headers and width`,
          duplicateHeaders.length ? STATUS.FAIL : STATUS.PASS,
          headers.length,
          duplicateHeaders.length
            ? `Duplicate headers: ${duplicateHeaders.join(", ")}.`
            : `No duplicate headers; width=${headers.length}.`,
          duplicateHeaders,
          startedAt,
        ),
      );

      const rows = physicalRows(snapshot, schema);
      const invalidWidths = rows
        .filter((row) => row.__width !== headers.length)
        .map((row) => `${schema.TABLE}:${row.__row}`);
      result.Sheets.push(
        check(
          `${schema.TABLE}: row width`,
          invalidWidths.length ? STATUS.FAIL : STATUS.PASS,
          rows.length,
          invalidWidths.length
            ? `${invalidWidths.length} populated rows have invalid width.`
            : "All populated rows match the physical schema width.",
          invalidWidths,
          startedAt,
        ),
      );

      const issues = schemaFieldIssues(snapshot, key, schema);
      const flagIssues = issues.filter(
        (issue) =>
          issue.reason === "invalid type" &&
          schema.SYSTEM &&
          [schema.SYSTEM.IS_DELETED, schema.SYSTEM.IS_ACTIVE].indexOf(
            issue.field,
          ) >= 0,
      );
      const timeIssues = issues.filter(
        (issue) => issue.reason === "invalid format",
      );
      const fieldIssues = issues.filter(
        (issue) =>
          issue.reason === "required blank" ||
          issue.reason === "exceeds max length",
      );
      const actorIssues = issues.filter(
        (issue) => issue.reason === "actor blank",
      );
      const numberIssues = issues.filter(
        (issue) =>
          (issue.reason === "invalid type" ||
            issue.reason === "below minimum") &&
          (!schema.SYSTEM ||
            [schema.SYSTEM.IS_DELETED, schema.SYSTEM.IS_ACTIVE].indexOf(
              issue.field,
            ) < 0),
      );
      const flagIds = unique(flagIssues.map((issue) => issue.recordId));
      const timeIds = unique(timeIssues.map((issue) => issue.recordId));
      const fieldIds = unique(fieldIssues.map((issue) => issue.recordId));
      const actorIds = unique(actorIssues.map((issue) => issue.recordId));
      const numberIds = unique(numberIssues.map((issue) => issue.recordId));
      if (schema.SYSTEM)
        result.Schemas.push(
          check(
            `${key}: lifecycle flags`,
            flagIds.length ? STATUS.FAIL : STATUS.PASS,
            rows.length,
            flagIds.length
              ? `${flagIds.length} rows have invalid Deleted/IsActive values.`
              : "Deleted and IsActive values are boolean.",
            flagIds,
            startedAt,
          ),
        );
      result.Schemas.push(
        check(
          `${key}: required timestamps`,
          timeIds.length ? STATUS.FAIL : STATUS.PASS,
          rows.length,
          timeIds.length
            ? `${timeIds.length} rows have blank or unparseable required timestamps.`
            : "Required timestamps are parseable.",
          timeIds,
          startedAt,
        ),
      );
      if (schema.SYSTEM || Object.keys(schema.VALIDATION || {}).length)
        result.Schemas.push(
          check(
            `${key}: required and bounded fields`,
            fieldIds.length ? STATUS.FAIL : STATUS.PASS,
            rows.length,
            fieldIds.length
              ? `${fieldIds.length} rows have blank required business fields or exceed configured lengths.`
              : "Required and maximum-length business fields satisfy schema constraints; optional blanks are allowed.",
            fieldIds,
            startedAt,
          ),
        );
      if (schema.SYSTEM) {
        const actorStatus = worst(actorIssues.map((issue) => issue.severity));
        const legacyActors = actorIssues.filter(
          (issue) => issue.severity === STATUS.WARN,
        ).length;
        const currentActors = actorIssues.filter(
          (issue) => issue.severity === STATUS.FAIL,
        ).length;
        result.Schemas.push(
          check(
            `${key}: audit actors`,
            actorStatus,
            rows.length,
            actorIssues.length
              ? `${actorIds.length} rows have blank audit actors; current=${currentActors}; legacy/test=${legacyActors}.`
              : "CreatedBy and UpdatedBy are populated.",
            actorIds,
            startedAt,
          ),
        );
      }
      if (
        schema === PICKUP_HEADER_SCHEMA ||
        Object.keys(schema.VALIDATION || {}).some(
          (field) => schema.VALIDATION[field].numeric,
        )
      ) {
        result.Schemas.push(
          check(
            `${key}: numeric constraints`,
            numberIds.length ? STATUS.FAIL : STATUS.PASS,
            rows.length,
            numberIds.length
              ? `${numberIds.length} rows violate numeric constraints.`
              : "Numeric values are finite and within schema minima.",
            numberIds,
            startedAt,
          ),
        );
      }
    });
  }

  function idHealth(snapshot, result) {
    schemas().forEach(({ key, schema }) => {
      const startedAt = Date.now();
      if (!sheetData(snapshot, schema).exists) return;
      const rows = physicalRows(snapshot, schema);
      const ids = rows.map((row) =>
        String(row[schema.PRIMARY_KEY] || "").trim(),
      );
      const counts = ids.filter(Boolean).reduce((map, id) => {
        map[id] = (map[id] || 0) + 1;
        return map;
      }, {});
      const duplicate = Object.keys(counts).filter((id) => counts[id] > 1);
      const empty = rows
        .filter((row) => !String(row[schema.PRIMARY_KEY] || "").trim())
        .map((row) => `${schema.TABLE}:${row.__row}`);
      const malformed = ids.filter(
        (id) => id && idClassification(schema, id) === "MALFORMED",
      );
      const legacy = ids.filter(
        (id) => id && idClassification(schema, id) === "LEGACY_FIXTURE",
      );
      result.IDs.push(
        check(
          `${key}: primary ID uniqueness`,
          duplicate.length ? STATUS.FAIL : STATUS.PASS,
          ids.length,
          duplicate.length
            ? `${duplicate.length} duplicate primary IDs detected.`
            : "Primary IDs are unique.",
          duplicate,
          startedAt,
        ),
      );
      result.IDs.push(
        check(
          `${key}: populated-row primary IDs`,
          empty.length ? STATUS.FAIL : STATUS.PASS,
          ids.length,
          empty.length
            ? `${empty.length} populated rows have empty primary IDs.`
            : "No populated row has an empty primary ID.",
          empty,
          startedAt,
        ),
      );
      result.IDs.push(
        check(
          `${key}: ID format`,
          malformed.length
            ? STATUS.FAIL
            : legacy.length
              ? STATUS.WARN
              : STATUS.PASS,
          ids.length,
          malformed.length
            ? `${malformed.length} malformed IDs detected; ${legacy.length} legacy/test fixture IDs classified separately.`
            : legacy.length
              ? `${legacy.length} valid legacy/test fixture IDs are non-canonical.`
              : "All IDs use the canonical format.",
          malformed.concat(legacy),
          startedAt,
        ),
      );

      if (BUSINESS_SCHEMA_KEYS.indexOf(key) >= 0) {
        const todayCode = snapshot.todayCode || "";
        const prefix = String(schema.ID_PREFIX);
        const expression = new RegExp(`^${prefix}${todayCode}(\\d{5})$`);
        const maxStored = ids.reduce((max, id) => {
          const match = expression.exec(id);
          return match ? Math.max(max, Number(match[1])) : max;
        }, 0);
        const reserved = physicalRows(snapshot, IDEMPOTENCY_SCHEMA)
          .filter(
            (row) =>
              SUPPORTED_IDEMPOTENCY_OPERATIONS[
                String(row[IDEMPOTENCY_FIELDS.OPERATION] || "")
              ] === key,
          )
          .map((row) => String(row[IDEMPOTENCY_FIELDS.RESOURCE_ID] || ""));
        const maxReserved = reserved.reduce((max, id) => {
          const match = expression.exec(id);
          return match ? Math.max(max, Number(match[1])) : max;
        }, 0);
        const maxAllocated = Math.max(maxStored, maxReserved);
        const current = Number((snapshot.sequences || {})[prefix] || 0);
        result.IDs.push(
          check(
            `${key}: current sequence collision safety`,
            current < maxAllocated ? STATUS.FAIL : STATUS.PASS,
            maxAllocated,
            current < maxAllocated
              ? `Current sequence ${current} trails today's allocated maximum ${maxAllocated}.`
              : `Current sequence ${current}; stored maximum ${maxStored}; reserved maximum ${maxReserved}.`,
            [],
            startedAt,
          ),
        );
      }
    });
  }

  function relationshipHealth(snapshot, result) {
    const products = physicalRows(snapshot, PRODUCT_SCHEMA);
    const partners = physicalRows(snapshot, PARTNER_SCHEMA);
    const headers = physicalRows(snapshot, PICKUP_HEADER_SCHEMA);
    const details = physicalRows(snapshot, PICKUP_DETAIL_SCHEMA);
    const returns = physicalRows(snapshot, RETURN_SCHEMA);
    const purchases = physicalRows(snapshot, PURCHASING_SCHEMA);
    const productById = indexRows(products, PRODUCT_SCHEMA.PRIMARY_KEY);
    const partnerById = indexRows(partners, PARTNER_SCHEMA.PRIMARY_KEY);
    const headerById = indexRows(headers, PICKUP_HEADER_SCHEMA.PRIMARY_KEY);
    const detailById = indexRows(details, PICKUP_DETAIL_SCHEMA.PRIMARY_KEY);

    result.Relationships.push(
      relationCheck(
        "Pickup Partner references",
        headers.map((row) => ({
          ownerId: row.ID,
          targetId: row[PICKUP_HEADER_FIELDS.PARTNER_ID],
        })),
        partnerById,
        PARTNER_SCHEMA,
      ),
    );
    result.Relationships.push(
      relationCheck(
        "Pickup detail Product references",
        details.map((row) => ({
          ownerId: row.ID,
          targetId: row[PICKUP_DETAIL_FIELDS.PRODUCT_ID],
        })),
        productById,
        PRODUCT_SCHEMA,
      ),
    );
    result.Relationships.push(
      relationCheck(
        "Pickup detail ownership",
        details.map((row) => ({
          ownerId: row.ID,
          targetId: row[PICKUP_DETAIL_FIELDS.PICKUP_ID],
        })),
        headerById,
        PICKUP_HEADER_SCHEMA,
      ),
    );
    const pickupValueStarted = Date.now();
    const invalidPickupValues = details.filter((detail) => {
      const priceValue = detail[PICKUP_DETAIL_FIELDS.PRICE];
      const totalValue = detail[PICKUP_DETAIL_FIELDS.TOTAL];
      const qty = Number(detail[PICKUP_DETAIL_FIELDS.QTY]);
      const price = Number(priceValue);
      const total = Number(totalValue);
      return priceValue === "" || priceValue === null || totalValue === "" || totalValue === null ||
        !Number.isFinite(qty) || !Number.isFinite(price) || !Number.isFinite(total) ||
        qty < 0 || price < 0 || total !== qty * price;
    }).map((detail) => detail.ID);
    result.Relationships.push(
      check(
        "Pickup detail historical value reconciliation",
        invalidPickupValues.length ? STATUS.FAIL : STATUS.PASS,
        details.length,
        invalidPickupValues.length
          ? `${invalidPickupValues.length} Pickup Detail rows do not reconcile Qty x Harga = Total.`
          : "Pickup Detail historical prices and totals reconcile.",
        invalidPickupValues,
        pickupValueStarted,
      ),
    );

    const totalsStarted = Date.now();
    const invalidTotals = [];
    const ambiguousTotals = [];
    headers.forEach((header) => {
      const id = String(header.ID || "");
      const linked = details.filter(
        (detail) => String(detail[PICKUP_DETAIL_FIELDS.PICKUP_ID]) === id,
      );
      const activeDetails = linked.filter(
        (detail) => !isTrue(detail.Deleted) && !isFalse(detail.IsActive),
      );
      if (isTrue(header.Deleted)) {
        if (linked.length) ambiguousTotals.push(id);
        return;
      }
      const quantity = activeDetails.reduce(
        (sum, detail) => sum + Number(detail[PICKUP_DETAIL_FIELDS.QTY] || 0),
        0,
      );
      if (
        Number(header[PICKUP_HEADER_FIELDS.TOTAL_ITEM]) !==
          activeDetails.length ||
        Number(header[PICKUP_HEADER_FIELDS.TOTAL_QTY]) !== quantity
      )
        invalidTotals.push(id);
    });
    result.Relationships.push(
      check(
        "Pickup aggregate totals",
        invalidTotals.length
          ? STATUS.FAIL
          : ambiguousTotals.length
            ? STATUS.WARN
            : STATUS.PASS,
        headers.length,
        invalidTotals.length
          ? `${invalidTotals.length} active Pickup aggregates do not match active details.`
          : ambiguousTotals.length
            ? `${ambiguousTotals.length} deleted Pickup aggregates retain historical detail generations and were not treated as failures.`
            : "Stored Pickup totals match active details.",
        invalidTotals.concat(ambiguousTotals),
        totalsStarted,
      ),
    );

    result.Relationships.push(
      relationCheck(
        "Return Pickup references",
        returns.map((row) => ({
          ownerId: row.ID,
          targetId: row[RETURN_FIELDS.PICKUP_ID],
        })),
        headerById,
        PICKUP_HEADER_SCHEMA,
      ),
    );
    result.Relationships.push(
      relationCheck(
        "Return PickupDetail references",
        returns.map((row) => ({
          ownerId: row.ID,
          targetId: row[RETURN_FIELDS.PICKUP_DETAIL_ID],
        })),
        detailById,
        PICKUP_DETAIL_SCHEMA,
      ),
    );
    const ownershipStarted = Date.now();
    const mismatchedReturns = returns
      .filter((row) => {
        const detail =
          detailById[String(row[RETURN_FIELDS.PICKUP_DETAIL_ID] || "")];
        return (
          detail &&
          String(detail[PICKUP_DETAIL_FIELDS.PICKUP_ID] || "") !==
            String(row[RETURN_FIELDS.PICKUP_ID] || "")
        );
      })
      .map((row) => row.ID);
    result.Relationships.push(
      check(
        "Return header/detail ownership",
        mismatchedReturns.length ? STATUS.FAIL : STATUS.PASS,
        returns.length,
        mismatchedReturns.length
          ? `${mismatchedReturns.length} Return rows reference a detail owned by another Pickup.`
          : "Return Pickup and PickupDetail ownership is consistent.",
        mismatchedReturns,
        ownershipStarted,
      ),
    );

    const allocationStarted = Date.now();
    const allocations = {};
    returns
      .filter((row) => !isTrue(row.Deleted) && !isFalse(row.IsActive))
      .forEach((row) => {
        const id = String(row[RETURN_FIELDS.PICKUP_DETAIL_ID] || "");
        allocations[id] =
          (allocations[id] || 0) + Number(row[RETURN_FIELDS.QTY] || 0);
      });
    const overAllocated = Object.keys(allocations).filter(
      (id) =>
        detailById[id] &&
        allocations[id] > Number(detailById[id][PICKUP_DETAIL_FIELDS.QTY] || 0),
    );
    result.Relationships.push(
      check(
        "Active Return quantity eligibility",
        overAllocated.length ? STATUS.FAIL : STATUS.PASS,
        Object.keys(allocations).length,
        overAllocated.length
          ? `${overAllocated.length} Pickup details are over-allocated by active Returns.`
          : "Cumulative active Return quantities do not exceed Pickup detail quantities; deleted Returns consume no eligibility.",
        overAllocated,
        allocationStarted,
      ),
    );

    result.Relationships.push(
      relationCheck(
        "Purchasing Supplier references",
        purchases.map((row) => ({
          ownerId: row.ID,
          targetId: row[PURCHASING_FIELDS.SUPPLIER_ID],
        })),
        partnerById,
        PARTNER_SCHEMA,
      ),
    );
    result.Relationships.push(
      relationCheck(
        "Purchasing Product references",
        purchases.map((row) => ({
          ownerId: row.ID,
          targetId: row[PURCHASING_FIELDS.PRODUCT_ID],
        })),
        productById,
        PRODUCT_SCHEMA,
      ),
    );
    const purchaseTotalStarted = Date.now();
    const invalidPurchaseTotals = purchases
      .filter(
        (row) =>
          Math.abs(
            Number(row[PURCHASING_FIELDS.TOTAL]) -
              Number(row[PURCHASING_FIELDS.QTY]) *
                Number(row[PURCHASING_FIELDS.PRICE]),
          ) > 0.000001,
      )
      .map((row) => row.ID);
    result.Relationships.push(
      check(
        "Purchasing derived totals",
        invalidPurchaseTotals.length ? STATUS.FAIL : STATUS.PASS,
        purchases.length,
        invalidPurchaseTotals.length
          ? `${invalidPurchaseTotals.length} Purchasing rows have inconsistent Qty x Harga totals.`
          : "Purchasing totals equal Qty x Harga.",
        invalidPurchaseTotals,
        purchaseTotalStarted,
      ),
    );
  }

  function idempotencyHealth(snapshot, result, nowMs) {
    const startedAt = Date.now();
    const rows = physicalRows(snapshot, IDEMPOTENCY_SCHEMA);
    const keys = {};
    const malformed = [];
    const missingResources = [];
    const recentPending = [];
    const stalePending = [];
    const expired = [];
    const releasedSuccess = [];
    const resourceIndexes = {};
    Object.keys(SUPPORTED_IDEMPOTENCY_OPERATIONS).forEach((operation) => {
      const schema = SCHEMA[SUPPORTED_IDEMPOTENCY_OPERATIONS[operation]];
      resourceIndexes[operation] = indexRows(
        physicalRows(snapshot, schema),
        schema.PRIMARY_KEY,
      );
    });

    rows.forEach((row) => {
      const key = String(row[IDEMPOTENCY_FIELDS.KEY] || "");
      const operation = String(row[IDEMPOTENCY_FIELDS.OPERATION] || "");
      const status = String(row[IDEMPOTENCY_FIELDS.STATUS] || "");
      keys[key] = (keys[key] || 0) + 1;
      let response = null;
      const responseText = String(
        row[IDEMPOTENCY_FIELDS.RESPONSE_PAYLOAD] || "",
      );
      if (responseText) {
        try {
          response = JSON.parse(responseText);
        } catch (error) {
          malformed.push(key);
        }
      }
      if (
        !IdempotencyService.KEY_PATTERN.test(key) ||
        !Object.prototype.hasOwnProperty.call(
          SUPPORTED_IDEMPOTENCY_OPERATIONS,
          operation,
        ) ||
        !/^[0-9a-f]{64}$/.test(
          String(row[IDEMPOTENCY_FIELDS.PAYLOAD_HASH] || ""),
        ) ||
        ["PENDING", "COMMITTED", "RELEASED"].indexOf(status) < 0 ||
        !parseTime(row[IDEMPOTENCY_FIELDS.EXPIRES_AT])
      )
        malformed.push(key);
      if (status === "COMMITTED") {
        const resourceId = String(row[IDEMPOTENCY_FIELDS.RESOURCE_ID] || "");
        if (
          !resourceId ||
          !resourceIndexes[operation] ||
          !resourceIndexes[operation][resourceId]
        )
          missingResources.push(key);
        if (!responseText || response === null) malformed.push(key);
      }
      if (status === "RELEASED" && response && response.success === true)
        releasedSuccess.push(key);
      if (status === "PENDING") {
        const updatedAt = parseTime(row[IDEMPOTENCY_SCHEMA.SYSTEM.UPDATED_AT]);
        if (
          updatedAt &&
          nowMs - updatedAt < IdempotencyService.PENDING_TIMEOUT_MS
        )
          recentPending.push(key);
        else stalePending.push(key);
      }
      const expiresAt = parseTime(row[IDEMPOTENCY_FIELDS.EXPIRES_AT]);
      if (status !== "PENDING" && expiresAt && expiresAt <= nowMs)
        expired.push(key);
    });
    const duplicate = Object.keys(keys).filter((key) => keys[key] > 1);
    result.Idempotency.push(
      check(
        "Idempotency key uniqueness",
        duplicate.length ? STATUS.FAIL : STATUS.PASS,
        rows.length,
        duplicate.length
          ? `${duplicate.length} duplicate keys detected.`
          : "Idempotency keys are unique.",
        duplicate,
        startedAt,
      ),
    );
    result.Idempotency.push(
      check(
        "Idempotency row structure",
        malformed.length || releasedSuccess.length ? STATUS.FAIL : STATUS.PASS,
        rows.length,
        malformed.length || releasedSuccess.length
          ? `malformed=${unique(malformed).length}; released-success=${releasedSuccess.length}.`
          : "Operations, hashes, states, response payloads, and expiry values are valid.",
        malformed.concat(releasedSuccess),
        startedAt,
      ),
    );
    result.Idempotency.push(
      check(
        "Committed resource resolution",
        missingResources.length ? STATUS.FAIL : STATUS.PASS,
        rows.filter((row) => row.Status === "COMMITTED").length,
        missingResources.length
          ? `${missingResources.length} committed requests point to missing resources.`
          : "Committed resources resolve to the expected business schema.",
        missingResources,
        startedAt,
      ),
    );
    result.Idempotency.push(
      check(
        "Pending reservations",
        stalePending.length ? STATUS.WARN : STATUS.PASS,
        recentPending.length + stalePending.length,
        `recent=${recentPending.length}; stale=${stalePending.length}. PENDING rows are never cleanup candidates.`,
        stalePending,
        startedAt,
      ),
    );
    result.Idempotency.push(
      check(
        "Expired terminal reservations",
        expired.length ? STATUS.WARN : STATUS.PASS,
        expired.length,
        expired.length
          ? `${expired.length} expired COMMITTED/RELEASED rows await optional manual cleanup.`
          : "No expired terminal reservations require attention.",
        expired,
        startedAt,
      ),
    );
    const cleanupSource = String(IdempotencyService.cleanupExpired || "");
    const pendingProtected =
      /STATUS\.PENDING/.test(cleanupSource) && /!==/.test(cleanupSource);
    result.Idempotency.push(
      check(
        "PENDING cleanup protection",
        pendingProtected ? STATUS.PASS : STATUS.FAIL,
        1,
        pendingProtected
          ? "cleanupExpired explicitly excludes PENDING reservations."
          : "cleanupExpired does not visibly protect PENDING reservations.",
        [],
        startedAt,
      ),
    );
  }

  function auditHealth(snapshot, result) {
    const startedAt = Date.now();
    const rows = physicalRows(snapshot, LOG_SCHEMA);
    const invalidStructure = [];
    const missingResource = [];
    const duplicateCreate = [];
    const successCreates = {};
    const entitySchemas = {
      Product: PRODUCT_SCHEMA,
      Partner: PARTNER_SCHEMA,
      PickupHeader: PICKUP_HEADER_SCHEMA,
      PickupDetail: PICKUP_DETAIL_SCHEMA,
      Return: RETURN_SCHEMA,
      Purchase: PURCHASING_SCHEMA,
      Expense: EXPENSE_SCHEMA,
      Setting: SETTINGS_SCHEMA,
    };
    const indexes = {};
    Object.keys(entitySchemas).forEach((name) => {
      const schema = entitySchemas[name];
      const referenceField =
        name === "Setting" ? SETTINGS_FIELDS.KEY : schema.PRIMARY_KEY;
      indexes[name] = indexRows(physicalRows(snapshot, schema), referenceField);
    });
    rows.forEach((row) => {
      const id = String(row.ID || `${LOG_SCHEMA.TABLE}:${row.__row}`);
      if (
        LogsService.LEVELS.indexOf(String(row.Level)) < 0 ||
        LogsService.CATEGORIES.indexOf(String(row.Category)) < 0 ||
        LogsService.ACTIONS.indexOf(String(row.Action)) < 0 ||
        LogsService.STATUSES.indexOf(String(row.Status)) < 0 ||
        !parseTime(row.Timestamp) ||
        !String(row.Actor || "").trim()
      )
        invalidStructure.push(id);
      [
        LOG_FIELDS.BEFORE_DATA,
        LOG_FIELDS.AFTER_DATA,
        LOG_FIELDS.CONTEXT,
      ].forEach((field) => {
        const text = String(row[field] || "");
        if (text) {
          try {
            JSON.parse(text);
          } catch (error) {
            invalidStructure.push(id);
          }
        }
      });
      if (
        row.Category === "AUDIT" &&
        row.Status === "SUCCESS" &&
        row.EntityID
      ) {
        const entityType = String(row.EntityType || row.Module || "");
        const index = indexes[entityType];
        if (
          ["CREATE", "UPDATE", "DELETE", "RESTORE"].indexOf(
            String(row.Action),
          ) >= 0 &&
          !index
        )
          invalidStructure.push(id);
        if (index && !index[String(row.EntityID)] && row.Action !== "DELETE")
          missingResource.push(id);
        if (row.Action === "CREATE") {
          const key = `${entityType}:${row.EntityID}`;
          successCreates[key] = successCreates[key] || [];
          successCreates[key].push(id);
        }
      }
    });
    Object.keys(successCreates)
      .filter((key) => successCreates[key].length > 1)
      .forEach((key) => duplicateCreate.push(...successCreates[key]));
    result.Audit.push(
      check(
        "Audit row structure",
        invalidStructure.length ? STATUS.FAIL : STATUS.PASS,
        rows.length,
        invalidStructure.length
          ? `${invalidStructure.length} audit/log rows have invalid enums, timestamps, or actors.`
          : "Audit/log enums, timestamps, and actors are structurally valid.",
        invalidStructure,
        startedAt,
      ),
    );
    result.Audit.push(
      check(
        "Successful audit resource references",
        missingResource.length ? STATUS.FAIL : STATUS.PASS,
        rows.length,
        missingResource.length
          ? `${missingResource.length} successful non-delete audits reference missing resources.`
          : "Successful mutation audits resolve, with approved deletion actions exempted.",
        missingResource,
        startedAt,
      ),
    );
    result.Audit.push(
      check(
        "Idempotent CREATE audit uniqueness",
        duplicateCreate.length ? STATUS.FAIL : STATUS.PASS,
        Object.keys(successCreates).length,
        duplicateCreate.length
          ? "Duplicate successful CREATE audits were detected for the same resource."
          : "No duplicate successful CREATE audit exists for a resource.",
        duplicateCreate,
        startedAt,
      ),
    );
    const auditableEntities = [
      "Product",
      "Partner",
      "PickupHeader",
      "Return",
      "Purchase",
      "Expense",
    ];
    const missingCreateAudit = [];
    auditableEntities.forEach((entityType) => {
      Object.keys(indexes[entityType] || {}).forEach((id) => {
        if (!successCreates[`${entityType}:${id}`]) missingCreateAudit.push(id);
      });
    });
    result.Audit.push(
      check(
        "Successful CREATE audit coverage",
        missingCreateAudit.length ? STATUS.WARN : STATUS.PASS,
        auditableEntities.length,
        missingCreateAudit.length
          ? `${missingCreateAudit.length} resources have no successful CREATE audit and are classified as legacy/unprotected for manual review.`
          : "Auditable business resources have one successful CREATE audit.",
        missingCreateAudit,
        startedAt,
      ),
    );
    const rollbackFailures = rows.filter(
      (row) =>
        row.Status === "FAILURE" &&
        /ROLLBACK/i.test(`${row.Action} ${row.Message} ${row.ErrorMessage}`),
    );
    const falseSuccess = rows.filter(
      (row) =>
        row.Status === "SUCCESS" &&
        /ROLLBACK_FAILURE/i.test(`${row.Message} ${row.ErrorMessage}`),
    );
    const rollbackSourceVisible =
      /TRANSACTION_ROLLBACK_FAILURE/.test(String(TransactionService.create)) &&
      /RETURN_ROLLBACK_FAILURE/.test(String(ReturnService));
    result.Audit.push(
      check(
        "Rollback failure visibility",
        falseSuccess.length || !rollbackSourceVisible
          ? STATUS.FAIL
          : STATUS.PASS,
        rollbackFailures.length,
        falseSuccess.length
          ? `${falseSuccess.length} rollback failures are incorrectly marked SUCCESS.`
          : `${rollbackFailures.length} persisted rollback failures are distinguishable; Transaction and Return source markers are present.`,
        falseSuccess,
        startedAt,
      ),
    );
    const controllerAudit = CONTROLLER_ENDPOINTS.filter(
      (name) =>
        runtimeFunctionExists(name) &&
        /(?:AuditLogService|AppLogService|LogsService\.(?:record|bestEffort)|BaseService\.auditMutation)/.test(
          String(runtimeFunction(name)),
        ),
    );
    result.Audit.push(
      check(
        "Mutation audit ownership boundary",
        controllerAudit.length ? STATUS.FAIL : STATUS.PASS,
        CONTROLLER_ENDPOINTS.length,
        controllerAudit.length
          ? "Controller endpoints duplicate Service-owned mutation audit writes."
          : "Controller endpoints contain no mutation audit writes; Services retain ownership.",
        controllerAudit,
        startedAt,
      ),
    );
  }

  function cacheHealth(result) {
    const startedAt = Date.now();
    const writerSource = [
      RepositoryWriter.insert,
      RepositoryWriter.insertMany,
      RepositoryWriter.update,
      RepositoryWriter.replace,
      RepositoryWriter.rollbackInsert,
    ]
      .map(String)
      .join("\n");
    const transactionSource = String(TransactionService.create);
    const returnSource = String(ReturnService);
    const canonicalKey = /IPS:\$\{schema\.TABLE\}:v1/.test(
      String(RepositoryCache.key),
    );
    result.Cache.push(
      check(
        "Business cache key namespace",
        canonicalKey ? STATUS.PASS : STATUS.FAIL,
        canonicalKey ? 1 : 0,
        canonicalKey
          ? "Cache keys derive from current schema table names."
          : "Cache key does not derive from schema.TABLE.",
        [],
        startedAt,
      ),
    );
    result.Cache.push(
      check(
        "Writer mutation invalidation",
        (writerSource.match(/RepositoryCache\.clear\(schema\)/g) || [])
          .length >= 5
          ? STATUS.PASS
          : STATUS.FAIL,
        5,
        "Insert, batch insert, update, replace, and rollback insert invalidate their affected schema cache.",
        [],
        startedAt,
      ),
    );
    result.Cache.push(
      check(
        "Compound rollback invalidation",
        /clearMutationCaches/.test(transactionSource) &&
          /ROLLBACK/.test(transactionSource)
          ? STATUS.PASS
          : STATUS.FAIL,
        2,
        "Header/detail transaction rollback uses dependency-wide cache invalidation.",
        [],
        startedAt,
      ),
    );
    result.Cache.push(
      check(
        "Return dependency cache coherence",
        (returnSource.match(/RepositoryCache\.clear\(RETURN_SCHEMA\)/g) || [])
          .length >= 2
          ? STATUS.PASS
          : STATUS.FAIL,
        1,
        "Return mutations and rollback paths invalidate Return cache state.",
        [],
        startedAt,
      ),
    );
    const cacheIsolated = !/Repository(?:Cache|Reader)|CacheService/.test(
      [capture, run].map(String).join("\n"),
    );
    result.Cache.push(
      check(
        "Health-check cache isolation",
        cacheIsolated ? STATUS.PASS : STATUS.FAIL,
        cacheIsolated ? 1 : 0,
        "Health capture reads physical sheets directly through Database and does not use application cache.",
        [],
        startedAt,
      ),
    );
    const replayContract =
      typeof IDEMPOTENCY_CONTRACT_TESTS !== "undefined" &&
      IDEMPOTENCY_CONTRACT_TESTS.some(
        (test) => test.name === "testIdempotencyCommittedReplaySkipsMutation",
      );
    result.Cache.push(
      check(
        "Idempotent replay cache stability contract",
        replayContract ? STATUS.PASS : STATUS.FAIL,
        replayContract ? 1 : 0,
        replayContract
          ? "Committed replay is covered by the write-free idempotency contract test."
          : "Committed replay write-free coverage is missing.",
        [],
        startedAt,
      ),
    );
  }

  function balancedBlock(source, start) {
    const open = source.indexOf("{", start);
    if (open < 0) return "";
    let depth = 0;
    let quote = "";
    let escaped = false;
    for (let index = open; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === quote) quote = "";
        continue;
      }
      if (character === "'" || character === '"' || character === "`") {
        quote = character;
        continue;
      }
      if (character === "{") depth += 1;
      if (character === "}" && --depth === 0)
        return source.slice(open, index + 1);
    }
    return "";
  }

  function functionSource(source, name) {
    const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(
      source,
    );
    return match ? balancedBlock(source, match.index) : "";
  }

  function publicNames(source) {
    const matches = Array.from(
      source.matchAll(/return Object\.freeze\(\{([\s\S]*?)\}\);/g),
    );
    if (!matches.length) return [];
    return unique(
      matches[matches.length - 1][1].match(/\b[A-Za-z_$][\w$]*\b/g) || [],
    );
  }

  function runtimeFunctionRegistry() {
    return Object.freeze({
      getDashboard: typeof getDashboard === "function" ? getDashboard : null,
      getSettings: typeof getSettings === "function" ? getSettings : null,
      updateSettingValue:
        typeof updateSettingValue === "function" ? updateSettingValue : null,
      resetSettingValue:
        typeof resetSettingValue === "function" ? resetSettingValue : null,
      listLogs: typeof listLogs === "function" ? listLogs : null,
      listLogsPage: typeof listLogsPage === "function" ? listLogsPage : null,
      getLogById: typeof getLogById === "function" ? getLogById : null,
      getLogsSummary:
        typeof getLogsSummary === "function" ? getLogsSummary : null,
      getProducts: typeof getProducts === "function" ? getProducts : null,
      getDeletedProducts:
        typeof getDeletedProducts === "function" ? getDeletedProducts : null,
      getProduct: typeof getProduct === "function" ? getProduct : null,
      createProduct: typeof createProduct === "function" ? createProduct : null,
      updateProduct: typeof updateProduct === "function" ? updateProduct : null,
      deleteProduct: typeof deleteProduct === "function" ? deleteProduct : null,
      restoreProduct:
        typeof restoreProduct === "function" ? restoreProduct : null,
      getPartners: typeof getPartners === "function" ? getPartners : null,
      getDeletedPartners:
        typeof getDeletedPartners === "function" ? getDeletedPartners : null,
      getPartner: typeof getPartner === "function" ? getPartner : null,
      createPartner: typeof createPartner === "function" ? createPartner : null,
      updatePartner: typeof updatePartner === "function" ? updatePartner : null,
      deletePartner: typeof deletePartner === "function" ? deletePartner : null,
      restorePartner:
        typeof restorePartner === "function" ? restorePartner : null,
      getPickups: typeof getPickups === "function" ? getPickups : null,
      getDeletedPickups:
        typeof getDeletedPickups === "function" ? getDeletedPickups : null,
      getPickup: typeof getPickup === "function" ? getPickup : null,
      createPickup: typeof createPickup === "function" ? createPickup : null,
      updatePickup: typeof updatePickup === "function" ? updatePickup : null,
      deletePickup: typeof deletePickup === "function" ? deletePickup : null,
      restorePickup: typeof restorePickup === "function" ? restorePickup : null,
      getReturns: typeof getReturns === "function" ? getReturns : null,
      getDeletedReturns:
        typeof getDeletedReturns === "function" ? getDeletedReturns : null,
      getReturn: typeof getReturn === "function" ? getReturn : null,
      createReturn: typeof createReturn === "function" ? createReturn : null,
      updateReturn: typeof updateReturn === "function" ? updateReturn : null,
      deleteReturn: typeof deleteReturn === "function" ? deleteReturn : null,
      restoreReturn: typeof restoreReturn === "function" ? restoreReturn : null,
      getPurchasing: typeof getPurchasing === "function" ? getPurchasing : null,
      getDeletedPurchasing:
        typeof getDeletedPurchasing === "function"
          ? getDeletedPurchasing
          : null,
      getPurchasingById:
        typeof getPurchasingById === "function" ? getPurchasingById : null,
      createPurchasing:
        typeof createPurchasing === "function" ? createPurchasing : null,
      updatePurchasing:
        typeof updatePurchasing === "function" ? updatePurchasing : null,
      deletePurchasing:
        typeof deletePurchasing === "function" ? deletePurchasing : null,
      restorePurchasing:
        typeof restorePurchasing === "function" ? restorePurchasing : null,
      getExpenses: typeof getExpenses === "function" ? getExpenses : null,
      getExpense: typeof getExpense === "function" ? getExpense : null,
      getDeletedExpenses:
        typeof getDeletedExpenses === "function" ? getDeletedExpenses : null,
      createExpense: typeof createExpense === "function" ? createExpense : null,
      updateExpense: typeof updateExpense === "function" ? updateExpense : null,
      deleteExpense: typeof deleteExpense === "function" ? deleteExpense : null,
      restoreExpense:
        typeof restoreExpense === "function" ? restoreExpense : null,
      runApplicationHealthCheckTests:
        typeof runApplicationHealthCheckTests === "function"
          ? runApplicationHealthCheckTests
          : null,
      runReleaseReadinessTests:
        typeof runReleaseReadinessTests === "function"
          ? runReleaseReadinessTests
          : null,
      runApplicationHealthCheckSummary:
        typeof runApplicationHealthCheckSummary === "function"
          ? runApplicationHealthCheckSummary
          : null,
      runApplicationHealthFailureDetails:
        typeof runApplicationHealthFailureDetails === "function"
          ? runApplicationHealthFailureDetails
          : null,
      runIdempotencyContractTests:
        typeof runIdempotencyContractTests === "function"
          ? runIdempotencyContractTests
          : null,
      runTransactionServiceContractTests:
        typeof runTransactionServiceContractTests === "function"
          ? runTransactionServiceContractTests
          : null,
      runPickupAtomicityTests:
        typeof runPickupAtomicityTests === "function"
          ? runPickupAtomicityTests
          : null,
      runReturnAtomicityTests:
        typeof runReturnAtomicityTests === "function"
          ? runReturnAtomicityTests
          : null,
      runReleaseFrontendIntegrationTests:
        typeof runReleaseFrontendIntegrationTests === "function"
          ? runReleaseFrontendIntegrationTests
          : null,
      runReleaseBackendContractTests:
        typeof runReleaseBackendContractTests === "function"
          ? runReleaseBackendContractTests
          : null,
      runReleaseMutationIntegrityTests:
        typeof runReleaseMutationIntegrityTests === "function"
          ? runReleaseMutationIntegrityTests
          : null,
    });
  }

  function runtimeFunction(name) {
    return runtimeFunctionRegistry()[name] || null;
  }

  function runtimeFunctionExists(name) {
    return typeof runtimeFunction(name) === "function";
  }

  function contractHealth(snapshot, result) {
    const startedAt = Date.now();
    const sources = snapshot.contractSources || {};
    const routeValues = Object.keys(ROUTES).map((key) => ROUTES[key]);
    const duplicateRoutes = routeValues.filter(
      (name, index) => routeValues.indexOf(name) !== index,
    );
    const missingViews = routeValues.filter((name) => !sources[name]);
    result.Routes.push(
      check(
        "Registered route uniqueness",
        duplicateRoutes.length ? STATUS.FAIL : STATUS.PASS,
        routeValues.length,
        duplicateRoutes.length
          ? "Duplicate route targets are registered."
          : `${routeValues.length} unique route targets are registered.`,
        duplicateRoutes,
        startedAt,
      ),
    );
    result.Routes.push(
      check(
        "Registered route targets",
        missingViews.length ? STATUS.FAIL : STATUS.PASS,
        routeValues.length,
        missingViews.length
          ? `${missingViews.length} route targets could not be loaded.`
          : "Every registered route target exists.",
        missingViews,
        startedAt,
      ),
    );

    const missingEndpoints = CONTROLLER_ENDPOINTS.filter(
      (name) => !runtimeFunctionExists(name),
    );
    result.Contracts.push(
      check(
        "Controller endpoint resolution",
        missingEndpoints.length ? STATUS.FAIL : STATUS.PASS,
        CONTROLLER_ENDPOINTS.length,
        missingEndpoints.length
          ? `${missingEndpoints.length} Controller endpoints are missing.`
          : `${CONTROLLER_ENDPOINTS.length} Controller endpoints resolve.`,
        missingEndpoints,
        startedAt,
      ),
    );

    const api = sources["965.View.API"] || "";
    const app = sources["970.View.App"] || "";
    const events = sources["980.View.Event"] || "";
    const frontendMissing = [];
    const appPublic = publicNames(app);
    Array.from(events.matchAll(/\bApp\.([A-Za-z_$][\w$]*)\s*\(/g)).forEach(
      (match) => {
        if (appPublic.indexOf(match[1]) < 0 || !functionSource(app, match[1]))
          frontendMissing.push(`App.${match[1]}`);
      },
    );
    Array.from(
      app.matchAll(/\bApi\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g),
    ).forEach((match) => {
      const namespace = new RegExp(
        `const\\s+${match[1]}\\s*=\\s*Object\\.freeze`,
      ).exec(api);
      if (
        !namespace ||
        !new RegExp(`\\b${match[2]}\\s*\\(`).test(
          balancedBlock(api, namespace.index),
        )
      )
        frontendMissing.push(`Api.${match[1]}.${match[2]}`);
    });
    const presenterFiles = {
      ProductsPresenter: "972.View.Products.Presenter",
      PartnersPresenter: "973.View.Partners.Presenter",
      PickupsPresenter: "974.View.Pickups.Presenter",
      ExpensesPresenter: "977.View.Expenses.Presenter",
      PurchasingPresenter: "978.View.Purchasing.Presenter",
      ReturnsPresenter: "979.View.Returns.Presenter",
      SettingsPresenter: "980.View.Settings.Presenter",
      LogsPresenter: "981.View.Logs.Presenter",
      DashboardPresenter: "971.View.Dashboard.Presenter",
    };
    Object.keys(presenterFiles).forEach((name) => {
      const presenterSource = sources[presenterFiles[name]] || "";
      const names = publicNames(presenterSource);
      Array.from(
        app.matchAll(
          new RegExp(`\\b${name}\\.([A-Za-z_$][\\w$]*)\\s*\\(`, "g"),
        ),
      ).forEach((match) => {
        if (names.indexOf(match[1]) < 0)
          frontendMissing.push(`${name}.${match[1]}`);
      });
    });
    const presenterOrchestration = Object.keys(presenterFiles).filter((name) =>
      /\b(?:Api\.|google\.script\.run|async\s+function|new\s+Promise|App\.|addEventListener\s*\()/.test(
        sources[presenterFiles[name]] || "",
      ),
    );
    result.Contracts.push(
      check(
        "Presenter render-only boundary",
        presenterOrchestration.length ? STATUS.FAIL : STATUS.PASS,
        Object.keys(presenterFiles).length,
        presenterOrchestration.length
          ? "Presenter orchestration or transport access was detected."
          : "Presenters remain render-only and orchestration-free.",
        presenterOrchestration,
        startedAt,
      ),
    );
    const endpoints = Array.from(
      api.matchAll(/\brun\("([A-Za-z_$][\w$]*)"/g),
      (match) => match[1],
    );
    endpoints.forEach((name) => {
      if (!runtimeFunctionExists(name))
        frontendMissing.push(`Controller.${name}`);
    });
    result.Contracts.push(
      check(
        "Frontend/backend method resolution",
        frontendMissing.length ? STATUS.FAIL : STATUS.PASS,
        appPublic.length + endpoints.length,
        frontendMissing.length
          ? `${unique(frontendMissing).length} Event/App/API/Presenter/Controller methods are unresolved.`
          : "Event, App, API, Presenter, and Controller calls resolve.",
        frontendMissing,
        startedAt,
      ),
    );
    const rawGoogle = Object.keys(sources).filter(
      (name) =>
        name !== "965.View.API" &&
        /google\.script\.run/.test(sources[name] || ""),
    );
    result.Contracts.push(
      check(
        "Frontend transport boundary",
        rawGoogle.length ? STATUS.FAIL : STATUS.PASS,
        Object.keys(sources).length,
        rawGoogle.length
          ? "Raw google.script.run exists outside the API wrapper."
          : "Raw google.script.run is confined to the API wrapper.",
        rawGoogle,
        startedAt,
      ),
    );
    const directBackend = Object.keys(sources).filter((name) =>
      /\b(?:SpreadsheetApp|Repository(?:Base|Reader|Writer|Cache)|(?:Product|Partner|Pickup|Return|Purchasing|Expense|Settings|Dashboard|Logs|Base|Transaction)Service)\b/.test(
        sources[name] || "",
      ),
    );
    result.Contracts.push(
      check(
        "Frontend backend isolation",
        directBackend.length ? STATUS.FAIL : STATUS.PASS,
        Object.keys(sources).length,
        directBackend.length
          ? "Frontend source directly references a backend service, repository, or spreadsheet API."
          : "Frontend source has no direct Service/Repository/Spreadsheet access.",
        directBackend,
        startedAt,
      ),
    );

    const serviceContracts = [
      [
        "ProductService",
        ProductService(),
        [
          "findAll",
          "findById",
          "create",
          "update",
          "remove",
          "restore",
          "listDeleted",
        ],
      ],
      [
        "PartnerService",
        PartnerService(),
        [
          "findAll",
          "findById",
          "create",
          "update",
          "remove",
          "restore",
          "listDeleted",
        ],
      ],
      [
        "PickupService",
        PickupService(),
        [
          "findAll",
          "findById",
          "create",
          "update",
          "remove",
          "restore",
          "listDeleted",
        ],
      ],
      [
        "ReturnService",
        ReturnService(),
        [
          "findAll",
          "findById",
          "create",
          "update",
          "remove",
          "restore",
          "findDeleted",
        ],
      ],
      [
        "PurchasingService",
        PurchasingService(),
        [
          "findAll",
          "findById",
          "create",
          "update",
          "remove",
          "restore",
          "findDeleted",
        ],
      ],
      [
        "ExpenseService",
        ExpenseService(),
        [
          "findAll",
          "findById",
          "create",
          "update",
          "remove",
          "restore",
          "findDeleted",
        ],
      ],
      [
        "SettingsService",
        SettingsService(),
        ["listResolved", "updateValue", "resetToDefault"],
      ],
      ["DashboardService", DashboardService(), ["getDashboard"]],
    ];
    const missingServiceMethods = [];
    serviceContracts.forEach(([name, service, methods]) =>
      methods.forEach((method) => {
        if (!service || typeof service[method] !== "function")
          missingServiceMethods.push(`${name}.${method}`);
      }),
    );
    result.Contracts.push(
      check(
        "Controller Service method resolution",
        missingServiceMethods.length ? STATUS.FAIL : STATUS.PASS,
        serviceContracts.length,
        missingServiceMethods.length
          ? `${missingServiceMethods.length} Service methods are unresolved.`
          : "Controller-facing Service methods resolve.",
        missingServiceMethods,
        startedAt,
      ),
    );
  }

  function testAndReleaseHealth(result) {
    const startedAt = Date.now();
    const missingRunners = REQUIRED_RUNNERS.filter(
      (name) => !runtimeFunctionExists(name),
    );
    result.Tests.push(
      check(
        "Required focused runner registration",
        missingRunners.length ? STATUS.FAIL : STATUS.PASS,
        REQUIRED_RUNNERS.length,
        missingRunners.length
          ? `${missingRunners.length} required runners are missing.`
          : "Required focused runners are registered.",
        missingRunners,
        startedAt,
      ),
    );
    const tests =
      typeof APPLICATION_HEALTH_TESTS === "undefined"
        ? []
        : APPLICATION_HEALTH_TESTS;
    const names = tests.map((test) => test.name);
    const duplicates = names.filter(
      (name, index) => names.indexOf(name) !== index,
    );
    result.Tests.push(
      check(
        "Health test registration uniqueness",
        duplicates.length ? STATUS.FAIL : STATUS.PASS,
        names.length,
        duplicates.length
          ? "Health tests are registered more than once."
          : "Health tests are registered exactly once within the health suite.",
        duplicates,
        startedAt,
      ),
    );
    const metadataReady =
      APP_CONFIG.VERSION === "1.0.0-rc.1" &&
      APP_CONFIG.BUILD === "Release Candidate 1";
    result.Release.push(
      check(
        "Release metadata",
        metadataReady ? STATUS.PASS : STATUS.WARN,
        2,
        metadataReady
          ? "Release-candidate version and build metadata are applied."
          : `Current metadata is ${APP_CONFIG.VERSION} / ${APP_CONFIG.BUILD}; apply 1.0.0-rc.1 / Release Candidate 1 only after runtime acceptance.`,
        [],
        startedAt,
      ),
    );
  }

  function evaluate(snapshot, options = {}) {
    const startedAt = Date.now();
    const result = {};
    const sectionDurationMs = {};
    SECTIONS.forEach((section) => {
      result[section] = [];
    });
    const applicationStarted = Date.now();
    result.Application.push(
      check(
        "Application identity",
        APP_CONFIG.NAME === "IP-Starling" ? STATUS.PASS : STATUS.FAIL,
        1,
        `${APP_CONFIG.NAME} ${APP_CONFIG.VERSION} (${APP_CONFIG.BUILD}).`,
        [],
        startedAt,
      ),
    );
    result.Application.push(
      check(
        "Read-only snapshot",
        STATUS.PASS,
        Object.keys(snapshot.sheets || {}).length,
        `Captured ${snapshot.sheetReadCount || 0} sheets with ${snapshot.getValuesCount || 0} batched getValues operations.`,
        [],
        startedAt,
      ),
    );
    sectionDurationMs.Application = elapsed(applicationStarted);
    let sectionStarted = Date.now();
    schemaHealth(snapshot, result);
    sectionDurationMs.Schemas = sectionDurationMs.Sheets =
      elapsed(sectionStarted);
    sectionStarted = Date.now();
    idHealth(snapshot, result);
    sectionDurationMs.IDs = elapsed(sectionStarted);
    sectionStarted = Date.now();
    relationshipHealth(snapshot, result);
    sectionDurationMs.Relationships = elapsed(sectionStarted);
    sectionStarted = Date.now();
    idempotencyHealth(
      snapshot,
      result,
      options.nowMs || snapshot.capturedAt || Date.now(),
    );
    sectionDurationMs.Idempotency = elapsed(sectionStarted);
    sectionStarted = Date.now();
    auditHealth(snapshot, result);
    sectionDurationMs.Audit = elapsed(sectionStarted);
    sectionStarted = Date.now();
    cacheHealth(result);
    sectionDurationMs.Cache = elapsed(sectionStarted);
    sectionStarted = Date.now();
    contractHealth(snapshot, result);
    sectionDurationMs.Routes = sectionDurationMs.Contracts =
      elapsed(sectionStarted);
    sectionStarted = Date.now();
    testAndReleaseHealth(result);
    sectionDurationMs.Tests = sectionDurationMs.Release =
      elapsed(sectionStarted);
    const checks = SECTIONS.reduce(
      (all, section) => all.concat(result[section]),
      [],
    );
    const status = worst(checks.map((item) => item.status));
    const counts = checks.reduce(
      (summary, item) => {
        summary[item.status] += 1;
        return summary;
      },
      { PASS: 0, WARN: 0, FAIL: 0 },
    );
    const performance = Object.assign({}, snapshot.performance || {}, {
      sectionDurationMs,
    });
    return Object.freeze({
      status,
      counts,
      durationMs: elapsed(startedAt),
      generatedAt: new Date(
        options.nowMs || snapshot.capturedAt || Date.now(),
      ).toISOString(),
      sections: result,
      performance,
    });
  }

  function frontendNames() {
    return unique(
      Object.keys(ROUTES)
        .map((key) => ROUTES[key])
        .concat([
          "900.View.Index",
          "905.View.Layout",
          "910.View.Sidebar",
          "955.View.Modal",
          "965.View.API",
          "969.View.Pagination",
          "970.View.App",
          "971.View.Dashboard.Presenter",
          "972.View.Products.Presenter",
          "973.View.Partners.Presenter",
          "974.View.Pickups.Presenter",
          "975.View.Render",
          "976.View.Shared.Presenter",
          "977.View.Expenses.Presenter",
          "978.View.Purchasing.Presenter",
          "979.View.Returns.Presenter",
          "980.View.Event",
          "980.View.Settings.Presenter",
          "981.View.Logs.Presenter",
          "985.View.DOM",
          "986.View.Format",
          "989.View.Utils",
          "981.View.Products.Form",
          "982.View.Products.Validator",
          "984.View.Partners.Form",
          "985.View.Partners.Validator",
          "987.View.Components",
          "988.View.Modal",
          "990.Framework.CrudState",
          "991.View.Dialog",
          "992.View.Toast",
        ]),
    );
  }

  function capture() {
    const startedAt = Date.now();
    const spreadsheet = Database.spreadsheet();
    const snapshot = {
      capturedAt: Date.now(),
      todayCode: Utilities.formatDate(
        new Date(),
        APP_CONFIG.TIMEZONE,
        "yyMMdd",
      ),
      sheets: {},
      sequences: {},
      contractSources: {},
      rowCounts: {},
      sheetReadCount: 0,
      getValuesCount: 0,
    };
    schemas().forEach(({ schema }) => {
      const sheet = spreadsheet.getSheetByName(schema.TABLE);
      if (!sheet) {
        snapshot.sheets[schema.TABLE] = { exists: false, values: [] };
        return;
      }
      const values = sheet.getDataRange().getValues();
      snapshot.sheets[schema.TABLE] = { exists: true, values };
      snapshot.rowCounts[schema.TABLE] = Math.max(0, values.length - 1);
      snapshot.sheetReadCount += 1;
      snapshot.getValuesCount += 1;
    });
    BUSINESS_SCHEMA_KEYS.forEach((key) => {
      snapshot.sequences[SCHEMA[key].ID_PREFIX] = IDGenerator.current(
        SCHEMA[key].ID_PREFIX,
      );
    });
    frontendNames().forEach((name) => {
      try {
        snapshot.contractSources[name] =
          HtmlService.createHtmlOutputFromFile(name).getContent();
      } catch (error) {
        snapshot.contractSources[name] = "";
      }
    });
    const largestDataset = Object.keys(snapshot.rowCounts).reduce(
      (largest, table) =>
        snapshot.rowCounts[table] > largest.rows
          ? { table, rows: snapshot.rowCounts[table] }
          : largest,
      { table: "", rows: 0 },
    );
    snapshot.performance = {
      sheetReadCount: snapshot.sheetReadCount,
      getValuesCount: snapshot.getValuesCount,
      expectedMaximumSheetReads: schemas().length,
      duplicateSchemaReads: 0,
      sourceReadCount: Object.keys(snapshot.contractSources).length,
      duplicateSourceReads: 0,
      rowsBySheet: snapshot.rowCounts,
      largestDataset,
      cacheReads: 0,
      cacheWrites: 0,
      auditWrites: 0,
      businessWrites: 0,
      flushCalls: 0,
      captureDurationMs: elapsed(startedAt),
    };
    return snapshot;
  }

  function run(options = {}) {
    const snapshot = options.snapshot || capture();
    return evaluate(snapshot, options);
  }

  function findings(report) {
    const result = [];
    SECTIONS.forEach((section) => {
      (report.sections[section] || []).forEach((item) => {
        if (item.status === STATUS.FAIL || item.status === STATUS.WARN)
          result.push({ section, item });
      });
    });
    return result.sort(
      (left, right) =>
        STATUS_WEIGHT[right.item.status] - STATUS_WEIGHT[left.item.status] ||
        left.section.localeCompare(right.section) ||
        left.item.name.localeCompare(right.item.name),
    );
  }

  function boundedText(value, maximum = SUMMARY_MAX_DIAGNOSTIC) {
    const text = String(value || "")
      .replace(/\s+/g, " ")
      .trim();
    return text.length <= maximum
      ? text
      : `${text.slice(0, Math.max(0, maximum - 14))}...[TRUNCATED]`;
  }

  function summary(report, options = {}) {
    const maxIds = Math.max(1, Number(options.maxIds) || SUMMARY_MAX_IDS);
    const maxDiagnostic = Math.max(
      80,
      Number(options.maxDiagnostic) || SUMMARY_MAX_DIAGNOSTIC,
    );
    const currentFindings = findings(report);
    const lines = [
      "APPLICATION HEALTH SUMMARY",
      `Status: ${report.status}`,
      `PASS: ${report.counts.PASS}`,
      `WARN: ${report.counts.WARN}`,
      `FAIL: ${report.counts.FAIL}`,
      `Duration: ${report.durationMs} ms`,
    ];
    [STATUS.FAIL, STATUS.WARN].forEach((status) => {
      const selected = currentFindings.filter(
        (entry) => entry.item.status === status,
      );
      if (!selected.length) return;
      lines.push("", status);
      selected.forEach(({ section, item }) => {
        lines.push(`[${section}] ${item.name}`);
        lines.push(
          `Count: ${item.affectedCount == null ? item.count : item.affectedCount}`,
        );
        lines.push(
          `Diagnostic: ${boundedText(item.diagnostic, maxDiagnostic)}`,
        );
        const ids = (item.affectedIds || []).slice(0, maxIds);
        const totalIds =
          item.affectedCount == null
            ? (item.affectedIds || []).length
            : item.affectedCount;
        lines.push(
          `Affected IDs: ${ids.length ? ids.join(", ") : "none"}${totalIds > ids.length ? ` (+${totalIds - ids.length} more)` : ""}`,
        );
      });
    });
    return Object.freeze({
      status: report.status,
      counts: report.counts,
      durationMs: report.durationMs,
      findings: currentFindings,
      text: lines.join("\n"),
    });
  }

  function genericFindingClassification(section, item) {
    if (item.status === STATUS.FAIL)
      return ["Contracts", "Routes", "Cache", "Tests"].indexOf(section) >= 0
        ? "CODE_OR_CONTRACT_DEFECT"
        : "REAL_DATA_DEFECT";
    if (
      section === "Release" ||
      /expired|pending reservations/i.test(item.name)
    )
      return "APPROVED_OPERATIONAL_WARNING";
    if (
      /ID format|historical|audit coverage|audit actors/i.test(
        `${item.name} ${item.diagnostic}`,
      )
    )
      return "LEGACY_COMPATIBILITY";
    return "APPROVED_OPERATIONAL_WARNING";
  }

  function issuesForFinding(snapshot, section, item) {
    const schemaMatch = /^([A-Z_]+):\s/.exec(item.name);
    if (section === "Schemas" && schemaMatch && SCHEMA[schemaMatch[1]]) {
      const key = schemaMatch[1];
      const schema = SCHEMA[key];
      const all = schemaFieldIssues(snapshot, key, schema);
      if (/required and bounded fields$/.test(item.name))
        return all.filter(
          (issue) =>
            issue.reason === "required blank" ||
            issue.reason === "exceeds max length",
        );
      if (/audit actors$/.test(item.name))
        return all.filter((issue) => issue.reason === "actor blank");
      if (/required timestamps$/.test(item.name))
        return all.filter((issue) => issue.reason === "invalid format");
      if (/lifecycle flags$/.test(item.name))
        return all.filter(
          (issue) =>
            [schema.SYSTEM.IS_DELETED, schema.SYSTEM.IS_ACTIVE].indexOf(
              issue.field,
            ) >= 0,
        );
      if (/numeric constraints$/.test(item.name))
        return all.filter(
          (issue) =>
            issue.reason === "invalid type" || issue.reason === "below minimum",
        );
    }
    if (
      section === "IDs" &&
      schemaMatch &&
      SCHEMA[schemaMatch[1]] &&
      /ID format$/.test(item.name)
    ) {
      const key = schemaMatch[1];
      const schema = SCHEMA[key];
      return physicalRows(snapshot, schema)
        .filter(
          (row) =>
            idClassification(schema, row[schema.PRIMARY_KEY]) !== "CANONICAL",
        )
        .map((row) => ({
          schema: key,
          table: schema.TABLE,
          recordId: String(
            row[schema.PRIMARY_KEY] || `${schema.TABLE}:${row.__row}`,
          ),
          rowNumber: row.__row,
          field: schema.PRIMARY_KEY,
          severity: item.status,
          classification:
            idClassification(schema, row[schema.PRIMARY_KEY]) ===
            "LEGACY_FIXTURE"
              ? "LEGACY_COMPATIBILITY"
              : "REAL_DATA_DEFECT",
          valueClassification: idClassification(
            schema,
            row[schema.PRIMARY_KEY],
          ),
          reason: "invalid format",
        }));
    }
    return (item.affectedIds || []).map((id) => ({
      recordId: String(id),
      field: "RELATED_RECORD",
      severity: item.status,
      classification: genericFindingClassification(section, item),
      valueClassification: "AFFECTED_ID",
      reason: boundedText(item.diagnostic, 300),
    }));
  }

  function failureDetails(snapshot, report, options = {}) {
    const maxRecords = Math.max(
      1,
      Number(options.maxRecordsPerCheck) || DETAIL_MAX_RECORDS_PER_CHECK,
    );
    const maxIssues = Math.max(
      1,
      Number(options.maxIssuesPerRecord) || DETAIL_MAX_ISSUES_PER_RECORD,
    );
    const groups = findings(report).map(({ section, item }) => {
      const allIssues = issuesForFinding(snapshot, section, item);
      const recordIds = unique(allIssues.map((issue) => issue.recordId)).slice(
        0,
        maxRecords,
      );
      const issues = [];
      recordIds.forEach((recordId) =>
        issues.push(
          ...allIssues
            .filter((issue) => issue.recordId === recordId)
            .slice(0, maxIssues),
        ),
      );
      return Object.freeze({
        section,
        status: item.status,
        check: item.name,
        count: item.affectedCount == null ? item.count : item.affectedCount,
        diagnostic: boundedText(item.diagnostic),
        totalEvidence: allIssues.length,
        omittedEvidence: Math.max(0, allIssues.length - issues.length),
        issues,
      });
    });
    return Object.freeze({ status: report.status, groups });
  }

  function formatFailureDetails(details) {
    const lines = [
      "APPLICATION HEALTH FAILURE DETAILS",
      `Status: ${details.status}`,
    ];
    details.groups.forEach((group) => {
      lines.push("", `${group.status} [${group.section}] ${group.check}`);
      lines.push(`Count: ${group.count}`);
      lines.push(`Diagnostic: ${boundedText(group.diagnostic)}`);
      if (!group.issues.length)
        lines.push(
          "Evidence: no record IDs were exposed by this aggregate finding.",
        );
      group.issues.forEach((issue) => {
        const row = issue.rowNumber ? ` row=${issue.rowNumber}` : "";
        lines.push(
          `- ID=${issue.recordId}${row} field=${issue.field} value=${issue.valueClassification} reason=${issue.reason} classification=${issue.classification}`,
        );
      });
      if (group.omittedEvidence)
        lines.push(`Evidence omitted by bound: ${group.omittedEvidence}`);
    });
    return lines.join("\n");
  }

  function fixtureSnapshot(rowsByTable = {}, missingTables = [], options = {}) {
    const snapshot = {
      capturedAt: options.nowMs || Date.now(),
      todayCode: options.todayCode || "260726",
      sheets: {},
      sequences: options.sequences || {},
      contractSources: options.contractSources || {},
      sheetReadCount: 0,
      getValuesCount: 0,
      performance: {
        sheetReadCount: 0,
        getValuesCount: 0,
        duplicateSchemaReads: 0,
        cacheReads: 0,
        cacheWrites: 0,
        auditWrites: 0,
        businessWrites: 0,
      },
    };
    schemas().forEach(({ schema }) => {
      if (missingTables.indexOf(schema.TABLE) >= 0) {
        snapshot.sheets[schema.TABLE] = { exists: false, values: [] };
        return;
      }
      const rows = rowsByTable[schema.TABLE] || [];
      snapshot.sheets[schema.TABLE] = {
        exists: true,
        values: [schema.HEADERS.slice()].concat(
          rows.map((row) =>
            schema.HEADERS.map((header) =>
              Object.prototype.hasOwnProperty.call(row, header)
                ? row[header]
                : "",
            ),
          ),
        ),
      };
    });
    return snapshot;
  }

  function sourceForSafetyReview() {
    return [
      capture,
      run,
      summary,
      failureDetails,
      formatFailureDetails,
      schemaHealth,
      schemaFieldIssues,
      idHealth,
      relationshipHealth,
      idempotencyHealth,
      auditHealth,
    ]
      .map(String)
      .join("\n");
  }

  return Object.freeze({
    STATUS,
    SECTIONS,
    BUSINESS_SCHEMA_KEYS,
    INTERNAL_SCHEMA_KEYS,
    SUPPORTED_IDEMPOTENCY_OPERATIONS,
    CONTROLLER_ENDPOINTS,
    REQUIRED_RUNNERS,
    AUDIT_ACTOR_ENFORCEMENT_AT,
    evaluate,
    capture,
    run,
    summary,
    failureDetails,
    formatFailureDetails,
    fixtureSnapshot,
    sourceForSafetyReview,
    idClassification,
    schemaFieldIssues,
    runtimeFunctionRegistry,
  });
})();

function runApplicationHealthCheck() {
  const report = ApplicationHealth.run();
  Logger.log(JSON.stringify(report, null, 2));
  Logger.log(
    `APPLICATION HEALTH ${report.status} (${report.durationMs} ms; PASS=${report.counts.PASS}; WARN=${report.counts.WARN}; FAIL=${report.counts.FAIL})`,
  );
  return report;
}

function runApplicationHealthCheckSummary() {
  const report = ApplicationHealth.run();
  const compact = ApplicationHealth.summary(report);
  Logger.log(compact.text);
  return compact;
}

function runApplicationHealthFailureDetails() {
  const snapshot = ApplicationHealth.capture();
  const report = ApplicationHealth.evaluate(snapshot);
  const details = ApplicationHealth.failureDetails(snapshot, report);
  Logger.log(ApplicationHealth.formatFailureDetails(details));
  return details;
}
