# Implementation Handoff — delegated-runtime-model-routing (autobyteus-32)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing`, branch
`codex/delegated-runtime-model-routing`, base `origin/personal` `d74f75a51a`.

**Task Done-when (carried verbatim):** "The user has approved the approach. A delegated team can run its members on
different runtimes/models as chosen for the Task (e.g. Solution Designer on the Claude runtime, Implementation Engineer
on Codex). The choice is visible, fallbacks are clear, it's covered by tests, and **the user has verified it in the
desktop app**."

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Large/High); ARCH-REV-002 Pass
  (SR-015) and ARCH-REV-003 Pass (SR-016 delta), received from `architecture_reviewer`. Code review stays selected.
- Requirements doc: `tickets/in-progress/delegated-runtime-model-routing/requirements-doc.md`
- Investigation notes: `tickets/in-progress/delegated-runtime-model-routing/investigation-notes.md`
- Solution revision record: `tickets/in-progress/delegated-runtime-model-routing/solution-revision-record.md` (to SR-016)
- Design spec: `tickets/in-progress/delegated-runtime-model-routing/design-spec.md`
- Supplemental task artifacts: `launch-selection-order.md` (normative, §§ 2–7); Product UI/UX specification
  `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md`
  (revision `ce3e417`, normative for the page and run Settings rows); `follow-ups.md` (FU-001..005).
- Design review report: `tickets/in-progress/delegated-runtime-model-routing/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/delegated-runtime-model-routing/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation).

The ticket's design documents in `tickets/in-progress/delegated-runtime-model-routing/` and `docs/design-cases.md` are
the Solution Designer's, uncommitted in the worktree; I committed only my own files there (this handoff, the revision
record, `evidence/implementation/`).

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002, after code review CRR-001)
- Implementation revision record: `tickets/in-progress/delegated-runtime-model-routing/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (baseline `IR-001`)
- Related solution revision IDs: SR-001..SR-017 (built against SR-015 + SR-016; SR-017 applied in IR-002)
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003
- Related code-review revision IDs: CRR-001 (Fail, two Low Local Fixes)
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: CR-001, CR-002 (CRR-001); SR-017 (design decision on review candidate C-03)

IR-002 delta (commits `161d136c1b`, `03d9860e82`): `delegatingAgentName` is nullable and B writes null for a copy
started for a peer (CR-001, option 1 as the Solution Designer confirmed; no start-request change); `SIGNED_OUT` has its
own problem text (CR-002); decision records no longer store rendered `notes` (SR-017). See the revision record.

Built in design sequence order: steps 1–3 and 7 (commit `d384968700`), steps 4–6 and 8 (`930597c730`), step 9 (web),
docs and the remaining fixes (commit listed under Checks Run). Step 10's live-agents fold is left to API/E2E (see the
end of this document).

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: about 60 source files across server, three contract packages and web, as the design
  estimated; new persisted stores, a changed peer contract and a confined, auto-approved system-owned agent run, as
  the risk rationale says. No escalation trigger was hit: a router failure never starts an agent on an unusable or
  blocked launch (it falls through to the next layer or refuses); the root gate is unchanged; no data migration.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-001 | Work and Task first, then placement for that work, then the copy; records on dispatch success | `execution/task/new-copy-work.ts` (`prepareNewCopyWork`), `root-task-execution-lifecycle.ts` (`prepareNewCopyWork`/`dispatchNewCopy`), the three roots (`root-team-run.ts`, `standalone-root-message-delivery.ts`, `agent-org-run-message-delivery.ts`), `catalog-delegation.ts` (placement carries `routingDecision`), `root-task-dispatch.ts` (records through `findRoutingDecisionRecorder`) | Done. `delegateToNewCopy` removed (Legacy Removal Policy). |
