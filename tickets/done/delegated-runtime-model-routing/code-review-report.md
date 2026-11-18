# Code Review Report — autobyteus-32 (Model Router core, `delegated-runtime-model-routing`)

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 5, delivery re-entry); round 4 Full Re-Audit, round 3 failure-origin, rounds 1–2 implementation review
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-016, Approved), with `launch-selection-order.md` (SR-016, behavior-defining)
- Investigation Notes Reviewed As Context: via the design spec (A-01…A-33)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (to SR-016)
- Design Spec Reviewed As Context: `design-spec.md` (SR-016)
- Supplemental Task Artifacts Reviewed As Context: Product UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md` (revision `ce3e417`) and its UI reference sources; `follow-ups.md` (FU-001…FU-005)
- Relevant Solution Revision IDs: `SR-015`…`SR-018`
- Design Review Report Reviewed As Context: `design-review-report.md` (incl. Residual Risks)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`…`ARCH-REV-004`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`…`IR-004`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006`
- Current Review Round: `5`
- Review Scope: `Targeted Delta Review` (round 4: Full Re-Audit)
- Round-5 scope evidence: `git diff e2e4f1a1ab f48af0176a` changes 4 web files (+15/−8), each inside delivery's DEL-F1/DEL-F2 (`release-deployment-report.md`; delivery docs `e2e4f1a1ab`, after delivery's merge of `origin/personal` `50e93c2108` as `357936966c`). No server change, no spine or interface change; round-4 evidence carries forward.
- Round-5 trigger: implementation handoff IR-004 (delivery Local Fix DEL-F1 blocking, DEL-F2 minor); code `f48af0176a`, docs `7541be3e6d`
- Round-4 scope evidence: `git diff 64e5b57932 424e9bdd62` (18 files, +177/−226) removes this ticket's own shared-interface additions: `AgentRunConfig.toolConfinement`, `CreateAgentRunInput.toolConfinement`, the metadata marker and type. It deletes `claude-workspace-confinement.ts`, and it changes `ModelRouterAgent` and `ModelRouter` (CR-005). Because shared interfaces change, every structural check was rerun.
  - `codex-thread-bootstrapper.ts`, `agent-run-config.ts`, `claude-session-query-options.ts`, `claude-sdk-client.ts` and its unit test are byte-identical to base `d74f75a51a`.
  - No reference to `toolConfinement`, `AgentRunToolConfinement` or the confinement module remains in server, tests or web.
  - Round-1 evidence carries forward for every area the delta does not touch.
- Round-4 trigger: implementation handoff IR-003 (SR-018 with ARCH-REV-004 Pass; CRR-003 CR-005); code `424e9bdd62`, docs `289209272f`
- Review Scope Evidence (round >1): `git diff 0cdaa0d480 03d9860e82` changes 17 files (+124/−42). Every source change is in CR-001's and CR-002's files or in the decision record those findings and C-03 concern: SR-017 drops `notes`, and `delegatingAgentName` becomes nullable, on server and web. No spine node, ownership boundary or other interface changed, so the round-1 evidence for every other check carries forward.
- Trigger: implementation handoff IR-002 (CR-001, CR-002; SR-017 from C-03)
- Prior Review Round Reviewed: `1` (CRR-001, Fail)
- Latest Authoritative Round: `5`
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing`, branch `codex/delegated-runtime-model-routing`; round 1 `git diff d74f75a51a 0cdaa0d480` (170 files; the contract packages' tracked `dist/` matches their `src` changes); round 2 `git diff 0cdaa0d480 03d9860e82` (`161d136c1b`, `03d9860e82`)
- Scorecard bar: clean pass `>= 9.2` in every category, a single `/10` scale (current template).

- Failure-origin context (round 3):
  - API/E2E round 1: `API-REV-001`, Fail, confidence 81%.
  - Code tested: `03d9860e82` plus the 303 live-agents fold (`bd8948ef14`, `33da12b821`, `75ca9c82ff`); evidence and tests at `64e5b57932`.
  - Coverage documents: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`.
  - Testing guideline: `TESTING.md` (Rule 9: every failure has its cause; FU-007…009 were reproduced on base).
  - Failing scenarios: F-1 (L-02, AC-011/QR-004), F-2 (L-01, AC-011), F-3 (MR-09; API-13 first run).
  - Evidence: `evidence/api-e2e/L-02-codex-router-confinement.json`, `L-02-codex-confinement-probe.mjs.txt`, `L-01-claude-router-confinement.json`, `MR-01-09-model-routing-e2e-final.log`, `API-13-docker-peer.json`, `API-09-regression-e2e.log`.

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. New subsystem, persisted stores, a changed peer contract, and a confined, auto-approved system-owned run, as the design says.

