# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | `/architecture_reviewer`, `design-review-report.md` (ARCH-REV-002, round 2) | `N/A` | `Initial Baseline` | `SR-006`, `ARCH-REV-002` | Implemented, self-validated, routed per `get_handoff_rules` |
| IR-002 | `/code_reviewer`, `code-review-report.md` (CRR-001, round 1, Full Review) | `CR-001` | `Local Fix` | `SR-006`, `ARCH-REV-002`, `CRR-001` | Fixed, self-validated (incl. the reviewer's own e2e reproduction), returned to `/code_reviewer` |

## Revision Entries

### IR-001 — Model hand-over: the continuation decision replaces the runtime-only switch rule

- Triggering role, report path, and round: `/architecture_reviewer`, `design-review-report.md`, round 2 (`ARCH-REV-002`, `Pass`)
- Triggering finding IDs: `N/A` (initial implementation of a passed design)
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implemented and self-validated; ready for its next route
- Related solution revision IDs: `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation round of the approved, architecture-reviewed design for autobyteus-53 (`stopped-run-unavailable-model`).
- Approved behavior or requirement IDs affected: REQ-001..REQ-008; BEH-001..BEH-006; DEC-005..DEC-009; AC-001..AC-010.
- Implementation delta:
  - `llm-management/domain/run-model-selection.ts`: new `RunContinuation`, `RunHandOver`; `handOver` added to both context types; `continuation` added to the valid result.
  - `llm-management/services/run-model-selection-service.ts`: new private `continuationFor` (the decision table) called from `validateWithEvidence`; `optionsWithEvidence` lists every offered native model unless `handOver === "unavailable"`.
  - `agent-execution/services/stopped-run-selection-context.ts`: `selectionContextFor` takes the reference model from the pending switch's `from` when one is pending (DEC-005), and a new `handOver` parameter.
  - `agent-execution/services/standalone-agent-run-eligibility.ts`: new `stoppedRunHandOver(metadata)`.
  - `agent-execution/services/standalone-stopped-run-selection-updater.ts`: passes `stoppedRunHandOver`; forwards `continuation` into the commit; new Save message branch for a same-runtime model hand-over.
  - `run-history/domain/runtime-selection-rule.ts`: `RuntimeSelection` gains `continuation` (required); `applyRuntimeSelection` rewritten to two branches (`same_session` / `hand_over`) driven by the stated continuation, replacing the runtime-equality inference; throws if a `same_session` selection names a runtime other than the session's.
  - `agent-team-execution/services/team-run-delegated-launch-plan.ts`, `team-run-selection-mutator.ts`: `handOver` passed by `scopeKind`; `continuation` carried next to the patch on the internal selection-target type (not the GraphQL-facing patch type).
  - `agent-org-execution/services/agent-org-run-manager.ts`, `agent-org-run-config-mutator.ts`, `agent-org-run-service.ts`: the same shape for Org saves, options, and the Org-create launch validator (`handOver: "no_session"`, AR-002).
  - `run-history/services/studio-run-model-config-service.ts`: options `handOver` for a standalone Agent (`stoppedRunHandOver`) and for Team scopes (by `scopeKind`).
  - `launch-preferences/launch-usability-check.ts`, `model-routing/model-routing-settings.ts`: `handOver: "no_session"` added to their validation contexts (AR-002).
  - `agent-execution/domain/runtime-switch.ts`: `buildRuntimeSwitchBetween`'s marker text reads "Model changed from … to …" only when the runtime is the same and the model differs (DEC-008); keeps today's text otherwise (N-4); `buildSessionRenewal` untouched.
  - `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts`: `nativeModelHelp` copy rewritten to state the rule truthfully (REQ-007).
  - `GLOSSARY.md`: "Agent runtime switch" updated to note the same-runtime case; new "Continuation" entry; "Pending agent runtime switch" reworded; "Switch marker" lists the third marker text.
  - Test files rewritten to the new rule (REQ-008) or extended with new cases: `tests/unit/llm-management/run-model-selection-service.test.ts`, `tests/unit/llm-management/on-demand-stored-model.test.ts`, `tests/unit/llm-management/services/run-model-selection-refusal.test.ts`, `tests/unit/run-history/domain/runtime-selection-rule.test.ts`, `tests/unit/run-history/services/agent-run-history-catalog-service.test.ts`, `tests/unit/run-history/services/agent-run-runtime-switch-commit.test.ts`, `tests/unit/agent-execution/standalone-stopped-run-selection-updater.test.ts`, `tests/unit/agent-execution/standalone-agent-run-lifecycle-service.test.ts`, `tests/unit/agent-execution/domain/runtime-switch-session-renewal.test.ts`, `tests/unit/agent-team-execution/team-run-model-selection-save.test.ts`, `tests/unit/agent-team-execution/team-run-selection-mutator.test.ts`, `tests/unit/agent-team-execution/team-run-selection-validation-context.test.ts`, `tests/unit/agent-org-execution/agent-org-run-service-model-selection.test.ts`, `tests/unit/model-routing/model-routing-settings.test.ts`, `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts`, `tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts`.
- Local validation and result: see `implementation-handoff.md` → `Checks Run` (IMP-01..IMP-05), all `Pass`; evidence in `evidence/`.
- Next recipient or routing: `/code_reviewer` (`get_handoff_rules`: `architectural_risk=High` → independent source review).
- Remaining limitations or risks: the native→native path (AC-002) and the Team-member case (AC-008) are proven only by the planned built-server E2E (not run by this role); `requirements-doc.md`'s "baseline SR-005" editorial line is unchanged (Solution Designer's document).

### IR-002 — CRR-001 CR-001: the Org save's pre-validation preview threw for every configured-Agent member; a second, pre-existing session-ID write defect found and fixed in the same files

- Triggering role, report path, and round: `/code_reviewer`, `code-review-report.md`, round 1 (`CRR-001`, Full Review, `Fail`)
- Triggering finding IDs: `CR-001` (High)
- Classification: `Local Fix`
- Prior authoritative result: `Fail` (CRR-001)
- Current authoritative result: fixed and self-validated with the reviewer's own reproduction; returned to `/code_reviewer` for its targeted delta review
- Related solution revision IDs: `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: CR-001 found that `AgentOrgRunManager`'s stopped save built a pre-validation preview of the proposed tree through the shared switch rule (`applyAgentOrgRunSelectionPatches`), before validation had decided a continuation; `patchAgent`'s new (correct) guard then threw "has no decided continuation" for every `CONFIGURED_AGENT` target, outside a `try`, so the whole save failed with `INTERNAL_ERROR`. No unit or integration test drove this path, so IR-001's checks did not catch it.
- Approved behavior or requirement IDs affected: REQ-005 (the rule applies on every stopped-run surface, incl. Org members); AC-008; BEH-003/BEH-004 preserved for Org members.
- Implementation delta:
  - `agent-org-execution/services/agent-org-run-config-mutator.ts`: new exported `previewAgentOrgLaunchConfigurations`, a continuation-free preview that merges each patched scope's own launch (via the existing `replaceLaunchConfiguration`) for every scope kind, with no pending-switch state; it is never a substitute for `applyAgentOrgRunSelectionPatches`, which still owns the actual commit after validation.
  - `agent-org-execution/services/agent-org-run-manager.ts`: the pre-validation `proposed` tree now calls `previewAgentOrgLaunchConfigurations` instead of `applyAgentOrgRunSelectionPatches`.
  - Self-validation while building the required regression test (below) found a second, pre-existing, independent defect: `agent-org-execution/container/container-config-trees.ts`'s `writeAgent` and `withLaunch` never wrote a node's `platformAgentRunId` back to disk, so any Org-member save whose continuation changes the session ID (every hand-over or undo this ticket adds, but equally an ordinary cross-runtime switch that already existed) kept the stale session ID on disk; the manager's own readback-equality check then always disagreed with the in-memory "expected" tree, so every such save reported `PERSISTENCE_INDETERMINATE` to the user instead of `UPDATED`. Reproduced with a plain cross-runtime switch (no model hand-over involved), confirming it predates and is independent of SR-006's change. Classified as `This ticket` under `ticket-scope.md` (not a follow-up): it breaks the in-scope AC-008 "Save succeeds" outcome, and it is the same Save functionality this ticket changes, not other functionality. Fixed by adding `platformAgentRunId: node.platformAgentRunId` (and `edited.platformAgentRunId` in `withLaunch`) to the written record.
  - Non-blocking (CRR-001): `tests/unit/run-history/domain/runtime-selection-rule.test.ts` — the test at line 53 that named both its halves `same_session` is split into two, the second (an actual `hand_over`) correctly named.
  - New test: `tests/unit/agent-org-execution/agent-org-run-manager-model-selection-save.test.ts` — the first test to construct a real `AgentOrgRunManager` and drive its stopped save of a configured Agent, with real on-disk fixtures (`writeStoredOrgContainer` plus direct store writes for custom models/sessions): a direct member's decreasing native model hands over with a same-runtime pending switch (session ID cleared, `from` correct); a direct member's equal/bigger native edit stays in the same session (no pending switch, session ID unchanged); a member inside a mounted Team saves the same way, Team tree otherwise untouched.
- Local validation and result: `pnpm -C autobyteus-server-ts typecheck` (production 0 errors, test-file baseline unchanged, 972/299); `pnpm -C autobyteus-server-ts build` (exit 0); the reviewer's own reproduction, `tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts` (1/1 passing, was failing before the fix); `tests/unit/agent-org-execution` + `tests/integration/agent-org-execution` (16 files / 100 tests passing); the new test file (3/3 passing); full server unit suite (1073 files / 8930 tests passing) and integration suite (92 files / 523 tests passing); web typecheck (production 0 errors, test-file baseline unchanged, 86/36). Evidence: `evidence/IMP-06-crr001-fix-validation.log`.
- Next recipient or routing: `/code_reviewer` (its own stated next step: a targeted delta source review, then API/E2E).
- Remaining limitations or risks: unchanged from IR-001 (AC-002/AC-008 full E2E still the API/E2E engineer's; the `requirements-doc.md` editorial line).
