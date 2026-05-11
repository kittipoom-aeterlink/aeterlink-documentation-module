/**
 * AETERLINK Documentation Module — ZZZ_WebAppRouter.gs
 *
 * Single production router. Routes:
 *   default          → Index_Modular_Full  (production UI)
 *   ?view=legacy     → Index + A4_Legacy_Workflow_Restore injected
 *   ?view=smoke      → Index_Modular (smoke test)
 *
 * ZZZZ_LegacyRestoreRouter.gs has been merged into this file and deleted.
 */

function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var view = String(params.view || params.modular || '').trim().toLowerCase();

  if (view === 'legacy' || view === '0') {
    return renderLegacyRestoredWebApp_();
  }

  if (view === 'smoke' || view === 'test') {
    return HtmlService
      .createTemplateFromFile('Index_Modular')
      .evaluate()
      .setTitle('AETERLINK Documentation Control — Smoke Test')
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
  var restore = '';
  try { restore = HtmlService.createHtmlOutputFromFile('A4_Legacy_Workflow_Restore').getContent(); } catch (err) {}
  var html = restore ? base.replace('</body>', restore + '\n</body>') : base;
  if (restore && html === base) html += restore;
  return HtmlService
    .createHtmlOutput(html)
    .setTitle('AETERLINK Documentation Control — Legacy')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
