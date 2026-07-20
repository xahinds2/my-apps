#!/usr/bin/env bash
# Product API regression test — curl-based, self-contained.
#
# Usage:
#   tests/products_api.sh                       # against http://localhost:3000
#   BASE=http://localhost:8080 tests/products_api.sh   # override port
#   TOKEN=xxx tests/products_api.sh             # if SCRAPER_TOKEN is set server-side
#
# Requires: curl, python3. The server must already be running.
#
# Seeds a fictional brand ("Zephyrion") so assertions are deterministic
# regardless of what real data is in the catalog, then removes it at the end.
# Re-runnable: seeding is an idempotent upsert; teardown deletes by id prefix.
# NOTE: teardown needs a DELETE path. There is no DELETE API, so leftover seed
# docs self-expire via the 6h TTL. If MONGODB_URI is exported this script also
# hard-deletes them via a tiny node one-liner (best-effort).

set -u
BASE="${BASE:-http://localhost:3000}"
API="$BASE/api/products"
TOKEN="${TOKEN:-}"
# macOS bash 3.2 errors on empty "${AUTH[@]}" under set -u, so build the header
# args as a plain string used unquoted only when a token is present.
AUTH_HEADER=""
[ -n "$TOKEN" ] && AUTH_HEADER="Authorization: Bearer $TOKEN"

PASS=0; FAIL=0
pass(){ echo "  ok   $1"; PASS=$((PASS+1)); }
fail(){ echo "  FAIL $1"; echo "       expected: $2"; echo "       got:      $3"; FAIL=$((FAIL+1)); }

# check <name> <expected> <actual>
check(){ if [ "$2" = "$3" ]; then pass "$1"; else fail "$1" "$2" "$3"; fi; }

# jq-free JSON field extraction via python
jget(){ python3 -c "import sys,json;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$1" 2>/dev/null; }

post(){
  if [ -n "$AUTH_HEADER" ]; then
    curl -s -X POST "$API" -H "Content-Type: application/json" -H "$AUTH_HEADER" -d "$1"
  else
    curl -s -X POST "$API" -H "Content-Type: application/json" -d "$1"
  fi
}
# code <curl-args...> : print status. Prepends auth header when set.
code(){
  if [ -n "$AUTH_HEADER" ]; then
    curl -s -o /dev/null -w "%{http_code}" -H "$AUTH_HEADER" "$@"
  else
    curl -s -o /dev/null -w "%{http_code}" "$@"
  fi
}

echo "== Product API tests @ $BASE =="

# ---------------------------------------------------------------------------
# Seed: 5 stores x same phone (256GB) + a 128GB variant + an accessory.
# Fictional brand/model so search results are exclusively ours.
# ---------------------------------------------------------------------------
SEED='{"source":{"query":"zephyrion xyztab"},"products":[
 {"store":"amazon","storeProductId":"QTEST-A","url":"https://amazon.in/dp/A","title":"Zephyrion Xyztab 900 Pro (256 GB) - Blue","brand":"Zephyrion","price":"Rs. 1,34,900.00","image":"https://i/a.jpg","rating":"4.5","reviews":"1,200"},
 {"store":"flipkart","storeProductId":"QTEST-F","url":"https://flipkart.com/p/F","title":"ZEPHYRION Xyztab 900 Pro (Blue, 256 GB)","brand":"ZEPHYRION","price":"₹1,31,999","image":"https://i/f.jpg"},
 {"store":"croma","storeProductId":"QTEST-C","url":"https://croma.com/p/C","title":"Zephyrion Xyztab 900 Pro 256 GB Blue","price":133500,"image":"https://i/c.jpg"},
 {"store":"nykaa","storeProductId":"QTEST-N","url":"https://nykaa.com/p/N","title":"Zephyrion Xyztab 900 Pro Smartphone 256 GB","brand":"Zephyrion","price":132750,"image":"https://i/n.jpg"},
 {"store":"myntra","storeProductId":"QTEST-M","url":"https://myntra.com/p/M","title":"Zephyrion Xyztab 900 Pro (256GB)","brand":"Zephyrion","price":135000,"image":"https://i/m.jpg"},
 {"store":"amazon","storeProductId":"QTEST-A2","url":"https://amazon.in/dp/A2","title":"Zephyrion Xyztab 900 Pro (128 GB) - Black","brand":"Zephyrion","price":124900,"image":"https://i/a2.jpg"},
 {"store":"amazon","storeProductId":"QTEST-ACC","url":"https://amazon.in/dp/ACC","title":"Generic Case for Zephyrion Xyztab 900 Pro Clear","brand":"Generic","price":499,"image":"https://i/acc.jpg"}
]}'

echo "-- POST seed"
R=$(post "$SEED")
check "seed saved=7" "7" "$(echo "$R" | jget "['saved']")"

echo "-- POST price coercion (Rs. 1,34,900.00 -> 134900)"
R=$(curl -s "$API?q=zephyrion&store=amazon&limit=10")
AP=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print([p['price'] for p in d['data'] if p['storeProductId']=='QTEST-A'][0])")
check "price parsed" "134900" "$AP"

