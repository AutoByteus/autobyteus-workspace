# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Complete for scoped design; ready for architecture review
- Investigation Goal: Identify why external-channel run-output assembly persists duplicated streamed reply text before Telegram callback delivery, and define the smallest clean owner-level fix.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: The defect appears localized to server external-channel output parsing/collection. Transport, binding, and gateway callback publication succeeded after runtime cleanup.
- Scope Summary: Fix only duplicated streamed reply text in external-channel run-output delivery. Exclude gateway stale inbox reset/quarantine and legacy compatibility.
- Primary Questions To Resolve:
  - What text event shapes are produced by agent/team stream events for the observed run? Answer: persisted outputs show suffix/prefix-overlap duplication in server-finalized reply text; source path uses ambiguous `mergeAssistantText` for parsed stream text.
  - Does the collector concatenate deltas, snapshots, final segment text, or duplicate subscription events? Answer: current collector appends parsed `SEGMENT_CONTENT` text through `mergeAssistantText`; that function handles exact/cumulative snapshots but not suffix/prefix overlap.
  - Which server file owns the canonical text assembly invariant? Answer: `ChannelRunOutputEventCollector` should own per-turn assembly; parser should classify text source, not accumulate.

## Request Context

The user tested released v1.2.84 Telegram external-channel behavior. After manually cleaning stale gateway runtime inbox state, a new Telegram message was accepted and the server published a gateway callback, but the delivered/output reply text contained duplicated streamed words: `Sent the the student student a a hard hard cyclic cyclic inequality inequality problem problem to to solve solve..`.

On 2026-04-26 the user requested narrowing the work: treat gateway inbox cleanup/reset as not a problem for now, and solve only the duplicated streamed reply bug.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/external-channel-stream-output-dedupe`
- Current Branch: `codex/external-channel-stream-output-dedupe`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-04-26.
- Task Branch: `codex/external-channel-stream-output-dedupe`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Scope is intentionally narrow. Do not change gateway inbox status compatibility/reset behavior in this task.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-26 | Command | `git fetch origin --prune`; `git worktree add -b codex/external-channel-stream-output-dedupe /Users/normy/autobyteus_org/autobyteus-workspace-superrepo origin/personal` | Bootstrap dedicated ticket workspace | Created clean scoped worktree from current tracked base `origin/personal` at v1.2.84 release bump. | No |
| 2026-04-26 | Log/Data | Runtime files under `$HOME/.autobyteus/server-data/extensions/messaging-gateway/runtime-data` and external-channel persisted delivery records from the user's live test | Determine whether transport/gateway failed or text was already bad before transport | New Telegram update was accepted; server delivery/callback records were sent; persisted server `replyTextFinal` already contained duplicated text. | No |
| 2026-04-26 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-event-collector.ts` | Inspect final reply assembly owner | Collector stores `assistantText` for `SEGMENT_CONTENT`, `finalText` for `SEGMENT_END`, and returns final text on `TURN_COMPLETED`. It delegates string merging to `mergeAssistantText`. | Design collector-owned text assembly fix. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-output-event-parser.ts` | Inspect parsed text extraction and merge helper | Parser collapses text into one `text` field and exports `mergeAssistantText`. Merge handles exact and prefix/cumulative cases but not suffix/prefix overlap. | Add text source semantics and move/replace merge policy. |
| 2026-04-26 | Code | `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-delivery-runtime.ts` | Confirm runtime sequencing and gateway boundary | Runtime parses, checks eligibility, observes turn, processes collector final, persists `replyTextFinal`, then publishes. It should not own string cleanup. | No |
| 2026-04-26 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-converter.ts`; `codex-item-event-converter.ts`; `codex-item-event-payload-parser.ts` | Understand Codex stream event conversion because live run used `codex_app_server` | Codex text deltas are converted into `SEGMENT_CONTENT` with `delta` and `segment_type: text`; item completion becomes `SEGMENT_END`. External collector must tolerate overlap/snapshot fragment shapes. | No |
| 2026-04-26 | Test | `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-output-event-parser.test.ts`; `channel-run-output-delivery-runtime.test.ts` | Find existing coverage | Existing tests cover simple direct/team parsing and open-output publish, but no overlap-fragment or final-snapshot precedence regression. | Add tests. |
| 2026-04-26 | Command | `rg -n "SEGMENT_CONTENT|SEGMENT_END|segment_type|delta|subscribeToEvents" src tests` | Trace affected event-path files | Found parser/collector/runtime and Codex/Autobyteus/Claude backend event converters. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Telegram inbound update accepted by messaging gateway and forwarded to server external-channel inbound handling.
- Current execution flow: Gateway inbound update -> server external-channel receipt/run binding -> agent/team runtime -> external-channel run-output delivery collector -> gateway callback outbox -> Telegram send.
- Ownership or boundary observations: The gateway transports the callback payload; the server external-channel runtime owns response text selection before callback publication.
- Current behavior summary: Delivery succeeds, but `replyTextFinal` can be duplicated word-by-word before callback transmission.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-event-collector.ts` | Accumulates run-output stream events into final reply text | Reads parsed events into pending turn state; uses `mergeAssistantText` for stream text. | Owner of no-duplicate final reply invariant; should use explicit overlap-safe assembly. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-output-event-parser.ts` | Parses runtime event payload text into external-channel event text | Currently emits one ambiguous `text` field and owns the generic merge helper. | Parser should classify stream fragment vs final text; collector should own assembly. |
| `autobyteus-server-ts/src/external-channel/runtime/channel-run-output-delivery-runtime.ts` | Orchestrates eligible output delivery and callback publication | Coordinates parsing, eligibility, observe/finalize/publish; persists collector reply as `replyTextFinal`. | Should remain orchestration owner, not word-level dedupe owner. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-26 | Repro/Log | User sent new Telegram message after gateway runtime cleanup | Server accepted update `update:109349219`, delivery was published, gateway callback was sent, but reply text was duplicated in persisted delivery record. | Bug is server-side text assembly before gateway callback, not Telegram/gateway transport failure. |
| 2026-04-26 | Data | `$HOME/.autobyteus/server-data/external-channel/run-output-deliveries.json` | Inspect later records after user continued testing | Multiple published records for team `team_classroomsimulation_8661ebcb` show duplicated words: `Yes,, I I’m’m here here..`, `Glad you you liked liked it it!!`, etc. | Confirms systematic assembly bug. |
| 2026-04-26 | Analysis | Compare observed output with current merge algorithm | A suffix/prefix-overlap sequence such as `Sent the` + ` the student` + ` student a` yields the observed `Sent the the student student a` under current append fallback. | Fix must handle overlap, not only exact/prefix snapshots. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is local product/runtime behavior.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Existing local AutoByteus app/server and user's Telegram gateway setup.
- Required config, feature flags, env vars, or accounts: User's configured Telegram binding; not needed for unit-level design.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: Earlier gateway runtime cleanup is outside this ticket's implementation scope.

