# Handoff Summary — run-file-change-live-projection-ownership

## Status

- Delivery state: **Awaiting user verification (DR-001).** The latest base is integrated, the checks were rerun and the docs are synced. Nothing is pushed or merged.
- Classification (unchanged by delivery): `task_size=Medium`, `architectural_risk=High`. Route: full independent review (Solution Designer → Architecture Review → Implementation → Code Review → API/E2E → Code Review (test code) → Delivery).

| Stage | Revision | Result |
| --- | --- | --- |
| Requirements / design | SR-001, SR-002 | User-approved. In SR-002 the user approved finishing this ticket first; Team-member UI hydration is the next ticket. |
| Architecture review | ARCH-REV-001, ARCH-REV-002 | Pass |
| Implementation | IR-001 (`061d4698b`), IR-002 (`20258294c`, docs only) | Done |
| Code review | CRR-001/003 Pass 9.4/10; CRR-002 failure-origin (Requirement Gap, resolved by SR-002); CRR-004 test-code Pass | Pass |
| API/E2E | API-REV-002 | Pass, confidence 96% |
| Delivery | DR-001 | Base integrated; docs synced; awaiting verification |

| Item | Value |
| --- | --- |
| Worktree | `/home/autobyteus/workspace/.codex/worktrees/run-file-change-live-projection-ownership` |
| Ticket branch | `codex/run-file-change-live-projection-ownership` (local, not pushed) |
| Finalization target | `origin/personal` |
| Validated candidate | `20258294c` plus the uncommitted API/E2E tests, now committed as delivery checkpoint `bf9ec5168` |
| Integrated base | `origin/personal@1aa918298`: one commit, delivery receipts under `tickets/done/delegated-row-clean-style/` only. Merge commit `92dcb7d3d`, no conflicts, no overlap with the ticket's files. |
| Post-integration checks | `delivery-evidence/vitest-integrated.log`: 28/29 pass. The one failure is the known pre-existing base failure (see Residual Risks). `delivery-evidence/e2e-agy-multi-artifact-integrated.log`: 2/2 pass. |
| Not committed (by design) | `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/` (build output) |

## What Changed (for you)

1. The server now has exactly **one** process `RunFileChangeService`. `GeneralProcessRunSupervisor` constructs it, attaches it to runs and binds it. `getRunFileChangeService()` returns that bound instance and no longer silently creates a second one that is never attached.
2. That service keeps a live in-memory projection **only for runs attached to it**. Any other run is read fresh from `file_changes.json` and nothing is cached. So one early read can no longer pin a stale snapshot that hides later artifacts.
3. `RunFileChangeProjectionService` resolves the service on every call.
4. User-visible effect: every image or file that an active run records stays listable and previewable during the run, after it is terminated, and after a restored run starts a new turn. This holds for standalone Agents and Team members. Before the fix you got 200, then 404, then 404 until a restart.

Server code only:
- `src/services/run-file-changes/run-file-change-service.ts`
- `src/agent-execution/runtime/general-process-run-supervisor.ts`
- `src/run-history/services/run-file-change-projection-service.ts`

Tests were also added. There are no API, persistence or frontend changes.

## Verification Evidence

- API/E2E: `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md` and `api-e2e-evidence/` (including the browser evidence).
- New durable E2E: `autobyteus-server-ts/tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts`. It covers standalone and Team-member multi-image preview during the turn, after terminate and after restore.
- Delivery reruns on the integrated state are listed in the table above.

## Residual Risks / Non-goals

- The integration case "hydrates historical AutoByteus team-member file changes" was already failing on base `5c74fed71`, before this ticket. The seed data is likely stale. It is out of scope.
- Next ticket: Team-member Artifacts UI hydration after a reload or for a historical run. Evidence: `api-e2e-evidence/browser/12*`, `13*`.
- RSK-001: the frontend "deleted or moved" wording is unchanged.
- The real `agy` binary and model were not exercised; a fixture CLI stood in for them.

## Docs

- `docs-sync-report.md`: `artifact_file_serving_design.md` and `agent_artifacts.md` were updated in `061d4698b` and verified accurate. Other docs that mention the service need no change.

## How To Verify

- Run a server from this worktree and start an agent run, standalone or a Team member, that writes several images or files. Open each in the Artifacts panel during the run. Then terminate the run and open them again. Then restore the run, send a new turn and open them again. Every artifact should load and none should show "deleted or moved".
- Automated re-check, with `pnpm` on PATH (`/tmp/pnpm-shim`):
  - `pnpm -C autobyteus-server-ts exec vitest run tests/integration/api/run-file-changes-api.integration.test.ts --no-watch`
  - `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-native-image-multi-artifact-preview.e2e.test.ts --no-watch`
- `release-notes.md` is prepared in case you want a release.