## Review Scope

- Changed implementation and behavior reviewed:
  - `model-routing` (router, request queue, the agent, sessions, request text, decision log, statistics, settings, bindings, composition);
  - the decision tool and its MCP adapter; GraphQL;
  - `LaunchUsabilityCheck` and the resolver's router layer; the lifecycle split and decision recording in dispatch;
  - the three roots; the remote delegation on A, and the receiver, gateway, client, refusals and peer-started decisions on B;
  - run-config confinement (metadata, restore, eligibility, Codex sandbox, the Claude setting sources, disallowed tools and `PreToolUse` hook);
  - internal workspaces; the built-in template;
  - the 303 report's sign-in reading;
  - the web page (status mapping, Decisions, Overview, Setup), run Settings rows, remote rows; docs.
- Files / areas reviewed: all changed source files; tests proportionately (names and coverage of AC-001, 003, 004, 006, 011 and the SR-016 cases).
- Explicit exclusions: live confinement, the ~45 s routed delegation per runtime, the Docker peer, the 303 live-agents fold, and the desktop check (API/E2E and the user); IMP checks not rerun (code unchanged since they ran).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: REQ-001…REQ-012 and REQ-014 (REQ-013 moved out); the supplement's §§ 2–7 (usability U1–U5 with U3/U4b only while Model Routing is on; the order; §3.2 runtime-only defaults; the router being active; the agent; refusals; what is shown); SR-016 (one request at a time).
- Design-spec behavior map verified against the implementation: Yes (DS-001…DS-008).
- Design review report and round confirmed: ARCH-REV-003 Pass. Its residual notes on SR-016 "idle", on B recording when the work packet arrives, and on Codex temp roots are all implemented.
- Behavior-basis status: `Confirmed`

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Root gate → `prepareNewCopyWork` (`new-copy-work.ts`) → `resolveDelegationPlacement(…, work.delegation)` → `CollaboratorLaunchResolver.resolve` (`collaborator-launch-resolver.ts:100-216`): `openDelegation` (report read while on) → `LaunchUsabilityCheck` → one `routing.route` for uncovered agents → inherited fallback with note / refusal → `dispatchNewCopy` → `dispatchTaskCopy` → records after `markStarted` (`root-task-dispatch.ts:82-86`) | — |
| BEH-002 | Confirmed | A: `RemoteDelegation.delegate` → `startDelegatedRun(work)` (50 s) → link `launches` → notes. B: receiver → resolver (`defaults_only`) → `MODEL_ROUTER_FAILED` / `modelRouting` refusal state → answer `launches` → `PeerStartedRunDecisions.hold` → `workArrived` on the work packet | — |
| BEH-003 | Confirmed | `LaunchUsabilityCheck`: U3 from `readWithSignIn().signedOutRuntimes`, U4b from `reportedModel(...).blocked`, only with facts (routing on) | — |
| BEH-004 | Confirmed | `launch-configuration-notes.ts`; web `RunMemberRow.vue` (source, task kind, reason, View decision, node chip), `delegatedLaunchRows.ts`, `remoteRunsStore.executionsDelegatedBy` | — |
| BEH-005 | Confirmed | GraphQL `model-routing.ts` → router status, log, statistics, settings, `openModelRouterAgent`; web page per UI spec; internal workspaces filtered in `listVisibleWorkspaces` | CR-002: the `SIGNED_OUT` status shows the wrong reason |
| BEH-007 | Confirmed | Model Routing off: `openDelegation` → null → no report read, no U3/U4b, no router, no records; today's order | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001; AC-001 | System | Delegating agent | Hand a Task to a local copy | `delegate_task` | Normal | DS-001 | Uncovered agents routed; notes | requirements SCN-001 | Supported Normal Scenario | Use |
| SCN-002 | REQ-006; AC-004 | System | Delegating agent | Same; the router fails | `delegate_task` | Explicit Edge | DS-003 failure → inherited + note | Visible fallback | requirements SCN-002 | Supported Explicit Edge Scenario | Use |
| SCN-003/004 | BEH-002; AC-005 | Contract | Agent on A | Delegate to peer B | `delegate_task` with `node` | Normal / Edge | DS-002 | B routes, or refuses clearly | requirements SCN-003/004 | Supported | Use |
| SCN-005 | BEH-003; AC-003 | System | Delegating agent | A default cannot run now | Any fresh copy, routing on | Explicit Edge | U3/U4b → next layer | Note "signed out" / "blocked until …" | supplement § 2 | Supported Explicit Edge Scenario | Use |
| SCN-006 | REQ-004; AC-006 | System | Several delegations at once | Each gets its choices | Concurrent `delegate_task`s | Explicit Edge | `RoutingRequestQueue` | One request per turn; a waiting one that runs out is "busy" | SR-016 (user) | Supported Explicit Edge Scenario | Use |
| SCN-007 | BEH-005; AC-007…009 | User | User | Set up, teach, watch | Model Routing page; Talk to the router | Normal | DS-005, DS-007 | Status, decisions, statistics; the agent run | requirements SCN-007 | Supported Normal Scenario | Use |
| SCN-008 | REQ-003; AC-011 | System | The Model Router agent's turn | Work only in its workspace | Router run on Codex / Claude | Normal | Run config → Codex sandbox / Claude options | Confined | REQ-003, QR-004 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | B stores A's delegating **run ID** in `delegatingAgentName` of peer-started decision records (handoff decision 2) | Principle 15 (a stored name carries one meaning); design D8 (B records "the delegating node's name") | SCN-003: any delegation from a peer while B's Model Routing is on | `remote-delegation-receiver.ts:85` → `PeerStartedRunDecisions` → `decisions_active.jsonl` → `listTaskGroups` → GraphQL → web `RoutingDecisionDelegation.delegatingAgentName` | The field's other writer stores an agent name (`root-task-dispatch.ts:117`); the web uses it as the delegator name in the Open-run title (`ModelRoutingDecisions.vue:41,69`). Today that button is hidden for peer records, but the persisted value means something else under the same name, and REQ-013's outcome Task will read these records | Promote | This ticket | CR-001 |
| C-02 | The page maps `SIGNED_OUT` to "{runtime} is not available on this node." (handoff decision 7) | Supplement § 4 ("Page shows the reason"); UI spec line 174 (reasons translated by code) | SCN-007: the router is set to a runtime that signs out (an expired login) | `ModelRouter.status()` → `SIGNED_OUT` → `routerProblem` (`modelRoutingPresentation.ts:56-57`) → problem line | The server's own text says "Codex is signed out" (`model-router.ts:54`); the page tells the user the runtime is missing, so the user would reinstall instead of signing in. The UI reference has no signed-out copy (it only has `runtime_missing`) | Promote | This ticket | CR-002 |
| C-03 | Decision records store rendered `notes` plus the structured `skipped`, `routerFailure` and `choiceReason` for the same facts; the page reads only the structured fields (handoff decision 5) | Principle 11 (one representation per fact); design § Shared Structure (record shape lists `notes[]`) | — | Two persisted representations of one fact | `routing-decision-draft.ts:23-27`; web reads `skipped`/`routerFailure` only (`ModelRoutingDecisions.vue:93,214`) | Reject as a code finding | — | The record shape is the design's (it specifies `notes[]`); sent to the Solution Designer as design feedback |
| C-04 | `RoutingRequestQueue` stays "in flight" until the carrying turn's lifecycle reports an end; a turn that never reports one would block every later request | SCN-006 | — | — | `AgentRun` input admission always settles: terminal facts per turn, `cancelled` on root shutdown, `failed` on terminated delivery (`agent-run-input-admission-state.ts:385-415`); an existing command coordinator relies on the same facts | Reject | — | Established platform contract |
| C-05 | A router run that cannot take input (backend inactive) makes every routing wait and fall back "busy" | SCN-002, SR-012 point 4 (failed router turns are expected) | A router turn that fails (provider, usage or CLI error) | `agy-agent-run-backend.ts` → inactive; `ensureRun` reuses it; `isIdle()` false forever | MR-09; API-13 first run | **Reclassified round 3: Promote** (round 1 rejected it as process death) | This ticket | CR-005, Local Fix |
| C-06 | Remote link `launches` keyed by agent address instead of a `launch` per member (handoff point 3) | Design § Interface Boundary Mapping | — | One list serves Agent and Team links | `remote-delegation.ts:164-178`; `peer-client.ts:77-89` (strict) | Reject (confirmed) | — | One representation; a clean cut on both nodes |
| C-07 | `RemoteDelegation.delegate(input, context, copies)` drives prepare → dispatch through the lifecycle port (handoff point 4) | Principle 13 | — | — | `RemoteCopySteps` is an explicit port; the old form passed a callback | Reject (confirmed) | — | Coherent owner of the remote sequence |
| C-08 | `startedLaunches` keeps an entry when the dispatch fails after a peer start | — | Rare dispatch failure after the start | A small map entry | `remote-delegation.ts:124,105` | Reject | — | Negligible; same pattern as the existing `startedTeams` |
| C-09 | Every routing request reads the whole decision log for `taskKindsInUse` | DESIGN.md rule 3 | — | Grows with history | `routing-statistics.ts:93-97` | Reject | — | No measured cost at expected volumes; nothing to optimize speculatively (DESIGN.md rule 1) |
| C-10 | Codex merges `[sandbox_workspace_write] writable_roots` from workspace or user config into the router's thread | AC-011, QR-004 | The router writes its workspace `.codex/config.toml`; or the user's config | Sandbox widened; a write outside the workspace succeeds (L-02) | L-02 | Promote (round 3) | This ticket | CR-003, Design Impact |
| C-11 | The confined Claude session loads claude.ai and user MCP connectors and `Skill` | AC-011 | Any Claude router run of a user with claude.ai connectors or skills | Tools beyond the template; account-side actions (L-01) | L-01 | Promote (round 3) | This ticket | CR-004, Design Impact |

