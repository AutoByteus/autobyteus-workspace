# LIVE-001 / LIVE-002 — Real package, default provenance, and exact configuration equality

## Result

- `LIVE-001`: **Pass**
- `LIVE-002`: **Pass**
- Time: 2026-09-03 15:39–15:48 UTC
- Browser: production-built Nuxt renderer in persistent Chromium, opened with AutoByteus `open_tab`
- Backend: current built artifact, isolated copied real data at API-REV-009, `127.0.0.1:8589`

## Observed real-user flow

1. Opened **Settings -> Agent Packages** in the production renderer.
2. Removed the existing registration and re-imported the external package by its absolute local path using the normal input and **Import Package** action.
3. The UI reported `Agent package imported.` and the package row reported 4 shared Agents and 2 Teams. The external package also contains two `agent-orgs/*/org-config.json` definitions; both immediately appeared in the normal Agent Orgs catalog (`AORG E2E Direct Agents Org`, `AORG E2E Mixed Org`).
4. The continuously mounted Workspaces tree retained the prior real `workspace` history with `TEAMS` before `AGENT ORGS` and rows `APIREV8 本地化 Team β (1)` and `APIREV8 组织 Ω (1)`.
5. Invoked **Run** on `AORG E2E Mixed Org`. The fresh untouched Org draft selected the actually available API-REV-009 temp directory as `Temp Workspace (Default)` without interaction. There was no `memberAddress` query and no focused descendant.
6. Added the real `workspace-team` directory through the ordinary sidebar add-workspace form. Expanded only `/research-team`, selected `workspace-team` for that Team scope, and selected exact Agent `/research-team/analyst` -> runtime `AutoByteus` -> model `DeepSeek / deepseek-v4-flash`.
7. Captured the preview, actual `CreateAgentOrgRun` GraphQL variables, successful response, post-launch DOM, and durable `agent_org_run_execution_tree.json`.

## Equality facts

The three material evidence layers agree exactly:

| Scope | Preview | GraphQL request | Durable snapshot |
| --- | --- | --- | --- |
| Root `/` | Codex App Server; GPT-5.6-Sol; reasoning low; Temp Workspace | `codex_app_server`; `gpt-5.6-sol`; `{reasoning_effort:"low"}`; exact `workspace-default` | byte-equivalent values in `rootOrg.defaultLaunchConfiguration` |
| Team `/research-team` | Team scope shows `Workspace: workspace-team` | one Team override containing only exact `workspace-team` | Team default uses exact `workspace-team`; descendants inherit it |
| Agent `/research-team/analyst` | `AutoByteus`; `DeepSeek / deepseek-v4-flash` | exact runtime/model plus **`llmConfig: null`** | exact runtime/model plus **`llmConfig: null`**; Team workspace inherited |
| Unoverridden `/support-team` | Inherited | no override | root runtime/model/config/workspace inherited |

This directly proves incompatible Codex reasoning configuration is cleared when the exact Agent owns AutoByteus/DeepSeek, rather than leaking from its parent.

## Post-launch facts

- Run ID: `aorg_e2e_mixed_org_b42a161089a84f31b6fc294be822871d`.
- Strict projection requests succeeded for all six exact Agent addresses.
- The active page remained intentionally unfocused and rendered `Choose an Agent or Team` plus the instruction to select from the active Org; no descendant was auto-focused.
- Unified history showed the new Org under Temp Workspace and preserved prior Team/Org history under `workspace`.

## Evidence

- `screenshots/package-before-reimport.png`
- `screenshots/package-reimport-success.png`
- `screenshots/catalog-and-unified-history-desktop.png`
- `screenshots/org-config-overrides.png`
- `screenshots/org-post-launch-unfocused.png`
- `config-preview.json`
- `launch-graphql-requests.json`
- `launch-graphql-responses.json`
- `persisted-org-tree-pre-conversation.json`
- `post-launch-dom.txt`
- `backend-session.log`

The failed initial wrapper and failed first Playwright import were setup-only and preceded the product action; both were corrected without changing product source or claiming product evidence from them.
