# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/`
Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience` / `codex/test-vault-developer-experience`

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large/High); the SR-009/SR-010 delta passed at `ARCH-REV-004`; next route from `get_handoff_rules`: Code Review.
- Requirements doc: `requirements-doc.md` @ SR-009 (approved; SR-006/SR-007/SR-009 by the user)
- Investigation notes: `investigation-notes.md` (A-01..A-26)
- Solution revision record: `solution-revision-record.md` (SR-001..SR-010)
- Design spec (required on every route): `design-spec.md` @ SR-010 (commit `14df2e9005`), § "SR-009 Design Delta" (steps S9-1..S9-4)
- Supplemental task artifacts: `test-vault-evaluation-report.md` (§5.0/§5.1, behavior-defining)
- Design review report: `design-review-report.md` (ARCH-REV-004, Pass; AR-013 non-blocking)
- Architecture review revision record: `architecture-review-revision-record.md`
- Earlier rounds: code review CRR-001 Pass on IR-001 (`code-review-report.md`); API/E2E API-REV-001 Blocked/on hold (`api-e2e-execution-coverage-report.md`).
- Triggering rework: the user-approved SR-009 revision (autobyteus-ts reads `AUTOBYTEUS_TEST_VAULT` itself), designed at SR-010 and passed at ARCH-REV-004.

## Current Implementation Summary

- Implementation cycle: `Rework` (requirement/design revision on top of IR-001)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (Local Fix CR-001 on IR-002)
- Related solution revision IDs: `SR-009`, `SR-010` (on `SR-006`..`SR-008`)
- Related architecture-review revision IDs: `ARCH-REV-004` (earlier `ARCH-REV-002`)
- Related code-review revision IDs: `CRR-002` (Fail on IR-002: CR-001, Low Local Fix), `CRR-001` (Pass on IR-001)
- Related API/E2E revision IDs: `API-REV-001` (Blocked on the live vault; on hold for this revision)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001` (IR-003). IR-002: `N/A` (user revision SR-009), AR-013 guidance applied.

Commits on the branch (above the design commit `67d1aaaacc`):

| Commit | Content |
| --- | --- |
| `303a04e945` | Merge of `origin/personal` @ `ad784b0a8f` (1,147 commits ahead of the design base `d28c56d5d`; clean merge, no conflicts). Done before coding because upstream had added 5 more live suites on the env helper and rewritten TESTING.md. |
| `6f38cd51e6` | `test(autobyteus-ts)`: baseline fix for 5 stale default-suite tests (TESTING Rule 9; causes in the commit message). |
| `855842b8f1` | `feat(secret-management)`: the implementation (code and tests). **All checks below ran on this tree.** |
| `3f01a6013a` | `docs(testing)`: TESTING.md Test vault section and Rule 4 (its own commit, as TESTING.md requires). |
| `198c9066dc` | `docs`: AGENTS.md entry and the other docs/skill. |
| `12a23e7b8a` | `docs(ticket)`: IR-001 handoff, revision record and evidence. |
| `9498de5f8b` | **IR-002** `feat(secrets)`: autobyteus-ts owns the vault read side and reads `AUTOBYTEUS_TEST_VAULT` (S9-1..S9-3). **All IR-002 checks ran on this tree.** |
| `e40b0fe6ce` | IR-002 `docs(testing)`: scripts need only the variable; Vitest live runs keep the gate. |
| `3c9a4e799a` | IR-002 `docs`: Secret Management, AGENTS.md, autobyteus-ts key-resolution section (S9-4). |
| `d4cbc132a8`, `07fcc5969c` | `docs(ticket)`: reviewer documents of ARCH-REV-004/CRR-001; IR-002 handoff, record and evidence. |
| `469de3d47e` | **IR-003** `test(autobyteus-ts)`: remove the dead Vitest self alias and its test (CR-001). `vitest.config.ts` is back to its pre-ticket form. IMP-26/IMP-27 ran on this tree. |
| (next) | `docs(ticket)`: CRR-002 reviewer documents; IR-003 handoff, record and evidence. |

What exists now (IR-001 base, with the IR-002 changes folded in):

