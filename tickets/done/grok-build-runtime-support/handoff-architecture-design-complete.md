# Handoff — Architecture Design Complete: `grok-build-runtime-support`

- Result classification: **Architecture Design Complete**
- Package identifier: `grok-build-runtime-support`
- Current solution revision: `SR-011` (round 3, after failure-origin review CRR-002)
- From: Solution Designer (`/solution_designer`)
- Date: 2026-09-26

## Original Request

User (2026-09-26): support xAI **Grok Build** as an agent runtime alongside the existing Codex, Claude Agent SDK and Antigravity CLI runtimes ("they have good support to be integrated in other custom apps"); update the `autobyteus` runtime's built-in Grok model from `grok-4.6` to the latest; experiments allowed but credit-limited. Later: the ACP integration must be a reusable layer so other ACP CLIs (the user named DSH) can be added later; Gemini CLI explicitly not considered (Antigravity already covers it).

## Goals

1. Fifth runtime kind `grok_build` ("Grok Build") driving the local `grok` CLI over ACP stdio with full parity (streaming, tool cards, interactive approvals, interrupt, exact resume, team/org communication via Agent Tools MCP, skills, raw-trace memory, token usage), in standalone, team, org and application runs.
2. Runtime-neutral ACP layer + Grok profile (REQ-018).
3. `autobyteus-ts` Grok row → `grok-4.7` only; `grok-4.6` retired without alias.
4. No behavior change to the four existing runtimes (REQ-014).

## Approval Basis

