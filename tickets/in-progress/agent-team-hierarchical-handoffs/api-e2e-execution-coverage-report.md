# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements / design authority: `SR-018` / `ARCH-REV-011`
- Implementation / source review: `IR-037` / `CRR-067`
- Triggering durable-test review: `CRR-068 Fail — Local Fix`
- Current HEAD: `66cfe11e9057b0276c95cb5e9a01784d74b07499`
- Current revision: `API-REV-032`
- Prior completed result: `API-REV-031 Pass / 98%`
- Current result: **Pass / 98%**
- Resolved in this round: `TR-F-004`, `TR-F-005`
- Product/runtime disposition: API-REV-031 remains authoritative and unchanged; `API-F-022` / `CR-F-039` remains resolved downstream.
- Broader-validation decision: **Not Required**. This round changes only three durable server test fixtures, and CRR-068 explicitly requires focused repository execution rather than repeated browser/provider work.

## Coverage Investigation And Durable Decisions

The canonical investigation was currentized before any API-REV-032 durable edit. The bounded decisions were:

1. update `autobyteus-agent-run-backend-factory.test.ts` to remove the deleted `TaskAgentInstanceIdentity` boundary and represent only the actual task Agent run ID plus root-scoped task ID;
2. update `mixed-team-manager.test.ts` to remove the deleted `TaskTeamInstanceIdentity` boundary and represent only the actual task TeamRun ID plus task ID;
3. remove the stale generic standalone-egress case that manufactured retired route keys and task instance IDs;
4. retain the supported adjacent standalone status dedupe assertion and the unchanged strict Team handler assertion using `agent_execution` plus exact `TeamExecutionAddress` as replacement evidence.

API-REV-032 repository-resident delta:

- Updated: `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts`
- Updated: `autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts`
- Updated: `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-websocket-egress.test.ts`
- Added: none
- Removed paths: none; one stale test case was removed within the updated egress file.

Cumulative durable package:

- `92` paths: `3 added / 83 updated / 6 removed`
- `38 server / 54 web`
- Inventory: `api-e2e-evidence-sr018/api-rev-032/investigation/cumulative-durable-coverage-inventory.tsv`
- Full patch: `api-e2e-evidence-sr018/api-rev-032/investigation/cumulative-durable-diff.patch`
- Audit: `api-e2e-evidence-sr018/api-rev-032/investigation/cumulative-durable-inventory-audit.log`
- Reverse-apply proof: `api-e2e-evidence-sr018/api-rev-032/investigation/cumulative-durable-patch-integrity.log`

The cumulative package still requires a successful proportional test-code review before delivery.

## Focused Repository Execution

Working directory:

`/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts`

Command:

```bash
pnpm exec vitest run \
  tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts \
  tests/unit/agent-team-execution/mixed-team-manager.test.ts \
  tests/unit/services/agent-streaming/agent-stream-websocket-egress.test.ts \
  tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts
```

Result: **Pass — 4 files / 65 tests**.

Evidence: `api-e2e-evidence-sr018/api-rev-032/repository/crr068-focused-final.log`.

The unchanged Team handler selection directly retains persistent, direct task Agent, outer task Team, nested task Team, exact event projection, invalid/stale-address rejection, and no-fallback behavior. The generic standalone egress selection retains exact duplicate suppression, payload-transition forwarding, cadence, disposal, and incomplete-identity fail-open behavior without manufacturing Team compatibility payloads.

## Static And Package Integrity Evidence

`api-e2e-evidence-sr018/api-rev-032/repository/crr068-static-audit.log` proves:

- zero `TaskAgentInstanceIdentity`, `TaskTeamInstanceIdentity`, `taskAgentInstanceId`, `taskTeamInstanceId`, or synthetic task instance wrapper occurrences in the two corrected identity fixtures;
- zero `member_route_key`, `source_route_key`, `team_route_key`, `task_team_relative_member_route_key`, `task_agent_instance_id`, or `task_team_instance_id` occurrences in generic standalone egress coverage;
- strict Team replacement coverage still asserts `agent_execution.kind = task_team_agent` with exact `execution_address`;
- all `86` active cumulative durable paths have resolvable relative imports;
- focused `git diff --check` passes.

