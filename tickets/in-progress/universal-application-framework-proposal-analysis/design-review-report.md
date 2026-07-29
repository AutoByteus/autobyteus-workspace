# Design Review Report — Universal Application Dual-Host Foundation

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/proposal-critical-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-self-validation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/sources/autobyteus-vertical-application-developer-experience-proposal.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-003` (with `SR-001` and `SR-002` retained as history)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: Architecture re-review requested by `solution_designer` after `SR-003`
- Prior Review Round Reviewed: 2 / `ARCH-REV-002`
- Latest Authoritative Round: 3
- Current-State Evidence Basis: task `HEAD` and `origin/personal` both at `6caf809303294252c109420b238588f0c68aca6a`; ancestor check passed. Review included the current frontend SDK/contracts, package parser/identity, server startup and shutdown, Prisma/vault/Search prerequisites, application runtime graph dependencies, devkit config/assembler/resource copier, representative application layouts/manifests, current package-root materialization model, and Studio package operations.
- Independent Evidence: the retained SR-003 disposable devkit probe packed and validated both maintained applications through the exact proposed configuration, including icon, team, migration, and seven exposure assertions; prior baseline contract/frontend checks remain `18/18` passing and no production source changed between that evidence and this review. Round-3 relative-link, canonical-ID, contradiction, base, ancestor, and `git diff --check` checks passed.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial solution-package review | N/A | AR-001–AR-004 | Fail | No | Direction was sound; readiness, frontend migration, dependency conversion, and traceability were incomplete. |
| 2 | `SR-002` and refreshed-base reconciliation | AR-001–AR-004 | AR-005, AR-006 | Fail | No | AR-002–AR-004 resolved; exact readiness consistency, maintained-app package inputs, and the broad-server fallback contradiction remained. |
| 3 | `SR-003` bounded design correction | AR-001, AR-005, AR-006 | None | Pass | Yes | All prior findings are verified resolved without expanding approved product scope. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Finding ID | Prior Status | Current Status | Related Solution Revision | Verification Evidence | Required Follow-Up |
| --- | --- | --- | --- | --- | --- |
| AR-001 | Open / blocking | Resolved | SR-003 | P0–P9, the graph, dependency rules, composition example, file map, guidance, and SV-C24 now use one order: AppConfig/database location -> core migration -> protected DB/root-key/sidecar paths -> Prisma -> vault -> app-data migration -> remaining readiness. P6 names exactly seven groups including provisioned Search. | None. |
| AR-002 | Resolved | Remains resolved | SR-002, SR-003 | Exact unversioned `startApplication` contract and complete source/test/doc/generated consumer inventory remain unchanged and coherent. | None. |
| AR-003 | Resolved | Remains resolved | SR-002, SR-003 | Exact construction DAG, narrow cycle seams, graph-local authorities, Modify/Retain inventory, and deterministic disposal remain actionable. | None. |
| AR-004 | Resolved | Remains resolved | SR-002, SR-003 | BEH-001–BEH-007 meanings remain stable across the core artifacts; security evidence remains separately identified. | None. |
| AR-005 | Open / blocking | Resolved | SR-003 | Both maintained apps now have one exact checked-in devkit configuration mapping their real source roots, entries, resources, migrations, seven exposure booleans, and output. The existing devkit seam was proven by a cleaned disposable pack/validate probe. Custom builders and generated source-root runtime mirrors are explicitly deleted rather than wrapped. Current server documentation and materializer behavior confirm these maintained roots are authoring/sample roots, not the platform built-in payload. | None. |
| AR-006 | Open / blocking | Resolved | SR-003 | The approved critical analysis now rejects broad `buildApp()` use in its correction, replacement language, roadmap, and decision table. Named runtime prerequisites remain reusable only inside the explicit selected-application composition. | None. |

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. One validated current manifest-v4 package runs through Studio and selected-app standalone; app source uses one startup API; runtime authorities are shared through explicit compositions; development and production commands use real hosts; identity/account/authentication and package-vNext remain excluded.
- Relevant existing behavior and evidence confirmed: Yes. Current Studio bootstrap, package identity/parser, backend/runtime authorities, application storage/migrations, startup/shutdown, devkit packaging, and maintained application inputs were independently inspected.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass | Pass | Confirmed | None. |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | None. |
| BEH-003 | Contract | Pass | Pass | Pass | Confirmed | None. |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | None. |
| BEH-005 | Operational | Pass | Pass | Pass | Confirmed | None. |
| BEH-006 | Operational | Pass | Pass | Pass | Confirmed | None. |
| BEH-007 | System | Pass | Pass | Pass | Confirmed | None. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Retained proposal source | Pass | Pass | Pass | Pass | Pass | None; evidence/input only. |
| `proposal-critical-analysis.md` | Pass | Pass | Pass | Pass | Pass | None; approved/refined behavior context, with identity/account scope removed. |
| `design-self-validation.md` | Pass | Pass | Pass | Pass | Pass | None; evidence-only, approval N/A. |

The investigation-notes supplement inventory identifies each artifact's purpose, scope, status, and approval applicability. Core-artifact links are valid.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The package identifies a larger cross-cutting feature with startup/composition ownership defects. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Iframe-only startup and the monolithic server root are traced to current source and production paths. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bootstrap and composition-critical extraction are in scope; package-vNext, marketplace, optimized distribution, and repository-wide DI are deferred. | None. |
| Refactor decision is supported by concrete design sections | Pass | Provider boundaries, two compositions, fixed construction DAG, lifecycle, route cardinality, removal inventory, and staged implementation are explicit. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Studio startup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Standalone startup | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Shared backend invocation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Runtime return/event flow | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Platform lifecycle/readiness/stop | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Native real-host development | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Build once / two hosts | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Standalone root/assets/navigation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-009 | Studio setup/reload/exit | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-010 | Built-package production start | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend startup / `startApplication` | Pass | Pass | Pass | Pass | Provider-local wires normalize before the app callback. |
| Standalone selection | Pass | Pass | Pass | Pass | One package/local-ID selector delegates to the current parser and derives identity once. |
| Gateway/engine/orchestration | Pass | Pass | Pass | Pass | Host adapters share authorities without exposing their internals. |
| `ApplicationPlatformLifecycle` | Pass | Pass | Pass | Pass | It owns named phases and state, not arbitrary service lookup. |
| Devkit package/development boundary | Pass | Pass | Pass | Pass | Declarative configuration feeds one pack owner; host commands do not become alternate builders. |
| Composition roots/runtime graph | Pass | Pass | Pass | Pass | The typed graph is construction output, never a runtime service locator. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Application source -> SDKs | Pass | Pass | Pass | Pass | No Studio/server/host imports or host branching. |
| Coordinator -> provider/client factory | Pass | Pass | Pass | Pass | Provider wire branches remain encapsulated. |
| Host ingress -> gateway/communication owners | Pass | Pass | Pass | Pass | Fixed and multi-app mounts remain thin cardinality adapters. |
| Composition -> runtime graph/lifecycle | Pass | Pass | Pass | Pass | Exact graph instances and retained process resources are identified. |
| Composition -> Prisma/vault/tool prerequisites | Pass | Pass | Pass | Pass | One protected-path-before-Prisma chain and seven-group readiness contract are used everywhere. |
| Devkit -> pack/host public boundaries | Pass | Pass | Pass | Pass | No server manager/internal lifecycle import and no executable build hook. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `startApplication(options)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationBootstrapProvider.acquire(signal)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationRuntimeBootstrap` | Pass | Pass | Pass | Low | Pass |
| `StandaloneApplicationBootstrapPayload` | Pass | Pass | Pass | Low | Pass |
| `StandaloneApplicationSelectionService.resolve(config)` | Pass | Pass | Pass | Low | Pass |
| Lifecycle phase methods | Pass | Pass | Pass | Low | Pass |
| `autobyteus-app dev --host ...` | Pass | Pass | Pass | Low | Pass |
| `autobyteus-app start` | Pass | Pass | Pass | Low | Pass |
| `startStandaloneApplicationHost(config)` | Pass | Pass | Pass | Low | Pass |
| Studio/standalone REST/WS mounts | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Bootstrap/client communication | Pass | Pass | Pass | Pass | Bootstrap is normalized; existing client transport is reused. |
| Package parsing and identity | Pass | Pass | N/A | Pass | Current v4 parser/provider and canonical identity remain authoritative. |
| Gateway/engine/storage/orchestration | Pass | Pass | N/A | Pass | Implementations remain single-source. |
| Startup/readiness | Pass | Pass | Pass | Pass | Shared lifecycle extracts exact current requirements. |
| Static root and fixed selected-app ingress | Pass | Pass | Pass | Pass | Narrow host adapters are justified. |
| Dev packaging/validation | Pass | Pass | N/A | Pass | Current devkit pack/validate owner is configured, not duplicated. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK contracts/frontend startup | Pass | Pass | Pass | Pass | Correct normalization boundary. |
| Application packages/bundles | Pass | Pass | Pass | Pass | No second package system. |
| Application platform runtime | Pass | Pass | Pass | Pass | Cohesive lifecycle plus graph-local authorities. |
| API transport adapters | Pass | Pass | Pass | Pass | Distinct host cardinality over shared services. |
| Standalone host/compositions | Pass | Pass | Pass | Pass | Selected surface and process ownership are explicit. |
| Devkit | Pass | Pass | Pass | Pass | Owns package and command orchestration, not server internals. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime bootstrap | Pass | Pass | Pass | Pass | Absolute host-neutral runtime endpoints only. |
| Standalone provider wire | Pass | Pass | Pass | Pass | Strict relative wire paths stay provider-local. |
| Provider contract | Pass | Pass | Pass | Pass | Narrow provider protocol; not a generic plugin registry. |
| Backend HTTP handlers | Pass | Pass | Pass | Pass | Shared parsing/delegation with host-specific mounts. |
| Selected application descriptor | Pass | Pass | Pass | Pass | One immutable canonical identity. |
| Lifecycle state and cycle-break ports | Pass | Pass | Pass | Pass | Narrow availability and one-bind event-handler seams. |
| Maintained app package mapping | Pass | Pass | Pass | Pass | One declarative devkit config per project, identical because the layouts/contracts are identical. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationRuntimeBootstrap` | Pass | Pass | Pass | Pass | Pass | Iframe correlation and request context do not leak through normalization. |
| `StandaloneApplicationBootstrapPayload` | Pass | Pass | Pass | Pass | Pass | Relative paths are specialized provider wire, not loosened runtime URLs. |
| `StandaloneApplicationSelection` | Pass | Pass | Pass | Pass | Pass | Canonical ID is derived, not a second selector. |
| `ApplicationPlatformLifecycleState` | Pass | Pass | Pass | N/A | Pass | One state authority. |
| `ApplicationPlatformRuntimeGraph` | Pass | Pass | Pass | N/A | Pass | Typed construction result only. |
| `ApplicationDevkitConfig` mapping | Pass | Pass | Pass | N/A | Pass | Each field has one package-input meaning; no executable fallback representation. |

