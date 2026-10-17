# Investigation Notes — output-tps-precision

## Investigation Meta

- Package identifier: output-tps-precision
- Request / ticket: Project Task `project_task_6e115ebc-5440-40f3-bc93-ac01fbf9cc94` ("Output TPS: as precise as each runtime allows, with a sound design"), follow-up to `token-meter-tps` (Task b91ece4e, delivered 2026-10-13, `tickets/done/token-meter-tps` on `personal`).
- Requested by: `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); user direction recorded in the Task and in the user's own message in this conversation (2026-10-14).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision`
- Repository mode: Git
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision` / `codex/output-tps-precision`
- Resolved base: `origin/personal` at `1ea74caa2d8e503aa0223c550e22b98f9bb8de08` after `git fetch origin` on 2026-10-14. The shared checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` (branch `personal`, 477 commits behind, with local changes) was not modified.
- Finalization target: `origin/personal`
- Bootstrap result: PASS (new isolated worktree created before any task document).
- Bootstrap blocker: None.
- Current solution revision ID: SR-006
- Authorities read (2026-10-14): solution-designer `SKILL.md`; `references/requirements-engineering.md`; requirements, investigation and revision templates; repository `AGENTS.md`; prior ticket `tickets/done/token-meter-tps/{requirements-doc,design-spec,investigation-notes}.md`. Architecture-phase authorities are listed in `design-spec.md`.
- Investigation status: Complete for requirements and architecture. Codex per-call event timing is code-evidenced only (see RSK-002).

## Initial Request And Clarifications

- Original request (Task): Output TPS shows nothing for ordinary single-call generation (native AutoByteus + DeepSeek Flash stays "Collecting"), and the reading on Claude Agent SDK ("94.5 tokens/s, Estimated · Last reported, 375 output tokens / 4.0 s") is not real TPS. The user wants TPS "as precise as possible for each runtime", using a labelled estimate only where nothing better exists. Every single-call turn must get a value, the UI must be honest about what the number means, and the design is expected to treat TPS as belonging to the agent run (for example, per model call) rather than something the UI infers.
- Clarification received (user, this conversation, 2026-10-14, with a screenshot of the current card): "simplify the UI, the UI has so much redundant words". The user questions "Selected agent only" ("so obviously, user selected the agent"), the timestamp ("Does user really care about the timestamp"), "Estimated" ("why") and "Last reported". Title "Output TPS" should be "just TPS" ("Is there any input TPS? Of course, no"). The simplification must be written into the requirements.
- The user also rejected a live Codex app-server probe I tried to run. I ran no further live probes. Live per-runtime evidence belongs to downstream validation.
- Constraints: keep cost/context/usage accounting intact; no extra paid provider calls just to measure; reuse the earlier attribution learnings (exact selected run, team members, stale/duplicate reports).

## Product And Domain Understanding

- Product area: right-hand workspace **Token** tab, Token Meter, TPS card above "Latest prompt".
- Terminology used in this package:
  - **Model call:** one provider request/response inside a turn. Usage reports with `reports_model_call=true` are one per model call.
  - **Generation speed:** output tokens of one model call ÷ time from the call's first streamed response event to its end. This matches the conventional "output speed" metric: tokens per second after the first chunk arrives. It excludes the wait for the first token and any tool time.
  - **End-to-end call speed:** output tokens ÷ time from the call's request to its end. It includes the wait for the first token (queueing, prompt processing, network) and so reads lower than generation speed, but never inflates.
  - **Report-interval estimate:** the current method (output of a later usage report ÷ time between two consecutive reports in a turn).

## Source Log

