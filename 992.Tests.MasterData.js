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

function testCanonicalPaginationSourceContracts() {
  const helper = HtmlService.createHtmlOutputFromFile("969.View.Pagination").getContent();
  const app = HtmlService.createHtmlOutputFromFile("970.View.App").getContent();
  const presenters = [
    "972.View.Products.Presenter",
    "973.View.Partners.Presenter",
    "974.View.Pickups.Presenter",
    "977.View.Expenses.Presenter",
    "978.View.Purchasing.Presenter",
    "979.View.Returns.Presenter",
  ].map((name) => HtmlService.createHtmlOutputFromFile(name).getContent()).join("\n");
  const views = [
    "920.View.Products",
    "925.View.Partners",
    "930.View.Pickups",
    "935.View.Returns",
    "940.View.Purchasing",
    "945.View.Expenses",
  ].map((name) => HtmlService.createHtmlOutputFromFile(name).getContent()).join("\n");
  const browserSource = `${helper}\n${app}\n${presenters}\n${views}`;
  const settingsPresenter = HtmlService.createHtmlOutputFromFile("980.View.Settings.Presenter").getContent();

  if (!/OPTIONS\s*=\s*Object\.freeze\(\[10, 15, 25, 50, 100\]\)/.test(helper) || !/fallback = 15/.test(helper)) throw new Error("Canonical pagination sizes or fallback changed.");
  if (!/Math\.max\(1, Math\.ceil\(totalRows \/ size\)\)/.test(helper) || !/source\.slice\(startIndex, endIndex\)/.test(helper)) throw new Error("Pagination calculation or filter-before-slice contract is missing.");
  if (!/rangeStart: totalRows \? startIndex \+ 1 : 0/.test(helper) || !/hasPrevious: page > 1/.test(helper) || !/hasNext: page < totalPages/.test(helper)) throw new Error("Pagination zero-row or navigation metadata changed.");
  ["products", "partners", "pickups", "returns", "purchasing", "expenses"].forEach((module) => {
    const uses = (browserSource.match(new RegExp(`paginateRows\\(\\"${module}\\"`, "g")) || []).length;
    if (uses < 1) throw new Error(`${module} does not use canonical pagination.`);
  });
  if (!/paginateRows\("returns", "deleted"/.test(presenters) || !/paginateRows\("purchasing", "deleted"/.test(presenters)) throw new Error("Return or Purchasing Deleted modal pagination is missing.");
  if (!/current\.moduleState\.pageSize = validPageSize\(select\.value\)[\s\S]*current\.moduleState\.explicit = true[\s\S]*current\.modeState\.page = 1/.test(app)) throw new Error("Session-local page-size selection does not reset page 1.");
  if (!/resetPagination\("products"/.test(app) || !/resetPagination\("partners"/.test(app) || !/resetPagination\("pickups"/.test(app) || !/resetPagination\("expenses"/.test(app)) throw new Error("An inline Active/Deleted mode does not reset pagination.");
  if (/ROWS_PER_PAGE/.test(browserSource)) throw new Error("Legacy ROWS_PER_PAGE is consumed by browser pagination.");
  if (!/setting\.key !== "ROWS_PER_PAGE"/.test(settingsPresenter)) throw new Error("Legacy ROWS_PER_PAGE is exposed in Settings UI.");
  if (/SpreadsheetApp|RepositoryWriter|AuditLogService|AppLogService/.test(browserSource)) throw new Error("Pagination UI introduced spreadsheet or manual audit access.");
  if (!/flex flex-wrap items-center justify-end gap-2/.test(app) || !/disabled:cursor-not-allowed/.test(app)) throw new Error("Shared mobile-safe or disabled pagination control markup is missing.");
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
