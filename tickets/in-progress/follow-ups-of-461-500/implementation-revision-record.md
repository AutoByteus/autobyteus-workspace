# Implementation Revision Record: follow-ups-of-461-500

## IR-001 (baseline)

- **Trigger:**
  - ARCH-REV-003 Pass (the combined package);
  - ARCH-REV-005 (G-5 added, SR-011 / SR-012);
  - ARCH-REV-006 (the FU-021 environment probe, SR-013).

  Large / High.
- **Prior result:** N/A (baseline).
- **Upstream revisions:** SR-006 … SR-013; ARCH-REV-001, ARCH-REV-003, ARCH-REV-005, ARCH-REV-006. CRR / API-REV / DR:
  N/A.
- **Behavior / requirements:**
  - Implemented: REQ-001, REQ-002, REQ-004 … REQ-009, REQ-011 … REQ-014 and REQ-016.
  - REQ-010 (FU-035) is open: step 0 is blocked by the Grok usage limit (IMP-011).
  - REQ-008's watcher part (AC-005) is not shown: the probe labels most hang guards as product failures under load
    (IMP-012).
  - REQ-003 and REQ-015 were dropped by the user.
- **Code delta:** the commits in `implementation-handoff.md` "Current Implementation Summary".
  - The steps run `75ee688dad` … `4277f1945e`.
  - Then `1eed3c4aff` (two files back under 500 lines) and `d8ffc77c8b` (G-5's budget constant, for the dependency
    direction).
- **Focused validation:** IMP-01 … IMP-12 (handoff "Checks Run").
- **Limitations:**
  - FU-035 and FU-021 need a decision (handoff "Open: needs a decision").
  - M-6 is not strictly cold.
  - The e2e text updates and the G-5 browser render were not run by me.
