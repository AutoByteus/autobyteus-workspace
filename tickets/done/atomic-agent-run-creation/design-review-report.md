# Design Review Report — atomic-agent-run-creation (autobyteus-349)

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/requirements-doc.md` (Approved by the user, SR-002)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/investigation-notes.md` (F-01–F-12; the read-only count)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/solution-revision-record.md` (SR-001–SR-004)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/design-spec.md` (SR-004; user approval of the design: Obtained)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001–FU-004); `architecture-design-handoff.md`.
- Relevant Solution Revision IDs: SR-002 (approval), SR-003 and SR-004 (design)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/atomic-agent-run-creation/tickets/in-progress/atomic-agent-run-creation/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: SR-004, the design revision for ARCH-REV-001 (AR-001, AR-002), from `/software_engineering_team/solution_designer`.
- Prior Review Round Reviewed: ARCH-REV-001 (SR-003, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree @ `25107fb04f`. SR-004 is docs only (`git diff --stat b9703e2b37 HEAD`: the design spec, follow-ups, the solution revision record and `docs/design-cases.md`), so the round-1 code basis still applies. Round-1 basis at `b9703e2b37` (docs only on `origin/personal` @ `e87e6bb2b1`): Code opened at the cited lines:
  - `agent-run-service.ts`:
    - `:244-249` (`createAgentRun`: prepare, then activate, with no rollback);
    - `:270-272` (the `cleanupStalePreparedRuns` wrapper);
    - `:340, :356` (`bindProcessAgentRunService` and `getAgentRunService`, bound by `general-process-run-supervisor.ts:396` during `buildStudioServer`).
  - `agent-run-provisioning-service.ts:100-158`: `recordPreparedRun` with `startedAt: null`; `cancelPreparedAgentRun`; `cleanupStalePreparedRuns`, which judges by `preparedAt`, `startedAt` and expiry only.
  - `agent-run-history-catalog-service.ts`:
    - `:150-180` (`recordPreparedRun` writes the metadata and the index row with `summary`);
    - `:310-360` (`cancelPreparedRun`: `liveness.releaseForHistory` → re-read metadata → refuse unless `isPreparedIdentity` → drop the index row → `fs.rm(runDir, { recursive: true })` → `readiness.excludeCurrent`).
  - `standalone-run-liveness.ts:48-58`: `releaseForHistory` refuses an active host run and ends a registered root.
  - The memory layout, frozen copy `agent-memory-layout.ts:42-104`: standalone runs live under `memory/agents/<runId>`. A standalone root's collaboration children live **inside** the host folder (`getAgentRunCollaborationDirPath`).
  - Work journal: `work-journal-store.ts:45-54`, under the run's memory dir.
  - Context files: `context-files/store/context-file-layout.ts`, under the memory root, contained per run (`context-file-path-validation.ts`).
  - `server-runtime.ts:182-210`: the readiness index is rebuilt at `:183`; `buildStudioServer`; a `checkpoint`; then `prepareBeforeListen`; then `listen`.

## Routing Classification Review

- Task size: `Small`. Architectural risk: `High`.
- Classification rationale reviewed. Agreed:
  - Small: two owners' methods, one startup stage, and tests.
  - High: persisted user data is deleted at every startup, and a wrong "empty" test loses conversations, as the 11 May runs prove.
- Independent Architecture Review required: `Yes`.
- User approval of the design: `Obtained`, not `Pending`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- Approved intent:
  - REQ-001: one-call creation is all or nothing; a refused cancel is logged.
  - REQ-002: at startup, remove only a never-started run whose record is readable and whose folder has no file besides the record. Unreadable run data is skipped and logged, never deleted (DESIGN rule 7). No 24 h rule.
  - REQ-003: two-step creation and started runs are unchanged.
- The approved acceptable loss includes a removed run's index title, i.e. the first-message summary (Data Continuity).
- Relevant existing behavior: confirmed in code (above). The read-only count is the basis for rejecting `preparedAt && !startedAt` alone.
- Scope guardrail: confirmed. Out of scope: Team and Org, periodic removal (DEC-002), the web app's own cancel, hiding. Preserved: BEH-003, started runs, restore.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes`. None remain open.
- Statements about existing code the design relies on: all opened and correct, with line drift of about one line. SR-004 now also covers a content walk that cannot complete (AR-002 resolved).

| Behavior ID | Kind | Design Alignment | Trigger / Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Pass | Pass (F-01, F-03, F-04) | Pass (DS-001; mapped in SR-004) | Confirmed | — |
| BEH-002 | Operational | Pass | Pass (F-05; the read-only count) | Pass (DS-002; fail-safe walk in SR-004) | Confirmed | — |
| BEH-003 | User / contract | Pass (preserved) | Pass (F-06, F-07) | Pass (untouched; mapped) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

None. The requirements doc lists no supplements, and `follow-ups.md` is consistent (FU-001 Project start record, FU-002 `preparedExpiresAt` on the wire, FU-003 periodic removal).

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | SR-004: `Bug Fix` | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Missing Invariant`: no all-or-nothing creation (F-01), plus a dead and unsafe removal rule (F-05; the read-only count) | — |
| Refactor decision is explicit | Pass | `No`: both changes sit in their existing owners, and the unsafe rule is replaced, not kept | — |
| Supported by concrete sections | Pass | The Removal Plan and the File Mapping are concrete | — |

## Spine Inventory Verdict

| Spine | Readable | Narrative | Facade vs Owner | Naming | One Owner Per Node, In Order | Off-Spine Kept Off | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 create, then rollback | Pass | Pass (Intended Change D1) | Pass | Pass | Pass | Pass (warning log) | Pass |
| DS-002 startup removal | Pass | Pass (D2 steps 1–5) | Pass | Pass | Pass | Pass (removal log) | Pass |

- DS-001, redrawn:
  1. `createAgentRun` → `prepareAgentRun` (metadata, index row).
  2. `activate` → [throws] → `cancelPreparedAgentRun`:
     - the command-registry check;
     - `cancelPreparedRun`: `releaseForHistory` (refuses an active runtime, ends a registered root) → re-read metadata → refuse a started run → drop the row → `rm` the folder → exclude from readiness.
  3. On `!success`: warn.
  4. Rethrow the original error.
- DS-002, redrawn:
  1. Readiness rebuild (`:183`).
  2. `buildStudioServer`, which binds the process `AgentRunService` (`general-process-run-supervisor.ts:396`).
  3. `checkpoint`.
  4. ★ `shutdown.stage(removeEmptyNeverStartedRuns)`. Per run folder: readable record → `preparedAt && !startedAt` → content walk → `cancelPreparedAgentRun` → log.
  5. `prepareBeforeListen`, then `listen`.
  - No request path is open yet, so no concurrent writer can race the content check.

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunService.createAgentRun` | Pass | Pass | Pass | Pass | One sequence. The caller still gets the original error |
| `AgentRunProvisioningService.removeEmptyNeverStartedRuns` | Pass | Pass | Pass | Pass | Owns the "empty never-started" rule |
| `AgentRunHistoryCatalogService.cancelPreparedRun` | Pass | Pass | Pass | Pass | Removal is unchanged (its rules are deliberately left alone) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `server-runtime` → `getAgentRunService()` → provisioning → catalog | Pass | Pass ("never `preparedAt`/`startedAt` alone") | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentRunProvisioningService.removeEmptyNeverStartedRuns(): Promise<RemovedRun[]>` and the `AgentRunService` wrapper | Pass | Pass | Pass | Low | Pass |
| `createAgentRun` (unchanged signature) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Remove a prepared run | Pass | Pass (reuse `cancelPreparedAgentRun`) | N/A | Pass | It already refuses started and active runs |
| Startup removal | Pass | Pass (replace the unsafe dead rule) | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/services` | Pass | Pass | Pass | Pass | — |
| `server-runtime.ts` (startup order) | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

N/A: no repeated structure.

## Shared Structure / Data Model Tightness Verdict

N/A: no stored shape changes.

- Derived consumers of a changed structure (Principle 11): `N/A`.
- Each domain word keeps one meaning (Principle 15): `Pass`. "Never-started" means `preparedAt` without `startedAt`. "Empty" means no file besides the record. The design keeps the two apart, which is the point.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-run-service.ts` | Pass | Pass | N/A | Pass | — |
| `agent-run-provisioning-service.ts` | Pass | Pass | N/A | Pass | — |
| `server-runtime.ts` | Pass | Pass | N/A | Pass | — |
| Provisioning tests | Pass | Pass | N/A | Pass | The walk-failure and symlink cases are listed |
| Service and startup tests; docs | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

Pass. No new files besides tests.

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `cleanupStalePreparedRuns` (both) and its test | Pass | Pass | Pass | Pass | Dead and unsafe. Removed, not kept beside the new rule |
| `PREPARED_RUN_TTL_MS` | Pass | N/A (kept for the wire) | Pass | Pass | FU-002 |

## Legacy / Backward-Compatibility Verdict

| Area | Wrapper / Dual Path | Clean Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| The 24 h rule | No | Pass | Pass | Rejected with evidence |

## Persisted-Data Transition Verdict (When Applicable)

| Area | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Content-free never-started standalone runs | `Discard`, at every startup | Pass: the read-only count (6 empty, 11 with content), and the content locations are confirmed inside the run folder | Pass (not a migration; no shape change) | N/A | Pass | Inside the run folder: context files, work journal, raw traces, collaboration children. Outside it: the index row's summary (approved loss); token usage, ad-hoc Tasks and the Project start record (none for a never-started run except the start record, FU-001) |

## Change / Refactor Safety Verdict

| Area | Realistic | Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| D1, D2 (May shape first), the stage, docs, validation on temporary roots | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Avoided Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Create rollback | Yes | Pass | Pass | Pass | — |
| Empty test | Yes | Pass | Pass | Pass | A no-follow walk; any other entry or walk error → keep and log |

## Material Premise Validation (Only When Needed)

### `P-001`: the content walk of a never-started run's folder fails (AR-002)

- Related requirement: REQ-002 ("unreadable run data is skipped and logged, never deleted"); DESIGN rule 7.
- Behavior ID: BEH-002.
- Initiating basis kind: `System`. A run folder or a subfolder the server cannot read: wrong permissions after a manual copy or restore of the data folder; a file vanishing or being replaced during a sync tool's pass; a broken symlink; an I/O error on an external or network data root.
- Forward path:
  1. Startup → `removeEmptyNeverStartedRuns`.
  2. The record is readable, never started.
  3. The recursive walk throws (`EACCES`, `ENOENT`, `ELOOP`) or skips the entry.
  4. If the implementation catches the error per entry and continues, or treats "nothing listed" as empty, the folder counts as empty.
  5. `cancelPreparedRun` then runs `fs.rm(runDir, { recursive: true, force: true })`, which can delete whatever is there, including the unreadable content.
- Consequence: the very data loss REQ-002 forbids, for exactly the May shape if its folder is unreadable.
- Reachability: `Reachable`, rare (it needs a permission or I/O fault on a data folder). The consequence is unrecoverable.
- Review consequence: AR-002, resolved in SR-004 (D2 step 3: a no-follow walk, any other entry is content, any walk error keeps the run; the tests are listed).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed, both ARCH-REV-001 findings are resolved in the canonical design spec (SR-004), and no in-scope machinery depends on an unsupported premise.

## Findings

None open. Resolved in this round (details in `architecture-review-revision-record.md`, ARCH-REV-002):

- AR-001: the health assessment and the behavior map were added.
- AR-002: the content walk is now fail-safe, and its tests are listed.

## Classification

N/A (Pass).

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary). Informational notification to `/software_engineering_team/solution_designer`.

## Residual Risks

- **N-1:** a removed empty run takes its index title with it. This is approved.
- **N-2:** recorded as FU-004. `cancelPreparedRun` still accepts a never-started run with content, and the GraphQL `cancelPreparedAgentRun` takes any run ID. This is pre-existing, and nothing in the product reaches the May runs today.
- **N-3:** a peer delegation cut by a restart. This was accepted in DEC-001.
- **N-4:** the stage reads every standalone run's metadata at startup. Validation can note its time.
- **N-5:** FU-001, FU-002 and FU-003 are carried.
- **Review focus answered:**
  1. **The content check is sufficient** once AR-002 is applied. The run's conversation, journal, context files and collaboration children all live inside its folder. Outside it there is only the index row (approved loss), plus stores that a never-started run does not have.
  2. **Placement:** after `buildStudioServer`, which binds the process `AgentRunService`, and after the readiness rebuild; before `prepareBeforeListen` and `listen`. This is correct, and no writer can race it. Never throwing is right. The stage's checkpoint lets a shutdown that arrives during startup cancel after it.
  3. **D1 after `startedAt` was committed:** `cancelPreparedRun` refuses (`isPreparedIdentity`), and `releaseForHistory` refuses an active runtime and ends a registered root. D1 logs and rethrows the original error. This is correct.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. P-001 is resolved by SR-004's walk rule.
- Classification: task_size `Small`, architectural_risk `High` (agreed).
- Notes: implement per design-spec § Change / Refactor Sequence. All tests run on temporary data roots only, never the user's data.
