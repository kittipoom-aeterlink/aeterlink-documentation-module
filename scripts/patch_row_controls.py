"""Patch A4 row controls: delete every row and keep one Add Row button."""
from pathlib import Path
import re


def replace_block(text, start_pattern, end_marker, replacement, label):
    match = re.search(start_pattern + r"[\s\S]*?\n" + re.escape(end_marker), text)
    if not match:
        print(f"SKIP: {label} block not found")
        return text, False
    return text[: match.start()] + replacement + "\n" + end_marker + text[match.end() :], True


def patch_fast_final():
    path = Path("A4_Runtime_Fast_Final.html")
    text = path.read_text(encoding="utf-8")
    replacement = """  function ensureDeleteButtons(t){if(!t||!t.tBodies||!t.tBodies[0])return;Array.prototype.slice.call(t.tBodies[0].rows).forEach(function(tr){var td=tr.cells&&tr.cells[0];if(!td)return;td.style.position='relative';td.style.overflow='visible';td.querySelectorAll('.a4-fast-delete-row-btn,.a4-row-paged-delete,.a4-row-clean-delete,.a4-draft-delete-row-btn,.a4-row-delete-btn').forEach(function(b,i){if(i>0||!b.classList.contains('a4-fast-delete-row-btn'))b.remove();});if(!td.querySelector('.a4-fast-delete-row-btn'))td.insertAdjacentHTML('afterbegin','<button type="button" class="a4-fast-delete-row-btn a4-no-print" title="Delete this row" aria-label="Delete this row">&times;</button>');});}
  function decorate(base){base=base||root();base.querySelectorAll('.a4-title,.a4-subtitle,.a4-section-title').forEach(function(n){n.setAttribute('contenteditable','true');n.setAttribute('spellcheck','false');});base.querySelectorAll('.a4-page .a4-content table').forEach(function(t){if(!isDocTable(t))return;t.classList.add('a4-scope-table');ensureDeleteButtons(t);if(!t.classList.contains('a4-equipment-checklist-table')){var next=t.nextElementSibling;if(!(next&&next.classList&&next.classList.contains('a4-row-control-bar'))){var bar=document.createElement('div');bar.className='a4-row-control-bar a4-no-print';bar.innerHTML='<button type="button" class="a4-fast-add-row-btn">+ Add Row</button>';t.parentNode.insertBefore(bar,t.nextSibling);}}});applyEqWidths(base);updateFooters(base);}"""
    text, changed = replace_block(
        text,
        r"  function decorate\(base\)\{",
        "  function updateFooters(base){",
        replacement,
        "A4 runtime decorate",
    )
    path.write_text(text, encoding="utf-8", newline="\n")
    print("A4_Runtime_Fast_Final row-control patch:", "updated" if changed else "nothing changed")


def patch_dedupe_fix():
    path = Path("A4_Runtime_Fast_Dedupe_Fix.html")
    text = path.read_text(encoding="utf-8")
    replacement = """  function ensureDeleteButtons(t){
    if(!t||!t.tBodies||!t.tBodies[0]) return;
    Array.prototype.slice.call(t.tBodies[0].rows).forEach(function(tr){
      var td=tr.cells&&tr.cells[0]; if(!td) return;
      td.style.position='relative'; td.style.overflow='visible';
      td.querySelectorAll('.a4-fast-delete-row-btn,.a4-row-paged-delete,.a4-row-clean-delete,.a4-draft-delete-row-btn,.a4-row-delete-btn').forEach(function(btn,i){
        if(i>0||!btn.classList.contains('a4-fast-delete-row-btn')) btn.remove();
      });
      if(!td.querySelector('.a4-fast-delete-row-btn')){
        td.insertAdjacentHTML('afterbegin','<button type="button" class="a4-fast-delete-row-btn a4-no-print" title="Delete this row" aria-label="Delete this row">&times;</button>');
      }
    });
  }
  function normalizeBars(base){
    base=base||root();
    base.querySelectorAll('.a4-row-control-bar').forEach(function(bar){bar.remove();});
    var tables=Array.prototype.slice.call(base.querySelectorAll('.a4-page .a4-content table')).filter(isDocTable);
    tables.forEach(function(t){
      t.classList.add('a4-scope-table');
      applyWidths(t);
      ensureDeleteButtons(t);
    });
    var target=tables[tables.length-1];
    if(target){
      var bar=document.createElement('div');
      bar.className='a4-row-control-bar a4-no-print';
      var cls=target.classList.contains('a4-equipment-checklist-table')?'a4-eqc-fast-add-row-btn':'a4-fast-add-row-btn';
      bar.innerHTML='<button type="button" class="'+cls+'">+ Add Row</button>';
      target.parentNode.insertBefore(bar,target.nextSibling);
    }
  }"""
    text, changed = replace_block(
        text,
        r"  function normalizeBars\(base\)\{",
        "  function removeDeleteLast(base){",
        replacement,
        "A4 runtime dedupe",
    )
    path.write_text(text, encoding="utf-8", newline="\n")
    print("A4_Runtime_Fast_Dedupe_Fix row-control patch:", "updated" if changed else "nothing changed")


def main():
    patch_fast_final()
    patch_dedupe_fix()


if __name__ == "__main__":
    main()
