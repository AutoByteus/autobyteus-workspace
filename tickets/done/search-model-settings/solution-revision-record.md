# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial baseline (Task autobyteus-146 from `/project_task_manager`) | N/A | N/A | Ready for Approval | BEH-001…BEH-005; REQ-001…REQ-009 | Presented to the user with DEC-005 |
| SR-001a (Product handoff, no requirements change) | Requirements | User request for UI design (2026-10-19) | N/A | Ready for Approval | Ready for Approval (awaiting Product Design) | REQ-001…REQ-007 visuals; DEC-005 | `Product Design Requested` → `/product_team` |
| SR-002 | Requirements | Product Design result (user-approved UI/UX spec, design `4e4ac06`) | N/A | Ready for Approval | Approved | REQ-001, REQ-002, REQ-004, REQ-005, REQ-006, QR-003, DEC-005, DEC-008 | Placement Server Settings → Embedding; narrowed facts and dialog; D-1…D-5 integrated; approved within the direction (user decided DEC-005 and the UI) |
| SR-003 | Design | Architecture design on approved SR-002 | N/A | N/A | Design Ready | BEH-001, BEH-003, BEH-004, BEH-005 | `design-spec.md`; task_size Medium, architectural_risk High → architecture review |
| SR-004 | Mixed (Requirements gap + Design) | Architecture review ARCH-REV-001: Fail (`design-review-report.md`) | AR-001…AR-004; R-1…R-7 | Approved (SR-002) / Design Ready (reviewed: Fail) | Approved (SR-004) / Design Ready (revised) | REQ-001, REQ-005, REQ-006; DEC-009, DEC-010; AC-011…AC-013 | Active display-state mapping; "Active · Not downloaded" + Download; Retry prepares; status split into two root fields; recommendations applied |

## Revision Entries

### SR-001 — Requirements baseline: Search section in Settings (choose, download, index)

- Phase and classification: Requirements, `Initial Baseline`
- Trigger: Project Task `autobyteus-146` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), follow-up FU-1 of autobyteus-71, requested by the user on 2026-10-18.
- Base: `origin/personal` @ `8d40ba3b6c` (contains autobyteus-71).
- Evidence: `investigation-notes.md`.
- Key findings:
  - per-Project status needs a read-only index status;
  - download ahead conflicts with the current deletion of other models' files (DEC-001);
  - the Task text's "LEAF-IR default" is outdated (the default is Granite since autobyteus-71 SR-007).
- Intended behavior changed: N/A (baseline)
- Approval impact: pending (DEC-005 needs the user; DEC-001…DEC-004 and DEC-006…DEC-008 decided within the direction and presented to the user)
- Next action: the user's approval, then architecture design

### Product handoff note (SR-001, 2026-10-19)

- The user asked for a UI design step: *"maybe we need to do some UI design now"*, then *"if yes you can send a task to @Product Team for this"*.
- Classified `Product Design Requested` (New Request). Request: `product-design-request.md`. Delegated to `/product_team`: team run `product_team_0c8636b21e75455da2f411d49a081b06`, coordinator run `product_ui_ux_designer_d253e0e3ab504ef7809f74b3072656d8`.
- The requirements stay `Ready for Approval`. Next: integrate the user-approved UI/UX result (DEC-005 and the visuals), obtain approval, then architecture design.

### SR-002 — Product Design integrated; requirements approved

