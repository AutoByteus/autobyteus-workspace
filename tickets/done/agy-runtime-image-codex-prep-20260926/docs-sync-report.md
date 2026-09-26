# Docs Sync Report — DR-002

## Scope
- Ticket: `agy-runtime-image-codex-prep-20260926`; Medium/High, reviewed route.
- Trigger: CRR-008 Not Applicable (no API-REV-004 durable test change) after API-REV-004 Pass/95.0% live browser journey; CRR-007 durable-test Pass and CRR-005 source Pass remain in force.
- Bootstrap base: `origin/personal@ae3aba1bf`; integrated base: `origin/personal@fc2a60527`, merged in ticket `ee0e2c313` before delivery edits.
- Post-integration verification: `delivery-integration-check.md` (5 API integration pass; 36 focused AGY unit pass; opt-in skips explicit).

## Why Docs Were Updated
The existing AGY runtime page still claimed 1.2.10 coverage and omitted the current 1.2.11 native allowlist, invocation-only image boundary, safe terminal failure, and configured-skill behavior. Package-root selection is a deployment-critical companion: the reviewed server update alone does not supply the Codex skill bundle.

## Long-Lived Docs Reviewed
| Doc Path | Result | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Updated | Current AGY runtime contract replaces stale 1.2.10/unspecified native-tool behavior. |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | Updated | Selected definition/source revision and stale duplicate root risk. |
| `autobyteus-server-ts/docs/modules/skills.md` | No change | Existing catalog/runtime distinction remains accurate; AGY-specific warning and source-safety contract belongs in AGY runtime page. |
| Repository `README.md` release instructions | No change | Existing release helper and tag-triggered workflows remain accurate; this ticket does not change release machinery. |

## Durable Knowledge Promoted
- New 1.2.11 capsules grant exactly E-048's eight native names, excluding native collaboration and native `call_mcp_tool`; scoped MCP is separate. Unsupported versions fail safely; old capsules are immutable.
- Provider-native image ACTIVE/DONE creates correlated generic tool-card STARTED/SUCCEEDED and ordinary reply; DONE may have no path. AGY owns storage; AutoByteus does not promise copied bytes, Files, preview, or retention. Native denial/error and failed terminal result have safe public/private handling.
- Missing/semantically invalid AGY configured skills warn/omit without blocking healthy startup; unsafe source/collision/mutation remains blocking. Package Codex workflow skill must come from the selected current `autobyteus-agents` source.

## Removed Or Replaced Understanding
- The old “validated on 1.2.10” compatibility statement is replaced by the exact 1.2.11 profile and unsupported-version gate.
- Superseded image-copy/transcript/Files/finalizing proposal is expressly not the delivered contract; no released component or persisted data is migrated or deleted.
- A server-only rollout is not treated as delivery of the separate Codex package.

## Delivery Continuation
- Result: Pass — docs synced to the integrated state.
- Current API-REV-004 browser observation corroborates these docs on a separately running backend/Nuxt/real Chrome path with selected package `a140474`; no runtime-doc correction was needed beyond DR-001. Next: user inspection/verification of the live tab and handoff, then conditional repository finalization/package publication and release choice. No remote push, target merge, tag, publication or deployment has occurred. The owned loopback services and isolated app-data are intentionally retained pending inspection, not a production deployment.
