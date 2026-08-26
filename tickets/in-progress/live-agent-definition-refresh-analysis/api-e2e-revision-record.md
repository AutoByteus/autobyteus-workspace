# API/E2E Revision Record

The canonical coverage investigation and execution coverage report remain authoritative. This record preserves completed-round history only.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `CRR-004` / API-E2E round 1 | `SR-004`, `ARCH-REV-003`, `IR-003`, `CRR-004` | N/A | Pass / 96.4% |
| API-REV-002 | `code_reviewer` / `CRR-007` / API/E2E round 2 | `SR-005`, `ARCH-REV-004`, `IR-005`, `CRR-007`, `DR-001` | Pass / 96.4% | Pass / 97.1% |
| API-REV-003 | User real-stack correction / API/E2E round 3 | `SR-005`, `ARCH-REV-004`, `IR-005`, `CRR-007`, `API-REV-002` | Pass / 97.1% | **Fail / 78.3%** |

## Revision Entries

### API-REV-001 — SR-004 sequential existing-run Save baseline

- Triggering role, report path, and round: `code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/code-review-report.md`; API/E2E round 1.
- Triggering finding or scenario IDs: `CRR-004` Pass; API-E2E-001 through API-E2E-006.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-004`, `ARCH-REV-003`, `IR-003`, `CRR-004`; no delivery revision.
- Why this baseline or coverage/execution revision was recorded: This is the first completed API/E2E result. It replaces the unexecuted pre-SR-004 revision/multi-client plan with authoritative evidence for the sequential browser journey, revision-free direct API, current persisted packages, exact supported resolver triggers, renderer behavior, and runtime adapters.
- Coverage decisions or durable test paths changed: Added the built-server stopped-run GraphQL E2E and durable browser probe/fixture/command; updated exact Agent/Team owner-order tests and two stale current-caller fixtures; removed no tests.
- Scenarios added, changed, removed, or rechecked: Added API-E2E-001–006; rechecked focused/broader server and web suites, builds, guards, restart/current readers, physical commit classification, provider adapters, and capability preflight; confirmed obsolete revision/rebase/concurrent-browser seams remain absent.
- Commands, environment, fixture, or broader-validation delta: Isolated built server with temporary HOME/runtime/SQLite/free ports; exact coordinator/launcher lifecycle integration; owned Nuxt + Chromium at 1280x900 and 390x844; sanitized real-provider preflight. Final counts and commands are in the execution report.

#### Prior Failure Resolution

None. No prior completed API/E2E result exists. In-round fixture corrections were resolved before the authoritative Pass and are described in the canonical investigation/report.

- Canonical artifacts and sections updated:
  - `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-revision-record.md`
- Prior result and confidence: `N/A`.
- Current result and confidence: `Pass / 96.4%`.
- New or remaining failure IDs: None.
- Recommended recipient: `/code_reviewer` for proportional review of changed durable coverage.
- Remaining risks, blocked evidence, or untested scope: No configured Claude provider credential was available for a paid remote turn; direct pinned-SDK session/query tests passed. The browser UI and built backend were exercised in complementary deterministic runs rather than one composed process. Multi-client/revision/rebase and Electron shell behavior are intentionally out of scope.


### API-REV-002 — SR-005 Application ownership lease and integrated regression

- Triggering role, report path, and round: `code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/code-review-report.md`; API/E2E round 2.
- Triggering finding or scenario IDs: `CRR-007` Pass resolving `CR-F-003`; API-E2E-007/008 newly required; API-E2E-001–006 rechecked.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-005`, `ARCH-REV-004`, `IR-005`, `CRR-007`, historical integrated-state trigger `DR-001`.
- Why this coverage/execution revision was recorded: API-REV-001 predates the integrated two-owner topology. This round replaces its historical Application-same-General-owner interpretation with direct evidence for the startup-ready durable Application lease, terminal release, provenance-backed reentry, and later General eligibility while preserving the sequential browser and exact General-lane contract.
- Coverage decisions or durable test paths changed: Added `autobyteus-server-ts/tests/integration/run-history/application-owned-studio-run-model-config.integration.test.ts`; updated or removed no existing durable path.
- Scenarios added, changed, removed, or rechecked: Added API-E2E-007/008. Rechecked API-E2E-001–006, current General lanes/callers, persistence/validation, Application worker/host lifecycle, provider adapters/preflight, focused and broader web suites, production builds/guards, and four Chromium journeys. No prohibited multi-tab, revision, hand-speed, rebase, or simultaneous-call scenario was added.
- Commands, environment, fixture, or broader-validation delta: Normal Application Agent/Team launches crossed real temporary SQLite binding/lookup stores, a real startup gate and ownership reader, Studio lock/update behavior, normal host termination, terminal input rejection, and exact General delegation. The integrated Chromium evidence was retained under `browser-sr005`; provider preflight again reported no Anthropic credential.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| Historical API-REV-001 Application same-owner interpretation exposed by `CR-F-003` / `DR-001` | Design Impact, resolved upstream by SR-005/IR-005/CRR-007 | Replaced; no same-owner assertion governs current coverage | API-E2E-007/008 pass through separate Application lease and released General owner |
| API-REV-001 remaining external-provider residual | Environment-limited | Remains bounded, not a failure | Direct provider tests passed; sanitized preflight 18/18; Anthropic credential absent |

