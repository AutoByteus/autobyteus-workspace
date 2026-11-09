# Architecture Review Revision Record — package-personal-settings (autobyteus-95)

The latest `design-review-report.md` is authoritative. This record keeps the review history.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture review request, stage 1 (Large / High), 2026-11-09 | SR-005 | N/A | Fail (Design Impact) | AR-001..AR-005 |
| ARCH-REV-002 | Round 2 / SR-006 re-review, 2026-11-09 | SR-006 | Fail (Design Impact) | Pass | AR-001..AR-005 (resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review: read boundary confirmed; Team/Org saves and capture failures need work

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings/tickets/in-progress/package-personal-settings/design-review-report.md`
- Review round and trigger: round 1; the Solution Designer's request, commit `bc8ae29406`.
- Triggering role, report path, and finding IDs: Solution Designer, `design-spec.md`; N/A.
- Relevant solution revision IDs: SR-005 (design), SR-003/SR-004 (requirements).
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail` (Design Impact).
- What changed in the review result or what baseline was established: baseline.
  - Confirmed: the three services are the only store readers and their reads return copies; capture runs inside the package's serialize on both update paths.
  - Three reachable premises (MP-001..MP-003) drive the blocking findings.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - AR-001 (blocking): Team and Org updates use the effective read as their base.
  - AR-002 (blocking): the split's comparison rule is undefined.
  - AR-003 (blocking): capture's failure rule is a blanket stop.
  - AR-004 (non-blocking): construction and announce wiring are not named.
  - AR-005 (recommendation): "package" wording on built-in agents.
- Material classification changes: none (Large / High confirmed).
- Recommended recipient: Solution Designer.
- Remaining risks or uncertainty: R-1..R-3 in the report.

### ARCH-REV-002 — Recheck of SR-006: AR-001..AR-005 resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings/tickets/in-progress/package-personal-settings/design-review-report.md`
- Review round and trigger: round 2; the Solution Designer's re-review request for SR-006, commit `e35899a68c`.
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` ("Revision SR-006", "Write Forms Per Kind", "Capture Failure Rules"), `requirements-doc.md`, `personal-settings-file-contract.md`, `investigation-notes.md`; AR-001..AR-005.
- Relevant solution revision IDs: SR-006 (SR-005 design; SR-003/SR-004 requirements).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed in the review result:
  - I confirmed the behavior basis again; SR-006 changes only the wording of REQ-004's built-in reset label.
  - I redrew DS-002 and DS-003 in call order.
  - I checked the new citations: the file-store serializers, the Org-owned agent refusal and the glossary.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open, blocking | Resolved | SR-006 | DS-002 steps 1-7. "Write Forms Per Kind": Team and Org `readBaseDefinition` replaces `getDefinitionById` at `:286` and `:125`, the revision check runs against the base, and the candidate keeps the base personal fields. Tests per kind are named. |
| AR-002 | Open, blocking | Resolved | SR-006 | `rendersDifferently(base, candidate)` uses the store's own serializers (agent `:361-376`, Team `content()`, Org `files()`), with agents stripped first. Personal-only-save tests per kind are named, the Org one on the real editor payload. |
| AR-003 | Open, blocking | Resolved | SR-006 | "Capture Failure Rules": one result per step, order backup → capture → staging. An unreadable definition is backed up and not captured. A staging failure after capture is harmless (worked example). A test per rule. |
| AR-004 | Open, non-blocking | Resolved | SR-006 | Construction in `create-bundle-backed-definition-services.ts`; the Org service and process binding in `host-definition-services.ts`; `setPublisher` set and cleared by the feed composition; the standalone host and `AgentPackageService` wiring stated. |
| AR-005 | Open, recommendation | Resolved | SR-006 | "Base value" in the design and the contract; `personalSettingsBase` (`PACKAGE` / `BUILT_IN`) picks the UI wording; REQ-004 reset wording for built-ins, reported to the user. |

- New or remaining finding IDs: none. Implementation notes R-4..R-7 are in the report.
- Material classification changes: none (Large / High).
- Recommended recipient: implementation engineer; informational notification to the Solution Designer.
- Remaining risks or uncertainty: R-1..R-7 in the report.
