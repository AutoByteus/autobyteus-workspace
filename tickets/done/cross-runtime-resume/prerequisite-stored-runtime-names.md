# Prerequisite for autobyteus-316 — one spelling for the agent runtime in stored data and code (PRE-1)

Written by the Solution Designer, 2026-10-30. The user decided (in the conversation, after the architecture review of 316 found the issue): fix the naming consistently first, in a separate ticket; 316 continues afterwards.

## Problem (evidence)

The same field name, `runtime_kind`, holds two different spellings of the agent runtime in stored data:

| Where | Spelling | Examples |
| --- | --- | --- |
| `RuntimeKind` enum values; `run_metadata.json` `runtimeKind`; usage records (`runtime_kind: "claude_agent_sdk"`, `"antigravity_cli"`, `"autobyteus"`) | enum value | `codex_app_server`, `claude_agent_sdk`, `antigravity_cli`, `grok_build`, `autobyteus` |
| Raw-trace manifests (`raw_traces_manifest.json` `segments[].runtime_kind`) and the compaction boundary payloads the backends emit | short label, a string literal typed in each backend | `CODEX`, `CLAUDE`, `ANTIGRAVITY`, `GROK_BUILD`, `AUTOBYTEUS` |

- Short labels written by: `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-compaction-status-payload.ts:40`; `.../codex/events/codex-provider-compaction-status-projector.ts:97,156`; `.../grok/grok-build-compaction-status-payload.ts:51`; `.../antigravity/stream/agy-compaction-status-payload.ts:13`; native: `autobyteus-ts/src/memory/store/run-memory-file-store.ts:272,315`; type `agent-memory/domain/memory-recording-models.ts:94` (`"CODEX" | "CLAUDE" | string`).
- The labels are older than the enum: an old migration still converts them (`team-run-execution-tree-v2-app-data-migration.ts`: `case "CLAUDE": return RuntimeKind.CLAUDE_AGENT_SDK`).
- Measured read-only on the user's data (2026-10-30): 825 raw-trace manifests, 3,794 segment entries (`CODEX` 3,648; `CLAUDE` 83; `AUTOBYTEUS` 61; `ANTIGRAVITY` 2; `GROK_BUILD` 0 in data, present in code). The same labels also occur 7,532 times inside raw-trace records (compaction boundary payload snapshots).
- Nothing reads the stored runtime label today except the raw-trace archive code itself. Autobyteus-316 is the first reader (the Work Journal renders each raw-trace file with the runtime that wrote it).
- Rules: `DESIGN.md` rule 10 and Principle 15 (one name per concept; stored names follow the code; sealed migration, never a permanent mapping); `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2 (checklist, shape inventory) and §3 ("Stored names follow the code"). Precedents: `raw-trace-rotation-layout`, `raw-trace-active-file-name`, `memory-sync-source-id-names` in `autobyteus-server-ts/src/app-data-migrations/migrations/`.

## Why it blocks autobyteus-316

316 must know the runtime of every archived raw-trace file. With the labels it would need a permanent mapping label ⇄ `RuntimeKind` in current code, which rule 10 forbids. After this ticket the stored value is the `RuntimeKind` value and 316 reads it with the existing `runtimeKindFromString`, with no mapping.

## Suggested Task

**Title:** One spelling for the agent runtime in stored raw-trace data: write and migrate to the `RuntimeKind` values

**Scope (in):**
1. Every writer of a raw-trace runtime label writes the `RuntimeKind` value: the four server backend payload builders listed above, the native writer in `autobyteus-ts`, and the type in `memory-recording-models.ts` (becomes the enum type).
2. A sealed app-data migration rewrites `runtime_kind` in each run's `raw_traces_manifest.json` from the old label to the `RuntimeKind` value, using a frozen table that lives only inside the migration (`CODEX`→`codex_app_server`, `CLAUDE`→`claude_agent_sdk`, `ANTIGRAVITY`→`antigravity_cli`, `GROK_BUILD`→`grok_build`, `AUTOBYTEUS`→`autobyteus`). Idempotent; atomic write per file; a manifest it cannot read or a value it does not know is left unchanged with a logged warning that names the run (one run's data never blocks startup, DESIGN rule 7, Data Migration Guideline §1); already-migrated files are untouched.
3. Tests with a fixture for every source shape (the five labels, null/missing, already migrated, unknown), run on isolated data; the migration checklist of the guideline §2 answered in the design.
4. Docs updated in the same change (the memory/raw-trace docs that name the labels).

**Out of scope:** the 7,532 label copies inside old raw-trace records (snapshots of provider events in authoritative trace files that nothing reads; Principle 5: no rewrite of large data for cleanliness; new records get the new spelling); renaming `runtime_kind` (the field name is right); any other stored name; the `…ModelConfig` rename of the stopped-run edit (autobyteus-316 owns it, because 316 is what makes it wrong).

**Constraints:** experiments on isolated copies only; never write into the user's real memory (the released migration is what rewrites real data, when the user updates); read-only counts on real data are fine; no secrets in logs; GLOSSARY.md vocabulary; prove from a clean clone; no release unless asked.

**Done when:** the user has seen and approved the design; then writers and manifests use the `RuntimeKind` values, shown by tests (every shape) and a run of the migration on an isolated copy of real-shaped data; merged to `personal`. Blocks autobyteus-316.
