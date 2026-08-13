# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready — approved by the user on 2026-08-08 after investigation and scope clarification.

## Goal / Problem Statement

Preserve the logical agent as a continuously usable, lifetime-running entity. A server-owned `generate_image` tool call must not leave an agent turn permanently pending when the image provider, image client, or generated-media download fails or the server stops before a result is recorded. The article-writing agent must receive a truthful success or failure result when the operation settles or is reconciled, and the run must remain recoverable and usable for a later user message instead of entering an unrecoverable error state. This ticket MUST NOT impose a universal wall-clock timeout on every tool call or alter unrelated execution behavior. The image path is the immediate defect and the first concrete enforcement point for this broader agent-lifetime invariant.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | In the observed Article Writing Team run, `generate_image` emitted a pending tool invocation but no tool result, tool error, or continuation after more than seven minutes. | Every synchronous `generate_image` invocation reaches a terminal success or failure outcome within the configured media-owned operation bound, including when provider generation or download does not resolve. | Successful generation still returns the requested local `file_path` and writes the generated artifact. | REQ-001, REQ-003; AC-001, AC-002 |
| BEH-002 | Because the tool invocation remained pending, a subsequent user message (`continue please`) could not advance the article writer; the runtime later reported that the agent had entered an error state while waiting for idle. | A provider, tool, or recoverable runtime error MUST be contained as a recoverable turn/tool failure. The agent run MUST be reconciled to an idle/ready state and accept a later user message; it MUST NOT be permanently poisoned by the failed media call. | Normal interruption and ordinary non-media tool behavior remain unchanged. | REQ-003, REQ-004; AC-003, AC-004 |
| BEH-003 | The native media tool contract owns model selection, path resolution, provider invocation, download, cleanup, and `{ file_path }` result creation, but does not currently expose a media-owned completion bound or pass the turn abort signal into the media service/client boundary. | The media operation owner enforces its own mandatory synchronous operation bound and propagates cancellation through provider invocation and artifact transfer where supported, without changing the public tool input/output contract. | Workspace path safety, first-result selection, provider model selection, and cleanup semantics are preserved. | REQ-001, REQ-002, REQ-005; AC-001, AC-005, AC-006 |
| BEH-004 | A configured model or provider failure may reject synchronously or asynchronously, but a stalled request has no equivalent bounded failure result. | Invalid configuration, provider errors, cancellation, and timeout are represented as truthful tool failures with diagnostics sufficient for logs and agent continuation; no fabricated success is returned. | Existing error-result handling and user-visible tool lifecycle terminology remain the governing convention. | REQ-003, REQ-006; AC-002, AC-007 |
| BEH-005 | The runtime currently exposes an `Error` state and can leave a valid agent run unusable after an unresolved/recovered operation or restart restoration failure. | The logical agent remains a lifetime-capable, continuation-oriented entity. Recoverable tool, provider, worker, and restart failures are isolated to the current operation/turn, reconciled, and followed by a ready state; only explicit user stop/delete or genuinely unrecoverable external state may prevent continuation. | Worker processes, provider clients, and individual turns remain disposable implementation details; the durable agent identity and conversation remain usable. | REQ-008; AC-008 |

## Investigation Findings

- The exact captured run is `article_writing_team_e618f2a92ea54aa69f264b1f8c6ffc16`; its `article_writer` trace ends at sequence 59 with `generate_image` call ID `call_3f8b340038294116a197625f` and has no subsequent result or error.
- The server-owned media service awaits provider generation and media download without an explicit wall-clock timeout. The generic turn scope only races operations against user interruption; it does not impose a timeout.
- The BaseTool execution options already carry the turn `AbortSignal`, but the media wrapper drops the options and the media client interfaces do not accept a signal. The Autobyteus Axios client also uses `timeout: 0` for its async client.
- The observed post-failure send error is a downstream lifecycle symptom: the runtime cannot post to an agent that remains busy/error while waiting for the unresolved invocation.
- Existing generated output at the requested path predates the observed call and does not prove that the captured call completed.

## Relevant Supplemental Task Artifacts

None. The screenshots and server-data trace are investigation evidence, not additional normative requirements.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant; Local Implementation Defect
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The owning media path has no bounded-completion invariant; the existing cancellation signal is available at the runtime boundary but is discarded before provider and download operations. A targeted interface propagation/refactor is required to make the invariant enforceable without an unbounded promise race.
- Requirement or scope impact: Keep the public media tool contract stable; include image generation first and preserve equivalent safety for the shared media service methods touched by the chosen design.

## Recommendations

