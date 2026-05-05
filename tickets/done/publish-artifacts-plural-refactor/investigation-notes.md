# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed
- Current Status: Investigation complete; requirements and design revised after architecture review round 2 failed on backward-compatibility retention.
- Investigation Goal: Determine all current singular `publish_artifact` definitions, runtime exposure paths, prompts/configs/docs/tests, and data contracts so the repository can perform a clean-cut migration to canonical `publish_artifacts` with no singular tool support.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Durable artifact persistence stays in one existing service, but the tool name/schema crosses native AutoByteus, Codex, Claude, app source prompts/configs, generated packages, discovery surfaces, and tests.
- Scope Summary: Clean-cut singular-to-plural published-artifact tool API migration.
- Primary Questions To Resolve:
  - Where is `publish_artifact` defined and exposed? Resolved.
  - Which built-in agents/prompts/configs/tests reference the singular name? Resolved.
  - Is there already a shared publication service that can be reused by a plural batch tool without duplicating publication semantics? Yes: `PublishedArtifactPublicationService.publishForRun(...)`.
  - Should the singular name remain in any runtime/tool path? No. User clarified on 2026-05-05 that no backward compatibility should be kept.
  - What validation and docs updates are required? Unit/integration tests plus app package builds; no long-lived docs currently reference the singular tool outside app prompts/guidance.

## Request Context

User requested refactoring singular `publish_artifact` to the recommended plural `publish_artifacts` API. User-provided target contract:

```ts
publish_artifacts({
  artifacts: [
    { path: string, description?: string | null }
  ]
})
```

