/**
 * =============================================================================
 * FILE        : 10.Config.js
 * DESCRIPTION : Global Application Configuration
 * VERSION     : 1.0.0-rc.1
 * =============================================================================
 */

/**
 * ---------------------------------------------------------------------------
 * Application Information
 * ---------------------------------------------------------------------------
 */
const APP_CONFIG = (() => {
  let timezone;
  return Object.freeze({
  NAME: "IP-Starling",

  VERSION: "1.0.0-rc.1",

  BUILD: "Release Candidate 1",

  AUTHOR: "Linzi",

  get TIMEZONE() {
    if (typeof timezone === "undefined") timezone = Session.getScriptTimeZone();
    return timezone;
  },

  LOCALE: "id_ID",
  });
})();

/**
 * ---------------------------------------------------------------------------
 * Spreadsheet Configuration
 * ---------------------------------------------------------------------------
 */
const DATABASE_CONFIG = (() => {
  let spreadsheetId;
  return Object.freeze({
    get SPREADSHEET_ID() {
      if (typeof spreadsheetId === "undefined") {
        spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
      }
      return spreadsheetId;
    },
  });
})();

/**
 * ---------------------------------------------------------------------------
 * Cache Configuration
 * ---------------------------------------------------------------------------
 */
const CACHE_CONFIG = Object.freeze({
  ENABLED: true,

  EXPIRE_SECONDS: 300,
});

/**
 * ---------------------------------------------------------------------------
 * Pagination
 * ---------------------------------------------------------------------------
 */
const PAGINATION_CONFIG = Object.freeze({
  DEFAULT_PAGE: 1,

  DEFAULT_LIMIT: 15,

  ALLOWED_LIMITS: Object.freeze([10, 15, 25, 50, 100]),

  MAX_LIMIT: 500,
});

/**
 * ---------------------------------------------------------------------------
 * Audit Column
 * ---------------------------------------------------------------------------
 */
const AUDIT_COLUMNS = Object.freeze({
  CREATED_AT: "CreatedAt",

  CREATED_BY: "CreatedBy",

  UPDATED_AT: "UpdatedAt",

  UPDATED_BY: "UpdatedBy",
});

/**
 * ---------------------------------------------------------------------------
 * System Column
 * ---------------------------------------------------------------------------
 */
const SYSTEM_COLUMNS = Object.freeze({
  PRIMARY_KEY: "ID",

  IS_ACTIVE: "IsActive",

  IS_DELETED: "Deleted",
});

/**
 * ---------------------------------------------------------------------------
 * Sheet Names
 * ---------------------------------------------------------------------------
 */
const SHEET_NAMES = Object.freeze({
  PRODUCTS: "Products",

  PARTNERS: "Partners",

  PICKUP_HEADERS: "PickupHeaders",

  PICKUP_DETAILS: "PickupDetails",

  RETURNS: "Returns",

  PURCHASES: "Purchases",

  EXPENSES: "Expenses",

  SETTINGS: "Settings",

  IDEMPOTENCY_REQUESTS: "IdempotencyRequests",

  LOGS: "Logs",
});

/**
 * ---------------------------------------------------------------------------
 * Transaction Prefix
 * ---------------------------------------------------------------------------
 */
const ID_PREFIX = Object.freeze({
  PRODUCT: "PR",

  PARTNER: "PT",

  IDEMPOTENCY: "IK",

  PICKUP_HEADER: "PH",

  PICKUP_DETAIL: "PD",

  RETURN: "RT",

  PURCHASE: "PC",

  EXPENSE: "EX",

  SETTING: "ST",

  LOG: "LG",
});

/** Canonical schemas whose IDs are allocated by IDGenerator. */
const ID_GENERATOR_SCHEMA_KEYS = Object.freeze([
  "PRODUCT",
  "PARTNER",
  "PICKUP_HEADER",
  "PICKUP_DETAIL",
  "RETURN",
  "PURCHASE",
  "EXPENSE",
  "SETTINGS",
]);

/**
 * ---------------------------------------------------------------------------
 * Environment Config
 * ---------------------------------------------------------------------------
 */
const ENV = Object.freeze({
  DEBUG: false,

  LOG_ENABLED: true,

  CACHE_ENABLED: true,
});

/**
 * ---------------------------------------------------------------------------
 * Application Routes
 * ---------------------------------------------------------------------------
 */
const ROUTES = Object.freeze({
  DASHBOARD: "950.View.Dashboard",

  PRODUCTS: "920.View.Products",

  PARTNERS: "925.View.Partners",

  PICKUPS: "930.View.Pickups",

  RETURNS: "935.View.Returns",

  PURCHASES: "940.View.Purchasing",

  EXPENSES: "945.View.Expenses",

  SETTINGS: "947.View.Settings",

  LOGS: "948.View.Logs",
});
