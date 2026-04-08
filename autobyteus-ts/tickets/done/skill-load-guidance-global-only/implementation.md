# Implementation Plan

## Solution Sketch

1. Update `AvailableSkillsProcessor` so the sentence that tells the model to use `load_skill` is emitted only when `skillAccessMode` is `GLOBAL_DISCOVERY`.
2. Leave the skill catalog injection unchanged across modes.
3. Leave preloaded skill detail sections unchanged.
4. Keep the earlier wording cleanup from `Root Path` to `Skill Base Path`.

## Expected Code Changes

- `src/agent/system-prompt-processor/available-skills-processor.ts`
- `tests/unit/agent/system-prompt-processor/available-skills-processor.test.ts`
- `tests/integration/agent/agent-skills.test.ts`

## Execution Tracking

- Source edits started: `Yes`
- Source edits completed: `Yes`
- Validation completed: `Yes`

## Implementation Notes

1. Replayed the earlier `Skill Base Path` wording cleanup into the dedicated worktree.
2. Scoped the `load_skill` guidance sentence in `AvailableSkillsProcessor` to `GLOBAL_DISCOVERY`.
3. Updated unit and integration tests so preloaded/configured mode asserts absence of the sentence and discovery mode asserts presence.
