# API/E2E Revision Record

## API-REV-001

- Trigger: initial reviewed implementation.
- Result: Pass.
- Scope: migration recovery, packaging boundary, canonical build, packaged lifecycle, isolated AppImage.

## API-REV-002

- Trigger: first API/E2E re-entry findings.
- Result: Pass after durable coverage corrections.
- Scope: malformed V1 classification/preservation and server-owned fixtures.

## API-REV-003

- Trigger: `UV-001` released communication-address data.
- Upstream: design/runtime v6, `IR-002`, `CRR-005`.
- Result: Pass / 98.3%.
- Evidence: 58 migration tests, 25 fixture-consumer tests, 26 web tests, canonical AppImage, packaged lifecycle, isolated launch.
- Superseded by: `API-REV-004` after `UV-002` exposed incomplete Team history projection.

## API-REV-004

- Date: 2026-08-16.
- Trigger: `UV-002` showed five validated superrepo V1 Team packages absent from the Team history index and therefore from GraphQL/sidebar history.
- Upstream: requirements through `AC-MIG-020`; design/runtime v8; `SR-005`; `ARCH-REV-008`; `IR-003`; source review `CRR-007`.
- Coverage investigation: round 3.
- Execution result: `Pass / 98.7%`.
- Durable execution: 11 migration/run-history files / 68 tests; package-boundary integration 2 tests; guards/list/link/diff audits.
- Persisted execution: copied operational `FAILED/4 -> SUCCEEDED/5`, exact 8 Team rows, exact five superrepo GraphQL IDs, preserved prior summaries, no Agent duplication, byte/attempt/backup/inventory idempotence on restart.
- Package execution: exact personal Linux x64 build, 533,488,451-byte AppImage, packaged 21-migration health/SIGTERM lifecycle, actual isolated AppImage readiness.
- Environment deviation: assigned SSD physically disconnected and aborted ext4 during build; candidate was reconstructed from hash-verified archives over exact base on the miniHDD, then fully revalidated. Classified as hardware/environment, not product failure.
- Data safety: operational application data remained unmodified.
- Next recipient: Stage 8 code reviewer for proportional test-code review.

## Latest Authoritative Revision

- Revision: `API-REV-004`
- Result: `Pass`
- Confidence: `98.7%`
- Unresolved API/E2E findings: none
