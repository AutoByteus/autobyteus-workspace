# API/E2E Revision Record — mcp-sdk-v2-migration

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` (CRR-001), round 1 | SR-002 (requirements), SR-004 (design), ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Before/after parity of the MCP client migration (1.32.1 → client 2.3.1)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-001, Pass), round 1
- Triggering finding or case IDs: none (initial validation)
- Related revision IDs: SR-002, SR-004, ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first complete API/E2E result for REQ-009 / AC-009 / AC-012 and the R-002 / R-003 escalation triggers.
- Coverage decisions or durable test paths changed: none. The implementation's durable cases were judged sufficient; the cross-commit parity harness is temporary (sources in `evidence/API-10-19-setup-and-probe-sources.txt`).
- Cases added: API-01…API-06 (repository suites on both commits), API-10…API-13 (packaged isolated apps of both commits), API-14 (raw dialect probe), API-15 (packaged contents), API-16 (stop/orphans), API-17 (REQ-010), API-18 (Docker images of both commits), API-19 (interleaved timing). Reused: API-R01 (IMP-07), API-R02 (IMP-04, IMP-08, IMP-09, IMP-11).
- Commands, environment, fixture, or broader-validation delta: before worktree `mcp-sdk-v2-migration-parity-before` @ `dc530fdcb0`; test-owned server copies under `/tmp/mcp182`; live LM Studio, Claude, Grok, scripted AGY, Codex MCP client.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (new), `api-e2e-execution-coverage-report.md` (new), `api-e2e-test-progress.md` (new), `follow-ups.md` (FU-007), `evidence/API-*`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.4%
- New or remaining failure IDs: none
- Recommended owner: N/A
- Remaining risks, blocked evidence, or untested scope: Codex live model turn not repeated; Grok cells ran on different listed models (4.5 / 4.7) and the pinned rerun hit the provider quota; tts and autobyteus-image-audio not run (download at start / no faithful copy); stdio failure wording change presented for release notes (DEC-003).
