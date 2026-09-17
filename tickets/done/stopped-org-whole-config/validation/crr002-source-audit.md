# CRR-002 source audit

- Review entry: implementation source re-review of IR-002.
- Prior finding: CR-001.
- Changed production owner: `autobyteus-web/stores/existingRunModelConfigStore.ts`.
- Changed durable regression: `autobyteus-web/stores/__tests__/existingRunModelConfigStore.spec.ts`.
- IR-001 preservation: `validation/ir002-preservation.json` records 44/46 entries byte-identical; current hashes match `validation/ir002-source-manifest.json`.
- Current store hash: `641d25209357e3847ca7589bc5a09ecbfe93c95506b68b348fdd9d74fe5f4d39`.
- Current store-test hash: `d71baed3afb137fb4fa064f8a6958f400c580ee3c4612891d38df3c812aa7dd1`.
- Independent focused execution: 10 files / 85 tests passed; see `validation/crr002-web.log`.
- The unchanged CRR-001 probe also passed independently together with the owning store suite: 2 files / 18 tests.
- `git diff --check`: passed.
- Temporary `node_modules` symlink and copied probe were removed after execution.

## CR-001 resolution trace

`saveAgentOrg` still accepts one aggregate result. For a determinate failure it now calls `applyAgentOrgFailureCanonical`, which parses and adopts the returned canonical execution tree and lifecycle/editability fields but retains the submitted hierarchy planner. `applyResultState` then publishes the exact scoped errors. Because only `PERSISTENCE_INDETERMINATE` enters `reconcileAgentOrgFailure`, validation, model/schema-unavailable, and confirmed pre-write persistence failures do not refresh or replace the draft. The indeterminate path performs the authoritative read and `syncAgentOrgCanonical`, replacing attempted values without resubmitting the mutation.

The durable real-store regression proves root and directly edited member attempts plus their patch plan and scoped errors survive a validation failure; correction produces one second aggregate Save and successful canonical adoption. Parameterized coverage confirms the other determinate outcomes retain the draft without a read, and the indeterminate case proves authoritative replacement.
