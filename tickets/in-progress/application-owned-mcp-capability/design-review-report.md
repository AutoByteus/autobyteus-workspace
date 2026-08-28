# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/requirements.md`
- Upstream Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/investigation-notes.md`
- Reviewed Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/application-owned-mcp-intended-behavior.md`
- Solution Revision Record Reviewed: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`–`SR-008`
- Architecture Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/architecture-review-revision-record.md`
- Triggering Downstream Artifacts Reviewed: `implementation-handoff.md`; `implementation-revision-record.md` (`IR-001`–`IR-004`); `code-review-report.md`; `code-review-revision-record.md` (`CRR-001`–`CRR-007`); `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; `api-e2e-revision-record.md` (`API-REV-001`–`API-REV-003`); `api-e2e-test-review-report.md`; `api-e2e-agent-ui-proof-gap.md`; retained `api-e2e-evidence/api-rev-002/` and `api-e2e-evidence/api-rev-003/`; and delivery pause artifacts through `delivery-revision-record.md` (`DR-002`). All ticket artifacts are under `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/`.
- Current Architecture Review Revision ID: `ARCH-REV-008`
- Current Review Round: `8`
- Trigger: `SR-008` correction of reopened `CR-DI-002` after `API-REV-003` and `CRR-007` established reachable premise `CR-MP-002` at the maintained Luna model-facing file-operation boundary.
- Prior Review Round Reviewed: Round 7 / `ARCH-REV-007` / `Pass`; `IR-004` and `CRR-006` then passed source review, but `API-REV-003` reproduced the actual browser failure twice at 88.6%, and `CRR-007` reopened `CR-DI-002` because normalized `edit_file` evidence had been prescribed as though it were Luna's model-facing operation name.
- Latest Authoritative Round: `8`
- Current-State Evidence Basis: approved requirements SHA-256 `aa062e2d6bc16d84f175a0d08df99f4ceeb2b5f5164f8232d962de4047405a54`; approved supplement SHA-256 `076767eed75df8e867c01db3b5bf7da600050fc315d3cebd3b9cce4edd225c12`; SR-008 design SHA-256 `cd5636ca1b9a63ec0bea4023df1b2bca1c5006d25cfbb4d0fc717ffcc41ed83c`; two supported `API-REV-003` browser launches with exact member traces, identity join, database/browser evidence, and native-edit failure analysis; `CRR-007` and its exact current Codex/Luna diagnostic; and direct reads of the Codex item-family parser/converter, file-change lifecycle mapping, maintained configs/prompts, Team/launch surfaces, publication resolver, reconciliation, and browser projection. The review remained spine-first: the browser-to-UI span now names the model instruction, provider protocol event, and platform-normalized evidence as three separate boundaries before judging ownership and dependency direction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: `Yes`
- Relevant existing behavior and evidence confirmed: `Yes`
- Scope guardrail confirmed: `Yes`
- Approved change, preserved behavior, and outside scope understood: `Yes`
- Every prospective blocking `Design Impact` finding is traceable to approved authority: `Yes`
- Remaining material ambiguity, if any: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass | Pass | Confirmed | None |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | SR-005 now reserves every catalog-registered static name at readiness and defensive MCP composition while preserving the separate configured-MCP-versus-static policy. |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | Native advertisement and raw invocation now have separate explicit owners while every runtime reaches the same gateway semantics. |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | Common strict Ajv receives the original argument object before worker dispatch. |
| BEH-005 | Operational | Pass | Pass | Pass | Confirmed | `SR-003` now spans and owns the real package/reentry lifecycle. |
| BEH-006 | Contract | Pass | Pass | Pass | Confirmed | None |
| BEH-007 | System | Pass | Pass | Pass | Confirmed | Preserve automatic native/Team exposure exactly as designed. |
| BEH-008 | User/System | Pass | Pass | Pass | Confirmed | The corrected path is explicit and evidence-backed: context first -> Luna built-in `apply_patch` instruction -> Codex `item/fileChange` / `file_change` -> AutoByteus normalized `edit_file` evidence -> member-relative publication/full handoff -> final patch/publication -> reconciliation/UI. None of the three file-operation names becomes a routed tool, and the read-only causality boundary remains unchanged. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `application-owned-mcp-intended-behavior.md` | Pass | Pass | Pass | Pass | Pass | None |

The supplement inventory remains canonical in the investigation notes and linked from both core artifacts. Its approval applicability, read-only Option A causality boundary, three-interface provider correction, proof ownership, and relationship to REQ-018–REQ-021 / AC-032–AC-039 are explicit and consistent with SR-008.

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design `Task Design Health Assessment` covers the implemented platform capability, the approved maintained demonstration, and the post-`API-REV-003` provider-interface correction. | None |
| Root-cause classification is explicit and evidence-backed | Pass | `API-REV-003` and `CRR-007` establish interface naming/boundary conflation: SR-007 used the platform's normalized `edit_file` observability label as Luna prompt vocabulary. Exact current evidence distinguishes Luna built-in `apply_patch`, Codex `fileChange`, and AutoByteus normalization. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Focused prompt/Team/launch and proportionate contract-test correction is required now; provider composition, event parser/converter semantics, application-tool architecture, publication, reconciliation, GraphQL, and UI remain unchanged. A generic `apply_patch` API/alias, provider adapter, runtime switch, shell fallback, or proof aggregate is rejected. | None |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Spines, owners, interfaces, dependencies, files, removals, transitions, and sequence are concrete. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Declaration/readiness | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Runtime exposure | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Route-bound invocation entry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Gateway-to-worker invocation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Result/error return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Package/application catalog transition | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Platform shutdown | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-008 | Strict contract rebuild | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-009 | Call admission/drain | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-010 | Worker-local handler dispatch | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-011 | Catalog-transition serialization | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-012 | Native raw application-tool preparation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-013 | Maintained real Agent-to-publication-to-UI journey | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-014 | Agent-call/result-to-browser evidence return/join | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

`DS-013` is stretched from the supported Brief Studio browser action through GraphQL launch, actual Codex/Luna Team roles, the read-only application call, model-facing built-in `apply_patch`, Codex protocol `fileChange`, AutoByteus normalized `edit_file`, member-workspace-relative publication, complete Team handoff, writer patch/final publication, reconciliation, notification refresh, and the exact same-browser detail outcome. `DS-014` separately joins prompt/source contract, application call/result, provider event, normalized lifecycle, Team message/binding, workspace path resolution, artifact revision/projection, and browser fields by authoritative IDs. The role reacts only to context and provider-reported patch/publication/handoff results; hidden protocol/normalized evidence is independently required by verification and is never a backward dependency of the role. DS-001–DS-012 remain coherent and unchanged. The full spans expose the actual interfaces and keep registry, shell, internal-trace, logging, and cross-workspace shortcuts out of production behavior.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpCatalog` static namespace and route composition | Pass | Pass | Pass | Pass | The catalog owns all registered static names and keeps active/configured-protected views internal to their distinct route concerns. |
| `AgentToolsMcpHost.staticAdapterToolNames` | Pass | Pass | Pass | Pass | The host exposes only a complete immutable names snapshot; adapter objects, availability, and configured policy do not cross the boundary. |
| `ApplicationDefinitionRuntimeReadiness` | Pass | Pass | Pass | Pass | Readiness owns application diagnostics and compares every declaration with the complete static namespace. |
| `ApplicationAgentToolCapability` | Pass | Pass | Pass | Pass | The sealed application-only port is coherent and does not become a locator. |
| `ApplicationAgentToolGateway.invoke` | Pass | Pass | Pass | Pass | It remains the intended authoritative admission/validation/dispatch boundary. |
| `ApplicationRunOwnershipService.requireLiveApplicationToolProducer` | Pass | Pass | Pass | Pass | Compound standalone/Team identity remains behind the existing owner. |
| `ApplicationAgentToolWorkerInvoker` | Pass | Pass | Pass | Pass | Worker state/start policy stays behind one boundary. |
| `ApplicationAgentToolNativeSchemaProjector` | Pass | Pass | Pass | Pass | The narrowed declaration schema now round-trips fail closed. |
| Native bound `ApplicationAgentTool` preparation | Pass | Pass | Pass | Pass | The application-only override owns agent binding, abort/mode preservation, and raw-object forwarding; generic coercion stays outside this subject. |
| `ApplicationCatalogTransitionService` | Pass | Pass | Pass | Pass | Sole live package/application catalog-transition entry with derived participants and staged commits. |
| Revised `ApplicationReentryService` | Pass | Pass | Pass | Pass | Owns participant lifecycle only; catalog mutation is removed. |
| `ApplicationBackendHost.invokeAgentTool` | Pass | Pass | Pass | Pass | Handler lookup/context/result validation remain worker-owned. |
| Maintained researcher/writer `agent.md` | Pass | Pass | Pass | Pass | Each role-local prompt owns first-call/result use, model-facing built-in `apply_patch`, provider-reported failure handling, no-shell behavior, relative publication, handoff production/consumption, and failure stop; config, Team, and launch text only reinforce it. |
| Brief Studio `getBriefContext` | Pass | Pass | Pass | Pass | Owns one binding-derived read and the canonical marker; it cannot accept routing identity or reach write/projection/UI owners. |
| Luna built-in `apply_patch` instruction | Pass | Pass | Pass | Pass | The maintained role prompt names the fixed provider/model's current built-in patch operation. It is neither selected/routed nor generalized into an AutoByteus API. |
| Codex `item/fileChange` / `file_change` protocol | Pass | Pass | Pass | Pass | Codex owns native patch execution and its protocol event family; it receives no Brief-specific provider-composition change. |
| AutoByteus Codex event normalization | Pass | Pass | Pass | Pass | Existing parser/converter alone maps provider `fileChange` to normalized `edit_file` segment/lifecycle evidence; the label does not flow backward into prompt or config. |
| Team message handoff | Pass | Pass | Pass | Pass | Existing messaging owns the bounded complete research body and exact marker/path transfer; it does not become durable artifact storage or routing authority. |
| Published-artifact path/publication boundary | Pass | Pass | Pass | Pass | Existing run context resolves each relative path against the exact member workspace before snapshot/publication; it does not create files or infer application identity from model text. |
| Existing Agent run trace and Team binding | Pass | Pass | Pass | Pass | Trace owns paired call/result under `agentRunId`; binding independently owns application/binding/member identity. Neither becomes a duplicate application audit log. |
| `BriefArtifactReconciliationService` and detail UI | Pass | Pass | Pass | Pass | Existing publication projection remains the only business-state mutation owner; GraphQL/UI remain presentation readers. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK contract and bundle parser | Pass | Pass | Pass | Pass | Static, import-safe, and server-independent. |
| Static providers -> MCP catalog -> host names snapshot -> application readiness | Pass | Pass | Pass | Pass | Only the complete immutable name set crosses subsystems; readiness/native code does not import catalog providers, availability, adapters, or configured collision policy. |
| MCP catalog route composition | Pass | Pass | Pass | Pass | Registered-static rejection governs application routes; active/protected views govern the separate no-application configured-MCP branch. Neither policy substitutes for the other. |
| Capability and MCP adapter | Pass | Pass | Pass | Pass | Transport depends on the capability, not gateway internals. |
| Native schema projector | Pass | Pass | Pass | Pass | One checked dependency on unchanged mapper/model. |
| Native bound tool -> capability/gateway | Pass | Pass | Pass | Pass | The adapter explicitly bypasses generic preparation for invocation and forwards the same object to the capability; checked `ParameterSchema` remains advertisement-only. |
| Gateway -> ownership/lifecycle/validator/worker invoker | Pass | Pass | Pass | Pass | Dependencies follow explicit owners. |
| Package command -> catalog transition | Pass | Pass | Pass | Pass | Command-owned source mutation is passed through an explicit transition operation; live catalogs/lifecycle stay encapsulated. |
| Catalog transition -> staging/reentry/readiness | Pass | Pass | Pass | Pass | Target slice, participant tokens, and no-throw prepared commits are explicit. |
| General vs application execution families | Pass | Pass | Pass | Pass | Capability remains application-scope-only. |
| Role config/prompt -> routed application/collaboration/publication tools | Pass | Pass | Pass | Pass | Config lists only routes the Codex MCP composition actually supplies. It lists none of `read_file`, `write_file`, `apply_patch`, or `edit_file`; prompts do not receive or invent application route identity. |
| Role prompt -> Luna built-in `apply_patch` | Pass | Pass | Pass | Pass | Prompt text depends only on the current fixed provider/model instruction and provider-reported outcome. It neither represents the operation as routed exposure nor consumes internal trace evidence. |
| Luna patch execution -> Codex `fileChange` | Pass | Pass | Pass | Pass | Codex owns workspace mutation and native protocol reporting. No MCP/catalog/dynamic registration or `run_bash` shortcut is added. |
| Codex `fileChange` -> AutoByteus normalized `edit_file` evidence | Pass | Pass | Pass | Pass | Existing event conversion is one-way observability. Verification consumes it under the member run; prompt/config and publication do not import or query the converter. |
| Researcher -> Team message -> writer | Pass | Pass | Pass | Pass | The exact marker/path and complete bounded body cross the existing collaboration boundary; the writer consumes that body without a cross-member file read. |
| Role -> `publish_artifacts` -> member workspace resolver | Pass | Pass | Pass | Pass | Canonical relative paths are resolved from authoritative run context. A write return value or prompt-supplied absolute path is not an identity dependency. |
| `getBriefContext` -> Brief read repositories | Pass | Pass | Pass | Pass | Binding-derived read dependencies are allowed; artifact reconciliation, brief writes, GraphQL, and frontend imports/calls are explicitly forbidden. |
| Published artifact -> reconciliation -> notification/GraphQL/UI | Pass | Pass | Pass | Pass | The existing application write/presentation direction remains authoritative; the read-only tool does not bypass it. |
| Evidence reader -> trace + binding + artifact/projection + DOM | Pass | Pass | Pass | Pass | Verification reads existing authorities and joins exact IDs; no new production aggregate, process-wide payload log, or routing dependency is introduced. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentToolMcpCatalog.listStaticAdapterToolNames()` | Pass | Pass | Pass | Low | Pass |
| `AgentToolsMcpHost.staticAdapterToolNames` | Pass | Pass | Pass | Low | Pass |
| `AgentToolMcpCatalog.resolveRuntimeSessionToolExposure(context)` | Pass | Pass | Pass | Medium | Pass |
| `parseApplicationAgentToolDeclarations` | Pass | Pass | Pass | Low | Pass |
| `ApplicationAgentToolCapability.resolveSelectedRoutes/invoke` | Pass | Pass | Pass | Low | Pass |
| `ApplicationAgentToolNativeSchemaProjector.project` | Pass | Pass | Pass | Low | Pass |
| Native `ApplicationAgentTool.prepareExecution/execute` behavior | Pass | Pass | Pass | Low | Pass |
| `ApplicationAgentToolGateway.invoke` | Pass | Pass | Pass | Low | Pass |
| Ownership query / worker invoker | Pass | Pass | Pass | Low | Pass |
| `runPackageTransition` operation contract | Pass | Pass | Pass | Medium | Pass |
| `reloadAndReenter(applicationId)` | Pass | Pass | Pass | Low | Pass |
| `prepareParticipants/recoverParticipants/quarantineParticipants` | Pass | Pass | Pass | Low | Pass |
| Bundle/tool prepared slice APIs | Pass | Pass | Pass | Low | Pass |
| Brief Studio `getBriefContext(_input, context)` | Pass | Pass | Pass | Low | Pass |
| Maintained role-local `agent.md` sequences | Pass | Pass | Pass | Low | Pass |
| Luna model-facing built-in `apply_patch` instruction | Pass | Pass | Pass | Low | Pass |
| Codex `item/fileChange` / `file_change` protocol event | Pass | Pass | Pass | Low | Pass |
| `CodexItemEventPayloadParser` / `CodexItemEventConverter` normalized `edit_file` lifecycle | Pass | Pass | Pass | Low | Pass |
| `send_message_to` complete research handoff | Pass | Pass | Pass | Low | Pass |
| `publish_artifacts({path: workspaceRelativePath})` | Pass | Pass | Pass | Low | Pass |
| `BriefRunLaunchService.launchDraftRun(briefId)` | Pass | Pass | Pass | Low | Pass |
| `BriefArtifactReconciliationService` published-revision handling | Pass | Pass | Pass | Low | Pass |
| Existing Agent run-history reader/recorder | Pass | Pass | Pass | Low | Pass |
| Existing Brief detail/diagnostics GraphQL and renderer | Pass | Pass | Pass | Low | Pass |

The interfaces retain singular subjects. The handler returns one read snapshot/marker; prompts own ordered model-facing behavior and name built-in `apply_patch`; Codex owns native file mutation and `fileChange`; AutoByteus event conversion owns normalized `edit_file` evidence; Team messaging owns the bounded inter-member body; publication owns run-context path resolution and snapshots; reconciliation owns business projection; trace/UI retain recording/presentation. Neither `apply_patch` nor `edit_file` enters routed selection, the role is not asked to inspect hidden evidence, and the Agent-to-UI join remains verification-only. Earlier collision and native-preparation interfaces are unchanged.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared authenticated MCP transport and static adapter catalog | Pass | Pass | N/A | Pass | Extend the existing host/catalog and export only the complete names snapshot needed by readiness. |
| Runtime exposure | Pass | Pass | Pass | Pass | Two projections over one capability are appropriate. |
| Native `BaseTool` projection | Pass | Pass | Pass | Pass | Reuse is limited deliberately: checked schema advertisement and inherited execution remain, while the application-only preparation override excludes generic coercion/validation. |
| Package declaration / worker handlers | Pass | Pass | N/A | Pass | Existing owners are extended. |
| Binding/run authorization | Pass | Pass | N/A | Pass | Existing ownership service is reused. |
| Worker request path | Pass | Pass | N/A | Pass | Existing completion-coupled boundary is extended. |
| Catalog transition / reentry / bundle | Pass | Pass | Pass | Pass | Clean replacement is proportionate and now actionable. |
| Durable storage | Pass | Pass | N/A | Pass | No new durable owner is needed. |
| Role-local maintained behavior | Pass | Pass | N/A | Pass | Extend the two existing role prompts and correct their selected routed names; shared Team/launch text remain supporting surfaces rather than a platform policy. |
| Provider-facing file creation and evidence | Pass | Pass | N/A | Pass | Reuse Luna built-in `apply_patch`, Codex `fileChange`, and existing AutoByteus normalization as three distinct existing surfaces; do not add an alias, provider-wide adapter, or configured/MCP exposure. |
| Cross-member research input | Pass | Pass | N/A | Pass | Reuse the existing Team message boundary for a bounded complete body instead of inventing cross-workspace `read_file` access or new storage. |
| Relative artifact publication | Pass | Pass | N/A | Pass | Reuse the existing workspace-relative resolver and publication service; no absolute-path return dependency or Brief-specific publisher is needed. |
| Tool-call/result observability | Pass | Pass | N/A | Pass | Reuse existing access-controlled run history and Team binding; no gateway payload logger or proof table is justified. |
| Brief publication/projection/browser outcome | Pass | Pass | N/A | Pass | Reuse the existing artifact reconciliation, notification, GraphQL, and UI path exactly. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK contracts and bundles/devkit | Pass | Pass | Pass | Pass | Canonical schema/declaration ownership is clear. |
| Application agent tools | Pass | Pass | Pass | Pass | Catalog, route, gateway, lifecycle, validation, and worker access are coherent. |
| Agent Tools MCP | Pass | Pass | Pass | Pass | Owns transport projection, registered static namespace, and route composition; configured-MCP policy remains internal and distinct from application validity. |
| AutoByteus backend | Pass | Pass | Pass | Pass | Checked advertisement, raw preparation, bound invocation, and precedence each have explicit adapter responsibilities. |
| Application orchestration/platform | Pass | Pass | Pass | Pass | Transition, readiness, ownership, and shutdown follow the real spines. |
| Application engine worker | Pass | Pass | Pass | Pass | Business execution remains worker-owned. |
| Maintained Brief Studio proof | Pass | Pass | Pass | Pass | Role configs/prompts, handler read/marker, Luna instruction, Codex protocol event, AutoByteus normalization, Team handoff, relative publication, application projection, and UI each stay with the existing owner appropriate to DS-013/DS-014. |
| Codex provider/runtime and event conversion | Pass | Pass | Pass | Pass | Existing provider owns built-in patch and `fileChange`; existing AutoByteus parser/converter owns normalization. Both remain unchanged and outside application/MCP routing. |
| Agent run history / evidence composition | Pass | Pass | Pass | Pass | Existing trace storage and application identities remain separate authorities; DS-014 joins them only for proof. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Declaration/schema/result/caller contracts | Pass | Pass | Pass | Pass | One SDK source. |
| Declaration snapshot/fingerprint | Pass | Pass | Pass | Pass | Per-tool immutable value. |
| Compound route identity | Pass | Pass | Pass | Pass | One exact selector. |
| Payload validation/measurement | Pass | Pass | Pass | Pass | One application-tool payload contract. |
| Registered static adapter name snapshot | Pass | Pass | Pass | Pass | One deterministic names-only snapshot replaces the misleading protected-policy subset at the application boundary. |
| Catalog transition plan | Pass | Pass | Pass | Pass | Derived, immutable package/application participant meaning. |
| Brief context marker construction | Pass | Pass | Pass | Pass | One handler-owned JSON serialization from the same read snapshot avoids parallel text/structured identity. |
| Agent-to-UI proof join | Pass | N/A | N/A | Pass | Deliberately not extracted into a production DTO/table; evidence reads existing authoritative records by ID. |
| Complete research handoff | Pass | N/A | N/A | Pass | Intentional bounded message content, not a new shared domain model; its marker/path/body semantics remain role- and workflow-specific. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationAgentToolDeclaration` / normalized schema | Pass | Pass | Pass | Pass | Pass | The narrowed keyword set and deterministic descriptions are tight. |
| Declaration snapshot and route | Pass | Pass | Pass | Pass | Pass | No parallel selector fields. |
| Caller and result union | Pass | Pass | Pass | Pass | Pass | Worker projection and MCP-safe result remain singular. |
| MCP session execution capability | Pass | Pass | Pass | Pass | Pass | Application specialization is explicit. |
| Static adapter name snapshot | Pass | Pass | Pass | Pass | Pass | It has one meaning—all catalog-registered static names—and does not overlap active, configured-protected, selected, or requested views. |
| `ApplicationCatalogTransitionPlan` | Pass | Pass | Pass | Pass | Pass | Participants derive from old/staged slices, not callers. |
| Brief context marker plus structured result | Pass | Pass | Pass | Pass | Pass | Both derive from one snapshot; the marker has fixed key order/JSON escaping, while structured content remains the machine-readable result. |
| Research handoff marker/path/body | Pass | Pass | Pass | Pass | Pass | Each field has one workflow meaning; the body is the complete bounded researcher output, not a second persisted artifact identity. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK declaration/manifest/backend contract files | Pass | Pass | Pass | Pass | Clean current contract. |
| MCP catalog, host, and provider files | Pass | Pass | Pass | Pass | Catalog owns complete registration and private precedence; host owns the narrow names snapshot; providers only declare adapters and their configured-MCP rule. |
| Application readiness and Studio/standalone composition files | Pass | Pass | Pass | Pass | Composition carries the snapshot unchanged; readiness owns complete declaration diagnostics without MCP internals. |
| Catalog/route/capability/lifecycle/validator/gateway files | Pass | Pass | Pass | Pass | Responsibilities follow the invocation spines. |
| `application-agent-tool-native-schema-projector.ts` | Pass | Pass | Pass | Pass | Exact round-trip owner. |
| Native `application-agent-tool.ts` | Pass | Pass | Pass | Pass | Owns checked advertisement, application-only raw preparation, and bound capability invocation without altering generic `BaseTool`. |
| Worker protocol/controller/host files | Pass | Pass | Pass | Pass | Existing process boundary extended. |
| Transition plan/service, reentry, bundle, package command, reconciliation files | Pass | Pass | Pass | Pass | `SR-003` maps the complete real lifecycle and removal. |
| Brief Studio tool files | Pass | Pass | Pass | Pass | Business logic stays in the application. |
| Brief Studio role `agent-config.json` files | Pass | Pass | Pass | Pass | Own honest Codex/Luna routed selection only; `read_file`, `write_file`, built-in `apply_patch`, and normalized `edit_file` are absent. |
| Brief Studio researcher/writer `agent.md` | Pass | Pass | Pass | Pass | Each file owns one role's closest model-facing contract, naming built-in `apply_patch` and provider-reported failure behavior without exposing normalized evidence; relative paths and complete handoff/no-read witness remain explicit. |
| Codex item parser/converter files | Pass | Pass | N/A | Pass | Existing files own protocol-family parsing and normalized lifecycle projection and are explicitly unchanged; they do not become prompt/config owners. |
| Live Codex file-change integration coverage | Pass | Pass | N/A | Pass | Existing optional test remains provider-bound coverage. If retained in the renewed executed set, coverage ownership must update `apply_patch` wording, required factory `agentRunId`, and exact Luna model recording; it cannot become the product proof owner. |
| Brief `get-brief-context.ts` and `brief-run-launch-service.ts` | Pass | Pass | Pass | Pass | Handler owns read/marker; launch owns supported start and reinforcement, not tool authority or proof. |
| Existing Brief reconciliation and frontend files | Pass | Pass | N/A | Pass | No semantic product edit is designed; their existing fields/events are the authoritative business/UI outcome. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK and `application-agent-tools/{domain,services}` | Pass | Pass | Low | Pass | Ownership-led feature depth. |
| MCP projection folder | Pass | Pass | Low | Pass | Transport-specific only. |
| AutoByteus application-tool folder | Pass | Pass | Low | Pass | Correct location for the required raw-preparation specialization. |
| Engine/worker/platform/orchestration files | Pass | Pass | Medium | Pass | Existing structural depths remain coherent. |
| Brief Studio config, role-prompt, Team, launch, service, and frontend paths | Pass | Pass | Low | Pass | Focused prompt/contract changes remain inside the maintained application; provider protocol, event conversion, publication, and projection stay in their existing subsystems, with no proof-only platform folder or cross-layer helper. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Manifest v4/backend v6 acceptance | Pass | Pass | Pass | Pass | Strict v5/v7 replacement. |
| Stale maintained generated outputs | Pass | Pass | Pass | Pass | Delete/regenerate. |
| Global-only readiness/native silent skip assumptions | Pass | Pass | Pass | Pass | Exact application catalog/projection replaces them. |
| `listSupportedToolNames()`, public `listProtectedStaticToolNames()`, and host `protectedStaticToolNames` | Pass | Pass | Pass | Pass | Rename the complete reader exactly and remove the policy-subset readers/properties without aliases. |
| Nullable/length/closed-object/default schema claims | Pass | Pass | Pass | Pass | Removed from v5. |
| Refresh coordinator and old reentry bundle mutation | Pass | Pass | Pass | Pass | Removed without forwarding wrappers. |
| Provisional duplicate DTOs/branches | Pass | Pass | Pass | Pass | Final cleanup is explicit. |
| Maintained registry `read_file`/`write_file` selection and absolute-path wording | Pass | Pass | Pass | Pass | Unavailable configured-name assumptions remain removed; built-in patch plus canonical relative publication and complete handoff replace them without compatibility paths. |
| Maintained model-facing “provider-native `edit_file`” wording | Pass | Pass | Pass | Pass | Replace in both roles, Team/launch reinforcement, and contract coverage with built-in `apply_patch`; retain `fileChange`/normalized `edit_file` only in evidence. No alias is added. |
| Maintained shell fallback and write-first/read-first role sequences | Pass | Pass | Pass | Pass | Replace directly with context-first/built-in-patch/no-shell sequences and complete handoff; no optional legacy prompt path remains. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Manifest/backend contracts | No | Pass | Pass | Retired versions fail closed. |
| Application tool registration/projection | No | Pass | Pass | No global fallback or per-app MCP process. |
| Static collision readers | No | Pass | Pass | Ambiguous/protected public readers are removed; no deprecated alias or dual collision policy remains. |
| Catalog refresh/reentry | No | Pass | Pass | Competing live mutation APIs are removed. |
| Session declaration changes | No | Pass | Pass | Fingerprints fail stale routes closed. |
| Maintained Brief prompt/proof behavior | No | Pass | Pass | The conflated `edit_file` prompt vocabulary is cleanly replaced with built-in `apply_patch`; native `fileChange` and normalized evidence retain their existing meanings. No alias, direct-MCP-as-live-proof, fake-provider, shell, or runtime-switch fallback is retained. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Generated/importable packages | Discard or Rebuild | Pass | Pass | N/A | Pass | Strict contracts plus maintained source justify regeneration. |
| App/platform databases, bindings, journals, overrides, Agent/Team definitions, global MCP config | Directly Usable — No Migration | Pass | Pass | N/A | Pass | SR-008 changes maintained prompt/Team/launch/test expectations only; provider protocol, event normalization, message, trace, publication, binding, artifact/projection, GraphQL, and UI schemas are reused without transformation. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Contract bump and package rebuild | Pass | Pass | Pass | Pass |
| Catalog/gateway/worker/capability assembly | Pass | Pass | Pass | Pass |
| Native runtime projection | Pass | Pass | Pass | Pass |
| Complete static-name collision boundary | Pass | Pass | Pass | Pass |
| Package/application catalog transition | Pass | Pass | Pass | Pass |
| Maintained Luna instruction/Codex event/normalized evidence/handoff/publication and Agent-to-UI proof | Pass | Pass | Pass | Pass |
| Shutdown and final cleanup | Pass | Pass | Pass | Pass |