## File Responsibility Mapping Verdict

| File / Area | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend startup contract/coordinator/provider files | Pass | Pass | Pass | Pass | Exact source and generated migration is complete. |
| `application-platform-lifecycle.ts` | Pass | Pass | Pass | Pass | Named phase owner with explicit state. |
| `agent-tool-registry-readiness.ts` | Pass | Pass | Pass | Pass | Exactly seven named groups including Search. |
| `create-application-platform-runtime-graph.ts` | Pass | Pass | Pass | Pass | Fixed DAG, cycle seams, output, and forbidden lookups are exact. |
| Composition/process resource files | Pass | Pass | Pass | Pass | Prerequisites, listeners, signals, and disposal are allocated. |
| REST/WS handler/registrar files | Pass | Pass | Pass | Pass | Shared handlers plus explicit mounts. |
| Maintained application config/source/output files | Pass | Pass | Pass | Pass | Exact config, icon/source imports, generated output, deletion, and regeneration are mapped. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK `application-startup/` | Pass | Pass | Low | Pass | Coordinator and provider concerns are separated. |
| Server `application-platform/runtime/` | Pass | Pass | Medium | Pass | Shared construction/lifecycle seams are cohesive. |
| `standalone-application-host/` | Pass | Pass | Medium | Pass | Config, selection, API, process, and static owners reflect real depth. |
| `compositions/` | Pass | Pass | Low | Pass | Product roots only. |
| Existing REST/WebSocket folders | Pass | Pass | Medium | Pass | Transport implementation remains in established areas. |
| Devkit commands/development/config folders | Pass | Pass | Medium | Pass | Command and project-input concerns have distinct homes. |
| Maintained app source roots and `dist/importable-package` | Pass | Pass | Low | Pass | Source and generated runtime output have one owner each. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Hosted application startup API/types/copy/tests | Pass | Pass | Pass | Pass | One unversioned startup surface replaces it. |
| Version-suffixed code identifiers | Pass | Pass | Pass | Pass | Serialized contract values remain; aliases do not. |
| Public iframe/mock dev fallback | Pass | Pass | Pass | Pass | Useful mocks may remain test-only. |
| Application routes in broad registries | Pass | Pass | Pass | Pass | Explicit Studio and standalone registrars replace them. |
| Monolithic `buildApp` as standalone composition | Pass | Pass | Pass | Pass | Explicitly rejected in all governing artifacts. |
| Composition-critical application globals | Pass | Pass | Pass | Pass | Exact Modify/Retain inventory is complete. |
| Maintained app custom builders/generated source mirrors/vendor trees | Pass | Pass | Pass | Pass | Deleted after icon migration; devkit-owned output is regenerated. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Application-facing startup | No | Pass | Pass | One API and provider normalization. |
| Versioned code symbols | No | Pass | Pass | Clean unversioned rename; serialized values stay current. |
| Manifest/package contracts | No | Pass | Pass | Manifest v4 remains the sole contract. |
| Studio iframe host protocol | No | Pass | Pass | Preserved current wire is provider-local, not a compatibility wrapper. |
| Maintained app packaging | No | Pass | Pass | Custom builder and source mirrors are removed, not wrapped. |
| Persisted data | No | Pass | Pass | No version branch, dual reader/writer, or transformation. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Per-app `app.sqlite`, `platform.sqlite`, logs/runtime state, and global orchestration lookup | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Schemas/readers/writers stay current; Studio identity is unchanged; standalone uses current-format identity and an isolated root; recovery filters to the selected ID. |
| Generated SDK/application package outputs | `Discard or Rebuild` | Pass | Pass | N/A | Pass | Build owners regenerate derived artifacts from source; no runtime data transformation. |
| New standalone host `.env` | Not application data; bounded config materialization | Pass | Pass | N/A | Pass | Only a missing empty/non-secret file may be created; existing config and credentials are not overwritten or persisted. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Bootstrap contract and frontend API | Pass | Pass | Pass | Pass |
| Server composition/lifecycle extraction | Pass | Pass | Pass | Pass |
| Standalone selection/host | Pass | Pass | Pass | Pass |
| Native development and maintained-app conversion | Pass | Pass | Pass | Pass |
| Built-package production start | Pass | Pass | Pass | Pass |
| Documentation/supplement cleanup | Pass | N/A | Pass | Pass |

