# Design Spec — Tolerant flat Team package reading

## Solution And Approval Basis
- TEAM-PACKAGE-READ-20260915-001; **DS-REV-002, Ready**, SR-007, 2026-09-15.
- Approved requirements **SR-006**, reaffirmed by user's separation-of-ownership explanation and “Now let's work on the sticky now.” Exact approvals in requirements-doc.md. REQ-001–003,005 apply; withdrawn REQ-004 does not return.
- This fully replaces prior DS-001/SR-005, which never reached implementation. No Product or behavior-defining supplement. Canonical investigation: investigation-notes.md, INV-001–011.
- Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/tolerant-flat-team-package-reading; branch codex/tolerant-flat-team-package-reading; bootstrap/base c95ef93f8c9042c2174b814c205f00173b816004 from origin/requirements/flat-agent-organization-model. Same eventual unreleased feature target, NOT personal.

## Current-State Read
Normal Team readers send raw JSON to an exact-key canonical codec. Extra fields and missing defaultLaunchConfig reject otherwise meaningful input. Provider read, admission predecode and application resource reading all share this path; actual Agent-only reference/handoff admission is separate and already excludes supplied nested parents. Strict builder and transaction validation also use the codec.
Two registered AgentOrg feature migration paths additionally inspect/rewrite authored definition packages: the family migration's definition phases and a separate authoring-shape migration. These are now explicitly rejected responsibilities. Runtime family conversion, context-file locators, sidecars and history are separate methods and remain application-owned. Registry prerequisites and migration ledger make deleting the entire family migration incorrect.

## Architecture Investigation Evidence
| Evidence | Exact source under autobyteus-server-ts/src | Observation → design | Uncertainty |
| --- | --- | --- | --- |
| INV-007 | agent-team-definition/providers/agent-team-definition-config.ts; file-agent-team-definition-provider.ts:81,88 | Raw read versus canonical write validation → one input projection, strict output checks retained | Execution pending |
| INV-007 | collaboration-definition-admission/services/definition-admission-service.ts:116; application-bundles/providers/file-application-bundle-provider.ts:318 | Normal Team predecode at both surfaces → same reader | Real catalog validation pending |
| INV-009/010 | app-data-migrations/app-data-migration-registry.ts:46–49; migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.ts | Registered definition and runtime work separable → delete definition methods/registration only | Runtime tests pending |
| INV-010 | app-data-migrations/app-data-migration-runner.ts:48–82 | Iterates registered definitions; successful IDs skip → retain family ID, removed authoring records inert | Ledger preservation check pending |
| INV-010 | agent-org-execution/services/agent-org-run-manager.ts:91–106; agent-org-execution-scope-builder.ts:60–66,175–181 | Restore from stored state; authored enclosing instruction lookup only fresh → no definition conversion prerequisite in inspected restore path | No all-provider runtime equivalence claim |
| INV-002–006 | package-inventory.json and scoped resolver/catalog sources |12 structurally flat,2 nested,all omit defaults → meaningful validation, no package rewrite | Expected file presence not full admission proof |

## Intended Change
Two focused changes, no replacement migration framework:
1. Normal Team input reading projects known fields and validates the resulting current model.
2. Remove AgentOrg feature automatic definition conversion/authoring cleanup; keep execution-history migration untouched in meaning.

