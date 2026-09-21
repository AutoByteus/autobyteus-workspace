# IR049-DI-001 — Observed terminal family record with affected saved locators

## Result / authority
**Blocked — Design Impact; explicit DS-043 cutover return condition.**
Approved RER033 / AD025@b115491c0faa73d1c2b5bfcc88d700c6bff36c0d /
ARCH022 Pass@f54d19775; cumulative Large/High. The later review-only provenance
addendum2c446274c changes no source or approval. IR048-DI-001's exact identity
design is not challenged or reopened. This is the new deployment-state evidence
the approved transition expressly says to return rather than reset/replay.

## Actual read-only evidence (2026-09-12)
- Named app-data root `/home/autobyteus/data`; its configured memory convention
  is `<app-data>/memory` (`AppConfig.getMemoryDir`). No alternate memory or live
  application config was invented or written.
- Actual SQLite `/home/autobyteus/data/db/production.db` contains
  `20260901_agent_org_flat_team_families_v1`, **SUCCEEDED, attempts1**,
  completedAt1788257556246, summary `Scanned 1; migrated 0; skipped 0; failed 0.`
  Read via SQLite URI mode=ro/immutable=1; WAL absent/zero; database hash matches
  before/after. `read-cutover-records.py` and `migration-records.jsonl` reproduce
  that narrow read. No record reset, repository connection or runner execution.
- Same root currently contains53 top-level Team trees,23 organization-like
  candidates and zero Org trees. Structured raw-trace media inventory finds166
  old Team final locators,97 within organization-like candidate roots. These
  counts are bounded current observations, not a frozen global inventory.
- The durable observation test reads one actual source tree under
  `software_development_department_03636d7482c04940987839d4fb0868a6`.
  **Actual released V2 decoder passes with2 configured Teams; actual strict
  target Org V1 decoder passes without writing it.** The recorded line2
  `media.images[0]` names the old Team route, exact owning root/address/filename.
  The real target execution index plus physical source-slot proof finds exactly
  one AgentRun/file. File SHA256:
  `db3f09f4de96b7937cbdfbc36cf2b09534439e820c7a8d4d0a9146004d8d19f1`.
  Source tree and trace bytes match before/after. File contents/conversation
  text are not copied into evidence. No HTTP request, runtime, restore or move.
- Current `AppDataMigrationRunner.runPending`63–65 skips SUCCEEDED and
  SUCCEEDED_WITH_WARNINGS. Therefore merely extending this migration cannot
  execute the required family/locator transition for this recorded state.

This establishes the explicit terminal-record-plus-affected-locator condition.
It does **not** establish why/where the completed record originated, a published
release, a prior failed migration, a provider defect, or corruption. Its scan1
summary must not be reinterpreted as a complete inventory of today's53 roots.
Do not infer permission to clear the record or call the migration directly.

## Other named exposure roots and limits
`cutover-inventory.json` includes the Architecture/Delivery named roots:
`/root/.autobyteus/server-data` (4Org trees), DR008(0), DR009(2), all observed with
terminal family records; `/home/vncuser/.autobyteus/server-data` does not currently
exist at that spelling. Sampled media arrays and old Org draft directories there
show0matching items. Absence here is not a universal/deployment claim. No old
Org draft files were found in the named roots, but no hypothetical draft recovery
is authorized. Full task/communication/cross-view reference inventory was not
completed after the positive return condition; those checks remain held.

Initial ad hoc scanner used the wrong Org manifest filename and a nonexistent
node discriminator; those draft counts were discarded. Committed inventory uses
`agent_org_run_execution_tree.json` and actual Team member `teamRunId` presence;
strict source/target verification above independently proves the decisive item.
No schema was relaxed to accept it.

## Work/preservation and requested decision
Some exact-owner adapter edits had begun while reviewing the source. Once this
precondition was confirmed, all13 initially-clean source paths were restored to
the entry checkpoint, **only our own edits**, leaving no production/test delta.
An unvalidated scratch patch remains outside Git; it is not an approved source
artifact. The temporary observation test was moved to this evidence folder.
No new migration/alias/timer/retry/replay/draft machinery was added. IR048 source
6d77b3c8b remains the authoritative blocked implementation checkpoint.

The single observation test passed its evidence assertions. Vitest's standard
setup applied Prisma migrations only to its disposable repository tests/.tmp DB;
this is not an app-data family migration or a user-data write. No frontend build,
render, provider/API/E2E/native/package validation is newly claimed. All17090
other-owner starting hashes remained unchanged; API probe, reports and raw data
were not staged/reset or claimed. Review-owned addendum HEAD advance is recorded.

**Architecture request:** decide the supported transition for the actual selected
root with a terminal family record and still-required family/locator conversion,
or explicitly establish an authorized different cutover scope with a continuity
plan for these files. Do not infer a new migration ID, manual replay, reset,
disposal or global absence. After reviewed resolution, Implementation can resume
DS041–043 plus the IR048 naming/upload checkpoint and finish one cumulative
source-review package. Original CRR072 attribution and API29 Fail78.9/held matrix,
DR007/DR009 and prior evidence/unknown-origin limits remain unchanged.