The sequence first establishes the clean startup contract and package inputs, then extracts the graph/lifecycle, then adds standalone and command paths, and finally performs cross-host proof. Temporary seams are restricted to the two named cycle breaks and do not become compatibility paths.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider normalization | Yes | Pass | Pass | Pass | Provider-local wires normalize to one runtime type. |
| Standalone selection/identity | Yes | Pass | Pass | Pass | Current parser and one derived ID are explicit. |
| Composition graph/lifecycle | Yes | Pass | Pass | Pass | Exact readiness order, graph construction, and stop ownership are shown. |
| Route adapters/static fallback | Yes | Pass | Pass | Pass | Public cardinality and SPA exclusions are clear. |
| Native commands | Yes | Pass | Pass | Pass | Exact scripts, project config, watch inputs, rebuild/restart behavior, and build-free start are shown. |
| Maintained app packaging | Yes | Pass | Pass | Pass | Full config example and custom-builder rejection make the target executable. |

## Material Premise Validation (Only When Needed)

### MP-AR-001 — Refreshed-base runtime prerequisites must be preserved in both hosts

- Related approved requirement or established contract: BEH-004, BEH-005, BEH-007; current operational startup contract.
- Relevant behavior ID(s): BEH-004, BEH-005, BEH-007.
- Initiating basis kind: Operational / Contract.
- Independent product-supported initiating trigger or applicable governing contract: the operator starts Studio or the approved standalone host; both promise the same real application runtime authorities and readiness.
- Support evidence: current `server-runtime.ts` always derives the operational database location, registers protected DB/key/sidecar paths, initializes Prisma and the vault, and registers provisioned Search before runtime use.
- Forward path: process start -> AppConfig/database location -> core migration -> protected paths -> Prisma -> vault -> app-data migration -> seven tool groups/readiness -> host ready -> process stop -> application consumers -> event pipeline -> vault -> Prisma.
- Lifecycle preconditions and material consequence: omitting or reordering these steps would not preserve current runtime/security/readiness behavior.
- Reachability: `Reachable`.
- Review consequence / proportionate response: SR-003 now specifies one exact sequence and group count everywhere; the premise no longer drives an open finding.