The maintained-demo step now replaces the model-facing “provider-native `edit_file`” wording in both roles and supporting Team/launch text with built-in `apply_patch`, while keeping both names out of routed config and preserving no-shell/relative-publication/handoff rules. Focused contract coverage checks the instruction/config boundary. Provider parser/converter semantics stay unchanged; the optional stale live integration is corrected only if downstream coverage uses it and cannot substitute for exact Luna/browser proof. The renewed browser validation must retain Codex `fileChange`, corresponding normalized `edit_file`, zero forbidden calls, exact message/body/path joins, and the UI outcome. Earlier platform sequences remain unchanged.

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Contract/result/route/fingerprint | Yes | Pass | Pass | Pass | Concrete shapes are clear. |
| Schema declaration round trip | Yes | Pass | Pass | Pass | Accepted and rejected keyword families are now precise. |
| Native invocation validation parity | Yes | Pass | Pass | Pass | The override example and parity matrix cover raw identity, coercible-invalid families, typed values, result mode, cancellation, and zero worker calls. |
| Static/application/configured collision policy | Yes | Pass | Pass | Pass | The matrix distinguishes registered, active, and configured-protected views and includes application `open_tab`, inactive static, non-static app-over-configured, and configured browser precedence. |
| Package transition/rollback | Yes | Pass | Pass | Pass | The operation matrix and good/bad shapes cover real callers and outcomes. |
| Runtime universality/isolation/construction | Yes | Pass | Pass | Pass | Clear owner-focused examples. |
| Maintained role/patch/handoff order and marker | Yes | Pass | Pass | Pass | Concrete prompts state first call, built-in `apply_patch`, provider-reported success/failure, no shell, relative publication, complete handoff, and writer no-read/verbatim-bullet use without asking roles to inspect hidden events. |
| Model instruction -> provider event -> normalized evidence | Yes | Pass | Pass | Pass | The example and proof table distinguish `apply_patch`, Codex `fileChange`, and normalized `edit_file`; prompt/source evidence and execution evidence are separate and neither substitutes for the other. |
| Agent-to-UI evidence join and browser outcome | Yes | Pass | Pass | Pass | The table joins application call, Codex native event, normalized lifecycle, Team message, workspace resolution, publication, projection, and browser authorities by exact identities; shell, unavailable registry tools, aliases, direct mutation, aggregate logging, direct-MCP substitution, and fake providers are excluded. |

