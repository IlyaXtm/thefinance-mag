#!/usr/bin/env bash
# Legacy-slug redirect verification.
#
#   BEFORE cutover, against production:
#       ./scripts/verify-redirects.sh https://thefinance.ir > before.txt
#   AFTER cutover:
#       ./scripts/verify-redirects.sh https://thefinance.ir > after.txt
#       diff before.txt after.txt
#
# Also runs against staging or a local build:
#       ./scripts/verify-redirects.sh https://new.thefinance.ir
#       ./scripts/verify-redirects.sh http://localhost:3000
#
# PASS means: 301 (or 302 for the one temporary entry) in ONE hop, to a URL
# that returns 200.
#
# These twelve URLs carry 89% of /mag organic clicks. If any of them 404s after
# the switch, roll back — it is not a cosmetic regression.

set -uo pipefail
BASE="${1:-https://thefinance.ir}"

SOURCES=(
  polymarket-predict-future-and-profit-from-it
  worlds-top-10-hedge-funds
  what-is-the-mfi-indicator
  what-is-the-stochastic-indicator
  complete-tutorial-on-the-williams-r-indicator
  what-is-the-cci-indicator
  what-is-the-atr-indicator
  what-is-the-ichimoku-indicator
  what-is-the-obv-indicator
  what-is-a-moving-average-indicator
  low-risk-investment-funds
  introduction-to-persian-tradingview-inchart
)

# Destinations, decoded. curl encodes them on the wire.
DESTINATIONS=(
  "پلیمارکت-polymarket"
  "10-هج-فاند-برتر-دنیا"
  "mfi-indicator"
  "100-stochastic-indicator"
  "آموزش-کامل-اندیکاتور-williams-r"
  "اندیکاتور-cci-چیست؟"
  "اندیکاتور-atr-چیست؟"
  "ichimoku"
  "onbalancevolum_obv"
  "moving-average-indicator"
  "2-ways-to-choose-your-fixed-income-fund"
  "آموزش-tradingview-2026"
)

fail=0

echo "== Redirect sources — expect one hop to a 200 =="
printf "%-46s %-6s %-6s %s\n" "SOURCE" "PLAIN" "SLASH" "HOPS"
for s in "${SOURCES[@]}"; do
  plain=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/mag/$s")
  slash=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/mag/$s/")
  hops=$(curl -s -o /dev/null -L -w '%{num_redirects}' "$BASE/mag/$s/")
  final=$(curl -s -o /dev/null -L -w '%{http_code}' "$BASE/mag/$s/")
  flag=""
  [[ "$plain" =~ ^30[12]$ ]] || { flag="  <-- NOT A REDIRECT"; fail=1; }
  [[ "$slash" =~ ^30[12]$ ]] || { flag="  <-- SLASH FORM NOT A REDIRECT"; fail=1; }
  [ "$hops" = "1" ] || { flag="  <-- $hops HOPS, MUST BE 1"; fail=1; }
  [ "$final" = "200" ] || { flag="  <-- FINAL $final, MUST BE 200"; fail=1; }
  printf "%-46s %-6s %-6s %s%s\n" "$s" "$plain" "$slash" "$hops" "$flag"
done

echo
echo "== Destinations — must return 200 =="
# No trailing slash: the Next app normalises to the slash-free form, so asking
# for the slash form here would report the 308 rather than the page.
for d in "${DESTINATIONS[@]}"; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/mag/$d")
  flag=""
  [ "$code" = "200" ] || { flag="  <-- MUST BE 200"; fail=1; }
  printf "%-44s %s%s\n" "$d" "$code" "$flag"
done

echo
echo "== Trailing slash — an OPEN DECISION, not a pass/fail =="
echo "   WordPress's /%postname%/ serves /mag/<slug>/ WITH a slash; the Next app"
echo "   serves it without and 308s the slash form. That form is part of the URL,"
echo "   so it changes at cutover for all 71 indexed URLs — including the 23 whose"
echo "   slugs still exist and take no redirect today. Run this against PRODUCTION"
echo "   before deciding; see docs/backlog.md."
for s in fundamental-analysis ichimoku mfi-indicator; do
  with=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/mag/$s/")
  without=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/mag/$s")
  printf "%-30s with-slash %-5s without-slash %s\n" "$s" "$with" "$without"
done

echo
echo "== /mag/category/* — indexed with impressions but zero clicks =="
echo "   Decide whether these need redirecting; check before the switch."
for c in category/analysis category/education category/news; do
  printf "%-44s %s\n" "$c" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/mag/$c/")"
done

echo
if [ "$fail" = "0" ]; then echo "PASS"; else echo "FAIL — see the flagged lines above."; fi
exit "$fail"
