# Design Spec — journal-omit-agy-schema-reads

## Solution And Approval Basis
- Revision `SR-001`; requirements approved by the Solution Designer within the direction (user informed). User approval of the design: `Not required`. Status: `Ready`.
- Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/journal-omit-agy-schema-reads/tickets/in-progress/journal-omit-agy-schema-reads/investigation-notes.md` (F-01…F-10). Authorities read: skill references, `DESIGN.md` (rules 4, 5, 6, 7, 11; rule 12 does not apply, no build input changes), `TESTING.md`, the 331 ticket.

## Current-State Read
`WorkJournalFileRenderer.render` pairs each `tool_call` with its `tool_result` and renders one entry per pair through `toolCallLine` (the lookup order owner) using the run's `RuntimeTranslation`. Nothing can say "this call is runtime plumbing"; the only omission today is for non-tool records (F-05). `plainReadPath` (a plain shell read of one file) exists privately inside `skill-load.ts` (F-06).

## Task Size And Architectural Risk
- Task size: `Small` (a new optional hook, one new Antigravity predicate, a small move of an existing helper, a constant, tests, one doc). Risk: `Low` (pure rendering of derived data; raw traces untouched; the rebuild is the 331-proven mechanism).
- Escalation trigger: the shadow render of the synthetic or an isolated copy of real journals changes lines other than schema reads (a predicate that is too wide), or the revision catch-up shows a cost far above F-04.

## Intended Change
1. `runtimes/runtime-translation.ts`: `RuntimeTranslation` gains an optional `isRuntimePlumbing?(call: RecordedCall): boolean`: "this recorded call is the runtime's own plumbing and says nothing about the agent's work". Doc comment states the renderer omits such a call only when its result is in the same file and succeeded.
2. `rendering/plain-read.ts` (new): `plainReadPath(command)` and its private helpers move here from `skill-load.ts` unchanged; `skill-load.ts` imports it (no behavior change; its tests stay green).
3. `runtimes/antigravity-mcp-schema-read.ts` (new): `isAntigravityMcpSchemaRead(call)`: true when the raw call is `read_file` (`Path`), `view_file` (`AbsolutePath`), or a shell read (`run_command`: `CommandLine`, `Bash`: `command`; through `plainReadPath`) of exactly one path that, with backslashes normalized to `/`, matches `/(?:^|\/)\.gemini\/antigravity[^/]*\/mcp\/[^/]+\/(?:[^/]+\.json|instructions\.md)$/`. A `StartLine`/`EndLine`/offset on the read does not matter. `antigravityTranslation` sets `isRuntimePlumbing` to it. No other translation sets it.
4. `rendering/work-journal-file-renderer.ts`: in the `tool_call` branch, when the call has a paired result, `translation.isRuntimePlumbing?.(call)` is true and `translation.normalizeResult(result).outcome.kind === "ok"`, the entry is not made: `omittedRecordCount += 2` and nothing is added to `renderedRecordCount` (the result is already in `pairedResultIndexes`). A call with no paired result, or any non-ok outcome, renders as today. The failure rule lives once, here.
5. `domain/work-journal-models.ts`: `WORK_JOURNAL_RENDERER_REVISION` 2 → 3 (DEC-2); the comment keeps saying it is a cache key for derived output.
6. Doc: `autobyteus-server-ts/docs/modules/agent_work_journal.md` (the module doc) names the rule and the revision; delivery's docs sync checks it.

## Change Scope (Mandatory)
- In scope: UC-001: the files above and their tests.
- Derived consumers: `journal-entry-reader`, chunker/cards/indexer read journal text and see fewer entries (no change needed); memory search's per-run fingerprint includes the revision (F-07) so the catch-up is automatic.
- Deliberately left alone: `toolCallLine` and its lookup order; the platform tables; other runtimes; raw traces; `read_file` conversion (FU-1); spilled outputs (FU-2).
- Follow-ups: FU-1, FU-2 in `follow-ups.md`.

## Relevant Behavior And Production-Path Map
BEH-001/002/003: raw-trace file → `WorkJournalService.reconcile` → `renderFile` → ★ `WorkJournalFileRenderer.render` (pair; omit a successful Antigravity schema read) → journal Markdown → readers and memory search. Revision change: manifest `renderer_revision` ≠ 3 → closed files are rendered again (`work-journal-service.ts:203-208`).

## Task Design Health Assessment (Mandatory)
- Posture: `Behavior Change` (a rendering rule). Current design issue: `No`: the runtime table is the designed home of runtime-specific rendering; it lacked one capability (omit plumbing), added as one optional member. Triggers checked: Duplicated Policy (the plain-read parser is moved, not copied), Boundary (the predicate stays in the Antigravity file; the failure rule in the one renderer).
- Alternatives rejected: DEC-1 (a), (c), (d); a generic path rule in `toolCallLine` (would touch every runtime and the one lookup-order owner); returning `null` from `toolCallLine` (changes a widely used return type for one case).
- Refactor needed now: `Yes`, minimal: move `plainReadPath` to its own file (rule 5: one owner of the shell-read parse).

## Legacy Removal Policy / Persisted Data
No legacy path. Persisted data: derived journals, decision `Discard or Rebuild` (as 331): the revision bump regenerates them at the next Journals pass or Rebuild; no migration, raw traces untouched; re-index of changed files only. Cost note for delivery: counts at most 231 of 9,136 files change on the founder's node (F-04, counts only).

## Ownership, Dependency Rules, Interfaces
- Owner of "what Antigravity plumbing is": `runtimes/antigravity-mcp-schema-read.ts`; owner of "never hide a failure": the renderer. Interface: `RuntimeTranslation.isRuntimePlumbing?(call)`: producer the Antigravity translation, consumer the renderer. `plain-read.ts` is used by `skill-load.ts` and the Antigravity predicate (rendering → runtimes direction stays as today: runtimes already import rendering helpers).

## Backward-Compatibility Rejection Log
None.

## Change / Refactor Sequence
1. Move `plainReadPath` (tests green). 2. Hook and renderer rule. 3. Predicate. 4. Revision. 5. Tests, doc.

## Key Tradeoffs
A narrow path rule can miss another Antigravity layout (U-1): the noise stays visible, nothing real is hidden. The bump re-renders all runs once.

## Risks
(1) The regex is too wide: AC-004 cases (a repository's own `mcp` folder, other paths, other runtimes). (2) `cat a b` or a pipeline must not be omitted: `plainReadPath` returns null for them (existing tests).

## Guidance For Implementation
- Reproduction: add the failing renderer test first (AC-001): synthetic Antigravity records `read_file` + DONE result + a `call_mcp_tool` call; today the read is a `Tool: read_file Path=…` line. Fixture style: `tests/agent-work-journal/journal-record-fixtures.ts` (`RecordBuilder`, `render`); paths synthetic only (`/home/user/.gemini/antigravity-cli/mcp/example_server/example_tool.json`); never copy a real record, path or run id (TESTING.md; the Task).
- Tests: renderer unit tests for AC-001…004 (including result-less and failed reads); a skill-load test run proves the move; a service test for AC-005/AC-006 (`tests/agent-work-journal/services`; a synthetic raw-trace folder via `raw-trace-folder-fixtures.ts`); the existing journal, memory-search and runtime-switch journal tests stay green. Optionally align the scripted CLI's `view_file` path (`tests/fixtures/agy-failure-cli.mjs:447`, `/agy/mcp/…`) with the real folder shape only if a built-server case then shows the omission; do not change it otherwise (`agy-mcp-tool-call-transport.e2e.test.ts:120` asserts on it).
- Shadow check (read-only, isolated): render a COPY of a few real journals' raw traces on your own machine is NOT required; do not copy private data. If you want the real shapes, the synthetic fixtures above are enough (F-02 lists them).
- Do not touch raw traces, `toolCallLine`, other runtimes' tables or the user's data.
