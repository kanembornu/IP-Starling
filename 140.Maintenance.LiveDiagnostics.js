function purchasingAuditLog(level, message, data) {
  const suffix = data === undefined ? "" : ` ${JSON.stringify(data)}`;
  Logger.log(`${level}: ${message}${suffix}`);
}

function purchasingAuditBlank(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function purchasingAuditKey(value) {
  if (value instanceof Date) return value.toISOString();
  return purchasingAuditBlank(value) ? "" : String(value).trim();
}

function purchasingAuditStatus(value) {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string" && /^(true|false)$/i.test(value.trim())) {
    return "string-boolean";
  }
  if (typeof value === "number" && (value === 0 || value === 1)) {
    return "numeric-boolean";
  }
  return "other";
}

function purchasingAuditDeleted(value) {
  return (
    value === true ||
    value === 1 ||
    String(value).trim().toLowerCase() === "true"
  );
}

function purchasingAuditInactive(value) {
  return (
    value === false ||
    value === 0 ||
    String(value).trim().toLowerCase() === "false"
  );
}

function purchasingAuditIdPattern(value) {
  if (purchasingAuditBlank(value)) return "blank";
  const id = String(value).trim();
  const prefix = (id.match(/^[A-Za-z]+/) || [""])[0].toUpperCase();
  const suffix = id.slice(prefix.length);
  return `${prefix || "none"}-${/^\d+$/.test(suffix) ? "digits" : "mixed"}-len${id.length}`;
}

function purchasingAuditObjects(sheet) {
  const rowCount = sheet.getLastRow();
  const columnCount = sheet.getLastColumn();
  if (rowCount < 1 || columnCount < 1) {
    return { headers: [], rows: [], formulas: [] };
  }

  const range = sheet.getRange(1, 1, rowCount, columnCount);
  const values = range.getValues();
  const formulas = range.getFormulas();
  const headers = values[0].map((value) => String(value));
  const rows = [];
  values.slice(1).forEach((valuesRow, index) => {
    if (!valuesRow.some((value) => !purchasingAuditBlank(value))) return;
    const object = {};
    headers.forEach((header, column) => {
      if (header && !Object.prototype.hasOwnProperty.call(object, header)) {
        object[header] = valuesRow[column];
      }
    });
    rows.push({
      number: index + 2,
      object,
      values: valuesRow,
      formulas: formulas[index + 1],
    });
  });

  return { headers, rows };
}

function purchasingAuditMaster(spreadsheet, schema) {
  const sheet = spreadsheet.getSheetByName(schema.TABLE);
  if (!sheet) return { available: false, rows: Object.create(null) };

  const data = purchasingAuditObjects(sheet);
  const rows = Object.create(null);
  data.rows.forEach((entry) => {
    const id = purchasingAuditKey(entry.object[schema.PRIMARY_KEY]);
    if (id) rows[id] = entry.object;
  });
  return { available: true, rows };
}

function purchasingAuditHeaders(headers, target) {
  const counts = Object.create(null);
  headers.forEach((header) => {
    if (header) counts[header] = (counts[header] || 0) + 1;
  });
  const missing = target.filter((header) => !counts[header]);
  const extra = headers.filter(
    (header) => header && target.indexOf(header) === -1,
  );
  const duplicated = Object.keys(counts).filter((header) => counts[header] > 1);
  const blank = headers.reduce(
    (count, header) => count + (header === "" ? 1 : 0),
    0,
  );
  const reordered =
    missing.length === 0 &&
    extra.length === 0 &&
    duplicated.length === 0 &&
    blank === 0 &&
    JSON.stringify(headers) !== JSON.stringify(target);

  return {
    compatible: JSON.stringify(headers) === JSON.stringify(target),
    missing,
    extra,
    duplicated,
    reordered,
    blank,
  };
}

function purchasingAuditCandidate(sheet, masters, targetHeaders) {
  const data = purchasingAuditObjects(sheet);
  const header = purchasingAuditHeaders(data.headers, targetHeaders);
  const findings = {
    sheet: sheet.getName(),
    rowCount: data.rows.length,
    columnCount: sheet.getLastColumn(),
    headers: data.headers,
    header,
    blankIds: 0,
    duplicateIds: 0,
    invalidPrefix: 0,
    blankRequired: {
      Tanggal: 0,
      SupplierID: 0,
      ProductID: 0,
      Qty: 0,
      Harga: 0,
    },
    invalidQty: { nonnumeric: 0, nonfinite: 0, nonpositive: 0 },
    invalidHarga: { nonnumeric: 0, nonfinite: 0, negative: 0 },
    invalidTotal: { blank: 0, nonnumeric: 0, nonfinite: 0, negative: 0 },
    totalMismatches: 0,
    decimalToleranceUsed: false,
    totalFormulaCells: 0,
    totalMode: "value-only",
    statuses: {
      Deleted: {
        boolean: 0,
        "string-boolean": 0,
        "numeric-boolean": 0,
        other: 0,
      },
      IsActive: {
        boolean: 0,
        "string-boolean": 0,
        "numeric-boolean": 0,
        other: 0,
      },
    },
    supplier: {
      missing: 0,
      deleted: 0,
      inactive: 0,
      notSupplier: 0,
      observedTypes: {},
    },
    product: { missing: 0, deleted: 0, inactive: 0 },
    grouping: {
      sameMarkerGroups: 0,
      explicitHeaders: [],
      repeatedExplicitGroups: 0,
      noteSignals: 0,
      evidence: "NONE",
    },
    samples: [],
  };
  const ids = Object.create(null);
  const markerGroups = Object.create(null);
  const explicitHeaders = data.headers.filter((headerName) =>
    /^(invoice|invoice(no|number|id)|document|document(no|number|id)|purchase(no|number|id)|groupid)$/i.test(
      headerName.replace(/[\s_-]/g, ""),
    ),
  );
  const noteHeaders = data.headers.filter((headerName) =>
    /^(notes?|keterangan|catatan)$/i.test(headerName),
  );
  const explicitGroups = Object.create(null);
  findings.grouping.explicitHeaders = explicitHeaders;

  data.rows.forEach((entry) => {
    const row = entry.object;
    const id = purchasingAuditKey(row.ID);
    if (!id) findings.blankIds += 1;
    else {
      ids[id] = (ids[id] || 0) + 1;
      if (!/^PC/i.test(id)) findings.invalidPrefix += 1;
    }

    Object.keys(findings.blankRequired).forEach((field) => {
      if (purchasingAuditBlank(row[field])) findings.blankRequired[field] += 1;
    });

    const qty = Number(row.Qty);
    const harga = Number(row.Harga);
    const total = Number(row.Total);
    if (!purchasingAuditBlank(row.Qty) && Number.isNaN(qty))
      findings.invalidQty.nonnumeric += 1;
    else if (!purchasingAuditBlank(row.Qty) && !Number.isFinite(qty))
      findings.invalidQty.nonfinite += 1;
    else if (!purchasingAuditBlank(row.Qty) && qty <= 0)
      findings.invalidQty.nonpositive += 1;
    if (!purchasingAuditBlank(row.Harga) && Number.isNaN(harga))
      findings.invalidHarga.nonnumeric += 1;
    else if (!purchasingAuditBlank(row.Harga) && !Number.isFinite(harga))
      findings.invalidHarga.nonfinite += 1;
    else if (!purchasingAuditBlank(row.Harga) && harga < 0)
      findings.invalidHarga.negative += 1;
    if (purchasingAuditBlank(row.Total)) findings.invalidTotal.blank += 1;
    else if (Number.isNaN(total)) findings.invalidTotal.nonnumeric += 1;
    else if (!Number.isFinite(total)) findings.invalidTotal.nonfinite += 1;
    else if (total < 0) findings.invalidTotal.negative += 1;

    let totalMatches = false;
    if ([qty, harga, total].every(Number.isFinite)) {
      const expected = qty * harga;
      const decimals =
        !Number.isInteger(qty) ||
        !Number.isInteger(harga) ||
        !Number.isInteger(total);
      const tolerance = decimals
        ? 1e-9 * Math.max(1, Math.abs(expected), Math.abs(total))
        : 0;
      findings.decimalToleranceUsed = findings.decimalToleranceUsed || decimals;
      totalMatches = Math.abs(total - expected) <= tolerance;
      if (!totalMatches) findings.totalMismatches += 1;
    }

    const totalColumn = data.headers.indexOf("Total");
    if (totalColumn !== -1 && entry.formulas?.[totalColumn])
      findings.totalFormulaCells += 1;
    ["Deleted", "IsActive"].forEach((field) => {
      findings.statuses[field][purchasingAuditStatus(row[field])] += 1;
    });

    const supplierId = purchasingAuditKey(row.SupplierID);
    const supplier = supplierId && masters.partners.rows[supplierId];
    let supplierCategory = "ok";
    if (supplierId && !supplier) {
      findings.supplier.missing += 1;
      supplierCategory = "missing";
    } else if (supplier) {
      const type =
        purchasingAuditKey(supplier[PARTNER_FIELDS.TYPE]) || "(blank)";
      findings.supplier.observedTypes[type] =
        (findings.supplier.observedTypes[type] || 0) + 1;
      if (purchasingAuditDeleted(supplier[PARTNER_SCHEMA.SYSTEM.IS_DELETED])) {
        findings.supplier.deleted += 1;
        supplierCategory = "deleted";
      }
      if (purchasingAuditInactive(supplier[PARTNER_SCHEMA.SYSTEM.IS_ACTIVE])) {
        findings.supplier.inactive += 1;
        supplierCategory =
          supplierCategory === "ok" ? "inactive" : supplierCategory;
      }
      if (type.toLowerCase() !== "supplier") {
        findings.supplier.notSupplier += 1;
        supplierCategory =
          supplierCategory === "ok" ? "not-supplier" : supplierCategory;
      }
    }

    const productId = purchasingAuditKey(row.ProductID);
    const product = productId && masters.products.rows[productId];
    let productCategory = "ok";
    if (productId && !product) {
      findings.product.missing += 1;
      productCategory = "missing";
    } else if (product) {
      if (purchasingAuditDeleted(product[PRODUCT_SCHEMA.SYSTEM.IS_DELETED])) {
        findings.product.deleted += 1;
        productCategory = "deleted";
      }
      if (purchasingAuditInactive(product[PRODUCT_SCHEMA.SYSTEM.IS_ACTIVE])) {
        findings.product.inactive += 1;
        productCategory =
          productCategory === "ok" ? "inactive" : productCategory;
      }
    }

    const marker = [row.Tanggal, row.SupplierID, row.CreatedAt]
      .map(purchasingAuditKey)
      .join("|");
    if (marker !== "||") markerGroups[marker] = (markerGroups[marker] || 0) + 1;
    explicitHeaders.forEach((field) => {
      const value = purchasingAuditKey(row[field]);
      if (value)
        explicitGroups[`${field}|${value}`] =
          (explicitGroups[`${field}|${value}`] || 0) + 1;
    });
    noteHeaders.forEach((field) => {
      if (
        /\b(multi|multiple|several)\b.{0,30}\b(items?|products?|barang)\b/i.test(
          String(row[field] || ""),
        )
      ) {
        findings.grouping.noteSignals += 1;
      }
    });

    if (findings.samples.length < 3) {
      findings.samples.push({
        idPattern: purchasingAuditIdPattern(row.ID),
        types: {
          Tanggal: typeof row.Tanggal,
          Qty: typeof row.Qty,
          Harga: typeof row.Harga,
          Total: typeof row.Total,
        },
        blank: Object.keys(findings.blankRequired).filter((field) =>
          purchasingAuditBlank(row[field]),
        ),
        totalMatches,
        supplier: supplierCategory,
        product: productCategory,
      });
    }
  });

  findings.duplicateIds = Object.keys(ids).reduce(
    (count, id) => count + (ids[id] > 1 ? ids[id] : 0),
    0,
  );
  findings.grouping.sameMarkerGroups = Object.keys(markerGroups).filter(
    (key) => markerGroups[key] > 1,
  ).length;
  findings.grouping.repeatedExplicitGroups = Object.keys(explicitGroups).filter(
    (key) => explicitGroups[key] > 1,
  ).length;
  if (
    findings.grouping.repeatedExplicitGroups > 0 ||
    findings.grouping.noteSignals > 0
  ) {
    findings.grouping.evidence = "STRONG";
  } else if (
    findings.grouping.sameMarkerGroups > 0 ||
    explicitHeaders.length > 0
  ) {
    findings.grouping.evidence = "WEAK";
  }
  if (findings.totalFormulaCells === findings.rowCount && findings.rowCount > 0)
    findings.totalMode = "formula-backed";
  else if (findings.totalFormulaCells > 0) findings.totalMode = "mixed";
  return findings;
}

