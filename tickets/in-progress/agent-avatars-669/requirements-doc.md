# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: SR-001
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the founder (2026-11-26 and 2026-11-28: avatars so the product feels more human; the order is his).
- Approved by: Solution Designer within the direction; user informed 2026-11-28.

## Scope Guardrail

- **Use cases changed:** seeing an agent's or team's picture wherever a person sees it.
  - Desktop: the Runs view, the Workspaces tree rows (including delegated runs and members), the chat assistant row, the workspace headers, agent and team cards and details.
  - Phone: the run list (top-level rows, delegated rows, members).
  - Also: a package carrying a picture; the user's upload and reset (desktop forms, as today).
- **Out of scope:**
  - the flat run list (648; row structure unchanged);
  - producing portraits and putting them into official packages;
  - phone upload;
  - a picture for another node's (peer) run;
  - any release.
- **Preserved:**
  - the personal setting and its reset (no stored-data change);
  - the user's own definitions' config `avatarUrl`;
  - the fallbacks (initials for an agent, the team icon, the org icon);
  - every row's layout, opening and fold;
  - who may read a node's files (owner and phone, never a peer).

## Requirements

| ID | Requirement | Basis |
| --- | --- | --- |
| REQ-001 | An agent, team or org package can carry its picture: one file `avatar.png`, `avatar.jpg`/`avatar.jpeg` or `avatar.webp` in the definition's folder, beside `agent.md` / `team.md` / the org's file. At most 1 MiB; its bytes must be of its type; square recommended, 256 px or more. It works the same for packages from GitHub and from a local folder, at import and at every package update | Task; DEC-001 |
| REQ-002 | A missing file means no package picture. An invalid one (too large, not its type, more than one candidate, unreadable) is ignored: the node logs why once per read, and the fallback shows. Nothing fails to load because of a picture | Task; DEC-001 |
| REQ-003 | The order: the user's picture (the personal setting; for the user's own definitions, their config's `avatarUrl`), then the package's picture, then the fallback. The fallback is initials for an agent, the team icon for a team and the org icon for an org, also when a picture fails to load. Reset removes the user's picture and the package's shows again | Founder's rule; DEC-002 |
| REQ-004 | The picture shows on desktop and phone wherever the agent or team is shown. Desktop: Runs view rows, Workspaces tree rows (the Project Task Manager, its delegated task agents and task agent teams, team members), the chat assistant row, the workspace headers, cards and details. Phone: the run list's rows at every depth. A peer node's run shows the fallback | Task; DEC-006 |
| REQ-005 | Copies of one definition show one picture; the row's text tells them apart | Product team proposal; DEC-003 |
| REQ-006 | The phone gets a picture with the node's credential in a header, never in the address. A node that may not read it (a peer) cannot. One picture is read once per address per page session, not once per row | Task (autobyteus-574's way); DEC-004 |
| REQ-007 | The picture sits in the row's existing avatar slot (same size and place; round for agents and teams, the org's rounded square). The row's structure is unchanged | Task; DEC-005 |
| REQ-008 | The package guide and the docs describe the convention, the order and the fallback | Task |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | 001 | A package with `agents/<x>/avatar.png` (synthetic) imported from a local folder and from a GitHub-shaped clone: the agent's `avatarUrl` is the node's package-picture address; the picture shows. Replace the file and update the package: the address's version changes and the new picture shows. Same for a team and an org | Server specs (reader, route); probe |
| AC-002 | 002 | A 2 MiB `avatar.png`, a text file named `avatar.webp`, two candidates: each is ignored with one log line; the definition loads; the fallback shows | Server specs |
| AC-003 | 003 | Upload, then the user's picture shows; reset, then the package's; no package file, then the fallback; a broken address, then the fallback. Own definition: its config's upload wins over its folder file | Web and server specs; probe |
| AC-004 | 004, 005, 007 | Rendered desktop (1440×900, and the installed window) and phone (390×844), synthetic pictures, no realistic person: every listed surface shows the picture in its slot. Ten delegated copies show one picture each. A peer row shows the fallback | Probe screenshots and DOM checks |
| AC-005 | 006 | The phone requests the picture with `Authorization`, and the address holds no key. A peer credential gets 403 on the route. Twenty rows of one definition make one fetch | Probe (network log); server route spec |
| AC-006 | Preserved | The personal setting and its reset behave as before. The existing avatar specs, updated to the shared component, pass. No row's structure changes (row snapshot specs) | Suites |
| AC-007 | 008 | `agent_packages.md` and `agent_definition.md` (server docs) state the convention; the web docs state the order | Doc check |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | The package convention | A file in the definition's own folder travels with the folder through every import and update path, with nothing to configure. A URL in the config would make the app fetch arbitrary addresses (privacy, offline), and nothing uses it today. **`avatar.{png,jpg,jpeg,webp}`, one per folder, at most 1 MiB, type checked by its bytes; SVG and GIF excluded (script and animation).** Invalid means ignored, logged once and the fallback shown, so a picture never blocks loading | Solution Designer (Task: "define the convention") | Decided |
| DEC-002 | Where the package's picture sits in the order | The definition's base `avatarUrl` becomes its config's `avatarUrl` if set (the user's own definitions' upload), else the package file's address. The personal setting overlays the base as today, so the founder's order holds with no stored-data change | Solution Designer | Decided |
| DEC-003 | One picture per definition | The picture belongs to the definition; a copy is a run of it, and its Task line tells it apart. No evidence against the Product team's proposal | Solution Designer | Decided; user informed |
| DEC-004 | The phone's loading | The page's authorized fetch to an object URL (`useAuthorizedObjectUrl`'s way) through one shared cache keyed by the address: one read per picture and page session, revoked when no row uses it for a while or the session ends. The address's version makes a changed picture a new key | Solution Designer | Decided |
| DEC-005 | Size and shape | The rows already have avatar slots sized for their rows (phone 36 px top-level and 28 px nested; desktop rows' own). The picture fills the slot, `object-cover`: round for agents and teams, the org's rounded square. No new design question | Solution Designer | Decided |
| DEC-006 | Another node's run | Its definition is that node's; this node cannot vouch for or serve it, and fetching from the peer would cross the access model. **Fallback** | Solution Designer | Decided |
| DEC-007 | Orgs | Orgs already have `avatarUrl`, the personal setting and `AgentOrgAvatar`, and their folders are read the same way. Excluding them would make the one rule have an exception. **Included** | Solution Designer | Decided |
