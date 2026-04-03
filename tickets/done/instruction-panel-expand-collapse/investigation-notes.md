# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Small`
- Triage Rationale: The behavior is isolated to two frontend detail components with duplicated instruction rendering; no backend, API, or data-model change is needed for the intended UX.
- Investigation Goal: Identify the current instruction-rendering surfaces for agent and team detail pages and determine the lowest-risk reusable way to introduce collapsed/expanded long-instruction behavior.
- Primary Questions To Resolve:
  - Where are agent and team instructions rendered today?
  - Is the current rendering shared or duplicated?
  - Is there an existing reusable markdown/text rendering surface relevant to this work?
  - What interaction pattern best satisfies the user’s request without introducing inner scrollbars?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-03-31 | Command | `git remote show origin` | Resolve workflow bootstrap base branch | Remote HEAD is `personal`; safe bootstrap base is `origin/personal` | No |
| 2026-03-31 | Command | `git fetch origin --prune` | Refresh tracked refs before worktree creation | Remote refs refreshed successfully | No |
| 2026-03-31 | Command | `git worktree add -b codex/instruction-panel-expand-collapse /Users/normy/autobyteus_org/autobyteus-worktrees/instruction-panel-expand-collapse origin/personal` | Create dedicated worktree required by workflow | Dedicated ticket worktree created successfully | No |
| 2026-03-31 | Code | `autobyteus-web/components/agents/AgentDetail.vue` | Inspect current agent detail instruction rendering | Agent instructions render inline as plain text inside a dedicated card with no reuse abstraction | No |
| 2026-03-31 | Code | `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | Inspect current team detail instruction rendering | Team instructions render inline as plain text inside a dedicated card; structure closely mirrors agent detail | No |
| 2026-03-31 | Code | `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Check for an existing shared content renderer | There is an existing markdown renderer, but current instruction detail views do not use it | No |
| 2026-03-31 | Code | `autobyteus-web/components/agents/__tests__/AgentDetail.spec.ts` | Inspect existing agent detail test coverage | Current test verifies instruction text presence only; no long-content UX behavior is covered | Yes |
| 2026-03-31 | Code | `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | Inspect existing team detail test coverage | Current team detail tests focus on member avatar rendering, not instruction behavior | Yes |
| 2026-03-31 | Command | `rg -n "show more|Show less|line-clamp" autobyteus-web` | Check for prior expand/collapse or preview patterns | The app uses line clamping in card/list contexts, but not for detail-view instructions | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-web/components/agents/AgentDetail.vue`
  - `autobyteus-web/components/agentTeams/AgentTeamDetail.vue`
- Execution boundaries:
  - Detail component receives selected definition ID.
  - Store lookup resolves definition payload.
  - Template renders `instructions` directly as text in the detail page.
- Owning subsystems / capability areas:
  - `autobyteus-web/components/agents`
  - `autobyteus-web/components/agentTeams`
  - Potential shared ownership target: `autobyteus-web/components/common`
- Optional modules involved:
  - Frontend detail components only.
- Folder / file placement observations:
  - The two detail pages duplicate the same instruction-card concern and are good candidates for one shared instruction UI component.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/agents/AgentDetail.vue` | Instructions card | Renders agent instructions | Uses `<p class="whitespace-pre-wrap font-mono text-sm">` directly at lines 91-94 | Shared instruction-preview behavior should not remain duplicated here |
| `autobyteus-web/components/agentTeams/AgentTeamDetail.vue` | Instructions card | Renders team instructions | Uses the same plain-text structure directly at lines 109-112 | Same UI concern exists here and should share ownership with agent detail |
| `autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue` | Markdown renderer | Rich-content renderer for conversation/file surfaces | Not currently used for instructions; collapse logic should not depend on it for this task | Any preview component should preserve current plain-text semantics and remain compatible with richer rendering later |
| `autobyteus-web/components/agents/__tests__/AgentDetail.spec.ts` | Agent detail tests | Validates basic instruction/category rendering | Missing coverage for overflow detection and expand/collapse behavior | Test updates will be required after implementation |
| `autobyteus-web/components/agentTeams/__tests__/AgentTeamDetail.spec.ts` | Team detail tests | Validates member avatar behavior | Missing instruction-behavior coverage entirely | Test updates will be required after implementation |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-03-31 | Probe | Code inspection of detail templates with numbered lines | Both screens render full instruction content inline with no preview threshold and no shared component | UX change can be implemented locally in frontend detail views without backend impact |

### Reproduction / Environment Setup

- Required services, mocks, or emulators: none for design-stage investigation.
- Required config, feature flags, or env vars: none.
- Required fixtures, seed data, or accounts: none.
- External repos, samples, or artifacts cloned/downloaded for investigation: none.
- Setup commands that materially affected the investigation:
  - `git fetch origin --prune`
  - `git worktree add -b codex/instruction-panel-expand-collapse /Users/normy/autobyteus_org/autobyteus-worktrees/instruction-panel-expand-collapse origin/personal`
- Cleanup notes for temporary investigation-only setup: dedicated worktree should remain until the task is completed or explicitly abandoned.

## Constraints

- Technical constraints:
  - No source-code edits are allowed until the workflow reaches an implementation-ready stage and the user confirms the design direction.
  - Current detail components render plain text, not rich markdown, so the first implementation should preserve those semantics.
- Environment constraints:
  - The user explicitly wants no inner scrollbar in the instruction card.
  - The user explicitly wants a confirmation step after design and before implementation.
- Third-party / API constraints:
  - None identified.

## Unknowns / Open Questions

- Unknown: precise preview height that feels right on desktop and smaller widths.
- Why it matters: too small makes the preview unhelpful; too large weakens the benefit of collapsing.
- Planned follow-up: propose a concrete starting height in design and tune visually during implementation if approved.

## Implications

### Requirements Implications

- Requirements need an explicit distinction between long-content behavior and short-content behavior.
- Accessibility and reversible expansion should be treated as first-class requirements, not implementation details.

### Design Implications

- The right abstraction is a focused shared instruction-preview component, not another copy-pasted card body.
- Height-based collapse is a better fit than line-clamp-only logic because it works with preserved whitespace and can survive a future move to richer instruction rendering.
- The collapsed state should communicate truncation with both a soft fade and an explicit action, not silent clipping.

### Implementation / Placement Implications

- The likely change set is limited to one new shared frontend component plus both detail views and targeted tests.
- No store/API/schema changes are needed for the requested UX.
