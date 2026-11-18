# Investigation Notes — autobyteus-381 (remove the last traces of read_media_file)

## Investigation Meta

- Package identifier: `remove-read-media-file-381`
- Request / ticket: Project Task `autobyteus-381` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), with the PM's two messages of 2026-11-04 (the second relays the user's clarification: no data changes of any kind).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-read-media-file-381`
- Repository mode: `Git`
- Task worktree / branch: the path above, `codex/remove-read-media-file-381`
- Resolved base: `origin/personal` `fe351591f2` (fetched 2026-11-04)
- Finalization target: `origin/personal`
- Bootstrap result: `pnpm install --frozen-lockfile` OK
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-04): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (read in this conversation); `DESIGN.md` rule 10.
- Investigation status: Complete

## Initial Request And Clarifications

- Original request: rename the `read_file` media helper; remove the Work Journal converter for recorded `read_media_file` calls with its fixtures, tests and doc line; remove the launch fallback with its test and doc line; first count (counts only) the user's stored agent definitions that still name `read_media_file`.
- Clarifications (user, via the PM, 2026-11-04):
  - "do NOT touch existing data";
  - no data migration of any kind;
  - no change to existing Work Journal or raw-trace files;
  - no renderer revision bump and no re-render of existing journals;
  - stored definitions are counted, not migrated; say whether the general unknown-tool rule handles them, and ask the user only if it changes what he sees;
  - if removing the converter would force a revision bump, keep the converter and say why.

## Current Source (Read, `fe351591f2`)

`git grep -i "read_media_file|readMediaFile|read-media-file|ReadMediaFile"` outside `tickets/`:

| Place | What | Disposition |
| --- | --- | --- |
| `autobyteus-ts/src/tools/file/read-file-media.ts` L22, `read-file.ts` L9, L77 | `readMediaFileAsContextFile`, read_file's media branch | Rename the function (the file name `read-file-media.ts` is read_file's media branch and stays) |
| `autobyteus-server-ts/src/agent-work-journal/rendering/runtimes/autobyteus-translation.ts` L114-121, L207 | `readMediaFile` converter and its table entry | Remove. `mediaReadRecorded` (L86) stays: read_file's media rendering uses it (L102) |
| `autobyteus-server-ts/tests/agent-work-journal/rendering/runtime-translations.test.ts` L263, L278-283 | The converter's test lines | Remove (keep the read_file media lines) |
| `autobyteus-server-ts/tests/agent-work-journal/synthetic-run-traces.ts` L286 | Synthetic `read_media_file` call (group 2) | Remove |
| `autobyteus-server-ts/tests/fixtures/agent-work-journal/unchanged-groups-before.json` (autobyteus string) | Golden revision-1 output of groups 1-2; contains `Command: cat /work/shipping/images/parcel.png → ok` and its `[image, not reproduced]` line, and later lines' `rt_NNN` links count that call | Regenerate from the base commit's renderer with the L286 row removed (`unchanged-lines.test.ts` L8-11: "made from the base commit") |
| `autobyteus-server-ts/tests/fixtures/agent-work-journal/work-journal-builtin-tools.json` L48 | `"read_media_file": "Command"` (the contract §4 oracle) | Remove |
| `autobyteus-server-ts/docs/modules/agent_work_journal.md` L203-204 | "AutoByteus's removed `read_media_file` keeps its media marker in its own table." | Remove the sentence |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` L135-157 | Test "launches an agent whose definition names only the removed read_media_file …" (read-file-media-merge AC-006) | Remove |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` L153-156 | "The separate `read_media_file` tool was removed; a stored definition that still names it …" | Remove the sentence; the next paragraph (L158-162) already states the general rule |
| `.github/release-notes/release-notes.md` L33 | v1.5.11 release notes: "`read_media_file` is gone …" | Keep: the record of a published release |
| `test-results/event-monitor-html-file-preview/*.log`, `test-results/autobyteus-runtime-streaming-ui-performance/*.log` (tracked) | Old run logs | Keep: historical evidence |
| `tickets/**` | Ticket records | Keep: historical |

## The "Launch Fallback" Is The General Rule (Read)

- There is no product code that names `read_media_file`. `resolveAutoByteusAgentTools` (`autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` L133-137) warns "not found in registry. Skipping." for any unregistered name.
- `resolveAutoByteusRuntimeAgentToolExposure` (`autobyteus-runtime-tool-exposure.ts` L8-31) always prepends `AUTOBYTEUS_DEFAULT_TOOL_NAMES` (`run_bash`, `read_file`, `edit_file`, `write_file`) for every native agent.
- So a stored definition naming `read_media_file` launches with `read_file` and a warning, by the general rule. The AC-006 test asserts exactly that. Sibling tests assert the same rule for other removed tools (`create_or_update_project` L126-132, `create_or_update_task`).
- Removing the test and doc sentence changes no behavior.

## The User's Stored Definitions (Measured 2026-11-04; counts only, no content read or printed)

Method:
- `grep -l read_media_file` over `agent-config.json` files, piped to `wc -l`.
- Scope: each data folder and each root listed in its `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`.
- On the Docker nodes: read-only `docker exec … find/grep`.

Run copies and workspace checkouts were bucketed separately and are not loaded definitions.

| Where | Loaded definitions | Name `read_media_file` |
| --- | --- | --- |
| Desktop: data folder | 8 | 0 |
| Desktop: public package root | 105 | 0 |
| Desktop: his private agent package (its `origin/main` also has 5) | 57 | 5 |
| autobyteus-server-0: data folder | 5 (+3 in a second data folder) | 0 |
| autobyteus-server-0: its copy of the public agent package (behind PR #155) | 103 | 12 |
| autobyteus-server-0: his private agent package | 57 | 5 |
| autobyteus-server-1: package copy (in its data folder) | 66 | 2 |
| autobyteus-server-2: copy of the public agent package | 96 | 7 |

Every one of these is a native-tool name the registry no longer knows. Each such agent launches with `read_file` (a default tool) and a logged warning. That has been so since v1.5.11 and stays so after this ticket; nothing the user sees changes. The node copies of the public package clean up when they are updated to the package with PR #155.

## Journal Renderer Revision (Read)

- `WORK_JOURNAL_RENDERER_REVISION = 2` (`src/agent-work-journal/domain/work-journal-models.ts` L7) is a cache key (docs L115-117). The docs' "Changing The Wording" (L229-246) bumps it so every journal is rendered again; last time that meant about 22 minutes of card embedding.
- A closed file is reused while its manifest revision, runtime kind and record count match (docs L91-95). The open file is rendered on every call. Rebuild regenerates everything.
- No test or guard pins the revision to the converters. Tests only read the constant (`work-journal-service.test.ts`, `work-journal-neutral-vocabulary.e2e.test.ts`, `memory-search.test.ts` L354).
- Without a bump, existing files keep their text. An old `read_media_file` call reads as a generic tool line only when its file is rendered again for another reason: an open file of a run that predates v1.5.11 and is still active, a missing manifest entry, or Rebuild. That is the outcome the user accepted. Each file stays internally consistent, because one build renders it.
- So the converter's removal does not force a bump.

## Runtime, Probe, Or Reproduction Findings

| Method | Observation | Established |
| --- | --- | --- |
| Counts above | 5 on the desktop; 17 / 2 / 7 on the nodes | Measured |
| Resolver and exposure code | No special case; the general rule plus default tools | Read |

- Temporary diagnostics: None. No data was written; the `docker exec` commands only ran `find` and `grep -l`.
- Reproduction for implementation: N/A (removal and rename).

## Supplemental Artifact Inventory

None.

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| R-01 | Risk | Regenerating the golden fixture could hide a real change in other lines | Generate it from the base commit's renderer with only the L286 row removed; the diff to the current golden must be only that call's two lines and the shifted `rt_NNN` numbers | Open (implementation) |
