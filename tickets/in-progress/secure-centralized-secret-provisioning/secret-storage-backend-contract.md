# Secret Storage Backend Contract

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning/tickets/in-progress/secure-centralized-secret-provisioning/secret-storage-backend-contract.md`.
- Purpose: define the use-case-validated management-service, backend, physical Store, lifecycle, status, exact LLM/media construction authentication, separately preserved live-metadata request boundary, external-runtime exclusion, explicit Local import, and legacy-source non-authority contracts.
- Scope: UC-001–UC-008 and UC-011–UC-019; REQ-001, REQ-002, REQ-004–REQ-008, REQ-010–REQ-020.
- Status: `Original Gemini Metadata Preservation Reconciliation; Architecture Re-review Required`.
- Approval applicability: `Required`; prior importer/no-automatic-update/Codex/Claude contracts remain approved. Corrected CR-021 preserves the user-confirmed original dual-key Gemini metadata contract and authorizes no source redesign.
- Core artifacts supported: [requirements.md](./requirements.md), [investigation-notes.md](./investigation-notes.md), [design-spec.md](./design-spec.md).
- Related supplements: [use-case-spine-validation.md](./use-case-spine-validation.md), [secret-storage-architecture.md](./secret-storage-architecture.md), [credential-consumer-mapping.md](./credential-consumer-mapping.md), [live-test-secret-provisioning.md](./live-test-secret-provisioning.md), [threat-model-and-option-analysis.md](./threat-model-and-option-analysis.md).

## Authoritative Dependency Direction

```text
Settings/startup transport -> subject-specific service
runtime request -> subject-specific consumer provisioning service
subject/provisioning service -> SecretManagementService
SecretManagementService -> one injected SecretStorageBackend
SecretStorageBackend -> selected custody implementation
consumer provisioning service -> credential-agnostic factory -> trusted provider SDK
LLM/media provisioning -> exact Gemini resolved variant -> gemini-helper -> exact Google SDK options
Codex runtime selection -> existing CodexAppServerClient -> codex app-server with external Codex-owned login state
Claude SDK request -> ClaudeSdkClient -> ClaudeRuntimeAuthenticationService
ClaudeRuntimeAuthenticationService -> SecretManagementService (managed-secret only)
ClaudeSdkClient -> exact Claude Code child
AutoByteus model catalog trigger -> AutobyteusRemoteModelDiscoveryService
AutobyteusRemoteModelDiscoveryService -> SecretManagementService -> core remote provider/factory
explicit PNPM import command -> LocalEnvironmentSecretImportService -> internal Local setup batch -> one selected Local Store
server startup -> non-secret AppConfig projection + current custom-provider reader -> untouched/non-authoritative legacy sources or value-free v1 guidance
```

Rules:

1. `SecretManagementService` is above the backend and owns secret lifecycle/resolution/status policy.
2. Provider/search/media/metadata services, the AutoByteus remote discovery service, and the Claude runtime-authentication service call the management service, never an adapter.
3. A backend owns custody translation and physical location mapping from a validated definition ID using bootstrap-bound adapter configuration.
4. Backend selection/configuration belongs to `SecretStorageConfigurationService`, separately from provider credential lifecycle.
5. Individual LLM/search/media clients receive resolved authentication only. They do not import management, backends, Local Store, future vendor SDKs, or `AppConfig`. `ClaudeSdkClient` is a server runtime boundary and may receive only the ephemeral authentication result from `ClaudeRuntimeAuthenticationService`; it never resolves or selects storage itself.
6. Existing subject-specific GraphQL surfaces remain entrypoints. No generic read/list/path API exists.
7. The explicit Local import CLI is a setup/operator boundary, not a management/runtime API. Its caller supplies only a required absolute source path, a closed `default|e2e` target, and dry-run/overwrite flags. The owner resolves target paths internally and never calls or widens `SecretManagementService` or the generic backend port.
8. Startup performs no automatic legacy credential update. `AppConfig` admits approved non-secret settings by name before value retention and preserves excluded source lines; the current custom-provider store accepts v2 only and maps untouched v1 to stable value-free guidance. No credential alias/custom-v1 value becomes runtime authority or fallback, and the later Prisma-backed app-data migration runner remains unchanged.
9. LLM/media provisioning preserves `GEMINI_SETUP_MODE` as one exact resolved authentication variant. `gemini-helper.ts` is the sole Google SDK option mapper and cannot infer/fall back between modes.
10. Codex is not a secret-management consumer. `CodexAppServerClient` preserves the single pre-ticket external-login launch environment/home; it never calls management/backend/account RPC or receives a Store definition. Its inherited environment is outside the `LOCAL_HARDENED` child-environment contract.

## Use-Case-Validated Identity Model

### Secret definition identity

```ts
type SecretDefinitionId = string & { readonly __brand: "SecretDefinitionId" };
```

Representative product-owned values:

```text
provider.openai.api-key
provider.anthropic.api-key
provider.gemini.ai-studio-api-key
provider.google.vertex-express-api-key
provider.autobyteus.api-key
provider.openai-compatible.<provider-uuid>.api-key
search.serper.api-key
search.serpapi.api-key
search.vertex-ai.api-key
```

Dynamic custom-provider IDs are derived from an immutable provider UUID plus a fixed suffix. The current runtime catalog contains definitions and consumer bindings only. Legacy environment aliases live in one immutable historical source-policy map reused by non-secret exclusion and the explicit Local importer; they do not remain on current definitions.

### Consumer identity

```ts
type SecretConsumerIdentity =
  | { kind: "llm"; providerId: string; credentialSlot: SecretCredentialSlot }
  | { kind: "llmMetadata"; providerId: string; credentialSlot: SecretCredentialSlot }
  | { kind: "search"; providerId: string; credentialSlot: SecretCredentialSlot }
  | {
      kind: "media";
      mediaKind: "audio" | "image" | "video";
      providerId: string;
      credentialSlot: SecretCredentialSlot;
    }
  | {
      kind: "agentRuntime";
      runtimeKind: "claude_agent_sdk";
      credentialSlot: "apiKey";
    }
  | {
      kind: "modelDiscovery";
      modelKind: "llm" | "audio" | "image";
      providerId: "AUTOBYTEUS";
      credentialSlot: "apiKey";
    };

type SecretCredentialSlot =
  | "apiKey"
  | "geminiAiStudioApiKey"
  | "geminiVertexExpressApiKey";
```

The slot distinguishes the two approved Gemini API-key modes without introducing a generic selector; ordinary API-key providers use `apiKey`. The binding catalog maps the complete identity to one allowed definition. An incompatible provider/subject/slot combination is rejected before backend access.

For `llm` and `media` construction identities, `providerId` means the credential owner and is populated exclusively from the construction target's required `credentialProviderId`. It is never copied or inferred at provisioning time from displayed/creator model provider. The construction target deliberately exposes no displayed provider field.

The exact Claude identity maps to the existing definition `provider.anthropic.api-key`. It does not create a second Claude-specific definition or stored value. Native Anthropic LLM and metadata identities remain separately authorized to the same definition. The Claude identity is valid only for explicit `managed-secret`; `cli` mode never constructs it or calls `resolveForUse`.

The three exact AutoByteus discovery identities plus `llm/AUTOBYTEUS/apiKey` and `media/{audio|image}/AUTOBYTEUS/apiKey` map to `provider.autobyteus.api-key`. No other discovery provider/model kind is authorized in first delivery. Hosts are non-secret configuration and never a consumer/definition attribute. No configured hosts means the discovery service never constructs a consumer or calls management.

### Removed generic scope and address

There is no `SecretScope` containing organization/deployment/environment/node attributes. No current or approved use case supplies those product identities.

There is no caller-visible `SecretStorageAddress`, `scopePath`, Vault path, local file path, cloud ARN, or namespace selector. A backend instance is constructed from trusted bootstrap configuration with one physical custody location. Its operation accepts only a catalog-validated definition ID. The Local backend's database/key paths are deployment/bootstrap configuration and never consumer or GraphQL request input.

## Tight Definition And Value Shapes

```ts
type SecretBinding = {
  definitionId: SecretDefinitionId;
  consumer: SecretConsumerIdentity;
};

class SecretValue {
  static fromString(value: string): SecretValue;
  revealToTrustedConsumer(): string;
  toString(): "<redacted-secret>";
  toJSON(): "<redacted-secret>";
}

