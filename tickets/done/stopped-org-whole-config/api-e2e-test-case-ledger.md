# API/E2E Test-Case Ledger — ORG-STOPPED-WHOLE-CONFIG-20260917-001

Initial baseline. No prior API result or confidence. The canonical execution report will be authoritative after completion.

| Case | Expected | Status |
| --- | --- | --- |
| R01 | Fresh manifest verification; focused server/web checks and production build | Pass |
| B01 | Direct and mounted gear open same whole form; multi-scope linked/override edit; one Save; reopen | Pass — API-REV-002 rerun |
| B02 | Ordinary Send uses saved root/member scope; zero provider/start before Send | Pass — API-REV-002 |
| B03 | All-or-none invalid correction; pre-write failure; indeterminate authoritative refresh/no replay | Pass — API-REV-002 |
| B04 | Active/offline/task/stale guards; standalone Agent/Team and Org launch/Plus controls | Pass — API-REV-002, proportional live plus durable adversarial evidence |
| B05 | Identity/history/Activity/draft and protected canonical-state preservation | Pass — API-REV-002, proportional live plus durable protected-state evidence |
| C01 | Integrity, cleanup, confidence, report, revision and rule-based handoff | Pass — API-REV-002 |


## R01 — completed Pass
- Fresh dependency setup used frozen lockfile, shared-package build and Prisma generation. Initial test attempt correctly produced no result because dependencies/Prisma client were absent; after documented setup, execution completed normally.
- Current focused web suite: 10 files / 85 tests Pass (`validation/api-live/web-focused.log`).
- Current adjacent web suite: 19 files / 190 tests Pass, including focused 85 (`web-adjacent.log`).
- Current focused server: 2 files / 9 tests Pass (`server-focused.log`).
- Current adjacent server: 7 files / 30 tests Pass, including focused 9 (`server-adjacent.log`).
- Production server build, source TypeScript compile, generated contracts/Prisma and sanitized bootstrap: Pass (`server-build.log`).
- All 46 IR-002 manifest entries matched at intake. No API-owned durable test or production edit made.

## B01 — environment checkpoint (superseded by actual execution)
- An isolated actual backend/proxy/Nuxt stack on `51281`/`51282`/`51283` reached HTTP 200 for the frontend and GraphQL `Query` readiness. The initial `/health` check was an incorrect path and is not a product failure.
- The normal Chrome Computer Use boundary could not create or control a tab: both available extension profiles repeatedly failed before navigation while loading their request-header policy. This happened outside the application and before B01.
- As a last-resort desktop path, the exact candidate was packaged successfully for macOS (`validation/api-live/electron-build.log`). The project-supported isolated Electron launch profile was configured for port `51291` and the owned data root, but processes launched from the agent command environment exited before readiness with the environment-level macOS `task_name_for_pid` restriction. Ad-hoc and trusted local signing both verified but did not remove that sandbox restriction. No application interaction occurred.
- The original owned web processes and an exploratory owned Chrome instance were stopped cleanly; ports `51281`–`51283` are closed. The isolated data root and package remain ready. B01 stays unresolved pending an ordinary desktop-session launch or restoration of browser control; it is not marked `Fail` or `Blocked` yet.

