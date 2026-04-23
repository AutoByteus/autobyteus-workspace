# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/in-progress/hosted-application-lifecycle-ownership/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/in-progress/hosted-application-lifecycle-ownership/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/in-progress/hosted-application-lifecycle-ownership/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/in-progress/hosted-application-lifecycle-ownership/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/in-progress/hosted-application-lifecycle-ownership/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/in-progress/hosted-application-lifecycle-ownership/review-report.md`
- Current Validation Round: `4`
- Trigger: `Resume after review round 5 passed and rerun the original authoritative hosted frontend qwen/autobyteus business scenario that previously failed as HALO-E2E-009.`
- Prior Round Reviewed: `3`
- Latest Authoritative Round: `4`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Review round-2 pass handoff | N/A | 0 | Pass | No | Proved supported `/applications/:id` host launch, direct raw bundle unsupported-entry behavior, post-bootstrap startup ownership, and startup-failure containment. |
| 2 | Review round-3 pass handoff after the immersive Host Controls UX regression fix, plus follow-up request to exercise Brief Studio business flow | None | 0 | Pass | No | Revalidated immersive host-controls UX, reran owner-local durable tests, and proved Brief Studio could still create two real briefs through the shipped hosted startup path. |
| 3 | User-requested host-route rerun with the actual frontend user path and requested `qwen3.6-35b-a3b` model | None | 1 | Fail | No | The host route correctly surfaced the requested launch defaults, the app created a real brief, and `Generate draft` started a real agent-team run plus host-visible notifications, but the flow never advanced to `brief.ready_for_review` / approval within the observation window. |
| 4 | Resume after review round-5 pass resolving the follow-up implementation/runtime fixes and explicitly rerun the same hosted qwen/autobyteus path | `HALO-E2E-009` | 0 | Pass | Yes | The real host route now reaches `brief.ready_for_review`, projects researcher + writer artifacts, surfaces the expected notifications, and persists approval under the requested qwen model. |

## Validation Basis

Round 1 remains the authoritative evidence for the unchanged lifecycle-ownership boundaries: supported host launch, direct raw bundle unsupported behavior, post-bootstrap ownership handoff, and framework-owned startup-failure containment.

Round 2 remains the authoritative evidence for the immersive Host Controls UX regression fix and the explicit “create two briefs” business probe.

Round 3 established the correct higher-level business boundary for this ticket: the real hosted frontend route users actually enter, not only the lower-level bundle-entry probe. That round failed on the requested qwen/autobyteus path and was routed as a bounded implementation fix.

Round 4 rechecked that same authoritative boundary after the new review-passed implementation. The rerun again used the real `/applications/:id` route, the host-managed launch gate, the exact requested `qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234` model, real backend notifications, real app-owned artifact publication, and real approval persistence.

The implementation handoff’s `Legacy / Compatibility Removal Check` remained clean (`Backward-compatibility mechanisms introduced: None`). No compatibility wrappers, dual-path behavior, or legacy-retention branches were observed in the validated scope.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Intended pass handoff recipient: `delivery_engineer`

## Validation Surfaces / Modes

- Historical round-2 owner-local durable validation reruns for the reviewed host-route / immersive-panel component owners
- Real backend service on `http://127.0.0.1:18000`
- Real Nuxt frontend dev server on `http://127.0.0.1:13000`
- **Authoritative business validation:** Playwright-driven Google Chrome run against the real hosted frontend route, entering the application from the host-managed launch gate and driving the real Brief Studio iframe UI end-to-end
- Backend GraphQL cross-checks against the mounted Brief Studio backend during and after UI-driven actions
- Backend log inspection for the launched drafting-team runtime and artifact publication path
- Historical round-2 direct shipped bundle-entry probe retained only as earlier supporting evidence for non-authoritative lower-level checks

## Platform / Runtime Targets

- Host OS: `Darwin arm64` (`macOS`)
- Browser target: `Google Chrome` via `playwright-core`
- Node.js: `v22.21.1`
- pnpm: `10.28.2`
- Backend target: `autobyteus-server-ts` on `http://127.0.0.1:18000`
- Frontend target: `autobyteus-web` on `http://127.0.0.1:13000`
- Requested drafting model for authoritative hosted business validation: `qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234`
- Requested drafting runtime kind for host launch defaults: `autobyteus`

## Lifecycle / Upgrade / Restart / Migration Checks

