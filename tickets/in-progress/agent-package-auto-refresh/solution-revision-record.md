# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (2026-10-10) | N/A | N/A | Ready for Approval | BEH-001–008; REQ-001–017; AC-001–014; DEC-001–006 | Presented to the user for decisions and approval |
| SR-002 | Mixed (Requirements + Evidence) | User clarification of the primary journey (2026-10-10) | N/A | Ready for Approval | Ready for Approval | UC-001; REQ-002, REQ-010, REQ-012; new SCN-012, AC-015 | Primary delegation journey added; user assumption about edits corrected with evidence |
| SR-003 | Requirements | User feedback on the monitor scope (2026-10-10) | N/A | Ready for Approval | Ready for Approval | BEH-007, UC-003, REQ-005, REQ-011, REQ-014, AC-007, SCN-006, QR-002, DEC-005 | Skills removed from monitoring; monitor limited to definition structure and files; reuse of the existing watcher ignore rules recorded |
| SR-004 | Mixed (Evidence + Requirements) | User question on skill renames, and answer (2026-10-10) | N/A | Ready for Approval | Ready for Approval | DEC-007; Out Of Scope | Skill-rename evidence recorded; tolerant missing-skill behavior confirmed as intended; no warning UI |
| SR-005 | Requirements | Explicit user approval (2026-10-10) | N/A | Ready for Approval | Approved | All; DEC-001–006 | Requirements approved as recommended; architecture design started |
| SR-006 | Design (+ Evidence) | Architecture investigation and design (2026-10-11) | N/A | Approved / no design | Approved / Design Ready | All BEH/REQ mapped; DSN-001 added | Design spec complete; Large / High; catalog-bricking defect evidenced |
| SR-007 | Design (+ Evidence, editorial requirements) | ARCH-REV-001 Fail — Design Impact (AR-001…AR-006) | AR-001…AR-006 | Design Ready (SR-006) | Design Ready (resubmitted) | BEH-003, BEH-004, BEH-006, BEH-008; REQ-002, REQ-005, REQ-007, REQ-009, REQ-015, REQ-016; DSN-002, DSN-003 | All findings resolved in design; no approved behavior changed |

## Revision Entries

### SR-001 — Automatic package/definition refresh requirements baseline

- Phase and classification: Requirements — Initial Baseline
- Triggering evidence: Project Task from `/project_task_manager` (2026-10-10); investigation recorded in `investigation-notes.md`
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started
- IDs affected: BEH-001–008, UC-001–007, REQ-001–017, AC-001–014, SCN-001–011, QR-001–006, DEC-001–006
- Scenario-basis changes: N/A (baseline)
- Why recorded: First coherent baseline presented for user decisions and approval
- Canonical sections changed: all (new)
- Supplemental artifacts: none
- Product design evidence: N/A — not requested
- Intended behavior changed: N/A (baseline)
- Approval impact: Pending user approval and decisions DEC-001…DEC-006
- Supplement versions: N/A
- Design/review basis: N/A
- Task-size/risk classification: N/A before design
- Handoff: None (approval held in the requirements conversation)
- Downstream impact: None yet
- Remaining gaps: DEC-001…DEC-006; U-001 (non-blocking)
- Next action: Obtain the user's decisions and explicit approval, then run the architecture reading gate and design

### SR-002 — Primary delegation journey and edit-staleness evidence

