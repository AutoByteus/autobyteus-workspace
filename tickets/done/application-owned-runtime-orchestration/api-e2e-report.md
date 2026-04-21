# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/review-report.md`
- Current Validation Round: `12`
- Trigger: `Round 12 resumed on 2026-04-21 after review round 20 passed the long-canonical-id persisted-state reconciliation Local Fix for AOR-E2E-018.`
- Prior Round Reviewed: `11`
- Latest Authoritative Round: `12`

Round rules:
- Reuse the same scenario IDs across reruns for the same scenarios.
- Create new scenario IDs only for newly discovered coverage.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial implementation review pass | N/A | 0 | Pass | No | Added/imported the initial durable runtime/recovery/iframe validation set. |
| 2 | Review round 6 pass after AOR-LF-005 and AOR-LF-006 | 0 | 0 | Pass | No | Rechecked runtime/recovery/iframe coverage and added backend-mount transport plus GraphQL executor checks. |
| 3 | Review round 8 pass after AOR-LF-007 | 0 | 1 | Fail | No | Packaged generated GraphQL client could not import due missing vendored frontend-sdk dependency. |
| 4 | Review round 9 pass after packaged-client fix | 1 | 0 | Pass | No | Packaged-client imports and imported-package integration path passed. |
| 5 | User-requested live backend+frontend+browser validation | 0 | 2 | Fail | No | Real provider-backed runs exposed qwen3.6 artifact-completion and manual-tool/artifactRef issues. |
| 6 | Review re-review pass after AOR-LF-008 and user-requested full frontend journey test | 2 | 1 | Fail | No | `/applications` journey still lacked the authoritative setup surface and qwen3.6 still did not finish. |
| 7 | Review round 13 pass after AOR-LF-009 | 2 | 0 | Pass | No | Real `/applications` setup gate became authoritative and the qwen3.6 Brief Studio flow completed in the live UI. |
| 8 | Review round 14 pass for slot-driven setup summaries | 0 | 0 | Pass | No | Live schema/codegen and real catalog/setup surfaces passed without regressing the host gate. |
| 9 | User-requested stricter second full-browser Brief Studio scenario set | 0 | 0 | Pass | No | Repeated the main live business flow plus multi-brief, refresh/reopen, and rerun history coverage. |
| 10 | Review round 17 pass after AOR-LF-010 and AOR-LF-011 | 0 | 0 | Pass | No | Live `/backend/reload` proved retryable `REENTERING`, stale-worker invalidation, and post-reentry fresh-worker boot. |
| 11 | Review round 19 pass after AOR-LF-012 | 0 | 1 | Fail | Yes | Real imported-package removal still fell through to `404`; persisted-known inventory reconciled the hashed storage key instead of the real long canonical `applicationId`. |
| 12 | Review round 20 pass after AOR-E2E-018 Local Fix | 1 | 0 | Pass | Yes | Focused reruns passed, real imported-package removal now returns `503` / `QUARANTINED` on the real long canonical `applicationId`, and temporary proofs show persisted-known inventory plus shared availability reconciliation now use the real id instead of the hashed storage key. |

## Validation Basis

- Requirements focus areas exercised across authoritative rounds: `R-001` through `R-005`, `R-010` through `R-014`, `R-021` through `R-025`, `R-031`, `R-032`, `R-037`, `R-038`, `R-044` through `R-049`, `R-051`, `R-052`, `R-065`, `R-067` through `R-073`.
- Design focus areas exercised across authoritative rounds: `DS-001`, `DS-002`, `DS-003`, `DS-004`, `DS-007`, `DS-008`, `DS-009`, `DS-010`, `DS-011`, `DS-012`.
- Implementation handoff signal rechecked in round 12: long canonical imported application ids are now expected to persist and recover through platform-state metadata / safe fallback inventory so live package remove/reload keeps backend admission blocked behind persisted-only quarantine on the real `applicationId`.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- Server integration validation with real Fastify REST + websocket routes, real application worker launch, real app storage, real event journal/dispatch, and emulated team-run execution resources.
- Server integration validation for hosted backend-mount route transport semantics derived from `backendBaseUrl`.
- Focused server unit/integration validation for package registry, file bundle provider, platform-state inventory, availability / re-entry / gateway blocking, recovery, and imported-package behavior.
- Web component validation for iframe ready/bootstrap v2 contract and host-side launch/setup ownership from earlier authoritative rounds.
- Real local backend + frontend/browser validation for the Brief Studio host flow and provider-backed business flow from earlier authoritative rounds 7-10.
- Round-12 executable validation for the live imported-package remove path through real GraphQL + REST boundaries.
- Round-12 temporary built-output proofs for `ApplicationPlatformStateStore.listKnownApplicationIds()` and `ApplicationAvailabilityService.reconcileCatalogSnapshotWithKnownApplications(...)` using the real round-12 live server data.

