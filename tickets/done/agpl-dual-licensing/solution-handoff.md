# Solution Handoff — agpl-dual-licensing, Slice 1 (licence text)

- Result classification: `Architecture Design Complete` (Slice 1)
- Package identifier: `agpl-dual-licensing`
- Current SR: `SR-003`
- Date: 2026-10-08
- Urgency: **Urgent** (user: "lets first work on the license file itself. because its urgent.")

## Original Request And Goal

Project Task from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-08. The goal is to relicense AutoByteus so nobody can take the source, change it, keep it closed and sell it. They must either open-source their version or buy a commercial license.

## Approval Basis

- Requirements `Approved` by the user on 2026-10-08 ("i trust you can pick the best for me … lets go", then "approved"). The user delegated the licence decisions to the Solution Designer.
- Decisions: AGPL-3.0-only + commercial (DEC-001). SDK/devkit/contracts/sample apps stay Apache-2.0 (DEC-002). Holder `Yu Zheng (AutoByteus)` (DEC-003; user may correct at verification). Commercial contact **ryan.zheng.work@gmail.com**, supplied by the user (DEC-004). BingQ needs no action; the user says she is a team member (DEC-005). §7 additional permission for `@anthropic-ai/claude-agent-sdk` (DEC-006). No per-file SPDX headers (DEC-008).
- This handoff covers **Slice 1 only**: REQ-001…006 and REQ-011, with REQ-010 verified manually. REQ-009 (dependency compatibility) is already complete in the investigation notes for the delivery report. Slice 2 (REQ-007 licence in binaries, REQ-008 CLA, REQ-010 automated check) is not part of this handoff.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing/tickets/in-progress/agpl-dual-licensing/requirements-doc.md`
- Investigation notes (incl. dependency-compatibility table and licence option analysis): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing/tickets/in-progress/agpl-dual-licensing/investigation-notes.md`
- Design spec (Slice 1, file-by-file mapping, LICENSING/NOTICE/README content specs, verification commands, sha256 of official texts): `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing/tickets/in-progress/agpl-dual-licensing/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing/tickets/in-progress/agpl-dual-licensing/solution-revision-record.md`
- Supplements: None. Architecture review artifacts: `N/A — not applicable` (Small/Low route, unless the handoff rules require review).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-dual-licensing`
- Branch: `codex/agpl-dual-licensing`
- Base: `origin/personal` @ `a0ded874b0d65f8cda668e440469a0cb6b64126d` (fetched 2026-10-08)
- Finalization target: `origin/personal`

## Classification

- `task_size`: **Small**. About 30 files, all licence text, Markdown and `license` fields in JSON. No code, tests, build, CI or packaging.
- `architectural_risk`: **Low**. No code reads these files. There is no API, persistence, security, concurrency, deployment or ownership change.
- Escalation trigger: any code, test, build or packaging step found to read or copy these files, or any edit needed outside the design's file mapping → Design Impact back to Solution Designer.

## Expected Output

Implementation of the Slice 1 file mapping exactly as in the design spec, verified with the listed sha256/jq/grep/pack-dry-run checks. Then the normal validation and delivery. Delivery must:
- include the dependency-compatibility table from the investigation notes in its report;
- state that a lawyer should review the licence wording, the §7 permission and the commercial terms before publishing (not legal advice);
- obtain the user's explicit verification, which is also where the user confirms the holder name "Yu Zheng (AutoByteus)" and the public contact email;
- after merge, confirm GitHub reports `agpl-3.0` for the repository.

## Open Risks And Follow-ups

- Lawyer review (REQ-011).
- Holder name not yet explicitly confirmed by the user.
- Slice 2 still open: licence copy inside desktop app/Docker/gateway package and macOS About line (REQ-007); CONTRIBUTING + CLA (REQ-008), where the enforcement form (manual vs bot) awaits user confirmation; automated leftover-claim check (REQ-010). Solution Designer will run a separate design round for Slice 2.
- `autobyteus-web/package.json` `author.email` is `team@autobyteus.com`, which the user says does not exist. Out of scope; the user was told.

## Route Record

- `get_handoff_rules` (2026-10-08) matched rule: "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (direct implementation route; independent architecture review skipped, design not skipped). Architecture-reviewer and delivery-receipt rules do not match.
