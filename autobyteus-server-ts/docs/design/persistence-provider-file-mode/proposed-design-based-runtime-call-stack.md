# Proposed-Design-Based Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Large`
- Call Stack Version: `v9`
- Source Artifact: `/Users/normy/autobyteus_org/autobyteus-server-ts/docs/design/persistence-provider-file-mode/proposed-design.md`
- Source Design Version: `v8`
- Referenced Sections: `C-001..C-013`

## Future-State Modeling Rule (Mandatory)

- This models target-state behavior after registry+proxy standardization.
- No per-domain factory selection path is modeled.

## Use Case Index

- UC-001: Startup in file mode skips Prisma migrations.
- UC-002: Prompt CRUD resolves file provider through prompt registry+proxy.
- UC-003: Agent definition + mapping resolves file providers through registries+proxies.
- UC-004: Agent team definition resolves file provider through registry+proxy.
- UC-005: MCP config and startup MCP load/register resolve file provider through registry+proxy.
- UC-006: External-channel ingress+callback flows resolve file providers through registry+proxy set.
- UC-007: Token usage persistence/statistics resolves file provider through registry+proxy.
- UC-008: Artifact create/read resolves file provider through registry+proxy.
- UC-009: `build:file` compiles without Prisma graph.
- UC-010: Pattern consistency check: all domains use registry+proxy.

---

## Use Case: UC-001 Startup in file mode skips Prisma migrations

### Primary Runtime Call Stack

```text
[ENTRY] src/app.ts:startServer() [ASYNC]
├── src/config/app-config.ts:AppConfig.initialize() [IO]
├── src/persistence/profile.ts:getPersistenceProfile() [STATE]
├── src/startup/migrations.ts:runMigrations() [ASYNC]
│   └── profile == file -> skip prisma command path
└── src/app.ts:buildApp() [ASYNC]
```

### Error Path

```text
[ERROR] invalid profile
src/persistence/profile.ts:getPersistenceProfile()
└── throw unsupported profile error
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-002 Prompt CRUD resolves file provider through prompt registry+proxy

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/prompt.ts:PromptResolver.createPrompt(...) [ASYNC]
├── src/prompt-engineering/services/prompt-service.ts:PromptService.createPrompt(...) [ASYNC]
├── src/prompt-engineering/providers/persistence-proxy.ts:createPrompt(...) [ASYNC]
│   ├── src/prompt-engineering/providers/persistence-provider-registry.ts:getProviderLoader("file") [STATE]
│   ├── [ASYNC] dynamic import file provider module
│   └── src/prompt-engineering/providers/file-provider.ts:createPrompt(...) [IO]
└── src/prompt-engineering/utils/prompt-loader.ts:invalidateCache() [STATE]
```

### Fallback/Error Paths

```text
[FALLBACK] first prompt in family
file-provider.ts:createPrompt(...)
└── set isActive=true before write
```

```text
[ERROR] provider loader missing for profile
prompt persistence proxy initialization
└── throw unsupported provider error
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-003 Agent definition + mapping resolves file providers through registries+proxies

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/agent-definition.ts:AgentDefinitionResolver.createAgentDefinition(...) [ASYNC]
├── src/agent-definition/services/agent-definition-service.ts:createAgentDefinition(...) [ASYNC]
│   ├── src/agent-definition/providers/definition-persistence-proxy.ts:create(...) [ASYNC]
│   │   ├── definition registry get loader("file")
│   │   └── file-agent-definition-provider.ts:create(...) [IO]
│   └── src/agent-definition/providers/mapping-persistence-proxy.ts:upsert(...) [ASYNC]
│       ├── mapping registry get loader("file")
│       └── file-agent-prompt-mapping-provider.ts:upsert(...) [IO]
└── response mapping continues
```

### Fallback/Error Paths

```text
[FALLBACK] mapping write fails after definition create
agent-definition-service.ts:createAgentDefinition(...)
└── definition proxy delete(created.id) for rollback parity
```

```text
[ERROR] prompt family missing
agent-definition-service.ts:createAgentDefinition(...)
└── validation error before persistence writes
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-004 Agent team definition resolves file provider through registry+proxy

### Primary Runtime Call Stack

```text
[ENTRY] src/api/graphql/types/agent-team-definition.ts:createAgentTeamDefinition(...) [ASYNC]
├── src/agent-team-definition/services/agent-team-definition-service.ts:createDefinition(...) [ASYNC]
├── src/agent-team-definition/providers/persistence-proxy.ts:create(...) [ASYNC]
│   ├── src/agent-team-definition/providers/persistence-provider-registry.ts:getProviderLoader("file") [STATE]
│   ├── [ASYNC] dynamic import file provider module
│   └── src/agent-team-definition/providers/file-agent-team-definition-provider.ts:create(...) [IO]
└── response mapping continues
```

### Fallback/Error Paths

```text
[FALLBACK] cache preloading path
src/startup/cache-preloader.ts:runCachePreloading(...)
└── AgentTeamDefinitionService.getAllDefinitions() via same proxy path [ASYNC][IO]
```

```text
[ERROR] update/delete for missing definition
agent-team-definition-service.ts:updateDefinition/deleteDefinition
└── throw not-found error before write
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-005 MCP config and startup load/register resolve file provider through registry+proxy

### Primary Runtime Call Stack

```text
[ENTRY] src/startup/mcp-loader.ts:runMcpToolRegistration() [ASYNC]
├── src/mcp-server-management/services/mcp-config-service.ts:loadAllAndRegister() [ASYNC]
│   ├── src/mcp-server-management/providers/persistence-proxy.ts:getAll() [ASYNC]
│   │   ├── mcp registry get loader("file")
│   │   └── file-provider.ts:getAll() [IO]
│   ├── CoreMcpConfigService.clearConfigs/addConfig(...) [STATE]
│   └── McpToolRegistrar.reloadAllMcpTools() [ASYNC]
└── startup task completes
```

