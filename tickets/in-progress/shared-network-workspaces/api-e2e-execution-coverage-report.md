# API/E2E Execution Coverage Report — Shared Network Workspaces

## Latest authoritative result

**API-REV-001 / Round 1: Fail. Final validation confidence 57.14%. Broader validation Required.**

Personal repository and actual Mac VM execution exposed **API-F001**, a repeatable normal first-create failure before the source host mounts its own Apple NFS export. One fresh create succeeded; two other fresh creates failed with mount_nfs exit74/rpc.statd RPC prog. not avail. Public reconnect then succeeded on the second failed clone. That recovery does not satisfy first invocation and does not erase either failure. No outage/fault injection occurred. No production fix, delegation, merge, push, release or Task completion occurred.

Preliminary origin **Unclear**: bounded native setup/service-readiness/mount lifecycle is a plausible implementation cause, not established fact. Request focused failure-origin review, not successful-test review. Independent physical Mac/Linux, remaining deployment/client modes, current mounted product journeys and actual native-runtime proof remain outstanding. These are not waived as user-only checks. D-001/DEC015 remains deferred, not fixed and not a gate.

## Execution round meta and routing

- Task: `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; branch `codex/shared-network-workspaces`; finalization base `origin/personal`.
- Input HEAD: `3b7dd9a2895f4b8fedc5e1bcdd00c913d97fae2f`; production input from CRR002/IR003. Durable test-only commit: `af9f23df93a63ca6c8305f51439a855acc2133c7`. Previously audited implementation paths remain byte-identical: [source audit](evidence/api-e2e/api-rev-001/source-and-fixture-audit.json).
- Trigger: code_reviewer CRR002 source Pass. IR003's CRR001 Fail text is its historical trigger, not the latest source verdict. No prior completed API/E2E result/confidence; prior round N/A.
- Requirements: [requirements-doc.md](requirements-doc.md), approved [SR018](approval-record-sr018.md). Investigation: [investigation-notes.md](investigation-notes.md); design: [design-spec.md](design-spec.md), Ready SR019; history: [solution-revision-record.md](solution-revision-record.md).
- Design review: [design-review-report.md](design-review-report.md), ARCH-REV003; [architecture-review-revision-record.md](architecture-review-revision-record.md), [scope feedback](architecture-review-scope-feedback.md).
- Implementation: [implementation-handoff.md](implementation-handoff.md), [implementation-revision-record.md](implementation-revision-record.md). Source review: [code-review-report.md](code-review-report.md), [code-review-revision-record.md](code-review-revision-record.md).
- Complete cumulative supplements and absolute authority paths: [package-index.json](evidence/api-e2e/api-rev-001/package-index.json), including original feasibility, private runtime/native discovery, prior failures, IR001 design correction, IR002 current-source updater limits and IR003 permission/mutation evidence. Prior experiments retain their original boundary, not current whole-product proof.
- Delivery report/revision: N/A — not yet performed. Product supplement: N/A — not applicable.
- Current coverage authority: [investigation](api-e2e-coverage-investigation.md), [ledger](api-e2e-test-case-ledger.md), [revision record](api-e2e-revision-record.md).
- Classification retained **Large / High**, Reviewed route. Successful output would require proportional Code Review for the changed durable test. Current Fail instead requires focused failure-origin review. No successful-output gate has passed.

## Investigation and execution basis

Investigation and ledger initialized before execution; coverage decision revised before test edits. Read root `AGENTS.md`, `DESIGN.md`, `TESTING.md`, server/web `AGENTS.md`, normal package scripts/test fixtures, NFS README/release instructions and isolated-app guidance. No closer testing guideline. Commands use documented package surfaces, serialized preparation, test-owned HOME/data/TMPDIR and no provider credentials. Exact argument arrays, working directories, exit codes and logs: [repository-results.json](evidence/api-e2e/api-rev-001/repository-results.json), [commands.md](evidence/api-e2e/api-rev-001/commands.md).

Material deviations: N03's five original workspace cases reached their response assertions but failed during removal cleanup because the route-only fixture lacked process AgentRunManager. Updated only the durable fixture/composition plus one narrow socket regression; all six reran successfully. Baseline fixture is input/base-identical before correction. V02 stopped at an actual fresh-create failure before peer/client steps. A separate single-VM focused reproduction removed the unexecuted peer topology from the case. No unrelated broader matrix expansion after the reproduced finding. Reroute required during execution: Yes, API-F001.

## Test-case ledger reconciliation / changed boundary matrix

Ledger initialized before execution: Yes. Completed case/checkpoint recorded immediately: Yes; reconnect/cleanup detail was persisted immediately in JSON, then reconciled below. Final ledger closes the aggregate cases and preserves initial failed events. No case remains running/interrupted.

Evidence prefix **E** throughout this report is `evidence/api-e2e/api-rev-001/` under this ticket. Links/file names identify retained artifacts, not temporary paths.

| Case | Boundary / AC | Execution surface and evidence type | Final result | Evidence / limits |
| --- | --- | --- | --- | --- |
| N01 | Installer/Go platform/backend/CLI/launcher; 006–009,012–019 | Durable Python + Go race/vet/native build | Pass, enumerated skips | E/python-bootstrap-launcher.log: 42 enumerated,39pass,3skip; Go seven test packages pass. Go child bootstrap executes under parent; standalone child-only skip is not a separate pass. PowerShell unavailable and port8001 occupied: those cases skipped, user service untouched. E/go-race.log, go-vet.log, go-build-native.log, native-version.log |
| N02 | Admission/binding/profiles/source lifecycle/close/scoped Git/REST/AGY/local; 002,006,008–010 | Durable unit and in-process contracts | Pass | E/server-targeted.log:16files/133tests; mount/native runtime dependencies mocked |
| N03 | Public source GraphQL, existing content/artifact API and scripted runtime; 002,006,010 | Durable contract + composed socket HTTP/WS | Pass after fixture correction | E/public-contracts.log retains35pass/5cleanup-fail; E/workspace-http-rerun.log six pass; E/agy-scripted-linked-skills.log eight pass. Scripted CLI is not paid/native inference; ordinary local filesystem is not NFS |
| N04 | Guide renderer contracts and core terminal env; 002,004,020 | Durable component/core tests | Pass | E/guide-unit.log:3files/21tests; E/terminal-unit.log:17files/109tests. Not desktop/browser or mounted cwd proof |
| V01 | Actual root install/create and nonroot original-source mount; 008,012,017–019 | Temporary live CLI on fresh Mac VM | Pass at this narrow scope | E/mac-vm-result.json: first create under077; real sudo/root,501:20 data identity, source+mount hash, launchd state. Not public installer, interactive approval, peer or restart proof |
| V02 | Healthy mounted operations/peer/client/restart/detach; 001–010,013–019 | Temporary live two-VM attempt | Fail before downstream steps | E/mac-matrix-result.json: storage create mount_nfs exit74. Second client/Docker/operations/reboot/detach not reached |
| V02-repro | Focused normal first-create failure and public recovery; 012,014,018,019 | Temporary live fresh single VM | Fail first create; reconnect substep Pass | E/mac-repro-result.json: same error, then reconnect rc0/hostReady/same UUID. Does not prove post-reconnect independent file hash or reboot |
| V03 | Native Ubuntu24/ext4 Ganesha, DockerLinux storage, Linux clients + independent physical matrix | Planned actual systems | Not Tested | Stopped behind API-F001; no Linux test resource stood up this round. Physical targets/access not supplied. VM cannot substitute for required independent hardware |
| V04 | Current isolated desktop Guide/mounted explorer/media/HTML/artifact journey; 010,020 | Planned isolated current-build app | Not Tested | Stopped behind API-F001. User app untouched; no browser or shell claim from API tests |
| V05 | Actual native tools/skill support assets/peer close/restore/Team/Org; 002,006,010 | Planned isolated authorized native runtime | Not Tested | Stopped behind API-F001; no credential import/paid inference authorization inferred. Metadata/scripted transport not substitute |

No repository commands added after the post-repository gate: only VM execution, read-only source/diagnostic investigation, artifact audit and cleanup. Current full repository all-green is **not** claimed. Carried IR002 Nuxt4258pass/3fail/5skip and Electron188pass/3fail/1skip are the same three unchanged updater category failures; FUP001 remains in PM custody. Current-source rerun and baseline-equality evidence remain in `implementation-evidence/ir-002/`; removed-candidate green logs are not current-source results. No suppression, patch, repeated owner notice or NFS confidence deduction.

## Acceptance-criteria proof

The table judges each whole criterion, not the existence of one passing subcase. All are treated as critical to final delivery; AC016 is an earlier feasibility gate, not current product completion. `Not Proven` includes partial evidence, not an assertion that every subpart failed. No `Only The User Can Check` waiver is claimed.

| AC | Critical | Case/evidence | Result |
| --- | --- | --- | --- |
| 001 | Yes | V01 native self-mount only; V02 stopped; V03 missing physical Mac/Linux/Docker reciprocal identity | Not Proven |
| 002 | Yes | N02,N03,N04 local/scripted evidence; V05 actual cross-node Codex/Claude/other native tools missing | Not Proven |
| 003 | Yes | V02 healthy cross-client <=5s flush/close visibility matrix not reached | Not Proven |
| 004 | Yes | N04 scoped terminal; V02/V03 filesystem/locks/coordinated Git matrix not reached | Not Proven |
| 005 | Yes | V02/V03 concurrent independent-file client matrix not reached; no shared-Git merge claim | Not Proven |
| 006 | Yes | N01,N02 refusal/no-substitute; V02 reports incomplete, not false ready. Actual new-run mounted/bad-binding product matrix missing | Not Proven |
| 007 | Yes | V02-repro public reconnect same UUID; healthy reboot+cross-node bytes not exercised | Not Proven |
| 008 | Yes | V01 actual root/public/private modes and501:20; unauthorized/MacLinux/container matrix missing | Not Proven |
| 009 | Yes | N01 preservation/refusal fakes; V02 actual selected Docker/occupied-target/detach preservation not reached | Not Proven |
| 010 | Yes | N02 API regressions; N03 actual socket HTML+relative PNG/current replacement/deletion and artifact integration; V04 mounted current-build explorer/previews missing | Not Proven |
| 011 | Yes | Delivery/explicit user verification/merge/release not performed; this Fail is not Completed | Not Proven |
| 012 | Yes | V01 narrow flags-based native success; V02/V02-repro ordinary first-create failure, API-F001; guided/public installer/Linux matrix outstanding | Not Proven |
| 013 | Yes | N01 mocked launcher/node assertions only; actual Mac managedDocker client lifecycle never reached | Not Proven |
| 014 | Yes | V02-repro reconnect from pending plan succeeds; repeat/cancel/restart/other-mode preservation incomplete | Not Proven |
| 015 | Yes | V02 second computer connect not invoked; no two-computer same-backing product proof | Not Proven |
| 016 | Yes | Carried SR017/018/019 feasibility artifacts + ARCH-REV003; E/package-index.json links experiment-index, selection/native-folder/MacVM reports and audits | Proven for the pre-implementation feasibility gate only; not physical/current-product completion |
| 017 | Yes | V01 nonempty original source+mount SHA and nonroot identity; V02 failed-run source hash preserved; reciprocal edits/restart matrix missing | Not Proven |
| 018 | Yes | N01 modes mostly mocked; V01 actual nativeMac subset; V02 failure, Linux native/Docker storage and both OS client matrices not proven | Not Proven |
| 019 | Yes | V01 managed job after terminal command; V02 first-create failure; V02-repro recovery; reboot/normal restart/all-mode single-invocation proof missing | Not Proven |
| 020 | Yes | N04 components21 + retained IR002 rendered evidence; V04 not run. Default unqualified/unavailable release is intentional, not fabricated publication; actual released installer/desktop journey outstanding | Not Proven |

## API-F001 — first nativeMac create fails mounting its own fresh export

**Expected:** a normal approved native create invocation installs/verifies the selected original source and mount, reports hostReady and leaves the managed service. AC012/018/019, SCN001/011/013. No follow-up mount/setup commands required. **Observed:** two fresh runs fail before host verification/job install with mount_nfs exit74, while one earlier run succeeded. Error is clear/incomplete; no false ready/local substitute.

Binary SHA256 `ddf7f65c02d8326f8fbf83c332aa4863d63b5c7ce859fa584c5ae3ed919de68f`, unchanged development-unqualified metadata, built from source at input HEAD. Guest macOS26.6.2/25G83 arm64, APFS; native Apple NFS3; user501:20; fresh root layout/source; no Docker/credentials. Focused reproduction exact command (executed via Tart as admin):

```sh
umask 077
exec /Users/admin/ab-nfs-api001-repro-c179ed61-binary create \
  --source /Users/admin/ab-nfs-api001-repro-c179ed61-source \
  --endpoint 192.168.128.2 --allow 192.168.128.2,192.168.128.1 \
  --nodes none --yes --json
