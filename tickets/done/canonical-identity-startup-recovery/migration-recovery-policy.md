# Canonical Identity Migration Recovery Policy

> **Status: Superseded by the `SR-004` scope reset.**
> The later user clarification withdrew this artifact as intended-behavior authority. It is retained only as historical `SR-001`–`SR-003` context and must not drive implementation or review.
> **Do not reuse any fatal-migration or startup-blocking statement below. Current SR-012 authority is `requirements.md`: conversion, promotion, token, and history migration problems warn and cannot block startup.**

## Status And Authority

- Status: `Superseded historical artifact — not current authority`
- Historical purpose: recorded the broad evidence, disposition, preservation, warning, and failure proposal from `SR-001`–`SR-003`.
- This supplement is no longer part of the current requirements basis.
- Related requirements: `REQ-001` through `REQ-012`, `REQ-014`, `REQ-015`
- Related acceptance criteria: `AC-001` through `AC-016`, `AC-020`

## Policy Goals

1. Preserve exact canonical identity and fail closed on genuine contradiction.
2. Interpret formats actually emitted by released builds according to their released semantics rather than retroactively imposing a stricter but false schema.
3. Let unrelated valid data become usable after every unresolved subject has either a safe active conversion or an explicit byte-preserving quarantine disposition.
4. Never make reset, manual deletion, migration-record editing, random ID creation, or identity copying the supported upgrade path.
5. Complete the entire required migration chain before exposing runtime, history, catalog, token, or external delivery behavior as ready.

## Root Disposition Matrix

| Disposition | Recognition | Required Outcome | Migration Status Contribution |
| --- | --- | --- | --- |
| `CURRENT_V1_VALIDATED` | Exact three-file V1 package validates as one state package | No-op; admit to current catalog | `SKIPPED` |
| `PREDECESSOR_RECOVERABLE` | Regular predecessor metadata plus all required subject evidence converts without contradiction | Transform through canonical identity and V1 package boundaries | `MIGRATED` or `SKIPPED` on retry |
| `HISTORICAL_RESIDUE_VALIDATED` | Historical manifest validates against directory/root and its own bindings | Preserve as non-current historical residue; do not invent a V1 tree | `SKIPPED` |
| `EMPTY_ORPHAN_SHELL` | No authority file and exhaustive no-follow inventory contains no regular content/symlink/special entry | Move to protected auditable quarantine; do not silently delete | `QUARANTINED`, overall warning |
| `CONTENT_BEARING_AUTHORITYLESS` | No authority file but inventory contains content or child state | Preserve exact bytes in protected quarantine with inventory and reason | `QUARANTINED`, overall warning |
| `PARTIAL_CURRENT_RECOVERABLE` | V1 promotion marker/residue exists and an exact protected predecessor backup manifest validates | Resume or roll forward from that protected source; revalidate final package | `MIGRATED`/`SKIPPED` |
| `PARTIAL_OR_INVALID_CURRENT_UNPROVEN` | Partial/malformed package has no exact protected predecessor authority | Preserve all bytes in quarantine; never select a convenient adjacent sidecar | `QUARANTINED`, overall warning |
| `MALFORMED_OR_AMBIGUOUS_SAFE_DIRECTORY` | Directory can be inventoried safely but authority/identity is internally contradictory | Preserve bytes and evidence in quarantine; exclude from runtime/catalog | `QUARANTINED`, overall warning unless a non-quarantinable dependent fact conflicts |
| `UNSAFE_FILESYSTEM_OBJECT` | Root entry or required authority path is a symlink, device, socket, or other no-follow-unsafe object | Do not follow, copy through, or rename blindly; report a terminal blocker with path/type | `FAILED`, startup blocked |

A quarantined root is not migrated, admitted, silently dropped, or counted as successful conversion. `SUCCEEDED_WITH_WARNINGS` is the terminal result when all active data is safe and one or more subjects were explicitly quarantined. A true blocker remains `FAILED`.

## Evidence Precedence

Highest applicable authority wins only when the weaker evidence is a released redundant/display field. Two independent authoritative sources that truly disagree are a blocker or quarantine reason; the migration must not silently choose one.

