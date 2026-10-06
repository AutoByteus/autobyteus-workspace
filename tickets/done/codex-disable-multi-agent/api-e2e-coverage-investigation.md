# API/E2E Coverage Investigation

## Investigation Meta
API-REV-001 planned, initial baseline; trigger Implementation Complete IR-001. Current prior result N/A (not implied Pass). Canonical workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-disable-multi-agent-20261006`, branch `codex/disable-native-multi-agent-20261006`, intake HEAD `86e800d52` (source `ce028688bb452500578d5e8ff3633e72ac72b54e`). All paths below relative to this worktree unless absolute.
Read full active package: ticket `requirements-doc.md` (Approved SR-004/SD-AP-001), `design-spec.md` (Ready SR-005), `investigation-notes.md`, `solution-revision-record.md`, `solution-design-handoff.md`, `implementation-handoff.md`, `implementation-revision-record.md`; supplements `evidence/diagnostic/` and `evidence/version-01600/` are historical feasibility only. Read implementation evidence checks/provenance/self-review and legacy/state checks. Architecture/source reviews and triggering delivery/test review: N/A — not applicable, initial direct route. Canonical outputs: this file, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-case-ledger.md` in this ticket.

## Routing Classification
Small / Low confirmed; Direct Low-Risk input. Successful output route selected by get_handoff_rules after completion. Test review: **Not Required — direct low-risk route**.

## Current Requirement And Design Basis
REQ-006–009/AC-006–009 require actual native collaboration declarations and role tags absent, ordinary tools retained, effective precedence without personal-file mutation, scoped AutoByteus MCP still exposed/callable, create/restore exact identity/leases/cleanup retained, durable outcome oracle, and completed actual-model inventory from changed source. No per-thread policy/source manager/MCP changes authorized. Old suffix is removed; state Not Affected; no migration/reset or backward-compatibility behavior.

## Supported Scenarios And Real Usage
SCN-002 ordinary Codex run acquisition/start/restore/model turn; SCN-003 documented custom command/string/JSON config with enabled conflicts. Added independently meaningful checks: last lease release/new generation with same persisted thread and granted MCP read-only call plus rejected ungranted call. These are ordinary supported lifecycles, not artificial concurrency. Raw thread reenabling is technically possible but unsupported product config; not tested as a failing scenario.

## Changed Behavior / Surfaces
| Boundary | Change / preserved contract | Existing evidence | Remaining direct evidence |
| --- | --- | --- | --- |
| Launch composition / backend | Changed only final agents.enabled=false suffix | 13 unit cases | Production default manager spawning actual Codex |
| Native external tool definitions / role instructions | Native collaboration removed, ordinary tools preserved | Historical captures only | Positive real-binary control and changed-source capture |
| RPC / model provider / external integration | Preserved | Client/thread/bootstrap units | Completed real model inventory |
| Auth/config / grants | Preserved | Static no mutation, MCP materializer units | Private conflicts and personal-byte checks; real scoped MCP exposure/calls |
| Process lifecycle / saved identity | Preserved | Exact lease/thread units | Public create/stop/restore and physical close/new generation |
| Frontend/browser/desktop shell | Not changed | N/A | No browser or packaged app required for backend-local boundary |
| Data migration / workers / distributed coordination | Not changed | State Not Affected | No migration or distributed validation in scope |

## Project Execution Discovery
Read root AGENTS.md, DESIGN.md, full TESTING.md; server AGENTS.md, README Tests/Codex sections, package.json, vitest.config.ts, tests/setup/prisma-{env,global-setup,test-config}, startup/lazy-service design. No closer TESTING found, no instruction conflict. Node 22.23.1 / pnpm 10.28.2 / Vitest 4.0.18, macOS arm64; installed Codex 0.160.1. No dependency/lockfile changes needed.
- Documented smallest check: `pnpm -C autobyteus-server-ts exec vitest run <files> --no-watch`. File parallelism false. Global setup resets only this worktree `tests/.tmp/autobyteus-server-test.db`; no other process using it observed/assigned. Remove only this exact test DB/journal after execution.
- Native capture uses explicit `RUN_CODEX_NATIVE_SURFACE_TESTS=1`; no external credentials/network inference. Missing binary when explicitly gated fails (not success by skip).
- Current built system: `pnpm -C autobyteus-server-ts prebuild`, then `build`, serialized. Built Studio composition helper/project-mutation child fixture provides documented test-owned current-system pattern: private HOME/data/SQLite, project Prisma migration, free ports, normal initialization and shutdown. No installed/user application used.
- Bounded live smoke uses explicit additional live gate, private mode-0700 root and mode-0600 temporary Codex auth/catalog copy (authorized by approved package), never user config copied/written. Parent fingerprints source auth/config without retaining secret values, deletes copies. External CLI auth remains external, not vault/API-key remap. Readiness via initialized RPC, server health, scoped MCP status. No raw env or auth bytes retained.

