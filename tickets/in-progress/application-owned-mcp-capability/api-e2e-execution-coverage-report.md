# API/E2E Execution Coverage Report

## Execution Round Meta

- API/E2E revision: `API-REV-005`
- Trigger: `/code_reviewer` `CRR-011`, after `SR-009` / `ARCH-REV-009` / `IR-006` / `IR-007`
- Scope: renewed current merged-state proof for `AC-032`–`AC-044`, especially deterministic tokenless activation, application-call-lane/session orthogonality, exact deactivation/shutdown, and the real shipped Brief Studio Codex/Luna browser journey
- Prior result: `API-REV-004 Pass / 97.6%` is retained pre-latest-base evidence only; it does not prove IR-006/IR-007
- Worktree: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability`
- Evidence root: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-005`
- Broader-validation decision: `Required and completed`
- Result: **Fail**
- Final validation confidence: **96.4%**
- Blocking criterion: **AC-039**

High confidence describes the strength and directness of the observed result. It does not turn a critical acceptance-criterion failure into a pass.

## Coverage Investigation And Durable Decisions

The renewed investigation was updated before every Round 5 durable edit.

1. `agent-package-private-skills.e2e.test.ts` was `Needs Update`: its private-skill scenario remained valid, while its deleted `AgentToolMcpSessionIssuer`, bearer header descriptor, and old constructor position were stale. The fixture now injects the current `AgentToolMcpRunSessionActivator` returning `{ kind: "not_exposed" }`; the behavior assertions remain.
2. The latest-base merge had reverted the previously reviewed optional Codex live fixture. After a pre-inference failure proved missing `agentRunId`, the investigation classified current `agentRunId`, `memoryDir`, batch subscription/input, exact Luna model, test-owned current scoped authority, and synthetic name repairs as `Needs Update`. The obsolete `TOOL_LOG` wait was `Stale / Remove`, replaced by the current segment/edit lifecycle and actual file content.
3. `brief-studio-agent-tool-mcp.integration.test.ts` behavior already used the current headerless route; only the misleading “authenticated MCP” title was `Needs Update` to “tokenless MCP”.
4. No durable browser test was added. The exact model-backed Team, access-controlled traces, application databases, publications, notification, and iframe semantic join remain proportional ticket-local executable evidence.

## Durable Coverage Changed

