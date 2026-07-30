# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | Solution designer initial investigation, 2026-07-29 | `N/A` | `Initial Baseline` | Initial scoped read-only configured-skill-root design prepared; later superseded by SR-002 after user workflow clarification. |
| SR-002 | Solution designer follow-up clarification, 2026-07-30 | `BEH-005`, user clarification | `Design Impact / Scope Expansion` | Single-root design is insufficient; revised multi-root capability policy prepared and pending user approval. |
| SR-003 | Solution designer permission-model clarification, 2026-07-30 | `BEH-006`, user clarification | `Design Impact / Simplification` | Multi-root approval UX rejected as impractical; trusted-local mode prepared. |
| SR-004 | Solution designer explicit file-tool contract confirmation, 2026-07-30 | `BEH-001`–`BEH-006`, user clarification | `Requirement Refinement` | Final target is unrestricted absolute read/write/edit for all five generic file tools, with protected AutoByteus internal paths retained; user approval recorded, architecture gate pending. |
| SR-005 | Architecture review Round 1 rework, 2026-07-30 | `ARCH-F-001`, `ARCH-F-002` | `Design Impact / Boundary Correction` | File-tool trusted-local resolver is separated from workspace-contained terminal cwd; approval metadata aligned; architecture re-review pending. |
| SR-006 | Solution designer relative-path usability refinement, 2026-07-30 | `BEH-007`, user proposal | `Design Refinement` | Optional absolute per-call `base_dir` added consistently to all five file tools; architecture re-review pending. |
| SR-007 | Solution designer schema-clarity refinement, 2026-07-30 | `BEH-008`, `REQ-009`, user clarification | `Design Refinement` | Canonical `path`/`base_dir` schema wording and serialized-schema coverage are now required across all five file tools; architecture re-review pending. |
| SR-008 | Architecture review Round 2 plus user schema clarification, 2026-07-30 | `ARCH-F-003`, `BEH-007`, `BEH-008`, `REQ-003`, `REQ-008`, `REQ-009` | `Design Impact / Contract Refinement` | Inventory coherence is corrected; the stricter schema contract now requires `base_dir` for every relative path and requires an absolute path when `base_dir` is omitted; architecture re-review pending. |
| SR-009 | Architecture review Round 3 package-coherence correction, 2026-07-30 | `ARCH-F-003` | `Design Impact / Package Coherence` | Investigation-notes supplement inventory now describes the retained terminal-boundary and strict base-directory/schema evidence; final architecture gate requested. |

## Revision Entries

### SR-001 — Scoped configured-skill read authorization baseline

- Triggering role, report path, and round: `solution_designer`; initial solution round; no prior report (`N/A`).
- Triggering finding IDs: `N/A`.
- Prior authoritative result: `N/A`.
- Current authoritative result: Design-ready requirements and an implementation-aware design spec, with approval pending.
- Why this baseline or revision entry is recorded: Establishes the initial evidence-backed solution for the user-reported `FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT` failure.
- Resolution: Treat the failure as a real bug caused by a missing read authorization invariant for configured server-managed skill roots. Recommend a read-only skill-root extension to the runtime context and a separate readable path resolver; do not restore unrestricted external absolute-path access or grant mutation access to skill roots.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-004`, `REQ-001`–`REQ-005`, `AC-001`–`AC-006` (approval pending).
- Canonical artifacts and sections updated: `requirements.md`, `investigation-notes.md`, `design-spec.md` in the task artifact folder.
- Supplemental artifacts updated, added, or removed: Added `path-authorization-evidence.md` as retained evidence/context; approval `N/A`.
- Downstream and architecture-review impact: Architecture review must confirm the scoped target versus the legacy broad absolute-read expectation and validate context propagation for restored/team AutoByteus runs.
- Next recipient or routing: User for requirements approval, then `architecture_reviewer` with the complete solution package.
- Remaining gaps or risks: User intent on arbitrary absolute paths is not explicit; executable tests and packaged verification are deferred until approval and implementation.

### SR-002 — Multi-root capability policy for skills and project worktrees

- Triggering role, report path, and round: `solution_designer`; follow-up requirements clarification round; no downstream report (`N/A`).
- Triggering finding IDs: `BEH-005`; user clarification that skills commonly live outside the selected workspace and the intended write target may be a separate project/git worktree.
- Prior authoritative result: SR-001's scoped target: configured skill roots readable, workspace-only mutation, arbitrary external paths denied.
- Current authoritative result: Requirements and design are revised to a per-run `FileAccessPolicy` with separate `readRoots`, `writeRoots`, `executeRoots`, and non-overridable denied paths. Managed skills contribute read-only roots; primary/additional approved project/worktree roots contribute writable roots; arbitrary sibling/external paths remain denied by default.
- Why this revision is recorded: The user identified a critical usability impact beyond the original skill-read failure. A skill-only exception would still block ordinary worktree-based implementation and would leave the product's single-root assumption incorrect.
- Resolution: Expand the target to explicit product-controlled root registration at run launch/workspace selection, carry an immutable policy through runtime construction and lifecycle restoration, and use separate operation-specific resolvers. Do not infer worktree authorization from directory adjacency or shell-created directories, and do not restore unrestricted host filesystem access.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-005`, `REQ-001`–`REQ-006`, `AC-001`–`AC-009` (approval pending).
- Canonical artifacts and sections updated: `requirements.md`, `investigation-notes.md`, `design-spec.md`.
- Supplemental artifacts updated, added, or removed: Updated `path-authorization-evidence.md`; added `filesystem-access-policy.md` as an intended-behavior supplement requiring user and architecture approval.
- Downstream and architecture-review impact: Architecture review must validate the run-launch/workspace root-registration boundary, lifecycle propagation, operation-specific resolver APIs, and whether a minimal API/UI extension is required to select an additional worktree.
- Next recipient or routing: User for approval of the revised capability model, then `architecture_reviewer` with the cumulative package.
- Remaining gaps or risks: The repository search found no existing product worktree authorization manager; the exact root-registration surface and local full-access-profile decision remain open. Executable tests and packaged verification remain deferred until approval and implementation.

