# Design Review Report

## Review Round Meta
- Package: backend-port-conflict-20261024; reviewed 2026-10-24.
- Upstream Requirements Doc: `requirements-doc.md`, R1 Approved.
- Upstream Investigation Notes: `investigation-notes.md`, including SR-002 additions.
- Upstream Solution Revision Record: `solution-revision-record.md`.
- Reviewed Design Spec: `design-spec.md`, D1 Ready.
- Supplemental Task Artifacts Reviewed: P-003/P-005 source fixtures and raw logs; P-001/P-002/P-004 inventory, source/investigation evidence; `solution-handoff.md`; `docs/design-cases.md` case 8. Historical diagnosis is contextual, not ownership proof.
- Relevant Solution Revision IDs: SR-001 (approval), SR-002 (design).
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: ARCH-REV-001.
- Current Review Round: 1; Trigger: first independent Large/High review.
- Prior Review Round Reviewed: None. Latest Authoritative Round: 1.
- Current-State Evidence Basis: task branch `task/backend-port-conflict-20261024`, HEAD `d34e2d029c86b3183e95aa9d38f47053f117b657`, base `034bfe51ab697817773ff545d369e1cfc03a79c5`; clean on entry. All source references below are relative to the assigned worktree. No implementation, new runtime probe, changed-build validation, merge, release or installed-app interaction performed in this review.
- Authorities: architecture-reviewer skill and full review template; shared design principles, handoff/scope rules and reachability examples 7/8; root AGENTS.md, DESIGN.md, TESTING.md; server/web AGENTS.md; startup initialization and terminal service contracts. No closer DESIGN*.md found in the three changed packages.

## Routing Classification Review
- Task size: **Large**. Architectural risk: **High**.
- Classification rationale reviewed: explicit lifetime authority across core, two backend hosts and desktop; OS signalling/identity, shutdown ordering and status/UI contracts. Actual change scope supports both classifications.
- Independent Architecture Review required: **Yes**. No routing correction needed.

## Upstream Behavior And Production-Path Basis Confirmation
- Overall Basis Status: **Contradicted in target-path completeness**, not in approved intent. R1 intent and current behavior are sufficiently established to perform structural review; the Windows entry form of DS-003 lacks the transition into backend cleanup (AR-001).
- Approved intent: end application-owned native background work at backend/application shutdown; preserve ordinary agent/idle lifetimes, unrelated applications, data, endpoint policy and provider-specific ownership. Diagnose external conflicts without turning diagnostic PIDs into kill authority.
- Scope guardrail: UC-001/002 confirmed; no daemon reclamation, crash/power-loss guarantee, provider-wide rewrite, migration, install or release. A lack of Windows live certification is explicitly allowed; it is not an exclusion of the Windows production path that D1 itself changes.
- Every prospective blocking Design Impact finding traces to approved REQ/AC/BEH IDs: **Yes**, with the additional mandatory touched-file removal/consumer-inventory rules identified below.
- Remaining intended-behavior ambiguity: none requiring a new product decision for the corrections requested. Narrowing supported platform behavior instead would require Solution Designer approval handling.
- Current-code checks opened: core `background-process-context.ts:12-28`, `background-process-manager.ts:94-150,153-225,232-258`, `shell-command-executor.ts:33-175`, `process-group-observer.ts:105-246`, `agent-config.ts:90-109`; server `create-process-agent-provider-factory-builder.ts`, `agent-provider-factory-builder.ts:178-187`, native factory `:462-509`, `build-studio-server.ts:86-153,361-367`, standalone host `:224-226,280-358`, `server-runtime.ts:31-47,203-237`; web `baseServerManager.ts:73-171,184-245,370-429`, `windowsServerManager.ts:45-75,82-173`, `electronApplication.ts:247-289,345-355,406-429`, `main.ts:27-56`, `appUpdater.ts:258-280`, `serverStatusManager.ts:35-40,72-100,153-190`, `serverStore.ts:61-84,167-217,281-338`, `ServerLoading.vue:45-94`. These substantiate the reported native ownership, leader-only termination, cloning, quit-awaiting and generic-diagnosis defects; no historical Nuxt ancestry is inferred.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass: launch/conflict, E-001/006/014, P-001 | Pass | Confirmed | Complete consumer disposition, AR-002 |
| BEH-002 | User | Pass | Pass: Restart, persistent listener, resolution/retry | Pass | Confirmed | Keep advisory diagnosis separate from managed shutdown |
| BEH-003 | System | Pass | Pass: native tools and ordinary quit/restart, P-003/005 | Fail: Windows shutdown-to-host entry missing | Needs Correction | AR-001; complete touched factory removal AR-003 |
| BEH-004 | Contract | Pass | Pass: ownership-only signals, preserved data/lifetimes | Fail for claimed cross-platform completion: Windows child exit does not establish WSL drain | Needs Correction | AR-001; no expansion to arbitrary process reclamation |

