# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-spec.md`
- Supplemental Task Artifacts: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/application-owned-mcp-intended-behavior.md`
- Solution Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/solution-revision-record.md`
- Design Review Report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/design-review-report.md`
- Architecture Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/architecture-review-revision-record.md`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/implementation-revision-record.md`
- Code Review Report: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-report.md`
- Code Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/delivery-revision-record.md`
- Relevant Delivery Revision IDs: `DR-002`
- API/E2E Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-004` (completed)
- Current Investigation Round: `4`
- Trigger: `/code_reviewer` `CRR-008` renewed implementation-source pass after `SR-008` / `ARCH-REV-008` / `IR-005` separated Luna built-in `apply_patch`, Codex native `fileChange`, and AutoByteus normalized `edit_file`. Delivery remains paused at `DR-002` pending real shipped Codex/Luna and supported-browser proof for `AC-032`–`AC-039`.
- Prior Investigation Reviewed: Round 1 / `API-REV-001` (`Pass`, `97.2%`, retained for `BEH-001`–`BEH-007` / `AC-001`–`AC-031`), Round 2 / `API-REV-002` (`Fail`, `87.1%`, historical evidence for the superseded ordinary-file workflow), and Round 3 / `API-REV-003` (`Fail`, `88.6%`, historical evidence that normalized `edit_file` was not a viable model-facing instruction).
- Latest Authoritative Investigation: `Round 4 completed — Pass / 97.6%; broader validation required and completed`

## Round 4 SR-008 Renewal (Current Authority)

This renewal was written after reading the complete `SR-008` / `ARCH-REV-008` / `IR-005` / `CRR-008` package and **before** any Round 4 durable coverage edit or final repository/live-provider/browser execution. `API-REV-003` remains a high-directness regression witness for the production-reachable path and the superseded model-facing wording. It is not proof that IR-005 succeeds.

### Approved Behavior To Prove

- Use the shipped researcher and writer configurations exactly: `codex_app_server` / `gpt-5.6-luna`, with routed names only `get_brief_context`, `publish_artifacts`, and `send_message_to`. The configs must omit `read_file`, `write_file`, `apply_patch`, `edit_file`, and `run_bash`.
- Drive the supported Brief Studio browser **Generate draft** journey. Each real configured member must call `get_brief_context({})` exactly once at its lifecycle-correct first-tool point and use the returned same-brief marker.
- The maintained role instruction must name Luna's built-in `apply_patch`, and the real provider must report patch success. Independent verifier evidence—not role feedback—must join a Codex native `item/fileChange` / `file_change` event to the corresponding AutoByteus normalized `edit_file` lifecycle under the same member `agentRunId`.
- Both successful member traces must contain zero `run_bash`, `read_file`, and `write_file` calls. Roles must not request, inspect, or receive provider protocol or internal normalized trace evidence.
- Researcher must create `brief-studio/research.md` in its exact member workspace, keep its marker on line one, publish that exact relative path, and hand `/writer` the exact marker, relative path, and complete 200–500-word body. Writer must consume the handoff without a file read, copy one complete non-marker `Key findings` bullet verbatim under `Key evidence`, create `brief-studio/final-brief.md` in its own workspace, and publish that exact relative path.
- Join the exact application, binding, canonical member, `agentRunId`, `toolCallId`, `briefId`, member-workspace file, publication/revision, Team message, reconciliation, notification, and DOM identities. A context read alone must not mutate Brief business/UI state; only normal publication/reconciliation may move the same brief to `in_review` and render researcher plus exactly one final writer artifact with the writer marker.
- Missing/mismatched context, patch, publication, or complete handoff remains fail closed. No direct MCP, mock, runtime/model switch, shell fallback, fabricated artifact, or trace-driven role control flow can substitute for the required proof.

### Round 4 Changed Surfaces And Evidence Plan

| Surface / Boundary | Classification | Existing Evidence | Remaining Critical Gap | Planned Direct Evidence |
| --- | --- | --- | --- | --- |
| Shipped role/Team/launch wording | Changed by IR-005 | CRR-008 focused source/package contracts | Static wording cannot prove actual Luna behavior | Rerun current source/package checks; retain exact shipped inputs and real per-member outcomes |
| Codex native patch and AutoByteus normalization | Reused provider/platform boundary; instruction corrected | Current parser/converter tests plus SR-008 diagnostic | No IR-005 configured-Team native/normalized pair | Correct and execute the optional exact-Luna live integration, then capture both evidence layers in the browser Team run |
| Optional live Codex backend integration | Stale durable coverage setup | Gated real transport test exists | Model prompt says `edit_file`; model selection is default/non-exact; direct factory calls omit required `agentRunId` | Narrow durable repair after the classification below; run real `gpt-5.6-luna`, built-in `apply_patch`, and current factory identity |
| Context, Team handoff, relative publication, reconciliation | Preserved owners with changed successful provider prerequisite | Handler, publication, reconciliation, and prompt/package suites | No successful IR-005 full cross-member join | Observe actual calls/messages/workspaces/files/publications/revisions/state transitions |
| Supported browser / web-equivalent renderer | Required existing surface | Two API-REV-003 failure runs prove reachability | No successful IR-005 same-brief outcome | Repeat supported browser journey in a fresh isolated stack and retain semantic DOM plus screenshots |
| Desktop shell | Out Of Scope | No shell-only source changed | None if browser path passes | Do not start Electron; browser exercises the supported equivalent renderer path |

### Durable Coverage Validity Classification Before Round 4 Edits

