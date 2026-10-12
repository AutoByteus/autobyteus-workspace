# Implementation Handoff — agy-docker-node-availability-diagnostics

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Solution Designer classified the design Small / Low. `get_handoff_rules` matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → implementation directly, no independent architecture review.
- Requirements doc (Approved, SR-002): `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/solution-revision-record.md`
- Design spec (Ready, SR-003): `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/design-spec.md`
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/solution-handoff.md`
- Supplemental task artifacts: none. The user screenshots are evidence only; they are listed in the solution handoff.
- Design review report: `N/A — not applicable` (Small/Low direct route)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review, code-review, API/E2E and delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics`, branch `codex/agy-docker-node-availability-diagnostics` (base `origin/personal` @ `2756d7b29`). The commit hash is in the handoff message.

What changed:

1. **Server classifier** (`antigravity-cli-capability.ts`).
   - Adds `AGY_SIGN_IN_REQUIRED` with the fixed DEC-005 text.
   - Adds the module-private `AGY_SIGN_IN_PATTERN`. In `runCommand`'s `close` handler, a non-zero exit whose bounded stdout+stderr matches the pattern is classified as `AGY_SIGN_IN_REQUIRED`; any other non-zero exit is still `AGY_MODEL_DISCOVERY_FAILED`.
   - Rewords `AGY_CLI_UNAVAILABLE` and `AGY_CLI_UNSUPPORTED` to the DEC-005 texts.
   - Timeout, oversize and ENOENT branches are unchanged and still settle first.
   - No consumer changed: every consumer gets the new code through `AgyDiscoveryError` / `toAgyDiscoveryDiagnostic`.
2. **Menu row** (`ChatModelMenu.vue`).
   - An unavailable row shows `chat.model.unavailable` ("Unavailable" / "不可用", `data-test="chat-runtime-unavailable"`) on the right.
   - The server reason appears under the runtime name: `text-xs text-gray-400 line-clamp-2 whitespace-normal`, `data-test="chat-runtime-reason"`.
   - `title` is the reason, or nothing.
   - Unavailable rows are top-aligned (`items-start`) so the label lines up with the runtime name; enabled rows keep `items-center`.
3. **Re-check** (`useChatModelCatalog.ensureAvailability`).
   - Before fetching, it snapshots the kinds currently unavailable.
   - It runs the normal (cached) collection fetch, then `fetchRuntimeAvailability(kind, true)` for each snapshotted kind. All errors are swallowed as before.
   - The return type stays `Promise<void>`.
4. **Localization.** `chat.model.notInstalled` is replaced by `chat.model.unavailable` in en and zh-CN.
5. **Docs.**
   - Docker README "CLI Auth Model": in-app message → run `agy` in the node Terminal, then reopen the menu; sign-in is per node in `/root` and persists across image updates.
   - AGY module doc: the `AGY_SIGN_IN_REQUIRED` diagnostic.
   - `autobyteus-web/docs/chat.md`: new "Unavailable runtimes in the Model menu" section.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - 4 source files plus 2 locale entries, docs and tests. No new files or owners.
  - No GraphQL/schema/store/Dockerfile change.
  - Sanitization is preserved: the output is only pattern-matched, and fixed text is returned.
  - The re-check reuses the store's existing forced per-kind request.
  - None of the design's escalation triggers occurred: no API change, and no other surface renders "Not installed" for runtimes (`git grep` shows only the VoiceInput settings keys, which are untouched).
  - The store keeps the row while a forced request is pending: verified in the browser, where `availabilities` is only replaced on an accepted response.
- Selected route: `Direct API/E2E` (per the returned handoff rule)
- Lightweight implementation self-review completed for the direct route: `Yes` (see below)
- New design impact or escalation trigger: `None`

### Lightweight self-review

- **Boundaries.**
  - The menu still reads only `useChatModelCatalog`.
  - Server consumers don't parse message text.
  - No frontend code branches on reason text.
- **Classification precision.**
  - The pattern `/\b(?:please (?:sign|log) ?in|not (?:signed|logged) ?in(?:to)?|(?:sign|log)[- ]?in required)\b/i` matches all three design fixtures and rejects the real proxy-failure text.
  - It avoids bare `auth` / `sign` / `log in`.
  - It also accepts "please log in/login" and "login required", per AC-001's "log in"/"login" wording.
  - It is applied only on a non-zero exit, so sign-in wording on a successful listing stays a success (tested).
