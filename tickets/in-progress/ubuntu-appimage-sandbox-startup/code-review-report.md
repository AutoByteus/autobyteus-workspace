# Code review — protected Ubuntu AppImage

## Review round and decision

**CRR-004 — Pass for independent API/E2E validation.** Implementation Review, round 4, 2026-11-19. **Large / High**, independent review route unchanged. Both prior packaged failures have source-level resolutions. **API-REV-002 is still a failed execution result**; only a new independent execution can supersede it. No release or delivery authority.

- Reviewed `fix/ubuntu-appimage-sandbox-startup` → final target `personal`; received HEAD `1ca0c8b98bb989bf1e3d97ec0132870b5ecf6c3e`. Cancellation change `9017bd351d`; handback/packaging change `c90f3ba8f2`. Personal base `f7b4d687`, integration merge `bc87bef825`.
- Trigger: `implementation-handoff.md` and `implementation-revision-record.md`, **IR-004/005**, following **API-REV-002 Fail / CRR-003**. Prior implementation-source result **CRR-002 Pass** is not transferred to the changed transport. DR: N/A.
- Authority: `requirements-doc.md` **SR-012**, investigation notes and solution history through **SR-016**; `design-spec.md` **DS-004**, `design-review-report.md` / architecture history **ARCH-REV-004**. Manual-refusal and stage-lifetime clarifications still apply; `api-08-native-linux-disposition.md` (**SR-015**) governs native CI. Reviewed against the project DESIGN/TESTING guidance and shared design principles. Ticket-relative evidence below.
- **Full Re-Audit**: an application callback formerly dispatched Electron relaunch; now a verified main and its supervising native launcher share a new process-lifetime protocol, and both the native package and build smoke surface change. Rechecked the production delta against CRR-003, the upstream scenario map, all structural checks and the complete scorecard. Retained unchanged enrollment, release/writer, portable, notification and server evidence only for the paths/bytes it originally exercised. No production/test edits, privilege operation, new test rerun or remote dispatch by reviewer.

## Supported scenario and production-path basis

| Approved behavior / scenario | Independent trigger and expected outcome | Current forward path and boundary | Status |
| --- | --- | --- | --- |
| BEH-001 / SCN-001, normal | User opens the official download on a restricted Ubuntu host and chooses setup | AppRun detects pre-ready fatal → consent/acquire exact release → sealed one-shot authorization/provision → canonical launch as original user | Confirmed; no change to trust/custody |
| BEH-002 / SCN-002, normal | User launches on capable or already enrolled host; gets usable sandboxed desktop without enrollment | Node mode excluded; portable GUI supervised normally; installed path checked, original download redirects, then canonical GUI is supervised. Readiness FD3 remains separate from handback | Confirmed; host coverage has recorded limits |
| BEH-003 / SCN-003, normal operational | Packaged Node/server invocation needs actual ELF, original args, signals and status | Launcher handles Node mode before installed/portable GUI selection; no restart protocol in this path | Confirmed |
| BEH-004 / SCN-004, normal and explicit edges | User opts out during verification, uses manual controls in the same session, or explicitly chooses Install & Restart. Independent ordinary quit must *not* reopen | Settings → AppUpdater → managed session → authenticated writer. Manual restart after confirmed server exit and known identity hands back to the original supervisor; automatic quit activates only if eligible and remains closed | Confirmed in source; see finding resolution and independent execution gate below |
| BEH-005 / SCN-005, explicit edges | User refuses setup or requests removal; invalid admission must not weaken OS security or change unrelated data | Fixed resources and signed identity; refusal/removal via existing consent/provision/store owners; no update-time authorization or lower-sandbox fallback | Confirmed; no expansion of setup authority |

Scope guardrail and Change Scope remain intact. REQ-005/007, AC-006/008 cover the affected lifecycle; no new product behavior or approval needed. Root setup, ordinary-user activation, release signing and process lifecycle still span multiple high-risk boundaries, justifying the classification.

## Prior findings, candidate gate and material premises