- **IR-002: autobyteus-ts owns the vault read side** (`autobyteus-ts/src/secrets/vault/`, moved from the server with history, no server copies or re-exports): `secret-vault-crypto.ts` (encrypt/decrypt, verifier), `secret-root-key-file.ts` (now takes `VaultFileLocation {databasePath, rootKeyPath}`) + `windows-exclusive-acl.ts`, `secret-vault-records.ts`, `secret-vault-store.ts`, `read-only-secret-vault-store.ts` + `secret-vault-sqlite-schema.ts`, `secret-vault-types.ts` (+ `PROVIDER_UNKNOWN`, `detail` field), `secret-id.ts` (`SecretId`, `secretId`, `customProviderSecretId`), `test-vault-location.ts` (policy + `comparablePath`), and new `verify-established-vault.ts`, `read-secret-entry.ts` (AR-011 contract), `provider-secret-id.ts` (`providerSecretId`, the IR-001 binding set exactly, AR-013), `open-test-vault.ts` (`openVerifiedTestVault`, `openTestVaultReader`), `test-vault-provider-api-key-resolver.ts` (`TestVaultProviderApiKeyResolver`, `TestVaultMissingCapabilityError`). `secrets/test-vault-setting.ts` names the selector outside `vault/`.
- **IR-002: environment default.** `secrets/provider-api-key-resolver.ts`: explicit resolver → the vault `process.env.AUTOBYTEUS_TEST_VAULT` names (read at lookup time; vault modules and `node:sqlite` loaded by dynamic import only then; opened once per process per directory, failures not cached, closed at process exit) → `MissingApiKeyError`. `disableEnvironmentProviderApiKeySource()` replaces `setDefaultProviderApiKeyResolver` (removed). Vault-open failures keep their `code`/`instructionCode` and name the provider (`… (key for DEEPSEEK)`).
- **IR-002: server.** Keeps `SecretConsumerIdentity`/`serializeSecretConsumerIdentity` (`SecretCredentialSlot` → `ProviderApiKeySlot`) and `ProviderCredentialCatalog` (authorization, search bindings, `isKnownSecretId`, built on `providerSecretId`); the bootstrap keeps init/create on the moved validators; `SecretManagementService.resolveForUse` calls `readSecretEntry` and maps `CORRUPT_VAULT` → `markCorrupt` by code; `openReadOnlyTestVault` = `openVerifiedTestVault` + the server service; `isRealAppServerDataDir` lives in `secret-vault-source.ts`. Both startup sites call `disableEnvironmentProviderApiKeySource()` first (AC-018), as does `initializeLiveServerVault`. The unused `secret-management/index.ts` is removed.
- **IR-002: tests.** autobyteus-ts Vitest setup removes the selector unless `RUN_LIVE_PROVIDER_TESTS=1` (no installer; `test-vault-default-resolver.ts` removed); `liveProviderTest` classifies by `kind`/`code` (vault failures are real failures, not skips); `test-support/module-graph/module-graph.ts` is the shared graph walker.

IR-001 items (some superseded as marked):

