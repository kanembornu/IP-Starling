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
  return EntityService.create(
    PICKUP_SCHEMA,

    {
      /**
       * -----------------------------------------------------------------------
       * Before Validation
       * -----------------------------------------------------------------------
       */
      beforeValidation(data) {
        return Utils.trimObject(data);
      },

      /**
       * -----------------------------------------------------------------------
       * Before Create
       * -----------------------------------------------------------------------
       */
      beforeCreate(data) {
        /**
         * Partner harus ada
         */
        const partner = RepositoryReader.findById(
          PARTNER_SCHEMA,

          data[PICKUP_FIELDS.PARTNER_ID],
        );

        if (!partner) {
          return Response.error("Partner tidak ditemukan.");
        }

        /**
         * Product harus ada
         */
        const product = RepositoryReader.findById(
          PRODUCT_SCHEMA,

          data[PICKUP_FIELDS.PRODUCT_ID],
        );

        if (!product) {
          return Response.error("Produk tidak ditemukan.");
        }

        /**
         * Qty minimal 1
         */
        if (Number(data[PICKUP_FIELDS.QTY]) <= 0) {
          return Response.error("Qty harus lebih besar dari 0.");
        }

        return data;
      },

      /**
       * -----------------------------------------------------------------------
       * Before Update
       * -----------------------------------------------------------------------
       */
      beforeUpdate(id, data) {
        if (
          data[PICKUP_FIELDS.QTY] !== undefined &&
          Number(data[PICKUP_FIELDS.QTY]) <= 0
        ) {
          return Response.error("Qty harus lebih besar dari 0.");
        }

        return data;
      },

      /**
       * -----------------------------------------------------------------------
       * Before Delete
       * -----------------------------------------------------------------------
       */
      beforeDelete(id) {
        /**
         * Future:
         *
         * Tidak boleh dihapus apabila
         * sudah memiliki Return.
         */

        return id;
      },
    },
  );
}
