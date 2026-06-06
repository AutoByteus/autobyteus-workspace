# Browser E2E Evidence — Round 2 (2026-06-04)

## Scope

User-requested live browser validation of the self-evolving harness work with both services running locally:

- Backend: built `autobyteus-server-ts/dist/app.js` on `http://127.0.0.1:8000`
- Frontend: Nuxt dev server on `http://127.0.0.1:3000`
- Runtime selected in the UI: `AutoByteus`
- Model selected in the UI: `DeepSeek / deepseek-v4-flash`
- Browser run ID: `skill_self_evolver_skill_evolution_specialist_3762`
- Isolated workspace used by the run: `/tmp/autobyteus-self-evolution-browser-e2e/workspace`

The DeepSeek key was not printed or committed. The requested main-repo server `.env` was checked first; it did not contain `DEEPSEEK_API_KEY`, so the key was sourced from an available local credential file/environment and written only into the temporary server data `.env` used for this isolated run.

## Browser Scenarios Passed

1. `/agents` loaded and showed the built-in `Skill Self-Evolver` agent.
2. Clicking `Run` opened the run configuration flow.
3. The UI selected `AutoByteus` as runtime and `DeepSeek / deepseek-v4-flash` as the model; `Run Agent` was enabled.
4. Launching the run created a visible workspace conversation for `Skill Self-Evolver - 3762`.
5. Sending `Browser validation: please reply with a one-sentence acknowledgement only; do not call tools.` produced the assistant response `Understood — I acknowledge the browser validation request and will not call any tools.`
6. Backend logs confirmed the run prepared `DeepSeekLLM` and completed the turn.
7. GraphQL `getAgentRunResumeConfig` for the run confirmed `runtimeKind: autobyteus`, `llmModelIdentifier: deepseek-v4-flash`, the isolated workspace path, and immutable launch fields after start.
8. `/settings` -> `Server Settings` displayed the self-evolution toggle disabled by default, then enabled it successfully.
9. GraphQL `selfEvolutionCapability` confirmed `enabled: true`, `settingKey: ENABLE_SELF_EVOLUTION`, `source: SERVER_SETTING`.
10. GraphQL strategy catalog confirmed `manual_only` / `single_agent` implemented and scheduled/signal/team placeholders not implemented.
11. GraphQL eligibility for the run launched before enabling self-evolution remained ineligible with the expected snapshot reason: the run's launch snapshot had self-evolution disabled. This verifies launch-snapshot behavior in the live stack.

## Screenshot Evidence

- `01-agents-home.png` — agents page with `Skill Self-Evolver` visible.
- `02-run-config-autobyteus-deepseek.png` — run configuration with AutoByteus runtime and DeepSeek Flash selected.
- `03-live-run-deepseek-response.png` — live run chat after DeepSeek response.
- `04-settings-self-evolution-enabled.png` — settings page with self-evolution enabled.

## Cleanup

The temporary runtime root `/tmp/autobyteus-self-evolution-browser-e2e` contains the isolated server data and temporary `.env`; it was removed after validation and evidence capture.
