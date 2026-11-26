# Investigation Notes — autobyteus-657

- Bootstrap: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-657-extensions-release`, branch `codex/autobyteus-657-extensions-release` from `origin/personal` @ b86817915a (fetched 2026-11-26).
- Authorities: autobyteus-516 record (`tickets/done/autobyteus-516-extensions/`), RELEASE.md "Extensions catalog check" and "AutoByteus Extensions", the local repository's README and workflows.

## Facts (2026-11-26)

| Source | Finding |
| --- | --- |
| `autobyteus-server-ts/src/extensions/catalog/extension-catalog-source.ts:25` | `EXTENSIONS_CATALOG_PUBLIC_KEY_PEM = ""`; overrides `AUTOBYTEUS_EXTENSIONS_CATALOG_URL/_PUBLIC_KEY` (`:27-30`) |
| `/Users/normy/autobyteus_org/autobyteus-extensions` | main @ 4d00904, clean, no remote; `catalog.json` = `{ "extensions": [] }`; no `catalog-public-key.pem`; `dist/` ignored |
| `.github/workflows/release-catalog.yml` | manual; `npm test`, `check-catalog.mjs`, `sign-catalog.mjs` with the secret (fails if the secret does not match `catalog-public-key.pem`), replaces the assets of release `catalog` (`--latest=false`) |
| `.github/workflows/release-extension.yml` | on tag `*-v<x.y.z>`: test, pack, release `<id>-<version>.tar.gz` + `.sha256` (`--latest=false`) |
| `scripts/sign-catalog.mjs` | key from env only; Ed25519 check; base64 signature |
| `gh auth status` | signed in as `ryan-zheng-teki`, scopes repo, workflow, read:org; git protocol https |
| `gh repo view AutoByteus/autobyteus-extensions` | does not exist |
| workspace origin | `git@github.com-ryan:AutoByteus/autobyteus-workspace.git` (SSH host alias used for pushes) |
| tools | Node v22.23.1; LibreSSL 3.3.6 (not used: Node generates the key) |
| GitHub | release assets of a private repository need an authenticated API request; nodes hold no GitHub token → the repository must be public |

## Script validation (2026-11-26)

`founder-setup-extensions-repository.sh` was run by the Solution Designer only against a throwaway clone with a stub `gh`, a local bare repository as the push target (`url.insteadOf`) and a stub clipboard; nothing real was created; the scratch folder was deleted.
- Full run: exit 0; no "PRIVATE KEY" text in the output; the secret the stub received signs data that the pushed `catalog-public-key.pem` verifies; clipboard cleared; no private key file left in the repository or the temporary folder.
- Stop at step 4, then rerun: the stopped run deleted the private key; the rerun removed the leftover untracked public key, reused the empty public repository, made a new pair and finished; no secret printed.

## Revision for an agent-run setup (2026-11-26, founder via the PM: the Computer Use Operator runs it; our team owns the whole path)

- Script rewritten for an unattended run: `--visibility public` (only public works; private refused with the reason), no prompts. The private key is written by Node straight to `~/autobyteus-catalog-signing-key/catalog-signing-key.pem` (folder 700, file 600, outside every repository). It is never on a command line, in the environment of a printed command, or in the output. It stays there until the founder backs it up and deletes it.
- The secret is set by `gh secret set … < file`.
- Proof that the secret matches the public key: the new workflow `check-signing-key.yml` signs with the secret on GitHub and verifies with `catalog-public-key.pem`, publishing nothing. The script starts it and waits for success.
- Stub validation (scratch folder, deleted afterwards):
  - a fresh run exits 0;
  - a rerun after a stop, and a rerun after done, both reuse what exists;
  - `--visibility private` is refused;
  - a wrong secret makes the simulated GitHub check fail;
  - "PRIVATE KEY" never appears in the output;
  - folder and file modes are 700 and 600;
  - only `catalog-public-key.pem` and the workflow reach the pushed repository.
