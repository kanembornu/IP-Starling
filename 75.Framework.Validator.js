/**
 * =============================================================================
 * FILE        : 75.Framework.Validator.gs
 * VERSION     : 2.0.0
 * DESCRIPTION : Schema Validator
 * =============================================================================
 */

const Validator = (() => {
  /**
   * --------------------------------------------------------------------------
   * Validate
   * --------------------------------------------------------------------------
   */
  function validate(schema, data = {}, options = {}) {
    const config = Object.assign(
      {
        partial: false,
      },
      options,
    );

    const rules = schema.VALIDATION || {};

    const errors = [];

    Object.keys(rules).forEach((field) => {
      const rule = rules[field];

      const value = data[field];

      const exists = Object.prototype.hasOwnProperty.call(data, field);

      /**
       * Partial Update
       *
       * Skip field yang tidak dikirim.
       */
      if (config.partial && !exists) {
        return;
      }

      /**
       * Required
       */
      if (rule.required) {
        if (value === null || value === undefined || value === "") {
          errors.push({
            field,

            message: `${field} wajib diisi.`,
          });

          return;
        }
      }

      /**
       * Numeric
       */
      if (rule.numeric) {
        if (value !== null && value !== undefined && value !== "") {
          if (isNaN(Number(value))) {
            errors.push({
              field,

              message: `${field} harus berupa angka.`,
            });

            return;
          }
        }
      }

      /**
       * Minimum
       */
      if (rule.min !== undefined) {
        if (value !== null && value !== undefined && value !== "") {
          if (Number(value) < rule.min) {
            errors.push({
              field,

              message: `${field} minimal ${rule.min}.`,
            });
          }
        }
      }

      /**
       * Maximum Length
       */
      if (rule.maxLength !== undefined) {
        if (value !== null && value !== undefined && value !== "") {
          if (String(value).length > rule.maxLength) {
            errors.push({
              field,

              message: `${field} maksimal ${rule.maxLength} karakter.`,
            });
          }
        }
      }
    });

    return {
      valid: errors.length === 0,

      errors,
    };
  }

  /**
   * --------------------------------------------------------------------------
   * Public API
   * --------------------------------------------------------------------------
   */
  return Object.freeze({
    validate,
  });
})();
