# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record captures the concise architecture-review history.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1; initial user-approved solution package | SR-001 | N/A | Fail | ARCH-DI-001, ARCH-DI-002 |
| ARCH-REV-002 | Round 2; SR-002 naming-only revision and renewed review request | SR-001, SR-002 | Fail | Fail | ARCH-DI-001, ARCH-DI-002 |
| ARCH-REV-003 | Round 3; SR-003 schema/lifecycle rework | SR-001, SR-002, SR-003 | Fail | Fail | ARCH-DI-001, ARCH-DI-002 |
| ARCH-REV-004 | Round 4; SR-004 native raw-preparation correction | SR-001, SR-002, SR-003, SR-004 | Fail | Pass | ARCH-DI-001, ARCH-DI-002 |
| ARCH-REV-005 | Round 5; SR-005 correction after CRR-001 / CR-DI-001 | SR-001, SR-002, SR-003, SR-004, SR-005 | Pass architecture / Fail source review | Pass | CR-DI-001 |

## Revision Entries

### ARCH-REV-001 — Initial architecture baseline identifies two design-path corrections

- Canonical design review report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- Review round and trigger: Round 1, initial complete solution package after user approval of requirements and the intended-behavior supplement.
- Triggering role, report path, and finding IDs: `/solution_designer`; no prior review report; `N/A` prior finding IDs.
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: `N/A`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: Confirmed the approved behavior/current-state basis and the overall catalog/route/gateway/lifecycle ownership model. Established that the native schema projection and the supported package reload/removal path are not yet coherent/actionable enough for implementation.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `ARCH-DI-001`, `ARCH-DI-002`
- Material classification changes: `N/A` — initial baseline.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: Sealed assembly, Team-descendant identity, result/payload parity, strict package rebuild, and full runtime execution remain residual implementation/test risks after the two blockers are corrected.

### ARCH-REV-002 — Capability naming passes; prior design findings remain open

- Canonical design review report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- Review round and trigger: Round 2, `SR-002` naming revision plus renewed implementation-readiness request from `/solution_designer`.
- Triggering role, report path, and finding IDs: `/solution_designer`; `solution-revision-record.md`; the triggering revision carries no finding ID because it is naming-only. Prior unresolved findings `ARCH-DI-001` and `ARCH-DI-002` were rechecked first.
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: Accepted the rename from `ApplicationAgentToolRuntimeCapability` / `ApplicationAgentToolRuntimeCapabilityAssembly` to `ApplicationAgentToolCapability` / `ApplicationAgentToolCapabilityAssembly`; the shorter names match ownership because runtime is a projection location, not the port's subject. SR-002 is otherwise design-neutral and does not change the schema or package-lifecycle paths that caused the prior findings.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-DI-001 | Open | Open | ARCH-REV-001; SR-002 | Design spec `Schema subset` still accepts nullable and string/array length forms at lines 548-554; the final mapping still allocates only reuse of `McpSchemaMapper`, while current `ParameterSchema`/`BaseTool` cannot preserve required nullable or length semantics. |
| ARCH-DI-002 | Open | Open | ARCH-REV-001; SR-002 | `DS-006`, the final file map, and change sequence still omit the actual `ApplicationPackageCommandService -> ApplicationCatalogRefreshCoordinator -> ApplicationBundleService.refresh` transition boundary and pre-mutation affected-application coordination. |

- New or remaining finding IDs: `ARCH-DI-001`, `ARCH-DI-002`
- Material classification changes: None. The SR-002 name change is accepted and does not alter finding type, severity, reachability, or approved authority.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: Same residual implementation/test risks as ARCH-REV-001 after both blockers are corrected; no new naming risk remains.

### ARCH-REV-003 — Lifecycle spine closes; native argument flow keeps schema parity open

- Canonical design review report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- Review round and trigger: Round 3, `SR-003` rework submitted to close `ARCH-DI-001` and `ARCH-DI-002`.
- Triggering role, report path, and finding IDs: `/solution_designer`; `solution-revision-record.md` / `SR-003`; prior findings `ARCH-DI-001`, `ARCH-DI-002`.
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: The v5 declaration-schema subset is now mapper-round-trippable, and the real Settings/GraphQL/package-command/reentry lifecycle is governed by one staged catalog-transition owner. The lifecycle correction is accepted. The schema correction remains incomplete because the proposed native bound tool still inherits `BaseTool` argument coercion before the common gateway's Ajv validation, so the raw invocation data flow and runtime semantics are not yet invariant.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-DI-001 | Open | Open — narrowed | ARCH-REV-001, ARCH-REV-002, SR-003 | Design lines 611-617 now reject non-projectable keywords and lines 619/747 add a fail-closed mapper round trip. However line 619 explicitly retains native coercion; current `BaseTool` coerces integer/number/boolean strings, empty-string arrays, and nested fields before `_execute`, while the MCP path reaches Ajv with raw JSON. The same runtime-parity finding therefore remains open at the native preparation boundary. |
| ARCH-DI-002 | Open | Resolved | ARCH-REV-001, ARCH-REV-002, SR-003 | Revised DS-006/DS-011 start at Settings/store/GraphQL/package commands and REST reentry, derive old participants before mutation, quiesce/drain/stop them, stage only the target slice, commit prepared bundle/tool state synchronously, then recover/remove/quarantine. Interfaces, operation matrix, dependencies, file mapping, removal of the refresh coordinator/old reentry API, sequence, rollback, and guidance all align. |