### DS-003 — Team input projection contract
Add readAgentTeamDefinitionConfig(value: unknown) in the existing Team codec file. It is the single version-agnostic normal input boundary, delegating once to existing strict parseAgentTeamDefinitionConfig. Builder and write validatePackage continue strict. Separate entrypoints remain justified by those **surviving writer consumers**, not by deleted migrations.
- Require root object. Copy only present known root keys coordinatorMemberName,members,handoffs,avatarUrl,defaultLaunchConfig. Only absent/undefined root defaultLaunchConfig becomes null; explicit null stays null. Do not fabricate other missing required keys.
- Array members: require each object; select present memberName,ref,refScope only. Ignore all unused metadata generically, not only refType. No filtering invalid members or following a refType discriminator.
- Array handoffs: require object entries; select present from,to,rules; preserve rules for shared semantic validation. Keep existing null semantics; malformed values must not become empty arrays. Shared Org/runtime handoff normalizer unchanged.
- Supplied non-null defaultLaunchConfig: require object, select present llmModelIdentifier,runtimeKind,llmConfig. Keep existing required child keys/value checks. Do not coerce malformed supplied defaults to null. llmConfig is an open provider dictionary; preserve its entire contents through the existing clone, not recursive key filtering.
- Pass projection to existing canonical parser, preserving trimmed strings, scopes, coordinator, duplicate-name, handoff checks and readonly returned current shape. No mutation of input and no unused fields retained. A small local own-key picker is acceptable, not a global normalization framework/options bag.
Switch only provider readDefinition, Team admission predecode and application bundle Team resource read. Provider validatePackage is transaction output validation and must remain strict. No current Org codec change, runtime schema relaxation, scope resolution or authoring write policy change.

### DS-004 — Definition migration deletion contract
In AgentOrgFlatTeamFamiliesV1AppDataMigration remove execute calls and methods migrateDefinitions, planOrgDefinition, cleanupDefinitionTargets. Remove their private types, decoders, targets, read/atomicText/verifyDefinition/writeDefinition helpers and now-unused imports. Remove definition-only report dispositions. **CLEANED_CURRENT_ORG remains** because runtime cleanup uses it. Keep config injection needed by getBaseUrl for the runtime context locator. Keep writeJson for runtime writes, requiring explicit file tag rather than default 'definition'. Update display/description/result prose to describe runtime/history responsibility.
Retain same family migration ID, STARTUP_ONLY, prerequisite TeamRunExecutionTreeV2 ID and registry order. Retain locator prepare/commit/validate, migrateRuntimeRoots, cleanupOrgTargets, migrateHistoryIndexes, validateCompleteOrgRunPackage, atomic writer and error handling. Do not rename a migration ID or reset completion state to force a rerun.
Remove CollaborationDefinitionAuthoringShapeAppDataMigration registration/import and its source file. Delete now-unused legacy/collaboration-definition-authoring-transition.ts and legacy/owned-definition-package-inventory.ts after confirming no surviving production consumers. Do NOT delete the ordinary DefinitionPackageTransaction subsystem, its authoring recovery, runtime state validators or other migration helpers just because a removed helper imported them.
No no-op migration, compatibility stub, toggle, converter command or new migration. Old authoring migration ledger rows remain stored and unused by registry enumeration. Do not delete ledger rows, reverse already-converted definitions, finish partial authoring conversions, or reset user data. Existing normal explicit authoring transactions remain independently supported; this ticket removes automatic feature conversion, not normal user saves.

## Relevant Behavior And Production-Path Map
| Behavior | Kind | Approval / AC | Trigger → intended and preserved outcome | Spines |
| --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001 / AC-001a–b | Package import/reload → valid flat Teams despite extras; semantic validation retained | DS-001/003 |
| BEH-002 | Contract | REQ-002 / AC-002a–c | Missing/null defaults → no defaults, unchanged files; applicable launch settings still required | DS-001/002/003 |
| BEH-003 | User | REQ-003 / AC-003a–b | Mixed package → invalid nested parents unavailable, valid siblings unaffected | DS-001/002 |
| BEH-005 | Operational | REQ-005 / AC-005a–b | Application startup → no definition conversion/rewrite; supported execution-history migration continues | DS-004 |

## Relevant Supplemental Task Artifacts
package-inventory.json: exact external source pin/paths/hashes/reference existence, REQ-001/003; evidence only. bootstrap-handoff.md: historical analysis-first provenance, not current status. Canonical inventory in investigation-notes.md. No Product/Org-conversion supplement. Prior completed AORG/Activity tickets remain archived; this is not a reopen.