## Existing Durable Coverage Inventory
| Path (server-relative) | Decision | Basis / action |
| --- | --- | --- |
| tests/unit/runtime-management/codex/client/codex-app-server-launch-config.test.ts | Still Valid | Current 13 cases cover AC-007; run |
| tests/unit/runtime-management/codex/client/{codex-app-server-client,codex-app-server-client-manager}.test.ts | Still Valid | RPC/lease preservation, run |
| tests/unit/agent-execution/backends/codex/{backend/codex-thread-bootstrapper,thread/codex-thread-manager,agent-tools-mcp/codex-agent-tools-mcp-materializer}.test.ts | Still Valid | Config/thread/materializer preservation, run |
| tests/integration/runtime-management/codex/client/codex-app-server-client-manager.integration.test.ts | Needs Update (deferred) | Removed getClient/acquireClient/releaseClient APIs and bare argv; cannot count skipped/stale cases; narrowly add valid replacement boundary coverage, no deletion |
| tests/integration/runtime-management/codex/client/codex-app-server-client.integration.test.ts | Out Of Scope for execution | Bare argv, inherited personal HOME, incomplete workspace cleanup; inspect protocol method, not acceptance evidence |
| tests/e2e/runtime/codex-standalone-send-message-global-routing.e2e.test.ts | Needs Update (deferred) | Old acquisition calls; reuse current HTTP/MCP method knowledge, not suite as proof |
| Historical probes | Use Temporary Executable Probe Only as method input | Not changed-source proof |

## Durable Coverage Decisions
Add `tests/integration/runtime-management/codex/client/codex-native-multi-agent-disabled.integration.test.ts`: local no-auth actual Codex requests from production default manager/parseArgs; unsuppressed control, default + enabled file conflict, string and JSON enabled conflicts; recursive top-level/input.additional_tools namespace oracle and native role/mode tags; ordinary set equal, intentional HTTP 400 distinctly recorded; exact cleanup. Red-run with old source must detect native collaboration leakage. No tests removed/updated.
Add narrowly gated current-built-system E2E + child fixture if maintainable: public create/stop/restore, current managers, scoped MCP status/calls, completed model inventory, identity and cleanup. Temporary-only live inventory acceptable if system setup becomes disproportionate; record actual decision before edits.

## Repository Coverage Execution Plan
1. A01 six focused unit suites (62 cases).
2. A02 positive control, A03 default policy, A04 string conflict, A05 JSON conflict, actual native request capture.
3. A06 intentional old-source regression red; restore byte-identical source, repeat green.
4. A07 serialized prebuild/build, production compilation; inspect durable test diff.
5. Score repository evidence then A08 bounded current-built-system live inventory/MCP/create/stop/restore if required.
All logs/evidence retained in `evidence/api-e2e/api-001/`; exact commands and exit results recorded as they run.

## Test-Case Ledger Decision
Required: multiple meaningful native cases plus bounded long-running authenticated system case and context interruption risk. Initialized before execution; per-case starts/results/checkpoints appended immediately.

## Post-Repository Confidence Scorecard
Initial planning checkpoint was unscored. Completed post-repository scorecard (85.0%) and final scorecard (95.83%) are recorded below; initial missing live evidence was subsequently closed. Mandatory seven categories will be scored after repository execution. User surface N/A: no changed renderer/shell/UI or full product-user-journey guarantee; this is backend external-runtime validation, not explicit user verification.

