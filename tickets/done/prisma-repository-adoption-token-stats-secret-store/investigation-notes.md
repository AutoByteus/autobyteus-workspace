# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; the backend task remains in its dedicated worktree, now fast-forwarded to refreshed `origin/personal@153f3409c`. The prerequisite library ticket was completed in its own worktree and archived after release.
- Current Status: Requirements/design revised under `SR-002` after the user's naming correction. The implementation-ready target uses domain-subject secret repository names with no `Prisma` provider suffix.
- Investigation Goal: Determine whether active token-statistics and secret-store persistence bypass the intended repository-prisma architecture, recover the intended pattern from supplied source and Git history, and define a behavior-preserving refactor scope.
- Scope Classification: `Large`
- Scope Classification Rationale: The prerequisite package work is complete, but the backend change still spans main-server and standalone-importer lifecycle composition, token runtime persistence, high-assurance secret transactions, existing-data safety, and broad regression coverage.
- Scope Summary: Active token/secret production paths; repository-prisma lifecycle/BaseRepository/ALS contracts; removed repository history; divergence origins; delivered `1.0.9` transaction-options prerequisite; recommended target; data-transition outcome.
- Primary Questions To Resolve: Resolved. The prerequisite is published and the user approved continuing the backend repository-pattern refactor.

## Request Context

The user believes backend token statistics and secret store do not use the intended repository-prisma pattern. The broader repository removed many repositories after switching most capabilities from SQLite to file-backed storage, but representative repository construction/layering remains in Git history. The user stated that repository-prisma exists to make application development easier and supplied `/Users/normy/autobyteus_org/repository_prisma` as the source.

Investigation confirms both active requested Prisma paths bypass the package. It also distinguishes this from the valid removal of repositories whose authoritative storage became files.

## Environment Discovery / Bootstrap Context

