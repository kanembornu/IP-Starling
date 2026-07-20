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

function PickupService() {
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

  return TransactionService.create({
    headerSchema: PICKUP_HEADER_SCHEMA,

    detailSchema: PICKUP_DETAIL_SCHEMA,

    detailForeignKey: PICKUP_DETAIL_FIELDS.PICKUP_ID,

    hooks: {
      beforeCreate(document) {
        const header = document.header;

        const details = document.details;

        const normalizedDate = normalizeTanggal(
          header[PICKUP_HEADER_FIELDS.DATE],
        );

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

          if (!productId) {
            return Response.error("Produk wajib diisi.");
          }

          if (productIds[productId]) {
            return Response.error("Produk tidak boleh duplikat.");
          }

          const product = RepositoryReader.findById(
            PRODUCT_SCHEMA,

            productId,
          );

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
}
