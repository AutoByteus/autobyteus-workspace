# Design Review Report: seal-migrations-per-folder (autobyteus-280)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/seal-migrations-per-folder/requirements-doc.md` (Approved; SR-002 AC-004/AC-005 wording)
- Upstream Investigation Notes: `tickets/in-progress/seal-migrations-per-folder/investigation-notes.md` (S-01..S-12; autobyteus-204 F-01, A-05, O-1 carried over)
- Upstream Solution Revision Record: `tickets/in-progress/seal-migrations-per-folder/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `tickets/in-progress/seal-migrations-per-folder/design-spec.md` (SR-003, `Ready`, commit `f40bad9713`; SR-003 answers implementation DI-001)
- Supplemental Task Artifacts Reviewed: `release-notes.md` (SR-002)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `tickets/in-progress/seal-migrations-per-folder/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: SR-003 narrow re-review from `/software_engineering_team/solution_designer` (implementation Design Impact DI-001: two ports, D-7 replaced, no cross-migration imports; guideline "Sealed migration area")
- Prior Review Round Reviewed: 2 (`ARCH-REV-002`, Pass)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/seal-migrations-per-folder` at `24b003306e`. Opened at their cited lines:
  - `server-runtime.ts:155-241`;
  - `start-standalone-application-host.ts:147-210`;
  - `token-usage-migration-readiness.ts:1-80`;
  - `app-data-migration-types.ts:1-6` (statuses);
  - the imports of the runner, registry and repositories;
  - `custom-llm-provider-store.ts:39-125`, plus every call site of the store (`model-catalog-service.ts:88,201,334`, `model-availability-service.ts:73`, `custom-llm-provider-runtime-sync-service.ts:27`, `llm-provider-service.ts:149-192,297,344,378`, `statistics-provider.ts:50-57`, `token-usage-analytics-provider.ts:146-151`);
  - `custom-provider-readable-id-app-data-migration.ts:110-290`;
  - `remove-skill-improvement-data-migration.ts` (M1..M5 helpers);
  - production imports made by migration code (grep);
  - the web consumers of the token-usage error codes (`TokenUsageAnalyticsView.vue:60`, `TokenUsageRunDetailsView.vue:105`);
  - `autobyteus-ts/src/memory/migration/` and its users.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed:
  - released migrations are rewritten internally;
  - a startup gate changes (G-1);
  - shared readiness with 11 importing files changes shape;
  - a cross-package move.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood:
  - a sealed migration area, with one folder per migration plus a shared migrations-only `frozen/` layer (DEC-001, the user);
  - no imports across the boundary in either direction, enforced by a test;
  - capability readiness instead of migration-id checks;
  - G-2 unchanged; G-1 narrowed (DEC-003);
  - the 205 repair (REQ-008);
  - the library's `memory/migration/` moved;
  - the guideline rule;
  - every migration's output unchanged (REQ-007).
- Relevant existing behavior and evidence confirmed:
  - **G-1, server host:** `server-runtime.ts:230-241` throws `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED` unless the status is SUCCEEDED or SUCCEEDED_WITH_WARNINGS. The same check is at `start-standalone-application-host.ts:199-210`, so both hosts carry it.
  - **G-2:** `server-runtime.ts:161-168` sets a pending state (`CURRENT_SCHEMA_DEGRADED`, `NOT_RUN`) after the schema check. `:201-213` sets READY only on terminal success.
  - **Statuses:** `NOT_RUN` / `RUNNING` / `SUCCEEDED` / `FAILED` / `SUCCEEDED_WITH_WARNINGS`.
  - **Custom-provider store:** writes (`createProvider`, `deleteProvider`) parse the existing file with the current parser and refuse an unconverted file (`custom-llm-provider-store.ts:80-116`).
  - **Custom-provider migration:** after a failed run that already published an empty V3 file, a retry returns `SKIPPED … ALREADY_CURRENT` (`:179-186`).

  Together these mean the G-1 narrowing does not let production writes corrupt a later retry. The design should record this (AR-002).
- Scope guardrail confirmed: yes. No retirement, no change to what migrations convert apart from REQ-008, and no Prisma history change.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`:
  - AR-001 → REQ-003, REQ-004, REQ-007;
  - AR-002 → REQ-006, AC-004;
  - AR-003 → REQ-006, AC-003;
  - AR-004 → REQ-006, AC-003, AC-004;
  - AR-005 → REQ-008, AC-005, REQ-007.
