/**
 * =============================================================================
 * FILE        : 110.Service.Pickup.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Pickup Service
 * =============================================================================
 *
 * Business Rule Pickup.
 *
 * =============================================================================
 */

function PickupService(options) {
  const serviceOptions = options || {};
  const DETAIL_MUTATION_BLOCKED =
    "Detail pickup tidak dapat diubah karena sudah memiliki riwayat retur.";
  const DELETE_BLOCKED =
    "Pickup tidak dapat dihapus karena sudah memiliki riwayat retur.";
  const RESTORE_BLOCKED =
    "Pickup belum dapat dipulihkan karena riwayat detail tidak dapat dipastikan dengan aman.";

  function normalizeTanggal(value) {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return Response.error("Tanggal tidak valid.");
      }

      return Utilities.formatDate(value, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
    }

    if (typeof value !== "string") {
      return Response.error(
        "Tanggal harus berupa Date, YYYY-MM-DD, atau ISO timestamp.",
      );
    }

    const text = value.trim();

    if (!text) {
      return Response.error("Tanggal wajib diisi.");
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const parts = text.split("-").map(Number);
      const parsed = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

      if (
        parsed.getUTCFullYear() !== parts[0] ||
        parsed.getUTCMonth() !== parts[1] - 1 ||
        parsed.getUTCDate() !== parts[2]
      ) {
        return Response.error("Tanggal tidak valid.");
      }

      return text;
    }

    const isoTimestamp = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
    const isoMatch = isoTimestamp.exec(text);

    if (!isoMatch) {
      return Response.error(
        "Tanggal harus berupa Date, YYYY-MM-DD, atau ISO timestamp.",
      );
    }

    const isoParts = isoMatch.slice(1, 4).map(Number);
    const isoDate = new Date(
      Date.UTC(isoParts[0], isoParts[1] - 1, isoParts[2]),
    );
    const timestamp = new Date(text);

    if (
      isoDate.getUTCFullYear() !== isoParts[0] ||
      isoDate.getUTCMonth() !== isoParts[1] - 1 ||
      isoDate.getUTCDate() !== isoParts[2] ||
      Number.isNaN(timestamp.getTime())
    ) {
      return Response.error("Tanggal tidak valid.");
    }

    return Utilities.formatDate(timestamp, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
  }

  function validateDocument(document) {
    const header = document.header;
    const details = document.details;
    const normalizedDate = normalizeTanggal(header[PICKUP_HEADER_FIELDS.DATE]);

    if (normalizedDate && normalizedDate.success === false) {
      return normalizedDate;
    }

    if (!header[PICKUP_HEADER_FIELDS.PARTNER_ID]) {
      return Response.error("Partner wajib diisi.");
    }

    const partner = RepositoryReader.findById(
      PARTNER_SCHEMA,
      header[PICKUP_HEADER_FIELDS.PARTNER_ID],
    );

    if (!partner || partner[PARTNER_SCHEMA.SYSTEM.IS_ACTIVE] !== true) {
      return Response.error("Partner tidak ditemukan atau tidak aktif.");
    }

    const productIds = Object.create(null);
    let totalQty = 0;

    for (let index = 0; index < details.length; index++) {
      const detail = details[index];

      if (!detail || typeof detail !== "object" || Array.isArray(detail)) {
        return Response.error("Detail pickup tidak valid.");
      }

      const productId = detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID];
      if (!productId) return Response.error("Produk wajib diisi.");
      if (productIds[productId]) {
        return Response.error("Produk tidak boleh duplikat.");
      }

      const product = RepositoryReader.findById(PRODUCT_SCHEMA, productId);
      if (!product || product[PRODUCT_SCHEMA.SYSTEM.IS_ACTIVE] !== true) {
        return Response.error("Produk tidak ditemukan atau tidak aktif.");
      }

      const qty = Number(detail[PICKUP_DETAIL_FIELDS.QTY]);
      if (!Number.isFinite(qty) || qty <= 0) {
        return Response.error("Qty harus lebih besar dari 0.");
      }

      productIds[productId] = true;
      totalQty += qty;
    }

    return {
      header: Object.assign({}, header, {
        [PICKUP_HEADER_FIELDS.DATE]: normalizedDate,
        [PICKUP_HEADER_FIELDS.TOTAL_ITEM]: details.length,
        [PICKUP_HEADER_FIELDS.TOTAL_QTY]: totalQty,
      }),
      details,
    };
  }

  function validateDocumentShape(document) {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return Response.error("Dokumen transaksi wajib diisi.");
    }
    if (
      !document.header ||
      typeof document.header !== "object" ||
      Array.isArray(document.header)
    ) {
      return Response.error("Header transaksi wajib diisi.");
    }
    if (!Array.isArray(document.details)) {
      return Response.error("Detail transaksi harus berupa array.");
    }
    if (document.details.length === 0) {
      return Response.error("Detail transaksi wajib diisi.");
    }
    return null;
  }

  function physicalRows(schema) {
    if (typeof serviceOptions.readPhysicalRows === "function") {
      return serviceOptions.readPhysicalRows(schema).slice();
    }
    return RepositoryBase.mapRows(schema, RepositoryReader.raw(schema));
  }

  function evaluateRestoreEligibilityFromRows(pickupId, headers, details, returns) {
    const header = headers.find((row) => {
      return row[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] === pickupId;
    });
    const pickupDetails = details.filter((detail) => {
      return detail[PICKUP_DETAIL_FIELDS.PICKUP_ID] === pickupId;
    });
    const pickupDetailIds = Object.create(null);
    const detailById = Object.create(null);
    const productDetailIds = Object.create(null);

    details.forEach((detail) => {
      detailById[detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]] = detail;
    });
    pickupDetails.forEach((detail) => {
      const detailId = detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY];
      const productId = detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID];
      pickupDetailIds[detailId] = true;
      if (!productDetailIds[productId]) productDetailIds[productId] = [];
      productDetailIds[productId].push(detailId);
    });

    const relatedReturns = returns.filter((row) => {
      return (
        row[RETURN_FIELDS.PICKUP_ID] === pickupId ||
        pickupDetailIds[row[RETURN_FIELDS.PICKUP_DETAIL_ID]] === true
      );
    });
    const referencedDetailIds = Array.from(
      new Set(
        relatedReturns.map((row) => row[RETURN_FIELDS.PICKUP_DETAIL_ID]),
      ),
    ).sort();
    const duplicateProducts = Object.keys(productDetailIds)
      .filter((productId) => productDetailIds[productId].length > 1)
      .sort();
    const generationCount = Object.keys(productDetailIds).reduce(
      (maximum, productId) =>
        Math.max(maximum, productDetailIds[productId].length),
      0,
    );
    const facts = {
      detailCount: pickupDetails.length,
      activeDetailCount: pickupDetails.filter(
        (detail) =>
          detail[PICKUP_DETAIL_SCHEMA.SYSTEM.IS_ACTIVE] === true &&
          detail[PICKUP_DETAIL_SCHEMA.SYSTEM.IS_DELETED] !== true,
      ).length,
      deletedDetailCount: pickupDetails.filter(
        (detail) => detail[PICKUP_DETAIL_SCHEMA.SYSTEM.IS_DELETED] === true,
      ).length,
      returnCount: relatedReturns.length,
      duplicateProducts,
      referencedDetailIds,
      generationCount,
    };

    function result(allowed, code, message) {
      return { allowed, code, message, facts };
    }

    if (!header) {
      return result(false, "NOT_FOUND", "Pickup tidak ditemukan.");
    }
    if (header[PICKUP_HEADER_SCHEMA.SYSTEM.IS_DELETED] !== true) {
      return result(false, "NOT_DELETED", "Pickup belum dihapus.");
    }
    if (duplicateProducts.length > 0) {
      return result(
        false,
        "MULTIPLE_DETAIL_GENERATIONS",
        "Pickup memiliki lebih dari satu generasi detail untuk produk yang sama.",
      );
    }

    const referencedProducts = Object.create(null);
    let ambiguousReturnHistory = false;
    let missingPickupDetail = false;
    let relationshipMismatch = false;

    relatedReturns.forEach((row) => {
      const detailId = row[RETURN_FIELDS.PICKUP_DETAIL_ID];
      const detail = detailById[detailId];
      if (!detail) {
        missingPickupDetail = true;
        return;
      }

      const productId = detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID];
      if (!referencedProducts[productId]) {
        referencedProducts[productId] = Object.create(null);
      }
      referencedProducts[productId][detailId] = true;
      if (Object.keys(referencedProducts[productId]).length > 1) {
        ambiguousReturnHistory = true;
      }
      if (
        row[RETURN_FIELDS.PICKUP_ID] !== pickupId ||
        detail[PICKUP_DETAIL_FIELDS.PICKUP_ID] !== pickupId ||
        row[RETURN_FIELDS.PICKUP_ID] !==
          detail[PICKUP_DETAIL_FIELDS.PICKUP_ID]
      ) {
        relationshipMismatch = true;
      }
    });

    if (ambiguousReturnHistory) {
      return result(
        false,
        "AMBIGUOUS_RETURN_HISTORY",
        "Riwayat retur mengacu ke lebih dari satu detail untuk produk yang sama.",
      );
    }
    if (missingPickupDetail) {
      return result(
        false,
        "MISSING_PICKUP_DETAIL",
        "Riwayat retur mengacu ke detail Pickup yang tidak ditemukan.",
      );
    }
    if (relationshipMismatch) {
      return result(
        false,
        "RETURN_RELATIONSHIP_MISMATCH",
        "Relasi Pickup pada riwayat retur tidak konsisten.",
      );
    }
    return result(true, "SAFE", "Pickup aman untuk dipulihkan.");
  }

  function evaluateRestoreEligibility(pickupId) {
    const headers = physicalRows(PICKUP_HEADER_SCHEMA);
    const header = headers.find((row) => {
      return row[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] === pickupId;
    });
    if (
      !header ||
      header[PICKUP_HEADER_SCHEMA.SYSTEM.IS_DELETED] !== true
    ) {
      return evaluateRestoreEligibilityFromRows(pickupId, headers, [], []);
    }
    return evaluateRestoreEligibilityFromRows(
      pickupId,
      headers,
      physicalRows(PICKUP_DETAIL_SCHEMA),
      physicalRows(RETURN_SCHEMA),
    );
  }

  function listDeleted(options) {
    const request = options === undefined ? {} : options;
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      return Response.error("Opsi daftar Pickup tidak valid.");
    }
    if (
      request.search !== undefined &&
      request.search !== null &&
      typeof request.search !== "string"
    ) {
      return Response.error("Pencarian Pickup harus berupa teks.");
    }

    const headers = physicalRows(PICKUP_HEADER_SCHEMA);
    const details = physicalRows(PICKUP_DETAIL_SCHEMA);
    const partners = physicalRows(PARTNER_SCHEMA);
    const products = physicalRows(PRODUCT_SCHEMA);
    const partnerById = Object.create(null);
    const productById = Object.create(null);

    partners.forEach((partner) => {
      partnerById[partner[PARTNER_SCHEMA.PRIMARY_KEY]] = partner;
    });
    products.forEach((product) => {
      productById[product[PRODUCT_SCHEMA.PRIMARY_KEY]] = product;
    });

    const search = String(request.search || "").trim().toLowerCase();
    const rows = headers
      .filter((header) => {
        return header[PICKUP_HEADER_SCHEMA.SYSTEM.IS_DELETED] === true;
      })
      .filter((header) => {
        if (!search) return true;
        return [
          header[PICKUP_HEADER_FIELDS.NUMBER],
          header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY],
          header[PICKUP_HEADER_FIELDS.PARTNER_ID],
          header[PICKUP_HEADER_FIELDS.STATUS],
          header[PICKUP_HEADER_FIELDS.NOTES],
        ].some((value) => String(value || "").toLowerCase().includes(search));
      })
      .map((header) => {
        const pickupId = header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY];
        const partnerId = header[PICKUP_HEADER_FIELDS.PARTNER_ID];
        const partner = partnerById[partnerId];
        const pickupDetails = details
          .filter((detail) => {
            return detail[PICKUP_DETAIL_FIELDS.PICKUP_ID] === pickupId;
          })
          .map((detail) => {
            const productId = detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID];
            const product = productById[productId];
            return Object.assign({}, detail, {
              productName: product ? product[PRODUCT_FIELDS.NAME] : "",
              [PICKUP_DETAIL_FIELDS.QTY]: Number(
                detail[PICKUP_DETAIL_FIELDS.QTY],
              ),
            });
          });
        const totalQty = pickupDetails.reduce((total, detail) => {
          const qty = detail[PICKUP_DETAIL_FIELDS.QTY];
          return total + (Number.isFinite(qty) ? qty : 0);
        }, 0);
        const normalizedDate = normalizeTanggal(
          header[PICKUP_HEADER_FIELDS.DATE],
        );

        return Object.assign({}, header, {
          [PICKUP_HEADER_FIELDS.DATE]:
            normalizedDate && normalizedDate.success === false
              ? header[PICKUP_HEADER_FIELDS.DATE]
              : normalizedDate,
          [PICKUP_HEADER_FIELDS.TOTAL_QTY]: totalQty,
          partnerName: partner ? partner[PARTNER_FIELDS.NAME] : "",
          details: pickupDetails,
          detailSummary: pickupDetails
            .map((detail) => {
              const name = detail.productName || detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID];
              return `${name} (${detail[PICKUP_DETAIL_FIELDS.QTY]})`;
            })
            .join(", "),
          restoreEligibility: evaluateRestoreEligibility(pickupId),
        });
      });

    rows.sort((left, right) => {
      const dateOrder = String(right[PICKUP_HEADER_FIELDS.DATE] || "").localeCompare(
        String(left[PICKUP_HEADER_FIELDS.DATE] || ""),
      );
      if (dateOrder !== 0) return dateOrder;
      return String(left[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] || "").localeCompare(
        String(right[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] || ""),
      );
    });

    return Response.success(rows);
  }

  function hasReturnHistory(pickupId) {
    const detailIds = Object.create(null);
    physicalRows(PICKUP_DETAIL_SCHEMA).forEach((detail) => {
      if (detail[PICKUP_DETAIL_FIELDS.PICKUP_ID] === pickupId) {
        detailIds[detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]] = true;
      }
    });

    return physicalRows(RETURN_SCHEMA).some((row) => {
      return (
        row[RETURN_FIELDS.PICKUP_ID] === pickupId ||
        detailIds[row[RETURN_FIELDS.PICKUP_DETAIL_ID]] === true
      );
    });
  }

  function pickupPhysicalDetails(pickupId) {
    return physicalRows(PICKUP_DETAIL_SCHEMA).filter((detail) => {
      return detail[PICKUP_DETAIL_FIELDS.PICKUP_ID] === pickupId;
    });
  }

  function semanticDetail(detail) {
    const qty = Number(detail[PICKUP_DETAIL_FIELDS.QTY]);
    if (!Number.isFinite(qty)) return null;

    return JSON.stringify([
      String(detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID] || "").trim(),
      qty,
      String(detail[PICKUP_DETAIL_FIELDS.NOTES] || "").trim(),
    ]);
  }

  function detailsAreEquivalent(current, submitted) {
    if (current.length !== submitted.length) return false;
    const left = current.map(semanticDetail);
    const right = submitted.map(semanticDetail);
    if (
      left.some((item) => item === null) ||
      right.some((item) => item === null)
    ) {
      return false;
    }
    left.sort();
    right.sort();
    return left.every((item, index) => item === right[index]);
  }

  const transaction = TransactionService.create({
    headerSchema: PICKUP_HEADER_SCHEMA,

    detailSchema: PICKUP_DETAIL_SCHEMA,

    detailForeignKey: PICKUP_DETAIL_FIELDS.PICKUP_ID,

    hooks: {
      beforeCreate(document) {
        return validateDocument(document);
      },

      beforeInsert(header) {
        header[PICKUP_HEADER_FIELDS.NUMBER] =
          header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY];
      },

      beforeUpdate(document) {
        const validation = this.beforeCreate(document);

        if (validation && validation.success === false) {
          return validation;
        }

        return {
          header: {
            [PICKUP_HEADER_FIELDS.DATE]:
              validation.header[PICKUP_HEADER_FIELDS.DATE],

            [PICKUP_HEADER_FIELDS.PARTNER_ID]:
              validation.header[PICKUP_HEADER_FIELDS.PARTNER_ID],

            [PICKUP_HEADER_FIELDS.TOTAL_ITEM]:
              validation.header[PICKUP_HEADER_FIELDS.TOTAL_ITEM],

            [PICKUP_HEADER_FIELDS.TOTAL_QTY]:
              validation.header[PICKUP_HEADER_FIELDS.TOTAL_QTY],

            [PICKUP_HEADER_FIELDS.NOTES]:
              validation.header[PICKUP_HEADER_FIELDS.NOTES],
          },

          details: validation.details,
        };
      },
    },
  });

  function update(id, document) {
    const shapeValidation = validateDocumentShape(document);
    if (shapeValidation) return shapeValidation;

    const validation = validateDocument(document);
    if (validation && validation.success === false) return validation;

    const current = transaction.findById(id);
    if (!current.success) return current;

    const historyExists = hasReturnHistory(id);
    if (!historyExists) return transaction.update(id, document);

    if (!detailsAreEquivalent(current.data.details, validation.details)) {
      return Response.error(DETAIL_MUTATION_BLOCKED);
    }

    const changes = {
      [PICKUP_HEADER_FIELDS.DATE]: validation.header[PICKUP_HEADER_FIELDS.DATE],
      [PICKUP_HEADER_FIELDS.PARTNER_ID]:
        validation.header[PICKUP_HEADER_FIELDS.PARTNER_ID],
      [PICKUP_HEADER_FIELDS.TOTAL_ITEM]:
        validation.header[PICKUP_HEADER_FIELDS.TOTAL_ITEM],
      [PICKUP_HEADER_FIELDS.TOTAL_QTY]:
        validation.header[PICKUP_HEADER_FIELDS.TOTAL_QTY],
      [PICKUP_HEADER_FIELDS.NOTES]: validation.header[PICKUP_HEADER_FIELDS.NOTES],
      [PICKUP_HEADER_SCHEMA.SYSTEM.UPDATED_AT]: Utils.now(),
      [PICKUP_HEADER_SCHEMA.SYSTEM.UPDATED_BY]: Utils.currentUser(),
    };

    try {
      if (!RepositoryWriter.update(PICKUP_HEADER_SCHEMA, id, changes)) {
        return Response.error("Gagal memperbarui header transaksi.");
      }
    } catch (error) {
      return Response.error("Gagal memperbarui header transaksi.");
    }

    return Response.success({
      header: Object.assign({}, current.data.header, changes),
      details: current.data.details,
    });
  }

  function remove(id) {
    const physicalHeader = physicalRows(PICKUP_HEADER_SCHEMA).find((header) => {
      return header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] === id;
    });
    if (!physicalHeader) return transaction.remove(id);
    if (hasReturnHistory(id)) return Response.error(DELETE_BLOCKED);
    return transaction.remove(id);
  }

  function restore(id) {
    const header = physicalRows(PICKUP_HEADER_SCHEMA).find((row) => {
      return row[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] === id;
    });
    if (!header || header[PICKUP_HEADER_SCHEMA.SYSTEM.IS_DELETED] !== true) {
      return transaction.restore(id);
    }

    const details = pickupPhysicalDetails(id);
    const productIds = Object.create(null);

    for (let index = 0; index < details.length; index++) {
      const productId = details[index][PICKUP_DETAIL_FIELDS.PRODUCT_ID];
      if (productIds[productId]) return Response.error(RESTORE_BLOCKED);
      productIds[productId] = true;
    }

    const referencedDetailIds = Object.create(null);
    physicalRows(RETURN_SCHEMA).forEach((row) => {
      referencedDetailIds[row[RETURN_FIELDS.PICKUP_DETAIL_ID]] = true;
    });
    const referencedProducts = Object.create(null);

    for (let index = 0; index < details.length; index++) {
      const detail = details[index];
      if (!referencedDetailIds[detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]]) {
        continue;
      }
      const productId = detail[PICKUP_DETAIL_FIELDS.PRODUCT_ID];
      if (referencedProducts[productId]) return Response.error(RESTORE_BLOCKED);
      referencedProducts[productId] = true;
    }

    return transaction.restore(id);
  }

  return Object.freeze({
    findAll: transaction.findAll,
    findById: transaction.findById,
    create: transaction.create,
    update,
    remove,
    restore,
    evaluateRestoreEligibility,
    listDeleted,
  });
}
