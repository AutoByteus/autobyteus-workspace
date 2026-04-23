# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path
- Comments: use brief inline comments with `# ...`.
- Do not include legacy/backward-compatibility branches.
- Keep decoupling visible in call paths: avoid bidirectional cross-subsystem loops and unclear dependency direction.

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/done/whole-skill-symlink-materialization/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `tickets/done/whole-skill-symlink-materialization/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `DS-001` through `DS-004`
  - Ownership sections: `Ownership Map`, `Ownership-Driven Dependency Rules`, `Change Inventory`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.
- Every use case declares which spine(s) it exercises from the approved design basis.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001` | `Primary End-to-End` | `CodexThreadBootstrapper` | `Requirement` | `R-001`, `R-002`, `R-012` | `N/A` | Codex skips workspace materialization for already discoverable same-name skills | `Yes/No/Yes` |
| `UC-002` | `DS-001`, `DS-003`, `DS-004` | `Primary End-to-End`, `Bounded Local` | `CodexThreadBootstrapper`, `CodexWorkspaceSkillMaterializer` | `Requirement` | `R-003`, `R-004`, `R-005`, `R-007`, `R-008`, `R-009`, `R-010`, `R-011`, `R-012` | `N/A` | Codex materializes a missing configured skill as a whole-directory workspace symlink | `Yes/Yes/Yes` |
| `UC-003` | `DS-002`, `DS-003`, `DS-004` | `Primary End-to-End`, `Bounded Local` | `ClaudeSessionBootstrapper`, `ClaudeWorkspaceSkillMaterializer` | `Requirement` | `R-001`, `R-006`, `R-007`, `R-008`, `R-009`, `R-010`, `R-011`, `R-012` | `N/A` | Claude materializes configured skills as whole-directory workspace symlinks | `Yes/Yes/Yes` |

## Transition Notes

- No temporary dual copy/symlink behavior is modeled.
- Temporary migration work is only test/doc refresh around the new symlink contract.

## Use Case: `UC-001` Codex skips workspace materialization for already discoverable same-name skills

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `CodexThreadBootstrapper`
- Why This Use Case Matters To This Spine:
  - The Codex symlink design must preserve the existing same-name reuse contract and avoid unnecessary workspace writes.

### Goal

Keep the existing `skills/list` preflight so a same-name discoverable skill is reused instead of being symlink-materialized into the workspace.

### Preconditions

- Agent definition includes one or more configured skill names.
- Codex app-server can answer `skills/list` for the working directory.
- At least one configured skill name is already discoverable.

### Expected Outcome

- `materializeConfiguredCodexWorkspaceSkills(...)` receives only the still-missing configured skills.
- If every configured skill is already discoverable, no runtime-owned workspace symlink is created.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:bootstrapForCreate(...)
├── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:bootstrapInternal(...)
│   ├── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:prepareWorkspaceSkills(...) [ASYNC]
│   │   ├── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:filterConfiguredSkillsForMaterialization(...) [ASYNC]
│   │   │   ├── src/runtime-management/codex/client/codex-app-server-client-manager.ts:acquireClient(...) [ASYNC]
│   │   │   ├── src/runtime-management/codex/client/codex-app-server-client.ts:request("skills/list", ...) [IO]
│   │   │   ├── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:collectDiscoverableSkillNames(...) [STATE]
│   │   │   └── src/runtime-management/codex/client/codex-app-server-client-manager.ts:releaseClient(...) [ASYNC]
│   │   └── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:materializeConfiguredCodexWorkspaceSkills(...) [ASYNC] # receives only missing skills, or []
│   └── src/agent-execution/backends/codex/backend/codex-agent-run-context.ts:constructor(...)
└── src/agent-execution/domain/agent-run-context.ts:constructor(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] if at least one configured skill name is not discoverable
src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:filterConfiguredSkillsForMaterialization(...)
└── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:materializeConfiguredCodexWorkspaceSkills(...)
```

```text
[ERROR] if skills/list probe fails
src/runtime-management/codex/client/codex-app-server-client.ts:request("skills/list", ...)
└── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:filterConfiguredSkillsForMaterialization(...) # logs warning and falls back to materializing configured skills
```

### State And Data Transformations

- Configured skill list -> discoverable-name set comparison -> missing skill subset.

### Observability And Debug Points

- Warnings remain at Codex bootstrapper level for `skills/list` failure.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None for the target shape.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: `UC-002` Codex materializes a missing configured skill as a whole-directory workspace symlink

### Spine Context

- Spine ID(s): `DS-001`, `DS-003`, `DS-004`
- Spine Scope: `Primary End-to-End`, `Bounded Local`
- Governing Owner: `CodexThreadBootstrapper`, `CodexWorkspaceSkillMaterializer`
- Why This Use Case Matters To This Spine:
  - This is the core behavior change: copied bundles, suffixes, marker files, and generated `openai.yaml` writes all disappear here.

### Goal

When Codex still needs a workspace-owned fallback skill, create an intuitive whole-directory symlink under `.codex/skills/` that points to the source root, safely reuse/remove only the expected same-source symlink, and reject conflicting paths explicitly.

### Preconditions

- At least one configured skill is missing from live Codex discovery, or `skills/list` failed and fallback materialization is required.
- Source skill root exists and contains `SKILL.md`.

### Expected Outcome

- Workspace path is `.codex/skills/<sanitized-skill-name>` with no hash suffix.
- Workspace path is a symlink to the source skill root.
- Internal source-root-relative shared paths remain valid because the real source root remains authoritative.
- Cleanup only unlinks the runtime-owned symlink after the last holder releases it.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:bootstrapForCreate(...)
├── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:bootstrapInternal(...)
│   ├── src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:prepareWorkspaceSkills(...) [ASYNC]
│   │   └── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:materializeConfiguredCodexWorkspaceSkills(...) [ASYNC]
│   │       ├── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:acquireMaterializedSkill(...) [ASYNC]
│   │       │   ├── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:ensureWorkspaceSkillSymlink(...) [ASYNC]
│   │       │   │   ├── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:buildWorkspaceSkillsRoot(...) [STATE]
│   │       │   │   ├── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:buildWorkspaceSkillDirectoryName(...) [STATE]
│   │       │   │   ├── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:inspectExistingWorkspaceSkillPath(...) [IO]
│   │       │   │   ├── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:assertWorkspaceSkillPathIsSafe(...) [STATE]
│   │       │   │   └── node:fs/promises:symlink(...) [IO]
│   │       │   └── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:buildDescriptor(...) [STATE]
│   │       └── [STATE] registry holder count increments
│   └── src/agent-execution/backends/codex/backend/codex-agent-run-context.ts:constructor(...)
└── src/agent-execution/domain/agent-run-context.ts:constructor(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] if the intuitive workspace path already exists as the same-source symlink
src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:ensureWorkspaceSkillSymlink(...)
└── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:reuseExistingWorkspaceSkillSymlink(...)
```

