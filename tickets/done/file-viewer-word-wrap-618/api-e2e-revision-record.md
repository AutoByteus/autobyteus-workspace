# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md`, round 1 | `implementation-revision-record.md` (round 1) | N/A | Pass / 95% |

## Revision Entries

### API-REV-001 — Wrap on by default, rendered at both widths, and a wrapped file is edited and saved

- **Triggering role, report and round:** the implementation engineer's handoff IR-001 (direct route, Small/Low), round 1.
- **Triggering finding or case IDs:** none. This is the baseline. The handoff's downstream hint was "editing and save with wrap on (REQ-003) in desktop edit mode".
- **Related revision IDs:** the implementation round 1 (`77045f2a5d`, `0f5e844087`).
- **Why recorded:** the first completed validation result.
- **Durable test paths changed:**
  - `mobile-file-word-wrap-cases.mjs`:
    - MSP-110 added;
    - a JSON highlighting check added to MSP-108 and MSP-109;
    - a shared desktop setup.
  - `mobile-shell-probe.mjs`: the header line.
- **Cases:**
  - IMP-01, IMP-02, IMP-03 and IMP-05 are reused.
  - AE-001 (MSP-108, MSP-109) was run by me on fresh builds.
  - AE-002 (MSP-110) is new.
- **Commands, environment and broader validation:**
  - The server and phone bundles were built under the clean env.
  - The probe ran with `--cases=MSP-108,MSP-109,MSP-110`, also under the clean env.
  - Broader validation: `Required`, done as `Browser`.

#### Prior Failure Resolution

None. Run1 inside this round failed on test-side causes only, both fixed before run2:

- the YAML highlighting expectation, which became FU-003;
- MSP-110 pressing Escape, which leaves the full view.

The run1 log is `evidence/AE-run1-test-side-failures.log`.

- **Canonical artifacts updated:**
  - `api-e2e-coverage-investigation.md`;
  - `api-e2e-execution-coverage-report.md`;
  - `api-e2e-test-progress.md`;
  - `follow-ups.md` (FU-003);
  - `evidence/AE-*`.
- **Prior result and confidence:** N/A.
- **Current result and confidence:** Pass, 95%.
- **New or remaining failure IDs:** none.
- **Recommended owner:** `/delivery_engineer`.
- **Remaining risks:**
  - The founder's own files on his stack, which only he can check.
  - FU-002, the 131 px panel.
  - FU-003, YAML not highlighted. This is pre-existing.
