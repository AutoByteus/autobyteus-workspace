# API/E2E Revision Record — openai-gpt-6-1-terra (autobyteus-336)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, `implementation-handoff.md`, IR-001 (direct route) | SR-001, IR-001 | N/A | Pass / 95.5% |

## Revision Entries

### API-REV-001 — Baseline: terra in the server catalog; native and Codex runs priced at terra's rates

- Cases: API-01 (reused IMP-01..07), API-02 (server catalog), API-03 (native run, image, audio refusal, cost), API-04 (Codex run, cost).
- Coverage decisions or durable test paths changed: none.

#### Prior Failure Resolution

None.

- Current result and confidence: Pass, 95.5%. New failures: none. Recommended owner: Delivery Engineer.
- Remaining risks: the 272K tier proven by the unit test only; terra appears last in the alphabetical server list.
