# Handoff Summary

## Summary Meta

- Ticket: `team-run-follows-definition` (Project Task `autobyteus-22`, Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`)
- Date: `2026-11-21`
- Classification: `task_size: Large`, `architectural_risk: High`, reviewed route: architecture review (pass), source review CRR-006 Pass (CR-001..CR-004 resolved), API/E2E API-REV-004 Pass at 95.4%, test-code review CRR-008 Pass (TR-001 resolved).
- Current Status: `Verified from evidence / finalized on personal; no release`
- Branch: `codex/team-run-follows-definition`. Base `origin/personal` @ `a07767f4d0` at bootstrap. Integrated by merge at delivery: `origin/personal` @ `ecd6d4556c` (77 commits) → `e87b6b9ac9`, no conflicts; post-integration checks pass (`evidence/DEL-post-integration/`).
- Product source final at `6c7af4a384` (IR-004); durable tests `443f1c2c0f`, `8789b97a41`, `44fd8d073a`, `6f76db6332`.

## Delivery Summary

- Delivered scope:
  - A standalone Team run, and a copy of a Team definition (local or started by a peer), follow the definition's members, coordinator and handoff rules: live through `TeamDefinitionChangeListener`, or at the next restore. Application runs, configured-placement copies and Org-mounted Teams keep their members (D-SCOPE).
  - A new member joins Offline and starts on first use; `get_handoff_rules` returns the current rules.
  - A removed member becomes a former member (`formerMembers` in the stored tree): refused by address and by run ID (`COLLABORATION_TARGET_NOT_FOUND`, "… is no longer a member of your team …"); history readable by run ID and on the Memory page; re-added at the same address with the same agent, it returns with its conversation.
  - A member removed while busy is **Leaving**: it finishes its turn, can still send, its approvals and interrupt work; Stop or restart clears it.
  - Remaining members get one notice when idle (joined, left, rules changed or unchanged).
  - An unusable definition leaves the run unchanged with `TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run '<id>' keeps its members: <reason>`.
  - Web: the Team tree adds and drops members live; leaving rows are tagged "Leaving" and open the member; the unused `TeamMembersPanel.vue` is removed.
- Docs: by the implementation `agent_team_execution.md`, `agent_communication.md`, `collaboration_model.md`, `GLOSSARY.md`; at delivery `autobyteus-web/docs/agent_teams.md` (`docs-sync-report.md`).

## Verification Summary

- Verified from evidence (delivery's judgement; no user check needed). AC-001…AC-010 are directly proven; the critical evidence was opened (`release-deployment-report.md`, Verification).
- Key evidence:
  - `evidence/API-TF-r4/TF-01..TF-12.json`: built server, scripted AGY; notices, rules, refusal text, Leaving marker and release, warnings, reopen and restart, delegated copy, app save.
  - `evidence/API-TFL-r4/TFL-01.json`, `TFL-02.json`: real Codex lead and native AutoByteus new member; real Codex writer with auto-execute off answering approvals while leaving; the real lead read the exact refusal.
  - `evidence/API-TFU-r3/TFU-*.png`: the rendered Team tree: a new member appears and a removed one goes without a reload; the Leaving tag; a leaving member opened and its approval answered.
  - Integrated state, `evidence/DEL-post-integration/`:
    - server and web typechecks PASS at baseline;
    - ticket server tests 530 passed (65 files); web specs 560 passed (67 files);
    - TF 12/12; two-server suite 51/51; fixture regression 7 passed, 2 skipped; regression suites as validated (projects 24 passed, 1 skipped; run-history 28 passed, 2 skipped; memory 39 passed, 3 skipped, 1 failed: EC-04 as root, FU-005);
    - live TFL 2/2 with real Codex and AutoByteus.
- Secret Gate PASS on the ticket commits and on the merged state; artifact hygiene PASS.

## Residual Risks For The User

- The configured-placement copy and the application Team run "not followed" are proven by unit tests only (API-NF).
- A follower step that throws after a commit skips the rest of that change (declared in the design).
- A definite release-write failure keeps the "Leaving" tag until the next plan (designed).
- Runs were as root in a Linux container: the release job's signing-record unit tests refuse uid 0 (27 tests not proven here), and EC-04 cannot pass as root (FU-005).

## Follow-ups

- `follow-ups.md`: FU-001 (fixed in this ticket), FU-002 (Org-mounted Teams), FU-003 (remote peer link members), FU-004 (**urgent**: the arm64 AppImage runtime needs `libz.so`), FU-005 (EC-04 as root). None added at delivery. The Solution Designer sends them.

## Release

- No release (the user did not ask; RELEASE.md's default). The change ships with the next beta or stable; `release-notes.md` holds user-facing notes for it.