function auditExpenseLiveData() {
  const sampleLimit = 5;
  const log = (section, data) =>
    Logger.log(`${section}: ${JSON.stringify(data)}`);
  const blank = (value) =>
    value === null || value === undefined || String(value).trim() === "";
  const sample = (items, value) => {
    const safe =
      value instanceof Date
        ? value.toISOString()
        : String(value).replace(/\s+/g, " ").slice(0, 40);
    if (items.length < sampleLimit && items.indexOf(safe) === -1)
      items.push(safe);
  };
  const countDuplicates = (values) => {
    const counts = {};
    values.forEach((value) => {
      counts[value] = (counts[value] || 0) + 1;
    });
    return Object.keys(counts).reduce(
      (total, value) => total + (counts[value] > 1 ? counts[value] - 1 : 0),
      0,
    );
  };
  const statusSummary = () => ({
    booleanTrue: 0,
    booleanFalse: 0,
    stringTRUE: 0,
    stringFALSE: 0,
    numeric1: 0,
    numeric0: 0,
    blank: 0,
    other: 0,
  });
  const classifyStatus = (summary, value) => {
    if (blank(value)) summary.blank += 1;
    else if (value === true) summary.booleanTrue += 1;
    else if (value === false) summary.booleanFalse += 1;
    else if (typeof value === "string" && value.trim() === "TRUE")
      summary.stringTRUE += 1;
    else if (typeof value === "string" && value.trim() === "FALSE")
      summary.stringFALSE += 1;
    else if (typeof value === "number" && value === 1) summary.numeric1 += 1;
    else if (typeof value === "number" && value === 0) summary.numeric0 += 1;
    else summary.other += 1;
  };
  const logicalStatus = (value) => {
    if (
      value === true ||
      value === 1 ||
      (typeof value === "string" && value.trim().toUpperCase() === "TRUE")
    )
      return true;
    if (
      value === false ||
      value === 0 ||
      (typeof value === "string" && value.trim().toUpperCase() === "FALSE")
    )
      return false;
    return null;
  };
  const auditTimestamp = () => ({
    blank: 0,
    nativeDate: 0,
    parseableString: 0,
    invalid: 0,
  });
  const classifyTimestamp = (summary, value) => {
    if (blank(value)) summary.blank += 1;
    else if (value instanceof Date && !Number.isNaN(value.getTime()))
      summary.nativeDate += 1;
    else if (typeof value === "string" && !Number.isNaN(Date.parse(value)))
      summary.parseableString += 1;
    else summary.invalid += 1;
  };

  const schema = EXPENSE_SCHEMA;
  const expectedHeaders = schema.HEADERS.slice();
  const spreadsheet = Database.spreadsheet();
  const sheetNames = Database.sheetNames();
  const candidates = ["Expense", "Expenses"].map((name) => ({
    name,
    exists: sheetNames.indexOf(name) !== -1,
  }));
  const sheet = spreadsheet.getSheetByName(schema.TABLE);
  log("Expense sheet discovery", {
    configuredTable: schema.TABLE,
    configuredExists: Boolean(sheet),
    candidates,
  });

  if (!sheet) {
    const blocked = {
      assessment: "BLOCKED",
      reasons: [`Configured sheet ${schema.TABLE} does not exist.`],
      recommendations: {
        headerMigrationRequired: "UNKNOWN",
        rowDataCleanupRequired: "UNKNOWN",
        tanggalNormalizationNeeded: "UNKNOWN",
        nominalNormalizationNeeded: "UNKNOWN",
        decimalNominalValuesExist: "UNKNOWN",
        keteranganOperationallyOptional: "UNKNOWN",
        inactiveNonDeletedRowsExist: "UNKNOWN",
        safeControlledBackendFixturesNext: "NO",
      },
    };
    log("Compatibility assessment", blocked);
    return blocked;
  }

  const rowCount = Math.max(sheet.getLastRow() - 1, 0);
  const columnCount = sheet.getLastColumn();
  const values =
    columnCount > 0 && sheet.getLastRow() > 0
      ? sheet.getRange(1, 1, sheet.getLastRow(), columnCount).getValues()
      : [];
  const headers = values.length ? values[0].map((value) => String(value)) : [];
  const rows = values.slice(1);
  const duplicateHeaders = headers.filter(
    (header, index) => header && headers.indexOf(header) !== index,
  );
  const missingHeaders = expectedHeaders.filter(
    (header) => headers.indexOf(header) === -1,
  );
  const extraHeaders = headers.filter(
    (header) => expectedHeaders.indexOf(header) === -1,
  );
  const reorderedHeaders = expectedHeaders.filter(
    (header, index) =>
      headers.indexOf(header) !== -1 && headers[index] !== header,
  );
  const exactHeaders =
    JSON.stringify(headers) === JSON.stringify(expectedHeaders);
  const legacyNames = ["Amount", "Total", "Description", "Category", "Date"];
  const headerAudit = {
    sheetName: sheet.getName(),
    rowCount,
    columnCount,
    actualHeaders: headers,
    expectedHeaders,
    exactCompatibility: exactHeaders,
    missingHeaders,
    extraHeaders,
    duplicateHeaders: [...new Set(duplicateHeaders)],
    reorderedHeaders,
    legacyFieldEvidence: headers.filter(
      (header) => legacyNames.indexOf(header) !== -1,
    ),
  };
  log("Headers", headerAudit);

  const index = {};
  headers.forEach((header, column) => {
    if (index[header] === undefined) index[header] = column;
  });
  const get = (row, field) =>
    index[field] === undefined ? undefined : row[index[field]];
  const idAudit = {
    blank: 0,
    duplicate: 0,
    unique: 0,
    invalidPrefix: 0,
    malformed: 0,
    problematicSamples: [],
  };
  const ids = [];
  const dateAudit = {
    blank: 0,
    nativeDate: 0,
    yyyyMmDdString: 0,
    otherStringFormat: 0,
    invalidUnparseable: 0,
    earliestValidDate: null,
    latestValidDate: null,
    problematicSamples: [],
  };
  const categoryAudit = {
    blank: 0,
    trimmedEmpty: 0,
    over100: 0,
    distinct: 0,
    samples: [],
    leadingTrailingWhitespace: 0,
  };
  const descriptionAudit = {
    blank: 0,
    trimmedEmpty: 0,
    over255: 0,
    leadingTrailingWhitespace: 0,
    routinelyAbsent: false,
  };
  const amountAudit = {
    blank: 0,
    nativeNumber: 0,
    numericString: 0,
    nonnumeric: 0,
    nonFinite: 0,
    negative: 0,
    zero: 0,
    positive: 0,
    decimalFractional: 0,
    minimumValid: null,
    maximumValid: null,
    sumValidFinite: 0,
    problematicSamples: [],
  };
  const deletedAudit = statusSummary();
  const activeAudit = statusSummary();
  const rowGroups = {
    activeNonDeleted: 0,
    inactiveNonDeleted: 0,
    deleted: 0,
    ambiguousInvalidStatus: 0,
  };
  const createdAtAudit = auditTimestamp();
  const updatedAtAudit = auditTimestamp();
  const createdByAudit = { blank: 0, nonblank: 0 };
  const updatedByAudit = { blank: 0, nonblank: 0 };
  const distinctCategories = {};
  let earliest = null;
  let latest = null;

  rows.forEach((row) => {
    const id = get(row, "ID");
    if (blank(id)) idAudit.blank += 1;
    else {
      const normalized = String(id).trim();
      ids.push(normalized);
      if (normalized.indexOf(schema.ID_PREFIX) !== 0) {
        idAudit.invalidPrefix += 1;
        sample(idAudit.problematicSamples, normalized);
      }
      if (!new RegExp(`^${schema.ID_PREFIX}[A-Za-z0-9_-]+$`).test(normalized)) {
        idAudit.malformed += 1;
        sample(idAudit.problematicSamples, normalized);
      }
    }

    const dateValue = get(row, "Tanggal");
    let validDate = null;
    if (blank(dateValue)) dateAudit.blank += 1;
    else if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
      dateAudit.nativeDate += 1;
      validDate = dateValue;
    } else if (
      typeof dateValue === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim())
    ) {
      const parts = dateValue.trim().split("-").map(Number);
      const parsed = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      if (
        parsed.getUTCFullYear() === parts[0] &&
        parsed.getUTCMonth() === parts[1] - 1 &&
        parsed.getUTCDate() === parts[2]
      ) {
        dateAudit.yyyyMmDdString += 1;
        validDate = parsed;
      } else {
        dateAudit.invalidUnparseable += 1;
        sample(dateAudit.problematicSamples, dateValue);
      }
    } else if (
      typeof dateValue === "string" &&
      !Number.isNaN(Date.parse(dateValue))
    ) {
      dateAudit.otherStringFormat += 1;
      validDate = new Date(dateValue);
      sample(dateAudit.problematicSamples, dateValue);
    } else {
      dateAudit.invalidUnparseable += 1;
      sample(dateAudit.problematicSamples, dateValue);
    }
    if (validDate) {
      if (!earliest || validDate < earliest) earliest = validDate;
      if (!latest || validDate > latest) latest = validDate;
    }

    const category = get(row, "Kategori");
    if (category === null || category === undefined || category === "")
      categoryAudit.blank += 1;
    else {
      const text = String(category);
      if (text.trim() === "") categoryAudit.trimmedEmpty += 1;
      if (text.length > 100) categoryAudit.over100 += 1;
      if (text !== text.trim()) categoryAudit.leadingTrailingWhitespace += 1;
      if (text.trim()) {
        distinctCategories[text.trim()] = true;
        sample(categoryAudit.samples, text.trim());
      }
    }

    const description = get(row, "Keterangan");
    if (description === null || description === undefined || description === "")
      descriptionAudit.blank += 1;
    else {
      const text = String(description);
      if (text.trim() === "") descriptionAudit.trimmedEmpty += 1;
      if (text.length > 255) descriptionAudit.over255 += 1;
      if (text !== text.trim()) descriptionAudit.leadingTrailingWhitespace += 1;
    }

    const amount = get(row, "Nominal");
    let number = null;
    if (blank(amount)) amountAudit.blank += 1;
    else if (typeof amount === "number") {
      amountAudit.nativeNumber += 1;
      if (Number.isFinite(amount)) number = amount;
      else amountAudit.nonFinite += 1;
    } else if (
      typeof amount === "string" &&
      amount.trim() !== "" &&
      Number.isFinite(Number(amount))
    ) {
      amountAudit.numericString += 1;
      number = Number(amount);
    } else {
      amountAudit.nonnumeric += 1;
      sample(amountAudit.problematicSamples, amount);
    }
    if (number !== null) {
      if (number < 0) amountAudit.negative += 1;
      else if (number === 0) amountAudit.zero += 1;
      else amountAudit.positive += 1;
      if (!Number.isInteger(number)) amountAudit.decimalFractional += 1;
      amountAudit.minimumValid =
        amountAudit.minimumValid === null
          ? number
          : Math.min(amountAudit.minimumValid, number);
      amountAudit.maximumValid =
        amountAudit.maximumValid === null
          ? number
          : Math.max(amountAudit.maximumValid, number);
      amountAudit.sumValidFinite += number;
    }

    const deleted = get(row, "Deleted");
    const active = get(row, "IsActive");
    classifyStatus(deletedAudit, deleted);
    classifyStatus(activeAudit, active);
    const isDeleted = logicalStatus(deleted);
    const isActive = logicalStatus(active);
    if (isDeleted === null || isActive === null)
      rowGroups.ambiguousInvalidStatus += 1;
    else if (isDeleted) rowGroups.deleted += 1;
    else if (isActive) rowGroups.activeNonDeleted += 1;
    else rowGroups.inactiveNonDeleted += 1;

    classifyTimestamp(createdAtAudit, get(row, "CreatedAt"));
    classifyTimestamp(updatedAtAudit, get(row, "UpdatedAt"));
    if (blank(get(row, "CreatedBy"))) createdByAudit.blank += 1;
    else createdByAudit.nonblank += 1;
    if (blank(get(row, "UpdatedBy"))) updatedByAudit.blank += 1;
    else updatedByAudit.nonblank += 1;
  });

  idAudit.duplicate = countDuplicates(ids);
  idAudit.unique = [...new Set(ids)].length;
  dateAudit.earliestValidDate = earliest
    ? earliest.toISOString().slice(0, 10)
    : null;
  dateAudit.latestValidDate = latest ? latest.toISOString().slice(0, 10) : null;
  categoryAudit.distinct = Object.keys(distinctCategories).length;
  descriptionAudit.routinelyAbsent =
    rowCount > 0 &&
    (descriptionAudit.blank + descriptionAudit.trimmedEmpty) / rowCount >= 0.5;
  log("ID audit", idAudit);
  log("Tanggal audit", dateAudit);
  log("Kategori audit", categoryAudit);
  log("Keterangan audit", descriptionAudit);
  log("Nominal audit", amountAudit);
  log("Deleted and IsActive audit", {
    Deleted: deletedAudit,
    IsActive: activeAudit,
    logicalRowGroups: rowGroups,
  });
  log("Audit fields", {
    CreatedAt: createdAtAudit,
    UpdatedAt: updatedAtAudit,
    CreatedBy: createdByAudit,
    UpdatedBy: updatedByAudit,
  });

  const headerIssues = !exactHeaders;
  const dataIssues =
    idAudit.blank ||
    idAudit.duplicate ||
    idAudit.invalidPrefix ||
    idAudit.malformed ||
    dateAudit.blank ||
    dateAudit.otherStringFormat ||
    dateAudit.invalidUnparseable ||
    categoryAudit.blank ||
    categoryAudit.trimmedEmpty ||
    categoryAudit.over100 ||
    categoryAudit.leadingTrailingWhitespace ||
    descriptionAudit.blank ||
    descriptionAudit.trimmedEmpty ||
    descriptionAudit.over255 ||
    descriptionAudit.leadingTrailingWhitespace ||
    amountAudit.blank ||
    amountAudit.numericString ||
    amountAudit.nonnumeric ||
    amountAudit.nonFinite ||
    amountAudit.negative ||
    rowGroups.ambiguousInvalidStatus ||
    createdAtAudit.invalid ||
    updatedAtAudit.invalid;
  const schemaDecision = descriptionAudit.routinelyAbsent;
  const assessment = headerIssues
    ? "NEEDS_HEADER_MIGRATION"
    : schemaDecision
      ? "NEEDS_SCHEMA_DECISION"
      : dataIssues
        ? "NEEDS_DATA_CLEANUP"
        : "SAFE_TO_HARDEN";
  const result = {
    assessment,
    reasons: [
      ...(headerIssues ? ["Configured headers are not an exact match."] : []),
      ...(schemaDecision
        ? ["Keterangan is absent in at least half of live rows."]
        : []),
      ...(dataIssues
        ? ["One or more row-quality checks require cleanup."]
        : []),
    ],
    recommendations: {
      headerMigrationRequired: headerIssues ? "YES" : "NO",
      rowDataCleanupRequired: dataIssues ? "YES" : "NO",
      tanggalNormalizationNeeded:
        dateAudit.otherStringFormat || dateAudit.invalidUnparseable
          ? "YES"
          : "NO",
      nominalNormalizationNeeded:
        amountAudit.numericString ||
        amountAudit.nonnumeric ||
        amountAudit.nonFinite
          ? "YES"
          : "NO",
      decimalNominalValuesExist: amountAudit.decimalFractional ? "YES" : "NO",
      keteranganOperationallyOptional: descriptionAudit.routinelyAbsent
        ? "YES"
        : "NO",
      inactiveNonDeletedRowsExist: rowGroups.inactiveNonDeleted ? "YES" : "NO",
      safeControlledBackendFixturesNext:
        assessment === "SAFE_TO_HARDEN" ? "YES" : "NO",
    },
  };
  log("Compatibility assessment", result);
  return {
    ...result,
    sheetDiscovery: { configuredTable: schema.TABLE, candidates },
    headerAudit,
    idAudit,
    dateAudit,
    categoryAudit,
    descriptionAudit,
    amountAudit,
    statusAudit: {
      Deleted: deletedAudit,
      IsActive: activeAudit,
      logicalRowGroups: rowGroups,
    },
    auditFields: {
      CreatedAt: createdAtAudit,
      UpdatedAt: updatedAtAudit,
      CreatedBy: createdByAudit,
      UpdatedBy: updatedByAudit,
    },
  };
}

