/**
 * =============================================================================
 * FILE        : 55.Repository.Reader.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Repository Reader
 * =============================================================================
 *
 * Seluruh operasi READ berada di file ini.
 *
 * Reader selalu membaca melalui RepositoryCache.
 * Reader selalu mengembalikan Object.
 *
 * =============================================================================
 */

const RepositoryReader = (() => {
  /**
   * --------------------------------------------------------------------------
   * Raw Rows
   * --------------------------------------------------------------------------
   */
  function raw(schema) {
    return RepositoryCache.remember(schema, () => {
      return RepositoryBase.rows(schema);
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Find All Active Records
   * --------------------------------------------------------------------------
   */
  function findAll(schema) {
    const rows = raw(schema);

    const data = RepositoryBase.mapRows(schema, rows);

    const deletedColumn = schema.SYSTEM.IS_DELETED;

    return data.filter((item) => {
      return item[deletedColumn] !== true;
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Find By Primary Key
   * --------------------------------------------------------------------------
   */
  function findById(schema, id) {
    const pk = schema.PRIMARY_KEY;

    return findAll(schema).find((item) => item[pk] === id) || null;
  }

  /**
   * --------------------------------------------------------------------------
   * Find Records
   * --------------------------------------------------------------------------
   */
  function find(schema, criteria = {}) {
    return findAll(schema).filter((item) => {
      return Object.keys(criteria)

        .every((key) => item[key] === criteria[key]);
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Find One
   * --------------------------------------------------------------------------
   */
  function findOne(schema, criteria = {}) {
    return find(schema, criteria)[0] || null;
  }

  /**
   * --------------------------------------------------------------------------
   * Exists
   * --------------------------------------------------------------------------
   */
  function exists(schema, criteria = {}) {
    return findOne(schema, criteria) !== null;
  }

  /**
   * --------------------------------------------------------------------------
   * Count
   * --------------------------------------------------------------------------
   */
  function count(schema) {
    return findAll(schema).length;
  }

  /**
   * --------------------------------------------------------------------------
   * Public API
   * --------------------------------------------------------------------------
   */
  return Object.freeze({
    raw,

    findAll,

    findById,

    find,

    findOne,

    exists,

    count,
  });
})();
