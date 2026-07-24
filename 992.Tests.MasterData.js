/**
 * Master-data regression tests.
 */

function testProductService() {
  const response = ProductService().findAll();

  if (!response.success || !Array.isArray(response.data)) {
    throw new Error("ProductService.findAll() response is invalid.");
  }
}

function testPartnerService() {
  const response = PartnerService().findAll();

  if (!response.success || !Array.isArray(response.data)) {
    throw new Error("PartnerService.findAll() response is invalid.");
  }
}

function _productRestoreHarness() {
  const rows = [
    { ID: "PR-ACTIVE", Nama: "Active fixture", Kategori: "Test", Satuan: "pcs", Harga: 10, Deleted: false, IsActive: true, CreatedAt: "created", CreatedBy: "creator", UpdatedAt: "old", UpdatedBy: "old-user" },
    { ID: "PR-DELETED", Nama: "Deleted fixture", Kategori: "Test", Satuan: "kg", Harga: 20, Deleted: true, IsActive: false, CreatedAt: "created-2", CreatedBy: "creator-2", UpdatedAt: "deleted-at", UpdatedBy: "deleter" },
  ];
  let restoreCalls = 0; let auditEvents = 0; let cacheInvalidations = 0;
  const entity = {
    findAll() { return Response.success(rows.filter((row) => row.Deleted !== true)); },
    restore(id) {
      restoreCalls += 1;
      const row = rows.find((item) => item.ID === id);
      row.Deleted = false; row.IsActive = true; row.UpdatedAt = "restored-at"; row.UpdatedBy = "restorer";
      auditEvents += 1; cacheInvalidations += 1;
      return Response.success(Object.assign({}, row), "Product berhasil dipulihkan.");
    },
  };
  const service = ProductService({
    repositoryBase: { rows: () => rows, mapRows: () => rows.map((row) => Object.assign({}, row)) },
    entityFactory: () => entity,
  });
  return { rows, service, counts: () => ({ restoreCalls, auditEvents, cacheInvalidations }) };
}

function testProductDeletedListAndRestoreGuards() {
  const harness = _productRestoreHarness();
  const activeBefore = harness.service.findAll(); const deletedBefore = harness.service.listDeleted();
  if (!activeBefore.success || activeBefore.data.length !== 1 || activeBefore.data[0].ID !== "PR-ACTIVE") throw new Error("Active Product list contract changed.");
  if (!deletedBefore.success || deletedBefore.data.length !== 1 || deletedBefore.data[0].ID !== "PR-DELETED" || deletedBefore.data[0].Deleted !== true) throw new Error("Deleted Product list is not deletion-only.");
  if (deletedBefore.data.some((row) => row.ID === "PR-ACTIVE") || activeBefore.data.some((row) => row.ID === "PR-DELETED")) throw new Error("Active and Deleted Product lists overlap.");
  if (harness.service.restore("").success !== false || harness.service.restore("UNKNOWN").success !== false || harness.service.restore("PR-ACTIVE").success !== false) throw new Error("Invalid Product restore was accepted.");
  if (harness.counts().restoreCalls !== 0 || harness.counts().auditEvents !== 0) throw new Error("Failed Product restore reached mutation or audit.");
  const immutableBefore = Object.assign({}, harness.rows[1]); const restored = harness.service.restore("PR-DELETED");
  if (!restored.success || restored.data.Deleted !== false || restored.data.IsActive !== true) throw new Error("Deleted Product was not restored.");
  ["ID", "Nama", "Kategori", "Satuan", "Harga", "CreatedAt", "CreatedBy"].forEach((field) => { if (restored.data[field] !== immutableBefore[field]) throw new Error(`Restore changed immutable Product field ${field}.`); });
  if (restored.data.UpdatedAt === immutableBefore.UpdatedAt || restored.data.UpdatedBy === immutableBefore.UpdatedBy) throw new Error("Restore audit fields were not updated.");
  const counts = harness.counts(); if (counts.restoreCalls !== 1 || counts.auditEvents !== 1 || counts.cacheInvalidations !== 1) throw new Error("Restore did not produce one mutation, audit event, and Product cache invalidation.");
  if (harness.service.restore("PR-DELETED").success !== false || harness.counts().restoreCalls !== 1) throw new Error("Repeated restore produced a duplicate mutation.");
}

