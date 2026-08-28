# AutoByteus v1.4.62 — Application-Owned Agent Tools

## Added

- Application manifest v5 `agentTools[]` declarations with backend definition v7 `agentToolHandlers`.
- Application-scoped tool composition for AutoByteus, Claude, and Codex without process-global application-tool registration.
- A shared authorization, strict schema-validation, worker-dispatch, bounded-result, and call-lifecycle gateway.
- Deterministic tokenless Agent Tools MCP run-session composition with fresh application routes across activation and restore.
- Serialized package/application catalog transitions that quiesce and drain only the affected application-tool lane.
- Brief Studio's read-only `get_brief_context` teaching workflow.

## Brief Studio Workflow

The shipped researcher and writer each call `get_brief_context` first, retain the returned Brief marker, create their member-workspace artifacts, publish canonical relative paths, and complete the Team handoff. Existing artifact publication and Brief reconciliation—not the read-only context tool—move the same Brief to `in_review` and refresh the UI.

Artifact creation is operation-neutral. Any already-authorized foundation capability supplied by the runtime is valid. Provider/native/normalized operation events remain diagnostic; the authoritative proof is the real artifact and path, publication, handoff/result use, exact identity joins, read-only causality, and same-brief UI result.

## Security And Lifecycle

- Application declarations never enter the shared process registry.
- Platform/static Agent Tools MCP names are reserved from applications.
- Same-name application tools can coexist in separate applications.
- An application route can outrank configured external MCP only inside the exact owning application session.
- General-process, cross-application, stale, forged, and terminal-binding callers fail closed.
- The dedicated Agent Tools listener is process-local, loopback-only, tokenless, and separate from the main Studio/standalone HTTP listener.
- Package quiesce/drain and exact-run session deactivation remain separate lifecycle owners.
- Handler and worker failures are sanitized and are not automatically retried.

## Compatibility

Generated/importable application packages built for manifest v4/backend definition v6 must be rebuilt for v5/v7. Existing application databases, bindings, journals, overrides, Agent/Team definitions, and global MCP configuration remain directly usable; no migration is required. No v4/v6 or bearer-session production compatibility fallback was added.

## Verification

- Original platform scope: API-REV-001 `Pass / 97.2%`, including the decisive `33 files / 234 tests` matrix.
- Agent/browser/lifecycle scope: API-REV-006 `Pass / 98.4%` for AC-032–AC-044.
- Implementation source review: CRR-013 `Pass`.
- Proportional durable-test review: CRR-014 `Pass`, no findings.
- Latest-base integration: `origin/personal` `64cb4e952` merged cleanly at `7ab0a9968`.
- Linux ARM64 Electron package: README-directed build passed; the accepted AppImage was launched with a ready embedded server and visible UI, then closed gracefully after user testing.

## Known Residuals

External provider behavior remains nondeterministic. Supplemental server typecheck retains the pre-existing TS6059 rootDir/include issue. API-REV-005 remains truthful failure history under the superseded zero-shell oracle. Historical API-BROAD-001 failures in five unchanged workspace/run-history files were not represented as feature passes.
