/**
 * =============================================================================
 * FILE        : 109.Framework.TransactionService.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Transaction Service Framework
 * =============================================================================
 *
 * Generic framework for Header-Detail transaction.
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
      headerSchema,

      detailSchema,

      detailForeignKey,

      reader = RepositoryReader,

      writer = RepositoryWriter,

      hooks = {},
    } = config;

    if (!headerSchema) {
      throw new Error("TransactionService requires headerSchema.");
    }

    if (!detailSchema) {
      throw new Error("TransactionService requires detailSchema.");
    }

    if (typeof detailForeignKey !== "string" || !detailForeignKey.trim()) {
      throw new Error("TransactionService requires detailForeignKey.");
    }

    if (
      !reader ||
      typeof reader.findAll !== "function" ||
      typeof reader.findById !== "function" ||
      typeof reader.find !== "function"
    ) {
      throw new Error("TransactionService requires a compatible reader.");
    }

    const transactionHooks = hooks;
    const transactionWriter = writer;

    /**
     * ------------------------------------------------------------------------
     * Find All Header
     * ------------------------------------------------------------------------
     */
    function findAll() {
      return Response.success(reader.findAll(headerSchema));
    }

    /**
     * ------------------------------------------------------------------------
     * Find Transaction
     * ------------------------------------------------------------------------
     */
    function findById(id) {
      if (id === null || id === undefined || String(id).trim() === "") {
        return Response.error("ID wajib diisi.");
      }

      const header = reader.findById(headerSchema, id);

      if (!header) {
        return Response.error(`${headerSchema.NAME} tidak ditemukan.`);
      }

      const details = reader.find(detailSchema, {
        [detailForeignKey]: id,
      });

      return Response.success({
        header,

        details,
      });
    }

    /**
     * ------------------------------------------------------------------------
     * Write Operations
     * ------------------------------------------------------------------------
     */
    function createItem(document) {
      throw new Error("TransactionService.create() not implemented.");
    }

    function update(id, document) {
      throw new Error("TransactionService.update() not implemented.");
    }

    function remove(id) {
      throw new Error("TransactionService.remove() not implemented.");
    }

    function restore(id) {
      throw new Error("TransactionService.restore() not implemented.");
    }

    return Object.freeze({
      findAll,

      findById,

      create: createItem,

      update,

      remove,

      restore,
    });
  }

  return Object.freeze({
    create,
  });
})();
