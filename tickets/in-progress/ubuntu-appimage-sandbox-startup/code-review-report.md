# Code Review Report — protected Ubuntu AppImage

## Review Round Meta
- Entry point: **Implementation Review**, round **1**, **CRR-001**, 2026-11-18.
- Review scope: **Full Review**; initial result, prior result/round **N/A**.
- Reviewed source: `2bb5dcd35f94750a845489f110819c812a1fe0f3`, branch `fix/ubuntu-appimage-sandbox-startup`; personal base `f7b4d687`, integration merge `bc87bef825`. Final target personal.
- Task root: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-startup/tickets/in-progress/ubuntu-appimage-sandbox-startup` (relative ticket artifact references below resolve here).
- Requirements/investigation/history context: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`; approved **SR-012**, subsequent **SR-013/014**.
- Design context: `design-spec.md` **DS-003**, `design-review-report.md`, `architecture-review-revision-record.md` **ARCH-REV-003 Pass**. Prior AR-001–003 resolutions preserved.
- Supplements: `manual-install-failure-clarification.md`, `stage-lifetime-clarification.md`.
- Trigger: Implementation Engineer's **IR-002** completion; reviewed `implementation-handoff.md` and `implementation-revision-record.md` (IR-001 recovery and IR-002 completion).
- Technical authorities: shared design-principles, design-examples Example 7, ticket-scope; root/package AGENTS, root DESIGN.md and TESTING.md. No closer DESIGN document found in changed package scope.
- Code review history: `code-review-revision-record.md`; latest authoritative round is this round.
- API/E2E coverage investigation, execution/revision report, failing API scenario and delivery revision: **N/A** (pre-API source review). API-REV / DR: N/A.

## Routing Classification Review
**Large / High confirmed**, independent source review required. Pre-main executable custody, privileged provisioning, nonroot authenticated activation, same-inode identity, release signing and quit ownership cross substantial runtime/security boundaries. No classification change or new product approval required. Selected route: implementation review; **Fail — implementation-owned Local Fix**, not advancement to API/E2E.

## Review Scope
Reviewed the complete changed implementation-source inventory against the approved launch/update/refusal paths: native commands and internal packages, build/afterPack, release workflow/signing/metadata scripts, managed session, updater/notification record, shared DTOs/stores/components/locales and installation documentation. Traced preserved ApplicationShutdown and native updater policy as callers/dependencies. Reviewed changed tests proportionately for scenario assertions, not under source-size limits.

Excluded: execution of privileged host operations, production credentials, actual GUI/host matrix, release/push/merge and unrelated node/server functionality. No production or durable test fix was made. Reviewer additions are reports, size inventory and a bounded diagnostic probe.

### Evidence and checks
- Read IR-002 Checks Run before executing anything. Reused IMP-09/11/12/15/16/17/18/19/20 evidence and its stated commits/limitations; no recorded suite/build/typecheck was rerun merely for confirmation. Final TS evidence remains applicable; final native menu delta has its own packaging evidence.
- New focused command: `node tickets/in-progress/ubuntu-appimage-sandbox-startup/evidence/CRR-001-lifecycle-probe.cjs` from worktree root. Exit 0; output in `evidence/CRR-001-lifecycle-probe.txt`. It transpiles and executes the **actual** AppUpdater, ManagedUpdateSession, ApplicationShutdown and notification persistence owners, mocking only Electron/updater/native-writer edges. Synthetic temporary profile removed in finally. This is local lifecycle evidence, **not** real writer/Electron E2E acceptance.
- The probe first generates a permanent automatic-install failure through production events, then restarts the owners, manually downloads and requests ordinary quit. It does not manufacture a hidden notification record. Its second journey requests manual restart, loses activation/status replies and subsequently attempts ordinary quit.
- Source-size inventory: `evidence/CRR-001-source-size.tsv`, calculated against f7b4d687. `git diff --check` clean before reviewer artifacts.

## Upstream Behavior And Production-Path Basis Confirmation
Approved intent and scope are understood; no reapproval or new behavior ID is proposed. The architecture's map is usable, but **BEH-004 implementation fidelity is contradicted** in two bounded paths. Other rows are source confirmations, not platform acceptance.

