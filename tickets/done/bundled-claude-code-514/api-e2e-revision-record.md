# API/E2E Revision Record

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md`, round 1 (direct route) | SR-002, IR-001 | N/A | Pass / 95.9% |

## Revision Entries

### API-REV-001 — Shipped artifacts and the Docker server package carry no SDK platform binary; Claude unchanged

- Triggering role, report path, and round: implementation engineer, `tickets/in-progress/bundled-claude-code-514/implementation-handoff.md` (IR-001), round 1.
- Triggering finding or case IDs: N/A (baseline).
- Related revision IDs: SR-002, IR-001.
- Why recorded: first API/E2E result.
- Coverage decisions or durable test paths changed: none (implementation's unit spec reused).
- Cases added: API-01 (Docker server package build and listing), API-02 (release artifacts of macOS x64, Linux x64/ARM64, Windows x64 listed), API-03 (test-owned Docker node with this package vs the image's built-in package); reused IMP-01..IMP-08 as API-R1..R5.
- Commands, environment, fixture, or broader-validation delta: Docker buildx on linux/arm64; throwaway alpine container for listing; test-owned container of `autobyteus/autobyteus-server:beta` with fresh volumes.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution coverage report, test progress log.
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.9%
- New or remaining failure IDs: None
- Recommended owner: delivery engineer
- Remaining risks or untested scope: a Claude turn on Windows/Linux desktop and in Docker not run (same path as the proven macOS turn); Docker linux/amd64 package not built locally.
