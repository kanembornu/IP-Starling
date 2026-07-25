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
  if (/\bApp\.|Api\.|google\.script\.run|Repository|SpreadsheetApp/.test(presenter)) throw new Error("ProductsPresenter crosses its render-only boundary.");
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

function testMasterDataPresenterArchitectureContracts() {
  const product = HtmlService.createHtmlOutputFromFile("972.View.Products.Presenter").getContent();
  const partner = HtmlService.createHtmlOutputFromFile("973.View.Partners.Presenter").getContent();
  const app = HtmlService.createHtmlOutputFromFile("970.View.App").getContent();
  const api = HtmlService.createHtmlOutputFromFile("965.View.API").getContent();
  const events = HtmlService.createHtmlOutputFromFile("980.View.Event").getContent();
  const views = `${HtmlService.createHtmlOutputFromFile("920.View.Products").getContent()}\n${HtmlService.createHtmlOutputFromFile("925.View.Partners").getContent()}`;
  const forbiddenPresenter = /\bApp\.|\bApi\.|google\.script\.run|\bPromise\b|\basync\b|\bawait\b|addEventListener|\bToast\.|Dialog\.confirm|\bService\b|Controller|Repository|SpreadsheetApp|request(Token|Sequence)?/;
  [product, partner].forEach((source, index) => {
    const name = index ? "PartnersPresenter" : "ProductsPresenter";
    if (forbiddenPresenter.test(source)) throw new Error(`${name} is not render-only.`);
    ["render", "renderLoading", "renderError", "clearSearch"].forEach((method) => { if (!new RegExp(`\\b${method},`).test(source)) throw new Error(`${name}.${method} is not exported.`); });
    if (!/mode === "deleted"/.test(source) || !/data-action="\$\{action\}"/.test(source) || !/paginationMarkup/.test(source)) throw new Error(`${name} lost Active/Deleted actions or pagination rendering.`);
  });
  const eventMethods = {
    product: ["setProductMode", "openCreateProduct", "refreshProducts", "changeProductPage", "changeProductPageSize", "saveProduct", "closeProductModal", "openEditProduct", "deleteProduct", "restoreProduct"],
    partner: ["setPartnerMode", "openCreatePartner", "refreshPartners", "changePartnerPage", "changePartnerPageSize", "savePartner", "closePartnerModal", "openEditPartner", "deletePartner", "restorePartner"],
  };
  ["product", "partner"].forEach((module) => {
    const title = module[0].toUpperCase() + module.slice(1);
    ["Mode", "Page", "PageSize"].forEach((suffix) => { if (!new RegExp(`function (set|change)${title}${suffix}`).test(app)) throw new Error(`App does not own ${title} ${suffix}.`); });
    ["openCreate", "openEdit", "save", "delete", "restore"].forEach((prefix) => { if (!new RegExp(`function ${prefix}${title}\\s*\\(`).test(app) && !new RegExp(`async function ${prefix}${title}\\s*\\(`).test(app)) throw new Error(`App does not own ${prefix}${title}.`); });
    eventMethods[module].forEach((method) => {
      if (!new RegExp(`App\\.${method}\\s*\\(`).test(events)) throw new Error(`Events do not delegate ${title} intent through App.${method}().`);
      if (!new RegExp(`\\b${method},`).test(app)) throw new Error(`Event-called App.${method}() is not exported.`);
    });
  });
  if (!/App\.search\s*\(\s*input\.dataset\.module \|\| App\.currentPage\(\),\s*input\.value\s*,?\s*\)/.test(events)) throw new Error("Product/Partner search intent is not delegated to App.search().");
  if (!/event\.target\.closest\(`\[data-\$\{prefix\}-form-action\]`\)/.test(events)) throw new Error("Master-data form actions are not delegated through the canonical Product/Partner selector.");
  if ((events.match(/bindMasterData\(\);/g) || []).length !== 1 || (events.match(/addEventListener\("click", handleMasterDataClick\)/g) || []).length !== 1 || (events.match(/addEventListener\("change", handleMasterDataChange\)/g) || []).length !== 1 || (events.match(/addEventListener\(\s*"click",\s*handleActionClick/g) || []).length !== 1) throw new Error("Master-data listeners are missing or registered more than once.");
  if ((events.match(/App\.saveProduct\s*\(/g) || []).length !== 1 || (events.match(/App\.changeProductPage\s*\(/g) || []).length !== 1 || (events.match(/App\.changeProductPageSize\s*\(/g) || []).length !== 1) throw new Error("Product submit or pagination intent can dispatch more than once.");
  if (/\bApi\.|\bProductsPresenter\.|\bPartnersPresenter\./.test(events)) throw new Error("Master-data Events bypass App.");
  if (/\bstate\.(?:products?|deletedProducts|productMode|productSearch|partners?|deletedPartners|partnerMode|partnerSearch)\b/.test(events)) throw new Error("Master-data Events mutate App state directly.");
  if (/\bProductsActions\.|\bPartnersActions\./.test(app)) throw new Error("App still delegates master-data orchestration to a second application controller.");
  if (!/const Product = Object\.freeze\([\s\S]*listDeleted\(\)[\s\S]*create\(data\)[\s\S]*update\(id, data\)[\s\S]*remove\(id\)[\s\S]*restore\(id\)/.test(api)) throw new Error("Product API operation set changed.");
  if (!/const Partner = Object\.freeze\([\s\S]*listDeleted\(\)[\s\S]*create\(data\)[\s\S]*update\(id, data\)[\s\S]*remove\(id\)[\s\S]*restore\(id\)/.test(api)) throw new Error("Partner API operation set changed.");
  if (/\bApi\.|google\.script\.run|SpreadsheetApp|Repository|AuditLogService/.test(views)) throw new Error("Master-data Views cross their declarative boundary.");
  if (!/productRequest/.test(app) || !/partnerRequest/.test(app) || !/request !== productRequest/.test(app) || !/request !== partnerRequest/.test(app)) throw new Error("Master-data stale-response guards are missing.");
  if (!/Pagination\.calculate\(productRows\(\)/.test(app) || !/Pagination\.calculate\(partnerRows\(\)/.test(app)) throw new Error("App does not own master-data selected-page calculation.");
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

function masterDataNamedFunctionSource(source, name) {
  const match = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);
  if (!match) return "";
  const start = match.index; const bodyStart = match.index + match[0].length - 1; let depth = 0; let quote = ""; let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "'" || character === '"' || character === "`") { quote = character; continue; }
    if (character === "{") depth += 1;
    if (character === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  return "";
}

function assertClientPaginationModule(source, config) {
  const renderSource = masterDataNamedFunctionSource(source.app, config.renderFunction);
  const pageSource = masterDataNamedFunctionSource(source.app, config.pageFunction);
  const pageSizeSource = masterDataNamedFunctionSource(source.app, config.pageSizeFunction);
  const presenterRender = masterDataNamedFunctionSource(source.presenters[config.module], "render");
  const presenterCall = `${config.presenter}.render`;
  const escapedModule = config.module.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const helperMatch = new RegExp(`const\\s+(\\w+)\\s*=\\s*paginateRows\\("${escapedModule}"`).exec(renderSource);
  const directMatch = /const\s+(\w+)\s*=\s*Pagination\.calculate\((\w+)\(\)/.exec(renderSource);
  let selectedExpression = "";

  if (helperMatch) {
    selectedExpression = helperMatch[1];
    const selectionIndex = renderSource.indexOf(helperMatch[0]);
    const filterIndex = renderSource.search(/\bfiltered\s*=/);
    if (filterIndex < 0 || filterIndex > selectionIndex || !/\bfiltered\s*=.*(?:\.filter\(|\.slice\()/s.test(renderSource.slice(0, selectionIndex))) throw new Error(`${config.module} does not filter/copy its full dataset before pagination.`);
  } else if (directMatch) {
    selectedExpression = `${directMatch[1]}.data`;
    const filterSource = masterDataNamedFunctionSource(source.app, directMatch[2]);
    if (!/\.filter\(/.test(filterSource)) throw new Error(`${config.module} does not derive filtered rows before pagination.`);
  } else {
    throw new Error(`${config.module} does not use canonical App-owned pagination.`);
  }

  const callIndex = renderSource.indexOf(presenterCall);
  const selectionIndex = helperMatch ? renderSource.indexOf(helperMatch[0]) : renderSource.indexOf(directMatch[0]);
  if (callIndex < 0 || callIndex < selectionIndex) throw new Error(`${config.module} Presenter is called before selected-page rows are derived.`);
  const callSource = renderSource.slice(callIndex);
  const escapedSelected = selectedExpression.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const passesRows = new RegExp(`rows\\s*:\\s*${escapedSelected}`).test(callSource) || (selectedExpression.indexOf(".") < 0 && new RegExp(`\\{[^}]*\\b${escapedSelected}\\b`).test(callSource));
  if (!passesRows) throw new Error(`${config.module} does not pass selected-page rows to its Presenter.`);
  if (!/view\.rows/.test(presenterRender) || !/\.map\(/.test(presenterRender)) throw new Error(`${config.module} Presenter does not render supplied rows.`);
  if (/\bApp\.|\bApi\.|\bpaginateRows\s*\(|\bPagination\.calculate\s*\(|\bstate\./.test(source.presenters[config.module])) throw new Error(`${config.module} Presenter owns data or pagination state.`);
  if (!new RegExp(`\\b${config.presenter}\\.render\\s*\\(`).test(renderSource)) throw new Error(`${config.module} App render path does not call its Presenter.`);
  if (!/paginationState\s*\(/.test(pageSource) || !/modeState\.page/.test(pageSource) || !new RegExp(`${config.renderFunction}\\s*\\(`).test(pageSource)) throw new Error(`${config.module} page changes are not App-owned.`);
  if (!/paginationState\s*\(/.test(pageSizeSource) || !/moduleState\.pageSize\s*=\s*validPageSize\(value\)/.test(pageSizeSource) || !/modeState\.page\s*=\s*1/.test(pageSizeSource) || !new RegExp(`${config.renderFunction}\\s*\\(`).test(pageSizeSource)) throw new Error(`${config.module} page-size changes do not reset page one in App.`);
  if (/\bApi\.|\bload\w*\s*\(/.test(`${pageSource}\n${pageSizeSource}`)) throw new Error(`${config.module} client pagination performs an API reload.`);
  if ((source.events.match(new RegExp(`App\\.${config.pageFunction}\\s*\\(`, "g")) || []).length !== 1 || (source.events.match(new RegExp(`App\\.${config.pageSizeFunction}\\s*\\(`, "g")) || []).length !== 1) throw new Error(`${config.module} pagination intent must delegate to App exactly once.`);
  if ((source.views[config.module].match(new RegExp(`id="${config.paginationId}"`, "g")) || []).length !== 1) throw new Error(`${config.module} must expose one pagination region.`);
  if (!new RegExp(`data-${config.marker}-mode="${config.activeMode}"`).test(source.views[config.module]) || !new RegExp(`data-${config.marker}-mode="${config.deletedMode}"`).test(source.views[config.module])) throw new Error(`${config.module} inline modes are missing.`);
  if (!new RegExp(`resetPagination\\("${escapedModule}"`).test(source.app)) throw new Error(`${config.module} mode/search changes do not reset page one.`);
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

  [
    { module: "products", marker: "product", activeMode: "active", deletedMode: "deleted", paginationId: "product-pagination", renderFunction: "renderProducts", presenter: "ProductsPresenter", pageFunction: "changeProductPage", pageSizeFunction: "changeProductPageSize" },
    { module: "partners", marker: "partner", activeMode: "active", deletedMode: "deleted", paginationId: "partner-pagination", renderFunction: "renderPartners", presenter: "PartnersPresenter", pageFunction: "changePartnerPage", pageSizeFunction: "changePartnerPageSize" },
    { module: "pickups", marker: "pickup", activeMode: "active", deletedMode: "trash", paginationId: "pickup-pagination", renderFunction: "renderPickups", presenter: "PickupsPresenter", pageFunction: "changePickupPage", pageSizeFunction: "changePickupPageSize" },
    { module: "returns", marker: "return", activeMode: "active", deletedMode: "deleted", paginationId: "return-pagination", renderFunction: "renderReturns", presenter: "ReturnsPresenter", pageFunction: "changeReturnPage", pageSizeFunction: "changeReturnPageSize" },
    { module: "purchasing", marker: "purchasing", activeMode: "active", deletedMode: "deleted", paginationId: "purchasing-pagination", renderFunction: "renderPurchasing", presenter: "PurchasingPresenter", pageFunction: "changePurchasingPage", pageSizeFunction: "changePurchasingPageSize" },
    { module: "expenses", marker: "expense", activeMode: "active", deletedMode: "trash", paginationId: "expense-pagination", renderFunction: "renderExpenses", presenter: "ExpensesPresenter", pageFunction: "changeExpensePage", pageSizeFunction: "changeExpensePageSize" },
  ].forEach((config) => assertClientPaginationModule(source, config));

  const resetSource = (source.app.match(/function resetPagination\([^}]+\}/) || [""])[0];
  if (!/modeState\.page = 1/.test(resetSource) || /pageSize\s*=/.test(resetSource)) throw new Error("Mode reset must reset only the destination page and preserve module-local page size.");
  if (!/current\.moduleState\.pageSize = validPageSize\(select\.value\)[\s\S]*current\.moduleState\.explicit = true[\s\S]*current\.modeState\.page = 1/.test(source.app)) throw new Error("Session-local page-size selection does not reset page 1.");

  if (!/returnMode:\s*"active"/.test(source.app) || !/data-return-mode="active"/.test(source.views.returns) || !/data-return-mode="deleted"/.test(source.views.returns)) throw new Error("Return default or Active/Deleted inline mode contract is missing.");
  if (!/resetPagination\("returns", next\)/.test(source.app)) throw new Error("Return mode switch does not reset the destination page.");
  if (!/canRestore\s*===\s*true/.test(source.presenters.returns) || !/restoreReason/.test(source.presenters.returns) || !/data-return-action="restore"/.test(source.presenters.returns)) throw new Error("Return Deleted rows do not preserve eligibility and Restore.");
  if (/btn-return-trash|return-trash|openReturnTrash|renderReturnTrash|returnTrash|paginateRows\("returns", "deleted"/.test(`${source.views.returns}\n${source.presenters.returns}\n${source.app}`)) throw new Error("Obsolete Return Deleted modal pagination was reintroduced.");

  if (!/purchasingMode:\s*"active"/.test(source.app) || !/data-purchasing-mode="active"/.test(source.views.purchasing) || !/data-purchasing-mode="deleted"/.test(source.views.purchasing)) throw new Error("Purchasing default or Active/Deleted inline mode contract is missing.");
  if (!/resetPagination\("purchasing", next\)/.test(source.app)) throw new Error("Purchasing mode switch does not reset the destination page.");
  if (!/canRestore\s*===\s*true/.test(source.presenters.purchasing) || !/restoreReason/.test(source.presenters.purchasing) || !/data-purchasing-action="restore"/.test(source.presenters.purchasing)) throw new Error("Purchasing Deleted rows do not preserve eligibility and Restore.");
  if (/btn-purchasing-trash|purchasing-trash|openTrash|renderTrash|trashRows|trashRequest|loadDeleted|pendingRestore|paginateRows\("purchasing", "deleted"/.test(`${source.views.purchasing}\n${source.presenters.purchasing}\n${source.app}`)) throw new Error("Obsolete Purchasing Deleted modal pagination was reintroduced.");

  const returnDeletedSection = source.presenters.returns.slice(source.presenters.returns.indexOf("function renderDeletedRow"), source.presenters.returns.indexOf("function renderEmpty"));
  const purchasingDeletedSection = source.presenters.purchasing.slice(source.presenters.purchasing.indexOf("function renderDeletedRow"), source.presenters.purchasing.indexOf("function renderCreateForm"));
  if (/data-return-action="delete"|permanentDelete|hardDelete/.test(returnDeletedSection) || /data-purchasing-action="delete"|permanentDelete|hardDelete/.test(purchasingDeletedSection)) throw new Error("Deleted inline pagination exposes permanent or repeated Delete actions.");

  if (!/logsPage:\s*1/.test(source.app) || !/Api\.Logs\.page\(filters,\s*\{ page: state\.logsPage, pageSize: state\.logsPageSize \}\)/.test(source.app) || !/RepositoryQuery\.paginate/.test(source.logsService)) throw new Error("Logs server-side pagination contract changed.");
  if (!/state\.logsFilters = next; state\.logsPage = 1; loadLogs\(\)/.test(source.app) || /paginateRows\("logs"/.test(browserSource)) throw new Error("Logs filters do not reset server page 1 or Logs entered client pagination.");

  if ((source.app.match(/event\.target\.closest\("\[data-pagination-action\]"\)/g) || []).length !== 1 || !/\["products", "partners", "pickups", "purchasing", "returns", "expenses"\]\.includes\(module\)/.test(source.app)) throw new Error("The shared pagination listener does not exclude module-owned pagination handlers.");
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

  const filteredFixture = Array.from({ length: 32 }, (_, index) => ({ ID: index + 1, group: index < 23 ? "match" : "other" })).filter((row) => row.group === "match");
  let apiCalls = 0; const presenterInputs = [];
  const present = (page) => { const selected = pagination.calculate(filteredFixture, page, 15); presenterInputs.push(selected.data.slice()); return selected; };
  const first = present(1); const second = present(2);
  assert(apiCalls === 0, "Controlled Pickup client pagination performed an API call.");
  assert(first.totalRows === 23 && second.totalRows === 23, "Filtered Pickup total is not calculated before slicing.");
  assert(presenterInputs[0].length === 15 && presenterInputs[1].length === 8, "Pickup Presenter fixture did not receive selected-page-only rows.");
  assert(presenterInputs[0][0].ID === 1 && presenterInputs[1][0].ID === 16, "Pickup page fixtures do not contain distinct row subsets.");
  assert(presenterInputs.flat().every((row) => row.group === "match"), "Pickup fixture was sliced before filtering.");
}

function frontendArchitectureSourceFixture() {
  const html = (name) => HtmlService.createHtmlOutputFromFile(name).getContent();
  return {
    index: html("900.View.Index"),
    api: html("965.View.API"),
    app: html("970.View.App"),
    events: html("980.View.Event"),
    render: html("975.View.Render"),
    shared: html("976.View.Shared.Presenter"),
    views: ["920.View.Products", "925.View.Partners", "930.View.Pickups", "935.View.Returns", "940.View.Purchasing", "945.View.Expenses"].map(html),
    presenters: {
      ProductsPresenter: html("972.View.Products.Presenter"),
      PartnersPresenter: html("973.View.Partners.Presenter"),
      PickupsPresenter: html("974.View.Pickups.Presenter"),
      ExpensesPresenter: html("977.View.Expenses.Presenter"),
      PurchasingPresenter: html("978.View.Purchasing.Presenter"),
      ReturnsPresenter: html("979.View.Returns.Presenter"),
    },
  };
}

function frontendArchitectureObjectBody(source, declaration) {
  const marker = new RegExp(`(?:const\\s+${declaration}\\s*=\\s*\\(\\(\\)\\s*=>|const\\s+${declaration}\\s*=\\s*Object\\.freeze)`).exec(source);
  if (!marker) return "";
  const start = source.indexOf("{", marker.index);
  let depth = 0; let quote = ""; let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = "";
      continue;
    }
    if (character === "'" || character === '"' || character === "`") { quote = character; continue; }
    if (character === "{") depth += 1;
    if (character === "}" && --depth === 0) return source.slice(start + 1, index);
  }
  return "";
}

function frontendArchitecturePublicNames(source) {
  const matches = Array.from(source.matchAll(/return Object\.freeze\(\{([\s\S]*?)\}\);/g));
  if (!matches.length) return [];
  return (matches[matches.length - 1][1].match(/\b[A-Za-z_$][\w$]*\b/g) || []).filter((name, index, names) => names.indexOf(name) === index);
}

function testFrontendArchitectureBoundaryContracts() {
  const source = frontendArchitectureSourceFixture();
  const forbiddenPresenter = /\bApp\.|\bApi\.|google\.script\.run|\bPromise\b|\basync\b|\bawait\b|addEventListener|\bToast\.|\bDialog\.|\bModal\.|\bstate\.|\b(?:Service|Controller|Repository|SpreadsheetApp)\b/;
  Object.keys(source.presenters).forEach((name) => {
    if (forbiddenPresenter.test(source.presenters[name])) throw new Error(`${name} is not render-only.`);
  });

  if (/\bApi\.|google\.script\.run|\b(?:Products|Partners|Pickups|Returns|Purchasing|Expenses)Presenter\.|\bstate\.|\bToast\.|\bDialog\.|\bModal\./.test(source.events)) throw new Error("Events bypass App or own application state/response behavior.");
  if (/\bApp\.|\b(?:Products|Partners|Pickups|Returns|Purchasing|Expenses)Presenter\.|\bToast\.|\bDialog\.|\bdocument\.|\bDOM\./.test(source.api)) throw new Error("API owns DOM, App state, Presenter, toast, or confirmation behavior.");
  if (/\b(?:Service|Controller|Repository|AuditLogService)\.|\bSpreadsheetApp\b/.test(source.app)) throw new Error("App reaches a backend layer directly.");

  const views = source.views.join("\n");
  if (/google\.script\.run|\bApi\.|\bApp\.|\b(?:Products|Partners|Pickups|Returns|Purchasing|Expenses)Presenter\.|\bon(?:click|change|submit|input)\s*=|SpreadsheetApp|Repository|AuditLogService/.test(views)) throw new Error("A CRUD View contains transport, orchestration, inline handlers, or backend access.");

  if (/\bApp\.|\bApi\.|google\.script\.run|addEventListener|\bToast\.|\bDialog\.|\bModal\.|\bstate\.|Products?|Partners?|Pickups?|Returns?|Purchasing|Expenses?/.test(source.shared)) throw new Error("SharedPresenter contains orchestration, state, or module-specific logic.");
  const sharedPublic = frontendArchitecturePublicNames(source.shared);
  if (sharedPublic.length !== 1 || sharedPublic[0] !== "text") throw new Error("SharedPresenter exposes an unconsumed abstraction.");

  const appPublic = frontendArchitecturePublicNames(source.app);
  const eventCalls = Array.from(source.events.matchAll(/\bApp\.([A-Za-z_$][\w$]*)\s*\(/g), (match) => match[1]).filter((name, index, names) => names.indexOf(name) === index);
  eventCalls.forEach((name) => {
    if (!new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).test(source.app) || appPublic.indexOf(name) < 0) throw new Error(`Event-called App.${name}() does not exist or is not public.`);
  });

  Array.from(source.app.matchAll(/\bApi\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)\s*\(/g)).forEach((match) => {
    const body = frontendArchitectureObjectBody(source.api, match[1]);
    if (!body || !new RegExp(`\\b${match[2]}\\s*\\(`).test(body)) throw new Error(`App-called Api.${match[1]}.${match[2]}() does not exist.`);
  });

  Object.keys(source.presenters).forEach((presenter) => {
    const publicNames = frontendArchitecturePublicNames(source.presenters[presenter]);
    Array.from(source.app.matchAll(new RegExp(`\\b${presenter}\\.([A-Za-z_$][\\w$]*)\\s*\\(`, "g"))).forEach((match) => {
      if (publicNames.indexOf(match[1]) < 0) throw new Error(`App-called ${presenter}.${match[1]}() does not exist.`);
    });
  });
}

function testFrontendArchitectureDuplicateAndDeadCodeContracts() {
  const source = frontendArchitectureSourceFixture();
  if (/983\.View\.Products\.Actions|986\.View\.Partners\.Actions|993\.Framework\.Actions/.test(source.index)) throw new Error("Legacy Product/Partner action controllers are still loaded.");
  if (/960\.View\.Components/.test(source.index)) throw new Error("Unconsumed legacy component templates are still loaded.");
  if (/\bProductsActions\.|\bPartnersActions\./.test(`${source.index}\n${source.app}\n${source.events}\n${source.views.join("\n")}`)) throw new Error("A second master-data mutation controller is reachable.");
  if (!/const Events = \(\(\) => \{\s*let initialized = false;/.test(source.events) || !/function init\(\) \{\s*if \(initialized\) return;\s*initialized = true;/.test(source.events)) throw new Error("Event initialization is not idempotent.");
  if (!/const App = \(\(\) => \{\s*let initialized = false;/.test(source.app) || !/async function init\(\) \{\s*if \(initialized\) return;\s*initialized = true;/.test(source.app)) throw new Error("App initialization is not idempotent.");
  if ((source.app.match(/window\.addEventListener\(\s*"load",\s*App\.init/g) || []).length !== 1 || (source.app.match(/Events\.init\(\);/g) || []).length !== 1) throw new Error("Application bootstrap is missing or duplicated.");
  if ((source.app.match(/DashboardPresenter\.bindRangeControls\s*\(/g) || []).length !== 0) throw new Error("Dashboard Presenter must not bind range controls.");

  ["bindSidebar", "bindTopbar", "bindDashboard", "bindGlobal", "bindMasterData", "bindKeyboard", "bindWindow", "bindPurchasing", "bindPickups", "bindReturns", "bindExpenses"].forEach((name) => {
    if ((source.events.match(new RegExp(`\\b${name}\\(\\);`, "g")) || []).length !== 1) throw new Error(`${name} is initialized more than once.`);
  });
  if (/function reload\s*\(|\breload,/.test(source.events)) throw new Error("Obsolete Events.reload compatibility wrapper remains.");

  const appPublic = frontendArchitecturePublicNames(source.app);
  ["paginateRows", "resetPagination", "getProducts", "getPartners", "getPickups", "getDeletedPickups", "getPickupMode", "getPickupSearch", "getPickupRestoreBusyId", "getExpenses", "getDeletedExpenses", "getExpenseMode", "getReturnMode", "getPurchasingMode", "searchPickups", "searchExpenses"].forEach((name) => {
    if (appPublic.indexOf(name) >= 0) throw new Error(`Dead App public method ${name} remains exported.`);
  });
  if (/function showReturn(?:Error|Success|Warning)\s*\(/.test(source.app)) throw new Error("Dead Return toast wrapper remains.");
  if (/function renderInfo\s*\(/.test(`${source.presenters.ProductsPresenter}\n${source.presenters.PartnersPresenter}`)) throw new Error("Obsolete master-data info renderer remains.");
  ["replace", "append", "prepend", "clear", "pickups", "returns", "show", "hide", "exists", "remove", "focus", "scrollTop"].forEach((name) => {
    if (new RegExp(`(?:function\\s+${name}\\s*\\(|\\b${name},)`).test(source.render)) throw new Error(`Dead Render.${name}() wrapper remains.`);
  });

  ["Pickup", "Return", "Purchasing"].forEach((namespace) => {
    const body = frontendArchitectureObjectBody(source.api, namespace);
    if (/\bget\s*\(id\)/.test(body)) throw new Error(`Unreferenced Api.${namespace}.get() alias remains.`);
  });

  const runner = runFrontendArchitectureHardeningTests.toString();
  if (!/^function runFrontendArchitectureHardeningTests\s*\(/.test(runner)) throw new Error("Frontend architecture runner is missing.");
  ["testFrontendArchitectureBoundaryContracts", "testFrontendArchitectureDuplicateAndDeadCodeContracts"].forEach((name) => {
    if ((runner.match(new RegExp(`\\b${name}\\b`, "g")) || []).length !== 1) throw new Error(`${name} is not registered exactly once.`);
  });
}