| DS-002 | Peer start carries the Task; B resolves without the inherited layer; launches back to A; B records when A's work packet arrives | A: `execution/remote/remote-delegation.ts` (`delegate(input, context, copies)` prepares the work, then dispatches the remote placement with it; launches → notes), `remote-run-channel.ts`; B: `remote-collaboration/inbound/remote-delegation-receiver.ts`, `peer-started-run-decisions.ts`, `remote-message-receiver.ts` (`workArrived`); contract: `peer-client.ts` (50 s start), `peer-gateway.ts` (`parseStartTask`), `remote-requests.ts`, `remote-refusals.ts` | Done. Link field is `launches` (one entry per agent address) rather than a `launch` per member: one list serves Agent and Team links alike. |
| DS-003 | One owner of a routing; budget 40 s from opening, wait included; one request at a time; turn end fails the session at once | `model-routing/services/model-router.ts`, `routing-request-queue.ts`, `model-router-agent.ts` (`isIdle`/`onIdleChange` from `AGENT_STATUS` + `AGENT_INPUT_STATE`), `routing-request-text.ts` | Done (SR-016: no append-to-turn). A never-sent request fails "the Model Router was busy"; a sent one "no valid answer within 40 seconds". |
| DS-004 | Decision tool accepts only the router's run; validates against the session; errors back to the router | `agent-tools/model-routing/submit-launch-choices-{contract,tool}.ts`, `agent-tools/mcp/providers/model-routing-tools-mcp-adapter-provider.ts`, `model-routing/services/model-routing-sessions.ts` | Done. Closed/unknown text: "Routing request <id> is no longer open (answered or timed out); nothing was changed." |
| DS-005 | Page reads status (reason codes), decisions (Task groups, paged, filter), statistics (period); sets switch and router launch; "Talk to the router" | `api/graphql/types/model-routing.ts`; web `components/settings/model-routing/*`, `graphql/{queries,mutations}/modelRouting*.ts`, `types/modelRouting.ts` | Done per UI/UX spec UIS-001..004. |
| DS-006 | Recorded launch sources → notes and run Settings rows; remote rows from peer launches | `collaborators/launch-configuration-notes.ts`, `domain/launch-configuration-source.ts`, DTO projections; web `utils/runSettings/{runMemberTree,delegatedLaunchRows}.ts`, `components/run-settings/RunMemberRow.vue`, `components/workspace/config/ExistingRunConfigEditor.vue`, `stores/remoteRunsStore.ts` | Done (VIS-016/017). |
| DS-007 | Router's `knowledge.md`, first 16 KB in each request | `ModelRouterAgent.readKnowledge`, template `built-in-agents/templates/model-router/agent.md` | Done; the agent writes it with its own file tools. |
| DS-008 | Internal workspaces hidden while internal agents are hidden | `workspaces/internal-workspaces.ts`, `workspace-manager.ts` `listVisibleWorkspaces` | Done. |
| REQ-003 / AC-011 | Router tools = template list + runtime file tools; confinement (review point 1–3) | `systemRunOwner` only from `ModelRouterAgent`, kept in metadata and on restore, excluded by `standalone-agent-run-eligibility.ts`; Codex `workspace-write` (`codex-thread-bootstrapper.ts`); Claude `claude-workspace-confinement.ts` (setting sources `["user"]`, `Bash`/`BashOutput`/`KillShell` disallowed, `PreToolUse` write hook) | Done; unit-tested per runtime. Live confinement checks are left to API/E2E (below). |
| REQ-012 | Records only while Model Routing is on, by the resolving node | `routing-decision-draft.ts` (draft only while on), `stores/routing-decision-log.ts`, `services/routing-statistics.ts` | Done. IR-002: no stored `notes` (SR-017); peer-started records carry `fromNode` with null delegating run and name (CR-001). |
| REQ-014 | CM-12, GLOSSARY, module docs | `autobyteus-server-ts/docs/design/collaboration_model.md`, `GLOSSARY.md`, `autobyteus-server-ts/docs/modules/model_routing.md` (new), `docs/modules/README.md`, `autobyteus-web/docs/settings.md` | Done. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src/`):
- New subsystem `model-routing/` (domain types and recorder binding, settings, services: router, agent, queue, sessions,
  request text, statistics, binding; store: decision log); composition `compositions/model-routing-composition.ts`;
  GraphQL `api/graphql/types/model-routing.ts`.
- Launch: `launch-preferences/launch-usability-check.ts` (new; U1–U5 + U3/U4b while routing is on),
  `agent-collaboration/collaborators/collaborator-launch-resolver.ts` (router layer), `collaborator-errors.ts`,
  `launch-configuration-notes.ts`, `collaborator-admission.ts`, `catalog-delegation.ts`, `routing-decision-draft.ts`.
- Task execution: `execution/task/new-copy-work.ts`, `root-task-execution-lifecycle.ts`, `root-task-dispatch.ts`,
  `task-execution-resource-port.ts` (`describeTask`), `projects/services/task-identity-reader.ts`.
- Remote: `execution/remote/remote-delegation.ts`, `remote-run-channel.ts`, `remote-refusal-codes.ts`;
  `remote-collaboration/` (client, gateway, requests, refusals, receiver, starters, `peer-started-run-decisions.ts`).
- Run config and confinement: `agent-execution/domain/agent-run-config.ts`, run metadata types/store,
  `standalone-agent-run-eligibility.ts`, Codex bootstrapper, `backends/claude/session/claude-workspace-confinement.ts`,
  `claude-session-query-options.ts`, `runtime-management/claude/client/claude-sdk-client.ts`.
- Built-in agent `built-in-agents/templates/model-router/`; tool `agent-tools/model-routing/`; the build's bootstrap
  smoke `autobyteus-server-ts/scripts/smoke-built-in-agents-bootstrap.mjs` now expects it (commit `0cdaa0d480`; the
  build failed without it).
- Run history and DTOs: shared records (`launches`), schema parsers, three DTO projections; contract packages
  `autobyteus-{collaboration,team}-stream-contracts`, `autobyteus-agent-presentation-contracts` (src + dist).

Web (`autobyteus-web/`): `components/settings/model-routing/` (page, status strip, segmented control, Setup, Decisions,
Overview; restyled Agent runtimes now), GraphQL and types, `localization/messages/{en,zh-CN}/{modelRoutingSettings,runSettings}.ts`,
run Settings rows (`runMemberTree.ts`, `delegatedLaunchRows.ts`, `RunMemberRow.vue`, `ExistingRunConfigEditor.vue`,
`existingRunConfigStore.ts`, `ExistingRunModelConfigDraft.ts`, `remoteRunsStore.ts`), e2e probe
`tests/e2e/model-routing-settings-probe.mjs` (adjusted to the tabbed page).

## Important Assumptions

Design gaps closed during implementation (none changes approved behavior; reviewers please confirm):

1. **Ad-hoc Task on a peer.** A's Task for a description-only delegation is created when the copy dispatches, after
   B's start; so `task.taskId` is nullable in the start request, and B groups such records per delegation
   (Decisions shows that group as its own Task group).
2. **B's `delegatingAgentName`** is null (B knows none of A's agents); `fromNode` names A. *(Changed in IR-002, CR-001:
   it was A's run ID.)* The local writer also writes null rather than a run ID if an address has no basename.
3. **U3 (signed out)** comes from the runtime report's stated signed-out set (`readWithSignIn().signedOutRuntimes`),
   never from a runtime's absence.
4. **`describeTask`** was added to the task execution resource port so the lifecycle reads the Task title and key for
   the work packet; `resolveAssignment` returns the title too.
5. **Record fields** `routerFailure` and `skipped` were added so Decisions can show a router failure and the skipped
   defaults without parsing note text. *(IR-002, SR-017: records no longer store `notes`; these are the only stored
   form. An older line's `notes` is ignored.)*
6. **Result notes** follow supplement § 7 (a line per routed agent and per skipped layer/failure), not VIS-018's
   listing of every agent.
7. **Status mapping on the page:** `REPORT_UNREADABLE` shows `problem.unknown`. *(IR-002, CR-002: `SIGNED_OUT` now has
   its own text, `problem.signedOut`: "<Runtime> is signed out. Sign in under Agent Runtimes." / zh-CN
   "<Runtime> 已退出登录。请在“智能体运行时”中登录。". New string not in the UI reference; Product should hear of it.)*
8. **View decision** always renders for a routed copy on this node (no existence check); the Decisions focus search
   loads at most 12 pages and then says it was not found.
9. **Remote rows:** an Agent root reads its remote copies from its own view/snapshot; a Team or Org root from
   `remoteRunsStore` (so only while that root is open). A link without `launches` (older) has no row.
10. The router's own `model_router` fallback layer (router not active / failed) shows as a note, not as a configured
    fallback row.

## Known Risks

- **Tool-call time-outs on Claude SDK, Antigravity and Grok** for a routed delegation of ~45 s are unverified (review
  point 4). If a runtime cuts earlier, that is a Design Impact for the Solution Designer.
- **Claude confinement against a user-level `Write` allow rule** relies on hooks being evaluated before allow rules
  (SDK documentation); unit-tested with the hook alone, not yet live.
- **Antigravity/Grok** routers are not confined (FU-005, accepted DEC-023).
- **Burst latency:** with one request at a time, a later request in a burst can wait past 40 s and fall back as
  "the Model Router was busy" (accepted trade-off, SR-016).
- `root-team-run.ts` sits at 499 non-empty lines (was 497 at base); the remote copy steps moved into
  `RemoteDelegation.delegate` to keep it under 500.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `Missing Invariant` + the local ordering defect (launch resolved before the work)
- Reviewed refactor decision: `Refactor Needed Now` (small): lifecycle split and `LaunchUsabilityCheck` extraction
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: `prepareNewCopyWork` + `dispatchNewCopy` replace `delegateToNewCopy`; the resolver's old `check`
  moved to `LaunchUsabilityCheck`; routing stays inside the root gate (FU-002).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (`delegateToNewCopy`, the resolver's `check`, the
  section's unused `ownNode`, the remote callbacks in three roots)
- Dead code found elsewhere, added to `follow-ups.md`: None. A pre-existing broken spec found in IR-002 is FU-006
  (`stores/__tests__/definitionMutationCache.spec.ts`, from autobyteus-308).
- Shared structures remain tight: `Yes` (launch source is a discriminated union; the router origin carries
  `choiceReason`/`taskKind` only on that variant)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Largest changed files (non-empty lines, base → now):
  `root-team-run.ts` 497 → 499, `existingRunConfigStore.ts` 494 → 495, `project-task-service.ts` 494,
  `general-process-run-supervisor.ts` 494 (its one changed line only), `root-task-execution-lifecycle.ts` 464.
- Notes: none of them crosses 500.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration` for run-history sources, remote links, run metadata
  (`toolConfinement`, `systemRunOwner`); new files for the decision log, the agent state file and the internal
  workspace; new settings keys.
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Follows the decision without migration or version-specific fallback: `Yes`
- Direct-use evidence: parsers treat absent fields as "not routed"/"none"
  (`parseOptionalRemoteLaunches`, launch-source parser, metadata `optionalMarker`); unit tests read records without
  the new fields; the decision log skips an unreadable line with a warning.
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- Rebuild `autobyteus-ts` (`pnpm -C autobyteus-ts build`) and run the server `prebuild` before server tests on a
  fresh worktree; web vitest needs `npx nuxt prepare` once.
