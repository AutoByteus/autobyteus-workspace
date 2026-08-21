# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/design-spec.md`
- Supplemental Task Artifacts Reviewed: `system-prompt-activity-ux-spec.md`, `system-instruction-raw-trace-schema.md`, the SR-015 evidence supplement `data-migration-conventions-audit.md`, and the explicitly deferred `activity-transparency-ux-spec.md`, all under the ticket directory above
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-014`, `SR-015` (current authority restoring the approved `SR-012` first-capture basis); `SR-013` was withdrawn and superseded without an architecture-review result
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/in-progress/event-monitor-history-transparency/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-014 reachability correction and SR-015 full convention audit after `CRR-001` classified `CR-F-001` as Design Impact
- Prior Review Round Reviewed: Round 1 / `ARCH-REV-001` (`Pass`, no architecture findings)
- Latest Authoritative Round: Round 2 / `ARCH-REV-002`
- Current-State Evidence Basis: The approved package; production baseline `HEAD 3b81b5ebdc4c5eae64e221aff9c578adc7e7fb74`; the IR-001 working-tree implementation; `code-review-report.md` / `CRR-001`; the shared Product-Reachability Gate; `autobyteus-server-ts/docs/design/production_data_migration_conventions.md`; the server README's production-migration practice; the composer/command/activation/metadata writer/cancel/stale-cleanup paths; the current raw-trace readers; and the snapshot-v5 migration caller diff.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: `Yes` — prompt-first, exact-field, active-only Activity transparency is the approved slice.
- Relevant existing behavior and evidence confirmed: `Yes` — the baseline and IR-001 worktree confirm the three handoff boundaries, event/replay/Activity paths, active-only persistence, and first-capture staging. The defensive unchanged-prepared activation branch exists, but its exact unchanged-present metadata-failure state has no independent supported initiator under normal operating assumptions.
- Scope guardrail confirmed (`In-Scope Use Cases` / `Out of Scope` / `Preserved Behavior Boundary` / `Review Authority`): `Yes` — only System instructions is newly visible; Event Monitor, working context, tool/turn behavior, compaction semantics, and existing tool/compaction Activity remain protected.
- Approved change, preserved behavior, and outside scope understood: `Yes`
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID (`Yes`/`No`): `Yes` — no blocking finding remains.
- Remaining material ambiguity, if any: None. `MP-CR-001` is `Not Reachable`; `CR-F-001` cannot drive design or retry-specific machinery. `CR-F-002` and `CR-F-003` remain bounded implementation corrections.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-SP-001 | Approved change | Pass | Pass — baseline Activity is a supported desktop/mobile `tool`/`compaction` surface; IR-001 demonstrates the designed strict system variant. | Pass — DS-001–DS-007 introduce only `system_instruction` through the shared trajectory contract. | Confirmed | None |
| BEH-SP-002 | Approved change plus preserved runtime semantics | Pass | Pass — `SystemPromptProcessingStep` constructs `currentSystemPrompt`, passes it to `configureSystemPrompt`, and IR-001 stages only a newly appended version. | Pass — DS-001 captures only after successful configuration and publishes the newly created trace after listener binding. | Confirmed | None |
| BEH-SP-003 | Approved change plus truthful-source contract | Pass | Pass — `ClaudeSession.executeTurn` passes `carpenterSystemPrompt` as SDK `systemPrompt` to `startQueryTurn`. | Pass — DS-002 records after usable query creation and cleans up on capture failure. | Confirmed | None |
| BEH-SP-004 | Approved change plus truthful-source contract | Pass | Pass — Codex thread start/resume owns `baseInstructions`; IR-001 stages only a newly appended version after a valid thread response. | Pass — DS-003 publishes after listener binding and before first runtime input. | Confirmed | None |
| BEH-SP-005 | Preserved lifecycle | Pass | Pass — Activity and active replay are currently bounded; active JSONL can be trimmed or rotated. | Pass — DS-007/DS-009 retain the 100-entry Activity bound and active-row lifecycle without pinning. | Confirmed | None |
| BEH-SP-006 | Approved absence behavior | Pass | Pass — old or rotated runs may have no dedicated row, while current definitions are mutable. | Pass — DS-004/DS-006 omit absent or malformed system evidence and never reconstruct or add placeholders. | Confirmed | None |
| BEH-SP-007 | Preserved Event Monitor behavior | Pass | Pass — Event Monitor paging, selection, generation, and cursors use the pre-existing non-system replay kinds. | Pass — DS-008 filters system rows before those policies and projectors and uses current-subject terminology. | Confirmed | None |
| BEH-SP-008 | Approved extensibility change | Pass | Pass — baseline store/renderers have closed two-kind branches; IR-001 demonstrates the designed narrow union and dispatch. | Pass — DS-006/DS-007 define a strict shared base plus specialized variants and exhaustive render dispatch. | Confirmed | None |
| BEH-SP-009 | Approved provider-neutral path | Pass | Pass — provider adapters currently normalize tool/compaction facts through AgentRun and standalone/team transports. | Pass — DS-001–DS-006 add one semantic event and preserve provider-specific data below it. | Confirmed | None |
| BEH-SP-010 | Approved restart behavior | Pass | Pass — `LocalMemoryRunViewProjectionProvider` reads active traces and builds bounded replay; archives are not normal Activity input. | Pass — DS-004/DS-009/DS-010 add a run-scoped variant without archive Activity reads or false turn identity. | Confirmed | None |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `system-prompt-activity-ux-spec.md` | Pass | Pass | Pass | Pass | Pass — approved governing UI/UX input | None |
| `system-instruction-raw-trace-schema.md` | Pass | Pass | Pass | Pass | Pass — approved governing persistence input | None |
| `data-migration-conventions-audit.md` | Pass | Pass | Pass | Pass | Pass — SR-015 evidence/context, not new product authority | None |
| `activity-transparency-ux-spec.md` | Pass | Pass | Pass | Pass | Pass — explicitly deferred context and not authority for more visible kinds | None |
| `solution-revision-record.md` | Pass | Pass | Pass | Pass | Pass — `SR-014`/`SR-015` are current; superseded `SR-013` is clearly non-authoritative | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The design identifies a focused visible feature with cross-layer Activity contract work. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Root causes are the missing semantic instruction fact, closed Activity union, and turn-only trace assumptions; investigation maps each to current files. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | The narrow typed Activity refactor and run/turn trace split are in scope; broader kinds, archive browsing, stronger prompt authorization/redaction policy, paging, migration, and speculative retry recovery are excluded or deferred. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership, interfaces, removal, file mapping, sequence, tests, reachability assessment, and persisted-data audit directly support the chosen posture. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Native capture/live | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Claude capture/live | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Codex capture/live | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Restart/hydration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Standalone/team return event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | DTO/client hydration | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Bounded Activity UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Event Monitor exclusion | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-009 | Rotation/compaction | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-010 | Memory Inspector | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Core trace capture | Pass | Pass | Pass | Pass | `RunMemoryFileStore.recordSystemInstructionSupply` owns strict construction, folding, ID, and append as one store invariant; facades do not recreate policy. |
| Runtime handoff adapters | Pass | Pass | Pass | Pass | Each adapter owns only the exact local success point and lifecycle staging/cleanup. |
| AgentRun event boundary | Pass | Pass | Pass | Pass | One specialized constructor/guard carries committed identity; accumulator is explicitly non-persisting. |
| Run-history projection | Pass | Pass | Pass | Pass | Split selection prevents system rows from reaching Event Monitor cursor/generation logic. |
| Activity subsystem | Pass | Pass | Pass | Pass | Strict ingress, owned window/presentation policy, and exhaustive specialized renderers replace implicit fallbacks. |
| Raw-trace compaction/storage | Pass | Pass | Pass | Pass | Physical archive membership is separated from semantic compaction input and counts. |
| Existing snapshot-v5 migration | Pass | Pass | Pass | Pass | The only feature-driven edit is the explicit turn-reader caller rename; historical decoder, mapping, ID, status, cleanup, and recovery stay migration-owned and unchanged. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime -> store capture authority | Pass | Pass | Pass | Pass | Runtime uses the memory facade/store command and never writes JSONL or invents row metadata. |
| Store capture result -> semantic event -> transport | Pass | Pass | Pass | Pass | Only a newly appended version is published; transport never becomes a second durable store or delivery ledger. |
| Active trace -> replay -> Activity | Pass | Pass | Pass | Pass | Reload uses active rows only; UI cannot infer from definitions or scan archives. |
| Shared Activity contract -> specialized presentation | Pass | Pass | Pass | Pass | No provider protocol or generic JSON bag crosses into the store/renderer. |
| Compaction selection -> storage archive command | Pass | Pass | Pass | Pass | System content is excluded from prompt selection, semantic counts, and summaries. |
| Existing migration -> turn-reader API | Pass | Pass | Pass | Pass | The migration may consume current turn facts through the renamed API but may not acquire feature capture, recovery, or runtime compatibility responsibilities. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `RunMemoryFileStore.recordSystemInstructionSupply` | Pass | Pass | Pass | Low | Pass |
| `MemoryStore.recordSystemInstructionSupply` facade | Pass | Pass | Pass | Low | Pass |
| `SystemInstructionCaptureService.capture` | Pass | Pass | Pass | Low | Pass |
| `createSystemInstructionsSuppliedEvent` | Pass | Pass | Pass | Low | Pass |
| `PendingSystemInstructionEvent.publishOnce` | Pass | Pass | Pass | Low | Pass |
| Turn-only trace list APIs | Pass | Pass | Pass | Low | Pass |
| `archiveCompactedRawTraces` | Pass | Pass | Pass | Medium | Pass |
| Activity live/hydration upsert | Pass | Pass | Pass | Low | Pass |
| Nullable Memory Inspector trace DTO | Pass | Pass | Pass | Low | Pass |
| Snapshot-v5 `listTurnRawTracesOrdered` caller | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Active JSONL durability/rotation | Pass | Pass | N/A | Pass | Extend the existing run-memory authority; add no file or index. |
| Provider-neutral event transport | Pass | Pass | Pass | Pass | Specialized semantic event and bounded pending holder fill real missing seams. |
| Restart projection | Pass | Pass | N/A | Pass | Extend existing local-memory replay and keep archive exclusion. |
| Activity contract/presentation | Pass | Pass | Pass | Pass | Activity-owned types/policies remove current Event Monitor coupling and closed branching. |
| Team propagation | Pass | Pass | N/A | Pass | Existing typed team adapter/projector remains the routing boundary; its publisher is non-persisted. |
| Memory inspection | Pass | Pass | N/A | Pass | Existing normalized trace/API path gains an honest run-scoped variant. |
| Existing snapshot-v5 migration caller | Pass | Pass | N/A | Pass | Clean-cut reader rename preserves released input facts and adds no migration behavior. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory | Pass | Pass | Pass | Pass | Owns five-field record, store capture invariant, turn-only readers, and physical archive membership. |
| Existing app-data migration | Pass | Pass | Pass | Pass | Retains historical snapshot conversion ownership; only its current active-reference reader call is renamed. |
| Server agent memory | Pass | Pass | Pass | Pass | Thin external capture binding and normalized inspection union. |
| Server AgentRun/backends | Pass | Pass | Pass | Pass | Owns exact runtime timing, staging, and semantic event production. |
| Server standalone/team transport | Pass | Pass | Pass | Pass | Maps the same committed semantic fact without provider leakage. |
| Server run history | Pass | Pass | Pass | Pass | Owns active replay, horizon selection, Event Monitor exclusion, and Activity DTOs. |
| Web Activity | Pass | Pass | Pass | Pass | Owns UI domain, resident bound, presentation, ingress, and desktop/mobile dispatch. |
| Web Memory Inspector | Pass | Pass | Pass | Pass | Owns truthful run-scope display following nullable API fields. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Native/external fold-and-append policy | Pass | Pass | Pass | Pass | One `RunMemoryFileStore` command prevents duplicate storage authorities. |
| Native/Codex startup staging | Pass | Pass | Pass | Pass | A narrow shared one-shot holder matches the common listener lifecycle. |
| Tool/compaction/system Activity metadata | Pass | Pass | Pass | Pass | `RunActivity` base is intentionally minimal; bodies remain specialized. |
| Desktop/mobile Activity presentation | Pass | Pass | Pass | Pass | One presentation selector avoids duplicated titles/status/count logic. |
| Run/turn normalized trace distinction | Pass | Pass | Pass | Pass | The union prevents false turn identity while keeping physical storage shared. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SystemInstructionTraceRecord` | Pass | Pass | Pass | Pass | Pass | Exactly `id`, `ts`, `trace_type`, `content`, `source_event`; rejects extras. |
| Capture result | Pass | Pass | Pass | Pass | Pass | Reuses record ID/time and adds only transient `created`. |
| `SYSTEM_INSTRUCTIONS_SUPPLIED` event | Pass | Pass | Pass | Pass | Pass | Canonical payload is only `trace_id`, `content`, and `ts`; outer context owns run identity. |
| Normalized raw-trace union | Pass | Pass | Pass | Pass | Pass | Run scope and turn scope are explicit without a persisted discriminator. |
| `RunActivity` union | Pass | Pass | Pass | Pass | Pass | Common identity/time only; system variant adds only exact `content`. |
| Memory Inspector DTO | Pass | Pass | Pass | Pass | Pass | Nullable turn/sequence reports real scope instead of manufacturing values. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory/models/system-instruction-trace.ts` | Pass | Pass | N/A | Pass | Exact persisted subject, capture result, constants, and strict parser only. |
| `memory/store/run-memory-file-store.ts` | Pass | Pass | Pass | Pass | One physical store owns fold/append plus explicit typed-list/archive APIs. |
| `app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.ts` | Pass | Pass | Pass | Pass | Existing migration retains its semantics and changes only its turn-reader call. |
| `agent-memory/services/system-instruction-capture-service.ts` | Pass | Pass | Pass | Pass | External memory binding is a thin facade. |
| `agent-execution/domain/system-instructions-supplied-event.ts` | Pass | Pass | Pass | Pass | Specialized canonical event contract. |
| `agent-execution/events/pending-system-instruction-event.ts` | Pass | Pass | Pass | Pass | One-shot transient publication of a newly created trace only. |
| Runtime-specific handoff/session/thread files | Pass | Pass | Pass | Pass | Each retains only runtime-specific success/cleanup timing. |
| Run-history replay/policy/provider files | Pass | Pass | Pass | Pass | Normalization, selection, and projection responsibilities are explicitly separated. |
| Web `types/activity` and `services/activity` files | Pass | Pass | Pass | Pass | Domain shape, windowing, and presentation move out of store/components. |
| Desktop/mobile Activity components | Pass | Pass | Pass | Pass | Dispatcher and specialized body responsibilities are distinct. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/models` and store | Pass | Pass | Low | Pass | Exact record lives in the model folder; capture/physical policy stays in the established run store. |
| `autobyteus-server-ts/src/app-data-migrations/migrations` caller | Pass | Pass | Low | Pass | Existing migration file receives only the ownership-compatible reader rename. |
| `autobyteus-server-ts/src/agent-memory/services` | Pass | Pass | Low | Pass | Contains only the external capture/normalization bridge. |
| Server runtime backend folders | Pass | Pass | Medium | Pass | Cross-folder changes are necessary, but common policy/event code is kept outside adapters. |
| `autobyteus-server-ts/src/run-history/projection` | Pass | Pass | Low | Pass | Existing reopen/projection owner. |
| `autobyteus-team-stream-contracts/src` | Pass | Pass | Low | Pass | Existing shared team wire contract. |
| `autobyteus-web/types/activity` and `services/activity` | Pass | Pass | Low | Pass | Establishes an Activity-owned boundary without a new subsystem. |
| Existing desktop/mobile component folders | Pass | Pass | Low | Pass | Uses established surface ownership and thin dispatchers. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Full native prompt log | Pass | Pass | Pass | Pass | Replace with length-only operational logging. |
| Ambiguous raw-list API names | Pass | Pass | Pass | Pass | Clean rename to turn-only APIs; no aliases. |
| `archiveExactRawTraces` | Pass | Pass | Pass | Pass | Replaced by compaction-owned archive membership. |
| Manufactured turn/sequence defaults | Pass | Pass | Pass | Pass | Replaced by explicit run/turn union and nullable API fields. |
| Activity types inside Pinia store | Pass | Pass | Pass | Pass | Move to Activity domain types. |
| Activity imports from Event Monitor policy | Pass | Pass | Pass | Pass | Activity gets its own window/presentation policy while retaining numeric behavior. |
| Implicit two-kind render/hydration fallbacks | Pass | Pass | Pass | Pass | Exact switches and specialized components replace unsafe `else` behavior. |
| Any system replay into Event Monitor | Pass | Pass | Pass | Pass | Explicit subtype filtering prevents admission. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| New system row rollout | No | Pass | Pass | Additive capture starts after deployment; older runs remain directly usable and simply lack the row. |
| Raw trace typed readers | No | Pass | Pass | All affected callers move to explicit run/turn-safe APIs; no wrapper aliases. |
| Activity contract/rendering | No | Pass | Pass | Old explicit `tool` and `compaction` kinds map directly into the new union. |
| Transport | No | Pass | Pass | One semantic event is added without a parallel legacy system-instruction path. |
| Snapshot-v5 migration | No | Pass | Pass | A migration-owned historical decoder remains for its existing registered purpose; the feature adds no runtime legacy path and changes only its current turn-reader caller. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `raw_traces_active.jsonl` | `Directly Usable — No Migration`; add one exact run-scoped current row kind prospectively | Pass | Pass | N/A | Pass | Released turn rows remain current and unchanged; absence of a system event is truthful current meaning, not an old schema. |
| Active-to-archive lifecycle | Preserve active-only behavior | Pass | Pass | N/A | Pass | External rotation remains physical before-marker movement; native accepted compaction adds preceding/equal system membership only. |
| Run-history hydration | Directly read valid active rows | Pass | Pass | N/A | Pass | No archive scan, reconstruction, historical rewrite, placeholder, or secondary durable event store. |
| Memory Inspector API | Nullable turn/sequence transition | Pass | Pass | N/A | Pass | Schema/client regeneration and truthful run-scope rendering are explicitly sequenced. |
| Snapshot-v5 migration active-reference reader | Caller-only rename; migration behavior unchanged | Pass | Pass | N/A | Pass | `listTurnRawTracesOrdered` returns the same facts for supported released rows and correctly excludes current run-scoped system facts from turn reference evidence. |
| Runtime compatibility/recovery | Forward-only current model; no speculative recovery | Pass | Pass | N/A | Pass | No schema-version branch, old-file fallback, dual read/write, historical prompt reconstruction, delivery ledger, or retry registry. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Core persistence and reader split | Pass | Pass | Pass | Pass |
| Existing snapshot-v5 migration caller | Pass | Pass | Pass | Pass |
| Runtime capture and failure cleanup | Pass | Pass | Pass | Pass |
| Live standalone/team transport | Pass | Pass | Pass | Pass |
| History/Event Monitor projection | Pass | Pass | Pass | Pass |
| Activity refactor and UI | Pass | Pass | Pass | Pass |
| GraphQL/Memory Inspector | Pass | Pass | Pass | Pass |

