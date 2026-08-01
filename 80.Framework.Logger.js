/**
 * =============================================================================
 * FILE        : 80.Framework.Logger.js
 * VERSION     : 1.0.0
 * DESCRIPTION : Application Logger
 * =============================================================================
 *
 * Wrapper untuk Logger bawaan Google Apps Script.
 *
 * =============================================================================
 */

const AppLogger = (() => {
  function enabled() {
    return ENV.LOG_ENABLED === true;
  }

  function write(level, message, data = null) {
    if (!enabled()) {
      return;
    }

    const text = `[${level}] ${message}`;

    if (data === null) {
      Logger.log(text);

      return;
    }

    Logger.log(text);

    Logger.log(data);
  }

  function info(message, data = null) {
    write("INFO", message, data);
  }

  function warn(message, data = null) {
    write("WARN", message, data);
  }

  function error(message, data = null) {
    write("ERROR", message, data);
  }

  return Object.freeze({
    info,

    warn,

    error,
  });
})();