The initial statement included a possible temporary singular migration path, but the user later clarified on 2026-05-05: no backward compatibility should be kept. The authoritative requirement is therefore a clean-cut replacement: only `publish_artifacts` is registered, exposed, allowlisted, discoverable, selectable, and tested.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo/superrepo.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor/tickets/done/publish-artifacts-plural-refactor`
- Current Branch: `codex/publish-artifacts-plural-refactor`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-05 before creating the task worktree.
- Task Branch: `codex/publish-artifacts-plural-refactor`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Authoritative artifacts are in the dedicated task worktree/branch, not the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-05 | Command | `git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap repo and base discovery | Git root is the superrepo; shared checkout was on `personal` tracking `origin/personal`; remote default points to `origin/personal`. | No |
| 2026-05-05 | Command | `git fetch origin --prune` | Refresh tracked remotes before task branch/worktree creation | Fetch completed successfully. | No |
| 2026-05-05 | Command | `git worktree add -b codex/publish-artifacts-plural-refactor /Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifacts-plural-refactor origin/personal` | Create dedicated task worktree/branch from latest tracked base | Worktree created at `origin/personal @ 1bed2087bc583add5f07d61a1e7fd61da28a4a2a`. | No |
| 2026-05-05 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design read | Design must be spine-led, ownership-led, reject backward compatibility, and make removal/decommission explicit. | No |
| 2026-05-05 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/references/design-examples.md` | Check concrete design-spec shape examples | Examples reinforce separating primary spine, return/event spine, bounded local loops, and concrete file mapping. | No |
| 2026-05-05 | Doc | `tickets/done/publish-artifact-simplification/*` | Understand prior published-artifact simplification context | Prior ticket simplified singular `publish_artifact` to `{ path, description? }`, added durable published-artifact boundary, and separated published artifacts from run file changes. | No |
| 2026-05-05 | Command | `rg -n --glob '!node_modules' --glob '!**/dist/**' --glob '!**/build/**' --glob '!tickets/**' --glob '!tmp/**' 'publish_artifact' .` | Count active non-generated singular references | 72 line references across 24 files when dist/build/tickets/tmp excluded; `publish_artifacts` had zero matches. | No |
| 2026-05-05 | Command | `git grep -n 'publish_artifact' -- . ':!tickets/**' ':!tmp/**' ':!node_modules/**'` | Inventory all tracked singular references, including committed dist/importable packages | 37 tracked files outside tickets/tmp/node_modules contain singular references. | No |
| 2026-05-05 | Command | Python categorization of `git grep` results | Categorize impacted files | 9 application source prompt/config/guidance files, 13 application generated/package dist files, 6 server runtime/source files, 8 server test files, and 1 `autobyteus-ts` renderer test file reference the singular name. | No |
| 2026-05-05 | Code | `autobyteus-server-ts/src/services/published-artifacts/published-artifact-tool-contract.ts` | Inspect current tool contract owner | Current input type is singular `{ path, description? }`; validator rejects unknown old rich fields; tool name constant is `publish_artifact`. | Yes: replace with plural-only names/types/normalizer. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-tools/published-artifacts/publish-artifact-tool.ts` and `register-published-artifact-tools.ts` | Inspect native AutoByteus tool implementation | Native tool registers one local tool named `publish_artifact`, builds a two-parameter schema, resolves runtime context/fallbacks, calls `publishForRun`, and returns `{ success, artifact }`. | Yes: replace with canonical plural native tool and register only that tool. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts` | Inspect durable publication owner | `publishForRun` owns active/fallback run resolution, workspace path checks, snapshot creation, projection writes, `ARTIFACT_PERSISTED` event emission, and application relay. Error messages currently mention `publish_artifact` even though this service is domain-level. | Yes: add `publishManyForRun` and make service errors tool-neutral where touched. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/services/published-artifacts/published-artifact-path-identity.ts` and `published-artifact-types.ts` | Inspect path identity and durable summary shape | Existing path logic supports absolute or workspace-relative paths and canonicalizes to workspace-relative artifact paths. Durable summary/revision shapes do not store the tool name. | No schema migration needed. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | Inspect shared exposure gating | Exposure currently has boolean `publishArtifactConfigured` true only when configured tool set contains `publish_artifact`. | Yes: replace with plural-only artifact exposure detection. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` and `codex/published-artifacts/build-codex-publish-artifact-dynamic-tool-registration.ts` | Inspect Codex exposure path | Bootstrapper adds a dynamic `publish_artifact` registration only when `publishArtifactConfigured`; registration validates singular input and calls `publishForRun`. | Yes: expose only plural dynamic tool when plural is configured. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts`, `build-claude-session-mcp-servers.ts`, `build-claude-publish-artifact-tool-definition.ts`, `build-claude-publish-artifact-mcp-server.ts` | Inspect Claude exposure path | Claude currently allowlists `publish_artifact` and `mcp__autobyteus_published_artifacts__publish_artifact`, builds one MCP tool with singular schema, and calls `publishForRun`. | Yes: expose/allowlist only plural MCP tool names. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` and `autobyteus-mixed-tool-exposure.ts` | Inspect native tool selection | Native runtime creates tool instances directly from `agentDef.toolNames` after mixed-team filtering. | Yes: with singular unregistered, old singular names are skipped as unavailable; tests should assert no artifact tool is created for singular-only configs. |
| 2026-05-05 | Code | `autobyteus-ts/src/utils/parameter-schema.ts`, `autobyteus-ts/src/task-management/tools/task-tools/update-task-status.ts` | Check native tool schema support for arrays of objects | `ParameterType.ARRAY` and nested `ParameterSchema`/JSON schema item definitions are supported; existing task tool uses array item schema. | No blocker. |
| 2026-05-05 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-customization-options.ts`, `tool-management.ts`, `list-available-tools.ts`, web tool stores/form | Inspect tool-discovery/selection surfaces | Available tool names, grouped local tools, and list-available-tools read from the registry. If only plural is registered, singular disappears from these surfaces. | Yes: tests should assert singular absence. |
| 2026-05-05 | Code | `applications/brief-studio/agent-teams/...`, `applications/brief-studio/backend-src/services/brief-run-launch-service.ts`, `applications/socratic-math-teacher/agent-teams/...`, `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts` | Inspect built-in app prompts/configs/guidance | Built-in configs name `publish_artifact`; prompts/guidance teach singular calls. Brief Studio emphasizes exact absolute write_file path; Socratic uses workspace-relative paths. | Yes: update to one-item plural array examples. |
| 2026-05-05 | Code | `applications/brief-studio/package.json`, `applications/socratic-math-teacher/package.json`, `applications/*/scripts/build-package.mjs` | Inspect generated package refresh path | App build scripts generate committed `dist/importable-package` and backend `dist` copies from source. | Yes: run both app builds after source edits. |
| 2026-05-05 | Code | `autobyteus-server-ts/tests/unit/agent-tools/published-artifacts/publish-artifact-tool.test.ts`, `configured-agent-tool-exposure.test.ts`, Codex/Claude tool gating tests, app package config integration test, live integration tests | Inspect affected tests | Tests currently assert singular names, singular input shape, and singular prompt contents. | Yes: update to plural and add singular-absence tests. |
| 2026-05-05 | Code | `autobyteus-ts/tests/unit/llm/prompt-renderers/lmstudio-chat-renderer.test.ts` | Check non-server singular reference | Test uses `publish_artifact` as an arbitrary tool-call formatting example, not as platform contract behavior. | Update to neutral or plural to remove accidental old API teaching. |
| 2026-05-05 | Command | `git grep -n 'publish_artifact\|publish_artifacts\|PublishArtifactToolInput\|PUBLISH_ARTIFACT' -- autobyteus-application-backend-sdk autobyteus-application-sdk-contracts autobyteus-server-ts/docs autobyteus-web/docs README.md docs applications/*/README.md` | Check long-lived docs/SDK readmes for singular tool references | No matches in long-lived docs/SDK READMEs. App prompts/guidance are the doc-like surfaces that require update. | No long-lived docs update required unless implementation changes documentation-worthy behavior. |
| 2026-05-05 | Design Review | `tickets/in-progress/publish-artifacts-plural-refactor/design-review-report.md` round 2 | Incorporate architecture review failure and user clarification | Round 2 failed because previous requirements/design retained singular compatibility. Required rework is clean-cut plural-only replacement. | Completed in revised requirements/design. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: agent definitions/configs list `toolNames` containing `publish_artifact`; runtime-specific bootstrapping exposes a tool with that exact name.
- Current execution flow:
  - Native AutoByteus: `agentDef.toolNames` -> `defaultToolRegistry.createTool("publish_artifact")` -> `PublishArtifactTool._execute(...)` -> `normalizePublishArtifactToolInput(...)` -> `PublishedArtifactPublicationService.publishForRun(...)` -> snapshot/projection/event/app relay -> tool returns `{ success, artifact }`.
  - Codex: `resolveConfiguredAgentToolExposure(...)` -> `publishArtifactConfigured` -> `buildCodexPublishArtifactDynamicToolRegistration()` -> dynamic tool `publish_artifact` -> same normalizer -> `publishForRun(...)` -> `{ success, artifact }` text result.
  - Claude: `resolveConfiguredAgentToolExposure(...)` -> `publishArtifactToolingEnabled` -> `buildClaudePublishArtifactMcpServer(...)` -> MCP tool `publish_artifact` -> same normalizer -> `publishForRun(...)` -> `{ success, artifact }` text result.
- Ownership or boundary observations:
  - `PublishedArtifactPublicationService` is the correct durable artifact owner and should stay authoritative.
  - Runtime adapters should own only schema exposure/adapter translation, not snapshot/projection/event policy.
  - `configured-agent-tool-exposure.ts` is the correct shared owner for optional runtime exposure decisions across Codex/Claude, and must be switched to plural-only detection.
  - Tool-discovery GraphQL/list surfaces should require no special singular handling once only the plural tool is registered.
- Current behavior summary: one singular tool publishes one file per call. There is no plural/batch API, and built-in agents are taught the singular name.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / agent-facing API cleanup with a strict plural batch feature.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure, with secondary duplicated-schema risk if plural is added separately per runtime.
- Refactor posture evidence summary: Current code has a singular-only contract spread across runtime exposure and built-in prompts/configs. The user clarified that singular support must be removed, so the correct refactor centralizes plural normalization and batch dispatch around the existing publication owner while removing singular runtime registration/exposure.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User clarification | No backward compatibility should be kept. | Singular tool must not be registered/exposed/discoverable/selectable. | Implement clean-cut removal. |
| `published-artifact-tool-contract.ts` | Current singular validator owns the old top-level shape. | Replace with strict plural-only contract. | Yes |
| `PublishedArtifactPublicationService.publishForRun` | Existing durable artifact behavior is centralized. | Plural batch should reuse this service for every item. | Yes |
| Codex/Claude/native exposure paths | Each runtime has name/schema exposure logic. | All three must switch to plural-only exposure. | Yes |
| App prompts/configs and generated packages | Built-ins and dist copies all name singular. | Source and generated package refresh are in scope. | Yes |
| Tool management/discovery code | Registry listing will follow registered tool definitions. | If singular registration is removed, discovery should show only plural; tests should verify. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-tool-contract.ts` | Agent-facing published-artifact tool name/input normalization | Singular-only contract and description. | Becomes plural-only contract owner. |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts` | Durable published-artifact publication | Single-artifact `publishForRun` only; service errors mention singular tool name. | Add batch method and make errors tool-neutral where touched. |
| `autobyteus-server-ts/src/agent-tools/published-artifacts/*` | Native AutoByteus local tool registration | One singular tool class. | Replace with canonical plural native tool; register only plural. |
| `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | Shared runtime exposure derivation | Boolean for singular only. | Replace with plural-only artifact exposure boolean/name. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/*published-artifacts*` | Codex dynamic tool registration | Singular schema and handler. | Build only plural dynamic tool from shared contract. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/*published-artifacts*` | Claude MCP tool definition/server | Singular MCP tool and allowed names. | Build/allowlist only plural MCP tool. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Native runtime tool creation | Creates tools by registered names. | With singular unregistered, old configs should get no artifact tool. |
| `autobyteus-server-ts/src/api/graphql/types/agent-customization-options.ts` | Available local tool name query | Lists all registry names. | Should include plural and omit singular after registration replacement. |
| `autobyteus-server-ts/src/api/graphql/types/tool-management.ts` and `list-available-tools.ts` | Tool listing/discovery | Lists registry definitions. | Should include plural and omit singular after registration replacement. |
| `applications/brief-studio/...` | Built-in team prompts/configs/guidance | Teaches singular. | Update to plural one-item array. |
| `applications/socratic-math-teacher/...` | Built-in tutor prompts/configs/guidance | Teaches singular. | Update to plural one-item array. |
| `applications/*/dist/...` | Committed generated/importable packages | Contains copied singular strings. | Refresh via app builds after source edits. |
| `autobyteus-server-ts/tests/...` | Unit/integration coverage | Asserts singular behavior. | Update to plural and add singular-absence tests. |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/lmstudio-chat-renderer.test.ts` | Generic renderer test | Uses singular name as arbitrary example. | Change to neutral/plural to remove accidental old API teaching. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-05 | Script | Python categorization of `git grep -n publish_artifact` results | Singular references are concentrated in known runtime/tool/app/test areas; no `publish_artifacts` exists. | Refactor can be bounded to named surfaces. |
| 2026-05-05 | Static code probe | Read `ParameterSchema` array/object support and `UpdateTaskStatus` deliverables schema | Native tool schema system supports array parameters with nested object schemas. | Plural native tool can use `ParameterType.ARRAY` with item schema rather than a string workaround. |

