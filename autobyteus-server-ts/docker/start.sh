#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example. Update GITHUB_PAT if needed."
fi

echo "Starting AutoByteus server container..."
docker compose up -d --force-recreate

echo
echo "Server is starting in background."
echo "Logs: docker compose logs -f autobyteus-server"
