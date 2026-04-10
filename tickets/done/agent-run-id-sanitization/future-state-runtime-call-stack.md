# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/agent-run-id-sanitization/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/agent-run-id-sanitization/implementation.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `Spine Inventory In Scope`
  - Ownership sections: `Primary Owners / Main Domain Subjects`, `Target Architecture Shape`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- Every use case declares its governing spine from the approved design basis.
- No legacy or compatibility branches are modeled in the target path.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `AgentRunService` + shared readable-id formatter | Requirement | `REQ-001`, `REQ-002`, `REQ-003`, `REQ-004`, `REQ-005`, `REQ-008` | N/A | Standalone AutoByteus run creation uses one shared sanitized readable id | Yes/No/Yes |
| UC-002 | DS-002 | Primary End-to-End | shared readable-id formatter | Requirement | `REQ-001`, `REQ-003`, `REQ-004`, `REQ-005` | N/A | Runtime-created direct agent ids use the same normalized readable-id contract | Yes/No/Yes |
| UC-003 | DS-003 | Return-Event | `MemoryFileStore` | Requirement | `REQ-006`, `REQ-007` | N/A | Optional archive-memory reads return empty data without misleading warnings | Yes/No/Yes |

## Transition Notes

- Temporary migration behavior needed to reach target state: `None`
- Retirement plan for temporary logic (if any): `N/A`

## Use Case: UC-001 Standalone AutoByteus Run Creation Uses Shared Sanitized Readable Id

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentRunService` + shared readable-id formatter
- Why This Use Case Matters To This Spine:
  - This is the authoritative server-side path for newly created standalone AutoByteus runs and directly owns the reported duplicated readable id.

### Goal

Provision a fresh standalone AutoByteus run id through one shared formatter that normalizes segments, removes unsafe spacing/punctuation, and avoids duplicate identical `name`/`role` stems.

### Preconditions

- `AgentRunService.createAgentRun(...)` is called for `RuntimeKind.AUTOBYTEUS`.
- `AgentDefinitionService` returns the agent definition with `name` and `role`.

### Expected Outcome

- A new unique run id is generated with the shared readable-id formatter.
- `memory/agents/<runId>` uses the normalized run id without an additional storage-layer sanitization step.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:createAgentRun(input)
├── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:prepareFreshRun(...) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:generateFreshRunId(runtimeKind, agentDefinitionId) [ASYNC]
│   │   ├── autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts:getFreshAgentDefinitionById(definitionId) [ASYNC]
│   │   ├── autobyteus-server-ts/src/run-history/utils/agent-run-id-utils.ts:generateStandaloneAgentRunId(name, role)
│   │   └── autobyteus-ts/src/agent/factory/agent-id.ts:generateReadableAgentId(name, role) [STATE] # normalize + dedupe stem + append suffix
│   └── autobyteus-server-ts/src/agent-memory/store/agent-run-memory-layout.ts:getRunDirPath(runId) [STATE]
├── autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts:createAgentRun(config, runId) [ASYNC]
└── autobyteus-server-ts/src/run-history/store/agent-run-metadata-store.ts:writeMetadata(runId, metadata) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if generated candidate collides with existing active or persisted run id
autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:generateUniqueRunId(generator)
└── autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts:runIdExists(runId) [ASYNC/IO]
```

### State And Data Transformations

- `AgentDefinition{name, role}` -> normalized readable stem
- normalized readable stem -> `normalized_stem_####`
- `runId` -> `memory/agents/<runId>`

### Observability And Debug Points

- Run creation logs continue to use the final generated `runId`.
- Metadata persistence remains the authoritative persisted source for restore.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 Runtime-Created Direct Agent Ids Use Same Normalized Contract

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: shared readable-id formatter
- Why This Use Case Matters To This Spine:
  - This path is the original runtime-local source of readable agent ids and must remain consistent with standalone run creation.

### Goal

Ensure direct runtime-created agent ids in `autobyteus-ts` are generated by the same normalization and deduplication logic used by standalone AutoByteus run ids.

### Preconditions

- A caller creates an agent through `AgentFactory.createAgent(config)`.

### Expected Outcome

- The runtime-generated `agentId` uses the shared normalized formatter.
- The resulting in-memory/file-store path uses that already-normalized id literally.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/agent/factory/agent-factory.ts:createAgent(config)
├── autobyteus-ts/src/agent/factory/agent-id.ts:generateReadableAgentId(config.name, config.role) [STATE]
├── autobyteus-ts/src/agent/factory/agent-factory.ts:createAgentWithId(agentId, config)
└── autobyteus-ts/src/agent/factory/agent-factory.ts:createRuntimeWithId(agentId, config, ...)
    ├── autobyteus-ts/src/memory/store/file-store.ts:FileMemoryStore(baseDir, agentId, ...) [IO]
    └── autobyteus-ts/src/agent/runtime/agent-runtime.ts:constructor(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if generated readable id collides with an active runtime agent
autobyteus-ts/src/agent/factory/agent-factory.ts:createAgent(config)
└── autobyteus-ts/src/agent/factory/agent-id.ts:generateReadableAgentId(config.name, config.role) [STATE] # retry loop in caller
```

### State And Data Transformations

- `AgentConfig{name, role}` -> normalized readable stem
- normalized readable stem -> `agentId`
- `agentId` -> runtime state + memory-store leaf path

### Observability And Debug Points

- Runtime logs show the normalized `agentId`.
- No extra formatting layer exists below the formatter owner.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 Optional Archive Reads Avoid Misleading Missing-File Warnings

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Return-Event`
- Governing Owner: `MemoryFileStore`
- Why This Use Case Matters To This Spine:
  - The user-visible log symptom came from an archive read for a file that may validly not exist.

### Goal

Return an empty archive result for missing optional archive files without logging a missing-file warning, while leaving warning behavior intact for required read paths.

### Preconditions

- A memory reader requests archive traces for a run whose `raw_traces_archive.jsonl` file does not exist.

### Expected Outcome

- The archive read returns `[]`.
- No `Memory file missing:` warning is emitted for that optional file.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts:getRunMemoryView(runId, options)
├── autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts:readRawTracesArchive(runId)
│   ├── autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts:getRunDir(runId) [STATE]
│   └── autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts:readJsonl(filePath, limit, { warnIfMissing: false }) [IO]
└── autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts:mergeAndSortTraces(active, archive) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if archive file exists but contains malformed JSONL lines
autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts:readJsonl(...)
└── logger.warn("Skipping malformed JSONL line ...")
```

### State And Data Transformations

- missing optional archive file -> empty trace list
- active traces + empty archive traces -> unchanged merged trace set

### Observability And Debug Points

- Malformed archive content still logs per-line decode warnings.
- Required-file reads still use default warning behavior unless they explicitly opt out.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
