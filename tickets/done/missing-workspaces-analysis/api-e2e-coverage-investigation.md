# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/missing-workspaces-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/missing-workspaces-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/missing-workspaces-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/missing-workspaces-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/missing-workspaces-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/missing-workspaces-analysis/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed and routed the missing-workspaces-analysis task to API/E2E coverage investigation and execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1 in this file.

## Current Requirement And Design Basis

The approved task requires the backend workspace registry to remain the authority for visible filesystem workspaces while becoming safe against startup/load/upsert races and duplicate temp-root persistence. The current implementation is expected to:

- load `workspaces.json` through a single-flight path and not mark the store loaded until disk parsing or missing-file handling completes (`REQ-1`, `REQ-2`);
- serialize registry mutations and persist through same-directory atomic temp-file replacement with no persistent `.bak` artifacts (`REQ-3`, `REQ-4`, `AC-8`);
- reject suspicious non-remove shrink while permitting explicit delete and configured temp-root cleanup only for the expected entries (`REQ-5`, `REQ-6`, `AC-3`, `AC-4`);
- route the configured temp root to `temp_ws_default`, clean persisted filesystem entries for that same root, and expose no duplicate row from GraphQL `workspaces()` (`REQ-7`, `REQ-8`, `REQ-9`, `AC-5`);
- keep frontend/run-history behavior unchanged: visible top-level workspaces are not silently rebuilt from historical roots (`REQ-10`, `AC-7`).

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced, old unsafe registry behavior is replaced, duplicate temp-root filesystem identity is decommissioned, and no persistent backup write path was retained. Code review agreed that no compatibility wrapper, dual-path behavior, or old-behavior retention exists in the reviewed source.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Registry single-flight load and serialized mutations | Changed | Requirements `REQ-1`-`REQ-3`; design DS-004; implementation handoff `WorkspaceRegistryStore` changes; code review pass. | Existing unit coverage is relevant and still valid; API/E2E should execute focused unit coverage as support evidence and add/API-run a boundary scenario where GraphQL listing overlaps create/upsert against a seeded registry. |
| Atomic `workspaces.json.tmp-*` write with no persistent `.bak` | Added / Removed | Requirements `REQ-4`, `AC-8`; design simplification and key tradeoffs; implementation handoff file-persistence helper; code review legacy verdict. | Existing unit coverage checks no `.bak`/tmp after cleanup; API/E2E should verify no registry backup/temp artifacts remain after GraphQL create/temp-root operations. |
| Suspicious non-remove shrink rejected; explicit delete remains allowed | Changed / Preserved | Requirements `REQ-5`, `REQ-6`; acceptance `AC-3`, `AC-4`; design DS-003/DS-004; implementation handoff. | Existing GraphQL remove test and store unit tests remain valid; no E2E test change needed for explicit remove except rerun current E2E. |
| Configured temp root no longer persisted/listed as regular filesystem workspace | Removed / Changed | Requirements `REQ-7`, `REQ-8`, `REQ-9`; design legacy removal policy and decommission plan; implementation handoff temp-root routing and cleanup; code review pass. | Existing E2E only verifies temp row exists, not duplicate cleanup or `createWorkspace(tempRoot)` behavior. Add durable GraphQL E2E coverage. |
| Frontend/run-history does not become workspace-list authority | Preserved | Requirements `REQ-10`, `AC-7`; design says frontend unchanged; code review found no frontend/run-history changes. | Existing backend API coverage is sufficient for this stage; no frontend E2E is needed because public API shape and frontend code were not changed. |
| Cross-process registry writers | Preserved as deferred risk | Requirements risks; design residual risk; code review residual risk. | Not durable-covered in scope. Record as not tested/deferred; no reroute because it is explicitly out of current design scope. |
| Packaged app build/release | Preserved as downstream release risk | Requirements constraints; implementation/code review residual risk. | Not an API/E2E code coverage target; delivery must handle/restate release vulnerability until packaged app is updated. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` - creates/lists workspaces | GraphQL `createWorkspace` registers a filesystem root and `workspaces()` returns it. | `REQ-9`, `AC-6`, DS-001/DS-002. | Still Valid | Current public API shape is unchanged; code review says existing create/list semantics still need to pass. | Retain and rerun. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` - remove workspace preserves files and can re-add | GraphQL remove deletes only visibility entry, not files/history; same root can be re-added. | `REQ-6`, `AC-3`, `AC-6`, DS-003. | Still Valid | Explicit remove remains the only valid user-facing removal path. | Retain and rerun. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` - blocked active standalone run removal | Remove is blocked when active run uses the workspace. | `REQ-6`, `AC-6`, DS-003. | Still Valid | Removal guard behavior is preserved and not obsolete. | Retain and rerun. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` - create metadata without file explorer | API metadata returns filesystem kind/root without initializing file explorer. | `AC-6`, existing API behavior preservation. | Still Valid | No changed requirement invalidates this behavior. | Retain and rerun. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` - deterministic metadata resolution | `workspaceMetadata(rootPath)` deterministically computes filesystem metadata without registering/initializing. | Existing API behavior; `REQ-10` indirectly by not making history authority. | Still Valid | Public metadata query unchanged. | Retain and rerun. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` - temp workspace list with backend-selected path and relative override | `workspaces()` includes `temp_ws_default` with configured temp root. | `REQ-7`, `REQ-9`, `AC-5`. | Needs Update | Still valid but incomplete: it does not prove absence of duplicate filesystem temp-root rows or temp-root create routing. | Add new E2E scenarios in this file, then rerun. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` - reject removing default temp workspace | `removeWorkspace(temp_ws_default)` fails because only filesystem workspaces can be removed. | `REQ-6`, `REQ-7`, `AC-6`. | Still Valid | Temp workspace remains transient/non-removable via filesystem remove. | Retain and rerun. |
| `autobyteus-server-ts/tests/unit/workspaces/workspace-registry-store.test.ts` | Store-level load/upsert overlap, concurrent upserts, explicit delete, suspicious shrink rejection, no backup/tmp after cleanup. | `REQ-1`-`REQ-5`, `AC-1`-`AC-4`, `AC-8`, DS-004. | Still Valid | Added by implementation and passed code review; represents current design and requirements. | Rerun as support evidence; do not replace with API-only coverage because race/shrink invariants are best exercised at store boundary. |
| `autobyteus-server-ts/tests/unit/workspaces/workspace-manager.test.ts` | Manager creates/reuses workspaces, routes configured temp root to `TempWorkspace`, decommissions persisted temp-root entries, remove preserves files. | `REQ-6`-`REQ-9`, `AC-3`, `AC-5`, `AC-6`, DS-002/DS-003. | Still Valid | Added/updated by implementation and passed code review; covers manager identity boundary. | Rerun as support evidence. |
| `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts` and `archive-run-history-graphql.e2e.test.ts` | Workspace run-history/archive API behavior. | `REQ-10` excludes making run history workspace-list authority. | Out Of Scope | No source/design changes were made to run-history query behavior; relevant only as evidence that history is not the authority. | Do not run for final sign-off unless failures implicate this task. |
| `autobyteus-web/utils/__tests__/runTreeProjection.spec.ts` and frontend workspace store tests/read models | Frontend derives top-level rows from backend workspace descriptors, not all history roots. | `REQ-10`, `AC-7`. | Out Of Scope | No frontend files changed; requirements preserve current frontend authority boundary. | No durable API/E2E action. |
| Agent/team runtime integration tests with mocked `ensureWorkspaceByRootPath` | Runtime services call workspace manager during launches/restores. | DS-002; startup/restore overlap risk. | Out Of Scope for durable update | Many are broad runtime tests with mocks or external runtime dependencies; direct registry race proof is already unit-covered and the API boundary can be proven with a focused GraphQL overlap scenario. | Use focused API/E2E coverage instead of broad runtime suite. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found. | N/A | The reviewed existing workspace API/unit assertions still represent approved current behavior. | Requirements and code review preserve create/list/remove/temp identity public behavior. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| AE2E-001 | GraphQL `workspaces()` cleans a persisted filesystem entry whose root equals the configured temp root and returns only `temp_ws_default` for that root while preserving regular filesystem entries. | `REQ-7`, `REQ-8`, `REQ-9`, `AC-5`; design legacy removal policy; implementation handoff temp-root cleanup. | Add test to `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`. | Existing E2E proves temp row presence only; it does not prove duplicate cleanup through API list boundary. |
| AE2E-002 | GraphQL `createWorkspace(rootPath = configured temp root)` returns `temp_ws_default`/`kind: temp` and does not persist a filesystem registry row or leave `.bak`/`workspaces.json.tmp-*` artifacts. | `REQ-4`, `REQ-7`, `REQ-8`, `REQ-9`, `AC-5`, `AC-8`; implementation handoff downstream hints. | Add test to `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`. | The GraphQL create boundary is the public mutation path that could otherwise reintroduce the duplicate temp-row behavior. |
| AE2E-003 | GraphQL list and create overlap against a seeded multi-entry registry preserves all existing roots plus the new root. | `REQ-1`-`REQ-4`, `AC-1`, `AC-2`; design DS-001/DS-002/DS-004; code review residual risk asks for a realistic startup/restore overlap scenario. | Add focused test to `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`. | Store unit tests prove the exact invariant locally; this adds API-boundary evidence that resolver/manager/list/create sequencing does not truncate seeded registry state. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| AE2E-001 / AE2E-002 / AE2E-003 | `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Add scenarios; update the existing temp app-data E2E fixture to provide both `getAppDataDir()` and `getTempWorkspaceDir()` through the isolation helper; existing behavior assertions remain unchanged. | `REQ-1`-`REQ-9`, `AC-1`, `AC-2`, `AC-5`, `AC-8`. | Repository-resident durable coverage will change, so a follow-up code review is required before delivery. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None. | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| AE2E-SUPPORT-001 | Run targeted workspace GraphQL E2E file after adding durable scenarios. | Public GraphQL workspace flows, including existing retained behavior and new temp/overlap scenarios. | Execution command is evidence only; tests remain as durable coverage. |
| AE2E-SUPPORT-002 | Rerun focused unit tests for registry store and workspace manager. | Lower-level invariants still pass with API/E2E coverage changes present. | Existing unit tests are durable; the rerun command is execution evidence. |
| AE2E-SUPPORT-003 | Run source build typecheck/build command accepted by implementation/code review. | Coverage changes do not break build/type generation. | Build command output is evidence; no temporary code retained. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Multiple OS processes concurrently writing the same registry file | Explicitly deferred by requirements, design, implementation, and code review; current evidence says single packaged server process. | A future multi-writer topology could still race without an interprocess lock. | Delivery/release notes should carry the residual risk; no reroute for current task. |
| Installed packaged app behavior | Source changes are not yet built/released into `/Applications/AutoByteus.app`. | Installed app remains vulnerable until delivery/release. | Delivery engineer must handle or document release/package update status. |
| Full `tsc -p tsconfig.json --noEmit` | Implementation/code review report pre-existing `tests` vs `rootDir` TS6059 issue. | Not a reliable sign-off command for this task. | Use `tsconfig.build.json`/`build:full` as accepted by implementation and code review. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently identified. | N/A | Upstream artifacts and code review align; legacy/compatibility check is clean. | N/A |

## Execution Plan

1. Add focused durable GraphQL E2E scenarios to `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` for AE2E-001, AE2E-002, and AE2E-003.
2. Run `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`.
3. Rerun `pnpm -C autobyteus-server-ts exec vitest run tests/unit/workspaces/workspace-registry-store.test.ts tests/unit/workspaces/workspace-manager.test.ts`.
4. Run `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`.
5. Run `pnpm -C autobyteus-server-ts run build:full` if time/environment remains healthy, matching prior implementation/code review sign-off.
6. Record results in the canonical execution coverage report. Because repository-resident durable coverage will be added/updated after code review, route the cumulative package back to `code_reviewer` for coverage-code re-review on pass.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing coverage is valid but incomplete for the API temp-root duplicate and GraphQL overlap boundary. Add durable E2E coverage first, then execute the planned checks.