## B01 — completed Fail (actual browser + listening candidate backend)
- Browser control recovered. The owned candidate stack was restarted on frontend `51283`, proxy `51282`, and backend `51281`. Readiness was HTTP 200 and the backend log confirmed Prisma used the isolated database `.../.local/api-whole-org-config/data/db/production.db`, not the worktree default database.
- A fresh Org was created through the normal frontend. Direct `/guide` and mounted `/squad/lead` each completed one real OpenAI request and rendered the exact responses `DIRECT-BASELINE` and `MOUNTED-BASELINE`. The isolated provider observer recorded exactly two requests/two 200 responses with `gpt-5.4-mini` and `reasoning_effort=low`; no credential value was read or recorded.
- The mounted composer draft `UNSENT-DRAFT-MOUNTED` remained rendered after normal Org Stop. The stopped tree showed root Stopped and direct/mounted members Offline. Runtime IDs were `whole_config_org_7df74f5b3e994420874f10209b45750d`, direct `whole_config_agent_a80f248291e94764b5d1695f7f152dcc`, Team `whole_config_team_585f9e2f01ba434384a6fb6322367104`, mounted `whole_config_agent_7079055c1b63430cbd7ba72db26b6db7`.
- **Failure:** clicking the actual stopped mounted-member header `Edit configuration` never rendered the whole-Org form. The center surface remained `Loading run configuration...`; Save stayed disabled. While visible, the frontend issued 1,366 successful `AgentOrgRunModelConfig` requests for the same root in 44.497 seconds (request IDs 148–1549). Returning to the event view stopped the request loop.
- The same actual stopped direct-member header reproduced the failure: 284 successful identical reads in 8.900 seconds (request IDs 1574–1864), with the same permanently loading/disabled-Save UI. Returning stopped the loop.
- Backend responses were HTTP 200 and contained the correct stopped, editable canonical execution tree. Provider observer stayed at two requests total, so inspect did not start a provider. Execution-tree SHA-256 stayed `f802b1caa882fbb218e409e0fb8b4bbd1e5a2091a107f60ac540207c2957d10c` before/after the failed inspections.
- Evidence: `validation/api-live/runtime-r3/b01-failure-summary.json`, `b01-model-config-request-loop.jsonl`, `tree-before-stop.json`, `tree-after-failed-settings.json`, and provider before/after logs.
- Preliminary origin: frontend reactive identity/load loop. `AgentOrgWorkspaceView.vue` passes a newly allocated inline `target` object to `ExistingRunConfigEditor`; its `watch(selectedIdentity, ..., { immediate: true })` reloads canonical state. The successful read publishes back into the Org context, rerenders the parent, supplies a new prop identity, and starts another read. This requires focused Code Reviewer origin confirmation; no product source was changed by API/E2E.

## B02–B04 — not tested after critical B01 failure
- Save/reopen/Send and recovery cases require the whole-Org editor to render. Continuing with direct GraphQL or store injection would bypass the failed user boundary and would not be acceptance evidence.

## B05 — partial preservation evidence
- Precondition and Stop behavior passed: two independent provider continuations rendered, histories remained visible, the mounted unsent draft survived Stop and member navigation, IDs/handoff tree were stable, and the failed read-only inspections neither changed the canonical execution-tree bytes nor started providers.
- Post-Save preservation is not testable because B01 prevents editing or Save.

## C01 — completed Pass
- Canonical coverage investigation, execution report, ledger and `API-REV-001` are reconciled to the Fail result at 82.1% validation confidence.
- The owned Chrome tab was closed; exact owned backend/proxy/frontend processes were terminated; ports `51281`–`51283` are closed.
- Generated application SDK dist, Electron package and bundled server resources created only for validation were removed. Isolated failure data/evidence remains under `.local/api-whole-org-config` and `validation/api-live/runtime-r3` for focused rework reproduction.

## API-REV-002 / B01 — completed Pass
- Intake IR-003 manifest: 47/47 entries exact. The reviewer-provided production boundary suite is carried as 3/3 Pass and cumulative focused web as 88/11 Pass; actual acceptance did not infer resolution from those tests.
- The owned candidate stack restarted on `51281`/`51282`/`51283` with the exact isolated SQLite DB. Chrome reopened retained root `whole_config_org_7df74f5b3e994420874f10209b45750d`.
- Direct `/guide` header Settings rendered the full whole-Org form. Exactly one new `AgentOrgRunModelConfig` request occurred (new proxy request ID 38); the form remained stable rather than returning to loading.
- Mounted `/squad/lead` header Settings rendered the same whole-Org form. Exactly one new canonical request occurred (request ID 73).
- Both inspections preserved provider log length at four lines (the original two request/two response events only) and preserved execution-tree SHA-256 `f802b1caa882fbb218e409e0fb8b4bbd1e5a2091a107f60ac540207c2957d10c`. No mutation occurred before edit/Save.
- Prior B01 failure is resolved in the actual browser at its original direct and mounted entry points. Evidence root: `validation/api-live/runtime-r4/`.

## API-REV-002 / B02 — completed Pass
- Through the actual whole-Org form, one explicit Save submitted four configured-scope patches in one `UpdateStoppedAgentOrgRunModelConfigs` request: root `/` low→medium, direct `/guide` low→high, Team `/squad` low→high, and mounted `/squad/lead` low→xhigh.
- The UI reported `AgentOrg model settings saved.` Reopening Settings from the direct header rendered the persisted values at all four scopes and left Save disabled because the reopened draft matched canonical state.
- No provider request occurred during inspect, edit, Save, or reopen. The execution tree retained the existing root, Team and member IDs.
- Ordinary direct-member Send rendered the exact response `DIRECT-AFTER-SAVE`; provider metadata recorded `gpt-5.4-mini` with `reasoning.effort=high`. Ordinary mounted-member Send rendered `MOUNTED-AFTER-SAVE`; metadata recorded `reasoning.effort=xhigh`. No direct GraphQL/store substitution was used.
- Evidence: `runtime-r4/save-success-ops.json`, `tree-before-save.json`, `tree-after-save.json`, `preservation-summary.json`, and the isolated provider metadata log.

