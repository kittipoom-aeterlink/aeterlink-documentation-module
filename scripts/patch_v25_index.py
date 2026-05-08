from pathlib import Path

p = Path('Index.html')
s = p.read_text(encoding='utf-8')

repls = {
    "var DOC_LIFECYCLE_LABELS_TH = {": "var DOC_LIFECYCLE_LABELS_EN = {",
    "All: 'เอกสารทั้งหมด'": "All: 'All documents'",
    "'01_INITIATION': '1. เริ่มโครงการ / รับมอบจากฝ่ายขาย'": "'01_INITIATION': '1. Project Start / Sales Handover'",
    "'02_PLANNING': '2. วางแผนโครงการ / ควบคุมโครงการ'": "'02_PLANNING': '2. Project Planning / Control'",
    "'03_DESIGN': '3. Design & Engineering / เอกสารขออนุมัติ'": "'03_DESIGN': '3. Design & Engineering / Approval Documents'",
    "'07_HANDOVER': '7. Handover / Closeout / ส่งมอบงาน'": "'07_HANDOVER': '7. Handover / Closeout'",
    "'08_WARRANTY': '8. Warranty / DLP / หลังส่งมอบ'": "'08_WARRANTY': '8. Warranty / DLP / Post-handover'",
    "return DOC_LIFECYCLE_LABELS_TH[key] || key || '';": "return DOC_LIFECYCLE_LABELS_EN[key] || key || '';",
    "ใช้สำหรับแยกเอกสารตามลำดับงานตั้งแต่เริ่มโครงการ → วางแผน → ออกแบบ → จัดซื้อ → ติดตั้ง → ทดสอบ → ส่งมอบ → Warranty/DLP": "Used to group documents by project lifecycle: initiation → planning → design → procurement → installation → testing → handover → Warranty/DLP",
    "Starting up...": "Starting up...",
}
for a, b in repls.items():
    s = s.replace(a, b)

# Remove any remaining Thai in known lifecycle labels if exact text differs.
s = s.replace('ส่งมอบงาน', 'Handover')
s = s.replace('หลังส่งมอบ', 'Post-handover')
s = s.replace('เอกสารขออนุมัติ', 'Approval Documents')
s = s.replace('เริ่มโครงการ', 'Project Start')
s = s.replace('รับมอบจากฝ่ายขาย', 'Sales Handover')
s = s.replace('วางแผน', 'planning')
s = s.replace('ออกแบบ', 'design')
s = s.replace('จัดซื้อ', 'procurement')
s = s.replace('ติดตั้ง', 'installation')
s = s.replace('ทดสอบ', 'testing')
s = s.replace('ส่งมอบ', 'handover')
s = s.replace('เอกสารทั้งหมด', 'All documents')

css = r'''

/* V25_A4_FINAL_GUARD: final A4 preview/print containment */
#a4preview .a4-page{
  width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;
  position:relative!important;box-sizing:border-box!important;overflow:hidden!important;
}
#a4preview .a4-page table{width:100%!important;max-width:100%!important;table-layout:fixed!important;border-collapse:collapse!important;}
#a4preview .a4-page th,#a4preview .a4-page td{
  white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;
  vertical-align:middle!important;line-height:1.08!important;padding:1.15mm .85mm!important;
}
#a4preview .a4-page tr{break-inside:avoid!important;page-break-inside:avoid!important;}
#a4preview .a4-footer,[class*="a4-footer"]{
  position:absolute!important;left:18mm!important;right:11mm!important;bottom:2.5mm!important;
  background:#fff!important;z-index:20!important;font-size:6px!important;line-height:1!important;text-align:center!important;
}
#a4preview .v25-fit-body{transform-origin:top left!important;}
@media print{
  #a4preview .a4-page{margin:0!important;box-shadow:none!important;border:0!important;overflow:hidden!important;page-break-after:always!important;break-after:page!important;}
  #a4preview .a4-page .row-actions,#a4preview .a4-page .photo-actions,#a4preview .a4-page th:last-child,#a4preview .a4-page td:last-child{display:none!important;}
}
'''
if 'V25_A4_FINAL_GUARD' not in s:
    s = s.replace('</style>', css + '\n</style>', 1)

