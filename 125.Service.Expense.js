/**
 * =============================================================================
 * FILE        : 125.Service.Expense.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Expense Service
 * =============================================================================
 *
 * Business Rule Expense.
 *
 * =============================================================================
 */

function ExpenseService() {
  return EntityService.create(
    EXPENSE_SCHEMA,

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
         * Nominal tidak boleh negatif
         */
        if (Number(data[EXPENSE_FIELDS.AMOUNT]) < 0) {
          return Response.error("Nominal tidak boleh negatif.");
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
          data[EXPENSE_FIELDS.AMOUNT] !== undefined &&
          Number(data[EXPENSE_FIELDS.AMOUNT]) < 0
        ) {
          return Response.error("Nominal tidak boleh negatif.");
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
         * Validasi apabila expense
         * sudah masuk closing period.
         */

        return id;
      },
    },
  );
}
