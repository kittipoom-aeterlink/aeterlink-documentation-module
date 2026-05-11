"""Fix deploy-time Apps Script runtime bugs before clasp push."""
from pathlib import Path


def replace_once(text, old, new, label):
    if new in text:
        return text, False
    if old not in text:
        print(f"SKIP: {label} pattern not found")
        return text, False
    return text.replace(old, new, 1), True


def patch_code_gs():
    path = Path("Code.gs")
    text = path.read_text(encoding="utf-8")
    changed = []

    text, did = replace_once(
        text,
        "function doGet() {\n  return HtmlService.createTemplateFromFile('Index')",
        "function doGetLegacyIndex_() {\n  return HtmlService.createTemplateFromFile('Index')",
        "legacy Code.gs doGet",
    )
    if did:
        changed.append("renamed legacy Code.gs doGet")

    compat = """
function apiSaveDraftV19(templateCode, projectCode, dataJson, formRecordId) {
  var record = apiSaveDraft(templateCode, projectCode, dataJson, formRecordId);
  return {ok:true, record:record, formRecord:record};
}

function apiIssueDocumentV19(templateCode, projectCode, dataJson, formRecordId) {
  var record = apiIssueRecord(templateCode, projectCode, dataJson, formRecordId);
  return {ok:true, record:record, formRecord:record};
}

function apiStartRevisionV19(formRecordId, reason) {
  var record = apiStartRevision(formRecordId, reason);
  return {ok:true, record:record, formRecord:record};
}

function apiSoftDeleteFormRecordV19(formRecordId) {
  var record = apiDeleteRecord('FORM_RECORDS', formRecordId, 'Deleted from V19 document issue UI');
  return {ok:true, record:record, formRecord:record};
}

"""
    if "function apiSaveDraftV19(" not in text:
        marker = "\nfunction apiInitV8() {"
        if marker in text:
            text = text.replace(marker, "\n" + compat + "function apiInitV8() {", 1)
            changed.append("added V19 compatibility API wrappers")
        else:
            print("SKIP: apiInitV8 marker not found")

    path.write_text(text, encoding="utf-8", newline="\n")
    print("Code.gs runtime patch:", ", ".join(changed) if changed else "nothing changed")


def patch_router():
    path = Path("ZZZ_WebAppRouter.gs")
    if not path.exists():
        print("SKIP: ZZZ_WebAppRouter.gs not found")
        return
    text = path.read_text(encoding="utf-8")
    text, did = replace_once(
        text,
        "function doGet(e) {",
        "function doGetRouterV1_(e) {",
        "ZZZ router doGet",
    )
    path.write_text(text, encoding="utf-8", newline="\n")
    print("ZZZ_WebAppRouter.gs runtime patch:", "renamed router doGet" if did else "nothing changed")


def main():
    patch_code_gs()
    patch_router()


if __name__ == "__main__":
    main()