| Candidate / disposition | Independent basis | Path, consequence and verification |
| --- | --- | --- |
| F-API-01 — supported normal opt-out/manual continuation; this ticket, source resolved | API-05b actual Settings toggle under AC-008 left Verify at 100% and no manual controls; not inferred from a callback | `ManagedUpdateSession.stageDownloaded` owns the verifying generation. Start invalidates readiness but does not announce cancellation. On supersession, it awaits stale receipt disposal (or verification rejection); only the still-owning verification with no quit intent emits cancellation settlement. `AppUpdater.managedEvent` then ends download bookkeeping, clears progress and projects available, not ready. IMP-27/30 and current IMP-34/36 distinguish “busy until settled” from “stuck”; manual download and restart were exercised in the same Settings session. |
| F-API-02 — supported explicit restart; this ticket, source resolved | Actual API-05b click committed correct bytes but produced no GUI/server; an independent menu launch of identical bytes succeeded. ARCH-REV-004 **MP-001**, IMP-31/32 establish failed mount from the prior restart context before AppRun | Use the original ordinary-user supervisor for the one authorized re-entry, not the stopped Electron's context. Manual request needs a claimed endpoint *before* stop; then positive server-gone, generation/channel and writer ACK matching candidate, or authenticated status matching candidate/old. For supersession during stop, unchanged baseline must be confirmed. Known-old receipt loss and definite refusal record distinct outcomes; unknown identity or unconfirmed stop cannot send a restart. Write failure cannot claim exit76; settled failure allows later ordinary quit without retry. IMP-33/34/36 support boundary and actual successor, not merely an ACK. |
| F-CR-001 / F-CR-002 — prior supported failure continuations; remain resolved | User manually downloads after permanent automatic refusal, or quits after unresolved manual install | Derived blocked version still gates *automatic* dispatch after stop. Failed restart clears pending readiness and prevents a second activation while letting ordinary quit proceed; automatic failure/unconfirmed stop retains terminal exit behavior. Source + current managed session/updater tests (IMP-34); CRR-002 for original red/green. |
| Descriptor claim/non-inheritance — supported mechanism; resolved in final implementation | Product starts an embedded server in a real managed session. Prefinal packaged scan actually found the endpoint in the server | Narrow fixed-FD Node-API claim sets CLOEXEC before backend spawn; final full-package scan found only the managed main holding the endpoint. Receiver independently requires direct-child kernel credentials. IMP-33/34. |
| Generic relaunch service, TTL/heartbeat or broader incident recovery — reject as required mechanisms | No approved actor/contract requires remote restart commands, elapsed-time stage expiry, or app re-entry after unknown identity | No caller-provided executable/path/args, no second writer, no expiry machinery. A known bad Electron restart context is not evidence that all launch paths need replacing. |

**Material-premise and scenario gates: Pass.** The real Settings and same-byte menu controls independently support MP-001. No speculative timing, hostile administrator or additional product workflow was used to create or dismiss a finding. No held candidate or open source finding.

### Transport and lifetime audit

1. `cmd/launcher/main.go` supplies managed mode only on the canonical installed GUI branch. `internal/launch/supervise_linux.go` leaves FD3 readiness/classification independent; a managed socket pair adds fixed child FD4 and a non-authorizing inode hint. Without the pair the GUI can start; manual restart is unavailable.
2. After managed-context verification, `electron/launch-profile/managedRestartChannel.ts` checks socket/inode and consumes the hint. The fixed-purpose `linux-install/electron/managed_restart.c` claim checks nonblocking datagram type, parent identity and bounded hello and marks the endpoint close-on-exec. The resulting main-only callback writes one fixed indication once and closes. No generic fd setter, renderer IPC command, destination or persisted grant.
3. `restart_linux.go` requires the direct main's **normal exit 76 plus exactly one valid packet** with matching kernel PID/UID. Exit alone, byte alone, signal/crash, malformed/truncated, duplicate, foreign or unexpected ancillary data cannot authorize re-entry. Received rights are not adopted. Ordinary quit uses its own pass latch and sends no restart indication. Error handling has no second install/exec route.
4. Supervisor installs signal observation before child start, forwards termination and remembers it; signal handoff checks collected/queued termination at the final dispatch decision after revalidation. Re-derives install from nonzero matching real/effective UID; checks protected live target, drops old AppImage runtime bindings, resets cwd, marks nonstandard descriptors close-on-exec and replaces itself once with fixed canonical argv. The updater, writer and child choose no target. This is a source/control-flow assessment, not a claim of exhaustive kernel timing tests.

