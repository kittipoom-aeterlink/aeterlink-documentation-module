/**
 * ============================================================
 * AETERLINK Documentation Module — ZZZ_WebAppRouter.gs
 * Final WebApp router override.
 *
 * Purpose:
 * - Ensure query routing works even if legacy Code.gs contains an older doGet().
 * - Keep production default safe: legacy remains default.
 * - Open modular full page only by query: ?view=modular or ?modular=1
 * - Open smoke test by query: ?view=smoke
 * ============================================================
 */

function doGet(e) {
  if (typeof AETERLINK_API !== 'undefined' && AETERLINK_API && AETERLINK_API.routeWebApp) {
    return AETERLINK_API.routeWebApp(e);
  }

  var params = (e && e.parameter) ? e.parameter : {};
  var view = String(params.view || params.modular || '').trim().toLowerCase();

  if (view === 'modular' || view === '1' || view === 'true' || view === 'full') {
    return HtmlService
      .createTemplateFromFile('Index_Modular_Full')
      .evaluate()
      .setTitle('AETERLINK Documentation Control — Modular Full')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (view === 'smoke' || view === 'test') {
    return HtmlService
      .createTemplateFromFile('Index_Modular')
      .evaluate()
      .setTitle('AETERLINK Documentation Control — Modular Smoke Test')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('AETERLINK Documentation Control')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
