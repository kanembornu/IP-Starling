/**
 * =============================================================================
 * FILE        : 100.Service.Product.gs
 * VERSION     : 2.0.0
 * DESCRIPTION : Product Service
 * =============================================================================
 *
 * Business Rule Product.
 *
 * =============================================================================
 */

function ProductService(dependencies = {}) {
  const repositoryBase = dependencies.repositoryBase || RepositoryBase;
  const entityFactory = dependencies.entityFactory || EntityService.create;
  const service = entityFactory(
    PRODUCT_SCHEMA,

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
          PRODUCT_SCHEMA,

          {
            [PRODUCT_FIELDS.NAME]: data[PRODUCT_FIELDS.NAME],
          },
        );

        if (exists) {
          return Response.error("Nama produk sudah digunakan.");
        }

        return data;
      },

      /**
       * -----------------------------------------------------------------------
       * Before Update
       * -----------------------------------------------------------------------
       */
      beforeUpdate(id, data) {
        if (!data[PRODUCT_FIELDS.NAME]) {
          return data;
        }

        const product = RepositoryReader.findOne(
          PRODUCT_SCHEMA,

          {
            [PRODUCT_FIELDS.NAME]: data[PRODUCT_FIELDS.NAME],
          },
        );

        if (product && product[PRODUCT_FIELDS.ID] !== id) {
          return Response.error("Nama produk sudah digunakan.");
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
         * Cek apakah produk sudah dipakai transaksi.
         */

        return id;
      },
    },
  );

  function physicalRows() {
    return repositoryBase.mapRows(PRODUCT_SCHEMA, repositoryBase.rows(PRODUCT_SCHEMA));
  }

  function listDeleted() {
    const rows = physicalRows()
      .filter((row) => row[PRODUCT_SCHEMA.SYSTEM.IS_DELETED] === true)
      .filter((row) => String(row[PRODUCT_FIELDS.ID] || "").trim() !== "")
      .sort((left, right) => String(left[PRODUCT_FIELDS.ID]).localeCompare(String(right[PRODUCT_FIELDS.ID])));
    return Response.success(rows);
  }

  function restore(id) {
    const productId = String(id || "").trim();
    if (!productId) return Response.error("Product ID wajib diisi.");
    const product = physicalRows().find((row) => String(row[PRODUCT_FIELDS.ID]) === productId) || null;
    if (!product) return Response.error("Product tidak ditemukan.");
    if (product[PRODUCT_SCHEMA.SYSTEM.IS_DELETED] !== true) return Response.error("Product masih aktif dan tidak dapat dipulihkan.");
    return service.restore(productId);
  }

  return Object.freeze({ ...service, listDeleted, restore });
}
