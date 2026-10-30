# Implementation Handoff — autobyteus-331 (Work Journal: neutral vocabulary)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review not selected (`Medium` + `Low`); direct implementation route by the Solution Designer's rule.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-neutral-vocabulary/tickets/in-progress/work-journal-neutral-vocabulary/requirements-doc.md`
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md` (SR-002)
- Design spec: `.../design-spec.md`
- Supplemental task artifacts: `.../work-journal-neutral-vocabulary-contract.md` (behavior-defining), `.../probes/` (reproduction), `.../journal-neutrality-analysis.md` (evidence), `.../follow-ups.md`
- Design review report / Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `.../implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-002; architecture-review `N/A`; code-review `N/A`; API/E2E `N/A`; delivery `N/A`
- Triggering finding IDs: N/A
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-neutral-vocabulary`, branch `codex/work-journal-neutral-vocabulary`; code commits `683b953f3f` (source) and `32cb0034e4` (tests); the ticket documents and evidence are committed after them (see the commit named in the message).

What was built, inside `autobyteus-server-ts/src/agent-work-journal` plus two memory-search pipeline files:

1. `rendering/tool-call-line.ts` owns the lookup chain (unwrap, qualified-name split, runtime table, platform table, generic); the renderer's `toolEntry` calls it and the old lookup lines are gone.
2. `rendering/platform/` holds one converter family per file (message, project task, browser, media, discovery), `platform-line-parts.ts` (shared parts) and `platform-tool-converters.ts` (the registry), keyed by string literals (current and recorded-history names).
3. Runtime-only converters in the tables: Claude (`Skill`, `TodoWrite`, `Agent`, `ToolSearch`, `TaskCreate`, `TaskUpdate`, `TaskOutput`, `TaskStop`, `Workflow`), Codex (`js`, `js_reset`, `js_add_node_module_dir`, `speak`), Antigravity (`Bash`), AutoByteus (`get_process_output`, `stop_background_process`, `replace_in_file`, `download_media`, `download_video`, `convert_video_format`, `submit_task_result`). `splitToolName` for Codex (`server.tool`) and Antigravity (`mcp__server__tool`); Grok unchanged.
4. `rendering/skill-load.ts` plus one rule in `commandLine`; `loadSkillLine`; shared `backgroundOutputLine`, `stopBackgroundTaskLine`, `confirmedOutcome` (the former private `changeOutcome`, now exported) in `journal-actions.ts`.
5. Outcome `delivered`; `BodyPart.message`; `(via <server>)` in the generic line.
6. `WORK_JOURNAL_RENDERER_REVISION` 1 to 2; `WorkJournalService.rendererRevision` and `ensureCurrent(target, {regenerate})`; the Journals step fingerprint includes the revision; Rebuild passes `regenerate`.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the change stayed inside the journal module and two memory-search pipeline files; no tool, runtime backend, run metadata, raw trace, API, route, persistence format or security boundary was touched; the shadow render measured the one blast-radius item (re-index) at about 22 minutes of background embedding for the changed cards and +0.5% live index size, within the design's estimate (about 50 minutes). No escalation trigger fired.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E` (rule returned by `get_handoff_rules`; see the message). Two items go to the Solution Designer as information first: FU-003 and the gate-2 reading (Known Risks).
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

