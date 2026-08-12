# File And Directory Practice Prompt Specification

## Status

Approved intended-behavior authority — approved with `requirements.md` on 2026-08-12.

## Purpose

Define a concise, always-present practice for efficient file and directory discovery, inspection, modification, and verification. This is separate from Bash routing: Bash Operating Practice selects Bash as the primary interface; File And Directory Practice defines how filesystem work should be performed through that interface.

## Proposed Prompt Text

```md
## File And Directory Practice

- Locate files and directories by intent instead of broadly listing them. For content, use targeted searches such as `rg -n "term" path`. For file names, use `rg --files path | rg "pattern"`. Use constrained `find` commands only when filesystem traversal or metadata is the better fit.
- Read only the relevant content. Use `cat` for a complete small file, `wc -l` before a potentially broad read, `sed -n '40,120p' file` for an exact window, and `nl -ba file | sed -n '40,120p'` when line numbers matter. Prefer format-aware readers such as `jq` for structured data.
- Choose the narrowest deterministic edit that matches the file format and change shape. Prefer exact anchors for text, parser-aware tools for structured files, and quoted heredocs for new content. Replace important files through a temporary file when a direct in-place edit is not safely verifiable.
- Use explicit quoted paths and preserve unrelated content and existing changes. Before copying, moving, or deleting, verify the source and destination. Delete only when the task requires it and the target has been verified.
- Keep inspection, modification, and verification as separate commands when a failure would need diagnosis. Verify changes with a fitting check such as `git diff -- path`, targeted `rg`, a format parser, or a project-native test or validator.
```

## Ownership Rules

- This is a structured system-prompt section, not a `SKILL.md` body.
- It follows Bash Operating Practice. Working Environment has already established the workspace and skill-package path namespaces; Bash Operating Practice has already selected the primary interface.
- It owns filesystem navigation, discovery, inspection, modification, and file-level verification guidance.
- Bash Operating Practice must not duplicate the search and file-inspection bullets moved here.
- Tool schemas remain authoritative for parameters, authorization, path containment, and results.
- Domain-specific file formats, repository workflows, artifact requirements, and quality gates remain owned by applicable skills or project instructions.

## Extraction From The Former Skill

The concise section retains the high-value parts of `shell-first-operating-practice/SKILL.md`:

- intent-led `rg`/`rg --files` discovery and constrained `find`;
- bounded `cat`/`wc`/`sed`/`nl` inspection;
- format-aware and change-shape-aware editing;
- quoted explicit paths and guarded copy/move/delete operations;
- separate, fitting verification.

It deliberately omits the former complete command-family catalog, general task loop, communication style, Git lifecycle policy, process/network/archive guidance, and repeated generic model behavior.

## Related Authority

- Consolidated prompt: `system-prompt-contract.md`
- Bash routing: `bash-operating-practice-prompt-spec.md`
- Working environment: `working-environment-prompt-spec.md`
- Requirements: `BEH-010`; `R-012`; `AC-012`
