# Requirements Doc

## Status

`Design-ready — SR-003 downstream design-impact reconciliation` — the approved logical-address behavior remains fixed. CRR-003 exposed a pre-existing live-worker timeout that contradicts the already-synchronous maintained-application outcome required by REQ-008 / AC-018; SR-003 corrects the internal completion design without adding a public API or product contract.

## Goal / Problem Statement

Replace the application-facing physical target selector with one logical binding-owned address, make authorization the sole logical-to-exact identity translator, and remove redundant application-role classifications from bindings/producers without changing provider `runtimeKind` or execution behavior.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Public target address contains `bindingId` plus `target.kind`; Team members repeat exact `agentRunId`. | Public address is exactly `{ bindingId, memberAddress }`; `null` means bound root, canonical rooted address means exact Team member. | Binding authorization, liveness, application ownership, and fail-closed validation remain authoritative. | REQ-001–REQ-003; AC-001–AC-004 |
| BEH-002 | Backend application code maps logical member address to binding member `agentRunId` before building a target. | Backend helper accepts the logical member address and checks it against the binding; application code never selects the physical run ID for addressing. | Public bindings retain physical run IDs for correlation/artifacts/lifecycle where they remain meaningful. | REQ-002; AC-002, AC-005 |
| BEH-003 | Authorization resolves a binding, but input reloads/reinterprets the public target and streaming inspects it again. | Authorization returns one complete private descriptor. Host dispatch derives only from its scope-owned resolved target; stream subscription passes that target to scope streaming. Downstream does not reload or reinterpret the public selector. | Same subject-specific Agent/Team input commands, root Team semantics, member filtering, lease, and terminal behavior. | REQ-003, REQ-004; AC-003, AC-006, AC-007 |
| BEH-004 | URL/READY/event contracts encode three public target kinds and compare the nested target object. | URL/READY/event contracts encode/validate/compare root-versus-logical-member only. | Exact frame validation, protocol failure behavior, reconnect, and Studio/standalone parity. | REQ-005; AC-008–AC-010 |
| BEH-005 | Every Team binding member carries constant application-role `runtimeKind`; every producer repeats a role that is either derivable at its event/binding boundary or unused by its supported context consumer. | Remove both application-role `runtimeKind` fields; producer remains exact `{ agentRunId, displayName }`. | Provider launch `runtimeKind` such as AutoByteus/Codex/Claude remains untouched. | REQ-006; AC-011–AC-013 |
| BEH-006 | Binding summaries, event journals, and run metadata may contain now-redundant `runtimeKind` JSON; physical member table has a NOT NULL role column. | Current-schema projectors accept JSON supersets, ignore redundant extras, and write current shapes; physical column remains a derived constant. | Existing rows, pending events, run recovery, binding recovery, and data meaning remain directly usable. | REQ-007; AC-014–AC-016 |
| BEH-007 | Maintained applications, SDK copies, and tests use the old address and role fields. The synchronous application API also contains two independent internal 30-second correlation deadlines that can return failure while cold accepted work continues. | All supported callers and generated/vendored outputs move atomically to the new address contract. Application work remains synchronously completion-coupled across both internal JSON-RPC directions, so a live transport does not report a local timeout while work continues. | Business results, domain/provider errors, package parity, publication, streaming, application UI outcomes, and bounded engine startup/stop remain the same. No async operation/status/idempotency API is introduced. | REQ-008; AC-017, AC-018 |

## Investigation Findings

