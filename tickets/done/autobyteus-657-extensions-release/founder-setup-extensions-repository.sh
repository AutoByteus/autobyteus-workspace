#!/bin/bash
# autobyteus-657: sets up the AutoByteus extensions repository and its catalog signing key, on the founder's Mac.
# Run by the local Computer Use Operator on the founder's word (2026-11-26), with no questions:
#
#   bash /Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-657-extensions-release/tickets/in-progress/autobyteus-657-extensions-release/founder-setup-extensions-repository.sh --visibility public
#
# RULES FOR WHOEVER RUNS IT (an agent included):
#   - Do not open, read, copy, print, upload or move the private key file. Do not run `cat`, `less`, `open`, `pbcopy`,
#     an editor or any other tool on it or on its folder. Only this script touches it.
#   - Report only what the script prints: the public key, its fingerprint, and OK / STOPPED lines.
#
# What it does:
#   1. creates the GitHub repository AutoByteus/autobyteus-extensions (public: see below);
#   2. creates the Ed25519 key pair on this Mac; the private key goes into a private folder in the home folder
#      (folder 700, file 600, outside every repository) and stays there only until the founder backs it up in his
#      password manager and deletes it; the public key goes into the repository as catalog-public-key.pem;
#   3. checks locally that the pair signs and verifies;
#   4. stores the private key as the repository secret EXTENSIONS_CATALOG_SIGNING_KEY (from the file, by stdin);
#   5. commits the public key and the workflow "Check the signing key", and pushes main;
#   6. runs that workflow on GitHub: it signs with the SECRET and verifies with the PUBLIC key, publishing nothing;
#   7. prints the self-check, the public key, its fingerprint and where the private key file is.
# Nothing it prints contains the private key. Safe to run again after a stop: it reuses what is already done.
set -euo pipefail
umask 077

REPO="AutoByteus/autobyteus-extensions"
LOCAL="/Users/normy/autobyteus_org/autobyteus-extensions"
SUPERREPO="/Users/normy/autobyteus_org/autobyteus-workspace-superrepo"
SECRET_NAME="EXTENSIONS_CATALOG_SIGNING_KEY"
KEYDIR="$HOME/autobyteus-catalog-signing-key"
PRIVATE="$KEYDIR/catalog-signing-key.pem"
TICKET_DIR="$(cd "$(dirname "$0")" && pwd)"
CHECK_WORKFLOW_SOURCE="$TICKET_DIR/check-signing-key.yml"
CHECK_WORKFLOW=".github/workflows/check-signing-key.yml"

ok() { printf 'OK: %s\n' "$1"; }
fail() { printf 'STOPPED: %s\n(No secret was shown. Fix the cause and run the script again.)\n' "$1" >&2; exit 1; }

VISIBILITY=""
while [ $# -gt 0 ]; do
  case "$1" in
    --visibility) VISIBILITY="${2:-}"; shift 2 ;;
    *) fail "unknown argument $1" ;;
  esac
done
# Only public works: every AutoByteus downloads the signed catalog and the packages from this repository's releases
# without signing in to GitHub, and a private repository's release files cannot be downloaded that way.
[ "$VISIBILITY" = "public" ] || fail "run with --visibility public (the founder's decision; a private repository would block every download)"

