# Design Spec

## Status

`SR-015 user-approved forward-only migration correction; ready for renewed architecture review (2026-07-31)`

The ticket worktree is current with `origin/personal@9615dcc88e73f0584e67623a3cfe1f0d2afd4617` (HEAD `fc45c94771e3dc7e4fe0d5e068a030fa3e4482d4`, 12 ahead / 0 behind). Latest base includes the completed external-runtime-memory-recording simplification, its final delivery records, and the request-recovery boundary. This makes the remaining transition smaller and sharper: Codex/Claude are raw-trace-only and their exact classified duplicate snapshots are already removed; only exact metadata-classified native AutoByteus snapshots are migration targets.

The design preserves SR-004 reference-only lineage/current-context/shared-presentation architecture and delivered SR-010 natural LLM-chosen item counts, exact natural prompt, full accepted path, and prompt audit versions. The pending SR-015 package retains four bounded changes introduced in SR-012:

1. replace the destructive reset with native-only strict-v5 conversion;
2. extract the existing exact metadata/location classification into one small reusable service used by the delivered external cleanup and the new native migration;
3. restore latest-origin nonblocking startup migration semantics rather than globally redefining `requiredOnStartup`; and
4. capture ephemeral LLM request recovery after any durable compaction and before current-request mutation.

The normative behavior remains in `memory-context-and-lineage-contract.md`; `use-case-data-flow-spine-map.md` owns path/ownership coverage; and `memory-compactor-prompt-content-contract.md` remains unchanged as the exact LLM-facing wording authority.

Round history remains authoritative in `solution-revision-record.md` and the architecture-owned records. In particular, ARCH-F-004 was correctly closed for the then-approved fail-closed SR-004 basis. SR-012 now supersedes that basis after the delivered external cleanup established best-effort startup behavior. The renewed review must evaluate the new current premise rather than reinterpret architecture history.

| Finding / revision trigger | Resolution in the current cumulative package |
| --- | --- |
| User separation-of-concerns clarification | `compaction_lineage.jsonl` contains successful records only and its tail is current. Snapshot v5 owns finalized messages/message-local ranges only. No `compaction_state.json`, current pointer, `CompactedMemoryOrigin`, or replacement manifest exists. |
| `ARCH-F-003`, `ARCH-F-005` | IDless strategy; `MemoryManager` acceptance/identity; archive -> output -> lineage -> context -> snapshot; accurate round chronology and existing implementation reconciliation. |
| `ARCH-F-004` historical resolution and SR-012 supersession | The earlier fail-closed caller design was implemented for the old reset. Latest origin's delivered external cleanup established ordinary nonblocking startup. SR-012 removes the global `RequiredAppDataMigrationError`/server rethrow; native migration uses the existing runner lifecycle without defining a ticket-specific failure protocol. |
| `ARCH-F-006` through `ARCH-F-009` | Remove the hidden lineage membership cap across the full path; refresh current evidence; use prompt audit value 2 while directly reading 1/2 mixed chains; keep predecessor identity only in manager-captured lineage state. |
| User-observed Electron restore failure | Pre-lineage native snapshots are `Migration Required`; strict v5 is published before obsolete native derived state is removed; normal restore stays v5-only and has no raw-history fallback. |
| Completed external-runtime simplification | Reuse exact metadata classification; migrate only `RuntimeKind.AUTOBYTEUS`; preserve Codex/Claude/imported/unclassified/unsupported locations and raw-only external behavior. |
| Latest-base request recovery interaction | Move recovery capture into the assembler's post-compaction/pre-request stable-base boundary. Restore only ephemeral request state; never roll durable archive/output/lineage back. |
| User-approved SR-014 simplification | Convert each eligible absent/empty-lineage exact native snapshot by retaining only valid current-representable and truthfully sourceable units, omitting unsupported units, and using strict v5 with `messages: []` when nothing survives. Create no recovery notice, placeholder, Tool repair, synthetic Tool result, baseline/repair record, or raw mutation. |
| `ARCH-F-012` through `ARCH-F-015`, as superseded by the user's final scope clarification | Remove the last stale repair/baseline prescriptions; carry exact standalone/team-member snapshot identity and bounded eligible-active reference facts through one typed input; make the pure converter the sole message/ref matching owner; and map BEH-013 to DF-S02/DF-L06. Conversion eligibility is deliberately simpler than ARCH-F-015 proposed: absent/empty lineage may convert, while every nonempty-lineage location is skipped byte-for-byte without validation, cleanup, recovery, or repair. Physical/disk-failure handling is not a ticket design premise; ordinary exceptions remain owned by the existing runner. |

## Current-State Read

### Delivered preservation baseline at current HEAD

1. SR-010 passed `ARCH-REV-006`, was implemented in `IR-003` at `c6c60b9996d61ef373236b66437844cd8b315af8`, passed `CRR-009`, `API-REV-007`, and `CRR-010`, and was delivered in `DR-006`/`DR-007`.
2. Current `agent.md` contains the exact natural prompt; `WorkingContextCompactionPromptBuilder` returns only renderer output; `WorkingContextFinalizer` preserves canonical compactor-visible turns.
3. Current parser, normalizer, accepted builder, lineage validator/store, output projection, and origin resolver impose no episode/fact/category maximum. New records write prompt audit value `2`; readers preserve supported `1 | 2` chains.
4. `MemoryManager` owns accepted identity/publication. `StructuredJsonCompactionStrategy` returns an IDless proposal. Publication remains archive -> output rows -> lineage head -> finalized context -> v5 snapshot -> clear pending.
5. Snapshot v5 contains finalized messages, media/tool structures, and message-local ranges/raw refs only. Lineage contains compaction/output relationships; its tail is current. Generated Work Evidence and native compaction already share the tight readable-value/Tool-body presentation capability.
6. Completed external-runtime simplification makes Codex/Claude raw-trace-only and removed exact classified external snapshots. Current product inventory contains 347 exact native snapshots (v1=1, v3=79, v4=267; 32,501,775 bytes), all parseable and structurally known, with no current lineage.
7. Current ticket source still contains the destructive reset, global required-migration throw/rethrow, strict bootstrap plus `WorkingContextRecoveryProjector`, and pre-assembly request-recovery capture. Those are the actual pending source problems.

### Pending SR-015 gaps

1. Existing exact native pre-v5 snapshots fail the supported Electron restore path; the destructive reset would delete continuation state.
2. Normal create persists snapshots and no supported existing-run snapshot-less lifecycle exists, so the last-twelve raw-history projector has no valid product premise and must be removed.
3. Exact runtime/location classification currently lives inside delivered external cleanup and must be extracted for reuse by native conversion without combining action policies.
4. The completed 347-file read-only audit establishes all observed root/message/media/tool/provenance shapes and bounds unsourced/incomplete cases. Under the user-approved tolerant-subset rule, every eligible source is convertible. No second global dry run or prepared-plan lifecycle is required.
5. The converter must retain only valid current-representable system messages and complete truthfully active-backed non-system units/tool groups; ignore unknown optional fields; omit unsupported, incomplete, ambiguous, old-compacted-memory, or unsourced units; and use strict v5 with `messages: []` when parsing fails or nothing survives.
6. The migration must carry authoritative snapshot identity and bounded same-subject eligible-active reference facts into one pure converter and construct/finalize/strict-validate each complete candidate before replacing that run's snapshot. It must not create recovery content, repair Tool state, append migration evidence, or otherwise mutate raw traces. Filesystem exceptions remain ordinary existing-runner behavior, not a ticket-specific state machine.
7. Tolerant conversion applies only when lineage is absent/empty. Every nonempty-lineage location is outside this migration and is skipped byte-for-byte. The migration does not inspect whether that state is coherent, reinterpret it as pre-lineage data, clean it, or add recovery logic for hypothetical partial publication.
8. Request recovery currently captures before an assembler that can commit compaction durably. Provider failure can therefore restore pre-compaction context behind the committed lineage head; capture must move after compaction and before request mutation.

Pre-SR-004/SR-010 observations about top-K projection, strategy writes, v4 restore, `Assistant work notes`, fixed counts, duplicated operation text, audit value 1-only, server-local redaction, and artificial user-turn splitting are historical only. They must not be reimplemented.

## Intended Change

Preserve the delivered recurrent transition and all SR-010 behavior:

```text
M(n) = compact(M(n-1) + R(n))
```

Only these production areas change:

1. extract `RuntimeMemoryLocationClassifier` from delivered external cleanup and reuse it without changing external policy;
2. replace/decommission the destructive reset with exact native migration ID `20260731_migrate_native_working_context_snapshots_v5`;
3. add one pure `NativeWorkingContextSnapshotV5Converter` whose typed per-run input carries metadata-derived expected snapshot identity, source bytes, and bounded same-subject eligible-active reference facts; it returns a finalized strict-v5 candidate plus `converted | converted_with_omissions` and bounded reason/count diagnostics, or a typed source-identity rejection;
4. retain only valid current-representable system messages and complete truthfully active-backed non-system units/tool groups; omit unsupported units; and produce `messages: []` when no message survives or JSON cannot be decoded;
5. gate on lineage before conversion: skip every nonempty-lineage location untouched and convert/clean only absent/empty-lineage state. Validate the complete candidate before replacing that run's snapshot, then publish strict v5 and remove the exact three obsolete files; use `SUCCEEDED_WITH_WARNINGS` for completed conversion with omissions; never mutate raw traces or generate replacement content. Ordinary filesystem exceptions use existing runner behavior and receive no ticket-specific branch;
6. remove `WorkingContextRecoveryProjector`; normal restore remains strict-v5-only and explicit missing snapshot fails;
7. restore ordinary nonblocking migration runner/server semantics without a ticket-global required-failure exception; and
8. move request-recovery capture to the assembler's post-compaction/pre-request boundary and keep durable compaction outside recovery.

The completed 347-file audit is sufficient product-corpus feasibility evidence. This design intentionally adds no `prepareExecution`, global prepared plan, inventory fingerprint, second scanner/converter, backup store, or runtime compatibility reader.

No prompt, natural-count, compaction-lineage schema, snapshot-v5 schema, output-row, Event Monitor, Work Evidence, external-runtime, launch, or provider-token behavior changes in SR-015.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002, REQ-008, REQ-009; AC-001–003, AC-009, AC-010 | Runtime activity and active Event Monitor use cases | Requirements current/desired table; investigation source log and active-only projection findings | Preserve immutable raw identity/content across active-to-archive movement; keep Event Monitor active-only | DF-P01, DF-P02, DF-R02, DF-L07 |
| BEH-002 | Contract | REQ-002–004; AC-003, AC-004, AC-006 | One successful native compaction | Delivered planner/strategy/manager/committer publishes exact reference-only recurrent lineage with uncapped natural membership | Preserve relation/ownership and regression-test it; no SR-015 source change | DF-P04, DF-L01, DF-L04 |
| BEH-003 | Contract | REQ-003–006; AC-004–006 | Accepted structured output | Delivered complete output/lineage path preserves natural item counts and writes prompt audit value 2; supported 1/2 chains read directly | Preserve delivered behavior; no migration change | DF-L02, DF-L04, DF-P08 |
| BEH-004 | System | REQ-003, REQ-006; AC-004, AC-012 | Typed internal origin lookup | Delivered resolver finds producing membership and direct/root origins across natural-count and mixed-audit chains | Preserve unchanged | DF-P08, DF-L05 |
| BEH-005 | System | REQ-007; AC-007 | Repeated native compaction and request assembly | Delivered exact-tail recurrence/finalization/v5 snapshot and canonical compactor-visible turns; predecessor stays outside messages | Preserve unchanged | DF-P03–DF-P06, DF-P10, DF-L01, DF-L03, DF-L08 |
| BEH-006 | Operational | REQ-006, REQ-008, REQ-014; AC-008, AC-009, AC-012, AC-018 | Server startup and existing-run restore | Strict restore rejects observed native v1/v3/v4 snapshots; destructive reset is unsafe; external snapshot ownership is already removed; last-twelve projector has no product premise; strict v5 identity is runId/memberRunId | Exact native-only absent/empty-lineage conversion through one typed identity/reference-fact seam; every nonempty-lineage location skips untouched; strict snapshot-only restore; projector removal | DF-S02, DF-L06, DF-P07, DF-L03 |
| BEH-007 | Contract | REQ-009; AC-010 | Raw-only external runtime | Delivered `ExternalRuntimeMemoryWriter` records/rotates raw traces and creates no snapshot | Preserve delivered external behavior; reuse metadata classifier but never migrate/recreate external snapshots | DF-P01, DF-P09 |
| BEH-008 | Operational | REQ-004, REQ-007, REQ-008; AC-003, AC-011 | Runner/parser rejection and naturally sized accepted publication | Delivered pre-write retry and uncapped accepted/lineage path; no post-output numeric rule remains | Preserve structural failures/order and retry | DF-R01, DF-L02, DF-L04 |
| BEH-009 | Contract | REQ-002, REQ-005, REQ-007, REQ-010, REQ-011; AC-006, AC-007, AC-014, AC-015 | Natural compactor request | Delivered renderer includes prior memory, omits reasoning/IDs, uses XML/shared Tool/head-tail policy, builder returns history only, and finalizer preserves canonical turns | Preserve unchanged; no lineage identity in constituents | DF-L01, DF-L08, DF-L09 |
| BEH-010 | User | REQ-002, REQ-010, REQ-011; AC-014, AC-015 | Generated Work Evidence request | Shared readable body/head-tail policy is implemented | Preserve unchanged | DF-P11, DF-L09 |
| BEH-011 | Contract | REQ-005, REQ-007, REQ-010, REQ-012; AC-006, AC-007, AC-014, AC-016 | UC-027 / any built-in native compaction | Delivered exact natural prompt, history-only payload, no count caps, new-write audit value 2, mixed 1/2 direct use, and full accepted-path coverage | Preserve unchanged | DF-P04–DF-P06, DF-P10, DF-L02, DF-L04, DF-L08 |
| BEH-012 | System/Failure | REQ-007, REQ-013; AC-007, AC-011, AC-017 | Pending compaction followed by assembly/provider failure | Latest recovery captures before durable compaction and can restore context behind lineage head | Capture after compaction/before request; restore compacted base on failure; settle on success/interruption; no durable rollback | DF-P12, DF-R03, DF-L10 |
| BEH-013 | Operational/Contract | REQ-008, REQ-014; AC-009, AC-018 | Startup migration processes the exact native corpus after the completed read-only audit | The retained 347-file audit proves known-shape feasibility and identifies unsourced units plus 23 result-less Tool calls; the user rejects a second preflight, repair, synthetic content, and raw mutation | Treat the audit as sufficient; absent/empty-lineage conversion retains the truthfully sourceable subset, omits unsupported/incomplete units, permits metadata-identified empty v5, validates before mutation, and reports bounded omissions; no preflight/repair/runtime compatibility | DF-S02, DF-L06 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `tickets/in-progress/memory-lineage-provenance-analysis/memory-context-and-lineage-contract.md` | Normative terminology, invariants, schemas, rendering/migration contract, 29 use cases, exact prompt-content authority, and failure behavior | REQ-001–014; AC-001–018 | The design must implement this contract without weakening or extending it | SR-015 user-approved for architecture review |
| `tickets/in-progress/memory-lineage-provenance-analysis/use-case-data-flow-spine-map.md` | Complete production/target spine, owner, dependency, reachability, and persisted-data map | REQ-001–014; AC-001–018 | Supplies the stable DF IDs and design-principles validation; SR-015 corrects DF-S02/DF-L06 identity/lineage gating and preserves DF-P12/DF-R03/DF-L10 | SR-015 user-approved for architecture review |
| `tickets/in-progress/memory-lineage-provenance-analysis/memory-compactor-prompt-content-contract.md` | Exact delivered system-prompt file, history-only builder composition, and canonical user-turn rendering | REQ-005, REQ-007, REQ-010, REQ-012; AC-006, AC-007, AC-014, AC-016 | Preservation authority; current source byte-matches it and SR-015 must not alter it | User-approved / delivered by SR-010 / unchanged |
| `tickets/in-progress/memory-lineage-provenance-analysis/provenance-methodology-analysis.md` | Provenance methodology and repository evidence | REQ-001–006, REQ-008–009, REQ-012–014; AC-001–006, AC-008–013, AC-016–018 | Supports application-owned direct edges, recursive derivation, reference-only records, tolerant native migration without synthetic evidence, lineage-tail current authority, accepted publication order, proportionate per-run conversion, and the fact that variable item counts do not change lineage | Complete / SR-015 aligned; approval N/A (evidence) |
| `tickets/in-progress/memory-lineage-provenance-analysis/compacted-memory-message-role-analysis.md` | Provider-message, restore, prompt, natural semantic sizing, and Work Evidence investigation | REQ-007–014; AC-007–018 | Supports recurrent lineage-head input, canonical user composition, message-only snapshot ownership, observed pre-v5 restore failure, migration-only conversion, strict snapshot-only runtime restore, tolerant-subset/empty-v5 migration, shared rendering, and the quality-first prompt/enforcement ownership split | Complete / SR-015 aligned; approval N/A after normative extraction |

