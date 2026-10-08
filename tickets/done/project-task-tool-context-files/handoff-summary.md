# Handoff Summary — Project Task Tool Context Files

## Current Delivery State
- Package `project-task-tool-context-files`; `/software_engineering_team/delivery_engineer`; **DR-001: waiting for user verification**, 2026-10-08.
- `task_size=Medium`, `architectural_risk=High`. The reviewed route was kept: ARCH-REV-001 Pass → CRR-001 Pass (9.4/10) → API-REV-001 Pass (95.6%) → CRR-002 Pass.
- Revisions: SR-002 (requirements) / SR-003 (design) / ARCH-REV-001 / IR-001 / CRR-001 / API-REV-001 / CRR-002 / DR-001.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files`, branch `codex/project-task-tool-context-files`, HEAD `a7b57e0ce`. Docs-sync edits and delivery artifacts are not committed yet.
- Finalization target: `personal` (`origin/personal`).

## What Changed (user-facing)
Agents can attach files to a Project Task. `create_or_update_task` (native and MCP) takes an optional `context_files` list of absolute local file paths, both when creating and when updating a Task. The server copies each file into the Task's saved context. The copy shows in the Task page's Context Files like a UI upload (with image preview) and stays after the original is deleted. A later `delegate_task({task_id})` hands the copies to the worker as Reference files.
- Additive only: agents cannot remove or replace files.
- The upload policy is the same as the app's: type by extension, at most 25 MiB.
- All or nothing: any invalid entry fails the call, naming the path, and changes nothing (not even DONE).
- Tasks with no Project reject files.
- The result includes `attachedContextFiles` only when files were attached.

## Integration And Validation Basis
- Checkpoint `c16eba271`: commits the reviewed API/E2E tests and the review/validation artifacts before the base refresh. This is not finalization.
- Integration: merged `origin/personal` @ `a0ded874b` (17 new commits since base `4a51482a5`) into the ticket branch as merge `a7b57e0ce`. Clean, no conflicts, and **no file overlap** with this ticket's changes.
- Post-integration reruns on `a7b57e0ce` (logs in `delivery-evidence/`):
  - `pnpm build` (server): exit 0. `tsc -p tsconfig.build.json --noEmit`: exit 0.
  - `vitest run tests/unit/projects tests/unit/agent-tools tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts`: 53 files, 443/443.
  - `vitest run tests/unit/api`: 28 files, 107/107. The 6 failures seen on the old base are fixed by the integrated `dc70e7f44`.
  - `vitest run tests/e2e/projects` (ungated): 26 passed, 19 skipped as gated, 0 failed.
  - The same suite gated (`RUN_AGY_FAILURE_E2E=1` with the fixture CLI and env isolation): 44 passed, 1 skipped, 0 failed. CTX-E2E-002 and CTX-E2E-003 pass. CTX-E2E-001 passes within the boundaries suite (10/10). The 1 skip is the opt-in `RUN_CLAUDE_E2E` case in `task-reactivation-root-visibility`, which is unrelated.
- Upstream API-REV-001: BV-001 browser check rendered the agent-attached screenshot and its preview on the Task page after the sources were deleted (`api-e2e-evidence/bv-001-task-page.png`).

## Docs Sync
`docs-sync-report.md`: **Updated**
- `autobyteus-web/docs/projects.md`: added the `context_files` contract and fixed the stale "no Task attachment tool" line.
- `TESTING.md`: added the context-file cases and the gated delegation suite command.
- `autobyteus-server-ts/docs/modules/projects.md` and `agent_tools_mcp_server.md` were already updated in `741b05131` and were checked as accurate.

## User Verification Requested (AC-010)
The user needs to run this in the app, built from this branch:
1. In a Project, ask an agent that has the Project tools to create a Task (or update one) and attach a screenshot you pasted. Its path is under `/private/tmp/...`. The agent passes it in `context_files`.
2. Open the Task page. The screenshot is listed in Context Files with an image preview.
3. Delete the original file under `/private/tmp`, then reload the Task. The file and its preview are still there.
4. Optional: delegate that Task with `delegate_task({task_id})`. The worker's first message lists the saved copy under Reference files.

Then reply with the result and a release decision: finalize only, or finalize and publish a new version.

## Residual Risks (accepted / non-blocking)
- RSK-001: the file type comes from the extension only. `.ts`, `.js`, `.yaml`, `.py`, `.sh` and extensionless files are rejected (DEC-001).
- RSK-002: the server copies any file it can read, at the same trust level as `delegate_task.reference_files`.
- If a copy fails partway, an empty `context/` folder or copies no record refers to can be left behind. The UI upload path behaves the same way.
- `project-task-service.ts` has 440 non-empty lines, close to the 500-line limit.
- No real model has used `context_files` yet. Only scripted-actor and unit evidence exists.
- Pre-existing, out of scope: the server `typecheck` script fails with TS6059 (rootDir).

## Finalization Plan (after verification)
Archive the ticket to `tickets/done/`, commit and push the ticket branch, merge into `personal` and push. Release only if the user asks. Then remove the worktree and the local branch. The untracked `autobyteus-application-*/dist/` folders are build output and will never be committed.

## Rollback
Revert the merge on `personal`. No data rollback is needed. Files that were already attached remain ordinary Task context files that users can remove in the app.
