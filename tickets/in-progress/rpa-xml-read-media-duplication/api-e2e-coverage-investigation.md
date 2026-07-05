# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication/tickets/in-progress/rpa-xml-read-media-duplication/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication/tickets/in-progress/rpa-xml-read-media-duplication/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication/tickets/in-progress/rpa-xml-read-media-duplication/design-spec.md`
- Design Correction: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication/tickets/in-progress/rpa-xml-read-media-duplication/design-correction-remove-xml-instruction.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication/tickets/in-progress/rpa-xml-read-media-duplication/design-review-report.md` (superseded where it mentions generated XML guidance)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication/tickets/in-progress/rpa-xml-read-media-duplication/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-xml-read-media-duplication/tickets/in-progress/rpa-xml-read-media-duplication/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Code review round 3 passed after corrected implementation removed generated XML/backtick continuation guidance and split final RPA browser current-input composition to the linked RPA project.
- Prior Investigation Reviewed: Round 1 paused/superseded investigation in this same file was reviewed as historical context and replaced by this corrected-scope investigation.
- Latest Authoritative Investigation: Round 2, this file.

## Current Requirement And Design Basis

The current approved scope is to replace model-visible internal tool-continuation marker text with concise completed-tool wording and to preserve media/tool-history behavior without adding unrelated prompt guidance. A single successful `read_media_file` continuation must use exactly `The read_media_file tool call completed successfully.` when represented as model-visible synthetic text. No generated continuation text may contain `Tool history continuation`, `Native API tool continuation`, XML-formatting guidance, markdown-backtick guidance, parser-format guidance, or future-tool-call guidance. XML formatting instructions are the user's original-prompt responsibility only.

Media context files returned by tools must still attach to the next provider request when media input is needed, and historical media must remain non-reattached. Native/API text-only continuations must continue to rely on structured tool-result history without appending unnecessary user messages. AutoByteus/RPA must not lose completed tool results in browser-visible current input; however, the corrected design assigns final browser cache-hit composition of rendered `role: "tool"` messages plus current user continuation to the linked RPA worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-tool-result-current-input-composition`. This TS worktree should provide semantic continuation text and deterministic rendered tool messages, but must avoid duplicating final RPA browser prompt blocks.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean for the corrected scope: no backward-compatibility mechanism was introduced, legacy old behavior is not retained in model-visible continuation content, obsolete generated XML-guidance code/tests were removed, and no duplicate-suppression workaround was added. Code review round 3 passed with no unresolved findings.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Builder-generated tool-continuation synthetic text | Changed | FR-001, FR-002, FR-003, AC-001, implementation handoff | Execute focused helper/builder unit coverage. |
| Generated XML/backtick continuation guidance | Removed | Design correction, FR-007, AC-005, code review round 3 | Execute negative source/test search plus unit/renderer tests that assert no XML guidance appears. |
| API/OpenAI-compatible media carrier text | Changed | FR-001, FR-004, AC-002 | Execute OpenAI chat renderer test; existing coverage is valid. |
| Gemini media carrier text | Changed | FR-001, FR-004, design provider notes | Execute Gemini renderer test; existing coverage is valid. |
| AutoByteus/RPA media current message | Changed | FR-004, FR-006, AC-003 | Execute RPA renderer tests and optionally live RPA media probe because the original symptom is RPA/browser-backed. |
| AutoByteus/RPA text-only trailing tool-result split | Changed / Split | FR-006, AC-004, code review CR-001 supersession | Execute RPA renderer test validating TS renders the `role: "tool"` record once and appends only completed-tool wording; record linked RPA dependency for final browser cache-hit composition. |
| Native/API text-only structured history | Preserved | FR-005, UC-004 | Execute provider-native integration flow. |
| Two distinct media files and no duplicate suppression | Preserved | FR-008, FR-009, AC-008 | Execute read-media integration flow; no parser/tool-executor duplicate suppression was added. |
| RPA media staging/current-media-only transport | Preserved | FR-004, FR-008, DS-002 | Execute AutobyteusClient media staging integration. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/agent/message/tool-continuation-display-text.test.ts` | Locks minimal single-tool and multi-tool success text, marker absence, and absence of XML/backtick guidance. | FR-001, FR-002, FR-003, FR-007, AC-001, AC-005 | Still Valid | Current test asserts no `XML tool-call text`, no `markdown triple backticks`, and exact `read_media_file` wording. | Execute. |
| `autobyteus-ts/tests/unit/agent/loop/tool-result-continuation-builder.test.ts` | Verifies builder content is completed-tool wording in XML and API modes, context files are attached, metadata remains internal, markers/XML guidance are absent. | FR-001, FR-002, FR-004, FR-007, AC-001, AC-005 | Still Valid | Current source no longer passes XML-format options to display helper. | Execute. |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/openai-chat-renderer.test.ts` | Verifies OpenAI-compatible image media continuation contains completed-tool text and image part, with no internal markers. | FR-001, FR-004, AC-002 | Still Valid | Relevant API media-carrier boundary. | Execute. |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts` | Verifies Gemini media continuation contains completed-tool text plus inline data, with no internal markers. | FR-001, FR-004 | Still Valid | Relevant native Gemini media boundary. | Execute. |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/autobyteus-prompt-renderer.test.ts` | Verifies RPA payload rendering, media continuation current user/audio attachment, text-only trailing tool-result split, no duplicate TS result block, marker absence, and XML-guidance absence. | FR-001, FR-004, FR-006, FR-007, AC-003, AC-004, AC-005 | Still Valid | Code review round 3 specifically validated this corrected TS/RPA split. | Execute. |
| `autobyteus-ts/tests/unit/agent/loop/agent-turn-runner.test.ts` | Regression around turn continuation event flow after tool results. | FR-005, DS-001 | Still Valid | Tool-continuation event flow remains part of this change. | Execute. |
| `autobyteus-ts/tests/unit/agent/pipelines/agent-input-pipeline.test.ts` | Verifies request-mode selection, including media append vs tool-history-only behavior. | FR-004, FR-005 | Still Valid | Request-mode behavior is intentionally preserved. | Execute. |
| `autobyteus-ts/tests/unit/agent/llm-request-assembler.test.ts` | Verifies tool-history and user-message assembly around continuations. | FR-004, FR-005 | Still Valid | Assembly path remains part of DS-001. | Execute. |
| `autobyteus-ts/tests/integration/agent/provider-native-tool-continuation-flow.test.ts` | Provider-native text-only continuations keep structured tool results and do not append duplicated aggregate user text; synthetic native marker event remains absent. | FR-005, UC-004 | Still Valid | `Native API tool continuation` appears only in a negative zero-event assertion; not a stale expected prompt. | Execute. |
| `autobyteus-ts/tests/integration/agent/read-media-file-continuation-flow.test.ts` | Executes two distinct `read_media_file` results (audio/video), confirms context files reach pipeline/assembler/Gemini inline data, and records two tool-result traces. | FR-004, FR-008, FR-009, AC-008 | Still Valid | Proves two distinct media results continue separately and no duplicate suppression blocks them. Marker/XML text is covered by focused unit/renderer tests. | Execute. |
| `autobyteus-ts/tests/integration/clients/autobyteus-client-media-staging.test.ts` | Verifies current local media is staged and only current-message media is sent to RPA server. | FR-004, FR-008 | Still Valid | Client media staging behavior is preserved and relevant to RPA media continuation. | Execute. |
| `autobyteus-ts/tests/integration/agent/gemini-read-media-file-m4a-live.test.ts` | Env-gated direct Gemini `.m4a` live continuation. | FR-004 direct Gemini audio | Out Of Scope for required final run | Direct Gemini live access is optional and not required by current scope; original defect is RPA/browser-backed and deterministic renderer/unit coverage covers Gemini payload shape. | Do not force. |
| Temporary live RPA media probe | Sends original AudioTranscriber-style RPA request and then a current media continuation generated by current TS code without generated XML guidance. | AC-007, original symptom | Use Temporary Executable Probe Only | Live RPA/Gemini depends on local browser session and can be slow/flaky; useful as broad executable evidence, not durable repository coverage. | Run if local server/API key/audio are available; remove scaffold. |
| Linked RPA worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-tool-result-current-input-composition` | RPA server cache-hit current-input composition from contiguous rendered `role: "tool"` messages plus current user. | FR-006, AC-004, code review residual risk | Out Of Scope for TS durable coverage; explicit dependency | Its in-progress requirements/design assign browser current-input composition to RPA server. This TS worktree must not edit or validate that full server behavior as final sign-off. | Record dependency and do not block TS pass on unfinished linked ticket. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior paused API/E2E investigation round 1 | Expected XML guidance in generated continuation and planned a durable integration-test update for it. | User correction removed generated XML/backtick continuation guidance from scope. | `design-correction-remove-xml-instruction.md`, requirements FR-007/AC-005, code review round 3. | This refreshed investigation replaces round 1; current unit tests assert XML guidance is absent. | N/A |
| None in repository source/tests requiring removal during API/E2E | N/A | Source/tests already remove positive XML-guidance expectations; remaining marker/XML strings are negative assertions or ticket history. | `rg` inspection and code review search evidence. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | Current source/test package already contains focused durable coverage for corrected TS behavior. | Code review round 3 and inventory above | N/A | API/E2E will execute existing valid coverage without adding repository-resident coverage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | No API/E2E-stage durable coverage update is planned. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | No stale repository-resident durable coverage remains in current source/tests. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TP-RPA-MEDIA-001 | Temporary Vitest probe under `autobyteus-ts/tests/probes/`, using current TypeScript `AutobyteusLLM`, `ToolResultContinuationBuilder`, `AgentInputPipeline`, and `AutobyteusPromptRenderer` against local RPA server `https://localhost:51739`, model `gemini-3.5-flash-app-rpa`, existing `AUTOBYTEUS_API_KEY`, and original audio file `/Users/normy/church/meetings/26-Juni-20-12-tonggong-meeting_parts/26-Juni-20-12-tonggong-meeting_part1.m4a`. Original user prompt already contains XML formatting guidance; generated current continuation must not. | Original RPA media continuation path sends completed-tool wording plus current audio without generated XML guidance/old markers and does not repeat `read_media_file` on the second response. | Depends on local browser-backed Gemini/RPA session, credentials, timing, and user-local audio. Too environment-specific for durable repo coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Final RPA text-only browser cache-hit composition | Assigned to linked RPA worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/rpa-tool-result-current-input-composition`; this TS package intentionally avoids duplicating final browser prompt blocks. | Medium until the linked RPA ticket is implemented/validated; TS can only prove it renders the `role: "tool"` record once and current user wording separately. | Track as linked dependency in execution report and delivery handoff; not a TS reroute. |
| Direct live Gemini `.m4a` test | Requires explicit live Gemini/Vertex credentials and flag; not required by corrected scope. | Low for TS marker-removal/media-carrier behavior. | None. |
| Existing persisted conversations with old marker text | Backfill intentionally out of scope. | Low for new runs. | None. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently for TS package | N/A | Corrected requirements/design/code review explicitly define TS behavior and linked RPA dependency. | N/A |

## Execution Plan

1. Execute corrected-scope source/test search: `rg -n 'XML_TOOL_CALL_MARKDOWN_INSTRUCTION|includeXmlToolCallInstruction' autobyteus-ts/src autobyteus-ts/tests` expecting no matches.
2. Execute focused unit suite for display text, builder, RPA/OpenAI/Gemini renderers.
3. Execute focused unit suite for loop/pipeline/assembler.
4. Execute integration smoke for provider-native continuation, read-media continuation, and client media staging.
5. Execute TypeScript build check: `pnpm exec tsc -p tsconfig.build.json --noEmit`.
6. If environment remains available, run temporary live RPA media probe `TP-RPA-MEDIA-001`; remove `tests/probes` afterward.
7. Write the execution coverage report. Because API/E2E is not adding/updating/removing repository-resident durable coverage in this round, pass routing should go to `delivery_engineer` with the cumulative artifact package, while explicitly noting the linked RPA dependency.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The previous paused investigation is superseded. Current corrected scope has valid existing durable coverage and one optional temporary live RPA media probe. The linked RPA current-input-composition worktree is a tracked dependency, not a blocker for this TS package unless execution reveals a TS-side mismatch.
