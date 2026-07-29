# Implementation Revision Record

## Canonical Artifacts

- Implementation handoff: [`implementation-handoff.md`](./implementation-handoff.md)
- Requirements: [`requirements.md`](./requirements.md)
- Investigation: [`investigation-notes.md`](./investigation-notes.md)
- Design: [`design-spec.md`](./design-spec.md)
- Supplement: [`gemini-image-schema-matrix.md`](./gemini-image-schema-matrix.md)
- Solution revision record: [`solution-revision-record.md`](./solution-revision-record.md)
- Code review report: [`code-review-report.md`](./code-review-report.md)
- Code review revision record: [`code-review-revision-record.md`](./code-review-revision-record.md)
- API/E2E execution report: [`api-e2e-execution-coverage-report.md`](./api-e2e-execution-coverage-report.md)
- API/E2E revision record: [`api-e2e-revision-record.md`](./api-e2e-revision-record.md)

## Round History

| Round | Trigger / owner | Prior result | Current result | Affected IDs | Routing / implementation impact |
| --- | --- | --- | --- | --- | --- |
| `IR-001` | Initial implementation handoff / `solution_designer` / `SR-001` | N/A | Implementation Ready for source review | `REQ-001` through `REQ-007`; `AC-001` through `AC-008`; `B-IMG-SCHEMA-001` through `B-IMG-SCHEMA-004`; `DS-001` through `DS-004` | Added native Gemini model-specific schemas, provider request normalization, catalog/client/server projection tests, and handoff. Route to `code_reviewer`; `CRR-*` and `API-REV-*` are N/A for this baseline. |
| `IR-002` | Corrected solution rework / `solution_designer` / `SR-002`, triggered by `CR-001` and `CRR-001` | Fail / Requirement Gap (`CR-001`) after `IR-001` | Implementation Ready for fresh source review | `REQ-002`, `REQ-007`; `AC-005`, `AC-008`; `B-IMG-SCHEMA-005`; `DS-001`, `DS-002`, `DS-004` | Changed `gemini-3.1-flash-lite-image` from the stale standard 10-ratio list to the corrected 14-ratio allowlist, retained size `1K`, updated exact catalog assertions, reran focused tests/builds, and routed back to `code_reviewer`. |
| `IR-003` | API/E2E failure-origin rework / `code_reviewer` / `CRR-003`, triggered by `API-REV-001` and `API-FAIL-001` | Fail / Local Fix (`API-FAIL-001`) after `IR-002` | Implementation Ready for fresh source review | `REQ-003`, `REQ-004`; `AC-003`, `AC-004`; `B-IMG-SCHEMA-002`, `B-IMG-SCHEMA-003` | Replaced unsupported `responseFormat.image` construction with installed SDK `imageConfig` mapping, preserved merge/no-config/edit behavior, updated mock assertions, added raw `@google/genai` 1.42.0 serialization coverage, reran focused tests/builds, and routed back to `code_reviewer`; next API/E2E rerun is `GEMINI-API-E2E-003` through `005`. |

## Baseline Notes

The current code and `implementation-handoff.md` are authoritative. This record
is only the chronological implementation index for `IR-001` through `IR-003`; it
does not replace the solution artifacts or repeat their detailed design. `IR-002`
references `SR-002`, `CR-001`, `CRR-001`, and the corrected Lite implementation
evidence. `IR-003` references `CRR-003`, `API-REV-001`, `API-FAIL-001`, and the
SDK serializer correction evidence.
