# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental Qwen UI/interaction spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md`
- Supplemental readable-ID transition spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/custom-provider-readable-id-migration-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Triggering source-review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`
- Code-review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-revision-record.md` (`CRR-011`)
- Triggering rework evidence: `CR-004` / `PREM-CPMIG-005` in `CRR-011`; `ARCH-REV-010` remains the current architecture pass for `SR-016`.

Earlier code-review, API/E2E, delivery, docs, integration, and build artifacts predate `SR-016` for the readable-identity scope. They are historical only and are not included as current proof.

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-revision-record.md`
- Current implementation revision ID: `IR-010`
- Related solution revision IDs: `SR-010`–`SR-012`, `SR-016`; `SR-013`–`SR-015` are superseded for the readable-identity transition.
- Related architecture-review revision IDs: `ARCH-REV-010`; `ARCH-REV-009` is superseded.
- Related code-review revision IDs: `CRR-011` (`Fail — Local Fix`); source re-review of `IR-010` is required.
- Related API/E2E revision IDs: `N/A` for the current `SR-016` source; fresh coverage investigation/execution is required after source review.
- Related delivery revision IDs: `N/A` for current approval; delivery retains tracked-base refresh/integration ownership.
- Triggering finding IDs: `CR-004`, `PREM-CPMIG-005`; `ARCH-DESIGN-006` remains obsolete upstream and `ARCH-DESIGN-007` remains resolved.

The current source preserves the reviewed `SR-010`–`SR-012` exact-custom/native-Qwen behavior and implements the `SR-016` readable identity replacement. New custom-provider IDs are deterministic derivatives of the canonical provider name and are committed under store-owned name/ID uniqueness. Current runtime/store parsing is strict V3 only.

For upgrades, the historical V1 migration stages secretless V2. The final readable migration checks five exact terminal prerequisites, reads legacy V2 names only inside the migration boundary, derives a transient old-ID/future-ID selector map, attempts only the approved JSON and application-SQLite selector fields, and publishes strict `{ "version": 3, "providers": [] }` last. It separately retains every trusted strict-V2 old provider ID for post-commit cleanup, so slug/built-in/non-derivable mapping failure still produces no selector map but does not skip best-effort old-key removal. It never resolves, copies, re-encrypts, or saves a legacy secret. Invalid/untrusted files still have no cleanup identity. The user recreates a desired provider through the unchanged add-custom-provider flow by re-entering name, Base URL, and key.

Unavailable selector strings remain authoritative persisted values. The application-agent launch editor now displays the raw unavailable value and blocks entry rather than clearing it. Same-name recreation plus the same advertised model suffix makes the migrated selector usable again; a different name or missing suffix requires explicit reselection. No runtime fallback or UUID alias exists.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | Preserve recognized advertised custom-model metadata and discovery resilience. | Core OpenAI-compatible discovery/provider and exact metadata resolver. | Positive advertised fields remain highest priority; URL/key validation, duplicate handling, timeouts, and last-known-good behavior remain intact. |
| `BEH-002` | Remove endpoint/region/plan/profile/alias policy; infer only by exact built-in `value`. | `autobyteus-ts/src/llm/metadata/` and `openai-compatible-endpoint-provider.ts`. | No URL/profile matching, aliases, references, `endpoint_profile`, fuzzy matching, or preview compatibility remains. |
| `BEH-003` | Preserve resolved metadata and truthful known/unknown provenance through runtime/catalog/budget/UI. | Core model types -> server metadata provisioning -> existing token budget/compaction/Token Meter paths. | Reduced `live | inferred_builtin | static_definition | unknown` provenance is preserved. Token history identity is not rewritten. |
| `BEH-004` | Save Qwen Base URL/key as one strict pair with bounded compensation and truthful errors. | Server `LlmProviderService` -> secret vault + `AppConfig.setDurably` -> GraphQL -> web Settings runtime/store. | Probe, prior command-scoped snapshot, key save, atomic durable URL commit, prior-key restore/new-key removal on pre-commit failure, sanitized previous-restored failure, and repair-required double-failure remain implemented. |
| `BEH-005` | Expose exact native Qwen offerings and remove preview behavior. | `autobyteus-ts/src/llm/qwen-supported-model-definitions.ts`. | Exact values include `qwen3.8-max`, `deepseek-v4-pro`, `deepseek-v4-flash-0731`, and `glm-5.2`; collisions use only `modelIdentifierOverride`. |
| `BEH-006` | Preserve key-only default use and expose Qwen-only setup status. | Qwen config/runtime, server status command/GraphQL, web store/form/reload lifecycle. | `{effectiveBaseUrl, endpointSource, apiKeyConfigured}` derives source from normalized setting presence. Successful mutation status is authoritative; later view refresh failure is a warning and Reload Models retries both required refreshes. |
| `BEH-007` | Use readable custom IDs; reset legacy providers/credentials while preserving exact active/default/resumable selector intent; retain unavailable selectors. | Core identity/V3 schema -> server store/create flow; V1/name-snapshot/readable migration adapters -> registry/startup gate; application launch editor. | Exact `provider_<name-derived-body>` identity, atomic store invariant, secretless V1, transient V2 mapping, allowlisted selector rewrites, empty V3 last, cleanup identities independent of mapping success, removal-only cleanup, ordinary retry semantics, and explicit unavailable-selector blocking are implemented. |

## Key Files Or Areas

### Readable identity and current runtime

- `autobyteus-ts/src/llm/custom-llm-provider-identity.ts`: canonical-name normalization and deterministic ASCII-safe readable ID codec.
- `autobyteus-ts/src/llm/custom-llm-provider-config.ts`: strict V3 schema, exact derived-ID invariant, and duplicate canonical-name/ID rejection.
- `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts`: store-lock-owned create uniqueness and V3 persistence.
- `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts`: existing probe/create/secret/reload spine using store-returned readable identity.

### Isolated legacy transition

- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-v1-app-data-migration.ts`: secretless V1 -> V2 stage and reconfiguration warning.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-v1-migration-file.ts`: durable stage publication including parent-directory fsync.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-migration-name-snapshot.ts`: migration-only strict missing/V2/V3 `{id,name}` reader.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-readable-id-prerequisite-guard.ts`: the exact five terminal prerequisites.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-readable-id-json-selector-migrator.ts`: exact JSON inventory and per-target atomic rewrite.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-readable-id-application-selector-migrator.ts`: one transaction per application SQLite database.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-readable-id-app-data-migration.ts`: independent strict-V2 selector-map and cleanup-ID projections, selector attempts, empty-V3 commit, and post-commit removal-only cleanup.
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`: readable migration registered as the final current required definition.
- `autobyteus-server-ts/src/server-runtime.ts`: thin post-`runPending` terminal gate.

### Missing-selector interaction

- `autobyteus-web/components/applications/setup/ApplicationAgentLaunchProfileEditor.vue`: raw unavailable selector retention and blocking readiness.
- `autobyteus-web/localization/messages/en/applications.ts` and `zh-CN/applications.ts`: explicit same-name recreation/reselection guidance.
- `autobyteus-web/components/applications/setup/__tests__/ApplicationAgentLaunchProfileEditor.spec.ts`: retain/block then recover-on-available regression.

### Retained exact-Qwen/exact-metadata implementation

- Core metadata resolver, Qwen provider config/runtime, supported definitions, server strict AppConfig/provider service/GraphQL, and web Qwen Settings/store/runtime paths remain the current `SR-010`–`SR-012` implementation.

## Important Assumptions

- The browser continues to submit only custom provider name, Base URL, and key; the backend derives the immutable ID.
- Canonical name or deterministic slug collisions reject rather than acquire random/hash/counter suffixes.
- A migrated selector is restored only by the same canonical provider name and the same exact advertised model suffix.
- Missing/unavailable selectors are valid stored strings but are not executable models; existing factory/activation failure remains authoritative with no fallback.
- V3 provider data is the only normal runtime/store schema. Historical V1/V2 knowledge is confined to app-data migration owners.
- `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` are terminal both for prerequisites and the readable startup gate.
- One native Qwen endpoint remains active per installation; existing Qwen keys and optional URL state need no migration.

## Known Risks

- The tracked branch is currently behind its recorded remote base. Per the reviewed package, delivery—not implementation—must perform the mandatory final tracked-base refresh/integration. No merge, push, archival, cleanup, or base refresh was performed in IR-009.
- Ordinary runner semantics can keep an interrupted recent `RUNNING` record non-retryable for approximately 15 minutes; immediate crash recovery is intentionally removed.
- A crash or cleanup failure after empty-V3 publication can leave an old secret orphan. It is unreachable from strict V3/runtime and there is no fallback lookup.
- Malformed, read-only, concurrently changed, unsafe, or otherwise unwritable selector targets are skipped with warnings and remain stale for manual reselection.
- Recreation succeeds only when the endpoint still advertises the exact suffix; removed offerings require manual reselection.
- Real Alibaba availability, credentials, quota, region policy, TLS behavior, and undocumented payload variation were not exercised. Vendor facts remain source-dated.
- Repository-wide Nuxt typecheck is already broadly baseline-blocked outside this change; production build and focused changed-path tests are green.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change / Refactor`
- Reviewed root-cause classification: `Boundary Or Ownership Issue`, `Missing Invariant`, `Duplicated Policy Or Coordination`, `Legacy Or Compatibility Pressure`
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: Name/ID policy is centralized in core and enforced by the store commit; legacy parsing is isolated to migrations; exact selector adapters serve one migration coordinator; existing provider creation remains the public recreation boundary. The rejected secret-transfer/recovery/reconnect coordination was deleted rather than generalized.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` in normal runtime. The approved historical migration ID and isolated V1/V2 migration readers are transition code, not a runtime compatibility path.
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, files, helpers, tests, flags, adapters, and dormant replaced paths removed in scope: `Yes` — SR-015 journal/state/backup/receipt/secret-migrator/startup-recovery/PID-recovery/runner-bypass code and crash-specific tests were removed.
- Shared structures remain tight: `Yes` — no credential-state record, generalized provider identity object, reconnect DTO, offering/route attributes, runtime alias, or transaction/recovery framework was added.
- Canonical shared design guidance was reapplied: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` — every changed implementation source is at or below 500 effective non-empty lines; the largest inspected changed source remains below the limit. The migration concerns were split into prerequisite, JSON, application-SQLite, name-snapshot, and coordinator owners rather than one oversized file.
- Notes: Current provider services/stores are V3-only. Migration-local readers/adapters are the sole historical-schema boundary.

