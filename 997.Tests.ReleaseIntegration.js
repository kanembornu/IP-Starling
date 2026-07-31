/**
 * Release-candidate integration source contracts.
 * These tests are intentionally read-only and load each frontend source once
 * per Apps Script execution.
 */

let releaseIntegrationSourceCache = null;

function releaseAssert(condition, message) {
  if (!condition) throw new Error(message);
}

function releaseCount(source, pattern) {
  return (source.match(pattern) || []).length;
}

function releaseHtml(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function releaseIntegrationSources() {
  if (releaseIntegrationSourceCache) return releaseIntegrationSourceCache;
  releaseIntegrationSourceCache = Object.freeze({
    index: releaseHtml("900.View.Index"),
    sidebar: releaseHtml("910.View.Sidebar"),
    api: releaseHtml("965.View.API"),
    pagination: releaseHtml("969.View.Pagination"),
    app: releaseHtml("970.View.App"),
    events: releaseHtml("980.View.Event"),
    dashboardPresenter: releaseHtml("971.View.Dashboard.Presenter"),
    presenters: Object.freeze({
      ProductsPresenter: releaseHtml("972.View.Products.Presenter"),
      PartnersPresenter: releaseHtml("973.View.Partners.Presenter"),
      PickupsPresenter: releaseHtml("974.View.Pickups.Presenter"),
      ExpensesPresenter: releaseHtml("977.View.Expenses.Presenter"),
      PurchasingPresenter: releaseHtml("978.View.Purchasing.Presenter"),
      ReturnsPresenter: releaseHtml("979.View.Returns.Presenter"),
      SettingsPresenter: releaseHtml("980.View.Settings.Presenter"),
      LogsPresenter: releaseHtml("981.View.Logs.Presenter"),
    }),
  });
  return releaseIntegrationSourceCache;
}

function releaseBalancedBlock(source, start) {
  const open = source.indexOf("{", start);
  if (open < 0) return "";
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "'" || character === '"' || character === "`") { quote = character; continue; }
    if (character === "{") depth += 1;
    if (character === "}" && --depth === 0) return source.slice(open, index + 1);
  }
  return "";
}

function releaseFunctionSource(source, name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  return match ? releaseBalancedBlock(source, match.index) : "";
}

function releaseObjectBody(source, name) {
  const match = new RegExp(`const\\s+${name}\\s*=\\s*(?:Object\\.freeze\\s*\\(|\\(\\(\\)\\s*=>)`).exec(source);
  return match ? releaseBalancedBlock(source, match.index) : "";
}

function releasePublicNames(source) {
  const matches = Array.from(source.matchAll(/return Object\.freeze\(\{([\s\S]*?)\}\);/g));
  if (!matches.length) return [];
  return (matches[matches.length - 1][1].match(/\b[A-Za-z_$][\w$]*\b/g) || [])
    .filter((name, index, names) => names.indexOf(name) === index);
}

function releaseControllerSource() {
  return [
    getDashboard, getSettings, updateSettingValue, resetSettingValue,
    listLogs, listLogsPage, getLogById, getLogsSummary,
    getProducts, getDeletedProducts, getProduct, createProduct, updateProduct, deleteProduct, restoreProduct,
    getPartners, getDeletedPartners, getPartner, createPartner, updatePartner, deletePartner, restorePartner,
    getPickups, getDeletedPickups, getPickup, createPickup, updatePickup, deletePickup, restorePickup,
    getReturns, getDeletedReturns, getReturn, createReturn, updateReturn, deleteReturn, restoreReturn,
    getPurchasing, getDeletedPurchasing, getPurchasingById, createPurchasing, updatePurchasing, deletePurchasing, restorePurchasing,
    getExpenses, getExpense, getDeletedExpenses, createExpense, updateExpense, deleteExpense, restoreExpense,
  ].map((fn) => fn.toString()).join("\n");
}

