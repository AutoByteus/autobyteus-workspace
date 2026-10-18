# API/E2E Test-Case Ledger — PB-001 `agent-input-state-content-cadence`

## Ledger Meta

- Assigned task workspace / worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-state-content-cadence`
- Coverage investigation: `tickets/in-progress/agent-input-state-content-cadence/api-e2e-coverage-investigation.md`
- Execution coverage report: `tickets/in-progress/agent-input-state-content-cadence/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `tickets/in-progress/agent-input-state-content-cadence/api-e2e-revision-record.md`
- Ledger scope and reason it is required: multiple independent cases, including long-running real-model and desktop-instance cases
- Last updated: 2026-10-18

## Planned Cases

| Case ID | Case / Journey | Requirement / Acceptance-Criteria IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| REPO-01 | AgentRun unit file | AC-002, AC-004 | Unit | `vitest run tests/unit/agent-execution/agent-run.test.ts` | 1 | |
| REPO-02 | Cadence socket file ×3 | AC-001, AC-002, AC-003 | In-process socket integration | `vitest run tests/integration/agent/agent-status-websocket.integration.test.ts` | 2 | |
| REPO-03 | New tests against base `agent-run.ts` | Test sensitivity | Unit + integration | same two files, `agent-run.ts` at `2f211340ee` | 3 | Restore afterwards |
| REPO-04 | Server typecheck | AC-006 | Typecheck | `pnpm -C autobyteus-server-ts typecheck` | 4 | |
| REPO-05 | Server `test:unit` | AC-006 | Unit | `pnpm -C autobyteus-server-ts test:unit` | 5 | |
| REPO-06 | Server `test:integration` | AC-006 | Integration | `pnpm -C autobyteus-server-ts test:integration` | 6 | |
| REPO-07 | Web input-state handler spec | AC-006 | Web unit | `pnpm -C autobyteus-web test:nuxt run …agentInputStateHandler.spec.ts` | 7 | |
| LIVE-01 | Real LM Studio text reply through the built server; frame trace | AC-005, RSK-002 | Built `dist/app.js`, `/ws/agent`, native runtime | `evidence/live-stream-probe.mjs` | 8 | |
| LIVE-02 | Queue a message during the real reply | AC-003 (real) | same | same probe | 8 | |
| LIVE-03 | Second socket subscribes mid-reply (reconnect snapshot) | AC-004a (real) | same | same probe | 8 | |
| LIVE-04 | Same probe on a base build (contrast) | Probe sensitivity | same, base `agent-run.ts` | same probe | 9 | Restore + rebuild afterwards |
| DESK-01 | Isolated desktop instance: send, queue mid-reply, reload mid-reply | AC-005 isolated-instance check, SCN-001..003 | Packaged worktree build | `pnpm --silent isolated-app start --build` + browser automation + observer socket | 10 | |

## Execution Events

