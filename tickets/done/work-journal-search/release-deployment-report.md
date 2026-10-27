# Delivery / Release / Deployment Report — work-journal-search (autobyteus-185)

Current delivery revision: `DR-002`. DR-001 (integration blocked, `Local Fix`) is kept in `delivery-revision-record.md`.

## Release / Publication / Deployment Scope

- Ticket: `work-journal-search` (Project Task autobyteus-185): search past work in every run's Work Journal (index pipeline, `search_memory`, GraphQL, Memory page Search and Index).
- `task_size`: Large. `architectural_risk`: High. Route: reviewed.
  - Code review CRR-007: Pass.
  - API/E2E API-REV-003: Pass, 94%.
  - Test-code review CRR-008: Pass.
- Requirements basis: SR-006 (UD-020, UD-021).
- One repository: workspace superrepo → `origin/personal`. The main repository is public. Private evidence stays in `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/work-journal-search-evidence/`.

## Project Release Guide

- `RELEASE.md` at `origin/personal` `8c31e530d6`. Deviations: `None`. Proposed guide fixes: `None`.

## Handoff Summary

- `tickets/done/work-journal-search/handoff-summary.md` — `Updated`.
- Delivery revision record: `tickets/done/work-journal-search/delivery-revision-record.md`, current `DR-002`.

## Initial Delivery Integration Refresh

- Bootstrap base reference: merge-base `ddd6fdcdf6`.
- Latest tracked remote base reference checked: `origin/personal` @ `8c31e530d6`. It is contained in IR-006's merge `3d209177ec` (with `72874aac91` and `92c25580db`), and it had not moved at the start of DR-002.
- Local checkpoint commits: `cea80ab972` (CRR-007/CRR-008 records; ticket files only).
- Integration method: `Merge` (IR-006); at DR-002 `Already current`.
- Post-integration executable checks:
  - IMP-32: typecheck exit 0; server unit `3 failed | 7171 passed`; focused `2 failed | 1256 passed`; e2e 20 passed; web 161 passed. The 5 failures are FU-010 and FU-011, identical on a detached `origin/personal`.
  - API-REV-003 on a fresh packaged build of the merge.
  - Delivery smoke on HEAD (tree outside `tickets/` = `3d209177ec`):
    - `vitest run tests/unit/memory-search tests/architecture/application-framework-boundaries.test.ts` → `5 passed` memory-search files. The architecture file fails 2 assertions, and both diffs are base additions: `+ "key": "agent_runtimes"` and `+ ".../agent-definition/services/internal-agent-visibility.ts"`. That is FU-010, not this ticket.
    - `env -i … vitest run tests/e2e/memory` → `Test Files 7 passed | 1 skipped`, `Tests 20 passed`, including `memory-search-graphql` 2/2.
    - Evidence: `evidence/delivery/DR-002-*`.
- Post-integration verification result: `Passed` (the known base failures are excluded and recorded).
- Handoff state current with the latest tracked remote base: `Yes`.

## Verification

- Evidence judged: `Sufficient`.
- Evidence relied on:
  - `api-e2e-execution-coverage-report.md` (API-REV-003 on the merge, plus API-REV-002 and round 1 where still valid);
  - the files below;
  - IMP-32 and the delivery smoke.
