# Architecture Design Complete

## Result Identity

- Result classification: `Architecture Design Complete`
- Package identifier: `handoff-display-label-only`
- Current solution revision: `SR-004`
- Status: `Ready for downstream implementation routing`
- Requirements state: `Approved`
- Design state: `Ready`
- Blockers: `None`

## Original Request And Goal

The user asked to improve the Agent Team and Agent Org handoff UI because each `From` and `To` identity shows a readable first row and a redundant canonical-address second row. The user then explicitly questioned whether root-slash canonical addresses are needed on either display or edit pages, confirmed that the first readable row is enough, and approved the refined behavior with: “cool. approve”.

The approved goal is to remove slash-prefixed canonical addresses from normal Agent Team and Agent Org handoff display and edit UI while preserving exact addresses internally for selection, lookup, validation, persistence, logging/technical diagnosis, coordinator resolution, and runtime routing. Readable labels must remain complete and unambiguous, including duplicate-looking and stale endpoints.

## Approval Basis

- Exact approved requirements baseline: `SR-002`
- Approval-capture revision: `SR-003`
- User approval reference: User message on 2026-09-22, “cool. approve”.
- Current design revision: `SR-004`
- Renewed approval required: `No`; architecture does not change approved intended behavior.
- Behavior-defining supplements: `N/A — the screenshots are current-state evidence only.`

## Approved Scope And Preserved Boundaries

- In scope: Agent Team detail, Agent Org detail, Team/Org handoff authoring selectors, resolved selected-endpoint previews, long/duplicate-looking labels, and stale/unavailable endpoint feedback.
- Required visible outcome: Existing endpoint-type icon plus one readable identity row; no user-facing rooted canonical address. Long labels wrap or otherwise retain their complete accessible text. Collisions receive only minimal non-rooted readable placement context.
- Preserved exactly: Endpoint eligibility, exact internal address values, From/To direction, Team coordinator delivery, `When` conditions/order, validation, draft/save behavior, serialization, persistence, runtime routing, localization behavior, keyboard/screen-reader semantics, and responsive layout usability.
- Out of scope: Address syntax/data changes, API/backend changes, new address inspector/copy workflow, redesign of overall cards/actions/empty states, and unrelated exact-address surfaces.

## Architecture Result

The existing shared `HandoffManager.vue` remains the single owner for all four Team/Org view/edit surfaces. It will derive separate From/To maps from exact address to user-facing display label:

1. Unique supplied labels remain unchanged.
2. Colliding labels receive the shortest humanized non-rooted placement suffix that makes them unique.
3. A shortest literal segment suffix is used only when `_`/`-` humanization still collides; the full rooted address is never rendered.
4. The same derived label is used in native selector option text, selected previews, and read-only cards.
5. `EndpointIdentity` removes its address paragraph and ellipsis truncation, rendering only the icon and a wrapping complete label.
6. Stale addresses are converted to a readable non-rooted hierarchy for localized feedback, with a localized generic fallback if no safe segment exists.
7. `option.address`, `EditableHandoff.fromAddress/toAddress`, public component props/emits, converters, parent projections, persisted definitions, and runtime consumers remain unchanged.

No new subsystem, shared type, service, store, API, compatibility branch, migration, or parent-specific fork is introduced.

## Target Change Inventory

- Modify: `autobyteus-web/components/collaboration/handoffs/HandoffManager.vue`
- Modify: `autobyteus-web/components/collaboration/handoffs/__tests__/HandoffManager.spec.ts`
- Modify: `autobyteus-web/localization/messages/en/handoffs.ts`
- Modify: `autobyteus-web/localization/messages/zh-CN/handoffs.ts`
- Add/move/delete production files: `None`
- Persisted-data transition: `Not Affected`

## Verification Intent

