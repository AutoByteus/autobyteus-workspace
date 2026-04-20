# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/review-report.md`
- Current Validation Round: `7`
- Trigger: `Round 7 resumed on 2026-04-20 after code review round 13 passed AOR-LF-009 and made the /applications/:id pre-entry setup gate authoritative. This round re-ran focused durable validation, then performed the full live browser journey from Applications -> Brief Studio -> host setup save -> app entry -> provider-backed draft run -> final artifact review workflow using the requested LM Studio qwen3.6 model.`
- Prior Round Reviewed: `6`
- Latest Authoritative Round: `7`

Round rules:
- Reuse the same scenario IDs across reruns for the same scenarios.
- Create new scenario IDs only for newly discovered coverage.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Implementation review passed and requested API/E2E validation | N/A | 0 | Pass | No | Added boundary-local durable validation for imported-package launch, live execution ingress, recovery/reattachment, startup-gated artifact ingress, and iframe v2 host contract behavior. |
| 2 | Review round 6 passed after AOR-LF-005 and AOR-LF-006 Local Fixes | 0 | 0 | Pass | No | Re-executed the prior runtime/recovery/iframe scenario set, added repaired backendBaseUrl route-transport and app-owned GraphQL contract checks, and required no new API/E2E-side repo validation changes. |
| 3 | Review round 8 passed after AOR-LF-007 Local Fixes | 0 | 1 | Fail | No | Added live packaged-client validation for the hosted Brief Studio GraphQL path; the packaged UI frontend SDK copy was incomplete, so the generated client could not import and the new scenario failed before any GraphQL request was sent. |
| 4 | Review round 9 passed after the packaged-client Local Fix return | 1 | 0 | Pass | Yes | Rechecked the prior packaged-client failure first; packaged-client imports, the updated imported-package integration suite, and the surrounding targeted runtime/recovery/iframe validation all passed. |
| 5 | User-requested live backend+frontend+browser validation with AutoByteus runtime and LM Studio models | 0 | 2 | Fail | Yes | Real browser validation proved the hosted backend-mount GraphQL path, then exposed provider/runtime-backed failures: qwen3.6 failed before final artifact publication, and qwen3.5 still depended on manual tool approval plus invalid `artifactRef` payloads. |
| 6 | Code review re-review passed AOR-LF-008 and user requested full real frontend journey testing | 2 | 1 | Fail | Yes | The old qwen3.5 live blocker was resolved, but the real `/applications` flow still lacked the required persisted resource-configuration surface and qwen3.6 still did not reach a final brief. |
| 7 | Code review round 13 passed AOR-LF-009 and API/E2E resumed from the cumulative package | 2 | 0 | Pass | Yes | The real `/applications` host now blocks entry until saved setup is launch-ready, the requested qwen3.6 live run reaches a final projected artifact in the real UI, and the review workflow completes through app-owned GraphQL after the final artifact is rendered. |

## Validation Basis

- Requirements focus areas exercised: `R-001` through `R-005`, `R-010` through `R-014`, `R-021` through `R-025`, `R-031`, `R-032`, `R-037`, `R-038`, `R-047`, `R-048`, `R-049`.
- Design focus areas exercised: `DS-001`, `DS-002`, `DS-003`, `DS-004`, `DS-007`, `DS-008`, `DS-009`.
- Implementation handoff signals rechecked in validation: authoritative host pre-entry setup gating, packaged client vendoring, hosted backend-mount GraphQL path, restart/resource validation subset, and requested provider-backed qwen3.6 live execution through the real Applications browser flow.
- Reviewer residual risks rechecked: real notification/runtime behavior under live launches and the resumed full frontend journey after the setup gate fix.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- Server integration validation with real Fastify REST + websocket routes, real application worker launch, real app storage, real event journal/dispatch, and emulated team-run execution resources.
- Server integration validation for hosted backend-mount route transport semantics derived from `backendBaseUrl`.
- Server unit validation for restart recovery / lookup rebuild / orphan classification.
- Server unit validation for startup-gated live `publish_artifact` ingress.
- Web component validation for iframe ready/bootstrap v2 contract and host-side launch/setup ownership.
- Real local backend + frontend dev-server launch with browser automation against the live Applications page, Brief Studio host page, authoritative launch-setup gate, hosted iframe asset, application websocket notifications, and live LM Studio-backed team runs.
- Direct browser-side inspection of the actual `/applications` launch flow to prove that saved setup is now presented before entry and that app entry stays blocked until the saved setup is launch-ready.

