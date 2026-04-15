# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/review-report.md`
- Current Validation Round: `11`
- Trigger: `Code review round 19 passed for the app-first ApplicationShell / execution-handoff UX update. API / E2E re-entered with explicit user emphasis on validating the freshly rebuilt desktop artifact itself rather than the separately installed app.`
- Prior Round Reviewed: `10`
- Latest Authoritative Round: `11`

Round rules:
- Reused prior scenario IDs for the previously exercised backend/imported-package/storage/root-precedence/config/package-boundary, launch-preparation, and packaged-runtime scenarios.
- Added new scenario IDs only for the new app-first shell / workspace-handoff and fresh desktop-artifact build surfaces introduced in round 11.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | Earlier implementation package passed review and entered API / E2E validation | `N/A` | `0` | `Pass` | `No` | Added generic backend REST/WS durable integration coverage and proved startup-resume durable dispatch recovery. |
| `2` | Canonical implementation worktree passed review round 5 with the external sample/docs additions | `0` | `1` | `Fail` | `No` | Added imported-package durable integration coverage and found imported Brief Studio app ids exceeded Fastify's default route-param limit. |
| `3` | Code review round 6 passed for the validation-driven Local Fix | `2` | `0` | `Pass` | `No` | Rechecked the round-2 imported-package failures, validated the compact storage-key fix, and confirmed the imported Brief Studio backend flow passed end-to-end. |
| `4` | Code review round 9 passed for CR-006 built-in-root precedence and collision protection | `0` | `0` | `Pass` | `No` | Revalidated the cumulative package with the new provider/store precedence guards plus the existing backend/imported-package coverage. |
| `5` | Code review round 11 passed for CR-003 config helper extraction and focused package/config reruns | `0` | `0` | `Pass` | `No` | Revalidated the cumulative package with the AppConfig helper extraction, application-package root parsing/service coverage, and the existing backend/imported-package regressions. |
| `6` | User-provided real UI evidence showed imported Brief Studio still fails during Launch Application preparation | `0` | `1` | `Fail` | `No` | Added realistic durable web launch-preparation validation across import + cached catalogs + launch prep. The new test reproduced the missing team-definition failure. |
| `7` | Round-13 implementation re-review passed for the dependent-catalog refresh Local Fix | `1` | `0` | `Pass` | `No` | Rechecked the realistic launch-preparation failure with the reviewed store refresh fix; the durable launch-preparation validation passed. |
| `8` | Round-14 implementation review passed for the malformed application-owned agent-definition and fail-fast import-validation bugfix | `0` | `0` | `Pass` | `No` | Revalidated the rebuilt Brief Studio package, the server-side fail-fast validation/import boundary, the imported backend flow, and the web launch-preparation path. |
| `9` | Code review round 15 passed for the packaged/runtime backend route-prefix correction and iframe/bootstrap diagnostics | `0` | `0` | `Pass` | `No` | Revalidated the restored `/rest/applications/:applicationId/backend/...` transport spine through focused server/web suites plus direct packaged `.app` runtime smoke and frontend-asset bootstrap evidence. |
| `10` | Code review round 17 passed for the ApplicationSurface docs alignment and Electron `[ApplicationSurface]` diagnostics persistence Local Fix | `0` | `0` | `Pass` | `No` | Revalidated the focused web launch-owner slice, including `ApplicationSurface`, iframe bridge, asset URL derivation, retained execution workspace/session-store support, import-to-launch preparation, and Electron renderer diagnostics persistence. |
| `11` | Code review round 19 passed for the app-first ApplicationShell / execution-handoff UX update with explicit rebuilt desktop-artifact validation emphasis | `0` | `0` | `Pass` | `Yes` | Revalidated the new app-first shell/workspace-handoff web slice, rebuilt the current Electron desktop artifacts from source, and ran the bundled server directly from the freshly rebuilt `.app` to prove imported Brief Studio discovery plus long-id backend route reachability against the rebuilt artifact itself. |

## Validation Basis

