# CRR-001 native capacity comparison and API rerun recipe

Run only from `/home/autobyteus/workspace/.codex/worktrees/delegated-team-default-collapse`. The current unpacked **same worktree** build is retained; no installed/user app is a target. Read TESTING.md and docs/isolated-app-instances.md first. Diagnostic scripts here are evidence tools, not durable test changes. They add passive CDP/network and 20ms filesystem-capacity sampling to the original native probe/session.

## Preparation used for both reviewer runs

Root prepares test-owned directories; Electron runs non-root. UID/GID24018 was verified unused, and has no remaining processes after cleanup. Pick a dedicated unused identity for another run. Both runs used a single private home whose canonical registry was empty between runs; data/ports were fresh for each instance.

```bash
ROOT="$PWD"
EVIDENCE="$ROOT/tickets/in-progress/delegated-team-default-collapse/code-review-evidence/crr-001"
TEST_UID=24018
TEST_GID=24018
# Confirm no existing account/process is being commandeered.
ps -eo uid,pid,cmd | awk -v uid="$TEST_UID" '$1 == uid {print}'
OWN=$(mktemp -d /tmp/collapse-review-crr001.XXXXXX)
mkdir -p "$OWN/bin" "$OWN/home" "$OWN/tmp" "$OWN/runtime"
chmod 711 "$OWN"
corepack enable --install-directory "$OWN/bin"
cp "$ROOT/tickets/in-progress/delegated-team-default-collapse/api-e2e-evidence/api-rev-001/scripted-agy-wrapper.txt" "$OWN/bin/agy"
chmod 755 "$OWN/bin/agy"
printf 'export PATH="%s/bin:/usr/bin:/bin"\n' "$OWN" > "$OWN/home/.bashrc"
chown -R "$TEST_UID:$TEST_GID" "$OWN/home" "$OWN/tmp" "$OWN/runtime"
chmod 700 "$OWN/home" "$OWN/tmp" "$OWN/runtime"
OUT="$EVIDENCE/<fresh-review-run-directory>"
mkdir "$OUT"
chown "$TEST_UID:$TEST_GID" "$OUT"
```

Reviewer failure reproduction (ambient64MiB `/dev/shm`):

```bash
setpriv --reuid="$TEST_UID" --regid="$TEST_GID" --clear-groups \
  env -i PATH="$OWN/bin:/usr/bin:/bin" HOME="$OWN/home" TMPDIR="$OWN/tmp" \
  XDG_RUNTIME_DIR="$OWN/runtime" LANG=C.UTF-8 SHELL=/bin/bash \
  xvfb-run -a -e "$OWN/tmp/xvfb.log" \
  -s '-screen 0 1600x1100x24 -nolisten tcp' \
  node "$EVIDENCE/desktop-diagnostic-session.mjs" "$OUT" > "$OUT/session.log" 2>&1
```

## Capacity intervention used (private namespace only)

The next block **does not remount or resize the parent's `/dev/shm`**. `--propagation private` and a separate mount namespace precede the mount. Never execute its `mount` command directly in the parent namespace. The verified worker supports `unshare --mount`; no AppArmor/sysctl/sandbox override was needed.

Use a fresh OUT. The reviewer used the same diagnostic session for the positive comparison. For the API owner's unmodified durable-probe rerun, use `SESSION="$ROOT/tickets/in-progress/delegated-team-default-collapse/api-e2e-evidence/api-rev-001/desktop-session.mjs"` instead; that existing controller invokes the durable repository probe and canonical start/restart/stop.

```bash
SESSION="$EVIDENCE/desktop-diagnostic-session.mjs"
cat /proc/self/mountinfo | grep ' /dev/shm ' > "$OUT/parent-mountinfo-before.txt"
unshare --mount --propagation private --fork bash -c '
  set -e
  mount -t tmpfs -o size=512M,nosuid,nodev,noexec,mode=1777 crr001-shm /dev/shm
  cat /proc/self/mountinfo | grep " /dev/shm " > "$2/private-mountinfo.txt"
  set +e
  setpriv --reuid="$3" --regid="$4" --clear-groups \
    env -i PATH="$1/bin:/usr/bin:/bin" HOME="$1/home" TMPDIR="$1/tmp" \
    XDG_RUNTIME_DIR="$1/runtime" LANG=C.UTF-8 SHELL=/bin/bash \
    xvfb-run -a -e "$1/tmp/xvfb.log" \
    -s "-screen 0 1600x1100x24 -nolisten tcp" \
    node "$5" "$2" > "$2/session.log" 2>&1
  STATUS=$?
  df -B1 /dev/shm > "$2/private-shm-after.txt"
  umount /dev/shm
  exit "$STATUS"
' bash "$OWN" "$OUT" "$TEST_UID" "$TEST_GID" "$SESSION"
STATUS=$?
cat /proc/self/mountinfo | grep ' /dev/shm ' > "$OUT/parent-mountinfo-after.txt"
cp "$OWN/tmp/xvfb.log" "$OUT/xvfb.log"
echo "Session exit: $STATUS"
```

512MiB is the tested isolated capacity, **not a new product minimum or global host requirement**. A supported adequately provisioned owned runner is another option when private namespace setup is unavailable. Keep sandbox/security and all strict network/assertion checks intact.

## Evidence and cleanup

Inspect case-ledger, journey/evidence.json (including failedRequests/errors), desktop-receipt.json, native server/electron logs and lifecycle JSONs. Diagnostic sessions also retain shm-samples.json and CDP JSONL. Use `origin-comparison.json` for the two completed reviewer results/hashes. Do not turn the diagnostic Pass into an automatic canonical API Pass; rerun/reconcile under API ownership.

Canonical stop must confirm released own ports/data and empty own registry; inspect for remaining dedicated-UID processes. Preserve Xvfb/logs before removing the exact private OWN directory. Cleanup only what the run started; never kill processes globally or touch the user's app/data. If interrupted, use the returned instanceId and the same private HOME/TMPDIR for canonical stop. Current reviewer cleanup is recorded in cleanup-receipt.txt.
