# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-1) | Pass | Fail: implementation Local Fix | CR-001 (new) |

## Revision Entries

### CRR-001: initial implementation review of IR-001 (Pass)

- Canonical review report updated: `tickets/in-progress/agent-avatars-669/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review` of `ea787a37b1..950061c296`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001, Large / High)
- Relevant solution revision IDs: SR-001, SR-002
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass, 9.3 / 10
- What changed in the review result and why:
  - The route's path comes only from the definition's folder and the fixed name, and it re-validates with a regular-file check, `O_NOFOLLOW`, the size limit and magic bytes.
  - The order and the user-picture rules each have one owner, and every input path refuses a package address.
  - One renderer and one reference-counted object-URL cache (a header, not the address, on the phone).
  - The five deviations hold.
  - My re-run: server 439 and web 597 tests passed.
- Supported product scenario / material-premise basis changes: S-1…S-4 established. C-1 and C-2 rejected after checks; C-3 held; C-4 noted.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: C-3 (a transient phone failure shows fallbacks for the session); C-4 (forms at the size limit).

### CRR-002: failure-origin review of API-REV-001 F-1 (a replaced picture keeps its version)

- Canonical review report updated: `tickets/in-progress/agent-avatars-669/code-review-report.md` ("Round 2 Failure-Origin Finding"); `follow-ups.md` (FU-002 added)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin). Read: `definition-avatar-file.ts` (`contentByPath`), `user-file-reply.ts:27`, and the F-1 evidence.
- Triggering role, report path, and finding or scenario IDs: API/E2E, `api-e2e-execution-coverage-report.md` (commit `befbfcd154`): F-1 (AV-02)
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002 (N-3)
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail. The origin is implementation: CR-001, `Local Fix`.
- What changed in the review result and why:
  - The cache's change signal (size and mtime) misses a replacement with the same size in the same whole second, which tar produces, so `?v=` stays old and AC-001 fails for that input.
  - Adding `ctimeMs` and `ino` keeps N-3's purpose (no re-hash of an unchanged file) and fixes it, so this is not a design change. The pinning unit spec is rewritten to the purpose.
  - The shared user-file ETag has the same weakness: FU-002.
- **Review gap I own:** CRR-001 did not test N-3's signal against time-preserving replacements.
- Supported product scenario / material-premise basis changes: S-1 now includes package updates made by time-preserving tools.

#### Prior Finding Resolution

None (CRR-001 had no findings).

- New or remaining finding IDs: CR-001
- Material score or classification changes: runtime correctness is below 9.2 until CR-001 is fixed.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - FU-002 (the shared ETag);
  - C-3, measured by API/E2E (P-002, P-003) as held.
