# API-REV-002 canonical environment-corrected rerun

Actual run: uid/gid24019, fresh private HOME/bin/TMPDIR/runtime, unmodified API-REV-001 controller and durable repository probe, same retained worktree native binary. No source override/rebuild. `resource-session.mjs` only samples statfs at20ms and starts the full non-root Xvfb session; no changed assertions, suppressed requests or paid inference.

Run from `/home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse`, after reading TESTING.md and docs/isolated-app-instances.md. Pick a NEW dedicated unused numeric UID/GID for another run and a fresh OUT. Root sets up OWNED namespace; application stays non-root with normal sandbox. Never run the mount command in the parent's namespace.512MiB is this tested capacity, not a global minimum.

Preparation (the original OWN was removed after passing cleanup):
```bash
ROOT="$PWD"
EVIDENCE="$ROOT/tickets/in-progress/delegated-team-default-collapse/api-e2e-evidence/api-rev-002"
TEST_UID=24019
# Verify no existing account/process before using this dedicated numeric identity.
getent passwd "$TEST_UID" || true
ps -eo uid,pid,cmd | awk -v uid="$TEST_UID" '$1 == uid {print}'
OWN=$(mktemp -d /tmp/collapse-api-rev002.XXXXXX)
mkdir -p "$OWN/bin" "$OWN/home" "$OWN/tmp" "$OWN/runtime"
chmod 711 "$OWN"
corepack enable --install-directory "$OWN/bin"
cp "$ROOT/tickets/in-progress/delegated-team-default-collapse/api-e2e-evidence/api-rev-001/scripted-agy-wrapper.txt" "$OWN/bin/agy"
chmod 755 "$OWN/bin/agy"
printf 'export PATH="%s/bin:/usr/bin:/bin"\n' "$OWN" > "$OWN/home/.bashrc"
chown -R "$TEST_UID:$TEST_UID" "$OWN/home" "$OWN/tmp" "$OWN/runtime"
chmod 700 "$OWN/home" "$OWN/tmp" "$OWN/runtime"
OUT="$EVIDENCE/<NEW-output-directory>"
mkdir "$OUT"
chown "$TEST_UID:$TEST_UID" "$OUT"
SESSION="$ROOT/tickets/in-progress/delegated-team-default-collapse/api-e2e-evidence/api-rev-001/desktop-session.mjs"
```

Private resource intervention + UNMODIFIED canonical session:
```bash
grep ' /dev/shm ' /proc/self/mountinfo > "$OUT/parent-mountinfo-before.txt"
readlink /proc/self/ns/mnt > "$OUT/parent-namespace-before.txt"
unshare --mount --propagation private --fork bash -c '
  set -e
  mount -t tmpfs -o size=512M,nosuid,nodev,noexec,mode=1777 apirev002-shm /dev/shm
  trap "umount /dev/shm" EXIT
  grep " /dev/shm " /proc/self/mountinfo > "$2/private-mountinfo.txt"
  readlink /proc/self/ns/mnt > "$2/private-namespace.txt"
  set +e
  node "$5" "$1" "$2" "$3" "$4"
  STATUS=$?
  df -B1 /dev/shm > "$2/private-shm-after.txt"
  exit "$STATUS"
' bash "$OWN" "$OUT" "$TEST_UID" "$SESSION" "$EVIDENCE/resource-session.mjs"
STATUS=$?
grep ' /dev/shm ' /proc/self/mountinfo > "$OUT/parent-mountinfo-after.txt"
readlink /proc/self/ns/mnt > "$OUT/parent-namespace-after.txt"
echo "Session exit: $STATUS"
```

Inspect desktop-receipt.json/case-ledger.md/journey/evidence.json, resource-receipt.json/shm-samples.json, native logs and hashes. Final restart returns8 collapsed Teams after the live addition/closure case. Strict errors/failed-request assertions remain. Same instance/control/server ports throughout canonical lifecycle.

Cleanup only the exact owned resources: canonical stop/list receipts must show data/ports removed/registry empty; no dedicated-UID process/Xvfb remains. Private tmpfs is unmounted on exit and parent mount/namespace must match before/after; then remove exact OWN using a safe filesystem operation. No host security, global resource, user app or shared data changes. Keep current build/dependencies/worktree until reviewer/Delivery finalization. Actual completed run/cleanup is in native-shm512/ and cleanup-receipt.json, not an inferred Pass from this recipe.
