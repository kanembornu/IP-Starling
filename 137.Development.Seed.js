/**
 * Destructive development-only reset and deterministic demo-data generator.
 * Nothing in this file runs automatically. Use previewDevelopmentSeed() first.
 */
const DevelopmentSeed = (() => {
  const VERSION = "2026.07.29-v2";
  const RANDOM_SEED = 2602010731;
  const CONFIRMATION_TOKEN = "RESET_IP_STARLING_DEVELOPMENT_DATA_2026";
  const PERIOD = Object.freeze({ start: "2026-02-01", end: "2026-07-31" });
  const ACTOR = "development.seed@ip-starling.local";
  const RESET_SCHEMA_KEYS = Object.freeze([
    "PRODUCT",
    "PARTNER",
    "PICKUP_HEADER",
    "PICKUP_DETAIL",
    "RETURN",
    "PURCHASE",
    "EXPENSE",
    "IDEMPOTENCY",
    "LOGS",
  ]);
  let sequentialSeedKeys = null;

  function getSequentialSeedKeys() {
    if (!sequentialSeedKeys) {
      if (typeof ID_GENERATOR_SCHEMA_KEYS === "undefined") {
        throw new Error("ID_GENERATOR_SCHEMA_KEYS is required by DevelopmentSeed.");
      }
      sequentialSeedKeys = Object.freeze(
        ID_GENERATOR_SCHEMA_KEYS.filter(
          (key) => RESET_SCHEMA_KEYS.indexOf(key) >= 0,
        ),
      );
    }
    return sequentialSeedKeys;
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return function random() {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function pad(value, length) {
    return String(value).padStart(length, "0");
  }
  function dateValue(date) {
    return [
      date.getUTCFullYear(),
      pad(date.getUTCMonth() + 1, 2),
      pad(date.getUTCDate(), 2),
    ].join("-");
  }
  function parseDate(value) {
    const parts = String(value).split("-").map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  }
  function addDays(value, days) {
    const date = parseDate(value);
    date.setUTCDate(date.getUTCDate() + days);
    return dateValue(date);
  }
  function timestamp(value, hour, minute) {
    return `${value}T${pad(hour, 2)}:${pad(minute, 2)}:00+07:00`;
  }
  function weightedIndex(random, weights) {
    const total = weights.reduce((sum, value) => sum + value, 0);
    let target = random() * total;
    for (let index = 0; index < weights.length; index++) {
      target -= weights[index];
      if (target < 0) return index;
    }
    return weights.length - 1;
  }
  function integer(random, minimum, maximum) {
    return minimum + Math.floor(random() * (maximum - minimum + 1));
  }
  function canonicalIdFactory() {
    const counters = {};
    return function next(schema, date) {
      const code = String(date).replace(/-/g, "").slice(2);
      const key = `${schema.ID_PREFIX}_${code}`;
      counters[key] = (counters[key] || 0) + 1;
      return `${schema.ID_PREFIX}${code}${pad(counters[key], 5)}`;
    };
  }
  function deterministicLogId(index) {
    const suffix = pad(index.toString(16), 12);
    return `LG-26020100-0000-4000-8000-${suffix}`;
  }
  function auditRow(row, at, deleted) {
    row.Deleted = Boolean(deleted);
    row.IsActive = !deleted;
    row.CreatedAt = at;
    row.CreatedBy = ACTOR;
    row.UpdatedAt = at;
    row.UpdatedBy = ACTOR;
    return row;
  }

  function generate() {
    const random = seededRandom(RANDOM_SEED);
    const nextId = canonicalIdFactory();
    const rows = {};
    Object.keys(SCHEMA).forEach((key) => {
      rows[key] = [];
    });

    const productFixtures = [
      ["Kopi Susu Gula Aren", "Minuman Kopi", "botol", 18000, 16],
      ["Es Kopi Pandan", "Minuman Kopi", "botol", 20000, 13],
      ["Americano Dingin", "Minuman Kopi", "botol", 15000, 11],
      ["Kopi Tubruk Arabika", "Minuman Kopi", "cup", 14000, 8],
      ["Teh Melati", "Minuman Teh", "botol", 10000, 10],
      ["Teh Lemon Madu", "Minuman Teh", "botol", 14000, 9],
      ["Thai Tea", "Minuman Teh", "botol", 16000, 8],
      ["Cokelat Premium", "Minuman Non-Kopi", "botol", 19000, 9],
      ["Matcha Latte", "Minuman Non-Kopi", "botol", 22000, 7],
      ["Susu Kurma", "Minuman Non-Kopi", "botol", 17000, 5],
      ["Air Mineral", "Minuman", "botol", 5000, 8],
      ["Roti Sobek Cokelat", "Roti", "pcs", 12000, 10],
      ["Roti Abon Sapi", "Roti", "pcs", 15000, 8],
      ["Croissant Keju", "Pastry", "pcs", 18000, 7],
      ["Donat Gula Aren", "Pastry", "pcs", 10000, 9],
      ["Pastel Ayam", "Makanan Ringan", "pcs", 9000, 6],
      ["Lemper Ayam", "Makanan Ringan", "pcs", 8000, 6],
      ["Keripik Singkong Balado", "Makanan Ringan", "bungkus", 13000, 5],
      ["Nasi Bakar Ayam", "Makanan Berat", "pcs", 23000, 7],
      ["Mie Goreng Jawa", "Makanan Berat", "porsi", 25000, 5],
    ];
    productFixtures.forEach((item, index) => {
      const date = addDays(PERIOD.start, index % 10);
      rows.PRODUCT.push(
        auditRow(
          {
            ID: nextId(PRODUCT_SCHEMA, date),
            Nama: item[0],
            Kategori: item[1],
            Satuan: item[2],
            Harga: item[3],
            _weight: item[4],
          },
          timestamp(date, 8, index % 60),
          index === 19,
        ),
      );
    });

    const partnerFixtures = [
      [
        "Kedai Pagi Menteng",
        "Jl. HOS Cokroaminoto, Jakarta Pusat",
        "0812-1100-1001",
        "Outlet",
      ],
      [
        "Kantin Sejahtera Kuningan",
        "Jl. HR Rasuna Said, Jakarta Selatan",
        "0812-1100-1002",
        "Outlet",
      ],
      [
        "Warung Bu Sari Tebet",
        "Jl. Tebet Barat, Jakarta Selatan",
        "0812-1100-1003",
        "Reseller",
      ],
      [
        "Toko Rasa Nusantara",
        "Jl. Margonda Raya, Depok",
        "0812-1100-1004",
        "Reseller",
      ],
      [
        "Koperasi Karyawan Harmoni",
        "Jl. Hayam Wuruk, Jakarta Pusat",
        "0812-1100-1005",
        "Corporate",
      ],
      [
        "Kafe Sudut Senja",
        "Jl. Kemang Raya, Jakarta Selatan",
        "0812-1100-1006",
        "Outlet",
      ],
      [
        "Dapur Bersama Cibubur",
        "Jl. Alternatif Cibubur, Bekasi",
        "0812-1100-1007",
        "Reseller",
      ],
      [
        "PT Sumber Pangan Jaya",
        "Jl. Raya Bogor, Jakarta Timur",
        "021-8777-1008",
        "Supplier",
      ],
      [
        "CV Kopi Tanah Air",
        "Jl. Raya Puncak, Bogor",
        "0251-825-1009",
        "Supplier",
      ],
      [
        "UD Berkah Kemasan",
        "Jl. Industri Cikarang, Bekasi",
        "021-8990-1010",
        "Supplier",
      ],
      [
        "PT Susu Segar Indonesia",
        "Jl. Pajajaran, Bogor",
        "0251-833-1011",
        "Supplier",
      ],
      [
        "Pasar Organik Bintaro",
        "Jl. Boulevard Bintaro, Tangerang Selatan",
        "0812-1100-1012",
        "Supplier",
      ],
    ];
    partnerFixtures.forEach((item, index) => {
      const date = addDays(PERIOD.start, index % 8);
      rows.PARTNER.push(
        auditRow(
          {
            ID: nextId(PARTNER_SCHEMA, date),
            Nama: item[0],
            Alamat: item[1],
            Telepon: item[2],
            Jenis: item[3],
          },
          timestamp(date, 9, index),
          index === 6,
        ),
      );
    });

    const activeProducts = rows.PRODUCT.filter((row) => !row.Deleted);
    const productWeights = activeProducts.map((row) => row._weight);
    const customers = rows.PARTNER.filter(
      (row) => !row.Deleted && row.Jenis !== "Supplier",
    );
    const suppliers = rows.PARTNER.filter((row) => row.Jenis === "Supplier");
    const monthTargets = [48, 53, 57, 62, 67, 73];
    let pickupOrdinal = 0;
    monthTargets.forEach((target, monthIndex) => {
      const monthStart = new Date(Date.UTC(2026, monthIndex + 1, 1));
      const monthEnd = new Date(Date.UTC(2026, monthIndex + 2, 0)).getUTCDate();
      let created = 0;
      while (created < target) {
        const day =
          1 + ((created * 7 + integer(random, 0, monthEnd - 1)) % monthEnd);
        const date = dateValue(new Date(Date.UTC(2026, monthIndex + 1, day)));
        const weekday = parseDate(date).getUTCDay();
        if ((weekday === 0 || weekday === 6) && random() < 0.36) continue;
        const detailCount = weightedIndex(random, [10, 40, 34, 16]) + 1;
        const selected = {};
        const details = [];
        while (details.length < detailCount) {
          const product = activeProducts[weightedIndex(random, productWeights)];
          if (selected[product.ID]) continue;
          selected[product.ID] = true;
          const weekendFactor = weekday === 0 || weekday === 6 ? 0.7 : 1;
          const growth = 1 + monthIndex * 0.09;
          const qty = Math.max(
            2,
            Math.round(
              integer(random, 4, 18) *
                growth *
                weekendFactor *
                (product._weight / 8),
            ),
          );
          details.push({ product, qty });
        }
        const partner =
          customers[weightedIndex(random, [16, 14, 12, 10, 9, 8])];
        const at = timestamp(
          date,
          integer(random, 7, 15),
          integer(random, 0, 59),
        );
        const headerId = nextId(PICKUP_HEADER_SCHEMA, date);
        pickupOrdinal++;
        rows.PICKUP_HEADER.push(
          auditRow(
            {
              ID: headerId,
              PickupNo: `PU-2026-${pad(pickupOrdinal, 5)}`,
              Tanggal: date,
              PartnerID: partner.ID,
              TotalItem: details.length,
              TotalQty: details.reduce((sum, item) => sum + item.qty, 0),
              Status: "Posted",
              Notes:
                pickupOrdinal % 19 === 0
                  ? "Pengiriman pagi - konfirmasi penerima"
                  : "",
            },
            at,
            pickupOrdinal % 89 === 0,
          ),
        );
        details.forEach((item, detailIndex) => {
          rows.PICKUP_DETAIL.push(
            auditRow(
              {
                ID: nextId(PICKUP_DETAIL_SCHEMA, date),
                PickupID: headerId,
                ProductID: item.product.ID,
                Qty: item.qty,
                Harga: item.product.Harga,
                Total: item.qty * item.product.Harga,
                Notes:
                  detailIndex === 0 && pickupOrdinal % 23 === 0
                    ? "Kemasan dingin"
                    : "",
              },
              at,
              pickupOrdinal % 89 === 0,
            ),
          );
        });
        created++;
      }
    });

    const returnCandidates = rows.PICKUP_DETAIL.filter(
      (row) => !row.Deleted && row.Qty >= 4,
    );
    for (let index = 0; index < 55; index++) {
      const detail =
        returnCandidates[(index * 17 + 11) % returnCandidates.length];
      const header = rows.PICKUP_HEADER.find(
        (row) => row.ID === detail.PickupID,
      );
      const offset = 1 + (index % 4);
      const returnDate =
        addDays(header.Tanggal, offset) > PERIOD.end
          ? PERIOD.end
          : addDays(header.Tanggal, offset);
      const qty = Math.max(
        1,
        Math.min(
          detail.Qty,
          Math.floor(detail.Qty * (0.08 + (index % 3) * 0.04)),
        ),
      );
      rows.RETURN.push(
        auditRow(
          {
            ID: nextId(RETURN_SCHEMA, returnDate),
            PickupID: header.ID,
            PickupDetailID: detail.ID,
            Tanggal: returnDate,
            Qty: qty,
            Keterangan: [
              "Kemasan rusak saat pengiriman",
              "Produk tidak habis terjual",
              "Kualitas tidak sesuai saat diterima",
            ][index % 3],
          },
          timestamp(returnDate, 16, index % 60),
          index % 27 === 0,
        ),
      );
    }

    const purchaseTargets = [18, 21, 23, 26, 29, 33];
    purchaseTargets.forEach((target, monthIndex) => {
      for (let index = 0; index < target; index++) {
        const day = 1 + ((index * 5 + integer(random, 0, 26)) % 27);
        const date = dateValue(new Date(Date.UTC(2026, monthIndex + 1, day)));
        const product =
          activeProducts[
            weightedIndex(
              random,
              productWeights.map((value) => Math.max(3, value - 2)),
            )
          ];
        const supplier = suppliers[(index + monthIndex) % suppliers.length];
        const qty = integer(random, 12, 70) + monthIndex * 3;
        const price =
          Math.round((product.Harga * (0.43 + random() * 0.12)) / 500) * 500;
        rows.PURCHASE.push(
          auditRow(
            {
              ID: nextId(PURCHASING_SCHEMA, date),
              Tanggal: date,
              SupplierID: supplier.ID,
              ProductID: product.ID,
              Qty: qty,
              Harga: price,
              Total: qty * price,
            },
            timestamp(date, 10, index % 60),
            index === target - 1 && monthIndex === 1,
          ),
        );
      }
    });

    const expenseCategories = [
      ["Transportasi", "Bensin dan tol pengiriman", 250000, 850000, 18],
      ["Utilitas", "Listrik, air, dan internet", 900000, 2200000, 10],
      ["Kemasan", "Botol, gelas, dan label", 450000, 1800000, 16],
      ["Pemasaran", "Promosi media sosial", 300000, 1600000, 8],
      ["Pemeliharaan", "Servis peralatan produksi", 350000, 2000000, 6],
      ["Operasional", "Perlengkapan kebersihan", 150000, 700000, 12],
    ];
    const expenseTargets = [15, 17, 18, 21, 23, 26];
    expenseTargets.forEach((target, monthIndex) => {
      for (let index = 0; index < target; index++) {
        const date = dateValue(
          new Date(Date.UTC(2026, monthIndex + 1, 1 + ((index * 6 + 2) % 27))),
        );
        const fixture =
          expenseCategories[
            weightedIndex(
              random,
              expenseCategories.map((item) => item[4]),
            )
          ];
        const nominal =
          Math.round(integer(random, fixture[2], fixture[3]) / 10000) * 10000;
        rows.EXPENSE.push(
          auditRow(
            {
              ID: nextId(EXPENSE_SCHEMA, date),
              Tanggal: date,
              Kategori: fixture[0],
              Keterangan: fixture[1],
              Nominal: nominal,
            },
            timestamp(date, 14, index % 60),
            index === 0 && monthIndex === 0,
          ),
        );
      }
    });

    const entityPools = [
      rows.PRODUCT,
      rows.PARTNER,
      rows.PICKUP_HEADER,
      rows.RETURN,
      rows.PURCHASE,
      rows.EXPENSE,
    ];
    for (let index = 0; index < 180; index++) {
      const monthIndex = index % 6;
      const date = dateValue(
        new Date(Date.UTC(2026, monthIndex + 1, 1 + ((index * 11) % 27))),
      );
      const pool = entityPools[index % entityPools.length];
      const entity = pool[index % pool.length];
      const level =
        index % 41 === 0 ? "ERROR" : index % 13 === 0 ? "WARN" : "INFO";
      const at = timestamp(date, 8 + (index % 10), index % 60);
      rows.LOGS.push({
        ID: deterministicLogId(index + 1),
        Timestamp: at,
        Level: level,
        Category: level === "ERROR" ? "ERROR" : "APPLICATION",
        Module:
          SCHEMA[Object.keys(SCHEMA).find((key) => rows[key] === pool)].NAME,
        Action: "READ",
        EntityType: "",
        EntityID: entity.ID || "",
        Actor: ACTOR,
        Status:
          level === "ERROR"
            ? "FAILURE"
            : level === "WARN"
              ? "WARNING"
              : "SUCCESS",
        Message:
          level === "ERROR"
            ? "Simulasi kegagalan koneksi sementara"
            : level === "WARN"
              ? "Simulasi validasi membutuhkan perhatian"
              : "Aktivitas demo berhasil diproses",
        BeforeData: "",
        AfterData: "",
        Context: JSON.stringify({ seedVersion: VERSION, demo: true }),
        DurationMs: 15 + (index % 230),
        CorrelationID: `SEED-${pad(index + 1, 5)}`,
        Source: "DevelopmentSeed",
        ErrorName: level === "ERROR" ? "DemoError" : "",
        ErrorMessage: level === "ERROR" ? "Kesalahan demo yang disengaja" : "",
        ErrorStack: "",
        CreatedAt: at,
      });
    }

    Object.keys(rows).forEach((key) =>
      rows[key].forEach((row) => {
        delete row._weight;
      }),
    );
    return { version: VERSION, randomSeed: RANDOM_SEED, period: PERIOD, rows };
  }

  function integrity(dataset) {
    const rows = dataset.rows;
    const ids = (items) => new Set(items.map((row) => row.ID));
    const productIds = ids(rows.PRODUCT);
    const partnerIds = ids(rows.PARTNER);
    const pickupIds = ids(rows.PICKUP_HEADER);
    const detailIds = ids(rows.PICKUP_DETAIL);
    const detailById = {};
    rows.PICKUP_DETAIL.forEach((row) => {
      detailById[row.ID] = row;
    });
    const returnTotals = {};
    const errors = [];
    rows.PICKUP_HEADER.forEach((row) => {
      if (!partnerIds.has(row.PartnerID))
        errors.push(`Pickup ${row.ID} PartnerID`);
    });
    rows.PICKUP_DETAIL.forEach((row) => {
      if (!pickupIds.has(row.PickupID))
        errors.push(`Detail ${row.ID} PickupID`);
      if (!productIds.has(row.ProductID))
        errors.push(`Detail ${row.ID} ProductID`);
      if (!Number.isFinite(Number(row.Harga)) || Number(row.Harga) < 0)
        errors.push(`Detail ${row.ID} Harga`);
      if (Number(row.Total) !== Number(row.Qty) * Number(row.Harga))
        errors.push(`Detail ${row.ID} Total`);
    });
    rows.RETURN.forEach((row) => {
      const detail = detailById[row.PickupDetailID];
      if (!pickupIds.has(row.PickupID))
        errors.push(`Return ${row.ID} PickupID`);
      if (!detailIds.has(row.PickupDetailID))
        errors.push(`Return ${row.ID} PickupDetailID`);
      if (detail && detail.PickupID !== row.PickupID)
        errors.push(`Return ${row.ID} ownership`);
      returnTotals[row.PickupDetailID] =
        (returnTotals[row.PickupDetailID] || 0) + Number(row.Qty);
    });
    Object.keys(returnTotals).forEach((id) => {
      if (returnTotals[id] > Number(detailById[id].Qty))
        errors.push(`Return quantity ${id}`);
    });
    rows.PURCHASE.forEach((row) => {
      if (!partnerIds.has(row.SupplierID))
        errors.push(`Purchase ${row.ID} SupplierID`);
      if (!productIds.has(row.ProductID))
        errors.push(`Purchase ${row.ID} ProductID`);
      if (Number(row.Total) !== Number(row.Qty) * Number(row.Harga))
        errors.push(`Purchase ${row.ID} Total`);
    });
    const months = [
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ];
    [rows.PICKUP_HEADER, rows.PURCHASE, rows.EXPENSE, rows.LOGS].forEach(
      (items, index) => {
        const dateField = index === 3 ? "Timestamp" : "Tanggal";
        months.forEach((month) => {
          if (
            !items.some((row) => String(row[dateField]).slice(0, 7) === month)
          )
            errors.push(`Missing month ${month}/${dateField}`);
        });
      },
    );
    return {
      valid: errors.length === 0,
      errors,
      foreignKeys:
        errors.filter((error) => /ID|ownership/.test(error)).length === 0,
      quantitiesAndTotals:
        errors.filter((error) => /quantity|Total/.test(error)).length === 0,
      monthsCovered: months,
    };
  }

  function volumes(dataset) {
    const result = {};
    RESET_SCHEMA_KEYS.forEach((key) => {
      result[SCHEMA[key].TABLE] = dataset.rows[key].length;
    });
    return result;
  }
  function sequenceTargets(dataset, todayCode) {
    const targets = {};
    getSequentialSeedKeys().forEach((key) => {
      const schema = SCHEMA[key];
      const expression = new RegExp(
        `^${schema.ID_PREFIX}${todayCode}(\\d{5})$`,
      );
      const maximum = dataset.rows[key].reduce((result, row) => {
        const match = expression.exec(String(row[schema.PRIMARY_KEY] || ""));
        return match ? Math.max(result, Number(match[1])) : result;
      }, 0);
      targets[key] = {
        schema: key,
        table: schema.TABLE,
        prefix: schema.ID_PREFIX,
        todayCode,
        maximum,
      };
    });
    return targets;
  }
  function sequenceCollisionSafety(dataset, todayCode, sequences) {
    const targets = sequenceTargets(dataset, todayCode);
    const checks = {};
    Object.keys(targets).forEach((key) => {
      const target = targets[key];
      const synchronized = (sequences || {})[key] || {};
      const current = Number(
        synchronized.after == null
          ? (sequences || {})[target.prefix] || 0
          : synchronized.after,
      );
      checks[key] = {
        prefix: target.prefix,
        current,
        maximum: target.maximum,
        safe: current >= target.maximum,
      };
    });
    return {
      safe: Object.keys(checks).every((key) => checks[key].safe),
      checks,
    };
  }
  function synchronizeSequences(dataset) {
    const synchronizationDate = new Date();
    const todayCode = Utilities.formatDate(
      synchronizationDate,
      APP_CONFIG.TIMEZONE,
      "yyMMdd",
    );
    const targets = sequenceTargets(dataset, todayCode);
    const result = {};
    Object.keys(targets).forEach((key) => {
      const target = targets[key];
      result[key] = Object.assign(
        {},
        target,
        IDGenerator.ensureAtLeast(
          target.prefix,
          target.maximum,
          synchronizationDate,
        ),
      );
      const readBack = IDGenerator.current(target.prefix, synchronizationDate);
      if (readBack < target.maximum)
        throw new Error(
          `Sequence synchronization failed for ${IDGenerator.counterKey(target.prefix, synchronizationDate)}.`,
        );
      result[key].after = readBack;
      result[key].verified = true;
    });
    return result;
  }
  function environment() {
    const properties = PropertiesService.getScriptProperties();
    const markers = [
      properties.getProperty("APP_ENV"),
      properties.getProperty("ENVIRONMENT"),
      properties.getProperty("NODE_ENV"),
    ]
      .filter(Boolean)
      .map((value) => String(value).trim().toUpperCase());
    try {
      const setting = SettingsService().getResolved("ENVIRONMENT");
      if (setting && setting.success && setting.data && setting.data.value)
        markers.push(String(setting.data.value).trim().toUpperCase());
    } catch (error) {
      /* Script properties remain authoritative when the optional setting is absent. */
    }
    return {
      markers,
      production: markers.some(
        (value) => value === "PRODUCTION" || value === "PROD",
      ),
    };
  }
  function legacyPickupDetailHeaders() {
    return PICKUP_DETAIL_SCHEMA.HEADERS.filter((header) =>
      header !== PICKUP_DETAIL_FIELDS.PRICE && header !== PICKUP_DETAIL_FIELDS.TOTAL);
  }
  function verifyHeaders(allowLegacyPickupDetails = false) {
    const result = {};
    RESET_SCHEMA_KEYS.forEach((key) => {
      const schema = SCHEMA[key];
      const actual = RepositoryBase.headers(schema);
      const legacyPickupDetails = allowLegacyPickupDetails && schema === PICKUP_DETAIL_SCHEMA &&
        JSON.stringify(actual) === JSON.stringify(legacyPickupDetailHeaders());
      if (JSON.stringify(actual) !== JSON.stringify(schema.HEADERS) && !legacyPickupDetails)
        throw new Error(`Canonical header mismatch: ${schema.TABLE}.`);
      result[schema.TABLE] = actual.slice();
    });
    return result;
  }
  function preview() {
    const dataset = generate();
    const check = integrity(dataset);
    const env = environment();
    const headers = verifyHeaders(true);
    const estimatedBySheet = volumes(dataset);
    const estimatedTotal = Object.keys(estimatedBySheet).reduce(
      (sum, sheetName) => sum + estimatedBySheet[sheetName],
      0,
    );
    const result = {
      success: check.valid && !env.production,
      mode: "PREVIEW_ONLY",
      destructive: false,
      confirmationTokenRequired: CONFIRMATION_TOKEN,
      seedPeriod: { start: PERIOD.start, end: PERIOD.end },
      sheetSummary: {
        resetDataRows: RESET_SCHEMA_KEYS.map((key) => SCHEMA[key].TABLE),
        preservedSheets: [SHEET_NAMES.SETTINGS, "Settings.Legacy.Backup"],
        headersPreserved: true,
      },
      estimatedRows: { total: estimatedTotal, bySheet: estimatedBySheet },
      destructiveOperationWarning:
        "DESTRUCTIVE DEVELOPMENT OPERATION: execution clears all non-header rows in the listed reset sheets after creating a timestamped backup.",
      version: VERSION,
      randomSeed: RANDOM_SEED,
      period: PERIOD,
      volumes: estimatedBySheet,
      integrity: check,
      environment: env,
      canonicalHeadersVerified: Object.keys(headers),
      sheetsReset: RESET_SCHEMA_KEYS.map((key) => SCHEMA[key].TABLE),
      settingsPreserved: true,
      legacyBackupPreserved: true,
    };
    Logger.log(`DEVELOPMENT SEED PREVIEW:\n${JSON.stringify(result, null, 2)}`);
    return result;
  }
  function backup() {
    const env = environment();
    if (env.production)
      throw new Error("Development backup aborted: environment is production.");
    verifyHeaders(true);
    const spreadsheet = Database.spreadsheet();
    const stamp = Utilities.formatDate(
      new Date(),
      APP_CONFIG.TIMEZONE,
      "yyyyMMdd-HHmmss",
    );
    const copy = DriveApp.getFileById(spreadsheet.getId()).makeCopy(
      `${spreadsheet.getName()} - Development Reset Backup ${stamp}`,
    );
    return {
      success: true,
      backupFileId: copy.getId(),
      backupName: copy.getName(),
      createdAt: new Date().toISOString(),
      sourceSpreadsheetId: spreadsheet.getId(),
      settingsPreserved: true,
      legacyBackupPreserved: true,
    };
  }
  function clearDataRows(schema) {
    const sheet = RepositoryBase.sheet(schema);
    const lastRow = sheet.getLastRow();
    if (lastRow > 1)
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    RepositoryCache.clear(schema);
    RepositoryBase.clearHeaderCache(schema);
  }
  function preparePickupDetailHeaders() {
    const actual = RepositoryBase.headers(PICKUP_DETAIL_SCHEMA);
    if (JSON.stringify(actual) === JSON.stringify(PICKUP_DETAIL_SCHEMA.HEADERS)) return;
    if (JSON.stringify(actual) !== JSON.stringify(legacyPickupDetailHeaders())) {
      throw new Error("PickupDetails header upgrade aborted: legacy header is not exact.");
    }
    const sheet = RepositoryBase.sheet(PICKUP_DETAIL_SCHEMA);
    sheet.clear();
    sheet.getRange(1, 1, 1, PICKUP_DETAIL_SCHEMA.HEADERS.length)
      .setValues([PICKUP_DETAIL_SCHEMA.HEADERS.slice()]);
    RepositoryBase.clearHeaderCache(PICKUP_DETAIL_SCHEMA);
  }
  function execute(token) {
    if (token !== CONFIRMATION_TOKEN)
      throw new Error(
        "Invalid confirmation token. Run previewDevelopmentSeed() and pass its confirmationTokenRequired value explicitly.",
      );
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    const startedAt = Date.now();
    let backupSummary = null;
    try {
      const env = environment();
      if (env.production)
        throw new Error(
          "Development reset aborted: environment is production.",
        );
      verifyHeaders(true);
      const dataset = generate();
      const check = integrity(dataset);
      if (!check.valid)
        throw new Error(
          `Generated seed failed integrity validation: ${check.errors.join(" | ")}`,
        );
      backupSummary = backup();
      preparePickupDetailHeaders();
      RESET_SCHEMA_KEYS.forEach((key) => clearDataRows(SCHEMA[key]));
      RESET_SCHEMA_KEYS.forEach((key) =>
        RepositoryWriter.insertMany(SCHEMA[key], dataset.rows[key]),
      );
      const sequences = synchronizeSequences(dataset);
      const summary = {
        success: true,
        mode: "RESET_AND_SEED",
        version: VERSION,
        randomSeed: RANDOM_SEED,
        period: PERIOD,
        backup: backupSummary,
        sheetsReset: RESET_SCHEMA_KEYS.map((key) => SCHEMA[key].TABLE),
        volumes: volumes(dataset),
        integrity: check,
        sequences,
        settingsPreserved: true,
        legacyBackupPreserved: true,
        durationMs: Date.now() - startedAt,
      };
      LogsService.bestEffort({
        level: "INFO",
        category: "SYSTEM",
        module: "DevelopmentSeed",
        action: "SYSTEM",
        status: "SUCCESS",
        message: "Development data reset and deterministic seed completed.",
        context: summary,
        source: "DevelopmentSeed",
        durationMs: summary.durationMs,
      });
      return summary;
    } catch (error) {
      LogsService.bestEffort({
        level: "ERROR",
        category: "SYSTEM",
        module: "DevelopmentSeed",
        action: "SYSTEM",
        status: "FAILURE",
        message: "Development data reset and seed failed.",
        error,
        context: { backup: backupSummary, durationMs: Date.now() - startedAt },
        source: "DevelopmentSeed",
      });
      throw error;
    } finally {
      lock.releaseLock();
    }
  }

  return Object.freeze({
    VERSION,
    RANDOM_SEED,
    CONFIRMATION_TOKEN,
    PERIOD,
    RESET_SCHEMA_KEYS,
    get SEQUENTIAL_SEED_KEYS() { return getSequentialSeedKeys(); },
    generate,
    integrity,
    volumes,
    sequenceTargets,
    sequenceCollisionSafety,
    synchronizeSequences,
    preview,
    backup,
    execute,
  });
})();

function previewDevelopmentSeed() {
  return DevelopmentSeed.preview();
}
function backupDevelopmentData() {
  return DevelopmentSeed.backup();
}
function resetAndSeedDevelopmentData(confirmationToken) {
  return DevelopmentSeed.execute(confirmationToken);
}
function runResetAndSeedDevelopmentData() {
  return resetAndSeedDevelopmentData("RESET_IP_STARLING_DEVELOPMENT_DATA_2026");
}
