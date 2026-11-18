# API/E2E Revision Record — autobyteus-526

### API-REV-001 — round 1

- Trigger: IR-001 (implementation engineer, direct route); no prior round.
- Coverage decisions:
  - New durable RR-10 and RR-11 in the restart suite.
  - New MSP-75 phone case (own module).
  - A desktop journey.
  - Base comparison for RR-10 and MSP-75.
- Result and confidence: Fail (F-1), high confidence in the failure.
- Failure: F-1. The reminder card is shown twice: live on the phone and the desktop, and on the desktop after a reload of a live run. It is pre-existing and web-side; the server sends one notice. Replies are no longer hidden.
- Recommended owner: code reviewer (failure-origin review). My classification: Design Impact.
- Remaining: DEC-003 reported (old runs' turns stay merged). Linux not run.

### API-REV-002: round 2 (SR-002, IR-002)

- Trigger: code reviewer CRR-002 Pass, Medium/High after ARCH-REV-001, resolving CR-001 / F-1.
- Cases rechecked: RR-01..06, RR-10, RR-11, MSP-75, the desktop journey, the typecheck. Reused: IMP-05, IMP-08.
- Cases added:
  - `platform-notice-identity.e2e.test.ts` PNI-01..04: agent stream, team stream, Org view presentation, live Claude;
  - MSP-76 and MSP-77: a Team coordinator's and an Org member's notice on the phone;
  - a Claude notice on the desktop.
- Prior failure: F-1 is resolved. MSP-75 gives 1/2/2 cards; the desktop gives 1 and 2 cards, both live and after a reload of a live run.
- Result: Pass, 94%.
- Recommended owner: code reviewer (proportional test-code review).
- Remaining: DEC-003's UI not opened (projection reported); Linux not run.
