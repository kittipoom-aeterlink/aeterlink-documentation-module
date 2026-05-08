"""
patch_v22.py — Apply V22 English UI translations to Index.html and Code.gs
Run by GitHub Actions deploy workflow.
"""
from pathlib import Path

PAIRS = {
    '<title>AETERLINK Documentation Control V10</title>': '<title>AETERLINK Documentation Control V22</title>',
    'V19 Smart Engine · Loading...': 'V22 English UI · Loading...',
    'V16 — offline (server not connected)': 'V22 — offline (server not connected)',
    "All: 'เอกสารทั้งหมด'": "All: 'All documents'",
    "'01_INITIATION': '1. เริ่มโครงการ / รับมอบจากฝ่ายขาย'": "'01_INITIATION': '1. Project Start / Sales Handover'",
    "'02_PLANNING': '2. วางแผนโครงการ / ควบคุมโครงการ'": "'02_PLANNING': '2. Project Planning / Control'",
    "'03_DESIGN': '3. Design & Engineering / เอกสารขออนุมัติ'": "'03_DESIGN': '3. Design & Engineering / Approval Documents'",
    "'07_HANDOVER': '7. Handover / Closeout / ส่งมอบงาน'": "'07_HANDOVER': '7. Handover / Closeout'",
    "'08_WARRANTY': '8. Warranty / DLP / หลังส่งมอบ'": "'08_WARRANTY': '8. Warranty / DLP / Post-handover'",
    'ใช้สำหรับแยกเอกสารตามลำดับงานตั้งแต่เริ่มโครงการ → วางแผน → ออกแบบ → จัดซื้อ → ติดตั้ง → ทดสอบ → ส่งมอบ → Warranty/DLP': (
        'Used to group documents by project lifecycle: initiation → planning → design'
        ' → procurement → installation → testing → handover → Warranty/DLP'
    ),
}


def main():
    for name in ['Index.html', 'Code.gs']:
        p = Path(name)
        if not p.exists():
            print(f"SKIP: {name} not found")
            continue
        s = p.read_text(encoding='utf-8')
        count = 0
        for a, b in PAIRS.items():
            if a in s:
                s = s.replace(a, b)
                count += 1
        s = s.replace('V21_DOCUMENT_LIFECYCLE_GROUPING', 'V22_ENGLISH_UI')
        p.write_text(s, encoding='utf-8', newline='\n')
        print(f"V22 patch: {name} — {count} replacement(s)")


if __name__ == '__main__':
    main()
