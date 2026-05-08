"""
patch_v23.py — Apply V23 A4 overflow guard and live layout check to Index.html
Run by GitHub Actions deploy workflow.
"""
from pathlib import Path

V23_CSS = (
    "#a4preview .a4-page{position:relative!important;width:210mm!important;"
    "height:297mm!important;min-height:297mm!important;max-height:297mm!important;"
    "box-sizing:border-box!important;overflow:hidden!important;}\n"
    "#a4preview .a4-page table{width:100%!important;max-width:100%!important;"
    "table-layout:fixed!important;border-collapse:collapse!important;}\n"
    "#a4preview .a4-page th,#a4preview .a4-page td{box-sizing:border-box!important;"
    "white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;"
    "vertical-align:middle!important;line-height:1.14!important;padding:2.0mm 1.3mm!important;}\n"
    "#a4preview .a4-page tr{break-inside:avoid!important;page-break-inside:avoid!important;}\n"
    "#a4preview .a4-page .row-actions{display:flex!important;gap:2px!important;"
    "flex-wrap:nowrap!important;align-items:center!important;justify-content:center!important;}\n"
    "#a4preview .a4-page .row-actions button{width:14px!important;height:14px!important;"
    "min-width:14px!important;padding:0!important;font-size:8px!important;"
    "line-height:12px!important;border-radius:3px!important;}\n"
    "#a4preview .a4-page .v23-a4-fit-wrap{transform-origin:top left!important;}\n"
    '#a4preview .a4-page[data-v23-fit="scaled"]:after{content:"A4 auto-fit";'
    "position:absolute;right:6mm;bottom:3mm;font-size:6px;color:#9aa;display:none;}\n"
    "@media print{#a4preview .a4-page .row-actions,#a4preview .a4-page .photo-actions,"
    "#a4preview .a4-page th:last-child,#a4preview .a4-page td:last-child{display:none!important;}"
    "#a4preview .a4-page{overflow:hidden!important;break-after:page!important;"
    "page-break-after:always!important;}}\n"
)

V23_FUNCTIONS = """
/* V23_A4_OVERFLOW_GUARD: browser-accurate A4 fit and layout check. */
function v23InstallA4CssGuard(){
  if(document.getElementById('v23-a4-css-guard')) return;
  var st=document.createElement('style'); st.id='v23-a4-css-guard';
  st.textContent=""" + repr("\n" + V23_CSS) + """;
  document.head.appendChild(st);
}
function v23A4FitPage(page){
  if(!page || !page.clientHeight) return null;
  var footer=page.querySelector('.a4-footer,[class*="footer"]');
  var wrap=page.querySelector(':scope > .v23-a4-fit-wrap');
  if(!wrap){
    wrap=document.createElement('div'); wrap.className='v23-a4-fit-wrap';
    Array.from(page.childNodes).forEach(function(n){ if(n!==footer) wrap.appendChild(n); });
    page.insertBefore(wrap, footer || null);
  }
  wrap.style.transform='scale(1)'; wrap.style.width='100%';
  var reserve=(footer?footer.offsetHeight:10)+10;
  var target=Math.max(80,page.clientHeight-reserve);
  var actual=wrap.scrollHeight;
  var scale=actual>target?Math.max(0.82,Math.min(1,target/actual)):1;
  if(scale<1){wrap.style.transform='scale('+scale+')';wrap.style.width=(100/scale)+'%';page.dataset.v23Fit='scaled';}
  else page.dataset.v23Fit='ok';
  return {page:0,target:Math.round(target),actual:Math.round(actual),scale:Number(scale.toFixed(3)),status:actual>target?'AUTO-FIT':'OK'};
}
function v23A4LayoutGuard(){
  v23InstallA4CssGuard();
  setTimeout(function(){document.querySelectorAll('#a4preview .a4-page').forEach(v23A4FitPage);},80);
}
function v23A4LiveLayoutReport(){
  v23InstallA4CssGuard();
  var rows=[];
  document.querySelectorAll('#a4preview .a4-page').forEach(function(p,i){
    var r=v23A4FitPage(p)||{}; r.page=i+1; rows.push(r);
  });
  var bad=rows.filter(function(r){return r.status!=='OK';}).length;
  var html='<div class="hint" style="margin-bottom:10px"><b>Live A4 layout check:</b> '
    +(bad?'Auto-fit applied on '+bad+' page(s).':'All visible pages fit within A4 height.')
    +'<br><span style="color:#6b7f90">This check uses actual browser page height, not only row estimates.</span></div>';
  html+='<pre style="white-space:pre-wrap;background:#f7fbfd;border:1px solid #dbe9f0;border-radius:12px;padding:12px">'+esc(JSON.stringify(rows,null,2))+'</pre>';
  return html;
}
"""

def main():
    p = Path('Index.html')
    if not p.exists():
        print("SKIP: Index.html not found")
        return

    s = p.read_text(encoding='utf-8')
    changed = []

    # Inject V23 functions before boot()
    if 'V23_A4_OVERFLOW_GUARD' not in s:
        if '\nboot();' in s:
            s = s.replace('\nboot();', V23_FUNCTIONS + '\nboot();')
            changed.append('injected V23 functions before boot()')
        else:
            print("WARNING: boot() not found — V23 functions not injected")
    else:
        print("V23 functions already present, skipping injection")

    # Patch updateIssueBoxes catch block
    old_catch = 'updateIssueBoxes();\n  } catch(e)'
    new_catch = 'updateIssueBoxes();\n    v23A4LayoutGuard();\n  } catch(e)'
    if old_catch in s:
        s = s.replace(old_catch, new_catch)
        changed.append('patched updateIssueBoxes catch block')
    else:
        print("WARNING: updateIssueBoxes catch pattern not found — skipped")

    # Patch Layout/Pagination modal
    old_modal = "openModal('Layout / Pagination Check', '<pre"
    new_modal = "openModal('Layout / Pagination Check', v23A4LiveLayoutReport() + '<pre"
    if old_modal in s:
        s = s.replace(old_modal, new_modal)
        changed.append('patched Layout/Pagination modal')
    else:
        print("WARNING: Layout/Pagination Check modal pattern not found — skipped")

    p.write_text(s, encoding='utf-8', newline='\n')
    print(f"V23 patch complete: {', '.join(changed) if changed else 'nothing changed'}")

if __name__ == '__main__':
    main()
