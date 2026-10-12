# Implementation Handoff

Commits: `55092536a` (server + contracts), `035b208d5` (web), `823237259` (ticket artifacts).

Package: `delegated-launch-config-defaults` · Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-launch-config-defaults` · Branch `codex/delegated-launch-config-defaults` (base `origin/personal` @ `beb6b3b49`).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High) and passed (ARCH-REV-002). Routing to source review follows `get_handoff_rules`.
- Requirements doc: `tickets/in-progress/delegated-launch-config-defaults/requirements-doc.md` (approved baseline SR-002; SR-004 editorial)
- Investigation notes: `tickets/in-progress/delegated-launch-config-defaults/investigation-notes.md`
- Solution revision record: `tickets/in-progress/delegated-launch-config-defaults/solution-revision-record.md` (SR-001..SR-004)
- Design spec: `tickets/in-progress/delegated-launch-config-defaults/design-spec.md` (SR-004, `Ready`)
- Supplemental task artifacts: N/A — not applicable
- Design review report: `tickets/in-progress/delegated-launch-config-defaults/design-review-report.md` (ARCH-REV-002, `Pass`)
- Architecture review revision record: `tickets/in-progress/delegated-launch-config-defaults/architecture-review-revision-record.md`
- Triggering rework report: `tickets/in-progress/delegated-launch-config-defaults/code-review-report.md`, `code-review-revision-record.md` (CRR-001, CR-001)

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002, Local Fix for CRR-001 / CR-001; IR-001 is the initial baseline)
- Implementation revision record: `tickets/in-progress/delegated-launch-config-defaults/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-004`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001` (`Fail`, Local Fix)
- Related API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-001` — removed the dead `RootTeamRun.getAgentExecution` and its three test uses (see IR-002).

Summary:

- **Server, one resolution owner.** `CollaboratorEntryBuilder` now produces a `CollaboratorDefinitionPlan` (structure + captured agent/team defaults; the member defaults are read through the same lookup the Team layout resolver already makes). `CollaboratorLaunchResolver` (new; replaces the removed `CollaboratorRunnabilityValidator`) turns a batch of plans into entry plans: agent default → team default (members) → inherited root launch, one unit per layer; configured layers need an available runtime (`RuntimeAvailabilityService`) and a valid model/settings (`validateMany`); the inherited layer keeps today's check and today's `CollaboratorAddError` wording. Availability is checked once per distinct configured runtime (concurrently) and all candidates go through one `validateMany` (QR-001).
- **Records.** Optional `launchSource` / `defaultLaunchSource` and member `launchConfiguration` / `launchSource` on collaborator entries and catalog-copy sources. `effectiveMemberLaunchConfiguration` / `effectiveMemberLaunchSource` in the run-history domain are the only readers of a member's launch (seven projector/allocator sites plus one more found in `standalone-root-location-service.ts`). Readers parse the new fields tolerantly (`launch-configuration-source-schema.ts`); writers emit them only when meaningful.
- **Notes.** `launch-configuration-notes.ts` renders fallbacks. `catalogTaskSource` returns this admission's notes; only the catalog branch of `resolveDelegationPlacement` puts them on the placement; `dispatchTaskCopy` is the single attachment point; `ensureTaskHelper` returns notes only from its own (or joined) dispatch; `ensure` returns notes for entries it added; `MessageRecipientResult` carries them and the three `deliverToAddress` call `appendLaunchNotes`. `delegate_task` result gains optional `launch_notes` (strict schema; non-empty only); the tool description mentions it.
- **Contracts.** Both packages gain the optional source/member-launch DTO fields and the effective-member functions (`teamMemberLaunchConfiguration`/`teamMemberLaunchSource`, `collaborationMemberLaunchConfiguration`/`collaborationMemberLaunchSource`). Their tracked `dist/` is rebuilt.
- **Web.** All four `agentSourceSelectors.ts` selectors use the contract functions. `usableStartCandidate` is extracted from `resolveStartModel`. `seedMemberLaunchDefaults` (new) seeds fresh New-chat Team starts, fresh Org launches (placed teams + agents) and mobile Team starts; seeded rows are pinned in the New-chat and Org drafts (`normalizeMemberOverride(…, { pinnedModel })`; released only by model reset, row reset, Reset all; never copied into "+"/switcher drafts). Mobile applies seeds asynchronously in the setup controller, only to the exact draft and while the same team is selected. `RunMemberRow` shows a note for an unusable default; pinned rows count as customized. Settings gets a read-only "Collaborators and delegated copies" section (`delegatedLaunchRows.ts` + `RunDelegatedLaunchList.vue`), open copies only.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` → Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the change spans server admission, persisted records/readers, two contract packages, two tool results, three web launch surfaces and a Settings section (~60 source files incl. tests); shared contracts and persisted shapes changed as designed.
- Selected route: per `get_handoff_rules` (source review for Large / High)
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (independent review route)
- New design impact or escalation trigger: `None` (no migration, no inherited-source change, no application-baseline change, no runtime-engine change)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Catalog copy resolved per agent; notes in result | `collaborator-admission.ts` `catalogTaskSource` → `collaborator-launch-resolver.ts` → `toTaskExecutionSource` (sources recorded) → `catalog-delegation.ts` (catalog branch sets `launchNotes`) → `root-task-dispatch.ts` → `task-delegation-tool-serialization.ts` (`launch_notes`) | Implemented; unit-tested at resolver, admission, placement, lifecycle and Team-root levels |
| BEH-002 | Bring-in resolved per agent; notes in send result | `ensure` → resolver → allocator (`effectiveMemberLaunchConfiguration` for children) → root `addEntries`; `message-recipient-resolution.ts` (`launchNotes`) → three `deliverToAddress` → `appendLaunchNotes`; task-owned helper: `task-scoped-message-recipient.ts` → `ensureTaskHelper` (`TaskHelperResult`) | Implemented; reused instances/helpers carry no notes (tested) |
| BEH-003 | Extra copies / teammates use recorded per-agent values | `collaborator-source-projector.ts` (all six sites), `collaborator-identity-allocator.ts`, `standalone-root-location-service.ts` → `effectiveMemberLaunchConfiguration` | Implemented; teammate re-projection carries no notes (AR-002, tested) |
| BEH-005 | Fresh team/Org/mobile starts seed members; DEC-009 pins | `memberLaunchDefaults.ts`, `memberOverrides.ts` (`pinnedModel`, `releasesMemberPin`), `chatDraftStore.ts`, `agentOrgLaunchDraftStore.ts`, `teamRunConfigStore.ts` (`applySeededMemberDefaults`), `useMobileRunSetupController.ts`, `runMemberTree.ts`, `RunMemberRow.vue` | Implemented; store + util tests; rendered check (below) |
| BEH-007 | Restore uses recorded values; old records unchanged | readers in `run-execution-tree-shared-record-schemas.ts`, `task-execution-source-schema.ts`, `launch-configuration-source-schema.ts` | Old-shape fixtures parse unchanged and restore on the Team value (AC-009 test) |
| BEH-008 | Settings lists collaborators/copies read-only | `delegatedLaunchRows.ts`, `RunDelegatedLaunchList.vue`, `ExistingRunSettings.vue`, `ExistingRunConfigEditor.vue`, `teamExecutionViewState.ts` (`getClosedTaskExecutions`) | Implemented; projector + component tests |
| BEH-004, BEH-006, BEH-009 | Unchanged | Not touched (single-agent start, configured placement delegation, application baselines) | Existing suites pass |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src`):
- Added: `agent-collaboration/domain/launch-configuration-source.ts`, `agent-collaboration/collaborators/collaborator-launch-resolver.ts`, `agent-collaboration/collaborators/launch-configuration-notes.ts`, `run-history/store/launch-configuration-source-schema.ts`
- Removed: `agent-collaboration/collaborators/collaborator-runnability-validator.ts`
- Modified: `collaborator-entry-builder.ts`, `collaborator-admission.ts`, `collaborator-definition-catalog.ts`, `collaborator-identity-allocator.ts`, `collaborator-source-projector.ts`, `catalog-delegation.ts`, `message-recipient-resolution.ts`, `task-scoped-message-recipient.ts`, `execution/task/root-task-dispatch.ts`, `execution/task/root-task-execution-lifecycle.ts`, `execution/task/task-delegation-command.ts`, `domain/agent-team-collaboration-llm-contract.ts`, `agent-execution/runtime/general-process-run-supervisor.ts`, the three `*-message-delivery.ts`, `task-delegation-result-contract.ts`, `task-delegation-tool-serialization.ts`, `run-history/domain/run-execution-tree-shared-records.ts`, `run-history/store/run-execution-tree-shared-record-schemas.ts`, `run-history/store/task-execution-source-schema.ts`, `services/agent-streaming/team-execution-view-projector.ts`, `services/agent-streaming/collaboration-execution-tree-dto-projection.ts`, `standalone-agent-run-root/services/standalone-root-location-service.ts`, `agent-team-execution/domain/root-team-run.ts`

Contracts: `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts`, `autobyteus-collaboration-stream-contracts/src/agent-org-execution-dtos.ts` (+ rebuilt tracked `dist/`), new tests `tests/team-member-launch.test.mjs`, `tests/collaboration-member-launch.test.mjs`.

Web (`autobyteus-web`):
- Added: `utils/runSettings/memberLaunchDefaults.ts`, `utils/runSettings/delegatedLaunchRows.ts`, `components/run-settings/RunDelegatedLaunchList.vue`
- Modified: `services/collaborators/agentSourceSelectors.ts`, `utils/runSettings/startModelDefaults.ts`, `utils/runSettings/memberOverrides.ts`, `utils/runSettings/runMemberTree.ts`, `stores/chatDraftStore.ts`, `stores/agentOrgLaunchDraftStore.ts`, `stores/teamRunConfigStore.ts`, `composables/mobile/useMobileRunSetupController.ts`, `components/chat/ChatNewSurface.vue`, `components/run-settings/RunMemberRow.vue`, `components/run-settings/ExistingRunSettings.vue`, `components/workspace/config/ExistingRunConfigEditor.vue`, `services/teamExecution/teamExecutionViewState.ts`, `services/agentOrgDefinition/agentOrgDefinitionReferences.ts`, `graphql/queries/agentOrgDefinitionQueries.ts` + `generated/graphql.ts` (agent reference query now fetches `defaultLaunchConfig`), localization `en`/`zh-CN` `runSettings.ts`.

## Important Assumptions

- A team's own `defaultLaunchConfiguration` is resolved even when every member has its own usable default. If the inherited layer then fails but no agent needs it, the Team records the inherited value (unused) rather than failing, because REQ-004 fails only "for some agent" with no usable layer.
- Member `launchSource` records only the member's own skipped agent default; a Team-level fallback is recorded once on the Team (`defaultLaunchSource`) and rendered once as a Team note ("its members without their own default run on …"), not repeated per member.
- Notes for `send_message_to` are appended as `\nLaunch configuration notes:\n- …` lines to the accepted `message`.
- Org launch seeding needed the referenced agents' `defaultLaunchConfig`; the Org reference query for agents now fetches it (and `generated/graphql.ts` was updated by hand to match, since codegen needs a running backend).
- Mobile setup has no per-member rows, so mobile seeding applies values without showing a row note (no surface to show it on).

## Known Risks

- UNK-001 (accepted, out of scope): an installed but unauthenticated Codex/Claude passes resolution and fails at its first turn as a run error.
- DEC-006: application launch baselines keep the opposite order (follow-up candidate).
- A copy without a recorded source (copy of a configured placement or an extra copy at a collaborator address) shows "As configured in this run"; its Team row shows no model (CRR-001 residual).
- Settings for a saved Team/Org run reads the canonical draft tree loaded with the editor; a copy started while the editor is open appears after Refresh/reopen. Closed-copy filtering uses the live Team view / standalone collaboration view / Org history row when available (no filtering when that source is not loaded).
- Codex catalog listing starts the Codex app server when a configured layer names Codex (first-use latency for that delegation only), as the design noted.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `Duplicated Policy Or Coordination` + `Missing Invariant`
- Reviewed refactor decision: `Refactor Needed Now` (bounded)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: server member-launch spreads replaced by one domain function (7 designed sites + 1 found: `standalone-root-location-service.ts` `collaboratorLaunchConfiguration`, which returned the Team value for any member); web selectors use contract functions; resolver absorbed runnability validation.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (optional fields with truthful absence; no version branches)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` — `collaborator-runnability-validator.ts`, `cloneLaunch` in the builder, `rootLaunchConfiguration` builder input; the standalone `collaboratorLaunchConfiguration` is no longer exported (no other users).
- Dead code removed in IR-002 (CR-001): `RootTeamRun.getAgentExecution` (no production caller; it also read a collaborator-Team member's launch outside `effectiveMemberLaunchConfiguration`) and its three test uses.
- Dead code found elsewhere, listed as follow-up: None
- Shared structures remain tight: `Yes` (`RecordedMemberLaunch` / `RecordedTeamLaunch` composed into record types; no mostly-optional base)
- Canonical shared design guidance reapplied: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` — largest touched: `chatDraftStore.ts` 492, `teamExecutionViewState.ts` 497, `root-team-run.ts` 448 effective non-empty lines (all < 500). Launch-source parsing was moved into its own schema file to keep `run-execution-tree-shared-record-schemas.ts` at 449.
- Notes: `TESTING.md` says SDK `dist/` outputs are untracked; the two stream-contract packages' `dist/` are tracked and earlier feature commits update them, so the rebuilt `dist/` is committed (discrepancy recorded).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` → Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: `collaborator-member-launch.test.ts` parses current-shape records without the new fields unchanged, restores members on the Team value, and reports source `null` ("not recorded"); writer key sets checked (members on the Team launch write no launch keys).
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm install`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare`; contract packages rebuilt (`pnpm -C autobyteus-team-stream-contracts build`, `pnpm -C autobyteus-collaboration-stream-contracts build`).
- Web has no `vue-tsc`; `tsc --noEmit -p autobyteus-web/tsconfig.json` reports 626 pre-existing errors; none are in the new files, and the hits in touched files are on unchanged lines or follow the existing test fixture pattern.

## Local Implementation Checks Run

IR-002 (CR-001): server typecheck 0 errors; `vitest run tests/unit/agent-team-execution tests/unit/agent-collaboration` 65 files / 532 tests pass; `team-root-collaborators.test.ts` with the two placement assertions re-expressed through `TeamRunExecutionTreeLocationService.findAgent` 7/7; full server `test:unit` 673 files / 5277 tests passed, 7 skipped (exit 0; run after the method removal, before the re-expressed test assertions, which were run separately). No web or contract file changed in IR-002.

IR-001 baseline:

All run in the worktree; implementation-scoped only.

- `pnpm -C autobyteus-server-ts typecheck` (tsc on `tsconfig.build.json`): 0 errors.
- `pnpm -C autobyteus-server-ts test:unit`: 673 files / 5277 tests passed, 7 skipped (exit 0).
  - New: `collaborator-launch-resolver.test.ts` (AC-001..AC-003, AC-005 per reason, AC-006 messages, REQ-004 scope, QR-001 batching), `collaborator-admission-launch-defaults.test.ts` (AC-001/AC-015 shape, AC-004, AC-005 notes, AC-007, AC-008), `collaborator-member-launch.test.ts` (all projection sites, reader/writer key sets, AC-009 old-shape fixture), `launch-configuration-notes.test.ts`, `launch-source-dto-projection.test.ts` (both DTO projections, `launch_notes` serializer + strict schema), `team-root-launch-notes.test.ts` (real Team root: bring-in note once; catalog copy note; teammate inside the copy none), additions to `message-recipient-resolution.test.ts` (catalog placement notes; snapshot re-projection none; helper/bring-in notes) and `root-task-execution-lifecycle.test.ts` (single attachment point; `ensureTaskHelper` fresh/joined/reused).
  - Updated for the new shapes: admission, Team/Org/standalone root collaborator tests, LLM-contract hash, `delegate_task` output-schema test.
- Contract packages: `pnpm -C autobyteus-team-stream-contracts test` (11 pass), `pnpm -C autobyteus-collaboration-stream-contracts test` (24 pass).
- `pnpm -C autobyteus-web test:nuxt --run`: 604 files / 4193 tests passed, 5 skipped. New/extended: `memberLaunchDefaults.spec.ts` (seeding, Org targets, pin rule incl. AR-003 variant and sub-case, pin release), `startModelDefaults.spec.ts` (`usableStartCandidate`), `chatDraftStore.spec.ts` (AC-011, AC-013, Reset all, "+" not seeded), `agentOrgLaunchDraftStore.spec.ts` (AC-012, pins, reset, "+" not seeded), `teamRunConfigStore.spec.ts` (mobile apply to exact draft; stale draft dropped), `agentSourceSelectors.spec.ts` (mixed-runtime copy and collaborator, both casings), `delegatedLaunchRows.spec.ts`, `RunDelegatedLaunchList.spec.ts` (+ `RunMemberRow` note).
- Web guards: `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` all pass.
- `pnpm -C autobyteus-server-ts build`: pass (used for the rendered check).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: New chat Team member drawer (AC-011, AC-013); Org launch page member drawer (AC-012); saved-run Settings read-only section (AC-010); mobile setup (no member rows).
- Approved references: `requirements-doc.md` UI section (wording/layout follow existing Settings/launch-row patterns); no UI/UX supplement.
- Design system / adjacent surfaces reviewed: `RunMemberRow`, `RunMembersSection`, `ExistingRunSettings`, `useRunSettingsPresentation` (labels), existing amber note styling.
- Surface used: an ad-hoc self-check (`implementation-evidence/render-check/launch-seed-render-check.mjs`, not a durable probe) modelled on `tests/e2e/run-settings-live-probe.mjs`: worktree `dist/app.js` backend on a temp data root and free ports, `pnpm dev` Nuxt, headless Chrome; definitions created through GraphQL (team default Claude/haiku; Engineer default Claude/sonnet; Reviewer default Claude/`no-such-model`; Org default haiku with a direct Writer (sonnet) and the team). No inference runs. All processes and the data root were removed afterwards.
- States inspected (assertions in `implementation-evidence/render-check/results.json`):
  - New chat: members line "1 of 3 customized"; Engineer seeded and customized; Reviewer follows the root with the note "Its default (Claude SDK · no-such-model) can't be used: the model is not offered. It follows the settings above."; Lead follows the root.
  - Root changed to another Sonnet model: Engineer keeps its own model (pinned); Lead follows. Engineer row reset: it follows the root and is no longer customized.
  - Org launch: "3 of 4 customized"; Writer seeded (sonnet); Build Team seeded from its team default (haiku, equal to the Org's, shown customized with Reset because pinned); team Engineer seeded; team Reviewer note.
  - Viewports 880, 390 (drawer) and 1280 (Org); no overlap or overflow; the note wraps within the row. Browser errors: none.
- Issues found and corrected: the localization audit flagged dynamic key templates; replaced with static key maps.
- Remaining unverified: the Settings "Collaborators and delegated copies" section was verified with component tests only (rendering it needs a run with delegated copies, i.e. agent-driven delegation, left to API/E2E); the mobile setup has no member rows to inspect.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001/AC-015 end to end: a PM agent delegates a catalog Team copy whose two members have a usable default on a runtime other than the root's; verify the copy's member runtime nodes and the Settings rows. The scripted AGY runtime (`agy-failure-cli.mjs`, `CALL_TOOL:{…}`) can drive `delegate_task` without inference; give two members an AGY default and the root another runtime (or vice versa).
- AC-005 per reason through a real root: unavailable runtime (e.g. a default naming an uninstalled runtime), model not offered, invalid settings, incomplete default; check `launch_notes` in the `delegate_task` tool result and the note in a `send_message_to` bring-in result.
- AC-006: root model invalid and no member default → `COLLABORATOR_ADD_FAILED` text unchanged.
- AC-007/AR-002: teammate delegation inside a copy whose member fell back produces no `launch_notes`.
- AC-008/AC-009: edit a definition default after a copy starts; restore the run; and reopen a run recorded before this change.
- AC-010: Settings for Team, Org and standalone Agent runs with collaborators and copies (open and closed).
- AC-011..AC-013: New chat Team, Org launch page and mobile setup with seeded rows, a root change, a pinned row set to the root's model, model/row/Reset all release.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All API/E2E and executable validation above (server integration/E2E delegation and bring-in through real roots, browser/isolated-instance journeys), plus AC-015 user verification on an isolated instance. No API/E2E checks are claimed here.
