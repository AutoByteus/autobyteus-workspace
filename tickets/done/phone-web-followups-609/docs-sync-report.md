# Docs Sync Report — autobyteus-609 (phone-web-followups-609, absorbs autobyteus-575)

## Scope

- Ticket: `phone-web-followups-609`: ten bounded fixes, items A–J (the handoff lists each commit): A no `contextText` from the node; B the contract packages' `dist/` rebuilt and `pnpm check:contract-dist`; C no Windows staging folder left behind; D and D2 a stopped call reads "Stopped" on every surface, live and read back, on every runtime; E one shared summary key list, `summaryArgs` as JSON; F and G probe fixes; H relative links in a run's chat open that run's own file; I a stopped run's background tasks end as "Stopped: the run ended"; J file reads work right after a node restart; and SR-005, which removed the unused Codex run view provider, thread-history reader and normalizer.
- Trigger: API-REV-002 `Pass` (95.6 %), test-code review CRR-004 `Pass`; source review CRR-001 Pass, CRR-002 (failure-origin of API-REV-001, `Design Impact`, resolved by SR-004 / SR-005 and IR-002), CRR-003 Pass. `task_size` `Large`, `architectural_risk` `High`, route `Code Review` (reviewed).
- Bootstrap base reference: `origin/personal` `f2c0d2a902`.
- Integrated base reference used for docs sync: `origin/personal` `1956c232c8` (93 commits), merged as `fecee4ad82`.
- Post-integration verification reference: `evidence/delivery/` `DEL-01`…`DEL-07` on the merged tree plus delivery's three integration fixes (release/deployment report, "Initial Delivery Integration Refresh").

## Why Docs Were Updated