## Task Design Health Assessment (Mandatory)

- Change posture: delivered SR-010 `Behavior Change` plus pending native persisted-data `Bug Fix / Migration Required` and request-recovery boundary fix over implemented SR-004/latest origin.
- Current design issue found: `Yes`, limited to the pending delta.
- Root cause classification: SR-010 resolved the historical duplicated-policy issue. Pending work is `Historical Compatibility Pressure` from an incorrect destructive transition plus unsupported fallback, and a request-recovery `Boundary Or Ownership Issue`.
- Refactor needed now: `Yes`, proportionate extension of existing owners only.
- Evidence: SR-010 is delivered and current source has no count cap. The 347-file exact native corpus and supported Electron restore failure prove native continuation state must be migrated, while delivered external evidence excludes other locations. The completed audit proves all observed shapes are covered; the user accepts bounded exceptional loss. Lifecycle tracing proves last-twelve reconstruction has no supported initiating path. The old migration ledger/test-root mismatch proves the corrected transition needs a new ID and test isolation.
- Design response: retain SR-010; extract the existing metadata classifier; add one native migration-only converter; use current serializer/finalizer; retain only current-valid truthfully sourceable units and omit the rest; publish v5 before deletion; never mutate raw traces or generate recovery/repair content; remove the projector; and move ephemeral request recovery to the assembler stable-base boundary.
- Separation of concerns: message constituents retain local kind/range/raw refs only. `MemoryManager` separately captures/verifies the lineage tail and maps it to `previousCompactionId`. Lineage record owns audit version; prompt/renderer do not author storage identity.
- Refactor explicitly not needed: no change to manager/committer publication, lineage/snapshot-v5/row schemas, current-output loader, resolver, Event Monitor, Work Evidence, provider launch, or external raw-only writer behavior.
- Proportionality: one focused converter/migration, one small shared classifier extraction, one fallback removal, one request-recovery capture relocation, and existing finalizer/serializer reuse. SR-010 prompt/parser/validator work is already delivered. No repair subsystem, raw-evidence writer, preflight lifecycle, new state file, lineage format, primary spine, or output-token policy.
- Residual risk: model semantic quality remains probabilistic and normal publication remains non-transactional; neither justifies new machinery in this ticket.

## Terminology

- **Raw trace**: immutable evidence record. Ordinary types record original activity; explicitly typed operational records declare a boundary and are never projected as user activity. Native snapshot migration never creates or mutates raw records.
- **R(n)**: non-empty newly selected non-compacted-memory WorkingContext units backed by archive-eligible active raw evidence; after migration, only retained units with truthful eligible-active backing may enter R(n).
- **M(n)**: complete replacement output produced from M(n-1) plus R(n), with the natural number of episodes and facts chosen by the LLM.
- **Compaction proposal**: validated content and selection facts held in memory; it has no durable side effects.
- **Accepted compaction**: proposal augmented by application-owned artifact IDs, the existing `compactionId`, explicit inputs, a finalized replacement context, and a lineage record candidate.
- **CompactionLineageRecord**: one immutable reference-only direct derivation record for one successful native compaction.
- **Current compaction / lineage head**: the last successfully appended `CompactionLineageRecord`; absent/empty lineage means no current compacted memory.
- **User constituent**: one typed logical region within a physical user message: compacted memory, retained historical user input, or current user input.
- **Compacted-memory constituent**: a message-local kind/range identifying the memory text within a finalized user message. It carries no compaction, episode, or semantic IDs.
- **Native WorkingContext migration**: startup definition `20260731_migrate_native_working_context_snapshots_v5`; it exact-classifies current locations, converts only AutoByteus snapshots to strict v5, then deletes obsolete native episode/semantic/manifest files.
- **Tolerant native conversion**: migration-only projection that retains current-valid truthfully sourceable units, omits unsupported units, and may yield strict v5 with `messages: []`; it creates no recovery text, synthetic Tool outcome, placeholder, raw record, or historical lineage.
- **LLM request recovery checkpoint**: ephemeral WorkingContext plus pending-compaction state captured after durable compaction and before current-request mutation; it is not a persisted snapshot or compaction transaction.
- **Completed archive file**: immutable native-compaction raw-trace JSONL referenced by its run-relative manifest `file_name`; it owns selected raw membership and source interval.
- **Origin result**: complete recorded origin, `not_found`, or a current-state integrity error.
- **Condensed tool call**: consumer-neutral readable body containing name, derived/supplied status, arguments, and exactly one result/error representation.

## Design Reading Order

The remainder follows the mandated reasoning order: transition decision, spines, ownership, interfaces, capability/file allocation, examples, removal/compatibility decisions, and implementation sequence.

## Obsolete Path Removal Policy (Mandatory)

- Policy: `Current model only; no backward-compatible runtime code.`
- Replaced in-scope behavior is clean-cut: strategy mutation/ID assignment becomes IDless proposal-only; mixed retrieval no longer selects current memory; old response aliases disappear; schema-v1-v4 snapshots never enter runtime restore; `CompactedMemorySchemaGate`, snapshot-delete reset, global compacted-memory manifest authority, `WorkingContextRecoveryProjector`, old-row readers, and loose provenance disappear; server Work Evidence formatting remains on the core renderer.
- Pre-lineage `episodic.jsonl`, `semantic.jsonl`, and `compacted_memory_manifest.json` are disposable. `working_context_snapshot.json` is not: one registered new-ID startup migration converts it to strict v5 before deleting those three obsolete files. Existing raw records/manifests are preserved byte-for-byte; migration appends nothing to raw storage.
- Historical snapshot/root/message-format and obsolete-filename knowledge exists only inside that migration converter. Normal models, stores, resolver, serializer/bootstrapper, manager, strategy, and renderer expose only current types and behavior.
- No compatibility wrapper, dual reader/writer, optional historical source fields, fallback to arbitrary durable rows, or inferred provenance is permitted.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

| Stored subject and location | Change | Required semantics / constraints | Decision | Rationale and supported criteria |
| --- | --- | --- | --- | --- |
| Existing `raw_traces_active.jsonl`, completed raw archive JSONL, raw-trace manifests | Successful compaction obtains one completed archive descriptor and asserts exact selected membership | Preserve existing record IDs/content byte-for-byte; native snapshot migration never appends, rewrites, archives, or deletes raw records/manifests | `Directly Usable — No Migration` | Existing authoritative evidence remains valid; unsourced legacy context is omitted rather than given invented evidence. AC-001–005, AC-009 |
| Pre-lineage `episodic.jsonl`, `semantic.jsonl` | Files lack trustworthy producing-compaction edges | Startup migration deletes each file; runtime never decodes or imports it | `Discard or Rebuild` | Structural conversion cannot reconstruct provenance; usage is sparse and user accepted loss. AC-009, AC-012 |
| New current-format episodic/semantic JSONL | Rows are app-ID-owned outputs listed by exactly one lineage record | Current reader/writer only; no historical fields or tolerant fallback | `Directly Usable — No Migration` after transition | The migration leaves pre-lineage lineage empty and removes old rows before any new current output is written. AC-003–009 |
| `compaction_lineage.jsonl` | Existing schema-v1 record arrays allow natural membership; producing prompt audit changes from value 1 to new-write value 2 | Existing value-1 records remain immutable/truthful; normal reader accepts/preserves supported values `1` and `2`; no content interpretation or rewrite | `Directly Usable — No Migration` | Same physical/logical shape and direct relations. Mixed current-schema chains are a normal product path. AC-003–006, AC-016 |
| Pre-v5 and pre-lineage/no-lineage `working_context_snapshot.json` | v5 requires canonical message-local provenance and complete tool protocol | Migration-only decode -> retain valid current-representable system and truthfully active-backed complete non-system units/tool groups -> omit unsupported units -> finalization -> strict-v5 validation -> snapshot replacement | `Migration Required` | Snapshot is normal continuation authority; observed deletion/rejection prevents existing-run use. Historical decoding stays outside runtime. AC-008, AC-009 |
| Valid lineage-aware schema-v5 `working_context_snapshot.json` | Canonical finalized messages plus message-local ranges/raw refs | Contains no compaction/output/current-state identity; skip unchanged | `Directly Usable — No Migration` | Snapshot owns continuation messages; lineage owns derived-memory relationships/current head. AC-007–009, AC-012 |
| Any nonempty lineage | The location already claims current-format compaction state and is not part of the audited pre-lineage corpus | Skip the location byte-for-byte without validating, converting, cleaning, repairing, or inferring its state | `Directly Usable — No Migration` for this transition | A single structural eligibility predicate prevents the migration from touching any lineage-aware state and avoids speculative recovery code. AC-008, AC-009, AC-018 |
| `compacted_memory_manifest.json` | Existing schema/reset marker containing only `schema_version` and `last_reset_ts`; not lineage/current state | Delete only after snapshot v5 publication; no replacement manifest exists | `Discard or Rebuild` | Current validity comes from lineage tail; pre-lineage run remains no-current-compaction. AC-009, AC-012 |
| Generated Work Evidence Markdown/manifest | Visible value formatting changes | Regenerate normally from preserved raw evidence; no persisted-content conversion | `Discard or Rebuild` | Existing generated artifact contract already owns regeneration. AC-015 |

Data loss is intentional for obsolete pre-lineage episode/semantic rows, the compacted-memory manifest, and legacy snapshot units that cannot satisfy current structure/provenance/tool invariants. The converter preserves current-valid truthfully sourceable units and reports bounded omission reason/count diagnostics; strict v5 with `messages: []` is acceptable when nothing survives. It is unacceptable to generate replacement content, synthesize Tool outcomes, mutate an existing raw record/manifest, strand an otherwise writable run because unsupported content was omitted, or damage valid current lineage/output state.

SR-010 changes allowed lineage membership cardinality and prompt-audit enum, not the record schema. SR-012 narrows the pre-runtime transition to native targets, removes the unsupported fallback, restores nonblocking startup semantics, and relocates request recovery; current v5/lineage/output formats remain unchanged.

### Migration Plan

Replace/decommission `ResetPreLineageMemoryAppDataMigration` and register `MigrateNativeWorkingContextSnapshotsV5Migration` under the exact durable ID `20260731_migrate_native_working_context_snapshots_v5`. The old reset ID is never reused. The migration runs after the delivered `20260731_remove_external_runtime_working_context_snapshots` definition.

#### Exact target classification

Extract the metadata/location discovery already proven by the external cleanup into `RuntimeMemoryLocationClassifier` under `autobyteus-server-ts/src/agent-memory/services/`. It is a narrow server-owned classification concern, not a memory-domain or generic filesystem helper.

Its output is one deterministic inventory of exact current product locations:

```ts
type RuntimeMemoryLocation = {
  itemId: string;
  memoryDir: string;
  workingContextSnapshotPath: string;
  runtimeKind: RuntimeKind | null;
  snapshotAgentId: string;
  subject:
    | { kind: 'standalone'; runId: string }
    | {
        kind: 'team_member';
        rootTeamRunId: string;
        memberRunId: string;
        memberRouteKey: string;
        memberPath: string[];
      };
};

type RuntimeMemoryLocationClassification = {
  locations: RuntimeMemoryLocation[];
  diagnostics: RuntimeMemoryLocationDiagnostic[];
};
```

The classifier derives locations only from current standalone/team metadata plus `AgentMemoryLocationService`. `snapshotAgentId` is a named derived boundary value rather than independent state: it must equal `subject.runId` for standalone locations and `subject.memberRunId` for team-member locations. That is the exact identity written in every observed current snapshot and required by strict v5. The classifier detects duplicate/conflicting exact paths, does not traverse arbitrary directories to guess owners, and does not read/convert snapshot content. Both cleanup migrations consume it with different eligibility predicates:

- delivered external cleanup: exact `Codex`/`Claude` locations only, behavior otherwise unchanged;
- new native conversion: exact `RuntimeKind.AUTOBYTEUS` locations only.

Imported, unsupported, missing/invalid-metadata, unclassified, and conflicting locations are preserved and reported but never converted. This keeps classification policy singular without merging the two migrations' deletion/conversion lifecycles.

#### Per-native-run classification

For each exact eligible native location:

1. **No snapshot:** record `SKIPPED`; do not reconstruct context and do not delete related files. Normal creation and explicit restore are separate product paths.
2. **Nonempty lineage:** record `SKIPPED` and leave the complete location byte-for-byte unchanged. Do not validate the snapshot/head/output relation, invoke tolerant conversion, clean obsolete files, infer state, or add repair/recovery behavior.
3. **Absent/empty lineage and valid strict-v5 natural state:** when the snapshot has no compacted-memory constituent and every non-system logical unit is backed by truthful eligible-active raw references, retain the snapshot byte-for-byte and delete only obsolete `episodic.jsonl`, `semantic.jsonl`, and `compacted_memory_manifest.json` after validation.
4. **Absent/empty lineage and any other source content, including parse-invalid content:** run the tolerant converter below. Content shape alone never produces `FAILED`.

Filesystem behavior remains owned by the existing app-data migration runner. The ticket adds no backup, rollback, per-file recovery, or compatibility fallback.

#### Migration-only conversion owner

Add `autobyteus-ts/src/memory/migration/native-working-context-snapshot-v5-converter.ts`. It is a pure migration-only converter that reuses `Message`, `WorkingContextFinalizer`, and `WorkingContextSnapshotSerializer` without teaching normal restore any historical schema. The server migration owns exact target/lineage gating, source-byte and same-subject eligible-active-fact loading, snapshot publication/cleanup, and item results. The converter is the sole owner of historical decoding, parseable-source identity validation, and message role/content/media/tool/reference matching. Neither owns a raw writer.

Use one typed per-run input and one tight result union rather than a persisted plan or compatibility DTO:

```ts
type NativeSnapshotReferenceFact = Readonly<{
  id: string;
  turnId: string;
  seq: number;
  traceType: string;
  sourceEvent: string;
  content: string;
  media: RawTraceMedia | null;
  toolName: string | null;
  toolCallId: string | null;
  toolArgs: Record<string, unknown> | null;
  toolResult: unknown | undefined;
  toolError: string | null | undefined;
  correlationId: string | null;
}>;

type NativeSnapshotConversionInput = Readonly<{
  expectedSnapshotAgentId: string;
  sourceBytes: Uint8Array;
  eligibleActiveReferenceFacts: readonly NativeSnapshotReferenceFact[];
}>;

type NativeSnapshotConversionResult =
  | {
      kind: 'candidate';
      mode: 'converted' | 'converted_with_omissions';
      workingContext: WorkingContext;
      omissions: {
        droppedFieldCount: number;
        droppedMessageCount: number;
        droppedToolGroupCount: number;
        reasonCodes: string[];
      };
    }
  | {
      kind: 'identity_rejected';
      reasonCode: 'missing_source_agent_id' | 'source_agent_id_mismatch';
    };
};
```

The migration creates `eligibleActiveReferenceFacts` only from the exact location's active raw file; the type deliberately excludes paths, archive eligibility guesses, and mutation operations. The converter builds an internal ID index and matches only referenced facts. It never scans for a substitute message or missing Tool result. Input and result exist only in memory for one run. They contain no global inventory, receipt, source-content copy beyond the required source bytes/facts, evidence operation, repair operation, or current-compaction identity.

Observed-source projection is intentionally narrow:

| Source unit | Migration projection |
| --- | --- |
| Valid current-representable system message | Retain in source order; current system provenance needs no raw reference. |
| Valid non-system unit with stored refs | Retain only when every required ref resolves to an eligible active raw record for the same run/member and role/content/media identity agrees. |
| Complete Tool call/result or call/error group | Retain only when correlation is complete/unambiguous, current fields are valid, and required refs resolve truthfully. |
| Unknown optional root/message field | Ignore and increment bounded field-omission diagnostics. |
| Unsupported media, invalid message, incomplete/ambiguous Tool group | Omit the affected logical unit/group and report its reason/count. Do not repair it. |
| Old `compacted_memory` unit without lineage or unsourced non-system unit | Omit it; do not preserve it as current memory and do not create baseline evidence. |
| Parse-invalid source or no surviving message | Return strict current WorkingContext with `agent_id = expectedSnapshotAgentId`, `messages: []`, and `converted_with_omissions`. |
| No-lineage v5 already strict/natural and fully truthfully backed | Retain bytes and only clean obsolete files after validation. |