## Material Premise Validation

`CR-MP-002` is the independently verified production premise that reopened `CR-DI-002` and triggered SR-008. `CR-MP-001` and the earlier reachable premises remain recorded for the earlier facets whose evidence and accepted corrections are still relevant.

### `CR-MP-002` — The supported Luna journey reaches model-facing normalized-event wording and blocks before native file change

- Related approved requirement or established contract: BEH-008; REQ-018–REQ-021; AC-032–AC-039.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: An authenticated Brief Studio user creates or selects a brief and invokes **Generate draft** from the packaged application in the supported browser surface.
- Support evidence: The Applications catalog, Brief Studio host/iframe, GraphQL launch, `BriefRunLaunchService`, current Team binding, and shipped configs expose this action and fix both roles to `codex_app_server` / `gpt-5.6-luna`. `API-REV-003` exercised it twice with actual authenticated inference and no alternate API, mock, runtime switch, shell fallback, or prompt edit.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: browser **Generate draft** -> GraphQL/application launch -> exact application Team binding -> Luna researcher -> authenticated `get_brief_context` succeeds exactly once first -> maintained text asks for “provider-native `edit_file`” -> Luna reports the operation unavailable and sends a blocker -> Luna writer calls context exactly once and rejects the incomplete handoff -> zero Codex `fileChange`, normalized edit lifecycle, publication, artifact, or revision -> existing projection -> the same browser brief remains `not_started` with zero outputs.
- Lifecycle preconditions and material consequence at the claimed point: Provider inference, Team membership, application binding, application gateway/worker, read-only handler, and collaboration are live and authorized. The wording mismatch blocks the only approved normal artifact path before workspace mutation and publication, so the required `in_review` result cannot occur.
- Reachability: `Reachable`
- Review consequence / proportionate response: SR-008 separates three existing interfaces: maintained prompt uses current Luna built-in `apply_patch`; Codex owns `item/fileChange` / `file_change`; existing AutoByteus conversion owns normalized `edit_file` evidence. The role reacts only to provider-reported patch success/failure, while verification independently requires the native/normalized evidence. Neither name enters `toolNames`, and no alias, provider composition change, shell fallback, application mutation, runtime switch, or new log/UI path is introduced. This closes reopened `CR-DI-002` at design level.

