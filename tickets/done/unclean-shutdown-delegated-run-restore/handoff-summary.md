# Handoff Summary — unclean-shutdown-delegated-run-restore

## Ticket

- Package: `unclean-shutdown-delegated-run-restore`; Project Task `project_task_08d76577-e89b-484d-9f38-cc1ed94ef95e`, requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on behalf of the user
- Classification: `task_size=Medium`, `architectural_risk=High`; route: reviewed (architecture review, source review CRR-001, API/E2E API-REV-001, test-code review CRR-002)
- Revisions: SR-002, IR-001, CRR-001 (Pass, 9.4/10), API-REV-001 (Pass, 95.5%), CRR-002 (Pass), DR-001
- Archived ticket folder: `tickets/done/unclean-shutdown-delegated-run-restore/` on `personal`

## What Changed

- **The defect.** After a power loss, a run's `raw_traces_active.jsonl` can end with zero bytes or a torn record. The restore check read it strictly and called the run `indeterminate`, so a delegated Team could not be woken ("… its saved conversation is unavailable (indeterminate); it cannot be restored."). The store's own repair cut the file by decoded characters, which is wrong on multi-byte text.
- **One line rule** (`autobyteus-ts/src/memory/store/jsonl-log-file.ts`), on bytes: edge zeros/whitespace are absent; a line with interior zeros is damage; only the damaged end (after the last complete record) is ever cut. Other damage is `JsonlLogDamagedError` ("line N of <file> is damaged").
- **Store** (`RunMemoryFileStore`): cuts the damaged end byte-exact, with one warning (file, bytes removed, records kept; no content), when a log is opened for use and before the first append per file path (`jsonlLogEndsCleanly`, ≤64 KiB tail scan, full-repair fallback). Whole-file replacements (active log rewrite, archive segment, manifest, snapshots) go through `replaceFileDurably` (fsync + rename + folder fsync).
- **Restore check** (`AgentConversationActivityInspector`): uses the shared reader read-only; a damaged end is ignored; other damage is `indeterminate` with a plain-words reason.
- **Refusal** (`taskExecutionConversationUnavailable`), used by the Team, AgentOrg and standalone adapters: names the Agent/Team, its coordinator, the reason and the next step. The member-activation error (`COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE`) includes the reason. **Error codes are unchanged; the user-visible text changed.**
- **Tests:** unit tests for the rule, repair, durable replace, inspector, refusal, planner, writer; new gated lifecycle E2E `autobyteus-server-ts/tests/e2e/projects/unclean-shutdown-delegated-team-restore.e2e.test.ts` (three server processes, SIGKILL crash, damage, restart, continue, second restart; red on base 5/5). Baseline fix: an explicit timeout for the folder-watcher "appears later" test (TESTING.md Rule 9).
- **Docs:** `autobyteus-server-ts/docs/modules/agent_memory.md`, `autobyteus-ts/docs/agent_memory_design.md`, `autobyteus-server-ts/docs/modules/agent_team_execution.md`; ticket design spec DS-002/Guidance corrected to the reviewed append guard.
- **User data (DEC-008):** the user approved and did the repair of his real node file (cut at byte 359,207) outside the code change. No test touched his node or data.

## Integration

- Checkpoint commit `1666175c51` (review records), then merge of `origin/personal` @ `8b15c5a274` (mcp-run-session-cleanup, search-model-settings, `1.5.7-beta.2` version bump) → `af350d65ee`. No conflicts, no overlapping files, lockfile unchanged.
- Checks on `af350d65ee`, all Pass (`evidence/DLV-01-*`): server typecheck (builds shared packages); core store tests 53/53; server focused tests 48/48; server prebuild + build; new lifecycle E2E 5/5 on the rebuilt server (bytesRemoved 1241/32/33, USR-4 refusal, USR-5 0 warnings on the third server); delegation-forest restore E2E 3/3.

## Verification

- Judged from the evidence; no user check needed. Details in `release-deployment-report.md`.

## Release

- `No release` (RELEASE.md default; not requested). The fix is user-visible and matters for the user's Docker node; `release-notes.md` is ready, and a beta (next after `v1.5.7-beta.2`) can be cut on request.

## Follow-ups

- **FU-001** (per-append sync): consider syncing raw-trace appends after measuring latency, to shrink the window of lost local traces after a power loss.
- **FU-002** (display readers): make `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` (`readJsonl`, `readRawTracesActiveSnapshot`) use the shared reader so display and restore agree. Also: their "Skipping malformed JSONL line" warning includes a snippet of the damaged line's content (raw `0x00`, or the start of a torn record, which may hold conversation text). Evidence: `evidence/API-01-unclean-shutdown-e2e-server-output-excerpt.log` lines 370–378.
- **FU-IMP-001** (pre-existing on base, unrelated): architecture guard `tests/architecture/application-framework-boundaries.test.ts` fails because `agent-memory-explorer-service.ts:53` calls `AgentDefinitionService.getInstance(` (added by `3e3a7b08cc`). Evidence: `evidence/IMP-09-server-architecture.log`. Owner: the SR-011 guard's owner.
- Follow-ups go to the agent that manages the project's Tasks: `/project_task_manager`, the requester named in `requirements-doc.md`.
