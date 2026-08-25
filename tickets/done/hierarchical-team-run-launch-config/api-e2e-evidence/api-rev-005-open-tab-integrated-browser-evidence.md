# API-REV-005 Integrated `open_tab` / Electron / Provider Evidence

- Actual AutoByteus `open_tab` used: **Yes** — tab `c8d4e0` against current Nuxt `http://127.0.0.1:58524`, proxying isolated packaged backend 58449.
- Current Electron package: **Yes** — macOS arm64 `AutoByteus.app` produced from integrated worktree resources and launched with the documented packaged E2E profile.
- Complete private package: `/Users/normy/autobyteus_org/autobyteus-private-agents`; already auto-registered in the fresh profile; exact `nested-classroom-test` definition loaded.
- Root Team: `codex_app_server` / `gpt-5.6-luna`.
- Explicit nested Team `/StudentStudyGroup`: `autobyteus` / `deepseek-v4-flash`.
- Standalone Agent: `autobyteus` / `deepseek-v4-flash`, exact real response `AGENT_RUN_OK`; metadata persisted exact workspace/model/runtime/auto-approve.
- Root/nested active New/empty: disabled with exact `Enter a workspace path to run this team.` text.
- Root/nested non-empty paths: retained across later root auto-approve and nested runtime/model edits; root/nested values stayed isolated.
- Failure: first Team activation registered/canonicalized both New workspaces but did not create a TeamRun; the second activation launched. See `api-rev-005-team-registration-continuation-failure.md`.
- Eventual exact V2 disk: root/Teacher Codex Luna; nested Team/both Agents AutoByteus DeepSeek Flash.
- Real ordinary message: `/StudentStudyGroup` reply persisted as `INTEGRATED_SUBTEAM_MESSAGE_OK`.
- Real formal task: `/StudentStudyGroup` submitted `INTEGRATED_SUBTEAM_TASK_OK`; Teacher called `review_task_result`; stored status `accepted` with submission and review records.
- Environment prerequisite correction: registered local metadata paths were created as owned directories before the successful Codex retry; absolute `CODEX_APP_SERVER_COMMAND` was supplied. The earlier `ENOENT` therefore remains harness evidence, not the product failure.
- Cleanup: Agent and Team runs terminated; tab closed; `list_tabs` returned zero; owned Nuxt/Electron stopped; ports 58449/58524 free; both owned roots removed; user-owned app and source secrets untouched.

## Primary Artifacts

- `api-rev-005-open-tab-root-nested-config.png` — SHA-256 `090109ad8db762e5bcebc51801dec7c453d1b724f69c06824010d6efa2139ffb`
- `api-rev-005-open-tab-agent-deepseek-success.png` — SHA-256 `fec0b3a4292937ef94ba8948788fc16a045beec304cf8676568a5c2d584136a4`
- `api-rev-005-open-tab-team-message-task-success.png` — SHA-256 `a8d6b751ed055f527fc7b8c7134885253927122cebf77e885284923fc11cbbc2`
- `api-rev-005-agent-run-metadata.json`
- `api-rev-005-launched-disk-v2.json`
- `api-rev-005-retry-team-execution-tree-v2.json`
- `api-rev-005-retry-team-communication-messages.json`
- `api-rev-005-retry-task-delegation-records.json`
- `api-rev-005-retry-team-history-after-clean-terminate.json`
- `api-rev-005-static-and-cleanup-audit.txt`
