/**
 * AETERLINK Documentation Module — ZZZZZZZ_SafeSaveIssueNoStack.gs
 * Targeted endpoint for Save Draft / Issue only.
 *
 * Purpose:
 * - Avoid Maximum call stack size exceeded caused by legacy duplicate apiModularSaveFormRecord* wrappers.
 * - Use a unique API name so no legacy override can recursively call itself.
 * - Do not change document layout, EQC table, print, photo report, row controls, or other modules.
 */

function apiSafeSaveIssueNoStackV1(payload) {
  payload = payload || {};
  return AETERLINK_DRAFT_ISSUE_EDIT_API.save(payload);
}
