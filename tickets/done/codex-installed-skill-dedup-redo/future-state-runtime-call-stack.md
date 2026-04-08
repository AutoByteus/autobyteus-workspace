# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v2`
- Requirements: `tickets/in-progress/codex-installed-skill-dedup-redo/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/codex-installed-skill-dedup-redo/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `DS-001`, `DS-002`, `DS-003`
  - Ownership sections: bootstrapper, client manager, materializer, cleanup ownership map

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001` | `Primary End-to-End` | `CodexThreadBootstrapper` | `Requirement` | `R-002`, `R-003`, `R-008` | N/A | Skip workspace materialization for already discoverable configured skill | Yes/No/Yes |
| `UC-002` | `DS-001`, `DS-003` | `Primary End-to-End` | `CodexThreadBootstrapper` | `Requirement` | `R-004`, `R-005`, `R-006`, `R-008` | N/A | Materialize missing skill or discovery-failure fallback with self-contained copied content | Yes/Yes/Yes |
| `UC-003` | `DS-002` | `Return-Event` | `CodexThreadCleanup` | `Requirement` | `R-007`, `R-008` | N/A | Cleanup removes only runtime-owned copied bundles | Yes/N/A/Yes |

## Transition Notes

- No temporary migration logic is planned.
- The target state is achieved by extending the current bootstrapper and materializer owners in place.
- No legacy runtime-execution path is modeled or retained.

## Use Case: UC-001 [Skip Already Discoverable Skill]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `CodexThreadBootstrapper`
- Why This Use Case Matters To This Spine: This is the main policy change requested by the user.
- Why This Spine Span Is Long Enough: It starts at agent-run bootstrap and ends at the runtime context that later drives Codex thread startup and cleanup.

### Goal

Prevent duplicate workspace copies when Codex already discovers a same-name installed skill.

### Preconditions

- Agent definition has configured skills.
- `skillAccessMode !== NONE`.
- `skills/list` succeeds for the resolved working directory.
- At least one configured skill name already appears in enabled discoverable skills.

### Expected Outcome

The bootstrapper filters out the already discoverable skill name and the materializer is invoked only for the remaining missing skills, if any.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-execution/services/agent-run-service.ts:createAgentRun(...)
├── src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts:createBackend(...) [ASYNC]
│   └── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:bootstrapForCreate(...) [ASYNC]
│       └── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:bootstrapInternal(...) [ASYNC]
│           ├── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:filterConfiguredSkillsForMaterialization(...) [ASYNC]
│           │   ├── src/runtime-management/codex/client/codex-app-server-client-manager.ts:acquireClient(cwd) [ASYNC]
│           │   ├── src/runtime-management/codex/client/codex-app-server-client.ts:request("skills/list", { cwds: [cwd], forceReload: true }) [IO]
│           │   ├── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:collectDiscoverableSkillNames(...) [STATE]
│           │   └── src/runtime-management/codex/client/codex-app-server-client-manager.ts:releaseClient(cwd) [ASYNC]
│           ├── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:prepareWorkspaceSkills(...) [ASYNC]
│           │   └── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:materializeConfiguredCodexWorkspaceSkills(...) [ASYNC]
│           └── src/agent-execution/backends/codex/backend/codex-agent-run-context.ts:constructor(...) [STATE]
└── src/agent-execution/backends/codex/thread/codex-thread-manager.ts:createThread(...) [ASYNC]
```

### Branching / Fallback Paths

```text
[ERROR] if skills/list returns malformed data
src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:collectDiscoverableSkillNames(...)
└── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:filterConfiguredSkillsForMaterialization(...) # treat malformed entries as absent, never skip by invalid data
```

### State And Data Transformations

- Configured `Skill[]` -> filtered `Skill[]` missing from discoverable name set.
- `skills/list` response -> `Set<string>` of enabled discoverable skill names.
- Filtered configured skills -> runtime-owned materialized descriptors only.

### Observability And Debug Points

- Warning log only if discovery request fails.
- Optional debug point: filtered skill-name set before materialization.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Materialize Missing Skill Or Discovery-Failure Fallback]

### Spine Context

- Spine ID(s): `DS-001`, `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `CodexThreadBootstrapper`
- Why This Use Case Matters To This Spine: The ticket must keep the current configured-skill runtime behavior working when a skill is not already installed.
- Why This Spine Span Is Long Enough: It includes the bootstrap policy boundary and the materializer’s local copy flow through to runtime context readiness.

### Goal

