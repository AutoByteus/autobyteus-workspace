# Token Usage: One Cumulative Row Per Agent Run — Solution Revision Record

The latest `requirements.md`, `investigation-notes.md`, `design-spec.md`, `token-usage-data-model-analysis.md`, and `data-migration-conventions.md` are authoritative. This record indexes solution rounds and rationale only.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User request, clarification, approval, and initial solution baseline | N/A | `Initial Baseline` | Ready for initial architecture review |
| SR-002 | `/architecture_reviewer`; `design-review-report.md`; `ARCH-REV-001` / round 1 | AR-001, AR-002, AR-003 | `Design Impact` | Revised package ready for architecture re-review |
| SR-003 | `/architecture_reviewer`; `design-review-report.md`; `ARCH-REV-002` / round 2 | AR-004 | `Design Impact` | Exact degraded-overlap package ready for architecture re-review |
| SR-004 | User-directed refinement after `/architecture_reviewer`; `ARCH-REV-003` / round 3 | AR-001–AR-004 preserved; no new finding | `Documentation / Design Governance` | Canonical migration-convention package ready for architecture re-review |
| SR-005 | User-directed forward-only and failure-classification refinement after SR-004 handoff | AR-004 / MP-003 policy superseded; AR-001–AR-004 history preserved | `Requirement / Design Impact` | Forward-only gated-transition package ready for architecture re-review |
| SR-006 | User-directed current-contract and worked-example refinement after SR-005 handoff | No new finding; AR-001–AR-004 and SR-005 mechanics preserved | `Requirement Clarification / Design Governance` | Detailed classification package ready for architecture re-review |
| SR-007 | User verification failure after DR-003; DR-004 exact production-adapter diagnosis; explicit user design-rework direction | No new AR finding; AR-001–AR-004 preserved | `Requirement / Design Impact` | Deterministic scalar-transport package ready for architecture re-review |

## Revision Entries

### SR-001 — One-run record and upgrade-safe migration baseline

- Triggering role, report path, and round: User request/clarification/approval; initial solution-design round; no downstream report.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: Approved `Design-ready` requirements, completed investigation evidence/supplement, and an implementation-aware initial design ready for architecture review.
- Why this baseline is recorded: The incident combines an already-released startup-blocking migration with a structurally unbounded append-per-notification token store. Both recovery of blocked upgrades and clean current storage must be reviewed together.
- Resolution: Repair `20260730_token_usage_provider_name_snapshot_backfill` under the same ID with bounded SQL/batches and remove its global-fatal dependency; add a separate startup-only transactional consolidation into `token_usage_run_records`; replace runtime append/list-event ownership with an awaited atomic run accumulator; adopt approved run-created-range/lifetime-total statistics; keep the empty legacy physical contract migration-only because Prisma deploy precedes app-data conversion.
- Approved behavior or requirement IDs affected: BEH-001–BEH-006; REQ-001–REQ-021; AC-001–AC-020.
- Canonical artifacts and sections updated:
  - `requirements.md`: approved scope, behaviors, two-migration sequence, one-row invariant, period semantics, restart-safe/empty-legacy contract.
  - `investigation-notes.md`: source/runtime/data evidence, README migration convention, retry/order/manual-execution constraints.
  - `design-spec.md`: complete current/target architecture, record schema, runtime fold, provider repair, transactional consolidation, readiness boundary, removals, files, and sequencing.
- Supplemental artifacts updated, added, or removed: `token-usage-data-model-analysis.md` added and aligned as evidence/context; no intended-behavior supplement requiring separate approval.
- Downstream and architecture-review impact: Architecture review must validate the atomic fold ownership, compact state semantics, migration prerequisite/order and transaction strategy, startup-only manual guard, scoped readiness failure, and dormant legacy schema contract.
- Next recipient or routing: `/architecture_reviewer` for initial design review.
- Remaining gaps or risks: Consolidation startup duration; exact mixed-state and checkpoint codec implementation; sibling custom-provider model-value prerequisite performance; physical file shrink and final empty-table contract remain intentionally outside current startup work.

