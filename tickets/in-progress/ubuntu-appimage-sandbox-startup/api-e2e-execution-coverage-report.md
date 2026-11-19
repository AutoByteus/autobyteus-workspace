# API/E2E Execution Coverage Report

## Round
Round 2 / API-REV-002 (prior API-REV-001 Blocked 71.4%); CRR-002 source Pass. Plan: api-e2e-coverage-investigation.md. Progress: api-e2e-test-progress.md. Disposition: SR-015 (API-08).
Evidence: /home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-startup/tickets/in-progress/ubuntu-appimage-sandbox-startup/evidence

## Routing classification
Large / High; Reviewed. Successful route Code Review, proportional review if durable tests change. Result Fail; focused failure-origin review required, not successful-output handoff. New durable test needs proportional review on a future Pass.

## Environments
ENV-1: reviewed source 0df0c901e4, Ubuntu26 x64, Node22.23.2. Existing implementation source eb470a0d31 differs only in ticket documentation/evidence. ENV-2: fresh clone of ENV-1, isolated test trust, Go1.27.4, extracted compiler tooling. No production secret or app data.

## Cases
Round-1 rows record that run only; the later second-round cases and acceptance ledger supersede their Next Round / Not Tested entries.

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
| API-04b | 001/004 | Enroll normally, finish guest restart, gtk-launch installed menu | ENV-4 | Pass (bounded) | API-04b-reboot-menu.log: changed boot ID, exact installed hash, visible app and health/active socket | Reset used when unattended-upgrades delayed graceful OS restart; not 22/26 proof |
| API-05a | 006/008 | Two genuine higher-version builds, real GUI opt-in/check/ordinary quit; manually reopen | ENV-4 | Pass (bounded) | API-05-first-update.log, active-draft screenshot, fixture14 log: 1.5.13→14, same saved work hash/opt-in, 3-day clock shift with active draft, no auto reopen | No claim about running three real days or real model calls |
| API-05b | 006/008 | Switch off while second release verifying; subsequently manual download + Install & Restart via actual Settings | ENV-4 | **Fail** | API-05-discrepancies.md (exact reproduction and both findings); API-05-second-update.log, API-05b-manual-observation.log + screenshots. Correct 1.5.15 committed; no autonomous usable app at 90s; independent menu control works. Manual controls stuck after opt-out until restart | Preliminary product/lifecycle origin for focused review. Not a signing failure or waived gate |
| API-07b | 003/004 | Current renamed full package; offline service, invalid signature, signed record for a different package | ENV-4 | Pass (bounded) | API-07b-refusals.log, API-07b-guest.py, three error screenshots. 0/2/2 requests; each GUI refusal before auth and install absent | Xvfb display probe corrected; exclusions/HTTPS/redirect remain separate |
| API-08b | 005/006/008 | Reviewed product tree only, Linux-only validation ref, native hosted x64 + ARM64. Run 44516994195 | Remote CI | **Pass** | API-08b-preflight.txt: exact tree comparison, allowed graph, secret gate, validated public vector; no publish, credentials or tickets uploaded | API-08b-receipt.json / API-08b-native.log: both native jobs passed including packaged-server smoke. ARM package c04addff…, x64 e459d9c7…. No ARM GUI or all-platform release claim |

| API-04c | 001/002/003/004 | 22 portable directly and via user desktop shortcut, 26 consent/polkit cancellation then successful enrollment with graphical auth, redirected file and installed menu | 22.04.5 / 26.04.1 x64 | Pass (bounded) | API-04c-summary.txt, API-04c-clean-{22,26}.04.log, API-04c-resolute-state.txt, API-04c-resolute-cancel.log and screenshots. All four clean launches healthy, nested renderer PID/Seccomp/NoNewPrivs, no sidecar for these entry paths | No claim of global policy relaxation or ARM GUI |

## Post-repository confidence / broader decision
Scores before shell journeys: requirements 45%, boundary directness 60%, integration realism 50%, environment fidelity 50%, failure/lifecycle 65%, user/shell 45%, durable regression 80%; average 56.4%. Strong crypto/owner/socket/packaging evidence, but actual enrollment, updates and sandbox matrix missing. Broader validation Required (Project Desktop Validation / Lifecycle), not browser-only. Actual current AppImage and normal Ubuntu graphical agent needed; no weakening host policy. Full acceptance blocked by missing direct proof, not waived by scores. Final scorecard follows after journeys.

