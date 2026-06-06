# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/code-review-report.md`
- Current Validation Round: 11
- Trigger: code review round 16 passed the DI-001 local runtime-neutral notification fix and requested live API/E2E re-validation.
- Latest Authoritative Round: 11
- Result: PASS

## Round History

| Round | Trigger | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- |
| 1 | Code review round 3 pass; begin API/E2E validation | Pass | No | Added durable API/executable/frontend validation and ran focused server/web validation. Repository-resident validation was routed through code review. |
| 2 | User requested live browser validation | Pass for smoke scope | No | Verified local browser startup and visible Skill Self-Evolver launch, but did not prove the full loop. |
| 3 | User required real full-loop testing | Fail | No | Real loop changed the skill and next run improved, but `/tmp` vs `/private/tmp` path aliasing caused a false off-target policy violation and no notification. |
| 4 | Code review round 6 path-canonicalization fix | Pass | No | Re-ran full loop; record completed, alias issue gone, notification sent, next run answered updated skill. Later superseded by simplified MVP. |
| 5 | Code review round 8 simplified-MVP/redaction pass | Pass | No | Live simplified MVP loop passed. Later superseded by normal-user launch-path failure. |
| 6 | User screenshot/discoverability challenge | Fail | No | Visible agent run config did not expose self-evolution eligibility; routed as AE2E-022. |
| 7 | Code review round 9 AE2E-022 pass | Fail | No | UI-created eligible run existed but durable marker did not update; routed as local fix. |
| 8 | Code review round 11 CR-007 pass | Pass | No | UI-created eligible real loop passed: durable feedback, V2 skill update, redaction, notification, next-run V2. |
| 9 | Code review round 13 CR-008/CR-009 pass | Pass | No | Composer CTA/start-card history behavior passed for the then-approved direction. Superseded by round-7 UX direction. |
| 10 | Code review round 14 round-7 UX/notification pass | Pass, later superseded | No | Real browser loop validated the round-7 UX direction, but code-review round 15 then raised DI-001 against runtime-dependent active standalone notification emission. |
| 11 | Code review round 16 DI-001 pass | Pass | Yes | Real browser loop revalidated the current implementation: runtime-neutral local-event notification, composer-only `Self improve`, durable V2 update, next-run V2, and team/member identity. |

## Validation Basis

Round 11 validates the current approved behavior after DI-001, not the superseded row-action or persistent started-card behavior:

- Composer-only user-facing entrypoint with visible copy `Self improve` / `自我改进`; scope appears in tooltip/accessibility copy, not as a separate label.
- Hidden disabled/helper/temp/ineligible/pre-snapshot states; no technical backend reason text in chat UI.
- No run-history row self-evolution action.
- Successful start gives only transient neutral feedback; no green started card, evolution record id, or open-helper-run button in the composer area.
- Visible Skill Self-Evolver runs remain discoverable through normal history/sidebar surfaces.
- Standalone active-target notifications render through the shared `SystemTaskNotificationSegment` path using local `AgentRunEventType.SYSTEM_TASK_NOTIFICATION`, not runtime `postUserMessage` injection.
- Notification copy contains no raw skill paths, record ids, helper ids/details, implementation details, or runtime/model refresh instructions.
- Durable-marker update behavior and post-evolution next-run behavior still pass.
- Team/member start uses identity-only `teamRunId + memberRunId` targeting; active member notification remains MVP `next_run_only`.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce backward compatibility as a requirement: `No`
- Compatibility-only or legacy-retention behavior observed: `No`
- Durable validation added only for compatibility behavior: `No`
- Upstream reroute needed for compatibility scope: `No`

## Validation Surfaces / Modes

- Live backend built output with isolated runtime data root.
- Live Nuxt frontend bound to the isolated backend.
- Real browser UI operations: settings toggles, standalone run config, chat messages, composer CTA click, system-task notification observation, post-evolution run, team run config, and team member composer CTA click.
- Persisted server-state verification: run metadata, self-evolution records, helper traces, target raw trace absence proof for DI-001, team/member record, and Git diff of disposable skill root.
- Focused executable checks for the changed frontend CTA/streaming path and backend self-evolution notification/projector/strategy path.
- Evidence secret scan for the fake canary used in the redaction scenario.

