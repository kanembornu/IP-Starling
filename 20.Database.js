/**
 * =============================================================================
 * FILE        : 20.Database.js
 * VERSION     : 1.0.0
 * DESCRIPTION : Spreadsheet Connection Manager
 * =============================================================================
 *
 * Layer ini adalah SATU-SATUNYA bagian project yang diperbolehkan
 * menggunakan SpreadsheetApp.
 *
 * Repository tidak boleh menggunakan SpreadsheetApp secara langsung.
 *
 * =============================================================================
 */

const Database = (() => {
  /**
   * --------------------------------------------------------------------------
   * Spreadsheet Instance (Singleton)
   * --------------------------------------------------------------------------
   */

  let spreadsheet = null;

  /**
   * --------------------------------------------------------------------------
   * Return Active Spreadsheet
   * --------------------------------------------------------------------------
   */
  function getSpreadsheet() {
    if (!spreadsheet) {
      spreadsheet = SpreadsheetApp.openById(DATABASE_CONFIG.SPREADSHEET_ID);
    }

    return spreadsheet;
  }

  /**
   * --------------------------------------------------------------------------
   * Return Sheet Object
   * --------------------------------------------------------------------------
   */
  function sheet(sheetName) {
    const sh = getSpreadsheet().getSheetByName(sheetName);

    if (!sh) {
      throw new Error(`Sheet "${sheetName}" tidak ditemukan.`);
    }

    return sh;
  }

  /**
   * --------------------------------------------------------------------------
   * Check Sheet Exists
   * --------------------------------------------------------------------------
   */
  function hasSheet(sheetName) {
    return getSpreadsheet().getSheetByName(sheetName) !== null;
  }

  /**
   * --------------------------------------------------------------------------
   * Get All Sheet Names
   * --------------------------------------------------------------------------
   */
  function sheetNames() {
    return getSpreadsheet()
      .getSheets()

      .map((sheet) => sheet.getName());
  }

  /**
   * --------------------------------------------------------------------------
   * Create Sheet
   * --------------------------------------------------------------------------
   */
  function createSheet(sheetName) {
    if (hasSheet(sheetName)) {
      return sheet(sheetName);
    }

    return getSpreadsheet().insertSheet(sheetName);
  }

  /**
   * --------------------------------------------------------------------------
   * Delete Sheet
   * --------------------------------------------------------------------------
   */
  function deleteSheet(sheetName) {
    const sh = getSpreadsheet().getSheetByName(sheetName);

    if (!sh) {
      return false;
    }

    getSpreadsheet().deleteSheet(sh);

    return true;
  }

  /**
   * --------------------------------------------------------------------------
   * Timezone
   * --------------------------------------------------------------------------
   */
  function timezone() {
    return APP_CONFIG.TIMEZONE;
  }

  /**
   * --------------------------------------------------------------------------
   * Flush Spreadsheet
   * --------------------------------------------------------------------------
   */
  function flush() {
    SpreadsheetApp.flush();
  }

  /**
   * --------------------------------------------------------------------------
   * Public API
   * --------------------------------------------------------------------------
   */
  return Object.freeze({
    spreadsheet: getSpreadsheet,

    sheet,

    hasSheet,

    sheetNames,

    createSheet,

    deleteSheet,

    timezone,

    flush,
  });
})();