### `CR-MP-001` — Maintained Codex roles cannot use selected ordinary registry file tools, so the approved workflow blocks without a supported file/handoff edge

- Related approved requirement or established contract: BEH-008; REQ-018, REQ-020, REQ-021; AC-032, AC-033, AC-037–AC-039.
- Relevant behavior ID(s): BEH-008.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: An authenticated Brief Studio user creates or selects a brief and invokes **Generate draft** in the browser for the maintained application Team.
- Support evidence: The browser, GraphQL mutation, `BriefRunLaunchService`, maintained Team binding, and shipped researcher/writer configs expose this action and fix both roles to `codex_app_server` / `gpt-5.6-luna`. `API-REV-002` executed that actual action with the configured provider; it is not a synthetic caller or direct-MCP substitute.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: Brief Studio browser -> GraphQL launch -> application Team binding -> Codex/Luna researcher -> authenticated Agent Tools MCP `get_brief_context` succeeds -> Codex composition does not expose selected ordinary registry `write_file` -> researcher uses `run_bash` to create/publish a blocker and hands off -> Codex/Luna writer -> `get_brief_context` succeeds -> selected ordinary registry `read_file`/`write_file` are absent -> no final publication -> existing reconciliation/projection -> the same browser renders the brief `blocked`.
- Lifecycle preconditions and material consequence at the claimed point: The provider is authenticated, both real members run, application routing/ownership works, and the read-only calls are paired to the exact binding/member/brief. The missing provider-facing file/data edge prevents the approved normal final artifact and `in_review` UI outcome; shell fallback violates the approved proof rather than satisfying it.
- Reachability: `Reachable`
- Review consequence / proportionate response: SR-007 permanently removed the false ordinary-registry selection, added exact member-workspace-relative publication, and used a bounded complete Team handoff so the writer needs no file read. API-REV-003 showed its model-facing replacement name was still insufficient; SR-008 corrects that separate facet without reopening the registry-file, handoff, publication, provider-expansion, security, storage, or UI decisions.

