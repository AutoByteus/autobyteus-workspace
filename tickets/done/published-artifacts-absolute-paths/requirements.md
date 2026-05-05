# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` / user-approved base requirements plus design-impact rework on 2026-05-05.

- Ticket: `published-artifacts-absolute-paths`
- Last Updated: `2026-05-05`
- Base Branch: `origin/personal`
- Base Commit: `0a80f5fbdb88093697f16345a460cde6f112d353`

## Goal / Problem Statement

`publish_artifacts` must stop treating the current agent workspace as the maximum file boundary. A published artifact should be owned by the agent run, and an artifact path can be any readable absolute file path available to the server/runtime process, not only a path that resolves inside the run workspace.

This should follow the existing file-change path model: file changes are shown as `runId + path` rows, and outside-workspace absolute file paths are preserved and displayed through run-scoped server routes. Published artifacts should use the same run-owned path identity principle while preserving the durable published-artifact snapshot/revision model.

## Investigation Findings

- Current `publish_artifacts` is plural-only and should remain plural-only. No singular `publish_artifact` compatibility path should be reintroduced.
- Current published-artifact publication flow is already run/memory owned after validation:
  - `publish_artifacts` normalizes a plural `artifacts` array.
  - `PublishedArtifactPublicationService.publishForRun(...)` resolves the run/member-run authority and memory directory.
  - It snapshots the source file into `<memoryDir>/published_artifacts/revisions/<revisionId>/<sourceFileName>` via `PublishedArtifactSnapshotStore`.
  - It stores summaries/revisions in `<memoryDir>/published_artifacts.json`.
  - Application consumers read revision text from the memory snapshot through `PublishedArtifactProjectionService`.
- The workspace restriction is localized in published-artifact path identity and service validation:
  - `canonicalizePublishedArtifactPath(...)` returns `null` for any candidate outside `workspaceRootPath`.
  - `resolvePublishedArtifactAbsolutePath(...)` can only resolve canonical paths under `workspaceRootPath`.
  - `PublishedArtifactPublicationService` realpaths both the workspace and source and rejects symlink escapes with `Published artifact path must resolve to a file inside the current workspace.`
  - Tool/backend descriptions and docs repeat the same workspace-contained rule.
- File-change path identity already proves the important boundary precedent: run-owned file paths can come from different filesystem places and are not limited to the workspace. The published-artifact design should use that boundary precedent, but the user clarified that published-artifact storage should not force workspace-local absolute paths back into workspace-relative strings. For published artifacts, stored `path` should be the normalized absolute source identity after resolving relative inputs.
  - Relative publish inputs resolve against the workspace root before storage.
  - Absolute publish inputs remain absolute source identities.
  - Application consumers must not infer business role from workspace-relative-only path identity.
- The generic frontend Artifacts tab is currently driven by the run-file-change projection, not by `ARTIFACT_PERSISTED` summaries. Published artifacts are primarily consumed by application backends through the durable snapshot/revision API and live application relay.
- Because published artifacts already snapshot at publish time, outside-workspace absolute publication does not require historical live rereads of arbitrary host paths. The implementation should keep the snapshot-as-durable-content model and only use the original absolute path at publish time.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes`
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Needed`
- Evidence basis:
  - Published artifacts are stored and consumed from run memory, but validation still enforces workspace ownership before snapshotting.
  - File changes already model `runId + path` identity and preserve outside-workspace absolute paths.
  - Published-artifact docs/tool descriptions hard-code the old workspace-contained rule.
- Requirement or scope impact:
  - Replace workspace-contained validation with run-owned path identity and publish-time snapshot validation.
  - Update tool descriptions/docs/prompts/tests so agents no longer copy external artifacts into the workspace merely to satisfy `publish_artifacts`.

## Recommendations

- Use run-owned absolute source identity for published artifacts:
  - If a publish input path is relative, resolve it against the run workspace and store the normalized absolute source path.
  - If a publish input path is absolute, store the normalized absolute source path; do not rewrite it to workspace-relative solely because it is inside the workspace.
  - If filesystem realpath is used to collapse aliases such as `/tmp` and `/private/tmp`, the stored path should still be absolute, not workspace-relative.
