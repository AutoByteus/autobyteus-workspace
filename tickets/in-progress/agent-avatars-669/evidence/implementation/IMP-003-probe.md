# IMP-003 — Probe: package pictures on every surface, desktop, installed window and phone

- Date: 2026-11-28.
- Script: `autobyteus-web/tests/e2e/definition-avatars-probe.mjs`; its header names every case.
- Command:

  ```
  node autobyteus-web/tests/e2e/definition-avatars-probe.mjs --output-dir <tmp> --installed-app <worktree>/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app
  ```

- Builds, in this order: the server (`dist/app.js`); `pnpm build:electron:mac`, the installed app built from this
  worktree; `pnpm build:mobile-web`, the phone bundle the node serves at `/mobile`.
- Result: **6 passed, 0 failed**. Data is in `IMP-003-probe-evidence.json`, with the screenshots beside it.

## Stack and data

- **Owned by the probe and removed at its end**:
  - this worktree's node on 127.0.0.1, with its own data root and HOME, the probe's owner credential, and the scripted
    AGY CLI (no inference);
  - `nuxt dev` against that node;
  - headless Chrome, with the phone's private address `192.168.77.69` mapped to 127.0.0.1;
  - an isolated installed instance (`pnpm isolated-app start --app … --data-root <copy>`), stopped at the end.
- **The end state** (`cleanup` in the JSON): installed instance stopped, frontend and backend not running, the root
  removed. No probe temp folder was left.
- **Pictures:** synthetic only, drawn by the probe. Each is a 96×96 PNG of one colour with one white block letter (W, M,
  C, L, S, R, and N, U, W for the replacements). No realistic person.
- **Packages, imported as `LOCAL_PATH`:**
  - `avatar-studio-pack`:
    - agents `writer` and `hub`, each with `avatar.png`;
    - agent `broken`, whose `avatar.png` is text;
    - team `crew`, with `avatar.png` and a team-local `lead` with its own;
    - org `studio`, with `avatar.png`.
  - `avatar-clone-pack`, shaped as a Git clone (`.git/HEAD`, `README.md`): agent `reviewer`, with `avatar.png`.
- **Runs:**
  - six of `writer`, each with a message;
  - a `hub` run that delegated **twenty** copies of `crew`, one Project Task each, through its real `delegate_task`
    tool.

  Twenty copies of one team are the AC-005 shape: the run history lists 6 runs per agent (`limitPerAgent`), so an agent's
  own runs cannot make twenty rows.

## Cases

| Case | AC | What was shown |
| --- | --- | --- |
| A-001 | AC-001, AC-002 | Each of the 6 pictured definitions has `avatarUrl` `/rest/definition-avatars/<kind>/<id>?v=<12 hex>` and `userAvatarUrl` null. These are 4 agents (including the team-local `lead` and the clone's `reviewer`), the team and the org. The route sends the file's exact bytes as `image/png`. The broken agent loads with no picture, and the node logs `DEFINITION_AVATAR_IGNORED … is not a PNG picture` once. (No-credential 401 and peer 403: `tests/unit/api/rest/definition-avatars.test.ts`. The probe process sends the owner credential on every loopback request.) |
| A-002 | AC-001 | **Agent:** replacing `writer/avatar.png` in its folder gives a new `?v=` through the watcher, and the route sends the new bytes. **Team:** replacing `crew/avatar.png` then `reloadAgentPackage` gives a new `?v=` and the new bytes. |
| A-003 | AC-003 | An uploaded picture is the user's (`avatarUrl` = `userAvatarUrl` = the upload, `AVATAR` personal). Saving the package's address as the user's picture clears it: the package's address shows again and nothing is personal. Saving `null` clears too. |
| D-001 | AC-004, AC-006 | `nuxt dev`, 1440×900: the Agents, Teams and Orgs catalogs, a team's detail, the Workspaces tree, a conversation, the Runs view and the agent editor. Every picture drew from the node's address (`http://127.0.0.1:<port>/rest/definition-avatars/…`). The 20 copies show one picture, one address. The broken agent and the built-in Daily Assistant show initials. The editor previews the package's picture, captioned "From the package", with no Remove. Slots keep their sizes (64, 36, 32, 20 and 16 px squares, as before). |
| P-001 | AC-004, AC-005 | Phone, 390×844, paired through Phone Access: 25 rows (the hub, its 20 copies, 4 writer runs), all with pictures. The 20 copies share **one** object URL. **One fetch per picture address**: hub 1, writer 1, crew 1, for 20 crew rows. Each fetch carries `Authorization: Bearer <phone credential>`, and no address has a credential or token in it. |
| E-001 | AC-004 | The installed `file://` window, an isolated instance on a copy of the data root, 1440×900: the Agents and Teams catalogs and the Workspaces tree. 26 pictures drew, every one from `http://127.0.0.1:<port>/rest/definition-avatars/…`; none from `file:///rest/…`. |

## Screenshots

| File | Surface |
| --- | --- |
| `IMP-003-desktop-1440x900-agents-catalog.png` | Agents catalog: Story Writer (navy N), Hub Manager (green M), Clone Reviewer (teal R), Broken Picture and Daily Assistant (initials) |
| `IMP-003-desktop-1440x900-teams-catalog.png`, `…-team-detail.png`, `…-orgs-catalog.png` | Team and org cards and detail |
| `IMP-003-desktop-1440x900-workspaces-tree.png` | The hub's group and its copies, each with the crew picture in the 16px slot |
| `IMP-003-desktop-1440x900-conversation.png` | A writer run: header and message avatar |
| `IMP-003-desktop-1440x900-runs-view.png` | The Runs view: copies and writer rows, with the conversation open |
| `IMP-003-desktop-1440x900-agent-editor.png` | The editor: preview, "From the package", Upload, no Remove |
| `IMP-003-installed-1440x900-*.png` | The same surfaces in the installed window |
| `IMP-003-phone-390x844-run-list.png` | The phone's run list |

## Browser errors

Three on the phone: `401 /favicon.ico`. The browser's own favicon request at the origin root carries no credential; this
is known and recorded by the other phone probes. There were none on the desktop or in the installed window.

## Not in this probe

- **A peer node's row (REQ-004, DEC-006).** It is shown by the specs:
  - `mobileRunListRows.spec.ts`: a peer row's `avatarUrl` is null;
  - `runTreeDisplayRows`: a peer has no `definitionId`;
  - the server's peer records have no definition ID.

  A cross-node delegation stack was not built for this ticket.