### Primary server/workspace repository

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store`
- Current Branch: `codex/prisma-repository-adoption-token-stats-secret-store`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store`
- Bootstrap Base Branch: initially `origin/personal` at `a3beeec29a701e6731d985f76d083a12bd82478f`; task worktree fast-forwarded on resumption to `origin/personal@153f3409cd90207f9219cbe20242606271b36104`.
- Remote Refresh Result: `git fetch --prune origin` succeeded on 2026-07-28; `origin/HEAD` resolves to `origin/personal`. A later `git merge --ff-only origin/personal` integrated the completed token-statistics safe-integer ticket without conflicts.
- Task Branch: `codex/prisma-repository-adoption-token-stats-secret-store`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal` via the delivery workflow.

### Completed repository-prisma prerequisite

- Project Type: `Git`
- Archived Repository Root: `/Users/normy/autobyteus_org/repository_prisma`
- Archived Task Artifact Folder: `/Users/normy/autobyteus_org/repository_prisma/tickets/done/transaction-options`
- Former Task Branch/Worktree: `codex/transaction-options`; removed safely after finalization
- Bootstrap Base Branch: `origin/main` at `715e4558ddc6ef6907c1f0055d261a8766ff20c6`
- Remote Refresh Result: `git fetch --prune origin` succeeded on 2026-07-28; `origin/HEAD` resolves to `origin/main`.
- Finalized Tag Target: `v1.0.9` at `634bb2b19df231957025c786ba5e9da1eabb938f`
- Published Package: `repository_prisma@1.0.9` (`latest`) with `@prisma/client:^5.22.0`

- Bootstrap Blockers: None.
- Notes For Downstream Agents: The approved requirements and design are implementation-ready. Consume published `repository_prisma@1.0.9`; do not recreate, patch, link, or vendor the prerequisite. The dedicated backend worktree is authoritative.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store/tickets/in-progress/prisma-repository-adoption-token-stats-secret-store/repository-prisma-architecture-analysis.md` | Focused active-vs-intended architecture and history comparison | Library pattern, historical layering, current token/secret paths, divergence origins, resolved transaction-options prerequisite, target recommendation, scope/data decision | Requirements, investigation notes, design spec | `REQ-001`–`REQ-010`; `AC-001`–`AC-012` | Complete | `N/A` (evidence/context only) | Keep aligned through implementation handoff |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-28 | Command | `git fetch --prune origin`; `git symbolic-ref refs/remotes/origin/HEAD`; `git remote show origin` in workspace repo | Resolve fresh primary base | Remote default `personal`; refresh succeeded; base `a3beeec29...` | No |
| 2026-07-28 | Setup | `git worktree add -b codex/prisma-repository-adoption-token-stats-secret-store /Users/normy/autobyteus_org/autobyteus-worktrees/prisma-repository-adoption-token-stats-secret-store origin/personal` | Isolate primary task | Clean dedicated worktree created | No |
| 2026-07-28 | Command / Setup | `git -C /Users/normy/autobyteus_org/repository_prisma fetch --prune origin`; matching `git worktree add ... origin/main` | Resolve and isolate library target | Clean library worktree at `715e455`; source checkout's untracked lock excluded | No |
| 2026-07-28 | Doc / Code | `/Users/normy/autobyteus_org/repository_prisma/{README.md,DESIGN.md,src/lib/base-repository.ts,src/lib/context.ts,src/lib/prisma-manager.ts,src/lib/client/**,src/tests/integration.test.ts}` | Establish intended developer API, ownership, lifecycle, transaction behavior | At the initial `1.0.8` read, BaseRepository resolved ALS/root client, lifecycle owned one raw client, and the HOF had a callback-only signature | Resolved by later `1.0.9` release row |
| 2026-07-28 | Command | `git -C /Users/normy/autobyteus_org/repository_prisma diff v1.0.8..HEAD -- src package.json README.md DESIGN.md` plus hashes of `src/lib/context.ts` | Compare supplied source with published baseline | Relevant source is identical to tag `v1.0.8`; only delivery artifacts differ after tag | No |
| 2026-07-28 | Code | `autobyteus-server-ts/src/config/prisma-client-factory.ts`, `src/server-runtime.ts`, `src/app.ts`, `src/config/{app-config.ts,application-database-location.ts}` | Find active datasource/client lifecycle | AppConfig canonicalizes URL; migration runs first; no repository-prisma initialization; factory creates independent clients | No |
| 2026-07-28 | Code | `src/token-usage/**`, token event processor/enricher, GraphQL resolver, `docs/modules/token_usage.md` | Trace supported token write/read behavior | Store/provider boundaries are coherent; repository alone owns custom client path | No |
| 2026-07-28 | Code | `src/secret-management/**`, `docs/modules/secret_management.md`, importer service/CLI | Trace vault startup/runtime/import behavior and invariants | Runtime owns injected client; repository owns two models/explicit tx; exact timeouts and target isolation must remain | No |
| 2026-07-28 | Command | `rg -n "from ['\"]repository_prisma" autobyteus-server-ts/src`; direct client/factory scan | Determine production package usage and bypasses | Zero production imports; token, secret, and bounded app-data migrations import Prisma/factory directly | No |
| 2026-07-28 | Repo / Command | `git log --all -S'repository_prisma'`, `-S'BaseRepository'`, deleted-path scan under `autobyteus-server-ts/src` | Recover removed patterns and commits | Historical SQL repositories all used BaseRepository; many correctly deleted by file-first change | No |
| 2026-07-28 | Repo / Code | `git show f50fa2d4c^:<representative repository/provider paths>` | Inspect construction and layering before removal | Provider/service -> model repository -> BaseRepository -> context-aware client | No |
| 2026-07-28 | Repo / Diff | `git show ddf18dcf3 -- token-usage-record-repository.ts`; `git show ffca05da7:...token-usage-ledger-repository.ts` | Identify token divergence origin | BaseRepository deliberately removed in `ddf18dcf3`; ledger copied direct-client pattern in `ffca05da7` | No |
| 2026-07-28 | Repo / Docs | `git show 056455929...`; `tickets/done/secure-centralized-secret-provisioning/repository-prisma-1.0.8-assessment.md` and requirements/design/review evidence | Identify secret design decision and governing invariants | Prior scope explicitly rejected production adoption absent a separate owner transition; transaction/byte-stability/security evidence remains governing | No |
| 2026-07-28 | Probe | Temporary schema push and `/tmp/repository-prisma-autobyteus-probe.qA4Sg4/probe.mjs` using installed `repository_prisma@1.0.8` and server generated client | Verify active models and implicit multi-model transaction against real SQLite | All three models resolve; secret writes rolled back together; counts returned to zero; DB hash unchanged; no sidecar; HOF arity 1 | No—material result retained here; temp root is disposable |
| 2026-07-28 | Code / Test Config | `autobyteus-server-ts/vitest.config.ts`, `tests/setup/prisma-*` | Assess lifecycle rebind test feasibility | Fork pool with `fileParallelism:false`; explicit sequential init/shutdown can replace production client injection | No |
| 2026-07-28 | Doc | Shared `solution-designer/design-principles.md` | Evaluate ownership, reachability, removal, data-transition, and compatibility posture | Refactor is boundary/ownership correction; clean removal and direct-use data decision required | No |
| 2026-07-28 | Other | User sequencing decision: complete repository-prisma improvement ticket before backend refactor | Split delivery into an upstream library ticket and paused downstream adoption ticket | Library ticket bootstrapped at `/Users/normy/autobyteus_org/autobyteus-worktrees/repository-prisma-transaction-options`; backend paused | Resolved—release completed and backend requirements revalidated |
| 2026-07-28 | Delivery artifacts / Source | `/Users/normy/autobyteus_org/repository_prisma/tickets/done/transaction-options/{handoff-summary.md,release-deployment-report.md}`; released `src/lib/context.ts`, `src/index.ts`, `dist/index.d.ts` | Verify prerequisite completion and exact consumable contract | `repository_prisma@1.0.9` is published as npm `latest`; outer options are forwarded unchanged, omission preserves the one-argument call, nested options are ignored, and peer remains `^5.22.0` | No |
| 2026-07-28 | Command / Base revalidation | `git merge --ff-only origin/personal`; `git diff a3beeec29..153f3409c -- autobyteus-server-ts` | Revalidate backend investigation against latest tracked base | Fast-forward succeeded. New token-statistics work changes GraphQL integer serialization/coverage, not repository ownership; safe-integer outcomes must remain preserved | No |
| 2026-07-28 | Package metadata | `autobyteus-server-ts/package.json`; workspace `pnpm-lock.yaml` | Confirm adoption work still required after publication | Server still requests/resolves `repository_prisma@1.0.8`; normal update to `1.0.9` is required | Yes—implementation after design |
| 2026-07-28 | User approval | “now we can start with, continue with the original tickets, which is about refactoring of repository using repository pattern” | Resolve backend requirements/design authorization | Revalidated backend repository-adoption scope approved; no prerequisite obstacle remains | No |
| 2026-07-28 | Code / lifecycle reachability | `src/agent-execution/events/processors/token-usage/token-usage-event-persistence-processor.ts`, `default-agent-run-event-pipeline.ts`, `server-runtime.ts` | Revalidate shared-client shutdown sequencing | Supported token events schedule untracked `setImmediate` appends. Closing the shared library before they settle can fail an append or let a later callback lazily reopen the global client | Resolved in target design: quiesce/drain before `shutdownPrisma()` |
| 2026-07-28 | Architecture current-state read | `src/server-runtime.ts`; token repository/store/processor/default pipeline; `src/secret-management/{secret-vault-runtime.ts,persistence/secret-vault-prisma-repository.ts,bootstrap/**,services/**,provisioning/local-environment-secret-import-service.ts}`; released `repository_prisma@1.0.9` BaseRepository/context/lifecycle source | Validate complete target spines, owners, file boundaries, transaction/lifecycle reachability, and clean removal against current code | Composition roots can own the published lifecycle; token needs tracked scheduled-work drain; vault needs two model repositories plus its existing coordinator; importer preview/execution must remain split; app-data migrations and inspection are distinct bounded owners | Resolved in implementation-ready design |
| 2026-07-28 | Design readiness validation | [design-spec.md](./design-spec.md), shared `design-principles.md`, and `references/design-examples.md` | Check approved use-case coverage, production-path/spine completeness, ownership/boundaries/dependencies/interfaces/removal/data transition/proportionality | `UC-001`–`UC-010` map through `BEH-001`–`BEH-006` and `DS-001`–`DS-012`; all applicable checks pass after adding shutdown drain and safe-integer preservation | No |
| 2026-07-28 | User design feedback | “`SecretVaultPrismaRepository` … why do you put a Prisma in the file name? It's really strange” | Revalidate target naming against domain ownership and the historical repository pattern | The suffix exposes a replaceable persistence provider and is especially misleading on the cross-model coordinator, which no longer owns a Prisma client/delegate. The same issue applies to the new entry/metadata repository names | Resolved in `SR-002`: `SecretVaultRepository`, `SecretEntryRepository`, and `SecretEncryptionMetadataRepository`; no alias |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | Operational | Normal server start/stop with canonical application DB | AppConfig -> Prisma CLI migrations -> dedicated secret client/bootstrap -> app-data migrations -> APIs; token client lazily created on token operation; server close disconnects secret client only | One canonical application DB is selected; migration precedes runtime; secret key is zeroized/secret client closed; token default client has no close owner | `src/server-runtime.ts`, `src/secret-management/secret-vault-runtime.ts`, token repository client owner |
| `BEH-002` | System | Runtime emits supported `TOKEN_USAGE_UPDATED`; GraphQL issues token queries | Event pipeline -> enrichment/pricing/delta -> non-blocking persistence processor -> ledger store -> direct-client repo -> SQLite; resolver -> provider/store -> repo -> projections | Idempotent append, ordered reads, accounting/statistics/hierarchy/display semantics, safe-integer token serialization beyond GraphQL 32-bit `Int`; persistence failure does not block streaming | Token processor/store/repository, GraphQL resolver, `docs/modules/token_usage.md`, finalized token-statistics safe-integer ticket |
| `BEH-003` | System | Server startup and authorized secret status/save/remove/resolve calls | Secret runtime -> dedicated client/repository -> bootstrap/service -> catalog/crypto -> repository -> DB/key | Fail-closed vault health, encrypted custody, authorized resolution, byte-stable established restart, idempotent remove | Secret runtime/bootstrap/service/repository; secret docs and completed ticket evidence |
| `BEH-004` | System | Secret batch import, custom-provider-v1 batch/compensation, concurrent initializer | Service/bootstrap -> direct repository `$transaction(tx)` -> private tx-delegate operations | All-or-nothing batch, overwrite counts, domain check, collision reject, receipt-bound compensation, serialized initialization; exact timeouts | `secret-vault-prisma-repository.ts`; secret lifecycle/migration tests; completed review evidence |
| `BEH-005` | Operational | Operator runs `pnpm secrets:import` with explicit absolute `--database-url` | CLI -> immutable ApplicationDatabaseLocation -> read-only preview; execution -> migration -> new secret runtime/client -> batch -> close | Explicit target is sole authority; preview non-mutating; execution rechecks and closes | Import CLI/service/docs |
| `BEH-006` | Contract | Application developer defines model repository and transaction through published repository-prisma | `BaseRepository.forModel` -> getPrismaClient -> ALS transaction/root lifecycle; `runInTransaction(callback, options?)` opens/reuses transaction | No client/tx prop drilling; one context-aware delegate; explicit outer settings supported in `1.0.9`; outer settings govern nested calls | Released library source/declarations, archived handoff/release report, temporary consumer-schema probe |

