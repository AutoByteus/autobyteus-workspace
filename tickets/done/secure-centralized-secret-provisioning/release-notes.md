# Secure Centralized Secret Provisioning — Finalized Change Notes

> **Finalized source change; not a release.** The user authorized finalization
> on 2026-07-28 and explicitly requested no new version or release. No version
> bump, tag, publication, deployment, notarization, or installed-app replacement
> was performed.

## Final Identity

- Archived ticket:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/secure-centralized-secret-provisioning`
- Ticket archive commit:
  `3a20ed08cbfbcef1395882e3a70339df6442cf9f`
- Main `personal` merge commit and Electron build source:
  `6313a3c6c3f33ef1c21d24d4c247ffb2ab8e96e1`
- Source review: Round 47 `Pass`, 9.69/10.
- API/E2E: Round 22 `Pass`, 98.7%, no critical gap.
- Proportional durable-test gate: Round 12 `Not Applicable`, no unresolved
  finding.

## Final Behavior

The finalized change centralizes supported credentials in an encrypted local
vault and resolves them by subject/provider at the point of use without
returning secret values through metadata/read surfaces. It preserves one
application database plus adjacent key as a single backup/restore unit, keeps
explicit import targets and immutable sources, and performs no automatic `.env`
credential migration.

The final Gemini settings experience presents exactly three compact connection
options; Configure expands and focuses one editor; credential entry remains
masked and write-only with a transient visibility control; Save-and-use selects
the mode; successful save clears the input; value-free Configured/Active state
survives reload; and no standalone Gemini credential-removal action exists.
The actual `open_tab` browser validated this journey.

Ordinary providers retain save/overwrite without standalone removal. Existing
custom-provider Delete remains entity lifecycle and removes the linked
credential through targeted synchronization.

## Preserved Boundaries

- Claude: exact `auto|cli|api-key`, default `cli`; only explicit `api-key`
  resolves the Anthropic vault slot.
- `LOCAL_HARDENED`: local vault/file-root/value-safe custody only; Codex is
  excluded.
- Inherited child environments are continuity, not process isolation;
  `STRONG_AGENT_ISOLATION` remains deferred.
- Exact unpatched `repository_prisma@1.0.8` with Prisma `5.22.0`.
- Docker topology unchanged.
- `DASHSCOPE_API_KEY` only for Qwen.
- Gemini AI Studio and Serper remain unconfigured; AutoByteus remote discovery
  remains unavailable and is not claimed as passed.
- The Anthropic official-source recheck is not legal clearance.

## Local macOS arm64 Build

A clean unsigned Electron build was produced from the finalized main
`personal` merge commit:

- App:
  `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG:
  `autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.26.dmg`
- ZIP:
  `autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.26.zip`
- Packaged `app.asar` SHA-256:
  `11393e9de16b3a6843a0f5ee32e86c0d58f75823de41ae8fb08b8def79744cc3`
- DMG SHA-256:
  `d5c1883618de5df40388d9023911d60e6b9081a0d491e8b0812597efa9700f00`
- ZIP SHA-256:
  `aa9ff94c80a754838690dec1488facb24f9829ebce76c1e92fc909ea1726dfe0`

Frozen install, build completion, DMG verification, ZIP integrity, packaged
server/renderer presence, and identical payload hashes passed. Signing was
explicitly disabled. The main candidate was not launched because the user's
installed application already owned fixed backend port `29695`; that installed
process was preserved. The earlier clean unsigned worktree candidate had passed
the real nonblank GUI launch before the user finalized the task.
