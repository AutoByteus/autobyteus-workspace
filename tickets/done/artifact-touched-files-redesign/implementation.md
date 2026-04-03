# Implementation

Use this single artifact for both:
- the stable Stage 6 implementation baseline
- the live Stage 6 execution/progress record
- brief downstream handoff/status pointers for Stages 7, 8, and 9

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - The change spans frontend streaming handlers, projection store, panel/viewer UI, unused web GraphQL query removal, backend tool-result processor refactor, and backend persistence/query subsystem removal.
  - A separate proposed design and reviewed future-state runtime call stacks already exist and were required before implementation.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (`Go Confirmed`) -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/artifact-touched-files-redesign/workflow-state.md`
- Investigation notes: `tickets/done/artifact-touched-files-redesign/investigation-notes.md`
- Requirements: `tickets/done/artifact-touched-files-redesign/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/artifact-touched-files-redesign/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/artifact-touched-files-redesign/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `tickets/done/artifact-touched-files-redesign/proposed-design.md`

## Document Status

- Current Status: `Completed`
- Notes:
  - Stage 5 redesign review reached `Go Confirmed` on `v3` design/runtime artifacts.
  - The Stage 6 architecture-quality refactor is now complete.
  - Product behavior stayed unchanged in this iteration; the work tightened the caller-facing store boundary so the public API now maps directly to the runtime spine subjects.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - `UC-001` `write_file` appears immediately, streams, and becomes available.
  - `UC-002` `edit_file` appears immediately and refreshes to full content.
  - `UC-003` generated outputs become visible touched entries.
  - `UC-004` clicked text/code rows resolve full current file content.
  - `UC-005` failed/denied touched-file operations remain visible.
  - `UC-006` live artifact UX runs without GraphQL/persisted-artifact dependency.
- Spine Inventory In Scope:
  - `DS-001` segment-start touched-entry projection.
  - `DS-002` runtime artifact-event reconciliation.
  - `DS-003` lifecycle success/failure reconciliation.
  - `DS-004` content-resolution bounded local spine.
  - `DS-005` discoverability announcement bounded local spine.
- Primary Owners / Main Domain Subjects:
  - `agentArtifactsStore.ts` as the canonical touched-entry projection owner.
  - `segmentHandler.ts`, `artifactHandler.ts`, and `toolLifecycleHandler.ts` as ingress/reconciliation owners.
  - `ArtifactsTab.vue`, `ArtifactContentViewer.vue`, and `RightSideTabs.vue` as presentation/discoverability owners.
  - backend `agent-artifact-event-processor.ts` as tool-result -> runtime event projection owner.
- Requirement Coverage Guarantee:
  - Every requirement `R-001` through `R-012` maps to at least one reviewed use case and at least one planned Stage 6 task below.
- Design-Risk Use Cases:
  - `UC-006`: prove live projection no longer depends on GraphQL/persisted-artifact reads.
- Target Architecture Shape:
  - One live touched-entry row per `runId:path`.
  - `write_file` and `edit_file` rows are created early from segments.
  - Generated outputs remain event-driven from backend runtime events.
  - Viewer fetches workspace file content for non-streaming text/code rows.
  - Backend metadata persistence/query subsystem is removed.
- New Owners/Boundary Interfaces To Introduce:
  - Explicit store actions for touched-entry domain subjects:
    - segment-start touch
    - artifact-update refresh
    - artifact-persisted availability
    - lifecycle fallback terminal projection
  - Renamed backend processor `agent-artifact-event-processor.ts`.
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta:
  - Artifacts panel semantics change from persistence-backed artifact register to live touched-files projection.
  - Frontend no longer contains a live GraphQL fetch path for artifacts.
  - Backend no longer persists artifact metadata or exposes `agentArtifacts(runId)`.
- Key Assumptions:
  - Current active-run UX does not need persisted artifact restore.
  - Runtime artifact wire-event names can remain unchanged for this ticket.
- Known Risks:
  - `segmentHandler.ts` is already at 499 effective non-empty lines; implementation must avoid pushing it past Stage 8 guardrails.
  - `toolLifecycleHandler.ts` is already at 452 effective non-empty lines; touched-entry lifecycle hooks must remain compact or be extracted safely.

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | `N/A` | `Stage 5 round 2 with the same artifact set unless a new blocker is discovered` | `Candidate Go` | `1` |
| 2 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | `2` |
| 3 | Pass | No | No | N/A | `N/A` | `Stage 5 round 4 with the same v2 artifact set unless a new blocker is discovered` | `Candidate Go` | `1` |
| 4 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | `2` |
| 5 | Pass | No | No | N/A | `N/A` | `Stage 5 round 6 with the same v3 artifact set unless a new blocker is discovered` | `Candidate Go` | `1` |
| 6 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | `2` |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `6`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement projection owner changes before dependent handlers/components.
- Test-driven: update store/handler/component/backend tests alongside implementation.
- Spine-led implementation rule: sequence work by touched-entry projection spine and event ownership first.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- Mandatory cleanup rule: remove obsolete artifact persistence/query code in scope before Stage 6 closes.
- Mandatory ownership/decoupling/SoC rule: keep one projection owner and avoid duplicating touched-entry logic across handlers/components.
- Mandatory shared-structure coherence rule: keep one tight touched-entry row model; do not create parallel partial representations.
- Mandatory file-placement rule: keep touched-entry UI logic in frontend streaming/store/UI owners, and backend event emission in tool-result processor boundary; remove obsolete backend persistence folder instead of hiding it.
- Mandatory proactive size-pressure rule:
  - `segmentHandler.ts` and `toolLifecycleHandler.ts` are already size-pressure hotspots.
  - New touched-entry logic must be centralized in store actions and small handler hooks rather than broad inline branching.
