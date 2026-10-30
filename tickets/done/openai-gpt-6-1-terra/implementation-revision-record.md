# Implementation Revision Record — openai-gpt-6-1-terra (autobyteus-336)

Current code and `implementation-handoff.md` are authoritative. This index locates implementation rounds; it is not proof of downstream acceptance.

## Revision Index
| Revision | Trigger / round | Findings | Classification | Related revisions | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, Architecture Design Complete (SR-001), initial | N/A | Initial baseline; Small / Low | SR-001; ARCH-REV, CRR, API-REV and DR N/A | Implementation Complete; direct API/E2E ready |

## IR-001 — gpt-6.1-terra in the catalog; live Codex tests default to it
- **Trigger:** the completed design SR-001 on the user-approved requirements. Initial implementation.
- **Result:** **Implementation Complete**. Commits `11fc06b3be`, `95e7aaa2a9`, `a379763339` (TESTING.md, on its own) and `2d076b0ce7`.
- **Delta:**
  - Catalog row: 1.05M / 922K / 128K, none..max reasoning with default medium, images only.
  - Prices $1 / $0.05 / $1.25 / $5, with the 272K tier.
  - Optional cache-read argument on `createOpenAILongContextPricing`; the default is unchanged.
  - Catalog unit test updated; the two Codex test defaults changed; TESTING.md rule; catalog doc.
- **Validation:**
  - Reproduction: 2/23 fail before the change.
  - Before/after dump: 32 rows identical, 1 added.
  - Unit suites 2,090/2,090; typechecks 0.
  - Server `test:unit` 880 files / 7,467 tests passed; prebuild and typecheck 0 (`IMP-04`).
  - One live terra call through the catalog: "terra-ok", trusted pricing.
  - Factory list and `read_file` media refusals for terra.
  - Codex surface test on terra 4/4, with `model: gpt-6.1-terra` in each captured request (`IMP-07`).
- **Classification recheck:** Small / Low confirmed; lightweight self-review done.
- **Next route:** direct to `/software_engineering_team/api_e2e_engineer`.
- **Remaining:** the server catalog, Settings view and a cost-estimated run through the server are left to API/E2E. FU-001 stays a follow-up.