type SaveSecretForConsumerRequest = {
  consumer: SecretConsumerIdentity;
  value: SecretValue;
};
```

`SecretBinding` does not duplicate provider display metadata, purpose prose, sensitivity constants, Store policy, legacy aliases, or validation policy. Those belong respectively to existing provider metadata, documentation, backend bootstrap, historical exclusion/import policy, and subject services.

`SecretValue` has a private/non-enumerable representation. Node inspection, string conversion, and JSON are redacted. There is no plaintext clone/serialization method. This is accidental-output protection, not a claim that trusted JavaScript memory is opaque.

## Management Service Contract

```ts
interface SecretManagementService {
  saveForConsumer(request: SaveSecretForConsumerRequest): Promise<ManagedSecretStatusResult>;
  removeForConsumer(consumer: SecretConsumerIdentity): Promise<ManagedSecretStatusResult>;
  getStatusForConsumer(consumer: SecretConsumerIdentity): Promise<ManagedSecretStatusResult>;
  resolveForUse(consumer: SecretConsumerIdentity): Promise<SecretValue>;
  getBackendHealth(): Promise<SecretBackendHealth>;
}
```

| Operation | Required Inputs | Success | Idempotency / Atomicity | Forbidden Result |
| --- | --- | --- | --- | --- |
| `saveForConsumer` | semantic consumer identity, `SecretValue` | configured status | catalog maps identity; one atomic create-or-replace matching the existing Settings save journey; no caller CAS contract | old/new value or storage revision |
| `removeForConsumer` | semantic consumer identity | missing status | catalog maps identity; missing is success | removed value |
| `getStatusForConsumer` | semantic consumer identity | backend health plus nullable healthy-only definition state | catalog maps identity; read-only | impossible health/state combination or value hint |
| `resolveForUse` | semantic consumer identity | exactly one `SecretValue` | management service resolves and authorizes the catalog binding | arbitrary name/path/list/GraphQL access |
| `getBackendHealth` | none | value-free health | read-only | bootstrap credential/config echo |

Callers do not resolve a binding through one component and then pass a duplicate expected definition to the management service. The management service owns the catalog lookup and backend call as one authoritative boundary. It checks lifecycle capability before writes and emits a value-free operation event using existing/request-generated diagnostic context; callers do not supply an invented user or generic scope. Claude support reuses this exact method: there is no `resolveClaudeSecret`, definition-ID input, backend handle, or raw GraphQL/runtime read API.

## Minimal Status And Capability Model

```ts
type SecretDefinitionStorageState = "MISSING" | "CONFIGURED";

type WritableSecretLifecycleCapability = { kind: "WRITABLE" };
type ExternallyManagedSecretLifecycleCapability = {
  kind: "EXTERNALLY_MANAGED";
  instructionCode: string;
};
type SecretLifecycleCapability =
  | WritableSecretLifecycleCapability
  | ExternallyManagedSecretLifecycleCapability;

type ManagedSecretStatus = {
  storageState: SecretDefinitionStorageState;
  lifecycle: SecretLifecycleCapability;
};

type ReadySecretBackendHealth = { state: "READY" };
type NonReadySecretBackendHealth =
  | { state: "LOCKED"; instructionCode: "SECRET_BACKEND_LOCKED" }
  | {
      state: "UNAVAILABLE";
      instructionCode:
        | "SECRET_BACKEND_UNAVAILABLE"
        | "SECRET_BACKEND_KIND_NOT_INSTALLED";
    }
  | { state: "CORRUPT"; instructionCode: "SECRET_BACKEND_CORRUPT" }
  | {
      state: "INCOMPATIBLE";
      instructionCode: "SECRET_BACKEND_INCOMPATIBLE";
    };
type SecretBackendHealth =
  | ReadySecretBackendHealth
  | NonReadySecretBackendHealth;

type ManagedSecretStatusResult =
  | { health: ReadySecretBackendHealth; secret: ManagedSecretStatus }
  | { health: NonReadySecretBackendHealth; secret: null };

type ProviderCredentialValidationState =
  | "UNVERIFIED"
  | "VALID"
  | "INVALID"
  | "VALIDATION_UNAVAILABLE";
```

The tagged lifecycle capability replaces overlapping booleans. Health and definition state are a discriminated result: `secret` exists only with `READY`; every non-ready variant has `secret: null` and an exact instruction code. This makes impossible health/state/code combinations unrepresentable rather than relying only on prose validation. Startup/open failures map as follows: temporarily inaccessible key/lock is `LOCKED`, dependency/path unreachable is `UNAVAILABLE`, partial pair/verifier/record-authentication failure is `CORRUPT`, and unsupported schema/encryption/verifier version is `INCOMPATIBLE`. The server starts a degraded value-free configuration/Settings/health control plane for non-ready states, while writes, resolve, provider validation, and provider construction fail closed. Stable instruction codes contain no path or value. Subject services own provider validation only at ready health. Status omits the internally mapped definition ID, generic message/retry flags, version/timestamps/backend kind/value hints, and physical/bootstrap data.

The outward mapping is closed and stable:

| Condition | Health | Instruction code |
| --- | --- | --- |
| healthy backend and authenticated Store/key pair | `READY` | `null` |
| live lock or temporarily inaccessible unlock material | `LOCKED` | `SECRET_BACKEND_LOCKED` |
| configured dependency/path cannot be reached | `UNAVAILABLE` | `SECRET_BACKEND_UNAVAILABLE` |
| partial pair, wrong/swapped key, verifier failure, or authenticated-record failure | `CORRUPT` | `SECRET_BACKEND_CORRUPT` |
| unsupported schema/encryption/verifier version | `INCOMPATIBLE` | `SECRET_BACKEND_INCOMPATIBLE` |
| unregistered backend kind (configuration plane; no backend is constructed) | `UNAVAILABLE` | `SECRET_BACKEND_KIND_NOT_INSTALLED` |

`SecretStorageConfigurationService` always owns the selected configuration and current bootstrap outcome. When a registered backend object can be constructed, that backend owns its lifecycle health even if it cannot open a usable Store handle; its secret operations remain closed until `READY`. When the kind is not registered, no substitute backend is created: the configuration service exposes only the value-free `UNAVAILABLE` outcome. This keeps the control plane available without pretending that a fallback custody boundary exists.

## Backend Ports

```ts
interface SecretStorageBackendOperations {
  getStatus(definitionId: SecretDefinitionId): Promise<BackendSecretStatus>;
  resolve(definitionId: SecretDefinitionId): Promise<SecretValue>;
  health(): Promise<SecretBackendHealth>;
  close(): Promise<void>;
}

type BackendSecretStatus = {
  storageState: "MISSING" | "CONFIGURED";
};

interface WritableSecretStorageBackend extends SecretStorageBackendOperations {
  readonly lifecycle: WritableSecretLifecycleCapability;
  save(definitionId: SecretDefinitionId, value: SecretValue): Promise<void>;
  remove(definitionId: SecretDefinitionId): Promise<void>;
}

interface ExternallyManagedSecretStorageBackend extends SecretStorageBackendOperations {
  readonly lifecycle: ExternallyManagedSecretLifecycleCapability;
}

type SecretStorageBackend =
  | WritableSecretStorageBackend
  | ExternallyManagedSecretStorageBackend;
```

Backend invariants:

- operations receive exactly one validated logical definition ID;
- the discriminated backend union makes writable and externally managed lifecycle states mutually exclusive and narrows write methods only on the writable variant;
- the adapter maps that ID under its bootstrap-configured physical location;
- save is one atomic create-or-replace at the backend consistency boundary;
- missing remove is idempotent;
- configuration/authentication is supplied at bootstrap, never per request;
- failure never falls back to another backend, another Store, `.env`, or `process.env`;
- `close()` releases clients/database handles and temporary references as far as the runtime permits.

Cross-Store copy is absent from runtime, hidden-input setup, and explicit import contracts. An ordinary server backend is bound to one Store and cannot select another. `LocalSecretStoreProvisioningService` is constructed with only the exact writable E2E target; it has no source/default backend dependency. `LocalEnvironmentSecretImportService` resolves one closed target role internally and writes from a verified plaintext source; it never uses either Store as a source or exposes bulk write through `SecretStorageBackend`.

## Typed Error Taxonomy

```ts
type SecretStorageErrorCode =
  | "NOT_FOUND"
  | "ACCESS_DENIED"
  | "EXTERNALLY_MANAGED"
  | "BACKEND_UNAVAILABLE"
  | "BACKEND_LOCKED"
  | "INCOMPATIBLE_STORE_FORMAT"
  | "INVALID_BACKEND_CONFIG"
  | "CORRUPT_STORE"
  | "CORRUPT_STORED_VALUE";
