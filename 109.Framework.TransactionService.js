/**
 * =============================================================================
 * FILE        : 109.Framework.TransactionService.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Transaction Service Framework
 * =============================================================================
 *
 * Generic framework for Header-Detail transaction.
 *
 * Used by:
 * - Pickup
 * - Return
 * - Purchasing
 *
 * =============================================================================
 */

const TransactionService = (() => {
  /**
   * --------------------------------------------------------------------------
   * Factory
   * --------------------------------------------------------------------------
   */
  function create(config = {}) {
    const {
      beforeCreate = null,

      beforeUpdate = null,

      beforeDelete = null,

      beforeRestore = null,

      afterCreate = null,

      afterUpdate = null,

      afterDelete = null,

      afterRestore = null,
    } = hooks;

    /**
     * ------------------------------------------------------------------------
     * Find All Header
     * ------------------------------------------------------------------------
     */
    function findAll() {
      const response = reader.findAll(headerSchema);

      if (!response.success) {
        return response;
      }

      return Response.success(response.data);
    }

    /**
     * ------------------------------------------------------------------------
     * Find Transaction
     * ------------------------------------------------------------------------
     */
    function findById(id) {
      const header = reader.findById(headerSchema, id);

      if (!header.success) {
        return header;
      }

      const details = reader.findAll(detailSchema);

      if (!details.success) {
        return details;
      }

      const fk = detailSchema.FIELDS.PICKUP_ID;

      const rows = details.data.filter((item) => {
        return item[fk] === id;
      });

      return Response.success({
        header: header.data,

        details: rows,
      });
    }

    /**
     * ------------------------------------------------------------------------
     * Create
     * ------------------------------------------------------------------------
     */
    function create(document) {
      throw new Error("TransactionService.create() not implemented.");
    }

    /**
     * ------------------------------------------------------------------------
     * Update
     * ------------------------------------------------------------------------
     */
    function update(id, document) {
      throw new Error("TransactionService.update() not implemented.");
    }

    /**
     * ------------------------------------------------------------------------
     * Remove
     * ------------------------------------------------------------------------
     */
    function remove(id) {
      throw new Error("TransactionService.remove() not implemented.");
    }

    /**
     * ------------------------------------------------------------------------
     * Restore
     * ------------------------------------------------------------------------
     */
    function restore(id) {
      throw new Error("TransactionService.restore() not implemented.");
    }

    return Object.freeze({
      headerSchema,

      detailSchema,

      reader,

      writer,

      findAll,

      findById,

      create,

      update,

      remove,

      restore,
    });
  }

  return Object.freeze({
    create,
  });
})();
