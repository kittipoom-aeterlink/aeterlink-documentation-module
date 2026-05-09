/**
 * AETERLINK Documentation Module — ZZZZ_Include_Project_Grid_Labels.gs
 * Adds the A4 project-grid label override to the modular page without changing deploy.yml.
 */

function include(fileName) {
  fileName = String(fileName || '').trim();
  if (!fileName) throw new Error('Missing include file name');
  var content = HtmlService.createHtmlOutputFromFile(fileName).getContent();
  if (fileName === 'A4_Layout') {
    try {
      content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Project_Grid_Labels').getContent();
    } catch (err) {}
  }
  return content;
}
