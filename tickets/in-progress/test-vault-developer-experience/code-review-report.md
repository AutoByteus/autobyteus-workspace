# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` @ SR-009 (REQ-005c, REQ-014, AC-009, AC-013, AC-018, DEC-013 revised by the user's direction of 2026-10-20)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (A-01..A-29; through the design spec)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001..SR-010)
- Design Spec Reviewed As Context: `design-spec.md` @ SR-010 ("SR-009 Design Delta", authoritative where it differs)
- Supplemental Task Artifacts Reviewed As Context: `test-vault-evaluation-report.md` @ SR-008
- Relevant Solution Revision IDs: SR-006..SR-010
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-004, Pass; AR-013 guidance; P-004)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-004
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: 2
- Review Scope: `Full Re-Audit`
- Review Scope Evidence (round >1): the delta moves the vault read-side format modules from the server into autobyteus-ts and changes the DS-003 key-resolution spine. It also changes shared contracts (`SecretVaultStore` location, `SecretCredentialSlot` → `ProviderApiKeySlot`, removal of `setDefaultProviderApiKeyResolver`, new `disableEnvironmentProviderApiKeySource`) across about 60 code files. All structural checks and the full scorecard were redone. Evidence for areas the delta does not touch (CLI/commands logic, Electron forwarding, harness opt-ins, live-suite gating) is carried forward from CRR-001 after confirming those files changed only in their imports.
- Trigger: implementation_engineer handoff of IR-002 (head `07fcc5969c`; code `9498de5f8b`; docs `e40b0fe6ce`, `3c9a4e799a`)
- Prior Review Round Reviewed: Round 1 (CRR-001, Pass, IR-001 `12a23e7b8a`)
- Latest Authoritative Round: 2
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: present from API-REV-001 (put on hold before SR-009); not an input to this implementation review
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. Security-critical format code moved across packages, the core library gained an environment-driven credential source, and public autobyteus-ts exports changed. Confirmed.

## Review Scope

- Changed implementation and behavior reviewed: `12a23e7b8a..07fcc5969c`. Code is in `9498de5f8b`; docs are in `e40b0fe6ce` and `3c9a4e799a`.
- Files / areas reviewed:
  - autobyteus-ts `src/secrets/provider-api-key-resolver.ts` (environment default, cache, disable, exit close), `src/secrets/test-vault-setting.ts`, and every file in `src/secrets/vault/` (moved and new);
  - `scripts/verify-runtime-dependencies.mjs`, `tests/setup.ts`, `vitest.config.ts`, and the new and updated unit tests (`provider-api-key-resolver`, `vault-module-graph`, `read-secret-entry`, `test-setup-credential-isolation`, `package-self-alias`);
  - server: `catalog/provider-credential-catalog.ts` (old/new authorization equivalence traced branch by branch), `domain/secret-id.ts`, `services/secret-management-service.ts` (`readSecretEntry` + `CORRUPT_VAULT` → `markCorrupt`), `bootstrap/secret-vault-bootstrap.ts`, `test-vault/read-only-test-vault.ts`, `test-vault/test-vault-commands.ts`, `secret-vault-source.ts` (`isRealAppServerDataDir`), and both startup sites (disable call);
  - the import-only changes in persistence, provisioning, resolution and the inspection service; removal of `secret-management/index.ts`;
  - `test-support/test-vault/{live-provider-test, live-server-vault, synthetic-test-vault, test-vault-selection, test-vault}.ts`, `test-support/module-graph/module-graph.ts`, and removal of `test-vault-default-resolver.ts`;
  - E2E `environment-key-source.e2e.test.ts`; the server module-graph and read-path unit tests;
  - `AGENTS.md`, `TESTING.md`, `secret_management.md`, autobyteus-ts docs.