Converter algorithm:

1. Require nonblank `expectedSnapshotAgentId`; this is current metadata authority, not historical content.
2. Decode only the observed v1/v3/v4/v5 shapes inside this migration boundary. If JSON/root decoding fails, continue with an empty candidate because there is no parseable contrary identity.
3. When the source is parseable, require a nonblank source `agent_id` equal to `expectedSnapshotAgentId`. Missing/blank/mismatch returns `identity_rejected`; it does not fall through to tolerant content conversion.
4. Preserve valid current-representable system messages in source order.
5. Preserve a non-system unit only when its current shape is valid and every required stored raw ID matches the input fact's same role/content/media or Tool identity. Never make an archived record newly archive-eligible.
6. Preserve a Tool group only when it is complete, unambiguous, valid, and truthfully sourceable. Do not search the fact set for a missing result and do not synthesize an interrupted/unknown result.
7. Ignore unknown optional fields and omit unsupported, invalid, incomplete, ambiguous, old-compacted-memory, or unsourced units. Record only bounded reason codes/counts; never copy dropped content into diagnostics.
8. Do not add a recovery notice, placeholder, baseline/repair raw row, or any other synthetic message/evidence.
9. If no message survives, use `messages: []`.
10. Finalize canonical messages, serialize schema v5 with `agent_id = expectedSnapshotAgentId`, and strict-validate the complete candidate before returning it.

#### Per-run publication and migration status

For each eligible native run the server migration:

1. reads the lineage state before any conversion and applies the no-snapshot/any-nonempty/absent-empty classification above;
2. for absent/empty-lineage conversion only, reads source bytes and materializes the exact location's bounded eligible-active reference facts;
3. calls the converter with `expectedSnapshotAgentId`, source bytes, and those facts;
4. maps `identity_rejected` to item `FAILED` with no snapshot change, or strict-validates the complete candidate before replacement;
5. writes the validated v5 payload through the existing snapshot store;
6. only after writing validated v5 removes `episodic.jsonl`, `semantic.jsonl`, and `compacted_memory_manifest.json`; and
7. leaves `compaction_lineage.jsonl` absent/empty for converted pre-lineage inputs.

Both conversion modes report `MIGRATED`; `converted_with_omissions` carries only bounded reason/count diagnostics and makes a completed aggregate `SUCCEEDED_WITH_WARNINGS`. Parseable identity rejection leaves the eligible target unchanged. Each attempt re-enumerates actual exact-classified native locations; the retained 347-file audit is evidence rather than a hard-coded inventory. Every nonempty-lineage location is immediately skipped untouched. Because migration runs before agent bootstrap, normal product execution cannot create an old snapshot concurrently, so no inventory fingerprint is needed. Raw traces/manifests remain byte-for-byte unchanged throughout. Filesystem behavior remains an existing-runner concern and is not expanded by this ticket.

`AppDataMigrationRunner` keeps its ordinary interface and lifecycle: `markRunning`, call `execute`, persist the returned result, and continue through the existing server startup path. No `prepareExecution` extension, aggregate all-file gate, compatibility/recovery protocol, or server-wide failure override is added. Omitted-content runs become restorable; parseable identity conflict leaves that eligible target untouched; all nonempty-lineage locations skip before conversion. API/E2E keeps memory and the migration repository/database under one isolated app-data root and tests representative content/identity/lineage classifications; the completed 347-file audit remains the product-corpus evidence.

#### Post-migration runtime

`WorkingContextSnapshotBootstrapper` accepts strict v5 only. Remove its `WorkingContextRecoveryProjector` dependency and the projector/export/tests. With a payload present, restore it exactly and apply normal tool safety. With no payload on the explicit restore path, throw a missing-snapshot invariant error. Do not consult active/archive raw traces, obsolete rows, or manifests to synthesize context. New-run creation remains separate and persists snapshots through the existing WorkingContext controller.

### LLM Request Recovery After Durable Compaction

Latest origin introduced a correct request-level recovery subject but captures it one lifecycle step too early. `LLMRequestAssembler` may durably accept a pending compaction before appending the current request. Therefore the stable recovery base must be established inside the assembler **after** system/tool safety and any pending compaction, and immediately **before** request-specific mutation/rendering.

Target sequence for both normal and tool-continuation preparation:

```text
LLMRequestAssembler
-> establish system/tool-safe base
-> PendingCompactionExecutor.executeIfRequired
-> MemoryManager.captureLlmRequestRecoverySnapshot (ephemeral stable base)
-> append current request when applicable
-> final tool-safety/media sanitation/provider render
-> RequestPackage { ..., recoverySnapshot }
```

Settlement rules:

- A failure after capture but before `RequestPackage` return is owned by the assembler: restore the checkpoint and rethrow. A pre-capture compactor failure follows existing DF-R01 behavior and retains its pending operation; there is no checkpoint to settle.
- A provider failure before a usable response is owned by `LlmPhase`: restore the checkpoint carried by the request package.
- After normal assistant/tool ingestion, `LlmPhase` commits/releases it.
- On an existing supported interruption path that intentionally retains current/partial content, ingest that content first and then commit/release the checkpoint before propagating the interruption. If the path intentionally retains nothing and defines rollback, restore once instead.

`LlmRequestRecoverySnapshot` remains ephemeral and owns only a copied `WorkingContext` plus pending-compaction state. It owns no raw/archive/output/lineage/tool-fact rollback. Consequently a successful C(n) stays current after a later request failure; recovery removes only request-specific mutation after the stable base, and the restored v5 snapshot remains consistent with the already-published lineage head.

## Data-Flow Spine Inventory

The approved DF IDs are retained. SR-012 adds the reachable request/recovery spines and revises only the native transition ownership.

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DF-P01 | Primary End-to-End | BEH-001, BEH-007 | Supported runtime activity | Original raw activity durably recorded | Raw ingestion / native `MemoryManager` boundary | Establishes original evidence |
| DF-P02 | Primary End-to-End | BEH-001 | Event Monitor open/page | Active-file projection returned | `LocalMemoryRunViewProjectionProvider` | Preserves activity-view source |
| DF-P03 | Primary End-to-End | BEH-005 | Native request without compaction | Finalized provider request | `LLMRequestAssembler`; `MemoryManager` | Keeps normal preparation canonical |
| DF-P04 | Primary End-to-End | BEH-002, BEH-003, BEH-005, BEH-008, BEH-009 | Pending compaction at preparation | M(n) accepted/current and dispatch proceeds | `PendingCompactionExecutor`; `MemoryManager` | Main compaction business flow |
| DF-P05 | Primary End-to-End | BEH-005, BEH-008 | Pending compaction during live tool turn | Tool protocol preserved, later compaction succeeds | Executor with manager invariants | Prevents invalid cuts |
| DF-P06 | Primary End-to-End | BEH-003–005, BEH-009 | Later compaction | Bounded M(n) replaces M(n-1) | Executor / manager | Makes compaction recurrent |
| DF-P07 | Primary End-to-End | BEH-006 | Native existing-run restore with v5 snapshot | Exact finalized context restored | Snapshot bootstrapper / manager | Normal native resume authority |
| DF-P08 | Primary End-to-End | BEH-004 | Typed artifact-origin query | Direct/root response with status | Lineage resolver | Makes lineage usable |
| DF-P09 | Primary End-to-End | BEH-001, BEH-007 | External runtime activity | Raw evidence recorded; provider continuation unchanged | `ExternalRuntimeMemoryWriter` | Preserves delivered raw-only external design |
| DF-P10 | Primary End-to-End | BEH-002, BEH-003, BEH-005, BEH-008, BEH-009 | Final no-tool response triggers compaction | Completed turn compacted immediately | `LlmPhase`; executor; manager | Covers real immediate path |
| DF-P11 | Primary End-to-End | BEH-010 | Work Evidence request | Regenerated package returned | `AgentWorkTraceProjectionService` | Preserves shared rendering |
| DF-P12 | Primary End-to-End | BEH-012 | Native request has pending compaction | Provider dispatch carries post-compaction recovery base | `LLMRequestAssembler` / `LlmPhase` | Prevents recovery from crossing a durable commit |
| DF-S02 | Secondary | BEH-006, BEH-013 | Startup inventory after external cleanup | Exact native snapshots converted/skipped/rejected and itemized result persisted | Native snapshot migration / ordinary runner | Current-only transition without blocking unrelated startup |
| DF-S03 | Secondary | BEH-008 | Compaction phase change | Observer receives lifecycle event | Executor/reporter | Preserves operation observability |
| DF-R01 | Return-Event | BEH-008 | Runner/parser failure | No accepted writes; same pending ID retries | Executor | Reachable consistency boundary |
| DF-R02 | Return-Event | BEH-001 | Active rewrite invalidates cursor | `EXPIRED` and UI reload | Active page policy | Prevents archive crossover |
| DF-R03 | Return-Event | BEH-012 | Post-capture assembly/provider failure | Request mutation removed; durable compacted base retained | Assembler or `LlmPhase` via recovery boundary | Restores only ephemeral request state |
| DF-L01 | Bounded Local | BEH-002, BEH-005, BEH-009 | Baseline WorkingContext | Exact M(n-1)+R(n) plan | Structured planner | Governs cut/raw refs |
| DF-L02 | Bounded Local | BEH-003, BEH-008, BEH-009, BEH-011 | Rendered history + built-in policy | IDless proposal with natural LLM-chosen counts | Structured strategy / system prompt | Separates semantics, safeguards, and identity |
| DF-L03 | Bounded Local | BEH-005, BEH-006 | Current output/continuation/input | Canonical finalized messages with local ranges | Context finalizer | Prevents provider repair and false origin |
| DF-L04 | Bounded Local | BEH-002, BEH-003, BEH-005, BEH-008 | Valid proposal and baseline | Archive/output/lineage/context/v5 published | `MemoryManager` / internal committer | Centralizes accepted transition |
| DF-L05 | Bounded Local | BEH-004 | Producing lineage record | Cycle-safe direct/root origin | Lineage resolver | Preserves direct/transitive meaning |
| DF-L06 | Bounded Local | BEH-006, BEH-013 | Exact classified native location | Gate lineage, build typed identity/reference-fact input, retain/convert v5, then clean obsolete native files | Native migration + core converter | Confines historical knowledge and prevents invalid-current reinterpretation |
| DF-L07 | Bounded Local | BEH-001 | Active snapshot/cursor | Valid or expired page | Active page policy | Stable active-only paging |
| DF-L08 | Bounded Local | BEH-009, BEH-011 | Planned logical prefix | One canonical XML-bounded history-only message | Conversation renderer / finalizer | Natural LLM-facing history |
| DF-L09 | Bounded Local | BEH-009, BEH-010 | Tight tool input + bound | Consumer-neutral tool body | Core condensed renderer | One shared readable policy |
| DF-L10 | Bounded Local | BEH-012 | Post-compaction canonical base | Captured, restored, or released request checkpoint | `LlmRequestRecoveryBoundary` behind assembler/phase | One-settlement ephemeral recovery |

## Primary Execution Spine(s)

```text
DF-P04 / DF-P06
Native request preparation
-> MemoryManager pending compaction identity
-> PendingCompactionExecutor
-> WorkingContextMessageWindowPlanner (M(n-1) + R(n))
-> canonical conversation renderer + built-in compactor policy
-> compactor runner -> uncapped parser/normalizer -> IDless proposal
-> MemoryManager accepted-compaction boundary
-> exact archive -> output rows -> lineage head -> finalized context -> v5 snapshot
-> stable request base
```

```text
DF-P12 / DF-R03
Native LlmPhase request
-> LLMRequestAssembler establishes system/tool safety
-> executes pending compaction through DF-P04 when required
-> captures ephemeral recovery checkpoint from post-compaction base
-> appends current request / sanitizes media / renders provider payload
-> RequestPackage carries checkpoint to LlmPhase
-> provider success: ingest and release
   OR provider failure: restore request base once
-> already-published archive/output/lineage remain untouched
```

```text
DF-S02
startConfiguredServer
-> AppDataMigrationRunner ordered required definitions
-> delivered external cleanup
-> RuntimeMemoryLocationClassifier
-> exact native AutoByteus locations only
-> lineage gate: any nonempty lineage skips untouched; absent/empty may convert
-> typed expected identity + source bytes + eligible-active reference facts
-> pure native converter + validated v5 publication
-> obsolete native rows/manifest cleanup
-> durable itemized migration result
-> ordinary startup continues; converted items are usable; rejected source identity remains untouched
```

```text
DF-P08
Explicit run/member scope + typed artifact ref
-> server memory-location boundary
-> CompactionLineageResolver
-> lineage store/output membership
-> archive manifest/read
-> recursive previousCompactionId traversal
-> direct/root origin response
```

```text
DF-P11
Work Evidence caller
-> AgentWorkTraceProjectionService
-> archive-plus-active source reader
-> replay correlation
-> Work-Evidence adapter
-> core CondensedToolCallRenderer/readable-value policy
-> timestamped Markdown/files/manifest
```

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DF-P04/DF-P06/DF-P10 | Executor holds operation identity; strategy turns a deterministic logical prefix into an IDless complete proposal; manager accepts and publishes one recurrent state transition | pending compaction, plan, proposal, accepted compaction, current output, finalized context | executor lifecycle; `MemoryManager` state | launch/reporting, hashes, file I/O |
| DF-P03 | Assembler establishes canonical state, captures the request-specific stable base, appends/finalizes input, and renders the provider package | stable context, current input, recovery checkpoint, provider request | `LLMRequestAssembler` through `MemoryManager` | provider wire/media sanitation |
| DF-P12/DF-R03 | Pending compaction becomes durable before capture; later assembly/provider failure restores only post-capture request mutation | accepted compaction, stable context, checkpoint, request package, settlement | assembler capture/local restore; `LlmPhase` provider settlement | recovery trace, diagnostics |
| DF-S02 | Shared classifier identifies exact current runtime locations and strict-v5 snapshot identity; native migration gates lineage, loads source/reference facts, delegates matching to the pure converter, publishes only absent/empty-lineage candidates, and persists itemized status | classified location, lineage state, typed conversion input, candidate/rejection, result | classifier; native migration/converter; ordinary runner | filesystem publication, status/logging |
| DF-P07 | Bootstrap validates and installs schema-v5 messages; lineage-head lookup remains separate from snapshot restore | snapshot messages, message-local ranges, lineage head | snapshot bootstrapper / lineage repository | tool safety, integrity checks |
| DF-P08 | Resolver starts from explicit scope/kind/ID, proves output membership, reads direct archive membership, walks predecessors, and reports completeness | artifact ref, lineage records, archive files, origin result | lineage resolver | authorization/redaction, hashes |
| DF-P11 | Projection retains raw replay/file ownership but delegates only visible-value/tool-body formatting to core | raw/replay events, condensed body, Markdown package | Work Trace projection service | regeneration/cleanup |
| DF-P02 | Event Monitor reads one active generation and expires cursors after active rewrite | active trace, cursor, UI page | local projection provider | paging limits |
| DF-R01 | Compactor rejection returns before acceptance; executor reports failure and retains pending identity | failure, pending compaction | executor | diagnostics |

## Spine Actors / Main-Line Nodes

- `LLMRequestAssembler` and `LlmPhase`
- `LlmRequestRecoveryBoundary` behind `MemoryManager`
- `MemoryManager` and `PendingCompactionExecutor`
- `WorkingContextMessageWindowPlanner` and `StructuredJsonCompactionStrategy`
- `CompactionConversationHistoryRenderer` and built-in Memory Compactor policy
- compactor runner/parser/normalizer
- `AcceptedCompactionCommitter` behind `MemoryManager`
- `WorkingContextFinalizer`, snapshot serializer/store/bootstrapper
- `RuntimeMemoryLocationClassifier`
- native WorkingContext migration and migration-only converter
- `CompactionLineageStore` / file implementation and `CompactionLineageResolver`
- raw-trace archive manager
- `ExternalRuntimeMemoryWriter`
- `AgentWorkTraceProjectionService`, Work Evidence renderer, and core readable presentation

## Ownership Map

