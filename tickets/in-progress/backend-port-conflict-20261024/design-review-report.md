# Design Review Report

## Review Round Meta
- Package: backend-port-conflict-20261024; reviewed 2026-10-24.
- Upstream Requirements Doc: `requirements-doc.md`, R1 Approved.
- Upstream Investigation Notes: `investigation-notes.md`, including SR-004/005 recovery additions.
- Upstream Solution Revision Record: `solution-revision-record.md`.
- Reviewed Design Spec: `design-spec.md`, D3.1 Ready (SR-005).
- Supplemental Task Artifacts Reviewed: P-003/P-005 source fixtures and raw logs; P-001/P-002/P-004 inventory, source/investigation evidence; `solution-handoff.md`; `docs/design-cases.md` case 8. P-006 IPC transport source/log reviewed in round 2; round 3 additionally reviewed IR-001/IMP-DI-001, IMP-01/02/03 evidence and P-007/008 candidate anchor source/logs. Historical diagnosis is contextual, not ownership proof.
- Relevant Solution Revision IDs: SR-001 (approval), SR-002 (baseline design), SR-003 (review corrections), SR-004 (continuous anchor), SR-005 (terminal settlement).
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: ARCH-REV-003.
- Current Review Round: 3; Trigger: IR-001/IMP-DI-001 on previously passed D2; review continued through SR-005 clarification.
- Prior Review Round Reviewed: ARCH-REV-002 Pass for D2, report/history and downstream IR-001 read. Latest Authoritative Round: 3.
- Current-State Evidence Basis: task branch `task/backend-port-conflict-20261024`, reviewed package HEAD `fb0de461cd551f3426b653f89c3516395efca9f8`, base `034bfe51ab697817773ff545d369e1cfc03a79c5`; clean on entry. All source references below are relative to the assigned worktree. No implementation, new runtime probe, changed-build validation, merge, release or installed-app interaction performed in this review.
- Authorities: architecture-reviewer skill and full review template; shared design principles, handoff/scope rules and reachability examples 7/8; root AGENTS.md, DESIGN.md, TESTING.md; server/web AGENTS.md; startup initialization and terminal service contracts. No closer DESIGN*.md found in the three changed packages.

## Routing Classification Review
- Task size: **Large**. Architectural risk: **High**.
- Classification rationale reviewed: explicit lifetime authority across core, two backend hosts and desktop; OS signalling/identity, shutdown ordering and status/UI contracts. Actual change scope supports both classifications.
- Independent Architecture Review required: **Yes**. No routing correction needed.

## Upstream Behavior And Production-Path Basis Confirmation
- Overall Basis Status: **Confirmed**. R1 is unchanged (verified by diff). D3.1 supplies continuous anchored ownership and exceptional command settlement for ordinary native work. Prior AR-001..003 corrections remain intact; IMP-DI-001 was checked against source, actual observations and the canonical correction, not the revision narrative alone.
- Approved intent: end application-owned native background work at backend/application shutdown; preserve ordinary agent/idle lifetimes, unrelated applications, data, endpoint policy and provider-specific ownership. Diagnose external conflicts without turning diagnostic PIDs into kill authority.
- Scope guardrail: UC-001/002 confirmed; no daemon reclamation, crash/power-loss guarantee, provider-wide rewrite, migration, install or release. A lack of Windows live certification is explicitly allowed; it is not an exclusion of the Windows production path that D2 itself changes.
- Every prospective blocking Design Impact finding traces to approved REQ/AC/BEH IDs: **Yes**, with the additional mandatory touched-file removal/consumer-inventory rules identified below.
- Remaining intended-behavior ambiguity: none requiring a new product decision for the corrections requested. Narrowing supported platform behavior instead would require Solution Designer approval handling.
- Current-code checks opened: core `background-process-context.ts:12-28`, `background-process-manager.ts:94-150,153-225,232-258`, `shell-command-executor.ts:33-175`, `process-group-observer.ts:105-246`, `agent-config.ts:90-109`; server `create-process-agent-provider-factory-builder.ts`, `agent-provider-factory-builder.ts:178-187`, native factory `:462-509`, `build-studio-server.ts:86-153,361-367`, standalone host `:224-226,280-358`, `server-runtime.ts:31-47,203-237`; web `baseServerManager.ts:73-171,184-245,370-429`, `windowsServerManager.ts:45-75,82-173`, `electronApplication.ts:247-289,345-355,406-429`, `main.ts:27-56`, `appUpdater.ts:258-280`, `serverStatusManager.ts:35-40,72-100,153-190`, `serverStore.ts:61-84,167-217,281-338`, `ServerLoading.vue:45-94`. These substantiate the reported native ownership, leader-only termination, cloning, quit-awaiting and generic-diagnosis defects; no historical Nuxt ancestry is inferred.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass: launch/conflict, E-001/006/014, P-001 | Pass | Confirmed | None; AR-002 resolved in D2 |
| BEH-002 | User | Pass | Pass: Restart, persistent listener, resolution/retry | Pass | Confirmed | Keep advisory diagnosis separate from managed shutdown |
| BEH-003 | System | Pass | Pass: native tools and ordinary quit/restart, P-003/005 | Pass: gated anchors persist through command exit; platform shutdown entries converge on backend close | Confirmed | None; IMP-DI-001 resolved in D3.1, AR-001/003 retained |
| BEH-004 | Contract | Pass | Pass: ownership-only signals, preserved data/lifetimes | Pass: anchor proof before group signal, independent command and cleanup outcomes; Windows complete plus exit0 | Confirmed | No expansion to arbitrary process reclamation |

