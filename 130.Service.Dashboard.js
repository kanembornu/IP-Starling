/**
 * =============================================================================
 * FILE        : 130.Service.Dashboard.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : Dashboard Service
 * =============================================================================
 *
 * Dashboard bukan CRUD Service.
 *
 * Dashboard bertugas mengorkestrasi seluruh Business Service
 * menjadi satu payload yang siap digunakan Frontend.
 *
 * Dashboard TIDAK BOLEH:
 * - mengakses Spreadsheet
 * - mengakses Repository
 * - menghitung data dari sheet
 *
 * Dashboard HANYA menggunakan Business Service.
 *
 * =============================================================================
 */

function DashboardService(dependencies = {}) {
  //===========================================================================
  // Services
  //===========================================================================

  const products = dependencies.products || ProductService();

  const partners = dependencies.partners || PartnerService();

  const pickups = dependencies.pickups || PickupService();

  const returns = dependencies.returns || ReturnService();

  const purchases = dependencies.purchases || PurchasingService();

  const expenses = dependencies.expenses || ExpenseService();

  const now = typeof dependencies.now === "function"
    ? dependencies.now
    : Utils.now;

  function responseRows(response) {
    return response && response.success && Array.isArray(response.data)
      ? response.data
      : [];
  }

  function safeCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  }

  function normalizeStatistics(response) {
    const data = response && response.success && response.data
      ? response.data
      : {};

    return {
      total: safeCount(data.total),
      active: safeCount(data.active),
      inactive: safeCount(data.inactive),
    };
  }

  //===========================================================================
  // Summary
  //===========================================================================

  function getSummary() {
    const productData = products.findAll();

    const partnerData = partners.findAll();

    const pickupData = pickups.findAll();

    const returnData = returns.findAll();

    const purchasingData = purchases.findAll();

    const expenseData = expenses.findAll();

    return {
      products: responseRows(productData).length,

      partners: responseRows(partnerData).length,

      pickups: responseRows(pickupData).length,

      returns: responseRows(returnData).length,

      purchasings: responseRows(purchasingData).length,

      expenses: responseRows(expenseData).length,
    };
  }

  //===========================================================================
  // Statistics
  //===========================================================================

  function getStatistics() {
    const purchasingStats = purchases.statistics();

    const expenseStats = expenses.statistics();

    return {
      purchasing: normalizeStatistics(purchasingStats),

      expense: normalizeStatistics(expenseStats),
    };
  }

  //===========================================================================
  // Recent Activities
  //===========================================================================

  function getRecentActivities(limit = 10) {
    const activities = [];

    function append(serviceResponse, moduleName) {
      if (!serviceResponse || !serviceResponse.success || !Array.isArray(serviceResponse.data)) {
        return;
      }

      serviceResponse.data.forEach((item) => {
        activities.push({
          module: moduleName,

          id: item.ID,

          createdAt: item.CreatedAt || "",

          updatedAt: item.UpdatedAt || "",
        });
      });
    }

    append(products.findAll(), "Product");

    append(partners.findAll(), "Partner");

    append(pickups.findAll(), "Pickup");

    append(returns.findAll(), "Return");

    append(purchases.findAll(), "Purchasing");

    append(expenses.findAll(), "Expense");

    activities.sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });

    return activities.slice(0, limit);
  }

  //===========================================================================
  // Dashboard Payload
  //===========================================================================

  function getDashboard() {
    return Response.success({
      summary: getSummary(),

      statistics: getStatistics(),

      recentActivities: getRecentActivities(),

      generatedAt: now(),
    });
  }

  //===========================================================================
  // Public API
  //===========================================================================

  return Object.freeze({
    getDashboard,
  });
}