| Node | Owns | Must Not Own |
| --- | --- | --- |
| `LLMRequestAssembler` | request stable-base sequence; system/tool safety; pending-compaction execution; post-compaction recovery capture; current-request mutation; local post-capture failure restore; package construction | provider stream settlement, durable-compaction rollback, lineage/file internals |
| `LlmPhase` | provider call/stream lifecycle; settle the checkpoint carried by a completed `RequestPackage`; ingest accepted response/partial content before release | choosing capture timing, manufacturing a pre-assembly checkpoint, archive/output/lineage rollback |
| `LlmRequestRecoveryBoundary` | copied WorkingContext + pending state, active/one-settlement invariant, restore persistence/recovery trace, release | durable raw/archive/output/lineage/tool-fact state or migration |
| `PendingCompactionExecutor` | pending-operation lifecycle, manager-produced baseline, proposal call, manager acceptance call, reachable retry/reporting | lineage/store/archive internals, direct context mutation |
| built-in Memory Compactor `agent.md` | natural summarization task, exact JSON response contract, quality-first semantic policy | per-operation history, model/runtime selection, IDs, acceptance, persistence |
| structured compaction strategy | plan, history-only operation message, runner call, parse/normalize, IDless proposal | stable system policy, output IDs, predecessor lookup, accepted candidate, durable writes, snapshot |
| `MemoryManager` | sole live context mutation; pending identity; compaction baseline/head verification; deterministic output IDs; predecessor mapping; accepted candidate/validation/commit; recovery boundary facade | provider wire, Event Monitor, recursive origin response |
| `AcceptedCompactionCommitter` | manager-internal archive -> output -> lineage -> context -> snapshot coordination | public lifecycle, retry policy, LLM calls |
| `WorkingContextFinalizer` | pure provider-neutral coalescing, message-local ranges/provenance/media/tool validation | persistence, provider encoding, selection |
| current-output loader/projector | exact lineage-head output projection; null when lineage absent/empty | ranking, historical decoding, second current pointer |
| `RuntimeMemoryLocationClassifier` | exact current standalone/team-member metadata-to-memory-location classification, derived strict-v5 snapshot identity (`runId`/`memberRunId`), and diagnostics | snapshot content, cleanup/conversion policy, arbitrary directory inference |
| native snapshot migration | native eligibility, absent/empty versus any-nonempty lineage gate, source-byte and eligible-active-fact loading, converter call, strict-v5 publish, exact cleanup, durable result | message/ref matching, external cleanup policy, normal restore, lineage creation, any raw mutation, global startup blocking or migration recovery machinery |
| native v5 converter | narrow historical projection, parseable-source identity equality, current-shape and message/content/media/tool/ref matching, omission diagnostics, finalization, strict-v5 result | filesystem/ledger/startup, raw writes/repair, synthetic content, or normal runtime behavior |
| app-data migration runner | ordered definitions, attempts/results persistence, retry eligibility/status return | treating one failed data item as global server exposure policy |
| lineage persistence | immutable direct records, exact output membership, append-order current head | content generation, ancestry traversal |
| lineage resolver | typed direct/root query, cycle/dedup/completeness/integrity | mutation or guessing |
| archive manager | exact selected record validation, one completed archive, manifest read | lineage meaning |
| snapshot bootstrapper | strict-v5 direct restore; explicit missing-snapshot failure | migration, raw-history reconstruction, Event Monitor, disaster recovery |
| `CondensedToolCallRenderer` | deterministic visible serialization/redaction/bounds/body | source lookup, envelope, IDs, timestamps |
| Work Evidence service/renderer | archive+active source enumeration, correlation, Markdown/files/manifest | compaction selection/current context |
| `ExternalRuntimeMemoryWriter` | Codex/Claude application raw-trace recording/rotation only | WorkingContext snapshot or native compaction semantics |
| provider renderer | provider-specific wire/tool/media mapping | user-section repair or memory selection |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MemoryManager.prepareAcceptedCompaction` / `commitAcceptedCompaction` | Manager context/state boundary and internal committer | Gives executor one authoritative accepted transition API | repository/path/file sequencing in executor |
| server `AgentMemoryOriginService.resolve` | core `CompactionLineageResolver` plus server memory-location service | Converts explicit product target to correct run-local store | guessed paths, GraphQL/UI policy, generic ID search |
| `WorkingContextCompactionStrategy.propose` | concrete structured strategy | Keeps registry/resolver pluggability while enforcing side-effect-free output | publication |
| `AgentWorkTraceProjectionService.generate` | source reader/renderer/store | Preserves current Work Evidence entrypoint | native compaction orchestration |

## Removal / Decommission Plan (Mandatory)

Rows marked `Implemented SR-004` are delivered cumulative cleanup. SR-010 prompt/cardinality work is also delivered and remains unchanged. Only the SR-015 native migration/restore/recovery corrections below are pending.

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| strategy calls to `MemoryStore.add` and `pruneRawTracesById` | Violated proposal/commit ownership and pre-write failure proof | `MemoryManager` + `AcceptedCompactionCommitter` | Implemented SR-004 | Store dependency removed from strategy |
| top-K `Retriever` inside `CompactedMemoryContextProjector` for normal current projection | Mixed outputs across successful compactions | `CurrentCompactionOutputLoader` + explicit bundle projector | Implemented SR-004 | Retriever may remain for unrelated general recall only |
| planner exclusion of `compacted_memory` | Broke recurrent semantics | constituent-aware unit builder/planner | Implemented SR-004 | Prior memory is selected logically and never added to raw archive refs |
| `Assistant work notes`, call-ID prompt lines, whole-line prefix clamp | Leaked reasoning/backend details and lost suffix silently | conversation renderer + core per-value renderer | Implemented SR-004 | No second condenser |
| singular `episodic_summary` result and old response aliases | Conflicted with exact target schema | exact `episodes` parser/result/normalizer | Implemented SR-004 | Clean-cut response contract |
| loose `message-provenance.ts` shape | Could not model composed user sections tightly | `working-context-provenance.ts` discriminated types/ranges | Implemented SR-004 | Current readers/writers use one message-local shape |
| `CompactedMemorySchemaGate`, semantic clear/replace helpers, compacted-memory manifest runtime authority, and all historical **runtime** snapshot/row readers | Conflicted with current-only lineage/output authority | migration-only historical converter + schema-v5 validators + lineage-head output loader | SR-004 runtime removal preserved; SR-012 transition revised | Historical knowledge remains migration-only |
| new-output `EpisodicItem.turnIds` and semantic `reference`/`tags` handling | Loose unscoped metadata was not target lineage | exact current-schema models/readers/writers | Implemented SR-004 | Pre-lineage row files are removed; no tolerant reader remains |
| v1-v4 snapshot decode in normal restore | v5 is sole runtime schema | native migration-only conversion before strict-v5 bootstrap | Pending SR-015 | Preserve usable native continuation without runtime compatibility |
| `WorkingContextRecoveryProjector`, last-twelve raw projection, and its public export | No supported existing-run snapshot-less restore path; reconstructed context diverges from exact snapshot authority | explicit missing-snapshot restore failure; unchanged new-run initialization; native migration converts eligible snapshots | Pending SR-015 | Raw storage is only a source-reference validator during migration, never context reconstruction input |
| `autobyteus-server-ts/.../agent-work-trace-redactor.ts` | Duplicated redaction and silently truncated prefixes | core readable-value/condensed renderer | Implemented SR-004 | Server adapter retains Work Evidence envelope |
| provider-side adjacent-user semantic repair | Canonical state must equal snapshot and rendered meaning | `WorkingContextFinalizer` before both | Implemented SR-004 | Provider-specific wire mapping remains provider-owned |
| fixed 1–3 episode, 20-fact, and per-category/member caps plus duplicated operation policy | Conflicted with the approved natural semantic sizing and truthful prompt audit | exact `agent.md`; history-only builder; uncapped parser/normalizer/accepted/lineage structural validators | Delivered SR-010 | Preserve current source; no SR-015 work |
| `ResetPreLineageMemoryAppDataMigration` and destructive snapshot-deletion helper/tests | Deletes native continuation and its ID is already recorded | `MigrateNativeWorkingContextSnapshotsV5Migration` with exact new ID, shared classifier, typed converter seam, and lineage gate | Pending SR-015 | Convert exact native absent/empty-lineage locations only |
| ticket-owned `RequiredAppDataMigrationError`, aggregate throw, and `startConfiguredServer` rethrow/tests | Conflicts with latest-origin nonblocking startup and the completed external cleanup | ordinary runner lifecycle | Pending SR-015 | Remove global failure override; do not add a ticket-specific recovery protocol |
| pre-assembly recovery capture in `LlmPhase` | Can roll context behind a durable compaction | assembler-owned post-compaction capture carried in `RequestPackage`; phase-owned settlement | Pending SR-015 | Recovery never rolls back archive/output/lineage |

## Return Or Event Spine(s) (If Applicable)

- **DF-R01:** runner/parser error -> executor failure classification/report -> caller abort/diagnostic -> pending state remains -> next normal request re-enters DF-P04. No acceptance API is called.
- **DF-R02:** completed archive rewrites active generation -> later Event Monitor page detects generation mismatch -> returns `EXPIRED` -> UI reloads latest active view.
- **DF-R03:** assembler post-capture failure -> assembler restores once and rethrows; or provider failure -> `LlmPhase` restores the package checkpoint once. Both return to the post-compaction stable base and never undo durable compaction.

DF-S03 remains a **secondary** observability spine: executor phase change -> `CompactionRuntimeReporter` -> existing runtime event transport -> observer. It uses the same `compactionId`; the reporter never creates an identity.

## Bounded Local / Internal Spines (If Applicable)

| Spine | Parent Owner | Arrow Chain | Why It Matters |
| --- | --- | --- | --- |
| DF-L01 | Structured planner | context -> constituent units -> protect systems/live tool suffix -> budget retained suffix -> select optional compacted-memory region by kind/range + natural prefix -> require raw-backed R(n) -> plan; manager retains lineage head separately | Separates logical prior memory from archive-eligible new activity |
| DF-L02 | Structured strategy | plan -> render exactly one history-only operation message -> apply built-in natural task/schema/quality system policy under unchanged launch/provider configuration -> runner -> exact all-entry parse -> cleanup/deduplicate/noise-filter/positive-salience normalize without count caps -> IDless proposal | Ensures semantic counts are model-decided while application structure, output identity, and accepted state remain separately owned |
| DF-L03 | `MemoryManager` via finalizer | optional current output + continuation/current input -> compatible user coalescing -> message-local ranges/raw provenance/media -> tool validation | Makes one canonical state for snapshot, later planning, and render |
| DF-L04 | `MemoryManager` plus internal committer/lineage store | verify pending/head -> assign IDs/map head to predecessor/build accepted candidate (new prompt audit value 2) -> exact archive -> output rows -> normalize/append lineage with natural-count membership -> read head/exact output -> install context -> v5 snapshot -> clear pending | One normal acceptance/publication sequence behind one owner; no post-output count rejection |
| DF-L05 | Resolver | prove artifact membership -> direct archive -> previous record -> visited set -> dedupe -> intervals/status | Keeps records direct and queries recursive |
| DF-L06 | Native WorkingContext migration | exact metadata identity -> lineage gate -> source bytes/eligible-active facts -> pure identity/message/ref matching -> retain current-valid sourceable units/omit unsupported units -> finalize/strict-v5 validate -> snapshot replace -> exact cleanup -> persist status | Produces usable current v5 without raw mutation, Tool repair, invalid-current reinterpretation, unrelated startup blocking, or external/unclassified changes |
| DF-L07 | Active page policy | active snapshot/generation -> cursor validation -> page or expired | Keeps UI active-only |
| DF-L08 | Conversation renderer | planned units -> flatten visible messages -> `WorkingContextFinalizer` canonical turns -> common values/tool bodies -> labels/order -> escape -> one XML boundary | Makes the history semantically natural without duplicating user-composition policy |
| DF-L09 | Core presentation | tight input -> derive status -> serialize/redact -> head/tail bound -> body | Prevents duplication without merging consumer orchestration |
| DF-L10 | Recovery boundary | capture post-compaction context/pending state -> append/render request -> restore once on failure or release after retained outcome | Keeps ephemeral request recovery inside the authoritative context boundary |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| runtime/model execution metadata | DF-P04, DF-P06, DF-P10 | accepted compaction | Capture resolved runtime/model/provider identity and policy/prompt versions | Audit derivation context | Strategy or LLM could invent storage metadata |
| lifecycle reporting | DF-S03, DF-R01 | executor | existing started/completed/failed events | Observability | Reporter could become operation owner |
| authorization/scope resolution | DF-P08 | server origin service | resolve explicit standalone/team-member target to allowed memory location | Tenant/member isolation | Core resolver could infer paths or authorization |
| canonical hashing | DF-L04, DF-L08 | lineage store/renderer | optional rendered-input and record integrity hashes | Verification only | Hash could be mistaken for evidence relation |
| redaction | DF-L08, DF-L09, DF-P11 | core presentation | remove sensitive/backend text before length budgeting | Consistent safe display | Consumer-specific divergent leakage |
| provider wire translation | DF-P03–DF-P06 | provider renderer | encode finalized context | Providers differ | Renderer could repair semantic context invisibly |
| paging limits/generation | DF-P02, DF-R02 | active projection | bounded active pages and stale cursor detection | UI consistency | UI could start reading archives |
| generated artifact cleanup | DF-P11 | Work Evidence store | replace/regenerate derived package | Files are derived | Cleanup could delete raw authority |
| runtime-memory classifier | DF-S02, DF-L06 | server agent-memory subsystem | map exact current standalone/team-member metadata to runtime-kind locations and diagnostics | Reused by external cleanup and native conversion without merging their policies | Either migration could guess paths or diverge on eligibility |
| native snapshot migration filesystem owner | DF-S02, DF-L06 | app-data migration | process exact native locations; gate lineage; load source/facts; validate complete candidate; replace with v5; exact cleanup; report omissions and identity rejection; never mutate raw traces | Preserve native run usability under one current runtime epoch | Broad deletion or invalid-current conversion could lose/mix state |
| request recovery diagnostics | DF-P12, DF-R03, DF-L10 | recovery boundary | append one recovery trace after restore; no durable-state undo | Preserve operational evidence | Diagnostics could become transaction logic |

## Ownership Boundaries

1. **Request/lifecycle to accepted state:** executor may ask a strategy for a proposal and ask `MemoryManager` to accept/commit it. It never coordinates files.
2. **LLM/strategy content to application identity:** `agent.md` defines the complete concise natural task plus stable JSON/quality policy; the operation user message supplies only rendered canonical history turns; parser/normalizer preserve every structurally valid entry while enforcing per-entry/cleanup rules; and the strategy returns content plus input selection only. `MemoryManager` acceptance derives episode/semantic IDs deterministically from `compactionId` and stable output order and creates the accepted relation/context candidate without cardinality policy. Lineage normalization validates relation structure, not semantic item maxima; it preserves the supported producing prompt audit value.
3. **Live context to persistence:** only `MemoryManager` installs/replaces/finalizes `WorkingContext`. Snapshot store serializes the installed candidate; it does not choose or repair it.
4. **Lineage record to evidence content:** lineage stores direct references. Archive manager owns raw membership/content; episodic/semantic stores own derived content.
5. **Product target to filesystem scope:** server memory-location services map explicit standalone or team-member target identities to the correct memory root. The core resolver receives an already explicit scope/store; it never parses an absolute path into identity.
6. **Shared presentation to consumer envelope:** core owns safe bounded visible body; compaction owns logical selection/XML/task; Work Evidence owns raw correlation/timestamps/Markdown/files.
7. **Canonical context to provider wire:** provider renderers translate but do not merge semantic user sections or select memory.
8. **Native persisted data to current runtime:** the shared server classifier identifies exact current locations; the native migration plus migration-only converter owns eligible historical snapshot formats and obsolete filenames. It validates/publishes strict v5 before exact cleanup. The ordinary runner persists/returns status without a ticket-specific global block. Normal current loaders never inspect old formats or raw history.
9. **Stable compactor policy to one operation:** the built-in system prompt owns the complete concise natural task and exact JSON/semantic quality; `WorkingContextFinalizer` remains the one canonical user-composition owner; the operation renderer reuses that boundary over selected visible messages and byte-emits only canonical history turns, never one composed user turn as consecutive `User:` labels; parser/normalizer own structural/non-cardinality cleanup; and acceptance owns application invariants. Launch/provider output-token configuration remains unchanged. None may duplicate another layer's concern or reintroduce cardinality policy.
10. **Stable request base to failure settlement:** assembler owns capture after any durable compaction and local post-capture restore; `LlmPhase` owns provider outcome settlement; `LlmRequestRecoveryBoundary` owns the copied context/pending state and one-settlement invariant. None may roll back durable evidence or lineage.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers | Forbidden Bypass | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemoryManager` accepted-compaction API | ID assignment, head validation, finalizer, committer, snapshot | executor/bootstrap | strategy/executor calling stores | strengthen accepted types/API |
| `MemoryManager` request-recovery API | copied context/pending state and one-settlement boundary | assembler and `LlmPhase` | caller mutating coordinator internals or durable files | expose focused capture/restore/release methods |
| `CompactionLineageStore` | append-only records, output lookup, tail | committer/resolver/loader | direct JSON/file writes | add singular typed methods |
| `RawTraceArchiveManager.archiveExact` | selected-ID validation, completed archive/manifest | committer/resolver | fabricated filenames/membership | return typed completed descriptor |
| `WorkingContextFinalizer.finalize` | canonical user composition, ranges/raw/media/tool validation | manager/bootstrapper/conversation renderer | provider/renderer inventing connectors | add focused pure selected-message input |
| `RuntimeMemoryLocationClassifier.classify` | exact metadata-to-location map, derived expected snapshot identity, and diagnostics | external cleanup and native migration | each migration guessing/walking ownership independently | extend one narrow classification result |
| `MigrateNativeWorkingContextSnapshotsV5Migration.execute` | native eligibility, lineage gate, source/fact loading, per-run converter/publish/cleanup/result lifecycle | app-data migration runner | message matching, normal restore, raw mutation, broad deletion, external cleanup behavior, or global prepared planning | keep filesystem/history policy migration-local |
| `NativeWorkingContextSnapshotV5Converter.convert` | historical decode, identity/current-shape/message/source/tool-group matching, omission, finalization, strict-v5 candidate or identity rejection | native migration only | filesystem/ledger/raw writes or repair/normal bootstrap/global inventory | keep pure deterministic per-run output |
| `AppDataMigrationRunner.runPending` | ordered required attempts, durable result persistence, status return | `startConfiguredServer` | migration-specific handling or ticket-global failure throw | keep ordinary current runner contract |
| `CondensedToolCallRenderer.render` | serialization/redaction/bounds/body | compaction and Work Evidence adapters | local clipping/body format | extend tight common options only |
| built-in Memory Compactor definition | stable JSON/quality policy | server compactor launch | operation prompt duplicate policy or hidden counts | revise canonical prompt/structural validators |
| `AgentMemoryOriginService.resolve` | product target authorization/location and resolver construction | future internal callers | arbitrary memory path | keep explicit target union |