- **Scope of the classification.** The pattern sits in `runCommand`, so it also covers a failed `--help` or `--version`, as the design placed it. `readAntigravityCliVersion` still swallows any error and returns `null`.
- **Re-check concurrency.** The snapshot is taken before any fetch. On the first open the store is empty, so nothing is forced. While a collection is in flight, the forced per-kind request supersedes the collection's per-kind request, and the collection loop already waits for outstanding requests. Only unavailable kinds are forced (QR-003).
- **Clean cut.** `chat.model.notInstalled`, `data-test="chat-runtime-not-installed"` and the `title` fallback are removed, with no references left.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Signed-out → sign-in text; menu shows it visibly | `runCommand` close handler → `AgyDiscoveryError("AGY_SIGN_IN_REQUIRED")` → `RuntimeAvailabilityService` reason → GraphQL → store → `ChatModelMenu` reason line | Done. Unit tests plus a real backend+browser check: GraphQL `reason` = fixed text; row shows "Unavailable" and the reason |
| BEH-002 | Signed-in path preserved | Success branch of `runCommand` unchanged | Existing "ready" tests green. Browser check: after "sign-in", models listed (Gemini 3 Flash/Pro). A real Docker-node run is still for API/E2E |
| BEH-003 | Reopen re-checks unavailable kinds | `ChatModelMenu.onToggle` → `useChatModelCatalog.ensureAvailability` → `fetchRuntimeAvailability(kind, true)` | Done. Composable tests, plus the browser: the second open sent exactly one `GetRuntimeAvailability(antigravity_cli)`; the row became enabled with 2 models; the third open (all available) sent no availability request |
| BEH-004 | Neutral label + own reason for any unavailable runtime | `ChatModelMenu.vue` row template; locale files | Done. Component tests: reason case, null-reason case, no "Not installed", `aria-disabled`, arrow-key skip |
| BEH-005 | Run start / model replacement / launch validation inherit the text | Unchanged consumers of `AgyDiscoveryError` / `toAgyDiscoveryDiagnostic` | Done. Factory test (run start throws the sign-in text) and run-model-selection test (`catalogDiagnostic` = sign-in code+text). Launch validator uses the same mapper (its existing tests are green) |
| BEH-006 | Docker README covers the message and per-node sign-in | `autobyteus-server-ts/docker/README.md` "CLI Auth Model" | Done |
| BEH-007 | Clearer not-found / too-old texts | `DIAGNOSTICS` in the classifier | Done. Tested exactly (missing CLI; bad-flags) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Codex, Claude and Grok logic, the GraphQL schema, the store and the Dockerfile are untouched.

## Key Files Or Areas

- `autobyteus-server-ts/src/runtime-management/antigravity-cli-capability.ts`
- `autobyteus-web/composables/chat/useChatModelCatalog.ts`
- `autobyteus-web/components/chat/ChatModelMenu.vue`
- `autobyteus-web/localization/messages/{en,zh-CN}/chat.ts`
- Docs:
  - `autobyteus-server-ts/docker/README.md`
  - `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md`
  - `autobyteus-web/docs/chat.md`
- Tests:
  - `autobyteus-server-ts/tests/unit/runtime-management/antigravity-cli-capability.test.ts`
  - `.../agent-execution/backends/antigravity/agy-agent-run-backend-factory.test.ts`
  - `.../llm-management/run-model-selection-service.test.ts`
  - `autobyteus-web/components/chat/__tests__/ChatModelMenu.spec.ts`
  - `autobyteus-web/composables/chat/__tests__/useChatModelCatalog.spec.ts`

## Important Assumptions

- agy 1.3.3's signed-out `agy models` output (R-03/R-08) is representative. The fixture uses that exact text.
- The design placed the availability assertion in `runtime-availability-service.test.ts`. I put it in `antigravity-cli-capability.test.ts` instead, next to the existing AGY availability case, because that file already drives the real `RuntimeAvailabilityService` with the scripted CLI. `runtime-availability-service.test.ts` uses fake providers only. Coverage is the same.

## Known Risks

- RSK-001: upstream may reword the message, which falls back to the generic discovery-failed text. That text is still truthful.
- RSK-002: every menu open spawns `agy` (~2 s) while it is signed out. The spawn doesn't block the menu (accepted in the design).
- The reason is clamped to two lines. At desktop width the sign-in text is cut after "Run `agy` in this node's terminal and…"; the full text is in the row tooltip (as REQ-003 specifies).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Local Implementation Defect
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: every change landed inside its existing owner; no caller changes were needed on the server.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (`chat.model.notInstalled` en/zh-CN, the old data-test, the title fallback)
- Dead code found elsewhere, listed as follow-up: None
- Shared structures remain tight: `Yes` (the union gains one member with one meaning)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Effective non-empty lines: `ChatModelMenu.vue` 401, `useChatModelCatalog.ts` 157, `antigravity-cli-capability.ts` 125. Source delta is about 60 lines.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (design-spec "Persisted Data / State Transition Decision")
- Implementation follows it: `Yes`. No data or schema touched.

