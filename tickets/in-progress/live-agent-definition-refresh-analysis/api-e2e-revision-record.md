# API/E2E Revision Record

The canonical coverage investigation and execution coverage report remain authoritative. This record preserves completed-round history only.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `CRR-004` / API-E2E round 1 | `SR-004`, `ARCH-REV-003`, `IR-003`, `CRR-004` | N/A | Pass / 96.4% |
| API-REV-002 | `code_reviewer` / `CRR-007` / API/E2E round 2 | `SR-005`, `ARCH-REV-004`, `IR-005`, `CRR-007`, `DR-001` | Pass / 96.4% | Pass / 97.1% |

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
