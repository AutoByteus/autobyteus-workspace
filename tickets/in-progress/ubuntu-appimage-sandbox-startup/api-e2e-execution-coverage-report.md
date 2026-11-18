# API/E2E Execution Coverage Report

## Round
Round 1 / API-REV-001; CRR-002 source Pass. Plan: api-e2e-coverage-investigation.md. Progress: api-e2e-test-progress.md. Prior round: N/A.
Evidence: /home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-startup/tickets/in-progress/ubuntu-appimage-sandbox-startup/evidence

## Routing classification
Large / High; Reviewed. Successful route Code Review, proportional review if durable tests change. Result Blocked; no successful-output handoff. New durable test needs proportional review on a future Pass.

## Environments
ENV-1: reviewed source 0df0c901e4, Ubuntu26 x64, Node22.23.2. Existing implementation source eb470a0d31 differs only in ticket documentation/evidence. ENV-2: fresh clone of ENV-1, isolated test trust, Go1.27.4, extracted compiler tooling. No production secret or app data.

## Cases
| ID | AC | Command / steps | Env | Result | Evidence / look for | Limits |
| --- | --- | --- | --- | --- | --- | --- |
| API-01 | 003/006/008 | Reused IMP-23/24 and unchanged checks per IMP-26 | ENV-1 | Pass | API-01-reuse.txt; IMP-23: 126 tests / 6 files; IMP-24: both PASS | Mocked OS edges, not acceptance |
| API-02 | 005/006/008 | bash evidence/API-02-fresh-build.sh (exact workflow order) | ENV-2 | Pass | API-02-fresh-build.log: API-02-CURRENT-PACKAGE-COMPLETE; Packaged server startup validation passed; SHA256 de7e643e316a9593d63ce79f8eb0483f21460fded1fea61946f8d917927e4132 | Ubuntu26 local x64, not Ubuntu22 runner/ARM64; disposable trust; no GUI yet |
| API-06a | 004/008 | go test -v ./cmd/writer, from native module | ENV-1 + new test | Pass | API-06a-writer-socket.log: PASS TestWriterSocketTransactions | No systemd/full package/fault-injection proof; trailing log-display cwd error corrected without rerun |
| API-03 | 005 | python3 evidence/API-03-packaged-node.py | ENV-2 | Pass | API-03-packaged-node.log: exit23, outer-group exit42, real ELF SIGTERM exit42 | Actual Node24.19.0; no GUI/install/update claim |

| API-04 | 001/003/004/005 | Fresh full test-origin package; dbus-run-session -- bash API-04-guest-gui.sh; click Install; normal Ubuntu graphical auth; inspect sealed helper/proc/kernel; Alt-F4; reopen original; --autobyteus-uninstall with separate graphical auth | ENV-3 | Pass (bounded journey) | API-04-native-state.txt: renderer Seccomp 2 / NoNewPrivs 1 and distinct user/pid/net namespace IDs; API-04-helper-custody.txt seals=15 and matching helper hash; API-04-redirect.txt both PASS lines; API-04-removal.txt PASS-owned-removal-and-synthetic-profile-byte-preservation; auth/consent/running/removal PNGs | Noble24 x64 only. Normal original-user GUI/server, ONE-SHOT journal; no global relaxation. Not whole matrix |
| API-04-matrix | 001/002/004 | Ubuntu22 capable direct/menu; Ubuntu26 restricted graphical install; menu execution, reboot/repair and auth cancellation | — | Next Round | API-04-host-shell.log records expected restricted unpacked abort on Ubuntu26, not a launch pass | Additional dedicated guests/journeys remain agent-owned work; not user-only checks. Not executed this bounded round; resume after external CI authority gate clarified |
| API-05 | 006/008 | Two full signed update candidates, opted-in active work/clock-shift stage lifetime, ordinary quit versus explicit restart, synthetic settings/work continuity, channel/opt-out | — | Next Round | Existing mocked owner evidence API-01, real inert socket API-06a only | No two full newer release builds prepared or update journey run. Agent-owned continuation, NOT an environment blocker claim and NOT waived |
| API-06 | 003/004/008 | Full systemd peer/perms and wrong key/bytes/target/replay/channel, disk/xattr/fsync/ACK/restart/rollback matrix | — | Next Round | API-06a proves actual handler/socket + local signed inode subset; IMP-12 vectors/store mechanisms reused | Real systemd writer status observed in guest, but full fault matrix and hostile peer identity execution not recorded as acceptance; retain mandatory gate |
| API-07 | 001/003/004 | API-04 renamed package exact tag positive; guest API-07-refusals.py through real graphical consent for cancel/404/4097-byte response | ENV-3 | Pass (bounded journey) | API-07-refusals.log: 3 pass results, authorization false, hostInstallState false; cancel GET count0, other count1; individual app/feed logs and error PNGs | First harness display-readiness race corrected before successful assertions; production HTTPS/redirect policy only unit-tested |
| API-07-rest | 001/003/004 | Full package offline/TLS/redirect/key/signature/bytes refusals; capable/managed no-sidecar requests | — | Next Round | API-04 redirect and API-07 cancel prove their excluded paths; IMP/native tests other mechanisms | Real package remaining negative matrix not run, not inferred from units |
| API-08 | 006/008 | CI preflight: inspect unconditional Apple signing steps; remote branch check. release:test NOT dispatched | ENV-1 | Not Tested | API-08-ci-preflight.txt: BLOCKED; workflow lines144/274 import Apple signing secrets without publish condition | No native ARM64 environment available here; whole workflow conflicts with explicit no-production-key instruction. Need authority clarification or secret-free native Linux CI. No branch push |
| API-09 | 007 | Guest assertions after uninstall; QMP quit; host isolated-app list | ENV-1/3 | Pass | API-09-cleanup.txt: owned-installation-absent; instances []; QMP SHUTDOWN | Only owned snapshot/processes stopped; temporary build/trust retained privately for continuation |

