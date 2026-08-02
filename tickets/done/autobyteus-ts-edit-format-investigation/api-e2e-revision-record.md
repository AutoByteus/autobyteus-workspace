# API/E2E Revision Record

The latest coverage investigation and execution coverage report are authoritative. This file preserves the concise history of completed API/E2E rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `code_reviewer` / `code-review-report.md` (`CRR-002`) / API/E2E round 1 | `SR-002`, `ARCH-REV-002`, `IR-002`, `CRR-002` | `N/A` | `Pass / 98.3%` |

## Revision Entries

### API-REV-001 — Initial deterministic and native live-agent validation baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/code-review-report.md`; API/E2E execution round 1.
- Triggering finding or scenario IDs: `CRR-002` Pass resolving `CR-001`; user-requested fresh production-level agent benchmark; `REP-001`-`REP-007`, `LIVE-001`-`LIVE-006`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-002`, `ARCH-REV-002`, `IR-002`, `CRR-002`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: First completed API/E2E result for the reviewed clean-cut context-patch implementation and catalog contraction.
- Coverage decisions or durable test paths changed: None. All relevant current coverage stayed valid; API/E2E added, updated, or removed no repository-resident durable test.
- Scenarios added, changed, removed, or rechecked: Rechecked canonical/invalid patch semantics, disk atomicity/path/protection, schema/transport, registry removal, native approval lifecycle, persisted stale-name direct use, builds/package/large-file behavior, known baselines, four live edit journeys, provider threshold, safe rejection/recovery, and cleanup.
- Commands, environment, fixture, or broader-validation delta: Executed 11 focused files / 91 tests, selected approval, server resolver, clean core/server builds, broad baseline suites, structural/package/built probe checks, then 120 native live-agent runs using actual DeepSeek V4 Flash, Gemini 3.5 Flash, and GPT-5.6-sol registrations. The schema-only stage was 57/60 first-edit and 60/60 exact-final/sentinel with three safe recoveries; the exact explicit cohort was 60/60 first-edit/exact-final/sentinel and 20/20 per provider.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/api-e2e-coverage-investigation.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-edit-format-investigation/tickets/done/autobyteus-ts-edit-format-investigation/api-e2e-execution-coverage-report.md`; this revision record; retained evidence under `benchmark-evidence/`.
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass / 98.3%`
- New or remaining failure IDs: None. Known unrelated baseline failures remain five core-unit and two approval-flow assertions; schema-only provider drift remains dated evidence, not an unresolved product failure.
- Recommended recipient: `code_reviewer` for proportional test-code review; `Not Applicable` expected because no durable test changed.
- Remaining risks, blocked evidence, or untested scope: Provider behavior can drift after 2026-08-02; repetitive/invalid model patches can require safe retry; unknown custom persisted sources rely on the generic resolver invariant; delivery owns remote integration; concurrent writer/browser/desktop/full SWE-bench remain out of scope. No validation blocker remains.
