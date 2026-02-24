#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[verify-android-profile] Verifying Android profile does not resolve/link/import node-pty"

dep_graph_probe="$(pnpm --filter autobyteus-ts list node-pty --depth 1 --json)"
if ! printf '%s' "$dep_graph_probe" | node -e "const fs=require('node:fs'); const payload=fs.readFileSync(0,'utf8'); const data=JSON.parse(payload); const hasNodePty=data.some((pkg)=>Boolean(pkg.dependencies?.['node-pty'])); process.exit(hasNodePty ? 1 : 0);"; then
  echo "[verify-android-profile] FAIL: autobyteus-ts dependency graph still resolves node-pty"
  exit 1
fi

import_probe="$(pnpm --filter autobyteus-ts exec node -e 'import("node-pty").then(()=>console.log("node-pty-present")).catch(()=>console.log("node-pty-missing"))')"
if [[ "$import_probe" != *"node-pty-missing"* ]]; then
  echo "[verify-android-profile] FAIL: node-pty import succeeded unexpectedly"
  echo "$import_probe"
  exit 1
fi

factory_probe="$(ANDROID_ROOT=/system pnpm --filter autobyteus-ts exec node -e 'import("autobyteus-ts/tools/terminal/session-factory.js").then(m=>console.log(m.getDefaultSessionFactory().name))')"
if [[ "$factory_probe" != *"DirectShellSession"* ]]; then
  echo "[verify-android-profile] FAIL: Android policy did not resolve DirectShellSession"
  echo "$factory_probe"
  exit 1
fi

echo "[verify-android-profile] PASS"