- Statements about existing code the design relies on, opened at their cited lines:
  - S-11 and S-12, the G-1/G-2 lines, `app-data-migrations.ts:8`, `context-file-record-locators.ts:7,43` and the runner methods are accurate.
  - Inaccurate or incomplete:
    - "capability readiness … consumed only by the startup hosts and token-usage readiness" (Change Scope, derived consumers) omits the web views that match the token-usage error code (AR-003).
    - "Allowed migration-area imports from production `src/`: `config/prisma-client-factory.ts` only" contradicts the contract's own imports: `app-data-migration-runner.ts:3` and `app-data-migration-registry.ts:3` import `config/app-config-provider.js` (AR-001).
    - The live vault dependency of `custom-provider-readable-id-app-data-migration.ts:11,141-143,234` is not addressed (AR-001).
- Remaining material ambiguity: none in the basis.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass (AR-001 resolved) | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass (AR-003, AR-004 resolved) | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass (AR-002 resolved) | Confirmed | — |
| BEH-004 | Operational | Pass | Pass | Pass (AR-005 resolved) | Confirmed | — |
| BEH-005 | Contract | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `release-notes.md` | Pass | Pass (AC-005) | Pass | Pass | Pass | — (optional wording, R-6) |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Refactor | — |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/ownership issue: two-way coupling (S-07, A-05) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes; retirement deferred to 204 | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | D-1..D-8, sequence, DS-004 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 / DS-001b startup (two hosts) | Primary | Pass | Pass | N/A | Pass | Pass: `assertTokenUsageCurrentSchema -> markCapabilitiesPending() -> vault -> runner.runPending() -> applyCapabilityReadiness(runner.capabilityReadiness()) -> readiness index`, one owner (`startup/app-data-capability-readiness.ts`) | Pass | Pass |
| DS-002 gated features | Primary | Pass | Pass | N/A | Pass | Pass: each entry form goes to `CustomLlmProviderStore` (the only gate) and on to the outcome table; token usage keeps its codes | Pass | Pass |
| DS-003 manual retry | Primary | Pass | Pass | N/A | Pass | Pass: the resolver calls the same `applyCapabilityReadiness` | Pass | Pass |
| DS-004 enforcement | Bounded local | Pass | Pass | N/A | Pass | Pass: split rule (`migrations/**`/`frozen/**` versus the contract) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runner contract (runner, registry, `domain/`, `repositories/`) | Pass | Pass | Pass | Pass | The contract is the wiring point; the registry builds each migration with explicit arguments (AR-001 resolved) |
| `migrations/**`, `frozen/**` | Pass | Pass | Pass | Pass | Only `domain/**`, `prisma-client-factory`, node and third-party code |
| `CustomLlmProviderStore` gate | Pass | Pass | Pass | Pass | No caller checks the capability itself |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Production → contract only | Pass | Pass | Pass | Pass | — |
| SR-003 ports: `domain/definition-name-lookup.ts`, `domain/run-history-catalog-invalidation.ts` | Pass | Pass | Pass | Pass | Verified: `run-history-index-v2-migration.ts:374-377` and `team-run-history-index-v2-migration.ts:515-518` dynamically import the live definition providers; `:13,337`, `:26,470` and `agent-org-history-index-transition.ts:3,41-42` call the live `reset*CatalogState` functions. A frozen copy would reset nothing, so a port wired by the registry, called at the same moment, keeps the output and side effect identical. A port carries data or an action, never a current class |
| D-7 replaced: `context-file-record-locators.ts` → `frozen/server/context-files/services/` | Pass | Pass | Pass | Pass | Verified: its header says "Migration-only module"; its importers are three migration files plus two tests (`released-message-log-repairs.test.ts`, `context-file-access-containment.test.ts`). Nothing moves into production |
| No cross-migration imports (prerequisite ids as string literals; shared code to `frozen/`) | Pass | Pass | Pass | Pass | The registry already rejects an unregistered or misordered prerequisite at construction; the boundary test adds the folder-to-folder rule |
| Migration code → `domain/` ports | Pass | Pass | Pass | Pass | The `SecretRemovalOwner` port lives in `domain/` and is implemented by the live vault, so the vault stays its only writer. Built-in provider names are passed live (the same input as today, REQ-007). Registry → migration → port, in call order |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `capabilityReadiness()`; `holdsBackCapabilities?` | Pass | Pass | Pass | Low | Pass |
| `markCapabilitiesPending()` / `applyCapabilityReadiness(readiness)` | Pass | Pass | Pass | Low | Pass |
| Token-usage error codes (kept) | Pass | Pass | Pass | Low | Pass |
| `CustomLlmProviderStoreError('CUSTOM_PROVIDERS_MIGRATION_PENDING')` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

