/**
 * =============================================================================
 * FILE        : 85.Framework.IDGenerator.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Sequential ID Generator
 * =============================================================================
 *
 * Generator ID menggunakan Script Properties.
 *
 * Tidak membaca Spreadsheet.
 * Tidak bergantung pada Repository.
 *
 * Format:
 *
 * PREFIX + YYMMDD + NNNNN
 *
 * Contoh:
 *
 * PR26070700001
 *
 * =============================================================================
 */

const IDGenerator = (() => {
  const properties = PropertiesService.getScriptProperties();

  /**
   * --------------------------------------------------------------------------
   * Format Date
   * --------------------------------------------------------------------------
   */
  function dateCode(date = new Date()) {
    return Utilities.formatDate(
      date,

      APP_CONFIG.TIMEZONE,

      "yyMMdd",
    );
  }

  /**
   * --------------------------------------------------------------------------
   * Counter Key
   * --------------------------------------------------------------------------
   */
  function counterKey(prefix, date = new Date()) {
    return `SEQ_${prefix}_${dateCode(date)}`;
  }

  /**
   * --------------------------------------------------------------------------
   * Next Sequence
   * --------------------------------------------------------------------------
   */
  function nextSequence(prefix) {
    const lock = LockService.getScriptLock();

    const ownsLock = typeof lock.hasLock === "function" && lock.hasLock();

    if (!ownsLock) {
      lock.waitLock(30000);
    }

    try {
      const key = counterKey(prefix);

      let value = Number(properties.getProperty(key) || 0);

      value++;

      properties.setProperty(
        key,

        String(value),
      );

      return value;
    } finally {
      if (!ownsLock) {
        lock.releaseLock();
      }
    }
  }

  /**
   * --------------------------------------------------------------------------
   * Generate ID
   * --------------------------------------------------------------------------
   */
  function generate(schema) {
    const prefix = schema.ID_PREFIX;

    const seq = nextSequence(prefix);

    return [prefix, dateCode(), String(seq).padStart(5, "0")].join("");
  }

  /**
   * --------------------------------------------------------------------------
   * Peek Current Sequence
   * --------------------------------------------------------------------------
   */
  function current(prefix) {
    return Number(properties.getProperty(counterKey(prefix)) || 0);
  }

  /** Advance today's sequence monotonically without allocating an ID. */
  function ensureAtLeast(prefix, minimum) {
    const target = Math.max(0, Math.floor(Number(minimum) || 0));
    const lock = LockService.getScriptLock();
    const ownsLock = typeof lock.hasLock === "function" && lock.hasLock();
    if (!ownsLock) lock.waitLock(30000);
    try {
      const key = counterKey(prefix);
      const before = Number(properties.getProperty(key) || 0);
      const after = Math.max(before, target);
      if (after > before) properties.setProperty(key, String(after));
      return { prefix, before, target, after, advanced: after > before };
    } finally {
      if (!ownsLock) lock.releaseLock();
    }
  }

  /**
   * --------------------------------------------------------------------------
   * Reset Today's Sequence
   * (Developer Only)
   * --------------------------------------------------------------------------
   */
  function reset(prefix) {
    properties.deleteProperty(counterKey(prefix));
  }

  /**
   * --------------------------------------------------------------------------
   * Public API
   * --------------------------------------------------------------------------
   */
  return Object.freeze({
    generate,

    current,

    ensureAtLeast,

    reset,
  });
})();
