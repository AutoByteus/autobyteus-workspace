# Investigation Notes — read-file-media-merge (autobyteus-328)

## Investigation Meta

- Package: `read-file-media-merge`; Task `autobyteus-328` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager`; the user's decision of autobyteus-327 (option (a), 2026-10-29).
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/read-file-media-merge`, branch `codex/read-file-media-merge`, base `origin/personal` `e82d03b0f9`; finalization target `origin/personal`. Install exit 0.
- Earlier evidence: `autobyteus-327/investigation-notes-327.md` (what each tool does, F-1..F-3, the probe `SD-01`), `autobyteus-327/requirements-doc-327.md` (options, decision, follow-up plan). Not repeated here.
- Authorities read (2026-10-29): `references/requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md`, `handoff.md`; `DESIGN.md` (rules 7, 9, 10), `autobyteus-server-ts/docs/design/data_migration_guideline.md` (whole), `TESTING.md`, `GLOSSARY.md`.

## New findings for the change

| Source | Finding | Use |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts` L133-137 | a tool name in an agent definition that the registry does not know is skipped with a warning ("not found in registry. Skipping."); the run starts | a definition still naming `read_media_file` keeps working after removal |
| `autobyteus-runtime-tool-exposure.ts` L8-13, L20-32 | `run_bash`, `read_file`, `edit_file`, `write_file` are added to every native agent's tools, whatever its definition lists | such an agent still has `read_file`, so it loses no capability |
| `autobyteus-server-ts/docs/modules/agent_packages.md` L31-33 | package roots: `BUILT_IN` (the app-data default package, where agents created in the app live), `LOCAL_PATH` (a user folder; "AutoByteus validates and reads the folder but does not pull Git or mutate the source folder"), `GITHUB_REPOSITORY` (a managed copy that an update replaces) | a migration may only own the app-data default package; local folders are the user's and GitHub copies are replaced by the source |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` L65-133 | built-in agents (Daily Assistant) are copied from their templates into the app's agents folder at every start | changing the template is enough for the Daily Assistant |
| `tickets/done/node-vocabulary/design-spec.md` L106-109 (autobyteus-290) | renaming `list_available_nodes` → `list_peer_nodes`: the user ruled out updating stored agent configs ("The agent config file belongs to another ticket … the agent package creator could create another task to update its own package"); a release note told users | precedent for stored tool names |
| autobyteus-294 (removed agent-management tools) | no stored-config migration for removed tools | precedent |
| `autobyteus-ts/src/agent/context/agent-context.ts` L51-56; `tools/functional-tool.ts` L78-82 | `read_file` (a functional tool) receives the same agent context, with `llmInstance`, that `read_media_file` reads its model capabilities from | the merged tool can check capabilities the same way |
| `autobyteus-ts/src/memory/memory-manager.ts` L356-385; `llm/prompt-renderers/openai-chat-renderer.ts` L191-197 | the tool result in the working context is the tool's result value; an object (a context file) is sent as JSON text; the file itself rides on the tool-continuation message (327 notes) | mechanism unchanged |
| `autobyteus-web/utils/toolDisplaySummary.ts` L14-25 | the web summarises file tools by their `path` argument; no web code names `read_media_file` | web unchanged |
| `git grep` (2026-10-29) | files naming `read_media_file`: `autobyteus-ts` tool, index files, registration, docs (`agent_runtime_loop_and_interrupt.md`, `llm_module_design.md`, `llm_module_design_nodejs.md`), tests (`tests/unit/tools/multimedia/media-reader-tool.test.ts`, `tests/integration/tools/multimedia/media-reader-tool.test.ts`, `tests/integration/agent/read-media-file-continuation-flow.test.ts`, `tests/integration/agent/gemini-read-media-file-m4a-live.test.ts`, and naming in `tool-continuation-input-builder.test.ts`, `tool-continuation-display-text.test.ts`, `gemini-prompt-renderer.test.ts`, `openai-chat-renderer.test.ts`, `tools/index.test.ts`); server: Work Journal `autobyteus-translation.ts`, its test and fixture `tests/fixtures/agent-work-journal/work-journal-builtin-tools.json`, the Daily Assistant template, `built-in-agent-bootstrapper.test.ts` | the change list |
| `autobyteus-agents` `origin/main` `d50df67` | 16 files (12 agent configs, 4 skills), list in the 327 notes | packages |

## Package timing

A public package that drops `read_media_file` for `read_file` loses media reading on every app build without this change (their `read_file` reads text only), and GitHub-installed packages are offered as updates to every node, stable ones included. So the package update must reach users only once a release with the merged `read_file` is what they run.

## Persisted data

- Subject: `toolNames` in `agent-config.json` of agent definitions.
- Readers: the native tool resolver (skips unknown names); the web agent editor shows the definition's tool list.
- Without a migration: an app-data definition that lists `read_media_file` keeps an entry the registry no longer knows; it is skipped at every run start with a warning log line, and the agent still reads media through `read_file`.
- With a migration: only app-data default-package definitions (and their team-local and org-owned agents) can be rewritten; local folders and GitHub copies keep the old name anyway.
- Real user data not read in this investigation.
