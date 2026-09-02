# Release Notes — Codex Fast Capability Discovery

## Fixes

- Codex Fast mode is now discovered from the current structured model-catalog contract: a `serviceTiers` entry with provider ID `priority` enables the existing **Fast mode** configuration control.
- Deprecated `additionalSpeedTiers` and `additional_speed_tiers` metadata no longer enables Fast by itself.

## Preserved Behavior

- AutoByteus continues to store and submit `llmConfig.service_tier: "fast"`; provider capability ID `priority` is not written into user configuration.
- Default/off continues to omit the service-tier setting, and reasoning effort remains independent.
- The existing generic configuration form remains the only Fast-mode UI; no effective-tier header or runtime-status surface was added.

## Compatibility And Data

- Existing stored Fast selections remain directly usable. No migration, backfill, schema change, or downtime is required.
- Codex versions that expose only deprecated speed-tier metadata will no longer advertise Fast. Current locally verified Codex 0.151.0 and 0.152.0 expose the structured contract.
