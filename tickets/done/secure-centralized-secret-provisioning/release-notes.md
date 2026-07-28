# Secure Centralized Secret Provisioning — Finalized Change Notes

> **Finalized source change; not a released build.** The user verified the clean
> Round 22 candidate and authorized repository finalization on 2026-07-28, while
> explicitly requesting no new version or release. No version bump, tag,
> publication, deployment, or release is part of this finalization.

> **Corrected local package:** the manually ad-hoc-signed package opened a blank
> window and is withdrawn (`383`). The active artifact paths now contain a
> clean no-sign rebuild. A real launch proves a persistent renderer, healthy
> backend, zero new renderer crash report, and nonblank full UI (`384`–`386`).

## Candidate Identity

- Ticket worktree:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/secure-centralized-secret-provisioning`
- Branch: `codex/secure-centralized-secret-provisioning`
- Final reviewed/executed product HEAD:
  `49c27b2fe3aeb8b8299759c6ae64f7ffddc09254`
- Reviewed-package delivery checkpoint:
  `57863a7005d13a0f5b68fa330b7f9c3ce5ce1dd7`
- Exact source HEAD used for this fresh package, including synchronized durable
  docs: `dae24b9c67b29c52454dd163d5a53c9478cbe308`
- Tracked base checked:
  `origin/personal@d6983612c5a77fb94d9266df85a9d03fe2d1c68b`
- Integration status at build source: ahead 59, behind 0; merge-base equals the
  tracked base.
- Source review: Round 47 `Pass`, 9.69/10, no open finding.
- API/E2E: Round 22 `Pass`, 98.7% confidence; no category below 90% and no
  critical gap.
- Proportional durable-test gate: Round 12 `Not Applicable`; zero API/E2E-owned
  durable test/support changes and no unresolved finding.

## Round 22 Gemini Settings Presentation

The actual `open_tab` browser proved the current renderer against an isolated
supported backend/frontend stack:

- exactly three compact Gemini option rows initially;
- no editor or credential input in the compact initial state;
- Configure expands and focuses exactly one editor;
- key entry is password-masked with a transient visibility control;
- Save-and-use persists through the centralized vault and selects the mode;
- successful save clears the write-only input;
- value-free Configured and Active state survives reload; and
- no standalone Gemini credential-removal action exists.

The underlying command contract remains Save/create-or-overwrite, first-time
Save-and-use, and Use-this-mode. The Round 22 presentation delta does not change
backend/core/harness/Docker/package/lock authority; retained Round 21 provider,
migration, Docker, terminal, external Codex/Claude, and repository-Prisma
evidence remains applicable as recorded in evidence `367`.

## Preserved Narrow Scope

- one application database plus its adjacent key;
- local vault/file-root/value-safe custody;
- point-of-use subject/provider consumer resolution;
- no secret values in metadata, reads, logs, or evidence;
- ordinary provider and Gemini save/overwrite only;
- existing custom-provider Delete remains entity lifecycle and removes its
  linked credential through targeted provider/catalog synchronization;
- explicit importer target authority and source immutability;
- no automatic `.env` credential import or update;
- `DASHSCOPE_API_KEY` is the sole Qwen mapping;
- exact unpatched `repository_prisma@1.0.8` with Prisma `5.22.0`;
- unchanged Docker service topology.

Claude remains exactly `auto|cli|api-key`, default `cli`; only explicit
`api-key` resolves `agentRuntime/claude_agent_sdk/apiKey`. Inherited Electron,
terminal, Claude, and Codex environments are continuity rather than isolation.
`LOCAL_HARDENED` covers local vault/file-root/value-safe custody, Codex is
excluded, and `STRONG_AGENT_ISOLATION` remains deferred.

## Fresh macOS arm64 Artifacts

- App:
  `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG:
  `autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.26.dmg`
- ZIP:
  `autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.26.zip`
- Packaged `app.asar` SHA-256:
  `6e5ceff4c60e15f24d6913a3858f38bb797c79f09dd2a637b838d43b4e07204c`
- DMG SHA-256:
  `d15b24cf426af07597b7e538077b06e234a649a0eada1180754fe480f3d2b36b`
- ZIP SHA-256:
  `ad11a1d69be56e73595866331713ab14747823e7ac11cdb3a66f5ba72cb32baa`

Build `1.4.26` was rebuilt from a completely clean `electron-dist` using the
documented no-sign command. No manual signing followed. DMG and ZIP integrity
pass. A real launch of the exact worktree app proves the main process, backend,
persistent renderer, healthy endpoint, zero new renderer crash report, and a
visibly rendered full application window. This remains an unsigned local
verification candidate, not a Developer ID signed/notarized distributable
release.

## Truthful Limitations

- Gemini AI Studio and Serper remain unconfigured in canonical provider
  execution and are truthful skips.
- AutoByteus remote discovery remains unavailable under its exact codes and is
  not claimed as passed.
- Inherited child environments are continuity, not strong isolation.
- The official Anthropic authentication review is a delivery/release risk
  recheck, not legal clearance.
- Delivery did not attach to, inspect, stop, or replace the user's installed
  AutoByteus application or retained project test DB/key/config.
- Explicit user verification was received for this exact clean Round 22
  candidate. A later release, if ever requested, requires its own current
  signing/notarization and release checks.