# 0. Checks before anything changes
command -v gh >/dev/null || fail "the GitHub CLI (gh) is not installed"
command -v node >/dev/null || fail "Node is not installed"
gh auth status >/dev/null 2>&1 || fail "gh is not signed in"
ok "gh signed in as $(gh api user --jq .login)"
[ -f "$CHECK_WORKFLOW_SOURCE" ] || fail "missing $CHECK_WORKFLOW_SOURCE"
[ -d "$LOCAL/.git" ] || fail "the local repository $LOCAL is missing"
cd "$LOCAL"
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || fail "the local repository is not on main"
ORIGIN_SUPER="$(git -C "$SUPERREPO" config --get remote.origin.url)"
PUSH_URL="${ORIGIN_SUPER%/*}/autobyteus-extensions.git"
case "$PUSH_URL" in git@*:AutoByteus/autobyteus-extensions.git) ;; *) fail "could not derive the push address from $ORIGIN_SUPER" ;; esac
case "$KEYDIR" in "$LOCAL"*|"$SUPERREPO"*|/Users/normy/autobyteus_org/*) fail "the key folder must be outside every repository" ;; esac

# 1. The GitHub repository
if gh repo view "$REPO" >/dev/null 2>&1; then
  [ "$(gh repo view "$REPO" --json visibility --jq .visibility)" = "PUBLIC" ] || fail "$REPO exists and is not public"
  ok "repository $REPO exists and is public (reused)"
else
  gh repo create "$REPO" --public --description "AutoByteus extensions: packages and the signed catalog" >/dev/null
  ok "repository $REPO created, public"
fi

# 2. The key pair (the private key is written by Node straight to its file; it is never on a command line or printed)
mkdir -p "$KEYDIR"; chmod 700 "$KEYDIR"
if [ -f "$PRIVATE" ]; then
  ok "private key file already exists from an earlier run (reused, not shown)"
else
  KEY_FILE="$PRIVATE" node -e '
    const { generateKeyPairSync } = require("node:crypto");
    const fs = require("node:fs");
    const { privateKey } = generateKeyPairSync("ed25519");
    fs.writeFileSync(process.env.KEY_FILE, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600, flag: "wx" });
  '
  ok "private key created in $KEYDIR (not shown)"
fi
chmod 600 "$PRIVATE"
KEY_FILE="$PRIVATE" OUT="catalog-public-key.pem" node -e '
  const { createPrivateKey, createPublicKey } = require("node:crypto");
  const fs = require("node:fs");
  const privateKey = createPrivateKey(fs.readFileSync(process.env.KEY_FILE));
  if (privateKey.asymmetricKeyType !== "ed25519") { console.error("not an Ed25519 key"); process.exit(1); }
  fs.writeFileSync(process.env.OUT, createPublicKey(privateKey).export({ type: "spki", format: "pem" }), { mode: 0o644 });
' || fail "the private key file is not a readable Ed25519 key"
chmod 644 catalog-public-key.pem
ok "public key written to catalog-public-key.pem"

# 3. Local check: the pair signs and verifies (Node reads the file; nothing is printed)
KEY_FILE="$PRIVATE" node -e '
  const { createPrivateKey, createPublicKey, sign, verify } = require("node:crypto");
  const fs = require("node:fs");
  const data = fs.readFileSync("catalog.json");
  const signature = sign(null, data, createPrivateKey(fs.readFileSync(process.env.KEY_FILE)));
  process.exit(verify(null, data, createPublicKey(fs.readFileSync("catalog-public-key.pem")), signature) ? 0 : 1);
' || fail "the private key and catalog-public-key.pem do not match"
ok "local check: a signature made with the private key verifies with catalog-public-key.pem"

# 4. The repository secret, from the file by stdin
gh secret set "$SECRET_NAME" --repo "$REPO" < "$PRIVATE" >/dev/null
SECRET_LINE="$(gh secret list --repo "$REPO" | grep "^$SECRET_NAME[[:space:]]" || true)"
[ -n "$SECRET_LINE" ] || fail "the secret $SECRET_NAME is not listed"
ok "secret set: $(printf '%s' "$SECRET_LINE" | tr '\t' ' ')"

# 5. Commit the public key and the check workflow; push main
mkdir -p .github/workflows
cp "$CHECK_WORKFLOW_SOURCE" "$CHECK_WORKFLOW"
git add catalog-public-key.pem "$CHECK_WORKFLOW"
if ! git diff --cached --quiet; then
  git commit -q -m "chore: add the catalog public key and the signing key check (autobyteus-657)"
fi
git ls-files --error-unmatch catalog-signing-key.pem >/dev/null 2>&1 && fail "a private key file is tracked"
[ -z "$(git status --porcelain)" ] || fail "the local repository has uncommitted changes"
if [ -z "$(git remote)" ]; then git remote add origin "$PUSH_URL"; fi
[ "$(git config --get remote.origin.url)" = "$PUSH_URL" ] || fail "the local repository's origin is not $PUSH_URL"
git push -q -u origin main
[ "$(git ls-remote origin refs/heads/main | cut -f1)" = "$(git rev-parse HEAD)" ] || fail "GitHub's main differs from the local main"
ok "pushed main at $(git rev-parse --short HEAD); GitHub's main equals the local main"

# 6. The check on GitHub: sign with the SECRET, verify with the PUBLIC key
started=""
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
  if gh workflow run check-signing-key.yml --repo "$REPO" --ref main >/dev/null 2>&1; then started=yes; break; fi
  sleep 5
done
[ -n "$started" ] || fail "could not start the workflow \"Check the signing key\" (are Actions enabled for $REPO?)"
sleep 5
RUN_ID=""
for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
  RUN_ID="$(gh run list --repo "$REPO" --workflow check-signing-key.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)"
  [ -n "$RUN_ID" ] && break
  sleep 5
done
[ -n "$RUN_ID" ] || fail "the workflow run did not appear"
CONCLUSION=""
for attempt in $(seq 1 120); do
  STATUS="$(gh run view "$RUN_ID" --repo "$REPO" --json status --jq .status)"
  if [ "$STATUS" = "completed" ]; then CONCLUSION="$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion --jq .conclusion)"; break; fi
  sleep 5
done
[ "$CONCLUSION" = "success" ] || fail "GitHub check \"Check the signing key\" run $RUN_ID: ${CONCLUSION:-did not finish in 10 minutes}"
ok "GitHub check passed (run $RUN_ID): a signature made with the SECRET verifies with catalog-public-key.pem"

# 7. Summary (public information only)
gh api "repos/$REPO/contents/catalog-public-key.pem" --jq .name >/dev/null || fail "catalog-public-key.pem is not on GitHub"
ok "catalog-public-key.pem is on GitHub"
FINGERPRINT="$(node -e '
  const { createPublicKey, createHash } = require("node:crypto");
  const der = createPublicKey(require("node:fs").readFileSync("catalog-public-key.pem")).export({ type: "spki", format: "der" });
  console.log("SHA256:" + createHash("sha256").update(der).digest("hex"));
')"
printf '\nPublic key (safe to share):\n'
cat catalog-public-key.pem
printf 'Public key fingerprint: %s\n' "$FINGERPRINT"
printf '\nFOR THE FOUNDER ONLY: the private key file is %s\n' "$PRIVATE"
printf 'Back it up in your own password manager (as a file attachment or secure note), then delete the folder %s.\n' "$KEYDIR"
printf 'Until then nobody else opens it. GitHub cannot show the secret again: without your backup, a lost key means a new key and a new app for everybody.\n'
printf '\nDONE\n'
