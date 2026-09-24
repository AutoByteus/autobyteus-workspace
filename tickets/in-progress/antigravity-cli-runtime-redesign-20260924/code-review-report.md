# Code Review Report — AGY runtime implementation

## Review Round Meta

- Review Entry Point: API/E2E Failure-Origin Review; round 3; current result `CRR-003`. Prior implementation source review: CRR-002 Pass.
- Requirements / investigation / solution history: `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`; approved SR-016 baseline, SR-019 workspace correction, SR-021 DONE-to-success clarification.
- Design / review: `design-spec.md`, `investigation-result.md`, `design-review-report.md` ARCH-REV-003 Pass, `architecture-review-revision-record.md` ARCH-REV-001–003.
- Implementation: `implementation-handoff.md`, `implementation-revision-record.md` IR-001/002/003; reviewed commit `575520264` against base `40b1783f4` on `codex/antigravity-cli-runtime-redesign-20260924`.
- Supplements: AGY CLI experiment, tool-event capture and command-outcome matrix; selected-workspace, MCP, toolset and skill probe reports; implementation local live JSON evidence. Probe artifacts are evidence, not product acceptance.
- Code review revision record: `code-review-revision-record.md` CRR-001/002/003. Prior authoritative result: CRR-002 Pass. API/E2E inputs: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` API-REV-001, `api-e2e-test-case-ledger.md`, new durable `autobyteus-server-ts/tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts`, final log `/tmp/agy-api-02-team-final.log`. Delivery: N/A.

## Routing Classification Review

- Task size: **Large**; architectural risk: **High**; current entry point: focused API/E2E failure-origin review after reviewed-route CRR-002 source Pass. The classification remains warranted by provider process/identity, scoped collaboration, trace, persistence and frontend launch changes.

## Review Scope

Focused on API-F-001 / AGY-02 at reviewed source commit `575520264`: approved real Team/Org member launch scenario, final corrected GraphQL/WebSocket E2E, exact failure log, and the smallest production chain from UI/API launch through run-tree validation to member activation. Earlier full structural/source audit remains CRR-002 context; it was not repeated. The final denial/DONE browser evidence is accepted as bounded API/E2E evidence but not reviewed as successful test code. No source/test fix was made in this role.

## Upstream Behavior And Production-Path Basis Confirmation

Approved behavior is clear. The SR-021 tool convention is intentionally provider-step success, not shell exit success. ARCH-REV-003 reviewed that changed basis. Behavior basis is **Contradicted for BEH-002 / SCN-002 real Team launch** by API-REV-001. CR-001/002 remain resolved; the AGY runtime still cannot reach a real Team member because the current run-tree validator rejects AGY before activation.

| Behavior ID | Status | Current production path and lifecycle evidence | Contradiction |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | CLI capability/model probe → catalog/availability → factory dispatch. | — |
| BEH-002 | **Contradicted for Team/Org launch** | Intended Team/Org path is launch editor → GraphQL → Team/Org service/planner → current execution-tree validator → member activation → shared prompt/capsule. AGY is rejected at the validator before the member identity path. | API-F-001 final Team E2E and `run-execution-tree-shared-record-schemas.ts:77-79`; Org shares validator but requires direct rerun. |
| BEH-003 | Confirmed | `init.conversation_id` → backend context/manager candidate → persisted external binding; restore compares exact ID before input. | — |
| BEH-004 | Confirmed | Web draft policy → Org Team/Agent overrides and pending editor batch → effective launch config → AGY permission flag. New AGY selection defaults on and later explicit-off is retained. | — |
| BEH-005 | Confirmed | Per-run capsule, selected real workspace `--add-dir`, manifest/agent hash and restore workspace check; model-directed target caveat retained. | — |
| BEH-006 | Confirmed | AGY stream converter → canonical event → trace sequencer/projection → web hydration/card; DONE without error is success, explicit ERROR/denial remains non-green. | Final fresh denial-label render remains downstream verification, not a demonstrated source contradiction. |
| SCN-005 | Confirmed | AGY-specific runtime branch and draft helper; unchanged non-AGY policy paths and focused regression evidence. | — |

## Supported Product Scenario And Reachability Gate

| Scenario ID | Behavior / contract | Kind, initiator and coherent goal | Supported entry and forward lifecycle | Outcome / consequence | Independent evidence | Validity / use |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001/002/003/004/006 | User starts a selected standalone AGY coding run. | Workspace launch → editable runtime/model/permission → run manager → capsule/process → canonical events. | Identity, binding, permissions and trace apply to that run. | Approved requirements SCN-001, design DS-001/003, existing launch UI. | Supported Normal Scenario / Use |
| SCN-002 | BEH-002/004; REQ-002/007/010 | User starts an AGY Team or Org to collaborate with real members. | Team/Org launch UI → GraphQL `createAgentTeamRun`/`createAgentOrgRun` → service/planner → execution-tree validation → member activation/AGY factory → WebSocket collaboration. | Real member identity and scoped inter-agent delivery; editable AGY scope defaults on and later explicit-off is honored. | Approved SCN-002/AC-002, real Team/Org launch UI and GraphQL production routes, design DS-001, API-REV-001 direct Team call. | Supported Normal Scenario / Use |
| SCN-003 | BEH-003/005 | User reopens own AGY run. | Stored run/provider ID and capsule → restore factory → exact CLI init check. | Original ID and run-start identity retained or non-restorable. | REQ-003–005, design DS-002. | Supported Normal Scenario / Use |
| SCN-004 | BEH-006/REQ-011 | User views a normal AGY command/tool step. | Chat input → AGY tool DONE or ERROR → converter/trace → live and reloaded cards. | DONE is green with source state/output and no fabricated exit; denial/error non-green. | SR-021 approval, command-outcome captures, design DS-003. | Supported Normal Scenario / Use |
| SCN-005 | REQ-006 | Existing-runtime user continues a Codex/Claude/AutoByteus run. | Normal runtime selection → existing factory and event paths. | No AGY policy leakage. | Requirements SCN-005 and existing runtime registration. | Supported Normal Scenario / Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / contract | Independent trigger and forward path / consequence | Evidence | Disposition / proportionate response |
| --- | --- | --- | --- | --- | --- |
| CF-003 | Current Team/Org run-tree launch validator rejects `antigravity_cli`. | SCN-002, BEH-002, REQ-002/AC-002, user-requested real Team parity. | User starts an AGY Team in the existing launch UI → `createAgentTeamRun` → `TeamRunService.createTeamRun` → `AgentTeamRunManager.createTeamRun` → `buildInitialTeamRunExecutionTree` → shared `validateLaunchConfiguration`; exception returns GraphQL `success=false` before member activation, so no identity, real recipient roundtrip or trace. | Final corrected AGY-02 log/test; `team-run-execution-tree-builder.ts:35-57`; `run-execution-tree-shared-record-schemas.ts:67-79`; `agent-team-run.ts:184-201`; Org schema uses same validator. | **Promote**. Bounded implementation correction to current supported-runtime validation and Team/Org regression coverage; rerun real Team E2E first, then Org and continuation. No test workaround or speculative migration. |

CRR-001's CF-001/002 remain resolved by IR-003. The supported Team journey is independent of the new E2E test: it is expressly approved by SCN-002/AC-002 and exposed by the production launch UI/GraphQL path. The test reproduces, but does not establish, the product scenario.

## Focused API/E2E Failure-Origin Review — CRR-003

- Failing scenario / command: AGY-02, `RUN_AGY_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agy-team-inter-agent-roundtrip.e2e.test.ts --no-watch`; final log `/tmp/agy-api-02-team-final.log`.
- Expected: real AGY Team creation returns a Team run ID, then an AGY member invokes scoped `send_message_to` to another real member and return stream/trace preserve exact attribution.
- Observed: definitions and workspace are created; `createAgentTeamRun.success=false` with `rootTeam.defaultLaunchConfiguration.runtimeKind is unsupported.` Failure occurs before member activation. The first obsolete `refType` fixture was corrected before this final run, and the final test uses AGY `call_mcp_tool` shape; that earlier fixture defect is not the present cause.
- Production origin: `RuntimeKind.ANTIGRAVITY_CLI` is accepted by `runtimeKindFromString` and Team input normalization. The current execution-tree builder calls the shared `validateLaunchConfiguration`, whose explicit runtime list omits AGY. The GraphQL resolver converts that thrown error to `success=false`. Org uses the same current validator, but its direct launch remains untested; do not state it as an observed Org failure.
- Classification: **implementation defect, Local Fix**, not invalid/stale test, environment failure, requirement gap or design change. The affected current validator predates the AGY diff, but the implementation had to extend this admission boundary for the approved runtime.
- Earlier review gap: CRR-002 passed API/E2E readiness without tracing the real Team launch through the persisted execution-tree validator. The invariant that every newly supported runtime must be accepted by current Team/Org launch-tree admission should have been checked. This was reasonably detectable in source review; API-REV-001 supplies direct confirmation.
- Scope of correction: enable AGY in current Team/Org run-tree validation and add focused regression(s) without changing approved permission or trace semantics. Because a migration-only decoder imports the shared helper, assess that call site deliberately; do not infer a production data migration or version-specific fallback from this finding. Require implementation source re-review and API/E2E rerun after repair.

## Structural / Design Checks — CRR-002 source-audit context, not repeated in CRR-003

| Mandatory check | Result | Evidence / action |
| --- | --- | --- |
| Task design health assessment | Pass | Bounded provider-leaf refactor implements reviewed posture. |
| Supplemental-artifact alignment | Pass | AGY 1.2.10 probe assumptions and SR-021 status convention match converter/capsule shape. |
| Data-flow spine inventory | Pass | DS-001–004 visible from launch/restore through event return. |
| Ownership boundary clarity | Pass | Manager owns admission; AGY factory/backend own provider lifecycle. |
| Off-spine concern clarity | Pass | Capsule owns assets, process owns I/O, converter owns events. |
| Existing capability reuse | Pass | Shared identity composer, MCP session authority, recorder/projection reused. |
| Reusable owned structures | Pass | Draft policy and AGY stream shapes are factored once; Org Team/Agent call sites now use the policy correctly. |
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
| Test scenarios/assertions | Pass | IR-003 store/effective-form, component event-batch and mounted-panel tests cover Org Team and Agent select-on/explicit-off. Reviewer reran 25/25 affected web tests. |
| Test fixture/helper reuse | Pass | Existing focused AGY fixture matrix and Org store harness are reusable. |
| Stale/duplicate/compatibility-only tests | Pass | None found in reviewed changed scope. |
| API/E2E readiness | **Fail (CRR-003 update)** | API-REV-001 real Team launch stops at the shared runtime whitelist before member activation (CF-003 / CR-003). |

## Source File Size And Structure Audit

Effective nonempty lines for changed implementation source only; tests, fixtures and generated files excluded. `>220` is the added-line delta check, not total file length. No changed source breaches the 500-line hard limit or 220-line added delta. IR-003 changes are localized to the Org store and Team scope editor; placement and responsibility remain coherent.

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
| `autobyteus-web/components/workspace/config/TeamScopeConfigEditor.vue` | 345 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/composables/useDefinitionLaunchDefaults.ts` | 158 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/localization/messages/en/workspace.ts` | 431 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | 430 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | 307 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/services/runHydration/runProjectionConversation.ts` | 311 | Pass | Pass | Pass | Pass | None | None |
| `autobyteus-web/stores/agentOrgRunConfigStore.ts` | 231 | Pass | Pass | Pass | Pass | None | None |
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