### SR-003 — Trusted-local mode replaces multi-root approval UX

- Triggering role, report path, and round: `solution_designer`; permission-model clarification round; no downstream report (`N/A`).
- Triggering finding IDs: `BEH-006`; user clarification that auto-approval is the normal local-agent workflow and granular path approval is impractical.
- Prior authoritative result: SR-002's per-run read/write/execute root policy with explicit root registration.
- Current authoritative result: Replace the user-facing multi-root approval model with one trusted-local file-tool contract. Absolute paths are accepted for generic file operations; relative paths remain workspace-relative; no per-path prompt or root picker is added.
- Why this revision is recorded: The user identified approval fatigue as a product-level blocker. A policy requiring users to approve every skill/worktree root would remain barely usable even if technically secure.
- Resolution: Keep the implementation localized to the shared resolver and five file tools. Do not add runtime capability propagation. Preserve protected AutoByteus internal-path denial.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-006`, `REQ-001`–`REQ-006`, `AC-001`–`AC-007` (approval pending).
- Canonical artifacts and sections updated: `requirements.md`, `investigation-notes.md`, `design-spec.md`.
- Supplemental artifacts updated: `path-authorization-evidence.md`, `filesystem-access-policy.md`.
- Downstream and architecture-review impact: Architecture review must validate the intentional trusted-local posture, protected-path preservation, and the absence of unintended changes to terminal policy.
- Next recipient or routing: User for final safety interpretation, then `architecture_reviewer`.
- Remaining gaps or risks: Terminal may have broader process reach; packaged runtime rebuild and executable testing remain deferred.

### SR-004 — Explicit unrestricted generic file-tool contract

- Triggering role, report path, and round: `solution_designer`; explicit user contract confirmation; no downstream report (`N/A`).
- Triggering finding IDs: `BEH-001`–`BEH-006`; user statement: read anywhere, write anywhere, and edit anywhere for `autobyteus-ts` generic file tools.
- Prior authoritative result: SR-003's trusted-local mode recommendation.
- Current authoritative result: `read_file`, `write_file`, `edit_file`, `replace_in_file`, and `insert_in_file` shall accept absolute local paths without workspace containment. Relative paths remain anchored to the workspace. Protected AutoByteus internal paths remain denied under the current server deny configuration.
- Why this revision is recorded: The user removed ambiguity about whether a multi-root capability list or root-registration API is desired.
- Resolution: Simplify the design to one shared resolver contract and symmetric five-tool behavior. Do not add per-root approvals, skill-root propagation, worktree registration, or a generic capability object.
- Approved behavior or requirement IDs affected: `REQ-001`–`REQ-006`, `AC-001`–`AC-007` (user approval recorded; architecture gate pending).
- Canonical artifacts and sections updated: `requirements.md`, `investigation-notes.md`, `design-spec.md`.
- Supplemental artifacts updated: `path-authorization-evidence.md`, `filesystem-access-policy.md`.
- Downstream and architecture-review impact: Architecture review can focus on the resolver implementation, protected-path regression, tool symmetry, and package/runtime compatibility.
- Next recipient or routing: `architecture_reviewer` for re-review after terminal-boundary correction and status alignment.
- Remaining gaps or risks: If protected internal paths are also intended to be accessible, that is a separate high-risk requirement; terminal policy remains contained and unchanged.

### SR-005 — Architecture finding correction: isolate terminal cwd authorization

- Triggering role, report path, and round: `architecture_reviewer`; `design-review-report.md`; Round 1.
- Triggering finding IDs: `ARCH-F-001` (High) and `ARCH-F-002` (Medium).
- Prior authoritative result: SR-004 trusted-local file resolver design reused by terminal `execution-cwd.ts`, with user/safety status fields still pending.
- Current authoritative result: The five file tools retain a trusted-local resolver, while `run_bash` and `start_background_process` use a separate workspace-contained terminal resolver. Requirements, policy supplement, and SR-004 now record user approval; only architecture re-review remains pending.
- Why this revision is recorded: Architecture review found that repurposing the shared resolver would silently widen terminal `cwd` authorization, contradicting the explicit terminal-out-of-scope contract, and found stale approval metadata.
- Resolution: Extract/retain terminal containment before changing the file resolver; add terminal regression coverage; align canonical status fields.
- Approved behavior or requirement IDs affected: `BEH-006`, `REQ-007`, `AC-008`, plus `REQ-001`–`REQ-006` as previously approved.
- Canonical artifacts and sections updated: `requirements.md`, `investigation-notes.md`, `design-spec.md`.
- Supplemental artifacts updated: `path-authorization-evidence.md`, `filesystem-access-policy.md`.
- Downstream and architecture-review impact: Re-review must confirm terminal caller isolation and no accidental widening.
- Next recipient or routing: `architecture_reviewer`.
- Remaining gaps or risks: The exact helper name/placement is implementation-owned; behavior and test boundary are explicit.

### SR-006 — Optional `base_dir` for relative file paths

- Triggering role, report path, and round: `solution_designer`; user follow-up design proposal; no downstream report (`N/A`).
- Triggering finding IDs: `BEH-007`; user concern that the LLM may be confused when relative paths lack an external worktree base.
- Prior authoritative result: SR-005 trusted-local absolute path support with workspace-relative fallback.
- Current authoritative result: All five generic file tools expose the same optional absolute `base_dir`. Relative paths resolve under `base_dir` when provided, otherwise workspace; absolute paths take precedence and ignore `base_dir`; no state persists between calls. Missing both produces an actionable error instructing the model to provide an absolute path or `base_dir`.
- Why this revision is recorded: It improves relative-path usability for external worktrees without introducing persistent CWD state, root registration, or per-call authorization prompts.
- Resolution: Add `base_dir` to the shared resolver interface, all five schemas, tool descriptions, tests, and durable examples. Keep terminal `cwd` separate.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-007`, `REQ-003`, `REQ-008`, `AC-009`, `AC-010` (user-approved design direction; architecture gate pending).
- Canonical artifacts and sections updated: `requirements.md`, `investigation-notes.md`, `design-spec.md`.
- Supplemental artifacts updated: `path-authorization-evidence.md`, `filesystem-access-policy.md`.
- Downstream and architecture-review impact: Architecture re-review should validate schema consistency and deterministic absolute/base precedence.
- Next recipient or routing: `architecture_reviewer` with the cumulative revised package.
- Remaining gaps or risks: The implementation must choose the concrete shared helper name and produce actionable, non-secret-bearing errors.