### `MP-001` — Native pre-gateway coercion can turn a schema-invalid application-tool argument into a worker call

- Related approved requirement or established contract: REQ-003, REQ-005, REQ-010; AC-010, AC-019; the approved JSON-schema validation contract.
- Relevant behavior ID(s): BEH-003, BEH-004.
- Initiating basis kind: `Contract`
- Independent product-supported initiating trigger or applicable governing contract: The application-tool invocation contract explicitly requires a provider-produced JSON argument object that violates the declared schema to fail before worker execution.
- Support evidence: REQ-010 and AC-019 govern schema-invalid arguments; application runs normally invoke selected tools through AutoByteus or Agent Tools MCP. Current `BaseTool` is the supported AutoByteus execution boundary and the design deliberately reuses it.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: selected AutoByteus application tool -> native tool invocation arguments such as `{"limit":"2"}` for an integer declaration -> `ApplicationAgentTool.prepareExecution` returns the identical raw object without generic coercion/validation -> inherited `execute` -> `_execute` -> capability/gateway -> strict Ajv rejects -> zero worker calls. Claude/Codex follow provider `tools/call` -> MCP application adapter -> the same capability/gateway -> strict Ajv rejects the same raw JSON.
- Lifecycle preconditions and material consequence at the claimed point: The selected route is otherwise current and authorized. The SR-004 specialization removes the native-only transformation while retaining agent binding, pre-start/post-preparation abort behavior, the two-value result-mode contract, and inherited execution. Schema-invalid input now has one meaning across runtimes.
- Reachability: `Reachable`
- Review consequence / proportionate response: `SR-004` implements the proportionate design correction at the native application adapter only. `ARCH-DI-001` is resolved; generic `BaseTool`, fundamental/configured tools, and the checked advertisement path remain unchanged.

