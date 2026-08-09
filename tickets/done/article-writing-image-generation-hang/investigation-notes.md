# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete — dedicated worktree and task branch created from refreshed `origin/personal`.
- Current Status: User clarified that this ticket must not add a universal tool-call timeout. The user also corrected scope: unrelated functionality is not part of this ticket. Requirements and design are narrowed to the mandatory bounded media capability, terminal-result repair, and agent recovery. The retained Bible Study trace probe remains accepted evidence-only.
- Investigation Goal: Identify why the Article Writing Team run stopped after `generate_image`, why later messages errored, and which production owner can make the operation bounded and recoverable.
- Scope Classification (`Small`/`Medium`/`Large`): Large
- Scope Classification Rationale: The immediate symptom crosses agent lifecycle, server-owned media orchestration, provider clients, download transport, configuration, and tests; the user has now clarified that continuous recoverability is a general logical-agent invariant, requiring an agent-runtime recovery boundary rather than an image-only patch.
- Scope Summary: Inspect the captured trace/logs, trace the native media path, classify root cause, and define both the immediate bounded media recovery and the broader continuation-oriented agent lifecycle invariant.
- Primary Questions To Resolve: What exact call stopped; whether a result/error was ever emitted; where timeout/cancellation is absent; how to preserve provider-specific behavior; how to prove follow-up usability; which runtime supervisor/reconciliation boundary owns recovery for all recoverable execution units. The original missing-result cause may remain unknown; recovery must therefore be cause-independent and idempotent.

## Request Context

