# Handoff — SR-003, Architecture Design Complete

- Package: `fastify5-and-spreadsheet-parser` (Project Tasks autobyteus-248 + autobyteus-249, merged)
- From: Solution Designer, 2026-10-24
- Result: `Architecture Design Complete`, `task_size` = Medium, `architectural_risk` = High
- Route: handoff rule "task_size=Large or architectural_risk=High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's direction of 2026-10-24

## Original request (summary)

Close the two high advisories with no simple update.
- **Part 1:** move the server and the message gateway to Fastify 5, mercurius 16 and the matching `@fastify/*` majors. Decide GraphiQL with the user. Bring the gateway under a lockfile, make its Docker build install from it, and audit it.
- **Part 2:** replace or update xlsx 0.18.5 in the web file viewer. The viewer must still open xlsx/xls/csv as before, and tests use generated fixtures only.

Constraints:
- Prove everything from a clean clone, including the packaged app and both Docker images.
- Never print or store secrets.
- No release unless asked.
- Done means merged to `personal`.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser`
- Branch: `codex/fastify5-and-spreadsheet-parser`
- Base: `origin/personal` @ `ddd6fdcdf64b1a6750415c68ccef0bbb316083d2`
- Finalization target: `origin/personal`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/fastify5-and-spreadsheet-parser/tickets/in-progress/fastify5-and-spreadsheet-parser/`. It is not committed yet; the worktree holds no source changes.

## Approval basis

- Requirements are `Approved` at `SR-002`.
- The user approved on 2026-10-24 in the Solution Designer conversation by delegating DEC-001 and DEC-002 to the recommendations. The user's words are quoted in `requirements-doc.md` Document Status.
  - **DEC-001:** GraphiQL off everywhere.
  - **DEC-002:** SheetJS 0.20.3 from cdn.sheetjs.com, pinned by its lockfile integrity hash.
- Decisions the Solution Designer made within the direction:
  - **DEC-003:** the gateway gets its own pnpm workspace and lockfile.
  - **DEC-004:** baileys 6.7.24, which fixes a critical advisory.
  - **DEC-005:** the viewer's table HTML is sanitised with DOMPurify.
  - **DEC-006:** target versions.
  - **DEC-007:** the runtime-package script is a follow-up.
- SR-002 also corrected AC-003 to the base behavior that REQ-002 preserves. Evidence: `evidence/SD-06`.

## Design in one paragraph

**Server:**
- Raise the dependency ranges to fastify ^5.12.7, mercurius ^16.12.1, @fastify/cors ^11.3.1, /multipart ^10.1.6 and /websocket ^11.3.4.
- Delete `graphiql: true`.
- Delete the two MCP routes' `{ config: { cors: false } }`. On Fastify 4 this config never took effect; on Fastify 5 it would start suppressing CORS headers, so keeping it would change behavior. It is also the only type error.
- No type augmentation, no reordering, no remote-access rule.

**Gateway:**
- Raise fastify to ^5.12.7 and @fastify/cors to ^11.3.1; set baileys to 6.7.24; pin `"packageManager": "pnpm@10.28.2"`.
- Add a gateway-local `pnpm-workspace.yaml` (`packages: ["."]` plus the build-script allowlist) and `pnpm-lock.yaml`.
- Rewrite the Dockerfile to install only from those files.
- Add a README install note.

**Web:**
- `xlsx` becomes the cdn.sheetjs.com 0.20.3 tarball.
- The viewer renders `sheet_to_html(sheet, { header: '', footer: '' })`, sanitised to table tags plus colspan/rowspan.
- The spec uses the real parser with generated workbooks.
- Update the docs row in `docs/content_rendering.md`.

**Order:** three commits, with Part 2 first.

## Evidence highlights

All files are in the ticket folder's `evidence/` and `probes/`.

- **SD-01:** all 13 targeted advisories are gone in the trial and none are added. One unrelated high in `body-parser` remains (FU-001).
- **SD-02, SD-07:** gateway.
  - The base manifest's audit shows 6 high and 1 critical.
  - On the trial manifest the audit is clean, typecheck passes and 268 tests pass.
  - Without a local workspace file, pnpm in the gateway folder acts on the root workspace.
  - Without the `packageManager` pin, Docker's Corepack fetched pnpm 12, which rejected a package published today.
  - With the pin, the image builds and `/health` answers.
- **SD-03:** the gateway's Docker build fails at base.
- **SD-04:** server trial.
  - Unit: 815 files and 6770 tests pass.
  - e2e: green after building the server, except 4 tests that fail identically on base (FU-004).
- **SD-05, SD-08:** viewer.
  - The 0.18.5 attribute injection is reproduced, both in a node probe and in the real viewer on base, where the spec's injection case fails.
  - 0.20.3 plus the sanitiser passes for xlsx, xls (biff8), xlsm and CSV, including tabs and the injection cells.
- **SD-06:** the MCP CORS config probe, Fastify 4 vs 5.

## Open risks

- **RSK-001:** Fastify 5 run-time differences that the suites don't cover. Validation still has to run the integration suite, the packaged app and both Docker images.
- **RSK-002:** a cold install needs cdn.sheetjs.com to be reachable. Integrity pinning makes this an availability risk only.
- **RSK-003:** baileys' `libsignal` comes from a GitHub tarball. The lockfile records the commit.
- **ASM-001:** the existing suites are assumed to be enough to catch regressions, together with the AC-003 and AC-004 probes.

## Follow-ups

Recorded in `follow-ups.md`; not sent yet.
- **FU-001 (urgent):** `body-parser` advisory.
- **FU-002:** the gateway's runtime-package script.
- **FU-003 (urgent):** the web app has no CSP.
- **FU-004:** 4 e2e tests that fail on base.

## Expected output

An independent architecture review of SR-003 against the approved requirements (SR-002).

## Documents

- `requirements-doc.md`
- `investigation-notes.md`, including the supplement inventory
- `solution-revision-record.md`
- `design-spec.md`
- `follow-ups.md`
- `evidence/SD-01`..`SD-08`
- `probes/`
