# Requirements Doc

## Status

`Design-ready` — approved by the user on 2026-08-26 as one provider-composition ticket that includes the Agent Tools MCP authority/descriptor boundary.

## Goal / Problem Statement

Make provider construction and Agent Tools MCP capability issuance explicit at the two supported execution roots, and complete that boundary through Root Team task identity, provider-bound context input, and Agent-run resource assembly. Preserve the passed `ApplicationExecutionScope` and separate `GeneralProcessRunSupervisor`, while removing mixed-level dependencies, positional/default global selection, duplicated policy, and partial tuple-based kernel assembly.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Studio and standalone create process Agent Tools routes and separate general/application session managers. | One process-owned `AgentToolsMcpHost` owns routes; it creates one explicit scoped authority for each execution family. | Same route, authentication, tool catalog, configured tools, publication/task capabilities, and route lifecycle. | REQ-001, REQ-002; AC-001–AC-003 |
| BEH-002 | General and application roots independently construct AutoByteus, Codex, and Claude factories, including positional `undefined` values that select defaults. Root Team task identity and provider context-file ownership can still fall through to process execution getters below those roots. | Both roots call one immutable, named provider-factory builder and explicitly construct one complete execution family: run resources, provider-input normalization, Agent identity allocation, Root Team task identity, managers, and sessions all use the same family-owned graph. | General/application managers, sessions, task roots, cleanup, and mutable state remain non-identical. | REQ-003, REQ-004; AC-004, AC-005 |
| BEH-003 | Codex/Claude internals receive the broad session-manager abstraction and translate issued descriptors to provider configuration. AutoByteus, Codex, and Claude also resolve the same context-file locator independently, with provider-local defaults that can select the process Team manager. | Provider code receives only a narrow MCP issuer. `AgentRun` performs one execution-family-bound, provider-neutral context-file normalization immediately before backend dispatch, and provider adapters only format the already-normalized input. | Codex creates sessions during bootstrap; Claude retains lazy first-query issuance and retry semantics; absolute, relative, remote, data, missing, finalized context-file, and external-run command-observer persistence behavior remains unchanged. | REQ-005; AC-005–AC-007 |
| BEH-004 | A post-issuance Codex create/restore failure can release a run claim without immediate per-run MCP revocation. | Failed Agent-run preparation revokes all sessions for the claimed run before the claim is completed; cleanup errors remain visible/quarantined. | Successful-run termination and scope close still revoke exactly owned resources. | REQ-006; AC-008, AC-009 |
| BEH-005 | `ApplicationExecutionScope.create` builds a partial `BuiltKernel`, captures a later non-null session manager, returns a tuple, and calls an eight-argument constructor. `AgentRunManager` can also manufacture an activation/resource graph through optional sidecar defaults. | One private kernel builder and the general supervisor each construct one complete named execution family. `AgentRunManager` receives its activation registry, recorder, provider-input normalizer, provider factories, and run-session releaser as required identities; it no longer assembles missing infrastructure. | Scope capabilities, OPEN/QUIESCED/CLOSED behavior, Team-before-Agent stop order, and outer platform lifecycle remain unchanged. | REQ-007; AC-005, AC-010, AC-011 |
| BEH-006 | Current product and persisted contracts contain no provider-composition representation. | Structural replacement only. | Routes, GraphQL/REST/WS, SDKs, packages, database/schema, launch configuration, events, recovery/reentry, and user-visible behavior remain byte/semantically unchanged. | REQ-008; AC-012 |

## Investigation Findings

