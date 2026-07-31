# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/memory-context-and-lineage-contract.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/use-case-data-flow-spine-map.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/provenance-methodology-analysis.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/compacted-memory-message-role-analysis.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/memory-compactor-prompt-content-contract.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001` through `SR-015`; current `SR-015`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-001` through `ARCH-REV-009`; current `ARCH-REV-009`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001` through `IR-004`; current `IR-004`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-011`
- Current Review Round: `4`
- Trigger: `IR-004`; implementation commit `2cb36ca96958d03d14da8aee7aff3e01779f9d4a`; reviewed the `SR-015` forward-only native snapshot transition after `ARCH-REV-009` Pass
- Prior Review Round Reviewed: source round `3` / `CRR-009` / `Pass`; `CRR-010` retained as the latest downstream test-review history
- Latest Authoritative Round: source round `4`
- Coverage Investigation Reviewed (failure-origin entry point): `N/A`; prior `API-REV-001` through `API-REV-007` reports were preservation context only
- Execution Coverage Report Reviewed (failure-origin entry point): `N/A`
- API/E2E Revision Record Reviewed (failure-origin entry point): `N/A`
- Relevant API/E2E Revision IDs: `API-REV-001` through `API-REV-007` as prior delivered-baseline history; SR-015 execution has not started
- Delivery Revision Record Reviewed (delivery re-entry only): `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-001` through `DR-007`
- Failing Scenario IDs: `N/A`
- Exact Failing Commands / Execution Mode: reviewer-built direct-upgrade reproduction recorded below and at `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/code-review/crr-011-migration-order-repro.log`
- Failure Evidence Paths: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-lineage-provenance-analysis/tickets/in-progress/memory-lineage-provenance-analysis/evidence/code-review/crr-011-migration-order-repro.log`

## Review Scope

- Changed implementation and behavior reviewed: the complete `fc45c9477..2cb36ca96` production-source delta for BEH-006, BEH-007, BEH-012, and BEH-013: exact native location classification; migration-only v1/v3/v4/v5 conversion; strict-v5-only runtime restore; restoration of the ordinary nonblocking app-data migration lifecycle; and post-compaction/pre-request recovery capture with exact settlement.
- Files / areas reviewed: every changed core/server production source; migration registry/runner/repository contract; existing raw active-file and rotation migrations; metadata/location services; active raw store; converter/finalizer/serializer/provenance/tool validation; snapshot bootstrap callers; request assembler, recovery boundary, LLM streaming/ingestion/interruption paths; deleted reset/projector paths; preservation prompt checksum; implementation handoff/revision/evidence; and relevant durable tests as readiness context.
- Explicit exclusions: durable SR-015 converter/startup/restore/recovery coverage and reconciliation of the two stale `llm-phase-tool-protocol-recovery` assertions remain `api_e2e_engineer`-owned only after source review passes. No frontend source changed, so rendered UI review is inapplicable. Delivery retains documentation sync, final tracked-base refresh, packaging, and finalization. User-rejected physical disk/process failure recovery remains out of scope.

### Reviewer Checks Run

- `autobyteus-ts`: `pnpm build` — Pass, including TypeScript build and runtime-dependency verification.
- `autobyteus-server-ts`: `pnpm exec tsc -p tsconfig.build.json --noEmit` against the rebuilt worktree core — Pass.
- Exact prompt preservation — current `agent.md` remains byte-equal to the approved supplement (`2,788` bytes; SHA-256 `944dbdbd3db1146f80fdb7fe5ec2817422eec74f8eca3f4743a336169a2a8348`).
- Complete source/caller inspection — classifier identity and path safety, absent/empty-lineage gate, migration-only historical decoder, strict candidate validation before replacement, exact cleanup, no raw writes, strict runtime restore, ordinary nonthrowing runner, and request recovery capture/settlement were traced through their production owners.
- Production structural searches — no `WorkingContextRecoveryProjector`, destructive reset ID/helper, `RequiredAppDataMigrationError`, registered old reset, migration raw writer, or second recovery capture remains; historical schema numbers occur only in the migration converter; current recovery capture occurs only in `LLMRequestAssembler`.
- Changed-source audit — no current implementation file exceeds `500` effective non-empty lines; files above `220` were assessed below; production-source `git diff --check` passed.
- Implementation focused proof reviewed — converter, standalone/team migration, nonempty-lineage preservation, strict restore, ordinary runner, request recovery, external cleanup, prompt bytes, and builds all passed at the implementation stage.
- Independent direct-upgrade reproduction — a valid native schema-v4 user message referenced `raw-1` in legacy `raw_traces.jsonl`; current registry order ran the native migration before the retained active-file rename, produced strict v5 with `messages: []` and `source_reference_mismatch`, and only afterward successfully renamed the still-present raw row. This establishes `CR-F-002`.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: `Yes`; SR-015 preserves SR-010 and replaces snapshot deletion/raw fallback with a native-only forward conversion whose truthful retention depends on exact active reference facts.
- Design-spec behavior map verified against the implementation: `Partially`; the local native migration, strict restore, and request-recovery paths match, but the registered whole-startup spine places the new consumer before the retained migration that makes legacy active facts readable under the current filename.
- Design review report and round confirmed: `ARCH-REV-009` / `Pass`; `ARCH-F-012` through `ARCH-F-015` resolved/closed.
- Behavior-basis status: `Confirmed`; the intended behavior is clear. `CR-F-002` is an implementation integration-order defect, not a requirement ambiguity.
- Changed or newly discovered behavior, if any: `None`.
- Remaining material ambiguity, if any: `None`.

| Behavior ID | Current Status (`Confirmed`/`Contradicted`/`Unclear`/`Newly Discovered`) | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence (Only When Applicable) |
| --- | --- | --- | --- |
| `BEH-001` | Confirmed | Raw activity remains active/archive evidence; neither migration nor converter writes raw rows, and Event Monitor behavior is unchanged. | N/A |
| `BEH-002` | Confirmed | Accepted compaction still archives selected originals and publishes output/lineage through `MemoryManager`; SR-015 does not alter normal publication. | N/A |
| `BEH-003` | Confirmed | Proposal/accept/commit ownership and archive -> rows -> lineage -> context -> snapshot order are unchanged. | N/A |
| `BEH-004` | Confirmed | Typed direct/root lineage origin resolution is unchanged; migration creates no inferred lineage or output membership. | N/A |
| `BEH-005` | Confirmed | Valid lineage tail remains exact current authority; converted absent-lineage context contains no compacted-memory region and first future compaction has a null predecessor. | N/A |
| `BEH-006` | Confirmed with implementation defect | Classifier, converter, strict restore, identity rejection, omission/empty-v5 behavior, and nonempty-lineage skip match SR-015 locally. `CR-F-002` breaks truthful retention for a supported direct upgrade whose active filename prerequisite is still pending. | See `CR-PREM-002` and `CR-F-002`. |
| `BEH-007` | Confirmed | Only exact `RuntimeKind.AUTOBYTEUS` standalone/team-member locations reach native conversion; external cleanup consumes the shared classifier and external runtime snapshots are not reinterpreted. | N/A |
| `BEH-008` | Confirmed | SR-010 retry, natural membership, validation, audit, and publication behavior is untouched. | N/A |
| `BEH-009` | Confirmed | Exact natural compactor prompt/history/finalizer behavior is byte-preserved. | N/A |
| `BEH-010` | Confirmed | Shared Tool/value presentation and Work Evidence envelopes are unchanged. | N/A |
| `BEH-011` | Confirmed | Natural output counts and prompt audit `2` remain current; SR-015 changes no compactor contract. | N/A |
| `BEH-012` | Confirmed | `LLMRequestAssembler` stabilizes system/tool state, commits pending compaction, captures one checkpoint, then mutates/renders; assembly/provider failure restores it, while normal ingestion and supported interruption release it. | N/A |
| `BEH-013` | Confirmed with implementation defect | Converter owns the typed identity/source/fact seam, omissions, empty v5, and strict validation. `CR-F-002` feeds it an empty fact set before a required legacy-filename migration exposes otherwise truthful active facts. | See `CR-PREM-002` and `CR-F-002`. |

## Structural / Design Checks

| Check | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | SR-015 correctly isolates migration-only historical decoding, strict runtime restore, and ephemeral request recovery without adding rejected recovery machinery. | Preserve this posture while correcting order. |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | Local converter/restore/recovery contracts match, but SCN-008/DF-S02 require truthful eligible-active facts through real startup; the registry invokes native conversion before the legacy active-filename prerequisite. | Resolve `CR-F-002`. |
| Data-flow spine inventory clarity and preservation under shared principles | Fail | The local DF-L06 spine is readable, but the full ordered DF-S02 startup spine omits an existing prerequisite and can destructively finalize an empty candidate too early. | Reorder the prerequisite without adding a fallback reader. |
| Ownership boundary preservation and clarity | Pass | Classifier owns identity/location; server migration owns files/status; converter owns decoding/matching; serializer/finalizer own current shape; assembler/recovery boundary own ephemeral request rollback. | None. |
| Off-spine concern clarity (off-spine concerns serve clear owners and stay off the main line) | Pass | Diagnostics, omission tracking, metadata classification, and recovery tracing remain attached to their parent owners and do not compete with the main line. | None. |
| Existing capability/subsystem reuse check (no fresh helper where an existing subsystem should own it) | Pass | Existing location service, raw store, snapshot store, finalizer, serializer, runner, and recovery boundary are reused. The fix must reuse the retained raw-filename migration rather than decode its old filename in native migration. | Reorder; do not duplicate legacy reading. |
| Reusable owned structures check (repeated structures extracted into the right owned file instead of copied across files) | Pass | Shared runtime location classification is extracted once; conversion types and bounded omission tracking are tight owned structures. | None. |
| Shared-structure/data-model tightness check (no kitchen-sink base, no overlapping parallel shapes, specialization/composition used meaningfully) | Pass | One typed immutable fact projection crosses server/core; historical DTO knowledge is not added to runtime models; snapshot remains message-only. | None. |
| Repeated coordination ownership check (shared policy has a clear owner instead of being repeated across callers) | Pass | Converter alone matches historical refs; runner alone orders required migrations; recovery settlement is centralized around the single package checkpoint. | Correct the runner registry order. |
| Empty indirection check (no pass-through-only boundary) | Pass | Classifier, converter, omission tracker, migration, assembler, and recovery boundary each own concrete policy/state. | None. |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | New files are cohesive; the 499-line converter is dense but is intentionally the sole historical decoder/matcher and has already split its contract/diagnostics. | Keep it below the hard limit and cover it durably. |
| Ownership-driven dependency check (no forbidden shortcuts or unjustified cycles) | Fail | Code dependencies are layered correctly, but startup execution orders the fact consumer before the existing producer/normalizer of the current active filename. | Resolve `CR-F-002` in the registry sequence. |
| Authoritative Boundary Rule check (callers do not depend on both an outer owner and that owner's internal manager/repository/helper/lower-level concern) | Pass | Migration consumes classifier/raw-store/snapshot-store public boundaries; request callers consume assembler/package and `MemoryManager`, not recovery internals directly. | None. |
| File placement check (file/folder path matches owning concern or explicitly justified shared boundary) | Pass | Core migration-only conversion sits under `memory/migration`; server classification/migration/runtime changes sit in their owning subsystems. | None. |
| Flat-vs-over-split layout judgment (layout is readable for the scope and not artificially fragmented) | Pass | Contract/omissions were split from the large converter while cohesive matching remains together; no one-case coordinator chain was added. | None. |
| Interface/API/query/command/service-method boundary clarity (one subject, one responsibility, explicit identity shape) | Pass | `RuntimeMemoryLocation`, `NativeSnapshotConversionInput/Result`, `RequestPackage.recoverySnapshot`, and runner result types have explicit subjects and identities. | None. |
| Naming quality and naming-to-responsibility alignment check (files, folders, APIs, types, functions, parameters, variables) | Pass | Names distinguish native conversion, runtime classification, snapshot identity, omission, restore/release, and current-only bootstrap clearly. | None. |
| No unjustified duplication of code / repeated structures in changed scope | Pass | External cleanup and native migration share only classification; matching, action policy, and output remain separate. | None. |
| Patch-on-patch complexity control | Pass | Old reset/projector/global throw are removed cleanly rather than wrapped; no compatibility, fallback, repair, backup, or recovery branch was introduced. | Fix order directly, without old-filename fallback logic. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Reset definition/helper, recovery projector/export, and global required-migration error/rethrow are removed; structural searches are clean. | API/E2E later removes/updates stale tests. |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | Implementation probes cover current active filenames but do not cover the retained pending raw-filename migration that participates in direct upgrades; this allowed `CR-F-002`. | Implementation re-probe the order; API/E2E later adds durable coverage. |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Existing migration fixtures/location builders and live harness remain the right durable owners; IR-004 added no parallel test framework. | Reuse them downstream. |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Stage-qualified: IR-004 changes no tests; the two stale adjacent-user assertions are explicitly deferred instead of driving source compatibility. | API/E2E must reconcile them after source passes. |
| API/E2E readiness for the next workflow stage | Fail | Builds and local proofs pass, but a supported upgrade path can irreversibly omit sourceable context before API/E2E begins. | Return to `implementation_engineer`; repeat source review after the bounded fix. |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-location-classifier.ts` | 250 | Pass | Review required — new file over 220; cohesive metadata/location classifier. | Pass | Pass | Acceptable focused soft-limit exception. | Durable classifier coverage downstream. |
| `.../app-data-migrations/app-data-migration-registry.ts` | 60 | Pass | Pass | Fail only for execution order under `CR-F-002`; registry ownership is correct. | Pass | `Local Fix`. | Reorder prerequisite/native definitions. |
| `.../app-data-migrations/app-data-migration-runner.ts` | 219 | Pass | Pass | Pass — ordinary ledger/execution lifecycle only. | Pass | No structural issue. | None. |
| `.../app-data-migrations/domain/app-data-migration-types.ts` | 83 | Pass | Pass | Pass — shared status/definition contract only. | Pass | Obsolete exception cleanup. | None. |
| `.../migrations/migrate-native-working-context-snapshots-v5-migration.ts` | 242 | Pass | Review required — new file over 220; cohesive target/gate/files/status owner. | Pass | Pass | Acceptable focused soft-limit exception; caller order defective. | Fix registry order, not this file with a legacy reader. |
| `.../migrations/remove-external-runtime-working-context-snapshots-migration.ts` | 168 | Pass | Pass | Pass — external deletion policy only. | Pass | Refactor preserves owner. | None. |
| `autobyteus-server-ts/src/server-runtime.ts` | 239 | Pass | Review required — pre-existing startup owner; one changed line restores normal nonblocking behavior. | Pass | Pass | No structural issue. | None. |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | 139 | Pass | Pass | Pass — stable-base assembly/capture owner. | Pass | No structural issue. | None. |
| `autobyteus-ts/src/agent/loop/llm-phase.ts` | 381 | Pass | Review required — pre-existing phase coordinator; 160-line settlement rewrite remains within its streaming/ingestion lifecycle. | Pass | Pass | No split required for this delta. | Durable settlement coverage downstream. |
| `autobyteus-ts/src/memory/index.ts` | 74 | Pass | Pass | Pass — public export cleanup only. | Pass | No structural issue. | None. |
| `autobyteus-ts/src/memory/llm-request-recovery.ts` | 90 | Pass | Pass | Pass — one ephemeral boundary and state. | Pass | No structural issue. | None. |
| `.../memory/migration/native-working-context-snapshot-v5-conversion.ts` | 39 | Pass | Pass | Pass — typed input/result/fact contract only. | Pass | Justified supporting type file. | None. |
| `.../memory/migration/native-working-context-snapshot-v5-converter.ts` | 499 | Pass | Review required — new file near hard limit; sole decoder/matcher policy is dense but cohesive, with types/diagnostics already extracted. | Pass | Pass | Acceptable but high-pressure file. | Do not expand casually; durable table-driven coverage. |
| `.../memory/migration/native-working-context-snapshot-v5-omissions.ts` | 39 | Pass | Pass | Pass — bounded diagnostic tracker only. | Pass | Justified supporting concern. | None. |
| `.../restore/working-context-snapshot-bootstrapper.ts` | 77 | Pass | Pass | Pass — strict current restore/integrity only. | Pass | Clean simplification. | None. |
| Deleted `reset-pre-lineage-memory-app-data-migration.ts` / `reset-pre-lineage-memory-files.ts` | 0 current | Pass | Pass | Pass — obsolete destructive transition removed. | Pass | Required deletion. | None. |
| Deleted `working-context-recovery-projector.ts` | 0 current | Pass | Pass | Pass — unsupported runtime fallback removed. | Pass | Required deletion. | None. |