## Post-repository confidence / broader decision
Scores before shell journeys: requirements 45%, boundary directness 60%, integration realism 50%, environment fidelity 50%, failure/lifecycle 65%, user/shell 45%, durable regression 80%; average 56.4%. Strong crypto/owner/socket/packaging evidence, but actual enrollment, updates and sandbox matrix missing. Broader validation Required (Project Desktop Validation / Lifecycle), not browser-only. Actual current AppImage and normal Ubuntu graphical agent needed; no weakening host policy. Full acceptance blocked by missing direct proof, not waived by scores. Final scorecard follows after journeys.

## Environment and reproducibility details
ENV-3: assigned Ubuntu24.04.5 KVM guest, kernel6.8.0-147-generic, normal UID1000 witness; host QEMU10.2.1 with snapshot=on, 4GiB/2CPU, own SSH21884. Ubuntu packages Xvfb :91, Openbox, policykit-1-gnome, zenity and runtime libraries installed in ephemeral guest only. Agent warning about absent GNOME SessionManager did not prevent system-bus registration: real graphical password dialog and journal ONE-SHOT were observed. This is not the default full GNOME desktop image and does not prove Ubuntu26 or22.

Original current package SHA256 de7e643e316a9593d63ce79f8eb0483f21460fded1fea61946f8d917927e4132 is full production-origin build with disposable test trust. Test-origin full package SHA256 df66a9f8649fa94ba8a17d1ba24a61c65efd654f465f4d30624a154af275ea15 uses identical renderer/server and the existing explicit desktop_test build tag to pin loopback18889; native helper SHA25639e8baf8d7edefdee85f85f492f9fd5771b1376a6d849da746a3856b85f95a98. No runtime origin/key override or production source edit. Sidecars served at exact canonical v1.5.13 paths despite local filename MyCurrentRenamed.AppImage. Test-origin bounds are real; public HTTPS transport not exercised.

Setup details and exact runnable helpers: evidence/API-02-fresh-build.sh, API-04-test-package.sh, API-04-environment.txt, API-04-guest-gui.sh, API-04-guest-remove.sh and API-07-refusals.py. Full build succeeded from frozen install alone with no manual dev prebuild; shared pnpm/download caches permitted. Host is Ubuntu26 not the workflow Ubuntu22 runner. Existing extracted build toolchain supplied make/GCC15, no host install. API-02 includes Node units15 and Go packages, build gates/typecheck, final-byte signature/layout/metadata and real Electron-Node server readiness. Native ARM64 remains unproved.

## Acceptance-Criteria Proof
| AC | Critical | Cases | Result | Remaining proof / user-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04 | Not Proven | Ubuntu24 current GUI/server/sandbox proven; Ubuntu26 affected actual install/runtime not run. Not user-only |
| AC-002 | Yes | API-02/04 | Not Proven | Correct package Exec and Ubuntu24 renderer isolation; Ubuntu22 capable direct/menu missing |
| AC-003 | Yes | API-04/07 | Not Proven | Real cancel,404,oversize,remove proven; remaining unknown-error/recovery matrix not complete |
| AC-004 | Yes | API-04/06a/07 | Not Proven | Current seals/auth/ownership/exact attachment/userns policy/removal strong; peer/systemd/fault matrix and supported-host breadth incomplete |
| AC-005 | Yes | API-02/03/04 | Not Proven | Actual x64 packaged Node argv/signals/exits and real embedded readiness proven. Native ARM64 operational package not built |
| AC-006 | Yes | API-01/02/06a | Not Proven | Full updates/data continuity and native ARM64 packaging absent |
| AC-007 | No (Delivery owned) | API-09 | Not Proven | Evidence/owned cleanup retained; no personal integration, release or checkout update performed |
| AC-008 | Yes | API-01/06a | Not Proven | Owner/unit/inert transport tests cannot replace successive full updates, active work and failure/recovery matrix |
No part is relabelled Only The User Can Check. The CI authority/environment dependency is not an acceptance waiver.

