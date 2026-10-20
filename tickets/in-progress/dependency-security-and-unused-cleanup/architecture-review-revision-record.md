# Architecture Review Revision Record — dependency-security-and-unused-cleanup

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete | SR-001 | N/A | Fail (Design Impact) | AR-001 |
| ARCH-REV-002 | Round 2 / SR-002 re-review | SR-001, SR-002 | Fail | Pass | AR-001 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of the dependency security and unused-cleanup design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/design-review-report.md`
- Review round and trigger: Round 1; Solution Designer's Architecture Design Complete (`handoff-sr-001.md`), `task_size=Medium`, `architectural_risk=High`
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md` SR-001; N/A
- Relevant solution revision IDs: SR-001
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- Baseline established:
  - Classification confirmed.
  - The DEC-001 rule, the update mechanism, the no-override stance, the explained remainder and the validation matrix pass.
  - One removal fails: `@nuxtjs/apollo`.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (High). `@nuxtjs/apollo` is the only lockfile provider of `@apollo/client` and `@vue/apollo-composable`, which web production code imports without declaring them. Keep it or declare its replacements, and add a sole-provider check to the removal step.
- Material classification changes: none
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty:
  - RR-001 (validation items R-001…R-004).
  - RR-002: name the `electron-updater`/`vue` parent updates explicitly.
  - RR-003: the pre-existing undeclared `@vue/composition-api` import in `generated/graphql.ts`.

### ARCH-REV-002 — Re-review after SR-002 corrections

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/design-review-report.md`
- Review round and trigger: Round 2; Solution Designer's SR-002 (`handoff-sr-002.md`), the re-review of AR-001 and the new check
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-002; AR-001
- Relevant solution revision IDs: SR-001, SR-002
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed:
  - `@nuxtjs/apollo` is kept, with the cause reproduced in `SD-08`.
  - A step-4/AC-004 import-provider check now covers all 8 changed packages against `SD-07`.
  - RR-002 is taken: step 3 has a parent pass, which the corrected trial showed was necessary (`lodash-es`).
  - RR-003 is noted in Risks.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-002; requirements-doc DEC-005/DEC-006/AC-004; design-spec L46, L158, L232, L275-281, L313; FU-005; `apply-manifest-changes.mjs` | The grep for `@nuxtjs/apollo` in `apply-manifest-changes.mjs` finds nothing. `SD-07` lists all 8 packages; `SD-08` shows an empty diff, dedupe check 0, and prod 0 critical / 13 high, all in the explained set. The probe's logic (package → root → hidden hoist → MISSING) detects exactly the lost-provider case. |

- New or remaining finding IDs: none
- Material classification changes: none (`Medium`/`High`)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty:
  - R-001…R-004, settled by step 7 validation.
  - The step-4 "identical" rule may flag harmless provider-location moves; only a change to MISSING is a loss.
  - RR-003 is pre-existing.