| Path / Scenario | Current Assertion | Decision | Round 4 Action |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/application-backend/brief-agent-tool.test.ts` | Binding-derived exact marker and read-only behavior | `Still Valid` | Retain and rerun; direct handler evidence does not replace model/browser proof. |
| `autobyteus-server-ts/tests/unit/application-backend/brief-studio-agent-prompt-contract.test.ts` | Exact Codex/Luna config, model-facing built-in `apply_patch`, forbidden vocabulary/operations, relative publication, complete handoff, no-read/verbatim writer use | `Still Valid` after IR-005 | Retain and rerun unchanged. |
| `autobyteus-server-ts/tests/integration/application-backend/brief-studio-team-config.integration.test.ts` | Source and generated package retain the current role/config/Team/launch contract | `Still Valid` after IR-005 | The prior SR-006 and SR-007 expectations are stale historical states and must not be restored. Build the package and rerun current expectations unchanged. |
| Codex parser/converter file-change unit scenarios | Native `fileChange` / `file_change` becomes normalized `edit_file` lifecycle evidence | `Still Valid` | Retain and rerun. These tests prove the normalization contract, not that Luna creates a file in the real Team run. |
| `codex-agent-run-backend-factory.integration.test.ts` general gated live scenarios | Optional actual app-server transport coverage | `Needs Update` for current backend factory identity | Every direct `createBackend` invocation must supply its already-declared run ID; manager-owned creation already supplies it. Preserve the optional real-transport suite rather than remove it. |
| Same file, `converts raw Codex fileChange...` scenario | Model is told to use `edit_file`; helper picks a preferred/default model; only normalized events and file output are asserted | `Needs Update`, not `Stale / Remove` | This is the closest durable real-provider boundary for AC-032/AC-033/AC-037. Change only the model-facing prompt to Luna built-in `apply_patch`, require exact available `gpt-5.6-luna`, keep normalized `edit_file` assertions as verifier-owned evidence, preserve no-shell wording, and record real provider output. Do not feed normalized trace names back to the model. |
| API-REV-003 traces/screenshots | Actual configured Team reaches context then fails on model-facing `edit_file` | `Still Valid — Historical Regression Witness` | Preserve unchanged; never count it as IR-005 success. |
| Prior v4 manifest / v6 backend-definition fixtures | Retired versions are rejection-only while current package uses v5/v7 | `Still Valid` as previously corrected | No schema change in IR-005. Do not restore v4/v6 as valid; rebuild and validate current v5/v7 output only. |

The known optional live integration problems are coverage staleness, not a production defect: its model prompt contradicts SR-008, its generic model fallback cannot prove the shipped Luna model, and its direct factory calls predate the required `agentRunId`. Removal would discard the only repository-resident actual app-server file-change integration, while leaving it unchanged would produce misleading or dead evidence. A narrow update is therefore approved. It remains supplemental and cannot replace the mandatory browser journey.

No durable browser test is approved before this rerun. The authenticated, stateful Team journey requires access-controlled trace/communication/database/artifact joins not exposed by the repository's stable browser fixtures. Round 4 will use a ticket-local temporary executable browser/probe harness and retain sanitized evidence. If runtime execution exposes a deterministic missing repository contract, this investigation must be updated before any further durable edit.

### Round 4 Execution Gate And Initial Confidence

| Confidence Category | Initial Score | Basis / Gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 75% | Current source contracts cover AC-032–AC-039, but no IR-005 real-provider success exists |
| Changed-boundary execution directness | 75% | Instruction source is direct; actual member patch/publication behavior remains unexecuted |
| Cross-boundary integration realism and mock gap | 50% | The corrected instruction -> provider -> normalized event -> Team -> UI chain has not run |
| Environment, configuration, identity, and fixture fidelity | 75% | Exact shipped config is known and prior auth/reachability passed; fresh exact-Luna execution is absent |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Fail-closed and platform lifecycle evidence is strong; current happy path is open |
| User-surface, browser, and desktop-shell confidence | 50% | No successful Round 4 browser result; desktop shell is inapplicable |
| Durable regression coverage quality and relevance | 75% | Current source/package tests are strong, but the gated real-provider test is stale until repaired |

- Overall initial Round 4 confidence: `70.0%` (simple average of seven applicable categories).
- Broader validation decision: `Required`.
- Approved repository-resident durable changes: narrow update to `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` as classified above.
- Execution order: implement the classified durable repair; run focused current source/package/parser/converter/publication coverage; run the corrected optional real app-server integration with exact Luna and retained event logs; build/validate Brief Studio; start a fresh isolated full stack; repeat the supported browser journey while observing state; retain sanitized instruction/native/normalized/identity/message/workspace/publication/reconciliation/DOM evidence; clean only owned resources; update the canonical reports and append `API-REV-004`.

### Round 4 Investigation Amendment After First Live Attempt

The first focused `RUN_CODEX_E2E=1` attempt reached current `CodexAgentRunBackendFactory.createBackend(config, agentRunId)` with the repaired identity but stopped before model execution because the optional test fixture's synthetic Agent definition omitted the now-required non-blank `name`. The exact failure was `Agent definition name must be non-blank` from the shared Carpenter prompt composer. This is additional stale durable fixture setup, not an IR-005 production failure: application-imported Agent definitions carry names, while this test constructs the definition inline. Classification: `Needs Update`. Approved narrow repair: add a fixed non-blank `name` to the synthetic definition returned by `createFactory`; do not change production prompt composition or weaken the requirement.

The second focused attempt passed that boundary and exposed one further stale direct-backend fixture assumption: the current bootstrap always asks an Agent Tools MCP session authority to resolve exposure, even when the resolved tool set is empty, while this isolated integration called the unassembled process-global issuer. It failed with `Agent Tools MCP session issuance is unavailable for this scope` before thread/model execution. Production application/general execution scopes assemble a real scoped authority; this isolated no-routed-tool case does not. Classification: `Needs Update`. Approved narrow repair: for `createFactory` scenarios with no configured routed tools, provide an explicit local `AgentToolMcpSessionService` with a no-op publication capability, `applicationAgentTools: null`, and an inert base URL; the empty exposure yields no MCP app-server config, so no fake tool call or server is introduced. Retain the existing real issuer for scenarios that intentionally test routed Agent Tools. Then repeat the exact-Luna case. Both setup failures are retained and are not counted as provider evidence.

The third attempt passed prompt composition and empty-exposure issuance, then stopped before model execution because current system-instruction capture requires every directly constructed run to have a non-empty `memoryDir`; the old direct test configs omit it. Production run creation supplies member/general run memory. Classification: `Needs Update`. Approved narrow repair: give each direct optional live backend config its deterministic temporary-workspace memory directory, `path.join(workspaceRoot, ".memory", runId)`. The manager-owned publication scenario already supplies one and remains unchanged. This preserves current memory capture rather than bypassing it.

The fourth attempt successfully created a current backend and thread, then exposed that the optional direct-backend scenarios still use the retired high-level `AgentRun` methods `subscribeToEvents` and `postUserMessage` on the lower-level backend. The current backend contract is batch-oriented `subscribeToSourceEventBatches` plus `dispatchUserInput({kind: "start_turn", message})`; the manager-owned publication scenario correctly retains the high-level methods. Classification: `Needs Update` across the direct scenarios. Approved narrow repair: flatten source-event batches into the existing event array, dispatch the same user messages through the current backend input contract, and assert `forwarded`; do not add a compatibility wrapper or modify production. This is coverage maintenance for the current API, not proof or failure of IR-005.

The fifth attempt reached the actual `gpt-5.6-luna` turn and succeeded at the material operation: the model used built-in patching, the workspace file was written, and the current converter emitted `SEGMENT_START(edit_file)`, `TOOL_EXECUTION_STARTED(edit_file)`, `TOOL_EXECUTION_SUCCEEDED(edit_file)`, and the matching segment end. The test nevertheless timed out because its old assertion additionally required a `TOOL_LOG` event. Current canonical converter unit coverage explicitly defines file-change start as segment-start plus execution-started and completion as execution-succeeded plus segment-end; no `TOOL_LOG` is part of this native file-change projection. Classification: `Stale / Remove` for that one obsolete assertion, with direct replacement evidence already present in the same scenario and canonical unit tests. Remove only the `TOOL_LOG` wait; retain exact-Luna, normalized start/success/end, path metadata, invocation identity, idle completion, and real file-content assertions. The attempt is retained as successful provider-operation evidence but not a passing durable command.


### Round 4 Repository Gate Result

- Classified durable update completed at `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`; no durable file was added or removed. The stale `TOOL_LOG` wait was removed only after the recorded amendment, with canonical file-change lifecycle assertions retained.
- Focused current behavior matrix passed `6 files / 97 tests`: read-only handler/marker, exact role contract, Codex payload parsing/conversion, publication path identity, and publication snapshot service.
- Current source-plus-built-package Team contract passed `1 file / 4 tests` after current Brief build. SDK contracts, backend/frontend SDKs, devkit, Brief package build, Brief backend typecheck, package validation, and production server build all passed.
- The optional live integration compiled under its default gate (`10 skipped`) and, with `RUN_CODEX_E2E=1`, the exact material case passed against actual `gpt-5.6-luna` (`1 passed / 9 skipped`). Its event log contains native `item.type = fileChange`, shared invocation identity, normalized `edit_file` start/success/end, exact model telemetry, and real file contents.
- Supplemental server `pnpm typecheck` remains blocked globally by the pre-existing `rootDir: src` plus `include: tests` TS6059 configuration. Production build, the package typecheck, Vitest transformation, and the updated real-provider test pass, so this is not a ticket behavior failure.
- Post-repository confidence was `88.0%`: strong direct provider/converter proof remained insufficient for Team handoff, reconciliation, notification, and browser outcome. Broader validation remained `Required`.

### Round 4 Actual Configured Team And Browser Result

The supported browser journey completed successfully in a fresh isolated stack. The package was imported and configured through the host UI; both runtime setup rows and the resulting execution tree are exact `codex_app_server` / `gpt-5.6-luna`. The actual configured Team used one selected brief, one binding, and the normal application runtime workspace. No direct MCP, mock, database mutation, runtime/model switch, shell fallback, or manual Refresh substituted for the path.

- Brief `brief-2263879a-640f-4606-8e92-d01e53a18dd5` launched binding `7afc3330-cff3-457a-b22b-948487a3b3be` and Team run `brief_studio_team_3fcc38699ad44130b20eb4149a19cdff`.
- `/researcher` run `brief_studio_researcher_bef570119a744cd9a182403c0887fb7f` called paired `get_brief_context({})` exactly once as its first tool action. Provider session `01a04523-a49a-7120-818b-6f8fb03f24b2` records built-in `tools.apply_patch` and successful `patch_apply_end`; call `exec-72319685-3bad-4e41-ad8c-cdf99438f3ef` is the same normalized `edit_file` call ID. It published exactly `brief-studio/research.md` as revision `cd1e4c77-351c-4b50-925c-cb16b5ea81b7`.
- The one Team message contains the exact marker, exact relative path, and complete 307-word research body. Message serialization drops only the source file's terminal newline; no body content is omitted or changed.
- `/writer` run `brief_studio_writer_0985ae6e8c1943e89f3e4d6d4f3b0afc` called paired context exactly once first after the handoff. Provider session `01a04524-4851-7db2-9a4d-2dbbf43a1fac` records built-in patch success; call `exec-78a17e6e-64a4-49df-b03d-3a8c9d95413d` is the same normalized `edit_file` call ID. With zero file read it used the handoff, retained complete findings verbatim, and published exactly `brief-studio/final-brief.md` as revision `529c3ca8-3cf1-424d-aeda-3f642b44e8ef`.
- Both successful traces contain zero `run_bash`, `read_file`, and `write_file`. Neither role received provider-protocol or normalized-trace feedback. The independent provider transcripts and AutoByteus traces are joined only as verifier evidence.
- A 20 ms database observer proves context reads caused no business transition. Research publication left the brief `researching`; final publication projected through existing reconciliation and moved the same brief to `in_review`.
- Without manual Refresh, the supported iframe rendered the same brief `In_review`, two draft outputs, exactly one final, both role artifacts/paths/markers/bodies, and a complete research finding in writer `Key evidence`. All ten semantic DOM assertions pass.
- The machine join `api-e2e-evidence/api-rev-004/identity-trace-artifact-ui-join.json` reports `PASS` and every AC-032–AC-039 assertion `true`.

### Round 4 Final Confidence And Decision

| Confidence Category | Final Score | Direct Basis / Residual |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | AC-032–AC-039 directly map to repository, provider, Team, DB, publication, and browser evidence |
| Changed-boundary execution directness | 98% | Shipped instructions through actual Luna patch, normalized trace, and final UI all executed |
| Cross-boundary integration realism and mock gap | 99% | Real package/model/Team/application state/notification/browser; no mock or direct MCP |
| Environment, configuration, identity, and fixture fidelity | 98% | Exact runtime/model/tool and complete application/binding/member/run/tool/revision identity join |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Current fail-closed contracts, API-REV-003 real failure witness, Round 4 setup/reload, and API-REV-001 lifecycle matrix |
| User-surface, browser, and desktop-shell confidence | 99% | Supported host/iframe browser proof is direct; desktop-shell behavior is inapplicable |
| Durable regression coverage quality and relevance | 96% | Deterministic contracts plus gated exact-Luna integration; browser probe intentionally ticket-local |

- Final overall confidence: `97.6%` (simple average).
- Broader validation: `Required and completed successfully`.
- Result: **Pass**. Every critical criterion is directly proven and no category is below 90%.
- Residuals: inherent external-model availability/nondeterminism; pre-existing global TS6059 typecheck configuration; one transient read-only observer lock; bundled bubblewrap fallback. None invalidates a ticket criterion.
- Durable test-code review: required because one repository integration file was updated and one stale assertion inside it was removed. Return the cumulative package to `/code_reviewer` before delivery.
- Cleanup: owned browser/processes stopped; ports `8015/3015/3016` closed; isolated `.autobyteus/api-e2e-004` and owned generated outputs removed after sanitized evidence copy; unrelated `.autobyteus/development` preserved; `git diff --check` passed.

## Round 3 SR-007 Renewal (Historical Authority For API-REV-003)

This renewal was written after reading the complete `SR-007` / `ARCH-REV-007` / `IR-004` / `CRR-006` cumulative package and **before** any Round 3 durable coverage edit or final repository/browser execution. Round 2 remains a direct historical regression witness: the production-reachable browser path and real Codex/Luna roles called the application tool, but the superseded ordinary-file-tool/shell workflow failed. It is not proof that IR-004 succeeds.

### Approved Behavior To Prove

- Use the shipped role configurations unchanged: both members must run `codex_app_server` / `gpt-5.6-luna` with configured names exactly `get_brief_context`, `publish_artifacts`, and `send_message_to`. Do not switch runtime/model or inject direct MCP/provider mocks.
- Through the supported Brief Studio browser surface, create/select one brief and use `Generate draft`. Each actual configured member must make exactly one paired `get_brief_context({})` call at its lifecycle-correct first-tool point: researcher first after launch; writer first after the research handoff.
- The next file mutation for each member must be a successful provider-native event normalized as `edit_file`. A successful trace must contain zero `run_bash`, `read_file`, and `write_file` invocations.
- Researcher must create and publish `brief-studio/research.md` using the exact member-workspace-relative path, with its exact context marker as line one and a complete 200–500-word body. Its Team message to `/writer` must carry that exact marker, exact relative path, and the complete published body verbatim.
- Writer must consume the Team message without cross-workspace file read, use its own matching context marker, create and relatively publish `brief-studio/final-brief.md`, and place at least one complete non-marker researcher `Key findings` bullet verbatim in final `Key evidence`.
- Correlate `toolCallId -> member agentRunId -> applicationId/bindingId/memberAddress -> context briefId -> normalized edit -> Team message -> exact member workspace file -> relative artifact publication/revision -> reconciled brief -> supported browser DOM`. Keep bearer credentials and global payload logs out of retained evidence.
- A context read alone must cause no Brief Studio business or UI mutation. Existing artifact publication/reconciliation remains the sole cause of business projection; the same selected brief must ultimately render `in_review`, the launch binding, the researcher artifact, exactly one final writer artifact, and the visible writer marker.
- The role must fail closed if context, native edit, publication, or required Team handoff is missing or mismatched; neither shell nor ordinary file operations may satisfy success.

### Round 3 Changed Surfaces And Evidence Plan

| Surface / Boundary | Classification | Existing Evidence | Remaining Critical Gap | Planned Direct Evidence |
| --- | --- | --- | --- | --- |
| Shipped role configs/prompts and launch reinforcement | Changed by IR-004 | CRR-006 source review and focused prompt/package tests | Static assertions do not prove the real provider follows native-edit/no-shell/full-handoff requirements | Rerun current source-and-built-package tests; inspect actual researcher/writer ordered traces and Team communication |
| Read-only Brief handler | Preserved from IR-003 | Exact-marker/no-mutation unit coverage; API-REV-002 actual paired calls | Current workflow must join those calls to successful native edits/publications | Retain per-call trace/result plus pre-publication database observations in the real journey |
| Codex provider-native mutation normalization | Reused unchanged provider boundary | CRR-006 source trace and existing provider tests | No IR-004 live `edit_file` event exists | Capture successful normalized `edit_file` lifecycle events and assert forbidden-operation absence |
| Team handoff and writer consumption | Changed maintained contract over existing messaging owner | Prompt/package tests | No real full-body/verbatim cross-member proof | Retain communication payload, workspace files, and deterministic body comparison showing exact handoff and verbatim bullet reuse |
| Member-relative publication and reconciliation | Reused production boundary with changed call arguments | Existing publication path/ownership suites; prior reconciliation behavior | No actual successful IR-004 relative path/workspace/artifact join | Join publish arguments and member run workspace to file snapshots, artifact revisions, brief binding, and status transitions |
| Supported browser / web-equivalent desktop renderer | Required existing surface | API-REV-002 proved reachability and real failure rendering | No successful SR-007 same-brief outcome | Drive the normal browser journey and retain semantic DOM/state plus screenshots and backend joins |
| Desktop shell | Out Of Scope | No preload/IPC/window/native packaging behavior changed | None material if supported browser path passes | Do not start Electron; browser proof is the supported web-equivalent renderer boundary |

### Durable Coverage Validity Classification Before Round 3 Execution

| Path / Scenario | Current Assertion | Decision | Round 3 Action |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/application-backend/brief-agent-tool.test.ts` | Binding-derived exact compact marker, escaped values, missing-binding fail closed, and read-only before/after equality | `Still Valid` | Retain and rerun. It is direct handler evidence, not a substitute for model/browser proof. |
| `autobyteus-server-ts/tests/unit/application-backend/brief-studio-agent-prompt-contract.test.ts` | Exact config set/runtime plus role-local native-edit, forbidden operations, relative paths, full handoff/no-read/verbatim-use order | `Still Valid` | Retain and rerun unchanged; CRR-006 already source-reviewed IR-004's update. |
| `autobyteus-server-ts/tests/integration/application-backend/brief-studio-team-config.integration.test.ts` | Source and generated package preserve the exact SR-007 configs/prompts, Team reinforcement, launch text, and publication ordering | `Still Valid` after IR-004 update | The stale SR-006 expectations identified in Round 2 were replaced again by IR-004 and passed CRR-006 review. Build the package and rerun unchanged. It is no longer `Needs Update`; it must not be reverted to v4/v6, ordinary-file, absolute-path, or shell-compatible assertions. |
| Published-artifact path and publication suites cited by CRR-006 | Relative paths resolve against the producing run workspace; traversal/out-of-root rejection and durable publication remain enforced | `Still Valid` | Rerun the focused owner suites; supplement with an actual member/path/revision join. |
| API-REV-002 actual traces/screenshots | Proves the production route was reachable and the superseded ordinary-file/shell workflow failed | `Still Valid — Historical Regression Witness` | Preserve, but do not use as IR-004 success evidence. |
| Prior v4 manifest / v6 backend-definition fixtures | Current fixture state is v5/v7; retired values remain only negative rejection inputs | `Still Valid` as classified and corrected in Round 1 | Do not restore retired versions as valid fixtures. Rerun the relevant current package/build checks only; SR-007 has no manifest/schema transition. |

