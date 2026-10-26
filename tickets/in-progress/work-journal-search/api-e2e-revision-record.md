# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer pass handoff, `code-review-report.md` CRR-002; round 1 | SR-004, SR-004b, ARCH-REV-002, IR-002, CRR-002 | N/A | Fail / 87% (requirement proof 50%) |

## Revision Entries

### API-REV-001 — Baseline validation; off-topic cues get Strong meaning matches (F-001)

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-002, Pass), round 1; reviewed source `41501c5a41`.
- Triggering finding or case IDs: the reviewer's list of what to validate:
  - AC-012 / AC-013 with real agents, including the MCP path;
  - AC-009 in the running app, including a turn during a build (CR-001);
  - coverage while agents work (CR-002);
  - gate-2 latency;
  - restart;
  - model change and Rebuild;
  - imported sources;
  - a multi-MB journal;
  - the Electron Memory page;
  - the first build on a real data copy.
- Related revision IDs: SR-004, SR-004b, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002.
- Why this baseline was recorded: the first complete API/E2E result.
- Coverage decisions or durable test paths changed: added the AC-006 discovery test (API-D01, commit `06fdc1306a`).
- Cases added, changed, removed, or rechecked:
  - repository: API-R01, API-R02 (reused IMP-16, IMP-09, IMP-10), API-D01, API-R03, API-R04, API-R05;
  - journeys: API-L01…API-L13;
  - the F-001 off-topic probe.
- Commands, environment, fixture, or broader-validation delta:
  - a packaged desktop instance on a test-owned clone of the real-size memory copy (3,680 runs);
  - Codex (MCP) and AutoByteus (LM Studio) runtimes;
  - a second instance as the Memory Sync source;
  - a Docker image runtime check.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-progress.md`, `evidence/api-e2e/`.
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 87% overall (requirement and acceptance-criteria proof 50%).
- New or remaining failure IDs: F-001. AC-007 / R-009: 9 of 11 off-topic cues (key words occur in no journal) get `MEANING/STRONG` matches and no only-weak note. The cues score 0.77–0.80 on journal cards, on Granite's Project-Task `clearMatchFloor` 0.78.
- Recommended owner: failure-origin review by the code reviewer; preliminary `Design Impact` → Solution Designer.
- Remaining risks, blocked evidence, or untested scope:
  - observations O-1…O-5 in the report;
  - AC-008 on the user's own memory (the user only);
  - Windows, Linux and macOS x64 builds.
