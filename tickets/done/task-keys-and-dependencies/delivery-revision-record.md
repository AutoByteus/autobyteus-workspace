# Delivery Revision Record — task-keys-and-dependencies

The latest `docs-sync-report.md`, `handoff-summary.md` and `release-deployment-report.md` remain authoritative.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | CRR-003 Pass (test-code review) after API-REV-001 Pass, from `/software_engineering_team/code_reviewer` | N/A | **Blocked — Local Fix** (`/software_engineering_team/implementation_engineer`): integrated with `e579e82b7f`, docs synced, verified from evidence. The pre-merge target refresh found `personal` advanced to `a716a4632e` (project-tool-split), and its merge conflicts in the agent-tool contract | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, this record; docs `autobyteus-web/docs/projects.md`, `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`, `autobyteus-server-ts/docs/modules/agent_tools.md`; `api-e2e-test-case-ledger.md` (snapshot reference) |
| DR-002 | CRR-005 Pass after IR-004 (Local Fix for DR-001), CRR-004 and API-REV-002, from `/software_engineering_team/code_reviewer` | DR-001 Blocked — Local Fix | **Delivery Completed**: re-verified from evidence at `c95e0138e8` (current with `origin/personal@66429d6f31`), docs re-checked, archived, finalized into `personal` with `--no-ff`, No release, cleanup | `docs-sync-report.md` (DR-002 re-check), `handoff-summary.md`, `release-deployment-report.md`, this record; ticket archived to `tickets/done/` |

## Revision Entries

### DR-001 — Initial delivery: integrated, docs synced, verified; finalization blocked by a target-side conflict

- Delivery round and trigger: first delivery round, triggered by the code reviewer's delivery handoff (CRR-003 Pass, no findings), with all changes uncommitted on `codex/task-keys-and-dependencies` at base `c600028072`.
- Triggering upstream report, verification, or evidence:
  - `api-e2e-execution-coverage-report.md` (API-REV-001 Pass, 95.6%);
  - `api-e2e-test-review-report.md` (CRR-003);
  - `code-review-report.md` (CRR-002, 9.4/10).
- Prior authoritative result: N/A
- Current authoritative result: **`Blocked`**, classification **`Local Fix`**, recipient `/software_engineering_team/implementation_engineer`.

#### What completed

- Checkpoint `d3686fd072`, then a merge of `origin/personal@e579e82b7f` (38 commits) as `97fdd0f7e2`, with no conflicts.
- Post-integration checks: server typecheck pass; server unit 5,783 passed; web unit 4,482 passed; core Projects E2E 29 passed. Gated Projects E2E: 16/17 files (see the timing suite below).
- Docs sync (`docs-sync-report.md`): three docs corrected outside the change, and a migration-guideline shape inventory recorded.
- Verification from the evidence: sufficient, with no user check needed (`release-deployment-report.md` → Verification). It applies to the `97fdd0f7e2` integrated state.
- Evidence path hygiene: the desktop snapshots are archived as `.tar.gz`, and the hygiene and licensing checks pass.
- The delivery records were committed on the ticket branch as `8d4356fb43`. That commit archived the ticket to `tickets/done/`; this record moves it back to `tickets/in-progress/`, because finalization did not happen. Nothing was pushed or merged into `personal`.

#### Why delivery is blocked

The pre-merge refresh found `origin/personal` at `a716a4632e`, 12 commits past the verified base. Among them is **project-tool-split** (`285acae39a`, merged `98e44053b7`), which adds `create_project` / `update_project` and deprecates `create_or_update_project`. Merging it into the ticket branch gave:

- **Conflicts (3 files):**
  - `autobyteus-server-ts/src/agent-tools/project-tasks/project-task-tool-contract.ts`. Both sides add module-level helpers at the same spot: this ticket's `dependsOnDefinition`, and project-tool-split's module-level `p` plus `workspacesDefinition` (it hoists `p` out of `buildProjectTaskToolSchema`). The descriptions map merged; the helper block and `buildProjectTaskToolSchema` need a combined resolution.
  - `autobyteus-server-ts/docs/modules/projects.md` (the "Exactly Five Agent Tools" section and tool table).
  - `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` (tool contract bullets).
- **Auto-merged overlaps that must be rerun:**
  - `project-task-tool-manifest.ts`;
  - `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts`;
  - `tests/e2e/projects/{project-change-feed,project-task-boundaries,project-task-context-files-delegation,task-existing-copy-assignment,task-reactivation-root-visibility}.e2e.test.ts`;
  - web `docs/projects.md`, `tests/e2e/project-manager-ux-probe.mjs`, `tests/e2e/project-manager-ux-task-locator-cases.mjs`.
- Delivery aborted the merge (`git merge --abort`). The branch is clean at the commit that holds this record.
- **Policy change on the new base** (`1c7eb70151`, `7af116e8de`): `TESTING.md` Rule 9 now reads "Fix every failure you hit; find its cause first … Never close a failure as 'pre-existing' or 'flaky' without its cause." It also removed the "known baseline exception" and "green server baseline" framing. Two failures this ticket's package treats as out of scope therefore need a cause-based disposition on the new base:
  - **`team-run-v1-production-upgrade.e2e` (FU-API-002).** The test hardcodes `afterRows` = `beforeRows.length + 4` (line 849), and this ticket's `20261017_project_task_keys_v1` adds one of the extra ledger rows. That part is caused by this ticket's migration, so under Rule 9 it is a defect in the change to fix in this branch. Fix it by deriving the expected rows from the registry. The other causes API/E2E found (ENOENT on the team v1 layout, a run start `success:false`) need a fix or a report with the cause.
  - **`task-copy-idle-lifetime.e2e` (gated).**
    - The suite failed in delivery's full gated run and in solo reruns, while the host load average was 12–131 on 10 cores from other agents' vitest runs.
    - Failure points: Antigravity model discovery timed out; scripted tool-result waits timed out; a process stop took 41 s against a 15 s bound; and one shutdown measured 58.7 s after the step's `completed` signal, against a 59 s lower bound. The last points to a step-completion signal observed late under CPU starvation.
    - All of these are in Temp-task flows that this ticket does not change. API/E2E's quiet-host comparison passed 1/1 on both base and ticket.
    - Delivery's diagnosis is CPU-starved timing, not this change. Under the new Rule 9 the owner should confirm the cause on a quiet host and either fix the test's measurement or report it with the cause.

