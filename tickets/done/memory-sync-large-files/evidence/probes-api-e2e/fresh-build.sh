#!/bin/bash
export PATH="/opt/homebrew/opt/node@22/bin:/tmp/msync-bin:$PATH"
cd /tmp/apie2e-fresh/clone
echo "## node $(node --version) commit $(git rev-parse --short HEAD) $(date)"
echo "## pnpm install --frozen-lockfile"; pnpm install --frozen-lockfile 2>&1 | tail -15; echo "install exit=${PIPESTATUS[0]}"; date
cd autobyteus-web
echo "## pnpm build:electron:mac -- --arm64"
NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64 2>&1 | tail -60; echo "build exit=${PIPESTATUS[0]}"; date
echo FRESH-DONE
