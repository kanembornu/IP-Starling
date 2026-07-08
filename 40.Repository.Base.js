/**
 * =============================================================================
 * FILE        : 40.Repository.Base.gs
 * VERSION     : 1.1.0
 * DESCRIPTION : Repository Base Helper
 * =============================================================================
 */

const RepositoryBase = (() => {

  /**
   * --------------------------------------------------------------------------
   * Internal Cache
   * --------------------------------------------------------------------------
   */

  const headerCache = {};
  const headerMapCache = {};

  /**
   * --------------------------------------------------------------------------
   * Sheet
   * --------------------------------------------------------------------------
   */

  function sheet(schema) {

    return Database.sheet(schema.TABLE);

  }

  /**
   * --------------------------------------------------------------------------
   * Headers
   * --------------------------------------------------------------------------
   */

  function headers(schema) {

    if (headerCache[schema.TABLE]) {

      return headerCache[schema.TABLE];

    }

    const sh = sheet(schema);

    const cols = sh.getLastColumn();

    if (cols === 0) {

      headerCache[schema.TABLE] = [];

      return [];

    }

    const values = sh
      .getRange(1, 1, 1, cols)
      .getValues()[0];

    headerCache[schema.TABLE] = values;

    return values;

  }

  /**
   * --------------------------------------------------------------------------
   * Header Map
   * --------------------------------------------------------------------------
   */

  function headerMap(schema) {

    if (headerMapCache[schema.TABLE]) {

      return headerMapCache[schema.TABLE];

    }

    const map = {};

    headers(schema).forEach((name, index) => {

      map[name] = index;

    });

    headerMapCache[schema.TABLE] = map;

    return map;

  }

  /**
   * --------------------------------------------------------------------------
   * Rows
   * --------------------------------------------------------------------------
   */

  function rows(schema) {

    const sh = sheet(schema);

    if (sh.getLastRow() <= 1) {

      return [];

    }

    return sh
      .getRange(
        2,
        1,
        sh.getLastRow() - 1,
        sh.getLastColumn()
      )
      .getValues();

  }

  /**
   * --------------------------------------------------------------------------
   * Row → Object
   * --------------------------------------------------------------------------
   */

  function mapRow(schema, row) {

    const cols = headers(schema);

    const obj = {};

    cols.forEach((column, index) => {

      obj[column] = row[index];

    });

    return obj;

  }

  /**
   * --------------------------------------------------------------------------
   * Rows → Objects
   * --------------------------------------------------------------------------
   */

  function mapRows(schema, rows) {

    return rows.map(row => mapRow(schema, row));

  }

  /**
   * --------------------------------------------------------------------------
   * Object → Row
   * --------------------------------------------------------------------------
   */

  function toRow(schema, object) {

    return headers(schema).map(column => {

      return Object.prototype.hasOwnProperty.call(object, column)
        ? object[column]
        : "";

    });

  }

  /**
   * --------------------------------------------------------------------------
   * Find Spreadsheet Row Number
   * Return:
   * 2 = first data row
   * 3 = second data row
   * null = not found
   * --------------------------------------------------------------------------
   */

  function findRowIndex(schema, id) {

    const pk = schema.PRIMARY_KEY;

    const map = headerMap(schema);

    const pkIndex = map[pk];

    if (pkIndex === undefined) {

      return null;

    }

    const data = rows(schema);

    for (let i = 0; i < data.length; i++) {

      if (data[i][pkIndex] === id) {

        return i + 2;

      }

    }

    return null;

  }

  /**
   * --------------------------------------------------------------------------
   * Primary Key
   * --------------------------------------------------------------------------
   */

  function primaryKey(schema) {

    return schema.PRIMARY_KEY;

  }

  /**
   * --------------------------------------------------------------------------
   * Audit
   * --------------------------------------------------------------------------
   */

  function auditColumns(schema) {

    return schema.AUDIT;

  }

  /**
   * --------------------------------------------------------------------------
   * System
   * --------------------------------------------------------------------------
   */

  function systemColumns(schema) {

    return schema.SYSTEM;

  }

  /**
   * --------------------------------------------------------------------------
   * Clear Internal Cache
   * --------------------------------------------------------------------------
   */

  function clearHeaderCache(schema = null) {

    if (schema) {

      delete headerCache[schema.TABLE];
      delete headerMapCache[schema.TABLE];

      return;

    }

    Object.keys(headerCache).forEach(key => delete headerCache[key]);
    Object.keys(headerMapCache).forEach(key => delete headerMapCache[key]);

  }

  return Object.freeze({

    sheet,

    headers,

    headerMap,

    rows,

    mapRow,

    mapRows,

    toRow,

    findRowIndex,

    primaryKey,

    auditColumns,

    systemColumns,

    clearHeaderCache

  });

})();