- Route lifecycle covered historically:
  - setup gate with saved launch defaults
  - supported host-route entry into immersive application mode
  - host-generated query-hinted iframe launch URL for the current launch instance
  - immersive Host Controls open/close
  - immersive Configure panel layout ownership in panel presentation
  - pinned footer behavior while the configure body scrolls
  - resize drag plus resize-event reclamping in the live route
- Business lifecycle rechecked authoritatively in round 4:
  - host launch gate surfaced the saved qwen/autobyteus/workspace defaults
  - entering the application from the host route launched the real Brief Studio iframe business UI
  - creating a brief produced a real app-owned business record and `brief.created` notification
  - `Generate draft` produced a real app-owned run binding and `brief.draft_run_started` notification
  - the app stayed subscribed to backend notifications and waited for downstream business updates
  - the researcher artifact was published into the brief
  - the writer artifact was published into the brief
  - the app observed `brief.ready_for_review`
  - approval through the hosted iframe UI persisted as backend brief status `approved`
- Raw/direct bundle unsupported behavior and controlled startup failure containment: `Previously validated in round 1 and unchanged by this rerun`
- Upgrade / migration / installer / desktop restart: `Not in scope for this ticket`

## Coverage Matrix

| Scenario ID | Requirement / design focus | Validation mode | Result | Evidence |
| --- | --- | --- | --- | --- |
| `HALO-E2E-001` | `REQ-HALO-001`, `REQ-HALO-002`; Brief Studio still enters immersive mode through the supported host route after the host-controls fix | Real frontend + real backend + browser tools | Pass (round 2) | `browser-validation-results.json`, `HALO-E2E-007-immersive-host-controls-wide.png` |
| `HALO-E2E-007` | Reviewed Host Controls UX fix; Configure uses panel-owned stacked layout, pinned footer actions, and readable resize behavior | Real frontend + real backend + browser tools + live DOM interaction | Pass (round 2) | `browser-validation-results.json`, `HALO-E2E-007-immersive-host-controls-wide.png`, `HALO-E2E-007-immersive-host-controls-min-width.png` |
| `HALO-E2E-008` | `REQ-HALO-006`; Brief Studio still performs meaningful post-bootstrap work by creating two brief records | Backend-served bundle entry HTML + valid bootstrap envelope + real backend GraphQL/API + browser tools | Pass (round 2) | `brief-studio-business-results.json`, `HALO-E2E-008-brief-studio-two-briefs.png` |
| `HALO-E2E-009` | Authoritative real-user business path: hosted frontend route + requested `qwen3.6-35b-a3b` model must create a brief, start the drafting team, wait for review-ready events, project artifacts, and allow approval | Real frontend host route + real backend + Playwright + backend GraphQL + backend logs | **Pass (round 4)** | `host-route-brief-business-results.json`, `qwen-resource-config.json`, `backend-setup-results.json`, `HALO-E2E-009-host-route-gate-qwen.png`, `HALO-E2E-009-host-route-pre-approve.png`, `HALO-E2E-009-host-route-approved.png`, `backend.log` |

## Test Scope

Round 4 rechecked the same scenario that failed in round 3 because `HALO-E2E-009` is the authoritative boundary for the user’s stated business concern: use the real host route, trigger the agent-team run, wait for the application to receive the right event, and then approve through the UI.

This round therefore focused on the real `/applications/:id` route, the host-managed launch gate, the launched iframe business surface, live backend notifications, backend artifact projection, and approval persistence under the exact model the user requested.

## Validation Setup / Environment

1. Reused the review-passed cumulative package under the same canonical ticket workspace.
2. Kept earlier historical evidence under:
   - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round2/`
   - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round3/`
3. Created a fresh isolated round-4 workspace under:
   - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/`
4. Used alternate local ports because unrelated local services were already bound to `3000` / `8000`, and isolation mattered more than reusing those defaults:
   - backend `http://127.0.0.1:18000`
   - frontend `http://127.0.0.1:13000`
5. Started `autobyteus-server-ts` with explicit isolated settings:
   - `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:18000`
   - `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS=/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership`
   - `DATABASE_URL=file:/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/data/db/production.db`