## Dependency Rules

Allowed:

```text
server exact runtime-location classification
  -> external cleanup eligibility OR native migration eligibility
     -> native migration lineage gate + source/reference-fact loading
        -> native migration-only core converter owns identity/message/ref matching
```

```text
request lifecycle
  -> LLMRequestAssembler
     -> PendingCompactionExecutor -> MemoryManager accepted-state boundary
     -> MemoryManager request-recovery boundary
  -> RequestPackage
  -> LlmPhase provider settlement
```

```text
server product target/location
  -> autobyteus-ts lineage resolver
     -> run-local lineage/archive/memory stores
```

```text
compaction adapter --------\\
                            -> autobyteus-ts presentation
Work Evidence adapter -----/
```

Forbidden:

- `autobyteus-ts` importing `autobyteus-server-ts`;
- strategy/executor directly writing archive/memory/lineage/snapshot files or assigning output IDs;
- request recovery capturing before pending compaction or restoring raw/archive/output/lineage/tool facts;
- `LlmPhase` depending on `MemoryManagerCompactionCoordinator` internals;
- either migration guessing runtime ownership from paths or scanning unknown files to assign a runtime kind;
- native migration converting external/imported/unsupported/unclassified/conflicting locations;
- normal restore decoding historical snapshots or reconstructing WorkingContext from raw traces/obsolete rows;
- app-data runner/server turning one native conversion failure into a ticket-specific global startup block;
- normal projection using top-K retrieval when a lineage head exists;
- snapshot/message constituents carrying compaction/output/current-state identities;
- resolver using ambiguous artifact IDs or guessed scope/path;
- provider renderers repairing semantic adjacency or selecting memory;
- Work Evidence reading `WorkingContext`, or compaction reading generated Markdown;
- common renderer correlating source events or adding consumer envelopes;
- operation prompt duplicating `agent.md` policy; or
- parser/normalizer/acceptance/lineage rejecting or truncating structurally valid output by item count.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `MemoryManager.captureCompactionBaseline()` | compaction baseline | expose strategy input plus manager-owned head baseline | pending `compactionId` + scope | strategy sees only strategy input |
| `WorkingContextCompactionStrategy.propose(input)` | IDless proposal | plan/render/run/parse/normalize without writes/IDs | baseline context + execution context | natural item counts retained |
| `MemoryManager.prepareAcceptedCompaction/commitAcceptedCompaction` | accepted transition | verify pending/head, assign IDs, validate, publish | manager baseline + proposal | one authoritative boundary |
| `RawTraceArchiveManager.archiveExact(input)` | completed archive | exact selected membership and descriptor | non-empty raw IDs + internal key | internal key never becomes lineage identity |
| `CompactionLineageStore.appendNext(expected, record)` | immutable lineage/head | verify prior tail/predecessor and append once | scope + unique compaction ID | no separate current pointer |
| `CurrentCompactionOutputLoader.loadCurrent()` | current M(n) | absent/empty lineage -> null; else exact tail outputs | run-local scope/store | no ranking/fallback |
| `WorkingContextFinalizer.finalize(input)` | canonical context | coalesce compatible user sections and validate ranges/tools | typed sections or selected messages | no lineage lookup |
| `WorkingContextSnapshotSerializer.serialize/deserializeV5` | snapshot v5 | exact messages/local-range round trip | strict v5 | no compaction/output IDs |
| `LLMRequestAssembler.prepare*` | stable request package | stabilize/compact, capture, mutate/render; restore local post-capture failure | turn/request ID + user/tool mode | returned package carries active checkpoint |
| `MemoryManager.capture/restore/commitLlmRequestRecoverySnapshot` | ephemeral request recovery | capture current context/pending state; restore or release once | request/turn + opaque snapshot | no durable-state rollback |
| `RuntimeMemoryLocationClassifier.classify()` | exact runtime locations | current metadata/location classification | configured memory root | no snapshot conversion |
| `NativeWorkingContextSnapshotV5Converter.convert(input)` | migration-only projection | decode historical source, validate parseable identity, match stored refs against supplied eligible-active facts, omit unsupported units, finalize/strict-validate | `NativeSnapshotConversionInput` with expected identity + source bytes + typed facts | returns candidate or typed identity rejection; no filesystem/raw lookup |
| `MigrateNativeWorkingContextSnapshotsV5Migration.execute()` | native transition | lineage gate, source/fact load, converter delegation, strict-v5 publish, exact cleanup, itemized result | exact AutoByteus `RuntimeMemoryLocation` with standalone/team identity | only absent/empty lineage converts; every nonempty lineage skips untouched; filesystem behavior stays with the existing runner |
| `AppDataMigrationRunner.runPending()` | migration attempts/results | execute required definitions and persist/return statuses | registry + durable records | latest-origin nonthrowing aggregate contract |
| `CompactionLineageResolver.resolve(input)` | origin response | typed direct/root traversal | scope + artifact kind + ID | no generic ID |
| `CondensedToolCallRenderer.render(input, options)` | readable Tool body | deterministic safe body | discriminated outcome + bound | no-outcome -> `result: not available` |
| `AgentMemoryOriginService.resolve(input)` | product-scoped origin | authorize/locate/delegate | standalone or team-member target + artifact | internal only |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| strategy proposal | Yes | Yes | Low | no stores/produced IDs |
| manager accept/commit | Yes | Yes | Low | baseline captures pending/head |
| request recovery | Yes | Yes | Medium | capture after compaction; opaque one-settlement snapshot; no durable rollback |
| runtime-location classifier | Yes | Yes | Medium | exact current metadata only; no content/deletion policy |
| native converter input/result | Yes | Yes | Low | expected run/member snapshot identity, source bytes, and bounded same-subject facts; candidate or identity rejection |
| native migration | Yes | Yes | Medium | exact AutoByteus predicate; explicit lineage gate; pure converter; validated publication |
| runner | Yes | Yes | Low | persist/return statuses; no ticket-global throw |
| lineage append/head | Yes | Yes | Low | reject fork/duplicate |
| origin resolver | Yes | Yes | Low | kind and scope mandatory |
| finalizer/v5 serializer | Yes | Yes | Low | local ranges only; current schema only |
| condensed renderer | Yes | Yes | Low | source/envelope remain outside |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| original activity | `RawTraceItem` / raw trace | Yes | Low | do not call it raw memory |
| successful relation | `CompactionLineageRecord` | Yes | Low | no WorkEvidenceSnapshot/generation/segment IDs |
| current selection | lineage tail/current head | Yes | Low | no second selector |
| LLM result before writes | `WorkingContextCompactionProposal` | Yes | Low | reserve accepted for enriched candidate |
| composed logical region | `UserConstituent` | Yes | Low | local section/range only |
| native transition | `MigrateNativeWorkingContextSnapshotsV5Migration` | Yes | Low | exact runtime/schema scope in name |
| exact location policy | `RuntimeMemoryLocationClassifier` | Yes | Low | not a generic filesystem helper |
| migration conversion | `NativeWorkingContextSnapshotV5Converter` | Yes | Low | not a runtime decoder |
| request recovery | `LlmRequestRecoverySnapshot` | Yes | Low | explicitly ephemeral, not persisted WorkingContext snapshot |
| completed raw source | `rawTraceArchiveFile` | Yes | Low | existing manifest filename, not absolute path |
| shared tool body | `CondensedToolCallRenderer` | Yes | Low | not an agent/Work Evidence renderer |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Capability | Decision | Why |
| --- | --- | --- | --- |
| exact raw archive | `RawTraceArchiveManager` | Reuse | authoritative immutable archive owner |
| live context/pending/accepted transition | `MemoryManager` | Reuse/extend | authoritative current state boundary |
| request recovery | `LlmRequestRecoveryBoundary` | Reuse, move capture timing | subject and one-settlement mechanics exist; boundary timing is defective |
| strategy registry | compaction registry | Reuse | pluggability remains valid |
| current output/lineage | loader + lineage subsystem | Preserve/verify | delivered natural membership and mixed-audit behavior |
| canonical user composition | `WorkingContextFinalizer` | Reuse | one provider-neutral invariant owner |
| readable values/tools | `memory/presentation` | Reuse unchanged | already shared by both consumers |
| compactor policy | built-in `agent.md` | Preserve unchanged | delivered canonical product-managed contract |
| exact runtime location | external-cleanup metadata/location logic | Extract narrow classifier | same exact concern now serves two migrations |
| migration reference facts | current active raw store and `RawTraceItem` fields | Reuse through a bounded immutable fact projection | server loads exact-scope facts; pure converter alone matches stored message refs; no second raw model or search/repair path |
| migration lifecycle | server app-data migrations | Reuse ordinary runner/repository; replace definition | no new framework/global startup policy |
| product path/layout | `AgentMemoryLocationService` | Reuse behind classifier | already owns standalone/team location construction |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory/compaction` | planning, operation rendering adapter, runner/parser/normalizer, proposal, executor | DF-P04–P06, P10, DF-R01, DF-L01/02/08 | executor/strategy | Preserve delivered SR-010 | No persistence; system policy is singular and there are no item-count caps |
| server built-in Memory Compactor template | exact JSON/quality system policy from `memory-compactor-prompt-content-contract.md` | DF-P04–P06, P10, DF-L02 | built-in agent definition | Preserve delivered SR-010 | Current source is exact; `agent-config.json` and launch/provider settings remain unchanged |
| `memory/context` (root WorkingContext/recovery files) | typed local ranges/finalization plus ephemeral request recovery | DF-P03–P07, DF-P12, DF-R03, DF-L03/10 | `MemoryManager` | Extend narrowly | No derived-memory IDs or durable rollback |
| `memory/lineage` | scope, successful records, persistence/current-head contract, resolver/result | DF-P08, DF-L04/05 | manager/resolver | Preserve delivered SR-010 | No SR-014 change |
| `memory/store` | current file implementations, raw archive, exact output lookup, snapshot | DF-L04/05 | manager/bootstrap/resolver | Reuse | Delivered store already carries natural membership and mixed audit versions |
| `memory/projection` | explicit current-output load and one current bundle projection | DF-P03–P07 | manager/bootstrap | Reuse | Delivered exact-tail selection and natural membership projection remain unchanged |
| `memory/restore` | strict schema-v5 direct restore only | DF-P07 | bootstrapper | Modify narrowly | Remove recovery projector; missing explicit restore snapshot fails |
| `memory/migration` | native pre-lineage snapshot conversion to strict v5, including typed input/result and sole message/ref matching policy | DF-S02/DF-L06 | migration-only converter | Add focused capability | Reuse current primitives; no runtime decode, Tool repair, or filesystem access |
| `memory/presentation` | safe visible values and condensed Tool body | DF-L08/09, DF-P11 | both adapters | Reuse unchanged | Tight concern-neutral core already implemented |
| server `agent-memory/services` | exact current runtime memory-location classification | DF-S02, DF-L06 | `RuntimeMemoryLocationClassifier` | Extract from delivered external cleanup | Shared location concern only; migrations keep distinct policies |
| server `app-data-migrations` | native-only v5 publication and exact cleanup | DF-S02, DF-L06 | native migration; ordinary runner | Replace definition; revert ticket-global gate | Own filesystem/new ID/result; delegate pure conversion |
| server `agent-work-traces` | raw replay adapter and existing envelope/files | DF-P11 | projection service | Reuse unchanged | Already imports core presentation |
| server memory origin service | explicit product target/location adapter | DF-P08 | internal caller | Reuse + verify | Existing internal facade; no public GraphQL/UI |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `working-context-compaction-proposal.ts` | compaction | strategy/executor boundary | IDless proposal with selected raw IDs, retained messages, normalized content, and execution metadata | One shared boundary model; baseline head remains manager-owned | Yes |
| `accepted-compaction-committer.ts` | compaction | manager internal | normal publication sequence | Sequencing is cohesive and testable | Yes |
| `compaction-conversation-history-renderer.ts` | compaction | prompt adapter | selected constituent messages -> `WorkingContextFinalizer` -> labeled history/XML | Keeps planning granularity from leaking into model-visible turn structure without duplicating composition policy | Yes |
| `working-context-provenance.ts` | context | manager/finalizer | discriminated message/constituent ranges and raw-backed provenance | Shared schema for planner/snapshot/finalizer; no lineage/output identity | Yes |
| `working-context-finalizer.ts` | context | manager | deterministic coalescing/ranges | One pure invariant owner | Yes |
| `compaction-lineage-record.ts` | lineage | persistence/resolver | immutable successful-record structural validation plus supported prompt audit values 1/2; no count maximum | One direct-relation subject | Yes |
| `compaction-lineage-resolver.ts` | lineage | query owner | traversal/status/result | One graph-query owner | Yes |
| `file-compaction-lineage-store.ts` | store | persistence provider | successful-record JSONL plus efficient tail/read/find operations | One physical capability and one truth | Yes |
| `current-compaction-output-loader.ts` | projection | selection owner | lineage tail -> exact output rows | Focused alternative to Retriever | Yes |
| `compacted-memory-projection-bundle.ts` | projection | loader/projector boundary | tight transient lineage-head record plus output-row content | Lets loader validate exact rows while projector emits no IDs into messages | Yes |
| `native-working-context-snapshot-v5-converter.ts` | core migration | migration-only pure owner | typed expected-identity/source-byte/reference-fact input; historical decode; identity/current-shape/message/ref matching; unsupported-unit omission; empty-message minimum; finalization; strict-v5 candidate or identity rejection; bounded diagnostics | Reuses current primitives while keeping runtime clean | Yes |
| `runtime-memory-location-classifier.ts` | server agent-memory | exact classification owner | current metadata -> standalone/team-member runtime locations with `runId`/`memberRunId`-derived snapshot identity + diagnostics | Reused by two migrations without policy coupling | Yes |
| `migrate-native-working-context-snapshots-v5-migration.ts` | server migration | native transition owner | filter exact AutoByteus, gate lineage, load source bytes/eligible-active facts, invoke converter, replace with validated v5, exact cleanup, warning/identity aggregation; no raw writes | Filesystem/ledger concerns stay out of core/runtime | Yes |
| `llm-request-assembler.ts`, `llm-request-recovery.ts`, `llm-phase.ts` | request/context | capture and settlement owners | post-compaction capture, package carriage, local/provider settlement | Extends existing recovery subject without new coordinator | Yes |
| `readable-value-renderer.ts` | presentation | common | serialization/redaction/head-tail bound | Shared primitive | Yes |
| `condensed-tool-call-renderer.ts` | presentation | common | tool body | Depends on readable value primitive | Yes |
| server Work Evidence renderer changes | Work Evidence | existing renderer | adapt replay tool event to common input | Keeps envelope local | Yes |
| server origin service | memory product adapter | server boundary | target/location -> core resolver | Product identity differs from filesystem | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| user-section ranges and raw provenance | `working-context-provenance.ts` | WorkingContext | planner, finalizer, snapshot, and restore need one message-local shape | Yes | Yes | compaction/output IDs or duplicated constituent content |
| selected compacted-memory content bundle | `projection/compacted-memory-projection-bundle.ts` | projection | lineage-head loader, projector, and message builder share one transient source/content shape | Yes | Yes | second persisted memory/state store |
| compaction proposal/candidate | `working-context-compaction-proposal.ts` | compaction | strategy, executor, manager share transition boundary | Yes | Yes | produced-ID owner or persistence repository |
| lineage scope | `lineage/compaction-lineage-scope.ts` | lineage | record/query/server adapter need same explicit identity | Yes | Yes | filesystem path parser |
| artifact ref/origin result | `lineage/memory-origin-resolution.ts` | lineage | resolver and caller need exact query/result | Yes | Yes | generic mixed artifact response |
| visible serialization/redaction/bounds | `presentation/readable-value-renderer.ts` | presentation | both consumers require identical policy | Yes | Yes | broad event renderer |
| condensed tool body | `presentation/condensed-tool-call-renderer.ts` | presentation | identical grammar/status rules | Yes | Yes | source correlator or envelope |
| exact runtime memory location | `runtime-memory-location-classifier.ts` | server agent-memory | external cleanup and native migration require the same current metadata/location policy | Yes | Yes | snapshot converter or migration policy |
| per-run native conversion seam | `native-working-context-snapshot-v5-converter.ts` | core migration | server migration and pure converter need one exact expected-identity/source-byte/reference-fact contract | Yes | Yes | filesystem plan, raw search, or runtime DTO |
| request recovery snapshot | `llm-request-recovery.ts` | WorkingContext | assembler and phase share one opaque checkpoint/settlement contract | Yes | Yes | durable compaction transaction |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CompactionLineageScope` | Yes | Yes | Low | exact target union; no absolute path |
| `CompactionLineageRecord` | Yes | Yes | Low | optional previous ID only; no historical-input variant, raw list/content, or boundary key |
| `MemoryArtifactRef` | Yes | Yes | Low | kind required |
| `WorkingContextCompactionProposal` | Yes | Yes | Low | keep selected raw IDs, retained messages, normalized content, and execution metadata only; baseline head/produced IDs/persistence details remain manager-owned |
| `CompactedMemoryProjectionBundle` | Yes | Yes | Low | transiently carries the lineage-head record and exact content rows; projector does not copy IDs into messages |
| `UserConstituent` ranges | Yes | Yes | Low | validate non-overlap/in-bounds and slice physical message; do not copy text |
| `CondensedToolCallInput` | Yes | Yes | Low | result/error derive status; no_outcome alone accepts status |
| `RuntimeMemoryLocation` | Yes | Yes | Low | exact subject/path/runtime plus derived `snapshotAgentId`; standalone value must equal `runId`, team value must equal `memberRunId`; no snapshot state/action |
| `NativeSnapshotConversionInput` | Yes | Yes | Low | expected agent identity, source bytes, and exact-scope eligible-active facts only; no paths, archive facts, or mutation operations |
| `NativeSnapshotConversionResult` | Yes | Yes | Low | one candidate branch or one identity-rejection branch; no persisted plan, copied dropped content, or repair operation |
| `LlmRequestRecoverySnapshot` | Yes | Yes | Low | WorkingContext + pending state only; no durable artifact identities |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-proposal.ts` | compaction | strategy/executor/manager boundary | IDless proposal and manager-built accepted-candidate types | Transition vocabulary is cohesive; produced IDs exist only on the accepted side | lineage/context types |
| `.../working-context-compaction-strategy.ts` | compaction | strategy interface | side-effect-free `propose` contract | Existing abstraction remains | proposal |
| `.../structured-json-compaction-strategy.ts` | compaction | concrete strategy | plan/render/run/parse/normalize proposal | One strategy implementation | planner, renderer, proposal |
| `.../pending-compaction-executor.ts` | compaction | lifecycle | request manager-produced baseline, pass only strategy input to proposal call, return baseline plus proposal to manager acceptance, failure/retry | Existing lifecycle owner; no direct lineage/store read | proposal |
| `.../accepted-compaction-committer.ts` | compaction | manager internal | preserve archive -> output -> lineage -> context -> snapshot order; exercise natural membership through append | Separates file coordination from manager state API | lineage/archive/snapshot |
| `.../compaction-conversation-history-renderer.ts` | compaction | source adapter | flatten selected visible unit messages, reuse `WorkingContextFinalizer` for canonical user turns, then render ordered User/Assistant/Tool history, escaping, and one XML boundary | Consumer-specific envelope; one `User:` label per canonical turn; owns no connector wording | finalizer + common presentation |
| `.../working-context-compaction-prompt-builder.ts`; `autobyteus-ts/src/memory/index.ts` | compaction | history-only operation-message adapter and public export | return exactly one complete canonical-turn rendered history with no static prefix/suffix; remove `COMPACTION_RESULT_SHAPE` and its unused public export | Per-operation source payload remains separate from stable system policy | conversation renderer |
| `.../compaction-result.ts`, parser, normalizer | compaction | output structure and cleanup | exact fields, all-entry parse, existing per-entry bounds, deduplication/noise filtering, deterministic ordering, positive salience; no item-count caps | Existing cohesive files; no new result field | N/A |
| `.../accepted-compaction-builder.ts` | compaction | manager acceptance helper | require at least one episode, validate accepted references/structure without count maxima, and write current prompt contract version 2 | Existing acceptance boundary | proposal/lineage/context types/current prompt-version constant |
| `.../working-context-message-unit.ts`, builder, planner | compaction | selection | constituent-aware logical units and R(n) cut | Existing planning capability | context provenance |
| `autobyteus-ts/src/memory/working-context-provenance.ts` | context | shared schema | discriminated single/composed message-local provenance and ranges | One authoritative type model for planner/finalizer/snapshot; no compaction/output IDs | N/A |
| `.../working-context-finalizer.ts` | context | canonical composition boundary used by `MemoryManager`, bootstrap, and compaction rendering | canonical adjacent-compatible user composition and natural retained/current framing | Singular invariant reused rather than reimplemented | provenance |
| `.../memory-manager.ts` | context/state | authoritative boundary | pending identity, compaction baseline/accept/commit/install/finalize, focused recovery facade | Existing governing owner | committer/finalizer/recovery |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | request | stable-base/capture owner | stabilize/compact, capture, request mutation/render, local restore, package return | Capture belongs where durable compaction and request mutation order are known | manager recovery facade |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | request lifecycle | provider settlement owner | consume package checkpoint; restore on provider failure or release after retained outcome | Existing provider lifecycle owner | request package only |
| `autobyteus-ts/src/memory/llm-request-recovery.ts` | context | ephemeral recovery owner | copy context/pending state; enforce one restore/release; persist restored snapshot/trace | Existing tight subject; no new coordinator | WorkingContext/pending state |
| `.../memory-manager-compaction-coordinator.ts` | compaction state | manager internal | capture/restore pending flags through tight value object | Recovery host adapter only | no public lifecycle |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-scope.ts` | lineage | identity | runtime-neutral explicit scope union | Reused without paths | N/A |
| `.../lineage/compaction-lineage-record.ts` | lineage | record model | immutable direct record with delivered structural/uniqueness/scope/predecessor/time/execution/integrity checks, no upper membership counts, supported prompt contract values `1` and `2`, and current value 2 | Historical relation subject and producing-contract audit authority | scope |
| `.../lineage/compaction-lineage-store.ts` | lineage | persistence interface | append-next/read-head/read-by-ID/find-output methods | One capability contract; head derives from successful-record order | record |
| `.../lineage/memory-origin-resolution.ts` | lineage | query contract | artifact ref, status, direct/root response | Shared typed boundary | scope |
| `.../lineage/compaction-lineage-resolver.ts` | lineage | query owner | membership, manifest, traversal, integrity | One cycle-safe algorithm | query/store/archive |
| `autobyteus-ts/src/memory/store/file-compaction-lineage-store.ts` | store | provider | append/read normalized successful-record JSONL, tail lookup, output-membership lookup; accept natural membership and mixed prompt versions through the record validator | One physical capability; no second state file | lineage types |
| `.../store/raw-trace-archive-manager.ts` | store | archive boundary | exact archive API and typed completed descriptor | Existing file authority | N/A |
| `.../store/memory-file-names.ts`, `run-memory-file-store.ts`, `file-store.ts`, `base-store.ts` | store | file composition | new lineage filename/store wiring and exact output-row lookup; remove gate/manifest/dictionary-reset/state APIs | Existing storage composition | lineage store |
| `autobyteus-ts/src/memory/models/episodic-item.ts` | memory model | current episodic row | current recognized fields and writer without `turn_ids` | One current row model | N/A |
| `autobyteus-ts/src/memory/models/semantic-item.ts` | memory model | current semantic row | exact current fields only; never emit or tolerate removed historical fields | One current row model | N/A |
| `autobyteus-ts/src/memory/projection/compacted-memory-projection-bundle.ts` | projection | source/projector boundary | transient lineage-head record plus exact output content | One tight validated selection result; not persisted in snapshot | lineage record |
| `.../projection/current-compaction-output-loader.ts` | projection | selection | absent/empty lineage -> null; lineage tail -> exact projection bundle | Selection is not projection text; no historical mode | lineage/content stores |
| `.../projection/compacted-memory-message-builder.ts` | projection | display transform | current projection bundle -> natural bounded compacted-memory content | Existing message wording/grouping owner | projection bundle |
| `.../projection/compacted-memory-context-projector.ts` | projection | pure projector | explicit projection bundle -> memory text/constituent range + continuation, without identity fields | Removes Retriever ownership | projection bundle/finalizer |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | restore | decision owner | strict-v5 direct restore; explicit missing-snapshot invariant failure | Existing entrypoint narrowed to one authority | finalizer |
| `.../restore/working-context-recovery-projector.ts` and export/tests | restore | remove | no supported product responsibility | Deletes unsupported last-twelve/raw-history fallback | N/A |
| `autobyteus-ts/src/memory/migration/native-working-context-snapshot-v5-converter.ts` | migration | pure native transition owner | typed expected-identity/source-byte/eligible-active-fact input -> candidate (`converted | converted_with_omissions`) or identity rejection; owns historical decode, message/ref matching, omission, finalization, strict-v5 validation | Historical knowledge and omission policy stay isolated | provenance/snapshot/finalizer/raw fact types |
| Historical `.../restore/compacted-memory-schema-gate.ts` and its tests | restore | removed in SR-004 | no current file/runtime responsibility | Delivered removal; do not recreate destructive semantic clearing/snapshot deletion | N/A |
| Historical `.../store/compacted-memory-manifest.ts`, `COMPACTED_MEMORY_MANIFEST_FILE_NAME`, public export, and gate-only store APIs | store/restore | removed/decommissioned in SR-004 | no current runtime responsibility; persisted filename knowledge belongs only to startup migration | Delivered removal; no replacement manifest | N/A |
| `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | snapshot | v5 schema | exact typed message/message-local-range round-trip | Existing serializer authority; no lineage/output IDs | provenance |
| `autobyteus-ts/src/memory/presentation/readable-value-renderer.ts` | presentation | common | stable serialization, redaction, head/tail omission/count | Primitive shared policy | N/A |
| `.../presentation/condensed-tool-call-renderer.ts` | presentation | common | exact body grammar and status derivation | Tight shared formatter | readable value |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts` | Work Evidence | envelope/adapter | map correlated event, timestamps, Markdown headers, common body | Existing output contract | core renderer |
| Historical `.../agent-work-trace-redactor.ts` | Work Evidence | removed in SR-004 | no current file/runtime responsibility | Delivered removal; shared core presentation is current | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` and config/factory wiring | server launch | scope injection | build explicit lineage scope from run/member context | Launch already owns product identity | scope |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | built-in agent | stable semantic/output policy | exact complete origin/personal-style file content from `memory-compactor-prompt-content-contract.md`; no implementation-authored wording, internal product terminology, duplicate policy, or numeric item counts | One canonical product-managed system contract restored at startup | N/A |
| `autobyteus-server-ts/src/agent-execution/compaction/memory-compactor-agent-launch-resolver.ts` and `server-compaction-agent-runner.ts` | server launch | unchanged execution metadata/configuration | preserve current provider/runtime/model and output-token behavior | Explicit non-change verified by focused coverage | guessed provider strings |
| `autobyteus-server-ts/src/memory-lineage/services/agent-memory-origin-service.ts` | server memory lineage | product facade | explicit target authorization/location then core resolve | Keeps paths/server identity out of core | core resolver |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-location-classifier.ts` | server agent-memory | exact classifier | current metadata/location -> typed standalone/team-member runtime locations with exact `runId`/`memberRunId` snapshot identity + diagnostics | Reused narrow concern | snapshot content/action |
| `autobyteus-server-ts/src/app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.ts` | server migration | native startup transition | filter exact AutoByteus locations; gate lineage; load source bytes and exact-scope active facts; invoke converter; map identity rejection; validated v5 replacement; exact cleanup; no raw mutation | Existing migration framework; corrected scope | message/ref matching, normal runtime models, raw writer, custom I/O recovery |
| `.../remove-external-runtime-working-context-snapshots-migration.ts` | server migration | delivered external cleanup | consume shared classifier; preserve exact external deletion/status behavior | Removes duplicate classifier only | native conversion |
| Historical `reset-pre-lineage-memory-*` definition/helper/tests | server migration | remove/replace | no target responsibility | Old ID/behavior must not remain registered or delete snapshots | N/A |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | server startup | transition registration | register the new-ID migration as `requiredOnStartup`; remove old definition | Existing definition authority | result persistence or server continuation |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-runner.ts` | server startup | ordinary migration lifecycle | execute required definitions, persist attempts/results, return statuses; retry `FAILED` later | Latest-origin owner restored | migration-specific interpretation |
| `autobyteus-server-ts/src/server-runtime.ts` (`startConfiguredServer`) | server startup | ordinary caller | await/log migration execution under latest-origin nonblocking semantics, then continue bootstrap/build/listen | Preserve completed external-cleanup behavior | migration-specific conversion/result interpretation |

## Explicit Change Inventory

| Change Type | File / Area | Required Change |
| --- | --- | --- |
| Preserve/verify | delivered Memory Compactor prompt/builder/renderer/parser/normalizer/accepted/lineage/projection/origin code | SR-010 exact natural prompt, history-only canonical turns, uncapped membership, prompt audit 2, and 1/2 direct reads remain unchanged |
| Add | `memory/migration/native-working-context-snapshot-v5-converter.ts` + tests | Typed expected-identity/source-byte/eligible-active-fact input; tolerant historical projection and sole message/ref matching; unsupported-unit omission; parse-invalid/fully omitted metadata-identified `messages: []`; bounded diagnostics; candidate or identity rejection; no Tool repair, synthetic content, or raw-evidence operations |
| Add | server `runtime-memory-location-classifier.ts` + tests | One exact metadata/location classifier reused by external cleanup and native migration; carry standalone `runId`/team `memberRunId` as derived snapshot identity |
| Modify | delivered external cleanup migration/tests | Delegate classification only; preserve external eligibility/removal/status behavior |
| Replace | reset migration/helper/registration/tests -> `migrate-native-working-context-snapshots-v5-migration.ts` exact ID | Gate lineage first; convert/validate/publish absent/empty-lineage AutoByteus targets; skip every nonempty-lineage location untouched; reject parseable source-identity conflict without mutation; strict v5 before exact cleanup; `SUCCEEDED_WITH_WARNINGS` for completed omissions; no raw mutation or custom filesystem recovery |
| Remove/revert | `RequiredAppDataMigrationError`, runner aggregate throw, server rethrow, and gate tests introduced by SR-004 | Restore persisted-status/log-and-continue startup semantics; keep existing runner interface |
| Modify/remove | snapshot bootstrapper; recovery projector/export/tests | Strict-v5 snapshot-only restore; explicit absence fails; no raw reconstruction |
| Modify | `llm-request-assembler.ts`, `RequestPackage`, `llm-request-recovery.ts`, `llm-phase.ts`, focused tests | Capture after compaction/before request; local/provider settlement; never roll durable compaction back |
| Verify | isolated migration/API/E2E setup | Memory root and migration DB share one isolated app-data root; use representative converter/omission/empty-v5 fixtures and retain the completed 347-file audit instead of rerunning a second scanner |

Preserve rather than reimplement: IDless proposal/manager acceptance, exact archiving, publication order, lineage tail/current output, message-only v5 schema, finalizer, shared Tool/value presentation, generated Work Evidence, server origin facade, and delivered external raw-only writer/cleanup behavior.

## Applied Patterns (If Any)

- **Proposal/accept/commit:** isolates model-generated content from application identity and side effects.
- **Immutable successful-record log with tail-as-head:** `compaction_lineage.jsonl` preserves derivations and its last valid record selects the active output.
- **Direct-edge provenance graph:** records only immediate previous/archive inputs; resolver computes transitive roots.
- **Pure finalizer:** canonical context invariants are deterministic and testable before snapshot/provider render.
- **Source adapter + shared formatter:** compaction and Work Evidence retain separate source/envelope ownership while sharing only the identical readable body policy.
- **Migration converter + startup publication boundary:** historical decoding/provenance mapping is pure and isolated; server migration owns files/ledger; current models/bootstrap remain current-only.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/` | Folder | executor/strategy | proposal lifecycle, planning, compactor rendering/output | Existing domain-control area | file repositories, server paths |
| `.../compaction/accepted-compaction-committer.ts` | File | manager internal | normal publication coordination | Closest to compaction transition while hidden behind manager | retry or LLM calls |
| `autobyteus-ts/src/memory/lineage/` | Folder | lineage capability | scope, successful record/head contract, store interface, origin contract/resolver | Meaningful new domain depth | raw/memory content copies |
| `autobyteus-ts/src/memory/store/` | Folder | persistence providers | lineage JSONL, archive/snapshot file operations | Existing provider layer | origin traversal policy |
| `autobyteus-ts/src/memory/presentation/` | Folder | shared off-spine capability | safe readable values and tool bodies | Concern-neutral core reuse | Work Evidence or XML orchestration |
| `autobyteus-ts/src/memory/projection/` | Folder | explicit current projection | load exact current output and project canonical memory | Existing projection capability | top-K or historical selection |
| `autobyteus-ts/src/memory/restore/` | Folder | bootstrap | strict-v5 direct restore and missing-snapshot invariant failure | Existing lifecycle boundary | old-schema decode, raw-history reconstruction, Event Monitor, or current-output ranking |
| `autobyteus-ts/src/memory/migration/` | Folder | migration-only converter | typed per-run input/result, historical snapshot projection, truthful stored-reference matching, omission, and strict-v5 conversion | Distinct transition concern; prevents historical branches in restore | filesystem/ledger/startup exposure, Tool repair, synthetic content, or runtime compatibility |
| `autobyteus-server-ts/src/agent-memory/services/` | Folder | exact memory-location classification | current metadata/location classification shared by migrations | Existing product-location capability | snapshot conversion/deletion policy |
| `autobyteus-server-ts/src/app-data-migrations/` | Folder | startup transition | versioned one-time snapshot migration/publication and obsolete-state cleanup | Existing pre-runtime migration capability | normal memory behavior |
| `autobyteus-server-ts/src/agent-work-traces/services/` | Folder | Work Evidence | raw replay, adapter, timestamped Markdown/files | Existing server product capability | WorkingContext compaction |
| `autobyteus-server-ts/src/memory-lineage/services/` | Folder | server product facade | explicit target/location to core resolver | Server owns product identity and authorization | graph algorithm or public UI |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `memory/compaction` | Main-Line Domain-Control | Yes | Low | Existing area; remove persistence dependencies |
| `memory/lineage` | Main-Line Domain-Control | Yes | Low | Relation/query is distinct from content stores |
| `memory/store` | Persistence-Provider | Yes | Medium | Keep only file mechanics and store interfaces; resolver stays outside |
| `memory/presentation` | Off-Spine Concern | Yes | Low | Exactly two tight files; do not broaden |
| `memory/projection` | Main-Line Domain-Control | Yes | Low | Explicit selection/project only |
| `memory/restore` | Main-Line Domain-Control | Yes | Low | Strict current-schema snapshot restore only; no recovery projector |
| `memory/migration` | Secondary Transition | Yes | Low | Focused pure converter; no filesystem or runtime branching |
| server `agent-memory/services` | Off-Spine Classification | Yes | Low | One exact product-location concern reused by two migration owners |
| server `app-data-migrations` | Secondary Transition | Yes | Low | Historical filesystem/ledger lifecycle confined before runtime |
| server `agent-work-traces` | Mixed Justified | Yes | Low | Existing cohesive product projection/service/store boundary |
| server `memory-lineage` | Transport/Product Adapter | Yes | Low | Small internal facade; no endpoint added |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

