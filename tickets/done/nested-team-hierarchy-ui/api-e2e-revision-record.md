# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative. This record preserves completed validation-round history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | Implementation Engineer; `implementation-handoff.md`; round 1 | `RER-002`; `IR-001`; architecture/source-review revisions `N/A` | N/A | Pass / 97% |

## Revision Entries

### API-REV-001 — Durable Workspace hierarchy browser baseline

- Triggering role, report path, and round: Implementation Engineer; `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/implementation-handoff.md`; initial API/E2E round 1
- Triggering finding or scenario IDs: `N/A — initial baseline`; executed `NTHUI-REP-001`, `NTHUI-REP-002`, `NTHUI-BR-001`–`005`, `NTAS-BR-001`–`004`, and `NTHUI-BUILD-001`
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: architecture-design `N/A`; architecture-review `N/A`; implementation `IR-001`; code-review `N/A`; delivery `N/A`
- Why this baseline or coverage/execution revision was recorded: Required initial completed API/E2E baseline for the confirmed `Medium` + `Low` direct-route implementation. It establishes durable browser proof of the approved printed-tree hierarchy and revalidates preserved live/history behavior.
- Coverage decisions or durable test paths changed: Added `autobyteus-web/tests/e2e/fixtures/nested-team-hierarchy.page.vue` and `autobyteus-web/tests/e2e/nested-team-hierarchy-probe.mjs`; added the package script and README instructions; updated `nested-team-aggregate-status-probe.mjs` to replace its obsolete circular-Team-avatar placement expectation with the approved filled configured-Team icon through `.member-status`; removed no test.
- Scenarios added, changed, removed, or rechecked: Added `NTHUI-BR-001`–`005`; updated placement evidence within `NTAS-BR-001`; rechecked focused history/state/projection/hydration (120/120), broader affected history/hydration (201/201), localization, production build, and both browser probes.
- Commands, environment, fixture, or broader-validation delta: Added the self-starting free-port Nuxt/Chromium execution with a deterministic 16-row/depth-3 current-contract fixture, complete 3×3 width/font matrix, English/Chinese focus and AX output, interaction/refresh/action evidence, screenshots, runtime error monitoring, and owned cleanup. One non-isolated Vitest configuration was abandoned after no progress; the default isolated one-worker configuration passed.

#### Prior Failure Resolution

None. This is the first completed API/E2E result. Iterative harness/stale-assertion corrections occurred before the completed baseline and did not identify a production failure.

- Canonical artifacts and sections updated:
  - `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/autobyteus-workspace-nested-team-hierarchy-ui-requirements/tickets/done/nested-team-hierarchy-ui/api-e2e-evidence/`
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass / 97%`
- New or remaining failure IDs: `None`
- Recommended recipient: `Delivery Engineer` through dynamic handoff rules; proportional test-code review is `Not Required — direct low-risk route`
- Remaining risks, blocked evidence, or untested scope: Only the upstream-documented, non-blocking extremely large-tree performance risk; actual Electron shell, migration, and external-provider validation are not applicable to the changed boundary.