## Legacy / Backward-Compatibility Verdict

| Check | Result (`Pass`/`Fail`) | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Historical schemas exist only inside the approved one-time converter; runtime restore is strict v5. |
| No legacy old-behavior retention in changed scope | Pass | Old reset, raw-history projector, global migration throw, and runtime historical reader are absent. |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Deleted definitions/helpers/exports are not referenced in production source. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Fail | The migration itself is proportionate, but its registry order precedes the required existing active-filename transition and can omit valid sourceable units. See `CR-F-002`. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Current runtime has one v5 reader/writer; the fix must not add an old raw-filename fallback to native conversion. |
| Approved transition mechanics match the reviewed design, including migration safety only when required | Fail | Candidate validation/publication/cleanup are correct locally; whole-runner prerequisite order is not. |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None beyond the already-completed deletions. `CR-F-002` requires ordering correction, not another legacy reader or compatibility branch.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: SR-015 changes native persisted-data transition, strict restore, startup behavior, and request recovery. Long-lived core/server memory docs were updated in the implementation commit, but delivery must validate their integrated truth after source/API/E2E pass.
- Files or areas likely affected: core/server memory architecture; app-data migration order/operational behavior; snapshot restore; request-recovery lifecycle; test/runbook guidance.

## Material Premise Validation (Only When Needed)

