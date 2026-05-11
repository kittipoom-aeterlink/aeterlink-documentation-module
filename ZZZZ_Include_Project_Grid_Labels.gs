/**
 * AETERLINK Documentation Module — ZZZZ_Include_Project_Grid_Labels.gs
 * Safe production include chain.
 *
 * IMPORTANT:
 * - UI_Brand_Logo_Clean is not loaded because it injects PNG base64 repeatedly.
 * - Legacy A4_Overrides_Final is intercepted because it overrides addRow() and calls recursive pagination.
 * - Final Add Row behavior is enforced by A4_Add_Row_Freeze_Final_Guard, loaded last.
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
      'if(window.__AETERLINK_A4_OVERRIDES_FINAL_INTERCEPT_SAFE_V15__)return;window.__AETERLINK_A4_OVERRIDES_FINAL_INTERCEPT_SAFE_V15__=true;',
      'function esc(v){return String(v==null?"":v).replace(/[&<>\\"\']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;","\'":"&#39;"}[c];});}',
      'function statusCell(value){var opts=["","-","Not Started","In Progress","Pending","Done","Issue","N/A","Open","Closed","Approved","Submitted"];var v=(value==null?"Pending":String(value).trim())||"Pending";var html="<select class=\\\"a4-status-select\\\" contenteditable=\\\"false\\\">";opts.forEach(function(o){html+="<option value=\\\""+esc(o)+"\\\""+(o===v?" selected":"")+">"+(o?esc(o):"-")+"</option>";});return html+"</select><span class=\\\"a4-status-print\\\">"+esc(v)+"</span>";}',
      'function logoSvg(){return "<svg class=\\\"a4-logo-img\\\" viewBox=\\\"0 0 1200 165\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\" preserveAspectRatio=\\\"xMidYMid meet\\\" aria-label=\\\"AETERLINK Logo\\\"><g fill=\\\"#0b86c6\\\"><path d=\\\"M25 135c52-32 78-68 88-134h42c-3 42-26 66-70 86-21 10-34 25-45 54-9 20-34 18-15-6z\\\"/><circle cx=\\\"190\\\" cy=\\\"123\\\" r=\\\"38\\\"/><text x=\\\"285\\\" y=\\\"122\\\" font-family=\\\"Arial,Helvetica,sans-serif\\\" font-weight=\\\"900\\\" font-size=\\\"112\\\" letter-spacing=\\\"18\\\">AETERLINK</text></g></svg>";}',
      'function patch(){var rr=window.AETERLINK_A4_RENDERER;if(!rr||rr.__aeterlinkFinalInterceptSafeApplied)return;rr.__aeterlinkFinalInterceptSafeApplied=true;rr.logoSvg=logoSvg;rr.table=function(columns,rows,className){columns=(columns||[]).filter(function(c){return c.key!=="Action";});rows=rows||[];var html="<table class=\\\""+esc(className||"a4-scope-table")+"\\\"><thead><tr>"+columns.map(function(col){return "<th style=\\\"width:"+esc(col.width||"auto")+";\\\">"+esc(col.label||col.key||"")+"</th>";}).join("")+"</tr></thead><tbody>"+rows.map(function(row){return "<tr>"+columns.map(function(col){var val=row[col.key]||"";if(col.key==="Status")return "<td>"+statusCell(val)+"</td>";return "<td class=\\\"a4-editable\\\" contenteditable=\\\"true\\\" spellcheck=\\\"false\\\">"+esc(val)+"</td>";}).join("")+"</tr>";}).join("")+"</tbody></table>";return html+"<div class=\\\"a4-row-control-bar a4-no-print\\\"><button type=\\\"button\\\" class=\\\"a4-add-row-btn\\\">+ Add Row</button></div>";};}',
      'document.addEventListener("DOMContentLoaded",function(){setTimeout(patch,0);setTimeout(patch,300);});window.addEventListener("load",function(){setTimeout(patch,0);});setTimeout(patch,250);',
      '})();',
      '</script>'
    ].join('\n');
  }

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
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('UI_Official_Logo_Force').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Dashboard_Document_Control').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Dashboard_Project_Filter_Override').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Draft_Issue_Edit_UI').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Form_Record_Edit_Buttons_Force').getContent(); } catch (err) {}
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('Form_Records_Loading_Stabilizer').getContent(); } catch (err) {}
    // Must be last: it captures Add/Delete/Edit before legacy row handlers can trigger preview refresh or pagination.
    try { content += '\n' + HtmlService.createHtmlOutputFromFile('A4_Add_Row_Freeze_Final_Guard').getContent(); } catch (err) {}
  }

  return content;
}