| Behavior | Status | Actual path/lifecycle evidence | Contradiction |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | build/scripts/linuxInstallPack.ts → cmd/launcher → launch.Supervise → Consent → acquire.Fetch → sealed descriptor + Authorize → cmd/provision → install.Provision → canonical exec | None identified in source; current full graphical authorization still unproved |
| BEH-002 | Confirmed | generated explicit Exec argument → native AppRun; managed redirect or supervised real Electron; readiness ends early-fatal classification; no managed re-enrollment | Actual renderer namespace/seccomp remains downstream |
| BEH-003 | Confirmed | launcher handles ELECTRON_RUN_AS_NODE before managed detection, directly execs unchanged ELF with args/environment | IMP-13 packaged argv/signal/exit evidence retained |
| BEH-004 | **Contradicted** | release signing → downloader → native client → peer-checked store stage → session readiness → independent quit/explicit restart → stop → activate/status → canonical relaunch/quit → notification reconciliation | F-CR-001 automatic failure block bypass; F-CR-002 settled manual failure traps subsequent quits |
| BEH-005 | Confirmed | explicit setup consent/auth, independent root verification; root-owned support/templates; writer-owned app only; Remove checks ownership/content and disables owned resources; existing row distinguishes manual refusal | No new password surface, arbitrary destination or native-install fallback identified; real rollback/removal matrix outstanding |

## Supported Product Scenario And Reachability Gate
All scenarios used below originate in approved requirements/contracts, not the probe. No hostile administrator, same-user malware containment, unrelated concurrent workflows or generalized disaster recovery is assumed.

| Scenario | Behavior/contract | Kind and initiator | Independent supported trigger and goal | Shape | Forward path/lifecycle and expected outcome | Independent evidence | Validity / use |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001 | User | Open official download on affected Ubuntu; choose Install | Normal | Pre-main identified failure → consent → exact-release acquisition → one-shot authorization → protected launch as original user | SR-012, DS-003 L1/L2 | Supported Normal Scenario / Use |
| SCN-002 | BEH-002, REQ-002 | User | Launch direct/menu on capable or enrolled host | Normal | Native launcher → sandboxed GUI/server, without extra setup/network | SR-012, DS-003 L1 | Supported Normal Scenario / Use |
| SCN-003 | BEH-003, REQ-004 | Operational | Packaged Node/server invocation | Normal | Direct real ELF → existing args/signals/exits, no consent | SR-012, DS-003 L3 | Supported Normal Scenario / Use |
| SCN-004 | BEH-004, REQ-005/007 | User/system | Opted-in signed update while working; ordinary quit later or explicit Install and Restart | Normal | Download → verified stage → one quit owner → signed atomic activation → appropriate quit/relaunch | SR-012, DS-002 U1/U2 | Supported Normal Scenario / Use |
| SCN-004 / block contract | BEH-004; permanent automatic failure block | Contract/user | A definite automatic-install refusal occurs; user retries **Download**, then later quits without selecting Install and Restart | Explicit Edge | Failure is persisted, next check honors block, manual download remains supported; ordinary quit must not erase the independent block or retry automatically | DS-003 preserve existing failure authority; both designer clarifications explicitly retain independent permanent blocks; notification exposes Download and states not retried automatically | Supported Explicit Edge Scenario / Use (C-001) |
| SCN-004 / unknown outcome | BEH-004; safe manual recovery and ordinary quit | Contract/user | Explicit restart encounters unavailable activation/status response; user subsequently closes/quits the app | Explicit Edge | Stop is confirmed, commit unknown, no relaunch; a **settled** failure must not retain an in-flight veto against every subsequent ordinary quit | DS-002 step 3 lost reply/unknown outcome, step 2 ordinary quit and existing shutdown failure behavior | Supported Explicit Edge Scenario / Use (C-002) |
| SCN-005 | BEH-005, REQ-003 | User/contract | Cancel setup, receive invalid signed input, or request documented uninstall | Explicit Edge | Refuse without weaker sandbox; reverse only owned resources; retain user data | SR-012 AC-003/004 and DS-003 custody/removal | Supported Explicit Edge Scenario / Use |