```

An error may carry code, retryability, message code, and correlation ID generated by the operation boundary. Public/log representations cannot carry the input/resolved value, headers, bootstrap credential/key, command, SDK request, alternate Store information, or physical location.

Mapping is exact: `BACKEND_LOCKED -> LOCKED`, `BACKEND_UNAVAILABLE -> UNAVAILABLE`, `CORRUPT_STORE` or `CORRUPT_STORED_VALUE -> CORRUPT`, and `INCOMPATIBLE_STORE_FORMAT -> INCOMPATIBLE`. `NOT_FOUND` is `MISSING` only when health remains `READY`. The intentionally small taxonomy omits lifecycle revision conflict, arbitrary Store-selection errors, rate-limit, and generic abort states. Future vendor transient causes map behind `BACKEND_UNAVAILABLE` with protected diagnostics.

## Typed Backend Configuration

Every enabled adapter has a discriminated, explicit non-secret configuration shape. First delivery registers only Local for product bootstrap and InMemory in tests. There is no generic adapter-options map and no placeholder vendor discriminant.

```ts
type LocalStoreConfiguration = {
  kind: "local-store";
  databasePath: string;
  keyPath: string;
  accessMode: "READ_WRITE" | "READ_ONLY";
};

type FirstDeliverySecretStorageConfiguration = LocalStoreConfiguration;
```

The Local paths are accepted only from trusted startup/deployment configuration, normalized to absolute paths, and never exposed as runtime request selectors. The ordinary bootstrap composer derives `secret-store/secret-store.db` and `secret-store/secret-store.key` below the configured server data directory. Electron therefore uses its normal `~/.autobyteus/server-data` root, and ordinary Docker uses `/home/autobyteus/data` inside its existing persistent volume without Compose/launcher changes. The host live-test launcher explicitly supplies the separate canonical real-E2E paths. The key path must not alias the database or an ordinary application file. The Local backend factory returns a writable adapter for `READ_WRITE` and a distinct externally-managed/read-only adapter for `READ_ONLY`; both compose the same internal encrypted repository, but the read-only adapter exposes no write methods.

Future adapters add their own typed schema and backend factory registration in the delivery that implements them. First-delivery parsing of an unknown/Vault/AWS/Kubernetes kind fails `INVALID_BACKEND_CONFIG` with instruction `SECRET_BACKEND_KIND_NOT_INSTALLED`; it does not persist, construct, or fall back to Local. Backend bootstrap identity is not frontend configuration. First delivery uses the Local key file outside checkout/agent environment; future workload identity remains adapter-owned. Local database/key paths are non-secret configuration; key bytes are not.

`requestedAssuranceTier` is not configuration. First delivery reports `LOCAL_HARDENED` only after its governed file/env/descriptor controls verify, explicitly excludes Codex environment inheritance, and never reports `STRONG_AGENT_ISOLATION`.

## Exact Construction Authentication Contract

```ts
type ResolvedConstructionAuthentication =
  | { kind: "none" }
  | { kind: "apiKey"; apiKey: SecretValue }
  | { kind: "geminiAiStudio"; apiKey: SecretValue }
  | { kind: "geminiVertexExpress"; apiKey: SecretValue }
  | { kind: "geminiVertexProject"; project: string; location: string };
```

LLM and multimedia construction contexts reuse this exact closed union. Generic `apiKey` serves non-Gemini API-key consumers only. The existing LLM/media provisioning owners map the explicit non-secret mode and exact slot/configuration as follows:

| Mode | Required input | Resolved variant | Exact SDK construction |
| --- | --- | --- | --- |
| `AI_STUDIO` | `provider.gemini.ai-studio-api-key` | `geminiAiStudio` | `GoogleGenAI({apiKey})` |
| `VERTEX_EXPRESS` | `provider.google.vertex-express-api-key` | `geminiVertexExpress` | `GoogleGenAI({vertexai:true,apiKey})` |
| `VERTEX_PROJECT` | project + location | `geminiVertexProject` | `GoogleGenAI({vertexai:true,project,location})` |

Missing/invalid mode or required input fails before client construction. Neither presence of another credential/configuration nor a previous variant authorizes inference, cross-mode retry, or fallback. `gemini-helper.ts` uses an exhaustive switch and reveals an API key only at the exact LLM/media SDK constructor boundary.

Gemini live metadata intentionally has a separate established contract. `ModelMetadataProvisioningService` maps `AI_STUDIO` only to `llmMetadata/GEMINI/geminiAiStudioApiKey` and `VERTEX_EXPRESS` only to `llmMetadata/GEMINI/geminiVertexExpressApiKey`, resolves through `SecretManagementService`, and reveals the selected value only when constructing `GeminiModelMetadataProvider(apiKey)`. That storage-neutral provider preserves the original Generative Language models request and maps `name`, `baseModelId`, and input/output token limits. For `VERTEX_PROJECT`, the service constructs no live metadata provider and performs zero metadata secret lookup. `ModelMetadataResolver` preserves live-over-curated merge plus failure/timeout containment. No metadata branch reads an ambient alias, tries another definition, falls back to another Store, or converts Vertex Project into a key-backed path.

## External Codex Authentication Preservation

Codex has no `SecretConsumerIdentity`, definition binding, managed-auth mode, or management/backend contract. Its single supported path is:

```text
Codex runtime selection
 -> existing Codex client manager
 -> CodexAppServerClient.start
 -> spawn codex app-server with options.env ?? process.env and real HOME/CODEX_HOME
 -> Codex-owned external login/configuration state
 -> existing sanitized model/thread/turn result or failure
```

The implementation removes the ticket-added `buildAgentChildEnvironment` use from this client and restores no second path. AutoByteus does not call Codex account/login RPC, report auth status, rotate credentials, synthesize an account home, inspect/migrate real auth state, or fall back to a Store. This explicit external-runtime behavior is outside the `LOCAL_HARDENED` child-environment guarantee.

## Claude Runtime Authentication Cutover

Claude Agent SDK has two explicit non-overlapping modes:

```ts
type ClaudeRuntimeAuthenticationMode = "cli" | "managed-secret";

type ClaudeRuntimeAuthentication =
  | { kind: "cli" }
  | { kind: "managedApiKey"; apiKey: SecretValue };

interface ClaudeRuntimeAuthenticationService {
  prepareForLaunch(): Promise<ClaudeRuntimeAuthentication>;
}
```

- omitted mode defaults to `cli`;
- only exact `cli` and `managed-secret` are valid; legacy `auto`, legacy `api-key`, and every unknown value fail `CLAUDE_RUNTIME_AUTH_MODE_INVALID` before lookup or spawn;
- `cli` performs no secret lookup, does not inspect ambient API-key aliases, and uses only the purpose-built external Claude CLI/account environment;
- `managed-secret` performs one just-in-time `SecretManagementService.resolveForUse({kind:"agentRuntime", runtimeKind:"claude_agent_sdk", credentialSlot:"apiKey"})` immediately before each Claude model-discovery or run child construction;
- management authorizes that identity to the existing `provider.anthropic.api-key`; missing or non-ready custody fails before child construction with no CLI/ambient fallback;
- `ClaudeSdkClient` is the sole last-mile delivery boundary. It constructs an empty-base environment from required non-secret operational entries and, only for `managedApiKey`, adds exactly `ANTHROPIC_API_KEY` using `apiKey.revealToTrustedConsumer()`;
- no caller-provided `env` remains in Claude start/list-model inputs; no code mutates `process.env`, spreads parent environment, sets `CLAUDE_CODE_API_KEY`, uses an API-key descriptor/file, or sends the value in command arguments, settings, session state, request DTOs, logs, or diagnostics;
- after the SDK query/child is constructed and again when it completes/fails, AutoByteus drops its local `SecretValue`, revealed string, and environment references. This is lifetime minimization, not deterministic JavaScript/SDK-memory zeroization;
- native Anthropic LLM construction and metadata remain distinct authorized consumers of the same definition through the normal construction-context path.

### Managed-mode child policy

The intended supported path is child-only relative to AutoByteus-controlled process launches:

```text
Claude request/model discovery
 -> ClaudeSdkClient public launch/list-model boundary
 -> ClaudeRuntimeAuthenticationService selects managed-secret
 -> SecretManagementService authorizes exact Claude consumer
 -> selected backend resolves SecretValue
 -> return closed authentication to ClaudeSdkClient
 -> ClaudeSdkClient builds exact child environment
 -> SDK env option -> one Claude Code child
 -> AutoByteus drops temporary references
 -> redacted result/error
