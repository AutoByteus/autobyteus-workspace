# Solution Result — Revised Architecture Design Complete (SR-004)

- Package: `agy-native-image-output-path`
- Result: **Revised Architecture Design Complete** (SR-004, resolves ARCH-REV-001); `task_size=Small`, `architectural_risk=High`
- Prior review: ARCH-REV-001 Fail — Design Impact on SR-003 basis (`design-review-report.md`, `architecture-review-revision-record.md`). Not a pass on SR-004.
- ARCH-001 → option (a): resolved result `{provider_state:"DONE", output:<bounded AGY output text>, file_path:<abs>}`; reader returns `outputText`. ARCH-002 → requirements/investigation status text updated (no behavior change). Residual never-throw note → reader wraps all fs calls (`READ_FAILED`); converter guards resolver (`RESOLVER_FAILED`) + throwing-resolver test.
- Route (from `get_handoff_rules`): High risk ⇒ `/architecture_reviewer` for independent architecture review. No implementation handoff sent.
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path` (branch `codex/agy-native-image-output-path`, base `origin/personal@fcd3e83a4`, finalization target `personal`).

## Original Request
User runs Daily Assistant on the Antigravity CLI (AGY) runtime. Native `generate_image` tool card shows `{"provider_state":"DONE","output":null}` while the model can state the image path. User asked for experiments and, after reliability evidence, directed implementing a bounded read so the tool result shows the path ("I think it's worth it"; "Okay, then go ahead…").

## Goal / Expected Output
Canonical AGY `generate_image` success includes `file_path` (absolute image path AGY saved), shown on the Activity card and — via the unchanged shared file-change pipeline — in Artifacts; `generate_image` parameters visible like other native tools; safe fallback to today's result if unresolved.

## Key Evidence
- AGY 1.2.12 stream-json omits `output` for `generate_image` DONE (but includes it for `run_command`).
- AGY writes the tool result to `~/.gemini/antigravity-cli/brain/<conversationId>/.system_generated/steps/<step_index>/output.txt` (`Generated image is saved at <abs path>.`), present at DONE time; `step_index` matches the stream.
- 8/8 correct: user's real AutoByteus run, one-shot, production stdin stream-json multi-turn, 2 parallel images in one turn, resumed `--conversation`. Pre-2026-08-11 conversations lack `steps/` (layout drift once) ⇒ fallback mandatory.
- Conversation id already held by `AgyAgentRunBackend` (`runtimeContext.conversationId`); no search.

## Approval Basis
Requirements Approved 2026-09-28 (see `requirements-doc.md` Document Status). DEC-001 (Artifacts) and DEC-002 (show args) delegated by the user to design; resolved as B-by-parity and show-args. This supersedes, for this single-file mechanism only, the prior ticket `tickets/done/agy-runtime-image-codex-prep-20260926` REQ-002 exclusion (no transcript scan, copy or turn gating is reintroduced).

## Review Focus Requested
Containment/symlink/size policy of the reader; serving a realpath-contained `~/.gemini` image via the existing content route; sync read inside `convert`; drift fallback and warning; removal of `generate_image` special cases; test plan incl. live e2e.

## Artifacts (absolute paths)
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/requirements-doc.md`
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/investigation-notes.md`
- Design: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/design-spec.md`
- Prior review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/design-review-report.md`
- Revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/solution-revision-record.md`
- Probe evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-native-image-output-path/tickets/in-progress/agy-native-image-output-path/probe-evidence/`
- Product/UI supplements: N/A — not applicable. Prior architecture review artifacts: ARCH-REV-001 (Fail on SR-003) — `design-review-report.md` and `architecture-review-revision-record.md` in the same folder.

## Open Risks
Undocumented AGY layout drift (mitigated by fallback + warning + live e2e). No blockers.

## Next Expected Action
Focused independent re-review of SR-004 (ARCH-001/ARCH-002); on Pass, normal implementation route.
