/**
 * AETERLINK Documentation Module — ZZZZ_Include_Project_Grid_Labels.gs
 * Safe include chain for production WebApp.
 * Heavy/recursive client-side patches are intentionally not included here.
 */

function include(fileName) {
  fileName = String(fileName || '').trim();
  if (!fileName) throw new Error('Missing include file name');
  var content = HtmlService.createHtmlOutputFromFile(fileName).getContent();

  if (fileName === 'A4_Layout') {
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Project_Grid_Labels').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Project_Context_Preserve').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Photo_Report_Last_Page').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Row_Controls_Restore').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Print_Pdf_Table_Parity_Final').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Disable_Recursive_Pagination').getContent(); } catch (err) {}
  }

  if (fileName === 'Client_App') {
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('UI_Japanese_Corporate').getContent(); } catch (err) {}
    // UI_Brand_Logo_Clean is disabled because its PNG base64 interval causes ERR_INVALID_URL and freezes in Apps Script iframe.
    // A4_Table_Event_Guard / UI_DataUrl_Image_Guard are disabled to avoid prototype monkey-patching on the whole WebApp.
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('UI_Official_Logo_Force').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Dashboard_Document_Control').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Dashboard_Project_Filter_Override').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Draft_Issue_Edit_UI').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Form_Record_Edit_Buttons_Force').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Form_Records_Loading_Stabilizer').getContent(); } catch (err) {}
    // A4_Row_Status_Final_Cleanup is disabled; print/status cleanup is handled by A4_Print_Pdf_Table_Parity_Final.
  }

  return content;
}