### `MP-002` — A supported package removal can overlap an admitted application-tool call

- Related approved requirement or established contract: REQ-013–REQ-015; AC-021–AC-024; UC-003 and UC-006.
- Relevant behavior ID(s): BEH-005.
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: A Studio user selects **Settings -> Application Packages -> Remove** while an application Agent/Team call is already admitted.
- Support evidence: The Settings component, store, GraphQL mutation, and `ApplicationPackageCommandService` expose the supported remove action; UC-003 independently establishes admitted tool calls.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: application tool admission -> worker call; concurrently Settings -> store -> GraphQL -> package command. In the target, the command enters `ApplicationCatalogTransitionService`, which captures old package participants, quiesces/drains/stops them before mutation, stages and synchronously commits only the package slice, then recovers/removes/quarantines while unrelated lanes remain open.
- Lifecycle preconditions and material consequence at the claimed point: Without ordering, removal could race an admitted call. `SR-003` now supplies the required lifecycle boundary before source/catalog mutation.
- Reachability: `Reachable`
- Review consequence / proportionate response: The revised DS-006/DS-011, operation matrix, interfaces, dependencies, removals, files, and guidance adequately address this premise. `ARCH-DI-002` is resolved.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

`SR-008` resolves reopened `CR-DI-002` at design level. DS-013/DS-014 now carry one continuous real path while keeping three interfaces distinct: the maintained role instructs Luna built-in `apply_patch`; Codex owns native `fileChange`; AutoByteus owns normalized `edit_file` evidence. The role uses only provider-reported outcome and never inspects hidden trace state; verification independently joins prompt/source contract, native event, normalized lifecycle, exact member workspace, publication, Team message, application binding/projection, and browser outcome. Config, provider composition, event conversion, application-tool architecture, read-only causality, and UI contracts remain unchanged. No implicit routed-native, alias, shell, cross-workspace read, provider-expansion, mutation, logging, or UI dependency remains. `CR-MP-002` is reachable and proportionately addressed; earlier findings remain resolved. The focused design is ready for implementation and the renewed downstream cycle.

