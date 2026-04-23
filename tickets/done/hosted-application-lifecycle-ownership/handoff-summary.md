# Handoff Summary

## Summary Meta

- Ticket: `hosted-application-lifecycle-ownership`
- Date: `2026-04-23`
- Current Status: `Verified and archived`

## Delivery Summary

- Delivered scope:
  - Moved the authoritative iframe/bootstrap contract into `@autobyteus/application-sdk-contracts`.
  - Added the framework-owned `startHostedApplication(...)` startup boundary in `@autobyteus/application-frontend-sdk`.
  - Kept supported host-route lifecycle ownership in `ApplicationShell.vue` and `ApplicationSurface.vue`.
  - Refactored Brief Studio and Socratic Math Teacher to the reviewed thin-entry pattern so business UI mounts only after valid bootstrap handoff.
  - Hardened sample-package browser vendoring so the shipped runtime is self-contained.
  - Added repository-resident durable contract/startup tests and updated the durable docs/READMEs that teach hosted-application authoring.
  - Fixed the follow-up immersive Host Controls UX regression so Configure now stays panel-owned, keeps Reload / Exit pinned in the footer, and preserves readable resize / reclamp behavior in immersive mode.
  - Resolved `HALO-E2E-009` so the real `/applications/:id` hosted Brief Studio qwen/autobyteus path now reaches `brief.ready_for_review`, publishes researcher + writer artifacts, and persists approval.
- Planned scope reference:
  - `tickets/done/hosted-application-lifecycle-ownership/requirements.md`
  - `tickets/done/hosted-application-lifecycle-ownership/design-spec.md`
  - `tickets/done/hosted-application-lifecycle-ownership/implementation-handoff.md`
- Deferred / not delivered:
  - External/imported bundles still on the old manual startup pattern remain follow-up migration work outside this ticket.
  - External release/version publication was explicitly skipped at the user's request.
- Key architectural or ownership changes:
  - `ApplicationShell.vue` remains the supported pre-launch owner.
  - `ApplicationSurface.vue` remains the host-side reveal owner and still completes that reveal boundary on bootstrap delivery.
  - `@autobyteus/application-sdk-contracts` now owns the shared iframe/bootstrap contract.
  - `startHostedApplication(...)` now owns bundle-local startup lifecycle until app handoff completes.
  - `ApplicationImmersiveControlPanel.vue` now explicitly owns immersive Configure width, resize, and pinned-footer behavior instead of leaking full-page breakpoint rules into panel mode.
  - The in-repo sample bundles now own only post-bootstrap business UI.
- Removed / decommissioned items:
  - `autobyteus-web/types/application/ApplicationIframeContract.ts`
  - `autobyteus-web/types/application/ApplicationHostTransport.ts`
  - sample-app `status-banner` startup UX and manual launch-hint / ready-bootstrap wiring

## Delivery Integration Refresh

- Bootstrap base reference:
  - `origin/personal @ 76bbc1a033336288a53e251d9603a2486a60e55e`
- Latest tracked remote base checked during delivery:
  - `origin/personal @ e2667adcd4d64ef3205834a872a67627c013d12b`
- Base advanced since bootstrap or prior refresh:
  - `Yes`
- New base commits integrated:
  - `Yes`
- Local checkpoint commit:
  - `48de018398375f41b794f2b4b8c453eb4c1b1717`
- Integration method:
  - `Merged origin/personal into codex/hosted-application-lifecycle-ownership`
- Post-integration executable rerun:
  - `Yes`
- Notes:
  - `git fetch origin personal --prune` on `2026-04-23` showed the tracked base had advanced to `e2667adcd4d64ef3205834a872a67627c013d12b`.
  - Merge commit `e36a5f2060c2b7a53afe7525f47d3bd5dae3fea8` brought the ticket branch current before archival.
  - The integration refresh required conflict resolution in the team-runtime plumbing and surfaced one duplicate `memoryDir` object key in `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-run-backend-factory.ts`; that integration-local fix was applied and the affected server checks were rerun.
  - No material user-facing change to the delivered hosted-application lifecycle behavior was observed after the latest-base refresh, so renewed manual user verification was not required.

## Verification Summary

- Unit / integration verification:
  - Earlier implementation-level package validation from the cumulative package remains authoritative for the shared contract/startup owners and sample bundle builds.
  - Post-integration reruns passed:
    - `pnpm --dir autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts tests/integration/application-backend/brief-studio-team-config.integration.test.ts tests/unit/agent-team-execution/team-run-service.test.ts tests/unit/agent-team-execution/team-run-runtime-context-support.test.ts tests/unit/agent-team-execution/team-run.test.ts`
    - `pnpm --dir autobyteus-web test:nuxt --run components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts components/applications/__tests__/ApplicationImmersiveControlPanel.spec.ts components/applications/__tests__/ApplicationLaunchSetupPanel.spec.ts components/applications/__tests__/ApplicationLaunchDefaultsFields.spec.ts utils/application/__tests__/applicationAssetUrl.spec.ts`
    - `pnpm --dir autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts tests/integration/agent-team-execution/team-run-service.integration.test.ts tests/integration/application-backend/brief-studio-team-config.integration.test.ts`