## Structural and design checks

| Check | Result / evidence |
| --- | --- |
| Design health | Pass — replaces demonstrated bad restart context without changing intended behavior. |
| Supplemental constraints | Pass — independent automatic block, typed manual outcome, no stage TTL, secret-isolated build route preserved. |
| Data-flow spines | Pass — launch, setup, Node, manual handback and ordinary quit distinguish initiating event and terminal owner. |
| Ownership boundaries | Pass — install/provision, signed store, app stop, process re-entry and notification persistence remain separate. |
| Off-spine concerns | Pass — receipt verification and fd bootstrap support named owners; neither decides when to quit. |
| Existing capabilities | Pass — existing Settings IPC, shutdown, writer/status and notification records reused. |
| Reusable owned structures | Pass — same signed release identity, stage and notification DTOs; no new shared command object. |
| Shared model tightness | Pass — generation, receipt, installed digest and direct-child handback have distinct meanings. |
| Coordination | Pass — one managed session owns quit/activation; original supervisor alone owns native exec. |
| Empty indirection | Pass — platform adapter and N-API claim each perform a required boundary operation. |
| File responsibilities | Pass — protocol validation in native launch, update eligibility in session, projection in updater. |
| Ownership-directed dependencies | Pass — composition injects optional claimed capability; no session→UI/renderer import. |
| Visible dependencies | Pass — shutdown, server-gone, authenticated writer and restart callback explicit. |
| Authoritative boundaries | Pass — main cannot choose image path, writer cannot launch GUI, renderer cannot use fd. |
| Placement | Pass — C companion with native Linux install; JS claim under launch profile; layout checks in packaging. |
| Partitioning | Pass — narrow native claim justified by real inheritance; no new generic IPC framework. |
| API/command identity | Pass — all fixed control values; status vs successful successor distinguished. |
| Naming | Pass — verification-cancelled vs invalidated, stage-gone vs activation-failed, handback vs ordinary quit. |
| Duplication | Pass — independent child claim/parent verification serve different trust decisions. |
| Patch layering | Pass — replaces failed managed relaunch path rather than adding a fallback behind it. |
| Dead code | Pass — managed relaunch bypass removed; native relaunch outside managed context still has supported callers. |
| Test scenarios/assertions | Pass — same-session controls, exact successor, confirmed-old vs unknown and ordinary quit distinguished. |
| Fixtures/helpers | Pass — real gcc/Node and signed disposable packages complement narrow owner mocks; boundaries recorded. |
| Stale tests | Pass — native/portable controls still meaningful; previous failed journeys retained as evidence, not successes. |
| API/E2E readiness | Pass — current source and affected matrix identified; independent current-byte validation still required. |

## Source size, legacy, docs and cleanup

`evidence/CRR-004-source-size.tsv` lists all **55** audited changed implementation-source paths with base/head/delta nonempty-line counts (tests and fixtures excluded). AppUpdater **472→500** (threshold is *over* 500), composition root **462→479**, managed session **0→147**, new native restart owner **0→93**, claim **0→32**. Largest cumulative effective growth **+209** (provisioning). No >500 source or >220 delta in the inventory; no threshold-driven split.

