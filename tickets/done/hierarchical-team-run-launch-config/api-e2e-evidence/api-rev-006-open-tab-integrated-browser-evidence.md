# API-REV-006 Integrated `open_tab` / Packaged Electron / Provider Evidence

## Environment

- Actual AutoByteus browser tool: **Yes** — `mcp__autobyteus_agent_tools__open_tab` opened tab `2d23c2` at `http://127.0.0.1:58724/`.
- UI/server boundary: current Nuxt dev client on `58724`, proxying the owned current macOS arm64 packaged Electron backend on `58649`.
- Owned profile: `/private/tmp/autobyteus-api-rev-006-owned`; the production app-data root was not used.
- Imported package root: `/Users/normy/autobyteus_org/autobyteus-private-agents`; the exact `nested-classroom-test` definition and its nested `/StudentStudyGroup` Team loaded in the fresh profile.
- Provider setup: secrets were imported from `/Users/normy/.autobyteus/server-data/.env` into only the owned profile through the project `pnpm import` mechanism. No secret value is recorded in evidence.
- Codex command: absolute `CODEX_APP_SERVER_COMMAND=/Users/normy/.local/bin/codex` was supplied before the packaged backend launched.

## API-E2E-014 One-Click Result

1. Configured root Team `/` as `codex_app_server` / `gpt-5.6-luna` with owned New path `/private/tmp/autobyteus-api-rev-006-owned/workspaces/root-luna`.
2. Configured exact nested Team `/StudentStudyGroup` as `autobyteus` / `deepseek-v4-flash` with distinct owned New path `/private/tmp/autobyteus-api-rev-006-owned/workspaces/nested-deepseek`.
3. Before path entry, root empty plus nested whitespace-only active New state disabled `Run Team` with the exact visible message `Enter a workspace path to run this team.`
4. Both paths survived a later root auto-approve edit. `Run Team` became enabled.
5. Activated `Run Team` **exactly once**. The configuration action disappeared during the accepted activation, so the same UI could not issue a second click.
6. Server evidence changed from zero filesystem workspaces / zero TeamRuns to exactly two registered filesystem workspaces / one TeamRun. No second activation was needed.
7. Persisted schema-V2 tree has the exact root Team, Teacher Agent, nested Team, and both nested Agents with the requested runtime/model/workspace/auto-approve values.

Authoritative structured result: `api-rev-006-browser-one-click-result.json`. Persistence: `api-rev-006-team-execution-tree-v2.json`; before/after records: `api-rev-006-{team-history,workspaces}-{before,after}-first-click.json`.

## Real Nested-Team Communication And Task Lifecycle

- A real user message asked Teacher to use ordinary `send_message_to` to `/StudentStudyGroup`; the nested coordinator replied `API_REV_006_SUBTEAM_MESSAGE_OK`.
- Teacher then used real `delegate_task` to `/StudentStudyGroup`.
- The nested Team submitted exactly `API_REV_006_SUBTEAM_TASK_OK` through the formal task result path.
- Teacher used `review_task_result`; persisted final status is `accepted`, with distinct submission and acceptance-review records.
- Teacher reported `API_REV_006_TEACHER_DONE`, exact nested address `/StudentStudyGroup`, and final status `accepted` in the rendered conversation.

Authoritative disk evidence: `api-rev-006-team-communication-messages-final.json` and `api-rev-006-task-delegation-records-final.json`. Screenshot: `api-rev-006-open-tab-team-message-task-success.png`, SHA-256 `f5f5e8bbfeee4247167011812d12a89fa6cfa57f659bd9386ecd776494f2c65d`.

## Stale Current-Team New/Empty Repair Probe

- In a second draft, `/StudentStudyGroup` was current, active New, and whitespace-only. The actual rendered button was disabled with the exact approved blocker.
- The already-supported live-definition-refresh condition was injected in the browser's current Pinia definition store by replacing the root definition with a version that no longer referenced `/StudentStudyGroup`; the private package on disk and backend definition were not edited. This proves browser/store semantics, **not** a production topology-edit API.
- The stale workspace authoring state remained until activation, current topology no longer contained that Team, and `Run Team` became enabled.
- One activation atomically pruned `/StudentStudyGroup`, left the form visible, and rendered: `Team topology changed. Stale settings were removed. Review these addresses and retry: /StudentStudyGroup`.
- Browser instrumentation recorded zero `workspace.createWorkspace` calls and zero Apollo mutation calls. Server TeamRun history and GraphQL workspace inventory were byte-identical before/after.
- The browser definition was restored after the probe.

Authoritative structured result: `api-rev-006-stale-repair-probe-result.json`; server proof: `api-rev-006-stale-repair-{team-history,workspaces}-{before,after}.json`. Screenshot: `api-rev-006-open-tab-stale-empty-repair.png`, SHA-256 `d60ca3ab561c88a25b45e6ac706c5b7895c6b8992e2707854bca310c5c20f370`.

## Current Classification

- API-E2E-014 / historical API-E2E-F-002: **Pass / resolved by current implementation execution** — two canonical registrations and exactly one TeamRun occurred from one accepted activation.
- Current-Team New/empty: **Pass**.
- Stale removed-Team repair before dispatch: **Pass** with zero registration/create.
- Real provider nested communication and formal task lifecycle: **Pass**.
- Cleanup: **Pass** — TeamRun terminated, tab `2d23c2` closed, `list_tabs` returned zero sessions, owned Nuxt/Electron processes stopped, ports `58649`/`58724` were free, and `/private/tmp/autobyteus-api-rev-006-owned` was removed. The private package and source `.env` were not changed.