## Mandatory confidence scorecard
| Category | Post-repository | Final | Support | Residual / improvement |
| --- | ---: | ---: | --- | --- |
| Requirements and AC proof | 45% | 60% | API-01/02/03/04/07 | Entire update and multi-host criteria still missing; run remaining matrix |
| Changed-boundary execution directness | 60% | 75% | Actual packaged current startup, GUI auth, kernel and handler/socket | Genuine full activation/relaunch and failures not crossed |
| Cross-boundary integration realism / mock gap | 50% | 70% | Current full guest GUI/server, one-shot sealed helper, store/status | Unit lifecycle mocks and inert updates remain; need real updater journeys |
| Environment/configuration/identity/fixture fidelity | 50% | 65% | Native x64 fresh build; Ubuntu24 normal user and Ubuntu auth agent | Only one affected guest, loopback/disposable trust; missing native ARM/22/26 and default desktop breadth |
| Failure/edge/lifecycle/recovery | 65% | 70% | Receipt/store tests; real cancel/404/oversize/removal and ordinary close | Disk/fsync/lost ACK/rollback and complete manual/automatic continuation absent |
| User surface / desktop shell | 45% | 75% | Real consent/auth/renderer/sandbox/health and removal | Menu/reboot and update notification/restart paths unproven |
| Durable regression quality/relevance | 80% | 85% | Current126 owner tests, new real socket transactions, crypto/CLI/store coverage | New test awaiting proportional review; no durable full-package updater harness |
Overall post-repository 56.4%; final **71.4%** (arithmetic mean, seven applicable categories). No category >=90%; 95% target unmet. Critical direct-proof gate NOT met. These are evidence judgments, not statistical probabilities.

## Broader decision and current blocker
**Required, partially executed; remaining CI gate Blocked.** Real shell path selected instead of browser-only, because pre-main privilege and lifecycle are the changed boundaries. Local Node/current full build and disposable graphical Ubuntu24 provide meaningful direct evidence; no reason to duplicate mocked suites. Native ARM64 cannot be established on this x64 host, and the documented whole-workflow dispatch uses production Apple signing even in build-only mode. API-08 records exact conflict; user clarification requested asynchronously. Need permission to run the existing build-only workflow without publication, or a secret-free native Linux runner/CI path. Do not request or accept private key contents.

Remaining agent-owned local setup/journeys API-04-matrix/05/06/07-rest are **Next Round**, not claimed impossible or dependent product defects. This bounded round stops without a Pass while external CI authority is unresolved. They remain required even if CI is authorized; a CI pass alone will not close validation.

## Persisted data / legacy
Approved Directly Usable — No Migration for app data, Discard or Rebuild for stages. API-01 serialization and API-06a restart disposal align; API-04 removal leaves the synthetic guest profile byte-identical. No real user data accessed. Actual work/settings across full updates not proven. No version-specific shim/dual reader/legacy-only retention observed or introduced. Supported portable/Mac/Windows branches remain relevant, not legacy; their unchanged unit evidence is reused, not new system validation.

## Durable coverage changes and mocked dependencies
Added autobyteus-web/linux-install/cmd/writer/main_test.go (API-06a): production handle and store over real Unix sockets, real SO_PEERCRED, signed inode and framing; normal nonroot caller, configured different target UID rejection, two inert signed commits, tamper/replay, typed consumed/restarted receipt and restaging. No production source or stale-test removal. One small test cleanup guard rerun passed; both runs retained. Proportional test review required on reviewed Large/High route after successful validation; not requested as a successful output now.
Existing Electron lifecycle evidence mocks OS/writer boundaries. Native new suite uses inert payloads and synthesized expected peer UID rather than creating a second OS login; does not prove systemd socket permission configuration. VM uses real systemd/provisioner/AppArmor/polkit but disposable signer and loopback release assets. All distinctions retained in case rows.

## Cleanup / retained state
No user desktop/app/process/data changed. Host failed isolated launch auto-cleaned (list empty). Guest app ordinarily closed, owned installation/service/socket/profile/account/menu removed and synthetic data hash comparison passed before guest shutdown. All guest Xvfb/agent/feed processes ended; QMP snapshot guest stopped (PID219774 absent), overlay discarded, assigned original guest disk untouched. No VM reboot claimed. No source branch push, CI, release/publication, production keys or final-target change.
Retained private test-owned directory /home/ryan-ai/hdd_drive/autobyteus_org/api-e2e-autobyteus-5 holds fresh clone, current/test-origin packages, ephemeral trust and setup diagnostics for continuation; disposable private key stays mode0600 outside Git. Assigned /tmp/autobyteus-5-* originals remain for downstream reuse. Raw failed extraction-harness log retained there; concise cause and corrected mounted-AppImage run committed. No tracked binary/package or key.

## Latest authoritative result
**Blocked — API-REV-001, 71.4% confidence.** No product failure found in completed cases. Harness/setup errors were repaired and retained, not classified as product defects. Native secret-safe CI is the external dependency; remaining platform/update/fault journeys explicitly deferred. All ACs remain fully Not Proven as above. get_handoff_rules has no Blocked rule; skill requires request to user, not a delivery/reviewer handoff. No acceptance/release advancement. Final target personal and Large/High unchanged.