## Review Scorecard — affected CRR-003 rationale only

- Overall: **8.6/10; 86/100** after updating only API/E2E readiness and runtime fidelity for confirmed API-F-001. Other categories retain the CRR-002 source-review rationale; no full structural audit was repeated.

| Priority | Category | Score | Why / weakness / improvement |
| --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.0 | Launch, restore and event paths remain traceable; no material spine gap; maintain. |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.0 | Existing manager/MCP/trace owners remain authoritative; no boundary bypass; maintain. |
| 3 | API / Interface / Query / Command Clarity | 9.0 | Explicit AGY factory/context/process contracts and exact IDs; no material weakness; maintain. |
| 4 | Separation of Concerns and File Placement | 9.0 | Provider leaf, capsule/stream and Org draft owners are coherent; no placement gap; maintain. |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.0 | Canonical events and shared draft-policy helper reused correctly by corrected Org paths; no parallel shape; maintain. |
| 6 | Naming Quality and Local Readability | 9.0 | AGY roles, ID semantics and exact prior override are explicit; no material naming gap; maintain. |
| 7 | API/E2E Readiness | **7.0** | CF-003/CR-003: real approved Team launch is rejected before member activation by current run-tree validation; fix and rerun AGY-02. |
| 8 | Runtime Correctness And Behavioral Fidelity | **7.0** | CF-003/CR-003: AGY Team launch fails despite valid runtime selection and draft policy; restore approved Team/Org admission. |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.0 | Neutral IR-001 path removed and no migration/fallback added; maintain. |
| 10 | Cleanup Completeness | 9.0 | No obsolete AGY production seam identified; maintain. |

