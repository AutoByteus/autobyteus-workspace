# IR-001 local implementation evidence

Date: 2026-09-14. Source implementation commit: `e8db80a9c90ef67ae744d62de1a27440553a4c48`. Not API/E2E sign-off.
Commands ran in this isolated worktree, with server commands from `autobyteus-server-ts` unless stated otherwise.

| Check | Command | Result / evidence |
| --- | --- | --- |
| Workspace setup | `pnpm install --frozen-lockfile` at root; `pnpm prepare:shared`; `pnpm exec prisma generate --schema prisma/schema.prisma` | Succeeded. Initial test collection failed before Prisma generation; corrected locally. Devkit-bin warnings during install concern unbuilt unrelated devkit. |
| Production compilation | `pnpm exec tsc -p tsconfig.build.json --noEmit` | Exit 0; empty diagnostic output. Production configuration, not a claim that the stricter test-inclusive configuration passes. |
| Focused server suite | `pnpm exec vitest run tests/unit/agent-collaboration tests/unit/agent-org-execution tests/unit/agent-team-execution tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/architecture --no-watch` | 55 files / 301 tests pass. `server-local-checks.txt`. |
| Final first-work check | `pnpm exec vitest run tests/unit/agent-collaboration/configured-root-first-work.test.ts --no-watch` | 48 tests pass after a test-only branded-address typing correction; `first-work-final-check.txt`. |
| Regression sensitivity | Same first-work test against original production source at 72dee5ad2, filtered with `-t 'scope stays Offline'` | 18 fail, all three placements report Idle instead of Offline. New tests paired with original production files temporarily; original implementation edits restored in a Python try/finally before further work. `base-source-regression.txt`. |
| Default typecheck | `pnpm exec tsc -p tsconfig.json --noEmit` | Fails TS6059: existing rootDir src with tests included. `typecheck-default.txt.gz`. |
| Expanded diagnostic comparison | `pnpm exec tsc -p tsconfig.json --noEmit --rootDir ..` with base production source, then current source | Still fails. Baseline 7459 diagnostics; current 7421; zero added and 38 removed after normalizing line/column and comparing `(file, diagnostic)` multiplicities. Full gzip text logs retained. This is diagnostic attribution, not a waiver or whole-repo pass. Baseline used new test files as they then existed, so removed diagnostics include callback migration/new-test corrections. |
| Frontend local checks | From `autobyteus-web`: `pnpm exec nuxi prepare`, then `pnpm test:nuxt stores/__tests__/agentTeamRunStore.spec.ts stores/__tests__/agentOrgContextsStore.spec.ts utils/__tests__/workspaceStatusDotPresentation.spec.ts components/workspace/org/__tests__/AgentOrgWorkspaceView.spec.ts --run` | 4 files / 39 tests pass; `frontend-local-checks.txt`. Initial missing .nuxt config collection failure fixed with prepare. DOM/store tests, not browser/restart verification. |
| Diff / source guardrails | `git diff --check`; changed production non-empty line count and numstat | Clean. 15 production files; max 487 non-empty lines (RootTeamRun), max changed-line total 65 (Org scope builder); all below 500/220 guards. |

Provider and activity boundaries in the new owner-level fixture are test doubles; root assembly, local handles, mutators, actual temporary execution-tree stores and persistence queues are real. Native/Codex/Claude rows verify planning/routing, not actual provider SDK sessions. Peer references are preserved as accepted records and forwarded input, not an end-to-end uploaded file-content check.

No user server restarted, provider conversation modified, migration/reset performed, or release/merge/push attempted. Tests use test-owned temporary files and test database setup. Independent API/E2E must still run the approved isolated browser-kept-open/server-restart journeys, backend candidate/run counting, conversation continuation and retained task/attachment cases.

## API-REV-003 evidence index (2026-09-14)
Current API authority: ../api-e2e-execution-coverage-report.md — Pass95.6%, not whole-product/build certification. Prior Fail rounds retained in ../api-e2e-revision-record.md; case history ../api-e2e-test-case-ledger.md.
- api-r3-narrow.log / api-r3-broad.log: independently19 /142 tests, narrow included.
- runtime-probe-r3/task-{a,b}-preselection-proof.json, task-{a,b,c}-once-only-proof.json and matching DOM: actual manual frontend approval producer/preselection/first-inspection/Approve/submission/review. F-002 actual closure.
- runtime-probe-r3/native-*-dom.txt, *telemetry.json: real native frontend fresh/used/never-used, same-focused restart, identity/marker continuation and unrelated Offline.
- runtime-probe-r3/bound-empty-replacement-proof.json: real direct external historical bound-empty provider replaced, same local ID.
- runtime-probe-r3/tasks-{before-crash,after-crash-repair}.json, post-repair-new-task-once-proof.json: natural interrupted repair, settled task nonrestart/new once release.
- runtime-probe-r3/accepted-loss-no-replay-proof.json / pending-external-final-proof.json: actual frontend accepted and pending loss, safe reopen/no automatic replay/deliberate Send.
- runtime-probe-r3/storage-fault-retry-proof.json: actual isolated EACCES rejection and successful frontend retry; earlier wrong-path zero explicitly invalidated. Not post-durability publication fault injection.
- runtime-probe-r3/browser-observations.jsonl and api-r3-observer.client.ts: passive native WS/public read-only state observations. Evidence observer copy only; temporary installed plugin removed.
- api-r3-finalization.log: owned services stopped/ports empty, four test tabs closed, permission0755 restored, whitespace check0. Data/provider test threads retained. No user state/integration/release changes.
Exact live internal fault/cross-product limitations and inherited typecheck failures are enumerated in current report. Proportional successful durable-test review remains next gate.
