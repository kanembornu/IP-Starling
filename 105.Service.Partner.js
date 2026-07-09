/**
 * =============================================================================
 * FILE        : 105.Service.Partner.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Partner Service
 * =============================================================================
 *
 * Business Rule Partner.
 *
 * =============================================================================
 */

function PartnerService() {
  return EntityService.create(
    PARTNER_SCHEMA,

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
        const exists = RepositoryReader.exists(
          PARTNER_SCHEMA,

          {
            [PARTNER_FIELDS.NAME]: data[PARTNER_FIELDS.NAME],
          },
        );

        if (exists) {
          return Response.error("Nama partner sudah digunakan.");
        }

        return data;
      },

      /**
       * -----------------------------------------------------------------------
       * Before Update
       * -----------------------------------------------------------------------
       */
      beforeUpdate(id, data) {
        if (!data[PARTNER_FIELDS.NAME]) {
          return data;
        }

        const partner = RepositoryReader.findOne(
          PARTNER_SCHEMA,

          {
            [PARTNER_FIELDS.NAME]: data[PARTNER_FIELDS.NAME],
          },
        );

        if (partner && partner[PARTNER_FIELDS.ID] !== id) {
          return Response.error("Nama partner sudah digunakan.");
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
         * Cegah penghapusan partner
         * yang masih memiliki transaksi.
         */

        return id;
      },
    },
  );
}
