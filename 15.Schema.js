/**
 * =============================================================================
 * FILE        : 15.Schema.gs
 * VERSION     : 3.0.0
 * DESCRIPTION : Entity Schema Definition
 * =============================================================================
 */

/**
 * =============================================================================
 * SCHEMA BUILDER
 * =============================================================================
 */

function createSchema(options) {
  const schema = {
    NAME: options.NAME,

    TABLE: options.TABLE,

    PRIMARY_KEY: options.PRIMARY_KEY,

    DISPLAY_FIELD: options.DISPLAY_FIELD,

    ID_PREFIX: options.ID_PREFIX,

    FIELDS: Object.freeze(options.FIELDS),

    SYSTEM: Object.freeze({
      PRIMARY_KEY: SYSTEM_COLUMNS.PRIMARY_KEY,

      IS_ACTIVE: SYSTEM_COLUMNS.IS_ACTIVE,

      IS_DELETED: SYSTEM_COLUMNS.IS_DELETED,

      CREATED_AT: AUDIT_COLUMNS.CREATED_AT,

      CREATED_BY: AUDIT_COLUMNS.CREATED_BY,

      UPDATED_AT: AUDIT_COLUMNS.UPDATED_AT,

      UPDATED_BY: AUDIT_COLUMNS.UPDATED_BY,
    }),

    HEADERS: Object.freeze([
      ...Object.values(options.FIELDS),

      SYSTEM_COLUMNS.IS_DELETED,
      SYSTEM_COLUMNS.IS_ACTIVE,

      AUDIT_COLUMNS.CREATED_AT,
      AUDIT_COLUMNS.CREATED_BY,

      AUDIT_COLUMNS.UPDATED_AT,
      AUDIT_COLUMNS.UPDATED_BY,
    ]),

    DEFAULT: Object.freeze(options.DEFAULT),

    VALIDATION: Object.freeze(options.VALIDATION),

    READONLY: Object.freeze(options.READONLY),

    SEARCHABLE: Object.freeze(options.SEARCHABLE),

    UI: Object.freeze({
      TITLE: options.UI.TITLE,

      ICON: options.UI.ICON,

      COLOR: options.UI.COLOR,

      SEARCH_PLACEHOLDER: options.UI.SEARCH_PLACEHOLDER,
    }),
  };

  return Object.freeze(schema);
}

/**
 * =============================================================================
 * PRODUCT
 * =============================================================================
 */

const PRODUCT_FIELDS = Object.freeze({
  ID: SYSTEM_COLUMNS.PRIMARY_KEY,

  NAME: "Nama",

  CATEGORY: "Kategori",

  UNIT: "Satuan",

  PRICE: "Harga",
});

const PRODUCT_SCHEMA = createSchema({
  NAME: "Product",

  TABLE: SHEET_NAMES.PRODUCTS,

  PRIMARY_KEY: PRODUCT_FIELDS.ID,

  DISPLAY_FIELD: PRODUCT_FIELDS.NAME,

  ID_PREFIX: ID_PREFIX.PRODUCT,

  FIELDS: PRODUCT_FIELDS,

  DEFAULT: {
    [SYSTEM_COLUMNS.IS_DELETED]: false,

    [SYSTEM_COLUMNS.IS_ACTIVE]: true,
  },

  VALIDATION: {
    [PRODUCT_FIELDS.NAME]: {
      required: true,

      maxLength: 100,
    },

    [PRODUCT_FIELDS.CATEGORY]: {
      required: true,

      maxLength: 50,
    },

    [PRODUCT_FIELDS.UNIT]: {
      required: true,

      maxLength: 20,
    },

    [PRODUCT_FIELDS.PRICE]: {
      required: true,

      numeric: true,

      min: 0,
    },
  },

  READONLY: {
    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true,
  },

  SEARCHABLE: [PRODUCT_FIELDS.NAME, PRODUCT_FIELDS.CATEGORY],

  UI: {
    TITLE: "Produk",

    ICON: "package",

    COLOR: "blue",

    SEARCH_PLACEHOLDER: "Cari produk...",
  },
});

