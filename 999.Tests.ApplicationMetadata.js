function applicationMetadataAssert(condition, message) {
  if (!condition) throw new Error(message);
}

function applicationMetadataSource(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

function testApplicationMetadataCanonicalRelease() {
  applicationMetadataAssert(APP_CONFIG.VERSION === "1.0.0-rc.1", "APP_CONFIG.VERSION is not the canonical release-candidate version.");
  applicationMetadataAssert(APP_CONFIG.BUILD === "Release Candidate 1", "APP_CONFIG.BUILD is not the canonical release-candidate build.");
}

function testApplicationMetadataBootstrapResponse() {
  const response = doGet({ parameter: { page: "dashboard" } });
  const html = response.getContent();
  applicationMetadataAssert(response.getTitle() === APP_CONFIG.NAME, "Browser title does not use APP_CONFIG.NAME.");
  applicationMetadataAssert(html.indexOf(`name: "${APP_CONFIG.NAME}"`) >= 0, "Bootstrap response omitted APP_CONFIG.NAME.");
  applicationMetadataAssert(html.indexOf(`version: "${APP_CONFIG.VERSION}"`) >= 0, "Bootstrap response omitted APP_CONFIG.VERSION.");
  applicationMetadataAssert(html.indexOf(`build: "${APP_CONFIG.BUILD}"`) >= 0, "Bootstrap response omitted APP_CONFIG.BUILD.");
}

function testApplicationMetadataSidebarVersionFlow() {
  const bootstrap = applicationMetadataSource("900.View.Index");
  const app = applicationMetadataSource("970.View.App");
  applicationMetadataAssert(/version:\s*"<\?= appVersion \?>"/.test(bootstrap), "Bootstrap state no longer receives the templated application version.");
  applicationMetadataAssert(/metadata:\s*\{[\s\S]*?version:\s*window\.APP\?\.version\s*\|\|\s*""/.test(app), "App state no longer stores bootstrap version metadata.");
  applicationMetadataAssert(/versionElement\.textContent\s*=\s*version\s*\?\s*`v\$\{version\}`\s*:\s*"v—"/.test(app), "Sidebar version is not rendered from App metadata state.");
}

function testApplicationMetadataMissingVersionFallback() {
  const app = applicationMetadataSource("970.View.App");
  applicationMetadataAssert(/typeof state\.metadata\.version === "string"/.test(app), "Sidebar version does not validate metadata availability.");
  applicationMetadataAssert(/:\s*"v—"/.test(app), "Missing version metadata does not render the safe v— fallback.");
}

function testApplicationMetadataSidebarHasNoSemanticVersionLiteral() {
  const sidebar = applicationMetadataSource("910.View.Sidebar");
  applicationMetadataAssert(/id="appVersion"/.test(sidebar), "Sidebar version placeholder is missing.");
  applicationMetadataAssert(!/v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/.test(sidebar), "Sidebar contains a hardcoded semantic version.");
}

function testApplicationMetadataHealthContract() {
  const report = applicationHealthEvaluate(applicationHealthFixture());
  const release = applicationHealthCheck(report, "Release", "Release metadata");
  const identity = applicationHealthCheck(report, "Application", "Application identity");
  applicationMetadataAssert(release.status === "PASS", "Existing release metadata health check is not PASS.");
  applicationMetadataAssert(identity.diagnostic.indexOf(`${APP_CONFIG.NAME} ${APP_CONFIG.VERSION} (${APP_CONFIG.BUILD})`) >= 0, "Application identity health check does not report canonical metadata.");
}

function testApplicationMetadataNoRawGoogleScriptRunOutsideApi() {
  ["900.View.Index", "910.View.Sidebar", "970.View.App"].forEach((fileName) => {
    applicationMetadataAssert(!/google\.script\.run/.test(applicationMetadataSource(fileName)), `${fileName} contains raw google.script.run.`);
  });
}

const APPLICATION_METADATA_TESTS = Object.freeze([
  testApplicationMetadataCanonicalRelease,
  testApplicationMetadataBootstrapResponse,
  testApplicationMetadataSidebarVersionFlow,
  testApplicationMetadataMissingVersionFallback,
  testApplicationMetadataSidebarHasNoSemanticVersionLiteral,
  testApplicationMetadataHealthContract,
  testApplicationMetadataNoRawGoogleScriptRunOutsideApi,
]);

function runApplicationMetadataTests() {
  return runTestSuite("Application metadata tests", APPLICATION_METADATA_TESTS, { reportTiming: true });
}