## Environment and reproducibility details
ENV-4: private test-owned continuation snapshot of the assigned Noble 24.04.5 guest, real UID1000, Xvfb/Openbox and actual native authorization agent. Stage versions 1.5.13/14/15, private build-only test trust, exact sidecars and generic loopback updater feed. No changes to tracked product, chosen data root is synthetic. Full fixture commands/actions and hashes in evidence/API-05-discrepancies.md and scripts named there. Operator recovery menu launch was not mistaken for a successful application relaunch.

ENV-3: assigned Ubuntu24.04.5 KVM guest, kernel6.8.0-147-generic, normal UID1000 witness; host QEMU10.2.1 with snapshot=on, 4GiB/2CPU, own SSH21884. Ubuntu packages Xvfb :91, Openbox, policykit-1-gnome, zenity and runtime libraries installed in ephemeral guest only. Agent warning about absent GNOME SessionManager did not prevent system-bus registration: real graphical password dialog and journal ONE-SHOT were observed. This is not the default full GNOME desktop image and does not prove Ubuntu26 or22.

Original current package SHA256 de7e643e316a9593d63ce79f8eb0483f21460fded1fea61946f8d917927e4132 is full production-origin build with disposable test trust. Test-origin full package SHA256 df66a9f8649fa94ba8a17d1ba24a61c65efd654f465f4d30624a154af275ea15 uses identical renderer/server and the existing explicit desktop_test build tag to pin loopback18889; native helper SHA25639e8baf8d7edefdee85f85f492f9fd5771b1376a6d849da746a3856b85f95a98. No runtime origin/key override or production source edit. Sidecars served at exact canonical v1.5.13 paths despite local filename MyCurrentRenamed.AppImage. Test-origin bounds are real; public HTTPS transport not exercised.

Setup details and exact runnable helpers: evidence/API-02-fresh-build.sh, API-04-test-package.sh, API-04-environment.txt, API-04-guest-gui.sh, API-04-guest-remove.sh and API-07-refusals.py. Full build succeeded from frozen install alone with no manual dev prebuild; shared pnpm/download caches permitted. Host is Ubuntu26 not the workflow Ubuntu22 runner. Existing extracted build toolchain supplied make/GCC15, no host install. API-02 includes Node units15 and Go packages, build gates/typecheck, final-byte signature/layout/metadata and real Electron-Node server readiness. Native ARM64 remains unproved.

## Acceptance-Criteria Proof
| AC | Critical | Cases | Result | Remaining proof / user-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04/04c | Proven | Normal graphical one-shot enrollment; 24 and 26 GUI + actual kernel renderer sandbox + server |
| AC-002 | Yes | API-04c | Proven | Ubuntu22 capable direct/menu from clean ports: actual sandboxed renderer and healthy embedded server, no auth/sidecar/protected install |
| AC-003 | Yes | API-04/07 | Not Proven | Real cancel,404,oversize,remove proven; OS-auth cancellation also proven on 26; remaining transport/recovery matrix not complete |
| AC-004 | Yes | API-04/06a/07 | Not Proven | Current seals/auth/ownership/exact attachment/userns policy/removal strong; remaining peer/systemd/fault matrix incomplete |
| AC-005 | Yes | API-02/03/04/08b | Proven | Actual x64 packaged Node argv/signals/exits and embedded readiness; both native packages built and passed packaged server smoke in API-08b |
| AC-006 | Yes | API-05a/05b/08b | Failed | Two full signed commits, data marker/opt-in and original protected copy exercised; explicit restart failed (API-05b); native CI passed |
| AC-007 | No (Delivery owned) | API-09 | Not Proven | Evidence/owned cleanup retained; no personal integration, release or checkout update performed |
| AC-008 | Yes | API-05a/05b/06a | Failed | API-05a ordinary quit/active-work passes, API-05b opt-out leaves nonusable manual state; second commit without automatic relaunch; remaining recovery matrix independent |
No part is relabelled Only The User Can Check. API-08 authority resolved under SR-015; both native runs passed without production credentials.

## Mandatory confidence scorecard
Post-repository baseline 56.4%; round-1 71.4%. Round-2 judgments (not probabilities):

