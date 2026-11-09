# API/E2E Revision Record — autobyteus-450

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md` IR-002, round 1 (direct route) | SR-003, IR-002 | N/A | Pass / 95.6% |

## Revision Entries

### API-REV-001 — Baseline: attachments open on the phone, every open shows current content; MSP-28…31; the real app

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-002), round 1.
- Triggering finding or case IDs: N/A (first validation); the handoff's asks: phone-bundle MSP cases (attachments of every kind, drafts, workspace path, another node's notice, rewritten text and image), the desktop window (AC-003), the emulator (ASM-001, viewer never pairing, MSP-13 still pairing).
- Related revision IDs: SR-003, IR-002.
- Coverage decisions or durable test paths changed: added `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs` (MSP-28…31); updated `mobile-shell-probe.mjs` (call, header, runtime note).
- Cases: API-01…04 reused; MSP-28…31 new; API-05 the full probe; API-06 the emulator journey (three combinations of page and APK).
- Commands, environment, fixture, or broader-validation delta: browser (phone bundle, `nuxt dev` desktop window) and Android emulator; a temporary base worktree for the old page and APK.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`.
- Prior result and confidence: N/A.
- Current result and confidence: `Pass`, 95.6%; every AC proven, none user-only; ASM-001 confirmed.
- New or remaining failure IDs: none in this change. The full probe's verdict is `Fail` on autobyteus-446 FU-003's lines (pre-existing).
- Recommended owner: delivery engineer.
- Remaining risks: autobyteus-446 FU-003; FU-001 (out of scope); an old APK with a new page (design note).