## Broader Validation Decision / Live Environment Plan
**Required**, selected Live API / CLI / Lifecycle, no browser. Native capture intentionally stops inference and cannot prove actual inventory or scoped MCP callability/create/restore. Build current source; private Studio process + auth-copy + workspace; public create/stop/restore; inspect actual default manager argv without env, exact thread IDs/model/config, MCP same-thread status and calls; one completed inventory (second only if needed for restored tool surface). Cleanup clients then owned server/ports, private root/auth, exact test DB. Expected final confidence >=95% with no category below90% if direct critical evidence completes. No user app restart or personal settings edit.

## Temporary / Not Tested / Triggers
Historical scripts are method only. No native spawn enforcement experiment, universal binary/model/OS support, packaged Electron/full-app restart/upgrade, unrelated runtimes or GitHub issue status claimed. These are out of approved scope, not failures. Supported per-thread reenabling, auth/MCP/lifecycle contract change or version framework need would route Design Impact/Requirement Gap before expanding. No current finding requiring reroute.

## Investigation Decision
Proceed Yes; add narrow durable coverage Yes; no removals. Initial result unresolved; broader Required; reroute before execution No.

## Execution refinement before system coverage edits
A01 units 62/62, A02–A05 capture 4/4. A06 intentional old source 3 failures on actual native tools; original restored exactly. Current-scope live durable choice: `tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts` with `tests/fixtures/codex-native-multi-agent-system.mjs`. Private current-built Studio, normal public HTTP Team definition/run and WebSocket user turns, automatic Team-scoped grants (get_handoff_rules/send_message_to/delegate_task/create_or_update_task), real Codex default manager. Successful read-only get_handoff_rules and list_projects RPC calls, rejected unknown target/send and ungranted tool, stop/restore/new physical generation/exact saved member+thread identity. Two bounded inventories (fresh/restored) instead of one close restored-context gap without real native or AutoByteus spawning. No scripted MCP admission or task command callbacks. Other configured member stays dormant. This is realistic backend/API validation, not renderer/full desktop journey.

## Repository evidence and confidence gate (before live execution)
A01 62/62 current units, zero skips. A02–A05 initial and restored green each 4/4; actual Codex0.160.1/gpt-6.1-sol declarations: positive control six native + five ordinary, production treatments zero native/same five ordinary/no native role or mode tags; private enabled config/string/JSON defeated. HTTP400 deliberately makes model turn failed, not live inference success. A06 old-source outcome red 3 fail/1 control pass; byte-exact source restoration; all owned cleanup true. A07 current prebuild and production build/sanitized bootstrap smoke exit0, fixture syntax check exit0. Actual scoped-system coverage authored; not yet executed.

| Mandatory category | Post-repository score | Support | Gap / next evidence |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | AC-007 and definition half of AC-006/009 direct | Completed inventory and actual MCP/lifecycle AC-008 missing |
| Changed-boundary execution directness | 100% | Default production manager/source argv to real binary actual declarations, positive/red controls | No material launch-composition gap |
| Cross-boundary integration realism and mock gap | 75% | Real binary/RPC/loopback requests; provider intentional failure | Real provider/Studio scoped MCP/calls pending |
| Environment/configuration/identity/fixture fidelity | 90% | Private file/args/env, correct installed version/model and cleanup | Actual saved thread identity and auth unchanged pending |
| Failure/edge/lifecycle/recovery | 75% | Config conflicts, intentional failed turns and exact physical client close | Public Stop/restore/new generation pending |
| User-surface/browser/desktop-shell | N/A | No changed UI/shell or full product journey guarantee; backend/API selected by TESTING | No renderer or packaged certification claimed |
| Durable regression quality/relevance | 95% | Outcome oracle detects actual old-policy leak; narrow maintainable gated real-binary suite | Requires installed dependency, intentionally bounded version/model |

Overall **85.0%** simple mean of six applicable categories. Critical criteria not all directly proven; target95 not met; no Pass. Broader **Required**, bounded current-built-system API/WS+CLI/MCP/lifecycle. Two actual model inventories plus successful scoped handoff read/list_projects and grants/negative dispatch, ordinary Stop/restore exact identity/new physical client cleanup can close missing evidence. No browser needed. Live auth uses protected temporary external CLI auth under approved authorization, not target vault or personal settings changes.

