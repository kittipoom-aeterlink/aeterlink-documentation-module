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
      '.a4-page .a4-section-title,.a4-print-area .a4-section-title{background:#113e63!important;background-color:#113e63!important;color:#fff!important;border:1px solid #113e63!important}',
      '.a4-scope-table{border-collapse:collapse!important;border-spacing:0!important;width:100%!important;max-width:100%!important;table-layout:fixed!important;outline:0!important;box-shadow:none!important}',
      '.a4-scope-table th,.a4-scope-table td{border:.18mm solid #666!important;box-shadow:none!important;background-clip:padding-box!important}',
      '.a4-status-select{width:100%;border:0;background:transparent;font:inherit;font-weight:900;color:#09243f;text-align:center;appearance:auto;padding:0;min-height:5mm}.a4-status-print{display:none;font-weight:900;color:#09243f}',
      '@media print{html,body{background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.a4-status-select{display:none!important}.a4-status-print{display:inline!important}}',
      '</style>'
    ].join('\n');
  }

  var content = HtmlService.createHtmlOutputFromFile(fileName).getContent();

  if (fileName === 'A4_Layout') {
    [
      'A4_Project_Grid_Labels',
      'A4_Project_Context_Preserve',
      'A4_Photo_Report_Last_Page',
      'A4_Runtime_Clean_V3',
      'A4_Add_Row_Pagination_Guard',
      'A4_EQC_Data_Layout_Final',
      'A4_EQC_Lotus_Project_Final',
      'A4_Print_Logo_EQC_Final',
      'A4_Logo_Display_Fix',
      'A4_Photo_Actions_Restore',
      'A4_EQC_Print_Column_Width_Fix',
      'A4_EQC_Header_Edit_Font_Fix',
      'A4_EQC_Row_Delete_Restore',
      'A4_EQC_Edit_Load_Render_Fix',
      'A4_Save_Issue_NoStack_Client_Fix',
      'A4_WCR_Add_Row_Remarks_Fix',
      'A4_WCR_Lotus_Rows_Restore',
      'A4_WCR_Add_Row_Final_Guard'
    ].forEach(function (name) {
      try { content += '\n' + HtmlService.createHtmlOutputFromFile(name).getContent(); } catch (err) {}
    });
  }

  if (fileName === 'Client_App') {
    [
      'UI_Japanese_Corporate',
      'UI_Official_Logo_Force',
      'Dashboard_Document_Control',
      'Dashboard_Project_Filter_Override',
      'A4_Draft_Issue_Edit_UI',
      'Form_Record_Edit_Buttons_Force',
      'Form_Records_Loading_Stabilizer',
      'A4_Document_List_All_Restore',
      'A4_EQC_Document_Option_Fix'
    ].forEach(function (name) {
      try { content += '\n' + HtmlService.createHtmlOutputFromFile(name).getContent(); } catch (err) {}
    });
  }

  return content;
}
