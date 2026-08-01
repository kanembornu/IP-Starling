/**
 * =============================================================================
 * FILE        : 105.Service.Partner.js
 * VERSION     : 1.0.0
 * DESCRIPTION : Partner Service
 * =============================================================================
 *
 * Business Rule Partner.
 *
 * =============================================================================
 */

function PartnerService(dependencies = {}) {
  const repositoryBase = dependencies.repositoryBase || RepositoryBase;
  const repositoryReader = dependencies.repositoryReader || RepositoryReader;
  const entityFactory = dependencies.entityFactory || EntityService.create;
  const service = entityFactory(
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

  function physicalRows() {
    return repositoryBase.mapRows(PARTNER_SCHEMA, repositoryReader.raw(PARTNER_SCHEMA));
  }

  function listDeleted() {
    const rows = physicalRows()
      .filter((row) => row[PARTNER_SCHEMA.SYSTEM.IS_DELETED] === true)
      .filter((row) => String(row[PARTNER_FIELDS.ID] || "").trim() !== "")
      .sort((left, right) => String(left[PARTNER_FIELDS.ID]).localeCompare(String(right[PARTNER_FIELDS.ID])));
    return Response.success(rows);
  }

  function restore(id) {
    const cleanId = String(id || "").trim();
    if (!cleanId) return Response.error("ID Partner wajib diisi.");
    const row = physicalRows().find((item) => String(item[PARTNER_FIELDS.ID]) === cleanId);
    if (!row) return Response.error("Partner tidak ditemukan.");
    if (row[PARTNER_SCHEMA.SYSTEM.IS_DELETED] !== true) return Response.error("Partner masih aktif dan tidak dapat dipulihkan.");
    return service.restore(cleanId);
  }

  return Object.freeze({ ...service, listDeleted, restore });
}
