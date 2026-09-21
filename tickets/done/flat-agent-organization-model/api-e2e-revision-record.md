# API/E2E Revision Record

The latest `api-e2e-coverage-investigation.md` and
`api-e2e-execution-coverage-report.md` remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer `CRR-008` Pass / first completed API/E2E round | `RER-019` cumulative requirements; `AD-REV-006`; `ARCH-REV-004`; `IR-008`; `CRR-008` | N/A | `Fail / 81.3%` |
| API-REV-002 | Code Reviewer `CRR-011` Pass / cumulative real-system rerun | `RER-021`; `AD-REV-007`; `ARCH-REV-005`; `IR-011`; `CRR-011` | `Fail / 81.3%` | `Fail / 92.3%` |
| API-REV-003 | Code Reviewer CRR-013/014 / cumulative real-system rerun | RER-021; AD-REV-007 / ARCH-REV-005 at execution gate; IR-012; CRR-013/014 | Fail / 92.3% | Fail / 92.9% |
| API-REV-004 | Code Reviewer CRR-017 / cumulative real-system rerun | RER-021; AD-REV-011; ARCH-REV-009; IR-016; CRR-017 | Fail / 92.9% | Pass / 98.1% |
| API-REV-005 | Code Reviewer CRR-019 / integrated cumulative renewal | RER-021; AD-REV-011; ARCH-REV-009; IR-017; CRR-019; DR-001 integration recovery | Pass / 98.1% | Fail / 93.1% |
| API-REV-006 | Code Reviewer CRR-025 / cumulative IR-021 renewal | RER-023; AD-REV-012; ARCH-REV-010; IR-021; CRR-025 | Fail / 93.1% | Pass / 97.9% |
| API-REV-007 | Code Reviewer CRR-030 / localized cumulative IR-025 renewal | RER-023; AD-REV-012; ARCH-REV-010; IR-025; CRR-030 | Pass / 97.9% | Fail / 86.9% |
| API-REV-008 | Code Reviewer CRR-032 / browser-safe recovery and cumulative IR-026 renewal | RER-023; AD-REV-012; ARCH-REV-010; IR-026; CRR-032 | Fail / 86.9% | Pass / 98.4% |
| API-REV-009 | Code Reviewer CRR-034 / canonical launch and unified-history IR-027 renewal | RER-024; AD-REV-014; ARCH-REV-012; IR-027; CRR-034 | Pass / 98.4% | Fail / 87.0% |
| API-REV-010 | Code Reviewer CRR-036 / IR-028 route/config renewal | RER-024; AD-REV-014; ARCH-REV-012; IR-028; CRR-036 | Fail / 87.0% | Pass / 98.3% |
| API-REV-011 | Code Reviewer CRR-038 / DS-027 summary-parity renewal | RER-025; AD-REV-016; ARCH-REV-014; IR-029; CRR-038 | Pass / 98.3% | Fail / 95.7% |
| API-REV-012 | User-requested same-artifact confirmation | RER-025; AD-REV-016; ARCH-REV-014; IR-029; CRR-038; API-FIND-018 | Fail / 95.7% | Fail / 96.6% |
| API-REV-013 | Code Reviewer CRR-040 / IR-030 cumulative renewal | RER-025; AD-REV-016; ARCH-REV-014; IR-030; CRR-040; API-FIND-018 | Fail / 96.6% | Pass / 98.4% |
| API-REV-014 | Code Reviewer CRR-042 / IR-031 communication-observability renewal | RER-026; AD-REV-018; ARCH-REV-016; IR-031; CRR-042; API-FIND-019 | Pass / 98.4% for API-REV-013 scope, then reopened | Fail / 87.0% |
| API-REV-015 | Code Reviewer CRR-044 / IR-032 status-traversal and cumulative renewal | RER-026; AD-REV-018; ARCH-REV-016; IR-032; CRR-044; API-FIND-020 | Fail / 87.0% | Fail / 92.0% |
| API-REV-016 | Code Reviewer CRR-045 / same-artifact correlated runtime rerun | RER-026; AD-REV-018; ARCH-REV-016; IR-032; CRR-044/045; API-FIND-021 | Fail / 92.0% | Pass / 97.6% |
| API-REV-017 | User-requested fresh full-ticket rerun | RER-026; AD-REV-018; ARCH-REV-016; IR-032; CRR-044/045/046 | Pass / 97.6% | Fail / 80.3% |
| API-REV-018 | Code Reviewer CRR-048 / IR-033 fresh cumulative rerun | RER-026; AD-REV-018; ARCH-REV-016; IR-033; CRR-048; API-FIND-022 | Fail / 80.3% | Fail / 87.4% |
| API-REV-019 | Code Reviewer CRR-050 / IR-034 complete fresh cumulative retest, resumed after user reboot | RER-026; AD-REV-018; ARCH-REV-016; IR-034; CRR-050 | Fail / 87.4% | Pass / 95.4% |

| API-REV-020 | Code Reviewer CRR-054 / IR-035–036 complete fresh merged-artifact matrix | RER-026; AD-REV-018; ARCH-REV-016; IR-035–036; CRR-054; stopped-run-compatible-model | Pass / 95.4% (API19 historical IR034) | Fail / 76.0% |

| API-REV-021 | User-requested same-failing-artifact double confirmation; CRR-055 | RER-026; AD-REV-018; ARCH-REV-016; IR-035–036; CRR-055; API-FIND-027 | Fail /76.0% (API20 full same-artifact matrix) | Fail /76.0% (focused confirmation) |

| API-REV-022 | CRR-057 / IR037 full renewed merged-artifact matrix; AAV001 | RER026; ADREV018; ARCHREV016; IR001–037; CRR057 | Fail76.0% (API21 old-artifact confirmation) | Fail86.6% — Requirement Gap; no new implementation defect |

| API-REV-023 | Architecture RER027/AAV001 assertion-only return; retained API22 matrix | RER027; ADREV018; ARCHREV016; IR037; CRR057; AAV001 resolution | Fail86.6% (API22 requirement hold) | Pass96.0% — retained-evidence adjudication, no new full rerun |

| API-REV-024 | CRR058 / full renewed merged-artifact RER028 matrix | RER028; ADREV019; ARCHREV017; IR001–038; CRR058 | Pass96.0% (API23 historical adjudication) | Pass95.9% — fresh cumulative execution |

| API-REV-025 | CRR060–062 / full field-free authoring and compact UI renewal | RER032; AD022; parentARCH019; IR001–041 | Pass95.9% (API24 historical) | Fail78.3% |

| API-REV-026 | CRR064 / IR042 fresh full renewal | RER032; AD022; parentARCH019; IR001–042 | Fail78.3% | Fail79.0% |

| API-REV-027 | CRR066 / IR043 fresh full cumulative renewal | RER032; AD022; parentARCH019; IR001–043 | Fail79.0% | Pass95.6% |

| API-REV-037 | CRR088 Pass / full current cumulative renewal | RER033; AD026; ARCH023Pass; AAV003; IR001–058; CRR088 | Fail /78.6% | **Fail /69.3%** |
| API-REV-038 | Code Reviewer CRR-090 cumulative renewal | RER033 / AD028 / ARCH025 / AAV003 / IR001–059 | Fail /69.3% | Fail /85.6%;2acceptedexceptions,1unwaivedOpenfailure |

## Revision Entries

### API-REV-001 — Real AgentTeam/AgentOrg/Codex/browser baseline

- Triggering role, report path, and round: Code Reviewer `CRR-008` cumulative Pass at `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/code-review-report.md`; first completed API/E2E round.
- Triggering finding or scenario IDs: user-required complete `PKG-*`, `TEAM-*`, `ORG-*`, `RST-*`, `API-*`, `PERSIST-*`, `MIG-*`, `UI-*`, and `CLEAN-*` plan; previous source finding `CR-FIND-007` resolved before entry.
- Related architecture-design, architecture-review, implementation, code-review, or delivery revision IDs: `AD-REV-006`, `ARCH-REV-004`, `IR-008`, `CRR-008`; Delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: this is the first completed result after the earlier browser discovery stopped for `ADI-007` architecture recovery. It establishes authoritative repository plus real-system evidence across standalone Team and AgentOrg rather than inferring a prior result from the stopped attempt.
- Coverage decisions or durable test paths changed:
  - Updated `autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts` from obsolete recursive Team assertions to current flat Team V2 and current admission/readiness composition.
  - Updated `autobyteus-server-ts/tests/integration/agent-team-execution/team-conversation-target-websocket.integration.test.ts` to provide the explicit isolated Org handler dependency while preserving exact Team targeting assertions.
  - Added/updated the retained real-user fixture README and detailed `TEST-MANIFEST.md`.
- Scenarios added, changed, removed, or rechecked: no scenario was removed. The baseline added real package import, standalone Team, AgentOrg, ordinary message routing, formal tasks, two-family GraphQL/persistence, route release, shutdown/restart/history/restore/continue, migration, desktop/narrow UI, and cleanup scenarios. Critical failures stopped selected later steps, which are recorded `Not Tested` rather than passed.
- Commands, environment, fixture, or broader-validation delta: executed contract packages, focused/cumulative server and web suites, server/web/application builds, then an isolated built backend and production Nuxt bundle on owned ports with the retained package, AutoByteus Chromium `open_tab`, real Codex App Server, `gpt-5.6-sol`, low reasoning, same-data server restart, strict GraphQL/filesystem capture, and owned-resource cleanup.

#### Prior Failure Resolution

No prior completed API/E2E failure applies. The earlier stopped discovery's
architecture finding `ADI-007` was rechecked and is resolved: the current Org
uses accepted Agent/Team event monitor/composer surfaces, has no raw protocol
cards, scopes mounted Team controls correctly, and places Stop Org on the
history root.

- Canonical artifacts and sections updated:
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-001/resumed-crr008/`
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail / 81.3%`
- New or remaining failure IDs:
  - `API-FIND-001` — Brief Studio validator/package build lacks the current AgentOrg directory composition.
  - `API-FIND-002` — corrected after `CRR-009`: stale test used obsolete `owner.teamIdentity` and retired root expectation; current `collaborationIdentity`/discriminated-root test passes `1/1`, with production admission unchanged.
  - `API-FIND-003` — corrected after user query: fixture omitted `agent-config.json` and task lifecycle `toolNames`; formal task transitions are `Not Tested`, and this is an API/E2E-owned fixture validity issue rather than an implementation defect.
  - `API-FIND-004` — corrected after `CRR-009`: graceful shutdown makes the Org inactive, so stale-stream Reconnect correctly fails closed; the supported path is Refresh history -> inactive row -> explicit Restore. Only Restore remains failed under `API-FIND-005` / `CR-FIND-009`.
  - `API-FIND-005` — clean Org restore fails for a never-messaged idle member because its persisted Codex thread has no rollout.
  - `API-FIND-006` — successful Org launch does not expose/expand the new active history tree without manual multi-level expansion.
  - `API-FIND-007` — user clarified that each mounted Team row inside an Org must retain its aggregate status indicator from the original Team tree; current implementation and approved prototype omit it.
- Recommended recipient: `/software_engineering_team/code_reviewer` for focused failure-origin review; dynamic handoff rules remain authoritative.
- Remaining risks, blocked evidence, or untested scope: corrected-fixture Team/Org formal submission, fresh task-Team, and formal revision/acceptance; live create/edit and all controlled invalid-admission/degraded-startup cohorts; every nontrivial separate process migration cohort; and true `390x844` browser execution. These were stopped after critical failures and are not inferred from durable coverage.


#### Post-Result Factual Correction — Task Tool Configuration And Team Status

- The user asked whether the API/E2E Agents had actually been configured with
  `submit_task_result`. Audit proved they had not: the fixture had no
  `agent-config.json`, while automatic member exposure adds only handoff,
  message, and delegation tools. `API-FIND-003` is therefore corrected from a
  claimed production defect to an API/E2E-owned invalid fixture / Not Tested
  result. This correction does not create `API-REV-002` because no new execution
  round has completed.
- The user also supplied original-branch visual evidence that a Team row has an
  aggregate status dot in addition to its child Agent dots, and explicitly
  requires that affordance on mounted Team rows inside AgentOrg. The current
  production screenshot lacks it, and the approved prototype/spec did not make
  it explicit. This is recorded as `API-FIND-007` for Product/architecture
  incorporation.
- Evidence: `api-e2e-evidence/API-REV-001/resumed-crr008/api/post-run-task-tool-fixture-audit.md`, user screenshot `ctx_8cd213e66142__image.png`, and current screenshot `ORG-005-direct-agent-conversation.png`.


#### CRR-009 API/E2E-Owned Correction Delta (No API-REV-002 Yet)

- Trigger: Code Reviewer `CRR-009 / Fail — mixed origin`.
- Updated durable test:
  `autobyteus-server-ts/tests/integration/application-backend/brief-studio-agent-tool-mcp.integration.test.ts`.
  It now supplies `owner.collaborationIdentity` and asserts the current
  discriminated root identity. Focused result: `1 file / 1 test passed`.
- Prepared but did not execute
  `api-e2e-fixtures/aorg-api-rev-002-agent-package`; all four Agents explicitly
  request `submit_task_result` and `review_task_result`, and `PACKAGE.sha256`
  verifies.
- Corrected `API-FIND-004` and the browser transcript to require Refresh ->
  inactive row -> explicit Restore, not automatic reactivation through
  Reconnect. The observed fail-closed Reconnect is expected; `CR-FIND-009`
  remains the independent supported Restore failure.
- No `API-REV-002` entry is created because no new completed validation round
  occurred. Cumulative rerun is gated on implementation source re-review and
  `RER-020` Product/architecture permission. All stopped scopes remain
  `Not Tested`.


### API-REV-002 — Corrected package, real Team/Org tasks, restore, status, and narrow browser

- Triggering role, report path, and round: Code Reviewer `CRR-011 / Pass` at
  `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/code-review-report.md`;
  third investigation / second completed result.
- Triggering finding/scenario IDs: cumulative `PKG-*`, `ADM-*`, `AUTH-*`,
  `TEAM-*`, `ORG-*`, `RESTORE-*`, `RST-*`, `API-*`, `PERSIST-*`, `MIG-*`,
  `STATUS-*`, `UI-*`, `APP-*`, and `CLEAN-001`, with prior
  `API-FIND-001`–`API-FIND-007` rechecked first.
- Related revisions: `RER-021`, `AD-REV-007`, `ARCH-REV-005`, IR-009–011, and
  `CRR-011`; Delivery `N/A`.
- Why recorded: source review cleared the cumulative package and the user
  required a profound real-user rerun across standalone Team and AgentOrg,
  explicit task tools, real Codex, shutdown/restart/history/restore/continue,
  and desktop/narrow browser behavior.
- Coverage decisions/durable paths changed:
  - updated `autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts` to current flat Team V2 and current admission/readiness;
  - updated `autobyteus-server-ts/tests/integration/agent-team-execution/team-conversation-target-websocket.integration.test.ts` for explicit two-family WebSocket composition;
  - updated `autobyteus-server-ts/tests/integration/application-backend/brief-studio-agent-tool-mcp.integration.test.ts` to strict `collaborationIdentity`/discriminated root;
  - added and executed `api-e2e-fixtures/aorg-api-rev-002-agent-package/` with four Agents, two Teams, two Orgs, explicit task tools, manifest, and hashes.
- Commands/environment delta: exact server `9/34`, cumulative server `60/239`,
  cumulative web `32/234`, server typecheck-build/build, web build, Brief Studio
  pack, then isolated built backend/production Nuxt, UI package import, real
  Codex App Server `gpt-5.6-sol` low, real GraphQL/WebSockets/files, same-data
  restart, strict provider-tree comparison, desktop and 390x844 Chromium, and
  cleanup.

#### Prior Failure Resolution