- Keep publish-time snapshotting as the authoritative content model. The source absolute path should only need to be readable at publication time; later application reads should use the memory snapshot.
- Make workspace root optional for absolute-path publication. A workspace root is required only when resolving relative publish inputs into absolute source paths.
- Remove the realpath workspace containment check. Retain file validation (`stat().isFile()` plus readable/copyable source) and snapshot cleanup on later projection-write failures.
- Update user-facing and agent-facing descriptions to say that paths may be workspace-relative or absolute, and that absolute paths can be outside the workspace if readable by the runtime server.
- Keep the previous ticket's clean plural-only contract intact.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`

Rationale: the code change is concentrated in published-artifact path identity, validation, tests, and documentation, but it changes an ownership/security boundary and must preserve application snapshot semantics, runtime fallback behavior, and file-change consistency.

## In-Scope Use Cases

- `UC-001`: An agent publishes a workspace-relative file path created inside the configured workspace.
  - Expected: relative paths still resolve from the workspace root, but the persisted published-artifact path is the resolved normalized absolute source path, not a workspace-relative storage identity.
- `UC-002`: An agent publishes an absolute file path inside the configured workspace.
  - Expected: the artifact succeeds and the persisted published-artifact path remains a normalized absolute source path. It is not rewritten to workspace-relative storage identity.
- `UC-003`: An agent publishes an absolute readable file path outside the configured workspace.
  - Expected: the artifact succeeds, stores a normalized absolute display path, snapshots the file into run memory, and emits/relays the artifact as available.
- `UC-004`: An agent publishes an absolute readable file path when no workspace root is available but a run/member-run memory directory and runtime authority are available.
  - Expected: the artifact succeeds and stores the normalized absolute display path; no workspace binding is required for absolute-path publication.
- `UC-005`: An agent publishes a relative path when no workspace root is available.
  - Expected: the artifact fails clearly because relative paths require a workspace root.
- `UC-006`: An agent publishes through a workspace-relative symlink whose real target is outside the workspace.
  - Expected: the artifact succeeds if the resolved source is a readable file; the stored path is an absolute source identity for the resolved publish target, and the snapshot captures the target content at publish time.
- `UC-007`: A user or application reopens/reconciles a run after the original outside-workspace source file is deleted or moved.
  - Expected: published-artifact revision text/content remains available from the memory snapshot.
- `UC-008`: An agent attempts to publish a missing, unreadable, directory, or otherwise invalid path.
  - Expected: the tool reports a clear validation error and does not write a successful artifact summary/revision.
- `UC-009`: Built-in application prompts/config/docs reference `publish_artifacts`.
  - Expected: they no longer instruct agents that published artifact paths must remain inside the workspace or be copied into the workspace first.

## Out of Scope

- Reintroducing or supporting the singular `publish_artifact` tool.
- Publishing directories as artifacts.
- Publishing arbitrary URLs as artifacts.
- Adding a new generic frontend published-artifact browser separate from the existing file-change-driven Artifacts tab.
- Data migration for historical published-artifact projections.
- Redesigning the file-change subsystem beyond using its path identity semantics as the precedent.
- Adding a new host-file allowlist/approval layer in this ticket; runtime file-read authority remains the existing server/runtime authority.

## Functional Requirements

- `REQ-001`: `publish_artifacts` must accept a readable absolute file path outside the current workspace and must not reject it solely because it is outside the workspace.
- `REQ-002`: Workspace-relative publish inputs must remain supported and must resolve from the current run workspace root into a normalized absolute source path before storage.
- `REQ-003`: Absolute publish inputs inside a known workspace root must remain normalized absolute source paths in published-artifact storage; they must not be rewritten to workspace-relative paths solely because they are inside the workspace.
- `REQ-004`: Absolute publish inputs outside a known workspace root must canonicalize to normalized absolute source paths.
- `REQ-005`: Absolute-path publication must not require a workspace binding when the run/member-run has valid runtime authority and a durable memory directory.
- `REQ-006`: Relative-path publication must fail clearly when no workspace root is available.
- `REQ-007`: Published-artifact identity must remain `runId + canonicalPath`, where `canonicalPath` is the normalized absolute source path stored for the artifact. Relative publish inputs must resolve to that absolute canonical path before identity construction.
- `REQ-008`: Published-artifact content must continue to be snapshotted at publish time under the run/member-run memory directory; historical application reads must use the snapshot instead of the original source path.
- `REQ-009`: The source path must resolve to a readable regular file before a successful artifact summary/revision is persisted. Missing paths, directories, and unreadable/copy-failing files must fail without leaving projection entries or orphaned revision directories.
- `REQ-010`: Workspace-relative symlink escapes must no longer be rejected as workspace-boundary violations. If the resolved source is a readable regular file, publication succeeds and snapshots the resolved target content.
- `REQ-011`: Tool descriptions, runtime tool schemas, dynamic/MCP tool definitions, built-in application prompts, and public docs must describe the new path contract: paths can be workspace-relative or absolute; absolute paths may be outside the workspace if readable by the runtime server.
- `REQ-012`: The previous clean plural-only contract must remain intact: only `publish_artifacts` is registered, exposed, allowlisted, discoverable, and documented for publication.
- `REQ-013`: Unit tests must cover path identity and publication for workspace-relative paths, in-workspace absolute paths, outside-workspace absolute paths, absolute paths without workspace root, relative paths without workspace root, symlink escapes, invalid paths, snapshot persistence, and plural-only exposure non-regression.

