# Docs Sync Report

## DR-006 Current Status

- Result: **Blocked before integrated-state docs sync — Design Impact.**
- Newest fetched base: `origin/personal@a00f0d07d00450785c424b6ab79d2ca8fe828869`, five commits beyond DR-005.
- New durable base behavior: nested team restart hydration, `TeamRunPhysicalScope`, nested team-agent memory placement, settled nested-task navigation, and a registered team-agent memory-layout app-data migration.
- Merge-tree result: three non-mechanical conflicts; no actual merge was started.
- Docs disposition: do not claim the new server/web/migration docs as integrated until Solution Designer resolves how the new physical scope combines with the application-framework branch's graph-local Agent Tools/memory dependencies and prepared activation behavior.
- Canonical analysis: `latest-base-refresh-round-2-conflict-report.md`.
- Electron disposition: no DR-006 build; DR-005 artifacts are superseded for the newest-base request.

## DR-005 Current Authoritative Sync

- Trigger: delivery re-entry after the DR-004 latest-Personal conflicts were resolved under `SR-004` / `ARCH-REV-004` / `IR-007`, source review `CRR-012` Pass, `API-REV-007` Pass / 98, and `CRR-013` Pass.
- Integrated base: `origin/personal@7edfb162559ec5a6eb4c00c23a929920eabe3dc1` through merge `5cf9b8eb22a3b83c114dbb4199341a65aaee8cea`.
- Delivery integrated-state checkpoint: `a2756b28d7e72ec49acca0753194eeb1775c11de`; post-build fetch confirmed the base remained unchanged and an ancestor.
- Result: **Pass; no further delivery-owned long-lived documentation edit required.**

Current long-lived documentation impact:

| Documentation | Result | Basis |
| --- | --- | --- |
| `autobyteus-application-sdk-contracts/README.md` | Current in integrated source | Conflict resolution preserves the v6 exact-target contract and documents that application ERROR retains the original safe provider message while remaining closed and metadata-free. |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Current from latest Personal | Documents the current provider catalog/model ownership behavior. |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Current from latest Personal | Documents pricing/analytics behavior and the existing base-owned analytics migration. |
| `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` and `docs/modules/application_communication_model.md` | Current from latest Personal plus reviewed integration | Describe current native error/event behavior; the narrower application SDK boundary is covered by its canonical README. |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | Current from latest Personal | Matches the integrated streaming/error transport. |
| DR-001 application-framework docs | Still current | v6 contract separation and logical selector → binding-owned exact `agentRunId` remain unchanged. |
| Root/web Electron README and `electron_packaging.md` | No impact | The documented Personal macOS build and packaged isolation commands remained accurate and passed in DR-005. |

Removed/replaced concepts remain explicit: the legacy execution-resource configuration service/launch-profile owner, broad engine host, generated application SDK `dist` as maintained source, and provider metadata on the closed application ERROR event remain absent. Current-model selection is owned by the application-platform policy and retained launch/readiness/run owners.

Persisted-data result: the SR-004/IR-007 conflict-resolution delta is **Directly Usable — No Migration**. The integrated history retains the previously documented additive `20260822090000_add_token_usage_analytics` base migration; no newer migration was added by this refresh.

Delivery-owned artifacts updated for DR-005: `electron-test-build-report.md`, `handoff-summary.md`, `release-deployment-report.md`, and `delivery-revision-record.md`. The ticket remains in progress for explicit user verification.

## Scope

- Ticket: universal-application-framework-latest-personal-integration
- Trigger: user-requested DR-003 integration of advanced origin/personal and Electron rebuild; prior source/docs baseline remains SR-003, ARCH-REV-003, IR-006, CRR-009, API-REV-004, CRR-010, API-REV-006, and CRR-011
- Bootstrap base: origin/personal at 8ef282ba77705180d985e7000d801f0e0068cdc1
- Integrated base used for docs sync: origin/personal at d7d4eace46dc6534d50e9150c3e84d4bd41fedfb
- Post-integration reference: merge f8d0bf67a9cdb89da8e3cb24b8331744d9f61865; evidence/delivery/dr-003-base-refresh-and-integration.log plus DR-003 Electron build/isolation/verification evidence

