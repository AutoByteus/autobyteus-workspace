# Code Review Revision Record — test-and-tooling-hygiene-294 (autobyteus-294)

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) is authoritative for its current result. This record indexes the review results.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Fail (Local Fix) | CR-001 |
| CRR-002 | `code-review-report.md` | Implementation Review, round 2 (IR-002, CR-001 fix) | Fail (Local Fix) | Pass | CR-001 |
| CRR-003 | `api-e2e-test-review-report.md` | Proportional test-code review after API/E2E Pass (API-REV-001) | N/A (first test review) | Pass | None |
| CRR-004 | `code-review-report.md` | Implementation Review, round 3 (IR-003, delivery packaging Local Fix) | Pass (CRR-002) | Pass | None |
| CRR-005 | `code-review-report.md` | API/E2E Failure-Origin Review, round 4 (API-REV-002) | Pass (CRR-004) | Fail — Local Fix (implementation) | CR-002, CR-003 |

## Revision Entries

### CRR-001 — Initial source review of the hygiene ticket

- Canonical review report updated: `tickets/in-progress/test-and-tooling-hygiene-294/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001)
- Relevant solution revision IDs: SR-002, SR-004, SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: `Fail`, Local Fix owned by implementation (CR-001)
- What changed in the review result and why: first review. The full scope was reviewed (`origin/personal..6fa5f443c6`). One in-scope finding: `utils/apolloClient.ts` and `plugins/30.apollo.client.ts` keep unreachable nuxt-apollo compatibility slots and an unused `clientId` parameter. The change also adds an app-wide `#app` augmentation that declares those slots. One follow-up recorded (FU-010).
- Supported product scenario / material-premise basis changes: none (SCN-001..003 used; candidates C-03..C-07 rejected with evidence).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001
- Material score or classification changes: categories 5, 9, 10 at 8.8; others ≥ 9.2. Classification `Local Fix`.
- Recommended recipient: Implementation Engineer; then Targeted Delta Review on CR-001, then API/E2E.
- Remaining risks or uncertainty: the handoff's not-run list (API/E2E); the projects probe now runs its backends offline.

### CRR-002 — CR-001 fix verified; source review passes

- Canonical review report updated: `tickets/in-progress/test-and-tooling-hygiene-294/code-review-report.md`
- Review entry point and round: Implementation Review, round 2
- Review scope: `Targeted Delta Review`. The delta `6fa5f443c6..54ed02d56d` changes only CR-001's three files (`256cee925e`); the other two commits are ticket documents.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002), CR-001
- Relevant solution revision IDs: SR-002, SR-004, SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001, IR-002
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: `Fail`, Local Fix (CRR-001)
- Current authoritative result: `Pass`
- What changed in the review result and why: CR-001 is resolved exactly as required. There is one binding key, `getApolloClient()` takes no parameter and throws when no client is bound, the augmentation is shrunk, and the spec asserts the exact binding.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (CRR-001) | Resolved | IR-002, commit `256cee925e` | diff read; `git grep` finds no `_apolloClients` / `$apollo` in `autobyteus-web`; no caller passes an argument to `getApolloClient`; IMP-19: typecheck PASS (0 production, 298/139), spec 2/2, `test:nuxt` 666 files |

- New or remaining finding IDs: none
- Material score or classification changes: categories 5, 9 and 10 go from 8.8 to 9.3–9.4; average 9.4; no classification.
- Recommended recipient: API/E2E Engineer (primary); Implementation Engineer (informational).
- Remaining risks or uncertainty: the handoff's not-run list (API/E2E); the projects probe runs its backends offline; FU-010 is open.

### CRR-003 — Proportional test-code review of the API/E2E baseline fixes