## Supplemental Artifact Coherence Verdict
| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| P-003 signal harness/source/log | Pass | Pass | Pass within explicitly narrow harness scope | Pass | Pass: baseline evidence, not acceptance | None |
| P-005 group-stop source/log | Pass | Pass | Pass | Pass | Pass: asserts old defect | None |
| Other probes/setup logs and historical attachment inventory | Pass | Pass | Pass for recorded purpose; no independent rerun claimed | Pass | Pass | Preserve initial failures/raw whitespace; no fix claim |
| Handoff and design case 8 | Pass | Pass | Pass | Pass | Pass: proposed correction only | Update D1 references when revising |

The early Draft/current-disposition paragraphs in investigation notes are explicitly superseded by SR-001/SR-002; they are historical, not competing approval authority.

## Task Design Health Assessment Verdict
| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for current posture | Pass | D1 health assessment | None |
| Root-cause classification explicit and evidence-backed | Pass | Context-owned detached work; P-003/P-005; asynchronous will-quit | None |
| Refactor decision explicit | Pass | Host scope, observer correction, port extraction | None |
| Decision reflected in concrete sections | Pass | Injection/copy, early drain, typed status, file mapping | Finish platform path and removal inventory; no generic supervisor needed |

## Spine Inventory Verdict
| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Startup/retry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Both native command forms and retained ownership | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Desktop/backend shutdown | Pass | Fail: platform entry forms incomplete | Pass | Pass | Fail: Windows signal-to-preClose link absent | Pass | Fail, AR-001 |
| DS-004 | Snapshot/event/store/loading UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass; consumer inventory AR-002 |
| DS-002/003 local scope drain | Open/closing/closed; shared close, concurrent bounded drain | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Reviewed full sequences: launch/restart → status owner → managed child stop/start → availability → launch/health → snapshot → renderer; tool → runtime context → scope admission → spawn/identity → output/adoption → retained host ownership; POSIX quit → application coordinator → managed stop → backend SIGTERM → Fastify preClose scope drain → existing lifecycle/resources → error/success exit → desktop continuation. Standalone public close and startup unwind are separately described in D1 and have real current entrypoints. Updater explicit install → preparation → existing updater continuation is correctly distinct from ordinary quit. Windows requires its own concrete link into the backend close sequence, not the POSIX arrow relabeled.

## Boundary Encapsulation Verdict
| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Host native command scope | Pass | Pass | Pass | Pass | Process lifetime independent of output records and agent removal |
| Host shutdown integration | Pass | Pass | Pass | Pass | Shared helper, early nonthrowing drain/final report, startup unwind |
| Desktop managed backend | Fail on Windows graceful entry | Pass | Pass | Fail | AR-001; stop owns sequencing and child authority |
| Read-only port inspector/status/UI | Pass | Pass | Pass | Pass | No diagnostic PID-to-stop conversion |

