# API/E2E Coverage Investigation

## Package

- Ticket: autobyteus-669 (agent-avatars-669). Worktree `autobyteus-worktrees/agent-avatars-669`, branch `codex/agent-avatars-669`,
  base `ea787a37b1`, code head `950061c296`, review docs `f1d6c89356`.
- Upstream: requirements SR-002 (REQ-001…008, AC-001…007), design SR-002, IR-001, code review CRR-001 Pass (held C-3; C-2
  "API/E2E's AC-006 run checks it").
- Route: Large / High, reviewed. A Pass goes to `/code_reviewer` for proportional test-code review.
- Working root: `/tmp/api669` (mine). The architecture reviewer's untracked `design-review-report.md` and
  `architecture-review-revision-record.md` are left as they are.

## Existing Coverage Found

| Area | Existing coverage | Gap for this ticket |
| --- | --- | --- |
| Reader (`readDefinitionAvatar`) | server unit specs: none / valid / invalid, size, signature, two candidates, symlink, cache, warn once | none at unit level; the GitHub import and update path is not run end to end |
| Route (`/rest/definition-avatars`) | `tests/unit/api/rest/definition-avatars.test.ts`: 200 with type and ETag, 304, 404, 401 with no credential, 403 for a peer | none (AC-005's peer 403 is proven here; the probe process always sends the owner credential) |
| Address and input rule | server unit specs for `definition-avatar-address.ts` and the services | an HTTP-level run of a personal setting surviving a package update, then reset |
| Run tree `definitionId` | server specs; web `runTreeDisplayRows`, `mobileRunListRows.spec.ts` (a peer row's `avatarUrl` is null) | no rendered peer row (IMP-003 "Not in this probe") |
| Web component, stores, object-URL cache | web specs | the rendered form flows (C-2), the phone's transient failures (C-3) |
| Rendered surfaces | IMP-003 probe: A-001…003, D-001, P-001, E-001 | the editors' save flows; a peer row; C-3 |

## Coverage Plan

| Criteria | Durable or run | Where |
| --- | --- | --- |
| AC-001, AC-002, AC-003 (GitHub-shaped) | **new durable** server e2e AV-01, AV-02 | `autobyteus-server-ts/tests/e2e/agent-definitions/definition-avatars-github.e2e.test.ts`: a fake GitHub serving two revisions as tar archives (the `package-personal-settings.e2e.test.ts` pattern); PNG, WebP and JPEG; the update replaces, removes and adds two invalid pictures; a personal setting across the update; reset |
| AC-001…003 (local and Git-clone-shaped) | probe A-001…003 | `definition-avatars-probe.mjs` (the implementation's, rerun) |
| AC-003, AC-006, C-2 (forms) | **new** probe D-002 (agent editor) and D-003 (team editor) | upload and save; reopen and save another field only (the user's picture stays: an input `avatarUrl: null` now clears); Remove and save (the package's picture, captioned, no Remove) |
| AC-004 desktop, installed, phone | probe D-001, E-001, P-001 | 1440×900 `nuxt dev`, the installed `file://` window, 390×844 phone; twenty delegated copies |
| AC-004 peer row (DEC-006) | **new** phone-probe case MSP-121 | `mobile-definition-avatar-cases.mjs` in `mobile-shell-probe.mjs`: alpha gets a definition with beta's Publisher's ID and a picture; the PTM's row of beta's Publisher run shows the fallback on the phone and in the desktop Runs view |
| AC-005 | probe P-001; server route spec | the phone's fetch log; 403 for a peer |
| C-3 (held) | **new** probe P-002 (a failed picture fetch) and P-003 (a failed first read of the agents' pictures) | measured: recovery without a reload, after a definition change, after a reload |
| AC-006, AC-007 | suites; doc check | server unit, web, server e2e; the docs named in AC-007 |

## Environment

- `env -i PATH HOME=<fresh> TMPDIR` for the suites; the probes start their own nodes on temp data roots with their own HOME
  and the scripted AGY CLI (no inference, no provider key). Never the user's AutoByteus or `~/.autobyteus`.
- Installed app: `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`, built from this worktree at 16:08, after the last
  product-code commits `ebba269dbc` and `30132f3351` (16:04). Since then only a server test, the probe script and docs
  changed (`git diff --stat 5a2ff965e6 950061c296`), run as an isolated instance on a copy of the probe's data root.
- Pictures: synthetic only (one colour, one letter). No realistic person.
