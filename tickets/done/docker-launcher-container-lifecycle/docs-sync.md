# Docs Sync: Docker launcher lifecycle commands

Status: Pass

## Updated documentation

- `README.md`
  - Replaced `autobyteus-docker start` with `autobyteus-docker new-container`.
  - Documented indexed container naming from `autobyteus-server-0` upward.
  - Added `upgrade --all`, `destroy --all`, and `reset` examples.

## Script help text

- Bash help updated.
- PowerShell help updated.
- Installer next-command guidance updated for both launchers.

## No-impact docs areas

- Developer/source-helper Docker docs were not changed because this task targets the public launcher scripts.

## Refinement docs sync: install-only launcher replacement command

- Bash help now documents only `install` for local launcher install/replacement.
- PowerShell help now documents only `install` for local launcher install/replacement.
- Ticket handoff and release notes updated to state that the `update` alias was removed.
