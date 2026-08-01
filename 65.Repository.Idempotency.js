/** Durable create-request idempotency storage and reservation state machine. */
const IdempotencyRepository = (() => {
  function ensureStore() {
    const sheet = Database.hasSheet(IDEMPOTENCY_SCHEMA.TABLE)
      ? Database.sheet(IDEMPOTENCY_SCHEMA.TABLE)
      : Database.createSheet(IDEMPOTENCY_SCHEMA.TABLE);
    const expected = IDEMPOTENCY_SCHEMA.HEADERS.slice();

    if (sheet.getLastRow() === 0 && sheet.getLastColumn() === 0) {
      sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
      RepositoryBase.clearHeaderCache(IDEMPOTENCY_SCHEMA);
      RepositoryCache.clear(IDEMPOTENCY_SCHEMA);
      return sheet;
    }

    const actual = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error("IdempotencyRequests schema tidak kompatibel.");
    }

    return sheet;
  }

  function rows() {
    ensureStore();
    return RepositoryBase.mapRows(IDEMPOTENCY_SCHEMA, RepositoryBase.rows(IDEMPOTENCY_SCHEMA));
  }

  function find(key) {
    return rows().find((row) => row[IDEMPOTENCY_FIELDS.KEY] === key) || null;
  }

  function insert(record) {
    ensureStore();
    return RepositoryWriter.insert(IDEMPOTENCY_SCHEMA, record);
  }

  function update(key, changes) {
    ensureStore();
    return RepositoryWriter.update(IDEMPOTENCY_SCHEMA, key, changes);
  }

  function remove(key) {
    ensureStore();
    return RepositoryWriter.rollbackInsert(IDEMPOTENCY_SCHEMA, key);
  }

  return Object.freeze({ ensureStore, rows, find, insert, update, remove });
})();
