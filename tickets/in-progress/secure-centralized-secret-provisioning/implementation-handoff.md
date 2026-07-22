# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/use-case-spine-validation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/secret-storage-architecture.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/secret-storage-backend-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/credential-consumer-mapping.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/live-test-secret-provisioning.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/threat-model-and-option-analysis.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/design-review-report.md`
- Prior implementation-source review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/code-review-report.md`
- API/E2E coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/coverage-investigation.md`
- Failed execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-coverage-report.md`
- Prior proportional API/E2E test review: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/api-e2e-test-review-report.md`
- Prior delivery/docs/release context (historical; not implementation authority):
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/docs-sync-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/delivery-anthropic-auth-recheck.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/release-deployment-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/release-notes.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/handoff-summary.md`
- Preserved failure evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/18-browser-backend-runtime.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/23-restart-failure-source-diff.log`
- Preserved Round-2 restart/Docker evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/26-round2-durable-restart-rerun.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/31-round2-docker-build-up.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/execution-evidence/33-round2-docker-failure-source.log`

## What Changed

- Implemented the round-10 explicit Local legacy-environment importer. The root `secrets:local:import` PNPM command accepts only one required absolute source, one required `default|e2e` target, `--dry-run`, and `--overwrite`. It uses one strict literal assignment grammar for every filename, verifies non-symlink/private owner access plus opened-file identity, resolves one canonical host Store internally, produces value-free plans/results, requires the exact target-specific direct-TTY phrase for writes, and applies one selected-Store batch transaction with create/replace preconditions.
- Removed the automatic legacy credential updater, startup invocation, source rewriter/converter, parent-alias deletion, migration ledger, and its obsolete test. `AppConfig` now excludes the one immutable historical alias set before retaining values, ignores matching parent aliases, keeps startup read-only for the application `.env`, and preserves all non-target lines and original line endings during an explicit supported non-secret write. Existing v1 custom-provider JSON remains byte-identical and fails with value-free `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED`; no Store access, conversion, or fallback occurs.
- Extended only the Local setup implementation with absent/present pair inspection and a package-local exact batch. Dry-run never initializes an absent pair; confirmed execution may use the existing staged initializer; partial pairs fail closed; all CREATE/REPLACE record preconditions are validated within one `BEGIN IMMEDIATE` transaction; injected later-write failure rolls back earlier writes. The generic backend and `SecretManagementService` ports were not widened, the other Store is never opened, and hidden-input real-E2E provisioning remains supported.
- Retained the round-4 centralized-secret implementation: server-owned lifecycle/catalog/configuration boundaries, InMemory and encrypted Local SQLite custody, early backend bootstrap, pair-authenticated default/E2E Stores, explicit JIT provider construction, runtime-only credential authority, empty-base execution policy, rich value-free health/status, and unchanged Docker topology.
- Restored AutoByteus remote LLM/audio/image discovery and invocation through one managed definition, `provider.autobyteus.api-key`, without restoring an ambient `AUTOBYTEUS_API_KEY` read.
- Added exact discovery consumers for `modelDiscovery/{llm|audio|image}/AUTOBYTEUS/apiKey`, server-owned JIT resolution, a narrow `SecretValue`-carrying discovery-authentication shape, storage-neutral core discovery ports, runtime-scoped authoritative synchronization, zero-lookup clear for absent hosts or explicit credential removal, and last-known-good retention on transient pre-authoritative failure. Raw reveal now occurs only in each core `AutobyteusClient` construction expression.
- Tightened model construction routing. `LLMConstructionTarget` and the multimedia equivalent contain exactly `credentialProviderId` and `authenticationRequirement`. Native registrations materialize their known credential owner once; discovered AutoByteus-runtime registrations explicitly materialize `credentialProviderId=AUTOBYTEUS`. Generic LLM/media provisioning constructs its consumer only from that field and the tagged requirement-owned slot.
- Preserved downstream provider identity for discovered models, native/remote same-provider coexistence, runtime/model-kind-scoped replacement, startup/list/full/provider reload paths, and LLM/audio/image discovery/invocation hooks.
- Made the existing AutoByteus Settings provider row fully managed: write-only save/replace/status plus idempotent remove. After successful credential storage, replacement advances every discovery generation and invalidates completed-host/cache state before the established full refresh, without retaining or comparing raw secret material. Removal likewise advances generations, invalidates configuration-bound in-flight reuse, and serializes/fences registry publication before clearing all AutoByteus-runtime LLM/audio/image subsets without resolving the removed definition. The web schema binding, generated GraphQL types, Pinia state, runtime notifications, localized controls, pending-state bindings/action guards, and component tests were updated.
- Retained `AUTOBYTEUS_API_KEY` only in the immutable historical exclusion/import map. Current production reads remain absent; the unchanged core header name is a wire-protocol constant, not an environment lookup. No scrub/reprovision migration remains.
- Completed retained source-review fixes: Claude CLI maps the actual node-local OS home (or a validated existing override) into its empty-base child; stdio MCP composes sanitized operational variables plus exact configured additions; absent custom-provider deletion succeeds idempotently while built-in deletion is still rejected.
- Completed the bounded source-review fixes: discovery authentication stays wrapped through the server coordinator and core ports; stale discovery cannot publish after credential removal, credential replacement, or host replacement; and generic provider removal disables and rejects overlapping input/reveal/save/remove actions.
- Corrected CR-009 at the configuration owner boundary. `AppConfig` validates and explicitly returns the selected non-secret SQLite `DATABASE_URL`; every Prisma migration child receives only that explicit configured URL in addition to its operational process environment, and every in-process Prisma client is constructed through one datasource-override factory. A persisted approved URL is parsed privately; a missing URL is derived deterministically into runtime state without rewriting `.env`. No broad dotenv injection, provider-secret alias, or process-wide credential path was restored.
- Preserved the API/E2E-owned built-server two-process regression and evidence from CR-009. Its prior first-start persistence assertion is now stale under round-10 byte-identical startup authority and is called out for downstream reconciliation; implementation did not rewrite the downstream-owned test or evidence.
- Corrected CR-010 without weakening CR-009. Token-usage and app-data-migration repository/database owners no longer acquire configuration or construct Prisma clients during module evaluation or default-argument evaluation. Each owner accepts an injected client or lazily acquires the configured datasource client on its first database operation; owned clients that were never acquired are not created merely for disconnect.
- Made the production build smoke itself a sanitized regression. `build:full` now runs the unchanged built-in-agent bootstrap behavior in an exact child containing only operational host variables and no `DATABASE_URL`. A focused mocked-factory test also proves imports and owner construction perform zero Prisma acquisition, while each first database operation performs exactly one lazy acquisition. No Docker/Compose/launcher file, dummy build URL, ambient Prisma fallback, dotenv injection, or provider alias was added.
- Corrected CR-011 by restoring one bounded process-lifetime Prisma owner for default token-usage repositories. The owner is constructed safely at module import but creates its explicit configured client only on the first database operation; every request-scoped default repository/store then reuses that same client. Caller-injected repository clients remain isolated from the default owner, and migration-owned lazy clients retain deterministic disconnect without disconnecting injected clients.
- Corrected Claude scope wording: both `cli` and `managed-secret` use an empty-base child environment and never fall back. Only `managed-secret` receives the exact child key and enforces `tools: []`, empty setting sources, and strict explicit AutoByteus in-process MCP. CLI uses the existing external account state and normal CLI tools/settings/MCP behavior while performing zero secret-management lookup.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | Write-only Settings lifecycle through one server owner | `secret-management/services/secret-management-service.ts`; `llm-provider-service.ts`; GraphQL; web provider editor/store | Save/remove/status remains value-free. Custom delete is now idempotent; built-in delete remains rejected. AutoByteus credential removal is idempotent and triggers authoritative scoped clear. The generic editor propagates removal state and rejects conflicting save or duplicate-remove actions. |
| `BEH-002` | Empty-base children, authorized roots, `LOCAL_HARDENED` only | `agent-child-environment.ts`; process/PTY/MCP/application launchers; workspace authorization | Named launch paths remain sanitized. Stdio MCP now uses the environment owner's additions boundary, preserving configured entries without broad parent inheritance. No same-user-isolation claim. |
| `BEH-003` | Explicit JIT LLM/search/media/metadata authentication | server provisioning services; exact construction targets; core factories/clients | Generic LLM/media consumers use only `target.credentialProviderId` and the tagged requirement slot. AutoByteus discovery carries `SecretValue` through an exact authentication shape and reveals only at core client construction. No displayed provider/runtime/host/model fallback exists. |
| `BEH-004` | Tracked non-secret real-test selection and direct target provisioning | `test-config/live-e2e.json`; hidden-input real-E2E Store CLI; explicit Local importer; live-test supplement | Target-only hidden-input setup remains implemented. The separate importer can target only the canonical host E2E Store from an explicitly selected source and never reads/copies the default Store. AutoByteus real scenarios remain API/E2E-owned. |
| `BEH-005` | Five-state health plus healthy-only definition status | secret domain/backend/service status; GraphQL; web stores/components; built restart regression | Existing `READY/LOCKED/UNAVAILABLE/CORRUPT/INCOMPATIBLE` and `MISSING/CONFIGURED` behavior is preserved. The same-data-dir second process reopens `CONFIGURED` and removes it without value readback. |
| `BEH-006` | Deployment-neutral early bootstrap below `serverDataDir` | `app-config.ts`; `prisma-client-factory.ts`; lazy Prisma repositories/databases; shared token-usage Prisma owner; `startup/migrations.ts`; sanitized built bootstrap smoke; direct/Electron server entrypoints | Approved persisted SQLite configuration is parsed privately; otherwise the same deterministic data-root URL is held in runtime state without rewriting `.env`. Built modules/bootstrap import with no `DATABASE_URL`; request-scoped token-usage stores reuse one lazy process-lifetime client; migration-owned clients disconnect deterministically. Docker/launcher topology remains unchanged. |
| `BEH-007` | First delivery only Local/InMemory; future registration contract | backend/configuration ports and tagged capabilities | Preserved; no enterprise adapter, shared writable SQLite, strong-isolation container, or Kubernetes production manifest was invented. |
| `BEH-008` | Legacy sources stay untouched and non-authoritative | `app.ts`; `config/app-config.ts`; `provisioning/legacy-secret-alias-map.ts`; `custom-llm-provider-store.ts` | The automatic updater and ledger are removed. Startup retains no mapped alias value, does not mutate application `.env` or parent aliases, performs no legacy-source Store/importer operation, and has no fallback. V1 custom-provider data remains unchanged and returns stable reconfiguration guidance. |
| `BEH-009` | Preserve factory config composition while separating authentication | `llm-construction-context.ts`; `llm-factory.ts`; concrete LLMs | Preserved. The target shape is now the exact round-6 shape. |
| `BEH-010` | Separate pair-authenticated default/E2E Stores | Local initializer/provisioning/reset/crypto/schema/repository | Preserved with read-only real-E2E runtime and no source/default Store access. |
| `BEH-011` | Typed neutral configuration and extension contract | storage configuration/backend ports; GraphQL capability projection | Preserved with only approved first-delivery implementations. |
| `BEH-012` | Exact Claude `cli` / `managed-secret` modes | Claude authentication service, launch policy, SDK client, diagnostics | CLI uses actual external account home, empty-base environment, and zero secret lookup. Managed mode alone gets exact-child `ANTHROPIC_API_KEY`, empty settings, `tools: []`, strict explicit MCP, and early redaction. Both modes are fallback-free. |
| `BEH-013` | Preserve AutoByteus gateway Settings, discovery, reload, and LLM/audio/image invocation | `autobyteus-remote-model-discovery-service.ts`; `model-catalog-service.ts`; provider lifecycle service; secret catalog; core AutoByteus providers/factories; provisioning services; Settings GraphQL/web | Implemented one definition, exact discovery/construction identities, required credential ownership, wrapped discovery authentication, generation/configuration-aware in-flight reuse, explicit secret-agnostic post-replacement invalidation, serialized stale-publication fencing, per-kind runtime sync, last-known-good behavior, historical alias non-authority, and zero-lookup authoritative clears. The deterministic two-key race resolves both generations but only publishes/caches the post-replacement generation. Real remote execution remains a downstream API/E2E obligation. |
| `BEH-014` | Explicit source-to-one-Local-Store operator transition | `secret-management/provisioning/*`; `cli/import-local-environment-secrets.ts`; Local initializer/backend/repository setup extensions; root `package.json` | Required absolute source and closed target only; strict grammar/trust checks; immutable shared alias map; sorted value-free plan/result; dry-run/no-overwrite defaults; explicit overwrite and exact TTY phrases; absent-pair setup; partial-pair fail-closed behavior; transactional plan preconditions/rollback; source immutability; other-Store non-access. No startup/runtime/UI/API/MCP/test-runner entrypoint exists. |

## Key Files Or Areas

- `autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.ts`
- `autobyteus-server-ts/src/llm-management/{providers,services,llm-providers}/`
- `autobyteus-server-ts/src/multimedia-management/`
- `autobyteus-server-ts/src/agent-tools/media/media-client-provisioning-service.ts`
- `autobyteus-server-ts/src/secret-management/{catalog,domain,provisioning}/`
- `autobyteus-server-ts/src/secret-management/backends/local/{local-secret-store-initializer,local-secret-store-provisioning-service,local-encrypted-secret-repository}.ts`
- `autobyteus-server-ts/src/secret-management/cli/{import-local-environment-secrets,provision-real-e2e-store}.ts`
- `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts`
- `autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-launch-policy.ts`
- `autobyteus-server-ts/src/config/{app-config,prisma-client-factory}.ts`
- `autobyteus-server-ts/src/startup/migrations.ts`
- `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts`
- `autobyteus-server-ts/src/app-data-migrations/{repositories,migrations}/`
- `autobyteus-server-ts/scripts/run-sanitized-built-in-agents-bootstrap-smoke.mjs`
- `autobyteus-server-ts/tests/unit/config/prisma-import-lifecycle.test.ts`
- `autobyteus-server-ts/tests/e2e/secret-management/server-restart-secret-lifecycle.e2e.test.ts`
- `autobyteus-server-ts/tests/unit/secret-management/{local-environment-source-reader,local-legacy-environment-import-service,import-local-environment-secrets-cli,legacy-source-non-authority}.test.ts`
- `autobyteus-ts/src/llm/{llm-construction-context,llm-factory,models,autobyteus-provider}.ts`
- `autobyteus-ts/src/clients/autobyteus-discovery-authentication.ts`
- `autobyteus-ts/src/multimedia/`
- `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts`
- `autobyteus-web/components/settings/`
- `autobyteus-web/stores/llmProviderConfig.ts`
- `autobyteus-web/graphql/mutations/llm_provider_mutations.ts`
- `autobyteus-web/generated/graphql.ts`

## Important Assumptions

- First delivery runs on the repository's Node 22/Electron runtime where `node:sqlite` is available; the build emits Node's current experimental SQLite warning but succeeds.
- Local Store protection is explicitly `LOCAL_HARDENED`; server and agent workloads can still share one host identity.
- `AUTOBYTEUS_LLM_SERVER_HOSTS` is non-secret endpoint configuration. A configured host requires managed gateway custody; no host means an authoritative zero-lookup clear.
- A successful provider response containing an empty model array is authoritative; transport/invalid-response/no-authoritative-host failure is transient and preserves the prior remote subset.
- The generic `dataDir`/PVC design remains the single-Pod hook; the repository still has no production Kubernetes manifest in scope.

## Known Risks

- `LOCAL_HARDENED` does not prevent arbitrary same-user filesystem/process inspection; `STRONG_AGENT_ISOLATION` remains deferred.
- JavaScript/SDK memory cannot be reliably zeroized. Managed Claude intentionally entrusts one exact SDK child with one Anthropic key.
- The sanitized built-module/bootstrap smoke and production build pass. Clean source-image build, container start, same-volume persistence/restart/removal, cross-platform ACL/owner behavior, busy contention, and single-Pod/PVC restart/reopen still need downstream rerun/evidence.
- Architecture round 10 supersedes the prior first-start `.env` persistence expectation: startup must leave the application `.env` byte-identical and derives a missing deterministic SQLite URL into runtime state. The preserved downstream-owned restart test still asserts a newly persisted `DATABASE_URL` line and must be reconciled by API/E2E against the reviewed round-10 behavior before execution; implementation did not overwrite that test.
- The server full test-tree TypeScript command remains structurally non-green because `tsconfig.json` includes `tests` while fixing `rootDir` to `src`, producing TS6059 across the test tree. Production `tsconfig.build.json` compilation and focused runtime tests are green.
- The broad core unit suite remains 1,718/1,719 because the pre-existing `event-types.test.ts` expects 28 enum values while the reviewed base contains 29. This ticket does not change that source or test.
- The full Nuxt repository typecheck remains non-green from broad pre-existing unrelated errors; production build, Electron transpilation, focused tests, and guards are green.
- Rich configured/removal UI state was mounted and interacted with in focused component tests, but no live provider backend was connected for a full-page configured-state render.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` remains a maintained delivery/release dependency, not legal clearance. Authentication modes must not be silently changed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement` plus bounded source-review/API-E2E-origin fixes and the round-10 explicit-import revision.
- Reviewed root-cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, and `Legacy Or Compatibility Pressure`; AR-009 resolved the legacy transition explicitly in favor of operator ownership and no automatic updater. CR-009 is a `Local Implementation Defect`: the AppConfig owner must explicitly deliver operational SQLite state to Prisma consumers. CR-010/CR-011 preserve import-safe and bounded lazy Prisma ownership.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` for the in-scope gateway/custody boundary; enterprise adapters and strong isolation remain deferred.
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `Yes`; CR-001 and AR-009 returned through solution design and architecture review before implementation resumed.
- Evidence / notes: the server discovery owner resolves exact semantic identities and calls storage-neutral core discovery; factories own model registration; generic provisioning owns construction consumers. AppConfig remains the non-secret configuration owner and supplies one validated SQLite URL to Prisma boundaries without startup source mutation. The importer owns explicit source/target policy and delegates only a selected-Local-Store batch. Sanitized imports/bootstrap do not acquire database configuration. The token-usage repository module owns one import-safe lazy default client; injected and app-data-migration-owned clients preserve distinct lifecycle semantics.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: one explicitly invoked, closed Local operator importer; it is not a runtime fallback or automatic compatibility path.
- Legacy old-behavior retained in scope: `No`; legacy files remain physically untouched but are non-authoritative.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`; the automatic cutover updater, startup call, rewriter/converter, parent-alias deletion, ledger, and obsolete test are removed.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: the target contains no displayed provider/runtime or duplicate credential slot. `AUTOBYTEUS_API_KEY` exists only as a wire-header constant and historical exclusion/import alias; no normal runtime environment read or optional fallback was added.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Directly Usable — No Migration` for approved non-secret application settings; `Discard or Rebuild` for legacy credential authority and custom-provider v1. The optional explicit importer is operator-invoked provisioning, not an automatic migration.
- Design-spec decision reference: `design-spec.md` -> “Persisted Data / State Transition Decision”.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`.
- Direct-use evidence or discard/rebuild result, when applicable: approved non-secret settings, including AutoByteus hosts, remain readable; mapped credential aliases and parent aliases remain unchanged but unread; custom-provider v1 remains byte-identical and returns reconfiguration guidance.
- Migration implementation and focused checks, only when `Migration Required`: `N/A`; no automatic credential migration owner remains. The explicit importer has separate focused synthetic coverage.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning`
- Branch: `codex/secure-centralized-secret-provisioning`
- Reviewed base: `534210b9e1dffff6c22855ae89ddb3d2afef5a9b`
- Round-6 rework starting implementation HEAD: `240d722070864e0ed960f552cdafc03d05d0ffeb`
- CR-009 rework starting implementation HEAD: `69d5442c0f8eb7c293097d939f79c272d0c56fad`
- CR-010 rework starting implementation HEAD: `3068d0fad00a6adba302199c857b01d2ede7ebc5`
- CR-011 rework starting implementation HEAD: `71e922a1396819e2a5bbc40877b1a810597449ab`
- Round-10 explicit-import/no-automatic-update rework starting HEAD: `09343ae17e016fa68cceda304df257563fc07cdc`
- Recorded base/finalization branch: `origin/personal`
- Local toolchain: Node `v22.23.1`, pnpm `10.28.2`.
- Existing Docker Compose, launcher, ports, and volumes were not changed.
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` must be carried through code review, API/E2E, and delivery. Before release, delivery must recheck the four official Anthropic sources recorded in the solution package. This is not legal clearance. If later authoritative guidance unambiguously forbids the exact self-hosted path, return the behavior decision through solution design rather than silently changing modes.

## Local Implementation Checks Run

- `pnpm --filter autobyteus-server-ts exec vitest run tests/unit/config/app-config.test.ts tests/unit/secret-management/legacy-source-non-authority.test.ts tests/unit/secret-management/local-environment-source-reader.test.ts tests/unit/secret-management/local-legacy-environment-import-service.test.ts tests/unit/secret-management/import-local-environment-secrets-cli.test.ts tests/unit/secret-management/local-secret-storage-backend.test.ts` — passed 6 files / 71 tests. Coverage includes exact alias exclusion even with a caller default, byte-identical startup source, source-preserving CRLF non-secret update, v1 custom-provider non-mutation/guidance, arbitrary filenames, strict parsing including line-continuation rejection, POSIX/Windows trust paths, deterministic TOCTOU rejection, buffer release, absolute/closed CLI options, OS-account canonical targets unaffected by `HOME`, dry-run, absent/partial pairs, exact TTY phrases, skip/replace, selected-Store isolation, changed-plan rejection, and injected atomic rollback.
- `pnpm --filter autobyteus-server-ts exec vitest run tests/unit/secret-management/local-secret-storage-backend.test.ts tests/unit/secret-management/secret-catalog-autobyteus.test.ts tests/unit/llm-management/llm-providers/llm-provider-service.test.ts tests/unit/api/graphql/types/llm-provider.test.ts tests/unit/api/graphql/types/server-settings.test.ts tests/unit/services/server-settings-service.test.ts tests/unit/config/prisma-import-lifecycle.test.ts tests/unit/startup/migrations-prisma-engine-env.test.ts` — passed 8 files / 102 tests, preserving Local pair/health/restart behavior, provider lifecycle, Settings, import-safe Prisma ownership, and explicit migration-child database delivery.
- `pnpm --filter autobyteus-server-ts build` — final rerun passed after source/handoff reconciliation, including shared/core builds, Prisma generation, production TypeScript compilation, copied assets, built-in agent bootstrap, and the sanitized no-`DATABASE_URL` built-module smoke.
- Sanitized built importer invocation with no arguments — exited nonzero with stable `LOCAL_SECRET_IMPORT_FAILED IMPORT_OPTIONS_INVALID` before any source/target access. Node also emits its existing value-free experimental SQLite warning.
- `pnpm --filter autobyteus-server-ts typecheck` — not green for the repository-structural baseline: `tsconfig.json` includes `tests` while `rootDir` is `src`, producing TS6059 across test files. No focused implementation error appeared before that structural failure; production build is the authoritative source compilation check.
- `git diff --check` — passed for the working tree. Focused scans found no automatic cutover owner/call/ledger, no production `process.env` read for the historical provider aliases, and no Docker or ordinary Prisma app-data-migration source change.
- No API/E2E, browser, live-provider, Docker, canonical-host Store, real credential file, or secret-bearing source was executed or inspected during this implementation rework. Tests use synthetic values and temporary Stores only. Downstream-owned tests/reports/evidence were preserved.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: Settings -> API Key Management -> configured built-in provider save/replace/remove.
- Approved UI/UX, interaction, requirement, or design references: `requirements.md`, `design-spec.md`, `credential-consumer-mapping.md`, and the existing Settings component system.
- Existing design system, shared components, and adjacent product surfaces reviewed: existing provider editor controls, destructive-action styling, configured/missing status, loading/disabled behavior, and notification patterns.
- Project development / preview instructions and rendered surface used: production Nuxt build plus mounted Vue component/runtime surfaces under the repository's Nuxt test harness; prior full Settings browser-equivalent render remains applicable to the unchanged surrounding layout.
- States, layouts, viewports, and interactions inspected: configured and missing editor states, configured-only remove control, removal click emission, disabled/saving/removing state bindings, parent-to-editor pending propagation, blocked input/reveal/save/duplicate-remove actions during removal, runtime refresh, and success notification.
- Visual or interaction issues found and corrected: added a configured-only destructive control using the existing spacing, border, focus, disabled, and localization conventions; added explicit removing state so save/remove cannot overlap.
- Supporting evidence and remaining unverified states or limitations: mounted component interaction passed. A full-page configured provider state was not connected to a live backend during this bounded rework, so end-to-end focus/keyboard behavior and all degraded backend states remain downstream coverage work. This is implementation self-validation, not API/E2E sign-off.

## Downstream Coverage Hints / Suggested Scenarios

- Treat the importer as an operator-only executable scenario, not a startup/test-runner fixture. Using only synthetic temporary sources and non-canonical target fixtures where applicable, cover arbitrary filenames, strict source trust/parser rejection, value-free dry-run, absent-pair creation, no-overwrite idempotency, explicit replacement, both exact TTY phrases, injected transactional failure, source immutability, other-Store non-access, and stdout/stderr leak scanning. A real operator run may use the canonical target only without reading values.
- Prove legacy startup leaves application `.env`, parent aliases, `.env.test`, and custom-provider v1 unchanged; mapped aliases never enter AppConfig/runtime authority; approved non-secret settings remain usable; v1 returns only `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED`; no automatic Store/importer/ledger activity occurs.
- Prove Settings save/replace/status/remove for `provider.autobyteus.api-key`, including repeated remove, zero value readback, secret-agnostic generation invalidation before post-replacement full refresh, provider-scoped LLM refresh, full LLM/audio/image refresh, and authoritative all-kind clear without lookup after removal.
- With no AutoByteus hosts, prove zero secret lookup and per-kind remote-subset clear. With configured hosts, prove only the exact model-kind discovery identity resolves, and failure output remains value-free.
- Discover remote models whose displayed providers are OpenAI/Gemini, then assert `credentialProviderId=AUTOBYTEUS`, native same-provider coexistence, runtime/model-kind scoped replacement, transient last-known-good retention, and authoritative empty-response clear.
- Run Store-backed real AutoByteus discovery plus representative LLM invocation, speech generation, and image generation. Migrate remaining old live integration files away from environment gates and removed no-argument discovery calls without adding fallback.
- Re-run Claude `cli` and `managed-secret` separately: CLI maps existing account state and performs zero lookup with normal CLI tools/settings/MCP; managed alone receives the exact child key plus empty settings, `tools: []`, and strict explicit MCP. Both remain empty-base and fallback-free.
- Validate stdio MCP configured additions alongside required operational variables while unrelated parent/provider/Store variables remain absent.
- Reconcile and rerun `SCSP-E2E-RESTART-001` against round-10 authority. Confirm startup leaves `.env` byte-identical, the second sanitized process receives no parent `DATABASE_URL`, both processes deterministically select the same data-root SQLite URL through AppConfig-owned runtime delivery, listen succeeds, status reopens value-free as `CONFIGURED`, and removal succeeds.
- Rerun `SCSP-E2E-DOCKER-001` from a clean source-image build. Confirm the sanitized built bootstrap passes before image creation, the container starts, Store state is saved value-free, and the same named volume reopens/removes it after restart without adding any Docker-time database URL.
- Exercise unchanged Docker create/save/restart/reopen and a realistic single server Pod/PVC equivalent. Validate Local ACL/owner modes, read-only reopen/checkpoint, bounded contention, staged pair recovery, swapped empty-Store key, and every five-state degraded path.
- Scan logs, GraphQL, diagnostics, events, generated files, child environments, and artifacts with synthetic raw/encoded markers.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Implementation-scoped builds and focused synthetic/unit checks are complete. API/E2E-owned durable changes, reports, and evidence were preserved rather than reset. After source review passes, `api_e2e_engineer` must reconcile the stale persisted-URL assertion with round-10 byte-identical startup authority, add/execute proportionate importer and legacy non-authority coverage, rerun the clean source-image/container/same-volume path and applicable matrix, and refresh confidence/evidence. The dedicated real-E2E Store availability and real-provider outcomes remain downstream facts; no real execution is claimed here.
