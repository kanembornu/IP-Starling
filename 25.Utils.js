/**
 * =============================================================================
 * FILE        : 25.Utils.js
 * VERSION     : 1.0.0
 * DESCRIPTION : Global Utility Functions
 * =============================================================================
 *
 * Seluruh function pada file ini harus bersifat PURE FUNCTION.
 * Tidak boleh mengakses Spreadsheet, Repository, Service maupun View.
 *
 * =============================================================================
 */

const Utils = (() => {
  /**
   * --------------------------------------------------------------------------
   * Date
   * --------------------------------------------------------------------------
   */

  function now() {
    return new Date();
  }

  function today() {
    return Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
  }

  function formatDate(date, pattern = "yyyy-MM-dd") {
    return Utilities.formatDate(new Date(date), APP_CONFIG.TIMEZONE, pattern);
  }

  /**
   * --------------------------------------------------------------------------
   * User
   * --------------------------------------------------------------------------
   */

  function currentUser() {
    return Session.getActiveUser().getEmail() || "SYSTEM";
  }

  /**
   * --------------------------------------------------------------------------
   * Object
   * --------------------------------------------------------------------------
   */

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function merge(defaults, data) {
    return Object.assign({}, defaults, data);
  }

  function pick(obj, keys) {
    const result = {};

    keys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = obj[key];
      }
    });

    return result;
  }

  function omit(obj, keys) {
    const result = {};

    Object.keys(obj).forEach((key) => {
      if (!keys.includes(key)) {
        result[key] = obj[key];
      }
    });

    return result;
  }

  function isEmpty(value) {
    return value === null || value === undefined || value === "";
  }

  /**
   * --------------------------------------------------------------------------
   * String
   * --------------------------------------------------------------------------
   */

  function uuid() {
    return Utilities.getUuid();
  }

  function capitalize(text) {
    if (!text) return "";

    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function trimObject(obj) {
    const result = {};

    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      result[key] = typeof value === "string" ? value.trim() : value;
    });

    return result;
  }

  /**
   * --------------------------------------------------------------------------
   * Array
   * --------------------------------------------------------------------------
   */

  function chunk(array, size) {
    const result = [];

    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }

    return result;
  }

  /**
   * --------------------------------------------------------------------------
   * Public API
   * --------------------------------------------------------------------------
   */

  return Object.freeze({
    now,

    today,

    formatDate,

    currentUser,

    deepClone,

    merge,

    pick,

    omit,

    isEmpty,

    uuid,

    capitalize,

    trimObject,

    chunk,
  });
})();
