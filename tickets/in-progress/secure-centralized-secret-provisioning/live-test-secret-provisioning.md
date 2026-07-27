# Live Test Provisioning — Normal Application Database Lifecycle

## Artifact Metadata

| Field | Value |
|---|---|
| Status | `Design-ready for architecture review — custom-provider-v1 migration/delete-and-reconfigure proof included` |
| Purpose | Define simple non-secret test database configuration, fixed custom-provider-v1 transition proof, explicit provisioning, realistic execution, and cleanup |
| Related requirements | `REQ-001`, `REQ-002`, `REQ-006`, `REQ-009`, `REQ-011`–`REQ-013`, `REQ-015`, `REQ-017`, `REQ-018` |
| Related acceptance criteria | `AC-007`–`AC-009`, `AC-011`, `AC-013`–`AC-015` |
| Approval applicability | Existing test DB/importer/provider-group behavior and custom-provider migration/reset scenarios are user-approved for architecture review |

The fixed historical transition and its failure semantics are governed by [custom-provider-v1-migration-contract.md](./custom-provider-v1-migration-contract.md).

## Goal

Tests must exercise the same migration, root-key, vault, Settings, provider-resolution, and restart lifecycle as the normal application. Test configuration chooses an application database. It does not describe secret backends, access modes, models, scenarios, or expected capabilities.

## Tracked Non-Secret Configuration

Canonical tracked file:

```text
autobyteus-server-ts/.env.test
```

Allowed shape:

```dotenv
APP_ENV=test
DB_TYPE=sqlite
DATABASE_URL=file:./db/test.db
AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000
```

Rules:

1. this file contains no API key, token, password, ciphertext, root-key bytes, or credential alias;
2. `DATABASE_URL` is required and is normalized by the same `ApplicationDatabaseLocation` used in production;
3. the DB path must resolve inside the server package's ignored `/db/` test-runtime root;
4. the root key is not configured; it derives as `<canonical-db-path>.secret.key`;
5. the DB, key, WAL, SHM, journal, logs containing runtime details, and temporary roots are gitignored;
6. the tracked file is an immutable launch baseline. It must not contain mutable provider settings such as `GEMINI_SETUP_MODE`, `VERTEX_AI_PROJECT`, or `VERTEX_AI_LOCATION`; tests configure those through the normal Settings/API commands and the ordinary ignored runtime `.env`;
7. `autobyteus-server-ts/.gitignore` explicitly admits `.env.test` while continuing to ignore `.env`, other `.env.*` files, and all database/key artifacts;
8. backend-E2E, test-server, and real-provider-E2E entrypoints read this exact file through one `TestRuntimeBootstrap`; the actual server and standalone importer never read it; no `test-config/live-e2e.env`, profile, special test-import command, or second committed environment/configuration file exists;
9. deterministic tests may override the baseline `DATABASE_URL` with a fresh temporary database per test/run and must clean that isolated target;
10. no broad dotenv import or `.env.test` discovery is added to production libraries;
11. the bootstrap starts from an empty/allowlisted OS environment, validates the exact fixed launch schema, canonicalizes the DB URL relative to the server root, and materializes/reconciles those fixed keys into an ignored test app-data root's ordinary writable `.env` before launching the actual built server with `--data-dir`;
12. `.env.test` is checked byte-identical across server/E2E execution; importer coverage proves it is not read.

This follows the conventional environment-per-mode shape while preserving test isolation and Settings semantics: `.env.test` supplies immutable launch defaults, the ordinary ignored runtime `.env` stores mutable application settings, and deterministic tests replace mutable infrastructure with per-test temporary instances.

## Why An Explicit Test Launcher Is Required

The standalone Node server intentionally does not load `.env.test`:

- `src/app.ts` accepts only host, port, and data-dir;
- `AppConfig.initialize()` requires `<data-dir>/.env`;
- `AppConfig.set()` and `.delete()` write that runtime `.env`;
- the current live-E2E runner opens a harness-only Store rather than launching the normal server.

