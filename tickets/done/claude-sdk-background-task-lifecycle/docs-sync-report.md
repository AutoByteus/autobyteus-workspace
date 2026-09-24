# Docs Sync Report — claude-sdk-background-task-lifecycle

## Scope

- Ticket: `claude-sdk-background-task-lifecycle`
- Trigger: API/E2E validation PASS (API-REV-001), direct low-risk route (`task_size=Small`, `architectural_risk=Low`)
- Bootstrap base reference: `origin/personal` @ `9267d11c8`
- Integrated base reference used for docs sync: `origin/personal` @ `73f1c5fef`. It was merged into the ticket branch as merge commit `9bf6a3264` and brought in the `claude-sdk-builtin-tool-restriction` finalization.
- Post-integration verification reference: `release-deployment-report.md` → Initial Delivery Integration Refresh; `delivery-logs/post-integration-live-claude-policy.log`

## Why Docs Were Updated

- Summary: every Claude turn query now forces the Claude CLI runtime policy env: `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` and `BASH_MAX_TIMEOUT_MS=1800000`. This is a durable, product-level runtime behavior. It changes what Bash can do inside Claude-runtime agents: foreground only, up to a 30-minute ceiling, and no auto-backgrounding. It also carries an operational caveat (user settings `env` override) and a removal condition (the streaming-input migration).
- Why this should live in long-lived project docs: agent authors and maintainers need to know why Claude agents cannot background commands, what the timeout ceiling and default are, and when to re-verify or remove the policy. Otherwise someone will "fix" it back, or keep it after the streaming-input migration makes it obsolete.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Canonical Claude Agent SDK backend doc; the implementation added the policy paragraph (AC-004), and the base merge changed the adjacent built-in tool policy paragraph in the same section | `Updated` (in implementation commit `b041e34df`; verified on the integrated state) | Auto-merged without conflict. The runtime-policy paragraph follows the base's new tool-restriction paragraph. The two do not contradict each other: `Bash` is still in the enabled `tools` list, and both policies apply only to normal turns, not discovery. The later "one `query({prompt: string})` per `start_turn`; no `streamInput`" statement is still true and matches the "temporary until streaming input mode" wording |
| All repository `*.md` outside `tickets/` and `node_modules` (grep for `run_in_background`, `BASH_MAX_TIMEOUT`, `BASH_DEFAULT_TIMEOUT`, `DISABLE_BACKGROUND_TASKS`, `background task`) | Check for stale guidance about background Bash | `No change` | The only other hit is `docs/design/startup_initialization_and_lazy_services.md:23` ("start transports/background tasks"), which is unrelated server startup wording. No other long-lived doc describes Claude background task behavior |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | New paragraph (implementation-authored, delivery-verified on integrated state) | Covers the forced env and its override precedence, the root cause (the CLI exits at turn end and kills CLI-owned background tasks, including auto-backgrounded timeouts), the resulting behavior (foreground only, visible timeout error), the 30-min ceiling vs the 2-min default, the discovery/capacity exclusion, the user-settings `env` override risk, re-verifying after CLI/SDK bumps, and removal with the streaming-input migration | AC-004 / REQ-003 |

Delivery made no further text edits. The paragraph matches the validated integrated behavior: AC-002, AC-003 and AC-006 were confirmed live, and the post-integration live rerun passed on both CLIs.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude CLI process lifetime vs background tasks | One-string `query` per turn means the CLI exits at `result`; CLI-owned background tasks die with it | `investigation-notes.md`, `probe-evidence/probe-results.md` | `agent_execution.md` |
| Claude CLI runtime policy env | Forced values, override precedence, 30-min ceiling / 2-min default, discovery exclusion, settings-`env` override caveat, temporary status | `design-spec.md`, `requirements-doc.md` (REQ-001..003, DEC-003) | `agent_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Implicit CLI background Bash (`run_in_background`, auto-backgrounding at timeout) with a 10-min max | Foreground-only Bash with a 30-min ceiling for turn queries | `agent_execution.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A. The docs were updated.
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then the user-verification hold
- Notes: the integrated base's explicit built-in `tools` list also removes the other CLI-process-scoped tools from model context (Monitor, ScheduleWakeup, Cron*, Workflow, PushNotification). That mitigates API/E2E residual RSK-B on the integrated state. The existing tool-restriction paragraph already documents it, so no extra doc text is needed.