No new durable browser test is approved before this live rerun. The actual provider-authenticated, stateful Team journey requires access-controlled event/communication/database/artifact joins that the repository has no stable browser fixture for, while IR-004 already added focused durable config/prompt/package assertions and reused separately durable publication/reconciliation owners. Round 3 will therefore use a ticket-local temporary executable browser/probe harness and retain sanitized evidence. If execution exposes a stable missing repository assertion, this investigation will be updated before any durable edit.

### Round 3 Execution Gate And Initial Confidence

| Confidence Category | Initial Score | Basis / Gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 75% | Current contracts and source-reviewed tests cover the intended rules; AC-032–AC-039 lack current real-provider success |
| Changed-boundary execution directness | 75% | Config/prompt/package checks are direct; actual IR-004 member action is unexecuted |
| Cross-boundary integration realism and mock gap | 50% | The corrected model -> native edit -> Team message -> publication -> UI chain has not run |
| Environment, configuration, identity, and fixture fidelity | 75% | The shipped config is explicit and API-REV-002 proved auth/reachability, but no fresh isolated current-package run exists |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Fail-closed/handler/platform lifecycle evidence is strong and API-REV-002 proves the prior failure; current success path remains open |
| User-surface, browser, and desktop-shell confidence | 50% | Current browser success is absent; shell behavior is not applicable |
| Durable regression coverage quality and relevance | 90% | Focused current config/prompt/handler/publication tests are source-reviewed and relevant; live provider behavior is intentionally temporary evidence |

- Overall initial Round 3 confidence: `72.1%` (simple average of seven applicable categories).
- Broader validation decision: `Required`.
- Repository-resident Round 3 durable changes approved at this gate: `None`.
- Final execution order: rebuild the current package; rerun the focused handler/config/package and publication-owner coverage; start a fresh isolated development server/frontend/same-origin proxy using the real built package and existing authenticated Codex provider; drive the supported browser journey; observe business rows at short intervals; retain sanitized ordered traces, Team communications, binding/member/workspace/file/publication/revision/brief/DOM joins and screenshots; clean only Round 3 resources; then update the canonical reports and append `API-REV-003`.

### Round 3 Repository Gate Result

- A first Brief package invocation found the intentionally cleaned `autobyteus-ts/dist` prerequisite absent. This was an environment/setup failure rather than a behavior failure. Building the documented workspace/server prerequisites resolved it; the retry generated and validated the current package successfully. Both attempts are retained in `api-rev-003/package-build-validation.log`.
- Current Brief Studio `typecheck:backend`, package build, and package validation passed.
- The focused handler/config/source-and-built-package command passed `3 files / 12 tests` unchanged. This confirms the exact shipped Codex/Luna tool-name selection, role order/native-edit/no-shell/full-handoff/no-read/verbatim-use contracts, exact binding-derived marker, read-only handler behavior, and source/package equality.
- The publication-owner command passed `2 files / 24 tests`; the optional live Codex backend file was correctly skipped (`10` tests) because `RUN_CODEX_E2E` was unset. That skip is not counted as provider evidence; the real browser run remains mandatory.
- No Round 3 repository-resident durable coverage was added, updated, or removed.

| Confidence Category | Post-Repository Score | Basis / Remaining Gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 85% | Exact source/package contracts pass; live AC-032–AC-039 outcome remains absent |
| Changed-boundary execution directness | 85% | Current files/package and real publication owner are direct; actual member behavior is not yet observed |
| Cross-boundary integration realism and mock gap | 75% | Multiple real local owners execute, but the provider/Team/browser chain is still split |
| Environment, configuration, identity, and fixture fidelity | 85% | The exact package builds/validates; fresh isolated authenticated runtime is not yet running |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Fail-closed contracts and historical real failure are strong; current happy-path lifecycle remains open |
| User-surface, browser, and desktop-shell confidence | 50% | No Round 3 browser result yet; shell is not applicable |
| Durable regression coverage quality and relevance | 95% | Current handler/config/package and publication owner checks are narrow, deterministic, and requirement-linked |