## Dependency Direction / Forbidden Shortcut Verdict
| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server → core scope/config | Pass | Pass | Pass | Pass | No core dependency on server/Electron; no serialized service |
| Scope → process observation | Pass | Pass | Pass | Pass | Manager/tool must use ownership handles, not rediscover by port |
| Desktop → backend shutdown → local scope | Fail | Pass | Pass | Fail | AR-001 missing Windows transport, not authority reversal |
| Status → renderer | Pass | Pass | Pass | Pass | Presentation only; update omitted consumer decisions |

## Interface Boundary Verdict
| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Scope admission/track/close and owned group outcome | Pass | Pass | Pass: execution target plus verified process identity | Low | Pass |
| Manager explicit stop by its record | Pass | Pass | Pass: resolve recorded ownership, not arbitrary input PID | Low | Pass |
| Port inspector(port) / diagnostic union | Pass | Pass | Pass | Low | Pass |
| Managed backend stop | Pass | Pass | Pass: exact launched child | Low | Fail for missing Windows graceful entry, AR-001 |
| Updater preparation lifecycle callback | Pass | Pass | N/A: no subject selector | Low | Pass; lifecycle hook is appropriate, not hidden process coordination |

## Existing Capability / Subsystem Reuse Verdict
| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Native process ownership/inspection | Pass | Pass | Pass | Pass | Extend existing terminal observer; new host scope addresses real lifetime mismatch |
| Server cleanup composition | Pass | Pass | Pass | Pass | Reuse existing shutdown lifecycle, one shared integration helper |
| Desktop startup/status/quit | Pass | Pass | Pass | Pass | Focused port guard and cached quit coordination |
| Windows orderly stop | Pass | Fail | N/A until correction | Fail | Child-tree termination cannot substitute for host cleanup, AR-001 |

## Subsystem / Capability-Area Allocation Verdict
| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Core terminal / runtime config | Pass | Pass | Pass | Pass | Typed runtime reference and copy semantics |
| Studio and standalone composition | Pass | Pass | Pass | Pass | One scope per host; other providers unchanged |
| Electron application/updater | Pass | Pass | Pass | Pass | Application owns preparation and final quit continuation |
| Platform backend management | Pass | Fail | Fail | Fail | AR-001 |
| Shared status and renderer localization | Pass | Pass | Pass | Pass | AR-002 is inventory completion, not demand for another subsystem |

## Reusable Owned Structures Verdict
| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Owned group identity/result | Pass | Pass | Pass | Pass | Terminal command-execution area |
| Early drain/final failure integration | Pass | Pass | Pass | Pass | Shared composition helper; hosts still own teardown |
| Server diagnostic | Pass | Pass | Pass | Pass | Existing types/serverStatus.ts; no duplicate renderer union |

## Shared Structure / Data Model Tightness Verdict
| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| OwnedCommandGroup/outcome | Pass | Pass | Pass | Pass | Pass | Target identity distinguishes host/WSL; outcome not boolean plus contradictory detail |
| ServerStatusSnapshot diagnostic | Pass | Pass | Pass | Pass | Pass | Discriminated plain data, advisory timestamp/identity |
| AgentConfig scope reference | Pass | Pass | Pass | Pass | Pass | Shared runtime reference, not persisted configuration |

Derived consumers listed with a decision for each: **Fail, AR-002**. `ServerMonitor.vue` consumes `userFriendlyError`/`connectionMessage`; `types/electron.d.ts` is a second ambient declaration site. Neither is expressly dispositioned in D1. A reasoned no-change decision is sufficient where the shared import and authoritative overlay preserve behavior.
Vocabulary: **Pass**. Scope/group/port-owner denote distinct concepts consistently. No new persisted names or vocabulary migration.

