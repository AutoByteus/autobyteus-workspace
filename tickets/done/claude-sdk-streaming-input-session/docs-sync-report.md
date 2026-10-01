# Docs Sync Report — claude-sdk-streaming-input-session

## Scope

- Ticket: `claude-sdk-streaming-input-session`
- Trigger: post-API/E2E test-code review Pass (CRR-005) from `code_reviewer`, reviewed route (`task_size=Large`, `architectural_risk=High`)
- Bootstrap base reference: `origin/personal` @ `6f7b5e371` (v1.4.81)
- Integrated base reference used for docs sync: `origin/personal` @ `b6873f8cb` (v1.4.84 + delivery record), merged into the ticket branch as `3f1aa3dc4`
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh; `delivery-logs/`

## Why Docs Were Updated

- Summary: the Claude Agent SDK backend moved from one `query({prompt: string})` per turn to SDK streaming input mode with one long-lived Claude CLI process per AgentRun. This changes:
  - the process lifecycle, canonical turn derivation, interrupt semantics and background-task behavior;
  - image input, and memory/replay of background-task notices;
  - the shared AgentRun append claim rule for Claude and Codex;
  - streaming token usage accounting, including the series-restart marker.

  It also removes the temporary v1.4.78 background-task policy env.
- Why this should live in long-lived project docs: these are durable runtime contracts that operators and maintainers rely on. They cover when a Claude process lives and dies, what Stop does, how turns and usage are counted, how to re-verify the `cancelQueued` contract after CLI/SDK bumps, and what `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` in the server env now means.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Canonical Claude backend doc; the implementation rewrote the Claude session sections, and the base merge conflicted here | `Updated` (implementation-authored; delivery resolved the merge conflict and verified the text on the integrated state) | Conflict: the base still carried the v1.4.78 temporary policy paragraph (lightly re-edited in the base to "Model-discovery probes"). This ticket deliberately removes it (REQ: clean switch; the policy said "remove when the Claude backend moves to SDK streaming input mode"). Resolved to the ticket side. The base's tool-policy paragraph ("session options" wording), the streaming lifecycle, turn tracker, background registry, images, token accounting, interrupt steps and operator note now read coherently together |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Streaming cumulative usage, the zeroed-result guard and the series-restart rule and flags | `Updated` (implementation-authored; no merge overlap) | Matches SR-012 / CR-002 as validated (RSK-007 live usage probe) |
| All repository `*.md` outside `tickets/` and `node_modules` (grep for `CLAUDE_CLI_RUNTIME_POLICY_ENV`, `BASH_MAX_TIMEOUT_MS`, `one-string query`, `prompt: string`, `streamInput`, `query per turn`, `closes its … query on result`, `DISABLE_BACKGROUND_TASKS`, `context-capacity probe`, `resolveContextCapacities`) | Check for stale descriptions of the old per-turn query model, the removed policy, or the base-removed capacity probe | `No change` | The only hit is the intended operator note in `agent_execution.md:506`. No stale guidance remains |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Implementation rewrite; delivery merge resolution | Streaming-input lifecycle (one process per run, lazy open, `sessionId` then `resume`, no idle timer, terminate/shutdown close, unexpected exit → `ERROR` + resume). Also: the `ClaudeTurnTracker` rules, `ClaudeBackgroundTaskRegistry` and `SYSTEM_TASK_NOTIFICATION`, inline images, the interrupt steps with `cancelQueued`, and the operator note on `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS`. The temporary v1.4.78 policy paragraph was removed (delivery kept that removal when resolving the conflict) | Durable runtime contract (see above) |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Implementation update | Streaming cumulative usage, the zeroed-result guard, and the series-restart rule and flags | SR-012 accounting contract |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude process lifecycle | One CLI process per AgentRun for its whole life; which events open, close and reopen it | `design-spec.md`, `requirements-doc.md` | `agent_execution.md` |
| Canonical turn derivation | uuid-accounted settlement; CLI-started turns open on `system/init` | `design-spec.md` (Spine Narratives) | `agent_execution.md` |
| Interrupt contract | `Query.interrupt({cancelQueued:true})` ends only the turn; how to re-verify it after bumps | `design-spec.md`, `investigation-notes.md`, `probe-evidence/` | `agent_execution.md` |
| Background tasks | Enabled; completions are announced, recorded as `system_task_notification` traces and replayed | `design-spec.md` | `agent_execution.md` |
| Usage across process generations | Series-restart marker and main-loop-only accounting on restart turns | `design-spec.md` (SR-012) | `token_usage.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| One `query({prompt: string})` per `start_turn`, closed on `result` | `ClaudeSdkClient.openStreamingSession` + `ClaudeSessionProcess` (one streaming query per run) | `agent_execution.md` |
| v1.4.78 `CLAUDE_CLI_RUNTIME_POLICY_ENV` (forced `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`, `BASH_MAX_TIMEOUT_MS=1800000`) | CLI defaults; background tasks enabled; operator-env warning only | `agent_execution.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A. The docs were updated.
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, user-verification build, then the user-verification hold
- Notes: none