- New or remaining finding IDs: `ARCH-DI-001`
- Material classification changes: `ARCH-DI-002` is resolved. `ARCH-DI-001` remains `Design Impact / High`; its non-projectable-keyword facet is resolved, but the same approved runtime-parity issue persists through native-only coercion.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: Sealed assembly, Team-descendant ownership, result/bound parity, catalog-transition concurrency/rollback, strict v5/v7 regeneration, and the unexecuted runtime matrix remain downstream implementation/test risks after `ARCH-DI-001` is closed.

### ARCH-REV-004 — Raw native preparation closes the final design finding

- Canonical design review report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- Review round and trigger: Round 4, `SR-004` correction for the narrowed native-preparation facet of `ARCH-DI-001`.
- Triggering role, report path, and finding IDs: `/solution_designer`; `solution-revision-record.md` / `SR-004`; prior finding `ARCH-DI-001`.
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: The current design now separates checked native schema advertisement from raw application-tool invocation. `ApplicationAgentTool.prepareExecution` is the explicit application-only owner for agent binding, abort/result-mode preservation, and same-object forwarding; it does not call generic preparation or perform coercion/defaulting/cloning/schema validation. Inherited execution reaches the common capability/gateway with the raw object, so AutoByteus and MCP projections share one strict Ajv meaning. Generic `BaseTool` and the accepted SR-003 catalog transition remain unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-DI-001 | Open — narrowed | Resolved | ARCH-REV-003; SR-004 | Revised DS-002/DS-003 and new DS-012 trace raw native arguments through an explicit override into the common capability. Ownership, boundary, dependency, interface, file/folder, sequence, tradeoff, risk, guidance, and parity sections all assign the seam to `ApplicationAgentTool`. The concrete override preserves agent identity, pre-start/post-preparation abort behavior, the result-mode guard, object identity, and inherited execution while forbidding `super.prepareExecution` and generic schema transformation. |
| ARCH-DI-002 | Resolved | Resolved — confirmed | ARCH-REV-003; SR-003; SR-004 | SR-004 does not change DS-006/DS-011, the sole catalog-transition owner, participant-only reentry, staged slice commits, rollback, removal, or unrelated-application preservation. The previously accepted lifecycle design remains coherent. |

- New or remaining finding IDs: None.
- Material classification changes: `ARCH-DI-001` is resolved; the authoritative decision changes from `Fail — Design Impact` to `Pass`.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Exact native override implementation/coverage, sealed assembly, Team-descendant ownership, result/bound parity, catalog-transition concurrency/rollback, strict v5/v7 regeneration, and the environment-backed runtime matrix remain implementation/test risks rather than design blockers.

### ARCH-REV-005 — Complete static-name ownership resolves the downstream design impact

- Canonical design review report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- Review round and trigger: Round 5, `SR-005` correction after implementation `IR-001` and code review `CRR-001` exposed `CR-DI-001`.
- Triggering role, report path, and finding IDs: `/code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`; `CR-DI-001`, routed through `/solution_designer` as `SR-005`.
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`, `SR-005`
- Prior authoritative decision: Architecture `Pass` at `ARCH-REV-004`; later source review `Fail — Design Impact` at `CRR-001`.
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: The design no longer derives application declaration validity from the configured-MCP collision-policy subset. DS-001 begins at actual static provider registration and carries the catalog's complete registered-name set through an immutable host snapshot to every declaration at readiness. DS-002 keeps registered, active, and configured-protected views distinct: any registered static name rejects an application route, while the no-application configured-MCP protected/prefer branch remains unchanged. The catalog owns both subjects; only names cross into application readiness; native remains readiness-gated.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-DI-001 | Open — downstream Design Impact; `IR-001` source failed | Resolved in design; source correction pending | CRR-001; SR-005; ARCH-REV-005 | Current design SHA-256 `d8651fd096733db1ed76ee2267b360566a0478929b36ec997f033c69d1429a6e`; BEH-002 and DS-001/DS-002 trace provider registration -> catalog complete index -> host `staticAdapterToolNames` -> all-declaration readiness and defensive application-route rejection. Ownership, dependencies, interfaces, files, removals, collision matrix, sequence, guidance, and coverage all preserve the separate configured-MCP rule, including configured `open_tab` precedence when no application declaration exists. |
| ARCH-DI-001 | Resolved | Resolved — confirmed | ARCH-REV-004; SR-004; SR-005 | SR-005 does not change the checked schema projector, raw `ApplicationAgentTool.prepareExecution`, common Ajv gateway, or runtime-parity contract. |
| ARCH-DI-002 | Resolved | Resolved — confirmed | ARCH-REV-003; SR-003; SR-005 | SR-005 does not change `ApplicationCatalogTransitionService`, staged target-slice commits, participant lifecycle, rollback, or unrelated-application preservation. |

- New or remaining finding IDs: None at architecture design level. `IR-001` remains failed source until revised.
- Material classification changes: The downstream `CR-DI-001` Design Impact is resolved by `SR-005`; architecture remains `Pass`. No new requirement, migration, security, or lifecycle policy was introduced.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Implementation must reserve the complete registered static set without widening configured-MCP protection, remove ambiguous/protected public readers without aliases, keep native decoupled from MCP internals, add exact collision/non-regression coverage, append an implementation revision, and return through `/code_reviewer` before API/E2E.