The user reports that after running the latest Article Writing Team, the article writer's last visible operation is `generate_image`; no result is returned, and later messages show an error. Screenshot 1 shows the assistant reasoning followed by a `generate_image` payload. Screenshot 2 shows the tool card with no result, the agent marked `Error`, and a user message `continue please`. The user requested log-first investigation and authorized loading `/Users/normy/.autobyteus/server-data/.env` for probing if needed. No live provider probe was run; API keys were not read or logged. The user clarified a non-negotiable product invariant: a recoverable tool/provider/runtime error must never permanently kill an otherwise valid agent run; the agent has a lifetime-oriented identity and must have a strategy to recover and accept continuation. This invariant is broader than the immediate image bug and must be reflected in architecture scope.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang`
- Current Branch: `personal` (initial workspace; contained unrelated dirty changes)
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` completed before worktree creation; base commit `edf2d428b`.
- Task Branch: `codex/article-writing-image-generation-hang`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal` after downstream review and delivery.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The original workspace had unrelated modifications and untracked work; do not use it for task edits. User-provided run artifacts live under `/Users/normy/.autobyteus/server-data` and are read-only evidence for this task.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/article_writing_team_e618f2a92ea54aa69f264b1f8c6ffc16/article_writer_d250b3185aa145f69e6e0107721136e6/raw_traces_active.jsonl` | Captured article-writer event trace | Final event is an uncompleted `generate_image` call with no result/error | Requirements, design | BEH-001, BEH-002; AC-001, AC-002 | Observed evidence | Informational; no approval needed | Preserve as evidence |
| `/Users/normy/.autobyteus/server-data/logs/server.log` | Server runtime log | Relevant run has no image result after final invocation; later restore/send path reports agent error while waiting for idle; repeated historical invalid media-model schema errors also exist | Requirements, design | BEH-002, BEH-004; AC-003, AC-006 | Observed evidence | Informational; no approval needed | Validate final implementation logs |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_0feb330e6bab460ba81cb3e0eaa9bc1f/solution_designer_236bae11652945949f7667657768f0bf/context_files/ctx_79650fbd7ec9__image.png` | User screenshot | Shows final visible assistant message and pending `generate_image` payload | Requirements | BEH-001 | Observed evidence | Informational; no approval needed | None |
| `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_0feb330e6bab460ba81cb3e0eaa9bc1f/solution_designer_236bae11652945949f7667657768f0bf/context_files/ctx_7ab53a10289f__image.png` | User screenshot | Shows no tool result, `Error` status, and rejected follow-up symptom | Requirements | BEH-002 | Observed evidence | Informational; no approval needed | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang/tickets/in-progress/article-writing-image-generation-hang/bible-study-trace-probe.md` | Cross-run raw-trace comparison | Two recent Bible Study `study_leader` traces have no unmatched calls; `edit_file` failures are explicit `tool_result` errors followed by continued activity | Requirements, design | BEH-001, BEH-002, BEH-005; AC-001, AC-002, AC-009 | Observed evidence | Informational; no approval needed | Preserve as evidence and include in architecture rework handoff |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-08 | Setup | `git fetch origin personal`; `git worktree add -b codex/article-writing-image-generation-hang /Users/normy/autobyteus_org/autobyteus-worktrees/article-writing-image-generation-hang origin/personal` | Isolate task work from unrelated dirty workspace state | Dedicated clean worktree created at base `edf2d428b` | No |
| 2026-08-08 | Trace | `wc -l .../raw_traces_active.jsonl`; parse events in `article_writing_team_e618.../article_writer_d250...` | Locate the exact user-reported run and terminal event | 163 lines; final relevant event seq 59 is `PendingToolInvocationEvent` for `generate_image`, call `call_3f8b340038294116a197625f`, at `2026-08-06 08:03:15.670+02:00`; no later tool result/error/continuation | No |
| 2026-08-08 | Data | `stat`/`file` on `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.article-work/agent-handoff-graph/assets/imagegen-engineering-team-handoff-v3.png` | Check whether an output file proves the final call completed | Existing 848x1264 PNG mtime `2026-08-06 07:54:55`, before the stuck call; it is not evidence of completion for seq 59 | No |
| 2026-08-08 | Log | `rg` around the exact team/agent run IDs in `/Users/normy/.autobyteus/server-data/logs/server.log` | Confirm runtime behavior and later send error | Earlier tools complete; no result follows the final image call; later restore/send path reports `Agent ... entered an error state while waiting for idle` and `SEND_MESSAGE rejected` | No |
| 2026-08-08 | Log | `rg -n "Failed to generate argument schema.*(edit_image|generate_image)|Image model .* not found" /Users/normy/.autobyteus/server-data/logs/server.log` | Check for provider/model setup failures | Repeated historical invalid model `nano-banana-pro-app-rpa@192.168.2.124:51740` appears in server startup/schema logs; this would be a synchronous schema/configuration failure, not an explanation for a never-settling provider call by itself | Verify chosen configuration handling in implementation |
| 2026-08-08 | Code | `autobyteus-server-ts/src/agent-tools/media/media-generation-service.ts` | Trace server-owned image operation | Resolves model/path, awaits `client.generateImage`, awaits media write, then cleanup; no deadline and no signal parameter | Yes — design boundary |
| 2026-08-08 | Code | `autobyteus-server-ts/src/agent-tools/media/media-autobyteus-tools.ts`; `autobyteus-ts/src/tools/base-tool.ts`; `autobyteus-ts/src/agent/loop/tool-phase.ts` | Trace tool options and runtime lifecycle | Tool phase passes `turn.executionScope.signal`; `BaseTool` accepts options; `MediaAutobyteusTool._execute` drops options before calling the manifest/service | Yes — propagate cancellation |
| 2026-08-08 | Code | `autobyteus-ts/src/multimedia/image/base-image-client.ts` and Gemini/OpenAI/Autobyteus image clients | Determine provider cancellation surface | Base image methods have no signal; Gemini `generateContent`, OpenAI `images.generate`, and Autobyteus `/generate-image` calls have no explicit operation timeout/signal | Yes — shared interface design |
| 2026-08-08 | Code | `autobyteus-ts/src/clients/autobyteus-client.ts` and `autobyteus-ts/src/utils/download-utils.ts` | Check transport timeout behavior | Autobyteus async Axios client sets `timeout: 0`; generated-media download uses Axios with no timeout/signal and streaming write lacks abort handling | Yes — transfer boundary |
| 2026-08-08 | Code | `autobyteus-ts/src/agent/interruption/turn-execution-scope.ts`; `abortable-operation.ts` | Check existing cancellation invariant | Existing scope races promises against explicit user interruption but has no wall-clock deadline; detached late rejections are observed only for interrupted operations | Yes — do not rely on generic scope for timeout |
| 2026-08-08 | User clarification | User states that an agent must never become permanently unusable due to a recoverable error and must always have a recovery strategy | Elevates recoverability from a desired outcome to a non-negotiable runtime invariant; tool failure must be contained and orphaned turns reconciled | Yes — design must include restart and live-turn recovery |
| 2026-08-08 | User clarification | User accepts that the original cause of an unmatched call may remain unknown and requires one synthetic error result for each unmatched persisted native call | Makes orphan repair cause-independent, one-to-one, idempotent, and applicable to future tools—not only `generate_image` | Yes — design must define repair identity and duplicate suppression |
| 2026-08-08 | Test | `autobyteus-server-ts/tests/unit/agent-tools/media/media-generation-service.test.ts` | Check current coverage | Tests success and cleanup for image/edit/audio/video, but no hang, timeout, abort, transfer failure, or terminal-settlement test | Yes — add deterministic coverage |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Article writer emits a native `generate_image` tool call after its assistant response | LLM tool call -> `tool-phase` -> `MediaAutobyteusTool.execute` -> manifest -> `MediaGenerationService.generateImage` -> image client -> provider -> `MediaPathResolver.writeGeneratedMediaFromUrl` | The call can remain pending indefinitely because provider/transfer promises are unbounded; captured trace has no result after seq 59 | Raw trace seq 59; media service source |
| BEH-002 | User | User submits a follow-up message while the prior agent turn is still unresolved | UI send -> team/runtime message posting -> agent idle/waiting state | Later message is rejected when the agent is in an error/busy waiting state; server log says send was rejected because the agent entered an error state while waiting for idle | Screenshot 2; server log |
| BEH-003 | Contract | Native server-owned media tools promise `{ file_path }` after writing first returned media URL | Tool wrapper -> manifest input parser -> service model/path/provider/write/cleanup -> tool result pipeline | Successful calls preserve workspace-safe path resolution and cleanup; no timeout/cancellation is part of the contract yet | Media contract, manifest, generation service, existing unit test |
| BEH-004 | Operational | Server settings select a configured image model and schema reloads may validate model availability | App config -> media model resolver/factory -> tool registration/schema | Invalid persisted model identifiers have appeared in logs; synchronous failures should be terminal tool errors rather than hangs | Server log; model resolver/factory source |
| BEH-005 | System | Durable logical agent receives work through disposable turns/workers and must accept later user input after recoverable failure | Agent runtime/supervisor -> active turn -> tool/provider/worker -> reconciliation -> idle/ready -> next user message | Current restore/send path can leave a valid run in `Error`/non-idle; desired invariant is that recoverable failures are isolated and the logical agent remains continuation-capable | User clarification; trace/log evidence; agent runtime source |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant + Local Implementation Defect
- Refactor posture evidence summary: The media service is the correct governing owner, but its API and shared image client contract cannot currently carry the existing abort signal. A focused contract propagation is healthier than adding a timeout-only wrapper that leaves provider promises running forever.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Captured trace | Pending invocation is the final event with no result | Completion must be an explicit invariant at the media boundary | Specify timeout and terminal error path |
| Media service | Direct awaits of provider and download have no deadline | Local owner lacks bounded lifecycle handling | Add owned deadline/cancellation policy |
| BaseTool/tool wrapper | Signal is available upstream but dropped by wrapper | Boundary contract is too thin for existing cancellation capability | Pass signal through manifest/service |
| Provider/transport clients | No signal and Autobyteus timeout is zero | Underlying operation can outlive turn indefinitely | Extend shared client/download interfaces |
| Server send log | Follow-up rejected after agent error while waiting for idle | Unresolved tool blocks user recovery | Verify end-to-end terminal settlement |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/media/media-autobyteus-tools.ts` | Native BaseTool wrapper | Receives `_options` only through inherited method but currently omits it from `_execute` signature/call | Thin boundary should forward execution signal; must not own provider timeout policy |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-manifest.ts` | Media tool entry contracts | Manifest execute callback carries context/input only | Carry operation signal through the authoritative media boundary |
| `autobyteus-server-ts/src/agent-tools/media/media-generation-service.ts` | Media orchestration owner | Awaits provider, transfer, cleanup with no deadline | Own operation lifecycle/deadline and terminal semantics |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-path-resolver.ts` | Workspace path and artifact transfer | Download helper has no signal/timeout | Extend transfer boundary or inject bounded transfer mechanism |
| `autobyteus-ts/src/multimedia/image/base-image-client.ts` | Shared image provider contract | No operation options | Add explicit optional operation control shape if design confirms |
| `autobyteus-ts/src/multimedia/image/api/*-image-client.ts` | Provider adapters | Provider calls lack signal/timeout | Propagate operation control to supported SDK/HTTP transports |
| `autobyteus-ts/src/clients/autobyteus-client.ts` | Remote Autobyteus HTTP client | Async Axios timeout is `0`; generateImage has no signal | Add operation control without changing unrelated client calls |
| `autobyteus-ts/src/utils/download-utils.ts` | Generated media download | Axios and stream have no timeout/abort | Make artifact transfer bounded/cancellable and clean partial files |
| `autobyteus-server-ts/tests/unit/agent-tools/media/media-generation-service.test.ts` | Media service unit tests | Happy-path only | Add deterministic terminal-lifecycle tests |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-08 | Trace | Parsed `raw_traces_active.jsonl` for team `article_writing_team_e618...`, writer `article_writer_d250...` | Final event at `2026-08-06T06:03:15.670Z` is a pending image call; no terminal event exists | Original failure is a non-settling operation, not merely a UI rendering omission |
| 2026-08-08 | Log | Searched server log for exact run IDs and post-run send | Later message path reports `[RUNTIME_COMMAND_FAILED] ... entered an error state while waiting for idle` | Follow-up error is downstream of unresolved/failed runtime lifecycle |
| 2026-08-08 | Code inspection | Followed tool phase -> BaseTool -> media wrapper -> service | Tool phase passes signal but wrapper/service/provider do not consume it | Existing interruption support cannot protect this boundary from a hang |
| 2026-08-08 | Code inspection | Followed service -> path resolver -> download utility | Provider and transfer both await indefinitely; Autobyteus HTTP timeout is disabled | Deadline must cover all potentially hanging segments, not provider call only |
| 2026-08-08 | Probe | No live provider request executed; API key was not imported/read | Avoided spending quota or creating more workspace artifacts while root cause is already established by trace and source | Use mocks/fakes for implementation verification |
| 2026-08-08 | Trace probe | Parsed `bible_study_group_1d751184403a426eb63d1598bdae5df7/agent_a7016e834ea648d6b5d21700635bc5ad/raw_traces_active.jsonl` and `bible_study_group_d97517626c434cb5b0a716e38859613c/agent_cd28ee153fca4a45b97fe0a0ece7311e/raw_traces_active.jsonl`; paired each `tool_call_id` with `tool_result` | Both recent `study_leader` traces are complete. The second contains many `edit_file` calls, including explicit `PatchApplicationError` results; no missing `edit_file` result was found | Confirms ordinary tool errors already follow the terminal-result protocol; generic orphan repair remains necessary for future missing-result cases |
| 2026-08-08 | Trace probe | Inspected the final eight events around `call_0c4a503ee15e41e2901637a1` in the second Bible Study `study_leader` trace | The failed `edit_file` result is followed by `read_file`, `run_bash`, and a normal assistant response | The available Bible evidence does not prove `edit_file` caused a hang; a UI stop may refer to another run, an earlier observation, or an unretained event |
| 2026-08-08 | Architecture review | Round 2 review report identified `ARCH-DES-005` | Substantive timeout, raw-first convergence, media lease, and lifecycle designs passed directionally; stale mandatory persisted-data wording and optional lifecycle mapping contradicted the canonical design | Reconcile canonical sections before implementation handoff |
| 2026-08-08 | Design rework | Re-read all `design-spec.md` persistence and final mapping sections; removed cross-store atomic wording and `and/or` identity language; made recovered event/status/turn/worker owners explicit | Canonical sections now state raw-first append/flush -> snapshot replacement, compound identity as sole suppression key, and required recovered event classes/owners | Request Round 3 architecture review |
| 2026-08-08 | User clarification | User rejected a universal five-minute tool timeout because it could break unrelated work | The fix must not add a runtime-wide watchdog; unrelated execution behavior is preserved and outside this ticket | Narrow requirements/design to the media and recovery defect |
| 2026-08-08 | Scope correction | User clarified that the previously discussed unrelated execution-lifecycle expansion was not requested | Remove that expansion completely from canonical requirements/design; retain only the no-universal-timeout constraint | Revise package and request focused architecture review |
| 2026-08-08 | Architecture review | Round 5 report identified `ARCH-DES-009` | Stale wording still referred to the rejected scope expansion in requirements/design | Remove the stale wording and request another focused review |
| 2026-08-08 | Design cleanup | Removed stale approval, behavior, example, rationale, and scope wording from `requirements.md` and `design-spec.md` | Canonical package now states only no universal runtime watchdog and no unrelated execution changes | Request focused architecture review |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None required. This is an internal repository lifecycle defect.
- Version / tag / commit / freshness: Repository base `edf2d428b`, refreshed from `origin/personal` on 2026-08-08.
- Relevant contract, behavior, or constraint learned: Existing internal `BaseTool` execution options include an `AbortSignal`; this is the authoritative cancellation contract available to the media tool.
- Why it matters: The fix should extend existing cancellation rather than create an unrelated control channel.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Deterministic fake image clients and fake transfer functions; no live provider required.
- Required config, feature flags, env vars, or accounts: A short test-only media deadline; production policy is `MEDIA_OPERATION_TIMEOUT_MS` with `300_000` ms default and `10_000..3_600_000` ms validation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin personal`; dedicated `git worktree add ...`.
- Cleanup notes for temporary investigation-only setup: No temporary server or provider process started.

## Findings From Code / Docs / Data / Logs

The observed sequence is: the article writer generated a textual assistant response, emitted `generate_image` with output path `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.article-work/agent-handoff-graph/assets/imagegen-engineering-team-handoff-v3.png`, and then stopped at `PendingToolInvocationEvent`. The trace contains no tool-result event. The image file at that path was last modified before the call, so it cannot be used to infer success. The runtime's later `SEND_MESSAGE rejected` log confirms that the agent could not become idle/usable for the follow-up. Source inspection finds three unbounded waits after dispatch: provider initialization/generation, generated media download, and (for remote Autobyteus) an Axios request with timeout disabled. However, the trace does not prove that the tool body or provider request began: `PendingToolInvocationEvent` is the recorded model/runtime call-registration point, and no execution-start/result/error event follows it. The generic interruption race only handles explicit turn interruption and does not make a pending dispatch or hanging operation settle on its own.

The Bible Study comparison is a useful control case. In both recent runs, every `study_leader` tool call has a matching result. In the longer run, `edit_file` does produce normal patch-application errors, but those errors are emitted as terminal tool results and the agent continues with subsequent tools. Therefore the available Bible traces do not show a second missing-result root cause; they reinforce the distinction between an ordinary tool error and an orphaned invocation. The retained details are in `bible-study-trace-probe.md`.

The user clarified that a universal five-minute tool-call timeout would break unrelated work. The focused design therefore does not use a common runtime wall-clock timeout: the media capability owns its mandatory bound, while unrelated execution behavior is not redesigned. Server/worker interruption is repaired through the existing orphan protocol.

Repeated historical “image model not found” schema errors are a separate configuration-health concern. They should remain truthful bounded errors. The captured no-result trace is more precisely classified as a non-terminal tool-call lifecycle at or after call registration: it may have stalled before tool dispatch, during client creation/provider generation, or during transfer. No evidence identifies which internal phase began, and no evidence shows a synchronous model lookup exception in seq 59.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: Agent raw traces and working-context snapshots under `/Users/normy/.autobyteus/server-data/memory/agent_teams`; generated media under the workspace `.article-work` path. The affected call is an existing trace entry with no result.
- Relevant code-model, serialization, semantic, or physical-store change: Proposed change adds runtime deadlines and optional operation control; no trace or snapshot schema change is required.
- Normal readers and writers, including unknown/extra-field behavior: Existing trace/snapshot readers continue to read current entries; no new persisted field is needed.
- Representative direct-read or compatibility evidence: Direct raw trace inspection shows no result event after seq 59; existing output file predates the call.
- Required semantics and invariants preserved by direct use: Yes — preserve existing call traces/files and use the current v5 tool-result shape; add a terminal error result and repaired working-context message. Evidence is a missing terminal event, not an incompatible historical schema.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Do not expose secrets in timeout diagnostics; partial output cleanup must be scoped to the current transfer.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration has no benefit; existing v5 state is directly repairable. Runtime repair must be idempotent and must preserve the original evidence.
- Existing migration framework or lifecycle constraints, only if migration may be required: N/A.

## Constraints / Dependencies / Compatibility Facts

- The public media tool input schemas and `{ file_path }` output must remain stable.
- Recoverable tool/provider/runtime errors must remain errors in the tool/result history but must not become a permanent agent-run lifecycle failure. The durable logical agent should outlive disposable workers, providers, tools, and turns.
- The tool phase already provides a signal; the media wrapper currently drops it.
- Provider SDKs differ: a signal may be supported directly by some transports and only indirectly by others. A settled timeout must not require every provider to implement identical cancellation internals.
- Cleanup is best-effort after cancellation/timeout and must not reintroduce an unbounded wait.
- No backward-compatibility wrapper or dual media execution path is desired.

## Open Unknowns / Risks

- Which configuration subsystem should own the production default timeout: existing server settings, a media-specific constant, or a broader operation policy.
- Whether deadline should be one total operation budget or separately bounded provider and transfer phases.
- Exact `@google/genai` and OpenAI SDK option types for abort signals in the repository versions.
- How to ensure a late provider completion cannot write an artifact after timeout; the design must address ownership/settlement, not just race the returned promise.
- Whether to apply the same mechanism to speech/video in this ticket or factor a shared media operation helper while keeping image behavior the acceptance focus.

## Notes For Architecture Reviewer

The design should preserve the healthy owner (`MediaGenerationService`) and make bounded completion explicit there, while extending the already-existing `BaseTool` signal boundary. Please reject any implementation that only races a timeout and abandons a live provider request without guarding late completion/artifact writes, or that changes the public media tool contract unnecessarily. Most importantly, recoverability is non-negotiable: no recoverable media/provider/runtime failure may permanently poison an otherwise valid agent run; live failures and restart-orphaned calls must both settle into a continuation-capable state. Treat the durable logical agent as outliving disposable execution workers and turns. The user explicitly approved the rule that a missing tool result must be converted into a matching synthetic tool error before continuation, even when the original cause is unknown. Repair must handle every unmatched call one-for-one and be idempotent across repeated restart. Round 2 consistency rework now makes the raw-first/no-cross-store-transaction protocol and required recovered lifecycle event owners explicit in the canonical design.