## Supplemental Artifact Coherence Verdict
| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| P-003 signal harness/source/log | Pass | Pass | Pass within explicitly narrow harness scope | Pass | Pass: baseline evidence, not acceptance | None |
| P-005 group-stop source/log | Pass | Pass | Pass | Pass | Pass: asserts old defect | None |
| Other probes/setup logs and historical attachment inventory | Pass | Pass | Pass for recorded purpose; no independent rerun claimed | Pass | Pass | Preserve initial failures/raw whitespace; no fix claim |
| Handoff and design case 8 | Pass | Pass | Pass | Pass | Pass: D3.1 proposed correction, no implementation claim | None |
| P-006 IPC transport source/log | Pass | Pass | Pass for transport-only purpose | Pass | Pass: Node on macOS, no Electron/Windows cleanup claim | Preserve validation limits |

Round 3 reopened the actual executor, result shape, background manager and WSL resolver; reviewed the IMP-02 non-overlap observation and candidate anchor fixtures. No production source has changed since ARCH-REV-002 (diff verified); unaffected source evidence remains valid. R1 is unchanged. P-007/008 establish candidate continuity/TERM/force feasibility, not execution through the production launcher, Linux setsid, WSL or Electron. SR-005 is a canonical clarification, not new runtime evidence.

| Additional Supplement | Purpose / Link / Completeness / Coherence / Approval Verdict | Required Action |
| --- | --- | --- |
| IR-001, IMP-01..03 | Pass: implementation-owned Design Impact; disproved initial hypothesis retained; actual adopted survivor and 10/10 missing identity overlaps justify SR-004 | Do not equate a failed initial hypothesis with a disproved continuity gap |
| P-007/P-008 candidate source/logs | Pass: local Node and bash feasibility; linked from design/investigation; no behavioral approval role | Replace candidate assertions with production regressions downstream; bash-local is not WSL |
| SR-005 clarification and handoff | Pass: current D3.1 terminal contract matches existing result semantics; no validation claim | Implement completion and cleanup as separate assertions |

Round 2 independently reopened `server-runtime.ts:59-240`, `serverRuntimeEnv.ts:118-140`, `app.vue:1-46`, consumer/declaration paths and dead-accessor search. Production files did not change between rounds; unaffected round-1 evidence remains valid. D2 adds a real transport feasibility supplement, not implementation proof.

The early Draft/current-disposition paragraphs in investigation notes are explicitly superseded by SR-001/SR-002; they are historical, not competing approval authority.

