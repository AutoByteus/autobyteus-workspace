# Handoff Summary — DR-004 User-Verification Candidate

## State
**Ready for user verification. Delivery is Blocked only on explicit user verification.** Classification: **Large / High / Reviewed**.
- Basis: REQ-BL-009 (SD-AP-003) / SR-023+SR-024 / ARCH-REV-010+011.
- Package: IR-014 `e94d83538`.
- Gates: CRR-027 Pass 9.3, CRR-028 re-baseline, API-REV-020 Pass 95, CRR-029 Pass, CRR-030 Pass, API-REV-021 Pass 95.00% (broader validation Required, completed), CRR-031 Not Applicable (Pass).
- Superseded: the DR-002 candidates `ccb5fbe3`/`4b04d9097` will not be finalized.

## Candidate
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation`, branch `codex/project-task-manager-linked-delegation`, HEAD `e94d83538d9eae39cb34c99457e8a4f260a3afbb`.
- Latest-base refresh: origin/personal is `fc79fad14`, already merged (IR-014). There are no conflicts or pending merges.
- Delivery checks on HEAD: production `tsc` exit 0; focused units 35 files / 351 tests passed. Evidence: `delivery-evidence/dr-004/checks.md`. API-REV-021 is the executable validation of this exact HEAD: a real desktop upgrade from the released app, Agent/Team/Org DONE fences, restart, delete, Q-3 and rendered UI.
- Docs: 8 long-lived docs were resynced to REQ-BL-009, and they remain uncommitted. See `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/docs-sync-report.md`.

## What Changed For The User
- **Projects storage moves once to per-Project folders on first start.** The original file is kept as `projects.pre-folders.json`. Until the migration completes, only Projects shows "Projects data is being upgraded; restart the app to finish". Everything else works.
- **Task-side records.** Each Task records the agent runs started for it in `tasks/<taskId>/agent_run_resources.json`. Execution trees carry no Task data.
- **DONE.** DONE (set by the Project Task Manager) closes that Task's runs forever and stops exactly them. The Manager, other Tasks and borrowed runs keep running. Repeating DONE retries the stop. Nothing about shutdown is saved.
- **Manager reads.** `list_project_tasks` shows each Task's current assignments, or "assignments unavailable" if its run file is damaged.

## Please Verify
You can use the visible instance **`iso-50993-65ad`** that API-REV-021 left running for you. It runs the `e94d83538` build and holds test data only. Alternatively, build this worktree fresh with `pnpm --silent isolated-app start --build`, using disposable data and never your installed app.

1. Open Projects: the migrated Projects and Tasks render, including Task files.
2. In Chat, use the Project Task Manager to assign a saved Task to an Agent or Team, and check that IN_PROGRESS is set.
3. Have the Manager set DONE. Only that Task's workers go offline. The Manager and other work keep answering.
4. Reopen the Task: nothing restarts. A new delegation lists only the new assignment.

Reply **"verified"**, or describe the issue you see. After verification, Delivery will:
- re-fetch the target, and reintegrate and recheck if it has advanced;
- commit with explicit paths only;
- archive the ticket;
- merge into and push origin/personal;
- ask API to stop `iso-50993-65ad` and remove its data root (on your word);
- clean up the worktree and branch.

Release, tag and deploy were not requested.

## Known Limits (non-blocking)
- **O-1:** the gated `projects`/`project` GraphQL queries carry no `extensions.code`. No consumer reads it.
- **Error alerts:** verified at payload level only.
- **Outside this ticket:** delegated copies that reply by address reach a new instance. This is a pre-existing behavior, already reported to you.
- **Foreign instance:** `iso-52633-5c91` predates this round and is left untouched.
