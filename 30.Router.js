/**
 * =============================================================================
 * FILE        : 30.Router.gs
 * VERSION     : 1.0.0
 * DESCRIPTION : HTML Router
 * =============================================================================
 *
 * Router bertugas merender HTML.
 * Router TIDAK BOLEH mengakses Repository maupun Service.
 *
 * =============================================================================
 */

const Router = (() => {
  /**
   * --------------------------------------------------------------------------
   * Include HTML Partial
   * --------------------------------------------------------------------------
   */
  function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  }

  /**
   * --------------------------------------------------------------------------
   * Browser Title
   * --------------------------------------------------------------------------
   */
  function pageTitle(title = "") {
    if (!title) {
      return APP_CONFIG.NAME;
    }

    return `${APP_CONFIG.NAME} | ${title}`;
  }

  /**
   * --------------------------------------------------------------------------
   * Render HTML View
   * --------------------------------------------------------------------------
   */
  function render(viewName, data = {}) {
    const template = HtmlService.createTemplateFromFile(viewName);

    Object.keys(data).forEach((key) => {
      template[key] = data[key];
    });

    return template
      .evaluate()
      .setTitle(pageTitle(data.title))
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  /**
   * --------------------------------------------------------------------------
   * 404 Page
   * --------------------------------------------------------------------------
   */
  function notFound() {
    return HtmlService.createHtmlOutput("<h2>404 - Page Not Found</h2>");
  }

  /**
   * --------------------------------------------------------------------------
   * Error Page
   * --------------------------------------------------------------------------
   */
  function error(message) {
    return HtmlService.createHtmlOutput(`<h3>${message}</h3>`);
  }

  /**
   * --------------------------------------------------------------------------
   * Public API
   * --------------------------------------------------------------------------
   */
  return Object.freeze({
    include,

    pageTitle,

    render,

    notFound,

    error,
  });
})();