A value-free synthetic probe confirmed that current `AppConfig` correctly requires the selected data directory's normal writable `.env`. Loading `.env.test` into the process alone does not change that contract. Once test tooling materializes the runtime `.env`, the test `DATABASE_URL` works.

The target therefore adds one test-only bootstrap rather than teaching product code to auto-discover test files:

```text
test-support/test-runtime/test-runtime-bootstrap.mjs
```

It owns:

1. the fixed `autobyteus-server-ts/.env.test` path;
2. exact allowlisted parsing of `APP_ENV`, `DB_TYPE`, `DATABASE_URL`, and `AUTOBYTEUS_SERVER_HOST`;
3. canonical validation that the database resolves inside the ignored server test root;
4. fresh-root policy for deterministic backend E2E and persistent-root policy for manual/real-provider E2E;
5. first-run materialization and subsequent fixed-key reconciliation of the ignored ordinary writable `.env`, preserving unrelated mutable Settings keys;
6. an empty/allowlisted OS child environment that does not carry `DATABASE_URL`, Gemini settings, or credentials;
7. the unchanged actual built `dist/app.js --data-dir=<runtime-root>` launch, health readiness, shutdown, and value-safe logs.

The generated ignored runtime `.env` is normal application state, not a second operator-authored test configuration. It is never committed and is not a Store/profile selector.

## Configuration And Startup Case Matrix

| Case | Who reads `.env.test`? | What the actual server reads | Database lifecycle | Primary spine |
|---|---|---|---|---|
| Normal direct server | Nobody | Operator/application `<data-dir>/.env` | Normal user DB/key | `DS-UC016A` |
| Electron | Nobody | Electron-generated `server-data/.env` | Normal user DB/key | `DS-UC016A`, `DS-UC018` |
| Docker/Pod | Nobody | Normal deployment `.env`/container configuration | Existing volume DB/key | `DS-UC016B` |
| Deterministic unit/integration | Test setup may use fixed non-secret defaults, then overrides DB | No actual server unless the case starts one | Fresh temporary DB/key | Bounded deterministic coverage |
| Deterministic backend E2E | `TestRuntimeBootstrap` | Fresh `<test-data-dir>/.env` materialized from fixed test keys | Fresh DB/key; automatic fenced cleanup | `DS-UC010A` |
| Manual server/frontend test | `TestRuntimeBootstrap` | Persistent ignored `<test-data-dir>/.env` | Persistent isolated test DB/key | `DS-UC010B` |
| Real-provider backend E2E | `TestRuntimeBootstrap` | Same persistent ignored test runtime `.env` | Explicitly provisioned test DB/key, preserved by default | `DS-UC011` |
| Generic importer targeting test DB | Nobody; operator/runner supplies canonical absolute DB URL explicitly | Standalone importer, no actual server input | Exact explicit test DB/key only | `DS-UC008C` |
| Packaged Electron smoke | Nobody | Candidate's isolated Electron-generated `.env` | Fresh isolated candidate DB/key | `DS-UC018` |

This distinction is mandatory: `.env.test` is a backend-test input; `.env` remains the actual server's configuration contract in every environment.

## Removed Scenario Manifest

`test-config/live-e2e.json` and its schema/parser are removed.

The following belong in `test-support/live-e2e/live-e2e-scenarios.ts` or focused fixture files:

- scenario IDs;
- providers/models;
- operation modes;
- prompts/input fixtures;
- expected capabilities such as LLM turn, audio, image, or agent flow;
- required configured `SecretId` assertions;
- endpoint availability policies;
- timeouts/retries;
- cleanup expectations.

These are test behavior, not database or credential custody configuration.

## Database Classes

