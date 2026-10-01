# IR012 implementation self-check

## Supported basis and ownership
CRR017 CG044 is the documented operational build path, independently required by TESTING.md. The first mandatory web guard rejected a valid native integration regression misplaced under services. The local issue is file placement, not the production SR038 identity design. Existing tests/integration/codex-turn-lifecycle-native-to-live-projection.integration.test.ts already joins server/native paths to real web projection in this test-owned area. The relocated test is a peer, not an exception inside production services.

Keep normal colocated unit tests under __tests__; keep the cross-layer harness in tests/integration. The unchanged Nuxt Vitest config discovers both .spec.ts and .integration.test.ts. No include/exclude/config/package/lock change, hidden import syntax, helper shim, production core dependency or guard-policy change. The old active test file is removed; historical captures/references are not rewritten. Exact alias/relative-depth retargeting is the only native test code delta. Entire body after imports (including mocks and every assertion) is byte-identical to the IR011/CRR017 preimage. Search outside immutable ticket evidence found no callers of the removed filename.

## Guard contract checks
New test invokes the actual unchanged guard script with disposable miniature roots: identical direct static core import fails under services and services/__tests__, succeeds in tests/integration. Neither real source nor node_modules is mutated for negative testing; temp roots cleaned in afterEach. These tests exercise existing policy, not a broader exception. Real worktree guard passes as a separate local check. Optional stale core node_modules link is absent before and after, so guard cleanup branch did not execute.

## Behavior, size, persistence, rendering
All17 IR011 production hashes unchanged. No production effective-line size/delta pressure introduced (prior max497, prior deltas<220 remain historical confirmed-by-hash). Test-only move/new47-line guard test plus13-line testing guidance. No new shared structures/owners, wrappers or runtime fallback. Production SR038 Directly Usable—No Migration unchanged; no migration/backfill/user data/frozen captures/old input retrofit. No frontend visual or interaction changes; new rendered inspection is Not Applicable, not newly verified.

## Limits
Focused19 tests pass including true native Agent/hosted-Team history+FIFO; standalone2 pass is overlap. Models/provisioning/Apollo controlled; same-process hydration, no HTTP or packaged renderer. No server global setup/DB reset run here. Full build/typecheck/E2E/user verification not performed. Mandatory guard is only the first build prerequisite. Neither this self-check nor earlier source pass closes API009 or API010 executable gates.