## Environment Or Dependency Notes

- Fresh worktree setup: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare`, then `pnpm -C autobyteus-server-ts build` for the rendered check.

## Local Implementation Checks Run

All are implementation-scoped.

- `pnpm -C autobyteus-server-ts exec vitest run` on these, with `--no-watch`:
  - `tests/unit/runtime-management`
  - `tests/unit/agent-execution/backends/antigravity`
  - `tests/unit/llm-management/run-model-selection-service.test.ts`
  - `tests/unit/application-platform/application-launch-host-capability-validator.test.ts`
  - `tests/unit/agent-org-execution/agent-org-run-service-model-selection.test.ts`
  
  Result: 44 files passed, 4 skipped; 486 tests passed.
- `pnpm -C autobyteus-server-ts typecheck`: passed.
- Full `pnpm -C autobyteus-server-ts test:unit`: passed: 679 files (4 skipped), 5364 tests (7 skipped)
- `pnpm -C autobyteus-web exec vitest run components/chat/__tests__/ChatModelMenu.spec.ts composables/chat/__tests__/useChatModelCatalog.spec.ts`: 17 tests passed.
- Full `pnpm -C autobyteus-web test:nuxt`: passed: 610 files (2 skipped), 4241 tests (5 skipped)
- `guard:localization-boundary`, `audit:localization-literals`, `guard:web-boundary`: all passed.
- `pnpm -C autobyteus-server-ts build`: passed.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the New chat composer Model menu runtime list (desktop flyout layout and the <640px bottom sheet). Journey: signed-out → sign in → reopen.
- References: REQ-003/REQ-004, AC-003..005; requirements "UI, Interaction, And Experience Requirements"; design-spec row example.
- Existing system reviewed: the existing runtime row styles (gray disabled row, `text-xs` right label), `ChatModelList` secondary-line style and `line-clamp-2` usage.
- Rendered surface used: an ad-hoc local stack (the TESTING.md "Browser probes" pattern):
  - this worktree's `dist/app.js` on a temp data root, free ports and a temp `HOME`;
  - `ANTIGRAVITY_CLI_COMMAND` pointing to a scripted `agy` whose state file switches signed-out → signed-in;
  - Nuxt dev;
  - headless Chrome via playwright-core.
  
  Scripts: `.../implementation-evidence/scripts/{check.mjs,fake-agy.cjs}`. Not a committed probe. Everything it starts is stopped, and its temp root is removed.
- States, layouts, viewports and interactions inspected:
  - 1512×952 desktop menu: signed-out row (text, `title`, `aria-disabled`, reason box = 2 lines × 16 px).
  - Reopen after sign-in: one forced request, then enabled with 2 models; hovering opens the flyout with the models.
  - Third open: no availability request.
  - 390×844 bottom sheet: signed-out row.
  - No page errors.
- Issues found and corrected: in round r1, "Unavailable" was vertically centered against the two-line block, so it sat beside the reason line. Unavailable rows now use `items-start`, with `mt-0.5` on the label (and a matching top offset on the current-runtime dot). In r2 the label lines up with the runtime name.
- Evidence:
  - `.../implementation-evidence/render-r1/` (before the fix) and `.../render-r2/` (final): screenshots plus `results.json`;
  - folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-docker-node-availability-diagnostics/tickets/in-progress/agy-docker-node-availability-diagnostics/implementation-evidence/`.
- Not rendered:
  - the zh-CN locale (covered by the dictionary entry and guards);
  - an unavailable runtime that is also the *current* runtime (the dot offset class has not been rendered);
  - the Electron shell.

## Downstream Coverage Hints / Suggested Scenarios

- Server GraphQL E2E: `runtimeAvailability(antigravity_cli)` with a scripted signed-out CLI → `enabled:false` plus the exact sign-in text. A proxy-failure CLI → the generic text.
- Browser probe: the signed-out → signed-in reopen journey above (the scripts in `implementation-evidence/scripts` can be the starting point).
- Docker node (design "Executable validation"), from an image or server `dist` built from this branch:
  - with `HOME` pointing to an empty directory, the reason equals the sign-in text;
  - with a signed-in `/root` (a copy of the state, never the user's volumes), Antigravity is enabled, lists models and a run completes (AC-006).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-006 (real signed-in Docker node: models + a run that completes) and the real-`agy` signed-out reason on a Docker node (AC-001/AC-004 live). Neither has been run by me.
- Any committed browser probe or GraphQL E2E the API/E2E engineer judges necessary.
