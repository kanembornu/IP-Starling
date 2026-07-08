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

      UPDATED_BY: AUDIT_COLUMNS.UPDATED_BY

    }),

    DEFAULT: Object.freeze(options.DEFAULT),

    VALIDATION: Object.freeze(options.VALIDATION),

    READONLY: Object.freeze(options.READONLY),

    SEARCHABLE: Object.freeze(options.SEARCHABLE),

    UI: Object.freeze({

      TITLE: options.UI.TITLE,

      ICON: options.UI.ICON,

      COLOR: options.UI.COLOR,

      SEARCH_PLACEHOLDER: options.UI.SEARCH_PLACEHOLDER

    })

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

  PRICE: "Harga"

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

    [SYSTEM_COLUMNS.IS_ACTIVE]: true

  },

  VALIDATION: {

    [PRODUCT_FIELDS.NAME]: {

      required: true,

      maxLength: 100

    },

    [PRODUCT_FIELDS.CATEGORY]: {

      required: true,

      maxLength: 50

    },

    [PRODUCT_FIELDS.UNIT]: {

      required: true,

      maxLength: 20

    },

    [PRODUCT_FIELDS.PRICE]: {

      required: true,

      numeric: true,

      min: 0

    }

  },

  READONLY: {

    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true

  },

  SEARCHABLE: [

    PRODUCT_FIELDS.NAME,

    PRODUCT_FIELDS.CATEGORY

  ],

  UI: {

    TITLE: "Produk",

    ICON: "package",

    COLOR: "blue",

    SEARCH_PLACEHOLDER: "Cari produk..."

  }

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

  TYPE: "Jenis"

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

    [SYSTEM_COLUMNS.IS_ACTIVE]: true

  },

  VALIDATION: {

    [PARTNER_FIELDS.NAME]: {

      required: true,

      maxLength: 100

    },

    [PARTNER_FIELDS.ADDRESS]: {

      required: false,

      maxLength: 255

    },

    [PARTNER_FIELDS.PHONE]: {

      required: false,

      maxLength: 30

    },

    [PARTNER_FIELDS.TYPE]: {

      required: true,

      maxLength: 30

    }

  },

  READONLY: {

    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true

  },

  SEARCHABLE: [

    PARTNER_FIELDS.NAME,

    PARTNER_FIELDS.PHONE,

    PARTNER_FIELDS.TYPE

  ],

  UI: {

    TITLE: "Mitra",

    ICON: "users",

    COLOR: "emerald",

    SEARCH_PLACEHOLDER: "Cari mitra..."

  }

});



/**
 * =============================================================================
 * PICKUP
 * =============================================================================
 */

const PICKUP_FIELDS = Object.freeze({

  ID: SYSTEM_COLUMNS.PRIMARY_KEY,

  DATE: "Tanggal",

  PARTNER_ID: "PartnerID",

  PRODUCT_ID: "ProductID",

  QTY: "Qty"

});


const PICKUP_SCHEMA = createSchema({

  NAME: "Pickup",

  TABLE: SHEET_NAMES.PICKUPS,

  PRIMARY_KEY: PICKUP_FIELDS.ID,

  DISPLAY_FIELD: PICKUP_FIELDS.ID,

  ID_PREFIX: ID_PREFIX.PICKUP,

  FIELDS: PICKUP_FIELDS,

  DEFAULT: {

    [SYSTEM_COLUMNS.IS_DELETED]: false,

    [SYSTEM_COLUMNS.IS_ACTIVE]: true

  },

  VALIDATION: {

    [PICKUP_FIELDS.DATE]: {

      required: true

    },

    [PICKUP_FIELDS.PARTNER_ID]: {

      required: true

    },

    [PICKUP_FIELDS.PRODUCT_ID]: {

      required: true

    },

    [PICKUP_FIELDS.QTY]: {

      required: true,

      numeric: true,

      min: 1

    }

  },

  READONLY: {

    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true

  },

  SEARCHABLE: [

    PICKUP_FIELDS.PARTNER_ID,

    PICKUP_FIELDS.PRODUCT_ID

  ],

  UI: {

    TITLE: "Pickup Product",

    ICON: "truck",

    COLOR: "cyan",

    SEARCH_PLACEHOLDER: "Cari pickup..."

  }

});

/**
 * =============================================================================
 * RETURN
 * =============================================================================
 */

