# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/tickets/done/rpa-llm-session-resume/requirements.md`
- Investigation Notes: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/tickets/done/rpa-llm-session-resume/investigation-notes.md`
- Design Spec: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/tickets/done/rpa-llm-session-resume/design-spec.md`
- Design Review Report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/tickets/done/rpa-llm-session-resume/design-review-report.md`
- Implementation Handoff: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/tickets/done/rpa-llm-session-resume/implementation-handoff.md`
- Review Report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/tickets/done/rpa-llm-session-resume/review-report.md`
- Current Validation Round: API/E2E refresh after Round-10 code review pass
- Trigger: Round-10 code reviewer handoff requested validation refresh for round-5 explicit logical identity plus round-4 request/tool/resume behavior.
- Prior Round Reviewed: Prior API/E2E report existed but was stale where superseded by round 5.
- Latest Authoritative Round: This report.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Prior | Earlier API/E2E before round-5 identity and CR-003 cleanup | N/A | Stale after later implementation/review rounds | Superseded | No | Kept only as historical context. |
| Current | Round-10 code review pass | Stale live/browser evidence, prior generated Chrome profile artifact concern, stream/client request-shape concern | No blocking failures | Pass | Yes | Deterministic and live browser-backed checks passed with logged-in Chrome profile. |

## Validation Basis

Coverage was derived from the approved requirements/design and the Round-10 review-passed package. The key validated behaviors were:

- explicit caller-supplied logical conversation id with no generated fallback UUID;
- agent/TypeScript path uses that identity as RPA `conversation_id`;
- TypeScript renders prior tool calls/results into content before transport;
- RPA HTTP request shape is `conversation_id`, `model_name`, `messages`, and `current_message_index` only;
- cache miss sends one chronological flattened resume prompt ending in the final current `User:` block;
- cache hit sends only the current user message to the cached browser-backed RPA LLM;
- model mismatch is rejected deterministically;
- stale `user_message` and `tool_payload` request bodies are rejected;
- cleanup removes live RPA sessions actually used.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Validation Surfaces / Modes

- TypeScript unit and build validation in `autobyteus-ts`.
- Python RPA service and endpoint contract validation in `autobyteus_rpa_llm_server`.
- Direct live RPA HTTP validation against `/send-message`, `/stream-message`, and `/cleanup` using a real browser-backed `gemini-3-pro-app-rpa` session.
- Live TypeScript `AutobyteusLLM` -> `AutobyteusClient` -> RPA server -> browser-backed Gemini path validation.
- Runtime process/profile checks to ensure the generated task-worktree Chrome profile artifact remains absent.

## Platform / Runtime Targets

- OS/runtime: Linux workstation, local worktrees under `/home/ryan-ai/SSD/autobyteus_org_workspace`.
- Autobyteus backend: `http://localhost:8000`, PID `729713`, data dir `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/.local/product-ui-server-data`.
- Product UI: `http://localhost:3000`, PID `651574`.
- RPA server: `http://127.0.0.1:51738`, PID `728972`.
- RPA Chrome profile: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace/autobyteus_rpa_llm/.chrome-user-data-test` with `CHROME_PROFILE_DIRECTORY=Profile 1`.
- Backend RPA host/env: `AUTOBYTEUS_LLM_SERVER_HOSTS=http://127.0.0.1:51738`; `AUTOBYTEUS_STREAM_PARSER=xml`.

## Lifecycle / Upgrade / Restart / Migration Checks

- Backend server was restarted with the same persisted data dir and verified healthy on `/rest/health`.
- RPA server was restarted with the original logged-in Chrome profile from the existing RPA workspace, not with a generated profile inside the task worktree.
- The generated task-worktree Chrome profile path `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-llm-session-resume/autobyteus_rpa_llm_server/llm_server_chrome_profile_product_ui` was verified absent, and no process referenced it after validation.
- Because RPA was restarted to correct profile use, pre-existing RPA in-memory sessions were intentionally cleared; live validation created fresh test conversations and then verified cache miss followed by cache hit within each fresh conversation.

## Coverage Matrix

