# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/in-progress/google-gemini-media-model-support/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/in-progress/google-gemini-media-model-support/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/in-progress/google-gemini-media-model-support/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/in-progress/google-gemini-media-model-support/design-review-report.md`
- Solution Rework Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/in-progress/google-gemini-media-model-support/solution-rework-notes.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/in-progress/google-gemini-media-model-support/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/in-progress/google-gemini-media-model-support/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Code review round 4 passed after CR-002 solution/design/implementation rework; API/E2E resumed after the prior pause.
- Prior Investigation Reviewed: Yes — the prior round-2-based investigation artifact was superseded by CR-002 and is updated here.
- Latest Authoritative Investigation: Round 2, this artifact.

## Current Requirement And Design Basis

The current approved scope is **creation-only** Google Gemini media support:

- Current Gemini image catalog support: add `gemini-3.1-flash-lite-image`, `gemini-3.1-flash-image`, and `gemini-3-pro-image`; keep `gemini-2.5-flash-image`; remove shut-down preview IDs with no compatibility aliases.
- First-class video generation support: add `gemini-omni-flash-preview` through `VideoClientFactory` / `GeminiVideoClient` / `VideoGenerationResponse` and server-owned `generate_video`.
- `generate_video` supports text-to-video plus optional image/reference-image-to-video creation using `prompt`, optional `input_images`, `output_file_path`, and optional `generation_config`.
- `generation_config.task` is optional and limited to `text_to_video`, `image_to_video`, and `reference_to_video`; `edit`, `edit_video`, uploaded/source-video editing, `previous_interaction_id`, stateful editing, audio-reference upload, and voice editing are explicitly deferred/out of scope.
- Video model catalog/default settings must be exposed through GraphQL and web settings/model browser surfaces.
- `generate_video` and MCP-projected `mcp__autobyteus_agent_tools__generate_video` outputs must be treated as generated-output video artifacts.

