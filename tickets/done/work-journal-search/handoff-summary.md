# Handoff Summary — work-journal-search (Project Task autobyteus-185)

## What Changed

You and your agents can search past work across every run's Work Journal.

- **Memory page → Search:** type what you're looking for. Results are runs, best first. Each shows where its matching journal lines are, with a short snippet (secrets masked). A text match names the words it found. Notes say plainly which words appear nowhere in your memory. Clicking a match opens the run's Work Journal at those lines.
- **Memory page → Index:**
  - The first build is started by you (**Index now**). It writes Work Journals for old runs, then builds a text index and, in the background, a meaning index with the active embedding model.
  - Progress is shown while it runs, and later runs are kept current within about 20 s of a turn.
  - **Rebuild** after a model change.
- **Agent tool `search_memory`** (native and MCP): an agent whose definition selects it can search the same index. It works best when the request says "search your memory" (O-1).
- There is no strength label: results state facts (UD-020).

## Classification And Route

- `task_size`: Large; `architectural_risk`: High; route: reviewed.
- Reviews and validation:
  - code review CRR-001…CRR-007, the last Pass at 9.4/10;
  - API/E2E API-REV-001 Fail, API-REV-002 Pass, API-REV-003 Pass at 94%;
  - test-code review CRR-006 and CRR-008 Pass.

## Integration

- DR-001 was blocked by conflicts with `origin/personal` @ `f56365c809`: the generated web GraphQL types and the docs module index.
- IR-006 merged the base, regenerated the types and moved `search_memory` onto the platform's tool-result rule. Merge `3d209177ec` contains `origin/personal` `8c31e530d6`.
- At DR-002 the base had not moved.
- Checks on the merge:
  - IMP-32;
  - API-REV-003 on a fresh packaged build;
  - the delivery smoke: memory-search unit and memory E2E pass (7 files, 20 tests). The architecture test's 2 failures are the base's FU-010.

## Verification

- Verified from the evidence; no user check is needed to release. The per-criterion table is in `release-deployment-report.md`.

## Release Decision

**Beta.** You decided this in advance on 2026-10-27, conditional on everything being proven, which it is.

## Before You Build The Index On Your Own Memory (UD-001)

The first **Index now** on your own data writes a Work Journal for every old run (about 3,700) into your memory folder.

- **Back up `~/.autobyteus` memory before that click**, as you decided in UD-001.
- On a copy of your memory on this machine, the build took: journals 57 s, text 2 min 32 s, meaning about 40 min in the background.
- Nothing is written until you click.

## Docs

- New: `memory_search.md` and `scripts/evaluate-memory-search.md`.
- Updated: `agent_memory.md`, `agent_work_journal.md`, `embeddings.md`, `autobyteus-web/docs/memory.md` and `GLOSSARY.md`.
- Delivery added `search_memory` to the MCP adapter list in `agent_tools_mcp_server.md` (`docs-sync-report.md`).

## Residual Risks And Follow-Ups

- Latency was measured on a shared host, not an idle reference machine: p90 537 ms, max 1,013 ms over HTTP at load 7.5 (limits 1 s / 2 s).
- Top 3 on page search: 25/31 = 80.6% at the merge, with Q01 lowered by the test chats themselves (O-3). In-process it was 26/31 = 84%.
- The Windows, Linux and macOS x64 builds were not built here; the release workflows build them.
- Open observations:
  - O-1: tool use depends on phrasing.
  - O-3: runs that only discuss a topic compete with the run that did the work.
  - O-6: right after a restart, "No matches" can show before the absent-words note.
  - C-12: link-only tokens can be named as found words.
  - R-13 and R-3 are accepted.
- Follow-ups FU-001…FU-012 (`follow-ups.md`). FU-010 and FU-011 are base test failures, and FU-012 is the outdated MCP adapter list.
- The design spec's § Match Facts wording (items 1 and 4) is left for the Solution Designer.
