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
      headerSchema = null,
      detailSchema = null,

      beforeCreate = null,
      beforeUpdate = null,
      beforeDelete = null,
      beforeRestore = null,

      afterCreate = null,
      afterUpdate = null,
      afterDelete = null,
      afterRestore = null,
    } = config;

    /**
     * ------------------------------------------------------------------------
     * Find All
     * ------------------------------------------------------------------------
     */
    function findAll() {
      throw new Error("TransactionService.findAll() not implemented.");
    }

    /**
     * ------------------------------------------------------------------------
     * Find By Id
     * ------------------------------------------------------------------------
     */
    function findById(id) {
      throw new Error("TransactionService.findById() not implemented.");
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

      beforeCreate,
      beforeUpdate,
      beforeDelete,
      beforeRestore,

      afterCreate,
      afterUpdate,
      afterDelete,
      afterRestore,

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
