# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/test-vault-developer-experience/tickets/in-progress/test-vault-developer-experience/requirements-doc.md` (@ SR-008)
- Upstream Investigation Notes: `.../investigation-notes.md` (W-*, F-*, A-01..A-26)
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001..SR-008)
- Reviewed Design Spec: `.../design-spec.md` (@ SR-008, commit `67d1aaaacc`)
- Supplemental Task Artifacts Reviewed: `test-vault-evaluation-report.md` (@ SR-008); `context/55.png` and `walkthrough/*.log` (evidence)
- Relevant Solution Revision IDs: SR-006, SR-007 (user-approved), SR-008 (clarifications within that direction answering ARCH-REV-001)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer resubmission answering ARCH-REV-001 (AR-001..AR-006)
- Prior Review Round Reviewed: Round 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/test-vault-developer-experience` @ `67d1aaaacc`. Round 1 code reads still apply. New in round 2:
  - `autobyteus-server-ts/vitest.config.ts:26` and `tests/setup/test-environment-isolation.ts`: the setup file runs for every server test file, and stripping is scoped to unit/integration today;
  - `autobyteus-web/tests/e2e/*.mjs`: 47 probes, 42 using `process.env`; key/vault-related matches checked;
  - `autobyteus-web/package.json` (`name: autobyteus`) and `build/scripts/build.ts:224` (`productName: 'AutoByteus'`);
  - installed `/Applications/AutoByteus.app/Contents/Resources/app.asar`: the packaged `package.json` has `"name": "autobyteus"` and no `productName`, so Electron's app name, and with it `userData`, is `autobyteus`;
  - `~/Library/Application Support/autobyteus` and `~/Library/Logs/autobyteus` exist on this machine.

## Routing Classification Review

- Task size: `Large` (about 85 files in five areas)
- Architectural risk: `High` (production-code credential-source input; store/runtime/autobyteus-ts contracts; Electron env policy)
- Classification rationale reviewed: yes
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. The user approved the database model, the production default and the TESTING.md instruction (SR-006/SR-007). SR-008 clarifies the following within that direction:
  - REQ-005: deterministic workspace harnesses keep their own vaults, and live runs opt in through their existing gates;
  - REQ-004: the concrete refused folders;
  - REQ-016: no fallback;
  - REQ-014: Gemini mode stays explicit;
  - AC-017: a regression test with the selector exported.
- Is SR-008 within the approved direction? Yes. It preserves the user-approved boundary ("deterministic test isolation"; "Default `pnpm test:e2e` … unchanged"). The `RUN_*` opt-in gates were already approved. The servers the user named (isolated instance, `test:e2e:real`, manually started servers) honor the variable directly. No new product behavior is introduced.
- Relevant existing behavior and evidence confirmed: Yes.
- Scope guardrail confirmed: Yes. SR-008 adds UC-009/SCN-009 and states the preserved boundary "with or without `AUTOBYTEUS_TEST_VAULT` set".
- Every prospective blocking `Design Impact` finding is traceable: N/A (none).
- Remaining material ambiguity: AC-009's phrase "no test-vault code is loaded" (AR-007, non-blocking).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001, 007 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-002, 008 | Operational | Pass | Pass | Pass (one failure rule) | Confirmed | — |
| BEH-004 | Operational | Pass | Pass | Pass (`initializeLiveServerVault`; `startBuiltTestServer({testVaultSetting})`) | Confirmed | — |
| BEH-003, 009 | Operational | Pass | Pass | Pass | Confirmed | AR-007 guidance |
| BEH-005 | Contract | Pass | Pass | Pass (DS-005 opt-in owners; AC-017) | Confirmed | — |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `test-vault-evaluation-report.md` | Pass | Pass | Pass | Pass (the copy model appears only as the rejected SR-005 option) | Pass (Final @ SR-008) | — |
| `investigation-notes.md` (as the supplement inventory) | Pass | Pass | Pass | Pass (minor: A-13's design-implication column still says "`start --test-vault` performs a transfer"; superseded by l.234-239) | Pass | Optional editorial |
| `context/55.png`, `walkthrough/*.log` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Larger Requirement | — |
| Root cause explicit and evidence-backed | Pass | Duplicated Policy (F-01) + Boundary/Ownership; ARCH-REV-001 adds the harness-opt-in owner | — |
| Refactor decision explicit | Pass | Yes | — |
| Supported by concrete sections | Pass | Source union, failure rule, read-only entry, resolver split, DS-005 owners appear in the mapping and sequence | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary | Pass | Pass | Pass | Pass | Pass (failure rule in the bounded local spine) | Pass | Pass |
| DS-003 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Bounded local | Pass | Pass | N/A | Pass | Pass (four named owners) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `selectSecretVaultSource` + `SecretVaultRuntime.initialize(source)` | Pass | Pass | Pass | Pass | The 6 deterministic init sites pass `application` explicitly |
| `openReadOnlyTestVault` (Prisma-free) | Pass | Pass | Pass | Pass | Used by the runtime, `status` and test-support |
| `TestVaultCommands` | Pass | Pass | Pass | Pass | Sole writer |
| `test-support/test-vault` | Pass | Pass | Pass | Pass | Suites never read the selector directly |
| autobyteus-ts default slot | Pass | Pass | Pass | Pass | |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `test-vault/read-only-test-vault.ts` | Pass | Pass (no `repository_prisma`, runtime, migrations or importer) | Pass | Pass | Module-graph check in step 1 |
| `test-support/test-vault` | Pass | Pass | Pass | Pass | See AR-007: the facade must not pull the runtime into the autobyteus-ts graph |
| autobyteus-ts `tests/setup.ts` | Pass | Pass (dynamic import, gated) | Pass | Pass | |
| Deterministic harness code | Pass | Pass ("never forwards the selector") | Pass | Pass | |

## Interface Boundary Verdict

| Interface | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AUTOBYTEUS_TEST_VAULT` | Pass | Pass | Pass | Medium (guarded; harness opt-in) | Pass |
| `selectSecretVaultSource` → `{application, location, notice?} \| {test, directory}` | Pass | Pass | Pass | Low | Pass |
| `SecretVaultRuntime.initialize(source)` | Pass | Pass (`test` throws on invalid/forbidden/not-found/not-READY; `application` unchanged) | Pass | Low | Pass |
| `openReadOnlyTestVault(directory)` | Pass | Pass | Pass | Low | Pass |
| `startBuiltTestServer({testVaultSetting?})` | Pass | Pass | Pass (explicit value, never env) | Low | Pass |
| `isForbiddenTestVaultLocation` / `isRealAppServerDataDir` | Pass | Pass | Pass | Low | Pass |
| autobyteus-ts default slot | Pass | Pass | Pass | Medium (global) | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Key resolution | Pass | Pass | N/A | Pass | |
| Protected production paths | Pass | Pass (mirrors Electron `getProtectedProductionPaths` as a pure server predicate) | Pass | Pass | App name `autobyteus` confirmed in the packaged app |
| Env isolation | Pass | Pass (extends the existing setup and `createSanitizedTestEnvironment`) | N/A | Pass | |
| Read-only access / verify / import | Pass | Pass | Pass | Pass | |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server `secret-management/` (+ `test-vault/`, resolver split) | Pass | Pass | Pass | Pass | |
| `test-support/test-vault`, `test-support/live-e2e` | Pass | Pass | Pass | Pass | |
| server tests, autobyteus-ts tests, Electron, one web probe | Pass | Pass | Pass | Pass | |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `WritableVaultTarget` | Pass | Pass | Pass | Pass | |
| Location predicates (two named) | Pass | Pass | Pass | Pass | AR-002 resolved |
| Credential names; classifier | Pass | Pass | Pass | Pass | |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SecretVaultSource` | Pass | Pass | Pass | Pass | Pass | |
| `SecretVaultStore` | Pass | Pass | Pass | N/A | Pass | Includes the custom-provider batch methods; read-only throws |
| `TestVaultStatus {location, state, configured, missing}` | Pass | Pass | Pass | N/A | Pass | |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server secret-management files | Pass | Pass | Pass | Pass | |
| `test-runtime-bootstrap.mjs` | Pass | Pass | N/A | Pass | `createSanitizedTestEnvironment` never forwards by itself |
| `test-support/test-vault/test-vault.ts` facade | Pass | Pass | Pass | Pass | AR-007: keep the server-free gate policy apart from runtime-touching initializers |
| Other rows | Pass | Pass | N/A | Pass | |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `secret-management/test-vault/` | Pass | Pass | Low | Pass | The Prisma-free entry is separate from the commands |
| `secret-management/secret-vault-source.ts` | Pass | Pass | Low | Pass | |
| `test-support/test-vault/` | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Env→vault helper; env gates; `provider-access.ts`; obsolete docs | Pass | Pass | Pass | Pass | |
| The resolver's default `getSecretVaultRuntime()` parameter | Pass | Pass (runtime-bound factories file; 4 call sites) | Pass | Pass | |
| Dead code in touched files | Pass | N/A | Pass | Pass | None further found |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Test credential sourcing | No | Pass | Pass | |
| Selected-vault failure | No (degraded/fallback rejected) | Pass | Pass | |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Proportionate? | Migration Safety If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Production vault / app data | Not Affected | Pass | Pass | N/A | Pass | |
| Worktree test DBs | Discard or Rebuild (FU-04) | Pass | Pass | N/A | Pass | |
| Standing test vault | New; read-only consumers; never migrated | Pass | Pass | N/A | Pass | P-002 observed in implementation |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–9 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Live suite; deterministic suite with an exported selector; isolated instance; live test; missing vault; log line | Yes | Pass | Pass | Pass | |

## Material Premise Validation

### `P-001` — Exported selector reaching deterministic E2E servers (from ARCH-REV-001)

- Reachability: `Reachable` (unchanged).
- Review consequence: now handled. The server setup captures the selector and removes it for all test files (the setup file is registered for every server test: `vitest.config.ts:26`). Built test servers forward it only with an explicit `testVaultSetting`. Deterministic init sites pass `application`. The AC-017 regression proves the result.

### `P-003` — The 21 other web probes spawn backends with `...process.env` while the selector is exported

- Related contract: the Preserved Behavior Boundary lists `pnpm test:e2e`, server unit/integration and default autobyteus-ts; web probes are not listed.
- Initiating basis kind: `Operational` (a developer runs a web probe from a live-testing shell).
- Forward path: probe → `dist/app.js` with the inherited env → selector honored → read-only test vault.
- Consequence: I found no vault-state assertion or key save in the other probes; the "configured" matches are agent/team configuration. Discovery calls with real keys are possible.
- Reachability: `Reachable`, with low consequence.
- Review consequence: accepted as residual R-D, plus the TESTING.md "not in your shell profile" guidance and FU-05. No machinery required.

### `P-002` — Setup re-run from an older worktree against a newer-schema vault

- Reachability: `Unclear`. Observed in implementation; drives nothing.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

Blocking findings: None.

### AR-007 (non-blocking, implementation guidance) — The test-support facade must not put server vault code into the default autobyteus-ts run

- Type: Out-of-Scope Recommendation / implementation guidance. Severity: Low.
- Protects: AC-009 ("no test-vault code is loaded"), REQ-011, and the design's own forbidden rule ("anything autobyteus-ts setup loads importing `repository_prisma`, `secret-vault-runtime` …").
- Evidence:
  - The 18 autobyteus-ts live files will statically import `liveProviderTest` from `test-support/test-vault`.
  - `vitest run` loads them in the default suite (with the gate off they skip, but the import still runs).
  - The same facade also hosts `initializeLiveServerVault`, which needs `secret-vault-runtime` (Prisma).
- Guidance:
  - Keep the gate, skip, strict and classifier policy in a server-free module.
  - Load the runtime-touching pieces (`installTestVaultDefaultResolver`, `initializeLiveServerVault`) lazily or from separate modules.
  - Extend the step-1 module-graph check to the module the live files import.
  - Read AC-009's "test-vault code" as server vault code (`secret-management/**`).

### AR-008 (non-blocking, editorial)

- `investigation-notes.md` A-13 still carries the superseded "`start --test-vault` performs a transfer" implication. It is withdrawn by the notes' own l.234-239, so it is not misleading in context.

## Classification

N/A (Pass)

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)

## Residual Risks

- R-A (Vitest self-alias class identity): escalation trigger in place.
- R-B: `node:sqlite` is experimental; already used in the product.
- R-C: legacy custom-provider test DB with the selector set → warning.
- R-D / P-003: other web probes honor an exported selector; low consequence; FU-05.
- P-002: setup re-run from an older worktree is Unclear.
- The optional autobyteus-ts resolver parameter removes a compile-time check for server callers. The server always passes its resolver, and the "none → `MissingApiKeyError`" test covers it.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: AR-001..AR-004 are resolved and AR-005/AR-006 are accepted, all verified against the current artifacts and code. AR-007 and AR-008 are non-blocking guidance for implementation.