## Platform / Runtime Targets

- Host: macOS/Darwin arm64.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility`.
- Branch: `codex/self-evolving-harness-feasibility`.
- Backend: `http://127.0.0.1:54860`.
- Frontend: `http://127.0.0.1:54861`.
- Isolated runtime root: `/tmp/autobyteus-self-evolution-round11-di001-e2e`.
- Runtime/model: `autobyteus` / `deepseek-v4-flash`, `thinking_type: disabled`.
- DeepSeek key handling: the requested main-repo `autobyteus-server-ts/.env` did not contain `DEEPSEEK_API_KEY`; I used the already-available process-environment key for the isolated server `.env`. No key value was printed or written to evidence.

## Lifecycle / Restart / Migration Checks

- Backend build passed before live startup.
- Backend started from `autobyteus-server-ts/dist/app.js` with a fresh isolated server data directory and disposable Git-backed skill package.
- Frontend started in Nuxt dev mode against the isolated backend.
- No production upgrade/deployment was in scope.

## Coverage Matrix

| Scenario ID | Requirement / Design Area | Mode | Round 11 Result | Evidence |
| --- | --- | --- | --- | --- |
| AE2E-001 | Global Settings capability disabled/enabled | Browser UI | Pass | `01-settings-self-evolution-disabled.png`, `02-settings-self-evolution-enabled.png` |
| AE2E-022 | Normal visible standalone run config exposes launch eligibility | Browser UI + metadata | Pass | `03-agent-run-config-self-evolution-toggle-visible-off.png`, `04-agent-run-config-self-evolution-toggle-on.png`, `ui-created-run-metadata.json` |
| AE2E-004 | UI-created source run snapshots `selfEvolution.enabled=true` | Metadata | Pass | `ui-created-run-metadata.json`, `round11-validation-summary.json` |
| AE2E-029 | Composer-only CTA visible as `Self improve` for eligible standalone run | Browser UI + DOM | Pass | `05-ui-created-run-first-answer-v1-and-self-improve-cta.png`, `cta-and-hidden-state-checks.json` |
| AE2E-026 | Run-history row self-evolution action absent | Browser DOM + focused tests | Pass | `cta-and-hidden-state-checks.json`, `focused-checks.log` |
| AE2E-030 | No persistent started card, evolution record id, or open-helper button | Browser UI + DOM | Pass | `06-system-task-notification-redacted-no-started-card.png`, `cta-and-hidden-state-checks.json` |
| AE2E-031 | Helper remains discoverable through normal history/sidebar only | Browser UI | Pass | `06-system-task-notification-redacted-no-started-card.png`, `cta-and-hidden-state-checks.json` |
| AE2E-032 | Active standalone target notification uses runtime-neutral local system-task event | Browser UI + record + trace absence proof | Pass | `06-system-task-notification-redacted-no-started-card.png`, `self-evolution-record.json`, `target-source-run-raw-trace-notification-absence.json` |
| AE2E-017 | Helper prompt privacy/redaction | Trace + secret scan | Pass | `helper-raw-traces.jsonl`, `evidence-secret-scan.json` |
| AE2E-019 | Durable skill update V1 -> V2 without copying fake canary | Helper trace + Git diff | Pass | `helper-raw-traces.jsonl`, `skill.diff`, `skill-after-self-improve.SKILL.md` |
| AE2E-016 | Full loop: eligible run -> CTA -> helper -> record -> notify -> next run improves | Browser + persisted state | Pass | `self-evolution-record.json`, `07-post-evolution-next-run-v2-ineligible-hidden.png`, `post-evolution-next-run.json` |
| AE2E-024 | Team/member launch uses `teamRunId + memberRunId` identity | Browser UI + record | Pass | `08-team-run-config-self-evolution-toggle-on.png`, `09-team-member-composer-cta-visible.png`, `team-member-self-evolution-record.json`, `team-member-cta-identity-check.json` |
| AE2E-033 | Hidden states show no technical backend reasons | Browser + focused executable test | Pass | Browser: global-disabled config, post-evolution ineligible run hidden/no reason, no started-card/open-helper UI; focused test covers disabled/helper/temp/pre-snapshot hidden behavior. See `cta-and-hidden-state-checks.json` and `focused-checks.log`. |

