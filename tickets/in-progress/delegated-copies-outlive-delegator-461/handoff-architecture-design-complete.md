# Handoff: Architecture Design Complete

- Result: `Architecture Design Complete`
- Package identifier: `delegated-copies-outlive-delegator-461`
- Task: `autobyteus-461` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Current solution revision: `SR-009`
- Date: 2026-11-10
- From: Solution Designer. To: architecture reviewer (rule: Architecture Design Complete with `task_size=Large` or `architectural_risk=High`).

## Original request and how it changed

The Task asked that stopping an agent that delegated Tasks must not stop the runs it delegated to, with a simple rule for their reports. On 2026-11-10 the user decided in the Solution Designer's conversation:

1. A message to a stopped run wakes it (the platform's standard rule).
2. Not a fix of what Stop covers, but the structure: "we should start to refactor in this ticket … put the data model correct and then the upper layer source code should reflect the data model"; "we always start with the contract".
3. The contract `target-collaboration-contract.md` (revision 2), after its validation on his stored data: a delegated run is an ordinary run with a back-link; the delegating run keeps a link; each run owns its life; the Task owns the work. His decisions: no cascade on Stop (TC-1); a delegated run whose delegating run was deleted is listed as a run of its own (TC-3); delivery in steps (TC-4): this ticket = delegations made from a standalone agent run; the Task record's sub-work role is `subWork` (TC-6).
4. The design direction: "I think that makes sense what you have proposed", including that a delegated run's model is changed in its own Settings.

## Goals of this ticket

Requirements `REQ-001 … REQ-012`, acceptance criteria `AC-001 … AC-015` (AC-006 retired). In short: for delegations made from a standalone agent run, the delegated agent or team is an ordinary run under its own root, reached through a link; Stop, settings, archive and delete are the ordinary run features; messages wake; the Task rules are unchanged; existing data is converted by one startup migration; delegations made from team runs and org runs keep today's hosting until their own Tasks (FU-003, FU-004; removal of the remaining hosting code FU-005).

## The design in short (`design-spec.md`)

- A standalone root's task adapter has two paths today: hosted (this node) and linked (a peer). The hosted path is removed for the standalone root; a target on this node is linked through the same link owner, endpoints and channel interface, with a new in-process channel for this node (D-1, D-2).
- The link machinery loses the word "remote" (`execution/links`, `RunLinks`, `LinkedRun…`, `LinkChannel`) (D-3).
- A delegated run is created as a prepared standalone run or a created team run with `delegatedFrom`, with the launch the delegating side resolved (D-4).
- The Task record keeps `hostRoot` in this step with one meaning, "the root that runs it" (the run's own root for an independent run); it is removed when nothing is hosted (D-5, FU-005).
- Listing: delegated runs are history rows; the top-level lists leave out a linked run whose delegating run is stored; nested rows come from the delegating run's view of its links (D-8, D-11).
- One startup migration (D-9, the migration plan and the guideline checklist in the spec).
- Classification: `task_size=Large`, `architectural_risk=High` (several subsystems; an ownership-boundary change; a migration of existing runs; wire and stored renames).

## Approval state

- Requirements: `Approved` at `SR-007` (the user for the direction and DEC-001, DEC-010, TC-1, TC-3, TC-4, TC-6; the Solution Designer within the direction for the rest).
- Contract: revision 2, approved by the user.
- Design direction: approved by the user (recorded in the design spec's approval basis). No further user question is planned before the build.

## Evidence and its limits

- Current behavior of Stop: reproduced by the existing unit tests (investigation notes, Runtime findings).
- The contract's data level: measured on the user's stored data, read-only (`evidence/data-model-validation/counts-2026-11-10.txt`).
- The design: from reading the code; nothing was run on the target shape. Read in part only: `projects/services/task-execution-resource-service.ts`, the history catalog services, the web files below `stores/agentRunCollaborationStore.ts`. The file lists of the spec's File-Level Completion come from searches at `aae0a53a81`.
- No temporary diagnostics were added to any code.

## Open risks for the review

- REQ-009 is a wide surface (saved Task and files through a link, follow-up Task, same-Task messages by run ID, the delegator by address and in `list_available_agents`, token roll-up, the Task page's locator). The design names each (notes F-3, spec D-6, C-1, C-5); a capability that cannot be served through a link is a `Requirement Gap`.
- Cross-root delivery on one node: two roots' gates and logs in one message (QR-002).
- The interim state: team and org roots keep hosting (also for the members of a delegated team run, notes F-5), so two delegation forms exist in the code until FU-003 and FU-004, each used by a different kind of delegating run.
- The migration: every source shape needs a fixture (the checklist's item 3); a nested link moves between two trees.
- The web change replaces a central part of the standalone run's view.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461`
- Branch: `codex/delegated-copies-outlive-delegator-461` (documents only so far; not pushed)
- Base: `origin/personal` at `aae0a53a81d136c733580841e16669961665a762`
- Finalization target: `origin/personal`; release separately, on the user's word.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/`

## Documents

- `requirements-doc.md` (SR-007, Approved)
- `target-collaboration-contract.md` (revision 2, approved; behavior-defining)
- `investigation-notes.md` (source log, data validation, architecture findings F-1 … F-6, supplement inventory)
- `design-spec.md` (SR-009, Ready)
- `solution-revision-record.md` (SR-001 … SR-009)
- `follow-ups.md` (FU-002 … FU-005; FU-001 withdrawn)
- `evidence/data-model-validation/validate_delegation_shapes.py`, `counts-2026-11-10.txt`
- Prior review artifacts: none (no review has run on any revision).

## Expected next action

Independent architecture review of `design-spec.md` against the approved requirements and the contract. On Pass: implementation by the handoff rules. Requirement, design or unclear findings return to the Solution Designer.

## Route applied

`get_handoff_rules` (2026-11-10): "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
