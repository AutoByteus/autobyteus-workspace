# API/E2E Coverage Investigation — agpl-dual-licensing, Slice 1

> Not legal advice. The wording, the §7 permission and the commercial terms still need lawyer review (REQ-011).

## Investigation Meta

- Package: requirements-doc.md, investigation-notes.md, solution-revision-record.md (SR-003; SR-004 seen as uncommitted Solution Designer edits that say "Slice 1 impact: None"), design-spec.md, implementation-handoff.md, implementation-revision-record.md (IR-001)
- Design review, architecture review, code review: `N/A — not applicable` (direct route)
- Round: 1 (initial), triggered by implementation_engineer IR-001, commit `e1ee19dd3`
- Ledger: not used (a few quick text checks; no long-running or interruption-prone cases)

## Routing Classification

- Small / Low, direct low-risk route. On success, route to Delivery.
- Test-code review: `Not Required — direct low-risk route` (no test code changed)

## Basis And Changed Surface

- The change is licence text, Markdown and one `license` key in each of 9 `package.json` files. No code reads these at runtime. The only build consumer is npm/pnpm packing (`files: ["LICENSE"]`).
- Affected surface: contract (licence text and metadata) plus package packing. No backend, API, UI, desktop, lifecycle, persisted-data (`Not Affected`) or external-integration surface is affected.
- Scenarios: SCN-001, SCN-003, SCN-004 (text and metadata parts). SCN-002 (REQ-009 table) is delivery's. SCN-005 and SCN-006 are Slice 2.
- Testing guideline: `TESTING.md` (root). It has no layer for licence text. Following its rule to use the smallest layer that proves the change, the checks are direct text, metadata and pack checks.

## Existing Durable Coverage

- No test asserts licence text or `license` fields. `autobyteus-web/tests/integration/novnc-package-contract.integration.test.ts` reads noVNC's own third-party licence files, so it is out of scope and unaffected.

## Coverage Decision

- Durable coverage to add, update or remove: **None**. The user confirmed on 2026-10-08 that a text-only change needs no test suite. The repeatable REQ-010 checker is Slice 2 scope.
- Use temporary executable checks only (commands are in the execution report).

## Post-Repository Confidence And Broader Validation

- Scores: see the execution report (overall 96%).
- Broader validation: `Not Required`. There is no runtime, UI or desktop behavior to exercise. The changed boundary (file bytes, manifest field, tarball contents) was checked directly.
- Deferred by design: GitHub `agpl-3.0` detection after merge (delivery); binaries/Docker/CLA (Slice 2).
