# API/E2E Coverage Investigation — openai-gpt-6-1-terra (autobyteus-336)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001); `evidence/` (IMP-01..IMP-07)
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (Small / Low, direct route)
- Implementation Handoff: `implementation-handoff.md` (IR-001); Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Record: `N/A — not applicable` (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1; Trigger: IR-001 from `/software_engineering_team/implementation_engineer`, 2026-10-30
- Latest Authoritative Investigation: this file, round 1

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/openai-gpt-6-1-terra`, branch `codex/openai-gpt-6-1-terra`, HEAD `fb1c738f19`, base `8df659441f` (`origin/personal` has since moved to the release bump `d31c92adfc`; `git diff origin/personal...HEAD` shows only this ticket's six files).

## Current Requirement And Design Basis

Add `gpt-6.1-terra` to the AutoByteus OpenAI catalog (metadata, reasoning none..max default medium, images only; prices $1 / $0.05 / $1.25 / $5 and the 272K tier), make it the two live Codex tests' default, and add a TESTING.md rule. Nothing else changes.

## Supported Scenarios And Real Usage

- SCN-A1: the user opens Settings / a model picker: the server's catalog (`providerModelCatalogSnapshots`, the web's `GetProviderModelCatalogSnapshots` query) lists terra with its limits and reasoning options.
- SCN-A2: a native AutoByteus agent run on terra through the server; the run's token usage summary (`getAgentRunTokenUsageSummary`) carries a cost estimate at terra's prices; the image read works and audio is refused (capabilities).
- SCN-A3: a Codex runtime run on terra through the server, priced from the same catalog.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | catalog data, pricing helper | unit tests (IMP-01..03) | server catalog and pricing lookup on real runs | server journey |
| API / transport / contract | Yes (data only) | model list over GraphQL | none | the list as the web reads it | server GraphQL |
| External integration | Yes | OpenAI API on terra; Codex CLI on terra | IMP-05 (one call), IMP-07 (loopback) | real run through the server; Codex paid run | live server runs |
| Others | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `/TESTING.md` (worktree copy, including the new "Live Codex model" rule). Clean env for E2E; test vault; real HOME/USER/LOGNAME and a throwaway `CODEX_HOME` (auth symlink) for Codex; small inputs.

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..005 (repository) | catalog, Codex surface | Reused | IMP-01..IMP-07 | code unchanged since |
| API-02 | AC-001 | server catalog (Settings list) | Temporary Probe | in-process studio server (test vault): `ensureProviderModelCatalog(OPENAI)` then the web's `providerModelCatalogSnapshots` fields; terra's position, limits, reasoning schema | the server catalog as the UI reads it |
| API-03 | AC-001, AC-002 | native run on terra | Temporary Probe | plain agent (`read_file`): a short reply; the green image; an audio file; then `getAgentRunTokenUsageSummary(runId)` cost fields | real run with a cost estimate |
| API-04 | AC-002, AC-004 (rule) | Codex run on terra | Temporary Probe | Codex runtime run on `gpt-6.1-terra`, reasoning medium (throwaway `CODEX_HOME`), a short reply, then its token usage summary | the optional paid Codex run |

- Test progress log needed: `Yes`.

## Durable Coverage To Add / Update / Remove

None.

## Not Tested / Infeasible / Deferred

None planned.

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`; Durable coverage changes: `No`; Reroute: `No`.
