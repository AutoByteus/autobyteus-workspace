# Implementation Plan - team-math-message-rendering

## Scope Classification

- Classification: `Small`
- Reasoning: isolated frontend rendering path and tests; no backend contract changes.
- Workflow Depth: `Small` path with solution sketch -> runtime call stack -> runtime review gate.

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/team-math-message-rendering/workflow-state.md`
- Investigation notes: `tickets/in-progress/team-math-message-rendering/investigation-notes.md`
- Requirements: `tickets/in-progress/team-math-message-rendering/requirements.md` (`Design-ready`)

## Plan Maturity

- Current Status: `Draft`
- Notes: Will be marked `Ready For Implementation` after Stage 5 `Go Confirmed`.

## Solution Sketch

- Use Cases In Scope:
  - `UC-001`: render professor-sent math problem in student inter-agent message card.
  - `UC-002`: preserve normal plain-text readability and sender metadata.
- Target Architecture Shape:
  - Reuse existing markdown math rendering pipeline by embedding `MarkdownRenderer` inside `InterAgentMessageSegment`.
  - Keep sender label + detail toggle outside markdown body.
- Touched Files/Modules:
  - `autobyteus-web/components/conversation/segments/InterAgentMessageSegment.vue`
  - `autobyteus-web/components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts`
- API/Behavior Delta:
  - UI-only: inter-agent content switches from plain text interpolation to markdown+KaTeX rendering.
- Key Assumptions:
  - Incoming `segment.content` stays a string payload that may contain markdown and LaTeX delimiters.
- Known Risks:
  - Minor visual spacing differences in message layout.

## Runtime Call Stack Review Gate Summary (placeholder)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pending | Pending | Pending | Pending | N/A | N/A | Pending | 0 |
| 2 | Pending | Pending | Pending | Pending | N/A | N/A | Pending | 0 |

## Go / No-Go Decision

- Decision: `No-Go` (pending Stage 5)

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `InterAgentMessageSegment.vue` | Existing `MarkdownRenderer` | Main behavior change point |
| 2 | `InterAgentMessageSegment.spec.ts` | Updated component DOM structure | Validate AC-001..AC-004 |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- |
| R-001 | AC-001, AC-002 | UC-001 | T-001 | Unit component test | AV-001, AV-002 |
| R-002 | AC-001, AC-002 | UC-001 | T-001 | Unit component test | AV-001, AV-002 |
| R-003 | AC-003, AC-004 | UC-002 | T-002 | Unit component test | AV-003, AV-004 |

## Step-By-Step Plan

1. Replace plain text body in `InterAgentMessageSegment.vue` with `MarkdownRenderer` content region while preserving sender + details toggle behavior.
2. Extend unit tests to verify math rendering path (`.katex` / `.katex-display`) and unchanged metadata/sender behavior.
3. Run targeted frontend tests and capture results in implementation progress.

## Test Strategy

- Unit tests:
  - `pnpm -C autobyteus-web vitest --run components/conversation/segments/__tests__/InterAgentMessageSegment.spec.ts`
- Integration/E2E:
  - Not required for this isolated rendering fix in this pass.
- Stage 7 scenarios:
  - AV-001 inline math render.
  - AV-002 block math render.
  - AV-003 plain text unchanged.
  - AV-004 sender/metadata behavior retained.
