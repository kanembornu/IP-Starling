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
    const defaultPreset = "CURRENT_YEAR";
    const preset = String(request.preset || defaultPreset).toUpperCase();
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
      granularity: preset === "CURRENT_MONTH" || preset === "PREVIOUS_MONTH" ? "weekly" :
        days <= 31 ? "daily" : days <= 90 ? "weekly" : days <= 731 ? "monthly" : "yearly" };
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

  function shortDate(value) {
    const part = dateParts(value);
    return `${String(part.day).padStart(2, "0")}/${String(part.month).padStart(2, "0")}`;
  }

  function timeBuckets(range) {
    const buckets = [];
    if (range.granularity === "daily") {
      for (let current = range.startOrdinal; current <= range.endOrdinal; current += 1) {
        const date = dateFromOrdinal(current);
        buckets.push({ key: date, label: shortDate(date), startOrdinal: current, endOrdinal: current });
      }
    } else if (range.granularity === "weekly") {
      const oneMonth = range.startDate.slice(0, 7) === range.endDate.slice(0, 7);
      let current = range.startOrdinal;
      let index = 1;
      while (current <= range.endOrdinal) {
        const end = Math.min(current + 6, range.endOrdinal);
        const startDate = dateFromOrdinal(current);
        const endDate = dateFromOrdinal(end);
        const startPart = dateParts(startDate);
        const endPart = dateParts(endDate);
        const label = oneMonth ? `M${index}` : startPart.month === endPart.month
          ? `${String(startPart.day).padStart(2, "0")}–${shortDate(endDate)}`
          : `${shortDate(startDate)}–${shortDate(endDate)}`;
        buckets.push({ key: `W${index}`, label, startOrdinal: current, endOrdinal: end });
        current = end + 1;
        index += 1;
      }
    } else if (range.granularity === "monthly") {
      let year = dateParts(range.startDate).year;
      let month = dateParts(range.startDate).month;
      const endKey = range.endDate.slice(0, 7);
      const crossesYears = range.startDate.slice(0, 4) !== range.endDate.slice(0, 4);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      while (true) {
        const key = `${year}-${String(month).padStart(2, "0")}`;
        const monthStart = Math.max(ordinal(`${key}-01`), range.startOrdinal);
        const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const monthEnd = Math.min(ordinal(nextMonth) - 1, range.endOrdinal);
        buckets.push({ key, label: crossesYears ? `${monthNames[month - 1]} ${year}` : monthNames[month - 1],
          startOrdinal: monthStart, endOrdinal: monthEnd });
        if (key === endKey) break;
        month += 1;
        if (month === 13) { month = 1; year += 1; }
      }
    } else {
      const startYear = dateParts(range.startDate).year;
      const endYear = dateParts(range.endDate).year;
      for (let year = startYear; year <= endYear; year += 1) {
        buckets.push({ key: String(year), label: String(year),
          startOrdinal: Math.max(ordinal(`${year}-01-01`), range.startOrdinal),
          endOrdinal: Math.min(ordinal(`${year}-12-31`), range.endOrdinal) });
      }
    }
    return buckets;
  }

  function bucketForDate(dateValue, buckets) {
    const value = ordinal(dateValue);
    return buckets.find((bucket) => value >= bucket.startOrdinal && value <= bucket.endOrdinal);
  }

  function purchasingAggregate(source, range) {
    const qualifying = source.filter((row) => inRange(row, range));
    const buckets = timeBuckets(range);
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
      const bucket = bucketForDate(businessDate(row.Tanggal), buckets);
      if (!bucket) throw new Error(`Purchasing ${id} is outside the resolved Dashboard buckets.`);
      grouped[bucket.key] = (grouped[bucket.key] || 0) + canonical;
    });
    const units = qualifying.reduce((sum, row) => sum + finiteNonNegative(row.Qty, `Purchasing ${row.ID || "(unknown)"} Qty`), 0);
    return { count: qualifying.length, units, total, labels: buckets.map((bucket) => bucket.label),
      values: buckets.map((bucket) => grouped[bucket.key] || 0) };
  }

  function netPickupValueAggregate(headers, details, returnRows, range) {
    const headerById = {};
    const detailById = {};
    headers.forEach((header) => { headerById[String(header.ID || "")] = header; });
    details.forEach((detail) => { detailById[String(detail.ID || "")] = detail; });
    const grossByBucket = {};
    const returnByBucket = {};
    const buckets = timeBuckets(range);
    let gross = 0;
    let returned = 0;

    details.forEach((detail) => {
      const header = headerById[String(detail.PickupID || "")];
      if (!header) throw new Error(`Pickup Detail ${detail.ID || "(unknown)"} references a missing active Pickup Header.`);
      if (!inRange(header, range)) return;
      const qty = finiteNonNegative(detail.Qty, `Pickup Detail ${detail.ID || "(unknown)"} Qty`);
      const price = finiteNonNegative(detail.Harga, `Pickup Detail ${detail.ID || "(unknown)"} Harga`);
      const stored = finiteNonNegative(detail.Total, `Pickup Detail ${detail.ID || "(unknown)"} Total`);
      if (stored !== qty * price) throw new Error(`Pickup Detail ${detail.ID || "(unknown)"} Total does not reconcile with Qty x Harga.`);
      const bucket = bucketForDate(businessDate(header.Tanggal), buckets);
      if (!bucket) throw new Error(`Pickup ${header.ID || "(unknown)"} is outside the resolved Dashboard buckets.`);
      grossByBucket[bucket.key] = (grossByBucket[bucket.key] || 0) + stored;
      gross += stored;
    });

    returnRows.filter((row) => inRange(row, range)).forEach((row) => {
      const detail = detailById[String(row.PickupDetailID || "")];
      if (!detail) throw new Error(`Return ${row.ID || "(unknown)"} references a missing Pickup Detail.`);
      const qty = finiteNonNegative(row.Qty, `Return ${row.ID || "(unknown)"} Qty`);
      const price = finiteNonNegative(detail.Harga, `Pickup Detail ${detail.ID || "(unknown)"} Harga`);
      const value = qty * price;
      const bucket = bucketForDate(businessDate(row.Tanggal), buckets);
      if (!bucket) throw new Error(`Return ${row.ID || "(unknown)"} is outside the resolved Dashboard buckets.`);
      returnByBucket[bucket.key] = (returnByBucket[bucket.key] || 0) + value;
      returned += value;
    });

    return { labels: buckets.map((bucket) => bucket.label),
      values: buckets.map((bucket) => (grossByBucket[bucket.key] || 0) - (returnByBucket[bucket.key] || 0)),
      gross, returned, total: gross - returned, granularity: range.granularity };
  }

  function monthlyPurchasingAggregate(source, range) {
    const qualifying = source.filter((row) => inRange(row, range));
    const grouped = {};
    qualifying.forEach((row) => {
      const id = row.ID || "(unknown)";
      const total = finiteNonNegative(row.Total, `Purchasing ${id} Total`);
      const key = businessDate(row.Tanggal).slice(0, 7);
      grouped[key] = (grouped[key] || 0) + total;
    });
    const labels = [];
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
    return { labels, values: labels.map((key) => grouped[key] || 0), total: qualifying.reduce((sum, row) => sum + Number(row.Total), 0), granularity: "monthly" };
  }

  function productPerformance(source, productsSource, range) {
    const categories = {};
    productsSource.forEach((row) => {
      const id = String(row.ID || "");
      categories[id] = String(row.Kategori || "Uncategorized").trim() || "Uncategorized";
    });
    const grouped = {};
    source.filter((row) => inRange(row, range)).forEach((row) => {
      const id = String(row.ProductID || "").trim();
      if (!id) throw new Error(`Purchasing ${row.ID || "(unknown)"} has a blank ProductID.`);
      const category = categories[id] || "Uncategorized";
      if (!grouped[category]) grouped[category] = { category, label: category, quantity: 0, value: 0 };
      grouped[category].quantity += finiteNonNegative(row.Qty, `Purchasing ${row.ID || "(unknown)"} Qty`);
      grouped[category].value += finiteNonNegative(row.Total, `Purchasing ${row.ID || "(unknown)"} Total`);
    });
    const rows = Object.keys(grouped).map((category) => grouped[category])
      .sort((a, b) => b.value - a.value || b.quantity - a.quantity || a.label.localeCompare(b.label));
    return { rows, labels: rows.map((row) => row.label), values: rows.map((row) => row.value), quantities: rows.map((row) => row.quantity) };
  }

  function timestamp(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function recentActivities(sources, range) {
    const result = [];
    sources.forEach(({ module, source }) => source.forEach((row) => {
      const created = timestamp(row.CreatedAt);
      const updated = timestamp(row.UpdatedAt);
      const event = updated && (!created || updated.getTime() >= created.getTime()) ? updated : created;
      if (!event) return;
      const eventDate = Utilities.formatDate(event, timezone, "yyyy-MM-dd");
      const eventOrdinal = ordinal(eventDate);
      if (eventOrdinal < range.startOrdinal || eventOrdinal > range.endOrdinal) return;
      result.push({ module, id: String(row.ID || ""), label: String(row.Nama || row.Keterangan || row.ID || module),
        eventTime: Utilities.formatDate(event, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        eventTimeDisplay: Utilities.formatDate(event, timezone, "dd/MM/yyyy HH:mm"),
        eventType: updated && event === updated ? "updated" : "created", _time: event.getTime() });
    }));
    result.sort((a, b) => b._time - a._time || a.module.localeCompare(b.module) || a.id.localeCompare(b.id));
    return result.slice(0, 5).map(({ _time, ...item }) => item);
  }

  function getDashboard(request = {}) {
    const range = resolveRange(request);
    if (!range.success) return range;
    try {
      const source = { products: rows(products), partners: rows(partners), pickups: rows(pickups),
        pickupDetails: typeof pickups.findAllDetails === "function" ? rows({ findAll: pickups.findAllDetails }) : [],
        returns: rows(returns), purchases: rows(purchases), expenses: rows(expenses) };
      const expense = expenseAggregate(source.expenses, range);
      const purchasing = purchasingAggregate(source.purchases, range);
      const monthlyPurchasing = monthlyPurchasingAggregate(source.purchases, range);
      const productsByPurchasing = productPerformance(source.purchases, source.products, range);
      const netPickupValue = netPickupValueAggregate(source.pickups, source.pickupDetails, source.returns, range);
      const unavailable = { available: false, reason: "CANONICAL_SALES_SOURCE_MISSING" };
      return Response.success({
        range: { preset: range.preset, startDate: range.startDate, endDate: range.endDate,
          timezone, granularity: range.granularity },
        summary: { products: source.products.length, partners: source.partners.length,
          pickups: source.pickups.length, returns: source.returns.length,
          purchasingCount: purchasing.count, expenseCount: expense.count,
          purchasingValue: purchasing.total, expenseValue: expense.total,
          netPickupValue: netPickupValue.total,
          purchasedUnits: purchasing.units, transactionCount: purchasing.count + expense.count,
          revenue: null, profit: null },
        financial: { revenue: null, expense: expense.total, profit: null,
          revenueReason: "CANONICAL_SALES_SOURCE_MISSING", profitReason: "CANONICAL_SALES_SOURCE_MISSING" },
        expenseBreakdown: { labels: expense.labels, values: expense.values, total: expense.total },
        purchasingTrend: { labels: purchasing.labels, values: purchasing.values,
          total: purchasing.total, granularity: range.granularity },
        netPickupValueTrend: netPickupValue,
        monthlyPurchasingTrend: monthlyPurchasing,
        productPerformance: productsByPurchasing,
        leaders: { bestSeller: null, topRevenueProduct: null,
          topPurchasedProduct: productsByPurchasing.rows[0] || null,
          salesReason: "CANONICAL_SALES_SOURCE_MISSING" },
        recentActivities: recentActivities([
          { module: "Expense", source: source.expenses }, { module: "Partner", source: source.partners },
          { module: "Pickup", source: source.pickups }, { module: "Product", source: source.products },
          { module: "Purchasing", source: source.purchases }, { module: "Return", source: source.returns },
        ], range),
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
