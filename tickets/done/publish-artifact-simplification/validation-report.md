# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/tickets/done/publish-artifact-simplification/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/tickets/done/publish-artifact-simplification/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/tickets/done/publish-artifact-simplification/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/tickets/done/publish-artifact-simplification/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/tickets/done/publish-artifact-simplification/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/tickets/done/publish-artifact-simplification/review-report.md`
- Current Validation Round: `7`
- Trigger: `User-requested API/E2E validation resume on 2026-04-22 after round-6 code-review re-review passed for the Brief Studio live-bootstrap fix.`
- Prior Round Reviewed: `6`
- Latest Authoritative Round: `7`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | User-requested API/E2E validation after code review pass | N/A | 1 | Fail | No | Added direct durable validation for native/Codex/Claude `publish_artifact` exposure; the native AutoByteus tool still accepted removed legacy fields. |
| 2 | User-requested API/E2E validation resume after round-3 code re-review pass on 2026-04-22 | Yes | 0 | Pass | No | Rechecked `VAL-PA-001` first, reran the focused 11-file validation subset, and reran `pnpm build`; all passed. |
| 3 | User-requested live runtime proof for real prompt-driven `publish_artifact` tool invocation on 2026-04-22 | Yes (no unresolved failures remained from round 2) | 0 | Pass | No | Added repository-resident live AutoByteus and Codex publish-artifact integration coverage, reran the prior 11-file focused subset, and reran `pnpm build`; all passed. |
| 4 | User-requested frontend validation on 2026-04-22 | Yes (no unresolved failures remained from round 3) | 2 | Fail | No | Identified the actual frontend test surface (`autobyteus-web`), prepared Nuxt types, repaired the local Electron install, and found real frontend/electron failures. |
| 5 | User-requested API/E2E validation resume on 2026-04-22 after round-5 code-review pass | Yes (`VAL-PA-010`, `VAL-PA-011`) | 0 | Pass | No | Rechecked the two prior unresolved frontend failures first. `test:nuxt` passed. `test:electron` passed on the authoritative rerun after investigation. |
| 6 | User-requested live Brief Studio application validation on 2026-04-22 | Yes (no unresolved failures remained from round 5) | 1 | Fail | No | The live Brief Studio backend mount worked, but the Brief Studio frontend asset failed to bootstrap because served `app.js` imported a missing `renderApp` export from `brief-studio-renderer.js`. |
| 7 | User-requested API/E2E validation resume on 2026-04-22 after round-6 code-review re-review pass | Yes (`VAL-PA-013`) | 0 | Pass | Yes | Rebuilt and relaunched the live Brief Studio stack, verified the host launch no longer times out, verified served `app.js` now imports cleanly, and created a fresh brief through the real Brief Studio UI handlers. |

## Validation Basis

- Derived validation from `REQ-PA-001` through `REQ-PA-020`, with emphasis on the simplified `publish_artifact` contract, cross-runtime exposure, legacy removal, direct published-artifact query/relay boundaries, application-owned reconciliation, user-requested frontend regression safety, and the user-requested real runnable Brief Studio application check.
- Re-read the implementation handoff `Legacy / Compatibility Removal Check` before finalizing round 7. The handoff still asserts no backward-compatibility behavior remains in scope.
- Round 7 first rechecked the only unresolved round-6 failure (`VAL-PA-013`), then reran the Brief Studio startup/host/bootstrap surface on a fresh live stack and extended the runnable check to a real UI-driven brief-creation flow.
- Reminder respected: the web/workspace Artifacts tab remains the unchanged legacy run-file-change surface and was not treated as the Brief Studio validation target for this round.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `delivery_engineer`

## Validation Surfaces / Modes

- Repository-resident durable validation (`vitest` unit + integration coverage) from rounds 1-3
- Prompt-driven live runtime integration validation for AutoByteus LM Studio and Codex app-server from round 3
- Frontend executable validation for `autobyteus-web` (`test:nuxt`, `test:electron`) from rounds 4-5
- Live executable Brief Studio application validation in rounds 6-7:
  - copied worktree env from main repo
  - rebuilt `applications/brief-studio` and relaunched the live server/frontend stack
  - rediscovered the imported application and re-saved host launch setup with the selected local Qwen model
  - entered Brief Studio from the real Applications host and verified the host no longer reports initialization failure
  - exercised the served Brief Studio frontend asset directly, verified `app.js` import succeeds, delivered an equivalent bootstrap payload for direct-tab automation, and created a fresh brief through the actual UI form/handlers
  - confirmed persistence through the mounted Brief Studio backend GraphQL surface