- Confidence: final 94%, against a 95% target. No category is below 90%, and every critical criterion is directly proven. The 1-point gap is environment fidelity: a shared, non-idle host and a 6-day-old copy of memory. No executable surface here closes it, so it does not block verification.
- What was mocked: only the user's memory, used as an APFS clone of a real copy. Real Codex and AutoByteus agents, real embedding models and a packaged desktop app were used.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001 (gate 1) | API-L04r2; merge `API-L04r3-01-http-gates.txt` | `"answerable": 31, "oneSearchTop10": 30, "withinThreeSearches": 31` | Proven |
| AC-002 (gate 2) | `API-L04r3-01-http-gates.txt`; API-L04r2; API-L05r2 | merge: `"top3": 25` of 31 = 80.6% (≥ 80%), `"p90Ms": 537, "maxMs": 1013` at load 7.3–7.5. In-process round 2: top 3 26/31 = 84%, p90 742, max 1,034 ms. Q07 in 2 steps | Proven (shared host; thin top-3 margin explained by O-3 test chats) |
| AC-003, AC-004, AC-005 | API-L04r2, API-L05r2 | Q01 #2; 5 Chinese questions in the top 10; `unmaskedSecrets 0` | Proven |
| AC-006 | round 1 API-L12, API-D01 (`memory-run-discovery.test.ts`) | imported runs never found; test unchanged and reviewed (CRR-006, CRR-008) | Proven |
| AC-007 | `API-L14r3-01-offtopic-named-words.txt`; API-L14 census | `"strengthField": false`; `"passed": 11`; census 0 occurrences of the named words | Proven |
| AC-008 (first build on the reference machine) | API-L01r3 (private status file; `API-L02r3-01-page-smoke.txt`); round 1 API-L01 | M1 Max, 3,680-run clone of the user's memory: journals 57 s (≤ 5 min), text 2 min 32 s (≤ 10 min), meaning complete in about 40 min (≤ 2 h), progress on the page | Proven on the reference machine. Building on the user's own memory is a rollout step (UD-001: back up first), not missing evidence |
| AC-009 | merge API-L08r3; API-L08r2 | `"foundAtMs": 38859` = 22.9 s after the reply (`TEXT:tapirindigo8814`); 21.2 s in round 2 | Proven |
| AC-010, AC-011 | `API-L02r3-01-page-smoke.txt`; `API-L10r3-01-model-change-rebuild.txt` | `Not found in your memory: codenamed, pelicanmarigold9152.`; `Words: updater, ddns`; `Lines 750–1.049 of 1.099`, 294 ms; `"state":"MODEL_CHANGED"` → Rebuild → READY in 146 s with `mdbr-leaf-ir` | Proven |
| AC-012 | `API-L05r3-01-search-memory-both-entry-forms.txt`; API-L05r2 | MCP `structuredContent` with coverage; `MEMORY_TOOL_ARGUMENT_INVALID` with `isError`; `"wordsNotFound":["pelicanmarigold9152"],"note":"No matches; try other words."`. Native `{"coverage":…}`, argument error, `wordsNotFound` `gazelleturnip6230`. Real Codex reached the DDNS run (round 2) | Proven (O-1: phrasing) |
| AC-013 | `API-L05r3-01-search-memory-both-entry-forms.txt` | without selection: `TypeError: tools.mcp__autobyteus_agent_tools__search_memory is not a function`; native `I do not have a tool named search_memory` | Proven |
| Restart (DS-006) | `API-L11r3-01-restart.txt` | `threads 27 Footprint 258 MB` (no model) → first search `The meaning index is loading…` → `threads 31 Footprint 491 MB` with the absent-words note | Proven |
| Licensing / hygiene | `API-R05-r3-licensing-hygiene.log`; rerun before the final commit | `Licensing is consistent.`, `Repository artifact hygiene check passed.` | Proven |

- More evidence requested: `None`.
- User check needed: `No`. Every criterion is proven on the reference machine with real agents and a clone of the user's memory. The user's own first build is a user-started action (Index now), and nothing writes before it, as the `Memory index not built yet` coverage note in API-L05r3 shows. It is carried as a rollout instruction: back up first (UD-001).
- Privacy check for the public repository:
  - none of the 12 private question texts (`e2e-questions.json`) appears in any tracked file;
  - the probe screenshots (IMP-12, IMP-28) use the probe's fixture memory;
  - `probes/questions-public.json` and `probes/results/summary-batch-costs.json` hold only IDs, categories, opaque run IDs and counts, written as the public form (`investigation-notes.md`);
  - no `~/.autobyteus` path appears in the delivery evidence.
- Re-verification after later re-integration: recorded in Repository Finalization.

## Release Decision

- Decision: `Beta`.
- Decided by: the user, on 2026-10-27, before this package arrived: "there will be another release task comming. its going to be a beta release if everythign is proved". Verification proves it, so the beta goes ahead without asking again.

## Docs Sync Result

- `tickets/done/work-journal-search/docs-sync-report.md` — `Updated`. The change's docs were reviewed, and delivery added `search_memory` to `agent_tools_mcp_server.md`.
- Out of scope: FU-012 (the same list lacks four base adapters).
- Ticket design spec § Match Facts items 1 and 4: wording drift left to the Solution Designer.

## Ticket State Transition

- Moved to `tickets/done/work-journal-search`: `Yes` (archive commit).

## Version / Tag / Release Commit

- Recorded after release.

## Repository Finalization

- Recorded after finalization.

## Release / Publication / Deployment

- Applicable: `Yes` (Beta). Method: `Project Release Guide`. Recorded after release.
- Release notes: `Not required`. A pre-release tag uses GitHub generated notes.

## Environment Or Persisted-Data Transition Notes

- Approved decision: the index store and vectors are `Discard or Rebuild`; journals are `Directly Usable — No Migration`.
- Delivery action required: `None`. On the user's machine the first build is user-started, with a backup first (UD-001).

## Rollback Criteria

- Roll back if the Memory page, search or the `search_memory` tool break normal use, if indexing degrades the app (CPU or memory) beyond the measured footprint, or if journal generation damages run folders.
- Method: revert the merge on `personal` and cut the next beta. Desktop never downgrades. The index store can be deleted safely, since it is rebuildable. Generated Work Journals are additive files beside the raw traces.

## Final Status

- Recorded after release.
