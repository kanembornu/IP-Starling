function testDatabase() {
  Logger.log(Database.sheetNames());
}

function testUtils() {
  Logger.log(Utils.today());

  Logger.log(Utils.uuid());

  Logger.log(Utils.currentUser());

  Logger.log(Utils.merge({ A: 1, B: 2 }, { B: 5, C: 9 }));
}

function testRouter() {
  Logger.log(Router.pageTitle("Dashboard"));
}

function testResolvePage() {
  Logger.log(
    resolvePage({
      parameter: {
        page: "products",
      },
    }),
  );
}

function testResolvePage2() {
  Logger.log(
    resolvePage({
      parameter: {
        page: "abcxyz",
      },
    }),
  );
}

function testRepositoryBase() {
  Logger.log(RepositoryBase.headers(PRODUCT_SCHEMA));

  Logger.log(RepositoryBase.headerMap(PRODUCT_SCHEMA));
}

function clearProductCache() {
  RepositoryCache.clear(PRODUCT_SCHEMA);
}

function testRepositoryReader() {
  Logger.log("===== COUNT =====");

  Logger.log(RepositoryReader.count(PRODUCT_SCHEMA));

  Logger.log("===== FIND ALL =====");

  Logger.log(RepositoryReader.findAll(PRODUCT_SCHEMA));
}

function testFindRowIndex() {
  Logger.log(RepositoryBase.findRowIndex(PRODUCT_SCHEMA, "PR260700001"));
}

function testWriterInsert() {
  const product = {
    ID: "PRTEST001",

    Nama: "Repository Test",

    Kategori: "Coffee",

    Satuan: "Cup",

    Harga: 15000,

    Deleted: false,

    CreatedBy: "SYSTEM",

    CreatedAt: new Date(),

    UpdatedBy: "SYSTEM",

    UpdatedAt: new Date(),

    IsActive: true,
  };

  Logger.log(
    RepositoryWriter.insert(
      PRODUCT_SCHEMA,

      product,
    ),
  );
}

function testWriterUpdate() {
  Logger.log(
    RepositoryWriter.update(
      PRODUCT_SCHEMA,

      "PRTEST001",

      {
        Harga: 20000,
      },
    ),
  );
}

function testWriterDelete() {
  Logger.log(
    RepositoryWriter.softDelete(
      PRODUCT_SCHEMA,

      "PRTEST001",
    ),
  );
}

function testWriterRestore() {
  Logger.log(
    RepositoryWriter.restore(
      PRODUCT_SCHEMA,

      "PRTEST001",
    ),
  );
}

function testRepositoryQuery() {
  const data = [
    {
      ID: "PR001",
      Nama: "Americano",
      Kategori: "Coffee",
      Harga: 15000,
    },

    {
      ID: "PR002",
      Nama: "Latte",
      Kategori: "Coffee",
      Harga: 18000,
    },

    {
      ID: "PR003",
      Nama: "Matcha",
      Kategori: "Tea",
      Harga: 20000,
    },
  ];

  Logger.log("===== WHERE =====");
  Logger.log(RepositoryQuery.where(data, (x) => x.Kategori === "Coffee"));

  Logger.log("===== SEARCH =====");
  Logger.log(RepositoryQuery.search(data, "lat", ["Nama"]));

  Logger.log("===== ORDER =====");
  Logger.log(RepositoryQuery.orderBy(data, "Harga", "desc"));

  Logger.log("===== LIMIT =====");
  Logger.log(RepositoryQuery.limit(data, 2));

  Logger.log("===== PAGINATE =====");
  Logger.log(RepositoryQuery.paginate(data, 1, 2));

  Logger.log("===== SELECT =====");
  Logger.log(RepositoryQuery.select(data, ["ID", "Nama"]));
}

function testIDGenerator() {
  Logger.log(IDGenerator.generate(PRODUCT_SCHEMA));

  Logger.log(IDGenerator.generate(PRODUCT_SCHEMA));

  Logger.log(IDGenerator.generate(PARTNER_SCHEMA));
}

function testValidator() {
  const product = {
    Nama: "",

    Kategori: "Coffee",

    Satuan: "Cup",

    Harga: "abc",
  };

  Logger.log(
    Validator.validate(
      PRODUCT_SCHEMA,

      product,
    ),
  );
}

function testLogger() {
  AppLogger.info("Application started");

  AppLogger.warn("Stock is low");

  AppLogger.error("Validation failed", {
    product: "Americano",

    price: "ABC",
  });
}

