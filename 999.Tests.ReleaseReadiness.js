/**
 * Focused release-readiness checks.
 *
 * Existing health and metadata implementations remain authoritative. This
 * suite only composes their public checks with release-entry availability.
 */
let releaseReadinessHealthReport = null;

function releaseReadinessAssert(condition, message) {
  if (!condition) throw new Error(message);
}

function releaseReadinessHealth() {
  if (!releaseReadinessHealthReport) releaseReadinessHealthReport = ApplicationHealth.run();
  return releaseReadinessHealthReport;
}

function testReleaseReadinessCanonicalMetadata() {
  releaseReadinessAssert(APP_CONFIG.VERSION === "1.0.0-dev", "APP_CONFIG.VERSION must be 1.0.0-dev.");
  releaseReadinessAssert(APP_CONFIG.BUILD === "Development", "APP_CONFIG.BUILD must be Development.");
}

function testReleaseReadinessApplicationHealthHasNoFailures() {
  const report = releaseReadinessHealth();
  releaseReadinessAssert(report && report.counts && report.counts.FAIL === 0, `Application health has ${report && report.counts ? report.counts.FAIL : "unknown"} FAIL checks.`);
}

function testReleaseReadinessReleaseMetadataWarningAbsent() {
  const report = releaseReadinessHealth();
  const releaseChecks = report.sections && report.sections.Release ? report.sections.Release : [];
  const metadata = releaseChecks.find((check) => check.name === "Release metadata");
  releaseReadinessAssert(metadata && metadata.status === ApplicationHealth.STATUS.PASS, "Release metadata health check is missing, WARN, or FAIL.");
}

function testReleaseReadinessApplicationMetadataSuite() {
  const tests = getApplicationMetadataTests();
  releaseReadinessAssert(Array.isArray(tests) && tests.length > 0, "Application metadata suite is unavailable.");
  tests.forEach((test) => test());
}

function testReleaseReadinessSmokeRunnerAvailable() {
  releaseReadinessAssert(typeof runAllSafeTests === "function", "Safe smoke-test runner runAllSafeTests is unavailable.");
}

function testReleaseReadinessProductionEntriesAvailable() {
  const entries = [
    ["APP_CONFIG", typeof APP_CONFIG === "object"],
    ["doGet", typeof doGet === "function"],
    ["resolvePage", typeof resolvePage === "function"],
    ["Router.include", typeof Router === "object" && typeof Router.include === "function"],
    ["ApplicationHealth", typeof ApplicationHealth === "object" && typeof ApplicationHealth.run === "function"],
  ];
  const missing = entries.filter((entry) => !entry[1]).map((entry) => entry[0]);
  releaseReadinessAssert(missing.length === 0, `Required production entries are unavailable: ${missing.join(", ")}.`);
  ["900.View.Index", "910.View.Sidebar"].forEach((fileName) => {
    releaseReadinessAssert(applicationMetadataSource(fileName).length > 0, `Required production HTML entry ${fileName} is unavailable.`);
  });
}

function getReleaseReadinessTests() {
  return Object.freeze([
  testReleaseReadinessCanonicalMetadata,
  testReleaseReadinessApplicationHealthHasNoFailures,
  testReleaseReadinessReleaseMetadataWarningAbsent,
  testReleaseReadinessApplicationMetadataSuite,
  testReleaseReadinessSmokeRunnerAvailable,
  testReleaseReadinessProductionEntriesAvailable,
  ]);
}