Round-11 coverage was derived from:
- reviewed requirements/design that the application view must stay app-first while the explicit workspace execution-link handoff preserves the application-session boundary;
- the round-19 review report describing `ApplicationShell` as the live-session shell owner, the narrowed retained execution workspace, and the explicit workspace navigation boundary;
- the implementation handoff's explicit rebuilt-artifact/user-retest path for `build:electron:mac` and the generated `.app` / `.dmg` / `.zip` outputs;
- the user's correction that the currently installed `/Applications/AutoByteus.app` is not the same artifact as the freshly rebuilt worktree artifact, which required validating the rebuilt artifact directly;
- direct executable validation against the current web package, a fresh Electron macOS build, and the bundled server entry inside the freshly rebuilt `.app` with an isolated temp data dir.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- repository-resident web prepare step
- repository-resident web unit/component/integration validation
- repo-local Brief Studio package rebuild
- full `build:electron:mac` desktop-artifact build
- rebuilt `.app` bundled-server runtime smoke with isolated data dir
- rebuilt desktop-artifact file fingerprint / existence verification

## Platform / Runtime Targets

- Host platform: `macOS (darwin arm64)`
- Node runtime: `Node 22.x`
- Repository root under validation: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation`
- Web package under validation: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web`
- Brief Studio package under validation: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio`
- Freshly rebuilt desktop artifacts under validation:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.76.dmg`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.76.zip`
- Rebuilt importable package under validation:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio/dist/importable-package`

## Lifecycle / Upgrade / Restart / Migration Checks

- Round 11 reran the full desktop build on current source and validated the newly generated artifact outputs.
- Round 11 reran the packaged-runtime server smoke directly from the newly rebuilt `.app` bundle rather than relying only on earlier round-9 evidence.
- Round 11 did not complete a native desktop click-through inside the rebuilt `.app` window because macOS Accessibility automation is not available in this session.

## Coverage Matrix

| Scenario ID | Behavior / Risk | Surface | Result |
| --- | --- | --- | --- |
| `AV-001` | Platform backend REST/WS boundary works for the generic short-id sample fixture and real worker runtime | prior-round durable integration | `Prior-round Pass (not rerun)` |
| `AV-002` | REST facade keeps route `applicationId` authoritative while accepting optional request context | prior-round durable integration + prefix unit | `Prior-round Pass (not rerun)` |
| `AV-003` | Fresh-start durable publication dispatch recovery from a pending journal row | prior-round executable probe | `Prior-round Pass (not rerun)` |
| `AV-004` | Earlier broader storage/session/publication/engine/gateway bounded regression bundle | prior-round bounded suite | `Prior-round Pass (not rerun)` |
| `AV-005` | Real imported Brief Studio package is discoverable and reachable through backend REST/WS mounts | prior-round durable integration | `Prior-round Pass (not rerun)` |
| `AV-006` | Imported Brief Studio unknown-producer rejection is reachable and leaves projection state empty | prior-round durable integration | `Prior-round Pass (not rerun)` |
| `AV-007` | Oversized canonical application ids compact into deterministic, bounded storage keys | prior-round durable unit | `Prior-round Pass (not rerun)` |
| `AV-008` | Built-in applications root keeps authoritative package identity under same-path collisions, and deeper upward scanning still discovers the repo-local built-in container | prior-round durable unit | `Prior-round Pass (not rerun)` |
| `AV-009` | Protected built-in applications root is filtered/rejected from configured additional roots | prior-round durable unit | `Prior-round Pass (not rerun)` |
| `AV-010` | `AppConfig` helper extraction preserves config initialization and application-package root parsing behavior | prior-round durable unit | `Prior-round Pass (not rerun)` |
| `AV-011` | `ApplicationPackageService` still lists built-in + linked local packages and rejects duplicate GitHub imports | prior-round durable unit | `Prior-round Pass (not rerun)` |
| `AV-012` | After an application package import, launch preparation resolves the imported app-owned team/agent definitions even when shared catalogs were already loaded earlier in the session | durable web integration rerun | `Pass` |
| `AV-013` | Malformed application-owned agent definitions fail fast during provider/package validation/import instead of being silently skipped and surfacing later as missing-definition launch errors | prior-round durable server rerun | `Prior-round Pass (not rerun)` |
| `AV-014` | The rebuilt packaged `.app` server bundle serves the restored `/rest/applications/:applicationId/backend/status` and `/rest/applications/:applicationId/backend/queries/:queryName` routes for the imported Brief Studio app under a long canonical application id | rebuilt current-artifact bundled-server smoke | `Pass` |
| `AV-015` | The direct Brief Studio frontend asset loaded from the packaged server accepts the standard host bootstrap envelope and leaves the waiting state, showing the restored backend query base URL and ready UI state | prior-round packaged-runtime frontend-asset smoke | `Prior-round Pass (not rerun)` |
| `AV-016` | `ApplicationSurface` remains the authoritative host launch owner: it commits stable launch descriptors, validates ready ownership through the iframe bridge, retries with a new `launchInstanceId`, and keeps supporting asset/execution surfaces aligned | prior-round durable web component rerun | `Prior-round Pass (not rerun)` |
| `AV-017` | Electron renderer diagnostics persist `[ApplicationSurface]` messages, and the surrounding web state no longer depends on the session store owning host bootstrap state | prior-round durable web unit rerun | `Prior-round Pass (not rerun)` |
| `AV-018` | `ApplicationShell` stays the app-first live-session shell owner while `ApplicationExecutionWorkspace`, `workspaceNavigationService`, and `useWorkspaceRouteSelection` preserve the explicit workspace execution-link handoff boundary | durable web rerun | `Pass` |
| `AV-019` | A fresh `build:electron:mac` on the current cumulative package emits a rebuilt `.app`, `.dmg`, and `.zip` desktop artifact set for user retest | full desktop build + artifact fingerprint check | `Pass` |

