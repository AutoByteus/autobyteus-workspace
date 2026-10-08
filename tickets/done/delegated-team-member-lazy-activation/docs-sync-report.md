# Docs Sync Report

## Scope

- Ticket: `delegated-team-member-lazy-activation`
- Trigger: `/software_engineering_team/code_reviewer` CRR-004 Pass (API/E2E test-code review), package validated on API-REV-002, HEAD `520c53dc7`
- Classification (unchanged): `task_size=Small`, `architectural_risk=High`, reviewed route
- Bootstrap base reference: `origin/personal` `ace86bf1f`
- Integrated base reference used for docs sync: `origin/personal` `f93ad1fc5`, merged into the ticket branch as `3a3731636` (after checkpoint `30cc6f129`)
- Post-integration verification reference: `release-deployment-report.md` → "Initial Delivery Integration Refresh"; logs in `delivery-evidence/dr1-*.log`

## Why Docs Were Updated

- Summary: Delegated Team copies (task Teams) no longer start every member at delegation. Flat Team preparation is now always scope-only; the `prepareConfiguredAgents` option and the eager preparation path were removed. A member start failure on its first input is reported through one shared step (`startForInput`) with one sender-facing code, `AGENT_RUN_ACTIVATION_FAILED`, and the cause in the message.
- Why this should live in long-lived project docs: `agent_team_execution.md` named the removed `prepareConfiguredAgents` option and implied task Teams were an exception to lazy activation. The start-failure contract, with each audience getting exactly one outcome, is a cross-root behavior that future work on Team, Org and collaborator delivery must preserve.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Named the removed `prepareConfiguredAgents`; owns the Team lifecycle and the `delegate_task` contract | Updated | Root And Agent Lifecycle section and delegation result paragraph |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Describes task Teams in Org roots | Updated | One sentence plus a link to the canonical section |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Describes hosting of collaborator Teams and copies | No change | Says nothing about task-Team member activation; "(members prepared lazily)" for collaborator Teams is still true |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `send_message_to` delivery and collaborator start | No change | "The first message starts it" stays true; no rejection-code text to correct |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | "Member activation remains lazy" | No change | Still true; now also true for task Teams |
| `autobyteus-web/docs/*` | Member status rendering | No change | Frontend unchanged (DS-004); not-started members use the existing gray Offline |
| `TESTING.md` | DTL suite entry (added by implementation/API-E2E) | Updated | Test review N-3 wording: with `RUN_CLAUDE_E2E=1` the whole suite runs under the real `HOME` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Correction + new contract | Replaced the `prepareConfiguredAgents: false` paragraph: flat Team preparation is always scope-only, for every Team kind including delegated copies (root-hosted and Team-hosted). Added: a copy starts only its coordinator via the seed; the other members stay with no run, no provider session, a `null` saved binding and Offline; coordinator start failure fails `delegate_task`; copies delegated earlier restore lazily with no migration. Added the member start-failure contract (sender code, error status, one conversation error card, closed-input case, live-run rethrow). In the delegation section, a cross-reference saying only the coordinator starts. | Removed option; new approved behavior (REQ-001..005) and SR-003/SR-004 contract |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Cross-reference | Delegated Team copy starts only its coordinator; links the canonical section | Org docs describe task Teams |
| `TESTING.md` | Wording | DTL suite: the whole suite, not only the Claude case, uses the real `HOME` when `RUN_CLAUDE_E2E=1` | Test review N-3; matches the suite's `HOME` setup (line 41) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Team scope admission is not member activation | No Team kind starts members at preparation, and there is no option to do so | `design-spec.md` (Task Design Health, Removal Plan) | `agent_team_execution.md` → Root And Agent Lifecycle |
| Late binding of task-Team members | Never-started members save `platformAgentRunId: null`; the binding is adopted into the tree when they start; old eagerly bound copies restore lazily with no migration | `design-spec.md` (Persisted Data decision) | same |
| Member start-failure contract | One step for both input entry points; sender gets `AGENT_RUN_ACTIVATION_FAILED` with `<code>: <message>`; status `error`; one `readiness_failure` → `ERROR` card; closed input is `AGENT_RUN_NOT_ACCEPTING_INPUT` with no card | `design-spec.md` SR-003 DS-005, SR-004 | same |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `prepareConfiguredAgents` option (flat-Team and task-Team factories, all call sites) | Always scope-only flat Team preparation | `agent_team_execution.md` Root And Agent Lifecycle |
| `FlatTeamExecutionManager.prepareConfiguredActivation`, `prepare-flat-team-configured-activation.ts`, staged-binding fields on `PreparedFlatTeamExecution` | Members activate on first input through `ConfiguredAgentExecutionHandle.ensureReady` | same |
| Per-entry-point readiness handling in `postMessage` (and IR-002's copy in `reserveInput`), `readinessFailureCode()` | `ConfiguredAgentExecutionHandle.startForInput()` and one cause formatter | same (start-failure contract) |
| Underlying activation code as the operation result `code` (e.g. `COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING`) | `AGENT_RUN_ACTIVATION_FAILED`, with the underlying code in the message | same |

## No-Impact Decision

Not applicable: docs were updated.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and user verification hold (AC-007 desktop check)
- Notes: Docs reflect the integrated state `3a3731636`. In that state, the base's `AGENT_RUN_PREVIOUS_RUNTIME_RELEASE_PENDING` (interrupt-resend ticket) passes through the same contract for Team members. No doc text contradicts it: `agent_execution.md` documents that error for standalone runs.
