# Investigation Notes — autobyteus-ts dependency hygiene

## Investigation Meta

- Package identifier: `autobyteus-ts-dependency-hygiene`
- Request / ticket: Project Task `autobyteus-224` (FU-003 and FU-006 of `autobyteus-182`), delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on 2026-10-20
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-dependency-hygiene`
- Repository mode: `Git`
- Task worktree / branch: same path, branch `codex/autobyteus-ts-dependency-hygiene`
- Resolved base: `origin/personal` @ `5de6a698b9` (fetched 2026-10-20)
- Finalization target: `origin/personal`
- Bootstrap result: worktree created from refreshed `origin/personal`; blocker: none
- Current solution revision ID: `SR-001`
- Authorities read: `references/requirements-engineering.md`, `references/ticket-scope.md` (read in this conversation, unchanged since); design gate: `references/architecture-design.md`, `references/design-principles.md` (current shared version), `DESIGN.md`, `TESTING.md`, `templates/design-spec-template.md`, `references/handoff.md` (current), `SKILL.md` (current, re-read 2026-10-20)
- Investigation status: Complete for design

## Initial Request And Clarifications

- Task:
  1. Delete the stale standalone `autobyteus-ts/pnpm-lock.yaml` after confirming that nothing installs `autobyteus-ts` outside the workspace; regenerate it instead if a standalone install is supported.
  2. Remove the unused `"hono": "^4.0.0"` from `autobyteus-ts` `dependencies` after confirming that no runtime path (packaged app, Docker image, `verify:runtime-deps`) needs it.
- Done when: both are resolved or shown to be needed, with the reason; the build and the packaged smoke check pass.
- Evidence supplied: `autobyteus-182` `follow-ups.md` rows FU-003 and FU-006 (attachment identical to `origin/personal:tickets/done/mcp-sdk-v2-migration/follow-ups.md`).

## Source Log

| Date | Type | Source / Command | Finding |
| --- | --- | --- | --- |
| 2026-10-20 | Code | `git log -- autobyteus-ts/pnpm-lock.yaml` | Touched only by `b1c89884e6` (2026-02-26 flatten), `48770ecf7f` (2026-06-06), `87011bba94` (2026-09-24); not by the 1.32 or v2 upgrades. Lists `@modelcontextprotocol/sdk` 1.30.0 and `hono` (L29) |
| 2026-10-20 | Contract | `gh repo view AutoByteus/autobyteus-ts`, `…/autobyteus-server-ts` | Both **archived**, last pushed 2026-02-25 / 2026-02-26, the flatten date. The standalone-repo era that the lockfile served is over |
| 2026-10-20 | Data | `pnpm-workspace.yaml` | `autobyteus-ts` is a workspace package |
| 2026-10-20 | Runtime | `probes/standalone-install-probe.txt`: `(cd autobyteus-ts && pnpm install --lockfile-only)`, pnpm 10.28.2 | "Scope: all 13 workspace projects"; root lockfile md5 unchanged; `autobyteus-ts/pnpm-lock.yaml` unchanged. pnpm run inside `autobyteus-ts/` uses the root lockfile, so the documented `cd autobyteus-ts && pnpm install` (`autobyteus-ts/examples/README.md` L10-20) does not read the standalone file |
| 2026-10-20 | Code | `grep -rn "autobyteus-ts/pnpm-lock\|ignore-workspace"` (repo, no `node_modules`/`tickets`) | No reference to the file. `--ignore-workspace` is used only by `autobyteus-message-gateway/tools/wechaty-sidecar` (own lockfile, unrelated) |
| 2026-10-20 | Code | `.github/workflows/release-*.yml`, `autobyteus-server-ts/docker/Dockerfile.monorepo` L15-26, `autobyteus-web/scripts/prepare-server.mjs` L186-275 / `prepare-server.sh` | Installs run at the root (`pnpm install`, root lockfile copied); packaging packs `autobyteus-ts` with `pnpm pack` (no lockfile in the tarball's install) |
| 2026-10-20 | Code | `npm view autobyteus-ts` | Not published (404); its only consumer is `autobyteus-server-ts` (`workspace:*`) |
| 2026-10-20 | Code | `grep -rn hono --include=*.{ts,mts,js,mjs,cjs,json,yml,yaml,sh}` (repo, no `node_modules`/`dist`/`tickets`, lockfiles excluded) | Only `autobyteus-ts/package.json` L39 (other hits are the word "honor"). No source, script, test or other manifest uses `hono` |
| 2026-10-20 | Code | `git log -S'"hono"' -- autobyteus-ts/package.json` | Present since the flatten `b1c89884e6`; the reason is not recorded |
| 2026-10-20 | Data | root `pnpm-lock.yaml` packages/snapshots | Packages that use `hono`: `@hono/node-server@1.19.9` (**peer** `hono ^4`), whose users `@modelcontextprotocol/node@2.1.1` and `@modelcontextprotocol/sdk@1.32.1` each list `hono` as their own dependency. So the peer stays satisfied without `autobyteus-ts`'s entry; `hono` stays in the tree through them |
| 2026-10-20 | Code | `autobyteus-ts/scripts/verify-runtime-dependencies.mjs` | Fails only when built `dist/*.js` imports a package that the manifest lacks; it never requires an unused entry. Runs as the last step of `autobyteus-ts` `build` |
| 2026-10-20 | Code | `.github/workflows/release-desktop.yml` L438-448, L519-529; `autobyteus-web/scripts/verify-packaged-server-startup.mjs` | The packaged smoke check: `node autobyteus-web/scripts/verify-packaged-server-startup.mjs --server-root <app>/resources/server --runtime-executable <app executable>` |
| 2026-10-20 | Code | `find . -name .github -type d` | Nested leftovers of the split-repo era: `autobyteus-ts/.github/workflows/trigger-server-docker-rebuild.yml` (dispatches to the archived `AutoByteus/autobyteus-server-ts` on push to `main`; GitHub runs only root `.github` workflows; no reference elsewhere) and `autobyteus-web/.github/workflows/desktop-tag-build.yml` |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Current Path | Outcome | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Developer/CI install | `pnpm install` at the root or inside any package | Root lockfile; the standalone file is never read | probe |
| BEH-002 | Operational | `autobyteus-ts` build | `tsc` + `verify:runtime-deps` | Passes; `hono` not imported | script |
| BEH-003 | Operational | Desktop packaging / Docker image | `prepare-server.*`, `Dockerfile.monorepo` | `autobyteus-ts` tarball installs its `dependencies`, today including `hono` | scripts |
| BEH-004 | Operational | Packaged smoke check | `verify-packaged-server-startup.mjs` | Server starts | CI workflow |

## Persisted Data And State Facts

None affected.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Related IDs | Status |
| --- | --- | --- | --- | --- |
| `probes/standalone-install-probe.txt` | Solution Designer | Which lockfile pnpm uses inside `autobyteus-ts`; archived standalone repos | REQ-001 | Final; evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Resolution | Status |
| --- | --- | --- | --- | --- |
| R-001 | Risk | A developer's local habit relies on the standalone lockfile | The probe shows pnpm never reads it inside the workspace; the standalone repo is archived | Closed |
| R-002 | Risk | A packaged runtime path needs `hono` from `autobyteus-ts` | No `dist` import; peers satisfied by `@modelcontextprotocol/node`/`sdk`; the packaged smoke check confirms | Open → validation |

## Architecture Investigation Findings

- The whole change is two manifest/lockfile edits plus deleting two files. No source owner, API or runtime path changes.
- `pnpm install` regenerates the root lockfile's `autobyteus-ts` importer without `hono`.

## Requirement Implications

- No supported standalone install exists, so the lockfile is deleted rather than regenerated.
- `hono` is unused, so it is removed.
- The nested `autobyteus-ts/.github` workflow is dead config in the same package and from the same split-repo era. Principle 7 (dead code in a touched module) puts it in this ticket (DEC-002). The `autobyteus-web` one is in another package, so it is a follow-up.