## File Responsibility Mapping Verdict
| File | Responsibility Is Singular And Clear? | Responsibility Matches Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| native-command-process-scope.ts; process-group-observer.ts; process-identity.ts | Pass | Pass | Pass | Pass | Registry/policy separate from OS mechanism |
| shell-command-executor.ts; background-process-manager/context.ts | Pass | Pass | Pass | Pass | Output/adoption distinct from host lifetime |
| AgentConfig/context; provider factory chain | Pass | Pass | Pass | Pass | Mandatory hosted injection; remove dead accessor AR-003 |
| native-command-shutdown.ts and two hosts | Pass | Pass | Pass | Pass | Concrete shared composition policy |
| port guard/inspector; base/windows/status managers | Pass | Pass | Pass | Fail | Windows path not actionable yet, AR-001 |
| applicationShutdown.ts; application; updater | Pass | Pass | Pass | Pass | Deadline/cache policy has an owner |
| status type/store/loading/catalogs | Pass | Pass | Pass | Pass | Add omitted consumer dispositions, AR-002 |

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
| Leader-only stop and swallowed observation errors | Pass | Pass | Pass | Pass | P-005 substantiates replacement |
| Generic conflict handling and void will-quit/timer | Pass | Pass | Pass | Pass | Existing generic unrelated errors preserved |
| Cached native backend factory accessor | Fail | Pass | Fail | Fail | AR-003: named touched-file dead code absent from removal plan |

## Legacy / Backward-Compatibility Verdict
| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Runtime cleanup and conflict contract | No proposed compatibility route | Pass | Pass | Separate unhosted use and unrelated errors are not compatibility branches |
| Dead factory accessor | Existing unused alternate construction entry | Fail | Fail | AR-003; remove, do not retrofit a hidden host scope |

## Persisted-Data Transition Verdict (When Applicable)
| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| User data / AgentRunConfig | Not Affected | Pass | Pass | N/A | Pass | Scope and status data are runtime-only; config copy is by reference; stored schemas/readers untouched |

No migration, ownership journal, historical adoption, reset or backup machinery is justified.

## Change / Refactor Safety Verdict
| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup / Removal Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Core scope → injection → host cleanup | Pass | Pass: no retained compatibility seam | Fail only for dead accessor omission | Fail, AR-003 |
| Desktop orderly shutdown | Fail on Windows entry | Pass | Pass | Fail, AR-001 |
| Typed diagnostic → store/UI/catalogs | Pass | Pass | Pass | Pass, subject to AR-002 inventory completion |

## Example Adequacy Verdict
| Topic / Area | Example Needed? | Present And Clear? | Bad / Avoided Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Leader exit/group drain; external owner safety | Yes | Pass | Pass | Pass | D1 concrete shapes and P-005 |
| Windows desktop → backend close | Yes | Fail | N/A | Fail | AR-001 needs executable platform path, not a new framework |
| Typed recovery | Yes | Pass | Pass | Pass | Discriminant vs prose matching |