6. Started `autobyteus-web` on `http://127.0.0.1:13000` with backend env overrides targeting `http://127.0.0.1:18000`.
7. Queried the real backend GraphQL endpoint and persisted setup/runtime discovery to `backend-setup-results.json`.
8. Confirmed the requested model was discoverable from the live backend as an LM Studio model match for `qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234`.
9. Persisted the Brief Studio `draftingTeam` host launch defaults to the user-requested model and workspace:
   - `llmModelIdentifier=qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234`
   - `runtimeKind=autobyteus`
   - `workspaceRootPath=/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/brief-team-workspace-qwen3.6-35b-a3b`
10. Opened the real host route `http://127.0.0.1:13000/applications/<brief-studio-app-id>` in Playwright/Chrome.
11. Verified the host launch gate itself showed the expected runtime/model/workspace defaults before entering the application.
12. Entered the application through the host route, drove the real iframe Brief Studio UI, instrumented the frame WebSocket notifications, created a brief, launched a draft run, waited for downstream notifications/backend state changes, and then approved the ready-for-review brief through the UI.
13. Copied the backend server log snapshot to `.local/hosted-application-lifecycle-ownership-api-e2e-round4/logs/backend.log` before cleanup.

## Tests Implemented Or Updated

No repository-resident tests were added or updated in this validation round.

Historical durable validation reruns from round 2 remain relevant context:

- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web exec nuxi prepare`
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-web test:nuxt --run components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts utils/application/__tests__/applicationAssetUrl.spec.ts components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationLaunchDefaultsFields.spec.ts`
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/autobyteus-server-ts build`

Temporary round-4 executable validation harness:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/host-route-brief-business-flow.mjs`

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated: `None`
- If `Yes`, returned through `code_reviewer` before delivery: `No`
- Post-validation code review artifact: `N/A`

## Other Validation Artifacts

Round-4 authoritative artifacts:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/backend-setup-results.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/resource-configurations-before.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/resource-configuration-results.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/qwen-resource-config.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/host-route-brief-business-flow.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/host-route-brief-business-results.json`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/logs/backend.log`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/screenshots/HALO-E2E-009-host-route-gate-qwen.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/screenshots/HALO-E2E-009-host-route-before-create.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/screenshots/HALO-E2E-009-host-route-created-brief.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/screenshots/HALO-E2E-009-host-route-after-generate-click.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/screenshots/HALO-E2E-009-host-route-pre-approve.png`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/screenshots/HALO-E2E-009-host-route-approved.png`

Historical retained artifacts:

- Round 3 prior-failure context under `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round3/`
- Round 2 earlier-passing scenarios under `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round2/`

## Temporary Validation Methods / Scaffolding

- Temporary isolated backend data directory under `.local/hosted-application-lifecycle-ownership-api-e2e-round4/data/`
- Temporary dedicated drafting-team workspace under `.local/hosted-application-lifecycle-ownership-api-e2e-round4/brief-team-workspace-qwen3.6-35b-a3b/`
- Temporary Playwright harness `host-route-brief-business-flow.mjs` to drive the real hosted frontend route and cross-origin application iframe in a way the browser-tab tool surface cannot
- Temporary WebSocket instrumentation injected into the launched Brief Studio frame to capture real backend notification topics delivered to the running business UI

## Dependencies Mocked Or Emulated

- Real backend behavior under the reviewed host-route boundary: `Used`
- Real frontend host route and launch gate: `Used`
- Real Brief Studio iframe business UI after host entry: `Used`
- Real backend WebSocket notifications: `Used`
- Real backend GraphQL/API state: `Used`
- Real drafting-team resource slot with the requested model/runtime/workspace defaults: `Used`
- Repository implementation code patched or mocked during validation: `No`
- Temporary automation harnessing only: `Yes, for browser driving/instrumentation`

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 3 | `HALO-E2E-009` hosted qwen/autobyteus path stalled at `researching` and never reached `brief.ready_for_review` | `Local Fix` | `Resolved in round 4` | `host-route-brief-business-results.json`, `qwen-resource-config.json`, `backend.log`, `HALO-E2E-009-host-route-approved.png` | The same authoritative host-route + qwen scenario now publishes both artifacts, emits `brief.ready_for_review`, and persists approval. |

## Scenarios Checked

### `HALO-E2E-001` — Brief Studio supported host route still enters immersive mode after the Host Controls fix
- Historical round-2 pass remains valid.

### `HALO-E2E-007` — Immersive Host Controls Configure panel keeps panel-owned layout, pinned footer actions, and readable resize behavior
- Historical round-2 pass remains valid.