### SR-007 — Explicit LLM-facing path schema contract

- Triggering role, report path, and round: `solution_designer`; user follow-up clarification that the tool schema itself must teach the LLM how to choose `path` and `base_dir`; no downstream report (`N/A`).
- Triggering finding IDs: `BEH-008`, `REQ-009`.
- Prior authoritative result: SR-006's resolver semantics were defined, but the current schemas still described only absolute/workspace-relative paths and did not expose `base_dir`.
- Current authoritative result: Every generic file-tool schema exposes optional `base_dir` and clearly documents absolute-path precedence, relative `base_dir` resolution, workspace fallback, actionable missing-base behavior, and independence from shell `cd` state.
- Why this revision is recorded: The LLM receives the serialized schema, so resolver behavior alone is insufficient if the schema leaves the selection rules ambiguous.
- Resolution: Add canonical path/base descriptions, keep operation-specific parameters unchanged, and require schema-serialization assertions for all five tools.
- Approved behavior or requirement IDs affected: `BEH-008`, `REQ-006`, `REQ-009`, `AC-011` (user-approved refinement; architecture gate pending).
- Canonical artifacts and sections updated: `requirements.md`, `investigation-notes.md`, `design-spec.md`.
- Supplemental artifacts updated: `filesystem-access-policy.md`, `path-authorization-evidence.md`.
- Downstream and architecture-review impact: Architecture re-review must confirm the schema wording is consistent with the resolver contract and that the added parameter does not alter terminal cwd or approval behavior.
- Next recipient or routing: `architecture_reviewer` with the cumulative revised package.
- Remaining gaps or risks: The implementation must keep schema descriptions synchronized with actual resolver behavior and avoid relying on prose outside the serialized tool definitions.