#### Next

- Requested fix (implementation):
  1. Merge `origin/personal` (≥ `a716a4632e`) into `codex/task-keys-and-dependencies`.
  2. Resolve the three conflicts, keeping both behaviors. `depends_on` and keys stay on `create_task` / `update_task`; the docs describe the combined tool set (`create_project`, `update_project`, deprecated `create_or_update_project`, and the Task tools with keys and `depends_on`).
  3. Rerun the overlapping unit/E2E suites and the TKD cases on the merged state.
  4. Dispose of the two Rule-9 items above.
- After that comes the usual review/validation chain, then delivery re-verifies and finalizes (DR-002).
- Release decision is unchanged: No release (guide default).
- Terminal return to `/solution_designer`: `Not yet eligible`
- Terminal return message/reference: —
- Remaining blockers, rollback concerns, or untested scope: the blocker above; rollback caveat in `release-deployment-report.md`.

### DR-002 — Re-verify the integrated state and finalize (No release)

- Delivery round and trigger: second delivery round, revisiting DR-001 (Blocked — Local Fix). The trigger is the code reviewer's delivery handoff after IR-004 (merges of project-tool-split and remove-nested-task-team, plus three baseline fixes), CRR-004 (source delta Pass), API-REV-002 (Pass, 95.6%, every case rerun at `c95e0138e8`) and CRR-005 (test review Pass, no findings).
- Triggering upstream report, verification, or evidence:
  - `api-e2e-execution-coverage-report.md` (round 2);
  - `api-e2e-test-review-report.md` (CRR-005);
  - `code-review-report.md` (CRR-004);
  - `implementation-handoff.md` (IR-004).
- Prior authoritative result: DR-001 `Blocked`, `Local Fix`.
- Current authoritative result: **`Delivery Completed`**.
- What changed against DR-001:
  - Integration:
    - The branch is current with `origin/personal@66429d6f31` (0 behind at DR-002 start), so delivery integrated nothing new.
    - No delivery-side rerun was needed: the working-tree source equals `c95e0138e8`, where API-REV-002 reran every case by impact.
  - DR-001's blockers are resolved:
    - The project-tool-split conflict is resolved in `6c1fa46436`. The combined tool contract keeps `create_project`, `update_project` and the deprecated `create_or_update_project` beside keys and `depends_on`, and LIVE-001 exercised it with a real model.
    - Rule 9: this ticket's part of `team-run-v1-production-upgrade` is fixed in-branch by `fa49138794`. The other failures have causes and owners outside this ticket (FU-API-002, FU-API-004, FU-API-005; `TESTING.md` `45291d105f`).
  - Docs: re-checked on the merged state, with no further edits (`docs-sync-report.md` → DR-002 Re-Check).
  - Verification: re-done from the round-2 evidence; sufficient, with no user check (`release-deployment-report.md` → Verification).
  - Release decision: `No release`, the guide's default; nobody asked for a release.
- Docs sync report: `docs-sync-report.md`
- Handoff summary: `handoff-summary.md`
- Release/publication/deployment report: `release-deployment-report.md`
- Terminal return to `/solution_designer`: sent after the push and cleanup (see the terminal message).
- Terminal return message/reference: `send_message_to` → `/software_engineering_team/solution_designer`
- Next recipient/action: Solution Designer verifies the receipt and returns `Terminal` to the delegating `/project_task_manager`.
- Remaining blockers, rollback concerns, or untested scope:
  - Blockers: none.
  - Rollback caveat: see the release report.
  - Untested: a desktop migration I/O fault.
  - Follow-ups for the Task manager:
    - `generated/graphql.ts` regeneration;
    - FU-002–FU-004 (design);
    - FU-API-002, -004 and -005.

#### DR-002 Finalization Result

- Ticket-branch delivery commit: `2726d03f2b` on `codex/task-keys-and-dependencies` (local; never pushed, per `RELEASE.md`).
- Target re-check: `origin/personal` was still `66429d6f31` at merge time, so it had not advanced after verification and needed no re-integration.
- `finalize/task-keys-and-dependencies` from `origin/personal@66429d6f31`: `git merge --no-ff` → `1b108514cb`. The merge tree is identical to the verified ticket tree (`git diff --quiet codex/task-keys-and-dependencies HEAD`).
- Checks on the merge:
  - `check_repository_artifact_hygiene.py`: passed;
  - `check_licensing.py`: "Licensing is consistent.";
  - no `*/dist/` paths in the merge diff.
- Re-fetch before push: `origin/personal` unchanged. Pushed `66429d6f31..1b108514cb HEAD -> personal`.
- Release: none (No release). No tag, pipeline or version bump; `autobyteus-web/package.json` stays `1.5.5-beta.2`.
- Repository finalization status: `Completed`.
- Cleanup: worktree removal, prune, local branch deletion and receipt export follow this record's push; confirmed in the terminal message.