- `ApplicationExecutionScope.create` and `GeneralProcessRunSupervisor` duplicate provider-specific construction and select constructor defaults with positional `undefined`.
- `AgentToolsMcpRuntime` mixes process route/catalog ownership with execution-family session creation. The trusted capability ledger has a distinct lifecycle and should be an authority created by the host.
- Provider execution needs issuance, not route infrastructure or broad revocation/close controls. Issuance returns a provider-neutral descriptor; existing provider adapters already perform the next translation.
- Codex issues its MCP session before later skill materialization and thread creation. A supported later failure therefore establishes a reachable immediate-cleanup obligation.
- The passed execution-scope outer capability boundary remains sound; only its private assembly needs tightening.
- CRR-003 proves two deeper supported paths that the prior source review stopped before: application `delegate_task` reacquires process Agent identity below `RootTeamRun`, and provider context-file mapping reacquires process Team ownership below Claude/Codex. The same mandatory AutoByteus input processor has the analogous default resolver. These are execution-family closure gaps, not reasons to unify managers.
- The three governed direct `AgentRunManager` integration fixtures expose a separate transition gap: supported roots already pass explicit activation/resource infrastructure, while the tests still select the manager's optional sidecar defaults. The clean target makes the manager input complete and supplies explicit test infrastructure.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `provider-composition-and-agent-tools-authority-contract.md` | Normative contracts, ownership, identities, and lifecycle | REQ-001–REQ-007 | AC-001–AC-011 | Approved with requirements | Exact implementation boundary |
| `provider-composition-transition-inventory.md` | Exact production/test transition and proof inventory | REQ-001–REQ-008 | AC-001–AC-012 | Design context; N/A approval | Closes implementation surface |

## Design Health Assessment (Mandatory)

