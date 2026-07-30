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
- Relevant Solution Revision IDs: `SR-011`; `SR-010` retained as the functional architecture baseline; `SR-007` remains withdrawn
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-009`
- Current Review Round: 9
- Trigger: `CRR-028` / `CR-018` found that the functionally passed framework uses overlapping abstract names that do not expose concrete responsibilities to contributors.
- Prior Review Round Reviewed: round 8 / `ARCH-REV-008` (`Pass`)
- Latest Authoritative Round Before This Review: round 8 / `ARCH-REV-008`
- Current-State Evidence Basis: `CRR-028`; source responsibility trace through Studio/standalone server builders, the application runtime construction result, Agent Tools process/session owners, general process run lifecycle, application shutdown sequencing, bind-once cycle breakers, root exports, repository consumers, and affected docs/tests; functional regression baseline `IR-015`, `CRR-026`, `API-REV-010` (`Pass / 98.3%`), and `CRR-027`.
- Reviewed Solution Commit: `4bd4b6bd55054dcfd730db2f502fb7da9445c96b`
- Independent Review Checks: verified `autobyteus-server-ts` is `private: true`; repository search found no consumer of `buildStudioServerComposition`/`StudioServerComposition` outside the server project; devkit workspace consumers import unaffected standalone validation/start exports; target names do not collide with existing source symbols; all relative links in the six solution-owned artifacts resolve; BEH-001–009, REQ-001–009, AC-001–018, UC-001–024, DS-001–014, SV-C01–44, and SR-001–011 are contiguous; solution commit changes only the six solution-owned artifacts; `git diff --check` passes. No runtime execution was repeated because the design change is source vocabulary over preserved API-REV-010 behavior.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Initial solution package | N/A | AR-001–AR-004 | Fail — Design Impact | Readiness, frontend migration, graph construction, and traceability were incomplete. |
| 2 | `SR-002` | AR-001–AR-004 | AR-005, AR-006 | Fail — Design Impact | AR-002–AR-004 resolved; three bounded design gaps remained. |
| 3 | `SR-003` | AR-001, AR-005, AR-006 | None | Pass | Dual-host macro architecture became implementation-ready. |
| 4 | `SR-004` / downstream re-entry | Prior findings; CR-006–CR-008 | AR-007 | Fail — Design Impact | Invalid saved host state was not representable. |
| 5 | `SR-005` | AR-007 | None | Pass | Invalid/stale overrides became explicit and fail-closed. |
| 6 | `SR-006` / `CRR-012` | CR-009, CR-012 | None | Pass | Selected-resource editing and portable policy gained authoritative owners. |
| 7 | Withdrawn `SR-007` | CR-013 | N/A | Withdrawn — No Decision | Superseded premise; `ARCH-REV-006` remained valid. |
| 8 | `SR-010` / `CRR-020` | CR-015 | None | Pass | Graph-local publication/session authority became implementation-ready. |
| 9 | `SR-011` / `CRR-028` | CR-018 and all prior architecture resolutions | None | Pass | Bounded behavior-neutral role vocabulary and exact clean rename map are implementation-ready. |

## Prior Findings Resolution Check

| Finding ID | Prior Status | Current Status | Related Revision | Verification Evidence | Required Follow-Up |
| --- | --- | --- | --- | --- | --- |
| AR-001–AR-007 | Resolved | Remain resolved | SR-002–SR-006, SR-010, SR-011 | SR-011 changes only source vocabulary and preserves all reviewed host, package, lifecycle, launch/readiness, editing, prompt, and publication decisions. | Preserve established coverage. |
| CR-001–CR-017 | Resolved in source/test rounds | Remain resolved | IR-015, CRR-026, API-REV-010, CRR-027 | Functional Studio/standalone execution, route/session identity, publication, handoff, restart, cleanup, and package parity pass. | Use as regression baseline. |
| CR-018 | Open — Design Impact | Resolved in design; implementation and source proof pending | CRR-028, SR-011, SV-016 | The role vocabulary is small and concrete; the exact map covers central types/factories/files/fields/handles, scope, lifecycle, contract impact, tests, root export, docs, retired-name removal, and no-run-on-build proof. | Implement and source-review the clean rename. |
| APIE2E-REPO-005 | `Unclear` / unattributed | Remains separate and non-material | API-REV-010, CRR-028 | No supported origin ties the broad diagnostic to naming. | Reconcile separately; do not broaden SR-011. |

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: preserve the completed dual-host application framework while making its central code responsibilities understandable through familiar, distinct role nouns. Building `ApplicationPlatformRuntime` prepares infrastructure and starts no new run; supported business demand starts new runs and legitimate recovery restores recorded runs.
- Relevant existing behavior and evidence confirmed: API-REV-010 and CRR-026/027 establish the runtime baseline. Current source confirms the concrete responsibilities behind `StudioServerComposition`, `ApplicationPlatformRuntimeGraph`, the process/session `Authority` types, the two different run `Authority` types, and the bind-once `Port` types.
- Approved change, preserved behavior, and outside scope understood: symbols, filenames, imports, private root export, test names/descriptions, diagrams, and affected developer/module docs change together. Object identity, construction order, routes, session family, publisher binding, run triggers, recovery, shutdown, public wire/data/package contracts, provider behavior, and package bytes do not change. No repository-wide rename, alias, wrapper, runtime redesign, or data migration is in scope.
- Remaining material ambiguity, if any: None. A newly evidenced supported consumer of an affected export must return as Design Impact rather than trigger an ad hoc alias.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / host lifecycle | Pass | Pass — API-REV-010 | Pass — `StudioServer` and `buildStandaloneApplicationServer` retain exact surfaces/lifecycle | Confirmed | Rename only. |
| BEH-002 | SDK contract | Pass | Pass | Pass | Confirmed | Preserve. |
| BEH-003 | Package contract | Pass | Pass | Pass | Confirmed | Preserve package bytes/contracts. |
| BEH-004 | Real application run/return | Pass | Pass — CRR-026/API-REV-010 | Pass — server -> application runtime -> business-triggered run -> scoped tools/publication remains readable and unchanged | Confirmed | Regression proof. |
| BEH-005 | Process/session lifecycle | Pass | Pass — current source and API-REV-010 | Pass — `AgentToolsMcpRuntime`, scoped manager, supervisor, coordinator, and bind-once publisher state exact lifetimes | Confirmed | Preserve exact instances/order. |
| BEH-006 | Developer commands/conformance | Pass | Pass — API-REV-010 | Pass — documentation/import/test rename does not change package output or commands | Confirmed | Proportional rerun after source review. |
| BEH-007 | Persistence/recovery | Pass | Pass | Pass — source-only names; recovery semantics unchanged | Confirmed | No migration. |
| BEH-008 | Prompt authority | Pass | Pass | Pass — mapped names do not change the injected team-definition instance | Confirmed | Preserve. |
| BEH-009 | Contributor navigation / source contract | Pass | Pass — user comprehension evidence plus CRR-028 current-source trace | Pass — exact role map, clean removal, synced docs, and no-run structural proof | Confirmed | Implement AC-018. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| Retained proposal source | Pass | Pass | Pass | Pass | Pass — evidence/input, approval N/A | None. |
| `proposal-critical-analysis.md` | Pass | Pass | Pass | Pass | Pass — approved/refined through 2026-07-30, aligned through SR-011 | None. |
| `design-self-validation.md` | Pass | Pass | Pass | Pass | Pass — evidence-only, approval N/A, complete through SV-016 | Execute deferred implementation proof. |

The investigation notes retain the canonical supplement inventory with purpose, scope, supported core artifacts, status, approval applicability, and retention decision. The behavior-defining supplement and core artifacts use the same target vocabulary; historical old-name evidence remains explicitly labeled rather than becoming current design terminology.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Requirements/investigation/design classify a completed larger requirement plus bounded behavior-neutral readability refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | `Naming-To-Responsibility Drift` is supported by user comprehension evidence, CRR-028, and current source responsibility tracing. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Bounded central vocabulary refactor is required now; repository-wide cleanup and unrelated architecture remain deferred. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Role vocabulary, exact map, removal plan, dependency diagram, file map, docs plan, Sequence 9, SV-C43/SV-C44, and risk controls are actionable. | Implement as reviewed. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001/DS-002 | Studio/standalone frontend and server entry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003/DS-004 | Shared backend invocation and return/event flow | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Runtime preparation, recovery, readiness, and stop | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006–DS-013 | Package, command, launch configuration, and prompt spines | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-014 | Scoped Agent Tools publication/handoff | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The target vocabulary improves rather than shortens the spines: assembled `Server` -> prepared `ApplicationPlatformRuntime` -> business-triggered run managers -> scoped session manager -> authenticated publisher/member context -> journal/projection -> ordered lifecycle stop. `Runtime` is not used as a synonym for an individual run.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `StudioServer` / `buildStudioServer` | Pass | Pass | Pass | Pass | Distinguishes returned configured server from assembly activity; exposes named server-facing fields. |
| `buildStandaloneApplicationServer` | Pass | Pass | Pass | Pass | Configures one Fastify server but does not listen; host start remains lifecycle owner. |
| `ApplicationPlatformRuntime` | Pass | Pass | Pass | Pass | Read-only connected service result; exact fields are passed onward and no service accepts it as a generic container. |
| `AgentToolsMcpRuntime` | Pass | Pass | Pass | Pass | Concrete process subsystem; narrow route dependencies/session-manager factory only. |
| `ScopedAgentToolMcpSessionManager` | Pass | Pass | Pass | Pass | Owns one explicit session collection and close/revoke lifecycle for either application or general scope. |
| `GeneralProcessRunSupervisor` | Pass | Pass | Pass | Pass | Constructs and releases the general process run managers; does not overlap application runtime ownership. |
| `ApplicationRunShutdownCoordinator` | Pass | Pass | Pass | Pass | Sequences team-then-agent stopping only; owns no run creation. |
| Bind-once publisher/handler | Pass | Pass | Pass | Pass | Names both callable role and one-bind invariant; remains a narrow cycle seam, not a locator. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server builder -> process/runtime owners | Pass | Pass | Pass | Pass | Exact existing objects and order are retained; names do not introduce another layer. |
| Server -> `ApplicationPlatformRuntime` fields | Pass | Pass | Pass | Pass | Server/registrars use exact fields; whole runtime is not injected into services. |
| `AgentToolsMcpRuntime` -> route/scoped manager | Pass | Pass | Pass | Pass | One process family; no default/second catalog or gateway reuse. |
| Scoped manager -> session capabilities | Pass | Pass | Pass | Pass | Exact publisher stays on authenticated session; no global lookup. |
| Lifecycle -> shutdown coordinator/scoped manager/bind-once publisher | Pass | Pass | Pass | Pass | Existing revoke/close/stop order remains authoritative. |
| Business demand/recovery -> run creation/restoration | Pass | Pass | Pass | Pass | Runtime build does not invoke either path; recovery handles only recorded work. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `buildStudioServer` -> `StudioServer` | Pass | Pass | Pass | Low | Pass |
| `buildStandaloneApplicationServer` -> Fastify server | Pass | Pass | Pass | Low | Pass |
| `buildApplicationPlatformRuntime` -> `ApplicationPlatformRuntime` | Pass | Pass | Pass | Low | Pass |
| `AgentToolsMcpRuntime.createApplicationSessionManager` | Pass | Pass | Pass | Low | Pass |
| `AgentToolMcpSessionManager` / scoped implementation | Pass | Pass | Pass | Low | Pass |
| `AgentToolMcpSessionExecutionCapabilities` | Pass | Pass | Pass | Low | Pass |
| `PublishedArtifactPublisher.publishManyForRun` | Pass | Pass | Pass | Low | Pass |
| `BindOncePublishedArtifactPublisher.bind/close` | Pass | Pass | Pass | Low | Pass |
| `ApplicationEngineEventHandler` / bind-once implementation | Pass | Pass | Pass | Low | Pass |
| `ApplicationRunShutdownCoordinator.stopAllRuns` | Pass | Pass | Pass | Low | Pass |

The engine callback interface remains a restricted callable surface over the same three exact engine operations; the `Handler`/`BindOnce` names state the dominant callback role and lifecycle invariant without widening the API.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server assembly | Pass | Pass | N/A | Pass | Existing composition folder/constructors are renamed, not duplicated. |
| Application runtime services | Pass | Pass | N/A | Pass | Same typed result and lifecycle. |
| Agent Tools transport/session handling | Pass | Pass | N/A | Pass | Existing process/scoped owners receive clearer role names only. |
| Publication and engine cycle seams | Pass | Pass | N/A | Pass | Existing implementations are clean-renamed; no second abstraction. |
| Run management/shutdown | Pass | Pass | N/A | Pass | Existing supervisor/coordinator responsibilities are preserved. |
| Documentation/testing | Pass | Pass | N/A | Pass | Existing files/tests are renamed and updated, not copied. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `compositions/` server assembly | Pass | Pass | Pass | Pass | Folder retains architecture activity; returned objects no longer use `Composition`. |
| Application platform runtime | Pass | Pass | Pass | Pass | Runtime type/builder/files stay with application platform. |
| Agent Tools MCP | Pass | Pass | Pass | Pass | Runtime and scoped manager stay in current protocol subsystem. |
| Agent execution runtime | Pass | Pass | Pass | Pass | General supervisor remains in general execution runtime. |
| Published artifacts | Pass | Pass | Pass | Pass | Publisher contract stays with publication subject. |
| Application lifecycle/shutdown | Pass | Pass | Pass | Pass | Shutdown coordinator and bind-once engine handler stay with runtime lifecycle construction. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Session-manager consumer contract | Pass | Pass | Pass | Pass | `AgentToolMcpSessionManager` remains one narrow consumer-facing contract; scoped lifecycle stays in its implementation. |
| Session execution capabilities | Pass | Pass | Pass | Pass | One non-wire structure; property names match callable roles. |
| Published-artifact callable | Pass | Pass | Pass | Pass | One publisher interface implemented by service/bind-once proxy. |
| Application run stop dependencies | Pass | Pass | Pass | Pass | Two structural `*Stopper` types avoid exposing whole managers. |
| Central naming map | Pass | N/A | Pass | Pass | One canonical map prevents local synonym drift; not a runtime structure. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `StudioServer` | Pass | Pass | Pass | Pass | Pass | `fastify`, `applicationRuntime`, and package registry have singular meanings. |
| `ApplicationPlatformRuntime` | Pass | Pass | Pass | Pass | Pass | Same read-only named service set; no graph API or optional catch-all fields. |
| `AgentToolMcpSessionExecutionCapabilities` | Pass | Pass | Pass | Pass | Pass | Non-wire publisher field is exact; no descriptor duplication. |
| Process runtime vs scoped manager | Pass | Pass | Pass | Pass | Pass | Shared process family and scoped lifecycle remain separate roles, not one loose base. |

## File Responsibility Mapping Verdict

| File / Area | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `compositions/build-studio-server.ts` | Pass | Pass | Pass | Pass | One Studio assembly root. |
| `compositions/build-standalone-application-server.ts` | Pass | Pass | Pass | Pass | One selected-app server configurator. |
| `application-platform/runtime/{application-platform-runtime,build-application-platform-runtime}.ts` | Pass | Pass | Pass | Pass | Separates runtime result from construction. |
| `agent-tools/mcp/agent-tools-mcp-runtime.ts` | Pass | Pass | Pass | Pass | Process protocol subsystem/lifecycle. |
| `agent-tools/mcp/scoped-agent-tool-mcp-session-manager.ts` | Pass | Pass | Pass | Pass | One scoped collection lifecycle. |
| `agent-execution/runtime/general-process-run-supervisor.ts` | Pass | Pass | Pass | Pass | General run-manager construction/release. |
| `application-platform/runtime/application-run-shutdown-coordinator.ts` | Pass | Pass | Pass | Pass | Ordered application run stopping only. |
| Bind-once publisher/handler files | Pass | Pass | Pass | Pass | One cycle seam each. |
| `create-application-{orchestration,run}-services.ts` | Pass | Pass | Pass | Pass | Named service construction sets; no `Authority` vocabulary. |
| `api/graphql/studio-application-api-services.ts` | Pass | Pass | Pass | Pass | Exact Studio API service configuration subject. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/compositions/` | Pass | Pass | Low | Pass | Assembly activity only; no returned `Composition` type. |
| `autobyteus-server-ts/src/application-platform/runtime/` | Pass | Pass | Low | Pass | Runtime result, builder, lifecycle seams, and shutdown coordination. |
| `autobyteus-server-ts/src/agent-tools/mcp/` | Pass | Pass | Low | Pass | Process MCP runtime and scoped session manager. |
| `autobyteus-server-ts/src/agent-execution/runtime/` | Pass | Pass | Low | Pass | General process run supervisor. |
| `autobyteus-server-ts/src/services/published-artifacts/` | Pass | Pass | Low | Pass | Publication publisher contract. |
| Mapped tests/docs | Pass | Pass | Low | Pass | Existing topology retained; names follow owned subjects. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Central `*Composition`, `*Graph`, `*Authority`, bind-once `*Port` symbols/files in exact map | Pass | Pass | Pass | Pass | Old symbols/files/imports/locals/exports/tests/docs are removed in one clean cut. |
| Root Studio builder/type export | Pass | Pass | Pass | Pass | Private root export is replaced, not aliased. |
| Old test filenames/descriptions | Pass | Pass | Pass | Pass | Four mapped tests are renamed; no duplicate old/new test. |
| Old docs/diagram vocabulary | Pass | Pass | Pass | Pass | Exact affected docs and verification search are named. |
| Unrelated abstract names | N/A | N/A | Pass | Pass | Intentionally outside bounded scope; no mechanical repository-wide rename. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Internal/private source names | No | Pass | Pass | No aliases, deprecated wrappers, duplicate files, or re-exports. |
| Root Studio builder/type export | No | Pass | Pass | Package is private and no supported repository consumer exists. |
| Runtime/wire/data contracts | No change | Pass | Pass | Routes, descriptors, manifests, environment keys, stores, and package artifacts retain current contracts. |
| Historical ticket evidence | N/A | Pass | Pass | Old names may remain only where clearly historical/current-to-target evidence requires them. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Application/platform databases and saved overrides | Not Affected / Directly Usable — No Migration | Pass | Pass | N/A | Pass | Source names do not enter schemas or persisted values. |
| Agent Tools sessions/descriptors | Not Affected | Pass | Pass | N/A | Pass | Internal field/type names change; wire shape and tokens do not. |
| Manifest/package/generated application bytes | Not Affected | Pass | Pass | N/A | Pass | Naming correction is server source/docs/tests only; canonical package parity remains required. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Callable/cycle-breaker rename cluster | Pass | Pass | Pass | Pass |
| MCP runtime/scoped manager/general supervisor/shutdown coordinator | Pass | Pass | Pass | Pass |
| Internal service builders and runtime type/builder | Pass | Pass | Pass | Pass |
| Studio/standalone server builders and private root export | Pass | Pass | Pass | Pass |
| Tests/docs/retired-name scan | Pass | Pass | Pass | Pass |
| Proportional regression and escalation | Pass | Pass | Pass | Pass |

