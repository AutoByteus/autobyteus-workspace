# Threat Model And Option Analysis — One-Database Local Vault

## Artifact Metadata

| Field | Value |
|---|---|
| Status | `Design-ready for architecture review — custom-provider-v1 migration/delete-and-reconfigure controls included` |
| Purpose | Define assets, trust boundaries, custom-provider transition controls, assurance claims, and rejected architecture options |
| Related requirements | `REQ-001`–`REQ-018` |
| Related acceptance criteria | `AC-002`–`AC-015` |
| Approval applicability | `N/A` for additional user behavior; captures reasoning for the current user-review basis |

## Executive Decision

Use the existing application SQLite database selected by `DATABASE_URL`, add two encrypted-secret tables through normal Prisma migrations, and keep one random 32-byte root key in a database-adjacent owner-only sidecar.

This improves local credential custody against database-only disclosure, accidental logging/config propagation, and prompt-influenced child access. It does **not** protect against a fully compromised same-user server process that can read both DB and key. The honest claim is `LOCAL_HARDENED`; `STRONG_AGENT_ISOLATION` remains deferred.

## Assets

1. provider/integration credential plaintext;
2. external root-key bytes;
3. encrypted entries, verifier, domain ID, nonces, and tags;
4. application database integrity and availability;
5. provider/model catalog availability;
6. non-secret Gemini selected mode/project/location;
7. explicit import source bytes;
8. custom-provider metadata;
9. child-process environment and filesystem boundaries;
10. logs, errors, reports, screenshots, and test evidence;
11. production/default and test runtime identity separation;
12. fixed custom-provider-v1 source bytes until successful migration or explicit failed-migration deletion.

## Trust Boundaries

| Boundary | Trusted side | Untrusted/less-trusted side | Control |
|---|---|---|---|
| UI/GraphQL -> server | API-key read/provider command owners | browser/network input | typed minimal screen shape, exact provider identity, no generic secret read/status-message/operation-outcome protocol, value-free result |
| Secret service -> DB | repository transaction | durable file/corruption | AEAD, domain/AAD binding, state verification |
| Secret service -> root-key file | bootstrap/crypto owner | filesystem race/unsafe path | lstat, ownership/mode, no symlink, exclusive create |
| Custom-provider-v1 migration -> fixed app-data file/DB | migration owner through `SecretManagementService` | historical plaintext, file/DB split, interruption, collision | fixed path, lock, complete validation, create-only batch, staged atomic publish, exact compensation, failed-migration deletion |
| Server adapter -> core provider | subject-scoped resolver | provider code | narrow port, exact provider/slot authorization |
| Provider -> SDK | exact trusted constructor/request boundary | provider library/network | reveal only here, short lifetime, no logging |
| Server -> governed child | launcher policy | agent/tool/application child | empty-base allowlist, denied roots, exact env |
| Server -> Claude/Codex external runtimes | runtime-specific owner | external process/account state | explicit approved exception; no broad claim |
| Importer -> source | trusted reader | arbitrary selected assignment file | absolute path, regular-file/owner/mode/size/UTF-8/NUL checks |
| Importer CLI -> application DB | explicit target owner | parent/app/test/source configuration and unintended DBs | required absolute SQLite `--database-url`, shared canonicalizer, no fallback, target identity preview + TTY confirmation |
| Backend-E2E bootstrap -> tracked `.env.test` | fixed-schema test owner | repository text input | exact path, allowlisted non-secret names, canonical server-root-relative DB, byte-identity check |
| Backend-E2E bootstrap -> runtime `.env` / actual server | isolated test root owner | writable runtime/settings and server process | fixed-key materialization/reconciliation, preserve mutable settings, `--data-dir`, no application settings in ambient child env |
| Test runner -> local machine | isolated test root | production/default data | fresh-versus-persistent root policy, path fence, unique identity, cleanup guard |
| Electron renderer -> main/server | safe IPC/status | renderer | no raw process/value/path authority beyond approved log detail |

## Threat Actors

