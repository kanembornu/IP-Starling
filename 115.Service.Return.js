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

function ReturnService() {
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
          row[RETURN_SCHEMA.SYSTEM.IS_DELETED] === true
        );
      }) || null
    );
  }

  function resolvePickup(pickupDetailId) {
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
    const pickupHeader = RepositoryReader.findById(
      PICKUP_HEADER_SCHEMA,
      pickupId,
    );

    if (!isActive(pickupHeader, PICKUP_HEADER_SCHEMA)) {
      return Response.error("Pickup Header tidak ditemukan atau tidak aktif.");
    }

    if (
      pickupDetail[PICKUP_DETAIL_FIELDS.PICKUP_ID] !== pickupId ||
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

      if (data[RETURN_FIELDS.QTY] === undefined) {
        return data;
      }

      const resolved = resolvePickup(current[RETURN_FIELDS.PICKUP_DETAIL_ID]);

      if (resolved && resolved.success === false) {
        return resolved;
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

      const resolved = resolvePickup(current[RETURN_FIELDS.PICKUP_DETAIL_ID]);

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
    const rows = RepositoryReader.findAll(RETURN_SCHEMA).filter((row) => {
      return row[RETURN_SCHEMA.SYSTEM.IS_ACTIVE] === true;
    });

    return Response.success(rows);
  }

  function findDeleted() {
    const rows = RepositoryBase.mapRows(
      RETURN_SCHEMA,
      RepositoryReader.raw(RETURN_SCHEMA),
    ).filter((row) => {
      return (
        isTrueEquivalent(row[RETURN_SCHEMA.SYSTEM.IS_DELETED]) &&
        isFalseEquivalent(row[RETURN_SCHEMA.SYSTEM.IS_ACTIVE])
      );
    });

    return Response.success(rows);
  }

  function findById(id) {
    if (!isPresent(id)) {
      return Response.error("ID Return wajib diisi.");
    }

    const row = activeReturn(id);

    if (!row) {
      return Response.error("Return tidak ditemukan.");
    }

    const resolved = resolvePickup(row[RETURN_FIELDS.PICKUP_DETAIL_ID]);

    if (resolved && resolved.success === false) {
      return resolved;
    }

    const availableQty =
      Number(resolved.pickupDetail[PICKUP_DETAIL_FIELDS.QTY]) -
      activeReturnedQty(row[RETURN_FIELDS.PICKUP_DETAIL_ID]);

    return Response.success({
      return: row,

      pickupHeader: resolved.pickupHeader,

      pickupDetail: resolved.pickupDetail,

      availableQty,
    });
  }

  function create(document) {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return Response.error("Data Return wajib diisi.");
    }

    return base.create(document);
  }

  function update(id, document) {
    if (!isPresent(id)) {
      return Response.error("ID Return wajib diisi.");
    }

    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return Response.error("Data Return wajib diisi.");
    }

    return base.update(id, Utils.pick(document, [
      RETURN_FIELDS.DATE,

      RETURN_FIELDS.QTY,

      RETURN_FIELDS.NOTE,
    ]));
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

    return base.restore(id);
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
