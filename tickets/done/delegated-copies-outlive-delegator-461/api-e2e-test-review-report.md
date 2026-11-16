# API/E2E Test Review Report: autobyteus-461

The latest result is CRR-066, after API-REV-022 (the release-smoke triage). It comes first. CRR-063, CRR-061 and CRR-050 follow as history.

## API-REV-022 (CRR-066)

### Review Meta
- Entry point: proportional test-code review after a successful API/E2E round (round 22, the release-smoke triage), with the failure origin confirmed.
- Scope:
  - `40d3a21014`: ten live E2E clients and the new unit check `tests/unit/e2e-helpers/team-stream-clients-wait-for-connected.test.ts`;
  - `6bed45922b`: `TESTING.md`;
  - `93ddf380b9`: reports and evidence.
- No source changed.
- Result: **Pass**.

### Failure origin: test-owned (API/E2E's F-92), confirmed
- **The failure:** on the release smoke at `d978347600`, `workspace-skill-links-live` AC-105 got `SESSION_NOT_READY` on Claude, Codex and Grok. The branch fails 2/2 and base passes 2/2.
- **The protocol is base's and unchanged:**
  - `api/websocket/agent.ts` `attachRunStream` refuses a command until `connect` resolves, and says "Retry after CONNECTED message".
  - 461's diff to the file is only the injected Team handler.
  - 461's Team view sends CONNECTED after its reads (CR-461-101, reviewed), a few ms after the socket opens. The test client sent on `open`, so the timing exposed a client that ignored the protocol.
- **No product client sends early.** I checked every product WebSocket client of these streams:
  - `TeamStreamingService`: every command goes through `requireCurrentAgentRun`, which throws unless `phase === 'ready'`, after CONNECTED and the snapshot;
  - `agentOrgStreamingService`: commands need `isReady()`;
  - `agentRunCollaborationStreamingService`: phases `awaiting_connected` → `ready`;
  - the agent stream (`/ws/agent`): its `connect` awaits only the status read, as base did, so its CONNECTED timing is unchanged.
  - `peer-run-observation-client` opens the remote observation route, not these streams. The application SDKs open no sockets.
- So the classification stands: a test defect, fixed at the test stage. No source change is needed.

### Changed tests
- **The ten clients** now wait for the stream's CONNECTED message before sending:
  - **The eight `waitConnected(messages)` files:** each attaches its capture listener before the `open` wait, so CONNECTED can't be missed.
  - **The two roundtrip files:** their `waitForStreamConnected` replaces `waitForSocketOpen`, and the listener goes on at construction.
  - **Missed frames:** a frame in the same chunk as CONNECTED could reach the roundtrip files before their capture listener is attached. Those files assert on no snapshot or tree frame, so nothing they check is lost.
- **The unit check** is a static rule over `tests/e2e` and `tests/integration`: a file that opens a Team or Org stream and sends a command must have a readiness wait.
  - It has positive and negative cases, and it is honest that it works per file.
  - It runs without a live gate, and I ran it: 2/2.
  - It closes the gap that let gated files keep the bug: round 17 found clients only by running suites.
- **`TESTING.md`:** one Gates sentence. Search for clients, gated files included, and put rules readable from the source into unit checks. That is a project rule, proportionate to the lesson.
- **Small, not a finding:** the two roundtrip files each keep a private copy of `waitForStreamConnected`, as they did of `waitForSocketOpen`. Moving them to the shared `waitConnected` would be tidier, but it's pre-existing duplication.

### Checklist
- Names and intent: clear.
- Assertions: unchanged.
- Reuse: the shared helper in eight files.
- Determinism: improved; the readiness wait replaces a race.
- No skipped or focused tests.
- Real triggers: unchanged.

### Follow-up
- FU-036 (recorded): the Org and agent-collaboration route (`attachRootStream`) silently drops a command sent before `connect` resolves, while the Team route answers `SESSION_NOT_READY`. It's base code, and product clients wait.

