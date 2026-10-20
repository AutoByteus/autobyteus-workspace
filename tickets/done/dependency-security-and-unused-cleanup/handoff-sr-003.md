# Handoff — dependency-security-and-unused-cleanup, SR-003: design revised after IMP-DI-001

- Status: **Architecture Design Complete** (revised); `Medium` / `High` (unchanged)
- Package: `dependency-security-and-unused-cleanup`; Project Task `autobyteus-229`; requested by `/project_task_manager`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup`, branch `codex/dependency-security-and-unused-cleanup`
  - `9936445f55`: manifests + lockfile, steps 1-6, by the implementation engineer;
  - `3387f715c1`: ticket docs, IR-001.
  - The SR-003 edits to `requirements-doc.md`, `design-spec.md`, `solution-revision-record.md` and this file are uncommitted in the ticket folder.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/`

## What changed

**IMP-DI-001 → DEC-007, option (a).**
- The cause: axios 1.20.0, the only fix for GHSA-3pq3-5fj3-cg6v and GHSA-542g-h47m-68v8 (both high; verified with `gh api`), types `'content-type'` as `AxiosHeaderValue`, so `download-media-tool.ts` L118 no longer compiles.
- The fix: `String(contentType).split(';')`, which is the identity for the string header Node delivers, plus a unit assertion of the content-type → extension mapping.
- REQ-006 now allows type-level adaptations with no runtime change, each listed and tested. The escalation trigger and the Final File Responsibility Mapping are updated.

**IMP-04 → Dependency Rules restated.**
- No direct specifier crosses a major (for `0.x`, a minor).
- A transitive major is allowed when it comes from an in-range update of its parent, and it is listed in the handoff (as in `evidence/IMP-04`): mostly the nuxt/vite/oxc/esbuild toolchain, plus `@hono/node-server` 2.x inside `@modelcontextprotocol/sdk`'s declared range.
- Step 4's review line is aligned.

## Downstream

IR-001 steps 1-6 stay valid. Implementation adds the one line and the test, then runs step 7 (the full validation matrix).

## Route record

- 2026-10-20: `get_handoff_rules` → "completed or revised architecture package … architectural_risk=High" → `/software_engineering_team/architecture_reviewer`.