- Canonical artifacts and sections updated:
  - `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-revision-record.md`
- Prior result and confidence: `Pass / 96.4%` (`API-REV-001`), whose SR-004 General/browser evidence remains valid but whose Application same-owner interpretation is historical.
- Current result and confidence: `Pass / 97.1%`.
- New or remaining failure IDs: None.
- Recommended recipient: `/code_reviewer` for proportional review of the one added durable integration test.
- Remaining risks, blocked evidence, or untested scope: No configured Anthropic credential was available for a paid Claude response turn. Browser, built backend, and Application worker/ownership evidence are complementary executions rather than one fully composed process. Electron shell, multi-client/revision/rebase, cross-owner simultaneous calls, and multi-node ownership are outside the approved scope.


### API-REV-003 — Real full-stack Classroom Team and Codex catalog validation

- Triggering role, report path, and round: User-directed correction asking for actual frontend/backend startup, a real browser tab, exact `/home/autobyteus/workspace/autobyteus-agents` import, Classroom Simulation Team execution, and the supported root E2E command; API/E2E round 3.
- Triggering finding or scenario IDs: API-E2E-009; new failures `API-E2E-F-001` and `API-E2E-F-002`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-005`, `ARCH-REV-004`, `IR-005`, `CRR-007`, historical `API-REV-002`; no new reviewed implementation revision.
- Why this revision was recorded: API-REV-002 used real Nuxt/Chromium and real backend/lifecycle evidence in complementary runs, but the browser GraphQL surface was intercepted. This round crossed the actual frontend, backend, filesystem package, catalog, SQLite, GraphQL, WebSocket, and Codex provider in one validation-owned stack and then ran the root-supported E2E suite.
- Coverage decisions or durable test paths changed: No repository-resident coverage was edited. Existing `llmConfigSchema`/form fixtures and broad in-process GraphQL E2E composition were reclassified `Needs Update` because the real Codex payload and newly mandatory Studio service dependency are not represented correctly.
- Scenarios added, changed, removed, or rechecked: Added API-E2E-009. Exact package import, Team render, Team launch, Stop, network-fresh Settings read, later restore/message, real GPT-5.4 response, and final Stop passed. Actual Codex stopped-config edit/Save failed. Root `pnpm test:e2e` failed.
- Commands, environment, fixture, or broader-validation delta: `pnpm dev` completed the fresh backend build but reported `DEV_PORT_OCCUPIED` for unrelated PID 63; the same fresh built backend and Nuxt were safely run on 38123/33123 with validation-owned data. System Chromium via Playwright Core used no GraphQL interception. The exact external package remained read-only. Root E2E ran for 435.23 seconds.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-REV-002 composed-browser residual | Bounded residual; browser and backend executed separately | Closed by real composed execution | Real package import, GraphQL, WebSockets, SQLite, and Codex response in `full-stack-classroom-sr005` |
| API-REV-002 unavailable paid Claude turn | Environment-limited | Replaced for this journey by an actually available real Codex App Server / GPT-5.4 turn; Claude residual itself remains historical | `real-turn-evidence.json`, `11-classroom-real-codex-response.png`, raw trace projection |

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/probes/api-e2e/full-stack-classroom-sr005`
- Prior result and confidence: `Pass / 97.1%` (`API-REV-002`).
- Current result and confidence: **`Fail / 78.3%`**.
- New or remaining failure IDs:
  - `API-E2E-F-001`: real Codex `reasoning_effort` enum selection renders `Enter a value of type enum.`, leaves Save disabled, and prevents the update mutation.
  - `API-E2E-F-002`: root `pnpm test:e2e` reports 15 failed / 41 passed / 14 skipped files and 41 failed / 154 passed / 57 skipped tests; 29 failure occurrences show missing Studio Application API service composition, with other failures requiring separate triage.
- Recommended recipient: `/code_reviewer` for focused failure-origin review; likely frontend source rework for F-001 and test/harness rework after origin confirmation for F-002.
- Remaining risks, blocked evidence, or untested scope: Actual stopped Codex config persistence/later use is blocked by F-001. Root E2E is not clean. Electron shell and prohibited concurrency/revision scenarios remain out of scope. No validation resource remains running.
