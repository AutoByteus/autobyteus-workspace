# Delivery / Release / Deployment Report — project-tool-split

## Release / Publication / Deployment Scope

- Finalize `codex/project-tool-split` into `origin/personal` with no release. The change ships with the next beta.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` @ `c57ab71c90` (2026-10-13)
- Deviations from the guide and why: `None`
- Proposed guide fixes, and whether the user agreed: `None`

## Handoff Summary

- Handoff summary artifact: `tickets/done/project-tool-split/handoff-summary.md`
- Handoff summary status: `Updated`
- Delivery revision record: `tickets/done/project-tool-split/delivery-revision-record.md`
- Current delivery revision ID: `DR-001`

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `8a970f214c`
- Latest tracked remote base reference checked: `origin/personal` @ `e579e82b7f`
- Base advanced since bootstrap: `Yes` (14 commits: delegated-team-aggregate-status web work; additive `HOLD_TURN` mode in `tests/fixtures/agy-failure-cli.mjs`; a doc paragraph in `projects.md` in a different section)
- New base commits integrated into the ticket branch: `Yes`
- Local checkpoint commit result: `Completed` (`7458738938`, the untracked API/E2E and review artifacts; `*/dist/` excluded)
- Integration method: `Merge` (`1e8d2b601d`, no conflicts)
- Integration result: `Completed`
- Post-integration executable checks rerun: `Yes` (logs in `evidence/delivery/dr-001/`)
  - `pnpm install --frozen-lockfile`: Pass
  - `pnpm -C autobyteus-server-ts build`: Pass
  - `pnpm -C autobyteus-server-ts typecheck`: Pass
  - `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts test:unit`: 709 files, 5745 tests pass, 7 gated skips
  - `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> vitest run tests/e2e/projects`: 16/17 files, 81 pass, 4 skipped. Every file covering this change passes.
- Post-integration verification result: `Passed` for this change. One unrelated failure (below).
- Delivery edits started only after the integrated state was current: `Yes`
- Handoff state current with the latest tracked remote base: `Yes` (rechecked before the final merge; see Repository Finalization)

### Unrelated E2E failure (TESTING.md Rule 9)

- File: `tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts`. This ticket does not change it, and its agents use no Project tool.
- In the full run, the team and org `terminate` calls failed with `fetch failed`.
- Run alone with temporary cause diagnostics (since reverted), it failed in three ways:
  - `AGY_MODEL_DISCOVERY_TIMEOUT`: the `agy --help` probe has `SHORT_PROBE_TIMEOUT_MS` = 3 s;
  - a 60 s manager tool-result wait expired;
  - an org shutdown was measured at 57.9 s against a 59 s floor.
- Host load averages were 58–138 on 10 cores, from other agents' builds and test runs.
- Cause: CPU saturation delays process start and the client-observed timings this test asserts. The file passed in both of API/E2E's branch runs.
- At the user's direction, delivery stopped investigating. The user said another ticket is fixing the E2E test errors.

## Verification

- Evidence judged: `Sufficient`
- Evidence relied on:
  - `api-e2e-execution-coverage-report.md` (API-REV-001): 95%, no category below 90%, every critical AC directly proven.
  - Delivery opened the evidence for the critical ACs:
    - `app-new/journey/APP-NEW.json` (AC-001/002/007): the served descriptions, create and update results, and the three error codes;
    - `APP-OLD.json` (AC-004): the old schema and description, unchanged;
    - `APP-MIX.json` (AC-005, new build): all three tools exposed and callable;
    - `REAL-NONE.json` (AC-003): Haiku 5.5 refuses and nothing is created;
    - `app-release/journey/REL-MIX.json` and `ac005-probe-release-v1.5.5-beta.2.txt` (AC-005, release): the new names are skipped with a warning, no resolver error, and the old tool only.
  - The integrated-state rerun above.
- More evidence requested: `None`
- User check needed: `No`. The Task's direction listed "the user's check in the app". Asked at delivery, the user chose to finalize on the evidence (2026-10-17: "if this ticket is done, we could finalize").
- Re-verification after later re-integration: see Repository Finalization.

## Release Decision

- Decision: `No release`
- Decided by: the user asked to finalize and did not ask for a release. The RELEASE.md default is no release. The change ships with the next beta, which matches the Task's "released with the next beta (not blocking an earlier release)". A beta or stable release is available on request; a stable release would use `tickets/done/project-tool-split/release-notes.md`.

## Docs Sync Result

- Docs sync artifact: `tickets/done/project-tool-split/docs-sync-report.md`
- Docs sync result: `Updated` in the implementation commit `285acae39a`, and verified accurate on the integrated state. Delivery made no doc edit.
- Docs updated:
  - `autobyteus-server-ts/docs/modules/projects.md`
  - `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md`
  - `autobyteus-web/docs/projects.md`

## Ticket State Transition

- Ticket moved to `tickets/done/project-tool-split`: `Yes`
- Archived ticket path: `tickets/done/project-tool-split/`

## Version / Tag / Release Commit

- None (no release).

## Repository Finalization

- Bootstrap context source: ticket branch `codex/project-tool-split` on base `origin/personal`, per RELEASE.md
- Ticket branch: `codex/project-tool-split`
- Ticket branch commit result: see `delivery-revision-record.md` DR-001
- Ticket branch push result: see DR-001
- Finalization target: remote `origin`, branch `personal`. Merged `--no-ff` from `finalize/project-tool-split` in the ticket worktree.
- Target advanced after verification: recorded in DR-001
- Repository finalization status: recorded in DR-001

## Release / Publication / Deployment

- Applicable: `No`
- Release/publication/deployment result: `Not required`
- Release notes handoff result: `Not required` (kept in the archive for the next stable release)

## Post-Finalization Cleanup

- Dedicated ticket worktree path: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split`
- Removal of the worktree and the local `codex/project-tool-split` and `finalize/project-tool-split` branches: after the delivery record is pushed, confirmed in the terminal message.
- Remote branch cleanup result: `Not required` (the pushed ticket branch stays as the reviewed record, as for earlier tickets)
- Isolated instances and temporary environments: none started by delivery. API/E2E recorded stopping its own.

## Release Notes Summary

- Release notes artifact: `release-notes.md` (What's New, Improvements, Upgrade Notes)
- Archived release notes artifact used for release/publication: not used (no release)
- Release notes status: `Updated`

## Deployment Steps

- None. This repository deploys no hosted service.

## Environment Or Persisted-Data Transition Notes

- Approved persisted-data decision: `Not Affected`
- Delivery action required: `None`
- Result and evidence: configurations naming only the old tool keep working (APP-OLD, REAL-OLD), and mixed lists work in v1.5.5-beta.2 (REL-MIX).

## Rollback Criteria

- If an agent loses its Project tool or Project results differ from before, revert the merge commit on `personal` and ship with the next release. No data or schema changes, so a revert is complete.

## Final Status

- See `delivery-revision-record.md` DR-001 for the final branch, merge, push and cleanup state.