- Canonical review report updated: `tickets/in-progress/test-and-tooling-hygiene-294/api-e2e-test-review-report.md`
- Review entry point and round: Successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review). Range `256cee925e..ecd7dc2d0f`; five test files, 14+/7-; production code unchanged.
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-001); commits `dfef14abc6`, `a001e645c7`, `bce2f8b4e3`, `e60f4d89a0`, `6af8819ede`
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A for test review (source review CRR-002 Pass)
- Current authoritative result: `Pass`
- What changed in the review result and why: all five Rule 9 fixes are bounded catch-ups to commits already on `origin/personal`. None weakens an assertion, and the probe's check is stricter.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: Delivery Engineer
- Remaining risks or uncertainty: AC-014 not run on Linux; the BEH-032 screens are proven by specs only; FU-009..FU-012 are open.

### CRR-004 — Packaging fix: the type gate builds the contract types it reads

- Canonical review report updated: `tickets/done/test-and-tooling-hygiene-294/code-review-report.md` (§ Round 3, Latest Authoritative Result)
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review`. `75e9f323f0` and `340cee3763` change two scripts, one script header and two docs. The gate's rules, baseline and production code are unchanged.
- Triggering role, report path, and finding or scenario IDs: Delivery Engineer, `release-deployment-report.md` (DR-001), Desktop Release run 40640209395; Implementation Engineer, `implementation-handoff.md` (IR-003)
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: `Pass` (CRR-002)
- Current authoritative result: `Pass`
- What changed in the review result and why:
  - The cause is confirmed: `@autobyteus/application-sdk-contracts` tracks no `dist/`, and the gate ran before `prepare-server` built it.
  - The fix builds that one package inside `typecheck`, which is the web package's own declared dependency, so the gate holds standalone and in every chain.
  - IMP-20 reproduces the CI failure before the fix and passes after it on a fresh clone.
- Review gap acknowledged: rounds 1 and 2 could have caught this from source. The gate's place before `prepare-server` and the untracked contracts `dist/` were both visible. No evidence pointed at it, because every run had the `dist/`.
- Supported product scenario / material-premise basis changes: none. (SCN-001 now explicitly includes a fresh CI runner.)

#### Prior Finding Resolution

None open.

- New or remaining finding IDs: none
- Material score or classification changes: none
- Recommended recipient: API/E2E Engineer (rerun the gate and desktop-build validation after the implementation fix); Implementation Engineer, informational.
- Remaining risks or uncertainty: the full CI desktop matrix (5 jobs) is proven only by the next release or build-only run; the build was proven on macOS only.

### CRR-005 — Failure origin: the type gate on the macOS release runner and after a desktop build

- Canonical review report updated: `tickets/done/test-and-tooling-hygiene-294/code-review-report.md` (§ Round 4, Latest Authoritative Result)
- Review entry point and round: API/E2E Failure-Origin Review, round 4
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` § Round 2 (API-REV-002), F-1 and F-2; evidence API-27..API-31
- Relevant solution revision IDs: SR-005
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: DR-001
- Prior authoritative result: `Pass` (CRR-004)
- Current authoritative result: `Fail`, `Local Fix` owned by implementation
- What changed in the review result and why:
  - F-1 is confirmed from the CI job logs: both macOS jobs aborted with SIGABRT, and a reproduction at the runner's default heap matches. It becomes CR-002, runtime-only behavior.
  - F-2 is confirmed from API-30 and from `nuxt.config.ts`: the type project includes the build outputs that the same file already ignores for scanning. It becomes CR-003, an implementation defect with an earlier review gap.
  - Both are in this ticket.
- Supported product scenario / material-premise basis changes: SCN-001 now names the `macos-14` release runner and the release job's chain retry (`release-desktop.yml` L118, L165-170) as supported paths.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-002) | Resolved | IR-002 | unchanged |

- New or remaining finding IDs: CR-002, CR-003
- Material score or classification changes: classification `Local Fix`; CR-002 becomes a `Design Impact` if no heap limit is proven to fit `macos-14`.
- Recommended recipient: Implementation Engineer
- Review gaps acknowledged:
  - round 1 missed CR-003, which was detectable from `nuxt.config.ts`;
  - round 3 accepted the five-job attribution without reading the macOS job logs.
- Remaining risks or uncertainty: whether a heap limit fits the 7 GB runner is unproven. Only a build-only `workflow_dispatch` run (`publish_release: false`) on a pushed ref can prove it.
