# Implementation Revision Record — delegated-runtime-model-routing (autobyteus-32)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-002 Pass, ARCH-REV-003 Pass), round 1 | N/A | `Initial Baseline` | SR-015, SR-016, ARCH-REV-002, ARCH-REV-003 | Implemented; handed to Code Review |
| IR-002 | Code Reviewer, `code-review-report.md` CRR-001 (Fail), round 1; Solution Designer SR-017 | CR-001, CR-002; C-03 → SR-017 | `Local Fix` | CRR-001, SR-017 | Fixed; returned to Code Review |
| IR-003 | Architecture Reviewer, ARCH-REV-004 (SR-018 with SR-017); Code Reviewer CRR-003 (failure origin of API/E2E round 1) | CR-005; CR-003/CR-004 resolved by SR-018 | `Local Fix` + design revision SR-018 | SR-018, ARCH-REV-004, CRR-003, API-E2E round 1 | Confinement removed; CR-005 fixed; to Code Review |
| IR-004 | Delivery Engineer, `release-deployment-report.md` § Blocker, after merging `origin/personal` `50e93c2108` | DEL-F1, DEL-F2 | `Local Fix` | CRR-004 (Pass on IR-003), delivery round 1 | Fixed; to Code Review |

## Revision Entries

### IR-001 — Model Router core: routing layer, Model Router agent, decision records, peer contract, page and run Settings rows

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/delegated-runtime-model-routing/design-review-report.md`, ARCH-REV-002 (SR-015) and ARCH-REV-003 (SR-016 delta)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: design change sequence steps 1–9 and the docs built; step 10's live-agents fold is
  left to API/E2E; implementation-scoped checks pass (see the handoff's Checks Run).
- Related solution revision IDs: SR-015, SR-016
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: initial implementation of the approved package.
- Approved behavior or requirement IDs affected: REQ-001..012, REQ-014; DS-001..008; AC-001..009, AC-011, AC-012.
- Implementation delta: launch usability with node facts (U3/U4b while routing is on); the task lifecycle split into
  `prepareNewCopyWork` + `dispatchNewCopy`; the resolver's Model Router layer; the `model-routing` subsystem (router,
  one-at-a-time queue per SR-016, Model Router agent, sessions, request text, decision log, statistics, settings);
  `submit_launch_choices` with its MCP provider; the built-in internal Model Router template; run-config confinement
  (Codex `workspace-write`; Claude user settings only, no shell tools, `PreToolUse` write hook) and the
  `systemRunOwner` marker; internal workspaces; peer contract (`task`, `launches`, `modelRouting`,
  `MODEL_ROUTER_FAILED`, 50 s start bound); run-history launch sources and remote link launches; GraphQL; web page
  (Setup, Decisions, Overview, Runtimes) and run Settings rows (Model Router source, reason, View decision, remote
  rows); CM-12, GLOSSARY, module and web docs.
- Changed files or areas: see the handoff's Key Files Or Areas.
- Local validation and result: server typecheck and full unit suite, web specs of the touched areas, web guards, the
  rendered page on the development stack; see the handoff's Checks Run.
- Next recipient or routing: `code_reviewer` (Large/High).
- Remaining limitations or risks: live confinement, ~45 s tool-call time-outs on Claude SDK/Antigravity/Grok, the
  peer contract across a Docker peer and the desktop-app check are left to API/E2E and the user (see the handoff).

### IR-002 — CR-001 (peer records name only the node), CR-002 (signed-out text), SR-017 (no stored notes)

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/delegated-runtime-model-routing/code-review-report.md`, CRR-001 round 1 (Fail, two Low Local Fixes); Solution Designer, SR-017 (`solution-revision-record.md`, design-spec § Shared Structure), and the confirmation of CR-001 option 1.
- Triggering finding IDs: CR-001, CR-002; review candidate C-03 (decided as SR-017).
- Classification: `Local Fix` (plus the SR-017 design change applied with it).
- Prior authoritative result: IR-001, CRR-001 Fail.
- Current authoritative result: both findings fixed and SR-017 applied; affected checks rerun (IMP-09, IMP-10).
- Related solution revision IDs: SR-017
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this revision is recorded: code review findings and a design decision on a review candidate.
- Approved behavior or requirement IDs affected: REQ-012 (record shape), REQ-010 / supplement § 4 (problem line).
- Implementation delta:
  - CR-001: `RoutingDecisionRecord.delegatingAgentName` and `RoutingDecisionDelegation.delegatingAgentName` are
    `string | null` (server types, log parser, web types). `RemoteDelegationReceiver` holds peer-started records with
    `delegatingRunId: null`, `delegatingAgentName: null`, `fromNode` = A. `root-task-dispatch.ts` writes the address
    basename or null, never a run ID. `ModelRoutingDecisions.vue` passes `?? ''` to the Open-run title (the button
    renders only with a delegating run). No start-request change.
  - CR-002: `routerProblem` maps `SIGNED_OUT` to new key `settings.modelRouting.problem.signedOut` (en: "{{runtime}} is
    signed out. Sign in under Agent Runtimes."; zh-CN: "{{runtime}} 已退出登录。请在“智能体运行时”中登录。");
    `RUNTIME_UNAVAILABLE` keeps `runtimeMissing`.
  - SR-017: `notes` removed from `RoutingDecisionAgent`/`RoutingDecisionRecord` (server and web); the draft builder
    no longer renders notes (`launchNotesOf` and the basename import removed there); the log parser no longer requires
    or copies `notes` (an older line's `notes` is ignored). `delegate_task` result lines unchanged.
  - Docs: `docs/modules/model_routing.md` (records), `GLOSSARY.md` (Decision record).
- Changed files or areas: `model-routing/domain/model-routing-types.ts`, `model-routing/stores/routing-decision-log.ts`,
  `agent-collaboration/collaborators/routing-decision-draft.ts`, `agent-collaboration/execution/task/root-task-dispatch.ts`,
  `remote-collaboration/inbound/remote-delegation-receiver.ts`; web `types/modelRouting.ts`,
  `components/settings/model-routing/{modelRoutingPresentation.ts,ModelRoutingDecisions.vue}`, en/zh-CN
  `modelRoutingSettings.ts`; tests: `remote-delegation-receiver.test.ts` (peer-started record; none while off),
  `routing-decision-log.test.ts` (no stored notes, older notes ignored, null delegating name),
  `submit-launch-choices-and-records.test.ts` (skipped instead of notes), new `modelRoutingPresentation.spec.ts`
  (every reason code, en and zh-CN), `ModelRoutingManager.spec.ts` fixture.
- Local validation and result: server typecheck and the model-routing, remote-collaboration and agent-collaboration
  unit suites (74 files, 799 tests) pass; IMP-09 (full server unit) and IMP-10 (web specs and guards) in the handoff.
  IMP-10 also surfaced a pre-existing failing spec this branch does not touch (FU-006).
- Next recipient or routing: `code_reviewer` (Targeted Delta Review of CR-001, CR-002; the package stays Large/High).
- Remaining limitations or risks: unchanged from IR-001; the new signed-out string should be reported to Product.

### IR-003 — No router confinement (SR-018); a failed router turn no longer leaves routing "busy" (CR-005)

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` ARCH-REV-004 (Pass on SR-018 with SR-017); Code Reviewer, `code-review-report.md` CRR-003 (failure-origin review of API/E2E round 1, commit `64e5b57932`: L-01, L-02, MR-09); investigation A-34.
- Triggering finding IDs: CR-005 (F-3, MR-09); CR-003 and CR-004 (L-02, L-01) no longer apply after SR-018.
- Classification: `Local Fix` (CR-005) with the design revision SR-018 applied.
- Prior authoritative result: IR-002 (CRR-002 Pass); API/E2E round 1 Fail (router confinement, MR-09).
- Current authoritative result: confinement removed as a clean cut; CR-005 fixed; IMP-11 rerun.
- Related solution revision IDs: SR-018 (SR-017 already applied in IR-002)
- Related architecture-review revision IDs: ARCH-REV-004
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: API/E2E round 1 (`64e5b57932`)
- Related delivery revision IDs: N/A
- Why this revision is recorded: the user removed the router's confinement (SR-018) and the failed-turn defect (CR-005).
- Approved behavior or requirement IDs affected: REQ-003 / AC-011 (router tools, no sandbox), DS-003 / SR-012 point 4 (failed router turns).
- Implementation delta:
  - SR-018: `AgentRunConfig.toolConfinement`, `CreateAgentRunInput.toolConfinement`, the run-metadata
    `toolConfinement` marker and `AgentRunToolConfinement` removed; `codex-thread-bootstrapper.ts`,
    `agent-run-config.ts`, `claude-session-query-options.ts`, `claude-sdk-client.ts` and its unit test restored to base
    `d74f75a51a`; `claude-workspace-confinement.ts` deleted; `ModelRouterAgent` no longer passes `toolConfinement`.
    `systemRunOwner`, the eligibility rule, internal workspaces and the one-request queue are unchanged.
  - CR-005: `ModelRouterAgent.ensureRun` reuses the stored run through `resolveCommandReadyAgentRun` (the live run, or
    its restore when its runtime stopped); if that fails it logs and creates a new run (DS-003 "otherwise create").
    `isIdle()` is true when no input waits and either the run's runtime stopped or its status is not `running` /
    `initializing` (so `error` and `offline` are free). `ModelRouter.route` still ensures the run up front (fast
    "could not start"), and the queue's `send` takes the run again when the request is sent (a failure there fails that
    routing with "the Model Router agent could not start (…)"). No new status code.
  - Docs: `docs/modules/model_routing.md` (agent paragraph; "Tools of the router's run" replaces the confinement section).
- Changed files or areas: `model-routing/services/{model-router-agent,model-router}.ts`,
  `compositions/model-routing-composition.ts`, `agent-execution/services/{agent-run-service,agent-run-provisioning-service,standalone-agent-run-lifecycle-service}.ts`,
  `run-history/store/{agent-run-metadata-types,agent-run-metadata-store}.ts`, the four files restored to base, the deleted
  Claude module; tests `model-router-agent.test.ts` (command-ready path; CR-005 cases), `model-router.test.ts` (real
  agent: failed turn, then the next routing answered from the restored run within 2 s), `model-router-confinement.test.ts`
  → `model-router-tools.test.ts` (confinement cases removed), `claude-sdk-client.test.ts` restored to base.
- Local validation and result: typecheck; affected suites (model-routing, agent-execution, runtime-management claude
  and codex, run-history, remote-collaboration, agent-collaboration): 280 files, 2713 tests pass; IMP-11 full unit.
- Next recipient or routing: `code_reviewer` (Large/High), then API/E2E reruns (MR-09; normal live routing).
- Remaining limitations or risks: the router is unconfined by design (RSK-006); a router run that cannot be restored is
  replaced (context starts over, `knowledge.md` stays).

### IR-004 — Model Router in the web's built-in id mirror (DEL-F1); "Configuration" in the hints (DEL-F2)

- Triggering role, report path, and round: Delivery Engineer, `tickets/in-progress/delegated-runtime-model-routing/release-deployment-report.md` § Blocker, delivery round 1 (branch at `e2e4f1a1ab`, after the merge `357936966c` of `origin/personal` `50e93c2108`); evidence `evidence/delivery/DEL-03-web-failure-triage.log`, `DEL-04-merged-desktop-decisions-empty.png`.
- Triggering finding IDs: DEL-F1 (blocking), DEL-F2 (minor).
- Classification: `Local Fix`.
- Prior authoritative result: IR-003 (CRR-004 Pass); delivery blocked on DEL-F1.
- Current authoritative result: both fixed (commit `f48af0176a`, web only); IMP-12 and IMP-13 rerun on the merged state.
- Related solution revision IDs: N/A
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-004
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: delivery round 1 (DEL-F1, DEL-F2)
- Why this revision is recorded: the merged base added a web mirror of the server's built-in agent ids (DI-002) that this branch's new built-in had to join; the copy still named the tab by its old label.
- Approved behavior or requirement IDs affected: REQ-008 (the router is internal and never a collaborator), REQ-010 (page copy).
- Implementation delta:
  - DEL-F1: `autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts` exports `MODEL_ROUTER_AGENT_DEFINITION_ID` and
    lists it in `BUILT_IN_AGENT_DEFINITION_IDS`; `utils/collaborators/__tests__/draftMentionEligibility.spec.ts` adds the
    router (as listed while "Show internal agents" is on) and asserts it is never offered.
  - DEL-F2: en `decisions.inactiveNote`, `decisions.emptyOffHint`, `overview.emptyOffHint` say "Configuration", zh-CN
    say “配置”; `setup.title` (the Configuration panel's aria-label) is "Configuration" / 配置.
- Changed files or areas: the four web files above.
- Local validation and result: IMP-12 (contract spec, eligibility, the page, rows, copy; 34 files; guards) pass;
  IMP-13 (full web suite) in the handoff.
- Next recipient or routing: `code_reviewer` (Large/High route), then delivery.
- Remaining limitations or risks: none new.
