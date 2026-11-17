# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Requirements + Design) | Task autobyteus-493 dispatched on the founder's word (2026-11-17) | N/A | N/A | Requirements Approved; Design Ready | BEH-001…006, REQ-001…013, AC-001…012 | Architecture Design Complete, Large / High |
| SR-002 | Mixed (Requirements + Design) | The user's direction in the Solution Designer's conversation (slimmer entry from the agent's perspective); ARCH-REV-001 (`Fail`) | AR-001…AR-006 | Requirements Approved (SR-001); Design Ready; review Fail | Requirements Approved (SR-002); Design Ready | BEH-003, BEH-004, BEH-006; REQ-002, REQ-003, REQ-004, REQ-006, REQ-007, REQ-009, REQ-010, REQ-012; AC-001…003, AC-005, AC-007…010, AC-013 (new); DEC-003, 004, 005, 007, 011, 012, 013 (new) | Architecture Design Complete, Large / High; back to architecture review |
| SR-003 | Design | CRR-002 CR-001 (API-09/EC-06), API-15 | CR-001 | Requirements Approved (SR-002); Design Ready; API/E2E Fail | Requirements Approved (SR-002, unchanged); Design Ready | BEH-002, REQ-012, AC-009 (now met for unreadable records and manifests) | Architecture Design Complete, Large / High; to architecture review |

## Revision Entries

### SR-001 — Episodic catalog per agent definition (option A)

- Phase and classification: `Initial Baseline`
- Triggering input: Project Task autobyteus-493 (description of 2026-11-14 and the founder's comments of 2026-11-17)
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Approved`; design `Ready`
- IDs affected: BEH-001…006, SCN-001…004, UC-001…005, REQ-001…013, AC-001…012, DEC-001…012
- Scenario-basis changes: N/A (baseline)
- Why recorded: first coherent baseline
- Canonical sections: all of `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`; `follow-ups.md` (FU-001, FU-002)
- Supplemental artifacts: none
- Product design evidence: N/A
- Intended behavior changed: N/A (new)
- Approval: requirements approved by the Solution Designer within the founder's direction; the user was informed in the Solution Designer's conversation on 2026-11-17 with the decisions DEC-001…012 (option A only; summary from records with Task key and title, no conversation text; archived kept and marked, deleted removed; automatic background build, his node gated by delivery; old id forms and unattributed folders not joined; 491 separate)
- Behavior-defining supplements: none
- Affected design/review basis: N/A (first)
- Classification: `task_size=Large`, `architectural_risk=High` (new subsystem, discovery moved across subsystems, new derived persisted files, privacy boundary, background lifecycle)
- Applied handoff-rule outcome: recorded in `handoff-architecture-review.md`
- Downstream impact: independent architecture review before implementation
- Remaining gaps: none blocking; delivery gates (the founder's approval and a backup before the first build on his node; release only on his word)
- Next action: architecture review

### SR-002 — Slimmer entry from the agent's perspective; ARCH-REV-001 resolved

- Phase and classification: `Requirement Gap` (user change to intended behavior) + `Design Impact` (AR-001…AR-006)
- Triggering input: (1) the user, in the Solution Designer's conversation on 2026-11-17, questioned the delegation/node fields and the Task key and asked: "think from the agent's perspective … what other necessary information we need and remove those redundant ones"; (2) `design-review-report.md` ARCH-REV-001, `Fail`, AR-001…AR-006 (on SR-001).
- Prior status: requirements Approved (SR-001); design Ready; architecture review Fail.
- Current status: requirements Approved (SR-002); design Ready.
- Intended behavior changed: `Yes`.
  - An entry is now: start → last activity, run id, Task title (when any), workspace, journal folder and files (name, time range, size) (DEC-013).
  - Removed from entries: where/context, delegation source, node, runtime, run state, Task key, file open/closed.
  - Archive no longer changes the catalog; delete removes entries (REQ-006).
  - One `catalog.md`, no JSON copy, no "updated" time; files are written only when their content changes (REQ-003, REQ-010).
  - At every start the catalogs are rebuilt in the background with records read once (REQ-007; AR-001 option b). Agents whose runs are all gone get a catalog listing no runs.
  - The overview drops the unattributed count (REQ-009).
  - The Task title comes from the run's current Task in any role (REQ-004; AR-003).
- Approval: the user's direction (his words above); the Solution Designer decided the exact entry (DEC-013) and the review-driven refinements within it, and informed the user.
- Design changes:
  - AR-001: start pass reuses `findRuns()`, renders every definition found in discovery or as an existing folder, and writes only changed files.
  - AR-002: construction order for both composition roots; the catalog is created after steps 1–2, passed to step 3 and steps 4–8, started after `composeCollaboration` with `taskTitles`, and stopped at close. No loader and no node id.
  - AR-003: `DelegationIndex.currentTaskOf` + `ProjectTaskService.taskTitleOf`.
  - AR-004: attribution table matches today; `root` is non-null; uncatalogued means `agentDefinitionId` null.
  - AR-005: timer in one sentence.
  - AR-006: dead surface in the removal plan.
- Classification: `task_size=Large`, `architectural_risk=High` (unchanged).
- Applied handoff-rule outcome: `handoff-architecture-review.md` (SR-002 section), to `/architecture_reviewer`.
- Remaining gaps: none blocking; delivery gates unchanged.
- Next action: architecture re-review.
- Addendum (same round, 2026-11-17): at the user's request ("create a contract file … like in the past"), `episodic-catalog-contract.md` was added as the behavior-defining supplement fixing the exact files, attributes and lines (approved with SR-002). It is linked from the requirements doc, investigation notes and design spec, and was sent to the architecture reviewer as part of the SR-002 package.
- Review result (informational): ARCH-REV-002 `Pass` on SR-002 (AR-001…AR-006 resolved); the reviewer handed the package to `/implementation_engineer`. The contract addendum above was written after that review's basis, so it was sent to the architecture reviewer for confirmation and forwarding to implementation (2026-11-17).
- ARCH-REV-003 (`Fail`, scoped to the contract, AR-007): the agent name is now one rule, the newest run's `agentName` exactly as discovery reports it (contract §2.3), with examples §2.5 and §3 matched (`solution_designer`, `Project Task Manager`). N-5 adopted: file lines write full dates for a same-day header range; `CatalogEntry.startedAt` is nullable. Design spec examples aligned. Resent to the architecture reviewer (2026-11-17).
- ARCH-REV-004 (informational `Pass`): the contract addendum is confirmed and forwarded to `/implementation_engineer`. The design spec's index.md example was reordered to match contract §3 (order by agent name).

### SR-003 — Unreadable records and manifests are explicit outcomes

- Phase and classification: `Design Impact` (CRR-002 CR-001; API-15).
- Trigger: API-09/EC-06 failed. A truncated team tree left T3's member out with no log line naming T3. The code reviewer traced it to discovery collapsing "unreadable" into "unattributed" (Principle 13). API-15: the doc said "left out" for an unreadable journal, but the code gave "no journal yet".
- Prior status: requirements Approved (SR-002); design Ready (ARCH-REV-002/004 Pass); implementation 0be36462ef; API/E2E round 1 Fail.
- Current status: requirements unchanged (no renewed approval: intended behavior and the contract are unchanged; REQ-012/AC-009 are now realized); design Ready.
- Design changes (design-spec § SR-003 Revision):
  - `DiscoveredRun.attribution` (attributed / unattributed / unreadable) replaces `agentDefinitionId`;
  - discovery reads the package diagnostics and the metadata state, and logs `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE` once per discovery instance per root and reason;
  - `readJournalSpans` returns none / unreadable / spans; the catalog leaves an unreadable-manifest run out with `EPISODIC_CATALOG_RUN_LEFT_OUT`;
  - the memory search mapping is unchanged.
- Classification: `task_size=Large`, `architectural_risk=High` (unchanged).
- Follow-ups: FU-004 (admission index silence) remains outside.
- Next action: architecture review of the SR-003 revision, then implementation, source review and API/E2E.
- ARCH-REV-005 (informational `Pass` on SR-003): no new findings; package delivered to `/implementation_engineer`. Implementation notes N-6 (no org `*` diagnostic exists, so there is no such branch; the design spec's org bullet was corrected) and N-7 (read the diagnostics after `listAgents` has awaited readiness).
