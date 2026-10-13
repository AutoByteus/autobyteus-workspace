# Requirements — sidebar-stop-red-default

## Document Status / Approval
- Package `sidebar-stop-red-default`; Project Task `project_task_6d8f94f6-1694-466b-9587-2ac091e7dd18`; date 2026-10-13.
- **Approved R1 / SR-001**. Owner/approver: `/software_engineering_team/solution_designer`, within the user-approved direction, with user informed.
- Requested by `/project_task_manager`, AgentRun `project_task_manager_2f7a8ea2d421446f8f22e4f616528547`.
- Approval reference: current Task message conveying user's reconsideration and explicit follow-up/dispatch approval; Solution Designer message beginning “I found five live sidebar variants” approves the exact R1 scope and disabled distinction without waiting.
- This is a **new product styling decision**, not failure/reopening of `project_task_018ddc81-1f14-4531-8143-1276d07736d3`. Its gray-default delivery remains historical, DONE; new R1 supersedes that styling for this new work only.
- Behavior-defining supplements/Product package: N/A — none needed/requested. Prior terminal receipt is background only.
- Authorities read: bundled solution-designer SKILL.md, requirements-engineering.md and templates; root/package AGENTS.md, DESIGN.md and TESTING.md in this conversation. Current base hashes checked unchanged against fully read prior delivered authorities.

## Problem And Desired Outcome
Gray Stop can appear unavailable. The user wants actionable sidebar Stop buttons immediately recognizable by red color without hover. All currently supported Workspaces sidebar variants must follow red-at-rest → darker red/pale-red hover → red-at-rest on leave, while unavailable/pending actions remain visibly disabled. Actors are users observing or activating root/copy controls; no runtime semantics are changing.

## Relevant Scenarios And Journeys (scope basis)
| Scenario | Actor / goal / supported trigger | Product sequence / outcome | Alternate / validity / evidence |
|---|---|---|---|
| SCN-001 | User identifies Stop on a live Agent (including PM), Team or Org run in Workspaces sidebar | See red Stop without hover; hover emphasizes only control; leave restores red | Selected/unselected row and unchanged running-status dot. Supported Normal Scenario: Task direction and mounted sidebar owners E1/E2. |
| SCN-002 | User identifies Stop on delegated Agent or whole-Team copy, including shared sidebar hosts | Same state sequence as root controls; correct copy remains distinguishable | No member-level Stop substitution. Supported Normal Scenario: Task direction; shared button current consumers E2/E3. |
| SCN-003 | User uses pointer or keyboard to stop a root or copy | Existing focus/accessible name and exact existing action; pending visibly unavailable; existing success/failure handling | Pending disallows repeated activation and enabled-hover cues; inactive/ineligible controls remain hidden by current rules. Supported Normal Scenario: existing disabled/native button/action paths and explicit preservation instruction. |

## Current / Desired / Preserved Behavior
| Behavior | Scenario | Current evidence-backed behavior | Desired change | Preserved |
|---|---|---|---|---|
| BEH-001 (User) | SCN-001/002 | Four button template sites in three current sidebar owners render five variants gray at rest and red on hover | Actionable Stop is red at rest and on leave; hover remains distinguishable | Glyph, hit area, layout, selection, rows/status-dot colors, visibility |
| BEH-002 (User/System) | SCN-003 | Native button disabling with reduced opacity/cursor; copies additionally labelled/pulsing while stopping | Keep pending unavailable/muted and do not show enabled-hover feedback on disabled buttons | Existing labels, focus conventions, pulse/reduced motion, keyboard and duplicate guard |
| BEH-003 (User/System) | SCN-003 | Roots terminate their subject; copies stop only selected Agent/whole Team via existing typed action, preserving open Task/restorability | Unchanged | Targets, confirmation policy, history, Task state, other workers, selection/disclosure/error paths |

## Scope Guardrail
- **UC-001:** observe/hover/leave all five currently supported left Workspaces sidebar Stop variants (SCN-001/002).
- **UC-002:** focus/activate them and observe pending/disabled/stopped behavior (SCN-003).
- In scope: Stop-only styling, direct component/browser regression and directly affected Stop documentation.
- Out of scope: row/status color changes; different visibility/target/confirmation/cancellation/lifecycle; Settings/composer/voice/background-task redesign; layout/docking; unrelated controls; architecture/catalog cleanup or previously proposed follow-ups. Prior FUP-001 is not included and must not be redispatched by this Task.
- Non-goals: redesign sizing/shape, introduce a new control abstraction or runtime capability, expand support for old fixture-only panels, or release/update installed app without applicable authority.
- Preserved boundary: BEH-002/003; only styling may change. Test-owned workers/data exclusively; no live-user-worker interruption.
- Review authority: blocking fixes must cite approved REQ/AC/BEH. New product or operational obligations are Requirement Gaps requiring renewed approval, not scope introduced by review. Adjacent issues remain non-blocking follow-ups, never added to this patch.

