## What's New
- Codex models that advertise the current Fast capability now expose the existing **Fast mode** control in Agent and Team configuration.

## Improvements
- Fast capability discovery now follows Codex's current structured model-catalog contract while preserving AutoByteus's existing `fast` selection and runtime behavior.
- Default/off still omits the service-tier setting, and reasoning effort remains independent.

## Fixes
- Fixed Fast availability depending on deprecated Codex speed-tier metadata.
- Existing saved Fast selections remain directly usable; no migration, backfill, schema change, or downtime is required.