- Binding runtime subject already distinguishes Agent versus Team; public `AGENT_RUN` versus `AGENT_TEAM_RUN` repeats binding-owned information.
- Team bindings map stable canonical `memberAddress` to physical `agentRunId`; current production assigns `AGENT_TEAM_MEMBER` to every member.
- At event/binding boundaries, producer application role is determined by the enclosing runtime subject. Context-only consumers do not select behavior from `producer.runtimeKind`; no production consumer makes a distinct decision from it.
- The authorization service already loads the binding and is the correct single translation owner, but current input and streaming paths bypass its resolved result.
- Persisted JSON contains all fields needed by the smaller current schema. Normal, version-agnostic projection can ignore extras; no address itself is durably stored.
- Current Personal's finalized `ApplicationExecutionScope`, scoped Agent Tools MCP authority, provider composition, stopped-run model-configuration ownership, and separate `GeneralProcessRunSupervisor` do not change those conclusions and remain preserved baselines.
- Current `application-execution-scope-contracts.ts` imports the complete orchestration authorization descriptor only to type streaming. The target instead makes the scope contract own the narrow private resolved execution target; the full authorization descriptor remains orchestration-owned.
- CRR-003/API-REV-001 proved that both application-worker correlation clients expire at 30 seconds without cancellation or commit disposition. The existing API is synchronous and both maintained applications await the nested capability result, so the proportionate correction is completion-coupled application work plus abort-before-failure deadlines only for startup/stop control.

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Requirements | Criteria | Status / Approval | Relationship |
| --- | --- | --- | --- | --- | --- |
| `logical-application-agent-addressing-contract.md` | exact public/private/producer/persistence contracts | REQ-001–REQ-007 | AC-001–AC-016 | Approved with requirements | Normative |
| `logical-application-agent-addressing-transition-inventory.md` | exact file/package/test/data proof inventory | REQ-001–REQ-008 | AC-001–AC-018 | N/A approval | Implementation completeness |
| `current-personal-refresh-analysis.md` | current-base bootstrap, source-spine, reachability, persistence, and intersection proof | REQ-001–REQ-008 | AC-001–AC-018 | N/A approval | Current source evidence |
| `application-worker-operation-completion-contract.md` | exact SR-003 application-work/control completion, ownership, state, dependency, and proof contract | REQ-008 | AC-018 | N/A approval; derived technical correction | Normative design supplement |

## Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` and `Refactor`
- Initial design issue signal: `Yes`
- Root cause classification: `Shared Structure Looseness`, `Boundary Or Ownership Issue`, and `Duplicated Policy Or Coordination`
- Refactor posture: `Likely Needed`
- Evidence basis: the public address repeats binding authority and physical identity; downstream reinterprets it; role fields are constants/derivable; application code performs manual logical-to-physical mapping.
- Requirement impact: clean versioned contract replacement with no compatibility path; user-visible targeting semantics become simpler while execution behavior is preserved.

## Recommendations

Adopt one root/member logical address, one authorization-owned complete descriptor containing one scope-owned resolved target, and smaller current binding/producer shapes. Use current-schema projectors for existing JSON and keep the physical member role column as an implementation constant.

## Scope Classification

`Large` — SDK contracts, URL/frame protocol, server orchestration/streaming, maintained applications, persistence projections, package regeneration, and broad durable coverage change atomically.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: application code addresses a bound standalone Agent or Team root.
- UC-002: application code addresses an exact configured nested Team member by logical rooted address.
- UC-003: application input authorization/dispatch uses the one authorization descriptor and its resolved execution target.
- UC-004: frontend/backend event streaming uses the same logical address and passes only the resolved execution target into scope streaming.
- UC-005: binding, lifecycle, artifact, and execution events expose smaller role-free producers/members.
- UC-006: existing binding/event/run metadata remains directly usable across restart/recovery.
- UC-007: maintained Brief/Socratic packages and both hosts retain behavior, including cold/reentry synchronous mutation completion without a live-worker local-timeout failure.

### Out of Scope

- Provider composition, execution-scope ownership, per-application scopes, Team execution identity, provider launch `runtimeKind`, removing physical run IDs from binding summaries, or changing artifact APIs.
- Addressing dynamic task agents not present in the binding member projection; public member target remains exact to configured binding members.
- Compatibility aliases, dual address protocols, version negotiation, or migration solely for representation cleanup.
- A new public asynchronous operation/status API, cancellation protocol, idempotency key, automatic retry, mutation journal, or Brief/Socratic schema change. The correction preserves the existing synchronous completion contract.

### Preserved Behavior Boundary

BEH-001–BEH-007 are fixed. Exact binding/application authorization, Team root input/stream behavior, configured nested member validation, durable recovery, event ordering, physical run correlation, provider selection, RootTeamRun-local delegation, dual-host behavior, genuine domain/provider errors, and bounded engine startup/stop must not regress. The already-synchronous application API remains synchronous; internal transport correlation may not invent a timeout failure while the live remote operation continues.

### Review Authority

