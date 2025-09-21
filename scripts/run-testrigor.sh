#!/usr/bin/env bash
set -euo pipefail

if ! command -v testrigor >/dev/null 2>&1; then
  echo "testrigor CLI not found. Install with: npm i -g testrigor-cli" >&2
  exit 127
fi

SUITE_ID=${TESTRIGOR_SUITE_ID:-}
TOKEN=${TESTRIGOR_TOKEN:-}

if [ -z "${SUITE_ID}" ] || [ -z "${TOKEN}" ]; then
  echo "Please set TESTRIGOR_SUITE_ID and TESTRIGOR_TOKEN env vars." >&2
  exit 2
fi

echo "Starting testRigor run for suite ${SUITE_ID}..."
testrigor test-suite run "${SUITE_ID}" --token "${TOKEN}"