### Candidate Finding And Mechanism Gate
| Candidate | Observation/mechanism | Scenario / independent trigger | Forward path, lifecycle, consequence | Evidence | Disposition / scope | Proportionate response |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Ordinary quit ignores existing automatic-install block | SCN-004 block contract; prior definite refusal, later manual Download | AppUpdater download → session stage → willQuit selects pending solely by opt-in → activating event clears permanent failure → writer activation | managedUpdateSession.ts:69–93; appUpdater.ts:502–505; appUpdateNotificationRecord.ts:100–102,133–136; probe lines 1–4 | **Promote / This ticket** | Enforce existing automatic eligibility at managed dispatch; retain manual install capability and unrelated block history; regression through real owners |
| C-002 | Manual failure leaves restart intent latched forever | SCN-004 unknown-outcome contract; later independent quit after failed manual restart | requestRestart sets intent → activate and status reject → outer catch returns without passQuit/reset → subsequent willQuit preventsDefault and returns | managedUpdateSession.ts:62–77,95–115; probe lines 5–7 | **Promote / This ticket** | Settle failure to a safe state permitting ordinary exit without second activation/relaunch; test post-failure quit |
| C-003 | Completed stage might need an elapsed-time TTL/heartbeat | SCN-004 long active session | No wall-clock expiry is required; receipt remains bound to one transaction and baseline | stage-lifetime-clarification.md; store.receive/activate and restart reaping | **Reject** as a finding | Preserve no-TTL design; no new refresh mechanism |
| C-004 | Portable/native updater retained alongside managed writer | SCN-002/004 preserved deployment contexts | Branch is selected by verified managed context; distinct supported portable/Mac/Windows behavior, not historical compatibility | detectLinuxManagedInstall; AppUpdater.initialize/installUpdateAndRestart | **Reject** as legacy finding | Preserve supported native path; no speculative removal |

## Structural / Design Checks
| Check | Result | Evidence | Required action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Missing privilege/install boundary and explicit managed transaction split implemented; no general updater framework | None |
| Matches approved supplemental artifacts | **Fail** | C-001 violates explicit preservation of independent automatic block; typed receipt-loss and separate manual outcome otherwise match | F-CR-001 |
| Data-flow spine inventory clarity/preservation | Pass | L1/L2/L3/U1/U2 trace above; local store and session loops have named owners | None |
| Ownership boundary preservation/clarity | Pass | Root provisioning vs nonroot writer vs app lifecycle remain separate; no structural ownership bypass established | Correct local lifecycle rules, not a new coordinator |
| Off-spine concern clarity | Pass | release/imagefile/protocol, error reporter and notification persistence each serve a concrete owner | None |
| Existing capability/subsystem reuse | Pass | Existing shutdown, automatic policy, IPC/controller, notification row/stores reused | None |
| Reusable owned structures | Pass | release.Record owns signed identity; shared UI DTO and reusable typed receipt | None |
| Shared-structure/data-model tightness | Pass | Stage ID, live baseline, signed candidate and app generation are distinct; no second live-version database | None |
| Repeated coordination ownership | Pass | Single managed session; writer serializes store, not application shutdown | None |
| Empty indirection | Pass | Linux adapter translates process/receipt boundary; error reporter owns classification/deduplication; no empty facade identified | None |
| Separation of concerns/file responsibility | Pass | Native custody, resource install, admission, and release tooling separate; Go transaction files retain coherent sequences | None |
| Ownership-driven dependencies | Pass | App composition creates session; updater sends settings/events; session does not import AppUpdater or operate renderer state | None |
| Visible dependencies | Pass | Writer/shutdown/server-exit and Electron lifecycle hooks explicit; no new registry fallback decides behavior | None |
| Authoritative Boundary Rule | Pass | Renderer → updater → session → writer client; no renderer or updater direct store/privilege access | None |
| File placement | Pass | linux-install owns native boundary, application owns quit, updater owns adapter/notification, scripts owns signing | None |
| Flat vs over-split layout | Pass | Packages reflect security/transport/transaction boundaries, not arbitrary per-function facades | None |
| API/interface/command identity clarity | Pass | Fixed per-UID paths, expected digest, typed stage receipt; no caller-supplied executable/destination/trust key | None |
| Naming and vocabulary | Pass | Managed installation, stage, activation and running-version observation separated; glossary updated | None |
| Unjustified duplication | Pass | Go/JS independent verifiers required across trust/runtime boundaries and share byte vectors | None |
| Patch-on-patch complexity | Pass | No native fallback layered behind managed refusal; snapshot settings avoid callback coordination cycle | None |
| Dead code removal | Pass | Replaced managed native install and immediate automatic-install branches bypassed only for managed context; retained branches remain reachable elsewhere | None identified |
| Test scenarios/assertions aligned | Pass | Stage lifetime/late receipt/opt-out, signature vectors and separate manual reconciliation assertions follow approved scenarios | Add missing post-failure continuation tests for findings |
| Test fixtures/helpers coherent | Pass | Synthetic data, inert signed payloads and narrow edge mocks; tests labelled as non-E2E | None |
| No stale/compatibility-only tests | Pass | Preserved native suites remain relevant; no requirement to delete supported platform cases | None |
| API/E2E readiness | **Fail** | Two reproducible lifecycle defects remain (C-001/002) despite useful package/unit evidence | Fix before advancing |

