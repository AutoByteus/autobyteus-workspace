# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis/tickets/done/claude-ask-user-question-disallow/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis/tickets/done/claude-ask-user-question-disallow/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis/tickets/done/claude-ask-user-question-disallow/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis/tickets/done/claude-ask-user-question-disallow/design-review-report.md`

## What Changed

- Added a localized Claude SDK query-option policy in `ClaudeSdkClient.buildQueryOptions` that always sends bare `disallowedTools: ["AskUserQuestion"]` for normal AutoByteus Claude turns.
- Preserved existing `allowedTools`, `mcpServers`, `canUseTool`, settings sources, environment, cwd, resume, permission mode, and abort-controller forwarding.
- Updated the Claude SDK client unit test to assert the new `disallowedTools` option while retaining AutoByteus MCP/tool pre-approval expectations.
- Added a regression assertion that the query options do not introduce a restrictive `tools` allowlist.

## Key Files Or Areas

- Modified: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis/autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`
- Modified: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis/autobyteus-server-ts/tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`

## Important Assumptions

- The product policy remains global for this ticket: AutoByteus Claude SDK runs should hide `AskUserQuestion` without a runtime/user toggle.
- `AskUserQuestion` remains the exact Anthropic built-in tool name accepted by the SDK `disallowedTools` option.
- AutoByteus MCP tools remain governed by existing `mcpServers` and `allowedTools` construction, not by the built-in tool availability setting.

## Known Risks

- Runtime deployments using an older Claude Agent SDK that ignores `disallowedTools` may not hide the built-in, but the local dependency and reviewed docs indicate support.
- Future workflows may want interactive Claude clarification UI; that should be handled by a future requirement/toggle rather than compatibility behavior in this change.
- `pnpm -C autobyteus-server-ts typecheck` currently fails because `tsconfig.json` includes `tests` while `rootDir` is `src`, producing TS6059 for many existing test files outside `src`. This appears unrelated to this implementation; the source build config check passed after Prisma client generation.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): No Refactor Needed
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A
- Evidence / notes: The change stayed at the existing provider SDK query-option boundary and did not move AutoByteus tool exposure policy into the SDK client. No new boundary bypass, shared structure, or product setting was needed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes: Changed source implementation file is 413 non-empty lines after the edit. Diff is 8 insertions across source and test files.

## Environment Or Dependency Notes

- Ran `pnpm install --frozen-lockfile` in `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-ask-user-questions-analysis` to make local workspace dependencies available for checks. Lockfile was unchanged.
- Ran Prisma client generation before the source build config check because the generated Prisma client types were otherwise unavailable in the fresh worktree.

## Local Implementation Checks Run

- Passed: `git diff --check`
- Passed: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/runtime-management/claude/client/claude-sdk-client.test.ts`
  - Result: 1 test file passed, 7 tests passed.
- Passed: `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma && pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- Attempted but failed due existing project config issue: `pnpm -C autobyteus-server-ts typecheck`
  - Failure shape: TS6059 errors because files under `autobyteus-server-ts/tests/**` are matched by `tsconfig.json` include pattern but are outside `rootDir: src`.

## Downstream Validation Hints / Suggested Scenarios

- Code review should verify `ClaudeSdkClient.buildQueryOptions` now sends a bare `disallowedTools` array and does not introduce `tools` or a `canUseTool`-only denial path.
- API/E2E validation can exercise a realistic Claude SDK turn, if credentials/environment are available, and confirm the emitted query options/runtime behavior no longer expose `AskUserQuestion` while AutoByteus MCP tools remain present.

## API / E2E / Executable Validation Still Required

- API/E2E validation is still required downstream and is owned by `api_e2e_engineer` after code review passes.
