/**
 * AETERLINK Documentation Module — ZZZZ_Include_Project_Grid_Labels.gs
 * Safe production include chain.
 *
 * IMPORTANT:
 * - UI_Brand_Logo_Clean is not loaded because it injects PNG base64 repeatedly.
 * - Legacy A4_Overrides_Final is intercepted because it overrides addRow() and calls recursive pagination.
 * - A4 row editing/pagination is handled by A4_Row_Pagination_Final.
 * - Loaded Draft/Edit delete buttons are repaired by A4_Delete_Row_Draft_Fix loaded after pagination.
 * - Full document type dropdown is restored by A4_Document_List_All_Restore.
 * - Equipment Checklist final columns and single-code cleanup are handled by A4_Equipment_Checklist_Final.
 * - Equipment Checklist render path is locked by A4_Equipment_Checklist_Render_Lock to prevent generic renderer fallback.
 * - All A4 documents get WCR-style header/logo and Add Row bar by A4_All_Documents_Add_Row_Logo_Final.
 * - A4 header right boundary is fixed by A4_Header_Bounds_Final.
 * - Final UX corrections are loaded last by A4_Final_UX_Corrections.
 * - Do not load A4_Add_Row_Freeze_Final_Guard or any additional Add Row guard.
 */

function include(fileName) {
  fileName = String(fileName || '').trim();
  if (!fileName) throw new Error('Missing include file name');

  if (fileName === 'A4_Overrides_Final') {
    return [
      '<!-- A4_Overrides_Final intercepted by safe production include -->',
      '<style id="a4-overrides-final-safe-inline-style">',
      '.a4-logo-img{width:41mm!important;max-width:41mm!important;height:auto!important;max-height:14mm!important;display:block!important;object-fit:contain!important}',
      '.a4-page .a4-section-title,.a4-print-area .a4-section-title{background:#113e63!important;background-color:#113e63!important;background-image:linear-gradient(#113e63,#113e63)!important;color:#fff!important;border:1px solid #113e63!important}',
      '.a4-scope-table{border-collapse:separate!important;border-spacing:0!important;border:0!important;width:100%!important;max-width:100%!important;table-layout:fixed!important;outline:0!important;box-shadow:none!important}',
      '.a4-scope-table th,.a4-scope-table td{border:0!important;border-right:.18mm solid #666!important;border-bottom:.18mm solid #666!important;box-shadow:none!important;background-clip:padding-box!important}',
      '.a4-scope-table thead tr:first-child>*{border-top:.18mm solid #666!important}.a4-scope-table tr>*:first-child{border-left:.18mm solid #666!important}.a4-scope-table tr>*:last-child{border-right:.18mm solid #666!important}.a4-scope-table tbody tr:last-child>*{border-bottom:.18mm solid #666!important}',
      '.a4-status-select{width:100%;border:0;background:transparent;font:inherit;font-weight:900;color:#09243f;text-align:center;appearance:auto;padding:0;min-height:5mm}.a4-status-print{display:none;font-weight:900;color:#09243f}',
      '@media print{html,body{background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.a4-page .a4-section-title,.a4-print-area .a4-section-title{background:#113e63!important;background-color:#113e63!important;background-image:linear-gradient(#113e63,#113e63)!important;color:#fff!important;border-color:#113e63!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.a4-status-select{display:none!important}.a4-status-print{display:inline!important}}',
      '</style>',
      '<script id="a4-overrides-final-safe-inline-script">',
      '(function(){',
      'if(window.__AETERLINK_A4_OVERRIDES_FINAL_INTERCEPT_SAFE_V16__)return;window.__AETERLINK_A4_OVERRIDES_FINAL_INTERCEPT_SAFE_V16__=true;',
      'function logoSvg(){return "<svg class=\\\"a4-logo-img\\\" viewBox=\\\"0 0 1200 165\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\" preserveAspectRatio=\\\"xMidYMid meet\\\" aria-label=\\\"AETERLINK Logo\\\"><g fill=\\\"#0b86c6\\\"><path d=\\\"M25 135c52-32 78-68 88-134h42c-3 42-26 66-70 86-21 10-34 25-45 54-9 20-34 18-15-6z\\\"/><circle cx=\\\"190\\\" cy=\\\"123\\\" r=\\\"38\\\"/><text x=\\\"285\\\" y=\\\"122\\\" font-family=\\\"Arial,Helvetica,sans-serif\\\" font-weight=\\\"900\\\" font-size=\\\"112\\\" letter-spacing=\\\"18\\\">AETERLINK</text></g></svg>";}',
      'function patchLogo(){var rr=window.AETERLINK_A4_RENDERER;if(!rr||rr.__aeterlinkLogoOnlyInterceptV16)return;rr.__aeterlinkLogoOnlyInterceptV16=true;rr.logoSvg=logoSvg;}',
      'document.addEventListener("DOMContentLoaded",function(){setTimeout(patchLogo,0);setTimeout(patchLogo,300);});window.addEventListener("load",function(){setTimeout(patchLogo,0);});setTimeout(patchLogo,250);',
      '})();',
      '</script>'
    ].join('\n');
  }

  var content = HtmlService.createHtmlOutputFromFile(fileName).getContent();

  if (fileName === 'A4_Layout') {
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Project_Grid_Labels').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Project_Context_Preserve').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Photo_Report_Last_Page').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Row_Pagination_Final').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Delete_Row_Draft_Fix').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Equipment_Checklist_Final').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Equipment_Checklist_Render_Lock').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_All_Documents_Add_Row_Logo_Final').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Header_Bounds_Final').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Final_UX_Corrections').getContent(); } catch (err) {}
  }

  if (fileName === 'Client_App') {
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('UI_Japanese_Corporate').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('UI_Official_Logo_Force').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Dashboard_Document_Control').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Dashboard_Project_Filter_Override').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Draft_Issue_Edit_UI').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Form_Record_Edit_Buttons_Force').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Form_Records_Loading_Stabilizer').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Document_List_All_Restore').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Equipment_Checklist_Final').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Equipment_Checklist_Render_Lock').getContent(); } catch (err) {}
  }

  return content;
}
