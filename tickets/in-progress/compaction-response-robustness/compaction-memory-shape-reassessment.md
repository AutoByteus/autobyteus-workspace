# Compaction Memory Shape Reassessment

## Status And Purpose

- Type: requirement-decision context and runtime evidence.
- Status: resolved 2026-08-14; after reviewing the evidence, the user chose to preserve the existing six-array JSON response and episodic/semantic outcome.
- Approval applicability: evidence remains N/A; the user explicitly reconfirmed the existing approved response/persistence contract on 2026-08-14.
- Scope: distinguish transient model output from canonical storage, measure the current projection contribution of episodes and semantic facts, and compare simplification options.

## Current Behavior Clarification

The compactor model does **not** append its JSON directly to `episodic.jsonl` or `semantic.jsonl`.

The current path is:

1. child model returns transient text;
2. host extracts and validates the six-array object;
3. host normalizes and deduplicates entries;
4. host assigns deterministic IDs, timestamps, categories, and salience;
5. host builds a complete accepted compaction and validates the baseline/lineage;
6. only `AcceptedCompactionCommitter` archives exact raw traces, appends canonical episodic/semantic rows, appends lineage, installs the finalized working context, writes the snapshot, and clears the pending operation.

The JSON is therefore an untrusted response envelope, not the persistence format or a direct file-write command.

## Observed Contribution In The Verified Daily Assistant

The five successful lineage records contain:

| Compaction | Episodes | Semantic facts |
| --- | ---: | ---: |
| `compaction_operation_msrxdb0z_1` | 4 | 25 |
| `compaction_operation_msry9o4s_2` | 3 | 21 |
| `compaction_operation_mssvv6cl_1` | 2 | 18 |
| `compaction_operation_mssvwf3s_2` | 2 | 18 |
| `compaction_operation_mssvxn2c_3` | 5 | 0 |

The current lineage head uses five episodes and zero semantic facts. Its continuation projection consists of the fixed introduction plus `Earlier progress:` and the five episode summaries. This proves:

- semantic entries are optional for a valid and usable current compaction;
- episodic summaries are not incidental—they are the entire current compacted-memory body in this verified state;
- the user may be questioning the semantic categories rather than the episodic narrative itself.

## Option Analysis

### Option A — Preserve the six-array response and host-owned commit

- Keeps current Memory Inspector categories, salience, deduplication, lineage membership, and continuation projection.
- The five semantic arrays may all be empty; at least one episode remains required.
- The implemented tolerant parser already accepts fences/prose and discards harmless extras; one correction is limited to usable but invalid output.
- A pre-response provider failure is handled separately by the newly approved typed-runner-failure work.
- Persisted-data outcome: directly usable, no migration.

### Option B — Simplify the transient response but retain host-owned canonical storage

Possible shapes include one JSON `summary` field or one plain-text summary. The host would create one episodic item and no semantic items, then use the existing accepted-compaction commit.

- Removes the six-category response burden.
- Existing persisted data could remain directly usable; no migration is necessarily required because current storage already accepts a lineage head with zero semantic IDs.
- Removes or weakens semantic categories and their Memory Inspector/projection value for new compactions.
- Plain text without semantic validation would accept the exact observed wrong-task prose or source-task continuation as canonical memory. A minimal non-empty/length check cannot determine that the text is actually a compaction.
- This is a material product-contract change, not a small robustness correction.

### Option C — Let the compactor use `run_bash` and write or append parent memory files

- Rejected as a reliability simplification.
- The child normally owns a different run/memory directory; it would need absolute knowledge and write authority over the parent agent's internal memory root.
- Direct append bypasses baseline/lineage concurrency checks, deterministic IDs, normalization/deduplication, exact-trace archival, accepted-output validation, snapshot replacement, pending-state clearing, and single-commit ordering.
- A command interruption can leave partial writes; stale children can append against newer memory; rollback and audit become harder.
- If the physical canonical format changes to an unstructured text file, existing lineage and typed rows cannot simply become that file. Preserving their meaning would require an explicit persisted-data transition, contrary to the user's desire to avoid migration.

### Option D — Replace all episodic/semantic persistence with one text-memory file

- Architecturally possible, but it removes current typed-memory and lineage contracts rather than merely simplifying the model response.
- Existing memory must be migrated, deliberately discarded/rebuilt, or made accessible through a prohibited long-lived dual reader.
- This option does not satisfy the current no-migration preference without accepting loss of existing memory.

## Recommendation

Do not grant `run_bash` or direct parent-memory file access. Keep persistence, atomicity, and lineage host-owned.

The user selected Option A for the present robustness ticket. Preserve the exact six-array response, allow the five semantic arrays to remain empty when appropriate, require at least one episode, keep the tolerant host parser, keep the tool-free child, and commit only through the host-owned accepted-compaction boundary. The new runner/planning fixes must not alter this decision. If a later product change intentionally removes semantic categories, Option B remains the only proportionate no-migration direction; it would require a separate approved requirements round.