## Source File Size And Structure Audit
All **52 changed implementation-source files** counted in `evidence/CRR-001-source-size.tsv`; tests/fixtures excluded. Counts include nonempty comments. All are ≤500; no effective nonempty delta exceeds 220. No size-based finding or arbitrary split requested. The handoff's >220 discussion refers to larger raw transaction files; their measured nonempty counts remain below that trigger.

| Source (under autobyteus-web unless stated) | Before | After | >500 | >220 delta | SoC / placement | Classification / action |
| --- | ---: | ---: | --- | --- | --- | --- |
| electron/updater/appUpdater.ts | 472 | 489 | Pass | Pass (+17) | Existing updater plus extracted reporter; local eligibility fix needed | No structural size issue |
| electron/application/electronApplication.ts | 462 | 477 | Pass | Pass (+15) | Composition/lifecycle wiring | None |
| build/scripts/build.ts | 466 | 467 | Pass | Pass (+1) | Existing build owner | None |
| linux-install/internal/install/provision_linux.go | 0 | 209 | Pass | Pass | Ordered enrollment/rollback transaction; templates/identity separate | None |
| linux-install/internal/store/store_linux.go | 0 | 195 | Pass | Pass | Single stage/activation owner | None |
| electron/updater/appUpdateNotificationRecord.ts | 203 | 241 | Pass | Pass (+38) | One durable notification authority | None |
| Remaining 46 source paths | See TSV | ≤293 | Pass | Pass | Reviewed by ownership areas above | None |

## Legacy / Backward-Compatibility Verdict
| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No historical native/install shim or trust fallback |
| No legacy old-behavior retention | Pass | Portable/Mac/Windows are supported deployment contexts (C-004), not legacy |
| Dead code removed in touched scope | Pass | No concrete dead item identified; native entrypoints and build-tag files have runtime/build callers |
| Approved persisted-data decision followed | Pass | Same app identity/data, optional manual evidence directly readable; no migration |
| No version-specific dual reads/writes | Pass | One signed installed identity; version ordering is admission, not compatibility |
| Transition mechanics match design | Pass | Disposable stages reaped on writer restart, live inode retained; signed xattrs travel with atomic rename |

Dead/obsolete/legacy items requiring removal: **None identified**. No unused source/test deletion prescribed.

## Docs-Impact Verdict
**Yes.** New install/refusal/removal and quit-only update semantics documented in `autobyteus-web/docs/linux-managed-desktop.md` and root GLOSSARY. Delivery still owns RELEASE.md signing-environment/public-anchor administration and clean build-only gate synchronization. Preserve explicit limitation that public test-trust packages are not publishable. Fixes must keep UI's permanent-block promise accurate.

## Additional Material Premise Validation
ARCH-REV-003 recorded no additional premises; retained custody/sandbox/atomic-identity rulings remain confirmed at source level, not runtime acceptance. C-001 and C-002 contain the complete supported failure-continuation witnesses above; no separate new product premise or wider concurrent-workflow guarantee is introduced. The probe confirms already-supported paths; it does not establish them. No held-evidence candidate affects scoring/routing.

## Review Scorecard
Overall **9.0/10** (rounded simple average, not a pass rule).

| Priority | Category | Score | Why | Weakness | Improvement |
| --- | --- | ---: | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Explicit launch/stage/quit/signing spines | None material | Preserve |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Strong root/writer/application separation | No structural bypass found | Preserve owners during local fixes |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Bounded byte protocol, explicit baseline/stage identity | None material | Preserve fixed authority |
| 4 | Separation of Concerns and File Placement | 9.4 | Concrete native and lifecycle owners | None material | Avoid new peer coordinator |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | One signed inode identity and existing notification record | None structural | Reuse existing failure block |
| 6 | Naming Quality and Local Readability | 9.3 | Distinct stage, activation and running-version terminology | None material | Preserve |
| 7 | API/E2E Readiness | 7.5 | Useful unit/package evidence and candid gate ledger | C-001/002 not covered by continuation assertions; package not ready to advance | Regress both journeys then source rereview |
| 8 | Runtime Correctness And Behavioral Fidelity | 7.0 | Mainline and cryptographic admission clear | C-001 automatic block erased; C-002 ordinary quit permanently prevented | Enforce automatic eligibility and settle failed manual intent safely |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | No weaker install fallback or historical schema branches | None material | Preserve |
| 10 | Cleanup Completeness | 9.3 | Removed managed native bypass; isolated evidence cleanup | None material within review | Keep downstream host cleanup explicit |

