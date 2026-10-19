# Design Spec: Test Vault Selected Like A Database

## Solution And Approval Basis

- Current solution revision ID: `SR-007`
- Approved requirements baseline / revision, who approved, and approval reference:
  - Baseline: `requirements-doc.md` @ SR-006.
  - Approved by the **user** in the Solution Designer conversation on 2026-10-19: "I think we should go into this direction because the industry has set up a very good standard". Also: "if you don't set this, it by default uses the production itself".
  - DEC-011 was decided within that direction.
- Behavior-defining supplements and their approval references: `test-vault-evaluation-report.md` @ SR-006 (§5.0), same approval
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/investigation-notes.md` (W-*, F-*, A-01..A-17; A-18..A-21 added in SR-006)
- Authorities read (design reading gate; 2026-10-19), from the solution-designer skill: `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`; project `DESIGN.md` (repository root); `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` (isolated launch touches the web package). `references/design-examples.md` was not needed.
- Project design-principle conflicts or discrepancies: None. This revises a documented contract in `secret_management.md` ("There is no `SECRET_STORE_DATABASE_URL` … default-versus-E2E Store"). The user approved the revision; the doc is updated in this change.
- SR-005 draft: superseded. Transfer, run copies, `provision`, `useTestVault` and the explicit resolver helper are no longer part of the design.

## Current-State Read

- Production selects the application database with `DATABASE_URL`. The vault is two tables in that database plus `<db>.secret.key`, so the vault follows the database (A-01).
- Startup opens it at exactly two sites, `server-runtime.ts:169` and `standalone-application-host/start-standalone-application-host.ts:145`, through `getSecretVaultRuntime().initialize(databaseLocation)`. All product key lookups then go through `SecretManagementService` (A-04, A-05, A-18).
- `AppConfig.get(key)` reads `process.env` first, then the data dir's `.env` (A-19).
- The Electron production launch passes the whole caller environment to the server (`inherit-caller`). Isolated launches pass only system baseline variables (`isolated-baseline`); `buildServerProcessEnv` is the single place that decides this (A-20).
- autobyteus-ts clients and factories (31 files) require an explicit `ProviderApiKeyResolver`; there is no default (A-21).
- Test credentials arrive by four routes today (F-01); see the investigation notes.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence:
  - server secret-management: vault source selection, read-only store, verify-only bootstrap, test-vault location/setup/status/remove, CLI;
  - two startup sites;
  - autobyteus-ts: an optional default resolver across 31 constructor/factory files, plus the test setup;
  - Electron isolated env policy and the isolated-app CLI;
  - `test-support/live-e2e`;
  - 8 server live suites + helper;
  - 18 autobyteus-ts live files;
  - docs and skills.
  - Total: about 75 files, in four packages.
- Architectural risk: `High`
- Risk rationale and supporting evidence:
  - Security: a new environment selector changes where the **production** server reads credentials from. It is guarded against real app data, but it is still a new credential-source path. The importer contract is revised.
  - Shared contracts: the `SecretManagementService` store interface; the vault runtime initialization signature; the autobyteus-ts public constructor/factory signatures (resolver becomes optional).
  - Cross-package: the Electron server env policy.
- Escalation trigger if implementation discovers new impact, to be reported as Design Impact:
  - any test-vault write outside setup/remove;
  - a key in env, argv, logs or evidence;
  - the guard failing to recognise the production data dir on any supported OS;
  - a startup app-data migration needing vault writes on a fresh DB while the test vault is selected;
  - the autobyteus-ts test setup needing Prisma.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| A-01, A-02 | `persistence/secret-vault-repository.ts`; `services/secret-vault-inspection-service.ts` | Prisma-global vault; read-only `node:sqlite` precedent | The test vault is opened with a read-only `node:sqlite` store, so it coexists with the app's Prisma DB in one process | — |
| A-03 | `crypto/secret-vault-crypto.ts` | Decryption is not path-bound | Opening the vault from any directory works | — |
| A-04, A-05 | `services/secret-management-service.ts`; `resolution/secret-management-provider-api-key-resolver.ts` | Repository is type-only; resolver reusable | The service runs unchanged over a different store; product resolvers unchanged | — |
| A-06 | `bootstrap/secret-vault-bootstrap.ts` | Verify sits under a Prisma lock | Add `verifyEstablished(store)` | — |
| A-07 | importer service | Writable opener; confirmation port | Setup reuses the importer service with a test-target decision port | — |
| A-18 | `server-runtime.ts:169`, `start-standalone-application-host.ts:145` | Exactly two startup init sites | Both pass a `SecretVaultSource` from one selector | — |
| A-19 | `config/app-config.ts:470` `get()` | env first, then data-dir `.env` | One selector key works for in-process tests, built test servers and instances | — |
| A-20 | `autobyteus-web/electron/server/serverRuntimeEnv.ts` `buildServerProcessEnv` | `inherit-caller` (production) vs `isolated-baseline` | Server-side production guard is mandatory; isolated policy forwards the selector explicitly | — |
| A-21 | `grep "apiKeyResolver: ProviderApiKeyResolver" autobyteus-ts/src` | 31 files require a resolver | Optional parameter + process default slot (one owner) | — |
| A-08, A-09 | autobyteus-ts `SecretValue`, exports | Duck-typed; dist exports | Vitest self alias to `src` for the test setup | `.js` → `.ts` alias resolution to confirm |
| A-10 | `test-support/*` | Cross-package test glue pattern | `test-support/test-vault/` installs the autobyteus-ts default | — |
| custom-provider migration | `app-data-migrations/migrations/custom-provider-readable-id-app-data-migration.ts:235` | Vault removal runs only for legacy V1/V2 custom-provider data; failure is a sanitized warning | With a read-only vault, a legacy-data test DB gets a warning, not a fatal error | Escalation trigger above |

## Intended Change

- Add a vault **source selector**. `AUTOBYTEUS_TEST_VAULT=<directory>` makes the server's normal vault runtime open the standing test vault (`<dir>/test-vault.db` + `.secret.key`) **read-only** instead of the vault inside its own database.
- When the variable is unset, nothing changes.
- A server whose app data dir is the user's real `~/.autobyteus/server-data` ignores the variable.
- autobyteus-ts gets an optional process-default key resolver. Its test setup installs a test-vault-backed resolver when the variable is set, so `new XLLM(model, config)` and `LLMFactory.createLLM(id)` work with no extra code.
- `pnpm test-vault setup|status|remove` manages the vault.
- Env-sourced test credentials are removed. One TESTING.md section and an `AGENTS.md` entry document it.

## Change Scope (Mandatory)

- **In scope:** UC-001..UC-008, REQ-001..REQ-016. Areas:
  - server `src/secret-management/` (vault source selection, read-only store, verify-only bootstrap, `test-vault/` location/setup/status/remove, CLI, importer confirmation port);
  - the two startup sites;
  - `autobyteus-ts/src` (default resolver slot; optional resolver parameters);
  - autobyteus-ts tests (setup, vitest alias, `test` script, 18 live files);
  - `test-support/test-vault/` (new: installs the autobyteus-ts default, gate/skip policy, credential stripping);
  - `test-support/live-e2e/` (forward the selector to built test servers; print the location in preflight; compaction empty-selection fix);
  - server tests (E2E credential stripping; replace the env helper in 8 suites);
  - `autobyteus-web/electron/server/serverRuntimeEnv.ts` (isolated policy forwards the selector);
  - root `package.json` (`test-vault` script);
  - docs and skills (`AGENTS.md`, `TESTING.md`, `secret_management.md`, server README, root README, `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md`, `autobyteus-ts/docs/nodejs_architecture.md`).
- **Deliberately left alone:**
  - production vault behavior when the selector is unset;
  - the Settings UI (the read-only error surfaces through the existing typed vault errors);
  - the general `pnpm secrets:import` behavior;
  - `test:e2e:real`'s runtime-root policy (its DB no longer receives keys, so it is harmless);
  - CLI-login live tests;
  - deterministic suites;
  - `.env.test`;
  - old stores in production data and existing worktree test DBs (DEC-008: listed, never touched);
  - importer aliases.
- **Follow-ups:**
  - FU-01: `token-usage-model-list.e2e.test.ts` env save/restore is redundant after stripping.
  - FU-02: the live desktop app exports the legacy plaintext credential aliases from `~/.autobyteus/server-data/.env` into agent shells.
  - FU-03: server rebuild on every `secrets:import`/`test:e2e:real*`/`test-vault` call.
  - FU-04: existing worktree `autobyteus-server-ts/db/test.db` files still hold copies of real keys; the user deletes them (DEC-008).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001..004; AC-001..004 | `pnpm test-vault setup\|status\|remove` | TTY importer per DB (W-01..04) | Non-interactive setup to the validated test location; status; remove | DS-001 |
| BEH-002, 004, 008 | Operational | REQ-005, 007, 010, 012, 016; AC-006, 007, 010, 015, 016 | Any server start (test server, in-process suite, isolated instance, `test:e2e:real`) | Vault = own DB vault; keys provisioned per DB or from env | Selector set → normal runtime opens the test vault read-only; unset or real data → own DB vault | DS-002 |
| BEH-003, 009 | Operational | REQ-005, 006, 008, 014; AC-005, 013 | autobyteus-ts test/probe with the selector set | Env vars; stale constructors | Test setup installs the default resolver; constructors/factories fall back to it | DS-003 |
| BEH-005 | Contract | REQ-006, 011; AC-009, 011 | Any test process | Inherited production keys reach tests | Credential variables stripped before modules load | DS-004 |
| BEH-006 | Contract | REQ-009; AC-008 | Gate on, key missing/refused | Silent skip; refusal passes | Reasoned skip; strict mode fails | DS-003 |
| BEH-007 | Operational | REQ-003 | `pnpm test-vault remove` | Manual | Removes exactly the pair and sidecars | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `test-vault-evaluation-report.md` | Findings; approved usage model (§5.0) | All | The experience this design realizes | Approved @ SR-006 |
| `context/55.png` | Incident | REQ-006 | Motivates DS-004 and the helper removal | Evidence |
| `walkthrough/*.log` | Baseline | F-* | Current-state evidence | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement`
- Current design issue found: `Yes`
- Structural triggers that fire:
  - **Repeated coordination.** Credential sourcing for tests is decided in four places (F-01). It moves to one owner: the vault source selection in the vault runtime, plus one autobyteus-ts default slot.
  - **Legacy cleanup.** The env→vault helper, per-test env gates, the importer-into-test-DB instructions and the success-returning `skipIfProviderAccessError` are replaced cleanly.
  - **Capability reuse.** The existing service, resolver, catalog, crypto and importer are reused; no parallel test store and no test-only resolution path. Product code resolves identically in tests, which satisfies the F-16 "normal lifecycle" rationale better than the SR-005 transfer.
  - **Authoritative boundary.** The vault source is chosen in one place (`selectSecretVaultSource`), not by callers.
- Root cause classification: `Duplicated Policy Or Coordination` and `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: F-01, F-02, F-15, A-01..A-21.
- Design response:
  - `SecretVaultSource` selection owned by secret-management;
  - `SecretVaultRuntime.initialize(source)`;
  - the `SecretVaultStore` interface with a read-only implementation;
  - an autobyteus-ts default resolver slot.
- Refactor rationale: one selector is the whole user experience. Without one owner, each harness re-invents credential sourcing.
- Intentional deferrals and residual risk: FU-01..FU-04.

## Terminology

- **Test vault**: an ordinary application vault DB/key pair (`test-vault.db`, `test-vault.db.secret.key`) in the directory named by `AUTOBYTEUS_TEST_VAULT`, created by `pnpm test-vault setup`.
- **Vault source**: which vault the runtime opens: `application` (inside the app's own DB; default) or `test` (the test vault, read-only).
- **Selector**: the environment variable `AUTOBYTEUS_TEST_VAULT`, a directory path. Like `DATABASE_URL`, it names a location and never carries a secret.
- **Real app data**: the canonical production server data dir, `~/.autobyteus/server-data` (`autobyteus-web/electron/appDataPaths.ts`).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope:
  - `tests/e2e/helpers/live-runtime-secret-vault-helpers.ts` (env → vault);
  - credential-env gates in 18 autobyteus-ts files and 2 server suites;
  - `autobyteus-ts/tests/integration/helpers/provider-access.ts` `skipIfProviderAccessError` (success return);
  - TESTING/skill/README instructions to import keys into test or instance DBs with `script`;
  - `ANTHROPIC_API_KEY=<key>` in the TESTING Anthropic row;
  - the `.env.test contains API keys` line;
  - the secret_management.md paragraphs that say tests are provisioned per DB.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.
  - Tests never read credential env aliases; there is no "env if present" fallback.
  - The autobyteus-ts default resolver is not a fallback to env: it is empty unless test setup installs the test-vault resolver.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject:
  - new: the test vault (an ordinary current-schema application DB + key, a few secrets);
  - existing: per-worktree test DBs;
  - production: untouched.
- Relevant change: none to schemas or stored formats. The test vault is created by the normal migrations and bootstrap through the importer service.
- Normal reader/writer behavior: setup writes the vault through the normal path; consumers read only `secret_entries`/`secret_encryption_metadata` (columns validated as in the inspection service) read-only.
- Required semantics: the encryption domain/verifier is checked on open (`verifyEstablished`). A newer-worktree vault stays readable by older worktrees because consumers read only those two stable tables and never migrate the vault.
- Constraints: dir `0700`, DB/key `0600`; never under real app data.
- Decision:
  - production: `Not Affected`;
  - worktree test DBs: `Discard or Rebuild` (no longer needed; left for the user, FU-04);
  - test vault: new data.
- Rationale: no transformation of existing data is required.
- Supports: REQ-007, QR-005.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 007 | `pnpm test-vault setup\|status\|remove` | Vault created/updated, reported, or removed; setup prints the selector line | `TestVaultCommands` | One-time provisioning |
| DS-002 | Primary End-to-End | BEH-002, 004, 008 | Server startup (Studio or standalone host; test server, in-process suite, isolated instance) | Product resolvers read the selected vault | `selectSecretVaultSource` + `SecretVaultRuntime` | "Set one variable, no logic change" |
| DS-003 | Primary End-to-End | BEH-003, 006, 009 | autobyteus-ts test or probe process start | Provider call with a key from the test vault | autobyteus-ts default resolver slot, filled by `test-support/test-vault` | autobyteus-ts automatic use |
| DS-004 | Bounded Local | BEH-005 | Test process start | Credential variables deleted before modules load | Test setup files | No key from the environment |

## Primary Execution Spine(s)

- DS-001:
  `User → pnpm test-vault setup → TestVaultLocation (selector or default; refuse real app data) → LocalEnvironmentSecretImportService (file source, TestVaultTargetDecision) → WritableVaultTarget → saveBatch → test vault → prints "export AUTOBYTEUS_TEST_VAULT=<dir>"`
- DS-002:
  `Server startup → AppConfig (selector, app data dir) → selectSecretVaultSource → SecretVaultRuntime.initialize(source)`, which then branches:
  - `[test]` `ReadOnlySecretVaultStore + SecretVaultBootstrap.verifyEstablished`
  - `[application]` existing Prisma path

  After either branch: `SecretManagementService → product resolvers → provider SDK`
- DS-003:
  `Vitest setup (autobyteus-ts) → stripCredentialEnvironment → [selector set] test-support installTestVaultDefaultResolver → server openTestVault (read-only) → setDefaultProviderApiKeyResolver(SecretManagementProviderApiKeyResolver over the read-only service)`, then
  `test/probe: new DeepSeekLLM(model, config) → resolver ?? default → resolve → revealToTrustedConsumer → provider API`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user names a secrets file once. The location comes from the selector or the default and is validated. The existing importer service writes it. The decision port confirms because the target is the validated test vault, so there is no TTY. The command prints the selector line to set. | location, importer, writable target | `TestVaultCommands` | source privacy (existing reader), real-data refusal |
| DS-002 | At startup the server decides its vault source once. If the selector is set and its data dir is not real app data, it opens the test vault read-only and verifies it. Otherwise it uses its own DB vault exactly as today. It logs the choice (location only). Everything above the runtime is unchanged. | config, source selection, runtime, store, service | `selectSecretVaultSource` / `SecretVaultRuntime` | log line, read-only error mapping |
| DS-003 | autobyteus-ts test setup strips credential variables. When the selector is set, it installs a process-default resolver backed by the read-only test vault. Clients constructed without a resolver use it. A missing key raises `MissingApiKeyError`, which the live-test policy reports as a reasoned skip (strict mode: failure). | setup, default slot, resolver | default slot (autobyteus-ts) + test policy (test-support) | gate, classification |
| DS-004 | Before modules load, `*_API_KEY` and the importer alias names are deleted from `process.env` (autobyteus-ts setup; server setup for `tests/e2e` too). | setup | test setup | — |

## Spine Actors / Main-Line Nodes

`TestVaultLocation`, `TestVaultCommands`, `selectSecretVaultSource`, `SecretVaultRuntime`, `ReadOnlySecretVaultStore`, `SecretVaultBootstrap.verifyEstablished`, `SecretManagementService` (reused), product resolvers (reused), autobyteus-ts default resolver slot, `test-support/test-vault`.

## Ownership Map

- `TestVaultLocation` (server secret-management):
  - owns parsing the selector (absolute directory, no symlink) and the default `~/.autobyteus-test/vault` (used by setup only);
  - owns the file names and the refusal of locations under real app data (`~/.autobyteus/**`).
- `selectSecretVaultSource({ testVaultSetting, appDataDir, databaseLocation })` (server secret-management):
  - pure decision: `{ kind: 'application', location }`, or `{ kind: 'test', location }`;
  - with the selector set on real app data, it returns `application` plus a `TEST_VAULT_IGNORED_ON_REAL_APP_DATA` notice;
  - owns REQ-016.
- `SecretVaultRuntime.initialize(source)`:
  - owns opening the selected source (test → read-only store + verify-only; application → unchanged);
  - logs `Secret vault: test vault <dir> (read-only)` or `Secret vault: application database`.
- `ReadOnlySecretVaultStore`: owns `node:sqlite` read-only access. Write methods throw `SecretVaultError('READ_ONLY', …, 'SECRET_VAULT_READ_ONLY')`, which existing typed GraphQL errors surface in Settings.
- `SecretVaultBootstrap.verifyEstablished(store, location)`: owns verify-without-write, reusing the existing validators.
- `TestVaultCommands`: owns setup (importer + decision port + permissions + selector-line output), status (read-only open: location, health, configured/missing IDs), and remove (DB, key, sidecars at the validated location).
- autobyteus-ts `provider-api-key-resolver` module:
  - owns the optional process default (`setDefaultProviderApiKeyResolver`, `resolveProviderApiKeyResolver(explicit?)`);
  - with no default, resolution throws `MissingApiKeyError(provider)`.
- `test-support/test-vault`:
  - owns test policy: credential stripping, installing the autobyteus-ts default when the selector is set, the live gate `RUN_LIVE_PROVIDER_TESTS`, reasoned skip, strict mode `AUTOBYTEUS_LIVE_STRICT`;
  - the moved access-error classifier.
- Electron `buildServerProcessEnv`: owns forwarding `AUTOBYTEUS_TEST_VAULT` under `isolated-baseline` (`inherit-caller` already forwards everything; the server guard protects real data).

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pnpm test-vault <setup\|status\|remove>` → `autobyteus-server-ts/dist/secret-management/cli/test-vault-cli.js` | `TestVaultCommands` | One discoverable command | Location policy, crypto |
| `test-support/test-vault/test-vault.ts` | test policy (governing) | One import for test setups/suites | Vault format, location rules |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/helpers/live-runtime-secret-vault-helpers.ts` | Env → vault (REQ-006). The selector makes the runtime read the test vault. | Normal runtime init (suites call the same init as startup, through `selectSecretVaultSource`) | In This Change | 8 suites |
| Credential env reads/gates in 18 autobyteus-ts files, `agent-initiated-collaborators`, `autobyteus-anthropic-prompt-caching-live` (incl. APC-E2E-008's direct `fetch`) | REQ-006 | Default resolver / runtime vault; gate + reasoned skip | In This Change | APC-E2E-008 resolves its key through the product resolver |
| `autobyteus-ts/tests/integration/helpers/provider-access.ts` | Success-return skip (REQ-009) | `test-support/test-vault` classifier + policy | In This Change | Logic moved |
| Docs: per-DB import for tests/instances, `script` recipe, env-key commands, `.env.test` keys line, "no default-versus-E2E store" | Replaced | TESTING "Test vault" section, `AGENTS.md` entry, revised secret_management.md | In This Change | General importer docs stay for non-test DBs |
| `token-usage-model-list` env save/restore | Redundant | — | Follow-up FU-01 | |

## Return Or Event Spine(s) (If Applicable)

N/A. All paths are synchronous call/return.

## Bounded Local / Internal Spines (If Applicable)

`SecretVaultRuntime` (test source):
`initialize(test) → open DatabaseSync(readOnly, query_only) → read key (SecretRootKeyFile.readRequired) → verifyEstablished → serve → close → zeroize key, close DB`.
This matters because the key is held once per process and released on shutdown, the same as the application source.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Real-app-data detection | DS-001, DS-002 | `TestVaultLocation`, `selectSecretVaultSource` | Canonical `~/.autobyteus/server-data` comparison after realpath | REQ-004, REQ-016 | Duplicated checks drift |
| Source privacy checks | DS-001 | `TestVaultCommands` | Existing `LocalEnvironmentSourceReader` | Reuse | — |
| Credential stripping | DS-004 | test setups | Delete credential vars | REQ-006 | — |
| Access-error classification | DS-003 | test policy | Reasons | REQ-009 | — |
| Vault-choice log line | DS-002 | runtime | Location only | REQ-016 | — |

## Ownership Boundaries

- Only `selectSecretVaultSource` decides the vault source. Callers (startup sites, in-process suites) pass config into it; they do not open stores.
- Only server secret-management knows the vault format and location. `test-support` calls `openTestVault()` for the autobyteus-ts default; the CLI calls `TestVaultCommands`.
- autobyteus-ts `src` knows nothing about vaults: it exposes only the default-resolver slot.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use It | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `selectSecretVaultSource` + `SecretVaultRuntime.initialize(source)` | `ReadOnlySecretVaultStore`, `verifyEstablished`, Prisma repository | startup sites, in-process suites | A suite or harness constructing stores, or reading `AUTOBYTEUS_TEST_VAULT` itself | Extend the source decision input |
| `openTestVault()` | read-only store, verify, service | `test-support` only | Tests opening SQLite or the key file | Add a reader method |
| `TestVaultCommands` | importer service, location, remove | CLI | Scripts writing the vault directly | — |
| autobyteus-ts `resolveProviderApiKeyResolver` | default slot | all autobyteus-ts clients/factories | Clients reading env or a global directly | — |

## Dependency Rules

- Allowed:
  - startup sites → `selectSecretVaultSource`;
  - `test-support/test-vault` → `autobyteus-server-ts/src/secret-management/test-vault/index.ts` and autobyteus-ts `src` (setter);
  - `autobyteus-ts/tests/setup.ts` and `autobyteus-server-ts/tests/**` → `test-support/test-vault`;
  - Electron `serverRuntimeEnv` → the selector **name** only.
- Forbidden:
  - `autobyteus-ts/src` → server or test-support;
  - `autobyteus-web` → server or test-support modules;
  - any code reading credential env aliases for test keys;
  - any writer to the test vault other than `TestVaultCommands`;
  - any key in env, argv or output;
  - production code installing an autobyteus-ts default resolver.

## Interface Boundary Mapping

| Interface / API / Command | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AUTOBYTEUS_TEST_VAULT=<abs dir>` | vault source | Select the test vault | Absolute directory | Read via `AppConfig.get` (env, then data-dir `.env`) |
| `pnpm test-vault setup --source <abs file> [--replace]` | test vault | Create/update; print the selector line | Absolute source path | Target = selector dir if set, else the default |
| `pnpm test-vault status` | test vault | Location, health, configured/missing IDs | — | Value-free |
| `pnpm test-vault remove` | test vault | Delete DB, key, sidecars | — | No-op if absent |
| `selectSecretVaultSource(input): SecretVaultSource` | vault source | Decide | `{ testVaultSetting?: string, appDataDir: string, databaseLocation }` | Pure; unit-testable |
| `SecretVaultRuntime.initialize(source: SecretVaultSource)` | runtime | Open the selected source | Discriminated union | Importer passes `{kind:'application'}` |
| `openTestVault(location?)` | test vault | Read-only service for test-support | — | `TEST_VAULT_NOT_FOUND` names the setup command |
| autobyteus-ts `setDefaultProviderApiKeyResolver(r \| null)`, `resolveProviderApiKeyResolver(explicit?)` | default slot | Test-only default | — | Exported from `secrets/` |
| `test-support`: `installTestVaultDefaultResolver()`, `liveProviderTest(provider, slot?)`, `stripCredentialEnvironment()` | test policy | Setup and gating | `LLMProvider` (+ Gemini slot) | Helper shape is the implementer's call; semantics fixed |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `selectSecretVaultSource` | Yes | Yes | Low | — |
| `AUTOBYTEUS_TEST_VAULT` | Yes | Yes (absolute dir) | Medium (could be inherited by production) | Real-app-data guard + log line |
| default resolver slot | Yes | Yes | Medium (global state) | Only test setup sets it; a dependency rule forbids production use |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Selector | `AUTOBYTEUS_TEST_VAULT` | Yes | Low | — |
| Source decision | `selectSecretVaultSource`, `SecretVaultSource` | Yes | Low | — |
| Read-only store | `ReadOnlySecretVaultStore` | Yes | Low | — |
| Commands | `TestVaultCommands` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability | Decision | Why | If New, Why |
| --- | --- | --- | --- | --- |
| Resolve keys | `SecretManagementService`, resolvers, catalog, crypto | Reuse | Identical product path | — |
| Choose the vault at startup | `SecretVaultRuntime.initialize` | Extend (source union) | Single owner of opening | — |
| Read-only DB access | inspection-service technique | Extend (new store) | Prisma is process-global | Inspection does not read entries |
| Verify an established vault | `SecretVaultBootstrap` | Extend | Validators live there | — |
| Import a file into the vault | importer service | Reuse | Same validation | — |
| Isolated env forwarding | `buildServerProcessEnv` | Extend | Single decision point | — |
| Env isolation | server `test-environment-isolation.ts` | Extend (E2E credential stripping) | Same owner | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| server `secret-management/` (`test-vault/`, `persistence/`, `bootstrap/`, root `secret-vault-runtime.ts`, `secret-vault-source.ts`, `cli/`) | source selection, read-only store, test-vault commands | DS-001, DS-002 | runtime, commands | Extend + Create New (`test-vault/`) | |
| server startup (`server-runtime.ts`, standalone host) | pass the source | DS-002 | runtime | Extend | Two call sites |
| autobyteus-ts `src/secrets/` + clients/factories | default slot; optional parameter | DS-003 | default slot | Extend | 31 files, mechanical |
| `test-support/test-vault/` | test policy | DS-003, DS-004 | tests | Create New | |
| `test-support/live-e2e/` | forward the selector; preflight location; empty-selection fix | DS-002 | runner | Extend | |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts` | isolated forwarding | DS-002 | Electron | Extend | |

## Draft File Responsibility Mapping

The final mapping below needed no restructuring after the reusable-structure pass, except moving the access-error classifier to test-support.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Writable vault open/close for a location | `provisioning/writable-vault-target.ts` (extracted from the importer) | secret-management | Importer + test-vault setup | Yes | Yes | A runtime registry |
| Real-app-data detection | `test-vault/test-vault-location.ts` (`isRealAppDataPath`) | secret-management | Setup refusal + source selection | Yes | Yes | — |
| Credential variable names | `test-support/test-vault/credential-environment.ts` | test-support | Both packages' setups | Yes | Yes | An env reader for keys |
| Access-error classification | `test-support/test-vault/provider-access-classification.ts` | test-support | Both packages' live tests | Yes | Yes | A retry policy |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `SecretVaultSource = {kind:'application', location} \| {kind:'test', location}` | Yes | Yes | Low | — |
| `SecretVaultStore` interface | Yes | Yes | Low | Exactly the methods the service and bootstrap use |
| `TestVaultStatus {location, health, configured, missing}` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/secret-management/secret-vault-source.ts` (new) | `selectSecretVaultSource`, `SecretVaultSource` | Pure source decision + notice |
| `.../secret-vault-runtime.ts` | runtime | `initialize(source)`; open test (read-only) or application; log line |
| `.../persistence/secret-vault-store.ts` (new) | interface | `SecretVaultStore` |
| `.../persistence/read-only-secret-vault-store.ts` (new) | store | `node:sqlite` reads; writes throw `READ_ONLY` |
| `.../persistence/secret-vault-repository.ts` | existing | implements `SecretVaultStore` |
| `.../bootstrap/secret-vault-bootstrap.ts` | existing | + `verifyEstablished` |
| `.../services/secret-management-service.ts` | existing | constructor takes `SecretVaultStore` |
| `.../domain/secret-vault-types.ts` | existing | + `READ_ONLY` error code |
| `.../test-vault/test-vault-location.ts` (new) | location | selector parsing, default, file names, real-data detection |
| `.../test-vault/test-vault-commands.ts` (new) | commands | setup/status/remove; permissions; selector line |
| `.../test-vault/index.ts` (new) | public entry | `openTestVault`, `TestVaultCommands`, `TestVaultLocation` |
| `.../provisioning/writable-vault-target.ts` (new, extracted) | opener | migrations + Prisma + runtime(application) + shutdown |
| `.../provisioning/local-environment-secret-import-service.ts` | existing | uses `WritableVaultTarget`; confirmation port returns a decision |
| `.../cli/import-local-environment-secrets.ts` | existing | TTY decision port (same behavior) |
| `.../cli/test-vault-cli.ts` (new) | CLI | parse/print |
| `autobyteus-server-ts/src/server-runtime.ts`, `src/standalone-application-host/start-standalone-application-host.ts` | startup | pass `selectSecretVaultSource(...)` |
| `autobyteus-ts/src/secrets/provider-api-key-resolver.ts` | default slot | setter + resolve helper |
| 31 autobyteus-ts client/factory files | clients | `apiKeyResolver?` → `resolveProviderApiKeyResolver(apiKeyResolver)` |
| `autobyteus-ts/tests/setup.ts`, `vitest.config.ts`, `package.json` | autobyteus-ts tests | strip + install default; self alias; `"test": "vitest run"` |
| 18 autobyteus-ts live test files | tests | current constructors without resolver; `liveProviderTest` gate/skip |
| `test-support/test-vault/{test-vault.ts, credential-environment.ts, provider-access-classification.ts}` (new) | test policy | install default, gate/skip/strict, stripping, classification |
| `autobyteus-ts/tests/integration/helpers/provider-access.ts` | — | removed |
| `autobyteus-server-ts/tests/setup/test-environment-isolation.ts` | server tests | + strip credential vars for `tests/e2e` |
| `autobyteus-server-ts/tests/e2e/helpers/live-runtime-secret-vault-helpers.ts` | — | removed; 8 suites call normal init |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts` | tests | `describe` only when the selection is non-empty |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | bootstrap | forward `AUTOBYTEUS_TEST_VAULT` in `createSanitizedTestEnvironment` |
| `test-support/live-e2e/live-e2e-harness.ts` / `run-live-e2e.mjs` | runner | print the vault source in preflight |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts` (+ its test) | Electron | forward the selector under `isolated-baseline` |
| root `package.json` | scripts | `test-vault` |
| Docs/skills (Change Scope) | docs | one message |

## Applied Patterns (If Any)

- **Strategy-selected store** behind `SecretVaultStore` (Prisma repository vs read-only store), chosen once by `selectSecretVaultSource`.
- **Optional default dependency** (resolver slot) in autobyteus-ts, set only by test setup.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/secret-management/test-vault/` | Folder | test-vault | location, commands, entry | Vitest/test policy |
| `autobyteus-server-ts/src/secret-management/secret-vault-source.ts` | File | source decision | selection | I/O |
| `test-support/test-vault/` | Folder | test policy | setup install, gates, stripping | SQLite/crypto |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `secret-management/test-vault/` | Main-Line Domain-Control | Yes | Low | One capability |
| `test-support/test-vault/` | Off-Spine (test policy) | Yes | Low | Test-only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Running a live server suite | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_DEEPSEEK_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts --no-watch` | `DEEPSEEK_API_KEY=… vitest …`; importing keys into `db/test.db` | REQ-005, REQ-006 |
| Isolated instance | `AUTOBYTEUS_TEST_VAULT=… pnpm --silent isolated-app start --build` | `script -q /dev/null pnpm secrets:import … && isolated-app restart` | REQ-012 |
| autobyteus-ts live test | see code block 1 | `const apiKey = process.env.DEEPSEEK_API_KEY; describe.skip`; `new DeepSeekLLM(model)` crashing | REQ-014 |
| Probe | see code block 2 | Reading `~/.autobyteus/server-data/.env` | REQ-004, REQ-006 |
| Startup log | `Secret vault: test vault /Users/x/.autobyteus-test/vault (read-only)` | Silent switch | REQ-016 |

```ts
// 1. autobyteus-ts live test. Run with:
//    AUTOBYTEUS_TEST_VAULT=... RUN_LIVE_PROVIDER_TESTS=1 pnpm -C autobyteus-ts test tests/integration/llm/api/deepseek-llm.test.ts
const live = liveProviderTest(LLMProvider.DEEPSEEK);   // gate + "missing capability" skip / strict
live.it('completes a prompt', async () => {
  const llm = new DeepSeekLLM(model, new LLMConfig()); // key comes from the test vault
  const response = await llm.sendUserMessage(new LLMUserMessage({ content: 'Say hi' }));
  expect(response.content.length).toBeGreaterThan(0);
});
```

```ts
// 2. Investigation probe, run as a Vitest file under autobyteus-ts (its setup installs the default)
const llm = await LLMFactory.createLLM('deepseek-v4-flash');
console.log((await llm.sendUserMessage(new LLMUserMessage({ content: 'ping' }))).content);
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Env key if present, else test vault | Habit | Rejected | Vault only; credential env stripped |
| Keep per-DB importer instructions for tests/instances | Existing docs | Rejected | Selector |
| Transfer/copy of keys into run DBs (SR-005) | Earlier draft | Rejected | Read-only selection; no copies at all |
| Silent default test vault when the selector is unset | Convenience | Rejected (user, DEC-010) | Explicit selector |

## Derived Layering (If Useful)

N/A

## Change / Refactor Sequence

1. Server secret-management core:
   - `SecretVaultStore` interface (repository implements it; service constructor type);
   - `ReadOnlySecretVaultStore`; `verifyEstablished`; `READ_ONLY` error;
   - `SecretVaultSource` + `selectSecretVaultSource`; `SecretVaultRuntime.initialize(source)`;
   - extract `WritableVaultTarget`; importer decision port (TTY behavior unchanged).
   - Unit tests: source decision (unset / set / real app data), read-only store (no writes; bytes unchanged), verify-only (key mismatch → unavailable), runtime log line.
2. `test-vault/` location + commands + CLI + root script.
   - Unit tests: setup non-interactive (skip/replace), refusal, status, remove, canary scan (a fake key never appears in output).
3. Startup sites pass the selected source. Integration test: a server with the selector reports configured providers, and a Settings save returns `SECRET_VAULT_READ_ONLY`.
4. autobyteus-ts default slot + optional parameters (31 files, mechanical). Unit tests: explicit resolver wins; default used when absent; no default → `MissingApiKeyError`.
5. `test-support/test-vault` + autobyteus-ts setup/alias/script; repair the 18 live files; remove `provider-access.ts`.
6. Server E2E: stripping for `tests/e2e`; 8 suites use normal init; delete the helper; compaction empty-selection fix; forward the selector in `createSanitizedTestEnvironment`; preflight prints the source.
7. Electron `buildServerProcessEnv` forwards the selector under `isolated-baseline` (+ unit test).
8. Docs and skills.
9. Validation:
   - deterministic suites;
   - one live autobyteus-ts DeepSeek test;
   - `test:e2e:real -- --scenarios=deepseek.llm`;
   - one gated server suite;
   - an isolated instance smoke (Settings shows providers configured; save refused);
   - hash of the test vault unchanged;
   - a server on the real app data path ignores the selector (unit-level; never start against real data).

## Key Tradeoffs

- **A selector read by the production server vs a test-only harness.** It matches the database model the user chose, and product code paths stay identical in tests. The cost is a new credential-source input in production code, mitigated by the real-app-data guard, read-only access and the log line.
- **Read-only selection vs copying keys.** No copies anywhere, so nothing accumulates in test DBs (the user's "dangerous" concern). Settings saves are refused while selected, which is acceptable for tests.
- **Optional default resolver in autobyteus-ts.** It makes "set the variable and go" true for the core library. It is global state, so it is constrained by a dependency rule (only test setup sets it) and covered by unit tests.

## Risks

- R-A: a Vitest self alias may not unify `autobyteus-ts` class identity. Mitigation: subpath aliases; escalation trigger.
- R-B: `node:sqlite` is experimental. It is already used in the product (inspection service).
- R-C: a test DB with legacy custom-provider data plus the selector gets a vault-removal warning (read-only). Expected and documented.
- R-D: if a developer exports the selector globally, deterministic in-process E2E also sees real keys, and discovery may make network calls. Docs recommend setting it per command or per live-testing shell; it never affects the desktop app on real data.
- R-E: on Windows/Linux the real data dir is the same canonical `~/.autobyteus/server-data` (A-20 `appDataPaths.ts`). Implementation confirms there are no other OS-specific production roots.

## Guidance For Implementation

- Stable, value-free codes: `TEST_VAULT_NOT_FOUND`, `TEST_VAULT_LOCATION_INVALID`, `TEST_VAULT_LOCATION_FORBIDDEN`, `TEST_VAULT_UNAVAILABLE`, `TEST_VAULT_IGNORED_ON_REAL_APP_DATA`, `SECRET_VAULT_READ_ONLY`, and the missing-capability skip reason naming the SecretId and `pnpm test-vault setup`.
- When the selector names a missing or invalid vault, server startup fails clearly with `SECRET_VAULT_INITIALIZATION_FAILED` + `TEST_VAULT_NOT_FOUND`. A selected test vault must never silently fall back to the application vault.
- Add `AUTOBYTEUS_TEST_VAULT`, `RUN_LIVE_PROVIDER_TESTS` and `AUTOBYTEUS_LIVE_STRICT` to the unit/integration `TEST_ENVIRONMENT_ALLOWLIST` only where a test needs them. Deterministic unit/integration suites should not inherit the selector.
- TESTING.md (REQ-013, SR-007):
  - a "Test vault" section whose first instruction is to set `AUTOBYTEUS_TEST_VAULT` (exact `export` line, setup and status commands, "never from `.env` or env vars");
  - Rule 4 replaced by "Real provider keys come only from the test vault: set `AUTOBYTEUS_TEST_VAULT`";
  - every real-key command example includes the variable.
- The `AGENTS.md` entry (about 4 lines):
  - "Real provider keys for tests and investigation come from the test vault. Set `AUTOBYTEUS_TEST_VAULT` (see `pnpm test-vault status`) and run as usual; normal code uses it automatically.
  - Never read keys from `.env` or the environment.
  - See TESTING.md#test-vault."
- Live verification spends a few cheap calls (DeepSeek). Do not run the Anthropic caching suite unless the user asks.
