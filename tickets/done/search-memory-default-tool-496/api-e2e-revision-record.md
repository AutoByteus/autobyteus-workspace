# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-004, IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — `search_memory` for every run, proven on real runtimes

- Triggering role, report path, and round: Implementation Engineer, `tickets/in-progress/search-memory-default-tool-496/implementation-handoff.md`, round 1 (direct low-risk route)
- Triggering finding or case IDs: none (baseline)
- Related revision IDs: SR-004 (solution), IR-001 (implementation)
- Why this baseline was recorded: the first completed validation of the platform-given `search_memory`
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/search-memory-default-tool-live.e2e.test.ts`, gated with `SEARCH_MEMORY_LIVE_E2E=<runtime>`. It has scripted-AGY cases that cost nothing and paid cases for native, Claude, Codex and Grok.
- Cases added, changed, removed, or rechecked: API-01…03 reused (IMP-02, IMP-05, IMP-01); API-04…09 run; API-05N negative control added; API-10 Not Tested (Grok quota)
- Commands, environment, fixture, or broader-validation delta: live API runs on an in-process Studio server with fresh data roots, the test vault, host CLI logins, a throwaway `CODEX_HOME`, and the deterministic embedding stand-in

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope: Grok live (account quota) and DeepSeek Harness live (`dsh` not installed) were not run. Their ACP backend reaches the same shared rule (unit-proven) and the same runtime-independent Agent Tools MCP endpoint.
