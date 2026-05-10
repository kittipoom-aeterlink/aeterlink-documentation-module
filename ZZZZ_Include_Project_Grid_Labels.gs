/**
 * AETERLINK Documentation Module — ZZZZ_Include_Project_Grid_Labels.gs
 * Adds late A4 production patches, Japanese corporate UI, logo, dashboard, permanent A4 row controls, and draft/issue edit behavior without changing deploy.yml.
 */

function include(fileName) {
  fileName = String(fileName || '').trim();
  if (!fileName) throw new Error('Missing include file name');
  var content = HtmlService.createHtmlOutputFromFile(fileName).getContent();
  if (fileName === 'A4_Layout') {
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Project_Grid_Labels').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Photo_Report_Last_Page').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Row_Controls_Restore').getContent(); } catch (err) {}
  }
  if (fileName === 'Client_App') {
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('UI_Japanese_Corporate').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('UI_Brand_Logo_Clean').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('UI_Official_Logo_Force').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Dashboard_Document_Control').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Dashboard_Project_Filter_Override').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Draft_Issue_Edit_UI').getContent(); } catch (err) {}
  }
  return content;
}