function testResponse() {
  Logger.log(
    Response.success(
      {
        id: "PR001",

        name: "Americano",
      },

      "Data berhasil disimpan.",
    ),
  );

  Logger.log(Response.error("Produk tidak ditemukan."));

  Logger.log(
    Response.validation(
      Validator.validate(
        PRODUCT_SCHEMA,

        {
          Nama: "",

          Harga: "abc",
        },
      ),
    ),
  );
}

function testBaseServiceRead() {
  const Product = BaseService.create(PRODUCT_SCHEMA);

  Logger.log(Product.findAll());
}

function testBaseServiceCreate() {
  const Product = BaseService.create(PRODUCT_SCHEMA);

  const result = Product.create({
    Nama: "Americano",

    Kategori: "Coffee",

    Satuan: "Cup",

    Harga: 15000,
  });

  Logger.log(JSON.stringify(result, null, 2));
}

function testSchema() {
  Logger.log(PRODUCT_SCHEMA);

  Logger.log(PARTNER_SCHEMA);

  Logger.log(PICKUP_HEADER_SCHEMA);

  Logger.log(PICKUP_DETAIL_SCHEMA);

  Logger.log(RETURN_SCHEMA);

  Logger.log(PURCHASING_SCHEMA);

  Logger.log(EXPENSE_SCHEMA);
}

function testValidatorPartial() {
  Logger.log(
    Validator.validate(
      PRODUCT_SCHEMA,

      {
        Harga: 20000,
      },

      {
        partial: true,
      },
    ),
  );
}

function testBaseService() {
  const Product = BaseService.create(PRODUCT_SCHEMA);

  Logger.log(
    JSON.stringify(
      Product.findAll(),

      null,

      2,
    ),
  );
}

function testEntityService() {
  const Product = EntityService.create(PRODUCT_SCHEMA);

  Logger.log("===== ACTIVE =====");
  Logger.log(JSON.stringify(Product.findActive(), null, 2));

  Logger.log("===== INACTIVE =====");
  Logger.log(JSON.stringify(Product.findInactive(), null, 2));

  Logger.log("===== SEARCH =====");
  Logger.log(JSON.stringify(Product.search("americano"), null, 2));

  Logger.log("===== DROPDOWN =====");
  Logger.log(JSON.stringify(Product.dropdown(), null, 2));

  Logger.log("===== STATISTICS =====");
  Logger.log(JSON.stringify(Product.statistics(), null, 2));
}

function testProductService() {
  const service = ProductService();

  Logger.log("===== FIND ALL =====");
  Logger.log(JSON.stringify(service.findAll(), null, 2));

  Logger.log("===== SEARCH =====");
  Logger.log(JSON.stringify(service.search("americano"), null, 2));

  Logger.log("===== DROPDOWN =====");
  Logger.log(JSON.stringify(service.dropdown(), null, 2));

  Logger.log("===== STATISTICS =====");
  Logger.log(JSON.stringify(service.statistics(), null, 2));
}

function testPartnerService() {
  const service = PartnerService();

  Logger.log("===== FIND ALL =====");
  Logger.log(JSON.stringify(service.findAll(), null, 2));

  Logger.log("===== SEARCH =====");
  Logger.log(JSON.stringify(service.search("partner"), null, 2));

  Logger.log("===== DROPDOWN =====");
  Logger.log(JSON.stringify(service.dropdown(), null, 2));

  Logger.log("===== STATISTICS =====");
  Logger.log(JSON.stringify(service.statistics(), null, 2));
}

function testPickupServicePublicApi() {
  const keys = Object.keys(PickupService()).sort();

  const expectedKeys = [
    "create",
    "findAll",
    "findById",
    "remove",
    "restore",
    "update",
  ];

  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    throw new Error("PickupService public API is invalid.");
  }

  Logger.log("PickupService public API passed.");
}

function testPickupServiceFindAll() {
  const response = PickupService().findAll();

  if (!response.success || !Array.isArray(response.data)) {
    throw new Error("PickupService.findAll() response is invalid.");
  }

  Logger.log(response);
}

function testPickupServiceFindByIdValidation() {
  const response = PickupService().findById(" ");

  if (response.success || response.data !== null) {
    throw new Error("PickupService.findById() must reject an empty ID.");
  }

  Logger.log(response);
}

