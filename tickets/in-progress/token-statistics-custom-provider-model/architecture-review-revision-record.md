# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 fresh gate after refined user behavior | `SR-002` (current), `SR-001` (historical context) | N/A | Fail | `ARCH-F-001`, `ARCH-F-002`, `ARCH-F-003` |
| ARCH-REV-002 | Round 2 fresh gate after legacy composite `model_value` clarification | `SR-003` (current), `SR-002` (prior reviewed package) | Fail / Design Impact | Fail / Design Impact | `ARCH-F-001`, `ARCH-F-002`, `ARCH-F-003`, `ARCH-F-004`, `ARCH-F-005` |
| ARCH-REV-003 | Round 3 re-review after exact contract and migration-lifecycle rework | `SR-004` (current), `SR-003` (prior reviewed package) | Fail / Design Impact | Pass | None |

## Revision Entries

### ARCH-REV-001 — Refined AutoByteus provider:model display design gate

- Canonical design review report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/design-review-report.md`
- Review round and trigger: Round 1; fresh architecture review after the user clarified that AutoByteus Token Statistics must show `<provider name>:<model name>`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/solution-revision-record.md` (`SR-002`); `ARCH-F-001`, `ARCH-F-002`, `ARCH-F-003`.
- Relevant solution revision IDs: `SR-002` current; `SR-001` historical baseline.
- Prior authoritative decision: N/A; no prior architecture-review result was recorded.
- Current authoritative decision: `Fail` — `Design Impact`.
- What changed in the review result or what baseline was established: The refined behavior basis is confirmed. Runtime scoping, current custom-provider-name lookup versus ingestion snapshot, raw grouping/row identity preservation, recursive tree ownership, explicit raw/display GraphQL fields, and the no-migration decision are structurally sound. The design is not yet implementation-ready because (1) deleted/malformed fallback wording and precedence are not exact, (2) Task raw/display arrays are called parallel without a one-to-one ordering/duplicate contract, and (3) extending the shared aggregate does not account for existing total-cost/run-summary consumers and context lifecycle.

#### Prior Finding Resolution

None. This is the initial architecture-review result for the refined package.

- New or remaining finding IDs: `ARCH-F-001`, `ARCH-F-002`, `ARCH-F-003`.
- Material classification changes: None; all findings are `Design Impact`. The prior `SR-001` package was superseded by the user clarification and was not issued an architecture result.
- Recommended recipient: `solution_designer`.
- Remaining risks or uncertainty: Current provider names are mutable and are not snapshot-stored; historical labels may change after rename or use fallback after deletion. This is an accepted residual risk, provided the exact fallback is fixed and raw identity remains unchanged.

### ARCH-REV-002 — Legacy model-value correction design impact gate

- Canonical design review report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/design-review-report.md`
- Review round and trigger: Round 2; fresh architecture gate after the user clarified that some existing deployments may contain the composite provider/model value in `model_value` and the solution package added an app-data backfill (`SR-003`).
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/solution-revision-record.md` (`SR-003`); `ARCH-F-001`, `ARCH-F-002`, `ARCH-F-003`, `ARCH-F-004`, `ARCH-F-005`.
- Relevant solution revision IDs: `SR-003` current; `SR-002` prior reviewed package.
- Prior authoritative decision: `Fail` — `Design Impact` (`ARCH-REV-001`).
- Current authoritative decision: `Fail` — `Design Impact`.
- What changed in the review result: The value-only app-data backfill is the correct persisted-data direction: it preserves canonical `model_identifier`, row identity, grouping, attribution, pricing, and counts, while the read-time resolver protects display behavior before or without migration. The architecture evidence also confirms Prisma schema migration precedes app-data migration and that the existing registry/runner and injected DB-boundary pattern are appropriate. The gate remains failed because all three prior integration findings remain unresolved, and the new classifier and lifecycle contracts are not exact enough for safe implementation.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
|---|---|---|---|---|
| `ARCH-F-001` | Open | Remaining | `ARCH-REV-001`; `SR-003` | `design-spec.md` still uses illustrative “such as” fallback wording and “best available” precedence. |
| `ARCH-F-002` | Open | Remaining | `ARCH-REV-001`; `SR-003` | Task `models` and `modelDisplayNames` remain parallel without an explicit one-to-one ordering/duplicate contract. |
| `ARCH-F-003` | Open | Remaining | `ARCH-REV-001`; `SR-003` | Aggregate extension still does not enumerate `getTotalCost`, `token-usage-run-summary-adapter.ts`, and `summaryAggregate()` consumers/context. |

