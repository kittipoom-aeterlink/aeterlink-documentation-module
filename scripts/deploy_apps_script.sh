#!/usr/bin/env bash
set -euo pipefail

# Auto deploy Google Apps Script project with clasp.
# Usage:
#   ./scripts/deploy_apps_script.sh "deploy note"
# Env:
#   CLASP_DEPLOYMENT_ID=<existing deployment id>   # optional; if set, updates that deployment
#   SKIP_PATCH=1                                   # optional; skip runtime patch script

DESC="${1:-Auto deploy $(date -u +'%Y-%m-%d %H:%M:%S UTC')}"

require_cmd(){ command -v "$1" >/dev/null 2>&1 || { echo "ERROR: missing command: $1" >&2; exit 1; }; }

require_cmd clasp
require_cmd python3

if [[ "${SKIP_PATCH:-0}" != "1" ]]; then
  echo "[1/4] Apply runtime deploy patch"
  python3 scripts/patch_runtime_bugs.py
else
  echo "[1/4] Skip runtime deploy patch (SKIP_PATCH=1)"
fi

echo "[2/4] Push source to Apps Script"
clasp push -f

echo "[3/4] Create immutable version"
VERSION_LINE="$(clasp version "$DESC" | tail -n 1)"
VERSION_NUM="$(echo "$VERSION_LINE" | sed -E 's/[^0-9]*([0-9]+).*/\1/')"
if [[ -z "$VERSION_NUM" ]]; then
  echo "ERROR: could not parse version number from: $VERSION_LINE" >&2
  exit 1
fi

echo "Created version: $VERSION_NUM"

echo "[4/4] Deploy"
if [[ -n "${CLASP_DEPLOYMENT_ID:-}" ]]; then
  clasp deploy --deploymentId "$CLASP_DEPLOYMENT_ID" --versionNumber "$VERSION_NUM" --description "$DESC"
else
  clasp deploy --versionNumber "$VERSION_NUM" --description "$DESC"
fi

echo "Done. Version=$VERSION_NUM"
