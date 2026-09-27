# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-011`
- Package identifier: `grok-build-runtime-support`
- Request / ticket: Grok Build (xAI `grok` CLI) as a first-class AutoByteus agent runtime + refresh of the `autobyteus-ts` Grok provider model row
- Requirements owner: Solution Designer (`/solution_designer`)
- Date: 2026-09-26
- Evidence base: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support` at `origin/personal` @ `1676bede9` (see investigation notes, SR-002 evidence correction)
- Approval state and reference: **Approved by the user on 2026-09-26** — user message: "do you think building a reusable ACP layer is better, if yes. then approved"; Solution Designer answered yes (rationale recorded in SR-005), which the user made the approval condition. Approval covers SR-004 plus REQ-018/AC-016 added in SR-005. SR-008 (architecture review ARCH-REV-001): REQ-011/AC-009 clarified to one record per model call (same totals; pricing correctness unchanged in intent); REQ-016/AC-013 extended to `workflow` child agents (already within "native subagent spawning") and `ask_user_question` (Claude precedent, applied under the user's standing 2026-09-26 direction to resolve such decisions from existing runtime implementations); AC-004 wording aligned to canonical `run_bash`. SR-009: the user directed (relayed by `/api_e2e_engineer`, 2026-09-26) that application-launch testing (AC-015) be left out of this ticket and the application problems be handled in a future ticket; REQ-017/AC-015 are recorded as deferred. SR-010 (failure-origin review CRR-002): REQ-005 rationale clarified by precedent (CR-007, user's standing direction); AC-004 deny outcome (CR-006) amended and **approved by the user on 2026-09-26** ("I think what your proposal is reasonable", SR-011); REQ-017/AC-015 remain deferred per SR-009 (CR-005).
- Exact approved requirements baseline / solution revision: `SR-005` (this document as of SR-005; decisions DEC-000..DEC-009 as resolved in SR-003/SR-004)
- Behavior-defining supplements and their approved versions: None (evidence supplements only)

## Problem And Desired Outcome

- Problem: AutoByteus runs agents on four runtimes — native `autobyteus`, Codex App Server, Claude Agent SDK and Antigravity CLI (`antigravity_cli`, released v1.4.81) — but not on xAI's Grok Build agent harness, although the installed `grok` CLI exposes a purpose-built embedding protocol (ACP over stdio). Separately, the `autobyteus` runtime's built-in Grok provider row is pinned to `grok-4.6`, while xAI's current recommended model is `grok-4.7`.
- Affected actors or systems: users launching standalone agent, team, org and application runs; AutoByteus server runtime management and agent execution; frontend runtime/model selection and token-usage views; the `autobyteus-ts` LLM catalog.
- Desired outcome: (1) **Grok Build** is a fifth runtime, selectable wherever the other external runtimes are, with the same product contract as Codex/Claude (streaming, tool cards, interactive approvals, interrupt, exact resume, team communication, skills, raw-trace memory, token usage), using the user's own `grok` installation and Grok authentication; (2) the `autobyteus` runtime offers `grok-4.7` instead of `grok-4.6`.
- Observable definition of success: with a working `grok` CLI a user can pick **Grok Build**, choose `grok-4.7` and a reasoning effort, run a standalone agent and a mixed team where a Grok member uses `send_message_to`, approve/deny a tool, interrupt a turn, stop and reopen the run with history and continuity intact, and see tokens/cost in usage views; without `grok` the runtime is disabled with a safe reason; the `autobyteus` runtime lists `grok-4.7` and not `grok-4.6`; the four existing runtimes behave exactly as before.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Runtime picker lists `autobyteus`, `codex_app_server`, `claude_agent_sdk`, `antigravity_cli` from async `runtimeAvailabilities`; unavailable runtimes are disabled with a provider reason (AGY uses safe classified diagnostics) | A fifth kind `grok_build` labeled **Grok Build** appears; enabled when the Grok command (default `grok`, overridable by a documented environment variable) resolves and supports ACP agent mode at a supported version; otherwise disabled with a safe, classified reason (no raw stderr, paths or credentials) | Four existing runtimes and the capability-driven picker unchanged | IN Source Log: `runtime-kind-enum.ts`, `runtime-availability-service.ts`, `antigravity-cli-capability.ts` |
| BEH-002 | User | SCN-002 | Model list per runtime via `runtimeModelSelectionCatalog`; `RunModelSelectionService` validates the identifier and `llmConfig` against the model's `config_schema`; catalog failure → model-unavailable with a safe diagnostic (AGY) | For `grok_build`, models are those reported by the connected Grok agent (ACP handshake, no inference): display name, context capacity (`totalContextTokens`) and a `reasoning_effort` enum schema from the agent's advertised efforts and default (e.g. `high`); the selected model and effort are applied to the session; no hard-coded Grok Build model list in AutoByteus | Catalog/selection behavior of other runtimes | Probe 0; `model-catalog-service.ts`, `run-model-selection-service.ts` |
| BEH-003 | User | SCN-003 | External-runtime runs stream turn lifecycle, reasoning/text segments, tool cards + lifecycle, usage and errors through the normalized event spine; raw traces recorded | Same for Grok Build: reasoning (`agent_thought_chunk`), assistant text (`agent_message_chunk`), tool cards with arguments and results for Grok built-in tools and MCP tools, turn started/completed, errors; provider bookkeeping (announcements, settings, command lists, queue/session bookkeeping) never shown as chat content | Event spine, websocket transport, recorder, frontend rendering | Probe 1; `agent-run-event.ts`, AGY converter |
| BEH-004 | User | SCN-004 | Codex/Claude: `autoExecuteTools=false` surfaces approval requests; `true` auto-approves. AGY (headless, no approval bridge): new AGY drafts default auto-execute **on** via an AGY-only frontend policy | Grok Build supports interactive approvals: `autoExecuteTools=true` → session in always-approve (`yoloMode`); `false` → each Grok permission request becomes an AutoByteus tool-approval request; approve → allow once, deny → reject once (never "always" grants). Grok uses the **standard** launch default (the AGY-only default-on policy is not applied) | Approval UI/event contract; AGY-only default-on policy stays AGY-only | Probe 2; `agentRunRuntimeDraftPolicy.ts`, `antigravity_cli_runtime.md` §Tools |
| BEH-005 | User/System | SCN-005 | External members get the shared Carpenter prompt (Team Instruction + Addressing + Collaboration) and a run-scoped Agent Tools MCP session (`get_handoff_rules`, `send_message_to`, `delegate_task`); provider tool names canonicalized | Same for Grok Build members (team and org): the composed Carpenter prompt is injected into Grok's system prompt (`rules`), as Codex/Claude inject it into their system slot; Agent Tools MCP attached as an HTTP MCP server to the session; calls made through Grok's `use_tool` indirection are displayed and recorded under the canonical AutoByteus tool name | Team/org routing, dispatcher and delegation semantics | Probe 3; AGY factory `activateMcp`; `codex_integration.md` |
| BEH-006 | User | SCN-006 | Stopped external runs reopen with local-trace history and resume the exact provider conversation (Codex threadId, Claude sessionId, AGY conversationId); mismatch is terminal | Grok Build: the Grok `sessionId` is the durable provider binding; reopen resumes exactly that session in the same workspace (`session/load`); history replays from local raw traces only (Grok's replayed updates are not re-emitted as live events); load failure or id mismatch is terminal, never a silent new session | Exact/durability-gated restore; local-trace-only projection | Probe 4; `agent-run-restore-context-factory.ts`, `agent-run-resume-config-service.ts` |
| BEH-007 | System | SCN-007 | Providers emit `TOKEN_USAGE_UPDATED` with runtime/ingestion kind and scope; analytics label maps cover `autobyteus`, `codex_app_server`, `claude_agent_sdk` | Grok Build records per-turn input, cached-read, cache-creation, output and reasoning tokens and model-call count under runtime kind `grok_build`; cost estimated through the existing catalog pricing path (`model_provider: GROK` → trusted `grok-4.7` schedule), otherwise pricing status `missing`; provider-reported cost (`costUsdTicks`) kept only in raw usage; analytics shows a "Grok Build" label | Ledger/analytics contracts | Probe 1; `agent-run-token-usage.ts`, AGY usage emission |
| BEH-008 | System | SCN-008 | Codex/Claude symlink configured skills into `.codex/skills` / `.claude/skills` via the shared materializer; AGY copies a checked snapshot into its run capsule | Grok Build: configured skills symlinked into `.grok/skills/<name>` in the run working directory (Grok discovers `.grok/skills`) using the shared materializer with the same collision/repair/release rules and skill-access-mode handling | Skill resolution and access-mode behavior | README §Skills; `*-workspace-skill-materializer.ts` |
| BEH-009 | User | SCN-003 | Codex: local paths in a `Reference files:` text block, eligible images as image items | Grok Build: local paths in the `Reference files:` text block; no image prompt blocks (Grok reports `promptCapabilities.image=false`) | Shared context-file resolver | Probe 0 |
| BEH-010 | User | SCN-009 | `autobyteus` runtime Grok provider exposes exactly `grok-4.6` | Exposes exactly `grok-4.7` (500k context; $2.00/$6.00/$0.50 per M ≤200k input; $4.00/$12.00/$1.00 above; `reasoning_effort` low/medium/high/xhigh default high; xAI Chat Completions path unchanged); `grok-4.6` retired without alias | `GrokLLM` request policy, provider display, `provider.grok.api-key` binding | xAI docs + API snapshot |
| BEH-011 | Operational | SCN-010 | Missing/unsupported CLI → runtime disabled; provider auth failures surface as run errors; no AutoByteus login UI for Codex/AGY | Grok Build auth is Grok-owned (CLI browser login, or the user's own `XAI_API_KEY` in the server environment); no AutoByteus login UI, vault binding or credential relay; unauthenticated/rate-limited Grok surfaces the provider's error text in the run | Codex/AGY external-account boundary | README §Authentication; probe stderr (429) |
| BEH-012 | User | SCN-003 | Codex/Claude interrupt cancels the turn and the run stays usable; AGY interrupt stops the process | Grok Build: interrupt cancels the active turn (`session/cancel`); the turn is reported interrupted; the run stays active, idle and accepts the next message | Interrupt contract | Probe 5 |
| BEH-013 | User | SCN-011 | Application runs can use any external runtime wired into the Application execution scope; launch preflight validates the model through the runtime catalog and reports `RUNTIME_AUTHENTICATION_UNAVAILABLE`/`MODEL_UNAVAILABLE` issues | Grok Build is available to application runs with the same preflight: catalog-based model validation and safe diagnostics | Application launch validation for other runtimes | `application-launch-host-capability-validator.ts`, `application-execution-scope-kernel-builder.ts` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| End user (agent/team/org/app operator) | Run agents on Grok Build with their own Grok plan | End-to-end parity with Codex/Claude | Limited Grok credits; failures must be explicit |
| AutoByteus server | Own run identity, history, approvals, team routing, usage | Uniform contracts across five runtimes | Grok owns its conversation state and credentials |
| `grok` CLI (external) | Execute the agent loop, tools, model calls | Driven over ACP stdio | 1.0.41 verified; extensions may evolve |
| Maintainers | Keep runtime additions bounded | Registration + bounded Grok owner; no change to the four existing runtimes | No compatibility shims |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001 Select Grok Build for standalone runs, team members, org members and application runs (BEH-001, BEH-013).
- UC-002 Choose a Grok model and reasoning effort (BEH-002).
- UC-003 Converse: streaming, tool cards, approvals, interrupt, context files (BEH-003, BEH-004, BEH-009, BEH-012).
- UC-004 Grok Build as a team/org member using team communication/delegation tools (BEH-005).
- UC-005 Stop, reopen and continue a Grok Build run (BEH-006).
- UC-006 Token/cost accounting for Grok Build runs (BEH-007).
- UC-007 Configured skills for Grok Build runs (BEH-008).
- UC-008 Availability and provider-owned authentication/error surfacing (BEH-011).
- UC-009 `autobyteus` runtime Grok provider row refreshed to `grok-4.7` (BEH-010).
- UC-010 Documentation of the new runtime module and catalog boundary (docs sync, delivery-owned).

### Out Of Scope

- Any change to the `autobyteus`, `codex_app_server`, `claude_agent_sdk` or `antigravity_cli` runtimes' behavior — including the pre-existing absence of an Antigravity label in token-usage analytics (separate-ticket candidate).
- Grok headless mode (`grok -p`), WebSocket `grok agent serve`, and Grok's shared "leader" process mode.
- Provisioning/installing the `grok` CLI in Docker images or Electron bundles; login flows; enterprise OIDC/external auth providers.
- Grok-specific server settings for sandbox profiles or permission rules (`--sandbox`, `--allow/--deny`); Grok hooks, plugins, memory, worktrees, dashboard, voice.
- Using the vault's `provider.grok.api-key` to authenticate the Grok Build runtime (DEC-002).
- Adding other xAI API models (`grok-4.3`, `grok-4.20-*`, `grok-build-0.1`) to the `autobyteus` catalog (DEC-003).

### Non-Goals

- Semantic memory/compaction for Grok runs inside AutoByteus (Grok manages its own context; AutoByteus records raw traces only).
- Displaying Grok-native history (`updates.jsonl`) as UI history.
- Exposing Grok "always allow" remembered grants through AutoByteus.

### Preserved Behavior Boundary

- The "Intentionally Preserved Behavior" column of BEH-001..BEH-013; REQ-014; AC-014.
- Cross-cutting invariant: the new runtime is additive registration plus Grok-owned modules; existing runtimes' bootstrap, events, restore, memory, catalog, launch policy and approval behavior are unchanged.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | AutoByteus supports runtime kind `grok_build` (label "Grok Build") executing agent runs through the local `grok` CLI's ACP stdio agent mode; it is an external-provider runtime everywhere the other external runtimes are | BEH-001, BEH-003 | Must | User request; ACP is the vendor embedding path | User 2026-09-26; README §Agent Mode |
| REQ-002 | `grok_build` availability is enabled iff the Grok command (default `grok`, documented env override) resolves, reports a supported version, and supports ACP agent mode; otherwise disabled with a safe, classified reason; the probe is bounded and non-blocking | BEH-001, BEH-011 | Must | Parity with AGY/Codex/Claude availability | `antigravity-cli-capability.ts` pattern |
| REQ-003 | The `grok_build` model catalog is the model list reported by the connected Grok agent without inference, with display name, context capacity and a `reasoning_effort` enum schema from the agent's advertised efforts and default; selection is validated by the existing run-model-selection path; the chosen model and effort apply to the session | BEH-002 | Must | Catalog depends on auth/plan | Probe 0 |
| REQ-004 | Grok ACP updates are normalized into the existing event spine (reasoning and text segments, tool cards with arguments/results, tool lifecycle, turn started/completed/interrupted, errors); provider bookkeeping notifications are not surfaced as chat content | BEH-003, BEH-012 | Must | Uniform UI/history | Probe 1 |
| REQ-005 | With `autoExecuteTools=false`, each Grok permission request becomes an AutoByteus tool-approval request answered per call (allow-once / reject-once); with `true`, the session runs in always-approve; Grok uses the standard launch default, not the AGY-only default-on policy | BEH-004 | Must | AutoByteus is the approval surface for every approval request Grok raises and never grants on the user's behalf (only allow-once/reject-once from the user's decision). Which calls need approval is decided by Grok's own permission policy — the same division as Codex (`on-request` + sandbox) and Claude (`default` mode) (SR-010, CR-007 clarification) | Probe 2 |
| REQ-006 | Every Grok Build run injects the shared composed AutoByteus prompt into Grok's system prompt (ACP `rules`), keeping Grok's own harness guidance, and records the supplied text through the existing system-instructions Activity; team/org members additionally get the Agent Tools MCP server attached over HTTP; `use_tool` invocations are displayed and recorded under the canonical AutoByteus tool name | BEH-005 | Must | Same system-slot injection as Codex/Claude; Grok MCP indirection | DEC-005; probes 1, 3 |
| REQ-007 | If the run exposes Agent Tools MCP tools and Grok reports that server as not ready at session start, run activation fails with an explicit error instead of continuing without tools | BEH-005 | Must | Silent tool loss observed | Probe 3 (failed server) |
| REQ-008 | The Grok `sessionId` is the run's platform run id; reopen resumes that exact session in the same workspace; load failure or id mismatch is terminal; UI history replays from local raw traces; replayed Grok updates are not re-emitted as live events | BEH-006 | Must | Exact-resume policy | Probe 4 |
| REQ-009 | Context-file references are passed as a `Reference files:` text block with local absolute paths; images are not sent as prompt image blocks | BEH-009 | Must | No image prompt support | Probe 0 |
| REQ-010 | Interrupt cancels the active Grok turn; the turn is reported interrupted; the run stays active and idle | BEH-012 | Must | Parity | Probe 5 |
| REQ-011 | The token usage of every Grok model call in a turn (input, cached-read, cache-creation, output, reasoning) is recorded under runtime kind `grok_build`, one ledger record per provider model call, so each turn's recorded total equals Grok's reported turn usage and the tiered `grok-4.7` schedule is applied per request; records are shown with a "Grok Build" label; cost uses the existing catalog pricing path (`model_provider: GROK`), else `missing`; provider-reported cost kept only in raw usage. Calls Grok does not report (a call aborted in flight by interrupt) cannot be recorded | BEH-007 | Must | Cost visibility with limited credits; per-request tier pricing | Probe 1; ARCH-REV-001 AR-002 |
| REQ-012 | Configured skills are materialized as `.grok/skills/<name>` symlinks in the run working directory via the shared materializer semantics and released on cleanup | BEH-008 | Must | Skills parity | README §Skills |
| REQ-013 | The `autobyteus-ts` built-in Grok row is `grok-4.7` with the stated metadata, pricing tiers and reasoning schema; `grok-4.6` removed without alias; docs and tests pinning `grok-4.6`/`grok-4.5` updated | BEH-010 | Must | User request; xAI recommends 4.7 | xAI docs/API |
| REQ-014 | `autobyteus`, `codex_app_server`, `claude_agent_sdk` and `antigravity_cli` behavior is unchanged | all | Must | Preserved boundary | — |
| REQ-015 | Grok Build authentication is Grok-owned; AutoByteus adds no login UI, vault binding or credential relay; provider auth/rate-limit errors surface in the run | BEH-011 | Must | Codex/AGY boundary | DEC-002 |
| REQ-016 | For AutoByteus-driven sessions, Grok's native child-agent orchestration — `task` subagents and model-launched `workflow` child agents — and Grok's interactive `ask_user_question` tool are disabled, without modifying the user's Grok configuration (AutoByteus `delegate_task`/`send_message_to` are the collaboration path; AutoByteus has no question-card bridge); Grok built-in web search stays available; Grok memory and other user Grok configuration are left to the user | BEH-003 | Must | Claude/AGY precedent (Claude disallows `Agent`, `Task`, `Workflow`, `AskUserQuestion`) | DEC-006; SR-008 |
| REQ-017 | **Application-launch part deferred to a future ticket by the user (2026-09-26, SR-009); this ticket delivers the wiring only.** Grok Build is wired into both General Process and Application execution scopes; application launch preflight validates Grok models through the runtime catalog and reports safe diagnostics like other external runtimes | BEH-013 | Must | Runtime parity across execution scopes | `application-execution-scope-kernel-builder.ts` |
| REQ-018 | The ACP integration is structured as a runtime-neutral ACP layer (process/stdio JSON-RPC transport, session lifecycle, standard `session/update` → event conversion, permission bridge, MCP server attachment) plus a Grok profile holding only agent-specific behavior (launch command/flags, prompt injection via `_meta.rules`, model catalog metadata, `_x.ai/*` usage and noise handling, MCP `use_tool` canonicalization); no generic user-selectable "ACP runtime" is added | — | Should | A future ACP agent (the user's named candidate is DSH) becomes a new runtime kind + profile rather than a new backend; the shared layer checks the agent's advertised ACP capabilities instead of assuming Grok's | User 2026-09-26; DSH ACP package evidence |

## Acceptance Criteria

| AC ID | Related REQ | Related Behavior / Scenario | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Supported `grok` on the host; runtime picker opened | `runtimeAvailabilities` includes `{runtimeKind:"grok_build", enabled:true, reason:null}` alongside the four existing rows; picker shows "Grok Build" | No/unsupported `grok` → `enabled:false` with a safe classified reason; no raw stderr/paths | Capability GraphQL e2e; unit for probe |
| AC-002 | REQ-003 | BEH-002 / SCN-002 | `grok_build` selected | Models equal the agent's list (e.g. `grok-4.7`, context 500000) with `reasoning_effort` enum `xhigh/high/medium/low`, default `high`; launch starts the session with that model/effort; no prompt is sent for discovery | Discovery failure → model-unavailable with safe diagnostic, no fallback list | Unit (normalizer over handshake fixtures); gated live |
| AC-003 | REQ-004 | BEH-003 / SCN-003 | Standalone Grok run; prompt triggers `list_dir` then a reply | Stream shows reasoning, a `list_dir` card with args then result (succeeded), assistant text, turn completion; raw trace records the call/result pair; no announcement/settings text in chat | Tool failure → failed card with provider text; provider error → `ERROR` | Unit (converter over probe logs); gated live |
| AC-004 | REQ-005 | BEH-004 / SCN-004 | `autoExecuteTools=false`; agent wants a shell command | Approval card shows the canonical tool `run_bash` with the command (same name/arguments as the tool card); approve → runs, result shown; **deny → tool shown denied; Grok ends its turn (provider behavior after reject-once); the turn is shown completed, not interrupted; the run is idle and the next user message continues the conversation** | `true` → no prompt; new Grok drafts keep the standard default; a real user interrupt is shown as interrupted; an unexpected provider `cancelled` with no user denial stays interrupted | Unit (session state mapping); gated live |
| AC-005 | REQ-006, REQ-007 | BEH-005 / SCN-005 | Mixed team (and org) with a Grok member | Member's `send_message_to` shown/recorded as `send_message_to` (not `use_tool`/`autobyteus_agent_tools__send_message_to`) and delivered; `get_handoff_rules` likewise | Agent Tools MCP not ready → activation fails with explicit error naming the server | Gated live team e2e; unit canonicalization |
| AC-006 | REQ-008 | BEH-006 / SCN-006 | Grok run stopped after ≥1 turn, then reopened | History shows prior user message, tool card and reply exactly once from local traces; follow-up answered with prior context | Unknown/removed session → terminal error; no silent new session | Gated live; unit restore context |
| AC-007 | REQ-009 | BEH-009 / SCN-003 | Message with a text file and an image | Prompt text contains a `Reference files:` block with both local absolute paths; no image block sent | HTTP(S)/data URLs not listed | Unit (input mapper) |
| AC-008 | REQ-010 | BEH-012 / SCN-003 | Active long turn; user interrupts | Turn interrupted within ~2 s; run active, idle and accepts the next message | No active turn → no-op | Gated live; unit |
| AC-009 | REQ-011 | BEH-007 / SCN-007 | Completed Grok turn with N model calls | N ledger records under `grok_build`, one per model call, whose token sums equal the agent's turn usage; each call priced by the `grok-4.7` tier its own input selects; analytics shows "Grok Build" | Unknown model → pricing `missing`, tokens recorded; interrupted turn → records for calls completed before the interrupt only | Unit (usage mapping over probe fixtures); token-usage e2e |
| AC-010 | REQ-012 | BEH-008 / SCN-008 | Agent with one configured skill | `.grok/skills/<skill-name>` symlink exists during the run and is removed on cleanup | Collision with a non-owned path fails non-destructively; `NONE` access mode skips materialization | Unit/integration |
| AC-011 | REQ-013 | BEH-010 / SCN-009 | `autobyteus` runtime model list, provider Grok | Exactly `grok-4.7`, 500k context, tiers ≤200k 2.00/6.00/0.50 and >200k 4.00/12.00/1.00, effort default `high` | Persisted `grok-4.6` selection rejected; reselection required | `autobyteus-ts` tests; docs |
| AC-012 | REQ-015 | BEH-011 / SCN-010 | `grok` present but not logged in / rate-limited | Run start or turn fails with the provider error text visible; no AutoByteus login prompt | — | Unit (error projection); manual |
| AC-013 | REQ-016 | BEH-003 / SCN-003 | Any Grok run | Grok's session tool set contains no `task`, `workflow` or `ask_user_question`; `web_search` remains usable; AutoByteus writes nothing to the user's Grok config | If Grok cannot remove `workflow`, the run is not shipped with it enabled (escalation) | Unit (launch env); implementation check of the session tool set |
| AC-014 | REQ-014 | all | Existing suites | All existing runtime unit/integration/e2e suites (incl. AGY) pass unchanged | — | Existing suites |
| AC-015 | REQ-017 | BEH-013 / SCN-011 | **Deferred by user (SR-009): not validated in this ticket.** Known gap: `unsupported` credential authority blocks every Grok/AGY application launch.  Application launch configured with `grok_build` | Preflight validates the model via the Grok catalog; valid launch starts a Grok-backed application run | Grok unavailable → safe `RUNTIME_AUTHENTICATION_UNAVAILABLE`-class issue; unknown model → `MODEL_UNAVAILABLE` | Unit (validator); integration |
| AC-016 | REQ-018 | — / SCN-003 | Code structure review | Shared ACP modules contain no xAI/Grok names, `_x.ai` handling or Grok defaults; the Grok profile is the only Grok-specific ACP code; the profile/capability contract can express DSH's published ACP server contract (no session load, no MCP servers, committed-text-only updates) and reports its missing capabilities explicitly instead of failing obscurely | A Grok-specific assumption in shared ACP code is a code-review finding | Architecture/code review; design-time handshake evidence |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger / Entry | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Operator | Choose Grok Build | Launch configuration runtime picker | `grok` installed, authenticated | Open picker → "Grok Build" enabled → select | Runtime selected; models load | Missing/unsupported → disabled with reason | Supported Normal Scenario | Picker behavior + REQ-002 | REQ-001, REQ-002 / AC-001 |
| SCN-002 | User | Operator | Pick model/effort | Model selector | SCN-001 | Select `grok-4.7` → set effort | Launches with that model/effort | Model not offered under plan → not listed | Supported Normal Scenario | Probe 0 | REQ-003 / AC-002 |
| SCN-003 | User | Operator | Converse | Run chat input | Run launched | Send (optionally with files) → watch stream → optionally interrupt | Uniform stream/history | Provider error/rate limit → visible error | Supported Normal Scenario | Probes 1, 5 | REQ-004, REQ-009, REQ-010, REQ-016 / AC-003, AC-007, AC-008, AC-013 |
| SCN-004 | User | Operator | Gate tools | Launch with `autoExecuteTools=false` | Run launched | Tool request → approval card → approve/deny | Tool runs or is denied | `true` → no prompts | Supported Normal Scenario | Probe 2 | REQ-005 / AC-004 |
| SCN-005 | User/System | Coordinator + Grok member | Team/org collaboration | Team or org run with a Grok member | Launched | Coordinator → member → `get_handoff_rules`/`send_message_to`/`delegate_task` | Routed as for other members | MCP not ready → activation error | Supported Normal Scenario | Probe 3 | REQ-006, REQ-007 / AC-005 |
| SCN-006 | User | Operator | Reopen stopped run | Run history → open | Stopped after ≥1 turn | Open → history → follow-up | Continuity preserved | Session missing → terminal error | Supported Normal Scenario | Probe 4 | REQ-008 / AC-006 |
| SCN-007 | System | Token-usage pipeline | Account usage | Turn completion | Any turn | Usage → ledger → analytics | Visible per run and in analytics | Unknown model → cost missing | Supported Normal Scenario | Probe 1 | REQ-011 / AC-009 |
| SCN-008 | System | Skill materialization | Skills available | Run bootstrap | Configured skills | Symlink → Grok discovers → cleanup | Skill usable | Collision → non-destructive failure | Supported Normal Scenario | README §Skills | REQ-012 / AC-010 |
| SCN-009 | User | Operator | Latest Grok in native runtime | `autobyteus` model picker, provider Grok | Grok API key in vault | Pick `grok-4.7` → run | Works via Chat Completions with effort schema | Old `grok-4.6` selection → reselect | Supported Normal Scenario | xAI snapshot | REQ-013 / AC-011 |
| SCN-010 | Operational | Operator / provider | Availability and auth | Server start / run start | CLI present/absent; logged in or not | Probe; error surfacing | Clear enablement and errors | — | Supported Normal Scenario | README §Authentication | REQ-002, REQ-015 / AC-001, AC-012 |
| SCN-011 | User | Application operator | Application run on Grok | Application launch configuration | Application package using an agent/team | Configure `grok_build` → preflight → launch | Grok-backed application run | Unavailable/unknown model → preflight issue | Supported Normal Scenario | Application scope wiring | REQ-017 / AC-015 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (labels only; no new screens)
- Linked UI/UX supplement, prototype, UI/UX spec, prototype ticket/revision, confirmation reference, visual baseline: N/A — not applicable
- Normative details: runtime label **"Grok Build"** in run-config/team/org/mobile pickers; **"Grok Build"** in token-usage analytics labels; a system-instruction Activity source key so Grok instruction cards render like Codex/Claude; no Grok-specific auto-execute help text (standard approval behavior).
- Permitted variation: exact short-form analytics label may follow existing style.
- States: disabled-with-reason (existing).
- Unresolved UI decisions: none.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Constraint | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002 / AC-001 | Operability | Availability probe bounded (short timeout, bounded output), asynchronous, starts no inference session, and never exposes raw stderr/paths/credentials | Capability queries | Unit |
| QR-002 | REQ-003 / AC-002 | Cost/Performance | Catalog and capacity obtained without sending a prompt | Catalog queries | Unit + usage observation |
| QR-003 | REQ-010 / AC-008 | Reliability | Interrupt acknowledged within 2 s under normal conditions | Active turn | Gated live |
| QR-004 | REQ-006, REQ-016 | Cost | No AutoByteus-induced model calls beyond Grok's own work for the request; subagents disabled | All runs | Design review + usage evidence |
| QR-005 | REQ-004 | Reliability | Unknown `_x.ai/*` notifications and unknown `sessionUpdate` kinds are ignored without failing the run | Provider evolution | Unit |
| QR-006 | REQ-008 | Reliability | Process exit/stdio close/idle stall during a turn becomes a run error with the turn interrupted; no hang (AGY robustness pattern) | Abnormal termination | Unit/integration |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Preserve: all existing records of the four runtimes; new Grok runs persist `runtimeKind=grok_build` and the Grok `sessionId` binding.
- Acceptable loss: persisted `autobyteus`-runtime selections of `grok-4.6` require explicit reselection (existing retired-model policy); Grok's own session folders are Grok-owned and never copied or migrated.
- Operational constraints: Grok persists prompt/tool content under `~/.grok/sessions/` per working directory — includes AutoByteus prompt text.
- Unknowns for architecture: none blocking (persisted runtime-kind validation is enum-driven).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| `grok` CLI ≥ 1.0.41 (ACP stdio) | `initialize`, `session/new` (`cwd`, `mcpServers`, `_meta.rules/yoloMode`), `session/prompt`, `session/update`, `session/request_permission`, `session/cancel`, `session/load` | README, probes | `x.ai/*` extension drift |
| xAI model access | Session-auth catalog differs from API catalog; free-tier rate limits | `grok models`, stderr | Plan-dependent |
| AutoByteus Agent Tools MCP (streamable HTTP) | Reachable from the Grok child; tools as `autobyteus_agent_tools__<tool>` behind `search_tool`/`use_tool` | Probe 3 | Discovery round-trip |
| xAI API for `autobyteus` runtime | `grok-4.7` Chat Completions with `reasoning_effort` | xAI docs, catalog | None material |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `evidence/grok-acp-probes/` (harness, wire logs, catalog snapshots, session examples) | Protocol, tool naming, usage, restore, cancel evidence | REQ-002..REQ-013 | Current | Evidence only — not behavior-defining |

## Assumptions

| ID | Assumption | Why Necessary | Validation / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Grok Build = `grok` CLI via ACP as the fifth runtime; Antigravity untouched | Scope | User 2026-09-26 | Confirmed |
| ASM-002 | Server host uses the same `grok` installation/login as the user (local-server model, as for Codex/Claude/AGY) | Auth boundary | DEC-002 (provider-owned precedent) | Confirmed by precedent |
| ASM-003 | `session/load` replays history before returning and uses the creation `cwd` | Restore | Probe 4; gated e2e | Verified |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
All decisions below were resolved on 2026-09-26 by applying existing runtime precedent (user direction: "answer … by looking at the existing runtime implementations"). Evidence rows are in the investigation notes, "Precedent-Based Decisions".

| ID | Question | Resolution | Precedent / Evidence | Status |
| --- | --- | --- | --- | --- |
| DEC-000 | Scope framing | "Gemini runtime" = released Antigravity CLI runtime; Grok Build is the fifth runtime | User clarification | Resolved |
| DEC-001 | Runtime kind id / label | `grok_build` / "Grok Build" | Existing labels are the vendor's product names (`Codex App Server`, `Claude Agent SDK`, `Antigravity CLI`); xAI names this product "Grok Build" (CLI header "Grok Build TUI") and tags its own tools with namespace `grok_build` (probe 1) | Resolved |
| DEC-002 | Auth boundary | Grok-owned only: the CLI's own login or the user's `XAI_API_KEY` inherited from the server environment; no vault binding, login UI or relay | Codex and Antigravity are provider-owned with no vault consumer; only Claude has an `agentRuntime` vault consumer. The newest runtime (AGY) follows the provider-owned pattern | Resolved |
| DEC-003 | `autobyteus` Grok catalog breadth | Only `grok-4.7` | Catalog policy: "Sole built-in Grok row"; one curated flagship per provider (`llm_management.md` curated flagship list) | Resolved |
| DEC-004 | Retire `grok-4.6` | Removed without alias; persisted selections need reselection | Documented policy "Earlier Grok rows … are not aliases or fallbacks"; retired rows rejected | Resolved |
| DEC-005 | Prompt delivery | **Inject** the composed AutoByteus prompt into Grok's system prompt via ACP `session/new._meta.rules` (Grok places it in a `<human_rules>` block of its own system prompt); Grok's harness guidance stays intact. `systemPromptOverride` (full replacement) is not used | Codex and Claude put the composed prompt in the provider's system-prompt slot (`baseInstructions`, custom-string `options.systemPrompt`) while the harness keeps its own tool/environment scaffolding; the system-instructions Activity records the text AutoByteus supplied. Grok `rules` is the equivalent slot. Probe 1: injected text appeared at `system_prompt.txt` `<human_rules>` and the model obeyed it | Resolved (SR-004, user correction) |
| DEC-006 | Grok native subagents / memory / web tools | Native subagent spawning disabled (Grok `task` subagents **and** model-launched `workflow` child agents), Grok's interactive `ask_user_question` disabled (SR-008); Grok cross-session memory left to the user's own Grok config (off by default) — AutoByteus does not force it; web search stays available | Claude disables native multi-agent tools (`Agent`, `Task`, `Workflow`, `SendMessage`, `ListAgents`) because AutoByteus `delegate_task`/`send_message_to` replace them, and keeps `WebSearch`/`WebFetch`; AGY's main agent tool list excludes subagents; Claude loads user/project/local settings and AGY never mutates user config; Grok memory "disabled by default" (`13-memory.md`) | Resolved |
| DEC-007 | Grok sandbox / permission-rule setting | None in this ticket; `autoExecuteTools` + interactive approvals only | Claude (the other approval-capable runtime) has no sandbox setting; only Codex has one | Resolved |
| DEC-008 | Docker/Electron provisioning of `grok` | Out of scope; host-installed CLI | No provisioning exists for Codex, Claude or AGY CLIs | Resolved |
| DEC-009 | Cost authority | Existing catalog pricing: usage events carry `model_provider: "GROK"` + model id so `LLMFactory.getModelPricingInfo` prices them (trusted `grok-4.7` schedule); Grok's `costUsdTicks` stays only in `raw_usage_json` | Every runtime is priced through `token-price-config-provider.ts` → `LLMFactory.getModelPricingInfo`; no code path uses provider-reported cost; AGY keeps provider usage in `raw_usage_json` | Resolved |

## Traceability

| REQ | Use Cases | Behaviors | ACs | Scenarios | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-003 | AC-001 | SCN-001 | probes |
| REQ-002 | UC-001, UC-008 | BEH-001, BEH-011 | AC-001 | SCN-001, SCN-010 | AGY capability pattern |
| REQ-003 | UC-002 | BEH-002 | AC-002 | SCN-002 | handshake.log |
| REQ-004 | UC-003 | BEH-003, BEH-012 | AC-003 | SCN-003 | prompt.log |
| REQ-005 | UC-003 | BEH-004 | AC-004 | SCN-004 | permission.log |
| REQ-006 | UC-004 | BEH-005 | AC-005 | SCN-005 | mcp2.log |
| REQ-007 | UC-004 | BEH-005 | AC-005 | SCN-005 | mcp.log |
| REQ-008 | UC-005 | BEH-006 | AC-006 | SCN-006 | load.log |
| REQ-009 | UC-003 | BEH-009 | AC-007 | SCN-003 | handshake.log |
| REQ-010 | UC-003 | BEH-012 | AC-008 | SCN-003 | cancel.log |
| REQ-011 | UC-006 | BEH-007 | AC-009 | SCN-007 | prompt.log |
| REQ-012 | UC-007 | BEH-008 | AC-010 | SCN-008 | README |
| REQ-013 | UC-009 | BEH-010 | AC-011 | SCN-009 | xAI snapshot |
| REQ-014 | all | all | AC-014 | all | — |
| REQ-015 | UC-008 | BEH-011 | AC-012 | SCN-010 | README |
| REQ-016 | UC-003 | BEH-003 | AC-013 | SCN-003 | README env |
| REQ-017 | UC-001 | BEH-013 | AC-015 | SCN-011 | scope builder |
| REQ-018 | UC-001..UC-008 | — | AC-016 | SCN-003 | DSH ACP package; SDK replay |

## Architecture Phase Input

- Scenarios to map after approval: SCN-001..SCN-011 / BEH-001..BEH-013.
- Constraints to preserve: additive registration; Grok-owned auth and conversation state; exact resume; local-trace-only history; canonical tool naming; no compatibility shims; four existing runtimes untouched; AGY-only launch policy stays AGY-only.
- Deferred to design: process-per-run vs shared ACP process; JSON-RPC client structure; `session/load` replay suppression; usage de-duplication (`response_completed` vs `turn_completed`); built-in tool representation and `FILE_CHANGE` derivation; termination; application credential authority case; availability version gate and diagnostic codes; env override name.
- Technical facts to verify in design: every enumerating site (enum/predicate, availability, factory wiring in two scopes, manager, restore/resume, context union, catalog/selection diagnostics, application validator/authority, token-usage labels, frontend label/help/source-key maps); whether token-usage analytics needs explicit labels for new kinds.
- Known risks: MCP discovery indirection; extension drift; rate limits; no image prompts.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed (re-verified on `1676bede9`): `Yes`
- Desired and preserved behavior explicit: `Yes`
- Scope and non-goals clear: `Yes`
- Requirements and ACs testable and traceable: `Yes`
- Scenarios covered with validity and evidence: `Yes`
- Prototype/supplemental evidence consistent: `N/A`
- UI/UX approval basis: `N/A`
- Assumptions and open decisions visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: none (all decisions resolved by precedent)

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-09-26)
- Exact approval basis recorded: `Yes` (SR-005)
- Ready for architecture design: `Yes`
- Remaining blocker: none
