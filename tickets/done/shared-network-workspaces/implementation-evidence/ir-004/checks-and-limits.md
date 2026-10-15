# IR-004 — CR002 / API-F001 correction and personal checks

## Current result and source

**Local Fix Complete; independent source re-review required.** CRR003 remains the
canonical Fail; API-REV001 remains Fail/confidence57.14% until its owner revalidates.
CRR002's prior source Pass and CR001 resolution are retained. Approved018/Ready019/
ARCH003 and Large/High unchanged. No delegation or broader API signoff.

Fix commit: **174e480bd0cfaee29f22fd46b1922afbb274e56b**.
Production hash: **497efd6abb0c2cfa4c740a87f005c529cbf026a6fa218b3acd345826f4a923da**.
Guest binary: `ports-binary.json`, SHA256
**e8c88d75a1ce43fcffd78f831dbfde38e8f4c11af06274251b600ea7bd5535c1**;
identical to the final native crossbuild. Built before the source commit from the
exact audited source; embedded metadata remains development-unqualified, not release.

## Bounded correction

Existing Apple backend activation (`ApplyApple`, `EnsureApple`) now completes only
after both selected-endpoint TCP NFSv3/MOUNTv3 registrations exist **and each actual
program answers NULL at its registered port**. Setup passes its validated endpoint.
`apple_startup.go` owns the small serial startup observation loop; no new service,
worker, daemon policy, persistent state or generic retry framework. Explicit ports
avoid an observed Apple implicit-lookup misaddress during cold startup; neither
registry/PID/command status nor a fixed blind sleep is accepted as readiness.

Only missing mappings or known RPC not-registered/refused/timed-out/broken-pipe
conditions receive up to a30s observation window,250ms between unsuccessful
observations, with rpcinfo's2s request timeout. This is NOT a hard wall-clock bound
on OS commands/mounts/file operations. Invalid activation, malformed registration,
authentication/version/procedure and other unknown errors remain immediate errors.
At expiry, original failure is retained and setup stays incomplete. The mount and
nonroot mounted probe still run once; a true failure does not become hostReady.

The same existing administrative lock is held through synchronous commands and
inherited by their child processes. No reactivation within the loop, lock release,
force-unmount, rollback change, source/UUID recreation or discarded pending intent.
Existing nfsd checkexports/enable/restart/update/start policy, local-lock hard mount,
source qualification/mapall, private/public mode fix and job sequencing remain.
Existing supervisor reconciliation invokes this backend boundary as before; no app
file/run/action acquires an outage probe. **D001/DEC015 remains deferred, NOT fixed.**

## Personally executed local checks

Exact commands/environments/times: `run-local-checks.py`, `local-checks-result.json`.
Temporary official Go1.27.2 toolchain, clean HOME/PATH/TMPDIR, no provider variables.

| Check | Current result / evidence |
| --- | --- |
| `go test -race -count=1 -v ./...` | All7 test packages pass; `go-race.log`. Includes CR001 real-bootstrap-to-Go permission fixture, called child verify/create and both virtual layouts; standalone child discovery skip is not a missing parent execution. |
| `go vet ./...` | Pass; `go-vet.log`. |
| Python installer + packaging/launcher fixtures | 6 pass,1 standalone child skip; that child executes through Go above. No real public download or privileged OS action in this fixture. |
| Darwin/Linux x arm64/amd64 `go build -trimpath` | All4 compile. Only native Darwin-arm64 version smoke executes; foreign binaries not runtime proof. |
| Native version / unqualified publishing gate | development-unqualified; `--check-publish` expected refusal remains. |
| Mutation: activation command exit only | Expected failing assertions, no RPC serving checks. |
| Mutation: one observation/no startup wait | Expected cold-transition regression failure. |
| Mutation: blanket retry | Expected fatal-error assertions, including authentication/version/procedure failures. |

Durable new `apple_startup_test.go` covers actual orchestration ordering, missing/
wrong-version/UDP-only registrations, partial NFS-before-MOUNT, serving transitions,
no reactivation, selected endpoint/exact ports, malformed/duplicate/invalid ports,
true activation/procedure/permission errors, bounded unsuccessful observation and
preserved original errors. Three mutation controls fail on assertions, not compile
errors. These are local controlled boundary tests, not native-matrix substitutions.

## Native Mac narrow regression (not full API/E2E)

