# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `…/project-tool-split/investigation-notes.md`
- Solution Revision Record: `…/project-tool-split/solution-revision-record.md`
- Design Spec: `…/project-tool-split/design-spec.md` (SR-002)
- Supplemental Task Artifacts: precedent `tickets/done/task-tool-split/` (read-only)
- Design Review Report: `…/project-tool-split/design-review-report.md` (ARCH-REV-001)
- Architecture Review Revision Record: `…/project-tool-split/architecture-review-revision-record.md`
- Implementation Handoff: `…/project-tool-split/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/project-tool-split/implementation-revision-record.md`
- Code Review Report: `…/project-tool-split/code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `…/project-tool-split/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `…/project-tool-split/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `…/project-tool-split/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `…/project-tool-split/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: code review CRR-001 pass
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1
- Branch head at report time: `dec87a3915` (code `285acae39a`, ticket `79c5d2c5ef`, then 3 baseline test fixes and 2 TESTING.md commits by API/E2E, listed below)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`. This round changed three durable test files and TESTING.md (below).

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`. The initial plan was written before execution and updated with results.
- Plan followed: Yes, with the deviations below.
- Deviations during execution:
  - **User direction, mid-run:** diagnose and fix every failure on the worktree, with no base-branch comparison, and correct TESTING.md accordingly. I had already used a base worktree for the first failure (`task-closure-root-visibility`); after the direction I stopped base runs and removed that worktree.
  - **User direction:** real-model testing uses the Claude Agent SDK runtime with Haiku 5.5 (no ChatGPT/Codex quota). The planned LM Studio native-runtime run was replaced by Claude Agent SDK Haiku 5.5 runs.
- Reroute required: No. Every failure found had a test-side cause, fixed here, or was a pre-existing product defect outside the scope, reported to its owner.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Initialized before execution: Yes
- Reconciled into this report: Yes
- Cases not started or interrupted: one base-worktree probe run (PMU-008/021 on base) was stopped by the user while running. It is not evidence and was deleted, and its leftover temp data root was removed.

| Case ID | Final Result | Evidence (under `evidence/api-e2e/`) |
| --- | --- | --- |
| BUILD | Pass | server-build.log, nuxt-prepare.log |
| UNIT-CHG | Pass (9 files, 167 tests) | unit-changed.log |
| TYPECHECK | Pass | server-typecheck.log |
| UNIT-ALL | Pass (709 files, 5744 passed, 7 gated skips) | server-unit-full.log |
| E2E-UNGATED + E2E-AGY | Pass on rerun after baseline fix (17/17 files, 82 passed, 4 skipped); first run 16/17 | server-e2e-projects-agy.log (run 1), server-e2e-projects-agy-2.log (final) |
| WEB-PMU | Pass on final run (25/25) after two baseline fixes; earlier runs 23/25, 24/25, 24/25, 25/25 | probe-pmu*/ (final: probe-pmu-5/) |
| WEB-TCT | Pass (16/16) | probe-tct/ |
| AC5-PROBE-REL / NEW / PACKAGED | Pass | ac005-probe-release-v1.5.5-beta.2.txt, ac005-probe-new-build.txt, ac005-probe-packaged-worktree-build.txt |
| APP-NEW, APP-OLD, APP-MIX, APP-NONE | Pass | app-new/journey/*.json, journey.log |
| REAL-NEW, REAL-OLD, REAL-NONE (Claude Agent SDK, Haiku 5.5) | Pass | app-new/journey/REAL-*.json |
| UI picker / Projects page (worktree build) | Pass | app-new/ui-tool-picker-task-management-open.png, ui-projects-page.png, picker-available-tool-names.json |
| REL-MIX, REL-OLD, REL-NEW, REL-REAL-MIX (v1.5.5-beta.2) | Pass | app-release/journey/*.json, journey.log, picker-available-tool-names.json |
| AC4-OLD-TOOL-XVER | Pass (description and schema byte-identical across versions) | ac004-old-tool-release-vs-new-build.json |

## Compatibility / Legacy Scope Check

- Requirements/design introduce backward compatibility: Yes, by approved requirement REQ-004 / DEC-002 (`create_or_update_project` kept for the transition, removal FU-2).
- Compatibility-only behavior in implementation: only that approved thin dispatcher. No other retained path was observed.
- Persisted-data decision (`Not Affected`) followed: Yes. A package agent listing only the old name (the PTM shape) works unchanged in the new build (APP-OLD, REAL-OLD).
- Durable coverage for compatibility-only behavior: the existing unit and boundaries cases prove REQ-004 and are scheduled for removal in FU-2. I added none.
- Reroute classification: n/a

## Acceptance-Criteria Proof

- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/evidence/api-e2e/`

