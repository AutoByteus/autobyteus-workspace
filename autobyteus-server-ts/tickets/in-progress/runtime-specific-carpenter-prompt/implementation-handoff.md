# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/design-spec.md`
- Supplemental task artifacts: None.
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/architecture-review-revision-record.md`
- Triggering authorization: `ARCH-REV-002` Pass; no unresolved findings.

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

The server Carpenter prompt boundary now has two explicit entrypoints. `composeSharedCarpenterPrompt` renders Agent Identity, optional Team Instruction, and optional Team Collaboration without requiring a workspace or adding native operating guidance. `composeNativeAutoByteusPrompt` builds on the same shared sections and appends Working Environment, Bash Operating Practice, and File And Directory Practice in the established order. Native AutoByteus uses the native entrypoint; Claude and Codex use the shared entrypoint through their existing `systemPrompt` and `baseInstructions` fields. The generated `Team Runtime` heading and renderer were cleanly renamed to `Team Collaboration` with no compatibility alias.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BE-001 | Shared/native composition has an explicit ownership boundary and preserves section ordering. | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts`; `buildSharedCarpenterPromptSections`, `composeSharedCarpenterPrompt`, and `composeNativeAutoByteusPrompt`. | Implemented. Shared output is identity/team-only; native output appends workspace/Bash/file sections in order. |
| BE-002 | Existing provider injection fields and bootstrap behavior remain authoritative. | Native `AutoByteusAgentRunBackendFactory` -> `AgentConfig.systemPrompt`; Claude `ClaudeSessionBootstrapper` -> existing SDK system prompt context; Codex `CodexThreadBootstrapper` -> existing `baseInstructions`. | Implemented. Call sites changed only at composition selection; provider/tool/bootstrap settings remain unchanged. |
| BE-003 | Runtime prompt wording is capability-consistent and does not imply native tools to external providers. | Shared composer excludes `Working Environment`, `Bash Operating Practice`, and `File And Directory Practice`; external adapters call only `composeSharedCarpenterPrompt`. | Implemented. Shared prompt tests and Claude/Codex bootstrap assertions cover native-only section absence. |
| BE-004 | Prompt ownership and Team Collaboration terminology are explicit and scoped. | `team-runtime-instruction-renderer.ts` renamed to `team-collaboration-instruction-renderer.ts`; `renderTeamCollaborationInstruction`; scoped server docs updated. | Implemented. Unrelated `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` remains unchanged. |
| BE-005 | Native Carpenter behavior and native terminal Skills append remain intact while external leakage is removed. | Native factory calls `composeNativeAutoByteusPrompt`; `autobyteus-ts` core remains unchanged and still owns terminal Skills append. | Implemented. Native factory prompt coverage retains native sections; no tool exposure or native core changes were introduced. |
| BE-006 | MemberTeamContext survives runtime-specific composition for standalone/team create/restore coverage. | Existing `AgentRunConfig.memberTeamContext` ingress is preserved; native/Claude/Codex bootstrap tests cover team context; prompt tests cover shared/native team output. | Implemented locally. Broader create/restore API/E2E execution remains downstream. |

## Key Files Or Areas

### Production

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-team-execution/services/team-collaboration-instruction-renderer.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`

### Tests

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tests/unit/agent-execution/prompt/carpenter-prompt-composer.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts`

### Durable Documentation

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/prompt_engineering.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_execution.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/codex_integration.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_team_execution.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_definition.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_tools.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-ts/docs/tool_schema_and_configuration.md` — verification-only, unchanged.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` — explicit historical no-change, unchanged.

## Important Assumptions

- `AgentRunManager`, `AgentRunConfig.memberTeamContext`, and each runtime adapter remain the authoritative lifecycle and context boundaries.
- Native `autobyteus-ts` prompt consumption and terminal configured-skills append remain unchanged.
- Prompt text does not decide effective tool exposure, MCP projection, approval, sandbox, path authorization, or provider-native skills.
- Historical prompt snapshots are not rewritten; only new/continued bootstrap composition changes.