## Task Design Health Assessment
Bug Fix plus explicit removal of misplaced responsibility. Root cause: **Boundary Or Ownership Issue**. Refactor needed now: **Yes, bounded**—extract supported input at existing codec boundary; remove authored-package conversion from startup migration. No new subsystem/owner/framework.
Input supersets and optional defaults do not require old/new runtime representations. Package ownership does not transfer on registration. Execution history remains application-managed. Existing semantic admission and runtime migration absorb this separation. No generic compatibility infrastructure justified. Unrelated Org reader policy, other optional fields, malformed-handoff catch refinements, package conversion tooling and provider matrices remain out of scope.

## Terminology / Reading Order
Definition = reusable authored package, not execution state. Execution package = stored tree, sidecars, locators and history of a run. Input reader extracts meaning; canonical validator checks current complete internal config; admission decides usability. Read evidence → behavior → spines/ownership → deletion/file map → checks. No forced abstraction hierarchy.

## Legacy Removal Policy
No backward compatibility; remove superseded paths. The input policy is generic recognized-field reading, not refType/version sniffing or legacy fallback. Delete the feature definition migration paths and their dedicated legacy helpers. Preserve runtime historical decoders only inside the existing runtime migration because that work remains required. Do not preserve dead migrations as no-ops. Detailed deletion inventory below.

## Persisted Data / State Transition Decision
**Definitions: Directly Usable — No Migration** for otherwise valid flat files, through generic projection and actual semantic admission.14 supplied top-level configs,12 structurally flat,2 nested parents; reference existence is evidence, not preclaimed valid runtime result. The2 nested parents are unavailable rather than transformed. No broad all-legacy-format promise. Authored files are not deleted, moved or changed on startup/import merely for this feature, including server-owned locations; maintainers own necessary conversion.
**Execution/history: existing Migration Required path retained, no new transition.** Existing released Team execution trees/sidecars become current Org execution packages where supported; flat current Team cohort stays zero-write. Exact existing schemas/decoders, atomic publication/validation, collision/error behavior, context-file relocation and history transfer remain. This ticket creates no data schema, migration ID or replay obligation. Source evidence shows runtime conversion validates run state independently of authored files; restoration uses persisted state with fresh-only definition instruction lookup.
**Ledger/current data:** preserve records and stable family ID; removed authoring migration is unregistered. Unknown stored records are not acted on by current runner. Existing successful family records skip as before. Existing converted definitions remain as authored data; no reversal or re-conversion. Interrupted authored conversion leftovers are not silently repaired by a new mechanism; normal availability checks apply. No private database reset/copy, no user-server operations, no deployment or downtime prescribed.
Cost/benefit: avoid unnecessary authored-file writes and ownership violations; retain software-data continuity. No backup/rebuild/rollback system added. Runtime acceptance AC-005b must be demonstrated; source inspection alone is not proof. AC-001b/002a–c/003a–b/005a protect direct reading and unchanged sources.

## Data-Flow Spine Inventory / Primary Execution Spines
| ID | Scope | Start → End | Owner / relevance |
| --- | --- | --- | --- |
| DS-001 | Primary, BEH-001–003 | User import/reload → package registration/source discovery → Team read → actual admission → available catalog/selection | Package service, provider, admission; registration ≠ usability |
| DS-002 | Primary preserved, BEH-002/003 | User launch → TeamRunService → requireAvailable → launch settings → execution | Team run service; no syntax-based bypass |
| DS-003 | Bounded local, BEH-001/002 | Raw config → known-field projection → strict current config | Existing codec, one read policy |
| DS-004 | Primary operational, BEH-005 | Startup → registry/runner/ledger → retained runtime family migration → validate/publish run state and history → status | Migration runner and runtime migration; authored files absent from flow |

