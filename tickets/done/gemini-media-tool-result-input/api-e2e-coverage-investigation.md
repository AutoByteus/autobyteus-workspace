# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/done/gemini-media-tool-result-input/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/done/gemini-media-tool-result-input/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/done/gemini-media-tool-result-input/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/done/gemini-media-tool-result-input/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/done/gemini-media-tool-result-input/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/done/gemini-media-tool-result-input/code-review-report.md`
- Current Investigation Round: 3
- Trigger: Code review Round 4 pass after user requested stronger live proof: env-gated live direct-Gemini `.m4a` test now uses a spoken `hello hello hello` fixture and asserts the live Gemini response contains `hello`.
- Prior Investigation Reviewed: Yes — prior Rounds 1 and 2 in this same file.
- Latest Authoritative Investigation: Round 3, this file.

### Investigation Round History

| Round | Trigger | Key Decision | Repository-Resident Durable Coverage Plan | Latest Authoritative |
| --- | --- | --- | --- | --- |
| 1 | Initial code review pass for revised direct Gemini `.m4a` implementation; no durable live test existed yet. | Existing classifier/formatter/renderer/continuation coverage was valid, but provider-bound `GeminiLLM.generateContent` request-shape coverage was missing. | Add/update `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` with `.m4a` `inlineData` capture. | No |
| 2 | Code review Round 3 pass after env-gated live direct-Gemini `.m4a` integration test and fixture were added/reviewed. | The new live test, fixture, strengthened continuation test, and existing provider-bound payload test were valid; no further durable coverage edit was needed. | No durable coverage add/update/remove by API/E2E; execute reviewed coverage including default-skip and live-enabled modes. | No |
| 3 | Code review Round 4 pass after stronger spoken `.m4a` fixture and live response `hello` assertion were added/reviewed. | The stronger live transcription-signal test and spoken fixture are valid coverage for the user's stronger proof request. No API/E2E durable coverage edit is needed before execution. | No durable coverage add/update/remove by API/E2E; execute default-skip, live default model, live override model, prior provider-bound capture, typecheck, and diff check. | Yes |

## Current Requirement And Design Basis

The approved product requirement remains the direct Gemini `.m4a` media handoff path, not RPA, server token usage, GraphQL, frontend Token Meter, token-count heuristics, or broader transcription feature work. A `read_media_file` result for a local `.m4a` must hydrate as an audio `ContextFile`, continue into the same-turn LLM request as `LLMUserMessage.audio_urls`, render for direct Gemini as `inlineData` with `mimeType: 'audio/mp4'`, and avoid silent text-only downgrade when media conversion fails. Media extension policy must remain centralized in the shared classifier.

The updated code-reviewed live test adds stronger executable proof that this is not merely request-shape construction: it simulates the original user intent, uses the `read_media_file` tool-result continuation path, asserts exact Gemini `inlineData` bytes/MIME, invokes direct `GeminiLLM.sendMessages(request.messages, request.renderedPayload)`, and requires the live model response to contain `hello` from a synthetic spoken `.m4a` fixture.