## Platform / Runtime Targets

- Node.js local runtime on macOS host.
- `autobyteus-server-ts` worker-launched application backend.
- `autobyteus-web` Nuxt dev server at `http://localhost:3000`.
- Brief Studio built-in application package hosted from the live backend.
- LM Studio at `http://127.0.0.1:1234`, with runtime model identifiers such as `qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234`.

## Lifecycle / Upgrade / Restart / Migration Checks

- Recovery owner reattached persisted nonterminal bindings and rebuilt global lookups in durable validation.
- Recovery owner marked unavailable bindings `ORPHANED` and appended the corresponding lifecycle event in durable validation.
- Startup gate blocked live `publish_artifact` ingress until recovery release in durable validation.
- Imported-package integration still exercised live `RUN_STARTED`, artifact projection, `RUN_TERMINATED`, and packaged-client hosted backend-mount behavior.
- Live browser/frontend round-7 validation proved the actual `/applications` host now presents the persisted launch-setup surface before entry, blocks entry until the required saved model exists, and only then boots the iframe host.
- Live qwen3.6 execution through the saved host setup default now reaches `brief.ready_for_review`, projects the final reviewable artifact into the app UI, and supports subsequent review mutations from the same browser session.
- The same browser session also confirmed that app-owned note-add and approval mutations still reach the Brief Studio GraphQL backend over the hosted backend mount.

## Coverage Matrix

| Scenario ID | Requirement / Design Anchor | Boundary | Method | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| `AOR-E2E-001` | `R-001`, `R-021`, `DS-001` | Imported package discovery + host launch readiness | Server integration (`brief-studio-imported-package.integration.test.ts`) | Pass | Rechecked in round 7; imported Brief Studio still discovers and boots correctly. |
| `AOR-E2E-002` | `R-002`, `R-003`, `R-004`, `DS-002` | App-owned `createBrief` -> `runtimeControl.startRun(...)` | Server integration | Pass | Rechecked in round 7. |
| `AOR-E2E-003` | `R-010`, `R-011`, `R-025`, `DS-003` | Live artifact ingress -> journal -> dispatch -> app projection | Server integration | Pass | Rechecked in round 7. |
| `AOR-E2E-004` | `R-025`, `DS-004` | Bound run lifecycle delivery | Server integration | Pass | Rechecked in round 7. |
| `AOR-E2E-005` | `R-014`, `DS-007` | Restart recovery / lookup rebuild / reattachment | Server unit (`application-orchestration-recovery-service.test.ts`) | Pass | Rechecked in round 7. |
| `AOR-E2E-006` | `R-014`, `DS-007` | Startup-gated live artifact ingress | Server unit (`publish-artifact-tool.test.ts`) | Pass | Rechecked in round 7. |
| `AOR-E2E-007` | `R-023`, `R-024`, `DS-001` | Iframe ready/bootstrap v2 contract | Web component (`ApplicationIframeHost.spec.ts`) | Pass | Rechecked in round 7. |
| `AOR-E2E-008` | `R-023`, `R-024`, `DS-001` | Host-side launch ownership | Web component (`ApplicationSurface.spec.ts`) | Pass | Rechecked in round 7. |
| `AOR-E2E-009` | `R-012`, `R-032`, `R-037`, `DS-008` | Hosted backend-mount route transport semantics | Server integration (`application-backend-mount-route-transport.integration.test.ts`) | Pass | Rechecked in round 7. |
| `AOR-E2E-010` | `R-012`, `R-031`, `R-038`, `DS-008` | App-owned GraphQL single-operation dispatch contract | Server unit (`app-owned-graphql-executors.test.ts`) | Pass | Rechecked in round 7. |
| `AOR-E2E-011` | `R-031`, `R-037`, `R-038`, `DS-001`, `DS-008` | Packaged generated GraphQL client -> hosted backend mount -> app backend | Server integration (`brief-studio-imported-package.integration.test.ts`) + executable import probes | Pass | Remains resolved and rechecked in round 7. |
| `AOR-E2E-012` | `R-002`, `R-003`, `R-012`, `R-031`, `DS-001`, `DS-008` | Live browser Brief Studio UI -> hosted backend mount GraphQL -> app backend | Executable validation (real backend + frontend + browser) | Pass | On 2026-04-20 the real Brief Studio UI created business-owned briefs, launched draft runs through `http://localhost:8000/rest/applications/:applicationId/backend/graphql`, and drove follow-up review mutations from the actual frontend journey. |
| `AOR-E2E-013` | `R-003`, `R-010`, `R-025`, `DS-003` | Live provider-backed qwen3.6 draft run -> runtime artifact production | Executable validation (real browser + real AutoByteus runtime + LM Studio qwen3.6) | Pass | Rechecked through the authoritative host setup gate with saved default model `qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234`. Brief `brief-64a22d3f-ca4c-4b5a-960e-25082e92718f` reached `brief.ready_for_review`, projected a final artifact into the real UI after refresh, and remained reviewable through the app-owned workflow. |
| `AOR-E2E-014` | `R-003`, `R-010`, `R-025`, `DS-003` | Live provider-backed qwen3.5 draft run -> auto-executed tool path -> artifact publication | Executable validation (real browser + real AutoByteus runtime + LM Studio qwen3.5) | Pass | Prior round-5 blocker remains resolved: auto-executed tool publication still works and no manual approval interruption is required for the previously validated qwen3.5 control path. |
| `AOR-E2E-015` | `R-047`, `R-048`, `R-049`, `DS-009` | Browser Applications route -> application host -> persisted resource-configuration / launch-setup surface | Executable validation (real frontend browser journey) | Pass | The actual `/applications` flow now presents the launch-setup surface, shows automatic tool execution as the authoritative host-managed behavior, blocks entry until the required saved model exists, and only then boots the Brief Studio iframe host. |

