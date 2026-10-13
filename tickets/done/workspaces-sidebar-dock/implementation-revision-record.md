# Implementation Revision Record — workspaces-sidebar-dock

Current code and `implementation-handoff.md` are authoritative; this index locates implementation rounds, not proof of downstream acceptance.

## Revision Index
| Revision | Trigger / round | Findings | Classification | Related revisions | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / solution-handoff.md / SR-002 initial | N/A | Initial Baseline; Medium/Low | SR-001, SR-002; ARCH-REV/CRR/API-REV/DR N/A | Implementation Complete; direct API/E2E ready |

## IR-001 — Candidate-relative dock capacity
- Trigger: completed SR-002 design against approved R1/SR-001, cumulative `solution-handoff.md`; initial implementation, finding IDs N/A.
- Prior authoritative result: **N/A**. Current result: **Implementation Complete**, current source/test commit `1262714f6494a1292b69bda1f0cda02f2c2f1014`.
- Related solution revisions: SR-001, SR-002. Architecture-review, code-review, API/E2E and delivery revisions: **N/A** each, none inferred from missing records.
- Basis: record initial implementation baseline before handoff, not a release/native/user-runtime pass.
- Affected behaviors: BEH-001–004; REQ-001–005; implementation geometry/interaction coverage AC-001–005, preservation/delivery evidence contributes AC-006–007 with independent/runtime work still required.
- Delta: existing policy computes candidate-relative effective right width for fit, prospective redock and output; provider supplies raw retained preferred width. Width/intent state and modal owners unchanged. Two production files plus five test files under existing layout owners; source/test commit above. Replaced obsolete oversized-preference expectation, removed redundant forwarding/ignored width parameters, no compatibility path or migration.
- Validation: real-pointer clean pre-edit 1440 baseline reproduces drawer/scrim; changed Team/Activity wide/narrow/short/automatic/520-nav rendered inspection and pointer hit checks; controlled retained workspace/member selection switches with exact conversation/unique selected row and route preservation. Final focused+adjacent **15 files / 146 passed**; old-source regression discrimination **17 expected failures**; current web build and boundary guard pass. Logs and preview evidence in `implementation-handoff.md`.
- Classification recheck: **Medium/Low confirmed**; bounded existing geometry/provider owners, no public contract/persistence/security/runtime/deployment change. Lightweight self-review complete; source-file size policy 499→497 non-empty lines, source deltas below 220.
- Next route: direct `/software_engineering_team/api_e2e_engineer` when implementation-complete Medium/Low rule applies; no independent code/architecture review artifacts applicable.
- Remaining limitations: independent executable/durable browser probe and current isolated desktop/native selection/work preservation coverage; actual affected installed client/version/8001 connection unknown; no merge/release/installed update. Existing compact Team header crowding at approved center minimum is separate polish follow-up, not a reason to change this ticket's floor.