## Persisted Data Transition Check

- Approved decisions:
  - Qwen key/optional URL: `Directly Usable — No Migration`.
  - Valid legacy provider records/Base URLs and credentials: `Discard or Rebuild` through empty V3 plus ordinary recreation.
  - Exact structured active/default/resumable selectors: `Migration Required` to readable prefixes.
  - Invalid/ambiguous legacy providers: `Discard or Rebuild` to empty V3 with no selector map.
  - Historical traces/token identities/accounting and model-free indexes: `Directly Usable — No Rewrite`.
- Design-spec decision reference: `design-spec.md` “Persisted Data / State Transition Decision” and `custom-provider-readable-id-migration-spec.md` “Persisted-Data Decisions”, “Exact Ordering Boundary”, and “Optimistic Execution And Startup Gate”.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Discard/rebuild result: V1 publishes secretless V2; readable migration publishes strict empty V3 only after all selector attempts; ordinary create recreates a provider/secret later.
- Migration implementation and focused checks: Exact five-prerequisite guard; strict missing/V2/V3 classification; exact mapping; JSON temp-write/fsync/rename; SQLite transaction per database; provider identity/current-byte check; empty-V3 temp-write/fsync/rename/directory-fsync; post-commit removal-only cleanup; retry/idempotency, malformed/read-only/concurrent-change, publication failure, cleanup warning, and startup gate tests.
- Deviation from reviewed transition decision: `None`

