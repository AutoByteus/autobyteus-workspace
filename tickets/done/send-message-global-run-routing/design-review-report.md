# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/design-spec.md`
- Current Review Round: 2
- Trigger: Revised artifact package after user clarified `target_agent_run_id` delivery is live-only through `AgentRunManager.getActiveRun(targetRunId)`, with no `AgentTeamRunManager`/team-claim/lazy-start/task-agent-recovery route.
- Prior Review Round Reviewed: Round 1 design review report at this same path. Round 1 passed the older broader global address-directory/team-claim design and is now superseded by changed requirements, not by an unresolved finding.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Reviewed the revised requirements, investigation notes, design spec, prior report, and implementation pause note. Because the worktree contains partial untrusted draft implementation changes, source evidence was checked against baseline `origin/personal` using `git show` for `send_message_to` parser/contract, `AgentRunManager.getActiveRun`, `AgentRun.postUserMessage`/`emitLocalEvent`, and self-evolution target/start behavior. Current worktree status confirms incomplete draft changes are present and branch `HEAD` is behind latest `origin/personal`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Prior global exact-run design after AgentRunId allocator baseline | N/A | No | Pass | No | Superseded by later user clarification. It approved a broader `GlobalAgentRunAddressDirectory`/team-claim design that is no longer desired. |
| 2 | Revised live-only exact-run design | N/A — no prior unresolved findings | No | Pass | Yes | Design is ready for implementation after stale draft code is reconciled/removed. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/design-spec.md` as the latest authoritative target design for `send-message-global-run-routing`.

This round treats `/Users/normy/autobyteus_org/autobyteus-worktrees/send-message-global-run-routing/tickets/in-progress/send-message-global-run-routing/implementation-pause-note.md` as relevant context: implementation was paused mid-draft, and source changes currently in the worktree are not an implementation handoff.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design identifies the work as a larger requirement / feature / refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classification includes boundary/ownership issue, duplicated coordination, file-placement drift, and legacy/compatibility pressure; evidence cites global run ids, team-owned current send-message placement, and the now-rejected broad directory/recoverable exact-route behavior. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The design explicitly says refactor is needed now. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Concrete sections move shared parser/contract/selector into `agent-communication`, define selector-first dispatch, define active-only `GlobalAgentRunMessageRouter`, preserve `recipient_name` team route, and remove prior directory/team-claim/recoverable exact-route behavior. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | Superseded decision, no unresolved findings | Prior report had `Findings: None`; current requirements explicitly supersede the broader directory/team-claim design. | No finding IDs to carry forward. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Global live exact-run route | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Team `recipient_name` route | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Self-evolution outcome route | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Self-evolution live-target start check | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Direct delivery result/event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Direct grant policy local spine | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-communication` | Pass | Pass | Pass | Pass | Correct owner for shared tool semantics, dispatcher, active-only direct router, builders, references, and optional grants. |
| `agent-execution` / `AgentRunManager` | Pass | Pass | Pass | Pass | Correct authoritative active-run registry for live direct routing. The design avoids making runtime adapters use it directly. |
| `agent-team-execution` | Pass | Pass | Pass | Pass | Correctly narrowed to `recipient_name` team semantics, lazy lifecycle, task-agent/team behavior under team route, and Team Communication projection. |
| Runtime adapters | Pass | Pass | Pass | Pass | AutoByteus/Codex/Claude stay provider-specific wrappers over the shared dispatcher. |
| `self-evolution` | Pass | Pass | Pass | Pass | Owns live-start check, helper prompt/grant registration, and truthful outcome summary; does not own generic routing. |
| `built-in-agents` | Pass | Pass | Pass | Pass | Correct place for Skill Self-Evolver tool config and reporting guidance. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Selector parsing/validation | Pass | Pass | Pass | Pass | `SendMessageTargetSelector` keeps the public selector invariant outside team ownership. |
| Sender identity | Pass | Pass | Pass | Pass | `AgentRunMessageSenderContext` includes sender run id/name/runtime plus optional team context without copying roster state. |
| Reference normalization | Pass | Pass | Pass | Pass | Shared absolute-path behavior belongs in `agent-communication`; self-evolution reference restrictions remain grant policy. |
| Direct input/event shape | Pass | Pass | Pass | Pass | Builders centralize model-visible content and direct `INTER_AGENT_MESSAGE` payloads. |
| Grant policy shape | Pass | Pass | Pass | Pass | Grant remains reusable policy/usage shape, not routing or discovery. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SendMessageTargetSelector` | Pass | Pass | Pass | Pass | Only canonical `recipient_name` and `target_agent_run_id`; aliases remain rejected. |
| `AgentRunMessageSenderContext` | Pass | Pass | Pass | Pass | Optional `MemberTeamContext` is metadata for team branch/sender details, not route authority for exact ids. |
| `GlobalAgentRunMessageDeliveryInput/Result` | Pass | Pass | Pass | Pass | Target is only `targetAgentRunId`; inactive/not-found is a typed result. |
| `DirectAgentRunMessageGrant` | Pass | Pass | Pass | Pass | Policy fields only; no endpoint pointer or lookup behavior. |
| Direct event payload | Pass | Pass | Pass | N/A | Explicitly no `team_run_id` and no Team Communication reference entries in global direct route. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Team-owned shared parser/contract/selector ownership | Pass | Pass | Pass | Pass | Replaced by `agent-communication`; no old-path compatibility wrapper. |
| Team-bound exact-id wording | Pass | Pass | Pass | Pass | Contract must describe `target_agent_run_id` as global active exact run id and `recipient_name` as team-local. |
| Prior `GlobalAgentRunAddressDirectory` / team-claim scan | Pass | Pass | Pass | Pass | Explicitly removed; router uses only `AgentRunManager.getActiveRun`. |
| Recoverable/lazy exact-route semantics under `target_agent_run_id` | Pass | Pass | Pass | Pass | Exact id becomes active direct only; team semantics stay under `recipient_name` and other team/task tools. |
| Grant-first routing concept | Pass | Pass | Pass | Pass | Grants remain optional policy overlay only. |
| Duplicate self-evolution generic success notification | Pass | Pass | Pass | Pass | Removed for successful helper-authored outcome; truthful not-sent/failure summaries remain. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-communication/domain/send-message-target-selector.ts` | Pass | Pass | Pass | Pass | One selector invariant owner. |
| `agent-communication/domain/agent-run-message-sender.ts` | Pass | Pass | Pass | Pass | Cross-runtime sender shape only. |
| `agent-communication/domain/direct-agent-run-message-grant.ts` | Pass | Pass | Pass | Pass | Grant policy shape and usage result types. |
| `agent-communication/services/send-message-to-tool-contract.ts` | Pass | Pass | Pass | Pass | Shared public wording/schema-independent contract. |
| `agent-communication/services/send-message-to-tool-argument-parser.ts` | Pass | Pass | Pass | Pass | Shared parser/validator. |
| `agent-communication/services/agent-communication-reference-files.ts` | Pass | Pass | Pass | Pass | Cross-team/direct absolute reference normalization. |
| `agent-communication/services/global-agent-run-message-router.ts` | Pass | Pass | Pass | Pass | Main active-only exact route owner. |
| `agent-communication/services/global-agent-run-message-runtime-builders.ts` | Pass | Pass | Pass | Pass | Direct input/event formatting only. |
| `agent-communication/services/direct-agent-run-message-grant-registry.ts` | Pass | Pass | Pass | Pass | Transient helper grant/usage owner. |
| `agent-communication/services/send-message-to-dispatcher.ts` | Pass | Pass | Pass | Pass | Selector branch and route invocation only. |
| Runtime adapter files | Pass | Pass | Pass | Pass | Provider-specific exposure/call adaptation only. |
| Self-evolution files | Pass | Pass | Pass | Pass | Product-specific live-start, helper prompt/grant, and record summary. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime adapters | Pass | Pass | Pass | Pass | Must call dispatcher; must not call `AgentRunManager`, team resolvers, registries, or grant internals for delivery. |
| `agent-communication` global router | Pass | Pass | Pass | Pass | May depend on `AgentRunManager.getActiveRun` and `AgentRun` post/event APIs; must not depend on `AgentTeamRunManager` or team metadata/claim sources. |
| `agent-team-execution` | Pass | Pass | Pass | Pass | May import generic selector/parser types; remains team route owner only. |
| `self-evolution` | Pass | Pass | Pass | Pass | May check active target and register/read grants; must not bypass router for final target message. |
| Identity allocation | Pass | Pass | Pass | Pass | No new local run-id generators. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `SendMessageToDispatcher` | Pass | Pass | Pass | Pass | Runtime-neutral tool-call entry after adapter. |
| `GlobalAgentRunMessageRouter` | Pass | Pass | Pass | Pass | Governing owner for `target_agent_run_id` active direct delivery. |
| `AgentRunManager` | Pass | Pass | Pass | Pass | Sole live target decision via `getActiveRun`; not expanded into team claim lookup. |
| `MixedTeamManager` / team delivery | Pass | Pass | Pass | Pass | Governing owner for `recipient_name`, lazy/team projection semantics. |
| `DirectAgentRunMessageGrantRegistry` | Pass | Pass | Pass | Pass | Policy/usage only; no endpoint storage or delivery. |
| `SelfEvolutionService` | Pass | Pass | Pass | Pass | Owns live-start requirement before helper launch. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `SendMessageToDispatcher.dispatch(input)` | Pass | Pass | Pass | Low | Pass |
| `GlobalAgentRunMessageRouter.deliver(input)` | Pass | Pass | Pass | Low | Pass |
| `AgentRunManager.getActiveRun(runId)` | Pass | Pass | Pass | Low | Pass |
| `MemberTeamContext.deliverInterAgentMessage(intent)` | Pass | Pass | Pass | Medium | Pass |
| `DirectAgentRunMessageGrantRegistry.register(senderRunId, grant)` | Pass | Pass | Pass | Low | Pass |
| `SelfEvolutionService.startForTarget(...)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-communication/domain/` | Pass | Pass | Low | Pass | Shared shapes only. |
| `autobyteus-server-ts/src/agent-communication/services/` | Pass | Pass | Medium | Pass | Router/dispatcher/builders/grants are related but split by concern. |
| `autobyteus-server-ts/src/agent-tools/agent-communication/` | Pass | Pass | Low | Pass | AutoByteus wrapper/schema only. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-communication/` | Pass | Pass | Low | Pass | Codex adapter only. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/agent-communication/` | Pass | Pass | Low | Pass | Claude adapter only. |
| `autobyteus-server-ts/src/agent-team-execution/...` | Pass | Pass | Medium | Pass | Team route stays here after shared files move out. |
| `autobyteus-server-ts/src/self-evolution/...` | Pass | Pass | Medium | Pass | Product orchestration only. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Active target lookup | Pass | Pass | N/A | Pass | Reuses `AgentRunManager.getActiveRun`; no new directory. |
| Team roster/lazy/projection route | Pass | Pass | N/A | Pass | Reuses `agent-team-execution` for `recipient_name`. |
| Shared send-message public contract | Pass | Pass | Pass | Pass | New `agent-communication` owner is justified because team-only ownership is too narrow. |
| Global target id resolution | Pass | Pass | N/A | Pass | The design explicitly rejects a new resolver/directory and uses the existing active registry. |
| Self-evolution helper policy | Pass | Pass | Pass | Pass | Extends self-evolution and adds reusable grant policy/usage. |
| Runtime exposure | Pass | Pass | N/A | Pass | Extends existing AutoByteus/Codex/Claude provider surfaces. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Old team-owned shared parser/selector/contract | No | Pass | Pass | Move to `agent-communication`; no old-path wrappers. |
| Prior address-directory/team-claim design | No | Pass | Pass | Remove/rework any paused draft code. |
| Recoverable/lazy exact-run behavior under `target_agent_run_id` | No | Pass | Pass | Active-only exact route; team semantic behavior uses `recipient_name` or existing task channels. |
| Selector aliases | No | Pass | Pass | Existing alias rejection preserved. |
| Provider/platform ids | No | Pass | Pass | Canonical `AgentRun.runId` only. |
| Duplicate self-evolution success notification | No | Pass | Pass | No generic success notification after successful direct outcome. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Reconcile paused partial implementation | Pass | Pass | Pass | Pass |
| Shared file move and contract wording update | Pass | Pass | Pass | Pass |
| Dispatcher and active-only router | Pass | Pass | Pass | Pass |
| Team `recipient_name` preservation | Pass | Pass | Pass | Pass |
| AutoByteus/Codex/Claude standalone exposure | Pass | Pass | Pass | Pass |
| Self-evolution live-start and outcome/grant flow | Pass | Pass | Pass | Pass |
| Test/docs update expectations | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Selector-first routing | Yes | Pass | Pass | Pass | Example makes route decision unambiguous. |
| Live exact target lookup | Yes | Pass | Pass | Pass | Good/bad examples clearly reject `AgentTeamRunManager` team-claim scan. |
| Team route separation | Yes | Pass | Pass | Pass | Clarifies why Team Communication is `recipient_name`-only in this ticket. |
| Grant role | Yes | Pass | Pass | Pass | Keeps grants policy-only. |
| Self-evolution stale target | Yes | Pass | Pass | Pass | Start and final-delivery liveness checks are clear. |
| Global router pseudocode | Yes | Pass | N/A | Pass | Shows `getActiveRun` then post, then event only after acceptance. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Multi-user / tenant ACL | Current scope permits any configured sender with a known active run id to attempt delivery. | Preserve future authorization seam in the router; do not invent partial ACLs now. | Residual risk; not blocking. |
| Direct global UI/history surface | Direct events are not Team Communication records and may not appear like team messages. | Keep direct event payload safe; future dedicated global-message UI/history is out of scope. | Residual risk; not blocking. |
| Paused draft source state | Existing uncommitted work may implement superseded directory/team-claim ideas. | Implementation must reconcile against the revised design before continuing. | Implementation risk; not design blocker. |
| Existing exact-run team tests/callers | Semantics intentionally change from active/recoverable team-bound exact route to active-only direct route. | Update tests and docs to the new acceptance criteria. | Expected work; not blocking. |

## Review Decision

Pass: the revised live-only design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings. The previous round is superseded by changed requirements, not by an unresolved architecture finding.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The worktree contains incomplete paused implementation changes, including likely stale address-directory/team-claim code. Implementation must remove or rework that code before proceeding.
- Active team-member exact-id delivery will be a direct run route without Team Communication projection; docs/tests must make this distinction clear so callers use `recipient_name` when team projection/lazy behavior is desired.
- The direct event path must emit only after `AgentRun.postUserMessage` accepts and must not accidentally create Team Communication projections.
- Global active-run messaging remains broad for configured senders that know a live run id; keep exact-id/no-discovery behavior and preserve the future policy seam.
- Self-evolution needs focused tests for stale target at start, target termination before final send, not-attempted helper outcome, grant rejection, and no duplicate generic notification.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 2 supersedes Round 1. The design now correctly implements the user-approved live-only spine: `Runtime send_message_to(target_agent_run_id) -> SendMessageToDispatcher -> GlobalAgentRunMessageRouter -> AgentRunManager.getActiveRun(targetRunId) -> AgentRun.postUserMessage -> direct INTER_AGENT_MESSAGE event/result`. Proceed to implementation after reconciling/removing stale draft code.