- Phase and classification: Mixed — Refinement (user clarification) plus Evidence
- Triggering user feedback (2026-10-10): The core pain is the Project Task Manager → Agent Package Creator → next-delegation loop. After the creator adds or deletes an agent/team, the next `delegate_task` must use the current in-memory definitions. The user believed edits to existing files are already picked up because packages are linked.
- Triggering finding IDs: N/A
- Prior status: Requirements `Ready for Approval` (SR-001, not approved)
- Current status: Requirements `Ready for Approval`
- IDs affected: UC-001; REQ-002, REQ-010, REQ-012 (traceability only); new SCN-012 (primary) and AC-015
- Scenario-basis changes: SCN-012 added as the primary Supported Normal Scenario
- Evidence: `collaborator-admission.ts` `catalogTaskSource` → `admissible` → `collaborator-definition-catalog.ts` (cached `getTeamDefinition`/`getAgentDefinition`); `collaborator-entry-builder.ts:83` (cached agent lookup for team members); Codex/Claude/AGY/ACP bootstrappers use cached `getAgentDefinitionById`; only the AutoByteus factory and Org runs read disk. Edits are therefore stale for delegated copies today.
- Canonical sections changed: requirements Problem And Desired Outcome, scenario table, AC table, traceability, Architecture Phase Input
- Intended behavior changed: No change to approved behavior (none approved yet); scope clarified, not widened
- Approval impact: Still pending; DEC-001…DEC-006 unchanged
- Next action: Obtain decisions and explicit approval

### SR-003 — Monitor scope: definitions only, no skills

- Phase and classification: Requirements — Refinement (user decision)
- Triggering user feedback (2026-10-10): A monitor is the right mechanism. Skill content edits need nothing, not even a web notification, because users rarely open the Skills page and it has its own Reload. Never monitor `.git` and similar. Check the server's existing file watcher and its ignore support.
- Evidence: `autobyteus-server-ts/src/file-explorer/watcher/**` (chokidar 4 in a child-process runtime per root, `awaitWriteFinish`) and `file-explorer/traversal-ignore-strategy/**`. `WorkspaceIgnoreMatcher` combines `DefaultIgnoreStrategy` (node_modules, venv/.venv/env, build/dist/lib, *.log, __pycache__ …), `SpecificFolderIgnoreStrategy([".git"])` and nested `.gitignore` rules, and exposes `shouldIgnoreForWatch`. These are candidates for reuse in design.
- IDs affected: BEH-007 (now no change), UC-003 (withdrawn), REQ-005 (Skills page excluded), REQ-011 (rewritten: skills not monitored), REQ-014, AC-007 (rewritten as a no-reload boundary), SCN-006, QR-002 (definition files and folders only), DEC-005
- Intended behavior changed: Yes (scope narrowed; not yet approved)
- Approval impact: Still pending; DEC-001…DEC-006 otherwise unchanged
- Next action: Obtain explicit approval

### SR-004 — Skill renames: tolerant behavior confirmed

- Phase and classification: Mixed — Evidence plus a Requirements decision
- Trigger (2026-10-10): The user asked what happens when a skill name changes, including in standalone skill packages. Evidence (investigation notes, "Skill Name Change Findings"): the skill name comes from the `SKILL.md` front matter; agents refer to skills by name; resolution is fresh at each run start; an unresolved name is logged and the run continues without the skill. The user confirmed this tolerance is by design.
- IDs affected: DEC-007 resolved (A: no change); an Out Of Scope bullet added
- Intended behavior changed: No (an existing behavior is explicitly preserved)
- Approval impact: Still pending overall approval
- Next action: Obtain explicit approval

### SR-005 — Requirements approved

- Phase and classification: Requirements — Approval capture
- Trigger: The user replied "I think this is reasonable approach." to the final six-point plan summary (watched scope; ~1 s settle with a pending-change flush before delegation lookups; last-good retention with a visible error; running copies untouched; web lists and `@` live with Reload kept; GitHub Check/Update unchanged).
- Prior status: Ready for Approval → Current status: **Approved**
- Approved baseline: `requirements-doc.md` content as of SR-004, with DEC-001…DEC-006 approved as recommended and DEC-007 = (A). The approved summary also included "a pending change is applied before a delegation lookup". It was presented to the user earlier but never written down, so it is recorded here as REQ-018 / AC-016 within the same approval.
- Intended behavior changed: No (approval only)
- Next action: Architecture reading gate (done 2026-10-10), architecture investigation, design spec

