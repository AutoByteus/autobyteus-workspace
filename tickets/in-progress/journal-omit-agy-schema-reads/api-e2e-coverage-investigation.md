# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (REQ-001..005, AC-001..AC-006); Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`; Design Spec: `design-spec.md`; Supplemental: `solution-designer-handoff.md`, `follow-ups.md`
- Design / Architecture / Code Review reports: `N/A — not applicable` (Small / Low, direct route)
- Implementation Handoff: `implementation-handoff.md` (IMP-01..03); Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Round 1; Trigger: implementation engineer's direct-route handoff, code `383bbf6ea5`, tip `f0901fa9b6` (documents only after the code commit); Prior investigation: none

## Current Requirement And Design Basis

The Work Journal of an Antigravity run showed every successful read of Antigravity's own MCP schema files (`.gemini/antigravity*/mcp/<server>/<file>.json|instructions.md`) as a line. The change adds an optional `isRuntimePlumbing` hook to the runtime translation (only Antigravity sets it), moves `plainReadPath` to a shared module, makes the renderer omit such a call and its paired ok result (counting 2 omitted records), and bumps `WORK_JOURNAL_RENDERER_REVISION` 2 → 3 so existing journals are re-rendered. Required: AC-001/002 omission for every read shape; AC-003 failed, non-DONE and result-less reads stay; AC-004 other paths and other runtimes unchanged; AC-005 raw file untouched, manifest counts raw records; AC-006 older-revision journals re-rendered, unaffected file byte-identical. The implementer left to API/E2E: a built-server case with a real-shaped schema path (the scripted CLI's path is `/agy/mcp/...`, not a `.gemini` path) and the memory-search catch-up after the bump.

## Supported Scenarios And Real Usage

- SCN-001 (a schema read then an MCP call), SCN-002 (failed read), SCN-003 (other reads). Real trigger: an Antigravity agent's turn through the real server and the journal service at turn end. The founder's own journals were not read (data-privacy constraint in the requirements).
- Not tested: none recorded as unsupported.

## Changed Behavior Summary

| Behavior | Change | Evidence | Coverage |
| --- | --- | --- | --- |
| Schema read omitted from the journal | Changed | AC-001/002 | renderer unit (IMP); real-server JS-01 |
| Failed / result-less / other-path reads kept | Preserved | AC-003/004 | renderer unit; real-server JS-02 (other path) |
| Raw traces and manifest counts | Preserved | AC-005 | service unit; JS-01 |
| Renderer revision 3 re-renders old journals | Changed | AC-006 | service unit (closed file); JS-03 (open file at the next turn); fingerprint unit |

## Changed Surface And Boundary Classification

| Surface | Affected? | Boundary | Repository Evidence | Risk Not Exercised | Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | journal renderer, runtime translation | 225 journal tests | the whole path from a real Antigravity step stream to a rendered file | Real server, scripted CLI |
| Persisted-data transition | Yes (`Directly Usable — No Migration`, revision re-render) | journal files and manifest | service unit | an older-revision file on a real server | JS-03 |
| Other surfaces | No | | | | |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/journal-omit-agy-schema-reads` (branch `codex/journal-omit-agy-schema-reads`)
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/journal-omit-agy-schema-reads/TESTING.md` (server e2e, gated runtime suites, scripted AGY, Rule 9, private data); `DESIGN.md`; `AGENTS.md`. Conflicts: none. Secrets: none.
- Components: in-process studio runtime server with an owned data dir (`startStudioE2eRuntimeServer`), scripted AGY CLI; cleanup in `afterAll`.
- Data: synthetic paths only (`/home/user/.gemini/antigravity-cli/mcp/...`), no real journal.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Decision | Action |
| --- | --- | --- | --- |
| `tests/agent-work-journal/rendering/antigravity-mcp-schema-reads.test.ts`, `services/work-journal-agy-schema-reads.test.ts` | AC-001..006 | Still Valid | rerun with the folder |
| `tests/e2e/runtime/work-journal-neutral-vocabulary-scripted-agy.e2e.test.ts` | neutral vocabulary on scripted AGY | Still Valid | rerun (its `/agy/mcp` read is not a `.gemini` path; unchanged) |
| `work-journal-restore-transport`, `tests/e2e/memory/*` | restore, memory search, catalogs | Still Valid | rerun |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| IMP-03 | all | unit, typecheck | Reused | implementation check | code unchanged since its commit |
| UNIT | AC-001..006 | unit | Existing Test | journal and memory-search unit folders | independent rerun |
| API-01 (JS-01..03) | AC-001, 003-005 (path), 005, 006 | real server + scripted AGY | Durable | real-shaped schema read omitted, raw keeps it; other path kept; old-revision journal re-rendered at the next turn | the built path |
| API-02 | same | mutation by base source | Temporary Probe | production `agent-work-journal` at the base commit | the case fails without the change |
| API-03 | regression | e2e | Existing Test | journal / memory e2e | neighbours |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Path | Why |
| --- | --- | --- |
| API-01 | `autobyteus-server-ts/tests/e2e/runtime/work-journal-agy-schema-reads-scripted-agy.e2e.test.ts` (plus one env line in `tests/fixtures/agy-failure-cli.mjs`: `AGY_FAKE_MCP_SCHEMA_PATH`, default unchanged) | a real-shaped path through the real server |

Update / remove: none.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only? |
| --- | --- | --- | --- |
| A live Antigravity run, a failed schema read on a real server | no real account used; the scripted CLI emits only successful reads in this case; the failed read is unit-covered | low | No |
| Startup catch-up in the memory-search pipeline after the bump | its fingerprint includes the renderer revision (`rawTraceFingerprint`), unit-covered; a stored older fingerprint cannot be staged on a built server without editing the index database | low | No |
| The founder's own journals | not read, by constraint | n/a | Yes (the user's data; delivery tells the user the catch-up re-renders at the next turn or memory pass) |

## Ambiguities Or Reroute Triggers

None

## Investigation Decision

- Proceed: `Yes`; durable coverage added: `Yes`; reroute: `No`.
