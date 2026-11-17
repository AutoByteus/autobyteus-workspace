# Handoff Summary

## Summary Meta

- Ticket: `native-tool-search-515` (Project Task `autobyteus-515`)
- Date: `2026-11-17`
- Classification: `task_size: Medium`, `architectural_risk: High`; route: reviewed (design SR-004; architecture review passed; implementation IR-001; source review CRR-001 Pass 9.5/10; API/E2E `API-REV-001` Pass, final confidence 94.9%; test-code review CRR-002 Pass).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`)
- Branch: `codex/native-tool-search-515`, base `origin/personal` @ `4cbf9e7881` at bootstrap; integrated with `origin/personal` @ `3722dbb1d8` (76 commits; merge `bf5250aef3`, no conflict) before delivery edits. Product source is final at `49867e8dc4`; later commits are tests, reports, evidence and docs.

## Delivery Summary

- Delivered scope:
  - An agent on the AutoByteus native runtime no longer sends every tool's full definition with each request. Its requests carry the four base tools (`run_bash`, `read_file`, `edit_file`, `write_file`) plus the runtime's own `search_tools` and `call_tool`. Every other tool the agent has is searchable: `search_tools` returns up to 5 matches with their full definitions, and `call_tool({name, arguments})` calls one. From the call on, the call is that tool's (argument validation, approval, events, the tool card, the run's history); only the conversation sent back to the model keeps the `call_tool` form, because providers replay it.
  - The request's tool set is the same for the whole run. A definition edit that adds or removes a tool (324) changes only what search finds, so the provider's cache and prefix-bound reasoning (Anthropic thinking blocks) stay valid. A removed tool is refused when called.
  - Where it lives: `autobyteus-ts/src/agent/tool-search/` (`AgentToolSearch`, `search_tools`, `call_tool`) with `AgentConfig.listedToolNames` (default `null`: every tool listed, as before); the native policy is the server backend factory passing `AUTOBYTEUS_DEFAULT_TOOL_NAMES`. Raw traces gain `called_through`; the working-context repairer and the OpenAI schema normalizer (free-form object parameters stay open) were adjusted.
  - Measured: first request PM 7,620 to 2,524 tokens (-5,096), Daily Assistant 8,256 to 2,534 (-5,722); mean per request PM 7,838 to 3,589, DA 10,043 to 3,211; all 12 evaluation tasks succeed on the old and the new build; search-then-call works on all 7 reachable providers (DeepSeek V4 Flash and Pro, Gemini 3.8 Flash, GLM 5.3, Grok 4.7, GPT-5.4 mini, Claude Sonnet 5.5).
  - Persisted data: `Directly Usable - No Migration`. A run written by the old build restores on the new one (three providers).
- Docs synced (`docs-sync-report.md`): `GLOSSARY.md`, `autobyteus-ts/docs/tool_schema_and_configuration.md` (§4.4, §4.5, §4.8), `autobyteus-server-ts/docs/modules/agent_tools.md`, `autobyteus-ts/docs/agent_memory_design.md`, `TESTING.md`. `DESIGN.md` and `RELEASE.md` need no change.
- Durable coverage: `autobyteus-server-ts/tests/e2e/runtime/autobyteus-native-tool-search.e2e.test.ts` (new, mutation-checked), the `autobyteus-ts` unit and integration tests for tool search and the memory records, the live provider suite `native-tool-search-live.test.ts`, `live-tool-list-updates.e2e.test.ts` (now opens the test vault), one `segmentHandler.spec.ts` case for the `call_tool` card, and the `TESTING.md` busy-Mac rule.

## Verification Summary

- Verified from evidence by delivery; no user check is needed. All nine acceptance criteria (all critical) are directly proven; the critical evidence files were opened (`release-deployment-report.md`, Verification).
- Final confidence 94.9% against the 95% target (not met by 0.1). The gap is the environment category (92%): providers without a vault key (Qwen, Mistral, MiniMax, LM Studio, Ollama; Kimi refused for billing) and a busy machine during the broad suites. Delivery judged it sufficient: AC-004 allows a provider that cannot be reached to be recorded with its reason, no critical criterion is unproven, no category is below 90%, and every broad-suite failure is traced to a cause outside this change.
- Key evidence:
  - `evidence/API-04-native-tool-search-server-e2e.log` and `API-04-native-tool-search-e2e.json`: one run through the real studio server, 9 requests with 1 distinct tool set (`run_bash, read_file, edit_file, write_file, search_tools, call_tool`); approvals and END names are the real tools; history never names `call_tool`; the mutation check fails.
  - `evidence/API-07-live-tool-search-all-providers.log`: 7 passed, each `"outcome":"called_correctly"`, `"identicalTools":true`.
  - `evidence/API-08-evaluation-old-vs-new.log`: the token figures above; 12/12 tasks on both builds with the fixed stub.
  - `evidence/API-09-…`, `API-10-…`, `API-11-…`: live Anthropic cache and compaction suites and 324 edits on native, tools unchanged.
  - `evidence/API-13-upgrade-restore.log`: base-build run restored by the new build on three providers.
  - `evidence/DEL-01…DEL-04`: delivery's checks on the merged state.
- Integrated-state check: the base brought 76 commits (phone UI, background-task notices, restart reminders, Docker release speed, contract DTOs). Both typechecks PASS; the 13 native backend and prompt unit files (162 tests, including the factory test both sides changed) and the new server E2E PASS; the gated native background-task suite ran 8 of 9 on the first full run, 8 of 9 on the second, and BGT-01 passes alone: the two failures are the known launch deadline under load (FU-003). One note: BGT-09, which failed on both builds before, passed on the merged state.

## Residual Risks For The User

- Providers without a test-vault key were not run: Qwen (native runs use it today), Mistral, MiniMax, LM Studio, Ollama; Kimi's account is suspended. Search-then-call is provider-neutral (the same two ordinary tools), and 7 of 7 reachable providers pass, so the risk is a provider-specific behavior with `call_tool`'s free-form `arguments`.
- In approval mode, a non-base tool now takes two approvals (the search, then the tool; FU-004). A call of a tool the agent does not have asks for approval before it is refused (FU-005).
- The evaluation ran with stub tool behavior (definitions real), one model (DeepSeek V4 Flash) and two agents. Mean requests per task fell for the Daily Assistant (7.4 to 4.8) and rose a little for the Project Task Manager (4.3 to 4.7).
- The broad suites ran on a loaded Mac (`fseventsd`), so some failures there were traced to the machine and not fixed (FU-003, FU-006, FU-007, FU-008; `TESTING.md` now has the busy-Mac rule).
- The web tool card for a `call_tool` call was proven at the WebSocket and in the web handler, not in a rendered browser; no web or desktop code changed.

## Follow-ups

- FU-001…FU-008 are in `follow-ups.md` (the Solution Designer sends them). Delivery added a note to FU-003 (seen again under load) and FU-008 (BGT-09 passed on the merged state); it found no new problem outside the ticket.

## Release

- No release: the ticket's direction is "release only on the founder's word", and he has not given it. RELEASE.md's default is no release. A release is available. `release-notes.md` holds user-facing notes for the next release.