### Residual risks (from API/E2E, accepted)
- Grok wasn't rerun: FU-035, and its other smoke rows are HTTP 429 quota.
- Eight edited live files weren't run live; their only change is the same wait.
- The check is per file.

### Result
- **Pass.** No findings.
- Recipient: `/software_engineering_team/delivery_engineer`: merge into personal, rerun the smoke, tag the beta.

---

## API-REV-021 (CRR-063)

### Review Meta
- Entry point: proportional test-code review after a successful API/E2E round (round 21, on the merged state `339602ff36`; CRR-062).
- Scope:
  - `dc00f57d64`, `2ecdb8b356`, `8df4a7ee41` and `67d8ea56bc` were reviewed in CRR-061, and that result stands unchanged.
  - New: `f1f8ffc643`, whose durable test changes are `mobile-shell-probe.mjs` and `mobile-stopped-delegator-cases.mjs`. The other files are the report, the revision record and evidence.
- Result: **Pass**.

### What the round established (not re-run here)
- **The full server E2E folder:** 886 passed, 0 failed (193 files; 343 live-gated skips).
- **RRT-05 base comparison, 5 runs each, alternating:**
  - all 15 pass on `1e8b6e5d0a`, the branch and `827f1e68dc`;
  - the title appears first on every tree, at 2–18 ms;
  - the base and the branch behave the same, so F-72 / CR-461-093 stays closed.
- **The composer probe:** 12/12, with CF-013 and CF-014.
- **The phone cases MSP-53 … 58:** 6/6.
- **Type gates:** at baseline.

### Changed tests
**The phone case-ID clash: correct fix.**
- After the merge, the base's context-file size cases (`mobile-context-file-size-cases.mjs`, autobyteus-workspace-6) and 461's stopped-delegator cases both used MSP-53 … 55. The probe skips a repeated ID, so one set silently didn't run.
- Renumbering 461's cases to MSP-56 … 58 is the right side to move, because the base's IDs are already released.
- The start-up duplicate check now also reads `journey('ID'`. It catches the clash it missed, and the base's literal `runCase('MSP-53'` is still matched.
- Header comments and the `ids` list agree with the new numbers.

