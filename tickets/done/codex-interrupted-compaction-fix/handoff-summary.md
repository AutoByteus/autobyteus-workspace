# Delivery Handoff — Awaiting User Verification

DR-001. Medium / Low, direct low-risk route. Solution SR-002, implementation IR-001, validation API-REV-001 (Pass, 95.1%). Independent architecture, source and test-code review: N/A — not applicable.

## Candidate
- Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix, branch `codex/codex-interrupted-compaction-fix`, HEAD 69b0493f2 (implementation).
- The fresh fetch shows origin/personal still at 03d5db06b298fd8301a96c6a0e195427b69034d6, the bootstrap base. The branch is already current, with no merge and no checkpoint needed.
- Optional rerun passed: server unit 34/34 (codex-compaction-abandon, codex-agent-run-backend, raw-trace-to-historical-replay-events), server src typecheck, web agentStatusHandler.spec.ts 26/26.
- Uncommitted until finalization: API/E2E durable tests (codex-interrupted-compaction.e2e.test.ts, agentStatusHandler.spec.ts), delivery docs (codex_integration.md, TESTING.md), and the ticket folder.

## Behavior delivered
- When a Codex compaction is interrupted (Stop), its turn fails, Codex errors, or the app server dies, the same compaction row now changes from COMPACTING to FAILED with the reason. Before this fix it stayed "started" forever.
- The failed close comes before the turn or error event and never archives. The next compaction completes with exactly one archive.
- Reopened history shows one failed row and no stuck "started" row.
- Terminate waits for the active turn, so a running compaction simply finishes.
- Completed Codex compactions, rotation and dedupe are unchanged, and so are the other runtimes (REQ-C04).

## Validation evidence (API-REV-001)
- 350 unit tests pass; the 4 codex-tool-log-correlation failures also fail on the base.
- Live codex-cli 0.160.0: interrupt 4/4, app-server SIGKILL 4/4, terminate 3/3.
- Packaged desktop app, Codex GPT-5.6-Luna with a lowered auto-compaction limit:
  - Stop during compaction gave a FAILED row with the reason within 0.3 s, twice.
  - After restart and reopen, history showed the FAILED rows and no started row.
  - On disk: 3 archives for 3 completed compactions.
- Regression sweep: 1,918 tests, 0 new failures (66 pre-existing). Web 30/30.

## User verification checklist
Uses your Codex login and quota (a few turns). To make compaction happen quickly, lower Codex's auto-compaction limit for the test instance only, as validation did.
1. Start this worktree's build:
   `cd /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix && pnpm --silent isolated-app start --from-worktree`
   The start output prints a `dataRoot`. Add this line to `<dataRoot>/server-data/.env` (the value replaces the full argument list, so keep `app-server` first):
   `CODEX_APP_SERVER_ARGS_JSON=["app-server","-c","model_auto_compact_token_limit=20000"]`
   Then run `pnpm --silent isolated-app restart` and create a Codex agent run. Stop it afterwards with `pnpm --silent isolated-app stop`.
2. Send a large message (~40K tokens; any long pasted text). Then send a short message: the next turn starts with an automatic compaction. Press Stop while the row shows Compacting. Expect the same row to change to Failed with a reason, quickly, and no duplicate row.
3. Send another short message. The next compaction should complete normally (Completed).
4. Restart the app and reopen the run. Expect the failed row (shown as "Provider context compaction failed"), no row stuck on Compacting, and the run continues.
Reply "works, finalize" (and say whether a release is wanted), or describe what failed. You may also choose to finalize on the automated evidence.

## Known non-blocking observations (possible solution_designer follow-ups)
- OBS-1: Terminate waits for the active turn, so the `run_terminated` close is defensive only (now documented).
- OBS-2: reopened history shows "Provider context compaction failed" without the reason. This predates the ticket, and the Claude ticket has the same reader gap.
- Not testable live: a manual Codex compaction (AutoByteus never starts one), a turn completing or failing with an item still open, and a model-side compaction failure. These are covered by unit tests and replay only.
- Validation ran on macOS only, and the live runs used the operator's Codex quota.

## Remaining gates
User verification is pending. Not done yet: archiving, the final commit, pushing, merging into origin/personal, and cleanup. Finalization target: origin/personal. No release is authorized unless requested. Before merging, delivery will fetch the target again and re-integrate and recheck if it has moved.

## Authoritative package (relative to this ticket directory)
requirements-doc.md, investigation-notes.md, solution-revision-record.md, design-spec.md, solution-handoff.md, probes/, implementation-handoff.md, implementation-revision-record.md, api-e2e-coverage-investigation.md, api-e2e-execution-coverage-report.md, api-e2e-revision-record.md, api-e2e-test-case-ledger.md, api-e2e-evidence/, docs-sync-report.md, handoff-summary.md, release-deployment-report.md, delivery-revision-record.md.

## DR-002 — Finalization and beta release authorized
On 2026-10-05 the user replied "the task is done. finalize and release a new beta" to the verification request. This is explicit delivery acceptance and authorization to finalize and publish a beta; no manual checklist result is claimed.
The post-acceptance fetch shows origin/personal unchanged at 03d5db06b298fd8301a96c6a0e195427b69034d6, so no re-integration, rerun or renewed verification is needed. Ticket archived to tickets/done/codex-interrupted-compaction-fix before the final commit. Release notes were added as the archived functional summary.
Beta method: `bash scripts/desktop-release.sh beta`, run after target finalization in a task-owned clean `personal` clone. Next unused beta: 1.4.94-beta.5. This section supersedes the earlier verification hold.