Sequence 9 renames from narrow dependencies outward so TypeScript and mapped tests expose incomplete imports before server entrypoints change. It explicitly prohibits constructor rewiring, object replacement, aliases, copied tests/files, and unrelated renames.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Role vocabulary | Yes | Pass | Pass | Pass | Each role noun has use/do-not-use/examples. |
| Exact name/file migration | Yes | Pass | Pass | Pass | Map includes responsibility, scope, lifecycle, and contract impact. |
| `StudioServer` result | Yes | Pass | Pass | Pass | Exact TypeScript shape and listen owner are shown. |
| Runtime dependency wiring | Yes | Pass | Pass | Pass | Diagram distinguishes process MCP runtime, application runtime, scoped manager, run, and lifecycle. |
| Runtime build vs run creation | Yes | Pass | Pass | Pass | Construction example plus SV-C44 make the timing invariant explicit. |
| Clean rename sequence | Yes | Pass | Pass | Pass | Dependency-ordered sequence and retired-name verification are concrete. |

## Material Premise Validation

### `MP-ARCH-009-001` — a supported consumer requires compatibility with the old Studio builder/type export

- Related approved requirement or established contract: REQ-009 / AC-018 clean source vocabulary; package publication/support boundary
- Relevant behavior ID(s): BEH-009
- Initiating basis kind: `Contract`
- Independent product-supported initiating trigger or applicable governing contract: a supported project imports `buildStudioServerComposition` or `StudioServerComposition` from the server package root.
- Support evidence: `autobyteus-server-ts/package.json` declares `private: true`; repository-wide import search finds the old builder/type only inside `autobyteus-server-ts`. The devkit is a workspace consumer of the package but imports unaffected standalone start/validation exports. No requirement, module/developer document, wire contract, package artifact, or public distribution contract exposes the Studio builder/type to supported third-party consumers.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: None. The existing product server entry uses the builder internally; no supported external caller path reaches the export.
- Lifecycle preconditions and material consequence at the claimed point: an undocumented local consumer could mechanically exist outside the repository, but it is not part of the private package's supported contract and cannot establish a compatibility requirement.
- Reachability: `Not Reachable`
- Review consequence / proportionate response: do not retain an alias or deprecated wrapper. Cleanly replace the private root export. If a supported consumer is newly evidenced during implementation, stop and return Design Impact rather than inventing compatibility locally.

