## Notes

- **Skill Improvement data cleanup corrected.** The cleanup that AutoByteus 1.5.8 runs once, to delete the data of the removed Skill Improvement feature, could also delete old memory-compaction helper runs on installs that had used the 1.4.92 beta builds of October 1. It now deletes only Skill Improvement data. On installs that already ran the earlier cleanup, those compaction runs can't be restored.
- **A failed custom-provider data conversion no longer stops AutoByteus from starting.** If converting custom LLM providers from an older version fails, the app starts, and custom providers show as unavailable until the next start retries the conversion. Built-in providers work normally.
