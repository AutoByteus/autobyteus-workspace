# Solution Handoff — anthropic-prompt-caching

- Result: `Architecture Design Complete`
- Package identifier: `anthropic-prompt-caching`
- Project Task: `project_task_e08c9081-0d1d-4e89-a1ef-dd213f53febf` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Current solution revision: `SR-005` (provider-boundary refactor added after ARCH-REV-002)
- Approval state: requirements Approved through SR-004 (user, 2026-10-09; SR-004 by explicit user delegation; see `requirements-doc.md` Document Status)
- Classification: `task_size = Large`, `architectural_risk = High` (SR-005) (rationale in `design-spec.md` § Task Size And Architectural Risk)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching`
- Branch: `codex/anthropic-prompt-caching`
- Base: `origin/personal` @ `927796780562482b900926fa7ab0d50109820e01` (fetched 2026-10-09)
- Finalization target: `origin/personal`
- Dependencies installed in the worktree (`pnpm install --frozen-lockfile --prefer-offline --ignore-scripts`).

## Original Request (summary)

Native AutoByteus runtime on Anthropic models has 0 % cache hit (Console: "Prompt caching: Not enabled"; $7.31 spend = Token Meter). Enable Anthropic prompt caching per current guidance, check other Anthropic paths/runtimes, keep the Token Meter matching the Console, report other providers' cache hit. User additions on 2026-10-09:
- reach a cache hit comparable to the Claude Agent SDK runtime, at maximum cost efficiency;
- fix pricing;
- upgrade to the latest Anthropic SDK;
- a test vault using the key in `/Users/normy/.autobyteus/server-data/.env` may be set up for testing.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/solution-revision-record.md`
- Evidence supplements (not behavior-defining): `…/probes/anthropic-cache-probe.test.ts`, `…/probes/anthropic-cache-probe-result.json`, `…/probes/strategy-probe.mjs`, `…/probes/strategy-probe-result.json`, `…/probes/strategy-probe-s4-result.json`, `…/probes/transcript-analysis/{usage,multi,sim}.py`
- Architecture review: ARCH-REV-001 Fail (Design Impact) → resolved in SR-004. Report: `…/design-review-report.md`; record: `…/architecture-review-revision-record.md`.
- New evidence: `…/probes/prefix-change-probe.mjs`, `…/probes/prefix-change-probe-result.json`.

## Root Cause And Design (short)

Root causes:
1. The native Anthropic adapter never requests prompt caching.
2. The runtime strips all earlier thinking blocks at every new turn. That rewrites the latest tool cycle each turn, and Anthropic's guidance calls it a recovery-only pattern.
3. The interruption note is merged into the top-level system prompt.

Design:
- Conversation requests (agent loop only) carry a 1h breakpoint on the last system block plus top-level automatic 1h caching. One-shot calls such as compaction carry none.
- The per-turn strip is removed, so history is append-only between compactions.
- Late SYSTEM notes are rendered in place as user text.
- Sonnet 5 price corrected to $2/$10 (read $0.20, writes $2.50/$4).
- `@anthropic-ai/sdk` upgraded from 0.128.0 to 0.132.1.
- Tests for request shape, the append-only prefix and cache pricing.

Measured basis:
- Claude Agent SDK: 95–99 % hit, all writes 1h.
- 1h vs 5m on real sessions: $88.6 vs $123.5.
- Strip vs append-only: 82.8 % / $0.434 vs 90.9 % / $0.265, accepted under Anthropic's enforced preserved-thinking check.

## Scope / Non-Scope

- In scope: REQ-001..REQ-011 (see requirements).
- Out of scope:
  - Claude Agent SDK Token Meter issues (Task `project_task_cb40258d…`);
  - Gemini native caching (separate Task requested from `/project_task_manager`);
  - compaction summarizer cache reuse (recommended follow-up);
  - other providers.

## Open Risks

- RSK-003: with thinking blocks kept, any unidentified prefix edit → 400 on accounts created ≥ 2026-08-31. Covered by AC-002/AC-004/AC-011 tests and live validation with `prefix_mismatch_behavior: "error"`.
- SDK upgrade peer resolution with `@anthropic-ai/claude-agent-sdk` 0.3.280.

## Expected Next Action

Independent architecture review of the design package (High risk), then implementation per `design-spec.md` § Change / Refactor Sequence and § Guidance For Implementation. User verification in the desktop app at the end (Console "tokens reused", meter matches Console).

## Routing

`get_handoff_rules` (2026-10-09): rule "Architecture Design Complete with task_size=Large or architectural_risk=High … user approval current" matches (`architectural_risk=High`). Route: `/software_engineering_team/architecture_reviewer`. The Medium/Low direct-implementation rule does not apply. The delivery-receipt rule does not apply.


## SR-004 Re-review Request

All four ARCH-REV-001 findings are addressed. See `solution-revision-record.md` § SR-004 and `design-spec.md` (guard: `MemoryManager.bindRetainedReasoningToRequestPrefix`, `computeLlmRequestPrefixDigest`, `leadingSystemMessages`). Live evidence: `probes/prefix-change-probe-result.json` (P1 string ≡ block-array system; P2 tool change with kept thinking → 400; P3 one-time strip accepted). Routing per `get_handoff_rules` (architectural_risk=High): `/software_engineering_team/architecture_reviewer`.

## SR-005 Review Request (provider-boundary refactor)

- The user approved folding a provider-boundary refactor into this ticket (2026-10-09). The implementation engineer was stopped at SR-004 step 7; its uncommitted worktree changes carry over (see `design-spec.md` § Change / Refactor Sequence).
- New requirement: REQ-013 / AC-014. Memory and agent hold provider-native output only as provider-tagged opaque values. The provider policy in `llm/api` owns the meaning. Each provider renders once, and nothing reaches into private renderers.
- Design: `design-spec.md` (SR-005). The previous version is `design-spec.sr004.bak.md`.
- Routing per `get_handoff_rules`: Large/High → `/software_engineering_team/architecture_reviewer`.