## Round 5 — Delivery Re-Entry (DEL-F1, DEL-F2)

- **DEL-F1.** The merged base's web mirror of the server's built-in agent IDs (DI-002, `utils/agents/builtInAgentDefinitionIds.ts`) now lists `MODEL_ROUTER_AGENT_DEFINITION_ID = 'autobyteus-model-router'`, matching `built-in-agent-registry.ts`. The DI-002 contract spec passes.
  - The set's only web reader is the New chat `@` eligibility (`draftMentionEligibility.ts:49`), so the one effect is that the router is never offered there. That matches the server, which excludes built-in agents from collaboration.
  - It does not hide the router from Agents or history while "Show internal agents" is on (AC-008 is unaffected).
  - `draftMentionEligibility.spec.ts` lists the router and asserts that it is never offered.
- **DEL-F2.** Three hints and the Configuration panel's aria-label (`setup.title`) now say "Configuration" / "配置", matching the tab (`tabs.setup` = "Configuration") and the problem line's "Go to Configuration". No user-visible "Setup" remains. The remaining "设置" in zh-CN belongs to "默认设置" (default settings), a different word.
- **Checks.** IMP-12: 34 files / 137 tests and the three web guards pass. IMP-13: the full web suite's failures are outside this branch. Four fail on the clean base (delivery DEL-03; FU-006), and `pages/__tests__/memory.spec.ts` passes alone. Its cause under load is still owed per TESTING.md Rule 9 (delivery's triage).
- **Non-blocking note.** The internal identifiers still say setup (message keys `settings.modelRouting.setup.*` / `tabs.setup`, component `ModelRoutingSetup.vue`) while the product word is Configuration (Principle 15). Optional cleanup, not required for this round.