```

The parent, sibling runtime, unrelated child, and AutoByteus-owned MCP/tool child never receive the value. To prevent supported Claude-controlled descendants from inheriting or printing it, managed mode additionally:

1. passes `settingSources: []`, no settings payload, no hooks, no plugins, and no API-key helper;
2. uses `strictMcpConfig: true` with only explicitly materialized AutoByteus-owned in-process MCP servers; no user/project/local/external MCP configuration is loaded;
3. passes SDK `tools: []` so no Claude built-in tool—including shell, file, skill, process, or environment-capable paths—is exposed; `disallowedTools` may repeat known dangerous names defensively, and `allowedTools` is restricted to explicitly materialized AutoByteus MCP names rather than treated as a security allowlist;
4. routes any AutoByteus-owned file/terminal/tool execution outside the Claude child through `AgentExecutionSecurityContext`, which composes a fresh secret-free environment and enforces authorized realpaths;
5. redacts stderr/diagnostics before buffering and again before outward formatting.

The authorized Claude process and SDK/executable can necessarily observe the environment supplied to them. A compromised executable, same-user debugger/process, or unsupported descendant created by compromised native code is outside `LOCAL_HARDENED`. Managed mode is an intentional trust grant to one agentic child, not `STRONG_AGENT_ISOLATION`.

### Claude failure mapping

| Condition | Stable outcome | Lookup / spawn behavior |
| --- | --- | --- |
| omitted or `cli` with unavailable external auth | `CLAUDE_RUNTIME_CLI_AUTH_UNAVAILABLE` | no secret lookup; child error sanitized |
| `auto`, `api-key`, or unknown mode | `CLAUDE_RUNTIME_AUTH_MODE_INVALID` | no lookup; no child spawn |
| Claude consumer binding absent/invalid | `CLAUDE_RUNTIME_SECRET_BINDING_INVALID` | no backend resolve; no spawn |
| definition `MISSING` while backend `READY` | `CLAUDE_RUNTIME_CREDENTIAL_MISSING` | no spawn; no fallback |
| backend `LOCKED` | `CLAUDE_RUNTIME_SECRET_STORE_LOCKED` | no spawn; no fallback |
| backend `UNAVAILABLE` | `CLAUDE_RUNTIME_SECRET_STORE_UNAVAILABLE` | no spawn; no fallback |
| backend `CORRUPT` | `CLAUDE_RUNTIME_SECRET_STORE_CORRUPT` | no spawn; no fallback |
| backend `INCOMPATIBLE` | `CLAUDE_RUNTIME_SECRET_STORE_INCOMPATIBLE` | no spawn; no fallback |
| SDK/Claude child cannot be constructed | `CLAUDE_RUNTIME_SPAWN_FAILED` | temporary references dropped; diagnostics value-free |
| provider rejects delivered credential | `CLAUDE_RUNTIME_AUTH_FAILED` | no mode/backend fallback; diagnostic text redacted before buffering |

These runtime codes are subject-level projections of storage/SDK outcomes, not additions to the storage backend taxonomy. They never contain definition IDs supplied by callers, values, aliases, paths, environment content, commands, raw stderr, or provider response bodies.

Run/start operations propagate the mapped code. Best-effort Claude model discovery preserves the existing `[]` outcome on failure and may record only the stable value-free code in protected diagnostics; it still performs no fallback and no child spawn for pre-spawn failures.

## AutoByteus Remote Gateway Contract

The existing AutoByteus remote LLM/audio/image capability remains a supported product path. The change is custody-only: `AUTOBYTEUS_API_KEY` is removed as a normal runtime source and the same credential is provisioned through `provider.autobyteus.api-key`. Non-secret `AUTOBYTEUS_LLM_SERVER_HOSTS` remains endpoint configuration.

### Discovery owner and triggers

`AutobyteusRemoteModelDiscoveryService` is the single server owner for all three remote catalog refreshes. It is not a generic provider registry and does not duplicate the LLM/audio/image registries. For each model kind it:

1. reads the configured non-secret host list;
2. when the list is empty, performs no management call and authoritatively clears only that model-kind AutoByteus runtime subset;
3. otherwise resolves exactly one authorized `modelDiscovery/AUTOBYTEUS/{modelKind}/apiKey` consumer just in time;
4. passes the resolved authentication plus hosts to the existing credential-agnostic AutoByteus remote provider/factory;
5. projects the result into the corresponding existing registry as the authoritative `runtimeProviderId = "AUTOBYTEUS"` subset; and
6. drops the local `SecretValue`/revealed string references after the outbound request is constructed and redacts all diagnostics.

The three discovery consumers intentionally authorize the same definition. They remain distinct semantic identities because model kind determines the downstream registry and supported operation. There is no `resolveAutobyteusSecret` API and no duplicated per-media discovery coordinator.

### Catalog synchronization semantics

Remote gateway identity and displayed model provider are different attributes:

```ts
type LLMConstructionTarget = {
  // Non-secret owner of credential resolution for this construction path.
  credentialProviderId: string;
  // The API-key variant owns credentialSlot.
  authenticationRequirement: LLMAuthenticationRequirement;
};

type MultimediaConstructionTarget = {
  credentialProviderId: string;
  authenticationRequirement: MultimediaAuthenticationRequirement;
};
```

Displayed/creator provider remains on the authoritative model and is deliberately absent from both subject-specific construction targets. Native model registration materializes `credentialProviderId` once from its known credential owner. Every AutoByteus-discovered model explicitly materializes `credentialProviderId: "AUTOBYTEUS"`, even when its displayed/provider semantics are `OPENAI`, `GEMINI`, or another provider. Generic LLM/audio/image provisioning resolves using only `credentialProviderId`; the slot is read only from the subject's tagged authentication requirement. Downstream clients/factories receive resolved authentication and never infer or fall back to custody from the displayed provider. The two target types remain separate so their authentication unions do not become a mostly-optional generic bag.

A successful discovery response, including an authoritative empty list, replaces only the corresponding `runtimeProviderId = "AUTOBYTEUS"` subset. It never removes native models with the same displayed provider. A failure before an authoritative response preserves the last-known-good AutoByteus subset and returns a stable value-free failure; it does not clear unrelated/native catalog entries, consult ambient environment, or fall back to another backend. Startup before any successful response therefore leaves the AutoByteus subset absent while the rest of the catalog remains usable.

### Lifecycle and Settings integration

The existing built-in AutoByteus provider row uses the same write-only credential lifecycle as other built-in providers: save/remove/status bind to `llm/AUTOBYTEUS/apiKey`, which maps to `provider.autobyteus.api-key`. Successful save triggers the existing provider reload plus full AutoByteus remote catalog refresh. Successful remove is an authoritative lifecycle event: it idempotently clears every AutoByteus-runtime LLM/audio/image subset without a discovery lookup, then publishes the existing value-free reload result. It is not treated as a transient pre-authoritative discovery failure. LLM host configuration remains on the existing endpoint-settings surface and is not stored in the secret Store.

Delete remains idempotent. Read-only/externally managed custody keeps save/delete unavailable while status and remote use remain permitted when the record exists. Missing, locked, unavailable, corrupt, or incompatible custody is mapped to the existing provider/catalog value-free error surface; no credential value, definition ID supplied by a caller, alias, host authorization header, or raw provider body is returned.

### AutoByteus gateway failure rules

| Condition | Discovery outcome | Construction/invocation outcome |
| --- | --- | --- |
| no configured hosts | no lookup; authoritative clear of matching model-kind AutoByteus subset | no affected remote target remains |
| invalid discovery/constructor binding | deny before backend access | deny before backend access |
| explicit successful credential removal | clear all AutoByteus runtime subsets without lookup | no remote target remains available |
| credential missing while backend ready | preserve last-known-good subset | fail closed; no environment fallback |
| backend locked/unavailable/corrupt/incompatible | preserve last-known-good subset | fail closed with normalized value-free status |
| remote request/provider authentication failure | preserve last-known-good subset; redact response | fail without alternate credential/backend fallback |
| successful authoritative empty response | clear only that model-kind AutoByteus subset | no affected remote target remains |
| successful non-empty response | replace only that model-kind AutoByteus subset | target carries `credentialProviderId: "AUTOBYTEUS"` |

Bootstrap order:

```text
resolve canonical/server data paths without credential dotenv
 -> initialize read-only approved non-secret application projection; exclude sensitive aliases before value retention and leave the source unchanged
 -> load current metadata-only custom-provider v2 or return value-free v1 reconfiguration guidance without rewriting the v1 source
 -> load and validate typed backend configuration
 -> construct and health-check exactly one registered backend
 -> if READY: construct management + provisioning/provider routes
 -> otherwise: start value-free configuration/Settings/health control plane only
 -> derive LOCAL_HARDENED after governed file/env/descriptor checks with explicit Codex exclusion
 -> permit applicable governed agent execution or the separate preserved Codex path
