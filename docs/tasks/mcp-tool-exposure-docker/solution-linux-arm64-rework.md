# Solution Rework: Linux ARM64 Electron Packaging / Startup

## Trigger

Delivery rerouted the MCP/browser tool exposure ticket on 2026-06-18 after user verification required building and launching the Linux Electron app on the current Linux ARM64 host.

## Classification

- Classification: `Requirement Gap` with `Design Impact`.
- Root cause areas:
  - Linux Electron build target architecture invariant was missing.
  - Linux artifact naming hid architecture.
  - Packaged server Prisma engine selection used platform-only Linux preferences and selected x64 Debian engines on ARM64.

## Decision

Include Linux ARM64 Electron build/startup support in this ticket because it blocks user verification, and include GitHub desktop release workflow support because the user explicitly asked for the pipeline to support the same architecture. Linux release must publish both x64 and ARM64 artifacts/metadata through separate native jobs.

## Artifact Updates

Updated:

- `requirements.md`: added UC-008 through UC-012, REQ-016 through REQ-026, AC-014 through AC-023, including GitHub Linux ARM64 release workflow support.
- `investigation-notes.md`: added delivery reroute investigation, GitHub workflow/updater metadata investigation, exact commands/sources, root cause, and design implications.
- `design-spec.md`: added DS-005/DS-006/DS-007 spines and detailed architecture-aware Linux packaging/startup plus release workflow design.

## Target Design Summary

- `pnpm -C autobyteus-web build:electron:linux` becomes host-architecture aware on Linux.
- Explicit Linux x64/ARM64 commands or flags are available.
- Unsupported Linux cross-architecture builds fail before emitting misleading artifacts unless full target-aware native packaging is implemented.
- Linux AppImage artifact names include architecture: `linux-x64` or `linux-arm64`.
- `.github/workflows/release-desktop.yml` adds explicit native Linux x64 and ARM64 jobs.
- x64 release metadata stays `latest-linux.yml`; ARM64 release metadata is `latest-linux-arm64.yml`.
- `prepare-server` validation and server startup Prisma migration engine selection become architecture-aware.
- Linux x64/ARM64 CI validation and local ARM64 packaged/unpacked startup validation must prove Prisma migrations and embedded server health, not only artifact/window creation.

## Evidence Files

- Delivery reroute: `docs/tasks/mcp-tool-exposure-docker/delivery-linux-arm64-reroute.md`
- Runtime failure log: `docs/tasks/mcp-tool-exposure-docker/validation-artifacts/linux-electron-app-run.log`