### SR-008 — Strict relative-path/base-directory schema contract

- Triggering role, report path, and round: `architecture_reviewer` Round 2 (`design-review-report.md`, `ARCH-F-003`) plus the user's follow-up clarification that the schema should say “relative path requires `base_dir`; without `base_dir`, path must be absolute.”
- Triggering finding IDs: `ARCH-F-003`, `BEH-007`, `BEH-008`, `REQ-003`, `REQ-008`, `REQ-009`.
- Prior authoritative result: SR-007 and Architecture Round 2 allowed relative paths to fall back to the configured workspace when `base_dir` was omitted.
- Current authoritative result: Absolute `path` works without `base_dir`; relative `path` requires an explicit absolute `base_dir`; a relative path without it returns actionable guidance. No workspace, process-CWD, or shell-`cd` fallback is used for generic file tools.
- Why this revision is recorded: The user wants the serialized schema to give the LLM a binary, unambiguous choice: send an absolute path, or send a relative path together with `base_dir`.
- Resolution: Update the requirements, investigation notes, design spec, policy supplement, evidence matrix, examples, and schema-test scope. Align the path-evidence inventory ranges required by `ARCH-F-003`.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-007`, `BEH-008`, `REQ-003`, `REQ-008`, `REQ-009`, `AC-007`, `AC-009`–`AC-011` (user-approved refinement; architecture re-review pending).
- Canonical artifacts and sections updated: `requirements.md`, `investigation-notes.md`, `design-spec.md`.
- Supplemental artifacts updated: `filesystem-access-policy.md`, `path-authorization-evidence.md`.
- Downstream and architecture-review impact: Architecture must re-review the strict relative-path contract as a new design refinement; implementation must not retain workspace fallback or rely on schema prose that differs from resolver behavior.
- Next recipient or routing: `architecture_reviewer` with the cumulative package and Round 2 report.
- Remaining gaps or risks: This deliberately removes the convenience of implicit workspace-relative file paths; tool errors and schema descriptions must make the required pairing explicit.

### SR-009 — Align investigation supplement inventory scope

- Triggering role, report path, and round: `architecture_reviewer` Round 3 (`design-review-report.md`, `ARCH-F-003`).
- Triggering finding IDs: `ARCH-F-003`.
- Prior authoritative result: The strict relative-path/base-directory contract passed behavioral and structural review, but the investigation-notes inventory still described both supplements using their older narrower scopes.
- Current authoritative result: The investigation inventory now names the retained terminal-boundary and strict base-directory/schema evidence for `path-authorization-evidence.md`, and the intended LLM-facing schema/terminal policy scope for `filesystem-access-policy.md`.
- Why this revision is recorded: Supplemental inventory must remain a truthful cumulative package index for downstream reviewers.
- Resolution: Update only the investigation-notes inventory purpose/scope rows; no behavioral or security design change was made.
- Approved behavior or requirement IDs affected: None; the already reviewed strict contract remains unchanged.
- Canonical artifacts and sections updated: `investigation-notes.md` supplemental inventory.
- Supplemental artifacts updated: None.
- Downstream and architecture-review impact: Final architecture gate can review the now-coherent cumulative package.
- Next recipient or routing: `architecture_reviewer` for final gate decision.
- Remaining gaps or risks: No known solution-package coherence gap remains; implementation has not started.