### Upstream Design-Review Material-Premise Decisions

None were assigned stable premise IDs by `ARCH-REV-009`. The user-rejected physical-failure premise remains no longer relevant and does not drive this review.

### `CR-PREM-002` — A direct application upgrade can leave the retained active-filename migration pending when the new snapshot migration runs

- Origin: `New`
- Related approved requirement or established contract: `REQ-008`, `REQ-014`, `AC-009`, `AC-018`; app-data migrations marked `requiredOnStartup` execute in registry order and retained definitions support upgrades from older persisted layouts.
- Relevant behavior ID(s): `BEH-006`, `BEH-013`
- Initiating basis kind: `Contract`
- Independent product-supported initiating trigger or applicable governing contract: launch the updated application against an existing pre-active-filename-migration native data root. The retained `20260707_raw_trace_active_file_name` definition exists specifically to migrate such roots, and no minimum prior version or prerequisite-ledger requirement excludes a direct upgrade.
- Support evidence: schema-v4 native snapshots existed by commit `c262dcecf` on 2026-06-02 while active raw records still used `raw_traces.jsonl`; commit `33305e405` on 2026-07-07 introduced the required rename. Current `AppDataMigrationRunner.runPending()` executes every missing required definition in registry order.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `startConfiguredServer -> AppDataMigrationRunner.runPending -> registry external cleanup -> MigrateNativeWorkingContextSnapshotsV5Migration -> RunMemoryFileStore.listRawTracesOrdered(raw_traces_active.jsonl) -> converter sees no referenced fact -> writes omission/empty strict v5 -> later RawTraceActiveFileNameMigration renames raw_traces.jsonl`.
- Lifecycle preconditions and material consequence at the claimed point: exact current native metadata, absent/empty lineage, a valid v4 snapshot with stored raw references, the referenced rows in the old active filename, and no successful rename ledger record. The new migration irreversibly omits otherwise truthful/sourceable context before the prerequisite exposes it under the current filename.
- Reachability: `Reachable`
- Review consequence / proportionate response: `CR-F-002`; bounded implementation-owned registry-order correction and focused re-proof. Do not add a second old-filename reader or recovery subsystem.