- Post-repository overall confidence: `80.7%`.
- Broader validation decision remains: `Required`; repository passes cannot substitute for the actual configured provider, cross-member handoff, reconciliation, and same-brief browser path.

### Round 3 Completed Investigation Outcome

The approved live plan was executed through the normal Applications catalog, Brief Studio host setup, packaged iframe, and its `Generate draft` action using the unchanged shipped `codex_app_server` / `gpt-5.6-luna` roles. One normal UI retry was also executed because model behavior could have been nondeterministic. The same material failure reproduced.

| Scenario / AC | Final Observation | Classification |
| --- | --- | --- |
| `API-BRF-AGENT-001` / `AC-032` | Both researchers made one paired context call first, then the real model reported provider-native `edit_file` unavailable; no edit event, research file, publication, or complete handoff occurred | `Fail` |
| `API-BRF-AGENT-002` / `AC-033` | Both writers made one paired context call first after the blocker handoff and made no file read; each correctly rejected the incomplete handoff, so no final edit/publication occurred | `Fail` |
| `API-BRF-JOIN-001` / `AC-034` | Exact application/binding/member/agentRun/toolCall/brief/workspace/browser joins exist for both attempts; edit/artifact/revision links do not exist | `Partial` |
| `API-BRF-UI-001` / `AC-035` | Same selected brief remained `not_started`, diagnostics showed both real Team runs, and the UI rendered `0` drafts / `0` final | `Fail` |
| `API-BRF-READ-001` / `AC-036` | 20 ms observer showed normal launch/binding changes only; context reads caused no artifact or status mutation. Required publication-driven `in_review` convergence was absent | `Partial Pass` |
| `API-BRF-NATIVE-001` / `AC-037` | Exact shipped Codex/Luna configs and zero forbidden operations passed; successful normalized native edit lifecycle failed twice | `Fail` |
| `API-BRF-HANDOFF-001` / `AC-038` | Exact marker appeared in truthful blocker messages, but complete research body, relative files/publications, and final verbatim witness were absent | `Fail` |
| `API-BRF-FAILCLOSED-001` / `AC-039` | All four member traces contain zero `run_bash`/`read_file`/`write_file`; missing native edit failed closed with zero fabricated artifacts. The required successful trace portion remains unproven | `Partial Pass` |

The actual provider boundary is reachable and authenticated: application context calls and Team messages succeed. Production Codex event conversion can normalize a provider-emitted file-change event to `edit_file`, but the real provider/model emitted no file-change event in either launch. The maintained model-facing instruction therefore still does not reach the required native mutation. Preliminary classification is `Design Impact / maintained role-to-provider operation contract mismatch`, pending focused `/code_reviewer` review.

Final scorecard: requirement proof `50%`; changed-boundary directness `95%`; cross-boundary realism `95%`; environment/configuration/identity fidelity `95%`; failure/lifecycle evidence `95%`; browser confidence `95%`; durable coverage quality `95%`. Overall `88.6%` by simple average. Result: `Fail`; directness makes the failure highly credible but cannot override critical AC failure.

- Round 3 durable coverage changes: none.
- Evidence root: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-003`.
- Cleanup: browser tab closed; owned ports `8013`/`3013`/`3014` stopped and verified closed; isolated root and generated Brief/SDK/devkit outputs removed; unrelated port-8000 process untouched; `git diff --check` passed.
- Required routing: complete failure package to `/code_reviewer`. Delivery remains paused at `DR-002`.

## Round 2 SR-006 Renewal (Historical Authority For API-REV-002)

This renewal was written before changing the stale durable Team-package test or beginning final repository/browser execution. Earlier execution tables and scorecards below remain historical evidence for `API-REV-001`; where they describe browser/model proof as unnecessary, this Round 2 section supersedes them for `BEH-008` and `AC-032`–`AC-036`.

### Approved Behavior To Prove

- The supported Brief Studio browser journey creates/selects one brief and launches `Generate draft` through the real application GraphQL/service boundary.
- The actual package-configured `codex_app_server` / `gpt-5.6-luna` researcher and writer Team members—not a direct MCP client or mocked decision—must each make exactly one successful `get_brief_context({})` call as their first role-local tool action at the approved lifecycle point.
- Each access-controlled run trace must retain one paired call/result joined by `toolCallId`, while the current application Team binding must join the member `agentRunId` to exact `applicationId`, `bindingId`, and canonical `/researcher` or `/writer` address. The result's brief identity must join the same Brief Studio `brief_bindings`, artifact revision/projection, and selected browser brief.
- Calling the read-only tool must not mutate a Brief Studio business row or UI state. Only the existing `write_file -> publish_artifacts -> artifact relay/reconciliation` flow may change the same brief to `in_review` and trigger the existing notification/GraphQL refresh.
- The browser must show the same `briefId`, launch `bindingId`, `in_review`, the researcher artifact, exactly one writer artifact at `brief-studio/final-brief.md`, and the writer result's exact first-line `Brief context: {"briefId":"…","title":"…","observedStatus":"…"}` marker in the visible body.
- A provider/auth/runtime failure or model noncompliance is a real failed/blocked live result; it must not be replaced with direct MCP, prompt inspection, or a model mock.

### Round 2 Changed Surfaces And Evidence Plan

| Surface / Boundary | Classification | Existing Evidence | Remaining Critical Gap | Planned Direct Evidence |
| --- | --- | --- | --- | --- |
| Maintained role prompts / launch reinforcement | Changed | `brief-studio-agent-prompt-contract.test.ts` and CRR-004 focused pass | Source text alone cannot prove model compliance | Rerun focused contract coverage, then inspect actual researcher/writer run traces from the launched Team |
| Read-only Brief handler result | Changed | `brief-agent-tool.test.ts` covers exact marker, escaping, missing binding, and before/after DB equality | Direct handler invocation does not prove each model called or used it | Join each real provider tool result to its published artifact marker and separately retain read-only snapshots around the call-before-publication interval |
| Model/provider and Team execution | Affected cross-boundary | API-REV-001 proves provider/session/worker routing, not provider choice | No actual configured researcher/writer Team run | Launch the shipped configured Team through Brief Studio and retain paired trace/member-binding evidence |
| Artifact publication/reconciliation | Preserved but required causal boundary | Existing durable reconciliation tests and prior platform matrix | Not yet exercised after actual SR-006 model result use | Observe real research/final publications, projection rows, notification refresh, and exactly one final writer artifact |
| Browser / web-equivalent desktop renderer | Required existing surface; no source delta | Existing frontend/GraphQL implementation and prior source review | No supported-surface proof exists | Use the real development browser surface to create/select/launch and assert the converged DOM/detail for the same brief/binding |
| Desktop shell | Out Of Scope | No preload/IPC/window/package-shell change | None material once supported browser surface passes | Do not start Electron unless the browser path cannot exercise a material shell-only behavior |

### Stale Durable Coverage Classification Before Edit

| Path / Scenario | Obsolete Assertion | Approved Current Behavior | Decision | Planned Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/application-backend/brief-studio-team-config.integration.test.ts` prompt assertions | Expects `Required fresh-run sequence:`, writer wording `wait for the research handoff`, writer heading without context-validation clause, and old publish-language fragments that IR-003 deliberately replaced | REQ-018 / AC-032–AC-033 require each role-local prompt to own the exactly-once first context call, validation, fail-closed result use, and exact marker propagation | `Needs Update` — stale expectations, not an implementation defect and not removable coverage | Replace obsolete text assertions with order-sensitive current role contract assertions for source **and built package**; retain valid coordinator/tool split/publish sequencing assertions and add `get_brief_context` selection |
| Same file, Team/launch reinforcement assertions | Expects old research-first prose such as `researcher starts the fresh run...` and old launch paragraphs | SR-006 makes Team/launch text concise secondary reinforcement; each `agent.md` is authoritative | `Needs Update` | Assert role-local authority, exactly-once reinforcement, binding-derived routing, stop-on-error/mismatch, and publish-after-write against source and package |
| Same file, packaged artifact reads | Reads generated `dist/importable-package` | REQ-016–REQ-020 / AC-028, AC-032–AC-033 require the maintained shipped package to carry the same current prompts/config | `Still Valid` | Build/validate Brief Studio before executing this integration file; do not weaken it to source-only coverage |
| `brief-studio-agent-prompt-contract.test.ts` | Focused implementation test for source role order | Matches IR-003 / CRR-004 | `Still Valid`, but insufficient alone | Retain and rerun; package integration plus live Agent/browser evidence remain required |
| `brief-agent-tool.test.ts` | Direct handler exact marker and no-mutation assertions | Matches REQ-020 / AC-036 | `Still Valid`, but insufficient alone | Retain and rerun; correlate the actual Agent result and pre-publication state in live execution |

No durable browser test is added before the live path is understood. The supported full development stack and its provider authentication are stateful, and this one ticket's causal evidence needs cross-owner trace/database joins not currently exposed as a stable test fixture. If the real journey is repeatable using an existing repository browser harness, it will be made durable; otherwise a ticket-local temporary executable browser journey with retained evidence is proportionate and will be explained in the final report.

### Round 2 Execution Gate And Initial Confidence

| Confidence Category | Initial Score | Basis / Gap |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 75% | Approved contracts and source tests exist, but none of AC-032–AC-035 has real model/browser execution yet |
| Changed-boundary execution directness | 75% | Handler/prompt source is direct; actual configured Team action is absent |
| Cross-boundary integration realism and mock gap | 50% | The critical model -> tool -> worker -> artifact -> UI chain is unexecuted as one journey |
| Environment, configuration, identity, and fixture fidelity | 75% | Shipped configs specify Codex/Luna, but usable development auth/runtime and exact live IDs are not yet proven |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Earlier platform lifecycle matrix and new fail-closed source contracts are strong; live prompt noncompliance/provider failure remains untested |
| User-surface, browser, and desktop-shell confidence | 50% | No supported browser journey has run for SR-006; Electron shell is not applicable |
| Durable regression coverage quality and relevance | 75% | Focused tests are valid, but the known package integration expectations are stale until updated |