Lightweight self-review (design principles and DESIGN.md): one owner per concern (chain, platform table, skill rule, outcome, revision); no flag, environment variable or second renderer for the old wording; dependency direction as designed (platform converters import no runtime translation and no tool module; memory search reads the revision from `WorkJournalService`, not the constant); no dead code in touched files (every shared part is used by at least two converters, checked with `--noUnusedLocals` and a reference count); shared structures stay tight (`BodyPart` +1 kind, `ToolOutcome` +1 kind, `RuntimeTranslation` +1 optional hook); every changed source file under 500 lines (largest: `claude-translation.ts` 243); the largest changed-line delta of one file is under 220.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, AC-001) | Platform tools give a neutral line on every runtime | `work-journal-file-renderer.ts` `toolEntry` → `tool-call-line.ts` → `platform/platform-tool-converters.ts` and the five family files | Done. 30 current registry tools plus 3 recorded-history names; `neutral-vocabulary.test.ts`, `platform-tool-converters.test.ts`, `platform-completeness.test.ts` |
| BEH-002 (REQ-002, AC-002) | Runtime-only tools give a neutral line | `runtimes/{claude,codex,antigravity,autobyteus}-translation.ts` tables | Done; `runtime-translations.test.ts`, `neutral-vocabulary.test.ts` |
| BEH-003 (REQ-003, AC-003) | Skill load in one place | `skill-load.ts` called by `commandLine` in `journal-actions.ts`; Claude `Skill` via `loadSkillLine` | Done; `skill-load.test.ts` (positives, negatives); see Important Assumptions for the one extension |
| BEH-004 (REQ-004, AC-004) | `delivered`; a refused message prints `failed: <message>` | `tool-outcome.ts` (`delivered`), `platform-line-parts.ts` (`acceptanceOutcome`), `message-tool-converters.ts` | Done; the refusal is read from the result or from the call's error (Antigravity) |
| BEH-005 (REQ-005, AC-005) | History names keep their lines | `create_or_update_task`, `create_or_update_project`, `manage_task` rows; AutoByteus `read_media_file` unchanged | Done; completeness test lists them as the only names not in the registry |
| BEH-006 (REQ-006, AC-006) | `Tool: <tool> (via <server>)`, never a platform match | `splitToolName` (Codex, Antigravity) and the first step of `toolCallLine`; `generic-tool-line.ts` | Done; `tool-call-line.test.ts`, `platform-tool-converters.test.ts` |
| BEH-007 (REQ-008, AC-008) | First catch-up pass renders again | `WORK_JOURNAL_RENDERER_REVISION = 2`; `rawTraceFingerprint(memoryDir, rendererRevision)` in `journals-step.ts` | Done; `memory-search.test.ts` (new revision changes every fingerprint; an unchanged one renders none), `work-journal-service.test.ts` |
| BEH-008 (REQ-009, AC-009) | Rebuild forces regeneration | `memory-index-pipeline.ts` passes `request.kind === "rebuild"` → `makeJournalsCurrent(..., regenerate)` → `ensureCurrent(target, {regenerate})` → `reconcile` ignores stored files | Done; tests as above |
| BEH-009 (REQ-010, AC-010) | Consumers unchanged | no change to `journal-entry-reader.ts`, `journal-chunker.ts`, `journal-card-builder.ts` | Done; `memory-search-index-units.test.ts` (new heads are actions, in the card's `Did:` line) |
| REQ-007 (AC-007) | A file with no converted entry is byte-identical | n/a (preserved) | Golden of the base commit's output for groups 1 and 2 of the synthetic traces, `unchanged-lines.test.ts` |
| REQ-011 / REQ-012 (AC-011, AC-012) | Completeness and neutrality guards | `platform-completeness.test.ts` (reads `buildDefaultAgentToolMcpAdapterProviders()`; allow-list starts empty), `neutral-vocabulary.test.ts` | Done |
| REQ-013 (AC-013) | Measured shadow render | `evidence/IMP-04-shadow-render-report.md` | Done |
| REQ-014 (AC-014) | Module doc | not done here | Left to the delivery engineer's docs sync (the design assigns `docs/modules/agent_work_journal.md` to delivery) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

New: `rendering/tool-call-line.ts`, `rendering/skill-load.ts`, `rendering/platform/*` (7 files). Edited: `journal-actions.ts`, `generic-tool-line.ts`, `tool-outcome.ts`, `work-journal-file-renderer.ts`, `runtimes/{runtime-translation,claude,codex,antigravity,autobyteus}-translation.ts`, `domain/work-journal-models.ts`, `services/work-journal-service.ts`, `memory-search/pipeline/{journals-step,memory-index-pipeline}.ts`. Tests: `tests/agent-work-journal/{synthetic-run-traces.ts, rendering/{neutral-vocabulary,unchanged-lines,skill-load,tool-call-line,platform-tool-converters,platform-completeness}.test.ts}` plus edits to `runtime-translations`, `rendering-building-blocks`, `work-journal-service` and the two memory-search test files; fixtures `tests/fixtures/agent-work-journal/{work-journal-builtin-tools.json (new `_runtime_only` section), unchanged-groups-before.json}`.

## Important Assumptions

- The skill rule also accepts the exact form Claude's `Read` with `offset`/`limit` produces, `cat -n <path> | sed -n '<range>'`, which the design's wording ("no pipe") would exclude. It is a plain read of one path in the neutral command every runtime table already writes; excluding it would leave every ranged Claude read of a skill as `Command:`. Any other pipe stays a command (test).
- `update_task` also names a changed title (`: status DONE, title "x"`) and shows a description and a comment; `delegate_task` accepts a team run id and a description (no `task_id`); `manage_task` reads `Action`/`TaskId`. These are the argument shapes of the tools' contracts, not new behavior.
- Real recorded data differs from the synthetic traces in two places, both reported, neither changed: older native message results are plain text (FU-003), and two Antigravity `Bash` calls carry only `display` (they print `Command: (command not recorded)` instead of `Tool: Bash display=…`; two lines in 647,649).
- Docs: `docs/modules/agent_work_journal.md` is the delivery engineer's (design file table: "edit, delivery"). It still says "the ticket's `work-journal-contract.md`" and needs the vocabulary tables and the regeneration rule (REQ-014).

## Known Risks

- **Gate 2 of the memory-search evaluation is slightly lower on the shadow render** (top 3: 26 to 25 of 31; MRR 0.625 to 0.616; Q14 rank 2 to 4, Q27 9 to 10; gate 1 stays 31 of 31, 30 in the first search). The project's evaluation rule for search changes ("gate 2 does not get worse") was written for ranking transformations; this is a wording change. Reported as measured for the Solution Designer / user to accept or not (no ranking code changed).
- **Index file growth:** after the upgrade the index database file is 840 MB for 627 MB of live pages (about 213 MB free pages left by replaced chunks; the product does not vacuum). Live size +0.5%.
- **Re-index cost** (measured): journals 123 s, text index done at 338 s, then about 22 minutes of card embedding for the changed cards (shared machine, quieter than the baseline's 65 minutes for all cards); on the user's node the embedding happens at the first search or live update after the catch-up pass, never a download.
- Skill labels: 4,853 loads (4,172 converted from plain reads); 7,623 `SKILL.md` commands remain commands (83% are `cd … && cat`); a read only to review a skill cannot be told apart (the line stays true).
- FU-001 (226 journals without a recorded runtime: 2,378 generic lines still name a runtime tool) and FU-002 are out of scope and recorded.
- TESTING.md ("Data") says never run a conversion or startup on real data or a copy of it; REQ-013 and the design require the shadow render on an isolated copy, as the memory-search ticket did. I followed the design: the copy was made read-only with `rsync` under `/tmp`, nothing was written to the user's data, and the copy was deleted after the measurements. Recorded as a conflict of project rule and ticket requirement.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change (plus one bug fix: a refused message printed `ok`).
- Reviewed root-cause classification: Missing Invariant.
- Reviewed refactor decision: No Refactor Needed (the lookup chain moved to its own owner as part of the addition).
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the measured data confirmed the root cause (92.2% of generic `Tool:` lines converted; the rest are runs without a recorded runtime and the user's own tools).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (the renderer's old lookup lines; no unreferenced export remains)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source files within size guardrails: `Yes` (all under 500 lines)
- Notes: recorded-history rows (`create_or_update_*`, `manage_task`, `read_media_file`) are current rendering of recorded data, not compatibility code.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Discard or Rebuild`
- Design-spec decision reference: design-spec § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result: service test `a journal written by revision 1 in the old wording is replaced in place by the next ensureCurrent` (manifest revision 1 → 2, new wording, listener notified, second call writes nothing); pipeline test for the fingerprint; shadow render over 7,527 files: 6,171 changed, 0 entry-count mismatches, the rest byte-identical, no migration code.
- Migration implementation: none (not `Migration Required`).
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` in the worktree, then `pnpm -C autobyteus-server-ts prebuild` (Prisma client and the shared packages); the main checkout's built packages are older than this base (E-19), so nothing from it was used.
- The shadow render needed the server `dist` of this worktree (`pnpm build`) and a `dist` of the base commit (tsc build in a temporary detached worktree, removed afterwards).

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `32cb0034e4` | macOS Darwin 25.5.0, Node via pnpm | all of `src` | all | Pass | `evidence/IMP-01-server-typecheck.log` | `EXIT 0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` (includes `tests/agent-work-journal`) | `32cb0034e4` | same | all unit suites | all | Pass | `evidence/IMP-02-server-unit-suite-excerpt.log` | `Test Files  877 passed \| 5 skipped (882)`, `Tests  7438 passed \| 9 skipped (7447)` |
| IMP-03 | `pnpm -C autobyteus-server-ts exec vitest run tests/agent-work-journal tests/unit/memory-search --no-watch` | `32cb0034e4` | same | journal rendering, service, memory search | AC-001…AC-012 | Pass | `evidence/IMP-03-focused-journal-and-memory-search-tests.log` | `Tests  211 passed \| 2 skipped (213)` |
| IMP-04 | Shadow render on an isolated copy; `scripts/evaluate-memory-search.mjs` base build then new build, in place; journal comparison; renderer timing | `32cb0034e4` (new), `987af589f0` (base) | same, clean env, throwaway HOME | renderer, service, Journals step, pipeline, index | AC-007…AC-010, AC-013 | Pass (with the gate-2 finding in Known Risks) | `evidence/IMP-04-shadow-render-report.md`, `evidence/IMP-04-analysis-counts.json`, `evidence/IMP-04-scripts/` | `6,171` files changed (82.0%); gate 1 `31 of 31`; `Entries 647,649 before and after` |

- Not run, and why: gated runtime suites (`RUN_*`, live providers), server E2E, integration suites (`test:integration`) and a live isolated-app journey: left to API/E2E; none needs a live runtime for the implementation-scoped claims. The reading test of contract §9.5 (an agent on another runtime reads a rendered journal) was not run.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no rendered frontend or interaction changed (the Memory page shows journal lines as text and is untouched).

## Downstream Coverage Hints / Suggested Scenarios

- Real pipeline on a synthetic memory root: run a build, then change the renderer revision (or use an older manifest) and confirm the next catch-up pass writes new wording and re-chunks only changed files; confirm Rebuild regenerates files whose manifest already has the current revision.
- A real run on each available runtime that calls a platform tool (`send_message_to` accepted and refused, `get_handoff_rules`, a browser tool) and a skill load, then read the journal through `search_memory` / the Memory page.
- The Memory page journal view on a regenerated journal (text only, unchanged component).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required (direct route): executable coverage of the regeneration paths (catch-up, Rebuild) through the real service and pipeline surfaces named in TESTING.md, a journey on a worktree build if the Memory page / `search_memory` surface is to be confirmed, and the independent classification of any failure. Implementation-scoped checks above are not API/E2E sign-off.
