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
  return TransactionService.create({
    headerSchema: PICKUP_HEADER_SCHEMA,

    detailSchema: PICKUP_DETAIL_SCHEMA,

    detailForeignKey: PICKUP_DETAIL_FIELDS.PICKUP_ID,

    hooks: {
      beforeCreate(document) {
        const header = document.header;

        const details = document.details;

        if (!header[PICKUP_HEADER_FIELDS.DATE]) {
          return Response.error("Tanggal wajib diisi.");
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
    },
  });
}
