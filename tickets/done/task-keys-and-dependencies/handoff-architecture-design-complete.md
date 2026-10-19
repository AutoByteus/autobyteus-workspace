# Handoff — Architecture Design Complete (task-keys-and-dependencies, SR-003)

## Result

- Classification: `Architecture Design Complete`, revision `SR-003`.
  - SR-001 passed ARCH-REV-001.
  - SR-002 failed ARCH-REV-002.
  - SR-003 resolves AR-001 to AR-004 and accepts REC-005 and REC-006; see "SR-003 Corrections" in `design-spec.md` and the SR-003 entry in `solution-revision-record.md`.
- SR-003 summary:
  - AR-001: "no long ID" covers Task-ID fields and texts; saved-context paths and locators keep their stored form.
  - AR-002: `delegate_task` stays Project-only (`resolveProjectTaskReference`); the Temp-ID branch is used for `update_task` only.
  - AR-003: `useProjectTaskPage` is the single resolver of the route reference; detail and editor use the canonical `task.taskId` (switched uses listed).
  - AR-004: a deleted Task is named "a deleted Task"; FU-004 recorded.
  - REC-005: refusal order stated, with a test.
  - REC-006: case-insensitive key matching.
- `task_size: Large`, `architectural_risk: High`. SR-001's reasons apply: migration, GraphQL / feed contract, allocation and loop concurrency. SR-002 adds a changed agent-facing tool contract across the agent-tools and collaboration Task-execution boundary.
- Route (from `get_handoff_rules`): `/software_engineering_team/architecture_reviewer` (Large or High).

## What Changed In SR-002 (user-approved 2026-10-17)

The user asked to make the Task ID itself meaningful. My recommendation, which the user agreed to: keep the stored long ID, and make the key the one ID users and agents see and use.

1. REQ-018: agent tool results show a Project Task's key as `taskId`. No long Task ID appears in results. Agent-facing texts (existing-copy assignment message, refusals, undelivered-work text) name Tasks by key. Temp tasks keep their ID.
2. REQ-019: every Task-ID input (`update_task task_id`, `delegate_task task_id` in both modes) accepts the key or the long ID.
3. REQ-020: `create_task` / `update_task` take `depends_on` (keys or IDs) through the SR-001 validation; results and `list_project_tasks` show `dependsOn` as keys.
4. REQ-003 revised: prefixes of deleted Projects stay reserved (`retired-task-key-prefixes.json`), so an old key never reaches a different Task.
5. REQ-022: Task page and Edit URLs use the key; long-ID URLs still open the Task and are replaced by the key URL.

Design: the "SR-002 Extension" section of `design-spec.md`.
- D-REF: one resolver, `ProjectTaskService.resolveTaskReference`.
- D-PORT: `resolveAssignment` returns `taskId` and `taskReference`; the lifecycle resolves first and uses canonical IDs inward.
- D-TOOL-OUT / D-TOOL-IN / D-TEXT / D-DESC / D-RETIRED / D-URL / D-DOC: tool results, tool inputs, texts, descriptions, reserved prefixes, URLs and docs.

## Original Request

- From `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-17: implement readable Task keys and "depends on" from the approved design.
- Done when:
  - keys and dependencies work as designed;
  - existing Tasks are keyed;
  - dependencies are validated and never loop;
  - an isolated Electron check with a test data package, with evidence;
  - tests, a beta release, and the user's check.

## Approval Basis

- Requirements `Approved` at SR-002 by the user (quotes in `requirements-doc.md` Document Status and SR-002). SR-001 parts were approved within the direction.
- UI behavior: Product `ui-ux-spec.md`, approved by the user 2026-10-17; unchanged by SR-002.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/investigation-notes.md` (see "SR-002 Investigation")
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/design-spec.md` (see "SR-002 Extension")
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies/tickets/in-progress/task-keys-and-dependencies/solution-revision-record.md`
- Prior review: `design-review-report.md`, `architecture-review-revision-record.md` (same folder; ARCH-REV-001 on SR-001). REC-001 to REC-004 are still valid implementation guidance.
- Product UI/UX spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-keys-and-dependencies/ui-ux-spec.md`

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-keys-and-dependencies`, branch `codex/task-keys-and-dependencies`.
- Base `origin/personal@c600028072`; target `origin/personal`.
- Implementation of SR-001 is in progress in this worktree (uncommitted). On 2026-10-17 the implementation engineer was told SR-002 is coming and asked not to hand SR-001 alone downstream.

## Open Risks

- Agents with old memory keep sending long IDs; they're accepted.
- Tool-description wording changes affect agent behavior.
- Mixed-version server and web is out of scope.
- If migration I/O fails, the affected Project stays hidden until the next restart retries the migration (outside the operating assumptions; data preserved).

## Follow-ups

- FU-001 is absorbed.
- FU-002: board search by key.
- FU-003: the Project Task Manager's board-file notes move to keys.

## Expected Output

- An architecture review of SR-002, focused on the extension, against the approved requirements.
- Then the configured route to implementation.