### 1. Reference-only lineage and tail-derived current head

```ts
type CompactionLineageScope =
  | { targetKind: "agent_run"; runId: string; memberId: null }
  | { targetKind: "team_member"; runId: string; memberId: string };

type CompactionLineageRecord = {
  schemaVersion: 1;
  scope: CompactionLineageScope;
  compactionId: string;
  previousCompactionId: string | null;
  rawTraceArchiveFile: string;
  episodeIds: string[];
  semanticIds: string[];
  derivedAt: string;
  execution: {
    runtimeKind: string;
    provider: string;
    model: string;
    selectionPolicyVersion: 1;
    promptContractVersion: 1 | 2;
    renderedInputSha256?: string;
  };
  integrity?: { recordSha256: string };
};

```

For `agent_run`, `runId` is that standalone/task agent run ID and `memberId` is always `null`. For `team_member`, `runId` is the team run ID and `memberId` is the member agent run ID from `MemberTeamContext`. Neither variant is inferred from a directory path.

Good: the file contains successful records only. C2 references `previousCompactionId: C1` and its own archive file; appending C2 makes it the current head. Resolver walks C1 when roots are requested. An absent/empty file means no current compacted memory. Prompt version `1` truthfully audits records produced by the implemented SR-004 fixed-count/duplicated-operation contract. Prompt version `2` audits records produced by the approved natural system prompt plus history-only canonical-turn operation payload. New writes use `2`; readers accept/preserve `1 | 2`; the field does not switch structural decoding.