| Prior finding | Current resolution | Evidence |
| --- | --- | --- |
| `API-FIND-001` Brief Studio composition | Resolved; real pack succeeds. | `API-REV-002/repository/brief-studio-build.log` |
| `API-FIND-002` stale MCP test identity | Resolved by API-owned strict harness update; no production relaxation. | exact `34/34` log and changed test |
| `API-FIND-003` invalid task fixture | Resolved; all possible Agents explicitly expose submit/review tools; real tasks submit/accept. | `PKG-005-agent-task-tools.png`, task records |
| `API-FIND-004` wrong restart expectation | Resolved; Refresh -> inactive row -> Restore executed. | `RESTORE-001-inactive-row-after-restart.png` |
| `API-FIND-005` idle provider Restore | Resolved; durable new system-only binding and whole-Org activation; conversed binding/content retained. | strict before/after Org trees |
| `API-FIND-006` active history hierarchy | Resolved at desktop; exact focus executed. | browser transcript/screenshots |
| `API-FIND-007` mounted-Team status | Resolved expanded, collapsed-running, and stopped/offline. | `STATUS-001`–`003` screenshots |

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-002/`
- Prior result/confidence: `Fail / 81.3%`
- Current result/confidence: `Fail / 92.3%`
- Findings at completion, including later factual dispositions:
  - `API-FIND-008`: withdrawn after Architecture classification. The original
    observation mixed in an invalid separate task whose assignee was told to
    review its own result. The isolated supported revision/resubmit completed
    end to end and supported direct shutdown exited 0. Final status:
    `Not Reproduced / invalidly confounded validation evidence`; `No
    Architecture Impact`; no production-owner attribution.
  - `API-FIND-009`: inactive standalone Team lazy restore succeeds but drops the
    triggering user input; immediate retry works.
  - `API-FIND-010`: normal Stop Org leaves the selected main pane indefinitely
    `Connecting to Agent Org...` while history is inactive/Restore.
  - `API-FIND-011`: withdrawn after `CRR-012 / CR-FIND-014`. API/E2E used the wrong narrow interaction; the approved visible strip -> transient drawer -> Org history tree path was not activated. Correct result: `Not Tested`, with no implementation/design attribution.
- Recommended recipient: `/software_engineering_team/code_reviewer` for the mixed-origin package and acknowledgement of the API/E2E factual correction.
- Remaining untested scope: live Org task-Agent and Org task revision/reference
  variants not completed in the cumulative run; live server-owned create/edit
  hidden-field journey; destructive live corrupt-binding copies; distinct
  OS-process repeats for every migration variant; external definition
  publication; Electron shell. Repository coverage is recorded separately and
  no direct live pass is inferred.


#### CRR-012 Factual Correction — Narrow Collapsed Navigation (No New API Revision)

- `CR-FIND-014` is accepted as an API/E2E-owned Local Fix. The retained narrow
  screenshot contains the approved accessible primary-navigation strip. At
  390x844 its buttons open the transient left drawer, and the active AgentOrg
  route mounts `AgentOrgRunHistoryPanel` there.
- API-REV-002 checked the focused-member header and `New Agent` plus while the
  drawer was closed; it did not exercise strip -> drawer -> Org tree. The former
  `API-FIND-011` implementation/design attribution is withdrawn.
- Correct result: `UI-002` exact narrow focus switching is `Not Tested`; no
  dedicated member picker is required. The next permitted cumulative rerun must
  activate the strip, open the drawer, and select an exact different Agent and
  Team through the Org history tree.
- API-REV-002 remains `Fail / 92.3%` because `API-FIND-009/010` are confirmed as
  implementation-owned `CR-FIND-012/013`; at this CRR-012 checkpoint,
  `API-FIND-008` remained Unclear. The later Architecture Final Disposition
  below supersedes that interim state. No new execution occurred, so no
  `API-REV-003` entry is created.

#### Architecture Evidence Probe — `API-FIND-008` Correlated Non-Reproduction (No New API Revision)

- Architecture Designer requested one evidence-only same-task revision/
  resubmission rerun with provider, MCP, task queue, persistence, notification,
  and shutdown correlation. This was not a cumulative API/E2E validation round,
  so `API-REV-002 / Fail / 92.3%` remains authoritative and no `API-REV-003`
  entry is created.
- Exact source: detached artifact HEAD
  `895665929213ddf7c276c9a89af19b975935f128`; observation-only instrumentation
  compiled and built cleanly and was removed after execution.
- Exact task `task_3110f35c97b54ee3b3ae8fddb0f6103e` received a revision and
  successfully resubmitted on the same fresh task AgentRun. The second call
  reached MCP ingress, entered and started the root queue, durably committed,
  published, notified the delegator, returned HTTP `200`, and produced a
  provider tool-success result. The retained task sidecar contains both
  submission records and the intervening review.
- A valid direct `SIGTERM` shutdown after same-data restart/Restore completed all
  supervisor phases and exited `0`; no AggregateError/error tree existed. The
  earlier PTY pipeline Ctrl-C bypassed the application shutdown handler and is
  excluded. Restore's later `interrupted` task transition is retained separately
  and did not occur during second-submit commit.
- Factual disposition: `API-FIND-008` was not reproduced in one fully correlated
  rerun. This does not explain the retained API-REV-002 stall, assign an owner,
  or justify recovery machinery; Architecture retains classification ownership.
- Canonical evidence:
  `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-002/followup-api-find008/correlated-rerun-observed-boundaries.md`.

#### Architecture Follow-Up — Exact Confounding Settlement Reproduction (No New API Revision)

- Architecture identified the original run's separate accepted verifier task as
  a confound: its task-assignee prompt incorrectly instructed that assignee to
  review its own result. A second observation-only probe reproduced the exact
  two-task shape while retaining the clean same-task success above as control.
- The verifier submitted, then its same provider turn emitted the invalid self
  `review_task_result` and remained `waitingOnApproval`. Lead acceptance of the
  verifier task durably committed. Terminal settlement became root FIFO head
  and blocked in provider-turn termination preparation; no backend termination,
  MCP-session deactivation, durable settlement, teardown completion, or head
  release followed.
- The analyst's supported same-task revised `submit_task_result` reached MCP
  ingress, executor, exact Team capability, materialization gate, root task
  engine, and FIFO admission. It did not start because the verifier settlement
  remained head, so analyst persistence did not begin and its durable sidecar
  stayed unchanged for more than 178 seconds.
- Direct `SIGTERM` hung in supervisor `agent_team_runs` for more than 60 seconds
  and required `SIGKILL`. It emitted no AggregateError because the phase never
  rejected; this distinguishes an unresolved close from a separate captured
  provider teardown error.
- At this evidence checkpoint the factual disposition remained
  `Unclear`/Architecture-held. This probe narrowed the boundary without
  assigning implementation/design origin or prescribing recovery machinery;
  the later Architecture Final Disposition below supersedes the interim state.
  API-REV-002 remains `Fail / 92.3%`; no `API-REV-003` is created.
- Canonical evidence:
  `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-002/followup-api-find008-settlement/settlement-correlation-observed-boundaries.md`.

#### Architecture Final Disposition — No Architecture Impact (No New API Revision)

- Architecture classified `API-FIND-008` as a confounded, non-reproduced
  API/E2E validation finding. It establishes no Requirement Gap, Design Impact,
  implementation source defect, or shutdown-design defect.
- Controlling supported-flow evidence: the same task Agent received
  `request_revision`, resubmitted through provider -> exact MCP ingress -> root
  FIFO -> durable sidecar -> in-memory/event -> delegator notification ->
  provider success in about 14 ms. After supported Restore, direct `SIGTERM`
  completed ordered Org -> Team -> Agent shutdown and exited `0` with no
  AggregateError.
- The exact two-task follow-up proves only the confound: the invalid second task
  kept its provider turn live with an unauthorized self-review while terminal
  settlement occupied the root FIFO. Its blocked shutdown is not attributable
  to the supported same-task revision path.
- Final corrected status: `API-FIND-008 = Not Reproduced / invalidly confounded
  validation evidence`; `No Architecture Impact`; no production owner. Future
  recurrence requires a clean supported scenario with retained provider/MCP/
  queue/commit and nested-shutdown correlation.
- `AD-REV-007` and `ARCH-REV-005` remain authoritative; no design artifact or
  architecture revision changed. API-REV-002 remains `Fail / 92.3%` because
  implementation-owned `API-FIND-009/010` (`CR-FIND-012/013`) remain and narrow
  supported focus is still `Not Tested`. No `API-REV-003` is created.
- Consolidated disposition evidence:
  `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-002/api-find008-final-disposition.md`.

### API-REV-003 — Cumulative real Team/Org/Codex/restart validation

- Triggering role, report path, and round: Code Reviewer CRR-013 cumulative
  source Pass and CRR-014 held-origin clearance; API/E2E round 4 at
  api-e2e-execution-coverage-report.md.
- Triggering finding/scenario IDs: prior API-FIND-009/010 and CR-FIND-014
  rechecks; cumulative PKG, TEAM, ORG, RST, API, PERSIST, MIG, UI and CLEAN
  scenarios; new API-FIND-012/013.
- Related revisions: RER-021; execution began against then-authoritative
  AD-REV-007 / ARCH-REV-005; IR-012 source
  3e38be96596432df8e3f459056d908786b5371bd; CRR-013/014; tested artifact
  73a2c06eb14e3c5a7d91322aae7f42dbc4de0e0a.
- Why recorded: this is the completed cumulative real-system rerun requested by
  the user, including a UI-imported deterministic package, standalone Team and
  mounted-Team-under-Org tasks, ordinary messages, real Codex gpt-5.6-sol,
  desktop/narrow UI, real process restart, history, restore, continuation, and
  cleanup. It supersedes API-REV-002 as the current API result.
- Coverage changes:
  - updated team-run-service.integration.test.ts from obsolete recursive Team
    setup to current flat Team V2 and current admission/readiness composition;
  - updated team-conversation-target-websocket.integration.test.ts for the
    current registration signature;
  - updated agent-team-run-manager.integration.test.ts for the current staged
    no-conversation binding result;
  - updated brief-studio-agent-tool-mcp.integration.test.ts for strict
    collaborationIdentity and discriminated root;
  - updated brief-studio-team-config.integration.test.ts for exact
    llmConfig:null serialization;
  - no durable test file or production source was removed/changed.
- Repository evidence: exact server 4 files / 16 tests; focused web 5 / 77;
  corrected stale-harness server 3 / 25; current cumulative server 61 / 270;
  current cumulative web 38 / 281; server build, corrected production web build
  with 16 routes, Brief Studio pack, and pre/post fixture hashes all pass.
- Broader environment: built backend 8437, production Nuxt 3437, isolated data,
  AutoByteus Chromium open_tab, real Codex App Server, gpt-5.6-sol low,
  390x844 narrow pass, application-owned SIGTERM and same-data restart.
- Setup/harness deviations are excluded and retained in
  API-REV-003/live/setup-isolation-note.md and the canonical reports.

#### Prior Failure Resolution

| Prior finding | Prior classification | Current resolution | Evidence |
| --- | --- | --- | --- |
| API-FIND-008 | Not Reproduced / invalidly confounded; No Architecture Impact at CRR-014 gate | Not used as a failure basis. The new API-FIND-012 is a different clean one-task supported mounted-Team case. | API-REV-002 disposition plus API-FIND-012 correlation |
| API-FIND-009 | Implementation Team inactive restore/send ordering | Resolved. One unique inactive first prompt was admitted and answered without retry. | TEAM-INACTIVE-FIRST-PROMPT.png; browser transcript |
| API-FIND-010 | Implementation Org route/context release | Resolved. Stop Org changed to configuration, with no Connecting/Reconnect state. | NARROW-STOP-ORG-CONFIGURATION-390x844.png |
| CR-FIND-014 / withdrawn API-FIND-011 | API/E2E used wrong narrow interaction | Resolved. Exact 390x844 strip -> drawer -> Org tree selected direct Agent, Team coordinator, and nested Agent with no overflow. | NARROW-ORG-DRAWER-VERIFIER-390x844.png; NARROW-ORG-VERIFIER-FOCUS-390x844.png |

- Material successful scenarios:
  - UI package import and explicit lifecycle tools;
  - standalone Team first prompt, ordinary message, same-task revision and
    acceptance;
  - corrected inactive Team first input;
  - Org no-focus, exact direct/Team/nested focus, mounted message, status;
  - browser reload and real-process Org Restore with exact task/history and
    continued conversation;
  - corrected narrow focus and terminal Stop Org;
  - final clean shutdown and source immutability.
- New/remaining failures:
  - API-FIND-012: one supported mounted-Team task durably submitted, revised,
    resubmitted and was accepted; the legitimate task Agent then completed its
    required handoff, after which settlement rejected its exact AgentRun/member
    identity and fail-stopped root task persistence authority. Preliminary
    classification Unclear, likely implementation runtime identity/settlement.
  - API-FIND-013: after same-data restart, both standalone Team V2 packages,
    Team index rows and generic root history remained, but workspaceRunHistory
    returned no Team definitions and the UI exposed no inactive row to Restore.
    Preliminary classification Unclear, likely Team history projection/read
    model/startup.
- Current result/confidence: Fail / 92.9%. This confidence expresses high
  certainty in the evidence and Fail outcome, not release readiness.
- Canonical artifacts:
  - api-e2e-coverage-investigation.md
  - api-e2e-execution-coverage-report.md
  - api-e2e-revision-record.md
  - api-e2e-evidence/API-REV-003/
- Post-execution upstream note: workspace HEAD later advanced to cd75bcdb through
  architecture documents only; production source is unchanged. AD-REV-009 is
  not implemented or independently passed. See post-execution-head-audit.log.
- Recommended recipient: /software_engineering_team/code_reviewer for focused
  failure-origin review of API-FIND-012 and API-FIND-013.
- Remaining/untested scope: full live Org authoring/hidden-field journey,
  destructive binding corruption, direct-Agents-only Org live rerun, every
  migration case as a separate process, external publication, and Electron
  shell. No delivery readiness is claimed.


### API-REV-004 — Cumulative real Team/Org/Codex/restart Pass

- Triggering role, report path, and round: Code Reviewer `CRR-017` cumulative
  source Pass; API/E2E round 5 at `api-e2e-execution-coverage-report.md`.
- Triggering scenario IDs: prior `API-FIND-012` mounted-Team settlement and
  `API-FIND-013` first mixed post-restart history; cumulative repository,
  package, Team, Org, task/message, stream recovery, identity, migration,
  browser, responsive, Stop and cleanup scenarios `LIVE-001`–`LIVE-012`.
- Related revisions: `RER-021`; `AD-REV-011` (AD-REV-009/010 mechanism);
  `ARCH-REV-009 Pass`; `IR-016` source
  `394fc27f896dac4121ef166cc0972b60e8b89ce4`; `CRR-017`; tested artifact
  `b19c41e68c119f9a9590c5b04839454dae5f64b8`.
- Why recorded: this completed cumulative real-system rerun renews the current
  package from repository checks through a UI-imported deterministic package,
  real Codex standalone Team and mounted-Team tasks, two-family API/persistence,
  clean shutdown/restart/history/continuation, provider identity, responsive
  focus/status, explicit Stop Org and cleanup.
- Coverage changes:
  - updated
    `autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts`
    so the API-owned frozen termination fake implements the current root fence
    and staged no-conversation binding contract;
  - retained the four other current API-owned Team/Brief Studio integration
    changes from earlier API revisions;
  - retained and re-hashed the four-Agent/two-Team/two-Org UI-import fixture;
  - no production source or test file was removed.
- Repository delta: corrected affected server cohort `3 files / 16 tests`;
  authoritative server `29 / 163`; exact web `18 / 163`; exact recovery service
  `1 / 13`; production server build/bootstrap, application SDK builds, Brief
  Studio pack, web guards, web production build/prerender of 16 routes and diff
  check passed. The accidental broad Nuxt command passed `440 files / 2444
  tests`; its sole failure is the pre-documented unrelated fixed-px audit.
- Environment delta: isolated ports 8457/3457 and data, `env -i` backend,
  production renderer, AutoByteus Chromium `open_tab`, real Codex App Server
  `gpt-5.6-sol` low, UI import, exact filesystem/API/DOM/process evidence,
  desktop and 390x844, and two direct SIGTERMs.

#### Prior Failure Resolution

| Prior finding | Previous classification | Current resolution | Evidence |
| --- | --- | --- | --- |
| `API-FIND-012` | supported mounted-Team terminal settlement identity failure | Resolved. One exact-address task durably submitted, received one revision, resubmitted on the same task, was accepted and terminally settled; Org remained usable. | `API-REV-004/live/persistence/org-task-record-before-restart.json`; `org-tree-before-restart.json`; mounted-task screenshot |
| `API-FIND-013` | first post-restart Team workspace history missing | Resolved. The first same-data query before browser open returned exact inactive Team and Org roots, Team definition/run and Offline members. | `API-REV-004/live/api/first-post-restart-mixed-history-*` |
| `CR-FIND-014` / withdrawn `API-FIND-011` | API/E2E used wrong narrow interaction | Resolved. Exact 390x844 primary strip -> drawer -> AgentOrg tree selected mounted Team, nested Agent and direct Agent with no overflow. | `NARROW-ORG-*.png`; `process/cdp-narrow-390x844.log` |
| `API-FIND-008` historical | Not Reproduced / invalidly confounded; No Architecture Impact | Not used as a failure basis; clean supported task revision/settlement and both direct shutdowns succeeded. | retained Architecture disposition plus current LIVE-002/003/006/012 |

- Material successful scenarios:
  - imported current package with explicit task tools and immutable sources;
  - standalone Team first prompt, ordinary message, same-task revision/acceptance;
  - AgentOrg no-focus launch, exact direct/Team/nested focus, message routing,
    mounted task settlement and collapsed Team status;
  - active-root SIGTERM, isolated same-data restart, first mixed history read;
  - stopped Team exact first continuation on the same TeamRun;
  - stopped Org terminal history, selection-driven whole-Org restore, exact
    provider-identity policy, byte-identical task sidecar and continuation;
  - exact 390x844 drawer focus, root-only Stop terminal configuration, private
    automatic ERROR recovery authority and final clean shutdown.
- Setup correction: a prematurely suspected `API-FIND-014` was caused by an
  invalid inherited environment (`DATABASE_URL` and package roots overrode the
  owned `.env`). The canonical `env -i` rerun loaded 54 Agents / 2 Teams after
  restart and completed Team/Org continuation. It is retained only under
  excluded setup evidence and is not a product finding.
- Canonical artifacts:
  - `api-e2e-coverage-investigation.md`
  - `api-e2e-execution-coverage-report.md`
  - `api-e2e-revision-record.md`
  - `api-e2e-evidence/API-REV-004/`, including `live/test-case-ledger.md`
- Prior result/confidence: `Fail / 92.9%`.
- Current result/confidence: `Pass / 98.1%`.
- New or remaining failure IDs: `None`.
- Recommended recipient: `/software_engineering_team/code_reviewer` for
  proportional review of the five cumulative API-owned durable test changes.
- Remaining bounded scope: separately owned external definition publication,
  unchanged Electron shell, and destructive corrupt-live-copy injection. Strict
  durable negatives, target admission, production renderer and actual lifecycle
  boundaries are current; these do not block the Pass.


### API-REV-005 — Integrated task-monitor renewal finds mounted-Team live projection failure

- Triggering role, report path, and round: Code Reviewer `CRR-019` cumulative
  integrated-source Pass; API/E2E round 6 at
  `api-e2e-execution-coverage-report.md`.
- Triggering scenario IDs: current artifact renewal `REPO-001`–`REPO-004` and
  `LIVE-001`–`LIVE-013`; latest-base task-monitor path; new `API-FIND-015`.
- Related revisions: `RER-021`; `AD-REV-011` with AD-REV-009/010 mechanism;
  `ARCH-REV-009 Pass`; `IR-017`; `CRR-019`; prior delivery conflict record
  `DR-001`; tested integrated artifact
  `b2c96d6b0eed5ffb3a0eaa503eb7f1cf353e9c9e`.
- Why recorded: API-REV-004 passed the pre-integration artifact. IR-017 merged
  latest-base task-Agent durability and monitor behavior into the flat AgentOrg
  package, so repository and real-system proof had to be renewed rather than
  inherited. The real mounted-Team task panel failed even though the same
  standalone Team path passed.
- Coverage decisions / durable paths changed: no repository-resident test or
  production path was changed by API/E2E in this round. Existing current tests
  remain valid but are insufficient to prove mounted-Team live task-panel
  convergence; a durable mounted scenario is a likely post-fix need, subject to
  focused origin review.
- Scenarios rechecked:
  - current server task/event/lifecycle/API/persistence/migration/negative/
    shutdown/MCP cohort: 31 files / 168 tests Pass;
  - current renderer task monitor/focus/hydration/activity and Team/Org cohort:
    41 files / 379 tests Pass;
  - production server build/bootstrap, web guards, 16-route Nuxt build and
    project-supported Chromium task probe 2/2 Pass;
  - real UI package import, standalone Team first prompt, exact selected task
    hydration/live updates, revision/resubmission/acceptance and settlement
    fallback Pass;
  - fresh mixed Org routing and durable mounted task lifecycle succeeded, but
    live selected Team task-panel convergence failed.
- Environment delta: isolated built backend on 8467, production renderer on
  3467, AutoByteus `open_tab`, UI-imported four-Agent/two-Team/two-Org package,
  real Codex App Server `gpt-5.6-sol` low, GraphQL/WebSocket/MCP/SQLite/files,
  provider traces, screenshots and direct SIGTERM cleanup.

#### Prior Failure Resolution

No unresolved API-REV-004 failure existed. Its `Pass / 98.1%` remains valid only
for the pre-integration artifact and is superseded as the current package result
by API-REV-005. Historical `API-FIND-008` remains Not Reproduced / invalidly
confounded with No Architecture Impact and was not reused as a failure basis.

- New finding: `API-FIND-015` — while a mounted research Team remained selected
  under an active AgentOrg, its task panel stayed `In progress` after the exact
  task durably submitted V1, received a revision and durably resubmitted V2.
  Focus-away/back hydrated the correct Awaiting review state. After durable
  acceptance and task-row settlement, the panel again remained Awaiting review
  until refocus. The standalone Team control advanced continuously in the same
  runtime.
- Preliminary classification: `Local Fix`, likely implementation-owned mounted
  event/projection application. Task lifecycle, provider/MCP, messages,
  persistence, notifications, task status and settlement succeeded; no design,
  LLM, policy, persistence or shutdown defect is inferred before focused review.
- Cumulative stop: `LIVE-005`–`LIVE-012` are Not Tested on the current artifact;
  `LIVE-013` completed only cleanup/immutability. No pass is inferred from
  API-REV-004 for those renewals.
- Cleanup: direct backend SIGTERM exited in 200 ms with `Server closed cleanly`
  and no AggregateError; web/backend stopped, owned ports closed, browser tabs
  were `[]`, fixture hashes passed 18/18, generated setup outputs were removed,
  and `git diff --check` passed.
- Canonical artifacts updated:
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-005/live/test-case-ledger.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-005/`
- Prior result/confidence: `Pass / 98.1%`.
- Current result/confidence: `Fail / 93.1%`.
- New or remaining failure IDs: `API-FIND-015`.
- Recommended recipient: `/software_engineering_team/code_reviewer` for focused
  failure-origin review.
- Remaining untested current-artifact scope: active two-family snapshot, exact
  390x844 focus, planned active-root shutdown state, same-data restart/first
  history, Team continuation, Org restore/provider identity/continuation,
  explicit Stop Org, and live recovery/strict negatives. External definition
  publication and unchanged Electron-shell-only behavior remain bounded scope.


### API-REV-006 — Cumulative real package, Team, AgentOrg and lifecycle validation passes

- Triggering role, report path, and round: Code Reviewer `CRR-025` cumulative
  source Pass; API/E2E round 7 at
  `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-execution-coverage-report.md`.
- Triggering scenarios: REPO-001–005 and LIVE-001–014; mandatory recheck of
  `API-FIND-015`; IR-021 exact-Agent runtime failure/Retry/default abandonment;
  all previously stopped current-artifact lifecycle scopes.
