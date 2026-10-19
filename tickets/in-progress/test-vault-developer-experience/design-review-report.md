# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/requirements-doc.md` (@ SR-007)
- Upstream Investigation Notes: `.../investigation-notes.md` (W-*, F-*, A-01..A-22)
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-007)
- Reviewed Design Spec: `.../design-spec.md` (@ SR-007, commit `51c389fe6b`)
- Supplemental Task Artifacts Reviewed: `test-vault-evaluation-report.md`; `context/55.png` and `walkthrough/*.log` (evidence only)
- Relevant Solution Revision IDs: SR-006 (behavior and design), SR-007 (REQ-013/AC-012 TESTING.md wording; docs only)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff (Architecture Design Complete, Large/High) at SR-006; basis moved to SR-007 during the review
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `codex/test-vault-developer-experience` @ `51c389fe6b` (base `origin/personal` @ `d28c56d5d`). Code read: `secret-vault-runtime.ts`, `bootstrap/secret-vault-bootstrap.ts`, `persistence/secret-vault-repository.ts`, `services/secret-management-service.ts`, `resolution/secret-management-provider-api-key-resolver.ts`, `catalog/provider-credential-catalog.ts`, `provisioning/local-environment-secret-import-service.ts` (imports), `server-runtime.ts:165-176`, `start-standalone-application-host.ts:100-150`, `config/app-config.ts:55-65`, `autobyteus-web/electron/{appDataPaths.ts, main.ts:15-23, launch-profile/electronLaunchProfile.ts, server/serverRuntimeEnv.ts:95-124}`, `autobyteus-ts/src/{secrets/provider-api-key-resolver.ts, llm/llm-factory.ts:222-248}`, `autobyteus-ts/{vitest.config.ts, tests/setup.ts}`, `test-support/live-e2e/test-runtime-bootstrap.mjs:24-36, 228-280`, `tests/e2e/secret-management/provider-secret-lifecycle-graphql.e2e.test.ts:110-160`, `tests/setup/test-environment-isolation.ts`, `llm-management/services/gemini-configuration-service.ts:72-100`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: ~75 files in four packages; a new credential-source input read by production server code; `SecretManagementService` store contract; `SecretVaultRuntime.initialize` signature; autobyteus-ts public constructor/factory signatures; Electron env policy.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Contradicted` (AR-001 and AR-003; the rest is confirmed)
- Approved requirements / intended behavior understood: Yes. The approved model is "like a database": `AUTOBYTEUS_TEST_VAULT` (a location) makes server processes and autobyteus-ts test code read the standing vault read-only. When it is unset, or the server is on `~/.autobyteus/server-data`, behavior is today's. No key goes through env, argv, chat or logs. SR-007 adds TESTING.md wording: the exact `export` line, Rule 4 replaced, and the variable in every real-key example.
- Relevant existing behavior and evidence confirmed: Yes. There are two startup init sites (A-18). The bootstrap swallows vault errors into a health value, so `initialize` never throws for vault problems today. The repository is Prisma-global. Electron production uses `inherit-caller` with data dir `~/.autobyteus/server-data`, and isolated launches use `isolated-baseline` with a safe E2E root. Built test servers get `createSanitizedTestEnvironment`. Server E2E keeps the inherited env (A-14).
- Scope guardrail confirmed: Yes. In scope: UC-001..UC-008. Out of scope: production vault behavior, the general importer and CLI-login tests. Preserved: "deterministic test isolation" and "Default `pnpm test:e2e` and server unit/integration suites unchanged". Review Authority as stated.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: Yes. See Findings.
- Remaining material ambiguity: AC-010/SCN-007/DEC-007 still say "test-vault option"/"copy" (AR-003).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001, BEH-007 | Operational | Fail (AC-004 OS app-data refusal not designed) | Pass | Pass | Needs Correction | AR-002 |
| BEH-002, 004, 008 | Operational | Pass | Pass | Fail (the deterministic built-server and in-process suites with the selector set contradict the preserved boundary under the SR-007 `export` instruction; the startup-failure rule is inconsistent) | Needs Correction | AR-001, AR-004 |
| BEH-003, 009 | Operational | Pass | Pass | Pass (R-A covered; see AR-005 recommendation) | Confirmed | — |
| BEH-005 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `test-vault-evaluation-report.md` | Pass | Pass | Pass | Fail: §5.1 items 2–3 ("each run uses a copy", "run copy"), the trade-offs, DEC-001 ("copy per run") and DEC-007 (`--test-vault` copy) contradict SR-006 §5.0 and REQ-007; it also uses `pnpm test-vault:setup` while the design uses `pnpm test-vault setup` | Fail: the requirements doc lists it as "Behavior-defining; pending" @ SR-004, and the investigation notes list it as "Ready for user review"; the design says "Approved @ SR-006 (§5.0)" | AR-003 |
| `context/55.png`, `walkthrough/*.log` | Pass | Pass | Pass | Pass | Pass (evidence) | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Larger Requirement; triggers listed | — |
| Root-cause classification is explicit and evidence-backed | Pass | Duplicated Policy (F-01: four credential routes) + Boundary/Ownership; confirmed in code (env helper, autobyteus-ts env reads) | — |
| Refactor decision is explicit | Pass | Refactor needed now: Yes | — |
| Refactor decision is supported by concrete design sections | Pass | Source union, store interface, verify-only bootstrap, default slot all appear in file mapping and sequence | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 setup/status/remove | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 server startup → selected vault | Primary | Pass | Pass | Pass | Pass | Fail: the design does not say whether `initialize(test)` throws or returns degraded health (AR-004), or which source the deterministic suites use (AR-001) | Pass | Fail |
| DS-003 autobyteus-ts setup → default resolver → provider | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 credential stripping | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `selectSecretVaultSource` + `SecretVaultRuntime.initialize(source)` | Pass | Pass | Pass | Pass | The two startup sites and in-process suites pass config only. |
| `openTestVault()` (server `test-vault/index.ts`) | Pass | Pass | Pass | Pass | The entry mixes Prisma-free reads and Prisma-backed commands (AR-005, non-blocking). |
| `TestVaultCommands` | Pass | Pass | Pass | Pass | The only writer. |
| autobyteus-ts `resolveProviderApiKeyResolver` / default slot | Pass | Pass | Pass | Pass | A dependency rule forbids production setters. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts `src` | Pass | Pass | Pass | Pass | `src` must not import server or test-support. |
| `test-support/test-vault` → server `src` + autobyteus-ts `src` | Pass | Pass | Pass | Pass | Follows the established A-10 pattern. Test-only reverse edge accepted (R-04). |
| Electron `serverRuntimeEnv` | Pass | Pass | Pass | Pass | Uses the variable name only. |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AUTOBYTEUS_TEST_VAULT` | Pass | Pass | Pass (absolute dir) | Medium (inherited; guarded) | Pass |
| `selectSecretVaultSource(input)` → `SecretVaultSource` union | Pass | Pass | Pass | Low | Pass |
| `SecretVaultRuntime.initialize(source)` | Pass | Fail: the failure contract for `test` is unstated (AR-004) | Pass | Low | Fail |
| `SecretVaultStore` | Pass | Pass ("exactly the methods the service and bootstrap use", which includes the custom-provider batch/receipt methods; read-only throws) | Pass | Low | Pass |
| `pnpm test-vault setup\|status\|remove` | Pass | Pass | Pass | Low | Pass |
| autobyteus-ts default slot | Pass | Pass | Pass | Medium (global) | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Key resolution | Pass | Pass | N/A | Pass | The service, resolver, catalog and crypto are reused unchanged. |
| Read-only DB access | Pass | Pass | Pass | Pass | Uses the inspection-service technique (A-02). |
| Verify an established vault | Pass | Pass | Pass | Pass | Validators already live in the bootstrap. |
| Setup writer | Pass | Pass | Pass | Pass | Importer plus extracted `WritableVaultTarget`. |
| Protected production paths | Fail | Fail | N/A | Fail | Electron already defines `getProtectedProductionPaths()` (base data + `userData`/`sessionData`/`logs`/`crashDumps`). AC-004's "OS app-data folder" is not mapped (AR-002). |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `secret-management/` (+ `test-vault/`) | Pass | Pass | Pass | Pass | |
| autobyteus-ts `src/secrets/` + 31 clients | Pass | Pass | Pass | Pass | Mechanical change. |
| `test-support/test-vault/`, `test-support/live-e2e/` | Pass | Pass | Pass | Pass | The selector-forwarding scope is at issue (AR-001). |
| Electron `serverRuntimeEnv` | Pass | Pass | Pass | Pass | |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `WritableVaultTarget` | Pass | Pass | Pass | Pass | Shared by the importer and setup. |
| Real-app-data detection | Pass | Pass | Pass | Pass | One function serves two different checks: the setup location prefix (`~/.autobyteus/**`) and server data-dir equality. Name both predicates explicitly when AR-002 is addressed. |
| Credential variable names; access classification | Pass | Pass | Pass | Pass | |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SecretVaultSource` | Pass | Pass | Pass | Pass | Pass | |
| `SecretVaultStore` | Pass | Pass | Pass | N/A | Pass | |
| `TestVaultStatus` | Pass | Pass | Pass | N/A | Pass | |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `secret-vault-source.ts`, `secret-vault-runtime.ts`, `persistence/*store*.ts`, `bootstrap/*` | Pass | Pass | Pass | Pass | |
| `test-vault/{location,commands,index}.ts` | Pass | Pass | Pass | Pass | AR-005 recommends a separate read-only entry. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Fail | Pass | N/A | Fail | Forwarding the selector in `createSanitizedTestEnvironment` applies it to every built test server, deterministic ones included (AR-001). |
| Other rows | Pass | Pass | N/A | Pass | |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `server secret-management/test-vault/` | Pass | Pass | Low | Pass | |
| `secret-management/secret-vault-source.ts` | Pass | Pass | Low | Pass | |
| `test-support/test-vault/` | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `live-runtime-secret-vault-helpers.ts` | Pass | Pass | Pass | Pass | 8 suites |
| Credential env gates (18 ts files, 2 server suites, APC-E2E-008 fetch) | Pass | Pass | Pass | Pass | |
| `provider-access.ts` | Pass | Pass | Pass | Pass | Logic moved |
| Stale docs | Pass | Pass | Pass | Pass | SR-007 wording included |
| Dead code in touched files | Pass | N/A | Pass | Pass | Nothing more found in the files read |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Test credential sourcing | No | Pass | Pass | No "env if present" fallback. The default slot is empty unless test setup fills it. |
| Vault source selection | No | Pass | Pass | Two sources is a selection, not a dual path. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Proportionate? | Migration Safety If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Production vault/app data | Not Affected | Pass | Pass | N/A | Pass | The guard holds: Electron production is always `~/.autobyteus/server-data` (`electronLaunchProfile.ts`). |
| Worktree test DBs | Discard or Rebuild (left for the user, FU-04) | Pass | Pass | N/A | Pass | |
| Standing test vault | New data; consumers read only two tables, read-only, and never migrate it | Pass | Pass | N/A | Pass | |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server core → startup → autobyteus-ts → test-support → E2E → Electron → docs | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Live test, probe, live server suite, isolated instance, log line | Yes | Pass | Pass | Pass | |
| Deterministic suites while the selector is exported | Yes | Fail | Fail | Fail | AR-001 |

## Material Premise Validation

### `P-001` — With the selector exported in a shell, default deterministic E2E servers open the standing vault read-only

- Related approved requirement or established contract: Preserved Behavior Boundary ("deterministic test isolation"; "Default `pnpm test:e2e` and server unit/integration suites unchanged"); REQ-013/AC-012 @ SR-007; REQ-005.
- Relevant behavior ID(s): BEH-002, BEH-004, BEH-005
- Initiating basis kind: `Operational`
- Independent trigger: a developer or agent follows the SR-007 TESTING.md "Test vault" section, whose first instruction is the exact line `export AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` (also printed by `pnpm test-vault setup`). The AGENTS.md entry says to "set `AUTOBYTEUS_TEST_VAULT` … and run as usual". In the same shell they run `pnpm test:e2e`, the documented deterministic suite, for example during API/E2E validation that runs deterministic and live checks together.
- Support evidence: REQ-013/AC-012 @ SR-007 and the design's AGENTS.md guidance text. `pnpm test:e2e` is in root `package.json:8`.
- Forward path: `pnpm test:e2e` → Vitest `tests/e2e` (inherited env kept, A-14) → `provider-secret-lifecycle-graphql.e2e.test.ts:119` `startBuiltTestServer` → `test-runtime-bootstrap.mjs:280` `createSanitizedTestEnvironment`, which forwards `AUTOBYTEUS_TEST_VAULT` (design file mapping) → built server → `AppConfig.get` → `selectSecretVaultSource` (data dir is a test runtime root, so not real data) → `{kind:'test'}` → `ReadOnlySecretVaultStore` → the test's `saveProviderApiKey` mutation (l.132-152) → `SECRET_VAULT_READ_ONLY`. Lifecycle suites (13 files under `tests/` initialize the vault) also see real configured keys where they expect a fresh vault. In-process suites depend on the source they pass to `initialize(source)`, which the design does not specify.
- Lifecycle preconditions and material consequence: a standing vault exists and the selector is exported. Deterministic suites that own their vault lifecycle fail or change result. Real keys become visible to suites that never asked for them (R-D).
- Reachability: `Reachable`
- Review consequence / proportionate response: AR-001. The design's R-D mitigation ("Docs recommend setting it per command") is contradicted by the SR-007 `export` instruction.

### `P-002` — An older worktree reading or re-running setup on a vault created by a newer schema

- Related approved requirement or established contract: REQ-007, AC-002
- Initiating basis kind: `Operational`
- Independent trigger: running setup again from a different worktree.
- Forward path: consumers read only `secret_entries` and `secret_encryption_metadata` read-only (design). Setup from an older worktree runs that worktree's migrations against a newer DB; that behavior was not verified.
- Reachability: `Unclear`
- Review consequence: not a finding. It is listed under residual risk for implementation to observe.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| AC-010/SCN-007/DEC-007 "test-vault option"/"copy" vs REQ-012 "started while `AUTOBYTEUS_TEST_VAULT` is set" | API/E2E validates AC-010 literally | AR-003 | Open |

## Review Decision

- `Fail`

## Findings

### AR-001 — Deterministic suites under an exported selector are undecided; the R-D mitigation is contradicted by SR-007

- Type: Design Impact. Severity: High (blocking).
- Protects: Preserved Behavior Boundary ("deterministic test isolation"; "Default `pnpm test:e2e` … unchanged"), REQ-013/AC-012 @ SR-007, REQ-005.
- Scope status: Within Approved Scope. Changes approved behavior: No, as long as the response keeps the deterministic suites unchanged. If the designer concludes that REQ-005's "test servers, in-process server tests" must also cover the deterministic vault-lifecycle suites, the conflict with the preserved boundary is a Requirement Gap and needs the user's decision.
- Evidence and premise: P-001 (Reachable). `createSanitizedTestEnvironment` serves every built test server, live and deterministic. The design forwards the selector there and does not say which `SecretVaultSource` in-process deterministic suites pass after the `initialize(source)` signature change.
- Required update:
  - State explicitly how deterministic suites behave when the selector is set. For example: suites that own their vault lifecycle (secret lifecycle, import, restart, custom-provider migration, provider Settings suites) start their servers or the runtime on the application source. They can do this by removing the selector from their own built-server environment, or by passing `{kind:'application'}` in-process. Only live and gated harnesses and suites forward or select the test source.
  - Add a test that proves this: with the selector exported, `pnpm test:e2e` results are unchanged.
  - Replace R-D's "per command" mitigation with this decision, or make the docs consistent with it.
- Why proportionate: one explicit rule plus an opt-out at a few lifecycle suites. No new product behavior.
- Recommended recipient: `/solution_designer`.

### AR-002 — AC-004 "OS app-data folder" refusal is not designed

- Type: Design Impact. Severity: Medium (blocking).
- Protects: REQ-004, AC-004, QR-002.
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence: AC-004 requires a location "inside `~/.autobyteus` or an OS app-data folder" to be refused before file access. The design's `TestVaultLocation` refuses only `~/.autobyteus/**`, and R-E names only `~/.autobyteus/server-data`. The product already treats Electron `userData`, `sessionData`, `logs` and `crashDumps` as protected production paths (`autobyteus-web/electron/main.ts:15-23`). The trigger is direct and supported: `AUTOBYTEUS_TEST_VAULT=<OS app-data dir> pnpm test-vault setup` (AC-004's own precondition).
- Required update: define the refused set concretely. Use `~/.autobyteus/**` plus the product's per-OS app-data roots (the Electron `userData` defaults for macOS, Windows and Linux), which the server CLI can compute without Electron. Or state with evidence why no OS app-data root holds production data and get AC-004 amended. Keep the setup-location predicate separate from the server's data-dir-equality guard.
- Why proportionate: a small, pure path policy.
- Recommended recipient: `/solution_designer`.

### AR-003 — Requirements and supplement still describe the superseded run-copy / `--test-vault` model

- Type: Requirement Gap. Severity: Medium (blocking, because downstream validation reads ACs literally).
- Protects: the approved SR-006 direction (REQ-005, REQ-007, REQ-012).
- Scope status: Requirement Gap. This is editorial alignment to the already approved SR-006 direction. No new behavior and no user approval needed, unless the designer finds otherwise.
- Changes approved behavior: No.
- Evidence:
  - requirements-doc: BEH-002/003/004 ("run copy"); SCN-003/004/005/007 ("copies"/"vault copy"/"Instance starts on a vault copy"); UC-007/AC-010 ("with the test-vault option"); DEC-001 ("per-run copies"); DEC-007 ("`isolated-app start --test-vault` (copy)"); Data Continuity ("Run copies sidestep schema-version skew"); External Contracts ("Preserved by run copies"); Architecture Phase Input; "Exact approved requirements baseline … @ SR-004"; supplement "pending" @ SR-004.
  - Evaluation report: §5.1 items 2–3, Trade-offs, DEC-001, DEC-007 and the `test-vault:setup` spelling.
  - Investigation notes: supplement inventory status "Ready for user review"; "Notes For Architecture Design" ("inject an env-backed test resolver"); U-02 resolution ("Avoided by run copies").
- Required update: align these rows to SR-006/SR-007 (read-only selection, selector forwarded to isolated instances, no option and no copies). Record the exact approved baseline (SR-006/SR-007) and the supplement's status.
- Recommended recipient: `/solution_designer`.

### AR-004 — Failure contract of `initialize({kind:'test'})` is inconsistent

- Type: Design Impact. Severity: Low (fix in the same revision).
- Protects: AC-016 (alternate outcome `TEST_VAULT_NOT_FOUND` → startup fails), REQ-016 (no silent fallback).
- Scope status: Within Approved Scope. Changes approved behavior: No.
- Evidence: today `SecretVaultBootstrap.initializeOrVerify` catches every error into a health value, so `SecretVaultRuntime.initialize` never throws and `server-runtime.ts:170`'s fatal path is not reached for vault problems. The design says "missing or invalid vault → startup fails", but its sequence step 1 says "verify-only (key mismatch → unavailable)", which is degraded health with the server still running. Neither falls back to the application vault, but the two rules disagree.
- Required update: state one rule in the bounded local spine. Which test-source conditions throw (and so fail startup at both sites), and which yield non-READY health? At minimum, not-found throws before the bootstrap.
- Recommended recipient: `/solution_designer`.

### AR-005 (non-blocking recommendation) — Keep the autobyteus-ts test path Prisma-free and lazy

- Type: Out-of-Scope Recommendation / implementation guidance. Severity: Low.
- Evidence:
  - `test-vault/index.ts` exports `openTestVault` together with `TestVaultCommands`, whose graph runs importer → `runMigrations` → `repository_prisma`.
  - The reused `SecretManagementProviderApiKeyResolver` statically imports `secret-vault-runtime.ts` → `SecretVaultRepository` → `repository_prisma`.
  - The design's own escalation trigger names "the autobyteus-ts test setup needing Prisma". REQ-011's default suite would evaluate server source in every run if `tests/setup.ts` imports it statically.
- Recommendation: give the read-only consumer its own entry module. Pass an explicit `managementProvider` so the runtime default is not needed. Have `tests/setup.ts` dynamically import test-support only when the selector is set.

### AR-006 (non-blocking note) — Gemini through `LLMFactory.createLLM`

- `createLLM` throws `GEMINI_RUNTIME_RESOLVER_REQUIRED` without a `GeminiRuntimeResolver` (`llm-factory.ts:242-243`). The default slot covers keys only.
- Recommendation: state that Gemini live tests and probes pass an explicit runtime resolver (not a key), so REQ-014's "no extra code" is understood as key-only for Gemini.

## Classification

- `Design Impact` (AR-001, AR-002, AR-004), with one `Requirement Gap` (AR-003, editorial alignment to approved direction).

## Recommended Recipient

`/solution_designer`

## Residual Risks

- R-A (Vitest self-alias class identity) and R-B (`node:sqlite` experimental) are accepted as designed.
- P-002 (setup re-run from an older worktree against a newer-schema vault) is Unclear. Implementation should observe it, not design for it.
- Making the autobyteus-ts resolver parameter optional removes a compile-time check for server callers. The server always passes its resolver, and the "no default → `MissingApiKeyError`" unit test covers it.
- Standalone hosts with non-canonical data dirs honor the selector by design (REQ-016 guards only `~/.autobyteus/server-data`).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (P-001 Reachable drives AR-001; P-002 Unclear drives nothing)
- Notes: The core architecture is sound and proportionate: the source union chosen once, the read-only store behind the existing service, the verify-only bootstrap, the guard on real app data, the test-only default slot and the clean removal. Four bounded corrections are needed before implementation.
