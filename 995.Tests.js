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

  Logger.log(PICKUP_SCHEMA);

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

function testPickupService() {
  const service = PickupService();

  Logger.log("===== FIND ALL =====");
  Logger.log(JSON.stringify(service.findAll(), null, 2));

  Logger.log("===== SEARCH =====");
  Logger.log(JSON.stringify(service.search("PR"), null, 2));

  Logger.log("===== DROPDOWN =====");
  Logger.log(JSON.stringify(service.dropdown(), null, 2));

  Logger.log("===== STATISTICS =====");
  Logger.log(JSON.stringify(service.statistics(), null, 2));
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