- Related revisions: `RER-023`; `AD-REV-012`; `ARCH-REV-010 Pass`; cumulative
  `IR-001–021`; `CRR-025 Pass`; tested source
  `ee6b793599d57cffed1ee0c900abbc07b552ac6b`; tested artifact
  `c969b480a2aaabf7ae68cd2b576110f2de513ad6`.
- Why recorded: API-REV-005 failed the integrated artifact at mounted-Team live
  task projection and stopped later current-artifact journeys. CR-FIND-022 and
  prior implementation findings were resolved and source-reviewed, requiring a
  full cumulative repository and real-system renewal rather than a delta probe.
- Coverage decisions / durable paths changed: none. Existing current coverage
  remained valid; API/E2E changed no repository test or production source.
- Repository execution: exact runtime/config/hierarchy 17 files / 119 tests;
  cumulative server 31 files / 168 tests; cumulative web 52 files / 467 tests;
  server/web production builds, Brief Studio pack/validate, two guards, Nuxt
  prerender of 16 routes, and the project Chromium task-monitor probe all Pass.
- Real execution: exact package import; desktop/narrow override UI; runtime
  failure/Retry/default/no-stale launch; root/Team/Agent admission; standalone
  Team and mounted-Team message/task revision/acceptance; two-family API;
  390x844 focus/status; clean active SIGTERM/restart; stopped Team continuation;
  whole-Org Restore with provider identity policy and byte-identical task
  sidecar; terminal Stop Org; strict identity negatives; recovery/migration;
  final immutability and cleanup all Pass.
- Environment: isolated built backend on 8487, production renderer on 3487,
  AutoByteus persistent Chromium `open_tab`, UI-imported 18-file four-Agent/
  two-Team/two-Org package, real Codex App Server `gpt-5.6-sol`, GraphQL,
  WebSocket, MCP, SQLite, filesystem and direct process lifecycle.

#### Prior Failure Resolution

| Prior finding | Previous classification | Current resolution | Evidence |
| --- | --- | --- | --- |
| `API-FIND-015` | implementation-owned mounted-Team selected-panel convergence failure | Resolved/not reproduced. With `/research-team` continuously selected, the same task panel advanced 0 -> V1 -> revision/V2 -> accepted Result 2 without focus-away/back; the durable sidecar and settlement fallback were exact. | `API-REV-006/live/mounted-team-observations.json`; `LIVE-007-mounted-team-v1-no-refocus.png`; `LIVE-007-mounted-team-v2-no-refocus.png`; `LIVE-007-mounted-team-accepted-no-refocus.png` |
| API-REV-005 stopped LIVE-005–012 scope | Not Tested on prior artifact | Fully executed in LIVE-005–013: admission, two families, responsive focus, shutdown/restart, Team continuation, Org Restore/identity/task/message, terminal Stop, recovery, strict negatives and migration all Pass. | `API-REV-006/live/test-case-ledger.md`; case-specific observation JSON/API/process evidence |

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-006/live/test-case-ledger.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-006/`
- Prior result/confidence: `Fail / 93.1%`.
- Current result/confidence: `Pass / 97.9%`.
- New or remaining failure IDs: `None`.
- Recommended recipient: `/software_engineering_team/code_reviewer` under the
  reviewed Large/High route; proportional test-code review is not applicable
  because this round changed no durable test code.
- Remaining bounded scope: separately owned external definition publication
  and unchanged Electron IPC/preload/window behavior. Both are outside the
  changed ticket boundary and do not block the Pass.

### API-REV-007 — Localized current artifact passes presentation/runtime but fails real-browser valid-ERROR recovery

- Triggering role/result: Code Reviewer `CRR-030` cumulative source Pass,
  93.4/100; renewed API/E2E required for IR-025.
- Authority: `RER-023`; `AD-REV-012`; `ARCH-REV-010 Pass`; cumulative
  `IR-001–025`; source `5300fd7ac3c6061dfd6e88feb69edd9931ef326e`;
  artifact `5bfc54c11ef82e4fec217c84dc66887965cf98ac`.
- Classification: `Large / High / reviewed`.
- Prior result: `API-REV-006 / Pass / 97.9%` on pre-localization IR-021.
- Why recorded: current normal locale presentation could not be inferred from
  the prior artifact. User-required real Team/Org/Codex/task/restart validation
  also renewed the cumulative critical path and exposed a production browser
  defect missed by durable fake-WebSocket coverage.
- Durable coverage/source changes by API/E2E: none.

#### Executed coverage

- REPO-001–004:
  - exact artifact/source/fixture/resource preflight Pass;
  - localization and audit cohort 17 files / 60 tests Pass;
  - both guards and zero-finding localization audit Pass;
  - production Nuxt build/prerender 16 routes Pass;
  - reviewed AppImage size/SHA exact;
  - retained server 15 files / 61 tests and web 20 files / 202 tests Pass.
- LIVE-001–003:
  - exact 18-entry package imported through Settings;
  - normal Simplified Chinese/English switching;
  - real Agent Team Create/Edit with both native selector groups exactly
    `团队智能体` / `Team Agents`;
  - real AgentOrg shared handoff source/destination groups including exact Team
    root destination;
  - exact user-authored names, canonical addresses and mixed-language When prose
    preserved by GraphQL;
  - desktop and 390x844 geometry/accessibility Pass.
- LIVE-004:
  - real Codex App Server / `gpt-5.6-sol` standalone Team first prompt;
  - whole Org direct-Agent and mounted-Team prompts;
  - mounted Team delegate -> task Agent `submit_task_result` -> coordinator
    `review_task_result` acceptance; exact durable task sidecar and settlement.
- LIVE-005 passing substeps:
  - active SIGTERM exited cleanly;
  - first same-data post-restart API history returned Team and Org inactive;
  - same-ID Org rematerialized with exact real-conversation identity/content;
  - system-only provider was correctly renewed;
  - accepted task sidecar remained byte-identical;
  - continued conversation returned exact marker;
  - normal Stop Org terminal configuration appeared.
- LIVE-006: fixture/source immutability and all owned process/tab/port cleanup Pass.

#### New finding

`API-FIND-016` — valid AgentOrg server ERROR cannot enter approved browser
recovery:

- A production Chromium reload of an inactive exact Org active URL received the
  correlated server frame `ERROR / AGENT_ORG_NOT_ACTIVE`.
- `AgentOrgStreamingService.failClosed` called
  `generation.socket.close(1002, 'Invalid AgentOrg stream')`.
- Chromium threw `InvalidAccessError` because a browser caller may locally close
  only with 1000 or 3000–4999; reserved protocol code 1002 is rejected.
- The call precedes `scheduleTransparentRecovery(detail)`, so no bounded retry
  or exhaustion notice ran and the page remained `Connecting to Agent Org…`.
- Reproduced twice; correlated frame/exception/close and screenshot retained.
- Preliminary classification: implementation-owned frontend Local Fix. No
  Requirement Gap, Design Impact, server/provider/fixture/persistence/migration
  origin, or speculative recovery redesign is inferred.
- Remaining live strict-address negative renewal: Not Tested after the critical
  failure; retained current repository coverage passed.

#### Artifacts / result

- Canonical artifacts:
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-test-case-ledger.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-007/`
- Finding evidence:
  - `API-REV-007/live/API-FIND-016-valid-error-recovery-failure.md`
  - `API-REV-007/live/LIVE-005-stopped-root-correlated-reload-cdp.jsonl`
  - `API-REV-007/live/screenshots/LIVE-005-correlated-error-stuck-connecting.png`
- Prior result/confidence: `Pass / 97.9%`.
- Current result/confidence: **Fail / 86.9%**.
- New/remaining finding: `API-FIND-016`.
- Broader validation: Required and executed.
- Cleanup: complete; ports 8587/3587 closed, tabs `[]`, fixture 18/18, HEAD
  unchanged, `git diff --check` Pass.
- Recommended recipient: dynamic failure rule, expected
  `/software_engineering_team/code_reviewer` for focused failure-origin review.
- Delivery readiness: not claimed.

### API-REV-008 — Browser-safe recovery and cumulative real-system Pass

- Triggering role, report path, and round: Code Reviewer `CRR-032 / Pass`;
  API/E2E round 9 at `api-e2e-execution-coverage-report.md`.
- Triggering finding/scenario IDs: prior `API-FIND-016`; `REPO-001–003` and
  `LIVE-001–006`.
- Related revisions: `RER-023`; `AD-REV-012`; `ARCH-REV-010 / Pass`; cumulative
  `IR-001–026`; `CRR-032`; source
  `3199ba081ad450be72fba239fe86e76c0c697a33`; artifact
  `06a918c71fc192e0b4ed9c3ef6b4df7163aef530`.
- Why recorded: API-REV-007 directly found that production Chromium rejected
  client close code `1002` before automatic recovery could schedule. IR-026 and
  CRR-032 corrected and reviewed the exact ordering/code boundary. The Large/High
  cumulative package then required renewed real execution rather than inheriting
  the preceding artifact's material passes.
- Durable test/source paths changed by API/E2E: none. The implementation's
  reviewed service/spec pair was rerun; an evidence-only CDP observer was retained
  at `api-e2e-evidence/API-REV-008/live/LIVE-004-recovery-cdp-probe.mjs`.
- Coverage delta:
  - exact current recovery 5 files / 25 tests, native Chromium close-code probe,
    both web guards and zero-finding localization audit;
  - retained server 15 files / 61 tests and web 37 files / 263 tests;
  - production renderer build/prerender 16 routes and exact AppImage provenance;
  - actual `open_tab` package import, new Team and mixed Org creation, zh-CN/en
    handoff authoring and exact Unicode GraphQL persistence;
  - real Codex `gpt-5.6-sol` standalone Team and Org conversations, mounted-Team
    delegate/submit/review/accept task, live Team status and monitor fallback;
  - application SIGTERM, same-data restart, mixed history, Restore, provider
    identity semantics, task durability, three continuations and terminal Stop;
  - production-Chromium valid ERROR correlation and bounded exhaustion;
  - exact wrong-address/wrong-AgentRun negatives followed by valid context use,
    migration reconciliation and complete cleanup.
- Setup delta: a missing generated SDK prerequisite was built and the unchanged
  server cohort rerun. Short-lived processes reaped before product mutation were
  replaced by foreground owned PTYs. Both setup corrections and original logs
  are retained rather than hidden.

#### Prior Failure Resolution

| Prior failure | Previous classification | Current resolution | Evidence |
| --- | --- | --- | --- |
| `API-FIND-016` / LIVE-005 | implementation/frontend Local Fix; valid ERROR called reserved `close(1002)` before recovery scheduling, causing `InvalidAccessError` and permanent Connecting | **Resolved.** Real production Chromium saw six valid ERROR generations; every client close was legal code `4000`; no browser/runtime error or permanent Connecting occurred; exactly one notice remained after bounded exhaustion and there was no Reconnect control. Current direct success coverage proves complete verified replacement publication and notice clear. | `API-REV-008/live/LIVE-004-stopped-root-recovery-cdp.jsonl`; `LIVE-004-stopped-root-recovery-summary.json`; screenshot; `repository/web-recovery-focused.log`; `repository/browser-close-contract.log` |
| API-REV-007 strict current-address negative left Not Tested | execution stopped after the critical recovery failure | **Resolved / Pass.** Wrong address and wrong AgentRun each failed closed; immediately following exact projection and checkpoint succeeded. | `API-REV-008/live/LIVE-005-negative-and-migration-observations.json`; request/responses |

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-test-case-ledger.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-008/`
- Prior result/confidence: `Fail / 86.9%`.
- Current result/confidence: **Pass / 98.4%**.
- Broader validation: `Required and completed`.
- New or remaining finding IDs: `None`; `API-FIND-016` resolved.
- Recommended recipient: `/software_engineering_team/code_reviewer` for
  proportional test-code review. No durable test changed, so the changed-test
  review is expected to be recorded `Not Applicable`.
- Remaining bounded risk: the unchanged actual Electron shell was not launched;
  its exact AppImage provenance was verified. The live ERROR run selected bounded
  exhaustion, while direct current durable coverage proved the alternate complete
  snapshot publication branch. Neither is a material acceptance gap.

### API-REV-009 — Canonical launch equality passes; unified Org-to-Team switch fails

- Triggering role/report/round: Code Reviewer `CRR-034 / Pass`; API/E2E round 10.
- Triggering scenarios: new `REQ-030–032`, `AC-025–027`, `SCN-014–016`, `DS-024–026`, plus cumulative critical renewal.
- Related revisions: `RER-024`; `AD-REV-014`; `ARCH-REV-012 / Pass`; cumulative `IR-001–027`; `CRR-034 / Pass`.
- Tested source/artifact: `f6da607ebb0264487f335b7110c69ff0c18602eb` / `05fdb29945856a59afee98f870b1bca33f3c7213`.
- Why recorded: IR-027 changed canonical placement launch semantics, Temp Workspace provenance and the one continuously mounted mixed history surface. These observable cross-boundary changes required renewed repository and real browser/API/persistence proof rather than inference from API-REV-008.
- Durable coverage changed: updated `autobyteus-web/stores/__tests__/runHistoryNavigationProjection.spec.ts` so two builders provide the now-required empty `agentOrgHistory` slice and the expectation uses the approved stable workspace key. Repaired file passed 7/7; retained web cohort passed 27/193. No production source was changed by API/E2E.
- Repository result: focused web 10 files/153 tests, server resolver 1/1, retained server 15/61, repaired retained web 27/193, guards/audit/removal scan, server build/bootstrap and production renderer build/prerender 16 routes all passed.
- Real execution: normal UI package remove/re-import; both packaged Orgs discoverable; prior Team/Org histories retained; actual Temp default and null focus; root/Team/exact-Agent preview -> request -> durable equality; active standalone Team plus active Org subject switching; exact cleanup.

#### Prior Failure Resolution

None. API-REV-008 passed its artifact; this round tests newly changed IR-027 boundaries.

#### New finding

`API-FIND-017` / `LIVE-003` fails `REQ-031 / AC-026 / SCN-015 / DS-025`:

- standalone Team -> AgentOrg switching succeeds;
- from the AgentOrg query route, selecting an active standalone Team exact member changes the Team row to selected/current but leaves the AgentOrg URL and Concierge center content unchanged;
- the rendered screen contains simultaneous highlighted Team Analyst and Org Concierge targets;
- the same behavior occurs with the prior inactive Team;
- correlated real-browser evidence contains no GraphQL, console or page error;
- preliminary source correlation identifies `AppLeftPanel.onRunningRunSelected` returning for every `/workspace` pathname, including AgentOrg query routes, rather than clearing the stale query by routing to plain `/workspace`.

Preliminary classification is implementation/frontend `Local Fix`; Code Reviewer must confirm failure origin. Requirements and design explicitly require this switch, so no gap or redesign is inferred.

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-test-case-ledger.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-009/`
- Prior result/confidence: `Pass / 98.4%`.
- Current result/confidence: **Fail / 87.0%**.
- New/remaining finding: `API-FIND-017`.
- `LIVE-004–005`: Not Tested after the critical supported-navigation failure; prior-artifact passes are not inferred.
- Cleanup: server SIGTERM clean; renderer/tab stopped; ports/tabs closed; package 18/18 immutable; exact HEAD/source ancestry and diff check preserved.
- Recommended recipient: `/software_engineering_team/code_reviewer` for focused failure-origin review under the dynamic handoff rule.
- Delivery readiness: not claimed.

### API-REV-010 — IR-028 navigation/config fix and cumulative real-system Pass

- Triggering role, report path, and round: Code Reviewer `CRR-036 / Pass`; API/E2E round 11.
- Triggering finding or scenario IDs: prior `API-FIND-017`, `REQ-031 / AC-026 / SCN-015 / DS-025`, direct/mounted exact-Agent configuration under `DS-017`, and retained cumulative `REQ-001–032` critical coverage.
- Related revisions: `RER-024`; cumulative `AD-REV-014`; `ARCH-REV-012 / Pass`; `IR-028`; `CRR-036 / Pass`.
- Tested source/artifact: `4d378df9cba56bd1b9ebf20d9b055f964398f642` / `100e2c82cb948e1cbef4026ab6f74ab815285a34`.
- Why recorded: IR-028 changed mutual exclusion between standalone Team and AgentOrg selection/query ownership and added exact current-Agent configuration/Back behavior. The Large/High route required a cumulative repository and realistic browser/provider/process renewal rather than inference from API-REV-009.
- Durable coverage changed: no new edit in this round. The API-owned `autobyteus-web/stores/__tests__/runHistoryNavigationProjection.spec.ts` update made during API-REV-009 remains present and now passed in the 14-file/177-test focused and 27-file/195-test retained cohorts. It adds required `agentOrgHistory` fixture state and the approved `workspace:/workspace-a` stable key; proportional test-code review remains required.
- Repository coverage: exact artifact/source/package preflight Pass; current web 14/177; retained server 15/61; retained web 27/195; web/localization guards and zero-finding audit; server build/bootstrap; production renderer build/prerender 16 routes — all Pass.
- Real execution: current production browser on desktop and 390x844, real Fastify/GraphQL/WebSocket server, SQLite/filesystem, imported 4-Agent/2-Team/2-Org package, Codex App Server / `gpt-5.6-sol`, formal task tools, same-data SIGTERM/restart/Restore and cleanup.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `API-FIND-017` / LIVE-003 / AC-026 | frontend implementation Local Fix, confirmed and source-resolved by IR-028/CRR-036 | Active and inactive AgentOrg -> standalone Team -> AgentOrg switching now produces the exact URL and center and exactly one current highlight at desktop and through the supported 390x844 strip/drawer hierarchy. | `API-REV-010/live/LIVE-001-active-switch.json`; `LIVE-001-inactive-org-switch.json`; screenshots |

- Cumulative real outcomes: exact direct/mounted gear -> locked config -> same-monitor Back and distinct New Pass; family-scoped history failure/recovery Pass; inactive Team first-prompt activation and Team/Org Codex markers Pass; fresh delegate -> initial submit -> revision -> same-task revised submit -> accept Pass with durable sidecar; strict identity negatives Pass; legal-code automatic recovery exhaustion Pass; clean SIGTERM, migration preflight, mixed inactive history, whole-Org Restore, provider-identity semantics, Team/Org continuation and terminal Stop Pass.
- Observed errors: two locator/wait detachments, one rapid-click inactive-Team warning, intermittent Codex model-catalog child-exit timeout stderr, the pre-existing `/health` 404 and two incorrectly constructed manual task probes were investigated. Supported reruns/boundary evidence passed; none remains a production finding.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, and `api-e2e-evidence/API-REV-010/`.
- Prior result/confidence: `Fail / 87.0%`.
- Current result/confidence: **`Pass / 98.3%`**.
- New or remaining failure IDs: none.
- Broader validation: `Required and completed`.
- Recommended recipient: `/software_engineering_team/code_reviewer` for proportional test-code review.
- Remaining bounded scope: unchanged Electron shell, separately owned external definition publication and destructive corruption of a live copied store; none is a material gap for IR-028.

### API-REV-011 — DS-027 live summary passes normal paths but accepted metadata failure crashes server

- Triggering role/report/round: Code Reviewer `CRR-038 / Pass`; API/E2E round 12.
- Triggering scenarios: `REQ-033 / AC-028 / SCN-017 / QR-011 / DS-027` plus cumulative retained critical coverage.
- Related revisions: `RER-025`; `AD-REV-016`; `ARCH-REV-014 / Pass`; `IR-029`; `CRR-038 / Pass`.
- Tested source/artifact: `0d7b6e7e7bc1050a43d3681eb83b09a342537ef7` / `54716ad0ffd4c4be7aab389a84d3d7e41f72ecb5`.
- Why recorded: RER-025 added accepted external AgentOrg message summary capture, authoritative same-row refresh and startup recovery. Those process/browser/persistence boundaries cannot inherit API-REV-010.
- Durable coverage changed by API/E2E: none. The new reviewed owner tests and retained cohorts were rerun. Evidence-only browser/API/process/migration probes were retained under `API-REV-011`.
- Commands/environment delta: exact preflight; focused server 6 files/28 tests; focused web 3 files/58 tests; documented server build/bootstrap; web guards/audit/build; retained server 15 files/64 tests and web 27 files/196 tests; production renderer/browser, real Codex/gpt-5.6-sol, GraphQL/WebSocket, SQLite/files, real startup migration, and isolated deterministic derived-index failure.

