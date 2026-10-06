# API/E2E Execution Coverage Report

## Latest Authoritative Result
**API-REV-001: Pass — 95.83% confidence.** Broader validation **Required and completed**. Every critical acceptance criterion has direct evidence for the approved bounded scope; no applicable confidence category is below 90%.

Package: codex-disable-multi-agent-20261006. Initial baseline; prior API result/confidence: N/A. Approved requirements SR-004 / SD-AP-001, Ready design SR-005, implementation IR-001. **Small / Low**, direct low-risk route. Successful test review: **Not Required — direct low-risk route**. Architecture/source reviews and triggering delivery/test-review artifacts: **N/A — not applicable**; no reviewer pass fabricated.

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006`, branch `codex/disable-native-multi-agent-20261006`. Implementation source commit `ce028688bb452500578d5e8ff3633e72ac72b54e`; intake package HEAD `86e800d52`; API test development commit `e2064977a094fe2c61e89606d150c5f80a597d5a`. Runtime source remains byte-identical to intake after controlled red testing. Development test commit only: no delivery finalization, merge, push, release or deployment.

## Cumulative Package
All canonical ticket paths are below `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/tickets/in-progress/codex-disable-multi-agent/`:
- `requirements-doc.md`, `design-spec.md`, `investigation-notes.md`, `solution-revision-record.md`, `solution-design-handoff.md`.
- `implementation-handoff.md`, `implementation-revision-record.md`, `evidence/implementation/ir-001/`.
- `api-e2e-coverage-investigation.md`, this report, `api-e2e-revision-record.md`, `api-e2e-test-case-ledger.md`.
- Historical supplements: `evidence/diagnostic/`, `evidence/version-01600/`, `solution-history/sr-003-diagnostic/`. These establish feasibility, not changed-source acceptance. The historical finalized project-task-manager-linked-delegation API-023/FAPI-013 remains read-only.
- Current evidence: `evidence/api-e2e/api-001/`; manifests, commands, receipts, hashes, cleanup and resolved attempts retained there.

Legacy/removal check: clean replacement, no dual feature strategy or compatibility branch. Persisted-state decision: **Not Affected**. No schema, personal config/auth, model catalog or history rewrite/reset; no migration introduced.

## Requirement / Scenario Mapping
| AC / requirements | Direct proof | Result |
| --- | --- | --- |
| AC-006 / REQ-006/009 / SCN-002 | Positive real-binary control exposes six native collaboration tools, five ordinary tools and both native role/mode tags. Production default/string/JSON treatments expose no native collaboration or native tags; ordinary definitions equal the positive control. Fresh/restored completed actual-model inventories agree. | Pass |
| AC-007 / REQ-007 / SCN-003 | 13 valid launch-config units cover default/string/JSON/fallback/conflicts/order/command/array isolation. Actual private enabled file and string/JSON enabled conflicts lose to the production policy. | Pass |
| AC-008 / REQ-008 / SCN-002/003 | Current units plus actual public Team creation, WS user input, MCP-only thread config, scoped MCP definitions/calls/grants, Stop/restore/exact identity/new client generation and physical cleanup. Original personal auth/config bytes unchanged. | Pass |
| AC-009 / REQ-009 | Latest durable native oracle fails on old source: three treatments fail on actual native declarations, positive control passes. Source restored exactly, then four cases pass. Source/binary/build/test hashes, completion layers and cleanup retained. | Pass |

BEH-002 is corrected, BEH-003 preserved, BEH-001 provenance retained. The actual Team member lifecycle reaches the common production launch owner. Arbitrary raw per-thread reenabling is not a supported product scenario; no policy framework or forced user-process restart was added.

## Discovery / Validation Surfaces
Read root AGENTS.md, DESIGN.md and full TESTING.md; server AGENTS.md, README test/Codex sections, package/Vitest/test-database configuration and startup/lazy-service contract. No closer guideline or conflict found.

The change affects backend process launch and external Codex tools, not UI or Electron shell. Validation uses documented Vitest commands, current production builds and an owned built Studio composition. Its repository/schema/vault/app-data startup prerequisites execute on disposable SQLite and derive readiness from actual migration results. Public HTTP/WS operations, default Codex manager, provider and scoped MCP are real; no scripted session admission or task callbacks. This is realistic backend/API validation, **not** a full desktop journey or explicit user verification.

## Commands / Results
Commands run from the worktree root. Builds/tests serialized; no shared-output overlap.

| Cases | Command / configuration | Result / evidence under evidence/api-e2e/api-001/ |
| --- | --- | --- |
| A01 | `pnpm -C autobyteus-server-ts exec vitest run <six unit files> --no-watch` | Initial 62/62; `units.log` |
| A02–A05 | `RUN_CODEX_NATIVE_SURFACE_TESTS=1 CODEX_NATIVE_SURFACE_EVIDENCE_DIR=<absolute output> CODEX_NATIVE_SURFACE_LEDGER=<absolute ledger> pnpm -C autobyteus-server-ts exec vitest run tests/integration/runtime-management/codex/client/codex-native-multi-agent-disabled.integration.test.ts --no-watch` | Final 4/4; `native-final-green/` and `native-after-final-red-green/`, corresponding logs |
| A06 | Controlled substitution from `git show f48dbfbf39bbf9ed76116943e304248ca387dc7f:autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-launch-config.ts`; same gated native command; finally restore original bytes | Expected exit 1: three native-outcome failures / one positive pass. `native-final-red.log`, receipts, `final-red-provenance.json`; restored green exit 0 |
| A07 | `pnpm -C autobyteus-server-ts prebuild`, then `pnpm -C autobyteus-server-ts build` | Exit 0; production tsc/assets/sanitized bootstrap smoke; `prebuild.log`, `build.log` |
| A07 | Final combined six unit files plus native integration file, explicit native gate, `--no-watch` | Seven files, 66/66 tests, zero skips; `final-repository.log` |
| A07 | `node --check autobyteus-server-ts/tests/fixtures/codex-native-multi-agent-system.mjs`; explicit three-test-path staged `git diff --cached --check` before development commit | Exit 0; `coverage-self-review.md`, `coverage-change.patch` |
| A08 | `RUN_CODEX_E2E=1 RUN_CODEX_NATIVE_POLICY_LIVE=1 CODEX_NATIVE_POLICY_AUTH_FILE=/Users/normy/.codex/auth.json CODEX_NATIVE_POLICY_EVIDENCE_DIR=<absolute output> CODEX_NATIVE_POLICY_LEDGER=<absolute ledger> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts --no-watch` | Final exit 0, one explicitly gated test, two completed model inventories; `system-attempt-3.log`, `system-attempt-3/system.json`, `system.log` |

The six units are server-relative:
- `tests/unit/runtime-management/codex/client/{codex-app-server-launch-config,codex-app-server-client,codex-app-server-client-manager}.test.ts`.
- `tests/unit/agent-execution/backends/codex/{backend/codex-thread-bootstrapper,thread/codex-thread-manager,agent-tools-mcp/codex-agent-tools-mcp-materializer}.test.ts`.

The built-system parent uses the project Prisma migration command on its private database: `node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma`. No developer database copied. Whole-backend tests were not run; stale/skipped legacy integrations are not counted.

## Broader Validation Observations
Post-repository confidence was 85.0% because model completion, actual MCP and saved lifecycle evidence were missing. The targeted Live API / CLI / Lifecycle run closed these gaps:
- Public HTTP creates owned Agent/Team definitions and run. WS sends two inventory-only user requests, fresh then restored. Only the Manager executes; Worker stays dormant. Model `gpt-6.1-sol`, reasoning `low`, autoExecuteTools=false, read-only sandbox.
- Final Team ID `native_policy_team_68417c5d40814e36b0ab636599e17734`; AgentRun ID `native_policy_manager_27a85bba25e7488babd376ce91194ddc`; exact Codex thread ID `01a111ee-d11e-7133-bdb0-9267390619a9` retained across public Stop/restore. Public saved platform binding matches the actual thread. Client objects differ between generations; both Stops physically close their client and subsequent RPC rejects as not started.
- Both final model turns complete, report `collaboration_tools=[]`, preserve ordinary `functions.exec`/`clock.sleep`, and execute **zero tools**.
- Actual same-thread granted MCP definitions, fresh and restored: `get_handoff_rules`, `send_message_to`, `delegate_task`, `create_or_update_task`, `list_projects`. Successful `get_handoff_rules` returns the configured rule to `/worker`; successful `list_projects` returns the empty owned catalog. A safe missing-target `send_message_to` reaches `TARGET_AGENT_RUN_NOT_ACTIVE`; ungranted `create_or_update_project` is rejected as an explicit disabled-tool RPC.
- **The live inventory does not enumerate deferred AutoByteus tools.** It cannot establish their absence. Full same-thread MCP definitions and successful actual calls are the external-tool evidence; inventory corroborates native absence only.
- Actual thread config contains only `mcp_servers`; private config enables agents while default production argv ends with the disabling policy. Model/reasoning settings, exact IDs and workspace sentinel remain intact.

Reported model usage: final turns 7,856 + 8,117 = 15,973 tokens. Attempt 2 completed one earlier inventory (7,878 tokens) before an oracle correction, so this round used three completed inventories / 23,851 reported tokens. No exact billing claim.

### Retained Development Attempts
1. Missing token-readiness startup prerequisite in the test fixture: Team creation rejected before inference. Corrected by executing the actual configured-startup prerequisites on the owned database, not forcing readiness.
2. Wrong probe oracle for an ungranted tool: expected an isError payload, but actual correct behavior is RPC disabled-tool rejection. Fresh model inventory and preceding MCP calls had succeeded. Corrected test assertion only.

Both attempts are retained and fully cleaned, with original auth/config unchanged. No source defect or design change. Final Pass uses completed attempt 3, not partial evidence. These were internal API-owned setup/oracle corrections, not earlier completed API validation rounds or handoffs.

## Confidence Scorecard
| Mandatory category | Post-repository | Final | Supporting evidence / limit |
| --- | --- | --- | --- |
| Requirement / acceptance proof | 75% | 95% | Critical ACs direct on tested version/model; not universal support |
| Changed-boundary directness | 100% | 100% | Production composer/default manager, actual requests, old-source red, built path |
| Cross-boundary realism / mock gap | 75% | 95% | Actual Codex/provider/HTTP/WS/scoped MCP; no final-system runtime doubles |
| Environment/config/identity/fixtures | 90% | 95% | Conflicts, real settings, protected auth, public saved IDs, personal bytes unchanged |
| Failure/edge/lifecycle/recovery | 75% | 95% | Conflicts, grants/rejections, real leases, Stop/restore/new generation/physical closes |
| User-surface/browser/desktop shell | N/A | N/A | No changed UI/shell or full-product promise |
| Durable regression relevance | 95% | 95% | Real outcome controls, final red/green, honest binary/live gates |

Simple mean of six applicable categories: **85.0% → 95.83%**. Target ≥95% met; no category <90%; no critical evidence missing. Further broader validation **Not Required** within approved scope: targeted uncertainty is closed; exclusions below are not additional supported requirements.

## Durable Coverage Added
Only these three files were added; no existing tests updated, removed or disabled:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/autobyteus-server-ts/tests/integration/runtime-management/codex/client/codex-native-multi-agent-disabled.integration.test.ts`.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/autobyteus-server-ts/tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts`.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006/autobyteus-server-ts/tests/fixtures/codex-native-multi-agent-system.mjs`.

