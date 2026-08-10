# API/E2E Revision Record — Background Agent Renderer Contention

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` / Round 1 | SR-004, ARCH-REV-004, IR-005, CRR-005 | N/A | Pass / 98.4% |
| API-REV-002 | user + `delivery_engineer` re-entry / `DR-002` / Round 2 | IR-005, CRR-005, API-REV-001, CRR-006, DR-002 | Pass / 98.4% | **Fail / 77.1%** |
| API-REV-003 | `code_reviewer` / `CRR-008` / Round 3 | API-REV-002, IR-006, CRR-008, DR-002 | Fail / 77.1% | **Pass / 98.9%** |

## Revision Entries

### API-REV-001 — Initial executable-coverage baseline and real-system proof

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/code-review-report.md`; API/E2E Round 1.
- Triggering scenarios: `WS-STATUS-001`, `BG-BROWSER-000–007`, `ELECTRON-SMOKE-001`; user-directed `REAL-CLASSROOM-001` was added during execution.
- Related revisions: SR-004, ARCH-REV-004, IR-005, CRR-005.
- Why recorded: first completed API/E2E validation result after CRR-005 passed the implementation source.
- Coverage decisions / durable paths changed:
  - updated `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` from obsolete duplicate-status counts to transition-only UI projection plus canonical subscriber evidence;
  - added `autobyteus-web/tests/e2e/background-agent-renderer-contention-probe.mjs`;
  - added `autobyteus-web/tests/e2e/fixtures/background-agent-renderer-contention.page.vue`;
  - added `test:e2e:background-contention` in `autobyteus-web/package.json`;
  - removed none.
- Scenarios added/changed/rechecked: all scenario IDs in the canonical execution report.
- Commands/environment delta: real WebSocket first; 57 server tests; 344 frontend tests; builds/guards; durable Chrome; actual isolated Electron; requested `pnpm secrets:import`, agent-package import, and real `deepseek-v4-flash` Classroom Simulation Team UI exchange.

#### Prior Failure Resolution

None — this is the initial completed baseline. Two non-authoritative setup/coverage diagnostics were resolved within the same round and remain preserved:

| Diagnostic | Classification | Resolution | Evidence |
| --- | --- | --- | --- |
| unchanged WebSocket test: 2 pass / 5 stale-count failures | stale durable expectation | updated transition-only assertions; exact file passed 7/7 | `ws-status-first-unchanged.log`; `ws-status-first-corrected.log` |
| direct reload of an unregistered temporary workspace showed no history | temporary probe used unsupported history precondition | normal UI registered workspace, expanded scoped history, reselected professor; exact marker/thinking/tools/files hydrated | `real-classroom-ui-evidence.json`; `real-classroom-ui-history-followup.json` |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this record.
- Prior result and confidence: `N/A`.
- Current result and confidence: `Pass / 98.4%`.
- New or remaining failure IDs: `None`.
- Recommended recipient: `code_reviewer` for proportional review of changed durable coverage.
- Remaining risks: accepted aggregate-equivalent rather than 20 independent providers; fake rather than physical microphone; higher-scale JSON/worker and renderer-wide unrelated optimization remain deferred/out of scope.

### API-REV-002 — Real Electron-data workspace startup re-entry

- Triggering role, report path, and round: user verification after `delivery_engineer` DR-002; `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/delivery-revision-record.md`; API/E2E Round 2.
- Triggering scenario: the user's running Electron UI displayed no workspaces despite an existing populated Electron data directory.
- Related revisions: IR-005, CRR-005, API-REV-001, CRR-006, DR-002.
- Why recorded: API-REV-001 did not test the delivery-built/current renderer's fresh workspace catalog against the user's Electron data state; its isolated shell fixture could not establish this critical persisted-data boundary.
- Prior result and confidence: `Pass / 98.4%`.
- Current result and confidence: `Fail / 77.1%`.
- New failure: `API-F-001` / `WORKSPACE-BOOT-001` — after a fresh render, the backend returns 26 workspaces and non-empty history while the UI renders zero workspace rows and `No run history yet.`
- Corroboration:
  - active Electron backend using `/Users/normy/.autobyteus/server-data`: 26 workspaces, 28 history groups, 79 agent runs, and 184 team runs; reviewed frontend still empty;
  - isolated real-data copy using required `pnpm secrets:import` and the requested `/Users/normy/autobyteus_org/autobyteus-agents` package: 26 workspaces and 18 history groups; reviewed frontend still empty;
  - source trace identifies the IR-005 cached navigation projection as seeded before asynchronous workspace metadata arrives and never refreshed on that transition.
