#!/usr/bin/env bash
# Build script for boilerplate-cli-ui-deno
set -euo pipefail
cd "$(dirname "$0")"

DENO="${DENO:-deno}"
command -v "$DENO" >/dev/null 2>&1 || { echo "error: '$DENO' not found (set DENO=/path/to/deno)" >&2; exit 1; }

APP_NAME="boilerplate-cli-ui-deno"

echo "Building ${APP_NAME}..."
"$DENO" compile --allow-net --allow-read --allow-write --allow-env \
  -o "${APP_NAME}" src/cli.ts

echo "Built: ./${APP_NAME}"
ls -lh "${APP_NAME}"