#### Prior Failure Resolution

None. API-REV-010 passed its IR-028 artifact; API-REV-011 validates the newly changed IR-029 boundary.

#### Executed result

- Direct and mounted-Team first accepted messages changed the same rendered Org history row without reload using exact normalization/truncation; later configured/task traffic did not overwrite.
- A real mounted-Team delegate -> task Agent `submit_task_result` created the exact durable awaiting-review sidecar without affecting the root summary.
- Whitespace and invalid-target sends were excluded. Both A→B and B→A concurrent accepted orders selected their exact first ACK winner durably.
- Startup migration unique direct/mounted, existing, no-evidence, ambiguous, Team-preservation, warning, idempotent-restart and invalid-current terminal-failure cases passed.
- `API-FIND-018`: deterministic derived history-index `EISDIR` after accepted Agent input was caught/logged and the exact accepted ACK was observed, but the same rejection then escaped as an unhandled promise, closed the socket abnormally and terminated Node. Reproduced twice. Preliminary source correlation is the separately rejecting `next.finally(...)` promise stored by `atomic-json-file-writer.ts` while only `next` is returned/caught.
- Critical fail-fast left LIVE-004 and the current-artifact validation part of LIVE-005 Not Tested; prior API-REV-010 material passes remain historical only.

- Canonical artifacts updated:
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-coverage-investigation.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-execution-coverage-report.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-test-case-ledger.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-revision-record.md`
  - `/home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-011/`
- Finding evidence: `API-REV-011/live/metadata-failure-v2/API-FIND-018-accepted-summary-write-crashes-server.md`, `accepted-ack-rerun.json`, `probe-rerun-result.json`, `server-rerun.log` and index restore hashes.
- Prior result/confidence: `Pass / 98.3%`.
- Current result/confidence: **Fail / 95.7%** — high confidence in the failure; a critical criterion prevents Pass.
- New/remaining finding: `API-FIND-018`.
- Cleanup: browser tab closed/list empty; owned servers/renderer and ports 8590/3590/8695 closed; injected index restored byte-identically; fixture 18/18 hash-valid.
- Recommended recipient: `/software_engineering_team/code_reviewer` for focused failure-origin review.
- Delivery readiness: not claimed.

### API-REV-012 — User-requested local confirmation distinguishes healthy control from deterministic crash

- Trigger: after API-REV-011 handoff, the user asked to test again in case the server would now run successfully and the earlier termination was our environment problem.
- Authority/source/artifact: unchanged `RER-025 / AD-REV-016 / ARCH-REV-014 / IR-029 / CRR-038`; source `0d7b6e7e7bc1050a43d3681eb83b09a342537ef7`; artifact `54716ad0ffd4c4be7aab389a84d3d7e41f72ecb5`.
- Scope: focused prior-failure resolution only; ordinary intact summary write control followed by exact `LIVE-003B / API-FIND-018` reinjection on the same healthy isolated server.
- Durable test/source changes: none.

#### Prior Failure Resolution

| Prior failure | Previous result | Current resolution | Evidence |
| --- | --- | --- | --- |
| `API-FIND-018` / LIVE-003B | Fail; accepted derived-index I/O failure terminates server, reproduced twice | **Not resolved / confirmed a third time.** Intact control first passed with accepted ACK, exact durable summary and subsequent HTTP 200. The same server then returned accepted ACK for the injected failure, logged/caught EISDIR, closed socket 1006, became unreachable and exited 1 from the unhandled rejection. | `API-REV-012/user-requested-retry/control-result.json`; `failure-accepted-ack.json`; `retry-result.json`; `retry-probe.log`; `server-final-retry.log` |

- Setup corrections: the first attempt correctly exposed missing cleaned shared SDK build output and never listened; documented `prepare:shared` passed. A second readiness start exposed a copied old temp-workspace path and was stopped before messages; the path/port were changed to API-REV-012 ownership. Neither is product behavior or part of the reproduction.
- Cleanup: copied `.env` and secret key removed; generated shared build outputs removed with scoped filesystem operations; port 8696 and retry processes absent; before/restored/current index SHA-256 identical.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, and `api-e2e-evidence/API-REV-012/`.
- Prior result/confidence: `Fail / 95.7%`.
- Current result/confidence: **Fail / 96.6%** — stronger confidence in the same defect, not a Pass.
- Remaining finding: `API-FIND-018`.
- Recommended recipient: `/software_engineering_team/code_reviewer` as a focused evidence update to the existing failure-origin review.
- Delivery readiness: not claimed.


### API-REV-013 — IR-030 process-failure containment and cumulative real-system Pass

- Triggering role/report/round: Code Reviewer `CRR-040 / Pass`; API/E2E round 14.
- Triggering finding/scenario: prior `API-FIND-018 / LIVE-003B`, plus the cumulative `LIVE-004/005` scope held by API-REV-011/012 fail-fast.
- Related revisions: `RER-025`; `AD-REV-016 / DS-027`; `ARCH-REV-014 / Pass`; `IR-030`; `CRR-040 / Pass`.
- Tested source/artifact: `d741874e9a35367d0c64b57a8e7e4cd15e0e93c5` / `e3b3a840052cdb6cb8c552b3bf9d66ee233fc3bb`.
- Why recorded: IR-030 corrected the shared atomic writer settlement-tail defect proven three times by API-REV-011/012. The fix and all held current-artifact cumulative journeys required direct renewal; no prior pass was inferred.
- Durable coverage changed by API/E2E: none. Exact reviewed writer/handler tests and affected/retained cohorts were rerun. Evidence-only real-process/browser scripts were retained under `api-e2e-evidence/API-REV-013/`.
- Repository delta: server build Pass; exact writer/handler `2 files / 11 tests`; affected server `14 / 54`; retained web `21 / 147`; production Nuxt build/prerender `16 routes`.
- Environment/execution delta: exact built server, isolated copied SQLite/files, imported/registered 4-Agent/2-Team/2-Org fixture, actual AutoByteus `open_tab` production Chromium at desktop and 390x844, real Codex App Server / `gpt-5.6-sol`, Agent Tools MCP, GraphQL/WebSocket, deterministic derived-index failure, current migration, two SIGTERM cycles and same-data restart.

#### Prior Failure Resolution

| Prior scenario / failure | Previous classification/result | Current resolution | Evidence |
| --- | --- | --- | --- |
| `API-FIND-018 / LIVE-003B` | implementation-owned shared atomic-writer Local Fix; accepted work's caught derived-index failure also escaped through a rejecting cleanup tail and terminated Node | **Resolved / Pass.** Accepted ACK stayed truthful; exact EISDIR was caught once; socket/GraphQL/process remained available; no replay/relabel; exact restore; later same-path persistence; no unhandled/fatal marker; SIGTERM exit 0. | `API-REV-013/live/LIVE-003B-observed-boundaries.md`; `metadata-failure-fixed-result.json`; `post-fix-process-and-log-check.log` |
| API-REV-011/012 held `LIVE-004/005` | Not Tested after critical fail-fast | **Resolved / Pass.** Production-browser history/switch/Restore/config/narrow focus, real Team/Org/task, active+stopped strict negatives, stop/terminal, restart/post-restart continuation and scoped history recovery all passed. | `API-REV-013/live/LIVE-004-*.json`; `LIVE-005-*.json`; ledger sequences 27–42 |
| API-REV-025 | Code Reviewer CRR061/062; full renewed UI-CLEAN/current artifact | RER032 / AD022 / ARCH019parent / IR001–041 | API24 Pass95.9% | **Fail78.3%** — API-FIND-028 |
| API-REV-032 | CRR078 fresh cumulative renewal | RER033 / AD025 / ARCH022 / IR001–053 | Fail72.1% | **Fail77.1%** |
| API-REV-033 | CRR080 fresh cumulative renewal | RER033 / AD025 / ARCH022 / IR001–054 | Fail77.1% | **Fail78.6%** |

- Migration/idempotence: Pass; status remained `SUCCEEDED`, attempt count 1, both histories queryable and both indexes byte-stable.
- Cleanup: complete; owned ports/processes/tabs absent, copied secrets and generated outputs removed, fixture hashes `18/18`, source/artifact and diff integrity pass.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, and `api-e2e-evidence/API-REV-013/`.
- Prior result/confidence: `Fail / 96.6%`.
- Current result/confidence: **`Pass / 98.4%`**.
- New or remaining finding IDs: `None`; `API-FIND-018` resolved.
- Broader validation: `Required and completed`.
- Recommended recipient: `/software_engineering_team/code_reviewer` for proportional test-code review. No durable test changed in this round, so expected disposition is `Not Applicable`.
- Remaining bounded risk: unchanged Electron shell was not relaunched; temporary live browser probes are not a repository browser suite. Neither limits the IR-030 server-writer acceptance result.


#### Post-Result Factual Correction — API-FIND-019 (Trigger for API-REV-014)

- The user supplied latest Delivery-built Electron screenshots demonstrating an AgentOrg communication-observability scenario not asserted in API-REV-013.
- Standalone AgentTeam exposes received/sent messages through the selected member and right-side `Team > Messages` surface; AgentOrg lacks corresponding target event-monitor visibility and any root communication/messages tab even though `send_message_to` succeeds.
- The API-REV-013 Pass remains the historical result for its executed plan, but its clean ticket-level readiness implication is withdrawn. `API-FIND-019` is open and routed to Architecture Designer as `Unclear / likely Design Impact or Requirement Gap`.
- Evidence: `api-e2e-evidence/API-REV-013/post-pass-user-discovery/API-FIND-019-agentorg-communication-visibility-gap.md` plus the four user screenshots referenced there.
- The approved RER-026/AD-REV-018/IR-031 correction returned through CRR-042 and triggered the completed `API-REV-014` renewal below.

### API-REV-014 — IR-031 configured-message parity passes, but task-Team activation invalidates the Org stream

- Triggering role/report/round: Code Reviewer `CRR-042 / Pass`; API/E2E round 15.
- Triggering finding/scenario: user-discovered `API-FIND-019`, now specified by `REQ-034 / AC-029 / SCN-018 / QR-012 / DS-028`, plus cumulative retained task/history/recovery/migration/shutdown coverage.
- Related revisions: `RER-026`; cumulative `AD-REV-018`; `ARCH-REV-016 / Pass`; `IR-031`; `CRR-042 / Pass`.
- Tested source/artifact: `f519a2093c98f265df9ea958bb5be15d6a5b2494` / `3656220d2f7a1551aa54d8e7e9d3eb8d767b96f6`.
- Why recorded: IR-031 added AgentOrg selected-member communication observability and post-commit receiver presentation. The new critical provider/browser/persistence boundary and prior cumulative behavior required renewed direct execution; no result was inferred from API-REV-013.
- Durable coverage changed by API/E2E: none. The reviewed current tests and retained cohorts were rerun; evidence-only browser/API scripts are retained under `api-e2e-evidence/API-REV-014/`.
- Repository result: new server `3 files / 19 tests`; new web `14 / 96`; retained server `14 / 54`; retained web `21 / 147`; server build/bootstrap; web guards/audit; production Nuxt build/prerender `16 routes` — all Pass.
- Real environment: exact built Fastify/GraphQL/WebSocket server on isolated copied SQLite/data/workspace roots; production renderer; actual AutoByteus `open_tab`; normal Settings package import; real Codex App Server / `gpt-5.6-sol`; Agent Tools MCP; durable Org message/task sidecars.

#### Prior Failure Resolution

| Prior finding | Previous result | Current resolution | Evidence |
| --- | --- | --- | --- |
| `API-FIND-019` | post-API-REV-013 user evidence proved missing AgentOrg target-center and root Messages parity | **Resolved for configured directions.** Direct-to-direct, direct-to-mounted, mounted-to-direct and mounted cross-Team messages each committed once, updated live, produced one exact receiver input and truthful selected sender/receiver rows with exact full address/reference; unrelated focus remained empty. Reconnect/restore/narrow completion was stopped by the new cumulative failure. | `API-REV-014/live/LIVE-001-direct-messages.json`; `LIVE-002-*.json`; screenshots/traces |

#### New finding

`API-FIND-020 / LIVE-003` fails the approved task-Team/current-root projection path:

- Configured-to-task, task-to-configured and task-to-task exact-ID traffic passed and was correctly excluded from configured center/Messages presentation.
- Mounted `/research-team/lead` then delegated a real task to `/support-team`. Task `task_a7edf3fb6dfe49e3b032e0a18b4c270f` was durably active, task TeamRun `aorg_support_pair_381ed079b0f64287a7b9a38108a90371` materialized, and coordinator AgentRun `aorg_e2e_lead_279d32a369bc4e83b2adffa867ae2ebc` returned the exact readiness marker.
- The current AgentOrg stream thereafter rejected the task Team's coordinator and specialist AgentRun status records as duplicated. Supported exact-root reselect opened five fresh WebSockets; all five returned `CONNECTED` then `AGENT_ORG_STREAM_UNAVAILABLE` for the same two duplicate IDs.
- No complete snapshot published. The browser showed the bounded terminal recovery notice, all visible members offline, only two of three durable tasks, no task Team, and stale center state. Zero HTTP/page/console errors occurred and the backend remained reachable.
- Preliminary origin: implementation/server `Local Fix`, subject to Code Review. Candidate composition is directory-level task-Team status traversal plus recursive mounted-parent traversal of the same leaves; the strict duplicate rejection is correct. No permissive dedupe, manual reconnect, timeout or alternate lifecycle owner is proposed.

- Fail-fast: `LIVE-004`, `LIVE-005`, `LIVE-006`, and `MIG-001` are `Not Tested` on IR-031; prior revision passes remain historical only.
- Cleanup: direct SIGTERM logged clean shutdown; tab/renderer/processes/ports closed; copied secrets/generated outputs absent; fixture hashes `18/18`; exact source ancestry and diff integrity pass.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, and `api-e2e-evidence/API-REV-014/`.
- Primary finding evidence: `API-REV-014/live/API-FIND-020-task-team-status-duplication-breaks-org-stream.md`; `LIVE-003-task-team-stream-recovery.json`; task sidecar/raw traces; screenshots.
- Prior result/confidence: `API-REV-013 / Pass / 98.4%` for its executed IR-030 scope, subsequently reopened by API-FIND-019.
- Current result/confidence: **`Fail / 87.0%`** — high direct confidence in API-FIND-020, but critical current-artifact scopes fail or remain untested.
- New/remaining finding: `API-FIND-020`.
- Broader validation: `Required; partially executed and stopped by critical failure`.
- Recommended recipient: `/software_engineering_team/code_reviewer` for focused failure-origin review.
- Delivery readiness: not claimed.

### API-REV-015 — IR-032 status traversal passes; clean standalone-Team task submission stalls

- Triggering role/report/round: Code Reviewer `CRR-044 / Pass`; API/E2E round 16.
- Triggering finding/scenario: prior `API-FIND-020 / REQ-015 / AC-010`, current-artifact completion of IR-031 `REQ-034 / AC-029`, and retained cumulative task/history/recovery/migration/shutdown behavior.
- Related revisions: `RER-026`; cumulative `AD-REV-018 / DS-028`; `ARCH-REV-016 / Pass`; `IR-032`; `CRR-044 / Pass`.
- Tested source/artifact: `8f9f9ce3f7f4ab9312813de8faf5b651578a7310` / `43ef19f2de69b2c16133577dac40471f75ebd913`.
- Why recorded: IR-032 corrected AgentOrg structural-root status traversal. The Large/High reviewed package required exact real-provider/browser/status/settlement renewal and completion of the prior fail-fast scope.
- Durable coverage changed by API/E2E: none. Current and retained repository coverage was rerun. Evidence-only probes remain under `api-e2e-evidence/API-REV-015/`.
- Repository result: exact server cohort `4 files / 19 tests`; cumulative server `16 / 71`; current communication web `14 / 96`; retained web `21 / 147`; server build/bootstrap, guards, zero-finding localization audit, and production Nuxt build/prerender of 16 routes — all Pass.
- Real environment: exact built server and production renderer on owned ports, isolated copied SQLite/data/workspace, normal UI import of the four-Agent/two-Team/two-Org package, actual AutoByteus `open_tab`, real Codex App Server / `gpt-5.6-sol`, Agent Tools MCP, GraphQL/WebSocket, provider traces and durable sidecars.

#### Prior Failure Resolution

| Prior finding | Previous result | Current resolution | Evidence |
| --- | --- | --- | --- |
| `API-FIND-020` | active task Team made the strict current Org status snapshot invalid through duplicate descendant ownership | **Resolved / Pass.** Mounted, root-hosted and recursively nested task Teams produced complete unique snapshots; deepest-first formal settlement contracted status ownership `11 -> 8 -> 6` while durable lineage remained. | `API-REV-015/live/LIVE-001-*.json`; `LIVE-002-auto-recursive-task-team.json`; `LIVE-002-recursive-settlement.json` |
| `API-FIND-019` current-artifact remainder | IR-031 configured directions passed, but reconnect/restore/narrow was stopped by API-FIND-020 | **Resolved / Pass.** All four configured directions, references, truthful participant views, no-refocus updates and exclusions passed; exact message bytes/identity survived Stop/SIGTERM/restart/Restore without duplication; 390x844 strip/drawer exact focus passed. | `API-REV-015/live/LIVE-004-*.json`; `LIVE-004-direct-stop-restart-restore.json`; `LIVE-005-direct-narrow-messages.json` |

#### New Finding

`API-FIND-021 / LIVE-006` contradicts the preserved standalone-Team task lifecycle:

- A normal imported `AORG E2E Research Squad` ran with Codex App Server / GPT-5.6-Sol and auto approval. Its ordinary lead-to-analyst message committed and rendered correctly.
- The lead delegated one valid task to `/verifier`. The task Agent loaded explicit task-assignee instructions and had `submit_task_result` configured.
- The real provider dispatched exactly one `submit_task_result` call (`exec-57c491b0-8dbb-45a5-919d-4cb9c374012d`) at `2026-09-06T13:46:52.819Z`; no result returned after 240 seconds or more than six minutes.
- Durable task `task_14677c387408431b896143b6e82eba2f` remained `active` with `updates: []`; the selected task monitor remained Thinking/In progress. GraphQL continued returning HTTP 200, so the server did not crash.
- Normal Team termination durably interrupted the task. Only after retirement did the late provider completion arrive and get rejected as `CODEX_SEGMENT_TURN_INACTIVE`; root termination and final SIGTERM both completed cleanly.
- This is not the old missing-tool fixture and not API-FIND-008's self-review confound. Exact MCP-ingress/Team task-queue correlation was not instrumented, so preliminary origin is `Unclear` within provider dispatch -> Agent Tools MCP -> root Team task queue/persistence.

- Completed current-artifact cumulative cases: configured communications and references, no-refocus updates, Stop/restart/Restore and provider continuation, 390x844 focus/accessibility, strict identity negatives, recursive task-Team settlement/removal, frozen whole-Org scope, migration idempotence and clean shutdown.
- Not Tested after fail-fast: standalone Team review/acceptance/completion and its post-settlement process restart/Restore continuation. No historical pass is inferred.
- Cleanup: complete; roots stopped, server SIGTERM exited 0, actual tab/renderer/ports/processes cleared, copied secrets/generated outputs removed, fixture hashes `18/18`, exact source/artifact/diff/shared-environment integrity retained.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, and `api-e2e-evidence/API-REV-015/`.
- Primary finding evidence: `API-REV-015/live/API-FIND-021-standalone-team-submit-stall.md`; `API-FIND-021-boundary-evidence.log`; pre/post task sidecars; provider trace; screenshots.
- Prior result/confidence: `Fail / 87.0%`.
- Current result/confidence: **`Fail / 92.0%`**.
- New/remaining finding: `API-FIND-021`.
- Broader validation: `Required and substantially executed through fail-fast`.
- Recommended recipient: `/software_engineering_team/code_reviewer` for focused failure-origin review.
- Delivery readiness: not claimed.

### API-REV-016 — Correlated standalone-Team task lifecycle and Restore pass

- Triggering role, report path, and round: Code Reviewer `CRR-045` focused failure-origin review in `code-review-report.md`; API/E2E round 17.
- Triggering finding/scenario IDs: `API-FIND-021 / LIVE-006`, plus the held standalone-Team review/acceptance and post-settlement `LIVE-006R` restart/Restore continuation.
- Related revisions: `RER-026`; cumulative `AD-REV-018 / DS-028`; `ARCH-REV-016 / Pass`; `IR-032`; `CRR-044 / cumulative Pass`; `CRR-045 / API/E2E execution-runtime Local Fix`.
- Tested source/artifact: unchanged `8f9f9ce3f7f4ab9312813de8faf5b651578a7310` / `43ef19f2de69b2c16133577dac40471f75ebd913`.
- Why recorded: API-REV-015's provider `TOOL_EXECUTION_STARTED` proved neither local Agent Tools MCP ingress nor Team FIFO admission. CRR-045 required a clean supported rerun with passive correlation through every local boundary before any source attribution, followed by completion of the held lifecycle.
- Coverage decision: no durable test changed. The reviewed task tests remain valid. API/E2E added evidence-only Node Inspector logpoints and browser/process captures under `api-e2e-evidence/API-REV-016/`; no production or built file was modified.
- Scenarios rechecked: exact artifact/fixture preflight; fresh standalone-Team initial task submission; one request revision; same-task resubmission; acceptance and settlement; normal Team termination; SIGTERM; same-data restart; inactive first-send Restore; real provider continuation; cleanup/integrity.
- Environment delta: exact built backend on 8596, production renderer 3596, passive Inspector 9238, actual AutoByteus `open_tab`, imported 18-file package, real Codex App Server / `gpt-5.6-sol`, local Agent Tools MCP, GraphQL/WebSocket, SQLite/files and original provider `HOME=/root`.

#### Prior Failure Resolution

| Prior scenario / failure | Previous classification | Current resolution | Evidence |
| --- | --- | --- | --- |
| `API-FIND-021 / LIVE-006` | API-REV-015 Fail; provider-side submit item stalled >6 minutes, but local ingress/FIFO was unproven. CRR-045: API/E2E execution/runtime Local Fix, no source defect established. | **Not Reproduced / resolved for validation.** Initial and revised submits both crossed provider start -> exact MCP HTTP ingress -> dispatcher/executor/adapter -> empty Team FIFO -> durable commit -> notification -> HTTP 200 -> provider success. | `API-REV-016/live/LIVE-006-correlated-observed-boundaries.md`; three correlation logs; exact task sidecars/provider traces |
| held formal review/acceptance | Not Tested after API-REV-015 fail-fast | **Pass.** Same task received one revision, resubmitted, was accepted durably and settled; browser retained the ordered lifecycle exactly once. | `LIVE-006-task-sidecar-accepted.json`; `LIVE-006-team-tree-after-accept.json`; `screenshots/LIVE-006-task-accepted.png` |
| held restart/Restore continuation | Not Tested after API-REV-015 fail-fast | **Pass.** Accepted bytes survived Stop/SIGTERM/restart; inactive first-send restored the same TeamRun and real lead provider identity/content, did not revive the settled task Agent, and returned the exact continuation. | `LIVE-006R-restored-identity-hash-report.json`; `LIVE-006R-provider-continuation-proof.log`; restored screenshot |

- Execution corrections: the first Inspector controller never resumed the initial break and executed no product code. The first restart used the wrong provider home and failed before prompt commit; same-data bytes remained unchanged. Both were recorded and corrected before the relevant assertion.
- Cleanup: restored Team stopped; server SIGTERM clean; browser/renderer/Inspector/ports/processes clear; copied secrets and generated prerequisites removed; seven observed production dist hashes unchanged; fixture 18/18; exact source ancestry/diff/shared environment verified; other-owner PID 48 preserved.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, and `api-e2e-evidence/API-REV-016/`.
- Prior result/confidence: `Fail / 92.0%`.
- Current result/confidence: **`Pass / 97.6%`**.
- New or remaining failure IDs: none; `API-FIND-021` is Not Reproduced/runtime-only historical evidence. No timeout, retry, replay or recovery machinery is proposed.
- Broader validation: `Required and completed`.
- Durable test-code review: `Not Applicable` — no repository-resident test changed.
- Recommended recipient: `/software_engineering_team/code_reviewer` for the reviewed-route successful result.
- Remaining bounded risk: unchanged Electron-only shell behavior was not relaunched, and passive correlation is evidence-only rather than a repository browser suite; neither is material to the directly proven provider/MCP/FIFO/durability/browser path.

### API-REV-017 — User-requested fresh full-ticket rerun stops on normal AgentOrg edit

- Triggering role/request: user explicitly requested an inventory-complete fresh rerun of the whole Large/High ticket, with every case recorded immediately in the canonical ledger.
- Related authority: `RER-026`; cumulative `AD-REV-018 / DS-028`; `ARCH-REV-016 / Pass`; `IR-032`; `CRR-044 / cumulative Pass`; `CRR-045–046` retained.
- Tested source/artifact: `8f9f9ce3f7f4ab9312813de8faf5b651578a7310 / 43ef19f2de69b2c16133577dac40471f75ebd913` under integrated HEAD `6bca86cac41c3171b35eba3c38b7543da3fde62d`; no application-source delta exists after the reviewed artifact.
- Prior result/confidence: `API-REV-016 / Pass / 97.6%`; not inferred into this round.
- Why recorded: the user requested a complete fresh matrix rather than a targeted delta rerun, and that execution found a new critical normal-authoring failure.
- Durable coverage changed: `None`. API/E2E added only evidence, plan/ledger and report artifacts under `api-e2e-evidence/API-REV-017/`.

#### Repository and package evidence

- server production build/bootstrap: Pass;
- exact current-ticket server: `59 files / 289 tests` Pass;
- Brief Studio: `3 files / 8 tests` Pass;
- relevant web: `130 files / 816 tests` Pass;
- selected Electron boundary: `9 files / 39 tests` Pass;
- web/localization guards and zero-finding literal audit: Pass;
- Nuxt production build/prerender: 3,815 modules / 16 routes Pass;
- Linux arm64 AppImage: 524,007,419 bytes, SHA-256 `2cd8ef75a0413eab254f15f76327797253b3a225b6a54a6bb4a1051dc242be41`, exact packaged/repository server hash equality;
- normal imported package, both Team/Org definition families, exact detail/read-only/source-immutability, invalid/degraded admission, and all explicit submit/review tool inventories: Pass or explicitly checkpointed in the ledger;
- normal server-owned flat Team create/edit/persistence/revision and native en/zh-CN handoff labels: Pass.

The broad 167-file discovery sweep's non-ticket/stale failures remain separately adjudicated; they are not claimed as passes and are unrelated to the new exact live failure.

#### New finding — API-FIND-022

`AUTH-ORG-001` fails `REQ-018`, `REQ-023`, `AC-017` and `AC-018`:

- Actual AutoByteus `open_tab` created one server-owned `API17 Authored Org Ω` using the normal zh-CN authoring surface.
- The Org persisted a direct Agent, reusable flat Team, no coordinator, and exact Org-owned `/aorg_e2e_concierge -> /api17_authored_team` handoff.
- The next normal visible-description edit sent both hydrated member objects with Apollo-injected `__typename: "AgentOrgMember"`.
- GraphQL rejected both values because `AgentOrgMemberInput` does not define `__typename`.
- The form displayed the exact error; revision and both persisted definition files remained unchanged, so no partial write occurred.
- Source correlation shows `AgentOrgExperience.vue` spreads hydrated GraphQL members into `visibleInput.members` and `agentOrgDefinitionStore.ts` forwards them unchanged.

Preliminary classification: **implementation-owned frontend input-normalization/serialization defect**, subject to Code Reviewer focused failure-origin review. GraphQL validation must not be weakened; no retry, replay, compatibility or recovery mechanism is proposed.

Evidence:

- `api-e2e-evidence/API-REV-017/live/API-FIND-022-agentorg-edit-sends-graphql-typename.md`
- `API-FIND-022-update-request-response.json`
- `API-FIND-022-agentorg-edit-typename-error.png`
- `API-FIND-022-source-and-persistence.log`
- `AUTH-ORG-001-after-create.json`
- `AUTH-ORG-001-after-visible-edit.json`

#### Held scope and cleanup

The critical fail-fast gate left live completion of `PKG-005`, `AUTH-ORG-002`, all fresh configuration/Team/Org/message/task/API/persistence/final-history/summary/Restore/recovery/restart/final-migration/final-responsive/status cases `Not Tested`. Historical results were not substituted. The canonical ledger records every completed checkpoint and the exact held list at sequences 127–148.

Cleanup is complete: tabs empty; server SIGTERM clean; renderer/ports/processes closed; copied secrets and generated shared outputs removed; package hashes `18/18`; source/artifact/no-application-delta and `git diff --check` pass; Delivery-owned dirty hashes remain exact.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, and `api-e2e-evidence/API-REV-017/`.
- Current result/confidence: **`Fail / 80.3%`**.
- New or remaining finding: `API-FIND-022`.
- Broader validation: `Required; partially executed and stopped by critical failure`.
- Recommended route: dynamic handoff to the returned accountable recipient for focused failure-origin review.
- Delivery readiness: not claimed.

### API-REV-018 — IR-033 fixes AgentOrg edit; complete fresh rerun finds four live/runtime failures

- Triggering role/report/round: Code Reviewer `CRR-048 / cumulative Pass`; API/E2E round 19; the user required a complete whole-ticket retest with immediate case ledgering.
- Triggering scenario: prior `API-FIND-022 / AUTH-ORG-001`, followed by the entire `REQ-001–034`, `AC-001–029`, `SCN-001–018`, `QR-001–012` matrix.
- Related revisions: `RER-026`; cumulative `AD-REV-018 / DS-028`; `ARCH-REV-016 / Pass`; `IR-033`; `CRR-048`.
- Tested source/artifact/HEAD: `161483fcb980c6bbe1b14b1d97cb582c40b7e929 / a967ba9391a003eb14376bede3faaddba4335cc1 / a967ba9391a003eb14376bede3faaddba4335cc1`.
- Why recorded: IR-033 corrected the prior real Apollo edit failure. The reviewed Large/High package and explicit user request required a new full cumulative real package/provider/browser/API/restart/migration run, not a delta-only inference.
- Durable coverage changed: **None**. API/E2E added evidence-only plans, scripts, logs, request/response captures and screenshots under `api-e2e-evidence/API-REV-018/`.
- Environment delta: current built backend on 8598, production renderer 3598, actual AutoByteus `open_tab`, normal immutable package import, real Codex App Server / `gpt-5.6-sol`, Agent Tools MCP, isolated SQLite/files/workspaces, and auxiliary current processes on 8704–8709.

#### Prior Failure Resolution

| Prior finding | Previous classification | Current resolution | Evidence |
| --- | --- | --- | --- |
| `API-FIND-022` | implementation-owned AgentOrg update serialization leaked Apollo `__typename` | **Resolved / Pass.** Normal create -> Apollo query -> visible edit -> strict GraphQL update sent only `memberName/ref/refType/refScope`; revision, files and reopen were exact. Hidden durable fields and partial-update omission also passed. | `API-REV-018/live/AUTH-ORG-001.json`; `AUTH-ORG-002.json`; screenshots/native definition files |

#### Cumulative Execution

- Repository: server build/bootstrap Pass; exact server **59 files / 289 tests**; web **141 / 857**; Electron **9 / 39**; both guards and zero-finding localization audit; Nuxt build/prerender 16 routes; Brief Studio 22-file pack; Linux arm64 AppImage/provenance Pass.
- Package/admission: actual Settings import of four Agents/two flat Teams/two AgentOrgs; both catalogs/details/read-only/tool inventories; 18/18 immutable hashes; six exact invalid-package diagnostics with valid catalog/degraded GraphQL isolation.
- Authoring/config: Team and Org create/edit/reopen; exact authored names/addresses/When; en/zh-CN selectors; hidden preservation; Temp Workspace and root/Team/exact-Agent overrides; failure/Retry/default abandonment/no stale payload.
- Runtime: real standalone Team and full Org launches/focus/config; four configured message directions; formal direct/standalone/mounted/root/recursive task paths; monitor/history/summary/strict API/persistence; responsive 390x844 focus; automatic recovery exhaustion; Stop/restart/Restore/provider continuation; binding negatives; derived-write containment; migration and shutdown.
- User-directed continuation after failures completed all remaining safe independent cases. The dependent task-to-task message exclusion is explicitly **Not Tested** because the root task runtime's prior supported message tool remained unresolved.

#### New Findings

1. `API-FIND-023`: an accepted, settled direct task Agent remains visibly Running for more than 30 seconds even though the tree is settled and checkpoint has no open work; reload makes it Offline. Preliminary origin is Unclear within server publication versus web live projection.
2. `API-FIND-024`: a supported nested task-Team `submit_task_result` has one provider tool-start but no result or durable update after 600 seconds. Local MCP/FIFO admission is unproven; runtime/execution origin is Unclear.
3. `API-FIND-025`: normal Stop on exact active Mixed Org terminates the different Direct Org while Mixed stays active. Preliminary origin is implementation/UI current-root ownership Local Fix.
4. `API-FIND-026`: configured-to-root-task-Team delivery/exclusion passes, but the task coordinator's task-to-configured `send_message_to` substitutes a nonexistent reference and has no result/durable delivery after 465 seconds. MCP ingress is unproven; runtime/execution origin is Unclear. Dependent task-to-task direction is Not Tested.

No timeout, retry, replay, compatibility or alternate recovery/lifecycle machinery is proposed. Code Review must classify failure origin from the retained evidence.

#### Result And Cleanup

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, `api-e2e-revision-record.md`, `api-e2e-evidence/API-REV-018/case-reconciliation.md` and finding evidence.
- Prior result/confidence: `API-REV-017 / Fail / 80.3%`.
- Current result/confidence: **`Fail / 87.4%`**.
- New/remaining finding IDs: `API-FIND-023`, `API-FIND-024`, `API-FIND-025`, `API-FIND-026`.
- Broader validation: `Required and completed`; it increased direct integration evidence and exposed the four failures.
- Cleanup: complete. Tabs/processes/ports/secrets/generated prerequisites cleared; fixture 18/18; exact source/artifact/application boundary and ten other-owner hashes pass; `git diff --check` passes.
- Recommended recipient: dynamic failure-rule recipient, expected `/software_engineering_team/code_reviewer`, for focused failure-origin review.
- Delivery readiness: not claimed.

### API-REV-019 — IR-034 complete cumulative retest; live settlement and task/message controls pass

- Completed: 2026-09-11. Authority: RER-026 / AD-REV-018 / ARCH-REV-016 Pass / IR-034 / CRR-050; Large / High / Reviewed.
- Source/artifact: `2221322710a6a1f5dae06a74135bca008aef88a6 / a5eae9ce3889e6100302a85da54e5b1a02c25176`.
- Prior: API-REV-018 Fail /87.4%. Current: **Pass /95.4%**; all categories>=95%; no current finding or critical Not Tested remainder.
- API-FIND-023 resolved: direct/root/recursive task settlement projects Offline live without reload, durable settledAt and unique healthy remaining statuses.
- API-FIND-025 resolved as API/E2E locator correction: exact row Stop targets only selected root. No implementation defect inferred from the old global locator.
- API-FIND-024/026: historical stalls Not Reproduced / runtime-only; clean auto-approved root/nested tasks and all valid-reference configured/task, task/configured, task/task directions pass. Current standalone initial/revision/same-task resubmit/accept completes with provider, exact MCP HTTP, durable and provider-result correlation. API-FIND-021 also not reproduced. FIFO passage is inferred from committed records inside request intervals; no separate JSON-RPC ingress/FIFO-start logpoint claimed.
- Current repository: server59/289, web141/859, Electron9/39; additional migration/summary/gate3/28; guards/audit zero findings; server/Nuxt builds; Brief Studio22 files; AppImage provenance all Pass.
- Full renewed runtime: actual Settings import of4 Agents/2 Teams/2 Orgs; authoring/Apollo projection/hidden fields/en+zh-CN; config/equality/Retry/default; real Codex Team/Org/task/message/monitor/status; strict API/WS active/stopped negatives; summaries; unified history; exact locked gear/Back/New; responsive390x844; write-failure containment; migration; shutdown/restart; missing/unreadable Restore rejection.
- User container reboot: evidence/data survived; owned environment reconstructed; normal inactive history→Restore and real continuation repeated for Team/Direct/Mixed. Conversational provider identity retained; system-only replacements durably committed; no historical Pass substituted.
- Recovery: six legal4000 browser closes across initial+five bounded attempts, one exhaustion notice, no InvalidAccessError/permanent Connecting/ manual Reconnect. Normal history/Restore later healthy and clear; no in-place automatic success claimed for the exhausted instance.
- Recording corrections: raw harness failures preserved with adjudications; canonical stale API18 body replaced; repository-only89.1% assessment explicitly reconstructed rather than backdated. Full details at API19/case-reconciliation.md.
- Durable coverage changed: **None** (added/updated/removed); proportional Code Reviewer test-review decision expected Not Applicable.
- Cleanup completed: owned tabs/processes/ports/provider descendants absent,15 secret/config copies and5 generated prerequisites removed; fixture18/18 and other-owner10/10 hashes, exact artifact/source/no production-test delta and diff check Pass.
- Canonical investigation, execution report, revision record and ledger updated. Evidence: `api-e2e-evidence/API-REV-019/`; ledger218–271; full scope in case-reconciliation.md.
- Broader validation: Required and completed. Next: dynamic Pass handoff to Code Reviewer. Delivery completion is not claimed.

### API-REV-020 — CRR-054 complete fresh merged-artifact execution; root-task publication failure

- Completed 2026-09-11T05:15:39.943341+00:00. Trigger: CRR054 merged IR035–036 source Pass and user full fresh retest requirement; Large/High/Reviewed. Authority RER026/ADREV018/ARCHREV016 plus approved stopped-run-compatible-model flat-Team behavior.
- Exact artifact174e96a47dd3f6078207dec0d0a4546b8ded1772; production d2b257d7979e16aa9245d71f2edf8c14c042866c; IR036 testsource d231a77d5aad5875c7aec4569b1acbb3d2c6ff89.
- Prior completed API19 Pass95.4% remains historical IR034 only. Current **Fail /76.0%**. Post-repository82.0% was actually persisted before broader execution; final mandatory scores50/96/97/97/50/50/92.
- New finding **API-FIND-027**: root/recursive task-Team provider events remain buffered after one-time release, so real running work is not live-projected. Recursive same-task initial/revision/resubmit/accept all cross real local boundaries and commit, but settlement absent180s; later unrelated work triggers existing sweep. Root callback post-release retention directly observed; complete original settlement guard cause remains qualified. No submit stall or speculative recovery.
- Direct/root task-Agent and configured-mounted Team controls pass with actual Running→Offline; standalone initial/revision/resubmit/accept/fallback succeeds. Historical API021/024/026 original origins not rewritten; API023 direct/mounted terminal passes do not establish root publication success.
- All safe independent current groups renewed: real imported4Agent/2Team/2Org package, authoring/Apollo/hidden/localized handoffs, config/failureRetry/default equality, real model capacity/Save/all-scope/invalid/reopen and actual new-provider-model same-thread continuation, provider-native compacted fixture/Save preservation, all configured/task message directions/exclusions/refs, strict APIs/checkpoints, history/summaries, desktop/390px, Stop/Restore, active-task frozen shutdown, one same-data main restart/two SIGTERM, real derived-write containment and isolated migration/Restore negatives. Main restart process actual exit0; first detached launcher has only clean log/PID/port proof.
- Repository current server83distinct/466 union, web144/895, Electron9/39, compaction5/20, migration3/28, corrected registered A–F, builds/bootstrap/guards/localization0, Brief Studio pack/validate, AppImage provenance. No native shell/release/user verification or actual Brief Studio provider user journey claimed.
- Durable tests:4 updates; one old positive nested configured-Team case removed under prior validity decision; exact paths/diff in canonical report. No production edit/timeout increase. Proportional test review pending successful execution; this package requests focused origin review.
- Case ledger272–452; full attempts/adjudications at API20/case-reconciliation.md; current report/coverage investigation/revision/ledger persisted. No raw harness false assertion was silently erased.
- Cleanup complete: tabs3/4 closed/listempty; all owned ports/PIDs absent, Inspector clients/logpoints removed;5 generated prerequisites/7 envconfigs removed; no copiedsecret; fixture18/18, other-owner2093/2093, exactHEAD/diff check pass.
- Broader Required and executed; API20Fail blocks Delivery. Dynamic Fail rule returns CodeReviewer `/software_engineering_team/code_reviewer` for failure-origin review; no handoff success claimed until tool receipt.

### API-REV-021 — user-requested same-artifact confirmation

- Completed 2026-09-11T05:45:28.040745+00:00; prior API20 Fail76.0%; current **Fail76.0%**. Same artifact174e96a47dd3f6078207dec0d0a4546b8ded1772, Large/High/Reviewed. This is a focused confirmation, not full renewed fixed-source validation.
- Trigger: explicit user double-test request following API20 and CRR-055 independent implementation-owned CR-FIND-032. Authority RER-026/AD-REV-018/ARCH-REV-016; IR035–036; no architecture change.
- Tested private retained server copy4041/4041 matching API20; fresh normal imported package, actual Codex gpt-5.6-sol, root Support and recursive Research task Teams, browser open_tab5/6, full UI poll/WS/provider/MCP/FIFO/write evidence. Concurrent unreviewed fixes never used.
- **Live failure reproduced**: root actualIdle privately retained while53 subsequent polls remainRunning; recursiveRunning never visible in926 successful polls. During formal windows96/108 callbacks retained with0 target-Agent presentation frames;95/56 other-Agent frames prove continuing streams. Complete views/settlement can mask missing future events; stale observedRunning Boolean does not prove a new transition.
- **Both formal lifecycles pass**, four durable updates each, all8 submit/review HTTP200s; same-task identity and terminalOffline/strict snapshot preserved. Child/root settle immediately; previous recursive settlement delay NOT reproduced. Current first child guard shows no child/provider work; original missing guard not reconstructed.
- Clean application SIGTERM exit0.30 passive points removed, ports/services/tabs closed, copied code/env removed;19 fixture/192 renderer/4041 server files unchanged. Native data retained privately; shared source/build outputs preserved.
- Durable coverage delta: none new. Four API20 durable edits remain listed in canonical report; successful proportional review deferred. Temporary status assertion/navigation/scope corrections retained; no production fix/replay/timer.
- Scope not rerun: full broad matrix, root-Agent sibling real browser, selected task center, restart/recovery/migration, native shell/release. API20 evidence retained with original limits, not relabeled current reruns.
- Evidence: API-REV-021/execution-plan.md, live/API-FIND-027-confirmation.md, final/correlated-confirmation.json, live/server-initial.log, browser-ws.jsonl, full task polls/raw traces, final/cleanup-result.json. Ledger453–473.
- Canonical reports/revision/ledger updated. Route: dynamic Fail handoff, confirmation of existing owner; no Delivery readiness.

### API-REV-022 — full fixed merged-artifact execution; bounded requirements gap

- Completed 2026-09-11T07:17:53.062558+00:00. Prior API21 Fail76.0%; current **Fail86.6% — sign-off gated by Requirement Gap AAV001**, no new implementation source defect. Large/High/Reviewed, RER026/ADREV018/ARCHREV016; CRR057; IR001–037 with incoming stopped-compatible-model flat topology.
- Tested artifact6ef456e0a3fd568e732bafbd79c5f9abb2aed1f4/source61c98faa. Concurrent HEAD e98bbf066 adds only Architecture assertion-validity record; production unchanged. This is full fresh current matrix, not old Pass substitution.
- **API-FIND-027/CR-FIND-032 execution resolved:** root Agent/root Team/recursive Team fresh exact Idle→Running→Idle and durable-before-activation-before-Agent publication in one observation window, no refocus/reload/replacement snapshot. Exact terminal Offline/healthy continuing scopes retained. Display-only Org task-history rows not claimed selected task-center.
- Eight formal cycles/32durable transitions now retain separate actual MCP session/RPC ingress, executor/FIFO admission/start, persistence/publication/notification, HTTP/provider result. Two premature review calls truthfully reject, not counted. Current immediate guard/settlement does not reconstruct historical delay or unknown first failed guard; repository deferred-own-idle regression separate.
- Fresh repository server86/482, core5/20, web144/895, Electron9/39; exact4/22 and extra1/5 repeats excluded from totals; registered flatA–F separate deterministic browser. Builds/bootstrap/prerender16routes, guards/localization0, Brief Studio pack/validate pass.
- Fresh real browser imported4Agent/2Team/2Org package; authoring/Apollo/hidden/localized handoffs; root/Team/Agent config and failureRetry/default truth; actual stopped models/capacity/all-scope Save/invalid-scope no-write/same-thread new-model continuation and native compaction. Four configured message directions live and restored exact once with references; task-involved exact delivery/live event+facet exclusion; two native APIs/strict/stopped negatives; summaries/history/gear/Back/New/desktop390; migration/degraded admission/derived-write failure isolation; missing/unreadable Restore negatives;2main restarts/Team+Org continuation and frozen shutdown.
- **AAV001 Requirement Gap:** task-origin ordinary retained provider user-history packet appears after Restore while live new configured event and Messages facet exclude it. Architecture cannot narrow REQ034 wording. Disputed stronger assertion unclassified, not source-Fail or test-Pass; Requirements clarification through Architecture. No filtering/deletion/new recovery requested.
- Post-repository83.4% recorded before broader Required execution; final mandatory50/97/97/98/95/75/94=86.6%. Critical unclassified requirement prevents cumulative Pass independently.
- No new durable/source changes;4API20 paths unchanged, pending proportional review after future successful execution. Original harness navigation/role/observer/fixture corrections retained with no accepted-call replay; all planned independent cases reconciled in API22/case-reconciliation.md.
- Cleanup owned services/tabs/observer,5generateddist/8env files complete;19fixture and3617other-owner files plus4test hashes unchanged. Initial/final exact serverexit0; intermediate clean app log with missing child receipt/tool143 expressly not claimed child0. Shared browser/auth preserved.
- Canonical investigation/report/revision/ledger updated. Evidence API22/case-reconciliation.md, final/confidence.json, cleanup-result.json, integrity-result.json, live/task-history-assertion-disposition.json and ticket architecture-assertion-validity-record.md. No native-shell/currentAppImage/user-verification/release/Delivery readiness; dynamic completed-result routing next.

### API-REV-023 — approved retained-task-history adjudication

- Completed 2026-09-11T07:30:57.333749+00:00; prior API22 Fail86.6%; current **Pass96.0%**. Assertion-only return from Architecture under user-approved RER027@c7d435ee/AAV001 resolution22a2d9eb, not a fresh full runtime run or automatic Architecture Pass. Large/High/Reviewed; ADREV018/ARCHREV016/IR001–037/CRR057 unchanged.
- Exact tested production remains6ef456e0a3fd568e732bafbd79c5f9abb2aed1f4/source61c98faa. CurrentHEAD22a2d9eb adds only requirements/inquiry documents, no production/test/layout/schema/runtime delta. Full API22 execution is retained with original dates and limits; historical API22 result is not rewritten.
- AAV001 resolved: blanket absence of task-origin packets from ordinary restored conversation is Unsupported and removed from active plan, NOT converted to a passing assertion. Scoped new configured event/Org Messages exclusion remains; truthful retained provider task input remains outside it.
- Read-only executable audit proves actual accepted sender/content/reference packet once in raw receiver input, exact restored GraphQL user entry and browser center, with live new configured packet0/configured facet exclusion. Exact INITIAL+REVISED original-delegator result notifications actually accepted and present once after Restore; no delivery inferred from stored submission alone. SettledAt/provider bindings unchanged; task IDs absent active statuses/no task trace work after Restore. Standalone received/restored notification control verified.
- Corrected Team baseline comparison: baseline5fb16658 has task-inclusive input and Messages lookup; Org's scoped live restriction is not full Team task-presentation parity. Provider user-role task input is not human provenance/REQ033 title eligibility. No history filtering/deletion/backfill/recovery or source/test change authorized.
- API22 root Agent/root Team/recursive fresh-event proof remains resolution of API-FIND027/CR-FIND032; full repo1436tests/244files and real import/authoring/config/models/tasks/messages/persistence/Restore/recovery/migration/restart/shutdown/UI matrix retained, not falsely rerun. Historical stalls/first-guard/intermediate child-receipt limits retained.
- Current mandatory96/97/97/98/95/95/94=96.0%; no critical assertion remains unclassified. API22 post-repository83.4%/Required broader execution remains actual history. Additional API23 runtime Not Required because exact direct evidence and source equality close clarified scope.
- No new durable changes; four API20 tests unchanged/pending proportional review. Read-only parser first field mismatch corrected and logged without mutating evidence or weakening assertions.4896other-owner/19fixture/4test hashes unchanged; no new services/allownedportsclosed; no cleanup duplication.
- Current canonical investigation/report/revision/ledger plus API23/execution-plan.md, case-reconciliation.md, accepted-task-history-proof.json, settled-task-result-history-proof.json, authority-provenance.json, final/confidence.json and integrity-result.json persisted. Successful dynamic route requests Code Reviewer proportional review, not source rereview or Delivery readiness.

### API-REV-024 — Full fresh merged-artifact RER028 task parity
-Completed 2026-09-11T11:01:06.690098+00:00; source22809caca4a313e8079581a2a1b5b2e4eb2555f7/artifact6e2745680cd3529ab6787de07df252e92854247c; Large/High/Reviewed; RER028/AD019/ARCH017/IR001–038/CRR058 plus stoppedmodel/taskmonitor/Product supplements.
-PriorAPI23Pass96.0% remains RER027 adjudication overAPI22, not current proof. RER028 task-inclusive live event/facet and exact readonly task navigation replace old exclusion/display-only assertions, not source failures.
-Freshserver117/634, web155/996, core6/29, Electron9/39 =1698tests/287files; currentbuilds/guards/localization0/Brief; A–F deterministic separate. Full actual import/Apollo/authoring/config/models/compaction/messages/tasks/status/API/history/summary/recovery/Restore/migration/restart/shutdown/responsive matrix.
-8formalcycles32updates actualprovider/MCPsessionRPC/FIFO/disk/memory/HTTP; rootAgent/rootTeam/recursive fresh exactwire+DOM pulses;4configured+8task directions sameafterRestore; repeatedIDs/relevance/18actualsystemnotices/controlled rejectednotification/readonlyemptyunavailable exactinspection. Recursive initial nativewaitprompt correction disclosed, historical unknown firstguard/stall not reconstructed.
-4supervisedmainexits0/3restarts/normalcontinuations; client-confounded pure-startup bytecomparison corrected by disconnecting owned contexts and verifying all6family exacttree/task equality. No sourcefinding inferred from testpreconditions.
-Postrepository83.4% Required→final96/97/96/98/95/95/94=95.9%; no critical required scope unproven; per-case ledger immediately maintained and reconciled.
-Fiveupdateddurablepaths:4API20unchanged + rootExecutionViewState.spec.ts exacttaskDTO/strictnegative/heldfacetreactivity;126insertions/227deletions. Proportionalreview Required, no durablefiledeletion/sourceedit/staging/commit.
-Ownservices/tabs/observers closed,7envfiles/5generatedoutputsremoved;4913other-owner/19fixturefiles unchanged, sourceHEADfixed. Data/reference/providertraces retained/authsharedbrowserpreserved. No native-shell/AppImage/userverification/release/externalpublication claim.
-Canonicalreports/ledger andAPI24case-reconciliation/confidence/diff/cleanup/integrity persisted; successfuldynamicroute requests proportionalCodeReview only, not source-scorecard reopening.

### API-REV-025 — Current cumulative renewal; cold narrow task navigation failure
- Completed 2026-09-11T14:51:15.461564+00:00; current source88fa0c3ff55d9d6a87a27df094b369ea62d1595c/artifact81af52d97d2016a9e65529f25dda35361c2a94fc. RER032/AD022/ARCH019parentPass/IR001–041/CRR062; Large/High Reviewed.
- PriorAPI24Pass95.9% remains RER028/IR038. Earlier API25IR039 unsigned interrupted evidence has no inferred result. No prior open attributed failure carried fromAPI24; historical API20 firstguard/delay/older stall causes remain unassigned.
- Fresh renewal server156/874, core6/29, Electron9/39 on byte-unchanged carried paths; currentCRR062 web156/1002 and exact3/14; builds/guards/localization0/Briefpack/registeredA–F. Repeats nonadditive. Earlier stale catalog tuple corrected after validity record; incorporated/disclosedIR041, no current dirty test delta. CRR059 priorfive-file review preserved; later successful package requires applicable proportional disposition.
- Actualopen_tab import4Agents/2Teams/2Orgs; Team/Org authoring/Apollo/partial/locale/roundtrip; exact config/runtimefailureRetry/default;12ordinarydirection cases;8formalcycles32acceptedupdates with exact provider/MCPsession/rpc/adapter/FIFO/durable/HTTP/provider correlation;18accepted notifications pluscontrolledrejection; fresh exact rootAgent/rootTeam/recursive/mounted live transitions; repeatedidentity/relevance; real stoppedmodel Save/reopen/same-provider saved-model continuation. No old pass substitution.
- API-FIND-028: normal UI-emitted configured Org route, Back/Refresh390, visible exact settled task-Team dispatcher link -> handled Error500/history unavailable. Warm and drawer-initialized controls succeed; canonicalserverhealthy/rootfilesunchanged. Current source/historypanel mount dependency supports preliminary ImplementationLocalFix. Original handcrafted URL not sole evidence; exit0 helper not pass over coldPassedfalse.
- Remaining full compactlocale/inactive/member permutations, frozenopen scope/UIStop, currentbrowserrecovery, mainrestart/Restore/missingbinding/compaction, dedicatedlivefirstwinner remainNotTested. Ownedmigration/strictnegative/derivedfailureprocess checks passed; cleanupSIGTERMchild0 does not substitute held lifecycle.
- Postrepository84.9%Required -> final50/95/90/98/75/50/90=78.3% **Fail**. All critical proof/95mean gate unmet independently ofscore.
- Ownedserver cleanexit0, rendererSIGTERM, tabs13/14closed/observerinspectorcollectoroff/sharedauthpreserved;4generatedoutputs17owntmpdirs7envfilesremoved;19fixturehashesunchanged. CurrentHEAD/otherownerintegrity in final/integrity-result.json; no source/staging/commit.
- Canonical investigation/report/ledger/revision updated; /home/autobyteus/workspace/.codex/worktrees/flat-agent-organization-model/tickets/in-progress/flat-agent-organization-model/api-e2e-evidence/API-REV-025-renewed-crr061/case-reconciliation.md, final/confidence.json, cleanup-result.json and live/API-FIND-028-cold-narrow-task-navigation.md are retained. Fresh dynamic route requested focusedfailure-origin review, not successful-test review or Delivery readiness.

### API-REV-026 — Fresh full CRR064 renewal; standalone settled-task navigation failure
- Completed 2026-09-11T15:55:24.262517+00:00; RER032/AD022/parentARCH019Pass/IR001–042/CRR064; source14f7acfce33d28b74d619ce7d10bf13903c20c3f/artifactb5e56b4659c1df80e7fb535eb683e4bfad00d93c; Large/HighReviewed. PriorAPI25Fail78.3 remains historical; no oldPass substitution.
- PriorAPI-FIND028 resolved in actual current cold390 emittedOrgURL/Back/Refresh/samevisibletasklink: exactroot/AgentRun/address/readOnly, onehistoryread, noError/activation/write in quiescent fullhash observation. Initial hashwindow overlapped previouscallerreply; originalincompletebeforemap preserved, no sourceattribution.
- Fresh server156/874, web157/1010, core6/29, Electron9/39 =1952/328 nonoverlapping; exactcold2/14 and focusedoverlaps separate; builds16routes/bootstrap/guards/audit0/devkit/Briefpack/registeredA–F passed.
- Current actualimport/authoring/Apollo/localehandoffs/fieldfreeroundtrip/configruntimefailureRetry/default;4configured+8taskmessagedirections;8formalcycles32commands exactprovider/MCPsessionRPC/adapter/FIFOadmission/start/durable/memory/HTTP;18acceptednoticespluscontrolledrejection; freshsamewindowrootAgent/rootTeam/recursive/mounted transitions; repeats/relevance; stoppedmodelSave/reopen/savedmodelrealcontinuation;10Orgcompactmode/width taskvisits andactiveAPIstrict/inspection; ownedmigration/derivedwritefailure processchecks passed.
- **API-FIND029**: shared standaloneTeam acceptedsettledtask named verifier link -> realError500/notvisiblememberofexactTeam. Normaltree/button confirmation no syntheticquery/noactivation/no writes; taskstillaccepted. PreliminaryImplementationLocalFix, independentownerreviewrequired. Initial consumedTeamquerypostcondition is APIownedcorrection, not explanation forrealError500. No tasktoolstall/servercrash inferred.
- Remainingcompactlocale/standalone390/inactive/frozen/permutations, dedicatedlivefirsttitle, browserrecovery/exhaustion, mainrestart/Restore/compaction/stoppednegative/frozenopenUIStop heldNotTested. Nooldpasssubstitution. Historicalunknownfirstguard/delay/stalls unchanged.
- Actual postrepository84.9%Required -> final50/95/90/98/80/50/90=**79.0% Fail**; criticalAC034failureindependentlyblocksPass.
- No source/durabletestchange/staging/commit; CRR059priorfivefilePass retained, laterapplicableproportionaldispositionrequired. Sharedbrowser/auth preserved; tabs15/16closed; servercleanexit0, ownrendererSIGTERM/observersoff;4generatedoutputs17owntmpdirs6envfilesremoved;19fixtureunchanged. Canonicalreports/ledger/revision andAPI26case-reconciliation/finalconfidence/cleanup/integrity persisted; focusedfailure-originroute, noDeliveryreadiness.

### API-REV-027 — Full current CRR066 renewal; exact retained Team task fix validated

- Trigger: Code Reviewer CRR066, canonical code-review-report.md; user full retesting. RER032 / cumulative AD022 / parentAD021-ARCH019 Pass / IR001–043; artifact6da826f8c246c197a70cceb69e19e33fdbdfdf69/source4ffcdf733ff597a0d2ae94587eb91ec47f749501. Large/High Reviewed.
- Previous result: **API26 Fail79.0%**. Current: **Pass95.6%**, 2026-09-11T17:34:48.711002+00:00. Fresh full matrix, not delta or old-result reuse.
- Durable delta: none. Temporary exact retained normal-tree helper, second same-address standalone formal cycle, actual retained transport replacement, scoped observation corrections only. Historical CRR059 five-file review unchanged; request current separate proportional N/A disposition.
- Added/rechecked:9cycles/36localupdates,35successful nativepairs plus one disclosed post-success providerwrappererror;12ordinarydirections and restored equality; repeatedtask/host/provider/noactivation readonly active/inactive/desktop390/locales, fresh same-window4scopepublication, all authoring/config/model/compaction/task/status/summary/history/strict/migration/recovery/frozenStop/tworestarts/shutdown.
- Repository: server156/874, web160/1039, core6/29, Electron9/39, builds/guards/audit0/Brief/devkit; exact overlaps not additive. Real production browser tabs17–22, own server8600/staticrenderer3600, freshdata/currentCodex; no nativeAppImage claim.

| Prior reference | Previous classification | Current resolution | Evidence |
|---|---|---|---|
| API-FIND029 | Source-resolved IR043, API26 observed standalone retained target Error500 | **Execution-resolved** through normal tree/Tasks named target; exact original/repeat IDs/content/Activity/read_only, no write/reactivation/fallback; bothwidths/locales/inactive and real liveevent/replacement snapshot retention | API27/live/CLEAN-TEAM-retained-current.json; CLEAN-TEAM-REPEAT-retained-current.json; CLEAN-TEAM-retained-inactive.json; CLEAN-TEAM-live-continuity.json; CLEAN-TEAM-reconnect.json |
| API-FIND028 | API26 real coldOrg resolved | Fresh current cold390 no-drawer +inactive continuity pass | API27/live/CLEAN-navigation-quiescent-confirmation.json; repository/cold-navigation-inactive.json |
| API26 held cumulative cases | Not Tested | Fresh current full required scopes complete; originalDirect pre-readiness stopped-view observation remains incomplete, separate secondphase exacthistory-readyjourney passes | API27/case-reconciliation.md; RESTORE-direct-second.json; final-live-state.json |

- Original nonzero observations retained/disposed explicitly in current report: APIownedsetup/selector/observation scope; not product defects. Repeatedrequest_revision nativewrapperReferenceError afterlocal success is runtime-only, not outerprovider success. Historical unknownstalls/API20firstguard unchanged. No acceptedwork replayed.
- Cleanup:3SIGTERMexit0,2purestartupbytes+mtime unchanged; own6tabs/observers/processes/env/initiallyabsentbuildoutputs/currenttmp removed; fixture19unchanged and all non-APIotherownerbaseline hashes preserved; sourceHEAD/no source/durable delta/diffchecks pass.
- Artifacts: canonical investigation/execution/ledger/revision plus API27 case-reconciliation/confidence/cleanup/integrity and originalfailure receipts.
- New/remaining API finding: none. Required next recipient: Code Reviewer via current handoff rules for separate applicable proportional disposition. Native/package/docs/userverification/release/deployment downstream, not signedoff.

### API-REV-028 — Fresh CRR069 renewal; live standalone Team context publication failure

- Completed 2026-09-12T00:39:52.490279+00:00: **Fail / 74.0%**. Previous API27 **Pass95.6%** is older IR043 evidence, not current proof. RER032 / AD023 / ARCH020 Pass / IR001–046 / CRR069; Large/High Reviewed.
- Tested artifact b3de58a24bcfc0173ae414924b5079e1f7ead838/source61f633abe669d1283a617847c7294ce7b8047bb6. End HEADa85c9c1 adds only Architecture read-only warning investigation; production/tests byte-equivalent. API made no production/durable test edits, staging or commits.
- Fresh repository main server156/874 +web162/1085 +core6/29 =324distinct files/1988tests; separate Electron9/39 overlaps web, not additive. Current14/165 and retained exact suites, builds/bootstrap/Nuxt16routes, guards/audit0, devkit/Brief, registered flat A–F fixture probe passed. Repository84.9%, broaderRequired.
- Actual import/authoring/Apollo/partial/Chinese handoffs/desktopconfig/runtimeRetry-default passed within recorded scope. Current isolated migration/derived-index failure/controlled notification process cases passed. Real standalone Team delegation+task provider response completed.
- **API-FIND-030**: two independent normal Team runs durably activate an exact task but actual browser context insertion triggers undefined memberAddress in listAgentContextEntries through synchronous reactive observation. Consecutive wire activation40/status41 then causes client expected40/received41 gap; secondrun expected23/24. Amber warning/zero Tasks, no task row. Local/provider delegation success and both final markers retained. **No submit/review was attempted**, no new backend/provider/FIFO stall attributed. Preliminary ImplementationLocalFix, independent failure-origin review required.
- Whole cumulative matrix not completed: remaining formal cycles/Org messages/publication/status/identity/inspection, compact/locale/narrow, saved-model/provider/compaction, title/mainrestart/Restore/frozenStop/recovery and newVAL054–058 live proofs heldNotTested. Full36group reconciliation persists; no historical pass substitution. Prepared temporary scripts not executed are not evidence.
- Optional quiescent recovery control never navigated: intentional active tasks keep root task-lifecycle hasOpenWork true. No extra stall finding. Independent confirmation setup refresh fixed stale pre-import controller before action; no accepted replay.
- Final50/75/80/98/75/50/90 =74.0%; actual critical failure and missing critical proof blockPass. Current no durable delta; historicalCRR059 testreview preserved; successful proportional gate not entered.
- Owned server SIGTERMexit0/rendererSIGTERM/two unfinished tasks interrupted+settled for cleanup; two own tabs closed/allother preserved/29logpointsremoved/collector56stopped. Browser observer detach after closedtarget exitednonzero, APIownedcleanupissue disclosed. Four initiallyabsent outputs/17owneddevkitdirs/6envfilesremoved;13911protected otherownerhashes/19fixturehashesunchanged; diff/no staged/no unmerged pass.
- Artifacts: current canonical investigation/execution/ledger plus API28 case-reconciliation, final/confidence.json, final/cleanup-integrity.json and live/API-FIND-030-standalone-task-activation-context-publication.md. Historicalunknownstall/firstguard/nativewrapper limits unaltered. Focused failure-origin route, not Delivery/native/AppImage/user/release readiness.

### API-REV-029 — Fresh CRR071 renewal; task publication fixed, Org attachment gap confirmed

- Completed 2026-09-12T02:08:38.036910+00:00: **Fail /78.9%**. Previous API28 **Fail74.0%** remains historical. RER032 / AD023 / ARCH020Pass / IR001–047 / CRR071; Large/High/Reviewed. Source37200cbe75a927ed2ad02c829d08e30b1c4d9239, reviewed artifact56fb8983fba0fb6a35b031aa6124f9ca07b0aab1. End HEADa7bb813a4c76abdbe58b17c13c210a74448b513b has only new Architecture package note; production byte-equivalent. In-flight owner requirement/contract requests disclosed, not adopted silently.
- **Prior API-FIND030 execution-resolved**: normal imported standalone delegation activates exact fresh task and actual monitor/status without prior placement exception/sequence gap. Nine formal cycles/36calls now pass with provider/MCP/FIFOstart/durable/HTTP/result correlation, initialsubmit→revision→same-taskresubmit→accept and exact live settlement. No historical stall/firstguard attribution inferred.
- Fresh repository server156/874 + web163/1089 + core6/29 =325unique mainpaths/1992tests; separate Electron9/39 already in web. Builds/bootstrap/Nuxt16routes/guards/audit0/devkit/Brief/current package/registered A–F passed. Repository84.9%, broaderRequired.
- Current material real passes: import/authoring/Apollo/export/config/locale; configured+task ordinary directions/references/notifications/actualidentity/relevance; compact Tasks/Messages/retained cold/settled/noactivation/readonly; models/provider/compactionfixture; ownedmigrations/derivedfailure/strictrecovery/frozenStop; first main restart/VAL054/all-target noactivation and normal Team/fourOrg continuation/restored equality/title. Full36group reconciliation:29Pass/5NotTested-partial/1Fail/1N/A; groupcounts not case/test success rate.
- **New API-FIND031 / VAL055 confirmed**: normally stopped direct /concierge and mounted /research-team/lead cannot attach selected file using real enabled Upload chooser. Exact change event, ContextFiles0, no HTTP/upload/error; same standalonecontrol POST200/display/removal succeeds. Before Send/Restore. Shared standalone-only draft-owner resolver + silent null-owner return correlate source. Preliminary ImplementationLocalFix; independent Code Reviewer origin/design adjudication required, not IR047-specific blame or provider/FIFO/network stall.
- Held: attachment readiness/newerdraft/discard/focus permutations; full background/finalreadStop/negative/stalegeneration VAL056–058; actual Team replacement/reconnect; secondrestart/finalUIStops. Selected normal Stop/text-only continuation pass only within recorded scope. Prepared helpers and historical passes do not substitute.
- Durable delta **one updated registered model probe**: fixed700ms fixture wait replaced by explicit initial-read gates with same assertions/defaulttimeout/payloads; A–F pass, original failed receipts retained. No production/test deletion/staging/commit. Current successful proportional gate not entered; pending after later successful package; CRR059 prior five-file review preserved.
- API-owned assertion/locator/correlation issues explicitly adjudicated without replay: first-readtimer, cold whole-phase reads/idle, render waits, providerouteroutput, socketcounter, emptySend, collapsedtree. Actual attachment failure survives independent normal-control comparison.
- Final50/95/94/98/75/50/90 =78.9%. Critical actual failure plus held proof blocks95target. Cleanup: bothserverSIGTERM0; ownrendererSIGTERM143 (not0); observers/tabs/29logpoints/collector/clientclosed;4generatedoutputs/17owndevkitdirs/6envremoved;14868protectedhashes/19fixtureunchanged; ownerauthoritydrift separatelydisclosed/preserved. No current native/AppImage/user/Delivery/release claim.
- Canonical investigation/execution/ledger/revision current; API29 case-reconciliation, final/confidence+cleanup-integrity+authority-drift, finding/normalcomparison/rawreceipts/durable diff retained. Route via current failure-origin rule, not successful-test review.

### API-REV-030 — Fresh CRR073 renewal; valid local Team handoff blocks Org Save
- Completed 2026-09-12T04:40:30.231555+00:00: **Fail / 73.6%**. Previous API29 Fail78.9 historical. RER033/AD025/ARCH022 Pass/IR001–050/CRR073; Large/High Reviewed. Source3005c8921781108af7d4bef9938c26c7f6aaf53a; reviewed/final artifact3e13333d24ac3cdc8cfe30251baab344f40fc0d7 unchanged.
- Prior API-FIND031 silent no-upload symptom execution-resolved in four actual direct/mounted active/inactive chooser/text-image-open/remove-clear cases; exact owner/bytes, no prep/read activation, memory unchanged. Wider sent/retained/task/cross-view/finalization/readiness proof held.
- New **API-FIND032**: valid current org_local package; exact Team/Org queries admitted, no diagnostic. Normal cold catalog/detail/Edit description/Save marks unchanged /team handoff unavailable, zero update and unchanged six files/revision. Preliminary Implementation Local Fix, focused review required. Original locator/response-wait attempts retained; separate cold confirmation exit2 proves failure without accepted replay.
- Fresh server166/925 +web173/1139 +core6/29 =345distinct main paths/2093tests; Electron9/39 already in web. Builds/bootstrap/Nuxt16routes/guards/audit0/devkit22/Brief pack/registeredA–F/current fixture pass; narrow overlaps nonadditive.
- Real shared import/authoring/Apollo/hidden values/en-zh handoffs/config+Retry/default/override/persisted launch/no-task selectedStop pass. Controlled notification/real derived-write/owned shape startup/no-write/interruption pass in scope.40group reconciliation {'Pass': 8, 'Not Tested': 30, 'N/A': 1, 'Fail': 1}; partial groups remain Not Tested. No full provider/formal/task or saved-locator process proof.
- One pending durable model-probe path: two API30 all-initial-read awaits refine API29 gate after validity investigation; same assertions/timeouts/data, correctedA–F Pass. Combined diff/ownership retained; successful proportional review pending, not N/A. No production/staging/commit change.
- Repository84.9%Required -> final50/85/75/95/75/50/85 =**73.6% Fail**. Failed actual AC and held critical evidence independently block Pass.
- Cleanup both main server starts0/derived0; rendererSIGTERM, waiting auxiliary cancellation143 not product failure; own tabs/observers/inspector/collector closed/all others preserved.4 generated/17 own dirs/4 own env removed; preexisting devkit retained;48679 other-owner hashes and19 fixture hashes unchanged, sole declared test delta; no authority drift/unmerged/staged/diff issue.
- IR049 terminal-family/old-locator installation restriction persists: no replay/reset/new migration ID/live mutation/rollout claim. Historical stalls/API20 firstguard/delay/DR007-009/native limits and CRR059/IR041 ownership unchanged. No current native/AppImage/user/Delivery/release readiness.
- Canonical reports/ledger/revision, API30 case reconciliation/confidence/cleanup, finding/cold proof/screenshots/durable diff persisted. Current dynamic Fail handoff for focused origin review, not successful-test review.

### API-REV-031 — Fresh CRR076 renewal; exact owned Agent cached read blocks cold Save
- Completed 2026-09-12T07:33:48.503492+00:00: **Fail /72.1%**, cumulative execution incomplete. Prior API30 Fail73.6 historical. RER033/AD025/ARCH022Pass/IR001–052/CRR076, Large/HighReviewed. Sourcea1ce590b859518d813cbd35dbaf8294b58aa97f1 / reviewed+finalHEAD e99c429317f7e2c14ad6cb4f305413c005c624d4 unchanged.
- Prior API-FIND032's owned Team-unavailable symptom gone; full descriptionSave still fails through different owned direct Agent lookup. **API-FIND033 confirmed:** actual GraphQL200null despite admitted validpackage, exactFileproviderreturnsAgent; actualCachedproviderreturnsnull from exhaustive shared/application enumeration. SharedAgent/ownedTeam/genuineabsent controls truthful. Editor disabledSave1502/390, zeroUpdate/sixbytes+revisionunchanged. Preliminary ImplementationLocalFix; no oldstall/sourceorigin reassignment.
- IR052 full actual emitted Org-ownedTeam-sharedAgent-BacksameTeam-sameOrg passed en/zhdesktop390 plus unscoped same-name standalone control; no mutations/globalownedexposure/pageerror. Does not waive independent Savefailure.
- Fresh repository166/925server +175/1156web +6/29core =347unique mainfiles/2110tests; Electron9/39 and exactcohorts overlap. All24commands0, builds/bootstrap/Nuxt16routes/guards/audit0/devkit22/Brief/registeredA–F/current19filefixture pass. ActualSettingsimport/catalog/details/readonly/tools pass.
- Full41groups5Pass/34NotTested/1Fail/1N/A; remaining fullauthoring/export/config/attachments/provider/formaltasks/messages/models/VAL054–058/restarts/Restore/auxiliarymigrations/shutdown held. No providerturns/rootlaunches; normal emptyserverrestart is not active recovery.
- Repository84.9Required→final50/85/65/95/75/50/85=72.1Fail. Initialtemporaryrunner-before-scaffold error retained(no testsstarted); originaldisabledclicktimeout retained, independentlyconfirmedwithout replay/timeoutchange. No new durableedit; carried modelprobe SHAa25f958cfdee1c1f58120a2d7fc595d04378f8421268c1c8a22a2fa5cfaabef2 unchanged and pending proportionalsuccessgate, notN/A.
- CleanupbothownedserversSIGTERM0; rendererSIGTERMnot0; ownphase tabsclosed/allotherpreserved.4initiallyabsentoutputs/17owntmp/1ownenvremoved;49615regular+11symlinks+19fixture unchanged, no authority/source/test/stage/unmerged/diffissue. Isolatedseed/evidence retained; no liveinstallation mutation.
- IR049 terminalfamily/oldlocator installationtransition restriction, CRR059/067/IR041 ownership and historical unknownstalls/API20guard/delay/DR007-009/native limits preserved. No current native/AppImage/user/Delivery/release result. Canonicalreports/ledger/revision and API31 finding/correlation/currentreconciliation/cleanup persisted; route focusedfailureorigin undercurrentdynamicrule.

### API-REV-032 — Owned Save fixed; reopened retired Team status is false
- Completed 2026-09-12T13:13:47.374068+00:00: **Fail /77.1%**, cumulative matrix incomplete. Prior API31 Fail72.1%; RER033 / AD025 / ARCH022 / IR001–053 / CRR078; Large/High/Reviewed. Source dcc0419dd2dea54ea1ee4d0dca27b48521e68745, reviewed8f744b4d68e0ef163e4106eae2d5bb407440399f; final5b2c52bb adds only AAV002.
- **Prior API-FIND033 resolved** by actual normal cold owned description Save/reopen, exact Agent/Team refs/handoffs/revision; full Org-Team-sharedAgent-BackTeam-Org1502/390/en/zh/control also passed. Complete supported package roundtrip passed; original Org-only structural rejection remains assertion-limited under AAV002, not source failure or passing negative.
- New **API-FIND034**: normal reopened standalone retained first/repeat task buttons select correct accepted/settled Agent/conversation with no composer, but both show Accepted · Initializing at1502/390. Quiescent exact checkpoint648 unchanged, no commands/mutations/root writes/errors. Preliminary ImplementationLocalFix; active-history placeholder/live-only snapshot interaction is candidate, introducing origin unassigned. No reactivation/settlement/provider/rename blame.
- Fresh25 repository commands all0, server168/939 +web175/1156 +core6/29=349mainfiles/2124tests; Electron9/39/focused overlap not additive. Builds/bootstrap/Nuxt16routes/guards/audit0/devkit/Brief/registeredA–F/fixture19 pass. Auxiliary isolated notification/derived/owned migration+locator/interruption/currentzero-write pass.
- Nine valid formal matrix tasks/36accepted updates;32 full physical correlations and firstTeam4 with explicit physical-writer timing gap. Four exact live status windows/three physical activation-order observations, configured4/task8 messages, exactrepeatidentities/17relevance, Agent/Team savedmodel/provider, fourchooser/open and one real taskfileSend/open pass within scope. Extraautoacceptfixturetask, two malformedproviderdelegations and early/late rejectedreviews remain separate; noaccepted replay.
-41groups {'Pass': 22, 'Not Tested': 17, 'Fail': 1, 'N/A': 1}; remaining locale/retained/recovery/mainrestart/Restore/nativecompaction/frozenStop/VAL054–058/completeattachments held, not inherited Pass.12compactviewport observations passed before fault; earlier read-only navigation passes not erased.
- Repository84.9%Required -> final50/90/90/95/75/50/90 =**77.1% Fail**. No new durable delta; carried modelprobe+13/-2/SHAa25f958c unchanged, proportional review still pending after eventual success.
- Cleanup current+initialserversSIGTERM0; ownrendererSIGTERM(noexit0claim); own tabs/observers/29logpoints/collector stopped, all sharedtargets preserved.4newoutputs/17owndevkitdirs/7env removed;50032/50033regular unchanged, soleArchitectureAAV002change retained;11symlinks/19fixture preserved, source/test/stage/unmerged/diffchecks pass. Initial cleanup HEAD-vs-dirty scope error preserved and corrected from exact baseline, no file repair.
- Canonical investigation/report/ledger/revision and API32 reconciliation/finding/currentreceipts/confidence/cleanup persist. IR049 realinstallationtransition restriction, historicalCRR059/067/IR041/API27/DR007/009 and unknownstalls/API20guard/delay limits unchanged. Focused failure-origin routing; no native/AppImage/user/Delivery/release result.

### API-REV-033 — Retained Team status resolved; retained text attachment omitted
- Completed 2026-09-12T15:10:18.882622+00:00: **Fail78.6%; cumulative incomplete**. Prior API32 Fail77.1%; Large/High/Reviewed; current source3d9a019d320878c421429f27c0f074f9a4c4c2f5/artifactf8a3f37af0969748f05f0605e5fae1a1cc77f10f unchanged. RER033 / AD025 / ARCH022 / IR001–054 / CRR080.
- Prior API-FIND034 resolved by normal cold tree/Tasks first+repeat named participants1502/390 Offline, exact read_only/Activity/no writes/commands, en/zh active14permutations each. Owned Save/full return/package scopes freshly passed; AAV002 scope preserved.
- **New API-FIND035**: actual task Agent/task-Team chooser text+image Send/immediate opens pass; cold accepted/interrupted exact retained monitor4states1502/390 loses text control. Physical/direct GET/cross-view bytes and image intact; raw user trace/projection omit text locator. Preliminary Implementation Local Fix; origin/introducing commit/rename blame unassigned.
-26 current repository commands0;350mainfiles/2129tests (168server939+176web1161+6core29), Electron9/39/focused overlap. Builds/bootstrap/Nuxt16routes/guards/audit/devkit/Brief/registered A–F/fixture19 pass.8isolated auxiliary current process groups pass without actual installation cutover.
- Nine tasks/36 accepted formal calls fully physical/MCP/FIFO/provider correlated, including firstTeam4 previously uncorrelated. One early Direct rejection separate/no transition. Current messages/status/identity/relevance/authoring/model/live locales/summary/cold navigation/frozen Stop/recovery and partial attachment paths passed. No current outerReferenceError in36calls; historical limits preserved.
-41groups {'Pass': 28, 'Not Tested': 11, 'N/A': 1, 'Fail': 1}; main restarts/Restore/native compaction/full inactive/VAL054–058/reconnect/finalUI and remaining attachment lifetime held. Final seven50/90/95/95/80/50/90=78.6%, not a partial Pass.
- All API-owned helper failures retained/discriminated without accepted-operation replay: narrow drawers, sampler teardown, rejected-vs-accepted correlation, recovery wrapper count, image response.body versus actual blob, confirmation drawer. Actual retained text failure remains.
- Main+bootstrap normalSIGTERM0; rendererSIGTERM notexit0; own tabs/observers/29logpoints/collector stopped, sharedtargets preserved.4newoutputs/17owndevkitdirs/7env removed.52,053/52,053regular hashes/11symlinks/19fixture unchanged; no unexpected/missing/staged/unmerged/source/test drift.
- No new durable delta; carried +13/-2 modelprobe SHAa25f958c unchanged, separate proportional gate required only after eventual success, not N/A. Canonicals/evidence/cleanup persisted; focused failure-origin route. IR049 installation transition, CRR059/067/IR041/API27/29/DR007/009 and historical unknown stall/API20 limits unchanged. No native/AppImage/user/Delivery/release readiness.

### API-REV-034 — Original non-media row retained; cold uploaded filename shows storage prefix
- Completed 2026-09-12T17:28:41.286267+00:00: **Fail77.1%, cumulative incomplete**. Prior API33 Fail78.6 preserved. RER033/AD026/ARCH023Pass/IR001–055/CRR082, Large/High/Reviewed, focusedMedium/High. Source1cf011588db0d1f707519f0facce41c791951ed0 / reviewed841508edcb766eaf918ddd9bedf8217ae8ab3d6a; finalef61b2ac95c2166d3690bc797ee1d3ef4fa9ed16 adds only ArchitectureAAV003.
- Prior API-FIND035 missing-association symptom resolved for newly sent external Accepted task-Agent exact oneuserrow/URI/type/acceptedname/realinitial+page/cold/Open; complete native/task-Team/Interrupted lifetime still open, originalAPI33 missingfacts not reconstructed. Prior status/ownedSave/fullreturn revalidated current scopes.
- **API-FIND036**: one normal chooser+Send, then Accepted and cold same named task at1502/390 replaces friendlytextlabel with ctx-token storedfilename, while imagecleanlabel/rawrow/originalOpenbytes remain correct. No mutations/writes/activation/errors. AAV003 confirms existingCF08/DS045/VAL071 label assertion, no new normative scope. PreliminaryImplementationLocalFix, CodeReviewer owns origin; no introducingcommit/rename/stall blame.
- Current432disjointmainpaths/2624tests(188server1065+184web1234+60core325),30positive selectedcommands after legitimate setup; original11FAIL baseline retained. Two durable API-only managerinitialization/admittedsidecarfixture corrections make original11assertions Pass, no source/assertion/readiness weakening. Focused/Electron overlap; gated2Pass1Skip excluded as no provider execution. SDK-only Gemini availability not nativeapp proof.
- Eighttasks32accepted fully currentprovider/MCP/FIFO/physical/memorycorrelated;18notificationinputcorrelations and eightauxiliaryprocesscases Pass. Currentauthoring/config/messages/livepublication/chooser/coldselectedinspections scoped; no ninthdirecttask/fullmodels/fullruntime locales/recovery/mainrestarts/Restore/compaction/frozenStop/finalUI/VAL054–058/fullattachmentlifetime.41groups{'Pass': 18, 'Not Tested': 21, 'N/A': 1, 'Fail': 1}; sevenfinalscores[50, 90, 90, 95, 75, 50, 90] ->77.1%, criticalFail.
- Originalwrongtab/drawer/stalecontroller rejection/diagnosticpopup/wiresuffix issues preserved and corrected withoutaccepted replay; details final/failed-command-disposition.json. Existingprobe+13/-2SHAa25f958c unchanged; twoAPItestdeltas pluscarriedprobe require separate successfulproportionalreview AFTER eventual cumulativePass, notN/A.
- CleanupbothownedserversSIGTERM0/rendererSIGTERM,29logpoints+observers+collector andown2targets closed/allothers preserved.4outputs/17owntmp/7envremoved.54,384of54,387protectedregular unchanged;only2declaredAPItests+ArchitectureAAV003changed,11symlinks/19fixture/noextra/missing/staged/unmerged/sourcedrift. No liveauth/root orDR009mutation.
- Canonicalinvestigation/report/ledger/revision andAPI34evidence persisted. Focusedfailureoriginroute only; IR049 actualinstallation decision and CRR059/067/IR041/API27/29/DR007/009/unknownstall/API20guardlimits preserved. No native/AppImage/user/Delivery/releasereadiness.
- Final authority audit initial object-versus-hash comparison error retained/corrected before attribution, no actual mass drift or file repair.

### API-REV-035 — Label/Interrupted association renewed; restored-active readiness notice false
- Completed 2026-09-12T19:14:43.302929+00:00: **Fail77.9%; cumulative incomplete**. Prior API34 Fail77.1 preserved. RER033/AD026/ARCH023Pass/IR001–056/CRR084/AAV003, Large/High/Reviewed; source0f1986dcdd254105feab8b4cfdf255e36cfe8fc3/artifact2b31b4967627cd541e5063651026db2c8227cd9e unchanged.
- API-FIND036 familiar label execution-resolved on actual new external Accepted task-Agent oneSend→same raw/initial/typedpage/cold1502/390/Open. API-FIND035 additionally renewed on new external normalStop Interrupted task-Team. Original API33 lost associations never reconstructed; full native/owner/type/lifetime/pageUI gaps persist.
- **API-FIND037 / DS036 / VAL057**: real Restore + controlled projection readiness rejection, actual same backend root is_active=true but both-width UI says No run was started. No prepared Send; draft/error preserved. Read-only confirmation no mutation/writes. Original wrong exact error-heading timeout separately retained; original Restore response body not persisted, not reconstructed. PreliminaryImplementationLocalFix; CodeReviewer owns origin.
-31 current repository commands Pass;433mainfiles2633tests(server188/1065+web185/1243+core60/325), setup11/label16/Electron9/39 scoped overlapping. Models/compacted Codex continuation, first pure restart/Restore, live/frozen/restored locales, nine tasks36fullycorrelatedupdates/18acceptedinputcorrelations and8auxiliary cases renewed. No nativeapp execution or new durable edit.
-41groups{'Pass': 33, 'Not Tested': 6, 'N/A': 1, 'Fail': 1}; secondrestart/finalUI/selectedfinalread/VAL058/fullmissing-unreadable/fullCFnative-page-lifetime remain NotTestedpartials. Sevenfinalscores[50,90,90,95,80,50,90] mean77.9%, not passpercentage. All6 original failed command receipts and harness reconciliations retained withoutaccepted replay.
- Normal configuredbootstrap/initial/restartserverSIGTERM0, ownrendererSIGTERM, observers/collector/29logpoints/owninitial+restarttabs closed/sharedpreserved.4outputs/17ownchild50856tmp/7envremoved.56192/56192protectedregular/11symlinks/19fixture unchanged; no unexpected/missing/staged/unmerged/source/test drift. No appsecret provisioned; native helpers prepared only.
- All3 carried API durable deltas remain unchanged/unstaged and require successful proportional review AFTER eventual cumulativePass; not granted/N/A. Canonicals/evidence/revision persisted, fresh failureoriginroute required. Preserve IR049actualinstallationdecision, CRR059/067/IR041/API27/29/DR007/009 and historical unknownstall/API20guard/native/outerlimits. No Delivery/native/AppImage/user/release readiness.

### API-REV-036 — Readiness truth renewed; confirmed inactive root keeps pending live controls
- Completed 2026-09-12T21:06:37.803509+00:00: **Fail78.6%; cumulative incomplete**. Prior API35 Fail77.9 preserved. Current sourcefbd268f543471ebf754837d6deec19127b172eb4/artifact071a0b6a81ffb51a6539a1fc1d4fa14af5e1c782; IR001–057/CRR086/RER033/AD026/ARCH023Pass/AAV003; Large/High/Confirmed/Reviewed.
- Prior API-FIND037 execution-resolved first: normal inactive→actual fully captured successfulRestore→controlledreadinessfailure→truthful retained-route recovery en/zh1502/390; full held newer/discard/focus/finalread controls renewed. Old API35 missing response never reconstructed. API-FIND036/035 current externalAcceptedtaskAgent/normalStopInterruptedtaskTeam sameoriginalrow/URI/owner/type/rawname/friendlylabel/Open scopes renewed; native/allowners/olderUI stillopen.
- **API-FIND038 / DS037 / VAL058**: normal actualStop→backendinactive/centerOffline, but root Runninggreen/enabledStop persists during three1-second genuine pendinghistory samples. After actual unchangedresponse delivery controls clear. Not proven post-consumption resurrection. Full exactresponses/identity and desktoppending/afterimages inspected; narrowpendingunexecuted. PreliminaryImplementationLocalFix; CodeReviewer ownsorigin.
-32selectedrepositorycommandsPass;433distinctmainfiles2637tests(server188/1065+web185/1247+core60/325); focused35/setup11/Electron9/39 overlap/scoped.241commandreceipts include12originalfailures; diagnostic0reproducesfailure, notPass.10tasks40correlatedupdates=9required/36+originalacceptedrepeat4supplement,18acceptedinputs. OriginalrepeatlaterDOMlost atworktreeparse; newthirdTeam suppliesrepeatUI, no replay. Models/externalcompact, firstpuremainrestart/2Team4OrgRestore/messages/locales/recovery/selectedfinalread and8aux+2boundedRestore negatives current.
-41groups35Pass4NotTested1Fail1N/A; secondrestart/finalUI/nativeworker/older-pageUI/fullCFmatrix/remainingprovidernegativesheld. Sevenfinalscores[50,95,90,90,85,50,90]mean78.6%, notPasspercentage.12failures/timing/viewport/source-phase/cleanupdispositions preserved; original transientbytes/URLs/Restorebody/delta maps not reconstructed.
-Environmentlocalfix: primitiveandcurrentwriterworktreeatomicreadanomaly independentlyreproduced, /tmp/tmpfscontrolsPass; ownPOSIXbacking withunchangeddataalias/URI/owner/schema andimmutableoriginalsnapshot. Final120filesbyte/modeexactcopied;120mtimequantizationsdisclosed, verifiedexactPAX bytes/nsmtime/modes before/tmpremoval. Noappcredentialprovisioned/nativehelperexecution.
-AllownedappservergracefulSIGTERM0/rendererSIGTERM/observers/inspector/collector/tabs cleaned; preexistingsharedbrowserpreserved.4initiallyabsentoutputs/17ownchild29250tmp/3externalcontrolrootsremoved; preexistingcore/server/devkitdistretained.58911/58911protectedregular/11symlinks/19fixtureunchanged; current810inventory/authority/pendinghash checks, no unexpected/missing/staged/unmerged/source/durableedits.
-All3carriedAPI deltasremainunchanged/unstaged; successfulproportionalreviewREQUIRED aftereventualcumulativePass, notgranted/N/A. Fullcanonicalreports/ledger/revision persist; freshsinglefailureoriginrule required. PreserveIR049actualinstallationdecision, CRR059/067/IR041/API27/29/DR007/009/oldunknownstalls/API20guard-delay/native/outerlimits. NoDelivery/nativeShell/AppImage/user/release readiness.

### API-REV-037 — Pending publication resolved; old response resurrects live controls
- Completed 2026-09-12T22:58:26.889520+00:00: **Fail69.3%; cumulative incomplete**. PriorAPI36Fail78.6 preserved. Sourcebbdea002ee59da87cc7174bfc2924888c0bb38f7/artifactd76731eaa3260a123f1ce8c6ace0e14994fddcde unchanged; IR001–058/CRR088/RER033/AD026/ARCH023Pass/AAV003, Large/High/Confirmed/Reviewed.
- **Priorfailurefirst:** API-FIND038 pending-only symptom execution-resolved in fourcurrentnormalhosted direct/mounted1502/390cases: actualStopHTTPsuccess->3greyStopped/noStop/backendinactive samples beforeoldreadrelease. OriginalAPI36missingnarrow/postconsumptionfacts remainmissing, notretrorepaired.
- **NewAPI-FIND039 / DS037 / REQ031 / AC026 / VAL058:** releasegenuineunchangedoldactivehistory->greenRunning/enabledStop despitebackendinactive; freshreadrejectionretainsfailure. AllfouronlylateReadCannotUndofalse; failed/pendingStopnonoptimism, exactselection/draft/expansion/conversation andnoboundarySend/Restore/pageerrorpass. OneactualStopperroot.
- ActualApollo3.14.0 diagnostic2concurrentnetwork-onlycalls/oneLink/botholdactive identifiescandidatecompositiongap; independentlymockedquerytests don'tproveit. PreliminaryImplementationLocalFix, CodeRevieweroriginneeded; nobroken-generation/filesystem/introductioncommit/IR057or058regressionattribution.
-33selectedrepositorycommandsPass;434disjointmainfiles2645tests(server188/1065+web186/1255+core60/325); exact50/recovery35/Electron9/39overlap. Currentbuilds/Nuxt16routes/3guards/devkit/Brief/registeredA–F/fixturePass. FreshPOSIXwriter1000commits9101reads0invalid.
-41groups2Pass37NotTestedpartials1Fail1N/A. Current5freshroots5uniqueinitialproviderinputs, no tasks/replayedacceptedwork; originaldirectrootstoppedonce duringinvalidHTTP-onlypendingpremise, fournewconfirmations. Fullremainingauthoring/task/model/native/attachment/strictAPI/migrationaux/mainrestarts/Restore/finalUI held, notcarriedAPI36Pass.
-57structuredreceipts8originalnonzero:4product+2helperpremise+1Apolloimport+1cleanupphasename. Alloriginalreceipts/logs/helperversions/dispositions retained; initialHTTP-onlyattemptWSreceivetimingnotcapturedorrebuilt. Repository73.6Required->finalseven[50,95,75,90,50,50,75]=69.3; directness95reflectsstrongfailureproof, notcorrectbehavior.
-Bootstrap/mainnormalSIGTERM0; ownrendererSIGTERM; ownbootstrap/currenttabsclosed/all4otherspreserved, noobserver/collector/inspectorinstalled.4outputs17ownchild36336tmpremoved; preexistingdistretained.78runtimefilesexactPAXverifiedthenbyte/modeexactcopiedwith78currentmtimequantizationsdisclosed; own/tmpremoved. PriorAPI36anomaly/120quantizations/PAXuntouched.
-62,243protectedregular/11symlinks/19fixture unchanged;811cumulativeinventory/1478authority/3APIpendinghashes+numstatsverified; nostaged/unmerged/source/durablechange. Nonewdurableedit; successfulproportionalreview remainsREQUIREDaftereventualcumulativePass, separate reportuntouched.
-Canonicalinvestigation/report/ledger/revision and currentfinding/reconciliation/cleanup persisted. Fullcumulativefailureoriginroute underfreshrule. PreserveCRR059/067/IR041/API27/29/DR007/009/unknownstalls/API20firstguard/nativeouterlimits, originalAPI35missingbody/API33lostassociations, old10tasks40correlations18inputs notreplayed. IR049actualinstallationdecisionbeforecutoverArchitecture-owned, notcodinghold. NoDelivery/nativeShell/AppImage/user/release readiness.

### API-REV-038 — Prior race resolved; cumulative journeys complete with bounded first-send Open failure
- Completed 2026-09-13T03:21:00.373395+00:00: **Fail85.6%**, priorAPI37Fail69.3 preserved; CRR090Pass95.1/RER033/AD028/ARCH025Pass/AAV003/IR001–059, Large/High/Confirmed/Reviewed. Source6e2d7997444383d5585225d9febbc1ee54247714/HEAD3155da09c33c0bb5aeea19d0b2243a8163cc9595 unchanged.
- PriorAPI-FIND039/038 first renewed on4freshhosted direct/mounted1502/390cases: immediateinactive/noStop beforeheldreadrelease andafteroldbody/latestrejection.12freshroot/memberoverlapPass;5originalsetupfailures preserved. API37Fail not retrochanged; adjacency notfiftholdfailure.
-34mainrepositorycommandsPass/436disjointfiles2708tests; currentbuilt16routes/3guards/devkit/Brief/A–F/fixture.320structuredreceipts37originalnonzeros retained; not37productbugs. Full42groups38Pass3Fail(2useraccepted,1unwaived)1N/A; no planneduserjourneysrunning. Nativeimagesexcludedbyuser; positiveunknowningestionnotproved(chooser400negative), allotherscopesexplicit.
-Nineformalacceptedtasks36updatescurrent; twoadditionalnativeattachmenttasksInterrupted. Mainauthoring/models/summary/status/recovery/tworestarts/Restore/strictAPI/transition/attachmentmatrixcurrent. ActualDeepSeekGUIAgent/OrgfirstSend,39distinctgrowthinputs/olderpage1502/390,4Org/tasktextJSONsends and8stoppedviews completed. Historical10/40/18 notinherited.
-**API-FIND-040 / API38-NATIVE-LIVE-TEXT-OPEN**: actualnativefirststandalone senttextchip opensstaledraftURL404; normalreopenfinalURL200/exactoriginalbytes. Boundedaccessfailure, nodurableloss. PreliminaryImplementationLocalFix; introducedversuspreexistingoriginunassigned. Originalseparatelinkbehavior matcheslocalorigin/personal anduseraccepts; not404waiver.
-UserexplicitlyacceptedpremessageTeamIdle-vsOffline andoneunexpectedmountednavigation; preserveobservationsnotfixed. No blanketnonmajorwaiver. Requirementsproof/Usersurface remainlow; finalseven50/98/96/95/95/75/90mean85.6, cleanPassblocked.
-No newdurable/sourceedit;3carriedAPIhashes63dcedbd/617332f6/a25f958c unchanged/unstaged; separateproportionalreviewstillrequiredaftereventualPass. Temporaryoracles/cleanupcorrections and originalmissingconfiguredinterruption snapshotdisclosed.
-All26Orgs3Teams2Agentsinactive/alltasksettled;4serverphasesSIGTERM0/rendererSIGTERM,ownobservers/tabs/2residualpopupsremoved/all4originalChromiumtargetspreserved. BothownedGemini/DeepSeekcredentialsremovedthroughcorrectESMservice; sourceenvunchanged/zeroentriesvacuumprearchive.295filesexactPAXthenbyte/modeexactcopy295mtimequantizations;ownPOSIX/4outputs/17PID94923tmpremoved,17baselinekept.63129regular/11symlinks/19fixture/814source/2287authority integrityPass.
-Canonicalinvestigation/report/ledger/revision/reconciliation/confidence/receipts/cleanup persisted. Freshdynamicfailure-originroute required; no successfultestreview/Delivery/nativeShell/AppImage/user/releaseacceptance. Preserveallhistoricalmissingfacts/unknownstalls/CRR059/067/IR041/API27/29/DR007/009/API20firstguard/AAV002/003/API36-37PAXlimits; IR049actualinstallationBEFORECUTOVERArchitecture-owned, notcodinghold.