| Class | Purpose | Lifecycle | Credential values |
|---|---|---|---|
| Synthetic per-test DB | Unit/integration/browser CRUD | Created under test temp root; migrated; destroyed after test | Canary/synthetic only |
| Provisioned live-E2E DB | Explicit real-provider execution | Selected by the immutable server-project `.env.test` template and materialized into ignored test app-data/runtime `.env`; user provisions intentionally; preserved between runs unless user requests reset | Real values, never displayed/inspected |
| Packaged-smoke DB | Full Electron candidate | Unique isolated app root/DB per run; destroyed after smoke | Synthetic only unless a separate real-provider packaged run is explicitly approved |
| Production/default DB | Normal user application | User-owned | Never accessed by test commands |

“One database” means one application database per running environment, not that unrelated test and production processes share one physical file.

## Provisioning Options

### UI provisioning

1. run `pnpm dev:test`; its bootstrap loads `autobyteus-server-ts/.env.test`, prepares the ignored runtime `.env`, starts the actual built server, waits for health, and starts the normal frontend against it;
2. open API Key Settings;
3. enter a provider key in the provider’s write-only editor;
4. save; the value is encrypted in the selected test application DB;
5. for Gemini, configure each desired option and explicitly `Use this mode`;
6. verify only value-free status.

### Explicit importer

```bash
pnpm secrets:import -- \
  --source /absolute/path/to/assignments \
  --database-url file:/absolute/path/to/autobyteus-server-ts/db/test.db \
  --dry-run

pnpm secrets:import -- \
  --source /absolute/path/to/assignments \
  --database-url file:/absolute/path/to/autobyteus-server-ts/db/test.db
```

There is one importer command for every environment: `secrets:import`. It always requires an explicit absolute SQLite `--database-url` and never initializes AppConfig or loads `.env`, `.env.test`, parent `DATABASE_URL`, or target information from the selected source. To import into the persistent test DB, the operator passes the canonical absolute URL corresponding to the DB selected by the tracked test template. To import into a normal application DB, the operator passes that DB’s canonical absolute URL. There is no `secrets:local:import`, `secrets:local:import:test`, `--target`, `--database`, `--key`, backend, profile, or access-mode option.

The thin PNPM entrypoint normalizes zero or one leading argument separator. Any additional/mid-argument separator is invalid rather than silently reinterpreted.

- missing, duplicate, relative, non-SQLite, malformed, or non-canonicalizable `--database-url` fails before target access;
- the importer reads only the exact explicit DB; parent application/test variables and a `DATABASE_URL` assignment inside the source are ignored for targeting;
- dry-run reports only canonical target identity, target state, mapped `SecretId` values, observed `MISSING|CONFIGURED|UNAVAILABLE` status, planned `CREATE|SKIP_CONFIGURED|REPLACE|BLOCKED` action, and aggregate counts;
- dry-run uses the secret-management-owned `SecretVaultInspectionService` and performs no runtime-config change; it does not create/open-for-write/migrate the explicit DB or create/modify its key, metadata, Settings, or permissions;
- a missing/pre-feature test DB, or complete migrated secret tables with zero metadata/entries and either no key or one valid secure interrupted-initialization key, is reported as `INITIALIZATION_REQUIRED` with `MISSING/CREATE`; a complete verified vault is `READY`; metadata-without-key, entries-without-metadata, unsafe, incompatible, verifier-failed, or unreadable targets are closed with `UNAVAILABLE/BLOCKED`, exit nonzero, and are not confirmable;
- populated recognized values are selected;
- empty recognized values and unrecognized lines are ignored;
- direct TTY confirmation is required before writes;
- no-overwrite is default; `--overwrite` is explicit;
- source remains byte-identical;
- confirmed execution alone may run normal migration/bootstrap, rechecks target health and each selected entry in the write path, then one Prisma transaction conditionally creates/skips or explicitly replaces records in the selected application DB; its actual counts are authoritative if state changed after preview.

### Hidden-input command

A narrow hidden-input provider provisioning command may remain for one provider at a time. It also targets only current `DATABASE_URL` and never places the value in argv, ambient environment, output, or evidence.

## Normal Server / Frontend Journey

