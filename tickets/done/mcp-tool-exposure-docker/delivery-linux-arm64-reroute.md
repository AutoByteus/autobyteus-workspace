# Delivery Reroute: Linux ARM64 Electron package support

## Trigger

During delivery user verification setup on 2026-06-18, the user asked delivery to read the README, build Electron for Linux on the current Linux host, and start the Linux app for manual testing.

## Finding

The normal Linux Electron build script currently targets Linux x64 only:

- Package script: `pnpm -C autobyteus-web build:electron:linux`
- Build target owner: `autobyteus-web/build/scripts/build.ts`
- Current behavior: `resolvePlatformTargets('LINUX', ...)` returns `Platform.LINUX -> Arch.x64 -> AppImage`.

Delivery ran the normal script successfully, but it produced an x86_64 artifact on this aarch64 host:

- Produced artifact: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/autobyteus-web/electron-dist/AutoByteus_enterprise_linux-1.3.60.AppImage`
- File result: `ELF 64-bit LSB executable, x86-64`

Because the current host is Linux aarch64, this official artifact is not directly usable for user testing on the current machine.

## Temporary Probe

Delivery manually invoked electron-builder for Linux arm64 outside the official package script to determine whether an ARM64 package is close:

- Produced artifact: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/autobyteus-web/electron-dist/AutoByteus_enterprise_linux-arm64-1.3.60.AppImage`
- Produced unpacked app: `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/autobyteus-web/electron-dist/linux-arm64-unpacked/AutoByteus`
- File result: `ELF 64-bit LSB executable, ARM aarch64`

The manually built ARM64 unpacked app launched, created a window, started the Browser bridge, and attempted to start the embedded server on `127.0.0.1:29695`, but the embedded server failed during Prisma migration:

```text
Error: Could not parse schema engine response: SyntaxError: Unexpected end of JSON input
Error running database migrations: Command failed: ... AutoByteus .../resources/server/node_modules/prisma/build/index.js migrate deploy --schema .../resources/server/prisma/schema.prisma
Server process exited with code 1
```

The attempted app process was stopped after this finding. Runtime log:

- `/home/autobyteus/workspace/.codex/worktrees/mcp-tool-exposure-docker/docs/tasks/mcp-tool-exposure-docker/validation-artifacts/linux-electron-app-run.log`

## Classification

- Classification: `Requirement Gap` with likely `Design Impact` in packaging/release workflow.
- Recommended recipient: `solution_designer`.

## Why Delivery Cannot Finalize Truthfully

The ticket was ready for browser/MCP delivery, but user verification now depends on a Linux build that runs on the current Linux ARM64 host. The reviewed requirements/design did not include Linux ARM64 Electron packaging support. The official build path emits Linux x64 only, and an ad-hoc ARM64 build is not enough because startup currently fails the embedded server migration path.

## Requested Upstream Work

Please update the requirements/design for this ticket to include Linux ARM64 Electron package support if it is in scope, then route through architecture/implementation/code/API-E2E as needed. The design should address at least:

1. Official package script/API for building Linux ARM64 on an ARM64 Linux host, or a documented `--arm64`/host-arch behavior.
2. Artifact naming for Linux x64 vs ARM64 so outputs do not imply one generic Linux architecture.
3. Embedded server startup validation for Linux ARM64 packaged/unpacked app, including Prisma engine/migration behavior.
4. Whether release workflows should include Linux ARM64 artifacts and validation, or whether this is local developer/test-only support.
5. Documentation updates for Linux build/test instructions.

## Current Delivery State

Delivery is blocked from user-verification handoff/finalization until this scope is clarified and implemented or explicitly deferred by the user.
