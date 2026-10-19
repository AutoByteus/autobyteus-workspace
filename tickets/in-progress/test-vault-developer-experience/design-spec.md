# Design Spec: Test Vault Selected Like A Database

## Solution And Approval Basis

- Current solution revision ID: `SR-008`
- Approved requirements baseline / revision, who approved, and approval reference:
  - Baseline: `requirements-doc.md` @ SR-008.
  - SR-006 and SR-007 were approved by the user in the Solution Designer conversation on 2026-10-19: the database model, the production default, and TESTING.md telling runners to set the variable.
  - The SR-008 clarifications (REQ-004 refused folders, REQ-005 live opt-in for workspace harnesses, REQ-016 no-fallback failure, AC-017) are decided within that direction; the user was informed on 2026-10-19.
- Behavior-defining supplements and their approval references: `test-vault-evaluation-report.md` @ SR-008 (§5.0, §5.1), same approval
- Design status: `Ready` (revision answering architecture review ARCH-REV-001: AR-001..AR-006)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/investigation-notes.md` (W-*, F-*, A-01..A-25)
- Authorities read (design reading gate; 2026-10-19), from the solution-designer skill: `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`; project `DESIGN.md` (repository root); `autobyteus-server-ts/AGENTS.md`; `autobyteus-web/AGENTS.md`. `references/design-examples.md` was not needed.
- Project design-principle conflicts or discrepancies: None. The documented `secret_management.md` contract ("no `SECRET_STORE_DATABASE_URL` … default-versus-E2E Store"; "no test wrapper / never a test-runner fallback") is revised for the test vault with the user's approval (DEC-001) and updated in this change.
- Review history: ARCH-REV-001 failed SR-006/SR-007 (AR-001..AR-004 blocking). The response to each finding is in the table at the end of this document.

## Current-State Read

- Production selects the application DB with `DATABASE_URL`. The vault is two tables in that DB plus `<db>.secret.key` (A-01).
- Startup opens it at two sites (`server-runtime.ts:169`, `start-standalone-application-host.ts:145`) via `getSecretVaultRuntime().initialize(databaseLocation)`.
- The bootstrap folds every vault problem into a health value, so `initialize` never throws for vault problems today (ARCH-REV-001).
- Product lookups go through `SecretManagementService` and the resolvers (A-04, A-05).
- `AppConfig.get` reads `process.env`, then the data-dir `.env` (A-19).
- Electron:
  - production launches pass the full caller env (`inherit-caller`) with data dir `~/.autobyteus/server-data`;
  - isolated launches pass only a baseline (`isolated-baseline`);
  - `getProtectedProductionPaths()` = `~/.autobyteus` + Electron `userData`/`sessionData`/`logs`/`crashDumps`; the app name is `autobyteus` (A-20, A-23).
- Workspace test harnesses:
  - `test-environment-isolation.ts` (server unit/integration strip env; E2E keeps it);
  - `createSanitizedTestEnvironment`/`startBuiltTestServer` (built test servers, allowlisted env);
  - live suites init the in-process runtime through the env→vault helper;
  - 6 server test files call `runtime.initialize(location)` directly (A-24);
  - 22 web probes spawn backends with `...process.env` and have no shared owner (A-25).
- autobyteus-ts clients/factories (31 files) require an explicit `ProviderApiKeyResolver` (A-21).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale and supporting evidence:
  - server secret-management (source selection, read-only store, verify-only bootstrap, read-only test-vault entry, commands, CLI, resolver split);
  - two startup sites;
  - autobyteus-ts (default slot, 31 signatures, test setup);
  - Electron env policy;
  - `test-support` (test-vault policy, live-e2e);
  - server tests (setup, 8 live suites, 6 init call sites);
  - 18 autobyteus-ts live files;
  - 1 web probe;
  - docs and skills.
  - About 85 files in five areas.
- Architectural risk: `High`
- Risk rationale and supporting evidence: a production-code credential-source input (security boundary), shared contracts (store interface, `initialize(source)`, autobyteus-ts public signatures), and cross-package Electron env policy. Confirmed by ARCH-REV-001.
- Escalation trigger if implementation discovers new impact, to be reported as Design Impact:
  - any vault write outside setup/remove;
  - a key in env, argv, logs or evidence;
  - a deterministic suite's result changing with the selector exported (AC-017);
  - a production path that the REQ-004 list or the server guard misses;
  - Prisma loaded in the autobyteus-ts test path;
  - a startup app-data migration needing vault writes on a fresh DB while the test vault is selected.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| A-01, A-02 | `persistence/secret-vault-repository.ts`; `services/secret-vault-inspection-service.ts` | Prisma-global repository; read-only `node:sqlite` precedent | `ReadOnlySecretVaultStore` over `node:sqlite` | — |
| A-03 | `crypto/secret-vault-crypto.ts` | Not path-bound | Open from any directory | — |
| A-04, A-05 | service; resolver | Repository type-only in the service; the resolver statically imports `secret-vault-runtime` (Prisma) | Reuse the service; split the resolver class from the runtime-bound factories (AR-005) | — |
| A-06 | `bootstrap/secret-vault-bootstrap.ts` | Verify sits under a Prisma lock; the file imports repository types only | `verifyEstablished(store)`; stays Prisma-free | — |
| A-18 | two startup sites | Single init path | Pass `SecretVaultSource` | — |
| A-19 | `AppConfig.get` | env, then `.env` | One selector key | — |
| A-20, A-23 | `electron/server/serverRuntimeEnv.ts`; `electron/main.ts:15-23` `getProtectedProductionPaths`; `autobyteus-web/package.json` name `autobyteus`; `~/Library/Application Support/autobyteus`, `~/Library/Logs/autobyteus` exist on this machine | Production env inheritance; protected path set | Server guard on `~/.autobyteus/server-data`; REQ-004 refused set; isolated forwarding | — |
| A-21 | autobyteus-ts 31 files | Explicit resolver required | Optional parameter + default slot | — |
| A-22 | custom-provider migration | Removal only for legacy data; failure → warning | Read-only test vault yields at most a warning | — |
| A-24 | `grep runtime.initialize autobyteus-server-ts/tests` (6 files) + env helper (8 suites) | In-process suites initialize the runtime themselves | They pass an explicit source: application (deterministic) or the test-support live initializer | — |
| A-25 | `autobyteus-web/tests/e2e/*.mjs` (22 spawn `dist/app.js` with `...process.env`); `provider-api-key-save-probe.mjs` saves keys | No shared probe env owner | The key-saving probe strips the selector; others: residual R-D | — |
| A-26 | `test-support/live-e2e/live-e2e-harness.ts:1195-1232` | The real-E2E harness initializes an in-process runtime and asks the server's GraphQL for vault status | The harness uses the live initializer; preflight reflects the server's selected source automatically | — |
| ARCH-REV-001 P-001 | review report | Exported selector + `pnpm test:e2e` reaches deterministic servers | Live opt-in at the harnesses (DS-005) | — |

## Intended Change

- `AUTOBYTEUS_TEST_VAULT=<directory>` selects the test vault the way `DATABASE_URL` selects a database. Every key lookup in such a server then reads `<dir>/test-vault.db` + `.secret.key`, read-only. The vault runtime makes the choice once at startup.
- When the variable is unset, or the server runs on the real `~/.autobyteus/server-data`, the server uses its own DB vault as today and logs its choice.
- A selected vault that cannot be used stops startup.
- Inside the workspace's own test harnesses, the selector applies only to runs that opt in through their existing live gate, so deterministic results never change.
- autobyteus-ts live runs get an optional default resolver from their test setup.
- `pnpm test-vault setup|status|remove` manages the vault.
- Env-sourced test credentials are removed. TESTING.md and `AGENTS.md` tell runners to set the variable.

## Change Scope (Mandatory)

- **In scope:** UC-001..UC-009, REQ-001..REQ-016. Areas:
  - server `src/secret-management/`:
    - `secret-vault-source.ts`, runtime, store interface + read-only store, bootstrap `verifyEstablished`, error codes;
    - `test-vault/` (location, read-only entry, commands);
    - `cli/test-vault-cli.ts`;
    - resolver split;
    - importer decision port + extracted `WritableVaultTarget`;
  - the two startup sites;
  - `autobyteus-ts/src` (default slot, optional resolver parameters);
  - autobyteus-ts tests (setup, vitest alias, `test` script, 18 live files);
  - `test-support/test-vault/` (new: selection capture, live initializer, autobyteus-ts installer, gate/skip/strict, credential stripping, classifier);
  - `test-support/live-e2e/` (built-server `testVaultSetting` option, runner forwarding and vault-source line, harness live initializer, compaction empty-selection fix);
  - server tests (setup capture/strip, 8 live suites, 6 init call sites, AC-017 regression);
  - `autobyteus-web/electron/server/serverRuntimeEnv.ts` (isolated forwarding);
  - `autobyteus-web/tests/e2e/provider-api-key-save-probe.mjs` (strip the selector);
  - root `package.json`;
  - docs and skills (`AGENTS.md`, `TESTING.md`, `secret_management.md`, server README, root README, `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md`, `autobyteus-ts/docs/nodejs_architecture.md`).
- **Deliberately left alone:**
  - production vault behavior when unset;
  - Settings UI (existing typed errors surface `SECRET_VAULT_READ_ONLY`);
  - general `pnpm secrets:import` behavior;
  - `test:e2e:real` runtime-root policy;
  - CLI-login live tests;
  - the other 21 web probes (residual R-D);
  - `.env.test`;
  - old stores in production data and existing worktree test DBs (DEC-008);
  - importer aliases.
- **Follow-ups:**
  - FU-01: redundant env save/restore in `token-usage-model-list.e2e.test.ts`.
  - FU-02: the live desktop app exports legacy plaintext credential aliases into agent shells.
  - FU-03: rebuild on every `secrets:import`/`test:e2e:real*`/`test-vault` call.
  - FU-04: existing worktree `db/test.db` files still hold real keys (user deletes).
  - FU-05: give the 22 web probes one shared backend-env owner. This would let all of them drop the selector unless live (R-D).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001, 007 | Operational | REQ-001..004; AC-001..004 | `pnpm test-vault setup\|status\|remove` | TTY importer per DB (W-01..04) | Non-interactive setup; status; remove; forbidden locations refused | DS-001 |
| BEH-002, 008 | Operational | REQ-005, 007, 010, 012, 016; AC-006, 010, 015, 016 | Server started with the variable (`test:e2e:real`, isolated instance, manual) | Own DB vault; keys imported per DB | Runtime opens the test vault read-only; unset or real data → own vault; unusable → startup fails | DS-002 |
| BEH-004 | Operational | REQ-005, 006; AC-007, 016 | Gated in-process server live suite or live built server | env→vault helper | Live initializer / `testVaultSetting` option selects the test source | DS-002, DS-005 |
| BEH-003, 009 | Operational | REQ-005, 006, 008, 014; AC-005, 013 | autobyteus-ts live run (variable + `RUN_LIVE_PROVIDER_TESTS=1`) | Env vars; stale constructors | Setup installs the default resolver; clients fall back to it | DS-003 |
| BEH-005 | Contract | REQ-005, 006, 011; AC-009, 011, 017 | Any test process | Inherited keys reach tests; selector would reach deterministic harnesses | Credential vars stripped; deterministic harnesses never apply the selector | DS-004, DS-005 |
| BEH-006 | Contract | REQ-009; AC-008 | Gate on, key missing/refused | Silent skip; refusal passes | Reasoned skip; strict fails | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `test-vault-evaluation-report.md` | Approved usage model (§5.0/§5.1) | All | The experience this design realizes | Final @ SR-008 |
| `design-review-report.md`, `architecture-review-revision-record.md` | ARCH-REV-001 | AR-001..006 | Findings this revision answers | Reviewer-owned |
| `context/55.png`, `walkthrough/*.log` | Evidence | F-* | Current state | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement`
- Current design issue found: `Yes`
- Structural triggers that fire:
  - **Repeated coordination.** Test credential sourcing is decided in four places (F-01). It moves to one source decision in the vault runtime, plus one autobyteus-ts default slot.
  - **Legacy cleanup.** The env→vault helper, env gates, per-DB import instructions and the success-returning skip are replaced cleanly.
  - **Capability reuse.** The service, resolvers, catalog, crypto and importer are reused; no test-only resolution path. The F-16 rationale is met: product code resolves identically.
  - **Authoritative boundary.** Only `selectSecretVaultSource` decides the source. Only the four harness owners in DS-005 decide whether a test run applies the selector.
- Root cause classification: `Duplicated Policy Or Coordination` and `Boundary Or Ownership Issue`
- Refactor needed now: `Yes`
- Evidence: F-01, F-02, F-15, A-01..A-26, ARCH-REV-001.
- Design response: the `SecretVaultSource` union and `initialize(source)`; the `SecretVaultStore` interface + read-only store; a Prisma-free read-only test-vault entry; the resolver split; the autobyteus-ts default slot; harness opt-in owners.
- Intentional deferrals and residual risk: FU-01..FU-05; R-D (web probes).

## Terminology

- **Test vault**: an ordinary application vault DB/key pair (`test-vault.db`, `test-vault.db.secret.key`) in the directory named by `AUTOBYTEUS_TEST_VAULT`, created by `pnpm test-vault setup`.
- **Selector**: `AUTOBYTEUS_TEST_VAULT`, an absolute directory. It names a location and never carries a secret.
- **Vault source**: `application` (inside the server's own DB; default) or `test` (the test vault, read-only).
- **Live opt-in**: a test run's existing live gate (`RUN_LIVE_PROVIDER_TESTS`, `RUN_*_E2E`, `test:e2e:real`), which is the only way workspace harnesses apply the selector.
- **Forbidden vault location** (REQ-004): under `~/.autobyteus`, or under the desktop app's OS data roots for app name `autobyteus`:
  - macOS `~/Library/Application Support/autobyteus`, `~/Library/Logs/autobyteus`;
  - Linux `${XDG_CONFIG_HOME:-~/.config}/autobyteus`;
  - Windows `%APPDATA%\autobyteus`.
- **Real app server data dir** (REQ-016): exactly `~/.autobyteus/server-data` after realpath.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope:
  - `tests/e2e/helpers/live-runtime-secret-vault-helpers.ts`;
  - credential env reads/gates in 18 autobyteus-ts files and 2 server suites (incl. APC-E2E-008's direct `fetch`);
  - `autobyteus-ts/tests/integration/helpers/provider-access.ts` success-return skip;
  - per-DB/per-instance import instructions for tests;
  - the `script` recipe;
  - env-key command examples;
  - the `.env.test contains API keys` line;
  - the obsolete `secret_management.md` paragraphs.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.
  - No "env key if present" path.
  - No fallback from a selected test vault to the application vault.
  - The autobyteus-ts default slot is empty unless live test setup fills it.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject:
  - new: the test vault (an ordinary current-schema application DB + key);
  - existing: per-worktree test DBs;
  - production: untouched.
- Relevant change: none to schemas or formats.
- Normal reader/writer behavior: setup writes through the normal importer path (migrations + bootstrap); consumers read `secret_entries`/`secret_encryption_metadata` read-only, with columns validated as in the inspection service.
- Required semantics: domain/verifier checked on open; consumers never migrate the vault, so worktrees of different versions can read it.
- Constraints: dir `0700`, DB/key `0600`; never in a forbidden location.
- Decision:
  - production: `Not Affected`;
  - worktree test DBs: `Discard or Rebuild` (left for the user, FU-04);
  - test vault: new data.
- Rationale: no transformation is required. Setup re-run from an older worktree against a newer vault is observed in implementation (P-002).
- Supports: REQ-007, QR-005.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 007 | `pnpm test-vault setup\|status\|remove` | Vault created/reported/removed; setup prints the setting | `TestVaultCommands` | One-time provisioning |
| DS-002 | Primary End-to-End | BEH-002, 004, 008 | Server startup with config (incl. isolated instance, `test:e2e:real` server, live in-process init) | Product resolvers read the selected vault | `selectSecretVaultSource` + `SecretVaultRuntime` | "Set one variable" |
| DS-003 | Primary End-to-End | BEH-003, 006, 009 | autobyteus-ts live test/probe process start | Provider call with a key from the test vault | autobyteus-ts default slot, filled by `test-support/test-vault` | autobyteus-ts automatic use |
| DS-004 | Bounded Local | BEH-005 | Test process start | Credential variables deleted | Test setups | No key from env |
| DS-005 | Bounded Local | BEH-005, 004 | Test process start / harness launch | The selector is applied only for live opt-in runs | Harness owners (server test setup, `startBuiltTestServer`, autobyteus-ts setup, key-saving web probe) | Deterministic results unchanged (AC-017) |

## Primary Execution Spine(s)

- DS-001:
  `User → pnpm test-vault setup → TestVaultLocation (selector or default; forbidden → refuse) → LocalEnvironmentSecretImportService (file source, TestVaultTargetDecision) → WritableVaultTarget → saveBatch → vault → prints AUTOBYTEUS_TEST_VAULT=<dir>`
- DS-002:
  `Startup → AppConfig (selector, appDataDir) → selectSecretVaultSource → SecretVaultRuntime.initialize(source)`, which then branches:
  - `[test]` `openReadOnlyTestVault(location)`: `ReadOnlySecretVaultStore` + `verifyEstablished` → `SecretManagementService`
  - `[application]` existing Prisma path

  After either branch: `product resolvers → provider SDK`
- DS-003:
  `autobyteus-ts tests/setup.ts → stripCredentialEnvironment → [selector && RUN_LIVE_PROVIDER_TESTS] dynamic import test-support installTestVaultDefaultResolver → openReadOnlyTestVault → setDefaultProviderApiKeyResolver(new SecretManagementProviderApiKeyResolver({kind:'llm'}, () => service))`, then
  `test: new DeepSeekLLM(model, config) → resolveProviderApiKeyResolver(undefined) → default → provider`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Setup resolves the location (forbidden ones refused) and runs the existing importer service non-interactively (the decision port confirms because the target *is* the validated test vault). It sets owner-only permissions and prints the setting. `status` uses the read-only entry; `remove` deletes the pair and sidecars. | location, importer, writable target | `TestVaultCommands` | source privacy (existing), forbidden-location policy |
| DS-002 | At startup the server decides its source once. A set selector on a non-real data dir gives `test`, which opens read-only and fails startup if it cannot (failure rule below). Otherwise it gives `application`, as today, with a notice if the selector was ignored on real data. It logs the choice. | config, source decision, runtime | `selectSecretVaultSource` / `SecretVaultRuntime` | log line; `READ_ONLY` error mapping |
| DS-003 | In a live autobyteus-ts run with the selector, setup lazily loads the Prisma-free read-only entry and installs a default resolver. Clients built without a resolver use it. A missing key → `MissingApiKeyError` → reasoned skip (strict: failure). | setup, default slot, resolver | default slot + test policy | gate, classifier |
| DS-004 | Before modules load, `*_API_KEY` and importer alias names are deleted from `process.env` (autobyteus-ts setup; server setup for all test folders). | setup | test setups | — |
| DS-005 | The selector reaches code under test only through live opt-ins (detail below). | harness owners | — | AC-017 regression |

DS-005 opt-in points:
- **Server test setup** (`test-environment-isolation.ts`, all server test files) captures the selector into `test-support/test-vault` and deletes it from `process.env`. Deterministic in-process code therefore never sees it, and live suites read it through `initializeLiveServerVault()`.
- **`startBuiltTestServer`** forwards a selector only when its caller passes `testVaultSetting`: `test:e2e:real` and live suites.
- **autobyteus-ts setup** installs its default only with `RUN_LIVE_PROVIDER_TESTS=1`.
- **The key-saving web probe** removes the selector from its backend env.

Servers started directly (isolated instances, manual) honor the selector as the user asked.

## Spine Actors / Main-Line Nodes

`TestVaultLocation`, `TestVaultCommands`, `openReadOnlyTestVault`, `selectSecretVaultSource`, `SecretVaultRuntime`, `ReadOnlySecretVaultStore`, `SecretVaultBootstrap.verifyEstablished`, `SecretManagementService` (reused), `SecretManagementProviderApiKeyResolver` (reused, Prisma-free after the split), autobyteus-ts default slot, `test-support/test-vault`.

## Ownership Map

- `TestVaultLocation` (server):
  - owns parsing the selector (absolute, no symlink) and the setup default `~/.autobyteus-test/vault`, plus the file names;
  - owns two separate, named predicates:
    - `isForbiddenTestVaultLocation(path, {platform, homeDir, env})`: prefix match against the REQ-004 set, after realpath of the existing ancestor;
    - `isRealAppServerDataDir(dir, {homeDir})`: equality with `~/.autobyteus/server-data` after realpath.
  - Both are pure and injectable for tests on every OS.
- `selectSecretVaultSource({ testVaultSetting, appDataDir, databaseLocation })` (server):
  - pure;
  - returns `{kind:'application', location, notice?}` or `{kind:'test', directory}`;
  - `notice = TEST_VAULT_IGNORED_ON_REAL_APP_DATA` when applicable.
- `SecretVaultRuntime.initialize(source)`:
  - owns opening the selected source and logging `Secret vault: test vault <dir> (read-only)` / `Secret vault: application database`;
  - **failure rule (AR-004):**
    - `test` source: `initialize` **throws** `SecretVaultError` and opens nothing in these cases. Both startup sites then take their existing fatal path (`SECRET_VAULT_INITIALIZATION_FAILED`), and there is no degraded mode and no fallback.
      - selector not absolute → `TEST_VAULT_LOCATION_INVALID`;
      - forbidden location → `TEST_VAULT_LOCATION_FORBIDDEN`;
      - DB or key file absent → `TEST_VAULT_NOT_FOUND` (message names `pnpm test-vault setup`);
      - verification result not `READY` (unsafe permissions, locked, corrupt, mismatched key, incompatible format) → `TEST_VAULT_UNAVAILABLE` with the health state.
    - `application` source: unchanged (health-based, never throws for vault problems).
- `openReadOnlyTestVault(directory)` (server, `test-vault/read-only-test-vault.ts`, **Prisma-free**):
  - validates the location, opens `ReadOnlySecretVaultStore`, reads the key, runs `verifyEstablished`;
  - returns a `SecretManagementService` (READY) or throws per the failure rule;
  - used by the runtime (test source), `TestVaultCommands.status`, and test-support.
- `ReadOnlySecretVaultStore`: owns the `node:sqlite` read-only/query-only reads. Writes throw `SecretVaultError('READ_ONLY', …, 'SECRET_VAULT_READ_ONLY')`.
- `SecretVaultBootstrap.verifyEstablished(store, location)`: verify without lock or write, reusing the existing validators.
- `TestVaultCommands` (server, `test-vault/test-vault-commands.ts`): setup (importer + decision port + `WritableVaultTarget` + permissions + setting line), status (via `openReadOnlyTestVault`; reports not-found / unavailable as values), remove.
- Resolver split (AR-005):
  - `resolution/secret-management-provider-api-key-resolver.ts` keeps only the class, with `managementProvider` **required** and no runtime import;
  - `resolution/runtime-provider-api-key-resolvers.ts` holds `createLlm…`/`createMedia…`/`createLlmMetadata…` bound to `getSecretVaultRuntime()` (4 call sites update imports).
- autobyteus-ts `secrets/provider-api-key-resolver.ts`:
  - `setDefaultProviderApiKeyResolver(r | null)`, `resolveProviderApiKeyResolver(explicit?)`;
  - with no default, resolution throws `MissingApiKeyError(provider)`.
- `test-support/test-vault` owns test policy:
  - `captureTestVaultSelection()` (server setup);
  - `initializeLiveServerVault(databaseLocation, appDataDir)` (live in-process suites and the real-E2E harness);
  - `capturedTestVaultSetting()` (for `startBuiltTestServer`);
  - `installTestVaultDefaultResolver()` (autobyteus-ts, lazy);
  - `liveProviderTest(provider, slot?)` (gate, reasoned skip, strict `AUTOBYTEUS_LIVE_STRICT=1`);
  - `stripCredentialEnvironment()`;
  - the moved classifier.
- `test-support/live-e2e`:
  - `startBuiltTestServer({ …, testVaultSetting? })` forwards only that explicit value;
  - `run-live-e2e.mjs` passes `process.env.AUTOBYTEUS_TEST_VAULT` and prints `Vault: test vault <dir>` or `Vault: run database`;
  - the harness uses `initializeLiveServerVault`.
- Electron `buildServerProcessEnv`: under `isolated-baseline`, forwards `AUTOBYTEUS_TEST_VAULT` when present. `inherit-caller` already passes everything; the server guard protects real data.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `pnpm test-vault <setup\|status\|remove>` → `autobyteus-server-ts/dist/secret-management/cli/test-vault-cli.js` | `TestVaultCommands` | One discoverable command | Location policy, crypto |
| `test-support/test-vault/test-vault.ts` | test policy (governing) | One import for test setups/suites | Vault format, location rules |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/helpers/live-runtime-secret-vault-helpers.ts` | Env→vault (REQ-006) | `initializeLiveServerVault` | In This Change | 8 suites |
| Credential env reads/gates (18 autobyteus-ts files; `agent-initiated-collaborators`; `autobyteus-anthropic-prompt-caching-live` incl. APC-E2E-008's `fetch`) | REQ-006 | Default resolver / runtime vault; `liveProviderTest`; APC-E2E-008 resolves via the product resolver | In This Change | |
| `autobyteus-ts/tests/integration/helpers/provider-access.ts` | Success-return skip (REQ-009) | test-support classifier + policy | In This Change | |
| Default `getSecretVaultRuntime()` parameter in `SecretManagementProviderApiKeyResolver` | Couples the class to Prisma (AR-005) | Explicit provider; runtime-bound factories file | In This Change | |
| Obsolete docs (see Legacy Removal Policy) | Replaced | TESTING section + rule, `AGENTS.md` entry, revised `secret_management.md` | In This Change | |
| `token-usage-model-list` env save/restore | Redundant | — | Follow-up FU-01 | |

## Return Or Event Spine(s) (If Applicable)

N/A. All paths are synchronous call/return.

## Bounded Local / Internal Spines (If Applicable)

- `SecretVaultRuntime` with the test source:
  `initialize(test) → TestVaultLocation checks (invalid/forbidden → throw) → DB/key exist? (no → throw NOT_FOUND) → DatabaseSync(readOnly, query_only) → read key → verifyEstablished (not READY → throw UNAVAILABLE) → serve → close → zeroize key, close DB`.
  This matters because it implements the one failure rule and releases the key deterministically.
- The DS-005 opt-in local flow, for a server test file:
  `setup: captureTestVaultSelection() (delete from env) → deterministic code: no selector → application source; live suite (gate on): initializeLiveServerVault() / startBuiltTestServer({testVaultSetting: capturedTestVaultSetting()}) → test source`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Forbidden-location and real-data predicates | DS-001, DS-002 | `TestVaultLocation` | REQ-004 / REQ-016 | Security | Drift if duplicated |
| Source privacy checks | DS-001 | `TestVaultCommands` | Existing reader | Reuse | — |
| Credential stripping | DS-004 | test setups | Delete credential vars | REQ-006 | — |
| Access-error classification | DS-003 | test policy | Reasons | REQ-009 | — |
| Vault-choice log line | DS-002 | runtime | Location only | REQ-016 | — |

## Ownership Boundaries

- Only `selectSecretVaultSource` decides the source inside a server; callers pass config.
- Only the DS-005 harness owners decide whether a **test run** applies the selector.
- Only server secret-management knows the vault format and locations.
- autobyteus-ts `src` knows only the default slot.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use It | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `selectSecretVaultSource` + `SecretVaultRuntime.initialize(source)` | `openReadOnlyTestVault`, Prisma repository | startup sites, test-support live initializer, 6 in-process init call sites (application) | Test code constructing stores or reading the selector itself | Extend the source input |
| `openReadOnlyTestVault` | read-only store, verify, service | runtime, commands, test-support | Tests opening SQLite or the key file | Add a method |
| `TestVaultCommands` | importer, location, remove | CLI | Scripts writing the vault | — |
| `test-support/test-vault` | capture, live initializer, installer, gates | server tests, autobyteus-ts setup, live-e2e | Suites reading `AUTOBYTEUS_TEST_VAULT` directly | Add a helper |
| autobyteus-ts `resolveProviderApiKeyResolver` | default slot | all clients/factories | Clients reading env or a global directly | — |

## Dependency Rules

- Allowed:
  - startup sites → `selectSecretVaultSource`;
  - `test-support/test-vault` → server `test-vault/read-only-test-vault.ts`, `secret-vault-source.ts`, runtime, and the resolver class; autobyteus-ts `src` (setter);
  - autobyteus-ts `tests/setup.ts` → `test-support/test-vault` **by dynamic import only when the selector and `RUN_LIVE_PROVIDER_TESTS` are set**;
  - Electron → the selector name only;
  - `test-vault-cli.ts` → `test-vault-commands.ts`.
- Forbidden:
  - `test-vault/read-only-test-vault.ts` (and anything autobyteus-ts setup loads) importing `repository_prisma`, `secret-vault-runtime`, migrations or the importer;
  - `autobyteus-ts/src` → server or test-support;
  - `autobyteus-web` → server or test-support modules;
  - reading credential env aliases for test keys;
  - test-vault writers other than `TestVaultCommands`;
  - production code installing the autobyteus-ts default;
  - deterministic harness code forwarding the selector.

## Interface Boundary Mapping

| Interface / API / Command | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AUTOBYTEUS_TEST_VAULT=<abs dir>` | vault source | Select the test vault | Absolute directory | `AppConfig.get` (env, then `.env`) |
| `pnpm test-vault setup --source <abs file> [--replace]` | test vault | Create/update; print the setting | Absolute path | Target = selector dir or default |
| `pnpm test-vault status` / `remove` | test vault | Report / delete | — | Value-free |
| `selectSecretVaultSource(input)` | source | Decide | `{testVaultSetting?, appDataDir, databaseLocation}` | Pure |
| `SecretVaultRuntime.initialize(source)` | runtime | Open; failure rule | `SecretVaultSource` union | Importer and deterministic call sites pass `application` |
| `openReadOnlyTestVault(directory)` | test vault | Read-only service | Absolute directory | Prisma-free |
| autobyteus-ts `setDefaultProviderApiKeyResolver`, `resolveProviderApiKeyResolver` | default slot | Test-only default | — | |
| `startBuiltTestServer({…, testVaultSetting?})` | built test server | Forward the selector only when given | string \| undefined | Default: none |
| test-support `captureTestVaultSelection`, `capturedTestVaultSetting`, `initializeLiveServerVault`, `installTestVaultDefaultResolver`, `liveProviderTest`, `stripCredentialEnvironment` | test policy | See ownership map | — | |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `selectSecretVaultSource` | Yes | Yes | Low | — |
| `AUTOBYTEUS_TEST_VAULT` | Yes | Yes | Medium (inherited) | Real-data guard; harness opt-in; log line |
| default slot | Yes | Yes | Medium (global) | Live-setup-only rule + tests |
| `startBuiltTestServer.testVaultSetting` | Yes | Yes | Low | Explicit value, never read from env |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Selector | `AUTOBYTEUS_TEST_VAULT` | Yes | Low | — |
| Source decision | `selectSecretVaultSource`, `SecretVaultSource` | Yes | Low | — |
| Read-only open | `openReadOnlyTestVault` | Yes | Low | — |
| Location predicates | `isForbiddenTestVaultLocation`, `isRealAppServerDataDir` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability | Decision | Why | If New, Why |
| --- | --- | --- | --- | --- |
| Resolve keys | Service, resolvers, catalog, crypto | Reuse | Identical product path | — |
| Choose the vault | `SecretVaultRuntime.initialize` | Extend (source union) | Single opener | — |
| Read-only access | Inspection technique | Extend (new store) | Prisma is process-global | — |
| Verify | Bootstrap | Extend | Validators there | — |
| Import a file | Importer service | Reuse | Same validation | — |
| Protected paths | Electron `getProtectedProductionPaths` | Mirror in server (pure; no Electron dependency) | The server CLI cannot call Electron | Separate predicate, same set |
| Env isolation | Server `test-environment-isolation.ts`; `createSanitizedTestEnvironment` | Extend | Owners already exist | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Decision |
| --- | --- | --- | --- |
| server `secret-management/` | source, read-only store, test-vault entry/commands, CLI, resolver split | DS-001, DS-002 | Extend + Create New (`test-vault/`) |
| server startup | pass the source | DS-002 | Extend |
| autobyteus-ts `src/secrets/` + clients | default slot | DS-003 | Extend |
| `test-support/test-vault/` | test policy | DS-003..005 | Create New |
| `test-support/live-e2e/` | opt-in forwarding, vault line, harness init | DS-002, DS-005 | Extend |
| server tests | setup capture, suites, init call sites | DS-004, DS-005 | Extend |
| Electron `serverRuntimeEnv.ts` | isolated forwarding | DS-002 | Extend |

## Draft File Responsibility Mapping

The final mapping below needed no restructuring after the reusable-structure pass.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Writable vault open/close | `provisioning/writable-vault-target.ts` | secret-management | Importer + setup | Yes | Yes | A runtime registry |
| Location predicates | `test-vault/test-vault-location.ts` | secret-management | Setup, commands, source decision | Yes | Yes | — |
| Credential var names; access classifier | `test-support/test-vault/*` | test-support | Both packages' tests | Yes | Yes | An env reader for keys |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `SecretVaultSource = {kind:'application', location, notice?} \| {kind:'test', directory}` | Yes | Yes | Low | — |
| `SecretVaultStore` | Yes | Yes | Low | Exactly the methods the service and bootstrap use (incl. custom-provider batch methods; read-only throws) |
| `TestVaultStatus {location, state, configured, missing}` | Yes | Yes | Low | `state` ∈ READY / NOT_FOUND / UNAVAILABLE(health) |

## Final File Responsibility Mapping

| File | Owner / Boundary | Concrete Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/secret-management/secret-vault-source.ts` (new) | source decision | `selectSecretVaultSource`, `SecretVaultSource` |
| `.../secret-vault-runtime.ts` | runtime | `initialize(source)`; failure rule; log line |
| `.../persistence/secret-vault-store.ts` (new) | interface | `SecretVaultStore` |
| `.../persistence/read-only-secret-vault-store.ts` (new) | store | `node:sqlite` reads; writes throw |
| `.../persistence/secret-vault-repository.ts` | existing | implements `SecretVaultStore` |
| `.../bootstrap/secret-vault-bootstrap.ts` | existing | + `verifyEstablished` |
| `.../services/secret-management-service.ts` | existing | constructor takes `SecretVaultStore` |
| `.../domain/secret-vault-types.ts` | existing | + `READ_ONLY` and `TEST_VAULT_*` codes |
| `.../test-vault/test-vault-location.ts` (new) | location | selector parsing, default, names, two predicates |
| `.../test-vault/read-only-test-vault.ts` (new, Prisma-free) | read-only entry | `openReadOnlyTestVault` |
| `.../test-vault/test-vault-commands.ts` (new) | commands | setup/status/remove |
| `.../provisioning/writable-vault-target.ts` (new, extracted) | opener | migrations + Prisma + runtime(application) + shutdown |
| `.../provisioning/local-environment-secret-import-service.ts` | existing | uses `WritableVaultTarget`; decision port |
| `.../cli/import-local-environment-secrets.ts` | existing | TTY decision port (same behavior) |
| `.../cli/test-vault-cli.ts` (new) | CLI | parse/print |
| `.../resolution/secret-management-provider-api-key-resolver.ts` | existing | class only; required provider |
| `.../resolution/runtime-provider-api-key-resolvers.ts` (new, moved) | runtime-bound factories | 4 call sites |
| `src/server-runtime.ts`, `src/standalone-application-host/start-standalone-application-host.ts` | startup | pass `selectSecretVaultSource(...)` |
| `autobyteus-ts/src/secrets/provider-api-key-resolver.ts` | default slot | setter + resolve helper |
| 31 autobyteus-ts client/factory files | clients | optional `apiKeyResolver` → `resolveProviderApiKeyResolver` |
| `autobyteus-ts/tests/setup.ts`, `vitest.config.ts`, `package.json` | autobyteus-ts tests | strip; lazy install with gate; self alias; `"test": "vitest run"` |
| 18 autobyteus-ts live test files | tests | constructors without resolver; `liveProviderTest`; Gemini passes an explicit `GeminiRuntimeResolver` (AR-006) |
| `test-support/test-vault/{test-vault.ts, credential-environment.ts, provider-access-classification.ts}` (new) | test policy | as in the ownership map |
| `autobyteus-ts/tests/integration/helpers/provider-access.ts` | — | removed |
| `autobyteus-server-ts/tests/setup/test-environment-isolation.ts` | server tests | `captureTestVaultSelection()` + credential stripping for all test folders |
| `autobyteus-server-ts/tests/e2e/helpers/live-runtime-secret-vault-helpers.ts` | — | removed; 8 suites use `initializeLiveServerVault` |
| 6 server test files calling `runtime.initialize(location)` | tests | pass `{kind:'application', location}` |
| New server E2E regression (AC-017) | tests | with the selector set for the process, the secret-lifecycle suites' servers and runtimes use the application source and saves succeed |
| `autobyteus-server-ts/tests/e2e/secret-management/real-e2e-compaction-quality.e2e.test.ts` | tests | `describe` only when the selection is non-empty |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | bootstrap | `startBuiltTestServer({testVaultSetting})`; `createSanitizedTestEnvironment` never forwards by itself |
| `test-support/live-e2e/run-live-e2e.mjs`, `live-e2e-harness.ts` | runner | pass the selector; print the vault line; harness uses `initializeLiveServerVault` |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts` (+ test) | Electron | isolated forwarding |
| `autobyteus-web/tests/e2e/provider-api-key-save-probe.mjs` | web probe | remove `AUTOBYTEUS_TEST_VAULT` from its backend env |
| root `package.json` | scripts | `test-vault` |
| Docs and skills | docs | TESTING section + rule + examples; `AGENTS.md`; others link |

## Applied Patterns (If Any)

- Strategy-selected store behind `SecretVaultStore`, chosen once by `selectSecretVaultSource`.
- Optional default dependency (resolver slot) in autobyteus-ts, set only by live test setup.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/secret-management/test-vault/` | Folder | test-vault | location, read-only entry, commands | Vitest/test policy |
| `autobyteus-server-ts/src/secret-management/secret-vault-source.ts` | File | source decision | selection | I/O |
| `test-support/test-vault/` | Folder | test policy | capture, initializers, installer, gates, stripping | SQLite/crypto |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `secret-management/test-vault/` | Main-Line Domain-Control | Yes | Low | One capability; a Prisma-free read entry separated from Prisma-backed commands |
| `test-support/test-vault/` | Off-Spine (test policy) | Yes | Low | Test-only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Live server suite | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_DEEPSEEK_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts --no-watch` | `DEEPSEEK_API_KEY=… vitest …`; importing keys into `db/test.db` | REQ-005, REQ-006 |
| Deterministic suite in the same shell | `export AUTOBYTEUS_TEST_VAULT=…; pnpm test:e2e` → identical results (setup captured and removed the selector; servers started without `testVaultSetting`) | `createSanitizedTestEnvironment` forwarding the selector to every server (P-001) | AR-001 / AC-017 |
| Isolated instance | `AUTOBYTEUS_TEST_VAULT=… pnpm --silent isolated-app start --build` | `script -q /dev/null pnpm secrets:import … && isolated-app restart` | REQ-012 |
| autobyteus-ts live test | code block 1 | `const apiKey = process.env.DEEPSEEK_API_KEY; describe.skip`; `new DeepSeekLLM(model)` crashing | REQ-014 |
| Selected vault missing | startup fails: `SECRET_VAULT_INITIALIZATION_FAILED … TEST_VAULT_NOT_FOUND (run pnpm test-vault setup)` | Degraded health or a silent switch to the DB vault | AR-004 / REQ-016 |
| Startup log | `Secret vault: test vault /Users/x/.autobyteus-test/vault (read-only)` | Silent switch | REQ-016 |

```ts
// 1. autobyteus-ts live test. Run with:
//    AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_PROVIDER_TESTS=1 \
//      pnpm -C autobyteus-ts test tests/integration/llm/api/deepseek-llm.test.ts
const live = liveProviderTest(LLMProvider.DEEPSEEK);   // gate + "missing capability" skip / strict
live.it('completes a prompt', async () => {
  const llm = new DeepSeekLLM(model, new LLMConfig()); // key comes from the test vault
  const response = await llm.sendUserMessage(new LLMUserMessage({ content: 'Say hi' }));
  expect(response.content.length).toBeGreaterThan(0);
});
```

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Env key if present, else test vault | Habit | Rejected | Vault only; credential env stripped |
| Keep per-DB import instructions for tests/instances | Existing docs | Rejected | Selector |
| Copy keys into run DBs (SR-005) | Earlier draft | Rejected | Read-only selection |
| Silent default when unset | Convenience | Rejected (user, DEC-010) | Explicit selector |
| Degraded health / fallback when a selected vault is unusable | Consistency with the application source | Rejected (AR-004) | Throw at startup |

## Derived Layering (If Useful)

N/A

## Change / Refactor Sequence

1. Server core:
   - `SecretVaultStore` + repository implements it + service constructor type;
   - `ReadOnlySecretVaultStore`; `verifyEstablished`; error codes;
   - `test-vault/test-vault-location.ts` (predicates);
   - `test-vault/read-only-test-vault.ts`;
   - `SecretVaultSource` + `selectSecretVaultSource`; `initialize(source)` with the failure rule;
   - resolver split;
   - extract `WritableVaultTarget`; importer decision port.
   - Unit tests: source decision (unset / set / real data / forbidden), failure rule (each code), read-only store (no writes; bytes unchanged), predicates per OS (injected platform/home/env), a Prisma-free import graph check for `read-only-test-vault.ts` (e.g. module-graph assertion).
2. `TestVaultCommands` + CLI + root script. Unit tests: setup non-interactive skip/replace, refusal, status states, remove, canary scan.
3. Startup sites pass the source; the 6 test init call sites pass `application`. Integration: a selected server reports configured providers; a save gives `SECRET_VAULT_READ_ONLY`; missing vault → fatal start.
4. autobyteus-ts default slot + 31 signatures. Unit tests: explicit wins; default used; none → `MissingApiKeyError`.
5. `test-support/test-vault`; autobyteus-ts setup (lazy, gated), alias, script; repair the 18 live files; remove `provider-access.ts`.
6. Server tests:
   - setup capture/strip;
   - 8 live suites → `initializeLiveServerVault`;
   - delete the helper;
   - `startBuiltTestServer({testVaultSetting})`; runner/harness changes;
   - compaction empty-selection fix;
   - AC-017 regression.
7. Electron isolated forwarding (+ unit test); `provider-api-key-save-probe` strip.
8. Docs and skills (REQ-013/015).
9. Validation:
   - deterministic suites with and without the selector exported (AC-017);
   - one live autobyteus-ts DeepSeek test;
   - `test:e2e:real -- --scenarios=deepseek.llm`;
   - one gated server suite;
   - isolated-instance smoke;
   - vault hash unchanged;
   - guard unit tests (never start against real data).

## Key Tradeoffs

- **Selector in production code vs a test-only harness.** It matches the user's database model and keeps product paths identical. Mitigations: the guard, read-only access, the log line, and failing fast.
- **Harness opt-in vs every process honoring an exported selector.** Deterministic results stay unchanged (preserved boundary). Live runs already need their gate, so the experience stays "set the variable (+ the gate you already use)".
- **Read-only selection vs copies.** No copies anywhere; Settings saves are refused while selected.
- **Optional default resolver in autobyteus-ts.** "No extra code" in live tests, at the cost of global state constrained by rule and tests.

## Risks

- R-A: the Vitest self alias may not unify `autobyteus-ts` class identity. Mitigation: subpath aliases (escalation trigger).
- R-B: `node:sqlite` is experimental; it is already used in the product.
- R-C: a legacy custom-provider test DB with the selector set gets a vault-removal warning. Expected.
- R-D: the 21 web probes that spawn backends with `...process.env` (other than the key-saving one) will see an exported selector. Their servers open the test vault read-only, and configured providers may trigger discovery calls. Their assertions do not involve vault state. TESTING.md tells runners not to put the variable in a shell profile, and FU-05 proposes a shared probe env owner.
- R-E: production data roots are the REQ-004 set and `~/.autobyteus/server-data`. Implementation confirms no other OS-specific production root is used for server data (Electron production data dir is canonical, A-20).
- P-002: setup re-run from an older worktree against a newer vault. Observe in implementation.

## Guidance For Implementation

- Stable, value-free codes:
  - `TEST_VAULT_NOT_FOUND`, `TEST_VAULT_LOCATION_INVALID`, `TEST_VAULT_LOCATION_FORBIDDEN`, `TEST_VAULT_UNAVAILABLE`, `TEST_VAULT_IGNORED_ON_REAL_APP_DATA`, `SECRET_VAULT_READ_ONLY`;
  - the missing-capability skip reason names the SecretId and `pnpm test-vault setup`.
- Gates: `RUN_LIVE_PROVIDER_TESTS=1` (autobyteus-ts), the existing server `RUN_*` gates, `AUTOBYTEUS_LIVE_STRICT=1`. `AUTOBYTEUS_TEST_VAULT` is captured by the server setup, never allowlisted into deterministic code.
- Gemini live tests and probes pass an explicit `GeminiRuntimeResolver` (a mode, not a key) (AR-006).
- TESTING.md (REQ-013):
  - a "Test vault" section starting with "Set `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` for any test that needs real provider keys, together with the test's live gate";
  - the setup and status commands;
  - "never from `.env` or environment variables";
  - "deterministic suites ignore it";
  - "set it on the command or in a live-testing shell, not in your shell profile";
  - Rule 4 replaced;
  - every real-key example includes the variable.
- `AGENTS.md` (REQ-015), about 4 lines:
  - "Real provider keys for tests and investigation: set `AUTOBYTEUS_TEST_VAULT` (check with `pnpm test-vault status`) plus the test's live gate.
  - Never read keys from `.env` or the environment.
  - See TESTING.md#test-vault."
- Live verification spends a few cheap calls (DeepSeek). Do not run the Anthropic caching suite unless the user asks.

## Architecture Review Response (ARCH-REV-001)

| Finding | Response | Where |
| --- | --- | --- |
| AR-001 (High) | One rule: deterministic workspace harnesses never apply the selector; live runs opt in through their gate. Four owners: server setup capture/strip, `startBuiltTestServer({testVaultSetting})`, gated autobyteus-ts install, key-saving web probe strip. AC-017 regression proves `pnpm test:e2e` is unchanged with the selector exported. R-D rewritten (no "per command only" mitigation). REQ-005 clarified within the approved preserved boundary (no conflict to escalate). | DS-005; Ownership Map; file mapping; REQ-005, AC-017, DEC-012 |
| AR-002 (Medium) | Concrete refused set (REQ-004): `~/.autobyteus/**` + Electron `userData` defaults for app `autobyteus` per OS + macOS Logs. Separate predicates `isForbiddenTestVaultLocation` and `isRealAppServerDataDir`. | Terminology; Ownership Map; AC-004 |
| AR-003 (Medium, editorial) | Requirements doc rewritten @ SR-008 (no copies/option); report §5.1, trade-offs and §6 aligned; investigation-notes inventory, U-02 and Notes aligned; baseline and supplement status updated. | requirements-doc, report, investigation-notes |
| AR-004 (Low) | One failure rule for the test source: invalid / forbidden / not found / not READY → `initialize` throws → fatal startup; application source unchanged. | Ownership Map; Bounded Local spine; AC-016 |
| AR-005 (rec.) | Accepted: Prisma-free `read-only-test-vault.ts`; resolver class split from the runtime-bound factories; lazy gated import in autobyteus-ts setup; module-graph check. | Ownership Map; Dependency Rules; sequence step 1 |
| AR-006 (note) | Accepted: Gemini passes an explicit `GeminiRuntimeResolver`; REQ-014 says so. | REQ-014; Guidance |
