# Investigation Notes

## Investigation Meta
- Package: `codex-disable-multi-agent-20261006`; current revision: SR-005; date: 2026-10-06.
- Canonical workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006`; active ticket: `tickets/in-progress/codex-disable-multi-agent`.
- Repository mode: isolated Git solution authoring after implementation approval SD-AP-001.
- Task branch: `codex/disable-native-multi-agent-20261006`; fetched base `origin/personal` / f48dbfbf39bbf9ed76116943e304248ca387dc7f; finalization target `origin/personal`, Delivery-owned.
- Historical SR-001–003 workspace: `/Users/normy/.codex/investigations/codex-disable-multi-agent-20261006` (Non-Git diagnostic reporting). The sections below through SR-003 describe that historical scope and do not override the active approved requirements.
- Historical diagnostic bootstrap: safe reporting workspace established outside shared integration checkout. Active Git bootstrap recorded in SR-004 below; existing unrelated working changes untouched.
- Historical diagnostic reading gates: solution-designer SKILL.md and requirements-engineering.md; repository/package AGENTS.md; full TESTING.md; openai-docs SKILL.md and official-docs.md. No architecture phase at SR-001–003; active SR-005 design gates recorded below.
- Status: approved requirements and architecture design complete; no implementation or final-delivery certification.

## Original Request
“could you check whether for codex app server it support me to disable the mult agent feature when i start app server… currently it seems not working… you can even do experiements to check that”. User permits investigation/experiments, not source/config changes.

## Sources And Evidence
| Source | Finding |
| --- | --- |
| https://learn.chatgpt.com/docs/config-file/config-reference (searched and opened through official-domain web search) | Documents agents.enabled default true; also retains an entry for features.multi_agent. Documentation alone therefore cannot prove old flags disable tools for this binary/model. |
| https://learn.chatgpt.com/docs/agent-configuration/subagents (opened, exact global settings found) | Explicitly says set agents.enabled=false to disable multi-agent tools. |
| https://learn.chatgpt.com/docs/app-server (opened through developers.openai.com/codex/app-server redirect) | initialize/initialized handshake, thread/start, thread config overrides, config/read. Current webpage's sandbox spelling example differs from the installed binary. |
| `command -v codex; codex --version; codex app-server --help; codex features list` | PATH binary `/Users/normy/.local/bin/codex`; codex-cli 0.160.1. CLI supports -c dotted TOML overrides; --disable is equivalent to features.<name>=false. Feature list reports multi_agent and multi_agent_v2 false with the user's current settings. This does NOT prove absence of tools. |
| `~/.codex/config.toml` relevant read-only slice | Existing [features] multi_agent=false; no [agents] enabled=false found in the inspected settings. No personal settings were changed. Credentials were not read or copied. |
| `src/runtime-management/codex/client/codex-app-server-launch-config.ts` lines 2–16 (server package) | parseArgs always appends only -c features.multi_agent=false and -c features.multi_agent_v2=false. It does not append agents.enabled=false. |
| `src/runtime-management/codex/client/codex-app-server-client-manager.ts` | Production default client creation calls parseArgs and starts/initializes the process. |
| `src/agent-execution/backends/codex/thread/codex-thread-manager.ts` lines 181–227 | thread/start and thread/resume pass appServerConfig through the JSON-RPC config field. |
| `tests/unit/runtime-management/codex/client/codex-app-server-launch-config.test.ts` | Existing tests verify old argument values/order, not actual upstream tool suppression. These tests were inspected, not run or modified. |
| `tickets/done/project-task-manager-linked-delegation/api-e2e-evidence/api-023/fapi-013-codex-multi-agent-still-on.md` | Prior real isolated AutoByteus UI run on 0.160.0/GPT-6-Luna reproduced old flags failing. Real agent selected native send_message, so the symptom has prior product evidence. |
| Same completed ticket `requirements-doc.md`, SR-027 / REQ-014 / AC-017 | Existing policy to suppress native collaboration; remaining failure deferred by user. This investigation leaves finalized package/history untouched and does not claim to close AC-017. |
| Generated schema: `codex app-server generate-json-schema --experimental --out <report>/schema` | Installed thread schema accepts sandbox=read-only and free-form config map. Actual protocol, not current web examples, drove the probe. |

## Behavior And Supported Scenarios
BEH-001/SCN-001: ordinary operational start/configure/initialize/create-thread flow. Governing support: official docs and binary help/schema. The mock inference endpoint is synthetic evidence of the actual tool surface, not a new product requirement.
BEH-002/SCN-002: production AutoByteus launch path. Existing approved REQ-014 explains intended native-tool suppression, while SR-027 preserves the unresolved/deferred state.

## Probe Method
`python3 <report>/probe.py --case <case>` creates a fresh test-owned HOME, CODEX_HOME and cwd. It runs the real 0.160.1 executable with a custom local Responses provider, apps/plugins/hooks off, request compression off, no credentials and no copied user config. It calls initialize → initialized → config/read(includeLayers=true) → thread/start(ephemeral=true, read-only) → turn/start. A loopback HTTP mock captures the real request and deliberately returns HTTP 400 before inference. The intentional failed turn is not a product failure or completed-model-turn claim. No tool/subagent is executed.

Raw native tools are in `input[]` items of type `additional_tools`, nested in namespaces, rather than the top-level `tools` field. Tool inspection covers those actual tool declarations; it does not infer availability from text prompts or feature-list values.

Tested model: gpt-6.1-sol. Binary resolved path/hash and initialize CLI version retained in probe-summary.json. All cases use independent processes/config roots.

## Results
| Case | Setting | Effective global agents config | Native collaboration tools |
| --- | --- | --- | --- |
| default | None | Unset | 6 |
| legacy_off | -c features.multi_agent=false -c features.multi_agent_v2=false | Unset | 6 |
| disable_flags | --disable multi_agent --disable multi_agent_v2 | Unset | 6 |
| agents_off | -c agents.enabled=false | false | 0 |
| combined_off | agents.enabled=false plus both legacy false flags | false | 0 |
| agents_file_off | [agents] enabled=false in private config.toml | false | 0 |
| agents_cli_over_file_on | config.toml enabled=true, CLI agents.enabled=false | false | 0 |
| thread_override_on | CLI agents.enabled=false, thread/start.config {"agents.enabled":true} | Global false; explicit thread override true | 6 |
| thread_override_off | Default process, thread/start.config {"agents.enabled":false} | Global unset; explicit thread override false | 0 |

Six native tools: collaboration.followup_task, interrupt_agent, list_agents, send_message, spawn_agent, wait_agent. The same five non-collaboration direct declarations remain in every valid case (functions.exec/wait/request_user_input/request_user_input_async and clock.sleep). Assertions pass for all nine cases and cleanup. Default thread reports multiAgentMode=explicitRequestOnly while still exposing tools, demonstrating that delegation instruction mode is not the hard disable control.

## Setup/Method Corrections
- First attempt used current doc example sandbox spelling readOnly and was rejected by installed protocol before thread creation. Retained under evidence/default-invalid-sandbox-attempt; not counted among nine valid cases.
- First parser looked only at top-level tools and found none. Raw request inspection revealed additional_tools. Parser corrected and baseline re-evaluated from the original raw capture; canonical summaries now reflect all namespace declarations.
- Initial verification mistakenly expected six non-collaboration definitions; actual baseline has five. Corrected to exact-set equality. Final assertions certify the measured set, not the incorrect initial count.
- Local Python lacks tomllib; initial config parse attempt failed. Targeted read-only section extraction was used instead; no personal-config writes occurred.
- Web tool cannot fetch Markdown content-type docs; HTML official pages were successfully fetched and used.

## Interpretation Versus Technical Recommendation
Observed: old controls are accepted/stored as false yet fail to suppress native tools for this binary/catalog model. agents.enabled=false removes them. This resolves the diagnostic uncertainty present in old FAPI-013, but does not establish exact source-internal cause for all versions/models. Historical completed ticket attributes catalog metadata bypass to the upstream issue; current probe independently establishes the effective control without relying on that hypothesis.

Operational guidance, verified on installed 0.160.1:
`codex app-server -c agents.enabled=false`
Alternatively `[agents]\nenabled = false` in the appropriate config.toml. Neither has been applied to personal settings. Process-level configuration is a default and can be overridden by explicit per-thread config, as tested. Restart an independently owned server and create a fresh thread to validate its new configuration; no live user process was restarted here.

Potential AutoByteus follow-up: existing launch policy lacks the effective setting. This is a recommendation, not an authored design or applied patch. A separate source update would need approved scope/design and executable coverage. Retaining legacy flags may help older installs, but older-version compatibility was NOT tested. Codex's native disable is separate from externally supplied AutoByteus MCP collaboration.

## Limits, Risks And Preservation
- No real model inference, authenticated provider request, agent output, actual spawn, saved/resumed-thread experiment, full AutoByteus E2E or deployed/packaged-app verification.
- No universal version/model guarantee. No exact upstream source commit investigation. Documentation still has overlapping controls; measured binary behavior takes precedence for this diagnosis.
- All started direct app-server processes exited, local mock servers closed, private roots deleted. Cleanup is explicit per-case evidence; no claim of universal crash/descendant teardown certification.
- Personal ~/.codex/config.toml, auth, user's running AutoByteus, production data and repository source were not modified. Reports/probe artifacts only live in this outside-repository reporting folder.
- Architecture, Product Design, independent review, implementation, validation-specialist handoff and delivery: N/A — investigation-only request. No final-delivery receipt claimed.

## Supplemental Artifact Inventory
All paths relative to this report root, owner Solution Designer, status Complete evidence, related REQ-001–004/AC-001–004, approval not applicable:
- probe.py: reproducible controlled diagnostic harness. Existing case directories are intentionally not overwritten; copy harness to a fresh report root for a full rerun.
- probe-summary.json / assertions.txt: canonical nine-case summary and checks.
- evidence/<case>/{config.toml,effective-config.json,request.json,events.json,result.json,stderr.log}: isolated config, wire request, RPC stream and cleanup provenance.
- schema/: installed binary's generated protocol schemas; schema-generation.log.
- requirements-doc.md / solution-revision-record.md: diagnostic scope and history, not an approved implementation package.
- result.md / handoff-rules.json: full result and routing context.


## SR-002 — GitHub report reconciliation (evidence-only clarification)
User asks why a GitHub ticket says disabling is not yet supported. The particular ticket/comment has not been supplied, and its live GitHub contents were not fetched. Do not infer that the reporter is wrong, the issue is closed, or 0.160.1 introduced a fix.

Existing read-only evidence `tickets/done/project-task-manager-linked-delegation/investigation-notes.md` E-106 records openai/codex#50880, opened 2026-10-04, reported codex-cli 0.160.0: --disable multi_agent does not prevent catalog-v2 gpt-5.6-sol subagents. E-107 says agents.enabled was documented but unverified in that prior investigation. This is a historical saved account, not a fresh GitHub status check or the complete issue text.

Current evidence independently reproduces ineffective --disable/feature flags on 0.160.1 but observes native tools absent with agents.enabled=false. Difference of controls alone can reconcile the reports; a version-specific fix is NOT established.

Official subagents page was searched/opened again on 2026-10-06 and still documents agents.enabled=false. Re-reading retained raw requests also shows <multi_agent_role>/<multi_agent_mode> in default and legacy_off developer messages, but neither tag in agents_off. No new process or inference was run for this follow-up.

Requirements/intended behavior unchanged. Current result remains investigation-only. Ask user for the exact issue link or quoted comment if they mean another ticket or a claim specifically about agents.enabled=false.


## SR-003 — Live diagnostic bootstrap
User request: “I think you need to do enough experiments… simply ask what kind of tool do you have… see whether… arguments works or not.” Three real app-server turns planned, same tool-inventory prompt, private roots, normal OpenAI/ChatGPT provider, installed 0.160.1 and configured gpt-6.1-sol. Auth file exists; no available OpenAI-platform-api-key tool. Authentication will use a protected temporary copy of existing CLI login, deleted during cleanup. No secrets will be printed/retained and no production settings changed. Current official app-server documentation searched and fetched before execution.


### SR-003 completed live results
Commands: `python3 <report>/live_probe.py --case default`, `--case legacy_off`, `--case agents_off`. Installed Codex 0.160.1, actual configured model gpt-6.1-sol, reasoning low, same user-authenticated provider/account context and same prompt. Each creates its own private HOME/CODEX_HOME/cwd, a mode-0600 temporary auth copy and private catalog copy, initializes with the production AutoByteus client name, starts an ephemeral read-only thread, and asks only for its visible tool inventory. Apps/plugins/hooks/web-search off in all cases to isolate built-in behavior; no user config or external MCP servers copied. Model answers constrained to JSON but tool names were NOT supplied in the prompt.

All three real turns completed:
- default: six collaboration tools reported: followup_task, interrupt_agent, list_agents, send_message, spawn_agent, wait_agent, under collaboration namespace.
- legacy_off: exactly the same six, despite `-c features.multi_agent=false -c features.multi_agent_v2=false`.
- agents_off: collaboration_tools=[]; answer note: “No built-in multi-agent/collaboration tools are available.”

The answers' tool inventories exactly match the earlier independently captured actual tool definitions (taking tools and collaboration_tools union because the legacy case lists collaboration separately). Model self-reports alone are not an enforcement proof; agreement with raw definitions closes the requested diagnostic gap. No tool events or spawns occurred; no user data/files were accessed by these model turns.

Live authentication/inference was explicitly user requested in this turn; earlier no-auth/no-paid-inference statements describe SR-001 only, not these live turns. Model usage/quota occurred, and token-usage events are retained. Original personal auth/config bytes remained unchanged in every case. All owned direct processes exited; private roots including auth copies removed. Only sanitized config/RPC answers/events/results retained.

New evidence supplements: live_probe.py, live-probe-summary.json, live-assertions.txt, live-evidence/{default,legacy_off,agents_off}/ (answers, commands, effective config, completion and cleanup). Owner Solution Designer; status complete; related REQ-005/AC-005 and existing REQ-001–004; investigation evidence only, no architecture/implementation package.

Conclusion: arguments are syntactically accepted but the current AutoByteus feature flags are not the effective hard-disable control for tested binary/model. `agents.enabled=false` works in the real-model tool inventory as well as raw request declarations. No source code/personal setting was changed, no claim about the GitHub issue being fixed, older versions/models, saved resumes, or full AutoByteus behavior.


## SR-004 — Git task bootstrap and implementation authorization
- User: “Perfect. Since you found the correct arguments then, work on the tickets now. Let’s go.”
- Task ticket: tickets/in-progress/codex-disable-multi-agent; same package codex-disable-multi-agent-20261006. Prior diagnostic-only scope retained in solution-history/sr-003-diagnostic, same cumulative SR history continued. Completed project-task-manager-linked-delegation remains historical read-only context.
- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006; branch codex/disable-native-multi-agent-20261006. Refreshed git fetch origin personal; resolved base origin/personal=f48dbfbf39bbf9ed76116943e304248ca387dc7f. Finalization target origin/personal, Delivery-owned, not automatic permission to publish/deploy.
- Initial checkout clean. Original shared personal checkout and unrelated changes untouched.
- Canonical implementation artifacts now live in this isolated ticket; earlier outside-repository diagnostic report is historical, not a competing product/design authority. Copied evidence includes scripts, sanitized requests/RPC completions and checks with manifest.json hashes. No credentials/auth copies included.
- Gates read: solution-designer skill/requirements-engineering; architecture-design/design-principles; root DESIGN.md; package AGENTS.md; TESTING.md; startup_initialization_and_lazy_services.md; design-spec template. No conflicting project principles found.

## SR-005 — Architecture investigation after approval SD-AP-001

### Authorities and source pin
Read in full in this conversation: solution-designer SKILL.md; requirements-engineering.md; architecture-design.md; design-principles.md; requirements/investigation/revision/design templates; root DESIGN.md and TESTING.md; root supplied AGENTS.md and autobyteus-server-ts/AGENTS.md; autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md. OpenAI-docs skill and official documentation were read during the diagnostic phase. No conflicting principles, no additional package DESIGN.md applies. Source evidence is the isolated worktree at fetched base f48dbfbf39bbf9ed76116943e304248ca387dc7f, before any implementation changes.

### Architecture evidence index
All source/test/doc paths in this table are relative to `autobyteus-server-ts/` unless otherwise marked. Evidence inspected through `cat`, `sed`, `nl -ba`, `rg` and `git`; these are investigation, not implementation test execution.

| ID | Exact source | Observed current behavior | Consequence / uncertainty |
| --- | --- | --- | --- |
| AE-001 | src/runtime-management/codex/client/codex-app-server-launch-config.ts:1–50 | Sole ordinary launch-policy composer. parseArgs returns a fresh base-plus-suffix array; suffix contains only features.multi_agent=false and features.multi_agent_v2=false. JSON array of strings wins over string args; malformed/non-string JSON falls back; command and timeout have independent resolvers. | Correct owner, wrong effective control. Parser/command/timeout contracts need no redesign. The comment promises absence without an upstream tool-surface oracle. |
| AE-002 | src/runtime-management/codex/client/codex-app-server-client-manager.ts; src/runtime-management/codex/client/codex-app-server-client.ts | Default client factory invokes resolveLaunchCommand/parseArgs. beginAcquire owns exact workspace-generation leases; startup initializes once. Client spawns the supplied args with inherited process environment by default, supports RPC, and closes the owned process. | One policy correction reaches newly launched shared clients. No startup/lease/auth/env change necessary. Existing client is not retrofitted while reused. Never serialize raw inherited env for evidence. |
| AE-003 | src/api/graphql/types/agent-run.ts; src/agent-execution/services/agent-run-manager.ts; src/agent-execution/backends/codex/backend/codex-agent-run-backend-factory.ts; src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts | Public run creation resolves CODEX_APP_SERVER factory. Create/restore bootstrap constructs model/workspace/prompt/MCP context, then enters thread manager; resources remain factory-owned and released through existing paths. | Agent/member/copy paths share this Codex runtime boundary; no new task-specific feature owner or frontend contract. |
| AE-004 | src/agent-execution/backends/codex/thread/codex-thread-manager.ts:48–53,114–227 | Create and restore share startThread, acquire a client lease, register router, then call thread/start or thread/resume. Both send config.appServerConfig or null. Stored thread identity is preserved. | Correct process defaults flow to both ordinary paths; saved-resume tool-surface effect still requires changed-system validation rather than assumptions. |
| AE-005 | src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts; src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts | Thread config materializer emits only mcp_servers with URL, enabled_tools and startup timeout. No agents.enabled=true is generated on the supported product path. | Raw per-thread re-enable is technically possible (diagnostic proves it), but no supported product caller sets it. Do not add a generic config-enforcement framework. Native disable and external tool grants remain separate authorities. |
| AE-006 | tests/unit/runtime-management/codex/client/codex-app-server-launch-config.test.ts | Five cases pin old suffix, default array isolation, custom string, JSON precedence/fallback and conflicting old feature flags. | Replace the obsolete oracle and cover conflicting agents.enabled=true, preserving parsing behavior. |
| AE-007 | tests/integration/runtime-management/codex/client/codex-app-server-client-manager.integration.test.ts | Gated RUN_CODEX_E2E test injects hardcoded [app-server] rather than production parseArgs; calls getClient/acquireClient/releaseClient which are absent from current manager API. | This stale skipped test cannot certify the new production policy. API/E2E must use current beginAcquire lease API/current tests or author a focused production-composition probe; broad manager-test cleanup is not automatically scope. |
| AE-008 | docs/modules/codex_integration.md:564–578; repository DESIGN.md and startup_initialization_and_lazy_services.md | Integration docs still describe old ineffective flags and unresolved real control; runtime clients intentionally lazy. Auth account/config stays in external Codex authority. | Update narrowly to measured effective setting and retain historical context. Do not claim catalog bug fixed or universal support, and do not eagerly instantiate/refactor runtime owners. |
| AE-009 | evidence/diagnostic/{probe-summary.json,assertions.txt,live-probe-summary.json,live-assertions.txt}; raw evidence and live-evidence beneath that folder | Nine 0.160.1 controlled-provider cases + three completed actual-model inventories distinguish old flags from agents.enabled=false. CLI wins over file config; explicit raw thread override can win over process default. Tool declarations and native role tags disappear only for effective agents false. | Strong feasibility evidence for clean-cut control replacement. Not proof of modified source or AutoByteus MCP/resume acceptance. No native spawn executed. |
| AE-010 | evidence/version-01600/evidence/agents_off/{result.json,request.json,effective-config.json,events.json,stderr.log,config.toml} | Locally installed 0.160.0 actual app-server, private roots and local no-auth Responses provider: agents.enabled=false effective; native collaboration tools absent; same five ordinary tools. HTTP 400 deliberately ends inference after capture. Cleanup process_exited/private_root_removed/mock_server_closed all true. | Control also available on the prior reported binary. No assertion that 0.160.1 fixed GitHub issue; no universal earlier-version/model guarantee. |

### Additional feasibility probe reproduction
Imported the already retained probe.py without modifying it; changed its module ROOT to this ticket's evidence/version-01600 and BINARY to `/Users/normy/.codex/packages/standalone/releases/0.160.0-aarch64-apple-darwin/bin/codex`, then `run_case('agents_off', ['-c', 'agents.enabled=false'])`. Tool-set assertion observed functions.exec/wait/request_user_input/request_user_input_async and clock.sleep, collaboration_tool_names=[]. No real inference or credentials in this additional case. Source/user config unchanged. Test-owned root deleted. This is architecture feasibility evidence, not an implementation/API-E2E result.

### Complete current production path and ownership
Supported initiating operations are user run creation/continue and existing Team/Org/Task runtime creation. Public run service/manager chooses the Codex backend, backend bootstrap prepares the workspace/model and allowed AutoByteus MCP config, thread manager chooses thread start/restore and acquires the exact workspace client lease, client manager composes process launch args through launch-config and initializes its client, client spawns Codex, and Codex builds the turn's native definitions plus configured external MCP tools. Return notifications flow through the existing client/router/thread/backend event pipeline to run consumers. This path explains why the fix belongs in process launch composition, not a prompt, Team coordinator, MCP adapter or frontend.

### Design-health and state findings
No evidenced duplicated policy, new ownership gap, shared-model drift, persistence conversion, concurrency/security boundary change or startup admission change in this narrow delta. Incorrect old config keys are a local implementation defect at the existing healthy owner. Replace those keys, do not layer another legacy branch. Model selection, external provider auth, workspace client generations and stored thread IDs are unchanged. Persisted state: Not Affected; no migration/reset/catalog rewrite needed.

### Remaining validation uncertainty
Changed production source has not yet been implemented or tested. Existing authenticated diagnostic authorization covers bounded verification of this correction, not arbitrary agent work; no native subagent experiment required. API/E2E must verify actual upstream request definitions with a positive unsuppressed control using changed production composition, perform a bounded actual-model inventory smoke, and check preserved external AutoByteus MCP exposure/callability plus ordinary lifecycle/create/restore through test-owned data. Any actual per-thread reenabling on a supported path, required version-gate/compatibility machinery, auth mutation or lifecycle/contract redesign is an escalation back to Solution Designer. Never reuse the user's running app or claim historical evidence certifies modified source.

### Current supplemental inventory and authority
- `evidence/diagnostic/`: preserved sanitized scripts, nine controlled-provider captures and three actual-model RPC inventories; manifest.json hashes the copied files. Owner Solution Designer; completed SR-001–003 evidence; historical REQ-001–005 / current REQ-006–009 design input only; no normative supplement approval required.
- `evidence/version-01600/`: AE-010 no-auth feasibility evidence; Owner Solution Designer; complete; REQ-006/009; not changed-source verification.
- `solution-history/sr-003-diagnostic/`: prior diagnostic requirements/result retained read-only as history; not current implementation authority.
- Historical completed ticket `tickets/done/project-task-manager-linked-delegation/`: REQ-014/AC-017 and API-023/FAPI-013 remain historical/deferred, read-only. This follow-up does not rewrite its acceptance or receipt.
- Original outside-repository report retains generated installed schemas and full prior results; historical reference only. Current requirements/design/revision index in this ticket are canonical.
- Product supplement, independent architecture/code-review artifact: N/A — no Product work, no review on this not-yet-routed completed design. Implementation/API-E2E/delivery artifacts not yet produced.