```bash
# Terminal 1: actual built test server
pnpm server:test

# Terminal 2: normal Nuxt frontend targeting the test server
pnpm web:test

# Or one convenience command supervising both
pnpm dev:test
```

```text
test entrypoint invokes TestRuntimeBootstrap
 -> validate immutable autobyteus-server-ts/.env.test
 -> canonicalize DB path against server root
 -> materialize/reconcile fixed keys into ignored test app-data/.env
 -> preserve mutable Settings keys in persistent test runtime
 -> launch unchanged actual built dist/app.js with --data-dir and clean OS env
 -> actual server reads only test app-data/.env
 -> AppConfig canonicalizes DATABASE_URL
 -> ordinary Prisma migrations
 -> vault bootstrap creates/verifies adjacent key
 -> normal server routes
 -> normal frontend GraphQL
 -> one ProviderSettingsGroup per provider with four existing model lists
 -> explicit Settings CRUD against test DB
```

No separate harness-only Store implementation is allowed. The backend-E2E runner starts or attaches only to the reviewed bootstrap's actual server process and drives normal HTTP/GraphQL/web-equivalent product boundaries. Direct in-process provider diagnostics may supplement a classified failure, but cannot replace the primary actual-server evidence.

## Deterministic Coverage

Deterministic suites must cover:

1. canonical relative/absolute SQLite URL resolution;
2. migration from pre-feature schema into two vault tables;
3. first initialization and every DB/key mismatch state;
4. encryption canary, fresh nonce/tag, replacement, idempotent removal, transaction rollback;
5. provider/slot authorization matrix and point-of-use resolution;
6. exact provider-centric GraphQL/generated-web schema reusing `LlmProviderObject` and `ModelDetail`, with no replacement provider/model DTO, availability wrapper, or vault-health/instruction protocol;
7. configured/catalog independence, exact provider-ID grouping, and `[]` for a capability with no models;
8. exact Boolean command completion with no echoed provider ID and network-only canonical refetch of `apiKeyConfigured` without a parallel credential map;
9. custom Probe/Create/Delete schema and browser behavior with exactly name/base URL/key input, purpose-specific `{id,name}` Probe models, assigned-ID Create, success-only Delete, and no type/runtime/input echo;
10. one exact Gemini setup-state query/command result and UI derivation of full/partial compound completion without operation/outcome/stage/instruction fields;
11. all Gemini Settings states/commands and exact constructors;
12. importer recognition, empty-as-absent, conflicts, source trust, TTY, atomicity;
13. `.env` legacy-source non-authority;
14. custom-provider current create/delete compensation;
15. fixed custom-provider-v1 missing/v2 no-op, successful all-or-nothing preservation, collision/invalid/stage/DB/publish/interruption reset, exact same-process compensation, failed-migration deletion without backup, and built-in Settings/New Provider continuity;
16. Claude/Codex/governed child boundaries;
17. exact repository_prisma 1.0.8 import/log policy;
18. restart/reopen and cleanup fences.

Synthetic values must be canaries specifically scanned from stdout, stderr, GraphQL, logs, snapshots, reports, and artifacts.

## Custom-Provider Existing-User Transition Coverage

This proof uses only synthetic isolated app-data roots and canary credentials. It never opens the user’s real custom-provider file or production DB.

### Preservation path

```text
isolated packaged/server root with valid synthetic fixed-path v1 file
 -> normal schema migration and vault bootstrap
 -> AppDataMigrationRunner
 -> complete provider-ID-preserving v1 transformation
 -> one create-only encrypted batch
 -> atomic v2 publish
 -> providerSettings contains migrated custom providers plus built-ins
 -> concrete custom invocation resolves the encrypted slot
 -> source/value scanner
```

Prove multiple providers, stable IDs/name/base URL, exact deterministic `SecretId`, no plaintext in v2/GraphQL/logs/evidence, and idempotent restart.

### Delete-and-reconfigure path

Force each material failure separately: invalid/duplicate v1, configured target collision, staging failure, DB transaction failure, file publish failure, interruption after DB commit, and v1-deletion failure.

