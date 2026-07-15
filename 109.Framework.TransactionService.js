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
      typeof reader.raw !== "function" ||
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
      typeof writer.update !== "function" ||
      typeof writer.softDelete !== "function" ||
      typeof writer.restore !== "function"
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

    function restoreUpdate(header, previousDetails, replacementDetails) {
      let restored = true;

      replacementDetails.forEach((detail) => {
        try {
          const detailId = detail[detailSchema.PRIMARY_KEY];

          if (
            reader.findById(detailSchema, detailId) &&
            !writer.softDelete(detailSchema, detailId)
          ) {
            restored = false;
          }
        } catch (error) {
          restored = false;
        }
      });

      previousDetails.forEach((detail) => {
        try {
          if (!writer.restore(detailSchema, detail[detailSchema.PRIMARY_KEY])) {
            restored = false;
          }
        } catch (error) {
          restored = false;
        }
      });

      try {
        if (!writer.update(headerSchema, header[headerSchema.PRIMARY_KEY], header)) {
          restored = false;
        }
      } catch (error) {
        restored = false;
      }

      return restored;
    }

    function findIncludingDeleted(schema, criteria = {}) {
      return RepositoryBase.mapRows(schema, reader.raw(schema)).filter((item) => {
        return Object.keys(criteria).every((key) => item[key] === criteria[key]);
      });
    }

    function findByIdIncludingDeleted(schema, id) {
      return (
        findIncludingDeleted(schema, {
          [schema.PRIMARY_KEY]: id,
        })[0] || null
      );
    }

    function rollbackRemove(header, details) {
      let restored = true;

      details.forEach((detail) => {
        try {
          if (!writer.restore(detailSchema, detail[detailSchema.PRIMARY_KEY])) {
            restored = false;
          }
        } catch (error) {
          restored = false;
        }
      });

      try {
        if (!writer.restore(headerSchema, header[headerSchema.PRIMARY_KEY])) {
          restored = false;
        }
      } catch (error) {
        restored = false;
      }

      return restored;
    }

    function rollbackRestore(header, details) {
      let restored = true;

      details.forEach((detail) => {
        try {
          if (!writer.softDelete(detailSchema, detail[detailSchema.PRIMARY_KEY])) {
            restored = false;
          }
        } catch (error) {
          restored = false;
        }
      });

      try {
        if (!writer.softDelete(headerSchema, header[headerSchema.PRIMARY_KEY])) {
          restored = false;
        }
      } catch (error) {
        restored = false;
      }

      return restored;
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
      if (id === null || id === undefined || String(id).trim() === "") {
        return Response.error("ID wajib diisi.");
      }

      const existingHeader = reader.findById(headerSchema, id);

      if (!existingHeader || existingHeader[headerSchema.SYSTEM.IS_ACTIVE] !== true) {
        return Response.error(`${headerSchema.NAME} tidak ditemukan atau tidak aktif.`);
      }

      let validation = validateDocument(document);

      if (validation) {
        return validation;
      }

      let transaction = {
        header: Object.assign({}, document.header),

        details: document.details.map((detail) => Object.assign({}, detail)),
      };

      transaction = runHook("beforeUpdate", transaction, existingHeader);

      if (isResponse(transaction)) {
        return transaction;
      }

      validation = validateDocument(transaction);

      if (validation) {
        return validation;
      }

      const headerChanges = sanitizeRecord(headerSchema, transaction.header);

      delete headerChanges[headerSchema.PRIMARY_KEY];

      Object.keys(headerSchema.READONLY || {}).forEach((field) => {
        delete headerChanges[field];
      });

      delete headerChanges[headerSchema.SYSTEM.IS_DELETED];
      delete headerChanges[headerSchema.SYSTEM.IS_ACTIVE];

      const now = Utils.now();
      const user = Utils.currentUser();

      headerChanges[headerSchema.SYSTEM.UPDATED_AT] = now;
      headerChanges[headerSchema.SYSTEM.UPDATED_BY] = user;

      const updatedHeader = Object.assign({}, existingHeader, headerChanges);

      validation = validateRecord(headerSchema, updatedHeader);

      if (validation) {
        return validation;
      }

      for (let index = 0; index < transaction.details.length; index++) {
        const detail = Object.assign({}, transaction.details[index], {
          [detailForeignKey]: id,
        });

        validation = validateRecord(detailSchema, detail);

        if (validation) {
          return validation;
        }
      }

      const previousDetails = reader.find(detailSchema, {
        [detailForeignKey]: id,
      });

      const replacementDetails = transaction.details.map((detail) => {
        return buildInsertRecord(
          detailSchema,

          Object.assign({}, detail, {
            [detailForeignKey]: id,
          }),

          IDGenerator.generate(detailSchema),
        );
      });

      try {
        if (!writer.update(headerSchema, id, headerChanges)) {
          return Response.error("Gagal memperbarui header transaksi.");
        }
      } catch (error) {
        return Response.error("Gagal memperbarui header transaksi.");
      }

      const deletedDetailIds = [];

      try {
        for (let index = 0; index < previousDetails.length; index++) {
          const detailId = previousDetails[index][detailSchema.PRIMARY_KEY];

          if (!writer.softDelete(detailSchema, detailId)) {
            throw new Error("Gagal menonaktifkan detail transaksi.");
          }

          deletedDetailIds.push(detailId);
        }

        if (!writer.insertMany(detailSchema, replacementDetails)) {
          throw new Error("Gagal menyimpan detail transaksi.");
        }
      } catch (error) {
        const deletedDetails = previousDetails.filter((detail) => {
          return deletedDetailIds.indexOf(detail[detailSchema.PRIMARY_KEY]) !== -1;
        });

        if (restoreUpdate(existingHeader, deletedDetails, replacementDetails)) {
          return Response.error(
            "Gagal mengganti detail transaksi. Perubahan transaksi dibatalkan.",
          );
        }

        return Response.error(
          "Gagal mengganti detail transaksi. Rollback tidak dapat dijamin sepenuhnya; periksa transaksi secara manual.",
        );
      }

      return Response.success({
        header: updatedHeader,

        details: replacementDetails,
      });
    }

    function remove(id) {
      if (id === null || id === undefined || String(id).trim() === "") {
        return Response.error("ID wajib diisi.");
      }

      const header = findByIdIncludingDeleted(headerSchema, id);

      if (!header) {
        return Response.error(`${headerSchema.NAME} tidak ditemukan.`);
      }

      const details = findIncludingDeleted(detailSchema, {
        [detailForeignKey]: id,
      });

      if (header[headerSchema.SYSTEM.IS_DELETED] === true) {
        return Response.success({
          header,

          details,
        });
      }

      try {
        if (!writer.softDelete(headerSchema, id)) {
          return Response.error("Gagal menghapus header transaksi.");
        }
      } catch (error) {
        return Response.error("Gagal menghapus header transaksi.");
      }

      const deletedDetails = [];

      try {
        for (let index = 0; index < details.length; index++) {
          const detail = details[index];

          if (detail[detailSchema.SYSTEM.IS_DELETED] === true) {
            continue;
          }

          if (!writer.softDelete(detailSchema, detail[detailSchema.PRIMARY_KEY])) {
            throw new Error("Gagal menghapus detail transaksi.");
          }

          deletedDetails.push(detail);
        }
      } catch (error) {
        if (rollbackRemove(header, deletedDetails)) {
          return Response.error(
            "Gagal menghapus detail transaksi. Perubahan transaksi dibatalkan.",
          );
        }

        return Response.error(
          "Gagal menghapus detail transaksi. Rollback tidak dapat dijamin sepenuhnya; periksa transaksi secara manual.",
        );
      }

      return Response.success({
        header: findByIdIncludingDeleted(headerSchema, id),

        details: findIncludingDeleted(detailSchema, {
          [detailForeignKey]: id,
        }),
      });
    }

    function restore(id) {
      if (id === null || id === undefined || String(id).trim() === "") {
        return Response.error("ID wajib diisi.");
      }

      const header = findByIdIncludingDeleted(headerSchema, id);

      if (!header) {
        return Response.error(`${headerSchema.NAME} tidak ditemukan.`);
      }

      const details = findIncludingDeleted(detailSchema, {
        [detailForeignKey]: id,
      });

      if (header[headerSchema.SYSTEM.IS_DELETED] !== true) {
        return Response.success({
          header,

          details: details.filter((detail) => {
            return detail[detailSchema.SYSTEM.IS_DELETED] !== true;
          }),
        });
      }

      try {
        if (!writer.restore(headerSchema, id)) {
          return Response.error("Gagal memulihkan header transaksi.");
        }
      } catch (error) {
        return Response.error("Gagal memulihkan header transaksi.");
      }

      const restoredDetails = [];

      try {
        for (let index = 0; index < details.length; index++) {
          const detail = details[index];

          if (detail[detailSchema.SYSTEM.IS_DELETED] !== true) {
            continue;
          }

          if (!writer.restore(detailSchema, detail[detailSchema.PRIMARY_KEY])) {
            throw new Error("Gagal memulihkan detail transaksi.");
          }

          restoredDetails.push(detail);
        }
      } catch (error) {
        if (rollbackRestore(header, restoredDetails)) {
          return Response.error(
            "Gagal memulihkan detail transaksi. Perubahan transaksi dibatalkan.",
          );
        }

        return Response.error(
          "Gagal memulihkan detail transaksi. Rollback tidak dapat dijamin sepenuhnya; periksa transaksi secara manual.",
        );
      }

      return Response.success({
        header: reader.findById(headerSchema, id),

        details: reader.find(detailSchema, {
          [detailForeignKey]: id,
        }),
      });
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