- Overall initial Round 2 confidence: `70.0%` (simple average of seven applicable categories).
- Broader validation decision: `Required`.
- Repository-resident durable coverage changes currently approved by this investigation: update `brief-studio-team-config.integration.test.ts` only as classified above; reassess any additional browser automation after the first real supported journey.
- Final execution order: update and run the stale package test; run focused SR-006 and affected Brief publication/reconciliation suites; build/validate the real package; start a safely isolated supported full stack with a usable configured provider; drive the browser; retain exact trace/binding/database/artifact/DOM joins; clean only owned resources; update the canonical reports and append `API-REV-002`.

## Round 2 Completed Investigation Outcome

### Repository Coverage Result

- The stale brief-studio-team-config.integration.test.ts expectations were correctly classified Needs Update rather than an implementation defect. The durable file now asserts the current role-local context-first, exactly-once, fail-closed, marker, Team/launch reinforcement, and source-plus-built-package contract.
- Current Brief Studio package build/validation passed.
- Focused SR-006 repository coverage passed 3 files / 11 tests: brief-agent-tool.test.ts, brief-studio-agent-prompt-contract.test.ts, and brief-studio-team-config.integration.test.ts.
- The existing Codex bootstrapper suite passed 1 file / 27 tests. Its maintained read_file case directly corroborates that configuring read_file does not include it in Codex Agent Tools MCP enabled_tools.
- Post-repository confidence: 77.9%. Broader validation remained Required because source/package assertions did not prove model/provider execution or browser outcome.

### Actual Configured Team And Browser Result

The supported Brief Studio browser journey used the current built package, a safely isolated server/application-data root, Chromium, and the shipped codex_app_server / gpt-5.6-luna settings with authenticated Codex CLI. It created and selected brief brief-94b0d173-d106-49a9-8f70-654c29aeb403 and launched Team run brief_studio_team_e07f82e6115144d0be0901592fa9b84a under binding f30e3cdd-8e9e-4999-92ff-5875944bc8c9.

| Scenario / AC | Observation | Classification |
| --- | --- | --- |
| API-BRF-AGENT-001 / AC-032 | /researcher made one paired get_brief_context({}) call first; result matched the launched brief and no business row changed from the read. Selected write_file was not exposed, so the model used run_bash and published research-blocker.md rather than normal research.md. | Fail |
| API-BRF-AGENT-002 / AC-033 | /writer made a paired first get_brief_context({}) call after the blocker handoff. read_file/write_file were not exposed, no final file was written, and a later researcher follow-up caused a second context call. | Fail |
| API-BRF-JOIN-001 / AC-034 | Exact applicationId, bindingId, canonical member address, agentRunId, toolCallId, and briefId joins are retained. Only a blocker artifact/revision exists; no normal research/final artifact join exists. | Partial |
| API-BRF-UI-001 / AC-035 | The supported UI rendered the same brief as blocked with one Research Blocker and zero final outputs, not in_review with one final-brief.md. | Fail |
| API-BRF-READ-001 / AC-036 | A 20 ms database observer showed no state change from either read-only context call. The later blocker publication alone moved the brief to blocked. The required normal publication-driven in_review outcome did not occur. | Partial Pass |

### Failure-Origin Signal

The live failure is corroborated by production composition rather than only model prose:

- The Brief configs require read_file/write_file while selecting codex_app_server.
- CodexThreadBootstrapper gives Codex the filtered Agent Tools MCP descriptor and no dynamic tool registrations.
- Default Agent Tools MCP static adapters do not include read_file or write_file.
- Non-MCP registry tools are not configured-MCP sources.
- Existing Codex durable coverage explicitly expects configured read_file to be absent from Agent Tools MCP enabled_tools.

Preliminary classification is Design Impact / implementation-contract mismatch, pending focused /code_reviewer confirmation. A direct MCP workaround, shell fallback, or mock cannot satisfy the approved criteria.

### Final Confidence And Decision

| Confidence Category | Final Score |
| --- | ---: |
| Requirement and acceptance-criteria proof | 50% |
| Changed-boundary execution directness | 95% |
| Cross-boundary integration realism and mock gap | 95% |
| Environment, configuration, identity, and fixture fidelity | 95% |
| Failure, edge-case, lifecycle, and recovery evidence | 90% |
| User-surface, browser, and desktop-shell confidence | 95% |
| Durable regression coverage quality and relevance | 90% |

- Final validation confidence: 87.1% (simple average).
- Result: Fail. High directness/realism means the failure is well evidenced; critical AC failure still blocks Pass.
- Current broader-validation decision: Required and completed.
- Durable Round 2 edit: autobyteus-server-ts/tests/integration/application-backend/brief-studio-team-config.integration.test.ts.
- Evidence root: /home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/tickets/in-progress/application-owned-mcp-capability/api-e2e-evidence/api-rev-002.
- Required routing: complete failure package to /code_reviewer for focused failure-origin review. Delivery remains paused at DR-002.

## Current Requirement And Design Basis

The current approved behavior is one application-owned agent-tool declaration/handler contract, selected explicitly by application Agent/Team definitions and projected with the same meaning across AutoByteus native and Claude/Codex Agent Tools MCP. The route is immutable and exact-application/binding/producer scoped; the host must validate raw JSON arguments, ownership, the current declaration fingerprint, payload bounds, worker state, and the bounded MCP-safe result before returning. General sessions and other applications must not receive the route. Every registered Agent Tools MCP static-adapter name is forbidden to applications, while a non-static application tool wins over a configured MCP tool only in the owning application session; the existing configured-MCP/static protected/preferred branch remains unchanged.

Lifecycle proof is critical: real worker load requires exact handler-name equality; reload/removal closes admission and drains admitted calls before worker stop and target-slice mutation; immutable old routes survive only code-only/unchanged-declaration reentry and fail after removal or declaration change; crash does not trigger invocation retry; session revocation prevents later calls; platform shutdown drains the tool lane before stopping workers. The strict current contract is manifest v5/backend-definition v7. Prior v4/v6 generated package artifacts are rebuildable and must not be accepted through compatibility readers. Durable databases, bindings, journals, Agent/Team definitions, and configured MCP state remain directly usable without migration. Brief Studio `get_brief_context` is the maintained read-only proof derived from immutable caller `bindingId` and application-owned durable state.

