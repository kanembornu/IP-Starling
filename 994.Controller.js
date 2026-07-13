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
  return PartnerService().findAll();
}

function getPartner(id) {
  return PartnerService().findById(id);
}

function createPartner(data) {
  return PartnerService().create(data);
}

function updatePartner(id, data) {
  return PartnerService().update(id, data);
}

function deletePartner(id) {
  return PartnerService().remove(id);
}

function restorePartner(id) {
  return PartnerService().restore(id);
}

//=============================================================================
// Pickups
//=============================================================================

function getPickups() {
  return PickupService().findAll();
}

function getPickup(id) {
  return PickupService().findById(id);
}

function createPickup(data) {
  return PickupService().create(data);
}

function updatePickup(id, data) {
  return PickupService().update(id, data);
}

function deletePickup(id) {
  return PickupService().remove(id);
}

function restorePickup(id) {
  return PickupService().restore(id);
}

//=============================================================================
// Returns
//=============================================================================

function getReturns() {
  return ReturnService().findAll();
}

function getReturn(id) {
  return ReturnService().findById(id);
}

function createReturn(data) {
  return ReturnService().create(data);
}

function updateReturn(id, data) {
  return ReturnService().update(id, data);
}

function deleteReturn(id) {
  return ReturnService().remove(id);
}

function restoreReturn(id) {
  return ReturnService().restore(id);
}

//=============================================================================
// Purchasing
//=============================================================================

function getPurchasing() {
  return PurchasingService().findAll();
}

function getPurchasingById(id) {
  return PurchasingService().findById(id);
}

function createPurchasing(data) {
  return PurchasingService().create(data);
}

function updatePurchasing(id, data) {
  return PurchasingService().update(id, data);
}

function deletePurchasing(id) {
  return PurchasingService().remove(id);
}

function restorePurchasing(id) {
  return PurchasingService().restore(id);
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
