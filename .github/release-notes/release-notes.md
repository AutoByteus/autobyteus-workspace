# Release Notes — Bounded Agent Run History

## Improvements

- Made large Event Monitor runs open from the active trace only and return the newest 100 canonical replay events instead of reconstructing archived segments during normal viewing.
- Kept historical hydration, live standalone/team updates, local submissions, center rendering, and Activity state bounded to recent windows of at most 100 events.
- Replaced the persistent count-bearing earlier-history pill with feed-native earlier paging that activates only from a fresh direct user input/top-threshold crossing and consumes no normal-flow height.
- Replaced the wide jump notice with one compact bottom-centered downward-arrow button. It has no visible text, count, badge, tooltip, pulse, or warning variant and remains independent from the lower-right **improve skills** action.
- Kept active-trace browsing isolated from live state and bounded to 300 mounted visuals without crossing into archived traces.

## Behavior And Compatibility

- The internal earlier-page size remains fixed at no more than 50 events but is not shown to users or exposed in accessibility copy.
- Loading and retry use compact absolute overlays; reaching the active-trace beginning is silent; cursor expiry retains content and uses the same neutral centered return arrow.
- Latest-mode manual return to bottom clears ordinary unseen state. Reaching the bottom of a frozen browse snapshot does not exit browse; the explicit arrow restores current live truth.
- Preserved mutable Thinking, streamed text, tool, and compaction entries ahead of completed entries during normal eviction, with a deterministic hard fallback when more than 100 entries are simultaneously mutable.
- Preserved collapsed-by-default Thinking and tool cards, absolute-file-path Event Monitor actions, and member attachment-retention behavior.
- Removed the separate conversation-copy control and its eager full-conversation text derivation without adding a replacement archive/export action.
- Existing active traces, archived segments, and manifests remain directly usable and unchanged; no migration or maintenance window is required.
- Event Monitor token/cost totals describe the retained recent window rather than full archived history.

## Validation

- Architecture review round 12 passed the centered neutral-arrow solution.
- Source review round 9 passed at `9.5/10` for source `70a2ddc626d9e9e834b3b6b322fb09183f5b76e7`; corrected handoff commit `5eb12b42e13890bd1d304ce1052d3235a67f48fd` resolved the final packaging reference.
- Fresh API/E2E passed at `97.4%` confidence with no category below 90% and no critical criterion lacking direct proof.
- Repository execution passed focused frontend `7/38`, expanded frontend `26/208`, focused GraphQL `1/6`, expanded server `9/43`, web/localization guards, server production build, and static/diff guards.
- Owned built-server HTTP passed on a deterministic active fixture larger than 5 MB with unchanged active/archive/manifest hashes.
- Real Chrome proved held-response input gating, queued post-write scroll, delayed reflow, one-request-per-fresh-session behavior, 300-resident turnover, keyboard/touch-enabled browser input, exact zero-layout geometry, centered-arrow accessibility/style equivalence, and wide/390 standalone/team coexistence with the real **improve skills** action.
- The platform exposed a 0 px native scrollbar gutter even under scoped attempts, so the conditional native-gutter journey was truthfully unavailable and no position fallback was used.
- A fresh delivery fetch found `origin/personal@9b4e038a40e0b6358fe53ca101406e0f6446e790` already integrated. No production or durable test file changed after the passed package, so no duplicate post-refresh suite was required.
- A fresh macOS ARM64 Electron candidate was built from ticket HEAD `096a60418c8747f8741ecd2909794247b244270f` after confirming latest `origin/personal@9b4e038a40e0b6358fe53ca101406e0f6446e790` was contained. The README build command, DMG verification, ZIP integrity check, and ARM64/bundle-version checks passed. The user's existing installed app was left running and the new candidate was not auto-launched.
