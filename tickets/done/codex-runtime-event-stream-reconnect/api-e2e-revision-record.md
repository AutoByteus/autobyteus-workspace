# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative. This record preserves the concise history of completed API/E2E rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `/code_reviewer`; `code-review-report.md`; initial API/E2E round | `SR-003`, `ARCH-REV-003`, `IR-001`, `CRR-001` | `N/A` | `Pass` / `96.6%` |

## Revision Entries

### API-REV-001 — Retry lifecycle joined coverage and real Codex validation baseline

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/code-review-report.md`; API/E2E round 1.
- Triggering finding or scenario IDs: No code-review finding; initial validation created `API-SC-001` through `API-SC-007`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-003` (retaining `SR-002`), `ARCH-REV-003`, `IR-001`, `CRR-001`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: Establish the mandatory first coverage investigation and completed execution result after source review. Directly protect the production failure outcome across native classification, canonical lifecycle, trace persistence, wire/frontend projection, and current real Codex process execution.
- Coverage decisions or durable test paths changed: Existing focused thread/converter/WebSocket/reader/live tests remain valid. Renamed `autobyteus-web/tests/integration/codex-stale-turn-boundary-projection.integration.test.ts` to `autobyteus-web/tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts`, retained the stale A/active B scenario, and added the retry-diagnostic continuation/persistence scenario.
- Scenarios added, changed, removed, or rechecked: Added `API-SC-001`; retained/renamed `API-SC-002`; rechecked `API-SC-003`-`API-SC-007`. No assertion was removed as obsolete.
- Commands, environment, fixture, or broader-validation delta: Built required shared SDKs/Prisma/Nuxt types; ran 167 focused server tests, 2 joined web integration tests, 2 selected server WebSocket tests, 15 trace-reader tests, server production-source typecheck, web boundary guard, patch checks, and one real Codex 0.152.1 live memory E2E with model `gpt-5.6-sol`. Test-owned temp memory was added to `API-SC-001` and cleaned automatically.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/api-e2e-coverage-investigation.md` — inventory, decisions, execution results, post-repository confidence, and broader-validation result.
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/api-e2e-execution-coverage-report.md` — complete round-1 execution and evidence.
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-runtime-event-stream-reconnect-release-v1.4.67/tickets/done/codex-runtime-event-stream-reconnect/api-e2e-revision-record.md` — `API-REV-001` baseline.
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass` / `96.6%`
- New or remaining failure IDs: None.
- Recommended recipient: `/code_reviewer` for proportional review of the durable test rename/addition.
- Remaining risks, blocked evidence, or untested scope: A real provider response-WebSocket retry was not deliberately induced because it is externally controlled and nondeterministic; the exact retry branch is covered deterministically and is backed by retained production retry evidence. Unchanged card severity, future protocol drift, and historical backfill remain approved out of scope.
