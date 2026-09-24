# Docs Sync Report

## Scope

- Ticket: `claude-sdk-builtin-tool-restriction`
- Trigger: API/E2E validation PASS (direct low-risk route; `task_size=Small`, `architectural_risk=Low`; SR-002 / IR-001 / API-REV-001)
- Bootstrap base reference: `origin/personal` @ `9267d11c8e82f9798b3870362b221edf39d3d7df`
- Integrated base reference used for docs sync: `origin/personal` @ `9267d11c8` (re-fetched 2026-09-24; no new commits, ticket branch already current)
- Post-integration verification reference: `claude-sdk-client.test.ts` rerun on the integrated state, 18/18 pass (see `release-deployment-report.md` § Initial Delivery Integration Refresh)

## Why Docs Were Updated

- Summary: the implementation already rewrote the Claude built-in tool policy paragraph in `autobyteus-server-ts/docs/modules/agent_execution.md` and removed the superseded "do not use a `tools` allowlist" guidance. API/E2E validated that paragraph (AC-007). Delivery refined the paragraph for two durable facts that API/E2E surfaced:
  1. RR-2: the executed Claude Code CLI is resolved by `resolveClaudeCodeExecutablePath()`. That means an env override (`CLAUDE_CODE_EXECUTABLE_PATH` / `CLAUDE_CODE_PATH` / `CLAUDE_CLI_PATH`) first, then `claude` on `PATH`. So built-in tool renames (R-001) can arrive through a user CLI update, not only an SDK bump. The re-verify guidance now covers both triggers.
  2. RR-1: sessions created before this policy keep an earlier agent-type listing in their persisted transcript history. On resume the tool list is still restricted and native calls still fail. This follows the approved `Not Affected` persisted-data decision.
- Why this should live in long-lived project docs: future SDK or CLI upgrades are the main regression vector for this policy (R-001). Maintainers need to know which CLI to re-verify against. They also need to know what resumed legacy sessions look like, so they don't misread that as a policy failure.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` (Claude SDK query-options paragraph, ~L438) | Canonical home of the Claude built-in tool policy | Updated | Implementation rewrite validated; delivery refined the re-verify and resume notes |
| `autobyteus-server-ts/docs/modules/agent_execution.md` (SDK version paragraph, ~L463) | Adjacent SDK pin note | No change | Still accurate (0.3.280 pinned) |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Mentions built-in tool-like items | No change | Codex runtime; unaffected |
| Repository-wide `*.md` (excluding tickets) grep for `AskUserQuestion`, `disallowedTools`, Claude subagent/built-in tool guidance | Find stale guidance elsewhere | No change | Only the updated paragraph matches |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Policy rewrite (implementation, IR-001) | Documents the explicit `tools` list (10 built-ins), the widened `disallowedTools` safety net, and the fact that it covers normal turns only, with MCP tools unaffected. Removes the "do not use a `tools` allowlist" guidance | DEC-004 superseded the old guidance |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Refinement (delivery) | The re-verify note now names the executable resolution order and covers CLI updates as well as SDK bumps. Adds the resumed-legacy-session transcript note | RR-2 and RR-1 from API/E2E |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude built-in tool policy | Explicit 10-tool `tools` list plus the safety-net disallow list. Both are product constants for normal turns only. Model discovery is separate | `design-spec.md`, `requirements-doc.md` | `agent_execution.md` |
| Re-verification trigger | Tool names come from whichever Claude Code CLI is resolved (env override → PATH → bundled default). Re-verify on SDK bumps and on CLI updates | `api-e2e-execution-coverage-report.md` (RR-2) | `agent_execution.md` |
| Legacy resumed sessions | An old agent listing may remain in transcript history. The restriction still holds | `api-e2e-execution-coverage-report.md` (RR-1) | `agent_execution.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Policy "`disallowedTools: ["AskUserQuestion"]` only; do not use a `tools` allowlist" | Explicit `tools` allowlist plus the widened `disallowedTools` safety net | `autobyteus-server-ts/docs/modules/agent_execution.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A (docs were updated)
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and user-verification hold
- Notes: OBS-1 (the stale `refType` in the gated live Claude team E2E) and OBS-2 (the test-file spacing nit) are code or test observations, not docs issues. Both are recorded in the handoff summary.
