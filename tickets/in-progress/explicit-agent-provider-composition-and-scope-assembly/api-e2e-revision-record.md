# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `/code_reviewer`; `CRR-002`; round 1 | `SR-001`–`SR-005`, `ARCH-REV-005`, `IR-001`–`IR-002`, `CRR-002` | N/A | **Fail / 63%** |
| `API-REV-002` | `/code_reviewer`; `CRR-004`; round 2 | `SR-006`, `ARCH-REV-006`, `IR-003`, `CRR-003`–`CRR-004` | **Fail / 63%** | **Pass / 96%** |

## Revision Entries

### API-REV-001 — Initial provider-composition execution baseline exposes unreconciled fail-closed defaults

- Trigger: `/code_reviewer`; `CRR-002`; round 1.
- Scenarios: `APIE2E-REPO-FOCUSED-001`, `APIE2E-REPO-AFFECTED-001`, `APIE2E-F001`.
- Result: **Fail / 63%**.
- Direct evidence: focused 15-file/100-test reviewer selection passed, while eight transition-governed affected files failed through incomplete/ambient execution-family construction; isolated subset reproduced 21 failures / 3 passes.
- Durable coverage changes: none.
- Routing: `/code_reviewer` focused origin review; subsequently classified Design Impact and resolved through `SR-006`, `ARCH-REV-006`, `IR-003`, `CRR-004`.
- Canonical evidence: `api-rev-001-*` under `evidence/api-e2e/`.

### API-REV-002 — IR-003 correction and realistic dual-host execution pass

- Trigger: `/code_reviewer`; `CRR-004` Pass / 94.7; round 2.
- Related revisions: `SR-006`, `ARCH-REV-006`, `IR-003`, `CRR-003`, `CRR-004`.
- Prior failure rechecked first: **Yes**. The exact eight `APIE2E-F001` paths passed 64 tests with 8 environment-gated skips and no unrelated global initialization.
- Repository result: structural 121/121; affected 171 Pass / 29 environment-gated Skip; retained 48/48; devkit 21/21; Brief/Socratic build/validate/backend typecheck Pass.
- Real-system result: **Pass** for maintained standalone and Studio Socratic, Studio Brief publication/named handoff/projection, real Codex `gpt-5.6-luna`, private mixed Nested Classroom with AutoByteus `deepseek-v4-flash`, exact nested team/member messages and task lifecycle, context file, route separation, active shutdown, same-data restart/reentry, watcher remount and 140/140 byte parity.
- Cleanup: isolated roots and temporary scripts removed; ports/processes absent; baseline generated-output state restored; sensitive-value scan passed.
- Coverage decisions changed: prior `APIE2E-F001` changed from open failure to **Resolved and confirmed**. Existing current durable tests remain `Still Valid`. No API/E2E-owned repository coverage was added, updated, or removed.
- Characterization note: the full unisolated server suite reported 539 files Pass / 70 Fail / 31 Skip; those unchanged environment/global-fixture-sensitive failures remain separate `Unclear` repository debt and are neither IR-003 attribution nor Pass evidence.
- Prior result/confidence: **Fail / 63%**.
- Current result/confidence: **Pass / 96%**.
- Broader validation: **Required / Completed**.
- Residual risk: live Claude not invoked; Electron shell remains delivery-owned; historical broad-suite characterization remains separate.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `evidence/api-e2e/api-rev-002-*`.
- Recommended recipient: `/code_reviewer` for proportional durable-test review; `Not Applicable` is expected because API/E2E changed no durable test.
