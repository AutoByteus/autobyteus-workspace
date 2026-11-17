# Handoff — autobyteus-515 (`native-tool-search-515`)

- Status: **`Architecture Design Complete`** — `task_size: Medium`, `architectural_risk: High`. The founder agreed to build on 2026-11-17 ("You must trust your background knowledge, you will have good design", after the recommendation, measured saving and size were presented; recorded in `design-spec.md` and SR-003).
- Route: handoff rule "Architecture Design Complete with … architectural_risk=High" → `/architecture_reviewer` (independent architecture review before implementation).
- Package: `native-tool-search-515`, current revision `SR-004` (design revised for ARCH-REV-001; requirements basis `SR-001`)
- Task: `autobyteus-515`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the founder
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515`, `codex/native-tool-search-515`; base `origin/personal` at `4cbf9e7881`; finalization target `origin/personal`
- Release: only on the founder's word

## Original request and goals

The founder (2026-11-17): "we also need a tool search for our own runtime as well ... it is important because it is related to token saving." Goal: native agents keep tools they rarely use out of every request, find them by search and call them, on every native provider, with the prompt cache kept; measure tokens per request before and after on a real agent; task success unchanged.

## Result

- Requirements (`requirements-doc.md`, Approved within the direction): the four native base tools stay listed; every other tool is searchable through `search_tools` and called through `call_tool`; requests' tools stay byte-identical for a run; works on every native provider.
- Measured (DeepSeek V4 Flash, provider-reported): tool tokens per request at the start of a conversation: Project Task Manager 7,489 → 2,368 (−68 %), Daily Assistant 8,139 → 2,380 (−71 %).
- Feasibility (live probe on 7 providers): search then `call_tool` correct 21/21; calling the found tool directly by name failed on GLM, Grok and OpenAI.
- Honest money note: DeepSeek bills a cached token at 3 % of an uncached one, so the money saved per request is small when the cache hits; the token and context saving is large; the evaluation records cache reads.
- Design (`design-spec.md`): new `autobyteus-ts/src/agent/tool-search/`; a `call_tool` call becomes the real tool's invocation at stream end (approval, external results, cards, history see the real tool); memory keeps the model's `call_tool` form only in the conversation sent back to the provider; server passes the listed names in one place. `task_size: Medium`, `architectural_risk: High`.

## Artifacts

- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515/tickets/in-progress/native-tool-search-515/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515/tickets/in-progress/native-tool-search-515/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515/tickets/in-progress/native-tool-search-515/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515/tickets/in-progress/native-tool-search-515/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/native-tool-search-515/tickets/in-progress/native-tool-search-515/follow-ups.md` (FU-001, FU-002)
- Evidence: `.../evidence/` (tool schema dump, request tokens, usage census, search-then-call probe and their outputs)

## Open risks

U-001 real cache-hit rate of native runs (measured by the evaluation); U-002 providers not in the test vault (Mistral, Qwen, MiniMax, Ollama, LM Studio) and Kimi (account suspended) are unprobed; R-001 a weaker model may not search (FU-002 is the remedy).

## What the reviewer should look at most

- DS-002/DS-003: converting a `call_tool` call into the real invocation at stream end, and native memory keeping the model's `call_tool` form only in the working context (raw traces real tool + `called_through`), including every rebuild-from-raw-traces path and the tool-protocol repairer.
- DS-001: `tools` byte-identical for a run (the frozen `search_tools` description; runtime tools outside `toolInstances` so `replaceTools` keeps them).
- The validation plan: TESTING.md "The tools a run gets" (whole server unit, integration and E2E suites), per-renderer replay tests, the gated live suite from the probe, and the old-vs-new evaluation (AC-008, AC-009).

## Review history

- ARCH-REV-001 round 1 (2026-11-17): Fail, AR-001 (DS-003). Revised in SR-004: DS-003 now names the three result-writing paths and the rule (raw = real tool, working context = the model's `call_tool` form; repair carries both names); `memory-manager-tool-protocol-safety.ts` added; restart/interrupted-turn examples; step 3 tests assert both records. R-A (`call-tool.ts` owns both conversion directions), R-B (convert only the exact `{name, arguments}` shape), R-C (listed tools in `listedToolNames` order) adopted.

- ARCH-REV-002 (2026-11-17): **Pass** on SR-004. The reviewer handed the package to `/implementation_engineer`. Three leftover "rebuild" wordings in non-authoritative spec rows were tidied afterwards (editorial).

## Next expected action

Implementation (by `/implementation_engineer`), then the team's review and validation route; release only on the founder's word.
