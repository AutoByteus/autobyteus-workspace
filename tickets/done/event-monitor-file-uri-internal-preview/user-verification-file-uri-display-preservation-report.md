# User Verification Report: `file:///` Markdown Link Display and Activation

## Status

- **Status:** Requirements-basis supplement; user-approved visual intent plus clarified runtime availability contract
- **Approval applicability:** Applicable for the visible label and lexical-invalid inert behavior. The remote-unmapped result is an implementation/architecture boundary decision, not established by the screenshots.
- **Scope:** Standard Markdown links with local `file:///` destinations in the central Event Monitor
- **Related core artifacts:** [`task.md`](./task.md), [`requirements.md`](./requirements.md), [`investigation-notes.md`](./investigation-notes.md), [`design-spec.md`](./design-spec.md)

## Evidence

The user supplied screenshots showing Markdown-style file links whose visible file names are underlined while a long `file:///Users/...` destination is also visible in the message flow. The links currently open the browser/native file handler rather than AutoByteus Files.

Reference images:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ef49d45255034cdf9b4c0411c380cfd1/solution_designer_f8adb9ecc8844afca985ef2b4b0996c2/context_files/ctx_f0ff3301dd3f__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_ef49d45255034cdf9b4c0411c380cfd1/solution_designer_f8adb9ecc8844afca985ef2b4b0996c2/context_files/ctx_75f18d82d614__image.png`

The user subsequently clarified the desired interaction:

1. Keep the familiar Markdown file-label presentation, without a separate bordered action button or redundant visible `Open`/`in Files` wording.
2. For a valid complete supported local file URI, make the visible file label activate the internal read-only Files preview instead of the browser.
3. For an invalid, incomplete, unsupported, or otherwise lexically unusable URI, preserve its current display but make it non-clickable/inert. It must not open a browser or native file handler.
4. A syntactically valid supported URI may be unavailable in a browser/remote runtime if it is outside the active workspace or cannot be mapped. That case keeps the normal valid-link affordance, but explicit activation returns the existing localized host-only/unavailable status without opening Files, requesting mobile preview, or fetching content.

## Decision

The supplement defines product intent, not implementation mechanics. The authoritative requirements are:

- valid URI with an available owner: authored label, existing Markdown visual treatment, internal read-only Files action;
- invalid/unsupported URI: current source-faithful display, inert Event Monitor semantics;
- valid but remote-unmapped URI: normal valid-link affordance, activation-time host-only/unavailable status, and no Files/content request;
- no new visible action button and no persistent reference/artifact side effect.

The long destination must not be duplicated as a generated action label. If the existing Markdown renderer exposes the destination as part of the current source representation for an invalid link, that representation remains intact; validity does not authorize navigation.

## Review Notes

This is a narrow follow-up to the finalized `event-monitor-absolute-path-file-preview` ticket. It reuses the existing action launcher and viewer boundaries. It does not authorize a server read of the URI's host path and does not change file support policy. Lexical invalidity is decided by the pure render-time policy; remote availability is decided only after explicit activation by the existing launcher.
