# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `/code_reviewer`; `CRR-002`; round 1 | `SR-001`–`SR-005`, `ARCH-REV-005`, `IR-001`–`IR-002`, `CRR-002` | N/A | **Fail / 63%** |
| `API-REV-002` | `/code_reviewer`; `CRR-004`; round 2 | `SR-006`, `ARCH-REV-006`, `IR-003`, `CRR-003`–`CRR-004` | **Fail / 63%** | **Pass / 96%** |
| `API-REV-003` | `/code_reviewer`; `CRR-006`; round 3 | `SR-007`–`SR-008`, `ARCH-REV-007`–`ARCH-REV-008`, `IR-004`, `CRR-006`, `DR-001` | **Pass / 96%** pre-merge characterization | **Pass / 97%** current-head execution |

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

### API-REV-003 — Latest-Personal semantic integration and current realistic-system matrix pass

- Trigger: `/code_reviewer`; `CRR-006` Pass / 94.3; round 3.
- Related revisions: `SR-007`–`SR-008`, `ARCH-REV-007`–`ARCH-REV-008`, `IR-004`, `CRR-006`, `DR-001`.
- Prior-result handling: API-REV-002 remained a useful pre-merge baseline only. Every material IR-004 server/web, stopped-run, retained application and real-system boundary was rerun on reviewed HEAD `2625f2b7d053e1b8e8009d21f5583b32fc55ba34`.
- Repository result: CRR-006 server **21 files / 163 tests Pass**; CRR-006 web **11 files / 124 tests Pass**; stopped-run/recovery **7 files / 33 tests Pass**; retained application/MCP/recursive-Team/history **11 files / 48 tests Pass**; context web **2 files / 8 tests Pass**; frontend SDK **12/12**; devkit **21/21**; both maintained applications build/validate/typecheck Pass; current existing-run browser probe and Nuxt production build Pass.
- Real-system result: **Pass** for private Nested Classroom with Teacher Codex `gpt-5.6-luna` and nested AutoByteus `deepseek-v4-flash`; exact Team/member/task routing; stopped Save/network-fresh reopen/restore; standalone and Studio Socratic; Studio Brief real publication, recipient-name handoff and artifact projection; internal-versus-external route separation; active shutdown; same-data restart/recovery/remount; and **99/99** tracked application-byte parity.
- Coverage decision: existing current durable coverage remains `Still Valid`. API/E2E added, updated and removed **no repository-resident durable test**. Environment-specific real-provider/browser/private-package orchestration remained temporary executable evidence.
- Cleanup: owned listeners/processes and isolated root removed; temporary scripts removed; generated-output entry state restored; `git diff --check` passed; 12 secret-like values scanned across ticket/evidence with zero exact matches.
- Harness characterization: five overly literal temporary-harness assumptions were corrected and the same public journeys passed; no product or durable-test change resulted.
- Prior result/confidence: **Pass / 96%** pre-merge characterization.
- Current result/confidence: **Pass / 97%** current-head execution.
- Broader validation: **Required / Completed**.
- Residual risk: live Claude was not invoked; Electron shell remains delivery-owned; historical full-suite/global-fixture-sensitive debt remains separate `Unclear` characterization and is not IR-004 evidence.
- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `evidence/api-e2e/api-rev-003-*`.
- Recommended recipient: `/code_reviewer` for proportional durable-test review; `Not Applicable` is expected because API/E2E changed no durable test.