### T1 — Accidental application/log behavior

Risk: request/config/error objects serialize values, environment aliases, database/key paths, or crypto material.

Controls:

- credential values are not normal configuration fields;
- provider-specific inputs are write-only;
- stable error codes replace raw causes across public/evidence boundaries;
- query logging stays default-off;
- canary scanners cover logs, GraphQL, reports, snapshots, and packaged technical details.

### T2 — Prompt-injected or probing agent/tool

Risk: child processes read ambient credentials, the root key, DB, WAL/journal, or secret-bearing source.

Controls:

- governed children use empty-base/allowlisted environments;
- credential aliases, `DATABASE_URL`, key path/bytes, and source path are omitted;
- file roots explicitly deny DB/key/WAL/SHM/journal paths;
- secrets are not placed in tool/MCP config except exact approved managed-child delivery;
- assurance remains local hardening, not a sandbox claim.

### T3 — Network client

Risk: generic APIs enumerate/read raw secrets or misuse arbitrary `SecretId`.

Controls:

- no raw-secret query/mutation exists;
- GraphQL exposes provider-specific save/remove/status only;
- the one-call Settings read exposes each provider identity/configured/write decision exactly once and capability catalogs never carry credential status;
- provider configured/write facts and catalog membership retain separate owners, and the Settings composition joins them only by exact known provider ID; credential state never gates or supplies catalog membership;
- provider Save/Remove returns only Boolean command completion and canonical state is refetched; custom operations omit constant type/runtime and input echoes; all Gemini commands return the one setup-state query shape;
- core/provider inputs use provider/slot, and server authorization maps to exact IDs.

### T4 — Database-only disclosure or tampering

Risk: copied DB reveals plaintext, ciphertext is moved between entries/domains, or rows/verifier are modified.

Controls:

- root key is outside DB;
- AES-256-GCM with fresh nonce/tag;
- per-entry HKDF and AAD bind format/domain/SecretId;
- verifier authenticates DB/key pairing;
- wrong/tampered/incompatible state fails closed.

### T5 — Same-user local compromise

Risk: attacker reads both DB and adjacent key or invokes the server’s trusted boundary.

Controls/limit:

- owner-only/private paths, minimized exposure, no ambient propagation;
- this design cannot prevent a fully compromised same-user process from reading both artifacts;
- stronger OS identities, hardware/keychain custody, containers, or remote KMS are future work.

### T6 — Import misuse

Risk: wrong source/target, shell evaluation, unrecognized names blocking useful data, partial write, overwrite, value output, or source mutation.

Controls:

- exact absolute source; no search/inference;
- exactly one required absolute SQLite `--database-url`; no profile/test wrapper or implicit target;
- shared `ApplicationDatabaseLocation` canonicalization; missing/duplicate/relative/non-SQLite/malformed URL fails before target access;
- AppConfig, `.env`, `.env.test`, parent variables, current working directory, and source-file `DATABASE_URL` have no target authority;
- parse in process; no shell evaluation and no credential values in argv/environment (the local SQLite URL is non-secret target identity);
- positive recognition only; empty recognized absent; unrecognized ignored;
- selected-value syntax/conflict checks;
- database URL is non-secret local file target configuration; no network DB credential URL or root-key path argument is accepted;
- one secret-management-owned `SecretVaultInspectionService` that opens only existing targets read-only/query-only, verifies a complete pair without mutation, classifies absent/pre-feature/ready/closed states, and returns only target/ID/status/action/count data;
- dry-run creates or modifies no DB, table, metadata, root key, permission, setting, or journal;
- TTY confirmation, no-overwrite default, execution-only migration/bootstrap, and transactional status recheck before the atomic batch;
- source remains immutable; preview and execution output are value-free; closed targets are `BLOCKED` and never confirmable;
- JavaScript zeroization limits are stated honestly.

### T7 — Test/package cross-contamination

Risk: tests or packaged candidate mutate production data, reuse production ports/identity, or cleanup the wrong root.

Controls:

