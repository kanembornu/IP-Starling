/**
 * =============================================================================
 * FILE        : 120.Service.Purchasing.gs
 * VERSION     : 2.0.0
 * DESCRIPTION : Purchasing Service
 * =============================================================================
 */

function PurchasingService(options = {}) {
  const base = EntityService.create(PURCHASING_SCHEMA);
  const mutableFields = [
    PURCHASING_FIELDS.DATE,
    PURCHASING_FIELDS.SUPPLIER_ID,
    PURCHASING_FIELDS.PRODUCT_ID,
    PURCHASING_FIELDS.QTY,
    PURCHASING_FIELDS.PRICE,
  ];

  function isTrue(value) {
    return value === true || value === 1 || String(value).trim().toUpperCase() === "TRUE";
  }

  function isFalse(value) {
    return value === false || value === 0 || String(value).trim().toUpperCase() === "FALSE";
  }

  function isActiveRow(schema, row) {
    return Boolean(
      row &&
      isFalse(row[schema.SYSTEM.IS_DELETED]) &&
      isTrue(row[schema.SYSTEM.IS_ACTIVE]),
    );
  }

  function allRows(schema) {
    if (typeof options.readPhysicalRows === "function") {
      return options.readPhysicalRows(schema).slice();
    }
    return RepositoryBase.mapRows(schema, RepositoryReader.raw(schema));
  }

  function rowsById(rows, schema) {
    return rows.reduce((lookup, row) => {
      const id = row && row[schema.PRIMARY_KEY];
      if (requireId(id)) lookup[id] = row;
      return lookup;
    }, Object.create(null));
  }

  function buildRestoreContext() {
    return {
      products: rowsById(allRows(PRODUCT_SCHEMA), PRODUCT_SCHEMA),
      partners: rowsById(allRows(PARTNER_SCHEMA), PARTNER_SCHEMA),
    };
  }

  function rawById(schema, id) {
    return allRows(schema).find((row) => row[schema.PRIMARY_KEY] === id) || null;
  }

  function requireId(id) {
    return typeof id === "string" && id.trim() !== "";
  }

  function validateSupplier(id) {
    const supplier = rawById(PARTNER_SCHEMA, id);

    if (!isActiveRow(PARTNER_SCHEMA, supplier)) {
      return Response.error("Supplier tidak ditemukan atau tidak aktif.");
    }

    const type = String(supplier[PARTNER_FIELDS.TYPE] || "").trim().toLowerCase();

    if (type !== "supplier") {
      return Response.error("Partner harus bertipe Supplier.");
    }

    return null;
  }

  function validateProduct(id) {
    const product = rawById(PRODUCT_SCHEMA, id);

    if (!isActiveRow(PRODUCT_SCHEMA, product)) {
      return Response.error("Produk tidak ditemukan atau tidak aktif.");
    }

    return null;
  }

  function normalizeNumber(value, field, allowZero) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return Response.error(`${field} wajib diisi.`);
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return Response.error(`${field} harus berupa angka finite.`);
    }

    if (allowZero ? number < 0 : number <= 0) {
      return Response.error(
        allowZero ? `${field} tidak boleh negatif.` : `${field} harus lebih besar dari 0.`,
      );
    }

    return number;
  }

  function prepare(document) {
    const data = Utils.trimObject(document || {});

    if (!data[PURCHASING_FIELDS.DATE]) {
      return Response.error("Tanggal wajib diisi.");
    }

    if (!data[PURCHASING_FIELDS.SUPPLIER_ID]) {
      return Response.error("SupplierID wajib diisi.");
    }

    if (!data[PURCHASING_FIELDS.PRODUCT_ID]) {
      return Response.error("ProductID wajib diisi.");
    }

    const qty = normalizeNumber(data[PURCHASING_FIELDS.QTY], "Qty", false);
    if (qty && qty.success === false) return qty;

    const price = normalizeNumber(data[PURCHASING_FIELDS.PRICE], "Harga", true);
    if (price && price.success === false) return price;

    const supplierError = validateSupplier(data[PURCHASING_FIELDS.SUPPLIER_ID]);
    if (supplierError) return supplierError;

    const productError = validateProduct(data[PURCHASING_FIELDS.PRODUCT_ID]);
    if (productError) return productError;

    data[PURCHASING_FIELDS.QTY] = qty;
    data[PURCHASING_FIELDS.PRICE] = price;
    data[PURCHASING_FIELDS.TOTAL] = qty * price;

    return data;
  }

  function findAll() {
    return Response.success(
      allRows(PURCHASING_SCHEMA).filter((row) => isActiveRow(PURCHASING_SCHEMA, row)),
    );
  }

  function findDeleted() {
    const rows = allRows(PURCHASING_SCHEMA).filter((row) => {
        return (
          isTrue(row[PURCHASING_SCHEMA.SYSTEM.IS_DELETED]) &&
          isFalse(row[PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE])
        );
      }).filter((row) => requireId(row[PURCHASING_SCHEMA.PRIMARY_KEY]))
        .sort((left, right) => String(left[PURCHASING_SCHEMA.PRIMARY_KEY]).localeCompare(String(right[PURCHASING_SCHEMA.PRIMARY_KEY])));
    if (!rows.length) return Response.success([]);
    const context = buildRestoreContext();
    return Response.success(rows.map((row) => Object.assign({}, row, evaluateRestoreEligibility(row, context))));
  }

  function evaluateRestoreEligibility(row, context) {
    const issues = [];
    const productId = row && row[PURCHASING_FIELDS.PRODUCT_ID]; const supplierId = row && row[PURCHASING_FIELDS.SUPPLIER_ID];
    if (!productId || !supplierId) issues.push("Data referensi Purchasing tidak lengkap.");
    const dependencies = context || buildRestoreContext();
    const product = productId ? dependencies.products[productId] || null : null;
    const supplier = supplierId ? dependencies.partners[supplierId] || null : null;
    if (productId && !product) issues.push("Produk terkait tidak ditemukan.");
    else if (product && isTrue(product[PRODUCT_SCHEMA.SYSTEM.IS_DELETED])) issues.push("Produk terkait masih berada di data terhapus.");
    else if (product && !isTrue(product[PRODUCT_SCHEMA.SYSTEM.IS_ACTIVE])) issues.push("Produk terkait tidak aktif.");
    if (supplierId && !supplier) issues.push("Supplier/Mitra terkait tidak ditemukan.");
    else if (supplier && isTrue(supplier[PARTNER_SCHEMA.SYSTEM.IS_DELETED])) issues.push("Supplier/Mitra terkait masih berada di data terhapus.");
    else if (supplier && !isTrue(supplier[PARTNER_SCHEMA.SYSTEM.IS_ACTIVE])) issues.push("Supplier/Mitra terkait tidak aktif.");
    else if (supplier && String(supplier[PARTNER_FIELDS.TYPE] || "").trim().toLowerCase() !== "supplier") issues.push("Partner terkait bukan Supplier.");
    const canRestore = issues.length === 0;
    return { canRestore, restoreReason: canRestore ? "Aman direstore karena seluruh referensi tersedia." : issues.join(" "), restoreIssues: issues };
  }

  function findById(id) {
    if (!requireId(id)) return Response.error("ID Purchasing wajib diisi.");

    const row = rawById(PURCHASING_SCHEMA, id);
    if (!isActiveRow(PURCHASING_SCHEMA, row)) {
      return Response.error("Purchase tidak ditemukan.");
    }

    return Response.success(row);
  }

  function statistics() {
    const response = findAll();
    if (!response.success) return response;

    const active = response.data.length;

    return Response.success({
      total: active,
      active,
      inactive: 0,
    });
  }

  function create(document) {
    const prepared = prepare(document);
    if (prepared && prepared.success === false) return prepared;
    return base.create(prepared);
  }

  function update(id, document) {
    if (!requireId(id)) return Response.error("ID Purchasing wajib diisi.");

    const current = rawById(PURCHASING_SCHEMA, id);
    if (!isActiveRow(PURCHASING_SCHEMA, current)) {
      return Response.error("Purchase tidak ditemukan.");
    }

    const finalData = {};
    mutableFields.forEach((field) => {
      finalData[field] =
        document && Object.prototype.hasOwnProperty.call(document, field)
          ? document[field]
          : current[field];
    });

    const prepared = prepare(finalData);
    if (prepared && prepared.success === false) return prepared;
    return base.update(id, prepared);
  }

  function remove(id) {
    if (!requireId(id)) return Response.error("ID Purchasing wajib diisi.");
    if (!isActiveRow(PURCHASING_SCHEMA, rawById(PURCHASING_SCHEMA, id))) {
      return Response.error("Purchase tidak ditemukan.");
    }
    return base.remove(id);
  }

  function restore(id) {
    if (!requireId(id)) return Response.error("ID Purchasing wajib diisi.");

    const current = rawById(PURCHASING_SCHEMA, id);
    if (!current) return Response.error("Purchase tidak ditemukan.");
    if (isActiveRow(PURCHASING_SCHEMA, current)) {
      return Response.error("Purchase sudah aktif.");
    }
    if (!isTrue(current[PURCHASING_SCHEMA.SYSTEM.IS_DELETED]) ||
        !isFalse(current[PURCHASING_SCHEMA.SYSTEM.IS_ACTIVE])) {
      return Response.error("Purchase tidak dalam status terhapus/nonaktif.");
    }

    const prepared = prepare(current);
    if (prepared && prepared.success === false) return prepared;

    if (!RepositoryWriter.update(PURCHASING_SCHEMA, id, {
      [PURCHASING_FIELDS.QTY]: prepared[PURCHASING_FIELDS.QTY],
      [PURCHASING_FIELDS.PRICE]: prepared[PURCHASING_FIELDS.PRICE],
      [PURCHASING_FIELDS.TOTAL]: prepared[PURCHASING_FIELDS.TOTAL],
    })) {
      return Response.error("Purchase tidak ditemukan.");
    }

    return base.restore(id);
  }

  return Object.freeze({
    findAll,
    findDeleted,
    findById,
    statistics,
    create,
    update,
    remove,
    restore,
  });
}