- Explicit exclusions: API/E2E artifacts from API-REV-001 (not inputs here); real-key and isolated-instance runs. No recorded check was rerun: IMP-14..IMP-25 ran on `9498de5f8b`, which is the reviewed code. One local Node probe confirmed that promise callbacks queued in an `exit` handler still run (C-14).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. SR-009 applies the database model to autobyteus-ts:
  - any process (Vitest, `tsx`, `node`) using a client without a resolver reads `AUTOBYTEUS_TEST_VAULT` itself, read-only, with REQ-004 locations refused;
  - the AutoByteus server turns that default off and keeps its own source selection (AC-018);
  - Vitest's default suite removes the selector unless `RUN_LIVE_PROVIDER_TESTS=1` (AC-009).
- Design-spec behavior map verified against the implementation: Yes (table below). The SR-009 move table matches the moves `git diff -M` reports. The server keeps no copies or re-exports.
- Design review report and round confirmed: ARCH-REV-004 Pass. AR-013 is applied: the bindings are ported exactly, and `SECRET_PROVIDER_UNKNOWN` names the provider and slot. P-004 (two autobyteus-ts instances in server tests) is confirmed with no consequence.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None. Implementation assumptions 12–17 were checked (C-09..C-13); none adds product behavior.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001, 007 | Confirmed | Unchanged logic. `TestVaultCommands` now takes its location policy from `autobyteus-ts/secrets/vault/test-vault-location.js` and builds the importer's `ApplicationDatabaseLocation` from `location.databasePath`; `rootKeyPath` follows the same `<db>.secret.key` convention. IMP-24 covers setup, skip, forbidden, remove and status. | — |
| BEH-002, 008 | Confirmed | Startup: `disableEnvironmentProviderApiKeySource()` runs first at both sites, then `selectSecretVaultSource` → `SecretVaultRuntime.initialize`. The test source goes through `openReadOnlyTestVault` → autobyteus-ts `openVerifiedTestVault` (one opener sequence) + the server's `SecretManagementService`; the failure codes are unchanged. `isRealAppServerDataDir` stays in the server, built on the shared `comparablePath`. | — |
| BEH-004 | Confirmed | Unchanged. `initializeLiveServerVault` also calls disable (C-15). | — |
| BEH-003, 009 | Confirmed | Any process: client → `resolveProviderApiKeyResolver(undefined)` → environment default. At key time it reads `process.env.AUTOBYTEUS_TEST_VAULT`; if set, it dynamically imports `vault/test-vault-provider-api-key-resolver.js` → `openTestVaultReader` (location policy, existence, read-only store, `verifyEstablishedVault`) → `providerSecretId` → `readSecretEntry`. The opened vault is cached per directory, a failed open is not cached, and the vault is closed on exit. Unset or disabled gives `MissingApiKeyError`. IMP-17, IMP-18 (plain script with and without the variable; `process.moduleLoadList` has no sqlite until a lookup), IMP-22, IMP-23. | — |
| BEH-005 | Confirmed | autobyteus-ts setup strips `*_API_KEY` and deletes the selector unless the gate is set (IMP-17 with 13 inherited keys and the selector exported). The server test setup capture/strip is unchanged, so the server's dist copy of autobyteus-ts sees no selector in deterministic runs (P-004). Only the server depends on autobyteus-ts (`*/package.json`), and the application workers the server spawns do not import it. | — |
| BEH-006 | Confirmed | `liveProviderTest` classifies by `kind`/`code`. Vault failures (`TEST_VAULT_*`, `PROVIDER_UNKNOWN`, health codes) count as failures; missing keys and provider refusals are reasoned skips. | — |
| BEH-009 / AC-018 | Confirmed | Built-server E2E: inside the server process, a resolver-less client gets `missing_api_key`, while the server's own resolver reads the selected vault. The negative control (IMP-19) fails when the disable call is removed. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

