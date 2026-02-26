# Requirements

## Status
Design-ready

## Goal / Problem Statement
Remove deprecated acronym wording from `autobyteus-server-ts` and align test terminology with current provider-based source logic (`AUTOBYTEUS` provider checks).

## In-Scope Use Cases
- Update all test descriptions, literals, and model identifiers that use deprecated wording.
- Ensure wording and setup align with provider checks in source processors.
- Verify no whole-word matches of the deprecated acronym remain in `src/` and `tests/`.

## Acceptance Criteria
- `rg -n -i "\\brpa\\b" src tests` returns no matches.
- Updated tests reflect provider-based semantics (`AUTOBYTEUS` vs non-`AUTOBYTEUS`).
- Targeted unit tests for touched files pass.

## Constraints / Dependencies
- No backward-compat wrapper for old naming.
- Keep changes focused to wording and test alignment.

## Assumptions
- Whole-word search (`\\brpa\\b`) is the canonical deprecation target for this cleanup.

## Open Questions / Risks
- Risk: stale JS tests can drift from TS tests; mitigate by aligning both touched JS/TS files.

## Scope Triage
- Size: Small
- Rationale: localized test updates across three files, no production logic changes, no API/schema/storage impact.
