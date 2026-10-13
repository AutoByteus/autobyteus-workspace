# Handoff — Architecture Design Complete

- Package identifier: `delegated-launch-config-defaults`
- Result classification: `Architecture Design Complete`
- Current solution revision: `SR-004` (revision for architecture review ARCH-REV-001; earlier submission SR-003)
- Classification: `task_size=Large`, `architectural_risk=High` (rationale in `design-spec.md` → Task Size And Architectural Risk)
- Applied handoff rule: "Architecture Design Complete with task_size=Large or architectural_risk=High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`
- Date: 2026-10-12

## Original Request

A Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`): respect the runtime/model defaults configured on agent, team and Org definitions (`defaultLaunchConfig`) everywhere an agent or team is started, including delegated copies and collaborators, instead of always inheriting the starting run's runtime and model.

The user's example: with Codex / Sol 6.1 set on the Implementation Engineer and Code Reviewer, a Software Engineering Team that the PM delegates runs them on that. Runtime/model routing (Task `project_task_871c0af0-1467-4741-bf74-7acc0629882d`) is out of scope.

## Goals And Approved Behavior (summary; authority is requirements-doc.md)

- **Priority order** (DEC-001, chosen by the user):
  - Agent's own default → its team's default → inherited from the run root.
  - Runtime, model and settings are taken as one unit from one layer.
  - Workspace and auto-approve come from the starting run.
- **Usability:** a layer is usable only if it names both runtime and model, the runtime is available, the model is offered and its settings are valid. Otherwise the next layer is used, with a note visible in the delegation/bring-in result and in Settings. If nothing is usable, the delegation fails as today.
- **User-started teams and Orgs:** the launch form seeds each member from its own default. The top selection applies only to members without their own default (DEC-009, user-confirmed). What the form shows at Run is what runs.
- **Snapshots:** values are recorded when a copy or collaborator starts. Older runs restore unchanged.
- **Settings:** a read-only section lists collaborators and delegated copies with runtime, model, source and notes.

## Approval Basis

- `requirements-doc.md` status `Approved` at `SR-002`; approval by the user on 2026-10-12 in the Solution Designer conversation ("I trust your reasoning…").
- DEC-009 re-confirmed by the user after a worked example ("Thanks, you made a very, very good judgment… Please continue.").
- No behavior-defining supplements.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults/tickets/in-progress/delegated-launch-config-defaults/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults/tickets/in-progress/delegated-launch-config-defaults/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults/tickets/in-progress/delegated-launch-config-defaults/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults/tickets/in-progress/delegated-launch-config-defaults/solution-revision-record.md`
- Supplements: None
- Prior review artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults/tickets/in-progress/delegated-launch-config-defaults/design-review-report.md` (ARCH-REV-001, round 1, Fail; reviewed basis SR-001..SR-003);
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults/tickets/in-progress/delegated-launch-config-defaults/architecture-review-revision-record.md`.
- Product Design artifacts: N/A — not applicable

## Workspace Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults`
- Branch: `codex/delegated-launch-config-defaults`
- Base: `origin/personal` @ `beb6b3b494779eba207feac94a70cb050db7dcbc` (fetched 2026-10-12)
- Finalization target: `origin/personal`
- Ticket artifacts are uncommitted in the worktree.

## Key Design Points For Review

- **One resolution owner:**
  - `CollaboratorLaunchResolver`, inside `CollaboratorAdmission`, serves all three non-user entry paths (bring-in, catalog copy, task-owned helper).
  - It replaces `CollaboratorRunnabilityValidator`.
  - It checks availability only for configured layers; the inherited layer is validated as today.
- **Persisted data:**
  - Decision: `Directly Usable — No Migration`.
  - New fields are optional, with truthful absence (member launch absent = the team's; source absent = not recorded), per the migration guideline §3.
- **Contracts:**
  - Optional DTO fields in `autobyteus-collaboration-stream-contracts` and `autobyteus-team-stream-contracts`.
  - Optional `launch_notes` on the strict `DelegateTaskResultSchema`.
  - `send_message_to` notes are appended to `message`.
- **Single meaning of a recorded member's launch:** `effectiveMemberLaunchConfiguration` replaces seven inline spreads.
- **Web:** one pure seeding function for fresh team/Org/mobile starts, and a read-only Settings section.

## Response To ARCH-REV-001 (SR-004)

- **AR-001:**
  - Contract-package effective-member functions (`teamMemberLaunchConfiguration`, `collaborationMemberLaunchConfiguration` + source variants) are used by all four `agentSourceSelectors.ts` functions and by the Settings rows.
  - The web sweep found no other site.
- **AR-002:**
  - Notes come only from fresh admission (`catalogTaskSource`, `ensure`, a newly dispatched helper).
  - Only the catalog branch puts them on the placement.
  - `dispatchTaskCopy` is the single `delegate_task` attachment point.
  - Task-owned helper notes flow `ensureTaskHelper` → `taskScope.bringIn` → `MessageRecipientResult` → `appendLaunchNotes` in the three deliveries.
- **AR-003:**
  - Draft-held pinned addresses plus `normalizeMemberOverride(…, { pinnedModel })`; pinned rows count as customized.
  - The pin is released by model reset, row reset or Reset all.
  - Mobile gets an async apply in its controller and needs no pin.
  - Sub-case decided: a seeded row set to the parent's model stays pinned until Reset, within REQ-010 and DEC-009; rows without their own default are unchanged.
- **Housekeeping:** requirements Document Status and AC-002 wording (editorial).
- Details: design-spec.md → Revision Notes; solution-revision-record.md → SR-004.

## Open Risks / Uncertainty

- UNK-001 (bounded): an installed but unauthenticated Codex/Claude runtime is not detectable before start. It surfaces as a run error at the first turn. This is within the approved Out of Scope.
- DEC-006: application launch baselines keep the opposite order. This is a follow-up candidate.
- Scenario IDs: SCN-001..SCN-008 (all `Supported Normal` except SCN-003 `Supported Explicit Edge`).

## Expected Output / Next Action

Independent architecture review of the cumulative package. On Pass, follow the reviewer's routing to implementation. On Fail/Blocked with Design Impact, Requirement Gap or Unclear, return to Solution Designer.
