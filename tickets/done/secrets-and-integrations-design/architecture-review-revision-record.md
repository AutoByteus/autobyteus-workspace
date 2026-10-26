# Architecture Review Revision Record — secrets-and-integrations-design (autobyteus-244)

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / SR-006 design handed for independent review | SR-004, SR-005, SR-006 | N/A | Fail (Design Impact) | AR-001…AR-010 |
| ARCH-REV-002 | Round 2 / SR-007 revision after ARCH-REV-001 | SR-005, SR-006, SR-007 | Fail (Design Impact) | Pass | AR-001…AR-010 resolved; AR-011…AR-014 new (non-blocking) |
| ARCH-REV-003 | Round 3 (focused) / SR-008 after code review CRR-001 | SR-008 | Pass | Pass | AR-015 new (impl note), AR-016 new (recommendation); AR-011…AR-014 still in force |

## Revision Entries

### ARCH-REV-001 — Baseline: move boundary, status owner, draft input, live-check path

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design/tickets/in-progress/secrets-and-integrations-design/design-review-report.md`
- Review round and trigger: Round 1. Solution Designer handoff of `design-spec.md` at SR-006 (Large / High).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff.md`; no prior findings.
- Relevant solution revision IDs: SR-004, SR-005, SR-006
- Prior authoritative decision: N/A
- Current authoritative decision: Fail (Design Impact)
- What changed in the review result or what baseline was established:
  - Basis confirmed against code at `a2faf424`. The base drift to `d74f75a5` does not touch any file the design changes.
  - All six config construction sites were verified, and the workspace path was verified dead. No construction path is missing.
  - Sound and to be kept: the resolver at connect, `mcp.<uuid>` IDs, the no-migration decision, the clean GraphQL cut, value-free candidates.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - Blocking: AR-001 (the move bypasses the provider/cache), AR-002 (`configured` status owner; vault-unavailable fails the query), AR-003 (draft input type, preview keep owner, `field` vocabulary), AR-004 (live check cannot save on the read-only test vault), AR-006 (always-secret output treatment; token state), AR-007 (no header rows in the form).
  - Non-blocking: AR-005 (wire the resolver before listen), AR-008 (vault/file order), AR-009 (MREQ-004 traceability), AR-010 (stale status lines).
- Material classification changes: None. Large / High confirmed.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: P-001 `Unclear` (resolver set after listen); the rule's matching is coded on both server and web; the plain-text backup; the live-check token expires 2026-11-25.

### ARCH-REV-002 — Re-review of SR-007: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design/tickets/in-progress/secrets-and-integrations-design/design-review-report.md`
- Review round and trigger: Round 2. SR-007, the Solution Designer's revision addressing ARCH-REV-001.
- Triggering role, report path, and finding IDs: Solution Designer, `handoff.md` (round 2); AR-001…AR-010.
- Relevant solution revision IDs: SR-005, SR-006, SR-007
- Prior authoritative decision: Fail (Design Impact)
- Current authoritative decision: Pass
- What changed in the review result:
  - The behavior basis was re-confirmed.
  - Each spine was redrawn in call order, against the current code and the round-2 investigation table.
  - The AR-006 and AR-007 decisions were checked against MDEC-001/MDEC-002/MREQ-005: they add no new product behavior.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-007; DS-004; Dependency Rules; provider interface | `McpConfigService.moveSecretsToVault` drives the move. Vault saves come first. `provider.replaceWithReferences` does the backup and the atomic rewrite in one `updateJsonFile`, then updates the cache. Compensation if it fails. Only the provider writes the file. The vault is not called from inside the updater |
| AR-002 | Open (High) | Resolved | DS-003; `McpSecretState`; output example | `statesOf` is the one owner and never throws (`VAULT_UNAVAILABLE`). The converter is pure. The configure result uses the same view. The card's "needs secret" comes from the states |
| AR-003 | Open (Medium) | Resolved | Interfaces; DS-001/DS-006; Terminology; Removal plan | `McpServerDraft` (plain/newSecret/keep) with service signatures; store and preview modes; `field` defined and used everywhere; the token input is unambiguous; keep markers defined; old builders removed |
| AR-004 | Open (Medium) | Resolved | DS-005; test-only ID | `readLiveTestSecret` reads the test vault read-only; the suite's own application vault stores the token; the ID is never authorized for a consumer. The harness is clarified in AR-011 |
| AR-005 | Open (Low) | Resolved | Interface `useSecretResolver` | Wired in `server-runtime.ts` after L175, before L214 |
| AR-006 | Open (Medium) | Resolved | "Decisions Made Within The Approved Direction"; output example | Always-secret fields never return a value; plain values stay settings, with a hint; candidates always include always-secret plain values; `tokenState` replaces `tokenConfigured`/`tokenSecret` |
| AR-007 | Open (Medium) | Resolved | Decisions; Derived Consumers | Header rows with locks via the shared `McpConfigRows.vue` |
| AR-008 | Open (Low) | Resolved | DS-001 narrative | Saves before the write, removals after the commit, new entries removed on failure |
| AR-009 | Open (Low) | Resolved | "How The Record Shape Meets MREQ-004" | Owner and field live in the reference's position; later kinds use their own prefix |
| AR-010 | Open (Low) | Resolved | requirements L6/L133/L139; notes L12-14; SR index | Verified |

- New or remaining finding IDs: AR-011 (live-check harness: `startBuiltTestServer` without a test vault, so the production wiring runs), AR-012 (do not widen `isKnownSecretId` to `mcp.*`), AR-013 (configure keeps today's discovery behavior; release the lock before re-discovery), AR-014 (warn when an unreadable entry is dropped). All Low and non-blocking, for the implementation engineer.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: the service write lock must stay a small mutex; rule matching is coded twice (shared vectors); the plain backup; the live-check token expires 2026-11-25.

### ARCH-REV-003 — Focused round on SR-008 (after code review CRR-001): Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/secrets-and-integrations-design/tickets/in-progress/secrets-and-integrations-design/design-review-report.md` (section "SR-008 Focused Round")
- Review round and trigger: Round 3. SR-008 answers `code-review-report.md` CRR-001 (CR-001…CR-004; implementation reviewed at `90c21a7cdb`).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff.md` (SR-008); code reviewer CR-001…CR-004.
- Relevant solution revision IDs: SR-008 (on SR-007)
- Prior authoritative decision: Pass (ARCH-REV-002)
- Current authoritative decision: Pass
- What changed:
  - Reviewed the "SR-008 Revision" section and the lines it changed.
  - CR-001: only the move writes backups.
  - CR-002 / MDEC-006: unreviewed-only banner, with a per-device review state that has one owner.
  - CR-003 / MDEC-007: an imported reference becomes `keep` or `missingSecret`, never adopted.
  - CR-004: dead JS twins removed.
  - All four are coherent with SR-007 and the approved basis. MDEC-006/007 are accepted as the Solution Designer's decisions within the standing direction.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-011…AR-014 | Open (non-blocking, implementation) | Still in force | ARCH-REV-002 | SR-008 does not touch them. The implementation handoff should record how each was applied |

- New or remaining finding IDs:
  - AR-015: key the review state by `entryId`, not `nodeBaseUrl` (implementation, Low).
  - AR-016: recommendation to the Solution Designer to keep this server's existing reference when an imported field holds any reference, so a stale own file does not drop a working secret (non-blocking).
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: AR-016's stale-file case (the user is told through `needsSecret`); the risks from ARCH-REV-002 remain.