### SR-002 — Hard-bounded reconciliation and reachable upgrade chain

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`; `ARCH-REV-001`, review round 1.
- Triggering finding IDs: `AR-001`, `AR-002`, `AR-003`.
- Prior authoritative result: Architecture review `Fail` / `Design Impact`.
- Current authoritative result: Requirements remain approved and `Design-ready`; investigation evidence, supplement, and design are revised and ready for architecture re-review.
- Why this revision is recorded: The first design had the right one-row/runtime/consolidation direction but did not actually bound distinct cumulative-series state, left an unbounded released predecessor ahead of consolidation, and used event identity as an equal-time latest-field tie-break.
- Resolution:
  - `AR-001`: fixed the supported state to eight SHA-256-keyed cumulative checkpoints/16 KiB and 64 idempotency digests/8 KiB; defined codec rejection, deterministic least-recent eviction, no-charge newcomer/reappearance baseline, quality flags, legacy checkpoint compaction, and 8/9-series tests.
  - `AR-002`: added an unchanged-ID repair for `20260730_token_usage_custom_provider_model_value_backfill` with exact SQL candidate scope, six-column projection, <=250 keyset batches, compare-and-set update, scalar invariants, capped details, retry behavior, registry order, file ownership, and a ~147k unrelated-row synthetic fixture. Consolidation remains gated only by the now-bounded sibling and provider-name steps.
  - `AR-003`: replaced `(observed_at,event_id)` with one `(observed_at, admission_epoch, admission_ordinal)` contract. Legacy rows use epoch 0/numeric row `id`; current folds use epoch 1/committed `revision`; current wins equal-time cross-epoch merges and event ID remains identity/deduplication only.
- Approved behavior or requirement IDs affected: BEH-001, BEH-002, BEH-004, BEH-005; REQ-003–REQ-006, REQ-010, REQ-017–REQ-020, new derived `REQ-022`; AC-001, AC-002, AC-004, AC-005, AC-007, AC-016–AC-019, new `AC-021`.
- Canonical artifacts and sections updated:
  - `requirements.md`: bounded capacities/overflow, latest-order acceptance, both unchanged-ID source-shaping prerequisites, `REQ-022`/`AC-021`, upgrade sequence and coverage maps.
  - `investigation-notes.md`: sibling predecessor production path, series-cap evidence, equal-time/admission evidence, persisted-state constraints, and `ARCH-REV-001` source log.
  - `design-spec.md`: record fields/types/constants, hard-cap and eviction rules, admission tuple, bounded released-repair subsection, DS-002/DS-005/DS-006, interfaces/files/removals/sequence/examples/risks/tests.
- Supplemental artifacts updated, added, or removed: `token-usage-data-model-analysis.md` aligned with the enforced capacities, sibling repair mechanics, ordering rule, and prerequisite sequence; no supplement added or removed.
- Downstream and architecture-review impact: Architecture review should verify closure of `AR-001`–`AR-003`, especially overflow correctness/no-overcount, the sibling's independently bounded execution path, and equal-time legacy/current merge semantics. Implementation remains blocked until review passes.
- Next recipient or routing: `/architecture_reviewer` for round-2 architecture review with the full cumulative package and `ARCH-REV-001` records.
- Remaining gaps or risks: The single consolidation transaction may still be long; file size remains physically large without optional `VACUUM`; >8-series churn can cause flagged bounded undercount; BigInt GraphQL mapping remains an explicit affected-query risk. None reintroduces unbounded state or blocks unrelated startup.

### SR-003 — Exact current-only provenance across failed consolidation

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`; `ARCH-REV-002`, review round 2.
- Triggering finding IDs: `AR-004` (`MP-003`). Prior `AR-001`, `AR-002`, and `AR-003` remain resolved as verified by `ARCH-REV-002`.
- Prior authoritative result: Architecture review `Fail` / `Design Impact`; `SR-002` resolved the three round-1 findings but did not define exact replay overlap across the failed-consolidation continuation interval.
- Current authoritative result: Requirements remain approved and `Design-ready`; investigation, supplement, and design now specify one exact bounded transition protocol and are ready for architecture re-review.
- Why this revision is recorded: Existing-run restoration reuses canonical run/provider identity. After consolidation rollback, a provider can replay a legacy-persisted fact into an empty target state; naive later aggregate addition counts it twice.
- Resolution:
  - Startup resolves `CURRENT_ONLY`, `LEGACY_OVERLAP_GUARD_V1`, or fail-closed `UNSAFE_TRANSITION_STATE` from consolidation status plus scalar legacy count.
  - In guard mode, the accumulator invokes `TokenUsageLegacyOverlapGuard` inside the target transaction. Two unique-index existence probes suppress same-run legacy `usage_event_id`/`idempotency_key` before aggregation.
  - A missing current cumulative checkpoint is derived from only that legacy run/series in <=250 minimal scalar batches and persisted as epoch-0 state with zero token/cost/report contribution; only post-checkpoint advancement enters target totals.
  - Every changed degraded target row stores `legacy_overlap_protocol_version=1`, proving its totals/cost/report count are current-only. Consolidation refuses unproven overlap, adds the full legacy aggregate once to version-1 rows, merges checkpoint state without contribution, validates, clears markers, and deletes source in one transaction.
  - Guard seed + current fold rollback together; consolidation rollback retains source plus unchanged version-1 contributions; source zero plus cleared markers is commit-before-status idempotence. No event receipt table, contribution subtraction, legacy summary, or legacy writer is introduced.
