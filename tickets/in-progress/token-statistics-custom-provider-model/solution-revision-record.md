# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | `solution_designer` initial investigation baseline | `N/A` | `Initial Baseline` | `Design-ready` solution package: canonical custom-provider identity is intentionally composite; Token Statistics must carry separate raw identity and concise display fields. |
| SR-002 | `solution_designer` user clarification round | User follow-up clarification; no downstream report | `Requirement Refinement` | `Refined` solution package: AutoByteus Token Statistics must display `<provider name>:<model name>` while preserving raw identity; current provider-name lookup and fallback risks are explicit. |
| SR-003 | `solution_designer` existing-data clarification round | User follow-up clarification; local data/framework analysis | `Persisted-Data Design Impact` | `Refined` solution package: add an idempotent app-data backfill for legacy composite `model_value` rows, while preserving canonical `model_identifier` and avoiding schema migration. |
| SR-004 | `architecture_reviewer` `design-review-report.md` / `architecture-review-revision-record.md`, `ARCH-REV-002` | ARCH-F-001, ARCH-F-002, ARCH-F-003, ARCH-F-004, ARCH-F-005 | `Design Impact Rework` | `Refined` solution package revised for exact fallback, recursive alignment, all aggregate consumers, legacy classifier, and existing app-data runner lifecycle; pending `ARCH-REV-003`. |

## Revision Entries

### SR-001 — Separate custom-provider identity from Token Statistics display label

- Triggering role, report path, and round: `solution_designer`; initial solution investigation; no prior report.
- Triggering finding IDs: `N/A`.
- Prior authoritative result: `N/A`.
- Current authoritative result: `Design-ready` requirements and design package.
- Why this baseline or revision entry is recorded: Establish the evidence-backed root cause, preserved identity contract, no-migration decision, and implementation target before architecture review.
- Resolution: Keep `openai-compatible:<providerId>:<modelName>` as the canonical raw identity; derive a separate display name from persisted `model_value` with a grammar-aware fallback; expose and render explicit display fields in both Token Statistics modes.
- Approved behavior or requirement IDs affected: `BEH-TOKMODEL-001`–`BEH-TOKMODEL-004`; `REQ-TOKMODEL-001`–`REQ-TOKMODEL-003`; `AC-TOKMODEL-001`–`AC-TOKMODEL-004`.
- Canonical artifacts and sections updated: `requirements.md` (refined current/desired behavior, design health, acceptance criteria, no-migration decision); `investigation-notes.md` (source log, code/data evidence, production paths, root cause); `design-spec.md` (target fields, ownership, spines, dependency rules, sequence).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture reviewer should verify the separate raw/display GraphQL contract, fallback semantics, recursive task-row coverage, and preservation of raw grouping/row IDs.
- Next recipient or routing: `architecture_reviewer` for design gate.
- Remaining gaps or risks: Implementation must choose exact field plumbing and update generated GraphQL output; API/E2E engineer must validate GraphQL/browser behavior after source review. Explicit user approval of intended behavior is represented by the task request; no separate intended-behavior supplement applies.

### SR-002 — Provider-aware AutoByteus Token Statistics labels

