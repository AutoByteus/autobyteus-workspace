# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/in-progress/new-team-focused-member-message-routing/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/in-progress/new-team-focused-member-message-routing/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/new-team-focused-member-message-routing/tickets/in-progress/new-team-focused-member-message-routing/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review after solution-designer handoff and user-approved requirements.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the upstream requirements, investigation notes, design spec, and checked current code paths in `autobyteus-web/utils/teamActiveExecutionMembers.ts`, `autobyteus-web/stores/activeContextStore.ts`, `autobyteus-web/stores/agentTeamRunStore.ts`, `autobyteus-web/stores/agentTeamContextsStore.ts`, `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue`, `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`, backend `TeamRun`, and `MixedTeamManager`/member registry target handling.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | No | Pass | Yes | Design is actionable for implementation with residual attention to task-agent and subteam send behavior. |

## Reviewed Design Spec

The design identifies the current bug as a frontend boundary/ownership issue: visible roster focus (`AgentTeamContext.focusedMemberRouteKey`) is being overridden by active-execution display fallback (`activeExecutionFocusedMemberRouteKey`) before the WebSocket send. The proposed target shape introduces `teamUserMessageTarget.ts` as the frontend authority for ordinary user-message target selection, then has `activeContextStore` and `agentTeamRunStore` consume that same resolver so composer context, attachment ownership, optimistic submission, and `target_member_route_key` stay aligned. Backend routing remains unchanged because the existing backend already preserves explicit route-key targets and falls back only when the target is null.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the work as Bug Fix / Behavior Change. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classified as Boundary Or Ownership Issue with evidence from active context, send store, active-execution utility, and backend explicit-target path. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design states a bounded frontend refactor is needed now and defers broader active-execution display redesign. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Resolver, store consumption, file mapping, dependency rules, tests, and removal/decommission plan all reflect the bounded refactor. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First review round. | N/A |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end user focused send | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Return/event projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Bounded local target resolution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend team target resolution | Pass | Pass | Pass | Pass | New resolver owns message target policy rather than overloading active-execution display filtering. |
| Frontend active context facade | Pass | Pass | Pass | Pass | Must consume resolver for composer/send context; implementation should avoid disturbing interrupt-specific active-execution semantics except where intended. |
| Frontend team run sending | Pass | Pass | Pass | Pass | Existing send orchestrator remains owner of launch, attachment finalization, optimistic message, and WebSocket send side effects. |
| Backend team execution | Pass | Pass | Pass | Pass | Reuse is appropriate; no backend compensating change is needed unless tests reveal independent backend rejection. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Focused route/node/context validation for user sends | Pass | Pass | Pass | Pass | Centralizing this in `teamUserMessageTarget.ts` avoids duplicated policy in `activeContextStore`, `agentTeamRunStore`, and components. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TeamUserMessageTarget` | Pass | Pass | Pass | Pass | Pass | Proposed fields are narrow (`memberRouteKey`, `node`, `context`, optional source/kind/error reason). Keep it from becoming a generic runtime status shape. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Send-path dependence on `activeExecutionFocusedMemberRouteKey` for valid focused sends | Pass | Pass | Pass | Pass | Obsolete behavior is named without removing the display utility itself. |
| Old all-offline coordinator fallback test expectation for composer/send | Pass | Pass | Pass | Pass | Regression tests must be updated/split so active-execution display fallback can remain separately covered. |
| Duplicate ad hoc focused-route validation in stores/components | Pass | Pass | Pass | Pass | Design forbids local copies and points callers to resolver. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/teamUserMessageTarget.ts` | Pass | Pass | Pass | Pass | Single target-selection policy file. |
| `autobyteus-web/stores/activeContextStore.ts` | Pass | Pass | Pass | Pass | Existing facade remains; implementation should be careful because `activeAgentContext` also feeds interrupt/config/progress surfaces. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Pass | Pass | Pass | Pass | Existing send side-effect owner consumes target result once. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Pass | Pass | N/A | Pass | Presentation-only alignment for label/shared composer. |
| `autobyteus-web/utils/__tests__/teamUserMessageTarget.spec.ts` | Pass | Pass | N/A | Pass | Correct placement for resolver policy tests. |
| `autobyteus-web/stores/__tests__/activeContextStore.spec.ts` | Pass | Pass | N/A | Pass | Correct placement for composer facade behavior. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Pass | Pass | N/A | Pass | Correct placement for send payload/attachment/optimistic routing behavior. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `teamUserMessageTarget.ts` | Pass | Pass | Pass | Pass | May depend on team/context types; must not import or delegate user-send selection to active-execution fallback. |
| `activeContextStore` | Pass | Pass | Pass | Pass | Allowed to consume resolver and team context store. |
| `agentTeamRunStore` | Pass | Pass | Pass | Pass | Must consume resolver once for all target-dependent side effects. |
| Components | Pass | Pass | Pass | Pass | Should consume store/resolver output and not reproduce routing policy. |
| Backend `TeamRun`/WebSocket handler | Pass | Pass | Pass | Pass | Preserve explicit route-key contract; no frontend guessing of backend fallback. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend user-message target resolver | Pass | Pass | Pass | Pass | Corrects the current mixed-level dependency on active-execution internals for user sends. |
| Active-execution display filtering | Pass | Pass | Pass | Pass | Remains available for display/status; forbidden as ordinary user-message target authority. |
| Backend `TeamRun.postMessage(...)` | Pass | Pass | Pass | Pass | Backend fallback remains authoritative only when frontend sends no explicit target. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `resolveTeamUserMessageTarget(teamContext)` | Pass | Pass | Pass | Low | Pass |
| `activeContextStore.activeAgentContext` | Pass | Pass | Pass | Medium | Pass |
| `agentTeamRunStore.sendMessageToFocusedMember(text, attachments)` | Pass | Pass | Pass | Low | Pass |
| WebSocket `SEND_MESSAGE` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/teamUserMessageTarget.ts` | Pass | Pass | Low | Pass | Fits existing utility pattern for team selection/domain utilities. |
| `autobyteus-web/stores/activeContextStore.ts` | Pass | Pass | Low | Pass | Existing generic composer facade. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Pass | Pass | Low | Pass | Existing team run send owner. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | Pass | Pass | Low | Pass | View presentation only. |
| Test files under `utils/__tests__` and `stores/__tests__` | Pass | Pass | Low | Pass | Coverage follows owner boundaries. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Active runtime display/status filtering | Pass | Pass | N/A | Pass | `teamActiveExecutionMembers.ts` stays unchanged for its real owner. |
| User-message target selection | Pass | Pass | Pass | Pass | New support piece is justified because no existing resolver owns visible-focus-led send semantics. |
| Backend target execution | Pass | Pass | N/A | Pass | Backend already supports explicit route-key targets. |
| Context-file ownership/finalization | Pass | Pass | N/A | Pass | Existing utilities work when supplied the corrected route key. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| First-send valid focused member routing | No | Pass | Pass | Old coordinator-forcing behavior is explicitly rejected. |
| Backend send command payload | No | Pass | Pass | No dual field or compatibility flag is proposed. |
| Active-execution display filtering | No | Pass | Pass | Retention is not compatibility for the send bug; it is a separate display/status capability. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Add resolver and unit tests | Pass | Pass | Pass | Pass |
| Consume resolver in active context and team send stores | Pass | Pass | Pass | Pass |
| Align component label/shared composer behavior | Pass | Pass | Pass | Pass |
| Update stale test expectations and add send regression coverage | Pass | Pass | Pass | Pass |
| Run targeted frontend checks with dependency setup caveat | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| New team focused send | Yes | Pass | Pass | Pass | Example matches the reported `code_reviewer` vs `solution_designer` bug. |
| Invalid focus | Yes | Pass | Pass | Pass | Example prevents silent arbitrary fallback. |
| Subteam focus | Yes | Pass | N/A | Pass | Design flags this as a verification point and references existing subteam draft path; implementation should keep leaf composer and subteam send cases explicit. |
| Task-agent direct/parent behavior | Yes | Pass | N/A | Pass | Design calls this out as a risk; implementation should include enough checks to avoid regressions. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Task-agent direct send and task-agent-only logical parent behavior | The active-execution utility currently carries task-agent safety policy; moving ordinary send selection to visible focus must not accidentally send user drafts to an unsupported or hidden task-agent/parent target. | Implementation should preserve or explicitly reject task-agent send paths and keep existing tests passing or intentionally updated. | Residual implementation risk, not a design blocker. |
| Focused subteam nodes | `agent_team` nodes do not have leaf `AgentContext`, while existing UI has a `subteamDraft` path. | Implementation should keep resolver return shape/options explicit enough for leaf composer context vs subteam send target. | Residual implementation risk, not a design blocker. |
| Restored inactive historical team runs | Requirements scoped the reported bug to new/not-yet-started teams, while the user-approved rule says valid focused sends should target the focused member. | Implementation should not broaden restored-run behavior beyond the design without tests; API/E2E can classify if further coverage is needed. | Residual implementation risk, not a design blocker. |
| Interrupt and non-send consumers of `activeContextStore.activeAgentContext` | `activeAgentContext` also feeds canInterrupt, config/progress panels, and tool UI. | Implementation should avoid using the new user-message resolver for interrupt target authority unless the existing focused-member interrupt behavior still passes. | Residual implementation risk, not a design blocker. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The resolver must keep task-agent and task-agent-only logical parent behavior explicit; do not accidentally turn active-execution safety filtering into a hidden send regression.
- Subteam focused send must remain explicit because subteams are route-key targetable but do not provide a leaf `AgentContext` for the shared composer.
- `activeContextStore.activeAgentContext` has non-send consumers; implementation should preserve focused-member interrupt behavior and status/progress surfaces while fixing composer/send targeting.
- The task worktree was created from `origin/personal`, and upstream moved afterward; delivery will need the normal integrated-state refresh before finalization.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The design follows the authoritative boundary rule by separating visible-focus-led user-message target selection from active-execution display filtering and by keeping backend explicit target routing unchanged. Proceed to implementation with the residual risks above under test coverage.
