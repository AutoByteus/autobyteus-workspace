# Implementation Plan

- Ticket: `linux-appimage-prisma-erofs`
- Scope: `Small`
- Plan Version: `v2`

## Solution Sketch (Design Basis for Small Scope)

- Keep migration flow in `src/startup/migrations.ts` with explicit engine overrides.
- Ensure Linux packaging explicitly bundles both Prisma OpenSSL engine targets by setting:
  - `PRISMA_CLI_BINARY_TARGETS=debian-openssl-1.1.x,debian-openssl-3.0.x`
  during packaged-server Prisma client generation in `prepare-server.sh`.

## Change Inventory

| Change ID | Type | File | Summary |
| --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/startup/migrations.ts` | Add engine resolution + env override injection for Prisma command execution. |
| C-002 | Add | `autobyteus-server-ts/tests/unit/startup/migrations-prisma-engine-env.test.ts` | Add unit tests for bundled/cached engine resolution behavior and env injection. |
| C-003 | Modify | `autobyteus-web/scripts/prepare-server.sh` | Force bundling of Linux OpenSSL 1.1 + 3.0 Prisma engines in packaged server. |

## Task Sequence

1. Verify real CI artifact engine contents.
2. Implement runtime engine override hardening.
3. Implement CI packaging target-bundling fix.
4. Validate via local extraction/repro checks and targeted tests.
