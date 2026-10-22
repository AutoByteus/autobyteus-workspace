# Requirements Document

Package: autobyteus-273 (`claude-prompt-cache-ttl`)

## Document Status

- Status: Approved (SR-002)
- Requested by: `/project_task_manager` (run id `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Approval: the user, 2026-10-22, in the Solution Designer conversation. Card request: "Can we add another card in the server setting area for [Claude] runtime? ... we have already one for [Codex] runtime ... And then to set this cache TTL to one hour automatically, is it possible?"; toggle confirmed: "good. its a toggle or its a field user can input?" -> answered toggle -> "okayyy. thanks. yes you can spend, go ahead". Basis: this document as of SR-002.

## Problem And Desired Outcome

On API billing (Console login with credits, or `api-key` mode), Claude Code keeps prompt caches for 5 minutes. AutoByteus agents on the Claude runtime are often idle longer than that (waiting for teammates or the user), so each resume re-writes the whole context at 1.25x the input price. On 2026-10-22 that cost about $41 in about 5 hours (autobyteus-271). Desired: Claude-runtime agents on API billing use the 1-hour cache by default; a user's explicit choice still wins; the subscription keeps Claude Code's own behaviour for the agent conversation; Token Statistics show the 5m/1h split.

## Relevant Current And Desired Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Claude runtime on API billing: cache writes 5m (Claude Code default) | 1h by default | Caching itself; Claude Code's own breakpoints |
| BEH-002 | User choice (`promptCacheTtl` setting, `CLAUDE_CODE_PROMPT_CACHE_TTL`, `FORCE_PROMPT_CACHING_5M`) applies | Still applies and wins over the AutoByteus default | Same |
| BEH-003 | Subscription: agent conversation 1h (Claude Code default) | Unchanged | Subscription agent conversation behaviour |
| BEH-004 | Token Statistics cost breakdown: one "Cache writes" row | Rows for 5-minute and 1-hour cache writes with their costs (as the run usage meter already does) | Totals, other rows |
| BEH-005 | Native runtime: 1h cache (`anthropic-llm.ts`) | Unchanged | Same |
| BEH-006 | Server Settings have a Codex runtime card; no Claude runtime card | A "Claude runtime" card with one toggle "One-hour prompt cache", on by default (also when never saved); applies to Claude agent sessions started after a change | Other cards |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: A user runs an agent on the Claude runtime while Claude Code is billed through API credits or an API key.
- UC-002: A user who chose a TTL himself (Claude settings or environment) runs a Claude-runtime agent.
- UC-003: A user on a Claude subscription runs a Claude-runtime agent.
- UC-004: A user reads the cost breakdown in Token Statistics.
- UC-005: A user turns the one-hour prompt cache on or off in Server Settings.

### Out Of Scope

- Token Statistics' period selection by run creation time (FU-001).
- The native runtime's caching; Codex, Antigravity, other runtimes.
- A free-form TTL field (DEC-002: toggle only).
- autobyteus-218 (opt-in api-key mode itself).

### Non-Goals

- Detecting the billing type of the user's Claude login.
- Changing the user's `~/.claude/settings.json` or server `.env`.

### Preserved Behavior Boundary

BEH-002, BEH-003 (agent conversation), BEH-005; auth-mode handling of API-key variables; Claude Code's own cache breakpoints.

### Prerequisites

None.

### Review Authority

Solution Designer for scope; the user for DEC-001 and DEC-004.

## Requirements

- REQ-001 (BEH-001): While the toggle (REQ-006) is on, every Claude Code process AutoByteus spawns for the Claude runtime gets the 1-hour prompt cache TTL as its default, so that on API billing its cache writes are 1h.
- REQ-002 (BEH-002): The default ranks below every explicit user choice: a `promptCacheTtl`/`subagentPromptCacheTtl` setting, `CLAUDE_CODE_PROMPT_CACHE_TTL`/`CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL`, `FORCE_PROMPT_CACHING_5M`, and a user-set value of the default variable itself.
- REQ-003 (BEH-003): On a subscription the agent conversation keeps 1h (Claude Code's own default); see DEC-001 for background requests.
- REQ-004 (BEH-004): Token Statistics' cost breakdown shows 5-minute and 1-hour cache-write tokens and costs when present; a write without a split keeps the single row.
- REQ-005: User and developer docs say what AutoByteus sets, how to override it, and the cost trade-off in plain words.
- REQ-006 (BEH-006): Server Settings show a "Claude runtime" card with a "One-hour prompt cache" toggle. Unsaved = on. On: REQ-001 applies. Off: AutoByteus adds nothing and Claude Code's own default applies. A change applies to Claude agent sessions started afterwards, without restart. The card explains the trade-off in plain words and that a `promptCacheTtl` in the user's own Claude Code settings takes precedence.

## Acceptance Criteria

- AC-001 (REQ-001): A unit test shows the spawn environment carries the default in `cli`, `auto` and `api-key` modes; a real two-turn Claude-runtime run on API billing records its writes under `ephemeral_1h_input_tokens` (DEC-004).
- AC-002 (REQ-002): Unit tests show a user-set value of the default variable is kept; a real Claude Code run shows `promptCacheTtl: "5m"` beats the default (T3 already; re-run in validation through the AutoByteus spawn).
- AC-003 (REQ-003): On the subscription, a Claude-runtime run's agent-conversation writes stay 1h.
- AC-004 (REQ-004): Component test: an aggregate with 5m and 1h writes renders two rows with tokens and costs; an aggregate with only an unsplit total renders one "Cache writes" row.
- AC-005 (REQ-005): Docs updated.
- AC-006 (REQ-006): Component test: the card shows the toggle on when the setting is absent, saves on/off through the server-settings store, shows a save error and reverts on failure. Unit test: with the setting off, the spawn environment does not get the default; with it on or absent, it does. Server test: the setting accepts only the two values.

## Relevant Scenarios And Journeys

| ID | Scenario | Validity | Evidence |
| --- | --- | --- | --- |
| SC-001 | User's subscription runs out; he signs Claude Code in to his Console account and keeps running AutoByteus teams; agents wait minutes between turns | Supported Normal Scenario | 271 R2-R6; PTM facts |
| SC-002 | User sets `promptCacheTtl` or an env var because he prefers 5m | Supported Explicit Edge Scenario (Claude Code's documented control) | D4, T2-T6 |
| SC-003 | User on subscription runs agents | Supported Normal Scenario | PTM facts (17 UTC) |
| SC-004 | User checks cost breakdown in Token Statistics | Supported Normal Scenario | S7 |
| SC-005 | User opens Server Settings and switches the one-hour cache off or on | Supported Normal Scenario (user request 2026-10-22) | Codex card precedent S9 |

## Quality And Non-Functional Requirements

- Cost: on API billing, 1h writes cost 2x input instead of 1.25x, reads unchanged. A conversation resumed after 5-60 minutes reads its cache (0.05x-0.1x) instead of re-writing it (1.25x). Net positive for agents that idle (271 R6: ~$41 re-writes vs ~$1.60 reads in 5 hours).

## Data Continuity And Acceptable Loss

No persisted data change. Existing token records already hold the split.

## External Contracts And Dependencies

Claude Code prompt-cache controls (D4), verified on 2.1.307 (T1-T6). Older binaries (< 2.1.242) ignore them.

## Decisions

| ID | Decision | Owner | Reasoning / status |
| --- | --- | --- | --- |
| DEC-001 | Mechanism and policy: **(A, recommended)** AutoByteus sets `ENABLE_PROMPT_CACHING_1H=1` in the Claude spawn environment unless the user set it. Claude Code ranks it below every user choice (T3, T6), so the user always wins. API billing: everything 1h. Subscription: agent conversation unchanged; Claude Code's own background requests (compaction, titles) also 1h instead of 5m (small; no subagents in AutoByteus, S3). **(C)** Set `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` unless the env has it: subscription strictly unchanged, but it overrides a user's `promptCacheTtl` setting (T4), breaking "the user's setting wins", and background requests on API billing stay 5m. (D) Detect billing type from Claude's account file: rejected, undocumented internal fields. | User: A, through the card toggle (on by default), 2026-10-22 | Approved after the user asked for the card; the toggle drives option A |
| DEC-002 | (Revised) A Server Settings card with an on/off toggle, not a text field | User (asked for the card; confirmed the toggle) | Claude Code accepts only 5m/1h; off = Claude Code's own default, so a free field would invite values Claude Code ignores |
| DEC-003 | Show the split in the Token Statistics cost breakdown, reusing the meter's labels | Solution Designer | Task asks for it; data already present |
| DEC-004 | Two-turn proof on API billing: Claude runtime in `api-key` mode with the vault Anthropic key on an isolated test instance, Haiku 5.5, two turns ~6 minutes apart, about 1-2 cents | User approved, 2026-10-22: "yes you can spend, go ahead" (about 1-2 cents) | Only way to prove REQ-001 on API billing |

## Traceability

REQ-001 -> AC-001; REQ-002 -> AC-002; REQ-003 -> AC-003; REQ-004 -> AC-004; REQ-005 -> AC-005; REQ-006 -> AC-006.

## Readiness Check

### Content Ready For Approval

Yes; approved by the user (SR-002).

### Approved Basis Ready For Design

Yes.