## Round 4 — Delta Verification (SR-018, CR-005)

- **Approved basis.** SR-018 is the user's own decision (requirements SR-018: REQ-003 "not confined", AC-011 reworded, QR-004 "no workspace confinement … accepted by the user"; ARCH-REV-004 Pass). The router's run uses its runtime's normal auto-approved setup. `systemRunOwner` and its eligibility rule (AR-001), the internal workspace and its listing rule, and one request at a time are kept.
- **Clean cut.** The confinement option and every backend change are removed, with no unused option left (Principle 8).
- **Persisted data.** `toolConfinement` was written only by this unreleased branch's builds. `normalizeMetadata` builds the metadata from known fields, so an extra field in such a file is ignored (Directly Usable).
- **CR-005.**
  - `ensureOnce` reuses the stored run through `resolveCommandReadyAgentRun` (`model-router-agent.ts:104-112`): the live run, or a restore of a stopped or crashed one (`standalone-agent-run-lifecycle-service.ts:89-95`). A failed restore is logged and a new run is created (DS-003 "restore → ok: use | otherwise: create").
  - `isIdle()` (`:94-97`) is free when no input waits and the runtime has stopped or the status is not `running`/`initializing`.
  - The queue's `send` calls `ensureRun` again (`model-router.ts:174-183`), so a run that stopped while a request waited is restored before posting. A start failure there fails that session and frees the queue.
  - `route` still ensures the run first, so a run that cannot start fails fast with "the Model Router agent could not start (…)". No new status code (the Solution Designer agrees; one would need approved UI text).
  - Tests: `model-router-agent.test.ts` (a stopped run is free and restored with no new run; error status free, queued input not) and `model-router.test.ts` (the real `ModelRouterAgent`: a failed turn stops its runtime; the next routing is restored and answered in under 2 s, not "busy").
