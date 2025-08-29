#!/usr/bin/env bash
set -euo pipefail

echo "Starting Next.js on port $PORT..."
exec npx next start -p "$PORT"