For every case prove:

1. no partial v2 is published;
2. no pre-existing/changed secret is overwritten or deleted;
3. same-process compensation deletes only exact unchanged batch rows;
4. ordinary failed-preservation cases delete v1 and create no backup/recovery copy;
5. server startup and `providerSettings` still return all built-in providers/catalogs;
6. custom-provider rows alone are omitted when no current v2 metadata exists;
7. **New Provider** remains visible;
8. after deletion succeeds, ordinary frontend Probe/Create with name/base URL/key creates a new current provider ID, and list/use/delete works;
9. the existing app-data migration status reports only stable value-free success/warning/failure guidance;
10. no runtime v1 reader, backup/recovery mechanism, or fallback occurs.

The deletion-unavailable case leaves the physical v1 file untouched, reports a stable value-free failure, and keeps built-in Settings/the rest of the application running. After the filesystem problem is repaired, restart must complete deletion before custom Create is supported.

## Real Provider Coverage

The scenario registry chooses only scenarios whose required `SecretId` status is `CONFIGURED`. It never reads values.

Minimum substantive matrix when configured:

| Capability | Representative scenario |
|---|---|
| OpenAI | LLM turn, audio, image |
| Anthropic | Native LLM; Claude managed separately |
| DeepSeek | Agent turn using the configured DeepSeek provider/model path |
| Google AI Studio | LLM/media exact AI Studio constructor and optional live metadata |
| Google Vertex Express | LLM/audio/image exact `vertexai:true,apiKey`; metadata curated-only |
| Google Vertex Project | Exact project/location constructor when platform identity is available |
| Search | Serper/SerpAPI/Vertex AI Search as configured |
| AutoByteus | Discovery/reload and LLM/audio/image; exact unavailable outcome allowed |
| Custom provider | Discovery or configured model plus invocation |

Provider failures are classified; a successful credential on one capability does not automatically prove another capability, but it prevents an unsupported “credential invalid” inference when evidence points elsewhere.

## Gemini Real-E2E Rules

1. Tests use the reviewed activation API to set `GEMINI_SETUP_MODE` in the ignored normal runtime configuration; the tracked `.env.test` remains unchanged.
2. Only the selected slot is required/resolved.
3. Empty `GEMINI_API_KEY` in an import source does not block populated `VERTEX_AI_API_KEY`.
4. AI Studio and Vertex Express scenarios use their exact SDK options.
5. No scenario uses implicit priority or retries another mode.
6. Metadata expectations are `LIVE|CURATED_FALLBACK` for AI Studio and `CURATED_ONLY` for Vertex modes.

## Browser And Packaged Validation

### Normal browser validation

Use a synthetic per-test DB. Browser CRUD must not mutate the provisioned real-E2E DB unless the user explicitly requests that exact operation.

Required checks:

- the one `providerSettings` result contains each provider once as `ProviderSettingsGroup { provider, llmModels, audioModels, imageModels, videoModels }`;
- schema/generated-type scans prove the group reuses `LlmProviderObject` and current `ModelDetail`, and introduces no reduced provider/model DTO or capability availability wrapper;
- the API-key query selection contains only fields rendered by that page even though the reused types remain rich enough for their established consumers;
- OpenAI `apiKeyConfigured` is singular and cannot be overwritten by catalog/Apollo order;
- another provider can be missing/unavailable without supplying or changing OpenAI configured state;
- a capability with no matching models is `[]`; missing credentials do not remove any model list;
- custom-provider proof retains the existing custom identity/base URL/catalog status and exact deletion behavior; a failed synthetic v1 transition omits only custom rows and never hides built-ins or New Provider;
- custom Probe/Create/Delete carries only the exact tight input/results and refetches the canonical group after Create;
- write-only Save/Remove returns only Boolean command completion and a network-only canonical refetch updates only the request-owned exact provider group;
- empty-vault and configured-provider matrices render models independently of credential state;
- Gemini compact UI matches [gemini-setup-ui-ux-spec.md](./gemini-setup-ui-ux-spec.md), and every command returns its one exact setup state with no parallel outcome protocol;
- no value is prefilled or returned;
- active/configured state is truthful.