## Acceptance Criteria

- `AC-001`: Given a readable file outside the configured workspace and an absolute path to it, when `publish_artifacts` is called, the call succeeds and the persisted summary path is the normalized absolute path.
- `AC-002`: Given a readable absolute file inside the configured workspace, when `publish_artifacts` is called, the call succeeds and the persisted summary/revision path remains a normalized absolute source path.
- `AC-003`: Given a workspace-relative readable file path, when `publish_artifacts` is called with a workspace root available, the call succeeds and the persisted summary/revision path is the resolved normalized absolute source path.
- `AC-004`: Given a readable absolute file path and no workspace root, when runtime authority and memory directory are available, `publish_artifacts` succeeds and snapshots the file.
- `AC-005`: Given a relative file path and no workspace root, when `publish_artifacts` is called, it fails with a clear message that relative artifact paths require a workspace root.
- `AC-006`: Given a workspace-relative symlink path whose real target is outside the workspace, when `publish_artifacts` is called, it succeeds if the target is a readable file, the stored path is absolute, and the snapshot contains the target content.
- `AC-007`: Given an outside-workspace source file is deleted after successful publication, when an application reads the published revision text, it still receives the snapshotted content.
- `AC-008`: Given a missing file, directory, or unreadable/copy-failing file, when `publish_artifacts` is called, it fails without adding a projection summary/revision and without leaving orphaned snapshot directories.
- `AC-009`: Given generated runtime tool definitions for AutoByteus, Codex, and Claude/MCP, when inspected in tests, their descriptions no longer state that artifact paths must be inside the current workspace.
- `AC-010`: Given built-in docs and application prompts/configs, when searched, there are no remaining source references that instruct agents to copy published artifacts into the workspace solely because `publish_artifacts` requires workspace-contained paths.
- `AC-011`: Given the tool registry/exposure tests, only `publish_artifacts` remains available; no singular `publish_artifact` compatibility path is added.

## Constraints / Dependencies

- The publication service currently depends on a workspace root before any path validation; this must be loosened for absolute paths.
- The durable content model already exists in `PublishedArtifactSnapshotStore`; the implementation should preserve it rather than introducing live source rereads.
- Application backends depend on `PublishedArtifactProjectionService.getRunPublishedArtifacts(...)` and `getPublishedArtifactRevisionText(...)` / `getPublishedArtifactRevisionTextFromMemoryDir(...)`.
- Brief Studio and Socratic Math Teacher currently map published artifacts to application roles from path strings. Those resolvers must be changed from workspace-relative-only exact path validation to application-owned semantic path matching that accepts absolute paths as valid inputs.
- The generic frontend Artifacts tab currently renders file-change entries. This ticket should not depend on changing that surface.

## Assumptions

- The server/runtime process is the authority for whether a source absolute path is readable.
- Allowing any readable absolute path is intentional user-approved behavior for `publish_artifacts` and not a temporary compatibility mode.
- Existing file-change path identity is the correct precedent for published-artifact path identity.
- Historical published-artifact reads should remain durable even if the original source path later disappears, because publish-time snapshots already provide that behavior.
- Application routing must not assume workspace-relative artifact paths. Apps may still recommend role-specific filenames, but their projection handlers must accept absolute paths from arbitrary runtime-readable folders and derive semantic roles from producer plus filename/suffix rather than exact workspace-relative identity. Published-artifact storage should preserve absolute source identity instead of normalizing app-local workspace files to relative storage paths.

## Risks / Open Questions

