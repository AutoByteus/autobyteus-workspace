# Docs Sync Report — DR-009 / SR-024 server-only scope correction

## Scope
- Ticket: `agy-runtime-image-codex-prep-20260926`; Medium/High, reviewed route.
- Trigger: approved SR-024/E-057 server-only de-scope after user rejected the separate package PR. CRR-008 Not Applicable, CRR-007 durable-test Pass, CRR-005 source Pass, and API-REV-004 Pass/95.0% retain their actual server evidence; the locally selected package-content portions are historical, not ambient-main acceptance.
- Bootstrap base: `origin/personal@ae3aba1bf`; initial integrated base: `origin/personal@fc2a60527` in `ee0e2c313`. The SR-024 documentary correction `27daac5ba` was merged with latest `origin/personal@4fec5eef6` as `cb9fe06d0` before this resync.
- Post-integration verification: initial `delivery-integration-check.md` (5 API integration pass; 36 focused AGY unit pass; opt-in skips explicit), plus current `delivery-sr024-integration-test.log` (4 focused suites, 36 pass/1 preexisting skip). No server source or test behavior changed in SR-024.

## Why Docs Were Updated
The initial AGY runtime page claimed stale 1.2.10 behavior, so DR-001 synced it to the reviewed 1.2.11 server contract. The later user de-scope made two long-lived statements inaccurate: they implied this ticket deployed a separate Codex skill bundle. SR-024 retains missing/invalid-skill warn/omit/start but explicitly excludes package content. Both affected pages were corrected without rewriting unrelated package-system documentation.

## Long-Lived Docs Reviewed
| Doc Path | Result | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Updated again | Current AGY runtime contract and missing-skill startup are accurate; no claim that the separate package contains a workflow skill. |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | Updated again | Generic selected-source guidance retained; false task-specific bundle guarantee removed. |
| `autobyteus-server-ts/docs/modules/skills.md` | No change | Existing catalog/runtime distinction remains accurate; AGY-specific warning and source-safety contract belongs in AGY runtime page. |
| Repository `README.md` release instructions | No change | Existing release helper and tag-triggered workflows remain accurate; this ticket does not change release machinery. |

## Durable Knowledge Promoted
- New 1.2.11 capsules grant exactly E-048's eight native names, excluding native collaboration and native `call_mcp_tool`; scoped MCP is separate. Unsupported versions fail safely; old capsules are immutable.
- Provider-native image ACTIVE/DONE creates correlated generic tool-card STARTED/SUCCEEDED and ordinary reply; DONE may have no path. AGY owns storage; AutoByteus does not promise copied bytes, Files, preview, or retention. Native denial/error and failed terminal result have safe public/private handling.
- Missing/semantically invalid AGY configured skills warn/omit without blocking healthy startup; unsafe source/collision/mutation remains blocking. A configured name does not prove content exists; the separate package remains unchanged.

## Removed Or Replaced Understanding
- The old “validated on 1.2.10” compatibility statement is replaced by the exact 1.2.11 profile and unsupported-version gate.
- Superseded image-copy/transcript/Files/finalizing proposal is expressly not the delivered contract; no released component or persisted data is migrated or deleted.
- The earlier package-copy/README/link-repair plan is withdrawn; a server-only delivery is not treated as delivery of a Codex workflow-skill bundle.

## Delivery Continuation
- Result: Pass — long-lived docs now match the integrated SR-024 server-only scope.
- API-REV-002's real AGY missing/malformed-skill SUCCESS/READY supports reduced AC-003/004. API-REV-004's browser native-image path supports the server contract, but its selected local `a140474` skill-content observation does not prove ambient package-main content. The user explicitly tested the rebuilt Electron App and authorized repository-only finalization; no version, tag, release, publication or deployment is authorized. PR #14 remains closed unmerged.