SCN-001..SCN-009 and CTR-REQ-016 from CRR-001 are carried forward. SCN-008 is updated by SR-009.

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-008 (SR-009) | BEH-009 | Operational | Solution designer / implementation / API-E2E engineer | Use a real provider from investigation code | `AUTOBYTEUS_TEST_VAULT=… node probe.mjs` / `tsx probe.ts` / Vitest live run | Normal | client → environment default → reader → provider | Real key resolved; a missing key gives a clear error | REQ-014, AC-013, IMP-18, IMP-23 | Supported Normal Scenario | Use |
| CTR-AC-018 | BEH-002, REQ-014 | Contract | AutoByteus server started with the selector in its env | The server owns its vault | Any server startup (`startConfiguredServer`, standalone host) | Explicit Edge | disable first → source selection | Resolver-less clients fail; the server's resolvers follow its source | AC-018, IMP-18, IMP-19 | Supported Explicit Edge Scenario | Use |
| SCN-006 (SR-009) | BEH-005 | Operational | Developer / agent | Default core tests in a live-testing shell | `pnpm -C autobyteus-ts test` with the selector exported, no gate | Normal | setup deletes the selector → default unused | Same results; no vault opened | AC-009, IMP-17 | Supported Normal Scenario | Use |
| SCN-001..005, 007, 009; CTR-REQ-016 | as CRR-001 | — | — | — | — | — | Paths unchanged apart from imports | — | CRR-001 | Supported | Use |

### Candidate Finding And Mechanism Gate

