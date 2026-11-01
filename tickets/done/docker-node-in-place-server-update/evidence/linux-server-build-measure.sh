#!/usr/bin/env bash
set -euo pipefail
cd /src
corepack enable >/dev/null 2>&1
export ELECTRON_SKIP_BINARY_DOWNLOAD=1 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 PUPPETEER_SKIP_DOWNLOAD=1 CI=1
pnpm install --frozen-lockfile >/out/install.log 2>&1
pnpm -C autobyteus-agent-presentation-contracts build >/out/build.log 2>&1
pnpm -C autobyteus-collaboration-stream-contracts build >>/out/build.log 2>&1
pnpm -C autobyteus-team-stream-contracts build >>/out/build.log 2>&1
pnpm -C autobyteus-server-ts exec prisma generate --schema prisma/schema.prisma >>/out/build.log 2>&1
pnpm -C autobyteus-server-ts build >>/out/build.log 2>&1
pnpm --filter autobyteus-server-ts deploy /out/server --legacy >/out/deploy.log 2>&1
echo "node: $(node --version) abi $(node -p process.versions.modules) arch $(node -p process.arch)"
du -sh /out/server /out/server/node_modules /out/server/dist
du -s /out/server/node_modules/.pnpm/* 2>/dev/null | sort -rn | head -15 | awk '{printf "%d MB %s\n", $1/1024, $2}'
cd /out && tar czf server.tar.gz server && ls -l server.tar.gz | awk '{printf "server.tar.gz %.1f MB\n", $5/1e6}'