- API / E2E verification:
  - `tickets/done/hosted-application-lifecycle-ownership/api-e2e-report.md` round `4` passed and remains the latest authoritative validation report.
  - Round `1` remains the supporting pass for unchanged startup-boundary scenarios.
  - Round `2` remains the supporting pass for the immersive Host Controls UX fix and the two-brief Brief Studio business-flow proof.
  - Round `4` is the authoritative real-user business-path rerun that resolved `HALO-E2E-009` on the real hosted qwen/autobyteus route.
- Acceptance-criteria closure summary:
  - Supported host-route launches passed for Brief Studio and Socratic Math Teacher.
  - Direct raw bundle entry stayed on framework-owned unsupported-entry UX.
  - Both sample bundles rendered their real business UI only after valid bootstrap handoff.
  - Post-delivery startup failure stayed inside the framework-owned `startup_failed` surface.
  - The immersive Configure panel now keeps the reviewed panel-owned stacked layout, pinned footer actions, and readable resize/reclamp behavior in the live Brief Studio route.
  - Brief Studio performed meaningful hosted business work: two briefs were created successfully through the hosted application UI and cross-checked against backend GraphQL state.
  - The real `/applications/:id` qwen/autobyteus rerun showed the requested host-gate defaults, created a real brief, started a real team run, published researcher + writer artifacts, emitted `brief.ready_for_review`, and persisted approval as backend status `approved`.
  - No compatibility-only or legacy-retention behavior was observed in scope.
- Infeasible criteria / user waivers (if any):
  - `None`
- Residual risk:
  - External/imported bundles that still use the old manual startup pattern are not migrated by this ticket.
  - Live `/applications/:id` host-page iframe internals remain cross-origin relative to the frontend host, so direct business-UI assertions there still rely on real-bundle self-bootstrap probes plus backend cross-checks rather than full host-page DOM inspection.

## Documentation Sync Summary

- Docs sync artifact:
  - `tickets/done/hosted-application-lifecycle-ownership/docs-sync.md`
- Docs result:
  - `Updated`
- Docs updated:
  - `autobyteus-web/docs/applications.md`
  - `autobyteus-web/docs/application-bundle-iframe-contract-v1.md`
  - `autobyteus-application-frontend-sdk/README.md`
  - `autobyteus-application-sdk-contracts/README.md`
  - `applications/brief-studio/README.md`
  - `applications/socratic-math-teacher/README.md`
- Notes:
  - Durable docs now describe the shared contract owner, framework-owned startup boundary, unsupported direct raw entry, and the reviewed sample-app authoring pattern.
  - The later immersive Host Controls UX fix, Brief Studio business-flow proof, and authoritative round-4 host-route rerun did not require additional long-lived doc edits beyond those already-updated docs.
  - The latest-base integration refresh against advanced `origin/personal` also did not require any further durable doc delta.

## Release Notes Status

- Release notes required:
  - `Prepared for record only`
- Release notes artifact:
  - `tickets/done/hosted-application-lifecycle-ownership/release-notes.md`
- Notes:
  - Prepared before verification and retained in the archived ticket record.
  - The user explicitly requested finalization without creating a new version, so no release/version publication is planned from this ticket.

## User Verification

- Waiting for explicit user verification:
  - `No`
- User verification received:
  - `Yes`
- Verification reference:
  - `User stated on 2026-04-23: "i would say the ticket is done. lets finalize the ticket, and no need to create a new version"`
- Notes:
  - A local unsigned macOS verification build remained available during verification at:
    - `autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.81.dmg`
    - `autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.81.zip`
  - Because the post-verification latest-base integration did not materially change the delivered hosted-application lifecycle behavior, renewed manual verification was not required.

## Finalization Target

- Archived ticket path:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership/tickets/done/hosted-application-lifecycle-ownership`
- Ticket worktree path:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hosted-application-lifecycle-ownership`
- Ticket branch:
  - `codex/hosted-application-lifecycle-ownership`
- Finalization target remote:
  - `origin`
- Finalization target branch:
  - `personal`
- Commit status:
  - `Completed on ticket branch`
- Push status:
  - `Pending`
- Merge status:
  - `Pending`
- Release/publication/deployment status:
  - `Not requested`
- Worktree cleanup status:
  - `Pending`
- Local branch cleanup status:
  - `Pending`
- Blockers / notes:
  - `No version/tag/release work will be performed because the user explicitly requested no new version creation.`
