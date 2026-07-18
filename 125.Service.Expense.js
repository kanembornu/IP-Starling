/**
 * =============================================================================
 * FILE        : 125.Service.Expense.gs
 * VERSION     : 2.0.0
 * DESCRIPTION : Hardened Expense Service
 * =============================================================================
 */

function ExpenseService() {
  const base = EntityService.create(EXPENSE_SCHEMA);
  const editableFields = [
    EXPENSE_FIELDS.DATE,
    EXPENSE_FIELDS.CATEGORY,
    EXPENSE_FIELDS.DESCRIPTION,
    EXPENSE_FIELDS.AMOUNT,
  ];

  function isTrue(value) {
    return (
      value === true ||
      value === 1 ||
      String(value).trim().toUpperCase() === "TRUE"
    );
  }

  function isFalse(value) {
    return (
      value === false ||
      value === 0 ||
      String(value).trim().toUpperCase() === "FALSE"
    );
  }

  function isDeleted(row) {
    return Boolean(row && isTrue(row[EXPENSE_SCHEMA.SYSTEM.IS_DELETED]));
  }

  function isActive(row) {
    return Boolean(
      row && !isDeleted(row) && isTrue(row[EXPENSE_SCHEMA.SYSTEM.IS_ACTIVE]),
    );
  }

  function allRows() {
    return RepositoryBase.mapRows(
      EXPENSE_SCHEMA,
      RepositoryReader.raw(EXPENSE_SCHEMA),
    );
  }

  function rawById(id) {
    return (
      allRows().find((row) => row[EXPENSE_SCHEMA.PRIMARY_KEY] === id) || null
    );
  }

  function validId(id) {
    return typeof id === "string" && id.trim() !== "";
  }

  function normalizeNominal(value) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return Response.error("Nominal wajib diisi.");
    }

    if (typeof value !== "number" && typeof value !== "string") {
      return Response.error("Nominal harus berupa angka finite.");
    }

    const nominal = Number(value);

    if (!Number.isFinite(nominal)) {
      return Response.error("Nominal harus berupa angka finite.");
    }

    if (nominal < 0) {
      return Response.error("Nominal tidak boleh negatif.");
    }

    return nominal;
  }

  function normalizeTanggal(value) {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        return Response.error("Tanggal tidak valid.");
      }

      return Utilities.formatDate(value, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
    }

    if (typeof value !== "string") {
      return Response.error("Tanggal harus berupa Date atau YYYY-MM-DD.");
    }

    const text = value.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return Response.error("Tanggal harus berupa Date atau YYYY-MM-DD.");
    }

    const parts = text.split("-").map(Number);
    const parsed = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

    if (
      parsed.getUTCFullYear() !== parts[0] ||
      parsed.getUTCMonth() !== parts[1] - 1 ||
      parsed.getUTCDate() !== parts[2]
    ) {
      return Response.error("Tanggal tidak valid.");
    }

    return text;
  }

  function normalizeText(value, field, maximum) {
    if (value === null || value === undefined) {
      return Response.error(`${field} wajib diisi.`);
    }

    const text = String(value).trim();

    if (text === "") {
      return Response.error(`${field} wajib diisi.`);
    }

    if (text.length > maximum) {
      return Response.error(`${field} maksimal ${maximum} karakter.`);
    }

    return text;
  }

  function sanitizeEditable(document, partial) {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return Response.error("Data Expense wajib berupa object.");
    }

    const clean = {};

    editableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(document, field)) {
        clean[field] = document[field];
      }
    });

    if (partial && Object.keys(clean).length === 0) {
      return Response.error("Minimal satu field Expense harus diubah.");
    }

    const fields = partial ? Object.keys(clean) : editableFields;

    for (let index = 0; index < fields.length; index += 1) {
      const field = fields[index];
      let normalized;

      if (field === EXPENSE_FIELDS.DATE) {
        normalized = normalizeTanggal(clean[field]);
      } else if (field === EXPENSE_FIELDS.CATEGORY) {
        normalized = normalizeText(clean[field], field, 100);
      } else if (field === EXPENSE_FIELDS.DESCRIPTION) {
        normalized = normalizeText(clean[field], field, 255);
      } else if (field === EXPENSE_FIELDS.AMOUNT) {
        normalized = normalizeNominal(clean[field]);
      }

      if (normalized && normalized.success === false) {
        return normalized;
      }

      clean[field] = normalized;
    }

    return clean;
  }

  function findAll() {
    return Response.success(allRows().filter(isActive));
  }

  function findById(id) {
    if (!validId(id)) {
      return Response.error("ID Expense wajib diisi.");
    }

    const row = rawById(id.trim());

    return isActive(row)
      ? Response.success(row)
      : Response.error("Expense tidak ditemukan.");
  }

  function findDeleted() {
    return Response.success(allRows().filter(isDeleted));
  }

  function create(document) {
    const clean = sanitizeEditable(document, false);

    if (clean && clean.success === false) {
      return clean;
    }

    return base.create(clean);
  }

  function update(id, document) {
    if (!validId(id)) {
      return Response.error("ID Expense wajib diisi.");
    }

    const cleanId = id.trim();

    if (!isActive(rawById(cleanId))) {
      return Response.error("Expense tidak ditemukan.");
    }

    const clean = sanitizeEditable(document, true);

    if (clean && clean.success === false) {
      return clean;
    }

    return base.update(cleanId, clean);
  }

  function remove(id) {
    if (!validId(id)) {
      return Response.error("ID Expense wajib diisi.");
    }

    const cleanId = id.trim();

    if (!isActive(rawById(cleanId))) {
      return Response.error("Expense tidak ditemukan atau tidak aktif.");
    }

    return base.remove(cleanId);
  }

  function restore(id) {
    if (!validId(id)) {
      return Response.error("ID Expense wajib diisi.");
    }

    const cleanId = id.trim();
    const current = rawById(cleanId);

    if (!current) {
      return Response.error("Expense tidak ditemukan.");
    }

    if (isActive(current)) {
      return Response.error("Expense sudah aktif.");
    }

    if (
      !isDeleted(current) ||
      !isFalse(current[EXPENSE_SCHEMA.SYSTEM.IS_ACTIVE])
    ) {
      return Response.error("Expense tidak dalam status terhapus/nonaktif.");
    }

    const clean = sanitizeEditable(current, false);

    if (clean && clean.success === false) {
      return clean;
    }

    const normalized = base.update(cleanId, clean);

    if (!normalized.success) {
      return normalized;
    }

    return base.restore(cleanId);
  }

  function statistics() {
    const rows = allRows().filter((row) => !isDeleted(row));
    const active = rows.filter(isActive).length;

    return Response.success({
      total: rows.length,
      active,
      inactive: rows.length - active,
    });
  }

  return Object.freeze({
    findAll,
    findById,
    create,
    update,
    remove,
    restore,
    statistics,
    findDeleted,
  });
}