## Platform / Runtime Targets

- Native AutoByteus `publish_artifact` tool registration/execution boundary
- Native AutoByteus LM Studio runtime prompt → tool-call → artifact-persistence flow
- Codex dynamic tool exposure and runtime gating
- Codex app-server prompt → dynamic-tool call → artifact-persistence flow
- Claude MCP tool exposure and runtime gating
- Server published-artifact publication / projection / relay spine
- Brief Studio packaged backend + GraphQL mount integration
- App-owned reconciliation logic for Brief Studio and Socratic Math Teacher
- `autobyteus-web` Nuxt/frontend test surface
- `autobyteus-web` Electron/frontend test surface
- Live Brief Studio imported-package backend mount, browser asset bootstrap, and UI create-brief flow

## Lifecycle / Upgrade / Restart / Migration Checks

- Revalidated application-side artifact reconciliation and terminal-binding-safe catch-up through the existing Brief Studio imported-package integration coverage and app-owned reconciliation/unit coverage in earlier passing rounds.
- Round 7 reran the real rebuilt Brief Studio package on a fresh live stack after the reviewed bootstrap fix, confirming that restart/relaunch now produces a ready application surface instead of a 10-second host timeout.
- No installer/update/migration-specific executable surface was in scope beyond application launch/bootstrap, mounted backend startup, and one real UI-driven brief-creation flow.

## Coverage Matrix