function testPickupServiceHeaderDetailRead() {
  const service = PickupService();

  const headers = service.findAll();

  if (headers.data.length === 0) {
    Logger.log("No pickup header data available; header-detail test skipped.");

    return;
  }

  const id = headers.data[0][PICKUP_HEADER_SCHEMA.PRIMARY_KEY];

  const response = service.findById(id);

  if (
    !response.success ||
    !response.data ||
    !response.data.header ||
    !Array.isArray(response.data.details)
  ) {
    throw new Error("PickupService header-detail response is invalid.");
  }

  Logger.log(response);
}

function assertPickupCreateFailure(document) {
  const headerCount = RepositoryReader.count(PICKUP_HEADER_SCHEMA);

  const detailCount = RepositoryReader.count(PICKUP_DETAIL_SCHEMA);

  const response = PickupService().create(document);

  if (response.success) {
    throw new Error("Pickup creation should have failed.");
  }

  if (
    RepositoryReader.count(PICKUP_HEADER_SCHEMA) !== headerCount ||
    RepositoryReader.count(PICKUP_DETAIL_SCHEMA) !== detailCount
  ) {
    throw new Error("Invalid pickup creation must not write data.");
  }

  Logger.log(response);
}

function findActivePickupTestPartner() {
  const partner = RepositoryReader.findAll(PARTNER_SCHEMA).find((item) => {
    return item[PARTNER_SCHEMA.SYSTEM.IS_ACTIVE] === true;
  });

  if (!partner) {
    Logger.log("SKIPPED: Active Partner data is required for this Pickup test.");

    return null;
  }

  return partner;
}

function findActivePickupTestProducts(count) {
  const ids = Object.create(null);

  const products = RepositoryReader.findAll(PRODUCT_SCHEMA).filter((item) => {
    const id = item[PRODUCT_SCHEMA.PRIMARY_KEY];

    if (item[PRODUCT_SCHEMA.SYSTEM.IS_ACTIVE] !== true || ids[id]) {
      return false;
    }

    ids[id] = true;

    return true;
  });

  if (products.length < count) {
    Logger.log(
      `SKIPPED: ${count} distinct active Product record(s) are required for this Pickup test.`,
    );

    return null;
  }

  return products;
}

function testPickupCreateMissingDocument() {
  assertPickupCreateFailure(null);
}

function testPickupCreateMissingHeader() {
  assertPickupCreateFailure({
    details: [{}],
  });
}

function testPickupCreateEmptyDetails() {
  assertPickupCreateFailure({
    header: {},

    details: [],
  });
}

function testPickupCreateMissingTanggal() {
  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.PARTNER_ID]: "PARTNER_TEST",
    },

    details: [{}],
  });
}

function testPickupCreateMissingPartnerId() {
  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),
    },

    details: [{}],
  });
}

function testPickupCreateInvalidPartnerId() {
  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]: "PARTNER_TEST_INVALID",
    },

    details: [{}],
  });
}

function testPickupCreateMissingProductId() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]:
        partner[PARTNER_SCHEMA.PRIMARY_KEY],
    },

    details: [
      {
        [PICKUP_DETAIL_FIELDS.QTY]: 1,
      },
    ],
  });
}

function testPickupCreateInvalidProductId() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]:
        partner[PARTNER_SCHEMA.PRIMARY_KEY],
    },

    details: [
      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]: "PRODUCT_TEST_INVALID",

        [PICKUP_DETAIL_FIELDS.QTY]: 1,
      },
    ],
  });
}

function testPickupCreateInvalidQty() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  const products = findActivePickupTestProducts(1);

  if (!products) {
    return;
  }

  [0, -1].forEach((qty) => {
    assertPickupCreateFailure({
      header: {
        [PICKUP_HEADER_FIELDS.DATE]: new Date(),

        [PICKUP_HEADER_FIELDS.PARTNER_ID]:
          partner[PARTNER_SCHEMA.PRIMARY_KEY],
      },

      details: [
        {
          [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
            products[0][PRODUCT_SCHEMA.PRIMARY_KEY],

          [PICKUP_DETAIL_FIELDS.QTY]: qty,
        },
      ],
    });
  });
}

