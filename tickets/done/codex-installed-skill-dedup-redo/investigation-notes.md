# Investigation Notes

- Ticket: `codex-installed-skill-dedup-redo`
- Date: `2026-04-08`
- Scope Triage: `Medium`

## Evidence Summary

1. The current `personal` architecture owns Codex configured-skill materialization in `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts`.
2. The current bootstrap path that decides whether to materialize configured skills lives in `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`.
3. The current reusable app-server client manager lives in `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts`.
4. There is no existing `skills/list` call anywhere in the current `personal` codebase.
5. The current materializer always copies configured skills into workspace `.codex/skills` whenever `skillAccessMode !== NONE`.

## Current Code Findings

### Materializer

- `materializeConfiguredCodexWorkspaceSkills(...)` filters only on `SkillAccessMode.NONE`, then materializes every configured skill.
- `ensureMaterializedSkillBundle(...)` always creates or refreshes a workspace-owned bundle under `.codex/skills/autobyteus-...`.
- `fs.cp(...)` currently copies without `verbatimSymlinks: true`, so symlink preservation is not explicitly guaranteed.
- Cleanup logic only knows about runtime-owned bundles because the descriptor only contains `materializedRootPath`.

### Bootstrapper

- `bootstrapInternal(...)` resolves configured skills before thread startup.
- `prepareWorkspaceSkills(...)` delegates directly to the materializer with no discovery client or preflight check.
- This is the correct seam to acquire a short-lived Codex app-server client for `skills/list`.

### Validation Surface

- Current unit coverage exists for `codex-workspace-skill-materializer`, but only for plain materialization behavior.
- There is no current bootstrapper unit test in `tests/unit/agent-execution/backends/codex/backend/`.
- Current live runtime coverage already includes a configured-skill Codex E2E in `tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts`.

## Live Protocol Findings

### Generated App-Server Types

- `ClientRequest` includes method `skills/list`.
- `SkillsListParams` currently uses:
  - `cwds?: string[]`
  - `forceReload?: boolean`
  - `perCwdExtraUserRoots?: Array<...> | null`
- `SkillsListResponse` is `{ data: SkillsListEntry[] }`.
- `SkillsListEntry` is `{ cwd: string, skills: SkillMetadata[], errors: SkillErrorInfo[] }`.
- `SkillMetadata` includes the fields needed for dedupe:
  - `name`
  - `path`
  - `scope`
  - `enabled`

### Live Probe Against Fresh Redo Worktree

- A direct `codex app-server` probe with `skills/list` succeeded in the fresh redo worktree rooted at `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-installed-skill-dedup-redo`.
- The live response shape matched the generated types exactly.
- The fresh redo worktree currently has no repo `.codex/skills` directory, so `skills/list` returned only user/system skills.
- This confirms that repo-scoped duplicates only appear after runtime materialization or if repo skills already exist under `.codex/skills`.

## Re-Entry Findings (`2026-04-08`)

### Manual Team-Agent Failure Reproduction

- A live `software-engineering-team` run inside `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` failed when the materialized repo skill `autobyteus-architect-designer-785328ef3921` exposed:
  - `design-principles.md -> ../../shared/design-principles.md`
  - `common-design-practices.md -> ../../shared/common-design-practices.md`
- From the materialized path `.codex/skills/autobyteus-architect-designer-785328ef3921/...`, those relative links resolve to:
  - `.codex/shared/design-principles.md`
  - `.codex/shared/common-design-practices.md`
- Those `.codex/shared/...` targets did not exist, so Codex saw broken skill entries during loading.

### Source Team Layout Findings

- The source team skill in `../autobyteus-agents/agent-teams/software-engineering-team/agents/architect-designer` is valid in place because:
  - `design-principles.md -> ../../shared/design-principles.md`
  - `common-design-practices.md -> ../../shared/common-design-practices.md`
- The same team-local shared-doc symlink pattern is also used by:
  - `architect-reviewer`
  - `implementation-engineer`
  - `code-reviewer`

### Copy-Semantics Experiments

- Using Node `v22.21.1`, targeted experiments against a temp `software-engineering-team` layout showed:
  1. default `fs.cp(skillRoot, dst)` preserves a symlink entry but rewrites the target to an absolute path back to the original source file;
  2. `fs.cp(skillRoot, dst, { verbatimSymlinks: true })` preserves the raw relative target text, so `../../shared/...` resolves from the new `.codex/skills/...` location into `.codex/shared/...`;
  3. adding the matching `.codex/shared/...` directory makes the preserved relative symlink work;
  4. `fs.cp(skillRoot, dst, { dereference: true })` produces regular files in the materialized bundle, making the copied skill self-contained and independent of both the original agent repo and `.codex/shared/...`.

### Code-Level Cause

- The prior redo implementation changed `CodexWorkspaceSkillMaterializer` to copy with `verbatimSymlinks: true`.
- That behavior matches the failing `.codex/shared/...` resolution pattern seen in manual execution.
- The earlier requirement and design language incorrectly treated “preserve symlinks” as the goal, but the executable goal is actually “make symlinked skill content usable after materialization.”

## Implications

1. The ticket must be implemented entirely in the current `agent-execution/backends/codex` plus `runtime-management/codex/client` layout.
2. Same-name dedupe should compare configured skill `name` against live discoverable skill names returned by `skills/list`.
3. Runtime materialization for symlinked skills must produce a self-contained bundle; preserving relative symlink identity is not sufficient for team-local skills that rely on sibling shared directories.
4. The safest current-scope approach is to dereference symlinks during runtime copy instead of introducing a workspace-global `.codex/shared/...` mirror.
5. The materializer still needs a way to represent reused external skills separately from runtime-owned copied skills so cleanup does not delete installed skills.
6. The Stage 7 validation path should reuse the current configured-skill Codex E2E and add direct coverage for self-contained symlinked bundles instead of reviving the deleted stale runtime-execution E2E file.

## Risks / Open Questions

1. If `skills/list` fails, the runtime still needs a safe fallback policy; materializing is the safest default.
2. Dedupe by `name` alone is the intended product decision for this ticket, but it intentionally treats same-name third-party skills as reusable.
3. The Codex materializer fix may also deserve symmetry with the Claude materializer later, but that is not part of this ticket unless the current code review shows shared-regression risk in the touched scope.
4. The live configured-skill E2E currently proves configured skill usage, but it may need a refreshed symlink assertion because the expected artifact is now self-contained copied files rather than preserved relative symlinks.