- Blocking findings must cite an approved BEH/REQ/AC.
- Adding task-agent addressing, changing provider runtime selection, removing binding run IDs, requiring destructive migration, or introducing a public async status/idempotency/cancellation/retry contract is a Requirement Gap.
- Provider composition and execution-scope ownership are finalized current-Personal baselines and are not reopened here.

## Functional Requirements

- **REQ-001:** `ApplicationAgentTargetAddress` shall be the exact readonly shape `{ bindingId: string; memberAddress: ApplicationAgentMemberAddress | null }`; `null` means the bound root, never an unknown/implicit default.
- **REQ-002:** `ApplicationAgentMemberAddress` shall be a canonical rooted non-root Team member path. The backend SDK shall build root addresses for Agent or Team bindings and member addresses by exact binding member match; it shall not accept a member `agentRunId`.
- **REQ-003:** `ApplicationAgentTargetAuthorizationService` shall validate the public address, load exactly one binding, authorize application/status, resolve runtime subject and exact physical IDs, and produce the sole private `AuthorizedApplicationAgentTargetDescriptor`.
- **REQ-004:** The orchestration host and stream-subscription boundary shall use the private descriptor without reloading the binding or reinterpreting the public address. Host input shall discriminate only `descriptor.runtime` and pass its exact IDs to the existing subject-specific Agent/Team commands. Scope streaming shall receive `descriptor.runtime`, not the public address, binding snapshot, or complete orchestration-owned descriptor. The descriptor shall carry the current public binding snapshot needed for input return semantics.
- **REQ-005:** SDK URL codec, websocket READY/event validation/equality, engine protocol, backend mount transport, and server communication/stream endpoints shall use only the new address contract. Root URL and member URL shall be canonical and fail closed.
- **REQ-006:** Remove application-role `runtimeKind` from `ApplicationAgentTeamBindingMember` and `ApplicationExecutionProducer`. Keep producer `agentRunId` and `displayName`; keep all provider/launch/runtime model `runtimeKind` fields unchanged.
- **REQ-007:** Existing binding summary JSON, event-journal binding/producer JSON, and run metadata execution-context JSON shall be read by strict current-schema projectors that ignore unknown extras uniformly. No version branch or rewrite is allowed. The physical binding-member `runtime_kind` column remains and is always written as the derived constant `AGENT_TEAM_MEMBER`.
- **REQ-008:** Update every supported SDK/application/server/package consumer atomically, regenerate owned copies, remove the old unions/helpers/fields, and preserve all existing functional outcomes. For the existing synchronous application-work surface, preserve the actual remote completion/error result across both internal JSON-RPC directions; a local live-transport deadline shall not return failure while the operation is still allowed to continue. Engine startup/stop may remain bounded only when timeout failure is preceded by worker termination and close wait.

## Acceptance Criteria

- **AC-001:** Agent and Team root builders both return `{ bindingId, memberAddress: null }`; authorization derives their different runtime subjects from the binding.
- **AC-002:** Team member builder accepts `/tutor` and nested `/StudentStudyGroup/student_one`, exact-matches the binding, and rejects `/`, malformed, absent, or non-member paths.
- **AC-003:** Agent binding plus non-null member and Team binding plus unknown member fail `INVALID_TARGET`; missing/terminal binding retains current `TARGET_NOT_AVAILABLE` behavior.
- **AC-004:** No public address contains `target`, `kind`, or `agentRunId` after package regeneration.
- **AC-005:** Socratic derives its tutor target directly from `/tutor` without manually extracting the tutor run ID.
- **AC-006:** `sendRunInput` authorizes once, uses descriptor exact IDs, does not reload/reinterpret, and returns the descriptor's binding snapshot.
- **AC-007:** stream runtime source receives only the exact resolved subject/team/member target; it has no public address or binding dependency. Team root observes all member events and a logical member observes exactly its bound member.
- **AC-008:** URL codec round-trips root and nested member addresses and rejects malformed encoding, unknown segments, root-as-member, query/fragment, or noncanonical member paths.
- **AC-009:** READY and event address equality compares exactly bindingId/memberAddress and rejects old/extra shapes.
- **AC-010:** communication socket, worker capability protocol, reconnect, and close/error semantics remain unchanged apart from the clean address schema.
- **AC-011:** Team binding members contain only `memberAddress`, `displayName`, and `agentRunId`.
- **AC-012:** producers contain only `agentRunId` and `displayName`; event `runtimeSubject` and binding runtime subject remain the classification authority where classification is required, and context-only consumers remain behaviorally unchanged without a role.
- **AC-013:** repository occurrence proof finds no application-role `runtimeKind`, while provider/launch `runtimeKind` remains present and tested.
- **AC-014:** a representative old binding JSON member with extra `runtimeKind` projects to the current member shape and is usable without rewrite.
- **AC-015:** representative old event-journal producer and run-metadata execution context with extra `runtimeKind` project to current producer/context and remain dispatchable/restorable.
- **AC-016:** existing SQLite schema is unchanged; new member writes keep `runtime_kind = 'AGENT_TEAM_MEMBER'`; no migration ledger/version changes.
- **AC-017:** SDK packages, vendored/generated maintained-application copies, README/examples, and exact package parity use one new contract with no aliases.
- **AC-018:** focused plus realistic Studio/standalone tests preserve launch, root/member input, root/member stream, artifact projection, restart/recovery/reentry, and cleanup. Cold/reentry application mutations that exceed 30 seconds return the actual completion/domain-error result rather than an internal timeout while work continues; startup/stop deadline proof confirms abort-before-failure.