CRR-001 candidates C-01..C-08 are carried forward unchanged (all Reject). New this round:

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-09 | The Vitest self-alias (`autobyteus-ts/vitest.config.ts` `resolve.alias`) and its test `tests/unit/secrets/package-self-alias.test.ts` have no remaining purpose | Core Principle 7 (dead code in touched files; code only its own tests call); the alias's own comment states its purpose | — (structural) | The alias exists so that "server code loaded by live test setup imports `autobyteus-ts` by package name" and shares classes. That loader (`test-support/test-vault/test-vault-default-resolver.ts`) is removed in IR-002, and nothing else loaded in the autobyteus-ts Vitest run imports `autobyteus-ts` by package name except the alias test itself. The config comment is now false. | `git grep -nE "['\"]autobyteus-ts(/[^'\"]*)?['\"]" -- autobyteus-ts/tests autobyteus-ts/vitest*.ts test-support/test-vault test-support/module-graph` → only `package-self-alias.test.ts`; no autobyteus-ts test imports `autobyteus-server-ts`; the alias was added by this ticket in `855842b8f1` | Promote | This ticket | **CR-001.** Remove the alias block (and its now-unused `path`/`fileURLToPath`/`sourceRoot` lines if nothing else uses them) and `package-self-alias.test.ts`. Introduced by this ticket and made dead by this ticket's IR-002. |
| C-10 | Assumption 12: one opener sequence (`openVerifiedTestVault`) shared by the autobyteus-ts reader and the server's `openReadOnlyTestVault` | Design "one owner" / no duplicated format code | — | Removes the server's duplicate open/verify sequence | `read-only-test-vault.ts` diff (−66 lines) | Reject (as a finding) | — | Correct consolidation; failure codes unchanged. |
| C-11 | Assumption 13: vault-open failure re-thrown as a new `Error` with `(key for <provider>)`, keeping `name`/`code`/`instructionCode`/`cause` | REQ-014 "clear error naming the provider" | Script with a missing or forbidden vault | Callers that classify by `code` still work; the cached rejection is not mutated | `provider-api-key-resolver.ts:57-63` | Reject | — | Meets REQ-014. A `SecretVaultError` from a vault open is not caught as one by `instanceof` in callers, but `liveProviderTest` and the design classify by code (P-004). |
| C-12 | Assumption 15: runtime-deps verifier accepts any `node:` specifier | Build contract | `pnpm -C autobyteus-ts build` with `node:sqlite` | Otherwise the build fails on a valid built-in | verifier diff; IMP-14 `[verify:runtime-deps] OK` | Reject | — | `node:` is reserved for built-ins; this cannot admit a third-party package. |
| C-13 | Catalog rewrite on `providerSecretId`: authorization equivalence | REQ-016 / preserved behavior; AR-013 | Every server key lookup | Traced old vs new for agentRuntime, search, custom provider (llm/llmMetadata only; non-apiKey slot), Gemini slots (incl. media), OPENAI media, other media, unknown provider: same results | catalog diff; existing catalog tests unchanged and passing (IMP-15) | Reject (as a finding) | — | One difference: an invalid custom provider ID now yields `SECRET_CONSUMER_NOT_AUTHORIZED` instead of `INVALID_CUSTOM_PROVIDER_ID`. The service already wraps every catalog error as `ACCESS_DENIED`/`SECRET_CONSUMER_NOT_AUTHORIZED` (`authorize`), and nothing references the old code. No consequence. |
| C-14 | Exit-time close: `closeEnvironmentVaults` closes through `promise.then` inside a `process.once('exit')` handler | Design: "process exit closes the reader (zeroizes the key)" | Script finishes | Would be a no-op if microtasks did not run after exit listeners | Local probe (`/tmp/crr-exit-probe`): the `.then` callback ran after the handler | Reject | — | Works as claimed for normal exit. |
| C-15 | `initializeLiveServerVault` disables the **src** copy of autobyteus-ts, while server code under test uses the dist copy (P-004) | AC-018 for in-process suites | Gated in-process live suite | The dist copy's default is not disabled, but it reads no selector, because the server test setup captured and deleted it from `process.env` | `live-server-vault.ts:4,54`; `test-environment-isolation.ts`; ARCH-REV-004 P-004 "reachable with no consequence" | Reject | — | No supported consequence. The call is still right for in-process code that loads the src copy. |
| C-16 | Environment default in other product processes (application workers, Electron main, other packages) | REQ-014 "applications that manage their own vault … never read the variable through autobyteus-ts" | A production process inherits the selector | Only `autobyteus-server-ts` depends on autobyteus-ts; the application worker entry and backend SDK do not import it; both server entry points disable it | `grep '"autobyteus-ts"' */package.json`; `git grep autobyteus-ts autobyteus-server-ts/src/application-engine` (none) | Reject | — | No unguarded production consumer. |
| C-17 | `disableEnvironmentProviderApiKeySource` closes cached vaults asynchronously while a lookup might be in flight | — | Disable called after lookups started | In-flight lookup could hit a closed store | Only callers run at process start, before any lookup | Reject | — | No supported trigger. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment preserved | Pass | One owner of the read-side format (autobyteus-ts `secrets/vault/`); the server keeps lifecycle and authorization | — |
| Matches approved supplemental artifacts | Pass | Usage model now also covers scripts | — |
| Data-flow spine clarity | Pass | DS-003 now starts at any process and ends at the provider through one default; DS-002 unchanged apart from disable-first | — |
| Ownership boundary preservation | Pass | Format primitives, reader and naming are in autobyteus-ts; consumer kinds and authorization are in the server (AR-009); `isRealAppServerDataDir` is in the server | — |
| Off-spine concern clarity | Pass | Location policy, classifier and exit close are each attached to one owner | — |
| Existing capability reuse | Pass | Moves, not rewrites: `git diff -M` shows R070–R100 renames; the server bootstrap and service call the shared functions | — |
| Reusable owned structures | Pass | `openVerifiedTestVault`, `verifyEstablishedVault`, `readSecretEntry`, `providerSecretId`; module-graph walker shared in `test-support/module-graph/` | — |
| Shared-structure tightness | Pass | `SecretCredentialSlot` replaced by `ProviderApiKeySlot` (no second union); `TestVaultLocation` drops the server-only `databaseLocation` | — |
| Repeated coordination ownership | Pass | Resolution order lives only in `resolveProviderApiKeyResolver` | — |
| Empty indirection | Pass | `TestVaultProviderApiKeyResolver` owns provider→secret mapping and missing-key translation | — |
| Separation of concerns / file responsibility | Pass | Selector name in its own file so naming it loads no vault code | — |
| Ownership-driven dependency check | Pass | autobyteus-ts → nothing outside `src` (module-graph test); index and clients reach the vault only through the dynamic import, with a positive control | — |
| Authoritative Boundary Rule | Pass | Server code uses `openReadOnlyTestVault` or the runtime, never the store and the service together | — |
| File placement | Pass | `autobyteus-ts/src/secrets/vault/` as designed | — |
| Flat-vs-over-split layout | Pass | 15 small single-concern files | — |
| Interface/API boundary clarity | Pass | `disableEnvironmentProviderApiKeySource()` replaces the global setter; explicit resolver still wins | — |
| Naming quality | Pass | Clear and consistent | — |
| No unjustified duplication | Pass | No server copies or re-exports; the selector name is defined once in autobyteus-ts and imported by server and test-support (Electron keeps its own constant under its dependency rule) | — |
| Patch-on-patch complexity control | Pass | The IR-001 installer was removed rather than layered over | — |
| Dead code removed in touched files | **Fail** | CR-001: the Vitest self-alias and its test are dead after the installer's removal | Remove (Local Fix) |
| Test scenarios requirement-aligned | Pass | The AC-018 E2E has a negative control; plain-script cases with and without the variable; loading is checked through `moduleLoadList` | — |
| Test fixtures/helpers coherent | Pass | `synthetic-test-vault.ts` on the moved crypto; shared module-graph walker | — |
| No stale or compatibility-only tests | **Fail** | `package-self-alias.test.ts` only guards the dead alias (CR-001) | Remove with CR-001 |
| API/E2E readiness | Pass (after CR-001) | Exact commands in the handoff; AC-013 now includes a plain script | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/secrets/provider-api-key-resolver.ts` | 40 | 92 | Pass | Pass | Pass | Pass | Pass | — |
| `autobyteus-ts/src/secrets/vault/verify-established-vault.ts` | new | 116 | Pass | Pass | Pass | Pass | Pass | — |
| `autobyteus-ts/src/secrets/vault/open-test-vault.ts` | new | 109 | Pass | Pass | Pass | Pass | Pass | — |
| `autobyteus-ts/src/secrets/vault/test-vault-location.ts` | 158 (server) | 147 | Pass | Pass | Pass | Pass | Pass | — |
| `autobyteus-ts/src/secrets/vault/secret-root-key-file.ts` | moved | 105 | Pass | Pass | Pass | Pass | Pass | — |
| `server .../bootstrap/secret-vault-bootstrap.ts` | ~240 | ~140 | Pass | Pass | Pass | Pass | Pass | — |
| `server .../catalog/provider-credential-catalog.ts` | ~100 | ~90 | Pass | Pass | Pass | Pass | Pass | — |
| Other changed `src` files (deltas ≤ 48 lines) | — | — | Pass | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms | Pass | No server re-export shims for the moved modules; `setDefaultProviderApiKeyResolver` removed outright |
| No legacy old-behavior retention | Pass | The test-setup installer is removed |
| Dead code removed in touched files | Fail | CR-001 |
| Persisted-data transition followed | Pass | `Not Affected`: format and bytes unchanged |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/vitest.config.ts` `resolve.alias` block (+ `sourceRoot`, `path`, `fileURLToPath` if then unused) | DeadCode | Its stated consumer, the server code loaded by the removed `test-vault-default-resolver.ts`, is gone. No module in the autobyteus-ts Vitest run imports `autobyteus-ts` by package name except the alias test (grep in C-09). | Principle 7; the comment now misstates why it exists | Remove |
| `autobyteus-ts/tests/unit/secrets/package-self-alias.test.ts` | UnusedTest | Tests only the dead alias | Principle 7 (tests for code that has no purpose) | Remove |

## Docs-Impact Verdict

- Docs impact: `Yes` (done in `e40b0fe6ce`, `3c9a4e799a`)
- Why: REQ-013/REQ-015 under SR-009. Scripts need only the variable; Vitest live runs keep the gate.
- Files or areas affected: `TESTING.md`, `AGENTS.md`, `secret_management.md` ("core clients remain storage-neutral" replaced), `autobyteus-ts/docs/llm_module_design_nodejs.md` (resolution order), `nodejs_architecture.md`.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 | Confirmed | Unchanged |
| P-002 | Confirmed | IMP-24 re-ran setup on the moved modules |
| P-004 (two autobyteus-ts instances in server tests) | Confirmed | Reachable with no consequence (C-15); AC-018 also proven against the built server |

No new premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.2
- Overall score (`/100`): 92

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | DS-003 is now one process-independent path; DS-002 adds one first step | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Read-side format and naming in autobyteus-ts; lifecycle and authorization in the server; checked by module graph | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.2 | Explicit → environment → missing; one disable call; no global setter | Core library carries a process-global env-driven source (approved trade-off) | — |
| 4 | Separation of Concerns and File Placement | 9.4 | Small owned files; selector name split out to keep imports vault-free | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 | Single slot union; trimmed location type | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | Clear names; good contract comments | `vitest.config.ts` comment now false (CR-001) | Remove with CR-001 |
| 7 | API/E2E Readiness | 9.1 | Plain-script and AC-018 mechanics automated with a negative control | Real-key runs still open | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | Catalog equivalence traced; corrupt-entry mapping preserved; failed opens not cached; disable-first at both sites | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut, no shims | — | — |
| 10 | Cleanup Completeness | 8.5 | Installer, setter, server copies and unused `index.ts` removed | The Vitest self-alias and its test survived the removal of their only consumer (CR-001) | Remove both |

## Findings

### CR-001 — Dead Vitest self-alias and its test after the installer's removal (Low)

- Type: Dead code in touched files (Core Principle 7), this ticket.
- Contract: Principle 7 ("code that only its own tests call"; "tests … for code that no longer exists"; remove dead code in the files a change touches).
- Evidence:
  - `autobyteus-ts/vitest.config.ts:8-15` says the alias is for "server code loaded by live test setup [that] imports `autobyteus-ts` by package name".
  - That loader, `test-support/test-vault/test-vault-default-resolver.ts` → server `secret-management-provider-api-key-resolver.ts`, was removed in `9498de5f8b`.
  - A grep of everything the autobyteus-ts Vitest run can load (C-09) finds no package-name import of `autobyteus-ts` except `tests/unit/secrets/package-self-alias.test.ts`, which tests only the alias.
  - Both the alias and the test were added by this ticket in `855842b8f1`.
- Required action: remove the `resolve.alias` block and the helpers only it uses, and delete `package-self-alias.test.ts`. Confirm with `pnpm -C autobyteus-ts test` (default suite) and one gated live file against a synthetic vault (IMP-22 shape).
- Classification: `Local Fix` → `/software_engineering_team/implementation_engineer`.

## Follow-ups

None new. FU-01..FU-05 stand.

- Sent to: `None`

## Classification

`Local Fix` (CR-001)

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- Real-key runs (AC-005, AC-006, AC-007, AC-013 live, now including a plain script), the isolated-instance smoke (AC-010) and the full `pnpm test:e2e` comparison remain for API/E2E and need the user's `pnpm test-vault setup` (DEC-003).
- The core library carries a process-global, environment-driven credential source. It is constrained by lazy loading, REQ-004 locations, the Vitest gate, disable-first in the server and explicit server resolvers (ARCH-REV-004 residual).
- Server tests run two autobyteus-ts copies (P-004). Classification must stay by `kind`/`code`.
- Windows/Linux exercised only through injected policy.

## Latest Authoritative Result

- Review Decision: `Fail` (one Low Local Fix)
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.2/10 (92/100); Cleanup Completeness 8.5, all other categories ≥ 9.1
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/implementation_engineer`
- Notes: Large/High preserved. Apart from CR-001, the SR-009/SR-010 delta is implemented as designed and reviewed. Round 3 can be a Targeted Delta Review limited to CR-001.
