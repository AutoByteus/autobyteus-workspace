# Implementation Revision Record — autobyteus-646

## IR-001 — SR-004 … SR-010 implemented (initial implementation, cumulative)

- **Basis:**
  - design-spec.md § SR-004 Revisions R-1 … R-16;
  - SR-005 … SR-010;
  - ARCH-REV-005 Pass on SR-010.
- **History within IR-001:**
  - Built SR-004 (R-1 … R-7).
  - Raised IQ-002 → SR-006, IQ-003 → SR-007 and IQ-004 → SR-008, and built them.
  - Held the live switch, the in-flight map, the classification and the retention while ARCH-REV-003/004 were open.
  - Then built SR-009 (R-11 … R-14) and SR-010 (R-15, R-16, AR-012) as the reviewer lifted the hold.
- **Replaced on the way:**
  - R-1's use of the person's Save → the own automatic switch per root (R-11);
  - the listener's in-flight set → the roots' state guard (R-12);
  - the detector's limits read → per-backend classification and `ERROR_CLASSIFIED` (R-13, R-16);
  - the continue message as an unseen system input → `present_as_notice` (R-10).
- **Evidence:**
  - `evidence/IMP-03` (built-server E2E 8/8);
  - `IMP-04` (server unit);
  - `IMP-05` (integration);
  - `IMP-06` (autobyteus-ts);
  - `IMP-07` (web);
  - `IMP-08` (contracts);
  - `IMP-09` (two-server E2E);
  - `IMP-10` (browser probe).
  - IMP-01/02 are the earlier full runs before SR-009.
- **Handoff:** `implementation-handoff.md` → code review.
