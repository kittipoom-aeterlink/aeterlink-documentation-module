/**
 * AETERLINK Documentation Module — ZZZZZ_V19ApiWrappers.gs
 *
 * Provides the V19 document lifecycle API functions called by Index.html.
 * All logic delegates to AETERLINK_DRAFT_ISSUE_EDIT_API (ZZZZZ_DraftIssueEditApi.gs).
 *
 * Functions exposed:
 *   apiSaveDraftV19(templateCode, projectCode, dataJson, formRecordId)
 *   apiIssueDocumentV19(templateCode, projectCode, dataJson, formRecordId)
 *   apiStartRevisionV19(formRecordId, revisionReason)
 *   apiSoftDeleteFormRecordV19(formRecordId)
 */

function apiSaveDraftV19(templateCode, projectCode, dataJson, formRecordId) {
  var data = _v19ParseJson_(dataJson);
  data.TemplateCode = templateCode || data.TemplateCode || '';
  data.ProjectCode  = projectCode  || data.ProjectCode  || '';
  return AETERLINK_DRAFT_ISSUE_EDIT_API.save({
    Status:       'Draft',
    TemplateCode: templateCode || data.TemplateCode || '',
    ProjectCode:  projectCode  || data.ProjectCode  || '',
    FormRecordId: formRecordId || data.FormRecordId || '',
    Data:         data
  });
}

function apiIssueDocumentV19(templateCode, projectCode, dataJson, formRecordId) {
  var data = _v19ParseJson_(dataJson);
  data.TemplateCode = templateCode || data.TemplateCode || '';
  data.ProjectCode  = projectCode  || data.ProjectCode  || '';
  data.Status       = 'Issued';
  return AETERLINK_DRAFT_ISSUE_EDIT_API.save({
    Status:       'Issued',
    TemplateCode: templateCode || data.TemplateCode || '',
    ProjectCode:  projectCode  || data.ProjectCode  || '',
    FormRecordId: formRecordId || data.FormRecordId || '',
    Data:         data
  });
}

function apiStartRevisionV19(formRecordId, revisionReason) {
  if (!formRecordId) throw new Error('Missing formRecordId for revision.');
  var existing = AETERLINK_DRAFT_ISSUE_EDIT_API.getRecord({ FormRecordId: formRecordId });
  if (!existing || !existing.ok) throw new Error('Record not found: ' + formRecordId);
  var record = existing.record || {};
  var data = existing.data || {};
  data.TemplateCode       = record.TemplateCode || data.TemplateCode || '';
  data.ProjectCode        = record.ProjectCode  || data.ProjectCode  || '';
  data.SourceDocumentNo   = existing.baseDocumentNo || record.DocumentNo || '';
  data.SourceFormRecordId = record.FormRecordId || formRecordId;
  data.RevisionOf         = existing.baseDocumentNo || record.DocumentNo || '';
  data.RevisionNo         = existing.nextRevisionNo || 'R01';
  data.Status             = 'Draft';
  return AETERLINK_DRAFT_ISSUE_EDIT_API.save({
    Status:           'Draft',
    TemplateCode:     record.TemplateCode || '',
    ProjectCode:      record.ProjectCode  || '',
    FormRecordId:     '',
    SourceDocumentNo: data.SourceDocumentNo,
    SourceFormRecordId: data.SourceFormRecordId,
    RevisionOf:       data.RevisionOf,
    RevisionNo:       data.RevisionNo,
    RevisionReason:   revisionReason || 'Revision',
    Data:             data
  });
}

function apiSoftDeleteFormRecordV19(formRecordId) {
  if (!formRecordId) throw new Error('Missing formRecordId for delete.');
  return AETERLINK_DRAFT_ISSUE_EDIT_API.softDelete({ FormRecordId: formRecordId });
}

function _v19ParseJson_(v) {
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(v || '{}') || {}; } catch (e) { return {}; }
}