## Review Scorecard (Mandatory)

- Overall score (`/10`): `8.9`
- Overall score (`/100`): `89.2`
- Score calculation note: simple average of the ten categories. Data-flow, API/E2E readiness, and runtime fidelity fall below the clean-pass target because `CR-F-002` affects a supported direct-upgrade path.

| Priority | Category | Score (`1.0-10.0`) | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | ---: | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 8.6 | Local migration, restore, and recovery spines are explicit and well owned. | Whole-startup ordering misses the retained raw active-filename prerequisite, so the actual DF-S02 sequence is behaviorally incomplete. | Put prerequisite raw layout/name migration before native fact consumption and cover that complete sequence. |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.3 | Classifier, migration, converter, finalizer/serializer, restore, assembler, and recovery boundary have clear authority. | Correct owners are composed in the wrong startup order. | Preserve the boundaries and fix only orchestration. |
| `3` | `API / Interface / Query / Command Clarity` | 9.2 | Identity/fact/candidate and request-package checkpoint contracts are explicit and narrow. | Registry definitions expose no dependency metadata, so correctness relies on list order being reviewed carefully. | Make the prerequisite order unmistakable in registry tests/docs. |
| `4` | `Separation of Concerns and File Placement` | 9.0 | Historical decoding is confined to migration and runtime restore is clean. | The main converter is 499 effective lines and dense, though cohesive and already supported by extracted types/diagnostics. | Keep it bounded and table-test every projection class. |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.2 | Shared classifier and immutable fact DTO avoid duplicate stores/models; no overlapping current authority was added. | Fact availability still depends on an unstated prior filename normalization step. | Encode/verify the execution dependency without expanding DTOs. |
| `6` | `Naming Quality and Local Readability` | 9.0 | Names align well with identity, migration, omission, restore, and settlement responsibilities. | Several soft-limit files require cross-file reading to recognize the registry prerequisite. | Add concise sequencing coverage and keep converter helpers navigable. |
| `7` | `API/E2E Readiness` | 8.4 | Both builds, implementation probes, and source checks pass. | No durable SR-015 tests exist yet, two prior assertions are stale, and the current integration defect must be fixed before execution. | Fix/re-review, then run representative direct upgrade, current corpus shapes, restore, and recovery lifecycle coverage. |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.0 | Strict restore and request recovery match approved behavior; local conversion mechanics are sound. | A supported direct upgrade can turn a valid source-backed v4 message into an empty v5 before the retained raw rename runs. | Resolve `CR-F-002` and prove the source-backed message survives the ordered startup. |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Historical support is migration-only; reset/projector/runtime fallback are removed cleanly. | The correct fix must resist adding an old-filename fallback inside the new migration. | Reuse the existing rename migration by ordering it first. |
| `10` | `Cleanup Completeness` | 9.0 | Obsolete production files/exports/errors are removed and production-source searches/diff checks are clean. | Durable stale-test cleanup and final docs validation remain downstream. | Complete them after the source fix and API/E2E pass. |

