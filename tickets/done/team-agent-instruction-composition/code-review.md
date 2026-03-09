# Code Review

- Ticket: `team-agent-instruction-composition`
- Review Decision: `Pass`
- Last Updated: `2026-03-09`

## Findings

- None

## Review Checks

| Check | Result | Notes |
| --- | --- | --- |
| Shared composition contract replaces adapter-owned primary prompt policy | Pass | Codex and Claude now consume `member-runtime-instruction-composer.ts` with explicit team/agent/runtime sections |
| Team instructions + agent instructions both flow through bootstrap metadata | Pass | Resolved in `member-runtime-instruction-source-resolver.ts` and persisted by session lifecycle |
| Runtime teammate/tool facts remain separate from canonical instruction sources | Pass | `send_message_to` guidance remains a runtime-constraint adjunct |
| No compatibility wrapper keeps old hard-coded prompt path alive | Pass | Old render helpers were removed from Codex/Claude prompt assembly, and the generic `definition_instructions` wrapper is no longer used |
| Codex stabilization merge preserved instruction composition semantics | Pass | Live-session startup readiness, runtime-reference refresh, and thread-history/projection fixes were merged without dropping the explicit team/agent/runtime instruction contract |
| Frontend tool-label placeholder upgrade path is consistent | Pass | `unknown_tool` is now treated as a provisional placeholder across streaming segments, tool lifecycle updates, and activity entries, so later `send_message_to` metadata converges both views on the same label |
| Runtime wording stays mechanical rather than policy-prescriptive | Pass | Shared runtime guidance now says “if you use `send_message_to`” and “only for actual teammate delivery,” which avoids conflicting with team/agent-authored collaboration policy |
| Latest serialized live rerun surfaced no new review findings | Pass | Re-executing the full live Codex and live Claude suites after the wording refinement and frontend fix did not expose any new code-level concerns |
| Decoupling / module placement | Pass | Resolver lives in team bootstrap layer; composer lives in shared runtime layer |
| File-size gate for changed source files | Pass | Largest changed source files are now under the 500 effective non-empty line threshold |
| Delta size assessment (`>220` changed lines) | Pass | Delta is justified by cross-runtime contract extraction, bootstrap threading, adapter migration, and new tests |

## Residual Risks

- Repo-wide `pnpm run typecheck` and `pnpm exec tsc -p tsconfig.build.json` are not clean in this worktree because of pre-existing repository configuration/dependency issues outside this ticket. Focused runtime/unit/API coverage for the touched areas is green.
- Live Codex and live Claude external-runtime coverage are now green on this merged branch under `RUN_CODEX_E2E=1` and `RUN_CLAUDE_E2E=1`.
- The latest user-requested serialized rerun of both live suites stayed green, so there is no new review follow-up from the final validation pass.
- The latest frontend fix is covered by focused Vitest coverage only; no browser-level visual regression suite exists for the workspace conversation/activity split.
