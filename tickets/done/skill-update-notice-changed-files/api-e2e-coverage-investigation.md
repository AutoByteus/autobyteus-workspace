# API/E2E Coverage Investigation — `skill-update-notice-changed-files`

## Investigation Meta

All `…/` paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-update-notice-changed-files/tickets/in-progress/skill-update-notice-changed-files/`.

- Requirements doc: `…/requirements-doc.md` (SR-001, approved within the direction; the user was informed).
- Investigation notes: `…/investigation-notes.md`.
- Solution history: `…/solution-revision-record.md`, `…/solution-handoff.md`.
- Design spec: `…/design-spec.md` (SR-001).
- Implementation: `…/implementation-handoff.md` (IR-001), `…/implementation-revision-record.md`, `…/implementation-evidence/` (two dev-stack screenshots).
- Not applicable on the direct route: design review, code review.
- API/E2E revision ID: `API-REV-001`; round 1; trigger: IR-001 from `/software_engineering_team/implementation_engineer`.
- Code under test: `codex/skill-update-notice-changed-files`:
  - source and tests: `a059e210f`;
  - ticket records: `95a490ff1`;
  - base: `origin/personal@cba5563a5d`.

## Routing Classification

- Task size: `Small`. Architectural risk: `Low`.
- Route: direct. Successful output goes to delivery.
- Proportional test-code review: `Not required` by policy, given the direct route and Small/Low.

## Requirement And Design Basis

| Requirement | Acceptance criterion | Behavior | Owner |
| --- | --- | --- | --- |
| REQ-001, REQ-002, REQ-003 | AC-001, AC-002 | one sentence per package with its folder; exact files with status; closing lines | `diffSkillVersion`, `buildSkillUpdateNoticeText` |
| REQ-004, REQ-005 | AC-003, AC-004 | removed-skill block; order; cap of 10 | builder |
| REQ-006 | AC-001, AC-005 | header byte-identical; readable Markdown in the card | builder; web `SystemTaskNotificationSegment` (unchanged) |
| REQ-007 | AC-005 | one notice per run per change; delivery on every runtime unchanged | unchanged service |

- Assumption ASM-001: an agent resolves the listed relative paths against the shown folder. This must hold on real runtimes, because the notice no longer gives any absolute `SKILL.md` path.

## Changed Behavior Summary

- `SkillChange.updated` becomes `{skillName, skillDir, files: {path, status}[]}`. `changedFiles` and `skillMdPath` are removed (deviation 1 drops `skillMdPath`, since nothing reads it).
- The notice text is reworded. Delivery, the watcher, the store, the web component and the header are unchanged.

## Changed Surface And Boundary Classification

| Surface | Class | How it is reached |
| --- | --- | --- |
| Notice text sent to the agent (provider input) | changed contract text | scripted AGY echo (exact provider input); live runtimes |
| Notice in the web card (Markdown) | rendering of new content by an unchanged component | web component test; desktop DOM |
| Agent behavior on the new text (ASM-001) | model behavior | live Claude; desktop on Claude Agent SDK and AutoByteus |
| History replay of old-wording notices | preserved | web label test on the old sample (kept) |

## Project Execution Discovery

- From TESTING.md:
  - server: `pnpm -C autobyteus-server-ts typecheck`, `test:unit`, the notice integration folder;
  - web: `pnpm -C autobyteus-web test:nuxt --run <path>`;
  - gated AGY: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs fixture>`;
  - live: `RUN_SKILL_NOTICE_E2E=1 SKILL_NOTICE_E2E_RUNTIMES=claude_agent_sdk`;
  - desktop: `pnpm --silent isolated-app start --build`, with keys through `pnpm secrets:import` and then `isolated-app restart`.
- Constraints from the user (2026-10-17):
  - no Codex runs (no quota);
  - use the Claude Agent SDK and AutoByteus runtimes;
  - API keys only via `pnpm secrets:import` from `/Users/normy/.autobyteus/server-data/.env` into a test vault.
- Known environment fact (2026-10-17): the imported Anthropic key has no credit, so AutoByteus uses OpenAI `gpt-5.5`.

## Existing Durable Coverage Inventory

| Test | Covers | Updated in IR-001 |
| --- | --- | --- |
| unit `skill-update-notice-parts.test.ts` | AC-001 exact text, AC-002, AC-003, AC-004, "these skills", removal-only | Yes |
| integration `skill-update-notice-service.integration.test.ts` | service with real files: references only, then mixed | Yes |
| E2E `agy-skill-update-notice-roots/transport` | provider input carries the new lines (roots, busy, idle, restore, GitHub generation) | Yes |
| live `skill-update-notice-live.e2e.test.ts` | busy and idle, re-read, history; restore and delete | Yes (line shape) |
| web `SystemTaskNotificationSegment.spec.ts` | label on header or sender; Markdown flow | **No**: its only sample is the old wording |

## Durable Coverage To Add / Update

| Test | Change | Why |
| --- | --- | --- |
| web `SystemTaskNotificationSegment.spec.ts` | Add a case with the new notice text. It renders the "Skill updated" label, the package sentence with the name as inline code, separate paragraphs, list items with status, no `SKILL.md` when it did not change, and the closing line apart from the list. Keep the old-wording sample: it is history replay (non-goal: re-wording stored notices). | REQ-006 is the design's named risk, and it had no durable check of the new layout |

## Repository Coverage Execution Plan

| # | Command | Purpose |
| --- | --- | --- |
| 1 | server `typecheck`; `test:unit` | the type change compiles everywhere; regression |
| 2 | server notice integration folder | AC-001/002 through the service |
| 3 | web `test:nuxt --run components/conversation/segments` | REQ-006, including the new case |
| 4 | gated AGY roots + transport | exact provider input on every root and path |
| 5 | live Claude (both cases) | ASM-001 on an append-class runtime |

## Test-Case Ledger Decision

- Required: several cases, live and desktop runs. Kept in `api-e2e-test-case-ledger.md`.

## Broader Validation Decision

- `Required` (AC-005 names an isolated desktop check). Plan, DESK-001:
  - Setup: an isolated instance at `95a490ff1` with `--build`; keys imported through the importer and the instance restarted; a test-owned skill source with `SKILL.md` and `references/`.
  - Claude Agent SDK run (append class, busy): edit only reference files during a busy turn. Expect one card in the new layout (DOM: paragraphs, list items, inline code, no `SKILL.md`), then a re-read of the listed files from folder plus relative path.
  - AutoByteus run (`gpt-5.5`, next-turn class, idle): edit `SKILL.md`, add one file and delete one. Expect one combined turn with three statuses and the removed-files line, then a re-read.
  - Two skills in one batch on one run, updated plus removed (AC-003), if reachable through the UI: remove a skill source.

## Temporary Executable Validation Plan

| Case | Method | Why not durable |
| --- | --- | --- |
| DESK-001 | isolated desktop with real models | real models, packaged build |
| OBS-001 | browser probe: file paths with Markdown-significant characters (for example `__init__.py`) in the card | observation only; web card design is out of scope |

## Ambiguities Or Reroute Triggers

None. OBS-001 (Markdown emphasis in listed file names in the card) predates this ticket and falls outside its scope; it is recorded as a follow-up candidate in the execution report.

## Investigation Decision

- Proceed: `Yes`. Durable change: one web spec case (`e74bb1cb0`). Broader validation: `Required`, executed. Result: `Pass`; see the execution report.