The design explicitly disallows temporary dual reads/writes and compatibility wrappers. A completed implementation must be green even if intermediate commits are not.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Exact persisted row | Yes | Pass | Pass | Pass | Five-key JSONL example and forbidden-field list remove ambiguity. |
| Canonical event/DTO/Activity shapes | Yes | Pass | Pass | Pass | Examples show identity reuse and absence of provider/runtime metadata. |
| Active folding/change/reversion | Yes | Pass | Pass | Pass | Direct-string and rotation-reset behavior is explicit. |
| Event Monitor/Activity horizon split | Yes | Pass | Pass | Pass | Selection algorithm explains the preserved Event Monitor-compatible horizon and final Activity bound without compatibility terminology. |
| Persisted-data transition and migration caller | Yes | Pass | Pass | Pass | SR-015 supplies released/current shapes, no-migration rationale, forward-only constraints, exact caller scope, and disposable-fixture guidance. |
| UI source/character/disclosure derivation | Yes | Pass | Pass | Pass | Exact copy, Unicode count, accessibility, whitespace, and containment are specified. |
| Failure cleanup and publication ordering | Yes | Pass | Pass | Pass | Runtime-specific success points and required failure evidence are stated. |

## Material Premise Validation (Only When Needed)

### `MP-CR-001` — A retryable prepared activation retains a committed prompt row and loses its only live publication

