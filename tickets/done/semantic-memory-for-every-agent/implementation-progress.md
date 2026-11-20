# Implementation Progress (paused)

> **Superseded (2026-11-20):** the pause ended with SR-008 / ARCH-REV-004; IR-001 (`56b02294d0`) implements the package, see `implementation-handoff.md` and `implementation-revision-record.md`. `wip-uncommitted.patch` was removed (its kept parts are in IR-001). This file stays as the record of the pause.

- Ticket: autobyteus-554 (`semantic-memory-for-every-agent`), design SR-002, ARCH-REV-002 `Pass`, Large / High
- Paused: 2026-11-19, on the Solution Designer's message (the founder's request): all work stops until a solution revision brings the approved Memory page UI. The UI part (web tab, view component, runs-page link, their localization) was already on hold before that.
- Commit stopped at: **`8430d9ef12`** (the branch base). Nothing of this ticket is committed: the work below is uncommitted in the worktree, and the whole diff (new files included) is saved as `wip-uncommitted.patch` in this folder (`git apply` restores it on the base).
- This is not an implementation handoff: no checks were recorded as evidence, and nothing was handed downstream.

## Done (uncommitted)

| Design step | State | Files |
| --- | --- | --- |
| 1. Unconditional gate | Done | `agent-memory/services/agent-semantic-memory.ts`: `folderOf(agentDefinitionId): string`, `prepareForRun(agentDefinitionId): Promise<string>` (the layout refuses a blank ID or one that leaves `semantic/`). The five runtime owners pass the run config's `agentDefinitionId` (the ID the definition was loaded by); Claude's additional directory and Codex's writable root are always the folder; `carpenter-prompt-composer.ts` always adds the section (`semanticMemoryPath: string`); the converter gives `folderOf(id)` for every agent. |
| 2. Field removal (server) | Done in `src/` | model, config (the key stays only in `mergeAgentConfigRecord`'s drop list, comment reworded per N-2), node reader, application-owned source, edits, definition service, GraphQL type and inputs (`semanticMemoryPath: String!`), `PersonalSetting.SEMANTIC_MEMORY`, personal-setting record and service, `package-edit-capture.ts`. `git grep semanticMemoryEnabled -- autobyteus-server-ts/src` finds only the drop list. |
| 3. Browser and GraphQL | Code done, untested | new `agent-memory/services/agent-semantic-memory-browser.ts` (`listFolders` hides hidden internal agents through `Pick<InternalAgentVisibility, "hiddenDefinitionIds">`; `listFiles` is not filtered; `lstat`-only walk, bounds 5,000 entries / depth 12, `truncated`; kinds `file` / `link`, other non-regular entries skipped per N-4); new `api/graphql/types/semantic-memory-view.ts` (`semanticMemoryFolders`, `semanticMemoryFiles(agentDefinitionId)`), registered in `schema.ts`. One small addition beyond the design's file list: `AgentMemoryLayout.getSemanticRootDirPath()` (beside `getEpisodicRootDirPath()`), the accessor the design's "layout semanticRoot" needs. |
| Tests rewritten | Partly | passing: `agent-semantic-memory.test.ts`, `agent-definition-config-semantic-memory.test.ts` (AC-003 config part), `agent-definition-converter-semantic-memory.test.ts`, `semantic-memory-prompt-section.test.ts`, `carpenter-prompt-composer.test.ts`, `collaboration-prompt-sections.test.ts` (20 snapshots updated: the only difference is the added Semantic Memory section, checked), `member-collaboration-instruction-provider-parity.test.ts`. |

Server `src` typechecks (`tsc -p tsconfig.build.json`: 0 errors). The server test typecheck and unit suite are **not** green yet (the tests below are still on the old API).

## Not done

- Server tests still on the old field or gate signature: `acp-agent-run-backend-factory.test.ts`, `agy-agent-run-backend-factory.test.ts`, `autobyteus-agent-run-backend-factory.test.ts`, `claude-session-tool-gating.test.ts`, `codex-thread-bootstrapper.test.ts` (AC-001 per runtime: section, folder, Claude/Codex access, for a definition with no field and one with `false`); `personal-setting-record.test.ts`, `personal-settings-service.test.ts`, `personal-settings-write-forms.test.ts` (AC-003 personal-settings part); `package-edit-capture.test.ts`; e2e `agent-semantic-memory.e2e.test.ts`, `agent-semantic-memory-live.e2e.test.ts`, `claude-agent-websocket-interrupt-resume.e2e.test.ts`, `deepseek-harness-live.e2e.test.ts`, `helpers/claude-live-agent-harness.ts`. (The `prepareForRun` hits in the provider-relay, DeepSeek-runtime, supervisor and kernel-builder tests are the credential proxy's own method, unrelated.)
- New tests for the browser and its GraphQL (AC-006 confinement and links, AC-008 internal agents, bounds, N-4).
- Web step 4 (switch removal, detail always showing the path, store, GraphQL documents, `PersonalSetting` type, localization) and GraphQL codegen.
- Web step 5 (Memory tab, `SemanticMemoryDetail`, runs-page link, imported-source note): on hold for the approved UI.
- Docs and glossary (step 6); AC-002 grep; the isolated-instance check and UI probe (step 7).

## To resume

Apply `wip-uncommitted.patch` on `8430d9ef12` if the worktree was reset (otherwise the changes are still in place), then continue from "Not done" with the solution revision's UI.