- Triggering role, report path, and round: `solution_designer`; user clarification round after the initial architecture handoff; no downstream report was issued.
- Triggering finding IDs: User follow-up clarification: when the `AutoByteus` runtime is selected, Token Statistics should use the provider name plus model name because it is easier to read.
- Prior authoritative result: `SR-001` `Design-ready` package proposed a short model-only display label for custom providers.
- Current authoritative result: `Refined` requirements and design package, pending architecture review.
- Why this baseline or revision entry is recorded: The user’s clarification materially changes the intended visible label from model-only to provider:model and narrows the runtime scope to AutoByteus.
- Resolution: For `runtime_kind = autobyteus`, derive `<provider name>:<model name>` using the current saved custom-provider name for `OPENAI_COMPATIBLE`, the existing built-in provider-display-name mapping for built-in providers, and `model_value`/safe suffix fallback for the model portion. Preserve raw `model_identifier`/`llmModel`/`models` for accounting and grouping. Preserve existing visible labels for non-AutoByteus runtimes. Load custom provider names once per statistics query; do not add a ledger migration.
- Approved behavior or requirement IDs affected: `BEH-TOKMODEL-001`–`BEH-TOKMODEL-005`; `REQ-TOKMODEL-001`–`REQ-TOKMODEL-004`; `AC-TOKMODEL-001`–`AC-TOKMODEL-005`.
- Canonical artifacts and sections updated: `requirements.md` (goal, current/desired behavior, requirements, acceptance criteria, runtime scope, persisted-data caveat, approval status); `investigation-notes.md` (user clarification, provider-name evidence, custom-provider store, refined production paths and risks); `design-spec.md` (provider-aware display policy, query-scoped name context, ownership/dependencies, examples, sequence, tests, and residual risk).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture reviewer must review the changed intended behavior, the current-config provider-name lookup versus ingestion snapshot decision, exact deleted-provider fallback, runtime scoping, and preservation of raw identity/grouping.
- Next recipient or routing: `architecture_reviewer` for a fresh design gate; the revised package supersedes SR-001 as current authority.
- Remaining gaps or risks: Provider rename/deletion can change or remove historical display names because provider name is not stored per event; implementation must make fallback deterministic, avoid per-row registry I/O, update generated GraphQL artifacts, and prove both Model/Task and non-AutoByteus behavior.

### SR-003 — Existing composite model-value backfill analysis

- Triggering role, report path, and round: `solution_designer`; user clarification that some existing Token Statistics data has the long value in `model_value`; local SQLite probe and app-data migration framework analysis; no downstream report was issued.
- Triggering finding IDs: User clarification; local probe showed the task-base database currently has short `model_value` values for sampled custom-provider rows while the long visible value is `model_identifier`; user scope requires coverage for deployments where `model_value` is also composite.
- Prior authoritative result: `SR-002` `Refined` package used read-time display resolution and no migration.
- Current authoritative result: `Refined` requirements and design package, pending architecture review.
- Why this baseline or revision entry is recorded: The requirement now includes existing data correction rather than only read-time presentation. The app-data framework can safely support a value-only backfill without changing the canonical identity.
- Resolution: Add a required app-data migration (illustrative ID `20260731_token_usage_custom_provider_model_value_backfill`) after Prisma startup migrations. It scans AutoByteus/OpenAI-compatible rows with a validated composite `model_value`, extracts the complete model suffix including colons, updates only `model_value`, preserves `model_identifier` and row counts, skips/reports ambiguous rows, and is idempotent. The display resolver also handles composite values safely before or without migration. Do not rewrite `model_identifier`, group by display value, add a provider-name snapshot column, or infer provider names from malformed data.
- Approved behavior or requirement IDs affected: `BEH-TOKMODEL-006`; `REQ-TOKMODEL-005`; `AC-TOKMODEL-006`; persisted-data decision and `DS-TOKMODEL-004`.
- Canonical artifacts and sections updated: `requirements.md` (existing-data use case, migration requirement, acceptance criterion, persisted-data outcome); `investigation-notes.md` (user clarification, local data comparison, app-data framework evidence, migration risks); `design-spec.md` (legacy correction policy, migration boundary, data-flow spine, ownership, sequence, compatibility decisions, and tests).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture reviewer must confirm whether value-only backfill is the intended existing-data scope, exact classification rule for `model_value` versus `model_identifier`, migration registration/order, skip semantics, and whether immutable historical provider names remain out of scope.
- Next recipient or routing: `architecture_reviewer` for a fresh gate with the cumulative SR-001–SR-003 package.
- Remaining gaps or risks: The task-base database does not reproduce composite `model_value`, so migration tests need synthetic legacy fixtures. Provider rename/deletion still affects read-time display because provider names are not snapshotted; migration must not guess unknown provider names. Implementation must update generated GraphQL artifacts and API/E2E must validate existing-data display after migration/without migration.

