# API/E2E Revision Record — settings-update-notifications

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-002 (implementation review pass) | SR-004, ARCH-REV-002, IR-002, CRR-002 | N/A | Pass / 94.6% |

## Revision Entries

### API-REV-001 — Baseline: real server chain E2E, packaged isolated instances with real GitHub and a test feed

- Triggering role, report path, and round: code reviewer, `tickets/in-progress/settings-update-notifications/code-review-report.md`, CRR-002 (round 2 pass)
- Triggering finding or case IDs: the open items in the handoff:
  - the packaged generic-feed check (design escalation trigger);
  - AC-001..007, AC-012..015, AC-017, AC-018 (mobile), AC-021;
  - CR-001 (optional).
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: SR-004, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002
- Why this baseline was recorded: first API/E2E round
- Coverage decisions or durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/update-notifications/update-notifications-live.e2e.test.ts` (API-02..07, API-17, API-18).
  - Updated `autobyteus-web/__tests__/app.spec.ts` (API-08).
- Cases added, changed, removed, or rechecked: API-R01..R08 reused; API-01, API-01b, API-02..15, API-17, API-18 run; API-16 not tested.
- Commands, environment, fixture, or broader-validation delta:
  - Packaged build `build:electron:mac` from `d76332c669`.
  - Isolated instances with `--test-update-feed`, `--data-root`, `restart`.
  - A re-identified, ad-hoc re-signed copy for the download journey, to protect the installed app's staged update.
  - Real public GitHub repositories, `AutoByteus/autobyteus-agents` and `blader/humanizer`.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution coverage report (all), `follow-ups.md` (FU-003, FU-004)
- Prior result and confidence: N/A
- Current result and confidence: Pass, 94.6%. The 95% default is not met; the gap is bounded (real-network offline and rate limit; signed install).
- New or remaining failure IDs: None in scope. DCF-E2E-002 is a pre-existing intermittent failure that reproduces on the base source (FU-003).
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope:
  - User-only: AC-003 Release page link on the real feed; AC-007 signed install on press.
  - API-16 not tested.
  - Product question: no indicator on Settings pages (AC-004 note).