const RETURN_FIELDS = Object.freeze({

  ID: SYSTEM_COLUMNS.PRIMARY_KEY,

  PICKUP_ID: "PickupID",

  DATE: "Tanggal",

  QTY: "Qty",

  NOTE: "Keterangan"

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

    [SYSTEM_COLUMNS.IS_ACTIVE]: true

  },

  VALIDATION: {

    [RETURN_FIELDS.PICKUP_ID]: {

      required: true

    },

    [RETURN_FIELDS.DATE]: {

      required: true

    },

    [RETURN_FIELDS.QTY]: {

      required: true,

      numeric: true,

      min: 1

    },

    [RETURN_FIELDS.NOTE]: {

      required: false,

      maxLength: 255

    }

  },

  READONLY: {

    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true

  },

  SEARCHABLE: [

    RETURN_FIELDS.PICKUP_ID,

    RETURN_FIELDS.NOTE

  ],

  UI: {

    TITLE: "Retur Product",

    ICON: "rotate-ccw",

    COLOR: "amber",

    SEARCH_PLACEHOLDER: "Cari retur..."

  }

});



/**
 * =============================================================================
 * PURCHASING
 * =============================================================================
 */

const PURCHASE_FIELDS = Object.freeze({

  ID: SYSTEM_COLUMNS.PRIMARY_KEY,

  DATE: "Tanggal",

  SUPPLIER_ID: "SupplierID",

  PRODUCT_ID: "ProductID",

  QTY: "Qty",

  PRICE: "Harga",

  TOTAL: "Total"

});


const PURCHASE_SCHEMA = createSchema({

  NAME: "Purchase",

  TABLE: SHEET_NAMES.PURCHASES,

  PRIMARY_KEY: PURCHASE_FIELDS.ID,

  DISPLAY_FIELD: PURCHASE_FIELDS.ID,

  ID_PREFIX: ID_PREFIX.PURCHASE,

  FIELDS: PURCHASE_FIELDS,

  DEFAULT: {

    [SYSTEM_COLUMNS.IS_DELETED]: false,

    [SYSTEM_COLUMNS.IS_ACTIVE]: true

  },

  VALIDATION: {

    [PURCHASE_FIELDS.DATE]: {

      required: true

    },

    [PURCHASE_FIELDS.SUPPLIER_ID]: {

      required: true

    },

    [PURCHASE_FIELDS.PRODUCT_ID]: {

      required: true

    },

    [PURCHASE_FIELDS.QTY]: {

      required: true,

      numeric: true,

      min: 1

    },

    [PURCHASE_FIELDS.PRICE]: {

      required: true,

      numeric: true,

      min: 0

    },

    [PURCHASE_FIELDS.TOTAL]: {

      required: true,

      numeric: true,

      min: 0

    }

  },

  READONLY: {

    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true

  },

  SEARCHABLE: [

    PURCHASE_FIELDS.SUPPLIER_ID,

    PURCHASE_FIELDS.PRODUCT_ID

  ],

  UI: {

    TITLE: "Purchasing",

    ICON: "shopping-cart",

    COLOR: "violet",

    SEARCH_PLACEHOLDER: "Cari purchasing..."

  }

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

  AMOUNT: "Nominal"

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

    [SYSTEM_COLUMNS.IS_ACTIVE]: true

  },

  VALIDATION: {

    [EXPENSE_FIELDS.DATE]: {

      required: true

    },

    [EXPENSE_FIELDS.CATEGORY]: {

      required: true,

      maxLength: 100

    },

    [EXPENSE_FIELDS.DESCRIPTION]: {

      required: true,

      maxLength: 255

    },

    [EXPENSE_FIELDS.AMOUNT]: {

      required: true,

      numeric: true,

      min: 0

    }

  },

  READONLY: {

    [SYSTEM_COLUMNS.PRIMARY_KEY]: true,

    [AUDIT_COLUMNS.CREATED_AT]: true,

    [AUDIT_COLUMNS.CREATED_BY]: true

  },

  SEARCHABLE: [

    EXPENSE_FIELDS.CATEGORY,

    EXPENSE_FIELDS.DESCRIPTION

  ],

  UI: {

    TITLE: "Expense",

    ICON: "wallet",

    COLOR: "red",

    SEARCH_PLACEHOLDER: "Cari expense..."

  }

});



/**
 * =============================================================================
 * SCHEMA REGISTRY
 * =============================================================================
 */

const SCHEMA = Object.freeze({

  PRODUCT: PRODUCT_SCHEMA,

  PARTNER: PARTNER_SCHEMA,

  PICKUP: PICKUP_SCHEMA,

  RETURN: RETURN_SCHEMA,

  PURCHASE: PURCHASE_SCHEMA,

  EXPENSE: EXPENSE_SCHEMA

});