Design a server-owned media-operation cancellation and transport-failure boundary. It should accept the existing tool execution signal, pass it through image/provider and artifact-transfer operations, normalize provider/transport rejection and explicit cancellation as tool failures, and guarantee cleanup does not prevent terminal settlement. Do not impose a universal runtime timeout on all tools or change unrelated execution behavior in this ticket. Use orphan repair when the server stops before a result is recorded. Add deterministic unit coverage for provider rejection, download failure, abort, restart repair, and success. Avoid a compatibility wrapper or a detached `Promise.race` that leaves an underlying request unowned.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium — the user-visible defect is narrow, but the fix crosses the server media service, tool boundary, shared multimedia client contracts/implementations, download transport, configuration, and tests.

## In-Scope Use Cases

- Article writer invokes `generate_image` and the provider succeeds.
- Provider request or initialization stalls.
- Generated-image download or write stalls/fails.
- User interrupts an in-flight media operation.
- Provider/model configuration fails immediately.
- User sends a follow-up after a media failure or orphan repair.

## Out of Scope

- Image quality, prompt changes, or article-writing workflow semantics.
- Reworking the article team handoff rules.
- Retrofitting unrelated external tools with a universal timeout in this ticket.
- Adding unrelated functionality; that is follow-up scope.
- Recovering an already-corrupted historical run without a user retry or restart action.

## Functional Requirements

- **REQ-001 — Synchronous media bound:** `generate_image` is a synchronous bounded media capability. `MediaGenerationService` MUST own and apply a mandatory media operation deadline, resolved from explicit internal media options -> server setting `MEDIA_OPERATION_TIMEOUT_MS` -> default `300_000` milliseconds, validated to `10_000..3_600_000` milliseconds. The deadline starts before media model/provider work, covers provider invocation, returned-media transfer, and cleanup that precedes settlement, and produces a truthful terminal media tool error if the operation does not resolve. This media bound MUST NOT be generalized into a universal runtime timeout for unrelated tools.
- **REQ-002 — Cancellation propagation:** The media tool boundary MUST honor the existing tool execution `AbortSignal`; provider and transfer layers MUST receive cancellation where their transport supports it.
- **REQ-003 — Terminal failure semantics:** Timeout, cancellation, provider, configuration, transfer, dispatch, and orphan-reconciliation failures MUST produce the normal tool failure path and terminal lifecycle events; when a registered tool call has no result, the runtime MUST synthesize a truthful tool error (for example, `generate_image failed: operation did not complete or was interrupted.`). The system MUST NOT return a fabricated `{ file_path }` success.
- **REQ-004 — Non-negotiable run recoverability:** A provider, tool, or recoverable runtime failure MUST NOT transition an otherwise valid agent run into a permanently unusable state. Once the bounded failure is processed—or an orphaned call is reconciled after restart—the active turn MUST be settled, the run MUST return to an idle/ready state, and a subsequent user message MUST be accepted rather than rejected because of the prior failure.
- **REQ-005 — Preserve successful contract:** Successful calls MUST retain existing model selection, workspace path resolution/safety, output writing, first-media selection, cleanup, and `{ file_path }` result semantics.
- **REQ-006 — Observable diagnostics:** Timeout and cancellation failures MUST identify the media operation and relevant model/tool invocation context in server logs/tool diagnostics without exposing secrets.
- **REQ-007 — Deterministic verification:** Unit tests MUST cover success, provider rejection, provider non-resolution, transfer non-resolution/failure, external abort, media-bound settlement, cleanup, and post-cancellation/late-settlement behavior at the owning boundaries.
- **REQ-008 — Logical agent lifetime invariant:** The agent runtime MUST treat workers, tools, provider calls, and turns as recoverable/disposable execution units beneath a durable logical agent. No recoverable operation, worker, or restart-reconciliation failure MAY permanently transition an otherwise valid agent into a dead/unusable state. The runtime MUST isolate the failed unit, record a truthful diagnostic, restore the agent to a continuation-capable state, and accept a later user message.
- **REQ-009 — Cause-independent orphan repair:** When a persisted native tool call has no matching persisted result, recovery MUST NOT require knowing why the result is missing. It MUST create exactly one matching synthetic tool-error result per unmatched call, preserve the original call and arguments, persist an idempotent repair marker/terminal result, and continue with the repaired conversation. This applies to the current `generate_image` case and to future unmatched native tool calls.
## Acceptance Criteria