- Approved behavior or requirement IDs affected: BEH-001, BEH-005, BEH-006; REQ-005, REQ-019, REQ-020, new derived `REQ-023`; AC-002, AC-017, AC-019, new `AC-022`.
- Canonical artifacts and sections updated:
  - `requirements.md`: degraded replay/current-write behavior, `REQ-023`, `AC-022`, exact upgrade sequence, constraints, persisted outcome, and coverage maps.
  - `investigation-notes.md`: `ARCH-REV-002`/`MP-003`, `restoreStarted`, legacy identity/index evidence, transition composition finding, and bounded protocol rationale.
  - `design-spec.md`: protocol modes/dispositions, target scalar, retry/rollback rules, DS-008, owners/interfaces/dependencies/files/removals/layering/sequence/examples/risks/tests.
- Supplemental artifacts updated, added, or removed: `token-usage-data-model-analysis.md` adds the failed-consolidation replay seam and exact bounded admission/provenance analysis; no artifact added or removed.
- Downstream and architecture-review impact: Review should verify `AR-004` closure across direct deltas, cumulative seed/advancement, target provenance, additive retry, fail-closed unknown state, and interruption. Implementation remains blocked until review passes.
- Next recipient or routing: `/architecture_reviewer` for round-3 architecture review with `ARCH-REV-002` and the full cumulative package.
- Remaining gaps or risks: The first guard-mode cumulative observation for a legacy-heavy run/series can take multiple bounded batches; semantic duplicate direct deltas with newly invented identities remain outside the existing idempotency contract; long consolidation, physical file size, >8-series flagged undercount, and BigInt API behavior remain explicit. None permits unbounded state or silent cross-schema double application under supported identity.

### SR-004 — Canonical deterministic migration and anti-overengineering boundary

