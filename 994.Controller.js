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
// Dashboard
//=============================================================================

function _dashboardControllerResponse(operation) {
  try {
    return JSON.parse(JSON.stringify(operation()));
  } catch (error) {
    return JSON.parse(
      JSON.stringify(Response.error("Terjadi kesalahan saat memproses dashboard.")),
    );
  }
}

function getDashboard(range) {
  return _dashboardControllerResponse(() => DashboardService().getDashboard(range));
}

//=============================================================================
// Settings
//=============================================================================

function _settingsControllerResponse(operation) {
  try {
    return JSON.parse(JSON.stringify(operation()));
  } catch (error) {
    return JSON.parse(JSON.stringify(Response.error("Terjadi kesalahan saat memproses settings.")));
  }
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
  try { return JSON.parse(JSON.stringify(operation())); }
  catch (error) { return JSON.parse(JSON.stringify(Response.error("Logs could not be processed."))); }
}

function listLogs(filters, pagination) {
  return _logsControllerResponse(() => LogsService.list(filters || {}, pagination || {}));
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
  return JSON.parse(JSON.stringify(ProductService().findAll()));
}

function getDeletedProducts() {
  return JSON.parse(JSON.stringify(ProductService().listDeleted()));
}

function getProduct(id) {
  return JSON.parse(JSON.stringify(ProductService().findById(id)));
}

function createProduct(data) {
  return JSON.parse(JSON.stringify(ProductService().create(data)));
}

function updateProduct(id, data) {
  return JSON.parse(JSON.stringify(ProductService().update(id, data)));
}

function deleteProduct(id) {
  return ProductService().remove(id);
}

function restoreProduct(id) {
  return JSON.parse(JSON.stringify(ProductService().restore(id)));
}

//=============================================================================
// Partners
//=============================================================================

function getPartners() {
  return JSON.parse(JSON.stringify(PartnerService().findAll()));
}

function getDeletedPartners() {
  return JSON.parse(JSON.stringify(PartnerService().listDeleted()));
}

function getPartner(id) {
  return JSON.parse(JSON.stringify(PartnerService().findById(id)));
}

function createPartner(data) {
  return JSON.parse(JSON.stringify(PartnerService().create(data)));
}

function updatePartner(id, data) {
  return JSON.parse(JSON.stringify(PartnerService().update(id, data)));
}

function deletePartner(id) {
  return JSON.parse(JSON.stringify(PartnerService().remove(id)));
}

function restorePartner(id) {
  return JSON.parse(JSON.stringify(PartnerService().restore(id)));
}

//=============================================================================
// Pickups
//=============================================================================

function _pickupControllerResponse(operation) {
  try {
    return JSON.parse(JSON.stringify(operation()));
  } catch (error) {
    return JSON.parse(
      JSON.stringify(Response.error("Terjadi kesalahan saat memproses pickup.")),
    );
  }
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
  try {
    return JSON.parse(JSON.stringify(operation()));
  } catch (error) {
    return JSON.parse(
      JSON.stringify(Response.error("Terjadi kesalahan saat memproses retur.")),
    );
  }
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
  try {
    return JSON.parse(JSON.stringify(operation()));
  } catch (error) {
    Logger.log(`Purchasing Controller error: ${error.message}`);
    return JSON.parse(
      JSON.stringify(Response.error("Terjadi kesalahan saat memproses purchasing.")),
    );
  }
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
  try {
    const result = operation();

    if (result && result.success === false) {
      return result;
    }

    return JSON.parse(JSON.stringify(result));
  } catch (error) {
    Logger.log(`Expense Controller error: ${error.message}`);
    return JSON.parse(
      JSON.stringify(Response.error("Terjadi kesalahan saat memproses expense.")),
    );
  }
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