/**
 * =============================================================================
 * PARTNER
 * =============================================================================
 */

const PARTNER_FIELDS = Object.freeze({
  ID: SYSTEM_COLUMNS.PRIMARY_KEY,

  NAME: "Nama",

  ADDRESS: "Alamat",

  PHONE: "Telepon",

  TYPE: "Jenis",
});

const PARTNER_SCHEMA = createSchema({
  NAME: "Partner",

  TABLE: SHEET_NAMES.PARTNERS,

  PRIMARY_KEY: PARTNER_FIELDS.ID,

  DISPLAY_FIELD: PARTNER_FIELDS.NAME,

  ID_PREFIX: ID_PREFIX.PARTNER,

  FIELDS: PARTNER_FIELDS,

  DEFAULT: {
    [SYSTEM_COLUMNS.IS_DELETED]: false,

    [SYSTEM_COLUMNS.IS_ACTIVE]: true,
  },

  VALIDATION: {
    [PARTNER_FIELDS.NAME]: {
      required: true,

      maxLength: 100,
    },

    [PARTNER_FIELDS.ADDRESS]: {
      required: false,

      maxLength: 255,
    },

    [PARTNER_FIELDS.PHONE]: {
      required: false,

      maxLength: 30,
    },

    [PARTNER_FIELDS.TYPE]: {
      required: true,

      maxLength: 30,
    },
  },

  READONLY: {
    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true,
  },

  SEARCHABLE: [PARTNER_FIELDS.NAME, PARTNER_FIELDS.PHONE, PARTNER_FIELDS.TYPE],

  UI: {
    TITLE: "Mitra",

    ICON: "users",

    COLOR: "emerald",

    SEARCH_PLACEHOLDER: "Cari mitra...",
  },
});

/**
 * =============================================================================
 * PICKUP HEADER
 * =============================================================================
 */

const PICKUP_HEADER_FIELDS = Object.freeze({
  ID: SYSTEM_COLUMNS.PRIMARY_KEY,

  NUMBER: "PickupNo",

  DATE: "Tanggal",

  PARTNER_ID: "PartnerID",

  TOTAL_ITEM: "TotalItem",

  TOTAL_QTY: "TotalQty",

  STATUS: "Status",

  NOTES: "Notes",
});

const PICKUP_HEADER_SCHEMA = createSchema({
  NAME: "PickupHeader",

  TABLE: "PickupHeaders",

  PRIMARY_KEY: PICKUP_HEADER_FIELDS.ID,

  DISPLAY_FIELD: PICKUP_HEADER_FIELDS.NUMBER,

  ID_PREFIX: "PH",

  FIELDS: PICKUP_HEADER_FIELDS,

  DEFAULT: {
    [PICKUP_HEADER_FIELDS.TOTAL_ITEM]: 0,

    [PICKUP_HEADER_FIELDS.TOTAL_QTY]: 0,

    [PICKUP_HEADER_FIELDS.STATUS]: "Posted",

    [PICKUP_HEADER_FIELDS.NOTES]: "",

    [SYSTEM_COLUMNS.IS_DELETED]: false,

    [SYSTEM_COLUMNS.IS_ACTIVE]: true,
  },

  VALIDATION: {
    [PICKUP_HEADER_FIELDS.DATE]: {
      required: true,
    },

    [PICKUP_HEADER_FIELDS.PARTNER_ID]: {
      required: true,
    },

    [PICKUP_HEADER_FIELDS.STATUS]: {
      required: true,
    },
  },

  READONLY: {
    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true,
  },

  SEARCHABLE: [PICKUP_HEADER_FIELDS.NUMBER, PICKUP_HEADER_FIELDS.PARTNER_ID],

  UI: {
    TITLE: "Pickup",

    ICON: "truck",

    COLOR: "cyan",

    SEARCH_PLACEHOLDER: "Cari pickup...",
  },
});

