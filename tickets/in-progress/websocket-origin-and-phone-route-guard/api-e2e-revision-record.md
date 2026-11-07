# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.4% |
| API-REV-002 | Code reviewer, `code-review-report.md`, CRR-003 round 2 (delivery Local Fix DR-001) | IR-002, CRR-003, DR-001 | Pass / 95.4% | Pass / 95.6% |

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

### API-REV-002 — Rerun after merging autobyteus-407 (node desktop on the phone); the phone's node desktop under the gate

- Triggering role, report path, and round: code reviewer, `code-review-report.md`, CRR-003 round 2 (Full Re-Audit of IR-002), delivery `Local Fix` DR-001 (`delivery-revision-record.md`)
- Triggering finding or case IDs: CRR-003's asks: the real phone journey on the node desktop (View only, Control, live revocation 4403), a foreign-origin `/ws/node-desktop` from a real browser page, and a rerun by impact
- Related revision IDs: IR-002, CRR-003, DR-001
- Why this revision was recorded: the merge `6f59bab2a2` changed the adapter all `/ws/*` handlers use, node desktop (407), close codes, the phone UI and the desktop VNC components
- Coverage decisions or durable test paths changed: none. `mobile-shell-probe.mjs` is unchanged since `14e3681cdc`
- Cases added, changed, removed, or rechecked:
  - Rerun: API-01, API-03, API-04, API-05, API-06/07 (with `/ws/node-desktop` added), API-08 (with VNC Control added).
  - New: API-09 (the phone's node desktop under the gate) and WEB-TC (web typecheck).
  - Still valid without a rerun: API-00 and API-02.
  - Reused: IMP-09…IMP-12 replace IMP-01…IMP-08.
- Commands, environment, fixture, or broader-validation delta: the server `dist`, phone bundle, server package and desktop app were all rebuilt from `1e1d6482a7`. API-09's first attempt failed because my own WebSocket recorder subclassed `WebSocket` and broke noVNC; I fixed it in the probe and ran the final journey with a recorder that hands the page the browser's own WebSocket objects

#### Prior Failure Resolution

None. Round 1 passed; FU-004 (outside scope) is unchanged: the same 4 base failures, and no new ones.

- Canonical artifacts and sections updated: the investigation ("Round 2 Rerun Plan"), the execution report (the whole report is now round 2), the progress log; evidence in `evidence/api-e2e/round2/`
- Prior result and confidence: Pass, 95.4%
- Current result and confidence: Pass, 95.6%
- New or remaining failure IDs: none in scope (FU-004 outside)
- Recommended owner: code reviewer (reviewed route); no durable test changed this round
- Remaining risks, blocked evidence, or untested scope: real Tailscale Serve and the wrapper apps on devices (only the user can check); Electron dev not run