- Related approved requirement or established contract: `REQ-SP-001`, `REQ-SP-003`, `REQ-SP-008`, `REQ-SP-009`; `AC-SP-001`, `AC-SP-003`, `AC-SP-010`, `AC-SP-011`; shared Product-Reachability Gate. The activation branch is defensive code, not an independent product contract.
- Relevant behavior ID(s): `BEH-SP-001`, `BEH-SP-002`, `BEH-SP-004`, `BEH-SP-009`
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: The workspace composer supports Send for a prepared standalone run. No independent supported user action, system event, operational action, or product/security/operations contract makes the subsequent run-start metadata save fail while preserving the exact original prepared metadata.
- Support evidence: Composer Send reaches `AgentRunCommandCoordinator.postUserMessage` and prepared activation. `recordRunStarted` reads metadata, builds the started target, and uses `AgentRunMetadataStore.writeMetadata` plus the queued atomic JSON writer. Under the repository's normal stable-process, writable-storage, and normal-filesystem assumptions it returns the target. `cancelPreparedAgentRun` rejects while the command registry has an outstanding command, and stale cleanup skips outstanding/active runs. Missing or unreadable metadata produces a different missing/indeterminate disposition. The `unchangedPreparedIsRetryable` branch and mocked `recordRunStarted -> null` unit test are downstream mechanisms and cannot establish their own initiator.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `composer Send -> stream handler -> command registry STARTING -> command coordinator -> activation service -> private Native/Codex candidate -> successful instruction handoff/row append -> recordRunStarted -> metadata store -> atomicWriteJsonFile`. Normal execution commits started metadata and publishes the candidate; it does not reach `abortForRetry`. Supported cancellation/stale cleanup is excluded while the command is outstanding. Arbitrary I/O/process failure, unsupported concurrent mutation, or a synthetic mock is required to divert the path into the claimed unchanged-present state.
- Lifecycle preconditions and material consequence at the claimed point: The rejected premise requires candidate A to commit the prompt row, fail only metadata commit while leaving exact original metadata, abort, then candidate B to fold to `created:false` and accept input without a live entry. The required diverting condition is not product-supported under the governing assumptions.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: `CR-F-001` cannot support a Design Impact finding and should be withdrawn/reclassified by `code_reviewer`. Do not add reused-row publication, rollback, durable publication state, a global pending registry, or retry-specific coverage. Preserve the approved newly-created-version publication design. The separately supported diagnostic paths behind `CR-F-002` and source type defect `CR-F-003` remain implementation-local work.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — SR-014 correctly rejects `MP-CR-001` and restores the approved first-capture spine; SR-015 confirms the additive forward-only `Directly Usable — No Migration` posture and bounded existing-migration caller rename. No architecture finding remains.

