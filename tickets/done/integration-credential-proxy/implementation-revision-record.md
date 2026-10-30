# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, ARCH-REV-002 Pass, round 1 of implementation | N/A | `Initial Baseline` | SR-005, ARCH-REV-002 | Implemented; handed to code review |

## Revision Entries

### IR-001 — GitHub credential proxy, runtime delivery, GraphQL, card and docs

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md` (ARCH-REV-002 Pass), first implementation round.
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: the design (SR-005) implemented on `codex/integration-credential-proxy`, commits `84602c9a38`…`2529eaaec1` plus the ticket-artifact commit given in the handoff.
- Related solution revision IDs: SR-005 (requirements approved at SR-002; DEC-011 at SR-005).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline or implementation revision is recorded: the initial implementation handoff.
- Approved behavior or requirement IDs affected: REQ-001…REQ-012, AC-001…AC-008, DS-001…DS-005, DEC-001…DEC-011.
- Implementation delta:
  - vault consumer `integration` (`integration.github.token`);
  - `src/credential-proxy/` (definitions, connection store and service, run passes, run access, forwarder, routes, loopback server, activity log, host);
  - per-runtime delivery in the five backends and both release points;
  - studio wiring (the proxy listens before the HTTP server), explicit `null` on hosts without a proxy;
  - GraphQL for the GitHub connection;
  - the web card, store, codegen and en/zh-CN text;
  - docs (`credential_proxy.md`, `secret_management.md`, `GLOSSARY.md`, `docs/design-cases.md`, `TESTING.md`).
  - Additions beyond the design, each explained in the handoff: `502 UPSTREAM_UNREACHABLE` and `500 PROXY_FAILED`; Fastify `logger: false`; `buffersRequestBody` per route; the Codex tool-list reopen keeps the integration config; `TOKEN_REQUIRED` for an empty token; `deactivateMcp` renamed `releaseLocalSessions`.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: IMP-01…IMP-14 in the handoff (all Pass; pre-existing failures outside the ticket recorded as FU-002…FU-004). R-4 measured: Codex merges thread-level tables with the user's own (IMP-05).
- Next recipient or routing: code reviewer (Large/High).
- Remaining limitations or risks: R-1 same-user limit; Codex `read-only` runs can't reach the proxy (AR-008, documented); gh's own commands, git LFS and `uploads.github.com` unsupported (documented); the live check depends on the test token (expires 2026-11-25).
