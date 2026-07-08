/**
 * =============================================================================
 * FILE        : 120.Service.Purchasing.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Purchasing Service
 * =============================================================================
 *
 * Business Rule Purchasing.
 *
 * =============================================================================
 */

function PurchasingService() {

  return EntityService.create(

    PURCHASE_SCHEMA,

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
         * Supplier harus ada
         */
        const supplier = RepositoryReader.findById(

          PARTNER_SCHEMA,

          data[PURCHASE_FIELDS.SUPPLIER_ID]

        );

        if (!supplier) {

          return Response.error(

            "Supplier tidak ditemukan."

          );

        }



        /**
         * Product harus ada
         */
        const product = RepositoryReader.findById(

          PRODUCT_SCHEMA,

          data[PURCHASING_FIELDS.PRODUCT_ID]

        );

        if (!product) {

          return Response.error(

            "Produk tidak ditemukan."

          );

        }



        /**
         * Qty minimal 1
         */
        if (

          Number(data[PURCHASE_FIELDS.QTY]) <= 0

        ) {

          return Response.error(

            "Qty harus lebih besar dari 0."

          );

        }



        /**
         * Harga minimal 0
         */
        if (

          Number(data[PURCHASE_FIELDS.PRICE]) < 0

        ) {

          return Response.error(

            "Harga tidak boleh negatif."

          );

        }



        /**
         * Hitung Total Otomatis
         */
        data[PURCHASE_FIELDS.TOTAL] =

          Number(data[PURCHASING_FIELDS.QTY]) *

          Number(data[PURCHASING_FIELDS.PRICE]);



        return data;

      },



      /**
       * -----------------------------------------------------------------------
       * Before Update
       * -----------------------------------------------------------------------
       */
      beforeUpdate(id, data) {

        if (

          data[PURCHASE_FIELDS.QTY] !== undefined &&

          Number(data[PURCHASING_FIELDS.QTY]) <= 0

        ) {

          return Response.error(

            "Qty harus lebih besar dari 0."

          );

        }



        if (

          data[PURCHASE_FIELDS.PRICE] !== undefined &&

          Number(data[PURCHASE_FIELDS.PRICE]) < 0

        ) {

          return Response.error(

            "Harga tidak boleh negatif."

          );

        }



        /**
         * Recalculate Total
         */
        if (

          data[PURCHASE_FIELDS.QTY] !== undefined ||

          data[PURCHASE_FIELDS.PRICE] !== undefined

        ) {

          const current = RepositoryReader.findById(

            PURCHASE_SCHEMA,

            id

          );

          if (!current) {

            return Response.error(

              "Data purchasing tidak ditemukan."

            );

          }

          const qty =

            data[PURCHASE_FIELDS.QTY] ??

            current[PURCHASE_FIELDS.QTY];

          const price =

            data[PURCHASE_FIELDS.PRICE] ??

            current[PURCHASE_FIELDS.PRICE];

          data[PURCHASE_FIELDS.TOTAL] =

            Number(qty) *

            Number(price);

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
         * Validasi apabila purchasing
         * sudah masuk closing period.
         */

        return id;

      }

    }

  );

}