No new compatibility fallback or version-specific dual read/write. Same app/profile, release identity and signed store format; no migration. Portable GUI, Mac/Windows native updater and direct Node execution are supported paths, not obsolete compatibility. No dead or unused touched source identified. No new follow-ups. Documentation impact: managed installation/explicit restart documented in `autobyteus-web/docs/linux-managed-desktop.md`; `docs/design-cases.md` records why the successor, not the relaunch call, must be verified. Delivery retains release-guide and signing administration ownership.

## Evidence and limits

- Read implementation Checks Run, then inspected current source, code/test diffs and recorded outputs; no duplicate test execution. IMP-33 shows FD4 with nonblock/CLOEXEC and only the main holder in the final observed process tree. IMP-34: 134/134 Electron tests; Go module including real bootstrap claim, direct/foreign and malformed handbacks. IMP-35: both typechecks passed with zero production errors; permitted web87/server1012 test baselines unchanged.
- IMP-36: real Noble x64 disposable-trust **full test packages with rebuilt affected payloads**, not clean CI. Download-origin .13: opt out during verification, manual controls restored, manual Download → Install & Restart; old main/server gone, same supervisor PID/new mount, healthy sandboxed .14, synthetic marker preserved, **without an operator launch**. Separate menu-origin .14 confirmed-old receipt-loss recovery reopened .14 with stored stage-gone; .15 automatic stage waited for independent ordinary close, no reopen; subsequent independent old-download redirect ran .15. No final mount left. Stored failure is not evidence the notification row was visibly checked.
- Prior API-REV-002 restricted/capable host and SR-015 clean dual-architecture build results retain their original scope. Neither they nor IMP-36 prove this changed package on all hosts/architectures. No production signing, release, branch publication, end-user data or release-workflow execution in this review.

## Scorecard

| Priority | Category | Score / 10 | Rationale and remaining action |
| --- | --- | ---: | --- |
| 1 | Data-flow spine clarity | 9.5 | Setup, independent quit and explicit restart trace to distinct outcomes. |
| 2 | Ownership / boundary encapsulation | 9.5 | Supervisor re-enters; session coordinates stop; writer authenticates bytes. |
| 3 | API / command clarity | 9.4 | Fixed one-use indication plus deliberate exit, no target-selection API. |
| 4 | Separation of concerns / placement | 9.4 | Platform-specific claim small and packaged alongside real ELF. |
| 5 | Shared structures / model tightness | 9.4 | Existing signed identity/notification model reused, no new persisted capability. |
| 6 | Naming / local readability | 9.3 | Explicit cancellation and restart failure events; maintain the single owner. |
| 7 | API/E2E readiness | 9.3 | Real failure triggers and reproducible controls available; repeat on independently built current bytes. |
| 8 | Runtime correctness / fidelity | 9.3 | Source and bounded real journeys now agree on successor vs closed state; remaining host/fault matrix is not source proof. |
| 9 | No backward-compatibility / legacy retention | 9.5 | Failed managed relaunch removed, supported unrelated native behavior retained. |
| 10 | Cleanup completeness | 9.3 | Bounded descriptors/stages, documented test cleanup; no stale fallback found. |

**Overall 9.4/10** rounded; not an acceptance-coverage percentage. No score-blocking source defect or prescribed redesign.

## Latest authoritative result and routing

**Pass — CRR-004; Full Re-Audit; Large / High.** No open source findings, new scope item or active failure classification. Next owner: **/api_e2e_engineer**. API-REV-002 remains Fail until a new execution result. No successful-test review or delivery handoff at this point.

Independent gates: rerun the actual Settings opt-out/manual controls and explicit restart with correctly signed current full test packages, both origin paths, healthy successor GUI/server and running-version notification, confirmed-old/unknown controls, ordinary-quit no-reopen, no cached authorization and synthetic work/settings continuity across two updates. Rebuild/smoke both native x64 and ARM64 on the **SR-015 secret-isolated Linux-only route** (not combined release/publish); earlier CI predates the companion and launcher changes. Carry the latest API coverage ledger forward for affected 22/24/26 host checks, repair/channel/refusal/transport/fault cases and remaining release-admin checks. An implementation-owned guest witness is not a substitute for independent validation.
