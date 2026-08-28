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
| ARCH-REV-006 | Round 6; SR-006 approved post-API Agent-to-UI proof amendment | SR-001–SR-006 | Pass; delivery later paused at DR-002 for Requirement Gap | Pass | N/A — approved Requirement Gap resolved |
| ARCH-REV-007 | Round 7; SR-007 correction after API-REV-002 / CRR-005 | SR-001–SR-007 | Pass architecture / Fail API-E2E and source failure-origin review | Pass | CR-DI-002; CR-MP-001 |
| ARCH-REV-008 | Round 8; SR-008 correction after API-REV-003 / CRR-007 | SR-001–SR-008 | Pass architecture / Fail API-E2E and source failure-origin review | Pass | Reopened CR-DI-002; CR-MP-002 |

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

### ARCH-REV-006 — Role-local read-to-publication spine resolves the post-API proof gap

- Canonical design review report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- Review round and trigger: Round 6, `SR-006` after the user approved the post-`API-REV-001` Requirement Gap's read-only Option A and authorized focused Brief Studio prompt/demo changes.
- Triggering role, report path, and finding IDs: `/api_e2e_engineer` and later `/code_reviewer`/`delivery_engineer`; `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-agent-ui-proof-gap.md`; no assigned finding ID. Delivery pause authority is `DR-002` in `delivery-revision-record.md`.
- Relevant solution revision IDs: `SR-001`–`SR-006`
- Prior authoritative decision: Architecture `Pass` at `ARCH-REV-005`; `IR-002`, `CRR-002`, `API-REV-001`, and `CRR-003` later passed the earlier platform/direct-MCP scope; delivery then paused for the user-approved expanded proof.
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: BEH-008/DS-013 now span the supported browser launch through actual configured researcher/writer roles, binding-derived read, exact result marker use, normal artifact publication, existing reconciliation/notification, and the exact same-brief UI outcome. Each role prompt is the closest model-facing order owner; config, Team, and launch text only support it. DS-014 separately joins existing access-controlled call/results, Team binding, artifact revision/projection, and browser evidence by authoritative IDs. The tool remains read-only, publication remains the sole state-change path, and no payload log, proof table, database field, GraphQL operation, UI workflow, or fake provider path is added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| Post-API Agent-to-UI Requirement Gap (unassigned) | Open; delivery paused at DR-002 | Resolved by approved requirements and design | API-REV-001 post-result note; CRR-003 post-result routing note; `api-e2e-agent-ui-proof-gap.md`; DR-002; SR-006; ARCH-REV-006 | Amended requirements explicitly approve BEH-008, UC-008, REQ-018–REQ-020, and AC-032–AC-036. Current design DS-013/DS-014, ownership, boundaries, dependencies, interfaces, files, examples, sequence, risks, and guidance map role-local exactly-once behavior, read-only causality, existing-authority evidence, and exact browser assertions. Direct source reads confirm the current prompt gap and the existing handler, trace, binding, reconciliation, notification/GraphQL, and UI path. |
| ARCH-DI-001 | Resolved | Resolved — confirmed | ARCH-REV-004; SR-004; SR-006 | SR-006 does not change schema projection, native raw preparation, or common Ajv invocation semantics. |
| ARCH-DI-002 | Resolved | Resolved — confirmed | ARCH-REV-003; SR-003; SR-006 | SR-006 does not change catalog transition, participant lifecycle, staged commits, rollback, or unrelated-application preservation. |
| CR-DI-001 | Resolved in design/source | Resolved — confirmed | ARCH-REV-005; SR-005; IR-002; CRR-002; SR-006 | SR-006 does not change the complete static-name snapshot or the distinct configured-MCP precedence policy. |

- New or remaining finding IDs: None.
- Material classification changes: The downstream Requirement Gap is no longer open because the user approved Option A and the requirements/supplement now make the causality and proof contract authoritative. No Design Impact, migration, security-policy expansion, or new lifecycle owner is introduced.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Implement both role-local sequences and canonical marker exactly, preserve the handler's read-only boundary, add proportionate maintained-demo coverage, and return through source review. API/E2E must then run the actual configured provider and supported browser journey, join exact identities after convergence, and report provider unavailability or model noncompliance truthfully. Any durable coverage edit returns through proportional code review before delivery resumes from DR-002.

### ARCH-REV-007 — Actual Codex edit and complete Team handoff close the production data-flow gap