No executable tests were run during solution-design investigation; validation belongs to implementation/API-E2E phases after code changes.

## External / Public Source Findings

No external/public web sources used. This is an internal repository refactor.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static design. Implementation validation will need unit tests; live LM Studio/Codex integration tests may remain environment-dependent.
- Required config, feature flags, env vars, or accounts: None for static design. Existing Codex/Claude/LM Studio integration tests may require their existing runtime setup.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation listed in source log.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The durable published-artifact subsystem is already the right owner for file publication. The plural refactor should not move artifact persistence into runtime adapters.
2. The current singular name is not only in prompts/configs; it is encoded in runtime allowlists, Codex dynamic-tool registration, Claude MCP tool names, native registry names, service error messages, and tests.
3. User clarification requires clean-cut singular removal rather than hidden/deprecated support.
4. Application generated packages are committed and test-covered; source-only edits are insufficient.
5. No long-lived SDK/readme docs currently teach `publish_artifact`, so docs impact is mostly app prompt/guidance and possibly a short release note/handoff item.

## Constraints / Dependencies / Compatibility Facts

- User wants final desired state to be only `publish_artifacts` and clarified no backward compatibility.
- Existing app consumers read published-artifact summaries/revisions/events, not tool-call names, so no published-artifact data migration is required.
- Existing historical run-history tool-call records may still contain `publish_artifact`; this is out of scope.
- Old/custom agent definitions must be updated by their owners; this change will not provide a singular artifact-publication tool.

## Open Unknowns / Risks

- Clean-cut removal may break old/custom configs until they are manually migrated.
- Batch partial-success semantics should be documented/test-named clearly so no one assumes atomic all-or-nothing publication.

## Notes For Architect Reviewer

- Round 2 rework removes the previously planned singular support entirely.
- The central design question is no longer migration compatibility. The target architecture is a clean-cut plural-only tool API with shared validation, thin runtime adapters, and unchanged durable publication ownership.
