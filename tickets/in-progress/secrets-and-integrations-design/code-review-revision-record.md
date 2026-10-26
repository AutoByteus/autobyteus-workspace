# Code Review Revision Record — MCP server secrets in the vault (autobyteus-244)

The latest `code-review-report.md` (and, after API/E2E, `api-e2e-test-review-report.md`) is authoritative for its current result. This record indexes every completed review result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail | CR-001, CR-002, CR-003, CR-004 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002, SR-008) | Fail | Pass | CR-001…CR-004 resolved |

## Revision Entries

### CRR-001 — Initial implementation review: sound core, three upstream decisions and one cleanup

- Canonical review report updated: `tickets/in-progress/secrets-and-integrations-design/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001); the six flagged decisions
- Relevant solution revision IDs: SR-005, SR-007
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, reviewed at `90c21a7cdb`
- What changed in the review result and why: first result. Store, resolve, states, preview, move, delete and the live check are correct and well bounded. Fail on:
  - CR-001: unreported plain backups after a form lock (Design Impact);
  - CR-002: the banner is not one-time (Design Impact);
  - CR-003: import refuses references, an unapproved change to autobyteus-190 SCN-002 (Requirement Gap);
  - CR-004: dead JS test twins in the touched module (Local Fix).
- Supported product scenario / material-premise basis changes: CRS-001…CRS-004 recorded as supported; CRS-005/006 rejected as contrived. P-001…P-003 confirmed.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001, CR-002, CR-003, CR-004; follow-up FU-006
- Material score or classification changes: initial scorecard average 9.2; Behavioral Fidelity 8.5, Cleanup Completeness 8.8
- Recommended recipient: Solution Designer (`/software_engineering_team/solution_designer`)
- Remaining risks or uncertainty: the meaning of "one-time" for the banner may need the user (CR-002)

### CRR-002 — Round 2: SR-008 rework resolves CR-001…CR-004

- Canonical review report updated: `tickets/in-progress/secrets-and-integrations-design/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Full Re-Audit`. Round 2 changes a shared draft type (`missingSecret`), the import GraphQL result (`needsSecret`) and provider `update` behavior, and adds a web owner. Unchanged files carried forward from CRR-001.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002); CR-001…CR-004, AR-015, AR-016
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail` (CRR-001)
- Current authoritative result: `Pass`, reviewed at `4aa2543f9d`
- What changed in the review result and why: SR-008 decided the three upstream questions (MDEC-006, MDEC-007 with AR-016), and IR-002 implements them as designed. No new findings.
- Supported product scenario / material-premise basis changes: CRS-001…CRS-003 resolved. CRS-007 (import and save at the same moment, handoff Assumption 3) rejected as contrived. CRS-008 (review marks dropped with an empty server list) rejected as not reachable.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Design Impact) | Resolved | SR-008, IR-002, `4505158d77`, `fc6032999e` | `file-provider.ts` `update` writes no backup (`replacesPlainValue` gone); `writeBackup` only in `replaceWithReferences`; `offersMove` puts "Move to vault" in place of the lock on unchanged plain rows and `rowsToInput` sends them plain; integration "writes no backup when a form save locks…"; spec "offers Move to vault instead of a lock toggle" |
| CR-002 | Open (Design Impact) | Resolved | MDEC-006, AR-015, IR-002 | `mcpSecretReviewState.ts` keyed by `entryId`; banner filters reviewed candidates; "Keep as they are"; dialog marks unticked rows; form marks unlocked suggestions; specs; IMP-16 persisted across a reload |
| CR-003 | Open (Requirement Gap) | Resolved | MDEC-007, AR-016, IR-002 | `importedDraftValue` → `keep` / `missingSecret`; `needsSecret` in GraphQL and the view; integration AR-016 case keeps the working ID (`CONFIGURED`); IMP-19 e2e |
| CR-004 | Open (Local Fix) | Resolved | IR-002 | The three twins are deleted (`git ls-files` finds none in `mcp-server-management`) |

- New or remaining finding IDs: None
- Material score or classification changes: average 9.2 → 9.4; Behavioral Fidelity 8.5 → 9.3; Cleanup Completeness 8.8 → 9.4
- Recommended recipient: API/E2E Engineer (`/software_engineering_team/api_e2e_engineer`); informational notice to the Implementation Engineer
- Remaining risks or uncertainty: review state is per device (accepted); desktop and Linux checks are left for API/E2E
