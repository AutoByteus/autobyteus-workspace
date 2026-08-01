# Requirements Doc — AutoByteus Runtime Streaming UI Performance

## Status (`Refined — Approved`)

The reported slowdown is reproduced, its dominant owner is identified, and the user approved this requirements basis for design on 2026-08-01.

## Goal / Problem Statement

Correct a severe frontend responsiveness failure while native AutoByteus-runtime output streams in very small deltas. In the reproduced Electron-backed team run, the worktree renderer remained near one full CPU core, unrelated UI actions took 8–52 seconds, and the Electron backend continued serving the same local files in roughly 1–3 ms. The product must preserve exact, ordered live agent/team state while bounding the amount of reactive presentation work caused by fine-grained streaming. Voice input must also acknowledge its asynchronous startup immediately instead of appearing inert until media initialization completes.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A native AutoByteus team can emit roughly one presentation mutation per four streamed characters. Each event synchronously updates reactive conversation state, rebuilds recent-presentation witnesses, and can trigger full accumulated Markdown rendering. The renderer reached a 109.67% mean CPU over 240 seconds while the focused member could be idle. | Fine-grained content deltas are absorbed through a bounded frontend presentation cadence so streaming cannot monopolize the renderer. | Exact final segment content, segment/member ordering, semantic event boundaries, live statuses, tool lifecycles, team messages, tasks, artifacts, and token state remain correct. | FR-01, FR-04, FR-05 / AC-01, AC-04, AC-05 |
| BEH-002 | During active native streaming, a normal local Markdown file took 14.64 seconds to open, a Team panel transition took 13.85–52.27 seconds, and team-message references took 7.90–16.70 seconds; the same reference endpoint returned bytes in about 1–3 ms. | Valid local files and team-message references remain interactive during sustained streaming and render within the defined responsiveness budget. | Existing file authorization/root policy, supported viewer modes, MIME handling, refresh behavior, and not-found/forbidden/error semantics remain unchanged. | FR-02, FR-04 / AC-02, AC-04 |
| BEH-003 | The voice-input button has no distinct startup state. `startRecording()` awaits initialization, permission/device checks, `getUserMedia`, a second device refresh, AudioContext startup, and AudioWorklet setup before `isRecording` becomes visible. Renderer saturation delays even the click feedback. | The UI acknowledges voice startup immediately, prevents duplicate starts, then transitions truthfully to recording, transcription, or error after the existing asynchronous work finishes. | Permission handling, selected-device rules, capture watchdog, recording, transcription, cancellation, cleanup, and error behavior remain unchanged. | FR-03, FR-04 / AC-03, AC-04 |
| BEH-004 | The user observes the freeze with AutoByteus runtime but not Codex. Native runs measured approximately 3.75–4.43 accumulated characters per presentation revision and 109.67% mean renderer CPU. Under the same Electron-backend journey, Codex/Luna completed reasoning/text segments averaged 62.89–113.73 characters, renderer phase means were 6.75–11.48%, and file/reference/member interactions were 6.6–82.2 ms. | The fix handles provider/runtime chunk cadence as an input characteristic rather than requiring each runtime to emit the same chunk shape, and it does not regress Codex or idle behavior. | Runtime-specific protocol/provider semantics remain unchanged where required. | FR-01, FR-05 / AC-01, AC-05 |
| BEH-005 | Native raw traces and working-context snapshots use synchronous filesystem APIs, but in the exact 240-second reproduction each active member changed those files only 5–9 times while the UI processed thousands of presentation revisions; server health stayed fast. | Backend persistence remains semantically unchanged in this fix because it is not the dominant freeze owner. | Existing team-run memory durability, raw-trace append behavior, atomic snapshot replacement, and recovery data remain unchanged. | FR-06 / AC-06 |

## Investigation Findings

