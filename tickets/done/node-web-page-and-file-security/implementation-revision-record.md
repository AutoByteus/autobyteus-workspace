# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, round 2 (ARCH-REV-002 Pass) | N/A | `Initial Baseline` | SR-001, SR-003, ARCH-REV-002; CRR/API-REV/DR `N/A` | Implemented D1–D9; implementation-scoped checks pass; ready for code review |

## Revision Entries

### IR-001 — Host gate, localhost-origin removal, user-file reply owner, `file://` page policy, launcher origins

- Triggering role, report path, and round: architecture reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security/tickets/in-progress/node-web-page-and-file-security/design-review-report.md`, round 2 (ARCH-REV-002, `Pass`).
- Triggering finding IDs: N/A (baseline). Residual recommendations applied: R-3, R-4, R-5 (adopted in the design's Guidance); R-7 respected (rule not widened); R-8 respected (control rows kept in the main-process test).
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation complete on `codex/node-web-page-and-file-security` @ `da207045a5` (source); implementation-scoped checks in `implementation-handoff.md` § Checks Run.
- Related solution revision IDs: SR-001 (requirements), SR-003 (design)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation of the approved design.
- Approved behavior or requirement IDs affected: BEH-001…BEH-010; REQ-001…REQ-010.
- Implementation delta: design steps 1–8 as written (see the handoff's behavior trace), plus three implementation-level details found while building, each within the design's decisions:
  1. The `@fastify/websocket` plugin is registered before the Host gate. The plugin destroys a refused upgrade's socket only when its own `onRequest` hook marked the request; with the gate first, every Host-refused upgrade left its socket open (measured: 8 open server sockets after 8 refused upgrades; `fastify.close()` hung). The plugin's hook only sets that mark, so the gate still runs before the MCP hook, CORS and the origin/auth hook (D1 holds).
  2. `isFileDocumentRequest` reads the requesting frame's origin through a guard that treats a disposed frame (Electron throws on access) as no frame, so the listener always answers; rule (c) then applies.
  3. The reproduction probe gained the Guidance's configured-origin row (R2d) and prints the refusal code.
- Changed files or areas: server `src/api/security` (5 new files, 2 changed), `src/api/rest` (`user-file-reply.ts` new, 7 route files), `src/mcp-gateway` (3), `src/agent-tools/mcp/agent-tools-mcp-local-access.ts`, `src/remote-access` (models, close codes, pairing service), `src/compositions/build-studio-server.ts`; Electron `electron/browser` (rule file new, session profile), `electron/server` (launch config, env composer, manager), `electron/application/electronApplication.ts`; `scripts/development/development-runtime.mjs`; 40 browser probes; tests; docs and GLOSSARY.
- Local validation and result: see `implementation-handoff.md` § Checks Run (IMP-01…IMP-14).
- Next recipient or routing: `/software_engineering_team/code_reviewer` (Large / High).
- Remaining limitations or risks: AC-004 `/mobile` page load, AC-008…AC-011 and AC-013 need a browser probe or the isolated desktop instance (API/E2E); see the handoff's Known Risks.