## Findings

### `CR-F-002` — Native snapshot conversion precedes the active raw-filename prerequisite

- Classification: `Local Fix`
- Affected behavior/contracts: `BEH-006`, `BEH-013`; `REQ-008`, `REQ-014`; `AC-009`, `AC-018`; DF-S02/DF-L06; material premise `CR-PREM-002`.
- Evidence: `app-data-migration-registry.ts` registers `MigrateNativeWorkingContextSnapshotsV5Migration` before `RawTraceRotationLayoutMigration` and `RawTraceActiveFileNameMigration`. The native migration loads facts through `RunMemoryFileStore.listRawTracesOrdered()`, which reads only `raw_traces_active.jsonl`; the later retained migration is responsible for renaming legacy `raw_traces.jsonl`. The current-build reproduction at `evidence/code-review/crr-011-migration-order-repro.log` converted a valid source-backed v4 user message to `messages: []`, then successfully renamed the still-present source row afterward.
- Product trigger and path: per `CR-PREM-002`, starting the updated product on an existing native root whose required active-name migration is still pending follows the ordinary registry order and reaches this loss.
- Material consequence: otherwise valid, truthfully sourceable continuation context is omitted and the snapshot is finalized as strict v5 before its evidence becomes visible under the current filename. Later migration cannot restore the already discarded message.
- Required action: ensure the existing raw-trace layout/active-filename prerequisite completes before the new native snapshot migration consumes active facts, while preserving external cleanup ordering and ordinary nonblocking runner semantics. Do not teach the native migration/runtime to read `raw_traces.jsonl`. Re-run a focused current-code direct-upgrade proof; durable regression coverage remains API/E2E-owned after source review passes.

