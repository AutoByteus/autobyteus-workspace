# API / Executable Validation

## Scope Note

This ticket is a prompt-construction change inside `autobyteus-ts`. There is no separate HTTP API or browser E2E surface for the changed behavior, so executable validation is covered by focused unit and integration tests.

## Acceptance Criteria Mapping

1. `PRELOADED_ONLY` prompt omits `load_skill` guidance.
   - Covered by:
     - `tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts`
     - `tests/integration/agent/agent-skills.test.ts`
2. `GLOBAL_DISCOVERY` prompt still includes `load_skill` guidance.
   - Covered by:
     - `tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts`
     - `tests/integration/agent/agent-skills.test.ts`
3. Prior wording change from `Root Path` to `Skill Base Path` remains validated.
   - Covered by:
     - `tests/unit/tools/skill/load-skill.test.ts`
     - `tests/integration/tools/skill/load-skill.test.ts`

## Executed Command

```bash
pnpm exec vitest --run tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts tests/unit/tools/skill/load-skill.test.ts tests/integration/agent/agent-skills.test.ts tests/integration/tools/skill/load-skill.test.ts
```

## Result

- Status: `Pass`
- Test files: `4 passed`
- Tests: `13 passed`
- Environment note: the dedicated worktree reused the existing dependency install from the main checkout via a local `node_modules` symlink so validation could run against the worktree files.
