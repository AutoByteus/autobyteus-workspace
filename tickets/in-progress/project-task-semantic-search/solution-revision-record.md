# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-71 from `/project_task_manager`; user clarifications 2026-10-18) | N/A | N/A | Ready for Approval | BEH-001…BEH-006; REQ-001…REQ-014; QR-001…QR-008 | Baseline presented to the user with DEC-001…DEC-004 |
| SR-002 | Requirements | User feedback on SR-001 (2026-10-18) | N/A | Ready for Approval | Ready for Approval | BEH-001, BEH-002, BEH-006 (removed); REQ-002, REQ-005; AC-003, AC-006, AC-007; SCN-002, SCN-003; DEC-005, DEC-006 | Key lookup removed; tool renamed `search_tasks` with `project_id` first; status filter dropped |
| SR-003 | Requirements | User correction (2026-10-18) | N/A | Ready for Approval | Ready for Approval | REQ-005, REQ-006, AC-006, AC-007, DEC-005 | Tool name back to `search_project_tasks` (consistent with `list_project_tasks`); `project_id` stays first |
| SR-004 | Mixed (Evidence + Requirements) | User challenge of the model investigation and request for a switchable model (2026-10-18) | N/A | Ready for Approval | Approved | DEC-002, REQ-015 (new), UC-006, SCN-008, AC-016, QR-003, QR-004, QR-005, QR-007, Out Of Scope, Non-Goals | Model evaluation redone with 11 current models (report written); default recommendation LEAF-IR; switchable model catalog required; front-end model download deferred |
| SR-005 | Design | Architecture design on approved SR-004 | N/A | N/A (no design) | Design Ready | BEH-001…BEH-005; REQ-001…REQ-015 | `design-spec.md` written; task_size Large, architectural_risk High |
| SR-006 | Design | Architecture review ARCH-REV-001: Fail, Design Impact (`design-review-report.md`) | AR-001, AR-002, AR-003; R-1…R-8 | Design Ready (reviewed: Fail) | Design Ready (revised) | BEH-003, BEH-004, BEH-005; REQ-007, REQ-013, REQ-015, QR-006, QR-007 | EmbeddingGemma 2 verified on WASM and kept; licence mapping; delete cleanup never waits; recommendations applied |

## Revision Entries

### SR-001 — Requirements baseline: local meaning search for Project Tasks on a reusable server-side embedding layer

