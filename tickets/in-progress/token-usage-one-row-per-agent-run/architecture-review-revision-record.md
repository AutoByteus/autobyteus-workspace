# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record indexes architecture-review deltas and rationale only.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial solution handoff | SR-001 | N/A | Fail | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2 / SR-002 re-review | SR-002 | Fail | Fail | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-003 | Round 3 / SR-003 re-review | SR-003 | Fail | Pass | AR-004 |
| ARCH-REV-004 | Round 4 / user-directed SR-004 governance re-review | SR-004 | Pass | Pass | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-005 | Round 5 / superseding forward-only SR-005 re-review | SR-005 | Pass | Pass | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-006 | Round 6 / SR-006 current-contract classification re-review | SR-006 | Pass | Pass | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-007 | Round 7 / SR-007 production-adapter re-review after DR-004 | SR-007 | Pass | Pass | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-008 | Round 8 / SR-008 terminal-audit re-review after DR-006 | SR-008 | Pass | Fail | AR-001, AR-002, AR-003, AR-004, AR-005 |
| ARCH-REV-009 | Round 9 / SR-009 startup-scheduling re-review | SR-009 | Fail | Pass | AR-001, AR-002, AR-003, AR-004, AR-005 |

## Revision Entries

### ARCH-REV-001 — Bounded-state and upgrade-chain corrections required

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Review round and trigger: Round 1; initial architecture-review handoff from `/solution_designer`.
- Triggering role, report path, and finding IDs: `/solution_designer`; no prior downstream report; finding IDs `N/A`.
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: `N/A`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: Established the initial architecture-review baseline. The one-row ownership, clean current runtime, same-ID provider repair, scoped readiness, and transaction-based consolidation direction are sound, but the design does not yet bound per-series reconciliation state, leaves an unbounded required predecessor ahead of consolidation, and uses a non-temporal event identity as the latest-field tie-break.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `AR-001`, `AR-002`, `AR-003`
- Material classification changes: None; initial baseline.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: Long-transaction resource profile, reusable-versus-physically-shrunk SQLite size, and BigInt API-boundary behavior remain visible residual risks but do not supersede the blocking findings.

### ARCH-REV-002 — Prior findings resolved; degraded overlap remains

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Review round and trigger: Round 2; `SR-002` re-review after `ARCH-REV-001`.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/solution-revision-record.md`; `AR-001`, `AR-002`, `AR-003`.
- Relevant solution revision IDs: `SR-002`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: `SR-002` closes the three round-1 findings with enforced count/byte capacities and overflow behavior, a bounded same-ID repair of the model-value predecessor, and a timestamp/epoch/ordinal latest-field contract. Re-review found one separate reachable composition gap: replay during the explicitly supported failed-consolidation current-write interval can overlap a legacy fact, while the later merger has no exact overlap receipt or disposition.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open / blocking | Resolved | SR-002; REQ-005; AC-005 | Eight checkpoints/16 KiB and 64 digests/8 KiB are reducer/codec/migration-enforced; raw identifiers are SHA-256 digests; ninth/reappearing series has deterministic no-charge eviction/baseline behavior and coverage. |
| AR-002 | Open / blocking | Resolved | SR-002; REQ-022; AC-021 | The unchanged model-value ID now has SQL-filtered six-column keyset batches, CAS, scalar invariants, capped details, explicit ordering/files, and a large unrelated-row fixture. |
| AR-003 | Open / blocking | Resolved | SR-002; AC-004; AC-007 | Latest facts consistently use `(observed_at, admission_epoch, admission_ordinal)` with legacy row ID/current committed revision; event ID is identity only. |

- New or remaining finding IDs: `AR-004`
- Material classification changes: None; the new finding is `Design Impact` against already-approved replay and restart-safe merge behavior.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: Bounded >8-series undercount, long-transaction resource profile, reusable-versus-shrunk SQLite size, and BigInt API-boundary behavior remain explicit residual risks.

### ARCH-REV-003 — Exact guarded transition closes degraded overlap

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Review round and trigger: Round 3; `SR-003` re-review after `ARCH-REV-002`.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/solution-revision-record.md`; `AR-004`.
- Relevant solution revision IDs: `SR-003`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: `SR-003` adds a process-lifetime transition mode, admission-time indexed replay suppression, bounded legacy-series checkpoint seeding, constant version-1 current-only provenance, provenance-gated additive consolidation, fail-closed unknown state, and transaction/fixture coverage. This closes the reachable failed-consolidation overlap without a receipt table or routine legacy summary/write path. `AR-001`–`AR-003` remain resolved.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-004 | Open / blocking | Resolved | SR-003; REQ-023; AC-022; MP-003 | Every degraded write passes through one target transaction; legacy identities are suppressed before aggregation; missing cumulative checkpoints are seeded as epoch-0 state with zero contribution; every changed row carries version 1; retry requires provenance, adds legacy once, clears markers, validates, and deletes source atomically. The named direct+cumulative replay/advance/rollback fixture proves exact totals, cost, and report count. |