- Focused component tests must prove visible Team/Org view and edit text omits rooted addresses while native option values and emitted handoff payloads retain exact canonical addresses.
- Cover ordinary, hierarchical, duplicate-looking, post-humanization-collision, long-label, stale/unavailable, and Simplified Chinese cases.
- Preserve existing validation, self-delivery, duplicate-pair, ordering, conditions, status, and localization assertions.
- Downstream rendered validation must inspect Team/Org detail and authoring at desktop and narrow widths, including native-select access to complete option text and wrapping with no introduced horizontal overflow.
- Tests executed by Solution Designer: `N/A — design phase only; implementation and executable validation remain downstream responsibilities.`

## Classification

- `task_size`: `Small`
- Size evidence: One existing shared runtime component, two existing locale catalogs, and one existing focused test suite; no parent callsite or contract change.
- `architectural_risk`: `Low`
- Risk evidence: The existing owner already has complete option sets and controls every requested presentation surface; the address remains the sole internal identity and public interfaces stay unchanged.
- Escalation trigger: Return to Solution Designer if implementation requires parent option changes, shared DTO changes, API/persistence/runtime changes, a new UI workflow, or if exact addresses are not unique inside a choice set.
- Independent architecture review artifact: `N/A — not applicable under the completed Small / Low classification unless the handoff rule engine selects review.`
- Prior code/API/E2E/delivery artifacts: `N/A — implementation has not started.`

## Evidence And Canonical Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/handoff-display-label-only/tickets/in-progress/handoff-display-label-only/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/handoff-display-label-only/tickets/in-progress/handoff-display-label-only/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/handoff-display-label-only/tickets/in-progress/handoff-display-label-only/design-spec.md`
- Solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/handoff-display-label-only/tickets/in-progress/handoff-display-label-only/solution-revision-record.md`
- This result/handoff file: `/Users/normy/autobyteus_org/autobyteus-worktrees/handoff-display-label-only/tickets/in-progress/handoff-display-label-only/architecture-design-complete.md`
- Agent Team screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_4aeae4517a7143308f0c1a79ac3ea040/software_engineering_team_bc51fed012964ba0bcfff2b55c2f03cb/solution_designer_c19f79c911fa40649aee31ffc36386f9/context_files/ctx_9dd6ff35f572__image.png`
- Agent Org screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_orgs/autobyteus_org_4aeae4517a7143308f0c1a79ac3ea040/software_engineering_team_bc51fed012964ba0bcfff2b55c2f03cb/solution_designer_c19f79c911fa40649aee31ffc36386f9/context_files/ctx_d96241d3fbde__image.png`

## Workspace And Finalization Context

- Repository root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Isolated worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/handoff-display-label-only`
- Task branch: `codex/handoff-display-label-only`
- Resolved base: `origin/personal` at `d883f5620a0abaed147209ad0e42a8960df70e68`
- Finalization target: `origin/personal`
- Workspace prerequisite status: `Satisfied`

## Sources And Constraints

- Primary user sources: The two supplied screenshots and the follow-up/approval conversation.
- Code evidence: Shared HandoffManager, four Team/Org callsites, handoff types/converters, AgentOrg option projection, member-role formatter, member-name validators, locale catalogs, and focused tests listed in `investigation-notes.md`.
- Governing constraint: The current request supersedes only prior always-visible canonical-address presentation in normal handoff UI; canonical addresses remain authoritative internal identities.
- Product Design package: `N/A — not requested.`

## Open Risks And Expected Output

- Open design blockers: `None`
- Residual implementation/validation risks: Browser-specific closed-select clipping, responsive wrapping, and rare humanization collisions; all have specified mitigation and verification.
- Expected downstream output: Implement the approved four-file change, run implementation-scoped checks, preserve exact address payloads, and hand off through the configured review/validation/delivery route.

## Applied Handoff Route

- Rule lookup status: `Complete`
- Selected rule: `Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low` -> direct implementation.
- Recipient: `/software_engineering_team/implementation_engineer`
- Route decision: Independent architecture review is skipped by the configured Small / Low rule; design is not skipped.
- Handoff confirmation: `Pending send_message_to invocation`
