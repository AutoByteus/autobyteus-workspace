# Docs Sync Report

## Scope

- Ticket: universal-application-framework-latest-personal-integration
- Trigger: CRR-010 Pass after SR-003, ARCH-REV-003, IR-006, CRR-009, and API-REV-004
- Bootstrap base: origin/personal at 8ef282ba77705180d985e7000d801f0e0068cdc1
- Integrated base used for docs sync: origin/personal at 8ef282ba77705180d985e7000d801f0e0068cdc1
- Post-integration reference: delivery checkpoint 42496b808df16f4ed24ca66bac03372c578f1f89 and evidence/delivery/dr-001-*

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

## Delivery Continuation

- Result: Pass
- Next action: present the exact unsigned macOS ARM64 package for explicit user verification.
- Hold: ticket remains in progress; no push, archive, Personal merge, release, deployment, or cleanup before explicit verification.

## Blocked Or Escalated Follow-Up

None.
