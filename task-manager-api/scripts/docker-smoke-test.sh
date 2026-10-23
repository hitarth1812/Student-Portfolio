#!/usr/bin/env bash
# Practical 11 smoke test for the Docker Compose stack.
# Usage (from the repo root, stack running): bash task-manager-api/scripts/docker-smoke-test.sh
# Uses a local test account (override with DEMO_EMAIL / DEMO_PASSWORD).
set -u

WEB=${WEB:-http://localhost:8080}
API="$WEB/backend"
EMAIL=${DEMO_EMAIL:-p11.docker@example.test}
PASSWORD=${DEMO_PASSWORD:-Practical11!docker}
PASS=0; FAIL=0

check() { # check "<label>" <expected> <actual>
  if [ "$2" = "$3" ]; then echo "  [PASS] $1 -> $3"; PASS=$((PASS+1));
  else echo "  [FAIL] $1 -> expected $2, got $3"; FAIL=$((FAIL+1)); fi
}
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
json() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);console.log($1)})"; }

echo "=== 1. Frontend container (Nginx) ==="
check "GET $WEB/ (SPA index)"                    200 "$(code "$WEB/")"
check "GET $WEB/tasks (SPA fallback route)"      200 "$(code "$WEB/tasks")"
check "GET $WEB/nginx-health"                    200 "$(code "$WEB/nginx-health")"
ASSET=$(curl -s "$WEB/" | grep -o '/assets/index-[^"]*\.js' | head -1)
check "gzip on $ASSET" "gzip" "$(curl -s -H 'Accept-Encoding: gzip' -o /dev/null -D - "$WEB$ASSET" | tr -d '\r' | awk -F': ' 'tolower($1)=="content-encoding"{print $2}')"
check "immutable cache header on assets" "public, max-age=31536000, immutable" "$(curl -s -o /dev/null -D - "$WEB$ASSET" | tr -d '\r' | awk -F': ' 'tolower($1)=="cache-control"{print $2}')"

echo "=== 2. Backend container through the Nginx reverse proxy (/backend -> backend:5000) ==="
HEALTH=$(curl -s "$API/health")
echo "  /health: $HEALTH"
check "API health status" "ok" "$(echo "$HEALTH" | json 'o.status')"
check "API -> MongoDB connection" "connected" "$(echo "$HEALTH" | json 'o.db')"

LOGIN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | json 'o.token || ""')
if [ -z "$TOKEN" ]; then
  REG=$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{\"name\":\"P11 Docker\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
  TOKEN=$(echo "$REG" | json 'o.token || ""')
  echo "  registered new test user $EMAIL"
fi
check "JWT issued" "yes" "$([ -n "$TOKEN" ] && echo yes || echo no)"
AUTH="Authorization: Bearer $TOKEN"

CREATED=$(curl -s -X POST "$API/tasks" -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"title":"Containerize the stack with Docker Compose","description":"Created from the smoke test via Nginx -> API -> MongoDB","priority":"high"}')
TASK_ID=$(echo "$CREATED" | json 'o.data._id')
check "POST /tasks (write reaches MongoDB container)" "true" "$(echo "$CREATED" | json 'o.success')"
check "GET /tasks first read" "MISS" "$(curl -s -o /dev/null -D - "$API/tasks" -H "$AUTH" | tr -d '\r' | awk -F': ' 'tolower($1)=="x-cache"{print $2}')"
check "GET /tasks second read (node-cache)" "HIT" "$(curl -s -o /dev/null -D - "$API/tasks" -H "$AUTH" | tr -d '\r' | awk -F': ' 'tolower($1)=="x-cache"{print $2}')"
check "POST /api/jobs async job" 202 "$(code -X POST "$API/api/jobs" -H "$AUTH" -H 'Content-Type: application/json' -d '{"type":"task_report"}')"

TICKET=$(curl -s -X POST "$API/api/events/ticket" -H "$AUTH" | json 'o.ticket')
SSE=$(curl -s -N --max-time 2 "$API/api/events/stream?ticket=$TICKET" | head -2 | tr -d '\r' | head -1)
check "SSE stream through Nginx (unbuffered)" "event: connected" "$SSE"

echo "=== 3. Container isolation & security ==="
check "backend runs as non-root user" "node" "$(docker exec awdf-backend whoami)"
check ".env NOT baked into backend image" "absent" "$(docker exec awdf-backend sh -c '[ -f /app/.env ] && echo present || echo absent')"
check "frontend image has no Node.js runtime" "absent" "$(docker exec awdf-frontend sh -c 'command -v node >/dev/null && echo present || echo absent')"
check "frontend cannot reach mongodb (separate network)" "unreachable" "$(docker exec awdf-frontend sh -c 'nc -z -w 2 mongodb 27017 2>/dev/null && echo reachable || echo unreachable')"
check "backend resolves mongodb by service name" "reachable" "$(docker exec awdf-backend sh -c 'nc -z -w 2 mongodb 27017 && echo reachable || echo unreachable')"

echo "=== 4. Data persistence (named volume survives a container restart) ==="
docker compose restart mongodb backend > /dev/null 2>&1
for i in $(seq 1 30); do [ "$(docker inspect -f '{{.State.Health.Status}}' awdf-backend)" = healthy ] && break; sleep 2; done
check "backend healthy again after restart" "healthy" "$(docker inspect -f '{{.State.Health.Status}}' awdf-backend)"
LOGIN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN" | json 'o.token || ""')
check "task $TASK_ID still in MongoDB after restart" 200 "$(code "$API/tasks/$TASK_ID" -H "Authorization: Bearer $TOKEN")"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
