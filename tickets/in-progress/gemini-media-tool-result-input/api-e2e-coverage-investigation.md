# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/in-progress/gemini-media-tool-result-input/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/in-progress/gemini-media-tool-result-input/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/in-progress/gemini-media-tool-result-input/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/in-progress/gemini-media-tool-result-input/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/in-progress/gemini-media-tool-result-input/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/gemini-media-tool-result-input/tickets/in-progress/gemini-media-tool-result-input/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Round 3 code review pass after user feedback added an env-gated live direct-Gemini `.m4a` integration test and synthetic `.m4a` fixture; API/E2E must refresh coverage investigation/execution before delivery resumes.
- Prior Investigation Reviewed: Yes — prior round 1 investigation in this same file had routed coverage-code changes to code review after provider-bound payload coverage was added.
- Latest Authoritative Investigation: Round 2, this file.

### Investigation Round History

| Round | Trigger | Key Decision | Repository-Resident Durable Coverage Plan | Latest Authoritative |
| --- | --- | --- | --- | --- |
| 1 | Code review pass for revised direct Gemini `.m4a` implementation; no durable live test existed yet. | Existing classifier/formatter/renderer/continuation coverage was valid, but provider-bound `GeminiLLM.generateContent` request-shape coverage was missing. | Add/update `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` with `.m4a` `inlineData` capture. | No |
| 2 | Round 3 code review pass after env-gated live direct-Gemini `.m4a` integration test and fixture were added/reviewed. | The new live test, fixture, strengthened continuation test, and existing provider-bound payload test are valid coverage for the current requirements. No additional durable coverage edit is needed in this API/E2E round. | No durable coverage add/update/remove by API/E2E in round 2; execute the reviewed coverage, including default-skip and live-enabled modes. | Yes |

## Current Requirement And Design Basis

The approved requirement remains the direct Gemini path, not RPA, server token usage, GraphQL, frontend Token Meter, or token-count heuristic work. A `read_media_file` result for a local `.m4a` must hydrate as an audio `ContextFile`, continue into the same-turn LLM request as `LLMUserMessage.audio_urls`, render for direct Gemini as `inlineData` with `mimeType: 'audio/mp4'`, and not silently degrade to text-only if declared media conversion fails. Media extension policy must remain centralized in the shared classifier.

