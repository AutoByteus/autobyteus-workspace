# Handoff — Architecture Design Complete — task-part-of

- Classification: `Architecture Design Complete`; `task_size=Large`, `architectural_risk=High`.
- Package: `task-part-of`; Project Task `autobyteus-171` ("Task relationships, step 2: a "part of" relationship between Project Tasks").
- Current solution revision: `SR-005` (requirements `Approved` at SR-004; design `Ready`).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of`, branch `codex/task-part-of`.
  - Base: `origin/personal@cba6b851227352d6bcefd5a8543ef8e5ba9f550d` (v1.5.6-beta.8).
  - Finalization target: `origin/personal` (RELEASE.md).
  - Ticket artifacts are in `tickets/in-progress/task-part-of/`; they are not committed yet.

## Original request and approval

- The user's direction (via the Project Task Manager, 2026-10-19): add "part of" next to `depends on` so a bigger Task shows its parts and how many are done. Keep it small, follow step 1's design language, and add no graphs, automatic status changes or notices unless the user asks.
- The user's decisions (2026-10-19, in the Solution Designer's conversation):
  - one parent, from the same Project;
  - one level only;
  - closing the last part leaves the parent;
  - setting the parent to DONE / CANCELLED sets its open parts the same way;
  - deleting a parent leaves its parts without a parent;
  - no backward-compatibility code; the desktop app and nodes are assumed on the same release.
- UI: the user approved the Product UI/UX spec `task-part-of` on 2026-10-19 ("approved").

## Package

- Requirements: `requirements-doc.md` (SR-004): UC-001–UC-007, REQ-001–REQ-019, AC-001–AC-020, SCN-001–SCN-011, DEC-001–DEC-019, QR-001, QR-002, QR-004, QR-005.
- Investigation notes: `investigation-notes.md` (architecture findings AF-001–AF-009).
- Design: `design-spec.md` (SR-005).
- Solution revision record: `solution-revision-record.md` (SR-001–SR-005).
- Behavior-defining supplement: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-part-of/ui-ux-spec.md` (Approved) with `visual-references/` VIS-001–VIS-017. Design repository `personal@c406879` (integration `10207c6`).
- Prior review artifacts: `N/A — not applicable` (first review of this package).

## Classification evidence

- Large: three areas (server Projects, GraphQL / feed / tool contracts, web Projects UI), about 35 files.
- High:
  - changed agent-tool contract (`part_of`, `partOf`, `parts`, `closedParts`, descriptions);
  - GraphQL and feed fields;
  - a one-level concurrency invariant under the shared per-Project relations lock;
  - a cascade where one `update_task` closes several Tasks and stops their task agents (CM-6).
- Persistence: `Directly Usable — No Migration` (optional field whose absence truthfully means no parent).

## Points worth the reviewer's attention

- The cascade sits in the shared `update()` body. It runs after the parent commits, closes parts one at a time through the same close path, and contains a failing part (log and skip); the result lists the closed parts (DS-003, QR-005).
- `TaskDependencyWrites` is renamed and generalized into `TaskRelationWrites`. Create with a parent takes the lock (DS-001, DS-008).
- GraphQL update: omitted keeps, null clears; to be pinned by a test (AF-007).
- Tool clear value `part_of=""` (not null).

## Open risks

- Tool-description wording affects agents; the Project Task Manager's own skill update is FU-001.
- Mixed versions are unsupported by the user's decision.

## Next expected action

Independent architecture review. On Pass, the reviewer routes to implementation per its rules. On findings, they return to the Solution Designer.

## Route applied

`get_handoff_rules`: "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