/**
 * =============================================================================
 * PICKUP DETAIL
 * =============================================================================
 */

const PICKUP_DETAIL_FIELDS = Object.freeze({
  ID: SYSTEM_COLUMNS.PRIMARY_KEY,

  PICKUP_ID: "PickupID",

  PRODUCT_ID: "ProductID",

  QTY: "Qty",

  NOTES: "Notes",
});

const PICKUP_DETAIL_SCHEMA = createSchema({
  NAME: "PickupDetail",

  TABLE: "PickupDetails",

  PRIMARY_KEY: PICKUP_DETAIL_FIELDS.ID,

  DISPLAY_FIELD: PICKUP_DETAIL_FIELDS.ID,

  ID_PREFIX: "PD",

  FIELDS: PICKUP_DETAIL_FIELDS,

  DEFAULT: {
    [PICKUP_DETAIL_FIELDS.NOTES]: "",

    [SYSTEM_COLUMNS.IS_DELETED]: false,

    [SYSTEM_COLUMNS.IS_ACTIVE]: true,
  },

  VALIDATION: {
    [PICKUP_DETAIL_FIELDS.PICKUP_ID]: {
      required: true,
    },

    [PICKUP_DETAIL_FIELDS.PRODUCT_ID]: {
      required: true,
    },

    [PICKUP_DETAIL_FIELDS.QTY]: {
      required: true,

      numeric: true,

      min: 1,
    },
  },

  READONLY: {
    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true,
  },

  SEARCHABLE: [PICKUP_DETAIL_FIELDS.PICKUP_ID, PICKUP_DETAIL_FIELDS.PRODUCT_ID],

  UI: {
    TITLE: "Pickup Detail",

    ICON: "package",

    COLOR: "cyan",

    SEARCH_PLACEHOLDER: "Cari detail pickup...",
  },
});

/**
 * =============================================================================
 * RETURN
 * =============================================================================
 */

const RETURN_FIELDS = Object.freeze({
  ID: SYSTEM_COLUMNS.PRIMARY_KEY,

  PICKUP_ID: "PickupID",

  PICKUP_DETAIL_ID: "PickupDetailID",

  DATE: "Tanggal",

  QTY: "Qty",

  NOTE: "Keterangan",
});

const RETURN_SCHEMA = createSchema({
  NAME: "Return",

  TABLE: SHEET_NAMES.RETURNS,

  PRIMARY_KEY: RETURN_FIELDS.ID,

  DISPLAY_FIELD: RETURN_FIELDS.ID,

  ID_PREFIX: ID_PREFIX.RETURN,

  FIELDS: RETURN_FIELDS,

  DEFAULT: {
    [SYSTEM_COLUMNS.IS_DELETED]: false,

    [SYSTEM_COLUMNS.IS_ACTIVE]: true,
  },

  VALIDATION: {
    [RETURN_FIELDS.PICKUP_ID]: {
      required: true,
    },

    [RETURN_FIELDS.PICKUP_DETAIL_ID]: {
      required: true,
    },

    [RETURN_FIELDS.DATE]: {
      required: true,
    },

    [RETURN_FIELDS.QTY]: {
      required: true,

      numeric: true,

      min: 1,
    },

    [RETURN_FIELDS.NOTE]: {
      required: false,

      maxLength: 255,
    },
  },

  READONLY: {
    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true,

    [RETURN_FIELDS.PICKUP_ID]: true,

    [RETURN_FIELDS.PICKUP_DETAIL_ID]: true,
  },

  SEARCHABLE: [
    RETURN_FIELDS.PICKUP_ID,

    RETURN_FIELDS.PICKUP_DETAIL_ID,

    RETURN_FIELDS.NOTE,
  ],

  UI: {
    TITLE: "Retur Product",

    ICON: "rotate-ccw",

    COLOR: "amber",

    SEARCH_PLACEHOLDER: "Cari retur...",
  },
});