- Triggering role, report path, and round: User-directed refinement relayed after `/architecture_reviewer` passed `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md` as `ARCH-REV-003`, review round 3.
- Triggering finding IDs: No new architecture finding. Preserve resolved `AR-001`–`AR-004`, including reachable premise `MP-003` for `AR-004`.
- Prior authoritative result: Architecture review `Pass`; `SR-003` was ready for implementation.
- Current authoritative result: Requirements and implementation mechanics remain approved; the new canonical governance supplement and its core-artifact integration are ready for architecture re-review before implementation continues against the refined package.
- Why this revision is recorded: The user requires the production-migration operating assumptions, anti-overengineering convention, and failure-isolation/later-upgrade rule to be a separate durable file rather than repeatedly embedded or rediscovered in each migration design. In particular, speculative power, shutdown, battery, memory, kernel, filesystem, tampering, corruption, or similar premises must not generate defensive recovery machinery when source, target, and deterministic transformation are known.
- Resolution:
  - Added `data-migration-conventions.md` as an approved normative solution artifact covering one-writer/stable-attempt/storage prerequisites, equivalent abrupt-termination labels, unsupported premises, the independent product-reachability gate, normal returned failure versus abrupt termination, capability-scoped failure/later-upgrade recoverability, the proportionate migration pattern, and ticket application.
  - Added `REQ-024` / `AC-023` so deterministic known-source-to-fixed-target conversion, standard SQLite transaction semantics, existing-runner relaunch, and rejection of unsupported recovery machinery are verifiable requirements.
  - Added `REQ-025` / `AC-024` so a truthful retryable migration failure remains capability-scoped, unrelated application use and later corrected upgrades remain reachable, partial data is not presented as complete, and `SUCCEEDED_WITH_WARNINGS` cannot mask an unvalidated required target.
  - Reworded deliberate “interruption” cases as one ordinary incomplete-attempt/relaunch category; no separate Quit/kill/shutdown/power-off branch, backup, recovery state machine, or test matrix is permitted.
  - Preserved the version-1 overlap guard because `AR-004` is independently reachable through normal consolidation failure, intentionally healthy degraded startup, supported existing-run restoration, provider replay, and later retry—not because of abrupt termination or infrastructure/security failure.
  - Recorded the delivery-owned durable destination `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` and README reference/simplification. The task artifact remains canonical until delivery performs that project-documentation sync.
- Approved behavior or requirement IDs affected: Governance across BEH-004–BEH-006; new `REQ-024`–`REQ-025`; new `AC-023`–`AC-024`; wording alignment in `REQ-015`, `REQ-019`, `REQ-022`, `AC-013`, `AC-017`, and `AC-021`. The one-row behavior and exact `REQ-023` / `AC-022` overlap mechanics are unchanged.
- Canonical artifacts and sections updated:
  - `requirements.md`: governing supplement link, deterministic/proportionate boundary, ordinary relaunch wording, capability-scoped failure/later-upgrade recovery, `REQ-024`–`REQ-025` / `AC-023`–`AC-024`, coverage and approval state.
  - `investigation-notes.md`: supplement inventory, user-direction source evidence, reachability findings, constraints, intended durable documentation destination, and re-review note.
  - `design-spec.md`: `SR-004` status, supplement link, centralized convention application, explicit no-mechanics-change statement, failure-isolation status rules, file/docs ownership, sequence, traceability, and coverage guardrails.
- Supplemental artifacts updated, added, or removed: Added approved normative `data-migration-conventions.md`; aligned evidence/context `token-usage-data-model-analysis.md` to reference it and distinguish ordinary rollback/relaunch from `AR-004` normal-failure continuation.
- Downstream and architecture-review impact: Architecture re-review should confirm that the convention is durable, coherent with the README, and does not accidentally remove the supported `AR-004` path, weaken capability-scoped nonfatal failure/later-version retry, or introduce new mechanics. Implementation must read the new artifact and avoid speculative recovery branches. Delivery must promote/link the convention in durable project docs or record an explicit integrated-state decision.
- Next recipient or routing: `/architecture_reviewer` for round-4 re-review with the complete cumulative package and `ARCH-REV-003` records.
- Remaining gaps or risks: No new implementation risk. Existing latency, identity-contract, long-transaction, bounded-series, SQLite physical-size, and BigInt risks remain. The project-doc promotion and README link are intentionally delivery-owned; until then the ticket artifact is the canonical approved convention.

### SR-005 — Forward-only current runtime and classified migration failure

