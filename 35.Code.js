/**
 * =============================================================================
 * FILE        : 35.Code.gs
 * VERSION     : 1.0.0-rc.1
 * DESCRIPTION : Application Bootstrap (SPA)
 * =============================================================================
 */

function doGet(e) {
  try {
    const page = resolvePage(e);

    const template = HtmlService.createTemplateFromFile("900.View.Index");

    template.title = APP_CONFIG.NAME;

    template.appName = APP_CONFIG.NAME;

    template.appVersion = APP_CONFIG.VERSION;

    template.appBuild = APP_CONFIG.BUILD;

    template.page = page;

    return template

      .evaluate()

      .setTitle(APP_CONFIG.NAME)

      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput(
      "<pre>" + String(err.stack || err) + "</pre>",
    );
  }
}

/**
 * -----------------------------------------------------------------------------
 * Resolve Initial SPA Page
 * -----------------------------------------------------------------------------
 */
function resolvePage(e) {
  if (!e || !e.parameter) {
    return "dashboard";
  }

  const page = String(e.parameter.page || "dashboard").toLowerCase();

  switch (page) {
    case "dashboard":

    case "products":

    case "partners":

    case "pickups":

    case "returns":

    case "purchasing":

    case "expenses":

    case "settings":

    case "logs":
      return page;

    default:
      return "dashboard";
  }
}
