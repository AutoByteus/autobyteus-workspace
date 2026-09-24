# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer / `implementation-handoff.md` / round 1 | SR-002; IR-001; ARCH-REV N/A; CRR N/A; DR N/A | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Initial baseline: explicit Claude built-in tool policy validated on the real server path

- Triggering role, report path, and round: Implementation Engineer, `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-builtin-tool-restriction/tickets/in-progress/claude-sdk-builtin-tool-restriction/implementation-handoff.md`, round 1 (direct Small + Low route)
- Triggering finding or scenario IDs: N/A (initial); scenarios VAL-001..VAL-013
- Related revision IDs: SR-002, IR-001; architecture review N/A; code review N/A; delivery N/A
- Why recorded: first completed API/E2E validation result
- Coverage decisions or durable test paths changed: None by API/E2E. The implementation's unit updates in `autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts` were judged Still Valid.
- Scenarios: VAL-001..005 repository checks (unit, regression, base repro, build, docs). VAL-006..011 temporary real-server E2E (Studio server + GraphQL/WS team run + ClaudeSession + real Claude Code CLI + fake Messages API). VAL-012 the same on the bundled pinned CLI 2.1.280. VAL-013 SDK 0.3.281 re-check.
- Commands / environment / fixtures: see execution report § Broader Validation. Credential-free (dummy key, local fake API); invoking-session env stripped; temp app-data/workspace; all temporary scaffolding and transcripts removed.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-case-ledger.md` (all), `probe-evidence/api-e2e-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass / 95%
- New or remaining failure IDs: None
- Recommended recipient: `/delivery_engineer`
- Remaining risks, blocked evidence, or untested scope: RR-1 (pre-change sessions replay the old agent listing from history; the tool set is still restricted and calls still fail); RR-2 (the effective CLI version comes from PATH `claude`, so R-001 also applies to CLI updates); OBS-1 (the gated live team E2E is stale on `refType`, pre-existing); no live Anthropic model run (no credentials).