- tracked non-secret test DB config points inside ignored test root;
- path/identity fence before migration/write/cleanup;
- real provisioned test DB preserved by default;
- synthetic browser/packaged smoke uses unique disposable DB/root/ports;
- full packaged lifecycle is executed, not inferred from build/spawn probes.

### T8 — Dependency side effects

Risk: `repository_prisma` import loads dotenv, creates Prisma, or logs SQL/parameter data by default.

Controls:

- exact unpatched 1.0.8 only;
- isolated empty-cwd/empty-base ESM and CommonJS import probes;
- zero import-time Prisma acquisition;
- default `info|warn|error`, explicit typed/environment query opt-in only;
- existing AutoByteus repositories remain production DB owners.

### T9 — Custom-provider migration failure or destructive reset

Risk: v1 conversion partially publishes metadata/credentials, overwrites a current secret, leaks a value through generic migration logs, fails to remove an unusable v1 file, or blocks the whole Settings surface. Failed-migration deletion intentionally loses affected custom-provider configuration, which the user accepts because it is simple to recreate through the frontend.

Controls:

- only the fixed application-owned canonical path is eligible; no caller path, search, `.env`, backup, or quarantine path;
- parse/validate the complete v1 set only inside `CustomProviderV1AppDataMigration`;
- preserve provider IDs and require every derived target `MISSING`; any collision aborts the whole preservation attempt;
- stage one complete owner-only v2 file, insert one create-only encrypted batch transaction, then publish atomically;
- same-process publish failure compensates only exact unchanged rows from a memory-only receipt;
- interruption/collision never triggers guessed deletion or overwrite of a current vault entry; it triggers deletion only of the fixed legacy file;
- failed preservation deletes the canonical v1 file and creates no backup/recovery copy;
- migration returns/logs only stable codes and IDs/counts; raw parser/file/DB causes are sanitized before the generic runner persists them;
- custom listing failure contributes no custom rows and never rejects built-in provider Settings or **New Provider**;
- if v1 deletion itself is unavailable, the physical file remains untouched, general Settings still works, and custom creation waits for filesystem repair and restart.

## Cryptographic Control Summary

| Control | Decision |
|---|---|
| Root key | 32 random bytes from platform CSPRNG |
| Root-key location | `<canonical-db-path>.secret.key` |
| Entry cipher | AES-256-GCM |
| Nonce/tag | fresh 12-byte nonce, 16-byte tag |
| KDF | HKDF-SHA-256 using domain ID and SecretId-specific info |
| AAD | format version + domain ID + SecretId |
| Domain verifier | AEAD-protected fixed marker under a verifier-specific derived key |
| Key rotation | Not introduced in this ticket; format/version leaves an explicit future boundary |
| Zeroization | Best-effort buffers only; no impossible JavaScript-wide guarantee |

## Architecture Option Matrix

| Option | Simplicity | DB-only protection | Test/config coherence | Extensibility | Decision |
|---|---:|---:|---:|---:|---|
| Plaintext in application DB | High | None | High | Medium | Reject |
| Key committed or stored in same DB | High | None | High | Medium | Reject |
| Separate local Store DB + config/backend/access mode | Low | Good | Low | Superficial | Reject; duplicates lifecycle and caused coupling |
| Same application DB + external adjacent key | High | Good | High | Good through clean service/repository boundary | **Select** |
| OS keychain only | Medium | Good | Medium across platforms/containers/tests | Medium | Defer; not required for this open-source cross-platform delivery |
| Cloud/KMS/enterprise backend | Low for local product | Strong when operated correctly | Low for local/test default | High | Out of scope; new ticket/requirements |

## One Database Versus Two

One database is selected because:

- `DATABASE_URL` already owns environment isolation;
- migrations, backup, Docker volumes, test setup, diagnostics, and cleanup share one physical identity;
- a second DB does not improve cryptographic separation when the same process and key owner use it;
- test safety comes from a disposable/test-owned application DB, not a secret-specific read-only mode;
- provider/model catalogs remain logical owners and do not become table or Store selectors.