| Scenario ID | Requirement / AC Coverage | Validation Method | Result | Evidence |
| --- | --- | --- | --- | --- |
| `VAL-PA-001` | `REQ-PA-001`, `REQ-PA-002`, `REQ-PA-007`, `AC-PA-001`, `AC-PA-002`, `AC-PA-010` | Native AutoByteus tool unit coverage | Pass | `autobyteus-server-ts/tests/unit/agent-tools/published-artifacts/publish-artifact-tool.test.ts` passed after the native raw-input fix; no later reviewed scope reopened it. |
| `VAL-PA-002` | `REQ-PA-007`, `AC-PA-004` | Configured-tool exposure unit coverage | Pass | `autobyteus-server-ts/tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts` passed in the focused rerun from round 2 and remains unchanged in reviewed scope. |
| `VAL-PA-003` | `REQ-PA-007`, `AC-PA-004` | Claude session gating unit coverage | Pass | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` passed in the focused rerun from round 2 and remains unchanged in reviewed scope. |
| `VAL-PA-004` | `REQ-PA-007`, `AC-PA-004` | Codex bootstrapper unit coverage | Pass | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` passed in the focused rerun from round 2 and remains unchanged in reviewed scope. |
| `VAL-PA-005` | `REQ-PA-001`-`REQ-PA-009`, `REQ-PA-012`, `REQ-PA-013`, `AC-PA-001`-`AC-PA-007`, `AC-PA-010`, `AC-PA-011`, `AC-PA-013` | Publication/projection/relay unit coverage | Pass | `published-artifact-publication-service`, `published-artifact-projection-service`, and `application-published-artifact-relay-service` tests passed in the focused rerun from round 2 and were not reopened by the round-7 Brief Studio-specific rerun. |
| `VAL-PA-006` | `REQ-PA-014`-`REQ-PA-018`, `AC-PA-012`-`AC-PA-016` | App-owned reconciliation unit + Brief Studio imported-package integration coverage | Pass | `autobyteus-server-ts/tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts` and `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` passed in the focused rerun from round 2 and remain valid context for round 7. |
| `VAL-PA-007` | Build readiness for the changed server/test surface | Executable build | Pass | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/autobyteus-server-ts build` passed again in round 7 before the live Brief Studio rerun. |
| `VAL-PA-008` | `REQ-PA-001`, `REQ-PA-002`, `REQ-PA-007`, `AC-PA-001`, `AC-PA-002`, `AC-PA-004`, `AC-PA-010` | AutoByteus LM Studio live runtime integration | Pass | `autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.lmstudio.integration.test.ts` contains a prompt-driven live `publish_artifact` proof added in round 3; no reviewed round-7 scope touched it. |
| `VAL-PA-009` | `REQ-PA-001`, `REQ-PA-002`, `REQ-PA-007`, `AC-PA-001`, `AC-PA-002`, `AC-PA-004`, `AC-PA-010` | Codex app-server live runtime integration | Pass | `autobyteus-server-ts/tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` contains a prompt-driven live `publish_artifact` proof added in round 3; no reviewed round-7 scope touched it. |
| `VAL-PA-010` | User-requested frontend regression validation for current repo UI surface | `autobyteus-web` Nuxt/frontend suite (`pnpm test:nuxt`) | Pass | Round-5 authoritative rerun passed with `252` passed files and `1115` passed tests. |
| `VAL-PA-011` | User-requested frontend regression validation for current repo Electron surface | `autobyteus-web` Electron/frontend suite (`pnpm test:electron`) | Pass | Round-5 authoritative rerun passed with `22` passed files and `88` passed tests. |
| `VAL-PA-012` | Real runnable Brief Studio backend on the mounted application boundary | Live server + mounted app GraphQL probe | Pass | Round-7 rerun rediscovered imported `Brief Studio`, re-saved host launch setup through the real REST surface, and mounted backend `BriefsQuery` returned the UI-created brief `brief-d1588684-42f7-4aca-b6ec-ed2ae5c01071`. |
| `VAL-PA-013` | Real runnable Brief Studio frontend asset bootstrap in the browser | Live host launch + direct served-asset import probe | Pass | On the rebuilt round-7 stack, the host launched Brief Studio without `Application initialization failed`, and `import('./app.js')` against the served asset returned `{ importOk: true }`. |
| `VAL-PA-014` | Real runnable Brief Studio frontend-to-backend brief creation flow | Live browser UI form submission + backend confirmation | Pass | After bootstrap, the app UI created `Round 7 UI Brief 1776869303160` with `briefId=brief-d1588684-42f7-4aca-b6ec-ed2ae5c01071`; the new brief appeared immediately in the list/detail view and was confirmed by mounted backend `BriefsQuery`. |

## Test Scope

- Round 7 first rechecked the only unresolved failure from round 6 (`VAL-PA-013`).
- After that recheck passed, round 7 reran the live Brief Studio stack and extended the runnable validation to one real UI-driven brief-creation flow.
- No repository-resident validation code was added or modified in round 7.
- Round 7 did not rerun the earlier server/runtime publish-artifact durable suites because the reviewed scope was the Brief Studio live-bootstrap fix and the user-requested runnable app check.

## Validation Setup / Environment

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification`
- Env files already copied from main repo into the worktree before the earlier live-app rounds:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/.env` → `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/autobyteus-server-ts/.env`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/.env` → `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/autobyteus-web/.env`
- Backend runtime used in round 7:
  - real `node dist/app.js --host 127.0.0.1 --port 8000`
  - env overrides: `AUTOBYTEUS_SERVER_HOST=http://localhost:8000`, `ENABLE_APPLICATIONS=true`, `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/applications/brief-studio/dist/importable-package`, isolated temporary `DATABASE_URL=file:/tmp/brief-studio-e2e-round7.demyBw/brief-studio-e2e.db`, `AUTOBYTEUS_MEMORY_DIR=/tmp/brief-studio-e2e-round7.demyBw/memory`
- Frontend runtime used in round 7:
  - real `ENABLE_APPLICATIONS=true pnpm dev` in `autobyteus-web`
- Browser validation used:
  - Applications host: `http://127.0.0.1:3000`
  - Served Brief Studio asset: `http://localhost:8000/rest/application-bundles/.../assets/ui/index.html?...`
- Round-7 isolated temp dir: `/tmp/brief-studio-e2e-round7.demyBw`

## Tests Implemented Or Updated

- None in round 7.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `None in round 7.`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/tickets/done/publish-artifact-simplification/review-report.md`

## Other Validation Artifacts

- Authoritative validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/tickets/done/publish-artifact-simplification/validation-report.md`
- Round-7 host screenshot: `/Users/normy/.autobyteus/browser-artifacts/5362de-1776869228610.png`
- Round-7 host screenshot after passing rerun: `/Users/normy/.autobyteus/browser-artifacts/5362de-1776869324609.png`
- Round-7 direct app screenshot after UI-created brief: `/Users/normy/.autobyteus/browser-artifacts/8167fd-1776869324511.png`

