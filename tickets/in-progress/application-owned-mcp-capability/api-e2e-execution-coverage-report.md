# API/E2E Execution Coverage Report

## Execution Round Meta

- API/E2E revision: `API-REV-004`
- Trigger: `/code_reviewer` `CRR-008`, after `SR-008` / `ARCH-REV-008` / `IR-005`
- Scope: renewed proof of `REQ-018`–`REQ-021`, `BEH-008`, and `AC-032`–`AC-039`
- Prior results: `API-REV-001 Pass / 97.2%` remains valid for `AC-001`–`AC-031`; `API-REV-002 Fail / 87.1%` and `API-REV-003 Fail / 88.6%` remain historical evidence for superseded role workflows
- Worktree: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability`
- Evidence root: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-004`
- Broader-validation decision: `Required and completed`
- Result: **Pass**
- Final validation confidence: **97.6%**

## Investigation And Coverage Decisions

The renewed investigation was recorded in `api-e2e-coverage-investigation.md` before any Round 4 durable edit or final execution. It classified the known optional Codex live integration as `Needs Update`: its prompt named downstream normalized `edit_file`, its helper selected a fallback/default model, its direct backend calls omitted the current `agentRunId`, and subsequent focused attempts exposed stale synthetic name, MCP-session authority, `memoryDir`, backend method, and `TOOL_LOG` assumptions. Each additional decision was recorded in the investigation before repair.

The one obsolete assertion required `TOOL_LOG` for a native file-change projection. Current canonical conversion emits segment start, normalized `TOOL_EXECUTION_STARTED(edit_file)`, `TOOL_EXECUTION_SUCCEEDED(edit_file)`, and segment end; it does not emit `TOOL_LOG`. That single assertion was classified `Stale / Remove`, with replacement coverage retained in the same live scenario and parser/converter unit suite.

No durable browser scenario was added. The supported browser journey requires a live authenticated model, imported application package, cross-member traces, Team communication store, application databases, and semantic DOM observation. A ticket-local executable probe is more proportional than committing a nondeterministic paid-provider browser fixture. All probe inputs and evidence are retained.

## Compatibility And Persisted-State Scope

- Legacy/compatibility outcome: current v5 application package and v7 backend-definition contracts only; historical v4/v6 inputs remain rejection fixtures and were not restored as valid.
- Persisted-data outcome: `Directly Usable — No Migration`. The current package was built, imported, catalog-registered, reloaded, configured, and launched through normal readers. No application data, binding identity, Agent/Team definition, global MCP configuration, or database schema was migrated or rewritten for the proof.
- Existing Round 1 provider/worker/Team/catalog-transition/concurrency/shutdown evidence remains authoritative for unchanged `AC-001`–`AC-031`. Round 4 additionally exercised a real catalog registration/reload while preparing the current browser journey.

## Durable Coverage Changed In Round 4

