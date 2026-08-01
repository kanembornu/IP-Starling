/**
 * =============================================================================
 * FILE        : 55.Repository.Reader.js
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
  function create(cacheRepository, baseRepository) {
  /**
   * --------------------------------------------------------------------------
   * Raw Rows
   * --------------------------------------------------------------------------
   */
  function raw(schema) {
    return cacheRepository.remember(schema, () => {
      return baseRepository.rows(schema);
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Find All Active Records
   * --------------------------------------------------------------------------
   */
  function findAll(schema) {
    const rows = raw(schema);

    const data = baseRepository.mapRows(schema, rows);

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
  }

  let repositoryReader = null;

  function runtime() {
    if (!repositoryReader) repositoryReader = create(RepositoryCache, RepositoryBase);
    return repositoryReader;
  }

  return Object.freeze({
    raw(schema) { return runtime().raw(schema); },
    findAll(schema) { return runtime().findAll(schema); },
    findById(schema, id) { return runtime().findById(schema, id); },
    find(schema, criteria = {}) { return runtime().find(schema, criteria); },
    findOne(schema, criteria = {}) { return runtime().findOne(schema, criteria); },
    exists(schema, criteria = {}) { return runtime().exists(schema, criteria); },
    count(schema) { return runtime().count(schema); },
    createForTesting: create,
  });
})();