```text
[FALLBACK] if the intuitive workspace path exists as a stale same-source runtime-owned symlink and needs refresh
src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:ensureWorkspaceSkillSymlink(...)
├── src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:removeOwnedWorkspaceSkillSymlink(...) [IO]
└── node:fs/promises:symlink(...) [IO]
```

```text
[ERROR] if the intuitive workspace path exists but is not the expected same-source symlink
src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:assertWorkspaceSkillPathIsSafe(...)
└── throw Error("workspace skill path collision ...")
```

```text
[ERROR] if cleanup sees a path that is no longer the expected same-source symlink
src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts:removeOwnedWorkspaceSkillSymlink(...)
└── return without deleting the path
```

### State And Data Transformations

- Configured `Skill` -> intuitive workspace skill path descriptor.
- Existing filesystem path metadata -> ownership decision (`reuse`, `refresh`, `reject`).
- Holder registry entry -> last-release cleanup decision.

### Observability And Debug Points

- Collision errors surface at materializer boundary.
- Cleanup warnings remain at materializer boundary if unlink fails.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None in the target call path; live Codex discovery and `SKILL.md`-only viability were already proven.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: `UC-003` Claude materializes configured skills as whole-directory workspace symlinks

### Spine Context

- Spine ID(s): `DS-002`, `DS-003`, `DS-004`
- Spine Scope: `Primary End-to-End`, `Bounded Local`
- Governing Owner: `ClaudeSessionBootstrapper`, `ClaudeWorkspaceSkillMaterializer`
- Why This Use Case Matters To This Spine:
  - Claude has the same stale-copy problem today even though it does not have Codex’s suffix behavior.

### Goal

Expose configured Claude skills through `.claude/skills/<sanitized-skill-name>` symlinks to the original source roots so source updates are immediately visible and cleanup remains safe.

### Preconditions

- Configured skills are exposed to Claude bootstrap.
- Source skill root exists and contains `SKILL.md`.

### Expected Outcome

- `.claude/skills/<sanitized-skill-name>` is a symlink to the source skill root.
- No copied bundle or marker file is written.
- Cleanup removes only the expected same-source symlink on final release.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts:bootstrapForCreate(...)
├── src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts:bootstrapInternal(...)
│   ├── src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:materializeConfiguredClaudeWorkspaceSkills(...) [ASYNC]
│   │   ├── src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:acquireMaterializedSkill(...) [ASYNC]
│   │   │   ├── src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:ensureWorkspaceSkillSymlink(...) [ASYNC]
│   │   │   │   ├── src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:buildWorkspaceSkillsRoot(...) [STATE]
│   │   │   │   ├── src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:buildWorkspaceSkillDirectoryName(...) [STATE]
│   │   │   │   ├── src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:inspectExistingWorkspaceSkillPath(...) [IO]
│   │   │   │   ├── src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:assertWorkspaceSkillPathIsSafe(...) [STATE]
│   │   │   │   └── node:fs/promises:symlink(...) [IO]
│   │   │   └── src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:buildDescriptor(...) [STATE]
│   │   └── [STATE] registry holder count increments
│   └── src/agent-execution/backends/claude/backend/claude-agent-run-context.ts:constructor(...)
└── src/agent-execution/domain/agent-run-context.ts:constructor(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] if the intuitive workspace path already exists as the same-source symlink
src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:ensureWorkspaceSkillSymlink(...)
└── src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:reuseExistingWorkspaceSkillSymlink(...)
```

```text
[ERROR] if the intuitive workspace path exists but points to a different target or is not a symlink
src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:assertWorkspaceSkillPathIsSafe(...)
└── throw Error("workspace skill path collision ...")
```

```text
[ERROR] if final cleanup no longer sees the expected same-source symlink
src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts:removeOwnedWorkspaceSkillSymlink(...)
└── return without deleting the path
```

### State And Data Transformations

- Configured `Skill` -> intuitive `.claude/skills/<name>` descriptor.
- Existing filesystem path metadata -> ownership decision (`reuse`, `reject`, `remove and recreate`).
- Holder registry entry -> final cleanup decision.

### Observability And Debug Points

- Collision errors surface at Claude materializer boundary.
- Cleanup warnings remain at materializer boundary if unlink fails.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Live Claude symlink verification remains blocked by environment access; executable validation may need to rely on best-available local evidence until that blocker clears.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