## Environment Or Dependency Notes

- No dependency was added.
- Core/server/web workspace dependencies were already installed.
- Server build regenerated the existing Prisma client as part of the supported build.
- Normal root `pnpm dev` was used only for the frontend implementation feedback loop; the server shut down cleanly afterward. The temporary preview page was deleted before final checks and is not product source.
- Delivery retains remote fetch/merge and final integrated-state ownership.

## Local Implementation Checks Run

These are implementation-scoped checks, not API/E2E sign-off.

- IR-010 focused readable-migration regression: `1 file / 10 tests` — passed. Collision coverage proves no selector map, empty V3 first, and removal attempts for both trusted old IDs; non-derivable-name coverage proves post-V3 removal is attempted and a genuine cleanup failure remains warning-only with no status/resolve/save call.
- IR-010 related migration/startup selection: `7 files / 37 tests` — passed (readable migration, prerequisite ordering, V1, name snapshot, token name snapshot, ordinary runner behavior, and startup gate).
- IR-010 server build TypeScript no-emit check: passed.
- Core production build: `pnpm --dir autobyteus-ts build` — passed.
- Core focused unit selection: `5 files / 37 tests` — passed (readable identity, exact metadata, supported definitions/Qwen catalog, endpoint provider, and discovery).
- Server focused unit selection: `14 files / 115 tests passed`, `1 intentionally skipped` — passed. Coverage included AppConfig, application database location, custom provider service/store, V1/readable/prerequisite/name-snapshot/token migrations, runner ordinary stale/recent behavior, startup gate, legacy secret-source non-authority, GraphQL provider, and metadata provisioning.
- Server build: `pnpm --dir autobyteus-server-ts build` — passed, including shared builds, Prisma generation, TypeScript build, assets, and sanitized built/bootstrap smoke.
- Server build TypeScript no-emit check — passed.
- Web focused unit selection: `7 files / 29 tests` — passed across Qwen Settings lifecycle and application setup, including the unavailable-selector regression. The corrected new test was re-run alone and passed `1 file / 1 test`.
- Web boundary guard, localization boundary guard, and localization literal audit — passed.
- Web production build: `pnpm --dir autobyteus-web build` — passed with `15` prerendered routes. Existing browserslist-age and chunk-size warnings remain non-blocking.
- Repository-wide Nuxt typecheck: retried with an 8 GiB Node heap and failed on a broad existing baseline across build scripts, unrelated components/stores/tests, missing generated/exported types, and dependency declarations. It initially also exposed an inferred `string[]` type in the new test fixture; that local issue was corrected with the contract type and the focused test re-passed. No production-build failure remains.
- Normal full development startup: root `pnpm dev` reached server/Nuxt readiness, ran app-data migrations, passed the new readable terminal gate, and shut down cleanly.
- Final source hygiene: `git diff --check` passed; untracked changed source/test whitespace check passed; no unmerged paths or conflict markers remain; no rejected SR-015 recovery/journal/receipt/secret-transfer source reference remains; temporary preview source is absent. The readable coordinator is `327` effective non-empty lines.

