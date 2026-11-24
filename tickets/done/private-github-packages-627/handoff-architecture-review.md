# Handoff — autobyteus-627 Architecture Design Complete (SR-002)

- Package: `private-github-packages-627`
- Task: autobyteus-627 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` for the founder
- Result: `Architecture Design Complete`, task_size `Medium`, architectural_risk `High`. Route: `/architecture_reviewer` (handoff rule: architectural_risk=High)
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/private-github-packages-627`, branch `codex/private-github-packages-627`, base `origin/personal` `e3cf5454a4` (rebased 2026-11-24). Only ticket documents are committed; no code yet. Not pushed.

## Original request and goal

Support importing and updating **private GitHub repositories** for Agent Packages (and Skills, which share the mechanism), cleanly and securely on desktop and Docker nodes. The founder's go-ahead (2026-11-24, verbatim): "Obviously the token should be stored in private vault please send to the software engineering team which earlier worked on the investigation to get started working on it and I mean the token should be stored in private vault". It covers:

- Option A: the node's GitHub fine-grained token in the node's vault, shared with the GitHub integration;
- inline connect;
- Agent Packages + Skills;
- Device Flow deferred.

No release without the founder's word.

## Approval basis

- requirements-doc.md: Approved, SR-002 (founder, 2026-11-24)
- DEC-001..004 decided by the founder; DEC-005 (codeload with header) decided in design
- Design approval by the founder: not required

## Design in one paragraph

Every GitHub request first goes out without a token, exactly as today. Only when GitHub answers "not visible" (401/404) does `GitHubRepositoryClient` read this node's token from the vault and send the request again with it, as a header only:

- Bearer for api.github.com and codeload;
- Basic `x-access-token` for git on github.com.

Each failure gets a distinct message: not connected, token rejected, or no access. The `private` refusal is removed. Archive downloads, which run in two different ways today (agent packages through a generic downloader that logs URLs), become one client method. A new small GraphQL API (`githubConnection`, `connectGitHub`, `disconnectGitHub`) over the existing `IntegrationConnectionService` drives a GitHub connection line in the Agent Packages and Skill sources import areas. Stored records and the vault entry are unchanged.

## What to look at closely

1. **Token custody (REQ-005).**
   - C-3: header only;
   - no credential-bearing URL ever exists, which is why the REST tarball (signed redirect) was rejected;
   - messages carry no token.
2. **Access rule (LS-1) and its outcomes (C-4).** In particular, a rejected token is detected only on REST/ls-refs, because codeload answers 404 to an invalid token (measured, investigation-notes §2.3).
3. **The second connect path without `requireImported`** (C-2), and the existing DEC-015 consequence: removing the GitHub integration also ends private imports.
4. **P16 deviation:** `readNodeGitHubToken` looks up the vault runtime per call.
5. **Removal plan:**
   - generic downloader use;
   - `publicGitHubRequest` rename;
   - unreachable branch-archive path.

## Evidence and risks

- Probes (temporary, removed, never committed): investigation-notes §2.2 and §2.3; raw statuses in probe-627-results.txt.
- `test.github.token` **expires 2026-11-25**: live validation must run before then, or the founder renews it.
- There is no private agent-package fixture repository. The live test proves the transport (metadata, head, archive) on the token's private repository. A full private import is proven through GraphQL with a faked GitHub. API/E2E may ask for an evidence decision.
- Rate-limit gate keyed by host family, not by token: recorded, not designed for.
- codeload's header behavior is undocumented: covered by the live test; the fallback design is named in Risks.

## Follow-ups

- FU-627-01: Application Packages.
- FU-627-02: Device Flow.

See follow-ups.md; not yet sent (they go with the Terminal result).

## Documents

- `tickets/in-progress/private-github-packages-627/requirements-doc.md`
- `.../investigation-notes.md`
- `.../design-spec.md`
- `.../solution-revision-record.md`
- `.../follow-ups.md`
- `.../probe-627-results.txt`

## Expected next step

Independent architecture review of design-spec.md against the approved requirements. On pass, the reviewer routes per its rules (implementation). Findings return to the Solution Designer.

## Route recorded

- 2026-11-24: sent to `/architecture_reviewer` (run `architecture_reviewer_1ac68040fe614b05b08ff5c51a313119`), delivered.