## Findings

### CR-003 — Current Team/Org run-tree admission omits AGY

- Severity: High; promoted candidate CF-003; supported normal SCN-002, BEH-002, REQ-002/AC-002 and the user's real-Team parity gate.
- `autobyteus-server-ts/src/run-history/store/run-execution-tree-shared-record-schemas.ts:77-79` accepts only the three former runtime strings. Real AGY Team creation reaches this current-schema validator via GraphQL → Team service/manager → execution-tree builder; it throws before members can activate. API-REV-001 directly observed `success=false` and the exact unsupported-runtime message. Org current validation shares the helper, making its launch a direct follow-up check, not an observed failure in this round.
- Required bounded correction: admit the supported AGY runtime in the current validator, retain existing-runtime behavior, add focused Team/Org current-tree regression coverage, and check the migration-only consumer proportionately without adding an unapproved migration. Return through source review, then rerun AGY-02 real GraphQL/WebSocket first and complete Org/continuation validation.
- Review-gap attribution: CRR-002 missed this source-level path invariant when it declared API/E2E readiness. The runtime enum/factory were extended, but persisted Team/Org admission was not checked.

CR-001/002 remain resolved; see CRR-002.

## Classification / Recommended Recipient

**Fail — Local Fix**, `/implementation_engineer`. This is implementation-owned current runtime integration, not an ambiguous product decision or stale final fixture. No API/E2E pass or test-code review is available; implementation repair must return to source review and then API/E2E.

## Residual Risks

- AGY-02 real recipient delivery and exact attribution, real Org execution, and Team restore/continuation remain unproven until launch is repaired and rerun. Stubbed scoped-MCP calls do not satisfy parity.
- API-REV-001 did freshly confirm final-code live/reloaded denial **DENIED** and DONE control green/source-output/no-shell-exit behavior for standalone runs; the prior denial-label uncertainty is closed, but this does not offset the Team failure.
- Existing AGY 1.2.10 and non-AGY checks remain bounded as described in the API/E2E report; no delivery acceptance.

## Latest Authoritative Result

- Review Decision: **Fail**; entry point: API/E2E Failure-Origin Review, round 3; scenario gate: Pass; material-premise gate: Pass.
- Score: affected-rationale update 8.6/10 (86/100); failure origin: implementation defect plus earlier source-review gap; classification: Local Fix; recipient: `/implementation_engineer`.
- Current authoritative result: CRR-003 after API-REV-001 at source commit `575520264`; CRR-002 source Pass is superseded for the affected Team/Org admission behavior. No API/E2E or delivery acceptance.
