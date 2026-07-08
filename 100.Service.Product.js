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

function ProductService() {

  return EntityService.create(

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

            [PRODUCT_FIELDS.NAME]:
              data[PRODUCT_FIELDS.NAME]

          }

        );

        if (exists) {

          return Response.error(

            "Nama produk sudah digunakan."

          );

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

            [PRODUCT_FIELDS.NAME]:
              data[PRODUCT_FIELDS.NAME]

          }

        );

        if (

          product &&

          product[PRODUCT_FIELDS.ID] !== id

        ) {

          return Response.error(

            "Nama produk sudah digunakan."

          );

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

      }

    }

  );

}