- Contract package `dist/` folders are tracked and rebuilt; the application SDK `dist/` folders are untracked build
  output and are not committed.

## Checks Run

Code commits: `d384968700`, `930597c730`, `4979559f7f`, `0cdaa0d480` (build smoke fix; changes no source under
test); IR-002: `161d136c1b`, `03d9860e82`. IMP-01..08 ran on IR-001; IMP-09 and IMP-10 rerun the checks IR-002 affects.
IMP-07 and IMP-08 are not rerun: the page's only IR-002 change is the `SIGNED_OUT` text (covered by IMP-10's
presentation spec), and the Runtimes tab is unchanged. Evidence folder: `tickets/in-progress/delegated-runtime-model-routing/evidence/implementation/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `4979559f7f` | macOS 26.5.2, node v22.23.1 | all server source | — | Pass | `IMP-01-server-typecheck.log` | `typecheck exit=0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` | `4979559f7f` | same | full server unit + app-data migration suites | all server behavior | Pass | `IMP-02-server-unit.excerpt.log`, `IMP-02-server-unit.full.log` | `Test Files  844 passed \| 4 skipped (848)`, `Tests  7012 passed \| 7 skipped (7019)` |
| IMP-03 | `pnpm -C autobyteus-server-ts exec vitest run --reporter=verbose tests/unit/model-routing tests/unit/agent-collaboration/collaborators tests/unit/remote-collaboration tests/unit/agent-collaboration/root-task-execution-lifecycle.test.ts tests/unit/workspaces` | `4979559f7f` | same | model-routing subsystem, resolver, peer contract, lifecycle, internal workspaces | AC-001, 003, 004, 005, 006, 011; SR-016 cases; DS-001..004, 008 | Pass | `IMP-03-server-model-routing-focused.log` | `Tests  346 passed (346)`; the SR-016 cases `AC-006: three delegations at once…`, `a slow turn running past the budget…`, `a user message to the router during a routing…`, `a request that runs out of time while waiting is never sent…` |
| IMP-04 | `env -u RUN_CLAUDE_E2E -u RUN_CODEX_E2E pnpm -C autobyteus-server-ts exec vitest run` on 8 integration files (task delegation lifecycle, standalone root ×3, Codex bootstrapper, Claude backend factory, session manager, SDK client) | `4979559f7f` | same; live gates off | delegation lifecycle and roots; Codex/Claude backends' deterministic cases | DS-001; REQ-003 | Pass (live cases skipped) | `IMP-04-server-integration-collaboration.log` | `Tests  37 passed \| 25 skipped (62)` |
| IMP-05 | `(autobyteus-web) NUXT_TEST=true npx vitest run components/settings components/run-settings components/workspace/config utils/runSettings stores/__tests__/existingRunConfigStore stores/__tests__/remoteRunsStore localization` | `4979559f7f` | same | Model Routing page, run Settings rows, remote rows, localization | REQ-009, REQ-010; AC-009, AC-012 (rows) | Pass | `IMP-05-web-touched-specs.log` | `Test Files  90 passed (90)`, `Tests  505 passed (505)` |
| IMP-06 | `(autobyteus-web) pnpm run guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `4979559f7f` | same | web boundaries, en/zh-CN copy | REQ-010 | Pass | `IMP-06-web-guards.log` | `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-07 | `pnpm dev` (server `build:full` with its smoke, then the stack on the worktree's own `.autobyteus/development` data root, seeded with synthesized decision records by `IMP-07-gen-decisions.mjs`), then `IMP-07-render-script.mjs` in headless Chromium (fresh profile) at 1440×900 and 390×844 | `0cdaa0d480` | same | Model Routing page against the real GraphQL; build smoke | UIS-001..003; VIS-003, 006, 008, 010, 012, 013, 022, 026; UXJ-002, 004, 005 (focus) | Pass | `IMP-07-rendered/` (`IMP-07-dev-stack.log`, `IMP-07-rendered-checks.json`, `IMP-07-0*.png`) | `Built-in agents bootstrap smoke check passed.`; `"failures": []`, `browserErrors: []` in the JSON; 11 cases `ok: true` |
| IMP-08 | `(autobyteus-web) node tests/e2e/model-routing-settings-probe.mjs --skip-server-build --output-dir=<fresh>` (the 303 probe, adjusted to the tabbed page) | `0cdaa0d480` | same; two disposable nodes, scripted CLIs, no network | Runtimes tab (Agent runtimes now) | REQ-010 (Runtimes tab, 303 AC-010) | Pass | `IMP-08-model-routing-settings-probe/` | `Result: Pass`; 7 cases `Pass MRP-01`..`MRP-07`; `result.json` cleanup `tempRoot: removed`, `browserErrors: []` |

- Note on IMP-02: an earlier full run (on the working tree before `4979559f7f`) showed 22 failures in three remote
  delegation files because I changed `RemoteDelegation.delegate` while it ran; the rerun on the commit is the record.
| IMP-09 | `pnpm -C autobyteus-server-ts typecheck && pnpm -C autobyteus-server-ts test:unit` | `03d9860e82` | macOS 26.5.2, node v22.23.1 | all server source and unit suites | CR-001, SR-017 (records, log, receiver) | Pass | `IMP-09-server-typecheck-unit-ir002.log` | `typecheck exit=0`; `Test Files  844 passed \| 4 skipped (848)`, `Tests  7015 passed \| 7 skipped (7022)` |
| IMP-10 | `(autobyteus-web) NUXT_TEST=true npx vitest run components/settings components/run-settings components/workspace/config utils/runSettings stores localization`; the three web guards | `03d9860e82` | same | page, presentation, rows, stores, copy | CR-002, CR-001 (web types), SR-017 | Pass for every file this branch touches; 1 file fails that this branch does not touch (FU-006) | `IMP-10-web-specs-and-guards-ir002.log` | `Test Files  1 failed \| 194 passed (195)`; the failing file `stores/__tests__/definitionMutationCache.spec.ts` ("Unconfigured GraphQL fixture field: internal", see the note at the end); `guard:localization-boundary exit=0` |

- Not run, and why:
  - Live provider runs (`RUN_CLAUDE_E2E`, `RUN_CODEX_E2E`, live-agents suite): need test-vault keys and real runtime
    sessions; left to API/E2E with the 303 live-agents fold (below).
  - Live confinement on Codex and Claude, the ~45 s routed delegation per runtime, the Docker-peer contract: API/E2E.
  - The full server integration suite (`test:integration`): its prerequisites (application SDK/devkit/Brief Studio
    builds) are unrelated to this change; the related files ran in IMP-04.
  - The desktop app (isolated Electron build): the Done-when asks the user to verify it there.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Settings → Model Routing (Configuration, Decisions, Overview, Runtimes; switch and
  problem line; focus from "View decision"); run Settings "Delegated copies" rows (routed source, reason, View
  decision, remote rows).
- Approved references: UI/UX spec `ce3e417` (UIS-001..006, UXJ-001..005, VIS-001..026) and its visual references.
- Design system reviewed: the existing Settings page frame, `AgentRuntimesNowSection`, `RunMemberRow` and the
  run Settings section; the page's components were ported from the approved UI reference.
- Surface used: the development stack (`pnpm dev`, README "Local full-stack development") on the worktree's own data
  root with synthesized records; first in the built-in browser tab (532 px), then headless Chromium at 1440×900 and
  390×844 (IMP-07). Stack stopped and its data root removed afterwards.
- States inspected: Configuration off with no launch (Talk disabled); Decisions with history while off (the off
  note), all teams open (router failure note, Team default, Inherited from the run, skipped default with reason,
  "No Project Task" peer block without Open run), filter Model Router, focus from a View decision link (Task block
  highlighted, team open); Overview (sources bar, failure line, by task kind, details open); switch on with no
  router → problem line with "Go to Configuration", and back off; zh-CN; 390 px with no horizontal overflow. Compared
  side by side with VIS-006/008/010/012/013.
- Issues found and corrected: none in the page during this pass (earlier in implementation: the runtimes section's
  node line and card were restyled per the spec). Observation for Product: the not-set problem line begins in lower
  case ("choose a runtime and model for the router."), exactly as the spec's copy table and VIS-003 give it; kept.
- Not verified rendered: run Settings rows with routed and remote copies (need runs with routed copies; covered by
  `RunMemberRowModelRouting.spec.ts` and `delegatedLaunchRowsModelRouting.spec.ts`); "Talk to the router" and the
  Setup choice with a real router launch (would start a real runtime session); the Runtimes tab is checked by IMP-08.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001 end to end: PM delegates the SE Team with Model Routing on; SD keeps its usable default, others routed;
  result lines and run Settings rows show "Model Router · <kind>" with reasons; Decisions shows the Task group.
- AC-003: a default on a model blocked by a used-up limit is skipped with "blocked until …" (on) and used as today (off).
- AC-004: router answers an unusable model, then a valid one; and no valid answer in 40 s → delegating run's launch
  with "Model Router could not choose (no valid answer within 40 seconds)".
- AC-005 across nodes (Docker peer): on → B's router chooses and A shows B's launches as read-only rows with the node
  chip; off → refusal with B's Model Routing state.
- AC-006: three delegations at once → one routing request per router turn, in arrival order.
- AC-007: teach the router via "Talk to the router"; `knowledge.md` changes; the next request carries it.
- AC-008: with "Show internal agents" off, the router agent, its run and its workspace are hidden; "Talk to the
  router" still opens it.
- AC-012: reopen a run with routed and remote copies; rows unchanged; an older run unchanged.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- **Fold the 303 live-agents branch** `codex/available-agent-runtimes-live-agents` into this ticket's API/E2E
  coverage (do not delete the branch), extended with a routed delegation of ~45 s from an agent on each of Claude SDK,
  Antigravity and Grok that must complete as a tool result (review point 4).
- **Live confinement** (review points 2–3): on Claude, a confined router run cannot write outside its workspace even
  with a user-level `Write` allow rule and a workspace `.claude/settings.json` allowing it; shell tools absent. On
  Codex, writes outside the workspace (other than the temp roots) are refused, and a workspace `.codex/config.toml`
  asking for `danger-full-access` does not widen the sandbox.
- **Peer contract live** across a Docker peer (50 s start bound, `launches`, `modelRouting` refusal state,
  `MODEL_ROUTER_FAILED`).
- **Desktop app**: the Done-when needs the user to verify it in the desktop app (isolated worktree build).
- `tests/e2e/model-routing-settings-probe.mjs` was adjusted to the tabbed page (open the Runtimes tab; plain node
  name; zh tab label instead of the removed heading; remote node by the status strip's node chip); it passes all seven cases on `0cdaa0d480` (IMP-08).
- Real provider keys come only from the test vault (TESTING.md).
