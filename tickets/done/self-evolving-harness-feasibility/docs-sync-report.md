# Docs Sync Report — Self-Evolving Harness Feasibility

## Scope

- Ticket: `self-evolving-harness-feasibility`
- Trigger: delivery resumed after code review round 16 and API/E2E round 11 passed the DI-001 runtime-neutral notification implementation.
- Bootstrap base reference: `origin/personal` recorded by upstream handoff; initial reviewed candidate was based on `1678dc82b705d24c58b073c75f363d96b5d4cc3c`.
- Integrated base reference used for docs sync: `origin/personal` at `00631e7a091f3202eb31fd7b03161a24b8730ccd`; fetched on 2026-06-06 and unchanged since the round-8 delivery resume merge (`5cb43ea35dd91ddf0f6cc655ff51c5cb0ea648d0`).
- Post-integration verification reference: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/delivery-integrated-checks-20260604.log`.

## Why Docs Were Updated / Rechecked

- Summary: The latest validated behavior is a disabled-by-default, manual-only self-evolution MVP. Users enable the global capability in Settings, mark new standalone/team/member launches eligible through visible run-config controls, and start self-evolution from the concise composer-adjacent **Self improve** CTA for an eligible active run/member. Run-history rows intentionally do not expose self-evolution actions. Ineligible, old, pre-snapshot, global-disabled, helper, and temp contexts hide the chat CTA by default. After start, the UI shows at most transient neutral feedback; it does not render a persistent started card, evolution record id, or open-helper button. The separate Skill Self-Evolver helper remains visible through normal history/sidebar surfaces. Active standalone target notifications now render through a runtime-neutral local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` event and `SystemTaskNotificationSegment`, not runtime `postUserMessage` injection. Team/member self-evolution remains member-scoped via `teamRunId + memberRunId`, with active-member notification as MVP `next_run_only`.
- Why this should live in long-lived project docs: self-evolution changes operator settings, run-launch ownership, workspace action placement, helper-run discoverability, target notification rendering, team/member identity rules, runtime-neutral notification ownership, and MVP safety limitations. Future maintainers must not restore definition-owned config, stale row actions, persistent started-card/open-helper UI, runtime-injected UI notifications, or benefit/audit claims that were removed from the approved MVP.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/self_evolution.md` | Canonical backend module contract for capability gate, run snapshots, target identity, helper lifecycle, target notification, and MVP limitations. | Updated / current | Documents `Self improve`, hidden ineligible/pre-snapshot CTA behavior, no persistent card/open-helper UI, and local runtime-neutral `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` requirements. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Canonical frontend runtime/workspace behavior and streaming event rendering. | Updated / current | Records composer-only `Self improve`, hidden states, no started-card/open-helper UI, and local-event `SYSTEM_TASK_NOTIFICATION` rendering through `SystemTaskNotificationSegment`. |
| `autobyteus-web/docs/settings.md` | Operator-facing capability toggle and launch eligibility behavior. | Updated / current | Clarifies global gate, launch controls, hidden CTA states, no row actions, no persistent start card, and runtime-neutral system-task notification rendering. |
| `autobyteus-web/docs/agent_management.md` | Agent definition/runtime ownership boundary. | Reviewed / current | Existing note that self-evolution is excluded from persisted agent definitions remains accurate. |
| `autobyteus-web/docs/agent_teams.md` | Team launch/member override and active member targeting behavior. | Updated / current | Member-scoped composer CTA identity remains documented and aligned with round11 team/member evidence. |
| `autobyteus-web/docs/skills.md` | Skill-file edit scope and user inspection/rollback expectations. | Updated / current | Clarifies `Self improve`, hidden ineligible/pre-snapshot CTA behavior, runtime-neutral system-task notifications, and manual Git-backed skill inspection. |
| Earlier server overview/index docs | Server docs navigation/overview updated during the prior delivery pass. | No change in round 11 | Existing navigation remains accurate. |

## Docs Updated / Reconciled

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/self_evolution.md` | Behavior contract | Records concise **Self improve**, no run-history action, hidden ineligible/pre-snapshot CTA, no persistent card/record/open-helper UI, local runtime-neutral `AgentRunEventType.SYSTEM_TASK_NOTIFICATION`, no `SenderType.SYSTEM` runtime message for UI rendering, and MVP limits. | Align backend docs with DI-001 resolution and round11 browser/API evidence. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Frontend architecture | Records local event -> websocket `SYSTEM_TASK_NOTIFICATION` -> shared segment handler -> `SystemTaskNotificationSegment`; separates UI notification from runtime/model instruction. | Prevent future UI work from relying on runtime conversation injection for notifications. |
| `autobyteus-web/docs/settings.md` | Operator docs | Clarifies launch controls, hidden CTA states, no persistent composer card/open-helper, and runtime-neutral notification rendering. | Users/operators need accurate expectations for the final validated UX. |
| `autobyteus-web/docs/agent_teams.md` | Team docs | Preserves member-scoped CTA target contract (`teamRunId + memberRunId`) and selected-member source-run boundary, with active-member notification next-run-only. | Round11 revalidated team/member identity under the DI-001-resolved UX. |
| `autobyteus-web/docs/skills.md` | Skill-management docs | Clarifies `Self improve`, hidden state rules, runtime-neutral system-task notifications, minimal provenance, and manual Git-backed skill inspection. | Self-evolution directly edits skill packages, so rollback/inspection expectations belong in skill docs. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Global gate and run-owned snapshots | `ENABLE_SELF_EVOLUTION` is disabled by default; eligibility is stored on run/member launch metadata, not definitions. | `design-spec.md`, `api-e2e-validation-report.md` | Server self-evolution, Settings, Agent Management, Agent Execution Architecture |
| Visible launch eligibility controls | Standalone launches expose **Self-evolution eligibility** default-off; team launches expose default/member controls only when the global gate is enabled. | `api-e2e-validation-report.md`, round11 evidence | Settings, Agent Execution Architecture, Agent Teams |
| Composer-only manual start | The only user-facing manual start entrypoint is concise **Self improve** near the active composer; scope lives in tooltip/aria copy. Run-history rows intentionally do not expose the action. | `code-review-report.md`, `browser-e2e-evidence/round11-di001-local-event-20260606/` | Agent Execution Architecture, Settings, Skills, Server self-evolution |
| Hidden states | Global-disabled, helper/temp, ineligible/no-technical-reason, and old/pre-snapshot contexts hide the chat CTA rather than exposing backend technical reasons. | `cta-and-hidden-state-checks.json`, `SelfEvolutionComposerCta.spec.ts` | Agent Execution Architecture, Settings, Skills |
| No persistent started UI | Manual start may show a transient toast/status only; no persistent started card, evolution record id, or open-helper button is rendered in the composer. Helper discoverability uses normal history/sidebar surfaces. | `round11-validation-summary.json`, screenshots 06/07 | Agent Execution Architecture, Settings, Server self-evolution |
| Runtime-neutral notification path | Active standalone target completion copy renders via local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` -> websocket `SYSTEM_TASK_NOTIFICATION` -> `SystemTaskNotificationSegment`; runtime raw traces must not contain injected notification copy. | `target-source-run-raw-trace-notification-absence.json`, `self-evolution-record.json`, screenshot 06 | Agent Execution Architecture, Server self-evolution, Settings, Skills |
| Team/member target identity | Member CTA starts `team_member_run` with both `teamRunId` and `memberRunId`; source ids contain the selected member run id only; active member notification remains next-run-only. | `team-member-self-evolution-record.json`, `team-member-cta-identity-check.json` | Agent Teams, Server self-evolution |
| Skill edit and evidence safety | Helper receives anonymized evidence, explicit durable-update signals, exact editable skill roots, and should edit configured skill packages only. | `helper-raw-traces.jsonl`, `skill.diff`, `evidence-secret-scan.json` | Skills, Server self-evolution |
| MVP limitations | No scheduled/signal trigger, no evolver-team execution, no changed-path audit service, no policy-violation report, no benefit metrics/reporting query; team-member live reload is next-run-only; standalone UI notifications are live local events, not persisted notification history. | `design-spec.md`, `api-e2e-validation-report.md` | Server self-evolution, Skills, Release Notes |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Run-history row self-evolution action/localization | Composer-adjacent **Self improve** CTA with backend lazy eligibility. | Agent Execution Architecture, Settings, Skills |
| Round9 persistent started card / record id / open-helper button | Transient toast/status only; helper remains discoverable through normal history/sidebar. | Agent Execution Architecture, Settings, Server self-evolution |
| Technical backend ineligibility reasons in chat | Hidden CTA for ineligible/no-technical-reason/old/pre-snapshot states. | Agent Execution Architecture, Settings, Skills |
| Runtime-posted `SenderType.SYSTEM` message as UI notification source | Local runtime-neutral `AgentRunEventType.SYSTEM_TASK_NOTIFICATION` emitted by the server target-notification service. | Agent Execution Architecture, Server self-evolution, Settings, Skills |
| Whole-team or stale-row targeting for team evolution | Selected active member target identity (`teamRunId + memberRunId`). | Agent Teams, Server self-evolution |
| Definition-owned self-evolution defaults | Run-launch overrides and `selfEvolutionEffective` metadata snapshots. | Agent Management, Agent Teams, Server self-evolution |
| Metrics/benefit and changed-path/policy-audit reports in MVP | Minimal provenance record plus user/manual Git review. | Server self-evolution, Skills, Release Notes |

## Coordination / Hold Resolution

- Round9 coordination artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/api-e2e-round9-post-handoff-coordination-note-20260605.md` — resolved by later architecture/code/API-E2E work.
- AE2E-022 hold artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/delivery-hold-ae2e-022-20260605.md` — resolved by visible run-launch eligibility controls.
- DI-001 hold artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/delivery-hold-di-001-20260606.md` — resolved by code review round 16 and API/E2E round 11; retained as historical context.

## No-Impact Decision

- Docs impact: `Updated / current`
- Rationale: N/A.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs are synchronized to API/E2E round 11 and code review round 16. Repository finalization, ticket archival, push/merge, public release/notarization, deployment, and cleanup remain held until explicit user verification/completion.

## Blocked Or Escalated Follow-Up

- Classification: N/A
- Recommended recipient: N/A
- Why docs could not be finalized truthfully: N/A
