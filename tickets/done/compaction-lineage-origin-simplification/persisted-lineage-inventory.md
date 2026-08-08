# Persisted Lineage Inventory

- Status: `Complete`
- Evidence date: `2026-08-08`
- Approval applicability: `N/A` — read-only investigation evidence, not intended-behavior authority
- Data root inspected: `/Users/normy/.autobyteus/server-data/memory`
- Privacy posture: aggregate structure, counts, sizes, and referential checks only; no memory, message, trace, episode, or semantic content is reproduced here

## Purpose

Determine whether existing `compaction_lineage.jsonl` data requires a migration when `rawTraceArchiveFile` stops being a recognized field in the current `CompactionLineageRecord`.

## Inventory

| Measure | Observed Result |
| --- | ---: |
| Lineage files | 1 |
| Non-empty lineage files | 1 |
| Total lineage bytes | 3,387 |
| Non-empty JSONL records | 2 |
| JSON-valid records | 2 |
| Schema-version-1 records | 2 |
| `agent_run` scope records | 2 |
| Prompt-contract-version-2 records | 2 |
| Records containing `rawTraceArchiveFile` | 2 |
| Records containing optional `integrity` | 0 |
| Episode IDs referenced / found | 9 / 9 |
| Semantic IDs referenced / found | 58 / 58 |
| Complete raw archive segments | 2 |
| Historical archive references currently resolvable | 2 / 2 |

The one file was under an imported Docker-node standalone-agent memory directory. The scan found one consistent two-record predecessor chain with unique compaction IDs, consistent scope, and valid retained output membership.

## Target-Shape Direct-Use Probe

A read-only structural probe parsed each existing record and applied the target retained-field validation:

- `schemaVersion: 1`;
- explicit valid standalone/team-member scope;
- non-empty unique `compactionId` and linear `previousCompactionId` chain;
- non-empty unique episode membership and unique semantic membership;
- valid ISO `derivedAt`;
- valid execution identity, selection-policy version, prompt-contract version, optional rendered-input digest, and optional integrity metadata; and
- recognized-field projection that intentionally does not include `rawTraceArchiveFile`.

Result: `2 / 2` rows passed, `2 / 2` projected rows omitted the obsolete extra field, and the file's size/mtime was unchanged during the probe. No record rewrite was performed.

## Reader / Writer Evidence

- Current source: `autobyteus-ts/src/memory/lineage/compaction-lineage-record.ts` already normalizes by selecting recognized attributes into a new record rather than copying the parsed object wholesale. The target removes the requirement and projection for `rawTraceArchiveFile`; unknown extra JSON attributes remain ignored generically.
- Current source: `autobyteus-ts/src/memory/store/file-compaction-lineage-store.ts` parses JSONL, normalizes every row, validates scope, unique compaction IDs, and predecessor continuity, then selects the tail as head.
- Current source: `autobyteus-ts/src/memory/projection/current-compaction-output-loader.ts` needs only the head's episode and semantic membership and validates exact rows through `MemoryStore`.
- Current source: `integrity.recordSha256` is only structurally normalized. Repository-wide source search found no record-hash computation or verification, so ignoring an obsolete extra field does not invalidate a verified digest.
- Target writer: new records retain schema version 1 and all currently required head/output/audit fields, but omit the obsolete archive-reference field.

## Raw Archive Preservation Evidence

The representative lineage locations also contained the expected episodic, semantic, manifest, snapshot, and raw archive files. The target does not delete or rewrite any of them. Raw archive enumeration reads complete manifest segments independently of lineage, and no normal current-output reader needs the historical archive filename.

Existing native archive manifest entries may retain their historical boundary keys and existing lineage JSONL rows may retain `rawTraceArchiveFile` bytes. They are inert historical extras; target code neither branches on their historical form nor rewrites them.

## Decision

`Directly Usable — No Migration`

The normal target reader can consume the stored JSON superset, preserve all required current-head/output/audit semantics, and ignore the obsolete extra attribute without version-specific branching. Rewriting append-only lineage and archive metadata would provide only representational cleanliness while adding unnecessary I/O, corruption, interruption, rollback, and deployment complexity.

## Limits

- This is representative evidence from the current local app-data root, not a census of every installation.
- Safety does not depend on this small volume: the target reader's recognized-field projection and invariant checks are shape-based and apply per record.
- Unsupported schema versions, malformed JSON, broken predecessor chains, invalid scopes, and missing output rows remain integrity failures; this ticket does not add historical repair behavior.
