/** Dashboard supported-metrics service. All business rules remain server-side. */
function DashboardService(dependencies = {}) {
  const products = dependencies.products || ProductService();
  const partners = dependencies.partners || PartnerService();
  const pickups = dependencies.pickups || PickupService();
  const returns = dependencies.returns || ReturnService();
  const purchases = dependencies.purchases || PurchasingService();
  const expenses = dependencies.expenses || ExpenseService();
  const now = typeof dependencies.now === "function" ? dependencies.now : Utils.now;
  const timezone = APP_CONFIG.TIMEZONE;
  const DAY_MS = 86400000;

  function rows(service) {
    const response = service.findAll();
    return response && response.success && Array.isArray(response.data)
      ? response.data.slice()
      : [];
  }

  function dateParts(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 ||
        probe.getUTCDate() !== day) return null;
    return { year, month, day, value: match[0] };
  }

  function ordinal(value) {
    const part = dateParts(value);
    return part ? Math.floor(Date.UTC(part.year, part.month - 1, part.day) / DAY_MS) : NaN;
  }

  function dateFromOrdinal(value) {
    const date = new Date(value * DAY_MS);
    return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0")].join("-");
  }

  function today() {
    return Utilities.formatDate(new Date(now()), timezone, "yyyy-MM-dd");
  }

  function rangeError(code, message, field) {
    return Response.error(message, [{ code, field: field || "range" }]);
  }

  function resolveRange(request = {}) {
    const preset = String(request.preset || "CURRENT_MONTH").toUpperCase();
    const allowed = ["TODAY", "LAST_7_DAYS", "CURRENT_MONTH", "PREVIOUS_MONTH", "CURRENT_YEAR", "CUSTOM"];
    if (allowed.indexOf(preset) < 0) return rangeError("INVALID_PRESET", "Dashboard preset is invalid.", "preset");
    const todayValue = today();
    const t = dateParts(todayValue);
    const todayOrdinal = ordinal(todayValue);
    let startDate;
    let endDate = todayValue;

    if (preset === "TODAY") startDate = todayValue;
    if (preset === "LAST_7_DAYS") startDate = dateFromOrdinal(todayOrdinal - 6);
    if (preset === "CURRENT_MONTH") startDate = `${t.year}-${String(t.month).padStart(2, "0")}-01`;
    if (preset === "CURRENT_YEAR") startDate = `${t.year}-01-01`;
    if (preset === "PREVIOUS_MONTH") {
      const end = new Date(Date.UTC(t.year, t.month - 1, 0));
      endDate = dateFromOrdinal(Math.floor(end.getTime() / DAY_MS));
      startDate = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-01`;
    }
    if (preset === "CUSTOM") {
      startDate = String(request.startDate || "");
      endDate = String(request.endDate || "");
    }
    if (!dateParts(startDate)) return rangeError("INVALID_DATE", "Start date must be YYYY-MM-DD.", "startDate");
    if (!dateParts(endDate)) return rangeError("INVALID_DATE", "End date must be YYYY-MM-DD.", "endDate");
    const startOrdinal = ordinal(startDate);
    const endOrdinal = ordinal(endDate);
    if (startOrdinal > endOrdinal) return rangeError("START_AFTER_END", "Start date must not be after end date.");
    if (endOrdinal - startOrdinal > 1826) return rangeError("RANGE_TOO_LARGE", "Dashboard range cannot exceed five calendar years.");
    const days = endOrdinal - startOrdinal + 1;
    return { success: true, preset, startDate, endDate, startOrdinal, endOrdinal,
      granularity: days <= 31 ? "daily" : days <= 180 ? "weekly" : "monthly" };
  }

  function inRange(row, range) {
    const value = businessDate(row.Tanggal);
    return Boolean(dateParts(value)) && ordinal(value) >= range.startOrdinal && ordinal(value) <= range.endOrdinal;
  }

  function businessDate(value) {
    if (dateParts(value)) return String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return "";
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isFinite(parsed.getTime()) ? Utilities.formatDate(parsed, timezone, "yyyy-MM-dd") : "";
  }

  function finiteNonNegative(value, label) {
    if (value === "" || value === null || typeof value === "undefined") throw new Error(`${label} is blank.`);
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) throw new Error(`${label} must be finite and non-negative.`);
    return number;
  }

  function expenseAggregate(source, range) {
    const qualifying = source.filter((row) => inRange(row, range));
    const grouped = {};
    let total = 0;
    qualifying.forEach((row) => {
      const category = String(row.Kategori || "").trim();
      if (!category) throw new Error(`Expense ${row.ID || "(unknown)"} has a blank category.`);
      const amount = finiteNonNegative(row.Nominal, `Expense ${row.ID || "(unknown)"} Nominal`);
      total += amount;
      grouped[category] = (grouped[category] || 0) + amount;
    });
    const entries = Object.keys(grouped).map((category) => ({ category, amount: grouped[category] }))
      .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
    return { count: qualifying.length, total, labels: entries.map((x) => x.category),
      values: entries.map((x) => x.amount) };
  }

  function bucketKey(dateValue, granularity) {
    if (granularity === "monthly") return dateValue.slice(0, 7);
    if (granularity === "daily") return dateValue;
    const value = ordinal(dateValue);
    const day = new Date(value * DAY_MS).getUTCDay();
    return dateFromOrdinal(value - ((day + 6) % 7));
  }

  function purchasingAggregate(source, range) {
    const qualifying = source.filter((row) => inRange(row, range));
    const grouped = {};
    let total = 0;
    qualifying.forEach((row) => {
      const id = row.ID || "(unknown)";
      const qty = finiteNonNegative(row.Qty, `Purchasing ${id} Qty`);
      const price = finiteNonNegative(row.Harga, `Purchasing ${id} Harga`);
      const stored = finiteNonNegative(row.Total, `Purchasing ${id} Total`);
      const canonical = qty * price;
      if (stored !== canonical) throw new Error(`Purchasing ${id} Total does not reconcile with Qty x Harga.`);
      total += canonical;
      const key = bucketKey(businessDate(row.Tanggal), range.granularity);
      grouped[key] = (grouped[key] || 0) + canonical;
    });
    const labels = [];
    if (range.granularity === "monthly") {
      let year = dateParts(range.startDate).year;
      let month = dateParts(range.startDate).month;
      const endKey = range.endDate.slice(0, 7);
      while (true) {
        const key = `${year}-${String(month).padStart(2, "0")}`;
        labels.push(key);
        if (key === endKey) break;
        month += 1;
        if (month === 13) { month = 1; year += 1; }
      }
    } else {
      let current = range.granularity === "weekly"
        ? ordinal(bucketKey(range.startDate, "weekly")) : range.startOrdinal;
      const step = range.granularity === "weekly" ? 7 : 1;
      while (current <= range.endOrdinal) { labels.push(dateFromOrdinal(current)); current += step; }
    }
    return { count: qualifying.length, total, labels, values: labels.map((key) => grouped[key] || 0) };
  }

  function timestamp(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function recentActivities(sources) {
    const result = [];
    sources.forEach(({ module, source }) => source.forEach((row) => {
      const created = timestamp(row.CreatedAt);
      const updated = timestamp(row.UpdatedAt);
      const event = updated && (!created || updated.getTime() >= created.getTime()) ? updated : created;
      if (!event) return;
      result.push({ module, id: String(row.ID || ""), label: String(row.Nama || row.Keterangan || row.ID || module),
        eventTime: Utilities.formatDate(event, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        eventTimeDisplay: Utilities.formatDate(event, timezone, "dd/MM/yyyy HH:mm"),
        eventType: updated && event === updated ? "updated" : "created", _time: event.getTime() });
    }));
    result.sort((a, b) => b._time - a._time || a.module.localeCompare(b.module) || a.id.localeCompare(b.id));
    return result.slice(0, 10).map(({ _time, ...item }) => item);
  }

  function getDashboard(request = {}) {
    const range = resolveRange(request);
    if (!range.success) return range;
    try {
      const source = { products: rows(products), partners: rows(partners), pickups: rows(pickups),
        returns: rows(returns), purchases: rows(purchases), expenses: rows(expenses) };
      const expense = expenseAggregate(source.expenses, range);
      const purchasing = purchasingAggregate(source.purchases, range);
      const unavailable = { available: false, reason: "CANONICAL_SALES_SOURCE_MISSING" };
      return Response.success({
        range: { preset: range.preset, startDate: range.startDate, endDate: range.endDate,
          timezone, granularity: range.granularity },
        summary: { products: source.products.length, partners: source.partners.length,
          pickups: source.pickups.length, returns: source.returns.length,
          purchasingCount: purchasing.count, expenseCount: expense.count,
          purchasingValue: purchasing.total, expenseValue: expense.total },
        expenseBreakdown: { labels: expense.labels, values: expense.values, total: expense.total },
        purchasingTrend: { labels: purchasing.labels, values: purchasing.values,
          total: purchasing.total, granularity: range.granularity },
        recentActivities: recentActivities([
          { module: "Expense", source: source.expenses }, { module: "Partner", source: source.partners },
          { module: "Pickup", source: source.pickups }, { module: "Product", source: source.products },
          { module: "Purchasing", source: source.purchases }, { module: "Return", source: source.returns },
        ]),
        availability: { revenue: unavailable, profit: unavailable, unitsSold: unavailable,
          activeSalesDays: unavailable, bestSeller: unavailable, topRevenueProduct: unavailable,
          hotColdSplit: unavailable, revenueTrend: unavailable },
        statistics: { purchasing: { total: purchasing.count, active: purchasing.count, inactive: 0 },
          expense: { total: expense.count, active: expense.count, inactive: 0 } },
        generatedAt: now(),
      });
    } catch (error) {
      return Response.error("Dashboard data integrity validation failed.", [
        { code: "DATA_INTEGRITY_ERROR", message: error.message },
      ]);
    }
  }

  return Object.freeze({ getDashboard });
}
