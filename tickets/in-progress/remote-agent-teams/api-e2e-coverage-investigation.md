# API/E2E Coverage Investigation — autobyteus-247 (Remote Agent Teams)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams/tickets/in-progress/remote-agent-teams`

## Investigation Meta

- Requirements Doc: `…/requirements-doc.md` (AC-301 … AC-306)
- Investigation Notes: `…/investigation-notes.md`; validation of the approach: `…/validation-cases.md` (C-01 … C-35, G-1 … G-9)
- Solution Revision Record: `…/solution-revision-record.md` (SR-006)
- Design Spec: `…/design-spec.md` (SR-006)
- Design Review Report: `…/design-review-report.md` (ARCH-REV-002, Pass)
- Implementation Handoff: `…/implementation-handoff.md` (IR-001)
- Code Review Report: `…/code-review-report.md` (CRR-001, Pass, no findings)
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: CRR-001 pass of IR-001 (code `13131733b9`, documents `824562b6a2`), Large / High
- Prior Investigation Reviewed: none for this ticket (the E2E file comes from autobyteus-191 and autobyteus-245)
- Latest Authoritative Investigation: this document, round 1

## Current Requirement And Design Basis

- **Start.** A registered peer starts a Team run of any shared Agent Team of B by its catalog address (REQ-301).
  - Each member uses its own default, else the Team default. Not covered: `NO_DEFAULT_RUNTIME` "…target agent team <name>…"; unusable: the reason (REQ-302).
  - The Team works in B's temp workspace, and every member auto-approves (REQ-303).
  - The `delegate_task` result is the local Team-copy shape plus `node` (REQ-304).
- **Messaging.** The delegator and any member message each other by run ID; a never-started member starts on its first input. The team run ID gets the coordinator guidance (REQ-305).
- **Lifecycle.** A peer-started Team shuts down quietly after the idle grace and is restored by the next message; links survive restarts (REQ-306).
- **On B.** It is an ordinary Team run in history (REQ-307).
- **Task closure.** It fences the remote Team, and a saved Task to it is refused (REQ-308).
- **Contract (clean cut).** Every `POST /rest/remote/messages` body carries `targetRoot {kind, runId}`, and `coordinatingRun` is gone from messages. The delegated-runs answer is kinded.
- **Preserved.** Slice 1, autobyteus-245 and local Team copies (AC-306).

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-301 … SCN-30x (AC-301 … AC-305).
- Real-use scenarios added:
  - RU-1: the delegator is a member of a Team root on A, which already holds a remote Agent link. This gives mixed link kinds in one tree, and another member of that root is "not permitted".
  - RU-2: the owner of B stops the peer-started Team run during its idle grace period; the delegator's next message restores it (handoff hint; C-27).
  - RU-3: the delegating Team's run view on A stays open while remote Team messages flow (CR-001, slice 1).
- Contrived: none.

## Changed Surface And Boundary Classification

