# Design Spec — Grok Build compaction detection and raw-trace rotation

## Solution And Approval Basis
Package grok-compaction-analysis, SR-002; requirements approved (U02): REQ-G1–G4, DEC-G1–G3. Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/grok-compaction-analysis, branch codex/grok-compaction-analysis, base origin/personal @ ea826a5e4, finalization target origin/personal. Evidence: investigation-notes.md G01–G18; probes/.

## Current-State Read
Grok runs through the shared ACP layer. Grok's `_x.ai/session_notification` extension traffic reaches grokBuildSessionProfile.interpretExtNotification, which turns only `response_completed` into a usage effect; compaction notifications (auto_compact_started/completed/failed/cancelled) are dropped. No COMPACTION_STATUS is ever emitted for Grok, so the shared recorder never writes a marker and raw traces never rotate.

## Task Size And Architectural Risk (Mandatory)
- task_size: **Medium** — a new effect kind in the ACP profile contract, Grok mapping, a small compaction operation tracker in the ACP converter with closes at the three existing turn-ending functions, a Grok payload builder, unit/replay tests, a gated live E2E and docs.
- architectural_risk: **Low** — reuses the shipped COMPACTION_STATUS contract, recorder rotation and web/history pairing (Claude/Codex/AGY precedents); additive effect variant; in-turn-only processing already prevents replay duplicates; no persistence change or migration.
- Escalation trigger: High if compaction notifications are observed outside an active turn in practice (would need out-of-turn handling) or the recorder contract must change.

## Architecture Investigation Evidence
G01–G05 (AutoByteus path), G06–G08 (Grok docs and notification names), G09–G14 (live experiments), G15–G18 (turn endings, effect channel, identity, tests).

## Intended Change
Map Grok compaction notifications to a runtime-neutral compaction effect; track one open compaction per ACP session; emit COMPACTION_STATUS for started (compacting), completed (compacted, rotation-eligible, with tokens/duration) and failed/cancelled (failed); close any open compaction as failed at every turn ending before the turn event.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Path |
|---|---|
| REQ-G1/G2 | grok stdout `_x.ai/session_notification` → AcpClientConnection ext routing → AcpAgentSession.onExtNotification → grokBuildSessionProfile.interpretExtNotification → effect {kind:"compaction"} → (in turn) AcpSessionUpdateConverter.compaction(effect) → COMPACTION_STATUS → RuntimeMemoryEventAccumulator → ProviderCompactionBoundaryRecorder (marker; rotation on completed) and websocket → web activity |
| REQ-G3 | turn ends (completeTurn incl. cancelled / interruptTurn / failTurn) → converter closes open compaction → failed COMPACTION_STATUS before TURN_* |
| REQ-G4 | `/compact` prompt unchanged (native in Grok); session/load replay ignored by the existing in-turn rule |

## Relevant Supplemental Task Artifacts
probes/grok-manualreal-raw.jsonl (manual → completed only), probes/grok-auto-raw.jsonl (3 started/completed pairs), probes/grok-cancelauto-raw.jsonl (abandoned started, then a new pair), probes/grok-cancel-raw.jsonl (manual cancel → no compaction notifications), probes/grok-slash-raw.jsonl (no-op compaction: completed with equal tokens), probes/grok-probe.mjs, probes/temp-grok-home-config.toml.

## Task Design Health Assessment (Mandatory)
The gap is a missing mapping plus missing lifecycle ownership. The ACP converter already owns per-turn open state (segments, tool calls) and closes it at turn endings, so it is the right owner of an open compaction. Grok-specific parsing stays in the Grok profile; payload identity (provider/runtime names, surfaces) comes from a Grok builder, keeping the ACP layer runtime-neutral.

## Terminology
Compaction effect: runtime-neutral effect {phase: started | completed | failed | cancelled, eventId, details}. Operation id: the eventId of the started notification, or of the completed notification when no started preceded it (manual).

## Design Reading Order
Effect type → Grok mapping → converter tracker → payload builder → session wiring → tests.

## Legacy Removal Policy (Mandatory)
None; the dropped-notification path becomes a handled path.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
No migration. Markers use the existing provider_compaction_boundary trace type with existing optional fields (pre_tokens, post_tokens, duration_ms, error_message). Historical Grok raw traces untouched. Migration-conventions investigation N/A.

## Data-Flow Spine Inventory
Ext notification → profile effect → converter → AgentRunEvent → recorder / websocket.

## Primary Execution Spine(s)
AcpAgentSession.onExtNotification → profile.interpretExtNotification → converter.compaction → options.emit → accumulator/recorder.

