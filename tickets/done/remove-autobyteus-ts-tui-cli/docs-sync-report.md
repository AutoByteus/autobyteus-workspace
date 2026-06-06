# Docs Sync Report

## Scope

- Ticket: `remove-autobyteus-ts-tui-cli`
- Trigger: Delivery-stage docs sync after API/E2E validation passed and post-validation durable-validation code re-review passed.
- Bootstrap base reference: `origin/personal` at `4a3bf83b2c221fad092e97b03bc1728bfd5f7558`
- Integrated base reference used for docs sync: `origin/personal` at `4a3bf83b2c221fad092e97b03bc1728bfd5f7558` after `git fetch origin personal` on 2026-06-06 13:12 CEST.
- Post-integration verification reference: Latest tracked remote base was identical to the reviewed/validated bootstrap base and ticket branch `HEAD`; no new base commits were integrated, so no behavior-changing re-run was required before docs sync.

## Why Docs Were Updated

- Summary: The change removes the native `autobyteus-ts` CLI/TUI surface, its examples/tests, and its Ink/React dependency/config graph. Active reader-facing docs and examples needed to stop advertising removed interactive runners and needed to record that supported interaction is now through programmatic agent/team APIs or server/web surfaces.
- Why this should live in long-lived project docs: The removal changes the package's public surface and future contributor guidance. Keeping the rule in active docs prevents reintroducing `src/cli/**`, `runAgentCli`, `runAgentTeamCli`, Ink widgets, or compatibility wrappers without a new design.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/nodejs_architecture.md` | Architecture doc previously described package architecture and needed durable removal guidance. | `Updated` | Current branch adds `Native CLI / TUI Removed`, points to programmatic/server/web surfaces, and distinguishes terminal runtime tools from removed native UI. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/examples/README.md` | Active examples entrypoint previously listed removed interactive runners and exit/TUI instructions. | `Updated` | Current branch now documents only the surviving non-interactive status-transition example and states native CLI/TUI runners were removed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/tool_schema_and_configuration.md` | Future-extension wording mentioned CLI integration. | `Updated` | Current branch changes the future surface to programmatic or server/web-owned developer tooling. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` | Runtime approval path wording could imply native CLI remains a supported caller. | `Updated` | Current branch now refers to external API, server/web UI, or other programmatic callers. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/README.md` | Root workspace README was checked for active native CLI/TUI instructions. | `No change` | Mentions an unrelated application-devkit CLI and terminal workspace behavior, not the removed `autobyteus-ts` native CLI/TUI surface. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs` and `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/examples` | Broad active docs/examples scan for removed symbols and stale instructions. | `No change` | Remaining matches are intentional removal guidance in `nodejs_architecture.md`; no active instructions to run deleted examples, exit a single-agent CLI, or press `q` in a team TUI remain. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/nodejs_architecture.md` | Long-lived architecture guidance | Records native CLI/TUI removal, supported programmatic/server/web paths, no-compatibility-wrapper rule, and terminal-tooling separation. | Prevents stale architecture understanding and future accidental reintroduction of the obsolete native UI surface. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/examples/README.md` | Active examples documentation | Removes deleted interactive examples and CLI/TUI usage instructions; documents the remaining status-transition utility. | Keeps example docs aligned with surviving files and `tsconfig.examples.json`. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/tool_schema_and_configuration.md` | Future-extension wording | Replaces CLI-specific listing idea with programmatic/server/web-owned developer tooling. | Avoids implying a removed native CLI integration is still planned by default. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/agent_runtime_loop_and_interrupt.md` | Runtime caller wording | Replaces `API/UI/CLI` approval wording with external API, server/web UI, or programmatic caller wording. | Keeps runtime docs accurate after native CLI removal while preserving supported approval flow semantics. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Native CLI/TUI removal boundary | `autobyteus-ts` is now a programmatic runtime/library package without a native interactive CLI/TUI surface; removed APIs should not be restored as stubs or wrappers without a new design. | Requirements doc; design spec; implementation handoff; code review report; API/E2E validation report | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/nodejs_architecture.md` |
| Supported interaction paths | Interactive workflows should use programmatic agent/team APIs or server/web surfaces, not deleted native CLI/TUI runners. | Requirements doc; design spec | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/nodejs_architecture.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/examples/README.md` |
| Terminal tools are not native CLI/TUI UI | `src/tools/terminal/**`, `node-pty`, and terminal runtime tooling remain part of runtime tools and are outside the removal boundary. | Requirements doc; design spec; validation report | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/nodejs_architecture.md` |
| Developer-tooling future surface | Tool/schema listing should be programmatic or server/web-owned unless a new CLI design is explicitly approved. | Design spec; implementation handoff | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/tool_schema_and_configuration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-ts/src/cli/**` single-agent CLI and Ink agent-team TUI | No native replacement; use programmatic agent/team APIs or server/web surfaces. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/nodejs_architecture.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/examples/README.md` |
| Root exports for `runAgentCli`, `runAgentTeamCli`, `InteractiveCliDisplay`, `TuiStateStore`, and TUI widgets | Existing non-CLI root exports and supported deep subpaths only. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/docs/nodejs_architecture.md`; durable test `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/tests/integration/public-surface/cli-tui-removal.test.ts` |
| CLI/TUI example runners and `examples/agent-team/**` | One remaining non-interactive status-transition example. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/autobyteus-ts/examples/README.md` |
| Direct `ink`, `react`, `@types/react` package edges and JSX config for deleted TSX files | No replacement; package build remains plain TypeScript runtime/library build. | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/tickets/done/remove-autobyteus-ts-tui-cli/implementation-handoff.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-autobyteus-ts-tui-cli/tickets/done/remove-autobyteus-ts-tui-cli/api-e2e-validation-report.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Not applicable. This change has docs impact, and active docs/examples in the current branch were updated and verified during delivery docs sync.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Long-lived docs are aligned with the integrated, reviewed, and validated state. Delivery-stage review found no additional long-lived doc edits required beyond the current branch's doc/example updates. Continue to handoff summary and user-verification hold; do not archive, push, merge, release, deploy, or clean up until explicit user verification is received.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Not applicable.
