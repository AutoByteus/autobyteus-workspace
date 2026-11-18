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