## Test Scope

- In scope:
  - real `/applications` browser journey through the live frontend
  - actual application card click -> host setup gate -> saved launch defaults -> app entry
  - authoritative pre-entry blocking behavior from `DS-009`
  - live Brief Studio in-app create-brief and launch-draft-run flows using the saved host-managed launch defaults
  - live AutoByteus team creation, live `publish_artifact` execution, live projected artifact rendering, and app-owned review mutations in the app UI
- Explicitly not broadened:
  - exhaustive qualification of every LM Studio model exposed in the generic host model selector
  - unrelated legacy `application-sessions` assets outside the changed boundary
  - non-Brief-Studio application business workflows beyond the focused Socratic/Brief durable suites already rerun

## Validation Setup / Environment

- Live backend command:
  - `node autobyteus-server-ts/dist/app.js --data-dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/live-browser-round7/server-data --host 0.0.0.0 --port 8000`
- Live frontend command:
  - `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web dev --host 0.0.0.0 --port 3000`
- Worktree-local isolated env file:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/.local/live-browser-round7/server-data/.env`
- Browser path exercised:
  - `http://localhost:3000/applications`
  - clicked the real `Brief Studio` application card
  - completed the real `/applications/:applicationId` launch-setup surface before entry
  - entered the app only after saved setup became launch-ready
- Because the app UI is hosted in a cross-origin iframe (`3000` host -> `8000` app asset), browser DOM automation opened the exact iframe asset URL in a separate tab with the same bootstrap envelope the host sends to the iframe, then exercised the real app DOM there.

## Tests Implemented Or Updated