function testProductRestoreSourceContracts() {
  const presenter = HtmlService.createHtmlOutputFromFile("972.View.Products.Presenter").getContent();
  const app = HtmlService.createHtmlOutputFromFile("970.View.App").getContent();
  const api = HtmlService.createHtmlOutputFromFile("965.View.API").getContent();
  const view = HtmlService.createHtmlOutputFromFile("920.View.Products").getContent();
  const controller = restoreProduct.toString();
  if (/Api\.|google\.script\.run|Repository|SpreadsheetApp/.test(presenter)) throw new Error("ProductsPresenter crosses its render-only boundary.");
  if (!/async function restoreProduct\s*\(/.test(app) || !/Dialog\.confirm\s*\(/.test(app) || !/Api\.Product\.restore\s*\(/.test(app)) throw new Error("App does not own Product restore orchestration.");
  if (!/listDeleted\s*\(\)/.test(api) || !/run\("getDeletedProducts"\)/.test(api)) throw new Error("Deleted Product API contract is missing.");
  if (!/data-product-mode="active"/.test(view) || !/data-product-mode="deleted"/.test(view)) throw new Error("Product Active/Deleted mode control is missing.");
  if (!/mode === "deleted"/.test(presenter) || !/actionButton\([^;]+"restore"/.test(presenter)) throw new Error("Restore is not scoped to Deleted rendering.");
  if (/permanent|hard.?delete|purge/i.test(`${view}\n${presenter}\n${app}`)) throw new Error("Permanent-delete Product control was introduced.");
  if (/AuditLogService|AppLogService|LogsService/.test(`${view}\n${presenter}\n${app}\n${api}`)) throw new Error("Product browser path writes Logs manually.");
  if (/SpreadsheetApp|SHEET_NAMES\.PRODUCTS|RepositoryWriter/.test(`${view}\n${presenter}\n${app}\n${api}`)) throw new Error("Product browser path accesses the Products sheet directly.");
  const baseSource = BaseService.create.toString();
  if ((baseSource.match(/auditMutation\("RESTORE"/g) || []).length !== 1) throw new Error("BaseService does not contain exactly one RESTORE audit source.");
  const writerRestore = RepositoryWriter.restore.toString(); const writerUpdate = RepositoryWriter.update.toString();
  if (!/IS_DELETED\]: false/.test(writerRestore) || !/IS_ACTIVE\]: true/.test(writerRestore) || !/UPDATED_AT/.test(writerRestore) || !/UPDATED_BY/.test(writerRestore)) throw new Error("Product restore writer does not preserve the soft-restore audit-field contract.");
  if (!/RepositoryCache\.clear\(schema\)/.test(writerUpdate)) throw new Error("Product restore update path does not invalidate the schema-scoped cache.");
  if (!/JSON\.parse\(JSON\.stringify\(ProductService\(\)\.restore\(id\)\)\)/.test(controller)) throw new Error("Product restore response is not browser-safe; Date values can break google.script.run transport.");
}

function testPartnerDeletedListAndRestoreGuards() {
  const rows = [{ ID: "PT-ACTIVE", Nama: "Active Partner", Deleted: false, IsActive: true }, { ID: "PT-DELETED", Nama: "Deleted Partner", Deleted: true, IsActive: false }];
  let restores = 0;
  const service = PartnerService({ repositoryBase: { mapRows: () => rows.map((row) => Object.assign({}, row)) }, repositoryReader: { raw: () => rows }, entityFactory: () => ({ findAll: () => Response.success(rows.filter((row) => !row.Deleted)), restore: (id) => { restores += 1; const row = rows.find((item) => item.ID === id); row.Deleted = false; row.IsActive = true; return Response.success(Object.assign({}, row)); } }) });
  const deleted = service.listDeleted();
  if (!deleted.success || deleted.data.length !== 1 || deleted.data[0].ID !== "PT-DELETED") throw new Error("Partner deleted list contract failed.");
  if (service.restore("").success || service.restore("UNKNOWN").success || service.restore("PT-ACTIVE").success || restores !== 0) throw new Error("Invalid Partner restore reached mutation.");
  if (!service.restore("PT-DELETED").success || restores !== 1 || service.restore("PT-DELETED").success || restores !== 1) throw new Error("Partner restore duplicate guard failed.");
}

function canonicalPaginationSourceFixture() {
  function html(name) {
    return HtmlService.createHtmlOutputFromFile(name).getContent();
  }

  return {
    helper: html("969.View.Pagination"),
    index: html("900.View.Index"),
    app: html("970.View.App"),
    events: html("980.View.Event"),
    settingsPresenter: html("980.View.Settings.Presenter"),
    logsView: html("948.View.Logs"),
    logsService: LogsService.page.toString(),
    views: {
      products: html("920.View.Products"),
      partners: html("925.View.Partners"),
      pickups: html("930.View.Pickups"),
      returns: html("935.View.Returns"),
      purchasing: html("940.View.Purchasing"),
      expenses: html("945.View.Expenses"),
    },
    presenters: {
      products: html("972.View.Products.Presenter"),
      partners: html("973.View.Partners.Presenter"),
      pickups: html("974.View.Pickups.Presenter"),
      expenses: html("977.View.Expenses.Presenter"),
      purchasing: html("978.View.Purchasing.Presenter"),
      returns: html("979.View.Returns.Presenter"),
    },
  };
}

function assertCanonicalPaginationSourceContracts(source) {
  const presenters = Object.keys(source.presenters).map((key) => source.presenters[key]).join("\n");
  const views = Object.keys(source.views).map((key) => source.views[key]).join("\n");
  const browserSource = `${source.helper}\n${source.index}\n${source.app}\n${source.events}\n${presenters}\n${views}\n${source.logsView}`;
  const allowedSizes = [10, 15, 25, 50, 100];

  if (!/OPTIONS\s*=\s*Object\.freeze\(\[10, 15, 25, 50, 100\]\)/.test(source.helper) || !/fallback = 15/.test(source.helper)) throw new Error("Canonical pagination sizes or fallback changed.");
  if (PAGINATION_CONFIG.DEFAULT_LIMIT !== 15 || JSON.stringify(PAGINATION_CONFIG.ALLOWED_LIMITS) !== JSON.stringify(allowedSizes)) throw new Error("DEFAULT_PAGE_SIZE is no longer backed by canonical runtime pagination configuration.");
  if (!/defaultPageSize:\s*15/.test(source.app) || !/item\.key === "DEFAULT_PAGE_SIZE"/.test(source.app)) throw new Error("DEFAULT_PAGE_SIZE is not the active browser-session pagination source.");
  if (!/createHtmlOutputFromFile\("969\.View\.Pagination"\)/.test(source.index)) throw new Error("Shared Pagination helper is not included in the application.");
  if (!/Math\.max\(1, Math\.ceil\(totalRows \/ size\)\)/.test(source.helper) || !/source\.slice\(startIndex, endIndex\)/.test(source.helper)) throw new Error("Pagination calculation or selected-page slicing is missing.");
  if (!/rangeStart: totalRows \? startIndex \+ 1 : 0/.test(source.helper) || !/hasPrevious: page > 1/.test(source.helper) || !/hasNext: page < totalPages/.test(source.helper)) throw new Error("Pagination zero-row or navigation metadata changed.");
  if (!/modes:\s*\{\}/.test(source.app) || !/moduleState\.modes\[mode\]/.test(source.app)) throw new Error("Mode-specific pagination state is missing.");

  ["products", "partners", "pickups", "returns", "purchasing", "expenses"].forEach((module) => {
    const uses = (browserSource.match(new RegExp(`paginateRows\\(\\"${module}\\"`, "g")) || []).length;
    if (uses < 1) throw new Error(`${module} does not use canonical pagination.`);
  });
  const selectedPageRenderContracts = {
    products: /const list = App\.paginateRows\("products"[\s\S]*list\.map\(\(product\) => renderRow/,
    partners: /const list = App\.paginateRows\("partners"[\s\S]*list\.map\(\(partner\) => renderRow/,
    pickups: /const page = App\.paginateRows\("pickups"[\s\S]*page\.map\(mode === "trash" \? renderTrashRow : renderRow\)/,
    expenses: /const page = App\.paginateRows\("expenses"[\s\S]*page\.map\(renderRow\)/,
  };
  Object.keys(selectedPageRenderContracts).forEach((module) => {
    if (!selectedPageRenderContracts[module].test(source.presenters[module])) throw new Error(`${module} does not render only its selected page.`);
  });

  const modeContracts = [
    ["products", "product", "active", "deleted", "product-pagination"],
    ["partners", "partner", "active", "deleted", "partner-pagination"],
    ["pickups", "pickup", "active", "trash", "pickup-pagination"],
    ["expenses", "expense", "active", "trash", "expense-pagination"],
  ];
  modeContracts.forEach(([module, marker, active, deleted, paginationId]) => {
    const view = source.views[module];
    if (!new RegExp(`data-${marker}-mode=\\"${active}\\"`).test(view) || !new RegExp(`data-${marker}-mode=\\"${deleted}\\"`).test(view)) throw new Error(`${module} Active/Deleted inline controls are missing.`);
    if ((view.match(new RegExp(`id=\\"${paginationId}\\"`, "g")) || []).length !== 1) throw new Error(`${module} must expose one shared inline pagination region.`);
    if (!new RegExp(`resetPagination\\(\\"${module}\\"`).test(source.app) && !new RegExp(`resetPagination\\(\\"${module}\\"`).test(source.presenters[module])) throw new Error(`${module} mode/search flow does not reset page 1.`);
  });

  const resetSource = (source.app.match(/function resetPagination\([^}]+\}/) || [""])[0];
  if (!/modeState\.page = 1/.test(resetSource) || /pageSize\s*=/.test(resetSource)) throw new Error("Mode reset must reset only the destination page and preserve module-local page size.");
  if (!/current\.moduleState\.pageSize = validPageSize\(select\.value\)[\s\S]*current\.moduleState\.explicit = true[\s\S]*current\.modeState\.page = 1/.test(source.app)) throw new Error("Session-local page-size selection does not reset page 1.");

  if (!/returnMode:\s*"active"/.test(source.app) || !/data-return-mode="active"/.test(source.views.returns) || !/data-return-mode="deleted"/.test(source.views.returns)) throw new Error("Return default or Active/Deleted inline mode contract is missing.");
  if ((source.views.returns.match(/id="return-pagination"/g) || []).length !== 1 || !/App\.paginateRows\("returns", mode,[\s\S]*"return-pagination"/.test(source.presenters.returns)) throw new Error("Return inline pagination is missing.");
  if (!/resetPagination\("returns", next\)/.test(source.app)) throw new Error("Return mode switch does not reset the destination page.");
  if (!/page\.map\(mode === "deleted" \? renderDeletedRow : renderRow\)/.test(source.presenters.returns) || !/canRestore === true/.test(source.presenters.returns) || !/restoreReason/.test(source.presenters.returns) || !/data-return-action="restore"/.test(source.presenters.returns)) throw new Error("Return Deleted rows do not preserve eligibility and Restore after slicing.");
  if (/btn-return-trash|return-trash|openReturnTrash|renderReturnTrash|returnTrash|paginateRows\("returns", "deleted"/.test(`${source.views.returns}\n${source.presenters.returns}\n${source.app}`)) throw new Error("Obsolete Return Deleted modal pagination was reintroduced.");

  if (!/purchasingMode:\s*"active"/.test(source.app) || !/data-purchasing-mode="active"/.test(source.views.purchasing) || !/data-purchasing-mode="deleted"/.test(source.views.purchasing)) throw new Error("Purchasing default or Active/Deleted inline mode contract is missing.");
  if ((source.views.purchasing.match(/id="purchasing-pagination"/g) || []).length !== 1 || !/paginateRows\("purchasing", mode,[\s\S]*"purchasing-pagination"/.test(source.app)) throw new Error("Purchasing inline pagination is missing.");
  if (!/resetPagination\("purchasing", next\)/.test(source.app)) throw new Error("Purchasing mode switch does not reset the destination page.");
  if (!/rows\.map\(\(row\) => mode === "deleted" \? renderDeletedRow/.test(source.presenters.purchasing) || !/canRestore === true/.test(source.presenters.purchasing) || !/restoreReason/.test(source.presenters.purchasing) || !/data-purchasing-action="restore"/.test(source.presenters.purchasing)) throw new Error("Purchasing Deleted rows do not preserve eligibility and Restore after slicing.");
  if (/btn-purchasing-trash|purchasing-trash|openTrash|renderTrash|trashRows|trashRequest|loadDeleted|pendingRestore|paginateRows\("purchasing", "deleted"/.test(`${source.views.purchasing}\n${source.presenters.purchasing}\n${source.app}`)) throw new Error("Obsolete Purchasing Deleted modal pagination was reintroduced.");

  const returnDeletedSection = source.presenters.returns.slice(source.presenters.returns.indexOf("function renderDeletedRow"), source.presenters.returns.indexOf("function renderEmpty"));
  const purchasingDeletedSection = source.presenters.purchasing.slice(source.presenters.purchasing.indexOf("function renderDeletedRow"), source.presenters.purchasing.indexOf("function renderCreateForm"));
  if (/data-return-action="delete"|permanentDelete|hardDelete/.test(returnDeletedSection) || /data-purchasing-action="delete"|permanentDelete|hardDelete/.test(purchasingDeletedSection)) throw new Error("Deleted inline pagination exposes permanent or repeated Delete actions.");

  if (!/logsPage:\s*1/.test(source.app) || !/Api\.Logs\.page\(filters,\s*\{ page: state\.logsPage, pageSize: state\.logsPageSize \}\)/.test(source.app) || !/RepositoryQuery\.paginate/.test(source.logsService)) throw new Error("Logs server-side pagination contract changed.");
  if (!/state\.logsFilters = next; state\.logsPage = 1; loadLogs\(\)/.test(source.app) || /paginateRows\("logs"/.test(browserSource)) throw new Error("Logs filters do not reset server page 1 or Logs entered client pagination.");

  if ((source.app.match(/event\.target\.closest\("\[data-pagination-action\]"\)/g) || []).length !== 1 || (source.events.match(/\[data-pagination-action\]\[data-pagination-module='purchasing'\]/g) || []).length !== 1 || !/if \(module === "purchasing"\) return/.test(source.app)) throw new Error("Pagination handlers are missing, duplicated, or dispatch Purchasing twice.");
  if (/ROWS_PER_PAGE/.test(browserSource)) throw new Error("Legacy ROWS_PER_PAGE is consumed by browser pagination.");
  if (!/setting\.key !== "ROWS_PER_PAGE"/.test(source.settingsPresenter)) throw new Error("Legacy ROWS_PER_PAGE is exposed in Settings UI.");
  if (/pageSize\s*[:=]\s*20|requestedSize\s*=\s*20|fallback\s*=\s*20/.test(browserSource)) throw new Error("Hardcoded page-size default 20 is active.");
  if (/SpreadsheetApp|RepositoryWriter|AuditLogService|AppLogService/.test(browserSource)) throw new Error("Pagination UI introduced spreadsheet or manual audit access.");
  if (!/flex flex-wrap items-center justify-end gap-2/.test(source.app) || !/disabled:cursor-not-allowed/.test(source.app)) throw new Error("Shared responsive or disabled pagination control markup is missing.");
}

function testCanonicalPaginationSourceContracts() {
  const source = canonicalPaginationSourceFixture();
  assertCanonicalPaginationSourceContracts(source);

  function expectFailure(change, message) {
    const mutated = Object.assign({}, source, {
      views: Object.assign({}, source.views),
      presenters: Object.assign({}, source.presenters),
    });
    change(mutated);
    let failed = false;
    try { assertCanonicalPaginationSourceContracts(mutated); }
    catch (error) { failed = true; }
    if (!failed) throw new Error(`Pagination source-contract test did not reject: ${message}.`);
  }

  expectFailure((item) => { item.views.returns = item.views.returns.replace('id="return-pagination"', 'id="return-pagination-removed"'); }, "removed Return inline pagination");
  expectFailure((item) => { item.views.purchasing = item.views.purchasing.replace('id="purchasing-pagination"', 'id="purchasing-pagination-removed"'); }, "removed Purchasing inline pagination");
  expectFailure((item) => { item.helper = item.helper.replace("fallback = 15", "fallback = 20"); }, "noncanonical DEFAULT_PAGE_SIZE fallback");
  expectFailure((item) => { item.app = item.app.replace('resetPagination("returns", next);', ""); }, "removed Active/Deleted mode reset");
  expectFailure((item) => { item.app += "\nconst activeRowsPerPage = ROWS_PER_PAGE;"; }, "active ROWS_PER_PAGE consumption");
  expectFailure((item) => { item.app = item.app.replace("Api.Logs.page(filters", "Api.Logs.list(filters"); }, "removed Logs server-page endpoint");
  expectFailure((item) => { item.app += '\nevent.target.closest("[data-pagination-action]");'; }, "duplicate pagination handler");
}

function testCanonicalPaginationCalculations() {
  const html = HtmlService.createHtmlOutputFromFile("969.View.Pagination").getContent();
  const source = html.replace(/^\s*<script>\s*/, "").replace(/\s*<\/script>\s*$/, "");
  const pagination = Function(`${source}\nreturn Pagination;`)();
  const rows = Array.from({ length: 37 }, (_, index) => index + 1);
  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  assert(pagination.pageSize() === 15, "Default page size is not 15.");
  [10, 15, 25, 50, 100].forEach((size) => assert(pagination.pageSize(size) === size, `Allowed page size ${size} was rejected.`));
  [0, -1, 20, 500, NaN].forEach((size) => assert(pagination.pageSize(size) === 15, `Invalid page size ${size} did not fall back to 15.`));
  let result = pagination.calculate([], 0, 15);
  assert(result.page === 1 && result.totalPages === 1 && result.rangeStart === 0 && result.rangeEnd === 0 && !result.hasPrevious && !result.hasNext, "Zero-row pagination is invalid.");
  result = pagination.calculate(rows, 1, 15);
  assert(result.data.length === 15 && result.rangeStart === 1 && result.rangeEnd === 15 && result.totalPages === 3, "First page calculation is invalid.");
  result = pagination.calculate(rows, 2, 15);
  assert(result.data.length === 15 && result.rangeStart === 16 && result.rangeEnd === 30, "Middle page calculation is invalid.");
  result = pagination.calculate(rows, 99, 15);
  assert(result.page === 3 && result.data.length === 7 && result.rangeStart === 31 && result.rangeEnd === 37, "Final partial page or page clamping is invalid.");
  result = pagination.calculate(rows.slice(0, 15), 2, 15);
  assert(result.page === 1 && result.totalPages === 1, "Mutation empty-page correction is invalid.");
  result = pagination.calculate(rows, 1, 10);
  assert(result.page === 1 && result.pageSize === 10 && result.data.length === 10, "Page-size reset calculation is invalid.");
}
