# API/E2E Revision Record — autobyteus-585

### API-REV-001 — first validation (IR-001)

- Trigger: implementation engineer, direct route (Small / Low).
- Coverage:
  - web typecheck and guards;
  - the full web unit suite;
  - the desktop probe, plus a zh-CN and dark variant;
  - MSP-75..77 and MSP-99;
  - the whole phone suite;
  - background-contention;
  - base comparisons.
- Test change: MSP-75..77 rewritten to find notice rows by label, because this ticket made their header-text lookup untrue.
- Result: Pass, 95%.
- Follow-ups: FU-001 and FU-002 (both pre-existing, with base evidence).
- Recommended owner: delivery engineer.
