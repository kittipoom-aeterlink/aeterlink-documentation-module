"""Repair V25 generated Index.html after patch_v25_index.py runs."""
from pathlib import Path
import re


BAD_OBSERVER = (
    "setTimeout(function(){ v25AfterRender(); new MutationObserver(function(ms){ms.forEach(function(m){"
    "m.addedNodes&&m.addedNodes.forEach(function(n){ if(n.nodeType===1)v25EnglishUi(n); "
    "else if(n.nodeType===3)n.nodeValue=v25ToEnglishText(n.nodeValue); });});}); }).observe"
    "(document.body,{childList:true,subtree:true}); },0);"
)

GOOD_OBSERVER = (
    "setTimeout(function(){ v25AfterRender(); new MutationObserver(function(ms){ms.forEach(function(m){"
    "m.addedNodes&&m.addedNodes.forEach(function(n){ if(n.nodeType===1)v25EnglishUi(n); "
    "else if(n.nodeType===3)n.nodeValue=v25ToEnglishText(n.nodeValue); });});}).observe"
    "(document.body,{childList:true,subtree:true}); },0);"
)


def main():
    path = Path("Index.html")
    text = path.read_text(encoding="utf-8")
    changed = []

    if BAD_OBSERVER in text:
        text = text.replace(BAD_OBSERVER, GOOD_OBSERVER)
        changed.append("fixed V25 MutationObserver syntax")

    text, count = re.subn(
        r"v24A4LayoutGuard\(true\);\n(?:\s*v25AfterRender\(\);\n?)+",
        "v24A4LayoutGuard(true);\n    v25AfterRender();\n",
        text,
    )
    if count:
        changed.append("normalized V25 after-render calls")

    text, count = re.subn(
        r"(?:v25AfterRender\(\);\n\s*)*setTimeout\(function\(\)\{ window\.print\(\); \}, (?:80|160)\);",
        "v25AfterRender();\n  setTimeout(function(){ window.print(); }, 160);",
        text,
    )
    if count:
        changed.append("normalized print guard")

    path.write_text(text, encoding="utf-8", newline="\n")
    print("V25 runtime fix:", ", ".join(changed) if changed else "nothing changed")


if __name__ == "__main__":
    main()
