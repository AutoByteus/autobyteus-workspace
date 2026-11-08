# Investigation Notes — autobyteus-434

## Investigation Meta

- Package identifier: `phone-live-updates-434` (Project Task `autobyteus-434`)
- Request / ticket: autobyteus-434, "Phone: a running agent's conversation does not update in real time (the desktop does)"
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434`, branch `codex/phone-live-updates-434`
- Resolved base remote / branch / revision: `origin/personal` at `eebbc2b8ee` (fetched 2026-11-08; release v1.5.12-beta.8)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the refreshed `origin/personal`; `pnpm install --frozen-lockfile`, server `prebuild` and `build`, `nuxt prepare`, `build:mobile-web` all passed (log `/tmp/sd434-install.log`, not kept).
- Bootstrap blocker: None
- Current solution revision ID: `SR-002` (requirements unchanged since SR-001)
- Authorities read (requirements reading gate; 2026-11-08): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`, `TESTING.md` (test layers, environments, browser probes, Docker nodes), `AGENTS.md`
- Investigation status: requirements investigation complete; causes reproduced (see Runtime findings). Architecture investigation continues in this file (Architecture Investigation Findings).

## Initial Request And Clarifications

- Original request: the user (2026-11-08) watched a running Software Engineering Team on the phone (Android app beta.7): the Solution Designer member's conversation "still shows his last sent message", not updating in real time, while the desktop's event monitor updates live. One screenshot (7:44).
- Clarifications received (Task comments, all 2026-11-08):
  1. Live updates work on the phone for the Project Task Manager (top-level agent on the desktop node); the problem was the Team member; it "seemed to get better after navigating back and forth".
  2. 7:51 screenshot: the same run now shows three Bash calls (two done, one spinning); "I can see some response now. I don't know when it comes out."
  3. "Maybe it's a delay … maybe it's not a big problem." The PM sets LOW urgency: investigate and measure first; if short, explain and close; if a real stall or a 403/416 regression, fix.
  4. 7:58 screenshot: after leaving the run and coming back, the user's own message appears at the END, after the agent's later Bash calls ("my own message appeared … again"). The PM: treat as part of this ticket unless it is a different cause; tell the PM if it should be a separate fix.
- User-supplied facts and constraints: no new Android permission without approval; do not weaken 403/416 beyond the exact route the phone needs; tests on an isolated node and the emulator; no secrets in logs; no screenshots with real machine/tailnet names; release only on the user's word.
- Initial ambiguity: which node; whether a guard (403/416) refused the stream; whether the phone stalls or there were simply no events.

## Product And Domain Understanding