- New or remaining finding IDs: None.
- Material classification changes: The prior `Design Impact` is resolved; the authoritative decision changes from `Fail` to `Pass`.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Legacy-heavy first-series guard latency, established-identity contract limits, long-transaction resource profile, bounded >8-series undercount, reusable-versus-shrunk SQLite size, and BigInt API-boundary behavior remain explicit implementation/test risks.

### ARCH-REV-004 — Canonical migration convention preserves implementation readiness

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Review round and trigger: Round 4; user-directed `SR-004` governance re-review after `ARCH-REV-003` passed `SR-003`.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/solution-revision-record.md`; no open finding, with resolved `AR-001`–`AR-004` revalidated.
- Relevant solution revision IDs: `SR-004`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: The new approved `data-migration-conventions.md` centralizes known-source-to-fixed-target determinism, basic operating prerequisites, abrupt-termination equivalence, unsupported-premise exclusion, independent product reachability, truthful capability-scoped failure, ordinary runner retry, and the delivery-owned durable documentation destination. It correctly distinguishes the supported `AR-004` normal-failure continuation from Quit/power/infrastructure stories and does not alter the already-passed migration or application mechanics.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Remains resolved | SR-002, SR-004 | Governance adds no state; enforced checkpoint/digest count and byte bounds remain unchanged. |
| AR-002 | Resolved | Remains resolved | SR-002, SR-004 | Both same-ID source-shaping definitions retain their narrow bounded repair designs and ordinary runner retry. |
| AR-003 | Resolved | Remains resolved | SR-002, SR-004 | Admission-marker ordering remains unchanged; no convention text reintroduces event identity as time. |
| AR-004 | Resolved | Remains resolved | SR-003, SR-004; REQ-023–REQ-024; AC-022–AC-023; MP-003 | The convention explicitly preserves the independently reachable normal returned failure -> healthy runtime -> restored run -> legacy replay -> retry path while rejecting abrupt termination or unsupported infrastructure/security premises as justification. The version-1 guard mechanics are unchanged. |

- New or remaining finding IDs: None.
- Material classification changes: None; the authoritative decision remains `Pass`.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Existing latency, identity-contract, long-transaction, bounded-series, reusable-space, and BigInt risks remain. Delivery must promote the convention to `autobyteus-server-ts/docs/design/production_data_migration_conventions.md` and make README a concise reference without duplicating the authority.

### ARCH-REV-005 — Forward-only restore gating supersedes runtime overlap compatibility

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Review round and trigger: Round 5; user-directed `SR-005` re-review after the previously delivered `SR-004` snapshot was superseded.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/solution-revision-record.md`; no new finding, with resolved `AR-001`–`AR-004` revalidated.
- Relevant solution revision IDs: `SR-005`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: `SR-005` changes the approved failed-consolidation lifecycle and implementation mechanics. Current runtime is now strictly current-schema-only; migration status gates stored history and every pre-existing-run restoration before provider creation; only globally new runs may write the current table while consolidation is incomplete; retry rejects any legacy/current run-ID intersection before importing. Missing required current schema may stop bootstrap rather than activate an old runtime. This makes historical `MP-003` Not Reachable in the superseding target lifecycle and removes the previously correct `SR-003` runtime overlap guard, legacy checkpoint reads, protocol marker, and same-run merge.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Remains resolved | SR-002, SR-005; REQ-005; AC-005 | The current row still enforces eight SHA-256 checkpoint entries/16 KiB and 64 digests/8 KiB, with deterministic no-charge overflow/reappearance behavior and bounded migration compaction. |
| AR-002 | Resolved | Remains resolved | SR-002, SR-005; REQ-022; AC-021 | The model-value predecessor retains its unchanged-ID SQL-filtered <=250 keyset/CAS/scalar/capped repair and remains ordered before consolidation. |
| AR-003 | Resolved | Remains resolved | SR-002, SR-005; AC-004; AC-007 | Current facts use committed fold revision and migration facts use numeric legacy row ID; event identity remains deduplication only, and disjoint sets eliminate cross-schema latest-field merging. |
| AR-004 | Resolved by exact guard under prior policy | Remains resolved under superseding product policy; prior mechanism obsolete | SR-003, SR-005; REQ-023–REQ-026; AC-022–AC-025; MP-003 | The historical run-history restore trigger remains valid evidence. Under `SR-005`, incomplete-consolidation readiness rejects that restore before provider construction, so replay cannot reach the current writer. Only globally new IDs are admitted, migration proves set disjointness, and any overlap aborts before import/delete. No runtime legacy adapter or marker remains justified. |