## Round 11 Live Browser Scenario

Disposable setup:

- Target skill: `calibration_marker_r11_di001_local_event`
- Target agent: `Calibration DI001 Agent r11_di001_local_event`
- Target team: `Calibration DI001 Team r11_di001_local_event`
- Target skill path: `/tmp/autobyteus-self-evolution-round11-di001-e2e/server-data/skills/calibration_marker_r11_di001_local_event/SKILL.md`
- Initial marker: `CALIBRATION_MARKER_R11_V1`
- Updated marker: `CALIBRATION_MARKER_R11_V2`

Key IDs:

- UI-created target source run: `calibration_di001_agent_r11_di001_local_event_disposable_target_agent_for_round_11_di_001_browser_self_evolution_validation_8416`
- Primary standalone evolution record: `b0b1efb0-c472-454d-8689-bc6eaa2e3cea`
- Visible standalone helper run: `skill_self_evolver_skill_improvement_coach_7390`
- Post-evolution UI-created next run: `calibration_di001_agent_r11_di001_local_event_disposable_target_agent_for_round_11_di_001_browser_self_evolution_validation_6903`
- Team run: `team_calibration-di001-team-r11-di001-local-e_fd743947`
- Team member run: `calibrator_f23d90ffc402d5ec`
- Team/member evolution record: `76573bc0-a93b-49d6-bc1d-5f4397754aad`

Observed sequence:

1. Enabled global Self-evolution in Settings.
2. Opened the normal standalone agent run configuration form from the Agents catalog and verified the `Self-evolution eligibility` toggle was visible and defaulted off.
3. Enabled launch eligibility and launched the target through the browser UI; metadata recorded `selfEvolutionEffective.enabled=true` and `sourceTrace=agent_run_launch`.
4. Sent the marker question through the chat UI; target answered `CALIBRATION_MARKER_R11_V1`.
5. Verified the composer CTA text was `Self improve`, tooltip was scoped to this run, and aria label was `Self improve this run`.
6. Verified no old row action/old labels, no open-helper button, no evolution record id, and no persistent started card appeared.
7. Sent a durable correction containing V2 plus a fake credential-like canary, then clicked `Self improve` once.
8. Verified the helper run became visible through normal history/sidebar surfaces.
9. Verified helper prompt contained durable feedback signals and V2, while the fake canary was redacted before the helper prompt and not copied into the skill.
10. Verified `SKILL.md` durable behavior changed to V2 and the follow-up UI-created normal run answered V2.
11. Verified the follow-up run launched with self-evolution eligibility off and the chat UI hid the CTA without backend technical reason text.
12. Verified the active standalone target notification rendered as `System Task Notification` with concise copy and no raw skill paths, record IDs, helper IDs/details, implementation terms, or runtime/model refresh instructions.
13. Verified DI-001 specifically: the target runtime raw trace contains only the two user turns and two assistant turns. It contains no notification copy, no `[System Notification]` prefix, and no `System Task Notification` message. Therefore the browser notification came from the local runtime-neutral event path, not runtime conversation injection.
14. Launched a team run through the visible team config with self-evolution eligibility enabled, verified member CTA text/copy, clicked it, and verified the record target was `team_member_run` with both `teamRunId` and `memberRunId` and MVP `next_run_only` notification status.

## Executable Checks Run In Round 11

Passed:

