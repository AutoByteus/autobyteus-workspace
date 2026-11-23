# Docs Sync Report — stopped-run-unavailable-model (Task autobyteus-53)

## Scope
- Ticket `stopped-run-unavailable-model` (`Medium` / `High`, reviewed route). SR-006. Base `origin/personal` @ `1f761bc8db` at bootstrap; refreshed to `27a08a1794` (two Antigravity tickets, no overlap with this change except unrelated test fixtures), merged without conflicts at `89d890796a`. Verification of the merged state: `evidence/delivery/DEL-01-*`.

## Why Docs Were Updated
A stopped run's save no longer refuses an AutoByteus model with a smaller or unknown context window (or a saved model the catalog no longer offers): it makes a **model hand-over**, a pending switch on the same agent runtime that the next message turns into a fresh session continuing from the Work Journal. Several long-lived docs still described the old rule ("AutoByteus requires verified positive non-decreasing context capacity").

## Long-Lived Docs Reviewed
| Doc | Result | Notes |
| --- | --- | --- |
| `GLOSSARY.md` | No change by delivery (updated in the ticket) | Continuation, model hand-over, switch marker, pending switch. Checked against `run-model-selection.ts` and the marker text |
| `autobyteus-server-ts/docs/modules/llm_management.md` | **Updated** | the capacity rule now chooses the continuation; reference model; the `handOver` capability (`available`/`unavailable`/`no_session`) |
| `autobyteus-server-ts/docs/modules/run_history.md` | **Updated** | a model-only edit may be a model hand-over (`continuation: hand_over`), stored as a pending switch with the same runtime on both sides; marker text |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | **Updated** | capacity compare keeps the session or hands over |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | **Updated** | member hand-over, Team default row takes any offered model |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | **Updated** | Org members; the Org's default launch row |
| `autobyteus-web/docs/settings.md` | **Updated** | the native model menu, help text, Save message and marker |
| `autobyteus-web/docs/agent_execution_architecture.md`, `agent_teams.md`, `agent_orgs.md` | **Updated** | AutoByteus replacements are offered; smaller or unknown windows hand over |
| `DESIGN.md`, `TESTING.md`, `RELEASE.md` | No change | No project rule changed. The baseline test fix followed TESTING Rule 9 in its own commit (`cef4f79481`) |
| Locale files (en, zh-CN) | No change by delivery (updated in the ticket) | `workspace.runModelConfig.nativeModelHelp` |

## Docs Updated
By delivery: the nine docs above marked Updated. New artifact: `release-notes.md`.

## Not Rendered By Any Stage
The rendered Settings menu and the new help text were not driven by any stage (the isolated desktop instance cannot use the scripted LM Studio endpoint). They are part of the user check (AC-011).

## Delivery Continuation
Result `Updated`. FU-001 (LM Studio models carry no verified capacity in the rule's catalog) is in `follow-ups.md`; the Solution Designer sends it.