function testPickupCreateDuplicateProductId() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  const products = findActivePickupTestProducts(1);

  if (!products) {
    return;
  }

  assertPickupCreateFailure({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]:
        partner[PARTNER_SCHEMA.PRIMARY_KEY],
    },

    details: [
      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
          products[0][PRODUCT_SCHEMA.PRIMARY_KEY],

        [PICKUP_DETAIL_FIELDS.QTY]: 1,
      },

      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
          products[0][PRODUCT_SCHEMA.PRIMARY_KEY],

        [PICKUP_DETAIL_FIELDS.QTY]: 1,
      },
    ],
  });
}

function testPickupCreateValidSingleItem() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  const products = findActivePickupTestProducts(1);

  if (!products) {
    return;
  }

  const response = PickupService().create({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]:
        partner[PARTNER_SCHEMA.PRIMARY_KEY],

      [PICKUP_HEADER_FIELDS.NOTES]: "[TEST] Pickup single-item manual cleanup",
    },

    details: [
      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
          products[0][PRODUCT_SCHEMA.PRIMARY_KEY],

        [PICKUP_DETAIL_FIELDS.QTY]: 2,

        [PICKUP_DETAIL_FIELDS.NOTES]: "[TEST] Pickup single-item detail",
      },
    ],
  });

  if (
    !response.success ||
    !response.data ||
    !response.data.header ||
    response.data.details.length !== 1 ||
    response.data.header[PICKUP_HEADER_FIELDS.NUMBER] !==
      response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY] ||
    response.data.header[PICKUP_HEADER_FIELDS.TOTAL_ITEM] !== 1 ||
    response.data.header[PICKUP_HEADER_FIELDS.TOTAL_QTY] !== 2 ||
    response.data.details[0][PICKUP_DETAIL_FIELDS.PICKUP_ID] !==
      response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]
  ) {
    throw new Error("Single-item pickup creation response is invalid.");
  }

  Logger.log(
    `Pickup test created header ${response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]} and detail ${response.data.details[0][PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]}.`,
  );
}

function testPickupCreateValidMultiItem() {
  const partner = findActivePickupTestPartner();

  if (!partner) {
    return;
  }

  const products = findActivePickupTestProducts(2);

  if (!products) {
    return;
  }

  const response = PickupService().create({
    header: {
      [PICKUP_HEADER_FIELDS.DATE]: new Date(),

      [PICKUP_HEADER_FIELDS.PARTNER_ID]:
        partner[PARTNER_SCHEMA.PRIMARY_KEY],

      [PICKUP_HEADER_FIELDS.NOTES]: "[TEST] Pickup multi-item manual cleanup",
    },

    details: [
      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
          products[0][PRODUCT_SCHEMA.PRIMARY_KEY],

        [PICKUP_DETAIL_FIELDS.QTY]: 2,

        [PICKUP_DETAIL_FIELDS.NOTES]: "[TEST] Pickup multi-item detail one",
      },

      {
        [PICKUP_DETAIL_FIELDS.PRODUCT_ID]:
          products[1][PRODUCT_SCHEMA.PRIMARY_KEY],

        [PICKUP_DETAIL_FIELDS.QTY]: 3,

        [PICKUP_DETAIL_FIELDS.NOTES]: "[TEST] Pickup multi-item detail two",
      },
    ],
  });

  if (
    !response.success ||
    !response.data ||
    !response.data.header ||
    response.data.details.length !== 2 ||
    response.data.header[PICKUP_HEADER_FIELDS.TOTAL_ITEM] !== 2 ||
    response.data.header[PICKUP_HEADER_FIELDS.TOTAL_QTY] !== 5 ||
    !response.data.details.every((detail) => {
      return (
        detail[PICKUP_DETAIL_FIELDS.PICKUP_ID] ===
        response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]
      );
    })
  ) {
    throw new Error("Multi-item pickup creation response is invalid.");
  }

  Logger.log(
    `Pickup test created header ${response.data.header[PICKUP_HEADER_SCHEMA.PRIMARY_KEY]} and details ${response.data.details.map((detail) => detail[PICKUP_DETAIL_SCHEMA.PRIMARY_KEY]).join(", ")}.`,
  );
}

function testReturnService() {
  const service = ReturnService();

  Logger.log("===== FIND ALL =====");
  Logger.log(JSON.stringify(service.findAll(), null, 2));

  Logger.log("===== SEARCH =====");
  Logger.log(JSON.stringify(service.search("RT"), null, 2));

  Logger.log("===== DROPDOWN =====");
  Logger.log(JSON.stringify(service.dropdown(), null, 2));

  Logger.log("===== STATISTICS =====");
  Logger.log(JSON.stringify(service.statistics(), null, 2));
}

