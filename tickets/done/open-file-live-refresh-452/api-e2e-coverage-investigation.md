# API/E2E Coverage Investigation — autobyteus-452

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-002); `handoff-sr-002.md`
- Supplemental Task Artifacts: `evidence/repro/open-viewer-refresh-repro.mjs`; `follow-ups.md` (FU-001)
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (Medium / Low, direct API/E2E)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/open-file-live-refresh-452`, branch `codex/open-file-live-refresh-452`, base `827f1e68dc`; source as of `e0bb6399c7` (`aeda3e1140` documents).

**Base refresh during validation:** autobyteus-471 merged into `personal` first (`ed481ae4ca`). It changes `_reloadOpenFile`, which this change calls, and it renumbered the same duplicate MSP-32 to MSP-38. The design says "Whoever merges second rebases and reruns the other's cases", so `origin/personal` is merged into this branch as `2da34f6644`. The only conflict was the model-sheet ID, resolved to `personal`'s MSP-38 (MSP-37 is 471's case). This ticket's cases became MSP-39…42 (`02650fba10`). The authoritative results are on the merged state (API-07…10). API-04 is the pre-refresh full run, with the old IDs MSP-38…41.

## Current Requirement And Design Basis

- REQ-001 / AC-001, AC-002: an open viewer (desktop window or phone; text, image, PDF) shows a workspace file's new content within 3 s after it changes on disk, in place or by an atomic rename, in any folder (expanded or not).
- REQ-002 / AC-003, AC-004, AC-005: no read when no open file changed; no read for files that are not open; unsaved edits kept; own saves cause no loop; 450's explicit opens and the phone's key-based reads unchanged.
- Design: the node sends `{ type: 'modify', path }` for a change, a file add and a file move's destination, without consulting its lazy tree; the window reloads an open file whose path matches (450's `_reloadOpenFile`), unless the path is marked as its own save. Validation tasks named by the design: the step-3 probe and step 4 (RSK-001: message count for a burst of 200 changes in an unexpanded folder).

## Supported Scenarios And Real Usage

- SCN-001: the agent (or any program) rewrites a workspace file while the user watches it, on the desktop and the phone, at the same time.
- Real-use variants, from the implementation: an atomic rewrite with the temp file in the same folder, and with the temp file in another folder (the watcher reports it as a move); a root image (loaded folder); 20 files that are not open rewritten (an agent's batch); a burst of 200 changes (RSK-001); the user's own save while the stream echoes it; an unsaved edit during an outside rewrite.
- Contrived (not tested): none.

## Changed Surface And Boundary Classification

| Surface | Affected? | Boundary | Repository Evidence | Not Exercised By It | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Backend | Yes | `ModifyChange` by path; handler: change, add, move | IMP-03 (81 tests; real handler, mocked watcher events) | the real `chokidar` watcher with real rewrites, atomic from another folder | probe |
| API / transport | Yes | file-explorer stream `modify` shape (clean cut) | IMP-03, IMP-04 | real stream frames, volume (RSK-001) | probe (frames counted) |
| Frontend state | Yes | `fileExplorerTreeActions` path match, own-save mark | IMP-04 (store specs) | real viewers re-rendering | probe |
| Browser journey | Yes | desktop window and phone viewer | IMP-02 repro (1–2 px PNG, re-read only) | visible image/PDF change; unexpanded-folder atomic and cross-folder; reads for files that are not open; own save; unsaved edit | `test:e2e:mobile-shell` cases |
| Others (auth, persistence, shell, Android) | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (root). Phone behavior proven by a `test:e2e:mobile-shell` case.
- Changed build-input paths: none (`git diff --name-only 827f1e68dc...HEAD`: server and web source, tests, ticket files) → no fresh-start build.
- **Base defect found:** two cases with ID `MSP-32` in `mobile-shell-probe.mjs` (autobyteus-9 `be161036ed`, autobyteus-435 `e5ca0e1da7`); the probe's duplicate-ID start check stops it before any case. Fixed in this branch as its own baseline-fix commit `0da603e62e`: autobyteus-9's case becomes MSP-37 (header, `runCase`, two screenshot names). After the base refresh it is `personal`'s MSP-38 (471's `c686acfaff` made the same fix).
- Baseline fixes found during execution (TESTING.md Rule 9), each its own commit:
  - `e30dd1b15e`: MSP-24/34/35 read whether the node lists the run (stale since autobyteus-469). This is 471's FU-003.
  - `3db909124e`: the server's `memory-layout-cleanup-regression` test gets a timeout for its file read.
  - `899839dcae`: MSP-22 counts a stream attempt where the page starts it.
  - `0298663b07`: the server's `pairing-auth-service` test waits for the background last-seen write before removing its folder.
- Builds: IMP-06 from `e0bb6399c7` (verified before running); API-05 (pre-refresh rebuild); API-07 (merged state).

| Data | Method | Cleanup |
| --- | --- | --- |
| alpha (the probe's node, whose desktop window exists): a run with links to files under `live-452/` in alpha's workspace (folder never expanded): `deep/inner/a.md`, `pics/c.png`, `docs/d.pdf`, `notes/edit.md`, `bulk/*` (20), `burst/*` (200), a root image | test files written by the case; one ECHO message with links | probe root |
| a phone of these cases on alpha: own headless Chrome mapping 192.168.77.60 → 127.0.0.1, paired through Phone Access | public REST | closed |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Validity | Action |
| --- | --- | --- | --- |
| server `tests/unit/file-explorer/**` incl. new `watchdog-handler.test.ts`; `tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts` | path `modify` | Still Valid | Reuse (IMP-03) |
| web `stores/__tests__/fileExplorerLiveRefresh.spec.ts` and neighbours | path match, reloads, no reads for not-open files, draft, own save | Still Valid | Reuse (IMP-04) |
| web full suite | AC-005 | Still Valid | Reuse (IMP-08) |
| `mobile-shell-probe.mjs` (all cases) | phone shell regression incl. 450's MSP-28…31 (explicit opens) | Still Valid after the baseline fix | Run (full probe) |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | REQ-001/002 (unit, server) | file-explorer tests | Reused | IMP-03 | `e0bb6399c7` |
| API-02 | REQ-001/002 (unit, web) | store specs | Reused | IMP-04 | same |
| API-03 | AC-005 | full web suite; server unit; typechecks; guards | Reused | IMP-08, IMP-07, IMP-05 | same; IMP-07's one flake is in remote-access pairing (no file-explorer path), passes alone |
| MSP-39 | AC-001 | desktop window + phone, `live-452/deep/inner/a.md` open in both | Durable | in place; atomic, temp in the same folder; atomic, temp in another folder: each shown on both within 3 s | REQ-001 through the real watcher |
| MSP-40 | AC-002 | desktop + phone: `pics/c.png` (40×20 → 80×30), `docs/d.pdf` (page 200×100 "D VERSION 1" → 400×100 "D VERSION 2"), a root image | Durable | each rewritten while open: the image's new size, the PDF's new page shape, within 3 s | the visual clause |
| MSP-41 | AC-003, AC-004 (own save) | desktop window: `notes/edit.md` in the editor | Durable | an unsaved edit survives an outside rewrite; then the window saves: one `WriteFileContent`, at most one read-back (the base code reads once too, see the report) and no loop | the draft rule and the own-save mark |
| MSP-42 | AC-004, RSK-001 | desktop + phone network logs and file-explorer stream frames | Durable | 20 files not open rewritten: no content or folder read; 200 files rewritten in a burst: frames and `modify` entries counted (each path reported), no reads | QR-002; the design's step 4 |
| API-04 | AC-005, regression | full phone probe | Existing Test | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-04-mobile-shell-probe` | everything (pre-refresh, old IDs MSP-38…41) |
| API-06 | AC-005, regression | closed-rows cases after their baseline fix | Existing Test | `--cases=MSP-24,MSP-25,MSP-26,MSP-27,MSP-34,MSP-35` | the fix's proof |
| API-07 | — | server build, phone bundle | Build | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` from `2da34f6644` | merged state |
| API-08 | AC-005, REQ-001/002 (unit) | server file-explorer tests, server unit, full web suite, typechecks, guards | Repository | IMP-03/05/07/08 commands on the merged state | 471's store change meets this change |
| API-09 | all, merged | full phone probe incl. 471's MSP-37 and this ticket's MSP-39…42 | Existing + Durable | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<evidence>/API-09-merged-mobile-shell-probe` | design: rerun the other's cases |
| API-10 | AC-005 (471's desktop cases) | desktop browser probes | Existing Test | `test:e2e:file-explorer-pending-save-draft`, `test:e2e:search-pdf-preview` | 471's API-04 |
| API-11 | AC-005 (434's AC-004) | MSP-21…23 after the MSP-22 baseline fix | Existing Test | `--cases=MSP-21,MSP-22,MSP-23`; standalone socket-attempt check | the fix's proof |

- Test progress log: `Yes`

## Durable Coverage To Add / Update

| Case | Path | Why |
| --- | --- | --- |
| MSP-39…42 | `autobyteus-web/tests/e2e/mobile-live-file-refresh-cases.mjs` (new), called last from `mobile-shell-probe.mjs` | TESTING.md; the design's step 3 and 4 |
| — | `mobile-shell-probe.mjs` | header lines, the call, runtime note; and the baseline fix (model sheet; MSP-38 after the refresh) |
| MSP-24, MSP-34, MSP-35 | `autobyteus-web/tests/e2e/mobile-closed-task-rows-cases.mjs` | baseline fix `e30dd1b15e` |
| — | `autobyteus-server-ts/tests/unit/agent-memory/memory-layout-cleanup-regression.test.ts` | baseline fix `3db909124e` |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | User-only? | Follow-up |
| --- | --- | --- | --- |
| Files outside the workspace | out of scope | No | FU-001 |
| Packaged Electron window, incl. 471's packaged `event-monitor-file-preview` probe | This change touches no shell and no opening path. 471's packaged probe proves Electron local-file opening (`route === 'local'`), which a workspace `modify` never reaches: the path match is relative, and absolute paths are FU-001. The merged store specs (API-08) cover `_reloadOpenFile`'s routes | No | — |

## Ambiguities Or Reroute Triggers

None at planning. During execution: the base moved, with autobyteus-471 overlapping. That was handled by the design's own rule (merge and rerun), not a reroute.

## Investigation Decision

- Proceed: `Yes`; durable coverage added: `Yes`; baseline fixes: `Yes` (`0da603e62e`, `e30dd1b15e`, `3db909124e`, `899839dcae`, `0298663b07`); base refresh `2da34f6644`; reroute: `No`.
