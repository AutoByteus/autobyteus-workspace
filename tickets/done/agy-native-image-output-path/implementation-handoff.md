# Implementation Handoff — agy-native-image-output-path

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review selected (Small + High). ARCH-REV-002 = **Pass**. The route after implementation is Code Review, selected by `get_handoff_rules` (Large/High route).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/requirements-doc.md` (Approved, SR-003/SR-004)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/design-spec.md`
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/probe-evidence/` (evidence only); `solution-result.md`. Product/UI supplements: `N/A — not applicable`.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation)
- Implementation evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/implementation-evidence/` (`real-native-image.json`, `app-native-image-chat.json`)

## Current Implementation Summary

- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path`, `codex/agy-native-image-output-path`, base `origin/personal@fcd3e83a4`. Implementation commit: `aad130875`.
- New `stream/agy-step-output-reader.ts` (`readAgyNativeImagePath(conversationId, stepIndex, brainRoot?)`). It is sync and never throws. It:
  - validates a UUID conversation id and a non-negative safe-integer step;
  - opens only `<brainRoot>/<conv>/.system_generated/steps/<step>/output.txt` with `O_RDONLY|O_NOFOLLOW`;
  - checks the file is regular with `fstat` and rejects anything over 16 KiB;
  - reads at most 16 KiB and matches the line `Generated image is saved at <abs path>` (one trailing `.` stripped);
  - `lstat`s the reported path, which must be a regular non-symlink file;
  - requires the image realpath to be inside `realpath(<brainRoot>/<conv>)` and `lstat`s that realpath again;
  - returns `{ path: realpath, outputText: trimmed text, reason: null }`, or `{ path: null, outputText: null, reason }`.
  - The whole body is wrapped and maps to `READ_FAILED`.
- `AgyStreamEventConverter`:
  - Gains a final optional constructor dependency `resolveNativeImagePath?: AgyNativeImagePathResolver` (the type is exported from the converter).
  - Native `generate_image` DONE with no provider error calls `nativeImageResult(stepIndex)`. That call is guarded by `try/catch`, so a thrown resolver becomes `RESOLVER_FAILED`.
  - Resolved result: `{ provider_state:"DONE", output:<outputText>, file_path:<realpath> }`.
  - Unresolved result: `{ provider_state:"DONE", output:null }` plus `console.warn("AGY_NATIVE_IMAGE_PATH_UNRESOLVED run=<id> step=<n> reason=<code>")`, which contains no path or content.
  - The `generate_image` `args = {}` special case and the hard-coded `output:null` branch/comment are removed. Parameters are now published (DEC-002).
  - The error/denial branch is unchanged: provider `error`/`output` are still redacted, and the resolver is never called on ERROR or DONE-with-error.
- `AgyAgentRunBackend` wires `(stepIndex) => readAgyNativeImagePath(context.runtimeContext.conversationId, stepIndex)`. The conversation id is readonly on `AgyAgentRunContext`.
- The shared file-change processor, content route, run history and UI are **unchanged**. The Artifacts entry comes from the existing `result.file_path` → `generated_output` handling.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001..SR-004
- Related architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Related code-review / API/E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A

## Routing Classification (Mandatory)

- Task size: **Small**
- Architecture risk: **High**
- Design classification reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The implementation matches the designed scope: one new reader file (≈65 non-empty lines), a converter change (+15/−3), 3 lines of backend wiring, and tests.
  - Both High-risk drivers remain: the undocumented AGY layout dependency, and a `~/.gemini` file becoming servable through the existing content route. The live e2e confirmed that the preview is served from `~/.gemini/.../brain/<conv>/`.
  - None of the escalation triggers were needed: no transcript scan, no byte copy, no turn delay, no shared-code change, and no read beyond the single step file.
- Selected route: `Code Review`
- Lightweight self-review for direct route: `Not Applicable` (High risk ⇒ independent Code Review)
- New design impact or escalation trigger: `None`. Two additional pre-existing tests encoded the removed policy and were updated. This is not a design change; see Known Risks / Notes.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-001 / AC-001 / AC-005 | DONE → result carries AGY's output text + absolute image path | backend wiring → `AgyStreamEventConverter.tool` → `nativeImageResult` → `readAgyNativeImagePath` | Implemented. Live (real agy 1.2.12): `file_path` is under `~/.gemini/antigravity-cli/brain/<conv>/`, exists, and `output` contains it. |
| REQ-002 / AC-003 | Confined, bounded, symlink-safe single read | `agy-step-output-reader.ts` | Implemented. Unit tests cover: invalid identity, symlinked `output.txt` (ELOOP → `OUTPUT_UNSAFE`), a directory as `output.txt`, >16 KiB, an image in another conversation, a `..` escape, a symlinked image (both outside and inside targets), and a missing or directory image. |
| REQ-003 / AC-002 / SCN-002 | Unresolved → success with `output:null`, no user-facing error | converter fallback + warning; resolver guard | Implemented. There is one unit test per reason code, plus a throwing-resolver test: no exception, SUCCESS with `output:null`, `RESOLVER_FAILED` warning, and the turn still completes. |
| REQ-004 / AC-004 (DEC-001=B) | One Artifacts `generated_output` entry that previews | unchanged `FileChangeEventProcessor` / `/rest/runs/:runId/file-change-content` | Unit test: exactly one `generated_output` entry, with an absolute path outside the workspace. Live full-stack e2e: one FILE_CHANGE with the same path and invocation id, and the content route returns `image/*` bytes identical to the file. |
| REQ-005 (DEC-002) | Parameters shown; error/denial redaction unchanged | converter `args = agyRecord(info?.parameters) ?? {}` | Implemented. STARTED shows `ImageName`/`Prompt` (unit, lifecycle, both live e2e). The denial and DONE-with-error tests still assert provider `error`/`output` are redacted. |
| BEH-002 | Error/denial unchanged | existing converter branch | Preserved. The fake-AGY failure-transport e2e passes (ACK, tool card and history redaction, private diagnostic retained). |

## Key Files Or Areas

- Add `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-step-output-reader.ts`
- Modify `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts`
- Modify `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts`
- Tests:
  - Add `tests/unit/agent-execution/backends/antigravity/agy-step-output-reader.test.ts` (17 tests).
  - Modify `tests/unit/.../agy-stream-event-converter.test.ts`: image cases were replaced or added — resolved, 8 fallback reasons, throwing resolver, parallel steps, MCP `call_mcp_tool` unaffected.
  - Modify `tests/unit/.../agy-turn-lifecycle.test.ts`: the backend wiring test now mocks the reader module and asserts `(conversationId, 4)`.
  - Modify `tests/unit/agent-execution/events/file-change-event-processor.test.ts`: new AGY-resolved outside-workspace case.
  - Modify the e2e tests `agy-native-image-codex-skill.e2e.test.ts`, `agy-native-image-app-chat.e2e.test.ts` and `agy-failure-transport.e2e.test.ts`, and the fixture `tests/fixtures/agy-failure-cli.mjs`.

## Important Assumptions

- The server and AGY share a HOME, so `os.homedir()` is AGY's brain root. This was confirmed by design review (agy-stream-process inherits env).
- The reported path's `lstat` is metadata-only and happens before the containment check. The design allows `lstat`/`realpath` of the reported image. No bytes are ever read from the image.
- Reason-code mapping:
  - a symlinked or non-regular reported image → `IMAGE_MISSING` ("no regular non-symlink image at the reported path"). This stays within the reviewed union and adds no new code;
  - a directory as `output.txt` → `OUTPUT_UNSAFE`;
  - `ENOENT`/`ENOTDIR` on open → `OUTPUT_MISSING`.
- There is no warning when no resolver is injected. That only happens in unit-test/harness construction; production always injects one.

## Known Risks

- AGY layout or wording drift (accepted in SR-002). Drift falls back to `output:null` with a warning. The two gated live e2e tests act as detectors.
- Two tests outside the design's removal list still encoded the removed policy, so I updated them in scope:
  - `agy-native-image-app-chat.e2e.test.ts` expected `output:null`. It now asserts the path, FILE_CHANGE and preview.
  - The fake `agy-failure-cli.mjs` fixture put a "secret" inside `generate_image` **parameters**. Under approved DEC-002 parameters are public, so the secret moved out of the parameters. The test still asserts that the provider error/output secrets are redacted and that the private diagnostic retains them.
  - These are mechanical consequences of approved REQ-005, not new behavior.
- `output.txt` O_NOFOLLOW applies to its final component only. Containment is enforced on the image realpath. This matches the review note.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: behavior change within the existing AGY adapter
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed` (beyond the named special-case removal)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: The converter stays free of `fs`. All brain-layout knowledge is in the reader. The backend only wires.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There are no version branches; older layouts use the generic fallback.
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes` (the `args = {}` special case, the hard-coded `output:null` branch and comment, and the old "pathless" unit test and e2e expectations)
- Shared structures remain tight: `Yes`. The discriminated union for the resolution is unchanged, and the result has only two explicit shapes.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Converter 176 non-empty lines; reader 65; backend ~136.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes`
- Direct-use evidence: Historical events keep `output:null` and replay unchanged. New events additionally carry `output` text and `file_path`, with no reader change (review note). AGY files are only read.
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- To run tests in the fresh worktree I ran `pnpm install --frozen-lockfile --prefer-offline`, `pnpm exec prisma generate`, and `pnpm prepare:shared` (autobyteus-server-ts).
- `prepare:shared` leaves untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`. These are build outputs and are not committed.
- The live tests need `agy` 1.2.12 at `~/.local/bin/agy`, logged in.
- Gates:
  - `RUN_AGY_CAPABILITY_E2E=1` for the live tests;
  - `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs` for the fake failure transport.

## Local Implementation Checks Run

- `vitest run tests/unit/agent-execution/backends/antigravity/ tests/unit/agent-execution/events/file-change-event-processor.test.ts` → 9 files passed (3 gated live files skipped), 106 tests passed.
- `vitest run tests/unit/agent-execution tests/unit/run-history tests/unit/services/agent-streaming` → 1184 passed, 10 failed.
  - All 10 failures are **pre-existing**. The same 10 fail on the untouched baseline (stashed): `agent-run-provisioning-service`, `published-artifact-projection-service`, `team-run-history-catalog-service`, `codex-tool-log-correlation`. None are related to AGY.
- `tsc --noEmit -p tsconfig.build.json` → exit 0. `tsc -p tsconfig.json`: 0 errors other than the pre-existing TS6059 rootDir errors (769 before and after).
- Implementation-scoped live checks (real `agy` 1.2.12, author-run; these are not API/E2E sign-off):
  - `agy-native-image-codex-skill.e2e` "native AGY image" → pass. It uses the real reader and asserts `file_path` is inside the realpath of the conversation brain dir, `output` contains it, and the args include `ImageName`/`Prompt`.
  - `agy-native-image-app-chat.e2e` "native generate_image" → pass. This is the full server over GraphQL/WS through the production backend wiring. It asserts `file_path`, output text, one `generated_output` FILE_CHANGE with the same path and invocation, and that `/rest/runs/:runId/file-change-content` returns `image/*` bytes equal to the file. The evidence is in `implementation-evidence/app-native-image-chat.json` (conv `5b4aa8ee-…`, `blue_dog_1790602078997.jpg`).
  - `agy-failure-transport.e2e` (fake agy) → 2/2 pass.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`. No frontend code changed. The Activity card and Artifacts tab render the new data through the existing generic result and `file_path` handling. I checked frontend references to `provider_state`: they are generic, and their test fixtures use the still-valid fallback shape. I did not inspect the rendered card visually. API/E2E may confirm the rendered Activity card and Artifacts preview in the app (AC-001/AC-004 UI view).

## Downstream Coverage Hints / Suggested Scenarios

- SCN-001 restore/reopen: after the turn, reopen the run and check that run history shows the same `file_path`/`output` result and the Artifacts entry.
- Parallel `generate_image` in one turn: check distinct steps get distinct paths (unit-covered; E-011 probe shape).
- Resume with `--conversation`: check step numbering continues and resolves (E-012).
- Fallback: an old pre-2026-08-11 conversation, or a deleted `output.txt`, gives SUCCESS with `output:null` and one `AGY_NATIVE_IMAGE_PATH_UNRESOLVED` warning line with no path.
- UI: the Activity card shows the parameters and the path; the Artifacts tab previews the brain-dir image.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent API/E2E validation and sign-off (owned by api_e2e_engineer). This includes the history restore, the UI-rendered Activity card and Artifacts preview, and a fallback run against a real server.