## Platform / Runtime Targets

- Node.js local runtime on macOS host.
- `autobyteus-server-ts` worker-launched application backend.
- `autobyteus-web` Nuxt dev server at `http://localhost:3000` in prior authoritative browser rounds.
- Brief Studio and Socratic Math Teacher built-in application packages hosted from the live backend.
- Round-12 imported package target: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/brief-studio-importable-copy`
- LM Studio at `http://127.0.0.1:1234`, with authoritative live qwen3.6 runs from rounds 7 and 9 using `qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234`.

## Lifecycle / Upgrade / Restart / Migration Checks

- Recovery owner reattached persisted nonterminal bindings and rebuilt global lookups in durable validation.
- Startup gate blocked live `publish_artifact` ingress until recovery release in durable validation.
- Imported-package integration still exercised live `RUN_STARTED`, artifact projection, `RUN_TERMINATED`, and packaged-client hosted backend-mount behavior.
- Round-7 through round-10 live browser/runtime validation remains authoritative for the host setup gate, provider-backed Brief Studio business flow, multi-brief/rerun behavior, and repaired-app re-entry.
- Round-12 live executable validation proved that a real imported app with an over-200-character canonical `applicationId` can materialize persisted platform state, be removed through the live package-registry boundary, and still remain behind persisted-only `QUARANTINED` admission on the real `applicationId` rather than dropping to hashed-key `404` behavior.
- Direct public live `reloadPackage` execution is still not exposed as an HTTP/GraphQL endpoint; round-12 therefore rechecked the live remove path plus the shared persisted-known-id inventory / availability reconciliation proof. The focused durable batch still covers the reload branch and passed unchanged.

## Coverage Matrix

| Scenario ID | Requirement / Design Anchor | Boundary | Method | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| `AOR-E2E-001` | `R-001`, `R-021`, `DS-001` | Imported package discovery + host launch readiness | Server integration (`brief-studio-imported-package.integration.test.ts`) | Pass | Still healthy. |
| `AOR-E2E-002` | `R-002`, `R-003`, `R-004`, `DS-002` | App-owned `createBrief` -> `runtimeControl.startRun(...)` | Server integration | Pass | Still healthy. |
| `AOR-E2E-003` | `R-010`, `R-011`, `R-025`, `DS-003` | Live artifact ingress -> journal -> dispatch -> app projection | Server integration | Pass | Still healthy. |
| `AOR-E2E-004` | `R-025`, `DS-004` | Bound run lifecycle delivery | Server integration | Pass | Still healthy. |
| `AOR-E2E-005` | `R-014`, `DS-007` | Restart recovery / lookup rebuild / reattachment | Server unit | Pass | Still healthy. |
| `AOR-E2E-006` | `R-014`, `DS-007` | Startup-gated live artifact ingress | Server unit | Pass | Still healthy. |
| `AOR-E2E-007` | `R-023`, `R-024`, `DS-001` | Iframe ready/bootstrap v2 contract | Web component | Pass | Still healthy. |
| `AOR-E2E-008` | `R-023`, `R-024`, `DS-001` | Host-side launch ownership | Web component | Pass | Still healthy. |
| `AOR-E2E-009` | `R-012`, `R-032`, `R-037`, `DS-008` | Hosted backend-mount route transport semantics | Server integration | Pass | Still healthy. |
| `AOR-E2E-010` | `R-012`, `R-031`, `R-038`, `DS-008` | App-owned GraphQL single-operation dispatch contract | Server unit | Pass | Still healthy. |
| `AOR-E2E-011` | `R-031`, `R-037`, `R-038`, `DS-001`, `DS-008` | Packaged generated GraphQL client -> hosted backend mount -> app backend | Server integration + executable import probes | Pass | Still healthy. |
| `AOR-E2E-012` | `R-002`, `R-003`, `R-012`, `R-031`, `DS-001`, `DS-008` | Live browser Brief Studio UI -> hosted backend mount GraphQL -> app backend | Real backend + frontend + browser | Pass | Authoritative from rounds 7 and 9. |
| `AOR-E2E-013` | `R-003`, `R-010`, `R-025`, `DS-003` | Live qwen3.6 draft run -> runtime artifact production | Real browser + AutoByteus runtime + LM Studio | Pass | Authoritative from rounds 7 and 9. |
| `AOR-E2E-014` | `R-003`, `R-010`, `R-025`, `DS-003` | Live qwen3.5 auto-executed tool path -> artifact publication | Real browser + AutoByteus runtime + LM Studio | Pass | Prior blocker remains resolved. |
| `AOR-E2E-015` | `R-047`, `R-048`, `R-049`, `DS-009` | Browser Applications route -> catalog summary -> host setup gate | Real frontend/browser journey | Pass | Authoritative from rounds 8-10. |
| `AOR-E2E-016` | `R-003`, `R-010`, `R-012`, `R-025`, `R-031`, `DS-003`, `DS-008`, `DS-009` | Live multi-brief workflow, refresh/reopen, rerun/execution-history | Real backend + frontend + browser | Pass | Authoritative from round 9. |
| `AOR-E2E-017` | `R-051`, `R-052`, `DS-010` | Per-application repair/reload re-entry -> truthful `REENTERING` blocking -> stale-worker invalidation | Focused reruns + live REST validation | Pass | Authoritative from round 10 and focused reruns remain green. |
| `AOR-E2E-018` | `R-065`, `R-070`, `R-071`, `R-073`, `DS-011`, `DS-012` | Long canonical imported app persisted-state inventory -> live package remove persisted-only quarantine on real `applicationId` | Focused reruns + live GraphQL/REST validation + temporary built-output proofs | Pass | Round-11 failure is now resolved. |