## Task Design Health Assessment Verdict
| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for current posture | Pass | D3.1 health assessment | None |
| Root-cause classification explicit and evidence-backed | Pass | Context-owned detached work; P-003/P-005; IMP-02 ownership gap; asynchronous will-quit | None |
| Refactor decision explicit | Pass | Host scope, continuous per-live-group anchor, observer correction, port extraction | None |
| Decision reflected in concrete sections | Pass | Injection/copy, early drain, typed status, file mapping | Corrections now concrete; no generic supervisor needed |

## Spine Inventory Verdict
| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Startup/retry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Both native command forms and retained ownership | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Desktop/backend shutdown | Pass | Pass: both platform forms explicit | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Snapshot/event/store/loading UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass; complete consumer dispositions |
| DS-002/003 local scope drain | Open/closing/closed; shared close, concurrent bounded drain | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Reviewed full sequences: launch/restart → status owner → managed child stop/start → availability → launch/health → snapshot → renderer; tool → runtime context → scope admission → captured gated anchor → independent identity proof → scope registration → START → actual command PID/result → output/adoption → retained host ownership; POSIX quit → application coordinator → managed stop → backend SIGTERM → Fastify preClose scope drain → existing lifecycle/resources → error/success exit → desktop continuation. Standalone public close and startup unwind are separately described in D2 and have real current entrypoints. Updater explicit install → preparation → existing updater continuation is correctly distinct from ordinary quit. D2 supplies the Windows chain: WindowsServerManager captured child → ManagedBackendShutdownClient ready/request → ServerProcessShutdown request latch → startup-settled barrier → current cleanup authority (prerequisite unwind or app.close) → native drain and remaining resources → complete/failed → actual exit → desktop stop outcome. The client is a transport adapter; WindowsServerManager owns request/wait/force sequencing. Backend startup transfers cleanup authority before the next cancellation checkpoint; the barrier must not await the shutdown promise.

Additional bounded local spine (DS-003 owner): startup active stage → cancellation checkpoint → ownership transfer/checkpoint → startup-settled → one cleanup invocation. Return/event spine: backend cleanup result → bounded send flush → child result/exit observations → desktop completion; ready denotes control readiness only, not RUNNING. Both are **Pass** for readable call order, single governing owner, identity and separation of transport from policy. No public shutdown endpoint or port-based authority is introduced.

Additional affected DS-002 local spines, each **Pass**:
- Launch: scope reserves admission → launcher/resolver create gated platform anchor → observer verifies live birth/group (plus SID in WSL) → scope commits lease → START once → STARTED actual command PID. Scope closing cancels admission, forbids late START and retains committed handles even if response is lost.
- Return/retirement: anchor reports user-command RESULT → launcher once-only completion → executor formats unchanged TerminalResult / manager updates record → scope retains live descendants. Successful observation of command-complete and no non-anchor members → RELEASE → confirm anchor/bridge exit. One unref batched maintenance timer retires naturally empty groups; observation failure retains the lease. Maintenance is not identity continuity.
- Stop: scope records intent → live matching anchor proof → group TERM → bounded non-anchor observation → empty RELEASE or fresh anchor proof and one group KILL → absence verification → independent cleanup report. No numeric-group re-signalling after KILL destroys authority. Scope drains/suspends maintenance with close.
- Exceptional completion (SR-005): launcher latch accepts RESULT/SPAWN_FAILED/terminal transport events; scope drives stop independently and calls finishStop within the existing deadline. Executor alone maps interruption/failure/actual result and retains captured output; no wait for descendant-held EOF. Completion neither waits circularly on cleanup nor proves cleanup. STARTED failure cannot create a record with undefined PID; late events cannot resettle.

## Boundary Encapsulation Verdict
| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Host native command scope | Pass | Pass | Pass | Pass | Sole admission/stop/release authority; lease lifetime independent of output records and agent removal |
| Anchored launcher and command completion | Pass | Pass | Pass | Pass | Private platform scripts/transport, one completion latch; executor owns public result mapping |
| Host shutdown integration | Pass | Pass | Pass | Pass | Shared helper, early nonthrowing drain/final report, startup unwind |
| Desktop managed backend | Pass | Pass | Pass | Pass | Captured-child IPC; stop owns sequencing and child authority |
| Read-only port inspector/status/UI | Pass | Pass | Pass | Pass | No diagnostic PID-to-stop conversion |

