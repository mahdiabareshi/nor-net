#!/bin/bash
# پاکسازی کاربران تستی ایجادشده در پنل پاسارگارد (فایل‌های تست خودمان)
KEY="pg_key_YOUR_API_KEY_HERE"
BASE="https://YOUR-PANEL-URL"
for u in nrtmw826ltf6tu nrtmw827x6m5cy nrtmw82a1eb5ld; do
  code=$(curl -s --max-time 20 -X DELETE -H "X-API-Key: $KEY" -o /dev/null -w "%{http_code}" "$BASE/api/user/by-username/$u")
  echo "delete $u → $code"
done
# تعداد کاربران پنل بعد از پاکسازی
curl -s --max-time 20 -H "X-API-Key: $KEY" "$BASE/api/system" | cut -c1-120