**Note for delivery:** two comments still point at the old number.
- `autobyteus-web/composables/mobile/useMobileRunOpening.ts:101` and `autobyteus-web/composables/mobile/__tests__/useMobileRunOpening.spec.ts:143` cite "MSP-53" for the stopped-delegator journey. That ID is now the base's context-file size case, and the agent-root journey is **MSP-56**.
- It's a comment-only correction with no behavior. Delivery can make it in its sync, so it doesn't need another loop.
- (`context-file-size-limits-built-server.e2e.test.ts:18` also says MSP-53, but it is the base's own reference and is correct.)

### Checklist
- Organization and names clear: yes. Assertions prove the requirement: unchanged. Reuse: yes. Determinism: unchanged. No skipped or focused tests. Real triggers: unchanged.

### Result
- **Pass.** No findings.
- Recipient: `/software_engineering_team/delivery_engineer`, with the two comment corrections above.

---

## API-REV-020 (CRR-061)

### Review Meta

- Review Round: proportional test-code review after API/E2E round 20.
- Trigger: API-REV-020, `Pass`, confidence 94%, on code `ac4a39498a` (CRR-060). The durable test changes are in `dc00f57d64` (round 18), `2ecdb8b356` (round 19), `8df4a7ee41` (round 19 addendum: docs and evidence only) and `67d8ea56bc` (round 20). Rounds 18 and 19 failed, so their test review comes here, with this passing run.
- Context reviewed: the execution report's rounds 18–20, `code-review-report.md` (CRR-057 … CRR-060), the commits' diffs.
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-061`.
- API/E2E Result: `Pass`. Final validation confidence: 94%.
- Prior unresolved test-review findings rechecked: none.
- Project testing guideline applied: `TESTING.md` (real built servers and browser; vault keys only; the user's CLI logins as approved; isolated data roots). No conflict.
- Supported Product Scenario Basis Confirmed: `Yes`.

### Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` (the live LE suite) | Updated (`2ecdb8b356`) | REQ-001, REQ-009, SR-084, CR-461-114 | Live delegation and collaboration across runtimes | Reworked from the delegator's view, which SR-084 removed, to 461's truths: the run tree (`runTree`), each copy's own file (`delegatedFrom`, definition), its own conversation and log, placement as the row's parent, REQ-001's Stop. Hosting-era assertions (`taskExecutions`, the package) were replaced by stronger ones: "the delegation creates the copy's own run, and nothing else" compares the run folders exactly |
| `autobyteus-server-ts/tests/e2e/projects/project-change-feed.e2e.test.ts` | Updated | SR-091 | The project change feed | Selects and asserts the Task root's `displayName` |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-native-built-server.e2e.test.ts` (RS-01) | Updated (`67d8ea56bc`) | CR-461-116 | A runtime switch on a built server | It asserted the numbered live echo CR-461-116 removed by design. It now asserts that the client is shown the marker exactly once, over the turn's frames including the activation snapshot, through the shared reader `shownText`. The observable behavior, stated precisely |
| `autobyteus-web/tests/e2e/runtime-switch-probe.mjs` (RSW-01) | Updated | CR-461-116 | The Settings switch, rendered | One live notice, in the same position as after a reload. The stale hint check now also accepts the save bar's wording, which applies to base too (the hint element is gone on both) |
| `autobyteus-web/tests/e2e/runtime-switch-members-probe.mjs` | Updated | CR-461-116 | A team member's switch | Records the live notice count |
| `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` (DCR) | Updated | SR-091, CR-461-115 | A copy's own name and file | Tightened: the header equals the slot name exactly in every tree (was "slot or slot - suffix") |
| `dc00f57d64` (round 18): `composer-context-file-removal-probe.mjs`, `agent-settings-focused-cases.mjs`, `delegated-launch-defaults-probe.mjs`, `mobile-*`, `project-manager-ux*`, `settings-saved-model-refresh-cases.mjs`, `team-group-icon-probe.mjs`, `team-status-live-probe.mjs`, `agent-org-task-team-disclosure-probe.mjs` and its page fixture | Updated | CRR-055/056's probe items; SR-082, SR-084, CR-461-108, FU-031, rule 2 | Each probe's own surface | Reworked to the approved shapes: each copy's own draft owner, tree row keys, `GetRunTree`, `RUN_TREE_CHANGED` notices, each run's own status, nesting with the outer Team expanded, the open rule. Spot-checked in CRR-057 |

- No durable test file changed: `No`.

### Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each change is commented with the decision it follows (SR-082/084/091, CR-461-108/115/116, rule 2) |
| Assertions prove approved requirements instead of incidental details | Pass | Hosting-era assertions are replaced by the new truths, not deleted. Several are tighter (the exact header; "nothing else" created; one notice and its position). RS-01 moved from an internal frame type to what the client is shown |
| Fixtures, setup and helpers reuse meaningful repetition | Pass | The shared `/ws/agent` reader (`agent-stream-frames.ts`: `shownText`) and the run-status client are reused, not re-implemented per suite |
| Isolation and determinism suit the boundary | Pass | Isolated data roots; live suites gated on vault keys. Some fixed waits (about 7 in the round-18 probes, and `wait(500)` in the live suite) prove absence or let a live model act. They are bounded and used for negatives, which is acceptable at these boundaries. RRT-05's known ~100 ms window shows once in a batch (F-72, closed as not reproduced) |
| Large files remain coherent | Pass | The live suite (about 450 changed lines) stays one coherent surface |
| No stale, duplicated, disabled or compatibility-only tests | Pass | No `.skip` or `.only`. The base-wording hint check is widened to the current wording, not kept as a base-compatibility path |
| Coverage agrees with the investigation and execution evidence | Pass | Rounds 18–20 match API-r18/19/20-runs.txt |
| Callers and fixtures exercise an established scenario | Pass | Live runtimes, real nodes and the real desktop app |
| Each test enters through the scenario's real trigger | Pass | Real sends and tool calls, Settings saves through the UI, real Stop and restart |

### Findings

None.

### Result

- `Pass`.
- **Routed to delivery:** the package is complete and validated (API-REV-020, 94%). Recipient: `/software_engineering_team/delivery_engineer`.


## API-REV-015 (CRR-050)

### Review Meta

- Review Round: proportional test-code review after API/E2E round 15 (targeted check).
- Trigger: API-REV-015, `Pass`, confidence 91%, on code `77f24482a8` (CRR-049); evidence `8ab0c6c420` (`evidence/api-e2e/API-r15-targeted-checks.json`).
- Context reviewed: `api-e2e-execution-coverage-report.md` (round 15 section); `code-review-report.md` (CRR-048, CRR-049); the probes' diffs.
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-050`.
- API/E2E Result: `Pass` (targeted). Final validation confidence: 91%.
- Prior unresolved test-review findings rechecked: none.
- Project testing guideline applied: `TESTING.md` (real built servers, real browser, isolated data roots, nothing read from user data). No conflict.
- Supported Product Scenario Basis Confirmed: `Yes`. CR-461-094 (a peer's status in the window, AC-016, AR-403), CR-461-098 (BR-011, the task-closure reactivation across a restart).

### Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs` | Updated | CR-461-094 (the churn), AC-016 | Peer rows in the tree, two real nodes | Adds `startCountingProxy` (a TCP pass-through in front of beta, which advertises the proxy's address and records each new connection's first request line) and RTP-09 (`--churn-ms`, default 180000): a peer view open for three minutes, with observations and status changes counted |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Updated (`60c2de0846`) | CR-461-098 (BR-011) | Task closure and reactivation across real restarts | On the "conversation after restart" timeout, records which markers the window shows, the URL and a screenshot, then rethrows |

- No durable test file changed: `No`.

### Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | RTP-09 is named and commented with its reason (round 31's ~33,000 re-observations). The BR-011 diagnostics are marked as diagnostics |
| Assertions prove approved requirements instead of incidental details | Pass | RTP-09 asserts the observable property, a settled status with no observation loop, through the real wire. Thresholds (≤ 3 new observations, ≤ 3 changes in three quiet minutes) are proportionate. BR-011's assertion is unchanged; only its failure is enriched |
| Fixtures, setup and helpers reuse meaningful repetition | Pass | The proxy is opt-in per node (`viaProxy`) and reuses `serverAt`. The probe's existing `openRunStatus` client is reused |
| Isolation and determinism suit the boundary | Pass | Free ports and its own data roots. The proxies are closed in cleanup. A three-minute wait is long but bounded and parameterized. One limit: the proxy records only each connection's first request, which is right for WebSocket observations (one per connection) but would under-count kept-alive HTTP requests. It counts only `run-observations`, so it fits its purpose |
| Large files remain coherent | Pass | Both additions stay within each probe's own surface |
| No stale, duplicated, disabled or compatibility-only tests | Pass | — |
| Coverage agrees with the investigation and execution evidence | Pass | RTP-09: 0 new observations and 0 status changes in both runs. BR-011's record wasn't needed (3/3 pass) |
| Callers and fixtures exercise an independently established scenario | Pass | A peer row in an open view (AC-016) and Task reactivation across restarts (BR-011) are product scenarios. The proxy only observes |
| Each test enters through the scenario's real trigger | Pass | Real nodes, the real pairing and the real browser view. The proxy is transparent, because beta advertises its address so alpha's real peer client goes through it |

### Findings

None.

### Observation (not a test finding)

- In tree run 1 the browser logged once "Failed to open team: Team context '…' became mounted while it was loading" (`teamRunOpenCoordinator.ts:60`). That guard is base's (`827f1e68dc`). Every case passed and its rows opened, and run 2 logged nothing. Rejected as a finding: a benign race guard. The backend run trees (SR-084) rework the open path, so I'll check it again in the full rerun.

### Result

- `Pass`.
- **Not routed to delivery:** the backend run trees (SR-084/085, FU-034 into 461) are being implemented (`4778dd20d8` onward), and the full API/E2E rerun follows them. The package isn't complete for delivery.