## Dependency Direction / Forbidden Shortcut Verdict
| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server → core scope/config | Pass | Pass | Pass | Pass | No core dependency on server/Electron; no serialized service |
| Scope → launcher/observer | Pass | Pass | Pass | Pass | Concrete stop intent/finish ordering, no callback-based lifetime delegation; manager/tool use retained leases, not port/PGID rediscovery |
| Desktop → backend shutdown → local scope | Pass | Pass | Pass | Pass | Explicit private IPC boundary; no observer or port-owner bypass |
| Status → renderer | Pass | Pass | Pass | Pass | Presentation only; both direct and derived consumers dispositioned |

## Interface Boundary Verdict
| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Scope admission/track/close and owned group outcome | Pass | Pass | Pass: execution target plus verified process identity | Low | Pass |
| AnchoredCommandHandle / completion | Pass | Pass | Pass: fixed target/anchor plus command PID; result/interrupted/failed variants | Low | Pass |
| Manager explicit stop by its record | Pass | Pass | Pass: resolve recorded ownership, not arbitrary input PID | Low | Pass |
| Port inspector(port) / diagnostic union | Pass | Pass | Pass | Low | Pass |
| Managed backend stop | Pass | Pass | Pass: exact launched child and its control channel | Low | Pass |
| Updater preparation lifecycle callback | Pass | Pass | N/A: no subject selector | Low | Pass; lifecycle hook is appropriate, not hidden process coordination |

## Existing Capability / Subsystem Reuse Verdict
| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Native process ownership/inspection | Pass | Pass | Pass | Pass | Extend existing terminal observer; retained anchor addresses measured missing continuity, not a speculative supervisor need |
| Server cleanup composition | Pass | Pass | Pass | Pass | Reuse existing shutdown lifecycle, one shared integration helper |
| Desktop startup/status/quit | Pass | Pass | Pass | Pass | Focused port guard and cached quit coordination |
| Windows orderly stop | Pass | Pass | Pass | Pass | Node IPC invokes existing host close; tree-force is failure fallback only |

## Subsystem / Capability-Area Allocation Verdict
| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Core terminal / runtime config | Pass | Pass | Pass | Pass | Typed runtime reference and copy semantics |
| Studio and standalone composition | Pass | Pass | Pass | Pass | One scope per host; other providers unchanged |
| Electron application/updater | Pass | Pass | Pass | Pass | Application owns preparation and final quit continuation |
| Platform backend management | Pass | Pass | Pass | Pass | D2 makes Windows graceful request concrete |
| Shared status and renderer localization | Pass | Pass | Pass | Pass | Complete inventory without another diagnostic subsystem |

## Reusable Owned Structures Verdict
| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Owned group identity/result | Pass | Pass | Pass | Pass | Terminal command-execution area; one handle referenced, not copied authority |
| Anchor protocol/platform scripts | Pass | Pass | Pass | Pass | Launcher-private static modules; shared bounded completion contract, platform-specific transport |
| Early drain/final failure integration | Pass | Pass | Pass | Pass | Shared composition helper; hosts still own teardown |
| Server diagnostic | Pass | Pass | Pass | Pass | Existing types/serverStatus.ts; no duplicate renderer union |

## Shared Structure / Data Model Tightness Verdict
| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| AnchoredCommandHandle / cleanup outcome | Pass | Pass | Pass | Pass | Pass | Fixed target/anchor identity; actual command PID distinct; command outcome is not cleanup proof |
| ServerStatusSnapshot diagnostic | Pass | Pass | Pass | Pass | Pass | Discriminated plain data, advisory timestamp/identity |
| AgentConfig scope reference | Pass | Pass | Pass | Pass | Pass | Shared runtime reference, not persisted configuration |

Derived consumers listed with a decision for each: **Pass**. D2 dispositions `ServerMonitor.vue`, its `ServerSettingsManager.vue` host, both ambient declarations and app.vue's loading gate. Source confirms app content is gated on RUNNING for embedded windows. Shared store summary changes while full actionable diagnosis remains in ServerLoading. Both ambient declarations retain the same shared type rather than copying it. AR-002 resolved.