## Temporary Validation Methods / Scaffolding

- Round 7 used a direct-tab self-bootstrap payload only for browser automation of the app-owned UI handlers after separately proving that the real host launch no longer fails.
- This direct-tab bootstrap was necessary because the real Applications host page (`127.0.0.1:3000`) mounts the app iframe from `localhost:8000`, and that cross-origin boundary prevents direct DOM scripting of the iframe from the host tab in the available automation surface.
- No temporary scaffolding was retained in the repository.

## Dependencies Mocked Or Emulated

- None for the live Brief Studio runnable check.
- The server, frontend host, application package, and mounted backend were exercised live.
- The only synthetic step was replaying an equivalent bootstrap payload into a direct app tab so the real app UI could be driven despite the cross-origin iframe boundary.
- The only environment isolation used was a temporary round-7 SQLite path and memory directory so the rerun would not mutate the main server DB.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `VAL-PA-001` | `Local Fix` | Resolved | `autobyteus-server-ts/tests/unit/agent-tools/published-artifacts/publish-artifact-tool.test.ts` passed in the focused rerun from round 2. | The native AutoByteus tool still enforces the simplified contract instead of silently tolerating removed legacy fields. |
| 4 | `VAL-PA-010` | `Local Fix` | Resolved | Round-5 authoritative `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/autobyteus-web test:nuxt` passed with `252` passed files and `1115` passed tests. | The stale/orphaned Socratic app-internal tests were removed from the host package and the remaining frontend regressions were fixed. |
| 4 | `VAL-PA-011` | `Local Fix` | Resolved | Round-5 authoritative `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/autobyteus-web test:electron` passed with `22` passed files and `88` passed tests. | The earlier Electron/frontend failure is no longer active. |
| 6 | `VAL-PA-013` | `Local Fix` | Resolved | On the round-7 rerun, the host no longer reported initialization failure, served `import('./app.js')` succeeded, and the UI created a fresh brief through the live app form. | The renderer/runtime entry contract is restored across the served runnable asset. |

## Scenarios Checked

1. Native AutoByteus `publish_artifact` tool contract and runtime provenance wiring.
2. Configured tool exposure normalization for optional publish-artifact gating.
3. Claude publish-artifact MCP exposure when explicitly configured.
4. Codex publish-artifact dynamic tool exposure when explicitly configured.
5. Publication service persistence, workspace containment, repeated-path revisions, and cleanup on projection failure.
6. Published-artifact projection reads from durable storage.
7. Live `ARTIFACT_PERSISTED` relay into bound app handlers.
8. Brief Studio packaged backend integration, live projection, and app-owned reconciliation behavior.
9. Brief Studio + Socratic app-owned binding-intent correlation and early-event preservation.
10. Live AutoByteus runtime prompt → `publish_artifact` → persisted artifact proof.
11. Live Codex runtime prompt → `publish_artifact` → persisted artifact proof.
12. `autobyteus-web` Nuxt/frontend suite.
13. `autobyteus-web` Electron/frontend suite.
14. Real Brief Studio package rebuild and live server/frontend restart.
15. Real Brief Studio discovery through `listApplications`.
16. Real Brief Studio host launch-setup save through the REST resource-configuration boundary.
17. Real Brief Studio host launch/iframe mount without initialization failure.
18. Real Brief Studio served `app.js` import after the bootstrap fix.
19. Real Brief Studio UI create-brief flow through the actual app form and handlers.
20. Mounted backend GraphQL confirmation that the UI-created brief persisted.

## Passed

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/applications/brief-studio build`
  - Result: importable package regenerated successfully.
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/autobyteus-server-ts build`
  - Result: pass.
- Real server startup on `127.0.0.1:8000`
  - Result: server listened successfully, Prisma migrations applied against the isolated round-7 SQLite DB.
- Real frontend startup on `127.0.0.1:3000`
  - Result: Nuxt dev server served the Applications host successfully.
- Real application discovery:
  - GraphQL `listApplications` returned imported `Brief Studio`.
- Real host launch setup save:
  - `PUT /rest/applications/:applicationId/resource-configurations/draftingTeam` succeeded with bundled team resource + runtime/model/workspace defaults.
  - The saved launch setup showed the selected model `LM Studio / qwen3.6-35b-a3b-nvfp4:lmstudio@127.0.0.1:1234`.