- Requirements **Approved** 2026-09-26 (user: "do you think building a reusable ACP layer is better, if yes. then approved"; Solution Designer answered yes with rationale in SR-005). Approved baseline: `requirements-doc.md` at SR-005; SR-006 wording change (DSH replaces Gemini CLI) directed by the user.
- Decisions DEC-000..DEC-009 resolved from existing runtime precedent (SR-003) with DEC-005 corrected by the user to prompt **injection** (SR-004).
- No behavior-defining supplements; no Product Design involvement.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/solution-revision-record.md`
- Evidence (not behavior-defining): `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support/tickets/in-progress/grok-build-runtime-support/evidence/` — Grok ACP wire logs (`grok-acp-probes/*.log.jsonl`, intended as unit-test fixtures), probe harness (`acp-client.mjs`, `acp-cancel.mjs`, `mcp-server.mjs`), SDK replay harness (`sdk-replay.mjs`), xAI/CLI catalog snapshots, Grok session examples, ACP registry snapshot, DSH ACP README.
- Prior independent review artifacts: `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-001, reviewed basis SR-005/006/007 at base `1676bede9`; Fail — AR-001..AR-004). SR-008 resolves them; see design-spec "SR-008 Review Resolution".

## Workspace / Base / Finalization

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support`, branch `codex/grok-build-runtime-support` (ticket artifacts uncommitted).
- Base: `origin/personal` @ `e06080b0027636cecf20b5e437c496d423c7f26b` (v1.4.86; fast-forwarded from `1676bede9` in SR-008, delta checked in ARC-25).
- Finalization target: `origin/personal`.
- Rule for all downstream work: read code **only** from this worktree (SR-002 root cause was reading a stale shared checkout).

## Classification

- `task_size`: **Large** — new ACP transport/backend family + Grok profile + catalog/availability/restore/app-scope wiring + frontend maps + `autobyteus-ts` row; ~25 new and ~20 modified files across server, web and `autobyteus-ts`.
- `architectural_risk`: **High** — new external protocol and dependency (`@agentclientprotocol/sdk@1.5.0`), permission mapping, persisted provider-id binding, concurrent child processes with bidirectional JSON-RPC, new shared subsystem boundary (REQ-018).
- Escalation trigger: see design-spec "Task Size And Architectural Risk".

## Key Design Points (details in design-spec)

- Shared ACP layer: `runtime-management/acp/*` (process, SDK connection, capabilities, launch-profile contract, discovery handshake) and `agent-execution/backends/acp/*` (factory, backend, session state machine, permission bridge, update converter, prompt builder, session-profile contract). Must contain no `grok|xai|_x.ai` tokens (AC-016).
- Grok profile: `runtime-management/grok/*` (launch profile, capability/diagnostics) and `agent-execution/backends/grok/*` (session profile: `_meta.rules` injection, `yoloMode`, `agentProfile.disallowedTools`, MCP entry + readiness via `_x.ai/mcp/server_status`, tool projection incl. `use_tool`→canonical names, per-turn usage from prompt-result `_meta.usage`, `.grok/skills`).
- Process per run: `grok agent --model <m> [--reasoning-effort <e>] stdio`, env `GROK_SUBAGENTS=0`; `session/new` inside `createBackend` so `platformAgentRunId = sessionId` before publication; restore via `session/load` with replay suppression, no re-injection.
- Persisted data: `Directly Usable — No Migration`.

## Open Risks / Uncertainties

- Mechanism to restrict `ask_user_question`/`workflow` (`_meta.agentProfile.disallowedTools`) unverified → design step 5, ≤US$0.05 check; fallback documented.
- `search_replace`/`write` rawInput path field names unrecorded → path from ACP `locations` as fallback; confirm in step 5.
- Grok `_x.ai` extension drift across CLI auto-updates; free-tier 429 rate limits; MCP tool discovery indirection (gated live team E2E).
- DSH evidence is package-documentation only (not installed/probed).
- Deferred follow-ups (not in scope): shared workspace-resolver rename; shared runtime discovery-diagnostic type; moving AGY onto the ACP layer; AGY label in token-usage analytics.

## Scenario Basis

SCN-001..SCN-011 (all `Supported Normal Scenario`), mapped to spines DS-001..DS-009 in the design spec.

## Expected Output / Next Action

Downstream work per the team handoff rules (independent architecture review for a Large/High package, then implementation). Credit budget: live Grok usage limited to the design step-5 check and opt-in gated E2E.

## Applied Handoff Route

`get_handoff_rules` (2026-09-26) returned three rules. Matching rule: "Architecture Design Complete with task_size=Large or architectural_risk=High … requirements … current explicit user approval" → **`/architecture_reviewer`** (independent architecture review). The Small/Medium+Low direct-implementation rule and the Delivery-receipt rule do not apply.


## Round 2 (SR-008) Summary

- AR-001: built-ins disabled via documented env switches (`GROK_SUBAGENTS=0`, `GROK_WORKFLOWS=0`, `GROK_ASK_USER_QUESTION=0`); `_meta.agentProfile` removed; step 5 = confirmation, failure → stop and return. `ask_user_question` basis: Claude precedent under the user's standing direction (reported to the user; revert as Requirement Gap if the user objects).
- AR-002: one `per_call` record per Grok `response_completed` (`base_excludes_cache`, key `grok_build:<sessionId>:<turnId>:<ordinal>`, session model, replay-suppressed, no turn record); P-05 settled (ARC-22).
- AR-003: permission `toolCall` projected like tool cards; AC-004 → `run_bash`.
- AR-004: standard-only capabilities; "agent profiles" wording; connection buffering stated; DSH prompt-delivery limit recorded.
- Base fast-forwarded to `e06080b00`; no design-invalidating delta (ARC-25).
- Handoff route for round 2: same rule as round 1 (Large/High, approved requirements) → `/architecture_reviewer`.


## Round 3 (SR-011) Summary — failure-origin review CRR-002

- Trigger: `/code_reviewer` CRR-002 (Fail) on API/E2E API-REV-001. Live API/E2E passes stand: standalone, approve, interrupt, restore, per-call usage, team/org, tool set.
- CR-006 (Requirement Gap): **user-approved** AC-004 amendment. On deny, the tool is shown denied, and Grok's provider-ended `cancelled` becomes TURN_COMPLETED (only while `prompting` after a user `reject_once` in this turn); a user interrupt stays TURN_INTERRUPTED.
- CR-004: the shared ACP factory surfaces provider start/restore errors as `AgentCreationError` with provider text (runtime-neutral). Implementation-owned Local Fix; the design names the owner.
- CR-007: REQ-005 rationale clarified by Codex/Claude precedent (ARC-26/27). No forced prompts; no design change.
- CR-005: the application-launch outcome stays deferred per the user (SR-009, STC-002).
- CR-002: design text synced to the accepted implementation decisions.
- Evidence: ARC-26..ARC-29 in the investigation notes.
- Base unchanged: `origin/personal` @ `e06080b00`; implementation commit `2b31b046d`; API/E2E test changes uncommitted in the worktree.
- Handoff route for round 3: `get_handoff_rules` (2026-09-26) → the Large/High revised-package rule matches (requirements have current explicit user approval, including CR-006) → `/architecture_reviewer`.
