/**
 * AETERLINK Documentation Module — ZZZZ_LegacyRestoreRouter.gs
 *
 * Production router:
 * - Default WebApp URL now serves Index_Modular_Full as the real production UI.
 * - Production UI combines modular modules with the legacy Document Issue Control workflow.
 * - Work Completion Report A4 master layout is used by all document types.
 * - Legacy page remains available via ?view=legacy for rollback/reference.
 */
function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var view = String(params.view || params.modular || '').trim().toLowerCase();

  if (view === 'legacy' || view === '0' || view === 'false') {
    return renderLegacyRestoredWebApp_();
  }

  if (view === 'smoke' || view === 'test') {
    return HtmlService
      .createTemplateFromFile('Index_Modular')
      .evaluate()
      .setTitle('AETERLINK Documentation Control — Modular Smoke Test')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService
    .createTemplateFromFile('Index_Modular_Full')
    .evaluate()
    .setTitle('AETERLINK Documentation Control — Production')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
    .setTitle('AETERLINK Documentation Control — Legacy')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
