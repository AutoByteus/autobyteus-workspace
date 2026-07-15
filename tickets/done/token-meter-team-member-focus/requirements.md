# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Fix the Token Meter scope for agent-team member focus and simplify the workspace header. When a user focuses different members inside a team run, the Token Meter headline cards currently stay on the parent team aggregate while a separate lower `Focused member` subsection shows different per-member totals. The top workspace header also shows a compact token/cost chip that is too low-detail to be useful and makes the header visually cluttered. Together these behaviors make token usage appear stale, inconsistent, and noisy.

The intended behavior is: token usage detail lives in the right-side Token tab, not in the top header. The Token tab's primary/headline summary must follow the same member-scoped model as the right-side Files, Activity, and Artifacts tabs. For a single-agent run, the primary subject is the selected agent run. For a team workspace with a focused leaf member, the primary subject is the focused member's agent run. Team-level usage may still be useful, but not as a single ambiguous aggregate that replaces the focused member. In team contexts, the secondary section should be a clearly labeled `Team` summary showing per-member token/cost breakdowns so users can compare member usage at a glance; detailed per-member token analysis remains available by focusing/clicking that member.

## Investigation Findings

- The behavior is reproducible from code: `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` computes `primarySummary = teamSummary ?? focusedMemberSummary`, so team aggregate always wins whenever `selectionStore.selectedType === 'team'` and a team summary exists.
- The lower `Focused member` cards are rendered from `focusedMemberSummary`, which is why they differ from the headline cards.
- `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` passes only `teamRunId` to `TokenUsageHeaderChip`; `TokenUsageHeaderChip.vue` prefers `teamRunId`, so the compact chip is also aggregate-biased in team workspaces. The user further clarified that this compact header chip should be removed entirely because it is too low-detail and clutters the top header.
- Server persistence is not the blocker: `TokenUsageLedgerStore` and GraphQL already expose `getAgentRunTokenUsageSummary`, `getTeamRunTokenUsageSummary`, and `getTeamMemberTokenUsageSummary`.
- Local persisted ledger evidence confirms per-member totals are available and different under the same team aggregate. A recent local team had 7,329,895 aggregate tokens, while individual members had distinct totals such as 5,325,477, 569,390, 452,101, 410,389, 341,938, and 230,600 tokens.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue, with a local presentation-selection defect.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The panel and chip use parent team aggregate as primary while the team workspace's focused-member state represents the visible/active member context. Existing backend/store boundaries already distinguish run/team/member summaries.
- Requirement or scope impact: The fix must define one selected token-usage subject for the Token tab, remove the compact header token/cost chip, and remove the mixed primary+focused-member subsection behavior.

## Recommendations

- Introduce or reuse a small frontend selected-token-usage-scope resolver for the Token tab.
- For team member focus, resolve the focused leaf member's run ID/route key and use that member summary as the primary summary, consistent with Files/Activity/Artifacts.
- Remove the compact token/cost chip from workspace top headers; users should open the Token tab for token detail.
- Remove the `Focused member` subsection for member-focused views because the primary cards will already show member usage.
- Replace the old `Focused member` subsection with a clearly labeled secondary `Team` summary in team contexts. The Team summary should show per-member usage rows/cards rather than only one aggregate number.
- Reuse existing server-accounted summaries; do not compute token/cost totals in the frontend.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User opens Token tab for a normal single-agent run.
- UC-002: User opens Token tab for an agent-team workspace with a focused leaf member.
- UC-003: User switches focus between team members with different persisted token usage.
- UC-004: User focuses an offline/completed historical team member whose token usage is persisted.
- UC-005: User views a clean workspace top header without a compact token/cost chip.
- UC-006: User views a clearly labeled secondary Team summary that compares token/cost usage across team members while one member remains the primary focused Token Meter subject.

## Out of Scope

- Changing provider token accounting semantics, pricing formulas, cache/reasoning-token normalization, or server ledger aggregation.
- Reworking unrelated team navigation, message routing, agent runtime behavior, or run history hydration beyond what is necessary to resolve the focused member token scope.
- Adding a new invoice/cost analytics view.
- Removing backend team aggregate APIs.

## Detailed UI Requirements

### Workspace Top Header

- Remove the compact token/cost chip from the top header in both `AgentWorkspaceView` and `TeamWorkspaceView`.
- The top header should retain only identity/status/mode/action controls such as avatar/initial, focused member or agent title, status, view-mode switch, settings, and add/new actions.
- There must be no inline token count, estimated cost, partial-estimate pill, or compact token chip in the header.
- Users access token details through the right-side `Token` tab.

### Token Tab Primary Section: Focused Run Detail