Avoid: copying C1's raw IDs into C2, storing selected message content again, naming a new `generationId`, using `segment-000001`, or persisting a duplicate `compaction_state.json`.

### 2. IDless proposal versus accepted candidate

```ts
type WorkingContextCompactionProposal = {
  selectedNewRawTraceIds: string[];
  retainedMessages: Message[];
  output: NormalizedCompactionOutput; // content only
  execution: CompactionAgentExecutionMetadata;
};
```

The proposal contains no prior/current compaction ID, produced episode ID, produced semantic ID, lineage record, or accepted context. Before strategy invocation, the manager captures `baselineLineageHeadId: string | null` as application-owned attempt state. During acceptance it verifies the head is unchanged, maps it to `previousCompactionId`, reuses the pending `compactionId`, assigns deterministic artifact IDs such as `episode_<safe-compaction-id>_001` and `semantic_<safe-compaction-id>_001`, builds the lineage/context candidate, validates it, and then commits. The strategy never receives a repository.

### 3. Typed composed user provenance without duplicated content

```ts
type TextRange = { start: number; end: number };

type UserConstituent =
  | {
      kind: "compacted_memory";
      textRange: TextRange;
    }
  | {
      kind: "retained_user" | "current_user";
      textRange: TextRange | null;
      rawTraceIds: string[];
      turnId: string | null;
      imageRange: { start: number; end: number };
      audioRange: { start: number; end: number };
      videoRange: { start: number; end: number };
    };

type WorkingContextMessageProvenance =
  | { kind: "single"; rawTraceIds: string[]; turnId: string | null }
  | { kind: "composed_user"; constituents: UserConstituent[] };
```

Ranges index the actual physical message content/media arrays. They are ordered, non-overlapping, and in bounds. They do not repeat constituent text in metadata. The planner can slice logical constituents, include compacted memory in M(n-1), and collect archive refs from natural R(n) only. Snapshot v5 stores this message-local structure and no compaction, episode, semantic, lineage, or current-state identity.

The transient source-to-projector boundary carries the already-authoritative lineage-head record with the content rows it selects:

```ts
type CompactedMemoryProjectionBundle = {
  lineageHead: CompactionLineageRecord;
  episodes: ProjectedEpisode[]; // each has id, ts, summary
  semantics: ProjectedSemantic[]; // each has id, ts, group, fact, salience
};
```

`CurrentCompactionOutputLoader` validates that the row IDs exactly match the lineage-head output lists. `CompactedMemoryContextProjector` renders rows in deterministic order but writes no IDs into the message. Empty or mismatched bundles are rejected. The projection DTO is in-memory only; lineage and row stores remain the persisted relationship/content authorities, while v5 remains the message authority.

### 4. Common condensed tool renderer

```ts
type CondensedToolCallInput = {
  name: string;
  arguments: unknown;
  outcome:
    | { kind: "result"; value: unknown }
    | { kind: "error"; value: string }
    | { kind: "no_outcome"; status: string };
};

type CondensedToolCallRenderOptions = {
  maxValueChars: number | null;
};
```

```text
name: run_bash
status: success
arguments:
  {"command":"prefix … [2400 characters omitted] … suffix"}
result:
  prefix … [8000 characters omitted] … suffix
```

For a genuine outcome-less historical call:

```text
name: run_bash
status: interrupted
arguments:
  {"command":"..."}
result: not available
```

Compaction adds `Tool:` and the one XML conversation envelope. Work Evidence adds its timestamped `tool:` Markdown header. Neither behavior belongs in the common renderer.

### 5. Recurrent compaction

```text
C1 input: R1
C1 output/current: M1

C2 input rendered to LLM: M1 in its user-role context, then R2
C2 archive: R2 only
C2 lineage direct inputs: previousCompactionId=C1 + archiveFile(R2)
C2 output/current: M2 only
```

After C1000, default projection loads M1000 only. C1–C999 remain immutable and reachable through lineage, not concatenated into the working context.

### 6. Current-schema restore and no-current-compaction state

```text
explicit native existing-run restore
-> working_context_snapshot.json must exist and validate as strict v5
-> install exact finalized messages/local ranges
-> lineage absent/empty: there is no current compacted-memory output
-> lineage present: current-output loading independently validates the tail/output rows
```

Restore never constructs messages from raw traces. Explicit restore with no snapshot fails. New-run creation is a different product path and initializes/persists its own WorkingContext. Snapshot restore validates messages/ranges/tool/media structure only and never infers lineage from text.

### 7. Native-only startup snapshot migration

```text
startConfiguredServer
-> ordinary AppDataMigrationRunner
-> delivered external snapshot cleanup
-> RuntimeMemoryLocationClassifier
-> exact RuntimeKind.AUTOBYTEUS locations only
-> for each eligible native snapshot:
   derive expected agent_id = standalone runId OR team memberRunId
   lineage nonempty -> skip complete location byte-for-byte without state validation
   lineage absent/empty -> source bytes + eligible-active reference facts
   -> NativeWorkingContextSnapshotV5Converter
   -> parseable source agent_id must equal expected identity
      OR parse-invalid source uses expected identity for empty candidate
   -> retain valid current-representable system messages
   -> retain complete non-system units/tool groups only when stored refs resolve truthfully
   -> omit unsupported, incomplete, ambiguous, old-compacted-memory, or unsourced units
   -> parse-invalid or no surviving message yields messages: []
   -> converted or converted_with_omissions + bounded reason/count diagnostics
   -> finalize + strict-v5 validate
   -> validated v5 snapshot replacement
   -> delete only episodic.jsonl, semantic.jsonl, compacted_memory_manifest.json
   -> leave lineage absent/empty
-> persist itemized result; continue ordinary server startup
```

Codex, Claude, imported, unsupported, unclassified/missing/invalid-metadata, and conflicting locations are untouched. Every nonempty-lineage native location is skipped byte-for-byte without state validation. A strict-v5/no-lineage natural snapshot is retained byte-for-byte only when every non-system logical unit already has truthful eligible active backing; otherwise it follows tolerant conversion. The migration generates no recovery content, Tool repair, synthetic Tool outcome, baseline/repair evidence, or raw mutation. Omissions produce `SUCCEEDED_WITH_WARNINGS`; a parseable identity mismatch leaves that eligible target unchanged. Filesystem behavior remains owned by the existing runner.

Concrete identity example: a parse-invalid team-member source cannot supply an `agent_id`, so the converter uses `RuntimeMemoryLocation.subject.memberRunId` through `expectedSnapshotAgentId` and produces strict v5 `{ agent_id: memberRunId, messages: [] }`. A parseable source that claims another `agent_id` is not degraded to empty; it is rejected unchanged because metadata and source identity conflict.

`WorkingContextSnapshotBootstrapper` has one authority: strict v5. It never calls `WorkingContextRecoveryProjector`. The first future compaction of a migrated pre-lineage run uses `previousCompactionId: null`.

### 8. Quality-first semantic sizing and prompt ownership

`memory-compactor-prompt-content-contract.md` remains the exact wording authority:

- `agent.md` contains the complete natural summarization task, smallest-sufficient episode guidance, continuation-critical fact selection, and exact JSON contract without platform-internal wording;
- the operation user message is exactly one complete `CompactionConversationHistoryRenderer` output, with no static prefix/suffix or duplicate task/schema/sizing policy;
- selected internal constituent ranges are reconstituted into canonical turns rather than artificial consecutive `User:` entries; and
- `COMPACTION_RESULT_SHAPE` and its unused export are removed when no caller remains.

Launch/provider output-token configuration remains unchanged; this ticket sets no numeric ceiling. Parser, normalizer, accepted builder, lineage validator/store, projection, and origin lookup preserve every structurally valid natural-count item.

### 9. Durable-compaction-aware request recovery

```text
base before request = M1 + retained context; pending C2 exists
-> assembler executes C2
-> durable state becomes lineage head C2 + context M2; pending cleared
-> assembler captures recovery checkpoint { context: M2, pending: clear }
-> appends current user request U3 and returns package
-> provider fails
-> LlmPhase restores checkpoint
=> context/snapshot are M2, U3 is absent, pending remains clear,
   and C2 archive/output/lineage stay current
```

The invalid shape is capture-before-C2 followed by restore-after-C2; that would recreate M1/pending-C2 while lineage already says C2. The target does not add a transaction journal or durable rollback. It moves the existing ephemeral capture to the owner that knows the stable-base boundary and makes settlement explicit.

## Current-Only Replacement Log (Mandatory)

This is the cumulative clean-cut decision log. It distinguishes delivered SR-004/SR-010 choices from the pending native migration/restore/recovery correction.