1. **Dominant root cause — frontend stream presentation amplification.** `TeamStreamingService` dispatches every WebSocket event synchronously. Each `SEGMENT_CONTENT` appends a tiny delta; `dispatchGenericTeamMemberMessage` builds a recent-presentation witness both before and after every event; the witness contains the full accumulated text; Vue then propagates the change through `AgentConversationFeed` and `MarkdownRenderer`, where the entire accumulated Markdown is reparsed, highlighted, math-normalized, scanned for file/image actions, and sanitized.
2. **The bottleneck persists for a hidden streaming member.** The exact run still held the renderer around 106–110% CPU while `implementation_engineer` was focused and idle and `code_reviewer` streamed in the background. Therefore the per-event projection/witness path is independently material; visible Markdown rendering compounds it when the streaming member is focused.
3. **Local files and the Electron backend are fast.** The exact team-reference route returned 4–22 KB files in mostly 0.5–1.7 ms, with isolated first requests up to 12.3 ms. `/rest/health` averaged 1.408 ms with no failures during the 240-second probe.
4. **Backend file persistence is not per token.** Raw trace/snapshot changes aligned with assistant/tool/phase boundaries, not thousands of content deltas. The server log grew by only about 4.4 KB during a 12-second spot check with tool activity. A large existing log and repeated token-ledger idempotency warnings are secondary operational concerns, not the measured UI freeze owner.
5. **Stopping the test team removed the pressure.** Renderer CPU fell from about 107% to 4.5–6.1%; Files and Team interactions returned to 53–99 ms.
6. **The Codex/Luna control confirms a cadence threshold rather than a separate file path.** The same frontend, Electron backend, Temp Workspace, team definition, and UI journey stayed responsive: renderer phase means were 6.75–11.48%, Files/Team/member transitions were 32.5–40.7 ms, and eleven references opened in 6.6–82.2 ms. Codex projected coarse completed reasoning summaries averaging 62.89–113.73 characters, while native DeepSeek exposed approximately four characters per presentation revision.

Detailed evidence is retained in `performance-evidence.md`.

## Relevant Supplemental Task Artifacts

- `performance-evidence.md` — evidence-only reproduction topology, timing/CPU tables, direct endpoint comparison, persistence-write counts, server-log observations, and source-path evidence. Approval applicability: `N/A` (does not define intended behavior).

## Design Health Assessment (Mandatory)

- Change posture: `Performance bug fix with bounded refactor`
- Root cause classification: `Boundary/ownership issue plus local UI-state defect`
- Design issue: The transport dispatcher currently owns parsing and immediate projection but has no owner for presentation cadence/backpressure. Expensive recent-event-monitor comparison and Markdown work therefore inherit provider token cadence directly.
- Refactor posture: `Required now` — introduce a single bounded stream-content presentation owner reused by the affected native stream entry points. Semantic events must flush prior buffered content for the same target before they are applied. Avoid parallel throttles inside individual Vue components.
- Local UI fix: Add an explicit voice-starting state at the store boundary and render it in the composer/settings consumers.
- Backend posture: No backend or persistence refactor in this change. The exact probe rules it out as the primary interaction bottleneck.
- Residual risk intentionally outside scope: the 220 MB current `server.log` and repeated token-usage ledger idempotency warnings merit separate operational follow-up but did not cause the reproduced file latency.

## Scope Classification (`Large`)

Although the code change should remain focused, validation crosses team and single-agent stream consumers, recent-event-monitor state, Markdown presentation, file/reference interactions, voice input, runtime comparison, and Electron-backed execution.

## In-Scope Use Cases

- UC-01: Observe and interact with an actively streaming native AutoByteus agent or team member, including a member streaming in the background.
- UC-02: Open a normal local workspace file and a team-message reference during sustained native streaming.
- UC-03: Start voice input during active streaming and observe immediate, truthful startup feedback.
- UC-04: Preserve exact live/final stream content and semantic event ordering across content, segment-end, status, tool, interruption, completion, and disconnect boundaries.
- UC-05: Validate AutoByteus active/idle and Codex/non-streaming regression behavior in the Electron-backed topology.