They and the cumulative package are attached at handoff. Successful proportional review is Not Required — direct low-risk route. `coverage-self-review.md` is a self-check, not an independent review.

## Evidence Layers / Cleanup / Platforms
The no-auth loopback provider deliberately returns HTTP 400 **after** capturing actual declarations. Those turns fail intentionally and are not successful inference. Positive bare argv and old-source substitutions are temporary test controls only. Historical captures are not changed-source proof.

The live system uses actual Codex/provider/auth/MCP/runtime/HTTP/WS. Owned fixtures include private HOME/CODEX_HOME/workspace/SQLite/vault, empty Projects and disposable definitions. Authentication is a protected temporary external CLI login copy, not a vault/API-key remap; private root mode 0700, auth mode 0600. No personal configuration copy or write.

Every capture client physically closes; loopback listener closes and fetch fails; private roots disappear. Each system child exits normally, Studio/scoped MCP host closes through owned lifecycle, public listener no longer responds, and private root/auth/catalog/database/vault is removed. Final two Codex client close callbacks and closed-client RPC checks pass. Original personal auth/config bytes remain unchanged in every attempt. No user application or unrelated process stopped/restarted.

Exact owned Vitest DB/journal removed (`test-db-cleanup.json`). Inherited SDK dist prerequisites remain untracked for Delivery; no build outputs staged. Implementation-owned late receipt untouched. Credential/live-session scan is clean; no auth.json, raw environment, vault key or DB retained. Manifest/provenance records exact binary and file hashes.