`CR-F-001` and `TCR-001` remain resolved and are not reopened by IR-004.

## Classification

`Local Fix`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- `CR-F-002` blocks API/E2E because the current startup ordering can irreversibly omit valid source-backed history on a supported direct upgrade.
- The new migration/classifier/converter and exact request settlement have implementation probes but no durable coverage yet; API/E2E must add representative standalone/team v1/v3/v4/current-v5, legacy active-name sequencing, omission/identity/nonempty-lineage, real restore/continuation, and recovery cases after source passes.
- `NativeWorkingContextSnapshotV5Converter` is cohesive but sits at 499 effective non-empty lines. Future behavior should not accumulate there without reassessing extraction.
- Two existing `llm-phase-tool-protocol-recovery` assertions remain stale against SR-010 canonical composed-user representation; they must be reconciled without weakening current source.
- User-rejected process/disk crash atomicity and recovery remain explicitly out of scope; this review makes no finding from those unsupported premises.
- The branch is `13` commits ahead and `0` behind `origin/personal`; delivery retains final refresh/integrated validation after all review stages pass.

## Latest Authoritative Result

- Review Decision: `Fail — Local Fix`
- Review Entry Point: `Implementation Review`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`; `CR-PREM-002` is independently reachable and supports the finding.
- Score Summary: `8.9/10` (`89.2/100`); Data-Flow, API/E2E Readiness, and Runtime Correctness are below the clean-pass target.
- Failure Origin (when applicable): implementation integration order in `app-data-migration-registry.ts`
- Recommended Recipient (when applicable): `implementation_engineer`
- Notes: IR-004's local migration, strict restore, and request-recovery implementation is otherwise well structured, but the new migration consumes current active facts before the retained legacy active-filename migration can expose them. API/E2E must not start until the bounded ordering fix passes source re-review.
