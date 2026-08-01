/**
 * =============================================================================
 * FILE        : 115.Service.Return.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Return Service
 * =============================================================================
 *
 * Business Rule Return.
 *
 * =============================================================================
 */

function ReturnService(options = {}) {
  const RETURN_MUTATION_LOCK_TIMEOUT_MS = 10000;
  const auditMutation = options.auditMutation || (Object.keys(options).length ? () => {} : BaseService.auditMutation);
  const PRODUCT_NOT_FOUND = "Produk tidak ditemukan";
  const PRODUCT_DETAIL_NOT_FOUND =
    "Produk tidak tersedia karena detail Pickup tidak ditemukan";
  const PARTNER_NOT_FOUND = "Mitra tidak ditemukan";
  const PARTNER_PICKUP_NOT_FOUND =
    "Mitra tidak tersedia karena Pickup tidak ditemukan";
  const getReturnMutationLock =
    options.getMutationLock || (() => LockService.getScriptLock());
  const failureInjector = typeof options.failureInjector === "function"
    ? options.failureInjector
    : null;

  function injectFailure(stage, context) {
    if (failureInjector) failureInjector(stage, context || {});
  }

  function rollbackReturnRow(operation, before, insertedId) {
    try {
      injectFailure("duringRollback", { operation, id: insertedId || before[RETURN_SCHEMA.PRIMARY_KEY] });
      const ok = insertedId
        ? RepositoryWriter.rollbackInsert(RETURN_SCHEMA, insertedId)
        : RepositoryWriter.replace(RETURN_SCHEMA, before[RETURN_SCHEMA.PRIMARY_KEY], before);
      RepositoryCache.clear(RETURN_SCHEMA);
      if (!ok) {
        Logger.log(`[RETURN_ROLLBACK_FAILURE] operation=${operation} id=${insertedId || (before && before[RETURN_SCHEMA.PRIMARY_KEY])} error=Compensation returned false.`);
        AppLogger.error("Return rollback action failed.", {
          operation,
          id: insertedId || (before && before[RETURN_SCHEMA.PRIMARY_KEY]),
          error: "Compensation returned false.",
        });
      }
      return ok;
    } catch (error) {
      Logger.log(`[RETURN_ROLLBACK_FAILURE] operation=${operation} id=${insertedId || (before && before[RETURN_SCHEMA.PRIMARY_KEY])} error=${String(error.message || error)}`);
      AppLogger.error("Return rollback action failed.", {
        operation,
        id: insertedId || (before && before[RETURN_SCHEMA.PRIMARY_KEY]),
        error: String(error.message || error),
      });
      RepositoryCache.clear(RETURN_SCHEMA);
      return false;
    }
  }

  function physicalRows(schema) {
    if (typeof options.readPhysicalRows === "function") {
      return options.readPhysicalRows(schema);
    }

    return RepositoryBase.mapRows(schema, RepositoryReader.raw(schema));
  }

  function rowsById(rows, schema) {
    return rows.reduce((lookup, row) => {
      const id = row && row[schema.PRIMARY_KEY];

      if (isPresent(id)) lookup[id] = row;

      return lookup;
    }, Object.create(null));
  }

  function buildReturnDisplayContext() {
    return {
      pickupDetails: rowsById(
        physicalRows(PICKUP_DETAIL_SCHEMA),
        PICKUP_DETAIL_SCHEMA,
      ),
      pickupHeaders: rowsById(
        physicalRows(PICKUP_HEADER_SCHEMA),
        PICKUP_HEADER_SCHEMA,
      ),
      products: rowsById(physicalRows(PRODUCT_SCHEMA), PRODUCT_SCHEMA),
      partners: rowsById(physicalRows(PARTNER_SCHEMA), PARTNER_SCHEMA),
    };
  }

  function enrichReturnRow(row, context) {
    const enriched = Object.assign({}, row);
    const pickupDetail =
      context.pickupDetails[row[RETURN_FIELDS.PICKUP_DETAIL_ID]] || null;
    const pickupHeader =
      context.pickupHeaders[row[RETURN_FIELDS.PICKUP_ID]] || null;
    const detailMatchesReturn =
      pickupDetail &&
      pickupDetail[PICKUP_DETAIL_FIELDS.PICKUP_ID] ===
        row[RETURN_FIELDS.PICKUP_ID];
    const productId = pickupDetail
      ? pickupDetail[PICKUP_DETAIL_FIELDS.PRODUCT_ID]
      : "";
    const partnerId = pickupHeader
      ? pickupHeader[PICKUP_HEADER_FIELDS.PARTNER_ID]
      : "";
    const product = productId ? context.products[productId] : null;
    const partner = partnerId ? context.partners[partnerId] : null;

    enriched.ProductID = productId || "";
    enriched.ProductName = pickupDetail
      ? product && product[PRODUCT_FIELDS.NAME]
        ? product[PRODUCT_FIELDS.NAME]
        : PRODUCT_NOT_FOUND
      : PRODUCT_DETAIL_NOT_FOUND;
    enriched.PartnerID = partnerId || "";
    enriched.PartnerName = pickupHeader
      ? partner && partner[PARTNER_FIELDS.NAME]
        ? partner[PARTNER_FIELDS.NAME]
        : PARTNER_NOT_FOUND
      : PARTNER_PICKUP_NOT_FOUND;
    enriched.PickupDate = pickupHeader
      ? pickupHeader[PICKUP_HEADER_FIELDS.DATE] || ""
      : "";
    enriched.PickupDetailQty = pickupDetail
      ? pickupDetail[PICKUP_DETAIL_FIELDS.QTY]
      : "";
    enriched.PickupDetailHarga = pickupDetail
      ? pickupDetail[PICKUP_DETAIL_FIELDS.PRICE]
      : "";
    enriched.ReturnValue = pickupDetail
      ? Number(row[RETURN_FIELDS.QTY]) * Number(pickupDetail[PICKUP_DETAIL_FIELDS.PRICE])
      : "";

    // Ownership mismatches remain visible in lists and never rewrite stored IDs.
    if (pickupDetail && !detailMatchesReturn) {
      enriched.PickupID = row[RETURN_FIELDS.PICKUP_ID];
    }

    return enriched;
  }

  function enrichReturnRows(rows) {
    if (!rows.length) return [];

    const context = buildReturnDisplayContext();
    return rows.map((row) => enrichReturnRow(row, context));
  }

  function evaluateRestoreEligibility(row) {
    const issues = [];
    if (!row || !isPresent(row[RETURN_FIELDS.PICKUP_ID]) || !isPresent(row[RETURN_FIELDS.PICKUP_DETAIL_ID])) issues.push("Data referensi Return tidak lengkap.");
    const pickup = row && physicalRows(PICKUP_HEADER_SCHEMA).find((item) => String(item[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]) === String(row[RETURN_FIELDS.PICKUP_ID]));
    if (row && isPresent(row[RETURN_FIELDS.PICKUP_ID]) && !pickup) issues.push("Pickup terkait tidak ditemukan.");
    else if (pickup && isTrueEquivalent(pickup[PICKUP_HEADER_SCHEMA.SYSTEM.IS_DELETED])) issues.push("Pickup terkait masih berada di data terhapus.");
    else if (pickup && !isTrueEquivalent(pickup[PICKUP_HEADER_SCHEMA.SYSTEM.IS_ACTIVE])) issues.push("Pickup terkait tidak aktif.");
    if (issues.length === 0) {
      const resolved = resolvePickup(row[RETURN_FIELDS.PICKUP_DETAIL_ID], row[RETURN_FIELDS.PICKUP_ID]);
      if (resolved && resolved.success === false) issues.push(resolved.message || "Data referensi Return tidak lengkap.");
      else {
        const qty = validateAvailableQty(resolved.pickupDetail, row[RETURN_FIELDS.QTY]);
        if (qty && qty.success === false) issues.push("Restore retur melebihi quantity yang tersedia.");
      }
    }
    const canRestore = issues.length === 0;
    return { canRestore, restoreReason: canRestore ? "Aman direstore karena seluruh referensi tersedia." : issues.join(" "), restoreIssues: issues };
  }

  function activeReturnedQtyByDetail(rows) {
    return rows.reduce((totals, row) => {
      if (!isActive(row, RETURN_SCHEMA)) return totals;
      const detailId = row[RETURN_FIELDS.PICKUP_DETAIL_ID];
      totals[detailId] = (totals[detailId] || 0) + Number(row[RETURN_FIELDS.QTY] || 0);
      return totals;
    }, Object.create(null));
  }

  function evaluateRestoreEligibilityFromContext(row, context, returnedQtyByDetail) {
    const issues = [];
    const pickupId = row && row[RETURN_FIELDS.PICKUP_ID];
    const detailId = row && row[RETURN_FIELDS.PICKUP_DETAIL_ID];

    if (!row || !isPresent(pickupId) || !isPresent(detailId)) issues.push("Data referensi Return tidak lengkap.");
    const pickup = isPresent(pickupId) ? context.pickupHeaders[pickupId] : null;
    if (isPresent(pickupId) && !pickup) issues.push("Pickup terkait tidak ditemukan.");
    else if (pickup && isTrueEquivalent(pickup[PICKUP_HEADER_SCHEMA.SYSTEM.IS_DELETED])) issues.push("Pickup terkait masih berada di data terhapus.");
    else if (pickup && !isTrueEquivalent(pickup[PICKUP_HEADER_SCHEMA.SYSTEM.IS_ACTIVE])) issues.push("Pickup terkait tidak aktif.");

    if (issues.length === 0) {
      const detail = context.pickupDetails[detailId];
      if (!isActive(detail, PICKUP_DETAIL_SCHEMA)) issues.push("Pickup Detail tidak ditemukan atau tidak aktif.");
      else if (detail[PICKUP_DETAIL_FIELDS.PICKUP_ID] !== pickupId) issues.push("Pickup Detail tidak sesuai dengan Pickup Header Return.");
      else {
        const resolvedHeader = context.pickupHeaders[detail[PICKUP_DETAIL_FIELDS.PICKUP_ID]];
        if (!isActive(resolvedHeader, PICKUP_HEADER_SCHEMA)) issues.push("Pickup Header tidak ditemukan atau tidak aktif.");
        else {
          const requestedQty = Number(row[RETURN_FIELDS.QTY]);
          const usedQty = Number(returnedQtyByDetail[detailId] || 0);
          if (!Number.isFinite(requestedQty) || requestedQty <= 0 || usedQty + requestedQty > Number(detail[PICKUP_DETAIL_FIELDS.QTY])) issues.push("Restore retur melebihi quantity yang tersedia.");
        }
      }
    }

    const canRestore = issues.length === 0;
    return { canRestore, restoreReason: canRestore ? "Aman direstore karena seluruh referensi tersedia." : issues.join(" "), restoreIssues: issues };
  }

  function isPresent(id) {
    return typeof id === "string" ? id.trim() !== "" : !!id;
  }

  function isTrueEquivalent(value) {
    return (
      value === true ||
      value === 1 ||
      (typeof value === "string" && value.trim().toLowerCase() === "true")
    );
  }

  function isFalseEquivalent(value) {
    return (
      value === false ||
      value === 0 ||
      (typeof value === "string" && value.trim().toLowerCase() === "false")
    );
  }

  function isActive(row, schema) {
    return (
      row &&
      row[schema.SYSTEM.IS_DELETED] !== true &&
      row[schema.SYSTEM.IS_ACTIVE] === true
    );
  }

  function activeReturn(id) {
    const row = RepositoryReader.findById(RETURN_SCHEMA, id);

    return isActive(row, RETURN_SCHEMA) ? row : null;
  }

  function deletedReturn(id) {
    const rows = RepositoryBase.mapRows(
      RETURN_SCHEMA,
      RepositoryReader.raw(RETURN_SCHEMA),
    );

    return (
      rows.find((row) => {
        return (
          row[RETURN_SCHEMA.PRIMARY_KEY] === id &&
          isTrueEquivalent(row[RETURN_SCHEMA.SYSTEM.IS_DELETED]) &&
          isFalseEquivalent(row[RETURN_SCHEMA.SYSTEM.IS_ACTIVE])
        );
      }) || null
    );
  }

  function resolvePickup(pickupDetailId, storedPickupId) {
    if (!isPresent(pickupDetailId)) {
      return Response.error("Pickup Detail wajib diisi.");
    }

    const pickupDetail = RepositoryReader.findById(
      PICKUP_DETAIL_SCHEMA,
      pickupDetailId,
    );

    if (!isActive(pickupDetail, PICKUP_DETAIL_SCHEMA)) {
      return Response.error("Pickup Detail tidak ditemukan atau tidak aktif.");
    }

    const pickupPriceValue = pickupDetail[PICKUP_DETAIL_FIELDS.PRICE];
    const pickupTotalValue = pickupDetail[PICKUP_DETAIL_FIELDS.TOTAL];
    const pickupQty = Number(pickupDetail[PICKUP_DETAIL_FIELDS.QTY]);
    const pickupPrice = Number(pickupPriceValue);
    const pickupTotal = Number(pickupTotalValue);
    if (pickupPriceValue === "" || pickupPriceValue === null ||
        pickupTotalValue === "" || pickupTotalValue === null ||
        !Number.isFinite(pickupQty) || !Number.isFinite(pickupPrice) ||
        pickupPrice < 0 || !Number.isFinite(pickupTotal) ||
        pickupTotal !== pickupQty * pickupPrice) {
      return Response.error("Harga historis Pickup Detail tidak valid.");
    }

    const pickupId = pickupDetail[PICKUP_DETAIL_FIELDS.PICKUP_ID];

    if (arguments.length > 1 && storedPickupId !== pickupId) {
      return Response.error(
        "Pickup Detail tidak sesuai dengan Pickup Header Return.",
      );
    }
    const pickupHeader = RepositoryReader.findById(
      PICKUP_HEADER_SCHEMA,
      pickupId,
    );

    if (!isActive(pickupHeader, PICKUP_HEADER_SCHEMA)) {
      return Response.error("Pickup Header tidak ditemukan atau tidak aktif.");
    }

    if (
      pickupHeader[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] !== pickupId
    ) {
      return Response.error("Pickup Detail tidak sesuai dengan Pickup Header.");
    }

    return {
      pickupHeader,

      pickupDetail,

      pickupId,
    };
  }

  function activeReturnedQty(pickupDetailId, excludeReturnId = null) {
    return RepositoryBase.mapRows(
      RETURN_SCHEMA,
      RepositoryReader.raw(RETURN_SCHEMA),
    )
      .filter((row) => {
        return (
          isActive(row, RETURN_SCHEMA) &&
          row[RETURN_FIELDS.PICKUP_DETAIL_ID] === pickupDetailId &&
          row[RETURN_SCHEMA.PRIMARY_KEY] !== excludeReturnId
        );
      })
      .reduce((total, row) => total + Number(row[RETURN_FIELDS.QTY] || 0), 0);
  }

  function validateAvailableQty(pickupDetail, qty, excludeReturnId = null) {
    const requestedQty = Number(qty);

    if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
      return Response.error("Qty harus berupa angka dan lebih besar dari 0.");
    }

    const usedQty = activeReturnedQty(
      pickupDetail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY],
      excludeReturnId,
    );

    if (usedQty + requestedQty > Number(pickupDetail[PICKUP_DETAIL_FIELDS.QTY])) {
      return Response.error("Qty retur melebihi quantity yang tersedia.");
    }

    return requestedQty;
  }

  function normalizeReturnIdempotencyPayload(document) {
    const value = document && document[RETURN_FIELDS.DATE];
    let date = String(value || "").trim();
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      date = Utilities.formatDate(value, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
    } else if (/^\d{4}-\d{2}-\d{2}T/.test(date)) {
      const parsed = new Date(date);
      if (!Number.isNaN(parsed.getTime())) date = Utilities.formatDate(parsed, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
    }
    return {
      [RETURN_FIELDS.PICKUP_DETAIL_ID]: String(document && document[RETURN_FIELDS.PICKUP_DETAIL_ID] || "").trim(),
      [RETURN_FIELDS.DATE]: date,
      [RETURN_FIELDS.QTY]: Number(document && document[RETURN_FIELDS.QTY]),
      [RETURN_FIELDS.NOTE]: String(document && document[RETURN_FIELDS.NOTE] || "").trim(),
    };
  }

  function withReturnMutationLock(callback) {
    const lock = getReturnMutationLock();

    if (!lock.tryLock(RETURN_MUTATION_LOCK_TIMEOUT_MS)) {
      return Response.error("Proses retur sedang digunakan. Silakan coba lagi.");
    }

    try {
      RepositoryCache.clear(RETURN_SCHEMA);

      const result = callback();

      if (result && result.success === true) {
        RepositoryCache.clear(RETURN_SCHEMA);
      }

      return result;
    } finally {
      lock.releaseLock();
    }
  }

  function createLocked(document, id) {
    let object = Utils.deepClone(document);
    const headers = RepositoryBase.headers(RETURN_SCHEMA);
    const clean = {};

    Object.keys(object).forEach((key) => {
      if (headers.indexOf(key) !== -1) {
        clean[key] = object[key];
      }
    });

    object = Utils.trimObject(clean);

    const resolved = resolvePickup(object[RETURN_FIELDS.PICKUP_DETAIL_ID]);

    if (resolved && resolved.success === false) {
      return resolved;
    }

    object[RETURN_FIELDS.PICKUP_ID] = resolved.pickupId;

    const validation = Validator.validate(RETURN_SCHEMA, object);

    if (!validation.valid) {
      return Response.validation(validation);
    }

    const qty = validateAvailableQty(
      resolved.pickupDetail,
      object[RETURN_FIELDS.QTY],
    );

    if (qty && qty.success === false) {
      return qty;
    }

    const now = Utils.now();
    object = Utils.merge(RETURN_SCHEMA.DEFAULT, object);
    object[RETURN_SCHEMA.PRIMARY_KEY] = id;
    object[RETURN_FIELDS.PICKUP_ID] = resolved.pickupId;
    object[RETURN_FIELDS.QTY] = qty;
    object = Utils.merge(object, {
      [RETURN_SCHEMA.SYSTEM.CREATED_AT]: now,
      [RETURN_SCHEMA.SYSTEM.CREATED_BY]: Utils.currentUser(),
      [RETURN_SCHEMA.SYSTEM.UPDATED_AT]: now,
      [RETURN_SCHEMA.SYSTEM.UPDATED_BY]: Utils.currentUser(),
      [RETURN_SCHEMA.SYSTEM.IS_DELETED]: false,
      [RETURN_SCHEMA.SYSTEM.IS_ACTIVE]: true,
    });

    let saved;
    try {
      injectFailure("beforeReturnWrite", { operation: "CREATE", id });
      if (!RepositoryWriter.insert(RETURN_SCHEMA, object)) {
        return Response.error("Gagal menyimpan data.");
      }
      injectFailure("afterReturnWrite", { operation: "CREATE", id });
      RepositoryCache.clear(RETURN_SCHEMA);
      saved = RepositoryReader.findById(RETURN_SCHEMA, id);
      injectFailure("beforeEligibilityFinalization", { operation: "CREATE", id });
      injectFailure("beforeAudit", { operation: "CREATE", id });
    } catch (error) {
      Logger.log(`[RETURN_FORWARD_FAILURE] operation=CREATE id=${id} error=${String(error.message || error)}`);
      if (rollbackReturnRow("CREATE", null, id)) {
        return Response.error("Gagal menyimpan Return. Perubahan dibatalkan.");
      }
      return Response.error("Gagal menyimpan Return. Rollback tidak dapat dijamin sepenuhnya; periksa data secara manual.");
    }

    auditMutation(RETURN_SCHEMA, "CREATE", id, null, saved);

    return Response.success(
      saved,
      `${RETURN_SCHEMA.NAME} berhasil dibuat.`,
    );
  }

  const base = BaseService.create(RETURN_SCHEMA, {
    beforeValidation(data) {
      const object = Utils.trimObject(data);

      if (
        !Object.prototype.hasOwnProperty.call(
          object,
          RETURN_FIELDS.PICKUP_DETAIL_ID,
        )
      ) {
        return object;
      }

      const resolved = resolvePickup(object[RETURN_FIELDS.PICKUP_DETAIL_ID]);

      if (resolved && resolved.success === false) {
        return resolved;
      }

      object[RETURN_FIELDS.PICKUP_ID] = resolved.pickupId;

      return object;
    },

    beforeCreate(data) {
      const resolved = resolvePickup(data[RETURN_FIELDS.PICKUP_DETAIL_ID]);

      if (resolved && resolved.success === false) {
        return resolved;
      }

      const qty = validateAvailableQty(
        resolved.pickupDetail,
        data[RETURN_FIELDS.QTY],
      );

      if (qty && qty.success === false) {
        return qty;
      }

      data[RETURN_FIELDS.PICKUP_ID] = resolved.pickupId;
      data[RETURN_FIELDS.QTY] = qty;

      return data;
    },

    beforeUpdate(id, data) {
      const current = activeReturn(id);

      if (!current) {
        return Response.error("Return tidak ditemukan.");
      }

      const resolved = resolvePickup(
        current[RETURN_FIELDS.PICKUP_DETAIL_ID],
        current[RETURN_FIELDS.PICKUP_ID],
      );

      if (resolved && resolved.success === false) {
        return resolved;
      }

      if (data[RETURN_FIELDS.QTY] === undefined) {
        return data;
      }

      const qty = validateAvailableQty(resolved.pickupDetail, data[RETURN_FIELDS.QTY], id);

      if (qty && qty.success === false) {
        return qty;
      }

      data[RETURN_FIELDS.QTY] = qty;

      return data;
    },

    afterUpdate(data) {
      injectFailure("beforeAudit", { operation: "UPDATE", id: data && data[RETURN_SCHEMA.PRIMARY_KEY] });
      return data;
    },

    beforeDelete(id) {
      return activeReturn(id) || Response.error("Return tidak ditemukan.");
    },

    afterDelete(id) {
      injectFailure("beforeAudit", { operation: "DELETE", id });
    },

    beforeRestore(id) {
      const current = deletedReturn(id);

      if (!current) {
        return Response.error("Return tidak ditemukan atau tidak dalam status dihapus.");
      }

      const resolved = resolvePickup(
        current[RETURN_FIELDS.PICKUP_DETAIL_ID],
        current[RETURN_FIELDS.PICKUP_ID],
      );

      if (resolved && resolved.success === false) {
        return resolved;
      }

      const qty = validateAvailableQty(
        resolved.pickupDetail,
        current[RETURN_FIELDS.QTY],
      );

      if (qty && qty.success === false) {
        return Response.error("Restore retur melebihi quantity yang tersedia.");
      }

      return id;
    },

    afterRestore(id) {
      injectFailure("beforeAudit", { operation: "RESTORE", id });
    },
  });

  function findAll() {
    const sourceRows =
      typeof options.readActiveReturns === "function"
        ? options.readActiveReturns()
        : RepositoryReader.findAll(RETURN_SCHEMA);
    const rows = sourceRows.filter((row) => {
      return row[RETURN_SCHEMA.SYSTEM.IS_ACTIVE] === true;
    });

    return Response.success(enrichReturnRows(rows));
  }

  function findDeleted() {
    const sourceRows = physicalRows(RETURN_SCHEMA);
    const rows = sourceRows.filter((row) => {
      return (
        isTrueEquivalent(row[RETURN_SCHEMA.SYSTEM.IS_DELETED]) &&
        isFalseEquivalent(row[RETURN_SCHEMA.SYSTEM.IS_ACTIVE])
      );
    }).filter((row) => isPresent(row[RETURN_SCHEMA.PRIMARY_KEY]))
      .sort((left, right) => String(left[RETURN_SCHEMA.PRIMARY_KEY]).localeCompare(String(right[RETURN_SCHEMA.PRIMARY_KEY])));

    if (!rows.length) return Response.success([]);

    const context = buildReturnDisplayContext();
    const returnedQtyByDetail = activeReturnedQtyByDetail(sourceRows);
    return Response.success(rows.map((row) => Object.assign(
      {},
      enrichReturnRow(row, context),
      evaluateRestoreEligibilityFromContext(row, context, returnedQtyByDetail),
    )));
  }

  function findById(id) {
    if (!isPresent(id)) {
      return Response.error("ID Return wajib diisi.");
    }

    const row = activeReturn(id);

    if (!row) {
      return Response.error("Return tidak ditemukan.");
    }

    const resolved = resolvePickup(
      row[RETURN_FIELDS.PICKUP_DETAIL_ID],
      row[RETURN_FIELDS.PICKUP_ID],
    );

    if (resolved && resolved.success === false) {
      return resolved;
    }

    const availableQty =
      Number(resolved.pickupDetail[PICKUP_DETAIL_FIELDS.QTY]) -
      activeReturnedQty(row[RETURN_FIELDS.PICKUP_DETAIL_ID]);

    return Response.success({
      return: enrichReturnRow(row, buildReturnDisplayContext()),

      pickupHeader: resolved.pickupHeader,

      pickupDetail: resolved.pickupDetail,

      availableQty,
    });
  }

  function createCore(document, key) {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return Response.error("Data Return wajib diisi.");
    }

    return withReturnMutationLock(() => {
      const businessDocument = Object.assign({}, document);
      delete businessDocument.IdempotencyKey;

      if (!key) {
        const legacy = createLocked(businessDocument, IDGenerator.generate(RETURN_SCHEMA));
        if (legacy && legacy.meta) legacy.meta.idempotency = "LEGACY_UNPROTECTED";
        return legacy;
      }

      const normalized = normalizeReturnIdempotencyPayload(businessDocument);
      return IdempotencyService.execute({
        key,
        operation: "RETURN_CREATE",
        normalizedPayload: normalized,
        generateResourceId: () => IDGenerator.generate(RETURN_SCHEMA),
        execute: (resourceId) => createLocked(businessDocument, resourceId),
        recover(resourceId) {
          const row = activeReturn(resourceId);
          if (!row) return null;
          const recoveredPayload = normalizeReturnIdempotencyPayload(row);
          if (IdempotencyService.payloadHash(recoveredPayload) !== IdempotencyService.payloadHash(normalized)) {
            return Response.error("Resource Return idempotensi tidak sesuai dengan payload tersimpan.");
          }
          return Response.success(row, `${RETURN_SCHEMA.NAME} berhasil dibuat.`);
        },
      });
    });
  }

  function create(document) {
    const key = String(document && document.IdempotencyKey || "").trim();
    if (!key) {
      return Response.error("IdempotencyKey wajib diisi untuk membuat Return.");
    }
    return createCore(document, key);
  }

  function createInternal(document) {
    return createCore(document, "");
  }

  function update(id, document) {
    if (!isPresent(id)) {
      return Response.error("ID Return wajib diisi.");
    }

    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return Response.error("Data Return wajib diisi.");
    }

    return withReturnMutationLock(() => {
      const before = activeReturn(id);
      try {
        return base.update(id, Utils.pick(document, [
          RETURN_FIELDS.DATE,

          RETURN_FIELDS.QTY,

          RETURN_FIELDS.NOTE,
        ]));
      } catch (error) {
        Logger.log(`[RETURN_FORWARD_FAILURE] operation=UPDATE id=${id} error=${String(error.message || error)}`);
        if (before && rollbackReturnRow("UPDATE", before, null)) {
          return Response.error("Gagal memperbarui Return. Perubahan dibatalkan.");
        }
        return Response.error("Gagal memperbarui Return. Rollback tidak dapat dijamin sepenuhnya; periksa data secara manual.");
      }
    });
  }

  function remove(id) {
    if (!isPresent(id)) {
      return Response.error("ID Return wajib diisi.");
    }

    return withReturnMutationLock(() => {
      const before = activeReturn(id);
      try {
        return base.remove(id);
      } catch (error) {
        Logger.log(`[RETURN_FORWARD_FAILURE] operation=DELETE id=${id} error=${String(error.message || error)}`);
        if (before && rollbackReturnRow("DELETE", before, null)) {
          return Response.error("Gagal menghapus Return. Perubahan dibatalkan.");
        }
        return Response.error("Gagal menghapus Return. Rollback tidak dapat dijamin sepenuhnya; periksa data secara manual.");
      }
    });
  }

  function restore(id) {
    if (!isPresent(id)) {
      return Response.error("ID Return wajib diisi.");
    }

    return withReturnMutationLock(() => {
      const before = deletedReturn(id);
      try {
        return base.restore(id);
      } catch (error) {
        Logger.log(`[RETURN_FORWARD_FAILURE] operation=RESTORE id=${id} error=${String(error.message || error)}`);
        if (before && rollbackReturnRow("RESTORE", before, null)) {
          return Response.error("Gagal memulihkan Return. Perubahan dibatalkan.");
        }
        return Response.error("Gagal memulihkan Return. Rollback tidak dapat dijamin sepenuhnya; periksa data secara manual.");
      }
    });
  }

  return Object.freeze({
    findAll,

    findDeleted,

    findById,

    create,

    createInternal,

    update,

    remove,

    restore,
  });
}
