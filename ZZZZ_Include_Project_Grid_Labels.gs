/**
 * AETERLINK Documentation Module — ZZZZ_Include_Project_Grid_Labels.gs
 * Clean production include chain.
 */

function include(fileName) {
  fileName = String(fileName || '').trim();
  if (!fileName) throw new Error('Missing include file name');

  if (fileName === 'A4_Overrides_Final') {
    return [
      '<!-- A4_Overrides_Final intercepted by clean production include -->',
      '<style id="a4-overrides-final-safe-inline-style">',
      '.a4-logo-img{width:41mm!important;max-width:41mm!important;height:auto!important;max-height:14mm!important;display:block!important;object-fit:contain!important}',
      '.a4-page .a4-section-title,.a4-print-area .a4-section-title{background:#113e63!important;background-color:#113e63!important;background-image:linear-gradient(#113e63,#113e63)!important;color:#fff!important;border:1px solid #113e63!important}',
      '.a4-scope-table{border-collapse:collapse!important;border-spacing:0!important;width:100%!important;max-width:100%!important;table-layout:fixed!important;outline:0!important;box-shadow:none!important}',
      '.a4-scope-table th,.a4-scope-table td{border:.18mm solid #666!important;box-shadow:none!important;background-clip:padding-box!important}',
      '.a4-status-select{width:100%;border:0;background:transparent;font:inherit;font-weight:900;color:#09243f;text-align:center;appearance:auto;padding:0;min-height:5mm}.a4-status-print{display:none;font-weight:900;color:#09243f}',
      '@media print{html,body{background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.a4-page .a4-section-title,.a4-print-area .a4-section-title{background:#113e63!important;background-color:#113e63!important;background-image:linear-gradient(#113e63,#113e63)!important;color:#fff!important;border-color:#113e63!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.a4-status-select{display:none!important}.a4-status-print{display:inline!important}}',
      '</style>',
      '<script id="a4-overrides-final-safe-inline-script">',
      '(function(){',
      'if(window.__AETERLINK_A4_OVERRIDES_FINAL_CLEAN_SAFE_V2__)return;window.__AETERLINK_A4_OVERRIDES_FINAL_CLEAN_SAFE_V2__=true;',
      'function logoSvg(){return "<svg class=\\\"a4-logo-img\\\" viewBox=\\\"0 0 1200 165\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\" preserveAspectRatio=\\\"xMidYMid meet\\\" aria-label=\\\"AETERLINK Logo\\\"><g fill=\\\"#0b86c6\\\"><path d=\\\"M25 135c52-32 78-68 88-134h42c-3 42-26 66-70 86-21 10-34 25-45 54-9 20-34 18-15-6z\\\"/><circle cx=\\\"190\\\" cy=\\\"123\\\" r=\\\"38\\\"/><text x=\\\"285\\\" y=\\\"122\\\" font-family=\\\"Arial,Helvetica,sans-serif\\\" font-weight=\\\"900\\\" font-size=\\\"112\\\" letter-spacing=\\\"18\\\">AETERLINK</text></g></svg>";}',
      'function patchLogo(){var rr=window.AETERLINK_A4_RENDERER;if(!rr||rr.__aeterlinkLogoCleanInterceptV2)return;rr.__aeterlinkLogoCleanInterceptV2=true;rr.logoSvg=logoSvg;}',
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
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Runtime_Clean_V3').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Add_Row_Pagination_Guard').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_EQC_Data_Layout_Final').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_EQC_Lotus_Project_Final').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Print_Logo_EQC_Final').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Logo_Display_Fix').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Photo_Actions_Restore').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_EQC_Print_Column_Width_Fix').getContent(); } catch (err) {}
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
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_EQC_Document_Option_Fix').getContent(); } catch (err) {}
  }

  return content;
}
