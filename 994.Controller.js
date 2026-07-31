/**
 * =============================================================================
 * FILE        : 980.Controller.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Frontend Controller
 * =============================================================================
 *
 * Single Entry Point antara Frontend dan Service Layer.
 *
 * Frontend
 *      ↓
 * Controller
 *      ↓
 * Service
 *
 * =============================================================================
 */

//=============================================================================
// Public response boundary
//=============================================================================

function _controllerResponse(operation, publicMessage, context, preserveFailure = false) {
  try {
    const result = operation();

    if (preserveFailure && result && result.success === false) {
      return result;
    }

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    AppLogger.error(`${context} Controller failed.`, {
      error: String(error && error.message ? error.message : error),
    });

    return JSON.parse(
      JSON.stringify(Response.error(publicMessage)),
    );
  }
}

//=============================================================================
// Dashboard
//=============================================================================

function _dashboardControllerResponse(operation) {
  return _controllerResponse(
    operation,
    "Terjadi kesalahan saat memproses dashboard.",
    "Dashboard",
  );
}

function getDashboard(range) {
  return _dashboardControllerResponse(() => DashboardService().getDashboard(range));
}

//=============================================================================
// Settings
//=============================================================================

function _settingsControllerResponse(operation) {
  return _controllerResponse(
    operation,
    "Terjadi kesalahan saat memproses settings.",
    "Settings",
  );
}

function getSettings() {
  return _settingsControllerResponse(() => SettingsService().listResolved());
}

function updateSettingValue(key, rawValue) {
  return _settingsControllerResponse(() => SettingsService().updateValue(key, rawValue));
}

function resetSettingValue(key) {
  return _settingsControllerResponse(() => SettingsService().resetToDefault(key));
}

//=============================================================================
// Logs (read-only browser contract)
//=============================================================================

function _logsControllerResponse(operation) {
  return _controllerResponse(operation, "Logs could not be processed.", "Logs");
}

function listLogs(filters, pagination) {
  return _logsControllerResponse(() => LogsService.list(filters || {}, pagination || {}));
}

function listLogsPage(filters, pagination) {
  return _logsControllerResponse(() => LogsService.page(filters || {}, pagination || {}));
}

function getLogById(id) {
  return _logsControllerResponse(() => LogsService.getById(id));
}

function getLogsSummary(filters) {
  return _logsControllerResponse(() => LogsService.summary(filters || {}));
}

//=============================================================================
// Products
//=============================================================================

function getProducts() {
  return _controllerResponse(
    () => ProductService().findAll(),
    "Terjadi kesalahan saat memproses product.",
    "Product",
  );
}

function getDeletedProducts() {
  return _controllerResponse(
    () => ProductService().listDeleted(),
    "Terjadi kesalahan saat memproses product.",
    "Product",
  );
}

function getProduct(id) {
  return _controllerResponse(
    () => ProductService().findById(id),
    "Terjadi kesalahan saat memproses product.",
    "Product",
  );
}

function createProduct(data) {
  return _controllerResponse(
    () => ProductService().create(data),
    "Terjadi kesalahan saat memproses product.",
    "Product",
  );
}

function updateProduct(id, data) {
  return _controllerResponse(
    () => ProductService().update(id, data),
    "Terjadi kesalahan saat memproses product.",
    "Product",
  );
}

function deleteProduct(id) {
  return _controllerResponse(
    () => ProductService().remove(id),
    "Terjadi kesalahan saat memproses product.",
    "Product",
  );
}

function restoreProduct(id) {
  try {
    return JSON.parse(JSON.stringify(ProductService().restore(id)));
  } catch (error) {
    AppLogger.error("Product Controller failed.", {
      error: String(error && error.message ? error.message : error),
    });

    return JSON.parse(
      JSON.stringify(Response.error("Terjadi kesalahan saat memproses product.")),
    );
  }
}

//=============================================================================
// Partners
//=============================================================================

function getPartners() {
  return _controllerResponse(
    () => PartnerService().findAll(),
    "Terjadi kesalahan saat memproses partner.",
    "Partner",
  );
}

function getDeletedPartners() {
  return _controllerResponse(
    () => PartnerService().listDeleted(),
    "Terjadi kesalahan saat memproses partner.",
    "Partner",
  );
}

function getPartner(id) {
  return _controllerResponse(
    () => PartnerService().findById(id),
    "Terjadi kesalahan saat memproses partner.",
    "Partner",
  );
}

function createPartner(data) {
  return _controllerResponse(
    () => PartnerService().create(data),
    "Terjadi kesalahan saat memproses partner.",
    "Partner",
  );
}