| Scenario | Requirement / AC | Mode | Result | Evidence |
| --- | --- | --- | --- | --- |
| V-001 explicit logical id and no fallback UUID | FR-001, FR-009, AC-001, AC-007 | TS unit + grep + live TS | Pass | Unit tests passed; grep found no `randomUUID`/`fallbackConversationId`; live TS call used `logicalConversationId=api-e2e-ts-round10-d2db786ae82a`. |
| V-002 TypeScript transcript and tool rendering | FR-002, FR-006, AC-002, AC-009 | TS unit + live TS | Pass | Prompt renderer tests passed; live TS response included rendered historical tool context result `TOOL=call-ts-round10`. |
| V-003 RPA cache miss chronological resume | FR-005, FR-006, AC-004 | Python unit + prompt guard + live browser | Pass | Prompt guard showed ordered role blocks ending with final `User:`; live non-stream miss returned `ALPHA=R10-ADDB6A65; TOOL=call-round10`; live stream miss returned `BETA=R10S-6121216F; TOOL=call-stream-round10`. |
| V-004 RPA cache hit current-message-only continuation | FR-004, AC-003 | Python unit + live browser | Pass | Service tests passed; live non-stream hit returned `ALPHA=R10-ADDB6A65`; live stream hit returned `BETA=R10S-6121216F`; live TS hit returned `GAMMA=R10TS-32F41EA8`. |
| V-005 model mismatch rejection | FR-007, AC-006 | Python unit + live HTTP | Pass | Live mismatch on `api-e2e-round10-2955f4abac69` returned HTTP 400 with active/requested model names. |
| V-006 old request shape rejection | FR-009 | Endpoint tests + live HTTP | Pass | Live `user_message` body returned HTTP 422; live `tool_payload` message body returned HTTP 422; stream stale `user_message` returned HTTP 422. |
| V-007 cleanup | FR-008 | TS unit + live HTTP | Pass | Live `/cleanup` returned 200 for non-stream and stream conversations; TS live `llm.cleanup()` completed. |
| V-008 generated Chrome profile artifact cleanup | CR-003 | Process/filesystem check | Pass | Generated task profile absent and no process references it. |

## Test Scope

### Deterministic repository checks

- `pnpm exec vitest --run tests/unit/llm/prompt-renderers/autobyteus-prompt-renderer.test.ts tests/unit/clients/autobyteus-client.test.ts tests/unit/llm/api/autobyteus-llm.test.ts tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/autobyteus-ts` — passed, 27 tests.
- `pnpm run build` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/autobyteus-ts` — passed, `[verify:runtime-deps] OK`.
- `uv run --project autobyteus_rpa_llm_server pytest autobyteus_rpa_llm_server/tests/services/test_llm_service.py -q -k "cache_hit or cache_miss or materializes_current_media or model_mismatch or invalid_current_message_index"` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-llm-session-resume` — passed, 7 tests / 4 deselected.
- `uv run --project autobyteus_rpa_llm_server pytest autobyteus_rpa_llm_server/tests/e2e/test_text_conversation_contract.py -q` in `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-llm-session-resume` — passed, 4 tests.
- RPA py_compile for changed source/tests — passed.
- Fallback identity grep guard — passed: no `randomUUID` or `fallbackConversationId` in `autobyteus-ts/src/llm/api/autobyteus-llm.ts`.
- Stale HTTP DTO grep guard — passed: no `tool_payload` or `user_message` in TS DTO/client or RPA schema files.
- Direct prompt guard — passed: no `Prior transcript:` / `Current user request:` headings, preserves chronological role headers, and ends with final current `User:` block.
- `git diff --check` — passed in both worktrees.

### Live browser-backed checks

- Non-stream direct RPA HTTP, model `gemini-3-pro-app-rpa`, conversation `api-e2e-round10-2955f4abac69`:
  - cache miss `/send-message`: HTTP 200, 11.5s, response `ALPHA=R10-ADDB6A65; TOOL=call-round10`.
  - cache hit `/send-message`: HTTP 200, 7.6s, response `ALPHA=R10-ADDB6A65`.
  - model mismatch on same conversation with `gpt-5-instant-rpa`: HTTP 400 with deterministic mismatch detail.
  - cleanup: HTTP 200.
- Streaming direct RPA HTTP, model `gemini-3-pro-app-rpa`, conversation `api-e2e-stream-round10-65dae988fd0e`:
  - cache miss `/stream-message`: HTTP 200, 9.8s, content `BETA=R10S-6121216F; TOOL=call-stream-round10`.
  - cache hit `/stream-message`: HTTP 200, 7.4s, content `BETA=R10S-6121216F`.
  - cleanup: HTTP 200.
- Live TypeScript `AutobyteusLLM` path, model `gemini-3-pro-app-rpa`, conversation `api-e2e-ts-round10-d2db786ae82a`:
  - cache miss through TS renderer/client: response `GAMMA=R10TS-32F41EA8; TOOL=call-ts-round10`.
  - cache hit through TS renderer/client: response `GAMMA=R10TS-32F41EA8`.
  - `llm.cleanup()` completed.
