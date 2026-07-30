/** Static and pure in-memory contracts for the destructive development seed. */
function developmentSeedAssert(condition, message) { if (!condition) throw new Error(message); }

function testDevelopmentSeedSchemaHeaderContract() {
  const dataset = DevelopmentSeed.generate();
  DevelopmentSeed.RESET_SCHEMA_KEYS.forEach((key) => {
    const schema = SCHEMA[key];
    const idPattern = key === "LOGS" ? /^LG-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/ : new RegExp(`^${schema.ID_PREFIX}\\d{6}\\d{5}$`);
    dataset.rows[key].forEach((row) => schema.HEADERS.forEach((header) =>
      developmentSeedAssert(Object.prototype.hasOwnProperty.call(row, header), `${schema.TABLE} row is missing ${header}.`)));
    dataset.rows[key].forEach((row) => developmentSeedAssert(idPattern.test(String(row[schema.PRIMARY_KEY])), `${schema.TABLE} ID format is not canonical.`));
  });
}
function testDevelopmentSeedForeignKeyIntegrityContract() {
  developmentSeedAssert(DevelopmentSeed.integrity(DevelopmentSeed.generate()).foreignKeys, "Seed contains an orphan foreign key.");
}
function testDevelopmentSeedQuantityAndTotalIntegrityContract() {
  developmentSeedAssert(DevelopmentSeed.integrity(DevelopmentSeed.generate()).quantitiesAndTotals, "Seed quantity or purchasing total integrity failed.");
}
function testDevelopmentSeedPickupHistoricalPricingContract() {
  const dataset = DevelopmentSeed.generate();
  const productById = dataset.rows.PRODUCT.reduce((lookup, row) => { lookup[row.ID] = row; return lookup; }, {});
  dataset.rows.PICKUP_DETAIL.forEach((detail) => {
    developmentSeedAssert(Number.isFinite(Number(detail.Harga)) && Number(detail.Harga) >= 0, `Pickup Detail ${detail.ID} Harga is invalid.`);
    developmentSeedAssert(Number(detail.Total) === Number(detail.Qty) * Number(detail.Harga), `Pickup Detail ${detail.ID} Total is invalid.`);
    developmentSeedAssert(productById[detail.ProductID], `Pickup Detail ${detail.ID} ProductID is invalid.`);
  });
}
function testDevelopmentSeedDeterministicContract() {
  const first = JSON.stringify(DevelopmentSeed.generate()); const second = JSON.stringify(DevelopmentSeed.generate());
  developmentSeedAssert(first === second, "Seed output is not deterministic.");
}
function testDevelopmentSeedVolumeAndPeriodContract() {
  const dataset = DevelopmentSeed.generate(); const volume = DevelopmentSeed.volumes(dataset);
  developmentSeedAssert(volume.Products >= 15 && volume.Products <= 25, "Product volume is outside 15-25.");
  developmentSeedAssert(volume.Partners >= 8 && volume.Partners <= 15, "Partner volume is outside 8-15.");
  developmentSeedAssert(volume.PickupHeaders >= 250 && volume.PickupHeaders <= 450, "Pickup Header volume is outside 250-450.");
  developmentSeedAssert(volume.PickupDetails >= 600 && volume.PickupDetails <= 1200, "Pickup Detail volume is outside 600-1200.");
  developmentSeedAssert(volume.Returns >= 30 && volume.Returns <= 80, "Return volume is outside 30-80.");
  developmentSeedAssert(volume.Purchases >= 100 && volume.Purchases <= 200, "Purchase volume is outside 100-200.");
  developmentSeedAssert(volume.Expenses >= 80 && volume.Expenses <= 160, "Expense volume is outside 80-160.");
  developmentSeedAssert(volume.Logs >= 100 && volume.Logs <= 300, "Log volume is outside 100-300.");
  developmentSeedAssert(DevelopmentSeed.integrity(dataset).monthsCovered.length === 6, "Six-month coverage is missing.");
  const monthlyPurchaseTotals = {};
  dataset.rows.PURCHASE.forEach((row) => { const month = row.Tanggal.slice(0, 7); monthlyPurchaseTotals[month] = (monthlyPurchaseTotals[month] || 0) + row.Total; });
  developmentSeedAssert(new Set(Object.keys(monthlyPurchaseTotals).map((month) => monthlyPurchaseTotals[month])).size > 1, "Monthly purchasing trend must not be flat.");
  developmentSeedAssert(new Set(dataset.rows.EXPENSE.map((row) => row.Kategori)).size >= 5, "Expense category breakdown is not varied enough.");
  const productQuantities = {}; dataset.rows.PURCHASE.forEach((row) => { productQuantities[row.ProductID] = (productQuantities[row.ProductID] || 0) + row.Qty; });
  const quantities = Object.keys(productQuantities).map((id) => productQuantities[id]).sort((a, b) => b - a);
  developmentSeedAssert(quantities[0] > quantities[Math.floor(quantities.length / 2)], "Product demand distribution does not create a believable leader.");
}
function testDevelopmentSeedSafetySourceContract() {
  const execute = DevelopmentSeed.execute.toString(); const backup = DevelopmentSeed.backup.toString(); const preview = DevelopmentSeed.preview.toString();
  developmentSeedAssert(/confirmationToken|token/.test(execute) && /CONFIRMATION_TOKEN/.test(execute), "Explicit confirmation token guard is missing.");
  developmentSeedAssert(/token\s*!==\s*CONFIRMATION_TOKEN/.test(execute), "Reset must accept only the exact preview confirmation token.");
  developmentSeedAssert(/confirmationTokenRequired:\s*CONFIRMATION_TOKEN/.test(preview), "Preview does not expose the exact reset confirmation token.");
  developmentSeedAssert(/seedPeriod:/.test(preview) && /sheetSummary:/.test(preview) && /estimatedRows:/.test(preview) && /destructiveOperationWarning:/.test(preview), "Structured preview safety summary is incomplete.");
  developmentSeedAssert(/Logger\.log/.test(preview) && /JSON\.stringify\(result,\s*null,\s*2\)/.test(preview), "Preview is not written to the execution log as formatted JSON.");
  developmentSeedAssert(/return result/.test(preview), "Preview must return the same object that is written to the execution log.");
  developmentSeedAssert(/production/.test(execute) && /production/.test(backup), "Production guard is missing.");
  developmentSeedAssert(execute.indexOf("backup()") < execute.indexOf("clearDataRows"), "Backup must occur before deletion.");
  developmentSeedAssert(execute.indexOf("backup()") < execute.indexOf("preparePickupDetailHeaders"), "Pickup Detail header upgrade must occur after backup.");
  developmentSeedAssert(/LockService/.test(execute) && /finally/.test(execute) && /releaseLock/.test(execute), "Script lock contract is missing.");
  developmentSeedAssert(DevelopmentSeed.RESET_SCHEMA_KEYS.indexOf("SETTINGS") < 0, "Settings must never be reset.");
  developmentSeedAssert(previewDevelopmentSeed.toString().indexOf("execute") < 0, "Preview must not execute reset.");
}
function testDevelopmentSeedSequenceSynchronizationContract() {
  const dataset = DevelopmentSeed.generate(); const targets = DevelopmentSeed.sequenceTargets(dataset, "260729");
  developmentSeedAssert(Object.keys(targets).join(",") === DevelopmentSeed.SEQUENTIAL_SEED_KEYS.join(","), "Not every seeded sequential ID type is synchronized.");
  Object.keys(targets).forEach((key) => {
    const target = targets[key]; const schema = SCHEMA[key];
    const expression = new RegExp(`^${schema.ID_PREFIX}260729(\\d{5})$`);
    const expected = dataset.rows[key].reduce((maximum, row) => { const match = expression.exec(String(row[schema.PRIMARY_KEY])); return match ? Math.max(maximum, Number(match[1])) : maximum; }, 0);
    developmentSeedAssert(target.maximum === expected, `${key} sequence target was not derived from generated IDs.`);
  });
  developmentSeedAssert(targets.PICKUP_HEADER.maximum > 0 && targets.PICKUP_DETAIL.maximum > 0, "Current-date Pickup Header/Detail allocations are missing from the sequence target.");
  const synchronize = DevelopmentSeed.synchronizeSequences.toString(); const generator = IDGenerator.ensureAtLeast.toString();
  developmentSeedAssert(/IDGenerator\.ensureAtLeast\([\s\S]*target\.prefix,[\s\S]*target\.maximum,[\s\S]*synchronizationDate/.test(synchronize), "Seed execution does not advance each derived sequence target with the canonical date.");
  developmentSeedAssert(/IDGenerator\.current\(target\.prefix,\s*synchronizationDate\)/.test(synchronize) && /verified = true/.test(synchronize), "Seed execution does not verify persisted sequence read-back.");
  developmentSeedAssert(/Math\.max\(before,\s*target\)/.test(generator) && !/deleteProperty/.test(generator), "Sequence synchronization can move a counter backward.");
}
function testDevelopmentSeedCurrentDateCollisionSafetyContract() {
  const dataset = DevelopmentSeed.generate(); const targets = DevelopmentSeed.sequenceTargets(dataset, "260729"); const synchronized = {};
  Object.keys(targets).forEach((key) => { synchronized[targets[key].prefix] = targets[key].maximum; });
  const report = DevelopmentSeed.sequenceCollisionSafety(dataset, "260729", synchronized);
  developmentSeedAssert(report.safe, "A seeded ID type remains collision-unsafe after synchronization.");
  DevelopmentSeed.SEQUENTIAL_SEED_KEYS.forEach((key) => developmentSeedAssert(report.checks[key] && report.checks[key].safe, `${key} current-date collision safety failed.`));
}

const DEVELOPMENT_SEED_CONTRACT_TESTS = Object.freeze([
  testDevelopmentSeedSchemaHeaderContract,
  testDevelopmentSeedForeignKeyIntegrityContract,
  testDevelopmentSeedQuantityAndTotalIntegrityContract,
  testDevelopmentSeedPickupHistoricalPricingContract,
  testDevelopmentSeedDeterministicContract,
  testDevelopmentSeedVolumeAndPeriodContract,
  testDevelopmentSeedSafetySourceContract,
  testDevelopmentSeedSequenceSynchronizationContract,
  testDevelopmentSeedCurrentDateCollisionSafetyContract,
]);

function runDevelopmentSeedContractTests() {
  const startedAt = Date.now(); const results = [];
  DEVELOPMENT_SEED_CONTRACT_TESTS.forEach((test) => {
    const testStartedAt = Date.now();
    try { test(); results.push({ name: test.name, status: "PASS", durationMs: Date.now() - testStartedAt }); }
    catch (error) { results.push({ name: test.name, status: "FAIL", error: error.message, durationMs: Date.now() - testStartedAt }); }
  });
  const failed = results.filter((result) => result.status === "FAIL");
  const summary = { status: failed.length ? "FAIL" : "PASS", total: results.length, passed: results.length - failed.length,
    failed: failed.length, durationMs: Date.now() - startedAt, results };
  Logger.log(`DEVELOPMENT SEED CONTRACTS: ${JSON.stringify(summary)}`);
  if (failed.length) throw new Error(failed.map((result) => `${result.name}: ${result.error}`).join(" | "));
  return summary;
}