Vocabulary: **Pass**. Scope/group/anchor/command-result/port-owner denote distinct concepts consistently. Internal anchor PIDs are not displayed background records. No new persisted names or vocabulary migration.

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

## Subsystem / Folder / File Placement Verdict
| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Core terminal command-execution | Pass | Pass | Low | Pass | No generic shared utility framework |
| Server compositions and native backend factory | Pass | Pass | Low | Pass | Factory extraction warranted by responsibility/size |
| Electron server/application/updater and shared status type | Pass | Pass | Low | Pass | No unnecessary layer |
| Renderer store/component/catalogs | Pass | Pass | Low | Pass | Existing conventions |

## Removal / Decommission Completeness Verdict
| Item / Area | Obsolete Piece To Remove Is Named? | Replacement Owner Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Direct shell spawn and one-shot WSL identity parser | Pass | Pass | Pass | Pass | D3 names replacement/removal after both executor and manager use launcher; no unanchored fallback |
| Leader-only stop and swallowed observation errors | Pass | Pass | Pass | Pass | P-005 substantiates replacement |
| Generic conflict handling and void will-quit/timer | Pass | Pass | Pass | Pass | Existing generic unrelated errors preserved |
| Cached native backend factory accessor | Pass | Pass | Pass | Pass | D2 names cache/accessor removal with E-018; search independently reconfirmed |
| Windows taskkill-as-graceful and local signal-only closure | Pass | Pass | Pass | Pass | Replaced by captured-child request and shared ServerProcessShutdown |

## Legacy / Backward-Compatibility Verdict
| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Runtime cleanup and conflict contract | No proposed compatibility route | Pass | Pass | Separate unhosted use and unrelated errors are not compatibility branches |
| Dead factory accessor | Existing unused alternate construction entry, removed in target | Pass | Pass | Explicit removal, no fallback scope |

## Persisted-Data Transition Verdict (When Applicable)
| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| User data / AgentRunConfig | Not Affected | Pass | Pass | N/A | Pass | Scope and status data are runtime-only; config copy is by reference; stored schemas/readers untouched |

No migration, ownership journal, historical adoption, reset or backup machinery is justified.

## Change / Refactor Safety Verdict
| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup / Removal Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Anchored launcher → both command consumers → remove old direct spawn/parser | Pass | Pass: no unanchored fallback | Pass | Pass |
| Core scope → injection → host cleanup | Pass | Pass: no retained compatibility seam | Pass | Pass |
| Desktop orderly shutdown | Pass | Pass | Pass | Pass |
| Typed diagnostic → store/UI/catalogs | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict
| Topic / Area | Example Needed? | Present And Clear? | Bad / Avoided Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Leader exit/group drain; external owner safety | Yes | Pass | Pass | Pass | D3.1 concrete launch/retirement/force shapes, P-005/007/008 and IMP-02 |
| Windows desktop → backend close | Yes | Pass | Pass | Pass | Explicit wire exchange, startup-state ordering, ack+exit and failure semantics |
| Exceptional command completion | Yes | Pass | Pass | Pass | SR-005 handles emitter loss/spawn failure without hanging or inventing clean shutdown |
| Typed recovery | Yes | Pass | Pass | Pass | Discriminant vs prose matching |