- Risk: Any readable absolute file can be published by an agent that has the tool and filesystem access. This follows the user's requested boundary but should be documented as server/runtime authority, not browser-local authority.
- Risk: Absolute source paths in summaries may reveal host path details to application consumers. This is already true for file-change display and is now intentional for outside-workspace published artifacts.
- Risk: Very large files can already be copied by snapshotting; this ticket does not introduce new size limits.
- Design direction: use file-change behavior as the run-owned/non-workspace-bound precedent, but keep a published-artifact-specific wrapper so published-artifact storage can enforce normalized absolute source identity instead of inheriting file-change workspace-local display canonicalization.

## Requirement-To-Use-Case Coverage

- `REQ-001` -> `UC-003`, `AC-001`
- `REQ-002` -> `UC-001`, `AC-003`
- `REQ-003` -> `UC-002`, `AC-002`
- `REQ-004` -> `UC-003`, `UC-004`, `AC-001`, `AC-004`
- `REQ-005` -> `UC-004`, `AC-004`
- `REQ-006` -> `UC-005`, `AC-005`
- `REQ-007` -> `UC-001`, `UC-002`, `UC-003`, `UC-004`, `AC-001`, `AC-002`, `AC-003`, `AC-004`
- `REQ-008` -> `UC-003`, `UC-004`, `UC-007`, `AC-004`, `AC-007`
- `REQ-009` -> `UC-008`, `AC-008`
- `REQ-010` -> `UC-006`, `AC-006`
- `REQ-011` -> `UC-009`, `AC-009`, `AC-010`
- `REQ-012` -> `AC-011`
- `REQ-013` -> `AC-001` through `AC-011`

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` -> Service-level outside-workspace absolute path publication test.
- `AC-002` -> Service/path-identity test proving in-workspace absolute publication stores an absolute source path rather than a workspace-relative path.
- `AC-003` -> Service regression test proving workspace-relative publish inputs resolve to absolute stored source paths.
- `AC-004` -> Service fallback/no-workspace-root absolute path publication test.
- `AC-005` -> Service fallback/no-workspace-root relative path rejection test.
- `AC-006` -> Service symlink escape test updated from rejection to successful snapshot.
- `AC-007` -> Projection/snapshot test proving historical reads use the snapshot, not the original source path.
- `AC-008` -> Validation/cleanup tests for missing, directory, unreadable, and copy-failing inputs.
- `AC-009` -> Unit tests for BaseTool, Codex dynamic tool, and Claude/MCP tool descriptions.
- `AC-010` -> Repository search or focused docs/prompt tests guarding old workspace-contained guidance.
- `AC-011` -> Existing plural-only registry/exposure tests remain green and no singular tool files/configs are added.


## Design-Impact Rework: Application Artifact Path Semantics

Downstream implementation/API-E2E work surfaced a user clarification: because `publish_artifacts` intentionally accepts readable absolute source paths from anywhere the runtime/server can access, application artifact projection handlers must not assume published artifact paths are workspace-relative. This is not only a tool publication concern; it is also an application-consumer contract.

Additional in-scope use cases:

- `UC-010`: Brief Studio receives a writer artifact with path `/Users/.../Downloads/final-brief.md` or `/Users/.../Downloads/brief-studio/final-brief.md`.
  - Expected: the app recognizes it as the writer final artifact from producer plus filename/suffix, reads the published revision snapshot, stores/projects the artifact, and advances the brief review state.
- `UC-011`: Brief Studio receives a researcher artifact with path `/Users/.../Downloads/research.md` or `/Users/.../Downloads/brief-studio/research.md`.
  - Expected: the app recognizes it as the researcher research artifact and projects it without requiring a workspace-relative path.
- `UC-012`: Socratic Math Teacher receives tutor artifacts with absolute paths ending in `lesson-response.md` or `lesson-hint.md`.
  - Expected: the app recognizes the lesson message kind and projects it without requiring `socratic-math/...` workspace-relative paths.
- `UC-013`: An app frontend renders projected artifacts whose stored source `path` may be absolute.
  - Expected: semantic UI decisions use app-owned fields such as `publicationKind` / message kind, not exact workspace-relative path comparisons.

Additional functional requirements:

- `REQ-014`: Application published-artifact handlers must treat `PublishedArtifactSummary.path` / `ApplicationPublishedArtifactEvent.path` as a source/display identity, not as the sole semantic role identifier. New core publications store normalized absolute source paths; handlers may still accept relative historical/test inputs through the same semantic resolver, but they must not require workspace-relative paths.
- `REQ-015`: Brief Studio must replace workspace-relative-only exact artifact path matching with an app-owned role resolver that accepts absolute paths by producer plus recognized artifact filename/suffix.
- `REQ-016`: Socratic Math Teacher must replace workspace-relative-only exact artifact path matching with an app-owned role resolver that accepts absolute paths by recognized lesson artifact filename/suffix.
- `REQ-017`: Application projection should preserve the received published artifact path for traceability while deriving artifact role from semantic fields/rules. Neither core storage nor app projection may rewrite an absolute source path into a fake workspace-relative path just to make projection succeed.
- `REQ-018`: Application frontends must not use exact workspace-relative path checks for semantic state such as “final artifact”; they must use app-owned semantic fields such as `publicationKind`.
- `REQ-019`: Validation must cover app-level projection for absolute published artifact paths, not only service-level publication success.
- `REQ-020`: Published-artifact durable projection storage must not store workspace-local files as workspace-relative paths. The stored `path` must be a normalized absolute source identity for both absolute publish inputs and workspace-relative publish inputs after resolution.
- `REQ-021`: The platform-level published-artifact contract must not impose an application-relative or workspace-relative path interpretation. Application-specific artifact meaning is application-internal business logic; the platform must store, snapshot, emit, and expose the source path identity without constraining future applications to relative path schemes.

Additional acceptance criteria:

- `AC-012`: Given Brief Studio receives a writer `final-brief.md` artifact from an absolute outside-workspace path, projection succeeds, the artifact is stored with its received path, `publicationKind` is `final`, and the brief becomes review-ready/in-review according to existing rules.
- `AC-013`: Given Brief Studio receives researcher `research.md` from an absolute outside-workspace path, projection succeeds and stores/projects the research artifact.
- `AC-014`: Given Socratic Math Teacher receives `lesson-response.md` or `lesson-hint.md` from an absolute outside-workspace path, the lesson message is inserted with the correct message kind.
- `AC-015`: Given Brief Studio frontend data includes an absolute path for the final artifact, final-artifact rendering/selection uses `publicationKind === "final"` rather than `path === "brief-studio/final-brief.md"`.
- `AC-016`: Focused app resolver tests assert that direct relative app-path fixtures and absolute paths with equivalent recognized filenames/suffixes both map through the same semantic resolver; the relative case must not be implemented by preserving an exact workspace-relative-only validator.
- `AC-017`: Focused storage tests assert that an in-workspace absolute publish input and a workspace-relative publish input both persist absolute summary/revision paths rather than workspace-relative paths.
- `AC-018`: Given application-facing published-artifact summaries/events, platform tests/docs verify that the path field is treated as source identity and no platform adapter, relay, or generic contract requires application artifacts to use workspace-relative paths.

Additional coverage mapping:

- `REQ-014` -> `UC-010`, `UC-011`, `UC-012`, `UC-013`, `AC-012`, `AC-013`, `AC-014`, `AC-015`
- `REQ-015` -> `UC-010`, `UC-011`, `AC-012`, `AC-013`, `AC-016`
- `REQ-016` -> `UC-012`, `AC-014`, `AC-016`
- `REQ-017` -> `UC-010`, `UC-011`, `AC-012`, `AC-013`
- `REQ-018` -> `UC-013`, `AC-015`
- `REQ-019` -> `AC-012`, `AC-013`, `AC-014`, `AC-015`, `AC-016`
- `REQ-020` -> `UC-001`, `UC-002`, `AC-002`, `AC-003`, `AC-017`
- `REQ-021` -> `UC-010`, `UC-011`, `UC-012`, `UC-013`, `AC-012`, `AC-013`, `AC-014`, `AC-015`, `AC-018`

## Approval Status

Approved by the user on 2026-05-05. User explicitly confirmed that absolute paths should be allowed. Later on 2026-05-05, user clarified via downstream reroute that application artifact consumers must also treat absolute artifact paths as valid and must not assume workspace-relative-only paths. User further clarified that published-artifact storage should not convert workspace-local absolute paths into relative paths; absolute source identity is more accurate because agents can write files in different folders. Final clarification: storage should store the absolute path directly—relative inputs resolve to absolute paths before persistence, and absolute inputs remain absolute. The platform must not constrain application artifact interpretation to workspace-relative paths; each application owns its own semantic mapping.
