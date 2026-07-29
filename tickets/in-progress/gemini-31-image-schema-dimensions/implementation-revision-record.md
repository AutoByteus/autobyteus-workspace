# Implementation Revision Record

## Canonical Artifacts

- Implementation handoff: [`implementation-handoff.md`](./implementation-handoff.md)
- Requirements: [`requirements.md`](./requirements.md)
- Investigation: [`investigation-notes.md`](./investigation-notes.md)
- Design: [`design-spec.md`](./design-spec.md)
- Supplement: [`gemini-image-schema-matrix.md`](./gemini-image-schema-matrix.md)
- Solution revision record: [`solution-revision-record.md`](./solution-revision-record.md)

## Round History

| Round | Trigger / owner | Prior result | Current result | Affected IDs | Routing / implementation impact |
| --- | --- | --- | --- | --- | --- |
| `IR-001` | Initial implementation handoff / `solution_designer` / `SR-001` | N/A | Implementation Ready for source review | `REQ-001` through `REQ-007`; `AC-001` through `AC-008`; `B-IMG-SCHEMA-001` through `B-IMG-SCHEMA-004`; `DS-001` through `DS-004` | Added native Gemini model-specific schemas, provider request normalization, catalog/client/server projection tests, and handoff. Route to `code_reviewer`; `CRR-*` and `API-REV-*` are N/A for this baseline. |
| `IR-002` | Corrected solution rework / `solution_designer` / `SR-002`, triggered by `CR-001` and `CRR-001` | Fail / Requirement Gap (`CR-001`) after `IR-001` | Implementation Ready for fresh source review | `REQ-002`, `REQ-007`; `AC-005`, `AC-008`; `B-IMG-SCHEMA-005`; `DS-001`, `DS-002`, `DS-004` | Changed `gemini-3.1-flash-lite-image` from the stale standard 10-ratio list to the corrected 14-ratio allowlist, retained size `1K`, updated exact catalog assertions, reran focused tests/builds, and routed back to `code_reviewer`. |

## Baseline Notes

The current code and `implementation-handoff.md` are authoritative. This record
is only the chronological implementation index for `IR-001` and `IR-002`; it does
not replace the solution artifacts or repeat their detailed design. `IR-002`
references `SR-002`, `CR-001`, `CRR-001`, and the corrected implementation
rework evidence.