echo "-- POST single (unwrapped) object body"
R=$(post '{"store":"amazon","storeProductId":"QTEST-SINGLE","url":"https://amazon.in/dp/SG","title":"Zephyrion Xyztab Single Item","price":111,"image":"https://i/sg.jpg"}')
check "single saved=1" "1" "$(echo "$R" | jget "['saved']")"

echo "-- POST validation (bad store, empty title, missing url, non-object)"
R=$(post '{"products":[{"store":"ebay","storeProductId":"X","url":"https://x","title":"t"},{"store":"amazon","storeProductId":"Y","url":"https://y","title":""},{"store":"amazon","storeProductId":"Z","title":"no url"},"a-string"]}')
check "all 4 skipped" "4" "$(echo "$R" | jget "['skipped']")"
check "none saved"    "0" "$(echo "$R" | jget "['saved']")"

echo "-- POST soft-missing tracking"
R=$(post '{"products":[{"store":"croma","storeProductId":"QTEST-BARE","url":"https://croma.com/b","title":"Zephyrion Barebones Item"}]}')
check "softMissing price" "1" "$(echo "$R" | jget "['softMissing']['price']")"
check "softMissing image" "1" "$(echo "$R" | jget "['softMissing']['image']")"

echo "-- POST in-batch dedupe (same key twice in one payload -> 1)"
R=$(post '{"products":[
 {"store":"amazon","storeProductId":"QTEST-DUP","url":"https://a/d1","title":"Zephyrion Dup One","price":100,"image":"https://i/d.jpg"},
 {"store":"amazon","storeProductId":"QTEST-DUP","url":"https://a/d2","title":"Zephyrion Dup Two","price":200,"image":"https://i/d.jpg"}
]}')
check "dedupe saved=1" "1" "$(echo "$R" | jget "['saved']")"
# last-write-wins: price should be 200
DUPPRICE=$(curl -s "$API?q=zephyrion%20dup&store=amazon" | python3 -c "import sys,json;d=json.load(sys.stdin);print([p['price'] for p in d['data'] if p['storeProductId']=='QTEST-DUP'][0])" 2>/dev/null)
check "dedupe last-write-wins price=200" "200" "$DUPPRICE"

echo "-- POST schemaVersion > server -> raw stashed"
post '{"schemaVersion":99,"products":[{"store":"nykaa","storeProductId":"QTEST-RAW","url":"https://nykaa.com/r","title":"Zephyrion Raw Item","price":555,"image":"https://i/r.jpg","futureField":"keepme"}]}' >/dev/null
RAW=$(curl -s "$API?q=zephyrion%20raw&store=nykaa" | python3 -c "import sys,json;d=json.load(sys.stdin);m=[p for p in d['data'] if p['storeProductId']=='QTEST-RAW'];print((m[0].get('raw') or {}).get('futureField') if m else 'MISSING')" 2>/dev/null)
check "raw.futureField preserved" "keepme" "$RAW"

echo "-- POST invalid JSON -> 400"
check "bad json 400" "400" "$(code -X POST "$API" -H 'Content-Type: application/json' -d '{broken')"

echo "-- POST batch > 500 -> 413"
BIG=$(python3 -c "import json;print(json.dumps({'products':[{'store':'amazon','storeProductId':'QBIG'+str(i),'url':'https://x','title':'t'+str(i)} for i in range(501)]}))")
check "oversize 413" "413" "$(code -X POST "$API" -H 'Content-Type: application/json' -d "$BIG")"

echo "-- GET search"
R=$(curl -s "$API?q=zephyrion%20xyztab%20pro&limit=48")
# 5x256GB + 1x128GB + the accessory all contain the tokens = 7. GET does NOT
# drop accessories (only /summary does), so 7 is correct here.
check "search total=7 (incl. accessory)" "7" "$(echo "$R" | jget "['total']")"

echo "-- GET store filter"
R=$(curl -s "$API?q=zephyrion%20xyztab%20pro&store=amazon")
AMZ_OK=$(echo "$R" | python3 -c "import sys,json;d=json.load(sys.stdin);print('ok' if d['data'] and all(p['store']=='amazon' for p in d['data']) else 'mixed')")
check "store=amazon only amazon rows" "ok" "$AMZ_OK"

echo "-- GET limit clamp (limit=9999 -> <=200)"
LIM=$(curl -s "$API?q=zephyrion&limit=9999" | jget "['limit']")
check "limit clamped to 200" "200" "$LIM"

echo "-- GET NaN page guard"
check "page=abc -> 1" "1" "$(curl -s "$API?q=zephyrion&page=abc" | jget "['page']")"