## Known Risks

- Downstream API/E2E coverage must independently verify standalone and mixed team/task-agent create/restore prompt injection for native, Claude, and Codex.
- Live provider execution and external provider prompt isolation remain untested in this implementation stage.
- Any untracked consumer outside the scoped source/tests/docs would be caught by code review/search; current scoped source and test search has no old composer or Team Runtime references.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Refactor` with behavior-preservation constraints.
- Reviewed root-cause classification: `Boundary Or Ownership Issue`.
- Reviewed refactor decision: `Refactor Needed Now`.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as Design Impact: `N/A`.
- Evidence / notes: The old all-runtime composer was replaced by two explicit entrypoints; external adapters no longer import native section policy; native workspace validation remains at the native boundary; the team renderer and generated heading use the approved collaboration vocabulary.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No` — the old all-runtime composer contract and Team Runtime generated heading are removed.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` — old renderer path/name and old composer call contract are gone from scoped source/tests/docs.
- Shared structures remain tight: `Yes` — shared input has only agent definition/context; native input adds only workspace.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`.
- Notes: No runtime-kind switch, compatibility alias, duplicated provider prompt builder, or prompt-driven tool exposure mechanism was added.

## Persisted Data Transition Check

- Approved decision: `Not Affected`.
- Design-spec decision reference: `design-spec.md` Persisted Data / State Transition Decision; REQ-006 and AC-006.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`.
- Direct-use evidence: Agent/team definitions, runtime configuration, tool names, provider settings, and existing history remain untouched; prompt selection changes only transient bootstrap strings.
- Migration implementation and focused checks: `N/A`.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- Fresh worktree dependencies were installed with `pnpm install --frozen-lockfile --ignore-scripts`.
- Prisma client was generated with `pnpm --filter autobyteus-server-ts exec prisma generate`.
- The dependent `autobyteus-ts` package was built before the server build-scoped check.
- No package manifest, lockfile, schema, runtime-tool, provider-setting, or persisted-data change was introduced.

## Local Implementation Checks Run

- Passed: `pnpm --filter autobyteus-server-ts exec vitest run tests/unit/agent-execution/prompt/carpenter-prompt-composer.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` — 5 files, 56 tests.
- Passed: `pnpm --filter autobyteus-ts build`.
- Passed: `pnpm --filter autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
- Passed: `git diff --check`.
- The first focused Vitest attempt before Prisma generation failed at environment setup with a Prisma named-export loading error; after Prisma generation, the same focused suite passed. This is recorded as setup recovery, not an implementation failure.
- No API/E2E or broader executable coverage was run in this implementation stage.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable — this is a backend prompt composition, runtime adapter, test, and documentation change with no rendered frontend surface.

## Downstream Coverage Hints / Suggested Scenarios

- Native standalone create and restore: assert `composeNativeAutoByteusPrompt` output reaches `AgentConfig.systemPrompt` with shared sections followed by native workspace/Bash/file sections and terminal Skills append.
- Native mixed team/task-agent create and restore: assert `MemberTeamContext` reaches native prompt output with Team Instruction and Team Collaboration, while existing native tool projection is unchanged.
- Claude standalone/team create and restore: assert SDK `systemPrompt` contains shared identity/team output and no native Working Environment/Bash/File sections.
- Codex standalone/team create and restore: assert `baseInstructions` contains shared identity/team output and no native Working Environment/Bash/File sections.
- Verify Team Collaboration roster, delivery binding, and delegation wording remains semantically unchanged.
- Verify runtime tool exposure, MCP descriptors, approval, sandbox, and path behavior are unchanged.
- Verify the scoped server documentation uses Team Collaboration while the two autobyteus-ts documents remain unchanged.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes. `api_e2e_engineer` must independently investigate existing coverage, decide whether durable tests require updates, and execute the supported standalone and mixed team/task-agent create/restore scenarios after code review.