## Test Scope

- Round-12 scope was intentionally narrow: recheck the prior unresolved round-11 failure first, plus the exact focused server batch that review round 20 reported as passing.
- Earlier browser/runtime/provider-backed passes remain authoritative unless contradicted by new evidence; round 12 found no contradiction.

## Validation Setup / Environment

- Focused durable rerun commands:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-packages/application-package-service.test.ts tests/unit/application-bundles/file-application-bundle-provider.test.ts tests/unit/application-storage/application-platform-state-store.test.ts tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts tests/unit/application-orchestration/application-availability-service.test.ts tests/unit/application-backend-gateway/application-backend-gateway-service.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build`
- Live backend command (authoritative round-12 run):
  - `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" LANG="en_US.UTF-8" AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8012 node /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/dist/app.js --data-dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/server-data --host 127.0.0.1 --port 8012`
- Worktree-local env file:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/server-data/.env`
- Temporary proof scripts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/live-remove-proof.mjs`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/platform-state-key-proof.mjs`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/availability-reconciliation-proof.mjs`

## Tests Implemented Or Updated

- No repository-resident durable validation code was added or updated in round 12.
- Round-12 executable validation added only temporary proof scripts and a clean isolated live backend environment under `.local/package-remove-round12-live`.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `None`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

- Round-12 live remove-path proof: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/live-remove-proof.json`
- Round-12 platform-state key proof: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/platform-state-key-proof.json`
- Round-12 availability reconciliation proof: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/availability-reconciliation-proof.json`
- Round-11 failure evidence retained for history: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round11-live/live-remove-proof.json`
- Prior browser evidence retained from earlier authoritative rounds:
  - `/Users/normy/.autobyteus/browser-artifacts/462793-1776706324142.png`
  - `/Users/normy/.autobyteus/browser-artifacts/c2ee63-1776703425099.png`
  - `/Users/normy/.autobyteus/browser-artifacts/fad6ed-1776703425265.png`

## Temporary Validation Methods / Scaffolding

- Round 12 used a temporary clean backend process plus a copied Brief Studio importable package root under `.local/package-remove-round12-live`.
- Round 12 used one-off Node.js proof scripts to capture the live remove-path behavior and then prove the persisted-known-id / availability-reconciliation identity at built-output level. These are temporary executable validation artifacts only.
- The clean round-12 backend launch intentionally used `env -i` so inherited global AutoByteus data-dir / package-root variables could not contaminate the worktree-local evidence.

## Dependencies Mocked Or Emulated