js = r'''

/* V25 English UI + A4 fit runtime guard */
var V25_EN_MAP = {
  'เอกสารทั้งหมด':'All documents','เริ่มโครงการ':'Project Start','รับมอบจากฝ่ายขาย':'Sales Handover',
  'วางแผนโครงการ':'Project Planning','ควบคุมโครงการ':'Project Control','เอกสารขออนุมัติ':'Approval Documents',
  'ส่งมอบงาน':'Handover','หลังส่งมอบ':'Post-handover','วางแผน':'planning','ออกแบบ':'design',
  'จัดซื้อ':'procurement','ติดตั้ง':'installation','ทดสอบ':'testing','ส่งมอบ':'handover'
};
function v25ToEnglishText(t){ if(!t || !/[\u0E00-\u0E7F]/.test(t)) return t; var o=t; Object.keys(V25_EN_MAP).sort(function(a,b){return b.length-a.length;}).forEach(function(k){o=o.split(k).join(V25_EN_MAP[k]);}); return o; }
function v25EnglishUi(root){ root=root||document.body; if(!root) return; var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:function(n){var p=n.parentElement; return n.nodeValue&&/[\u0E00-\u0E7F]/.test(n.nodeValue)&&p&&!/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/i.test(p.tagName)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}}); var arr=[]; while(w.nextNode()) arr.push(w.currentNode); arr.forEach(function(n){n.nodeValue=v25ToEnglishText(n.nodeValue);}); }
function v25FitA4Pages(){
  document.querySelectorAll('#a4preview .a4-page').forEach(function(page){
    var footer=page.querySelector('.a4-footer,[class*="a4-footer"],[class*="footer"]');
    var body=page.querySelector(':scope > .v25-fit-body');
    if(!body){ body=document.createElement('div'); body.className='v25-fit-body'; Array.from(page.childNodes).forEach(function(n){ if(n!==footer && !(n.classList&&n.classList.contains('v24-layout-warning'))) body.appendChild(n); }); page.insertBefore(body, footer||null); }
    body.style.transform='scale(1)'; body.style.width='100%';
    var reserve=(footer?footer.offsetHeight:8)+10;
    var limit=Math.max(80,page.clientHeight-reserve);
    var actual=body.scrollHeight;
    if(actual>limit){ var sc=Math.max(0.78,Math.min(1,limit/actual)); body.style.transform='scale('+sc+')'; body.style.width=(100/sc)+'%'; page.dataset.a4fit='scaled'; } else page.dataset.a4fit='ok';
  });
}
function v25AfterRender(){ v25EnglishUi(document.body); setTimeout(v25FitA4Pages,80); }
setTimeout(function(){ v25AfterRender(); new MutationObserver(function(ms){ms.forEach(function(m){m.addedNodes&&m.addedNodes.forEach(function(n){ if(n.nodeType===1)v25EnglishUi(n); else if(n.nodeType===3)n.nodeValue=v25ToEnglishText(n.nodeValue); });});}); }).observe(document.body,{childList:true,subtree:true}); },0);
'''
if 'V25 English UI + A4 fit runtime guard' not in s:
    s = s.replace('\nboot();', js + '\nboot();')

# Ensure preview render and print run the final guard after existing logic.
s = s.replace('v24A4LayoutGuard(true);', 'v24A4LayoutGuard(true);\n    v25AfterRender();')
s = s.replace('setTimeout(function(){ window.print(); }, 80);', 'v25AfterRender();\n  setTimeout(function(){ window.print(); }, 160);')

p.write_text(s, encoding='utf-8', newline='\n')
print('V25 Index patch applied. Remaining Thai chars:', sum(1 for ch in s if '\u0E00' <= ch <= '\u0E7F'))
