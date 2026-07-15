# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/reference-file-content-400/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/reference-file-content-400/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/reference-file-content-400/design-spec.md`
- Design Rework Note: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/reference-file-content-400/design-rework-note.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/reference-file-content-400/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/reference-file-content-400/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/reference-file-content-400/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Code review Round 2 pass for the revised absolute-only implementation; stale pre-rework API/E2E artifacts explicitly ignored and regenerated from current worktree state.
- Prior Investigation Reviewed: Stale pre-rework `api-e2e-coverage-investigation.md` in the ticket folder was intentionally superseded, not treated as authoritative.
- Latest Authoritative Investigation: Round 2, this artifact.

## Current Requirement And Design Basis

The current approved behavior is a clean-cut absolute-only task-delegation reference-file contract. `delegate_task`, `submit_task_result`, and `review_task_result` must reject `reference_files` entries that are not absolute local filesystem path strings before task record, submission, or review persistence. The backend task reference content service remains identity-owned and absolute-only: clients fetch by `teamRunId + taskId + referenceId`; the service streams readable absolute stored paths and returns `INVALID_REFERENCE_PATH`/HTTP 400 for stored non-absolute paths. Existing historical relative task records are not migrated or supported. Tool schemas, manifest descriptions, and runtime instructions must say absolute local paths are required. The shared validator must preserve existing `send_message_to` behavior, including rejection of relative paths and absolute-looking values containing URL/protocol markers such as `/tmp/https://example.com/report.md`.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanism, workspace-root resolver, historical migration, or frontend fallback was introduced; duplicated message validators were replaced by a shared absolute-local validator while preserving wrappers.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Task-delegation `reference_files` are absolute-only for `delegate_task`, `submit_task_result`, and `review_task_result`. | Changed | `REQ-001`-`REQ-004`, `AC-001`-`AC-004`; design rework note revised decision; implementation handoff. | Existing unit coverage is valid; add integration coverage through managed task tool flows to prove rejection before persistence. |
| Absolute task reference paths still create task records and can be served by the task reference content route. | Preserved/Changed input invariant | `AC-002`, `REQ-005`; design API/data contract examples; implementation handoff downstream hints. | Existing unit coverage is valid but not enough at route/runtime boundary; add integration route check after an absolute-path `delegate_task`. |
| Existing relative task records remain invalid at readback; no workspace fallback or migration. | Preserved by clean-cut rejection | `REQ-006`, `AC-005`, `AC-008`; design rework note superseded direction. | Existing content-service unit coverage is valid; add route-level integration evidence for an old relative stored record. |
| Shared explicit absolute-local reference-file validator replaces duplicated agent/team communication validation. | Added/Changed | `REQ-009`; design shared validator spine; code review CR-001 resolution. | Existing shared-validator and message parser tests are valid; run them and message/team no-regression tests. |
| `send_message_to.reference_files` absolute-path behavior remains unchanged. | Preserved | `REQ-008`, `AC-006`; code review CR-001. | Existing unit/team communication tests are valid; run focused no-regression coverage. |
| Task tool schemas, manifest descriptions, and runtime instructions state absolute local paths. | Changed | `REQ-007`, `AC-007`; implementation handoff. | Existing runtime description and instruction-composer tests are valid; run them. |
| Workspace-relative task reference resolver/integration direction is removed. | Removed | Design rework note `Superseded Direction`; code review no-legacy verdict. | Confirm no stale workspace-relative files or coverage remain in repository; do not add workspace-relative compatibility coverage. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/services/reference-files/absolute-local-reference-files.test.ts` | Shared validator accepts/dedupes absolute local paths and rejects relative, null-byte, protocol/URL, route-template, and relative-segment paths including `/tmp/https://example.com/report.md`. | `REQ-001`, `REQ-002`, `REQ-009`, `AC-004`, `AC-006`; CR-001 resolution. | Still Valid | Direct shared-policy coverage for the current design. | Retain and run. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Service rejects relative delegate/submit/review `reference_files` before persistence and accepts absolute paths into records/updates. | `REQ-001`-`REQ-004`, `AC-001`-`AC-003`. | Still Valid | Covers domain persistence boundary with fake backend and records. | Retain and run. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-reference-content-service.test.ts` | Content service streams absolute stored references and keeps stored non-absolute task reference paths invalid. | `REQ-005`, `REQ-006`, `AC-002`, `AC-005`, `AC-008`. | Still Valid | Confirms readback stays absolute-only with no workspace fallback. | Retain and run. |
| `autobyteus-server-ts/tests/unit/api/task-delegation-route.test.ts` | Task REST content route streams content from content service and maps forbidden errors. | `REQ-005`. | Still Valid | Route transport coverage remains useful but does not prove real records or 400 for legacy relative records. | Retain and run; add integration route coverage. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Managed tool lifecycle exercises delegate/submit/review, task-agent/team routing, persistence, websocket projection, and settlement. | Task tool runtime boundary; `AC-001`-`AC-003` target surface. | Needs Update | It proves lifecycle but currently does not exercise `reference_files` validation or preview route integration in the managed runtime path. | Add focused integration scenarios for absolute success + preview route and invalid delegate/submit/review rejection. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/send-message-to-tool-argument-parser.test.ts` | `send_message_to.reference_files` accepts absolute local paths, rejects relative paths, and rejects `/tmp/https://example.com/report.md`. | `REQ-008`, `AC-006`; CR-001. | Still Valid | Direct parser no-regression coverage. | Retain and run. |
| `autobyteus-server-ts/tests/unit/agent-tools/team-communication/send-message-to.test.ts` | Team communication send-message tool still handles reference files through the expected tool surface. | `REQ-008`, `AC-006`. | Still Valid | Adjacent message behavior is in scope for no-regression. | Retain and run. |
| `autobyteus-server-ts/tests/unit/agent-execution/events/team-communication-message-event-processor.test.ts` | Team communication events/projected references remain correct after validator extraction. | `REQ-008`, `REQ-009`. | Still Valid | Covers message projection integration. | Retain and run. |
| `autobyteus-server-ts/tests/unit/services/team-communication/team-communication-service.test.ts` | Team communication persistence/projection reference behavior remains valid. | `REQ-008`, `REQ-009`. | Still Valid | Existing adjacent durable coverage. | Retain and run. |
| `autobyteus-server-ts/tests/integration/api/team-communication-api.integration.test.ts` | Message-owned REST content serves absolute references and returns 400 for relative stored message references. | `REQ-008`, `AC-006`. | Still Valid | Strong adjacent boundary no-regression check. | Retain and run. |
| `autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` | Tool manifest and parameter schemas expose absolute-local wording and no obsolete lifecycle fallback. | `REQ-007`, `AC-007`. | Still Valid | Direct tool text coverage. | Retain and run. |
| `autobyteus-server-ts/tests/unit/agent-team-execution/member-run-instruction-composer.test.ts` | Runtime instructions keep `send_message_to` absolute paths and now state task-delegation `reference_files` must be absolute local paths. | `REQ-007`, `REQ-008`, `AC-007`. | Still Valid | Direct runtime instruction coverage. | Retain and run. |
| `autobyteus-web/components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts` | Frontend constructs task-owned encoded content URL from `teamRunId + taskId + referenceId`. | `REQ-005`; route-owned access constraint. | Still Valid | Frontend route shape remains unchanged. | Retain and run targeted web spec after Nuxt prepare. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Stale ticket artifact `tickets/done/reference-file-content-400/api-e2e-coverage-investigation.md` from pre-rework attempt | Planned workspace-relative API integration and relative-content success validation. | User explicitly rejected backward compatibility; design rework superseded workspace-relative direction. | Design rework note `Superseded Direction`; requirements `REQ-006`, `AC-008`. | This fresh artifact replaces it; planned integration will validate absolute-only behavior. | N/A |
| Superseded repository paths `task-delegation-reference-path.ts`, `task-delegation-reference-workspace-resolver.ts`, and `tests/integration/api/task-delegation-reference-content-api.integration.test.ts` from pre-rework direction | Workspace-relative readback compatibility. | These paths are absent in the current repo state and must remain absent. | Design rework note and code review no-legacy verdict. | No replacement with relative compatibility coverage. | Absolute-only input/runtime/route coverage replaces the old direction. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-001 | Managed tool flow rejects `delegate_task` with `reference_files: ["math_problem_train_bird.txt"]` before persistence and before task-agent start. | `AC-001`, `REQ-001`, `REQ-002`; implementation handoff downstream hints. | Update `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts`. | Unit coverage exists, but API/E2E needs runtime/tool-boundary evidence. |
| API-002 | Managed tool flow accepts absolute reference path, persists normalized absolute `referenceFiles[].path`, and the task-owned REST content route fetches readable content by encoded `teamRunId + taskId + referenceId`. | `AC-002`, `REQ-005`; route-owned access constraint. | Update `task-delegation-tool-lifecycle.integration.test.ts` using Fastify route and real content service/records. | Proves the intended user scenario after replacing relative input with an absolute path, including route-safe `referenceId` encoding. |
| API-003 | Managed submit/review flows reject relative `reference_files` before submission/review persistence. | `AC-003`, `REQ-003`, `REQ-004`. | Update `task-delegation-tool-lifecycle.integration.test.ts`. | Unit coverage exists; integration confirms lifecycle-bound tool execution path. |
| API-004 | Stored legacy relative task record returns HTTP 400 / `INVALID_REFERENCE_PATH` through the task reference content route. | `AC-005`, `REQ-006`, `AC-008`. | Update `task-delegation-tool-lifecycle.integration.test.ts` or route integration in same file. | Prevents accidental reintroduction of workspace fallback. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-001..API-004 | `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Add focused absolute-only reference-file integration scenarios without changing existing lifecycle assertions. | Requirements and implementation handoff downstream coverage hints. | Repository-resident durable coverage will change after code review, so package must return to code reviewer. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No repository-resident stale coverage exists in the current worktree. | Design rework note says pre-rework workspace-relative files were removed. | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | `git diff --check`, `tsc -p tsconfig.build.json --noEmit`, and targeted Vitest suites. | Patch hygiene, source type validity, and current valid durable coverage pass. | Standard execution evidence only. |
| TEMP-002 | Targeted web component spec after `nuxt prepare`. | Frontend task reference URL shape remains identity-owned and encoded. | Existing web spec remains durable; Nuxt prepare output is temporary/ignored and removed. |
| TEMP-003 | Attempt full server `pnpm -C autobyteus-server-ts run typecheck`. | Confirms known project-level blocker remains TS6059 if still present. | Standard local check; no temp scaffolding retained. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Browser-click full desktop E2E against running UI/server. | The changed backend/tool behavior can be proven through managed tool integration, real Fastify route integration, and existing frontend URL component coverage. | Low; no frontend behavior changed besides using existing route shape. | None unless route encoding fails. |
| Historical relative task-record migration. | Explicitly out of scope and rejected. | Existing old records keep returning 400. | None for this task; user accepted no backward compatibility. |
| Full passing server `pnpm run typecheck`. | Known `TS6059` project config issue includes tests outside `rootDir`. | Low for changed source if build typecheck passes. | Record attempted result; no reroute unless a new changed-source error appears. |

## Ambiguities Or Reroute Triggers (Round 1 Historical)

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| API-002 absolute-reference preview route returns Fastify 404 when `referenceId` is path-derived from a realistic absolute path and exceeds the route parameter length. | Local Fix | Requirements `AC-002` and implementation handoff downstream hint require absolute reference paths to be previewable through the existing task-owned content route. The added managed integration coverage persists `referenceId="task-reference:0:/var/folders/.../math_problem_train_bird.txt"` and `path` as the same readable absolute file, then `GET /team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content` returns a router-level 404 before reaching the content service. Code review listed path-derived long reference IDs as a residual risk unless API/E2E exposed a route blocker; this execution did. | `implementation_engineer` |

## Post-Execution Investigation Update (Round 1 Historical)

The planned API-002 durable coverage exposed a real route blocker before final pass: path-derived `referenceId` values based on absolute paths can exceed Fastify's default route-parameter length and produce a router-level 404 even when the stored absolute file exists and the task record is present. This does not change the coverage validity decision: API-002 remains required by `AC-002`/`REQ-005`. It changes the downstream action from pass-through validation to a `Local Fix` reroute to `implementation_engineer`.

## Execution Plan

1. Update `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` with focused integration coverage for API-001 through API-004.
2. Run `git diff --check`, including untracked-file whitespace checks where needed, and source build typecheck.
3. Run focused server suites: shared validator, task-delegation service/content/route/runtime tests, updated task-delegation lifecycle integration, message/team communication no-regression tests, and team communication API integration.
4. Run focused web `TeamTaskReferenceViewer` spec after `nuxt prepare`, then remove generated Nuxt artifacts.
5. Attempt full server typecheck and record the known TS6059 blocker if unchanged.
6. Write the execution coverage report. Because repository-resident durable coverage will be updated after code review, return the cumulative package to `code_reviewer` for coverage-code re-review.

## Initial Round 1 Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing unit and adjacent coverage is valid but API/E2E should add managed-tool + route integration evidence for the revised absolute-only behavior.


## Round 2 Post-Code-Review Resumption Update

Code review Round 3 passed after the API-002 local fix. The implementation now treats `referenceId` as an opaque route identity: `buildTaskDelegationReferenceId()` emits `task-reference:<index>:<32-hex sha256 path hash>`, while `referenceFiles[].path` continues to persist the normalized absolute local filesystem path used by `TaskDelegationReferenceContentService` for content streaming.

Coverage validity changes since Round 1:

| Path / Scenario | Current Decision | Evidence | Action |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-reference-file.test.ts` | Still Valid / Added Coverage Already Reviewed | Verifies route-safe opaque task reference IDs and preservation of absolute `path` on task reference records. Code review Round 3 accepted this durable coverage. | Retain and run. |
| `autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` API-001..API-004 | Still Valid / Updated Coverage Already Reviewed | The integration test now expects a route-safe `referenceId`, confirms the absolute path remains persisted, fetches readable content through the task-owned route, rejects relative delegate/submit/review references before persistence, and keeps legacy relative records invalid. Code review Round 3 accepted this durable coverage. | Retain and run. |
| API-002 prior route blocker | Resolved for resumed execution | Round 3 code review found the local implementation fix acceptable and re-ran the focused reproducer successfully. | Re-run as part of API/E2E Round 2 execution and update the execution coverage report. |

No further repository-resident durable coverage additions, updates, or removals are planned before resumed execution. If resumed API/E2E changes durable coverage again, route back through `code_reviewer`; otherwise, on pass, proceed to `delivery_engineer` because the API/E2E coverage updates already received Round 3 code review.

## Latest Investigation Decision After Round 3 Code Review

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed In This Resumed Round: `No`
- Previously Added / Updated Durable Coverage Already Reviewed By Code Reviewer: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: The prior API-002 Local Fix has been addressed in implementation and accepted by code review. Resumed API/E2E should rerun the full planned executable matrix and refresh the canonical execution coverage report.