```bash
git diff --check
pnpm -C autobyteus-web test:nuxt --run \
  components/workspace/self-evolution/__tests__/SelfEvolutionComposerCta.spec.ts \
  services/agentStreaming/__tests__/AgentStreamingService.spec.ts \
  services/agentStreaming/__tests__/TeamStreamingService.spec.ts
pnpm -C autobyteus-server-ts exec vitest run \
  tests/self-evolution/self-evolution-target-notification-service.test.ts \
  tests/self-evolution/self-evolution-work-history-projector.test.ts \
  tests/self-evolution/single-agent-evolver-strategy.test.ts
pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit
```

Focused web result: 3 files / 47 tests passed. Focused server result: 3 files / 7 tests passed. Full web `nuxi typecheck` remains blocked by known unrelated project-wide issues documented by code review.

## Tests Implemented Or Updated

- Repository-resident durable validation added or updated by API/E2E in round 11: `No`.
- Temporary disposable setup existed only under `/tmp/autobyteus-self-evolution-round11-di001-e2e`.
- Browser screenshots, records, traces, diffs, and summaries were persisted under the evidence directory below.

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Paths added or updated by API/E2E: N/A
- Returned through `code_reviewer` for durable validation review: N/A

## Evidence Directory

Round 11 evidence directory:

`/Users/normy/autobyteus_org/autobyteus-worktrees/self-evolving-harness-feasibility/tickets/done/self-evolving-harness-feasibility/browser-e2e-evidence/round11-di001-local-event-20260606/`

Key files:

- `README.md`
- `round11-validation-summary.json`
- `cta-and-hidden-state-checks.json`
- `ui-created-run-metadata.json`
- `self-evolution-record.json`
- `target-source-run-raw-trace-notification-absence.json`
- `helper-raw-traces.jsonl`
- `helper-run-metadata.json`
- `skill.diff`
- `skill-after-self-improve.SKILL.md`
- `post-evolution-next-run.json`
- `post-evolution-run-metadata.json`
- `team-run-metadata.json`
- `team-member-self-evolution-record.json`
- `team-member-cta-identity-check.json`
- `evidence-secret-scan.json`
- `focused-checks.log`
- Screenshots `01` through `09` documenting settings, launch config, CTA, local-event notification segment, next-run behavior, and team/member behavior.

## Temporary Validation Methods / Scaffolding

- Temporary runtime root: `/tmp/autobyteus-self-evolution-round11-di001-e2e`.
- Disposable Git-backed skill/agent/team files were created under the isolated server data directory before backend startup.
- Browser interaction used in-app browser tools for navigation, DOM inspection, clicking, text entry, and screenshots.
- A fake credential-like canary was used only to validate prompt/skill redaction. It is absent from all persisted text evidence except the explicit scan field noting that the source runtime raw trace necessarily contains the user-typed source message.

## Dependencies Mocked Or Emulated

- None. The validation used live local backend/frontend processes, the real AutoByteus runtime, and the DeepSeek Flash model.
- Artificial data was limited to disposable test skill/agent/team definitions and the fake canary for redaction validation.

## Failures / Open Issues

- New failures found in round 11: `None`.
- Residual validation limitation: a true historical old/pre-snapshot run was not separately available in the fresh live runtime. Equivalent disabled/helper/temp/pre-snapshot no-technical-reason behavior is covered by focused `SelfEvolutionComposerCta.spec.ts`, and live browser checks covered global settings, normal ineligible post-evolution run, no old visible row action, and no started-card/open-helper UI.
- Known unrelated issue remains: full web `nuxi typecheck` is blocked by existing project-wide TypeScript issues outside this change.
- Product residual from design/code review remains: team active-member notification is MVP `next_run_only`; standalone active notifications are now live local UI events and are not persisted as durable notification history.

## Routing Decision

- API/E2E result: PASS.
- Repository-resident durable validation changed by API/E2E: No.
- Next owner: `delivery_engineer` for integrated-state refresh, docs/final handoff, and finalization.
