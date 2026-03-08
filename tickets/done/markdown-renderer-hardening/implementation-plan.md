# Implementation Plan - markdown-renderer-hardening

## Scope Classification

- Classification: `Small`
- Reasoning:
  - Frontend-only markdown rendering hardening.
  - No backend/API/schema changes.
  - Structural change is limited to one normalization utility, existing renderer composition, focused tests, and docs.
- Workflow Depth:
  - `Small` -> implementation plan (solution sketch) -> future-state runtime call stack -> runtime review -> implementation -> focused verification -> code review -> docs sync

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/markdown-renderer-hardening/workflow-state.md`
- Investigation notes: `tickets/done/markdown-renderer-hardening/investigation-notes.md`
- Requirements: `tickets/done/markdown-renderer-hardening/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/markdown-renderer-hardening/future-state-runtime-call-stack.md`
- Runtime review: `tickets/done/markdown-renderer-hardening/future-state-runtime-call-stack-review.md`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Stage 5 review gate reached `Go Confirmed`; implementation completed against this plan.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready`: `Yes`
- Acceptance criteria use stable IDs with measurable outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`

## Solution Sketch

- Use Cases In Scope:
  - `UC-001`: explicit inline and block math render correctly in conversation markdown.
  - `UC-002`: markdown links with filesystem-style paths render intact.
  - `UC-003`: prose, filenames, and path-like text remain plain text unless explicitly delimited as math.
  - `UC-004`: renderer hardening follows parser-safe boundaries for future changes.
- Requirement Coverage Guarantee:
  - `R-001` -> `UC-001`
  - `R-002` -> `UC-002`
  - `R-003` -> `UC-002`, `UC-003`
  - `R-004` -> `UC-004`
  - `R-005` -> `UC-003`
- Design-Risk Use Cases:
  - None beyond `UC-004`; the design risk is managed through the parser-safe normalization boundary.
- Target Architecture Shape:
  - Keep `markdown-it` + `@mdit/plugin-katex` as the canonical parser/rendering stack.
  - Keep `normalizeMath` only for narrowly-scoped block-safe normalization.
  - Remove raw-string inline equation guessing from `normalizeMath`.
  - Preserve markdown structure for links, code, and ordinary prose by avoiding inline auto-wrap transforms before parsing.
- New Layers/Modules/Boundary Interfaces To Introduce:
  - None.
- Touched Files/Modules:
  - `autobyteus-web/utils/markdownMath.ts`
  - `autobyteus-web/utils/__tests__/markdownMath.spec.ts`
  - `autobyteus-web/components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts`
  - `autobyteus-web/docs/content_rendering.md`
- API/Behavior Delta:
  - Supported explicit math rendering is preserved.
  - Implicit inline auto-math behavior is removed as a non-guaranteed convenience path.
  - Markdown links and filesystem-like paths remain intact.
- Key Assumptions:
  - Explicit delimiters are acceptable as the stable math authoring contract.
  - Existing provider output already commonly uses explicit delimiters.
- Known Risks:
  - Some previously auto-rendered implicit inline equations will now remain plain text.
  - If a future need for implicit inline math returns, the correct solution will be a markdown-it token-level plugin rather than re-expanding raw-string heuristics.

## Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Principles

- Parser-first: let `markdown-it` own markdown structure before math presentation rules apply.
- No backward-compatibility shims for broken raw-string inline guessing.
- Preserve module boundaries: normalization stays in `markdownMath.ts`, rendering orchestration stays in `useMarkdownSegments.ts`, and UI components remain consumers.
- Prefer explicit behavior over heuristic convenience in the markdown pipeline.

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `tickets/done/markdown-renderer-hardening/future-state-runtime-call-stack.md` | This plan | Runtime modeling from design basis |
| 2 | `autobyteus-web/utils/markdownMath.ts` | Stage 5 `Go Confirmed` | Core behavior change point |
| 3 | `autobyteus-web/utils/__tests__/markdownMath.spec.ts` | `markdownMath.ts` design direction | Utility regression coverage |
| 4 | `autobyteus-web/components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts` | Renderer behavior expectations | End-to-end component regression coverage |
| 5 | `autobyteus-web/docs/content_rendering.md` | Final implemented behavior | Keep docs aligned with explicit math contract |

## Module/File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action | Notes |
| --- | --- | --- | --- | --- | --- |
| Math normalization utility | `autobyteus-web/utils/markdownMath.ts` | Same | Frontend markdown utility | `Keep` | Narrow behavior rather than moving logic |
| Renderer tests | `autobyteus-web/utils/__tests__/markdownMath.spec.ts` | Same | Frontend utility tests | `Keep` | Replace heuristic-inline expectations with hardening expectations |
| Conversation renderer regression test | `autobyteus-web/components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts` | Same | Frontend conversation rendering | `Keep` | Validate actual user-visible failure mode |
| Markdown rendering docs | `autobyteus-web/docs/content_rendering.md` | Same | Frontend docs | `Keep` | Update supported math behavior language |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- |
| R-001 | AC-001, AC-002 | UC-001 | T-001 | Focused utility + component tests | AV-001, AV-002 |
| R-002 | AC-003 | UC-002 | T-001, T-002 | Component link regression test | AV-003 |
| R-003 | AC-004, AC-006 | UC-002, UC-003 | T-001, T-002 | Utility regression tests | AV-004 |
| R-004 | AC-005 | UC-004 | T-003 | Artifact + docs review | AV-005 |
| R-005 | AC-006 | UC-003 | T-001 | Utility regression test | AV-004 |

## Step-By-Step Plan

1. Replace inline raw-string auto-math inference in `markdownMath.ts` with block-safe normalization only.
2. Update utility and component tests to lock explicit math support and markdown-link/path safety.
3. Run focused frontend verification for utility and inter-agent markdown rendering.
4. Update markdown rendering docs to state the explicit-math contract and hardening rationale.

## Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/utils/markdownMath.ts` | Inline auto-wrap heuristics removed; explicit/block-safe normalization preserved | `markdownMath.spec.ts` passes | N/A | Main logic change |
| `autobyteus-web/utils/__tests__/markdownMath.spec.ts` | Expectations align with explicit-math contract and regression coverage | Spec passes | N/A | Utility-level correctness |
| `autobyteus-web/components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts` | Link/path regression and explicit math rendering covered | Spec passes | N/A | User-visible coverage |
| `autobyteus-web/docs/content_rendering.md` | Docs describe supported math forms accurately | N/A | N/A | Stage 9 sync |

## Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/markdown-renderer-hardening/code-review.md`
- Scope (source + tests): markdown normalization utility, renderer regression tests, and docs update.
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - No touched source file should approach the limit; if it does, classify as `Design Impact`.

| File | Current Line Count | Adds/Expands Functionality | SoC Risk | Required Action | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/markdownMath.ts` | Small | `No` | `Medium` | `Keep` with heuristic reduction | `Design Impact` |
| `autobyteus-web/utils/__tests__/markdownMath.spec.ts` | Small | `Yes` | `Low` | `Keep` | `Local Fix` |
| `autobyteus-web/components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts` | Small | `Yes` | `Low` | `Keep` | `Local Fix` |

## Test Strategy

- Unit tests:
  - `pnpm exec vitest --run utils/__tests__/markdownMath.spec.ts`
  - `pnpm exec vitest --run components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts`
- Integration tests:
  - Not required beyond component-level renderer validation for this frontend-only scope.
- Stage 7 handoff notes for API/E2E testing:
  - expected acceptance criteria count: `6`
  - critical flows to validate: explicit math render, markdown link/path integrity, no implicit inline auto-wrap
  - expected scenario count: `5`
  - known environment constraints: browser/E2E harness not required; focused frontend test execution is sufficient for this ticket

## API/E2E Testing Scenario Catalog

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001 | R-001 | UC-001 | API | Inline explicit math renders `.katex`. |
| AV-002 | Requirement | AC-002 | R-001 | UC-001 | API | Block explicit math renders `.katex-display`. |
| AV-003 | Requirement | AC-003 | R-002 | UC-002 | API | Markdown file-path link text and href remain intact. |
| AV-004 | Requirement | AC-004, AC-006 | R-003, R-005 | UC-003 | API | Plain prose and implicit inline equations remain unwrapped. |
| AV-005 | Requirement | AC-005 | R-004 | UC-004 | API | Design/docs artifacts reflect parser-safe renderer policy. |
