# API-E2E-013 — Packaged Electron / Open-Tab Explicit DeepSeek Subteam Evidence

## Scope

- Date: 2026-08-24 (Europe/Berlin)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config`
- Private package: `/Users/normy/autobyteus_org/autobyteus-private-agents`
- Team: `nested-classroom-test` (`Nested Classroom Test Team`)
- Root runtime/model: `codex_app_server` / `gpt-5.6-luna`
- Explicit nested-Team runtime/model: `autobyteus` / `deepseek-v4-flash`
- AutoByteus browser tab: `edcf5a`
- User-owned application excluded from the test: PID `33760`, port `29695`

## Isolated packaged environment and credential preparation

1. The current-worktree macOS arm64 package built during API-REV-001 was still newer than the changed implementation sources. Its `app.asar` SHA-256 was recorded in `electron-deepseek-preflight.txt`.
2. The official packaged launcher reused that exact executable with `--skip-build --adapter playwright --hold-ms 1800000`. It produced:
   - backend port `54334`
   - owned data root `/private/.../autobyteus-e2e-Ymjjtk`
   - healthy packaged backend and first Electron window
   Evidence: `electron-deepseek-live-session.txt`.
3. The user's source file `/Users/normy/.autobyteus/server-data/.env` was read only by the documented root `pnpm secrets:import` path. A dry run reported a ready target and nine create actions, including `provider.autobyteus.api-key` and `provider.deepseek.api-key`.
4. The import was confirmed interactively with `IMPORT` against only the isolated `production.db`: 9 configured, 0 skipped, 0 replaced. No secret value was printed or retained in repository evidence. Evidence: `electron-deepseek-secret-import-dry-run.txt`, `electron-deepseek-secret-import-confirmed.txt`.
5. The owned Nuxt renderer on port `54427` proxied HTTP and all relevant WebSockets to the packaged backend on `54334`. `NUXT_TEST=true` was again used only for the previously documented Nuxt dev app-manifest workaround; the UI, packaged backend, WebSockets, Codex, AutoByteus runtime, DeepSeek provider, database, and filesystem were real.
6. Catalog query proved that the AutoByteus runtime exposed the exact DeepSeek provider model `deepseek-v4-flash`. Evidence: `electron-deepseek-autobyteus-catalog.json`.

## Browser configuration form

Using AutoByteus `open_tab`, the browser opened the real `/agent-teams` surface, selected **Nested Classroom Test Team**, and entered `/workspace`.

The final editable launch draft, observed from the live application store before launch, was:

- root `/`: `codex_app_server` / `gpt-5.6-luna`, auto-approve on
- Team override `/StudentStudyGroup`: `autobyteus` / `deepseek-v4-flash`
- Agent overrides: empty
- readiness: launchable with no blocking issue

The rendered form showed:

- root effective value `codex_app_server · gpt-5.6-luna`
- nested Team state **Customized**
- nested effective value `autobyteus · deepseek-v4-flash`
- customized fields **Runtime, Model**
- `/Teacher`, `/StudentStudyGroup/student_one`, and `/StudentStudyGroup/student_two` all remained **Global default** at the Agent-override controls
- root auto-approve was inherited at the nested scope

Evidence: `electron-browser-deepseek-subteam-config.png`.

## Launch request, V2 API, and on-disk hierarchy

The browser enabled and activated **Run Team**. Run ID:

`nested_classroom_test_team_ed6f465924784489a6e7d69f511578b2`

Both live GraphQL history and the actual `team_run_execution_tree.json` proved:

- exact `schemaVersion: 2`
- root Team default: Codex / Luna
- `/Teacher`: Codex / Luna
- nested Team `/StudentStudyGroup` default: AutoByteus / DeepSeek Flash
- `/StudentStudyGroup/student_one`: resolved AutoByteus / DeepSeek Flash
- `/StudentStudyGroup/student_two`: resolved AutoByteus / DeepSeek Flash
- all scopes inherited auto-approve, skill access, and the isolated Temp Workspace as intended
- root values were not changed by the nested-Team override

Evidence:

- `electron-deepseek-launched-history.json`
- `electron-deepseek-launched-disk-v2.json`
- `electron-deepseek-final-disk-v2-before-termination.json`

## Real provider execution and message routes

The browser sent an exact two-part instruction to `/Teacher`.

### Ordinary message to the nested Team

1. Teacher called `send_message_to` with recipient `/StudentStudyGroup`.
2. The Team route resolved to nested coordinator `student_one`.
3. Student One, running through the AutoByteus runtime, replied to `/Teacher` with exactly:
   `SUBTEAM_DEEPSEEK_MESSAGE_OK`
4. The UI Team panel and persisted communication file both showed the outbound and return messages.

### Formal task delegated to the nested Team

1. Teacher called `delegate_task` with recipient `/StudentStudyGroup`.
2. The dynamic task Team executed.
3. Nested Student One submitted exactly:
   `SUBTEAM_DEEPSEEK_TASK_OK`
4. Teacher called `review_task_result` and accepted the matching submission.
5. Task `task_86a98cacede2468484e56e77f82e82c2` persisted with status `accepted`, one submission, and one `accept` review.
6. The dynamic task execution settled at `2026-08-24T17:29:38.806Z`.

### Second inherited member

A second browser prompt asked Teacher to message the exact child address `/StudentStudyGroup/student_two`. Student Two replied through `send_message_to` with exactly:

`SUBTEAM_SECOND_MEMBER_OK`

This additional check directly exercised the second Agent inheriting the nested Team default rather than relying only on the persisted snapshot.

Evidence:

- `electron-browser-deepseek-subteam-task-message-pass.png`
- `electron-browser-deepseek-subteam-messages-pass.png`
- `electron-deepseek-task-records.json`
- `electron-deepseek-communication-records.json`

## Proof that DeepSeek actually executed

The evidence is not limited to configured labels:

- packaged-server logs instantiated `DeepSeekLLM` for configured Student One, dynamic-task Student One, and configured Student Two
- each nested run emitted token-usage updates and completed tool invocations
- token-usage run records identify:
  - Teacher: `codex_app_server`, provider `OPENAI`, model `gpt-5.6-luna`
  - configured Student One: `autobyteus`, provider `DEEPSEEK`, model `deepseek-v4-flash`
  - task Student One: `autobyteus`, provider `DEEPSEEK`, model `deepseek-v4-flash`
  - configured Student Two: `autobyteus`, provider `DEEPSEEK`, model `deepseek-v4-flash`
- all three DeepSeek-backed runs recorded non-zero input and output tokens

Evidence: `electron-deepseek-provider-log-excerpts.txt`, `electron-deepseek-token-usage.json`.

## Termination, persistence, and cleanup

- The browser activated the normal **Terminate team** control.
- GraphQL returned `isActive: false`, a non-null `terminatedAt`, and all configured Agents offline.
- The accepted task, four ordinary messages, exact root/nested/Agent launch snapshots, and settled dynamic task node remained intact on disk and through history.
- `close_tab` closed tab `edcf5a`; `list_tabs` returned no sessions.
- Owned Nuxt `54427` and packaged backend `54334` stopped.
- The held launcher again received SIGINT before its preparation cleanup completed. After proving no listener, process, or open file referenced the exact preparation-owned root, only `autobyteus-e2e-Ymjjtk` was removed.
- Final audit: ports `54334` and `54427` free, owned root absent, source `.env` unchanged in inode/mode/owner/size/mtime, private package status unchanged except pre-existing `?? .codex/`, and user-owned PID `33760` still healthy on `29695`.

Evidence:

- `electron-deepseek-terminated-api.json`
- `electron-deepseek-terminated-disk-v2.json`
- `electron-browser-deepseek-terminated.png`
- `electron-deepseek-cleanup-pre-root-remove.txt`
- `electron-deepseek-post-cleanup-verification.txt`

## Result

`Pass` for API-E2E-013.

The nested Team was explicitly configured differently from the root in the real form, both nested Agents resolved and actually executed through AutoByteus/DeepSeek Flash, the root stayed on Codex/Luna, the exact V2 hierarchy persisted on disk, the Teacher used both ordinary Team messaging and formal Team delegation, the required result was submitted and accepted, the second inherited Agent was exercised directly, termination preserved history, and cleanup affected only API/E2E-owned resources.