- Added files: none.
- Updated:
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`
- Removed files: none.
- Removed assertion: the obsolete file-change `TOOL_LOG` wait inside the updated integration file.
- Replacement evidence: exact-Luna native `item.type = fileChange`, normalized `edit_file` start/success/end, shared invocation identity, actual created-file contents, and canonical parser/converter unit coverage.

The updated optional suite now pins `gpt-5.6-luna` for the material case, tells Luna to use its built-in `apply_patch`, supplies current backend identity/memory and input/subscription contracts, and keeps normalized `edit_file` assertions verifier-owned. It does not expose `edit_file` to the model or change production provider/MCP/parser/converter source.

## Repository Coverage Execution

All commands ran from the assigned worktree; Vitest commands ran in `autobyteus-server-ts`.

| Check | Command / Mode | Result | Evidence |
| --- | --- | --- | --- |
| Focused handler/prompt/Codex conversion/publication matrix | `pnpm test --run` with 6 exact files | **Pass: 6 files / 97 tests** | `focused-repository-tests.log` |
| Current source-plus-built-package contract | `pnpm test --run tests/integration/application-backend/brief-studio-team-config.integration.test.ts` after package build | **Pass: 1 file / 4 tests** | `package-contract-integration.log` |
| SDK/devkit/Brief package | contracts, backend SDK, frontend SDK, devkit builds; Brief build, `typecheck:backend`, and validate | **Pass** | `package-build-validation.log` |
| Production server build | `pnpm build` | **Pass**, including sanitized built-in bootstrap smoke | `server-build.log` |
| Optional integration default gate | no `RUN_CODEX_E2E` | **Expected skip: 1 file / 10 tests**; compile/import succeeded | `optional-codex-integration-default-skip.log` |
| Exact live provider file-change case | `RUN_CODEX_E2E=1 CODEX_BACKEND_FLOW_TIMEOUT_MS=240000 CODEX_BACKEND_EVENT_TIMEOUT_MS=180000 pnpm test --run ... -t "converts raw Codex fileChange"` | **Pass: 1 passed / 9 skipped**, actual `gpt-5.6-luna` in 13.65 s | `optional-codex-live-exact-luna-attempt-6.log`; `codex-live-events/codex-backend-edit-file.json` |
| Evidence synthesis | `python3 .../synthesize-evidence.py` | **Pass: all 8 AC assertions true** | `evidence-synthesis.log`; `identity-trace-artifact-ui-join.json` |
| Diff hygiene | `git diff --check` | **Pass** before and after cleanup | command output recorded in this report |

Supplemental `pnpm typecheck` is not a ticket failure: it stops globally on the existing `tsconfig.json` contradiction that sets `rootDir: src` while including the entire `tests` tree, producing TS6059 for unchanged tests. The production build, package typecheck, Vitest transpilation, and actual updated live integration all pass. Full output is retained in `server-typecheck.log`; the repository-wide configuration issue was already known in API-REV-001.

## Post-Repository Confidence And Broader Gate

Repository evidence directly proved the handler/config/package/conversion/publication contracts and the real exact-Luna file-change conversion, but it could not prove the maintained model-backed Team, cross-member handoff, reconciliation, notification, or browser outcome. Post-repository confidence remained below the clean target at `88.0%`; broader validation was therefore **Required**. Selected mode: supported web-equivalent Brief Studio browser surface, not Electron, because no shell/preload/IPC source changed.

## Real Supported Brief Studio Browser Journey

### Environment Fidelity

- Fresh isolated data root: `.autobyteus/api-e2e-004`
- Production-built backend: `127.0.0.1:8015`
- Supported Nuxt frontend development path: `127.0.0.1:3015`
- Same-origin host/proxy used by the application iframe: `127.0.0.1:3016`
- Package imported through **Settings -> Application Packages**; applications enabled through **Settings -> Server Settings**; both role setup rows visibly selected `codex_app_server` / `gpt-5.6-luna`
- Browser actions only for the product journey: create/select brief, click **Generate draft**, observe automatic refresh. No direct MCP, backend launch call, mock, runtime/model switch, database mutation, shell fallback, or manual UI Refresh was used.
- Detailed steps: `browser-journey.md`

Initial import occurred while applications were disabled, so the catalog correctly held the application out of readiness. Restarting only the owned backend after enabling applications preserved package registration and loaded the normal launch setup. This was an environment sequencing observation and useful catalog-transition proof, not an implementation failure.

### Exact Identity Join

- Brief: `brief-2263879a-640f-4606-8e92-d01e53a18dd5`
- Title: `API E2E Luna Patch Proof 2026-08-27T21:31Z`
- Binding: `7afc3330-cff3-457a-b22b-948487a3b3be`
- Team run: `brief_studio_team_3fcc38699ad44130b20eb4149a19cdff`
- Researcher: `/researcher`, run `brief_studio_researcher_bef570119a744cd9a182403c0887fb7f`, provider session `01a04523-a49a-7120-818b-6f8fb03f24b2`
- Writer: `/writer`, run `brief_studio_writer_0985ae6e8c1943e89f3e4d6d4f3b0afc`, provider session `01a04524-4851-7db2-9a4d-2dbbf43a1fac`
- Both execution-tree launch configurations are exact `codex_app_server` / `gpt-5.6-luna` and use the application runtime workspace recorded in `team-run-execution-tree.json`.

### Researcher Chain

1. First tool call exactly once: `get_brief_context({})`, call `exec-828d4468-c376-4877-9bbe-9deab42cca9e`; success returned the selected `briefId`, title, `researching`, and `ATTACHED`.
2. Provider transcript records a built-in `tools.apply_patch` invocation and successful `patch_apply_end`; call `exec-72319685-3bad-4e41-ad8c-cdf99438f3ef` added `brief-studio/research.md`.
3. The independent AutoByteus trace records the same call ID as normalized `edit_file` start/success; the normalized patch equals the resulting file byte-for-byte.
4. `publish_artifacts` call `exec-35bcae80-1d0c-4175-88f0-71f2489e2b60` used exactly `brief-studio/research.md`; revision `cd1e4c77-351c-4b50-925c-cb16b5ea81b7` is joined to `/researcher`, its run, binding, and brief.
5. Team message `teammsg_dgNX5VpVi2vNRgMuTAIXLXMegqVp-w0U` delivered to the writer at `21:33:20.834Z`, containing the exact marker, canonical relative path, and complete 307-word body. Team-message serialization omits only the file's terminal newline; every body character is otherwise identical.

### Writer Chain

1. After the handoff, first tool call exactly once: `get_brief_context({})`, call `exec-d18e28ec-0e2f-44e5-a528-5f24fe3ffe43`; success returned the same brief/binding state.
2. Provider transcript records built-in `tools.apply_patch` and successful `patch_apply_end`; call `exec-78a17e6e-64a4-49df-b03d-3a8c9d95413d` added `brief-studio/final-brief.md`.
3. The independent AutoByteus trace records the same call ID as normalized `edit_file` start/success; the normalized patch equals the 323-word resulting file byte-for-byte.
4. The writer made no `read_file`; its `Key evidence` contains complete researcher bullets verbatim from the Team message.
5. `publish_artifacts` call `exec-f11a0a4d-ff2d-44b4-a57d-c0ff94727373` used exactly `brief-studio/final-brief.md`; revision `529c3ca8-3cf1-424d-aeda-3f642b44e8ef` is joined to `/writer`, its run, binding, and brief.

Neither role trace contains `run_bash`, `read_file`, or `write_file`. The role configs select only the three routed names. Provider-native patch evidence and normalized verifier traces were captured independently after execution; neither role received protocol or normalized-trace feedback. Codex's provider-internal code-mode `exec` envelope called `tools.apply_patch`; it is not an AutoByteus `run_bash` or registry file call.

### State And Browser Outcome

- A 20 ms read-only observer shows the launch moved the brief to `researching` before either context call.
- State remained `researching` across the researcher context read and its research publication. The writer context read also caused no business-state transition.
- Research publication projected one `/researcher` revision without moving to review.
- Final publication at `21:33:47.470Z` projected at `21:33:47.484Z` and existing reconciliation moved the same brief to `in_review`.
- Without clicking Refresh, the supported iframe rendered the same brief as **In_review**, **2** Draft outputs, and **1 final**, with Research and Final cards, both exact marker lines, both paths, and the verbatim writer evidence.
- `final-browser-observation.json` contains ten semantic DOM assertions, all true; `final-browser-in-review.png` is supporting visual evidence.

## Requirement / Scenario Matrix

| Acceptance criterion | Result | Direct evidence |
| --- | --- | --- |
| AC-032 researcher first context + native patch + normalized edit + relative publication | **Pass** | researcher provider session, raw trace, file, publication revision |
| AC-033 writer first context + handoff-only consumption + native patch + normalized edit + relative publication | **Pass** | writer provider session, raw trace, file, publication revision |
| AC-034 exact application/binding/member/run/tool/artifact joins | **Pass** | execution tree, platform/app DB dump, machine join |
| AC-035 supported same-brief UI `in_review` with researcher and exactly one final writer artifact | **Pass** | semantic browser observation and screenshot |
| AC-036 context is read-only; publication/reconciliation causes UI change | **Pass** | 20 ms DB transitions correlated to context/publication timestamps |
| AC-037 exact shipped Codex/Luna configs and provider/native-normalized separation | **Pass** | shipped snapshot, execution tree, exact-Luna live integration, provider transcripts, traces |
| AC-038 complete handoff, no read, verbatim evidence, exact relative paths/workspace projection | **Pass** | Team message, files, raw traces, revisions, machine join |
| AC-039 zero forbidden calls and truthful fail-closed policy | **Pass** | successful traces have zero forbidden calls; current prompt contracts plus API-REV-003 real fail-closed regression witness |

Machine-verifiable result: every AC assertion is `true` in `identity-trace-artifact-ui-join.json`.

## Validation Confidence Scorecard

| Category | Final Score | Evidence / Residual |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | Every AC-032–AC-039 behavior has direct repository plus executable evidence; failure-mode proof reuses the unchanged fail-closed owner from current contracts and API-REV-003 |
| Changed-boundary execution directness | 98% | Shipped instructions, actual Luna provider records, same-ID normalized traces, publications, reconciliation, and browser all ran |
| Cross-boundary integration realism and mock gap | 99% | Actual package, backend, model-backed Team, application databases, messages, notifications, and browser; no mock/direct MCP substitution |
| Environment, configuration, identity, and fixture fidelity | 98% | Exact model/runtime/tools and complete application/binding/member/run/tool/revision/browser identity join in a fresh root |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Real prior fail-closed runs, current contracts, exact live integration repair attempts, catalog reload, and API-REV-001 lifecycle matrix; provider nondeterminism remains inherent |
| User-surface, browser, and desktop-shell confidence | 99% | Direct supported host/iframe journey with automatic refresh and semantic DOM proof; shell-specific scope is inapplicable |
| Durable regression coverage quality and relevance | 96% | Strong deterministic source/package/unit coverage plus a gated exact real-provider integration; live browser proof remains ticket-local by design |

- Final overall confidence: `(98 + 98 + 99 + 98 + 95 + 99 + 96) / 7 = 97.6%`.
- No applicable category is below 90%; every critical criterion has direct evidence.
- Default clean target: **Met**.
- Final result: **Pass**.

## Residual Risks And Non-Failures

- External model behavior is nondeterministic. This run used the exact shipped model twice in the Team and once in the focused live integration; all material operations passed. The gated integration provides a repeatable diagnostic, not a promise of provider availability.
- The owned DB observer saw one transient SQLite `database is locked` read while the binding attached, then immediately resumed at 20 ms cadence. This is observer contention, not a product failure; all durable transitions and final projections were captured.
- Codex reported that system `bubblewrap` was absent and used its bundled copy. Both provider turns and patch operations completed; no sandbox or file-boundary failure occurred.
- The supplemental server `typecheck` rootDir/include defect is unrelated and pre-existing. Production build and all ticket-relevant TypeScript/Vitest execution passed.
- Electron shell execution was not performed because no shell-only behavior changed; the browser path is the supported web-equivalent surface.

## Evidence Index

| Artifact | Purpose |
| --- | --- |
| `identity-trace-artifact-ui-join.json` | Authoritative machine join and all eight AC assertions |
| `shipped-instruction-and-config-snapshot.json` | Exact maintained role/Team/launch/config inputs and hashes |
| `researcher-codex-native-session-events.json`; `writer-codex-native-session-events.json` | Sanitized provider-native built-in patch calls/results |
| `researcher-raw-trace.jsonl`; `writer-raw-trace.jsonl` | Actual ordered context/normalized edit/publication/message calls and results |
| `codex-live-events/codex-backend-edit-file.json` | Exact-Luna real app-server `item.type=fileChange` to normalized lifecycle proof |
| `team-run-execution-tree.json`; `team-communication-messages.json` | Exact runtime/model/member identity and complete handoff |
| `research.md`; `final-brief.md`; published-artifact JSON | Actual workspace outputs and snapshot identities |
| `final-db.json`; `db-state-transitions.jsonl` | Final app/platform rows and causal 20 ms observation |
| `final-browser-observation.json`; `final-browser-in-review.png` | Same-brief semantic and visual UI proof |
| `browser-journey.md`; `backend.log`; `frontend.log`; `same-origin-proxy.log` | Reproducible supported-surface setup and runtime logs |
| `durable-test-change.diff`; `sha256sums.txt` | Exact proportional-review diff and evidence-integrity manifest |
| repository/live command logs | Exact results and all stale-fixture attempts |

No bearer token, API secret, or generic process-wide application-tool payload log is retained.

## Cleanup

- Closed the owned browser tab.
- Stopped the owned backend, frontend, and same-origin proxy sessions; ports `8015`, `3015`, and `3016` were confirmed closed.
- Copied sanitized evidence, then removed only `.autobyteus/api-e2e-004` and generated Brief/SDK/devkit build outputs owned by this run.
- Preserved unrelated `.autobyteus/development`, other processes, and unrelated data.
- `git diff --check` passed after cleanup.

## Latest Authoritative Result

- Result: **Pass**.
- Confidence: **97.6%**.
- Broader validation: **Required and completed successfully**.
- Critical criteria: `AC-032`–`AC-039` all pass.
- Cumulative earlier scope: `API-REV-001 Pass / 97.2%` remains valid for `AC-001`–`AC-031`.
- Durable test change requires proportional review: **yes**; route cumulative package to `/code_reviewer` before delivery.
- Delivery remains paused at `DR-002` until that test-code review completes.
