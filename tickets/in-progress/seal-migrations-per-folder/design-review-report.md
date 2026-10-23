# Design Review Report: seal-migrations-per-folder (autobyteus-280)

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/seal-migrations-per-folder/requirements-doc.md` (Approved, SR-001)
- Upstream Investigation Notes: `tickets/in-progress/seal-migrations-per-folder/investigation-notes.md` (S-01..S-12; autobyteus-204 F-01, A-05, O-1 carried over)
- Upstream Solution Revision Record: `tickets/in-progress/seal-migrations-per-folder/solution-revision-record.md` (SR-001)
- Reviewed Design Spec: `tickets/in-progress/seal-migrations-per-folder/design-spec.md` (SR-001, `Ready`, commit `24b003306e`)
- Supplemental Task Artifacts Reviewed: none in the package (see AR-005 on the missing release-notes text)
- Relevant Solution Revision IDs: SR-001
- Architecture Review Revision Record: `tickets/in-progress/seal-migrations-per-folder/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: `Architecture Design Complete` from `/software_engineering_team/solution_designer` (Large / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
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
| BEH-001 | System | Pass | Pass | Fail (boundary rule and live-service dependency unresolved) | Needs Correction | AR-001 |
| BEH-002 | System | Pass | Pass | Fail (the web error-code consumer; the initial pending state) | Needs Correction | AR-003, AR-004 |
| BEH-003 | System | Pass | Pass | Unclear (gated entry forms not traced) | Needs Correction | AR-002 |
| BEH-004 | Operational | Pass | Pass | Fail (the new session source needs the M4 guard) | Needs Correction | AR-005 |
| BEH-005 | Contract | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None in the package. REQ-008 requires release-notes text, and no supplement carries it (AR-005).

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
| DS-001 / DS-001b startup (two hosts) | Primary | Pass | Pass | N/A | Pass | Fail: the "readiness → configure each capability owner" sequence is written out in each host and again in DS-003; the initial pending state is not on the spine (AR-004) | Pass | Fail |
| DS-002 gated features | Primary | Pass | Pass | N/A | Pass | Fail: "`CustomLlmProviderStore` and its callers consult" leaves the gate in several owners and does not trace each entry form (AR-002) | Pass | Fail |
| DS-003 manual retry | Primary | Pass | Pass | N/A | Pass | Pass, except the shared sequence (AR-004) | Pass | Pass |
| DS-004 enforcement | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runner contract (runner, registry, `domain/`, `repositories/`) | Pass | Pass | Fail | Fail | The rule does not say what the contract itself may import, nor how live production side effects reach a migration (AR-001) |
| `migrations/**`, `frozen/**` | Pass | Pass | Pass | Pass | DS-004 |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Production → contract only | Pass | Pass | Pass | Pass | — |
| Migration area → production | Fail | Pass | Fail | Fail | AR-001: the runner and registry import `appConfigProvider` today. The custom-provider migration removes old secrets through the live vault (`getSecretVaultRuntime().requireService().removeForConsumer`) and reads the live built-in provider catalog. A frozen copy of the vault would be a second writer of a store that production owns |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `capabilityReadiness()` (closed `AppDataCapability` union) | Pass | Pass | Pass | Low | Pass |
| `holdsBackCapabilities?` | Pass | Pass | Pass | Low | Pass |
| `TokenUsageCapability` error codes | Pass | Pass | Fail (renamed code, consumer not listed) | Low | Fail (AR-003) |
| `CustomProviderCapability.assertReady()` | Pass | Fail (placement across the store and its callers) | Pass | Medium | Fail (AR-002) |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Statuses inside `capabilityReadiness` | Pass | Pass | N/A | Pass | `listStatuses` |
| Architecture test | Pass | Pass | N/A | Pass | `application-framework-boundaries.test.ts` pattern |

Rule check: a mechanism that receives a function reaching another collaborator, a compound owner, or an untraced kind or form fails the row. Custom-provider entry forms: AR-002. Capability application: AR-004.

## Subsystem / Capability-Area Allocation Verdict

`Pass`. `CustomProviderCapability` sits in `llm-management/llm-providers/`, and token usage keeps its owner.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Frozen copies used by several migrations | Pass | Pass | Pass | Pass | `frozen/server/<path>` and `frozen/autobyteus-ts/<path>`, plus the unused-files report |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Token-usage readiness state (`HISTORY_MIGRATION_PENDING`) | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Fail`. The token-usage error code is matched by `TokenUsageAnalyticsView.vue:60` and `TokenUsageRunDetailsView.vue:105`. The startup-error summary `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED` appears in `BaseServerManager.spec.ts:214,224`, which is a test only (AR-003).

## File Responsibility Mapping Verdict

`Pass`, apart from the custom-provider capability placement (AR-002).

## Subsystem / Folder / File Placement Verdict

`Pass`.

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Production imports of migration ids; legacy constant import; GraphQL special case; TeamRun V2 warning; migration-id readiness state; D-8 bridge; library `memory/migration/` | Pass | Pass | Pass | Pass | `memory/migration/` has no users besides the one migration and its own tests (grep) |
| `appConfigProvider` defaults in migration constructors (6 files) | Fail | Pass | Fail | Fail | Implied by "the registry passes paths", but not listed; fold into AR-001 |

## Legacy / Backward-Compatibility Verdict

`Pass`. No wrapper or dual path; the frozen layer is migration-owned.

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| All stores | Not Affected (output unchanged) | Pass | Pass | N/A | Pass | REQ-007 with unchanged assertions |
| 205 helper-run deletion (REQ-008, a same-ID repair of a released migration) | Narrowing | Fail | Pass | Fail | Fail | AR-005: session files become an M1 source, but M4 still deletes them before M3's success is known; same-ID applicability and the release-notes text are not stated |

## Change / Refactor Sequence Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Contract and enforcement first (shrinking exception list) → production side → migrations newest-first → library → docs → final | Pass | Pass (the exception list) | Pass | Pass |

## Example Adequacy Verdict

`Pass`: frozen-import, deep-service and capability examples are given, with the shapes to avoid.

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

`Fail`. Five Design Impact findings. The direction and structure are sound: the sealed area, the shared frozen layer, the capability rule, D-6..D-8 and the enforcement with a shrinking exception list.

## Findings

### AR-001 — State what the runner contract may import, and how live production side effects reach a migration

- Type: Design Impact
- Severity: Medium (blocking)
- Protected: REQ-003, REQ-004, REQ-005 (the test must be implementable as written), REQ-007
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - Terminology defines the migration area as all of `src/app-data-migrations/`, and Ownership Boundaries allows only `config/prisma-client-factory.ts` from production. But the contract imports `config/app-config-provider.js` (`app-data-migration-runner.ts:3`, `app-data-migration-registry.ts:3`), and the registry must keep passing configured paths (Ownership Map).
  - Six migration files use `appConfigProvider` as constructor defaults.
  - `custom-provider-readable-id-app-data-migration.ts:11,141-143,234` removes legacy secrets through the live vault (`getSecretVaultRuntime().requireService().removeForConsumer`), and `:12,145-146` reads the live built-in provider catalog.
  - Freezing the vault would create a second writer of a store that production owns: its format, keys and locking would drift. The migration already takes both as constructor parameters.
- Required update:
  1. Split the import rule by sub-area. `migrations/**` and `frozen/**` may import only the contract's domain types, the database client, node APIs and third-party libraries. The contract (runner, registry, `repositories/`, `domain/`) may also import production configuration.
  2. Decide the sequence for live side effects. The **registry** constructs each migration and passes in every production dependency that cannot be frozen: paths; the vault's `SecretRemovalOwner` as a narrow port type owned by the contract; and the built-in provider names, injected live or frozen as a list (decide which, against REQ-007). The runner calls `execute()`, and the migration calls the port. It never reaches the vault itself.
  3. List the constructor defaults to remove in the Removal Plan, and teach DS-004 the split rule.
- Why proportionate: it uses the migration's existing constructor parameters and the registry's existing role. Without it, the test either fails on the contract or forces a frozen vault writer.
- Recommended recipient: `/software_engineering_team/solution_designer`

### AR-002 — Trace each custom-provider entry form under the narrowed G-1, and give the gate one owner

- Type: Design Impact
- Severity: Low–Medium (blocking)
- Protected: REQ-006, AC-004 ("custom providers report unavailable, and other providers work"), DEC-003
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence: MP-001. DS-002 traces only "custom provider listing", and the Ownership Map says "`CustomLlmProviderStore` and its callers consult". The entry forms are:
  - listing: `llm-provider-service.ts:297,378`; `model-catalog-service.ts:88` catches;
  - lookup by id for run model resolution and availability: `model-catalog-service.ts:201,334`, `model-availability-service.ts:73`;
  - runtime sync: `custom-llm-provider-runtime-sync-service.ts:27`;
  - create and delete: `llm-provider-service.ts:149-192`;
  - token-usage display lookups: `statistics-provider.ts:50-57`, `token-usage-analytics-provider.ts:146-151`, both catching.
- Required update:
  - Place the capability check in **one** owner, `CustomLlmProviderStore` (every read and write), rather than the store and its callers.
  - Give each entry form's pending outcome. For example: catalog and display lookups degrade as they already do; run model resolution and CRUD refuse with `CUSTOM_PROVIDERS_MIGRATION_PENDING`.
  - Record why the narrowing keeps a retry safe. The store's current parser refuses an unconverted file (`custom-llm-provider-store.ts:39-45,80-116`), and a published V3 makes the retry skip (`custom-provider-readable-id-app-data-migration.ts:179-186`).
  - Extend AC-004's fixture to a run start with a custom model and a CRUD attempt.
- Why proportionate: a table and one placement decision. It prevents gates repeated across callers and silent gaps.
- Recommended recipient: `/software_engineering_team/solution_designer`

### AR-003 — The web matches the token-usage error code the design renames

- Type: Design Impact
- Severity: Low (blocking)
- Protected: REQ-006 ("G-2 … unchanged behavior"), AC-003 ("refuse as today")
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence: DS-002 introduces `TOKEN_USAGE_HISTORY_MIGRATION_PENDING`. Today's code is `TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED` (`token-usage-migration-readiness.ts:27-29,54-60`), and the web shows its friendly message by matching that string (`TokenUsageAnalyticsView.vue:60`, `TokenUsageRunDetailsView.vue:105`). The Change Scope's derived-consumer list omits these.
- Required update: either keep the existing codes (`TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED`, `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED`) or rename them and update both web views and their specs. In either case, add them to the derived-consumer list.
- Why proportionate: one decision and two files. Without it the user-visible refusal silently changes.
- Recommended recipient: `/software_engineering_team/solution_designer`

### AR-004 — One owner applies capability readiness, including the initial pending state

- Type: Design Impact
- Severity: Low (blocking)
- Protected: REQ-006, AC-003, AC-004
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - DS-001, DS-001b and DS-003 each write out `runner.capabilityReadiness() → configureTokenUsageCapability(...) → configureCustomProviderCapability(...)`, so a third capability must be added in three callers (Principle 13, repeated coordination).
  - The spines omit today's initial pending state set after the schema check (`server-runtime.ts:161-168`, `start-standalone-application-host.ts:~147-150`). The custom-provider capability's state before the runner answers is not stated, so its behavior during startup follows from a default (Principle 13, behavior by absence).
- Required update: one production function, for example `applyAppDataCapabilityReadiness(readiness)` beside the capability owners. Both hosts and the retry resolver call it in this order:
  1. set both capabilities to pending after the schema check;
  2. after `runPending()` or a retry, apply the runner's answer.
- Why proportionate: one small function. It keeps the three paths identical.
- Recommended recipient: `/software_engineering_team/solution_designer`

### AR-005 — Specify the 205 repair: the session-source guard, same-ID applicability and the release-notes text

- Type: Design Impact
- Severity: Low–Medium (blocking)
- Protected: REQ-008, AC-005, REQ-005 of autobyteus-205 (preserved), REQ-007
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Evidence:
  - MP-002. REQ-008 makes the improver session files an identification source, but the current migration deletes session folders in M4 without regard to M3's outcome (`remove-skill-improvement-data-migration.ts`, `deleteSessionFolders`; only M5 has a guard).
  - The design gives the repair one line ("comes with its folder").
  - The migration is released (v1.5.8), so this is a same-ID repair that applies only to pending or failed installs (guideline §7). The design does not say so.
  - REQ-008 requires release-notes text, but the package has no supplement for it.
- Required update:
  1. A short M1/M4 description: sessions are a source; M4 deletes a session folder only when the run it names is fully removed (row and folder) or was never present; an unreadable session file is preserved (`PRESERVED_UNREADABLE`), as M5 does.
  2. State same-ID applicability.
  3. Add `release-notes.md` with the REQ-008 sentence.
  4. Fixtures: the compactor run survives (AC-005); a session-only helper run with an injected M3 failure is deleted on the next start.
- Why proportionate: the same guard pattern the migration already uses for M5.
- Recommended recipient: `/software_engineering_team/solution_designer`

## Classification

`Design Impact` (AR-001..AR-005).

## Recommended Recipient

`/software_engineering_team/solution_designer`

## Residual Risks

- R-1: frozen reproductions of deep services (catalog services, definition providers, validators) carry drift risk. The mitigation (newest-first, unchanged assertions, escalation) is adequate. Record each freeze's source commit as the Guidance asks.
- R-2: the frozen layer size (7,000–12,000 lines) is unverified until step 3. The unused-files report keeps it honest.
- R-3: the custom-provider migration's own retry skips selector mapping once V3 is published (`:179-186`). This is pre-existing behavior, not changed by this ticket, and could become a follow-up if a failure in that state is ever observed.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-001 and MP-002 are reachable and drive AR-002 and AR-005)
- Notes: `ARCH-REV-001`; SR-001. Large / High confirmed. A re-review can be limited to the Ownership Boundaries and DS-004 rule, the registry wiring, DS-001/DS-001b/DS-002/DS-003, the custom-provider entry-form table, the derived-consumer list, the 205 repair section and `release-notes.md`.