## Material Premise Validation (Only When Needed)
### MP-001 — Windows orderly desktop shutdown must reach the native scope, not merely end its Windows backend process
- Related approved authority: REQ-003/004/005, AC-004/005, BEH-003/004; D1 explicitly includes Windows managed stop and WSL target identities.
- Initiating basis kind: User.
- Independent supported trigger: user runs native background work through exposed native tools on Windows, then chooses Restart Server or ordinary desktop Quit. This is the platform form of SCN-003, not a synthetic process-table mutation or OS power-loss scenario.
- Support evidence: WindowsServerManager launch selection/implementation; native NonInteractiveShellResolver.resolveWsl; Restart controls in ServerLoading/ServerMonitor and application IPC; application will-quit path.
- Forward current path: native tool → context manager/shell executor → WSL command; Restart → electron restart-server IPC → ServerStatusManager.restartServer → WindowsServerManager.stopServer → taskkill /pid /t, later /f. The backend registers only SIGINT/SIGTERM → app.close for orderly external shutdown. D1 adds cleanup inside that close boundary, but supplies no Windows request that invokes it.
- Lifecycle precondition/consequence: native scope exists inside the backend and owns WSL command identities; terminating the Windows child is not an acknowledgement that that scope drained. Changing exit confirmation/budgets alone cannot create the missing invocation.
- Scenario validity: Supported Normal Scenario. Reachability: **Reachable** for the initiating production path; no live Windows result is claimed.
- Evidence qualification: [Node signal documentation](https://nodejs.org/api/process.html#signal-events) states Windows SIGTERM is unsupported and Node kill emulation terminates unconditionally. [Microsoft taskkill documentation](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/taskkill) describes PID/tree termination, not an application cleanup RPC. The missing cleanup transition is a source/design inference from those contracts, not a claimed Windows reproduction.
- Review consequence: AR-001. Define a concrete managed-child graceful request into existing host close, its completion/error contract and fallback ordering. No platform-wide certification or unrelated provider redesign is required by this finding.

No additional speculative scenarios were promoted. Arbitrary daemon escape, historical PID reclamation and forced OS kill remain excluded. Existing R1 fault scenarios already justify admission reservations, observation-failure distinction and bounded close.

## Unresolved Approved-Behavior Or Current-State Gaps
| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Windows-to-backend graceful shutdown link | Target path omits invocation of the owner required to perform cleanup | AR-001 | Open; design correction, not a new policy request |

## Review Decision
**Fail — Design Impact.** The main POSIX/host-scope architecture is well motivated and substantially concrete. One consequential platform path needs correction, plus two small mandatory design-inventory fixes. Do not begin implementation from D1 as an approved reviewed package.

## Findings
### AR-001 — Define the Windows graceful entry into backend-owned cleanup
- Type: Design Impact. Severity: **High**, blocking.
- Protected authority: REQ-003/004/005; AC-004/005; BEH-003/004; QR-001.
- Scope: Within Approved Scope. Changes approved behavior: **No**; realizes the already included Windows form of shutdown. If proposing to exclude that form, obtain appropriate renewed requirements approval instead.
- Evidence: D1:72,80,96 describes signal → Fastify drain and merely extends Windows managed-tree confirmation. `windowsServerManager.ts:54-75,124-172` launches with pipes and sends taskkill, with no graceful application request; `server-runtime.ts:31-47` exposes only POSIX-style signal handlers for this external stop. Native Windows commands use WSL (`non-interactive-shell-resolver.ts:83-151`). MP-001 establishes independent reachability and contract limits.
- Required update: show the Windows call-order spine all the way into the existing host close boundary. The desktop managed-child owner must initiate that bounded graceful request, the backend must drain/report through its single shutdown owner, and desktop must await its outcome/exit before any tree-force fallback or restart. Specify concrete transport/entrypoint, child association, deadlines, nonzero/incomplete reporting and how startup cancellation interacts with it. Keep diagnostic PIDs entirely separate. Update affected file mapping and tests accordingly; record live Windows limitations honestly.
- Proportion: a platform-specific bridge into the selected owner, not a new universal supervisor, is necessary; longer taskkill waits or backend-exit checks alone do not execute WSL group cleanup.
- Recommended recipient: Solution Designer.

### AR-002 — Finish direct and derived status consumer dispositions
- Type: Design Impact. Severity: **Low**, blocking completeness correction under shared-structure Principle 11.
- Protected authority: REQ-001/002/005; AC-001/003; BEH-001/002 (preserve coherent error/recovery consumers).
- Scope: Within Approved Scope. Changes approved behavior: **No**.
- Evidence: D1:31 and file mapping list loading UI, store, preload and `electron/types.d.ts`. `components/server/ServerMonitor.vue:40-44` also derives text from the changed store; `components/settings/ServerSettingsManager.vue:55-56` hosts it. `types/electron.d.ts:7,39-41` separately imports the status contract. They have no explicit disposition in the design.
- Required update: list these consumers with change/no-change decisions and reasoning, including whether the authoritative conflict overlay intentionally supplies the full recovery information while the monitor retains generic text. Confirm both declaration sites continue importing the single shared type. No duplicate diagnostic model or additional UI redesign is requested.
- Proportion: a small inventory amendment prevents an implementer from treating the listed direct consumers as the complete impact set. No actual post-change UI defect is claimed.
- Material premise: N/A; direct source consumer check, not a hypothetical new journey.
- Recommended recipient: Solution Designer.

### AR-003 — Explicitly remove the unused cached native factory accessor
- Type: Design Impact. Severity: **Low**, blocking touched-file removal correction under Principles 7/8.
- Protected authority: REQ-003/004; BEH-003/004 (single hosted scope injection); mandatory team touched-file dead-code rule also applies.
- Scope: Within Approved Scope. Changes approved behavior: **No**.
- Evidence: `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts:500-509` exports `getAutoByteusAgentRunBackendFactory` backed by a process-global cache and optional empty options. Repository source/reference search and `git grep` find only its declaration; actual hosted construction is `providers/agent-provider-factory-builder.ts:178-187`. The private server package's `src/index.ts` does not expose it, and package scripts/configuration do not register it as an entrypoint. No configured unused-export checker was found in server/workspace scripts; no compiler-based dead-export proof is claimed. D1:55-62 names only generic newly redundant assembly, not this existing dead construction path in the touched file.
- Required update: add the cache/accessor to the removal plan with the reachability evidence; keep explicit host composition as the replacement authority. Verify typecheck/build and references during implementation. Do not retain it by inventing a fallback scope. If an actual external/dynamic caller is discovered, bring that evidence back before removal rather than assuming it is dead.
- Proportion: removal of nine unused lines in an already changed owner; no broader factory cleanup or runtime lifetime change.
- Material premise: N/A; static reachability/removal check.
- Recommended recipient: Solution Designer.

## Classification
**Design Impact.** No new product requirement or prerequisite Task is established.

## Recommended Recipient
Solution Designer through the configured Fail/Design Impact route; no implementation handoff.

## Residual Risks
- Group identity still requires careful implementation: short-lived shell leaders, adoption, WSL marker acquisition and scope close must maintain ownership evidence. A raw PGID rediscovery after losing all anchors is forbidden by D1. Validate the ordinary `run_bash` survivor case as well as P-005's leader-exits-during-stop case; fail-closed must not be silently replaced by PID guessing. No extra polling framework is required by this review.
- WSL marker/group membership alone must not be mistaken for exclusive ownership of an arbitrary group; verify the launched command's group association before applying D1 group-signalling authority. Platform evidence is not yet certification.
- D1's 3s collective drain and 20s+2s child-stop inside 30s quit budget are coherent allocations, not measured changed-build guarantees. Preserve all cleanup attempts on failure and bound inspector subprocesses; test many groups and inherited pipe handles.
- Explicit updater preparation is correctly upstream of quitAndInstall: installed electron-updater BaseUpdater starts install before app.quit, while MacUpdater uses native continuation. Ordinary quit interception follows the [Electron will-quit contract](https://www.electronjs.org/docs/latest/api/app#event-will-quit). Test success, preparation failure, repeated quit and updater-disabled profile without installing anything. Keep resource-stop failure reporting distinct from the caller's quit/install continuation.
- Post-launch port diagnosis must not lose typed details to an earlier generic generation settlement, and a stale inspection must not overwrite a newer attempt. Both snapshot/event paths require tests.
- Historical Nuxt origin remains unknown; P-003/P-005 are baseline defect assertions, not evidence of a fixed product. Full Studio/standalone and changed desktop acceptance remain downstream work.
- No follow-up Task is created: the identified corrections are in scope; other listed risks are implementation/validation obligations or explicit exclusions.

## Latest Authoritative Result
- Review Decision: **Fail**.
- Material-Premise Gate: **Pass** — AR-001 rests on a supported platform path and primary contracts; no invented product scenario drives a correction.
- Current revision: **ARCH-REV-001**, applicable **SR-001/SR-002**.
- Open findings: **AR-001, AR-002, AR-003**. Task size **Large**, architectural risk **High**, unchanged.