### SR-004 — Resolve architecture findings ARCH-F-001 through ARCH-F-005

- Triggering role, report path, and round: `architecture_reviewer`; `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/design-review-report.md` and `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/architecture-review-revision-record.md`; `ARCH-REV-002`.
- Triggering finding IDs: `ARCH-F-001`, `ARCH-F-002`, `ARCH-F-003`, `ARCH-F-004`, `ARCH-F-005`.
- Prior authoritative result: `SR-003` `Refined` package; architecture gate `Fail / Design Impact`, implementation not authorized.
- Current authoritative result: `Refined` requirements, investigation notes, and design spec revised for the next architecture gate; implementation remains unauthorized pending review.
- Why this revision is recorded: The architecture reviewer accepted value-only persisted-data direction but required exact, implementation-checkable contracts rather than illustrative behavior.
- Resolution:
  - `ARCH-F-001`: fixed provider/model fallback precedence and exact strings, including malformed composites, deleted/missing providers, provider-map load failure, missing model, and final `Unknown Provider:Unknown Model`; the resolver never throws or changes grouping.
  - `ARCH-F-002`: defined `TokenUsageModelDisplayEntry[]` as the single ordered source for raw/display arrays, with equal lengths, positional correspondence, retained duplicate display labels, empty-path behavior, and explicit coverage for `buildStandaloneAgentRow`, `buildTeamRow`, `toRow`, and `buildLegacyMemberRow`.
  - `ARCH-F-003`: kept `TokenUsageCostSummaryAggregate` unchanged and accounting-only. `getTotalCost`, `token-usage-run-summary-adapter.ts`, synthetic GraphQL `summaryAggregate()`, and existing aggregate GraphQL mappings remain on that contract; only Model/Task statistics consume the separate display projection.
  - `ARCH-F-004`: fixed the anchored grammar `^openai-compatible:([^:]+):(.+)$`, runtime/provider scope, valid/non-composite/malformed decisions, raw/value equality/conflict rules, missing raw identity, ordinary colon-containing model names, and provider-registry-independent migration classification.
  - `ARCH-F-005`: fixed migration ID `20260730_token_usage_custom_provider_model_value_backfill`, `requiredOnStartup = true`, registry position after execution-address backfill and before legacy-path drop, independent durable updates with compare-and-set, row-count/raw-identity invariants, startup continuation, `FAILED`/`SUCCEEDED_WITH_WARNINGS`/`SUCCEEDED` mapping, `runPending()` terminal/retry behavior, explicit rerun behavior, and read-time safety in pending/failed/partial/complete states.
- Approved behavior or requirement IDs affected: `BEH-TOKMODEL-007`–`BEH-TOKMODEL-008`; `REQ-TOKMODEL-006`–`REQ-TOKMODEL-007`; `AC-TOKMODEL-007`–`AC-TOKMODEL-008`; `DS-TOKMODEL-002` and `DS-TOKMODEL-004`.
- Canonical artifacts and sections updated: `requirements.md` (exact fallback, aggregate-consumer preservation, alignment, and migration lifecycle requirements/acceptance criteria); `investigation-notes.md` (architecture findings, source evidence, current ownership, runner semantics, and resolved unknowns); `design-spec.md` (exact display contract, aligned entry projection, all consumer boundaries, classifier matrix, lifecycle contract, examples, sequence, tradeoffs, risks, and implementation guidance).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture reviewer must re-evaluate `ARCH-F-001` through `ARCH-F-005`; implementation remains blocked until the revised package passes. Once passed, the cumulative package authorizes handoff to `implementation_engineer` through the normal reviewed-solution flow.
- Next recipient or routing: `architecture_reviewer` for `ARCH-REV-003`.
- Remaining gaps or risks: The task-base database still lacks a composite `model_value` example, so synthetic migration fixtures are required. Provider names remain current-configuration metadata, not historical snapshots. Implementation must verify actual file paths and all aggregate consumers, update generated GraphQL artifacts, and test the runner/lifecycle contract without altering the existing runner’s ownership.