- New or remaining finding IDs: None.
- Material classification changes: `MP-003` changes from `Reachable` under the former restored-run continuation policy to `Not Reachable` under the approved `SR-005` restore gate. This is a product-policy supersession, not erasure of `AR-004` or its evidence.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Long single-transaction resource use, allocator-uniqueness reliance plus mandatory intersection rejection, temporary loss of pre-existing-run restoration/history, bounded >8-series undercount, reusable-versus-shrunk SQLite size, BigInt API boundaries, and delivery-owned convention promotion remain explicit implementation/test/delivery risks.

### ARCH-REV-006 — Final current-contract test clarifies warnings without changing mechanics

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Review round and trigger: Round 6; user-directed `SR-006` requirements/governance clarification after `ARCH-REV-005` passed the superseded `SR-005` package.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/solution-revision-record.md`; no new finding, with resolved `AR-001`–`AR-004` and historical `MP-003` revalidated.
- Relevant solution revision IDs: `SR-006`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: `SR-006` makes the final current-application contract the controlling status/startup test and supplies concrete SQLite and structured-file examples. An independently valid current target may carry bounded inert residue only when current code cannot observe it and no independent security, privacy, retention, or storage contract requires removal. Missing required current facts, observable old/new duplication or ambiguity, cleanup rollback that removes the target, and independently prohibited residue remain failures at their real core or capability boundary. This clarifies governance without changing the passed forward-only restore gate, disjoint import, consolidation, or current one-row mechanics.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Remains resolved | SR-002, SR-006; REQ-005; AC-005 | The governance examples add no durable reconciliation state; all checkpoint/digest count, byte, and overflow rules remain unchanged. |
| AR-002 | Resolved | Remains resolved | SR-002, SR-006; REQ-022; AC-021 | The unchanged-ID model-value repair remains SQL-filtered, keyset-batched, CAS/scalar validated, and capped; the new contract test only governs truthful disposition. |
| AR-003 | Resolved | Remains resolved | SR-002, SR-006; AC-004; AC-007 | Admission ordering remains unchanged and event identity remains deduplication only. |
| AR-004 | Resolved under superseding restore-gate policy | Remains resolved | SR-003, SR-005, SR-006; REQ-023–REQ-026; AC-022–AC-025; MP-003 | `SR-006` expressly preserves the `SR-005` incomplete-consolidation restore gate and migration-owned disjointness check. Historical replay evidence remains recorded, but provider replay still cannot reach the current writer while consolidation is incomplete. |

- New or remaining finding IDs: None.
- Material classification changes: None. `MP-003` remains `Not Reachable` in the current approved lifecycle; the new classification examples introduce no recovery or runtime compatibility premise.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Existing long-transaction, allocator/disjointness, temporary restore/history unavailability, bounded-series, SQLite physical-size, and BigInt risks remain. Migration authors must document actual current readers/writers and independently applicable removal contracts before classifying residue as inert. Delivery must preserve the worked examples when promoting the convention.

### ARCH-REV-007 — Deterministic legacy scalar transport closes the verified Prisma seam

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Review round and trigger: Round 7; `SR-007` re-review after production-shaped Electron verification failed and `DR-004` plus exact safe-backup reproduction established the nullable SQLite/Prisma representation seam.
- Triggering role, report path, and finding IDs: `/solution_designer` following explicit user design-rework direction; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-rework-record.md` (`DR-004`); no new architecture finding ID.
- Relevant solution revision IDs: `SR-007`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: Production verification proved that a TypeScript `$queryRaw` generic was not a runtime transport contract. Four leading `NULL` computed values caused later valid SQLite integers to arrive from Prisma as decimal strings and be falsely rejected before import. `SR-007` adds DS-009: the consolidation repository projects each closed cumulative-source path as `NULL` or explicit JSON type plus exact text, the migration row decoder accepts only canonical nonnegative `integer:` digits through `BigInt` and SafeInt enforcement, and the real production query/transaction fixture preserves the leading-`NULL` result shape. Wrong types/grammar/range fail before cleanup with transaction rollback. Current runtime and all prior lifecycle mechanics remain unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Remains resolved | SR-002, SR-007; REQ-005; AC-005 | DS-009 changes only migration scalar transport; checkpoint/digest count, byte, and overflow rules remain unchanged. |
| AR-002 | Resolved | Remains resolved | SR-002, SR-007; REQ-022; AC-021 | Both same-ID repairs remain independently bounded and ordered before consolidation; DS-009 adds no whole-ledger result or diagnostic. |
| AR-003 | Resolved | Remains resolved | SR-002, SR-007; AC-004; AC-007 | Admission ordering remains timestamp plus migration row ID/current revision; adapter representation does not affect temporal ordering. |
| AR-004 | Resolved under superseding restore-gate policy | Remains resolved | SR-003, SR-005–SR-007; REQ-023–REQ-027; AC-022–AC-026; MP-003 | Failed consolidation still gates every pre-existing-run restore before provider creation, admits only globally new IDs, and rejects any legacy/current overlap. DS-009 is migration-only and reintroduces no runtime legacy adapter. |