- Product area: the phone's run screen (`/mobile` bundle in the Android WebView shell) and the shared web client's live run streams (`autobyteus-web/services/agentStreaming`, Org and collaboration streams); the node's run history (stored conversation) and live input state.
- Affected actors or systems: the user on the phone (and any browser/desktop window that loses its connection to a node or opens a run whose turn is still running); the node.
- Existing user or operational purpose: watch a running agent/team member live from the phone; reopen a run and see its conversation in the right order.
- Relevant terminology: *run stream* = the WebSocket the client keeps per open run (`/ws/agent/:runId`, `/ws/agent-team/:teamRunId`, `/ws/agent-org/:orgRunId`, `/ws/agent-collaboration/:runId`); after (re)connecting the node sends `CONNECTED` and a full snapshot, so a reconnect catches up. *Input state* (`AGENT_INPUT_STATE`) = the node's live list of the run's queued/held/forwarded inputs; a forwarded message stays listed until its turn ends. *Projection* = the stored conversation the client loads when it opens a run.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-08 | Data | `docker logs --since 24h autobyteus-server-{0,1,2}` and `/root/.autobyteus/server-data/logs/server.log` in them, grep `PHONE_ACCESS_ROUTE_REFUSED`, `REMOTE_ACCESS_HOST_REFUSED`, `REMOTE_ACCESS_ORIGIN_REFUSED`, `REMOTE_ACCESS_AUTH_INVALID` (counts only) | The Task's first check (403/416) | 0 refusals on all three Docker nodes; the only "4403" strings are VNC encoder ratios | None |
| 2026-11-08 | Data | `~/.autobyteus/server-data/logs/server.log` (desktop node), grep `Agent team websocket attached … software_engineering_team_ce8b…` | Which node ran the blog team | The blog team `software_engineering_team_ce8b6e8c…` runs on the **desktop node** (port 29695), not a Docker node; its team stream was attached 19 times today (phone + desktop opens); no refusal codes | None |
| 2026-11-08 | Data | Read-only GraphQL `getTeamMemberRunProjection` on the desktop node for the blog team's `/solution_designer` (`/tmp/sd434-q*.mjs`, not kept), times converted to CET | What events existed at 7:44, 7:51, 7:58 | Stored order: user message 07:32:55 (#54) → assistant 07:33:37 → … → "The build is still fetching the `node:24-bookworm-slim` base image. Waiting…" 07:39:26 (#91) → next Bash recorded 07:49:28 (#92), 07:49:33 (#93), 07:50:26 (#94) → 07:58:52 (#95). At 7:44 the agent was inside a single ~10-minute Bash wait: **no new events existed to show**. The 7:51 screenshot (two done, one spinning) matches #92–#94 exactly. | None |
| 2026-11-08 | Data | Read-only: `~/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ce8b…/solution_designer_5909…/raw_traces_active.jsonl` and `raw_traces_000001.jsonl`, user records' keys only | Why the user's message moves | Every `trace_type: user` record (2026-11-04 … 2026-11-08 07:32:55) has keys `content,id,seq,source_event,trace_type,ts,turn_id`: **no `message_id`, no `dedupe_key`**. Runtime of the member: `claude_agent_sdk` (team also has `codex_app_server`) | None |
| 2026-11-08 | Code | `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts` | Phone live path (Team + single agent) | `maxReconnectAttempts: 5`, delays 1,2,4,8,16 s, then emits `Max reconnection attempts reached` and stays `DISCONNECTED`; no `online`/`visibilitychange` handling; no liveness check | Design |
| 2026-11-08 | Code | `autobyteus-web/stores/agentTeamRunStore.ts` `connectToTeamStream` | Why re-opening helps | Re-selecting a run reconnects only when the client is `DISCONNECTED`; a socket that looks `CONNECTED` is reused | Design |
| 2026-11-08 | Code | `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts` (`MAX_TRANSPARENT_RECOVERY_ATTEMPTS = 5`), `services/agentCollaboration/agentRunCollaborationStreamingService.ts` (`MAX_RECOVERY_ATTEMPTS = 5`), `services/nodeChangeFeed/nodeChangeFeed.ts` (unlimited, ≤10 s) | Same surfaces (Org member, delegated copy) | Org and collaboration streams also stop after 5 attempts; the node change feed already retries forever | Design |
| 2026-11-08 | Code | `autobyteus-web/components/mobile/MobilePairedShell.vue` | Phone polling | The phone polls the run list every 5 s only on the list screen and only while visible (E-25); the run screen relies on the run stream only | None |
| 2026-11-08 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts` `PHONE_WEBSOCKET_ROUTES` | 403 guard | `/ws/agent/:runId`, `/ws/agent-team/:teamRunId`, `/ws/agent-org/:orgRunId`, `/ws/agent-collaboration/:runId` are on the phone's allowed list; `/ws/terminal` is not | None (not the cause) |
| 2026-11-08 | Code | `autobyteus-server-ts/src/agent-execution/input/agent-run-input-admission-state.ts` (`observeTurnTerminal`, `pendingSnapshot`) | Why the message is "pending" during the turn | A forwarded input stays in the input state (`state: "forwarded"`, with `message_id`/`dedupe_key`) until its turn's terminal | Design |
| 2026-11-08 | Code | `autobyteus-web/services/agentStreaming/handlers/agentInputStateHandler.ts`, `userMessageProjection.ts` (`upsertPendingUserMessage`, `applyPendingUserMessage`, `overlayPendingUserMessages`), `services/runHydration/memberLoader.ts` | How the client places pending inputs | A pending entry is matched to a shown user message by message identity; with no match it is **pushed at the end** of the conversation | Design |
| 2026-11-08 | Code | `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` `recordForwardedUserMessage`; `store/external-runtime-memory-writer.ts`; `autobyteus-ts/src/memory/models/raw-trace-item.ts`; `agent-memory/services/raw-trace-record-normalizer.ts`; `run-history/projection/transformers/*` | Where the identity is lost | The reader chain carries `message_id`/`dedupe_key` from raw trace to projection, and `RawTraceItem` writes them; but the server's recorder for external runtimes (Claude Agent SDK, Codex, AGY) never passes them to `appendRawTrace`, and the writer's user branch does not forward them | Design |
| 2026-11-08 | Command | `node tickets/in-progress/phone-live-updates-434/evidence/repro/phone-live-repro.mjs --scenarios=…` (runs 1–5) | Reproduce and measure | See Runtime findings | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | The phone has a running run open (Team member or agent), screen on | Node event → run stream → conversation | Shown ~46 ms after the node delivered it (3 of 3 markers) | Run 3 R1 | Measured |
| BEH-002 | System | The phone's path to the node drops briefly (≤ ~30 s) | Client reconnects (1,2,4,8,16 s), node sends a snapshot | Events missed during the outage appear after reconnect (7.2 s after the end of a 6 s outage); later events ~46 ms | Run 3 R2 | Reproduced |
| BEH-003 | System | The node is unreachable for longer than ~31 s (phone asleep / app in background with Android restricting network, Wi-Fi↔LTE, Tailscale reconnecting, laptop asleep), then reachable again, phone screen on | The client tried 5 times (t+1, +3, +7, +15, +31 s), logged `Max reconnection attempts reached` and stopped | The run screen stays frozen without any sign; a new event was still not shown 60 s after the node was reachable again; leaving and re-opening the run reconnects and shows it within 0.25 s | Run 4 R3 | Reproduced |
| BEH-004 | System | The path dies silently (no close/reset reaches the phone: a dead NAT/tailnet mapping, a socket left behind by a sleeping phone) | Nothing detects it; the socket stays "connected" | No new event shown within 90 s; leaving and re-opening the run did **not** recover it (the open reuses the "connected" stream); only a page reload would | Run 4 R4 | Reproduced |
| BEH-005 | User | A user message started a turn that is still running (the agent works for minutes), and a view opens/loads that run's conversation during the turn (another phone/desktop window, the app's page reloaded, the node switched and back) | Stored conversation is loaded (user message in place, but without its id); the node's input state lists the message as `forwarded` with its id; the client cannot match it and appends a second copy at the end | The user's message appears twice: in place and again at the end after the agent's later tool calls; after the turn ends the extra copy can remain until the next full load | Run 5 R6 (`freshDuringTurn` 2 copies, tail `run_command, You, PHONE-LONG…`); user's 7:44/7:58 screenshots; stored record has no id (real run and repro) | Reproduced; the stored order on the node is correct |
| BEH-006 | User | The view that sent the message stays open, or re-opens the run in the same page during the turn | The view kept the message with its id | One copy, in place | Run 5 R6 (`liveView`, `reopenedDuringTurn` 1 copy) | Reproduced |
| BEH-007 | Contract | A paired phone opens run streams with its credential | 403 phone-route guard and 416 Host/Origin rules | All run streams the phone uses are allowed; `/ws/terminal` is refused; no refusal in any node log | Code + logs | Read + Measured |
| BEH-008 | User | The agent runs one long command (a 10-minute wait), screen on | No events exist; the last tool card shows running | Nothing new appears until the command ends: correct behavior, not a delay | Real run #91→#92 (07:39:26 → 07:49:28) | Measured |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts` | Transport of the agent and Team run streams; 5 attempts then gives up | REQ-001/002 | Where the retry/resume policy lives; one owner for all run streams |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`, `AgentStreamingService.ts` | Sync phase per stream; a reconnect yields `CONNECTED` + snapshot → catch-up (BEH-002) | Catch-up after any reconnect already works | Reuse the snapshot path for resume re-sync |
| `autobyteus-web/stores/agentTeamRunStore.ts` `connectToTeamStream` | Reconnects only from `DISCONNECTED` | BEH-004 | Whether opening a run should re-sync |
| `agentOrgStreamingService.ts`, `agentRunCollaborationStreamingService.ts` | Own sockets; 5 recovery attempts then `reportError`/reject readiness | REQ-001/002 consistency | Keep readiness error semantics, keep retrying |
| `MobilePairedShell.vue` | Already tracks page visibility for list polling | REQ-002 | Visibility as resume trigger is an existing phone concept |
| `agent-run-input-admission-state.ts` | Forwarded input listed until turn terminal, with id | BEH-005 | Not changed: the listing is correct |
| `userMessageProjection.ts`, `memberLoader.ts` | Pending entry matched by identity, else appended | BEH-005 | Not changed if the stored message carries its id |
| `runtime-memory-event-accumulator.ts` `recordForwardedUserMessage`, `external-runtime-memory-writer.ts` | Write the stored user message for external runtimes without id | REQ-004 | Write `message_id`/`dedupe_key` from the forwarded message's metadata |
| `autobyteus-ts` `RawTraceItem`, server `raw-trace-record-normalizer.ts`, projection transformers | Already write/read the id | REQ-004 | No reader change needed |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents: per-run raw trace files (`raw_traces_active.jsonl`, archives) — user records gain two optional keys (`message_id`, `dedupe_key`) that the format already defines (`RawTraceItem.toDict`).
- Existing readers, writers: `RawTraceItem.fromDict`, `raw-trace-record-normalizer.ts`, projection transformers (read); `ExternalRuntimeMemoryWriter` (write, external runtimes), `autobyteus-ts` ingestion (write, native).
- Evidence paths: above.

### Structural Surfaces

- Runtime modules: the web client's four run-stream services and their transport; the server's memory recorder for external runtimes.
- Existing structural surfaces that can support the approved behavior: snapshot-on-connect of every run stream (catch-up); page-visibility tracking on the phone; the identity-matching of pending inputs.
- Evidence paths: above.

### Potential Structural Impacts To Investigate

- API or external-contract change: none needed for REQ-001…004 (no new stream message); a liveness heartbeat for a screen-on silent dead path would change four stream contracts (see FU-001).
- Persistence schema or invariant change: two optional, already-defined keys on new user raw-trace records; no migration.
- Security or privacy boundary change: none (403/416 untouched).
- Concurrency or lifecycle change: stream reconnect lifecycle on the client.
- Confirmed absent, present, or unknown: confirmed as listed.

## Runtime, Probe, Or Reproduction Findings

All runs: one isolated node from this worktree's `dist/app.js` (temp data root and HOME, port chosen free), scripted AGY CLI (`AGY_FAKE_CASE=interrupt_resend`: `REPLY:<message>`, `HOLD_MS:<n>` holds one tool step), a Team "Delivery Team" (lead + mate), the node's production phone bundle at `/mobile`, paired through Phone Access, headless Chrome 390×844, reaching the node at `http://192.168.77.10:<proxy>` through a script-owned TCP proxy (`pass` / `refuse` / `blackhole`). A second Team-stream client on the node plays the desktop and sends markers. Cleanup receipts in each `repro-summary.json` (server exited, temp root removed).

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `phone-live-repro.mjs --scenarios=R1,R5,R2` | R1 baseline | 46, 45, 47 ms from the node's reply to the phone showing it | Measured | Live path is fine (BEH-001) | `evidence/repro-run-3/` (stdout in this file's BEH table) |
| same | R5 order, short turns | Order identical live, after re-open, and on the node | Reproduced | Not the order bug | `evidence/repro-run-3/R5-*.png` |
| same | R2 6 s outage | Missed marker shown 7.2 s after the outage ended; next 46 ms | Reproduced | Short outages already recover (BEH-002) | `evidence/repro-run-3/` |
| `--scenarios=R3,R4` | R3 45 s outage | 5 attempts at t+1/3/7/15/31 s, `Max reconnection attempts reached`, never again; marker not shown in 60 s after the node was back; re-open: 246 ms | Reproduced | REQ-001, REQ-002 | `evidence/repro-run-4/repro-summary.json` |
| same | R4 silent dead path | No close noticed, marker not shown in 90 s, re-open did not recover in 30 s | Reproduced | REQ-002 (resume), REQ-003 (re-open), FU-001 (screen-on detection) | `evidence/repro-run-4/repro-summary.json` |
| `--scenarios=R6` | R6 re-open during a 30 s turn | Same page: 1 copy; fresh client during the turn: 2 copies, the second after the tool card; stored entries `hasMessageId: false` | Reproduced | REQ-004 | `evidence/repro-run-5/repro-summary.json`, `R6-*.png` |
| Read-only queries/files on the desktop node | The user's real run | No events between 07:39:26 and 07:49:28; user records without id | Measured | BEH-008; REQ-004 | Source Log |

- Temporary diagnostics: None (no product code was changed; the probe only observes).
- Reproduction for implementation to start from: `tickets/in-progress/phone-live-updates-434/evidence/repro/phone-live-repro.mjs`; run from any folder: `node <worktree>/tickets/in-progress/phone-live-updates-434/evidence/repro/phone-live-repro.mjs --output-dir=<fresh dir> --scenarios=R1,R2,R3,R4,R6` after `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web` (about 6 minutes; `SD434_WORKTREE` overrides the worktree path). Today R3 and R4 show `null` (not shown) and R6 `freshDuringTurn.copies: 2`; after the fix R3/R4 show a delay and R6 one copy. It is investigation evidence, not the product test (the durable tests belong to implementation and API/E2E).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User, 7:44 screenshot | View "stuck" on his last message | Explained by BEH-008 (no events) plus BEH-005 (his message shown again at the end) | REQ-004 | None |
| User, comment 1 | Better after navigating back and forth | Consistent with BEH-003 (re-open reconnects) | REQ-001, REQ-002 | None |
| User, comment 3 | Low urgency | Strong | No release pressure | None |
| User, 7:58 screenshot | Own message at the end | Strong, reproduced | REQ-004 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Browser/WebView WebSocket | WHATWG | No API to see pings; a silent dead TCP path fires no `close` until the OS gives up | R4 | Screen-on detection needs an app-level heartbeat (FU-001) |
| Page Visibility API, `online` event | WHATWG | `visibilitychange` fires when the Android app goes to background/foreground or the screen turns off/on (the phone shell already relies on it for polling) | `MobilePairedShell.vue` E-25 | `online` fires only when the device had no network at all |
| Android WebView / Doze | Android | Background apps lose network; sockets left open may be dead on the node side | Platform behavior (not reproduced on the emulator yet) | Emulator check belongs to validation |

## Persisted Data And State Facts

- Affected stored subject: user records in per-run raw trace files of external-runtime runs.
- Representative shape: `{id, ts, turn_id, seq, trace_type: "user", content, source_event}`; native runtime records add `message_id`, `dedupe_key`.
- Approximate volume: one record per user message.
- Current readers and writers: as above.
- Current unknown/extra-field behavior: readers accept the keys when present and ignore their absence.
- Required semantics: older records stay readable unchanged.
- Acceptable loss: older records keep no id; their only effect (BEH-005) needs a turn that started before the node update to still be running after it, which a node update ends.
- Remaining evidence gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. No new screen or UI element is proposed.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/repro/phone-live-repro.mjs` | Solution Designer | Reproduction and measurement | R1–R6 | AC-001…AC-005 | Current | Evidence, not behavior-defining |
| `evidence/repro-run-3/`, `repro-run-4/`, `repro-run-5/` | Solution Designer | Measured results (summaries, screenshots of the isolated node only) | R1–R6 | as above | Current | Evidence |
| `evidence/repro-run-1/`, `repro-run-2/` | Solution Designer | First attempts (fake-agent mode answered "OK"; superseded) | — | — | Superseded | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | The user's 7:44 "stuck" view was not proven to be BEH-003/004 (the node had no new events then); the stall is a separate, reproduced defect that matches "better after navigating back and forth" | Explanation to the user must not overclaim | Explain both plainly | Open (communication) |
| RSK-002 | Unknown | Android-specific background behavior (Doze closing vs. silently killing sockets) on the real WebView | Validates REQ-002 on the device class | API/E2E on the emulator (Task asks for it) | Open |
| RSK-003 | Risk | Unlimited retries against a node that is gone cost a request every ≤30 s while visible | Battery/noise | Only while visible; capped; the node change feed already does this every ≤10 s | Accepted in design |

## Architecture Investigation Findings

See the design spec for target decisions. Facts gathered for design (2026-11-08):

- Run-stream owners and their reconnect: `WebSocketClient` (agent + Team) gives up after 5; Org and collaboration services each own a socket with a 5-attempt limit and an error report; the node change feed retries forever (≤10 s). Four copies of a reconnect policy exist; none reacts to page visibility or `online`.
- Catch-up: every run stream sends `CONNECTED` then a snapshot on connect (Team: `TEAM_EXECUTION_VIEW_SNAPSHOT`; Org and collaboration: their connected root + snapshot); `TeamStreamingService.handleConnect` resets the phase from `disconnected`; the snapshot invalidates member projections, which reload (R2, R3 re-open).
- The phone already tracks `document.visibilityState` in `MobilePairedShell.vue` (list polling only).
- Identity: `ExternalRuntimeMemoryWriter.toRawTraceItem` user branch sets `fileAttachments`, `senderId`, `media`, `correlationId` but not `messageId`/`dedupeKey`; `RawTraceItem` accepts and serializes them; the forwarded payload's `message.metadata` carries `message_id` and `dedupe_key` (the input state reads them there: `pendingSnapshot`).

### SR-003 additions (2026-11-08, after ARCH-REV-001)

- `runContextHydrationService.ts:56-155`: `loadRunContextHydrationCandidate` reads the projection, the resume config and the file changes in parallel, then resolves the workspace (needs `resolveWorkspaceMetadataByRootPath`) and rebuilds `config`. The projection and file-change reads are separable from config/workspace building (Read).
- `agentOrgStreamingService.ts`:
  - `connect()` (`:80-92`) resets the count and opens or schedules;
  - `requestRecovery()` (`:95-101`) is guarded by `transparentRecoveryScheduled`/`InFlight`;
  - `reopenOwned(generation)` (`:136-166`) needs no socket for `null`;
  - `failClosed` (`:405-421`) schedules recovery;
  - the snapshot accept (`:315-327`) resets the count.
  
  (Read)
- `agentRunCollaborationStreamingService.ts`:
  - `processFrame` catch (`:160-171`) closes and schedules;
  - the snapshot accept (`:195-203`) resets the count;
  - `checkpoint_required` (`:215-222`) does `closeSocket` + `connect`.
  
  (Read)
- `grep RECONNECTING` over `autobyteus-web`: read only inside `WebSocketClient.ts` (Read).
- File sizes: `agentRunStore.ts` 515, `TeamStreamingService.ts` 486, `agentOrgStreamingService.ts` 524, `AgentStreamingService.ts` 345 lines (Measured, `wc -l`).

## Requirement Implications

- The 403/416 lead is ruled out (no refusals; routes allowed). No security change.
- The live path itself is fast (46 ms). The user's 7:44 view was correct about events; what was wrong in it is the duplicated message at the end (REQ-004).
- Two real stall defects exist on the phone's path (BEH-003, BEH-004) and match "better after navigating back and forth" (REQ-001…003).
- The order symptom is a different cause (server recording), not phone-specific; kept in this ticket per the PM's direction; the PM is told.

## Notes For Architecture Design

- Map SCN-001…SCN-004 to: the run-stream reconnect lifecycle (all four run streams), the open-run path (`connectToTeamStream` and its agent/Org/collaboration equivalents), and the external-runtime memory recorder.
- Preserve: snapshot catch-up, non-retryable close codes (4004/4005), readiness/error semantics of Org and collaboration streams, the phone's no-polling-while-hidden rule (E-25), 403/416.