- **Selection (DS-002).** `secret-vault-source.ts` `selectSecretVaultSource({testVaultSetting, appDataDir, databaseLocation})` → `{kind:'application', location, notice?}` | `{kind:'test', directory}`; both startup sites pass `config.get('AUTOBYTEUS_TEST_VAULT')` (env, then data-dir `.env`) and call `SecretVaultRuntime.initialize(source)`. The runtime logs `Secret vault: test vault <dir> (read-only)` / `Secret vault: application database` (and a warning with `TEST_VAULT_IGNORED_ON_REAL_APP_DATA`).
- **Failure rule.** For `test`, `initialize` throws `SecretVaultError` (`TEST_VAULT_LOCATION_INVALID`, `…_FORBIDDEN`, `TEST_VAULT_NOT_FOUND` naming `pnpm test-vault setup`, `TEST_VAULT_UNAVAILABLE` with the health code) and opens nothing; startup takes its existing `SECRET_VAULT_INITIALIZATION_FAILED` fatal path. `application` is unchanged.
- **Read-only path (Prisma-free).** `test-vault/read-only-test-vault.ts` `openReadOnlyTestVault` → (IR-002: autobyteus-ts `openVerifiedTestVault`: `ReadOnlySecretVaultStore`, `node:sqlite` `readOnly` + `query_only`, `verifyEstablishedVault`, no lock, no write) → the server's `SecretManagementService`. Writes throw `SECRET_VAULT_READ_ONLY`.
- **Location policy.** (IR-002: now autobyteus-ts `secrets/vault/test-vault-location.ts`; `isRealAppServerDataDir` in the server's `secret-vault-source.ts`.) Selector parsing (absolute, `~` = home, no symlinked directory), default `~/.autobyteus-test/vault`, file names, and the two separate predicates `isForbiddenTestVaultLocation` (REQ-004 set per platform, realpath of the existing ancestor, case-insensitive on macOS/Windows) and `isRealAppServerDataDir`.
- **Commands (DS-001).** `test-vault/test-vault-commands.ts` + `cli/test-vault-cli.ts` + root `pnpm test-vault setup --source <abs> [--replace] | status | remove`. Setup runs the existing importer service with a decision port that confirms only the validated test-vault target, through the extracted `provisioning/writable-vault-target.ts`; it sets `0700`/`0600` and prints `SETTING AUTOBYTEUS_TEST_VAULT=<dir>`. `secrets:import` keeps its terminal challenge (now `createTerminalImportDecision`).
- **Resolver split (AR-005).** `resolution/secret-management-provider-api-key-resolver.ts` holds only the class (provider required); `resolution/runtime-provider-api-key-resolvers.ts` holds the 3 runtime-bound factories (3 src call sites + 2 test references updated).
- **autobyteus-ts (DS-003).** (IR-002: the default slot is now the environment default above.) `resolveProviderApiKeyResolver` in `src/secrets/provider-api-key-resolver.ts`; resolver parameters optional in all 28 client/factory/model files; `LLMFactory.createLLM(id)` and the media factories take config and resolver optionally. Lookup of the default happens when a key is needed; none → `MissingApiKeyError(provider)`.
- **Test policy (`test-support/test-vault/`).** Server-free (AR-007): `test-vault.ts` facade, `live-provider-test.ts` (`liveProviderTest(provider)` → gate, reasoned skip, `AUTOBYTEUS_LIVE_STRICT=1`), `credential-environment.ts`, `test-vault-selection.ts` (capture), `provider-access-classification.ts` (moved). Runtime-touching, loaded only by live opt-ins: `live-server-vault.ts` (`initializeLiveServerVault`, `closeLiveServerVault`, `requireLiveCapability`). (IR-002: `test-vault-default-resolver.ts` removed.) Tests only: `synthetic-test-vault.ts`.
- **Harness opt-in owners (DS-005).** Server setup (`tests/setup/test-environment-isolation.ts`) captures the selector and strips `*_API_KEY` for every test folder; `startBuiltTestServer({testVaultSetting})` forwards only that explicit value; autobyteus-ts `tests/setup.ts` strips credentials and (IR-002) removes the selector unless `RUN_LIVE_PROVIDER_TESTS=1`; the key-saving web probe deletes the selector.
- **Live suites.** The env→vault helper is deleted. 15 server live suites and the native-runtime harness use `initializeLiveServerVault()`; env-key gates are replaced by `requireLiveCapability` (in-test or `beforeEach`); APC-E2E-008 resolves its key through the product resolver. The 18 autobyteus-ts live files use `liveProviderTest` and current constructors; `provider-access.ts` is deleted.
- **Runner.** `run-live-e2e.mjs` prints `Vault: test vault <dir>` / `Vault: run database …` and passes the selector to its server and to the vitest child (where the real-E2E harness uses `initializeLiveServerVault`); `real-e2e-compaction-quality` describes only with a selected compaction scenario (F-08).
- **Electron.** `buildServerProcessEnv` forwards a non-blank `AUTOBYTEUS_TEST_VAULT` under `isolated-baseline`.
- **Docs.** TESTING.md Test vault section, Rule 4, examples; AGENTS.md entry; secret_management.md Test Vault section; isolated-app guide and skill, READMEs, packaging doc and autobyteus-ts docs point to it.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: IR-002 moves security-critical format code across packages (65 files) and gives the core library an environment-driven credential source; IR-001 had 130 files in the feature commit across server secret-management and startup, autobyteus-ts `src` (public signatures + default slot), test-support, server tests, Electron env policy, one web probe; production credential-source input and shared contracts (store interface, `initialize(source)`, autobyteus-ts signatures). Nothing reduced the risk surface.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Large/High route)
- New design impact or escalation trigger: `None`. SR-009 triggers checked: no vault module or `node:sqlite` loads in autobyteus-ts while the variable is unset (static graph check, IMP-17; runtime `process.moduleLoadList` check, IMP-18); the server never reads the selector through autobyteus-ts (it disables the default first: IMP-15 startup unit tests, IMP-18 built-server E2E, IMP-19 negative control); no duplicated format code (server module-graph check: no crypto/key-file/naming/location module left in the server, IMP-15). IR-001 triggers: no vault write outside setup/remove (read-only store + IMP-05 bytes unchanged); no key in env/argv/logs/evidence (IMP-13); AC-017 regression passes (IMP-05); REQ-004 set and guard cover the Electron production roots (`~/.autobyteus` canonical, A-20; `userData`/`logs` default to the `autobyteus` app folders); Prisma is not reached from the autobyteus-ts path (module-graph check, IMP-04); no startup app-data migration needs a vault write on a fresh DB (the custom-provider removal only runs for legacy data and reports a warning on failure, A-22; IMP-05 servers start READY on fresh DBs with the test source).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001, 007 | Non-interactive setup; status; remove; forbidden refused | `cli/test-vault-cli.ts` → `test-vault/test-vault-commands.ts` → `LocalEnvironmentSecretImportService.execute` (decision port) → `openWritableVaultTarget`; status via `openReadOnlyTestVault` | IMP-09: create/skip/replace/status/forbidden/untrusted source/remove; general `secrets:import` unchanged (its unit + E2E tests pass, IMP-04/IMP-06) |
| BEH-002, 008 | Selected server reads the test vault read-only; unset or real data → own vault; unusable → startup fails | `server-runtime.ts`, `start-standalone-application-host.ts` → `selectSecretVaultSource` → `SecretVaultRuntime.initialize` → `openReadOnlyTestVault`; Electron `serverRuntimeEnv.ts` | IMP-05 (built server: configured, save refused, bytes unchanged; missing vault → fatal `TEST_VAULT_NOT_FOUND`); IMP-04 (each failure code; guard); isolated-instance smoke not run (API/E2E) |
| BEH-004 | Gated in-process / built live servers select the test source | `test-support/test-vault/live-server-vault.ts`; `startBuiltTestServer({testVaultSetting})`; `run-live-e2e.mjs`; `live-e2e-harness.ts` | IMP-05 in-process case; IMP-12 suites load; real live runs not done (no standing vault) |
| BEH-003, 009 | Any process using autobyteus-ts (script, Vitest live run) gets keys for resolver-less clients from the vault `AUTOBYTEUS_TEST_VAULT` names; the server turns this off | `resolveProviderApiKeyResolver` → environment default → dynamic import `secrets/vault/test-vault-provider-api-key-resolver.ts` → `openTestVaultReader` → `readSecretEntry`; Vitest setup keeps the variable only with the gate; server startup `disableEnvironmentProviderApiKeySource()` | IMP-23 (plain `node` + `LLMFactory.createLLM`: unset → `MissingApiKeyError`; set → vault key; missing → `missing capability …`); IMP-22 (Vitest live mode, no installer); IMP-17 (resolution-order unit tests, graph); IMP-18/19 (AC-018) |
| BEH-005 | Credential vars stripped; deterministic harnesses never apply the selector | server `test-environment-isolation.ts`; autobyteus-ts `tests/setup.ts`; `createSanitizedTestEnvironment`; key-saving web probe | IMP-05 (AC-017 nested run of the secret-lifecycle suites with the selector exported; built server without opt-in uses its own vault); IMP-07 (default autobyteus-ts with 13 inherited keys and the selector exported) |
| BEH-006 | Reasoned skip; strict fails | `live-provider-test.ts`, `live-server-vault.ts` `requireLiveCapability`, `provider-access-classification.ts` | IMP-08; strict mode checked manually (5 × `LIVE_PROVIDER_UNAVAILABLE`); policy unit tests |