- Phase and classification: Requirements, `Refinement` (Product result)
- Trigger: Product UI/UX Designer (run `product_ui_ux_designer_d253e0e3ab504ef7809f74b3072656d8`) returned `Design Completed (user-approved)`.
  - Spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md`.
  - Design revision `4e4ac06`, integration `cb384e3`, both verified on the design repository's `origin/personal`.
- Checks:
  - the spec links the runnable reference and the final references;
  - the spec and the product ticket agree on repository, ticket, revision and source pin;
  - the user's confirmation is recorded ("done", 2026-10-19).
- Changes:
  - DEC-005 decided by the user: Server Settings → Embedding.
  - REQ-001 narrowed: name, state, language label, size, a Default mark, a shared Hugging Face line, the on-disk total.
  - REQ-004 dialog narrowed to the download size.
  - D-1…D-5 integrated into REQ-002, REQ-005 and REQ-006.
  - Filter tabs and the name filter.
  - QR-003 sizes from file bytes, including partial downloads.
  - The approved spec is the UI basis; the sketch is superseded.
- Intended behavior changed: `Yes` (user-directed through Product).
- Approval: **Approved** at SR-002 by the Solution Designer within the direction. The only Needs-user decision (DEC-005) and the UI were decided and confirmed by the user. The user was informed in the Solution Designer conversation, 2026-10-19.
- Next action: architecture design.

### SR-003 — Architecture design

- Design: `design-spec.md`.
  - `EmbeddingIndex` gains model management (`modelsStatus`, `downloadModel`, `cancelDownload`, `removeModel`, `prepareActiveModel`) and a read-only `collectionStatus`.
  - New internal `EmbeddingModelDownloads`.
  - `EmbeddingModelFiles`: abort, remove, disk usage; `removeAllExcept` removed (downloaded models kept).
  - `ProjectTaskSearchService`: `indexStatus`, `indexProject`, `rebuildProject`, `indexAllProjects`.
  - GraphQL status query and mutations.
  - Web: the Server Settings → Embedding sub-section built to the approved UI/UX spec, polling every 2 s.
- Persisted data: model folders `Directly Usable — No Migration`.
- Classification: `Medium` / `High` (new contracts, a policy change, cancel concurrency).
- Next action: the handoff rule for Large or High → architecture reviewer.

### SR-004 — Architecture review ARCH-REV-001 resolved

- Trigger: `/software_engineering_team/architecture_reviewer`, ARCH-REV-001 Fail. Findings:
  - AR-001, AR-003, AR-004: Design Impact;
  - AR-002: Requirement Gap;
  - R-1…R-7: non-blocking.
- Skill update read first (2026-10-19): `SKILL.md`, `references/ticket-scope.md`, the requirements template (adds the Prerequisites section), `design-examples.md` Example 11. Ticket-scope check: no finding is a prerequisite.
- **Requirements:**
  - DEC-009 (AR-002): an active model that isn't downloaded shows "Active · Not downloaded" + Download, which prepares the active model.
  - DEC-010 (R-5): a Project with no Tasks shows Ready · 0 Tasks.
  - REQ-001 and REQ-005 text updated; AC-011…AC-013 added; Prerequisites: None.
  - Both decisions fill gaps the approved design left and reuse its existing visual pieces. Approved by the Solution Designer within the direction; the user was informed in the Solution Designer conversation, 2026-10-19.
- **Design:** see "Architecture Review Resolution" in the design spec.
  - Active display-state table (AR-001).
  - Retry spine DS-006: `retryModel` + `prepareActiveModel` (AR-003).
  - Two status root fields in one document (AR-004).
  - Polling 2 s / 10 s.
  - Read-only status without `activeModel()`.
  - One download-flight owner.
  - `.part` handling.
  - Concurrent jobs acknowledged.
- Classification unchanged (Medium / High).
- Next action: re-review of AR-001…AR-004 and the DEC-009 UI basis.

### Review receipt — ARCH-REV-002 (informational, no new SR round)

- 2026-10-19: `/software_engineering_team/architecture_reviewer` reported **Pass**, ARCH-REV-002, on SR-004. AR-001…AR-004 are resolved and nothing is open.
- Non-blocking implementation notes R-8 and R-9 are in `design-review-report.md`.
- The reviewer delivered the primary handoff to `/software_engineering_team/implementation_engineer`; the Solution Designer does not repeat it.

### SR-005 — Code review CRR-001: DEC-011 (action error line)

- Trigger: `/software_engineering_team/code_reviewer` (run `code_reviewer_cbd4eb1d7fd64728ac4114c14a22416d`), CRR-001 Fail on IR-001 (`8d40ba3b6c..e48806b035`):
  - CR-002 `Requirement Gap`: the implementer's action error line has no approved UI state;
  - CR-001 `Local Fix`: dead code.
- Decision: **DEC-011**, approve the action error line as built (new REQ-010, AC-014). A gap the approved design left; it reuses the spec's existing error treatment and is the same kind as DEC-009. Approved by the Solution Designer within the direction; the user was informed in the Solution Designer conversation, 2026-10-19.
- Design: guidance G7 (keep the line; CR-001 removal; the optional abort check). No architectural change. Classification unchanged (Medium / High).
- Next action: the handoff rules, then the rework (CR-001), a targeted code review, then API/E2E.

### Review receipt — ARCH-REV-003 (informational, no new SR round)

- 2026-10-19: `/software_engineering_team/architecture_reviewer` reported **Pass**, ARCH-REV-003, on SR-005 (REQ-010 / DEC-011 / AC-014 and G7), with no new findings.
- Implementation note R-10 (`docs/modules/embeddings.md` still references `modelStatus()`) went to the implementation engineer.
- The reviewer delivered the primary handoff to `/software_engineering_team/implementation_engineer`; the Solution Designer does not repeat it.

### SR-006 — Failure origin FO-001: Project index status cache

- Trigger: `/software_engineering_team/code_reviewer` (run `code_reviewer_cbd4eb1d7fd64728ac4114c14a22416d`), CRR-003 / FO-001 `Design Impact`, from API/E2E API-REV-001 F-001 (API-L02, `evidence/api-e2e/API-L02-01…03`, `API-R04-qr001-host-load.log`). Validated code `d2bcb95d3a`; API/E2E commits `c02a54bc3e`, `671a1e596b`.
- Evidence reading:
  - the Project status re-read the whole backlog on every poll: 1.8 s per read on Docker;
  - the existing `projects` list costs the same;
  - the host was heavily loaded (load average about 32 at re-check, 13:12), so a clean re-measure wasn't possible now; API/E2E re-measures after the change.
- Ticket-scope: the remedy is **this ticket** (the repeated read is this ticket's design). The Project store's slowness is **a follow-up**, not a prerequisite: the ticket works without it.
- Requirements (within the direction; user informed 2026-10-19):
  - DEC-012: QR-001 refined (later refreshes ≤ 300 ms; first load ≤ 1 s on the desktop host, and on Docker no slower than the `projects` list);
  - DEC-013: a transport failure shows "Couldn’t reach the server.".
- Design: per-Project status cache, invalidated through the composed `ProjectChangeMarks` fan-out; `EmbeddingIndex.collectionJobStatus`; O-1, O-2 and O-4 guidance (G8); follow-up FU-1 recorded.
- Classification unchanged (Medium / High).
- Next action: the handoff rules (revised Medium/High package → architecture reviewer), then rework, a targeted code review, and API/E2E reruns (API-L02 and the affected cases; the pending test review of API-D01).

### SR-007 — AR-005 fingerprint-input status; user-approved indexing after Task writes

- Triggers:
  - `/software_engineering_team/architecture_reviewer` ARCH-REV-004 Fail, AR-005 (`Design Impact`): the status-result cache diverges (MP-005, MP-006, MP-007).
  - The user's question (2026-10-19) why indexing is search-triggered. After the Solution Designer explained and recommended indexing after writes in this Task, the user approved: *"Anyway, I'll agree with you… Like your suggestion."*
- Requirements: REQ-011 (index after Task writes; background, grouped, only with the model on disk; search-time check kept), AC-015, DEC-014 (decided by the user), BEH-002 updated. Approved by the **user**. Scope addition to this Task.
- Design:
  - the input cache (opaque per-Project `ItemFingerprints`) replaces the SR-006 result cache;
  - status computed fresh each poll;
  - `collectionJobStatus` removed;
  - `fingerprintItems`, `activeModelOnDisk` and the `collectionStatus` signature added;
  - the change-mark listener also schedules a debounced `indexProject`;
  - tests for MP-005…MP-007 and the write trigger.
- Classification unchanged (Medium / High).
- Next action: the handoff rules → architecture reviewer (scope: AR-005 and REQ-011), then rework, a targeted code review, and API/E2E reruns (API-L02 and new AC-015 runs).

### Review receipt — ARCH-REV-005 (informational, no new SR round)

- 2026-10-19: `/software_engineering_team/architecture_reviewer` reported **Pass**, ARCH-REV-005, on SR-007 (AR-005 resolved, REQ-011 mapped). It delivered the primary handoff to the implementation engineer; the Solution Designer does not repeat it.
- R-16 bookkeeping corrected as factual fixes:
  - the baseline line now names SR-007;
  - Out Of Scope no longer contradicts REQ-011 (startup pre-indexing stays out of scope).
- R-14 and R-15 went to the implementation engineer.

### SR-008 — Clarification for delivery DR-001 O-5 (server-started indexing vs an open Settings panel)

- Trigger: `/software_engineering_team/delivery_engineer` (run `delivery_engineer_195aed7e0be3438c91121012ccf5233a`), DR-001 blocked at verification, `Unclear`, O-5 (`release-deployment-report.md` § Verification; evidence `evidence/api-e2e/API-L11-02…03`).
- Decision **DEC-015**, option (a) clarify, by the Solution Designer within the direction; the user was informed in the Solution Designer conversation, 2026-10-19:
  - REQ-007: 2 s updates for work the open section shows as running; server-started work appears at the next idle refresh (≤ 10 s).
  - AC-015: "Settings shows Ready" applies to Settings opened after the writes; an already open section shows it within 10 s of the server finishing.
- Measured behavior meets the clarified text (server Ready 3.4–3.8 s; open panel 11.2 s ≈ 3.8 s + one idle refresh).
- Design unchanged; no rework. The delivery evidence and merged branch stay valid.
- Intended behavior changed: `No` (a clarification of wording written before REQ-011 to match the approved intent and the implemented design).
- Next action: reply to the delivery engineer to resume verification on the current evidence.
