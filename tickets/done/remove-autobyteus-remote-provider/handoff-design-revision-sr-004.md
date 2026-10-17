# Handoff — Architecture Design Complete (revised, SR-004)

- Result classification: `Architecture Design Complete` (revised package)
- Package identifier: `remove-autobyteus-remote-provider`
- Current solution revision: `SR-004`
- Date: 2026-10-12
- From: Solution Designer (`/software_engineering_team/solution_designer`)
- Route applied: handoff rule "revised architecture package with task_size=Large or architectural_risk=High → independent architecture review" → `/software_engineering_team/architecture_reviewer`. The code reviewer expected "implementation → source re-review", but the configured rule for a revised Large/High package routes through architecture review first.

## Trigger

Design Impact CR-001 from `/software_engineering_team/code_reviewer` (round CRR-003, superseding the CRR-001 Pass). The user asked on 2026-10-12, as quoted by the code reviewer: "if its small why not just do it in this ticket".

## What Changed In The Design (delta only)

- **Moved from Follow-up to In This Change:** remove the single-valued `MultimediaRuntime`:
  - delete `autobyteus-ts/src/multimedia/runtimes.ts` and its `multimedia/index.ts` export;
  - remove the media `runtime` option and field (and its `toString()` mention) from `AudioModel`/`ImageModel`/`VideoModel`;
  - reduce the six `runtime === MultimediaRuntime.API && provider === GEMINI` checks (`{audio,image,video}-model.ts` `createClient`, `{audio,image,video}-client-factory.ts` `requiresGeminiRuntimeResolver`) to `provider === MultimediaProvider.GEMINI`;
  - drop the by-runtime logging in `autobyteus-server-ts/src/multimedia-management/providers/video-model-provider.ts` (an extra dead consumer I found);
  - server `mapMedia` (`api/graphql/types/llm-provider-model-catalog.ts`) emits `runtime: 'api'`;
  - delete `tests/unit/multimedia/runtimes.test.ts` and update affected tests and mocks.
- **Corrected rationale:** SR-003 claimed removal "would reshape the shared GraphQL `ModelDetail` contract". That is wrong. The field stays for LLM rows, media rows emit `'api'`, and the web never reads media `runtime`. There is no schema, web or observable-value change.
- **Kept as an explicit Follow-up:** the server dynamic-source `modelKind` (always `LLM` now; ARCH-REV-001 R-003). It feeds the GraphQL `ModelSourceStatus.modelKind` field, which the web reads, so removing it would be a contract change.
- Design sections changed: Solution basis, Task Design Health (deferrals), Removal / Decommission Plan, Shared Structure check, Key Tradeoffs, Change / Refactor Sequence step 6.

## Approval And Classification

- Requirements: `Approved` (SR-002, 2026-10-11) and unchanged in intended behavior. SR-004 adds only a known-limitation note (below). No renewed approval is needed: no product behavior, data or GraphQL shape changes, and the user requested the inclusion.
- Classification unchanged: `task_size=Large`, `architectural_risk=High` (whole package). The SR-004 delta itself is small and low-risk.

## Known Pre-Existing Limitation (recorded, not in scope)

API/E2E OBS-001: for a stopped native run whose saved model is no longer offered, the resume flow refuses every replacement (`run-model-selection-service.ts:68`, "Both models need verified context capacities before replacement."). SCN-004's "picks another model" therefore does not work on that surface. It also happens for any unavailable model (for example LM Studio). This is a separate-ticket candidate, raised with the user, and recorded in requirements-doc "Out Of Scope". AC-004 still holds.

## Current Downstream State (from the code reviewer)

- Implementation: commits `4196f55a5`, `fdb7635f3`, `ac3868577` on `codex/remove-autobyteus-remote-provider`; uncommitted API/E2E test files in the worktree.
- API/E2E passed (API-REV-002); the proportional test re-review passed (CRR-004). Delivery is held for this Design Impact.
- The expected route after design review is implementation of the SR-004 delta → source re-review → API/E2E rerun → proportional test review → delivery.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider`
- Branch: `codex/remove-autobyteus-remote-provider`
- Base: `origin/personal` @ `beb6b3b494779eba207feac94a70cb050db7dcbc`
- Finalization target: `origin/personal`

## Artifacts (absolute paths, ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-remote-provider/tickets/in-progress/remove-autobyteus-remote-provider/`)

- Requirements: `.../requirements-doc.md`
- Investigation notes: `.../investigation-notes.md`
- Design spec: `.../design-spec.md`
- Solution revision record: `.../solution-revision-record.md`
- Prior design review: `.../design-review-report.md` (ARCH-REV-001 Pass on SR-003; does not cover SR-004), `.../architecture-review-revision-record.md`
- Code review: `.../code-review-report.md` (CRR-003, CR-001), `.../code-review-revision-record.md`
- Implementation: `.../implementation-handoff.md`, `.../implementation-revision-record.md`
- API/E2E: `.../api-e2e-execution-coverage-report.md`, `.../api-e2e-coverage-investigation.md`, `.../api-e2e-revision-record.md`, `.../api-e2e-test-case-ledger.md`, `.../api-e2e-test-review-report.md`
- Supplemental and Product Design artifacts: N/A — not applicable

## Expected Next Action

Independent architecture review of the SR-004 revision. On Pass, the reviewer routes to implementation for the delta.