function testPurchasingService() {
  const service = PurchasingService();

  Logger.log("===== FIND ALL =====");
  Logger.log(JSON.stringify(service.findAll(), null, 2));

  Logger.log("===== SEARCH =====");
  Logger.log(JSON.stringify(service.search("PC"), null, 2));

  Logger.log("===== DROPDOWN =====");
  Logger.log(JSON.stringify(service.dropdown(), null, 2));

  Logger.log("===== STATISTICS =====");
  Logger.log(JSON.stringify(service.statistics(), null, 2));
}

function testExpenseService() {
  const service = ExpenseService();

  Logger.log("===== FIND ALL =====");
  Logger.log(JSON.stringify(service.findAll(), null, 2));

  Logger.log("===== SEARCH =====");
  Logger.log(JSON.stringify(service.search("expense"), null, 2));

  Logger.log("===== DROPDOWN =====");
  Logger.log(JSON.stringify(service.dropdown(), null, 2));

  Logger.log("===== STATISTICS =====");
  Logger.log(JSON.stringify(service.statistics(), null, 2));
}

function testDashboardService() {
  const dashboard = DashboardService();

  Logger.log(
    JSON.stringify(
      dashboard.getDashboard(),

      null,

      2,
    ),
  );
}

function testGetDashboardDirect() {
  const res = getDashboard();

  Logger.log(JSON.stringify(res, null, 2));
}

function testConfigPickup() {
  Logger.log(PRODUCT_SCHEMA.HEADERS);

  Logger.log(PARTNER_SCHEMA.HEADERS);

  Logger.log(PICKUP_HEADER_SCHEMA.HEADERS);

  Logger.log(PICKUP_DETAIL_SCHEMA.HEADERS);
}

function testDatabaseSetup() {
  Logger.log("========== DATABASE SETUP ==========");

  DatabaseSetup.setup();

  Object.values(SCHEMA)
  .filter((schema) => schema && schema.TABLE)
  .forEach((schema) => {
    Logger.log(
      "%s : %s",
      schema.TABLE,
      Database.hasSheet(schema.TABLE)
    );
  });
}

function createPickupTransactionServiceForTest() {
  return TransactionService.create({
    headerSchema: PICKUP_HEADER_SCHEMA,

    detailSchema: PICKUP_DETAIL_SCHEMA,

    detailForeignKey: PICKUP_DETAIL_FIELDS.PICKUP_ID,
  });
}

function testTransactionServicePublicApi() {
  const service = createPickupTransactionServiceForTest();

  const factoryKeys = Object.keys(TransactionService);

  const serviceKeys = Object.keys(service).sort();

  const expectedServiceKeys = [
    "create",
    "findAll",
    "findById",
    "remove",
    "restore",
    "update",
  ];

  if (factoryKeys.length !== 1 || factoryKeys[0] !== "create") {
    throw new Error("TransactionService public factory API is invalid.");
  }

  if (JSON.stringify(serviceKeys) !== JSON.stringify(expectedServiceKeys)) {
    throw new Error("TransactionService instance API is invalid.");
  }

  Logger.log("TransactionService public API passed.");
}

function testTransactionServiceFindAll() {
  const service = createPickupTransactionServiceForTest();

  const response = service.findAll();

  if (!response.success || !Array.isArray(response.data)) {
    throw new Error("TransactionService.findAll() response is invalid.");
  }

  Logger.log(response);
}

function testTransactionServiceFindByIdValidation() {
  const service = createPickupTransactionServiceForTest();

  const response = service.findById(" ");

  if (response.success || response.data !== null) {
    throw new Error("TransactionService.findById() must reject an empty ID.");
  }

  Logger.log(response);
}

function testTransactionServiceFindByIdResponseShape() {
  const service = createPickupTransactionServiceForTest();

  const headers = service.findAll();

  if (headers.data.length === 0) {
    Logger.log("No pickup header data available; response shape test skipped.");

    return;
  }

  const id = headers.data[0][PICKUP_HEADER_SCHEMA.PRIMARY_KEY];

  const response = service.findById(id);

  if (
    !response.success ||
    !response.data ||
    !response.data.header ||
    !Array.isArray(response.data.details)
  ) {
    throw new Error("TransactionService.findById() response shape is invalid.");
  }

  Logger.log(response);
}
