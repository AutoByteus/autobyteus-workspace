# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Bootstrap and current-state investigation completed; after architecture review round 1 and further user clarification, the upstream package is being revised away from application-journal artifact forwarding and toward direct application consumption of the shared published-artifact boundary.
- Investigation Goal: Define the publish-artifact simplification ticket as a standalone foundational change before Review Mode work.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The ticket spans agent-facing tool contract simplification, runtime exposure across three backends, platform artifact-boundary semantics, and dependent application redesign in Brief Studio and Socratic Math.
- Scope Summary: Replace the current application-oriented `publish_artifact` payload with a file-based cross-runtime artifact publication contract and establish published artifacts as a dedicated platform boundary distinct from generic file changes.
- Primary Questions To Resolve:
  1. What does the current `publish_artifact` contract actually require and validate?
  2. Which runtimes currently expose `publish_artifact`, and how are tools surfaced in each runtime?
  3. Is there already a file-based artifact boundary elsewhere in the platform that this ticket should reuse or distinguish from?
  4. Which application packages currently depend on the old artifact payload shape?
  5. What exact user/product clarification changes the scope of this ticket?

## Request Context

- User decided to split the broader work into two tickets and asked to work only on ticket 1 first.
- Ticket 1 is the `publish_artifact` simplification and foundation ticket; Review Mode / Team Board is explicitly out of scope for now.
- User clarified that an artifact means a real file produced by the agent after work, not a generic inline payload.
- User clarified that not every file change should be treated as an artifact; only intentional final/published outputs should count as artifacts.
- User explicitly directed that `contractVersion`, `artifactKey`, and `artifactType` should be removed from the agent-facing tool, and that the simplified contract should be just `path` plus optional `description`.
- User further clarified that `ARTIFACT_PERSISTED` should represent real artifacts and that run file changes must no longer be used as the product meaning of artifacts.
- User further clarified that the product/runtime artifact boundary only needs one authoritative artifact event: `ARTIFACT_PERSISTED`. A parallel `ARTIFACT_UPDATED` event should not remain part of the target published-artifact design.
- Architecture review round 1 surfaced the old design’s unresolved app-journal forwarding failure boundary, and the user then clarified that artifact handling should not be forwarded into the application journal at all; applications should listen to the shared artifact event/boundary directly and decide their own business behavior.
- User further clarified on 2026-04-22 that the existing frontend `Artifacts` tab is a legacy changed-files surface and must remain unchanged in this ticket; published-artifact display in the web UI requires a separate design.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/tickets/done/publish-artifact-simplification`
- Current Branch: `codex/publish-artifact-simplification`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch --all --prune` completed successfully before worktree creation on 2026-04-21.
- Task Branch: `codex/publish-artifact-simplification`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: This ticket was split out from the earlier broader Team Run Review / UX discussion and must be treated as a separate foundational workstream.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-21 | Command | `pwd`; `git rev-parse --is-inside-work-tree`; `git branch --show-current`; `git remote show origin`; `git worktree list` | Bootstrap environment and branch context | Base repo is on `personal`; no existing dedicated worktree for this ticket; bootstrap requires a new dedicated task worktree | No |
| 2026-04-21 | Setup | `git fetch --all --prune`; `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification -b codex/publish-artifact-simplification origin/personal` | Create dedicated task worktree/branch | Dedicated worktree/branch created successfully from fresh `origin/personal` state | No |
| 2026-04-21 | Doc | `.codex/skills/autobyteus-solution-designer-3225/design-principles.md` | Required shared design reference | Confirms clean-cut replacement, explicit ownership, and no legacy wrapper retention as mandatory design principles | No |
| 2026-04-21 | Code | `autobyteus-server-ts/src/application-orchestration/tools/publish-artifact-tool.ts` | Inspect current publish-artifact contract and runtime entry behavior | Current tool is application-oriented, requires rich payload fields, and normalizes multiple `artifactRef` shapes | No |
| 2026-04-21 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-artifact-publication-validator.ts` | Verify enforced input contract | Validates `contractVersion`, `artifactKey`, `artifactType`, optional `title/summary/metadata/isFinal`, and rejects extra fields | No |
| 2026-04-21 | Code | `autobyteus-server-ts/src/application-orchestration/utils/application-artifact-ref-validator.ts` | Verify artifact-ref meaning | Current contract supports `WORKSPACE_FILE`, `URL`, `BUNDLE_ASSET`, and `INLINE_JSON`; this is broader than the desired file-only product meaning | No |
| 2026-04-21 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Check native runtime tool exposure | AutoByteus runtime instantiates configured tools directly from the default registry, so it can expose `publish_artifact` today | No |
| 2026-04-21 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Check Codex/Claude runtime tool exposure | Codex and Claude currently expose selected dynamic/allowed tools only; `publish_artifact` is not currently surfaced there | No |
| 2026-04-21 | Code | `applications/brief-studio/agent-teams/brief-studio-team/agents/researcher/agent.md`, `applications/brief-studio/agent-teams/brief-studio-team/agents/writer/agent.md`, `applications/socratic-math-teacher/agent-teams/socratic-math-team/agents/socratic-math-tutor/agent.md` | Check app authoring guidance | Both apps explicitly teach the old rich payload shape and inline-JSON/body publication model | No |
| 2026-04-21 | Code | `applications/brief-studio/backend-src/services/brief-projection-service.ts`, `applications/brief-studio/backend-src/repositories/artifact-repository.ts` | Check downstream use of old fields | Brief Studio uses `artifactType` for business-state projection and stores `artifactKey`, `artifactType`, `title`, `summary`, `metadata`, `artifactRef`; its repository upsert key is not driven by `artifactKey` | No |
| 2026-04-21 | Code | `applications/socratic-math-teacher/backend-src/services/lesson-projection-service.ts` | Check downstream use of old fields | Socratic Math uses `artifactType` to distinguish hint vs normal response and falls back to `summary/title` when reading message body | No |
| 2026-04-21 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts`, `autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-normalizer.ts`, `autobyteus-web/stores/runFileChangesStore.ts`, `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | Check existing file-based artifact/file-change surfaces | Platform already has file-based change/artifact projections and viewer UI, but that path currently represents file-change telemetry and not intentional published-artifact semantics | Yes |
| 2026-04-21 | Code | `autobyteus-server-ts/src/services/run-file-changes/run-file-change-service.ts`, `autobyteus-server-ts/src/run-history/services/run-file-change-projection-service.ts`, `autobyteus-server-ts/src/api/graphql/types/run-file-changes.ts` | Confirm current authoritative artifact-facing read/write path | Current Artifacts tab is backed by `RunFileChangeService`, `file_changes.json`, and `getRunFileChanges(runId)`; the system currently treats touched-file telemetry as the artifact source of truth | Yes |
| 2026-04-21 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-item-event-converter.ts` | Verify whether artifact events are currently synthesized from file changes | Codex file-change conversion currently emits `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED` from filechange items, which conflicts with the desired explicit publication boundary | Yes |
| 2026-04-21 | Doc | `autobyteus-server-ts/docs/features/artifact_file_serving_design.md`, `autobyteus-web/docs/agent_artifacts.md`, `autobyteus-server-ts/docs/modules/agent_artifacts.md` | Read current documented artifact/file-change architecture | Current docs explicitly describe file changes as the active artifact-serving path and `ARTIFACT_*` as compatibility noise, which must be inverted by this ticket | Yes |
| 2026-04-21 | Code | `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | Check how application framework can expose runtime-side artifact reads after simplification | Application runtime control already centralizes host-side run operations, so published-artifact list/read methods can be added there instead of leaking direct filesystem access into applications | Yes |
| 2026-04-21 | Code | `autobyteus-server-ts/src/application-orchestration/stores/application-execution-event-journal-store.ts` | Check whether existing application journal infrastructure should remain the artifact delivery path | The journal already provides lifecycle/event durability, but after user clarification it should remain lifecycle-only; artifact handling should leave this path instead of adding artifact-specific retry/forwarding state | Yes |
| 2026-04-21 | Code | `autobyteus-server-ts/src/application-engine/services/application-engine-host-service.ts`, `autobyteus-server-ts/src/application-engine/worker/application-worker-runtime.ts` | Verify whether the application framework can invoke handlers directly without first appending artifact state into the application journal | The engine host already invokes application handlers directly, and workers already run `lifecycle.onStart` plus `runtimeControl`, so a direct live artifact relay + app-owned reconciliation model is feasible | Yes |
| 2026-04-21 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`, `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Verify whether a bound-run service can consume live runtime artifact events directly | Agent runs already support live event subscription and restored-run resolution, so a dedicated app artifact relay can listen to `ARTIFACT_PERSISTED` without routing artifact truth through the application journal | Yes |
| 2026-04-21 | Code | `autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts` | Verify whether app reconciliation can safely enumerate terminated/orphaned bindings | `listBindings(...)` can return all binding statuses, while `listNonterminalBindings(...)` intentionally excludes `TERMINATED` and `ORPHANED`; therefore artifact reconciliation must not rely on nonterminal-only selectors | Yes |
| 2026-04-21 | Code | `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`, `autobyteus-web/services/agentStreaming/AgentStreamingService.ts`, `autobyteus-web/components/layout/RightSideTabs.vue` | Check how live artifact events and artifact auto-focus currently behave on the web | Web protocol currently defines `ARTIFACT_*` payloads but ignores them; artifact auto-switching is driven by `runFileChangesStore`, and the latest clarification locks this current web behavior in place for this ticket | Yes |
| 2026-04-21 | Other | User clarification in chat on 2026-04-21 | Lock product meaning | Published artifacts must be real intentional artifacts; run file changes must not define artifact semantics; agent-facing contract should be just `path` plus optional `description` | No |
| 2026-04-21 | Other | User clarification in chat on 2026-04-21 | Tighten event semantics | `ARTIFACT_PERSISTED` is the only authoritative published-artifact event needed; `ARTIFACT_UPDATED` should not remain as part of the target artifact boundary | No |
| 2026-04-21 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/tickets/done/publish-artifact-simplification/design-review-report.md` | Consume architecture review round 1 as authoritative feedback | Blocking finding AR-PA-001 requires an explicit consistency/failure policy for the case where artifact persistence succeeds but application journal append fails for an application-bound run | No |
| 2026-04-21 | Other | User clarification in chat on 2026-04-21 after review round 1 | Simplify app integration model | Artifact publication should persist + emit `ARTIFACT_PERSISTED`; applications should listen to that shared artifact boundary directly instead of forwarding artifacts into the application execution journal | No |
| 2026-04-22 | Other | User clarification in chat on 2026-04-22 | Preserve current frontend boundary | Existing frontend `Artifacts` tab is a legacy changed-files surface and must remain unchanged in this ticket; published-artifact web UI requires a separate design | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: The current `publish_artifact` entrypoint lives in application orchestration as `autobyteus-server-ts/src/application-orchestration/tools/publish-artifact-tool.ts`.
- Current execution flow: agent tool call -> rich application publication payload validation -> application execution event ingress -> application execution journal -> application worker `eventHandlers.artifact` -> app-owned projection logic (Brief Studio / Socratic Math) consumes old fields -> app-specific storage / notifications.
- Ownership or boundary observations: The current tool is owned as an application publication boundary rather than a general runtime artifact boundary. It also overloads the agent with application/internal publication concerns. Separately, the platform already owns file-change telemetry and artifact viewers, but that lower-level path should not be treated as the same thing as intentional published artifacts.
- Current behavior summary: The current system has an application-oriented `publish_artifact` contract and a separate file-change artifact/viewer path, but no clean unified product boundary where published artifacts mean “intentional files explicitly published by the agent.”

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/tools/publish-artifact-tool.ts` | Agent-facing application publication tool | Too many fields for the real product meaning; currently application-centric | Needs a simpler agent-facing boundary |
| `autobyteus-server-ts/src/application-orchestration/services/application-artifact-publication-validator.ts` | Validate publication payload | Enforces legacy/publication-management fields | Must be redesigned or removed for the new contract |
| `autobyteus-server-ts/src/application-orchestration/utils/application-artifact-ref-validator.ts` | Validate application artifact references | Supports multiple reference kinds including inline JSON | Confirms current tool is broader than desired file-based artifact meaning |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Native runtime tool exposure | Registry-instantiates tools directly from `toolNames` | Existing exposure path can be reused for AutoByteus |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex runtime tool exposure | Dynamic tool exposure is separately owned and currently omits `publish_artifact` | Codex needs explicit runtime-side publish-artifact exposure |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Claude allowed-tool exposure | Allowed tools are explicitly curated and currently omit `publish_artifact` | Claude needs explicit runtime-side publish-artifact exposure |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts` | General runtime event taxonomy | Already contains `ARTIFACT_PERSISTED` and `ARTIFACT_UPDATED` | Strong candidate for the future authoritative published-artifact event family |
| `autobyteus-server-ts/src/services/run-file-changes/run-file-change-projection-normalizer.ts` | File-change projection normalization | Produces file-type classifications and change state | Keep as file-change telemetry, not artifact semantic source of truth |
| `autobyteus-web/stores/runFileChangesStore.ts` + `ArtifactsTab.vue` | Current file-change artifact UI | Existing UI shows changed files for file viewing, and the latest clarification keeps that legacy behavior in place for this ticket | Published artifacts must not be shown here yet; a separate design is required for any future published-artifact UI |
| `applications/brief-studio/**` | App-owned authoring/projection/storage for brief artifacts | Strongly coupled to old publication payload shape | Must be redesigned in this ticket |
| `applications/socratic-math-teacher/**` | App-owned tutor-turn publication/projection | Coupled to old publication payload shape and semantic labels | Must be redesigned in this ticket |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-21 | Probe | `rg -n "publish_artifact|ARTIFACT_PERSISTED|ARTIFACT_UPDATED|run-file-change" ...` | Found one application-oriented publish-artifact boundary plus a separate general file-change/artifact projection path | Ticket must decide and design the correct authoritative artifact boundary |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for bootstrap investigation.
- Required config, feature flags, env vars, or accounts: None.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch --all --prune`; `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification -b codex/publish-artifact-simplification origin/personal`
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The current `publish_artifact` tool is not just too verbose; it is architecturally scoped as an application publication boundary rather than a general runtime artifact boundary.
- `contractVersion` currently acts only as a literal validator gate and does not provide meaningful agent-facing value.
- `artifactKey` appears weakly justified in the current codebase; Brief Studio stores it but does not truly key persistence around it, and Socratic Math does not use it for projection logic.
- `artifactType` is currently used as an application semantic switch, but the user clarified that the original intended meaning was really file type and that file kind should instead be derived by the system from the file path/content.
- There is already a general runtime event family for artifacts (`ARTIFACT_PERSISTED` / `ARTIFACT_UPDATED`) and a file-change artifact/viewer path, but the user explicitly wants published artifacts separated from generic file changes.
- The user also explicitly wants the target published-artifact boundary to use only `ARTIFACT_PERSISTED`, not a two-event `persisted/updated` artifact pair.
- The current web Artifacts tab and artifact auto-focus behavior depend on run-file-change projection state rather than explicit published-artifact state, and the latest clarification says that legacy web behavior must remain unchanged in this ticket.
- Codex currently synthesizes artifact events from file-change items, so event cleanup is part of the target design and not just a UI concern.
- The application framework already has one strong host boundary (`ApplicationOrchestrationHostService`) where published-artifact read methods can be added for app projectors after inline JSON payloads are removed.
- Current app-bound publish success semantics are coupled to application journal append: the existing tool only returns success after artifact append into the app journal succeeds, so simplifying the artifact boundary also requires simplifying the application framework contract.
- The application framework already supports two clean primitives that make a simpler design possible: direct handler invocation through `ApplicationEngineHostService.invokeApplicationEventHandler(...)` and application-owned startup reconciliation through `lifecycle.onStart` plus `context.runtimeControl`.
- Agent runs already expose live runtime event subscriptions, so bound applications can consume `ARTIFACT_PERSISTED` through a dedicated relay service instead of redefining artifact truth through journal append.
- `ApplicationRunBindingStore` already distinguishes “all bindings” from “nonterminal bindings,” and only the former is safe for artifact catch-up after missed live delivery. A reconcile path that uses only active/nonterminal bindings can permanently miss revisions once the producing run terminates or becomes orphaned.
- The chosen revision direction is: artifact publication remains the only success subject, `ARTIFACT_PERSISTED` remains the shared live signal, applications consume that signal directly through a live relay rather than through application-journal artifact append, and applications own missed-delivery reconciliation by querying durable published artifacts by `revisionId`.
- Brief Studio and Socratic Math will both need redesign because they currently depend on old publication payload semantics and inline JSON bodies.

## Constraints / Dependencies / Compatibility Facts

- AutoByteus, Codex, and Claude do not share one uniform tool-exposure implementation today, so cross-runtime support requires runtime-specific exposure work under one shared user-facing contract.
- The existing file-change artifact viewer remains useful as a changed-files/file-viewer surface and, per the latest clarification, must remain the current web UI behavior in this ticket, but it cannot remain the semantic definition of a published artifact.
- Brief Studio and Socratic Math are both in-scope dependencies for this ticket because they currently block clean removal of the legacy payload.
- The user explicitly does not want backward-compatible retention of the old agent-facing contract.

## Open Unknowns / Risks

- The new downstream derivation rules for Brief Studio and Socratic Math still need design work so they do not smuggle old semantic payload fields back into the new contract.
- The application framework redesign must cleanly separate lifecycle journals from published-artifact delivery so artifact semantics do not slip back into application-owned journal state.
- App-owned reconciliation needs an explicit terminal-binding catch-up rule so terminated/orphaned bindings are not dropped before all missed `revisionId`s are projected.
- Any future published-artifact web viewer must be designed separately so the platform can add that capability without breaking the current changed-files tab.

## Notes For Architect Reviewer

- This ticket is now the foundational prerequisite for the later Review Mode work; Review Mode itself is out of scope here.
- The most important user clarification is that `ARTIFACT_PERSISTED` should become the true artifact signal and that run file changes must no longer define artifact semantics.
- The event design should collapse the authoritative published-artifact signal to `ARTIFACT_PERSISTED` only.
- The user’s latest clarification supersedes the old app-journal artifact-forwarding direction: artifact publication should persist + emit once, and applications should consume that boundary directly.
- A new 2026-04-22 clarification also locks the current frontend `Artifacts` tab in place as a changed-files surface; this ticket must not reinterpret that tab as a published-artifact viewer.
- Architecture review round 3 added one remaining blocker: app-owned reconciliation must remain correct across terminated/orphaned bindings until `revisionId` catch-up is complete; active-only selection is not safe enough.
- The design should prefer one clean file-based artifact boundary over preserving the application-only legacy contract or conflating artifacts with file-change telemetry.