- Durable server integration tests still use the emulated team runtime layer for narrow orchestration-boundary proof.
- Earlier authoritative browser rounds used the real backend worker, real Nuxt frontend, real AutoByteus runtime team creation, real LM Studio model endpoints, and real application websocket notifications.
- Round 12 used the real Fastify GraphQL + REST boundaries and a real worker-backed imported app for the remove-path proof; the two follow-up identity proofs were narrow built-output scripts against the real round-12 server data.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 11 | `AOR-E2E-018` live imported-package remove path fell through to `404` instead of persisted-only `QUARANTINED` on the real long canonical `applicationId` | `Local Fix` | `Resolved` | `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/live-remove-proof.json`, `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/platform-state-key-proof.json`, `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/package-remove-round12-live/availability-reconciliation-proof.json` | Real remove-path behavior now returns `503` / `QUARANTINED`, `listKnownApplicationIds()` now returns the real `applicationId`, and shared availability reconciliation now quarantines the real id rather than the hashed storage key. |

## Scenarios Checked

- Rechecked in round 12: `AOR-E2E-018` first, then the exact focused server batch that review round 20 reran.
- Prior authoritative pass coverage retained: `AOR-E2E-001` through `AOR-E2E-017`.

## Passed

- Focused durable reruns all passed:
  - `application-package-service.test.ts`
  - `file-application-bundle-provider.test.ts`
  - `application-platform-state-store.test.ts`
  - `application-orchestration-recovery-service.test.ts`
  - `application-availability-service.test.ts`
  - `application-backend-gateway-service.test.ts`
  - `brief-studio-imported-package.integration.test.ts`
  - server `tsc --noEmit`
  - server build
- Live imported-package remove-path proof passed:
  - GraphQL `importApplicationPackage` succeeded for the copied Brief Studio package root,
  - `listApplications` showed the imported app and yielded the long canonical real `applicationId`,
  - `POST /backend/ensure-ready` and `GET /backend/status` both succeeded before removal,
  - GraphQL `removeApplicationPackage` removed the linked package,
  - post-remove `POST /backend/ensure-ready` and `GET /backend/status` both returned `503` with `availabilityState: QUARANTINED` and the persisted-only detail on the real imported `applicationId`.
- Temporary built-output identity proofs passed:
  - `ApplicationPlatformStateStore.listKnownApplicationIds()` returned the real long canonical `applicationId` while excluding the hashed storage key,
  - `ApplicationAvailabilityService.reconcileCatalogSnapshotWithKnownApplications(...)` quarantined the real long canonical `applicationId` and left the hashed storage key absent.

## Failed

- None.

## Not Tested / Out Of Scope

- Direct public live `reloadPackage` execution through HTTP/GraphQL; no such endpoint exists today.
- Re-running the full provider-backed Brief Studio business flow in round 12; rounds 7-10 remain authoritative for that heavier path.
- Exhaustive qualification of every alternative LM Studio model surfaced in the generic host model picker.

## Blocked

- `tests/e2e/applications/application-packages-graphql.e2e.test.ts` remains locally blocked by its own stale missing import of `src/application-sessions/services/application-session-service.js`; that suite issue stayed separate from the round-12 validation scope.

## Cleanup Performed

- Stopped the temporary backend validation process on port `8012`.
- Verified no listener remained on port `8012` after cleanup.
- Kept the round-12 JSON proof artifacts under `.local/package-remove-round12-live/` for evidence.

## Classification

- `Pass`

## Recommended Recipient

- `delivery_engineer`

## Evidence / Notes

- The implementation handoff still reports `Backward-compatibility mechanisms introduced: None` and `Legacy old-behavior retained in scope: No`, and round-12 validation found no contradictory compatibility behavior.
- The round-11 failure is now resolved in real execution, not just in reviewed source or narrow unit tests.
- Reload-specific public live execution remains untested only because the product still exposes no public reload endpoint; the focused durable reruns still include the reload regression branch in `application-package-service.test.ts`, and the round-12 live + identity proofs exercised the shared persisted-known-id reconciliation that remove/reload now both consume.
- No repository-resident durable validation changed in round 12.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: `Round 12 passed. The focused server batch, typecheck, and build all passed, and real imported-package removal now keeps backend admission blocked behind persisted-only QUARANTINED ownership on the real long canonical applicationId. Temporary built-output proofs confirmed why the round-11 failure is gone: persisted-known inventory now returns the real applicationId instead of the hashed storage key, and shared availability reconciliation now quarantines that real id. No repository-resident durable validation changed in this round.`
