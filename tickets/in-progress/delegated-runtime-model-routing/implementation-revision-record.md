# Implementation Revision Record — delegated-runtime-model-routing (autobyteus-32)

The current code and `implementation-handoff.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` (ARCH-REV-002 Pass, ARCH-REV-003 Pass), round 1 | N/A | `Initial Baseline` | SR-015, SR-016, ARCH-REV-002, ARCH-REV-003 | Implemented; handed to Code Review |
| IR-002 | Code Reviewer, `code-review-report.md` CRR-001 (Fail), round 1; Solution Designer SR-017 | CR-001, CR-002; C-03 → SR-017 | `Local Fix` | CRR-001, SR-017 | Fixed; returned to Code Review |

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