## Requirements / Traceability
| ID | Requirement | Use case / behavior / scenario | AC |
|---|---|---|---|
| REQ-001 | All five actionable sidebar Stop variants use the same existing red resting convention; preserve visible hover contrast and return to red on leave | UC-001; BEH-001; SCN-001/002 | AC-001 |
| REQ-002 | Disabled/pending Stop remains natively unavailable and visually distinct from enabled red, with no enabled-hover presentation; preserve current focus/accessibility/loading/reduced-motion treatment | UC-002; BEH-002; SCN-003 | AC-002 |
| REQ-003 | Preserve root/copy visibility, exact stop target, pointer/keyboard behavior, confirmation policy, lifecycle, row/status/selection/disclosure behavior | UC-001/002; BEH-001..003; all | AC-003/004 |
| REQ-004 | Prove each affected variant with regression and rendered rest/hover/leave/focus/pending evidence, using only safe isolated resources; report source integration separately from installed-runtime rollout | UC-001/002; all | AC-001..005 |
All requirements Must; source is explicit Task direction plus evidence-backed existing behavior.

## Acceptance Criteria
| ID | Preconditions / trigger | Observable expected result / alternate | Verification intent |
|---|---|---|---|
| AC-001 | Enabled ordinary Agent, ordinary Team, ordinary Org, delegated Agent, delegated Team sidebar buttons; pointer outside/over/away | All rest red, hover darker red on pale-red background, leave red again. Only Stop changes; row and running indicators retain current styling | Parameterized regression + real CSS/computed-style assertions/screenshots for each variant; selected state where genuinely reachable |
| AC-002 | Keyboard focus then held test-owned stop; also hover and try activation while disabled | Focus remains visible and control named; correct native activation; pending/disabled muted, no enabled-hover cue or duplicate request; existing copy pulse and reduced-motion behavior preserved | Rendered focus/pending/disabled-hover evidence; semantic/event tests |
| AC-003 | Activate each root variant; inactive root or pending operation | Agent ID, Team ID or Org ID passed unchanged to existing respective action; unchanged confirmation and stop/history outcome. Inactive root no new Stop. Neighboring controls and status indicators unchanged | Root component/action tests plus isolated browser action/payload checks |
| AC-004 | Activate delegated Agent/Team Stop under supported sidebar root hosts | Exact selected Agent or whole-Team reference and owning root; no parent/member substitution or row toggle/selection. Task remains open, parent/other copies unaffected; visibility and resume semantics unchanged | Existing real-stack DCP coverage updated for new styling, shared host/component assertions |
| AC-005 | Delivery completes | Durable commands/results/screenshots and cleanup; actual integrated source/release/running-app state distinguished; any remaining user-only check explicit | Delivery receipt verification |

## UI / Quality / Continuity
Use existing red Stop palette, not a new design: enabled rest red-500; enabled hover red-600 on red-50; disabled gray-400 with current reduced opacity/cursor and no red hover background. This visual detail follows the current Settings/copy Stop language and explicitly avoids suggesting disabled actions are enabled. Focus ring/native outline, sizes and icon remain their existing conventions. Product reference repo/UI-UX spec: N/A — not requested. Prior gray-default screenshot/receipt is not the new normative reference.
Quality: accessibility/availability REQ-002 + AC-002; isolation and honest evidence REQ-004 + AC-005. Persisted data affected: **No**; preserve all histories, Tasks, runtime identities/settings. No loss/reset/migration or live-user restart authorized.

## Decisions / Assumptions
| ID | Question | Reasoning then decision | Owner / status |
|---|---|---|---|
| DEC-001 | Additional sidebar variants? | Root Team/Org Stops are current mounted peers; include them to satisfy all actionable sidebar Stops. Five supported variants, not only screenshots' PM/copies. | Solution Designer / Decided |
| DEC-002 | Which red and disabled appearance? | Existing Stop palette already offers red-500/red-600/red-50. Reuse it; disabled should read unavailable, so keep native disabling/opacity/cursor but muted gray and suppress enabled-hover effects. No behavior changes. | Solution Designer / Decided |
| DEC-003 | Old running-list × / roster Terminate? | Searches find no production parent of RunningTeamGroup/TeamMembersPanel in current app entrypoints; only fixtures. × is a close/remove surface and roster Terminate is already red. Do not promote fixture-only surfaces or do unrelated cleanup. | Solution Designer / Decided |
No material open assumption or Needs user decision. If an additional currently mounted sidebar Stop is discovered, assess under REQ-001 with evidence rather than arbitrarily adding non-sidebar controls.

## Supplements / Architecture Input / Readiness
Prior receipt: `/home/autobyteus/workspace/.codex/delivery-records/task-copy-stop-style/solution-terminal-result.md`, background only; detailed inventory in investigation. The current canonical source, not prior task's screenshots, defines preserved semantics. Architecture must map five variants and async owners, bounded CSS-only implementation and existing reusable validation seams. No design targets were required to fill a behavior gap.
Readiness: evidence-backed current behavior, explicit desired/preserved scope, supported scenarios and linked measurable ACs, reasoned decisions, data constraint and exact approval: **Yes**. Product approval: N/A. Ready for design: **Yes**. Blockers: None.
