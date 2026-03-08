# Future-State Runtime Call Stack - markdown-renderer-hardening

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/markdown-renderer-hardening/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/markdown-renderer-hardening/implementation-plan.md`
- Source Design Version: `v1`
- Referenced Sections:
  - `Solution Sketch`
  - `Requirement And Design Traceability`
  - `Step-By-Step Plan`

## Transition Notes

- No temporary compatibility behavior is planned.
- Inline implicit math guessing is intentionally removed rather than preserved behind a fallback branch.

## Use Case Index

| use_case_id | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001 | N/A | Render explicit math through markdown + KaTeX | Yes/Yes/Yes |
| UC-002 | Requirement | R-002,R-003 | N/A | Preserve markdown links and path-like content | Yes/Yes/Yes |
| UC-003 | Requirement | R-003,R-005 | N/A | Leave implicit inline equations and prose untouched | Yes/N/A/Yes |
| UC-004 | Requirement | R-004 | N/A | Keep parser-safe renderer architecture | Yes/N/A/N/A |

## Use Case: UC-001 [Render explicit math through markdown + KaTeX]

### Goal

Render explicitly-delimited inline and block math without degrading standard markdown rendering.

### Preconditions

- Content contains supported explicit math delimiters.
- `useMarkdownSegments` is invoked with the raw message/file markdown source.

### Expected Outcome

- Explicit math renders through KaTeX into `.katex` or `.katex-display`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue:setup()
└── autobyteus-web/composables/useMarkdownSegments.ts:useMarkdownSegments(markdownSource)
    ├── autobyteus-web/utils/markdownMath.ts:normalizeMath(raw) [STATE] # only block-safe normalization
    ├── markdown-it:parse(sourceString) [STATE]
    ├── @mdit/plugin-katex:tokenize/render(math tokens) [STATE]
    ├── autobyteus-web/composables/useMarkdownSegments.ts:flushBatchToHtmlSegment() [STATE]
    ├── DOMPurify:sanitize(html) [STATE]
    └── autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue:render(v-html)
```

### Branching / Fallback Paths

```text
[FALLBACK] if content uses fenced math blocks
autobyteus-web/composables/useMarkdownSegments.ts:mdWithPrism.renderer.rules.fence(...)
└── katex.renderToString(content, { displayMode }) [STATE]
```

```text
[ERROR] if KaTeX cannot parse a formula
katex.renderToString(...)
└── throwOnError=false # renderer emits safe fallback markup without crashing the markdown pipeline
```

### State And Data Transformations

- Raw markdown string -> block-safe normalized string
- Normalized markdown -> markdown-it tokens
- Math tokens -> KaTeX HTML
- HTML -> sanitized HTML segment list

### Observability And Debug Points

- Regression tests assert `.katex` and `.katex-display`.
- No new runtime logging required.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present: `No`
- Tight coupling or cyclic dependency introduced: `No`
- Naming-to-responsibility drift detected: `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Preserve markdown links and path-like content]

### Goal

Render markdown links with underscore-heavy filenames and filesystem-style href values without inserting math delimiters into the source.

### Preconditions

- Content includes markdown link syntax and path-like text.
- Source does not include explicit math delimiters inside the link.

### Expected Outcome

- `markdown-it` sees the original markdown link syntax unchanged.
- Rendered anchor text and href remain intact.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/composables/useMarkdownSegments.ts:useMarkdownSegments(markdownSource)
├── autobyteus-web/utils/markdownMath.ts:normalizeMath(raw) [STATE] # leaves inline prose/links untouched
├── markdown-it:parse(sourceString) [STATE]
├── autobyteus-web/composables/useMarkdownSegments.ts:flushBatchToHtmlSegment() [STATE]
├── DOMPurify:sanitize(html) [STATE]
└── autobyteus-web/components/conversation/segments/renderer/MarkdownRenderer.vue:render(v-html)
```

### Branching / Fallback Paths

```text
[FALLBACK] if content includes code fences or inline code
autobyteus-web/utils/markdownMath.ts:normalizeMath(raw)
└── code/fence regions pass through unchanged before markdown-it parses them
```

```text
[ERROR] if malformed markdown link is authored
markdown-it:parse(sourceString)
└── renderer falls back to ordinary text/HTML output without preprocessor corruption
```

### State And Data Transformations

- Raw markdown -> same inline markdown structure
- Markdown tokens -> anchor HTML with original href

### Observability And Debug Points

- Regression tests assert anchor text, href, and absence of KaTeX nodes for link content.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present: `No`
- Tight coupling or cyclic dependency introduced: `No`
- Naming-to-responsibility drift detected: `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 [Leave implicit inline equations and prose untouched]

### Goal

Avoid auto-promoting undelimited prose fragments into math.

### Preconditions

- Content contains prose or symbolic expressions without explicit math delimiters.

### Expected Outcome

- Normalizer does not inject `$...$`.
- Markdown renders normal text semantics.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/utils/markdownMath.ts:normalizeMath(raw)
├── split raw into lines [STATE]
├── process fence / latex-block / standalone-block cases [STATE]
└── join lines without inline auto-wrap transforms [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if line contains malformed latex command without delimiters
autobyteus-web/utils/markdownMath.ts:normalizeMath(raw)
└── leave line unchanged unless it matches the retained standalone-safe rule
```

### State And Data Transformations

- Raw prose line -> identical prose line

### Observability And Debug Points

- Utility tests assert implicit inline expressions remain unchanged.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present: `No`
- Tight coupling or cyclic dependency introduced: `No`
- Naming-to-responsibility drift detected: `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 [Keep parser-safe renderer architecture]

### Goal

Maintain a renderer architecture where markdown structure is preserved before math rendering rules are applied.

### Preconditions

- Any markdown-capable frontend surface calls `useMarkdownSegments`.

### Expected Outcome

- Preprocessing remains narrow and does not compete with markdown tokenization for ownership of links/code/prose structure.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/composables/useMarkdownSegments.ts:useMarkdownSegments(markdownSource)
├── autobyteus-web/utils/markdownMath.ts:normalizeMath(raw) [STATE] # narrow normalization boundary only
├── markdown-it:parse(sourceString) [STATE] # owns structural tokenization
├── plugin stack (KaTeX / Prism / Mermaid fence routing) [STATE]
└── renderer outputs sanitized HTML segments [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] if future implicit math support is requested
design follow-up
└── implement as markdown-it token-level plugin rather than raw-string rewrite
```

### State And Data Transformations

- Raw source -> markdown tokens with preserved structure

### Observability And Debug Points

- Design, review, and docs artifacts explicitly document the parser-safe contract.

### Design Smells / Gaps

- Legacy/backward-compatibility branch present: `No`
- Tight coupling or cyclic dependency introduced: `No`
- Naming-to-responsibility drift detected: `No`

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
