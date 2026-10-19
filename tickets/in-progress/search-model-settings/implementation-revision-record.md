# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer pass, ARCH-REV-002 (`design-review-report.md`) | N/A | `Initial Baseline` | SR-004 (requirements and design), ARCH-REV-002 | Implemented (commits `9c73c22672`, `8469d4bcf5`, `56cb7be36a`); local checks in `implementation-handoff.md` § Checks Run; ready for code review |

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