- Real host launch:
  - After `Enter application`, the host mounted the iframe and no longer reported `Application initialization failed` or `Retry bootstrap`.
- Real served asset bootstrap/import:
  - `import('./app.js')` against the served Brief Studio asset returned `{ importOk: true }`.
  - The direct app tab reached status `Brief Studio is ready. Open a brief to review drafts, notes, and approval state.`
- Real UI-created brief flow:
  - The app UI created `Round 7 UI Brief 1776869303160`.
  - The app selected the new brief automatically and displayed detail for `brief-d1588684-42f7-4aca-b6ec-ed2ae5c01071`.
- Real mounted backend confirmation:
  - Follow-up `BriefsQuery` against `/rest/applications/:applicationId/backend/graphql` returned the new UI-created brief record.

## Failed

- None in round 7.

## Not Tested / Out Of Scope

- I did not run a full long-running draft-generation orchestration from inside Brief Studio after the create-brief proof passed; the user-requested runnable validation was satisfied by proving the fixed frontend boots, the host launches it, and the UI can create and persist a brief through the mounted backend.
- Claude still does not have prompt-driven live `publish_artifact` runtime coverage; that remains outside this round’s Brief Studio-specific scope.
- The web/workspace Artifacts tab remains unchanged as the legacy run-file-change surface and was not part of this round’s Brief Studio validation target.

## Blocked

- None.

## Cleanup Performed

- Rebuilt the Brief Studio importable package and the server before rerunning the live stack.
- Started fresh round-7 backend/frontend processes for validation.
- After evidence capture and handoff, the long-running validation processes were terminated.

## Classification

- `Pass` is not a classification. Use the values below only when validation does not pass cleanly.
- `Local Fix`: the main issue is a bounded implementation correction.
- `Design Impact`: the main issue is a weakness or mismatch in the reviewed design.
- `Requirement Gap`: intended behavior or acceptance criteria are missing or ambiguous.
- `Unclear`: the issue is cross-cutting, low-confidence, or cannot yet be classified cleanly.
- Classification used this round: `N/A (Pass)`

## Recommended Recipient

- `delivery_engineer`

## Evidence / Notes

- Env copy setup from the main repo remained in place for this rerun.
- Round-7 live startup commands:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/applications/brief-studio build`
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/autobyteus-server-ts build`
  - live server: `AUTOBYTEUS_SERVER_HOST=http://localhost:8000 ENABLE_APPLICATIONS=true AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-worktrees/publish-artifact-simplification/applications/brief-studio/dist/importable-package DATABASE_URL=file:/tmp/brief-studio-e2e-round7.demyBw/brief-studio-e2e.db AUTOBYTEUS_MEMORY_DIR=/tmp/brief-studio-e2e-round7.demyBw/memory node dist/app.js --host 127.0.0.1 --port 8000`
  - live frontend: `ENABLE_APPLICATIONS=true pnpm dev`
- Live discovery evidence:
  - GraphQL `listApplications` returned imported `Brief Studio` with required `draftingTeam` slot.
- Live host evidence:
  - the host page still showed the saved Qwen model selection and no longer displayed `Application initialization failed` after launch.
- Live frontend asset evidence:
  - direct `import('./app.js')` now succeeds.
  - the status banner moved to the ready state after bootstrap.
- Live UI evidence:
  - the app form created `Round 7 UI Brief 1776869303160` with `briefId=brief-d1588684-42f7-4aca-b6ec-ed2ae5c01071`.
  - the new brief immediately appeared in both list and detail sections.
- Live backend evidence:
  - mounted backend `BriefsQuery` returned the created brief record.
- Screenshot evidence:
  - `/Users/normy/.autobyteus/browser-artifacts/5362de-1776869228610.png`
  - `/Users/normy/.autobyteus/browser-artifacts/5362de-1776869324609.png`
  - `/Users/normy/.autobyteus/browser-artifacts/8167fd-1776869324511.png`

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: `After the reviewed round-6 Brief Studio bootstrap fix, the live Applications host no longer times out, the served Brief Studio browser asset imports and bootstraps correctly, and a fresh brief can be created through the real Brief Studio UI and confirmed through the mounted backend GraphQL surface.`