| Category | Final | Basis |
| --- | ---: | --- |
| Requirements and AC proof | 60% | Direct counterevidence on two update behaviors; large portions of real startup/continuity proven |
| Changed-boundary execution directness | 95% | Full signed bytes, actual kernel/writer/launcher/server and settings UI crossed; not all recovery paths |
| Cross-boundary integration realism | 90% | On-disk commits across two full versions; real GUI controls and real updater, disposable trust/network |
| Environment and fixture fidelity | 90% | Three genuine Ubuntu releases on x64 and two native CI architectures; Xvfb/cloud guests, not default desktop images |
| Failure, edge, lifecycle and recovery | 50% | Successful ordinary quit, fallback refusals; explicit restart and opt-out recovery failed, fault matrix open |
| User / desktop surface | 70% | Direct GUI and after-boot menu plus capable/restricted launch matrix, but two user-visible failures prevent acceptance |
| Durable regression quality | 80% | Real socket suite and owner checks, missed verification cancellation and actual native relaunch |
Mean 76.4%; required 95% and critical acceptance proof not met regardless of scoring.

## Broader execution and remaining work
Required, executed; no delivery. See SR-015 and api-08-native-linux-disposition.md for CI-specific authority. Preserve x64/ARM64, no use of the combined release workflow. Two failures require source/evidence-origin review. Retest repaired behavior; complete outstanding repair, channel, fault and transport scenarios before claiming acceptance. Unexecuted parts are not waived.

## Persisted data / legacy
No migration or new compatibility path. Across both full commits, synthetic saved workspace bytes survive; user opt-in survives first launch after upgrade, subsequent opt-out retained. Unsent draft remains readable while first update is staged. Not every data type or unsent-draft persistence across application restarts was established.
## Durable coverage changes and mocked dependencies
Added autobyteus-web/linux-install/cmd/writer/main_test.go (API-06a): production handle and store over real Unix sockets, real SO_PEERCRED, signed inode and framing; normal nonroot caller, configured different target UID rejection, two inert signed commits, tamper/replay, typed consumed/restarted receipt and restaging. No production source or stale-test removal. One small test cleanup guard rerun passed; both runs retained. Proportional test review required on reviewed Large/High route after successful validation; not requested as a successful output now.
Existing Electron lifecycle evidence mocks OS/writer boundaries. Native new suite uses inert payloads and synthesized expected peer UID rather than creating a second OS login; does not prove systemd socket permission configuration. VM uses real systemd/provisioner/AppArmor/polkit but disposable signer and loopback release assets. All distinctions retained in case rows.

## Round-1 cleanup / retained state
No user desktop/app/process/data changed. Host failed isolated launch auto-cleaned (list empty). Guest app ordinarily closed, owned installation/service/socket/profile/account/menu removed and synthetic data hash comparison passed before guest shutdown. All guest Xvfb/agent/feed processes ended; QMP snapshot guest stopped (PID219774 absent), overlay discarded, assigned original guest disk untouched. No VM reboot claimed. No source branch push, CI, release/publication, production keys or final-target change.
Retained private test-owned directory /home/ryan-ai/hdd_drive/autobyteus_org/api-e2e-autobyteus-5 holds fresh clone, current/test-origin packages, ephemeral trust and setup diagnostics for continuation; disposable private key stays mode0600 outside Git. Assigned /tmp/autobyteus-5-* originals remain for downstream reuse. Raw failed extraction-harness log retained there; concise cause and corrected mounted-AppImage run committed. No tracked binary/package or key.

## Round-2 cleanup and outstanding tests
Noble snapshot stopped and discarded after manual action recovered 1.5.15; Jammy and Resolute stopped after ordinary app close. Private executed builds/disposable trust, verified cloud images and stopped dedicated overlays under private API/E2E continuation directory for repair rerun. No production data, keys, release or unrelated user resources touched. CI stored no binary artifacts; inspected successful receipt and removed both hosted and local scratch refs/worktree. Actual product ticket branch was never pushed. No full xattr/disk/fsync/ACK/rollback/systemd peer matrix, writer-service restart recovery end-to-end, channel switch, all transport refusal variants or post-breakage repair proof claimed. Rerun these and both failures after independent review; no waiver.

## Latest authoritative result
**Fail — API-REV-002; 76.4% confidence; not acceptance-ready.** See evidence/API-05-discrepancies.md. No product change by API/E2E. Request focused failure-origin review, not a test-suite pass or Delivery. Preliminary origin: managed asynchronous invalidation/UI readiness and explicit relaunch path. The build-only branch is disposable CI orchestration only, not the delivery branch or a release.