### Packaged Electron validation

Use a unique candidate identity, isolated app-data root, and isolated ports. Launch the actual packaged Electron app and embedded server, not only the terminal binary.

Required flow:

1. candidate starts and reaches server health;
2. Settings catalogs are non-empty with empty vault;
3. one isolated existing-user fixture proves successful custom-provider-v1 preservation;
4. a separate forced-delete fixture proves built-ins/New Provider remain usable and frontend reconfiguration succeeds;
5. synthetic credential save/status/remove succeeds;
6. restart reopens the same DB/key pair and current v2 custom state;
7. startup failure shows value-safe technical details and log location;
8. cleanup removes only the unique test-owned candidate roots;
9. production/default data is never read, changed, stopped, or cleaned.

## Docker / One-Pod Validation

- use the unchanged tracked build/start topology;
- select the container application DB through existing `DATABASE_URL`;
- DB and derived key persist in the same existing data volume;
- restart/reopen/removal pass;
- no new service, volume, Store mount, or environment credential alias is introduced.

## Preflight Output

Allowed output:

```text
DATABASE: READY
VAULT: READY
MODE: VERTEX_EXPRESS
provider.openai.api-key: CONFIGURED
provider.google.vertex-express-api-key: CONFIGURED
SCENARIOS: eligible=4 skipped=3
```

Output may use a value-free DB identity/fingerprint rather than a full path. It must not include:

- values or encoded forms;
- value lengths/hashes/prefixes;
- ciphertext, nonces, tags, verifier or key bytes;
- source lines;
- environment dumps;
- raw exceptions.

## Failure Semantics

| Failure | Result |
|---|---|
| Test DB resolves outside allowed runtime root | `TEST_DATABASE_PATH_UNSAFE` |
| Missing/duplicate/relative/non-SQLite importer database URL | Stable `IMPORT_DATABASE_URL_*`; no target access |
| DB/key pair invalid | Stable vault health/error; no regeneration |
| Custom-provider v1 preserved | App-data migration `SUCCEEDED`; current v2 custom providers available |
| Custom-provider v1 cannot migrate safely | `SUCCEEDED_WITH_WARNINGS` after legacy-file deletion and frontend reconfiguration, or stable `FAILED` if deletion is unavailable; built-ins always available |
| Required scenario slot missing | Scenario `SKIPPED_NOT_CONFIGURED`; no value access |
| Explicit active Gemini mode missing/incomplete | `GEMINI_RUNTIME_UNCONFIGURED`; no alternate mode |
| Provider endpoint unavailable | Exact sanitized provider/endpoint-unavailable classification |
| Evidence canary found | Whole run fails and evidence is quarantined |
| Cleanup identity mismatch | Cleanup refuses action |

## Cleanup

- deterministic/synthetic DB roots: automatic, identity-fenced cleanup;
- provisioned real-E2E DB/key: preserved by default; reset only by explicit user action against exact test root;
- imported assignment source: never modified/deleted;
- failed custom-provider-v1 fixture: assert the legacy file was deleted and no backup/recovery copy exists;
- production/default DB/key: never accessed;
- provider-created remote resources: tracked by scenario-specific cleanup code where applicable;
- logs/evidence: retained only after canary scan.

## Validation Outcome Required For Delivery

Delivery may claim the feature verified only after:

- deterministic suites pass;
- normal server/frontend passes against an isolated selected DB;
- configured real-provider scenarios execute or are explicitly reported unavailable/skipped;
- Docker restart/reopen passes;
- actual packaged Electron lifecycle passes for fresh state, successful existing-user custom-v1 migration, and forced non-blocking delete-and-reconfigure fallback;
- value scanner and cleanup audit pass;
- no production data/secret-bearing source was inspected.