```

Observed rc1 at11.035s; original V02 rc1 at10.819s:

```text
AutoByteus NFS incomplete: mount_nfs failed: exit status 74:
mount_nfs: can't mount with remote locks when server (192.168.128.2)
is not running rpc.statd: RPC prog. not avail
```

Evidence: E/mac-matrix-result.json and E/mac-repro-result.json include argv/rc/time/stdout/stderr, fresh-source preflight, diagnostics and exact cleanup. Original successful V01 is E/mac-vm-result.json,20.486s. V01 allowed only self; failed V02 allowed self/peer/host; focused reproduction allowed self/host. This is not a controlled proof that allowlist length causes the defect. No forced timing or service outage.

After failed create, original source SHA remained `59dd782a4089ea0c8a1b888b477366628c4828c4c4d617599c5e2350f157af12`; root private0700/public0755/executable0755 are correct; pending plan/descriptor/Apple config remain; no NFS client mount. Post-failure rpcinfo shows status/statd and lockd registered and nfsd running. Those later observations cannot establish readiness at mount attempt.

Public recovery command, no manual OS/config edits:

```sh
/Users/admin/ab-nfs-api001-repro-c179ed61-binary reconnect --yes --json
```

rc0,9.615s,hostReady=true, same UUID `2f6bed56-1950-43d4-822d-d3727cf20940`; stderr explicitly resumes same source/UUID. This verifies one pending-plan retry readiness, not first-invocation success, reboot or independent post-retry byte roundtrip.

Source pointers for origin review: `internal/setup/apply.go` calls backend ApplyApple then EnsureMount before InstallJob; `internal/backend/apple_apply.go` runs nfsd checkexports/enable/restart; `internal/platform/mounts.go` explicitly supplies `hard,tcp,vers=3,actimeo=1,locallocks,mountport=20048,resvport`. No root-cause conclusion from the error's remote-lock text. Startup service-readiness/mount timing is only a hypothesis. No source changes made.

Harness limits retained: V02 used `--net-host`, assigning different per-VM subnets (.128/.129); future peer validation needs a shared owned network. Failure occurred on server self-mount before peer invocation and repeats with one VM, so it is not a demonstrated cross-client-route failure. Diagnostic `/usr/sbin/nfsstat` was unavailable; use `/usr/bin/nfsstat` in later probes. Do not call that harness diagnostic error a product defect. Archived scripts preserve executed code; copy/adapt into a new round/output location rather than overwrite evidence. Raw V02-repro event text inherited the word V01; its VM/command/result and this reconciliation identify V02-repro unambiguously.

## Validation confidence scorecard

| Mandatory category | Post-repository | Final | Change / evidence / remaining uncertainty |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 50% | 50% | NativeMac subset improved, but first-use failure and critical mode/physical/runtime proof missing |
| Changed-boundary execution directness | 50% | 50% | Real CLI/sudo/Apple/mount/launchd now exercised; Linux/Docker/native-runtime material boundaries still absent and first use failing |
| Cross-boundary integration realism/mock gap | 50% | 50% | VM kernel/storage proof supplements real HTTP; no independent peer/native inference/whole-product mount path |
| Environment/configuration/identity/fixture fidelity | 25% | 50% | +25: real root/different UID and original APFS source, no simulated root trust in V01/V02; guest sudo/no prompts, otherOS/physical/auth matrix missing |
| Failure/edge/lifecycle/recovery evidence | 50% | 50% | Actual first-use failure reproduced and public reconnect succeeded; normal reboot, selected Docker/cancel/detach lifecycle missing |
| User-surface/browser/desktop-shell confidence | 75% | 75% | Unchanged component/HTTP/prior rendered evidence; current mounted desktop journey not done |
| Durable regression quality/relevance | 75% | 75% | Corrected fixture and useful HTTP regression, valid current units; durable actual OS/native gap remains |

Overall simple average: post-repository375/7=**53.57%**, final400/7=**57.14%** (+3.57 percentage points due to identity fidelity). These scores measure evidentiary confidence over the scoped behavior, not statistical reliability or a pass percentage. All seven categories remain below90%; target95% not met. Every critical criterion directly proven: No. Missing/failing critical proof independently prevents Pass regardless of average. Broader validation remains Required; this round executed enough to reproduce a failure and now reroutes it, not a claimed dependency-only Blocked result.

## Broader setup, runtime targets and desktop boundary

- Host macOS26.5.2/25F84 arm64; Node22.23.1, pnpm10.28.2, Python3.9.6, Tart2.40.1; private official Go1.27.2 toolchain. E/environment.json, toolchain.json record exact versions, URL/checksum. Toolchain and build removed with owned scratch after all probes.
- VM base: cached public `ghcr.io/cirruslabs/macos-tahoe-base@sha256:87f3aa5ce21b5c876268f233bdfecf38b4c2a8116fe9bbb718e714cbae187377`. Fresh unique clones,2CPU/4096MiB, no graphics/audio/clipboard/USB/host shares, host-only virtual network. No root action on user's host. User suggested VM; guest passwordless sudo is not a real-user password-dialog test.
- Startup: clone/set/run; wait for guest command service; assert absent NFS roots/export/target; create owned nonempty source as501; transfer hash-verified binary; execute public CLI from501 under077, CLI does actual elevation/install/probe/config/mount; read results/OS state; stop/delete exact clones. Per-step commands are in mac result JSONs and retained runners.
- V01 observed native mount source==descriptor, source+mounted original bytes exact, managed launchd present after CLI exit. No interactive guided-choice, curl/bootstrap/download/signing qualification or publication claim. Python/Go bootstrap fixture remains separate evidence.
- No browser/device viewport executed this round. Desktop user app and its state untouched. New NFS Guide component tests prove renderer behavior only; actual isolated current-build journey remains V04. NFS launchd here is service lifecycle, not Electron lifecycle.

## Compatibility / legacy / persisted-data checks

Implementation handoff's legacy/compatibility and persisted-data sections reviewed. No compatibility-only/legacy-retention behavior observed; no test solely preserves it; no invalid upstream compatibility finding. Existing workspace/run/launcher known-field records are **Directly Usable — No Migration**; private execution profiles **Discard or Rebuild**; new NFS subjects are new typed state. No schema version, dual read/write, request-time upgrade or source retention queue introduced. N02/N03 exercise current source owners, AGY capsule/missing-source policy and exact profile close at fixture scope; existing real histories/actual native restore not fully proven. V01 uses original nonempty source; V02 recovery uses pending new service state. No migration completion claim applies. No upstream compatibility recipient notified; N/A.

## Durable coverage changes

Updated `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts`, own baseline-fix commit `af9f23df93` under TESTING rule9. Reused existing `startStudioE2eRuntimeServer` to initialize process authorities, removed registered workspaces before stack teardown, then closes server/removes owned data. Original five response/path/byte assertions retained. Added a sixth real socket GraphQL-create + HTML relative encoded-PNG MIME/bytes + file replacement/reopen/delete404 regression for AC010 ordinary APIs. Local FS only, not remote/NFS/browser rendering. Original failed run retained; six-case rerun Pass. No coverage removed; no product source change. E/workspace-preview-test.diff and source-and-fixture-audit.json identify exact change. Attach path for review; current request is failure-origin review, with successful-test review still pending.

## Mocked dependencies, temporary scaffolding and evidence

| Method | What it proves / why used | Limitation / disposition |
| --- | --- | --- |
| Unit fake Runner/Docker/mount observation | Deterministic plans/refusal/preservation/config/profile contracts without OS mutation | Does not prove real Docker/sudo/kernel lifecycle; durable tests retained |
| Fake GitHub + scripted AGY CLI | Actual schema/HTTP/WS/Team/Org/tool/link/capsule paths without accounts or paid inference | Not native Claude/Codex/Grok support assets/peer close/restore or physical storage proof |
| Full composed test-owned HTTP server | Current API response/path/bytes and legitimate removal lifecycle | No browser shell/NFS/cross-node writer; data/tmp cleaned |
| Fresh Tart VM + unchanged binary | Actual nativeMac OS/root/nonroot/source mount/managed job; focused failure/recovery | One physical host, not independent LAN, no user accounts; exact clones deleted |
| E/run-repository.py and run-mac-*.py | Archival executable orchestration, exact actions reproducible after safe new output/scratch setup | No delegated workers. Matrix's later code not executed; not future-ready blanket green harness |

All logs, result JSONs, source hashes, diffs, manifests and commands remain in E. Canonical reports remain one path across future rounds. `evidence-hygiene.json` records log whitespace/empty-EOF normalization and zero-context diff rendering; semantic result/failure output preserved. No credentials or binary VM images committed.

## Cleanup performed

| Resource | Ownership/action | Result |
| --- | --- | --- |
| V01 `ab-nfs-api001-d7fbf3f4` | Own guest service/export/mount/data removed by stopping/deleting own clone | Process exited; clone absent; mac-vm-result.json receipt |
| V02 `ab-nfs-api001-7a371989-{server,client}` | Stop/delete both exact owned clones | Both processes exited and clones absent; no Docker/container/volume creation reached |
| Repro `ab-nfs-api001-repro-c179ed61` | Stop/delete exact owned clone after recovery output | Process exited/clone absent; mac-repro-result.json |
| Private scratch `ab-nfs-api001-pk2d0kur` | After owned runners absent, remove own toolchain/archive/binary/HOME/TMPDIR/test files | Absent; E/cleanup.json |
| Test-owned HTTP/WS servers/data | Test cleanup, process exit, then owned scratch removal | Closed; no runner remaining in final ownership check |
| Prior public Tart image/tool cache | Not ours to delete | Retained, stopped image only in final Tart list |
| Generated SDK/BriefStudio dist | Pre-existing, builds may regenerate; no manual delete or stage | Five original untracked directories retained |
| User app/nodes/credentials/host mounts | No execution/mutation authorized or performed against them | Untouched; no prune, shared cleanup or forced user unmount |

## Result summary / classification / next action

- Pass at stated scope: N01,N02,N03 after owned fixture correction,N04,V01; V02-repro public retry substep only.
- Fail: V02 and V02-repro first-create, **API-F001**. Preliminary **Unclear**, recommended focus nativeMac setup implementation owner if failure-origin reviewer confirms; environment/harness origin must remain considered until then.
- Not Tested: remainder of V02,V03,V04,V05. Missing public released-installer proof is deliberate current qualification state, not to be fabricated. No supported mode's absence is called parity.
- Out Of Scope carried: FUP001 baseline updater categories; no new follow-up/notification. Deferred: DEC015/D-001 hard-mount outage isolation; no score penalty/new worker machinery gate.
- No part waived as Only The User Can Check. Final user verification belongs to delivery after technical gates.
- Next action: fresh handoff rules select focused failure-origin review for Fail. Persist complete reports/evidence/test diff and attach cumulative authority package; do not send to delivery or close main Task. On later round, recheck API-F001 first using fresh safe clones/shared peer network where appropriate, then complete remaining actual mode/client/runtime/desktop/physical matrix.

Fresh `get_handoff_rules` returned the Fail/focused failure-origin rule; exact selected recipient `/software_engineering_team/code_reviewer`. Only this recipient will receive this outcome. E/routing.json records selection; a successful send tool receipt, not this intent, confirms handoff.