- Phase and classification: Requirements, `Initial Baseline`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: Project Task `autobyteus-71` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`). User clarifications in this conversation on 2026-10-18: (1) the storage/SQLite suggestion is withdrawn, so the team decides the technical architecture; (2) the capability must be server-side with no Electron dependency, because some users deploy the server in their own infrastructure.
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not started
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: all (baseline)
- Scenario-basis or scenario-validity changes: N/A (baseline)
- Why this baseline was recorded: first coherent requirements set for the user's approval
- Canonical requirements, investigation and design sections changed: `requirements-doc.md` (all), `investigation-notes.md` (all)
- Supplemental artifacts added, changed or removed: `probes/` (evidence only)
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: N/A (baseline)
- Approval impact, exact approved requirements baseline, who approved, and approval reference: pending (DEC-001…DEC-004 need the user)
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference: N/A
- Downstream and architecture-review impact: N/A
- Remaining gaps, assumptions or blocked decisions: DEC-001…DEC-004; ASM-001, ASM-002
- Next action: obtain the user's approval in this conversation, then architecture design

### SR-002 — User refinement: no key lookup; tool `search_tasks(project_id, query, limit?)`

- Phase and classification: Requirements, `Refinement`
- Triggering user feedback: user, 2026-10-18, in this conversation: *"Do we really need to add the task key lookup because no human can remember the task key… we want to keep it simple… the user just want to go to the project tasks and then type… the semantic sentences… please make the tool name… search tasks, don't add the project… And the first parameter is project ID."*
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: SR-001 `Ready for Approval` (not approved)
- Current authoritative requirements/design status: `Ready for Approval`; design not started
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-006 removed; BEH-001/BEH-002 wording; REQ-002 (key part removed; today's exact text matching kept as preserved behavior); REQ-005 (name `search_tasks`, `project_id` first, no `status` filter); AC-003, AC-006, AC-007; SCN-002, SCN-003; DEC-005 (user names the tool), DEC-006 (key lookup removed by the user); Out Of Scope adds key lookup
- Scenario-basis or scenario-validity changes: SCN-002 narrowed to remembered words
- Why this revision was recorded: user changed intended behavior before approval
- Canonical sections changed: requirements-doc (Problem, Behavior table, Use cases, Out Of Scope, REQ-002, REQ-005, AC-003, AC-006, AC-007, Scenarios, UI details, External contracts, Decisions, Traceability)
- Supplemental artifacts added, changed or removed: none
- Product design evidence or product decisions incorporated: none
- Intended behavior changed: `Yes`
- Approval impact: still pending; DEC-001…DEC-004 await the user's explicit approval
- Behavior-defining supplement versions and approval references: none
- Affected design/review basis invalidated or rebuilt: N/A (no design yet)
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference: N/A
- Downstream and architecture-review impact: N/A
- Remaining gaps, assumptions or blocked decisions: DEC-001…DEC-004
- Next action: obtain the user's approval of the revised requirements

### SR-003 — User correction: tool name `search_project_tasks`

- Phase and classification: Requirements, `Refinement`
- Triggering user feedback: user, 2026-10-18: *"search project tasks please my mistake. because there are tool like list project tasks"*
- Prior / current status: `Ready for Approval` / `Ready for Approval`
- IDs affected: REQ-005, REQ-006, AC-006, AC-007, SCN-003, DEC-005 (name only; `project_id` first, `query`, optional `limit`, no status filter, unchanged)
- Intended behavior changed: `Yes` (tool name only)
- Approval impact: still pending; DEC-001…DEC-004 await the user's explicit approval
- Design/review impact: N/A (no design yet)
- Next action: obtain the user's approval

### SR-004 — Current-model re-evaluation; switchable embedding model

- Phase and classification: Mixed (evidence clarification + requirement refinement), `Refinement`
- Triggering user feedback (2026-10-18): *"why dont you test new models, why did you test old models… if you use old models, we cannot even trust the solution… we should design the solution in a way that the models can be replaced."* Then: *"In the future, maybe in different environments, we have to use different model… write your experiments results down… we want to achieve a design that we are able to switch the embedding model in the future… maybe in the future on the front end… allow the user to download a certain embedding model themselves."*
- Prior / current status: `Ready for Approval` / `Ready for Approval`
- Evidence change: round 2 evaluation of 11 current (2025–2026) models on 69 queries, plus WASM cost for the leaders; recorded in `model-evaluation-report.md` and `investigation-notes.md`. The round 1 conclusion (Granite) is superseded.
- IDs affected: DEC-002 (default LEAF-IR; catalog: Granite small R2, EmbeddingGemma 2); new REQ-015 / UC-006 / SCN-008 / AC-016 (active model per server setting, download on first use, background re-index, no mixing); QR-003/QR-004/QR-005/QR-007 re-based on the default model; Out Of Scope adds the future front-end model chooser/downloader; Non-Goals updated.
- Intended behavior changed: `Yes`
- Approval impact: **Approved by the user**, 2026-10-18 ("Okay… I think you can go on now for your design."), after the full SR-004 set and the default model (LEAF-IR) were presented. Approved baseline: `requirements-doc.md` at SR-004; supplements: `model-evaluation-report.md` (evidence for DEC-002).
- Design/review impact: design spec to be written on this basis
- Next action: architecture design

### SR-005 — Architecture design

- Phase and classification: Design, `Initial Baseline` (design)
- Trigger: user approval of SR-004 (2026-10-18), "go on now for your design"; reading gate passed (architecture-design.md, design-principles.md, design-examples.md, DESIGN.md, startup and data-migration design docs).
- Prior / current status: requirements `Approved` (unchanged) / design `Ready`
- IDs affected: all behaviors mapped to spines DS-001…DS-008
- Design summary:
  - generic `src/embeddings/` layer (catalog + active-model setting, verified on-demand model download, WASM worker runner with idle stop, `node:sqlite` vector store `embeddings.sqlite`, `EmbeddingIndex` boundary with fingerprint sync, relevance rule and readiness);
  - `ProjectTaskSearchService` (exact tier + meaning tier, delete cleanup);
  - GraphQL `searchProjectTasks` / `retryEmbeddingModel`;
  - tool `search_project_tasks`;
  - board composable;
  - desktop packaging prune;
  - companion PTM change.
- Persisted data: existing data `Not Affected`; new store `Discard or Rebuild` (rename aside + recreate).
- Intended behavior changed: `No`
- Approval impact: none (technical design on the approved basis)
- Classification: `task_size` Large, `architectural_risk` High (see design spec)
- Follow-ups recorded: FU-1 (front-end model chooser), FU-2 (proxy-aware download), FU-3 (Task autobyteus-126 overlap), FU-4 (listTasks read cost)
- Next action: apply handoff rules

### SR-006 — Design revision after architecture review ARCH-REV-001

- Phase and classification: Design, `Design Impact`
- Trigger: `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_a0649733ed664b98994f7a77b7dcdce1`). Report `design-review-report.md`, revision record `architecture-review-revision-record.md`. Result Fail, Design Impact; no Requirement Gap.
- Findings:
  - AR-001: the EmbeddingGemma 2 contingency contradicted the approved DEC-002 catalog.
  - AR-002: licence notices were not mapped.
  - AR-003: delete cleanup could wait for indexing, or be undone by an in-flight batch.
  - Non-blocking R-1…R-8.
- Prior / current status: design `Ready` (reviewed Fail) / design `Ready` (revised); requirements `Approved` (unchanged)
- Evidence added:
  - EmbeddingGemma 2 runs on ort-web WASM with empty modality inputs: r@5 0.957, r@10 0.986 (QR-007 met); 4.27 s/Task, 151 ms/query, 1.1–1.5 GB memory.
  - ort-web threads work inside a `worker_thread`.
  - Pins and checksums for EmbeddingGemma 2.
- Design changes:
  - The catalog keeps all three approved entries; a verification failure is a Design Impact for the user's decision (never a silent drop).
  - New guidance G11 for licences.
  - DS-006/DS-003: cleanup is fire-and-forget and job results are discarded after cancellation (collection generations).
  - Recommendations: R-1 candidate set, R-2 scores for exact ids, R-3 latest request wins, R-5 constructor injection (no import cycle), R-6 unknown-value warning, R-7 status-line note, R-8 follow-up FU-5.
- Intended behavior changed: `No`
- Approval impact: none; requirements SR-004 unchanged.
- Classification: unchanged (Large / High).
- Next action: re-review of the AR-001…AR-003 sections by the architecture reviewer.

### Review receipt — ARCH-REV-002 (informational, no new SR round)

- 2026-10-18: `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_a0649733ed664b98994f7a77b7dcdce1`) reported **Pass**, ARCH-REV-002, on SR-004 requirements and the SR-006 design. AR-001…AR-003 are resolved and there are no open findings.
- Report: `design-review-report.md`; record: `architecture-review-revision-record.md`.
- The reviewer delivered the primary handoff to `/software_engineering_team/implementation_engineer`. The Solution Designer does not repeat it.
