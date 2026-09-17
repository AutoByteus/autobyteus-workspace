# CRR-004 source re-review audit

- Review entry: IR-003 implementation source re-review for CRR-003 / CR-002.
- Changed production owner: `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue`.
- Added durable regression: `autobyteus-web/components/workspace/org/__tests__/AgentOrgWorkspaceConfigBoundary.spec.ts`.
- IR-002 preservation: `validation/ir003-preservation.json` records 45 entries byte-identical and only the editor plus new boundary regression changed.
- Independent focused boundary execution: 1 file / 3 tests passed; see `validation/crr004-boundary.log`.
- Independent cumulative focused execution: 11 files / 88 tests passed; see `validation/crr004-web.log`.
- `git diff --check`: passed.

## CR-002 resolution trace

`ExistingRunConfigEditor` now derives separate scalar `selectedKind` and `selectedRunId` values and watches those semantic values. A same-run canonical context publication may still cause `AgentOrgWorkspaceView` and its target projection to rerender with fresh objects, but the watched scalar pair remains unchanged and no second load occurs. A real run-kind or run-ID change remains observable and triggers one load.

The new durable boundary regression mounts the actual `AgentOrgWorkspaceView` and actual `ExistingRunConfigEditor` for direct and mounted configured-member entry. Its read double deliberately replaces the reactive context and target with fresh semantically equivalent objects, matching the trigger observed in API-REV-001. Both placements perform one read, exit busy state, and render the Org form after additional flush cycles. A separate control changes the Org ID and proves exactly one legitimate reload.

Canonical context publication, the authoritative network read, store ownership, and the inline parent target remain unchanged. No downstream request suppression or cache masks the lifecycle defect.
