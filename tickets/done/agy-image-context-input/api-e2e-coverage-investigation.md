# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/requirements-doc.md` (SR-001, approved 2026-10-08)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/design-spec.md` (SR-002)
- Supplemental Task Artifacts: `probe-evidence/` (evidence only), `solution-handoff.md`, `implementation-evidence/agy-image-input-live.json`
- Design Review Report: `N/A — not applicable` (direct low-risk route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input/tickets/in-progress/agy-image-context-input/implementation-revision-record.md` (IR-001)
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (same folder)
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md` (same folder)
- Current Investigation Round: 1
- Trigger: Implementation complete (IR-001), direct route, from `/software_engineering_team/implementation_engineer`
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

AGY (Antigravity CLI) input is text-only. The AGY backend now turns each `AgentInputUserMessage` into one text string via `buildAgyUserMessageText`: typed text; `Attached images (open each with view_file to see it):` + absolute local image paths; `Attached image URL: <url>` lines; a data-URL note; `Context file: <uri>` lines for non-local non-images; the shared `Reference files:` section for local non-images. Messages without context files are sent unchanged. Must prove: REQ-001..REQ-006 / AC-001..AC-008, through the real attach path (upload → finalize → `SEND_MESSAGE` locators → stream handler → AgentRun normalizer → AGY backend → AGY stdin) for standalone runs and AGY team members, plus a real-model check that the agent actually opens and sees the image (AC-006).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003, SCN-004, SCN-005 (regression suites), SCN-006 (remote URL half).
- Real-use scenarios added from investigating the implemented behavior:
  - RU-001 Attach-only send (image, empty text) through the app WebSocket — real composer action (REQ-004).
  - RU-002 Pasted absolute local image path (composer `onPaste` text locator, outside the workspace) sent as an image locator — the normalizer passes it through unchanged; must still be listed as an image path.
  - RU-003 Mixed send in one message (uploaded image + `.txt` + `.pdf`) — the ordinary multi-attach composer action; verifies section order and that non-images are not listed as images.
  - RU-004 Plain text message after attachments in the same run (no context files) — text must reach AGY byte-identical (BEH-004 support, no attachment carry-over between turns).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: inline `data:` URL image via the UI (SCN-006 data-URL half). Covered defensively by unit test AC-004 only; not tested end to end.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 standalone image → AGY text with explicit image section | Changed | REQ-001/003/004, design DS-001 | Server E2E through real upload/finalize/WS + live model run |
| BEH-002 non-image → `Reference files:` | Changed | REQ-002 | Server E2E (exact text + file readable by path) |
| BEH-003 AGY team member | Changed (same backend) | REQ-001/002, DS-002 | Server E2E through team WS + live team-member model run |
| BEH-004 delegated `reference_files` text | Preserved | REQ-006/AC-007 | Existing server E2E `project-task-context-files-delegation.e2e.test.ts` + RU-004 |
| BEH-005 Claude/Codex/native/ACP inline | Preserved | AC-008 | Existing unit suites (unchanged backends) |
| BEH-006 remote URL named, data URL noted | Changed | REQ-005/AC-004 | Server E2E remote URL; data URL unit only |
| Displayed/stored user message | Preserved | REQ-006 | Server E2E: run projection still shows typed text only |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `buildAgyUserMessageText`, `AgyAgentRunBackend.dispatchUserInput` | Unit tests (builder, lifecycle FakeProcess) | Real locator resolution (`/rest/runs/...`) before the backend | Server E2E |
| API / transport / contract | Yes (indirect) | WS `SEND_MESSAGE` → stream handlers → AgentRun normalizer → AGY stdin | None for AGY context files | Upload/finalize/locator normalization for standalone and team member | Server E2E, fake AGY CLI |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No (no UI change) | — | — | Composer already produces the locators exercised server-side | None |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | No | — | — | — | — |
| Persisted-data transition | No (`Not Affected`) | — | — | Stored message unchanged — checked in E2E | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | AGY CLI 1.3.1 stdin text + native `view_file` with real model | Implementation live test (backend+process, no server) | Real server path + team member with real model | Live AGY E2E |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-image-context-input` (branch `codex/agy-image-context-input`)
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL/WebSocket server (`autobyteus-server-ts`), Vitest.
- Project testing guideline path(s): `TESTING.md` (root). No closer `TESTING*.md` under `autobyteus-server-ts`.
- Conflicting, missing, or unclear project instructions: `pnpm -C autobyteus-server-ts typecheck` fails at base with TS6059 (pre-existing, recorded by implementation).
- Required environment variables or secrets available: `Yes` — installed `agy` 1.3.1 at `/Users/normy/.local/bin/agy`, logged in (implementation live run succeeded today). No secrets stored in the repo.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` rows "AGY runtime E2E, fake CLI" / "AGY runtime live E2E" | Layer selection | Fake CLI: `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/<file> --no-watch`; live: one gate variable per file, leave `ANTIGRAVITY_CLI_COMMAND` unset |
| `TESTING.md` "Antigravity Native Argument Capture Regression" | Fake-CLI scope | Fake CLI does not prove installed-provider behavior → live run needed for AC-006 |
| `autobyteus-server-ts/AGENTS.md` | Test commands | `vitest run … --no-watch` |
| `tests/e2e/helpers/studio-runtime-test-server.ts`, `context-file-process-fixture.ts` | Real in-process Studio server; upload/finalize helpers pattern | `startStudioE2eRuntimeServer()`, `POST /rest/context-files/upload` (draft owner), `POST /rest/context-files/finalize` |
| `autobyteus-web/stores/agentRunStore.ts`, `agentTeamRunStore.ts`, `utils/contextFiles/contextAttachmentSend.ts` | Real client flow | upload as draft → finalize to `agent_final` / `team_member_final` → send images as `image_urls`, others as `context_file_paths` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Studio server (in-process) | `autobyteus-server-ts` | `startStudioE2eRuntimeServer()` in the test | Test-owned temp app-data dir, random port | GraphQL responds | `app.close()`, temp dir removed |
| Fake AGY CLI | same | `ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`, `AGY_FAKE_CASE=context_files` | No model call | `init` event | Run termination |
| Real `agy` CLI | same | `ANTIGRAVITY_CLI_COMMAND` unset, gated live file | Uses AGY quota, `gemini-3.8-flash-low` | AGY `init` | Run termination; temp dirs removed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent / team definitions | GraphQL `createAgentDefinition` / `createAgentTeamDefinition` in a temp app-data dir | Never touches user data `~/.autobyteus` | Deleted in `afterAll`, temp dir removed |
| Attachments (PNG, .txt, .pdf) | Generated bytes, uploaded through the real REST route | Temp dirs only | Removed with temp dir |
| Real AGY login | User's installed `agy` | Not modified; capsule per run | AGY conversations remain in the user's AGY brain (normal for live runs) |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`. Evidence planned: run projection after the E2E sends still shows the typed text (no injected path text) — proves the stored user message is unchanged.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/.../antigravity/agy-user-message-text.test.ts` (new, IR-001) | Builder text for AC-001..AC-004, dedupe, ordering, unchanged content | AC-001..AC-004, AC-007 | Still Valid | Assertions match design rules and exact heading strings | Run |
| `tests/unit/.../antigravity/agy-turn-lifecycle.test.ts` (extended) | Backend sends built text; image-only non-empty | AC-003, AC-005 | Still Valid | — | Run |
| `tests/unit/.../antigravity/agy-image-input-live.test.ts` (new, `AGY_LIVE=1`) | Real agy opens PNG/.txt via `view_file` | AC-006 (backend+process only) | Still Valid | Bypasses server/normalizer | Re-run once |
| `tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts` | Delegated AGY worker gets `Reference files:` text and reads each file | AC-007 / BEH-004 | Still Valid | Exercises changed backend with `contextFiles=null` | Run (fake CLI) |
| `tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts`, `agy-team-inter-agent-roundtrip.e2e.test.ts` | Echo/roundtrip text through AGY backend | Regression of text-only sends | Still Valid | — | Run (fake CLI) |
| Codex/Claude/ACP input tests, normalizer test | Inline images / reference sections | AC-008 | Still Valid | Unchanged source | Run |
| `tests/unit/.../antigravity/agy-failure-cli-routing.test.ts` | Fake CLI routes coexist | Fixture integrity | Needs Update | New `context_files` fake case added | Add one routing case |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| E2E-CF-001 | Standalone: uploaded image + .txt + .pdf → exact AGY stdin text with resolved absolute paths; files readable by path; text-only; stored message unchanged | REQ-001/002/003/006, AC-001/002/005, SCN-001/002, RU-003 | `tests/e2e/runtime/agy-context-files-transport.e2e.test.ts` | No server-level coverage of locator → normalizer → AGY text |
| E2E-CF-002 | Attach-only image send | REQ-004/AC-003, RU-001 | same | End-to-end non-empty input |
| E2E-CF-003 | Remote https image URL + pasted absolute local image path | REQ-005/AC-004, SCN-006, RU-002 | same | Non-uploaded locators through normalizer |
| E2E-CF-004 | Plain text after attachments is unchanged | REQ-006, BEH-004, RU-004 | same | No carry-over / unchanged content-only path |
| E2E-CF-005 | AGY team member: uploaded image + .txt via team draft → finalize → team WS | REQ-001/002, SCN-003, BEH-003 | same | Team path not covered anywhere |
| LIVE-CF-001 | Real agy through real server, standalone: uploaded red PNG, attach-only → agent `view_file`s it and answers "red" | AC-006, SCN-001 | `tests/e2e/runtime/agy-context-files-live.e2e.test.ts` (`RUN_AGY_CONTEXT_FILES_E2E=1`) | Fake CLI cannot prove real vision |
| LIVE-CF-002 | Same for an AGY team member, with an uploaded .txt as well | AC-006, SCN-003 | same | Team-member live half missing |
| FX-001 | Fake CLI `context_files` case | Fixture | `tests/fixtures/agy-failure-cli.mjs`; routing test case | Records raw stdin and opens listed paths like `view_file` |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| FX-001 | `tests/unit/.../antigravity/agy-failure-cli-routing.test.ts` | Add `context_files` route case | Fixture integrity | — |
| DOC-001 | `TESTING.md` AGY rows | Name the new fake-CLI and live files/gate | Guideline currency | — |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

See execution coverage report for results.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/antigravity --no-watch` | worktree root | Builder, backend, fixture routing | Planned | report |
| 2 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… vitest run tests/e2e/runtime/agy-context-files-transport.e2e.test.ts` | fake CLI | E2E-CF-001..005 | Planned | report |
| 3 | same gate: `tests/e2e/projects/project-task-context-files-delegation.e2e.test.ts tests/e2e/runtime/agy-interrupt-resend-transport.e2e.test.ts tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts` | fake CLI | AC-007 and text-only regressions | Planned | report |
| 4 | `vitest run tests/unit/agent-execution tests/unit/agent-team-execution` | — | AC-008 and broad regression | Planned | report |
| 5 | `vitest run tests/integration/api/rest/context-files.integration.test.ts tests/integration/agent-memory/user-attachment-history.integration.test.ts` | — | Upload/history untouched | Planned | report |
| 6 | `RUN_AGY_CONTEXT_FILES_E2E=1 vitest run tests/e2e/runtime/agy-context-files-live.e2e.test.ts` | real agy | LIVE-CF-001/002 | Planned | report |
| 7 | `AGY_LIVE=1 vitest run …/agy-image-input-live.test.ts` | real agy | Implementation live test re-run | Planned | report |

## Test-Case Ledger Decision

- Ledger required: `Yes` — several independent server E2E cases plus long-running live model cases.
- Canonical ledger path: `tickets/in-progress/agy-image-context-input/api-e2e-test-case-ledger.md`

## Broader Validation Decision (Mandatory)

- Decision: `Required` (planned up front): unit tests bypass the real locator/normalizer/team path and the real model.
- Selected execution mode: `Live API` (real server + real `agy` CLI) after the deterministic server E2E.
- Browser-specific decision: Not required — no frontend change; the composer's locator production is unchanged and reproduced at the WS boundary with the same upload/finalize/send calls the stores make. Final desktop-app check stays as the requirement's explicit user verification (delivery).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Data-URL image end to end | Contrived via UI (requirements) | None for supported use | Unit AC-004 only |
| Claude-in-AGY model live | Account quota (investigation) — re-check at execution | Model may not open image | Record result |
| Desktop app rendering of the `view_file` step | No UI change; user verification owned by delivery | Low | Delivery user verification |

## Post-Execution Confidence (summary; full scorecard in the execution coverage report)

- Post-repository: 87%. Final, after the live run: 84%.
- Critical acceptance criterion not met: REQ-004 / AC-003 end to end (E2E-CF-002).

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| An attach-only send (empty text plus an image) is rejected by the generic AgentRun admission (`agent-run-input-admission-state.ts:87-93`, `RUNTIME_REJECTED` "AgentRun input content must be a non-empty string.") before the AGY backend. The standalone composer enables Send for attachments-only drafts and sends `content: ""`. Approved REQ-004 (Must) and SCN-001 "with or without text" can't be met inside the AGY-only scope guardrail. | `Requirement Gap` | E2E-CF-002, `api-e2e-evidence/e2e-cf-transport.log` | Solution Designer |

## Round 2 Update (SR-004 / IR-002, 2026-10-09)

- Trigger: implementation_engineer IR-002 (commit `e259a0203`). DEC-006 replaced REQ-004: sending requires text or a skill tag, and Send is disabled for an attachments-only draft in every composer. The server's admission rule is unchanged. AC-003 is now the composer Send rule; REQ-007 and AC-009..AC-011 are withdrawn. Route: Small / Low, direct.
- New review artifacts in the package: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001, findings moot under SR-004), `code-review-report.md`, `code-review-revision-record.md` (CRR-001 failure-origin).
- Changed surfaces: frontend component/state (`hasSendableDraft`, `ChatComposer`, `ChatNewSurface`, `AgentUserInputTextArea`, `activeContextStore`) and the desktop renderer. There is no server source change; the server diff in IR-002 is limited to doc and test titles.
- Coverage decisions:
  - E2E-CF-002 is `Needs Update`. Its old assertion (an attach-only send is delivered) is obsolete under DEC-006. It now asserts the preserved server rule: an attachments-only, whitespace-content send is rejected with `RUNTIME_REJECTED` before AGY and no stdin line is written. The same uploaded image then reaches AGY when sent with text.
  - Web unit specs from IR-002 (`agentPrimaryAction`, `ChatComposer`, `AgentUserInputTextArea`): `Still Valid`, run in full.
  - All other round-1 cases: `Still Valid`, re-run. The live E2E file is not re-run because the server is unchanged since round 1; the desktop journey below provides fresh live AGY evidence.
- Broader validation: `Required`. The implementation rendered only the Chat new-chat composer, and the standalone run-view composer had only a component test. Mode: `Project Desktop Validation`, an isolated desktop instance from the worktree build (`pnpm isolated-app start --from-worktree`), controlled with browser-automation in attach-only mode. Journeys:
  - DJ-001: Chat new surface with a pasted image, the user's literal "her", and AGY.
  - DJ-002: standalone run-view composer with a file only, then text plus the file.
- Build currency check: `app.asar` contains no `attachmentsAreSendable` (removed in IR-002), and `server/dist/.../agy-user-message-text.js` is present.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed; round 2 executed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added/updated; none removed)
- Post-repository confidence: 87%; final 84%
- Broader validation decision: `Required`, executed as live AGY through the real server (3/3 Pass)
- Reroute Required Before Validation Execution: `No`. A reroute is required after execution: `Requirement Gap` (E2E-CF-002) → Solution Designer
