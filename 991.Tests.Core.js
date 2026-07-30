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

function idGeneratorFixture(options = {}) {
  const values = Object.assign({}, options.properties || {});
  const lockCalls = { waits: 0, releases: 0 };
  const lock = {
    hasLock() { return false; },
    waitLock() { lockCalls.waits += 1; },
    releaseLock() { lockCalls.releases += 1; },
  };
  return {
    values,
    lockCalls,
    generator: IDGenerator.createForTesting({
      properties: {
        getProperty(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setProperty(key, value) { values[key] = String(value); },
        deleteProperty(key) { delete values[key]; },
      },
      lockFactory: () => lock,
      now: () => new Date("2026-07-30T02:00:00.000Z"),
      formatDate: () => "260730",
      rowsFor: (schema) => (options.rows || {})[schema.NAME] || [],
      reservedIdsFor: (schema) => (options.reserved || {})[schema.NAME] || [],
    }),
  };
}

function testIDGeneratorCanonicalSequenceKeyContract() {
  const fixture = idGeneratorFixture();
  if (fixture.generator.counterKey("PH") !== "SEQ_PH_260730" ||
      fixture.generator.counterKey("PD") !== "SEQ_PD_260730") {
    throw new Error("Pickup sequence keys do not use the canonical IDGenerator key builder.");
  }
  const seedSource = String(DevelopmentSeed.synchronizeSequences);
  const healthSource = String(ApplicationHealth.capture);
  if (!/IDGenerator\.counterKey/.test(seedSource) || !/IDGenerator\.current/.test(seedSource) ||
      !/IDGenerator\.current/.test(healthSource) || /`SEQ_/.test(seedSource) || /`SEQ_/.test(healthSource)) {
    throw new Error("Seed or Application Health duplicates or bypasses canonical sequence access.");
  }
}

function testIDGeneratorPersistedReadBackContract() {
  const fixture = idGeneratorFixture({ properties: { SEQ_PH_260730: "1" } });
  const result = fixture.generator.ensureAtLeast("PH", 4);
  if (result.key !== "SEQ_PH_260730" || result.after !== 4 || !result.verified ||
      fixture.generator.current("PH") !== 4 || fixture.values.SEQ_PH_260730 !== "4") {
    throw new Error("Sequence advancement was not verified through canonical persisted read-back.");
  }
  fixture.generator.ensureAtLeast("PH", 2);
  if (fixture.generator.current("PH") !== 4) throw new Error("Sequence synchronization decremented a counter.");
}

function testIDGeneratorRuntimeStorageAdapterContract() {
  const source = expenseFrontendSource("85.Framework.IDGenerator");
  if (!/PropertiesService\.getScriptProperties\(\)/.test(source) ||
      !/properties\.getProperty\(counterKey\(prefix, date\)\)/.test(source) ||
      !/properties\.setProperty\(counterKey\(prefix, date\), String\(sequence\)\)/.test(source) ||
      /getDocumentProperties|getUserProperties/.test(source)) {
    throw new Error("IDGenerator runtime storage is not canonical Script Properties.");
  }
}

function testIDGeneratorCurrentDateMaximumScanContract() {
  const schema = PICKUP_DETAIL_SCHEMA;
  const idIndex = schema.HEADERS.indexOf(schema.PRIMARY_KEY);
  const row = (id) => schema.HEADERS.map((_, index) => index === idIndex ? id : "");
  const fixture = idGeneratorFixture({
    rows: { PickupDetail: [row("PD26072900099"), row("PD26073000003"), row("PD26073000002")] },
    reserved: { PickupDetail: ["PD26073000004"] },
  });
  if (fixture.generator.maximumExisting(schema) !== 4) {
    throw new Error("Current-date maximum scan did not include persisted and reserved IDs.");
  }
}

function testIDGeneratorSelfHealingAndLockContract() {
  const schema = PICKUP_HEADER_SCHEMA;
  const idIndex = schema.HEADERS.indexOf(schema.PRIMARY_KEY);
  const row = schema.HEADERS.map((_, index) => index === idIndex ? "PH26073000001" : "");
  const fixture = idGeneratorFixture({ rows: { PickupHeader: [row] } });
  const repair = fixture.generator.repairSequence(schema);
  const first = fixture.generator.generate(schema);
  const second = fixture.generator.generate(schema);
  if (repair.previousSequence !== 0 || repair.allocatedMaximum !== 1 ||
      repair.repairedSequence !== 1 || repair.persistedReadBack !== 1 ||
      first !== "PH26073000002" || second !== "PH26073000003" ||
      fixture.generator.current("PH") !== 3 || fixture.lockCalls.waits !== 3 ||
      fixture.lockCalls.releases !== 3) {
    throw new Error("Locked allocation did not self-heal or remain collision-safe across allocations.");
  }
}

function testIDGeneratorPickupDetailCollisionRegression() {
  const schema = PICKUP_DETAIL_SCHEMA;
  const idIndex = schema.HEADERS.indexOf(schema.PRIMARY_KEY);
  const rows = [1, 2, 3].map((suffix) => schema.HEADERS.map((_, index) =>
    index === idIndex ? `PD260730${String(suffix).padStart(5, "0")}` : ""));
  const fixture = idGeneratorFixture({ rows: { PickupDetail: rows } });
  const repair = fixture.generator.repairSequence(schema);
  if (repair.previousSequence !== 0 || repair.allocatedMaximum !== 3 ||
      repair.repairedSequence !== 3 || repair.persistedReadBack !== 3 ||
      fixture.generator.generate(schema) !== "PD26073000004" || fixture.generator.current("PD") !== 4) {
    throw new Error("Pickup Detail allocation did not recover from a zero stored sequence.");
  }
}

function testRuntimeIdSequenceRepairEntryPointContract() {
  const source = String(repairCurrentIdSequences);
  if (!/^function repairCurrentIdSequences\(\)/.test(source) ||
      !/LockService\.getScriptLock\(\)/.test(source) ||
      !/ID_GENERATOR_SCHEMA_KEYS\.map/.test(source) ||
      !/IDGenerator\.repairSequence\(schema, applicationDate\)/.test(source) ||
      !/storageBackend:\s*"ScriptProperties"/.test(source) ||
      !/Logger\.log\(JSON\.stringify\(report, null, 2\)\)/.test(source)) {
    throw new Error("Editor-runnable current sequence repair contract is incomplete.");
  }
}

function testIDGeneratorAllEntitySequenceRegression() {
  const keys = ["PRODUCT", "PARTNER", "PICKUP_HEADER", "PICKUP_DETAIL", "RETURN", "PURCHASE", "EXPENSE", "SETTINGS"];
  keys.forEach((key) => {
    const schema = SCHEMA[key];
    const idIndex = schema.HEADERS.indexOf(schema.PRIMARY_KEY);
    const existing = `${schema.ID_PREFIX}26073000002`;
    const row = schema.HEADERS.map((_, index) => index === idIndex ? existing : "");
    const fixture = idGeneratorFixture({ rows: { [schema.NAME]: [row] } });
    const allocated = fixture.generator.generate(schema);
    if (allocated !== `${schema.ID_PREFIX}26073000003` || fixture.generator.current(schema.ID_PREFIX) !== 3) {
      throw new Error(`${key} sequence remained behind its current-date allocated maximum.`);
    }
  });
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
