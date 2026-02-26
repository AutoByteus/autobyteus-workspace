# Investigation Notes

- Date: 2026-02-26
- Ticket: `linux-appimage-prisma-erofs`

## Sources Consulted

- User-provided runtime logs from Linux CI AppImage startup failure.
- `autobyteus-server-ts/src/startup/migrations.ts`
- `autobyteus-web/electron/server/linuxServerManager.ts`
- `autobyteus-web/electron/server/serverRuntimeEnv.ts`
- `autobyteus-web/scripts/prepare-server.sh`
- `autobyteus-web/.github/workflows/desktop-tag-build.yml`
- `/.github/workflows/release-desktop.yml`
- GitHub Actions run `22437611045` (branch `v1.1.9`) artifacts.

## Reproduction Evidence

1. Read-only packaged server with bundled Prisma engines present:
   - Command: `/tmp/ab-server-ro/node_modules/.bin/prisma migrate deploy --schema /tmp/ab-server-ro/prisma/schema.prisma`
   - Result: success.
2. Read-only packaged server with bundled Prisma engines removed:
   - Command: `/tmp/ab-server-ro-missing/node_modules/.bin/prisma migrate deploy --schema /tmp/ab-server-ro-missing/prisma/schema.prisma`
   - Result: failure with copy attempt into read-only mounted path.
3. Same missing-engine scenario with explicit engine env overrides from cache:
   - Env: `PRISMA_QUERY_ENGINE_LIBRARY`, `PRISMA_SCHEMA_ENGINE_BINARY` set to `~/.cache/prisma/master/*/debian-openssl-3.0.x/*`
   - Result: success.

## CI Artifact Verification (Actual v1.1.9 Artifact)

- Downloaded workflow artifact `linux-x64` from run `22437611045`.
- Extracted AppImage: `/tmp/ab-ci-artifact-inspect/AutoByteus_personal_linux-1.1.9.AppImage`.
- Bundled Prisma engines in artifact:
  - present: `libquery_engine-debian-openssl-1.1.x.so.node`, `schema-engine-debian-openssl-1.1.x`
  - missing: `debian-openssl-3.0.x` variants.
- User runtime log expects `debian-openssl-3.0.x`, leading Prisma CLI to copy from cache into mounted package path and fail with `EROFS`.

## Key Findings

- Failure mechanism is not "no Prisma engines at all"; it is target mismatch in bundled engine variants.
- CI AppImage bundled only `1.1.x` engines.
- User environment requires `3.0.x` engine target.
- `PRISMA_CLI_BINARY_TARGETS='debian-openssl-1.1.x,debian-openssl-3.0.x' prisma generate` in packaged server directory successfully adds both targets to `@prisma/engines`.

## Constraints

- AppImage mount is read-only by design.
- Migration path must continue to support sqlite startup behavior.
- Fix should be robust for end users without pre-populated Prisma cache.

## Implications For Design

- Runtime fallback fix remains valid and should stay.
- Packaging must also guarantee both Linux OpenSSL engine variants are bundled in CI artifact.