- New or remaining finding IDs: None.
- Material classification changes: New premise `MP-004` is `Reachable` and directly observed through the supported Electron launch/startup-migration path. DS-009 is the minimum migration-local response. `MP-003` remains `Not Reachable` under the current restore gate.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: The actual implementation must provide the exact same-batch four-leading-`NULL` Prisma/SQLite query-and-transaction fixture plus wrong-type, negative, malformed/noncanonical, and out-of-range rollback evidence; a mock, one-row, or non-null-first test is insufficient. Diagnostics must truthfully distinguish source-type/grammar/range rejection rather than repeat the former misleading SafeInt message. Existing long-transaction, restore/history unavailability, allocator/disjointness, bounded-series, SQLite physical-size, BigInt/API, durable-doc promotion, and renewed Electron verification risks remain.

### ARCH-REV-008 — Terminal-audit compactor needs an executable startup contract

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Review round and trigger: Round 8; `SR-008` re-review after `DR-006` established two already-terminal row-linear summaries and a 31,387,995-byte supported migration-status response after the corrected token consolidation passed live.
- Triggering role, report path, and finding IDs: `/delivery_engineer` through `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/delivery-requirement-gap.md` (`DR-006`) plus evidence 19/20; no prior architecture finding ID.
- Relevant solution revision IDs: `SR-008`
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: `SR-008` correctly assigns generic <=64 KiB current reads to the app-data migration record repository and historical two-record/log mutation to a separate registered compactor. Review of the existing runner found one blocking execution contradiction: DS-011 is declared `requiredOnStartup=false` and `STARTUP_ONLY`; `runPending()` skips the former, `runMigration()` rejects the latter, and bootstrap has no third entrypoint. The required at-rest transition therefore cannot run despite the independently observed source state.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Remains resolved | SR-002, SR-008; REQ-005; AC-005 | DS-010/DS-011 add no token reconciliation state; existing checkpoint/digest count and byte bounds are unchanged. |
| AR-002 | Resolved | Remains resolved | SR-002, SR-008; REQ-022; AC-021 | Both same-ID repairs remain bounded and ordered; terminal compaction does not rerun their business transformations. |
| AR-003 | Resolved | Remains resolved | SR-002, SR-008; AC-004; AC-007 | Admission ordering and event-identity separation are unchanged. |
| AR-004 | Resolved under superseding restore-gate policy | Remains resolved | SR-003, SR-005–SR-008; REQ-023–REQ-027; AC-022–AC-026; MP-003 | Terminal audit work does not affect failed-consolidation restoration; current runtime remains forward-only and the old-run gate/disjoint retry remain intact. |