### Fallback/Error Paths

```text
[FALLBACK] configure path upsert
mcp-config-service.ts:configureMcpServer(...)
└── proxy getByServerId -> create/update via same file provider [ASYNC][IO]
```

```text
[ERROR] invalid import JSON
mcp-config-service.ts:importConfigsFromJson(...)
└── throws parse/shape error before persistence writes
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-006 External-channel ingress+callback flows resolve file providers through registry+proxy set

### Primary Runtime Call Stack

```text
[ENTRY] src/api/rest/channel-ingress.ts:routeHandler(...) [ASYNC]
├── src/external-channel/providers/provider-proxy-set.ts:getProviderSet() [STATE]
│   ├── binding proxy -> registry loader("file")
│   ├── idempotency proxy -> registry loader("file")
│   ├── receipt proxy -> registry loader("file")
│   └── delivery proxy -> registry loader("file")
├── channel-idempotency-service.ts:reserveKey(...) [ASYNC][IO]
├── channel-message-receipt-service.ts:recordIngressReceipt(...) [ASYNC][IO]
├── channel-binding-service.ts:findBinding(...) [ASYNC][IO]
└── delivery-event-service.ts:upsertByCallbackKey(...) [ASYNC][IO]
```

```text
[ENTRY] src/agent-customization/processors/response-customization/external-channel-assistant-reply-processor.ts:processResponse(...) [ASYNC]
├── reply-callback-service.ts:publishAssistantReplyByTurn(...) [ASYNC]
│   ├── callback-idempotency-service.ts:reserveKey(...) [ASYNC]
│   │   └── callback-idempotency proxy -> registry loader("file") -> file callback-idempotency provider [IO]
│   ├── channel-message-receipt-service.ts:getSourceByAgentTurn(...) [ASYNC][IO]
│   ├── channel-binding-service.ts:findBinding(...) [ASYNC][IO]
│   └── delivery-event-service.ts:upsertByCallbackKey(...) [ASYNC][IO]
└── gateway-callback-publisher.ts:publish(...) [ASYNC][IO]
```

### Fallback/Error Paths

```text
[FALLBACK] duplicate idempotency key not expired
idempotency provider returns { firstSeen: false }
```

```text
[FALLBACK] callback already processed
callback-idempotency-service.ts:reserveKey(...)
└── returns { firstSeen: false } and callback publish is skipped
```

```text
[ERROR] invalid ingress payload
channel-ingress-service.ts validation failure before persistence
```

```text
[ERROR] callback publish failure
reply-callback-service.ts:publishAssistantReplyByTurn(...)
└── delivery event marked FAILED with error metadata
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-007 Token usage resolves file provider through registry+proxy

### Primary Runtime Call Stack

```text
[ENTRY] token-usage persistence processor [ASYNC]
├── src/token-usage/providers/persistence-proxy.ts:createConversationTokenUsageRecords(...) [ASYNC]
│   ├── token-usage registry get loader("file")
│   ├── dynamic import file-persistence-provider
│   └── file-persistence-provider writes JSONL records [IO]
└── continue response flow

[ENTRY] token usage statistics GraphQL query [ASYNC]
└── statistics-provider -> persistence proxy -> file provider read/scan [IO]
```

### Fallback/Error Paths

```text
[FALLBACK] llmModel absent -> aggregate under "unknown"
```

```text
[ERROR] provider key unsupported
persistence-proxy initialize -> explicit error
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-008 Artifact create/read resolves file provider through registry+proxy

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.ts:processToolResult(...) [ASYNC]
├── src/agent-artifacts/services/artifact-service.ts:createArtifact(...) [ASYNC]
├── src/agent-artifacts/providers/persistence-proxy.ts:createArtifact(...) [ASYNC]
│   ├── artifact registry get loader("file")
│   └── src/agent-artifacts/repositories/file/agent-artifact-repository.ts:createArtifact(...) [IO]
└── processor continues

[ENTRY] src/api/graphql/types/agent-artifact.ts:agentArtifacts(...) [ASYNC]
└── artifact-service -> persistence proxy -> file repository getByAgentId [ASYNC][IO]
```

### Fallback/Error Paths

```text
[FALLBACK] empty artifact set
agent-artifact resolver returns []
```

```text
[ERROR] invalid artifact payload/path
artifact service validates and rejects before write
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

---

## Use Case: UC-009 `build:file` compiles without Prisma graph

### Primary Runtime Call Stack

```text
[ENTRY] package.json:scripts.build:file [ASYNC]
├── build autobyteus-ts
├── tsc -p tsconfig.build.file.json
│   ├── excludes sql adapters/repositories
│   └── compiles registry+proxy + file providers only
└── dist emitted without Prisma graph
```

### Error Path

```text
[ERROR] static SQL import leak remains
file build compile fails and reports SQL/Prisma dependency edge
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

---

## Use Case: UC-010 Pattern consistency check across domains

### Primary Runtime Call Stack

```text
[ENTRY] design/code review gate
└── for each persisted domain:
    ├── persistence-provider interface exists
    ├── persistence-provider-registry exists
    ├── persistence-proxy exists
    └── services/composition use proxy, not direct adapter construction
```

### Error Path

```text
[ERROR] mixed pattern detected
(any direct `new Sql...` or per-domain factory selector)
└── gate fails until refactored to registry+proxy
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
