# Handoff Summary — task-part-of

Project Task `autobyteus-171`: a "part of" relationship between Project Tasks.

## What Shipped

- A Project Task has an optional parent (`partOfTaskId`), another current Task of the same Project, with one level only. It is set, replaced and cleared through GraphQL (`partOfTaskId`), through `create_task` / `update_task` (`part_of`) and through the New / Edit task "Part of" field. "New part" on a parent's page creates a Task with the parent already chosen.
- Invalid parents are refused with `TASK_PARENT_INVALID` and nothing is written: self, unknown, another Project's, a Temp task, a parent that is a part, or a Task that has parts.
- Readers show the relation. The board card shows progress ("2 of 4 done") and the part line. The Task page and the right-panel tab show the Parts and Part of cards. The tools show `partOf` / `parts` by key in list and search, and `closedParts` in the `update_task` result.
- When a parent changes to DONE or CANCELLED, its TODO / IN_PROGRESS parts change to the same status through the same update path, which closes their task agents. A part that fails to close is logged as `TASK_PART_CLOSE_FAILED` and skipped.
- Deleting a parent leaves its parts without a parent and keeps their `updatedAt`. The delete confirmation says how many parts stay.
- Persisted data: `Directly Usable — No Migration`. An absent field means no parent.

## Classification And Route

- `task_size`: Large. `architectural_risk`: High. Route: Reviewed (ARCH-REV-001, CRR-001 source, API-REV-001, CRR-002 test code).
- Delivery did not reclassify the change.

## Integration Refresh

- Bootstrap base: `origin/personal` @ `cba6b85122`. Latest base checked: `origin/personal` @ `8d40ba3b6c` (45 new commits: Work Journal, owner-scoped file-change reads, release-guide and design-guide docs, beta.9 bump).
- Method: merge (`afb2b814c2`, "Merge origin/personal into codex/task-part-of"). It merged cleanly. The two overlapping files merged automatically and keep both sides: `collaboration_model.md` (base: section 3 Work Journal; ticket: CM-6) and `generated/graphql.ts` (different hunks).
- No checkpoint commit was needed, because the ticket branch was fully committed (only untracked build output was present).
- Post-integration checks on `afb2b814c2` (evidence in `evidence/DEL-*`):

| Check | Command | Result |
| --- | --- | --- |
| DEL-01 | `pnpm -C autobyteus-server-ts typecheck` | Pass, exit 0 |
| DEL-02 | `pnpm -C autobyteus-server-ts test:unit` | 741 files passed, 4 skipped; 6076 tests passed, 7 skipped; exit 0 |
| DEL-03 | `pnpm -C autobyteus-web test:nuxt --run` | 639 files passed, 2 skipped; 4547 tests passed, 3 skipped; exit 0 |
| DEL-05 | `pnpm -C autobyteus-server-ts build` | exit 0 (dist rebuilt from the integrated state) |
| DEL-04 | API-06 rerun: gated `tests/e2e/projects` + `tests/e2e/app-data-migrations` (clean env, scripted AGY) | 31/31 files, 121 passed, 4 skipped (the suites' own optional gates); exit 0. This includes `project-task-parts-live` (live cascade with running task agents), the boundaries / GraphQL / search / feed pins and the base's new suites |
| DEL-06 | web `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | All passed |

- A first DEL-04 attempt failed in one suite, the base's new `remove-work-trace-exports-startup`. That suite spawns `dist/app.js`, which was still the pre-merge build. After the rebuild (DEL-05) it passed. This was a stale build, not a defect. The log is kept as `DEL-04a-…`.

### Re-integration before the final merge

- During delivery, `origin/personal` moved on to `b35259e5b5` (9 commits: a remote MCP server credentials fix and the `1.5.6-beta.10` version bump). Nothing overlaps with this ticket.
- It was merged into the ticket branch as `2fe032750f`, with no conflicts. Then these were rerun on that state:

| Check | Command | Result |
| --- | --- | --- |
| DEL-07 | server typecheck | exit 0 |
| DEL-08 | web guards (3) | all passed |
| DEL-09 | server `test:unit` | 742 files passed, 4 skipped; 6079 tests passed, 7 skipped; exit 0 |
| DEL-10 | web `test:nuxt --run` | 639 files passed, 2 skipped; 4549 tests passed, 3 skipped; exit 0 |
| DEL-11 | the five part-of E2E suites, gated (`project-task-parts-live`, `project-task-boundaries`, `projects-graphql`, `project-task-search`, `project-change-feed`) | 5/5 files, 39/39 tests; exit 0 |

- The user-facing behavior of this ticket did not change, so the verification below still holds.

## Verification From Evidence

- Judgement: `Sufficient`. All 20 ACs are proven. Every critical AC is proven directly, and the final confidence of 96% meets the 95% target, with no category below 95%. No user check is needed.
- What I opened: API-06 log (29/29 files at the time); API-05 live log and JSON (`closedParts` for CANCELLED and DONE, `TASK_AGENT_RESOURCE_CLOSED` fence on the stopped worker, Temp-task refusals, cleanup with 0 live AGY processes); API-08 `evidence.json` (parent "1 of 3 done · 1 cancelled" → "1 of 1 done · 3 cancelled", parts moved to the Cancelled lane, tab status `Cancelled`, `boardGraphqlRequestsDuringCascade: 0`, no browser errors) and the tab screenshot after the cascade; API-09 `result.json` (J1–J11, zh-CN strings, delete notes, step-1 `task.json` bytes unchanged) and the parent-page screenshot, which matches the approved layout. The DEL-04 rerun covers the integrated state.
- What I noted: J7 (tab inside Electron) is labelled `Pass` in the journey script but observed `reachable: false`. The tab's proof is API-08, on the same renderer with a real run. No shell code changed, so this is accepted.

## Docs

- The ticket updated `autobyteus-server-ts/docs/modules/projects.md`, `docs/design/collaboration_model.md` (CM-6) and `autobyteus-web/docs/projects.md`.
- Delivery updated `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` (`part_of`, `partOf` / `parts`, `closedParts`, and the cascade in the Project Task tool contract) and fixed the `projects.md#task-keys-depends-on-and-part-of` anchor there and in `agent_tools.md`. See `docs-sync-report.md`.

## Release

- Decision: **No release**. This is the RELEASE.md default. The user did not ask for a release in the request or its clarifications. The design spec's change sequence lists "beta release (delivery)" as a plan item, but it does not trace to a user decision. The change ships with the next release, and a beta is available on request.
- `release-notes.md` is written and archived with the ticket for the next release.

## Residual Risks

- A part that fails to close during a cascade (its run data is damaged) is covered by unit tests only. It is logged and left out of `closedParts`, as accepted in ARCH-REV-001.
- The tab inside the Electron shell is inferred from the same renderer (API-08).
- One `update_task` can stop several task agents. This is the user's decision, and `closedParts` names them.
- Desktop app and nodes must run the same release (DEC-009; no mixed-version code).

## Follow-ups (already with `/project_task_manager`)

- `autobyteus-177`: the Depends on picker ignores Enter right after opening.
- `autobyteus-164`: `generated/graphql.ts` needs a full codegen refresh.
- `autobyteus-178`: `drainRuntimeReleases()` has no production caller.
- `FU-TR-001`: the scripted-AGY E2E helpers are duplicated across suites.
- FU-001 (design): the Project Task Manager's skill could teach `part_of`.