| AC | Critical | Proven By | Evidence Files | Result |
| --- | --- | --- | --- | --- |
| AC-001 `create_project` creates; errors | Yes | UNIT-CHG/ALL; E2E boundaries, node-locality, project-change-feed (`create_project` call); APP-NEW in the packaged app (create with workspace; `project_id` → `PROJECT_TOOL_ARGUMENT_INVALID` "Unsupported tool argument."; blank name → `PROJECT_NAME_REQUIRED`; no Project from rejected calls); REAL-NEW (Haiku 5.5 chose `create_project`) | unit-changed.log, server-e2e-projects-agy-2.log, app-new/journey/APP-NEW.json, REAL-NEW.json, ui-projects-page.png | Proven |
| AC-002 `update_project` patches; errors | Yes | UNIT; E2E boundaries, node-locality; APP-NEW (rename + description, omitted workspaces kept, supplied list replaces all, `[]` unlinks all, no change → `PROJECT_PATCH_REQUIRED`, missing id → `PROJECT_TOOL_ARGUMENT_INVALID` "project_id must be a non-empty string."); REAL-NEW (Haiku 5.5 chose `update_project`) | same | Proven |
| AC-003 exactly the listed tools, none automatic; collision | Yes | UNIT parity (AutoByteus, Codex, Claude) + MCP catalog collision unit + boundaries collision e2e. In the real app, the scoped MCP `tools/list` per agent was: new-only → `create_project`, `update_project`; old-only → `create_or_update_project`; none → no mutation tool. Every unlisted call is refused with `MCP error -32602: Tool is not enabled for this session`. REAL-NONE: Haiku 5.5 reports it has no tool to create a Project, and none is created | app-new/journey/APP-*.json, journey.log, REAL-NONE.json | Proven. AutoByteus-native is covered by unit parity and the packaged-server resolver probe; no native agent was run in the app (see Residual) |
| AC-004 old tool unchanged in the new app | Yes | UNIT byte pins; boundaries e2e old-name calls; APP-OLD (create, patch, `PROJECT_PATCH_REQUIRED`, `PROJECT_NAME_REQUIRED`, unknown key → `PROJECT_TOOL_ARGUMENT_INVALID`); REAL-OLD (Haiku 5.5 with the PTM-shaped agent); the old tool's MCP description and schema byte-identical between v1.5.5-beta.2 and the new build | app-new/journey/APP-OLD.json, REAL-OLD.json, ac004-old-tool-release-vs-new-build.json | Proven |
| AC-005 transition list in both versions | Yes | Module probe on the exact v1.5.5-beta.2 release (downloaded; sha512 matches `latest-mac.yml`) and on the new build, plus the packaged worktree build. Real app on v1.5.5-beta.2 (REL-MIX): the transition agent launches without error and is exposed only `create_or_update_project`; a call works, and `create_project` is refused (`Unknown MCP tool`). REL-NEW: the new-only agent launches without error and has no mutation tool. REL-REAL-MIX: Haiku 5.5 uses `create_or_update_project`. Real app on the new build (APP-MIX): all three are exposed and callable | ac005-probe-*.txt, app-release/journey/*.json, app-new/journey/APP-MIX.json | Proven |
| AC-006 real-app check with a test data package | Yes | LOCAL_PATH package `test-package/` (4 agents) imported with `importAgentPackage` into isolated instances of the worktree's packaged build and of v1.5.5-beta.2. The new-tools agent and the old-only agent each create and update Projects, scripted and with Haiku 5.5. The tool picker lists the new tools; the Projects page shows the results | app-new/*, app-release/*, test-package/ | Proven |
| AC-007 descriptions, docs, release notes | No (review) | Served descriptions (APP-NEW): one meaning each, no other tool named. `projects.md` (server and web) list the tools and mark the old one deprecated. `release-notes.md` carries the upgrade note | app-new/journey/APP-NEW.json | Proven |

## Changed Boundary And Evidence Matrix

| Case ID | IDs | Boundary | Surface | Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-CHG / UNIT-ALL | AC-001..004, 007 | contract, native/MCP parity, exposure, collision | vitest | Durable | Pass | unit-changed.log, server-unit-full.log |
| E2E projects (gated, scripted AGY) | AC-001..004 + regression | real HTTP/WS/scoped MCP, built nodes | vitest e2e, clean env | Durable | Pass (final) | server-e2e-projects-agy-2.log |
| WEB-PMU / WEB-TCT | regression | renderer + real backend | browser probes | Durable | Pass (final) | probe-pmu-5/, probe-tct/ |
| AC5 module probes | AC-005 | tool resolution in release, worktree and packaged builds | node probe | Temporary | Pass | ac005-probe-*.txt |
| APP-* / REAL-* | AC-001..006 | packaged worktree app: package import, run launch, scoped MCP, real tools, Claude runtime | isolated desktop instance | Temporary | Pass | app-new/ |
| REL-* | AC-005 | v1.5.5-beta.2 app: same | isolated desktop instance | Temporary | Pass | app-release/ |

## Additional Repository Coverage Execution

- `tests/integration/agent/agent-status-websocket.integration.test.ts` was run alone to verify the TESTING.md exception: 2 of 7 cases fail. I traced the cause to a product defect (Failures table). Evidence: integration-agent-status-websocket.log.

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Change | New / Final Support | Residual |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 90% | 96% | +6 | every critical AC directly proven, AC-005/006 in real apps of both versions | AutoByteus-native agent run not in the app |
| Changed-boundary directness | 92% | 95% | +3 | real scoped MCP sessions, real tool calls, packaged server resources | native tool execution only via unit and resolver probe |
| Cross-boundary integration realism / mock gap | 85% | 95% | +10 | packaged app, exact release binary, real Haiku 5.5 inference, real package import | scripted AGY CLI stands in for a model in the deterministic cases |
| Environment / fixture fidelity | 90% | 96% | +6 | isolated instances with own data roots; checksum-verified release; clean-env E2E | host load (avg 60–170) caused timing flakes, now fixed in the tests |
| Failure / edge / lifecycle | 92% | 95% | +3 | all error codes in the real app; refusals in both versions; instance restart applying settings | no app restart after Project writes (covered by node-locality e2e) |
| User-surface / desktop confidence | 85% | 95% | +10 | tool picker and Projects page in the packaged app; probes 25/25, 16/16 | release picker checked via its GraphQL list only |
| Durable regression quality | 92% | 94% | +2 | three timing/stale-fixture defects in suites fixed with causes | real-app journeys stay ticket-owned (cross-version by nature) |

- Overall post-repository confidence: 89%
- Overall final confidence: **95%** (simple average of 96, 95, 95, 96, 95, 95, 94 = 95.1)
- Confidence change produced by broader validation: +6
- Every critical AC directly proven apart from parts only the user can check: Yes
- Any final category below 90%: No
- Default 95% target met: Yes
- Confidence-limiting residual risks: (1) no AutoByteus-native agent run in the app. Native registration is proven in the packaged server (registry probe) and native/MCP parity by unit tests, but no real model called a native tool. (2) Codex runtime not exercised live: the user has no ChatGPT quota. MCP exposure for Codex is covered by unit parity, and its server path is the same one the AGY and Claude runs used.

## Broader Validation Decision And Execution

- Decision: `Required`; mode `Project Desktop Validation` (isolated instances of the worktree's packaged build and of the downloaded v1.5.5-beta.2 release) plus temporary module probes.
- Startup and setup, as documented in TESTING.md and `docs/isolated-app-instances.md`:
  1. `pnpm --silent isolated-app start --build` for the worktree, and `start --app <unzipped release>` for v1.5.5-beta.2.
  2. Scripted AGY through the server's own settings API (`updateServerSetting ANTIGRAVITY_CLI_COMMAND=evidence/api-e2e/agy-scripted-*.sh`), then `isolated-app restart`.
  3. Package imported with `importAgentPackage(LOCAL_PATH)`.
  4. Journeys run with `node evidence/api-e2e/app-journey.mjs`.
  5. UI observed by attaching browser automation to the instance's control port.
- Environment: no provider keys were imported. Claude Agent SDK uses the host Claude login (the embedded server receives the system-baseline HOME). Model `haiku` = "Haiku 5.5" in the instance catalog. The user's app, data and other engineers' instances were not touched.

| Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Import package (both versions) | 4 agents with their tool lists | 4 definitions, tool lists as written | app-*/journey/agent-definitions.json | Pass |
| New build, scripted | exposure per list; results and errors as designed | as expected | app-new/journey/APP-*.json | Pass |
| New build, Haiku 5.5 | model picks the listed tool; no-tool agent refuses | `create_project`+`update_project`; `create_or_update_project`; refusal, nothing created | REAL-*.json | Pass |
| New build UI | picker lists new tools; Projects page shows results | yes | ui-*.png | Pass |
| Release, scripted + Haiku | transition list launches; old tool only | as expected | app-release/journey/*.json | Pass |

## Platform / Runtime Targets

- macOS 26 (Darwin 25.5.0) arm64; Node 22.23.1; packaged AutoByteus (worktree, enterprise flavor) and AutoByteus personal v1.5.5-beta.2; Claude Code 2.1.302 (Claude Agent SDK, Haiku 5.5); scripted AGY CLI fixture; headless Chrome for probes.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Persisted-data decision: `Not Affected`. Existing configurations naming only the old tool work in the new build (APP-OLD, REAL-OLD), and a mixed list works in the release (REL-MIX). Instance restart applied the new server setting on both versions. No version-specific runtime branch or fallback was observed.

## Durable Coverage Changed In The Codebase

All are baseline fixes under TESTING.md Rule 9. Each is its own commit and none is caused by this ticket's change.

| Path | Commit | Change | Cause | Result |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` | `0205b9ed79` | the wait now covers both Manager messages the assertion needs | two `send_message_to` turns; the wait was satisfied by the first. Reproduced deterministically by delaying the second message (all 3 roots failed with the same assertion) | Pass alone ×3; full folder 17/17 |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` | `50f228811f` | PMU-008 opens the Team member that exists (`/manager`) | `938933d8e2` removed the Team's `worker`/`helper` members; PMU-008 still waited for `/worker` (failed on every run) | PMU-008 Pass; full 25/25 |
| `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs` | `dec87a3915` | PMU-021 reads center baselines only after the host conversation settles, right before each action; failures report the first text difference | baseline read before the Manager's delegation reply arrived, and the keyboard check reused it ~10 s later in a live conversation | full 25/25 twice |
| `TESTING.md` (testing guideline, user-directed) | `1c7eb70151`, `7af116e8de` | Rule 9: find the cause on the worktree and fix it, with no base comparison; "Green server suites" wording; standing "Known baseline exception" removed | user direction; the exception's cause is now known and tracked (PB-001) | n/a |

- Attached for test-code review: Yes. Removed paths: none.

## Other Execution Artifacts

| Path | Type | Retained / Temporary |
| --- | --- | --- |
| `evidence/api-e2e/app-journey.mjs` | real-app journey script | Retained (temporary method) |
| `evidence/api-e2e/test-package/` | LOCAL_PATH test agent package | Retained |
| `evidence/api-e2e/agy-scripted-{new,release}.sh` | scripted AGY wrapper for isolated instances | Retained |
| `evidence/api-e2e/tcrv-timing-injection*.diff` + logs | deterministic reproduction of the task-closure race | Retained |
| `evidence/api-e2e/followup-agent-input-state-flushes-content-cadence.md` | product-defect report | Retained |
| probe output dirs | evidence.json, logs; passing screenshots kept only for the final runs (size) | Retained |

## Temporary Execution Methods / Scaffolding

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| `ac-005-tool-resolution-probe.mjs` on three server builds | module-level resolution in each version | Pass | throwaway HOMEs removed |
| `app-journey.mjs` against two isolated instances | real-app AC-003..006 on both versions | Pass | instances stopped, data roots removed |
| base worktree `../project-tool-split-api-base` | used before the user's direction for the first failure | superseded | `git worktree remove` + prune |
| temporary diagnostic edits (integration test, cadence scheduler) | trace the TESTING.md exception's cause | cause found | reverted (`git status` clean for those paths) |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| AGY CLI | repository scripted fixture (`agy-failure-cli.mjs`, `linked_skills`) | deterministic real tool calls without inference | proves transport and tool path, not model behavior; the Haiku 5.5 runs cover model behavior |

## Failures And Out-Of-Scope Observations

| Item | Result | Cause | Owner / Follow-up |
| --- | --- | --- | --- |
| `task-closure-root-visibility` 2/3 under full-folder load | Fixed (`0205b9ed79`) | test wait weaker than its assertion | done |
| PMU-008 | Fixed (`50f228811f`) | stale probe after `938933d8e2` | done |
| PMU-021 (full runs only) | Fixed (`dec87a3915`) | stale and unsettled center baseline | done |
| `agent-status-websocket.integration` 2/7 (was the TESTING.md "known exception") | Fails; product defect, not caused by this ticket | `AGENT_INPUT_STATE` published after every dispatched batch (`6908ccff48`) flushes the egress content window (`3b5144a0be`), so server-side 500 ms cadence never coalesces. Traced by stack trace | `/project_task_manager`: tracked as PB-001 (existing Task, extended with the cause) |
| `task-copy-idle-lifetime` (seen once, on the base run only) | not seen on the branch in two full runs | the base run's "Antigravity model discovery timed out" under host load avg ≈ 60; not investigated further after the user's direction ended base runs | none filed; it passed in both branch runs |
| instance log noise | Info | Prisma update banner, first-launch "memory file missing", Electron GPU/network-service restart, Ollama not running, Claude SDK `canUseTool` warning | not failures |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| isolated instances `iso-54116-770a` (worktree) and `iso-54883-ce19` (release) | mine | `isolated-app stop` | stopped; data roots removed; ports released |
| downloaded release `/tmp/pts-release-beta2.*` | mine | deleted | removed |
| base worktree | mine | `git worktree remove --force` + prune | removed |
| interrupted base probe's data root | mine | deleted | removed; no listeners left |
| probe stacks | probe-owned | probe cleanup receipts | all `terminated`, `dataRootRemoved: true` |
| throwaway HOMEs, temp backups | mine | deleted | removed |
| other engineers' recorded instances, user's app and data | not mine | untouched | — |

## Preliminary Classification

Not applicable (result Pass).

## Latest Authoritative Result

- Result: **Pass**
- Final validation confidence: 95%
- Default 95% target met: Yes
- Any final category below 90%: No
- Broader validation decision: Required; executed (isolated instances of the worktree build and of v1.5.5-beta.2, scripted and Claude Agent SDK Haiku 5.5)
- Critical acceptance criteria lacking direct proof: None
- Behavior only the user can check: None for this ticket. The FU-1 PTM package update and the FU-2 removal timing remain the user's decisions, as recorded upstream.
- Next recipient from get_handoff_rules: `/software_engineering_team/code_reviewer` (proportional test-code review)