function releaseApiControllerMatrix() {
  const row = (namespace, method, endpoint, args, classification) => Object.freeze({ namespace, method, endpoint, args, classification: classification || "MATCH" });
  return Object.freeze([
    row("Dashboard", "get", "getDashboard", 1),
    row("Settings", "list", "getSettings", 0), row("Settings", "update", "updateSettingValue", 2), row("Settings", "reset", "resetSettingValue", 1),
    row("Logs", "list", "listLogs", 2, "UNUSED"), row("Logs", "page", "listLogsPage", 2), row("Logs", "get", "getLogById", 1, "UNUSED"), row("Logs", "summary", "getLogsSummary", 1, "UNUSED"),
    row("Product", "list", "getProducts", 0), row("Product", "listDeleted", "getDeletedProducts", 0), row("Product", "get", "getProduct", 1), row("Product", "create", "createProduct", 1), row("Product", "update", "updateProduct", 2), row("Product", "remove", "deleteProduct", 1), row("Product", "restore", "restoreProduct", 1),
    row("Partner", "list", "getPartners", 0), row("Partner", "listDeleted", "getDeletedPartners", 0), row("Partner", "get", "getPartner", 1), row("Partner", "create", "createPartner", 1), row("Partner", "update", "updatePartner", 2), row("Partner", "remove", "deletePartner", 1), row("Partner", "restore", "restorePartner", 1),
    row("Pickup", "findAll", "getPickups", 0), row("Pickup", "findDeleted", "getDeletedPickups", 1), row("Pickup", "findById", "getPickup", 1), row("Pickup", "create", "createPickup", 1), row("Pickup", "update", "updatePickup", 2), row("Pickup", "remove", "deletePickup", 1), row("Pickup", "restore", "restorePickup", 1), row("Pickup", "list", "getPickups", 0, "COMPATIBILITY_ALIAS"),
    row("Return", "findAll", "getReturns", 0), row("Return", "findDeleted", "getDeletedReturns", 0), row("Return", "findById", "getReturn", 1), row("Return", "create", "createReturn", 1), row("Return", "update", "updateReturn", 2), row("Return", "remove", "deleteReturn", 1), row("Return", "restore", "restoreReturn", 1), row("Return", "list", "getReturns", 0, "COMPATIBILITY_ALIAS"),
    row("Purchasing", "findAll", "getPurchasing", 0), row("Purchasing", "findDeleted", "getDeletedPurchasing", 0), row("Purchasing", "findById", "getPurchasingById", 1), row("Purchasing", "create", "createPurchasing", 1), row("Purchasing", "update", "updatePurchasing", 2), row("Purchasing", "remove", "deletePurchasing", 1), row("Purchasing", "restore", "restorePurchasing", 1), row("Purchasing", "list", "getPurchasing", 0, "COMPATIBILITY_ALIAS"),
    row("Expense", "list", "getExpenses", 0), row("Expense", "get", "getExpense", 1), row("Expense", "listDeleted", "getDeletedExpenses", 0), row("Expense", "create", "createExpense", 1), row("Expense", "update", "updateExpense", 2), row("Expense", "remove", "deleteExpense", 1), row("Expense", "restore", "restoreExpense", 1),
  ]);
}