- New or remaining finding IDs: `AR-005`
- Material classification changes: New premise `MP-005` is `Reachable`: ordinary Electron startup and the supported migration-status surface expose the observed terminal records, but both supported runner paths exclude the proposed compactor. The authoritative decision changes from `Pass` to `Fail` until the scheduling contract is corrected.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: The smallest correction should reuse ordinary startup scheduling while keeping DS-011 out of fatal bootstrap gates and consolidation prerequisites. The final design must also make any claimed ordinary partial-attempt retry reachable through runner status semantics; it must not add a second orchestrator, manual production mutation, or speculative recovery state.

### ARCH-REV-009 — Ordinary startup scheduling resolves the compactor reachability gap

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Review round and trigger: Round 9; `SR-009` re-review after `ARCH-REV-008` found that DS-011's former `requiredOnStartup=false` plus `STARTUP_ONLY` metadata excluded both supported runner entrypoints.
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md` and `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/architecture-review-revision-record.md`; `AR-005` / `MP-005`.
- Relevant solution revision IDs: `SR-009`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: `SR-009` sets DS-011 to `requiredOnStartup=true` plus `STARTUP_ONLY`, making `ServerRuntime -> runPending()` its sole supported production caller. It separates scheduler inclusion from criticality by excluding the compactor ID from consolidation prerequisites and every explicit ServerRuntime fatal-status lookup. Partial log/database progression now throws into `FAILED` or stale `RUNNING`, which ordinary startup retries; `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` are terminal. AC-027 exercises the actual registry/repository/`runPending()` path and rejects direct definition execution as reachability proof.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Remains resolved | SR-002, SR-009; REQ-005; AC-005 | Scheduling/audit changes add no token reconciliation state; checkpoint/digest count and byte bounds remain unchanged. |
| AR-002 | Resolved | Remains resolved | SR-002, SR-009; REQ-022; AC-021 | Both same-ID repairs remain bounded, ordered, and distinct from the terminal audit compactor. |
| AR-003 | Resolved | Remains resolved | SR-002, SR-009; AC-004; AC-007 | Admission ordering and event-identity separation remain unchanged. |
| AR-004 | Resolved under superseding restore-gate policy | Remains resolved | SR-003, SR-005–SR-009; REQ-023–REQ-027; AC-022–AC-026; MP-003 | DS-011 does not touch token readiness or runtime legacy behavior; old-run restore gating and disjoint consolidation retry remain intact. |
| AR-005 | Open / blocking | Resolved | SR-009; REQ-028; AC-027; MP-005 | Current `runPending()` schedules `requiredOnStartup=true`; `STARTUP_ONLY` rejects manual execution; ServerRuntime calls `runPending()` and has no compactor fatal lookup. The design and required fixture use that exact path, keep the compactor out of consolidation prerequisites, and align retry claims with `FAILED`/stale `RUNNING` rather than terminal warnings. |

- New or remaining finding IDs: None.
- Material classification changes: `MP-005` remains `Reachable`, and the corrected target production path now handles it proportionately. `AR-005` is resolved; the authoritative decision changes from `Fail` to `Pass`.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Implementation must prove DS-010 before compactor enumeration, DS-011 execution through the actual startup runner, nonfatal/prerequisite absence, exact status-based partial retry, terminal-warning skip, outcome/count preservation, owned-log confinement, bounded results, and token-table immutability. The overloaded `requiredOnStartup` name remains a maintenance smell but does not justify a runner API redesign in this ticket.
