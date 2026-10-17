# Handoff Summary — task-keys-and-dependencies

> **Status (DR-003): finalized into `personal` and released as beta `v1.5.5-beta.3` (complete: 17 assets, Docker `1.5.5-beta.3` / `beta`). The user's check in the app is pending.**
> - The delegating Task asks for a beta and the user's check; DR-002 had wrongly recorded No release.
> - See `release-deployment-report.md` and `delivery-revision-record.md`.

## What Shipped

- **Readable Task keys.** Every Project Task has a permanent key `<prefix>-<number>` (`autobyteus-42`).
  - The prefix comes from the Project name: lower case, Latin diacritics removed, `-2`/`-3` added on a collision.
  - The prefix survives a rename, and a deleted Project's prefix is retired.
  - Numbers are never reused.
  - The long `taskId` stays the stored identity.
- **"Depends on".** A Project Task stores `dependsOnTaskIds`: Tasks of the same Project, with no self-reference and no loops.
  - The UI derives "Blocked by", "Dependency cancelled", "Depends on" and "Required by".
  - Dependencies only inform: nothing is blocked by them.
  - Deleting a Task drops it from its dependents.
- **UI.**
  - Board cards show the key and a badge.
  - The Task page and the right-panel Task view show a key chip with copy and a Dependencies card.
  - New / Edit task has a dependency picker.
  - The Workspaces-tree Task summary reads "<key> <summary>".
  - Task pages use key URLs; old long-ID URLs open the Task and switch to the key URL.
- **Agents.** For a Project Task, the key is the agent-facing Task ID.
  - `list_project_tasks`, `create_task` and `update_task` return keys; `delegate_task`, `update_task` and `depends_on` accept a key (any letter case) or the long ID.
  - `create_task` / `update_task` take `depends_on`.
  - Refusals and assignment texts name Tasks by key, or "a deleted Task".
- **Upgrade.** The startup migration `20261017_project_task_keys_v1` keys released data once.
  - Tasks are numbered in creation order.
  - It cannot lock the user out: a Project that cannot be keyed stays hidden, and a restart retries it.
  - It adds one ledger row.

## Classification And Route

- `task_size=Large`, `architectural_risk=High`; route: Reviewed (ARCH-REV-003 → IR-003 → CRR-002 → API-REV-001 → CRR-003).

## Integrated State (DR-002, final)

- Integrated base: `origin/personal@66429d6f31`, which includes project-tool-split and remove-nested-task-team. IR-004 merged it (`6c1fa46436`, `08ce2f0483`); ticket HEAD is `c95e0138e8`.
- Checks at `c95e0138e8` (API-REV-002, every case rerun by impact):
  - server typecheck: pass; server unit: 5,811 passed; architecture: 44 passed;
  - web unit: 4,473 passed, 0 failed;
  - core Projects E2E: 11 + 6 + 14 passed;
  - gated `tests/e2e/projects`: 17/18;
  - both web probes, desktop DSK-001..006 and LIVE-001 (Claude Haiku 5.5) passed, including a model's `update_project` rename that kept the key prefix.
- Rule 9 dispositions, each with its cause:
  - `team-run-v1-production-upgrade`: this ticket's part (the ledger count) is fixed in-branch by `fa49138794`. The remaining 3/4 come from `20260901_agent_org_flat_team_families_v1` writing an AgentOrg tree; owner: that migration.
  - `task-copy-idle-lifetime`: fixed timers and probe limits under CPU contention, documented on base in `TESTING.md` (`45291d105f`) and reported to the idle-shutdown and AGY discovery owners.
  - PMU-021 once: a file-explorer socket `onerror` during `page.reload()`; owner: file explorer.

## Integrated State (DR-001, superseded)


- Bootstrap base: `origin/personal@c600028072`.
- Latest base integrated at delivery: `origin/personal@e579e82b7f` (38 commits), merged into `codex/task-keys-and-dependencies`.
  - Checkpoint `d3686fd072`, merge `97fdd0f7e2`, no conflicts.
- Post-integration checks, all on the integrated state; logs in `evidence/delivery/`:
  - server prebuild and typecheck: exit 0;
  - server unit: 713 files, 5,783 tests passed, 0 failed;
  - web unit: 632 files, 4,482 tests passed, 0 failed. The pre-existing `RightSideTabs.workspaceTarget` failure (FU-API-001) was fixed by base commit `ebf5ca614c`;
  - server Projects E2E (GraphQL, startup migration, tool boundaries): 29 passed;
  - gated server Projects E2E folder (scripted runtime): 16 of 17 files passed (83 tests).
    - The timing suite `task-copy-idle-lifetime` failed under heavy host load (load average 60–130 on 10 cores, from other agents' test runs).
    - In alternating runs alone it failed on the base `e579e82b7f` 2/2 and passed on the integrated state 1/2. The failures were load timeouts (model discovery, tool-result waits, process-stop bounds) on Temp-task flows this ticket does not change.
    - Judged load-related and pre-existing in nature, not a regression. See `release-deployment-report.md`.

## Verification

- Verified from the evidence, with no user check needed:
  - every critical acceptance criterion is directly proven (API/E2E 95.6%; no category below 90%);
  - the upgrade of data written by the released 1.5.5-beta.1 build added only key fields, and a restart changed nothing;
  - the packaged-app journeys have screenshots matching the approved design;
  - one real-model run used keys only.
- Details: `release-deployment-report.md` → Verification.

## Release

- Beta `v1.5.5-beta.3` (DR-003), as the delegating Task's "Done when" asks. DR-001 and DR-002 wrongly said No release.
- The change ships with the next beta or stable release, which is available on request.
- DR-002 re-confirms No release: neither the request nor the handoff asks for one.
- Server and web must ship together: new required fields, the strict `/ws/projects` schema and key URLs. A single tag already ships both.

## Delivery-Side Changes

- Docs sync: the web routes table, the MCP tool contract (`agent_tools_mcp_server.md`) and the `delegate_task` `task_id` note (`agent_tools.md`). See `docs-sync-report.md`.
- Three desktop data snapshots (`evidence/desktop/dsk-00{1,2,6}-*-projects/`) are archived as `.tar.gz`, keeping the same files. Their UUID paths ran past the 200-character checkout limit.
- Migration guideline check: the base changed the guideline today (`8a970f214c`). The released-shape inventory and its fixture mapping are recorded in `docs-sync-report.md`, and every shape is covered.

## Known Limits And Follow-Ups (outside this ticket)

- `autobyteus-web/generated/graphql.ts` was hand-edited for this ticket's fields only; it should be regenerated.
- FU-002–FU-004 (design spec); FU-API-002 (`team-run-v1-production-upgrade.e2e`, pre-existing); FU-API-003 (PMU-008 probe fixture). FU-API-001 is resolved on base.
- OBS-001–004: non-blocking UI observations, listed in the execution report.
- Rollback: revert the merge on `personal` and cut a new release. Data from this build stays readable by older builds, because the added `taskKey`, `taskKeys` and `dependsOnTaskIds` fields are inert to the released readers. Updates never downgrade.