Platform: macOS Darwin arm64; Node 22.23.1, pnpm 10.28.2, Vitest 4.0.18, Codex 0.160.1, GPT-6.1-Sol (low). Persisted-state decision Not Affected; actual normal reader resumes the saved thread and public platform binding. No new migration, version branch, dual reader or fallback.

## Residual Limits / Next Stage
Not claimed: actual native spawning/enforcement beyond tool absence; actual AutoByteus delegation or successful message delivery; all other models/versions/OSes; standalone/Org/Task-copy full-product journeys; renderer/Electron/full-app restart/upgrade; explicit user verification; GitHub issue status. The shared production owner, valid units and real member lifecycle prove this narrow correction. Stale old manager integrations are identified and excluded, not deleted.

A01–A08 final results are Pass; intentional red failures prove the oracle. Development fixture failures are resolved, with no unresolved finding or blocker. No Requirement Gap, Design Impact or source rework recommendation. Delivery retains narrow `codex_integration.md` sync, explicit user verification, integrated finalization/cleanup and any authorized release work. Recipient must be the exact configured rule result. No Delivery Completed or Terminal claimed here.

## Configured Handoff Selection
After the completed result/package was persisted, get_handoff_rules selected the sole applicable direct Small/Low Pass rule: **/delivery_engineer**. Large/High test review, execution Fail and upstream-gap rules do not apply. Test review Not Required — direct low-risk route. Rule receipt: handoff-rules-api001.json. Message acceptance is recorded separately; no delivery completion inferred.
