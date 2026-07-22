/**
 * =============================================================================
 * FILE        : 25.Database.Setup.js
 * VERSION     : 1.0.0
 * DESCRIPTION : Database Setup
 * =============================================================================
 *
 * Responsible for:
 * - Create application sheets
 * - Create sheet headers
 * - Keep database structure synchronized with Schema
 *
 * =============================================================================
 */

const DatabaseSetup = (() => {
  /**
   * --------------------------------------------------------------------------
   * All Schemas
   * --------------------------------------------------------------------------
   */
  function schemas() {
    return Object.values(SCHEMA).filter((schema) => {
      return schema && schema.TABLE;
    });
  }

  /**
   * --------------------------------------------------------------------------
   * Setup Database
   * --------------------------------------------------------------------------
   */
  function setup() {
    schemas().forEach(createSchema);

    RepositoryBase.clearHeaderCache();
  }

  /**
   * --------------------------------------------------------------------------
   * Create Schema Sheet
   * --------------------------------------------------------------------------
   */
  function createSchema(schema) {
    let sheet;

    if (Database.hasSheet(schema.TABLE)) {
      sheet = Database.sheet(schema.TABLE);
    } else {
      sheet = Database.createSheet(schema.TABLE);
    }

    writeHeaders(sheet, schema);
  }

  /**
   * --------------------------------------------------------------------------
   * Write Headers
   * --------------------------------------------------------------------------
   */
  function writeHeaders(sheet, schema) {
    const headers = schema.HEADERS;

    const currentHeaders =
      sheet.getLastColumn() === 0
        ? []
        : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    /**
     * Header sudah sesuai
     */
    if (JSON.stringify(currentHeaders) === JSON.stringify(headers)) {
      return;
    }

    // Settings may already contain production configuration. Its dedicated
    // audit/migration path must resolve mismatched headers without data loss.
    if (schema.TABLE === SHEET_NAMES.SETTINGS && currentHeaders.length > 0) {
      throw new Error("Settings headers differ from SETTINGS_SCHEMA; run the read-only Settings audit before migration.");
    }

    if (schema.TABLE === SHEET_NAMES.LOGS && currentHeaders.length > 0) {
      throw new Error("Logs headers differ from LOG_SCHEMA; run the read-only Logs audit before any migration.");
    }

    /**
     * Reset Header
     */
    sheet.clear();

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return Object.freeze({
    setup,
  });
})();