- **AC-011 (reworded).** `model-router-tools.test.ts` checks the template list, no collaboration tools on any runtime, and AR-001 surviving a restore.
- **Checks.** IMP-11 on `424e9bdd62`: typecheck clean; server unit suite 844 files / 7015 tests. No web file changed. MR-09 is the live check for API/E2E.

## API/E2E Failure-Origin Review (Round 3)

Each failing scenario represents approved behavior:
- AC-011 requires that a Codex write outside the workspace is refused, even with a workspace `.codex/config.toml` asking for full access (design § Guidance: "if not, Design Impact back to the Solution Designer").
- AC-011 also requires that the router's tools equal its template list plus its runtime's file tools.
- SR-012 point 4 expects failed router turns; the routings after one must work.

### F-1 — Codex: a workspace (or user) `config.toml` widens the router's sandbox → `Design Impact` (Solution Designer), CR-003

- **Path confirmed.** The thread start passes only the mode: `sandbox: resolveEffectiveCodexSandboxModeForRunConfig(…)` (`codex-thread-bootstrapper.ts:176-186,317`). Codex merges `[sandbox_workspace_write] writable_roots` from the config files it loads. Live L-02: with the file present at Codex start, the thread's `sandbox_policy` was `{"type":"workspace-write","writable_roots":["/"]}` and a write to HOME succeeded. The controls were refused.
- **Reachability.** The router has write access to its own workspace, including `.codex/config.toml`, and the file takes effect at the next Codex start. The user's own `~/.codex/config.toml` widens it the same way.
- **Origin.** The design's premise, "thread parameters take precedence over Codex config files", holds for the mode but not for `writable_roots`. The design named this outcome a Design Impact.
- **Decisions needed** (the mechanism must be verified live):
  - Pin the whole sandbox policy at thread start, e.g. a policy object or config overrides naming `writable_roots` (only the workspace) and network access.
  - Or keep project and user config away from the router's Codex process.
  - And decide whether a user's `~/.codex/config.toml` may widen it.
- **Review gap: yes.** ARCH-REV-003 asked implementation to confirm that thread parameters win for anything that widens; neither implementation nor my round 1 checked `[sandbox_workspace_write]`. This needed a live check, which is why the design scheduled one.

### F-2 — Claude: the confined router session loads the user's claude.ai connectors and the `Skill` tool → `Design Impact` (Solution Designer), CR-004

