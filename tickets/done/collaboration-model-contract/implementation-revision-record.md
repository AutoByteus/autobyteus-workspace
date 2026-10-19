# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the initial baseline and any later delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer pass of `collaboration-model-contract` (ARCH-REV-002), round 1 of implementation | N/A | `Initial Baseline` | SR-001..SR-003, ARCH-REV-001, ARCH-REV-002; CRR-*, API-REV-*, DR-* `N/A` | Implemented and locally checked; routed to Code Review (Large / High) |
| IR-002 | Code reviewer, `code-review-report.md` (CRR-001, Fail, round 1) | CR-001 | `Local Fix` | CRR-001; SR/ARCH-REV unchanged | Dead helper-path APIs and unused imports removed; no behavior change; returned to Code Review |

## Revision Entries

### IR-001 — Two-relationship collaboration model: own-Team refusal, resolution-only messaging, collaborators removed, startup conversion

- Triggering role, report path, and round: architecture_reviewer, `design-review-report.md` / `architecture-review-revision-record.md` (ARCH-REV-002, Pass), implementation round 1.
- Triggering finding IDs: N/A (the review findings ARCH-F-001..ARCH-F-004 were resolved upstream in SR-003; this implementation carries their outcomes: 9-collaborator inventory, AC-011 sourceless-copy stamping, DEC-008 own-Team depth, CM-6 exception).
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: the worktree `collaboration-model-contract` (branch `codex/collaboration-model-contract`, base `origin/personal` 8878625d94) at the commit named in `implementation-handoff.md`.
- Related solution revision IDs: SR-001, SR-002, SR-003
- Related architecture-review revision IDs: ARCH-REV-001 (Fail), ARCH-REV-002 (Pass)
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: first complete implementation of the approved design.
- Approved behavior or requirement IDs affected: REQ-001..REQ-007; AC-001..AC-011; BEH-001..BEH-012; DEC-005..DEC-008; CM-1..CM-6.
- Implementation delta (summary; detail in `implementation-handoff.md`):
  1. One CM-1 rule: `resolveDelegationPlacement` asks a new `isOwnTeamAddress` port of the three execution indexes (DEC-008) and raises `COLLABORATION_SELF_TARGET_REJECTED` with `send_message_to` guidance before any placement, preparation, Task link or allocation. The three per-root self checks and the "teammate copy hosted inside the delegator's Team" placement (`task-copy-host.ts`) are gone; new copies are always root-hosted, restore of stored Team-hosted copies is kept (DEC-006).
  2. `resolveMessageRecipient` only resolves (own team instances, then standing run-wide placements); otherwise `COLLABORATION_TARGET_NOT_FOUND` with `delegate_task` guidance. Catalog bring-in, the Task helper path (`task-scoped-message-recipient.ts`, identity allocator, admission queue) and `CollaboratorAdmission.ensure` are removed; stored `broughtIn` Task records stay readable (DEC-007).
  3. The collaborator concept is removed end to end: tree types/schemas/mutators, execution-index kinds, hosting registries (`team-root-collaborator-hosting`, `team-root-collaborator-agent-registry`, `collaborator-team-execution-registry`, `collaborator-handle-preparation`), restore, events (`collaborator_added`, `COLLABORATOR_ADDED`), stream DTOs and the rebuilt contract packages, GraphQL, web rows/Settings/disclosure, memory-explorer kinds and Token Meter. Catalog machinery (`@`, `list_available_agents`, eligibility, launch resolver) stays under its current names (FU-1).
  4. New startup-only migration `20261015_collaborators_to_delegated_runs_v1` (registered last): frozen released-entry validation, AC-011 source stamping, tree-only conversion to unowned root-level delegated runs, atomic write with re-read by the current store, six dispositions.
  5. Texts: `agent-team-collaboration-llm-contract.ts` (hash-pinned), `standalone-collaboration-instruction.ts`, the `list_available_agents` description and the `@` note presence comment now state the model; `prompt_engineering.md` embeds the regenerated block.
  6. Docs: module docs mechanics rewritten for the new model (agent_communication, agent_orgs, agent_team_execution, standalone_agent_run_root, agent_tools, run_history incl. the migration, projects, token_usage, agent_definition and others) and the web docs; the published `collaboration_model.md` keeps the CM-1 "any depth" sentence.
