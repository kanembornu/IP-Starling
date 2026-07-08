/**
 * =============================================================================
 * FILE        : 60.Repository.Writer.gs
 * VERSION     : 1.1.0
 * DESCRIPTION : Repository Writer
 * =============================================================================
 *
 * Seluruh operasi WRITE berada di file ini.
 *
 * Writer tidak memiliki business logic.
 * Writer tidak melakukan validasi.
 * Writer hanya bertugas menulis ke Spreadsheet.
 *
 * =============================================================================
 */

const RepositoryWriter = (() => {

  /**
   * --------------------------------------------------------------------------
   * Insert One Record
   * --------------------------------------------------------------------------
   */
  function insert(schema, object) {

    const sh = RepositoryBase.sheet(schema);

    const row = RepositoryBase.toRow(schema, object);

    sh.getRange(
      sh.getLastRow() + 1,
      1,
      1,
      row.length
    ).setValues([row]);

    RepositoryCache.clear(schema);

    return true;

  }

  /**
   * --------------------------------------------------------------------------
   * Insert Multiple Records
   * --------------------------------------------------------------------------
   */
  function insertMany(schema, objects) {

    if (!Array.isArray(objects) || objects.length === 0) {

      return false;

    }

    const sh = RepositoryBase.sheet(schema);

    const rows = objects.map(item =>
      RepositoryBase.toRow(schema, item)
    );

    sh.getRange(
      sh.getLastRow() + 1,
      1,
      rows.length,
      rows[0].length
    ).setValues(rows);

    RepositoryCache.clear(schema);

    return true;

  }

  /**
   * --------------------------------------------------------------------------
   * Partial Update
   * --------------------------------------------------------------------------
   */
  function update(schema, id, changes) {

    const rowNumber = RepositoryBase.findRowIndex(schema, id);

    if (!rowNumber) {

      return false;

    }

    const sh = RepositoryBase.sheet(schema);

    const columnCount = RepositoryBase.headers(schema).length;

    // Ambil seluruh row sekali
    const row = sh
      .getRange(rowNumber, 1, 1, columnCount)
      .getValues()[0];

    const map = RepositoryBase.headerMap(schema);

    // Ubah hanya field yang dikirim
    Object.keys(changes).forEach(column => {

      if (map[column] === undefined) {

        return;

      }

      row[map[column]] = changes[column];

    });

    // Tulis kembali sekali saja
    sh
      .getRange(rowNumber, 1, 1, columnCount)
      .setValues([row]);

    RepositoryCache.clear(schema);

    return true;

  }

  /**
   * --------------------------------------------------------------------------
   * Soft Delete
   * --------------------------------------------------------------------------
   */
  function softDelete(schema, id) {

    return update(schema, id, {

      [schema.SYSTEM.IS_DELETED]: true

    });

  }

  /**
   * --------------------------------------------------------------------------
   * Restore
   * --------------------------------------------------------------------------
   */
  function restore(schema, id) {

    return update(schema, id, {

      [schema.SYSTEM.IS_DELETED]: false

    });

  }

  /**
   * --------------------------------------------------------------------------
   * Replace Whole Row
   * --------------------------------------------------------------------------
   */
  function replace(schema, id, object) {

    const rowNumber = RepositoryBase.findRowIndex(schema, id);

    if (!rowNumber) {

      return false;

    }

    const sh = RepositoryBase.sheet(schema);

    const row = RepositoryBase.toRow(schema, object);

    sh.getRange(
      rowNumber,
      1,
      1,
      row.length
    ).setValues([row]);

    RepositoryCache.clear(schema);

    return true;

  }

  /**
   * --------------------------------------------------------------------------
   * Public API
   * --------------------------------------------------------------------------
   */
  return Object.freeze({

    insert,

    insertMany,

    update,

    softDelete,

    restore,

    replace

  });

})();