## Constraints / Dependencies

- Base `origin/personal@4108786f4058ca83fd036df84666a2c846fd6401`; the ticket branch has this exact commit as merge base.
- Clean versioned API change: no compatibility layer.
- Binding-owned member mapping remains the exact authorization source.
- Physical IDs remain mandatory inside the server and in binding/event correlation where meaningful.
- Finalized application execution-scope/provider composition, model-config validator, run-ownership guard, Agent Tools MCP authority, shutdown order, and general/application execution-family separation remain unchanged.
- The public `ApplicationGraphqlRequest`, command/route APIs, maintained application schemas, and persisted data remain unchanged by the completion correction; transport-local JSON-RPC IDs remain internal correlation only.

## Persisted Data Outcome (When Applicable)

- Stored subject: platform SQLite binding summaries/member rows/execution-event journal; Agent run `run_metadata.json` execution context.
- Required outcome: `Directly Usable — No Migration`.
- Preserve: bindings, pending events, recovery identity, run metadata, application/session state.
- Unacceptable: data rewrite, dropped event, invalid restored execution context, or silent fallback.
- Constraints: current-schema projection must be uniform and version-agnostic; physical schema remains unchanged.
- Related IDs: REQ-007; AC-014–AC-016.

## Assumptions

- Public member selection is restricted to configured binding members; current product provides no supported dynamic task-agent address surface.
- Old JSON includes `agentRunId` and `displayName`, so removing `runtimeKind` is a schema contraction, not a missing-data expansion.
- No current durable store persists `ApplicationAgentTargetAddress`; Socratic computes it for reads and uses it transiently.

## Risks / Open Questions

- Package generation must prove no stale old contract survives in maintained application copies.
- Architecture review must validate complete-descriptor versus scope-owned resolved-target ownership and current-schema projector ownership.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001–REQ-002 | UC-001, UC-002, UC-007 |
| REQ-003–REQ-004 | UC-003, UC-004 |
| REQ-005 | UC-003, UC-004, UC-007 |
| REQ-006 | UC-005, UC-007 |
| REQ-007 | UC-006 |
| REQ-008 | UC-001–UC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Criteria | Scenario Intent |
| --- | --- |
| AC-001–AC-005 | public address/build/authorization behavior |
| AC-006–AC-010 | input/stream/protocol exact descriptor flow |
| AC-011–AC-013 | role-field contraction |
| AC-014–AC-016 | direct-use persistence proof |
| AC-017–AC-018 | atomic package and realistic regression proof |

## Approval Status

Approved by the user on 2026-08-26 as a separate ticket after provider composition. The user requested a simple spine, clear authoritative boundary, explicit dependencies, and removal of redundant attributes rather than a compatibility-preserving rewrite. SR-002 revalidated the same approved behavior against exact current Personal. SR-003 makes the internal completion obligation already implied by REQ-008 / AC-018 explicit after real cold-path evidence; it keeps the synchronous public contract and does not introduce a new product policy. User approval remains applicable. Any async status, idempotency, cancellation, or retry protocol would be a new Requirement Gap and is explicitly excluded.
