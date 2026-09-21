# IR-001 implementation evidence

These are implementation-scoped checks, not independent API/E2E acceptance.

- `baseline-ready.log`: new actual-list regression fails with original HEAD Experience restored temporarily (raw references instead of names). Working implementation restored immediately afterward.
- `baseline.log`, `first.log`: earlier harness setup failures before `nuxt prepare`; no product assertion or test pass.
- `install.log`, `prepare.log`: frozen dependency install and Nuxt preparation.
- `after-core.log`: intermediate 60 pass/1 fail; old shared-only fixture lacked exact-query response. Fixed fixture transport, not production fallback.
- `focused.log`: 86 tests/9 files pass.
- `final-tests.log`: final 96 tests/10 files pass. Includes real Org list + Pinia + exact reader/query seam, full-reader preservation, authoring/detail/launch and Team-store regression suites.
- `build.log`: initial missing generated application-sdk-contracts/dist package entry. `build-prerequisite.log` builds that workspace dependency; `build-ready.log`: production web build passes. Generated prerequisite dist removed afterward; regenerate with `pnpm --filter @autobyteus/application-sdk-contracts build` when building.
- `typecheck.log`: vue-tsc executable absent; strict Vue typecheck NOT completed. No dependency additions or broad type fixes.
- `web-boundary.log`, `localization-boundary.log`: both guards pass.
- `ir001-source-manifest.json`: current source/test/doc hashes and nonempty line counts against base755831eb8.
- `render/`: real Nuxt development renderer/fresh headless Chrome, synthetic read-only HTTP response fixture only. Desktop1440x1000 and narrow760x1000; pending, ready, same-revision rename+Reload, search, error fallback. DOM/results/screenshots captured and inspected. This is NOT real provider/admission/API acceptance. Existing external Iconify glyphs were not visible in this isolated capture; icon names/classes remain identical in source. Actual normal icon availability remains downstream verification.
- Renderer fixture50882/Nuxt50883 stopped; browser closed; `render/cleanup.json`. No user processes/private packages/data touched.

Final test command (autobyteus-web):
`pnpm test:nuxt components/agentOrgs/__tests__ services/agentOrgDefinition/__tests__ components/workspace/config/__tests__/AgentOrgOwnedLaunch.spec.ts components/workspace/config/__tests__/AgentOrgRunConfigPanel.spec.ts stores/__tests__/agentTeamDefinitionStore.spec.ts --run`

## Independent API-REV-001
Current canonical API report Pass95.0%; independent26narrow/96expanded and serverbuild logs api-*.log. Actual backend/browser proof and synthetic replay setup in api-live/README.md; no provider needed, actual icons verified, zero runtime. Owned resources closed; source9unchanged. No API-owned durable changes or Git finalization.