| Surface | Affected? | Changed Boundary | Repository Evidence | Material Risk Not Exercised | Mode |
| --- | --- | --- | --- | --- | --- |
| Backend roots, links, receivers, Team starter, idle shutdown | Yes | B's Team run creation, A's Team link, kinded endpoints, quiet idle shutdown | IMP-02 … IMP-04 (in-process A→B Team flow, unit) | two processes, real CLI processes, real restarts | Two-server E2E |
| Contract | Yes | `targetRoot`, kinded answer | unit | the real HTTP bodies both ways | E2E + capture audit |
| Persisted data | Yes (new optional fields) | Team link on A; `delegatedFrom` on B's Team tree | unit round trips | real files, restarts, package admission | E2E file checks |
| Web | Yes (text) | the Nodes tab note | IMP-05, IMP-06 | — | Reuse |
| Browser / B's Team views | Yes (existing views) | B's run history of a peer-started Team | — | rendered Team run on B | Browser journey (BEH-305) |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams`, branch `codex/remote-agent-teams`
- Testing guideline: `/TESTING.md` (as in 191/245)
- New fixture needs:
  - a second AGY model on B (`AGY_FAKE_EXTRA_MODELS=alt-model` in beta's environment; the scripted CLI lists it), so that a member's own default and the Team default are distinguishable;
  - Team definitions with `defaultLaunchConfig` through GraphQL (as in `delegated-launch-config-defaults.e2e.test.ts`).

## Existing Durable Coverage Inventory

| Path / Test | Intent | Validity | Action |
| --- | --- | --- | --- |
| two-server E2E RC-04 `/review_squad` → `REMOTE_TEAMS_NOT_SUPPORTED` | 245's interim refusal | Stale / Remove (REQ-301 removes the refusal) | Replace with AC-302's Team refusals; the happy Team flow is the new RC-21 |
| two-server E2E inbound helper bodies and forged messages (`coordinatingRun` in messages) | slice 1 contract | Needs Update | `targetRoot` (clean cut) |
| RC-20 key lists | slice 1 contract | Needs Update | `targetRoot` on every message kind; no `coordinatingRun` |
| all other slice 1 / 245 cases | AC-306 | Still Valid | run |
| unit and in-process tests | IMP-02 … IMP-04 | Still Valid | Reuse |

## Planned Cases

`API-NN` is the E2E case `RC-NN`.

| Case ID | Criteria | Boundary | Kind | Steps |
| --- | --- | --- | --- | --- |
| API-00 | all | build | Existing | `pnpm -C autobyteus-server-ts build` |
| API-R1 | AC-306 (unit), all | unit | Reused | IMP-01 … IMP-05 |
| API-01 … API-20 | AC-306 (slice 1, 245) | as before | Durable (bodies updated) | RC-01 … RC-20; RC-04 swaps `/review_squad` for `/hollow_team` (`NO_DEFAULT_RUNTIME` "…target agent team Hollow Team…") and `/codex_team` (a Team default on unavailable Codex → `AGENT_CANNOT_RUN`, FU-002 wording). Nothing appears in beta's `agent_teams` either. |
| API-21 | AC-301, RU-1, RU-3 | delegation of a Team | Durable (new) | The Team lead of alpha's "Remote Squad" delegates `/studio_team` with the Team view open. Check: the result shape; the Team link on alpha (exact keys); the Task record; beta's tree with `delegatedFrom`, each member's runtime/model (own default vs the Team default), temp workspace and auto-approve; only the coordinator launched; its first message names the delegator and node; beta's history lists the Team run |
| API-22 | AC-303 | messages | Durable (new) | Coordinator ↔ delegator; delegator → the never-started member (it launches) and its reply. Each message is once in both logs (alpha: the Team log; beta: the Team log). Team run ID → `TARGET_IS_TEAM_RUN` guidance; the other member of alpha's Team → not permitted; another root on alpha → live-only. The Team view sequence stays contiguous |
| API-23 | AC-305 | Task closure | Durable (new) | Alpha's standalone delegator delegates a second Team. A saved Project Task, given to it (`target_team_run_id` + `task_id`) or to a new remote Team (`node` + `/studio_team` + `task_id`), is refused; nothing starts and the Task stays TODO. After DONE, messages both ways are refused with the closed-Task reason; beta's coordinator keeps running; the DONE result says nothing about stopping |
| API-12 (extended) | AC-304 (idle) | lifecycle | Durable | The Studio Team's members idle out (CLI processes gone); the delegator's follow-up restores the Team and the coordinator receives (`--conversation`) |
| API-13 (extended) | AC-304 (restarts) | lifecycle | Durable | After beta restarts, a follow-up restores beta's Team. After alpha restarts, the coordinator's reply restores alpha's Team root and wakes the lead. The Team link and the back-link are unchanged on disk |
| API-24 | REQ-307, RU-2 | lifecycle | Durable (new) | Beta's owner stops the Team run during its idle grace (`terminateAgentTeamRun`): success, processes gone, history `isActive: false`. The delegator's next message restores it |
| API-25 | AC-306 | same-node suites | Existing | `tests/e2e/projects`, `run-history`, `agent-team-runs`, `agent-org-runs`, switch on (local Team copies included) |
| API-26 | REQ-307 (BEH-305) | browser on beta | Journey | Two built nodes, a remote Team delegation (temporary setup script), Nuxt dev against beta: the Team run in history, open it (coordinator's work packet), a message to it, stop |

- Test progress log: `Yes`

## Not Tested / Deferred

| Behavior | Reason | User Only? |
| --- | --- | --- |
| `fenced_remote` as a value | logged at info only (my nodes log WARN); covered by unit tests; the E2E asserts its effects (API-23) | No |
| A not-quiet member (a running background task) holding the idle shutdown | the scripted runtime can model it (`BACKGROUND_STEP`); it adds about 3 minutes. Decision: run it in API-12 only if the base cases pass in time | No |

## Ambiguities Or Reroute Triggers

None at planning time. The known wording residuals FU-002 and FU-003 are asserted as implemented (not defects).

## Investigation Decision

- Proceed: `Yes`; durable coverage changed: `Yes`; reroute: `No`