echo "-- GET pagination no overlap (limit 2 across pages)"
OVL=$(python3 - "$API" <<'PY'
import sys,urllib.request,json
api=sys.argv[1]
ids=[]
for p in range(1,10):
    d=json.load(urllib.request.urlopen(api+"?q=zephyrion&limit=2&page=%d"%p))
    ids+=[x["_id"] for x in d["data"]]
    if not d["hasMore"]: break
print("ok" if len(ids)==len(set(ids)) and len(ids)>0 else "overlap")
PY
)
check "pagination distinct ids" "ok" "$OVL"

echo "-- GET meta counts"
R=$(curl -s "$API/meta?q=zephyrion%20xyztab%20pro")
check "meta amazon=3" "3" "$(echo "$R" | jget "['storeCounts']['amazon']")"
check "meta flipkart=1" "1" "$(echo "$R" | jget "['storeCounts']['flipkart']")"

echo "-- GET summary (accessory excluded, cheapest is the 128GB phone)"
R=$(curl -s "$API/summary?q=zephyrion%20xyztab%20pro")
check "summary cheapest=124900 (not 499 case)" "124900" "$(echo "$R" | jget "['latestPrice']")"

echo "-- GET summary no q -> 400"
check "summary no-q 400" "400" "$(code "$API/summary")"

echo "-- GET compare ?key= (5 stores, cheapest first)"
KEY=$(curl -s "$API?q=zephyrion&store=flipkart" | python3 -c "import sys,json;print(json.load(sys.stdin)['data'][0]['canonicalKey'])")
R=$(curl -s "$API/compare?key=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$KEY")")
check "compare stores=5" "5" "$(echo "$R" | jget "['productCount']")"
check "compare cheapest=flipkart" "flipkart" "$(echo "$R" | jget "['cheapest']['store']")"
check "compare cheapest=131999" "131999" "$(echo "$R" | jget "['cheapest']['price']")"

echo "-- GET compare ?q= (resolves to key, excludes 128GB & case)"
R=$(curl -s "$API/compare?q=zephyrion%20xyztab%20pro%20256gb")
check "compare-q stores=5" "5" "$(echo "$R" | jget "['productCount']")"

echo "-- GET compare no params -> 400"
check "compare no-params 400" "400" "$(code "$API/compare")"

echo "-- OPTIONS preflight -> 204"
check "options 204" "204" "$(code -X OPTIONS "$API")"

echo "-- CORS header present on GET response"
CORS=$(curl -s -o /dev/null -D - "$API/meta?q=x" | grep -i "access-control-allow-origin" | tr -d "\r" | awk '{print $2}')
check "CORS allow-origin *" "*" "$CORS"

# Run LAST — mutates QTEST-A's price, which earlier compare assertions rely on.
echo "-- POST re-scrape idempotency (no dup, lastSeenAt bumped, firstSeenAt frozen)"
BEFORE=$(curl -s "$API?q=zephyrion&store=amazon&limit=10" | python3 -c "import sys,json;d=json.load(sys.stdin);p=[x for x in d['data'] if x['storeProductId']=='QTEST-A'][0];print(p['firstSeenAt']+'|'+p['lastSeenAt'])")
sleep 2
# re-post the SAME product with a new price
post '{"products":[{"store":"amazon","storeProductId":"QTEST-A","url":"https://amazon.in/dp/A","title":"Zephyrion Xyztab 900 Pro (256 GB) - Blue","brand":"Zephyrion","price":130000,"image":"https://i/a.jpg"}]}' >/dev/null
AFTER=$(curl -s "$API?q=zephyrion&store=amazon&limit=10" | python3 -c "import sys,json;d=json.load(sys.stdin);ms=[x for x in d['data'] if x['storeProductId']=='QTEST-A'];print(str(len(ms))+'|'+ms[0]['firstSeenAt']+'|'+ms[0]['lastSeenAt']+'|'+str(ms[0]['price']))")
IDEM=$(python3 - "$BEFORE" "$AFTER" <<'PY'
import sys
bf,bl=sys.argv[1].split('|')
n,af,al,price=sys.argv[2].split('|')
ok = (n=="1") and (af==bf) and (al>bl) and (price=="130000")
print("ok" if ok else "n=%s first_frozen=%s last_bumped=%s price=%s"%(n, af==bf, al>bl, price))
PY
)
check "re-scrape idempotent" "ok" "$IDEM"

# ---------------------------------------------------------------------------
# Teardown
# ---------------------------------------------------------------------------
echo "-- teardown"
if [ -n "${MONGODB_URI:-}" ]; then
  node -e "const m=require('mongoose');(async()=>{await m.connect(process.env.MONGODB_URI);const r=await m.connection.collection('wish.product').deleteMany({storeProductId:{\$regex:'^QTEST-|^QBIG'}});console.log('  deleted',r.deletedCount);await m.disconnect();})().catch(e=>{console.error('  cleanup skipped:',e.message)})" 2>/dev/null \
    || echo "  cleanup skipped (node/mongoose unavailable) — seed self-expires via 6h TTL"
else
  echo "  MONGODB_URI not set — seed self-expires via 6h TTL"
fi

echo ""
echo "== $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
