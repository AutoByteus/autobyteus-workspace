# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Design-ready for implementation
- Investigation Goal: Determine the minimal UI code change needed to move task-team member focus rows before long task content without adding new visual noise.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: One Vue component template order change plus focused test updates; no backend/API/state model change.
- Scope Summary: Reorder existing task-team member focus rows in the Team tab Tasks detail pane.
- Primary Questions To Resolve:
  - Where are active task detail and member focus rows rendered?
  - Does the current UI already have separate task selection vs focus behavior?
  - How does the waiting notice appear?

## Request Context

User observed that task-team members are shown at the bottom of long task content in the Team tab Tasks section. The user wants the UI to remain clean and professional, with no redundant "Focus targets" text; the existing member focus rows should simply be organized earlier in the detail pane.

Reference screenshots supplied by user:
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3a909f88ecf641479b02e72dcc92dab1/solution_designer_4e0df553802c4e359b6d9a04121aee73/context_files/ctx_69fcf689bf93__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_3a909f88ecf641479b02e72dcc92dab1/solution_designer_4e0df553802c4e359b6d9a04121aee73/context_files/ctx_d57fce449794__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-active-task-member-order`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-active-task-member-order/tickets/done/team-active-task-member-order`
- Current Branch: `codex/team-active-task-member-order`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-active-task-member-order`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded from original checkout before worktree creation.
- Task Branch: `codex/team-active-task-member-order`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Original checkout had unrelated untracked files; authoritative work is in this dedicated worktree.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-29 | Command | `git remote -v && git branch --show-current && git symbolic-ref refs/remotes/origin/HEAD` | Resolve repo/base context | `origin/HEAD` points to `origin/personal`; current branch was `personal`. | No |
| 2026-06-29 | Command | `git fetch origin --prune` | Refresh remote refs before creating worktree | Succeeded. | No |
| 2026-06-29 | Command | `git worktree add -b codex/team-active-task-member-order /Users/normy/autobyteus_org/autobyteus-worktrees/team-active-task-member-order origin/personal` | Create dedicated task worktree | Worktree created at latest `origin/personal`. | No |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Inspect current active task detail layout | Header/status/focus and waiting notice render before markdown; member rows render after markdown; technical details render last. | Implement reorder here. |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/TeamActiveTaskRow.vue` | Inspect task navigator row | Left navigator selects tasks and shows references; not target for this reorder. | No |
| 2026-06-29 | Code | `autobyteus-web/utils/teamActiveTaskEntries.ts` | Verify source of `members` | `deriveActiveTaskEntries` populates task-team `members` via `flattenMembers`; task agents have no member rows. | No |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Inspect existing unit coverage | Tests already cover member focus rows as primary controls and explicit focus event emission. | Update/add order assertion. |
| 2026-06-29 | Code | `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Inspect workflow coverage | Existing tests verify member focus still routes message target correctly. | Run after implementation. |
| 2026-06-29 | Code | `TeamActiveTasksSection.vue` `isWaitingStatus` | Answer user question about waiting notice | Notice appears when status label matches `/waiting|approval|input|action/i`, e.g. `Awaiting review`. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Team tab -> Tasks section -> selected task detail in `TeamActiveTasksSection.vue`.
- Current execution flow: Active team context -> `deriveActiveTaskEntries` -> selected entry -> detail pane template renders selected task fields and controls.
- Ownership or boundary observations: `TeamActiveTasksSection.vue` owns active task detail presentation and emits selected focus route keys. Store focus routing remains outside this component.
- Current behavior summary: Task-team member focus rows are functional but placed below potentially long task markdown, making them hard to discover.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect
- Refactor posture evidence summary: Existing component boundary and state flow are correct; only intra-template ordering is wrong for discoverability.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TeamActiveTasksSection.vue` | Member focus rows are already in same selected task detail owner. | No new owner/subsystem needed. | Move rows. |
| `TeamFocusSendWorkflow.spec.ts` | Focus events already integrate with active context/message send flow. | Behavior must be preserved, not redesigned. | Run/update tests. |
| User clarification | No extra labels or copy; only order changes. | Keep UI clean; avoid new text. | Enforce in requirements/tests. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Active task Tasks section presentation, selected task detail, emits member focus selection | Directly contains member rows below markdown. | Modify here only unless tests need updates. |
| `autobyteus-web/components/workspace/team/TeamActiveTaskRow.vue` | Left task navigator row and reference selection | Not responsible for selected task member controls. | No change expected. |
| `autobyteus-web/utils/teamActiveTaskEntries.ts` | Derives active task entries and task-team members | Data already available as `selectedEntry.members`. | No data change needed. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Component unit coverage | Tests can assert DOM order and no behavior regression. | Update. |
| `autobyteus-web/components/workspace/team/__tests__/TeamFocusSendWorkflow.spec.ts` | Cross-component focus/send workflow | Existing coverage should keep passing. | Run targeted if feasible. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-29 | Static probe | Visual review of supplied screenshots | Member focus rows appear below long task content, requiring scrolling. | Reorder rows above description. |

## External / Public Source Findings

No external sources used.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Existing Vue Test Utils tests can validate template behavior without backend.
- Required config, feature flags, env vars, or accounts: None identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Git worktree creation above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

The existing template order is the root cause. Member focus rows belong with early task controls, before the long markdown body. No store, API, or data derivation change is necessary.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatibility path needed; this is a clean UI order replacement.
- Existing data-test selectors should be preserved where possible.
- The task detail still needs to keep reference preview mode behavior unchanged.

## Open Unknowns / Risks

None blocking.

## Notes For Architect Reviewer

This is intentionally scoped as a local UI order change. There is no proposed subsystem or state-management refactor.