## Spine Narratives / Actors / Ownership Map
DS-001: ordinary package registration discovers definitions, provider decodes with DS-003, admission predecode uses same reader then scoped Agent lookup/handoff checks. Available Teams reach catalog; malformed or truly nested definitions remain unavailable independently. Application resources reuse the Team input boundary, not a separate policy. Raw source bytes still define revision/ownership.
DS-002: normal launch requires admission and configuration; unavailable parent is never partially launched. Missing package defaults do not waive launch-time requirements. No provider activation during reading.
DS-003: projection ignores extras, fills only the approved optional root setting and delegates semantic shape/value validation. Writers independently emit/assert the canonical model.
DS-004: registry no longer schedules definition-only migration. The retained family entry runs existing context locator/runtime/cleanup/history phases, with the same successful-ledger skip and error semantics. It does not inspect definitions, so an invalid authored package does not become a migration prerequisite. Fresh launch still needs valid definitions; historical restore uses stored state as before. No definition transformation is smuggled into recovery.
Return/event spine: existing catalog/admission diagnostics and migration status to caller; no new stream/event loop. Thin GraphQL facades remain unchanged, no local parsing in UI. Main-line owners above retain lifecycle/invariant/sequence authority.

## Removal / Decommission Plan
| Item | Action / replacement | Scope |
| --- | --- | --- |
| Strict-only raw read calls in3 read consumers | Use codec input reader | This change |
| Family migrateDefinitions/planOrgDefinition/cleanupDefinitionTargets and definition-only types/helpers/imports/reports | Delete; no replacement | This change |
| Definition authoring-shape migration registration and source | Delete, retain old inert ledger rows | This change |
| Two migration-only legacy helper files | Delete once unused | This change |
| Obsolete definition-conversion tests/fixtures and docs promising auto conversion | Remove/update; preserve shared runtime tests/helpers | This change |
| Strict canonical builder/transaction validator; ordinary authoring recovery | Retain; distinct current responsibility | Not obsolete |
| Runtime family migration, state schemas/sidecars/locator/history, runtime test cohorts | Retain, validate preservation | Required |

## Off-Spine Concerns / Ownership Boundaries / Encapsulation
| Concern | Owner served | Boundary |
| --- | --- | --- |
| Scoped Agent references and handoff paths | Admission / launch | Existing resolver/compiler, never bypassed by reader |
| File discovery, IDs, revisions, write ownership | Provider | Existing paths/descriptors/hash; projection never rewrites source |
| Canonical explicit saves / transactions | Definition provider | Builder + strict validatePackage; no migration helper dependency |
| Runtime writes, locators, sidecar consistency, repair/history | Retained migration | Existing atomic writer/state validators; never authored conversion |
| Completion/retry/prerequisite order | Migration runner | Existing registry/ledger; no deletion/reset of completed rows |
Upstream uses package/provider/admission boundaries; no UI-to-parser or launch-to-raw-file shortcut. Input reader → strict validator → existing normalizers; strict validator must not call tolerant input reader. Migration no longer imports Team/Org definition codecs/inventory. Ordinary authoring service must not import runtime migration. Runtime ID meanings remain explicit.

## Interface Boundary Mapping / Check / Naming
readAgentTeamDefinitionConfig(unknown) owns Team input translation only; parseAgentTeamDefinitionConfig(unknown) owns canonical value/shape validation. Both return existing AgentTeamDefinitionConfigFile, no extra DTO/refType. requireAvailable('agent_team',definitionId) remains family-qualified admission. Migration execute owns software-state conversion only; same persisted ID, update human-readable description to remove definition claim. Singular responsibilities, explicit subjects, low selector ambiguity. No new endpoint or polymorphic ID API.

## Capability Reuse / Subsystem Allocation
Extend existing Team codec for input projection. Reuse provider/admission/application boundaries and strict model. Narrow existing migration owner by deletion; reuse all retained execution/history/ledger facilities. No new subsystem, coordinator, policy registry or common/shared layer.

