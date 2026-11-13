#!/usr/bin/env bash
# Checks that a deployed copy of the site serves the pages readers and tools
# actually request. Usage: scripts/smoke-check.sh BASE_URL [ATTEMPTS]
#
# BASE_URL has no trailing slash, e.g. https://happyview.dev or
# https://sites.wisp.place/happyview.dev/happyview-docs. A fresh deploy takes a
# moment to reach wisp.place's edge, so the whole set is retried every 15
# seconds, up to ATTEMPTS times (default 8).
set -uo pipefail

base="${1:?usage: smoke-check.sh BASE_URL [ATTEMPTS]}"
base="${base%/}"
attempts="${2:-8}"

# Each check is "path|expected". An expected value of "301 <url>" means the
# path must answer that redirect itself. Anything else is text that the page
# must contain after following redirects, which must end in a 200.
checks=(
  "/|Write the lexicon. HappyView serves the API."
  "/docs|<title>Introduction | HappyView"
  "/docs/|<title>Introduction | HappyView"
  "/docs/guides/backfill|<title>Backfill | HappyView"
  "/docs/guides/backfill/|<title>Backfill | HappyView"
  "/llms.txt|# HappyView"
  "/sitemap-index.xml|<sitemapindex"
  "/guides/backfill|301 $base/docs/guides/backfill"
)

run_checks() {
  local failed=0 entry path expected body result
  for entry in "${checks[@]}"; do
    path="${entry%%|*}"
    expected="${entry#*|}"
    if [[ "$expected" == "301 "* ]]; then
      result=$(curl -sS -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 15 "$base$path" 2>&1 || true)
      if [ "$result" = "$expected" ]; then
        echo "  ok   $path -> $result"
      else
        echo "  FAIL $path: expected $expected, got $result"
        failed=1
      fi
    else
      body=$(mktemp)
      result=$(curl -sS -L --max-redirs 3 -o "$body" -w '%{http_code}' --max-time 15 "$base$path" 2>&1 || true)
      if [ "$result" = "200" ] && grep -qF -- "$expected" "$body"; then
        echo "  ok   $path -> 200"
      elif [ "$result" = "200" ]; then
        echo "  FAIL $path: 200, but the page doesn't contain \"$expected\""
        failed=1
      else
        echo "  FAIL $path: HTTP $result"
        failed=1
      fi
      rm -f "$body"
    fi
  done
  return $failed
}

for attempt in $(seq 1 "$attempts"); do
  echo "Attempt $attempt/$attempts against $base"
  if run_checks; then
    exit 0
  fi
  [ "$attempt" -lt "$attempts" ] && sleep 15
done

echo "::error::$base failed the smoke check after $attempts attempts"
exit 1
