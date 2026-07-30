/**
 * =============================================================================
 * FILE        : 85.Framework.IDGenerator.gs
 * VERSION     : 1.1.0
 * DESCRIPTION : Collision-safe sequential ID generator
 * =============================================================================
 *
 * Format: PREFIX + YYMMDD + NNNNN (for example PR26070700001).
 * Script Properties remain the canonical counter store. Before allocation, the
 * generator reconciles that counter with physical persisted and reserved IDs.
 * =============================================================================
 */

const IDGenerator = (() => {
  function create(dependencies = {}) {
    const properties =
      dependencies.properties || PropertiesService.getScriptProperties();
    const lockFactory =
      dependencies.lockFactory || (() => LockService.getScriptLock());
    const now = dependencies.now || (() => new Date());
    const formatDate =
      dependencies.formatDate ||
      ((date) => Utilities.formatDate(date, APP_CONFIG.TIMEZONE, "yyMMdd"));
    const rowsFor =
      dependencies.rowsFor || ((schema) => RepositoryBase.rows(schema));
    const reservedIdsFor =
      dependencies.reservedIdsFor ||
      ((schema) => {
        if (
          typeof IDEMPOTENCY_SCHEMA === "undefined" ||
          typeof IDEMPOTENCY_FIELDS === "undefined"
        )
          return [];
        const idIndex = IDEMPOTENCY_SCHEMA.HEADERS.indexOf(
          IDEMPOTENCY_FIELDS.RESOURCE_ID,
        );
        return RepositoryBase.rows(IDEMPOTENCY_SCHEMA)
          .map((row) => String(row[idIndex] || ""));
      });

    function dateCode(date = now()) {
      return formatDate(date);
    }

    /** The single canonical Script Properties key builder. */
    function counterKey(prefix, date = now()) {
      return `SEQ_${prefix}_${dateCode(date)}`;
    }

    function suffixMaximum(ids, prefix, code) {
      const expression = new RegExp(`^${prefix}${code}(\\d{5})$`);
      return (ids || []).reduce((maximum, id) => {
        const match = expression.exec(String(id || ""));
        return match ? Math.max(maximum, Number(match[1])) : maximum;
      }, 0);
    }

    /** Reads physical rows directly so stale cache state cannot permit ID reuse. */
    function maximumExisting(schema, date = now()) {
      const code = dateCode(date);
      const idIndex = schema.HEADERS.indexOf(schema.PRIMARY_KEY);
      const persisted = rowsFor(schema).map((row) => row[idIndex]);
      return Math.max(
        suffixMaximum(persisted, schema.ID_PREFIX, code),
        suffixMaximum(reservedIdsFor(schema), schema.ID_PREFIX, code),
      );
    }

    function withLock(callback) {
      const lock = lockFactory();
      const ownsLock = typeof lock.hasLock === "function" && lock.hasLock();
      if (!ownsLock) lock.waitLock(30000);
      try {
        return callback();
      } finally {
        if (!ownsLock) lock.releaseLock();
      }
    }

    function nextSequence(schema, date) {
      return withLock(() => {
        const state = repairUnlocked(schema, date);
        const value = state.repairedSequence + 1;
        writeSequence(schema.ID_PREFIX, value, date);
        const persisted = readSequence(schema.ID_PREFIX, date);
        if (persisted !== value)
          throw new Error(
            `Sequence allocation persistence failed for ${state.storageKey}.`,
          );
        return value;
      });
    }

    function generate(schema) {
      const date = now();
      const sequence = nextSequence(schema, date);
      return [
        schema.ID_PREFIX,
        dateCode(date),
        String(sequence).padStart(5, "0"),
      ].join("");
    }

    function readSequence(prefix, date = now()) {
      return Number(properties.getProperty(counterKey(prefix, date)) || 0);
    }

    function writeSequence(prefix, value, date = now()) {
      const sequence = Math.max(0, Math.floor(Number(value) || 0));
      properties.setProperty(counterKey(prefix, date), String(sequence));
      return sequence;
    }

    function current(prefix, date = now()) {
      return readSequence(prefix, date);
    }

    function repairUnlocked(schema, date = now()) {
      const prefix = schema.ID_PREFIX;
      const storageKey = counterKey(prefix, date);
      const previousSequence = readSequence(prefix, date);
      const allocatedMaximum = maximumExisting(schema, date);
      const repairedSequence = Math.max(previousSequence, allocatedMaximum);
      if (repairedSequence > previousSequence)
        writeSequence(prefix, repairedSequence, date);
      const persistedReadBack = readSequence(prefix, date);
      if (persistedReadBack < repairedSequence)
        throw new Error(`Sequence persistence verification failed for ${storageKey}.`);
      return {
        entity: schema.NAME,
        prefix,
        storageKey,
        previousSequence,
        allocatedMaximum,
        repairedSequence,
        persistedReadBack,
        status:
          persistedReadBack >= allocatedMaximum
            ? repairedSequence > previousSequence
              ? "REPAIRED"
              : "CURRENT"
            : "FAIL",
      };
    }

    function repairSequence(schema, date = now()) {
      return withLock(() => repairUnlocked(schema, date));
    }

    /** Advance a dated sequence monotonically, then verify canonical read-back. */
    function ensureAtLeast(prefix, minimum, date = now()) {
      const target = Math.max(0, Math.floor(Number(minimum) || 0));
      return withLock(() => {
        const key = counterKey(prefix, date);
        const before = readSequence(prefix, date);
        const after = Math.max(before, target);
        if (after > before) writeSequence(prefix, after, date);
        const persisted = readSequence(prefix, date);
        if (persisted < after)
          throw new Error(`Sequence persistence verification failed for ${key}.`);
        return {
          key,
          prefix,
          before,
          target,
          after: persisted,
          advanced: persisted > before,
          verified: persisted >= target,
        };
      });
    }

    function reset(prefix, date = now()) {
      properties.deleteProperty(counterKey(prefix, date));
    }

    return Object.freeze({
      generate,
      current,
      ensureAtLeast,
      maximumExisting,
      counterKey,
      readSequence,
      writeSequence,
      repairSequence,
      reset,
    });
  }

  const generator = create();
  return Object.freeze({ ...generator, createForTesting: create });
})();
