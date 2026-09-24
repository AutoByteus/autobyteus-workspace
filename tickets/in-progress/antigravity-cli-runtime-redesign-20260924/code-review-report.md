# Code Review Report — AGY runtime implementation

## Review Round Meta

- Review Entry Point: Implementation Review; round 1; current result `CRR-001`.
- Requirements / investigation / solution history: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`; approved SR-016 baseline, SR-019 workspace correction, SR-021 DONE-to-success clarification.
- Design / review: `design-spec.md`, `investigation-result.md`, `design-review-report.md` ARCH-REV-003 Pass, `architecture-review-revision-record.md` ARCH-REV-001–003.
- Implementation: `implementation-handoff.md`, `implementation-revision-record.md` IR-001/002; reviewed commit `d0ec1fc07` against base `40b1783f4` on `codex/antigravity-cli-runtime-redesign-20260924`.
- Supplements: AGY CLI experiment, tool-event capture and command-outcome matrix; selected-workspace, MCP, toolset and skill probe reports; implementation local live JSON evidence. Probe artifacts are evidence, not product acceptance.
- Code review revision record: `code-review-revision-record.md` CRR-001. Prior review: none. API/E2E and delivery artifacts: N/A — not yet applicable.

## Routing Classification Review

- Task size: **Large**; architectural risk: **High**; independent implementation source review required and selected. This remains warranted by provider process/identity, scoped collaboration, trace, persistence and frontend launch changes.

## Review Scope

Reviewed the complete AGY production path and relevant changed server, shared-contract and web sources at `d0ec1fc07`, rather than only the IR-002 diff. Read relevant focused tests and supplied validation evidence. Excluded downstream API/E2E acceptance, provider versions other than probed 1.2.10, and old unmerged worktree alternatives.

## Upstream Behavior And Production-Path Basis Confirmation

Approved behavior is clear. The SR-021 tool convention is intentionally provider-step success, not shell exit success. ARCH-REV-003 reviewed that changed basis. Behavior basis is **Contradicted in BEH-004** by the two org launch-policy paths below; remaining mapped behaviors are confirmed at source-review level, subject to API/E2E.

| Behavior ID | Status | Current production path and lifecycle evidence | Contradiction |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | CLI capability/model probe → catalog/availability → factory dispatch. | — |
| BEH-002 | Confirmed | Shared prompt composer → run capsule main-agent markdown before `init`; member context included. | — |
| BEH-003 | Confirmed | `init.conversation_id` → backend context/manager candidate → persisted external binding; restore compares exact ID before input. | — |
| BEH-004 | **Contradicted** | Web draft policy → org team/agent overrides → effective launch config → AGY permission flag. | New org Team AGY override does not default on; org Agent explicit-off edit is forced back on. |
| BEH-005 | Confirmed | Per-run capsule, selected real workspace `--add-dir`, manifest/agent hash and restore workspace check; model-directed target caveat retained. | — |
| BEH-006 | Confirmed | AGY stream converter → canonical event → trace sequencer/projection → web hydration/card; DONE without error is success, explicit ERROR/denial remains non-green. | Final fresh denial-label render remains downstream verification, not a demonstrated source contradiction. |
| SCN-005 | Confirmed | AGY-specific runtime branch and draft helper; unchanged non-AGY policy paths and focused regression evidence. | — |

## Supported Product Scenario And Reachability Gate

| Scenario ID | Behavior / contract | Kind, initiator and coherent goal | Supported entry and forward lifecycle | Outcome / consequence | Independent evidence | Validity / use |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001/002/003/004/006 | User starts a selected standalone AGY coding run. | Workspace launch → editable runtime/model/permission → run manager → capsule/process → canonical events. | Identity, binding, permissions and trace apply to that run. | Approved requirements SCN-001, design DS-001/003, existing launch UI. | Supported Normal Scenario / Use |
| SCN-002 | BEH-002/004; REQ-010 | User configures an AGY Team or Org scope/member for collaboration. | Team/Org launch editors → sparse scope override → effective member config → AGY factory/CLI. | Newly selected AGY scope defaults auto-execute on, but user may explicitly turn it off. | Approved SCN-002, REQ-007/010, AC-009, design BEH-004 and actual Team/Org editor actions. | Supported Normal Scenario / Use |
| SCN-003 | BEH-003/005 | User reopens own AGY run. | Stored run/provider ID and capsule → restore factory → exact CLI init check. | Original ID and run-start identity retained or non-restorable. | REQ-003–005, design DS-002. | Supported Normal Scenario / Use |
| SCN-004 | BEH-006/REQ-011 | User views a normal AGY command/tool step. | Chat input → AGY tool DONE or ERROR → converter/trace → live and reloaded cards. | DONE is green with source state/output and no fabricated exit; denial/error non-green. | SR-021 approval, command-outcome captures, design DS-003. | Supported Normal Scenario / Use |
| SCN-005 | REQ-006 | Existing-runtime user continues a Codex/Claude/AutoByteus run. | Normal runtime selection → existing factory and event paths. | No AGY policy leakage. | Requirements SCN-005 and existing runtime registration. | Supported Normal Scenario / Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation / mechanism | Scenario / contract | Independent trigger and forward path / consequence | Evidence | Disposition and proportionate response |
| --- | --- | --- | --- | --- | --- |
| CF-001 | Org Team AGY selection lacks default-on transition. | SCN-002, REQ-010/AC-009 | User selects AGY in editable Org Team scope → `TeamScopeConfigEditor.updateField` emits runtime-only override → `AgentOrgRunConfigPanel` calls `setTeamOverride` → canonicalized patch omits auto-execute → inherits root false → AGY process lacks broad permission flag and may deny normal tool work. | `TeamScopeConfigEditor.vue:329-339`, `AgentOrgRunConfigPanel.vue:18`, `agentOrgRunConfigStore.ts:127-131`, `agentOrgLaunchPatch.ts:45-59`, factory/process mapping. | **Promote**; apply shared new-runtime policy at this Org Team transition and cover the store/effective launch config. |
| CF-002 | Org Agent explicit-off cannot remain off after its AGY override already exists. | SCN-002, REQ-007/010 | User selects AGY for Org Agent, then deliberately toggles auto-execute off in same editable scope → `setAgentOverride` looks up the Team override at an Agent address, not the existing Agent override → helper sees no previous AGY runtime and rewrites false to true → effective config runs with `--dangerously-skip-permissions`. | `agentOrgRunConfigStore.ts:142-146`, `agentRunRuntimeDraftPolicy.ts:7-13`, `AgentOrgRunConfigPanel.vue:20`, Org member editor. | **Promote**; compare against existing Agent override and cover select-AGY-then-explicit-off flow. |

## Structural / Design Checks

| Mandatory check | Result | Evidence / action |
| --- | --- | --- |
| Task design health assessment | Pass | Bounded provider-leaf refactor implements reviewed posture. |
| Supplemental-artifact alignment | Pass | AGY 1.2.10 probe assumptions and SR-021 status convention match converter/capsule shape. |
| Data-flow spine inventory | Pass | DS-001–004 visible from launch/restore through event return. |
| Ownership boundary clarity | Pass | Manager owns admission; AGY factory/backend own provider lifecycle. |
| Off-spine concern clarity | Pass | Capsule owns assets, process owns I/O, converter owns events. |
| Existing capability reuse | Pass | Shared identity composer, MCP session authority, recorder/projection reused. |
| Reusable owned structures | Pass | Draft policy and AGY stream shapes are factored once; Org call sites need correction (CF-001/002). |
| Shared-structure/data-model tightness | Pass | Canonical events and external provider ID reused; no parallel AGY status type. |
| Repeated coordination ownership | Pass | One draft-policy helper; no duplicate status or trace policy. |
| Empty indirection | Pass | Factory, capsule, process and converter own distinct work. |
| Scope-appropriate SoC/file responsibility | Pass | AGY backend/capsule/stream files have focused roles. |
| Ownership-driven dependency direction | Pass | AGY leaf depends on existing domain boundaries; no forbidden cycle found. |
| Authoritative Boundary Rule | Pass | Callers use manager and MCP authority, not their internals in parallel. |
| File placement | Pass | Files sit under corresponding runtime, trace, catalog and draft owners. |
| Flat-vs-over-split layout | Pass | Small coherent provider files; no artificial fragmentation. |
| Interface/API/command boundary clarity | Pass | Run/provider identity and process arguments explicit; no ambiguous fallback. |
| Naming and responsibility alignment | Pass | AGY-specific owners and `provider_state` are explicit. |
| Unjustified duplication | Pass | No second provider archive or copied trace path. |
| Patch-on-patch complexity | Pass | IR-001 neutral branch removed rather than layered with success. |
| Dead/obsolete cleanup | Pass | Neutral event/DTO/trace/UI path absent; no old AGY PTY path. |
| Test scenarios/assertions | **Fail** | Org store tests omit new Team default and Agent explicit-off transitions (CF-001/002). Add focused assertions. |
| Test fixture/helper reuse | Pass | Existing focused AGY fixture matrix and Org store harness are reusable. |
| Stale/duplicate/compatibility-only tests | Pass | None found in reviewed changed scope. |
| API/E2E readiness | **Fail** | Correct CF-001/002 before downstream; then validate final denial label live/reloaded. |

## Source File Size And Structure Audit

Effective nonempty lines for changed implementation source only; tests, fixtures and generated files excluded. `>220` is the added-line delta check, not total file length. No changed source breaches the 500-line hard limit or 220-line added delta. Existing large owners have small localized edits.

| Source file | Effective lines | `>500` | `>220` delta | SoC | Placement | Preliminary classification | Action |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts` | 102 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-backend.ts` | 89 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/backend/agy-agent-run-context.ts` | 5 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/capsule/agy-configured-skill-materializer.ts` | 43 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/capsule/agy-mcp-config-materializer.ts` | 30 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/capsule/agy-run-capsule.ts` | 85 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts` | 132 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-message.ts` | 29 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-stream-process.ts` | 105 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-context.ts` | 25 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/providers/agent-provider-factory-builder.ts` | 202 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/runtime/general-process-run-supervisor.ts` | 369 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | 481 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-restore-context-factory.ts` | 45 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-memory/services/runtime-tool-trace-sequencer.ts` | 266 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-routes.ts` | 140 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-types.ts` | 132 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/application-platform/execution/application-execution-scope-kernel-builder.ts` | 326 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts` | 245 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/llm-management/services/antigravity-model-catalog.ts` | 26 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts` | 448 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/llm-management/services/runtime-model-capacity-service.ts` | 30 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | 233 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/runtime-management/antigravity-cli-capability.ts` | 31 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/runtime-management/runtime-availability-service.ts` | 131 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-server-ts/src/runtime-management/runtime-kind-enum.ts` | 27 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts` | 160 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/components/mobile/MobileLaunchRunOptionsCard.vue` | 43 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/components/mobile/MobileRunSetup.vue` | 164 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/components/progress/ToolActivityItem.vue` | 250 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/components/workspace/config/AgentRunConfigForm.vue` | 170 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/components/workspace/config/TeamScopeConfigEditor.vue` | 340 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | 158 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/localization/messages/en/workspace.ts` | 431 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | 430 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | 307 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | 311 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/stores/agentOrgRunConfigStore.ts` | 229 | Pass | Pass | Pass | Pass | Local Fix CF-001/002 | Correct Org policy |
| `autobyteus-web/stores/agentRunConfigStore.ts` | 186 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/stores/teamRunConfigStore.ts` | 429 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/types/agent/AgentRunConfig.ts` | 62 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/utils/agentRunRuntimeDraftPolicy.ts` | 12 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/utils/teamRunLaunchConfigEdit.ts` | 79 | Pass | Pass | Pass | Pass | None | None |

## Legacy / Backward-Compatibility Verdict

| Mandatory check | Result | Evidence |
| --- | --- | --- |
| No new backward-compatibility mechanism | Pass | No AGY version-specific runtime reader or fallback. |
| No retained old behavior | Pass | No PTY, first-user identity, last-conversation guessing or parallel raw provider archive. |
| Dead/obsolete cleanup | Pass | Canonical IR-001 neutral event/DTO/trace/UI branch removed. |
| Persisted-data transition | Pass | Directly usable existing metadata/trace; no released AGY population to migrate. |
| No dual read/write | Pass | Generic canonical trace path only. |
| Transition mechanics | Pass | No migration required; one local IR-001 neutral development trace was audited, not given a production compatibility branch. |

Dead/obsolete/legacy items requiring removal: **None identified**. Unrelated Codex `LOCAL_MCP_TOOL_EXECUTION_COMPLETED` is not the removed AGY neutral event.

## Docs-Impact Verdict

Yes: delivery documentation should describe AGY provider-step green semantics, exact restore, permission defaults and the model-directed workspace caveat after executable validation.

## Additional Material Premise Validation

ARCH-REV-003 MP-002 (nonzero/not-found tool DONE) and MP-003 (headless permission denial) remain confirmed by provider captures and the SR-021 conversion. ARCH-REV-002 DR-001 selected-workspace premise remains resolved at source level. No new edge/failure premise is needed for CF-001/002: both are ordinary editable Org launch actions on SCN-002.

## Review Scorecard

- Overall: **8.8/10; 88/100** (simple mean; category gaps govern decision).

| Priority | Category | Score | Why / weakness / improvement |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.0 | Launch, restore and event paths are traceable; no material spine gap found; maintain. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.0 | Existing manager/MCP/trace owners remain authoritative; no boundary bypass found; maintain. |
| 3 | API / Interface / Query / Command Clarity | 9.0 | Explicit AGY factory/context/process contracts and exact IDs; no material weakness found; maintain. |
| 4 | Separation of Concerns and File Placement | 9.0 | Provider leaf and capsule/stream split are coherent; no material placement gap; maintain. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.0 | Canonical events and shared policy helper avoid parallel shapes; helper must be called correctly in Org store (CF-001/002). |
| 6 | Naming Quality and Local Readability | 9.0 | AGY roles and ID semantics are explicit; no material naming gap; maintain. |
| 7 | API/E2E Readiness | **8.0** | CF-001/002 leave an approved Org permission flow wrong before downstream validation; fix and add focused coverage. |
| 8 | Runtime Correctness And Behavioral Fidelity | **8.0** | CF-001/002 contradict BEH-004/REQ-007/010; correct Team default and Agent explicit-off transition. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.0 | Neutral IR-001 path removed and no migration/fallback added; maintain. |
| 10 | Cleanup Completeness | 9.0 | No obsolete AGY production seam identified; maintain. |

## Findings

### CR-001 — Org Team AGY scope does not default auto-execute on

- Severity: Medium; candidate CF-001; affected SCN-002/BEH-004, REQ-010/AC-009.
- `autobyteus-web/stores/agentOrgRunConfigStore.ts:127-131` canonicalizes a new Team override without `withNewRuntimeOverridePolicy`, unlike the separate Team-run editor. A runtime-only AGY override inherits a false Org root permission value. The supported Org Team selection path therefore launches an AGY member with ordinary headless policy rather than the approved default-on behavior.
- Required bounded fix: use the shared policy on this transition, preserving deliberate later off edits, and test the Org Team store/effective launch result.

### CR-002 — Org Agent explicit-off permission choice is overwritten

- Severity: High; candidate CF-002; affected SCN-002/BEH-004, REQ-007/010 and AC-009.
- `autobyteus-web/stores/agentOrgRunConfigStore.ts:144` passes `teamOverrides.value[address]` as the previous **Agent** override. At an Agent address this is normally absent, so every update of an AGY Agent override—including a second explicit `autoExecuteTools: false` edit—is treated as newly selected AGY and forced true by `withNewRuntimeOverridePolicy`. This can launch with `--dangerously-skip-permissions` despite the user's visible off choice.
- Required bounded fix: use `agentOverrides.value[address]` for the previous Agent state; add the select-AGY-then-toggle-off Org Agent regression test.

## Classification / Recommended Recipient

**Fail — Local Fix**, `/implementation_engineer`. These are bounded implementation-owned web store errors, not missing requirements or a design revision. Re-review source and then run API/E2E after correction. Do not advance this result to API/E2E.

## Residual Risks

- Independently validate live/reloaded AGY denial on the final code: label should remain DENIED/non-green with source ERROR and exposed output; the earlier pre-refinement reload was FAILED/non-green. This is a downstream verification gate, not an extra source finding.
- Validate exact restore, real workspace file/shell targets, scoped MCP/team/org, configured skills/collision, and non-AGY behavior in API/E2E. Provider 1.2.10 controls and local browser runs are not acceptance.

## Latest Authoritative Result

- Review Decision: **Fail**; entry point: Implementation Review; scenario gate: Pass; material-premise gate: Pass.
- Score: 8.8/10 (88/100); classification: Local Fix; recipient: `/implementation_engineer`.
- Current authoritative result: CRR-001 at `d0ec1fc07`. No Code Review or API/E2E acceptance is claimed.