1. **Validated current V1 package** — strongest current runtime authority and immutable no-op.
2. **Validated protected migration backup** — authoritative only when its manifest binds migration ID, root ID, source path, attempt, complete file inventory, and integrity hashes, and all bytes verify.
3. **Live predecessor root authority interpreted by released schema** — metadata owns configured tree and released run identities; task records own retained task execution lineage.
4. **Subject-specific released persisted fact** — exact token-row redundant fields or released external-output `entryMemberRunId` may govern only their own retained subject when stronger topology was legitimately retired.
5. **Physical member memory placement** — corroborates an independently named AgentRun/task lineage; it cannot create an identity by itself.
6. **Validated historical manifest** — proves that a root is intentional residue; it does not supply absent fields for a current package.
7. **Unmanifested adjacent backup, display name, or derived label** — corroboration only, never sole identity authority.

## Nested Team Identity Rule

For each predecessor nested AgentTeam node:

1. A non-empty explicit `teamRunId` is the canonical child TeamRun identity.
2. If explicit `teamRunId` is absent, use non-empty `memberRunId` because every inspected released restore contract uses that fallback.
3. Do **not** require explicit `teamRunId == memberRunId`; the fields were released with distinct meanings.
4. Validate root Team IDs, resolved nested TeamRun IDs, and AgentRun IDs for uniqueness and tree consistency after resolution.
5. Reject/quarantine empty IDs, duplicate resolved identities, invalid parent/coordinator topology, or conflict with another authoritative source.
6. Discard the obsolete wrapper representation during migration; do not retain a dual-identity runtime compatibility field.

This rule resolves the observed four missing and one explicit-different nodes without guessing.

## Released Address Grammar And Fold

The migration accepts the ordered grammar emitted by released builders:

- one or more non-empty `member` segments representing configured/local logical ancestry;
- zero or more `task_team` segments, each immediately preceded by the member segment identifying that task Team's logical placement;
- an optional single terminal `task_agent` segment immediately following its member segment;
- route/path aliases inside each member segment must agree;
- task TeamRun IDs must be non-empty and not repeated;
- no unsupported kind, empty segment, segment after task-Agent, or root mismatch is accepted.

Canonicalization preserves:

- the enclosing root TeamRun ID;
- ordered task TeamRun IDs;
- canonical member address formed by ordered concatenation of released local member paths;
- optional task AgentRun ID;
- sender/receiver/task-run role and meaning.

When retained metadata/task topology exists, the folded address must resolve to exactly one configured or task execution. A malformed order, duplicate, escape from the logical Team, ambiguous run, or contradiction receives item evidence and no partial mutation.

## Communication Recovery Rule

1. Current predecessor address projections use the strict released fold above.
2. An older projection without addresses is recoverable only when each `senderRunId` and `receiverRunId` maps to exactly one Agent node in the same validated root metadata.
3. Populated route/path fields are corroboration and must agree with the run-ID mapping; display names never decide identity.
4. A missing, ambiguous, cross-root, or contradictory mapping quarantines the owning root rather than creating an Agent identity.
5. The repaired required chain owns this recovery even when the earlier communication migration record is already terminal `SUCCEEDED_WITH_WARNINGS`.

## Token Ledger Rule

Token facts cannot be dropped or removed from accounting by quarantine.

### Tier 1 — retained authoritative topology

When a validated current/predecessor task mapping exists:

- use it for root, ordered task-Team chain, and logical Team placement;
- require the stored row's explicit segments and redundant columns to agree;
- require any physical AgentRun evidence used by V1 planning to be unique and in the expected task-root ancestry;
- a conflict fails the complete token plan and leaves the token table unchanged.

### Tier 2 — retired topology

When the task/root artifacts no longer exist, a released row is sufficient for **that ledger subject only** if all of the following hold:

- non-empty explicit stored root;
- valid released segment grammar;
- non-empty, unique ordered task TeamRun IDs;
- concatenated member address is valid;
- final member segment agrees with the legacy member route/path;
- `member_agent_run_id` agrees with `run_id`;
- task-Agent segment and legacy task-Agent column agree;
- JSON and all required fields are structurally valid.

The stored root is preserved as recorded, including when it is also present in the task-Team chain. This does not recreate or admit a retired TeamRun. Any contradiction fails the transaction; the migration must not fabricate a missing parent root.

### Mutation invariant

