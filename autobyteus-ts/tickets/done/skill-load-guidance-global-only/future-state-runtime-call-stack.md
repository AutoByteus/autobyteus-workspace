# Future-State Runtime Call Stack

## Scenario A: `GLOBAL_DISCOVERY`

1. `AgentConfig` resolves `skillAccessMode` to `GLOBAL_DISCOVERY`.
2. `AvailableSkillsProcessor.process(...)` builds the skill catalog from discovered skills.
3. The processor appends the catalog and includes the `load_skill` guidance sentence because discovery mode may need on-demand skill loading.
4. No preloaded detail sections are included unless a skill is also preloaded.

## Scenario B: `PRELOADED_ONLY`

1. `AgentConfig` resolves `skillAccessMode` to `PRELOADED_ONLY`.
2. `AvailableSkillsProcessor.process(...)` builds the catalog from configured preloaded skills.
3. The processor appends skill details for those configured skills.
4. The processor does not append the `load_skill` guidance sentence because all allowed skills are already represented in detail.

## Change Point

- The only behavioral change in this ticket is the conditional emission of the `load_skill` guidance sentence inside `AvailableSkillsProcessor`.
