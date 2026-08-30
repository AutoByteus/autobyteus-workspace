# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `CRR-001` / API/E2E Round 1 | `SR-001`, `ARCH-REV-001`, `IR-001`, `CRR-001` | N/A | Pass / 96.1% |

## Revision Entries

### API-REV-001 — Initial remote-node open-tab projection baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/remote-node-open-tab-focus/code-review-report.md`; API/E2E Round 1
- Triggering finding or scenario IDs: No code-review finding; mandatory post-review coverage investigation for API-E2E-001 through API-E2E-008 and desktop variants
- Related revision IDs: `SR-001`, `ARCH-REV-001`, `IR-001`, `CRR-001`
- Why this baseline was recorded: First completed API/E2E validation result for implementation commit `8118e68e6c11fad541bf8b5bdd42e23da8b3ba91`
- Coverage decisions or durable test paths changed: None; all relevant durable coverage remained valid and API/E2E added, updated, removed, or disabled no repository test.
- Scenarios added/rechecked: Direct remote/embedded/availability/order policy; shared standalone/team projection; authoritative window identity; Browser shell; full Nuxt/Electron regressions; browser renderer composition; current-worktree packaged embedded/remote windows; owned Docker backend/Chrome URL outcome; cleanup safety.
- Commands, environment, fixture, or broader-validation delta: 6 focused handler tests, 76 related Nuxt tests, 13 focused Electron tests, 2,362 full Nuxt tests, 135 full Electron tests, boundary/build checks, temporary Chrome/Nuxt probe, macOS ARM64 Electron build/launch, and owned Docker/desktop probe. Generated workspace contract was built before the clean Nuxt retry; host-only `ELECTRON_RUN_AS_NODE` was removed for normal desktop launch; the clean Docker node's missing user BrowserServer MCP was recorded rather than fabricated.

#### Prior Failure Resolution

None.

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/remote-node-open-tab-focus/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/remote-node-open-tab-focus/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/remote-node-open-tab-focus/api-e2e-revision-record.md`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 96.1%
- New or remaining failure IDs: None
- Recommended recipient: `/code_reviewer` for proportional test-code review; `Not Applicable` expected because no durable coverage changed
- Remaining risks/untested scope: Actual provider-driven WebSocket execution against a user-configured Docker BrowserServer MCP was not run; standalone Nuxt typecheck remains blocked before project diagnostics; local Electron runtime evidence used an ad-hoc-signed, non-release package.