function updatePartner(id, data) {
  return _controllerResponse(
    () => PartnerService().update(id, data),
    "Terjadi kesalahan saat memproses partner.",
    "Partner",
  );
}

function deletePartner(id) {
  return _controllerResponse(
    () => PartnerService().remove(id),
    "Terjadi kesalahan saat memproses partner.",
    "Partner",
  );
}

function restorePartner(id) {
  return _controllerResponse(
    () => PartnerService().restore(id),
    "Terjadi kesalahan saat memproses partner.",
    "Partner",
  );
}

//=============================================================================
// Pickups
//=============================================================================

function _pickupControllerResponse(operation) {
  return _controllerResponse(
    operation,
    "Terjadi kesalahan saat memproses pickup.",
    "Pickup",
  );
}

function getPickups() {
  return _pickupControllerResponse(() => PickupService().findAll());
}

function getDeletedPickups(options) {
  return _pickupControllerResponse(() => PickupService().listDeleted(options));
}

function getPickup(id) {
  return _pickupControllerResponse(() => PickupService().findById(id));
}

function createPickup(data) {
  if (!data || !data.IdempotencyKey) {
    return _pickupControllerResponse(() => Response.error("IdempotencyKey wajib diisi untuk membuat Pickup."));
  }
  return _pickupControllerResponse(() => PickupService().create(data));
}

function updatePickup(id, data) {
  return _pickupControllerResponse(() => PickupService().update(id, data));
}

function deletePickup(id) {
  return _pickupControllerResponse(() => PickupService().remove(id));
}

function restorePickup(id) {
  return _pickupControllerResponse(() => PickupService().restore(id));
}

//=============================================================================
// Returns
//=============================================================================

function _returnControllerResponse(operation) {
  return _controllerResponse(
    operation,
    "Terjadi kesalahan saat memproses retur.",
    "Return",
  );
}

function getReturns() {
  return _returnControllerResponse(() => ReturnService().findAll());
}

function getDeletedReturns() {
  return _returnControllerResponse(() => ReturnService().findDeleted());
}

function getReturn(id) {
  return _returnControllerResponse(() => ReturnService().findById(id));
}

function createReturn(data) {
  if (!data || !data.IdempotencyKey) {
    return _returnControllerResponse(() => Response.error("IdempotencyKey wajib diisi untuk membuat Return."));
  }
  return _returnControllerResponse(() => ReturnService().create(data));
}

function updateReturn(id, data) {
  return _returnControllerResponse(() => ReturnService().update(id, data));
}

function deleteReturn(id) {
  return _returnControllerResponse(() => ReturnService().remove(id));
}

function restoreReturn(id) {
  return _returnControllerResponse(() => ReturnService().restore(id));
}

//=============================================================================
// Purchasing
//=============================================================================

function _purchasingControllerResponse(operation) {
  return _controllerResponse(
    operation,
    "Terjadi kesalahan saat memproses purchasing.",
    "Purchasing",
  );
}

function getPurchasing() {
  return _purchasingControllerResponse(() => PurchasingService().findAll());
}

function getDeletedPurchasing() {
  return _purchasingControllerResponse(() => PurchasingService().findDeleted());
}

function getPurchasingById(id) {
  return _purchasingControllerResponse(() => PurchasingService().findById(id));
}

function createPurchasing(data) {
  return _purchasingControllerResponse(() => PurchasingService().create(data));
}

function updatePurchasing(id, data) {
  return _purchasingControllerResponse(() => PurchasingService().update(id, data));
}

function deletePurchasing(id) {
  return _purchasingControllerResponse(() => PurchasingService().remove(id));
}

function restorePurchasing(id) {
  return _purchasingControllerResponse(() => PurchasingService().restore(id));
}

//=============================================================================
// Expenses
//=============================================================================

function _expenseControllerResponse(operation) {
  return _controllerResponse(
    operation,
    "Terjadi kesalahan saat memproses expense.",
    "Expense",
    true,
  );
}

function getExpenses() {
  return _expenseControllerResponse(() => ExpenseService().findAll());
}

function getExpense(id) {
  return _expenseControllerResponse(() => ExpenseService().findById(id));
}

function getDeletedExpenses() {
  return _expenseControllerResponse(() => ExpenseService().findDeleted());
}

function createExpense(document) {
  return _expenseControllerResponse(() => ExpenseService().create(document));
}

function updateExpense(id, document) {
  return _expenseControllerResponse(() => ExpenseService().update(id, document));
}

function deleteExpense(id) {
  return _expenseControllerResponse(() => ExpenseService().remove(id));
}

function restoreExpense(id) {
  return _expenseControllerResponse(() => ExpenseService().restore(id));
}