- No repository-resident durable validation code was added or updated in round 7.
- Re-executed focused durable validation:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-ts/tests/unit/llm/api/lmstudio-llm.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-ts/tests/unit/llm/prompt-renderers/lmstudio-chat-renderer.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/application-resource-configuration-service.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/application-orchestration-host-service.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/publish-artifact-tool.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-backend/app-owned-graphql-executors.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationShell.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationIframeHost.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts`

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `None`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

- Live frontend host screenshot: `/Users/normy/.autobyteus/browser-artifacts/f6e8e5-1776699491796.png`
- Live Brief Studio app screenshot: `/Users/normy/.autobyteus/browser-artifacts/cdbbaf-1776699491718.png`

## Temporary Validation Methods / Scaffolding

- Opened the hosted iframe asset in a separate browser tab with the same bootstrap payload used by `ApplicationSurface` so the real app frontend could be driven despite the cross-origin iframe boundary.
- Used one browser-side `fetch(...)` call against the same resource-configuration REST endpoint that the host setup panel uses in order to switch the saved model default from the user-selected exploratory qwen3.5 variant to the requested qwen3.6 target model before the authoritative qwen3.6 live rerun.

## Dependencies Mocked Or Emulated

- Durable server integration tests still use the emulated team runtime layer for narrow orchestration-boundary proof.
- The round-7 live browser runs used the real backend worker, real Nuxt frontend, real AutoByteus runtime team creation, real LM Studio model endpoints, and real application websocket notifications.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 3 | `AOR-E2E-011` | `Fail` | Resolved | Packaged generated-client imports and the imported-package integration suite still passed in round 7. | Remains resolved. |
| 5 | `AOR-E2E-013` | `Fail` | Resolved | Live qwen3.6 rerun on brief `brief-64a22d3f-ca4c-4b5a-960e-25082e92718f` reached `brief.ready_for_review`, projected a final artifact into the real UI, and then approved successfully through the app-owned review flow. | The earlier provider/runtime failures no longer block the requested qwen3.6 path. |
| 5 | `AOR-E2E-014` | `Fail` | Resolved | The previously validated qwen3.5 control path remains resolved and no manual approval interruption regressed in round 7 durable/live checks. | Remains resolved. |
| 6 | `AOR-E2E-015` | `Fail` | Resolved | The real `/applications` host now renders the launch-setup surface, blocks entry until the required saved model exists, and enters the iframe host only after the setup becomes launch-ready. | The prior missing-pre-entry-surface failure is closed. |

## Scenarios Checked

- `AOR-E2E-001` through `AOR-E2E-015`.

## Passed

- Focused build/test reruns for the shared SDKs, LM Studio renderer/adapter subset, server host/recovery/GraphQL path, and web host/setup/iframe suite.
- Real frontend/browser path from `/applications` into the live Brief Studio host page, including the authoritative launch-setup gate and save-before-entry flow.
- Real browser creation of business-owned briefs through the hosted backend-mount GraphQL path.
- Real qwen3.6 provider-backed draft run using the saved host setup default, including live `publish_artifact` execution, final artifact projection, and rendered final brief content in the UI after refresh.
- Real app-owned review workflow mutations after the final artifact rendered, including approval from the real UI.

## Failed

- None.

## Not Tested / Out Of Scope

- Exhaustive qualification of every alternative LM Studio model surfaced in the generic host model picker.
- Separate settings-page resource-configuration UX beyond the now-authoritative pre-entry gate on `/applications/:applicationId`.

## Blocked

- None.

## Cleanup Performed

- Temporary backend/frontend validation processes and browser tabs were closed after evidence capture and report update.

## Classification

- `Pass`

## Recommended Recipient

- `delivery_engineer`

## Evidence / Notes

Executed successfully:

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-sdk-contracts build`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-backend-sdk build`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-frontend-sdk build`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-ts build`
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build`
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/socratic-math-teacher build`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web build`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-ts exec vitest run tests/unit/llm/api/lmstudio-llm.test.ts tests/unit/llm/prompt-renderers/lmstudio-chat-renderer.test.ts`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-resource-configuration-service.test.ts tests/unit/application-backend/app-owned-binding-intent-correlation.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts tests/unit/application-orchestration/publish-artifact-tool.test.ts tests/unit/application-backend/app-owned-graphql-executors.test.ts tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web exec vitest run components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationShell.spec.ts components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts`

Live browser evidence on 2026-04-20:

- The actual `/applications` page loads, the `Brief Studio` card is clickable, and `/applications/:applicationId` now renders a real launch-setup panel plus pre-entry gate before the iframe is shown.
- The host-managed setup surface explicitly states that automatic tool execution is always enabled for this application flow.
- Entry stayed blocked until a saved default model existed, then the iframe host booted only after the saved setup became launch-ready.
- Authoritative qwen3.6 live run IDs:
  - brief: `brief-64a22d3f-ca4c-4b5a-960e-25082e92718f`
  - binding: `806cb674-8099-41b3-83d9-027ba49e6d8a`
  - run: `team_brief-studio-team_57785582`
  - final state: `brief.ready_for_review` notification delivered, final artifact rendered in the UI, then `approveBrief` updated the review state from the real browser.
- Additional exploratory note: the user-selected initial host default `qwen/qwen3.5-35b-a3b:lmstudio@127.0.0.1:1234` produced a working draft artifact and then failed final publication because that model stringified `artifactRef` on an earlier `publish_artifact` call. The requested qwen3.6 rerun remained the authoritative provider-backed result for this round and passed.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: `The full real browser journey now works: Applications -> Brief Studio -> host setup save -> app entry -> qwen3.6 live run -> final projected artifact -> review mutation. No repository-resident validation code changed during this round.`