Implementation handoff's Legacy / Compatibility Removal Check is clean: no backward-compatibility mechanisms were introduced, preview image ID aliases were not retained, and no hidden `task=edit` compatibility path is present. Code review round 4 passed with CR-001 and CR-002 resolved for the current user-approved creation-only scope.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Current Gemini image IDs in built-in image catalog and runtime mapping | Added / Changed | REQ-001, REQ-002, REQ-005; AC-001 to AC-004 | Existing focused catalog/mapping tests remain valid and should be run. |
| Shut-down preview image IDs in built-in catalog/runtime mappings | Removed | REQ-003; design removal plan; no-alias policy | Absence/no-explicit-mapping coverage remains valid; do not add compatibility-alias coverage. |
| First-class video client/model subsystem for `gemini-omni-flash-preview` | Added | REQ-006 to REQ-011; AC-005 to AC-010 | Unit coverage exists for factory/model/provider behavior; run focused tests. |
| `generation_config.task` for creation-only video generation | Added after CR-002 | REQ-014A, AC-012A, solution rework notes | Durable coverage must confirm schema exposes only `text_to_video`, `image_to_video`, `reference_to_video`, rejects/omits `edit`, and provider validation requires images for image/reference tasks. |
| Server-owned `generate_video` manifest/parser/schema/service execution | Added | REQ-012 to REQ-015; AC-011 to AC-015 | API/E2E local-registry coverage must include `generate_video`, MP4 write, input image normalization, explicit task config, and schema/default reload. |
| Video model catalog GraphQL/store/UI settings exposure | Added | REQ-016, REQ-017; AC-016 to AC-019 | GraphQL resolver/schema and focused web store/UI coverage should be run; GraphQL video query needs durable coverage. |
| Generated-output semantics for `.mp4` videos | Added | REQ-018; AC-020 | File-change coverage must include local and MCP `generate_video` names. |
| Existing image/edit-image/speech behavior | Preserved | REQ-019; AC-021 | Regression checks remain valid and should be run with new coverage. |
| Live Gemini Omni Flash execution | Added but provider-gated | AC-022 and implementation/code-review notes | Use a temporary provider-gated probe if credentials exist; provider access failures are skip-classified, not implementation failures. |
| Full Omni editing/source-video/stateful capabilities | Deferred / Out of scope | Solution rework notes and requirements lines for out-of-scope editing | Do not test as delivered behavior; do not create compatibility or hidden edit coverage. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/multimedia/image/image-client-factory.test.ts` | Active Gemini image IDs are listed/created with `GeminiImageClient`; preview IDs absent. | AC-001, AC-002, AC-004 | Still Valid | Test asserts Lite/GA IDs, no preview IDs, and Gemini client construction. | Run focused test. |
| `autobyteus-ts/tests/unit/utils/gemini-model-mapping.test.ts` | Active Gemini image/video mappings resolve by modality/runtime; preview mappings not explicitly retained. | AC-003, AC-006, REQ-003 | Still Valid | Test covers active image IDs, `gemini-omni-flash-preview` video mapping, and no explicit preview mapping behavior. | Run focused test. |
| `autobyteus-ts/tests/unit/multimedia/video/video-client-factory.test.ts` | Video factory lists/creates Gemini Omni model and schema including creation-only `task` values. | AC-005, AC-012A | Still Valid | Current test asserts `text_to_video`, `image_to_video`, `reference_to_video`, no `edit`, and no default task. | Run focused test. |
| `autobyteus-ts/tests/unit/multimedia/video/video-model.test.ts` | Video model schema/default config behavior. | REQ-006 | Still Valid | Supports new video model boundary. | Run focused test. |
| `autobyteus-ts/tests/unit/multimedia/video/api/gemini-video-client.test.ts` | Text-to-video/image-to-video/reference-to-video task mapping, inline output, URI polling/download/cleanup, CR-001 URI/state handling, invalid config, `edit` rejection, and image-required tasks. | AC-007 to AC-010, AC-012A, REQ-008 to REQ-011, REQ-014A | Still Valid | Code review round 4 re-ran video unit tests and accepted this coverage. | Run focused test. |
| `autobyteus-ts/tests/unit/multimedia/utils/response-types.test.ts` | `VideoGenerationResponse.video_urls` exists. | REQ-007 | Still Valid | Test includes video response DTO. | Run focused test. |
| `autobyteus-server-ts/tests/unit/agent-tools/media/media-generation-service.test.ts` | `generateVideo` resolves `video_generation`, resolves input images, writes first video URL, and cleans up. | AC-013 | Still Valid | Unit coverage exercises service boundary. | Run focused test. |
| `autobyteus-server-ts/tests/unit/agent-tools/media/media-tool-input-parsers.test.ts` | `parseGenerateVideoInput` accepts prompt/images/output/config and rejects ambiguous image list shapes via shared parser. | AC-012, REQ-014 | Still Valid | Parser test covers video input shape. | Run focused test. |
| `autobyteus-server-ts/tests/unit/agent-tools/media/media-tool-model-resolver.test.ts` | Video default setting resolution/fallback through `VideoClientFactory`. | AC-015 | Still Valid | Resolver test includes `video_generation`. | Run focused test. |
| `autobyteus-server-ts/tests/unit/agent-tools/media/register-media-tools.test.ts` | Media tool registry contains `generate_video`; schema has input image array and `.mp4` output guidance. | AC-011, AC-012, AC-012A | Still Valid | Registry unit coverage includes video manifest/schema presence; task enum is covered more directly via video factory/schema tests. | Run focused test. |
| `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Local registry executes server-owned media tools and writes files; schema reload changes future invocation; GraphQL tools query exposes nested generation_config; path normalization. | AC-014, AC-015, AC-012, AC-012A, AC-021 | Needs Update | Interrupted API/E2E work had already expanded this file for video execution/catalog coverage, but it must be reconciled with CR-002 by asserting creation-only `task` schema values and using an explicit creation task in invocation. | Update/reconcile and run. |
| `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts` | Provider/model GraphQL resolver grouping and reload behavior. | AC-016 | Needs Update | Interrupted API/E2E work already added video query/reload assertions; retain after verifying against CR-002 scope. | Run focused test; no source behavior change needed unless failures show gaps. |
| `autobyteus-web/tests/stores/llmProviderConfigStore.test.ts` | Frontend store persists video providers/models from provider catalog query. | AC-017 | Still Valid | Test includes video provider rows in fetched store state. | Run focused web test. |
| `autobyteus-web/components/settings/__tests__/MediaDefaultModelsCard.spec.ts` | Media default model selector includes video default and stale persisted value behavior. | AC-019 | Still Valid | Test data/expectations include video fallback/default handling. | Run focused web test. |
| `autobyteus-web/components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts` and `useProviderApiKeySectionRuntime.spec.ts` | Provider browser/runtime includes video model totals and selected-provider details. | AC-018 | Still Valid | Runtime test includes video models in totals/details. | Run focused web tests. |
| `autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts` | Provider API key manager renders through runtime composable with model browser path intact. | AC-018 regression | Still Valid | Broader provider settings regression. | Run focused web test. |
| `autobyteus-server-ts/tests/unit/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.test.ts` | Media input image path normalization for AUTOBYTEUS local tools, including `generate_video`. | UC-004, AC-014 | Still Valid after interrupted API/E2E edit | Current test includes `generate_video` normalization. | Run focused test. |
| `autobyteus-server-ts/tests/unit/agent-execution/events/file-change-event-processor.test.ts` | Generated-output file changes for image/edit/speech plus local/MCP `generate_video`. | AC-020 | Still Valid after interrupted API/E2E edit | Current table includes `generate_video` and `mcp__autobyteus_agent_tools__generate_video` with video artifact type. | Run focused test. |
| `autobyteus-server-ts/tests/integration/api/run-file-changes-api.integration.test.ts` and projection/store tests | Downstream API/projection returns generated-output entries once stored. | AC-020 downstream readback | Still Valid | These tests are source-tool-type generic and do not depend on specific tool-name classification. | No edit; file-change classifier unit is sufficient. |
| Existing live Gemini integration tests under `autobyteus-ts/tests/integration/multimedia/image/api` and `audio/api` | Live provider image/audio coverage. | AC-022 analogue only | Out Of Scope | No durable live video integration test exists; live video is provider-costing/access-gated. | Use temporary provider-gated probe only. |
| Any test asserting `task=edit`, `input_video`, uploaded source video, or `previous_interaction_id` works through `generate_video` | Would assert deferred behavior. | Out-of-scope section and solution rework notes | Stale / Remove if found | No such durable test is currently present in the inspected paths. | Do not add. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale repository-resident coverage needs removal in this round. | Requirements REQ-003 / REQ-014A and solution rework notes. | Active image absence tests and creation-only task tests. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| COV-001 | Local-registry `generate_video` writes expected MP4 bytes with mocked video factory/client and explicit creation task. | AC-014; REQ-012 to REQ-014A | `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Existing server API/E2E local-registry coverage should prove the new video tool boundary, not only unit-level service calls. |
| COV-002 | `DEFAULT_VIDEO_GENERATION_MODEL` affects future/new `generate_video` schema and invocation. | AC-015; REQ-015 | `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Default setting behavior is cross-boundary schema/execution behavior. |
| COV-003 | GraphQL `availableVideoProvidersWithModels` groups video models and global reload calls `reloadVideoModels`. | AC-016 | `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts`; `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | The new GraphQL video catalog boundary needs resolver-level and schema-query coverage. |
| COV-004 | `generate_video` input image references are normalized by the AUTOBYTEUS media input preprocessor. | UC-004; design review implementation note | `autobyteus-server-ts/tests/unit/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.test.ts` | The target-set extension should be durable. |
| COV-005 | Local and MCP `generate_video` tool names classify `.mp4` output as generated-output video artifacts. | AC-020; REQ-018 | `autobyteus-server-ts/tests/unit/agent-execution/events/file-change-event-processor.test.ts` | Generated-output video semantics are a changed boundary. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| COV-001/COV-002/COV-003 | `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Reconcile interrupted API/E2E edits with CR-002 by including task enum schema (`text_to_video`, `image_to_video`, `reference_to_video`, no `edit`), executing `generate_video` with explicit non-edit task, verifying MP4 bytes/output path/input image resolution/config, verifying video schema/default-model reload, and adding a schema-backed video provider query. | AC-014, AC-015, AC-016, AC-012A | Repository-resident durable coverage change after code review; must return through code review. |
| COV-003 | `autobyteus-server-ts/tests/unit/api/graphql/types/llm-provider.test.ts` | Retain/add `listVideoModels`/`reloadVideoModels` mocks and assertions for video query/global reload. | AC-016 | Repository-resident durable coverage change after code review. |
| COV-004 | `autobyteus-server-ts/tests/unit/agent-customization/processors/tool-invocation/media-input-path-normalization-preprocessor.test.ts` | Retain/add `generate_video` normalization case. | UC-004 | Repository-resident durable coverage change after code review. |
| COV-005 | `autobyteus-server-ts/tests/unit/agent-execution/events/file-change-event-processor.test.ts` | Retain/add video cases to generated-output table, including MCP projection tool name. | AC-020 | Repository-resident durable coverage change after code review. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No removal planned. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Copy ignored `.env.test` from the main repo package(s) into the worktree package(s) without reading/printing secrets; run a temporary provider-gated Gemini video probe if a Gemini/Vertex credential is present. | Real `GeminiVideoClient` text-to-video can invoke Gemini Omni Flash and produce a video reference, or provider-access failures are classified as skipped. | Live Gemini Omni Flash is slow/cost/quota/region/preview gated and should not be a default durable test. |
| TEMP-002 | Run focused package builds/tests after durable coverage reconciliation. | Implementation plus durable coverage remains executable in local environment. | These commands are evidence, not new repository artifacts. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| `edit_video`, uploaded/source-video editing, `task=edit`, `previous_interaction_id`, stateful/multi-turn editing | Explicitly deferred by user re-approval after CR-002. | Users do not receive full Omni editing in this ticket; docs/handoff must not imply otherwise. | Future edit-video/source-video design task. |
| Audio-reference upload and voice editing | Official docs/solution notes mark as unsupported for current Gemini Omni flow. | None for approved scope. | Do not implement/test unless provider docs change and requirements are updated. |
| Full web browser E2E rendering of `.mp4` artifact viewer | Existing viewer path is unchanged; file-change coverage validates generated video artifact type. | Low; video viewer itself is not changed. | No escalation. |
| Live image/reference-to-video if provider credential fails before usable live execution | Provider access/credential mode can block live tests. | Unit and local-registry E2E prove request/input handling; live image/reference behavior may remain unproven if provider rejects credentials/access. | Record provider-access skip in execution report. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before execution. | N/A | Round 4 code review passed after CR-002; current creation-only scope is explicit. | N/A |

## Execution Plan

1. Reconcile the interrupted API/E2E durable coverage edits with the current CR-002 creation-only task scope.
2. Run focused server API/E2E/unit tests covering local registry video execution, video task schema, GraphQL video catalog, generated-output video classification, and input-image path normalization.
3. Run focused `autobyteus-ts` media/model/video tests for provider task validation, URI handling, image catalog cleanup, runtime mapping, and response DTOs.
4. Run focused web settings/store tests for video catalog/default model visibility.
5. Run package builds/guards and `git diff --check` as executable confidence checks.
6. Copy ignored `.env.test` files from the main repo to worktree package locations if present, without reading/printing secrets; run a temporary provider-gated Gemini video probe if credentials are available. Remove temporary probe files afterward.
7. Write the canonical execution coverage report. Because repository-resident durable coverage is added/updated during API/E2E, hand the cumulative package back to `code_reviewer` for coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The prior investigation has been superseded by this round-4/CR-002-aware investigation. Durable coverage changes are test-only and boundary-local; they require follow-up code review before delivery.