## Findings From Code / Docs / Data / Logs

- `ChannelRunOutputEventCollector.processEvent` is the current local state machine for external-channel run output. It creates a pending turn by `deliveryKey`, appends `SEGMENT_CONTENT` text into `assistantText`, stores `SEGMENT_END` text in `finalText`, and returns `finalText ?? assistantText` on `TURN_COMPLETED`.
- `mergeAssistantText` in `channel-output-event-parser.ts` handles three cases: empty current, exact duplicate, and cumulative snapshots where one side starts with the other. Its fallback is raw concatenation. It does not compute the longest suffix of current that equals the prefix of incoming.
- Persisted live records show duplication at exactly the kind of boundary produced by missing suffix/prefix overlap handling: `Sent the` + ` the student` becomes `Sent the the student`; `Glad you` + ` you liked` becomes `Glad you you liked`.
- The gateway callback outbox records contain the same duplicated `replyText`, so the gateway is not the source of text duplication.
- Existing tests do not cover overlap fragments or final snapshot precedence.
- The live affected team uses `codex_app_server`; Codex events flow through `CodexThreadEventConverter` into normal `AgentRunEvent` segment content/end events before the external-channel parser/collector sees them.

## Constraints / Dependencies / Compatibility Facts

- No backward compatibility/legacy retention for stale gateway inbox statuses in this scoped ticket.
- Do not add gateway-side cleanup or parsing changes for this task.
- Preserve the open-session external channel delivery path already implemented in v1.2.84.

## Open Unknowns / Risks

- Whether every backend supplies final text on `SEGMENT_END`; design must work when final text is absent.
- Exact duplicate fragments vs intentional repeated text cannot be perfectly distinguished without event ids; overlap handling should be conservative and covered by tests.
- Need implementation to verify targeted unit tests pass under package scripts.

## Notes For Architect Reviewer

This is a design-impact rework of the already released external-channel open-session delivery feature, scoped to run-output text assembly only.
