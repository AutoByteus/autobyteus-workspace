# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/tickets/done/rpa-visible-resume-prompt-cleanup/requirements.md`
- Investigation notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/tickets/done/rpa-visible-resume-prompt-cleanup/investigation-notes.md`
- Design spec: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/tickets/done/rpa-visible-resume-prompt-cleanup/design-spec.md`
- Design review report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/tickets/done/rpa-visible-resume-prompt-cleanup/design-review-report.md`

## What Changed

- Removed the legacy AutoByteus-provider first-turn system prompt prepend from `UserInputContextBuildingProcessor`.
  - The processor still resolves context files, builds readable context blocks, preserves sender headers, enforces workspace path safety, records processed context files, and flips `customData.is_first_user_turn` after the first turn.
  - Removed the now-dead provider lookup/imports from that processor because it no longer branches on AutoByteus provider for prompt composition.
- Replaced RPA server cache-miss visible prompt construction with neutral browser-visible input construction.
  - `PreparedConversationPayload.resume_prompt` is now `cache_miss_user_input`.
  - `build_resume_prompt(...)` is now `build_cache_miss_user_input(...)`.
  - Cache hit still sends only `current_message.content` plus current media to the existing browser-backed session.
  - Cache miss now flattens `messages[0:current_message_index + 1]` without visible resume/session/cache wording.
- Updated RPA cache-miss formatting behavior:
  - system role content is included only as an unlabeled preface;
  - no literal `System:` header is emitted;
  - `[system, current user]` first-call shape is exactly `<system>\n\n<current user>`;
  - `[current user]` first-call shape is exactly `<current user>`;
  - multi-turn reconstruction uses ordered `User:`, `Assistant:`, and `Tool:` blocks and ends with the current `User:` block;
  - already-rendered tool XML/result content is preserved as text and is not parsed or regenerated in Python.
- Updated RPA README request-contract notes to describe neutral cache-miss browser input instead of synthesized resume prompt wording.
- Added/updated tests for no AutoByteus system prepend, sender-header preservation, exact first-call cache-miss shapes, multi-turn role-header shape, tool-content preservation, cache-hit behavior, and negative visible-wrapper assertions.

## Key Files Or Areas

Superrepo task worktree: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup`

- `autobyteus-server-ts/src/agent-customization/processors/prompt/user-input-context-building-processor.ts`
- `autobyteus-server-ts/tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.ts`
- `autobyteus-server-ts/tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.js`

RPA task worktree: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup`

- `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_conversation_payload.py`
- `autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_service.py`
- `autobyteus_rpa_llm_server/tests/services/test_llm_service.py`
- `autobyteus_rpa_llm_server/README.md`

## Important Assumptions

- The fresh `rpa-visible-resume-prompt-cleanup` design package is authoritative.
- The prior `rpa-llm-session-resume` transcript contract is the base behavior: TypeScript still assembles/rendered transcript messages; the RPA server still owns cache hit/miss routing and flatten-only browser input construction.
- There is no generic hidden RPA system/developer channel available at the current `LLMUserMessage` boundary, so cache-miss continuity must be represented as neutral browser-visible text.
- Existing legacy messages that already embedded system prompt content are not deduplicated; this follows the clean-cut no-backward-compatibility direction.

## Known Risks

- A cache-miss multi-turn prompt is still a flattened single browser-visible user input; this cleanup removes implementation-specific wrapper text but does not make reconstructed context invisible.
- Existing in-progress runs created before this cleanup may still contain legacy first-user content with an embedded system prompt because this change does not rewrite stored transcript history.
- The server-ts package `pnpm run typecheck` currently fails due repository `tsconfig.json` including `tests` while `rootDir` is `src`; this appears unrelated to this patch and `pnpm run build` succeeds.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Removed provider branching from the server-ts prompt processor because it no longer owns AutoByteus browser prompt composition. Renamed RPA helper fields/functions away from `resume_prompt` terminology to cache-miss browser input terminology.

## Environment Or Dependency Notes

- Ran `pnpm install --frozen-lockfile` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup` to install ignored workspace dependencies for local server-ts checks. No lockfile/source changes resulted.
- `uv run --project autobyteus_rpa_llm_server ...` created an ignored RPA virtualenv. A generated untracked `autobyteus_rpa_llm/build/` directory from the RPA package build was removed after checks.
- Did not edit or reopen finalized `rpa-llm-session-resume` ticket artifacts.

## Local Implementation Checks Run

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code. The endpoint contract check below is a repo-resident request/response contract check and is not live browser/API-E2E sign-off.

- `pnpm exec vitest --run tests/unit/agent-customization/processors/prompt/user-input-context-building-processor.test.ts` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/autobyteus-server-ts` — passed, 12 tests.
- `pnpm run build` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/autobyteus-server-ts` — passed.
- `pnpm run typecheck` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup/autobyteus-server-ts` — failed with pre-existing-style `TS6059` rootDir errors because `tsconfig.json` includes `tests` while `rootDir` is `src`; no implementation-specific type error was reached before those project-config errors.
- `uv run --project autobyteus_rpa_llm_server pytest autobyteus_rpa_llm_server/tests/services/test_llm_service.py -q -k "cache_hit or cache_miss or materializes_current_media or model_mismatch or invalid_current_message_index"` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup` — passed, 9 tests / 4 deselected.
- `uv run --project autobyteus_rpa_llm_server pytest autobyteus_rpa_llm_server/tests/services/test_llm_service.py -q -k "not test_send_message and not test_stream_message and not test_send_message_with_image_generation"` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup` — passed, 9 tests / 4 deselected.
- `uv run --project autobyteus_rpa_llm_server pytest autobyteus_rpa_llm_server/tests/e2e/test_text_conversation_contract.py -q` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup` — passed, 4 tests.
- `uv run --project autobyteus_rpa_llm_server python -m py_compile autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_conversation_payload.py autobyteus_rpa_llm_server/autobyteus_rpa_llm_server/services/llm_service.py autobyteus_rpa_llm_server/tests/services/test_llm_service.py autobyteus_rpa_llm_server/tests/e2e/test_text_conversation_contract.py` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup` — passed.
- Production string guard in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-visible-resume-prompt-cleanup` and `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-visible-resume-prompt-cleanup` — passed; no obsolete visible resume wrapper strings or server-ts AutoByteus prepend provider logic remain in the changed production files.
- `git diff --check` in both task worktrees — passed.

## Downstream Validation Hints / Suggested Scenarios

- Verify a first AutoByteus/RPA turn from a team member no longer shows `You are continuing...`, remote browser/session wording, `Do not replay`, `Prior transcript:`, `Current user request:`, or a visible `System:` header.
- Verify a first call with a structured system message and current user message appears as `<system>\n\n<current user>`.
- Verify a first call with only the current user message appears as exactly that current user content.
- Verify a multi-turn cache miss starts with unlabeled system preface when present, then ordered `User:`, `Assistant:`, and `Tool:` blocks, ending with the final current `User:` block.
- Verify cache hit behavior remains current-message-only with current media only.
- Verify historical tool-call XML/result records remain unchanged as content and are not parsed/regenerated in the RPA server.

## API / E2E / Executable Validation Still Required

- Live RPA/browser-backed API/E2E validation remains required by `api_e2e_engineer` after code review.
- Validation should inspect browser-visible submitted text for first-turn and cache-miss multi-turn cases to confirm the visible wrapper/session wording and `System:` header are absent.
