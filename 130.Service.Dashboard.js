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

function DashboardService() {
  //===========================================================================
  // Services
  //===========================================================================

  const products = ProductService();

  const partners = PartnerService();

  const pickups = PickupService();

  const returns = ReturnService();

  const purchases = PurchasingService();

  const expenses = ExpenseService();

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
      products: productData.success ? productData.data.length : 0,

      partners: partnerData.success ? partnerData.data.length : 0,

      pickups: pickupData.success ? pickupData.data.length : 0,

      returns: returnData.success ? returnData.data.length : 0,

      purchasings: purchasingData.success ? purchasingData.data.length : 0,

      expenses: expenseData.success ? expenseData.data.length : 0,
    };
  }

  //===========================================================================
  // Statistics
  //===========================================================================

  function getStatistics() {
    const purchasingStats = purchases.statistics();

    const expenseStats = expenses.statistics();

    return {
      purchasing: purchasingStats.success ? purchasingStats.data : {},

      expense: expenseStats.success ? expenseStats.data : {},
    };
  }

  //===========================================================================
  // Recent Activities
  //===========================================================================

  function getRecentActivities(limit = 10) {
    const activities = [];

    function append(serviceResponse, moduleName) {
      if (!serviceResponse.success) {
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

      generatedAt: Utils.now(),
    });
  }

  //===========================================================================
  // Public API
  //===========================================================================

  return Object.freeze({
    getDashboard,
  });
}
