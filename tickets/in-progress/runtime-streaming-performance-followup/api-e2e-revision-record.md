# API/E2E Revision Record — Runtime Streaming Performance Follow-up

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative. This record preserves the concise completed-round history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` / initial API/E2E round | `SR-001`, `ARCH-REV-001`, `IR-001`, `IR-002`, `CRR-001`, `CRR-002` | N/A | `Fail` / `77.1%` |
| API-REV-002 | `code_reviewer` / `CRR-004` / implementation-correction rerun | `IR-003`, `CRR-003`, `CRR-004`, `API-REV-001` | `Fail` / `77.1%` | `Pass` / `97.6%` |

## Revision Entries

### API-REV-001 — Real standalone socket disproves ordinary content coalescing

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/code-review-report.md`; initial API/E2E Round 1 after `CRR-002` pass.
- Triggering finding or scenario IDs: initial coverage; resulting failure `WS-EGRESS-001` against `AC-003` (and prerequisite for `AC-001`/`AC-006`).
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-001`, `ARCH-REV-001`, `IR-001`, `IR-002`, `CRR-001`, `CRR-002`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: establish the mandatory first completed API/E2E result from a coverage investigation written before durable edits/execution, and preserve the direct failure that mocked egress tests did not expose.
- Coverage decisions or durable test paths changed: updated the server GraphQL Settings E2E, standalone status/WebSocket integration, and team WebSocket integration. One obsolete immediate-content ordering assertion was corrected; no coverage was removed.
- Scenarios added, changed, removed, or rechecked: added API-SET-001, WS-EGRESS-001/002/003; updated/rechecked WS-STATUS-001; no removals. API-SET-001, WS-STATUS-001, WS-EGRESS-002, and WS-EGRESS-003 pass. WS-EGRESS-001 fails reproducibly.
- Commands, environment, fixture, or broader-validation delta: real Fastify WebSockets on free loopback ports, current production `AgentRun` lifecycle pipeline/mapper/handler/egress, deterministic 30-event same-identity source, explicit 500 ms setting, isolated GraphQL temp `.env`. Broader Chrome/Nuxt performance execution was intentionally stopped after the critical server failure.

#### Prior Failure Resolution

None — `API-REV-001` is the initial completed API/E2E result.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/ws-default-window-rate-failure.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/ws-default-window-rate-failure-summary.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/api-team-live-setting-focused.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/ws-status-runtime-matrix.log`
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail`, `77.1%`.
- New or remaining failure IDs: `WS-EGRESS-001` — 30 canonical content events produce 30 ordinary client content frames after one 500 ms window; expected one exact aggregate.
- Recommended recipient: `code_reviewer` for focused failure-origin review. Preliminary classification is `Design Impact` because the reviewed all-non-content merge-barrier rule conflicts with the current canonical lifecycle transformer's per-content `running` companion.
- Remaining risks, blocked evidence, or untested scope: the required 10-minute/120k browser/runtime, exact final equality, CPU/drift/health/interactions, live/final DOM, and bound-node browser journeys remain intentionally unexecuted until WS-EGRESS-001 is corrected. The environment is not blocked.

### API-REV-002 — Corrected egress passes full runtime, browser, Settings, and live-provider validation

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/code-review-report.md`; Round 2 after CRR-004 passed IR-003.
- Triggering scenario: retained WS-EGRESS-001 had to run first, unchanged.
- Related revisions: `IR-003`, `CRR-003`, `CRR-004`, prior `API-REV-001`.
- Why recorded: preserve resolution of the critical real-socket failure and the completed repository, sustained browser/runtime, Settings, and user-requested real-provider evidence.
- Durable coverage delta: retained the three Round 1 API/WS files; updated the stale runtime-matrix aggregate expectation; added normalized database-target and production `AgentRun` adapter regressions in `live-e2e-harness.test.ts`; corrected the durable real-E2E harness in `test-support/live-e2e/live-e2e-harness.ts`. Removed none.
- Execution delta: exact WS-EGRESS-001 pass first; combined server 28/28; server affected units 141/141; web affected 140/140; builds/guards pass; 601-second Chrome production-path stream; two real Settings nodes; real DeepSeek and OpenAI agent-flow runs from a value-safe isolated vault.

#### Prior Failure Resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| WS-EGRESS-001 / 30 source content events became 30 client content frames | Implementation/design interaction, confirmed in API-REV-001 | IR-003's state-preserving `SEND_WITHOUT_FLUSH` retains the actual same-identity pending tail; unchanged regression now emits the intended aggregate | `api-e2e-execution-evidence/ws-default-window-rate-api-rev-002.log` |
| Broader browser/runtime and bound-node evidence deferred | Deferred behind critical failure | Completed: 600.999 s, 120,220 exact chars, 1.7155 content frames/s, 95.712% reduction, all host/browser/Settings thresholds green | `api-e2e-execution-evidence/long-stream-browser-summary.json` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/`
- Prior result/confidence: `Fail`, `77.1%`.
- Current result/confidence: `Pass`, `97.6%`.
- New or remaining failure IDs: `None`. Two live-E2E test-infrastructure defects were locally corrected and rerun successfully; neither was a production implementation failure.
- Recommended recipient: `code_reviewer` for proportional review of the five updated durable coverage/test-support paths.
- Remaining risks: browser evidence does not claim unchanged Electron-shell execution; physical socket-loss replay remains intentionally unsupported; real-provider controls supplement rather than replace deterministic cadence/equality proof.
