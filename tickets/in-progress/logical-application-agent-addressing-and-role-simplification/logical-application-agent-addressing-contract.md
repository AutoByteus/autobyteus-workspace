# Logical Application-Agent Addressing Contract

Status: Normative design supplement. Approved with requirements.

## 1. Target Current Contract

```ts
export type ApplicationAgentMemberAddress = `/${string}`;

export type ApplicationAgentTargetAddress = Readonly<{
  bindingId: string;
  memberAddress: ApplicationAgentMemberAddress | null;
}>;
```

Semantics:

- `bindingId` selects one application-owned live binding.
- `memberAddress: null` selects that binding's root. Authorization derives standalone Agent versus Team root from `binding.runtime.subject`.
- non-null selects one configured Team binding member by exact canonical rooted address.
- `/` is not a member selection; callers use `null` for the root.
- member addresses are already-trimmed, rooted, no trailing/repeated separators or backslashes, and contain no empty, `.` or `..` segment.

The contracts package adds a single canonical parser/guard for this external representation. It does not move or duplicate the full server Team-address domain API.

## 2. Binding And Producer Contraction

```ts
export type ApplicationAgentTeamBindingMember = Readonly<{
  memberAddress: ApplicationAgentMemberAddress;
  displayName: string;
  agentRunId: string;
}>;

export type ApplicationExecutionProducer = Readonly<{
  agentRunId: string;
  displayName: string | null;
}>;
```

Application-role `runtimeKind` is removed. The enclosing binding/event subject owns classification:

- Agent binding or event subject `AGENT_RUN` -> producer is the bound standalone Agent.
- Team binding or event subject `TEAM_RUN` -> producer is one Team member.

Provider launch/runtime `runtimeKind` fields remain unchanged and are a different concept.

## 3. Backend Builders

```ts
createApplicationAgentTargetAddress(
  binding: ApplicationAgentBinding | ApplicationAgentTeamBinding,
): ApplicationAgentTargetAddress

createApplicationAgentTeamMemberTargetAddress(
  binding: ApplicationAgentTeamBinding,
  memberAddress: ApplicationAgentMemberAddress,
): ApplicationAgentTargetAddress
```

The root builder validates binding identity/subject shape and returns `memberAddress:null`. The member builder canonical-validates the address and exact-matches one binding member. The separate old Team-root helper is removed because the root representation and behavior are identical after binding authorization.

## 4. Private Authorized Descriptor

```ts
type ResolvedApplicationAgentRuntimeTarget =
  | Readonly<{
      subject: "AGENT_RUN";
      agentRunId: string;
    }>
  | Readonly<{
      subject: "TEAM_RUN";
      teamRunId: string;
      targetAgentRunId: string | null;
    }>;

type AuthorizedApplicationAgentTargetDescriptor = Readonly<{
  applicationId: string;
  address: ApplicationAgentTargetAddress;
  binding: ApplicationAgentBinding | ApplicationAgentTeamBinding;
  runtime: ResolvedApplicationAgentRuntimeTarget;
  producers: readonly ApplicationExecutionProducer[];
}>;
```

Exact descriptor rules:

- Agent binding + null -> Agent runtime with one producer.
- Agent binding + non-null -> `INVALID_TARGET`.
- Team binding + null -> Team runtime, `targetAgentRunId:null`, all configured producers.
- Team binding + exact non-null -> Team runtime, exact matching `targetAgentRunId`, one producer.
- unknown member -> `INVALID_TARGET`.
- missing, terminal, orphaned, or cross-application binding retains current failure mapping.
- descriptor/address/binding/producers are cloned/frozen so downstream cannot mutate authorization evidence.

The descriptor is the one translation output. Input uses `runtime`; streaming uses `runtime`; event creation uses `address` and `runtime.subject`; input response uses `binding`. None reloads or reinterprets the public address.

## 5. Input Spine

```text
application SDK sendInput
  -> worker capability protocol
  -> ApplicationOrchestrationHostService
  -> ApplicationAgentTargetAuthorizationService
  -> AuthorizedApplicationAgentTargetDescriptor
  -> scope agentExecution/teamExecution command
  -> existing accepted/rejected/not-available result
```

Agent command receives `runtime.agentRunId`. Team command receives `runtime.teamRunId` and `runtime.targetAgentRunId`. The host returns `descriptor.binding`; no second store lookup occurs.

## 6. Stream Spine

```text
frontend/backend connect logical address
  -> canonical URL / worker subscription
  -> authorization lease
  -> descriptor
  -> ApplicationAgentStreamRuntimeSource
  -> exact Agent run or Team run/member filter
  -> mapped event with original logical address
  -> READY/event equality
```

The stream source must not branch on `descriptor.address`. Team root attaches without a member filter; member target filters by `runtime.targetAgentRunId`.

## 7. URL Contract

- root: `/{encode(bindingId)}/targets/root`
- member: `/{encode(bindingId)}/targets/member/{encode(memberAddress)}`

The entire rooted member address is one percent-encoded segment. Decoder rejects empty/trailing/repeated path separators, query/fragment, wrong arity/literals, malformed percent encoding, `/` as member, and noncanonical member address. Old `agent-run`, `agent-team-run`, and `agent-team-member/<runId>` routes are removed and rejected.

## 8. Current-Schema Projection

### Binding summary

One `ApplicationRunBindingRecordCodec` validates and reconstructs the current record. Team members are projected from exactly `memberAddress`, `displayName`, and `agentRunId`; unknown properties are ignored uniformly. Public projection also reconstructs fields explicitly and never spreads persisted member objects.

### Producer / execution context

One `ApplicationExecutionProducerProjector` validates/reconstructs `{agentRunId,displayName}`. It is reused by:

- execution-event journal hydration;
- Agent run metadata execution-context normalization;
- current binding -> producer authorization projection;
- application context/publication construction.

There is no `if old version`, missing-field fallback, dual producer type, or rewrite. An old extra `runtimeKind` is simply not a recognized current field.

### Physical member table

The existing `runtime_kind TEXT NOT NULL` column remains. It is not read into the current model. The writer always supplies `AGENT_TEAM_MEMBER` as a derived storage constant. This avoids a physical table rewrite with no behavioral benefit.

## 9. Allowed / Forbidden Dependencies

Allowed:

- public caller -> logical SDK address;
- URL/IPC transport -> same public address;
- orchestration -> authorization service;
- authorization -> binding store/current projector;
- input/stream -> private descriptor only;
- persistence stores -> current-schema codecs/projectors.

Forbidden:

- public address -> target kind or run ID;
- application code -> logical-member-to-run-ID addressing projection;
- input/stream -> descriptor plus binding store/public address interpretation;
- producer/member -> application-role runtimeKind;
- current readers -> version-specific branches, compatibility fields, or dual shapes;
- SDK/server -> ambiguous generic ID or task-agent lookup.

## 10. Persisted Data Decision

`Directly Usable — No Migration`.

Representative old shapes contain every retained field:

```json
{"memberAddress":"/tutor","displayName":"Tutor","agentRunId":"run-1","runtimeKind":"AGENT_TEAM_MEMBER"}
```

projects to:

```json
{"memberAddress":"/tutor","displayName":"Tutor","agentRunId":"run-1"}
```

and:

```json
{"agentRunId":"run-1","displayName":"Tutor","runtimeKind":"AGENT_TEAM_MEMBER"}
```

projects to:

```json
{"agentRunId":"run-1","displayName":"Tutor"}
```

The address contract itself has no current durable store; Socratic computes it from a binding for each read.