## Why Docs Were Updated

Several long-lived authoring/runtime documents still described the backend-definition and frontend-SDK contracts as v4. The integrated manifests, shared constants, devkit, and server validators use v6. The independent application manifest and iframe/bootstrap contracts remain v4, while the backend bundle remains v1.

IR-006 also establishes durable identity guidance: a configured logical member address selects a binding member, but runtime dispatch uses that member's exact binding-owned agentRunId. This belongs in canonical docs so application authors do not recreate APIE2E-F004.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| autobyteus-application-sdk-contracts/README.md | Shared manifest/SDK contract overview | Updated | Corrected backend-definition/frontend-SDK v4 claims to v6; preserved manifest and iframe/bootstrap v4. |
| autobyteus-application-backend-sdk/README.md | Backend definition and target-builder guidance | Updated | Uses definition v6 and demonstrates logical role selection followed by exact agentRunId projection. |
| docs/custom-application-development.md | External devkit guide | Updated | Validator description now identifies v6 frontend-SDK/backend-definition compatibility. |
| autobyteus-server-ts/docs/modules/applications.md | Bundle discovery/validation authority | Updated | Corrected UI and backend SDK compatibility values to v6. |
| autobyteus-server-ts/docs/modules/application_engine.md | Worker definition-loading authority | Updated | Corrected required backend definition contract to v6. |
| autobyteus-server-ts/docs/modules/application_orchestration.md | Binding and dispatch authority | Updated | Records logical memberAddress to exact agentRunId translation and RootTeamRun dispatch. |
| applications/socratic-math-teacher/README.md | Maintained sample using the corrected tutor path | Updated | Clarifies logical /tutor selection and exact target projection. |
| applications/brief-studio/README.md | Other maintained application | No change | Current publication, handoff, projection, and recovery guidance remains accurate. |
| autobyteus-application-frontend-sdk/README.md | Frontend communication surface | No change | Address-based connection guidance remains accurate and has no stale version claim. |
| autobyteus-web/docs/applications.md and application-bundle-iframe-contract.md | Studio host and iframe contract | No change | Iframe/bootstrap remains independently v4 and must not be conflated with frontend SDK v6. |
| Root README.md, autobyteus-web/README.md, and electron_packaging.md | Electron build and package guidance | No change | DR-001 followed the documented personal macOS ARM64 flow. |

## Docs Updated

| Doc Path | Type | What Changed | Why |
| --- | --- | --- | --- |
| autobyteus-application-sdk-contracts/README.md | Contract versions | Backend definition/frontend SDK now say v6. | Matches shared constants. |
| autobyteus-application-backend-sdk/README.md | Example and identity | Definition example now uses 6; member target passes the selected member's agentRunId. | Prevents stale packages and address-versus-ID misuse. |
| docs/custom-application-development.md | Authoring guide | Validator description now says v6 frontend-SDK/backend-definition. | Matches current devkit behavior. |
| autobyteus-server-ts/docs/modules/applications.md | Bundle contract | UI/backend compatibility and loaded definition now say 6. | Matches server validators. |
| autobyteus-server-ts/docs/modules/application_engine.md | Worker contract | Required definition version now says 6. | Matches the worker definition loader. |
| autobyteus-server-ts/docs/modules/application_orchestration.md | Runtime invariant | Added logical-selector versus exact-runtime-ID rule. | Promotes IR-006 out of ticket-only evidence. |
| applications/socratic-math-teacher/README.md | Sample behavior | Clarified /tutor selection and exact agentRunId projection. | Documents the real resolved path. |

## Durable Design / Runtime Knowledge Promoted

| Topic | Future-reader invariant | Source | Target |
| --- | --- | --- | --- |
| Contract separation | Application manifest and iframe/bootstrap are v4, backend bundle is v1, current backend-definition/frontend-SDK compatibility is v6. | requirements.md, current constants and validators | SDK/backend READMEs, custom guide, server Applications/Engine docs |
| Logical versus exact identity | initialInput.targetMemberAddress is a selector; the durable binding supplies the exact agentRunId used by runtime dispatch. | IR-006, CRR-009, API-REV-004 | Application Orchestration doc |
| Socratic tutor projection | Socratic selects /tutor from the binding and exposes that member's exact target identity. | IR-006 and API-REV-004 | Socratic and backend SDK READMEs |