## Test Scope

Round 11 focused on the bounded round-19 shell/workspace-handoff and rebuilt-artifact request:
- rerun the web prepare step;
- rerun the focused app-first shell/workspace-handoff web slice;
- rebuild the Brief Studio importable package;
- rerun the full Electron macOS build to produce a fresh `.app` / `.dmg` / `.zip` from current source;
- verify the newly built artifact files exist and fingerprint them;
- run the bundled server directly from the freshly rebuilt `.app` with an isolated temp app-data dir and imported-package root, then prove imported Brief Studio discovery plus the restored long-id backend route reachability.

## Validation Setup / Environment

- Repository root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation`
- Ticket workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis`
- Web validation was run directly from:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web`
- Brief Studio package build was run directly from:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio`
- Rebuilt-artifact smoke used the bundled server entry at:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/dist/app.js`
- Rebuilt-artifact smoke used an isolated temp app-data dir with:
  - a copied `.env` from the existing app-data config,
  - overridden `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:29698`,
  - overridden SQLite `DB_NAME` / `DATABASE_URL` under the temp dir,
  - overridden `AUTOBYTEUS_MEMORY_DIR` under the temp dir,
  - overridden `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS` pointing to the rebuilt Brief Studio importable package.
- This round intentionally distinguished the freshly rebuilt worktree artifact from the separately installed `/Applications/AutoByteus.app`; only the rebuilt worktree artifact was treated as authoritative packaged-runtime evidence in round 11.

## Tests Implemented Or Updated

No repository-resident validation files were modified during round 11 itself.

Durable validation exercised in this rerun:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/applications/__tests__/ApplicationShell.spec.ts`
  - validates the app-first shell behavior.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts`
  - revalidates launch-owner handshake behavior in the cumulative shell slice.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/components/applications/execution/__tests__/ApplicationExecutionWorkspace.spec.ts`
  - validates the narrowed retained execution workspace and handoff action surface.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/services/workspace/__tests__/workspaceNavigationService.spec.ts`
  - validates workspace execution-route serialization and handoff behavior.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/composables/workspace/__tests__/useWorkspaceRouteSelection.spec.ts`
  - validates workspace route parsing/selection behavior.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/stores/__tests__/applicationLaunchPreparation.integration.spec.ts`
  - revalidates imported Brief Studio launch preparation after package import when shared catalogs were already loaded.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/stores/__tests__/applicationPackagesStore.spec.ts`
  - revalidates dependent catalog refresh after application-package import/removal.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- The repository-resident validation exercised here had already been code-reviewed before this API / E2E rerun.