Critical direct-proof set: AC-005, AC-008, AC-010, AC-012–AC-015, AC-019–AC-027, AC-030, and AC-031. These require more than the current focused mocked unit coverage.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / v5 declarations and v7 exact handlers | Added / Changed | REQ-001, REQ-002, REQ-004, REQ-016; AC-001–AC-004, AC-028 | Update all v4/v6 fixtures; add exact handler-map and import-safe declaration coverage. |
| BEH-002 / exact-app selection and full static namespace | Added / Changed | REQ-003, REQ-004, REQ-009; AC-005–AC-009, AC-013 | Retain IR-002 collision tests and add current-contract readiness/selection/isolation coverage. |
| BEH-003 / AutoByteus plus Claude/Codex projection | Added | REQ-005, REQ-006, REQ-012; AC-010–AC-014 | Execute native bound-tool and real MCP session/HTTP list+call paths, not provider-name-only mocks. |
| BEH-004 / authorized child-worker invocation | Added | REQ-007–REQ-011; AC-015–AC-020, AC-031 | Add real child-worker invocation, Team identity, raw-invalid parity, result/error/bound coverage. |
| BEH-005 / transition, concurrency, crash, revocation, shutdown | Added / Changed / Removed | REQ-013–REQ-015; AC-021–AC-027 | Remove obsolete refresh-coordinator coverage; replace old reentry tests with transition/participant tests; run overlapping call/transition and shutdown probes. |
| BEH-006 / clean v5/v7 cut and durable-state direct use | Changed / Preserved | REQ-016, REQ-017; AC-028–AC-031 | Update stale fixtures; assert v4/v6 rejection rather than preserve them as valid; rebuild maintained outputs and exercise existing app/platform data without migration. |
| BEH-007 / native foundation, Team trio, compactor exclusion | Preserved | REQ-003, REQ-012; AC-001, AC-005, AC-008 | Retain existing exposure tests and rerun affected native factory/integration coverage. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Declaration catalog, route fingerprints, validation gateway, worker result contract | Focused IR-002 catalog/host/readiness unit tests; implementation build | Most new gateway/catalog/result behavior has no durable tests | Vitest unit + integration |
| API / transport / contract | Yes | Manifest v5, backend v7, MCP tools/list and tools/call application routes, worker JSON-RPC | Existing generic MCP route integration and application worker integrations | No durable application-tool MCP route or worker call crosses the real HTTP/child-process boundaries | Live API / worker integration |
| Frontend component / state | No | No renderer source changed | N/A | None | None |
| Browser integration / user journey | No | Settings/GraphQL package command is a backend lifecycle trigger; no renderer behavior changed | Package command/GraphQL backend paths exist | DOM proof would not materially improve the changed backend boundary | Browser not required; direct GraphQL/service lifecycle is preferred |
| Authentication / session / permissions | Yes | Bearer session route issuance/revocation plus exact binding/producer authorization | Existing generic session authority tests | No application route general/App A/App B visibility and no post-revocation real call | MCP HTTP + ownership integration |
| Desktop renderer / web-equivalent UI | No | None | N/A | None | None |
| Desktop shell / Electron-specific integration | No | None | N/A | None | None |
| Process / lifecycle | Yes | Child worker load/crash/stop, catalog reentry, session close, platform shutdown | Existing generic worker/lifecycle suites; implementation narrow probes were temporary | Call drain ordering, crash/no-retry, target-only transition, shutdown ordering lack durable cross-boundary proof | Lifecycle / child worker |
| Persisted-data transition | Yes | Rebuild v4/v6 packages; directly use existing durable DB/binding state | Maintained package build/validate evidence | Repository fixtures still assert v4/v6 as valid; direct-use representative application data not yet coupled to tool call | CLI build/validate + integration data fixture |
| Worker / queue / distributed coordination | Yes | Host-child JSON-RPC, per-app admission counters, transition mutex | Generic worker completion integration | No real application agent-tool call, concurrent call/transition, or serialized transition matrix | Worker/process + concurrency |
| External integration | Yes, bounded | Runtime-provider projection for AutoByteus/Claude/Codex | Provider factory and generic MCP tests | Actual external LLM credentials are not needed to prove server-owned route projection, but real provider adapters/sessions must be exercised | Real provider construction plus real shared MCP route; external model call only if configured and useful |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability`
- Project type and runtime stack: Git/pnpm TypeScript monorepo; Node `22.x`; pnpm `10.28.2`; Vitest fork pool with serial files; Prisma SQLite test runtime; application backends run in child workers; Fastify/GraphQL/shared MCP HTTP routes.
- Conflicting, missing, or unclear project instructions: No direct conflict. The root/server docs distinguish deterministic repository E2E from optional real-provider E2E. `RUN_CODEX_E2E=1` enables live Codex suites, but unavailable external capabilities must be reported rather than represented as passed. No browser or Electron validation is justified because no frontend/shell boundary changed.
- Required environment variables or secrets available: deterministic test runtime `Yes`; external-provider secrets `Unclear` until preflight and not required for server-owned route proof. Secret values will not be recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/README.md` | Workspace setup and E2E authority | `corepack pnpm install`; `pnpm test:e2e`; optional `pnpm test:e2e:real:preflight` / `pnpm test:e2e:real`; unavailable capabilities must remain explicit. |
| `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/autobyteus-server-ts/AGENTS.md` | Closest test instruction | Use `vitest run ... --no-watch`; integration directory command is authoritative. |
| `/home/autobyteus/workspace/autobyteus-workspace-application-owned-mcp-capability/autobyteus-server-ts/README.md` | Server development/test/environment guide | Test state is isolated under `tests/.tmp`; `.env.test` is the tracked credential-free template; optional provider gates include `RUN_CODEX_E2E`. |
| `autobyteus-server-ts/package.json`, `vitest.config.ts`, `.env.test` | Exact runner/build setup | `pretest` rebuilds shared packages; Vitest includes `tests/**/*.test.ts`, runs serial files in forks, uses Prisma global setup. |
| application package `README.md` and `package.json` files | Maintained package build/validate | `corepack pnpm --filter <app> build`; `validate`; Brief Studio owns durable brief state and current Team package. |
| `autobyteus-application-devkit/README.md` and package scripts | Package lifecycle | Import remains prebuilt-only; build/validate/start use real package/standalone owners; generated output is reproducible. |
| `test-support/live-e2e/*` and root real-E2E scripts | Optional external-provider execution | Builds server, starts an isolated loopback test server, scans evidence, reports missing/unavailable capabilities, and cleans owned temp state. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Workspace dependencies | worktree root | `corepack pnpm install --frozen-lockfile` if relink is needed | Existing `node_modules` is present from implementation | command exit 0 | No process |
| Prisma/Vitest runtime | `autobyteus-server-ts` | Vitest command; global setup owns DB | Uses test-owned SQLite under `tests/.tmp` | test setup success | Vitest/global teardown; remove only run-owned temp roots |
| Maintained application output | app package root | `corepack pnpm build && corepack pnpm validate` via filters | Creates reproducible `dist/` | validation output | Remove generated untracked `dist/` after evidence unless needed by a test |
| Child application worker | test harness | Existing `ApplicationEngineController`/launcher or `application-engine-test-runtime` | Must use unique temp app/data roots | worker ready status / successful load | controller/launcher stop in `finally` |
| Shared Agent Tools MCP host | in-process test/server harness | `createAgentToolsMcpHost` and Fastify route registration | Loopback/in-memory server; bearer session is test-owned | MCP initialize/list response | revoke/close host and app scope in `finally` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| v5/v7 application package | Existing fixture builders/devkit package output | Temp roots only; no production package mutation | Delete temp/generated output after run |
| App A/App B same-name catalogs | In-memory bundle snapshots or temp packages | Deterministic compound application IDs | Test-local |
| Binding and Team identity | Existing application binding store/ownership service fixtures and server-minted Team member identities | No caller-supplied identity used as authority | Test DB/temp stores cleaned by suite |
| Brief durable business state | Existing Brief repositories/correlation and application SQLite temp copy | Must derive by caller `bindingId` | Temp app data removed after run |
| Concurrency gates | Deferred promise/barrier inside test handler | No timeout used as production behavior; test-only safety deadline permitted by runner | Test-local |

## Persisted Data Transition Coverage Basis

