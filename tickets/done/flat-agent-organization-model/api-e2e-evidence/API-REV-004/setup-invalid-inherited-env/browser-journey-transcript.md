# API-REV-004 Real Browser / API / Codex Transcript

## Environment

- Exact artifact: `b19c41e68c119f9a9590c5b04839454dae5f64b8`.
- Backend: built server, isolated data, `127.0.0.1:8457`.
- Renderer: production Nuxt build, `127.0.0.1:3457`, API/WS endpoints pointed to 8457.
- Browser: AutoByteus persistent Chromium `open_tab`.
- Provider: real Codex App Server, `gpt-5.6-sol`, low reasoning, automatic tool approval.
- Fixture: UI-imported retained package; 4 Agents, 2 flat AgentTeams, 2 AgentOrgs; every possible assignee has `submit_task_result`, every reviewer has `review_task_result`.

## Executed journeys

1. **UI import** — Settings > Agent Packages accepted the fixture absolute path and showed `Agent package imported.` The catalog exposed 4 Agents / 2 Teams; package hashes passed before import.
2. **Standalone Team fresh run** — launched `AORG E2E Research Squad` in the isolated workspace. Its first prompt started the previously inactive Team without retry. `/lead` called `get_handoff_rules`, sent `AORG4-TEAM-MESSAGE-001` to `/analyst`, delegated exactly one task, received `AORG4-TEAM-TASK-INITIAL-001`, requested one revision, received `AORG4-TEAM-TASK-REVISED-001`, and accepted the same task. Task `task_36faf3ca2c424b6fb77a7ccc370ea38a` and all four lifecycle updates rendered and persisted.
3. **Mixed AgentOrg fresh run** — configuration-first launch of `AORG E2E Mixed Org` produced no implicit focus. Direct Agent `concierge`, mounted `research team`, and `support team` rendered; mounted Team rows carried aggregate status; root had the sole Stop control and no Reconnect.
4. **Mounted-Team task/message** — `/concierge` delivered `AORG4-ORG-TEAM-MESSAGE-001` to `/research-team` coordinator and delegated exactly one task to `/research-team/analyst`. Task `task_540b6aeb98324958ad87f0180121a9f8` completed submit -> revision -> resubmit -> accept. The accepted sidecar contains all four exact updates and the execution tree records terminal `settledAt=2026-09-02T06:42:39.422Z`; the Org remained active.
5. **Pre-shutdown mixed API** — generic history returned the exact active `agent_team` and `agent_org` roots with explicit discriminators.
6. **Real shutdown/restart** — direct SIGTERM closed the active Team and Org server cleanly; same-data restart completed. The *first* post-restart generic/workspace history query returned both exact roots inactive and the standalone Team definition/run/members offline. This resolves prior API-FIND-013's first-mixed-history defect.
7. **Stopped Team history focus** — expanded the inactive standalone Team, focused its historical task Agent and then configured `/lead`; exact first prompt, message, initial/revised task markers and Accepted status rendered.
8. **Stopped Team first continuation** — attempted the unique `AORG4-TEAM-RESUME-001` prompt. The package registry persisted but its definitions had not been loaded into restart caches; restoration failed because `aorg-lead` was absent. The Team remained offline, prompt stayed a draft, and no error surface appeared. **API-FIND-014 / Fail.**

## Stopped scopes

Execution stopped at API-FIND-014. Fresh API-REV-004 AgentOrg Restore/continue, 390x844 strip -> drawer -> Org tree focus, Stop Org terminal presentation, and later live scopes were not run. API-REV-003 evidence is historical and is not promoted to a fresh pass.

## Cleanup

The browser tab was closed. The restarted server accepted direct SIGTERM and logged `Server closed cleanly` within one second. The renderer stopped. Ports 8457/3457 are closed. Fixture hashes pass. The isolated data root is retained as evidence only.
