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

make 1.5.12 plain
make 1.5.13 migration
make 1.5.14 fail-after-30s
make 1.5.15 plain /tmp/level99.json
make 1.5.16 plain
make 1.5.20 exit-at-start
# 1.5.16: the archive is changed after signing (ARCHIVE_MISMATCH)
printf 'x' >> "$OUT/v1.5.16/autobyteus-server-1.5.16-linux-$(node -p process.arch).tar.gz"
# 1.5.17: the older signed pair of 1.5.12 published under 1.5.17's names (DESCRIPTION_MISMATCH)
arch="$(node -p process.arch)"; mkdir -p "$OUT/v1.5.17"
for suffix in .tar.gz .json .json.sig; do cp "$OUT/v1.5.12/autobyteus-server-1.5.12-linux-$arch$suffix" "$OUT/v1.5.17/autobyteus-server-1.5.17-linux-$arch$suffix"; done
# 1.5.18: a valid package signed with another key (SIGNATURE_INVALID)
mkdir -p "$OUT/v1.5.18"
for suffix in .tar.gz .json; do cp "$OUT/v1.5.12/autobyteus-server-1.5.12-linux-$arch$suffix" "$OUT/v1.5.18/autobyteus-server-1.5.18-linux-$arch$suffix"; done
sed -i 's/"version": "1.5.12"/"version": "1.5.18"/; s/autobyteus-server-1.5.12-/autobyteus-server-1.5.18-/' "$OUT/v1.5.18/autobyteus-server-1.5.18-linux-$arch.json"
node -e "const c=require('crypto'),f=require('fs');const k=c.generateKeyPairSync('ed25519').privateKey;const d='$OUT/v1.5.18/autobyteus-server-1.5.18-linux-$arch.json';f.writeFileSync(d+'.sig',c.sign(null,f.readFileSync(d),k).toString('base64'))"
# 1.5.19: nothing published (NO_PACKAGE_FOR_VERSION)
ls -l "$OUT"/v*/