- AC-018 (IR-002): `server-runtime.ts`, `start-standalone-application-host.ts`, `initializeLiveServerVault` call `disableEnvironmentProviderApiKeySource()` first → IMP-15 (startup unit tests assert it runs before migrations), IMP-18 (built server with the selector: a resolver-less client gets `missing_api_key`; the server resolver reads the selected vault), IMP-19 (negative control fails without the call).
- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. See the deviations listed under Important Assumptions; none adds product behavior.

## Key Files Or Areas

- Server: `autobyteus-server-ts/src/secret-management/{secret-vault-source.ts, secret-vault-runtime.ts, domain/secret-vault-types.ts, persistence/{secret-vault-store.ts, read-only-secret-vault-store.ts, secret-vault-sqlite-schema.ts, secret-vault-repository.ts}, bootstrap/secret-vault-bootstrap.ts, services/{secret-management-service.ts, secret-vault-inspection-service.ts}, catalog/provider-credential-catalog.ts, test-vault/*, cli/{test-vault-cli.ts, import-local-environment-secrets.ts}, provisioning/{writable-vault-target.ts, local-environment-secret-import-service.ts}, resolution/*}`, `src/server-runtime.ts`, `src/standalone-application-host/start-standalone-application-host.ts`.
- autobyteus-ts: `src/secrets/provider-api-key-resolver.ts`; the client/factory files; `tests/setup.ts`, `vitest.config.ts`, `package.json`.
- Test support: `test-support/test-vault/*`, `test-support/live-e2e/{test-runtime-bootstrap.mjs,.d.mts, run-live-e2e.mjs, live-e2e-harness.ts}`.
- IR-002: `autobyteus-ts/src/secrets/{provider-api-key-resolver.ts, test-vault-setting.ts, vault/*}`; server `catalog/provider-credential-catalog.ts`, `domain/secret-id.ts`, `services/secret-management-service.ts`, `bootstrap/secret-vault-bootstrap.ts`, `test-vault/read-only-test-vault.ts`, `secret-vault-source.ts`, the two startup sites; `autobyteus-ts/scripts/verify-runtime-dependencies.mjs`; `test-support/{module-graph/module-graph.ts, test-vault/*}`; new tests `autobyteus-ts/tests/unit/secrets/{provider-api-key-resolver,vault-module-graph}.test.ts`, `tests/unit/secrets/vault/read-secret-entry.test.ts`, server `tests/e2e/secret-management/environment-key-source.e2e.test.ts`.
- New tests: server `tests/unit/secret-management/test-vault-{read-path,module-graph,policy}.test.ts`, `tests/e2e/secret-management/test-vault-selection.e2e.test.ts`; autobyteus-ts `tests/unit/secrets/provider-api-key-resolver.test.ts` (`package-self-alias.test.ts` was added at IR-001 and removed at IR-003), `tests/unit/test-setup-credential-isolation.test.ts`; Electron `serverRuntimeEnv.spec.ts` (+2 cases).

## Important Assumptions

Implementation decisions and deviations from the design text, for review:

1. **More live suites than the design counted.** After the merge, 15 server live suites (design: 8 env-helper + 2 env-gated) use keys: upstream added `skill-update-notice-live`, `work-journal-live-runtimes`, `work-journal-skill-improvement` on the helper and `native-runtime-live-harness` with its suites `autobyteus-claude-5-5-live`, `autobyteus-compaction-token-reading-live`, `autobyteus-native-output-limit-live`, `…-recovery-live`, `autobyteus-compaction-cache-reuse-live`. Same design decision applied; removing the helper requires migrating every caller.
2. **Dead code removed (Principle 7).** `SecretManagementService.createMissingBatchForCustomProviderMigration`/`compensateUnpublishedCustomProviderBatch`, the repository methods and `CustomProviderMigrationBatchReceipt`, `SecretEntryRepository.deleteEntry` and their 4 unit tests: nothing in `src`, scripts or fixtures calls them (`git grep`), only those tests. `SecretVaultStore` therefore has exactly the 7 methods the service and bootstrap use; the read-only store needs no batch-migration stubs.
3. **Agent file tools are denied the selected test-vault directory** (`selectedTestVaultPaths`), as they are denied the server's own DB/key files today. Not stated in the design; it keeps the existing guarantee for the selected vault.
4. **`~` in the selector** expands to the home directory, so the documented setting also works from an `.env` file or a quoted value.
5. **Status lists** the 15 fixed catalog secret IDs (`ProviderCredentialCatalog.listFixedSecretIds`) via a new value-free `SecretManagementService.getStatusForSecretId`.
6. **`SecretVaultError` options take a value-free `detail`** appended to the message (instruction code first) for the startup-stopping test-vault errors; GraphQL messages of other errors are unchanged.
7. **The vault-choice log line is emitted by the process-global runtime only.** Runtimes created by provisioning commands are silent, so `secrets:import`/`test-vault setup` output stays the value-free summary.
8. **Live test helpers' shape.** autobyteus-ts: `const live = liveProviderTest('DeepSeek'); live.describe(…); live.it(…)`; detection of a missing key is by `kind === 'missing_api_key'` (works across module copies). Server suites: `requireLiveCapability(context, secretId)`; `skill-update-notice-live` checks the OpenAI key only with its default native model.
9. **Gemini live tests** pass `{ kind: 'aiStudio' }` as the explicit mode (AR-006); the Vertex project/ADC branches of their old env gates are gone.
10. **Silent passes removed in two touched tests:** OpenAI audio "unsupported" now skips with a reason; the Gemini handler's `model`/`not_found` catch now goes to the classifier.
11. **TESTING.md** was rewritten upstream: suite-specific command rows (e.g. Anthropic caching) now live in the test file headers, which include the variable; TESTING.md carries the section, the rule and five examples (autobyteus-ts live, real E2E preflight/run, DeepSeek collaborators, isolated instance). The core-library row now runs `pnpm -C autobyteus-ts test`.
12. **IR-002: one opener sequence.** `openVerifiedTestVault` (location policy, existence, read-only store, verification) is shared by autobyteus-ts's reader and the server's `openReadOnlyTestVault`, so the open-and-verify steps exist once.
13. **IR-002: provider named on vault-open failures.** The environment default returns a new `Error` that keeps `name`, `code`, `instructionCode` and `cause` and appends `(key for <provider>)`, rather than mutating a cached error shared by concurrent lookups. A missing key or unknown provider already names it.
14. **IR-002: `SecretVaultError.detail`** is now also a field (value-free), not only part of the message.
15. **IR-002: `node:` specifiers are built-ins in the autobyteus-ts runtime-deps verifier.** `node:sqlite` is prefix-only, so `builtinModules` does not list it and the build failed; the verifier now accepts any `node:` specifier.
16. **IR-002: AC-018 E2E shape.** A child process loads the built packages (server and autobyteus-ts `dist`, as production), starts the real server with `startConfiguredServer` and the selector set, then probes from inside that process; values are compared by hash. `startBuiltTestServer` alone cannot run code inside the server process.
17. **IR-002: vault failures in live tests are failures.** `liveProviderTest` treats `TEST_VAULT_*`, `PROVIDER_UNKNOWN` and vault-health codes as real failures (classifying `TEST_VAULT_NOT_FOUND` by text would have matched "not found" and become a skip); missing keys and provider refusals remain reasoned skips.

## Known Risks