/**
 * =============================================================================
 * PURCHASING
 * =============================================================================
 */

const PURCHASING_FIELDS = Object.freeze({
  ID: SYSTEM_COLUMNS.PRIMARY_KEY,

  DATE: "Tanggal",

  SUPPLIER_ID: "SupplierID",

  PRODUCT_ID: "ProductID",

  QTY: "Qty",

  PRICE: "Harga",

  TOTAL: "Total",
});

const PURCHASING_SCHEMA = createSchema({
  NAME: "Purchase",

  TABLE: SHEET_NAMES.PURCHASES,

  PRIMARY_KEY: PURCHASING_FIELDS.ID,

  DISPLAY_FIELD: PURCHASING_FIELDS.ID,

  ID_PREFIX: ID_PREFIX.PURCHASE,

  FIELDS: PURCHASING_FIELDS,

  DEFAULT: {
    [SYSTEM_COLUMNS.IS_DELETED]: false,

    [SYSTEM_COLUMNS.IS_ACTIVE]: true,
  },

  VALIDATION: {
    [PURCHASING_FIELDS.DATE]: {
      required: true,
    },

    [PURCHASING_FIELDS.SUPPLIER_ID]: {
      required: true,
    },

    [PURCHASING_FIELDS.PRODUCT_ID]: {
      required: true,
    },

    [PURCHASING_FIELDS.QTY]: {
      required: true,

      numeric: true,

      min: 1,
    },

    [PURCHASING_FIELDS.PRICE]: {
      required: true,

      numeric: true,

      min: 0,
    },

    [PURCHASING_FIELDS.TOTAL]: {
      required: true,

      numeric: true,

      min: 0,
    },
  },

  READONLY: {
    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true,
  },

  SEARCHABLE: [PURCHASING_FIELDS.SUPPLIER_ID, PURCHASING_FIELDS.PRODUCT_ID],

  UI: {
    TITLE: "Purchasing",

    ICON: "shopping-cart",

    COLOR: "violet",

    SEARCH_PLACEHOLDER: "Cari purchasing...",
  },
});

/**
 * =============================================================================
 * EXPENSE
 * =============================================================================
 */

const EXPENSE_FIELDS = Object.freeze({
  ID: SYSTEM_COLUMNS.PRIMARY_KEY,

  DATE: "Tanggal",

  CATEGORY: "Kategori",

  DESCRIPTION: "Keterangan",

  AMOUNT: "Nominal",
});

const EXPENSE_SCHEMA = createSchema({
  NAME: "Expense",

  TABLE: SHEET_NAMES.EXPENSES,

  PRIMARY_KEY: EXPENSE_FIELDS.ID,

  DISPLAY_FIELD: EXPENSE_FIELDS.DESCRIPTION,

  ID_PREFIX: ID_PREFIX.EXPENSE,

  FIELDS: EXPENSE_FIELDS,

  DEFAULT: {
    [SYSTEM_COLUMNS.IS_DELETED]: false,

    [SYSTEM_COLUMNS.IS_ACTIVE]: true,
  },

  VALIDATION: {
    [EXPENSE_FIELDS.DATE]: {
      required: true,
    },

    [EXPENSE_FIELDS.CATEGORY]: {
      required: true,

      maxLength: 100,
    },

    [EXPENSE_FIELDS.DESCRIPTION]: {
      required: true,

      maxLength: 255,
    },

    [EXPENSE_FIELDS.AMOUNT]: {
      required: true,

      numeric: true,

      min: 0,
    },
  },

  READONLY: {
    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true,
  },

  SEARCHABLE: [EXPENSE_FIELDS.CATEGORY, EXPENSE_FIELDS.DESCRIPTION],

  UI: {
    TITLE: "Expense",

    ICON: "wallet",

    COLOR: "red",

    SEARCH_PLACEHOLDER: "Cari expense...",
  },
});