## Findings

None.

## Classification

`N/A — Pass`

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- Both role configs must remain `codex_app_server` / `gpt-5.6-luna`, select only actual routed application/collaboration/publication capabilities, and omit `read_file`, `write_file`, built-in `apply_patch`, and normalized `edit_file`.
- Both `agent.md` files must independently encode the exact context-first, built-in-`apply_patch`, provider-reported-success, no-shell, relative-publication, and fail-closed order. Config selection, `team.md`, launch text, or prompt inspection cannot substitute for execution evidence.
- The handler marker must be rendered from the same read snapshot as structured content using fixed insertion order and `JSON.stringify`; missing binding/brief state must yield a safe error without a fabricated marker.
- The research handoff must contain the exact marker/path and complete bounded body. The writer must call context first after that handoff, compare the current result, consume the handoff without `read_file`, and copy at least one complete non-marker `Key findings` bullet verbatim into final `Key evidence`. Drift, truncation, mismatch, or retry must fail the proof rather than be normalized away.
- The three names must not drift or collapse: `apply_patch` is maintained Luna instruction vocabulary, `item/fileChange` / `file_change` is provider protocol, and normalized `edit_file` is AutoByteus observability. The role must not be told to inspect protocol/normalized evidence.
- A successful real run must retain a Codex native file-change event and its corresponding successful normalized lifecycle under each member run, with zero `run_bash`, `read_file`, or `write_file`; prompt text alone, a shell-created file, or a fabricated artifact is not acceptable evidence.
- Each relative path must be resolved against the exact producing member run workspace and matched to that file, published revision, producer/binding, and Brief path rule. Path text alone is not identity evidence.
- `get_brief_context` must remain read-only and must not call reconciliation, write repositories, GraphQL, or frontend code. Only normal publication may move the brief to `in_review`.
- Prompt/source contract, Codex event, normalized lifecycle, Team message, binding, workspace resolution, artifact revision/projection, and browser evidence are asynchronously produced; verification must wait for terminal/converged state and join `toolCallId`, file-change/edit invocation ID, `agentRunId`, `applicationId`, `bindingId`, `memberAddress`, and `briefId`, never timestamps/title/log ordering alone.
- The optional live Codex integration is stale/inadequate Luna evidence until its prompt, required factory `agentRunId`, and exact model execution are corrected. Coverage ownership must decide/update it; even corrected, it cannot replace the supported browser journey.
- A configured Codex provider is required for the maintained sample's current `gpt-5.6-luna` role configs. Provider outage, missing credentials, or actual model noncompliance must be reported truthfully as blocked/failed evidence; direct MCP and mocks remain lower-level evidence only.
- Any durable test edits after implementation must receive coverage investigation/execution and proportional code review before delivery resumes. DR-002 remains the delivery authority until the renewed downstream cycle passes.
- The already-passed platform boundaries—static-name separation, native raw preparation, ownership, staged catalog transition, bounds, no retry, and v5/v7 clean transition—must not regress during the focused sample change.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `SR-008` closes reopened `CR-DI-002` at design level. The full role/read/`apply_patch`/Codex-`fileChange`/normalized-`edit_file`/handoff/publication/projection/UI spine is coherent, and `CR-MP-002` is confirmed reachable and addressed without alias, provider, policy, or application-tool expansion. No blocking design finding remains. Focused implementation, source review, and renewed real-provider/browser proof are not yet complete.