- R-A no longer applies: since IR-002 no code the autobyteus-ts Vitest run loads imports `autobyteus-ts` by package name, so the IR-001 self alias was removed at IR-003 (CR-001). Classification across dist/src copies is by `kind`/`code`.
- IR-002: the core library holds a process-global, environment-driven key source. Constrained by lazy loading (IMP-17/18), REQ-004 forbidden locations (also on this path, IMP-17), the Vitest gate, and the server disabling it (AC-018).
- IR-002: in the environment default, media clients resolve through `providerSecretId` without the server's media restrictions (accepted in ARCH-REV-004: the user's own test vault).
- R-B: `node:sqlite` prints an ExperimentalWarning on stderr for the CLI and servers (already true for the inspection service).
- R-D (accepted): the 21 other web probes inherit an exported selector (FU-05).
- An installed (pre-change) desktop app does not forward the selector; docs say to use `--build`/`--from-worktree`.
- `pnpm test-vault setup` prints Prisma migration log lines before its summary (value-free; same as `secrets:import`).
- P-002 observed (IMP-10): an older worktree's setup against a newer vault succeeds ("No pending migrations"), keeps the newer schema and stays READY. A future change to the shape of the two secret tables would still need care.
- Windows paths and ACLs were exercised only through injected platform policy, not on Windows.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement
- Reviewed root-cause classification: Duplicated Policy Or Coordination; Boundary Or Ownership Issue
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: one source decision (`selectSecretVaultSource`) and one default slot replace the four credential paths; the harness opt-in owners are the four named in DS-005; the extra suites follow the same owner.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (no env-key path; no fallback from a selected vault; default slot empty unless live setup fills it)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (IR-002: `setDefaultProviderApiKeyResolver`, `test-vault-default-resolver.ts`, `SecretVaultBootstrap.verifyEstablished`, the unused `secret-management/index.ts`; IR-001: custom-provider batch methods, receipt, `deleteEntry`, env→vault helper, `provider-access.ts`, the dead `getUsageJson` test, the resolver's default runtime parameter)
- Dead code found elsewhere, listed as follow-up: None found
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (IR-002 largest changed `src` file: `start-standalone-application-host.ts` 400 effective lines; IR-001 largest 418; `test-support/live-e2e/live-e2e-harness.ts` is test support, already 1,360 lines, net +2)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: production `Not Affected`; worktree test DBs `Discard or Rebuild` (FU-04, untouched); test vault: new data.
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: consumers open the vault read-only and read only the two secret tables (IMP-05 bytes unchanged); P-002 observation in IMP-10.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- macOS 26.5.2 arm64, Node v22.23.1, pnpm 10.28.2. After the merge: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` (stale Prisma client), `pnpm -C autobyteus-ts build` (the server consumes its `dist`), `pnpm -C autobyteus-server-ts build`, `test:integration:prepare`, `pnpm -C autobyteus-web exec nuxt prepare` (Electron tests need it).
- No standing test vault exists on this machine and no agent may choose the key source (DEC-003), so every vault in these checks holds synthetic values only.

## Checks Run

Evidence: `tickets/in-progress/test-vault-developer-experience/evidence/`.

**IR-003 checks (commit `469de3d47e`).** CR-001 changes only `autobyteus-ts/vitest.config.ts` (alias removed) and deletes `package-self-alias.test.ts`; nothing else the code exercises changed, so IMP-14..IMP-25 stay valid except IMP-17 and IMP-22, which ran through that Vitest config and are superseded by:

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-26 | `AUTOBYTEUS_TEST_VAULT=<synthetic vault> pnpm -C autobyteus-ts test` (13 inherited `*_API_KEY`) | `469de3d47e` | as above | default suite without the alias | AC-009, REQ-011 | Pass | `IMP-26-autobyteus-ts-default.log` | `Test Files 392 passed \| 21 skipped (413)` |
| IMP-27 | `AUTOBYTEUS_TEST_VAULT=<synthetic vault> RUN_LIVE_PROVIDER_TESTS=1` vitest on 3 live files + setup test | `469de3d47e` | one 401 from DeepSeek for a fake key | Vitest live mode through the environment default, without the alias | BEH-003, AC-008 | Pass | `IMP-27-autobyteus-ts-live-environment-default.log` | `missing capability provider.grok.api-key for GROK (test vault <tmp>/vault)`; `provider refused DeepSeek: invalid_or_missing_credentials` |

**IR-002 checks (commit `9498de5f8b`).** IR-001 rows IMP-01..IMP-13 below record the IR-001 tree (`855842b8f1`). After IR-002 they are superseded by IMP-14..IMP-25, except IMP-11 (Electron: no Electron change since, still valid) and IMP-10 (P-002: the setup path changed only by module moves; IMP-24 re-ran setup, skip, status, forbidden and remove on the new build).

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-14 | server `typecheck`; autobyteus-ts `tsc -p tsconfig.build.json --noEmit`; `pnpm -C autobyteus-ts build` | `9498de5f8b` | as above | both packages' `src`; runtime-deps verifier | all | Pass | `IMP-14-typechecks.log` | `[verify:runtime-deps] OK` |
| IMP-15 | `pnpm -C autobyteus-server-ts test:unit` | `9498de5f8b` | as above | whole server unit suite incl. catalog (unchanged tests), read path (`CORRUPT_VAULT` → `markCorrupt`), module graph (one format owner), startup AC-018 assertions | AC-018 (unit), regression | Pass | `IMP-15-server-unit-excerpt.log` | `Test Files 749 passed \| 4 skipped (753)` |
| IMP-16 | `pnpm -C autobyteus-server-ts test:integration` | `9498de5f8b` | as above | server integration suite | regression | Pass | `IMP-16-server-integration-excerpt.log` | `Test Files 78 passed \| 20 skipped (98)` |
| IMP-17 | `AUTOBYTEUS_TEST_VAULT=<vault> pnpm -C autobyteus-ts test` (13 inherited `*_API_KEY`) | `9498de5f8b` | as above | default suite; resolution order (explicit, unset, set, once per process, missing key, unknown provider, forbidden/not found/not READY, disabled, client without resolver); `readSecretEntry` contract; static vault graph; setup gate | AC-009, AC-013/014 (unit), REQ-004 on this path | Pass | `IMP-17-autobyteus-ts-default.log` | `Test Files 393 passed \| 21 skipped (414)` |
| IMP-18 | vitest `tests/e2e/secret-management/environment-key-source.e2e.test.ts` on fresh builds | `9498de5f8b` | built `dist` of both packages | plain script with/without the variable; `process.moduleLoadList` has no sqlite until a lookup; built server with the selector: resolver-less client fails, server resolver reads the selected vault | AC-018, AC-013 (mechanics) | Pass | `IMP-18-e2e-environment-key-source.log` | `Tests 3 passed (3)` |
| IMP-19 | AC-018 negative control (disable call removed from built `server-runtime.js`, restored after) | `9498de5f8b` | as above | the E2E's power to detect | AC-018 | Pass (control failed as expected) | `IMP-19-ac018-negative-control.log` | `+ "resolved": true` |
| IMP-20 | vitest `tests/e2e/secret-management tests/e2e/llm-management tests/e2e/media/gemini-speech-voice-tool.e2e.test.ts` | `9498de5f8b` | built server | importer E2E, test-vault selection (AC-016/017), environment key source | AC-016, AC-017, preserved | Pass | `IMP-20-e2e-affected-folders.log` | `Test Files 13 passed \| 2 skipped (15)` |
| IMP-21 | vitest on the 15 server live suites, gates off | `9498de5f8b` | as above | live suites load | REQ-005 (gate) | Pass | `IMP-21-live-suites-gates-off.log` | `Test Files 15 skipped (15)` |
| IMP-22 | `AUTOBYTEUS_TEST_VAULT=<synthetic vault> RUN_LIVE_PROVIDER_TESTS=1` vitest on 3 live files + setup test | `9498de5f8b` | one 401 from DeepSeek for a fake key | Vitest live mode through the environment default (no installer) | BEH-003, AC-008 | Pass | `IMP-22-autobyteus-ts-live-environment-default.log` | `missing capability provider.grok.api-key for GROK (test vault <tmp>/vault)`; `provider refused DeepSeek: invalid_or_missing_credentials` |
| IMP-23 | plain `node` probe: `LLMFactory.createLLM(id)` + `getClient()`, no resolver, no setup | `9498de5f8b` | autobyteus-ts `dist` | the user's "normal logic" path | AC-013 (mechanics), REQ-014 | Pass | `IMP-23-plain-node-probe.log` | `key resolved (sha256 matches expected DeepSeek value: true)` |
| IMP-24 | built CLI: status, setup again, forbidden, remove, status | `9498de5f8b` | no TTY | `TestVaultCommands` on the moved modules | AC-001..004 | Pass | `IMP-24-test-vault-cli-smoke.log` | `SKIPPED 2`; `TEST_VAULT_LOCATION_FORBIDDEN`; `STATE NOT_FOUND` |
| IMP-25 | canary scan over this round's logs and `git diff 12a23e7b8a..HEAD` | `9498de5f8b` | as above | output/log/evidence hygiene | AC-011, QR-001 | Pass | `IMP-25-canary-scan.log` | `real key value matches in logs and diff: 0` |

**IR-001 checks (tree `855842b8f1`):**

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` | `855842b8f1` | as above | server and autobyteus-ts `src` | all | Pass | `IMP-01-server-typecheck.log` | `exit=0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `855842b8f1` | as above | whole server unit suite (incl. new tests) | regression | Pass | `IMP-02-server-unit-excerpt.log` | `Test Files 749 passed \| 4 skipped (753)`, `Tests 6167 passed \| 7 skipped` |
| IMP-03 | `test:integration:prepare` then `test:integration` | `855842b8f1` | as above | server integration suite | regression | Pass | `IMP-03-server-integration-excerpt.log` | `Test Files 78 passed \| 20 skipped (98)` |
| IMP-04 | vitest `tests/unit/secret-management`, startup gate, standalone host | `855842b8f1` | as above | source decision, predicates per OS, read-only store, failure rule (6 codes), log line, default resolver, module graph (+control), policy, importer port | AC-003, 004, 009 (graph), 015, 016 (unit) | Pass | `IMP-04-server-focused-unit.log` | `Test Files 17 passed (17)`, `Tests 177 passed` |
| IMP-05 | vitest `tests/e2e/secret-management/test-vault-selection.e2e.test.ts` | `855842b8f1` | built server dist | real CLI setup; built server with/without opt-in; missing vault; nested secret-lifecycle run with the selector exported; in-process live initializer | AC-001, 016, 017, 007 (mechanics), 011 | Pass | `IMP-05-e2e-test-vault-selection.log` | 5 ✓ incl. `the secret-lifecycle suites give the same results with the selector exported (AC-017)` |
| IMP-06 | vitest `tests/e2e/secret-management tests/e2e/llm-management tests/e2e/media/gemini-speech-voice-tool.e2e.test.ts` | `855842b8f1` | built server dist | importer E2E, resolver split call sites, application-source init sites | preserved | Pass | `IMP-06-e2e-affected-folders.log` | `Test Files 12 passed \| 2 skipped (14)` |
| IMP-07 | `AUTOBYTEUS_TEST_VAULT=<vault> pnpm -C autobyteus-ts test` in a shell with 13 inherited `*_API_KEY` | `855842b8f1` | as above | default autobyteus-ts suite, setup stripping, no default slot | AC-009, REQ-011 | Pass | `IMP-07-autobyteus-ts-default.log` | `Test Files 391 passed \| 21 skipped (412)` |
| IMP-08 | `AUTOBYTEUS_TEST_VAULT=<synthetic vault> RUN_LIVE_PROVIDER_TESTS=1` vitest on 3 live files | `855842b8f1` | network: one 401 from DeepSeek for a fake key | lazy install, default resolver, alias, `liveProviderTest` | AC-008, AC-013 (mechanics), BEH-003 | Pass | `IMP-08-autobyteus-ts-live-synthetic.log` | `missing capability provider.grok.api-key for GROK (test vault <tmp>/vault); add it with pnpm test-vault setup`; `provider refused DeepSeek: invalid_or_missing_credentials` |
| IMP-09 | built CLI: setup/again/--replace/status/forbidden/untrusted source/remove | `855842b8f1` | no TTY | `TestVaultCommands`, CLI | AC-001..004 | Pass | `IMP-09-test-vault-cli-smoke.log` | `SETTING AUTOBYTEUS_TEST_VAULT=<tmp>/vault`; `-rw-------`; `TEST_VAULT_LOCATION_FORBIDDEN`; `exists after refusal: no`; `REMOVED NONE` |
| IMP-10 | P-002 simulation (future migration row + table, then setup --replace, status) | `855842b8f1` | as above | setup against a newer-schema vault | P-002 | Observed (works) | `IMP-10-p002-older-worktree-setup.log` | `No pending migrations to apply.`, `STATE READY`, `future_only_table kept: true` |
| IMP-11 | `nuxt prepare`; vitest `--config ./electron/vitest.config.ts` | `855842b8f1` | as above | Electron main incl. `serverRuntimeEnv` forwarding | REQ-012 (unit) | Pass | `IMP-11-electron-main.log` | `Test Files 36 passed \| 1 skipped (37)` |
| IMP-12 | vitest on the 15 migrated live suites, gates off | `855842b8f1` | as above | live-suite modules load; gates | REQ-005 (gate) | Pass | `IMP-12-live-suites-gates-off.log` | `Test Files 15 skipped (15)` |
| IMP-13 | canary scan (`python3 -I`): 3 synthetic canaries + 12 inherited real key values vs all logs, setup logs, branch diff, evidence | `855842b8f1` | as above | output/log/evidence/commit hygiene | AC-011, QR-001 | Pass | `IMP-13-canary-scan.log` | `real key value matches: 0`; evidence `synthetic canary occurrences: 0` |

- Not run, and why:
  - Real-key live runs (AC-005 DeepSeek autobyteus-ts, AC-006 `test:e2e:real -- --scenarios=deepseek.llm` and preflight, AC-007 a gated server suite, AC-013 one live call, now including a plain `tsx`/`node` script): no standing test vault on this machine (checked again 2026-10-20), and agents must not choose the key source (DEC-003). Needs the user's `pnpm test-vault setup`; API/E2E.
  - A `tsx` run of the plain-script probe: `tsx` is not installed in the workspace; the automated probe uses `node` on the built `dist` (AC-013 allows either).
  - AC-010 isolated-instance smoke (`AUTOBYTEUS_TEST_VAULT=… pnpm --silent isolated-app start --build`, Settings configured, save refused, missing vault → start error): needs a desktop build; API/E2E.
  - Full deterministic `pnpm test:e2e` with and without the selector exported (AC-017 at full scale): the secret-lifecycle suites ran nested in IMP-05; the full suite is left to API/E2E.
  - `test:e2e:real` runner output (`Vault: …` line, F-08 exit code) was not executed; it needs a server build plus a vault and is part of AC-006.
  - Web Nuxt tests and the key-saving browser probe (only its backend env changed).
  - Linux/Windows.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no rendered frontend changed (Electron main-process env policy and one probe script's backend env only).

## Downstream Coverage Hints / Suggested Scenarios

- With the user's vault: `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_LIVE_PROVIDER_TESTS=1 pnpm -C autobyteus-ts exec vitest run tests/integration/llm/api/deepseek-llm.test.ts` (AC-005), and a plain script (only autobyteus-ts, only the variable) calling `LLMFactory.createLLM('deepseek-v4-flash')` with no resolver and sending one message (AC-013 live), with the shell's inherited `*_API_KEY` present.
- AC-018 from the user's side: an isolated instance or `pnpm dev` server with the variable set behaves as before (the server's own resolvers follow its source); recheck AE-04/AE-06 from API-REV-001 against IR-002.
- `pnpm test:e2e:real:preflight` and `pnpm test:e2e:real -- --scenarios=deepseek.llm` with the variable: the `Vault: test vault …` line, exit 0, vault hash unchanged (AC-006, F-08).
- `RUN_DEEPSEEK_E2E=1` collaborators suite with `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` set in the shell (AC-007: aliases ignored).
- Isolated instance from a worktree build: providers configured, Settings save → `SECRET_VAULT_READ_ONLY`, `restart` with the variable, and a missing-vault start (AC-010).
- `pnpm test:e2e` with the selector exported vs without (AC-017 full).
- Strict mode (`AUTOBYTEUS_LIVE_STRICT=1`) for one missing provider; the Gemini AI Studio mode with only a Vertex Express key (reasoned skip).

## API / E2E / Executable Coverage Investigation And Execution Still Required

All acceptance criteria that need a real vault, real providers, a desktop build or the full deterministic E2E suite (AC-005, 006, 007 live, 010, 013 live, 017 full) remain for API/E2E, plus the API-REV-001 cases its report marks for recheck (AE-04, AE-06, AE-11, AE-12; AC-005/009/013). The durable tests (IR-001: IMP-04/05; IR-002: autobyteus-ts resolution-order, graph and `readSecretEntry` tests, `environment-key-source.e2e.test.ts`) cover the mechanics without credentials.

## Follow-ups (not in this ticket)

- FU-01..FU-05 from the design spec stand; FU-03 now also covers `pnpm test-vault`, which builds the server on every call like `secrets:import`.
