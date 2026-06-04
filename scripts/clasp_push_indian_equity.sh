#!/usr/bin/env bash
# Push all backend/automation/*.gs to the Indian Equity Intelligence bound script.
# Usage: ./scripts/clasp_push_indian_equity.sh <SCRIPT_ID>
set -euo pipefail
SCRIPT_ID="${1:?Paste Script ID from Apps Script → Project Settings → Script ID}"
ROOT="$(cd "$(dirname "$0")/../backend/automation" && pwd)"
cd "$ROOT"
node -e "
const fs=require('fs');
const p='.clasp.json';
const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.scriptId=process.argv[1];
j.rootDir='';
fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');
console.log('Updated .clasp.json scriptId ->', process.argv[1]);
" "$SCRIPT_ID"
clasp push --force
echo "Remote file list:"
TOKEN=$(node -e "const rc=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.clasprc.json','utf8'));console.log(rc.tokens.default.access_token)")
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://script.googleapis.com/v1/projects/${SCRIPT_ID}/content" | \
  node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); const n=(d.files||[]).filter(f=>f.name!=='appsscript').map(f=>f.name).sort(); console.log('REMOTE_GS_FILE_COUNT', n.length); console.log(n.join('\n'));"