- Triggering role, report path, and round: User-directed refinement after the `SR-004` package was delivered for round-4 architecture re-review; the earlier handoff was explicitly superseded before review.
- Triggering finding IDs: No new reviewer finding. Preserve the complete `AR-001`–`AR-004` history. The user changes the product premise that made `MP-003` reachable rather than disputing the historical finding.
- Prior authoritative result: `SR-004` centralized deterministic/anti-overengineering/availability governance while retaining the `SR-003` runtime overlap guard.
- Current authoritative result: Requirements, conventions, investigation, evidence supplement, and design now require forward-only current source, migration-only legacy knowledge, classified capability-scoped versus critical failure, and readiness gating instead of runtime legacy overlap handling. Ready for architecture re-review.
- Why this revision is recorded: The user explicitly prohibits backward-compatible old-schema behavior in normal source. Legacy schemas/data may be understood only by migration code. The user also clarifies that application startup may legitimately fail when required current schema/core invariants are absent; recovery can be an externally downloaded corrected release, not an old-runtime fallback or necessarily an in-app updater.
- Resolution:
  - Added `REQ-026` / `AC-025`: current domain/services/repositories/providers/GraphQL/runtime contain no legacy decoder/query/dual path/read-old fallback; all legacy types, queries, and transformations live in registered migration boundaries.
  - Reclassified `REQ-025` / `AC-024`: valid current schema plus failed noncore app-data migration is capability-scoped; missing required current schema/core invariant may be globally fatal. `SUCCEEDED_WITH_WARNINGS` never masks an incomplete target.
  - Replaced `REQ-023` / `AC-022`: while consolidation is incomplete, historical token reads and pre-existing-run restoration are gated before provider startup; newly allocated runs use current storage only. Migration retry proves legacy/current run-ID disjointness before import.
  - Removed from target design: `TokenUsageLegacyOverlapGuard`, runtime legacy SQL/checkpoint reads, status/source-count transition mode, checkpoint seeding, `legacy_overlap_protocol_version`, and same-run cross-schema merge.
  - Preserved `AR-004` history: `MP-003` was valid under restored-run continuation. The new user-approved restore gate makes that production path Not Reachable, so compatibility machinery is no longer justified.
  - Kept both bounded same-ID 20260730 repairs, one-row target, bounded current fold, transactional consolidation, empty-source relaunch recognition, and dormant migration-only physical source declaration.
  - Updated `data-migration-conventions.md` with forward-only runtime/migration-only legacy ownership, explicit failure classification, external corrected-release recovery, and the ticket-specific gated transition.
- Approved behavior or requirement IDs affected: BEH-001, BEH-004–BEH-006; REQ-005, REQ-017–REQ-020, REQ-023–REQ-026; AC-002, AC-007, AC-014, AC-017–AC-019, AC-022–AC-025. One-row identity, bounded source-shaping, and period semantics remain unchanged.
- Canonical artifacts and sections updated:
  - `requirements.md`: forward-only behavior map, upgrade sequence, degraded restore/history gate, failure classification, `REQ-026` / `AC-025`, acceptance fixtures, constraints, risks, coverage, and approval.
  - `investigation-notes.md`: user source, historical `MP-003` evidence versus current Not Reachable disposition, migration-only ownership, classified failure, and review guidance.
  - `design-spec.md`: full SR-005 target architecture, readiness/activation spines, disjoint import, removal maps, dependency/file boundaries, examples, rejection log, sequence, risks, and coverage.
  - `data-migration-conventions.md`: forward-only current-runtime rule, migration-only legacy allowance, classified failure table, external recovery, and explicit SR-003 mechanics removal.
- Supplemental artifacts updated, added, or removed: `token-usage-data-model-analysis.md` now preserves the overlap evidence while making the forward-only gate/disjoint import the approved disposition. No artifact removed.
- Downstream and architecture-review impact: This is implementation-significant and must be re-reviewed. Implementation must not retain or add any runtime legacy guard/adapter/marker. If implementation work began from `ARCH-REV-003`, it must be reconciled to SR-005 before further handoff.
- Next recipient or routing: `/architecture_reviewer` for superseding re-review with the complete cumulative package and prior review records.
- Remaining gaps or risks: Pre-existing-run restoration is unavailable until consolidation succeeds; new-run correctness depends on canonical allocator uniqueness plus migration intersection validation; critical current-schema failure requires actionable external corrected-release guidance. Long transaction, bounded-series undercount, BigInt mapping, and physical SQLite size remain.

### SR-006 — Current-application contract test and worked migration outcomes