## Other Validation Artifacts

- Authoritative validation report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/tickets/done/application-bundle-agent-architecture-analysis/validation-report.md`
- Historical packaged frontend smoke screenshot artifact retained from round 9: `/Users/normy/.autobyteus/browser-artifacts/8190be-1776257662309.png`

## Temporary Validation Methods / Scaffolding

- Temporary round-11 packaged-artifact smoke only:
  - copied the existing app-data `.env` into an isolated temp dir;
  - rewired the DB, memory dir, server host, and application-package roots into that temp dir;
  - launched the bundled server entry directly from the freshly rebuilt `.app`;
  - queried GraphQL `listApplications` against that rebuilt-artifact server;
  - called the restored backend `status` and `briefs.list` routes for the discovered imported Brief Studio application.
- No temporary repository files were added.

## Dependencies Mocked Or Emulated

- The reviewed web test slice uses the same bounded test doubles already present in the codebase for Apollo transport and supporting store seams while keeping the actual Pinia/component/navigation boundaries under test.
- The rebuilt packaged-runtime smoke (`AV-014`, `AV-019`) used the real bundled server code and real rebuilt Brief Studio importable package with an isolated temp data dir; no mocked application backend was used.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| `10` | Unresolved validation failures | `None` | `N/A` | Round `10` ended `Pass` with no open validation-owned failures. | Round `11` therefore focused on the newly reviewed shell/workspace-handoff slice and the explicit rebuilt desktop-artifact validation request. |

## Scenarios Checked

| Scenario ID | Description | Evidence |
| --- | --- | --- |
| `AV-012` | Import an application package after shared catalogs are already loaded, then prepare the imported Brief Studio launch through `applicationSessionStore.prepareLaunchDraft()`. | Included in `7 files / 14 tests passed`; `applicationPackagesStore.spec.ts` and `applicationLaunchPreparation.integration.spec.ts` passed. |
| `AV-018` | Keep `ApplicationShell` as the app-first live-session shell owner while the retained execution view and workspace execution-link boundary stay aligned. | Included in `7 files / 14 tests passed`; `ApplicationShell.spec.ts`, `ApplicationSurface.spec.ts`, `ApplicationExecutionWorkspace.spec.ts`, `workspaceNavigationService.spec.ts`, and `useWorkspaceRouteSelection.spec.ts` passed. |
| `AV-019` | Build the current Electron macOS artifact set from source and verify the rebuilt `.app` / `.dmg` / `.zip` outputs exist as fresh user-retest artifacts. | `build:electron:mac` passed; artifact mtimes were `2026-04-15 18:44:40` (`.app`), `18:45:30` (`.dmg`), and `18:47:00` (`.zip`); SHA-256 recorded for the `.dmg` and `.zip`. |
| `AV-014` | Run the bundled server entry from the freshly rebuilt `.app`, discover imported Brief Studio, then call the restored `/rest/applications/:applicationId/backend/status` and `/backend/queries/briefs.list` routes with the long imported id. | Rebuilt-artifact smoke discovered `Brief Studio`, observed `applicationId` length `430`, and successfully returned the expected `status` and empty `briefs.list` payloads from `http://127.0.0.1:29698`. |

## Passed

- `AV-012`
- `AV-014`
- `AV-018`
- `AV-019`

## Failed

None.

## Not Tested / Out Of Scope

- full native desktop click-through inside the rebuilt `.app` window after the current build
- direct frontend-asset bootstrap smoke rerun in this round
- separately installed `/Applications/AutoByteus.app` as a validation target in this round
- prior backend/runtime scenarios `AV-001` through `AV-011`, `AV-013`, `AV-015`, `AV-016`, and `AV-017` in this round