## Draft File Responsibility / Reusable Structures / Tightness
Codec owns one local known-key projection, not copied among consumers. Existing config/member/default types stay tight; llmConfig remains intentionally provider-owned open data. No versioned DTO/compat wrapper or new schema. Migration file loses unrelated definition types; runtime state structures remain in existing files. Draft/final mapping identical after unused-helper inventory: no extra extraction needed.

## Final File Responsibility / Target Folder Mapping
All paths below under autobyteus-server-ts/; existing directories reflect persistence-provider, admission and migration ownership. Compact codec additions and deletion are clearer than new folders.
| Action | Path | Responsibility / guardrail |
| --- | --- | --- |
| Modify | src/agent-team-definition/providers/agent-team-definition-config.ts | Add input projection; canonical parser/builder unchanged |
| Modify | src/agent-team-definition/providers/file-agent-team-definition-provider.ts | Change readDefinition only; validatePackage and raw revision remain |
| Modify | src/collaboration-definition-admission/services/definition-admission-service.ts | Change Team predecode only; preserve real admission/Org branch |
| Modify | src/application-bundles/providers/file-application-bundle-provider.ts | Team resource input read only; manifest/ownership unchanged |
| Modify | src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.ts | Remove definition regions; preserve runtime/ID/config.getBaseUrl |
| Modify | src/app-data-migrations/app-data-migration-registry.ts | Remove definition-only registration/import; retain family prerequisite order |
| Remove | src/app-data-migrations/migrations/collaboration-definition-authoring-shape-app-data-migration.ts | Rejected definition rewrite responsibility |
| Remove | src/app-data-migrations/legacy/collaboration-definition-authoring-transition.ts | No remaining production consumer after deletion |
| Remove | src/app-data-migrations/legacy/owned-definition-package-inventory.ts | Migration-only definition inventory; NOT ordinary transaction subsystem |
| Add/modify tests | tests/unit/agent-team-definition/agent-team-definition-config.test.ts; existing definition-authoring/admission/application/catalog seams | Durable reader and availability controls |
| Modify tests | tests/unit/app-data-migrations/agent-org-flat-team-families-v1-app-data-migration.test.ts | Retain runtime cohorts; replace authoring conversion expectations with untouched definitions |
| Remove/replace tests | tests/unit/app-data-migrations/collaboration-definition-authoring-shape.test.ts | Remove deleted feature tests; carry registry/runner nonmutation checks into appropriate existing test owner |
Docs affected by removed automatic authoring promise should be synchronized proportionately. Do not edit prior archived ticket evidence to rewrite history. No generated .js outputs, external package edits or runtime production modifications beyond migration deletion. Implementation determines exact test split while retaining coverage intent.

## Applied Patterns / Concrete Examples
Pattern: local nonmutating projection, no compatibility strategy.
- {memberName:'lead',ref:'writer',refScope:'shared',refType:'agent',note:'x'} → the first3 fields; actual writer Agent still required.
- Missing root defaultLaunchConfig → null; wrong supplied runtimeKind type still fails; provider-specific llmConfig keys survive.
- Northstar child ref engineering-org has no scoped Agent → unavailable, not flatten/convert.
- Startup with old authored nested Team plus supported old execution package → authored files remain byte-for-byte in place; existing execution migration may convert only the stored run package/history. Fresh Org definition is not synthesized.
- Previously completed authoring migration row → left stored, unregistered and not rerun; never a new rollback trigger.

## Backward-Compatibility Rejection Log
Rejected: old-parser fallback/refType special case/version branch → use generic input projection. Rejected: pre-import rewrite/maintainer repository mutation → read-only. Rejected: definition converter/no-op migration/toggle → delete. Rejected: delete entire family migration/reset ledger → preserve runtime migration ID/prerequisites. Rejected: relax every runtime/Org codec → only Team input boundary. No retained obsolete flow. Derived layering N/A; existing owners suffice.

