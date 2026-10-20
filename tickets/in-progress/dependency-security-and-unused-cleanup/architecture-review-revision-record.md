# Architecture Review Revision Record — dependency-security-and-unused-cleanup

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete | SR-001 | N/A | Fail (Design Impact) | AR-001 |
| ARCH-REV-002 | Round 2 / SR-002 re-review | SR-001, SR-002 | Fail | Pass | AR-001 (resolved) |
| ARCH-REV-003 | Round 3 / SR-003 (after IMP-DI-001) | SR-003 | Pass | Fail (Design Impact) | AR-002 |
| ARCH-REV-004 | Round 4 / SR-004 re-review | SR-004 | Fail | Pass | AR-002 (resolved) |

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

### ARCH-REV-003 — Re-review after SR-003 (IMP-DI-001: axios typings; IMP-04: transitive majors)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/design-review-report.md`
- Review round and trigger: Round 3; Solution Designer's SR-003 (`handoff-sr-003.md`), after the implementation engineer's Design Impact IMP-DI-001 (`implementation-handoff.md`, `evidence/IMP-07`) and the IMP-04 lockfile review
- Triggering role, report path, and finding IDs: Implementation Engineer, IMP-DI-001 → Solution Designer, `design-spec.md` SR-003; new AR-002
- Relevant solution revision IDs: SR-003
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Fail`
- What changed in the review result:
  - DEC-007 is accepted: axios 1.20.0 is the only fix for two high advisories, and `String(contentType)` is the identity for the string header on the stream response. Only the types change, with a test in the existing test file.
  - The restated dependency rule is accepted: no direct specifier crosses a major. Each transitive major in IMP-04 sits inside an updated parent's declared range, and none is declared directly by our manifests.
  - The scope wording in five places still says "no source change": design-spec Change Scope L59 and L63; requirements-doc Non-Goals L78, DEC-001 L173 and Architecture Phase Input L203.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Still resolved | SR-002, SR-003 | Unchanged by SR-003; `@nuxtjs/apollo` is still kept in `9936445f55` (its manifest diff does not remove it) |

- New or remaining finding IDs: AR-002 (Low, Design Impact): align the scope wording with REQ-006/DEC-007 and list the source file and its test in the Change Scope.
- Material classification changes: none (`Medium`/`High`)
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty:
  - The 131-vs-130 node count mismatch.
  - R-001…R-004 remain step 7 validation items.

### ARCH-REV-004 — Re-review of AR-002 after SR-004

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/dependency-security-and-unused-cleanup/tickets/in-progress/dependency-security-and-unused-cleanup/design-review-report.md`
- Review round and trigger: Round 4; Solution Designer's SR-004 (`solution-revision-record.md` SR-004), the re-review of AR-002
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md`/`requirements-doc.md` SR-004; AR-002
- Relevant solution revision IDs: SR-004
- Prior authoritative decision: `Fail` (ARCH-REV-003)
- Current authoritative decision: `Pass`
- What changed: the scope wording is aligned with REQ-006/DEC-007 in all five places, and the Change Scope lists both files. The node count now refers to `evidence/IMP-04`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-002 | Open (Low) | Resolved | SR-004; design-spec L61, L64, L190; requirements-doc L78, L173, L203; handoff-sr-003 L20 | grep: no remaining unqualified "no source change". Change Scope names `download-media-tool.ts` (L118) and `download-media-tool.test.ts`. |
| AR-001 | Resolved | Still resolved | — | Unchanged |

- New or remaining finding IDs: none
- Material classification changes: none (`Medium`/`High`)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: R-001…R-004 remain step 7 validation items.
