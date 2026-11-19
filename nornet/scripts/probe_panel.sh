#!/bin/bash
# Probe PasarGuard panel: reachability, Swagger spec, API-key auth test
BASE="https://YOUR-PANEL-URL"
KEY="pg_key_YOUR_API_KEY_HERE"

echo "== 1) reachability =="
curl -s -o /dev/null -w "root $BASE/ : %{http_code}\n" --max-time 20 "$BASE/"

echo "== 2) swagger/openapi candidates =="
for p in "/docs" "/api/docs" "/api/openapi.json" "/openapi.json"; do
  curl -s -o /dev/null -w "$p : %{http_code}\n" --max-time 20 "$BASE$p"
done

echo "== 3) API-key auth probe (Bearer) =="
for p in "/api/admin" "/api/system/stats" "/api/users" "/api/admin/stats" "/api/groups"; do
  code=$(curl -s --max-time 20 -H "Authorization: Bearer $KEY" -o "/tmp/pg_$(echo $p | tr '/' '_').json" -w "%{http_code}" "$BASE$p")
  echo "$p : $code"
done

echo "== 4) response snippets =="
for f in /tmp/pg_*.json; do
  echo "--- $f"
  cut -c1-400 "$f"
  echo
done
