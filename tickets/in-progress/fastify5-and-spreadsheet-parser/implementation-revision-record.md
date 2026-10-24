# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record holds the initial baseline and each later implementation delta.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md`, round 2 (Pass) | N/A | `Initial Baseline` | SR-004, ARCH-REV-002 | Implemented; implementation-scoped checks green; ready for code review |

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
