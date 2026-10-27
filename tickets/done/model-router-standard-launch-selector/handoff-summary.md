# Handoff Summary: model-router-standard-launch-selector (autobyteus-313)

- Status:
  - Verified from the evidence and proven from a clean clone (Task constraint); archived and finalized on `personal`.
  - Released as beta **v1.5.9-beta.13**, as the user asked. Final state in `release-deployment-report.md`.
- Classification: `task_size=Medium`, `architectural_risk=Low`, direct route.
  - Architecture review: `N/A — not applicable`.
  - Code review and test-code review: `N/A — not applicable` (direct low-risk route).
  - API/E2E: API-REV-001 Pass, 95%.
- Revisions: SR-001 / IR-001 / API-REV-001 / DR-001.
- Origin: follow-up FU-012 of autobyteus-32, found by the user in the desktop app.

## What Changed

- **Configuration tab:** Settings → Model Routing → Configuration sets the Model Router's launch with the app's standard launch controls, the same as New chat and run Settings:
  - the grouped model menu (runtimes with model counts, search, "claude-sonnet-5-5 Claude SDK" labels);
  - the thinking-level control;
  - the model's other option controls (e.g. Codex Fast mode).
- **Stored launch:** the router's stored launch now includes its model settings: the new server setting `AUTOBYTEUS_MODEL_ROUTER_LLM_CONFIG`, and `setModelRouterLaunch(…, llmConfig)`.
  - A launch is checked like any agent launch before it is stored. A model not offered, or an invalid setting, is refused with the check's message, and the stored launch stays.
- **Router runs:** the router run starts with its stored launch, thinking level included.
  - Any change of runtime, model or settings starts a new router run.
  - `knowledge.md` carries over.
- **Names:** the page names runtimes and models as the rest of the app does, on all four tabs: "Claude Agent SDK", "Codex App Server", "<model> <runtime>".
- **Upgrade from beta.11/12:** the user's router configuration is kept. The stored runtime and model read with "no settings", the existing router run is reused, and no migration runs.
- **Commits:**
  - code `09f99eed32`, `f9c58612e5`, `1357063994`;
  - docs and handoff `e9c25f3801`;
  - API/E2E `0b6911aaac`;
  - checkpoint `8e43e74d78`.
- **Docs:** `model_routing.md`, `settings.md` and design case 13, written by the implementation and verified by delivery (`docs-sync-report.md`).

## Integration And The Clean-Clone Proof

- `origin/personal` was still at the bootstrap base `1c54ffec6a`, so the branch was already current.
- Clean clone (`evidence/delivery/DEL-01-clean-clone-proof.log`): `git clone --no-local --branch codex/model-router-standard-launch-selector` at `8e43e74d78`, with the documented setup. All commands ran with `env -i`, so no `AUTOBYTEUS_*` variable leaked in (FU-003).
  - Setup: `pnpm install --frozen-lockfile`, `autobyteus-ts` build, server prebuild and `nuxt prepare`: all exit 0.
  - Server typecheck: exit 0.
  - Server unit tests in `tests/unit/model-routing/`: 49/49.
  - Web tests (`ChatModelMenu` and the model-routing specs): 31/31.
  - Web guards: all three exit 0.
  - Server build: exit 0.
  - Model-routing E2E: MR-01…09, 9/9.
  - Two-server E2E: 41/41, after its documented preparation `pnpm -C autobyteus-server-ts test:integration:prepare` (Brief Studio's importable package). The first run, without it, stopped in setup with "Brief Studio's importable package is missing".

## Verification From Evidence

All five critical ACs are proven. The table is in `release-deployment-report.md`.
- **AC-002:** a valid launch stores `llmConfig {thinking_enabled: true, reasoning_effort: "high"}`. These are refused, and the stored launch stays:
  - an invalid value: "Value is not one of the supported options.";
  - a wrong type: "Expected boolean.";
  - a model not offered: "The model 'no-such-model' is not available on claude_agent_sdk.".
- **AC-003 (live Claude sonnet router):** the CLI ran with `--effort high`, and the run was reused while nothing changed. After an effort change, a new session `--effort low` started, `knowledge.md` was unchanged, and every routing was the router's.
- **AC-005:** data written by the released v1.5.9-beta.12, whose router code equals beta.11's. On this build the router stays active with `llmConfig: null`, the same router run (`model_router_d44eeb4d…`) is reused and routes, and the migration records are identical (27 Prisma, 34 app-data).
- **AC-001, AC-004:** rendered checks, 11/11, including zh-CN and 390 px, with no browser errors. Configuration uses the standard menu. Decisions, Overview and Runtimes use the composer's labels.
- No user check is required. The Task's "Done when" ("… covered by tests; merged to personal") asks for none.

## Follow-ups (`follow-ups.md`, sent by the Solution Designer)

FU-001…FU-004 as recorded. Notably:
- **FU-004:** a replaced router run's CLI process keeps running. This was seen live: the old `--effort high` session alongside the new `--effort low` one. It's the same rule as in autobyteus-32; this ticket makes launch changes more frequent.
- **FU-003:** `pnpm dev` inherits the caller's `AUTOBYTEUS_*` environment.

Delivery found no new follow-up.

## Release

Beta v1.5.9-beta.13, decided by the user ("if everythign fine, release a new beta thanks").