The implementation handoff's Legacy / Compatibility Removal Check remains clean: no backward-compatibility mechanism, no old silent text-only behavior, duplicate media policy removed, and no RPA/server/web/token-meter scope.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Shared image/audio/video extension classifier including `.m4a -> audio` | Added, preserved | Requirements FR-002/AC-001; design DS-002; implementation handoff | Keep unit classifier coverage. |
| `ContextFileType.fromPath()` delegates media classification to shared classifier | Changed, preserved | Requirements FR-003/AC-002 | Keep context-file type coverage. |
| `media-payload-formatter.isValidMediaPath()` accepts existing `.m4a` local files via shared classifier | Changed, preserved | Requirements FR-004/AC-003 | Keep formatter coverage for `.m4a` valid path/base64/MIME. |
| Direct `GeminiPromptRenderer` renders local `.m4a` audio as `inlineData` and fails declared-media conversion explicitly | Changed, preserved | Requirements FR-005/FR-006/AC-004/AC-005 | Keep renderer coverage and continuation-render coverage. |
| `read_media_file` continuation carries `.m4a` to `audio_urls` and renders assembled request through `GeminiPromptRenderer` | Changed, preserved from Round 3 | Implementation handoff; code review Rounds 3-4 | Execute default focused suite. |
| Env-gated live direct-Gemini `.m4a` flow now uses original user intent and asserts transcription signal `hello` | Changed after prior API/E2E round | Updated implementation handoff; code review Round 4; user requested stronger live proof | Execute default-skip mode, live default model mode, and live override model mode. Treat live variability as residual risk but current reviewed coverage is valid. |
| Spoken synthetic `.m4a` fixture `tests/data/test_audio.m4a` | Changed after prior API/E2E round | Code review Round 4: generated with macOS `say` speaking `hello hello hello`; 9,707 bytes; SHA-256 `7f55f7c055539f4b4d45860375f3800e0f6817a2b756db970168aae71ee4795d` | Retain as valid durable fixture; no private user audio. |
| Provider-bound `GeminiLLM.generateContent` request-shape capture for `.m4a` | Added in prior API/E2E round, preserved | Prior API/E2E and code review | Re-run as regression check. |
| RPA/server/web/token-meter/token-usage-summary code | Out of scope | Requirements Out of Scope; implementation handoff; code review | No API/E2E coverage changes. Prior delivery artifacts/docs are stale until delivery reruns after this pass. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/utils/media-file-kind.test.ts` | Shared classifier exports one complete media extension set, classifies `.m4a` as audio, handles URL/query/case extraction, rejects non-media. | FR-002, AC-001, DS-002 | Still Valid | Stable from prior rounds; directly validates the shared media-classifier invariant. | Run in default focused suite. |
| `autobyteus-ts/tests/unit/agent/message/context-file-type.test.ts` | `ContextFileType.fromPath()` returns `AUDIO` for `.m4a` and maps supported media URLs via classifier. | FR-003, AC-002 | Still Valid | Stable from prior rounds; validates delegated context-file media classification. | Run in default focused suite. |
| `autobyteus-ts/tests/unit/llm/utils/media-payload-formatter.test.ts` | Existing local `.m4a` validates, converts to base64, and resolves MIME as `audio/mp4`; existing media behavior remains covered. | FR-004, AC-003, AC-007 | Still Valid | Stable from prior rounds; validates formatter owner and `.m4a` conversion. | Run in default focused suite. |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts` | Local `.m4a` audio renders as text + Gemini `inlineData`; missing declared `.m4a` throws. | FR-005, FR-006, AC-004, AC-005, AC-008 | Still Valid | Stable from prior rounds; protects direct renderer bug and explicit failure behavior. | Run in default focused suite. |
| `autobyteus-ts/tests/integration/agent/read-media-file-continuation-flow.test.ts` | `read_media_file` returns `.m4a` audio context, uses `append_user_message`, final request has `.m4a` in `audio_urls`, and rendered Gemini payload contains `.m4a` audio `inlineData` plus video `inlineData`. | FR-001, FR-005, AC-004, AC-006, DS-001 | Still Valid | Inspected in prior round; still current and directly relevant. | Run in default focused suite. |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` / `.m4a` request capture | Stubbed `GeminiLLM.sendMessages()` sends local `.m4a` as provider-bound `inlineData` to `generateContent`. | FR-005, AC-004, AC-008 | Still Valid | Added in prior API/E2E round, code-reviewed, and still useful non-live adapter proof. | Re-run as regression check. |
| `autobyteus-ts/tests/integration/agent/gemini-read-media-file-m4a-live.test.ts` | Env-gated live test: simulates original user instruction, copies spoken `.m4a` fixture, executes `ReadMediaFile -> ToolResultContinuationBuilder -> AgentInputPipeline -> LLMRequestAssembler/GeminiPromptRenderer`, asserts exact inlineData base64/MIME, calls direct `GeminiLLM.sendMessages(request.messages, request.renderedPayload)`, and asserts response contains `hello`. | FR-001, FR-005, AC-004, AC-006, AC-008, UC-001; user-requested stronger live proof | Still Valid | Inspected file after Round 4 change; env gate is explicit and correct; the `hello` assertion proves live transcription signal while token accounting remains out of scope. | Run in default-skip mode, live default model mode, and live override model mode. |
| `autobyteus-ts/tests/data/test_audio.m4a` | Small synthetic spoken `.m4a` fixture saying `hello hello hello`. | AC-008; stronger live proof requested by user | Still Valid | Inspected fixture metadata: 9,707 bytes; ISO Media / Apple iTunes ALAC/AAC-LC `.M4A`; SHA-256 `7f55f7c055539f4b4d45860375f3800e0f6817a2b756db970168aae71ee4795d`; no private user audio. | Retain; no execution action beyond live tests. |
| `autobyteus-ts/tests/integration/llm/api/gemini-llm.test.ts` existing live multimodal tests | Existing credential-dependent Gemini LLM liveness, including `.mp3` audio. | Existing provider liveness; residual provider risk | Still Valid | Not the direct `read_media_file -> .m4a -> Gemini` scenario; remains valid but not central to this refresh. | No action. |
| Superseded RPA/server/web/token-meter tests or artifacts | Previously considered broad scope. | Out of scope in revised requirements/design. | Out Of Scope | Current code review confirms no such code is included. | No action. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | No relevant existing durable coverage asserts intentionally removed silent text-only fallback or superseded RPA/token-meter behavior. | Code review Round 4 found no stale/obsolete coverage. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None in this API/E2E round | N/A | Existing reviewed durable live coverage now covers the stronger proof requested by the user. | N/A | No additional durable coverage edit is needed before execution. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None in this API/E2E round | N/A | N/A | N/A | Stronger live coverage was already implemented and code-reviewed before this API/E2E refresh. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| None required | N/A | Durable default and live env-gated tests now cover the needed execution surfaces. | N/A |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Token Meter / token accounting correctness | Requirements and design defer usage/reporting unless separately needed after media is confirmed sent. | Provider metadata may under-report or omit fields. | Separate token/reporting follow-up if observed/important. |
| Live test execution in environments without credentials | Test is correctly skipped by default and requires explicit env flag plus credentials. | Other environments may not exercise live provider path. | Delivery docs/no-impact pass should decide whether to document the opt-in env gate. |
| Exhaustive transcription quality validation | The stronger test proves a simple synthetic `hello` signal, not broad transcription quality across languages/noise/long audio. | Live model responses can vary; full transcription QA is outside this media-handoff bug fix. | Separate model-output/transcription-quality follow-up only if requested. |
| Every classifier-supported extension against live Gemini | Current user bug and acceptance criteria center on `.m4a`. | Other extensions could fail provider-side. | Provider-specific incompatibility should fail explicitly; open follow-up only if observed. |
| RPA/server/web/token-meter/token-usage-summary paths | Revised scope excludes them. | None for current direct-Gemini media-rendering fix. | No action. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before execution | N/A | Upstream requirements/design and Round 4 code review are explicit; implementation legacy check is clean. | N/A |

## Execution Plan

1. Execute the reviewed default focused suite with the live test present but skipped by default:
   - `pnpm -C autobyteus-ts exec vitest run tests/unit/utils/media-file-kind.test.ts tests/unit/agent/message/context-file-type.test.ts tests/unit/llm/utils/media-payload-formatter.test.ts tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts tests/integration/agent/read-media-file-continuation-flow.test.ts tests/integration/agent/gemini-read-media-file-m4a-live.test.ts`
2. Execute the env-gated live direct-Gemini `.m4a` transcription test with default model:
   - `AUTOBYTEUS_RUN_GEMINI_M4A_LIVE=1 pnpm -C autobyteus-ts exec vitest run tests/integration/agent/gemini-read-media-file-m4a-live.test.ts`
3. Execute the env-gated live test with override model from code review:
   - `AUTOBYTEUS_RUN_GEMINI_M4A_LIVE=1 AUTOBYTEUS_GEMINI_M4A_LIVE_MODEL=gemini-3-flash-preview pnpm -C autobyteus-ts exec vitest run tests/integration/agent/gemini-read-media-file-m4a-live.test.ts`
4. Execute the existing provider-bound payload capture file from the prior API/E2E round:
   - `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/api/provider-native-request-payloads.test.ts`
5. Run `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` and `git diff --check`.
6. Update the canonical execution coverage report with Round 3 results.
7. If all checks pass and no repository-resident durable coverage is changed by API/E2E in this round, hand the cumulative package to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The stronger spoken `.m4a` live test and fixture are valid, already code-reviewed durable coverage. API/E2E will execute the reviewed coverage and update execution evidence; no further durable coverage edits are planned in this round.
