# Implementation Handoff — autobyteus-646 Runtime fallback on a usage limit

## Upstream Artifact Package

All paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/usage-limit-fallback-646/tickets/in-progress/usage-limit-fallback-646`.

- **Requirements:** `requirements-doc.md` (REQ-006 updated by SR-007).
- **Investigation:** `investigation-notes.md`.
- **Design:** `design-spec.md`.
  - SR-004 Revisions R-1 … R-16. R-11/R-12/R-14 (SR-009) and R-15/R-16 (SR-010) supersede R-1 step 2, R-3's map and C-4's detector read.
  - R-6 (the router template) is pending the founder.
- **Solution history:** `solution-revision-record.md`, SR-001 … SR-010.
- **Review:** `design-review-report.md` (ARCH-REV-005 Pass on SR-010, at the 9/10 bar) and `architecture-review-revision-record.md`.
  - The reviewer's latest edits are uncommitted and were deliberately not committed by me.
- **Follow-ups:** `follow-ups.md` (FU-646-01, FU-646-02).
- **Worktree and branch:** `/Users/normy/autobyteus_org/autobyteus-worktrees/usage-limit-fallback-646`, branch `codex/usage-limit-fallback-646`, base `bc4351cad7`.

## Current Implementation Summary

**Implementation Complete**, ready for independent source review.

- **Detection and events.**
  - A run's usage-limit failure becomes one `usage_limit_reached` event on the new run event hub (C-1, JSONL log, listeners by kind).
  - Each runtime's backend classifies its own errors:
    - Codex: `error_kind` on its `ERROR`s;
    - Antigravity, Grok (ACP) and Claude: `ERROR_CLASSIFIED` after a limits read.
  - The detector is runtime-agnostic.
- **Exhaustion.** The exhaustion view (C-3) is derived from the events.
- **The switch.**
  - The switch listener chooses where the run continues: the Model Router through a switch request and `submit_runtime_switch` (C-7), else this agent's history (C-8).
  - The run's root switches it with its own operation (R-11): checks from the run's own state (R-12), a quiet stop, the commit with the pending switch and cause, the root's own follow (R-15), and the continue notice (R-10).
  - Every outcome is recorded (C-2).
- **Delegation.** Exhaustion is checked on every layer's launch, and the history layer (`agent_history`, R-2/R-8) is used when a layer was skipped as exhausted.
- **Setting.** `AUTOBYTEUS_USAGE_LIMIT_SWITCH_ENABLED`, with its web toggle.
- **Retention.** 31 days for run events, 90 days for switch records (R-14).

- **Commits (on top of base):**
  - `37faa888f3` hub, detector, exhaustion, cause;
  - `1f8ff3cd03` roots' switch;
  - `af4e885c4c` chooser, router request, listener, delegation;
  - `ffa2041c20` tests, web, docs;
  - `58da06f7e2` R-10 notice input, E2E;
  - `434d5489d5` SR-009/SR-010;
  - plus the final commit with this handoff (tests, E2E, docs).
- **Implementation cycle:** IR-001 (cumulative; `implementation-revision-record.md`).
- **Implementation questions** raised and answered by the Solution Designer:
  - IQ-001 → SR-005 (cause);
  - IQ-002 → SR-006 (`agent_history`);
  - IQ-003 → SR-007 (continue notice row);
  - IQ-004 → SR-008 (`present_as_notice`).

## Routing Classification

- `task_size`: **Large**; `architectural_risk`: **High** (from the design; unchanged).
- Route: code review (`/code_reviewer`).
- No new design impact is open.

## Behavior Implementation Trace

| Behavior | Path / key files | Evidence |
| --- | --- | --- |
| REQ-001, REQ-009, C-1, C-4, R-13, R-16 detect and publish | backend classification: `backends/codex/events/codex-error-kind.ts`, `backends/shared/late-usage-limit-classification.ts` (AGY, ACP, Claude backends) → `run-events/detectors/usage-limit-detector.ts` → `run-events/run-event-hub.ts`, `run-event-log.ts` | unit: detector, late classification, Codex converter; E2E UL-01 (three Codex errors → one event), UL-08 (AGY `ERROR_CLASSIFIED`) |
| REQ-002, C-3 exhaustion | `run-events/listeners/runtime-exhaustion-view.ts`, `launch-preferences/launch-fallback-ports.ts` | unit; UL-06 |
| REQ-003, R-2, R-8 delegation | `launch-preferences/launch-usability-check.ts` (exhaustion on every launch), `collaborator-launch-resolver.ts` (history layer), origin `agent_history` (server, contracts DTO, web) | unit `collaborator-launch-resolver-exhaustion`; UL-06 note "(chosen from its history)" |
| REQ-004, C-7, C-8 choice | `model-routing/services/fallback-chooser.ts`, `model-router.ts` `requestSwitch`, `model-routing-sessions.ts` `submitSwitch`, `agent-tools/model-routing/submit-runtime-switch-*`, `run-history/services/agent-launch-history.ts` | unit; UL-03 (router gets "Switch request sw_…", history decides) |
| REQ-005, R-11, R-12, R-15 Agent root switch | `agent-execution/services/standalone-automatic-runtime-switch.ts` (own checks/texts, `commitRunRuntimeSwitch`), lifecycle `checkAutomaticRuntimeSwitch`/`switchRuntimeAutomatically`, `standalone-agent-run-root.ts` `switchAgentRuntime` | unit (root, automatic switch); UL-01, UL-02; ULP-01 (peer-started run switches on its node, alpha shows the new launch) |
| REQ-005, R-11 Team member switch | `team-member-runtime-switch.ts`, `team-member-runtime-switch-committer.ts` (only that member, `applySelectionToConfiguredMember`) | unit (incl. restart and `already_switched`); UL-04 (live switch, then restart, answers on AutoByteus) |
| REQ-006, R-7, R-9, R-10 what is shown | marker from `pendingRuntimeSwitch.cause` (`runtime-switch.ts`); continue input with `present_as_notice` (autobyteus-ts `present-as-notice-metadata.ts`, native `memory-ingest-input-processor.ts`, server accumulator), notice published on forwarding | unit (native and accumulator memory, listener); UL-01 rows: marker, notice, no user row; hand-over in the continue turn's own message |
| REQ-007 no fallback | listener `noFallbackText`, sender `system.usage_limit` | unit; UL-05 |
| REQ-008 no loops | R-12 state guard in each root; detector once per (run, turn) | unit; UL-01 |
| C-2, R-14 records and retention | `model-routing/stores/switch-record-log.ts`, `utils/sealed-jsonl-log.ts` `removeSealedOlderThan` | unit (31 d, 90 d) |
| C-6 setting | `model-routing-settings.ts`, GraphQL `setUsageLimitSwitchEnabled`, status `usageLimitSwitchEnabled`, `ModelRoutingSetup.vue` | unit (server, web); UL-07; browser probe MRD-01 |
| AR-012 | `isClientRunEvent` (agent-run-event-message-mapper.ts) before the stream sequence maps; adapters' `not_presented` | unit; UL-08 (no client frame) |

## Key Files

- **New, server:**
  - `src/run-events/**`
  - `src/compositions/run-events-composition.ts`
  - `src/model-routing/services/fallback-chooser.ts`
  - `src/model-routing/services/switch-request-text.ts`
  - `src/model-routing/stores/switch-record-log.ts`
  - `src/model-routing/domain/runtime-switch-types.ts`
  - `src/run-history/services/agent-launch-history.ts`
  - `src/agent-collaboration/execution/services/run-runtime-switcher.ts`
  - `src/agent-collaboration/execution/domain/agent-runtime-switch-request.ts`
  - `src/agent-execution/services/standalone-automatic-runtime-switch.ts`
  - `src/agent-execution/backends/shared/late-usage-limit-classification.ts`
  - `src/agent-execution/domain/agent-run-error-kind.ts`
  - `src/agent-team-execution/services/team-member-runtime-switch*.ts`
  - `src/launch-preferences/launch-fallback-ports.ts`
  - `src/utils/sealed-jsonl-log.ts`
  - `src/agent-tools/model-routing/submit-runtime-switch-*.ts`
  - `src/standalone-agent-run-root/domain/standalone-run-launch.ts`
- **New, autobyteus-ts:** `src/agent/message/present-as-notice-metadata.ts`.
- **New, fixtures and E2E:**
  - `tests/fixtures/codex-usage-limit-app-server.mjs` (a whole scripted Codex app-server);
  - `tests/e2e/run-events/usage-limit-switch-built-server.e2e.test.ts`;
  - `tests/e2e/run-events/usage-limit-switch-peer-run.e2e.test.ts`.
- **Docs:**
  - new `docs/modules/run_events.md`;
  - `model_routing.md`, `agent_runtimes.md`, `agent_tools*.md`, `design/collaboration_model.md` CM-12, `README.md`;
  - web `docs/settings.md`.

## Important Assumptions / Known Risks

- **R-6 pending.** The built-in router template has no "Switch requests" section and does not list `submit_runtime_switch`. With Model Routing on, the router receives the request, its turn ends without a decision, and history decides (UL-03). Add the C-7 text after the founder's recorded approval.
- **DEC-008 pending.** Switch records are kept 90 days (the default).
- **Claude.** No recorded Agent SDK usage-limit payload exists in the repo, so Claude classifies by the limits read (R-13's fallback). An SDK signal can replace it later in the Claude backend only.
- **Codex.** The thread-status failure is not tagged. In Codex's order, the `error` notification ends the turn first, so no status-derived `ERROR` follows (unit test documents it). Every `ERROR` a usage-limit turn emits carries `error_kind`.
- **No-fallback wording.** C-5's "No other runtime is usable." also shows when other runtimes are usable but this agent's history has none of them (router off). Wording is the designer's call.
- **Source of a switched Team member.** `applySelectionToConfiguredMember` records the member's launch source as `settings` (V-11) after an automatic switch, the same as after a Save. The pending switch's `cause` carries the automatic fact.
- **Pre-existing, outside this ticket:**
  - An `ERROR` is a live row only. The stored conversation keeps no error row (UL-08 asserts live and stored separately).
  - On AutoByteus the hand-over preface shows as a second notice after a reload (FU-646-02).
- **Already dropping `ERROR_CLASSIFIED` (AR-012 note):** the trace accumulator (`default: return`) and the application stream projector (`default: return null`).
- **Peer runs.** Alpha shows beta's new launch only while a view holds the peer run (the run-status feed), as for any peer launch (SR-038). ULP-01 subscribes the feed as the tree does.

## Design Health / Removal / Size / Persistence Checks

- **Removed or reverted:**
  - the person's Save path no longer carries `cause` (the `StoppedRunSelectionInput` and `TeamRunSelectionPatch` fields are removed; both files are back at base);
  - `team-run-delegated-launch-plan.ts` is back at base;
  - the listener's in-flight map is gone (R-12);
  - the detector's per-runtime branches are gone (R-13).
- **Dependency direction:**
  - `run-events` imports no model-routing class (structural types);
  - `model-routing` imports no listener;
  - `agent-collaboration` does not import compositions;
  - the backends use a process port for the limits read.
- **Size:** the source files are within 500 non-empty lines. The lifecycle service is at 499 and `root-team-run.ts` at 498, so both have little room.
- **Persistence:**
  - new: `run-events/events_*.jsonl`, `model-routing/switches_*.jsonl`;
  - `pendingRuntimeSwitch.cause`, optional and read strictly;
  - origin `agent_history` (DESIGN rule 9: no downgrade compatibility);
  - existing records read unchanged.

## Local Implementation Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Server typecheck (src 0; tests at baseline 972) | Pass | `pnpm -C autobyteus-server-ts typecheck` |
| Server unit suite | 9175 pass. The 1 failure was my comment naming Grok in the shared ACP backend (layer-neutrality test); fixed and rerun | `evidence/IMP-04-server-unit.log` |
| Server integration suite | 92 files pass | `evidence/IMP-05-server-integration.log` |
| autobyteus-ts agent and memory tests | 873 pass. Whole suite: the 3 local-LM Studio tests fail identically with the base ingest code (A/B in log): environment | `evidence/IMP-06-autobyteus-ts.log` |
| Web typecheck, guards, localization audit, codegen check, affected tests (240) | Pass | `evidence/IMP-07-web.log` |
| Contracts package tests | Pass | `evidence/IMP-08-contracts.log` |
| Built-server E2E UL-01 … UL-08 | 8/8 pass | `evidence/IMP-03-usage-limit-switch-e2e.log` + receipt |
| Two-server E2E ULP-01 | Pass | `evidence/IMP-09-usage-limit-peer-e2e.log` + receipt |
| Earlier full-suite runs (before SR-009) | Pass | `evidence/IMP-01`, `IMP-02` |

## Frontend Rendered-Result Check

- Browser probe `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs`, with MRD-01 extended for this toggle.
- **The toggle renders** under the router settings in Settings → Model Routing → Configuration, as "Switch runtime when a usage limit is reached" with its explanation. It is on by default, usable with Model Routing on or off, and saves off and on through `setUsageLimitSwitchEnabled`. Screenshot: `evidence/IMP-10-model-routing-probe/MRD-01-setup.png`.
- **MRD-04 fails on a pre-existing probe staleness.** The tree's `data-member-address` is now `/writer`, but the probe looks for `/studio/writer`. This ticket's web diff touches no tree row. Follow-up candidate for the Solution Designer to record.
- The continue and no-fallback notices use the existing notice row and are labelled "Agent runtime changed" (`system.usage_limit`, SystemTaskNotificationSegment test). The no-fallback notice also gets that label; a dedicated label is possible later.

## Environment / Cleanup / Delivery Notes

- E2E: disposable HOMEs and data roots, removed after each run. No real provider, no `~/.autobyteus`.
- Untracked build outputs under `autobyteus-application-*` and `applications/brief-studio/dist` come from the typecheck's prepare step. They are not this ticket's and are not committed.
- The rebuilt `autobyteus-collaboration-stream-contracts/dist` (tracked) is committed with the DTO change.

## Independent Executable Coverage Still Required

- Live runtimes at a real usage limit (gated live cases, when a runtime is exhausted).
- The Claude Agent SDK's own rate-limit signal, once a payload is recorded.
