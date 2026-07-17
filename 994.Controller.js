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

function getDashboard() {
  const result = DashboardService().getDashboard();

  return JSON.parse(JSON.stringify(result));
}

//=============================================================================
// Products
//=============================================================================

function getProducts() {
  return JSON.parse(JSON.stringify(ProductService().findAll()));
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
  return ProductService().restore(id);
}

//=============================================================================
// Partners
//=============================================================================

function getPartners() {
  return JSON.parse(JSON.stringify(PartnerService().findAll()));
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

function getExpenses() {
  return ExpenseService().findAll();
}

function getExpense(id) {
  return ExpenseService().findById(id);
}

function createExpense(data) {
  return ExpenseService().create(data);
}

function updateExpense(id, data) {
  return ExpenseService().update(id, data);
}

function deleteExpense(id) {
  return ExpenseService().remove(id);
}

function restoreExpense(id) {
  return ExpenseService().restore(id);
}