Expected non-failing local output included an unavailable local Ollama warning in core tests, stale browserslist data, and the documented Nuxt chunk-size warning.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Application agent launch-profile editor loading an exact saved selector absent from the current model catalog, then selecting an available model.
- Approved references: `BEH-007`, `REQ-015`, `AC-019`, the missing-selector lifecycle in `design-spec.md`, and `custom-provider-readable-id-migration-spec.md`.
- Existing design system/shared components reviewed: the existing runtime select, `SearchableGroupedSelect`, workspace selector, readiness output, amber warning treatment, spacing, typography, and adjacent application setup behavior.
- Project instructions/rendered surface: read `autobyteus-web/README.md`; used the normal root `pnpm dev` stack and the real `ApplicationAgentLaunchProfileEditor` on a temporary development-only preview route. The preview file was removed afterward.
- States/interactions inspected:
  - Saved missing selector `openai-compatible:provider_alibaba_cloud_token_plan:deepseek-v4-flash-0731` remained visible, emitted no clearing update, showed explicit amber guidance, and produced `Blocked` readiness.
  - Opened the actual grouped model selector and chose `OpenAI / gpt-5.4`; the warning disappeared and readiness became `Ready` with no blocking issue.
  - Desktop browser viewport reported no horizontal overflow (`scrollWidth === clientWidth === 947`).
  - A 390 px narrow-container simulation preserved truncation, wrapping, card hierarchy, workspace controls, and readable blocking guidance without visually clipped controls.