- New finding IDs: `ARCH-F-004`, `ARCH-F-005`.
- Material classification changes: None. The persisted-data decision itself is proportionate and supported; the unresolved items are `Design Impact`, not a rejection of value-only migration, current-name lookup, or the no-canonical-rewrite rule.
- Recommended recipient: `solution_designer`.
- Remaining risks or uncertainty: Provider names remain current-config labels rather than immutable historical snapshots; rename/deletion effects are accepted only after exact fallback behavior is specified. Migration failure may leave partial progress because the existing runner continues startup; the revised design must make this recovery and read-time safety explicit.

### ARCH-REV-003 — Exact display and legacy migration contract gate

- Canonical design review report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/design-review-report.md`
- Review round and trigger: Round 3; re-review after `ARCH-REV-002` `Fail / Design Impact` and solution revision `SR-004`.
- Triggering role, report path, and finding IDs: `solution_designer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/solution-revision-record.md` (`SR-004`); prior findings `ARCH-F-001` through `ARCH-F-005`.
- Relevant solution revision IDs: `SR-004` current; `SR-003` prior reviewed package.
- Prior authoritative decision: `Fail` — `Design Impact` (`ARCH-REV-002`).
- Current authoritative decision: `Pass`.
- What changed in the review result: The revised package now fixes the exact provider/model fallback precedence and strings, makes `TokenUsageModelDisplayEntry[]` the sole ordered raw/display source across all recursive Task constructors, keeps the accounting aggregate and every shared accounting consumer unchanged, and specifies the anchored legacy classifier and conflict matrix. It also fixes the migration ID and registry position, required-startup behavior, CAS/independent durability, row-count/raw-identity invariants, status mapping, startup continuation, automatic/manual retry semantics, partial-progress recovery, and read-time safety in every migration state. Independent review found no remaining requirement gap, design impact, or unclear dependency for the approved scope.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
|---|---|---|---|---|
| `ARCH-F-001` | Open | Resolved | `ARCH-REV-002`; `SR-004` | `design-spec.md` exact precedence and fallback contract fixes strings for deleted/missing providers, provider-map failure, malformed values, missing model, and final `Unknown`; resolver never throws or regroups. |
| `ARCH-F-002` | Open | Resolved | `ARCH-REV-002`; `SR-004` | `TokenUsageModelDisplayEntry[]` is the single ordered source; equal lengths, positional correspondence, duplicate preservation, empty paths, mixed-runtime fallback, and all four recursive constructors are specified. |
| `ARCH-F-003` | Open | Resolved | `ARCH-REV-002`; `SR-004` | Accounting aggregate remains unchanged; `getTotalCost`, run-summary adapter, synthetic `summaryAggregate()`, and aggregate GraphQL mappings remain on that contract, while only Model/Task consume the separate display projection. |
| `ARCH-F-004` | Open | Resolved | `ARCH-REV-002`; `SR-004` | Requirements/design fix case-sensitive anchored grammar, trimming and colon preservation, scope, raw/value equality/conflict matrix, missing raw, malformed/non-composite cases, and no provider-registry membership requirement. |
| `ARCH-F-005` | Open | Resolved | `ARCH-REV-002`; `SR-004` | Fixed migration ID/order/required flag, CAS updates, independent durability, row-count/raw-identity invariants, status mapping, runner terminal/retry behavior, explicit rerun, partial recovery, and read-time safety. |

- New or remaining finding IDs: None.
- Material classification changes: `Fail / Design Impact` to `Pass`; all five prior findings are resolved. The no-canonical-rewrite, no-schema-migration, and no-provider-name-snapshot decisions remain proportionate and unchanged.
- Recommended recipient: `implementation_engineer`.
- Remaining risks or uncertainty: Provider names remain current-configuration metadata rather than historical snapshots. The local database lacks a composite `model_value` sample, so implementation must add synthetic legacy fixtures and verify generated GraphQL artifacts and actual migration wiring. These are implementation/test checks, not architecture blockers.