## Out of Scope

- Changing model quality, provider response speed, DeepSeek generation behavior, or requiring providers to use a common token chunk size.
- Reworking raw-trace/snapshot persistence, team metadata persistence, database schemas, or memory recovery.
- Server-log rotation and token-usage ledger idempotency repair; record as separate follow-up unless later implementation evidence proves direct coupling.
- Redesigning unrelated Team, Files, Terminal, Activity, Token, Artifacts, Browser, or VNC surfaces.
- Remote/network file performance outside the supported local-file paths reproduced here.
- Dropping semantic stream events or rendering only a final response instead of live progress.

## Functional Requirements

- **FR-01 — Bounded stream presentation:** Fine-grained `SEGMENT_CONTENT` delivery must not cause unbounded one-render-per-delta work. The frontend must bound reactive/presentation update cadence while retaining every content byte in order. The policy is runtime-agnostic and applies to every runtime that uses the affected agent or team streaming path; it must not be gated specifically to AutoByteus or DeepSeek.
- **FR-02 — Unrelated interaction responsiveness:** Workspace-file and team-reference clicks, panel/member switches, scrolling, and ordinary controls must remain responsive during representative sustained native streaming.
- **FR-03 — Voice startup state:** Voice input must expose a synchronous `starting`/pending state before the first asynchronous initialization step, prevent duplicate starts while pending, and clear or transition that state on success, denial, failure, cleanup, and unmount.
- **FR-04 — Ordering and boundary integrity:** Before applying any semantic event whose meaning depends on preceding content for the same stream target—such as segment end, completion, interruption, tool/status transitions, disconnect, or teardown—the frontend must apply all earlier buffered content for that target. No content may be lost, duplicated, reordered, or assigned to another member/segment.
- **FR-05 — Shared owner and compatibility:** The bounded-cadence policy must live in a reusable stream-projection owner used by the affected team and single-agent native paths rather than duplicated component-level timers. Codex, hydration, history browsing, tool approvals, task-agent/team routing, and existing completed-message rendering must remain compatible.
- **FR-06 — No persistence change:** The fix must not change persisted schemas or rewrite existing team/agent memory. Current raw traces, snapshots, communications, and run history remain directly usable.
- **FR-07 — Evidence and diagnostics:** Targeted tests and runtime validation must record update counts, final content equality/order, event-loop responsiveness, local file/reference latency, voice state transitions, and unaffected baseline behavior.

## Acceptance Criteria

- **AC-01 — Sustained renderer responsiveness:** In an Electron-backend test with at least 60 seconds of fine-grained native content streaming and an accumulated response of at least 30,000 characters, a 50 ms responsiveness probe has p95 drift no greater than 100 ms and no application stall greater than 500 ms attributable to stream presentation. Renderer CPU must no longer remain pinned near a full core solely by the stream.
- **AC-02 — File/reference responsiveness:** During that active stream, at least 10 supported local text-file opens and 10 team-reference opens each have click-to-visible-content p95 no greater than 500 ms. The same direct endpoint must remain successful, and error/not-found cases must still render truthfully.
- **AC-03 — Voice feedback:** On voice-button activation, the pending/starting state is committed on the same synchronous action turn and becomes visible on the next available render; the control is guarded against a duplicate start. Success transitions to recording, while permission denial, device failure, worklet failure, cleanup, and unmount clear pending state and preserve current error behavior.
- **AC-04 — Exact stream semantics:** Focused automated coverage feeds multiple small deltas across at least two members/segments with interleaved semantic boundaries and verifies exact final content, member/segment identity, content-before-end ordering, no duplicate/lost delta, correct presentation revision behavior, and flush on disconnect/teardown.
- **AC-05 — Compatibility:** Existing team/single-agent streaming tests, recent-event-monitor window/witness tests, file/reference viewer tests, and voice-input tests pass with targeted additions. Codex-runtime and idle/non-streaming smoke behavior remain correct.
- **AC-06 — Persistence safety:** Representative existing run memory loads without transformation. Runtime probes continue to show persistence at logical boundaries rather than introducing any new per-presentation write path.
- **AC-07 — Evidence handoff:** Durable artifacts record exact topology, team/runtime/model identifiers, commands, measurements, source paths, known limitations, and the before/after evidence used for acceptance.