/**
 * =============================================================================
 * SETTINGS
 * =============================================================================
 */

const SETTINGS_FIELDS = Object.freeze({
  ID: SYSTEM_COLUMNS.PRIMARY_KEY,
  KEY: "Key",
  VALUE: "Value",
  TYPE: "Type",
  GROUP: "Group",
  LABEL: "Label",
  DESCRIPTION: "Description",
  IS_EDITABLE: "IsEditable",
});

const SETTINGS_SCHEMA = createSchema({
  NAME: "Setting",
  TABLE: SHEET_NAMES.SETTINGS,
  PRIMARY_KEY: SETTINGS_FIELDS.ID,
  DISPLAY_FIELD: SETTINGS_FIELDS.LABEL,
  ID_PREFIX: ID_PREFIX.SETTING,
  FIELDS: SETTINGS_FIELDS,
  DEFAULT: {
    [SYSTEM_COLUMNS.IS_DELETED]: false,
    [SYSTEM_COLUMNS.IS_ACTIVE]: true,
  },
  VALIDATION: {},
  READONLY: {
    [SETTINGS_FIELDS.ID]: true,
    [SETTINGS_FIELDS.KEY]: true,
    [SETTINGS_FIELDS.TYPE]: true,
    [SETTINGS_FIELDS.GROUP]: true,
    [AUDIT_COLUMNS.CREATED_AT]: true,
    [AUDIT_COLUMNS.CREATED_BY]: true,
  },
  SEARCHABLE: [SETTINGS_FIELDS.KEY, SETTINGS_FIELDS.LABEL],
  UI: {
    TITLE: "Settings",
    ICON: "gear",
    COLOR: "slate",
    SEARCH_PLACEHOLDER: "Search settings...",
  },
});

/** Canonical append-only operational and audit log. */
const LOG_FIELDS = Object.freeze({
  ID: "ID", TIMESTAMP: "Timestamp", LEVEL: "Level", CATEGORY: "Category",
  MODULE: "Module", ACTION: "Action", ENTITY_TYPE: "EntityType",
  ENTITY_ID: "EntityID", ACTOR: "Actor", STATUS: "Status", MESSAGE: "Message",
  BEFORE_DATA: "BeforeData", AFTER_DATA: "AfterData", CONTEXT: "Context",
  DURATION_MS: "DurationMs", CORRELATION_ID: "CorrelationID", SOURCE: "Source",
  ERROR_NAME: "ErrorName", ERROR_MESSAGE: "ErrorMessage", ERROR_STACK: "ErrorStack",
  CREATED_AT: "CreatedAt",
});

const LOG_SCHEMA = Object.freeze({
  NAME: "Log", TABLE: SHEET_NAMES.LOGS, PRIMARY_KEY: LOG_FIELDS.ID,
  ID_PREFIX: ID_PREFIX.LOG, FIELDS: LOG_FIELDS,
  HEADERS: Object.freeze(Object.values(LOG_FIELDS)),
});

/**
 * =============================================================================
 * SCHEMA REGISTRY
 * =============================================================================
 */

const SCHEMA = Object.freeze({
  PRODUCT: PRODUCT_SCHEMA,

  PARTNER: PARTNER_SCHEMA,

  PICKUP_HEADER: PICKUP_HEADER_SCHEMA,

  PICKUP_DETAIL: PICKUP_DETAIL_SCHEMA,

  RETURN: RETURN_SCHEMA,

  PURCHASE: PURCHASING_SCHEMA,

  EXPENSE: EXPENSE_SCHEMA,

  SETTINGS: SETTINGS_SCHEMA,

  LOGS: LOG_SCHEMA,
});