- Visual or interaction issues found and corrected: The pre-change editor silently cleared an unavailable selector. It now retains and blocks. The new long-selector fixture was explicitly typed after the broad typecheck exposed literal widening.
- Supporting evidence:
  - Missing/blocked desktop: `/Users/normy/.autobyteus/browser-artifacts/4988cf-1786273569218.png`
  - Available/ready desktop: `/Users/normy/.autobyteus/browser-artifacts/4988cf-1786273701342.png`
  - Missing/blocked narrow-container: `/Users/normy/.autobyteus/browser-artifacts/4988cf-1786273727415.png`
- Remaining unverified states / limitations: This is implementation self-validation, not independent browser/API/E2E sign-off. Team editor, bindings, resume, and same-name recreation need downstream executable validation against durable fixtures.

## Downstream Coverage Hints / Suggested Scenarios

- Treat all pre-SR-016 readable-identity coverage decisions as stale and perform a fresh coverage investigation before execution or durable test edits.
- Exercise a direct multi-version fixture with the exact five prerequisites, including token provider-name snapshot before empty-V3 reset and current selector-writer output surviving the final migration.
- Validate V1 inline-secret disposal and V2 old-secret non-resolution: no status/resolve/save/copy/re-encryption call, no readable secret, and removal attempts only after empty V3. Include slug collision, built-in-name conflict, and non-derivable-name cases to prove every trusted strict-V2 old ID is cleaned independently of selector-map success while invalid/untrusted files are not.
- Cover every exact JSON and application-SQLite selector shape with byte-identical suffix preservation; prove excluded traces/free text/token identifiers/history indexes are unchanged.
- Cover malformed, read-only, symlink/unsafe, concurrently changed, publication-failure, cleanup-failure, pre-V3 ordinary retry, post-V3 no-op, prerequisite failure, and recent/stale `RUNNING` behavior without any special runner bypass.
- Verify the unchanged frontend/API create flow: bad name/URL/key pair creates no provider/secret; valid same-name recreation creates the exact readable ID, reloads models, and restores migrated selectors when the suffix exists.
- Verify unavailable defaults, bindings, applications, agent/team resume metadata, and improver session selectors remain raw-visible and fail without fallback; different-name recreation or absent suffix requires manual reselection.
- Revalidate retained native-Qwen exact catalog/runtime/status/durability and Settings refresh recovery, especially exact `deepseek-v4-flash-0731` identity/wire value and the strict AppConfig/secret compensation boundary.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Fresh source review must pass first. Then `api_e2e_engineer` must create a new coverage investigation for the current SR-016 source, decide which prior durable coverage remains valid or is stale, execute the applicable API/E2E/broader checks, and record evidence and residual risk. If durable repository coverage is added, updated, or removed, the cumulative package must return through `code_reviewer` before delivery. Delivery must then perform the mandatory tracked-base refresh/integration and integrated-state validation before documentation/final handoff work.
