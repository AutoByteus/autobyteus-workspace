# Design Review Report

## Review Round Meta
- Package: backend-port-conflict-20261024; reviewed 2026-10-26.
- Requirements: `requirements-doc.md`, **R2 Approved / SR-007**; original R1 obligations retained.
- Investigation: `investigation-notes.md`, E-024..026 and P-012 plus retained earlier evidence.
- Solution history: `solution-revision-record.md`, SR-001..008. Reviewed design: **D4.1 / SR-008**, including retained DS-001..004 and new DS-005.
- Architecture review history: `architecture-review-revision-record.md`.
- Current Architecture Review Revision: **ARCH-REV-004**, round 4. Prior ARCH-REV-003 passed D3.1 only. Trigger: approved in-ticket read-only Codex visibility, continued through two in-round source-grounded corrections.
- Reviewed package commit: `08b864988fae7395e4430e05e73252687ff91caa`; initial D4 commit `a63c250602103395c40436bf318898f4c40ab051`.
- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-conflict-20261024`; branch `task/backend-port-conflict-20261024`; bootstrap base `origin/personal@034bfe51ab697817773ff545d369e1cfc03a79c5` (not newly refreshed by this review).
- Downstream context: native implementation source `d0338db0b`, CRR-002 Pass for earlier scope; API/E2E `c88a6224c` contains scoped API-04/06 successes, incomplete and **user-paused**. No D4 production changes, executable checks, app launch or test resumption performed by this review. Two pre-existing SDK dist directories remain untracked and untouched.
- Authorities: architecture-reviewer skill/full template, updated shared design principles, reachability examples 7/8, repository DESIGN.md/AGENTS.md/TESTING.md, server/web instructions, Codex raw-event mapping and WebSocket contracts. No closer applicable DESIGN*.md found. No project glossary found; D4 terminology is explicit.
- Supplements read: scope approval/intake, Codex investigation and installed schema snapshot, P-012 source/log, prior architecture/implementation/code-review history, API/E2E checkpoint and current solution handoff. Old evidence remains historical, not a new execution claim.

## Routing Classification Review
- Task size: **Large**. Architectural risk: **High**.
- Classification rationale reviewed: explicit lifetime authority across core, two backend hosts and desktop; OS signalling/identity, shutdown ordering and status/UI contracts. Actual change scope supports both classifications.
- Independent Architecture Review required: **Yes**. No routing correction needed.

## Upstream Behavior And Production-Path Basis Confirmation
- Overall basis: **Confirmed**. R2 explicitly approves the bounded visibility addition in this ticket. REQ-001..006/AC-001..006 are retained; REQ-007..009/AC-007..010 add selected-run observation, honest uncertainty and noninterference. FU-002 is incorporated, not a second Task. FU-001 remains outside scope.
- Preserved: ordinary agent/idle lifetimes, native/Codex shutdown owners, strict turn/segment admission, Claude/AGY recorded rows, selected context, user data and unrelated processes. No controls, raw command/output exposure, persistence, remote restoration, arbitrary inventory, release/install or historical-incident cause claim.
- Current source independently opened: manager `agent-run-manager.ts:183-190`; activation registry `:185-195,232-253`; resource manager `:109-145`; AgentRun private backend/instance and `isActive`; all five backend activity forms; CodexThread `:164-187,259-295,340-388`; segment admission; thread notification handler and manager disposal; client request `:143-177,231-235`; BackgroundTaskPanel `:105-160`; background task store/handler; activeContextStore standalone/Team/Org selection; node-bound Apollo utility; AgentRunTermination `:73-88` and Org background-task idle consumer `:323-330`.
- Source findings during review: the purported read-only getActiveRun prunes/releases inactive runs; active-only capability discovery could hide retained stream rows on first entry. Both are corrected canonically in SR-008, verified below; no new behavior approval required.
- Local Team/Org path is supported: activeContextStore exposes the selected concrete Agent run; configured collaboration activation publishes its candidate through the same manager. Missing/nonlocal runs remain unavailable without a forwarding/restoration mechanism.

| Behavior ID | Kind | Approved intent alignment | Trigger/current-state evidence | Target path coherence | Status | Required action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 | System/User | Pass | Prior source and scoped conflict tests retained | Pass: DS-001/004 unchanged | Confirmed | Preserve existing recovery; expanded acceptance still incomplete |
| BEH-003/004 | System/Contract | Pass | Earlier native defects, implementation/CRR-002, API-04/06 scoped receipts | Pass: DS-002/003 unaffected by read-only side view | Confirmed | No new cleanup or idle authority |
| BEH-005 | User/System | Pass | P-011/012 actual command outlives turn; existing panel/store | Pass: DS-005 classification plus exact completion observations | Confirmed | Production query/UI acceptance remains downstream |
| BEH-006 | Contract | Pass | Pruning lookup, strict gate, idle consumers, retained rows traced | Pass: SR-008 observational lookup and explicit retained-row rule | Confirmed | No lookup cleanup, lifecycle event or secret-bearing new payload |

## Supplemental Artifact Coherence Verdict
| Artifact | Purpose/scope clear? | Linked? | Complete for purpose? | Coherent? | Status/approval clear? | Required action |
| --- | --- | --- | --- | --- | --- | --- |
| background-visibility-scope-approval.md | Pass | Pass | Pass | Pass | Pass: user approved in-ticket extension | Do not reinterpret as control/history approval |
| Intake/FU-002 and solution history | Pass | Pass | Pass | Pass | Pass: separate-task proposal superseded | Retain history, do not create another Task |
| Codex investigation, installed schema, P-011/012 source/log | Pass | Pass | Pass for dependency observation | Pass | Pass: deterministic model, real tool execution, not new UI acceptance | Preserve limitations; P-012 logs, not its generic pass label alone, show pre-turn list membership |
| E-024..026 and D4.1 handoff | Pass | Pass | Pass | Pass | Pass: erroneous lookup characterization explicitly corrected | Implement SR-008, not initial D4 lookup |
| ARCH-REV-003 / IR-003 / CRR-002 | Pass | Pass | Pass | Pass | Pass: earlier scope only | Reuse unchanged source evidence by impact |
| API/E2E checkpoint c88a6224c | Pass | Pass | Pass as incomplete checkpoint | Pass | Pass: user-paused, no overall verdict | Do not resume tests or claim expanded acceptance from this review |
| Earlier P-001..008 and historical diagnosis | Pass | Pass | Pass for historical purpose | Pass | Pass: baseline/candidate evidence | No historical Nuxt-causation claim |

Canonical inventory and relevant design/requirements links distinguish approval from evidence. Historical SR-006 statements that full desktop Codex quit had not been tested are superseded by the explicit c88a6224c checkpoint, not silently promoted to overall success.

## Task Design Health Assessment Verdict
| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for current posture | Pass | D4.1 feature posture plus retained D3.1 bug-fix basis | None |
| Root-cause classification explicit and evidence-backed | Pass | DS-005 missing observation with event/idle coupling (E-024); retained native ownership/async quit defects | None |
| Refactor decision explicit | Pass | Retained host scope/anchor design; new read-only inspection boundary and pure per-thread view | None |
| Decision reflected in concrete sections | Pass | Injection/copy, early drain, typed status, file mapping | DS-005 capability/observation owner justified by gate/idle coupling; no global polling supervisor |

## Spine Inventory Verdict
| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Startup/retry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Both native command forms and retained ownership | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Desktop/backend shutdown | Pass | Pass: both platform forms explicit | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Snapshot/event/store/loading UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass; complete consumer dispositions |
| DS-002/003 local scope drain | Open/closing/closed; shared close, concurrent bounded drain | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005/E/R/L | Selected panel/query, pre-gate terminal observation, return generation and bounded thread read | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Retained DS-001..004 design sequences (original architecture evidence; implemented source has since passed CRR-002, not re-reviewed here as code): launch/restart → status owner → managed child stop/start → availability → launch/health → snapshot → renderer; tool → runtime context → scope admission → captured gated anchor → independent identity proof → scope registration → START → actual command PID/result → output/adoption → retained host ownership; POSIX quit → application coordinator → managed stop → backend SIGTERM → Fastify preClose scope drain → existing lifecycle/resources → error/success exit → desktop continuation. Standalone public close and startup unwind are separately described in D2 and have real current entrypoints. Updater explicit install → preparation → existing updater continuation is correctly distinct from ordinary quit. D2 supplies the Windows chain: WindowsServerManager captured child → ManagedBackendShutdownClient ready/request → ServerProcessShutdown request latch → startup-settled barrier → current cleanup authority (prerequisite unwind or app.close) → native drain and remaining resources → complete/failed → actual exit → desktop stop outcome. The client is a transport adapter; WindowsServerManager owns request/wait/force sequencing. Backend startup transfers cleanup authority before the next cancellation checkpoint; the barrier must not await the shutdown promise.

Additional bounded local spine (DS-003 owner): startup active stage → cancellation checkpoint → ownership transfer/checkpoint → startup-settled → one cleanup invocation. Return/event spine: backend cleanup result → bounded send flush → child result/exit observations → desktop completion; ready denotes control readiness only, not RUNNING. Both are **Pass** for readable call order, single governing owner, identity and separation of transport from policy. No public shutdown endpoint or port-based authority is introduced.

Additional affected DS-002 local spines, each **Pass**:
- Launch: scope reserves admission → launcher/resolver create gated platform anchor → observer verifies live birth/group (plus SID in WSL) → scope commits lease → START once → STARTED actual command PID. Scope closing cancels admission, forbids late START and retains committed handles even if response is lost.
- Return/retirement: anchor reports user-command RESULT → launcher once-only completion → executor formats unchanged TerminalResult / manager updates record → scope retains live descendants. Successful observation of command-complete and no non-anchor members → RELEASE → confirm anchor/bridge exit. One unref batched maintenance timer retires naturally empty groups; observation failure retains the lease. Maintenance is not identity continuity.
- Stop: scope records intent → live matching anchor proof → group TERM → bounded non-anchor observation → empty RELEASE or fresh anchor proof and one group KILL → absence verification → independent cleanup report. No numeric-group re-signalling after KILL destroys authority. Scope drains/suspends maintenance with close.
- Exceptional completion (SR-005): launcher latch accepts RESULT/SPAWN_FAILED/terminal transport events; scope drives stop independently and calls finishStop within the existing deadline. Executor alone maps interruption/failure/actual result and retains captured output; no wait for descendant-held EOF. Completion neither waits circularly on cleanup nor proves cleanup. STARTED failure cannot create a record with undefined PID; late events cannot resettle.

Current DS-005 sequences, **Pass** after SR-008:
- Selection → panel composable → captured node-bound typed query → manager.peekPublishedRun → captured run.isActive → run inspection capability → CodexThread bounded list → safe view projection → exact map/activity recheck → selection-generation check → panel. The registry only reads the exact published map; no lifecycle-pruning getter, status reconciliation, activation or replacement retry.
- Raw matched command start (normal gate admitted) → thread view candidate; valid matching turn completion → beyond-turn classification. Exact known late terminal → view fact before strict transcript gate → normal gate remains unchanged. Classification and completion are different facts, not two owners of one lifecycle.
- Thread drives one in-flight, paginated 5s-total read → validates complete membership → merges concurrently arrived exact terminal facts → terminal wins over stale running; absence without completion becomes unknown. Failure/partial data never means confirmed empty; shutdown closes view without waiting for inspection.
- Panel loading/unavailable first entry → selected-context existing stream rows, if any, visibly recorded/last-known. Same-selection good snapshot has precedence; successful snapshot is exclusive, successful event-stream selects reactive store. Empty store cannot prove Codex emptiness. Switching selection clears local snapshot and stale request authority; no second store or durable-history fallback.

## Boundary Encapsulation Verdict
| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Host native command scope | Pass | Pass | Pass | Pass | Sole admission/stop/release authority; lease lifetime independent of output records and agent removal |
| Anchored launcher and command completion | Pass | Pass | Pass | Pass | Private platform scripts/transport, one completion latch; executor owns public result mapping |
| Host shutdown integration | Pass | Pass | Pass | Pass | Shared helper, early nonthrowing drain/final report, startup unwind |
| Desktop managed backend | Pass | Pass | Pass | Pass | Captured-child IPC; stop owns sequencing and child authority |
| Read-only port inspector/status/UI | Pass | Pass | Pass | Pass | No diagnostic PID-to-stop conversion |
| Run inspection / CodexThread / panel | Pass | Pass | Pass | Pass | Manager observational map boundary; run selects backend capability; thread owns raw RPC/facts; panel owns refresh |

## Dependency Direction / Forbidden Shortcut Verdict
| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server → core scope/config | Pass | Pass | Pass | Pass | No core dependency on server/Electron; no serialized service |
| Scope → launcher/observer | Pass | Pass | Pass | Pass | Concrete stop intent/finish ordering, no callback-based lifetime delegation; manager/tool use retained leases, not port/PGID rediscovery |
| Desktop → backend shutdown → local scope | Pass | Pass | Pass | Pass | Explicit private IPC boundary; no observer or port-owner bypass |
| Status → renderer | Pass | Pass | Pass | Pass | Presentation only; both direct and derived consumers dispositioned |
| GraphQL → manager/run → backend/thread → provider; query result → panel | Pass | Pass | Pass | Pass | No client-manager/registry bypass, provider guessing, lifecycle publication or process-control path |

## Interface Boundary Verdict
| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Scope admission/track/close and owned group outcome | Pass | Pass | Pass: execution target plus verified process identity | Low | Pass |
| AnchoredCommandHandle / completion | Pass | Pass | Pass: fixed target/anchor plus command PID; result/interrupted/failed variants | Low | Pass |
| Manager explicit stop by its record | Pass | Pass | Pass: resolve recorded ownership, not arbitrary input PID | Low | Pass |
| Port inspector(port) / diagnostic union | Pass | Pass | Pass | Low | Pass |
| Managed backend stop | Pass | Pass | Pass: exact launched child and its control channel | Low | Pass |
| Updater preparation lifecycle callback | Pass | Pass | N/A: no subject selector | Low | Pass; lifecycle hook is appropriate, not hidden process coordination |
| peekPublishedRun / inspectBackgroundTasks / agentBackgroundTaskView | Pass | Pass | Pass: exact concrete run, runtime instance, compound provider identity privately | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict
| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Native process ownership/inspection | Pass | Pass | Pass | Pass | Extend existing terminal observer; retained anchor addresses measured missing continuity, not a speculative supervisor need |
| Server cleanup composition | Pass | Pass | Pass | Pass | Reuse existing shutdown lifecycle, one shared integration helper |
| Desktop startup/status/quit | Pass | Pass | Pass | Pass | Focused port guard and cached quit coordination |
| Windows orderly stop | Pass | Pass | Pass | Pass | Node IPC invokes existing host close; tree-force is failure fallback only |
| Codex inspection / existing background panel | Pass | Pass | Pass | Pass | Reuse client, run boundary and row rendering; separate side view because existing events affect idle policy |

## Subsystem / Capability-Area Allocation Verdict
| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Core terminal / runtime config | Pass | Pass | Pass | Pass | Typed runtime reference and copy semantics |
| Studio and standalone composition | Pass | Pass | Pass | Pass | One scope per host; other providers unchanged |
| Electron application/updater | Pass | Pass | Pass | Pass | Application owns preparation and final quit continuation |
| Platform backend management | Pass | Pass | Pass | Pass | D2 makes Windows graceful request concrete |
| Shared status and renderer localization | Pass | Pass | Pass | Pass | Complete inventory without another diagnostic subsystem |
| Runtime inspection, GraphQL query and selected-view composable | Pass | Pass | Pass | Pass | Five backend forms explicit; no provider-wide execution rewrite |

## Reusable Owned Structures Verdict
| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Owned group identity/result | Pass | Pass | Pass | Pass | Terminal command-execution area; one handle referenced, not copied authority |
| Anchor protocol/platform scripts | Pass | Pass | Pass | Pass | Launcher-private static modules; shared bounded completion contract, platform-specific transport |
| Early drain/final failure integration | Pass | Pass | Pass | Pass | Shared composition helper; hosts still own teardown |
| Server diagnostic | Pass | Pass | Pass | Pass | Existing types/serverStatus.ts; no duplicate renderer union |
| Inspection capability and view-only snapshot/status | Pass | Pass | Pass | Pass | Server-owned discriminants; generated transport types; renderer view distinct from lifecycle task enum |

## Shared Structure / Data Model Tightness Verdict
| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| AnchoredCommandHandle / cleanup outcome | Pass | Pass | Pass | Pass | Pass | Fixed target/anchor identity; actual command PID distinct; command outcome is not cleanup proof |
| ServerStatusSnapshot diagnostic | Pass | Pass | Pass | Pass | Pass | Discriminated plain data, advisory timestamp/identity |
| AgentConfig scope reference | Pass | Pass | Pass | Pass | Pass | Shared runtime reference, not persisted configuration |
| Inspection snapshot / task rows | Pass | Pass | Pass | Pass | Pass | ObservedAt versus start time distinct; unknown is view-only; opaque task ID, no raw args/output/PID |

Derived consumers listed with a decision for each: **Pass**. DS-005 dispositions all backend forms, query/generated types, panel/composable/localization, existing store/handler, streamed contracts, lifecycle consumers and Codex mapping docs. SR-008 adds manager/registry and explicitly preserves retained stream rows on first entry. No new unknown status enters lifecycle DTOs.

Retained DS-004 consumer verdict: **Pass**. D2 dispositions `ServerMonitor.vue`, its `ServerSettingsManager.vue` host, both ambient declarations and app.vue's loading gate. Source confirms app content is gated on RUNNING for embedded windows. Shared store summary changes while full actionable diagnosis remains in ServerLoading. Both ambient declarations retain the same shared type rather than copying it. AR-002 resolved.

Vocabulary: **Pass**. Scope/group/anchor/command-result/port-owner denote distinct concepts consistently. Internal anchor PIDs are not displayed background records. No new persisted names or vocabulary migration. D4 distinguishes published from active; command turn membership from command completion; provider processId from OS PID; snapshot freshness from recorded streamed rows.

## File Responsibility Mapping Verdict
| File | Responsibility Is Singular And Clear? | Responsibility Matches Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| native-command-process-scope.ts; process-group-observer.ts; process-identity.ts | Pass | Pass | Pass | Pass | Registry/policy separate from OS mechanism |
| anchored-command-launcher.ts; posix/wsl-command-anchor-script.ts; anchor-control-protocol.ts | Pass | Pass | Pass | Pass | Launcher gate/latch and static transport mechanisms, no host policy |
| shell-command-executor.ts; background-process-manager/context.ts | Pass | Pass | Pass | Pass | Executor result mapping and manager output/adoption distinct from host lifetime |
| AgentConfig/context; provider factory chain | Pass | Pass | Pass | Pass | Mandatory hosted injection; dead accessor explicitly removed |
| native-command-shutdown.ts and two hosts | Pass | Pass | Pass | Pass | Concrete shared composition policy |
| port guard/inspector; base/windows/status managers | Pass | Pass | Pass | Pass | Windows child-control adapter has narrow responsibility |
| applicationShutdown.ts; application; updater | Pass | Pass | Pass | Pass | Deadline/cache policy has an owner |
| status type/store/loading/catalogs | Pass | Pass | Pass | Pass | Derived consumers explicitly dispositioned |
| Manager/registry peek, run capability, thread view, query, panel composable | Pass | Pass | Pass | Pass | Explicit map in DS-005; observation/selection/transport responsibilities separated |

## Subsystem / Folder / File Placement Verdict
| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Core terminal command-execution | Pass | Pass | Low | Pass | No generic shared utility framework |
| Server compositions and native backend factory | Pass | Pass | Low | Pass | Factory extraction warranted by responsibility/size |
| Electron server/application/updater and shared status type | Pass | Pass | Low | Pass | No unnecessary layer |
| Renderer store/component/catalogs | Pass | Pass | Low | Pass | Existing conventions |
| agent-execution domain/backends; GraphQL; web composable/types/panel | Pass | Pass | Low | Pass | Existing owners/folders; no generic helper framework |

## Removal / Decommission Completeness Verdict
| Item / Area | Obsolete Piece To Remove Is Named? | Replacement Owner Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Direct shell spawn and one-shot WSL identity parser | Pass | Pass | Pass | Pass | D3 names replacement/removal after both executor and manager use launcher; no unanchored fallback |
| Leader-only stop and swallowed observation errors | Pass | Pass | Pass | Pass | P-005 substantiates replacement |
| Generic conflict handling and void will-quit/timer | Pass | Pass | Pass | Pass | Existing generic unrelated errors preserved |
| Cached native backend factory accessor | Pass | Pass | Pass | Pass | D2 names cache/accessor removal with E-018; search independently reconfirmed |
| Windows taskkill-as-graceful and local signal-only closure | Pass | Pass | Pass | Pass | Replaced by captured-child request and shared ServerProcessShutdown |
| Misleading Codex polling-only comment; proposed pruning lookup | Pass | Pass | Pass | Pass | Correct comment; replace D4 proposal with peek, not remove existing lifecycle lookup |

## Legacy / Backward-Compatibility Verdict
| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Runtime cleanup and conflict contract | No proposed compatibility route | Pass | Pass | Separate unhosted use and unrelated errors are not compatibility branches |
| Dead factory accessor | Existing unused alternate construction entry, removed in target | Pass | Pass | Explicit removal, no fallback scope |
| Read-only view and existing stream providers | No compatibility fallback | Pass | Pass | Explicit provider capabilities; retained received rows are current presentation, not version/history recovery |

## Persisted-Data Transition Verdict (When Applicable)
| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| User data / AgentRunConfig | Not Affected | Pass | Pass | N/A | Pass | Scope and status data are runtime-only; config copy is by reference; stored schemas/readers untouched |
| Codex inspection state / query | Not Affected | Pass | Pass | N/A | Pass | Runtime-only view; no stored field/name change or persistence rewrite |

No migration, ownership journal, historical adoption, reset or backup machinery is justified.

## Change / Refactor Safety Verdict
| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup / Removal Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Anchored launcher → both command consumers → remove old direct spawn/parser | Pass | Pass: no unanchored fallback | Pass | Pass |
| Core scope → injection → host cleanup | Pass | Pass: no retained compatibility seam | Pass | Pass |
| Desktop orderly shutdown | Pass | Pass | Pass | Pass |
| Typed diagnostic → store/UI/catalogs | Pass | Pass | Pass | Pass |
| View facts → observational query → selected panel | Pass | Pass: no lifecycle dual authority | Pass | Pass |

## Example Adequacy Verdict
| Topic / Area | Example Needed? | Present And Clear? | Bad / Avoided Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Leader exit/group drain; external owner safety | Yes | Pass | Pass | Pass | D3.1 concrete launch/retirement/force shapes, P-005/007/008 and IMP-02 |
| Windows desktop → backend close | Yes | Pass | Pass | Pass | Explicit wire exchange, startup-state ordering, ack+exit and failure semantics |
| Exceptional command completion | Yes | Pass | Pass | Pass | SR-005 handles emitter loss/spawn failure without hanging or inventing clean shutdown |
| Typed recovery | Yes | Pass | Pass | Pass | Discriminant vs prose matching |
| Turn versus command completion; inactive lookup/stream rows | Yes | Pass | Pass | Pass | P-012 concrete event order; D4.1 lookup and first-entry transitions explicit |

## Material Premise Validation (Only When Needed)
The first two witnesses below are retained historical design findings, not assertions that the implemented source still has those defects. D4 adds MP-003/004.
### MP-001 — Windows orderly desktop shutdown must reach the native scope, not merely end its Windows backend process
- Related approved authority: REQ-003/004/005, AC-004/005, BEH-003/004; D2 explicitly includes Windows managed stop and WSL target identities.
- Initiating basis kind: User.
- Independent supported trigger: user runs native background work through exposed native tools on Windows, then chooses Restart Server or ordinary desktop Quit. This is the platform form of SCN-003, not a synthetic process-table mutation or OS power-loss scenario.
- Support evidence: WindowsServerManager launch selection/implementation; native NonInteractiveShellResolver.resolveWsl; Restart controls in ServerLoading/ServerMonitor and application IPC; application will-quit path.
- Forward pre-change path (MP-001 historical basis): native tool → context manager/shell executor → WSL command; Restart → electron restart-server IPC → ServerStatusManager.restartServer → WindowsServerManager.stopServer → taskkill /pid /t, later /f. The backend registers only SIGINT/SIGTERM → app.close for orderly external shutdown. D1 omitted an invocation of this close boundary; D2 replaces the Windows graceful taskkill phase with the captured-child IPC request traced above.
- Lifecycle precondition/consequence: native scope exists inside the backend and owns WSL command identities; terminating the Windows child is not an acknowledgement that that scope drained. D2 now makes that invocation explicit and still refuses to equate force termination with scope completion.
- Scenario validity: Supported Normal Scenario. Reachability: **Reachable** for the initiating production path; no live Windows result is claimed.
- Evidence qualification: [Node signal documentation](https://nodejs.org/api/process.html#signal-events) states Windows SIGTERM is unsupported and Node kill emulation terminates unconditionally. [Microsoft taskkill documentation](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill) describes PID/tree termination, not an application cleanup RPC. The missing cleanup transition is a source/design inference from those contracts, not a claimed Windows reproduction.
- Review consequence: **AR-001 resolved by D2**. The private Node IPC capability is concrete and proportionate. [Node child-process IPC documentation](https://nodejs.org/api/child_process.html#optionsstdio) supports the selected transport; P-006 corroborates transport feasibility only. No platform-wide certification or unrelated provider redesign is required to pass architecture review.

### MP-002 — Ordinary returned shells need continuous group authority; normal timeout can kill the result emitter
- Approved authority: BEH-003/004, REQ-003/004/005, AC-004/005, including preserved native tool timeout/output behavior.
- Independent initiating triggers: native run_bash executes ordinary background work and returns before app quit; or a user command exceeds the existing timeout_seconds / receives AbortSignal. These exist in the public tool/current executor, independently of the proposed anchor.
- Forward pre-change path (MP-002 historical basis): run_bash → ShellCommandExecutor direct detached spawn → user shell exits → 75ms adoption → surviving background process; later host shutdown must clean that work. IMP-02 observes no overlapping owned identity in 10/10 samples and actual executor adoption. A separate supported timeout path sets timedOut, stops the group and normally completes on the original child's exit/error.
- Consequence: D2 snapshot-only authority could not cover the ordinary survivor interval. D3 keeps a live exclusive anchor before user execution through adoption and stop; it does not attempt faster probabilistic snapshots or raw-PGID recovery. Once force deliberately kills the anchor, a RESULT-only promise could hang; P-008 demonstrates the emitter being killed, not completion of a production promise.
- Reachability: **Reachable / Supported Normal Scenario**. This is not arbitrary user tampering with the anchor or daemon escape. No additional product policy is needed.
- Mechanism evidence: [Node detached-child contract](https://nodejs.org/api/child_process.html#optionsdetached) supports the POSIX group/session launch. The [util-linux setsid manual](https://man7.org/linux/man-pages/man1/setsid.1.html) defines new-session execution, possible fork and --wait; D3 correctly verifies the reported Linux anchor rather than assuming the bridge/setsid PID. Primary contracts plus local candidate probes support feasibility, not actual WSL certification.
- Review consequence: **IMP-DI-001 resolved in D3.1**. SR-005 resolves the in-round terminal-settlement question explicitly: scope stop is independent of command completion, launcher latches once, executor maps actual timeout/host interruption/failure truthfully. No separate new open finding remains.

### MP-003 — A visibility read encounters an inactive registered run
- Authority: BEH-006, REQ-009/AC-010 and SCN-008 explicitly cover noninterfering inspection and runtime disappearance.
- Independent trigger: user opens/refreshes the selected panel while its runtime becomes unavailable, not a manual registry mutation. Normal provider closure and asynchronous cleanup leave observation at a lifecycle boundary.
- Forward path under initial D4: query → manager.getActiveRun → registry.getActiveRun `:185-195` → removeIfCurrent `:232-234` → resource release `:119-145` → MCP session/server cleanup, recorder detachment and lifecycle notification. Both initial lookup and post-await recheck could perform it.
- Supported Explicit Edge Scenario / **Reachable**. The source proves the proposed read is mutating; a getter name is not read-only evidence. No runtime probe needed to establish this contract contradiction.
- SR-008 resolution: new exact-map peek through manager/registry, observational isActive before/after, no retired-inclusive predicate, no same-request replacement retry. All five activity forms were checked as field/map observations. Existing pruning lifecycle callers remain unchanged. **Resolved during this round**, no new open AR finding.

### MP-004 — Retained Claude/AGY rows on first panel entry after runtime stop
- Authority: BEH-005/006, REQ-009/AC-010 preserve existing streamed rows and provider behavior.
- Independent trigger: user selects/reopens Background Tasks after ordinary agent idle-stop/termination, within the same frontend session that already received task events. This is not a request for durable history after reload.
- Current forward path: backgroundTaskHandler → per-run store upsert → selected activeAgentContext → ProgressPanel/BackgroundTaskPanel → store rows/counts without a backend-active condition. The store has no termination eviction; first expansion need not have had a prior inspection snapshot.
- Supported Normal Scenario / **Reachable**. Initial D4's active-only event-stream capability result would not specify how these existing rows survive an inactive result.
- SR-008 resolution: explicit row-provenance-based retained presentation during loading/unavailability, visibly last-known, no provider guessing, no merging with a successful Codex snapshot and no empty-success inference from missing rows. **Resolved during this round**, no new open AR finding.

P-012 supports the separate DS-005 classification rule: observed list membership can precede turn completion, so the API name cannot establish beyond-turn status. No global OS scan, model polling, durable history, remote forwarding, stop controls or idle-policy change is justified by R2.

No additional speculative scenarios were promoted. Arbitrary daemon escape, historical PID reclamation and forced OS kill remain excluded. Existing R1 fault scenarios already justify admission reservations, observation-failure distinction and bounded close.

## Unresolved Approved-Behavior Or Current-State Gaps
None blocking architecture. D4.1 corrects both source-grounded questions; R2 intent is explicit. Actual new query/UI behavior remains unimplemented and unvalidated. The testing pause remains in force.

## Review Decision
**Pass — R2 / D4.1 / SR-008 is ready for dependent implementation.** ARCH-REV-004 is not an implementation, code-review or expanded acceptance pass and does not authorize resuming paused executable validation.

## Findings
None open. AR-001..003 and IMP-DI-001 retain their prior design resolution. The two D4 questions (mutating lookup and retained inactive stream rows) were corrected in SR-008 before this completed verdict, so no new unresolved finding IDs are assigned. Prior histories remain unchanged.

## Classification
**Pass**, task_size **Large**, architectural_risk **High**. Actual runtime/API/async UI boundary changes justify review; document volume does not. R2 is the newly approved in-ticket extension, not scope inferred by the reviewer.

## Recommended Recipient
Implementation Engineer via primary architecture-pass route for the **DS-005 delta on existing implementation**, not duplicate initial implementation. Preserve user-paused API/E2E and specialist artifacts; do not interpret design pass as test-resumption permission.

## Residual Risks
- Test observational lookup at inactive-before-read, inactive-during-read and exact replacement boundaries: no prune/retire/release, MCP action, recorder detachment, lifecycle notification, activation or retry. Keep existing lifecycle pruning behavior/tests unchanged.
- Verify actual Codex start/terminal/turn identities against installed schema and source-current tool receipts. Terminal facts during an in-flight list, including previously unseen entries, need temporary exact-thread reconciliation; contradictory identities never settle a different command. Preserve the strict transcript gate and foreground Activity.
- Test foreground inclusion in provider list versus beyond-turn classification, missing completion→unknown, matched natural0/nonzero/-1 outcomes, partial pagination/timeout/repeated cursor, single in-flight reads and disposal without delaying shutdown. Do not invent stopped from -1 or completion from absence.
- Exercise existing Claude/AGY rows on first entry/reselection after idle-stop, loading/unavailable/unsupported states and subsequent exclusive snapshot/event-stream transitions. Running counts must identify last-known evidence. Empty store is not a successful Codex snapshot.
- Verify query/UI privacy with real secret-bearing command arguments/env/output: conservative executable label or generic label, no raw command, cwd, exception text, provider kill handle or output surfaced. Existing Claude/AGY display policy is preserved, not retroactively changed.
- Node/run/runtime freshness, expanded-panel timer cancellation, reconnect/reload and Team/Org selected concrete-agent coverage require integration/UI proof. New types must be generated through the repository toolchain; unknown remains view-only. Keep new work in mapped owners and avoid growing already substantial AgentRun/CodexThread into mixed-concern files.
- API-04/06 are scoped current-source shutdown successes, not proof of all original or new criteria. Existing API/E2E checkpoint remains incomplete and user-paused. Changed Codex observation boundaries require impact-based revalidation only when authorized; no redundant reruns solely for this architecture round.
- Full Windows/WSL certification, arbitrary daemon escape and historical Nuxt cause remain unclaimed. No release/install/merge performed; Delivery's base verification and cleanup are still outstanding.
- FU-001 remains existing out-of-scope test-tree typing debt. FU-002 is incorporated; no new prerequisite or follow-up Task established by this review.

## Latest Authoritative Result
- Decision **Pass**, current **ARCH-REV-004**, applicable **SR-001..008 / R2 / D4.1**.
- Behavior/material-premise gate **Pass**; no open findings.
- Large/High unchanged. Reviewer changed only report/history; no production edits, executable tests or test resumption, data/installed-app use, merge/release/install.
