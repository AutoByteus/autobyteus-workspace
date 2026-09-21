# DR-001 Electron candidate build evidence

Recorded: 2026-09-21 (Europe/Berlin)

## Integrated source

- Worktree:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions`
- Branch: `codex/org-history-archive-delete-actions`
- Latest fetched base:
  `origin/personal@8db5101f413a88216b90d55ec563e3b5f80b1c9b`
- Reviewed-package checkpoint:
  `d27ad524591639219a9083813c2a21b7b19b5d4a`
- Relation: base is the checkpoint's direct parent; no base-only commit existed.
- IR-002 manifest recheck: 26/26 files matched path, byte count, and SHA-256.

## Build

Working directory: `autobyteus-web`.

```sh
NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* \
  DEBUG=app-builder-lib* DEBUG=builder-util* pnpm build:electron:mac
```

Result: exit 0. The command completed web/localization guards, literal audit,
shared/server builds, Prisma generation, sanitized built-in bootstrap smoke,
mobile and Electron renderer generation, Electron/main/build transpilation,
native module rebuild, server deployment, and macOS arm64 packaging.

Non-blocking build output retained the existing browsers-list age, large-chunk,
peer-dependency, and electron-builder unresolved optional/cross-platform package
warnings. Packaging completed normally.

## Artifacts

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.71.dmg` | 467,950,864 | `644337aba1ab0f055a3a875d0db0bade97f73e9d891f5dbaf8375d8035b665b9` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.71.zip` | 462,753,602 | `f53cdd3b28f0e748b84796cc57e1a5008c8d5e8bf8bf1b699538e10fcdb88559` |

Unpacked app:
`/Users/normy/autobyteus_org/autobyteus-worktrees/org-history-archive-delete-actions/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`.

- `hdiutil verify`: checksum valid.
- `unzip -tq`: no errors.
- Main executable: Mach-O 64-bit arm64.
- Signature: ad-hoc/linker-signed; no Team ID.
- Developer-ID signing, notarization, installation, publication and release were
  not performed.

## Generated-state handling

Dependency install and build products are ignored local prerequisites. The two
application SDK `dist/` directories absent at intake were removed after
packaging. The three shared-contract `dist/` directories present at intake were
preserved. The packaged Electron artifacts remain intentionally available for
user verification. Tracked repository status was clean before Delivery docs
were authored.

