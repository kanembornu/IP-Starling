/**
 * =============================================================================
 * FILE        : 10.Config.gs
 * DESCRIPTION : Global Application Configuration
 * VERSION     : 0.1.0
 * =============================================================================
 */

/**
 * ---------------------------------------------------------------------------
 * Application Information
 * ---------------------------------------------------------------------------
 */
const APP_CONFIG = Object.freeze({
  NAME: "IP-Starling",

  VERSION: "0.1.0",

  BUILD: "Foundation",

  AUTHOR: "Linzi",

  TIMEZONE: Session.getScriptTimeZone(),

  LOCALE: "id_ID",
});

/**
 * ---------------------------------------------------------------------------
 * Spreadsheet Configuration
 * ---------------------------------------------------------------------------
 */
const DATABASE_CONFIG = Object.freeze({
  SPREADSHEET_ID: SpreadsheetApp.getActiveSpreadsheet().getId(),
});

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

  DEFAULT_LIMIT: 20,

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

  PICKUP_HEADER: "PH",

  PICKUP_DETAIL: "PD",

  RETURN: "RT",

  PURCHASE: "PC",

  EXPENSE: "EX",

  SETTING: "ST",
});

/**
 * ---------------------------------------------------------------------------
 * Environment Config
 * ---------------------------------------------------------------------------
 */
const ENV = Object.freeze({
  DEBUG: true,

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
});
