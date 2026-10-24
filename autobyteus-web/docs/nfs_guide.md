# NFS Guide: copy-only standalone CLI instructions

Nodes → NFS Guide documents the independent
[AutoByteus NFS tool](https://github.com/AutoByteus/autobyteus-nfs/releases/tag/v0.1.0).
The app only displays text, opens documentation links and writes selected text to
the clipboard. It never installs software, runs a command, detects a mount or
admits a workspace by NFS identity. AutoByteus uses ordinary filesystem APIs.

## Install, then choose a role

The macOS/Linux install commands download the pinned v0.1.0 script to an empty
host working directory, verify its SHA-256, then invoke it with `version`. Review
the script at the URL shown in the command first. This installs the CLI and prints its version, **without storage
setup**. Download or checksum failure stops the chain before invoking the script.
The installer also checks its downloaded archive/manifest. Checksums do not
replace publisher trust, signing or OS security checks. curl, a shell and the
shown checksum utility are required; a compiler or Homebrew is not.

After installation, the guide supplies these seven public commands, each with
one Copy button and the explicit `~/.local/bin/autobyteus-nfs` path:

| Arguments | Purpose |
| --- | --- |
| none | Interactive setup / saved-state options |
| `create` | Once on the storage host; choose a source folder and trusted addresses |
| `connect` | Other hosts; use the printed connection JSON |
| `status` | Actual readiness; storage/network checks can wait |
| `reconnect` | Resume saved/pending setup with consent, not data recovery |
| `detach` | Drain mount users and approve removal; preserve source/private data |
| `version` | Print installed version, without configuring storage |

Non-version commands can require administrator approval. Advanced flags belong
to the [public CLI documentation](https://github.com/AutoByteus/autobyteus-nfs/blob/v0.1.0/README.md),
not an app-side execution API. The guide excludes internal service commands.

## Availability and limits

Downloads exist for ARM64/x64 macOS and Linux. Intended hosts are macOS 26+ APFS
and Ubuntu 24.04 ext4 (native or Linux Docker storage). Windows and Mac Docker
storage hosting are excluded. Physical-host/shared-filesystem/independent-client
and user testing remains deferred; download availability is not host readiness.
Use a trusted private network: NFS is unencrypted and trusts allowed computers,
not individual users. Outages may stall filesystem work; there is no offline
copy or local fallback. Generic Docker directory binds are configured separately.

## Maintaining the guide

`utils/nfsLauncherCommands.ts` owns the static release descriptor and pure command
strings. To deliberately update it, verify the actual public release, installer
bytes and published SHA256SUMS; update tag, URLs, `installerSha256` and
`availableComputers` together. Do not substitute build fixtures, `latest`, or a
field-qualified label. Keep checksum verification and the trailing `version`.
Standalone installer/release links are not shown; use the URL in the command to
review the script. Invalid/null descriptors suppress the version notice and
disable affected install buttons; the installed-tool reference remains explicitly prerequisite.

`NfsGuideCard.vue` owns one promise-based clipboard lifecycle for all nine buttons:
pending exclusion, success only after fulfillment, a two-second reset, manual
selection on failure and unmount cleanup. Both locale catalogs own the prose.
Focused tests exercise the shell chain only with inert command stubs—never run
the public installer as a frontend test. Render desktop/narrow layouts and both
locales; keep long code scrollable within cards. The Docker guide is independent.