## Change / Refactor Sequence
1. Add/protect Team reader behavior and switch normal read callers; retain canonical write tests.
2. Remove definition phases/helpers, unregister/delete definition-only migration and unused helper files; keep all runtime methods/ID/order. Update descriptions and obsolete test expectations.
3. Validate deletion boundary: retained runtime cohorts, real registry/runner with definition hashes unchanged, ledger behavior, provider/admission mixed package and canonical writes.
4. Independent source review/implementation checks/then API validation under configured rules. Actual import/reload/catalog and owned startup checks required; do not run user's server or rewrite supplied package. No temporary compatibility path remains at handoff.

## Guidance For Implementation / Validation
- Codec tests: extras root/member/handoff/default object; absent/null/valid defaults; malformed required values/scopes/coordinator/duplicates/handoffs fail; raw input unchanged; canonical strict writer rejects malformed output; open llmConfig preserved.
- Real scoped lookup and mixed package: valid flat available, supplied nested parents unavailable, normal catalog excludes and launch gate rejects them, valid siblings unaffected. No mock assigning every ref an Agent. Inventory file presence is not all12 acceptance; investigate exact unrelated failures without weakening checks.
- Migration: source/test guard no definition phase/registration; startup runner with old flat/nested authored configs hashes/names unchanged, no generated org.md/org-config or parent deletion. Include owned and external source boundaries. Test obsolete authoring ledger states don't schedule work; retain family ID/order and current successful skip. No live user DB manipulation.
- Preserve existing runtime tests: native flat zero-write, organization-like execution conversion/history, predecessor output, strict runtime-field rejection, sidecar mismatch, collision, fully-written runtime cleanup. Run these with authoring definitions absent/unchanged so accidental dependency cannot hide. Do not reuse deleted conversion fixtures as automatic definition setup.
- Existing runtime restore uses stored state/fresh-only instruction lookup; validate retained continuation through appropriate existing runtime coverage. No new behavior requirement to launch invalid authored Org definitions, and no all-provider claim.
- API/E2E: supported package import/reload and frontend catalog/select/default handling; actual owned startup verification of untouched authored files plus retained history. Preserve raw evidence and distinguish unit/integration/actual browser results. Tests must not migrate supplied package to manufacture success. Product Design N/A, no new UI surface.

## Key Tradeoffs / Risks
Removal is conceptually simple but touches registered persistence migration and ownership boundaries. Keeping same runtime ID avoids replay; separate writer validation avoids weakening internal output checks. Definition migration is not retained merely to justify parser architecture. Read-only current package validity and actual runtime migration preservation remain unexecuted by Designer. Previous partial authoring leftovers are not repaired automatically; no new rollback promise. Extra surfaces discovered during implementation return as Design Impact/Requirement Gap rather than expand scope silently.

## Task Size And Architectural Risk
**task_size Medium; architectural_risk High.** Six modified production files plus3 deleted migration-only files and bounded tests within existing owners. Not Large, no broad refactor or new framework. High is specifically due to changed persisted-definition mutation policy and deletion from a registered migration containing required runtime conversion/ledger prerequisites; a mistaken boundary could break execution-history preservation. Not due to Markdown size, number of packages, or mere existence of legacy code. Prior Small/Low DS-001 classification no longer applies after approved migration deletion.
Escalation: any runtime data/schema/ID change, need for automatic authoring recovery/conversion, admission policy relaxation, new provider behavior or scope expansion returns to Solution Designer. No implicit approval for reset/migration replay or user-server changes. Independent architecture review required per applicable rules; implementation only after review Pass. Review artifacts currently pending/not yet produced, not falsely N/A. No implementation/API/Delivery artifact yet. Expected reviewer scope is these approved behaviors, not new compatibility/conversion obligations.