- Added test files: none.
- Removed test files: none.
- Updated:
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`
  - `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/autobyteus-server-ts/tests/integration/application-backend/brief-studio-agent-tool-mcp.integration.test.ts`
- Production source changed by API/E2E: none.

Because repository-resident durable coverage changed, the cumulative package requires proportional `/code_reviewer` review regardless of the execution failure.

## Repository And Process-Boundary Execution

All commands ran from the assigned worktree; Vitest commands ran in `autobyteus-server-ts`.

| Check | Result | Direct evidence |
| --- | --- | --- |
| Flagged package-private-skills E2E after current-contract fixture repair | **Pass: 1 file / 4 tests** | `stale-fixture-current-contract.log` |
| Current host/session/provider/application/Team/lifecycle/architecture matrix | **Pass: 21 files / 178 tests** | `current-lifecycle-topology-matrix.log` |
| Brief handler/source/package/real child MCP/import/reconciliation/publication matrix | **Pass: 10 files / 44 tests** | `brief-package-publication-matrix.log` |
| Frontend SDK + devkit build; Brief backend typecheck, pack, validate; production server build and sanitized bootstrap | **Pass** | `package-and-server-build.log` |
| Optional Codex file default gate after repair | **Expected skip: 10 tests; compile/import passed** | `codex-live-default-gate-after-repair.log` |
| Exact live provider material case, actual `gpt-5.6-luna` | **Pass: 1 / 9 skipped**; real provider `fileChange` normalized to `edit_file` and created expected file | `codex-live-exact-luna-after-repair.log`; `codex-live-events/codex-backend-edit-file.json` |
| Optional `open_tab` model-choice diagnostic | **Diagnostic failed:** Luna chose built-in `search_web`, not requested routed `open_tab`, then idled | `codex-live-tokenless-open-tab.log` |
| Machine synthesis of authoritative clean browser run | **Fail: 7 assertions true, AC-039 false** | `clean-evidence-synthesis.log`; `clean-identity-trace-artifact-ui-join.json` |

The optional `open_tab` case is not used as application-MCP or ticket failure evidence. It demonstrates external model nondeterminism in an unrelated optional route-selection prompt. The actual Brief Studio model-backed application path below is authoritative.

### AC-040–AC-044 Current Lifecycle Result

The 21-file matrix passed the current latest-base topology:

- one dedicated loopback `AgentToolsMcpHost` listener and deterministic run-derived session path;
- tokenless/headerless descriptors and active-record-only routing;
- stopped route inactive, byte-identical URL on restore, fresh live exposure/capability/current declaration fingerprints;
- explicit general `applicationAgentTools: null` and application non-null capability reaching provider create/execution scope completion;
- exact-application route isolation and unchanged AutoByteus-local versus Claude/Codex-session projection ownership;
- application lane quiesce rejects new application calls and drains admitted work while non-application `ping` remains live;
- unchanged reentry resumes current code, while changed/removed declarations fail currentness;
- package transition never deactivates the containing provider session;
- exact Agent/Team member stop and scope close deactivate current records once;
- shutdown drains calls, stops application/run/session owners, closes capability and listener, and is idempotent.

Result: **AC-040–AC-044 pass**.

## Real Supported Brief Studio Browser Journey

### Environment And User Path

- Fresh owned data root: `.autobyteus/api-e2e-005`
- Production-built server: `127.0.0.1:8015`
- Nuxt supported web-equivalent surface: `127.0.0.1:3015`
- Same-origin application host/proxy: `127.0.0.1:3016`
- Current built package imported through **Settings -> Application Packages**
- Normal post-import restart performed; catalog setup loaded the exact package default for both members
- Setup visibly showed `/researcher` and `/writer` as `codex_app_server` / `gpt-5.6-luna`; setup saved through the host UI
- Application entered through the supported Applications catalog
- Browser created a fresh brief, selected it, and clicked **Generate draft**
- No direct MCP, mocked decision, model/runtime switch, backend launch substitute, manual database write, or manual UI Refresh was used

An initial frontend launch used its default port-8000 API endpoint and reached an unrelated older local server. That attempt was detected because the visible workspaces and manifest rejection disagreed with the isolated backend. The frontend was restarted with every HTTP/WS endpoint bound to `3016`; the authoritative import, setup, application launch, both browser runs, and all retained clean evidence occurred only after correction.

### Authoritative Clean Identity Join

- Brief: `brief-6e01ee36-3707-416c-9270-9a8e9f8e8838`
- Title: `API REV 005 CLEAN PRODUCTION PROOF 2026-08-28 11:53 UTC`
- Binding: `e6aa7750-a3e7-4741-b468-8c8fef5a7b23`
- Team run: `brief_studio_team_4c9fad8bea574281bf65a7c35cfad92a`
- Researcher: `/researcher`, run `brief_studio_researcher_e85b68996cc9463ea0208cb15548d71f`, provider session `01a04838-3d52-7353-bb81-b11e20c03e7b`
- Writer: `/writer`, run `brief_studio_writer_c9494bbaeecc49229efe7e52ac7f132e`, provider session `01a04838-cc03-75e0-96b2-933cd33e5c9b`
- Both execution-tree member configurations: exact `codex_app_server` / `gpt-5.6-luna`
- Both role configs: exactly `get_brief_context`, `publish_artifacts`, `send_message_to`; no selected file or shell registry tool

### What Passed In The Actual Application Path

#### Researcher

1. First recorded AutoByteus tool call is exactly one `get_brief_context({})`, call `exec-1fec777b-1490-4f58-b6bc-b9b6cdf19fa5`.
2. The paired successful result contains the selected brief ID/title, status `not_started`, binding status `ATTACHED`, and binding-derived update time.
3. The resulting `research.md` begins with the exact compact marker derived from that result and contains a 300-word body.
4. `publish_artifacts` call `exec-fefbc6fa-9b30-4e01-942c-b9956ac3bf61` passes exactly `brief-studio/research.md`; revision `034f9046-aa1a-453f-b208-fd68c13c9bf8` joins the exact researcher run, `/researcher`, binding, and brief.
5. Team message `teammsg_s_Te__-J0vTe0YjYra7tjI9-0nIkU54O` contains the exact marker, relative path, and complete research body byte-for-byte apart from the file's terminal newline.

#### Writer

1. After that handoff, first recorded AutoByteus tool call is exactly one `get_brief_context({})`, call `exec-e32cfb48-15b4-4d68-be66-b99ebc3076fd`.
2. Its successful result contains the same brief and status `researching` after the research publication.
3. No `read_file` or cross-member file access occurs. The final `Key evidence` copies the first complete researcher finding verbatim.
4. `publish_artifacts` call `exec-f150cb03-3c79-4e9e-9f4a-82526667c458` passes exactly `brief-studio/final-brief.md`; revision `5004a302-335b-407b-99a1-6b3080869629` joins the exact writer run, `/writer`, binding, and brief.
5. The writer sends the exact current marker/path and truthful publication completion back to `/researcher`.

#### Business State And UI

- Before launch the fresh business row is `not_started` with no binding or artifact.
- The researcher context result still observes `not_started`; the read itself creates no artifact or review state.
- Research publication creates only the researcher revision and moves the normal workflow to `researching`.
- Writer context observes `researching`; the read creates no final revision or review state.
- Final publication projects the writer revision and existing reconciliation moves the same brief to `in_review`.
- Without clicking Refresh, the supported iframe displays the exact brief as **In_review**, **2** Draft outputs, **1 final**, Research and Final cards, both absolute projected paths, both exact markers, and the verbatim finding.
- Ten semantic browser assertions pass in `clean-final-browser-observation.json`. The visible summary is captured in `clean-final-browser-in-review-summary.png`.

Result: **AC-032–AC-038 pass**. This also proves that the application-level MCP capability is real and production-reachable: both actual configured members called `get_brief_context`, received the correct binding-derived application state, and used it through publication/reconciliation into the browser UI.

## Critical Failure: AC-039

The clean run's normal artifacts were shell-created, which the approved contract explicitly disqualifies.

| Member | AutoByteus normalized evidence | Provider-native evidence | Outcome |
| --- | --- | --- | --- |
| Researcher | `run_bash`, `exec-1520ef2c-dee7-4fe7-8544-58cc04e2561e` | code-mode `tools.exec_command` with `mkdir` and heredoc; no patch/file-change event | Created normal `brief-studio/research.md` through shell |
| Writer | `run_bash`, `exec-f4bcd9ea-2a42-4054-b837-f18247e028af` | code-mode `tools.exec_command` with `mkdir` and heredoc; no patch/file-change event | Created normal `brief-studio/final-brief.md` through shell |

This is not inferred from model prose. The access-controlled normalized traces and independently retained provider sessions both prove it. Neither role inspected provider protocol or normalized traces; the shell was the model's automatically supplied foundation choice.

A separate first browser run had a test-harness-only SQLite lock because the 20 ms observer opened the application database with `timeout=0`. That run is retained under `failed-observer-shell-run` but is rejected as causal business-state evidence. It is still a corroborating operation-selection observation: both of its actual members also used `run_bash`. The second authoritative run used no observer at all and reproduced shell selection for both members.

Current source meets the SR-009 wording rule: the role, Team, and launch text is business-focused and contains none of `apply_patch`, `edit_file`, `read_file`, `write_file`, or `run_bash`. The exact shipped model nevertheless selected its ordinary shell foundation for all four observed member executions. API/E2E cannot hide that result, reinterpret shell-created files as provider-native edits, or substitute the passing focused provider diagnostic for the shipped application behavior.

Preliminary origin: **implementation / requirement-design interaction**. The accepted operation-neutral prompt constraint and automatic availability of shell do not reliably produce the required zero-shell behavior with the shipped Luna model. Formal origin belongs to `/code_reviewer`; resolving it without forbidden provider vocabulary may require `/solution_designer` reconciliation.

## Requirement / Scenario Matrix

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| AC-032 researcher first context, marker, artifact, relative publication, complete handoff | **Pass** | clean researcher trace/file/publication/message/join |
| AC-033 writer first context, handoff-only use, marker, relative publication | **Pass** | clean writer trace/file/publication/join |
| AC-034 exact application/binding/member/run/tool/revision join; no secret | **Pass** | execution tree, app/platform DB, machine join |
| AC-035 supported same-brief `in_review`, two outputs, exactly one final | **Pass** | semantic browser record and visible screenshot |
| AC-036 read alone causes no business/UI mutation; publication reconciles | **Pass** | clean before snapshot, call/result times, revision/projection/final UI |
| AC-037 shipped Codex/Luna configs, operation-agnostic business prompts, no selected file/shell tool | **Pass** | source/package snapshot, execution tree, configs |
| AC-038 exact complete handoff, no cross-read, verbatim use, exact relative publications | **Pass** | Team message, files, traces, revisions |
| AC-039 zero shell / ordinary file calls for normal artifacts | **Fail** | two clean normalized `run_bash` calls and two provider `tools.exec_command` invocations |
| AC-040 deterministic tokenless/headerless dedicated listener | **Pass** | current lifecycle/topology matrix |
| AC-041 same URL, inactive stop, fresh current restore | **Pass** | current lifecycle/topology matrix |
| AC-042 general-null/application-only capability disposition | **Pass** | current lifecycle/topology matrix and IR-007 fixture execution |
| AC-043 application-lane drain while run session remains live | **Pass** | real SDK application route integration in current matrix |
| AC-044 exact deactivation and shutdown ownership/order | **Pass** | Team/resource/platform/Studio/standalone lifecycle matrix |

Authoritative machine result: seven Brief assertions true and `AC-039` false in `clean-identity-trace-artifact-ui-join.json`.

## Validation Confidence Scorecard

| Category | Score | Evidence / residual |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 85% | All renewed criteria except critical AC-039 have direct passing evidence; AC-039 has direct failing evidence |
| Changed-boundary execution directness | 99% | Current merged host/session/provider/application/Team/browser paths executed |
| Cross-boundary integration realism and mock gap | 99% | Actual package, provider, worker, Team, publication, databases, notification, browser |
| Environment, configuration, identity, and fixture fidelity | 98% | Fresh owned root, exact shipped configs/model, complete identity joins; corrected frontend endpoint before authoritative execution |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Current stop/restore/quiesce/deactivation/shutdown matrix plus independently repeated shell selection |
| User-surface, browser, and desktop-shell confidence | 99% | Supported host/iframe semantic and visual proof; Electron-only behavior is not in scope |
| Durable regression coverage quality and relevance | 97% | Current fixture/live-provider repairs and deterministic lifecycle/package matrices; browser remains ticket-local by design |

- Overall: `(85 + 99 + 99 + 98 + 98 + 99 + 97) / 7 = 96.4%` rounded.
- Clean-target status: **Not met**; requirement category is below 90% and AC-039 is critical.
- Final result: **Fail**.

## Evidence Index

| Artifact | Purpose |
| --- | --- |
| `clean-identity-trace-artifact-ui-join.json` | Authoritative machine join and AC-032–AC-039 booleans |
| `clean-shipped-instruction-and-config-snapshot.json` | Exact operation-agnostic role/Team/launch/config snapshot with hashes |
| `clean-researcher-raw-trace.jsonl`; `clean-writer-raw-trace.jsonl` | Ordered paired context, forbidden shell, publication, and message evidence |
| `clean-researcher-codex-native-session-events.json`; `clean-writer-codex-native-session-events.json` | Sanitized provider code-mode operations proving `tools.exec_command` and absence of patch/file-change |
| `clean-team-run-execution-tree.json`; `clean-team-communication-messages.json` | Exact runtime/model/member identities and complete handoff |
| `clean-research.md`; `clean-final-brief.md`; clean published-artifact JSON | Actual normal business outputs and publication identities |
| `clean-before-launch-db.json`; `clean-final-db.json` | Clean business/platform binding/member/revision/event join |
| `clean-final-browser-observation.json`; `clean-final-browser-in-review-summary.png` | Same-brief semantic and visible UI proof |
| `failed-observer-shell-run/` | Rejected first-run business-state evidence; retained harness-failure and repeated shell-selection witness |
| repository/build/live command logs | Exact current test/build/provider results |
| `backend.log`; `frontend.log`; `proxy.log`; `same-origin-proxy.mjs` | Fresh supported-stack execution logs and topology |

No bearer token, session secret, API credential, or new generic application-tool payload log is retained.

## Cleanup And Routing

Cleanup completed. The owned browser tab was closed; the owned backend, frontend, and same-origin proxy were stopped; ports `8015`, `3015`, and `3016` were verified closed; and only the isolated `.autobyteus/api-e2e-005`, its unique `api-e2e-005.db`, and generated Brief/SDK/devkit build outputs were removed. Unrelated processes and data were left untouched. The retained evidence contains the service logs, and final `git diff --check` passed.

Latest authoritative result:

- Result: **Fail**.
- Confidence: **96.4%**.
- `AC-032`–`AC-038`, `AC-040`–`AC-044`: pass.
- `AC-039`: fail because both clean shipped members shell-created their normal artifacts.
- Application-owned `get_brief_context`: **production-reachable and working**.
- Delivery: remains paused after `DR-004`.
- Required next route: cumulative package to `/code_reviewer` for formal failure-origin decision and proportional durable-test review.
