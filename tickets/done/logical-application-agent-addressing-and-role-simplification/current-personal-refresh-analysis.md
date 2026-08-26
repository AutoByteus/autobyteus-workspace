# Current Personal Refresh Analysis

Status: Current source-evidence supplement for SR-002. Approval applicability: N/A; this artifact revalidates the already approved behavior against the current implementation.

## 1. Bootstrap Result

- Repository: `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification`
- Ticket branch: `codex/logical-application-agent-addressing-and-role-simplification`
- Authoritative base: `origin/personal@4108786f4058ca83fd036df84666a2c846fd6401`
- Prior ticket source basis: `0811503a6c547698e7b77e1064d98890101acc1b`
- Prior solution commit: `d23f39d1b7eea49091d81ba9a4ee4f1745cda6ce`
- Protection: prior solution commit retained at branch `codex/logical-application-agent-addressing-and-role-simplification-pre-current-personal-refresh`.
- Refresh: the one prior solution-documentation commit was rebased onto exact current Personal; the refreshed pre-SR-002 ticket commit is `9e0f16975f5fbe9fcb84c924b8c75b2d9ac88a1d`.
- Reviewer-owned untracked `design-review-report.md` and `architecture-review-revision-record.md` were preserved without modification.

The branch now has current Personal as its exact merge base. This is a rebootstrap of the existing ticket, not a duplicate ticket and not an implementation merge.

## 2. Current-Source Conclusion

The approved clean-cut behavior remains justified. Current Personal still exposes the same redundant public three-way target selector and the same application-role fields:

1. `ApplicationAgentTargetAddress` repeats the binding-owned Agent-versus-Team subject through `target.kind`.
2. Team-member targeting exposes a physical `agentRunId` even though the binding already owns an exact canonical `memberAddress -> agentRunId` map.
3. `ApplicationAgentTargetAuthorizationService` loads the binding, but `ApplicationOrchestrationHostService` reloads it and reinterprets the public target for input.
4. `ApplicationAgentStreamRuntimeSource` reinterprets the public target again for member filtering.
5. `ApplicationAgentTeamBindingMember.runtimeKind` is assigned `AGENT_TEAM_MEMBER` at every production Team-member construction.
6. `ApplicationExecutionProducer.runtimeKind` is assigned at production construction sites, but no supported production consumer selects behavior from it. Where public classification is needed, the binding/event runtime subject already owns it.
7. Current stores persist the redundant role in JSON and the binding-member physical column, but every retained identity/display/address field already exists.

Therefore the root cause remains `Boundary Or Ownership Issue`, `Shared Structure Looseness`, and `Duplicated Policy Or Coordination`. The target remains one public logical address, one authorization-owned translation, one private exact target, smaller role-free models, and current-schema projection without a migration.

## 3. Current Production Spines

| Spine | Supported trigger | Current path | Current duplication | Target owner/result |
| --- | --- | --- | --- | --- |
| Input | application worker/backend sends Agent input | application SDK -> worker/communication transport -> orchestration host -> authorization -> binding reload -> Agent/Team scope command | public kind/run ID is interpreted in authorization and again in host | authorization returns one exact descriptor; host uses its binding snapshot and resolved execution target |
| Stream | Socratic lesson exposes `/tutor` target; frontend opens live tutor connection | lesson read -> physical target projection -> frontend connection/URL -> stream subscription -> authorization lease -> scope stream source -> event | application maps logical member to run ID; stream source branches on public address | application emits `/tutor`; authorization resolves once; source receives only the exact resolved execution target |
| Binding launch | application starts Agent or configured Team | launch request -> scope create -> binding launch service -> binding store/public binding | Team member role is a constant; standalone producer role is separately repeated | role-free current binding/context at construction; physical IDs retained |
| Return/event | run event or publication returns to application | scope source/context -> mapper/relay/journal -> SDK/application | producer role repeats enclosing subject or is unused | role-free producer with subject retained at its owning event/binding boundary |
| Recovery | host restarts with existing bindings/events/run metadata | persisted JSON -> store/metadata normalization -> recovery/reentry/stopped-run views | raw casts/spreads retain the obsolete role | current-schema codecs reconstruct only retained fields; no rewrite |
| Wire/package | backend/frontend/worker uses target | contracts -> URL/frame -> SDK/package/vendor copies | three old public variants and paths | one root/member address and one coordinated package cut |

## 4. Current-Personal Intersection

Current Personal adds the finalized provider/scope composition and stopped-run model-configuration ownership on files adjacent to this change. They do not invalidate the target, but they add preservation and transition obligations.

| Current-Personal owner | Current authority to preserve | Addressing-ticket disposition |
| --- | --- | --- |
| `ApplicationExecutionScope` + kernel builder | one graph-local application execution family, exact provider builder, scoped Agent Tools MCP authorities, seven outward capabilities, ordered lifecycle | no owner/lifecycle change; only tighten the streaming capability input so the scope contract owns its private resolved-target value and no longer imports an authorization-service type |
| `GeneralProcessRunSupervisor` | separate process execution family | no impact; no manager/session unification or routing |
| `ApplicationRunOwnershipService` | startup-gated read-only ownership proof for Studio stopped-run configuration | production service unchanged; binding fixture loses only the redundant member role |
| `StudioRunModelConfigService` | Application-owned runs stay read-only while active and become editable after terminal transition | preserved; Agent execution-context fixtures/projectors use the smaller producer |
| current provider/model validator | host-selected validator passed to general/application roots | no impact; provider `runtimeKind` and model behavior remain intact |
| `ApplicationRunBindingTerminalTransitionService` | terminal state and lookup cleanup | no impact; address authorization still fails against terminal binding exactly as today |

