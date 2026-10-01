# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `implementation_engineer` Implementation Complete / `implementation-handoff.md` / round 1 | SR-003, IR-001 | N/A | Pass / 96% |

## Revision Entries

### API-REV-001 — Initial baseline: free default control port validated on the real packaged app

- Triggering role, report path, and round: `implementation_engineer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports/tickets/in-progress/isolated-app-parallel-control-ports/implementation-handoff.md`, round 1
- Triggering finding or scenario IDs: N/A (initial validation)
- Related revision IDs: SR-003 (design), IR-001 (implementation); architecture review and code review `N/A — not applicable`
- Why this baseline was recorded: first completed API/E2E result on the direct low-risk route
- Coverage decisions or durable test paths changed: none by API/E2E. Executed the implementation's LC-007 plus the updated unit tests and LC-002.
- Scenarios added, changed, removed, or rechecked: UT-001, PRB-001 (LC-001..LC-007), LIVE-001, LIVE-002, CTRL-001, DOC-001 (all new IDs)
- Commands, environment, fixture, or broader-validation delta: `pnpm --dir autobyteus-web test:e2e:isolated-app --app /Applications/AutoByteus.app`; temporary live scripts with private `TMPDIR`s, a 9333 holder and browser-automation attach-only (`api-e2e-evidence/`)

#### Prior Failure Resolution

None

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (created), `api-e2e-test-case-ledger.md` (created), `api-e2e-execution-coverage-report.md` (created), `api-e2e-evidence/` (created)
- Prior result and confidence: N/A
- Current result and confidence: Pass / 96%
- New or remaining failure IDs: None
- Recommended recipient: `/delivery_engineer`
- Remaining risks, blocked evidence, or untested scope: accepted pick-to-bind window (none observed); Linux not exercised; pre-existing, timing-dependent `stop` `forced: true` (non-blocking, out of scope)
