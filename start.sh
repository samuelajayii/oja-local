#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"

echo "Starting Next.js on port ${PORT}..."
# start Next in production mode and ensure it listens on $PORT
exec npx next start -p "${PORT}"