## Constraints / Dependencies

- Use the dedicated task worktree and latest reviewed `origin/personal` baseline.
- Validate the web frontend against the Electron-started backend/data root, as explicitly requested, in addition to focused automated tests.
- Do not archive, rewrite, or reuse user production memory as a test fixture. The deliberate reproduction team was terminated after evidence capture.
- Profiles and traces can contain local paths or user content; keep them local and promote only summarized evidence.
- Preserve current authorization/root checks for all local file access.
- Cadence constants must be owned and testable; do not scatter arbitrary debounce delays across components.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: existing agent/team raw traces, working-context snapshots, run metadata, team communications, artifacts, and database run history.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve: all current run history and memory artifacts byte-for-byte unless normal runtime operation later appends new events.
- Unacceptable data loss or corruption: loss, duplication, reordering, archival changes, or invalidation of recoverable runs.
- Rationale: the change is confined to frontend ingestion/presentation cadence and voice UI state; no persisted representation changes.
- Related requirement and acceptance-criteria IDs: FR-04, FR-06 / AC-04, AC-06.

## Assumptions

- AutoByteus runtime may continue emitting very small deltas; frontend correctness cannot depend on provider-side coalescing.
- A presentation delay bounded to a small fraction of a second is acceptable for live text if exact order/final content is preserved and semantic events flush earlier content.
- The existing file/reference endpoints and filesystem remain the supported source of truth for local content.

## Risks / Open Questions

- **OQ-01 (design):** Select the cadence/flush strategy that meets AC-01 without starving semantic events or creating component-specific queues.
- **OQ-02 (validation):** The Codex/Luna control is captured and confirms the cadence/shape contrast, but different runtimes/models cannot be forced to produce byte-identical reasoning. Codex remains a compatibility/regression control rather than a requirement that its event shape match AutoByteus.
- **OQ-03 (environment):** Automated actual-microphone capture may be constrained by permissions/devices. Store/component state-transition coverage is mandatory; realistic capture is required when the environment permits.
- **OQ-04 (secondary):** Track server-log rotation and token-ledger idempotency warnings separately unless implementation evidence establishes direct performance impact.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| FR-01 | UC-01, UC-04, UC-05 |
| FR-02 | UC-01, UC-02, UC-05 |
| FR-03 | UC-03, UC-05 |
| FR-04 | UC-01, UC-04 |
| FR-05 | UC-01, UC-04, UC-05 |
| FR-06 | UC-04, UC-05 |
| FR-07 | UC-01, UC-02, UC-03, UC-04, UC-05 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance-Criteria ID | Scenario Intent |
| --- | --- |
| AC-01 | Sustain fine-grained native stream delivery while probing renderer scheduling and CPU. |
| AC-02 | Repeatedly open workspace files and team references during the same active stream. |
| AC-03 | Exercise pending-to-recording/error voice state transitions, including duplicate-click guards. |
| AC-04 | Interleave content and semantic events across identities and compare final projection byte-for-byte. |
| AC-05 | Run affected existing and new coverage plus Codex/idle smoke checks. |
| AC-06 | Load existing run memory without migration and verify no new persistence path. |
| AC-07 | Audit the retained before/after runtime package for reproducibility. |

## Approval Status

- Refined from the user's authoritative report and exact Electron-backed reproduction on 2026-08-01.
- Approval: `Approved by the user on 2026-08-01` ("You got my approval"), with a subsequent clarification that the solution must be general across runtimes rather than AutoByteus-specific.
- Evidence-only supplement `performance-evidence.md`: approval applicability `N/A`.
