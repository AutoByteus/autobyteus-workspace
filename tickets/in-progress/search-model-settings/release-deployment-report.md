# Delivery / Release / Deployment Report — search-model-settings (autobyteus-146)

Current delivery revision: `DR-001` — **Blocked at verification**. `Unclear` / possible `Design Impact` (O-5 against REQ-007 and AC-015); recipient `/software_engineering_team/solution_designer`.

## Release / Publication / Deployment Scope

- Ticket: `search-model-settings` (Project Task autobyteus-146). Adds Settings → Server Settings → Embedding: model status, download, cancel, remove and switch; per-Project index status with Index now and Rebuild. Since SR-007, the server also indexes a Project a few seconds after a Task write (REQ-011).
- `task_size`: Medium. `architectural_risk`: High. Route: reviewed.
  - Source review: CRR-005 Pass on `8c283c6acc`.
  - API/E2E: API-REV-002 Pass, 95%.
  - Test-code review: CRR-006 Pass.
- Delivery reached verification. No docs sync, finalization or release was done.

## Project Release Guide

- `RELEASE.md` at `origin/personal` `fc93276e6f`. Deviations: `None` (finalization not reached).

## Handoff Summary

- Handoff summary: not written (verification is open).
- Delivery revision record: `delivery-revision-record.md`, `DR-001`.

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` @ `8d40ba3b6c`.
- Latest tracked remote base reference checked: `origin/personal` @ `fc93276e6f` (63 new commits).
- Base advanced: `Yes`. New base commits integrated: `Yes`.
- Local checkpoint commit: `Completed` — `4882be5bc4` (CRR-005/CRR-006 records, ticket files only).
- Integration method: `Merge` → `f9de3d57d7`, no conflicts.
- Overlap with this ticket's files, all merged automatically:
  - `project-task-service.ts`: the base added the "part of" relation; the ticket only injects `changes`.
  - `projects-graphql.e2e.test.ts` (base adds part-of pins next to API-007).
  - `search-project-tasks-tool.test.ts`.
  - `projects.md` in both server and web docs.
  - `autobyteus-web/package.json`: version only.
- Semantic check: the search service follows Task writes through the same `changes` marks (`taskChanged` / `taskRemoved`) that the base's new `TaskRelationWrites` publish through. Part-of closures go through the service's own `update`. So write-triggered indexing still follows every Task write, and relation-only writes change no description, so they load no model. `project-task-service.ts` is 481 lines.
- Post-integration checks rerun: `Yes`. All ran serially on `f9de3d57d7` after `pnpm install --frozen-lockfile`, `prebuild` and `nuxt prepare`, because the base changed `pnpm-lock.yaml`. Evidence is in `evidence/delivery/DR-001-*`.
  - `typecheck` → exit 0.
  - Server `test:unit` → `Test Files 745 passed | 4 skipped (749)`, `Tests 6112 passed`.
  - `build`, then `env -i … vitest run tests/e2e/projects` → `Test Files 7 passed | 18 skipped (25)`, `Tests 44 passed`. Includes `projects-graphql` 12/12 (API-D01 with the base's part-of pins), `embedding-settings` 6/6, `project-task-search` 3/3 and `project-task-search-model-unavailable` 2/2.
  - Web `vitest run components/settings components/projects pages composables/settings composables/projects` → `Test Files 74 passed (74)`, `Tests 450 passed`.
- Post-integration verification result: `Passed`.
- Handoff state current with the latest tracked remote base: `Yes` at `fc93276e6f`. The merge is local and not pushed.

## Verification

- Evidence judged: `Insufficient for one criterion` — not missing evidence, but a gap between the requirement text and observed behavior that the requirements and design do not settle.
- Evidence relied on: `api-e2e-execution-coverage-report.md` (API-REV-002), the attached key files, and the integration rerun above.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-001, AC-005, AC-011 | API-L01, API-L07, API-R06 `result.json` | `Active·Not downloaded`, `On disk: 0 MB`, no `embeddings` 20 s later; probe `"result": "Pass"` EMB-001 | Proven |
| AC-002, AC-003, AC-004 | API-L03, API-L05, API-R06 EMB-002…004; round-1 API-L08 | failed download leaves no model folder, Retry completes; Cancel → `Not downloaded`; switch writes the setting | Proven |
| AC-006, AC-007 | `API-L06-r2-01-indexing.txt`; EMB-005, EMB-007 | `Indexing 56 of 1000` → left and returned → `Indexing 80 of 1000` → Ready; Beta `Ready · 20 Tasks` after Rebuild | Proven (user-started work) |
| AC-008 | Docker cases API-L01…L06, L11, L12 | all through a browser on the Docker node | Proven |
| AC-009, AC-010 | API-R03, API-L11 | GraphQL E2E; meaning searches return the new and edited Tasks | Proven |
| AC-012 | `API-L04-r2-01-unavailable-retry.txt` | `Active·Unavailable \| Unavailable: Could not reach huggingface.co…`; Index all disabled with its title; Retry → Ready 7.7 s | Proven |
| AC-013 (+ CR-003) | `API-L12-01-docker-no-model-load.txt`, `API-L12-02-desktop-no-model-load.txt` | after restart `Active·Ready`. Docker threads `23 → 22` after a dependency-only write, `26` after the description control. Desktop `27 → 26`, footprint 433 MB, then `30` / 684 MB for the control | Proven |
| AC-014 | `API-L05-r2-01-o4-o2-node-stopped.txt` | `actionError: 'Couldn’t reach the server.' role: alert`; next action clears it | Proven |
| AC-015 | `API-L11-02-docker-index-after-writes.txt`, `API-L11-03-docker-server-index-timing.txt`, `API-L11-04-desktop-ui-index-after-writes.txt`, EMB-006 | saves `70` / `14` ms (Docker) and `84` / `107` ms (UI). Server: `+3804 ms Alpha docs: READY \| Gamma desktop: READY`; desktop `+3399 ms … READY`; meaning searches find both Tasks. **An already-open Settings panel: `both Ready after 11239 ms of polling`** | **Not settled.** Indexing proven (≤ 3.8 s); "Settings shows the Project Ready within 10 s" holds when Settings is opened after the write, not for a panel already open (11.2 s) |
| REQ-007 (Must; AC-007 covers leave/return only) | API-L11(a); report O-5; design DS-001 / R-1 | The open panel polls every 10 s unless its last read showed work. Server-started indexing (REQ-011) is not seen until the next idle poll, so its progress is not updated "at least every 2 seconds" while the section is open | **Not settled** |
| QR-001 (DEC-012) | `API-L02-r2-01-docker-dec012.txt`, `API-L02b-02-desktop-first-load-samples.txt` | Docker refresh medians 8–9 ms; first load 1,764–2,111 ms within the Projects list's 1,440–2,709 ms. Desktop refresh median 4 ms; first loads 849, 997, 928, 883, **1204** (load 12.9), 840, 674, 672, 671, 765, 721, 617, 711, 709 ms, and 950/909 per the report | Proven, thin margin: 15/16 ≤ 1 s, the outlier on a loaded shared host |
| Licensing / hygiene | `API-R07-r2-licensing-hygiene.log` | `Licensing is consistent.`, `Repository artifact hygiene check passed.` | Proven |

- More evidence requested: `None`. The behavior is measured; the question is whether it is acceptable.
- User check needed: `No`. Per the delivery rule, a visible behavior that neither the requirements nor the approved design settles goes to the Solution Designer, not to a user check.

### Why verification is blocked (O-5)

- REQ-011 (added in SR-007) makes the server start indexing on its own after a Task write.
- The panel's cadence (DS-001 / R-1: 2 s while its last read showed work, otherwise 10 s) was designed before REQ-011.
- For an already-open panel, two approved texts are therefore not met literally:
  - **REQ-007 (Must):** "Progress (downloads, indexing) updates live while the section is open, at least every 2 seconds." Server-started indexing can run unseen for up to 10 s.
  - **AC-015:** "Within 10 s, both are indexed with no search: Settings shows the Project Ready". The open panel showed Ready at 11.2 s, though the server finished at about 3.8 s.
- API/E2E and code review both recorded O-5 as non-blocking and as a design-cadence question for the Solution Designer. Delivery cannot settle it by choosing an interpretation.
- Options the Solution Designer could weigh, without prejudging:
  - (a) Clarify REQ-007 and AC-015: the 2 s cadence covers work the user starts or sees running, and AC-015's Settings check means opening Settings after the write. Then verification passes on the current evidence.
  - (b) Change the design so an open panel notices server-started work promptly. For example, the panel could poll at 2 s for a short window after any Task write it is told about, or the status could expose the pending write-triggered run, but a 10 s idle poll still discovers it late. That means implementation, review and API/E2E rework.

## Release Decision

- Not reached. Nobody has asked for a release; the guide's default is `No release`.

## Docs Sync Result

- Not started (it runs after verification on the final state).

## Repository Finalization

- Ticket branch `codex/search-model-settings`: checkpoint `4882be5bc4`, merge `f9de3d57d7`, then this record. Local, not pushed.
- Repository finalization status: `Blocked` (verification open).

## Release / Publication / Deployment

- `Blocked` upstream of release.

## Post-Finalization Cleanup

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings` kept.

## Escalation / Reroute

- Classification: `Unclear` (possible `Design Impact`). The approved requirements (REQ-007, AC-015) and the design's cadence (DS-001 / R-1) disagree for server-started indexing seen on an open panel.
- Recommended recipient: `/software_engineering_team/solution_designer`.
- What delivery needs back:
  - **Clarified requirements:** a revision record showing the clarification. Delivery then resumes verification on the current evidence. The merged branch and its checks stay valid unless `origin/personal` moves again.
  - **Design change:** the reworked package through the normal route.

## Final Status

- Verification complete: `No` (O-5)
- Repository finalization complete: `No`
- Release/deployment: `Not reached`
- Unresolved blocker: O-5 decision
- Successful terminal package eligible for return: `No`
- Terminal package sent: `No`. Routed to `/software_engineering_team/solution_designer` as `Unclear`.
