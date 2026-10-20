# API/E2E Revision Record

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution report (`api-e2e-execution-coverage-report.md`) remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer / `implementation-handoff.md` / direct-route round 1 | `SR-002`, `IR-002` | N/A | `Pass` / 96% |

## Revision Entries

### API-REV-001 — Baseline validation of the launcher, skip reason, residue and contract-payload changes

- Triggering role, report path, and round: implementation engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue/tickets/in-progress/mcp-test-launcher-and-test-residue/implementation-handoff.md`, round 1 (HEAD `7c9cadba2f`)
- Triggering finding or case IDs: N/A (initial validation)
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: `SR-001`, `SR-002`; `IR-001`, `IR-002`; architecture and code review not selected
- Why this baseline or coverage/execution revision was recorded: first completed validation result
- Coverage decisions or durable test paths changed: none by API/E2E; all 13 implementation-changed test files judged `Still Valid`
- Cases added, changed, removed, or rechecked: API-01…API-09, all new. IMP-01…IMP-09 were rerun independently on the final commit rather than reused (see the investigation's Planned Cases). Additions beyond the implementation's checks: a negative control with the base launcher (API-04), a run-owned `TMPDIR` leftover check for the teardown half of REQ-004/REQ-005 (API-08), and per-file counts of the touched files (API-09)
- Commands, environment, fixture, or broader-validation delta: full `pnpm test:e2e` residue diff on the rebased HEAD with a fresh server build (it had not run after the rebase). Broader validation `Not Required`

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (new), execution coverage report (new), test progress log (new), `follow-ups.md` (FU-002 added)
- Prior result and confidence (`N/A` for `API-REV-001`): N/A
- Current result and confidence: `Pass`, 96% (no category below 95%)
- New or remaining failure IDs: None
- Recommended owner: Delivery Engineer (direct route)
- Remaining risks, blocked evidence, or untested scope: uv error format checked on 0.10.2 only; macOS only. FU-001 did not reproduce, and its cause is still open. FU-002: untouched tests leave folders in the OS temp directory