- **Path confirmed.** The confined options are `settingSources: ["user"]`, `extraDisallowedTools: Bash/BashOutput/KillShell` and the write hook (`claude-session-query-options.ts:41-60`). `tools` stays `CLAUDE_BUILT_IN_TOOLS_ENABLED_BY_AUTOBYTEUS`, which includes `Skill` (`claude-sdk-client.ts:93-95`). There is no strict MCP setting.
- **Live L-01.** The session init lists `Skill` (the user's skills) and `mcp__claude_ai_Claude_Docs__{batch,create,delete,…}` (source `claudeai`). These tools can create and delete documents in the user's account, outside the workspace.
- **What holds.** Confinement itself works: there is no shell tool; the hook denied the `$TMPDIR`, HOME and symlink-escape writes; the workspace `.claude/settings.json` was not loaded.
- **Origin.** The design enumerates the Claude confinement as setting sources `["user"]`, no shell tools and the write hook. That cannot meet AC-011's exact tool set, because user-level and claude.ai MCP servers, and `Skill`, come through anyway.
- **Recommended for the revision** (verify live):
  - strict MCP configuration (only the Agent Tools MCP server);
  - disabling claude.ai connectors for the router's process;
  - `Skill` left out of the confined session's tools.
- **Review gap: yes, mine.** Round 1 recorded "user-level MCP servers stay loaded under setting sources `["user"]`" as an accepted residual risk, against AC-011's explicit tool-set equality.

### F-3 — a failed router turn leaves the router unusable, and every later routing is "busy" → implementation defect (`Local Fix`), CR-005

- **C-05 reclassified.** It is a **Supported Explicit Edge Scenario**: SR-012 point 4 and SCN-002 expect failed router turns (a provider or usage error, a CLI error), and later routings must work. Round 1 rejected it as process death; that was wrong.
- **Path confirmed.**
  - A turn that fails with a CLI error ends with the Antigravity backend inactive (`agy-agent-run-backend.ts:154-158,168-189`: `active = false`). The `AgentRun` stays registered.
  - `ModelRouterAgent.ensureRun` returns `getAgentRun(stored.runId)` whatever its state (`model-router-agent.ts:96-99`).
  - `isIdle()` requires `run.isActive()` (`:86-88`), so the queue never sends again.
  - Each routing waits its 40 s and falls back as "busy", while `modelRoutingStatus` still says `active: true`.
  - MR-09: about 40 250 ms per routing after the throw, including after a router-launch round trip. The first Docker run (API-13) showed the same.
- **Why the crash mode recovered.** That path ends differently (the next routings were about 8.5 s). The platform's own restore path for a stopped or crashed run is `resolveCommandReadyAgentRun`, which activates it (`standalone-agent-run-lifecycle-service.ts:89-95`). `ModelRouterAgent` does not use it.
- **Required.**
  - `ModelRouterAgent` treats a registered run that is not active as one to restore, through the command-ready restore path, before posting.
  - The queue must not stall on such a run.
  - Add a test with a turn that fails with an error; MR-09 is the live check.
  - Optional: `modelRoutingStatus` stops saying "active" while the agent's run cannot take input.
- **Review gap: yes, mine.** The inactive-after-failure path was readable in the backend.

### Other items

- **FU-007…FU-009** (API/E2E): confirmed out of scope. FU-007 fails at the same two lines on base `d74f75a51a` (`API-09-regression-e2e.log:107-117`); FU-008 and FU-009 are recorded with their base runs.
- **EXC-E2E-004** fails only under load and passes alone. Per TESTING.md Rule 9 it still needs its cause; API/E2E owns that.
- **Updated older two-server cases.** The twelve cases changed for the clean-cut peer contract (`task`, `launches`, the refusal routing state, the 50 s bound) follow the approved contract. They are not stale; they go to the later test review.

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Lifecycle split and `LaunchUsabilityCheck` extraction done; `delegateToNewCopy` and the resolver's `check` removed | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Supplement and UI spec followed; `SIGNED_OUT` has its own text (CR-002 resolved) | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-008 traced in code | — |
| Ownership boundary preservation and clarity | Pass | Only the resolver calls `route`; only `ModelRouter` opens sessions and posts; only the tool settles; only `ModelRouterAgent` creates the run and sets `systemRunOwner` | — |
| Off-spine concern clarity | Pass | Request text, decision-log IO, confinement builder | — |
| Existing capability/subsystem reuse check | Pass | 303 report (+ `readWithSignIn`), 308 internal agents, message-log pattern, skill-notice posting, settings modules | — |
| Reusable owned structures check | Pass | `reportedModel`, `blockedDetail`, `formatBlockTime` shared by usability check, router and sessions | — |
| Shared-structure/data-model tightness check | Pass | Launch source discriminated by origin; one remote `launches` list; one form per fact in decision records (SR-017: no stored `notes`) | — |
| Repeated coordination ownership check | Pass | One usability rule; one routing owner | — |
| Empty indirection check | Pass | — | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | `agent-collaboration` → `model-routing` through ports and bindings; `model-routing` never → `agent-collaboration` | — |
| Authoritative Boundary Rule check | Pass | Tool and GraphQL go through `findModelRouting()` owners; the resolver uses `ModelRouterPort` only | — |
| File placement check | Pass | Per the design's file mapping | — |
| Flat-vs-over-split layout judgment | Pass | `model-routing/{domain,services,stores}` | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `ModelRouterPort.openDelegation → route`; the tool's sender check; GraphQL arguments validated | — |
| Naming quality and one vocabulary | Pass | `delegatingAgentName` is a name or null (CR-001 resolved); "Model Router agent", never "conversation" | — |
| No unjustified duplication of code | Pass | — | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in the touched files and modules | Pass | `delegateToNewCopy`, the resolver's `check`, `ownNode`, the roots' remote callbacks removed | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | AC-001/003/004/006/011 and the SR-016 cases named in IMP-03 | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | — | — |
| No stale, duplicated, or compatibility-only tests are retained | Pass | The 303 probe adjusted to the tabbed page | — |
| API/E2E readiness for the next workflow stage | Pass | Not-run list and live checks are concrete (confinement, 45 s per runtime, Docker peer, live-agents fold, desktop) | — |

## Source File Size And Structure Audit

| Source File | Before (base `d74f75a51a`) | After | `>500` Check | `>220` Delta Check | SoC / Ownership | Placement | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-team-execution/domain/root-team-run.ts` | 497 | 499 | Pass (under 500) | Pass | Pass (remote steps moved to `RemoteDelegation`) | Pass | — | — |
| `autobyteus-web/stores/existingRunConfigStore.ts` | 494 | 495 | Pass | Pass | Pass | Pass | — | — |
| `agent-execution/runtime/general-process-run-supervisor.ts` | 493 | 494 | Pass | Pass | Pass | Pass | — | — |
| `projects/services/project-task-service.ts` | 492 | 494 | Pass | Pass | Pass | Pass | — | — |
| `agent-collaboration/collaborators/collaborator-launch-resolver.ts` | — | 289 raw lines | Pass | +243/−189 | Pass | Pass | — | — |

All other changed source files are under 470 non-empty lines. Four files sit at 494–499 (pressure noted, no action required now).

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The peer contract is a clean cut (`launches` required, `task` required); DESIGN.md rule 9 |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | — |
| Approved persisted-data transition decision is followed | Pass | `Directly Usable — No Migration`: optional `toolConfinement`/`systemRunOwner` (strict known values), tolerant launch-source and link readers; new files |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | A link without `launches` shows no remote row (by design) |
| Approved transition mechanics match the reviewed design | Pass | N/A |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (done): `collaboration_model.md` CM-12, `GLOSSARY.md`, `docs/modules/model_routing.md` (new, incl. the Codex temp roots), module README, `autobyteus-web/docs/settings.md`.

## Additional Material Premise Validation

None new. ARCH-REV-003's residual notes are confirmed implemented: idle read from the run's own state; a budget-ended request whose turn still runs keeps the run busy; a user message counts as input; B records when the packet arrives; Codex temp roots documented.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Score calculation note: the simple average of the ten categories; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001…DS-008 readable; one routing owner; the queue is the only release point | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.4 | Single creators and settlers; ports keep `agent-collaboration` free of `model-routing` internals | Process-wide bindings (`findModelRouting`, `PROCESS_MODEL_ROUTING`) follow the existing pattern | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Explicit identities (`requestId`, address, run ID); strict peer answer parsing | — | — |
| 4 | Separation of Concerns and File Placement | 9.4 | New subsystem laid out like its neighbours; files under 500 | Four files near 500 | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.4 | Discriminated launch source; one `launches` list; decision records hold one form per fact (SR-017; round 1: 9.2) | — | — |
| 6 | Naming Quality and Local Readability | 9.4 | One vocabulary; `delegatingAgentName` keeps one meaning (null on B) (CR-001 resolved; round 1: 9.0) | — | — |
| 7 | API/E2E Readiness | 9.4 | Concrete not-run list and live checks | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 (round 4; round 3 had revised it below 9.2 for CR-003…CR-005, now resolved) | Order, §3.2, refusals, budget/queue semantics and confinement match; turn-end and termination settle; each status code has its own text (CR-002 resolved; round 1: 9.1) | Live checks pending (API/E2E) | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cuts; removed old paths | — | — |
| 10 | Cleanup Completeness | 9.4 | No dead code left in the touched files | — | — |

## Findings

No open findings. Status of the round-3 findings (see `code-review-revision-record.md`, CRR-004):

- **CR-003** (Codex sandbox widened by `config.toml`) and **CR-004** (Claude tools beyond the template): resolved by the requirement change SR-018. The user withdrew router confinement, so AC-011 no longer requires a confined sandbox or an exact Claude tool set. The confinement code is removed as a clean cut. Live: API/E2E runs normal tests only, with no escape probes (user).
- **CR-005** (a failed turn leaves routing "busy"): resolved in `424e9bdd62` (§ Round 4). MR-09 reruns live.
- CR-001 and CR-002 were resolved in round 2.

## Implementation Decisions (handoff § Important Assumptions) — Review Answers

| # | Decision | Answer |
| --- | --- | --- |
| 1 | Ad-hoc Task on a peer: `task.taskId` nullable; B groups per delegation | Confirmed (`taskGroupKey`) |
| 2 | B's `delegatingAgentName` = A's run ID | Not confirmed → CR-001, resolved: null on B (round 2) |
| 3 | U3 from the report's stated signed-out set | Confirmed (`readWithSignIn`) |
| 4 | `describeTask` on the resource port; title from `resolveAssignment` | Confirmed |
| 5 | Record fields `routerFailure`, `skipped` | Confirmed; `notes` dropped by SR-017 (round 2) |
| 6 | Result notes per supplement § 7 | Confirmed (the supplement is behavior-defining) |
| 7 | `SIGNED_OUT` → runtime-missing wording; `REPORT_UNREADABLE` → `problem.unknown` | `SIGNED_OUT` → CR-002, resolved with its own text (round 2); `REPORT_UNREADABLE` confirmed |
| 8 | View decision without an existence check; focus search up to 12 pages | Confirmed |
| 9 | Remote rows: Agent root from its view; Team/Org root from `remoteRunsStore` | Confirmed (reopening the run populates the store) |
| 10 | The router's own fallback layer shows as a note | Confirmed |
| — | Review point 3: link `launches` list | Confirmed (C-06) |
| — | Review point 4: `RemoteDelegation.delegate(input, context, copies)` | Confirmed (C-07) |

## Follow-ups

- Follow-ups this review added: None. FU-006 (from implementation: `definitionMutationCache.spec.ts` fixture lacks `internal`, a regression from autobyteus-308 `813f7208d2` in the base; this branch does not touch the file) is confirmed out of scope.

## Classification

N/A (Pass).

## Recommended Recipient

- API/E2E Engineer, `/software_engineering_team/api_e2e_engineer` (implementation review passes); informational notice to the Implementation Engineer. Reruns: MR-09, live routing per runtime, AC-007, the tool exposure (AC-011 as reworded), API-14 and API-15.

## Residual Risks

- C-05: if the Model Router agent's backend process dies, its run reports `offline` and every routing falls back with "the Model Router was busy" until the run is replaced. Worth one API/E2E observation (stop the router's CLI process and route).
- Tool-call time-outs on Claude SDK, Antigravity and Grok for a ~45 s routed delegation (Design Impact escape, design § SR-012 point 1).
- SR-018: the router runs unconfined with auto-approve and reads web pages, like any auto-approved agent (RSK-006, accepted by the user). On Claude it also has the user's own connectors and skills.
- RSK-003 (routing inside the root gate), RSK-004…008, FU-002…FU-005 as recorded.
- The Done-when needs the user's own check in the desktop app.
- The `SIGNED_OUT` page text is new to the UI reference (CR-002); delivery tells Product.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 5, Targeted Delta Review, delivery re-entry)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10; every category ≥ 9.3 (bar 9.2); unchanged from round 4
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer` (an implementation-owned fix returns through API/E2E)
- Notes: DEL-F1 and DEL-F2 are resolved. The user's desktop check (Done-when) and the beta follow delivery.