## Material Premise Validation (Only When Needed)
### MP-001 — Windows orderly desktop shutdown must reach the native scope, not merely end its Windows backend process
- Related approved authority: REQ-003/004/005, AC-004/005, BEH-003/004; D2 explicitly includes Windows managed stop and WSL target identities.
- Initiating basis kind: User.
- Independent supported trigger: user runs native background work through exposed native tools on Windows, then chooses Restart Server or ordinary desktop Quit. This is the platform form of SCN-003, not a synthetic process-table mutation or OS power-loss scenario.
- Support evidence: WindowsServerManager launch selection/implementation; native NonInteractiveShellResolver.resolveWsl; Restart controls in ServerLoading/ServerMonitor and application IPC; application will-quit path.
- Forward current path: native tool → context manager/shell executor → WSL command; Restart → electron restart-server IPC → ServerStatusManager.restartServer → WindowsServerManager.stopServer → taskkill /pid /t, later /f. The backend registers only SIGINT/SIGTERM → app.close for orderly external shutdown. D1 omitted an invocation of this close boundary; D2 replaces the Windows graceful taskkill phase with the captured-child IPC request traced above.
- Lifecycle precondition/consequence: native scope exists inside the backend and owns WSL command identities; terminating the Windows child is not an acknowledgement that that scope drained. D2 now makes that invocation explicit and still refuses to equate force termination with scope completion.
- Scenario validity: Supported Normal Scenario. Reachability: **Reachable** for the initiating production path; no live Windows result is claimed.
- Evidence qualification: [Node signal documentation](https://nodejs.org/api/process.html#signal-events) states Windows SIGTERM is unsupported and Node kill emulation terminates unconditionally. [Microsoft taskkill documentation](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill) describes PID/tree termination, not an application cleanup RPC. The missing cleanup transition is a source/design inference from those contracts, not a claimed Windows reproduction.
- Review consequence: **AR-001 resolved by D2**. The private Node IPC capability is concrete and proportionate. [Node child-process IPC documentation](https://nodejs.org/api/child_process.html#optionsstdio) supports the selected transport; P-006 corroborates transport feasibility only. No platform-wide certification or unrelated provider redesign is required to pass architecture review.

### MP-002 — Ordinary returned shells need continuous group authority; normal timeout can kill the result emitter
- Approved authority: BEH-003/004, REQ-003/004/005, AC-004/005, including preserved native tool timeout/output behavior.
- Independent initiating triggers: native run_bash executes ordinary background work and returns before app quit; or a user command exceeds the existing timeout_seconds / receives AbortSignal. These exist in the public tool/current executor, independently of the proposed anchor.
- Forward current path: run_bash → ShellCommandExecutor direct detached spawn → user shell exits → 75ms adoption → surviving background process; later host shutdown must clean that work. IMP-02 observes no overlapping owned identity in 10/10 samples and actual executor adoption. A separate supported timeout path sets timedOut, stops the group and normally completes on the original child's exit/error.
- Consequence: D2 snapshot-only authority could not cover the ordinary survivor interval. D3 keeps a live exclusive anchor before user execution through adoption and stop; it does not attempt faster probabilistic snapshots or raw-PGID recovery. Once force deliberately kills the anchor, a RESULT-only promise could hang; P-008 demonstrates the emitter being killed, not completion of a production promise.
- Reachability: **Reachable / Supported Normal Scenario**. This is not arbitrary user tampering with the anchor or daemon escape. No additional product policy is needed.
- Mechanism evidence: [Node detached-child contract](https://nodejs.org/api/child_process.html#optionsdetached) supports the POSIX group/session launch. The [util-linux setsid manual](https://man7.org/linux/man-pages/man1/setsid.1.html) defines new-session execution, possible fork and --wait; D3 correctly verifies the reported Linux anchor rather than assuming the bridge/setsid PID. Primary contracts plus local candidate probes support feasibility, not actual WSL certification.
- Review consequence: **IMP-DI-001 resolved in D3.1**. SR-005 resolves the in-round terminal-settlement question explicitly: scope stop is independent of command completion, launcher latches once, executor maps actual timeout/host interruption/failure truthfully. No separate new open finding remains.

No additional speculative scenarios were promoted. Arbitrary daemon escape, historical PID reclamation and forced OS kill remain excluded. Existing R1 fault scenarios already justify admission reservations, observation-failure distinction and bounded close.

## Unresolved Approved-Behavior Or Current-State Gaps
None. Requirements intent is unchanged and all prior target-design gaps are resolved. Actual packaging/platform verification is downstream work, explicitly not a design-phase success claim.

## Review Decision
**Pass.** D3.1/SR-005 is ready for implementation against approved R1. IMP-DI-001 is resolved by the retained-anchor design and exceptional completion is explicit. AR-001..003 remain resolved; there is no open architecture blocker. This is not an implementation or acceptance-test pass.

## Findings
None open. AR-001..003 remain resolved; IMP-DI-001 is resolved in design. SR-005 answers the supported force/transport/spawn terminal-settlement question raised during this round. Verification and transitions are recorded in ARCH-REV-003; prior review entries are retained.

## Classification
**Pass — implementation-ready architecture.** Task size Large and architectural risk High retained; no requirement change, prerequisite or follow-up Task established.

## Recommended Recipient
Implementation Engineer through the configured primary architecture-pass rule. Reviewer result must not be mistaken for executable validation or final delivery.

## Residual Risks
- Anchors must be genuinely retained before user execution, including the fast/empty/exec/nonzero path. Test admission-close races, actual adopted survivor cleanup after agent removal, naturally empty retirement and per-lease maintenance/stop ordering. Do not rediscover authority from numeric PGID after anchor loss.
- WSL remains a platform validation gap, not a claimed success: test actual setsid --wait/bridge lifetime, exact distro/SID/birth checks, missing executable/inspection, and gated cancellation. Bash-local P-007/008 does not execute WSL. Static script packaging and Electron Node-mode launch need changed-build proof without using the installed app.
- SR-005 needs production tests of TERM-resistant foreground timeout and host-stop with no RESULT, spawn failure/missing STARTED, early disconnect, late/duplicate/result-exit ordering and stop-deadline fallback. Assert prompt command settlement AND independent truthful cleanup, including unconfirmed stop; never invent exit0 or mark a record stopped solely from command completion.
- Nonce control framing must survive split/coalesced chunks, ordinary stderr without a trailing newline, control-like user text, partial trailing frames and descendants keeping pipes open. Preserve partial output, strip only valid protocol, and keep adopted output listeners alive. Candidate probes are not complete transport tests.
- D3.1 retains D2's 3s collective drain and 20s+2s child-stop inside the 30s quit budget. These are coherent allocations, not measured changed-build guarantees. Preserve all cleanup attempts on failure and bound inspector subprocesses; test many groups and inherited pipe handles.
- Explicit updater preparation is correctly upstream of quitAndInstall: installed electron-updater BaseUpdater starts install before app.quit, while MacUpdater uses native continuation. Ordinary quit interception follows the [Electron will-quit contract](https://www.electronjs.org/docs/latest/api/app#event-will-quit). Test success, preparation failure, repeated quit and updater-disabled profile without installing anything. Keep resource-stop failure reporting distinct from the caller's quit/install continuation.
- D2 startup cancellation needs source-current tests at prerequisites, Studio construction, listen/recovery and background-task stages. Ensure cancellation is not caught as a generic fatal error; existing startup unwind and registered cleanup authority must not double-close resources or bypass the completion barrier. The design explicitly prohibits concurrent initialization/close and circular waits.
- For Windows result/exit ordering, implement the specified complete-plus-exit0 success predicate. IPC enqueue alone is never completion; expected channel closure after a valid result must not erase that result or substitute for actual exit. Test missing result, early disconnect and normal result/channel-close/exit ordering. No new retry/correlation machinery is needed for one captured child.
- P-006 demonstrates only Node IPC on macOS. Actual Electron Node-mode transport and the real server close path remain mandatory downstream tests; the absent task-local Electron binary is not permission to validate on the installed app. Preserve the existing separately packaged wire convention with a contract test and no old-version negotiation/fallback.
- Post-launch port diagnosis must not lose typed details to an earlier generic generation settlement, and a stale inspection must not overwrite a newer attempt. Both snapshot/event paths require tests.
- Historical Nuxt origin remains unknown; P-003/P-005 are baseline defect assertions, not evidence of a fixed product. P-007/008 are candidate mechanism evidence only. Full Studio/standalone and changed desktop acceptance remain downstream work.
- No follow-up Task is created: the resolved corrections are in scope; other listed risks are implementation/validation obligations or explicit exclusions.

## Latest Authoritative Result
- Review Decision: **Pass**.
- Material-Premise Gate: **Pass** — MP-001/002 remain supported; D3.1 addresses them without introducing an unrelated product scenario.
- Current revision: **ARCH-REV-003**, applicable **SR-001 through SR-005** (R1/D3.1).
- Open findings: **None**. AR-001..003 and IMP-DI-001 resolved in design, not claimed implemented.
- Task size **Large**, architectural risk **High**, unchanged.
- Evidence scope: static/source/dependency review and review of supplied IMP-01..03 and P-006..008; no new runtime tests, builds, installed-app use, merge or release in this review round.
