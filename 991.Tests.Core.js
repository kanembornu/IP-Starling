/**
 * Core regression tests.
 */

function testCoreValidator() {
  const result = Validator.validate(PRODUCT_SCHEMA, {
    Nama: "",
    Kategori: "Coffee",
    Satuan: "Cup",
    Harga: "abc",
  });

  if (result.valid || !Array.isArray(result.errors) || result.errors.length === 0) {
    throw new Error("Validator must reject invalid Product data.");
  }
}

function testCoreResponse() {
  const success = Response.success({ id: "PR001" }, "Saved.");
  const error = Response.error("Not found.");

  if (
    !success.success ||
    success.data.id !== "PR001" ||
    error.success ||
    error.data !== null
  ) {
    throw new Error("Response helpers returned an invalid shape.");
  }
}

function testRepositoryCacheOversizedValueBypass() {
  const schema = { TABLE: "CacheTest", PRIMARY_KEY: "ID", SYSTEM: { IS_DELETED: "Deleted" } };

  function cacheDouble(options = {}) {
    const values = {};
    const calls = { get: 0, put: 0, remove: 0 };
    return {
      calls,
      values,
      get(key) { calls.get += 1; if (options.getError) throw options.getError; return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
      put(key, value) { calls.put += 1; if (options.putError) throw options.putError; values[key] = value; },
      remove(key) { calls.remove += 1; if (options.removeError) throw options.removeError; delete values[key]; },
    };
  }

  const smallAdapter = cacheDouble();
  const smallCache = RepositoryCache.createForTesting(smallAdapter);
  let smallComputes = 0;
  const smallValue = smallCache.remember(schema, () => { smallComputes += 1; return [["small"]]; });
  const smallHit = smallCache.remember(schema, () => { smallComputes += 1; return [["wrong"]]; });
  if (smallValue[0][0] !== "small" || smallHit[0][0] !== "small" || smallComputes !== 1 || smallAdapter.calls.put !== 1) throw new Error("Small cache values or cache hits are invalid.");

  smallCache.clear(schema);
  if (smallAdapter.calls.remove !== 1 || smallAdapter.get(smallCache.key(schema)) !== null) throw new Error("Cache clear behavior changed.");

  const oversizedAdapter = cacheDouble();
  const oversizedCache = RepositoryCache.createForTesting(oversizedAdapter);
  const largeText = "x".repeat(96 * 1024);
  const largeRows = [["LARGE", largeText, false]];
  let largeComputes = 0;
  const returned = oversizedCache.remember(schema, () => { largeComputes += 1; return largeRows; });
  if (returned !== largeRows || returned[0][1].length !== largeText.length || largeComputes !== 1 || oversizedAdapter.calls.put !== 0) throw new Error("Oversized cache bypass truncated, recomputed, or attempted a cache write.");

  const sizeErrorAdapter = cacheDouble({ putError: new Error("Argument too large: value") });
  const sizeErrorCache = RepositoryCache.createForTesting(sizeErrorAdapter);
  const fallback = { complete: true };
  let sizeErrorComputes = 0;
  if (sizeErrorCache.remember(schema, () => { sizeErrorComputes += 1; return fallback; }) !== fallback || sizeErrorComputes !== 1 || sizeErrorAdapter.calls.put !== 1) throw new Error("Cache size exceptions must return the complete value after one computation.");

  const programmingErrorCache = RepositoryCache.createForTesting(cacheDouble({ putError: new Error("Unexpected cache adapter defect") }));
  let programmingErrorPropagated = false;
  try { programmingErrorCache.remember(schema, () => ({ ok: true })); } catch (error) { programmingErrorPropagated = /Unexpected cache adapter defect/.test(error.message); }
  if (!programmingErrorPropagated) throw new Error("Unrelated cache programming errors must propagate.");

  const getQuotaAdapter = cacheDouble({ getError: new Error("Cache quota temporarily unavailable") });
  const getQuotaCache = RepositoryCache.createForTesting(getQuotaAdapter);
  let getQuotaComputes = 0;
  const getQuotaValue = getQuotaCache.remember({ ...schema, TABLE: "CacheGetQuota" }, () => { getQuotaComputes += 1; return { complete: true }; });
  if (!getQuotaValue.complete || getQuotaComputes !== 1 || getQuotaAdapter.calls.put !== 1) throw new Error("Cache get quota failure did not bypass to one complete computation.");

  const invalidAdapter = cacheDouble({ removeError: new Error("Service invoked too many times for cache") });
  const invalidCache = RepositoryCache.createForTesting(invalidAdapter);
  invalidAdapter.values[invalidCache.key({ ...schema, TABLE: "InvalidCache" })] = "{invalid";
  let invalidComputes = 0;
  const invalidValue = invalidCache.remember({ ...schema, TABLE: "InvalidCache" }, () => { invalidComputes += 1; return { recovered: true }; });
  if (!invalidValue.recovered || invalidComputes !== 1 || invalidAdapter.calls.remove !== 1) throw new Error("Invalid cache removal quota failure blocked recomputation.");

  let computeErrorPropagated = false;
  let computeErrorCalls = 0;
  try { oversizedCache.remember({ ...schema, TABLE: "ComputeError" }, () => { computeErrorCalls += 1; throw new Error("Repository read failed"); }); } catch (error) { computeErrorPropagated = /Repository read failed/.test(error.message); }
  if (!computeErrorPropagated || computeErrorCalls !== 1) throw new Error("Compute errors must propagate after exactly one execution.");

  const readerBase = {
    rows() { return largeRows; },
    mapRows(_schema, rows) { return rows.map((row) => ({ ID: row[0], Payload: row[1], Deleted: row[2] })); },
  };
  const reader = RepositoryReader.createForTesting(oversizedCache, readerBase);
  if (reader.raw(schema)[0][1].length !== largeText.length || reader.count(schema) !== 1) throw new Error("RepositoryReader raw/count failed for an oversized fixture.");
}
