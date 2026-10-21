# API/E2E Revision Record — remote-node-runtime-sign-in

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, round 1 | SR-002 (SR-003/SR-004), IR-001 | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: remote-desktop sign-in validated on real backends and a real Docker node

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md`, round 1
- Triggering finding or case IDs: N/A
- Related revision IDs: SR-002 (design), SR-003/SR-004 (scope), IR-001 (`c0b385524`)
- Why this baseline was recorded: first completed API/E2E result on the direct Medium / Low route
- Coverage decisions or durable test paths changed: server E2E `agent-runtimes-graphql.e2e.test.ts` AR-13 added; settings probe extended with a desktop-browser backend (ARP-11, ARP-12), the API fact in ARP-08 and a two-node scan in ARP-10
- Cases added, changed, removed, or rechecked: API-01…API-05 reused from IMP-02…IMP-07; API-06, API-07 durable; API-08 temporary Docker-node journey
- Commands, environment, fixture, or broader-validation delta: broader validation on a test-owned container of the user's image with the branch dist; no vendor account

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, evidence `API-06…API-08`
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none (FU-003 out of scope)
- Recommended owner: Delivery
- Remaining risks, blocked evidence, or untested scope: AC-001/AC-002 end and AC-007 only the user can check on the user's node running this build (R-01, R-02)