## A08 attempt 1 setup finding (before rerun)
Owned built Studio composition alone, unlike configured server startup, does not initialize token-schema migration readiness. Public Team create rejected before any native process/inference: TOKEN_USAGE_CURRENT_SCHEMA_REQUIRED. Source launch policy not reached. API-owned fixture setup Local Fix, not product defect or design finding. Exact attempt1 retained (system-attempt-1/); child/listener/root/auth cleanup all true, original auth/config unchanged. Fixture will execute real documented repository/vault/schema/app-data migration prerequisites from server-runtime.ts before Studio composition, deriving readiness from actual statuses (not forcing READY). No source change or broadened runtime contract. Reuse A08, preserve failed setup attempt and rerun same journeys.

## A08 attempt 2 oracle correction (before rerun)
Real current configured startup/HTTP Team/WS executed and one GPT-6.1-Sol inventory completed with collaboration_tools=[] and no tool execution. Same-thread MCP status and successful get_handoff_rules/list_projects plus rejected missing-target send reached their assertions. The ungranted create_or_update_project is rejected as RPC -32603 (disabled tool), not an isError business payload. API-owned probe wrongly expected the latter; correct oracle to assert RPC rejection. This is preserved-grant success, not source/MCP failure. Preserve entire attempt2 (including quota, completed answer, cleanup), rerun A08; no Pass from partial attempt. Live inventory says deferred AutoByteus names are not directly visible: do not infer external MCP missing from that self-report; actual full same-thread MCP definitions + successful actual calls are the authoritative external-tool evidence. Inventory corroborates native absence only. Final redo may use two additional bounded inventories, no tools/spawns initiated by model, exact original auth/config unchanged and private cleanup verified each attempt.

## Final Execution / Confidence Reconciliation
Current test development commit e2064977a094fe2c61e89606d150c5f80a597d5a; implementation source ce028688bb452500578d5e8ff3633e72ac72b54e unchanged.
A01 final units: 62/62. A02–A05 final native cases: 4/4, including canonical client reuse and exact lease release. Combined final run: seven files, 66 tests, zero skips. A06 latest tests on old source: three native-outcome failures / one positive pass; byte-exact source restoration then 4/4 green. A07 prebuild/build/syntax/test-diff checks pass. A08 final system: one explicitly gated E2E passes with two completed model inventories, fresh/restored scoped MCP success and negative grants, exact IDs and physical closes. Internal setup/oracle attempts retained; no unresolved finding.

| Mandatory category | Final score | Evidence / residual limit |
| --- | --- | --- |
| Requirement / acceptance proof | 95% | AC-006–009 direct on 0.160.1 / GPT-6.1-Sol; not universal dependency support |
| Changed-boundary directness | 100% | Production default manager/source and built bootstrap/thread path, real definitions and old-source red |
| Cross-boundary realism / mock gap | 95% | Actual binary/provider/HTTP/WS/scoped MCP; no final-system runtime/session doubles |
| Environment/configuration/identity/fixtures | 95% | Private conflicts, exact settings, public saved IDs/new generation, personal bytes unchanged |
| Failure/edge/lifecycle/recovery | 95% | Conflicts, intentional capture failure, missing target/disabled grant, canonical leases, Stop/restore/two physical closes |
| User-surface/browser/desktop shell | N/A | No changed UI/shell; no packaged/full-product or user-verification claim |
| Durable regression relevance | 95% | Real outcome controls and bounded live lifecycle, final red/green, honest dependency gates |

Overall **95.83%** = (95+100+95+95+95+95)/6. Every critical criterion directly proven for the approved bounded contract; no applicable category below 90%; clean target met. Broader **Required and completed**. Further broader execution **Not Required**: targeted live uncertainty closed, and excluded versions/models/native spawn/packaged guarantees are not additional supported requirements. No source expansion or migration. Test review remains Not Required — direct low-risk route. Canonical execution report is final round authority; Delivery owns docs/user verification/finalization.