| Obsolete / Candidate Mechanism | Why It Was Considered | Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| parse both `episodic_summary` and `episodes`, snake/camel aliases | Old compactor response/tests | Rejected | exact target schema and updated prompt/tests |
| fixed one-to-three episode, twenty-total-fact, and per-category/membership count policy in prompts/parser/normalizer/acceptance/lineage validator | Earlier attempt to constrain output | Rejected | one quality-first system contract, natural LLM-chosen item counts, all-entry structural parsing/normalization, no count rejection anywhere in accepted publication, and unchanged launch/provider token configuration |
| normal runtime decode or raw-history rebuild of pre-v5 snapshots | Existing persisted snapshots | Rejected | migration-only converter publishes strict v5 before bootstrap; restore accepts v5 only |
| destructive snapshot reset | Earlier clean-epoch simplification | Rejected by observed restore requirement | new-ID snapshot-preserving migration; delete only obsolete episode/semantic/manifest state after v5 is durable |
| last-twelve/raw-corpus WorkingContext recovery | Snapshot-less restore fallback | Rejected by product-reachability gate | remove projector; explicit restore without snapshot fails; new-run create path remains separate |
| broad mixed-runtime snapshot conversion | Earlier corpus-wide assumption | Rejected after prerequisite cleanup | exact metadata-classified AutoByteus targets only; all other locations untouched |
| duplicated runtime-location classification in two migrations | Local implementation convenience | Rejected | extract one server agent-memory classifier; keep cleanup/conversion policies separate |
| global required-migration exception/server startup block | Earlier reset correctness model | Rejected after latest-origin prerequisite semantics | persist `FAILED` for retry and continue unrelated startup; no ticket-specific global gate |
| pre-assembly request-recovery capture | Earlier request rollback placement | Rejected by reachable post-compaction provider failure | capture inside assembler after compaction and before current-request mutation; carry checkpoint to phase |
| compaction/output IDs inside message provenance or snapshot root | Couple continuation messages to derived-memory relationship state | Rejected | message-local compacted-memory kind/range only; lineage tail owns identity |
| destructive `CompactedMemorySchemaGate` and global compacted-memory manifest authority | Reject older rows before fallback | Rejected | migration removes obsolete rows/manifest only after v5 publication; normal runtime has neither gate nor manifest authority |
| decode historical loose fields through current `EpisodicItem`/`SemanticItem` models | Preserve prior derived memory | Rejected | files are disposable and deleted; current models accept/write only current schema |
| dual loose/range message provenance | Existing metadata readers | Rejected | replace all current readers/writers with one discriminated v5 model |
| separate `compaction_state.json` current pointer | Make current lookup superficially direct | Rejected | successful lineage records are linear; last valid record is current, avoiding a duplicate truth |
| inferred historical lineage backfill or synthetic migration evidence | Pre-lineage rows/unsourced units lack source edges | Rejected | delete old rows; omit unsourced legacy units; retain absent/empty lineage; first current compaction is C1 with `previousCompactionId: null` and consumes only real active-backed input |
| preserve strategy store mutation while also writing lineage | Smaller edit | Rejected | proposal-only strategy and manager-owned commit |
| keep server redactor plus core renderer | Reduce Work Evidence change | Rejected | delete server duplicate and use common policy |
| include old and new compacted memories together | Preserve all summaries | Rejected | each output is one complete replacement with natural LLM-chosen item counts |
| generic origin query exposing one ambiguous artifact ID | Simpler query API | Rejected | explicit artifact kind + ID |
| transaction journal for possible process interruption | Multi-file publication | Rejected | no supported product path; preserve reachable pre-write retry only |

## Derived Layering (If Useful)

```text
Server product adapters
  launch scope / memory location / Work Evidence / internal origin service
      ↓
Core application/domain control
  request assembler / executor / strategy / MemoryManager / bootstrapper / resolver
      ↓
Core pure structures and transformations
  proposal / lineage schemas / provenance ranges / finalizer / presentation
      ↓
Persistence providers
  raw archive / memory rows / lineage JSONL / snapshot
      ↓
Filesystem
```

Provider renderers branch from finalized core context and do not sit between context construction and snapshot persistence.

## Change / Refactor Sequence

SR-004 and SR-010 are delivered preservation baselines. Only the following migration/restore/recovery delta is pending after renewed architecture `Pass`:

1. Preserve current proposal/accept/commit, archive -> output -> lineage -> context -> v5 order, lineage-tail current authority, message-only snapshot, finalizer, natural prompt/count behavior, shared presentation, and origin resolution.
2. Extract `RuntimeMemoryLocationClassifier` from the delivered external cleanup's metadata/location discovery.
3. Adapt external cleanup to consume the classifier without changing its eligibility, deletion, status, or retry behavior.
4. Remove/decommission the destructive reset registration/helper/tests and register exact ID `20260731_migrate_native_working_context_snapshots_v5` after external cleanup.
5. Add pure `NativeWorkingContextSnapshotV5Converter` and its typed input/result: expected snapshot identity, source bytes, bounded eligible-active reference facts; narrow historical decode; parseable identity equality; sole message/content/media/tool/ref matching; retain valid current-representable system messages and complete truthfully active-backed non-system units/tool groups; omit unsupported/incomplete/ambiguous/old-compacted/unsourced units; empty-message minimum with metadata identity; finalization; candidate or identity rejection; bounded diagnostics; no repair or generated content.
6. Implement per-native-run lineage gating before conversion: no snapshot skips; every nonempty-lineage location skips byte-for-byte without state validation; absent/empty lineage proceeds to direct-retain or tolerant conversion.
7. Implement absent/empty-lineage publication: compute/finalize/validate the complete candidate first; replace with strict v5; exact three-file cleanup; lineage remains empty; raw traces remain unchanged. Report completed conversion with omissions as `SUCCEEDED_WITH_WARNINGS`; a parseable identity conflict leaves that eligible target unchanged. Leave filesystem behavior to the existing migration runner; add no custom recovery.
8. Restore ordinary runner/server semantics by removing ticket-owned `RequiredAppDataMigrationError`, aggregate throw, server rethrow, and associated global-gate tests. Do not add `prepareExecution` or another runner lifecycle.
9. Narrow bootstrapper to strict-v5 snapshot presence; remove `WorkingContextRecoveryProjector`, export, wiring, and tests; explicit missing restore snapshot fails; new-run creation remains separate.
10. Move recovery capture from `LlmPhase` into `LLMRequestAssembler` after pending compaction and before request-specific mutation. Carry the opaque checkpoint in `RequestPackage`; settle locally/on provider outcome exactly once.
11. Add representative migration fixtures for v1/v3/v4, old compacted marker, media/tools, active/archived/unmapped refs, standalone/team expected identity, parseable identity rejection, any-nonempty-lineage untouched skip, excluded runtime/location classes, optional-field/message/tool-group omission, parse-invalid/fully omitted metadata-identified `messages: []`, raw byte preservation, and normal replacement/cleanup order. Do not add fault-injection or migration-recovery machinery.
12. Add reachable recovery coverage: pending compaction -> durable C(n) -> post-capture assembly/provider failure -> restored C(n) base; pre-capture compactor failure; success release; retained interruption release; no duplicate C(n).
13. Keep API/E2E memory and migration DB under one isolated app-data root. Retain the completed 347-file read-only audit as corpus feasibility evidence; do not introduce another product-root scanner.

Final tree prohibitions: no dual strategy API, fixed count gate, pre-v5 runtime reader, recovery projector, registered destructive reset, duplicate location classifier, global required-migration exception/server rethrow, prepared-plan/preflight lifecycle, pre-compaction request checkpoint, or dual provenance/readable-tool renderer.

## Key Tradeoffs

- **Reference-only lineage over a duplicated compaction-input snapshot:** substantially less storage and clearer authority; exact prompt replay is intentionally unavailable. The referenced archive file plus prior compaction edge is sufficient for coarse origin.
- **Lineage tail over a separate pointer:** because the chain is linear and contains successful compactions only, append order already defines current state. This removes a one-field file and a cross-file consistency invariant; rollback/branch selection would require a future explicit state design.
- **Range-based constituents over copied constituent content:** prevents message duplication and keeps physical provider content authoritative, at the cost of strict range validation.
- **Direct edges plus recursive traversal over flattened ancestors:** keeps every record bounded across 1,000 compactions, at the cost of resolver traversal and cycle checks.
- **Application-owned deterministic IDs over LLM citations/IDs:** makes relationships reliable and cheap, while intentionally providing only coarse compaction-level provenance.
- **Shared low-level renderer over shared broad event model:** eliminates duplicated policy without coupling WorkingContext and raw replay sources.
- **Exact native migration over mixed-corpus reset/conversion:** preserves the 347 audited native snapshots while leaving external/imported/unclassified/unsupported data outside the transition. One shared exact classifier prevents policy drift; each migration still owns its distinct action.
- **Omission over synthetic migration evidence:** unmatched/unsupported legacy units are omitted rather than copied into new raw records or attributed to unknown history. This sacrifices some old context but keeps the code forward-only and prospective lineage truthful.
- **Tolerant absent/empty-lineage migration over a global gate:** every eligible content shape can yield current v5, possibly with `messages: []`; omissions are warnings. Every nonempty current-format claim skips untouched without validation or recovery. Ordinary filesystem exceptions use existing runner behavior rather than a ticket-specific design.
- **Post-compaction ephemeral checkpoint over durable rollback:** request failures restore only request-specific WorkingContext/pending state; accepted compaction remains durable and current.
- **Natural LLM-chosen cardinality over item or token ceilings:** lets the model preserve semantic structure appropriate to the selected history and avoids forced merging/loss. Existing provider/model response constraints remain operational concerns rather than ticket-authored semantic policy.

## Risks

2. **Canonical-turn reconstitution:** reusing `WorkingContextFinalizer` over selected compactor-visible messages must preserve assistant/tool/media boundaries and the existing constituent ranges. Focused tests must prove it does not mutate the installed/snapshotted context.
3. **Semantic allocation quality:** removing numeric item caps avoids forced semantic loss but cannot guarantee that every model chooses an optimal semantic structure. Deterministic tests prove prompt policy, unchanged launch configuration, and no hidden count loss; SCN-019 checks independently verifiable continuation anchors and phase separation without asserting a particular item count. Token-truncated malformed JSON remains a pre-write compactor failure/retry.
4. **Mixed prompt audit history:** readers must not normalize a value-1 record into value 2 or reject a valid mixed chain. Focused record/store/projection/resolver coverage protects truthful immutable audit metadata.
5. **Post-output structural rejection remains possible:** removing the count-only lineage gate does not make multi-file publication transactional or waive other lineage invariants. Structurally invalid records remain rejected under the existing ordered commit contract; this ticket does not add a recovery journal without a supported product path.
6. **Native migration volume and matching:** 347 exact native snapshots total 32,501,775 bytes. Process one eligible run at a time, validate only stored refs needed for retained units, and report progress; do not scan/convert excluded locations or search raw history for repair.
7. **Intentional context omission:** unsourced, invalid, incomplete, ambiguous, or old-compacted units may be lost. This is user-approved; bounded reason/count diagnostics and representative continuation checks must remain truthful without copying content or generating a notice.
8. **Source preservation during conversion:** validate the complete candidate before replacing the source snapshot. Tests prove raw traces/manifests remain unchanged.
9. **Migration exclusion/rejection:** every nonempty-lineage target skips untouched; a parseable source identity mismatch leaves an otherwise eligible target unchanged. Ordinary filesystem exceptions are intentionally outside the ticket's semantic design.
10. **Recovery settlement:** every returned checkpoint must settle exactly once. Assembly failure, provider failure, success, and supported interruption branches need focused coverage to avoid leaks/double settlement.

Exact archive membership, deterministic output IDs, provider metadata, shared presentation, v5 schema, and team-member scope wiring remain implemented. Pending SR-015 work removes the destructive transition, raw-history fallback, global startup gate, and pre-compaction recovery placement while adding only the typed migration seam and simple absent/empty-lineage eligibility gate.

## Guidance For Implementation

- Treat the foundation contract as normative. If implementation exposes a missing invariant or design impact, route back to `solution_designer`; do not silently improvise a broader schema.
- Keep `MemoryManager` as the public authority even if `AcceptedCompactionCommitter` performs file coordination internally.
- Make proposal and finalizer functions deterministic and unit-testable. No proposal method may write storage.
- Keep message-local provenance structural: compacted-memory constituents carry only kind/ranges; retained/current constituents may carry the raw IDs needed for selection. No snapshot/message field carries compaction, episode, semantic, lineage, or current-state identity.
- The strategy returns only selected new raw IDs, retained messages, normalized content, and execution metadata. `MemoryManager` retains the baseline lineage head outside the proposal. The strategy must not assign output IDs or build accepted lineage/context.
- Preserve the implemented provider resolution through `LLMFactory.getProvider(modelIdentifier)` and `CompactionAgentExecutionMetadata`; do not alter launch or output-token configuration.
- Validate lineage on write: non-empty R(n), completed archive manifest entry, at least one non-empty episode, unique produced IDs, safe run-relative archive filename, exact output existence, predecessor/scope/time/execution/integrity correctness, and no duplicate `compactionId`. Do not impose episode/semantic/category maxima. `promptContractVersion` is audit metadata: accept/preserve supported values 1/2 and write current value 2.
- Commit a normal accepted compaction in this exact order: archive R(n), persist output rows, append the unique next lineage record as the current head, install the finalized context, persist message-only v5 snapshot, then clear pending state. Append must reject a duplicate ID or predecessor unequal to the prior tail.
- Validate state on read: the lineage tail and all output rows it lists must exist in the same scope. Missing referenced current state is an integrity failure, not a fallback to top-K history.
- Restore latest-origin migration lifecycle: runner persists and returns ordinary results; server continues. Remove `RequiredAppDataMigrationError` and ticket-owned server rethrow. Do not add ticket-specific failure or compatibility protocols.
- Extract exact metadata/location classification under server `agent-memory/services`; adapt external cleanup without semantic change. Native migration filters exactly `RuntimeKind.AUTOBYTEUS` and carries standalone `runId`/team `memberRunId` as the expected strict-v5 identity. Implement historical conversion only in `memory/migration`; reuse finalizer/serializer, not runtime repair.
- Before conversion, read lineage: absent/empty may migrate; every nonempty state skips byte-for-byte without validation. Do not infer, delete, clean, or repair a lineage-aware location.
- The server migration loads source bytes and exact-scope eligible-active reference facts. The pure converter alone validates parseable `agent_id` and matches message role/content/media/tool/ref identity. Do not duplicate matching policy in the server or let the converter read stores.
- Validate the complete strict-v5 payload before replacing the source snapshot, then delete only the three obsolete files. Never append, rewrite, archive, or delete raw records/manifests during migration. Do not add compatibility, backup, rollback, journal, or recovery branches.
- Remove all raw-history WorkingContext reconstruction. Missing explicit restore snapshot fails. Do not add a last-N variant, archive fallback, or “best effort” restore.
- Omit unsupported/incomplete/ambiguous/old-compacted/unsourced units instead of creating recovery text, synthetic Tool results, placeholders, baseline/repair IDs, or raw evidence. `messages: []` is the valid minimum.
- Capture request recovery only after pending compaction and immediately before request mutation. Return it in `RequestPackage`; assembler settles local failure, `LlmPhase` settles provider/success/interruption. Never restore archive/output/lineage/tool facts.
- API/E2E must use one isolated app-data root for both memory and migration DB; never reuse the product migration repository with a temporary memory root.
- Cover the lineage store directly: absent/empty -> no head; first append requires both expected predecessor and record predecessor `null`; later append requires both to equal the prior tail; the appended record becomes the new read tail; duplicate `compactionId`, stale expected predecessor, mismatched record predecessor, and fork attempts are rejected without a write. Prove no `compaction_state.json` or replacement manifest is created.
- Make origin traversal iterative or recursion-bounded with a visited set. A cycle or missing referenced current record/archive/output is an integrity error; an unknown typed output ID is `not_found`.
- For user constituent ranges, define whether indices are JavaScript UTF-16 code-unit offsets and test multi-byte/emoji content consistently. The finalizer and serializer must use the same convention.
- Redact before calculating omission. The marker count is the number of characters removed from the redacted serialized value. Preserve non-empty head and tail when the limit permits; retain complete values at or below the limit.
- Native compaction passes only settled result/error outcomes. Work Evidence may pass `no_outcome` only after its source adapter has proven no terminal record exists.
- `agent.md` owns the complete concise origin/personal-style natural task plus exact JSON and quality-first semantic contract; the operation user message must byte-equal exactly one selected rendered history as defined by `memory-compactor-prompt-content-contract.md`, with one `User:` entry per canonical user turn rather than per internal constituent. `agent-config.json`, launch resolution, and provider output-token configuration remain unchanged.
- Parse every structurally valid returned episode/fact instead of slicing by count. Keep per-entry character limits, exact fields, cleanup, deduplication, noise filtering, deterministic order, and positive salience such as `Math.max(1, base - index)`. Accepted and lineage validation require at least one episode and structural/reference correctness, not maximum item counts. Prove persistence/read/projection/origin rather than stopping at proposal construction.
- The compactor gets one task-level user message containing exactly one escaped `<conversation_history>` boundary. It never gets `Assistant work notes`, LLM reasoning, raw IDs, timestamps, call IDs, or generated Work Evidence Markdown.
- Escape source-originated exact `<conversation_history>` and `</conversation_history>` sequences after redaction/head-tail bounding by replacing their angle brackets with `&lt;`/`&gt;`. The application-owned wrapper is added only after every source value has been escaped, so exactly one unescaped opening and closing boundary remain. XML tag matching is case-sensitive; tests must cover both literal reserved sequences and oversized values.
- Keep existing Event Monitor active-only calls and Work Evidence archive-plus-active calls separate. Searches/tests should prove no snapshot fallback enters Event Monitor and no WorkingContext enters Work Evidence.
- Preserve provider-native structured tool/media state through canonical finalization and v5 snapshot round-trip. Provider renderers should become thinner, not gain repair branches.
- Update/remove tests and exports affected by the pending SR-015 migration/restore/recovery delta; preserve delivered SR-010 tests and source, and do not retain production aliases, the old migration registration, or recovery projector solely to keep old fixtures passing.
