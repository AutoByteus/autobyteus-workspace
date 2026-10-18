# Delivery Integration Blocker — delegated-copy-own-run-memory (DR-001)

- Classification: **Local Fix**, a post-integration failure on the merged state. Recommended recipient: `/software_engineering_team/implementation_engineer`. Part of it may need `/software_engineering_team/solution_designer` (see question 2).
- Branch `codex/delegated-copy-own-run-memory`:
  - checkpoint `52f2837ca7`: the 3 durable e2e files and the ticket artifacts, committed locally;
  - merge of `origin/personal` `2d076088dd` in `1dd3cedadf`: textually clean, 38 commits incl. stable v1.5.5, the Task-keys migration `project-task-keys-v1` and the baseline repair `ec934ca753`.
  - Not pushed.
- Credential scan of the uncommitted files and the branch history: 0 matches.

## Why A Full Rerun

TESTING.md "Rerun by impact" rule 4: the merge brought in a migration (`project-task-keys-v1`), so everything is Rerun. Registry order is correct: Task keys run on project files, and `TaskAgentOwnRunV1` stays last, on the memory dir.

## Results On The Merged State (`evidence/delivery/`)

| Suite | Result |
| --- | --- |
| install, prebuild, build, nuxt prepare | pass |
| typecheck | pass |
| server unit | 5842 pass |
| web `test:nuxt` | 4473 pass |
| integration | 393 pass; 2 `agent-status-websocket` (known product defect, Task 4577620f) |
| server e2e, 161 files (clean env, scripted AGY on) | 109 pass, **5 files fail** (below) |

## Failures

1. **`app-data-migrations/team-run-v1-production-upgrade`: 3 of 4 fail, deterministic (also fail alone, `D4b-isolated-rerun.log`).** Upstream's baseline fix `dc4110b1c6` made this test pass on `personal`. On the merged state it now runs this ticket's migration:
   - "migrates the exact supported cohort" and "keeps the server healthy after failed consolidation": `assertAgentOrgPackage` (l.773) expects the Team tree's `taskExecutions` entries as full records (e.g. `settledAt`). After `20261017_task_agent_own_run_v1` they are links. This looks like a test encoding the old layout (the AC-019 kind), but it must be checked, not assumed.
   - "isolates mixed root and token warnings" (l.1471): the ledger row for `20261017_task_agent_own_run_v1` has `attempts: 2` and status FAILED ("1 task agent item(s) are not migrated yet; the next start continues.") where the test expects `attempts: 1`.
   - **Question 2:** in this fixture an earlier migration leaves a mixed root unconsolidated. Does our migration then fail on every start, forever, for data it can never move? If so, is that the intended AC-010 behavior, or should such a run be contained as unsupported (DESIGN.md rule 7)? That is a design question for the Solution Designer if the answer is "fails forever".
2. **`token-usage/token-usage-provider-name-snapshot-backfill-startup`** and **`token-usage/token-usage-custom-provider-model-value-backfill-startup`**: ledger assertions fail in the full run, pass alone (3/3, 2/2). Both passed in API/E2E's pre-merge full run (`api-e2e/R6-e2e-all.log`). Cause not established: shared state between files, possibly ledger rows from the new migration or the merged Task-keys migration.
3. **`llm-management/model-metadata-provenance-graphql`**: `SecretVaultError: SECRET_VAULT_CORRUPT` at `saveForConsumer` (test l.106) in the full run; passes alone (3/3). It passed pre-merge. Cause not established.
4. `terminal/terminal-websocket-lifecycle`: known (Task 0c7efc37), not this ticket.

TESTING.md rule 9 requires a cause for every failure, so items 2 and 3 need one before they can be called not this ticket's.

## What Delivery Needs Back

- Item 1 fixed on the merged branch (test update or migration fix), with the answer to question 2.
- Causes for items 2 and 3.
- The full server e2e green apart from known Tasks, then re-validation through the team's usual route.

Delivery-owned work already done and committed with this record:
- release-notes.md, which states the one-way upgrade (DEC-006);
- docs check: the implementer's docs and the merged `collaboration_model.md` / `agent_team_execution.md` are consistent; no stale copy-in-host memory paths remain.
