# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record holds the initial baseline and each later implementation delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-004, ARCH-REV-002 | Implemented; implementation-scoped checks green; ready for code review |
| IR-002 | Code Reviewer, `code-review-report.md`, round 1 (Fail) | CR-001 | `Local Fix` | SR-004, ARCH-REV-002, CRR-001 | Gateway image copies only build inputs; proven with planted dummy files (IMP-20) |

## Revision Entries

### IR-001 — Fastify 5 server and gateway, gateway workspace and Docker, SheetJS 0.20.3 viewer

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/fastify5-and-spreadsheet-parser/design-review-report.md`, round 2 (`Pass`, ARCH-REV-002)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented in four commits on `codex/fastify5-and-spreadsheet-parser`: `195db3c42e` (viewer), `bbd88fd3ea` (server), `5c7ab7426c` (gateway), `29aeb5d721` (server test adaptation to Fastify 5's `listen()` return value)
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: first implementation of the approved SR-004 design
- Approved behavior or requirement IDs affected: BEH-001..BEH-007; REQ-001..REQ-013
- Implementation delta:
  - Viewer: SheetJS CE 0.20.3 tarball (integrity-pinned), `sheet_to_html(sheet, { header: '', footer: '' })` sanitised by DOMPurify with the design allowlist and `ALLOW_DATA_ATTR: false`; real-parser spec (jsdom); docs row.
  - Server: Fastify 5 / mercurius 16 / cors 11 / multipart 10 / websocket 11; `graphiql: true` removed; `{ config: { cors: false } }` removed from both MCP routes.
  - Gateway: Fastify 5 / cors 11 / baileys 6.7.24, `packageManager` pnpm@10.28.2, own `pnpm-workspace.yaml` (allowlist: baileys, protobufjs) and `pnpm-lock.yaml`, Dockerfile installs from those files only, README Install note and reconciled approve-builds note.
  - Test adaptation: `studio-agent-tools-listener.integration.test.ts` builds its wildcard-host URL from the bound address instead of `listen()`'s return value.
  - Two deviations from the design's literal examples, both behavior-preserving: the viewer spec runs under jsdom (happy-dom breaks DOMPurify, IMP-04); the gateway Dockerfile keeps `WORKDIR /app/autobyteus-message-gateway` (compose volumes and the default runtime data root depend on it). See the handoff.
- Changed files or areas: `autobyteus-web/{package.json, components/fileExplorer/viewers/ExcelViewer.vue, components/fileExplorer/viewers/__tests__/ExcelViewer.spec.ts, docs/content_rendering.md}`, `pnpm-lock.yaml`, `autobyteus-server-ts/{package.json, src/api/graphql/index.ts, src/agent-tools/mcp/agent-tools-mcp-routes.ts, src/mcp-gateway/mcp-gateway-routes.ts, tests/integration/application-backend/studio-agent-tools-listener.integration.test.ts}`, `autobyteus-message-gateway/{package.json, pnpm-workspace.yaml, pnpm-lock.yaml, docker/Dockerfile, README.md}`
- Local validation and result: see the handoff's Checks Run (IMP-01..IMP-19)
- Next recipient or routing: Code Reviewer (Medium + High route)
- Remaining limitations or risks: server E2E folder, packaged-app user journeys and full AC-007/AC-008/AC-014 acceptance left to API/E2E; RSK-001..RSK-003; standalone host `handle.url` reports `127.0.0.1` for a wildcard bind on Fastify 5

### IR-002 — Gateway image copies only build inputs (CR-001)

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/fastify5-and-spreadsheet-parser/code-review-report.md`, round 1 (CRR-001, `Fail`)
- Triggering finding IDs: CR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001. The gateway Dockerfile ran `COPY autobyteus-message-gateway/ ./`, so an operator's `docker/.env.docker` and the compose-mounted `memory/` (both inside the build context; the root `.dockerignore` excludes neither) were baked into the image (CRR-001 probe P1).
- Current authoritative result: commit `25a45ee5d3`. The Dockerfile copies only `LICENSE`, `tsconfig.json`, `tsconfig.build.json` and `src/` after the unchanged three-file frozen install. `WORKDIR /app/autobyteus-message-gateway` is kept. `tests/`, `tickets/`, `tools/`, `docker/`, `scripts/`, `memory/`, `README.md` and any `.env*` stay out of the image.
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: implementation-owned packaging fix requested by code review
- Approved behavior or requirement IDs affected: BEH-006, REQ-008, REQ-013 (no secrets in artifacts)
- Implementation delta: `autobyteus-message-gateway/docker/Dockerfile`: `COPY autobyteus-message-gateway/ ./` replaced by two explicit COPY lines, with a comment giving the reason. The gateway reads nothing else from its package folder at run time; its only file reads are its data roots (`src/infrastructure/**` stores).
- Changed files or areas: `autobyteus-message-gateway/docker/Dockerfile`
- Local validation and result: IMP-20. A clean clone of `25a45ee5d3` with dummy `docker/.env.docker`, `.env` and `memory/whatsapp-personal/dummy-session.json` was built. None of these files or their markers is in the image: a filesystem-wide `find` and a `grep` over `/app` both come back empty, and the layer history shows only the explicit COPYs. The container's `/health` returns 200, with fastify 5.12.7, cors 11.3.1 and baileys 6.7.24. Gateway source, lockfile and tests are unchanged, so IMP-10 still holds.
- Next recipient or routing: Code Reviewer (targeted delta review)
- Remaining limitations or risks: none new. The wechaty sidecar Dockerfile copies only `tools/wechaty-sidecar`, and its compose state mount sits under the gateway's `memory/`, outside that copy, so it is not affected.