- **AC-001:** A mocked image client that never resolves produces a terminal media timeout failure within the configured `MEDIA_OPERATION_TIMEOUT_MS` test deadline and never leaves the synchronous `generate_image` service promise pending.
- **AC-002:** The agent tool execution pipeline records a terminal tool error for provider, transport, cancellation, or interruption failure; no fabricated success result is emitted.
- **AC-003:** A follow-up message submitted after media failure or orphan repair is accepted by the run (subject to ordinary LLM/provider availability) rather than rejected because the prior media invocation remains active; the failure is visible to the model as normal tool history.
- **AC-004:** User abort causes cancellation semantics, does not fabricate an image result, and does not create an unhandled rejection from the underlying operation.
- **AC-005:** Successful mocked generation still writes the requested artifact and returns the resolved `{ file_path }` value; existing path and cleanup assertions remain valid.
- **AC-006:** Provider rejection, invalid model configuration, and transfer failure remain truthful terminal tool failures with useful diagnostics.
- **AC-007:** Tests prove the media deadline applies to provider generation and returned-media transfer, cleanup cannot indefinitely block media terminal failure settlement, and an orphaned pending call found during restart is reconciled so the run becomes usable. No test assumes a universal runtime timeout for unrelated tools.
- **AC-008:** Failure-injection tests prove that a recoverable tool/provider failure, worker interruption, and restart with an orphaned pending invocation each leave the durable agent run continuation-capable after reconciliation; the failed operation is represented by a matching synthetic tool error when no result exists, but the logical agent is not left permanently in `Error`.
- **AC-009:** Given one or more persisted native tool calls without results—including the captured `generate_image` call—recovery inserts one matching error result per call, does not duplicate repairs on repeated restart, preserves the original call/arguments, and accepts the next user message without requiring diagnosis of the original missing-result cause.

## Constraints / Dependencies

- Preserve the existing `BaseTool` execution option shape and the server-owned media tool public input/output contract unless architecture review finds a necessary boundary correction.
- Respect provider SDK cancellation capabilities; where a provider cannot cancel, the runtime must still detach/settle safely and observe late rejection without crashing the run.
- Do not log API keys or prompts beyond existing diagnostic policy.
- Follow the current repository test/build conventions for both `autobyteus-server-ts` and `autobyteus-ts`.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Agent raw traces, working-context snapshots, and generated media files under workspace/server-data.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): Directly Usable — No Migration
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve the original call and arguments; append a terminal synthetic tool-error result and repaired working-context message in the existing v5 shapes. No historical data is discarded or schema-migrated.
- Unacceptable data loss or corruption: Do not delete existing artifacts during timeout cleanup except a partial output file owned by the current transfer operation.
- Relevant availability, maintenance-window, or rollout constraints: Normal server restart/deployment only.
- Related requirement and acceptance-criteria IDs: REQ-003, REQ-005, REQ-009; AC-005, AC-006, AC-009.

## Assumptions

- The captured trace is the user-reported failure and is representative of the current production path.
- A configured default media timeout can be introduced without changing existing persisted run data.
- Existing tool-result failure handling is sufficient once the media promise becomes bounded.

## Risks / Open Questions

- The media deadline owner/default is selected: `MediaGenerationService`, `MEDIA_OPERATION_TIMEOUT_MS`, default `300_000` ms, validated to `10_000..3_600_000` ms. It remains a capability policy, not a runtime-wide deadline.
- Provider SDK support differs across Gemini, OpenAI, and Autobyteus clients; design must distinguish transport cancellation from safe bounded detachment.
- Cleanup may itself block; design must ensure cleanup cannot prevent a terminal timeout/error result.
- Whether speech/video should share the same deadline mechanism or only image generation is a design-review decision; shared service consistency is preferred if low-risk.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| Successful image generation | REQ-001, REQ-005, REQ-007 |
| Provider/transfer failure | REQ-001, REQ-003, REQ-004, REQ-006, REQ-007, REQ-008 |
| User cancellation | REQ-002, REQ-003, REQ-004, REQ-007 |
| Provider/configuration/transfer error | REQ-003, REQ-005, REQ-006, REQ-007 |
| Worker interruption or restart with pending work | REQ-004, REQ-008, REQ-009 |

## Acceptance-Criteria-To-Scenario Intent

| Scenario | Acceptance Criteria |
| --- | --- |
| Provider/transport failure or explicit cancellation | AC-001, AC-002, AC-007 |
| Follow-up after media failure or orphan repair | AC-003 |
| User abort | AC-004 |
| Successful generation | AC-005 |
| Immediate/provider/transfer failure | AC-006 |
| Worker interruption or restart reconciliation | AC-008 |
| Multiple unmatched tool calls and repeated restart | AC-009 |

## Approval Status

Approved by the user on 2026-08-08. The synthetic tool-error rule is an explicit product requirement: a missing tool result must be converted into a truthful terminal tool error so the agent can continue. The user additionally clarified that this ticket must not introduce a universal tool-call timeout because unrelated execution must not be broken. Unrelated functionality is outside this ticket.
