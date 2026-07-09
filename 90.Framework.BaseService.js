/**
 * =============================================================================
 * FILE        : 90.Framework.BaseService.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Generic Base Service
 * =============================================================================
 */

const BaseService = (() => {
  function create(schema, customHooks = {}) {
    //==========================================================================
    // Hooks
    //==========================================================================

    const hooks = Utils.merge(
      {
        beforeValidation: (data) => data,

        beforeCreate: (data) => data,

        afterCreate: (data) => data,

        beforeUpdate: (id, data) => data,

        afterUpdate: (data) => data,

        beforeDelete: (id) => id,

        afterDelete: () => {},

        beforeRestore: (id) => id,

        afterRestore: () => {},
      },
      customHooks,
    );

    //==========================================================================
    // Internal
    //==========================================================================

    function runHook(name, ...args) {
      if (typeof hooks[name] !== "function") {
        return args[0];
      }

      return hooks[name](...args);
    }

    function isResponse(value) {
      return (
        value &&
        typeof value === "object" &&
        Object.prototype.hasOwnProperty.call(value, "success")
      );
    }

    function sanitizeData(data) {
      const clean = {};

      const headers = RepositoryBase.headers(schema);

      Object.keys(data || {}).forEach((key) => {
        if (headers.indexOf(key) !== -1) {
          clean[key] = data[key];
        }
      });

      return clean;
    }

    function sanitizeUpdate(data) {
      const clean = sanitizeData(data);

      Object.keys(schema.READONLY).forEach((field) => {
        delete clean[field];
      });

      return clean;
    }

    function buildInsertAudit() {
      const now = Utils.now();

      const user = Utils.currentUser();

      return {
        [schema.SYSTEM.CREATED_AT]: now,

        [schema.SYSTEM.CREATED_BY]: user,

        [schema.SYSTEM.UPDATED_AT]: now,

        [schema.SYSTEM.UPDATED_BY]: user,

        [schema.SYSTEM.IS_DELETED]: false,

        [schema.SYSTEM.IS_ACTIVE]: true,
      };
    }

    function buildUpdateAudit() {
      return {
        [schema.SYSTEM.UPDATED_AT]: Utils.now(),

        [schema.SYSTEM.UPDATED_BY]: Utils.currentUser(),
      };
    }

    function validateCreate(data) {
      const result = Validator.validate(
        schema,

        data,
      );

      if (!result.valid) {
        return Response.validation(result);
      }

      return null;
    }

    function validateUpdate(data) {
      const result = Validator.validate(
        schema,

        data,

        {
          partial: true,
        },
      );

      if (!result.valid) {
        return Response.validation(result);
      }

      return null;
    }

    function reload(id) {
      return RepositoryReader.findById(
        schema,

        id,
      );
    }

    //==========================================================================
    // Read
    //==========================================================================

    function findAll() {
      return Response.success(RepositoryReader.findAll(schema));
    }

    function findById(id) {
      const row = RepositoryReader.findById(
        schema,

        id,
      );

      if (!row) {
        return Response.error(`${schema.NAME} tidak ditemukan.`);
      }

      return Response.success(row);
    }

    function find(criteria = {}) {
      return Response.success(
        RepositoryReader.find(
          schema,

          criteria,
        ),
      );
    }

    function findOne(criteria = {}) {
      const row = RepositoryReader.findOne(
        schema,

        criteria,
      );

      if (!row) {
        return Response.error(`${schema.NAME} tidak ditemukan.`);
      }

      return Response.success(row);
    }

    function exists(criteria = {}) {
      return Response.success(
        RepositoryReader.exists(
          schema,

          criteria,
        ),
      );
    }

    function count() {
      return Response.success(RepositoryReader.count(schema));
    }

    //==========================================================================
    // Create
    //==========================================================================

    function createItem(data) {
      let object = Utils.deepClone(data);

      object = sanitizeData(object);

      object = runHook(
        "beforeValidation",

        object,
      );

      if (isResponse(object)) {
        return object;
      }

      const validation = validateCreate(object);

      if (validation) {
        return validation;
      }

      object = runHook(
        "beforeCreate",

        object,
      );

      if (isResponse(object)) {
        return object;
      }

      object = Utils.merge(
        schema.DEFAULT,

        object,
      );

      object[schema.PRIMARY_KEY] = IDGenerator.generate(schema);

      object = Utils.merge(
        object,

        buildInsertAudit(),
      );

      const ok = RepositoryWriter.insert(
        schema,

        object,
      );

      if (!ok) {
        return Response.error("Gagal menyimpan data.");
      }

      let saved = reload(object[schema.PRIMARY_KEY]);

      saved = runHook(
        "afterCreate",

        saved,
      );

      return Response.success(
        saved,

        `${schema.NAME} berhasil dibuat.`,
      );
    }

    //==========================================================================
    // Update
    //==========================================================================

    function updateItem(id, changes) {
      let object = Utils.deepClone(changes);

      object = sanitizeUpdate(object);

      object = runHook("beforeValidation", object);

      if (isResponse(object)) {
        return object;
      }

      const validation = validateUpdate(object);

      if (validation) {
        return validation;
      }

      object = runHook("beforeUpdate", id, object);

      if (isResponse(object)) {
        return object;
      }

      object = Utils.merge(
        object,

        buildUpdateAudit(),
      );

      const ok = RepositoryWriter.update(
        schema,

        id,

        object,
      );

      if (!ok) {
        return Response.error(`${schema.NAME} tidak ditemukan.`);
      }

      let updated = reload(id);

      updated = runHook(
        "afterUpdate",

        updated,
      );

      return Response.success(
        updated,

        `${schema.NAME} berhasil diperbarui.`,
      );
    }

    //==========================================================================
    // Delete
    //==========================================================================

    function remove(id) {
      const hook = runHook(
        "beforeDelete",

        id,
      );

      if (isResponse(hook)) {
        return hook;
      }

      const ok = RepositoryWriter.softDelete(
        schema,

        id,
      );

      if (!ok) {
        return Response.error(`${schema.NAME} tidak ditemukan.`);
      }

      runHook(
        "afterDelete",

        id,
      );

      return Response.success(
        null,

        `${schema.NAME} berhasil dihapus.`,
      );
    }

    //==========================================================================
    // Restore
    //==========================================================================

    function restore(id) {
      const hook = runHook(
        "beforeRestore",

        id,
      );

      if (isResponse(hook)) {
        return hook;
      }

      const ok = RepositoryWriter.restore(
        schema,

        id,
      );

      if (!ok) {
        return Response.error(`${schema.NAME} tidak ditemukan.`);
      }

      runHook(
        "afterRestore",

        id,
      );

      const restored = reload(id);

      return Response.success(
        restored,

        `${schema.NAME} berhasil dipulihkan.`,
      );
    }

    //==========================================================================
    // Public API
    //==========================================================================

    return Object.freeze({
      findAll,

      findById,

      find,

      findOne,

      exists,

      count,

      create: createItem,

      update: updateItem,

      remove,

      restore,
    });
  }

  //============================================================================
  // Public Factory
  //============================================================================

  return Object.freeze({
    create,
  });
})();
