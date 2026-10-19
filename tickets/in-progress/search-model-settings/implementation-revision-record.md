# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer pass, ARCH-REV-002 (`design-review-report.md`) | N/A | `Initial Baseline` | SR-004 (requirements and design), ARCH-REV-002 | Implemented (commits `9c73c22672`, `8469d4bcf5`, `56cb7be36a`); local checks in `implementation-handoff.md` § Checks Run; ready for code review |
| IR-002 | Architecture reviewer pass ARCH-REV-003 after code review CRR-001 (`code-review-report.md`, round 1) | CR-001, CR-002 (→ DEC-011, REQ-010, AC-014), R-10, C-06 | `Local Fix` (CR-001) + approved Requirement Gap (CR-002) | SR-005, ARCH-REV-003, CRR-001 | Dead code removed; action error line kept and tested for AC-014; doc updated; early-cancel check added; back to code review |
| IR-003 | Architecture reviewer pass ARCH-REV-005 after API/E2E API-REV-001 (F-001) and code review CRR-003 (FO-001) | FO-001, AR-005, REQ-011 / AC-015, R-14, R-15, O-1, O-2, O-4 | `Design Impact` (resolved upstream as SR-006 → SR-007; implemented here) | SR-007, ARCH-REV-005, CRR-003, API-REV-001 | Status from cached fingerprint inputs (computed fresh); index after Task writes; O-1/O-2/O-4; back to code review |

## Revision Entries

### IR-001 — Settings → Server Settings → Embedding: model management and Project indexes

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-002, Pass).
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: branch `codex/search-model-settings` at `56cb7be36a` (server `9c73c22672`, web `8469d4bcf5`, E2E assertion `56cb7be36a`), plus the ticket-folder commit that records this handoff and its evidence.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the reviewed design (Change / Refactor Sequence steps 1–6 and the implementation-scoped part of step 7).
- Approved behavior or requirement IDs affected: BEH-001, BEH-003, BEH-004, BEH-005; REQ-001…REQ-009; AC-001…AC-013; QR-001…QR-004; DEC-009, DEC-010.
- Implementation delta:
  - server: model files abort / remove / disk usage (`removeAllExcept` removed); new `EmbeddingModelDownloads` and `EmbeddingModelError`; `EmbeddingIndex` read-only `modelsStatus` / `collectionStatus` and `prepareActiveModel` / `downloadModel` / `cancelDownload` / `removeModel`; job `status()`; store `readFingerprints`; search service `indexStatus` / `indexProject` / `rebuildProject` / `indexAllProjects`; GraphQL query and mutations; LEAF-IR size text;
  - web: Embedding sub-navigation and mode; panel, model card, Project indexes card, switch dialog; `useEmbeddingSettings` polling; GraphQL documents; types; en / zh-CN catalogs;
  - tests: server unit (downloads, model management incl. G3 spy, AC-011/012/013, R-9), GraphQL E2E, gated QR-001 load check; web component spec, settings page and manager specs; real-stack browser probe;
  - docs: server `docs/modules/embeddings.md`; web `docs/settings.md`, `docs/projects.md`.
- Changed files or areas: `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: `implementation-handoff.md` § Checks Run (evidence under `evidence/implementation/`).
- Downstream handoff: `/software_engineering_team/code_reviewer` (Medium / High).

### IR-002 — CR-001 cleanup and REQ-010 / AC-014 (design G7)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-003, Pass), after `code-review-report.md` (CRR-001, round 1).
- Triggering finding IDs: CR-001 (Local Fix), CR-002 (Requirement Gap, decided as DEC-011 → REQ-010 / AC-014), R-10, C-06 (optional).
- Classification: `Local Fix` for CR-001; CR-002 resolved upstream and verified here.
- Prior authoritative result: IR-001 at `e48806b035`.
- Current authoritative result: `d2bcb95d3a` plus the ticket-folder commit recording this round.
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Implementation delta: removed `EmbeddingIndex.modelStatus()`, `EmbeddingModelState`, `EmbeddingModelStatus`, `EmbeddingModelDownloads.isRunning()`; moved their test assertions to `modelsStatus().activeDisplay` and `progress()`; server doc R-10; AC-014 web test; web doc line for REQ-010; early-abort check in `EmbeddingModelFiles.download`.
- Local validation and result: `implementation-handoff.md` § IR-002 → Checks Run (IR-002).
- Downstream handoff: `/software_engineering_team/code_reviewer`.

### IR-003 — Fingerprint-input status, index after writes, O-1 / O-2 / O-4 (SR-007, G8)

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `design-review-report.md` (ARCH-REV-005, Pass), after `api-e2e-execution-coverage-report.md` (API-REV-001, Fail: F-001) and `code-review-report.md` (CRR-003, FO-001).
- Triggering finding IDs: FO-001 / F-001 (QR-001 on Docker), AR-005, REQ-011 / AC-015 (DEC-014, user-approved), R-14, R-15, O-1, O-2, O-4 (DEC-013).
- Classification: `Design Impact`, resolved upstream (SR-007); implemented here.
- Prior authoritative result: IR-002 at `8cbbf9afe8` (code `d2bcb95d3a`).
- Current authoritative result: `70bb03632c` and `1b24f59009` (probe), plus the ticket-folder commit recording this round.
- Related solution revision IDs: SR-006, SR-007
- Related architecture-review revision IDs: ARCH-REV-004, ARCH-REV-005
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Implementation delta: `EmbeddingIndex.fingerprintItems` / `fingerprintsAreCurrent` / `activeModelOnDisk`; `collectionStatus(collection, fingerprints)`; job status and `statusFromFingerprints` over fingerprint maps; `ProjectTaskSearchService` input cache, dirty marks, fresh status, index-after-write timers, `dispose()`; composition fan-out of `ProjectChangeMarks`; `EmbeddingModelFiles.removeIfEmpty` + downloads failure path; web `act()` (O-2) and the unreachable message (O-4); tests (new `project-task-index-status.test.ts`, AC-015 E2E, O-1/O-2/O-4); load check targets; docs. The never-implemented SR-006 cache needed no removal.
- Local validation and result: `implementation-handoff.md` § IR-003 → Checks Run (IR-003).
- Downstream handoff: `/software_engineering_team/code_reviewer`.
