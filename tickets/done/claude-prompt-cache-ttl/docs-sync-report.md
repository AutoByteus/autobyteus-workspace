# Docs Sync Report: autobyteus-273 Claude runtime one-hour prompt cache

## Scope

- Ticket: autobyteus-273 (`claude-prompt-cache-ttl`), `task_size` Small, `architectural_risk` Low, direct route (no architecture or code review selected).
- Trigger: API/E2E Pass, API-REV-002 (HEAD `3c085a8cbd`).
- Bootstrap base reference: `origin/personal` @ `d8df12435c`.
- Integrated base reference used for docs sync: `origin/personal` @ `a0c7275db8`, merged into the ticket branch as `69ef2596ca`.
- Post-integration verification reference: `evidence/delivery/DEL-01` … `DEL-07` (see `handoff-summary.md`, Integration).

## Why Docs Were Updated

- Summary: the implementation wrote the long-lived docs for the new behavior (REQ-005, proven by API-12). Delivery reviewed them on the merged state, resolved one merge conflict in `autobyteus-web/docs/settings.md`, and corrected one sentence in `llm_management.md`: since the merge, the Claude client spawns a third kind of Claude Code process (the `get_usage` read from autobyteus-303), and it also goes through the spawn builder.
- Why this should live in long-lived project docs: the one-hour default, its precedence below user choices, the toggle and the cost trade-off are lasting runtime behavior that users and developers configure.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/llm_management.md` | "Claude Agent SDK Prompt Cache Lifetime" (ticket); the base changed the Claude client and this file (Provider Usage) | Updated | Auto-merged cleanly; delivery widened the spawn list to name the model-listing and usage reads |
| `autobyteus-server-ts/docs/modules/token_usage.md` | 5m/1h cost breakdown rows (ticket); auto-merged with base changes | No change | Accurate on the merged state |
| `autobyteus-web/docs/settings.md` | "Server Settings: Claude Runtime" (ticket) conflicted with the base's rewrite of the Nodes section | Updated (merge resolution) | Kept the Claude Runtime section and the base's "Nodes: Manage Nodes (one list)"; the old "Nodes: Remote Collaboration" text the base removed stays removed |
| `autobyteus-web/docs/agent_execution_architecture.md` | Cost breakdown split rows (ticket); auto-merged | No change | Accurate |
| `autobyteus-server-ts/docs/modules/agent_runtimes.md` | Base added the available-agent-runtimes read that spawns Claude Code for `get_usage` | No change | Describes the read, not spawn env; the cache default is documented once in `llm_management.md` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Correction after integration | "every spawn (agent sessions and model listing)" → "every spawn (agent sessions, and the model-listing and usage reads that send no message)" | After the merge, `ClaudeSdkClient.readUsage` also spawns through `resolveSpawnEnvironment` → `buildClaudeSdkSpawnEnvironment` |
| `autobyteus-web/docs/settings.md` | Merge conflict resolution | Claude Runtime section kept before the base's new Nodes section | Both sides are current truth |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude prompt cache lifetime | AutoByteus adds `ENABLE_PROMPT_CACHING_1H=1` unless the toggle is `false` or the server env sets it; it ranks below `promptCacheTtl`, `CLAUDE_CODE_PROMPT_CACHE_TTL`, `FORCE_PROMPT_CACHING_5M`; AutoByteus never sets `CLAUDE_CODE_PROMPT_CACHE_TTL` | design-spec, investigation-notes T1–T6 | `llm_management.md` (written by implementation) |
| Claude runtime card | Absent = on; saves `true`/`false`; applies to sessions started afterwards without restart | requirements REQ-006 | web `settings.md` |
| Cost breakdown split | "Cache write 5m" / "Cache write 1h" rows; unsplit writes keep "Cache writes" | REQ-004 | `token_usage.md`, web `settings.md`, `agent_execution_architecture.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `claude-sdk-auth-environment` (auth-only spawn env) | `claude-sdk-spawn-environment.ts` (`buildClaudeSdkSpawnEnvironment`: auth policy, then the cache default) | `llm_management.md` "Claude Agent SDK Prompt Cache Lifetime" |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not applicable: docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, archive, finalization on `personal`, beta release (the user's decision).
- Notes: no docs-related follow-up found.
