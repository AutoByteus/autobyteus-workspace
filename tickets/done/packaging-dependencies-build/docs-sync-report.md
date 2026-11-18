# Docs Sync Report — autobyteus-345 (packaging-dependencies-build)

## Scope

- Ticket: `packaging-dependencies-build` (Project Task autobyteus-345); `task_size` Medium, `architectural_risk` High, reviewed route (ARCH-REV-001, CRR-001 Pass, API-REV-001 Pass 94.2%, test-code review CRR-002 Not Applicable)
- Trigger: code reviewer's CRR-002 handoff
- Bootstrap base: `origin/personal` @ `efd28d5c4a`; integrated base for docs sync: `origin/personal` @ `0295553657` (merge `a960adf64f`)
- Post-integration verification: `evidence/DEL-01-post-integration-checks.md`

## Why Docs Were Updated

The server package, the installs of release builds, the Windows staging bound, the GraphQL codegen commands and the declared-imports check changed; readers of the packaging and web docs need the current rules. The implementation updated the three docs; delivery verified them against the integrated code.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | owner of the packaging description | No change (updated in the ticket) | `files` list, `pnpm deploy --legacy --prod`, Prisma CLI as production dependency, `--frozen-lockfile` everywhere, the Windows `--before` bound and `AUTOBYTEUS_NPM_BEFORE` (names the "bound, not an identity" limit), mirrored `.bin` cleanup, the two source checks; each statement matches the scripts and tests |
| `autobyteus-server-ts/docker/README.md` | Docker builder stages | No change (updated in the ticket) | `--frozen-lockfile` from the manifests of the server and linked workspace packages |
| `autobyteus-web/README.md` | codegen and declared-imports commands | No change (updated in the ticket) | `codegen:local`, `codegen:check`, `codegen`, the Declared Imports section; `codegen:check` verified to pass |
| `RELEASE.md` | release rules (changed on the base by autobyteus-355) | No change | this ticket does not change a release rule; its build-only run was done under the existing rule |

## Docs Updated

By delivery: none. New delivery artifact: `release-notes.md`.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source | Target Doc |
| --- | --- | --- | --- |
| Server package content and production-only deploy | what the package carries; why `prisma` is a production dependency | design-spec | `electron_packaging.md` |
| Windows staging install bound | `--before` is a bound, not an identity; the override | design-spec DEC-3 | `electron_packaging.md` |
| Generated GraphQL stays current | `codegen:check` and the architecture test | requirements | `autobyteus-web/README.md` |

## Removed / Replaced Components Recorded

| Old Component | What Replaced It | Where Documented |
| --- | --- | --- |
| `canuse-ok.txt`, the nested `autobyteus-web/.github/workflows/desktop-tag-build.yml`, the Prisma-only devDependencies and `npm prune`, five `--no-frozen-lockfile` installs, `@nuxtjs/apollo` | the `files` list, `--prod` deploy, frozen installs | `electron_packaging.md`; no reference to the removed names remains outside tickets |

## Delivery Continuation

- Result: `Pass`. Follow-ups outside this ticket stay in `follow-ups.md` (FU-001…FU-007). Residual leftover noted: `autobyteus-web/tickets/desktop-tag-build-workflow/` is a stale planning folder that is part of FU-001.
