# Investigation Notes — autobyteus-401 (project documents hold rules only)

## Investigation Meta

- Package identifier: `project-docs-rules-only-401`
- Request / ticket: Project Task `autobyteus-401` (project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-docs-rules-only-401`
- Repository mode: `Git`; branch `codex/project-docs-rules-only-401`
- Resolved base: `origin/personal` `6324fb056d` (fetched 2026-11-06); finalization target `origin/personal`
- Bootstrap result: worktree created (docs-only, no install needed); blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (2026-11-06): the updated `references/project-documents.md` ("What goes in them": rules, not the story of one ticket, release or failure; only DESIGN.md keeps design cases; each document's owner writes its rules) and `templates/project-design-template.md`; `references/requirements-engineering.md`, `references/ticket-scope.md` (read in this conversation); `RELEASE.md`, `TESTING.md`, `DESIGN.md` L118-151.
- Investigation status: Complete

## Findings (Read, `6324fb056d`)

| ID | Where | What | Disposition |
| --- | --- | --- | --- |
| F-01 | `RELEASE.md` L341-413 `## Case Studies` | Three stories: `v1.5.9-beta.14` (2026-10-28, partial release, 2 of 17 assets), `v1.5.11-beta.11` (2026-11-02, build-only run failed the widened gate), "The per-tag build-only run moved to the ticket" (2026-11-06) | Move each story into its release's record; delete the section |
| F-02 | `RELEASE.md` L325-327 | "An escape is fixed at the earliest stage … Fixing the stage that noticed it is how the per-tag build-only run came about (Case Studies)." | Keep the rule; replace the story pointer with the reason |
| F-03 | `RELEASE.md` L125-127 | "For example, a log named after a script such as `web-audit:localization-literals.log` broke the `v1.5.2-beta.1` Windows build at checkout. Name evidence files with `-` instead of `:`." | Keep the rule with its reason (a `:` in a file name breaks a Windows checkout); drop the version |
| F-04 | `RELEASE.md` L135-137 | "v1.5.6-beta.2 shipped in two betas with runs in such a workspace, and every brand-new run, failing to start; no check before tagging started a run." | Keep the reason (otherwise no check before tagging starts a run, so a failure to start runs ships unnoticed); drop the story |
| F-05 | `RELEASE.md` L168-169 | "(the user's decision, 2026-11-06)" | Keep "the user's decision"; drop the date (in the beta.2 record) |
| F-06 | `DESIGN.md` L145-150 (rule 12) | Examples naming both releases, ending "(RELEASE.md, Case Studies)" | Keep one short example line; point to the release records instead of the removed section |
| F-07 | `TESTING.md` | No per-case story found. L204 "(checked 2026-10-14)" dates a known gap (when the gap was last confirmed), which is a fact a reader needs, not a story | No change |
| F-08 | `docs/design-cases.md`, `DESIGN.md` Design Cases pointer | Design cases are kept on purpose (the user, 2026-11-04) | Out of scope |

## The Rules The Stories Taught (already in the documents)

| Story | Rule | Where it already stands |
| --- | --- | --- |
| `v1.5.9-beta.14` | Watch the four runs together; report a release only when complete | `RELEASE.md` L276 (Watching The Rollout) |
| `v1.5.9-beta.14` | Read the guide from `origin/personal` | `RELEASE.md` L9 |
| `v1.5.9-beta.14`, `v1.5.11-beta.11` | A release build starts from `pnpm install` alone | `DESIGN.md` rule 12 (L118); `TESTING.md` Fresh-start build |
| Per-tag run moved | No per-tag build-only run; the ticket-branch run for runner-only and build/gate changes; triage every failure | `RELEASE.md` Build-only release run (L166), Recovery (L300) |

Nothing is lost by moving the stories.

## Record Homes For The Stories

| Story | Record |
| --- | --- |
| `v1.5.9-beta.14` | `tickets/done/test-and-tooling-hygiene-294/release-deployment-report.md` (autobyteus-294 delivered that beta; commit `3d50cedc1b`) |
| `v1.5.11-beta.11` | `tickets/done/release-beta-20261102/release-deployment-report.md` |
| Per-tag run moved | `tickets/done/beta-release-v1.5.12-beta.2/release-deployment-report.md` (autobyteus-389, where the change was made, merge `7e87db8026`) |

## Supplemental Artifact Inventory

None.