```

Backend replacement requires a server restart in the initial design. A runtime request cannot select another backend or Store.

## Initial Backend Matrix

| Backend | Binding | Lifecycle | Custody / Authentication | Intended Use |
| --- | --- | --- | --- | --- |
| In-memory | instance-local | `WRITABLE` | process memory; synthetic values only | deterministic tests/conformance |
| AutoByteus Local Secret Store | one database/key pair per backend instance | `WRITABLE` in read-write mode; `EXTERNALLY_MANAGED` in read-only mode | in-process encrypted SQLite backend outside agent roots | Electron/default local Store, reusable real-E2E Store, temporary test Store |
| Test-only externally-managed fixture | fixture-local | `EXTERNALLY_MANAGED` | synthetic fixture | capability/UI/conformance only; not product configuration |
| Vault/AWS/Kubernetes/company adapter | not registered in first delivery | future explicit lifecycle | future workload identity | out of scope; unknown kind fails value-free without fallback |

## AutoByteus Local Secret Store Persistence

Normal server-local files:

```text
${serverDataDir}/secret-store/
  secret-store.db
  secret-store.key
```

Host real-test files:

```text
~/.autobyteus/server-data/secret-store/
  real-e2e-secret-store.db
  real-e2e-secret-store.key
```

`secret-store.db`/`secret-store.key` are the zero-configuration defaults for each Agent Server data directory. Electron resolves that directory under `~/.autobyteus/server-data`; normal Docker resolves it inside the already-persistent `/home/autobyteus/data` volume. `real-e2e-secret-store.db`/`real-e2e-secret-store.key` are selected only by tracked host live-test bootstrap configuration or a trusted host setup command. They are separate physical Stores, not profiles in one database. Each key is independently generated; neither key derives from the other. This ticket introduces no Docker E2E mount, volume, path-variable, or launcher contract.

The Local backend family runs inside Agent Server and opens exactly one configured database/key pair. Its factory returns `LocalWritableSecretStorageBackend` or `LocalReadOnlySecretStorageBackend` according to trusted startup access mode; both reuse `LocalEncryptedSecretRepository` and its physical Store invariants. There is no daemon, launcher, local TCP/HTTP service, Unix socket, Windows named pipe, IPC protocol, or connection status. Electron starts only its existing embedded Agent Server. A direct local server or test server constructs the same backend implementation family.

“Machine-global host E2E” means that pair belongs to one host OS user's AutoByteus server-data domain rather than to a checkout. Multiple host processes may open the prepared E2E Store read-only. Each normal Electron/direct/Docker server owns the default Store below its data directory. A Docker container or single Kubernetes server Pod is one independent node/PVC; writable Local Stores are never shared between replicas. Multi-node custody is unavailable until a future centralized adapter is installed.

Logical schema for each database:

```text
store_metadata(
  singleton_id PRIMARY KEY CHECK(singleton_id = 1),
  schema_version,
  encryption_format_version,
  pair_verifier_format_version,
  store_id,
  pair_verifier_nonce,
  pair_verifier_ciphertext,
  pair_verifier_tag
)

secret_records(
  definition_id PRIMARY KEY,
  nonce,
  ciphertext
)
```

Only format and authenticated pair-binding metadata plus exact record attributes are stored. `store_id` is a random public Store identity, not a path/profile/product scope. Verifier ciphertext authenticates a fixed format constant and contains no provider value. No profile, owner, organization, deployment, environment, path, key identifier, value hint, or lifecycle revision exists. Definition IDs are non-secret operational metadata; raw values occupy authenticated ciphertext only.

Initial encryption format `1` uses Node's cross-platform standard crypto primitives:

- each `.key` file contains 32 cryptographically random root-key bytes with owner-only access (`0600`/owner ACL) inside an owner-only directory (`0700`/owner ACL);
- pair-verifier key derivation uses HKDF-SHA-256 with the random 16-byte `store_id` as salt and UTF-8 info `autobyteus/local-store/pair-verifier/v1`;
- pair verifier AES-256-GCM encrypts a fixed format constant using a fresh 12-byte nonce and AAD that canonically binds schema, encryption, verifier versions, and `store_id`; a 16-byte tag is stored separately;
- record key derivation uses a distinct HKDF info domain `autobyteus/local-store/record/v1`, preventing verifier/record key reuse;
- records use AES-256-GCM with a fresh random 12-byte nonce and a 16-byte authentication tag encoded with the ciphertext;
- associated data uses an unambiguous versioned encoding of encryption-format version and definition ID; golden-vector and tamper tests fix that encoding before implementation is accepted;
- decryption authenticates before any plaintext is returned, and corrupt records fail closed.

This is a standard key-derivation plus authenticated-encryption pattern, not proprietary cryptography. The target implementation should reuse the repository's existing Node SQLite capability where it satisfies packaging and transaction requirements; implementation must prove direct Node and bundled Electron behavior without creating an alternate plaintext store.

Initialization rules:

1. `READ_WRITE` may create a pair only when both paths are absent and the parent passes ownership/permission checks. It generates root key/Store ID/verifier into restrictive temporary files, fsyncs file/directory state, and renames in a fixed order. Because two filesystem renames are not one atomic action, crash behavior is fail-closed: any partial final pair is `CORRUPT`, never silently completed.
2. If exactly one of database or key exists, initialization fails `CORRUPT_STORE`; it does not generate a replacement key or overwrite data.
3. `READ_ONLY` requires both files to exist and never creates, migrates, checkpoints, saves, or removes.
4. Every read-write/read-only open validates singleton metadata and authenticates the pair verifier **before** exposing a backend, including when `secret_records` is empty.
5. Unsupported schema/encryption/verifier versions fail `INCOMPATIBLE_STORE_FORMAT` and map to health `INCOMPATIBLE` without rewrite/downgrade.
6. Wrong/swapped key, current-format missing verifier, verifier tamper/authentication failure, or partial pair fails `CORRUPT_STORE` and maps to `CORRUPT`; no record is required to detect it.
7. A record authentication failure transitions the active backend to `CORRUPT`, closes/blocks further secret operations, and keeps only value-free health/configuration control reachable.

Writable SQLite rules:

- atomic save uses one transaction and one exact primary-key upsert;
- remove is one idempotent exact-record transaction;
- a bounded busy timeout/retry maps exhausted lock contention to `BACKEND_LOCKED`;
- journal/checkpoint policy must support real cross-process readers and crash recovery;
- host real-E2E provisioning finishes, checkpoints as required, and closes before host runtime read-only opening;
- destructive Store tests use temporary database/key pairs, not either shared canonical Store.

Ordinary server runtime-data reset must not silently delete either Store. An explicit reset identifies exactly one configured Store, closes the current backend handle, acquires the required database/filesystem exclusion, and deletes that database, its independent key, and SQLite sidecar files. It cannot mean “all Stores” by omission. The current Electron reset implementation must be narrowed so its recursive `server-data` deletion preserves `secret-store/` unless the user explicitly selects secret custody deletion.

Automatic local unlock through an owner-only key file remains lower assurance against an equivalent-user process. Separate host default/E2E files and keys provide defense in depth but do not defeat arbitrary same-user code. First delivery reports only `LOCAL_HARDENED`; strong identity/ACL/worker isolation is explicitly deferred.

## Trusted Local Store Provisioning Contract

Ordinary runtime has one backend instance and no Store selector. The hidden-input setup service is constructed with only the exact writable E2E target:

```ts
type LocalProvisioningStatus = {
  definitionId: SecretDefinitionId;
  storageState: "CONFIGURED";
};

type LocalProvisioningBatchEntry = {
  definitionId: SecretDefinitionId;
  value: SecretValue;
  action: "CREATE" | "REPLACE";
};