- Canonical design review report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- Review round and trigger: Round 7, `SR-007` after the valid `API-REV-002` real Codex/Luna browser journey failed and `CRR-005` classified the provider-facing file/data edge as `CR-DI-002`, based on reachable production premise `CR-MP-001`.
- Triggering role, report path, and finding IDs: `/code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`; `CR-DI-002`, `CR-MP-001`. Execution evidence is recorded in `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (`API-REV-002`), and `api-e2e-evidence/api-rev-002/` under the same ticket directory.
- Relevant solution revision IDs: `SR-001`–`SR-007`
- Prior authoritative decision: Architecture `Pass` at `ARCH-REV-006`; `IR-003` / `CRR-004` source passed, then `API-REV-002` failed at 87.1% and `CRR-005` returned Design Impact.
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: DS-013/DS-014 now expose the actual provider and cross-member data edges. Maintained configs select only real routed capabilities; each role uses Codex-native `edit_file` without declaring it as MCP/registry exposure or using `run_bash`; each canonical relative path resolves inside the exact member workspace before publication; the researcher transfers the exact marker/path and complete bounded body through the existing Team message boundary; and the writer consumes that body without `read_file`, with a verbatim key-finding witness. Final publication remains the only cause of reconciliation and `in_review`; verification joins existing call/edit/message/path/publication/binding/projection/browser authorities rather than adding production logging or state.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-DI-002 | Open after CRR-005 | Resolved in design; source and renewed API/E2E pending | API-REV-002; CRR-005; SR-007; ARCH-REV-007 | Approved BEH-008, REQ-018/REQ-020/REQ-021, and AC-032/AC-033/AC-037–AC-039 now map through DS-013/DS-014, ownership, dependencies, interfaces, files, examples, sequence, risks, and guidance to the existing Codex-native edit, Team message, relative publisher, application reconciliation, and browser owners. Direct source reads confirm live normalized `edit_file`, absence of ordinary registry file tools from Codex composition, relative-path resolution, and Brief suffix/path reconciliation. |
| CR-MP-001 | Reachable; consequence observed | Reachable — confirmed and proportionately addressed | API-REV-002; CRR-005; SR-007; ARCH-REV-007 | Supported trigger is Brief Studio **Generate draft** with the shipped Codex/Luna Team. Actual traces show both application calls, missing registry read/write exposure, shell blocker/no final, and the same browser `blocked` outcome. SR-007 removes the false dependency without provider/security expansion. |
| ARCH-DI-001 | Resolved | Resolved — confirmed | ARCH-REV-004; SR-004; SR-007 | SR-007 does not change native raw preparation, schema projection, or common Ajv invocation. |
| ARCH-DI-002 | Resolved | Resolved — confirmed | ARCH-REV-003; SR-003; SR-007 | SR-007 does not change catalog transition, participant lifecycle, staged commit, rollback, or unrelated-application preservation. |
| CR-DI-001 | Resolved in design/source | Resolved — confirmed | ARCH-REV-005; SR-005; IR-002; CRR-002; SR-007 | SR-007 does not change all-static application reservation or configured-MCP precedence. |

- New or remaining finding IDs: None at architecture design level.
- Material classification changes: `CR-MP-001` remains `Reachable`; its observed consequence is addressed by a bounded Design Impact correction. `CR-DI-002` is closed at design level. No requirement, provider-wide security/exposure policy, migration, mutation, logging, GraphQL, or UI contract was added.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Focused implementation must remove unavailable routed names without listing provider-native `edit_file`, encode both native-edit/no-shell/relative-publication sequences, preserve the complete handoff and writer no-read/verbatim witness, align only supporting Team/launch text, and add proportionate coverage without modifying provider composition. Source review must follow. API/E2E must then rerun the actual configured browser journey, prove successful normalized edits and zero forbidden operations, join member workspace/publication/message identities, and report provider unavailability or model noncompliance truthfully. Durable coverage edits return through proportional code review before delivery resumes from DR-002.

### ARCH-REV-008 — Model instruction, provider protocol, and normalized evidence become separate owned interfaces

- Canonical design review report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- Review round and trigger: Round 8, `SR-008` after the valid repeatable `API-REV-003` real Codex/Luna browser journey failed and `CRR-007` reopened `CR-DI-002` under reachable `CR-MP-002`.
- Triggering role, report path, and finding IDs: `/code_reviewer`; `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`; reopened `CR-DI-002`, `CR-MP-002`. Execution evidence is recorded in `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (`API-REV-003`), and `api-e2e-evidence/api-rev-003/` under the same ticket directory.
- Relevant solution revision IDs: `SR-001`–`SR-008`
- Prior authoritative decision: Architecture `Pass` at `ARCH-REV-007`; `IR-004` / `CRR-006` source passed, then `API-REV-003` failed twice at the real Luna model-facing edge with 88.6% confidence and `CRR-007` reopened Design Impact.
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: SR-008 corrects the remaining provider boundary without changing product scope. Maintained prompts name Luna built-in `apply_patch`; Codex owns `item/fileChange` / `file_change`; existing AutoByteus parser/converter owns normalized `edit_file` evidence. None is placed in routed `toolNames` or generalized into a registry/MCP/application API. Roles react only to context and provider-reported patch/publication/handoff outcomes; independent verification requires the provider/normalized event pair and exact member identity. DS-013/DS-014 continue through member-relative publication, complete Team handoff, application reconciliation, and browser outcome. Provider composition/event semantics, application-tool architecture, read-only causality, databases, GraphQL, and UI remain unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-DI-002 | Reopened after API-REV-003 / CRR-007 | Resolved in design; source and renewed API/E2E pending | CRR-005; SR-007; ARCH-REV-007; IR-004; CRR-006; API-REV-003; CRR-007; SR-008; ARCH-REV-008 | Current BEH-008, REQ-020/REQ-021, AC-032/AC-033/AC-037–AC-039, DS-013/DS-014, ownership, dependencies, interfaces, files, examples, sequence, risks, and guidance distinguish model instruction, provider event, and normalization. Exact current diagnostic establishes no-shell Luna `apply_patch` -> Codex `fileChange`; direct source reads confirm existing `fileChange` -> normalized `edit_file` success/failure projection. |
| CR-MP-002 | Reachable; consequence reproduced twice | Reachable — confirmed and proportionately addressed | API-REV-003; CRR-007; SR-008; ARCH-REV-008 | Supported trigger is Brief Studio **Generate draft** with shipped Codex/Luna roles. All four real members reached their first context call, but “provider-native edit_file” blocked both runs before file change/publication, leaving the same browser brief `not_started` with zero artifacts. SR-008 corrects the wording boundary without provider/policy expansion. |
| CR-MP-001 | Reachable; ordinary registry mismatch corrected | Reachable — earlier facet remains resolved | API-REV-002; CRR-005; SR-007; SR-008 | `read_file`/`write_file` remain absent from routed configs; complete handoff and relative publication remain intact. SR-008 corrects only the insufficient model-facing replacement name. |
| ARCH-DI-001 | Resolved | Resolved — confirmed | ARCH-REV-004; SR-004; SR-008 | SR-008 does not change native raw preparation, schema projection, or common Ajv invocation. |
| ARCH-DI-002 | Resolved | Resolved — confirmed | ARCH-REV-003; SR-003; SR-008 | SR-008 does not change catalog transition, participant lifecycle, staged commit, rollback, or unrelated-application preservation. |
| CR-DI-001 | Resolved in design/source | Resolved — confirmed | ARCH-REV-005; SR-005; IR-002; CRR-002; SR-008 | SR-008 does not change all-static application reservation or configured-MCP precedence. |

- New or remaining finding IDs: None at architecture design level.
- Material classification changes: Reopened `CR-DI-002` is closed at design level. `CR-MP-002` remains `Reachable` and is addressed by a bounded maintained-instruction correction. No generic `apply_patch` API/alias, provider exposure/security policy, application mutation, migration, logging, GraphQL, or UI contract is added.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: Focused implementation must replace “provider-native edit_file” prompt/Team/launch wording with built-in `apply_patch`, keep both native/normalized names out of configs, preserve complete handoff/relative publication/fail-closed behavior, and update proportionate contract coverage without modifying provider conversion. Source review must follow. Coverage investigation then decides whether to repair/execute the stale optional live integration; it is not Luna/browser proof. API/E2E must rerun the same supported browser journey and prove prompt contract, Codex `fileChange`, corresponding normalized `edit_file`, zero forbidden operations, exact member workspace/message/publication joins, and the final UI outcome. Durable coverage changes return through proportional code review before delivery resumes from DR-002.
