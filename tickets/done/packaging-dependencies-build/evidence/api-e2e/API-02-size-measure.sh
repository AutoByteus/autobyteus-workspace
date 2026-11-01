#!/bin/bash
set -u
C=/private/tmp/api-e2e-345-size
rm -rf "$C" /private/tmp/api-e2e-345-new /private/tmp/api-e2e-345-base
git clone -q --no-checkout /Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build "$C" || exit 1
cd "$C" || exit 1
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
size(){ echo "$1 du=$(du -sk "$2" | cut -f1) KB apparent=$(python3 -c "
import os,sys
t=0
for r,d,f in os.walk(sys.argv[1]):
    for x in f:
        try: t+=os.lstat(os.path.join(r,x)).st_size
        except OSError: pass
print(t//1024)" "$2") KB"; }
measure(){ # name rev flags
  echo "### $1 at $2: deploy flags '$3'"
  git checkout -q "$2" || return
  git rev-parse --short HEAD
  pnpm install --frozen-lockfile > /tmp/api-e2e-345-size-install-$1.log 2>&1 || { echo "install failed"; return; }
  (pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma && pnpm -C autobyteus-server-ts build) > /tmp/api-e2e-345-size-build-$1.log 2>&1 || { echo "build failed"; tail -5 /tmp/api-e2e-345-size-build-$1.log; return; }
  pnpm --filter autobyteus-server-ts deploy /private/tmp/api-e2e-345-$1 --legacy $3 > /tmp/api-e2e-345-size-deploy-$1.log 2>&1 || { echo "deploy failed"; tail -5 /tmp/api-e2e-345-size-deploy-$1.log; return; }
  echo "folder: $(ls -A /private/tmp/api-e2e-345-$1 | tr '\n' ' ')"
  size "$1 BEFORE prisma generate" /private/tmp/api-e2e-345-$1
  ( cd /private/tmp/api-e2e-345-$1 && node_modules/.bin/prisma generate --schema prisma/schema.prisma > /tmp/api-e2e-345-size-gen-$1.log 2>&1 ) || echo "generate failed"
  size "$1 AFTER  prisma generate" /private/tmp/api-e2e-345-$1
  echo "virtual store packages: $(ls /private/tmp/api-e2e-345-$1/node_modules/.pnpm | wc -l)  top-level @types/vitest/typescript: $(ls /private/tmp/api-e2e-345-$1/node_modules | grep -c '^@types$\|^vitest$\|^typescript$')  src/tests present: $(ls -d /private/tmp/api-e2e-345-$1/src /private/tmp/api-e2e-345-$1/tests 2>/dev/null | wc -l)"
  node autobyteus-web/scripts/verify-packaged-server-startup.mjs --server-root /private/tmp/api-e2e-345-$1 2>&1 | tail -2
}
measure new 92ff204d33 "--prod"
echo
measure base efd28d5c4a ""
echo DONE