- The existing detailed Token Meter layout remains the primary section. Do not simplify or remove its detailed cards for the focused run.
- For a single-agent workspace, the primary section displays the selected agent run.
- For a team workspace, the primary section displays the currently focused leaf member's agent run.
- The primary section keeps the current detailed hierarchy:
  1. `Current prompt` progress block, when current-prompt/context-window fields are available.
  2. Summary card grid: `Gross input`, `Output`, and `Total estimate`.
  3. `Input breakdown`.
  4. `Pricing details`.
- All values in this primary section must come from the same focused run summary.

### Token Tab Secondary Section: Team Summary

- In team workspaces, render a secondary section below the focused run detail with heading `Team`.
- This section replaces the current `Focused member` subsection. Do not use labels `Focused member`, `Member tokens`, or `Member cost` in the new section.
- The Team section is a compact per-member comparison, not another full Token Meter for every member.
- Recommended shape: one card containing a compact table/list with one row per visible leaf team member.
- Each member row should include:
  - member display name, matching the team/member label used elsewhere in the workspace;
  - focus indicator for the currently focused member, such as `Focused` badge or highlighted row;
  - input tokens, using the same gross-input semantics as the primary `Gross input` card;
  - output tokens;
  - total tokens;
  - estimated total cost or cost status (`price missing`, `partial estimate`, `mixed`, `local/no API bill`) using existing cost formatting rules.
- When space allows, include input cost and output cost as secondary details in the row, tooltip, or expanded row; do not make the base row too visually heavy.
- If a member has no reported usage, show a quiet zero/empty state for that member row rather than hiding the member.
- If a member summary is loading, show a lightweight loading state in that row or the section; do not block rendering the focused primary summary.
- The Team section may include a clearly labeled `Team total` row/card at the bottom. If included, it must be visually subordinate to the focused run primary section and clearly identified as aggregate.
- The Team section should be useful at a glance: it is for comparing which member used how many tokens/cost, while detailed analysis remains in the primary Token Meter by focusing that member.

### Visual Quality Requirement For Implementation

- This is a UI task. The implementation engineer must verify the UI visually in the running app, not only by reading code or running unit tests.
- After implementing, the implementation engineer must start the required backend/server and frontend locally, open the app, and inspect the Token tab with realistic token data.
- Validation data can come from an existing token-emitting agent/team run, or from a seeded/simple agent team run. The run may use Codex runtime with GPT-5.5 if available in the local environment.
- The implementation handoff must include visual-validation evidence: what server/frontend commands were run, what run/team was opened or seeded, what member focus switches were inspected, and at least one screenshot or equivalent artifact showing the final Token tab and clean top header.
- The implementation engineer must iterate on spacing, hierarchy, labels, truncation, and responsive behavior until the UI looks clean and the Team section is easy to understand.

## Functional Requirements

- REQ-001: The Token Meter must choose exactly one primary usage subject for headline cards and input/pricing breakdowns.
- REQ-002: For a single-agent selection, the primary usage subject must be the selected agent run.
- REQ-003: For a team workspace with a focused leaf member, the primary usage subject must be the focused member's agent run, not the parent team aggregate.
- REQ-004: Switching focused team members must immediately update the Token Meter headline cards, input breakdown, and pricing details to the selected member's persisted usage summary.
- REQ-005: Offline or completed focused team members with persisted token usage must display their own summary without waiting for new live runtime events.
- REQ-006: The Token Meter must not render a separate `Focused member` / `Member tokens` / `Member cost` subsection when the primary summary is already the focused member's summary.
- REQ-007: In team contexts, the Token tab must render a clearly labeled secondary `Team` section below the focused member primary summary. This section must summarize per-member usage, not replace the focused member headline.
- REQ-007A: The Team section must include each visible leaf team member's token and cost summary at a glance, including at minimum input tokens, output tokens, total tokens, and estimated total cost/status.
- REQ-007B: When server-owned component costs are available, the Team section should expose input cost and output cost in a compact way or via row details; it must not recalculate costs locally.
- REQ-007C: The Team section may include an aggregate total row/card, but only as part of the Team summary and clearly labeled as a total; it must not be the primary summary while a member is focused.
- REQ-008: The compact token/cost chip must be removed from workspace top headers for both single-agent and team workspaces.
- REQ-009: Token usage details must remain accessible through the right-side Token tab; removing the header chip must not remove or degrade the Token tab itself.
- REQ-010: The frontend must render server-owned token/cost summary fields only; it must not recalculate authoritative token totals or prices.
- REQ-011: Existing single-agent Token Meter behavior must remain functionally unchanged except for header-chip removal and shared resolver/component refactoring.
- REQ-012: The Team section UI must follow the Detailed UI Requirements section: compact per-member comparison rows/cards, focused-row indicator, per-member input/output/total tokens, estimated total cost/status, quiet no-usage/loading states, and optional subordinate team total.
- REQ-013: Implementation must include running-app visual validation with realistic token data and recorded evidence in the implementation handoff.