## Removed / Replaced Components Recorded

| Old Concept | Replacement | Documentation |
| --- | --- | --- |
| Stale v4 backend-definition/frontend-SDK guidance | Current v6 compatibility | Updated SDK, guide, and server docs |
| Logical member address forwarded into an exact runtime-ID slot | Binding lookup followed by exact agentRunId dispatch | Application Orchestration doc and Socratic README |
| Obsolete leaf-snapshot integration test | Current WebSocket/stream/projector/exact-target/egress suites | api-e2e-test-review-report.md; no separate product concept remains |

## Documentation Audit Result

- Current constants, maintained manifests, devkit tests, server validators, and worker loader agree on contract 6.
- No long-lived Markdown outside historical ticket/archive material still claims v4 for backend-definition/frontend-SDK compatibility.
- Iframe/bootstrap v4 remains unchanged and explicitly distinct.
- Generated SDK dist output created by Electron prerequisites was removed after package verification.
- Delivery diff hygiene passes in evidence/delivery/dr-001-delivery-audit.log.

## DR-002 API-REV-006 Documentation Impact

- Additional long-lived docs impact: No impact.
- Rationale: API-REV-006 changed no production source, repository-resident durable test, manifest, SDK contract, user workflow, persisted-data behavior, or packaging policy. It executed the already-built DR-001 artifact through a live credentialed Classroom Simulation Team journey. CRR-011 independently confirmed the proportional durable-test review is Not Applicable because the durable path delta is zero.
- Existing documentation status: the DR-001 v6 contract corrections and logical member selector versus exact binding-owned agentRunId guidance remain accurate and complete.
- Delivery artifact impact: electron-test-build-report.md, handoff-summary.md, release-deployment-report.md, and delivery-revision-record.md were refreshed to record the stronger actual Electron/Codex/DeepSeek evidence, value-safe credential handling, and cleanup result.
- Latest-base confirmation: origin/personal remains 8ef282ba77705180d985e7000d801f0e0068cdc1; no new base documentation was integrated.

## DR-003 Advanced-Base Documentation Impact

- Base advancement: origin/personal advanced 18 commits and 201 paths to d7d4eace46dc6534d50e9150c3e84d4bd41fedfb.
- New durable base behavior: token-usage analytics with compact daily/facet projections and additive schema setup; terminal run_bash/start_background_process accepts an absolute existing accessible cwd outside the configured workspace while rejecting relative values before process creation.
- Canonical base docs reviewed: autobyteus-server-ts/docs/modules/token_usage.md, autobyteus-web/docs/settings.md, autobyteus-web/docs/agent_execution_architecture.md, autobyteus-ts/docs/terminal_tools.md, and autobyteus-ts/docs/tool_schema_and_configuration.md.
- Result: No additional delivery-owned long-lived edit. The finalized base already documents its analytics coverage/no-backfill semantics, UI, absolute-cwd contract, and safety boundary. The conflict-free merge did not alter those docs.
- Application-framework docs: DR-001 v6 contract corrections and logical member selector versus exact agentRunId guidance remain intact; the new base changes no application framework source or contract.
- Electron packaging docs: No change. The existing documented build and packaged-isolation process remains accurate and passed.
- Persisted-data clarification: the application-framework delta still introduces no migration, but the current integrated Personal base contains additive migration 20260822090000_add_token_usage_analytics. It creates analytics tables/coverage state and does not backfill or rewrite existing lifetime run records.

## Delivery Continuation

- Result: Pass
- Next action: present the freshly rebuilt latest-base unsigned macOS ARM64 1.4.55 package for explicit user verification. `API-REV-007` is direct evidence for the conflict-resolved current source; DR-005 provides the current packaged Electron build/isolation/integrity evidence.
- Hold: ticket remains in progress; no push, archive, Personal merge, release, deployment, or cleanup before explicit verification.

## Blocked Or Escalated Follow-Up

None.
