# Handoff Summary

## Summary Meta

- Ticket: `grok-release-smoke-551` (Project Task `autobyteus-551`, why Grok failed the release smoke; delegated by `/project_task_manager` on the founder's word)
- Date: `2026-11-22`
- Classification: `task_size: Medium`, `architectural_risk: High`; route: reviewed. Architecture review ARCH-REV-001 Pass (SR-001/SR-002); implementation IR-001; code review CRR-001 Pass (no findings, average 9.5); API/E2E `API-REV-001` Pass, final confidence 95.5%; test-code review CRR-002 Pass (no findings).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`)
- Branch: `codex/grok-release-smoke-551`, base `origin/personal` @ `df00f97aaa` at bootstrap; integrated with `origin/personal` @ `dcb855728c` (merge `abe2e87fcc`, no conflict) before delivery edits. Product code is final at `5054f97a17`; everything after it is tests and ticket documents.

## Delivery Summary

- Delivered scope: Grok failed the release smoke in beta.1, 3, 4 and 7 and the founder waived it almost every release. Three separate causes (`investigation-notes.md`) are fixed:
  1. **Start-up time-outs.** `initialize` now waits 90 s, for model discovery and for every ACP run start (Grok's own start-up has taken up to 34.6 s on a loaded machine; the bounds were 15 s and 30 s). A silent agent still fails clearly, at 90 s. Grok's version/agent-mode probes get 10 s (was 3 s). The other short ACP requests keep 30 s; session opens and prompts are unchanged.
  2. **A stale model list.** While Grok's sign-in is expired (its first start after about 6 h unused) it answers `initialize` with its built-in list (`grok-4.6`, `grok-4.5`) and announces xAI's real list (`grok-4.7`) about 0.2 to 0.5 s later. Discovery now waits up to 3 s after the answer for `_x.ai/models/update`, takes the announced list, and never turns the wait into a time-out. Before, AutoByteus offered models a run then refused (`RUN_MODEL_NOT_OFFERED`).
  3. **Workspace skills invisible to Grok.** Grok loads a folder's own `.grok/skills` only in a trusted folder. A Grok run's process now gets `GROK_FOLDER_TRUST=0` (that process only, nothing written, `--trust` never used); discovery and billing processes stay untrusted. The user decided this (DEC-003, option (a), 2026-11-22).
- Shared-contract changes: the connection splits `INITIALIZE_TIMEOUT_MS` into `AGENT_START_TIMEOUT_MS` (90 s) and `REQUEST_TIMEOUT_MS` (30 s) with no alias, and gains an optional listener for notifications that carry no session (only the discovery handshake registers one). DeepSeek Harness shares the 90 s bound.
- Docs synced (`docs-sync-report.md`): `grok_build_runtime.md` (implementation: the bounds, the 3 s wait and its cost, run-only trust and what it loads; delivery: source layout, Skills, Known limits) and `deepseek_harness_runtime.md` (the shared bound). `DESIGN.md`, `TESTING.md` and `RELEASE.md` need no change.
- Durable coverage: unit cases for the connection bounds and listener, the discovery handshake (new file, 5 cases), the Grok capability and launch profile; one new scripted E2E case in `grok-build-runtime-replay.e2e.test.ts` (a Grok answering `initialize` after 35 s still lists `grok-4.7` and starts and completes a run; it fails on the base source at 15.45 s and 30.2 s).

## Verification Summary

- Verified from evidence by delivery; no user check is needed. AC-001, 002, 003, 004 and 005 (critical) are directly proven; AC-006 is proven except for the part the Solution Designer's evidence decision accepted as unverified risk (below). The critical evidence files were opened (`release-deployment-report.md`, Verification).
- Final confidence 95.5% (target 95% met), no applicable category below 94%.
- Accepted unverified risk (the Solution Designer's evidence decisions, user informed; listed here and in the terminal message):
  - **DEC-006** (AC-006): a second release-smoke run held at load 40 or more throughout. Run 2 passed at load 42 to 172, but run 1 started at load 10.5 and reached 39 to 51 only at its end. A third run needs another Grok free-tier day, so the next release smoke at release load is the check.
  - **DEC-004** (also named in DEC-006): a live Grok start-up above 30 s, handled end to end. It did not occur: start-ups were 186 to 441 ms in both runs, even at load 172. The scripted 35 s case through the real server stands in for it.
- Key evidence:
  - `evidence/API-01-slow-initialize/`: the replay suite `Tests 11 passed (11)` on the branch; base-source controls fail with `Grok Build model discovery timed out` at 15452 ms and `ACP_REQUEST_TIMEOUT: initialize did not respond in time` at 30204 ms.
  - `evidence/API-04-smoke/`: two release-smoke runs on the real CLIs, both exit 0, 13 of 13 PASS, `grok-4.7`. Run 1 caught the stale case live: pid 6299 `had_real_catalog: false`, `model_count: 2`, then `fetch succeeded`, `notifying clients`, `model_count: 1` within the same second, and `grok-4.7` offered and run. Run 2: load 41.6 before, 45 to 172 during; seven Grok starts, longest 441 ms.
  - `evidence/IMP-03-live-ac005-workspace-skill.log`: the live AC-104 case passes 3 of 3 and the user's `~/.grok/trusted_folders.toml` hash is unchanged (`5631cafe35f6…`). `evidence/IMP-04-live-ac003-discovery-fresh.log`: a fresh sign-in discovery takes 3.86 to 3.95 s (initialize plus about 3.1 s), within the 5 s of QR-001.
  - `evidence/API-02-acp-suites/` (Grok compaction replay 3, DeepSeek scripted provider with real `dsh` 6) and the typechecks (`IMP-02`, `API-03`).
- Integrated-state check after the base merge: both typechecks PASS at baseline, 554 runtime-management, ACP, Grok, DeepSeek and llm-management unit tests PASS, and the scripted Grok replay E2E 11 of 11 (the 35 s case included). The live smoke and AC-104 runs were not repeated: the base commits touch no file they exercise.
- Secret Gate and artifact hygiene: recorded in `release-deployment-report.md`.

## Residual Risks For The User

- Every Grok model list read and every Grok run start costs about 3 s more while Grok's sign-in is fresh (it gives no sign that no refresh is coming); the run start validates its model against a full catalog read.
- RSK-001: Grok's announcement later than 3 s under heavy load would show one stale list. It was not seen (the stale announcement came within the same second).
- RSK-002 (approved by the user, DEC-003): a trusted run workspace lets Grok load that workspace's Grok hooks, MCP and LSP servers, project instructions and permission rules, and the user's own Grok and Claude hooks, so a hook or an `ask` rule there can change a run's behavior. Claude runs already load the workspace's project settings.
- RSK-003: the Grok-owned names (`_x.ai/models/update`, `GROK_FOLDER_TRUST`) could change with a Grok update; the AC-104 live case and the release smoke would show it, and `grok_build_runtime.md` says so.
- A DeepSeek or billing short process that never answers now fails at 90 s instead of 15 s.
- The live suite's org `ROOT_LIFECYCLE` 15 s wait was not exercised.
- Sessions were added to the host's Claude, Codex and Grok histories by the live runs.

## Follow-ups

- `follow-ups.md` holds the Solution Designer's two notes, in its own table layout: FU-001 (optionally report Grok's slow start-up step, 5.2 to 22.9 s in the beta.4 smoke, to xAI) and FU-002 (tell the owner of `autobyteus-567` that the cause of the model-list drift is answered and its retry may no longer be needed). Delivery added none.

## Release

- No release: the founder has not asked for one, and RELEASE.md's default is no release. A release is available. `release-notes.md` holds the user-facing notes for the next release. The next release's smoke is also the check that Grok now passes without a waiver (DEC-006).
