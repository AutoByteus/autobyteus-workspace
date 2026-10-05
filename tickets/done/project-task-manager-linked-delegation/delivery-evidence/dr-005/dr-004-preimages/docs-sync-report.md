# Docs Sync Report — DR-004

## Scope / Result
**Updated; docs synchronization Pass.** Overall Delivery is **Blocked: waiting for explicit user verification**. This is not Delivery Completed.
- Basis: REQ-BL-009 (SD-AP-003; replaces REQ-BL-008 where they differ), SR-023/SR-024, ARCH-REV-010/011.
- Classification: **Large / High / Reviewed**.
- Candidate: `e94d83538`, the IR-014 merge of origin/personal `fc79fad14` into `b6755585a` (IR-013 + API-REV-020 test delta).
- Gates: CRR-027 source Pass 9.3, CRR-028 FAPI-012 re-baselined, API-REV-020 Pass 95, CRR-029 Pass, CRR-030 integration Pass, API-REV-021 Pass 95.00% (broader validation Required, completed), CRR-031 Not Applicable (Pass).
- Integrated state: a fresh fetch shows origin/personal is still `fc79fad14`, which is already in HEAD. Delivery-owned checks passed before the docs were edited: production `tsc` exit 0; focused units 35 files / 351 tests. Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/delivery-evidence/dr-004/checks.md`.
- Pre-images: DR-002 docs content is in stash `76b8fd003` and `superseded-docs.tgz`. The DR-003 report is in `delivery-evidence/dr-004/dr-003-preimages/`.

## Why Long-Lived Docs Changed
Before this ticket, the docs described the released single-array `projects.json` with "No Migration". They also said there was no Manager, linkage or Task stop effect. The DR-002 edits then described a model that SR-023/SR-024 replaced: a `taskLifetimes` row, execution-tree `taskLifetime` stamps, and persisted cleanup state. Both are wrong for the shipped source. The current source is primary truth. Approved requirements, design and the review/API reports support it.

## Docs Updated
All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/`.

| Doc | What it now says |
| --- | --- |
| `autobyteus-server-ts/docs/modules/projects.md` (canonical) | Per-Project/Task folder layout (`ProjectsLayout`). Tolerant readers and exact writers; Delete keeps `agent_run_resources.json`. The STARTUP_ONLY `20261005_projects_per_folder_v1` migration, the retained `projects.pre-folders.json`, and the existence-only Projects-only `PROJECTS_MIGRATION_PENDING` gate. **The CRR-027 frozen-copy obligation.** The `agent_run_resources.json` schema (role assigned/delegated/broughtIn, assignedBy, hostRoot, agentRun, linkedAt, start/startError, closedAt) and its rules. The Q-3 damaged-file policy. `list_project_tasks` current assignments or `assignmentsUnavailable` (Q-2). Link-before-resources. N2 owned-sender rejection. DONE close-then-stop with nothing persisted and repeat-DONE retry (Q-1). The single composition binding `compositions/project-task-agent-resource-composition.ts`. The O-1 known gap. The new test inventory. |
| `TESTING.md` | Regression commands, now including the migration unit test and the Projects e2e. Startup-migration e2e coverage across both entrypoints, plus its rebuilt-dist prerequisite. Explicit staging (`dist/`, `electron-dist/`). The frozen-copy rerun obligation. Evidence-layer limits, including the real desktop upgrade. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Task-free execution trees. Ownership only on the Task side via `TaskAgentResourcePort`. Closed forever across restart and Delete. Stop failures not persisted, with repeat-DONE retry. N2. |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | The Org tree is Task-free. `broughtIn`/`delegated` belong to the same Task. DONE stops only that Task's runs. |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | The standalone tree is Task-free. The host is the recorded `hostRoot`. The same close/stop contract. |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | The four-step owned-sender resolution order. Unowned agents are never checked. CONFLICT/CLOSED/UNAVAILABLE fences. |
| `autobyteus-server-ts/docs/modules/run_history.md` | Trees carry no Task information, and Task records survive Delete. The recursive strict public DTO projection is kept; stamp wording is removed. |
| `autobyteus-web/docs/projects.md` | Agent run resources wording. Assignment fields and `assignmentsUnavailable`. Migration-pending and damaged-file errors on existing surfaces only: the web UI has no status mutation, so DONE errors reach the user via the agent's tool result. |

Verification: 80 relative links and anchors resolve, with 0 bad, including the renamed anchor `projects.md#saved-id-delegation-and-agent-run-resources`. `git diff --check` is clean. A grep of the 8 docs finds no remaining `taskLifetime` or `execution-lifetimes` wording, except the migration's description of the known dev residue.

**Reviewed, no change:**
- `DESIGN.md`, AGENTS.md files and `docs/design/data_migration_guideline.md`: the generic rules already cover this migration. The ticket-specific obligation is recorded in projects.md and TESTING.md.
- `prompt_engineering.md` and `electron_packaging.md`: no change.

**Design vs. source note:** design-spec says "a DONE from the Projects UI shows the existing red alert". The source has no UI or GraphQL status mutation (`project-tasks.ts`: "deliberately no status mutation"), so the docs follow the source. This is documentation only; it is not a behavior change.

## Removed / Replaced Understanding
- Replaced: the single-array `projects.json` with "Directly Usable — No Migration".
- Replaced: the `{taskLifetimes}` row, execution-tree `taskLifetime` stamps, and persisted pending/failed cleanup receipts.
- Replaced: the old `assignments` shape (root kind/ID, `ingressAgentRunId`, `dispatchOutcome`).
- Replaced: the old context paths `task_context_files/` and `task_context_drafts/`.
- Removed owner files from the docs: `project-task-execution{,-state}.ts`, `project-task-runtime-release.ts`, `project-{metadata,state}-schema.ts`, `project-task-context-layout.ts`.

## Not Committed
The 8 docs are uncommitted and will be committed with explicit paths at finalization, after user verification.