Two tables remain because singleton encryption-domain metadata and repeated secret entries have different identities/invariants. One database does not imply one table.

## Catalog / Credential Separation Decision

Catalogs answer “what providers/models does AutoByteus support?” Credential status answers “is this provider slot configured?” Provider invocation answers “can this concrete operation resolve and use its slot now?”

Those remain separate owner flows. The API-key screen receives one `ProviderSettingsGroup` per provider: the established `LlmProviderObject` plus four established `ModelDetail` lists. `LlmProviderService.listProviderSettings()` joins only exact canonical provider IDs and computes `apiKeyConfigured` once by that provider owner (exact vault slot for ordinary providers; established any-complete-option aggregate for Gemini). Missing credentials cannot erase models, and model/catalog rows cannot supply credential state. GraphQL selection sets keep the API-key page payload limited to rendered fields without creating a second reduced provider/model type family. The page carries no vault-health/storage/instruction protocol, capability-availability wrapper, parallel credential map, cross-provider fallback, or four-array merge. Existing catalog queries and type fields remain supported for their other consumers. Commands return only completion or specialized caller-unknown state: provider/Delete completion Boolean, custom Probe models/Create ID, or the shared Gemini setup state.

## Resolver Option Decision

| Shape | Decision | Reason |
|---|---|---|
| Provider imports server secret module or global helper | Reject | Reverse dependency/service locator; hard to test/authorize |
| Server pre-resolves into construction context/auth union | Reject | Broad exposure and model/factory coupling |
| Plural API-key bag | Reject | Overexposure and loose data |
| Inject narrow `ProviderApiKeyResolver` | Select | Core-owned port, provider selects slot at point of use |
| Put Gemini mode into key resolver | Reject | Mixes non-secret runtime configuration with custody |
| Separate `GeminiRuntimeResolver` function | Select | One tight value-free provider-specific dependency |

Ordinary providers retain three constructor/factory inputs. Gemini alone accepts the explicit fourth runtime resolver because it genuinely has multiple service configurations.

## Gemini Decision

- one explicit non-secret `GEMINI_SETUP_MODE` is sole runtime authority;
- option save and mode activation are separate operations;
- AI Studio and Vertex Express use distinct Google-owned `SecretId` values;
- Vertex Project uses project/location and platform identity, not an API-key fallback;
- exact selected SDK constructors are mandatory;
- no implicit priority, save-order inference, key-presence inference, or cross-mode retry;
- AI Studio may use current Developer API model listing with provenance;
- current Express reference is Preview and publishes generation/token methods, not model listing, so Vertex metadata is curated-only.

This is an intentional product change from the old implicit runtime priority and Settings cleanup behavior. It preserves exact Google service construction while making the selection explicit.

## Claude / Codex Decisions

### Claude

- `cli`: no vault lookup; existing external local account state remains;
- `managed-secret`: exact Anthropic slot, exact child, no fallback;
- `EXT-ANTHROPIC-AGENT-SDK-AUTH` stays a delivery/release documentation recheck only.

### Codex

- preserve original external login/home behavior;
- add no Store/account/login owner;
- explicitly exclude Codex from governed empty-base child claims.

## Custom-Provider V1 Transition Decision

| Option | Availability | Preservation | Runtime cleanliness | Decision |
|---|---:|---:|---:|---|
| Keep v1 runtime reader/error forever | Low when reader fails | Medium | Low | Reject |
| Reject v1 and block whole Settings | Low | None | Medium | Reject |
| Delete/reset v1 without attempting preservation | High | None; destructive | High | Reject |
| Require only manual operator migration | Medium | User-dependent | High | Reject for the supported upgrade path |
| One fixed-path automatic migration; on failure delete v1 and use normal frontend reconfiguration | High | High normally; configuration intentionally discarded on failure | High | **Select** |

The selected migration is proportionate because the packaged existing-user state is product-reachable and already blocks a supported Settings journey. It attempts preservation first, then deliberately prefers application availability and ordinary frontend reconfiguration over hidden plaintext retention or a blocked Settings surface.