type LocalProvisioningTargetSnapshot =
  | {
      targetStatus: { state: "READY" };
      definitionStatus: ReadonlyMap<SecretDefinitionId, BackendSecretStatus>;
    }
  | {
      targetStatus: {
        state: "INITIALIZATION_REQUIRED";
        instructionCode: "LOCAL_IMPORT_TARGET_INITIALIZATION_REQUIRED";
      };
      definitionStatus: null;
    }
  | {
      targetStatus: NonReadySecretBackendHealth;
      definitionStatus: null;
    };

interface LocalSecretStoreProvisioningService {
  inspectExact(
    definitionIds: readonly SecretDefinitionId[],
  ): Promise<LocalProvisioningTargetSnapshot>;
  provisionExact(
    definitionId: SecretDefinitionId,
    value: SecretValue,
  ): Promise<LocalProvisioningStatus>;
  /** Package-internal setup API; not exported through management/backend/transport. */
  provisionBatchExact(
    entries: readonly LocalProvisioningBatchEntry[],
    options: { initializeIfAbsent: true },
  ): Promise<{ configuredCount: number; replacedCount: number }>;
}
```

The service instance, not either operation request, is bound to one exact writable `LocalStoreConfiguration` plus the Local initializer/backend-opener dependencies; callers do not pre-open or retain its repository/backend. Hidden-input composition constructs it only for E2E and calls `provisionExact`. The explicit import owner constructs it only after resolving its closed selected target. `inspectExact` never initializes or resolves a value; both files absent yields `INITIALIZATION_REQUIRED`, a partial pair yields `CORRUPT`, and ready returns status only for the validated requested IDs. The service owns open, staged initialization when the governing owner has authorized it, repository delegation, checkpoint, and close; it validates exact catalog definitions/actions, delegates one repository transaction, and returns counts/status only. It has no plaintext source or alternate-Store backend dependency, copy, resolve, list, prefix, request path selection, raw readback, runtime, or GraphQL API. The batch remains package-internal and is not added to `SecretStorageBackend` or `SecretManagementService`.

## Legacy Source Non-Authority Contract

The automatic `LegacySecretCutoverMigration`, its startup call, source rewrite/conversion behavior, parent-alias deletion, and migration-only record/ledger are removed. No replacement credential migration owner is introduced, and `src/app-data-migrations` remains unchanged.

1. Canonical application `.env`, inherited parent aliases, and custom-provider-v1 remain operator-owned and untouched. Startup never imports, copies, scrubs, deletes, rewrites, or converts them.
2. `AppConfig` classifies assignment names before retaining values. It may expose only the approved non-secret configuration set; every historical sensitive alias in [credential-consumer-mapping.md](./credential-consumer-mapping.md) is absent from `get`, `getAll`, persistence state, logs, and child environments.
3. Startup is read-only for the legacy source. Only a later explicit supported non-secret Settings operation may write it; that operation is source-preserving and updates the intended non-secret entry without serializing the projected map over the whole source or dropping/reformatting excluded credential lines.
4. The current custom-provider store accepts metadata-only v2. Detection of v1 performs no value extraction, metadata conversion, rewrite, delete, Store call, or fallback and returns stable value-free `CUSTOM_PROVIDER_LEGACY_RECONFIGURATION_REQUIRED` guidance.
5. Startup performs zero Local Store/backend/management/importer operations on behalf of legacy sources and emits no affected-ID, migration, or re-provision record.
6. Users explicitly provision through UI/Settings, hidden-input E2E setup, or the operator importer below and own any later legacy cleanup. The importer is never invoked by startup.
7. The normal runtime remains Store-only. A legacy source's continued physical presence is a documented same-user residual, not credential authority.

## Explicit Local Environment-Secret Import Contract

The repository exposes one thin command:

```text
pnpm secrets:local:import -- --source /absolute/path/to/copied-test-keys --target e2e [--dry-run] [--overwrite]
pnpm secrets:local:import -- --source /absolute/path/to/local-api-credentials --target default [--dry-run] [--overwrite]
```

Its typed service request is deliberately smaller than a generic import API:

The shared request/action/plan/status/result/error vocabulary is owned by `autobyteus-server-ts/src/secret-management/provisioning/local-environment-secret-import.ts`. The CLI, source reader, target resolver, `LocalEnvironmentSecretImportService`, and importer tests import that current module directly. The incidental `local-legacy-environment-import.ts` file and `LocalLegacyEnvironmentImport*` exports are removed in the same change, with no compatibility re-export.

```ts
type LocalEnvironmentSecretImportTarget = "default" | "e2e";

type LocalEnvironmentSecretImportRequest = {
  sourceAbsolutePath: string;
  target: LocalEnvironmentSecretImportTarget;
  dryRun: boolean;
  overwrite: boolean;
};

type LocalEnvironmentSecretImportAction =
  | "CREATE"
  | "SKIPPED_CONFIGURED"
  | "REPLACE";

type LocalEnvironmentSecretImportPlanEntry = {
  definitionId: SecretDefinitionId;
  action: LocalEnvironmentSecretImportAction;
};

type LocalEnvironmentSecretImportTargetStatus =
  | { state: "READY" }
  | {
      state: "INITIALIZATION_REQUIRED";
      instructionCode: "LOCAL_IMPORT_TARGET_INITIALIZATION_REQUIRED";
    }
  | NonReadySecretBackendHealth;

type LocalEnvironmentSecretImportResult = {
  targetStatus: LocalEnvironmentSecretImportTargetStatus;
  definitionIds: SecretDefinitionId[];
  configuredCount: number;
  skippedCount: number;
  replacedCount: number;
  instructionCode: "NONE" | "RESTART_REQUIRED" | "RUN_REAL_E2E_PREFLIGHT";
};
```

The outward plan/result is value-free. The association between a mapped definition and its transient `SecretValue` is a separate internal short-lived structure that cannot serialize, log, or escape the execute scope. The request has no target Store path/key, definition/value list, backend configuration, environment map, remove action, fallback, or implicit target.

### Source selection and trust

1. The CLI adapter accepts exactly zero or one literal `--` at argv index 0, removes it, and then parses one canonical option form. `--source` and `--target` are required exactly once. Repeated/misplaced sentinels, unknown/duplicate options, a relative source, or target outside `default|e2e` fail before source value handling.
2. The source may have any basename or extension, including the current application `.env`, an extensionless name, or a renamed copy of `.env`/`.env.test`. Filename never selects or auto-detects a format. The command never searches the current directory, parents, another checkout, application data, or an environment variable to infer a source.
3. Before parsing, `lstat`, canonical realpath, opened-handle `fstat`, and identity comparison reject missing, symlink, non-regular, changed/raced, wrong-owner, or insufficiently private files. A post-read `fstat` must match the pre-read device/inode (where available), size, modification time, and change time; otherwise the source is raced and the parsed bytes are discarded.
4. POSIX requires the current UID and no group/other permission bits. Windows requires a non-mutating verifier that proves current-user-exclusive access; if that proof is unavailable, import fails. The importer never chmods, rewrites, or edits source ACLs.
5. The source limit is 1 MiB. NUL or invalid UTF-8 rejects the whole operation. No partial parsing/writing occurs.

### Recognition, selected-value parsing, and mapping

1. Recognition supports UTF-8 LF/CRLF physical lines. For each line, the scanner examines only enough leading syntax to determine whether it contains optional horizontal whitespace, optional `export `, and an assignment-name token matching `[A-Za-z_][A-Za-z0-9_]*`. It compares that token exactly against the immutable positive alias registry before parsing any right-hand side.
2. A line whose token is absent or unrecognized is ignored without parsing, unquoting, validating, retaining, or evaluating the remainder. Blank/comment lines, unrelated settings, unknown secret-like names, malformed unrelated text, `DATABASE_URL`, `OLLAMA_API_KEY`, `GOOGLE_CSE_API_KEY`, `QWEN_API_KEY`, `ZHIPU_API_KEY`, `CLAUDE_CODE_API_KEY`, its descriptor alias, and every other unrecognized line are non-blocking. No ignored-line metadata is retained or emitted.
3. Once an exact recognized alias matches, that line must contain optional horizontal whitespace, `=`, and one same-line value. The first `=` is the delimiter, so later `=` characters remain selected value bytes. An unquoted value has outer horizontal whitespace removed and otherwise remains literal, including `#`; inline comments are not stripped. A single- or double-quoted value must close on the same physical line; only the matching quote and backslash may be escaped, and the outer quotes are removed. Multiline values, heredocs, line continuation, unmatched quotes, trailing non-whitespace after a closing quote, and dynamic-expression markers `${`, `$(`, or backtick in a populated value reject the recognized assignment. No value is expanded/evaluated, assigned to `process.env`, passed to a shell, or read from another file.
4. After the normalization in rule 3, an empty recognized value is absent/non-selected. This includes `NAME=`, horizontal-whitespace-only, `NAME=""`, and `NAME=''`. It creates no `LocalEnvironmentMappedCredential`, value buffer, plan entry, warning, ignored-line metadata, count, or error, and it does not enter duplicate tracking. Therefore multiple empty occurrences remain absent, one empty plus one populated occurrence selects the populated occurrence, and two or more populated occurrences of the same recognized spelling reject with `IMPORT_SOURCE_DUPLICATE_ASSIGNMENT` even when values match. Each definition has one import name. For Qwen, only `DASHSCOPE_API_KEY` maps; `QWEN_API_KEY` is unrecognized and ignored without value parsing. `ZHIPU_API_KEY` is not a GLM alias and never maps.
5. One immutable positive alias-to-definition registry owns explicit-import eligibility. Non-secret configuration exclusion may reuse its names but may apply a broader sensitive-name predicate for its own projection responsibility; that broader predicate never flows into the importer. Caller-defined aliases, a second value map, negative secret-like classification, and compatibility aliases are forbidden. Any registry collision or missing current catalog definition fails `IMPORT_MAPPING_INVALID`. The exact normative aliases are listed in [credential-consumer-mapping.md](./credential-consumer-mapping.md).
6. A source containing zero populated selected mapped credentials—including a source whose recognized assignments are all absent/empty—fails value-free with `IMPORT_NO_MAPPED_CREDENTIALS`; it does not open/mutate the target or report success merely because lines were ignored or empty.
7. The selected credential set, registry/catalog, selected target status, and current per-definition status validate before any prompt or write. Unknown source content is deliberately outside that validation subject.

