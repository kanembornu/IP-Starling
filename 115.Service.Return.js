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
  return EntityService.create(
    RETURN_SCHEMA,

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
         * Pickup harus ada
         */
        const pickup = RepositoryReader.findById(
          PICKUP_SCHEMA,

          data[RETURN_FIELDS.PICKUP_ID],
        );

        if (!pickup) {
          return Response.error("Pickup tidak ditemukan.");
        }

        /**
         * Qty minimal 1
         */
        if (Number(data[RETURN_FIELDS.QTY]) <= 0) {
          return Response.error("Qty harus lebih besar dari 0.");
        }

        /**
         * Qty retur tidak boleh melebihi qty pickup
         */
        if (
          Number(data[RETURN_FIELDS.QTY]) > Number(pickup[PICKUP_FIELDS.QTY])
        ) {
          return Response.error("Qty retur melebihi qty pickup.");
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
          data[RETURN_FIELDS.QTY] !== undefined &&
          Number(data[RETURN_FIELDS.QTY]) <= 0
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
         * Jika nanti terdapat settlement /
         * closing period, validasi dilakukan di sini.
         */

        return id;
      },
    },
  );
}