The cumulative inventory audit proves:

- `92` inventory rows and unique paths;
- status counts exactly `A:3`, `M:83`, `D:6`;
- scope counts exactly `server:38`, `web:54`;
- exact inventory/patch path equality;
- zero status mismatches against the worktree;
- `92` unique patch path headers;
- reverse application and cumulative diff hygiene pass.

## Retained API-REV-031 Product And Real-System Evidence

No production or environment boundary changed in API-REV-032. The following API-REV-031 evidence remains authoritative rather than being needlessly repeated:

- actual Team communication hydration service seam: `2/2`;
- service/store/mobile selection: `11/11`;
- current web selection: `49 files / 345 tests`;
- current retained server selection: `76 files / 573 tests`, with twenty declared capability skips excluded from real-provider claims;
- server production TypeScript and `build:full` including sanitized bootstrap;
- Nuxt production build and fifteen prerendered routes;
- checked disposable-target setup, exact PID database-path proof, interactive vault import only into the disposable target, and exact cleanup;
- real active and persisted desktop/mobile Team communication/reference path on AutoByteus;
- retained current AutoByteus/Codex/Claude standalone and imported-Team provider matrix.

No product finding, environment finding, or browser/provider uncertainty was reopened by CRR-068.

## Environment, Database, And Cleanup

API-REV-032 started no server, frontend, browser, provider runtime, checked launcher, vault import, or live migration. The focused Vitest setup reset only the repository-owned test SQLite database:

`/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`

It did not target, inspect, open, copy, migrate, repair, roll back, or delete the operational database. Protected `127.0.0.1:60004/31004`, the delivery stash, and backup were untouched. Both historical incident disclosures remain preserved:

- `api-e2e-evidence-sr015/api-rev-014/live/server-environment-collision-analysis.md`
- `api-e2e-evidence-sr015/api-rev-018/live/operational-production-db-targeting-incident.md`

No API-REV-032 process or disposable live resource required cleanup.

## Confidence Scorecard

| Category | Score | Evidence and residual uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | API-REV-031 real product evidence is unchanged; the bounded stale fixtures now match the current SR-018 identity contract. |
| Changed-boundary execution directness | 100% | Both corrected identity fixtures and the supported standalone/strict Team egress boundaries executed directly. |
| Cross-boundary integration realism and mock gap | 99% | API-REV-031 real browser/GraphQL/WebSocket/provider evidence remains authoritative; no production boundary changed here. |
| Environment, configuration, identity, and fixture fidelity | 99% | Current run-ID/task-ID facts replace deleted instance wrappers; active relative imports are clean; only the repository test DB was used. |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Current task lifecycle/no-fallback and strict invalid/stale execution-address coverage pass; API-REV-031 recovery evidence remains intact. |
| User-surface, browser, and desktop-shell confidence | 96% | Real desktop/mobile browser proof remains current. Electron-shell-specific behavior is unchanged and outside this test-only round. |
| Durable regression coverage quality and relevance | 96% | TR-F-004/005 are removed without compatibility restoration; exact current replacement boundaries pass. Proportional re-review remains required. |

Overall confidence: **98%** (`686 / 7 = 98.0%`). No category is below `90%`; no critical current behavior is missing or failing.

## Outcome And Routing

- Authoritative outcome: **Pass / 98%**.
- `TR-F-004`: **resolved**.
- `TR-F-005`: **resolved**.
- API-REV-031 product/runtime Pass and `API-F-022` resolution: **retained unchanged**.
- Required recipient: `code_reviewer` for proportional re-review of the complete `92`-path durable package.
- Delivery remains blocked until that proportional review passes.
