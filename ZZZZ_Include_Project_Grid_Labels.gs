/**
 * AETERLINK Documentation Module — ZZZZ_Include_Project_Grid_Labels.gs
 * Adds late production patches without changing deploy.yml.
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
  }
  if (fileName === 'Client_App') {
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('UI_Japanese_Corporate').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('UI_Brand_Logo_Clean').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('UI_Official_Logo_Force').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Dashboard_Document_Control').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Dashboard_Project_Filter_Override').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Draft_Issue_Edit_UI').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Form_Record_Edit_Buttons_Force').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Form_Records_Loading_Stabilizer').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Row_Status_Final_Cleanup').getContent(); } catch (err) {}
    // Final table edit hotfix: loaded after normal A4 patches and before DOMContentLoaded.
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Table_Edit_Hotfix').getContent(); } catch (err) {}
  }
  return content;
}