## Acceptance Criteria

- AC-001: Given a single-agent run is selected, the Token Meter tab displays that run's persisted/live token summary as before, and the workspace top header does not render a compact token/cost chip.
- AC-002: Given a team run with member A and member B having different persisted token summaries, when member A is focused the Token Meter headline shows member A values; when member B is focused those values change to member B values.
- AC-003: Given a focused team member is offline/completed, opening the Token tab displays that member's persisted token statistics without requiring new runtime token events.
- AC-004: Given a focused team member is selected, the Token Meter does not render a lower `Focused member`, `Member tokens`, or `Member cost` section.
- AC-005: Given a team member is focused, the secondary section is labeled `Team` or equivalent, lists member-level usage summaries, and does not reuse `Focused member`, `Member tokens`, or `Member cost` wording.
- AC-005A: Given multiple team members have different usage, the Team section shows separate rows/cards for those members with input tokens, output tokens, total tokens, and estimated total cost/status.
- AC-005B: Given aggregate totals are displayed, they appear only as a clearly labeled team total within the Team section.
- AC-006: Given team member focus changes, all Token Meter sections that are not explicitly aggregate-comparison sections come from the same selected usage subject: current prompt, gross input, output, total estimate, input breakdown, pricing details, and usage report count.
- AC-007: Given any workspace top header, token totals and estimated cost are not displayed inline in the header; users access token detail from the right-side Token tab.
- AC-008: Durable coverage verifies that team-member focus changes select the focused member summary rather than reusing the parent team summary.
- AC-009: Existing backend GraphQL run/team/member summary coverage remains valid; new backend coverage is required only if implementation changes backend API/query behavior.
- AC-010: The implemented UI visually matches the Detailed UI Requirements: clean top header, focused run detail as primary, compact Team section below, readable row labels/values, clear focused-row indication, and no confusing duplicate focused-member card.
- AC-011: Implementation handoff includes running-app visual-validation evidence with backend/server and frontend commands, data/run used, inspected focus-switch scenarios, and screenshot or equivalent artifact.

## Constraints / Dependencies

- Must use server-accounted persisted usage data as the source of truth.
- Must preserve existing backend ledger summary boundaries unless implementation discovers a missing route-key/member-run query edge.
- Must remove the header token/cost chip rather than preserving it with different data.
- Must avoid compatibility-only dual displays that keep the confusing mixed-scope behavior.
- Clean worktree test dependencies were not installed during solution-design investigation; downstream agents may need dependency setup before executing web tests.
- Implementation engineer must perform running-app visual validation for this UI change, including starting backend/server and frontend and inspecting realistic token data.

## Assumptions

- Each normal leaf team member has an associated agent run identity whose token statistics are persisted independently.
- The parent team/container aggregate is useful as a separate aggregate subject, but it is not equivalent to any focused member's run statistics.
- Existing historical member hydration can provide or fetch the focused member run identity/route key for offline members.

## Risks / Open Questions

- Need final visual design for the secondary `Team` section; it should be compact, clearly subordinate to the focused member primary summary, and useful for comparing per-member token/cost usage without overwhelming the detailed primary Token Meter.
- Subteam/task-agent-only focus cases may need explicit fallback behavior so the token subject resolver does not silently show the wrong member.
- Component tests need dependency setup in the clean worktree.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-001, REQ-002, REQ-008, REQ-009, REQ-010, REQ-011
- UC-002: REQ-001, REQ-003, REQ-006, REQ-009, REQ-010, REQ-012
- UC-003: REQ-003, REQ-004, REQ-006, REQ-012
- UC-004: REQ-003, REQ-005, REQ-010, REQ-012
- UC-005: REQ-008, REQ-009, REQ-013
- UC-006: REQ-007, REQ-007A, REQ-007B, REQ-007C, REQ-012, REQ-013

## Acceptance-Criteria-To-Scenario Intent

- AC-001 covers single-agent Token tab non-regression plus header chip removal.
- AC-002 covers the reported team member switching bug.
- AC-003 covers persisted/offline member display.
- AC-004 covers removal of the confusing duplicate focused-member subsection.
- AC-005, AC-005A, and AC-005B cover the secondary Team summary and replacement of the confusing `Focused member` card.
- AC-006 covers same-scope consistency across all Token Meter sections.
- AC-007 covers the clean-header requirement.
- AC-008 covers durable frontend regression protection.
- AC-009 covers backend/API coverage boundaries.
- AC-010 covers visual UI quality and hierarchy.
- AC-011 covers required implementation visual-validation evidence.

## Approval Status

Approved by user after adding detailed UI requirements and implementation visual-validation requirement on 2026-06-26.