## API-REV-002 / B03 — completed Pass
- Determinate pre-write failure used the real Save UI while only the isolated Org persistence directory/file were made read-only. The backend returned `PERSISTENCE_FAILED`; the UI reported not saved, canonical bytes stayed unchanged, the attempted root value remained editable, and Save remained enabled.
- After restoring the original `0755` directory and `0644` file modes, one further user click resubmitted once and persisted the attempted root value. No automatic replay occurred.
- Post-write response loss used the transparent owned proxy only to replace the already-successful mutation response with HTTP 503. The UI issued exactly one mutation, then exactly one authoritative `AgentOrgRunModelConfig` read, adopted the committed root value, and disabled Save. The mutation was not replayed.
- Unsupported malformed-scope and task-edit payloads are not ordinary user-reachable form states and were not manufactured with direct API calls; the current server/store owner suites cover validate-all, exact scope, task/kind, stale generation and write-once behavior.
- Evidence: `runtime-r4/prewrite-failure-ops.json`, `prewrite-original-modes.json`, `indeterminate-ops.json`, and before/after tree snapshots.

## API-REV-002 / B04 — completed Pass
- Resuming direct `/guide` through ordinary Send made the root active while mounted `/squad/lead` remained Offline. Opening Settings from that offline leaf rendered the same whole-Org form read-only; controls and Save were disabled with the enclosing-active explanation. The inspection added one bounded canonical read and no provider request.
- Actual Org header `+` opened a new-Org configuration route seeded from the latest canonical root/member values while the source root remained active; browser Back returned to the exact source run. Run was not clicked, so no new Org identity was allocated merely to inspect the seed.
- Adjacent standalone Agent control: actual catalog Run → ordinary `AGENT-CONTROL` Send → actual Stop → Settings. The stopped editor rendered stable saved native/low configuration with Save disabled until edit.
- Adjacent standalone Team control: actual catalog Run → ordinary `TEAM-CONTROL` Send → actual Stop → Settings. The stopped whole-Team editor rendered stable native/low configuration with Save disabled until edit. The Team and Agent runs had fresh isolated IDs and remained stopped.
- Task-bearing and stale-navigation adversarial guards remain owner-test evidence because the deterministic fixture has zero tasks and the normal UI does not expose cross-target/store injection; no acceptance credit was manufactured through API commands.
- Evidence: `runtime-r4/settings-transport-summary.json`, `preservation-summary.json`, provider metadata, and durable IR-003/reviewer owner suites.

## API-REV-002 / B05 — completed Pass
- Final persisted-tree comparison shows only the four intended `llmConfig.reasoning_effort` fields changed from the pre-Save tree. After failure/reconciliation and all continuation/control journeys, the post-Save canonical tree is byte-semantic identical to the final stopped tree.
- Root/direct/Team/mounted run IDs, addresses, definition IDs, runtime/model, workspace path, auto-execute, skill policy, handoff, empty task lists, application binding and all untouched fields remained unchanged.
- Actual direct conversation retained `DIRECT-BASELINE`, `DIRECT-AFTER-SAVE`, and `ACTIVE-GUARD`; mounted retained `MOUNTED-BASELINE` and `MOUNTED-AFTER-SAVE`. Direct and mounted Activity each rendered two available System Instructions events. The final UI showed root Stopped and both configured members Offline.
- The synthetic fixture intentionally contained no attachments or task executions. Attachment-object, draft, message and task-bearing retained-context preservation remains direct production adoption/owner-suite evidence; the earlier actual unsent-draft Stop check remains supporting evidence.
- Evidence: `runtime-r4/preservation-summary.json` and `tree-final-after-controls.json`.

## API-REV-002 / C01 — completed Pass
- The isolated Chrome tab was closed. Exact owned frontend/proxy/backend launch processes and children were terminated. Ports `51281`, `51282`, and `51283` were verified closed.
- Generated shared SDK `dist` directories were removed; no Electron package or bundled server resource existed. The isolated DB, logs, fixture and evidence were retained for audit. User server/profile/data were never touched.
- Canonical investigation, execution report, ledger and revision record were reconciled to **Pass / 95.0% validation confidence**. No repository durable API/E2E test was added, changed or removed by API/E2E; proportional test-code review is therefore requested as `Not Applicable` on the reviewed route.
- Evidence: `runtime-r4/cleanup.json`.
