# Implementation Revision Record — autobyteus-627 Private GitHub Repositories

The current code and [implementation-handoff.md](implementation-handoff.md) are authoritative. This record indexes
the implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, [design-review-report.md](design-review-report.md), round 1 (Pass) | N/A (AR-001 measured) | `Initial Baseline` | SR-002, ARCH-REV-001, CRR-001 | Implemented; code review CRR-001 Pass (9.5/10), sent on to API/E2E |

## Revision Entries

### IR-001 — Access rule in the GitHub client, `downloadArchive`, the GitHub connection API and line

- Triggering role, report path, and round: architecture reviewer, `design-review-report.md`, ARCH-REV-001 Pass
  (round 1), 2026-11-24.
- Triggering finding IDs: N/A. AR-001 (non-blocking, a measurement) was measured first: with the valid test token,
  ls-refs to a repository the token can't read answers **404** (REST 404, codeload 404), so the design's C-4 mapping
  holds and no Design Impact was raised (evidence IMP-01; also asserted in the durable live test, IMP-02).
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: implementation complete at the IR-001 commits (see the handoff).
- Related solution revision IDs: SR-002.
- Related architecture-review revision IDs: ARCH-REV-001.
- Related code-review revision IDs: CRR-001 (Pass, 9.5/10, [code-review-report.md](code-review-report.md); informational:
  the stale-error-after-Connect point accepted as designed; docs item C-01 goes to delivery's documentation sync).
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the initial implementation of the reviewed design.
- Approved behavior or requirement IDs affected: REQ-001…REQ-007, AC-001…AC-007, BEH-001…BEH-004.
- Implementation delta:
  - `github-request.ts` (renamed from `public-github-request.ts`): `gitHubRequest` with a `token` option; the
    credential header per host (C-3), computed per redirect hop after `familyOf`.
  - `node-github-token.ts`: `GitHubTokenReader`, `readNodeGitHubToken` (NOT_FOUND → null; other vault errors thrown).
  - `GitHubRepositoryClient`: required `readToken`; the access rule (LS-1) for every request; the C-4 texts;
    `downloadArchive` (codeload, commit-pinned, `wx`, 0600, 120 s); the `private` refusal and "clone locally" texts
    removed.
  - Installer takes `githubClient`; the generic downloader, its options and the unreachable branch-archive path
    (`buildGitHubRepositoryArchiveUrl`) are removed. Agent package service builds one client and gives it to the
    installer and the update owner. Skill repository takes the client; its `download` and options are removed.
    Skill source service and the Codex strategy construct the client with `readNodeGitHubToken`.
  - GraphQL `GitHubConnection`, `githubConnection`, `connectGitHub`, `disconnectGitHub`; both connect paths share
    `requireToken`.
  - Web: `GitHubConnectionLine.vue`, `githubConnectionStore.ts`, `graphql/githubConnection.ts`, the line in the
    Agent Packages import box and the Skill sources dialog, en and zh-CN texts, codegen, the iOS demo's
    unreachable-operations list.
  - Docs and glossary.
- Changed files or areas: see the handoff's Key Files.
- Local validation and result: all pass — IMP-01, IMP-02, IMP-04, IMP-06…IMP-13 (IMP-03/IMP-05 superseded by IMP-11/IMP-12); see the handoff.
- Next recipient or routing: `/code_reviewer` (architectural risk High).
- Remaining limitations or risks: see the handoff's Known Risks (test token expiry 2026-11-25; codeload's header
  support is undocumented; Docker AC-006 left to API/E2E).
