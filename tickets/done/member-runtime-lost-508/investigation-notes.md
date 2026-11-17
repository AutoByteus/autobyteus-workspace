# Investigation Notes — autobyteus-508

## Investigation Meta

- Package identifier: `member-runtime-lost-508`
- Request / ticket: autobyteus-508 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), URGENT BUG: on node 8001 a private team's computer use operator shows runtime 'Claude Agent SDK' with model 'gpt-6.1-terra' and cannot start.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508`, branch `codex/member-runtime-lost-508`
- Resolved base remote / branch / revision: `origin/personal` @ `a8ac226e65a724169aeac58fef7321f2defcd9c5` (fetched 2026-11-17)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from freshly fetched `origin/personal`; `pnpm install --frozen-lockfile --prefer-offline --filter autobyteus-server-ts...` done.
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate, 2026-11-17): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`. Architecture gate (2026-11-17): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repo root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` (sections 1–7).
- Investigation status: Cause established (Read + Reproduced + Measured). Affected records counted on every local node that ran the conversion.

## Initial Request And Clarifications

- Original request: the Task description (founder's words through the PM): after the upgrade to v1.5.13-beta.7, the Computer Use Operator of one of his private teams (team P) shows runtime Claude Agent SDK (locked) with model gpt-6.1-terra, "Inherited from the run"; the team cannot start. Find the cause, fix the product (stored runtime survives upgrade and restore, with a test failing before and passing after; mismatch shown and repairable from the UI with a clear message), count other affected teams/runs, provide a safe repair for node 8001 data.
- Clarifications received (Task comment, 2026-11-17, and PM message): Team settings show team runtime Claude Agent SDK (claude-sonnet-5-5); members list shows the operator as gpt-6.1-terra · Claude Agent SDK "inherited from the run"; he remembers CUSTOMIZING that member to Codex App Server earlier (per-member override).
- User-supplied facts and constraints (HARD RULES): private data; read-only; counts and structure only, never read or quote message or document content; never copy his private records off the node; any change to his real data needs his explicit approval and a BACKUP first; never stop another agent's or his processes; no secrets in reports; ask him before touching node 8001; release only on his word.
- Initial ambiguity: whether the runtime was lost at conversion, at restore, or at start. Resolved below (conversion).

## Product And Domain Understanding

- Product area: delegated runs (a Project Task Manager delegates a Task to a team; the team runs as its own run, `delegatedFrom` set), per-run Settings edits of a stopped run's members (model and, since autobyteus-348, agent runtime), run restore/activation, app-data migrations at startup.
- Affected actors or systems: the founder (user) on node 8001 and the desktop's own node; every installation that upgrades from a pre-461 version with delegated copies whose Settings edit changed the agent runtime.
- Relevant terminology: *delegated copy* (pre-461 name of a delegated run); *Settings edit* / `userLaunchSelection` (pre-461 stored user choice for a copy: model, settings and optional `runtimeKind`); *started launch* (`launchConfiguration`, the launch a copy started with); *pending runtime switch* (autobyteus-348: recorded at save, made real by the member's next input).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Code | `autobyteus-server-ts/src/app-data-migrations/migrations/delegated-runs-own-runs-v1/run-file-conversion.ts:52-59` (`convertAgentRunFile`) | 461 conversion of a delegated agent run | A Settings edit becomes the run's own launch by copying only `llmModelIdentifier` and `llmConfig`; `runtimeKind` of the selection is dropped; `launchSource` dropped too. | Fix (REQ-001, REQ-002) |
| 2026-11-17 | Code | same file `:64-65` (`withSelection`) and `:96-102` (`convertTeamRunFile` members) | 461 conversion of a delegated team run | A member's own edit, or the team-level edit for a member that follows the team, replaces only model + settings on `launchConfiguration`; `runtimeKind` stays the started one; `launchSource` dropped. | Fix (REQ-001, REQ-002) |
| 2026-11-17 | Code | `git show v1.5.13-beta.6:autobyteus-server-ts/src/run-history/domain/run-execution-tree-shared-records.ts` lines 10-22, 242-260 | Released pre-461 meaning of `userLaunchSelection` | `UserLaunchSelection = { runtimeKind?: RuntimeKind; llmModelIdentifier; llmConfig; selectedAt }`; effective launch = `{...started, runtimeKind: selection.runtimeKind ?? started.runtimeKind, llmModelIdentifier, llmConfig}`. The selection is recorded beside the started values, never over them. | Defines the released semantics the conversion must keep |
| 2026-11-17 | Code | `git show v1.5.13-beta.6:.../agent-collaboration/domain/delegated-launch-selection.ts:27-35` | Released Save value for a copy | `DelegatedLaunchSelectionValue = { runtimeKind, llmModelIdentifier, llmConfig }`: a copy's Save always carries the runtime. | — |
| 2026-11-17 | Code | `collaborators-to-delegated-runs-conversion.ts:65,74`; frozen `released-task-agent-own-files-with-origin.ts` | Earlier conversions (20261015/17/19) | They carry `userLaunchSelection` whole (runtime included). The loss happens only in the 461 step. | — |
| 2026-11-17 | Code | `delegated-runs-preserved-items-v1.ts:62` (`PreservedItemsFollowUp extends DelegatedRunsOwnRunsV1AppDataMigration`) | 20261114 follow-ups | They reuse the same conversion functions, so the same defect applies to items converted late; a same-ID correction fixes them too. | Design |
| 2026-11-17 | Code | `tests/app-data-migrations/delegated-runs-own-runs-v1/delegated-runs-own-runs-v1-app-data-migration.test.ts:119-131`; fixtures `released-delegation-shape-fixtures.ts` | 461 tests | Fixtures' selections carry no `runtimeKind`; the runtime-switch shape (autobyteus-348) was never in the shape inventory, so no test could fail. | REQ-001 test |
| 2026-11-17 | Code | `src/run-history/domain/runtime-selection-rule.ts:31-77` (`applyRuntimeSelection`) | What a Settings save does today | Saving another runtime on a stopped record: new binding with `platformAgentRunId: null` and a pending switch `from` the old binding; saving the pending `from` runtime again undoes it and brings the old session ID back. | How the founder repairs his converted records himself (DEC-003) |
| 2026-11-17 | Code | `src/agent-team-execution/services/team-run-delegated-launch-plan.ts:20-55` | Stopped team Save validation | Validates each changed scope's selection against the chosen runtime's model list; refuses `MODEL_UNAVAILABLE` with `modelNotOfferedText`. A valid repair (Codex App Server + gpt-6.1-terra) passes. | UI repair is possible today once stopped |
| 2026-11-17 | Code | `src/llm-management/services/run-model-selection-refusal.ts:15-21` | Existing refusal wording | `'<model>' is not offered by <Runtime> now (for '<address>'). Refresh the model list and choose again.` | Wording basis (FU-001) |
| 2026-11-17 | Code | `src/agent-collaboration/execution/backends/configured-agent-execution-handle.ts:415-440`; `configured-agent-activation-planner.ts:47-80` | Member start/restore path | Activation builds the run config from the stored launch and resumes the stored `platformAgentRunId`; no check that the stored model belongs to the stored runtime. A failed activation publishes a `readiness_failure` card on the member's conversation. | FU-001 placement |
| 2026-11-17 | Code | `src/agent-execution/services/standalone-agent-run-lifecycle-service.ts:77,92,308-330` | Standalone (incl. delegated agent run) restore | Restore uses the stored launch; the service already holds `modelSelectionValidator` but does not check the stored pair before restore. | FU-001 placement |
| 2026-11-17 | Code | `autobyteus-web/components/workspace/config/ExistingRunConfigEditor.vue:28,395-405`; `components/run-settings/RunSettingsCard.vue:58-60`; `localization/messages/en/runSettings.ts:47` | Existing "model not offered" note | The web already knows per address whether the saved model is offered (`modelOptionsByAddress[address].options.currentModel`), but shows the note only for the root (`/`). Text: "No longer offered by {runtime}. Choose another model before this run resumes." | FU-001 would reuse it for members |
| 2026-11-17 | Code | `components/run-settings/RunMemberRow.vue:136,143-152`; `localization/messages/en/runSettings.ts:36,40` | Screenshot strings | "Stop this copy to change its model…" shows while the copy is running (`node.delegated?.running`); "Inherited from the run" is the `inherited` launch source label. | — |
| 2026-11-17 | Code | `git show v1.5.13-beta.6:.../run-execution-tree-shared-records.ts:262-266` (`effectiveMemberLaunchSource`) and `launch-configuration-source.ts:63-64` (`SETTINGS_LAUNCH_SOURCE`) | Why the edited member shows "Inherited from the run" | A member with no own `launchSource` shows the team's source (`inherited`). A live Settings save records `{origin: "settings"}`; the conversion drops the source instead, so a converted edit is shown as inherited. | REQ-002 |
| 2026-11-17 | Data (read-only, node 8001) | `docker inspect autobyteus-server-0`; `/home/autobyteus/server-packages/state.json` | Which node, which version | Node 8001 = container `autobyteus-server-0`, data at `/home/autobyteus/data`; current 1.5.13-beta.7, previous 1.5.13-beta.6. | — |
| 2026-11-17 | Data (read-only, node 8001) | `logs/app-data-migrations/20261111_delegated_runs_own_runs_v1-2026-11-17T05-11-39-182Z.log` (header and item lines for the 3 runs of team P only) | When the conversion ran | Ran 2026-11-17 05:11 UTC: scanned 214, migrated 211, skipped 3, failed 0; the three team-P run files: `MIGRATED`. | — |
| 2026-11-17 | Data (read-only, node 8001) | `team_run_execution_tree.json` of the 3 team-P runs: keys and `runtimeKind`/`llmModelIdentifier`/`launchSource.origin`/`pendingRuntimeSwitch` keys only | The stored state now | Runs P-1 and P-2: `/computer_use_operator` = `claude_agent_sdk` / `gpt-6.1-terra`, no `launchSource`; team default `claude_agent_sdk` with source `inherited`. P-2 also has `pendingRuntimeSwitch.from.runtimeKind = claude_agent_sdk` (= the stored runtime: the switch target was lost). P-3: consistent (claude/opus). | — |
| 2026-11-17 | Data (read-only, node 8001) | `raw_traces_manifest.json` of run P-1's `computer_use_operator` member: `segments[].runtime_kind` only | Which runtime it really ran on | All 3 trace segments: `codex_app_server`. | Measured evidence of the lost runtime |
| 2026-11-17 | Data (read-only, node 8001) | `logs/server.log`: counts and error-class tokens only for lines naming run P-1's operator member run | The start failure | 2 × `Error: Claude Code returned an error result: No conversation found…`: the Codex thread ID is resumed on Claude Agent SDK. | FU-001 (clear message instead) |
| 2026-11-17 | Data (read-only) | `app-data-migration-backups/` on node 8001 (empty); `~/.autobyteus/backups` (Feb 2026 only) | Can the lost value be read back? | No pre-461 copy of the run files exists. The lost runtimes are not recoverable from data; only from evidence (traces, pending switch, model) or the user. | DEC-001 |
| 2026-11-17 | Data (read-only, counts) | `probes/affected-records-scan.js` on node 8001, node 8003, the desktop's own node (`~/.autobyteus/server-data`) | Blast radius | See "Affected records" below. | Blast radius (investigation) |
| 2026-11-17 | Command | `docker exec autobyteus-server-1 cat .../state.json` | Node 50433 | 1.5.12-beta.9 (not upgraded; no 461 conversion yet) → would lose runtimes if upgraded to beta.7 before the fix. | Release timing |
| 2026-11-17 | Doc | `autobyteus-server-ts/docs/design/data_migration_guideline.md` §7 "Correcting a released migration", §4 "Registry order", §2 checklist | Governing convention | Same-ID repair fixes pending/failed installs; terminal installs stay skipped; another transformation for successful installs needs its own new migration; never guess identity/values. | DEC-001 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract (upgrade) | App start of a release containing `20261111_delegated_runs_own_runs_v1` (and its `20261114_*` follow-ups) on data written by ≤ beta.6 | Each delegated agent run's `run_metadata.json` and each delegated team run's `team_run_execution_tree.json` with a `taskAgent` section is converted once; a Settings edit becomes the run's own launch. | Model + settings of the edit kept; **the edit's runtime is lost**; the edit's provenance is dropped (member shows the team's source). | run-file-conversion.ts:52-59, 64-65, 96-102; probe (Reproduced); node 8001 data (Measured) | High |
| BEH-002 | User | Founder (or any user) sends a message to / starts a team whose member has a stored launch whose model is not offered by its stored runtime | Member activation resumes the stored session on the stored runtime with the stored model. | Opaque runtime error (`No conversation found` when the session ID belongs to another runtime; otherwise a provider error); the team cannot use that member; nothing names the cause or the repair. | configured-agent-execution-handle.ts:415-440; node 8001 server.log (2 lines) | High |
| BEH-003 | User | User opens the run's Settings (Agent Configuration / Team settings) | Members show stored runtime + model and their launch source; the "not offered" note exists only for the root. | Mismatch invisible: shows "gpt-6.1-terra · Claude Agent SDK · Inherited from the run". | ExistingRunConfigEditor.vue:28,395-405; screenshots (founder) | High |
| BEH-004 | User | User stops the copy, chooses another runtime and model for the member in Settings and saves | Validated against the chosen runtime's list; binding switches (new session, pending switch, hand-over notice on next input) — autobyteus-348. | Works today once stopped (read, not run). | runtime-selection-rule.ts:31-77; team-run-delegated-launch-plan.ts:20-55 | Medium (read only) |
| BEH-005 | Operational | Restore of a stopped delegated agent run (standalone) | Restore uses the stored pair; no pair check. | Same opaque failure as BEH-002 for the 3 affected agent runs on node 8001. | standalone-agent-run-lifecycle-service.ts:308-330 | High (read) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `run-file-conversion.ts` (`convertAgentRunFile`, `withSelection`, `convertTeamRunFile`) | 461 conversion, also used by the 20261114 follow-ups | Must apply the selection's `runtimeKind` when present and record the edit as a Settings edit | Same-ID correction (guideline §7) |
| `runtime-selection-rule.ts` | The one rule of a runtime switch | The node-8001 data repair must produce exactly what this rule produces (or the exact pre-upgrade binding when the switch was already real) | Repair tool reuses the rule's shape; not product code |
| `run-model-selection-service.ts` / `run-model-selection-refusal.ts` | Model validation per runtime and its one wording | Start-time check reuses them | One owner for the "offered by runtime" fact on the server |
| `configured-agent-execution-handle.ts` / `standalone-agent-run-lifecycle-service.ts` | The two activation owners | Both must refuse a stored unoffered model with a clear message | Inject the validator into the member handle via its factory |
| `ExistingRunConfigEditor.vue` `modelUnavailable(address)` | Web derivation of "saved model not offered" per address | Reuse for members | Pass per-member flag down `ExistingRunSettings → RunMembersSection → RunMemberRow → RunSettingsCard` |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: delegated runs' `memory/agents/<id>/run_metadata.json` and `memory/agent_teams/<id>/team_run_execution_tree.json` (converted by 461).
- Readers/writers: run-history stores; activation owners; Settings Save.

### Structural Surfaces

- Released migration conversion functions (same-ID correction), two activation owners (a pre-activation check), web Settings member rows (an existing note wired for members).
- No API/GraphQL contract change needed for the web note (`modelOptionsByAddress` already carries `currentModel` per address) — to be confirmed by implementation.

### Potential Structural Impacts To Investigate

- API or external-contract change: none expected.
- Persistence schema or invariant change: none (no new field; `launchSource: {origin: "settings"}` already exists in the current schema).
- Security or privacy boundary change: none in product; private-data handling for the node repair (operational).
- Concurrency or lifecycle change: none (check before activation; stopped-run save unchanged).
- Deployment/migration: corrected released migration (same IDs); no new migration.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| Probe: copy `probes/probe-508-runtime-selection.test.ts` to `autobyteus-server-ts/tests/app-data-migrations/delegated-runs-own-runs-v1/`, then `cd autobyteus-server-ts && npx vitest run tests/app-data-migrations/delegated-runs-own-runs-v1/probe-508-runtime-selection.test.ts` | A released selection `{runtimeKind: codex_app_server, llmModelIdentifier: gpt-6.1-terra}` on (1) a member's own edit, (2) a team-level edit reaching a follower, (3) a delegated agent run | All 3 FAIL: converted runtime `claude_agent_sdk` (the started one), model `gpt-6.1-terra` — the founder's exact pair. | Reproduced (real conversion functions; synthetic released-shape input) | REQ-001 | `probes/probe-508-runtime-selection.test.ts` |
| Read-only scan on node 8001 (structure only) | Stored pairs vs model family; last trace runtime; pending switch | See Affected records | Measured | Blast radius (investigation) | `probes/affected-records-scan.js` |
| server.log token count | Operator start | 2 × `No conversation found` | Measured | REQ-004 | (counts only; log not copied) |

- Temporary diagnostics: None. (The probe was run in the worktree's `tests/` folder and moved out into `probes/`; nothing committed in `tests/`. Scan scripts were copied to `/tmp/sd508-*.js` inside the containers — read-only, no writes to data.)
- Reproduction for implementation to start from: `probes/probe-508-runtime-selection.test.ts` (command above). The fix turns it green; the real regression test belongs in `delegated-runs-own-runs-v1-app-data-migration.test.ts` with released-shape fixtures.

## Affected records (counts and identifiers only; Measured 2026-11-17)

Rule (probe `affected-records-scan.js`): a delegated (converted) record whose stored model is not offered by its stored runtime by model family (Codex App Server: `gpt-*`/`codex*`; Claude Agent SDK: not `gpt-*`/`gemini-*`; Antigravity CLI and AutoByteus: not the bare Claude Agent SDK aliases `opus`/`sonnet`/`haiku`/`fable`/`default`). Non-delegated records with such a pair: **0** on every node — every invalid pair is in a run the conversion touched.

| Node | Version | Affected records | Runs | Detail |
| --- | --- | --- | --- | --- |
| 8001 (`autobyteus-server-0`) | 1.5.13-beta.7 (from beta.6) | 16 (all open) | 9 (6 team runs, 3 agent runs) | team P run P-1 /computer_use_operator claude_agent_sdk/gpt-6.1-terra (trace: codex_app_server); team P run P-2 /computer_use_operator claude_agent_sdk/gpt-6.1-terra (pending switch from claude_agent_sdk, never ran after); private team Q run Q-1, 2 members antigravity_cli/sonnet; a software_engineering_team run (S-1): all 6 members autobyteus/opus or sonnet (a team-level edit; /implementation_engineer last ran on claude_agent_sdk); a supervised_research_team run (S-2) /research_supervisor codex_app_server/opus; a supervised_research_team run (S-3) /research_supervisor and /researcher codex_app_server/fable (/researcher last ran on claude_agent_sdk); agent runs A-1 and A-2 (agent_package_creator) codex_app_server/opus (A-2 last ran on claude_agent_sdk), a private agent run (R-1) codex_app_server/sonnet |
| desktop's own node (`~/.autobyteus/server-data`) | 1.5.13-beta.7 | 2 | 2 | a product_team run (D-1) /product_ui_ux_designer codex_app_server/sonnet; a computer_use_operator agent run (D-2) codex_app_server/sonnet |
| 8003 (`autobyteus-server-2`) | 1.5.13-beta.7 | 0 | 0 | — |
| 50433 (`autobyteus-server-1`) | 1.5.12-beta.9 | not converted yet | — | Would be affected if upgraded to beta.7 before the fix |

Totals on node 8001: 92 team runs (27 delegated, all converted) and 99 agent runs (31 delegated). Limits: the family rule finds every *invalid* pair; a lost runtime whose model is also valid on the started runtime (e.g. a `gpt-*` model offered by both AutoByteus and Codex App Server) would leave a valid-but-wrong pair that this rule cannot see; the trace check found no such record among delegated records (the trace-mismatch delegated records are all also invalid pairs).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Founder (Task + comment) | Team running again quickly; stored runtime must survive upgrade/restore; clear UI repair; safe repair of his data with approval + backup | Strong (his words) | REQ-001…REQ-004; FU-001 | Resolved: he repairs his records himself (DEC-003) |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Claude Agent SDK / Claude Code CLI | node 8001 runtime | Resuming a session ID it does not know returns "No conversation found" | server.log (2 lines) | — |
| Model catalogs per runtime | runtime-owned | "Offered" is decided by the runtime's current list; a list that cannot be read is not "not offered" | run-model-selection-refusal.ts | Catalog reachability at start |

## Persisted Data And State Facts

- Affected stored subject: converted delegated runs' own files (see above).
- Location and representative shape: team file `rootTeam.members[].launchConfiguration.{runtimeKind,llmModelIdentifier,llmConfig,…}`, optional `pendingRuntimeSwitch`, optional `launchSource`; agent `run_metadata.json` top-level `runtimeKind`, `llmModelIdentifier`, `llmConfig`, `platformAgentRunId`, optional `pendingRuntimeSwitch`, `launchSource`.
- Volume: node 8001: 27 delegated team runs, 31 delegated agent runs; desktop: 1,260 converted items.
- Readers/writers: run-history stores, activation owners, Settings Save.
- Required semantics to preserve: a user's runtime choice for a run is part of its launch.
- Acceptable loss: none; already-lost values cannot be re-derived from stored data (no originals).
- Constraints: founder's private data — counts and structure only; backup and explicit approval before any write; no copy off the node.
- Remaining evidence gap: run P-2's operator's target runtime is known only from the founder's statement + model family (no trace after the switch); the team Q, R-1, S-2/S-3 and A-1/A-2 targets are inferred from model ids.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/probe-508-runtime-selection.test.ts` | Solution Designer | Reproduction of the conversion defect (fails today) | 3 conversion paths | REQ-001, AC-001…AC-003 | Current | Evidence; no approval needed |
| `probes/affected-records-scan.js` | Solution Designer | Read-only affected-record count (structure only) | any node's `memory/` | Blast radius (investigation) | Current | Evidence; running it on node 8001 again is read-only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Exact pre-upgrade runtime for records without trace evidence | Data repair needs a target | Founder repairs in Settings (DEC-003) | Closed |
| R-001 | Risk | Other beta users / node 50433 upgrading to beta.7 before the fix lose runtimes | Same incident elsewhere | Ship the corrected conversion in the next release (release on founder's word) | Open |
| R-002 | Risk | A start-time model check depends on the runtime's catalog; an unreadable list must not block a start | False refusals | REQ-004 refuses only on "list read, model absent" | Designed |

## Architecture Investigation Findings

- The defect is a local conversion omission in one owner (`run-file-conversion.ts`), which the 20261114 follow-ups inherit (`delegated-runs-preserved-items-v1.ts:62`).
- Activation has two owners (members: `ConfiguredAgentExecutionHandle.prepareActivation`, line 429-440; standalone: `StandaloneAgentRunLifecycleService.restoreStarted`, line 308+). Neither validates the stored pair; the standalone one already receives `modelSelectionValidator` (line 77, 92).
- The member activation failure card (`readiness_failure`, line 415-425) already shows a message on the member's conversation: a clear refusal reaches the user there with no new UI surface.
- The web's per-address "saved model not offered" derivation exists (`ExistingRunConfigEditor.vue:395-405`); only its wiring to member rows is missing.
- Guideline §7: a same-ID correction is the governed way to fix a released conversion for installations that have not run it; successful installations are not replayed.

## Requirement Implications

- The fix has two halves: prevent the loss where it has not happened (corrected conversion), and make the already-happened loss visible and repairable (start-time refusal + Settings note + existing Save repair), plus a one-off approved repair for node 8001.
- An automatic repair migration for already-converted installs is rejected: the lost value is not in the data; inferring it would guess.

## Notes For Architecture Design

- Approved scenarios: SCN-001 (upgrade conversion), SCN-002 (start of a member/run with an unoffered stored model), SCN-003 (Settings shows and repairs), SCN-004 (operational repair of node 8001 with approval and backup).
- Constraints: no new migration ID; registry order unchanged; current schema unchanged; frozen shapes only inside migrations; no old-shape reading in runtime code.

## Scope Decision (2026-11-17, the founder, in the Solution Designer's conversation)

- He repairs his already-converted records himself in Settings (stop the copy, choose runtime + model, Save); no repair of node 8001 data by the team, so no backup or write was needed. Read-only access to node 8001 stopped here.
- Fix the migration itself, under the same ID ("update the existing migration … no need to create a new migration"), so installations that have not upgraded convert correctly.
- Only his installations ran the faulty beta.7 conversion; no stable release carries 461 yet. The corrected conversion must ship before 461 reaches stable (REQ-004).
- The mismatch warning / start-time refusal is FU-001 (non-urgent).
- Requirement IDs in this file's Source Log refer to the approved requirements-doc.md at SR-001; rows marked FU-001 are evidence for the follow-up.
