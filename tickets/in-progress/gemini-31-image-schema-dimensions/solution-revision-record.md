# Solution Revision Record

## Canonical Artifacts

- Requirements: [`requirements.md`](./requirements.md)
- Investigation: [`investigation-notes.md`](./investigation-notes.md)
- Design: [`design-spec.md`](./design-spec.md)
- Supplement: [`gemini-image-schema-matrix.md`](./gemini-image-schema-matrix.md)

## Round History

| Round | Trigger / owner | Prior result | Current result | Affected IDs | Routing / implementation impact |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Initial solution design handoff / `solution_designer` | N/A | Implementation Ready | B-IMG-SCHEMA-001 through B-IMG-SCHEMA-004; REQ-001 through REQ-007; AC-001 through AC-008; DS-001 through DS-004 | Handoff to `implementation_engineer`. Add native Gemini model schemas, normalize snake_case image controls into SDK `responseFormat.image`, add focused tests, and preserve existing model/default behavior. |
| SR-002 | `code_reviewer` source review finding `CR-001` / Requirement Gap | Implementation Ready; review result `Fail / Requirement Gap` | Implementation Ready for corrected rework | CR-001; B-IMG-SCHEMA-005; REQ-002; AC-005; DS-001, DS-002, DS-004; `gemini-image-schema-matrix.md` | Current Google documentation confirms Lite supports 14 total ratios, not the initial standard 10. Correct the requirements, investigation, design, and matrix; route back to `implementation_engineer` to expand the Lite catalog/test allowlist. Retain Lite size `1K` only and record the guide's conflicting 512 table cell as residual provider-doc risk. Do not advance to API/E2E until source review passes. |

## Readiness Checks

- Requirements are design-ready and include explicit supported use cases,
  stable requirement/acceptance IDs, behavior preservation, and supplement
  inventory.
- Investigation records the dedicated branch/worktree, exact local owners,
  current schema suppression cause, provider sources, and dependency setup
  blocker.
- Design maps all approved behavior to complete production spines and has no
  unresolved requirement, ownership, boundary, migration, or compatibility gap.
