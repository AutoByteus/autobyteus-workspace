# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer pass handoff, `code-review-report.md` CRR-002; round 1 | SR-004, SR-004b, ARCH-REV-002, IR-002, CRR-002 | N/A | Fail / 87% (requirement proof 50%) |
| API-REV-002 | Code reviewer pass handoff, `code-review-report.md` CRR-005; round 2 | SR-005…SR-006 (UD-020, UD-021), IR-003…IR-005, CRR-003…CRR-005 | Fail / 87% | Pass / 94% |
| API-REV-003 | Code reviewer pass handoff, `code-review-report.md` CRR-007 (latest-base merge, DR-001); round 3 | IR-006, CRR-006, CRR-007, DR-001 | Pass / 94% | Pass / 94% |

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

### API-REV-002 — Rerun after SR-006 (factual notes instead of strength labels); Pass

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-005, Pass), round 2; branch `5b16e1fe4a`, code `3204aa2455`.
- Triggering finding or case IDs: the requested reruns:
  - AC-001 and AC-002, idle machine if possible;
  - AC-007: the F-001 off-topic cues must name their verified-absent key words, no named word may occur, and no strength label anywhere.
- Related revision IDs: API-REV-001, SR-005, SR-005b, SR-005c, SR-006, IR-003, IR-004, IR-005, CRR-003, CRR-004, CRR-005.
- Why this revision was recorded: F-001 needed rechecking after the design change, and the changed result shape (tool, GraphQL, page) needed real-stack proof.
- Coverage decisions or durable test paths changed: none this round. API-D01 is unchanged and awaits test review.
- Cases added, changed, removed, or rechecked (rerun plan in the investigation):
  - reused: IMP-29, IMP-30 (server); IMP-25 web part and IMP-28 (web);
  - rerun: API-R03, API-L02r2, API-L04r2, API-L05r2, API-L08r2, API-L11r2 (spot-check), API-R05;
  - new: API-L14 (the AC-007 fact check with a census);
  - still valid from round 1: API-D01, API-L01, API-L03, API-L06, API-L07, API-L09, API-L10, API-L12, API-L13.
- Commands, environment, fixture, or broader-validation delta:
  - a fresh packaged desktop instance at `5b16e1fe4a` on a new clone of the memory copy;
  - the implementer's SR-006 question file (47 questions);
  - round-2 probes (`-r2`) without the removed `strength` field.

#### Prior Failure Resolution

| Prior Failure ID | Resolution | Proven By Case IDs | Evidence |
| --- | --- | --- | --- |
| F-001 | Resolved by design (SR-006, UD-020). Strength labels are removed: the schema has no `strength`, and the page shows no Strong/Fair/Weak. The 11 F-001 cues name their absent words, with 0 occurrences of each named word in 7,429 journals. The evaluation finds 0 word mismatches over 47 questions, and no text match is without words (0 of 703) | API-L14, API-L04r2, API-L02r2, API-L05r2 | `API-L14-01-offtopic-named-words.txt`, `API-L04r2-01-gates.txt`, `API-L02r2-01-result-cards-and-notes.txt` |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (§ Round 2 Rerun Plan), `api-e2e-execution-coverage-report.md` (rewritten for round 2), `api-e2e-test-progress.md`, `evidence/api-e2e/` (round-2 files; private `r2/`).
- Prior result and confidence: `Fail`, 87%.
- Current result and confidence: `Pass`, 94%. Environment fidelity (90%) is the gap: a shared host, no idle reference machine, and a copy from 2026-10-21.
- New or remaining failure IDs: none. Observation O-6: "No matches" outranks the absent-words note when there are no results, briefly after a restart (the specified order).
- Recommended owner: code reviewer (proportional test review of API-D01).
- Remaining risks, blocked evidence, or untested scope:
  - AC-008 on the user's own memory (the user only);
  - O-1 and O-3;
  - C-12;
  - Windows, Linux and macOS x64 builds.

### API-REV-003 — Latest-base merge (`3d209177ec`); Pass

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-007, Pass), round 3; the merge of `origin/personal` `8c31e530d6` (delivery DR-001, IR-006).
- Triggering finding or case IDs: the reviewer's suggestions:
  - `search_memory` through both entry forms on the packaged merged build: with results, with no results, and an error;
  - a page smoke test.
- Related revision IDs: API-REV-002, IR-006, CRR-006, CRR-007, DR-001.
- Why this revision was recorded: the merge changed shared foundations (Fastify 5 / mercurius 16, `autobyteus-ts`, agent tools, runtimes, Electron) and the tool's serialization. TESTING.md rules 4 and 5 apply.
- Coverage decisions or durable test paths changed: none. API-D01 still awaits test review.
- Cases added, changed, removed, or rechecked:
  - reused: IMP-32;
  - rerun on the merged packaged build: API-R03r3, API-L01r3, API-L07r3, API-L05r3/L06r3 (four states, both forms), API-L08r3, API-L02r3/L03r3, API-L14r3, API-L04r3 (HTTP), API-L11r3, API-L10r3, API-R05r3;
  - still valid: the in-process evaluation (API-L04r2), API-L09, API-L12, API-L13, API-D01.
- Commands, environment, fixture, or broader-validation delta: `pnpm install --frozen-lockfile`; a packaged desktop build of the merge on a fresh clone of the memory copy; a chat helper rewritten for the merged model picker.

#### Prior Failure Resolution

None open (F-001 was resolved in API-REV-002).

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (§ Round 3 Rerun Plan), `api-e2e-execution-coverage-report.md` (round-3 rows, AC proof, cleanup), `api-e2e-test-progress.md`, `evidence/api-e2e/` (round-3 files; private `r3/`).
- Prior result and confidence: `Pass`, 94%.
- Current result and confidence: `Pass`, 94%.
- New or remaining failure IDs: none. Known base failures FU-010 and FU-011 are not this ticket's (IMP-32).
- Recommended owner: code reviewer (proportional test review of API-D01), then delivery.
- Remaining risks, blocked evidence, or untested scope:
  - AC-008 on the user's own memory (the user only);
  - O-1 and O-3 (the merge round's own chats moved Q01 from #3 to #7 in the page search);
  - no idle reference machine;
  - Windows, Linux and macOS x64 builds.
