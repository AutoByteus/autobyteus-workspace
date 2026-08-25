# API-E2E-012 — Packaged Electron / Open-Tab Nested Classroom Evidence

## Scope

- Date: 2026-08-24 (Europe/Berlin)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config`
- Imported source: `/Users/normy/autobyteus_org/autobyteus-private-agents`
- Team: `nested-classroom-test` (`Nested Classroom Test Team`)
- Runtime/model: `codex_app_server` / `gpt-5.6-luna`
- User-owned AutoByteus listener excluded from the test: port `29695`, PID `33760`

## Build and isolated Electron profile

1. The README-documented generic command, `env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron --adapter playwright`, reached the package build but failed before launch because `build:electron` selected `ALL` and the current packager correctly refuses a Linux target on a Darwin/arm64 host. Evidence: `packaged-electron-launch.txt`.
2. The project-provided host-native command `env -u ELECTRON_RUN_AS_NODE pnpm build:electron:mac` passed, producing the arm64 `.app`, DMG, ZIP, and block maps. Evidence: `packaged-electron-mac-build.txt`.
3. The official thin launcher then reused that exact current-worktree executable with `--skip-build --adapter playwright --hold-ms 1200000`. It reported:
   - backend port: `53559`
   - data root: `/private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-e2e-yHnpKJ`
   - health: pass
   - ownership: preparation-owned root
   Evidence: `packaged-electron-live-session.txt`, `packaged-electron-ready-verification.txt`.
4. The ordinary app remained healthy on PID `33760` / port `29695` before, during, and after the run.

## Browser / package import

- An owned Nuxt renderer on port `53612` targeted the packaged Electron-owned backend for HTTP and all relevant WebSocket endpoints.
- `NUXT_TEST=true` was used only to disable Nuxt's broken dev app-manifest resolution after the Electron generate step; the real application UI, real package backend, real WebSockets, and real Codex runtime were used.
- `open_tab` opened `http://127.0.0.1:53612/settings`.
- The isolated bootstrap registry already linked the private package. To prove the normal import journey, the browser removed that isolated registry entry and re-imported the exact complete source through **Settings -> Agent Packages**.
- UI result: `Agent package imported.`
- GraphQL result: source kind `LOCAL_PATH`, 40 shared Agents, 25 team-local Agents, 9 Agent Teams, 0 applications.
- Source inode, mode, size, mtime, and pre-existing git status were unchanged. The package source was read-only from this validation's perspective.
- Evidence: `electron-browser-package-import.png`, `electron-browser-package-import.json`, `private-package-source-post-import-stat.txt`.

## Real hierarchical launch

- `open_tab` selected **Nested Classroom Test Team** and entered the normal workspace configuration.
- Root `/` was changed to **Codex App Server** and **OpenAI / GPT-5.6-Luna (default reasoning: medium)**; auto-approve was enabled for the real collaboration tools.
- The browser showed `/StudentStudyGroup` as inherited and immediately resolved it to the same runtime/model. Agent override controls for `/Teacher`, `/StudentStudyGroup/student_one`, and `/StudentStudyGroup/student_two` remained `Global default`.
- Run Team became enabled and the browser launched the Team.
- Persisted/API result for run `nested_classroom_test_team_8db52ca1f739455099a70b7d4bc4060f`:
  - exact V2 schema
  - root Team default `codex_app_server` / `gpt-5.6-luna`
  - nested Team default `codex_app_server` / `gpt-5.6-luna`
  - all three configured Agent snapshots `codex_app_server` / `gpt-5.6-luna`
  - canonical addresses `/Teacher`, `/StudentStudyGroup`, `/StudentStudyGroup/student_one`, `/StudentStudyGroup/student_two`
  - isolated Temp Workspace for every scope
- Evidence: `electron-browser-luna-launch-config.png`, `packaged-electron-codex-app-server-catalog.json`, `electron-nested-classroom-launched-history.json`.

## Real nested delegation and acceptance

The browser sent this exact user prompt to `/Teacher`:

> Please test nested team delegation. Delegate one task to /StudentStudyGroup and ask the students to return exactly NESTED_CLASSROOM_OK. Accept the result if it matches.

Observed real Codex/tool lifecycle:

1. Teacher called `delegate_task` with recipient `/StudentStudyGroup`.
2. A task Team executed under `/StudentStudyGroup`.
3. Student One submitted `NESTED_CLASSROOM_OK` through the formal task lifecycle.
4. Teacher's early review attempt correctly returned `not awaiting review`; after submission, Teacher called `review_task_result` again.
5. Task `task_68f735462a71437e830b9263499f7f49` reached `accepted` with one submission and one `accept` review.
6. The live UI displayed **Accepted**, `StudentStudyGroup -> Teacher`, the exact submission token, and the review reason.
7. The UI also displayed the final Teacher response: `Nested delegation completed and accepted. The result matched exactly: NESTED_CLASSROOM_OK.`
8. An ordinary nested message from `student_one` to Teacher carried the exact same token.

The model also created an extra direct Student Two subtask. Student Two returned the exact token through `send_message_to`; that non-required extra subtask remained active until root termination and then became `interrupted` with reason `Root TeamRun terminated.` The required root-to-nested task stayed `accepted` and was not altered.

Evidence:
- `electron-browser-nested-classroom-success.png`
- `electron-browser-nested-classroom-expanded.png`
- `electron-browser-nested-classroom-task-panel.png`
- `electron-nested-classroom-task-progress.json`
- `electron-nested-classroom-final-api.json`

## Termination, persistence, and cleanup

- `open_tab` activated the normal **Terminate team** action.
- The run became inactive, every configured Agent became offline, the required task remained `accepted`, the extra open subtask became `interrupted`, and every dynamic task execution received a `settledAt` value.
- Resume/history returned the same exact V2 Team/Agent runtime/model hierarchy after termination.
- Persistent tree, task, and communication files were captured before deleting the owned data root.
- The tab was closed; the owned Nuxt and packaged Electron process tree/listeners stopped.
- Because SIGINT stopped the held launcher before it disposed the preparation-created root, the engineer removed only the exact preparation-owned `autobyteus-e2e-yHnpKJ` directory after confirming no owned process/listener remained.
- Final audit: ports `53559` and `53612` free, owned root absent, no tool-managed tabs, ordinary PID `33760` still listening and healthy on `29695`.

Evidence:
- `electron-nested-classroom-terminated-api.json`
- `electron-nested-classroom-persisted-files.json`
- `electron-post-cleanup-verification.txt`

## Result

`Pass` for API-E2E-012. The complete private package was imported through the real UI, the requested nested Team ran on actual Codex `gpt-5.6-luna`, the required nested task was submitted and accepted with the exact marker, V2 configuration was persisted for every scope, and the owned environment was safely terminated and removed without affecting the user's running application.
