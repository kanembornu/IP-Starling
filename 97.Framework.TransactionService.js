/**
 * =============================================================================
 * FILE        : 97.Framework.TransactionService.js
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
    const auditMutation = config.auditMutation || (writer === RepositoryWriter ? BaseService.auditMutation : () => {});
    const getMutationLock = config.getMutationLock || (() => LockService.getScriptLock());
    const mutationLockTimeoutMs = Number(config.mutationLockTimeoutMs) || 10000;
    const failureInjector = typeof config.failureInjector === "function"
      ? config.failureInjector
      : null;
    const generateId = typeof config.generateId === "function"
      ? config.generateId
      : IDGenerator.generate;
    const mapRows = typeof config.mapRows === "function"
      ? config.mapRows
      : RepositoryBase.mapRows;
    const clearCache = typeof config.clearCache === "function"
      ? config.clearCache
      : (schema) => RepositoryCache.clear(schema);

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
      typeof writer.restore !== "function" ||
      typeof writer.replace !== "function" ||
      typeof writer.rollbackInsert !== "function"
    ) {
      throw new Error("TransactionService requires a compatible writer.");
    }

    function injectFailure(stage, context) {
      if (failureInjector) failureInjector(stage, context || {});
    }

    function logRollbackFailure(operation, stage, id, error) {
      const context = {
        operation,
        stage,
        id,
        error: String(error && error.message ? error.message : error),
      };
      Logger.log(`[TRANSACTION_ROLLBACK_FAILURE] ${JSON.stringify(context)}`);
      AppLogger.error("Transaction rollback action failed.", context);
    }

    function clearMutationCaches() {
      try { clearCache(headerSchema); } catch (error) {
        AppLogger.error("Header cache invalidation failed.", { operation: "ROLLBACK", error: String(error.message || error) });
      }
      try { clearCache(detailSchema); } catch (error) {
        AppLogger.error("Detail cache invalidation failed.", { operation: "ROLLBACK", error: String(error.message || error) });
      }
    }

    function withMutationLock(operation, callback) {
      const lock = getMutationLock();
      const alreadyOwned = typeof lock.hasLock === "function" && lock.hasLock();

      if (!alreadyOwned && !lock.tryLock(mutationLockTimeoutMs)) {
        return Response.error(`Proses ${headerSchema.NAME} sedang digunakan. Silakan coba lagi.`);
      }

      try {
        return callback();
      } finally {
        if (!alreadyOwned) lock.releaseLock();
      }
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

    function rollbackInserted(schema, records, operation) {
      let restored = true;

      for (let index = records.length - 1; index >= 0; index--) {
        const id = records[index][schema.PRIMARY_KEY];
        try {
          injectFailure("duringRollback", { operation, id, schema: schema.NAME });
          if (!writer.rollbackInsert(schema, id)) {
            restored = false;
            logRollbackFailure(operation, "rollbackInsert", id, new Error("Compensation returned false."));
          }
        } catch (error) {
          restored = false;
          logRollbackFailure(operation, "rollbackInsert", id, error);
        }
      }

      return restored;
    }

    function rollbackHeader(id) {
      try {
        injectFailure("duringRollback", { operation: "CREATE", id, schema: headerSchema.NAME });
        const restored = writer.rollbackInsert(headerSchema, id);
        if (!restored) logRollbackFailure("CREATE", "rollbackHeader", id, new Error("Compensation returned false."));
        return restored;
      } catch (error) {
        logRollbackFailure("CREATE", "rollbackHeader", id, error);
        return false;
      }
    }

    function restoreUpdate(header, previousDetails, replacementDetails) {
      let restored = true;

      if (!rollbackInserted(detailSchema, replacementDetails, "UPDATE")) restored = false;

      for (let index = previousDetails.length - 1; index >= 0; index--) {
        const detail = previousDetails[index];
        try {
          injectFailure("duringRollback", { operation: "UPDATE", id: detail[detailSchema.PRIMARY_KEY], schema: detailSchema.NAME });
          if (!writer.replace(detailSchema, detail[detailSchema.PRIMARY_KEY], detail)) {
            restored = false;
            logRollbackFailure("UPDATE", "restorePreviousDetail", detail[detailSchema.PRIMARY_KEY], new Error("Compensation returned false."));
          }
        } catch (error) {
          restored = false;
          logRollbackFailure("UPDATE", "restorePreviousDetail", detail[detailSchema.PRIMARY_KEY], error);
        }
      }

      try {
        injectFailure("duringRollback", { operation: "UPDATE", id: header[headerSchema.PRIMARY_KEY], schema: headerSchema.NAME });
        if (!writer.replace(headerSchema, header[headerSchema.PRIMARY_KEY], header)) {
          restored = false;
          logRollbackFailure("UPDATE", "restoreHeader", header[headerSchema.PRIMARY_KEY], new Error("Compensation returned false."));
        }
      } catch (error) {
        restored = false;
        logRollbackFailure("UPDATE", "restoreHeader", header[headerSchema.PRIMARY_KEY], error);
      }

      return restored;
    }

    function findIncludingDeleted(schema, criteria = {}) {
      return mapRows(schema, reader.raw(schema)).filter((item) => {
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

      for (let index = details.length - 1; index >= 0; index--) {
        const detail = details[index];
        try {
          injectFailure("duringRollback", { operation: "DELETE", id: detail[detailSchema.PRIMARY_KEY], schema: detailSchema.NAME });
          if (!writer.replace(detailSchema, detail[detailSchema.PRIMARY_KEY], detail)) {
            restored = false;
            logRollbackFailure("DELETE", "restoreDetail", detail[detailSchema.PRIMARY_KEY], new Error("Compensation returned false."));
          }
        } catch (error) {
          restored = false;
          logRollbackFailure("DELETE", "restoreDetail", detail[detailSchema.PRIMARY_KEY], error);
        }
      }

      try {
        if (!writer.replace(headerSchema, header[headerSchema.PRIMARY_KEY], header)) {
          restored = false;
          logRollbackFailure("DELETE", "restoreHeader", header[headerSchema.PRIMARY_KEY], new Error("Compensation returned false."));
        }
      } catch (error) {
        restored = false;
        logRollbackFailure("DELETE", "restoreHeader", header[headerSchema.PRIMARY_KEY], error);
      }

      return restored;
    }

    function rollbackRestore(header, details) {
      let restored = true;

      for (let index = details.length - 1; index >= 0; index--) {
        const detail = details[index];
        try {
          injectFailure("duringRollback", { operation: "RESTORE", id: detail[detailSchema.PRIMARY_KEY], schema: detailSchema.NAME });
          if (!writer.replace(detailSchema, detail[detailSchema.PRIMARY_KEY], detail)) {
            restored = false;
            logRollbackFailure("RESTORE", "deleteDetail", detail[detailSchema.PRIMARY_KEY], new Error("Compensation returned false."));
          }
        } catch (error) {
          restored = false;
          logRollbackFailure("RESTORE", "deleteDetail", detail[detailSchema.PRIMARY_KEY], error);
        }
      }

      try {
        if (!writer.replace(headerSchema, header[headerSchema.PRIMARY_KEY], header)) {
          restored = false;
          logRollbackFailure("RESTORE", "deleteHeader", header[headerSchema.PRIMARY_KEY], new Error("Compensation returned false."));
        }
      } catch (error) {
        restored = false;
        logRollbackFailure("RESTORE", "deleteHeader", header[headerSchema.PRIMARY_KEY], error);
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
    function createUnlocked(document) {
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

      const headerId = generateId(headerSchema);

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

          generateId(detailSchema),
        );
      });

      const beforeInsert = runHook("beforeInsert", header, details);

      if (isResponse(beforeInsert)) {
        return beforeInsert;
      }

      try {
        injectFailure("beforeHeaderWrite", { operation: "CREATE", id: headerId });
        if (!writer.insert(headerSchema, header)) {
          return Response.error("Gagal menyimpan header transaksi.");
        }
      } catch (error) {
        AppLogger.error("Transaction forward action failed.", { operation: "CREATE", stage: "beforeHeaderWrite", id: headerId, error: String(error.message || error) });
        if (findByIdIncludingDeleted(headerSchema, headerId)) {
          rollbackHeader(headerId);
          clearMutationCaches();
        }
        return Response.error("Gagal menyimpan header transaksi.");
      }

      const insertedDetails = [];
      try {
        injectFailure("afterHeaderWrite", { operation: "CREATE", id: headerId });
        for (let index = 0; index < details.length; index++) {
          if (index === details.length - 1) {
            injectFailure("beforeFinalDetailWrite", { operation: "CREATE", id: headerId, index });
          }
          if (!writer.insert(detailSchema, details[index])) {
            throw new Error("Gagal menyimpan detail transaksi.");
          }
          insertedDetails.push(details[index]);
          if (index === 0) {
            injectFailure("afterFirstDetailWrite", { operation: "CREATE", id: headerId, index });
          }
        }
        injectFailure("beforeAudit", { operation: "CREATE", id: headerId });
      } catch (error) {
        Logger.log(`[TRANSACTION_FORWARD_FAILURE] operation=CREATE id=${headerId} error=${String(error.message || error)}`);
        const detailsRolledBack = rollbackInserted(detailSchema, insertedDetails, "CREATE");
        const headerRolledBack = rollbackHeader(headerId);
        clearMutationCaches();
        if (detailsRolledBack && headerRolledBack) {
          return Response.error("Gagal menyimpan transaksi. Perubahan transaksi dibatalkan.");
        }
        return Response.error("Gagal menyimpan transaksi. Rollback tidak dapat dijamin sepenuhnya; periksa transaksi secara manual.");
      }

      auditMutation(headerSchema, "CREATE", headerId, null, header);

      return Response.success({ header, details });
    }

    function updateUnlocked(id, document) {
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

          generateId(detailSchema),
        );
      });

      try {
        injectFailure("beforeHeaderWrite", { operation: "UPDATE", id });
        if (!writer.update(headerSchema, id, headerChanges)) {
          return Response.error("Gagal memperbarui header transaksi.");
        }
      } catch (error) {
        try {
          writer.replace(headerSchema, id, existingHeader);
          clearMutationCaches();
        } catch (rollbackError) {
          logRollbackFailure("UPDATE", "restoreHeader", id, rollbackError);
        }
        return Response.error("Gagal memperbarui header transaksi.");
      }

      const deletedDetailIds = [];

      try {
        injectFailure("afterHeaderWrite", { operation: "UPDATE", id });
        for (let index = 0; index < previousDetails.length; index++) {
          const detailId = previousDetails[index][detailSchema.PRIMARY_KEY];

          if (!writer.softDelete(detailSchema, detailId)) {
            throw new Error("Gagal menonaktifkan detail transaksi.");
          }

          deletedDetailIds.push(detailId);
        }

        for (let index = 0; index < replacementDetails.length; index++) {
          if (index === replacementDetails.length - 1) {
            injectFailure("beforeFinalDetailWrite", { operation: "UPDATE", id, index });
          }
          if (!writer.insert(detailSchema, replacementDetails[index])) {
            throw new Error("Gagal menyimpan detail transaksi.");
          }
          if (index === 0) {
            injectFailure("afterFirstDetailWrite", { operation: "UPDATE", id, index });
          }
        }
        injectFailure("beforeAudit", { operation: "UPDATE", id });
      } catch (error) {
        Logger.log(`[TRANSACTION_FORWARD_FAILURE] operation=UPDATE id=${id} error=${String(error.message || error)}`);
        const deletedDetails = previousDetails.filter((detail) => {
          return deletedDetailIds.indexOf(detail[detailSchema.PRIMARY_KEY]) !== -1;
        });

        const insertedReplacementDetails = replacementDetails.filter((detail) => {
          return findByIdIncludingDeleted(detailSchema, detail[detailSchema.PRIMARY_KEY]);
        });

        if (restoreUpdate(existingHeader, deletedDetails, insertedReplacementDetails)) {
          clearMutationCaches();
          return Response.error(
            "Gagal mengganti detail transaksi. Perubahan transaksi dibatalkan.",
          );
        }

        clearMutationCaches();
        return Response.error(
          "Gagal mengganti detail transaksi. Rollback tidak dapat dijamin sepenuhnya; periksa transaksi secara manual.",
        );
      }

      auditMutation(headerSchema, "UPDATE", id, existingHeader, updatedHeader);

      return Response.success({
        header: updatedHeader,

        details: replacementDetails,
      });
    }

    function removeUnlocked(id) {
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
        injectFailure("beforeHeaderWrite", { operation: "DELETE", id });
        if (!writer.softDelete(headerSchema, id)) {
          return Response.error("Gagal menghapus header transaksi.");
        }
      } catch (error) {
        try {
          writer.replace(headerSchema, id, header);
          clearMutationCaches();
        } catch (rollbackError) {
          logRollbackFailure("DELETE", "restoreHeader", id, rollbackError);
        }
        return Response.error("Gagal menghapus header transaksi.");
      }

      const deletedDetails = [];

      try {
        injectFailure("afterHeaderWrite", { operation: "DELETE", id });
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
        injectFailure("beforeAudit", { operation: "DELETE", id });
      } catch (error) {
        Logger.log(`[TRANSACTION_FORWARD_FAILURE] operation=DELETE id=${id} error=${String(error.message || error)}`);
        if (rollbackRemove(header, deletedDetails)) {
          clearMutationCaches();
          return Response.error(
            "Gagal menghapus detail transaksi. Perubahan transaksi dibatalkan.",
          );
        }

        clearMutationCaches();
        return Response.error(
          "Gagal menghapus detail transaksi. Rollback tidak dapat dijamin sepenuhnya; periksa transaksi secara manual.",
        );
      }

      const deletedHeader = findByIdIncludingDeleted(headerSchema, id);

      auditMutation(headerSchema, "DELETE", id, header, deletedHeader);

      return Response.success({
        header: deletedHeader,

        details: findIncludingDeleted(detailSchema, {
          [detailForeignKey]: id,
        }),
      });
    }

    function restoreUnlocked(id) {
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
        injectFailure("beforeHeaderWrite", { operation: "RESTORE", id });
        if (!writer.restore(headerSchema, id)) {
          return Response.error("Gagal memulihkan header transaksi.");
        }
      } catch (error) {
        try {
          writer.replace(headerSchema, id, header);
          clearMutationCaches();
        } catch (rollbackError) {
          logRollbackFailure("RESTORE", "restoreHeader", id, rollbackError);
        }
        return Response.error("Gagal memulihkan header transaksi.");
      }

      const restoredDetails = [];

      try {
        injectFailure("afterHeaderWrite", { operation: "RESTORE", id });
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
        injectFailure("beforeAudit", { operation: "RESTORE", id });
      } catch (error) {
        Logger.log(`[TRANSACTION_FORWARD_FAILURE] operation=RESTORE id=${id} error=${String(error.message || error)}`);
        if (rollbackRestore(header, restoredDetails)) {
          clearMutationCaches();
          return Response.error(
            "Gagal memulihkan detail transaksi. Perubahan transaksi dibatalkan.",
          );
        }

        clearMutationCaches();
        return Response.error(
          "Gagal memulihkan detail transaksi. Rollback tidak dapat dijamin sepenuhnya; periksa transaksi secara manual.",
        );
      }

      const restored = {
        header: reader.findById(headerSchema, id),

        details: reader.find(detailSchema, {
          [detailForeignKey]: id,
        }),
      };

      auditMutation(headerSchema, "RESTORE", id, header, restored.header);

      return Response.success(restored);
    }

    function createItem(document) {
      return withMutationLock("CREATE", () => createUnlocked(document));
    }

    function update(id, document) {
      return withMutationLock("UPDATE", () => updateUnlocked(id, document));
    }

    function remove(id) {
      return withMutationLock("DELETE", () => removeUnlocked(id));
    }

    function restore(id) {
      return withMutationLock("RESTORE", () => restoreUnlocked(id));
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
