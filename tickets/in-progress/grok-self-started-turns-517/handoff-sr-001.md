# Handoff — grok-self-started-turns-517, SR-001

- Result: `Architecture Design Complete`; `task_size=Medium`, `architectural_risk=High` → independent architecture review
- Package: `grok-self-started-turns-517`; Project Task `autobyteus-517` round 3 (483-FU-004), part of `autobyteus-530`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517`, branch `codex/grok-self-started-turns-517`, base `origin/personal` @ `ca4317a386`; no dependencies installed yet. Ticket documents not committed yet.
- Approval: requirements approved by the User on 2026-11-20 (option (b); live Grok check waived if there are no Grok credits).

## Request

When a Grok agent's background command ends, Grok starts a turn of its own; AutoByteus drops it (`acp-agent-session.ts:204`), so it is invisible while it spends usage and may run tools. Show it in the run like Claude's runtime-started turns.

## Design summary (design-spec.md is authoritative)

Two profile effects (`agent_turn_started`, `agent_turn_ended`) read by the Grok profile from `_x.ai/queue/changed` (running prompt) and `turn_completed`; the shared `AcpAgentSession` opens an `agent`-origin turn only when idle, emits TURN_STARTED + a recorded `SYSTEM_TASK_NOTIFICATION` (new sender id), streams the turn through the existing path, ends it on the matching `turn_completed`; cancel, idle timer, close and input waiting work for both origins. Scripted Grok extended for E2E.

## For review

The shared ACP session's turn lifecycle (two origins), the rule that agent turns start only in `ready`, DeepSeek unaffected, the notice recording.

## Route record

- 2026-11-20: rule "Large or High" → `/architecture_reviewer`.
- 2026-11-20: ARCH-REV-001 Fail (AR-001 Unclear; AR-002..AR-004 Design Impact) → resolved in SR-002 (probe 2 `evidence/grok-acp-probe2.jsonl`; design-spec Intended Change 1–6) → back to `/architecture_reviewer`.
- 2026-11-20: ARCH-REV-002 Fail (AR-005 High; AR-006; AR-002/003 leftovers) → resolved in SR-003 (design-spec rewritten; AC-006) → back to `/architecture_reviewer`.
- 2026-11-20: ARCH-REV-003 Pass; the reviewer routed to `/implementation_engineer` (no duplicate forwarding).
