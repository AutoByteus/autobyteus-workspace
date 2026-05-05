# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Design-impact rework in progress after downstream user clarification about application absolute-path handling`
- Investigation Goal: Determine how to change `publish_artifacts` so artifact paths are run-owned and can be any readable absolute path, matching file-change path behavior instead of workspace-bound validation.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The implementation surface is concentrated, but the change crosses path identity, runtime publication validation, durable snapshot semantics, app-facing docs/prompts, and tests.
- Scope Summary: Replace workspace-contained `publish_artifacts` validation with file-change-like path identity and publish-time snapshot validation; keep plural-only contract.
- Primary Questions To Resolve:
  1. Where is the current workspace containment enforced?
  2. How do file changes preserve/display outside-workspace absolute paths today?
  3. Does published-artifact content already snapshot into run memory, or would outside paths require live rereads?
  4. Which descriptions/docs/tests still encode the old workspace-contained contract?

## Request Context

The user requested this new ticket after the previous `publish-artifacts-plural-refactor` ticket was merged to remote `personal`. The user clarified that artifact paths should not be limited to the agent workspace: they can be any absolute path. The user specifically pointed to file-change display as the precedent: file changes belong to the agent run ID and are not limited to the workspace.

Locked user requirement from 2026-05-05: published artifact path identity is run-owned, and outside-workspace absolute file paths must be accepted when readable by the runtime server.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/published-artifacts-absolute-paths`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/published-artifacts-absolute-paths/tickets/in-progress/published-artifacts-absolute-paths`
- Current Branch: `codex/published-artifacts-absolute-paths`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/published-artifacts-absolute-paths`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: local `personal` and `origin/personal` both at `0a80f5fbdb88093697f16345a460cde6f112d353`; initial bootstrap was `18f75c903eb3fe07949a18d5dd044e09f2147cb6`, then the ticket branch was fast-forwarded after `origin/personal` advanced
- Task Branch: `codex/published-artifacts-absolute-paths`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): user's remote personal branch flow
- Bootstrap Blockers: None
- Notes For Downstream Agents: Previous plural-only refactor is already merged into `origin/personal`; do not reintroduce singular `publish_artifact`. Current design artifacts are based on refreshed `origin/personal` commit `0a80f5fbdb88093697f16345a460cde6f112d353`.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-05 | Command | `git fetch origin --prune && git checkout personal && git pull --ff-only origin personal && git rev-parse personal && git rev-parse origin/personal` | Refresh local personal branch per user request | Local `personal` and `origin/personal` both resolved to `18f75c903eb3fe07949a18d5dd044e09f2147cb6` | No |
| 2026-05-05 | Command | `git worktree add -b codex/published-artifacts-absolute-paths /Users/normy/autobyteus_org/autobyteus-worktrees/published-artifacts-absolute-paths origin/personal` | Create dedicated ticket branch/worktree | New branch tracks `origin/personal`; worktree HEAD `18f75c903eb3fe07949a18d5dd044e09f2147cb6` | No |
| 2026-05-05 | Command | `git fetch origin --prune && git pull --ff-only origin personal && git merge --ff-only origin/personal` | Refresh base and ticket branch before architecture handoff | Local `personal`, `origin/personal`, and ticket worktree HEAD all resolved to `0a80f5fbdb88093697f16345a460cde6f112d353`; ticket branch is no longer behind | No |
| 2026-05-05 | Code Search | `rg -n "publish_artifacts|Published artifact|publish-artifacts|resolve.*workspace|current workspace" ...` | Locate current publish-artifact implementation and stale workspace wording | Found current service, tool contract, dynamic/MCP definitions, docs, app prompts, tests | Yes |
| 2026-05-05 | Code | `autobyteus-server-ts/src/services/published-artifacts/published-artifact-tool-contract.ts` | Inspect public tool contract | Tool is plural-only; description says files are from current workspace and must still resolve inside current workspace | Update descriptions |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-tools/published-artifacts/publish-artifacts-tool.ts` | Inspect BaseTool schema and runtime fallback context | Schema item `path` says file must still be inside workspace; tool passes run/member run, memoryDir, workspaceRootPath, app context, and live notifier to publication service | Update schema wording; preserve fallback context |
| 2026-05-05 | Code | `autobyteus-server-ts/src/services/published-artifacts/published-artifact-path-identity.ts` | Find workspace containment owner | `canonicalizePublishedArtifactPath` rejects outside-workspace candidates; `resolvePublishedArtifactAbsolutePath` only resolves under workspace | Replace with file-change-like semantics |
| 2026-05-05 | Code | `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts` | Inspect validation, snapshot, projection, event flow | Service requires workspace binding; rejects non-workspace canonical paths; realpath-checks workspace containment; snapshots source into run memory after validation; writes projection and emits/relays event | Remove workspace-bound checks; keep snapshot/projection/event flow |
| 2026-05-05 | Code | `autobyteus-server-ts/src/services/published-artifacts/published-artifact-snapshot-store.ts` | Confirm durable content model | Copies source file into `<memoryDir>/published_artifacts/revisions/<revisionId>/<sourceFileName>` and reads revisions from memory | Keep as authoritative content model |
| 2026-05-05 | Code | `autobyteus-server-ts/src/run-history/services/published-artifact-projection-service.ts` | Confirm application/historical reads | Reads summaries/revisions from memory projection; revision text comes from memory snapshot, not original source path | Outside source deletion should not affect reads after publish |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change-path.ts` and `autobyteus-server-ts/src/services/run-file-changes/run-file-change-path-identity.ts` | Compare desired file-change precedent | File-change canonicalization proves run-owned paths can come from outside the workspace, but it still converts workspace-local absolute paths to relative display identities | Reuse the non-workspace-bound precedent and low-level classification where helpful, but published-artifact storage must enforce normalized absolute source identity |
| 2026-05-05 | Code | `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts` and `autobyteus-server-ts/src/api/rest/run-file-changes.ts` | Trace file-change retrieval | Projection resolves relative paths against workspace and absolute paths directly; REST route serves content through `/runs/:runId/file-change-content` | Confirms server/run boundary, not browser-local reads |
| 2026-05-05 | Code | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | Verify frontend artifact/file-change display path | Viewer builds a run-scoped REST URL using `artifact.runId` and `artifact.path`; no client local file read | Confirms user analogy |
| 2026-05-05 | Test | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | Find outside-workspace frontend coverage | Tests assert external absolute paths like `/Users/normy/Downloads/apply_patch_test.txt` fetch through run-scoped server route and display without `//` prefix | Use as acceptance precedent |
| 2026-05-05 | Test | `autobyteus-server-ts/tests/unit/services/run-file-changes/run-file-change-path-identity.test.ts` | Confirm file-change identity tests | Tests assert outside-workspace absolute paths are preserved | Add equivalent published-artifact tests |
| 2026-05-05 | Test | `autobyteus-server-ts/tests/unit/services/published-artifacts/published-artifact-publication-service.test.ts` | Inspect current published-artifact expectations | Current tests expect symlink escapes to be rejected and in-workspace absolute paths to canonicalize relative | Update symlink/outside tests to new behavior |
| 2026-05-05 | Doc | `docs/custom-application-development.md` | Locate public contract wording | Docs say paths may be relative/absolute but must resolve inside workspace, and external files must be copied into workspace first | Update docs |
| 2026-05-05 | Code | `applications/brief-studio/**`, `applications/socratic-math-teacher/**` via `rg publish_artifacts` | Locate built-in app prompts/configs | Built-in prompts tell agents to call plural `publish_artifacts`; some say use exact absolute path returned by `write_file`; not all encode workspace restriction | Remove old workspace-restriction wording only; preserve app-specific file naming rules |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Agent/tool runtime calls `publish_artifacts({ artifacts: [{ path, description? }] })`.
- Current execution flow:
  1. `normalizePublishArtifactsToolInput(...)` enforces plural array shape and rejects old top-level single-file fields.
  2. `publish-artifacts-tool.ts` resolves `runId` from member-run or agent context and optionally builds fallback runtime context with `memoryDir`, `workspaceRootPath`, app execution context, and live notifier.
  3. `PublishedArtifactPublicationService.publishForRun(...)` finds active run or fallback authority, then requires a memory directory and workspace root.
  4. `canonicalizePublishedArtifactPath(input.path, workspaceRootPath)` rejects outside-workspace candidates by returning `null`.
  5. `resolvePublishedArtifactAbsolutePath(canonicalPath, workspaceRootPath)` resolves only inside the workspace.
  6. Service `stat`s the file, realpaths the workspace and file, and rejects if the real source is not inside the real workspace.
  7. If validation passes, service snapshots the file into run/member-run memory, writes `published_artifacts.json`, emits `ARTIFACT_PERSISTED`, and relays to application bindings when needed.