- Plan every ledger row before issuing token mutation SQL.
- Apply all address updates, root corrections, column contraction, and index replacement in one SQL transaction.
- Verify one update per intended row and the final schema/index before commit.
- Preserve row count, `usage_event_id`, `idempotency_key`, run ID, task ID, timestamps, token quantities, prices/costs, and all non-identity facts exactly.
- Retain the protected pre-V1 identity evidence required by the next migration boundary; remove obsolete live columns only inside the successful transaction.

## Binding And External-Output Rule

- A released Team binding without member route/path converts to current `targetMemberAddress: null`; no member is invented.
- Released Team output `entryMemberRunId` is exact AgentRun identity and converts directly to current `entryAgentRunId`.
- If a validated live tree exists, cross-check that run ID against it. If the tree was retired or quarantined, the released exact run ID remains subject-specific authority.
- Display `entryMemberName` is not identity and is removed with the old shape.
- A genuinely invalid output record is preserved in record-level quarantine with original bytes/index, reason, and evidence; it must not be silently discarded or allowed to corrupt unrelated deliveries.

## Quarantine Contract

Every quarantine action must:

1. occur outside normal Team root discovery and runtime admission;
2. preserve original bytes and relative paths exactly;
3. use no-follow inventory and reject unsafe objects before mutation;
4. record migration ID, attempt, source path, quarantine path, root/record subject, disposition, field/reason/evidence code, timestamp, size/type inventory, and integrity hashes;
5. verify preservation before the active source is removed or replaced;
6. use an atomic same-filesystem activation boundary or an equally crash-safe journaled transition;
7. be idempotent and discoverable on retry without creating duplicate quarantine copies;
8. produce a durable report containing identifiers and paths needed for local support, while normal application/committed test output remains content-minimized;
9. never imply that quarantined data was converted or is currently usable.

Empty shells also receive a manifest; they are not silently deleted. A later manual recovery tool is outside this ticket, but the manifest must contain enough evidence for supported diagnosis/recovery work.

## Preflight, Apply, Interruption, And Retry

1. Enumerate every root entry and every global dependent subject.
2. Build and validate all root dispositions, transformed payloads, token plans, bindings, external outputs, history projection, backups/quarantine manifests, and V1 packages before durable mutation.
3. A terminal plan failure leaves Team roots, quarantine, token ledger, bindings, output deliveries, history index, catalog authority, and migration completion state byte-stable except for the runner's failure record/log.
4. A quarantinable root is a planned safe disposition, not a terminal preflight failure.
5. After preflight succeeds, use protected backups/staging and explicit promotion markers or a durable journal. Each root/record boundary must be atomic or roll-forward/rollback recoverable.
6. The token transaction begins only after Team dispositions are fully planned and safe, and runtime remains gated until both canonical and V1 phases finish.
7. Interruption at any apply point leaves a state that the next launch can classify from protected evidence and converge without duplicate facts, duplicate backups, or manual record reset.
8. An existing current `FAILED` record is retried automatically; attempts remain auditable. Obsolete failed records not present in the current required registry do not gate startup.
9. Complete valid V1 packages are validated no-ops on later launches.

## V1, History, Catalog, And Startup Readiness

- The V1 phase must preflight all predecessor promotions and global subjects before altering the Team history index.
- History reconciliation must use the complete final set of validated active V1 trees and must not run from an empty/partial tree map after a failed preflight.
- On terminal failure, the existing history index remains byte-stable.
- On success/warnings, history excludes quarantined/historical-only roots and includes every validated current root according to current history rules.
- Runtime catalog rebuild occurs only after all currently registered `requiredOnStartup` migrations are terminal `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`.
- `FAILED`, `RUNNING`, `NOT_RUN`, missing, or thrown required migration outcomes block bootstrap/listen.
- A current registry warning is startup-safe only because the migration has explicitly classified all non-active subjects (for example, protected quarantine); warnings do not weaken identity validation.
- An obsolete database record for an unregistered migration is historical audit data and does not block current startup.

## Diagnostics And Privacy

- Every conversion, skip, quarantine, and failure has a stable subject/disposition/evidence code and a human-readable summary.
- Reports include counts for scanned, migrated, skipped, quarantined, and failed subjects; quarantined is not folded into skipped/migrated.
- Logs may name local subjects and paths for owner diagnosis but must not include message bodies, token raw event bodies, secret values, or unrelated user content.
- Fixtures use minimized synthetic IDs/content and cover every observed shape category.
