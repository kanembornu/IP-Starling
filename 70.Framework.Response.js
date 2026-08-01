/**
 * =============================================================================
 * FILE        : 70.Framework.Response.js
 * VERSION     : 1.0.0
 * DESCRIPTION : Response Factory
 * =============================================================================
 *
 * Seluruh response backend harus dibuat melalui file ini.
 *
 * =============================================================================
 */

const Response = (() => {
  /**
   * --------------------------------------------------------------------------
   * Metadata
   * --------------------------------------------------------------------------
   */
  function meta(executionTime = 0) {
    return {
      timestamp: new Date().toISOString(),

      version: APP_CONFIG.VERSION,

      executionTime,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Success Response
   * --------------------------------------------------------------------------
   */
  function success(data = null, message = "", executionTime = 0) {
    return {
      success: true,

      message,

      data,

      errors: [],

      meta: meta(executionTime),
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Error Response
   * --------------------------------------------------------------------------
   */
  function error(message = "Unknown Error", errors = [], executionTime = 0) {
    return {
      success: false,

      message,

      data: null,

      errors,

      meta: meta(executionTime),
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Validation Response
   * --------------------------------------------------------------------------
   */
  function validation(result, executionTime = 0) {
    if (result.valid) {
      return success(null, "Validation passed.", executionTime);
    }

    return error(
      "Validation failed.",

      result.errors,

      executionTime,
    );
  }

  /**
   * --------------------------------------------------------------------------
   * Public API
   * --------------------------------------------------------------------------
   */
  return Object.freeze({
    success,

    error,

    validation,
  });
})();