| Date | Type | Exact source / command | Why | Finding | Follow-up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-14 | User | Task screenshots `ctx_67986568edfb__44.png` (Daily Assistant, native, DeepSeek; "Collecting — Waiting for another matching usage report in this turn") and `ctx_0068877a59ba__45.png` (Project Task Manager, `claude_agent_sdk · claude-opus-5-5`, 94.5 tokens/s, 375 output tokens / 4.0 s) | Current behavior | Confirms both reported defects | — |
| 2026-10-14 | User | Screenshot in conversation: card "Output TPS / Selected agent only / 119.7 tokens/s / Estimated · Last reported / claude_agent_sdk · claude-opus-5-5 / Oct 14, 2026, 8:08:47 AM / 1,236 output tokens / 10.3 s / How output TPS is estimated" | UI direction | Every line except the number is questioned as noise | REQ-006 |
| 2026-10-14 | Code | `autobyteus-web/stores/tokenUsageThroughput.ts` (119 lines), `TokenUsageThroughputCard.vue`, `tokenUsageMeterStore.ts`, `useTokenUsageWorkspaceScope.ts`, `localization/messages/{en,zh-CN}/shell.ts` (`shell.tokenUsage.throughput.*`), commit `cd28a009e4` | Current implementation | The browser derives TPS from pairs of live usage reports: a baseline report, then (later output ÷ server `observed_at` interval). It needs the same turn/runtime/model and `usageReportCount` +1. A turn with one model call never leaves "Collecting". Nothing is persisted | Replace (DEC-004) |
| 2026-10-14 | Doc | `autobyteus-web/docs/token_meter.md`; `autobyteus-web/docs/agent_execution_architecture.md` ~1788–1790; `autobyteus-server-ts/docs/modules/token_usage.md` ~769–775 | Current documentation | Documents the report-interval method and a runtime table. Must be rewritten | REQ-007 |
| 2026-10-14 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts` ~150–260 | Native timing signal | LlmPhase owns each model call: it builds `llmCallId`, opens `llmInstance.streamMessages(...)` and iterates `ChunkResponse` chunks (`content`, `reasoning`, tool-call deltas via `streamingHandler.feed`); the final chunk carries `usage`. Request start, first chunk, reasoning-vs-content order and completion are all observable in-process. Usage is emitted through `notifyAgentTokenUsageUpdated` per call (`ingestion_kind autobyteus_llm_phase`) | Native can measure generation speed |
| 2026-10-14 | Code | `autobyteus-ts/src/llm/api/*` (`deepseek-llm.ts`, `openai-compatible-llm.ts` ~200–240, `anthropic-llm.ts`, `gemini-llm.ts`, `openai-responses-llm.ts`, …) | Native provider streaming | Providers stream deltas; usage comes on/near the final chunk. Reasoning may be streamed (DeepSeek `reasoning_content`) or hidden (some reasoning models) depending on provider | Hidden-reasoning guard (DEC-002) |
| 2026-10-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-call-usage-tracker.ts` | Claude timing signal | The tracker already pairs main-loop `stream_event` `message_start` with `message_delta` (final usage) and drops subagent frames (`parent_tool_use_id`). It **awaits `readContextUsage()` before emitting**, so the emission time (and the server-assigned `observed_at`) lags the real end of the call | Measure at frame receipt |
| 2026-10-14 | Runtime | Local probe: `claude -p "Write a 120-word poem about rivers. Plain text only, no tools." --output-format stream-json --include-partial-messages --verbose --model claude-opus-5-5`, lines ms-stamped by `/tmp/tps-probe/scripts/stamp.mjs`; output `/tmp/tps-probe/claude-single.tsv` (Claude Code 2.1.296) | Real Claude stream timing for a single-call turn | `message_start` at 3,551 ms; `content_block_start` (thinking) at 3,552 ms; thinking progress deltas (`thinking_delta` with `estimated_tokens`, `thinking_display:"updates"`) every ~1.1–1.5 s; text deltas 19,011–20,467 ms; `message_delta` at 20,487 ms with `output_tokens 1762`, `thinking_tokens 1529`. Generation window = 16.94 s, so **104.0 tokens/s** for a single model call. Text-only window (1.46 s for 233 tokens, about 160 tok/s) shows that only the full start→end window is valid. Thinking `estimated_tokens` sum (~700) disagrees with the final 1,529, so it must not be used | Claude generation speed is feasible and needs no extra calls |
| 2026-10-14 | Code | `backends/codex/events/codex-thread-event-name.ts`; `backends/codex/backend/codex-agent-run-backend.ts` ~220–290; `thread/codex-thread-token-usage.ts`; `thread/codex-thread-manager.ts` ~185–225 (`experimentalRawEvents: true`) | Codex timing signal | The app-server stream carries `turn/started`, `item/started`/`item/completed`, `item/agentMessage/delta`, `item/reasoning/*` deltas, `rawResponseItem/completed` (including tool outputs) and `thread/tokenUsage/updated` (`last` = per-call usage including reasoning). No provider duration. The server observes every event's arrival time. Per-call boundaries: the call ends at its `tokenUsage/updated`; the next call's request goes out after the turn starts or after the preceding tool outputs complete | End-to-end per call is guaranteed; generation-window validity depends on when the reasoning item starts (RSK-002) |
| 2026-10-14 | Code + fixture | `backends/antigravity/stream/agy-stream-event-converter.ts` ~109–166; `tests/fixtures/agy-compaction/agy-stream-auto-compaction.stdout.jsonl` (recorded AGY, model `gemini-3.8-flash-low`) | AGY timing signal | `agent_response` steps stream `ACTIVE` `text_delta` updates. The `DONE` update carries `usage` **and a provider-reported `duration_seconds`** (e.g. 2.67 s for 4 output tokens with a 91,676-token prompt, so the duration includes prompt processing). `thinking_tokens` is separate, and thinking text is not streamed as `text_delta`. The converter currently ignores `duration_seconds` on `agent_response` | AGY has a provider-reported end-to-end call duration; first `text_delta`→DONE is valid only without hidden thinking |
| 2026-10-14 | Code + fixture | `backends/grok/grok-build-session-profile.ts` ~48–62, `grok-build-call-usage.ts`; `backends/acp/events/acp-session-update-converter.ts`; `tests/fixtures/grok-acp/prompt.jsonl` (Grok CLI 1.0.41) | Grok timing signal | `response_completed` (per call) has usage but no duration or timestamp. Chunk notifications carry `_meta.agentTimestampMs`, but about 30 `agent_thought_chunk`s for 84 reasoning tokens share 148446–148449 ms (burst delivery), and the reply chunk lands ~60 ms before completion. `turn_completed.usage` has `apiDurationMs` (3,271 ms for 2 calls, 146 output) and per-model `modelUsage.*.apiDurationMs` per **turn** | Grok chunk timing does not measure generation. Per call, use the server-observed request→`response_completed` window (end-to-end) |
| 2026-10-14 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` (`TokenUsageUpdatedPayload`, `createTokenUsageUpdatedPayload`) | Carrier | The canonical per-call usage observation already carries run/turn/call/model identity, `reports_model_call`, output counts and `observed_at` (source timestamp or normalization time). Its fields are copied explicitly, so unknown fields are dropped | A timing field needs explicit normalization |
| 2026-10-14 | Code | `grep TOKEN_USAGE_UPDATED` across server/web/contracts: ~33 files, incl. `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts`, `autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts`, server team/collaboration adapters, web `agentStreamMessageProjector.ts`, `teamStreamDtoAdapters.ts`, `teamExecutionViewState.ts` | Transport reach | Usage events already reach the exact run across standalone, Team, Org and collaboration routes with attribution and duplicate handling proven by token-meter-tps. A new event type would need all these routes again | Reuse the usage observation as carrier (design) |
| 2026-10-14 | Doc | `autobyteus-server-ts/docs/modules/token_usage.md` ~370–390, ~467 | Output/reasoning semantics | Platform rule: "Reasoning tokens remain a visible subset of output and are not double-counted." AGY maps `thinking_tokens` to reasoning output | TPS numerator = the call's reported output count (no reasoning addition), consistent with accounting |

## Relevant Existing Behavior And Supported Product Paths

| ID | Kind | Trigger | Current path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User opens Token tab for a selected agent | Card "Output TPS" with qualifier, runtime/model id, local timestamp, tokens/seconds, help disclosure | Wordy card; user calls most lines redundant | User screenshot; card source | High |
| BEH-002 | System | Agent produces model calls in a turn | Browser pairs consecutive live usage reports (same turn/model) | Single-call turns: never a value. Multi-call turns: rate includes tools, waits, prompt processing and reporting delays (e.g. Claude's context read before emission) | `tokenUsageThroughput.ts`; screenshots; Claude tracker | High |
| BEH-003 | System | Select standalone host / Team/Org member / delegated copy | TPS uses the exact selected run, never a cost roll-up; Team double dispatch de-duplicated | Correct attribution (delivered and verified in token-meter-tps) | prior ticket design/verification | High |
| BEH-004 | System | Reload / reopen history / reconnect | Session-local; no TPS after reload | "No session-local report pair…" message | prior ticket | High |

## Relevant Codebase And Technical Facts

| Component | Current responsibility | Requirement implication | Architecture question |
| --- | --- | --- | --- |
| Runtime adapters (native LlmPhase, Claude tracker, Codex backend, AGY converter, Grok/ACP profile) | Emit one per-call usage observation | Only they can see request/first-output/completion times precisely | Where to measure: each adapter, on the server clock |
| `createTokenUsageUpdatedPayload` / accumulator / persistence | Normalize, fold, persist accounting | Must keep accounting identical | Timing must pass through without affecting accounting or persistence |
| Strict presentation/team DTOs | Validate the payload on Org/collaboration/Team routes | New field must be allowed on every route | Optional, additive field |
| Web meter + `tokenUsageThroughput.ts` | Browser-side estimator | Becomes obsolete if the server measures per call | Clean-cut removal |

## Structural And Payload Surface Inventory

- Payload: per-call timing facts on the usage observation; localized card/help strings (en, zh-CN); docs.
- Structural: runtime adapters (5 runtime kinds; ACP generic layer serves Grok), canonical usage payload type and normalizer, two shared DTO packages (additive optional field), web meter store/helper/types/card.
- Potential structural impacts: API/contract change = additive optional field on existing stream payloads (no new message type). Persistence: none intended. Security/privacy: none (timing numbers only). Concurrency/lifecycle: per-call timing state inside each adapter, reset on call/turn/process boundaries. Migration: none.

## Runtime, Probe, Or Reproduction Findings

| Method | Scenario | Observation | Implication | Artifact |
| --- | --- | --- | --- | --- |
| Claude CLI stream-json probe (above) | Single-call plain-text turn, Opus 5.5 with thinking | 1,762 output / 16.94 s = 104.0 tok/s between `message_start` and `message_delta` | Single-call turns can get a real generation-speed value on Claude | `/tmp/tps-probe/claude-single.tsv` (scratch, not promoted) |
| Recorded AGY fixture | 4 short turns | `duration_seconds` per DONE step; prompt-heavy, tiny outputs | AGY duration is end-to-end; tiny outputs give tiny TPS (needs a minimum-sample rule) | fixture path above |
| Recorded Grok fixture | 2-call turn | Burst delivery of chunks; `apiDurationMs` per turn | Grok first-chunk timing is invalid for generation speed | fixture path above |
| Codex app-server live probe | — | Not run: the user rejected the tool call | Codex generation-window eligibility to be confirmed in validation | — |

## Stakeholder And User Evidence

| Source | Need | Strength | Implication | Open |
| --- | --- | --- | --- | --- |
| User via Task | Real TPS per runtime, single-call turns, honest meaning, run-owned design | Explicit | REQ-001–005, REQ-007 | — |
| User in conversation | Minimal card: "TPS", no "Selected agent only", no timestamp, no "Estimated · Last reported" wording | Explicit | REQ-006 | — |

## External Contracts, Standards, And Dependencies

| Dependency | Version | Behavior | Evidence | Risk |
| --- | --- | --- | --- | --- |
| Claude Code CLI stream-json with partial messages | 2.1.296 (probe) | `message_start`/`message_delta` per API message on `stream_event`; thinking progress deltas | probe | Future CLI framing changes |
| Codex app-server | codex-cli 0.162.1 installed | Item/delta notifications; `thread/tokenUsage/updated` per call | source | Exact reasoning-item start timing unverified (RSK-002) |
| AGY CLI | per fixture | `duration_seconds` on DONE steps | fixture | Semantics (end-to-end) inferred from prompt-heavy sample |
| Grok CLI ACP | 1.0.41 fixture | burst chunks; turn-level `apiDurationMs` | fixture | Newer CLI may differ |
| Industry convention: "output speed" = output tokens per second after the first chunk is received (excludes time to first token) | Common LLM benchmark practice | Defines generation speed | Domain knowledge | — |

## Persisted Data And State Facts

- Affected stored subject: none intended. Token usage records, analytics and run summaries stay unchanged.
- Readings are live observations. Today they are lost on renderer reload. The user's request does not ask for TPS history.
- Remaining evidence gap: none for requirements.

## Product Design Request Context

- Product Design request: Not stated. The user gave direct card-content direction, captured in REQ-006.
- Product Design Findings: N/A — not applicable.

## Supplemental Artifact Inventory

| Path | Owner | Purpose | Scope | IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| Task context `.../context/ctx_67986568edfb__44.png`, `.../context/ctx_0068877a59ba__45.png` (full paths in requirements) | User/Task | Current-state evidence | BEH-001/002 | REQ-001,002 | Read | Evidence only |
| Conversation screenshot `/private/tmp/claude-501/-Users-normy-autobyteus-org-autobyteus-workspace-superrepo/d2a738d7-e7dd-4032-ae63-9b0c53dd4513/images/1.png` | User | Card simplification direction | BEH-001 | REQ-006 | Read | Evidence only (direction is in REQ-006 text) |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why it matters | Resolution / owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Hidden reasoning: when reasoning is generated before the first observable output, first-output→end timing inflates TPS | Precision/honesty | Method rule DEC-002: use generation speed only when the first observed event provably precedes generation; otherwise use end-to-end | Designed |
| RSK-002 | Unknown | Codex: whether the reasoning `item/started` (or another app-server event) arrives when reasoning starts rather than when it finishes | Decides Codex generation vs end-to-end | Default Codex to end-to-end. Upgrade only with recorded live evidence (validation) | Open → validation |
| RSK-003 | Risk | Burst/batched delivery (Grok) makes chunk times meaningless | Precision | Grok uses end-to-end | Designed |
| RSK-004 | Risk | Tiny calls (a few tokens, tool-call-only) give noisy or meaningless TPS | UX | Minimum-sample rule (DEC-003) | Designed |
| RSK-005 | Risk | AGY `output_tokens` vs `thinking_tokens` inclusion is not proven (fixture thinking = 0); platform treats reasoning as a subset of output | Numerator correctness for AGY thinking models | Keep the accounting rule; validation records an AGY thinking sample if available; any accounting defect is a follow-up, not this ticket | Open (non-blocking) |
| ASM-001 | Assumption | Server clock times are taken in one process, so durations are comparable; no cross-machine clocks are mixed | Validity of durations | Design uses monotonic timing within adapters | — |

## Architecture Investigation Findings

See design-spec.md "Current-State Read". Additional facts gathered in the architecture phase:
- The canonical per-call usage payload and its stream path are the only per-model-call events every route already carries with exact-run attribution (E: transport grep). Adding an optional, normalized object to it needs the server normalizer, two strict DTO schemas and web types. A new event type would need about 15 transport touchpoints and re-proof of Team double dispatch.
- Accounting (`token-usage-run-fold`, accumulator, persistence transformer) reads named numeric fields only. An extra timing object does not affect folding. The persistence transformer must not write it (verify in implementation).
- `observed_at` for Claude is assigned at normalization, after the tracker's `await readContextUsage()`. Measurement must therefore use frame-receipt times captured in the tracker, not `observed_at`.

### SR-003 findings (run-owned latest TPS, 2026-10-14)

| Source | Finding | Implication |
| --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` (428 lines) | `AgentRun` already owns live run state in small private owners (`AgentTurnLifecycleState`, `AgentRunInputAdmissionState`, `AgentRunInterruptState`, …). It observes canonical events after dispatch in `publishSourceEvents → onCanonicalEventsDispatched` (e.g. `observeAgentRunInputEvents`) and exposes snapshots (`getStatusSnapshot`, `getInputStateSnapshot`). `subscribeToEvents` pushes the input-state snapshot to each new listener | Latest TPS fits as one more small run-owned state observed from canonical usage events, read via a getter |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` ~162–165 | `getActiveRun(runId)` returns the live `AgentRun`. It is used for "live data from the active run" by `run-file-change-projection-service.ts` ~93, `published-artifact-projection-service.ts` ~115 and `application-agent-stream-runtime-source.ts`. Team/Org/task handles create member runs through `AgentRunManager` (`flat-team-agent-execution-handle.ts`, `configured-agent-execution-registry.ts`, `configured-agent-execution-handle.ts` ~472) | One by-run-id read serves standalone, Team member, Org member and delegated copies. **Verify** each route in implementation |
| `grep AGENT_INPUT_STATE` across server/web/contracts | A dedicated run-state event type touches about 29 files (event type, four route projections, team/org/collaboration reconnect view snapshots, web parser/handlers, three contract packages) | A dedicated "latest TPS" event type would repeat that plumbing. This is the cost the user named; it belongs to the unified run-data follow-up |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` ~316–360; web `stores/tokenUsageMeterStore.ts` ~338 | Token tab loads run data through GraphQL queries per selection (agent run, standalone, team member, org member summaries) | A run-scoped query for the active run's latest TPS matches the existing load pattern |
| `token-usage-run-record-state.ts` ~125–200; Prisma `token_usage_run_records` (`latest_prompt_tokens`, `latest_model_*`); migration `20261009120000_token_meter_context_readings` | Run records persist "latest" readings; adding TPS there would need new columns and a migration | Rejected by user decision: TPS is runtime data. No schema change |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–4 (read 2026-10-14) | Prefer no migration; additive optional fields; current-only runtime | Not triggered: nothing persisted changes |

### SR-004 note (2026-10-14)

| Source | Finding | Implication |
| --- | --- | --- |
| `token-usage-snapshot-delta-normalizer.ts` ~11–56, `token-usage-component-basis-resolver.ts` ~10, `token-usage-run-fold.ts` ~36 (`zeroTokenUsageContribution` spreads payload) and ~86 (`normalizeAuthoritativeContribution` spreads) | Fields set when the canonical payload is created survive enrichment and fold unchanged | Decide TPS at payload creation, independent of accounting. Implementation adds survival tests |
| `codex-thread-token-usage.ts` (`last` = per-call usage; `selected = total ?? last`) | Codex `reported_output_tokens` is cumulative; `last.outputTokens` is the call's own output | The adapter supplies the call's own `output_tokens` in its measurement |
| Web `tokenUsageMeterStore.ts` ~266–310 | The seen-key check precedes the summary check | TPS is recorded after the seen-key check, independent of persistence |
| User 2026-10-14 | No reload support needed | No server state, no load query |

### SR-006 findings: Codex call end (code review CR-F01 / CRR-002, API-L04, 2026-10-14)

Command: `python3 -I /tmp/tps-probe/scripts/codex-timeline.py <wire>` on `evidence/api-e2e/live/codex/codex-wire.jsonl` and `evidence/api-e2e/live/codex-repeat/codex-wire.jsonl` (codex-cli 0.162.1, gpt-5.6-luna, captured by API/E2E). Times are ms after `turn/started`.

| Observation | Sample 1 (tool turn) | Sample 2 (tool turn) | Implication |
| --- | --- | --- | --- |
| Tool-ending call: `rawResponse/completed` | 11,172 (from turn 2 start 7,503: 3,669) | 3,168 | The model call ends here |
| `item/started commandExecution` → `item/completed` | 11,483 → 14,370 | 3,367 → 6,252 | The tool runs after the call ends |
| That call's `thread/tokenUsage/updated` (`last.outputTokens` 112 / 115) | 14,373 | 6,255 | Usage arrives only after the tool, so it must not be used as the call end |
| Next call: `rawResponse/completed` → usage | 16,751 → 16,754 | 8,511 → 8,514 | For text-ending calls, usage follows the end immediately |
| Single-call turn (L03): `rawResponse/completed` → usage | 5,445 → 5,450 | — | Correct today |

- `rawResponse/completed` params carry `threadId`, `turnId`, `responseId` and `usage` (`outputTokens` 210 / 112 / 173, equal to the paired `last.outputTokens`). There is exactly one per model call in all samples.
- `CodexThreadEventName` has no constant for it. The server already enables `experimentalRawEvents: true` (`codex-thread-manager.ts` ~198, ~224).
- No approval request appears in these samples. An approval wait sits between the call end and the tool's `item/completed`.
- Other runtimes end calls before tools run: Grok `response_completed` precedes `tool_call` (Grok fixture), AGY's `agent_response` DONE precedes tool steps, Claude's `message_delta` precedes tool use, and native's `is_complete` precedes tool execution. **Only Codex is affected.**

## Requirement Implications

- Single-call measurement requires per-call timing from each runtime, not report pairs (REQ-001/002).
- Method varies by runtime because signals differ, so the reading carries its method and the UI explains it (REQ-003/004).
- The user's card direction narrows visible content (REQ-006).

## Notes For Architecture Design

- Measure in the runtime adapters on the server clock. Carry per-call timing on the existing per-call usage observation. Compute TPS once on the server. The web shows it.
- Remove the browser report-interval estimator (no dual methods).
- Keep exact-run attribution and the de-duplication learnings. No persistence/schema change.