function diagnoseExpenseNominalCleanup() {
  const sheet = Database.spreadsheet().getSheetByName(EXPENSE_SCHEMA.TABLE);

  if (!sheet) {
    throw new Error(`Configured sheet ${EXPENSE_SCHEMA.TABLE} does not exist.`);
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const values = lastRow > 0 && lastColumn > 0
    ? sheet.getRange(1, 1, lastRow, lastColumn).getValues()
    : [];
  const formulas = lastRow > 0 && lastColumn > 0
    ? sheet.getRange(1, 1, lastRow, lastColumn).getFormulas()
    : [];
  const headers = values.length ? values[0].map(String) : [];
  const rows = values.slice(1);
  const formulaRows = formulas.slice(1);
  const index = {};

  headers.forEach((header, column) => {
    if (index[header] === undefined) index[header] = column;
  });

  const required = [
    "ID",
    "Deleted",
    "IsActive",
    "Tanggal",
    "Kategori",
    "Keterangan",
    "Nominal",
  ];
  const missing = required.filter((header) => index[header] === undefined);

  if (missing.length) {
    throw new Error(`Expense diagnostic missing headers: ${missing.join(", ")}`);
  }

  const summary = {
    totalPhysicalExpenseRows: rows.length,
    activeRows: 0,
    deletedRows: 0,
    validIntegerNumericRows: 0,
    zeroValueRows: 0,
    decimalRows: 0,
    numericStringRows: 0,
    formattedStringRows: 0,
    blankRows: 0,
    negativeRows: 0,
    nonnumericRows: 0,
    nonfiniteRows: 0,
    formulaCells: 0,
    rowsRequiringCleanup: 0,
    activeRowsRequiringCleanup: 0,
    deletedRowsRequiringCleanup: 0,
  };
  const findings = [];
  const logicalTrue = (value) =>
    value === true ||
    value === 1 ||
    String(value).trim().toUpperCase() === "TRUE";
  const parseFormatted = (value) => {
    let text = String(value).trim().replace(/\s+/g, "");
    text = text.replace(/^(?:Rp|IDR)/i, "");

    if (!/^[+-]?[\d.,]+$/.test(text)) return null;

    const comma = text.lastIndexOf(",");
    const dot = text.lastIndexOf(".");

    if (comma !== -1 && dot !== -1) {
      const decimalSeparator = comma > dot ? "," : ".";
      const groupingSeparator = decimalSeparator === "," ? "." : ",";
      text = text.split(groupingSeparator).join("");
      text = text.replace(decimalSeparator, ".");
    } else if (comma !== -1) {
      text = /^[-+]?\d{1,3}(?:,\d{3})+$/.test(text)
        ? text.replace(/,/g, "")
        : text.replace(",", ".");
    } else if (dot !== -1 && /^[-+]?\d{1,3}(?:\.\d{3})+$/.test(text)) {
      text = text.replace(/\./g, "");
    }

    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const classify = (raw, formula) => {
    const blank =
      raw === null ||
      raw === undefined ||
      (typeof raw === "string" && raw.trim() === "");

    if (blank) {
      return {
        category: "BLANK",
        parsed: null,
        cleanup: true,
        reason: "Nominal is blank.",
        action: "MANUALLY_ENTER_A_VALID_NUMBER",
      };
    }

    if (typeof raw === "number") {
      if (!Number.isFinite(raw)) {
        return {
          category: "NON_FINITE",
          parsed: raw,
          cleanup: true,
          reason: "Nominal is NaN or Infinity.",
          action: "MANUALLY_REPLACE_WITH_A_FINITE_NUMBER",
        };
      }
      if (raw < 0) {
        return {
          category: "NEGATIVE",
          parsed: raw,
          cleanup: true,
          reason: "Nominal is below zero.",
          action: "MANUALLY_CORRECT_THE_NEGATIVE_VALUE",
        };
      }
      if (raw === 0) {
        return {
          category: "VALID_ZERO",
          parsed: raw,
          cleanup: false,
          reason: "Nominal is the valid numeric value zero.",
          action: "NO_ACTION",
        };
      }
      if (!Number.isInteger(raw)) {
        return {
          category: formula ? "FORMULA_RESULT_DECIMAL" : "DECIMAL_NUMBER",
          parsed: raw,
          cleanup: false,
          reason: formula
            ? "Nominal is a formula result with a genuine decimal value."
            : "Nominal is a genuine decimal number.",
          action: formula
            ? "REVIEW_FORMULA_AND_BUSINESS_RULE_BEFORE_MANUAL_CHANGE"
            : "PRESERVE_PENDING_BUSINESS_DECISION_OR_MANUALLY_CORRECT_OR_ROUND",
        };
      }
      return {
        category: "VALID_INTEGER_NUMBER",
        parsed: raw,
        cleanup: false,
        reason: "Nominal is a valid integer number.",
        action: "NO_ACTION",
      };
    }

    if (typeof raw === "string") {
      const text = raw.trim();
      const parsed = Number(text);

      if (/^[+-]?(?:Infinity|NaN)$/i.test(text)) {
        return {
          category: "NON_FINITE",
          parsed,
          cleanup: true,
          reason: "Nominal text represents a non-finite numeric value.",
          action: "MANUALLY_REPLACE_WITH_A_FINITE_NUMBER",
        };
      }

      if (Number.isFinite(parsed)) {
        if (parsed < 0) {
          return {
            category: "NEGATIVE",
            parsed,
            cleanup: true,
            reason: "Nominal is a negative numeric string.",
            action: "MANUALLY_CORRECT_AND_STORE_AS_A_NUMBER",
          };
        }
        return {
          category: Number.isInteger(parsed)
            ? "NUMERIC_STRING_INTEGER"
            : "NUMERIC_STRING_DECIMAL",
          parsed,
          cleanup: true,
          reason: "Nominal is numeric text rather than a JavaScript number.",
          action: "MANUALLY_CONVERT_TO_A_NUMBER_WITHOUT_CHANGING_VALUE",
        };
      }

      const formatted = parseFormatted(text);
      if (formatted !== null) {
        if (formatted < 0) {
          return {
            category: "NEGATIVE",
            parsed: formatted,
            cleanup: true,
            reason: "Nominal is negative formatted numeric text.",
            action: "MANUALLY_CORRECT_AND_STORE_AS_A_NUMBER",
          };
        }
        return {
          category: "FORMATTED_NUMERIC_STRING",
          parsed: formatted,
          cleanup: true,
          reason: "Nominal contains numeric formatting and is stored as text.",
          action: "MANUALLY_REVIEW_FORMAT_AND_STORE_AS_A_NUMBER",
        };
      }

      return {
        category: "NON_NUMERIC",
        parsed: null,
        cleanup: true,
        reason: "Nominal text cannot be parsed as a number.",
        action: "MANUALLY_REPLACE_WITH_A_VALID_NUMBER",
      };
    }

    return {
      category: "OTHER_UNSAFE",
      parsed: null,
      cleanup: true,
      reason: `Nominal has unsupported JavaScript type ${typeof raw}.`,
      action: "MANUALLY_REVIEW_AND_REPLACE_WITH_A_VALID_NUMBER",
    };
  };

  rows.forEach((row, offset) => {
    const get = (field) => row[index[field]];
    const raw = get("Nominal");
    const formula = formulaRows[offset]?.[index.Nominal] || "";
    const result = classify(raw, formula);
    const deleted = logicalTrue(get("Deleted"));
    const active = !deleted && logicalTrue(get("IsActive"));
    const decimal =
      result.parsed !== null &&
      Number.isFinite(result.parsed) &&
      !Number.isInteger(result.parsed);

    if (active) summary.activeRows += 1;
    if (deleted) summary.deletedRows += 1;
    if (formula) summary.formulaCells += 1;
    if (result.category === "VALID_INTEGER_NUMBER")
      summary.validIntegerNumericRows += 1;
    if (result.parsed === 0) summary.zeroValueRows += 1;
    if (decimal) summary.decimalRows += 1;
    if (
      result.category === "NUMERIC_STRING_INTEGER" ||
      result.category === "NUMERIC_STRING_DECIMAL"
    )
      summary.numericStringRows += 1;
    if (result.category === "FORMATTED_NUMERIC_STRING")
      summary.formattedStringRows += 1;
    if (result.category === "BLANK") summary.blankRows += 1;
    if (result.category === "NEGATIVE") summary.negativeRows += 1;
    if (result.category === "NON_NUMERIC") summary.nonnumericRows += 1;
    if (result.category === "NON_FINITE") summary.nonfiniteRows += 1;

    if (result.cleanup) {
      summary.rowsRequiringCleanup += 1;
      if (active) summary.activeRowsRequiringCleanup += 1;
      if (deleted) summary.deletedRowsRequiringCleanup += 1;
    }

    if (result.cleanup || decimal) {
      findings.push({
        physicalSheetRowNumber: offset + 2,
        expenseId: get("ID"),
        Deleted: get("Deleted"),
        IsActive: get("IsActive"),
        Tanggal: get("Tanggal"),
        Kategori: get("Kategori"),
        Keterangan: get("Keterangan"),
        rawNominal: Number.isFinite(raw) ? raw : String(raw),
        javascriptValueType: typeof raw,
        parsedNumericValue: result.parsed,
        finite: result.parsed !== null && Number.isFinite(result.parsed),
        negative: result.parsed !== null && result.parsed < 0,
        integer: result.parsed !== null && Number.isInteger(result.parsed),
        decimalFraction: decimal
          ? Math.abs(result.parsed - Math.trunc(result.parsed))
          : null,
        effectivelyIntegerUnderExistingAuditContract:
          result.parsed !== null && Number.isInteger(result.parsed),
        formula: formula || null,
        classification: result.category,
        normalizationReason: result.reason,
        recommendedActionCategory: result.action,
        requiresCleanupUnderExistingAuditContract: result.cleanup,
      });
    }
  });

  findings.forEach((finding) => {
    Logger.log(`EXPENSE NOMINAL FINDING: ${JSON.stringify(finding)}`);
  });
  Logger.log(`EXPENSE NOMINAL DIAGNOSTIC SUMMARY: ${JSON.stringify(summary)}`);
  Logger.log(
    "EXPENSE NOMINAL INTEGER CONTRACT: Number.isInteger() is used; no floating-point tolerance is applied.",
  );

  return { summary, findings };
}

function cleanupExpenseControlledFixtures() {
  const targets = Object.freeze([
    "EX26071800009",
    "EX26071800019",
    "EX26072000009",
  ]);
  const summary = {
    requestedTargets: targets.slice(),
    verifiedTargets: [],
    updatedTargets: [],
    skippedTargets: [],
    failedTargets: [],
    rollbackAttempted: false,
    rollbackSuccessful: false,
    result: "FAIL",
  };
  const lock = LockService.getScriptLock();
  let locked = false;
  let verified = [];

  function fail(id, condition) {
    const detail = `${id}: ${condition}`;
    summary.failedTargets.push(detail);
    Logger.log(`EXPENSE FIXTURE CLEANUP PRECONDITION FAILED: ${detail}`);
    throw new Error(detail);
  }

  function comparable(value) {
    if (value instanceof Date) {
      return `DATE:${value.getTime()}`;
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      return `NUMBER:${String(value)}`;
    }
    return `${typeof value}:${String(value)}`;
  }

  function protectedRowSnapshot(values, formulas, nominalColumn) {
    return values.map((value, column) =>
      column === nominalColumn
        ? null
        : `${comparable(value)}|FORMULA:${formulas[column] || ""}`,
    );
  }

  function readPhysicalSheet() {
    const sheet = Database.spreadsheet().getSheetByName(EXPENSE_SCHEMA.TABLE);

    if (!sheet || sheet.getName() !== EXPENSE_SCHEMA.TABLE) {
      fail("GLOBAL", `configured Expenses sheet ${EXPENSE_SCHEMA.TABLE} was not resolved`);
    }

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const range = sheet.getRange(1, 1, lastRow, lastColumn);

    return {
      sheet,
      values: range.getValues(),
      formulas: range.getFormulas(),
    };
  }

  try {
    Logger.log(`EXPENSE FIXTURE CLEANUP PREFLIGHT TARGET COUNT: ${targets.length}`);
    locked = lock.tryLock(5000);
    if (!locked) fail("GLOBAL", "could not acquire the cleanup script lock");

    const physical = readPhysicalSheet();
    const headers = physical.values[0].map(String);
    const nominalColumns = headers.reduce((columns, header, column) => {
      if (header === "Nominal") columns.push(column);
      return columns;
    }, []);
    const idColumns = headers.reduce((columns, header, column) => {
      if (header === "ID") columns.push(column);
      return columns;
    }, []);

    if (nominalColumns.length !== 1) {
      fail("GLOBAL", `Nominal header count is ${nominalColumns.length}, expected exactly 1`);
    }
    if (idColumns.length !== 1) {
      fail("GLOBAL", `ID header count is ${idColumns.length}, expected exactly 1`);
    }

    const requiredHeaders = ["Deleted", "IsActive", "Keterangan"];
    requiredHeaders.forEach((header) => {
      const count = headers.filter((candidate) => candidate === header).length;
      if (count !== 1) fail("GLOBAL", `${header} header count is ${count}, expected exactly 1`);
    });

    const nominalColumn = nominalColumns[0];
    const idColumn = idColumns[0];
    const deletedColumn = headers.indexOf("Deleted");
    const activeColumn = headers.indexOf("IsActive");
    const descriptionColumn = headers.indexOf("Keterangan");
    const idRows = {};

    physical.values.slice(1).forEach((row, offset) => {
      const id = String(row[idColumn] ?? "").trim();
      if (!id) return;
      if (!idRows[id]) idRows[id] = [];
      idRows[id].push(offset + 2);
    });

    Object.keys(idRows).forEach((id) => {
      if (idRows[id].length !== 1) {
        fail(id, `duplicate Expense ID exists at physical rows ${idRows[id].join(", ")}`);
      }
    });

    verified = targets.map((id) => {
      const matches = idRows[id] || [];
      if (matches.length !== 1) {
        fail(id, `physical row count is ${matches.length}, expected exactly 1`);
      }

      const physicalRow = matches[0];
      const row = physical.values[physicalRow - 1];
      const formulas = physical.formulas[physicalRow - 1];

      if (row[deletedColumn] !== true) fail(id, "Deleted is not strictly true");
      if (row[activeColumn] !== false) fail(id, "IsActive is not strictly false");
      if (String(row[descriptionColumn]).trim() !== "Controlled Expense fixture") {
        fail(id, "Keterangan is not exactly the controlled fixture marker after trimming");
      }
      if (row[nominalColumn] !== "invalid") {
        fail(id, 'raw Nominal is not exactly the string "invalid"');
      }

      const target = {
        id,
        physicalRow,
        nominalColumn,
        originalNominal: row[nominalColumn],
        protectedSnapshot: protectedRowSnapshot(row, formulas, nominalColumn),
      };
      summary.verifiedTargets.push(id);
      Logger.log(`EXPENSE FIXTURE CLEANUP VERIFIED: ${id} at physical row ${physicalRow}`);
      Logger.log(`EXPENSE FIXTURE CLEANUP PLAN: ${id} Nominal "invalid" -> 0`);
      return target;
    });

    verified.forEach((target) => {
      physical.sheet
        .getRange(target.physicalRow, target.nominalColumn + 1)
        .setValue(0);
      summary.updatedTargets.push(target.id);
    });
    Logger.log(`EXPENSE FIXTURE CLEANUP WRITE COUNT: ${summary.updatedTargets.length}`);
    SpreadsheetApp.flush();

    const after = readPhysicalSheet();
    verified.forEach((target) => {
      const row = after.values[target.physicalRow - 1];
      const formulas = after.formulas[target.physicalRow - 1];
      if (String(row[idColumn] ?? "").trim() !== target.id) {
        throw new Error(`${target.id}: physical row identity changed during cleanup`);
      }
      if (row[target.nominalColumn] !== 0 || typeof row[target.nominalColumn] !== "number") {
        throw new Error(`${target.id}: Nominal did not persist as numeric zero`);
      }
      const protectedAfter = protectedRowSnapshot(row, formulas, target.nominalColumn);
      if (JSON.stringify(protectedAfter) !== JSON.stringify(target.protectedSnapshot)) {
        throw new Error(`${target.id}: a protected field changed during cleanup`);
      }
    });

    RepositoryCache.clear(EXPENSE_SCHEMA);
    Logger.log("EXPENSE FIXTURE CLEANUP POST-WRITE VERIFICATION: PASS");
    summary.rollbackSuccessful = false;
    summary.result = "PASS";
    return summary;
  } catch (error) {
    if (verified.length && summary.updatedTargets.length) {
      summary.rollbackAttempted = true;
      Logger.log(`EXPENSE FIXTURE CLEANUP ROLLBACK START: ${error.message}`);

      try {
        const physical = readPhysicalSheet();
        verified.forEach((target) => {
          physical.sheet
            .getRange(target.physicalRow, target.nominalColumn + 1)
            .setValue(target.originalNominal);
        });
        SpreadsheetApp.flush();

        const rolledBack = readPhysicalSheet();
        summary.rollbackSuccessful = verified.every((target) => {
          const row = rolledBack.values[target.physicalRow - 1];
          const formulas = rolledBack.formulas[target.physicalRow - 1];
          return (
            row[target.nominalColumn] === target.originalNominal &&
            JSON.stringify(
              protectedRowSnapshot(row, formulas, target.nominalColumn),
            ) === JSON.stringify(target.protectedSnapshot)
          );
        });
        Logger.log(
          `EXPENSE FIXTURE CLEANUP ROLLBACK RESULT: ${summary.rollbackSuccessful ? "PASS" : "FAIL"}`,
        );
      } catch (rollbackError) {
        summary.rollbackSuccessful = false;
        Logger.log(`EXPENSE FIXTURE CLEANUP ROLLBACK RESULT: FAIL - ${rollbackError.message}`);
      }
    }

    targets.forEach((id) => {
      if (
        summary.updatedTargets.indexOf(id) === -1 &&
        !summary.failedTargets.some((failure) => failure.indexOf(`${id}:`) === 0)
      ) {
        summary.skippedTargets.push(id);
      }
    });
    if (!summary.failedTargets.length) {
      summary.failedTargets.push(error.message);
    }
    throw error;
  } finally {
    if (locked) lock.releaseLock();
    Logger.log(
      `EXPENSE CONTROLLED FIXTURE CLEANUP FINAL SUMMARY: ${JSON.stringify(summary)}`,
    );
  }
}

function auditPurchasingData() {
  purchasingAuditLog("START", "Purchasing live-data audit (read-only)");
  try {
    const spreadsheet = Database.spreadsheet();
    const candidateNames = ["Purchases", "Purchasings"];
    const targetHeaders = [
      "ID",
      "Tanggal",
      "SupplierID",
      "ProductID",
      "Qty",
      "Harga",
      "Total",
      "Deleted",
      "IsActive",
      "CreatedAt",
      "CreatedBy",
      "UpdatedAt",
      "UpdatedBy",
    ];
    const sheets = candidateNames.map((name) =>
      spreadsheet.getSheetByName(name),
    );
    const found = sheets.filter(Boolean);
    const blocking = [];
    purchasingAuditLog("SECTION", "Sheet discovery");
    candidateNames.forEach((name, index) => {
      const sheet = sheets[index];
      purchasingAuditLog(
        sheet ? "PASS" : "WARN",
        `${name}: ${sheet ? "exists" : "missing"}`,
        sheet
          ? {
              rowCount: purchasingAuditObjects(sheet).rows.length,
              columnCount: sheet.getLastColumn(),
            }
          : undefined,
      );
    });
    if (found.length === 2)
      blocking.push(
        "Both Purchases and Purchasings exist; canonical sheet is ambiguous.",
      );
    if (found.length === 0)
      blocking.push("Neither Purchases nor Purchasings exists.");
    if (found.length === 1 && found[0].getName() === "Purchasings") {
      blocking.push(
        "Only Purchasings exists; sheet rename or source configuration requires a decision.",
      );
    }

    purchasingAuditLog("SECTION", "Master relation sources");
    const masters = {
      partners: purchasingAuditMaster(spreadsheet, PARTNER_SCHEMA),
      products: purchasingAuditMaster(spreadsheet, PRODUCT_SCHEMA),
    };
    if (!masters.partners.available)
      blocking.push(`Partner sheet ${PARTNER_SCHEMA.TABLE} is missing.`);
    if (!masters.products.available)
      blocking.push(`Product sheet ${PRODUCT_SCHEMA.TABLE} is missing.`);
    purchasingAuditLog(
      masters.partners.available ? "PASS" : "FAIL",
      `Partner source ${PARTNER_SCHEMA.TABLE}`,
    );
    purchasingAuditLog(
      masters.products.available ? "PASS" : "FAIL",
      `Product source ${PRODUCT_SCHEMA.TABLE}`,
    );

    const audits = [];
    found.forEach((sheet) => {
      purchasingAuditLog("SECTION", `Candidate ${sheet.getName()}`);
      try {
        const audit = purchasingAuditCandidate(sheet, masters, targetHeaders);
        audits.push(audit);
        purchasingAuditLog(
          audit.header.compatible ? "PASS" : "FAIL",
          "Header contract",
          {
            exact: audit.headers,
            missing: audit.header.missing,
            extra: audit.header.extra,
            duplicated: audit.header.duplicated,
            reordered: audit.header.reordered,
            blank: audit.header.blank,
          },
        );
        purchasingAuditLog("PASS", "Aggregate row audit", {
          rows: audit.rowCount,
          blankIds: audit.blankIds,
          duplicateIds: audit.duplicateIds,
          invalidPrefix: audit.invalidPrefix,
          blankRequired: audit.blankRequired,
          invalidQty: audit.invalidQty,
          invalidHarga: audit.invalidHarga,
          invalidTotal: audit.invalidTotal,
        });
        purchasingAuditLog(
          audit.totalMismatches || audit.totalFormulaCells ? "WARN" : "PASS",
          "Total behavior",
          {
            mismatches: audit.totalMismatches,
            formulaCells: audit.totalFormulaCells,
            mode: audit.totalMode,
            tolerance: audit.decimalToleranceUsed
              ? "relative 1e-9 for decimal values"
              : "exact integer comparison",
          },
        );
        purchasingAuditLog("PASS", "Status variants", audit.statuses);
        purchasingAuditLog("PASS", "Relation integrity", {
          supplier: audit.supplier,
          product: audit.product,
          masterSourcesAvailable: {
            partners: masters.partners.available,
            products: masters.products.available,
          },
        });
        purchasingAuditLog(
          audit.grouping.evidence === "NONE" ? "PASS" : "WARN",
          "Header-detail evidence",
          audit.grouping,
        );
        purchasingAuditLog(
          "PASS",
          "Safe anonymized row-shape samples",
          audit.samples,
        );
        if (!audit.header.compatible)
          blocking.push(
            `${audit.sheet} headers do not match the source target contract.`,
          );
        if (audit.totalFormulaCells > 0)
          blocking.push(
            `${audit.sheet} has formula-backed Total cells; Total authority requires a decision.`,
          );
        if (audit.totalMismatches > 0)
          blocking.push(
            `${audit.sheet} has Total values that do not match Qty x Harga.`,
          );
      } catch (error) {
        blocking.push(
          `${sheet.getName()} could not be fully audited: ${error.message}`,
        );
        purchasingAuditLog("FAIL", `${sheet.getName()} candidate audit`, {
          error: error.message,
        });
      }
    });

    const canonical =
      found.length === 1
        ? found[0].getName() === "Purchases"
          ? "Purchases"
          : "Purchases (source target; deployed sheet is Purchasings)"
        : "UNRESOLVED";
    const audit = audits.length === 1 ? audits[0] : null;
    const invalidData =
      audit &&
      (audit.blankIds ||
        audit.duplicateIds ||
        audit.invalidPrefix ||
        Object.values(audit.blankRequired).some(Boolean) ||
        Object.values(audit.invalidQty).some(Boolean) ||
        Object.values(audit.invalidHarga).some(Boolean) ||
        Object.values(audit.invalidTotal).some(Boolean) ||
        audit.totalMismatches ||
        audit.supplier.missing ||
        audit.supplier.notSupplier ||
        audit.product.missing);
    const dataMigration = !audit
      ? "UNCERTAIN"
      : !audit.header.compatible || invalidData
        ? "YES"
        : audit.totalFormulaCells
          ? "UNCERTAIN"
          : "NO";
    const renameRequired =
      found.length !== 1
        ? "UNCERTAIN"
        : found[0].getName() === "Purchases"
          ? "NO"
          : "YES";
    const relationIssues = audit
      ? {
          supplier: audit.supplier,
          product: audit.product,
        }
      : "UNCERTAIN";
    const safe = Boolean(
      audit &&
      audit.sheet === "Purchases" &&
      audit.header.compatible &&
      audit.totalFormulaCells === 0 &&
      audit.totalMismatches === 0 &&
      blocking.length === 0,
    );
    purchasingAuditLog("SECTION", "Final summary");
    purchasingAuditLog(safe ? "PASS" : "FAIL", "Purchasing audit conclusion", {
      candidateSheetFound: found.map((sheet) => sheet.getName()),
      canonicalSheetRecommendation: canonical,
      headerCompatibility: audit
        ? audit.header.compatible
          ? "COMPATIBLE"
          : "INCOMPATIBLE"
        : "UNCERTAIN",
      dataMigrationRequired: dataMigration,
      sheetRenameRequired: renameRequired,
      totalFormulasPresent: audits.some((item) => item.totalFormulaCells > 0)
        ? "YES"
        : "NO",
      totalMismatchesCount: audits.reduce(
        (sum, item) => sum + item.totalMismatches,
        0,
      ),
      relationIssuesSummary: relationIssues,
      headerDetailEvidence: audit ? audit.grouping.evidence : "UNCERTAIN",
      safeToBeginBackendHardening: safe ? "YES" : "NO",
      blockingIssues: blocking,
    });
    purchasingAuditLog("COMPLETE", "Purchasing live-data audit");
    return { success: safe, audits, blockingIssues: blocking };
  } catch (error) {
    purchasingAuditLog("FAIL", "Unexpected Purchasing audit error", {
      error: error.message,
    });
    purchasingAuditLog(
      "COMPLETE",
      "Purchasing live-data audit with unexpected error",
    );
    throw error;
  }
}

function auditDashboardLiveData() {
  const issues = [];
  const expenses = RepositoryBase.mapRows(EXPENSE_SCHEMA, RepositoryReader.raw(EXPENSE_SCHEMA));
  const purchases = RepositoryBase.mapRows(PURCHASING_SCHEMA, RepositoryReader.raw(PURCHASING_SCHEMA));
  const validDate = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (match) {
      const probe = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
      return probe.getUTCFullYear() === Number(match[1]) && probe.getUTCMonth() === Number(match[2]) - 1 && probe.getUTCDate() === Number(match[3]);
    }
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isFinite(parsed.getTime());
  };
  const finite = (value) => value !== "" && value !== null && Number.isFinite(Number(value)) && Number(value) >= 0;
  const active = (schema, row) => row[schema.SYSTEM.IS_ACTIVE] === true && row[schema.SYSTEM.IS_DELETED] === false;
  function stateAudit(schema, row, module) {
    if (row[schema.SYSTEM.IS_DELETED] === true && row[schema.SYSTEM.IS_ACTIVE] === true) {
      issues.push(`${module} ${row.ID || "(unknown)"}: deleted row is active.`);
    }
  }
  expenses.forEach((row) => {
    stateAudit(EXPENSE_SCHEMA, row, "Expense");
    if (!active(EXPENSE_SCHEMA, row)) return;
    if (!validDate(row.Tanggal)) issues.push(`Expense ${row.ID}: invalid Tanggal.`);
    if (!finite(row.Nominal)) issues.push(`Expense ${row.ID}: invalid Nominal.`);
    if (!String(row.Kategori || "").trim()) issues.push(`Expense ${row.ID}: blank Kategori.`);
  });
  purchases.forEach((row) => {
    stateAudit(PURCHASING_SCHEMA, row, "Purchasing");
    if (!active(PURCHASING_SCHEMA, row)) return;
    if (!validDate(row.Tanggal)) issues.push(`Purchasing ${row.ID}: invalid Tanggal.`);
    if (!finite(row.Qty) || Number(row.Qty) <= 0 || !finite(row.Harga) || !finite(row.Total)) issues.push(`Purchasing ${row.ID}: invalid Qty, Harga, or Total.`);
    else if (Number(row.Total) !== Number(row.Qty) * Number(row.Harga)) issues.push(`Purchasing ${row.ID}: Total does not reconcile.`);
  });

  const report = {
    assessment: issues.length ? "BLOCKED" : "SAFE_TO_TEST",
    issues,
    expenseRowsAudited: expenses.length,
    purchasingRowsAudited: purchases.length,
  };

  Logger.log(`DASHBOARD READ-ONLY AUDIT: ${JSON.stringify(report)}`);
  return report;
}

function runPickupReturnIntegrityDiagnostic() {
  const before = pickupReturnIntegrityReadPhysicalRows();
  const beforeSnapshot = JSON.stringify(before);
  const report = analyzePickupReturnIntegrity(
    before.pickupHeaders,
    before.pickupDetails,
    before.returns,
  );
  const after = pickupReturnIntegrityReadPhysicalRows();

  if (JSON.stringify(after) !== beforeSnapshot) {
    throw new Error(
      "Pickup/Return diagnostic safety check failed: spreadsheet data changed during the read-only scan.",
    );
  }

  logPickupReturnIntegrityReport(report);
  return report;
}

function pickupReturnIntegrityReadPhysicalRows() {
  return {
    pickupHeaders: RepositoryBase.mapRows(
      PICKUP_HEADER_SCHEMA,
      RepositoryReader.raw(PICKUP_HEADER_SCHEMA),
    ),
    pickupDetails: RepositoryBase.mapRows(
      PICKUP_DETAIL_SCHEMA,
      RepositoryReader.raw(PICKUP_DETAIL_SCHEMA),
    ),
    returns: RepositoryBase.mapRows(
      RETURN_SCHEMA,
      RepositoryReader.raw(RETURN_SCHEMA),
    ),
  };
}

function pickupReturnIntegrityStatus(row) {
  const deleted = row && row.Deleted;
  const active = row && row.IsActive;
  const deletedTrue =
    deleted === true ||
    deleted === 1 ||
    (typeof deleted === "string" && deleted.trim().toLowerCase() === "true");
  const activeTrue =
    active === true ||
    active === 1 ||
    (typeof active === "string" && active.trim().toLowerCase() === "true");

  return {
    active: !deletedTrue && activeTrue,
    deletedOrInactive: deletedTrue || !activeTrue,
    deleted: deletedTrue,
  };
}

function pickupReturnIntegrityNumber(value) {
  const number = Number(value);
  return {
    valid: value !== "" && value !== null && value !== undefined && Number.isFinite(number),
    value: Number.isFinite(number) ? number : 0,
  };
}

function pickupReturnIntegrityGroup(rows, field) {
  return rows.reduce((groups, row) => {
    const key = String(row[field] === undefined || row[field] === null ? "" : row[field]);
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
    return groups;
  }, {});
}

function analyzePickupReturnIntegrity(pickupHeaders, pickupDetails, returns, options) {
  const headers = pickupHeaders.map((row) => Object.assign({}, row));
  const details = pickupDetails.map((row) => Object.assign({}, row));
  const returnRows = returns.map((row) => Object.assign({}, row));
  const headerById = {};
  const detailById = {};
  const detailsByPickup = pickupReturnIntegrityGroup(details, "PickupID");
  const returnsByDetail = pickupReturnIntegrityGroup(returnRows, "PickupDetailID");
  const issues = {
    missingPickupHeaderReferences: [],
    missingPickupDetailReferences: [],
    pickupHeaderDetailMismatches: [],
    inactivePickupHeaderReferences: [],
    inactivePickupDetailReferences: [],
    activeReturnsWithInactivePickupRelation: [],
    multipleDetailGenerations: [],
    duplicateActiveProducts: [],
    activeReturnQuantityOverruns: [],
    historicalReturnQuantityOverruns: [],
    pickupHeaderTotalMismatches: [],
    potentiallyObsoleteDeletedDetails: [],
    restoreReactivationRisks: [],
    invalidNumericQuantities: [],
  };

  headers.forEach((row) => {
    headerById[row.ID] = row;
  });
  details.forEach((row) => {
    detailById[row.ID] = row;
  });

  returnRows.forEach((row) => {
    const status = pickupReturnIntegrityStatus(row);
    const identity = {
      returnId: row.ID || "",
      pickupId: row.PickupID || "",
      pickupDetailId: row.PickupDetailID || "",
      returnState: status.active ? "active" : "deletedOrInactive",
    };
    const header = row.PickupID ? headerById[row.PickupID] : null;
    const detail = row.PickupDetailID ? detailById[row.PickupDetailID] : null;
    const headerInactive = header && !pickupReturnIntegrityStatus(header).active;
    const detailInactive = detail && !pickupReturnIntegrityStatus(detail).active;
    const mismatch = detail && row.PickupID !== detail.PickupID;

    if (!header) {
      issues.missingPickupHeaderReferences.push(
        Object.assign({ severity: status.active ? "critical" : "warning" }, identity),
      );
    }
    if (!detail) {
      issues.missingPickupDetailReferences.push(
        Object.assign({ severity: status.active ? "critical" : "warning" }, identity),
      );
    }
    if (mismatch) {
      issues.pickupHeaderDetailMismatches.push(
        Object.assign(
          {
            actualDetailPickupId: detail.PickupID || "",
            detailState: pickupReturnIntegrityStatus(detail).active
              ? "active"
              : "deletedOrInactive",
            severity: status.active ? "critical" : "warning",
          },
          identity,
        ),
      );
    }
    if (headerInactive) {
      issues.inactivePickupHeaderReferences.push(
        Object.assign({ headerState: "deletedOrInactive", severity: status.active ? "critical" : "warning" }, identity),
      );
    }
    if (detailInactive) {
      issues.inactivePickupDetailReferences.push(
        Object.assign({ detailState: "deletedOrInactive", severity: status.active ? "critical" : "warning" }, identity),
      );
    }
    if (status.active && (!header || !detail || headerInactive || detailInactive || mismatch)) {
      const reasons = [];
      if (!header) reasons.push("missing PickupHeader");
      if (!detail) reasons.push("missing PickupDetail");
      if (headerInactive) reasons.push("inactive PickupHeader");
      if (detailInactive) reasons.push("inactive PickupDetail");
      if (mismatch) reasons.push("Pickup ownership mismatch");
      issues.activeReturnsWithInactivePickupRelation.push(
        Object.assign({ reasons, severity: "critical" }, identity),
      );
    }
  });

  Object.keys(detailsByPickup).forEach((pickupId) => {
    const rows = detailsByPickup[pickupId];
    const activeRows = rows.filter((row) => pickupReturnIntegrityStatus(row).active);
    const inactiveRows = rows.filter((row) => !pickupReturnIntegrityStatus(row).active);
    if (activeRows.length && inactiveRows.length) {
      issues.multipleDetailGenerations.push({
        pickupId,
        activeDetailIds: activeRows.map((row) => row.ID),
        deletedOrInactiveDetailIds: inactiveRows.map((row) => row.ID),
        activeCount: activeRows.length,
        deletedCount: inactiveRows.length,
        productIds: rows.map((row) => row.ProductID),
        reason: "Heuristic: active and deleted/inactive physical detail rows coexist.",
        severity: "warning",
      });
    }

    const activeByProduct = pickupReturnIntegrityGroup(activeRows, "ProductID");
    Object.keys(activeByProduct).forEach((productId) => {
      const products = activeByProduct[productId];
      if (products.length > 1) {
        issues.duplicateActiveProducts.push({
          pickupId,
          productId,
          detailIds: products.map((row) => row.ID),
          quantities: products.map((row) => row.Qty),
          severity: "critical",
        });
      }
    });

    inactiveRows.forEach((detail) => {
      const history = returnsByDetail[String(detail.ID)] || [];
      const sameActiveProduct = activeRows.some((row) => row.ProductID === detail.ProductID);
      const sameInactiveProductCount = inactiveRows.filter(
        (row) => row.ProductID === detail.ProductID,
      ).length;
      const reasons = [];
      if (history.length) reasons.push("referenced by Return history");
      if (sameActiveProduct) reasons.push("ProductID also exists in active details");
      if (sameInactiveProductCount > 1) reasons.push("multiple deleted/inactive details share ProductID");
      if (activeRows.length && reasons.length) {
        issues.potentiallyObsoleteDeletedDetails.push({
          pickupId,
          pickupDetailId: detail.ID,
          productId: detail.ProductID,
          returnIds: history.map((row) => row.ID),
          reasons,
          severity: "warning",
        });
      }
    });
  });

  details.forEach((detail) => {
    const detailQty = pickupReturnIntegrityNumber(detail.Qty);
    const relatedReturns = returnsByDetail[String(detail.ID)] || [];
    let activeQty = 0;
    let historicalQty = 0;
    const activeIds = [];
    const historyIds = [];

    if (!detailQty.valid) {
      issues.invalidNumericQuantities.push({
        recordType: "PickupDetail",
        recordId: detail.ID,
        field: "Qty",
        value: String(detail.Qty),
        severity: "warning",
      });
    }
    relatedReturns.forEach((row) => {
      const qty = pickupReturnIntegrityNumber(row.Qty);
      if (!qty.valid) {
        issues.invalidNumericQuantities.push({
          recordType: "Return",
          recordId: row.ID,
          field: "Qty",
          value: String(row.Qty),
          severity: "warning",
        });
        return;
      }
      historicalQty += qty.value;
      historyIds.push(row.ID);
      if (pickupReturnIntegrityStatus(row).active) {
        activeQty += qty.value;
        activeIds.push(row.ID);
      }
    });
    if (detailQty.valid && activeQty > detailQty.value) {
      issues.activeReturnQuantityOverruns.push({
        pickupId: detail.PickupID,
        pickupDetailId: detail.ID,
        productId: detail.ProductID,
        detailQty: detailQty.value,
        activeReturnedQty: activeQty,
        returnIds: activeIds,
        difference: activeQty - detailQty.value,
        severity: "critical",
      });
    }
    if (detailQty.valid && historicalQty > detailQty.value) {
      issues.historicalReturnQuantityOverruns.push({
        pickupId: detail.PickupID,
        pickupDetailId: detail.ID,
        productId: detail.ProductID,
        detailQty: detailQty.value,
        historicalReturnedQty: historicalQty,
        returnIds: historyIds,
        difference: historicalQty - detailQty.value,
        reason: "Historical total includes deleted/inactive Returns and may reflect delete/restore cycles.",
        severity: "warning",
      });
    }
  });

  headers.forEach((header) => {
    const rows = detailsByPickup[String(header.ID)] || [];
    const activeRows = rows.filter((row) => pickupReturnIntegrityStatus(row).active);
    const validQuantities = activeRows.map((row) => pickupReturnIntegrityNumber(row.Qty));
    const activeQty = validQuantities.reduce(
      (total, qty) => total + (qty.valid ? qty.value : 0),
      0,
    );
    const headerItem = pickupReturnIntegrityNumber(header.TotalItem);
    const headerQty = pickupReturnIntegrityNumber(header.TotalQty);
    if (!headerItem.valid || !headerQty.valid) {
      if (!headerItem.valid) issues.invalidNumericQuantities.push({ recordType: "PickupHeader", recordId: header.ID, field: "TotalItem", value: String(header.TotalItem), severity: "warning" });
      if (!headerQty.valid) issues.invalidNumericQuantities.push({ recordType: "PickupHeader", recordId: header.ID, field: "TotalQty", value: String(header.TotalQty), severity: "warning" });
    }
    if (!headerItem.valid || !headerQty.valid || headerItem.value !== activeRows.length || headerQty.value !== activeQty) {
      issues.pickupHeaderTotalMismatches.push({
        pickupId: header.ID,
        headerTotalItem: headerItem.valid ? headerItem.value : null,
        calculatedActiveDetailCount: activeRows.length,
        headerTotalQty: headerQty.valid ? headerQty.value : null,
        calculatedActiveQty: activeQty,
        invalidActiveDetailQtyCount: validQuantities.filter((qty) => !qty.valid).length,
        severity: "warning",
      });
    }

    const productGroups = pickupReturnIntegrityGroup(rows, "ProductID");
    const returnReferences = {};
    rows.forEach((row) => {
      const history = returnsByDetail[String(row.ID)] || [];
      if (history.length) returnReferences[row.ID] = history.map((item) => item.ID);
    });
    const reasons = [];
    if (Object.keys(productGroups).some((key) => productGroups[key].length > 1)) {
      reasons.push("restoring all physical details would activate duplicate ProductIDs");
    }
    if (rows.some((row) => pickupReturnIntegrityStatus(row).active) && rows.some((row) => !pickupReturnIntegrityStatus(row).active)) {
      reasons.push("obsolete and current detail candidates coexist");
    }
    if (Object.keys(returnReferences).length > 1) reasons.push("different detail rows have Return history");
    if (headerItem.valid && rows.length > headerItem.value) reasons.push("physical detail count exceeds Header.TotalItem");
    if ((!pickupReturnIntegrityStatus(header).active && reasons.length) || issues.duplicateActiveProducts.some((item) => item.pickupId === header.ID)) {
      if (pickupReturnIntegrityStatus(header).active) reasons.push("active duplicate products may indicate a prior unsafe restore");
      issues.restoreReactivationRisks.push({
        pickupId: header.ID,
        detailIdsThatWouldBeRestored: rows.filter((row) => !pickupReturnIntegrityStatus(row).active).map((row) => row.ID),
        productIdGrouping: Object.keys(productGroups).reduce((result, key) => {
          result[key] = productGroups[key].map((row) => row.ID);
          return result;
        }, {}),
        returnReferences,
        reasons,
        severity: "warning",
      });
    }
  });

  const issueRows = Object.keys(issues).reduce((all, key) => all.concat(issues[key]), []);
  const criticalIssues = issueRows.filter((issue) => issue.severity === "critical").length;
  const warningIssues = issueRows.filter((issue) => issue.severity === "warning").length;
  const timezone =
    (typeof APP_CONFIG !== "undefined" && APP_CONFIG.TIMEZONE) ||
    Session.getScriptTimeZone();

  return {
    generatedAt: (options && options.generatedAt) || new Date().toISOString(),
    timezone,
    counts: {
      pickupHeadersPhysical: headers.length,
      pickupHeadersActive: headers.filter((row) => pickupReturnIntegrityStatus(row).active).length,
      pickupHeadersDeletedOrInactive: headers.filter((row) => !pickupReturnIntegrityStatus(row).active).length,
      pickupDetailsPhysical: details.length,
      pickupDetailsActive: details.filter((row) => pickupReturnIntegrityStatus(row).active).length,
      pickupDetailsDeletedOrInactive: details.filter((row) => !pickupReturnIntegrityStatus(row).active).length,
      returnsPhysical: returnRows.length,
      returnsActive: returnRows.filter((row) => pickupReturnIntegrityStatus(row).active).length,
      returnsDeletedOrInactive: returnRows.filter((row) => !pickupReturnIntegrityStatus(row).active).length,
    },
    issues,
    summary: {
      totalIssues: issueRows.length,
      criticalIssues,
      warningIssues,
      pass: criticalIssues === 0,
    },
  };
}

function logPickupReturnIntegrityReport(report) {
  const issueLabels = {
    missingPickupHeaderReferences: "Missing Header References",
    missingPickupDetailReferences: "Missing Detail References",
    pickupHeaderDetailMismatches: "Header/Detail Mismatches",
    inactivePickupHeaderReferences: "Inactive Header References",
    inactivePickupDetailReferences: "Inactive Detail References",
    activeReturnsWithInactivePickupRelation: "Active Returns With Inactive Relations",
    multipleDetailGenerations: "Multiple Detail Generations",
    duplicateActiveProducts: "Duplicate Active Products",
    activeReturnQuantityOverruns: "Active Quantity Overruns",
    historicalReturnQuantityOverruns: "Historical Quantity Overruns",
    pickupHeaderTotalMismatches: "Header Total Mismatches",
    potentiallyObsoleteDeletedDetails: "Potentially Obsolete Deleted Details",
    restoreReactivationRisks: "Restore Reactivation Risks",
    invalidNumericQuantities: "Invalid Numeric Quantities",
  };
  Logger.log("========== Pickup-Return Integrity Diagnostic ==========");
  Logger.log(`Generated At: ${report.generatedAt}`);
  Logger.log(`Timezone: ${report.timezone}`);
  Logger.log(`Pickup Headers: ${report.counts.pickupHeadersPhysical} physical, ${report.counts.pickupHeadersActive} active`);
  Logger.log(`Pickup Details: ${report.counts.pickupDetailsPhysical} physical, ${report.counts.pickupDetailsActive} active`);
  Logger.log(`Returns: ${report.counts.returnsPhysical} physical, ${report.counts.returnsActive} active`);
  Logger.log(`Critical: ${report.summary.criticalIssues}`);
  Logger.log(`Warnings: ${report.summary.warningIssues}`);
  Logger.log(`Result: ${report.summary.pass ? "PASS" : "FAIL"}`);
  Object.keys(report.issues).forEach((key) => {
    if (!report.issues[key].length) return;
    Logger.log(`${issueLabels[key]}: ${report.issues[key].length}`);
    report.issues[key].forEach((issue) => Logger.log(JSON.stringify(issue)));
  });
  Logger.log("========================================================");
}
