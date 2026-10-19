# Handoff — codex-segment-turn-admission-drops (SR-001)

- Result: `Architecture Design Complete` — `task_size: Small`, `architectural_risk: Low` → direct implementation route.
- Package identifier: `codex-segment-turn-admission-drops`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), at the user's request; follow-up FU-001 of autobyteus-143.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-segment-turn-admission-drops`, branch `codex/codex-segment-turn-admission-drops`, base `origin/personal` @ `cba6b85122` (v1.5.6-beta.8). Finalization target `origin/personal` (RELEASE.md). Ticket artifacts are not committed yet.
- Approval: requirements at SR-001 approved by the Solution Designer within the Task's direction; the user informed (2026-10-19). No behavior-defining supplements.

## Original request

The user's server.log has 1,963 `[CodexSegmentTurnAdmissionRejected]` warnings (two runs dominate, bursts up to 438). Find why the Codex thread loses its active turn, confirm whether agent text is lost in history, fix it if it is a product bug (with a test), bound the gate's per-event logging; reproduce in isolation per TESTING.md; user data read-only.

## Findings (evidence in investigation-notes.md)

1. **Cause of the text loss — already fixed.** 1,727 of 1,963 lines (88%) and all 1,269 text deltas are from 31 Aug – 2 Sep, in the two named runs. A Codex `error` with `willRetry: true` ("Reconnecting… n/5") ended the turn in AutoByteus while Codex kept running it; the rest of that turn (text, tools, reasoning) was dropped from chat and history. Fixed 2026-09-02 by `fb65f564f6` (released v1.4.67), with tests. Zero text deltas rejected in the 6.5 weeks since. Content of those turns is missing from AutoByteus history (confirmed for run `solution_designer_ef2854b4…`, turn `01a05701…`: 31 items incl. the final agent message after 09:02:37 UTC); it still exists in Codex's rollouts. Not recovered (DEC-004).
2. **The 130 later lines (58 runs)** are tool items (commands, MCP calls) that Codex finishes after their turn already ended, mostly after the user pressed Stop. Rollout correlation matches the log exactly in 43 of 50 checkable runs. The gate correctly refuses to attach them to another turn; no agent text is involved. Admission stays unchanged (DEC-001).
3. Leads "resume/attach mid-turn", "steer/append" and "app-server-started turns" were checked and ruled out.

## What to implement

Bounded, informative logging at the Codex gate only — see `design-spec.md` (Change / Refactor Sequence and Interface Boundary Mapping):
- New `codex/thread/codex-segment-turn-rejection-accounts.ts` (per-thread accounts keyed by the rejected event's turn id or null).
- Rejection result gains `eventTurnId`; detailed line gains `itemType`, `turnId`, `activeTurnId`; new `[CodexSegmentTurnAdmissionRejectedSummary]`.
- Flush summaries at `turn/started`/`turn/completed`, client close, and thread release (`CodexThreadManager.releasePreparation`).
- Tests for AC-001..AC-008; doc section in `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`.
- Escalation trigger: any change to which events are admitted, or any need to touch AgentRun, converters or the web.

## Verification intent

Server unit tests and typecheck (TESTING.md: backend logic → server tests); existing willRetry tests stay green (AC-007). No live Codex run is needed; the user's data stays untouched. Release: the change is a server-log improvement, not user-visible; the user-visible content-loss fix already shipped in v1.4.67.

## Follow-ups (recorded in design-spec Change Scope; to be sent at the delivery receipt)

- FU-001: Codex tool calls finishing after their turn ended (late results not shown; 9 tool starts that arrived after a Stop never shown nor kept in history).
- FU-002 (watch): `lastTerminalTurnId` guard can keep a wrongly ended running turn from being re-adopted.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-segment-turn-admission-drops/tickets/in-progress/codex-segment-turn-admission-drops/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-segment-turn-admission-drops/tickets/in-progress/codex-segment-turn-admission-drops/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-segment-turn-admission-drops/tickets/in-progress/codex-segment-turn-admission-drops/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-segment-turn-admission-drops/tickets/in-progress/codex-segment-turn-admission-drops/solution-revision-record.md`
- Evidence (read-only analysis): `.../probes/*.py`, `.../evidence/residual-rollout-correlation.txt`, `.../evidence/all-rollout-correlation.txt`
- Architecture review artifacts: N/A — not applicable (Small/Low direct route).

## Route

`get_handoff_rules` (2026-10-19): rule "Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`. No other rule matches.
