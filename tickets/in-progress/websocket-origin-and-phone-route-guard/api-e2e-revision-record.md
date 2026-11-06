# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Baseline: server regression, phone (LAN, Tailscale-shaped, WebKit), peers, browser attack, gateway setting, packaged desktop with a Docker node

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, CRR-001 round 1 (pass)
- Triggering finding or case IDs: AC-007, AC-008, AC-009, ASM-001, ASM-002 left to this stage
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-003, ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first completed validation result
- Coverage decisions or durable test paths changed: `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` updated (commit `14e3681cdc`). Its LAN emulation forwarded the phone's Origin with a rewritten Host, which the new gate refuses (API-00, API-02); it now keeps the phone's Host and sends the phone's Origin on the WebSocket leg
- Cases added, changed, removed, or rechecked: reused IMP-01…IMP-08; added API-00…API-08
- Commands, environment, fixture, or broader-validation delta: see the execution report's Tested Builds And Environments and Round deviations

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `follow-ups.md` (FU-004)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.4%
- New or remaining failure IDs: None in scope. API-01's four base failures are FU-004 (outside this change)
- Recommended owner: code reviewer (test-code review of the probe update)
- Remaining risks, blocked evidence, or untested scope: real Tailscale Serve and the wrapper apps on devices (only the user can check); Electron dev not run (loopback class covered)
