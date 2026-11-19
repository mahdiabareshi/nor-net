#!/bin/bash
# Live test: create user -> fetch subscription -> delete (cleanup)
KEY="pg_key_YOUR_API_KEY_HERE"
BASE="https://YOUR-PANEL-URL"
EXP=$(( $(date +%s) + 2592000 ))   # +30 days
echo "expire=$EXP"

PAYLOAD=$(cat <<EOF
{"username":"zai-test-001","data_limit":1073741824,"expire":$EXP,"status":"active","note":"ZAI integration test - will delete","group_ids":[1],"hwid_limit":2}
EOF
)

echo "== CREATE =="
curl -s --max-time 25 -X POST \
  -H "X-API-Key: $KEY" -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -o /tmp/pg_create.json -w "http %{http_code}\n" \
  "$BASE/api/user"
cut -c1-500 /tmp/pg_create.json; echo

echo "== READ (subscription_url) =="
curl -s --max-time 25 -H "X-API-Key: $KEY" \
  -o /tmp/pg_read.json -w "http %{http_code}\n" \
  "$BASE/api/user/by-username/zai-test-001"
node -e "
try {
  const u = require('/tmp/pg_read.json');
  console.log('username:', u.username, '| status:', u.status, '| data_limit:', u.data_limit, '| expire:', u.expire, '| hwid_limit:', u.hwid_limit);
  console.log('subscription_url:', u.subscription_url || JSON.stringify(u.subscription));
} catch(e) { console.log('raw:', require('fs').readFileSync('/tmp/pg_read.json','utf8').slice(0,400)); }
"

echo "== DELETE (cleanup) =="
curl -s --max-time 25 -X DELETE -H "X-API-Key: $KEY" \
  -o /tmp/pg_del.json -w "http %{http_code}\n" \
  "$BASE/api/user/by-username/zai-test-001"
cut -c1-200 /tmp/pg_del.json; echo