function testReleaseRouteInitializationOnce() {
  const source = releaseIntegrationSources();
  releaseAssert(resolvePage({ parameter: { page: "purchasing" } }) === "purchasing", "Canonical Purchasing direct route is not accepted.");
  releaseAssert(resolvePage({ parameter: { page: "purchases" } }) === "dashboard", "Obsolete purchases route remains active.");
  releaseAssert(releaseCount(source.app, /window\.addEventListener\(\s*"load",\s*App\.init/g) === 1, "App boot is missing or duplicated.");
  releaseAssert(releaseCount(source.app, /Events\.init\(\);/g) === 1, "Event initialization is missing or duplicated.");
}

function testReleaseEventBindingOnce() {
  const events = releaseIntegrationSources().events;
  releaseAssert(/let initialized = false/.test(events) && /function init\(\)\s*\{\s*if \(initialized\) return;\s*initialized = true;/.test(events), "Events.init is not idempotent.");
  ["bindSidebar", "bindDashboard", "bindGlobal", "bindMasterData", "bindKeyboard", "bindWindow", "bindPurchasing", "bindPickups", "bindReturns", "bindExpenses"].forEach((name) => {
    releaseAssert(releaseCount(releaseFunctionSource(events, "init"), new RegExp(`\\b${name}\\(\\);`, "g")) === 1, `${name} is not bound exactly once.`);
  });
}

function testReleaseNavigationInvalidatesStaleResponses() {
  const navigate = releaseFunctionSource(releaseIntegrationSources().app, "navigate");
  ["dashboardRequest", "settingsRequest", "logsRequest", "productRequest", "partnerRequest", "pickupRequest", "pickupDetailRequest", "purchasingRequest", "returnRequest", "expenseRequest"].forEach((token) => {
    releaseAssert(new RegExp(`\\b${token}\\s*\\+=\\s*1`).test(navigate), `Navigation does not invalidate ${token}.`);
  });
  releaseAssert(navigate.indexOf("state.page = page") > navigate.indexOf("expenseRequest += 1"), "Route changes before old requests are invalidated.");
}

function testReleaseStateIsolationBetweenModules() {
  const app = releaseIntegrationSources().app;
  const navigate = releaseFunctionSource(app, "navigate");
  ["productFormKind", "partnerFormKind", "pickupFormKind", "returnFormKind", "purchasingFormKind", "expenseFormKind"].forEach((field) => releaseAssert(new RegExp(`state\\.${field}\\s*=\\s*null`).test(navigate), `${field} leaks across routes.`));
  ["productRestoreBusyId", "partnerRestoreBusyId", "pickupBusyId", "returnBusyId", "purchasingBusyId", "expenseBusyId"].forEach((field) => releaseAssert(new RegExp(`state\\.${field}\\s*=\\s*null`).test(navigate), `${field} leaks across routes.`));
  releaseAssert(releaseCount(navigate, /Modal\.close\(\)/g) === 1, "Shared modal is not closed exactly once on navigation.");
}

function testReleaseEveryEventCalledAppMethodExists() {
  const source = releaseIntegrationSources();
  const publicNames = releasePublicNames(source.app);
  Array.from(source.events.matchAll(/\bApp\.([A-Za-z_$][\w$]*)\s*\(/g), (match) => match[1]).forEach((name) => {
    releaseAssert(publicNames.indexOf(name) >= 0 && Boolean(releaseFunctionSource(source.app, name)), `Event-called App.${name} is missing or private.`);
  });
}

function testReleaseEveryAppCalledApiMethodExists() {
  const source = releaseIntegrationSources();
  Array.from(source.app.matchAll(/\bApi\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g)).forEach((match) => {
    releaseAssert(new RegExp(`\\b${match[2]}\\s*\\(`).test(releaseObjectBody(source.api, match[1])), `App-called Api.${match[1]}.${match[2]} is missing.`);
  });
}

function testReleaseEveryAppCalledPresenterMethodExists() {
  const source = releaseIntegrationSources();
  Object.keys(source.presenters).forEach((name) => {
    const publicNames = releasePublicNames(source.presenters[name]);
    Array.from(source.app.matchAll(new RegExp(`\\b${name}\\.([A-Za-z_$][\\w$]*)\\s*\\(`, "g"))).forEach((match) => releaseAssert(publicNames.indexOf(match[1]) >= 0, `App-called ${name}.${match[1]} is missing.`));
  });
}

function testReleasePaginationSelectedPageOnly() {
  const app = releaseIntegrationSources().app;
  releaseAssert(/const filtered = source\.filter[\s\S]*const rows = paginateRows\("purchasing"[\s\S]*PurchasingPresenter\.render\(\{ mode, rows/.test(releaseFunctionSource(app, "renderPurchasing")), "Purchasing does not filter, slice, then present selected rows.");
  ["renderPickups", "renderReturns", "renderExpenses"].forEach((name) => releaseAssert(/paginateRows\(/.test(releaseFunctionSource(app, name)), `${name} bypasses canonical selected-page slicing.`));
  ["renderProducts", "renderPartners"].forEach((name) => releaseAssert(/Pagination\.calculate\(/.test(releaseFunctionSource(app, name)) && /rows:\s*pagination\.data/.test(releaseFunctionSource(app, name)), `${name} does not present selected-page rows.`));
}

function testReleasePaginationMakesNoApiRequest() {
  const app = releaseIntegrationSources().app;
  ["changeProductPage", "changePartnerPage", "changePickupPage", "changeReturnPage", "changePurchasingPage", "changeExpensePage", "changeProductPageSize", "changePartnerPageSize", "changePickupPageSize", "changeReturnPageSize", "changePurchasingPageSize", "changeExpensePageSize"].forEach((name) => {
    const body = releaseFunctionSource(app, name);
    releaseAssert(body && !/\bApi\./.test(body), `${name} performs a server request.`);
  });
}

function testReleaseDefaultPageSizeCanonical() {
  const source = releaseIntegrationSources();
  releaseAssert(/defaultPageSize:\s*15/.test(source.app), "App default page size is not 15.");
  releaseAssert(/function pageSize\(value, fallback = 15\)/.test(source.pagination), "Pagination fallback is not canonical.");
  releaseAssert(!/ROWS_PER_PAGE/.test(`${source.app}\n${source.pagination}`), "Legacy ROWS_PER_PAGE remains active.");
}

function testReleaseStaleErrorsIgnored() {
  const app = releaseIntegrationSources().app;
  [["loadDashboard", "dashboardRequest", "dashboard"], ["loadProducts", "productRequest", "products"], ["loadPartners", "partnerRequest", "partners"], ["loadPickups", "pickupRequest", "pickups"], ["loadReturns", "returnRequest", "returns"], ["loadPurchasing", "purchasingRequest", "purchasing"], ["loadExpenses", "expenseRequest", "expenses"], ["loadSettings", "settingsRequest", "settings"], ["loadLogs", "logsRequest", "logs"]].forEach(([name, token, page]) => {
    const body = releaseFunctionSource(app, name);
    releaseAssert(new RegExp(`request !== ${token}[^\\n]*state\\.page !== ["']${page}["']|request !== ${token}[\\s\\S]{0,100}state\\.page !== ["']${page}["']`).test(body), `${name} does not reject stale route responses.`);
  });
}

function testReleaseSettingsConfigNotRedundantlyFetched() {
  const body = releaseFunctionSource(releaseIntegrationSources().app, "ensureSettingsLoaded");
  releaseAssert(/settingsLoaded/.test(body) && /settingsLoading/.test(body), "Settings cache/in-flight coalescing is missing.");
  releaseAssert(releaseCount(body, /Api\.Settings\.list\(/g) === 1, "Settings loader issues duplicate API requests.");
}

function testReleaseChartLifecycleSafe() {
  const source = releaseIntegrationSources();
  releaseAssert(/DashboardPresenter\.destroyCharts\(\)/.test(releaseFunctionSource(source.app, "navigate")), "Dashboard route exit does not dispose charts.");
  releaseAssert(/\.destroy\(\)/.test(releaseFunctionSource(source.dashboardPresenter, "destroyCharts")), "Dashboard chart instances are not destroyed.");
}

function testReleaseApiCalledControllerEndpointsExist() {
  const api = releaseIntegrationSources().api;
  const controller = releaseControllerSource();
  const endpoints = Array.from(api.matchAll(/\brun\("([A-Za-z_$][\w$]*)"/g), (match) => match[1]);
  endpoints.forEach((endpoint) => releaseAssert(new RegExp(`function\\s+${endpoint}\\s*\\(`).test(controller), `Api endpoint ${endpoint} is missing in Controller.`));
}

function testReleaseApiControllerArgumentCompatibility() {
  const api = releaseIntegrationSources().api;
  const controller = releaseControllerSource();
  releaseApiControllerMatrix().filter((row) => row.classification !== "COMPATIBILITY_ALIAS").forEach((row) => {
    const body = releaseObjectBody(api, row.namespace);
    const method = new RegExp(`\\b${row.method}\\s*\\(([^)]*)\\)\\s*\\{[\\s\\S]*?run\\("${row.endpoint}"([^)]*)\\)`).exec(body);
    releaseAssert(Boolean(method), `${row.namespace}.${row.method} does not call ${row.endpoint}.`);
    const controllerMatch = new RegExp(`function\\s+${row.endpoint}\\s*\\(([^)]*)\\)`).exec(controller);
    const controllerArgs = controllerMatch && controllerMatch[1].trim() ? controllerMatch[1].split(",").length : 0;
    releaseAssert(controllerArgs === row.args, `${row.endpoint} Controller arity does not match the API contract.`);
  });
}

function testReleaseApiControllerResponseEnvelopeCompatibility() {
  const api = releaseIntegrationSources().api;
  const success = Response.success({ ok: true }, "ok");
  const failure = Response.error("failed", [{ code: "TEST" }]);
  [success, failure].forEach((response) => releaseAssert(typeof response.success === "boolean" && Object.prototype.hasOwnProperty.call(response, "data") && Array.isArray(response.errors) && response.meta, "Response envelope is incomplete."));
  releaseAssert(/resolve\(result\)/.test(api), "API silently changes successful Controller responses.");
  releaseAssert(/reject\(error\)/.test(api), "API failure transport does not preserve a readable rejection.");
}

function testReleaseDependencyEligibilityContracts() {
  const app = releaseIntegrationSources().app;
  releaseAssert(/pickupSelectable\(products\.data\)/.test(releaseFunctionSource(app, "ensurePickupDependencies")) && /pickupSelectable\(partners\.data\)/.test(releaseFunctionSource(app, "ensurePickupDependencies")), "Pickup dependencies bypass eligibility filtering.");
  releaseAssert(/selectableReturns\(response\.data\)/.test(releaseFunctionSource(app, "ensureReturnPickups")), "Return Pickup headers bypass eligibility filtering.");
  releaseAssert(/IsActive/.test(releaseFunctionSource(app, "selectablePurchasingSuppliers")) && /Jenis/.test(releaseFunctionSource(app, "selectablePurchasingSuppliers")), "Purchasing Supplier eligibility is incomplete.");
}

function testReleaseDeletedDependenciesExcluded() {
  const app = releaseIntegrationSources().app;
  ["pickupSelectable", "selectableReturns", "selectablePurchasingSuppliers", "selectablePurchasingProducts"].forEach((name) => releaseAssert(/Deleted/.test(releaseFunctionSource(app, name)), `${name} does not explicitly exclude Deleted rows.`));
}

function testReleaseRestoredDependenciesBecomeEligible() {
  const app = releaseIntegrationSources().app;
  const restore = releaseFunctionSource(app, "restorePickup");
  const remove = releaseFunctionSource(app, "deletePickup");
  releaseAssert(/Api\.Pickup\.restore/.test(restore) && /invalidateReturnDependencies\(\)/.test(restore), "Pickup restore does not invalidate Return dependencies.");
  releaseAssert(/Api\.Pickup\.remove/.test(remove) && /invalidateReturnDependencies\(\)/.test(remove), "Pickup delete does not invalidate Return dependencies.");
}

function testReleaseOneMutationPathPerAction() {
  const app = releaseIntegrationSources().app;
  ["Product", "Partner", "Pickup", "Return", "Purchasing", "Expense"].forEach((namespace) => {
    ["create", "update", "remove", "restore"].forEach((method) => releaseAssert(releaseCount(app, new RegExp(`Api\\.${namespace}\\.${method}\\(`, "g")) === 1, `${namespace}.${method} has zero or duplicate App mutation paths.`));
  });
}

function testReleaseOneRefreshPerSuccessfulMutation() {
  const app = releaseIntegrationSources().app;
  [["saveProduct", "loadProducts"], ["deleteProduct", "loadProducts"], ["savePartner", "loadPartners"], ["deletePartner", "loadPartners"], ["submitPickupForm", "loadPickups"], ["submitReturnForm", "loadReturns"], ["deleteReturn", "loadReturns"], ["submitPurchasingForm", "loadPurchasing"], ["deletePurchasing", "loadPurchasing"], ["restorePurchasing", "loadPurchasing"], ["submitExpenseForm", "loadExpenses"], ["deleteExpense", "loadExpenses"], ["restoreExpense", "loadExpenses"]].forEach(([mutation, refresh]) => {
    releaseAssert(releaseCount(releaseFunctionSource(app, mutation), new RegExp(`\\b${refresh}\\(`, "g")) === 1, `${mutation} does not have exactly one accepted refresh.`);
  });
}

function testReleaseOneAuditEventPerMutationContract() {
  const base = BaseService.create.toString();
  const transaction = TransactionService.create.toString();
  ["CREATE", "UPDATE", "DELETE", "RESTORE"].forEach((action) => releaseAssert(releaseCount(transaction, new RegExp(`auditMutation\\(headerSchema, "${action}"`, "g")) === 1, `TransactionService ${action} audit ownership is missing or duplicated.`));
  releaseAssert(releaseCount(PickupService.toString(), /auditMutation\(PICKUP_HEADER_SCHEMA, "UPDATE"/g) === 1, "Pickup header-only Update audit is missing or duplicated.");
  releaseAssert(releaseCount(ReturnService.toString(), /auditMutation\(RETURN_SCHEMA, "CREATE"/g) === 1, "Return locked Create audit is missing or duplicated.");
  ["CREATE", "UPDATE", "DELETE", "RESTORE"].forEach((action) => releaseAssert(releaseCount(base, new RegExp(`auditMutation\\("${action}"`, "g")) === 1, `${action} audit ownership is missing or duplicated.`));
  const frontend = `${releaseIntegrationSources().app}\n${releaseIntegrationSources().api}\n${releaseIntegrationSources().events}`;
  releaseAssert(!/AuditLogService|AppLogService|SpreadsheetApp/.test(frontend), "Frontend writes audit or spreadsheet state.");
  releaseAssert(!/auditMutation|AuditLogService/.test(releaseControllerSource()), "Controller duplicates Service audit ownership.");
}

function testReleaseCreateIdempotencyContract() {
  const source = releaseIntegrationSources();
  const app = source.app;
  const api = source.api;
  const controller = releaseControllerSource();
  releaseAssert(/function createRequestKey\(\)/.test(app) && /crypto\.randomUUID/.test(app), "App does not own collision-resistant request-key generation.");
  releaseAssert(/pickupCreateRequestKey/.test(app) && /returnCreateRequestKey/.test(app), "Create request keys are not retained in App state.");
  releaseAssert(/IdempotencyKey:state\.pickupCreateRequestKey/.test(app) && /IdempotencyKey:state\.returnCreateRequestKey/.test(app), "Create payloads do not carry retained request keys.");
  releaseAssert(/run\("createPickup", data\)/.test(api) && /run\("createReturn", data\)/.test(api), "API does not pass create payloads unchanged.");
  releaseAssert(/PickupService\(\)\.create\(data\)/.test(controller) && /ReturnService\(\)\.create\(data\)/.test(controller), "Controller does not pass create payloads unchanged.");
  releaseAssert((controller.match(/IdempotencyKey wajib diisi/g) || []).length === 2, "Canonical create Controllers do not require request identity.");
  releaseAssert(/IdempotencyService\.execute/.test(PickupService.toString()) && /IdempotencyService\.execute/.test(ReturnService.toString()), "Create Services do not consume durable idempotency reservations.");
  releaseAssert(SHEET_NAMES.IDEMPOTENCY_REQUESTS === "IdempotencyRequests" && IDEMPOTENCY_SCHEMA.TABLE === SHEET_NAMES.IDEMPOTENCY_REQUESTS, "Dedicated idempotency store is not canonical.");
}

function testReleaseTestRegistrationExactlyOnce() {
  const registries = [getReleaseFrontendIntegrationTests(), getReleaseBackendContractTests(), getReleaseMutationIntegrityTests()];
  const tests = registries.reduce((all, registry) => all.concat(registry), []);
  const names = tests.map((test) => test.name);
  releaseAssert(tests.length === 24, `Expected 24 release integration tests; found ${tests.length}.`);
  releaseAssert(new Set(names).size === names.length, "A release integration test is registered more than once.");
  [runReleaseFrontendIntegrationTests, runReleaseBackendContractTests, runReleaseMutationIntegrityTests].forEach((runner) => {
    const source = runner.toString();
    releaseAssert(/runTestSuite\(/.test(source) && /reportTiming:\s*true/.test(source), `${runner.name} does not use fail-fast timed execution.`);
  });
}
