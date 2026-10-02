# Design Spec — AGY presentation and user-requested server test repair

## Solution And Approval Basis

- Package: `agy-mcp-tool-call-presentation`; current solution revision `SR-005`.
- Approved requirements: `requirements-doc.md` SR-005. Original AGY approval at SR-002 unchanged; recovered user repair/inclusion instructions (2026-09-30 transcript lines 315, 992, 995, 1015) and current explicit continue-to-finish instruction after the combined-scope summary authorize the recovered outcomes. No claim of a retroactive September 30 design approval.
- Design status: `Ready for independent architecture review`.
- Canonical evidence: `investigation-notes.md`; scope evidence supplement `test-repair-scope-inventory.md`. No Product/UI supplement.
- Investigated source: `a01cadaea37366fdd6d91196231d1257e25427d2` on `codex/agy-mcp-tool-call-presentation`, including latest checked `origin/personal@b0b077b02571098a6bf7993ab46b67a69fdb8f9d` (6 ahead / 0 behind). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-mcp-tool-call-presentation`; finalization target remains origin/personal.
- Existing implementation and tests are a recovery candidate, not accepted combined implementation. DR-003 focused tests passed; full suite/review gates remain. This design does not authorize finalization bypass.

## Current-State Read

The AGY converter fix is committed and focused-tested. It projects well-formed MCP wrapper steps to real names/arguments and structured object/array output, leaving native image detection keyed to provider names. Stored old calls remain unchanged.

User-directed follow-up repairs moved from a separate test-repair worktree onto this branch. Team creation previously materialized a package before the catalog's strict index read could reject creation. The local preflight fixes that ordering. The released Team-to-Org cutover previously rejected current unversioned Team trees during retry. The local fix recognizes them, but currently imports a **live tolerant runtime validator as a released source classifier**, contrary to the canonical migration guideline. Its behavior already changed with upstream's collaborator/skill-contract updates. That dependency must be frozen within migration ownership before accepting the repair.

Test repairs retarget stale hierarchical-Team/current launch assumptions, complete history fixtures/admission and test graph setup, build the server before subprocess E2E, and isolate analytics. After latest integration, 33 source/test/docs/package paths differ from base. The historical remainder spans 47 unit/integration files, with some already repaired and others potentially setup failures or real defects. Those are an explicit test-recovery workstream, not blanket permission for arbitrary production changes.

## Task Size And Architectural Risk (Mandatory)

- `task_size=Large`: combined implementation/test recovery spans AGY, Team lifecycle/catalog, released migration classification, build/test support and a finite 47-file historical failure cohort across multiple subsystems. This is not based on Markdown volume.
- `architectural_risk=High`: persisted-history candidate classification and Team creation admission ordering affect retained data and retry/availability behavior. Current live-schema coupling plus upstream collaborator/skill changes require independent review. Unknown origins of some historical test failures prevent a Low-risk assumption.
- Original Small/Low direct-route classification applies only to SR-002. It does not govern SR-005.
- Escalation: any new production behavior beyond REQ-008/009, different availability/data-loss semantics, public API/schema change, startup-wide gate, or need to rewrite terminal migration results returns to Solution Designer. Existing test failures may lead to such recovery; do not hide them or broaden source changes.

## Architecture Investigation Evidence

See investigation notes SR-005 for exact reads/pins. Key evidence:

| Source | Observation | Design consequence |
| --- | --- | --- |
| `src/agent-team-execution/services/team-run-service.ts`, `src/run-history/services/team-run-history-catalog-service.ts`, `store/team-run-history-index-store.ts` | Team service owns create sequence; catalog owns index; strict read awaits queued writes, missing file means empty, invalid bytes reject | Preserve catalog-facing preflight before manager creation; no direct filesystem read in service |
| `migrations/agent-org-flat-team-families-v1/agent-org-history-candidate-plan.ts` | Existing zero-write `flatRoots`, missing-tree warnings, root collision and partial-target plans; local new current validator import | Add frozen unversioned classifier, retain planner dispositions and migration identity |
| `docs/design/data_migration_guideline.md`, blob `02999a6c80b7df63443c70bc101becd00cc72613` | Frozen source classifiers; current-only runtime; same-ID failed retry, terminal skip; narrow admission | No live runtime source decoder, new global gate, ledger reset or second migration |
| Current Team tree schema blobs `bf0bfe713b1d1644a20ea2f163f7fa9d77bd96ae` and shared schemas `b69359837b92b9b36698f2688c99395462ddd56f` | Current unversioned writer/reader includes optional-on-read collaborators, current launch shape excludes skill mode; validates identities/delegators | Freeze supported source shape/invariants explicitly, including pre-integration and latest-base current forms |
| Released v1/v2 migrations, frozen v2 shape bundle, cutover runner and readiness index | Predecessors may retain missing/invalid roots; completed ledger does not prove directory validity | Preserve warnings/exclusions and current admission; test mixed/all-excluded and terminal retry cases |
| `TESTING.md`, Vitest setup, Brief Studio package script, historical logs and DR-003 | Built-server suites need build; package integration needs packed app; shared DB/global managers can contaminate tests | Current build and test-owned state; per-file evidence and serial suite phases |

## Intended Change

1. Retain the completed AGY projection and original acceptance coverage.
2. Retain/review the two bounded product repairs: Team index readability checked before package materialization, and current unversioned flat Team classification as untouched non-targets during eligible cutover retry.
3. Correct the provisional migration helper's dependency on mutable runtime source validators using a migration-owned, pinned source-classification module.
4. Finish test-only contract/setup repairs in the known cohort, preserving current behavior and routing genuine new product defects instead of making speculative source fixes.
5. Rebuild/revalidate the combined candidate and restore complete implementation/review/API/delivery evidence. No push/release from this design phase.

## Relevant Behavior And Production-Path Map (Mandatory)

Scenario-to-spine mapping: SCN-001, SCN-002, SCN-003 use DS-001; SCN-004 retains unchanged replay. SCN-005 uses DS-002; SCN-006 uses DS-003; SCN-007 uses DS-004. AC-014 explicitly covers DS-004 build/isolation, alongside AC-012 and AC-013.

| Behavior | Requirements / ACs | Trigger / preserved outcome | Target path / spine |
| --- | --- | --- | --- |
| BEH-001,002,004 | REQ-001..004,006,007 / AC-001..006,008 | AGY tool start/success/failure/denial; real tool name and arguments; malformed wrapper fallback | DS-001, provider converter → event/trace/WS → Activity |
| BEH-003,005 | REQ-005 / AC-007 | Native tools/image paths unchanged, MCP named generate_image never native | DS-001 provider-name decision before projection |
| BEH-006 | DEC-004 | Old stored AGY calls unchanged | Existing history replay; no rewrite |
| BEH-007 | REQ-008 / AC-009 | Team launch with unreadable index leaves no new package; missing/valid index normal | DS-002, Team service → catalog preflight → manager creation → catalog row |
| BEH-008 | REQ-009 / AC-010 | Restart-to-retry cutover preserves valid current Team packages | DS-003, runner → candidate planner/frozen classifier → existing cutover → current admission |
| BEH-010 | REQ-008,009 / AC-011 | Independent work/startup remain available; preserved exclusions and terminal skip | DS-002/003, existing runner/readiness boundary |
| BEH-009 | REQ-010,011 / AC-012..014 | Reproduce/fix test cohort without weakening production | DS-004, build + isolated test graph → supported entrypoint → assertions/report |

## Relevant Supplemental Task Artifacts

- `test-repair-scope-inventory.md`: finite failure inventory/directions under REQ-010/011; evidence-only, no competing acceptance authority.
- `recovery-evidence/test-repair-provenance-20261001/`: original user directions, source-transfer commands, historical logs; SR-004 provenance, not current pass.
- `recovery-evidence/solution-recovery-sr005/`: pre-recovery snapshots and machine-readable historical cohort, evidence only.
- `latest-base-integration-result-20261001.md`, `delivery-evidence/latest-base-20261001/`: DR-003 focused integrated proof, not full acceptance.
- Original `agy-mcp-call-shape-probe.py`, `agy-mcp-call-shape-probe/`, `api-e2e-evidence/`: still relevant AGY shape/behavior evidence; applicability must be reassessed after current changes.
- Full inventory and ownership are in investigation notes. Independent review artifacts: no combined review yet; prior ones `N/A — not applicable` for SR-002 only.

## Task Design Health Assessment (Mandatory)

- Posture: bug fixes plus test-contract cleanup.
- Root causes: AGY local projection defect; Team creation **Missing Invariant** (precondition checked after side effect); cutover source classifier **Boundary Or Ownership Issue** (current reader used as historical classification); tests drifted from supported contracts/setup.
- Refactor needed now: **Yes, bounded**—replace mutable runtime classifier dependency with migration-owned frozen recognition. Do not refactor the runner, catalog transaction system or unrelated runtime graph.
- Catalog preflight owner/API is coherent: service calls catalog rather than reaching into index store. No new generic coordinator or global readiness service.
- Residuals: preflight is not an atomic transaction against arbitrary concurrent disk tampering or later I/O failures. Existing post-create failure handling remains; no speculative rollback machinery is warranted by this approved defect.

## Terminology

- **Current unversioned Team**: investigated flat-Team persisted shape written without schemaVersion, including supported earlier skill-era fields and latest-base collaborators where applicable; no inference that any object lacking a version is valid.
- **Non-target**: migration leaves bytes untouched; this does not itself grant runtime admission.
- **Repair cohort**: historical failed files enumerated in the supplement, plus previously repaired E2E and required shared test helpers.

## Design Reading Order

Requirements → current evidence → behavior map → data-transition decision → spines/owners → files/dependencies → sequence and verification. Old SR-002 snapshots are historical, not alternate authority.

## Legacy Removal Policy (Mandatory)

No backward-compatibility runtime paths. Replace well-formed call_mcp_tool presentation, remove obsolete current skill inputs and stale nested-Team expectations, retain released source/output fixtures only inside migration tests. Replace the new mutable classifier import; do not remove released migration support. Do not delete the 88 compiled *.test.js artifacts opportunistically—the active suite includes *.test.ts and cleanup was not required for these outcomes.

## Persisted Data / State Transition Decision

- AGY: **Directly Usable — No Migration**. Existing trace shape/readers unchanged; no old-call relabel.
- Team preflight: **Directly Usable — No Migration**. No storage format change, no rewrite/delete of existing index or packages. Enforce existing write prerequisite earlier.
- Historical cutover: **Migration Required — repair of existing same-ID migration only**, not a new migration or new target shape. Existing `20260901_agent_org_flat_team_families_v1` already transforms supported released nested Team histories to its fixed Org target; modify only current-Team source classification so failed/pending attempts can finish correctly. Already-current unversioned packages require no conversion.
- Stored subjects: `memory/agent_teams/<id>/team_run_execution_tree.json`, Team index, selected historical Team messages/tasks/traces/references and token attribution; Org targets under `memory/agent_orgs/<id>`. Production volume not measured; no invented latency target. Delta adds in-memory recognition of an already-read metadata tree, no new trace scans/copies/hashes/journal.
- Sources inspected: released V1 promoter, released recursive V2 cutover decoder, frozen flat V2 schema, unversioned current schemas at pre-integration `82996343c` and integrated `a01cadaea`. Real user data not read or mutated; faithful existing released fixtures and DR-003 built-server test are evidence, not a claim of testing an installed dataset.

### Migration convention checklist and plan

1. **Need:** no new persisted fact or reinterpretation of current data. Fix classification in the existing cutover; current zero-write packages stay unchanged.
2. **Availability:** no global startup gate. Index preflight only affects Team creation already unable to record history. Independent Agent work and app/update access remain usable, including all history excluded.
3. **Source/target:** predecessor V1 can warning-complete while retaining invalid roots/index; V2 `SKIPPED_MISSING` does not promise a tree. Supported nested V2 source converts through existing fixed Org target. Frozen classifiers must not import live current input decoders/types.
4. **Disposition:** valid frozen flat V2/current unversioned → `flatRoots` / zero-write; supported nested V2 → existing conversion; missing tree → existing bounded warning/preserve; malformed/collision → existing failure/preserve; valid partial target/index-only → existing recovery. Do not invent success or swallow general errors. Current admission remains independent.
5. **Commit/retry:** reuse existing atomic writer, package rename, history index transition, token transaction and source markers. No new backups/journal/ledger resets. This code-level repair applies to pending/failed eligible attempts only; ordinary startup skips terminal SUCCEEDED/SUCCEEDED_WITH_WARNINGS.
6. **Boundary/order:** runtime remains current-only. Freeze source closure in migration-owned code. Prisma schema deploy order and historical outputs unchanged; no source-column retirement in this ticket. Earlier skill fields in frozen source/output remain; current projections omit them.
7. **Cost:** use existing parsed raw tree; no extra filesystem pass for recognition. Team preflight reads one index using its store; no corpus audit. Record representative counts/bytes and cold/retry/terminal-startup differences during validation.
8. **References:** preserve cutover's context-file locator dependency propagation, root identity, handoff/delegator/unique-run constraints and token ownership. Valid current non-targets must remain untouched next to a failing historical dependency component. No bypass of current package admission for list/load/restore.
9. **Evidence:** AC-009..011, DR-003 existing tests, plus frozen classifier tests for known unversioned cohorts, with/without collaborators, old skill-era fields, malformed/mismatched IDs, mixed sources, zero-write and terminal-skip controls. Re-run full suite under AC-012..014.
10. **Lessons/review:** canonical guideline sections 1–10; frozen released-run-package-shapes README, predecessor missing-tree dispositions, runner terminal skip. Avoid old startup lockout and repeated historical audit mistakes. Independent architecture review required by High risk.

### Frozen recognition design

Add a migration-private snapshot classifier under `src/app-data-migrations/legacy/released-unversioned-flat-team-shapes/`. Capture and document source pins `82996343c` and `a01cadaea` rather than importing `run-history/store/team-run-execution-tree-schema.ts`. Expose `isReleasedUnversionedFlatTeamTree(raw, expectedRootId): boolean`; its only caller is the candidate planner.

Freeze the known structural variants and all predicates used to distinguish them: top-level timestamps/binding/handoffs/root; root '/' and matching run ID; direct configured Agent members and unique coordinator/address/run IDs; launch configuration; task/delegator identities; optional-on-read collaborators and collaborator invariants introduced by latest base. Preserve supported old-field cohorts explicitly in this source snapshot (skillAccessMode/settledAt where present), with no live runtime enum/type/parser dependency. New-format trees carry no schemaVersion; versioned predecessors remain with their existing frozen validators. Known source variants are accepted deliberately, not by accepting every versionless object. Do not fake a schemaVersion and feed current data into the old V2 classifier or discard collaborators to make it validate.

Use a small frozen `types.ts` + `schema.ts` split, with local predicate helpers if needed to keep responsibilities legible; a README records source pin, supported shape variants and migration-only ownership. Reuse existing frozen primitives only when their semantics really match; do not modify shared frozen V2 behavior to accommodate this new cohort. Unknown source-shape cases must remain preserved/non-admitted and be investigated rather than guessed. No copies of whole runtime orchestration are needed.

The planner replaces its local `isCurrentTeamRunTree` and live schema import with this frozen predicate, called after frozen flat V2 check and before released nested V2 conversion. `flatRoots` is still only a zero-write migration disposition; it is not the current readiness index.

## Data-Flow Spine Inventory

| ID | Scope / behaviors | Start → end | Governing owner |
| --- | --- | --- | --- |
| DS-001 | Return/event / BEH-001..005 | AGY provider step → persisted event + Activity | AgyStreamEventConverter |
| DS-002 | Primary / BEH-007,010 | User/API Team launch → created/recorded Team or non-writing refusal | TeamRunService, catalog precondition, manager materialization |
| DS-003 | Primary / BEH-008,010 | Eligible restart → migration dispositions → current admitted history | AppDataMigrationRunner + existing cutover; current admission separately |
| DS-004 | Operational / BEH-009 | Fresh test prerequisites → product-boundary assertions → recorded complete results | Existing test harness / owning test engineer |

## Primary Execution Spines and Spine Narratives

- **DS-001:** AGY CLI → backend → converter → trace/processors → WebSocket → Activity. Converter projects one common payload reused by start/terminal/background-close. Native detection uses provider name. History replays stored events without relabelling.
- **DS-002:** GraphQL/launch caller → TeamRunService validates definition/config and plans → catalog `assertHistoryIndexReadable()` → manager creates package/root → catalog records row → caller receives run. On unreadable index, exit before manager call. Root-config entry delegates to same service. Existing later failure termination is retained; no new index reset or delete.
- **DS-003:** startup runner checks ledger/prerequisites → candidate planner reads metadata/index → frozen source classification → current-Team zero-write OR existing nested conversion/validation/index transition/retirement → runner records truthful aggregate → runtime readiness independently admits valid packages. FAILED is not a whole-app lockout; terminal records skip conversion.
- **DS-004:** pack/build required artifacts → isolated graph and test DB → supported public/local owner call → strong assertions → exact failure classification/report. No production fallback is added to accommodate an incomplete test mock. New genuine product defects return upstream.

## Spine Actors / Main-Line Nodes and Ownership Map

Converter owns AGY translation; projection helper owns pure wrapper/output mapping. TeamRunService owns sequencing, TeamRunHistoryCatalogService owns history access, index store owns strict read/atomic write, Team manager owns materialization/lifecycle. Runner owns attempts/status/recovery action; cutover owns transformations; planner/frozen schema own source classification; readiness index owns current admission. Test fixtures own only disposable setup, not alternate production behavior.

## Thin Entry Facades / Public Wrappers

GraphQL resolvers delegate to TeamRunService; they must not read the index or create a parallel preflight. Existing wrappers are unchanged. No new public API.

## Removal / Decommission Plan (Mandatory)

| Remove/replace | Replacement | Boundary |
| --- | --- | --- |
| Well-formed MCP generic wrapper rendering/assertions | AGY projection + canonical names | Original AGY scope |
| Mutable current-schema import and local predicate in candidate planner | Pinned migration-only classifier | Required technical correction |
| Old hierarchical Team run-config test file | Renamed flat-Team config test and Org migration assertions | Already checkpointed; verify semantic coverage |
| Obsolete current skillAccessMode inputs/assertions | Current launch contracts; frozen migration fixtures/output retain historical fields | No runtime compatibility wrapper |
| Invalid/stale test APIs, incomplete mocks/fixtures | Current owned test construction and supported assertions with per-case rationale | Finite cohort; not blanket test deletion |

## Return Or Event Spines / Bounded Local Spines

DS-001 event sequencing remains as above; errors and provider_state unchanged. DS-002 errors propagate through the existing API. DS-003 status/recovery derives from existing runner, not UI inference. Local planner chain: read already-enumerated tree → frozen flat V2 → frozen unversioned → released nested classifier → plan or preserved diagnostic. No new worker/state machine.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Owner / risk control |
| --- | --- | --- |
| MCP naming/output JSON | DS-001 | Pure AGY helper; no event emission or native image decisions |
| Strict index read | DS-002 | Catalog/store; no service-level path/schema parsing |
| Frozen source shape recognition | DS-003 | Migration-private code; no mutable runtime source decoder |
| Current admission | DS-002/003 | Existing readiness/package validators; no aggregate-status shortcut |
| Build/database/mock lifecycle | DS-004 | Test harness; no installed-profile writes or missing-guard production defaults |

## Ownership Boundaries / Boundary Encapsulation Map

| Authoritative boundary | Internal mechanism | Upstream caller | Forbidden bypass |
| --- | --- | --- | --- |
| AgyStreamEventConverter | MCP projection | AGY backend | UI/history re-unwrapping provider parameters |
| TeamRunHistoryCatalogService | Team index store | TeamRunService | Service filesystem read/reset of catalog index |
| Existing cutover | Frozen source classifier/transition helpers | Migration runner | Runtime legacy decoder or current validator as mutable released source classifier |
| Current package readiness | Current tree/package validation | History list/load/restore | Directory existence or migration success treated as admission |

## Dependency Rules

- AGY helper may import AGENT_TOOLS_MCP_SERVER_NAME and local agyRecord/agyString; no downstream event schema changes.
- Team service calls catalog preflight; catalog alone calls its index store. No independent preflight in each resolver.
- Released source recognition stays migration-owned with pinned predicates/types. Current runtime never imports migration source modules. Current validators may validate current OUTPUT only; never dynamically redefine old source classification.
- Tests use current complete graph APIs/explicit fakes; no restoring removed production APIs to satisfy them.

## Interface Boundary Mapping / Check

| Interface | Singular subject/responsibility | Identity | Check |
| --- | --- | --- | --- |
| projectAgyMcpToolCall(providerName, params) | MCP wrapper → projection or null | provider name/server/tool | Explicit; no change |
| projectAgyMcpToolOutput(output) | object/array JSON projection only | none | Explicit; no change |
| catalog.assertHistoryIndexReadable() | Team catalog precondition | injected memoryDir | No caller-supplied ambiguous run/family ID |
| isReleasedUnversionedFlatTeamTree(raw, expectedRootId) | pure frozen candidate classification | exact Team root ID | Explicit, no writes/admission |

## Main Domain Subject Naming Check

Existing converter/service/catalog/runner names describe owners. `released-unversioned-flat-team-shapes` makes migration source scope explicit; avoid generic `compatibility`, `utils` or `isCurrent` names that imply evolving runtime authority.

## Existing Capability / Subsystem Reuse Check

Reuse AGY adapter, catalog/index store, runner and cutover transitions, current readiness, existing test support and build/isolated-instance tooling. Add only the frozen source recognizer required by guideline; do not create another migration framework, admission service, global test bypass or journaling system.

## Subsystem / Capability-Area Allocation

AGY provider adapter owns presentation; Team lifecycle/catalog owns preflight; app-data migration owns released classification; server test directories own fixtures/assertions with existing setup infrastructure. Existing folder hierarchy remains; no layer restructuring.

## Draft File Responsibility Mapping → Reusable Structures → Final Mapping

The two AGY files retain their existing responsibilities. Team service adds ordering only; catalog adds a domain precondition method. Planner selects dispositions and imports the frozen recognizer. Frozen source types/schema are the only newly extracted shared structure and are used solely within this migration boundary; no mostly-optional general DTO. Test helpers may share complete setup for tests of the same owner, but must fail when a scenario calls an unprovided boundary.

| File/path | Action | Final responsibility |
| --- | --- | --- |
| `src/agent-execution/backends/antigravity/stream/agy-mcp-tool-call.ts`, `agy-stream-event-converter.ts` | Retain reviewed candidate / modify only if defect | Original projection and event sequencing |
| `src/agent-team-execution/services/team-run-service.ts` | Retain/refine bounded preflight | Check catalog prerequisite before manager creation |
| `src/run-history/services/team-run-history-catalog-service.ts` | Retain bounded method | Expose catalog precondition, no new storage |
| `src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-history-candidate-plan.ts` | Modify | Replace mutable source dependency; preserve dispositions |
| `src/app-data-migrations/legacy/released-unversioned-flat-team-shapes/{types.ts,schema.ts,README.md}` | Add | Pinned source variants, invariants, provenance and pure predicate; local helper split allowed if warranted |
| `tests/unit/app-data-migrations/agent-org-flat-team-families-v1-app-data-migration.test.ts` | Extend | Zero-write current cohorts, invalid controls and mixed/retry/terminal cases |
| `tests/unit/agent-team-execution/team-run-service.test.ts`, integration equivalent | Retain/extend | Preflight ordering, missing/valid/invalid index controls and complete mocks |
| Existing E2E repair paths and AGY fixture/tests | Retain/reconcile | Strong current supported scenarios and authentic frozen fixtures; supplement lists exact cohort |
| Historical 47 unit/integration files + owner-specific existing helpers | Modify as evidence requires | Test-contract/setup repair only; per-case changes documented, new production defects routed |
| `package.json`, `TESTING.md`, runtime docs | Retain/update | Build prerequisite and truthful testing/runtime guidance |

All source/test paths above are relative to `autobyteus-server-ts/` except root package/docs. Full existing changed-file set is in investigation evidence. New frozen classifier tests may be colocated under `tests/unit/app-data-migrations/` if that keeps fixtures/test responsibility clearer; do not spread source decoding into tests alone.

## Shared Structure / Data Model Tightness Check

No public DTO/schema change. Frozen source types reflect exact investigated historical meaning, not current runtime aliases. Preserve root-vs-member identity and typed Agent/Team collaborator variants; do not collapse them into one ambiguous ID bag. Missing optional collaborators means none, not permission to omit required identity fields. Existing V2 frozen source/output remains unchanged.

## Applied Patterns

Provider adapter/pure projection; service-owned precondition; migration-owned pure classifier; existing repository/atomic commit and runner. No new generic architecture pattern.

## Target Subsystem / Folder Mapping and Folder Boundary Check

Use existing `agent-execution/backends/antigravity/stream` provider folder, `agent-team-execution/services` orchestration, `run-history/services` catalog, and `app-data-migrations/legacy` frozen source boundary. Tests mirror owners. This retains clear structural depth without a new folder per execution step. Frozen source directory must contain no runtime services or live schema imports.

## Concrete Examples / Shape Guidance

- AGY `{ServerName:'autobyteus_agent_tools',ToolName:'delegate_task',Arguments:{description,recipient_address}}` → bare `delegate_task` and own arguments; third-party `shape-test/echo_args` → `mcp__shape-test__echo_args`. Missing server/tool → generic fallback. Output object/array JSON stays inside `{provider_state,output}`; primitives/text unchanged.
- Invalid Team index: before = index sentinel bytes + N package roots; rejected launch → same bytes and N roots. No delete/rebuild of user history.
- Retry fixture: valid unversioned Team A with collaborators + supported nested source B + missing-tree C. A stays byte-identical; B follows existing Org conversion; C remains preserved with existing warning. Runtime admission validates each actual current package independently.
- Do not mark the historical `it.fails` regression as proof of fixed product behavior; final repaired regression must be an ordinary passing test.

## Backward-Compatibility Rejection Log (Mandatory)

Reject frontend unwrapping, old-call replay relabel, flags to restore generic AGY names, live runtime legacy readers, mutable source validators, resurrected nested-Team/current skill APIs, ledger resets and deleting failing fixtures. Frozen released migration decoders are required upgrade support, not compatibility runtime paths. Old stored AGY presentation is retained data, not dual code behavior.

## Derived Layering

N/A beyond existing owner boundaries; no new layering is necessary.

## Change / Refactor Sequence

1. Independent architecture review of SR-005 before accepting/continuing combined source work. No source readiness inferred from earlier Small/Low pass.
2. Implementation takes over integrated a01cadaea, inventories preserved local artifacts and exact diff; keeps 9038c218b/DR-002 snapshots. Refresh refs if changed, do not drop repairs or overwrite latest upstream contracts.
3. Correct frozen classifier dependency, retain Team preflight, add focused source regression/negative/coexistence tests; verify unchanged AGY path. No unapproved broad source fixes.
4. Reproduce historical failure cohort on correct fresh builds and isolated state. Repair fixtures/setup/assertions following current independent contracts and the supplement; retain per-case dispositions. Compare baseline where necessary to establish origin, not to waive requested repair work. Route new genuine defects/ambiguous intended outcomes upstream.
5. Complete implementation-scoped checks and handoff with exact source/tests, retained/deleted coverage rationale and residuals. Independent source/test review follows configured Large/High route.
6. API/E2E owns full unit/architecture, integration, deterministic E2E and required realistic migration/AGY validation, with maintained ledger and honest gates/skips. Existing focused DR-003 evidence is reusable only on unchanged basis.
7. Delivery refreshes integration, docs and final candidate verification, then finalizes/releases under user's existing direction and established channel decision. No forced stable release; no destructive cleanup of unrelated state.

## Key Tradeoffs

Earlier small projection fix now carries genuine persisted-data and large test-recovery scope. Independent review adds a gate but avoids releasing unreviewed migration semantics. A frozen metadata classifier costs small migration-private source duplication but prevents current schema changes from rewriting released upgrade behavior. Narrow preflight is cheaper and less risky than speculative creation rollback/journals. Test repairs preserve behavior instead of making runtime permissive.

## Risks

- New collaborator and skill-removal contracts must be represented by authentic pinned source fixtures; passing only a pre-integration fixture is insufficient.
- Preflight may add an index read per creation; no claim of atomicity against arbitrary disk mutation. Measure representative cost, no new full history scan.
- Broad historical failures may include genuine defects outside the two approved outcomes. These return for requirements/design recovery, not indiscriminate patching or silently accepted failures.
- Branch now current only as of DR-003 fetched b0b077b02. Subsequent upstream changes require another integration refresh and affected tests.
- Live provider/browser/Electron full product evidence has not been rerun at current HEAD; Delivery must not infer final user verification from old testing wording alone.

## Guidance For Implementation

Preserve the original AGY helper semantics: agyString validates nonblank names; arguments absent/non-record become {}; output parsing only for projected MCP calls; native image decision uses providerName; no change to denial/error text or background output contracts. Do not reorder current catalog queues or reinterpret statuses as part of the preflight. Implement frozen classification from pinned evidence, not by importing the current runtime reader. Keep test-owned data isolated and immutable released fixtures distinct from current API expectations. The repair cohort grants test work, not unspecified production rewrites. Any requirement implication returns to Solution Designer with a focused evidence-backed finding.