- Electron artifact provenance: `/Applications/AutoByteus.app` is an older, different app.asar than the DR-002 worktree build. This mismatch is separately recorded and does not remove the source failure, which reproduces from the reviewed branch against both real backends.
- Coverage decisions / durable paths changed: none in API-REV-002. Existing coverage is reclassified as insufficient for the empty-to-populated fresh-boot transition; durable regression work awaits source correction and review routing.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this record.
- Cleanup: owned browsers/frontends/backend and isolated data copy were stopped/removed; the user's `/Applications` Electron process/backend and data were never modified or stopped.
- Recommended recipient: `code_reviewer` for focused failure-origin review, preliminary classification `implementation source defect`.
- Delivery state: blocked. API-REV-001 is superseded, and delivery must not finalize until the exact regression passes after a reviewed correction.

### API-REV-003 — IR-006 exact fresh-data correction recheck

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/code-review-report.md`; API/E2E Round 3 (`CRR-008`).
- Triggering scenarios: `API-F-001 / WORKSPACE-BOOT-001`; corroborating `WORKSPACE-BOOT-002`.
- Related revisions: API-REV-002, IR-006, CRR-008, DR-002.
- Why recorded: CRR-008 passed the IR-006 correction and required the exact unchanged fresh real-data regression to run first, followed by active-backend corroboration and the retained correctness/performance matrix.
- Prior result and confidence: `Fail / 77.1%`.
- Current result and confidence: **Pass / 98.9%**.

#### Prior Failure Resolution

| Prior Failure | Recheck | Expected | Observed | Resolution |
| --- | --- | --- | --- | --- |
| `API-F-001 / WORKSPACE-BOOT-001` | first behavioral execution: new owned snapshot, required secret import, requested agent package, current backend/renderer, real Chrome | 26 returned workspaces become 26 visible rows without false empty state | API 26 workspaces / 18 history groups / 79 agent runs; UI 26 visible rows; `No run history yet.` absent | **Resolved** |
| corroborating `WORKSPACE-BOOT-002` | current branch renderer against active Electron backend and real data | same catalog correctness on the user's backend boundary | API 26 workspaces / 28 history groups / 79 agent runs / 184 team runs; UI 26 visible rows; a second full reload again showed 26/26 | **Resolved** |

- Retained execution:
  - IR-006 workspace-navigation matrix: 5 files / 126 tests passed;
  - real standalone/team WebSocket matrix: 4 files / 57 tests passed;
  - affected frontend matrix: 28 files / 345 tests passed;
  - durable Chrome `BG-BROWSER-000–007`: all passed; aggregate Files/Teams p95 `6.9 ms` versus `6.7 ms` idle (`1.03×`), zero topology rebuilds, no long task;
  - production build and all three web/localization guards/audits passed.
- Coverage decisions / durable paths changed: none. IR-006 already adds the focused source-owned durable regression; API/E2E added, updated, or removed no repository-resident durable coverage in this round.
- Broader validation: `Required — completed` with two real browser/backend paths and the retained real-Chrome performance/correctness probe. Actual packaged Electron rerun was unnecessary for the renderer-only IR-006 delta; the active Electron backend/real data were exercised read-only, and prior shell evidence remains valid.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-agent-renderer-contention/tickets/in-progress/background-agent-renderer-contention/api-e2e-execution-evidence/api-rev-003`.
- Cleanup: owned tabs/services/snapshot removed; ports `63931–63933` free; user-owned Electron backend on `29695` remains listening and untouched.
- New or remaining failure IDs: `None`.
- Recommended recipient: `code_reviewer` for proportional test-code review (`Not Applicable` expected), then delivery routing.
- Remaining risks: bounded accepted risks only—aggregate-equivalent rather than 20 independent providers, fake rather than physical media, and no repeated packaged-shell run for a web-equivalent renderer-only correction.
