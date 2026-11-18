#!/usr/bin/env bash
# Builds the step-3 proof's server packages from the image's built-in package (/proof/A) and
# publishes each in the local release source (/proof/source/v<version>/) as the release workflow
# does: describe-server-package.mjs (package-json, description) and sign-server-package.mjs from the
# repository (/repo), GNU tar + gzip. Signed with the throwaway test key (/keys). Runs in node:22-bookworm.
set -euo pipefail
A=/proof/A
OUT=/proof/source
WORK=/work
SCRIPTS=/repo/scripts/server-package
echo '{"level": 1}' > /tmp/level1.json
echo '{"level": 99}' > /tmp/level99.json
SERVER_PACKAGE_SIGNING_KEY="$(cat /keys/test.key)"
export SERVER_PACKAGE_SIGNING_KEY

# make <version> <kind> [level file]; kinds: plain, migration, fail-after-30s (migration + exits 30 s
# after it starts under the starter), exit-at-start (exits at once under the starter)
make() {
  local version="$1" kind="$2" level="${3:-/tmp/level1.json}" dir="$WORK/$1" base
  rm -rf "$dir"; cp -a "$A" "$dir"
  if [[ "$kind" == migration || "$kind" == fail-after-30s ]]; then
    local name="20261030120000_test_305_${version//[.-]/_}"
    mkdir -p "$dir/prisma/migrations/$name"
    printf 'CREATE TABLE "Test305_%s" ("id" INTEGER PRIMARY KEY);\n' "${version//[.-]/_}" > "$dir/prisma/migrations/$name/migration.sql"
  fi
  if [[ "$kind" == fail-after-30s || "$kind" == exit-at-start ]]; then
    mv "$dir/dist/app.js" "$dir/dist/app-real.js"
    if [[ "$kind" == fail-after-30s ]]; then behavior='setTimeout(() => process.exit(3), 30_000)'; else behavior='process.exit(3)'; fi
    printf "import { startServer } from './app-real.js'\nif (process.env.AUTOBYTEUS_STARTER_SOCKET) %s\nawait startServer()\n" "$behavior" > "$dir/dist/app.js"
  fi
  node "$SCRIPTS/describe-server-package.mjs" package-json --package-dir "$dir" --version "$version" --system-level-file "$level" > /dev/null
  mkdir -p "$OUT/v$version"
  base="$OUT/v$version/autobyteus-server-$version-linux-$(node -p process.arch)"
  tar --sort=name --owner=0 --group=0 --numeric-owner -C "$dir" -cf - . | gzip -1 > "$base.tar.gz"
  node "$SCRIPTS/describe-server-package.mjs" description --package-dir "$dir" --archive "$base.tar.gz" --version "$version" --out "$base.json"
  node "$SCRIPTS/sign-server-package.mjs" --description "$base.json" --public-key /keys/test.pub
  rm -rf "$dir"
}

OUT=/proof/good;  make 1.5.11-beta.6 plain
OUT=/proof/fail;  make 1.5.11-beta.6 fail-after-30s
OUT=/proof/lvl99; make 1.5.11-beta.6 plain /tmp/level99.json
ls -l /proof/*/v*/