## Findings
### F-CR-001 — P2: manual re-download lets ordinary quit retry an automatically blocked release
**Local Fix; C-001; BEH-004; open.** `electron/application/managedUpdateSession.ts:75,89–93` selects an automatic candidate solely from opt-in/readiness/channel/generation. It never consults the existing permanent failure eligibility. After a definite automatic install refusal, a subsequent check correctly refuses automatic download, but the exposed **Download** action can stage that same version. An ordinary quit then dispatches another automatic install. `electron/updater/appUpdater.ts:502–505` calls `recordAutomaticInstall`, which clears the independent block at `appUpdateNotificationRecord.ts:100–102` before dispatch. This contradicts both designer clarifications and the visible “won't be tried again automatically” outcome.

Evidence: probe steps 1–4 persist the failure naturally, create a new process-owner set, demonstrate zero automatic downloads, explicitly Download only, then observe one automatic activation and `automaticFailure=null` on ordinary quit. No Install and Restart action is taken.

Required: apply the existing automatic eligibility/block authority at the managed automatic activation boundary without introducing a second persistence/policy owner. A manual Download must not clear a permanent automatic block; explicit Install and Restart remains supported. Add an integration-level owner test for failure → next launch → manual Download → ordinary quit, plus explicit manual success/refusal and receipt-loss preservation of independent blocks.

### F-CR-002 — P1: failed manual activation permanently vetoes subsequent ordinary quit
**Local Fix; C-002; BEH-004; open.** `electron/application/managedUpdateSession.ts:110–115` leaves `intent='restart'` and `passQuit=false` after a manual activation whose status query also fails. The asynchronous operation has settled, but every later `willQuit` calls preventDefault and returns at lines 69–72. Server/resources have already stopped; the application neither relaunches nor exits. Closing the final window can leave an invisible process that requires external termination. The existing test for unknown outcome verifies no relaunch, but never exercises a later quit.

Evidence: probe steps 5–7 exercise accepted manual restart, confirmed resource stop, rejected activation/status and then a new ordinary quit: `prevented=1`, no quit/exit/relaunch, no operation still in flight. The unsafe-relaunch prohibition is correct; an everlasting in-flight latch is not required by it.

Required: settle the failed manual transaction into a safe terminal/recoverable state that allows an independently requested ordinary exit **without reactivating the uncertain stage or relaunching**. Preserve unknown-vs-confirmed-old outcome distinctions and server-gone safeguards. Add post-failure quit coverage; also check the analogous manual stop-failure catch branch. No automatic restaging or new recovery daemon is requested.

## Follow-ups
None added. Both defects are introduced in this ticket's managed lifecycle and affect its approved acceptance, not unrelated pre-existing issues.

## Classification and Recommended Recipient
**Fail — Local Fix, implementation-owned.** No design authority change needed: bounded eligibility and transaction-settlement corrections within the selected owners. Handoff rule: “When source review identifies an implementation-owned Local Fix or packaging defect that must be corrected before executable coverage.” Recipient **/implementation_engineer**. Fixes return to source review, then API/E2E; no pass notification or forwarding to API/E2E now.

## Residual Risks / Mandatory Downstream Gates
Carry forward IR-002's complete unmet-gates ledger, without interpreting this source audit or local probe as acceptance:
- Current full production-built package/helper with real graphical Ubuntu authentication; older inert tty witness is insufficient.
- Actual Ubuntu 22/24/26 renderer sandbox and server readiness, direct/menu/original-download redirect, reboot, refusal, repair/removal, no global policy weakening.
- Native x64 **and ARM64**, clean dependency-only builds and branch build-only CI; no prepared local build substitution.
- Two genuine signed full updates without cached grants, active-work/long-session deferral, opt-out/channel generations, ordinary quit vs explicit canonical restart, synthetic profile/settings/work continuity; portable/Mac/Windows preservation.
- Real store/socket peer and permission negatives, same-inode integrity, disk/xattr/fsync interruption and lost ACK, restart/supersession, timeout and provisioning rollback. No power-loss guarantee from inert rename units.
- Renamed current full package with exact tagged test sidecars, offline/404/size/redirect/wrong signature refusal before auth, no network on excluded launch paths; separate disposable trust only.
- Protected environment-scoped production signing administration and RELEASE.md sync by Delivery. No production keys, publication or release authorized/performed.

## Latest Authoritative Result
**Fail — CRR-001, Full Implementation Review, Large / High.** Supported Product Scenario Gate: **Pass**; Material-Premise Gate: **Pass** (findings supported; not a behavioral pass). Score summary 9.0/10, runtime/readiness below clean-pass threshold. F-CR-001/002 remain open. API/E2E failure origin: N/A. Next owner: **/implementation_engineer**. Final acceptance remains unproved independently of these local defects.
