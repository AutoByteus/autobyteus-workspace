# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer handoff (IR-001), round 1 | `SR-001`, `IR-001` | N/A | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Executable proof of the env-leak fix and the new regression coverage; direct route

- Triggering role, report path, and round: Implementation Engineer handoff, `implementation-handoff.md` (IR-001), round 1 (initial API/E2E validation)
- Triggering finding or case IDs: N/A — initial validation of the approved, implemented design
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: `SR-001`, `IR-001`; no architecture review or code review on this route
- Why this baseline was recorded: first completed API/E2E validation round for this ticket
- Coverage decisions or durable test paths changed: None added/updated/removed this round; the five durable test files the Implementation Engineer added/updated (`serverRuntimeEnv.spec.ts`, `platformServerEnvironment.spec.ts`, `BackendPortAvailability.spec.ts`, `ServerStatusManager.spec.ts`, `stores/serverStore.spec.ts`) were reviewed against the design's Removal/Decommission Plan and found `Still Valid`, complete, and boundary-appropriate
- Cases added, changed, removed, or rechecked: Reused `AE-R-01..07` (implementation's `IMP-01..07`, unchanged code since `c8ec06b51`); added `AE-01` (AC-002/AC-003 real-process + real-dependency probe), `AE-02` (AC-005 real-process variant attempt — structural finding, `Not Tested`), `AE-03` (added mid-round: clean full-app start/restart/health lifecycle check)
- Commands, environment, fixture, or broader-validation delta: Executed Project Desktop Validation this round (none in the implementation round): a direct real-backend-process probe (AE-01) and an isolated desktop instance (AE-02/AE-03), per `TESTING.md`'s mapping of desktop-shell lifecycle behavior to "Electron main-process tests + an isolated desktop instance"

#### Prior Failure Resolution

None — first round.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (created), `api-e2e-execution-coverage-report.md` (created), `api-e2e-test-progress.md` (created), `follow-ups.md` (FU-006 added)
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass` / 95.4% overall final confidence (no applicable category below 90%; every critical acceptance criterion directly proven)
- New or remaining failure IDs: None
- Recommended owner: N/A (result is `Pass`)
- Remaining risks, blocked evidence, or untested scope: FU-006 (testability gap: the real `BaseServerManager` port-conflict-recovery orchestration cannot be exercised in a full desktop-app process without touching port 29695 or the real user data, so it remains proven only at the real-socket function level, which matches AC-005's own defined verification intent); R-001 and R-003 (pre-existing, named in `design-spec.md`, unchanged by this round)
