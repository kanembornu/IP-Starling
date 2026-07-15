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

    if (
      !writer ||
      typeof writer.insert !== "function" ||
      typeof writer.insertMany !== "function" ||
      typeof writer.softDelete !== "function"
    ) {
      throw new Error("TransactionService requires a compatible writer.");
    }

    function isResponse(value) {
      return (
        value &&
        typeof value === "object" &&
        Object.prototype.hasOwnProperty.call(value, "success")
      );
    }

    function runHook(name, ...args) {
      if (typeof hooks[name] !== "function") {
        return args[0];
      }

      return hooks[name](...args);
    }

    function isObject(value) {
      return value && typeof value === "object" && !Array.isArray(value);
    }

    function validateDocument(document) {
      if (!isObject(document)) {
        return Response.error("Dokumen transaksi wajib diisi.");
      }

      if (!isObject(document.header)) {
        return Response.error("Header transaksi wajib diisi.");
      }

      if (!Array.isArray(document.details)) {
        return Response.error("Detail transaksi harus berupa array.");
      }

      if (document.details.length === 0) {
        return Response.error("Detail transaksi wajib diisi.");
      }

      return null;
    }

    function validateRecord(schema, data) {
      const result = Validator.validate(schema, data);

      return result.valid ? null : Response.validation(result);
    }

    function sanitizeRecord(schema, data) {
      const record = {};

      schema.HEADERS.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
          record[field] = data[field];
        }
      });

      return record;
    }

    function buildInsertRecord(schema, data, id) {
      const now = Utils.now();

      const user = Utils.currentUser();

      return Object.assign(
        {},

        schema.DEFAULT,

        sanitizeRecord(schema, data),

        {
          [schema.PRIMARY_KEY]: id,

          [schema.SYSTEM.CREATED_AT]: now,

          [schema.SYSTEM.CREATED_BY]: user,

          [schema.SYSTEM.UPDATED_AT]: now,

          [schema.SYSTEM.UPDATED_BY]: user,

          [schema.SYSTEM.IS_DELETED]: false,

          [schema.SYSTEM.IS_ACTIVE]: true,
        },
      );
    }

    function rollbackHeader(id) {
      try {
        return writer.softDelete(headerSchema, id);
      } catch (error) {
        return false;
      }
    }

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
      let validation = validateDocument(document);

      if (validation) {
        return validation;
      }

      let transaction = {
        header: Object.assign({}, document.header),

        details: document.details.map((detail) => Object.assign({}, detail)),
      };

      transaction = runHook("beforeCreate", transaction);

      if (isResponse(transaction)) {
        return transaction;
      }

      validation = validateDocument(transaction);

      if (validation) {
        return validation;
      }

      validation = validateRecord(
        headerSchema,

        Object.assign({}, headerSchema.DEFAULT, transaction.header),
      );

      if (validation) {
        return validation;
      }

      for (let index = 0; index < transaction.details.length; index++) {
        const detail = Object.assign({}, transaction.details[index], {
          [detailForeignKey]: "__PENDING__",
        });

        validation = validateRecord(detailSchema, detail);

        if (validation) {
          return validation;
        }
      }

      const headerId = IDGenerator.generate(headerSchema);

      const header = buildInsertRecord(
        headerSchema,

        transaction.header,

        headerId,
      );

      const details = transaction.details.map((detail) => {
        return buildInsertRecord(
          detailSchema,

          Object.assign({}, detail, {
            [detailForeignKey]: headerId,
          }),

          IDGenerator.generate(detailSchema),
        );
      });

      const beforeInsert = runHook("beforeInsert", header, details);

      if (isResponse(beforeInsert)) {
        return beforeInsert;
      }

      try {
        if (!writer.insert(headerSchema, header)) {
          return Response.error("Gagal menyimpan header transaksi.");
        }
      } catch (error) {
        return Response.error("Gagal menyimpan header transaksi.");
      }

      try {
        if (writer.insertMany(detailSchema, details)) {
          return Response.success({
            header,

            details,
          });
        }
      } catch (error) {
        // Rollback dilakukan di bawah menggunakan API writer yang tersedia.
      }

      if (rollbackHeader(headerId)) {
        return Response.error(
          "Gagal menyimpan detail transaksi. Header transaksi dibatalkan.",
        );
      }

      return Response.error(
        "Gagal menyimpan detail transaksi. Header transaksi mungkin perlu dibatalkan secara manual.",
      );
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
