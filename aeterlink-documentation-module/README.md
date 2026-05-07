# AETERLINK Documentation Module V19 — Smart Document Engine

Base: V18 Main Contractor Width Equal Patch  
Google Sheet change: **Not required**

## What V19 adds

1. **Document Schema Engine**
   - Schema for `PJ-WCR-001 — Work Completion Report`
   - Schema for `PJ-EQUIP-CHK-001 — Equipment Checklist`
   - Generic schema fallback for other documents

2. **A4 Master Layout Engine**
   - Shared A4 margin / binding margin guard
   - Shared header / info-grid CSS guard
   - Shared table wrapping and print-safe CSS
   - Keeps existing WCR / Equipment Checklist layout behavior

3. **Pagination Engine**
   - Estimates A4 page count from table rows and wrapped text length
   - Keeps WCR Photo Report rule: **1 A4 page = 2 photos**
   - Reports table pages and photo pages in Layout Check

4. **Validation Engine**
   - Validates required fields before Issue / Send
   - Shows warnings for missing recommended fields, invalid numeric qty, non-standard status, missing photo image, etc.
   - Blocks Issue only when critical required fields are missing

5. **AI Assist Layer**
   - Local rule-based AI assist for remarks, missing info, linked modules, and next actions
   - Designed so an external AI connector can be added later without touching A4 layout

6. **GitHub Auto Deploy Templates**
   - Includes GitHub Actions workflow template for `clasp push` + deployment
   - Includes `appsscript.json`, `.clasp.json` template, and `.gitignore`

## Install into existing Apps Script project

1. Open your existing Apps Script project.
2. Replace `Code.gs` with `AETERLINK_Documentation_Module_Code_V19_SMART_DOCUMENT_ENGINE.gs`.
3. Replace `Index.html` with `AETERLINK_Documentation_Module_Index_V19_SMART_DOCUMENT_ENGINE.html`.
4. Save.
5. Run `setupDocumentationModuleV19()`.
6. Deploy > Manage deployments > Edit > New version > Deploy.
7. Open the WebApp and hard refresh.

## GitHub Auto Deploy setup

Repository structure:

```text
Code.gs
Index.html
appsscript.json
.clasp.json
.github/workflows/deploy.yml
```

Required GitHub Secrets:

```text
CLASPRC_JSON_B64
SCRIPT_ID
DEPLOYMENT_ID
```

Copy `github_actions_deploy_v19.yml` to:

```text
.github/workflows/deploy.yml
```

Rename `clasp_v19.template.json` to `.clasp.json` and set the Script ID, or let the workflow create `.clasp.json` from the `SCRIPT_ID` secret.

## New client buttons

In the A4 Workflow sidebar:

- `Validate`
- `Layout Check`
- `AI Assist`

Issue / Send now validates the document first before issuing a document number.