## Spine Narratives (Mandatory)
- Auto (G12): started(e47) → open op e47 → COMPACTING (provider_event_id e47) → completed(e50; tokens 29164→22243; elapsed 12406) → COMPACTED (provider_event_id e47; boundary_key from e50; rotation_eligible; pre/post/duration; trigger auto) → op closed → archive created.
- Manual (G10): completed(e84; 32537→21637) with no open op → COMPACTED (operation id e84; trigger manual) → rotation.
- No-op manual (G09): completed with tokens_before == tokens_after → still one completed boundary (Grok reports a completed compaction); rotation happens (acceptable: the conversation was compacted by Grok's own account). Implementation may record it as-is.
- Abandoned (G13): started(e50) → session/cancel → completeTurn("cancelled") → converter closes e50 → FAILED (reason "turn cancelled before compaction completed") → TURN_COMPLETED; next turn: started(e54) → completed(e56) pairs normally.
- Failed/cancelled notifications (G08, not observed): close the open op as FAILED with the reason/error; no rotation.

## Spine Actors / Main-Line Nodes
grokBuildSessionProfile (mapping), AcpAgentSessionProfile (effect type), AcpAgentSession (routing), AcpSessionUpdateConverter (tracker, events), Grok compaction payload builder, shared recorder.

## Ownership Map
| Concern | Owner |
|---|---|
| Parse Grok notification names/fields | grokBuildSessionProfile (+ small helper in backends/grok) |
| Effect contract | acp-agent-session-profile.ts (new variant) |
| Open-operation state, pairing, closing at turn end | AcpSessionUpdateConverter |
| Provider/runtime identity and payload shape | backends/grok/grok-build-compaction-status-payload.ts (new), supplied through the profile |
| Marker and rotation | existing ProviderCompactionBoundaryRecorder |

## Thin Entry Facades / Public Wrappers (If Applicable)
Profile exposes an optional `buildCompactionStatusPayload(input)`; profiles without it never produce compaction effects.

## Removal / Decommission Plan (Mandatory)
None.

## Return Or Event Spine(s) (If Applicable)
COMPACTION_STATUS payloads:
| Field | started | completed | failed (notification or close) |
|---|---|---|---|
| kind | provider_compaction_boundary | same | same |
| runtime_kind / provider | GROK_BUILD / grok | same | same |
| source_surface | grok.auto_compact_started | grok.auto_compact_completed | grok.auto_compact_failed / grok.auto_compact_cancelled / grok.compaction_abandoned |
| status | compacting | compacted | failed |
| provider_session_id | sessionId | same | same |
| provider_event_id | operation id | operation id | operation id |
| boundary_key | grok:<session>:started:<eventId> | grok:<session>:completed:<eventId> | grok:<session>:failed:<operation id> |
| rotation_eligible | false | true | false |
| details | tokens_used, context_window, percentage (optional) | trigger auto/manual, pre_tokens, post_tokens, duration_ms | error_message (reason) |

## Bounded Local / Internal Spines (If Applicable)
Converter tracker: Idle —started→ Open(op=eventId); Open —started (new eventId)→ close previous as failed ("superseded"), open new (defensive); Open —completed→ emit compacted(op) → Idle; Idle —completed→ emit compacted(op=own eventId, trigger manual) → Idle; Open —failed/cancelled→ emit failed → Idle; Open —turn end→ emit failed (reason from ending) → Idle. Only within an active turn (existing rule).

## Off-Spine Concerns Around The Spine
None new.

## Ownership Boundaries
ACP layer stays runtime-neutral (no Grok names); Grok names live in backends/grok.

## Boundary Encapsulation Map
Tracker is private to the converter.

## Dependency Rules
backends/acp must not import backends/grok; Grok supplies the builder via its profile.

## Interface Boundary Mapping
- `AcpExtEffect` += `{ kind: "compaction"; phase: "started" | "completed" | "failed" | "cancelled"; eventId: string | null; details: Record<string, unknown> }`.
- `AcpAgentSessionProfile` += optional `buildCompactionStatusPayload(input: { sessionId; turnId; phase; operationId; eventId; details; trigger?; reason? }): Record<string, unknown>`.
- `AcpSessionUpdateConverter.compaction(sessionId, effect): AgentRunEvent[]`; completeTurn/interruptTurn/failTurn prepend open-compaction close events.
- AcpAgentSession.onExtNotification: route compaction effects in turn (like usage), out of turn ignored.

## Interface Boundary Check
COMPACTION_STATUS contract unchanged; recorder already persists the optional fields.

## Main Domain Subject Naming Check
"compaction" (runtime-neutral) in ACP; Grok's "auto_compact_*" stays inside the Grok mapping and source_surface strings.

## Existing Capability / Subsystem Reuse Check
Reuses recorder rotation, web/history pairing by provider_event_id, the converter's close-at-turn-end pattern and the profile effect channel.

## Subsystem / Capability-Area Allocation
backends/acp (contract, converter, session) and backends/grok (mapping, payload).

## Draft File Responsibility Mapping
See final mapping.

## Reusable Owned Structures Check
The generic tracker could later serve other ACP agents; no premature generalization beyond the effect contract.

## Shared Structure / Data Model Tightness Check
Effect details are a plain record passed only to the profile's builder.

## Final File Responsibility Mapping
| File (autobyteus-server-ts/) | Change |
|---|---|
| src/agent-execution/backends/acp/acp-agent-session-profile.ts | compaction effect variant; optional buildCompactionStatusPayload |
| src/agent-execution/backends/acp/events/acp-session-update-converter.ts | open-compaction tracker; compaction(); close in completeTurn/interruptTurn/failTurn |
| src/agent-execution/backends/acp/session/acp-agent-session.ts | route compaction effects in turn |
| src/agent-execution/backends/grok/grok-build-session-profile.ts | map auto_compact_* notifications to effects; provide the builder |
| src/agent-execution/backends/grok/grok-build-compaction-status-payload.ts | NEW payload builder |
| tests/unit/…/grok and …/acp | mapping; tracker transitions (auto pair, manual completed, abandoned at each ending, failed/cancelled notifications, superseded started); replays of probes frames through profile + session + accumulator (archives: manualreal 1, auto 3, cancelauto 1 + 1 failed close, cancel-manual 0) |
| tests/e2e/runtime (RUN_GROK_E2E=1) | live: temporary GROK_HOME (symlinked auth.json, threshold 10%) → auto compaction → archive and paired activity; `/compact` through AutoByteus → completed and archive; cancel during auto compaction → failed close |
| docs (agent_memory.md / ACP or Grok runtime doc), TESTING.md | document Grok compaction handling and the test gate |

## Applied Patterns (If Any)
Close-at-turn-end (segments/tool calls precedent); profile-supplied runtime identity.

## Target Subsystem / Folder / File Mapping
As above.

## Folder Boundary Check
ACP files stay Grok-agnostic.

## Concrete Examples / Shape Guidance (Mandatory When Needed)
Real frames (G12): `{"method":"_x.ai/session_notification","params":{"sessionId":"01a11508-e9a4-…","update":{"sessionUpdate":"auto_compact_started","tokens_used":29164,"context_window":256000,"percentage":11,"reason":"Context window 11% full"},"_meta":{"eventId":"01a11508-e9a4-…-47"}}}` then `{"…":{"sessionUpdate":"auto_compact_completed","tokens_before":29164,"tokens_after":22243,"elapsed_ms":12406,"summary_preview":null},"_meta":{"eventId":"…-50"}}`. Note: the method name arrives as `_x.ai/session_notification` (underscore prefix), matching the existing GROK_SESSION_NOTIFICATION_METHOD constant.

## Backward-Compatibility Rejection Log (Mandatory)
No `/compact` interception (it already works). No version gate (unknown notifications keep current behavior). No rewrite of historical Grok raw traces.

## Derived Layering (If Useful)
N/A.

## Change / Refactor Sequence
1. Effect contract + Grok mapping + unit tests. 2. Converter tracker + turn-end closes + tests. 3. Payload builder + session routing. 4. Replay tests through accumulator. 5. Gated live E2E (low-threshold GROK_HOME; keep prompts small for credits). 6. Docs. 7. Run ACP/Grok, memory, history, Claude/Codex/AGY suites.

## Key Tradeoffs
Order-based pairing (Grok provides no shared id) is safe because a session runs one compaction at a time; a defensive close handles an unexpected second started. Manual vs auto trigger inferred from the presence of started (observed behavior).

## Risks
- Live E2E consumes Grok credits/rate limits (429 retries observed); keep it gated and small.
- Grok may change notification names; unknown names are ignored (no false markers).
- A hard kill of AutoByteus still leaves an open marker (same residual as Codex).

## Guidance For Implementation
Emit closes before the TURN_* event. Keep the ACP layer free of Grok strings. Use the probes frames as fixtures (signatures already redacted). Never modify the user's ~/.grok in tests; use a temporary GROK_HOME with a symlinked auth.json.
