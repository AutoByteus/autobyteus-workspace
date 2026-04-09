# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/remove-file-persistence-provider/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/remove-file-persistence-provider/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `DS-001`, `DS-002`, `DS-003`
  - Ownership sections: `Ownership Map`, `Ownership-Driven Dependency Rules`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001` | Primary End-to-End | startup/config | Requirement | `R-001`, `R-003` | N/A | Server startup without persistence-profile branching | Yes/Yes/Yes |
| `UC-002` | `DS-002` | Return-Event | token-usage subsystem | Requirement | `R-002` | N/A | Token usage persists through SQL-only store | Yes/N/A/Yes |
| `UC-003` | `DS-003` | Primary End-to-End | bootstrap surfaces | Requirement | `R-004`, `R-005` | N/A | Bootstrap/build surfaces use the standard runtime contract only | Yes/Yes/Yes |

## Transition Notes

- No temporary dual-path behavior is allowed. The target state removes the obsolete profile/build surfaces directly.

## Use Case: UC-001 Server startup without persistence-profile branching

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: startup/config
- Why This Use Case Matters To This Spine: It proves the runtime no longer depends on a generic persistence mode.
- Why This Spine Span Is Long Enough: It starts at the entrypoint, crosses config and migration boundaries, and reaches the running runtime.

### Goal

Boot the server with normal DB-aware startup behavior and no `PERSISTENCE_PROVIDER` selection.

### Preconditions

- Server `.env` or runtime env provides `AUTOBYTEUS_SERVER_HOST`.
- If `DB_TYPE=sqlite`, runtime has an app-data directory for the derived SQLite path.

### Expected Outcome

- `AppConfig` initializes runtime directories and DB env correctly.
- Prisma migrations run through the normal startup path.
- Server runtime starts successfully without consulting a persistence-profile selector.

### Primary Runtime Call Stack

```text
[ENTRY] src/app.ts:startServer() [ASYNC]
├── src/app.ts:initializeConfig(...)
│   └── src/config/app-config.ts:AppConfig.initialize()
│       ├── src/config/app-config.ts:loadConfigData() [IO]
│       ├── src/config/app-config.ts:initializeBaseUrl()
│       ├── src/config/app-config.ts:initSqlitePath() [STATE] # only when DB_TYPE=sqlite and DATABASE_URL needs derivation
│       └── src/config/app-config.ts:initMemoryPath() [STATE]
└── src/server-runtime.ts:startConfiguredServer(...) [ASYNC]
    ├── src/startup/migrations.ts:runMigrations() [ASYNC]
    │   └── prisma migrate deploy [IO]
    ├── src/server-runtime.ts:buildApp() [ASYNC]
    └── Fastify runtime listen/start [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] if DB_TYPE is not sqlite
src/config/app-config.ts:AppConfig.initialize()
└── skips initSqlitePath() and relies on provided DATABASE_URL/config
```

```text
[ERROR] if AppConfig initialization fails
src/app.ts:startServer()
└── process.exit(1)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Token usage persists through SQL-only store

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Return-Event`
- Governing Owner: token-usage subsystem
- Why This Use Case Matters To This Spine: It is the only active database-backed persistence path still in scope.
- Why This Spine Span Is Long Enough: It covers the runtime event, the authoritative store boundary, the repository boundary, and the final database effect.

### Goal

Persist usage reported by an LLM response into the database through one token-usage boundary with no file fallback.

### Preconditions

- A completed response contains `usage`.
- Runtime has a valid run ID and DB configuration.

### Expected Outcome

- Token usage creates user/assistant usage rows through the SQL-backed store.
- Statistics reads use the same SQL-backed store.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-customization/processors/persistence/token-usage-persistence-processor.ts:processResponse(...) [ASYNC]
├── src/agent-customization/utils/core-boundary-id-normalizer.ts:resolveAgentRunIdFromRuntimeContext(...)
└── src/token-usage/providers/token-usage-store.ts:createConversationTokenUsageRecords(...) [ASYNC]
    ├── src/token-usage/providers/token-usage-store.ts:createTokenUsageRecord(...) [ASYNC]
    │   └── src/token-usage/repositories/sql/token-usage-record-repository.ts:createUsageRecord(...) [IO]
    └── src/token-usage/providers/token-usage-store.ts:createTokenUsageRecord(...) [ASYNC]
        └── src/token-usage/repositories/sql/token-usage-record-repository.ts:createUsageRecord(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if response has no usage
src/agent-customization/processors/persistence/token-usage-persistence-processor.ts:processResponse(...)
└── warn and return without persistence
```

```text
[ERROR] if DB persistence fails
src/token-usage/providers/token-usage-store.ts:createTokenUsageRecord(...)
└── throw/log failure back to processor
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 Bootstrap/build surfaces use the standard runtime contract only

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: bootstrap surfaces
- Why This Use Case Matters To This Spine: It removes the user-visible false contract that a file-profile build/runtime mode still exists.
- Why This Spine Span Is Long Enough: It starts at the outer bootstrap surface, crosses build/env preparation, and reaches the standard runtime path.

### Goal

Ensure Electron, Docker, and Android helpers all prepare the standard server runtime contract and artifact.

### Preconditions

- Build scripts and bootstrap helpers are invoked through normal project tooling.

### Expected Outcome

- Standard server build artifact is used (`dist/app.js`).
- Active env/bootstrap surfaces emit DB/runtime settings only, not `PERSISTENCE_PROVIDER`.

### Primary Runtime Call Stack

```text
[ENTRY] Electron/Docker/Android bootstrap surface [ASYNC]
├── writes runtime env/defaults without PERSISTENCE_PROVIDER [IO]
├── invokes standard server build or starts standard server artifact [ASYNC]
└── src/app.ts:startServer() [ASYNC]
    └── follows UC-001 startup spine
```

### Branching / Fallback Paths

```text
[FALLBACK] if a bootstrap surface needs SQLite defaults
bootstrap helper
└── writes DB_TYPE=sqlite and DATABASE_URL/derived sqlite path inputs only
```

```text
[ERROR] if standard build/server artifact is missing
bootstrap helper
└── exits with missing-artifact error instead of falling back to dist-file
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