- Changed files or areas: 329 files (≈250 server src/tests, contract packages `src/`, `dist/` and `tests/`, web source/tests/docs) plus the new migration folder `autobyteus-server-ts/src/app-data-migrations/migrations/collaborators-to-delegated-runs-v1/` and its tests `autobyteus-server-ts/tests/unit/app-data-migrations/collaborators-to-delegated-runs/`.
- Local validation and result: see `implementation-handoff.md` ("Local Implementation Checks Run"). Server typecheck clean; server unit 5499 pass (one unrelated timing test flaky); integration 373 pass (two known baseline cases fail); contract packages 16 + 27 + 20 pass; web 4388 pass; real-data proof on a copy of the user's data passes (7 trees, 9 collaborators).
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Large / High).
- Remaining limitations or risks: five server e2e files still describe the removed behavior and need rewriting by `api_e2e_engineer` (listed in the handoff); `native-compaction-terminal-drain.test.ts` is intermittently failing for a reason unrelated to this change; the real-data proof ran against a copy taken while the app was running (tree files are written atomically, so each file is consistent).

### IR-002 — Remove dead helper-path APIs and unused imports (CR-001)

- Triggering role, report path, and round: code_reviewer, `code-review-report.md` / `code-review-revision-record.md`, CRR-001 (Fail, Local Fix).
- Triggering finding IDs: CR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001, commit `5dd930d8be`.
- Current authoritative result: commit `44b5108b12` on `codex/collaboration-model-contract`.
- Related solution / architecture-review / API-E2E / delivery revision IDs: `N/A`
- Related code-review revision IDs: CRR-001
- Why recorded: the helper path's callers were deleted in IR-001 but its supporting APIs and some imports stayed.
- Approved behavior or requirement IDs affected: none (Removal Plan items "broughtIn join path" and "broughtIn creation"; DEC-007 read side kept).
- Implementation delta: (a) removed `RootTaskExecutionAdapter.taskExecutionAt` and its three implementations, `openTaskExecutions` from `TaskExecutionResourcePort`, `ProjectTaskService` and `TaskExecutionResourceService`, and narrowed the `broughtIn` creation variant to `delegated` in `TaskExecutionJoin`, `NewTaskExecutionLinkInput` and `linkInherited`; the `TaskExecutionRole` value and the `ROLES` set stay (stored `broughtIn` entries stay readable). (b) removed the unused imports in `agent-org-run.ts`, both task-execution adapters, `agent-team-run-manager.ts`, `token-usage-stats.ts`, plus two `TaskExecutionRole` imports that became unused. (c) web `teamExecutionTreeSelectors.ts`: parameter renamed to `tree`, alias removed. Tests: stubs and fixture methods for the removed APIs deleted; link calls with `broughtIn` now use `delegated`; the tree-scope test uses `taskExecutionTargetOf`; new test "stored legacy broughtIn entries stay readable, count as owned work and close with their Task".
- Changed files or areas: `src/agent-collaboration/execution/task/*`, `src/projects/services/*`, the three root task-execution adapters, `agent-org-run.ts`, `agent-team-run-manager.ts`, `token-usage-stats.ts`, web selectors, 7 test/fixture files.
- Local validation and result: `tsc -p tsconfig.build.json --noEmit --noUnusedLocals` reports nothing in touched files; `grep 'taskExecutionAt(\|openTaskExecutions\|"broughtIn"' src` matches only the role type and the schema; server unit + integration 5874 pass (only the 2 documented websocket baseline cases fail); web stores/services 1008 pass.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (targeted delta review).
- Remaining limitations or risks: unchanged from IR-001.