- Choose the proper structural change for architecture integrity; do not preserve DB-backed artifacts just because that path already exists.
- One file at a time is the default; frontend and backend cleanup can proceed in sequence because both are understandable but interrelated.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001, DS-002, DS-003, DS-005 | `agentArtifactsStore.ts` | Define touched-entry state model, deterministic row identity, lifecycle actions, and latest-visible signal | N/A | All handlers and UI depend on the canonical store API. |
| 2 | DS-001 | `segmentHandler.ts` | Create early rows for `write_file` and `edit_file`; keep write streaming only | T-001 | Segment ingress should target the finalized store API. |
| 3 | DS-002, DS-003 | `artifactHandler.ts`, `toolLifecycleHandler.ts` | Reconcile runtime update/availability/failure events into the new store actions | T-001 | Runtime events and lifecycle closures depend on stable store semantics. |
| 4 | DS-005 | `ArtifactsTab.vue`, `RightSideTabs.vue`, `ArtifactList.vue`, `ArtifactItem.vue` | Apply discoverability/status/grouping behavior around the new store model | T-001, T-002, T-003 | UI should react only after projection semantics are in place. |
| 5 | DS-004 | `ArtifactContentViewer.vue` | Resolve full file content for touched entries with buffered-write fallback | T-001, T-003 | Viewer needs the stabilized status/source model. |
| 6 | DS-001, DS-002, DS-005 | web query removal | Remove GraphQL artifact fetch path and generated web query artifacts | T-001, T-004, T-005 | Web query removal should happen only after the live path is complete. |
| 7 | DS-002 | backend tool-result processor | Rename processor and remove persistence dependency while keeping live runtime event emission | N/A | Backend event path is independent from frontend cleanup but must be done before deleting backend persistence code. |
| 8 | DS-002 | backend GraphQL/persistence cleanup | Remove `src/agent-artifacts/**`, `agent-artifact.ts`, and schema wiring | T-007 | Delete obsolete backend surfaces only after live event emitter exists. |
| 9 | DS-001..DS-005 | frontend/backend tests | Update/add focused unit/component/backend tests and delete obsolete persistence-only tests | T-001..T-008 | Verification closes the whole implementation spine. |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| touched-entry projection store | `autobyteus-web/stores/agentArtifactsStore.ts` | same | frontend touched-entry projection | Keep | confirm all touched-entry creation/status matching lives here |
| segment-native touch creation | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | same | frontend segment ingress | Keep | confirm `edit_file` row creation happens here and logic remains compact |
| runtime event reconciliation | `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts` | same | frontend artifact-event ingress | Keep | confirm generated outputs and update events use the new store actions |
| lifecycle reconciliation | `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | same | frontend lifecycle ingress | Keep | confirm failed/denied/success flows route through store actions |
| artifact panel discoverability shell | `autobyteus-web/components/layout/RightSideTabs.vue` | same | shell tab switching | Keep | confirm watcher uses latest-visible signal, not active stream only |
| content-resolution viewer | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | same | selected-row content rendering | Keep | confirm non-streaming text/code rows fetch current workspace content |
| backend processor rename | `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.ts` | `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts` | backend tool-result event projection | Move | confirm no `ArtifactService` dependency remains |
| backend persistence subsystem | `autobyteus-server-ts/src/agent-artifacts/**` | removed | obsolete artifact metadata persistence | Remove | confirm no imports remain and tests are removed/updated |
| backend artifact GraphQL resolver | `autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts` | removed | obsolete query surface | Remove | confirm schema no longer imports/registers it |
| web artifact GraphQL query | `autobyteus-web/graphql/queries/agentArtifactQueries.ts` | removed | obsolete live query path | Remove | confirm store has no Apollo dependency and generated query artifacts are removed |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | DS-001, DS-002, DS-003, DS-005 | `agentArtifactsStore.ts` | Canonical touched-entry model, deterministic identity, status actions, latest-visible signal, removal of fetch path | `autobyteus-web/stores/agentArtifactsStore.ts` | same | Modify | N/A | Completed | `autobyteus-web/stores/__tests__/agentArtifactsStore.spec.ts` | Passed | N/A | N/A | Passed | Completed with alias-tolerant invocation matching, announcement versioning, and no Apollo/GraphQL fetch path; diff pressure assessed at `287/176` on a `305` effective-line file |
| T-002 | DS-001 | `segmentHandler.ts` | Immediate `edit_file` row creation and write-stream lifecycle hookup | `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | same | Modify | T-001 | Completed | `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | Passed | N/A | N/A | Passed | Completed with immediate touched-entry creation for both `write_file` and `edit_file`, write-stream buffering preserved, and file size pulled back under the hard limit at `485` effective non-empty lines |
| T-003 | DS-002, DS-003 | `artifactHandler.ts`, `toolLifecycleHandler.ts` | Update/availability/failure reconciliation into store actions | `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`, `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | same | Modify | T-001 | Completed | `autobyteus-web/services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts`, `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` | Passed | N/A | N/A | Passed | Completed with event-driven availability reconciliation, lifecycle-driven failure visibility, and compact hooks that keep `toolLifecycleHandler.ts` at `485` effective non-empty lines |
| T-004 | DS-005 | `ArtifactsTab.vue`, `RightSideTabs.vue`, list/item components | Discoverability, auto/manual selection, grouped latest-first browsing, status icon semantics | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`, `autobyteus-web/components/layout/RightSideTabs.vue`, `autobyteus-web/components/workspace/agent/ArtifactList.vue`, `autobyteus-web/components/workspace/agent/ArtifactItem.vue` | same | Modify | T-001, T-002, T-003 | Completed | `autobyteus-web/components/workspace/agent/__tests__/ArtifactsTab.spec.ts`, `autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts`, `autobyteus-web/components/workspace/agent/__tests__/ArtifactList.spec.ts` | Passed | N/A | N/A | Passed | Completed with latest-visible signal driven auto-selection/tab switching, latest-first browsing, and status semantics aligned to `streaming/pending/available/failed` |
| T-005 | DS-004 | `ArtifactContentViewer.vue` | Full current file-content resolution with buffered-write fallback and deleted-file handling | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | same | Modify | T-001, T-003 | Completed | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | Passed | N/A | N/A | Passed | Completed with workspace-backed fetch for non-buffered touched files and buffered write-file fallback until `available` |
| T-006 | DS-001, DS-002, DS-005 | web GraphQL cleanup | Remove live artifact query and regenerate web GraphQL artifacts | `autobyteus-web/graphql/queries/agentArtifactQueries.ts`, `autobyteus-web/generated/graphql.ts` | removed / regenerated | Remove/Modify | T-001, T-004, T-005 | Completed | N/A | N/A | N/A | N/A | Passed | Completed: deleted the web artifact query document and removed generated `GetAgentArtifacts*` artifacts; verification by source search confirms no live web references remain outside legacy docs/tickets |
| T-007 | DS-002 | backend tool-result event projection | Rename processor and emit live events without `ArtifactService` | `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-persistence-processor.ts`, `autobyteus-server-ts/src/startup/agent-customization-loader.ts` | `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts`, loader same | Move/Modify | N/A | Completed | `autobyteus-server-ts/tests/unit/agent-customization/processors/tool-result/agent-artifact-event-processor.test.ts`, `autobyteus-server-ts/tests/unit/startup/agent-customization-loader.test.ts` | Passed | N/A | N/A | Passed | Completed with event-only emission semantics and loader registration updated to `AgentArtifactEventProcessor` |
| T-008 | DS-002 | backend cleanup | Remove artifact persistence domain and artifact GraphQL resolver/schema wiring | `autobyteus-server-ts/src/agent-artifacts/**`, `autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts`, `autobyteus-server-ts/src/api/graphql/schema.ts` | removed / modified | Remove/Modify | T-007 | Completed | N/A | N/A | N/A | N/A | Passed | Completed: deleted the backend artifact persistence domain, removed the artifact GraphQL resolver/schema registration, and removed persistence-only e2e/integration suites |
| T-009 | DS-001, DS-002, DS-003, DS-004, DS-005 | frontend verification | Update/add store/handler/component tests for live touched-entry behavior | existing frontend spec files listed above | same | Modify | T-001..T-006 | Completed | existing frontend spec files | Passed | N/A | N/A | Passed | Completed with one focused frontend regression run covering store, handlers, list/tab discoverability, and viewer behavior (`55` tests passed) |
| T-010 | DS-002 | backend verification | Update processor/loader tests and remove persistence-only tests | existing backend spec files under `autobyteus-server-ts/tests/**` | same / removed | Modify/Remove | T-007, T-008 | Completed | `autobyteus-server-ts/tests/unit/agent-customization/processors/tool-result/agent-artifact-event-processor.test.ts`, `autobyteus-server-ts/tests/unit/startup/agent-customization-loader.test.ts` | Passed | N/A | N/A | Passed | Completed with targeted backend unit coverage (`10` tests passed) and persistence-only suites removed; `pnpm typecheck` remains blocked by a pre-existing `TS6059` rootDir/test-include configuration issue unrelated to this ticket |
| T-011 | DS-002, DS-005 | `agentArtifactsStore.ts`, `artifactHandler.ts`, `ArtifactsTab.vue`, `RightSideTabs.vue` | Enforce first-visibility-only discoverability so refresh-only artifact updates cannot retrigger focus/selection | `autobyteus-web/stores/agentArtifactsStore.ts`, `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`, `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`, `autobyteus-web/components/layout/RightSideTabs.vue` | same | Modify | T-001, T-003, T-004 | Completed | `autobyteus-web/stores/__tests__/agentArtifactsStore.spec.ts`, `autobyteus-web/services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts` | Passed | N/A | N/A | Pending | Completed by making artifact-event upserts preserve existing discoverability state unless explicit create/retouch semantics apply; `ARTIFACT_UPDATED` now refreshes metadata/status without bumping the latest-visible signal, and the focused frontend rerun stayed green (`52` tests passed across the touched-files acceptance sweep). |
| T-012 | DS-002 | `agent-artifact-event-processor.ts` | Gate backend artifact-event emission on successful tool results only | `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts` | same | Modify | T-007 | Completed | `autobyteus-server-ts/tests/unit/agent-customization/processors/tool-result/agent-artifact-event-processor.test.ts` | Passed | N/A | N/A | Pending | Completed by short-circuiting denied/failed `ToolResultEvent`s before any artifact projection. Added negative backend coverage for failed generated-output tools and denied file-touch tools; targeted backend rerun passed (`12` tests across processor + loader). |
| T-013 | DS-002, DS-005 | frontend/backend verification | Add regression coverage and refresh Stage 7 evidence for the discoverability and success-gating invariants | existing frontend/backend spec files, `tickets/done/artifact-touched-files-redesign/api-e2e-testing.md` | same | Modify | T-011, T-012 | Completed | existing regression spec files + new negative cases as needed | Passed | N/A | N/A | Pending | Completed with new regression assertions for refresh-only artifact updates, persisted existing-row non-reannouncement, update-before-segment pending semantics, and backend denied/failed negative cases. Validation commands rerun clean and the active-code removal scans remain green. |
| T-014 | DS-002, DS-003, DS-005 | `agentArtifactsStore.ts` | Replace the generic public artifact-event upsert boundary with explicit domain operations for refresh, persisted availability, and lifecycle fallback terminal state | `autobyteus-web/stores/agentArtifactsStore.ts` | same | Modify | T-001, T-011, T-013 | Completed | `autobyteus-web/stores/__tests__/agentArtifactsStore.spec.ts` | Passed | N/A | N/A | Pending | Completed by splitting the caller-facing API into `refreshTouchedEntryFromArtifactUpdate`, `markTouchedEntryAvailableFromArtifactPersisted`, and `ensureTouchedEntryTerminalStateFromLifecycle`, while moving the generic merge/upsert logic into private file-local helpers. |
| T-015 | DS-002, DS-003 | `artifactHandler.ts`, `toolLifecycleHandler.ts` | Align handler-to-store calls with the explicit store boundary (`refresh`, `persisted availability`, `lifecycle fallback`) | `autobyteus-web/services/agentStreaming/handlers/artifactHandler.ts`, `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | same | Modify | T-014 | Completed | `autobyteus-web/services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts`, `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` | Passed | N/A | N/A | Pending | Completed by routing runtime artifact events and lifecycle fallback through subject-specific store methods only; handlers no longer depend on the generic event-shaped store mutator. |
| T-016 | DS-002, DS-003, DS-005 | frontend validation | Refresh regression coverage and Stage 7 evidence for the explicit store-boundary shape | existing frontend spec files, `tickets/done/artifact-touched-files-redesign/api-e2e-testing.md` | same | Modify | T-014, T-015 | Completed | existing regression spec files + boundary-shape expectations as needed | Passed | N/A | N/A | Pending | Completed with a focused frontend rerun (`29` tests passed) plus new lifecycle-fallback coverage proving the boundary split preserved behavior and clarified the spine owners. |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001`, `R-011`, `R-012` | `AC-001`, `AC-011`, `AC-012` | `DS-001`, `DS-002`, `DS-005` | `Summary`, `Data-Flow Spine Inventory`, `Concrete Target Behavior Notes` | `UC-001`, `UC-002`, `UC-003`, `UC-006` | `T-001`, `T-002`, `T-004`, `T-006` | Unit | `AV-001`, `AV-002`, `AV-003`, `AV-006` |
| `R-002`, `R-006` | `AC-002`, `AC-006` | `DS-001`, `DS-003`, `DS-004` | `Concrete Target Behavior Notes` | `UC-001` | `T-001`, `T-002`, `T-003`, `T-005` | Unit | `AV-001` |
| `R-003`, `R-007` | `AC-003`, `AC-007` | `DS-001`, `DS-002`, `DS-004` | `Summary`, `Concrete Target Behavior Notes` | `UC-002`, `UC-004` | `T-001`, `T-002`, `T-003`, `T-005` | Unit | `AV-002`, `AV-004` |
| `R-004` | `AC-004` | `DS-002`, `DS-005` | `Summary`, `Change Inventory` | `UC-003` | `T-001`, `T-003`, `T-004`, `T-007` | Unit | `AV-003` |
| `R-005` | `AC-005` | `DS-004` | `Concrete Target Behavior Notes` | `UC-002`, `UC-004` | `T-005` | Unit | `AV-002`, `AV-004` |
| `R-008` | `AC-008` | `DS-003`, `DS-004` | `Concrete Target Behavior Notes` | `UC-005` | `T-001`, `T-003`, `T-005` | Unit | `AV-005` |
| `R-009`, `R-010` | `AC-009`, `AC-010` | `DS-002`, `DS-005` | `Legacy Removal Policy`, `Removal / Decommission Plan`, `Wire-Event Naming Decision` | `UC-006` | `T-006`, `T-007`, `T-008`, `T-010` | Unit | `AV-006` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001`, `AC-011`, `AC-012` | `R-001`, `R-011`, `R-012` | `DS-001`, `DS-002`, `DS-005` | Artifacts panel behaves as one touched-files projection with discoverability parity and grouped browsing | `AV-001`, `AV-002`, `AV-003`, `AV-006` | `E2E` | Planned |
| `AC-002`, `AC-006` | `R-002`, `R-006` | `DS-001`, `DS-003`, `DS-004` | `write_file` row appears immediately, streams, and becomes available | `AV-001` | `E2E` | Planned |
| `AC-003`, `AC-007` | `R-003`, `R-007` | `DS-001`, `DS-002`, `DS-004` | `edit_file` row appears immediately and viewer shows full file content without diff-only rendering | `AV-002` | `E2E` | Planned |
| `AC-004` | `R-004` | `DS-002`, `DS-005` | Generated output path/url appears as touched row and previews | `AV-003` | `E2E` | Planned |
| `AC-005` | `R-005` | `DS-004` | Clicking a touched text/code row resolves current full file content | `AV-004` | `E2E` | Planned |
| `AC-008` | `R-008` | `DS-003`, `DS-004` | Failed or denied touched-file row remains visible and inspectable | `AV-005` | `E2E` | Planned |
| `AC-009`, `AC-010` | `R-009`, `R-010` | `DS-002`, `DS-005` | Live flow works without `agentArtifacts(runId)` query or backend artifact persistence subsystem | `AV-006` | `API` | Planned |

### Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| `C-001`, `C-002`, `C-003`, `C-004` | `T-001`, `T-002`, `T-003` | No | Unit |
| `C-005`, `C-006`, `C-007`, `C-008`, `C-009` | `T-004`, `T-005` | No | Unit |
| `C-010`, `C-011` | `T-006` | Yes | Unit + `AV-006` |
| `C-012`, `C-013` | `T-007` | Yes | Unit |
| `C-014`, `C-015`, `C-016` | `T-008` | Yes | Unit + `AV-006` |
| `C-017`, `C-018` | `T-009`, `T-010` | Mixed | Unit / Stage 9 docs sync |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | `autobyteus-web/graphql/queries/agentArtifactQueries.ts` + generated query artifacts | Remove | delete query, remove store import/usage, regenerate GraphQL output | ensure no hidden caller remains |
| `T-DEL-002` | `autobyteus-server-ts/src/agent-artifacts/**` | Remove | delete domain/service/provider/repository files and persistence-only tests | ensure backend no longer imports `ArtifactService` |
| `T-DEL-003` | backend processor file | Rename/Move | replace imports/registration/tests with `agent-artifact-event-processor.ts` | loader and test references must be updated together |
| `T-DEL-004` | `autobyteus-server-ts/src/api/graphql/types/agent-artifact.ts` | Remove | remove resolver file and schema registration | verify no schema build import remains |

### Step-By-Step Plan

1. Refactor `agentArtifactsStore.ts` into the canonical touched-entry model and remove the fetch/query path.
2. Update `segmentHandler.ts` so both `write_file` and `edit_file` create early rows while keeping write streaming behavior.
3. Update `artifactHandler.ts` and `toolLifecycleHandler.ts` to reconcile runtime updates, availability, and failure into the store.
4. Update `ArtifactsTab.vue`, `RightSideTabs.vue`, `ArtifactList.vue`, and `ArtifactItem.vue` for latest-visible discoverability and list semantics.
5. Update `ArtifactContentViewer.vue` for full workspace-backed file viewing with buffered-write fallback.
6. Remove the web artifact GraphQL query path and regenerate web GraphQL artifacts.
7. Rename the backend processor to event-only behavior and update loader wiring/tests.
8. Remove backend `agent-artifacts` persistence/query code and schema registration.
9. Run/update frontend and backend unit tests; keep Stage 7 scenario planning current.

### Local Fix Re-Entry Addendum (`2026-04-02`)

- Triggering finding: `CR-002` from Stage 8 round 3.
- Classification: `Local Fix`.
- Scope of the fix:
  - restore monotonic activity-status protection so late `SEGMENT_END` updates cannot regress the activity sidecar from `awaiting-approval` / `approved` / `executing` / terminal states back to `parsed`,
  - keep the fix local to the activity-status ownership boundary without changing requirements, design basis, or runtime call-stack artifacts,
  - add regression coverage for out-of-order lifecycle-versus-segment-end delivery.
- Planned implementation shape:
  - centralize the activity-status transition guard in one reusable owner shared by lifecycle and activity consumers,
  - preserve `segmentHandler.ts` as the producer of parse completion while moving regression prevention into the status owner,
  - add one focused store/unit regression and one end-to-end handler-ordering regression before rerunning Stage 7.
- Required validation before leaving Stage 6:
  - targeted frontend regression suite covering `agentActivityStore`, `segmentHandler`, `toolLifecycleHandler`, and the new ordering scenario,
  - refresh Stage 7 executable validation evidence to show the out-of-order case is now protected.


### Design Impact Re-Entry Addendum (`2026-04-02`)

- Triggering findings: `CR-003` and `CR-004` from Stage 8 round 5.
- Classification: `Design Impact`.
- Upstream redesign closure now in force:
  - `proposed-design.md` is at `v2`.
  - `future-state-runtime-call-stack.md` is at `v2`.
  - Stage 5 redesign review reached `Go Confirmed` on round `4`.
- Scope of the implementation reopen:
  - enforce the DS-005 owner invariant that only first visibility or explicit segment re-touch can emit discoverability,
  - enforce the DS-002 owner invariant that availability-shaped artifact events are success-authorized only,
  - add regression coverage so both invariants are durable in Stage 7 and Stage 8 reruns.
- Planned implementation shape:
  - move discoverability emission decisions fully under `agentArtifactsStore.ts`, with `artifactHandler.ts`, `ArtifactsTab.vue`, and `RightSideTabs.vue` acting only as callers/observers,
  - gate `AgentArtifactEventProcessor.process(...)` on successful tool results before it emits `ARTIFACT_UPDATED` / `ARTIFACT_PERSISTED` for output availability,
  - refresh validation evidence specifically for refresh-only update behavior and failed generated-output behavior.
- Required validation before leaving Stage 6:
  - targeted frontend regression coverage for refresh-only update behavior,
  - targeted backend negative coverage for denied/failed output tools,
  - refreshed Stage 7 executable validation evidence for both invariants before returning to Stage 8.

### Architecture-Quality Re-Entry Addendum (`2026-04-02`)

- Triggering condition: latest Stage 8 pass scored `8.8 / 10`, but the user requested another architecture iteration to raise the bar further.
- Classification: `Design Impact`.
- Upstream redesign closure now in force:
  - `proposed-design.md` is at `v3`.
  - `future-state-runtime-call-stack.md` is at `v3`.
  - Stage 5 redesign review reached `Go Confirmed` on round `6`.
- Scope of the implementation reopen:
  - replace the generic public store artifact-event upsert boundary with explicit domain operations,
  - align `artifactHandler.ts` and `toolLifecycleHandler.ts` so they depend only on the store boundary that matches their domain subject,
  - keep runtime behavior unchanged while making the caller-facing API shape follow the spine more directly.
- Planned implementation shape:
  - keep any merge/upsert helper private inside `agentArtifactsStore.ts`,
  - add explicit store methods for:
    - artifact-update refresh,
    - artifact-persisted availability,
    - lifecycle fallback terminal state,
  - update handlers and tests to use those methods directly.
- Required validation before leaving Stage 6:
  - targeted frontend regression coverage proving handlers now depend on explicit store boundaries rather than the generic event-shaped API,
  - refreshed Stage 7 executable validation evidence for the explicit boundary shape before returning to Stage 8.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/artifact-touched-files-redesign/code-review.md`
- Scope (source + tests): frontend touched-entry projection, related UI components, backend event processor rename/removal cleanup, and targeted tests
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - if any changed source implementation file crosses `500`, split or extract owned structure during Stage 6 before Stage 8.
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - assess after each logical task and split/refactor early if a single source file diff grows past `220`.
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan):
  - record the file, current count, ownership risk, and chosen split/refactor action.
- file-placement review approach (how wrong-folder placements will be detected and corrected):
  - validate each changed file against the Stage 3 file placement plan and refuse helper growth in unrelated folders.

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | Ownership/SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts` | `485` | Yes | Medium | Keep; hard-limit pressure already resolved during T-002 and further edits should stay minimal | `Local Fix` / `Design Impact` if it grows again |
| `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | `485` | Yes | High | Keep lifecycle hooks narrow; avoid widening beyond current bounded helper footprint | `Design Impact` |
| `autobyteus-web/stores/agentArtifactsStore.ts` | `220` | Yes | Medium | Keep but monitor diff size and store-only responsibility | `Local Fix` / `Design Impact` if projection logic leaks outward |
| `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | `229` | Yes | Medium | Keep and avoid mixing row-creation logic into viewer | `Local Fix` |
| `autobyteus-server-ts/src/agent-customization/processors/tool-result/agent-artifact-event-processor.ts` | `124` (current predecessor file) | Yes | Low | Rename/modify in place under correct boundary | `Local Fix` |

### Test Strategy

- Unit tests:
  - Frontend: store, segment handler, artifact handler, tool lifecycle handler, artifacts tab, right-side tabs, viewer.
  - Backend: renamed event processor, loader registration, artifact-utils behavior as needed.
- Integration tests:
  - No dedicated new Stage 6 integration artifact is planned unless unit coverage reveals a boundary risk.
  - Removed backend persistence integration/e2e tests must be deleted or replaced only if a live event boundary genuinely needs integration verification.
- Stage 6 boundary: file and service-level verification only (unit + selective integration).
- Stage 7 handoff notes for API/E2E testing:
  - canonical artifact path: `tickets/done/artifact-touched-files-redesign/api-e2e-testing.md`
  - expected acceptance criteria count: `12`
  - critical flows to validate (API/E2E): `write_file`, `edit_file`, generated output, viewer refresh, failure visibility, no GraphQL dependency`
  - expected scenario count: `6`
  - known environment constraints: `websocket + workspace-backed file access required`
- Stage 8 handoff notes for code review:
  - canonical artifact path: `tickets/done/artifact-touched-files-redesign/code-review.md`
  - predicted design-impact hotspots: `segmentHandler.ts`, `toolLifecycleHandler.ts`, backend deletion completeness`
  - predicted file-placement hotspots: `do not create stray touched-file helpers outside store/streaming owners`
  - predicted interface/API/query/command/service-method boundary hotspots: `store action surface`, `backend processor rename`, `schema cleanup`
  - files likely to exceed size/ownership/SoC thresholds: `segmentHandler.ts`, `toolLifecycleHandler.ts`

### Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| `N/A` | `N/A` | `No unavoidable cross-reference exceptions identified in baseline` | `N/A` | `N/A` | `Not Needed` | `N/A` |

### Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| Handler size pressure remains under active monitoring | `segmentHandler.ts` reduced to `485` effective lines during `T-002`; `toolLifecycleHandler.ts` now at `485` effective lines after `T-003`; `UC-001`, `UC-002`, `UC-005` still depend on these files | `Ownership And Structure Checks`, `Derived Implementation Mapping` | Keep downstream UI/backend tasks out of these files unless strictly required; if either file grows materially, classify and extract before continuing | Monitoring |

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/done/artifact-touched-files-redesign/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/done/artifact-touched-files-redesign/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-03-30: Stage 6 baseline created from reviewed design/runtime artifacts.
- 2026-03-30: Implementation baseline finalized; code edit permission unlocked; `T-001` started.
- 2026-03-30: `T-001` completed. Store now owns the touched-entry projection with deterministic `runId:path` IDs, invocation-alias lifecycle transitions, latest-visible announcement versioning, and no frontend artifact GraphQL fetch dependency. Targeted validation passed: `pnpm test:nuxt --run stores/__tests__/agentArtifactsStore.spec.ts`.
- 2026-03-30: `T-002` and `T-003` completed. Segment ingress now creates touched rows for both `write_file` and `edit_file`; artifact events and tool lifecycle terminal states reconcile availability/failure through the store. Targeted validation passed: `pnpm test:nuxt --run services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts`.
- 2026-03-30: `T-004` and `T-005` completed. The artifacts panel now follows the latest-visible touched file, and the viewer resolves current workspace content for non-buffered entries while keeping pre-success `write_file` content buffered locally. Targeted validation passed: `pnpm test:nuxt --run components/workspace/agent/__tests__/ArtifactsTab.spec.ts components/layout/__tests__/RightSideTabs.spec.ts components/workspace/agent/__tests__/ArtifactList.spec.ts components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`.
- 2026-03-30: `T-006` through `T-010` completed. The dead web artifact query path was removed, the backend artifact persistence/query subsystem was deleted, the tool-result processor now emits live artifact events only, and focused frontend/backend regression suites passed. A follow-up note was recorded that `pnpm typecheck` in `autobyteus-server-ts` is currently blocked by a pre-existing `TS6059` rootDir/test-include configuration issue unrelated to this ticket.
- 2026-03-30: Stage 6 exit criteria satisfied. All planned implementation tasks are completed, focused frontend/backend verification is green, legacy artifact persistence/query paths are removed, and the ticket is ready for Stage 7 acceptance validation.
- 2026-03-30: Stage 7 passed on round 1. Focused frontend acceptance coverage, targeted backend validation, and active-code scans all confirmed the touched-files redesign and persistence/query removal are ready for Stage 8 code review.
- 2026-03-30: Stage 7 validation-gap re-entry closed. `ArtifactContentViewer.spec.ts` now directly validates buffered-write bypass, workspace fetch success, deleted-file handling, and non-404 fetch-error reporting; the refreshed frontend acceptance sweep passed (`56` tests) and Stage 8 review is active again.
- 2026-04-02: Stage 8 local-fix re-entry reopened for `CR-002`. Implementation focus is now the bounded activity-status ordering regression: late `SEGMENT_END` activity reconciliation must no longer regress stronger lifecycle states, and the rerun path is Stage 6 -> Stage 7 -> Stage 8.
- 2026-04-02: `CR-002` local fix implemented. Activity-status transitions are now guarded by a shared monotonic status policy, `agentActivityStore` rejects regressive `parsed` updates after stronger lifecycle states, and new store plus handler-ordering regressions were added. Refreshed frontend acceptance validation passed: `pnpm test:nuxt --run stores/__tests__/agentArtifactsStore.spec.ts stores/__tests__/agentActivityStore.spec.ts services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleState.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts components/layout/__tests__/RightSideTabs.spec.ts components/workspace/agent/__tests__/ArtifactList.spec.ts components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` (`11` files, `72` tests passed).
- 2026-04-02: `T-014` through `T-016` completed for the architecture-quality re-entry. `agentArtifactsStore.ts` now exposes explicit public boundaries for artifact refresh, persisted availability, and lifecycle fallback terminal state; the generic merge/upsert helper is file-local only; `artifactHandler.ts` and `toolLifecycleHandler.ts` now call subject-specific store methods; and the focused frontend validation rerun passed: `pnpm test:nuxt --run stores/__tests__/agentArtifactsStore.spec.ts services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts` (`4` files, `29` tests passed).
- 2026-04-02: Stage 6 exit criteria satisfied again for the v3 boundary refactor. The architecture-quality implementation work is complete, focused validation is green, and the ticket is ready for Stage 7 round 6.

### Scope Change Log

| Date | Previous Scope | New Scope | Trigger | Required Action |
| --- | --- | --- | --- | --- |
| `N/A` | `N/A` | `N/A` | `No scope change yet` | `N/A` |

### Implementation Work Updates

| Change ID | Last Failure Classification | Last Failure Investigation Required | Cross-Reference Smell | Design Follow-Up | Requirement Follow-Up | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `T-001` | `N/A` | `No` | `Store diff pressure assessed (`287` added / `176` removed)` | `Not Needed` | `Not Needed` | `2026-03-30` | `pnpm test:nuxt --run stores/__tests__/agentArtifactsStore.spec.ts` | Completed: touched-entry store refactored; repeated same-row announcements use versioning so identical path re-touches still notify downstream watchers |
| `T-002` | `N/A` | `No` | `segmentHandler.ts hard-limit pressure resolved` | `Not Needed` | `Not Needed` | `2026-03-30` | `pnpm test:nuxt --run services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts` | Completed: both `write_file` and `edit_file` now register touched entries on segment start; final effective size is `485` lines after cleanup |
| `T-003` | `N/A` | `No` | `toolLifecycleHandler.ts size pressure kept bounded` | `Not Needed` | `Not Needed` | `2026-03-30` | `pnpm test:nuxt --run services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` | Completed: artifact events now upsert available touched entries and denied/failed/succeeded file tools reconcile terminal store status without widening the handler beyond `485` effective lines |
| `T-004` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-03-30` | `pnpm test:nuxt --run components/workspace/agent/__tests__/ArtifactsTab.spec.ts components/layout/__tests__/RightSideTabs.spec.ts components/workspace/agent/__tests__/ArtifactList.spec.ts` | Completed: latest-visible signal now drives tab discoverability and row selection; list/item status semantics reflect the touched-entry model |
| `T-005` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-03-30` | `pnpm test:nuxt --run components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | Completed: viewer now fetches workspace-backed current content for non-buffered touched files and keeps pending/failed write-file content locally inspectable |
| `T-006` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-03-30` | `rg -n "GetAgentArtifacts|agentArtifacts\(|agentArtifactQueries" autobyteus-web -g '!**/node_modules/**' -g '!**/.nuxt/**'` | Completed: only legacy docs/tickets still mention the removed query path |
| `T-007` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-03-30` | `pnpm test --run tests/unit/agent-customization/processors/tool-result/agent-artifact-event-processor.test.ts tests/unit/startup/agent-customization-loader.test.ts` | Completed: backend event processor rename + loader registration validated by targeted unit tests |
| `T-008` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-03-30` | `rg -n "ArtifactService|agent-artifact|agentArtifacts\(|AgentArtifactPersistenceProcessor|agent-artifact-persistence-processor" autobyteus-server-ts/src autobyteus-server-ts/tests -g '!**/node_modules/**'` | Completed: source/tests no longer reference the removed artifact persistence/query subsystem |
| `T-009` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `2026-03-30` | `pnpm test:nuxt --run stores/__tests__/agentArtifactsStore.spec.ts services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts components/layout/__tests__/RightSideTabs.spec.ts components/workspace/agent/__tests__/ArtifactList.spec.ts components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | Completed: focused frontend regression sweep passed (`55` tests) |
| `T-010` | `N/A` | `No` | `Pre-existing server typecheck config issue recorded separately` | `Not Needed` | `Not Needed` | `2026-03-30` | `pnpm test --run tests/unit/agent-customization/processors/tool-result/agent-artifact-event-processor.test.ts tests/unit/startup/agent-customization-loader.test.ts` | Completed: targeted backend regression sweep passed (`10` tests); deleted persistence-only suites and recorded unrelated `TS6059` typecheck blocker |
| `T-014` | `N/A` | `No` | `Explicit public boundary split completed without widening the store model` | `Not Needed` | `Not Needed` | `2026-04-02` | `pnpm test:nuxt --run stores/__tests__/agentArtifactsStore.spec.ts` | Completed: the touched-entry store now exposes separate subject-owned actions for refresh, persisted availability, and lifecycle fallback while keeping the generic projection helper private to the file |
| `T-015` | `N/A` | `No` | `No handler/store boundary bypass remains` | `Not Needed` | `Not Needed` | `2026-04-02` | `pnpm test:nuxt --run services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts` | Completed: artifact and lifecycle handlers now call subject-specific store boundaries only, and lifecycle fallback remains explicit instead of reusing the artifact-event projection API |
| `T-016` | `N/A` | `No` | `Focused frontend-only validation refresh; backend/removal evidence carried forward unchanged` | `Not Needed` | `Not Needed` | `2026-04-02` | `pnpm test:nuxt --run stores/__tests__/agentArtifactsStore.spec.ts services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleHandler.spec.ts services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts` | Completed: rerun passed (`29` tests) and closes the architecture-quality Stage 6 evidence for the explicit public boundary shape |

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E | `tickets/done/artifact-touched-files-redesign/api-e2e-testing.md` | `Passed` | `2026-04-02` | Round 6 refreshed the frontend acceptance evidence for the explicit store-boundary split and carried forward the earlier backend/removal evidence because that code remained unchanged |
| 8 Code Review | `tickets/done/artifact-touched-files-redesign/code-review.md` | `Passed` | `2026-04-02` | Round 7 reran the shared-principles review and raised the architecture score to the desired bar after the explicit store-boundary split |
| 9 Docs Sync | `tickets/done/artifact-touched-files-redesign/docs-sync.md` | `Passed` | `2026-04-02` | Durable docs were refreshed again so the runtime call story now names the explicit store boundaries instead of the removed generic event-shaped API |
