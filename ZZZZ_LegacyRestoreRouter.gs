/**
 * AETERLINK Documentation Module — ZZZZ_LegacyRestoreRouter.gs
 *
 * Final router shim:
 * - Default/legacy view uses the original V24 Index.html UI and injects
 *   A4_Legacy_Workflow_Restore.html after the legacy page content.
 * - Modular and smoke test URLs remain available for diagnostics.
 */
function doGet(e) {
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

  return renderLegacyRestoredWebApp_();
}

function renderLegacyRestoredWebApp_() {
  var base = HtmlService.createTemplateFromFile('Index').evaluate().getContent();
  var restore = HtmlService.createHtmlOutputFromFile('A4_Legacy_Workflow_Restore').getContent();
  var html = base;
  if (html.indexOf('</body>') >= 0) {
    html = html.replace('</body>', restore + '\n</body>');
  } else {
    html += restore;
  }
  return HtmlService
    .createHtmlOutput(html)
    .setTitle('AETERLINK Documentation Control')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