The refined private dependency shape is:

```text
ApplicationOrchestrationHostService / stream subscription
  -> ApplicationAgentTargetAuthorizationService
  -> AuthorizedApplicationAgentTargetDescriptor
  -> descriptor.runtime: ResolvedApplicationAgentExecutionTarget
  -> ApplicationExecutionScope Agent/Team input or streaming capability
```

`ResolvedApplicationAgentExecutionTarget` is defined by the scope capability contract, because it is the exact input accepted by scope streaming and the shared private value from which host input derives the existing subject-specific command arguments. The scope contract must not import the higher orchestration service merely to name the full authorization descriptor. The full descriptor stays orchestration-owned and additionally carries the authorized public address and binding snapshot required outside the scope.

The exact scope-owned value is discriminated and complete for current host dispatch and scope-streaming needs:

```ts
export type ResolvedApplicationAgentExecutionTarget =
  | Readonly<{
      subject: "AGENT_RUN";
      agentRunId: string;
      producer: ApplicationExecutionProducer;
    }>
  | Readonly<{
      subject: "TEAM_RUN";
      teamRunId: string;
      targetAgentRunId: string | null;
      producers: readonly ApplicationExecutionProducer[];
    }>;
```

Authorization owns the full descriptor `{ applicationId, address, binding, runtime }`. The scope owns neither public-address validation nor binding lookup; its streaming capability accepts only `runtime`, while host input extracts only the corresponding subject-specific IDs.

## 5. Material Premise Reachability

| Premise ID | Classification | Independent trigger / governing contract | Forward path and consequence | Design effect |
| --- | --- | --- | --- | --- |
| MP-001 | Reachable | user opens an active Socratic lesson with its live tutor | lesson read builds target -> GraphQL JSON -> frontend tutor session -> application-agent connection -> authorization/stream | public logical `/tutor` is a real supported product path, not aesthetic cleanup |
| MP-002 | Reachable | application worker sends root/member input or subscribes through the SDK contract | worker capability/communication -> host/stream -> authorization -> scope command/source | duplicate downstream interpretation can affect real dispatch/filter authority; one translation output is required |
| MP-003 | Reachable | existing installs restart with bindings, pending execution events, or Agent run metadata written by current production | current writers include role field -> restart reader -> recovery/stopped-run/publication paths | current-schema projection must accept supersets without rewrite |
| MP-004 | Not Reachable in this public contract | no supported application surface addresses dynamic task agents absent from the configured binding projection | task agents remain RootTeamRun-local and are not emitted in application binding members | do not add a generic run-ID fallback, manager lookup, or task-agent selector |
| MP-005 | Not Reachable as a reason for migration | removing an ignored JSON attribute does not prevent current readers from reconstructing retained identity | all retained fields exist; physical column can remain a write-only derived constant | no representation-only migration or dual read |

## 6. Persisted-Data Revalidation

Decision remains **Directly Usable — No Migration**.

- `__autobyteus_run_bindings.summary_json` contains a full binding superset. The target codec explicitly reconstructs the current binding and members.
- `__autobyteus_execution_event_journal.binding_json` and `producer_json` contain supersets. Journal hydration uses the same current binding/producer projectors.
- Agent `run_metadata.json.applicationExecutionContext` contains every retained context field plus producer role. Metadata normalization uses the current context projector.
- `__autobyteus_run_binding_members.runtime_kind TEXT NOT NULL` is not read to hydrate the binding. The writer keeps the derived constant `AGENT_TEAM_MEMBER`; changing the physical table provides no correctness benefit.
- `ApplicationAgentTargetAddress` itself is transient. Socratic computes `tutorTargetAddress` from the current binding during reads; its application database does not persist the target.

No version branch, alias, dual public contract, background rewrite, migration ledger entry, or compatibility field is justified.

## 7. Exact Current-Personal Transition Delta

The prior SR-001 inventory remains applicable, with these additions/corrections:

- `application-execution-scope-contracts.ts` defines `ResolvedApplicationAgentExecutionTarget`; it no longer imports `AuthorizedApplicationAgentTargetDescriptor` from the authorization service.
- `ApplicationAgentStreamSubscription` passes only `descriptor.runtime` to the scope-owned stream source.
- `ApplicationAgentStreamRuntimeSource` accepts the exact resolved execution target and never receives the public address or binding snapshot.
- `application-owned-studio-run-model-config.integration.test.ts` updates its application binding/context/address fixtures while preserving active-lock, recovery, terminal release, and no-post-terminal-dispatch proof.
- `application-run-ownership-service.test.ts` removes the member-role fixture while preserving startup gate, evidence agreement, nonterminal ownership, and terminal release.
- `studio-run-model-config-service.test.ts` removes the Agent producer role fixture while preserving active Application ownership and stopped-edit behavior.
- current modifications to `application-orchestration-host-service.test.ts` and `application-team-input-root-dispatch.test.ts` are governed by the clean logical address and descriptor-runtime-only assertions.

No new production service, store, schema, route, lifecycle owner, compatibility mechanism, or migration is added by the refresh.

## 8. Evidence

- Exact command/source audit: `evidence/solution/sr-002-current-personal-source-audit.log`.
- Current base: `4108786f4058ca83fd036df84666a2c846fd6401`.
- Current ticket source before SR-002 edits: `9e0f16975f5fbe9fcb84c924b8c75b2d9ac88a1d`.