| Sequence | Case ID | Timestamp | Event | Command / Entry Point / Material Configuration | Expected Observable Result | Observed Result Or Checkpoint | Result | Evidence / Artifact Path | Next Action / Unresolved Issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | REPO-01 | 2026-10-18 06:19 | Completed | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run.test.ts --no-watch` | All pass | 46/46 pass | Pass | `evidence/api-unit-agent-run.log` | — |
| 2 | REPO-02 | 2026-10-18 06:20 | Completed | cadence file ×3 | 8/8 each run | 8/8, 8/8, 8/8 | Pass | `evidence/api-cadence-run-{1,2,3}.log` | — |
| 3 | REPO-03 | 2026-10-18 06:22 | Completed | `agent-run.ts` replaced by `git show 2f211340ee:…`, both files run, then `git checkout` (diff vs HEAD empty) | New tests fail on base | Unit: 4/4 new cases fail. Socket: 3 fail (the 2 known cadence cases + the new case), 5 pass | Pass | `evidence/api-base-new-tests.log` | — |
| 4 | REPO-04 | 2026-10-18 06:24 | Completed | `pnpm -C autobyteus-server-ts typecheck` | exit 0 | exit 0 | Pass | `evidence/api-typecheck.log` | — |
| 5 | REPO-05 | 2026-10-18 06:29 | Completed | `pnpm -C autobyteus-server-ts test:unit` | green | 720 files passed / 4 skipped; 5846 passed / 7 skipped | Pass | `evidence/api-test-unit.log` | — |
| 6 | REPO-06 | 2026-10-18 06:35 | Completed | `pnpm -C autobyteus-server-ts test:integration` | green | 76 files passed / 18 skipped; 396 passed / 68 skipped; 0 `reading 'kind'` errors | Pass | `evidence/api-test-integration.log` | — |
| 7 | REPO-07 | 2026-10-18 06:36 | Completed | `pnpm -C autobyteus-web test:nuxt run services/agentStreaming/handlers/__tests__/agentInputStateHandler.spec.ts` | green | 3/3 | Pass | `evidence/api-web-agentInputStateHandler.log` | — |
| 8 | LIVE-01/02/03 | 2026-10-18 06:45 | Started | `pnpm -C autobyteus-server-ts build` (fix), then `node evidence/live-stream-probe.mjs --server-dir autobyteus-server-ts --out evidence/live-fix --label fix` | — | First attempt stopped at setup: the LM Studio catalog is on demand (probe fixed to call `ensureProviderModelCatalog`) | N/A | `evidence/api-server-build-fix.log` | Rerun |
| 9 | LIVE-01/02/03 | 2026-10-18 06:50 | Completed | same probe, qwen/qwen3.6-35b-a3b, default 500 ms window, 2 turns (reasoning + text each) | Content frames spaced by the window; no repeated input-state revision; boundaries after content; queued revision immediate and after pending content; B snapshot then every later revision | A: 145 content frames, 141 flushed by window (gaps 500–592 ms, median 518), 3 early flushes, all before `SEGMENT_END`/`SEGMENT_START`, plus 1 before the queued revision; input-state revisions 1..9, 0 repeats. Queued revision 5 arrived 2 ms after send, directly after a flushed content frame (0 ms gap). B: snapshot revision 5 incl. the queued entry, then 6..9 = A's later revisions; 0 repeats; turn-2 text identical on A and B | Pass | `evidence/live-fix/summary.json`, `frames-A.jsonl`, `frames-B.jsonl`, `server.log`, `evidence/live-fix-probe-output.log` | LIVE-04 |
| 10 | LIVE-04 | 2026-10-18 06:42 | Completed | `agent-run.ts` at base `2f211340ee` → `pnpm -C autobyteus-server-ts build` (dist has no `publishedInputRevision`) → same probe `--out evidence/live-base --label base` → `git checkout` source (diff vs HEAD empty) → fixed build rebuilt (`evidence/api-server-build-fix-restore.log`) | The probe detects the defect on base | A: 5,100 content frames, median gap 22 ms (max 206), every one flushed by `AGENT_INPUT_STATE`; 5,136 input-state frames, 5,127 of them repeats. B: same pattern. The queued revision still arrived immediately (1 ms) | Pass (probe sensitivity proven) | `evidence/live-base/summary-compact.json`, `frames-A.excerpt-first-400.jsonl`, `frames-{A,B}.jsonl.gz`, `server.log`, `evidence/api-server-build-base.log` | DESK-01 |
| 11 | DESK-01 | 2026-10-18 06:48 | Checkpoint | `pnpm --silent isolated-app start --build` → `iso-51035-84c1` (control 51035, server 51036); packaged `agent-run.js` contains `publishedInputRevision` | Instance ready | Ready; agent "Lighthouse Writer" created via GraphQL; LM Studio catalog loaded via Settings › LM Studio; model `qwen/qwen3.6-35b-a3b:lmstudio@localhost:1234` picked in the composer | N/A | `evidence/desk-isolated-start.json`, `evidence/desk-isolated-build.log`, `desk/01..03*.png` | Send |
| 12 | DESK-01 | 2026-10-18 06:52 | Checkpoint | Attempt 1: harness pressed Enter in the composer during turn 1 to queue M2 | — | Harness error: while Running, the standalone composer's primary action is Stop (`resolveAgentPrimaryAction`), so Enter interrupted the turn (`requesting runtime interrupt` 04:52:22.296). Unchanged existing behavior, not a defect. Changed approach: a second `/ws/agent` client queues the message | N/A | `desk/04-after-m2.png`, `desk/isolated-instance.log` L367-371 | Round 1 |
| 13 | DESK-01 | 2026-10-18 06:55 | Checkpoint | Round 1: UI sends M1; `desk-observer-client.mjs` queues M2 1.5 s into the stream; CDP recorder records the renderer socket | Renderer shows Queued at once; renderer frames cadenced; no repeats | Queued shown in DOM 28 ms after M2 send. Renderer socket: revisions 1..13, 0 repeats; 88 content frames, 83 flushed by window (median 522 ms); the queued revision 9 came 2 ms after a flushed content frame. `location.reload()` from the page was ignored by the app (no reconnect in server log), so the reconnect was redone in round 2 | Pass (send/queue/cadence) | `desk/renderer-frames.jsonl(.summary.json)`, `desk/observer-frames.jsonl`, `desk/05-queued-visible-mid-reply.png`, `desk/dom-final-text.txt` | Round 2 |
| 14 | DESK-01 | 2026-10-18 07:01 | Completed | Round 2: UI sends M3; observer queues M4; recorder issues CDP `Page.reload` while M4 is queued | After reload: renderer re-subscribes, snapshot hydrates Queued, later revisions arrive once, text complete | Navigation type `reload`; server log: old renderer session disconnected 04:57:17.633, new one connected 04:57:17.902. "Queued" visible right after reload, Running. New socket: snapshot rev 17 [forwarded, queued], then 18..21 (= observer's later revisions), 0 repeats; 425 content frames, 421 window-flushed (median 518 ms), 3 early, at segment start/end only. Turn-3/4 text in DOM equals the streamed text (quotes normalized) | Pass | `desk/round2/*`, `desk/07-after-reload-queued-hydrated.png`, `desk/08-round2-both-turns-complete.png`, `desk/isolated-instance.log` | Cleanup |
| 15 | DESK-01 | 2026-10-18 07:02 | Checkpoint | `pnpm --silent isolated-app stop iso-51035-84c1`; `list` | Instance stopped, data root removed | `wasRunning: true`, `dataRootRemoved: true`, ports released; no instance of mine listed; no probe processes or temp roots | N/A | `evidence/desk-isolated-stop.json` | Report |

## Re-entry And Reconciliation

- Last durably recorded event: 15 (DESK-01 cleanup)
- Last completed case and result: DESK-01 — Pass
- Cases still running, interrupted, or not started: none
- Next case or recovery action: none
- Interruption or rerun note: DESK-01 attempt 1 was a harness error (Enter = Stop while Running); recorded and redone through a second client. The page-script reload was ignored by the app and was redone with CDP `Page.reload`
- Reconciled into execution coverage report: `Yes` — `api-e2e-execution-coverage-report.md` › Test-Case Ledger Reconciliation
- Reconciliation note for any case missing a terminal result: —
