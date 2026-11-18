# Investigation Notes

## Investigation Meta

- Package identifier: `prompt-section-tests-517`
- Request / ticket: Project Task `autobyteus-517` (item 1 only, as dispatched 2026-11-18), delegated by `/project_task_manager`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/prompt-section-tests-517`, `codex/prompt-section-tests-517`
- Base: `origin/personal` @ `2e9ac1e65b90ec24608223edd22a7db784979cd3` (beta.10 released; fetched 2026-11-18)
- Finalization target: `origin` / `personal`
- Bootstrap: OK; `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` in the worktree (Node 22.23.1), exit 0
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md` (this conversation); `TESTING.md` (update rules, Choosing the path); `DESIGN.md` rule 11.
- Status: complete.

## Request

Item 1 of autobyteus-517 (founder, beta.10: "create a follow-up, and if the fix is extremely easy, just fix it"): fix `configured-skill-on-demand-loading.e2e.test.ts` (~line 291), check the other prompt-section tests, add the TESTING.md rule only if easy. FU-002..FU-005 stay for later.

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-11-18 | Code | `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts` (`composeNativeAutoByteusPrompt`) | native order: shared sections, Working Environment, Bash Operating Practice, File And Directory Practice, `NATIVE_LONG_RUNNING_COMMAND_SECTION` (added by autobyteus-483); the skills section follows from the native runtime |
| 2026-11-18 | Code | `tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts:291-297` | exhaustive list of the native run's `## ` headings, without `## Long-Running Commands` |
| 2026-11-18 | Command | `grep -rln '"## (Agent Identity|…|Skills)"' tests` and `grep -rn 'match(/^## '` | ten test files mention section headings; only this e2e file asserts the complete list (`match(/^## .+$/gm)` + `toEqual`). The others assert single headings (`toContain`, `not.toContain`, `indexOf` order, `toHaveLength(1)`), build their own fixture prompt (`claude-session-manager.integration.test.ts`), or already include the section (composer, claude/codex/agy/acp/native backend tests, collaboration snapshot) |

## Reproduction

| Command | Observation | Established | Evidence |
| --- | --- | --- | --- |
| `cd autobyteus-server-ts && pnpm exec vitest run tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts --no-watch` (worktree, base `2e9ac1e65b`) | 1 failed, 3 passed; `AssertionError … :291:70`; received has `"## Long-Running Commands"` between `"## File And Directory Practice"` and `"## Skills"` | Reproduced | `evidence/SD-01-repro-before-fix.log` |

- Reproduction for implementation: the command above; the fix turns it green.
- Temporary diagnostics: none.

## Cause

The product is right (autobyteus-483 added the native section deliberately). 483's validation ran the prompt unit tests but not this E2E file, which holds the only exhaustive list. The same shape of miss is already covered for tool lists by TESTING.md's "The tools a run gets" row (search every layer for exact lists); there is no such row for prompt sections.

## Persisted Data

Not affected (test and doc only).