### Target, plan, confirmation, and transaction

1. `default` resolves internally only to the canonical host Local Store at `~/.autobyteus/server-data/secret-store/secret-store.db` plus `secret-store.key`. `e2e` resolves internally only to the independent host `real-e2e-secret-store.db` plus `real-e2e-secret-store.key` in the same directory. Callers cannot override these paths. This local operator command does not target a custom-data-directory, Docker, Kubernetes, remote, or enterprise Store; those nodes use their normal Settings or deployment-specific provisioning.
   - Production CLI composition constructs a fixed `LocalImportTargetResolver` for this host root. Unit/integration tests may constructor-inject a temporary-root resolver implementing the same closed role mapping; that seam is package-internal and is never exposed through CLI flags, environment variables, runtime configuration, or product APIs.
2. When both selected pair files are absent, target status is `INITIALIZATION_REQUIRED`. Dry-run derives all mapped entries as `CREATE` but creates nothing. After confirmation, execute reuses the existing staged Local initializer for that selected pair before the record batch. A one-file partial pair is `CORRUPT` and is never repaired/replaced silently.
3. A present selected Store must be `READY` and writable for import. The other Store is not opened. No target can inherit, fall back, or copy from the other.
4. Dry-run performs all applicable checks and outputs only logical IDs plus `CREATE`, `SKIPPED_CONFIGURED`, or `REPLACE` ; it never prompts, initializes, or writes. Preview and execution use the same request policy: a configured entry is `REPLACE` only when that request includes `--overwrite`, and otherwise is `SKIPPED_CONFIGURED`.
5. Without `--overwrite`, an already configured definition is `SKIPPED_CONFIGURED` and is not part of the write batch. With `--overwrite`, it becomes `REPLACE`. Missing/absent aliases and unrelated target records remain unchanged. Removal is unsupported.
6. Every non-dry operation with at least one `CREATE`/`REPLACE` requires a direct TTY and exact target-specific phrase: `IMPORT DEFAULT STORE` or `IMPORT REAL-E2E STORE`. Cancellation, mismatch, EOF, or non-TTY performs no initialization or record mutation. If every mapped record is `SKIPPED_CONFIGURED`, return the value-free skipped result without a prompt or write. No `--yes` bypass exists.
7. An internal Local setup-only `provisionBatchExact` operation revalidates the selected pair and every plan precondition inside one SQLite transaction: `CREATE` requires the record still absent and `REPLACE` requires it still present. Any difference from the confirmed plan fails `IMPORT_TARGET_CHANGED` and rolls back all records rather than silently overwriting/creating. Otherwise it applies all planned records or none, checkpoints, and closes. It is not added to `SecretStorageBackend` or `SecretManagementService`. If the pair was initialized in this execution and the record batch fails, a valid empty selected Store may remain; no mapped record is partially committed. Crash-created partial pairs follow the existing fail-closed `CORRUPT` lifecycle.
8. A rerun without overwrite is idempotent. A confirmed default write returns `RESTART_REQUIRED`; a confirmed E2E write returns `RUN_REAL_E2E_PREFLIGHT`.

### Disclosure and cleanup

- Source bytes/values never enter stdout/stderr, argv, ambient `process.env`, shell commands, logs, traces, exceptions, reports, evidence, or committed artifacts.
- Output is limited to target status, logical definition IDs sorted lexically, stable error/instruction codes, and `CONFIGURED`/`SKIPPED`/`REPLACED` action counts. Ignored-line metadata is absent.
- No plaintext temporary, backup, quarantine, rewritten source, or copied dotenv file is created. The source is never mutated or deleted.
- Owned byte buffers are overwritten and references released in `finally` as far as practical. JavaScript, parser logic, SQLite bindings, and the runtime may create string/native copies that cannot be proven deterministically zeroized; the contract makes no stronger memory-erasure claim.

Stable importer failures are value-free:

```ts
type LocalEnvironmentSecretImportErrorCode =
  | "IMPORT_OPTIONS_INVALID"
  | "IMPORT_SOURCE_PATH_INVALID"
  | "IMPORT_SOURCE_UNTRUSTED"
  | "IMPORT_SOURCE_RACED"
  | "IMPORT_SOURCE_TOO_LARGE"
  | "IMPORT_SOURCE_ENCODING_INVALID"
  | "IMPORT_SOURCE_SYNTAX_INVALID"
  | "IMPORT_SOURCE_DUPLICATE_ASSIGNMENT"
  | "IMPORT_NO_MAPPED_CREDENTIALS"
  | "IMPORT_MAPPING_INVALID"
  | "IMPORT_TARGET_INITIALIZATION_FAILED"
  | "IMPORT_TARGET_NOT_READY"
  | "IMPORT_TARGET_NOT_WRITABLE"
  | "IMPORT_TARGET_CHANGED"
  | "IMPORT_CONFIRMATION_REQUIRED"
  | "IMPORT_CANCELLED"
  | "IMPORT_BATCH_FAILED";

class LocalEnvironmentSecretImportError extends Error {
  readonly code: LocalEnvironmentSecretImportErrorCode;
  readonly target?: LocalEnvironmentSecretImportTarget;
}
```

Error projections contain the code and selected target role only when safe; they never include the source path, line text, variable value, value length/hash/prefix, Store path, or raw exception.

## Conformance Suite

Every first-delivery implementation/fixture runs the applicable subset:

1. declared lifecycle matches implemented operations;
2. first save stores a synthetic canary and a later save atomically replaces that exact record;
3. status never resolves/returns or derives hints from the value;
4. exact resolve returns the canary only at the trusted fixture boundary;
5. remove is idempotent;
6. externally managed adapters reject writes before mutation;
7. `READY/LOCKED/UNAVAILABLE/CORRUPT/INCOMPATIBLE` health is normalized/redacted; definition status exists only at ready;
8. explicit failure does not consult environment, another backend, or another Store;
9. restart behavior matches declared durability;
10. Local backend binding prevents per-request Store selection; default, real-E2E, and temporary Store fixtures use physically separate database/key pairs;
11. empty Local Store + correct key is ready; swapped key, one missing file, and tampered verifier are corrupt; unsupported verifier/Store version is incompatible; none rewrites/regenerates;
12. staged creation crash/partial-pair cases fail closed;
13. hidden-input direct E2E setup exposes no source/copy method and returns value-free evidence;
14. read-only Local mode exposes no write methods, authenticates the pair verifier, and opens without mutation;
15. synthetic canaries do not appear in logs, errors, snapshots, traces, or reports;
16. test-only externally-managed fixture proves disabled-write projection without implying a production adapter;
17. the exact Claude runtime identity is authorized to `provider.anthropic.api-key`, malformed runtime/slot identities fail before backend access, and native Anthropic identities remain independent;
18. Claude `cli` makes zero management calls; `managed-secret` performs one resolve per child construction, and storage failures never spawn or fall back.
19. the exact three AutoByteus discovery identities and three construction identities (`llm`, audio, image) bind to `provider.autobyteus.api-key`, while malformed kind/provider/slot combinations fail before backend access;
20. an empty AutoByteus host list performs zero management/backend calls and clears only the matching AutoByteus runtime subset, while a configured host list performs one just-in-time resolve per discovery operation;
21. successful AutoByteus discovery replaces only the matching model-kind/runtime subset, preserves native same-provider models, clears that subset on authoritative empty success, and preserves last-known-good on pre-authoritative failure;
22. remote construction uses the model target's `credentialProviderId = "AUTOBYTEUS"` rather than its displayed provider ID and never consults `AUTOBYTEUS_API_KEY`;
23. built-in AutoByteus Settings save/status/idempotent-remove and reload remain reachable through the existing product surface, with values absent from every response and artifact; successful explicit removal clears only AutoByteus runtime subsets without discovery resolution.
24. importer options accept both zero and one leading PNPM separator, require one absolute source file and one closed target, and accept arbitrary source basenames/extensions; repeated/misplaced separators and every implicit/searched/relative/duplicate/unknown/target-path/definition/value/backend/environment selector fail before mutation;
25. source fixtures prove symlink/non-regular/wrong-owner/non-private/raced/oversize/NUL/invalid-UTF-8 rejection plus malformed recognized syntax, populated dynamic value, and duplicate populated occurrence rejection; they also prove all normalized-empty forms are absent, empty plus one populated occurrence selects only the populated value, multiple empty occurrences remain absent, all-empty/absent yields `IMPORT_NO_MAPPED_CREDENTIALS`, and unrelated settings, unknown secret-like names, malformed unrelated lines, and legacy names remain non-blocking and do not cause source permission mutation;
26. the positive registry resolves every current approved alias to a catalog definition, maps Qwen only from `DASHSCOPE_API_KEY`, deliberately excludes `QWEN_API_KEY` and ZHIPU, and has no second map, precedence/group mechanism, or negative classifier in importer code;
27. dry-run is value-free and zero-write; no-overwrite skips configured records; explicit overwrite and exact target-specific TTY phrases are required for replacement/write; cancellation and non-TTY are zero-write;
28. selected-target batch is atomic, rollback-safe, idempotent, source-preserving, and never opens the other Store; default returns restart instruction and E2E returns preflight instruction;
29. selected-value canaries and unrecognized-line canaries never appear in argv, environment, stdout/stderr, logs, errors, snapshots, reports, evidence, source copies, or artifacts; ignored-line metadata is absent, and a seeded leak-scanner negative control proves the scanner can fail;
30. the hidden-input provisioning command remains available and unchanged; no runtime/test-runner path invokes either importer, and no startup path invokes the explicit operator importer;
31. legacy-source fixtures use synthetic values to prove application `.env` and parent aliases remain unchanged, sensitive names are excluded before value retention, approved non-secret settings remain usable without dropping excluded lines, custom-provider-v1 remains byte-unchanged with value-free guidance, startup performs zero Store/backend/importer operation, and runtime has no legacy fallback.
32. Codex launch regression fixtures use synthetic HOME/CODEX_HOME/account sentinels only and prove the pre-ticket `options.env ?? process.env` behavior, zero management/Store/account-RPC calls, no synthetic-home rewrite, existing sanitized outcomes, and explicit absence from the `LOCAL_HARDENED` environment assertion.
33. LLM/media construction tests cover all three exact Gemini variants and exact Google SDK options. Separate metadata tests prove exact AI Studio/Vertex Express consumer selection, trusted construction of the existing key-based provider, preserved Generative Language request/response mapping, Vertex Project zero secret lookup, resolver-curated fallback, cache invalidation, and no ambient/alternate-definition/Store fallback. No metadata SDK-mode rewrite is required.

Storage conformance uses synthetic values. Real-provider suites separately prove consumer/provider behavior.

## Rejected Contract Shapes

| Rejected Shape | Reason |
| --- | --- |
| `getSecret(name: string): string` | arbitrary selector and easy transport/tool exposure |
| organization/deployment/environment scope DTO | no approved product identity/use-case witness |
| caller-visible backend address/path | leaks infrastructure and permits boundary bypass |
| consumer calls adapter directly | bypasses authoritative lifecycle/resolution policy |
| LLM imports management/Local Store/Vault | couples reusable client to server custody |
| raw key in `LLMConfig`/model metadata | serializable/clonable/request-forwarded custody |
| generic `{kind:"apiKey"}` for Gemini modes | erases AI Studio versus Vertex Express construction semantics |
| metadata-specific copy of the LLM/media mode union or optional SDK-mode/retry bag | misrepresents the accepted dual-key Generative Language contract, adds unused Vertex Project live behavior, and creates unnecessary source churn |
| metadata environment/default-key constructor or alternate-definition retry | restores ambient custody or hidden fallback; server provisioning must supply exactly one selected resolved key |
| AutoByteus-managed Codex definition/mode/account API | duplicates Codex-owned external login and exceeds the user-approved preservation scope |
| synthetic Codex HOME through governed child builder | breaks established external `codex login` state and misstates the assurance boundary |
| expected-version Settings API | no current/approved caller carries or presents versions |
| Local Store daemon/IPC protocol | same-user process boundary does not justify launcher/socket/versioning complexity; Agent Server owns the backend directly |
| named profile table and per-request profile fields | approved behavior requires physically separate default and real-E2E Stores, not arbitrary namespaces |
| Local Store `connectionName` alias | trusted bootstrap supplies exact Store paths; no product caller selects aliases |
| generic cross-Store backend method | violates Store-bound backend authority and would expose alternate custody through runtime APIs |
| generic dotenv-to-backend importer | arbitrary paths/definitions/backends would create a second custody API; use the closed Local operator transition only |
| importer target database/key path flags | bypass canonical default/E2E role isolation and risk writes outside owned custody |
| importer definition/value CLI flags or environment input | places secret data in argv/ambient state and bypasses the approved alias map |
| explicit importer source search/parent discovery/startup/test invocation | silently restores arbitrary dotenv as runtime/test authority and recreates worktree exposure; only an explicit absolute operator source is accepted |
| noninteractive `--yes` or default target | makes wrong-Store mutation mechanically easy; every write requires target-specific direct-TTY proof |
| importer source chmod/ACL rewrite or deletion | mutates operator-owned evidence/data without separate approval; untrusted access fails closed and cleanup stays operator-owned |
| Local batch method on generic backend/management port | no runtime use case exists; keep batch internal to Local setup/import owner |
| any automatic legacy import/copy/scrub/delete/rewrite/conversion or generic credential migration runner | contradicts operator ownership and the approved explicit-only transition; remove the current updater instead |
| `writable` plus `externallyManaged` booleans | can express contradictory states |
| requested assurance setting | configuration cannot prove enforcement |
| global mutable resolver singleton | hidden dependency and cross-test/Store leakage |
| fallback chain (`backend -> another Store -> env`) | silent security downgrade |
| Claude `auto` or ambient `api-key` mode selection | hidden mode choice/fallback and broad parent-environment forwarding; replace with explicit `cli` or `managed-secret` |
| Claude-specific `resolveClaudeSecret` or direct catalog/backend access | duplicates or bypasses the existing authoritative generic `resolveForUse` boundary |
| caller-supplied Claude SDK `env` | bypasses exact mode, environment, and child-only delivery policy |
| Claude managed secret in CLI argument/settings/session/file | persists or exposes the value outside the exact supported child environment boundary |
| restore `AUTOBYTEUS_API_KEY` as a normal source or fallback | preserves ambient secret exposure and silently bypasses managed custody |
| infer remote credential ownership from displayed model provider | resolves the wrong definition for a native-provider model served through the AutoByteus gateway |
| replace a whole displayed-provider catalog after AutoByteus discovery | removes unrelated native models; replacement must be scoped to the AutoByteus runtime subset and model kind |
| separate LLM/audio/image remote discovery coordinators | duplicates identical host/credential/lifecycle policy; one service owns typed model-kind refreshes |
| generic adapter option map | weak schema and ambiguous ownership |
| caller above `SecretManagementService` opens the Store DB | bypasses lifecycle/catalog authority; only the in-process Local backend owns database access |
| OS-keychain-only custody | Electron/OS coupling excludes direct heterogeneous servers |