## Blocked

- Native GUI automation of the rebuilt `.app` window from this session
  - Blocker: macOS Accessibility permission for `System Events` is unavailable in this environment (`osascript` returned helper-access error `-25211`), and `screencapture` could not capture the active display.
  - Impact: I could not automate the exact human click path `open rebuilt .app -> import Brief Studio -> Applications -> Brief Studio -> Launch again` from within the native window in this session.
  - Work completed despite blocker: rebuilt-artifact build proof, bundled-server runtime proof, and the durable app-first shell/workspace-handoff web slice all passed.

## Cleanup Performed

- retained the reviewed repository-resident durable validation files and this canonical validation report
- cleaned up temporary packaged-runtime app-data dirs created for the successful rebuilt-artifact smoke
- ensured no temporary bundled-server runtime remained running after evidence capture

## Classification

- `None (Pass)`

## Recommended Recipient

- `delivery_engineer`

## Evidence / Notes

Executed commands:
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web exec nuxi prepare`
  - Result: `passed`
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web exec vitest run components/applications/__tests__/ApplicationShell.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts components/applications/execution/__tests__/ApplicationExecutionWorkspace.spec.ts services/workspace/__tests__/workspaceNavigationService.spec.ts composables/workspace/__tests__/useWorkspaceRouteSelection.spec.ts stores/__tests__/applicationLaunchPreparation.integration.spec.ts stores/__tests__/applicationPackagesStore.spec.ts`
  - Result: `7 files / 14 tests passed`
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/applications/brief-studio build`
  - Result: `passed`
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web build:electron:mac`
  - Result: `passed`
- rebuilt artifact fingerprint checks:
  - `.app` mtime: `2026-04-15 18:44:40`
  - `.dmg` size/mtime: `374,934,182 bytes`, `2026-04-15 18:45:30`
  - `.zip` size/mtime: `372,343,179 bytes`, `2026-04-15 18:47:00`
  - `.dmg` SHA-256: `7df763d44169448b6bb5fb7a697ad5c84c523a6ce3aacc9a34b3506177be86e7`
  - `.zip` SHA-256: `c950941ef301f433a1ebd75a615b1959390ecd49a61c85a3fb8acbda00e80567`
- rebuilt-artifact bundled-server smoke command:
  - `node /Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-agent-architecture-analysis-implementation/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/dist/app.js --host 127.0.0.1 --port 29698 --data-dir <isolated-temp-data-dir>`
  - Result: `passed`
- rebuilt-artifact smoke results:
  - GraphQL `listApplications` discovered imported `Brief Studio`
  - discovered `applicationId` length: `430`
  - `GET http://127.0.0.1:29698/rest/applications/:applicationId/backend/status` succeeded with `state=stopped`
  - `POST http://127.0.0.1:29698/rest/applications/:applicationId/backend/queries/briefs.list` succeeded with `briefs=[]`

Behavior notes:
- The app-first shell/workspace-handoff slice remains green in durable web validation.
- The Electron desktop artifact set was freshly rebuilt from the current reviewed source in round 11; this was not just an existence check against stale files.
- The packaged-runtime proof in round 11 was performed against the freshly rebuilt worktree `.app` bundle itself, not against the separately installed `/Applications/AutoByteus.app`.
- I attempted native UI scripting of the rebuilt `.app`, but the environment lacks macOS Accessibility permission, so a human-style desktop click-through could not be automated in-session.

## Latest Authoritative Result

- Result: `Pass`
- Notes: The cumulative post-fix package passed refreshed API / E2E validation for the round-19 app-first shell / execution-handoff UX update. I rebuilt the current Electron macOS artifact set from source, verified the fresh `.app` / `.dmg` / `.zip` outputs, and validated the bundled server directly from the rebuilt `.app` rather than the separately installed app. The durable web shell/workspace-handoff slice also passed. No repository-resident durable validation was modified during this validation rerun after the latest code review, so the cumulative package can proceed to `delivery_engineer`.