`Pass`, as in round 1. Rule check: no function handed to one mechanism to reach another collaborator, no compound owner, every entry form traced.

## Subsystem / Capability-Area Allocation Verdict

`Pass`.

## Reusable Owned Structures Verdict

`Pass`, as in round 1.

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Token-usage readiness state (internal `HISTORY_MIGRATION_PENDING`; codes unchanged) | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass`. The status snapshot consumers are unchanged; the web views matching the token-usage codes are kept working; `CUSTOM_PROVIDERS_MIGRATION_PENDING` reaches the Settings provider page and model availability. One citation path is off (R-4).

## File Responsibility Mapping Verdict

`Pass`.

## Subsystem / Folder / File Placement Verdict

`Pass`.

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Production imports of migration ids; legacy constant; GraphQL special case; TeamRun V2 warning; migration-id readiness state; D-8 bridge; library `memory/migration/` | Pass | Pass | Pass | Pass | — |
| Constructor defaults reading production config or services | Pass | Pass | Pass | Pass | Listed, plus "any further one the architecture test reports" |

## Legacy / Backward-Compatibility Verdict

`Pass`.

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| All stores | Not Affected (output unchanged) | Pass | Pass | N/A | Pass | REQ-007 with unchanged assertions |
| 205 helper-run deletion (REQ-008, a same-ID repair) | Narrowing | Pass | Pass | Pass | Pass | Same-ID applicability stated. M4 guarded like M5; an unreadable session file is preserved. Fixtures cover the compactor survival, the M3-failure retry and the unreadable session (AR-005 resolved) |
| G-1 narrowing, retry safety | — | Pass | Pass | Pass | Pass | Recorded in the Guidance |

## Change / Refactor Sequence Verdict

`Pass`, as in round 1.

## Example Adequacy Verdict

`Pass`.

## Material Premise Validation

### `MP-001` — The custom-provider migration is pending while the server runs (G-1 narrowed)

- Related requirement: REQ-006, DEC-003, AC-004
- Relevant behavior ID(s): BEH-003
- Initiating basis kind: `System`
- Trigger: on an install whose `custom-llm-providers.json` is V2 or legacy, the startup runner executes `20260803_custom_provider_readable_identity`. It ends `FAILED`, for example through `CUSTOM_PROVIDER_READABLE_ID_PROVIDER_PUBLISH_FAILED` (`:222-229`) or a failed selector or secret item.
- Forward path: the status is not terminal success → the capability is not ready → the server serves. Users reach the custom-provider entry forms: catalog listing (`model-catalog-service.ts:88`, which catches), run model resolution (`:334`, `model-availability-service.ts:73`), runtime sync (`:27`), provider CRUD (`llm-provider-service.ts:149-192`) and token-usage display lookups (`statistics-provider.ts:50-57`, `token-usage-analytics-provider.ts:146-151`, both catching).
- Consequence: each form needs a decided outcome. Writes cannot corrupt the retry: an unconverted file fails the store's parser, and a published V3 makes the retry skip.
- Reachability: `Reachable` on a failed install. 0 of the user's installs are in that state (204 F-06).
- Review consequence: AR-002 (trace and decide per form; record the retry-safety reasoning).

### `MP-002` — A Skill Improvement helper run is identified only by an improver session file

- Related requirement: REQ-008
- Initiating basis kind: `System` (released builds wrote `<run>/skill_improvement/improver_session.json` naming `improverRunId`)
- Trigger: an improver configured to a custom definition through `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID`, whose record is absent. Without the `server_helper` clause, the session file is the only remaining source.
- Forward path: M1 collects the id from the session file → M2 and M3 try to delete the run. M3 fails (the next start retries), and M4 meanwhile deletes the session folder unconditionally (the current `deleteSessionFolders`). The next start finds no source for that id.
- Consequence: an orphaned helper run, which REQ-005/REQ-008 intend to delete.
- Reachability: `Reachable` (a failed item retries; REQ-008 explicitly adds the session source).
- Review consequence: AR-005.

## Unresolved Approved-Behavior Or Current-State Gaps

None beyond the findings.

## Review Decision

`Pass`. AR-001..AR-005 remain resolved, and SR-003 (DI-001) is sound against the code at its cited lines (commit `f40bad9713`). The behavior basis is confirmed, and no in-scope machinery depends on an unsupported premise. Ready for implementation.

## Findings

None open. The resolution is recorded in `architecture-review-revision-record.md` (ARCH-REV-002, ARCH-REV-003).

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- R-1: frozen reproductions of deep services carry drift risk. Mitigated by newest-first sequencing, unchanged assertions and escalation. Record each freeze's source commit.
- R-2: the frozen layer size is unverified until step 3; the unused-files report keeps it honest.
- R-3: the custom-provider migration's own retry skips selector mapping once V3 is published (`custom-provider-readable-id-app-data-migration.ts:179-186`). This is pre-existing behavior, unchanged by this ticket.
- R-4 (citation): the derived-consumer line cites `autobyteus-web/components/token-usage/TokenUsageAnalyticsView.vue:60`. The files are `autobyteus-web/components/settings/token-usage/analytics/TokenUsageAnalyticsView.vue:60` and `autobyteus-web/components/settings/token-usage/TokenUsageRunDetailsView.vue:105`.
- R-5 (implementation):
  - The registry is built lazily with the runner (`app-data-migration-registry.ts:155-160`). Pass the vault as the lazy getter the constructor already takes (`() => getSecretVaultRuntime().requireService()`), not as an instance resolved when the registry is built.
  - Keep the custom-provider gate's state module-level, like `TokenUsageCapability`, so every `CustomLlmProviderStore` instance sees it. The production store is a cached singleton (`custom-llm-provider-store.ts:136-142`), but tests construct their own.
- R-7 (SR-003, guideline): with prerequisites named by string literal, retiring migration X leaves X's id in a later migration's `prerequisiteMigrationIds`, and the registry then throws at construction ("must be registered earlier"). The registry tests catch it, so it fails loudly. Recommended: add to the guideline's retirement step 2 "and remove its id from the remaining migrations' `prerequisiteMigrationIds`".
- R-8 (SR-003, implementation):
  - Build the definition-name port so the provider closure loads only when a row needs a name, as today's dynamic import does (keep a dynamic import in the registry's lazy factory), so startup does not load the 116-file closure.
  - The catalog-invalidation port must carry the arguments the reset functions take (`memoryDir`; `"agent_org"` / `"agent_team"` for the collaboration catalog), bound by the registry or passed by the migration.
- R-6 (wording, optional): `release-notes.md` says custom providers stay unavailable "until the next start retries the conversion". A manual retry in Settings also takes effect at once (D-8).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `ARCH-REV-003`; SR-001..SR-003. DI-001 is resolved by the SR-003 ports, the frozen locator module and the no-cross-migration-import rule. Classification Large / High is preserved. Next: `/software_engineering_team/implementation_engineer`, to finish the three affected migrations.
