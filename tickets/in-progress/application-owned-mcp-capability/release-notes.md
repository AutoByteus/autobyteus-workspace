# Release Notes — Application-Owned MCP Capability

`Unpublished pre-verification draft.`

## Added

- Application manifest v5 `agentTools[]` declarations and backend definition v7 `agentToolHandlers`.
- Application-scoped tool composition for AutoByteus, Claude, and Codex application runs without process-global application tool registration.
- One common authorization, schema-validation, worker-dispatch, result-validation, and call-lifecycle gateway.
- Serialized staged package/application catalog transitions with affected-call drain, worker stop, paired bundle/tool commit, targeted recovery, and quarantine/rollback handling.
- Brief Studio's read-only `get_brief_context` demonstration.

## Maintained Brief Studio Workflow

The shipped `codex_app_server` / `gpt-5.6-luna` researcher and writer each call `get_brief_context` exactly once at their role boundary, retain the returned Brief identity marker, create their canonical workspace-relative files with Luna's built-in `apply_patch`, and publish those paths. The researcher sends the complete research body to the writer; the writer performs no cross-workspace file read and carries a deterministic evidence bullet into the final brief.

The file-operation layers remain distinct:

`model-facing apply_patch -> Codex native item/fileChange/file_change -> AutoByteus normalized edit_file evidence`

Existing final-artifact publication and Brief reconciliation—not the read-only context tool—move the same Brief to `in_review` and refresh the existing UI.

## Security And Isolation

- Application declarations never enter the shared process registry.
- Platform/static Agent Tools MCP names are reserved from applications.
- Same-name application tools can coexist across applications.
- An application route can outrank a configured external MCP tool only inside the owning application's session.
- General-process, other-application, stale, forged, and terminal-binding callers fail closed.
- Handler errors and worker transport failures are sanitized and are not automatically retried.

## Compatibility And Data

- Current generated/importable application packages must be rebuilt from manifest v4/backend definition v6 to v5/v7.
- Existing application databases, platform bindings/journals/overrides, Agent/Team definitions, and global MCP configuration remain directly usable; no migration is required.
- No v4/v6 production fallback was added.

## Verification

- Original platform scope: API-REV-001 `Pass / 97.2%`, including the decisive `33 files / 234 tests` matrix.
- Renewed actual-Agent/browser scope: API-REV-004 `Pass / 97.6%`; `AC-032`–`AC-039` all passed through the actual shipped Luna Team and supported browser UI.
- Exact live provider regression: `1 passed / 9 skipped` in `13.65s`.
- Proportional durable test-code review: CRR-009 `Pass`, no findings.

## Known Residuals

External provider availability/behavior remains nondeterministic. Supplemental server typecheck still encounters the pre-existing TS6059 `rootDir/include` configuration defect. One evidence observer saw a transient SQLite lock and resumed; Codex used bundled bubblewrap because the system copy was absent. Historical API-BROAD-001 failures in five unchanged workspace/run-history files were not represented as ticket passes.

## Publication Status

No version bump, package publication, tag, release, or deployment is part of the approved scope. Repository finalization waits for explicit user verification.