### `HALO-E2E-008` — Brief Studio business flow can create two briefs through the hosted application UI
- Historical round-2 pass remains valid.

### `HALO-E2E-009` — Hosted frontend route with the requested qwen model must reach the review-ready / approval business boundary
- Opened the real Brief Studio `/applications/:id` host route on `http://127.0.0.1:13000`.
- Verified the host launch gate showed the saved launch defaults for the `draftingTeam` slot:
  - runtime `autobyteus`
  - model `LM Studio / qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234`
  - workspace root `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/.local/hosted-application-lifecycle-ownership-api-e2e-round4/brief-team-workspace-qwen3.6-35b-a3b`
- Entered the application through the real host route instead of bypassing the host with a direct bundle tab.
- Created a real brief titled `HALO Host Qwen Recheck 2026-04-23T17-49-23-440Z` from the hosted iframe UI.
- Observed the real backend notification `brief.created` in the running iframe and confirmed the created brief existed in backend GraphQL state.
- Clicked `Generate draft` in the hosted iframe UI.
- Observed the real backend notification `brief.draft_run_started` in the running iframe.
- Confirmed backend GraphQL projected a real app-owned binding/run association:
  - `briefId=brief-eb636c0b-6f85-4920-a0a5-a26856b25301`
  - `bindingId=a68711e4-edeb-4ad4-8e0f-456acf3683d4`
  - `runId=team_brief-studio-team_26907ef0`
  - binding status `ATTACHED`
- Confirmed the hosted application stayed subscribed to backend notifications and refreshed while waiting.
- Observed the researcher artifact publication at `2026-04-23T17:50:33.814Z`.
- Observed the writer artifact publication at `2026-04-23T17:52:57.309Z`.
- Observed the ready-for-review transition by notification and backend state:
  - notification topic `brief.ready_for_review`
  - brief status `in_review`
  - artifact count `2`
  - artifact producers `researcher`, `writer`
- Approved the brief through the hosted iframe UI.
- Observed `brief.review_updated` and confirmed backend approval persistence:
  - brief status `approved`
  - `approvedAt=2026-04-23T17:53:01.682Z`
  - no backend `lastErrorMessage`

## Passed

- `HALO-E2E-001` (historical round 2)
- `HALO-E2E-007` (historical round 2)
- `HALO-E2E-008` (historical round 2)
- `HALO-E2E-009` (authoritative round 4 recheck)

## Failed

None in the latest authoritative round.

## Not Tested / Out Of Scope

- Direct raw bundle unsupported-entry behavior was not rerun in round 4 because the authoritative resumed ask was to recheck the real hosted qwen/autobyteus path that had previously failed.
- Cross-browser confirmation beyond local Chrome/Playwright and the earlier browser-tool environment remains out of scope.
- Desktop-specific lifecycle behaviors (installer/update/restart/migration) remain out of scope for this web-hosted lifecycle ticket.
- Semantic product-quality review of the generated research/final brief content was not part of this validation pass; this round validated orchestration, event delivery, artifact projection, and approval persistence through the real user path.

## Blocked

None.

## Cleanup Performed

- Temporary evidence artifacts were kept under `.local/hosted-application-lifecycle-ownership-api-e2e-round4/` for downstream review.
- Backend and frontend runtime processes were stopped after evidence capture.
- The isolated validation ports (`18000`, `13000`) were confirmed free after shutdown.
- No repository source files or durable tests were modified during validation.

## Classification

`Pass`

The previous implementation-side hosted qwen/autobyteus stall is no longer reproducible on the authoritative real host route. The business flow now reaches ready-for-review and approval through the same boundary the user asked to validate.

## Recommended Recipient

`delivery_engineer`

## Evidence / Notes

- The user’s correction about validating through the hosted frontend route remained correct; round 4 kept that route authoritative.
- The user’s requested model was honored exactly at the host gate and in the persisted resource configuration.
- This round proves the app triggers the team run, waits/reacts to backend events, projects artifacts back into the business UI, and persists approval on the real hosted path.
- No compatibility or legacy-retention behavior was observed.
- No repository-resident durable validation was added or updated in this stage.

## Latest Authoritative Result

- Result: `Pass`
- Notes: The real hosted frontend route with the requested `qwen3.6-35b-a3b:lmstudio@127.0.0.1:1234` launch default now successfully creates a brief, starts the drafting team, publishes researcher and writer artifacts, emits `brief.ready_for_review`, and persists approval through the actual hosted user path.