Ensure missing configured skills still become available to Codex, and turn symlinked source content into a self-contained copied bundle when the runtime performs the copy itself.

### Preconditions

- Agent definition has configured skills.
- `skillAccessMode !== NONE`.
- Either:
  - the configured skill name is absent from `skills/list`, or
  - the `skills/list` probe throws or times out.

### Expected Outcome

The bootstrapper passes the missing skill through to the materializer, and the materializer creates a runtime-owned workspace bundle whose copied files remain usable without depending on the original source tree or a separately mirrored `.codex/shared/...` tree.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-execution/services/agent-run-service.ts:createAgentRun(...)
├── src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts:createBackend(...) [ASYNC]
│   └── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:bootstrapInternal(...) [ASYNC]
│       ├── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:filterConfiguredSkillsForMaterialization(...) [ASYNC]
│       ├── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:prepareWorkspaceSkills(...) [ASYNC]
│       │   └── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:materializeConfiguredCodexWorkspaceSkills(...) [ASYNC]
│       │       └── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:ensureMaterializedSkillBundle(...) [ASYNC]
│       │           ├── node:fs/promises:mkdir(...) [IO]
│       │           ├── node:fs/promises:cp(..., { recursive: true, dereference: true, ... }) [IO]
│       │           ├── node:fs/promises:writeFile(.autobyteus-runtime-skill.json) [IO]
│       │           └── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:ensureOpenAiAgentConfig(...) [ASYNC]
│       └── src/agent-execution/backends/codex/backend/codex-agent-run-context.ts:constructor(...) [STATE]
└── src/agent-execution/backends/codex/thread/codex-thread-manager.ts:createThread(...) [ASYNC]
```

### Branching / Fallback Paths

```text
[FALLBACK] if skills/list probe fails
src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:filterConfiguredSkillsForMaterialization(...)
├── src/runtime-management/codex/client/codex-app-server-client.ts:request("skills/list", ...) [IO]
└── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:warnAndReturnOriginalConfiguredSkills(...) # fallback to normal materialization
```

```text
[ERROR] if workspace target path exists without matching ownership marker
src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:ensureMaterializedSkillBundle(...)
└── throw Error("...already exists but is not owned by AutoByteus...")
```

### State And Data Transformations

- Missing configured `Skill` -> runtime-owned workspace skill bundle path.
- Source filesystem tree -> copied runtime filesystem tree with dereferenced file content where source symlinks were encountered.
- Copied bundle -> ownership marker + `agents/openai.yaml`.

### Observability And Debug Points

- Warning log for discovery failure fallback.
- Existing materializer error when target path ownership is invalid.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Cleanup Runtime-Owned Bundles Only]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Return-Event`
- Governing Owner: `CodexThreadCleanup`
- Why This Use Case Matters To This Spine: Skipped installed skills must not create cleanup obligations, while copied bundles still must be released.
- Why This Spine Span Is Long Enough: It covers thread teardown through the authoritative cleanup owner and the filesystem consequence.

### Goal

Ensure teardown still removes copied workspace bundles while naturally ignoring skills that were skipped before materialization.

### Preconditions

- A Codex run ends or bootstrap/thread creation fails after workspace skill preparation.
- `runContext.runtimeContext.materializedConfiguredSkills` contains only runtime-owned copied bundles.

### Expected Outcome

Cleanup releases only the copied materialized bundles and never touches installed skills that were filtered out before copy.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts:createBackend(...) catch branch / src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts:terminateRun(...)
├── src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts:cleanupPreparedWorkspaceSkills(...) [ASYNC]
│   └── src/agent-execution/backends/codex/backend/codex-thread-cleanup.ts:cleanupMaterializedWorkspaceSkills(...) [ASYNC]
│       └── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:cleanupMaterializedCodexWorkspaceSkills(...) [ASYNC]
│           └── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:releaseMaterializedSkill(...) [ASYNC]
│               └── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:removeOwnedMaterializedSkillBundle(...) [IO]
└── src/runtime-management/codex/client/codex-app-server-client-manager.ts:releaseClient(cwd) [ASYNC]
```

### Branching / Fallback Paths

```text
[ERROR] if cleanup removal fails
src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:releaseMaterializedSkill(...)
└── console.warn(...) # cleanup error is logged and teardown continues
```

### State And Data Transformations

- Runtime context descriptor list -> registry holder decrements -> owned bundle removed when count reaches zero.
- No descriptor exists for skipped installed skills, so no deletion path is created for them.

### Observability And Debug Points

- Cleanup warning log for filesystem removal failure.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