- Ownership or boundary observations:
  - The durable published-artifact owner is already the run/member-run memory directory.
  - The workspace is currently only a pre-snapshot source-path validation boundary, not the durable content owner.
  - This conflicts with file-change path identity, where the run owns the row even when the path is absolute and outside the workspace.
- Current behavior summary:
  - In-workspace relative/absolute publication succeeds.
  - Outside-workspace absolute publication fails before snapshotting.
  - Workspace-relative symlink escape fails before snapshotting.
  - Historical application reads use memory snapshots, so outside-source lifetime is not inherently a blocker after publication.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Behavior Change`
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture evidence summary: Published artifacts have a run-memory owner but path identity still treats workspace containment as the source authority. Refactor is needed now to align path identity and validation with run ownership and file-change precedent.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `published-artifact-publication-service.ts` | Requires workspace binding and realpath containment before snapshotting | Workspace acts as false owner of published source files | Refactor validation |
| `published-artifact-snapshot-store.ts` | Stores durable revision snapshots in memory | Snapshot model already supports outside-source historical reads | Preserve |
| `agent-run-file-change-path.ts` | Preserves outside-workspace absolute paths | Existing system precedent supports user's desired behavior | Reuse/mirror |
| `ArtifactContentViewer.spec.ts` | Tests external absolute path display/fetch | Frontend run-scoped route already avoids workspace-only display | Use as scenario precedent |
| `docs/custom-application-development.md` | Says external files must be copied into workspace before publication | Docs will be incorrect after behavior change | Update docs |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-tool-contract.ts` | Shared plural tool input contract and description | Description encodes workspace-only rule | Update description; keep schema strict/plural |
| `autobyteus-server-ts/src/agent-tools/published-artifacts/publish-artifacts-tool.ts` | BaseTool registration and context bridge | Schema path description encodes workspace-only rule; fallback context carries workspace/memory/app notifier | Update wording; preserve bridge |
| `autobyteus-server-ts/src/agent-execution/backends/codex/published-artifacts/build-codex-publish-artifacts-dynamic-tool-registration.ts` | Codex dynamic tool definition | Path description encodes workspace-only rule | Update wording/tests |
| `autobyteus-server-ts/src/agent-execution/backends/claude/published-artifacts/build-claude-publish-artifacts-tool-definition.ts` | Claude/MCP tool definition | Path description encodes workspace-only rule | Update wording/tests |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-path-identity.ts` | Published artifact path canonicalization/resolution | Rejects outside workspace | Replace with file-change-compatible identity |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts` | Publish validation, snapshotting, projection write, event relay | Requires workspace root and realpath containment | Make workspace optional for absolute paths; keep snapshot/projection/event ownership |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-projection-store.ts` | Durable summaries/revisions JSON under memory | Normalizes path string and type | Should accept absolute normalized paths too |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-snapshot-store.ts` | Durable revision snapshot storage | Copies source into memory | Remains correct source of historical content |
| `autobyteus-server-ts/src/run-history/services/published-artifact-projection-service.ts` | Application/historical published artifact reads | Reads revision text from memory snapshot | Confirms no live reread needed |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-file-change-path.ts` | File-change path identity | Already implements the non-workspace-bound outside-absolute precedent, but its workspace-local display canonicalization is not the target storage behavior for published artifacts | Candidate shared low-level path helper; published-artifact wrapper keeps absolute storage semantics |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | File-change-driven Artifact tab content viewer | Uses run-scoped route for both relative and absolute file-change paths | Confirms frontend precedent; no generic published-artifact UI change required |
| `docs/custom-application-development.md` | Public custom app guide | Says publish paths must be inside workspace | Must update |
| `applications/brief-studio/**`, `applications/socratic-math-teacher/**` | Built-in app prompts/configs | Use plural `publish_artifacts`; app-level artifact path expectations still matter | Preserve app-specific paths while removing workspace-only guidance |

## Runtime / Probe Findings

No live runtime reproduction was run during this solution-design pass. Existing test evidence and source inspection were sufficient to establish current behavior and target design constraints.

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-05 | Static test inspection | `sed -n '130,240p' autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | Existing test expects external absolute file-change path to fetch via run-scoped server route | Confirms file-change display is not workspace-limited |
| 2026-05-05 | Static test inspection | `sed -n '1,120p' autobyteus-server-ts/tests/unit/services/run-file-changes/run-file-change-path-identity.test.ts` | Existing test expects outside absolute file-change path to be preserved | Published artifacts should gain equivalent tests |
| 2026-05-05 | Static test inspection | `sed -n '1,430p' autobyteus-server-ts/tests/unit/services/published-artifacts/published-artifact-publication-service.test.ts` | Current test rejects symlink escapes as workspace boundary violations | Must update to acceptance semantics |

## External / Public Source Findings

No internet or external sources were used. This is a local repository behavior/design task.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: none for solution-design pass.
- Required config, feature flags, env vars, or accounts: none.
- External repos, samples, or artifacts cloned/downloaded for investigation: none.
- Setup commands that materially affected the investigation: git remote refresh and dedicated worktree creation recorded above.
- Cleanup notes for temporary investigation-only setup: none.

## Findings From Code / Docs / Data / Logs

1. The old workspace-contained rule exists in code and prose:
   - `PublishedArtifactPublicationService` throws `Published artifact path must resolve to a file inside the current workspace.`
   - Shared tool description says files come from the current run workspace and must still resolve inside it.
   - BaseTool/Codex/Claude schemas repeat the same requirement.
   - `docs/custom-application-development.md` instructs agents to copy files into the workspace first.
2. Published artifacts already snapshot source content into run memory at publish time.
3. Application backends read published artifacts through memory snapshots, not source paths.
4. File-change path identity and frontend display already support outside-workspace absolute paths.
5. Generic frontend Artifacts tab does not currently consume `ARTIFACT_PERSISTED`; it displays file-change rows. This ticket should not require new generic published-artifact UI behavior.

## Constraints / Dependencies / Compatibility Facts

- Clean plural-only `publish_artifacts` behavior from the prior ticket is a hard constraint.
- Existing app path routing currently expects workspace-relative artifact paths for app-owned files such as `brief-studio/research.md` and `socratic-math/lesson-response.md`; that current expectation is part of the design impact and must be replaced with app-owned semantic resolvers. New published-artifact storage must keep normalized absolute source paths even for in-workspace absolute inputs and for relative inputs after resolution.
- Relative paths need a workspace root. Absolute paths should not.
- Snapshot cleanup on projection write failure already exists and should be retained.
- Allowing outside absolute paths is intentional; do not add hidden workspace compatibility or old-boundary fallback behavior.

## Open Unknowns / Risks

- Implementation design should use shared low-level path classification/resolution where it reduces duplication, but published-artifact-specific helpers must own the absolute-storage result shape and must not directly inherit file-change workspace-local display canonicalization.
- Large-file and sensitive-file publication risks exist because any server-readable absolute file can be snapshotted. This is aligned with user intent and existing runtime authority, but docs should avoid implying browser-local access.
- Generated frontend GraphQL types likely do not need changes because published-artifact summaries are not exposed through the generic frontend GraphQL path, but implementation should confirm if any generated code is touched.

## Notes For Architect Reviewer

- The core design decision is now locked by user clarification: published artifact paths are run-owned and not workspace-limited.
- The safest implementation direction is to keep publish-time snapshots. Do not design a live-reread dependency on arbitrary outside paths.
- The existing file-change path identity is strong precedent for run-owned, non-workspace-bound paths, but target published-artifact identity now intentionally stores normalized absolute source paths rather than file-change-style workspace-local relative display paths.
- The previous `publish_artifacts` plural-only API cleanup must remain undisturbed.


## Design-Impact Rework Investigation: Application Absolute-Path Consumers

Date: `2026-05-05`

Downstream implementation/API-E2E work surfaced an additional user clarification: application artifact consumers must not assume published artifact paths are workspace-relative. The user specifically objected to treating Brief Studio or other application handlers as if `brief-studio/...` relative paths were the only valid application artifact identifiers, because `publish_artifacts` now accepts any readable absolute path and team members may generate outputs in arbitrary locations such as Downloads.

Additional source log:

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-05 | Downstream Report | Implementation Engineer design-impact reroute | Identify new requirement gap | User clarified apps must handle absolute artifact paths as valid inputs, not workspace-relative-only paths | Revise requirements/design |
| 2026-05-05 | Code | `applications/brief-studio/backend-src/services/brief-artifact-paths.ts` | Inspect Brief Studio role mapping | `resolveBriefArtifactPathRule(...)` exact-matches normalized paths like `brief-studio/final-brief.md` and rejects absolute paths | Replace exact relative match with semantic resolver by producer + filename/suffix |
| 2026-05-05 | Code | `applications/brief-studio/backend-src/services/brief-artifact-reconciliation-service.ts` | Inspect projection use of path rule | Projection derives artifact kind/publication kind from path rule, then stores `input.path` in artifact/revision records | Keep storing received path for trace; change only role resolver |
| 2026-05-05 | Code | `applications/socratic-math-teacher/backend-src/services/lesson-artifact-paths.ts` | Inspect Socratic role mapping | Exact-matches `socratic-math/lesson-response.md` and `socratic-math/lesson-hint.md`; absolute paths reject | Replace exact relative match with semantic resolver by recognized basename/suffix |
| 2026-05-05 | Code | `applications/socratic-math-teacher/backend-src/services/lesson-artifact-reconciliation-service.ts` | Inspect lesson projection | Projection derives message kind from path rule and reads revision text from runtime control snapshot | Change role resolver only; snapshot read remains correct |
| 2026-05-05 | Code | `applications/brief-studio/frontend-src/brief-studio-renderer.js` | Inspect frontend semantic use of path | `isFinalArtifact` checks `artifact?.path === "brief-studio/final-brief.md"` | Change UI logic to use `publicationKind === "final"` |
| 2026-05-05 | Code | implemented `published-artifact-path-identity.ts` / publication service | Understand current implementation state | Core publication now supports outside absolute paths but current design/implementation still lets app validators reject valid absolute artifact paths | Add app-level requirements/tests |

Additional findings:

- The publication service and snapshot model can publish outside-workspace absolute paths, but current sample application resolvers still use exact workspace-relative path strings as semantic role keys.
- This creates a cross-boundary mismatch: core publication says absolute paths are valid, while application projection rejects them before reading the already-durable snapshot.
- The application role should be an app semantic concern, not the same as source/display path identity. The path field should remain the received published path for traceability, while the app derives role from producer plus a recognized filename/suffix or equivalent app-owned rule.
- Brief Studio already stores semantic fields (`artifactKind`, `publicationKind`) separately from `path`; the UI should use those fields for final/draft/research decisions rather than exact `path` comparisons.
- Socratic Math Teacher stores lesson message kind separately from path; its resolver can similarly accept absolute paths ending in recognized lesson artifact names.

Design implication:

- Add an application-consumer spine: `ApplicationPublishedArtifactEvent / published summary -> application role resolver -> app projection repository/UI`.
- Replace “preserve app-specific path validators” with “replace exact relative-only validators with app-owned semantic path resolvers that accept absolute paths.”
- Keep publish-time snapshots as the durable content authority; no app should reread original absolute source paths.


## Follow-up User Clarification: Storage Should Preserve Absolute Source Identity

Date: `2026-05-05`

The user further clarified that applications cannot assume workspace-relative artifact paths because agents can write to any folder. The clarification also applies to durable published-artifact storage: even if a generated file is under the app/workspace folder, published-artifact storage should not force the path into a relative form. Absolute paths are more accurate because file outputs and file-change events can originate from different places.

Design impact:

- Use file-change behavior as the precedent for non-workspace-bounded run-owned paths, but do not copy the old published-artifact assumption that app-local/workspace-local files should be stored as relative paths.
- `PublishedArtifactSummary.path` and revision `path` should be normalized absolute source identities. If the tool input is relative, resolve it against the workspace root before storage.
- Application role resolvers must treat the path as source/display trace and derive business role from producer plus filename/suffix or other app-owned semantics.
- If realpath alias collapsing is used for existing files, it must still produce an absolute stored path, not a workspace-relative path.

Additional source check after clarification:

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-05 | Code | `sed -n '1,260p' autobyteus-server-ts/src/agent-execution/domain/agent-run-file-path-identity.ts` and `sed -n '1,240p' autobyteus-server-ts/src/services/published-artifacts/published-artifact-path-identity.ts` | Verify current work-in-progress path helper against clarified storage rule | The current shared helper path still has a mode that canonicalizes workspace-local realpaths to relative display paths; the published-artifact wrapper currently forwards that `canonicalPath` into storage | Revise the helper/wrapper so published artifacts persist normalized absolute source identity and file-change relative display canonicalization remains file-change-specific |

## Final User Clarification: Store The Resolved Absolute Path Directly

Date: `2026-05-05`

The user restated the intended storage rule: if a relative path is passed to `publish_artifacts`, it can and should be resolved to an absolute path; if an absolute path is passed, it is already absolute. Therefore published-artifact storage should store the absolute path directly instead of storing a workspace-relative form.

Design impact:

- New published-artifact summaries/revisions store the normalized resolved absolute source path directly.
- Relative tool input is only an input convenience and is not a durable storage identity.
- Absolute tool input remains absolute after normalization/path resolution.
- No workspace-relative storage form should be created for new publications.


## Final User Clarification: Application Interpretation Is App Business

Date: `2026-05-05`

The user clarified the platform/application boundary: how an application interprets an artifact path is application-internal business logic. The platform should not limit application artifact paths to workspace-relative or app-relative forms because that would constrain future applications whose agents may write outputs to arbitrary folders.

Design impact:

- Platform published-artifact storage/event contracts should carry source path identity, now normalized absolute for new publications.
- Platform code must not impose a workspace-relative/app-relative interpretation as a prerequisite for application consumption.
- Application handlers own semantic mapping from source path plus app context/producer to business roles.
- Future apps remain free to decide their own filename, folder, and projection rules without changing platform path semantics.