- Summary: the ticket changed contracts and behavior that long-lived docs describe or must now describe: what the node's history projection carries (`contextText` gone, `summaryArgs` a JSON object, an interrupted call's `interrupted` status), how a stopped call reads on every surface, which files exist in the Codex backend, how a conversation's relative Markdown links open, how a stopped run's background tasks end, how the REST workspace routes find a workspace, and what the Windows server preparer leaves behind. The ticket updated `TESTING.md` and `RELEASE.md` (item B) and left the web and server docs to delivery ("Delivery's docs sync", design `Final File Responsibility Mapping`). Three server docs still named the files that SR-005 removed.
- Why this should live in long-lived project docs: the stopped-call rule is decided in one node file and read by three surfaces and a work journal, and a later change to a writer's stored shape would silently turn "Stopped" back into "Failed" unless the rule and its inputs are written down; the Codex docs described a diagnostic `thread/read` path that no code has any more, which would send a later reader looking for it; the run-relative link rule (resolved against the run's own folder, never outside it) is a security-relevant behavior.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | The ticket applies existing rules (one owner per derived fact: the summary key list, the interruption rule, the workspace lookup; DESIGN.md rule 9: `summaryArgs` and `toolStatus` change as clean cuts) |
| `TESTING.md` | The testing guideline | Updated in the ticket (kept, verified) | Item B: "Build outputs" now names `pnpm check:contract-dist` for any change to a contract package. Delivery ran it on the merged tree (`PASS`, `git status` clean) and read the base's own changes to `TESTING.md` (file-watching and clean-image wording) as independent |
| `RELEASE.md` | Finalization and release rules | Updated in the ticket (kept, verified) | Item B: the "never commit `*/dist/`" rule names the exception (the contract packages' tracked `dist/`) and `check:contract-dist`. Read from the merged tree: the Finalization Target and Secret Gate rules did not change |
| `AGENTS.md`, `GLOSSARY.md` | Pointers; terms | No change | Neither names a changed component |
| `docs/design-cases.md` | Design cases | No change | The ticket's lesson (a read-side rule from what writers store, SR-004) is in `design-spec.md` D-D2 and `run_history.md` below; the design added no case bullet |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Names removed Codex files | Updated by delivery | See "Docs Updated" |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Names removed Codex files | Updated by delivery | See "Docs Updated" |
| `autobyteus-server-ts/docs/modules/run_history.md` | Projection model, runtime-native providers | Updated by delivery | See "Docs Updated" |
| `autobyteus-server-ts/docs/modules/workspaces.md` | Workspace routes | Updated by delivery | Item J |
| `autobyteus-web/docs/file_explorer.md` | File links in conversations | Updated by delivery | Item H |
| `autobyteus-web/docs/remote_access.md` | The phone's Activity | Updated by delivery | Items D and I (it already described the phone's rows from autobyteus-590) |
| `autobyteus-web/docs/agent_execution_architecture.md` | Activity components and shared builders | Updated by delivery | Items D, D2 and E |
| `autobyteus-web/docs/chat.md` | The "earlier events" page | Updated by delivery | Item E |
| `autobyteus-web/docs/electron_packaging.md` | `prepare-server` | Updated by delivery | Item C |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`, `agent_streaming.md` | The streams' contracts | No change | Item D's stop path is the same `TOOL_EXECUTION_INTERRUPTED` event the streams already carry; only the read-back changed |
| `autobyteus-server-ts/docs/modules/agent_memory.md` and the work-journal docs | Raw trace shape | No change | No writer changed: the new rule reads what the sequencer and the native memory manager already store, so persisted data is `Not Affected` |
| `autobyteus-web/docs/content_rendering.md` | Shared viewers | No change | It names which viewer renders which type; the run-relative link rule belongs with the other conversation file links in `file_explorer.md` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md`, `RELEASE.md` | Rule (by the ticket, item B) | `pnpm check:contract-dist` for a change to a contract package; the `dist/` exception | The drift the ticket found came from a dependent package |
| `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` | Contract | The `codex/history/` folder, `codex-thread-history-reader.ts` and `-item-normalizer.ts` removed from the owner lists; the "Thread History Replay Mapping" section now says a Codex run's history is read from the local replay trace and no code reads `thread/read`, and names the shared stopped-call rule; the diagnostic `thread/read` row of the event table, the `CODEX_THREAD_HISTORY_DEBUG` variable and three "diagnostic `thread/read`" sentences removed | SR-005 deleted the files; nothing reads `thread/read` (the variable is in no source or test file) |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Contract | The "Diagnostic/runtime-native Codex components" list reduced to `codex-tool-item-family.ts`; `CodexRunViewProjectionProvider` no longer named; the `thread/read` replay paragraph replaced by one saying Codex tool families reach the replay only through live normalization and a stopped call reads "Stopped" like every runtime's | As above |
| `autobyteus-server-ts/docs/modules/run_history.md` | Contract | `CodexRunViewProjectionProvider` removed from the runtime-native providers and the file list (Claude's stays, FU-009); new bullets: a stored interruption reads back as `interrupted` through `isInterruptedToolResult` (inputs: the result's source event, the native manager's `AgentTurnInterruptedEvent`, or the interruption texts; a failure stays a failure; a denial is decided first), carried as the Activity `status`, the conversation entry's `toolStatus` and the page card's `statusKey`; the projection carries no `contextText`; `summaryArgs` is JSON from `TOOL_SUMMARY_ARGUMENT_KEYS` | Items A, D2, E |
| `autobyteus-server-ts/docs/modules/workspaces.md` | Contract | New section "Workspace File Reads (REST)": `content` and `static/*` use `WorkspaceManager.getOrCreateWorkspace`, so the first read after a restart answers 200; an unknown ID or lookup failure answers 404 and creates nothing | Item J |
| `autobyteus-web/docs/file_explorer.md` | Behavior | A Markdown link in a run's conversation with a relative destination is a file link: resolved against the run's own folder, `#fragment` and `?query` dropped, opened like an absolute path inside the folder on desktop and phone; leaving the folder, no folder, a type that cannot be previewed → the usual "could not open" status; another node → "on node X"; a missing file → the viewer's error state; plain-text and inline-code relative paths are not links | Item H (AC-H1, AC-H2) |
| `autobyteus-web/docs/remote_access.md` | Behavior | The Activity status words add Stopped (stop icon) for an interrupted call; background tasks end as "Stopped: the run ended" when the list sees its run go from live to Offline, also when the node's end update was lost (the desktop panel the same) | Items D, I |
| `autobyteus-web/docs/agent_execution_architecture.md` | Architecture | The shared builders: `toolDisplaySummary.ts` reads `TOOL_SUMMARY_ARGUMENT_KEYS` from `@autobyteus/agent-presentation-contracts` (also read by the node's page cards); `interrupted` is "Stopped" with a stop icon on every surface; the node decides it and sends it as `status`, `toolStatus` and `statusKey`; the Team member reconciliation | Items D, D2, E |
| `autobyteus-web/docs/chat.md` | Behavior | The "earlier events" page's tool cards show the same summary and status as live cards | Item E |
| `autobyteus-web/docs/electron_packaging.md` | Behavior | `prepare-server.mjs` removes `.server-packaging-stage/` at the end of every run, also on failure; git ignores it | Item C |

All statements were checked against the code at the merged state: `isInterruptedToolResult` and its three inputs (`tool-result-interruption.ts`), the replay builder's use at `raw-trace-to-historical-replay-events.ts:93`, `TOOL_SUMMARY_ARGUMENT_KEYS` and the `summaryArgs` GraphQL field (`GraphQLJSON`), `toolActivityStatusPresentation('interrupted')` (label `Stopped`, icon `stop-circle`), `resolveRunRelativeFileLink` (the `#fragment` and `?query`, the refusal to leave the folder), the `useBackgroundTaskPanelView` watcher (live → Offline only, Error does not count), `findWorkspace` in `api/rest/workspaces.ts` (404 on any lookup failure), and the `try/finally` around the stage in `prepare-server.mjs`. `src/agent-execution/backends/codex/history/` does not exist and `thread/read` and `CODEX_THREAD_HISTORY_DEBUG` appear in no source or test file.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| A stopped call reads "Stopped" from one node rule | `isInterruptedToolResult` decides from what each writer already stores (no writer change, no migration), so old and new runs read alike on every runtime; the node sends it three ways and the web shows it on every surface | `design-spec.md` D-D, D-D2, DEC-010 | `run_history.md`, `agent_execution_architecture.md` |
| One summary key list for node and web | `TOOL_SUMMARY_ARGUMENT_KEYS` in the contracts package; a page card and a live card show the same summary | D-E, DEC-006 | `run_history.md`, `agent_execution_architecture.md`, `chat.md` |
| Run-relative links are confined to the run's folder | resolved against the run's own folder, never outside it | D-H, DEC-002 | `file_explorer.md` |
| The REST file routes restore a registered workspace | one lookup for GraphQL and REST | D-J, DEC-008 | `workspaces.md` |
| Codex history has one source | the local replay trace; no `thread/read` code | SR-005 | `codex_raw_event_mapping.md`, `codex_integration.md`, `run_history.md` |
| A contract package's tracked `dist/` is checked | `pnpm check:contract-dist` | D-B, DEC-003 | `TESTING.md`, `RELEASE.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The node's `contextText` on tool activities | nothing (each client summarizes the arguments) | `run_history.md` |
| The hand-kept summary key lists (web `toolDisplaySummary.ts`, the node page projection's `SUMMARY_KEYS`/`FILE_KEYS`/`COMMAND_KEYS`) and the GraphQL `EventMonitorToolSummaryArgs` object type | `TOOL_SUMMARY_ARGUMENT_KEYS`; `summaryArgs` as JSON | `run_history.md`, `agent_execution_architecture.md` |
| `CodexRunViewProjectionProvider`, `codex-thread-history-reader.ts`, `codex-thread-history-item-normalizer.ts`, `CODEX_THREAD_HISTORY_DEBUG` | the local replay trace (as for every runtime) | `codex_raw_event_mapping.md`, `codex_integration.md`, `run_history.md` |
| The web's `inferToolStatus` for a stored conversation tool entry | the node's `toolStatus` | `agent_execution_architecture.md` |
| A tool call's "Unknown" or "Failed" for a stop | `interrupted` / "Stopped" | `remote_access.md`, `agent_execution_architecture.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization on `personal`.
- Notes: docs match the integrated code. FU-009 (the unused `ClaudeRunViewProjectionProvider`) stays a follow-up, so `run_history.md` still names it as a diagnostic utility. Delivery added no follow-up: its findings were fixed in this delivery (below) or are already recorded.