### SR-006 — Architecture design complete

- Phase and classification: Design plus Evidence (no requirement change)
- Trigger: Approved requirements (SR-005); design reading gate passed; skills update re-read 2026-10-11 (design gate files unchanged since 2026-10-10)
- Evidence added (investigation notes, "Architecture investigation after approval"):
  - commit `9762a12df` shows the fresh-read path is a stale-cache workaround;
  - probe `probes/apar-cache-probe.test.ts` shows one invalid `agent-config.json` bricks the agent catalog until refresh;
  - probes `probes/apar-watch-probe*.test.ts` show 163 watched dirs, 47 ms ready, 2–13 ms events, no fd growth on macOS, no skill events, and missing-parent creation not detected.
- Design: `design-spec.md`.
  - New `definition-catalog` subsystem: catalog store with last-good rules, sync with settle/flush-on-read, source readers, structural-allow-list monitor with ancestor watch for missing roots, change hub plus `/ws/definition-catalog`.
  - Services become the single catalog-backed read boundary.
  - Cache providers and the fresh-read path are removed.
  - Admission decodes via the catalog.
  - GraphQL gains issue and auto-refresh status fields.
  - Web: shared `NodeChangeFeed`, definition feed, store `reloadIfLoaded`, issue/status UI.
- Solution-detail decision: DSN-001 (watch GitHub-managed roots uniformly), recorded in the requirements as a Solution Designer decision; no approved behavior changed.
- Intended behavior changed: No
- Classification: task_size `Large`; architectural_risk `High` (ownership boundary, new websocket/GraphQL contracts, concurrency, lifecycle, blast radius)
- Next action: Apply handoff rules (expected: independent architecture review)

### SR-007 — Design revision for ARCH-REV-001

- Phase and classification: Design Impact resolution plus Evidence. Requirements are editorial only.
- Trigger: ARCH-REV-001 `Fail — Design Impact` (`design-review-report.md`, `architecture-review-revision-record.md`), findings AR-001…AR-006 plus residual notes.
- Resolutions in `design-spec.md`:
  - **AR-001**: dependency-aware subject expansion (agent → agent, agent_team, agent_org; agent_team → agent_team, agent_org, agent; org → org; root/registration → agent_package).
  - **AR-002**: admission enumerates catalog team/org units (issue-only included) via the services. `DefinitionSourceRegistry` is narrowed to application-owned team sources; its shared-root enumeration and the dead `implementationPackageRoots` option are removed. The duplicate-identity rule moves into the team/org readers with the same semantics (DSN-002).
  - **AR-003**: one web surface, `definitionDiagnostics(subject: DefinitionSubject!)`, replaces `definitionAdmissionDiagnostics`. It covers catalog issues and admission unavailability, with `usingLastGood`.
  - **AR-004**: last good is extended to nested definitions through definition units (team plus local agents; org plus owned agents/teams). Nested exact IDs are served from catalog nodes. REQ-007 is not narrowed (DSN-003).
  - **AR-005**: monitor root state machine with runtime missing/reappear transitions, plus root identity (dev+ino) re-arm for in-place replacement (GitHub Update), via both events and `syncRoots`.
  - **AR-006**: the sync owns initial population (the first `settle()` awaits `reloadAll`, in both hosts). The monitor is armed before the first scan. Bootstrapper order: write all → `refreshCache()` → resolve → defaults.
- Residuals adopted:
  - the catalog returns copies;
  - the AC-006 bound wording;
  - watcher armed before the initial reconcile;
  - the Linux watch count is recorded.
- Requirements edits (editorial; no intended-behavior change):
  - AC-014 and the UI section wording now agree with REQ-011 (skill sources not monitored).
  - DSN-002 and DSN-003 recorded as Solution Designer solution-detail decisions.
- Intended behavior changed: No. Approval basis remains SR-005.
- Classification: Large / High (unchanged).
- Next action: Resubmit to the architecture reviewer for ARCH-REV-002.