- Triggering role, report path, and round: User-directed refinement after the `SR-005` package was delivered for architecture re-review; no new downstream report.
- Triggering finding IDs: No new reviewer finding. Preserve `AR-001`–`AR-004`, the historical `MP-003` analysis, and all `SR-005` forward-only/gated-transition mechanics.
- Prior authoritative result: `SR-005` classified migration outcomes broadly but did not give enough concrete database and structured-file examples for future migration authors to apply the rule consistently.
- Current authoritative result: The approved convention now defines one explicit current-application-contract decision test plus detailed warning, capability-scoped, and critical examples. Requirements and design are aligned and ready for superseding architecture re-review.
- Why this revision is recorded: The user requires migration authors to judge availability by what current application code and independently governing integrity/safety contracts actually need. A migration or cleanup statement can report a problem while the final current database/file format remains fully usable; conversely, merely creating a new column/attribute is insufficient if required current values or invariants are absent.
- Resolution:
  - Added a five-step decision test: enumerate current schema/format dependencies and independently required integrity/security/privacy/retention/identity/truthfulness invariants; validate them through current paths; classify unmet requirements by real owner; treat only the remainder as nonfatal residue.
  - Defined cleanup classification by final persisted state. Independently validated target plus inert, bounded, nonrequired old columns/tables, obsolete structured-file attributes, superseded files, or stale values may be `SUCCEEDED_WITH_WARNINGS`.
  - Defined warning exclusions: source/target shapes both observed by current discovery, target creation rolled back with cleanup failure, missing/invalid required current data, or an independent removal contract. These remain capability-scoped or critical failures as applicable.
  - Added worked examples for nullable SQLite metadata, dormant old database objects, obsolete JSON attributes, superseded files, incomplete capability data, absent current database/file shapes, and independently prohibited residue.
  - Clarified that stale/malformed legacy content is distinct from physical database/filesystem corruption and does not reopen unsupported infrastructure premises.
  - Kept this ticket's populated token ledger non-ready until validated consolidation and cleanup; it is not inert residue because required historical token data has not yet reached the current target.
- Approved behavior or requirement IDs affected: Clarified `REQ-025` and `AC-024`; `REQ-001`–`REQ-024`, `REQ-026`, and all other acceptance criteria retain their prior meaning.
- Canonical artifacts and sections updated:
  - `data-migration-conventions.md`: current-application decision test, cleanup-residue rules, and detailed worked classification table.
  - `requirements.md`: `REQ-025` and `AC-024` now explicitly cover database/file residue and the warning exclusions.
  - `investigation-notes.md`: user source, findings, supplement inventory, constraint, current status, and review guidance.
  - `design-spec.md`: `SR-006` status, convention application rows, and explicit no-mechanics-change statement.
- Supplemental artifacts updated, added, or removed: Updated normative `data-migration-conventions.md`; evidence/context `token-usage-data-model-analysis.md` remains unchanged because the token model and transition evidence did not change.
- Downstream and architecture-review impact: Architecture review should apply the detailed convention without reopening the one-row model or reintroducing runtime legacy compatibility. Implementation behavior remains `SR-005`; future/general migration implementations gain a more precise status and startup-classification test. Delivery must include these examples in the promoted durable convention.
- Next recipient or routing: `/architecture_reviewer` for superseding re-review with the complete cumulative package and prior review records.
- Remaining gaps or risks: Migration authors must document any independent removal contract rather than assume residue is harmless. No new token-usage implementation risk is introduced; the existing restore gate, disjointness validation, long transaction, bounded-series, BigInt, and physical-size risks remain.

### SR-007 — Deterministic Prisma/SQLite legacy scalar transport

