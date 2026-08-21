# Persisted-Data Convention Audit

## Status

`SR-015 evidence supplement — Pass after explicit design mapping and terminology clarification; no product behavior change`

## Purpose And Applicability

Audit the system-instruction Activity design against the repository's canonical
[`Production Data-Migration Conventions`](../../../autobyteus-server-ts/docs/design/production_data_migration_conventions.md)
and the concise server README guidance before implementation rework continues.

This feature changes persisted data by adding a new typed row to an existing
heterogeneous JSONL event log. It does **not** transform any released row or
file, and it cannot truthfully backfill historical prompts. Therefore the
convention's persisted-data classification, forward-only runtime,
product-reachability, normal-operating-assumption, evidence-preservation, and
proportionality rules apply. Transformation-only requirements—migration
registration, fixed old-to-new conversion, transaction/relaunch recovery,
cleanup disposition, migration status, and public recovery action—are `N/A`
because no migration is designed.

## Sources Audited

| Source | Material authority used |
| --- | --- |
| `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` | Canonical normal assumptions, unsupported premises, Product-Reachability Gate, forward-only current runtime, transition classification, proportionality, and review checklist |
| `autobyteus-server-ts/README.md` under `Production migration practice` | Concise repository rule: investigate persisted formats/invariants, keep runtime forward-only, avoid hypothetical failure machinery, validate only with isolated fixtures |
| Shared `solution-designer/design-principles.md` | General Product-Reachability Gate and `Directly Usable — No Migration` decision rule for all persisted-data changes |
| `requirements.md`, `investigation-notes.md`, `design-spec.md`, and `system-instruction-raw-trace-schema.md` | Current authoritative feature scope, stored shape, transition decision, reader/writer design, retention, and rejected mechanisms |
| `autobyteus-ts/src/memory/models/raw-trace-item.ts` and `memory/store/run-memory-file-store.ts` | Released turn-row shape and normal JSONL reader/writer/rotation behavior |
| `autobyteus-server-ts/src/agent-memory/services/raw-trace-record-normalizer.ts` and run-history projection | Current target run/turn discrimination and projection behavior |
| `autobyteus-server-ts/src/app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.ts` | Existing registered migration caller affected only by the turn-reader API rename |

## Source And Target Classification

### Supported released source

- Existing run memory contains `raw_traces_active.jsonl`, completed numbered raw
  archive segments, and `raw_traces_manifest.json`.
- Released raw rows are turn-scoped records with real `id`, `ts`, `turn_id`,
  `seq`, `trace_type`, `content`, and `source_event`, plus type-specific optional
  media/tool/correlation fields.
- Representative evidence recorded in `investigation-notes.md` includes a
  25-row / 98,504-byte active file and a 94-row / 1,463,413-byte archive segment
  containing user, reasoning, assistant, tool-call, tool-result, and boundary
  records, with no system-instruction row. Larger user-observed files are
  approximately 30–40 MB.

### Fixed current target

- Every released turn row remains byte-shape-compatible and semantically
  current; it is not transformed or rewritten.
- New successful instruction supplies may append exactly one five-field
  run-scoped row: `id`, `ts`, `trace_type`, `content`, and `source_event`.
- Absence of that event on an older run is valid current meaning—“not recorded”—
  not an old schema that requires a fallback or repair.
- Current runtime uses one present-day discriminated run/turn model. It does not
  inspect schema versions, read an old file when a current file is absent, dual
  write, or invoke migration logic from normal execution.
- Downgrade compatibility with an older application opening newly written
  system rows is not promised or implemented.

## Convention Checklist

| Convention question | Evidence-backed disposition | Result |
| --- | --- | --- |
| Are supported released shapes and invariants explicit? | Released turn rows, optional type-specific fields, active/archive locations, representative sizes/types, and preserved conversation/tool/working-context/compaction invariants are recorded above and in investigation/design. | Pass |
| Is there a deterministic old-to-new transform? | No transform exists or is needed. Existing rows are already valid current rows; only future observations append a new event kind. | N/A — no migration |
| Is the persisted-data decision correct? | `Directly Usable — No Migration`: old runs remain readable and truthfully have no system row; historical prompt text cannot be reconstructed. Rewriting would add I/O and corruption exposure without semantic benefit. | Pass |
| Does current runtime remain forward-only? | One current raw-event model admits unchanged turn rows and the new strict run-scoped variant. No version branch, legacy decoder, compatibility wrapper, fallback reconstruction, or dual read/write is introduced. | Pass |
| Is legacy interpretation isolated to migration code? | This feature adds none. The existing native snapshot-v5 converter remains the only historical snapshot decoder. Its caller changes only to the explicit current `listTurnRawTracesOrdered` API. | Pass |
| Does the existing snapshot migration change semantic behavior? | For every supported released input, the renamed turn-reader returns the same facts. If a current system row exists during a later eligible migration attempt, it is correctly excluded because it has no turn identity and is not snapshot-reference evidence. No new migration ID, transform, status, cleanup, or recovery path is added. | Pass; map this caller explicitly in design |
| Are current-data readers truthful? | Turn-only consumers never manufacture turn identity for system rows. The strict system parser either yields the exact five-field current row or omits only that malformed projection while retaining the raw file. | Pass |
| Is destructive rewriting avoided? | Existing raw corpora are not rewritten for rollout. Normal native compaction may move eligible system rows into the existing archive before rewriting active state, preserving raw evidence under established rotation behavior. | Pass |
| Are missing historical facts handled without guessing? | Old/rotated/trimmed runs show no instruction entry; no definition reconstruction, archive fallback, placeholder, or backfill is allowed. | Pass |
| Are normal operating assumptions respected? | SR-014 explicitly assumes stable process, writable storage, and normal filesystem behavior. Arbitrary I/O/process/corruption/concurrent-writer premises are outside scope absent a separate contract. | Pass |
| Does every recovery branch pass reachability? | MP-CR-001 is `Not Reachable`; the design adds no reused-row republication, rollback, delivery ledger, pending registry, or dedicated retry coverage. The existing defensive activation branch is unchanged. | Pass |
| Is recovery proportionate? | Normal exception propagation remains with existing owners; there is no bespoke journal, state machine, backup, retry framework, or failure matrix. | Pass |
| Are cleanup/final-state/warning/recovery-action rules addressed? | No migration runs and no source cleanup, migration status, warning classification, or public retry action is introduced. | N/A — no migration |
| Is validation isolated from user data? | Downstream persisted-data coverage must use temporary/disposable raw-trace fixtures and must never mutate a live user profile. | Pass after explicit design guidance |

## Required SR-015 Design Alignments

The audit found no requirement or architecture violation. It found three
clarifications that must be explicit so implementation/review cannot misread the
design:

1. Add the existing
   `migrate-native-working-context-snapshots-v5-migration.ts` caller to the file
   mapping and sequence. Its change is only the clean-cut reader rename to
   `listTurnRawTracesOrdered`; it is not a new migration or changed historical
   transform.
2. Use `Event Monitor-compatible` / `pre-existing non-system` terminology in
   the design instead of calling current replay kinds `legacy`. These kinds are
   part of the current model, not a runtime compatibility path.
3. Require persisted-data tests to use isolated temporary fixtures rather than
   a user's live run directory.

## Final Audit Result

`Pass.` The correct design is additive and forward-only: existing raw rows are
directly usable, new observations use one exact current row type, historical
absence remains honest absence, and no migration or speculative recovery
machinery is justified. SR-014's rejection of the metadata-save failure premise
is required by—not an exception to—the convention.