- Approved decision: `Discard or Rebuild` for generated/importable v4/v6 package artifacts; `Directly Usable — No Migration` for application/platform databases, bindings, journals, launch overrides, Agent/Team definition files, and global MCP configuration.
- Design-spec and implementation-handoff references: `design-spec.md` Persisted Data / State Transition Decision and strict transition sections; `implementation-handoff.md` Legacy / Compatibility Removal Check and Persisted Data Transition Check.
- Representative existing-data setup and required behavior: rebuild Brief Studio and Socratic packages on v5/v7; run the current reader and maintained Brief tool against separately existing application business state/binding data without any migration or rewrite; assert strict rejection of retired v4/v6 package/definition artifacts.
- Evidence planned: updated durable current-version fixture tests, explicit old-version rejection, maintained build/validate, real Brief binding-derived worker call, and git/source checks for absence of compatibility readers.
- Migration-specific completion/recovery scenarios: `N/A`; migration is not approved.
- Upstream ambiguity or reroute required: None.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts` IR-002 scenarios | Registered/preferred/protected/inactive static rejection, non-static app-over-configured, no-app configured browser precedence | REQ-009; AC-013, AC-014 | Still Valid | CRR-002 passed 3 files/16 tests; assertions match SR-005 | Retain and rerun. |
| `tests/unit/agent-tools/mcp/agent-tools-mcp-host.test.ts` immutable all-provider snapshot | Host publishes frozen complete names-only snapshot | REQ-004, REQ-009; AC-013 | Still Valid | Current implementation/readiness boundary | Retain and rerun. |
| `tests/unit/application-platform/application-definition-runtime-readiness.test.ts` | Unselected `open_tab` declaration still fails readiness | REQ-004, REQ-009; AC-007, AC-013 | Still Valid | New source-review-passed durable test | Retain and expand only if broader readiness cases are not covered elsewhere. |
| `tests/unit/application-platform/application-platform-runtime-isolation.test.ts` | Application/general composition and assembly isolation | REQ-005, REQ-012; AC-010, AC-011 | Still Valid, but incomplete | Composition-only; does not invoke routes | Rerun and supplement with real MCP/native execution. |
| Existing native exposure/resolver/factory unit and integration tests | Foundation baseline, Team trio, configured additivity/deduplication, compactor empty set | BEH-007; AC-001, AC-005, AC-008 | Still Valid | Approved preserved behavior | Rerun affected focused set. |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Generic bearer initialize/list/call/auth/revocation | REQ-005, REQ-006, REQ-012; AC-010, AC-011, AC-025 | Still Valid, but missing application routes | Exercises real HTTP MCP boundary only for existing static routes | Extend or add adjacent application MCP integration coverage. |
| `tests/integration/application-backend/application-engine-test-runtime.ts` and worker integration suites | Real child-worker protocol and application context behavior | REQ-002, REQ-007, REQ-010; AC-002, AC-015–AC-020 | Still Valid as harness; fixtures need current contract | No application agent-tool invocation case | Reuse for v7 handler and real worker call coverage. |
| `autobyteus-application-devkit/tests/application-devkit.test.mjs` manifest version assertion | Generated starter/package contract | REQ-016, REQ-017; AC-028 | Needs Update | Still asserts manifest v4 | Change to v5 and assert current application-tool field behavior. |
| `tests/unit/application-bundles/file-application-bundle-provider.test.ts` v4 fixtures and v6 generated definition string | Static manifest/bundle parsing, diagnostics, import safety | REQ-001, REQ-004, REQ-016; AC-001–AC-004, AC-028 | Needs Update | Three v4 manifests and one v6 definition remain | Convert valid fixtures to v5/v7; add retired-v4 rejection and declarations. |
| `tests/unit/application-engine/application-backend-definition-loader.test.ts` | Definition version/route validation | REQ-002, REQ-004, REQ-016; AC-002, AC-003, AC-028 | Needs Update | Valid fixtures and expected diagnostic still use v6 | Convert to v7, retain explicit stale-version rejection, add exact handler-map cases. |
| Four `tests/integration/application-backend/*` files with v6 fixture modules | Real mount/REST/WS/context child-worker coverage | REQ-016; AC-028 | Needs Update | Current production strictly requires v7, so suite setup is stale | Convert fixtures to v7; their non-tool assertions remain valid. |
| `tests/unit/application-packages/application-catalog-refresh-coordinator.test.ts` | Old destructive refresh coordinator order | Removed DS-006/DS-011 path; REQ-013–REQ-015 | Stale / Remove | Production module is deleted and forwarding wrapper is forbidden | Remove and replace with `ApplicationCatalogTransitionService` durable tests. |
| `tests/unit/application-packages/application-package-command-service.test.ts` | Commands call `refreshCoordinator`, then rollback/finalize | REQ-013–REQ-015; AC-021–AC-024 | Replace | Assertions protect the removed owner and wrong mutation boundary | Rewrite against `runPackageTransition`, preserving registry/source/finalizer ownership assertions. |
| `tests/unit/application-orchestration/application-availability-service.test.ts` first four scenarios | Availability snapshot and persisted-known quarantine | REQ-015, REQ-017 | Still Valid | Independent of removed reentry API | Retain. |
| Same file's `ApplicationReentryService.reloadAndReenter` scenarios | Reentry directly reloads bundle and owns catalog mutation | Removed DS-006 path; AC-021–AC-024 | Replace | Production reentry is participant-only; exact reentry now belongs to transition service | Replace with participant preparation/recovery/quarantine and transition-service cases. |
| Existing application platform lifecycle/shutdown tests | General owner order/idempotent cleanup | REQ-015; AC-026 | Needs Update | No direct assertion that tool drain precedes worker stop | Add application-tool drain order and admitted-call overlap. |
| Existing ownership-service tests | General binding/run ownership reconciliation | REQ-007, REQ-011; AC-015, AC-016 | Needs Update | No application tool standalone/configured/descendant/forged identity matrix | Add exact `requireLiveApplicationToolProducer` scenarios. |
| Architecture boundary tests | Dependency directions, removed path restrictions | Design guidance / no-legacy rule | Needs Update | Current fixture references still mention removed coordinator as an allowed reconciliation seam | Replace old coordinator allowance with transition owner and add application-tool boundary prohibitions. |
| Root `pnpm test:e2e` and optional real-provider harness | Broad deterministic/API and configured external capability execution | AC-030 | Still Valid as execution infrastructure, not sufficient alone | No feature-specific application-tool journey exists | Run broad deterministic affected suites; use provider preflight only to classify optional external access. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/application-packages/application-catalog-refresh-coordinator.test.ts` | `refresh()` destructively refreshes bundle then reconciles/caches | The coordinator and direct bundle refresh path are intentionally removed; retaining the test would protect forbidden legacy behavior | SR-003; ARCH-DI-002 resolution; design removal plan; implementation handoff | New transition-service target-slice, drain, rollback, serialization, and quarantine coverage | N/A |
| Reentry portion of `application-availability-service.test.ts` | `ApplicationReentryService.reloadAndReenter()` stops worker, calls `bundleService.reloadApplication`, then resumes | Catalog mutation is now exclusively owned by `ApplicationCatalogTransitionService`; reentry owns participant lifecycle only | DS-006/DS-011; implementation source | Participant prepare/recover/quarantine tests plus exact-app transition test | N/A |
| `application-package-command-service.test.ts` refresh-coordinator expectations | Package commands invoke refresh directly and repeat refresh during rollback | Package commands now pass command-owned apply/rollback operations to one transition owner | DS-006; AC-021–AC-024 | Rewritten command/transition contract tests | N/A |
| v4/v6 values when used as valid fixture state | Retired generated contracts are accepted as current | Strict clean-cut v5/v7 is approved; no compatibility reader is allowed | REQ-016, REQ-017; AC-028, AC-029; implementation legacy check | Current valid fixtures use v5/v7; focused tests keep old values only as expected rejection inputs | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-MCP-001 | App A/App B/general/unselected isolation and same local name through real MCP HTTP session | REQ-005, REQ-006, REQ-009; AC-006, AC-010–AC-012, AC-014 | `tests/integration/agent-tools/mcp/application-agent-tools-mcp-routes.integration.test.ts` | Unit route-table assertions do not prove bearer/session/HTTP tools/list+call behavior. |
| API-RUN-001 | AutoByteus native composition and raw-invalid parity versus MCP; unchanged automatic baselines | REQ-003, REQ-005, REQ-010, REQ-012; AC-001, AC-005, AC-019 | New native application-tool unit/integration file plus MCP integration | This is the provider-invariant contract and prior design defect area. |
| API-WRK-001 | v7 exact handler load and real child-worker invocation with caller context/result/error | REQ-002, REQ-007–REQ-011; AC-002, AC-003, AC-015–AC-020 | `tests/integration/application-backend/application-agent-tools-worker.integration.test.ts` | Temporary Node checks are not durable and mocked gateways bypass the process boundary. |
| API-TEAM-001 | Configured Team member and task-created descendant authorization; forged/wrong/terminal cases rejected | REQ-006, REQ-007, REQ-011; AC-008, AC-015, AC-016 | Ownership/service durable tests and provider-route integration | Team descendant identity is a high-risk server-minted boundary. |
| API-CAT-001 | Transition import/reload/remove/exact-app, target-only lane/commit, rollback recovery/quarantine, mutex serialization | REQ-013–REQ-015; AC-021–AC-024, AC-027 | `tests/unit/application-orchestration/application-catalog-transition-service.test.ts` | The governing replacement owner currently has no durable test. |
| API-CON-001 | Admitted call overlaps reload/removal; new call rejected; worker stop occurs after drain; no timeout/retry | REQ-013–REQ-015; AC-021, AC-024, AC-027 | Transition/gateway integration and temporary realistic worker probe if needed | Direct concurrency evidence is mandatory. |
| API-LIFE-001 | Worker crash fail-closed, session revocation, shutdown drain/idempotency/order | REQ-015; AC-020, AC-025–AC-027 | Lifecycle/MCP integration and worker harness | Source/build evidence cannot prove process settlement/order. |
| API-PKG-001 | Current v5/v7 package rebuild, explicit old-version rejection, no migration | REQ-016, REQ-017; AC-028, AC-029 | Updated fixture tests plus build/validate commands | Stale fixtures presently contradict current production and would make broad results meaningless. |
| API-BRF-001 | Real Brief Studio `get_brief_context` reads durable state by caller binding | REQ-002, REQ-007, REQ-011; AC-017, AC-030, AC-031 | `tests/integration/application-backend/brief-studio-agent-tool-mcp.integration.test.ts` plus handler unit coverage | The shipped package, actual MCP HTTP route, exact Team binding, child worker, migrations, and durable Brief data must be one executable path. |
| API-SHD-001 | Studio and standalone lifecycle parity for catalog/tool lane/worker shutdown | REQ-005, REQ-012, REQ-015; AC-010, AC-026, AC-030 | Standalone runtime integration plus Studio composition/lifecycle test | Both composition roots changed. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-PKG-001 | Devkit, bundle provider, loader, and four worker integration fixture files listed above | Change current valid fixtures to v5/v7; retain explicit retired-version negative cases | REQ-016, REQ-017; AC-028, AC-029 | No compatibility expectation is retained. |
| API-CAT-002 | `application-package-command-service.test.ts` | Assert delegation to `ApplicationCatalogTransitionService.runPackageTransition`, command-owned apply/rollback/finalize and managed-install finalizer | REQ-013–REQ-015; AC-021–AC-024 | Replace refresh wording/helpers entirely. |
| API-CAT-003 | `application-availability-service.test.ts` | Keep availability assertions; replace direct-reload scenarios with participant lifecycle tests or move them to a focused reentry file | REQ-013–REQ-015 | Avoid protecting removed bundle mutation. |
| API-LIFE-002 | platform lifecycle tests | Add `quiesceAndDrainAll` before engine/worker stop and `closeAll` idempotency evidence | REQ-015; AC-026 | Exact order is material. |
| API-TEAM-001 | ownership service tests | Add application-tool producer identity variants | REQ-006, REQ-007, REQ-011; AC-008, AC-015 | Use server-owned route identity, not argument IDs. |
| API-ARCH-001 | application framework boundary tests | Remove old coordinator allowance and encode transition/gateway/native/MCP dependency prohibitions | Reviewed design guidance | Architecture suite otherwise retains an obsolete exception. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/application-packages/application-catalog-refresh-coordinator.test.ts` | Tests a deleted/forbidden legacy owner | REQ-013–REQ-015; DS-006/DS-011 removal plan | Replace with `application-catalog-transition-service.test.ts`. |
| Direct-reload scenarios in `application-availability-service.test.ts` | Tests removed `ApplicationReentryService.reloadAndReenter` and direct bundle mutation | AC-021–AC-024; catalog-transition ownership | Replace with participant/transition coverage; retain independent availability cases. |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | CRR-002 focused 3-file/16-test command | `autobyteus-server-ts`; normal test env | Source-review collision baseline | Pass (upstream) | `code-review-report.md` |
| 2 | Initial focused feature matrix during fixture conversion | Worktree root, server Vitest | Identified one stale REST status expectation after v7 fixture conversion | Expected stale-coverage failure: 1 failed, 176 passed, 18 skipped | `/tmp/application-owned-mcp-focused-matrix.log` |
| 3 | Curated 33-file feature matrix including architecture, MCP, provider, native, worker, ownership/Team, transition/concurrency, lifecycle/shutdown, strict contracts, and shipped Brief MCP | `corepack pnpm --filter autobyteus-server-ts test --run <33 listed files> --no-watch` | API-MCP-001, API-RUN-001, API-WRK-001, API-TEAM-001, API-CAT-001/002/003, API-CON-001, API-LIFE-001/002, API-PKG-001, API-BRF-001, API-SHD-001 | Pass: 33 files / 234 tests | `/tmp/application-owned-mcp-final-matrix-with-brief.log` |
| 4 | Devkit test; frontend/devkit build; Brief and Socratic backend typecheck/build/validate | Worktree/app package roots | Strict v5/v7 regeneration and maintained package correctness | Pass; devkit 21/21, both packages valid | `/tmp/application-owned-mcp-package-matrix-final.log` and focused Brief build/validate preceding API-BRF-001 |
| 5 | `corepack pnpm --filter autobyteus-server-ts build` | Worktree root | Server/shared compile, Prisma generation, sanitized built-module bootstrap | Pass | `/tmp/application-owned-mcp-server-build-final.log` |
| 6 | `corepack pnpm test:e2e` | Worktree root | Broad deterministic repository E2E regression screen | Partial: 49 files passed, 14 skipped, 7 failed; 174 tests passed, 51 skipped, 27 failed | `/tmp/application-owned-mcp-root-e2e.log` |
| 7 | Individual reruns of all broad failures plus the corrected current Codex MCP issuer fixture | Worktree root | Failure classification and flake separation | Current Codex fixture 4/4 pass; token analytics 3/3 pass; 25 failures reproduced in five workspace/run-history files outside the ticket changed surface | `/tmp/application-owned-mcp-broad-failure-rechecks.log` |
| 8 | `corepack pnpm test:e2e:real:preflight` | Worktree root; isolated loopback runtime | Project-supported external capability/environment classification | Pass: 18/18 value-safe preflights; external secrets absent, LM Studio unavailable | `/tmp/application-owned-mcp-real-provider-preflight.log` |
| 9 | `corepack pnpm --filter autobyteus-server-ts typecheck` | Worktree root | Supplemental compile check | Blocked by repository `tsconfig.json` configuration: `rootDir=src` while tests are included, producing TS6059; authoritative server build passes | `/tmp/application-owned-mcp-server-typecheck.log` |
| 10 | `git diff --check`; retired-version/removed-owner scans | Worktree root | Patch integrity and clean strict-version/legacy cut | Pass; retired v4/v6 occur only in explicit rejection tests, deleted coordinator symbols absent | Command output observed in round 1 |

The broad-suite failures do not intersect the feature matrix: they reproduce around an uninitialized process `AgentRunManager`/`AgentTeamRunManager` during workspace cleanup and run-history GraphQL setup. No file in those five suites, their workspace/process-manager implementation boundary, or the observed call stacks is changed by the application-owned-tool implementation. A clean base-worktree comparison was attempted but the base checkout has no installed dependencies (`tsc` unavailable), so this report does not claim an executed historical baseline. They remain explicit repository residual failures rather than being silently reclassified as passes.

## Round 1 Post-Repository Confidence Scorecard (Historical API-REV-001 Evidence)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | All critical ACs map to passing durable contract, provider, MCP, worker, Team, transition, lifecycle, package, and Brief cases | Paid models were not asked nondeterministically to choose the tool | Not material to the platform contract |
| Changed-boundary execution directness | 97% | Actual raw MCP JSON-RPC, native AutoByteus tool, exact gateway, worker protocol, and transition owners execute | Full Studio UI launch is intentionally bypassed | No higher-value backend validation remains |
| Cross-boundary integration realism and mock gap | 95% | Real Fastify bearer route, real built Brief package, real child worker, real SQLite migrations/data, and live AutoByteus backend run | Brief startup reconciliation uses a deterministic empty-list host seam; external inference is absent | Full external model call would add nondeterministic choice, not route semantics |
| Environment, configuration, identity, and fixture fidelity | 96% | Current v5/v7 generated packages, exact Team/binding/member identities, isolated storage, real provider materializers | Optional secrets/local model are unavailable | Configure optional providers if product-level inference is separately desired |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | Invalid raw input, oversized payload/result, stale route, wrong identity, crash/no retry, revocation, drain, rollback/quarantine, mutex, and shutdown order all pass | Five unrelated broad E2E files remain red | Repair their process-owner setup independently |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend, renderer, preload, IPC, or shell boundary changed | N/A | N/A |
| Durable regression coverage quality and relevance | 96% | Stale owner removed, v4/v6 converted to negative cases, replacement owners and real production package path retained | Test review is still required after these repository edits | Proportional code review of changed durable tests |

- Overall post-repository confidence: `96.3%` (simple average of six applicable categories)
- Calculation method: simple average; user-surface category is genuinely inapplicable.
- Every critical acceptance criterion directly proven: `Yes`
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: optional external model inference is unconfigured; five unrelated broad E2E files have process-owner/setup failures; supplemental server `typecheck` is unusable under the repository's current rootDir/include configuration. None removes direct proof for this ticket's critical acceptance criteria.

## Round 1 Broader Validation Decision (Historical API-REV-001 Evidence)

- Decision: `Required` — completed
- Selected execution mode: `Live API + Lifecycle + Worker or Distributed + CLI`
- Specific confidence gap or residual risk addressed: repository unit evidence alone cannot prove shared MCP bearer/session routing, child-worker invocation, exact Team/binding ownership, concurrent target-only transition/drain, crash/no-retry, revocation, or shutdown order.
- Why the selected mode can materially improve confidence: it exercises the actual process/session/catalog boundaries that mocks bypass and is the explicit upstream request.
- Expected confidence after the selected validation: met; final confidence is `97.2%` with no applicable category below `90%`.
- Browser-specific decision and rationale: `Not selected`. No frontend, web-equivalent renderer, routing, browser API, or desktop-shell behavior changed; a browser would add indirect UI evidence while bypassing none of the critical worker/session/concurrency risks. Direct GraphQL/service invocation is the higher-value supported surface for the Settings-triggered package transition.
- If Not Required: `N/A`
- If Blocked: `N/A`
- Execution outcome: the real shipped Brief Studio package was built and validated, then its `get_brief_context` declaration/handler was listed and called through an authenticated Agent Tools MCP HTTP session, exact Team/binding authorization, the production gateway, a real child worker, and application SQLite state. Claude- and Codex-kind sessions returned different binding-owned Brief rows; a general session remained empty and a revoked bearer failed.

## Round 1 Desktop Application Validation Decision (Superseded For SR-006)

- Desktop framework / shell: Electron exists in the broader product, but the changed capability is server/package/worker-owned.
- Relevant README or development instructions: root README packaged Electron section and local full-stack section were read.
- Web-equivalent behavior: no changed renderer journey.
- Shell-specific or lifecycle behavior: no preload/IPC/window/native packaging change.
- Chosen validation approach and why it fits the project: no browser/Electron run; execute real server API, provider adapter/session, worker, and lifecycle surfaces instead.
- Server/frontend setup when browser validation is used: `N/A`
- Effect on any already-running desktop application: `None`
- Behavior not directly proven and confidence consequence: no desktop behavior is claimed.

## Round 1 Live Environment And Fixture Plan (Historical API-REV-001 Evidence)

- Startup order and commands: build shared/server packages; build/validate maintained v5/v7 apps; run focused deterministic Vitest; start only test-owned in-process/Fastify/worker runtimes needed by integration; optionally run root real-provider preflight after deterministic proof.
- Environment choices that materially affect the run: tracked `.env.test`; unique temporary application roots, databases, ports, and MCP bearer sessions; no development or production data.
- Health / readiness checks: worker controller state `ready`, MCP initialize response, application readiness state, loopback server readiness, and explicit test barrier observations.
- Seed data / fixtures: v5/v7 temp App A/App B packages; exact handler maps; Brief correlation/business row keyed by binding; configured global MCP fake source only where precedence is the subject.
- Test identities, authentication, permissions, or session state: general session, App A and App B Agent sessions, configured Team member, task descendant with server-minted root/member identity, wrong/forged/terminal variants, and revoked bearer.
- Requirement-linked journeys or scenarios: API-MCP-001 through API-SHD-001 above.
- Evidence to capture: exact Vitest commands/output; process order arrays and call counts; MCP JSON responses; worker start/stop state; package build/validate output; source/diff checks.
- Owned processes and temporary state to clean up: Fastify/MCP listeners, child workers, temp package/app data/database roots, generated application `dist/`, and optional real-E2E temp evidence directories.

## Round 1 Temporary Executable Validation Plan (Historical API-REV-001 Evidence)

No ticket-local temporary probe was required. Deterministic promise barriers in durable transition/lifecycle tests proved admission, drain, serialization, rollback, and shutdown ordering, while the retained Brief and synthetic-worker integrations exercised the real MCP/child-process boundaries. All generated package output and test-owned runtime state was cleaned after evidence capture.

## Round 1 Not Tested / Infeasible / Deferred (Resolved Or Superseded By SR-006)

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual paid/external model inference by all three providers | Server-owned tool routing can be proven with real provider adapter/session construction and MCP/native calls without nondeterministic model choice; credentials may be absent | Low after adapter/session and gateway proof; model deciding whether to call a tool is not the changed platform contract | Run optional real-provider preflight and report capability status; do not claim unconfigured providers passed |
| Browser/Electron renderer | No changed surface | None for this ticket | None |

## Round 1 Ambiguities Or Reroute Triggers (Resolved By SR-006)

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| User now requires a real Brief Studio Agent to choose/call the tool, correlated execution logs, and an ensuing UI-observable result; current proof calls MCP directly, while the approved tool is read-only and the design explicitly says no UI workflow change | Requirement Gap; Design Impact if the tool itself must mutate UI state | `api-e2e-agent-ui-proof-gap.md`; requirements UC-007/AC-031; design maintained-sample/no-UI clauses; current production MCP test | `/solution_designer` |

## Historical Investigation Decision (Round 2)

- Proceed To API/E2E Execution: Completed.
- Repository-Resident Durable Coverage Added / Updated / Removed: Updated autobyteus-server-ts/tests/integration/application-backend/brief-studio-team-config.integration.test.ts; no Round 2 add/remove.
- Final result and confidence: Fail / 87.1%.
- Broader validation decision: Required and completed through the supported Brief Studio browser plus actual configured Codex/Luna researcher/writer Team.
- Failed or incomplete critical criteria: AC-032, AC-033, AC-034, AC-035, and the normal-publication/UI portion of AC-036.
- Reroute Required: Yes — /code_reviewer focused failure-origin review.
- Notes: API-REV-001 / CRR-003 remain valid for AC-001 through AC-031. The earlier Requirement Gap was resolved by SR-006, but real execution exposed a provider/file-tool composition mismatch. Delivery remains paused at DR-002.

## Current Investigation Decision (Round 4)

- Proceed To API/E2E Execution: Completed.
- Repository-Resident Durable Coverage Added / Updated / Removed: updated `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts`; removed one stale assertion within it; no durable file added or removed.
- Final result and confidence: **Pass / 97.6%**.
- Broader validation decision: Required and completed through the supported Brief Studio browser plus actual configured Codex/Luna researcher/writer Team.
- Critical criteria: `AC-032`–`AC-039` all pass.
- Reroute Required: `/code_reviewer` proportional review of the updated durable integration test before delivery.
- Notes: `API-REV-001` remains valid for `AC-001`–`AC-031`; `API-REV-002` and `API-REV-003` are historical failure evidence for superseded workflows. Delivery remains paused at `DR-002` until test-code review.
