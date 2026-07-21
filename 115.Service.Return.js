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
  const PRODUCT_NOT_FOUND = "Produk tidak ditemukan";
  const PRODUCT_DETAIL_NOT_FOUND =
    "Produk tidak tersedia karena detail Pickup tidak ditemukan";
  const PARTNER_NOT_FOUND = "Mitra tidak ditemukan";
  const PARTNER_PICKUP_NOT_FOUND =
    "Mitra tidak tersedia karena Pickup tidak ditemukan";
  const getReturnMutationLock =
    options.getMutationLock || (() => LockService.getScriptLock());

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

    if (!RepositoryWriter.insert(RETURN_SCHEMA, object)) {
      return Response.error("Gagal menyimpan data.");
    }

    RepositoryCache.clear(RETURN_SCHEMA);

    return Response.success(
      RepositoryReader.findById(RETURN_SCHEMA, id),
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

    beforeDelete(id) {
      return activeReturn(id) || Response.error("Return tidak ditemukan.");
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
    const rows = physicalRows(RETURN_SCHEMA).filter((row) => {
      return (
        isTrueEquivalent(row[RETURN_SCHEMA.SYSTEM.IS_DELETED]) &&
        isFalseEquivalent(row[RETURN_SCHEMA.SYSTEM.IS_ACTIVE])
      );
    });

    return Response.success(enrichReturnRows(rows));
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

  function create(document) {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return Response.error("Data Return wajib diisi.");
    }

    const id = IDGenerator.generate(RETURN_SCHEMA);

    return withReturnMutationLock(() => createLocked(document, id));
  }

  function update(id, document) {
    if (!isPresent(id)) {
      return Response.error("ID Return wajib diisi.");
    }

    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return Response.error("Data Return wajib diisi.");
    }

    return withReturnMutationLock(() => {
      return base.update(id, Utils.pick(document, [
        RETURN_FIELDS.DATE,

        RETURN_FIELDS.QTY,

        RETURN_FIELDS.NOTE,
      ]));
    });
  }

  function remove(id) {
    if (!isPresent(id)) {
      return Response.error("ID Return wajib diisi.");
    }

    return base.remove(id);
  }

  function restore(id) {
    if (!isPresent(id)) {
      return Response.error("ID Return wajib diisi.");
    }

    return withReturnMutationLock(() => base.restore(id));
  }

  return Object.freeze({
    findAll,

    findDeleted,

    findById,

    create,

    update,

    remove,

    restore,
  });
}