## Design Health Assessment Evidence

- Change posture: `Refactor`
- Candidate root cause classification: `Boundary Or Ownership Issue`
- Refactor posture evidence summary: Active production repository code bypasses a deliberately installed authoritative repository/client/transaction capability. Custom per-capability ownership creates inconsistent lifecycle and transaction APIs. Higher-level domain owners remain healthy, so the refactor should be bounded to persistence and composition.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Production import scan | No server production import of repository-prisma | Library is not the active persistence boundary | Yes—adopt after approval |
| Token repository | Custom lazy singleton client + optional injected path; no shutdown | Lifecycle ownership bypass and dual production/test access shape | Yes—remove |
| Secret runtime/repository | Runtime owns DB client; repo owns two direct delegates and tx propagation | Runtime responsibility drift and missed implicit transaction capability | Yes—split model access/retain coordinator |
| Historical repositories | Model repos extended BaseRepository under providers/services | Confirms local intended pattern without greenfield invention | No |
| Library source | One lifecycle and ALS transaction routing already exist | Reuse existing subsystem; do not create server-local repository framework | No |
| Delivered HOF options contract | Published `1.0.9` accepts the vault's explicit timeouts and preserves nested/default behavior | Backend can adopt the existing library boundary without direct `$transaction` fallback | Yes—consume normal package |
| Schema/data evidence | Same models/mappers work via BaseRepository; rollback probe clean | Directly usable data; no migration | No |
| Token scheduled-append shutdown path | `setImmediate` callbacks are untracked; shared lifecycle shutdown can race or be reopened lazily | The default pipeline must own an idempotent quiesce/drain boundary called before shared client shutdown | Yes—bounded local lifecycle addition |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/server-runtime.ts` | Server startup/shutdown composition | Runs migrations and secret bootstrap; no shared Prisma lifecycle | Correct owner for main-process explicit init/shutdown |
| `autobyteus-server-ts/src/config/prisma-client-factory.ts` | Creates configured raw clients | Used by requested paths and app-data migrations | Remove token/secret dependencies only; keep for bounded migration owners unless separately justified |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Ledger mapping/query/idempotency plus client ownership | Correct repository behavior mixed with custom lifecycle | Extend BaseRepository; remove client ownership/injection |
| `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts` | Ledger orchestration/projections | Clean persistence caller | Preserve; must not gain Prisma concerns |
| `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/token-usage-event-persistence-processor.ts` | Schedules non-blocking ledger appends and warns on failure | Accepted callbacks are not tracked through `setImmediate` and append settlement | Own stopped state, pending work, idempotent close, and drain without making `process()` blocking |
| `autobyteus-server-ts/src/agent-execution/events/default-agent-run-event-pipeline.ts` | Constructs/caches the default processor graph | Exposes no lifecycle boundary for its token processor | Own construction plus an idempotent stop/drain/reset function used by server shutdown |
| `autobyteus-server-ts/src/secret-management/secret-vault-runtime.ts` | Vault service/key lifecycle plus Prisma client lifecycle | Retains/disconnects raw Prisma client | Remove DB lifecycle; retain vault service/key lifecycle |
| `autobyteus-server-ts/src/secret-management/persistence/secret-vault-prisma-repository.ts` | Two-model access, mapping, transactions, receipt compensation | Cohesive domain persistence owner but model access/file responsibility and provider-specific name are overloaded | Rename the coordinator to `secret-vault-repository.ts`; extract domain-named entry/metadata BaseRepository owners |
| `autobyteus-server-ts/src/secret-management/services/secret-management-service.ts` | Authorization, crypto sequencing, value-free events | Correct authoritative boundary | Preserve; no raw Prisma/tx |
| `autobyteus-server-ts/src/secret-management/provisioning/local-environment-secret-import-service.ts` | Explicit-target preview/execute composition | Execution constructs/closes secret runtime; preview separate | Execution factory owns package init/shutdown; preview unchanged |
| `repository_prisma/src/lib/base-repository.ts` | Model repository CRUD | Supports all required operations/models | Reuse unchanged |
| `repository_prisma/src/lib/context.ts` | ALS and HOF transaction | Released `1.0.9` owns the required options contract | Consume unchanged |
| `repository_prisma/src/lib/client/lifecycle.ts` | Root client/datasource readiness/shutdown | Fits main/importer lifecycle | Reuse; initialize without WAL |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-28 | Probe | Temporary `prisma db push --schema autobyteus-server-ts/prisma/schema.prisma --skip-generate`, then Node script importing installed `repository_prisma@1.0.8`/consumer `@prisma/client` | `BaseRepository` resolved `TokenUsageLedgerEvent`, `SecretEntry`, `SecretEncryptionMetadata`; counts succeeded | Library generics/runtime bind to consumer-generated models as intended |
| 2026-07-28 | Probe | `runInTransaction` created secret metadata+entry then threw `ROLLBACK_PROBE` | Both counts returned to zero | Composed BaseRepositories share ALS transaction and rollback atomically |
| 2026-07-28 | Probe | Hash/sidecar comparison around init/read/rolled-back transaction/shutdown | Main DB SHA-256 unchanged and no `-wal`, `-shm`, or `-journal` remained | Adoption without `enableWAL` can preserve data/journal representation; downstream durable proof still required |
| 2026-07-28 | Probe / Source | `runInTransaction.length` plus exact source | Declared arity `1`; source forwards no options | Upstream API gap is real |

Temporary probe root `/tmp/repository-prisma-autobyteus-probe.qA4Sg4` is disposable scratch, not a supplemental artifact. Material results are retained above and in the architecture analysis.

## External / Public Source Findings

- Public API / spec / issue / upstream source: User-supplied local repository plus its canonical archived delivery artifacts; no internet source was required.
- Version / tag / commit / freshness: Library `v1.0.9` target `634bb2b19df231957025c786ba5e9da1eabb938f`, published and verified on 2026-07-28. Server base revalidated at `153f3409cd90207f9219cbe20242606271b36104`.
- Relevant contract, behavior, or constraint learned: `RunInTransactionOptions` supports `maxWait`, `timeout`, and `isolationLevel`; only explicit outer settings reach Prisma; omitted/nested behavior remains stable.
- Why it matters: The backend can now use the normal package contract with no direct-transaction fallback.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static investigation; disposable SQLite DB generated from current schema for the focused probe.
- Required config, feature flags, env vars, or accounts: Probe used only an explicit temporary `file:` URL and current generated Prisma client; no credential/provider account used.
- External repos, samples, or artifacts cloned/downloaded for investigation: None; existing local repository-prisma source supplied by user.
- Setup commands that materially affected the investigation: Both dedicated worktree creations; temporary Prisma schema push recorded above.
- Cleanup notes for temporary investigation-only setup: Temporary probe root may be deleted; no real application DB, `.env`, secret file, or root key was opened.

## Findings From Code / Docs / Data / Logs

### Confirmed current state

- Server manifest requests `repository_prisma:^1.0.8`; workspace lock resolves `1.0.8` with `@prisma/client@5.22.0`.
- Published `repository_prisma@1.0.9` is available and retains `@prisma/client:^5.22.0`; server manifest/lock have not yet adopted it.
- Only a focused installed-package policy test uses the dependency; production source does not.
- Token's custom client owner was recently added to defer acquisition and pass canonical config, but duplicates the package lifecycle and has no shutdown.
- Token persistence schedules fire-and-forget appends with `setImmediate`; the current default pipeline exposes no close/drain hook because its private token client was never shut down.
- Secret's direct-client design is recent and thoroughly reviewed for security/concurrency. Adoption must preserve, not reinterpret, those outcomes.
- App-data migration components also use raw clients, but they are bounded historical-schema infrastructure and not evidence that runtime repositories should bypass the package.

### Historical layering

- Prior SQL providers mapped domain data and called model-specific repositories.
- Model repositories extended BaseRepository and used inherited CRUD/delegate access.
- File-first removal deleted repositories only where persistence moved away from SQL.
- Token was an exception left in SQL, then diverged from the pattern in a later unrelated orchestration commit.

### Target recommendation

- Central lifecycle at composition roots.
- BaseRepository for the token model and two secret models.
- Vault coordinator retained for cross-model business persistence sequencing and renamed `SecretVaultRepository`; model owners are `SecretEntryRepository` and `SecretEncryptionMetadataRepository`.
- Published option-aware HOF; no direct transaction fallback.
- Clean removal of per-capability raw clients/injection.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Token ledger and secret rows in the canonical application SQLite DB; schema models inspected. Exact user volume was not opened because no transformation is proposed. Root key remains DB-adjacent.
- Relevant code-model, serialization, semantic, or physical-store change: Only client/delegate acquisition and transaction context routing. No code model, serialized field, schema, or physical-store change.
- Normal readers and writers, including unknown/extra-field behavior: Same generated Prisma 5.22 model delegates, existing mapping functions, and service/store methods remain. BaseRepository forwards the exact Prisma args/results.
- Representative direct-read or compatibility evidence: Consumer-schema probe successfully queried all three models via BaseRepository; multi-model rollback preserved empty state and DB hash.
- Required semantics and invariants preserved by direct use: `Yes` — same canonical URL, models, mappings, operations, and transaction engine; requirements explicitly preserve token/vault invariants and timeouts.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: No real secret data inspected; secret DB/key pair must remain intact; no WAL change; no logs may contain paths/URLs/secret bytes/raw causes.
- Concrete benefit, cost, and risk of migration if it remains a candidate: No concrete benefit; migration would add unnecessary I/O/corruption/secret risk. Therefore no migration.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable; schema and representation unchanged.

Transition decision: `Directly Usable — No Migration`.

## Constraints / Dependencies / Compatibility Facts

- Library prerequisite is published as `1.0.9`; local link/patch remains forbidden.
- Existing one-argument HOF behavior must remain source/runtime compatible; optional-argument extension is clean, not a wrapper.
- Nested transactions remain flattened; outer transaction options govern.
- Prisma/`@prisma/client` stays 5.22.
- Server initializes library with explicit canonical URL because AppConfig's internal value, not ambient environment, is the running application's authority.
- Importer uses its explicit typed URL and never AppConfig/ambient fallback.
- WAL remains disabled/not requested by this refactor.
- Secret initialization concurrency and exact timeout evidence remain required.
- Backend requirements were revalidated and approved after the prerequisite release; the design is implementation-ready for downstream handoff.

## Open Unknowns / Risks

- No unresolved backend architecture or package-prerequisite question remains.
- No open requirement, design, or prerequisite gate remains; implementation is the next stage.
- Global lifecycle test rebinding can reveal stale captured-client assumptions; forwarding proxies are designed to prevent that, and tests must cover it.
- The shared lifecycle makes the supported shutdown race with scheduled token appends reachable; the target must drain already-scheduled work before shutdown and must not reopen afterward.
- A future Prisma upgrade could affect SQLite transaction ownership; this task explicitly does not upgrade and must preserve current regression evidence.

## Notes For Implementation And Code Review

- Use the approved requirements and `Implementation Ready` design as the implementation authority.
- Do not replace `SecretManagementService`, token store/statistics provider, AppConfig, or migration ownership.
- Do not convert every direct Prisma use indiscriminately; the requested target is normal token/secret runtime persistence.
- Remove the `PrismaRepository`/`prisma-repository` implementation-provider suffix from all three secret repository class/file names; do not keep aliases.
- Treat deletion of token/secret custom clients, injected production seams, tx parameters, and obsolete imports as first-class work.
- Review package source and installed artifact, not only local workspace linking.
- Require exact source/structural scans plus behavioral/concurrency/data evidence before delivery.
