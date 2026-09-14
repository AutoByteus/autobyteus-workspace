# IR-003 local implementation checks — F-002 / DS-REV-003

Source/test/docs commit `1f407b3bf`; base review HEAD `a269262fd`. These checks are implementation-scoped, not API/E2E acceptance.

## Regression and focused execution
The first test used the real Team run/context/selection stores, TeamStreamingService, task activation, tool dispatcher/handlers, exact projection query/reader, inspection/hydrator, Activity, mounted ToolCallIndicator, active workspace command boundary and Team approval tracker. Only external Apollo, socket transport, node endpoint and router boundaries were controlled.

Before the production change: **2 failed / 1 passed**, `ir003-red.log`. Approval BEFORE first task selection and DURING the first query was replaced by Parsed history/old arguments. After-hydration control retained approval and passed. This is an acceptance-oriented failing regression, not the reviewer's green defect-reproduction assertion.

Final command, from autobyteus-web:
```sh
pnpm test:nuxt services/runHydration/__tests__ services/runOpen/__tests__/teamMemberInspectionCoordinator.spec.ts services/agentStreaming/__tests__/TeamStreamingService.spec.ts services/agentStreaming/__tests__/TeamStreamingService.execution-address.spec.ts components/conversation/__tests__/ToolCallIndicator.spec.ts stores/__tests__/agentOrgRetainedRecovery.spec.ts stores/__tests__/runHistoryRetainedTeamStatus.spec.ts --run
```
**16 files / 142 tests Pass**, `ir003-local-tests.log`. Includes 19 real task approval/inspection tests and 19 pure candidate-reconciliation tests. Incoming API tests were not edited or counted as new tests here.
- TASK-01: received pending tool before first task inspection; parent stays focused; exact task context retained; one visible Approve; actual command contains exact task AgentRun/invocation once. Null approvalTarget is admitted through existing tracker, not fabricated.
- TASK-02: after-hydration control, during-fetch revision retry, full history/system content, missing history tool, same draft/config/identity. Existing projection tests preserve attachments/system and blank-shell content; candidate copies preserve history text/attachments and do not copy live conversation text.
- TASK-03: real approved/executing/denied/success/error/interrupted frames before selection; terminal during fetch; auto-mode execution/success without controls; parsed-only history never manufactures permission. Pure tests check projected-terminal precedence, late awaiting after executing, specialized type/arguments/metadata and actual routing fallback from Activity.
- TASK-04: real task settlement, readiness loss/inactive root during query, superseded selection, final Activity commit conflict and configured member path. Existing exact-root replacement/inspection/stream address guards remain tested. Pure tests reject foreign run/target, concrete tool/terminal conflicts and ambiguous duplicates without mutation; equivalent duplicates normalize; Activity-only and segment-only retained decisions agree. Import/init cycles exercised through real store/service integration without module-time Pinia access.
- F-001 preservation: all20 retained Org recovery tests and6 retained Team status tests pass in this round. Actual F-001 acceptance remains API-REV-002's evidence, not recreated by these local tests.

## Typecheck and source checks
- `pnpm exec tsc --noEmit`: **Fail / exit2**, `ir003-web-typecheck.log`, 705 output lines (not a diagnostic count). Inherited plain-TypeScript Vue declaration, cross-workspace/module/fixture errors remain. The new test reports unresolved ToolCallIndicator.vue under the same missing SFC declarations; no clean Vue/typecheck/build claim.
- First typecheck identified two new flatMap union-inference errors in the pure helper; explicit existing union result types corrected them. Final log reports no diagnostics in either changed production file or the pure test. No paired whole-repository no-new-errors claim.
- IR-001 backend strict-rootDir/expanded-baseline qualifications and IR-002 frontend typecheck limitations remain cumulative context. Backend unchanged this round; no new server build or provider validation.
- `git diff --check` pass for source. Changed production effective nonempty lines: hydrator155, helper156; deltas21 and161 respectively, both below500/220 source guards. Test files excluded from source limit.

## Direct browser feedback loop
Read existing README/AGENTS/development conventions, task-monitor docs and shared ToolCallIndicator. Owned Nuxt dev renderer port13863, backend base127.0.0.1:19876 intentionally unavailable. Temporary preview page (retained as `ir003-preview.page.vue`) used real Team store/stream/transport wrapper, task activation, inspector/hydrator, shared indicator, active-context command route and tracker. Only in-page network/WebSocket boundary responses were simulated. No provider/runtime/server was started.

Direct browser interactions/AX+screenshot inspections:
1. Parent remained focused with command count0 after the fixture emitted the actual contract-shaped task approval before selection.
2. Edited the draft in the fixture field, clicked Inspect task. Exact task became focused; historical text remained visible with current actual argument summary; one Deny/Approve pair was visible, draft unchanged.
3. Clicked the real ToolCallIndicator Approve. The fixture recorded exactly `APPROVE_TOOL`, `agent_run_id: preview-task`, `invocation_id: preview-submit`, `reason:null`. Incoming fixture TOOL_APPROVED changed the same card to its approved presentation and removed pending controls. Command count1.
4. Checked spacing/readability/button layout and unchanged shared visual language; no UI styling changes needed.

Limits: test-owned preview controls and in-memory transport; no actual task provider, parent delegation approval, submit/awaiting_review/ordinary settlement or complete Tasks navigation journey. Global sidebar failed its unavailable backend fetch; it is outside preview acceptance. No persistent screenshot captured; direct observations were inspected during this execution. `ir003-preview.log` records renderer startup and expected unavailable health endpoint.

Cleanup: browser tab closed; owned renderer PID71857 stopped; port13863 no listener; temporary pages/ir003-preview.vue removed. All incoming API generated SDK files, fixtures, tests, runtime data/evidence and other-owner docs preserved. No user server/conversation, migration/reset/release/push/merge action.

## Required independent continuation
Source review first. API must check F-002 TASK-05/06 first, explicitly capturing incoming exact request/pre-selection owner state, then actual visible task Approve/click/one submission and ordinary review/settlement, repeat task and already-hydrated control. If frame absent, isolate producer→egress→transport→dispatch rather than manufacture controls. Preserve actual F-001 and complete remaining B02–B04. API-REV-002 remains Fail/confidence75.0%; F-003 withdrawn candidate is not protocol work.
