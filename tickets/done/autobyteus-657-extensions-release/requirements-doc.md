# Requirements — autobyteus-657: make the extensions catalog real (key, repository, first releases), then lift the release hold

- Status: `Approved` (within the founder's direction: "You know the best, I trust you, let's go", 2026-11-26, read by the PM; each public action still needs his word at its step).
- Solution revision: SR-001.
- Package: `autobyteus-657-extensions-release`; Task autobyteus-657, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`; requested by `/project_task_manager` for the founder.
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-657-extensions-release`, branch `codex/autobyteus-657-extensions-release`, base `origin/personal` @ b86817915a; finalization target `origin/personal`. Second repository: `/Users/normy/autobyteus_org/autobyteus-extensions` (main @ 4d00904, no remote).

## Problem

Stage 1 of autobyteus-516 is merged but cannot be released: the app's built-in catalog public key is empty (`autobyteus-server-ts/src/extensions/catalog/extension-catalog-source.ts:25`), and the repository `AutoByteus/autobyteus-extensions` does not exist. Until both exist and the catalog lists Voice Input, an app built from `personal` deletes the old Voice Input install at first start with nothing to install (RELEASE.md "Extensions catalog check" holds every release).

## Requirements

| ID | Requirement | Acceptance |
| --- | --- | --- |
| R-1 | The founder creates the Ed25519 key pair himself on his Mac; the private half exists only as the secret `EXTENSIONS_CATALOG_SIGNING_KEY` of `AutoByteus/autobyteus-extensions` and his password-manager backup; it never appears in chat, a log, a file in a repository, or an agent's hands | The founder's script output shows no key; `gh secret list` lists the secret; no private key file is tracked |
| R-2 | `AutoByteus/autobyteus-extensions` exists, **public** (nodes download the catalog and packages from its releases without a GitHub login; a private repository's release assets need an authenticated request, which nodes cannot make), with the local main and `catalog-public-key.pem` pushed | `gh repo view` → PUBLIC; remote main = local main |
| R-3 | The app carries the same public key (`EXTENSIONS_CATALOG_PUBLIC_KEY_PEM` = `catalog-public-key.pem`), as a normal tested change merged into `personal` | Equality check; server tests pass |
| R-4 | `voice-input` 1.0.0 is released (tag `voice-input-v1.0.0`, pinned to voice runtime 0.3.2), then the catalog lists it and is released (fixed release `catalog`) — each on the founder's word | `gh release view catalog` shows `extensions-catalog.json`, `.sig`; the catalog lists voice-input with the package's SHA-256 |
| R-5 | The whole chain is proven on an isolated app instance (never the founder's `~/.autobyteus`): the built app with the real key fetches the real catalog (verified), installs Voice Input, dictates | Evidence in this ticket |
| R-6 | RELEASE.md's Extensions catalog check passes; the PM then lifts the hold; the app's own release stays a separate Task on the founder's word | Check evidence reported to the PM |

Out of scope: the app's beta/stable release itself; other extensions; payments.

## Decisions

| ID | Decision | Owner |
| --- | --- | --- |
| D-1 | Public repository (R-2 reason; DEC-018 of autobyteus-516) | Solution Designer, recommended to the founder |
| D-2 | The founder runs one script (`founder-setup-extensions-repository.sh`) that creates the repository, the key pair (Node `crypto`, Ed25519, PKCS#8 / SPKI PEM, the format `sign-catalog.mjs` and the server read), the secret, a backup, deletes the loose file, commits the public key and pushes, with self-checks; it asks before every change | Solution Designer |
| D-3 | Push address: the same SSH host alias the workspace repository uses (`git@github.com-ryan:…`), derived from its origin | Solution Designer |
| D-4 | Repository visibility: **public** (a private repository's release files cannot be downloaded by nodes without a GitHub login) | Founder delegated ("You decide I trust your reasonable decisions", 2026-11-26) → Solution Designer |
| D-5 | RELEASE.md wording, replacing "The founder creates the key pair himself; it is never generated, printed or committed by an agent": "The key pair is created on the founder's Mac by the setup script he approved, run on his word, possibly by an agent. The script writes the private key straight into a protected local file and into the repository secret `EXTENSIONS_CATALOG_SIGNING_KEY`, and never prints it. No agent opens, reads, copies or commits it. The private key exists only as that secret and in the founder's own backup; he deletes the local file once it is backed up." Applied in the Phase 3 change on `personal` | Founder delegated (same message) → Solution Designer |
| D-6 | The founder's run is done by the local Computer Use Operator (founder via the PM, 2026-11-26), delegated by the Solution Designer with the script; the operator never opens the private key file | Founder |

