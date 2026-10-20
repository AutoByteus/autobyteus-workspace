# Suggested Task — Every delegated copy restores from its own run file (remove `taskAgent.origin`)

- Raised by: Solution Designer, during cross-node slice 1 design (autobyteus-191), 2026-10-19
- The user's direction (2026-10-19): "if [it's a] legacy problem we should fix this problem because the data model should be pure … We should have created a ticket to work on it, to clean it up immediately."
- Kind: cleanup / data-model simplification. It is **not a prerequisite** of autobyteus-191 (the remote run does not use `origin`). It touches the same loading code (`task-agent-own-records.ts`, tree stores), so finishing it before autobyteus-191's implementation avoids two changes in the same files.

## What

A delegated copy's `run_metadata.json` has `taskAgent.origin`:

- `catalog`: on load, the coordinating root builds the copy's `source` (definition + launch) from the copy's own file. Restore uses its own file.
- `configured_place`: the copy's own file is written, but restore takes the definition and launch from the configured member slot in the coordinating run's tree, so later edits to that slot change the copy.

## Why it is legacy

- Before 2026-10-17, copies had no own file. A copy of a configured member had no `source` and was resolved from the member slot on every restore.
- `delegated-copy-own-run-memory` (commit `6bcb206e4e`, 2026-10-17) gave every copy its own file under a no-behavior-change rule. Its decision U-4 kept the old behavior: "**not** a snapshot (that would stop it following the place and change its display)". It added `origin` to record which behavior applies.
- Evidence:
  - `tickets/done/delegated-copy-own-run-memory/design-spec.md:72` (U-4);
  - `requirements-doc.md` DEC-015, AC-024;
  - `autobyteus-server-ts/src/run-history/store/agent-run-metadata-types.ts` (`TaskAgentOrigin`);
  - `src/run-history/store/task-agent-own-records.ts` (`composeTaskAgentRecord`, `taskAgentOwnMetadata`);
  - `task-agent-own-file-schema.ts`.
- Local data (read-only, 2026-10-19): 24 copies `catalog`, 4 copies `configured_place`.
- The name itself misleads: it governs where a copy's setup is read from on restore, not where the agent came from. Another field is also called `origin` (`launchSource.origin`).

## Target

- Every delegated copy restores from its own `run_metadata.json` (definition, runtime, model, model settings, workspace, auto-approve), like any run.
- `taskAgent.origin` and the two-way merge on load are removed.
- Behavior change, for the user to confirm in that Task: editing a configured member's settings in a stopped run no longer changes copies already started from it. New copies still start from the slot's current settings.
- Existing data: `configured_place` copies whose own file lacks launch fields (U-4: "started launch when known") need those fields filled from their configured place once, in a registered migration (Data Migration Guideline). After that, `origin` is ignored on read and dropped on the next save.

## Suggested Task text

> **Delegated copies restore from their own run file; remove `taskAgent.origin`.** Today a copy of a configured member (`origin: "configured_place"`) restores its definition and launch settings from the member slot in its coordinating run, while every other copy restores from its own `run_metadata.json`. This is legacy from before copies had their own files (delegated-copy-own-run-memory, U-4). Make every delegated copy restore from its own file, fill the missing launch fields of existing `configured_place` copies once by migration, and remove `origin` and the merge on load. Confirm with the user the behavior change: editing a stopped run's member settings no longer changes copies already started. Done when every copy restores from its own file, `origin` is gone from code, existing copies restore with the same settings as before, and the delegation, restore and run-history suites pass.
