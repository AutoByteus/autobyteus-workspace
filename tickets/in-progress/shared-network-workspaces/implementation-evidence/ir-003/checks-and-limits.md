# IR-003 — CR-001 local correction and personal checks

## Authority / delta

Trigger: Code Reviewer **CRR-001 Fail / Local Fix / CR-001 P1**, source-review
artifacts `d4ac42107e` and informational FUP001 custody receipt `caa318d795`.
Approved SR018 / Ready SR019 / ARCH-REV003 unchanged. Large / High retained.
Fix commit **dfeac830f468994255fdafc31f66cdbeee1852cc**. No delegation.

Only production change: `autobyteus-nfs/internal/platform/commands.go` now chmods
the exact directory immediately after successful creation under its trusted
parent. Recursive newly created executable/public parents get0755; private leaves
keep0700. A pre-existing entry never reaches chmod. Failed mkdir does not fall
through into adoption. Root ownership/ancestor validation still uses `TrustedPath`;
no installer umask reset, public source/data permission change or broad recursive
chmod. Existing unsafe directories/files remain refused and unmodified. Existing
restrictive-but-trusted directories are not repaired/adopted by this fresh-install
fix. No persisted-data migration or new supported scenario.

The private recursive function accepts a trust-check callback so the fixture can
exercise its real mkdir/chmod/recursion without root; the sole production entry
always supplies `TrustedPath`. No environment switch or exported bypass was added.
Production owner grew78 ->86 nonempty lines, below both source-size triggers.
The other two changed files are tests;137 other IR002 audited paths remain identical.
Current production hash: `c80ec19ffc7e496687b341738796f8c7c915af829209081779e43cffc88f5a85`.

## Personal execution and reproduction

From worktree root, with Go >=1.25 available:

```sh
GO_BINARY=/absolute/path/to/go python3 tickets/in-progress/shared-network-workspaces/implementation-evidence/ir-003/run-checks.py
```

The recorded runner is Darwin-arm64 (its native-smoke step is host-specific).
Go1.27.2 official archive checksum matches the retained IR002 verified metadata;
a new task-owned temporary toolchain was used. All scratch homes/environments are
test-owned and credential-free; actual bootstrap assets/downloader are doubles.
Exact commands, exit codes, binary hashes and cleanup: `final-checks.json`.

| Check | Result / evidence |
| --- | --- |
| `go test -race -count=1 -v ./...` | All7 test packages pass; command package has no tests. `go-race-final.log`. |
| `go vet ./...` | Pass; `go-vet-final.log`. |
| Full existing Python packaging/installer scope |7 cases enumerated:6 pass,1 child-only fixture skipped in standalone Python. That fixture is actually executed by the Go bootstrap test, not waived. `installer-final.log`. |
| Actual bootstrap -> Go permission fixture | Pass. Current installer (only release placeholder replaced), real shell/archive/checksum/install, fake curl/assets, inherited077 confirmed in both verification and create phases. Mac/Linux directory layouts tested on the native host. |
| Private/public/binary + parent regression | Exact0700 private dirs/0600 private receipts;0755 public/executable/all necessary new ancestors;0644 root and node descriptor files. Real nonroot fixture exec and both descriptor reads pass; download `.local/lib` remains0700. |
| Existing path regression | No adoption/chmod of existing0700/0750;0777 refusal, no child under unsafe parent; file/symlink rejection and modes retained. Actual public `RootDirectory` also rejects the untrusted test paths. |
| Negative control: remove new chmod only | Expected failure,0700 vs0755 on both binary layouts; `mutation-old-umask.log`. This disposable copy preserves the refactor/test seam but reinstates the reviewed mkdir-only semantics. |
| Negative control: omit nodes chmod | Expected failure on public `nodes` parent; `mutation-missing-node-mode.log`. |
| Negative control: omit intermediate Library/usr chmod | Expected failure on necessary traversal ancestors, even though leaf chmod succeeds; `mutation-missing-parent-mode.log`. |
| Darwin/Linux arm64/amd64 `go build -trimpath` | Four targets compile. Only native Darwin-arm64 version/refusal smoke executed. Foreign binaries not executed. |
| Native version / unqualified verification | `development-unqualified`; release verification exits1 as required. Not release qualification. |

Negative controls are test-strength checks in isolated copies, **not current-source
failures**. All copies/output binaries were removed. Earlier positive run logs and
`checks.json` are retained; final run adds fuller nested fixture output. Child-only
Go test is skipped in top-level discovery but is executed twice through the real
bootstrap wrapper; its Mac/Linux subcases are visible in the parent log.

## What this does not prove

No actual sudo, root installation, OS paths, mount/export/daemon, Docker mutation,
provider or user data action ran. The callback substitutes trust only inside the
disposable owned root; actual root-ownership validation followed by a different-UID
probe remains a downstream privileged-install test. Actual nonroot fixture execution
plus0755/0644 assertions closes the local mode regression, not that physical gate.
The supported Mac/Linux layouts in one host's filesystem are not two OS executions.

Unchanged TypeScript/frontend suites and rendered guide are carried from IR002,
not claimed rerun in IR003. FUP001's3 baseline updater failures remain unchanged;
its candidate-only green logs are still not current-source passes. Reviewer sent
FUP001 to `/project_task_manager`; custody is recorded in CRR001 (awaiting approval
for separate Task), not a new implementation assignment. All runtime support-asset,
peer-stop/restore, selected modes/Docker and healthy previews, independent physical
proof, docs/finalization/user verification/release gates remain as in the full
handoff. D-001/DEC015 outage deferral and IMP-D001 source-link ownership unchanged.

## References / scope

Read root DESIGN.md/TESTING.md and the implementation skill; no closer NFS testing
instructions exist. This is personal implementation-scoped testing, not API/E2E.
The [Go mkdir contract](https://pkg.go.dev/os#Mkdir) confirms umask applies at creation;
[Chmod](https://pkg.go.dev/os#Chmod) sets final permissions. No global mask relaxation
or new privilege/ownership mechanism is needed. No UI changed: new-round rendered
feedback N/A; IR002 rendered evidence remains applicable, not newly executed.

CR-001 is **addressed in implementation, pending independent re-review**. Do not
rewrite CRR001's Fail or advance to API/E2E until the reviewer passes this correction.


## Cleanup / artifact checks

`cleanup.json` confirms both test roots, observed nested installer fixtures and the
exact owned Go toolchain removed. Generated SDK dist from prior work remains
untracked/unstaged, not deleted. No test/dev process remains active from this round.
Source delta hashes and unchanged requirements/approvals/design/review authorities
were rechecked after execution. Evidence token/private-key shape scan found no
matches (not exhaustive security review). Trailing log whitespace alone normalized
with before/after hashes; all expected negative-control failures retained.