- Live schema probes:
  - `/send-message` with stale `user_message`: HTTP 422.
  - `/send-message` with message-level stale `tool_payload`: HTTP 422.
  - `/stream-message` with stale `user_message`: HTTP 422.

## Validation Setup / Environment

- RPA server started from `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace-rpa-llm-session-resume/autobyteus_rpa_llm_server` with:
  - `CHROME_USER_DATA_DIR=/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus_rpa_llm_workspace/autobyteus_rpa_llm/.chrome-user-data-test`
  - `CHROME_PROFILE_DIRECTORY=Profile 1`
  - `CHROME_REMOTE_DEBUGGING_PORT=9344`
  - `SERVER_BASE_URL=http://127.0.0.1:51738`
  - `uv run python -m autobyteus_rpa_llm_server.app --port 51738 --no-https`
- Backend server started from `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume` with the same task data dir and explicit Prisma engine overrides; environment included `AUTOBYTEUS_STREAM_PARSER=xml` and `AUTOBYTEUS_LLM_SERVER_HOSTS=http://127.0.0.1:51738`.
- Product UI remained available at `http://localhost:3000`.

## Tests Implemented Or Updated

No repository-resident tests were added or updated by this API/E2E validation round. Existing round-5 durable validation was executed.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: N/A
- If `Yes`, returned through `code_reviewer` before delivery: N/A
- Post-validation code review artifact: N/A

## Other Validation Artifacts

- This report: `/home/ryan-ai/SSD/autobyteus_org_workspace/autobyteus-workspace-superrepo-rpa-llm-session-resume/tickets/done/rpa-llm-session-resume/api-e2e-validation-report.md`

## Temporary Validation Methods / Scaffolding

Temporary scripts were created under `/tmp` only and not added to either repository:

- `/tmp/live_rpa_validation.py`
- `/tmp/live_rpa_stream_validation.py`
- `/tmp/live_ts_autobyteus_llm_validation.mjs`

They were used to exercise live RPA HTTP and live TypeScript paths and then left outside the repo.

## Dependencies Mocked Or Emulated

- Deterministic unit/service tests mock lower-level dependencies as designed by their test suites.
- Live browser-backed checks did not mock the RPA/provider path; they used the running RPA server, logged-in Chrome profile, and Gemini browser UI.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| Prior live attempts | Browser/provider UI timed out or hit login/onboarding path | Environment/setup issue, not implementation issue | Resolved after restarting RPA with the original logged-in Chrome profile | Live non-stream, stream, and TS browser-backed checks passed | The RPA in-memory cache was cleared by the restart, so validation used fresh conversations. |
| CR-003 | Generated Chrome profile artifact in RPA task worktree | Review cleanup issue | Resolved | Generated task profile absent and no process references it | Current RPA uses the original logged-in profile outside the task worktree. |
| Stale API/E2E evidence after round 5 | Prior validation did not cover required explicit `logicalConversationId` contract | Stale validation | Resolved | TS unit, grep, and live TS validation all use explicit `logicalConversationId` | No fallback UUID path observed. |

## Scenarios Checked

See Coverage Matrix and Test Scope above.

## Passed

All current validation scenarios passed.

## Failed

None in the current authoritative validation round.

## Not Tested / Out Of Scope

- Persistence of RPA browser/provider sessions across an RPA server restart remains out of scope by the requirements.
- Full product-UI article-writing-team manual UX flow was not newly automated in this report; the live backend/RPA/browser boundaries and live TypeScript LLM path were exercised directly.

## Blocked

None.

## Cleanup Performed

- Cleaned up live RPA conversations used by direct HTTP validation.
- `llm.cleanup()` cleaned up the live TypeScript `AutobyteusLLM` conversation.
- Verified generated task-worktree Chrome profile path remains absent.
- Verified no process references the generated task-worktree Chrome profile path.

## Classification

N/A — validation passed.

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

- Live non-stream cache-miss/hit demonstrated the intended distinction:
  - cache miss used the flattened chronological transcript and recovered prior tool/result context;
  - cache hit used the existing browser conversation and recovered the prior ALPHA token from the active session using only the current message.
- Live stream path demonstrated the same distinction with `/stream-message`.
- Live TypeScript path demonstrated that the TS renderer/client/LLM path sends the new request object with explicit logical identity to the RPA server and works against the browser-backed provider.
- The backend stream parser is `xml`, verified from the running backend process environment.

## Latest Authoritative Result

- Result: `Pass`
- Notes: Round-5 explicit logical identity and round-4 request/tool/resume behavior are validated by deterministic tests plus live browser-backed non-stream, stream, and TypeScript client paths. No repository-resident durable validation was added or updated in API/E2E, so the task is ready for delivery/docs sync.