The updated implementation handoff's Legacy / Compatibility Removal Check is clean: no backward-compatibility mechanism was introduced, no old silent text-only behavior is retained, dead/obsolete duplicate media policy was removed, and the new env-gated live test is disabled by default unless `AUTOBYTEUS_RUN_GEMINI_M4A_LIVE=1` with Gemini/Vertex credentials.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Shared image/audio/video extension classifier including `.m4a -> audio` | Added, preserved from prior implementation | Requirements FR-002/AC-001; design DS-002; implementation handoff | Keep unit classifier coverage. |
| `ContextFileType.fromPath()` delegates media classification to shared classifier | Changed, preserved from prior implementation | Requirements FR-003/AC-002 | Keep context-file type coverage. |
| `media-payload-formatter.isValidMediaPath()` accepts existing `.m4a` local files via shared classifier | Changed, preserved from prior implementation | Requirements FR-004/AC-003 | Keep formatter coverage for `.m4a` valid path, base64, and MIME. |
| Direct `GeminiPromptRenderer` renders local `.m4a` audio as `inlineData` and fails declared-media conversion explicitly | Changed, preserved from prior implementation | Requirements FR-005/FR-006/AC-004/AC-005 | Keep renderer coverage and continuation-render coverage. |
| `read_media_file` continuation carries `.m4a` to `audio_urls` and now renders assembled request through `GeminiPromptRenderer` | Changed after prior API/E2E round | Updated implementation handoff; code review Round 3 scope | Execute strengthened integration test; decision `Still Valid`. |
| Env-gated live direct-Gemini `.m4a` flow from `ReadMediaFile` through live `GeminiLLM` | Added after prior API/E2E round | Updated implementation handoff; code review Round 3; user feedback requested live test | Execute both default-skip suite and `AUTOBYTEUS_RUN_GEMINI_M4A_LIVE=1` live test. Treat credential dependence as intended skip/gate behavior, not a failure. |
| Small synthetic `.m4a` fixture `tests/data/test_audio.m4a` | Added after prior API/E2E round | Updated implementation handoff; code review Round 3 notes fixture is 15,366 bytes/non-private | Retain as valid durable fixture; no private user audio. |
| Provider-bound `GeminiLLM.generateContent` request-shape capture for `.m4a` | Added in prior API/E2E round, reviewed by code reviewer | Prior coverage report; code review Round 2/3 history | Keep valid; run with focused suite if needed, but current refreshed command from code review excludes it because the new live agent integration covers provider-bound live behavior. |
| RPA/server/web/token-meter/token-usage-summary code | Out of scope / removed from revised scope | Requirements Out of Scope; design review; implementation handoff | No API/E2E coverage changes. Delivery docs/artifacts from prior pass are stale and must be refreshed by delivery after API/E2E passes. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/utils/media-file-kind.test.ts` | Shared classifier exports one complete media extension set, classifies `.m4a` as audio, handles URL/query/case extraction, rejects non-media. | FR-002, AC-001, DS-002 | Still Valid | Reviewed in prior investigation and re-confirmed in updated handoff/code review. | Run in default focused suite. |
| `autobyteus-ts/tests/unit/agent/message/context-file-type.test.ts` | `ContextFileType.fromPath()` returns `AUDIO` for `.m4a` and maps supported media URLs via classifier. | FR-003, AC-002 | Still Valid | Still directly validates delegated media classification boundary. | Run in default focused suite. |
| `autobyteus-ts/tests/unit/llm/utils/media-payload-formatter.test.ts` | Existing local `.m4a` validates, converts to base64, and resolves MIME as `audio/mp4`; existing media behavior remains covered. | FR-004, AC-003, AC-007 | Still Valid | Still validates formatter owner and `.m4a` conversion. | Run in default focused suite. |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts` | Local `.m4a` audio renders as text + Gemini `inlineData`; missing declared `.m4a` throws. | FR-005, FR-006, AC-004, AC-005, AC-008 | Still Valid | Still protects direct renderer bug and explicit failure behavior. | Run in default focused suite. |
| `autobyteus-ts/tests/integration/agent/read-media-file-continuation-flow.test.ts` | `read_media_file` returns `.m4a` audio context, uses `append_user_message`, final request has `.m4a` in `audio_urls`, and rendered Gemini payload contains `.m4a` audio `inlineData` plus video `inlineData`. | FR-001, FR-005, AC-004, AC-006, DS-001 | Still Valid | Inspected updated file; strengthened rendering assertion is current behavior and not stale. | Run in default focused suite. |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` / `.m4a` request capture | Stubbed `GeminiLLM.sendMessages()` sends local `.m4a` as provider-bound `inlineData` to `generateContent`. | FR-005, AC-004, AC-008 | Still Valid | Added in prior API/E2E round, reviewed and passed code review; remains useful non-live adapter proof. | Retain. Not the main delta for this refresh; no update needed. |
| `autobyteus-ts/tests/integration/agent/gemini-read-media-file-m4a-live.test.ts` | Env-gated live test: copies synthetic `.m4a` fixture, executes `ReadMediaFile -> ToolResultContinuationBuilder -> AgentInputPipeline -> LLMRequestAssembler/GeminiPromptRenderer`, asserts `inlineData` exact base64/MIME, then sends the `.m4a` via `GeminiLLM` and receives a `CompleteResponse`. | FR-001, FR-005, AC-004, AC-006, AC-008, UC-001 | Still Valid | Inspected file; env gate is explicit and correct. It covers provider acceptance / response object, not transcription quality/token accounting, which are out of scope. | Run default-skip mode and live-enabled mode. |
| `autobyteus-ts/tests/data/test_audio.m4a` | Small synthetic/non-private `.m4a` fixture used by env-gated live test. | AC-008; implementation environment notes | Still Valid | Inspected fixture: 15,366 bytes; `file` identifies ISO Media / Apple iTunes ALAC/AAC-LC `.M4A`; no private user audio path. | Retain; no execution action beyond live test use. |
| `autobyteus-ts/tests/integration/llm/api/gemini-llm.test.ts` existing live multimodal tests | Existing credential-dependent Gemini LLM liveness, including `.mp3` audio. | Existing provider liveness; residual provider risk | Still Valid | Not the direct `read_media_file -> .m4a -> Gemini` scenario; remains valid but not central to refreshed execution. | No change. |
| Superseded RPA/server/web/token-meter tests or artifacts | Previously considered broad scope. | Out of scope in revised requirements/design. | Out Of Scope | Current code review confirms no such code is included. | No action. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None | N/A | No relevant existing durable coverage asserts intentionally removed silent text-only fallback or superseded RPA/token-meter behavior. | Code review Round 3 found no stale/obsolete coverage. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None in this API/E2E round | N/A | Existing reviewed durable live coverage now covers the gap. | N/A | No additional durable coverage edit is needed before execution. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None in this API/E2E round | N/A | N/A | N/A | New live coverage was already implemented and code-reviewed before this API/E2E refresh. |

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
| Transcription accuracy or semantic content quality from the `.m4a` fixture | Out of scope; requirements require media reaches direct Gemini as audio, not transcript quality. | Provider may return terse/empty content while still accepting media. | Separate model-output-quality follow-up only if user requests it. |
| Token Meter / token accounting correctness | Requirements explicitly defer usage/reporting unless media is confirmed sent and token metadata remains misleading. | Usage metadata may not represent audio cost/detail as expected. | Separate token/reporting follow-up if needed. |
| Credential availability in all environments | Live test is intentionally env-gated and skipped by default. | CI/dev environments without Gemini/Vertex credentials will skip live test. | Document/hand off env gate; delivery decides docs impact. |
| Every classifier-supported extension against live Gemini | Scope is `.m4a`; provider-specific support for other extensions remains a separate concern. | Other extensions may be rejected by provider. | Explicit provider failure is acceptable; open follow-up only if observed. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before execution | N/A | Upstream requirements/design and code review are explicit; implementation legacy check is clean. | N/A |

## Execution Plan

1. Execute the reviewed default focused suite with the live test present but skipped by default:
   - `pnpm -C autobyteus-ts exec vitest run tests/unit/utils/media-file-kind.test.ts tests/unit/agent/message/context-file-type.test.ts tests/unit/llm/utils/media-payload-formatter.test.ts tests/unit/llm/prompt-renderers/gemini-prompt-renderer.test.ts tests/integration/agent/read-media-file-continuation-flow.test.ts tests/integration/agent/gemini-read-media-file-m4a-live.test.ts`
2. Execute the env-gated live direct-Gemini `.m4a` integration test:
   - `AUTOBYTEUS_RUN_GEMINI_M4A_LIVE=1 pnpm -C autobyteus-ts exec vitest run tests/integration/agent/gemini-read-media-file-m4a-live.test.ts`
3. Execute the existing provider-bound payload capture file from the prior API/E2E round to ensure it remains green with the updated tree:
   - `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/api/provider-native-request-payloads.test.ts`
4. Run `pnpm -C autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` and `git diff --check`.
5. Update the canonical execution coverage report with Round 2 results.
6. If all checks pass and no repository-resident durable coverage is changed by API/E2E in this round, hand the cumulative package to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The new env-gated live test and fixture are valid, already code-reviewed durable coverage. API/E2E will execute the reviewed coverage and update execution evidence; no further durable coverage edits are planned in this round.
