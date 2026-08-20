# Delivery Rework Record

## Current Result

- Delivery revision: `DR-008`
- Historical failed acceptance: `DR-004` — the initial production-shaped token
  consolidation rejected safe SQLite values decoded by Prisma as decimal
  strings after leading nullable rows.
- Nullable-adapter rework: `Resolved` by `SR-007` / `ARCH-REV-007` / `IR-007` /
  `CRR-011` / `API-REV-005` / `CRR-012`, then verified live in DR-005.
- Audit expansion: `Withdrawn`, not resolved by compaction. SR-010 removed the
  DR-007 audit projection/compactor behavior and accepted its visible residual
  for separate future scope.
- Current recovery-presentation rework: `Resolved` by `SR-012` /
  `ARCH-REV-012` / `IR-011` / `CRR-019` / `API-REV-008` / `CRR-020`.
- Fresh Electron package: `DR-008 build and integrity Pass`.
- Explicit user verification: `Pass` under DR-009.
- Finalization: `Authorized` after unchanged-base refresh.

## Historical Production Defect And Resolution

The exact DR-004 seam was a nullable SQLite `json_extract(...)` batch whose
leading `NULL` rows caused later safe integers to arrive through Prisma as
canonical decimal strings. The original migration-only decoder accepted only
`number | bigint`, so `Number.isSafeInteger` rejected those strings with the
misleading “outside JavaScript SafeInt” error.

IR-007 corrected migration-only transport/decoding through deterministic typed
SQL projection and strict exact parsing. It admits only the intended canonical
integer representation, validates tag, grammar, nonnegative/domain/SafeInt
bounds through `BigInt`, and only then converts to number. Real disposable
Prisma/SQLite leading-NULL coverage proves the adapter path and rollback/retry.
Automated checks never used the user's live database.

Subsequent read-only live evidence proved the corrected consolidation completed
atomically and Token Statistics operates on one current record per run. The
original DR-004 failure remains historical evidence; it is not retroactively a
Pass.

## Withdrawn Audit Rework

DR-006 identified large already-successful historical migration summaries. An
intermediate SR-008/SR-009 projection/compactor implementation produced DR-007,
but the user later withdrew that expansion under SR-010. Therefore:

- DR-007 is stale and not an acceptance candidate;
- historical TCR-001 is obsolete because its owners/tests were removed;
- the current package must preserve the existing large summaries/status
  response without mutating them; and
- future audit/retention/filesystem work needs separate requirements.

The current four audit-only durable paths are intentionally absent, and the
source/package audit confirms the projection and compactor owners are absent.

## Current Recovery Rework

The retained startup-only migration needed a truthful public recovery journey.
The current runner owns a closed `MANUAL_RETRY | RESTART_TO_RETRY | NONE`
classification. GraphQL and Pinia transport it unchanged. Settings renders
exact localized restart guidance for `RESTART_TO_RETRY`, keeps Retry disabled,
and dispatches no manual mutation; the ordinary startup runner remains the
executor. Direct manual startup-only invocation is still rejected.

`API-REV-008` passed at `97.9%`, including the runner/GraphQL matrix, actual
built-server FAILED -> ordinary restart -> SUCCEEDED lifecycle, Settings/store
coverage, full production-upgrade suite, Nuxt production build, and static /
removal / cleanup audits. `CRR-020` passed proportional review with no finding.

## Delivery Resolution

- Reviewed-state checkpoint:
  `d4ec609132cf075d513c9754269e76ff267a43d4` (local only, not pushed).
- Latest base:
  `origin/personal@1f5663ddb86e478d0b4ffdd878d57dee72d67b4b`, divergence
  `0 behind / 6 ahead`; no merge required.
- Durable docs were reconciled to current recovery semantics without restoring
  withdrawn audit claims.
- A separate personal macOS ARM64 Electron `1.4.52` DR-008 package was built and
  integrity-checked. It was not launched by delivery and the live profile was
  not accessed or mutated.

## Safety / Hold

- Do not hand-edit production SQLite or migration records.
- Do not truncate or compact historical summaries/logs for verification.
- Do not use DR-007 or any older Electron artifact as current acceptance
  evidence.
- No push, archive, target merge/push, version/tag, release, deployment, or
  cleanup is authorized until renewed explicit DR-008 user verification.