All runs used a fresh credential-free cached public Mac VM clone, real admin501:20,
real guest sudo/root installation under077, native nfsd and one public `create`.
No shared host directory, private credential, provider call, user node, manual
reconnect, OS workaround, peer/Docker step or outage injection. Correct diagnostics
use `/usr/bin/nfsstat`. Mac VM is **not physical LAN proof**. `run-mac-cold.py` and
`vm-summary.json` retain each invocation, result, hashes, proof and exact cleanup.

| Run / implementation | Result |
| --- | --- |
| baseline-trace / reviewed c80ec source | Reproduced mount_nfs74/EPROGUNAVAIL25.445s; passive trace initially refused TCP111. |
| fixed-trace / candidate1 | Pass12.439s; not accepted alone. |
| fixed-plain / candidate1 | Fail10.916s; observed RPC Broken pipe. |
| final-trace / candidate2 (historical filename) | Fail14.455s; implicit lookup sent NFS NULL to port111 after lookup timeout, RPC Procedure unavailable. |
| transport-trace / candidate3 | Fail12.949s; alternative implicit-lookup spelling did not fix it. |
| ports-trace / final source | Public create PASS16.975s; overall harness Fail retained because its extra assertion incorrectly required private GID0 rather than root UID0 +0700/0600. Actual root:admin modes valid. Source/mounted bytes, inode, UUID and live job proven. No product change for this harness correction. |
| **ports-plain / final source** | **Pass13.407s**, no tracing. |
| **ports-confirm-trace / same final source** | **Pass11.496s**, separate fresh clone, passive trace. |

The last two complete harness passes assert source inode/device/UID/GID/mode
preserved, original and mounted content SHA equal, source and mounted UUID equal
the returned connection UUID, pending intent cleared, exact installed binary hash,
root-owned private0700/0600, public/executable traversal and running launchd job.
The product's real nonroot source and mounted probes also completed before hostReady.
No manual reconnect was used anywhere in this round.

`startup-investigation.md` separates observed transport/RPC facts from inference,
links primary OS/RPC contracts, and explains rejected candidates. `ports-trace-packets-rpc.json` and `ports-trace-null-proof.json` index initial incomplete
registrations followed by successful NFS and MOUNT NULL replies before mount.
Packet decoder is evidence-only, not a complete reassembler; no absence claim from
skipped fragments. Raw text and failed candidates retained, not rewritten as green.

## Preservation, cleanup and remaining gates

`source-audit.json`: five changed source/test files; four production files all below
500 nonempty lines and each delta below220. Apple startup owner is98 nonempty
lines.906 reviewed source/authority/historical-evidence paths compare byte-identical
to the CRR003 receipt input. API-owned REST test fix af9f23 untouched. No migration,
compatibility fallback, new source retention, local shared-workspace fallback or
change to configured private links/AGY/source Update/Remove. CR001 remains fixed.

`cleanup.json`: all8 exact clones stopped/deleted, processes exited, public image
cache retained; owned Go toolchain/build/mutation/fixture scratch removed. Earlier
five generated dist directories left untracked/unstaged. No host mounts or user
resources touched. No background work remains from this round.

Unchanged TS/frontend/runtime evidence is carried from IR002, not claimed rerun.
FUP001 remains PM-owned: current full Nuxt/Electron retain their three baseline
updater failures; candidate-only green logs are not current passes. No duplicate
follow-up/delegation or unrelated patch. New-round rendered feedback N/A: backend
activation only. Prior guide rendered proof retained.

After source Pass, API owner must rerun its failed current cold case and remaining
matrix. Native/managed Docker clients on BOTH Mac/Linux, Linux native/Docker storage,
peer operations/reboot/detach/preservation, current native skills/assets/peer-close/
restore/Standalone-Team-Org, actual mounted healthy desktop previews, independent
physical Mac/Linux/Docker, docs/finalization/user verification and authorized release
remain outstanding. Default release/Guide unavailable intentionally. No merge/push/
release or Task Done. This narrow fix does not claim all testing/delivery complete.

## Final package integrity

`final-source-check.json` verifies the five changed hashes,906 unchanged input
paths, append-only revision history, both passing VM source/binary identities,
command receipts and cleanup. Current implementation handoff/revision are excluded
from the unchanged count because this round updates them. `package-index.json`
indexes evidence with hashes; `routing.json` records the fresh Local Fix rule.
`packaging-check.json` retains raw native packet/test log whitespace exactly: the
whole staged diff has log-only whitespace warnings; source and all other authored
artifacts pass the whitespace check. No evidence is normalized into a different run.
