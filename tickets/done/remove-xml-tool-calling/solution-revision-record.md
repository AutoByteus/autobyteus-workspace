# Solution Revision Record

The current requirements, investigation notes, design spec, and supplemental removal inventory are authoritative. This record captures the initial solution baseline and will append later rework rounds if required.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | `solution_designer` initial solution baseline / 2026-08-09 | N/A | `Initial Baseline` | API-only legacy tool-calling removal package ready for architecture review |

## Revision Entries

### SR-001 — Provider-Native Tool Calling As The Sole Supported Transport

- Triggering role, report path, and round: `solution_designer`, initial investigation and design round; no prior review report.
- Triggering finding IDs: N/A.
- Prior authoritative result: N/A.
- Current authoritative result: Remove the XML, JSON-text, and sentinel-text model tool-calling transports and their runtime selector. Retain provider-native API tool schemas, streamed native tool-call processing, provider-native tool-result history, and ordinary no-tool response handling as the supported design.
- Why this baseline or revision entry is recorded: The user confirmed that only API tool calling is used and approved broad removal rather than preserving compatibility paths. Investigation also found that the text transports are internally inconsistent and distribute mutable format policy across prompt construction, streaming, history, and continuation boundaries.
- Resolution: Define one provider-native execution spine; contract the handler factory to tools/no-tools selection; make the native handler own invocation construction directly; remove legacy parsers, adapters, manifests, text history renderers, public exports, server setting, and web control; and discard/reject only the retired `AUTOBYTEUS_STREAM_PARSER` config key.
- Approved behavior or requirement IDs affected: `BEH-001` through `BEH-006`; `REQ-001` through `REQ-011`; `AC-001` through `AC-013`.
- Canonical artifacts and sections updated: `requirements.md` (all sections, including approval and persisted-state outcome); `investigation-notes.md` (runtime paths, design evidence, transition evidence, and risks); `design-spec.md` (all mandatory design, ownership, removal, boundary, compatibility, and sequencing sections).
- Supplemental artifacts updated, added, or removed: Added `legacy-tool-calling-removal-inventory.md` as an evidence/context supplement with candidate source, structure, documentation, and coverage inventories. It requires no separate user approval.
- Downstream and architecture-review impact: Architecture review must validate the cross-package boundary contraction and exact config-key retirement. Implementation will span `autobyteus-ts`, `autobyteus-server-ts`, and `autobyteus-web`; durable coverage changes remain owned by the API/E2E stage after implementation and code review.
- Next recipient or routing: `architecture_reviewer`.
- Remaining gaps or risks: External consumers of removed subpath exports may break; providers or models without native tool APIs will no longer receive a text fallback; native file-argument streaming and provider-specific history rendering require regression coverage; documentation and release-note impact remain for delivery.