## Unresolved Approved-Behavior Or Current-State Gaps

None. `APIE2E-REPO-005` remains a separate unattributed diagnostic and does not affect this naming design.

## Review Decision

`Pass`

SR-011 resolves CR-018 at design level. The role vocabulary is small, internally coherent, and applied through an exact current-to-target map. The no-alias decision is supported by the private package and verified consumer graph. The design explicitly preserves instance identity, execution triggers, recovery, readiness, shutdown, routes, data, and package behavior, while its dependency-ordered implementation and regression plan are actionable.

## Findings

None.

## Classification

N/A — Pass.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

1. A mechanical rename can accidentally reconstruct an object or change constructor/close ordering; source review must compare exact instance identity and lifecycle sequences with the functional baseline.
2. The retired-name scan must distinguish legitimate historical ticket evidence from production source, exports, tests, and current docs; historical records should not be rewritten.
3. `buildApplicationPlatformRuntime` needs durable proof of zero new agent/team runs at construction, plus retained business-demand creation and recorded-run recovery coverage.
4. `AgentToolsMcpRuntime`, `ScopedAgentToolMcpSessionManager`, publisher binding, general supervisor, and shutdown coordinator require exact identity/revoke/close regression coverage after imports move.
5. Affected server/web/devkit/developer docs must use the same scope/lifetime vocabulary and continue to distinguish internal `/mcp/agent-tools/:sessionId` from Studio-only `/mcp/gateway`.
6. Code review should choose the proportional runtime rerun; focused dual-host start/run/publication/handoff/stop is expected, with broader API/E2E only if source changes are not behavior-neutral.
7. The task branch remains behind tracked `origin/personal`; delivery retains final refresh/integration ownership.
8. `APIE2E-REPO-005` remains separately `Unclear` and must not broaden this change.

## Latest Authoritative Result

- Review Decision: `Pass`
- Current Architecture Review Revision: `ARCH-REV-009`
- Reviewed Solution Revision: `SR-011`
- Material-Premise Gate: `Pass` (`MP-ARCH-009-001` is `Not Reachable` and therefore does not justify compatibility machinery)
- Notes: Functional architecture remains passed through `ARCH-REV-008`, `IR-015`, `CRR-026`, `API-REV-010`, and `CRR-027`. ARCH-REV-009 approves only the bounded behavior-neutral vocabulary correction; implementation may resume through full source review and proportionate executable validation.