- Triggering role, report path, and round: Explicit user verification of the `DR-003` Electron candidate; `/delivery_engineer` rework artifact `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-rework-record.md` (`DR-004`); exact follow-up reproduction by `/solution_designer`; user direction to improve design and send it for review before implementation continues.
- Triggering finding IDs: No architecture finding ID. Preserve resolved `AR-001`–`AR-004`, historical `MP-003`, and passed `ARCH-REV-006`. The delivery failure is a newly verified implementation-boundary condition.
- Prior authoritative result: `SR-006` passed `ARCH-REV-006`, was implemented/reviewed through API/E2E, and reached delivery. The Electron package started in degraded mode but the required consolidation failed three times before scanning/importing.
- Current authoritative result: Requirements, investigation evidence, analysis supplement, migration convention, and design now define one deterministic migration-only transport/parser boundary for nullable SQLite JSON integers plus exact real Prisma/SQLite regression coverage. Ready for architecture re-review; implementation must remain paused until pass.
- Why this revision is recorded: The migration trusted a TypeScript raw-query annotation to describe Prisma runtime values. In the first production ordered run, four leading `NULL` `json_extract` results caused later safe SQLite integers to arrive as decimal strings. The `number | bigint` decoder rejected `"28826658"` with a misleading out-of-SafeInt error even though all 15 source fields were valid. The user explicitly requested this diagnosed seam be incorporated into the design rather than treated only as an ad hoc code fix.
- Resolution:
  - Added `REQ-027` / `AC-026` for deterministic typed-text projection, exact source-type/grammar/`BigInt`/SafeInt validation, and a real adapter fixture with leading `NULL` rows followed by `28826658` and `28987545` in one batch.
  - Defined DS-009: `SQLite JSON type/value -> NULL or type-tagged exact text -> Prisma string/null -> strict migration parser -> exact bigint/null -> legacy fold`.
  - Required each closed cumulative-source field to project the equivalent of `json_type(...) || ':' || CAST(json_extract(...) AS TEXT)` and required the decoder to admit only `integer:(0|[1-9][0-9]*)` within SafeInt.
  - Rejected broad `Number`, `parseInt`, untagged decimal strings, TypeScript-only assumptions, bare nullable expressions, and `CAST AS INTEGER` as sole normalization. Wrong JSON types, negative/noncanonical/malformed values, and `9007199254740992` fail before cleanup with source/target rollback intact.
  - Updated the reusable convention: SQL meaning, SQLite storage class, ORM metadata, and JavaScript runtime representation are distinct contracts; computed-scalar migrations need actual production-adapter evidence and result-shape-preserving fixtures.
  - Preserved the one-row model, accounting semantics, forward-only runtime, migration-only legacy ownership, disjoint retry, degraded history/restore gate, transaction/relaunch behavior, and critical-versus-capability classification.
- Approved behavior or requirement IDs affected: `BEH-005`; new `REQ-027`; new `AC-026`. Existing `REQ-017`–`REQ-020`, `REQ-024`–`REQ-026`, `AC-016`–`AC-020`, and `AC-023`–`AC-025` are clarified but not behaviorally changed.
- Canonical artifacts and sections updated:
  - `requirements.md`: production evidence, BEH-005, `REQ-027`, `AC-026`, constraints, coverage, and approval.
  - `investigation-notes.md`: reopened status, user/delivery/read-only/backup sources, exact row/result-type evidence, findings 25–30, transition/adapter constraints, reproduction safety, and reviewer guidance.
  - `design-spec.md`: SR-007 status, adapter root cause, exact transport/parser contract, DS-009, ownership/interfaces/files/dependencies/examples/rejections/sequence/risks/traceability/coverage.
  - `data-migration-conventions.md`: adapter/transport representation convention, prohibited coercions, real-driver/null-order fixture rule, and ticket application.
  - `token-usage-data-model-analysis.md`: production verification and nullable JSON scalar transport evidence.
- Supplemental artifacts updated, added, or removed: Updated both existing supplements; no new supplement added because `delivery-rework-record.md` and durable delivery evidence already preserve the exact downstream failure/reproduction, while investigation notes keep the solution evidence authoritative.
- Downstream and architecture-review impact: Architecture review must verify that the typed transport is deterministic, bounded, injection-safe through the closed field set/parameterized paths, exact across null/wrong-type/range cases, and still migration-only. Visible downstream source/test edits in the shared worktree are preserved but unreviewed; after a pass, implementation must reconcile them to `AC-026`, especially the required leading-`NULL` same-batch fixture, before source/API-E2E/delivery rework resumes.
- Next recipient or routing: `/architecture_reviewer` with the complete cumulative package including `DR-004`; on pass, `/implementation_engineer` resumes under the reviewed SR-007 authority.
- Remaining gaps or risks: ORM/driver upgrades can change raw-query representations; real-adapter coverage fixes the known condition. The current draft downstream test visible in the shared worktree must be checked for the explicit leading-`NULL` sequence and all required rejection cases. Existing long-transaction, restore unavailability, bounded-series, BigInt/API, reusable-space, and Electron re-verification risks remain.