- Change posture: `Refactor`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`, `Duplicated Policy Or Coordination`, and `File Placement Or Responsibility Drift`
- Refactor posture: `Required`
- Evidence basis: both supported execution roots depend on provider internals and repeat default selection; `AgentToolsMcpRuntime` crosses process-host and scoped-capability lifecycles; scope construction exposes partial/positional assembly.
- Requirement or scope impact: behavior-neutral structural hardening only; no new product capability or data contract.

## Recommendations

Adopt the clean-cut Host -> scoped Authority -> narrow Issuer -> issued descriptor boundary and one explicit provider-factory builder. Replace, rather than wrap, the old mixed-level manager/runtime shapes. Use a private scope-kernel builder for construction/unwind.

## Scope Classification

`Large` — both execution roots, three provider families, scoped MCP capability lifecycle, construction unwind, and focused architecture/tests change, while public behavior remains fixed.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Studio boot constructs one process MCP host, one general execution family, and one application scope.
- UC-002: standalone boot constructs the same ownership pattern for the selected application.
- UC-003: AutoByteus/Codex/Claude Agent create or restore receives the exact execution-local MCP issuer.
- UC-004: post-issuance provider preparation failure immediately revokes the claimed run's sessions.
- UC-005: application execution-scope construction succeeds or unwinds only created resources in reverse order.
- UC-006: host and scope quiesce/close preserve current admission and cleanup order.
- UC-007: application and general Root Team `delegate_task` allocate Agent/task-Team identities only through their own execution-family capability.
- UC-008: application and general Agent input resolves finalized context-file locators through the exact execution-family durable Team tree before provider dispatch, with no provider-local Team-manager lookup.
- UC-009: context-file upload finalization and reads resolve Team-member ownership from the explicit stored V2 projection at process REST registration, with no mutable general/application Team-manager selection.

### Out of Scope

- Logical application-agent addressing, `target.kind`, Team-member `agentRunId`, or application-role `runtimeKind` changes.
- Per-mounted-application execution scopes, manager maps, execution owner unification, routes/protocol/schema/package changes, provider behavior changes, deployment, or new migration policy.
- Repository-wide removal of unrelated provider-local defaults. The in-scope AutoByteus/Codex/Claude context-file defaults and `AgentRunManager` activation/resource defaults are removed because they sit on the supported execution spine; unrelated low-level provider defaults remain governed outside supported roots.

### Preserved Behavior Boundary

BEH-001–BEH-006 are fixed. In particular, general and application execution remain separate, `RootTeamRun` remains the sole task lifecycle/state/persistence/event owner, application/public definitions remain canonical, and all passed Studio/standalone execution, publication, streaming, recovery, reentry, nested-Team, context-file, and shutdown behavior remains valid.

### Review Authority

- A blocking finding must cite REQ-001–REQ-008, AC-001–AC-012, or BEH-001–BEH-006.
- A new public feature, migration, threat model, provider policy, or execution multiplicity is a Requirement Gap.
- Logical addressing remains a separate approved ticket and cannot be bundled here.

## Functional Requirements

- **REQ-001:** One `AgentToolsMcpHost` shall own the process endpoint registry, catalog, dispatcher, route dependencies, and host close lifecycle; it shall not own execution managers or publication policy.
- **REQ-002:** The host shall create named `ScopedAgentToolMcpSessionAuthority` instances. Each authority shall own one execution-family identity/capability ledger, readiness, admission blocking, run/owner revocation, and idempotent close, and expose a narrower `AgentToolMcpSessionIssuer` to provider execution.
- **REQ-003:** One process-composed immutable `AgentProviderFactoryBuilder` shall be injected into both `GeneralProcessRunSupervisor` and `ApplicationExecutionScope`; neither root may construct provider-specific backends or select globals/defaults positionally.
- **REQ-004:** Each builder call shall create fresh backend factories and execution-local provider session state while explicitly reusing only named process-owned immutable dependencies. Each execution owner shall additionally supply the exact Team memory root, one exact Agent identity allocator, and its derived task-Team identity factory through `AgentTeamRunManager -> RootTeamRun -> TaskDelegationService`; the two execution families shall remain non-identical and neither task path may select a process getter.
- **REQ-005:** Codex and Claude provider internals shall depend on the issuer (or a provider-specific configuration derived from its issued descriptor), never the host, scoped authority, route registry, or broad session manager. Provider-neutral finalized context-file locator normalization shall occur once at the `AgentRun` command boundary through an exact execution-root-supplied normalizer built from explicit application-data, memory, configured-origin, and stored Team-tree inputs; AutoByteus, Codex, and Claude shall not construct or rediscover a Team/context owner below that boundary, and their provider-specific formatting behavior shall remain unchanged. The process context-file REST composition shall use the same explicit-root/stored-tree owner model for upload finalization and reads rather than a default process Team manager, while preserving the existing route contract.
- **REQ-006:** The Agent-run preparation owner shall revoke sessions for the claimed run on create/restore failure, including failures after issuance and before activation-resource attachment. Cleanup failure shall be aggregated and preserve the existing quarantine/failure authority.
- **REQ-007:** A private application-execution kernel builder shall own complete ordered assembly and partial reverse unwind, returning one complete named kernel to `ApplicationExecutionScope`; the general supervisor shall construct the corresponding complete general resource/activation graph. `AgentRunManager` shall require, not infer, its activation registry, memory recorder, provider-input normalizer, three provider factories, and run-session releaser. Both execution roots shall receive explicit `memoryDir` plus a narrow immutable context-path environment rather than broad AppConfig; AppConfig selection remains at host/process REST composition edges. No tuple, optional partial kernel, later binding, sidecar default, or non-null assertion is permitted.
- **REQ-008:** This refactor shall preserve all public/wire/persisted/package behavior and shall use clean-cut removal without aliases, generic DI/service locators, optional dependency dictionaries, manager maps, or mutable-owner unification.

## Acceptance Criteria

- **AC-001:** Studio and standalone expose the same existing Agent Tools MCP routes/tools, with one shared process host and distinct general/application scoped authorities.
- **AC-002:** Closing one scoped authority revokes only its sessions and leaves the host plus the other execution family usable until their own lifecycle closes.
- **AC-003:** Host close clears process route/session infrastructure only after both execution families have closed; repeated close is safe.
- **AC-004:** Both roots receive the same provider builder identity; two builder calls return non-identical backend factories and bind them to the exact supplied issuer and definition service. Each root also carries its explicit Team memory root and one non-identical Agent/task-Team identity capability through its Team manager into every created/restored `RootTeamRun`.
- **AC-005:** Architecture proof rejects provider-specific constructors, positional `undefined` defaults, ambient execution/config getters, provider-local context-owner construction, incomplete `AgentRunManager` inputs, and raw MCP host/authority dependencies on supported execution, Root Team task, provider-input, and process context-file REST paths. Context-file layout, local-path resolver, owner resolver, finalization, and read construction must receive their exact roots/read model explicitly at the governing composition edge.
- **AC-006:** Codex issuance produces `IssuedAgentToolMcpSession -> AgentToolMcpDescriptor -> CodexAgentToolsMcpConfig` without exposing revocation or host internals below the run owner.
- **AC-007:** Claude lazy issuance occurs once per active provider session, retains the issued descriptor across supported retry, and revokes through run/scope lifecycle.
- **AC-008:** A Codex create/restore failure after issuance revokes the claimed run exactly once before claim cleanup completes.
- **AC-009:** If provider failure and revocation both fail, the caller receives aggregate failure evidence and the claim remains in the existing safe/quarantined outcome.
- **AC-010:** Scope construction cut-point tests prove reverse cleanup for every acquired closeable resource and no cleanup for resources not yet created.
- **AC-011:** Successful scope quiesce/close remains idempotent, blocks new issuance/work, stops Teams before Agents, revokes sessions/resources, and preserves outer platform close order.
- **AC-012:** Focused and realistic Studio/standalone tests show no route, protocol, persistence, package, run, Team, task, context-file, streaming, publication, recovery, reentry, or shutdown regression. The exact eight CRR-003 failing files pass without initializing unrelated process managers; application and general delegation/context inputs prove non-identical family identity, and provider-copy tests prove the original admitted/observed message is unchanged.

## Constraints / Dependencies

- Base: finalized ApplicationExecutionScope commit `0811503a6c547698e7b77e1064d98890101acc1b`.
- Canonical process infrastructure and Agent/Team definition services remain explicitly injected.
- The exact RootTeamRun-local task command/lifecycle spine must remain authoritative; this refactor may only replace its hidden identity default with the root's required execution-family capability.
- Existing provider adapters/materializers should be reused and tightened, not duplicated.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: all existing application, run, Team, package, and provider stores.
- Required outcome: `Not Affected`.
- Existing data: read and written exactly as before; no type is serialized by this new composition boundary.
- Unacceptable data loss or corruption: any rewrite or changed persisted semantics.
- Rollout constraints: none beyond ordinary code deployment.
- Related IDs: REQ-008, AC-012.

## Assumptions

- The finalized scope behavior is the authoritative baseline.
- Provider-specific factories are safe to create per execution family; their named process dependencies are shareable where current code already treats them as process infrastructure.
- Immediate failed-preparation revocation is idempotent with later resource cleanup.

## Risks / Open Questions

- The SR-006 normative supplements close the exact file, constructor-provenance, construction-phase, Mixed Team manager-construction, root-to-member identity, task-identity, provider-input, complete-manager, and occurrence inventories. Any newly discovered affected path or closeable remains Design Impact; implementation may not improvise an alias, default, cached factory, optional callback, or generic escape hatch.
- Implementation must prove the precise Codex/Claude issuance timing; it may not broaden the issuer back into a manager to avoid that proof.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001–REQ-004 | UC-001, UC-002, UC-003, UC-007 |
| REQ-005 | UC-003, UC-008, UC-009 |
| REQ-006 | UC-004 |
| REQ-007 | UC-005, UC-006, UC-008, UC-009 |
| REQ-008 | UC-001–UC-009 |

## Acceptance-Criteria-To-Scenario Intent

| Criteria | Scenario Intent |
| --- | --- |
| AC-001–AC-005 | construction, task identity, provider-input ownership, isolation, and architecture-boundary proof |
| AC-006–AC-009 | provider issuance/adaptation/failure-unwind proof |
| AC-010–AC-011 | kernel construction and runtime lifecycle proof |
| AC-012 | preserved dual-host behavior/regression matrix |

## Approval Status

Approved by the user on 2026-08-26. The user explicitly directed that the MCP authority/descriptor refinement be completed inside this provider-composition ticket and that the separate logical-addressing ticket follow afterward.
