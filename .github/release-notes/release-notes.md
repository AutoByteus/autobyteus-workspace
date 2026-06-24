# Release Notes: Self-Evolution Prompt Cleanup

- Simplified the Skill Self-Evolver runtime task packet so it focuses on work trace paths, editable skill package roots, package-tree context, and the final `skill_update` target.
- Moved durable coaching guidance into the built-in Skill Self-Evolver package with the private `retrospective-skill-coach` skill and references.
- Updated built-in agent startup sync so product-managed private skills are mirrored into app data and resolvable through normal configured-skill loading.
- Kept final self-evolution notifications grant-scoped to the intended target run, message type, and editable skill-root references.