### MP-AR-005 — Maintained application roots must enter the real devkit pack path

- Related approved requirement or established contract: BEH-006, UC-015, AC-011.
- Relevant behavior ID(s): BEH-006.
- Initiating basis kind: User.
- Independent product-supported initiating trigger or applicable governing contract: a developer runs supported `pnpm dev`, `pnpm dev:studio`, or `pnpm build` from Brief Studio or Socratic Math Teacher.
- Support evidence: the exposed application-folder command contract is approved; current maintained projects use `frontend-src`, `backend-src`, and root `agent-teams`, while the devkit accepts declarative path/entry/resource/exposure configuration.
- Forward path: application project command -> load checked-in devkit config -> current pack/validation owner -> `dist/importable-package` -> real Studio or standalone host path.
- Lifecycle preconditions and material consequence: without a real mapping, default devkit inputs would not find maintained sources and real-host development could not start.
- Reachability: `Reachable`.
- Review consequence / proportionate response: SR-003 supplies the exact mapping and retained probe evidence; custom builders are removed, so no open finding remains.

AR-006 required no material-premise record: it was a direct cross-artifact governing-contract contradiction and is now resolved.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

The solution is implementation-ready. Provider normalization keeps iframe-v4 acquisition provider-local while giving application code one exact `startApplication` contract. Standalone selection reuses the current parser and stable current-format identity. `ApplicationPlatformLifecycle` owns a bounded stateful lifecycle rather than service lookup. Studio and standalone use explicit compositions with shared graph-local gateway/engine/storage/orchestration authorities and different ingress cardinality. Manifest v4 and persisted data remain directly usable without a compatibility wrapper or data migration. The staged singleton conversion is bounded by a concrete Modify/Retain inventory, narrow cycle seams, and explicit cleanup. SR-003 closes the remaining readiness, maintained-project packaging, and broad-server-fallback defects without introducing new product behavior.

## Findings

None.

## Classification

`N/A — Pass`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Hidden singleton coupling remains an implementation risk controlled by the exact Modify/Retain inventory and distinct catalog/data-root sentinel tests.
- SPA fallback/platform-prefix collisions, absolute asset bases, origin/WS validation, and generated output correctness require API/E2E across the supported Studio and standalone builds.
- Worker-crash recovery plus refreshed-base event-pipeline/vault/Prisma shutdown require real execution evidence.
- New `dev`, `dev:studio`, and `start` commands still require implementation and executable validation; the retained config probe proves only the current pack-input seam.
- The first distribution may remain heavy and workspace-coupled. Optimized independent packaging, full offline dependency closure, marketplace isolation, and public-internet security are correctly deferred.
- Manifest v4 still depends on current trusted ambient tool/skill/runtime availability and must not be represented as a closed portable marketplace artifact.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Round: 3
- Architecture Review Revision: `ARCH-REV-003`
- Related Solution Revision: `SR-003`
- Material-Premise Gate: `Pass`
- Notes: AR-001–AR-006 are resolved. Proceed to implementation with downstream executable coverage required for the listed residual risks.