## Legacy Data Decision

Historical sources are split by ownership and reachability:

- arbitrary/application `.env` credential aliases receive no automatic import, copy, scrub, delete, rewrite, conversion, or runtime fallback; users explicitly import/reconfigure;
- the fixed application-owned custom-provider-v1 file is `Migration Required` and has the one isolated transition described above and in [custom-provider-v1-migration-contract.md](./custom-provider-v1-migration-contract.md);
- normal runtime reads only current secret-free custom-provider v2 and has no backup/recovery-file mechanism;
- superseded separate Store data is discarded/rebuilt, not dual-read or migrated;
- absence of `GEMINI_SETUP_MODE` means not selected, not implicit initialization.

This keeps current runtime free of historical-schema branches while preventing one legacy custom-provider file from disabling the application.

## Docker / Deployment Decision

- unchanged Docker service/volume topology;
- DB and adjacent key persist in the existing server-data volume;
- one-Pod/single-writer SQLite boundary remains;
- no multi-replica shared SQLite guarantee;
- root key is never baked into image or committed.

## Forbidden Shortcuts

- environment credential fallback;
- runtime custom-provider-v1 parser, backup/recovery-file machinery, current-secret overwrite, or whole-Settings rejection from custom state;
- second Store selector/backend/access mode retained “for future use”;
- DB/key path passed to providers or governed children;
- model authentication fields or generic construction context;
- query logging enabled by default;
- root key in DB, repository, image, logs, or argv;
- importer shell evaluation or unknown-name blocking;
- additional committed live-E2E environment/configuration files, Store profiles, a harness-only Store, direct writes to tracked `.env.test`, or a special test-importer/profile wrapper;
- importer target inference from AppConfig, ambient variables, `.env`, `.env.test`, current working directory, or the selected assignment source;
- product server/AppConfig auto-discovery or parsing of `.env.test`, or backend-E2E injection of its application settings through ambient `process.env` instead of normal runtime `.env`;
- implicit Gemini priority/fallback;
- broad provider retry after missing/auth/provider failure;
- API-key-page credential authority repeated across four catalog collections, parallel client credential maps, cross-provider fallback, or an Apollo normalization/order workaround;
- either a new reduced provider/model DTO family or a new kitchen-sink security/status DTO when the established `LlmProviderObject`/`ModelDetail` contracts plus tight GraphQL selections already serve the page;
- claiming a built package verified without launching the actual packaged app;
- claiming strong isolation for same-user processes.

## Residual Risks

1. Same-user compromise can access DB plus key; accepted under `LOCAL_HARDENED`.
2. Root-key loss makes encrypted data unrecoverable; backup/restore documentation and pair validation are mandatory.
3. SQLite and external key creation cannot be one filesystem/DB atomic transaction; the first-init state machine handles only the approved empty-domain recovery states.
4. Custom metadata JSON and DB secret writes cannot be one physical transaction. Current CRUD requires compensation/idempotency; v1 migration requires staged publish, create-only batch, exact same-process compensation, and interruption/collision reset.
5. JavaScript cannot guarantee removal of all plaintext copies; lifetime/copy minimization and non-serialization are mandatory.
6. Google Express Preview contracts may change; metadata stays curated-only and release validation must recheck current docs.
7. A future capability may be added without updating the closed four-group read model; schema/generated-client and composition-matrix tests must fail that drift.
8. A failed migration intentionally discards legacy custom-provider configuration; this user-approved loss is bounded to custom providers and is mitigated by simple frontend reconfiguration.
9. Strong multi-tenant/agent isolation remains outside this design.

## Assurance Statement

The accepted statement is:

> AutoByteus stores managed scalar credentials encrypted in the selected local application database with an external owner-only root key, resolves them only at authorized point-of-use boundaries, limits accidental child/config/log exposure, and fails closed on custody-integrity errors. It does not claim protection from a fully compromised same-user server process or strong agent isolation.