## Findings

None.

## Classification

N/A — no architecture `Design Impact`, `Requirement Gap`, or `Unclear` finding remains. The downstream `CR-F-001` classification is unsupported and should be withdrawn as `Not Reachable`; `CR-F-002` and `CR-F-003` remain implementation-local blockers.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Exact captured instructions can contain sensitive content. This is an explicitly accepted product risk under the existing selected-run authorization boundary; implementation must preserve collapsed disclosure, debug redaction, and removal of the full native prompt log.
- Active JSONL reads remain whole-file and may become expensive. Storage paging/indexing is deferred and the design does not add archive scans.
- The Activity entry can disappear after recent-window eviction or raw-trace rotation/compaction. This is approved active-only behavior, not data-loss machinery to correct in this slice.
- Cross-runtime listener timing and failure cleanup are implementation-sensitive. The design is sufficient; implementation evidence must prove Native/Codex exactly-once pre-input publication and Claude query cleanup on persistence failure.
- `CR-F-002` remains open: supported server and browser diagnostics must not serialize exact prompt content, and sentinel non-disclosure coverage is required.
- `CR-F-003` remains open: `ToolApprovalTarget` must be imported from its authoritative module and a production-source semantic TypeScript check must pass.
- Persisted-data and migration regression checks must use isolated temporary/disposable fixtures and never a user's live profile.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: `ARCH-REV-002` passes `SR-014` and `SR-015`. `CR-F-001` is rejected as premise-driven Design Impact because `MP-CR-001` is `Not Reachable`. Implementation must preserve newly-created-version-only publication, apply `CR-F-002`/`CR-F-003`, preserve the snapshot-v5 migration as a caller-only turn-reader rename, use disposable persisted-data fixtures, and return to source review before API/E2E.
