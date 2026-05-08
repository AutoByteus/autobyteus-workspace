# Design Impact Rework

## Trigger

Code review returned `Fail / Design Impact` in round 1 because `autobyteus-web/components/settings/ServerSettingsManager.vue` was a changed source implementation file with `886` effective non-empty lines, above the hard `500` line source-size gate.

Review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/stream-parser-server-basics/tickets/done/stream-parser-server-basics/review-report.md`

## Design Re-entry Decision

The original no-refactor design is revised. The feature remains the same, but implementation must now include a source-size-safe split of the Server Settings UI owner before the streaming parser card can pass code review.

- Change posture remains: `Feature`
- New design issue classification for the re-entry: `File Placement Or Responsibility Drift`
- Refactor needed now: `Yes`
- Reason: a direct composition edit to `ServerSettingsManager.vue` leaves a changed source implementation file over the hard size limit.

## Required Source-Size-Safe Shape

Implementation must not leave any changed source implementation file above `500` effective non-empty lines.

Required split:

1. `ServerSettingsManager.vue`
   - Becomes a smaller shell for shared loading/error handling, mode routing, and Advanced-mode ownership.
   - Must not own Basics endpoint parsing, Basics card composition, or Web Search form logic after the rework.
   - Final changed file must be at or below the hard source-size limit.

2. `ServerSettingsBasicsPanel.vue`
   - New focused Basics composition owner.
   - Renders the Basics shell, endpoint cards, standalone behavior-card grid, Web Search card, and the new `StreamingParserCard`.
   - Owns any Basics-level notification surface if extracted endpoint/search components emit save results.

3. `ServerSettingsEndpointCards.vue`
   - New focused owner for endpoint quick-setup cards and their parsing/serialization/validation/save behavior.
   - Receives no runtime parser responsibilities.

4. `WebSearchConfigurationCard.vue`
   - New focused owner for Web Search provider form state, validation, load/save behavior, and `serverSettingsStore.setSearchConfig(...)` use.

5. Existing standalone cards stay focused:
   - `ApplicationsFeatureToggleCard.vue`
   - `MediaDefaultModelsCard.vue`
   - `CodexFullAccessCard.vue`
   - `StreamingParserCard.vue`
   - `FeaturedCatalogItemsCard.vue`
   - `CompactionConfigCard.vue`

If the extraction still leaves `ServerSettingsManager.vue` above `500` effective non-empty lines, implementation must continue by extracting an `ServerSettingsAdvancedPanel.vue` before returning to code review. The code-review gate is not optional.

## Behavior That Must Not Change

- Basics Streaming parser UX remains exactly two-state:
  - on saves `AUTOBYTEUS_STREAM_PARSER=xml`
  - off saves `AUTOBYTEUS_STREAM_PARSER=api_tool_call`
- Advanced remains the expert surface for valid values currently supported by runtime constants.
- Existing endpoint quick setup, Web Search, Advanced raw table, server status, and existing standalone cards must preserve current behavior unless a test-backed adjustment is explicitly needed for the split.
- No direct Apollo/env/runtime-parser bypass may be introduced.

## Test Reallocation Guidance

Move or add tests so coverage follows the new owners:

- `ServerSettingsManager.spec.ts`: shell/mode routing/loading/error/Advanced behavior only.
- `ServerSettingsBasicsPanel.spec.ts`: Basics composition includes endpoint cards, existing standalone cards, `StreamingParserCard`, Web Search, and Compaction.
- `ServerSettingsEndpointCards.spec.ts`: endpoint parsing, validation, dirty preservation, save values.
- `WebSearchConfigurationCard.spec.ts`: provider validation and save payloads.
- Existing `StreamingParserCard.spec.ts` remains focused on XML toggle behavior.

## Updated Handoff Rule

After implementation rework, return through `code_reviewer` before API/E2E validation begins.
