# Architecture Review Revision Record — arm64-appimage-libz (autobyteus-28)

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete SR-001 | SR-001 | N/A | Pass | None (notes N-1; residual R-1..R-4) |
| ARCH-REV-002 | Round 2 / Architecture Design Complete SR-002 (after implementation IR-001) | SR-001, SR-002 | Pass (SR-001) | Pass | N-1, R-1, R-2 obsolete; R-3 carried; R-4 resolved; new notes N-2, N-3; residual R-5, R-6 |

## Revision Entries

### ARCH-REV-001 — Initial review of the static arm64 runtime and clean-image gate

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/design-review-report.md`
- Review round and trigger: round 1; Architecture Design Complete from `/solution_designer`, 2026-11-21.
- Triggering role, report path, and finding IDs: Solution Designer, `handoff-sr001.md`; N/A.
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: N/A
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: baseline. Behavior basis BEH-001..004 confirmed against the code and electron-builder 26.18.0 source; classification `Medium`/`High` confirmed; enterprise-flavor premise P-001 recorded `Not Reachable`.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none blocking; implementation note N-1 (toolset return type must be electron-builder's literal union).
- Material classification changes: None.
- Recommended recipient: implementation engineer.
- Remaining risks or uncertainty: R-1 (toolset `lib/arm64` copied into `usr/lib`, inert), R-2 (x64 legacy image now assembled by JS path, runtime identical), R-3 (toolset 1.0.3 labelled beta), R-4 (`ubuntu:24.04` tag, not digest); RSK-001, RSK-002, DEC-005 upstream.

### ARCH-REV-002 — Re-review of SR-002: static arm64 runtime on electron-builder 25 through a prepared toolset folder

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/design-review-report.md`
- Review round and trigger: round 2; Architecture Design Complete SR-002 from `/solution_designer`, after implementation Design Impact IR-001 (`implementation-design-impact-ir001.md`), 2026-11-21.
- Triggering role, report path, and finding IDs: implementation engineer, `implementation-design-impact-ir001.md`, IR-001 (electron-builder 26 drops `resources/server/node_modules` on all targets and re-hoists `app.asar`).
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Pass` (ARCH-REV-001, SR-001)
- Current authoritative decision: `Pass`
- What changed in the review result: the SR-001 mechanism (electron-builder 26 `toolsets`) was superseded. Reviewed the new mechanism against electron-builder 25.1.8 source and `build.ts`: `ELECTRON_BUILDER_CACHE` set only around the sequential arm64 `build()`, a temp-then-rename folder, a pinned reuse check and a runtime-prefix assertion. Confirmed that the SR-002 requirement text changes (DEC-001, DEC-004, QR-002) keep the approved intent. Noted for the review's own record: ARCH-REV-001 accepted the upgrade's all-target risk on an escalation trigger and a risk row rather than a measured upgrade-alone comparison (design Case 27). This round checked the narrower blast radius directly: no env or config change for x64/macOS/Windows, and the packaged `package.json` strips `devDependencies`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| N-1 (toolset return type) | Open note | Obsolete | SR-002 | No `toolsets` config in SR-002 |
| R-1 (`lib/arm64` copied into `usr/lib`) | Residual | Obsolete | SR-002 | arm64 stays on app-builder 25's legacy path, which copies toolset libraries only for x64/ia32 |
| R-2 (x64 built by the JS path in 26) | Residual | Obsolete | SR-002 | electron-builder stays 25.1.8; x64 path untouched |
| R-3 (toolset 1.0.3 labelled beta) | Residual | Carried | SR-002 design § Risks | Runtime file sha256-pinned; AC-001..003 |
| R-4 (`ubuntu:24.04` tag, not digest) | Residual | Resolved (accepted, recorded) | requirements DEC-004 (SR-002) | DEC-004 states tag + fail-closed assertion |

- New or remaining finding IDs: none blocking; implementation notes N-2 (assertion requires at least one produced AppImage) and N-3 (one `tar` mechanism).
- Material classification changes: None (`Medium`/`High`; the High rationale is now the arm64 artifact, pinned downloads and RSK-003).
- Recommended recipient: implementation engineer.
- Remaining risks or uncertainty: R-3, RSK-003, R-5 (local cache reuse verifies runtime + `mksquashfs` only), R-6 (other app-builder downloads during the arm64 build land under the prepared root), DEC-005, RSK-001.
